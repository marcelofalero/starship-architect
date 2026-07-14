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
 * Encode a map into VMB binary format.
 * Dynamically detects format:
 * - If called with (cells, metadata) -> VRGD (DGGS Globe)
 * - If called with (width, height, tiles, metadata) -> VRGM (Flat Grid)
 */
export function encodeVMB(...args) {
    if (args.length === 2 || (args.length === 1 && Array.isArray(args[0]))) {
        const [cells, metadata = {}] = args;
        return encodeDGGS(cells, metadata);
    } else {
        const [width, height, tiles, metadata = {}] = args;
        return encodeFlatGrid(width, height, tiles, metadata);
    }
}

/**
 * Decode a VMB binary payload (auto-detects VRGM vs VRGD format).
 */
export function decodeVMB(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 12) {
        throw new Error("Invalid VMB: Too short to contain header");
    }

    // Check magic bytes
    if (bytes[0] === 0x56 && bytes[1] === 0x52 && bytes[2] === 0x47) {
        if (bytes[3] === 0x44) {
            return decodeDGGS(bytes);
        } else if (bytes[3] === 0x4D) {
            return decodeFlatGrid(bytes);
        }
    }
    throw new Error("Invalid VMB: Incorrect magic bytes");
}

/**
 * Encode flat grid format (VRGM).
 */
function encodeFlatGrid(width, height, tiles, metadata = {}) {
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
    bytes[0] = 0x56; bytes[1] = 0x52; bytes[2] = 0x47; bytes[3] = 0x4D;

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
 * Decode flat grid format (VRGM).
 */
function decodeFlatGrid(bytes) {
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
    const metadata = parseMetadata(metaBytes);

    return { format: 'flat', width, height, tiles, metadata };
}

/**
 * Encode DGGS grid into VRGD binary format.
 */
function encodeDGGS(cells, metadata = {}) {
    const cellCount = cells.length;
    const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    const encoder = new TextEncoder();
    const metaBytes = encoder.encode(metaStr);
    const metaLen = metaBytes.length;

    const CELL_BLOCK = 88;
    const bodyLen = cellCount * CELL_BLOCK;
    const totalLen = 12 + bodyLen + metaLen;

    const buffer = new ArrayBuffer(totalLen);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Magic Bytes: "VRGD"
    bytes[0] = 0x56; bytes[1] = 0x52; bytes[2] = 0x47; bytes[3] = 0x44;

    // CellCount & Metadata Length
    view.setUint32(4, cellCount, false);
    view.setUint32(8, metaLen, false);

    // Body: Cells
    for (let i = 0; i < cellCount; i++) {
        const cell = cells[i];
        const off = 12 + i * CELL_BLOCK;

        // Center position (3 x f32)
        view.setFloat32(off, cell.center ? cell.center.x : 0, false);
        view.setFloat32(off + 4, cell.center ? cell.center.y : 0, false);
        view.setFloat32(off + 8, cell.center ? cell.center.z : 0, false);

        // Tile data (u16)
        let val = 0;
        if (typeof cell.tile === 'number') {
            val = cell.tile;
        } else if (cell.tile && typeof cell.tile === 'object') {
            val = packTile(cell.tile);
        }
        view.setUint16(off + 12, val, false);

        // Sides count
        const sides = cell.vertices ? Math.min(cell.vertices.length, 6) : 0;
        bytes[off + 14] = sides;
        bytes[off + 15] = 0; // padding

        // Polygon vertices (6 slots x 3 x f32 = 72 bytes)
        for (let vi = 0; vi < 6; vi++) {
            const srcVi = vi < sides ? vi : 0;
            const v = cell.vertices ? cell.vertices[srcVi] : {x: 0, y: 0, z: 0};
            const voff = off + 16 + vi * 12;
            view.setFloat32(voff, v.x || 0, false);
            view.setFloat32(voff + 4, v.y || 0, false);
            view.setFloat32(voff + 8, v.z || 0, false);
        }
    }

    // Trailer: Metadata
    bytes.set(metaBytes, 12 + bodyLen);

    return bytes;
}

/**
 * Decode DGGS globe format (VRGD).
 */
function decodeDGGS(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const cellCount = view.getUint32(4, false);
    const metaLen = view.getUint32(8, false);

    const CELL_BLOCK = 88;
    const expectedLen = 12 + cellCount * CELL_BLOCK + metaLen;
    if (bytes.length < expectedLen) {
        throw new Error(`Invalid VMB: File size (${bytes.length}) is smaller than expected (${expectedLen})`);
    }

    const cells = [];

    for (let i = 0; i < cellCount; i++) {
        const off = 12 + i * CELL_BLOCK;

        // Center position
        const cx = view.getFloat32(off, false);
        const cy = view.getFloat32(off + 4, false);
        const cz = view.getFloat32(off + 8, false);

        // Tile data
        const tileVal = view.getUint16(off + 12, false);
        const tile = unpackTile(tileVal);

        // Sides and polygon vertices
        const sides = bytes[off + 14];
        const vertices = [];
        for (let vi = 0; vi < sides; vi++) {
            const voff = off + 16 + vi * 12;
            vertices.push({
                x: view.getFloat32(voff, false),
                y: view.getFloat32(voff + 4, false),
                z: view.getFloat32(voff + 8, false)
            });
        }

        cells.push({ center: { x: cx, y: cy, z: cz }, tile, sides, vertices });
    }

    const metaStart = 12 + cellCount * CELL_BLOCK;
    const metaBytes = bytes.slice(metaStart, metaStart + metaLen);
    const metadata = parseMetadata(metaBytes);

    return { format: 'dggs', cellCount, cells, metadata };
}

function parseMetadata(metaBytes) {
    const decoder = new TextDecoder();
    const metaStr = decoder.decode(metaBytes);
    try { return JSON.parse(metaStr); } catch (e) { return metaStr || {}; }
}
