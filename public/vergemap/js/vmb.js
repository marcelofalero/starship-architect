/**
 * Verge Map Binary (.vmb) encoder and decoder.
 * 
 * Spec:
 * - Header (12 bytes):
 *   - Magic Bytes: "VRGM" (4 bytes: 0x56, 0x52, 0x47, 0x4D)
 *   - Width: Uint16 (2 bytes, big-endian)
 *   - Height: Uint16 (2 bytes, big-endian)
 *   - Metadata Length: Uint32 (4 bytes, big-endian)
 * 
 * - Body:
 *   - Array of tiles of size Width * Height.
 *   - Each tile is encoded as a Uint32 (4 bytes, big-endian).
 *   - Field mapping within the 32 bits:
 *     - Subsurface: 1 bit (bit 28)
 *     - Biome: 4 bits (bits 24-27)
 *     - Elevation: 3 bits (bits 21-23)
 *     - Moisture: 3 bits (bits 18-20)
 *     - Faction: 6 bits (bits 12-17)
 *     - Specialization: 4 bits (bits 8-11)
 *     - Settlement: 3 bits (bits 5-7)
 *     - Feature: 5 bits (bits 0-4)
 * 
 * - Trailer:
 *   - UTF-8 JSON string of length equal to Metadata Length.
 */

/**
 * Pack tile fields into a single 16-bit integer.
 * @param {Object} tile
 * @param {number} tile.biome (4 bits: 0-15)
 * @param {number} tile.elevation (3 bits: 0-7)
 * @param {number} tile.moisture (3 bits: 0-7)
 * @param {number} tile.faction (2 bits: 0-3)
 * @param {number} tile.feature (4 bits: 0-15)
 * @returns {number} 16-bit packed tile value
 */
export function packTile({ biome = 0, elevation = 0, moisture = 0, faction = 0, specialization = 0, settlement = 0, feature = 0, subsurface = false }) {
    return ((biome & 0xF) << 24) |
           ((elevation & 0x7) << 21) |
           ((moisture & 0x7) << 18) |
           ((faction & 0x3F) << 12) |
           ((specialization & 0xF) << 8) |
           ((settlement & 0x7) << 5) |
           (feature & 0x1F) |
           (subsurface ? (1 << 28) : 0);
}

/**
 * Unpack a 32-bit integer into tile fields.
 * @param {number} val 32-bit packed tile value
 * @returns {Object} Unpacked tile fields
 */
export function unpackTile(val) {
    return {
        biome: (val >> 24) & 0xF,
        elevation: (val >> 21) & 0x7,
        moisture: (val >> 18) & 0x7,
        faction: (val >> 12) & 0x3F,
        specialization: (val >> 8) & 0xF,
        settlement: (val >> 5) & 0x7,
        feature: val & 0x1F,
        subsurface: (val & (1 << 28)) !== 0
    };
}

/**
 * Encode a grid into VMB binary format.
 * @param {number} width Grid width
 * @param {number} height Grid height
 * @param {Array<Object|number>} tiles Array of tile objects or raw packed tile numbers
 * @param {Object|Array|string} metadata Custom JSON-serializable metadata
 * @returns {Uint8Array} Binary payload
 */
export function encodeVMB(width, height, tiles, metadata = {}) {
    if (tiles.length !== width * height) {
        throw new Error(`Tiles array length (${tiles.length}) does not match dimensions ${width}x${height} (${width * height})`);
    }

    const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(metaStr);
    const metaLen = metaBytes.length;

    const bodyLen = width * height * 4;
    const totalLen = 12 + bodyLen + metaLen;

    const buffer = new ArrayBuffer(totalLen);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Magic Bytes: "VRGM"
    bytes[0] = 0x56; // V
    bytes[1] = 0x52; // R
    bytes[2] = 0x47; // G
    bytes[3] = 0x4D; // M

    // Width & Height
    view.setUint16(4, width, false);
    view.setUint16(6, height, false);

    // Metadata Length
    view.setUint32(8, metaLen, false);

    // Body: Uint32 Tiles
    for (let i = 0; i < tiles.length; i++) {
        let val = 0;
        const tile = tiles[i];
        if (typeof tile === 'number') {
            val = tile;
        } else if (tile && typeof tile === 'object') {
            val = packTile(tile);
        }
        view.setUint32(12 + i * 4, val, false);
    }

    // Trailer: Metadata
    bytes.set(metaBytes, 12 + bodyLen);

    return bytes;
}

/**
 * Decode a VMB binary payload.
 * @param {ArrayBuffer|Uint8Array} input VMB binary buffer
 * @returns {Object} Decoded map data: { width, height, tiles, metadata }
 */
export function decodeVMB(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 12) {
        throw new Error("Invalid VMB: Too short to contain header");
    }

    // Verify magic bytes "VRGM"
    if (bytes[0] !== 0x56 || bytes[1] !== 0x52 || bytes[2] !== 0x47 || bytes[3] !== 0x4D) {
        throw new Error("Invalid VMB: Incorrect magic bytes");
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint16(4, false);
    const height = view.getUint16(6, false);
    const metaLen = view.getUint32(8, false);

    const expectedLen = 12 + width * height * 4 + metaLen;
    if (bytes.length < expectedLen) {
        throw new Error(`Invalid VMB: File size (${bytes.length}) is smaller than expected (${expectedLen})`);
    }

    const tilesCount = width * height;
    const tiles = new Array(tilesCount);
    for (let i = 0; i < tilesCount; i++) {
        const val = view.getUint32(12 + i * 4, false);
        tiles[i] = unpackTile(val);
    }

    const metaStart = 12 + tilesCount * 4;
    const metaBytes = bytes.slice(metaStart, metaStart + metaLen);
    const decoder = new TextDecoder();
    const metaStr = decoder.decode(metaBytes);

    let metadata = {};
    if (metaStr) {
        try {
            metadata = JSON.parse(metaStr);
        } catch (e) {
            metadata = metaStr;
        }
    }

    return {
        width,
        height,
        tiles,
        metadata
    };
}
