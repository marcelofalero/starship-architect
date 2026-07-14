use crate::models::DGGSGrid;
use crate::format::vmb::pack_tile;

/// Encode a DGGS grid into the VRGD binary format.
///
/// Format:
/// ```text
/// Header (12 bytes):
///   Magic: 4 bytes (VRGD = 0x56 0x52 0x47 0x44)
///   CellCount: u32
///   MetaLen: u32
///
/// Per cell (fixed 92 bytes):
///   center: 3 × f32 (12 bytes)
///   tile: u32 (4 bytes)
///   sides: u8 (1 byte)
///   _pad: 3 × u8 (3 bytes)
///   polygon: 6 × 3 × f32 = 72 bytes (pentagons duplicate last vertex)
///
/// Metadata JSON trailer
/// ```
pub fn encode_dggs_vmb(grid: &DGGSGrid, metadata: &serde_json::Value) -> Vec<u8> {
    let meta_str = serde_json::to_string(metadata).unwrap_or_default();
    let meta_bytes = meta_str.as_bytes();
    let cell_count = grid.cells.len() as u32;
    let cell_block = 92; // fixed bytes per cell

    let total = 12 + (cell_count as usize * cell_block) + meta_bytes.len();
    let mut buf = vec![0u8; total];

    // Header
    buf[0] = 0x56; buf[1] = 0x52; buf[2] = 0x47; buf[3] = 0x44; // VRGD
    let cc = cell_count.to_be_bytes();
    buf[4..8].copy_from_slice(&cc);
    let ml = (meta_bytes.len() as u32).to_be_bytes();
    buf[8..12].copy_from_slice(&ml);

    // Cell data
    for (i, cell) in grid.cells.iter().enumerate() {
        let off = 12 + i * cell_block;

        // Center (f32 × 3)
        let cx = (cell.center.x as f32).to_be_bytes();
        let cy = (cell.center.y as f32).to_be_bytes();
        let cz = (cell.center.z as f32).to_be_bytes();
        buf[off..off+4].copy_from_slice(&cx);
        buf[off+4..off+8].copy_from_slice(&cy);
        buf[off+8..off+12].copy_from_slice(&cz);

        // Tile data (u32)
        let td = pack_tile(&cell.tile).to_be_bytes();
        buf[off+12..off+16].copy_from_slice(&td);

        // Sides count
        let sides = cell.vertices.len().min(6) as u8;
        buf[off+16] = sides;
        buf[off+17] = 0; // padding
        buf[off+18] = 0; // padding
        buf[off+19] = 0; // padding

        // Polygon vertices (6 slots × 3 × f32 = 72 bytes)
        for vi in 0..6 {
            let src_vi = if vi < cell.vertices.len() { vi } else { 0 }; // wrap for pentagons
            let v = &cell.vertices[src_vi];
            let voff = off + 20 + vi * 12;
            let vx = (v.x as f32).to_be_bytes();
            let vy = (v.y as f32).to_be_bytes();
            let vz = (v.z as f32).to_be_bytes();
            buf[voff..voff+4].copy_from_slice(&vx);
            buf[voff+4..voff+8].copy_from_slice(&vy);
            buf[voff+8..voff+12].copy_from_slice(&vz);
        }
    }

    // Metadata trailer
    let trailer_off = 12 + cell_count as usize * cell_block;
    buf[trailer_off..].copy_from_slice(meta_bytes);

    buf
}
