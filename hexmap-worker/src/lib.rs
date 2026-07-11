mod dggs;

use worker::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Mutex;

static MEMORY_CACHE: Mutex<Option<HashMap<String, Vec<u8>>>> = Mutex::new(None);

fn set_in_memory(key: &str, value: Vec<u8>) {
    let mut cache_opt = MEMORY_CACHE.lock().unwrap();
    if cache_opt.is_none() {
        *cache_opt = Some(HashMap::new());
    }
    if let Some(ref mut cache) = *cache_opt {
        cache.insert(key.to_string(), value);
    }
}

fn get_in_memory(key: &str) -> Option<Vec<u8>> {
    let cache_opt = MEMORY_CACHE.lock().unwrap();
    if let Some(ref cache) = *cache_opt {
        cache.get(key).cloned()
    } else {
        None
    }
}

async fn get_map(env: &Env, key: &str) -> Result<Option<Vec<u8>>> {
    if let Ok(kv) = env.kv("MAP_CACHE") {
        if let Some(val) = kv.get(key).bytes().await? {
            return Ok(Some(val));
        }
    }
    Ok(get_in_memory(key))
}

async fn set_map(env: &Env, key: &str, value: Vec<u8>) -> Result<()> {
    if let Ok(kv) = env.kv("MAP_CACHE") {
        kv.put(key, value.clone())?.execute().await?;
    }
    set_in_memory(key, value);
    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct Tile {
    pub biome: u8,
    pub elevation: u8,
    pub moisture: u8,
    pub faction: u8,
    pub feature: u8,
}

pub fn pack_tile(tile: &Tile) -> u16 {
    ((tile.biome as u16 & 0xF) << 12) |
    ((tile.elevation as u16 & 0x7) << 9) |
    ((tile.moisture as u16 & 0x7) << 6) |
    ((tile.faction as u16 & 0x3) << 4) |
    (tile.feature as u16 & 0xF)
}

pub fn unpack_tile(val: u16) -> Tile {
    Tile {
        biome: ((val >> 12) & 0xF) as u8,
        elevation: ((val >> 9) & 0x7) as u8,
        moisture: ((val >> 6) & 0x7) as u8,
        faction: ((val >> 4) & 0x3) as u8,
        feature: (val & 0xF) as u8,
    }
}

pub struct Rng {
    state: u32,
}

impl Rng {
    pub fn new(seed_str: &str) -> Self {
        let mut hash: i32 = 0;
        for c in seed_str.chars() {
            hash = (31i32.wrapping_mul(hash)).wrapping_add(c as i32);
        }
        Self {
            state: hash as u32,
        }
    }

    pub fn next(&mut self) -> f64 {
        self.state = self.state.wrapping_add(0x6D2B79F5);
        let mut z = self.state;
        z = (z ^ (z >> 15)).wrapping_mul(z | 1);
        z ^= z.wrapping_add((z ^ (z >> 7)).wrapping_mul(z | 61));
        ((z ^ (z >> 14)) as f64) / 4294967296.0
    }
}

pub fn generate_tiles(seed: &str, planet_type: &str, radius: i32) -> Vec<Tile> {
    let w = 2 * radius + 1;
    let h = 2 * radius + 1;
    let mut tiles = Vec::with_capacity((w * h) as usize);

    for y in 0..h {
        for x in 0..w {
            let q = x - radius;
            let r = y - radius;
            let is_inside = q.abs() <= radius && r.abs() <= radius && (-q - r).abs() <= radius;

            if !is_inside {
                tiles.push(Tile {
                    biome: 0,
                    elevation: 0,
                    moisture: 0,
                    faction: 0,
                    feature: 0,
                });
                continue;
            }

            let mut tile_rng = Rng::new(&format!("{}-{}-{}-{}", seed, planet_type, x, y));
            let n1 = tile_rng.next();
            let n2 = tile_rng.next();
            let n3 = tile_rng.next();

            let mut biome = 0;
            let mut elevation = 0;
            let mut moisture = 0;
            let mut faction = 0;
            let mut feature = 0;

            match planet_type {
                "desert" => {
                    elevation = ((n1 * 4.0) as u8) + 2;
                    moisture = (n2 * 2.0) as u8;
                    if n3 < 0.05 {
                        biome = 13;
                    } else if n3 < 0.2 {
                        biome = 11;
                        elevation = 6;
                    } else {
                        biome = 2;
                    }
                }
                "ocean" => {
                    elevation = (n1 * 3.0) as u8;
                    moisture = ((n2 * 2.0) as u8) + 6;
                    if elevation == 2 && n3 < 0.1 {
                        biome = 3;
                        elevation = 3;
                    } else if elevation == 2 {
                        biome = 1;
                    } else {
                        biome = 0;
                    }
                }
                "ice" | "frozen" => {
                    elevation = ((n1 * 5.0) as u8) + 1;
                    moisture = ((n2 * 4.0) as u8) + 2;
                    biome = if n3 < 0.3 { 8 } else { 7 };
                }
                "volcanic" => {
                    elevation = ((n1 * 4.0) as u8) + 4;
                    moisture = (n2 * 2.0) as u8;
                    biome = if n3 < 0.2 { 9 } else { 10 };
                }
                "barren" => {
                    elevation = ((n1 * 5.0) as u8) + 2;
                    moisture = 0;
                    biome = 10;
                }
                _ => { // terrestrial
                    elevation = ((n1 * 5.0) as u8) + 2;
                    moisture = ((n2 * 5.0) as u8) + 2;
                    if elevation <= 2 {
                        biome = 0;
                    } else if elevation == 3 {
                        biome = 3;
                    } else if elevation <= 5 {
                        biome = 4;
                    } else {
                        biome = 11;
                    }
                }
            }

            if tile_rng.next() < 0.15 {
                faction = ((tile_rng.next() * 3.0) as u8) + 1;
            }
            if tile_rng.next() < 0.08 {
                feature = ((tile_rng.next() * 9.0) as u8) + 1;
            }

            tiles.push(Tile {
                biome,
                elevation,
                moisture,
                faction,
                feature,
            });
        }
    }

    tiles
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

    let body_len = tiles.len() * 2;
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
        buffer[12 + i * 2] = val_bytes[0];
        buffer[12 + i * 2 + 1] = val_bytes[1];
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
    let body_len = tiles_count * 2;
    let expected_len = 12 + body_len + meta_len as usize;

    if data.len() < expected_len {
        return Err(Error::from(format!(
            "Invalid VMB: File size ({}) is smaller than expected ({})",
            data.len(), expected_len
        )));
    }

    let mut tiles = Vec::with_capacity(tiles_count);
    for i in 0..tiles_count {
        let val = u16::from_be_bytes([data[12 + i * 2], data[12 + i * 2 + 1]]);
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

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    if req.method() == Method::Options {
        let mut headers = Headers::new();
        headers.set("Access-Control-Allow-Origin", "*")?;
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")?;
        headers.set("Access-Control-Allow-Headers", "Content-Type")?;
        headers.set("Access-Control-Max-Age", "86400")?;
        return Ok(Response::empty()?.with_headers(headers));
    }

    let router = Router::new();
    router
        .get_async("/planet/:seed/dggs", |req, ctx| async move {
            let seed = ctx.param("seed").unwrap().to_string();
            let url = req.url()?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let planet_type = query.get("type").map(|s| s.as_str()).unwrap_or("terrestrial");
            let resolution: u8 = query.get("resolution").and_then(|s| s.parse().ok()).unwrap_or(4);
            let urbanization: f64 = query.get("urbanization").and_then(|s| s.parse().ok()).unwrap_or(15.0);

            if resolution > 6 {
                return Response::error("Resolution must be 0-6", 400);
            }

            let cache_key = format!("dggs:v17:{}:{}:{}:{}", seed, planet_type, resolution, urbanization);
            let mut headers = Headers::new();
            headers.set("Access-Control-Allow-Origin", "*")?;
            headers.set("Content-Type", "application/octet-stream")?;

            if let Some(binary) = get_map(&ctx.env, &cache_key).await? {
                return Ok(Response::from_bytes(binary)?.with_headers(headers));
            }

            let grid = dggs::generate_dggs(&seed, planet_type, resolution, urbanization);
            let metadata = json!({
                "seed": seed,
                "type": planet_type,
                "resolution": resolution,
                "urbanization": urbanization,
                "cellCount": grid.cells.len(),
                "generatedAt": Date::now().to_string(),
                "neighbors": grid.neighbors,
                "addresses": grid.addresses,
                "rivers": grid.rivers
            });

            let binary = dggs::encode_dggs_vmb(&grid, &metadata);
            set_map(&ctx.env, &cache_key, binary.clone()).await?;

            Ok(Response::from_bytes(binary)?.with_headers(headers))
        })
        .post_async("/planet/:seed/dggs", |mut req, ctx| async move {
            let seed = ctx.param("seed").unwrap().to_string();
            let url = req.url()?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let planet_type = query.get("type").map(|s| s.as_str()).unwrap_or("terrestrial");
            let resolution: u8 = query.get("resolution").and_then(|s| s.parse().ok()).unwrap_or(4);
            let urbanization: f64 = query.get("urbanization").and_then(|s| s.parse().ok()).unwrap_or(15.0);

            if resolution > 6 {
                return Response::error("Resolution must be 0-6", 400);
            }

            let cache_key = format!("dggs:v17:{}:{}:{}:{}", seed, planet_type, resolution, urbanization);
            let mut headers = Headers::new();
            headers.set("Access-Control-Allow-Origin", "*")?;
            headers.set("Content-Type", "application/octet-stream")?;

            let post_json: serde_json::Value = req.json().await.unwrap_or(json!({}));

            let binary = if let Some(existing_binary) = get_map(&ctx.env, &cache_key).await? {
                existing_binary
            } else {
                let grid = dggs::generate_dggs(&seed, planet_type, resolution, urbanization);
                let metadata = json!({
                    "seed": seed,
                    "type": planet_type,
                    "resolution": resolution,
                    "cellCount": grid.cells.len(),
                    "generatedAt": Date::now().to_string(),
                    "neighbors": grid.neighbors,
                    "addresses": grid.addresses,
                    "rivers": grid.rivers
                });
                dggs::encode_dggs_vmb(&grid, &metadata)
            };

            let updated_binary = match update_dggs_metadata(binary, &post_json) {
                Ok(b) => b,
                Err(e) => return Response::error(format!("Failed to update metadata: {}", e), 400),
            };

            set_map(&ctx.env, &cache_key, updated_binary.clone()).await?;

            Ok(Response::from_bytes(updated_binary)?.with_headers(headers))
        })
        .get_async("/planet/:seed/map", |req, ctx| async move {
            let seed = ctx.param("seed").unwrap().to_string();
            let url = req.url()?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let planet_type = query.get("type").map(|s| s.as_str()).unwrap_or("terrestrial");
            let radius = query.get("radius").and_then(|s| s.parse::<i32>().ok()).unwrap_or(10);

            if radius <= 0 {
                return Response::error("Invalid radius", 400);
            }

            let cache_key = format!("map:{}", seed);
            let mut headers = Headers::new();
            headers.set("Access-Control-Allow-Origin", "*")?;
            headers.set("Content-Type", "application/octet-stream")?;
            headers.set("Content-Disposition", &format!("attachment; filename=\"{}_map.vmb\"", seed))?;

            if let Some(binary) = get_map(&ctx.env, &cache_key).await? {
                if let Ok(decoded) = decode_vmb(&binary) {
                    let cached_type = decoded.metadata.get("type").and_then(|v| v.as_str()).unwrap_or("terrestrial");
                    let cached_radius = decoded.metadata.get("radius").and_then(|v| v.as_i64()).unwrap_or(10) as i32;
                    let type_matches = !query.contains_key("type") || cached_type == planet_type;
                    let radius_matches = !query.contains_key("radius") || cached_radius == radius;
                    if type_matches && radius_matches {
                        return Ok(Response::from_bytes(binary)?.with_headers(headers));
                    }
                }
            }

            let tiles = generate_tiles(&seed, planet_type, radius);
            let w = (2 * radius + 1) as u16;
            let h = (2 * radius + 1) as u16;
            let metadata = json!({
                "seed": seed,
                "type": planet_type,
                "radius": radius,
                "generatedAt": Date::now().to_string()
            });

            let binary = encode_vmb(w, h, &tiles, &metadata)?;
            set_map(&ctx.env, &cache_key, binary.clone()).await?;

            Ok(Response::from_bytes(binary)?.with_headers(headers))
        })
        .post_async("/planet/:seed/map", |mut req, ctx| async move {
            let seed = ctx.param("seed").unwrap().to_string();
            let url = req.url()?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let cache_key = format!("map:{}", seed);
            let content_type = req.headers().get("content-type")?.unwrap_or_default();

            let mut headers = Headers::new();
            headers.set("Access-Control-Allow-Origin", "*")?;
            headers.set("Content-Type", "application/octet-stream")?;

            let new_binary = if content_type.contains("application/json") {
                let post_json: serde_json::Value = req.json().await.unwrap_or(json!({}));

                let decoded = if let Some(existing_binary) = get_map(&ctx.env, &cache_key).await? {
                    decode_vmb(&existing_binary)?
                } else {
                    let planet_type = query.get("type").map(|s| s.as_str()).unwrap_or("terrestrial");
                    let radius = query.get("radius").and_then(|s| s.parse::<i32>().ok()).unwrap_or(10);
                    let tiles = generate_tiles(&seed, planet_type, radius);
                    let w = (2 * radius + 1) as u16;
                    let h = (2 * radius + 1) as u16;
                    DecodedVMB {
                        width: w,
                        height: h,
                        tiles,
                        metadata: json!({
                            "seed": seed,
                            "type": planet_type,
                            "radius": radius,
                            "generatedAt": Date::now().to_string()
                        })
                    }
                };

                let mut merged_metadata = match decoded.metadata {
                    serde_json::Value::Object(map) => map,
                    _ => serde_json::Map::new(),
                };

                if let serde_json::Value::Object(edit_map) = post_json {
                    for (k, v) in edit_map {
                        merged_metadata.insert(k, v);
                    }
                }
                merged_metadata.insert("updatedAt".to_string(), json!(Date::now().to_string()));

                encode_vmb(decoded.width, decoded.height, &decoded.tiles, &serde_json::Value::Object(merged_metadata))?
            } else {
                let bytes = req.bytes().await?;
                if let Err(e) = decode_vmb(&bytes) {
                    return Response::error(format!("Invalid VMB format: {}", e), 400);
                }
                bytes
            };

            set_map(&ctx.env, &cache_key, new_binary.clone()).await?;

            Ok(Response::from_bytes(new_binary)?.with_headers(headers))
        })
        .run(req, env)
        .await
        .map(|mut res| {
            let _ = res.headers_mut().set("Access-Control-Allow-Origin", "*");
            res
        })
}

fn update_dggs_metadata(mut data: Vec<u8>, new_meta: &serde_json::Value) -> Result<Vec<u8>> {
    if data.len() < 12 {
        return Err(worker::Error::from("Invalid DGGS: too short"));
    }
    let cell_count = u32::from_be_bytes([data[4], data[5], data[6], data[7]]) as usize;
    let meta_len = u32::from_be_bytes([data[8], data[9], data[10], data[11]]) as usize;
    let body_len = cell_count * 88;
    let expected_len = 12 + body_len + meta_len;
    if data.len() < expected_len {
        return Err(worker::Error::from("Invalid DGGS: length mismatch"));
    }

    let meta_bytes = &data[12 + body_len..12 + body_len + meta_len];
    let meta_str = std::str::from_utf8(meta_bytes).map_err(|e| worker::Error::from(e.to_string()))?;
    let mut metadata: serde_json::Value = serde_json::from_str(meta_str).unwrap_or(json!({}));

    // Merge new_meta
    if let serde_json::Value::Object(new_obj) = new_meta {
        if let serde_json::Value::Object(ref mut old_obj) = metadata {
            for (k, v) in new_obj {
                old_obj.insert(k.clone(), v.clone());
            }
        }
    }

    // Serialize new metadata
    let new_meta_str = serde_json::to_string(&metadata).map_err(|e| worker::Error::from(e.to_string()))?;
    let new_meta_bytes = new_meta_str.as_bytes();
    let new_meta_len = new_meta_bytes.len() as u32;

    // Update MetaLen in header
    let len_bytes = new_meta_len.to_be_bytes();
    data[8..12].copy_from_slice(&len_bytes);

    // Truncate old metadata and append new
    data.truncate(12 + body_len);
    data.extend_from_slice(new_meta_bytes);

    Ok(data)
}

