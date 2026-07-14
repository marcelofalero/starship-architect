mod math;
pub mod models;
pub mod format;
pub mod generator;
pub mod cache;
pub mod routes;

use worker::*;

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

    let router = routes::setup_router();
    
    router
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

