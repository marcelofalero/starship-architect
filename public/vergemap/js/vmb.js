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
 *   - Each tile is encoded as a Uint16 (2 bytes, big-endian).
 *   - Field mapping within the 16 bits (from MSB to LSB):
 *     - Biome: 4 bits (bits 12-15)
 *     - Elevation: 3 bits (bits 9-11)
 *     - Moisture: 3 bits (bits 6-8)
 *     - Faction: 2 bits (bits 4-5)
 *     - Feature: 4 bits (bits 0-3)
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
export function packTile({ biome = 0, elevation = 0, moisture = 0, faction = 0, feature = 0 }) {
    return ((biome & 0xF) << 12) |
           ((elevation & 0x7) << 9) |
           ((moisture & 0x7) << 6) |
           ((faction & 0x3) << 4) |
           (feature & 0xF);
}

/**
 * Unpack a 16-bit integer into tile fields.
 * @param {number} val 16-bit packed tile value
 * @returns {Object} Unpacked tile fields
 */
export function unpackTile(val) {
    return {
        biome: (val >> 12) & 0xF,
        elevation: (val >> 9) & 0x7,
        moisture: (val >> 6) & 0x7,
        faction: (val >> 4) & 0x3,
        feature: val & 0xF
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

    const bodyLen = width * height * 2;
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

    // Body: Uint16 Tiles
    for (let i = 0; i < tiles.length; i++) {
        let val = 0;
        const tile = tiles[i];
        if (typeof tile === 'number') {
            val = tile;
        } else if (tile && typeof tile === 'object') {
            val = packTile(tile);
        }
        view.setUint16(12 + i * 2, val, false);
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

    const expectedLen = 12 + width * height * 2 + metaLen;
    if (bytes.length < expectedLen) {
        throw new Error(`Invalid VMB: File size (${bytes.length}) is smaller than expected (${expectedLen})`);
    }

    const tilesCount = width * height;
    const tiles = new Array(tilesCount);
    for (let i = 0; i < tilesCount; i++) {
        const val = view.getUint16(12 + i * 2, false);
        tiles[i] = unpackTile(val);
    }

    const metaStart = 12 + tilesCount * 2;
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
