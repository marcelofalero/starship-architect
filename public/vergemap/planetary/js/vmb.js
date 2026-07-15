/**
 * Verge Map Binary (.vmb) encoder and decoder.
 * Supports two formats:
 *
 * === VRGM (Flat Grid) ===
 * Header (12 bytes):
 *   Magic: "VRGM" (4 bytes)
 *   Width: Uint16, Height: Uint16, MetaLen: Uint32
 * Body: width*height tiles, each Uint16
 * Trailer: JSON metadata
 *
 * === VRGD (DGGS Globe) ===
 * Header (12 bytes):
 *   Magic: "VRGD" (4 bytes)
 *   CellCount: Uint32, MetaLen: Uint32
 * Per cell (92 bytes fixed):
 *   center: 3×f32 (12 bytes)
 *   tile: Uint32 (4 bytes)
 *   sides: Uint8 (1 byte), pad: 3 bytes
 *   polygon: 6 × 3×f32 = 72 bytes
 * Trailer: JSON metadata
 */

export function packTile({ biome = 0, elevation = 0, moisture = 0, faction = 0, specialization = 'none', settlement = 0, feature = 0, subsurface = false }) {
    // We map specialization string to a number (0-15) if needed, but usually JS doesn't need to pack it.
    // Assuming simple packing for now if JS needs to save it (though mostly Rust generates it).
    let specId = 0;
    const specMap = { 'none': 0, 'agricultural': 1, 'mining': 2, 'research': 3, 'industrial': 4, 'tourism': 5 };
    if (specMap[specialization] !== undefined) specId = specMap[specialization];

    return ((biome & 0xF) << 24) |
           ((elevation & 0x7) << 21) |
           ((moisture & 0x7) << 18) |
           ((faction & 0x3F) << 12) |
           ((specId & 0xF) << 8) |
           ((settlement & 0x7) << 5) |
           (feature & 0x1F) |
           (subsurface ? (1 << 28) : 0);
}

export function unpackTile(val) {
    const specMap = { 0: 'none', 1: 'agricultural', 2: 'mining', 3: 'research', 4: 'industrial', 5: 'tourism' };
    const specId = (val >> 8) & 0xF;
    
    return {
        biome: (val >>> 24) & 0xF,
        elevation: (val >>> 21) & 0x7,
        moisture: (val >>> 18) & 0x7,
        faction: (val >>> 12) & 0x3F,
        specialization: specMap[specId] || 'none',
        settlement: (val >>> 5) & 0x7,
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

    // Body: Uint16 Tiles
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

    const bodyLen = width * height * 2;
    const expectedLen = 12 + bodyLen + metaLen;
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

    const CELL_BLOCK = 92;
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

        // Tile data (u32)
        let val = 0;
        if (typeof cell.tile === 'number') {
            val = cell.tile;
        } else if (cell.tile && typeof cell.tile === 'object') {
            val = packTile(cell.tile);
        }
        view.setUint32(off + 12, val, false);

        // Sides count
        const sides = cell.vertices ? Math.min(cell.vertices.length, 6) : 0;
        bytes[off + 16] = sides;
        bytes[off + 17] = 0; // padding
        bytes[off + 18] = 0; // padding
        bytes[off + 19] = 0; // padding

        // Polygon vertices (6 slots x 3 x f32 = 72 bytes)
        for (let vi = 0; vi < 6; vi++) {
            const srcVi = vi < sides ? vi : 0;
            const v = cell.vertices ? cell.vertices[srcVi] : {x: 0, y: 0, z: 0};
            const voff = off + 20 + vi * 12;
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

    const CELL_BLOCK = 92;
    const cells = [];

    for (let i = 0; i < cellCount; i++) {
        const off = 12 + i * CELL_BLOCK;

        // Center position
        const cx = view.getFloat32(off, false);
        const cy = view.getFloat32(off + 4, false);
        const cz = view.getFloat32(off + 8, false);

        // Tile data
        const tileVal = view.getUint32(off + 12, false);
        const tile = unpackTile(tileVal);

        // Sides and polygon vertices
        const sides = bytes[off + 16];
        const vertices = [];
        for (let vi = 0; vi < sides; vi++) {
            const voff = off + 20 + vi * 12;
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
