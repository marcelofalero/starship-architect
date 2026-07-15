use worker::*;
use std::collections::HashMap;
use serde_json::json;

use crate::cache::{get_map, set_map};
use crate::generator::sphere::generate_dggs;
use crate::generator::flat::generate_tiles;
use crate::format::vrgd::{encode_dggs_vmb, update_vrgd_metadata};
use crate::format::vmb::{encode_vmb, decode_vmb, DecodedVMB};

pub fn setup_router() -> Router<'static, ()> {
    Router::new()
        .get_async("/planet/:seed/dggs", |req, ctx| async move {
            let seed = ctx.param("seed").unwrap().to_string();
            let url = req.url()?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let planet_type = query.get("type").map(|s| s.as_str()).unwrap_or("terrestrial");
            let resolution: u8 = query.get("resolution").and_then(|s| s.parse().ok()).unwrap_or(4);
            let urbanization: f64 = query.get("urbanization").and_then(|s| s.parse().ok()).unwrap_or(79.0);
            let pollution: f64 = query.get("pollution").and_then(|s| s.parse().ok()).unwrap_or(100.0);
            let conservation: f64 = query.get("conservation").and_then(|s| s.parse().ok()).unwrap_or(0.0);

            if resolution > 6 {
                return Response::error("Resolution must be 0-6", 400);
            }

            let cache_key = format!("dggs:{}:{}:{}:{}:{}:{}", seed, planet_type, resolution, urbanization, pollution, conservation);
            println!("GET Cache Key: {}", cache_key);

            let mut headers = Headers::new();
            headers.set("Access-Control-Allow-Origin", "*")?;
            headers.set("Content-Type", "application/octet-stream")?;

            if let Some(binary) = get_map(&ctx.env, &cache_key).await? {
                return Ok(Response::from_bytes(binary)?.with_headers(headers));
            }

            let grid = generate_dggs(&seed, planet_type, resolution, urbanization, pollution, conservation);
            let metadata = json!({
                "seed": seed,
                "type": planet_type,
                "resolution": resolution,
                "urbanization": urbanization,
                "pollution": pollution,
                "conservation": conservation,
                "cellCount": grid.cells.len(),
                "neighbors": grid.neighbors,
                "generatedAt": Date::now().to_string()
            });

            let binary = encode_dggs_vmb(&grid, &metadata);
            set_map(&ctx.env, &cache_key, binary.clone()).await?;

            Ok(Response::from_bytes(binary)?.with_headers(headers))
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
        .post_async("/planet/:seed/dggs", |mut req, ctx| async move {
            let seed = ctx.param("seed").unwrap().to_string();
            let url = req.url()?;
            let query: HashMap<String, String> = url.query_pairs().into_owned().collect();

            let planet_type = query.get("type").map(|s| s.as_str()).unwrap_or("terrestrial");
            let resolution: u8 = query.get("resolution").and_then(|s| s.parse().ok()).unwrap_or(4);
            let urbanization: f64 = query.get("urbanization").and_then(|s| s.parse().ok()).unwrap_or(79.0);
            let pollution: f64 = query.get("pollution").and_then(|s| s.parse().ok()).unwrap_or(100.0);
            let conservation: f64 = query.get("conservation").and_then(|s| s.parse().ok()).unwrap_or(0.0);

            let cache_key = format!("dggs:{}:{}:{}:{}:{}:{}", seed, planet_type, resolution, urbanization, pollution, conservation);
            println!("POST Cache Key: {}", cache_key);
            
            let mut headers = Headers::new();
            headers.set("Access-Control-Allow-Origin", "*")?;
            headers.set("Content-Type", "application/octet-stream")?;

            let post_json: serde_json::Value = req.json().await.unwrap_or(json!({}));

            let existing_binary = if let Some(b) = get_map(&ctx.env, &cache_key).await? {
                b
            } else {
                let grid = generate_dggs(&seed, planet_type, resolution, urbanization, pollution, conservation);
                let metadata = json!({
                    "seed": seed,
                    "type": planet_type,
                    "resolution": resolution,
                    "urbanization": urbanization,
                    "pollution": pollution,
                    "conservation": conservation,
                    "cellCount": grid.cells.len(),
                    "neighbors": grid.neighbors,
                    "generatedAt": Date::now().to_string()
                });
                encode_dggs_vmb(&grid, &metadata)
            };

            let new_binary = match update_vrgd_metadata(&existing_binary, &post_json) {
                Ok(b) => b,
                Err(e) => return Response::error(e, 400),
            };

            set_map(&ctx.env, &cache_key, new_binary.clone()).await?;

            Ok(Response::from_bytes(new_binary)?.with_headers(headers))
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
}
