use worker::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use hmac::{Hmac, Mac, KeyInit};
use sha2::Sha256;
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};

type HmacSha256 = Hmac<Sha256>;

#[derive(Serialize, Deserialize)]
struct JwtHeader {
    alg: String,
    typ: String,
}

#[derive(Serialize, Deserialize)]
struct JwtPayload {
    session_id: String,
    role: String,
    iat: u64,
    exp: u64,
}

fn sign_jwt(payload: &JwtPayload, secret: &str) -> Result<String> {
    let header = JwtHeader {
        alg: "HS256".to_string(),
        typ: "JWT".to_string(),
    };
    let header_b64 = URL_SAFE_NO_PAD.encode(
        serde_json::to_string(&header).map_err(|e| Error::from(e.to_string()))?,
    );
    let payload_b64 = URL_SAFE_NO_PAD.encode(
        serde_json::to_string(payload).map_err(|e| Error::from(e.to_string()))?,
    );
    let signing_input = format!("{}.{}", header_b64, payload_b64);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| Error::from(e.to_string()))?;
    mac.update(signing_input.as_bytes());
    let sig_b64 = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    Ok(format!("{}.{}", signing_input, sig_b64))
}

#[derive(Serialize)]
struct SessionTokens {
    gm: String,
    player: String,
    viewer: String,
}

fn generate_tokens(session_id: &str, secret: &str) -> Result<SessionTokens> {
    let now = Date::now().as_millis() / 1000;
    let exp = now + 60 * 60 * 24 * 365; // 1 year

    let gm = sign_jwt(
        &JwtPayload { session_id: session_id.to_string(), role: "gm".to_string(), iat: now, exp },
        secret,
    )?;
    let player = sign_jwt(
        &JwtPayload { session_id: session_id.to_string(), role: "nav".to_string(), iat: now, exp },
        secret,
    )?;
    let viewer = sign_jwt(
        &JwtPayload { session_id: session_id.to_string(), role: "ro".to_string(), iat: now, exp },
        secret,
    )?;

    Ok(SessionTokens { gm, player, viewer })
}

fn verify_jwt(token: &str, secret: &str) -> Result<JwtPayload> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err(Error::from("Invalid token format"));
    }
    let signing_input = format!("{}.{}", parts[0], parts[1]);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| Error::from(e.to_string()))?;
    mac.update(signing_input.as_bytes());
    let expected_sig = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    if parts[2] != expected_sig {
        return Err(Error::from("Invalid signature"));
    }
    let payload_bytes = URL_SAFE_NO_PAD.decode(parts[1])
        .map_err(|e| Error::from(e.to_string()))?;
    let payload: JwtPayload = serde_json::from_slice(&payload_bytes)
        .map_err(|e| Error::from(e.to_string()))?;
    let now = Date::now().as_millis() / 1000;
    if now > payload.exp {
        return Err(Error::from("Token expired"));
    }
    Ok(payload)
}

/// Extract and verify the Bearer JWT from a request.
/// If required_role is Some, also enforce that the token's role matches.
fn authorize(req: &Request, session_id: &str, secret: &str, required_role: Option<&str>) -> Result<JwtPayload> {
    let headers = req.headers();
    let auth_header = headers
        .get("Authorization")?
        .ok_or_else(|| Error::from("Missing Authorization header"))?;
    if !auth_header.starts_with("Bearer ") {
        return Err(Error::from("Invalid Authorization header format"));
    }
    let token = &auth_header["Bearer ".len()..];
    let payload = verify_jwt(token, secret)?;
    if payload.session_id != session_id {
        return Err(Error::from("Token session ID mismatch"));
    }
    if let Some(role) = required_role {
        if payload.role != role {
            return Err(Error::from("Insufficient role"));
        }
    }
    Ok(payload)
}

fn cors_response() -> Result<Response> {
    let mut headers = Headers::new();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")?;
    Ok(Response::empty()?.with_headers(headers))
}

