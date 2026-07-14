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

export function packTile({ biome = 0, elevation = 0, moisture = 0, faction = 0, feature = 0, subsurface = false }) {
    return ((biome & 0xF) << 12) |
           ((elevation & 0x7) << 9) |
           ((moisture & 0x7) << 6) |
           ((faction & 0x3) << 4) |
           (feature & 0xF) |
           (subsurface ? (1 << 16) : 0);
}

export function unpackTile(val) {
    return {
        biome: (val >> 12) & 0xF,
        elevation: (val >> 9) & 0x7,
        moisture: (val >> 6) & 0x7,
        faction: (val >> 4) & 0x3,
        feature: val & 0xF,
        subsurface: (val & (1 << 16)) !== 0
    };
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
    throw new Error("Invalid VMB: Unrecognized magic bytes");
}

/**
 * Decode flat grid format (VRGM).
 */
function decodeFlatGrid(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint16(4, false);
    const height = view.getUint16(6, false);
    const metaLen = view.getUint32(8, false);

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
