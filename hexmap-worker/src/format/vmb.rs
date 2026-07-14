use crate::models::Tile;
use serde_json::json;
use worker::{Error, Result};

pub fn pack_tile(tile: &Tile) -> u32 {
    ((tile.biome as u32 & 0xF) << 24) |
    ((tile.elevation as u32 & 0x7) << 21) |
    ((tile.moisture as u32 & 0x7) << 18) |
    ((tile.faction as u32 & 0x3F) << 12) |
    ((tile.specialization as u32 & 0xF) << 8) |
    ((tile.settlement as u32 & 0x7) << 5) |
    (tile.feature as u32 & 0x1F) |
    (if tile.subsurface { 1 << 28 } else { 0 })
}

pub fn unpack_tile(val: u32) -> Tile {
    Tile {
        biome: ((val >> 24) & 0xF) as u8,
        elevation: ((val >> 21) & 0x7) as u8,
        moisture: ((val >> 18) & 0x7) as u8,
        faction: ((val >> 12) & 0x3F) as u8,
        specialization: ((val >> 8) & 0xF) as u8,
        settlement: ((val >> 5) & 0x7) as u8,
        feature: (val & 0x1F) as u8,
        subsurface: (val & (1 << 28)) != 0,
    }
}

pub fn encode_vmb(width: u16, height: u16, tiles: &[Tile], metadata: &serde_json::Value) -> Result<Vec<u8>> {
    if tiles.len() != (width as usize * height as usize) {
        return Err(Error::from(format!(
            "Tiles count ({}) doesn't match dimensions {}x{}",
            tiles.len(), width, height
        )));
    }

    let meta_str = serde_json::to_string(metadata).map_err(|e| Error::from(e.to_string()))?;
    let meta_bytes = meta_str.as_bytes();
    let meta_len = meta_bytes.len() as u32;

    let body_len = tiles.len() * 4;
    let total_len = 12 + body_len + meta_bytes.len();
    let mut buffer = vec![0u8; total_len];

    buffer[0] = 0x56;
    buffer[1] = 0x52;
    buffer[2] = 0x47;
    buffer[3] = 0x4D;

    let w_bytes = width.to_be_bytes();
    buffer[4] = w_bytes[0];
    buffer[5] = w_bytes[1];

    let h_bytes = height.to_be_bytes();
    buffer[6] = h_bytes[0];
    buffer[7] = h_bytes[1];

    let len_bytes = meta_len.to_be_bytes();
    buffer[8] = len_bytes[0];
    buffer[9] = len_bytes[1];
    buffer[10] = len_bytes[2];
    buffer[11] = len_bytes[3];

    for (i, tile) in tiles.iter().enumerate() {
        let val = pack_tile(tile);
        let val_bytes = val.to_be_bytes();
        buffer[12 + i * 4] = val_bytes[0];
        buffer[12 + i * 4 + 1] = val_bytes[1];
        buffer[12 + i * 4 + 2] = val_bytes[2];
        buffer[12 + i * 4 + 3] = val_bytes[3];
    }

    buffer[12 + body_len..].copy_from_slice(meta_bytes);

    Ok(buffer)
}

pub struct DecodedVMB {
    pub width: u16,
    pub height: u16,
    pub tiles: Vec<Tile>,
    pub metadata: serde_json::Value,
}

pub fn decode_vmb(data: &[u8]) -> Result<DecodedVMB> {
    if data.len() < 12 {
        return Err(Error::from("Invalid VMB: Too short to contain header"));
    }

    if data[0] != 0x56 || data[1] != 0x52 || data[2] != 0x47 || data[3] != 0x4D {
        return Err(Error::from("Invalid VMB: Incorrect magic bytes"));
    }

    let width = u16::from_be_bytes([data[4], data[5]]);
    let height = u16::from_be_bytes([data[6], data[7]]);
    let meta_len = u32::from_be_bytes([data[8], data[9], data[10], data[11]]);

    let tiles_count = width as usize * height as usize;
    let body_len = tiles_count * 4;
    let expected_len = 12 + body_len + meta_len as usize;

    if data.len() < expected_len {
        return Err(Error::from(format!(
            "Invalid VMB: File size ({}) is smaller than expected ({})",
            data.len(), expected_len
        )));
    }

    let mut tiles = Vec::with_capacity(tiles_count);
    for i in 0..tiles_count {
        let val = u32::from_be_bytes([
            data[12 + i * 4],
            data[12 + i * 4 + 1],
            data[12 + i * 4 + 2],
            data[12 + i * 4 + 3]
        ]);
        tiles.push(unpack_tile(val));
    }

    let meta_start = 12 + body_len;
    let meta_bytes = &data[meta_start..meta_start + meta_len as usize];
    let meta_str = std::str::from_utf8(meta_bytes).map_err(|e| Error::from(e.to_string()))?;
    
    let metadata: serde_json::Value = serde_json::from_str(meta_str).unwrap_or_else(|_| {
        json!(meta_str)
    });

    Ok(DecodedVMB {
        width,
        height,
        tiles,
        metadata,
    })
}