fn add_cors_headers(res: &mut Response) {
    let _ = res.headers_mut().set("Access-Control-Allow-Origin", "*");
    let _ = res.headers_mut().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // Handle CORS preflight
    if req.method() == Method::Options {
        return cors_response();
    }

    let secret = match env.var("SESSION_SECRET") {
        Ok(v) => v.to_string(),
        Err(_) => "default_secret_change_me".to_string(),
    };

    let router = Router::new();
    let secret_get = secret.clone();
    let secret_put = secret.clone();

    router
        .get("/health", |_, _| {
            let mut res = Response::from_json(&json!({ "status": "ok" }))?;
            add_cors_headers(&mut res);
            Ok(res)
        })
        // POST /sessions — create a new session, return { id, tokens: { gm, player, viewer } }
        .post_async("/sessions", move |mut req, ctx| {
            let secret = secret.clone();
            async move {
                let db = ctx.env.d1("DB")?;

                let json: serde_json::Value = req.json().await.unwrap_or(json!({}));

                // Optional: caller may suggest an ID (e.g. for idempotent re-creation)
                let id = {
                    let suggested = json.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    if suggested.is_empty() { Uuid::new_v4().to_string() } else { suggested }
                };

                let default_data = json!({});
                let data = json.get("data").unwrap_or(&default_data);
                let data_str = serde_json::to_string(data).unwrap_or("{}".to_string());
                let name = json.get("name").and_then(|v| v.as_str()).unwrap_or("Session");

                // Upsert so repeated POST with same id is safe
                db.prepare(
                    "INSERT OR REPLACE INTO resources (id, owner_id, name, type, data, visibility) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                )
                .bind(&[
                    id.clone().into(),
                    "anonymous".into(),
                    name.into(),
                    "session".into(),
                    data_str.into(),
                    "public".into(),
                ])?
                .run()
                .await?;

                let tokens = generate_tokens(&id, &secret)?;

                let mut res = Response::from_json(&json!({
                    "id": id,
                    "tokens": tokens,
                }))?;
                add_cors_headers(&mut res);
                Ok(res)
            }
        })
        // GET /sessions/:id — read session data; requires any valid token for this session
        .get_async("/sessions/:id", move |req, ctx| {
            let secret = secret_get.clone();
            async move {
                let id = ctx.param("id").unwrap().to_string();
                let db = ctx.env.d1("DB")?;

                if let Err(e) = authorize(&req, &id, &secret, None) {
                    let mut res = Response::error(e.to_string(), 401)?;
                    add_cors_headers(&mut res);
                    return Ok(res);
                }

                let result = db
                    .prepare("SELECT id, name, type, data, visibility FROM resources WHERE id = ?1")
                    .bind(&[id.into()])?
                    .first::<serde_json::Value>(None)
                    .await?;

                if let Some(mut row) = result {
                    // Unpack the data column from its stored JSON string
                    if let Some(data_str) = row.get("data").and_then(|v| v.as_str()) {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data_str) {
                            row["data"] = parsed;
                        }
                    }
                    let mut res = Response::from_json(&row)?;
                    add_cors_headers(&mut res);
                    Ok(res)
                } else {
                    let mut res = Response::error("Not found", 404)?;
                    add_cors_headers(&mut res);
                    Ok(res)
                }
            }
        })
        // PUT /sessions/:id — update session data; requires gm token
        .put_async("/sessions/:id", move |mut req, ctx| {
            let secret = secret_put.clone();
            async move {
                let id = ctx.param("id").unwrap().to_string();
                let db = ctx.env.d1("DB")?;

                if let Err(e) = authorize(&req, &id, &secret, Some("gm")) {
                    let mut res = Response::error(e.to_string(), 401)?;
                    add_cors_headers(&mut res);
                    return Ok(res);
                }

                let json: serde_json::Value = req.json().await.unwrap_or(json!({}));
                let default_data = json!({});
                let data = json.get("data").unwrap_or(&default_data);
                let data_str = serde_json::to_string(data).unwrap_or("{}".to_string());

                db.prepare("UPDATE resources SET data = ?1 WHERE id = ?2")
                    .bind(&[data_str.into(), id.into()])?
                    .run()
                    .await?;

                let mut res = Response::from_json(&json!({ "success": true }))?;
                add_cors_headers(&mut res);
                Ok(res)
            }
        })
        .run(req, env)
        .await
        .map(|mut res| {
            add_cors_headers(&mut res);
            res
        })
        .or_else(|e| {
            let mut res = Response::error(e.to_string(), 500).unwrap();
            add_cors_headers(&mut res);
            Ok(res)
        })
}
