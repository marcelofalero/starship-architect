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
    
    let header_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_string(&header).map_err(|e| Error::from(e.to_string()))?);
    let payload_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_string(payload).map_err(|e| Error::from(e.to_string()))?);
    
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
    let exp = now + 60 * 60 * 24 * 365;

    let gm = sign_jwt(&JwtPayload { session_id: session_id.to_string(), role: "gm".to_string(), iat: now, exp }, secret)?;
    let player = sign_jwt(&JwtPayload { session_id: session_id.to_string(), role: "nav".to_string(), iat: now, exp }, secret)?;
    let viewer = sign_jwt(&JwtPayload { session_id: session_id.to_string(), role: "ro".to_string(), iat: now, exp }, secret)?;

    Ok(SessionTokens { gm, player, viewer })
}

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // console_error_panic_hook::set_once(); // Optional panic hook

    if req.method() == Method::Options {
        let mut headers = Headers::new();
        headers.set("Access-Control-Allow-Origin", "*")?;
        headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")?;
        headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")?;
        return Ok(Response::empty()?.with_headers(headers));
    }

    let secret = match env.var("SESSION_SECRET") {
        Ok(v) => v.to_string(),
        Err(_) => "default_secret_change_me".to_string(),
    };

    let router = Router::new();

    router
        .post_async("/sessions", move |mut req, ctx| {
            let secret = secret.clone();
            async move {
                let db = ctx.env.d1("DB")?;
                
                // Ensure guest user exists
                let user_id = "guest_user";
                db.prepare("INSERT OR IGNORE INTO users (id, email, name) VALUES (?1, ?2, ?3)")
                    .bind(&[user_id.into(), "guest@local".into(), "Guest User".into()])?
                    .run()
                    .await?;

                let json: serde_json::Value = req.json().await.unwrap_or(json!({}));
                let id = json.get("id").and_then(|v| v.as_str()).unwrap_or_else(|| "").to_string();
                let id = if id.is_empty() { Uuid::new_v4().to_string() } else { id };
                
                let default_data = json!({});
                let data = json.get("data").unwrap_or(&default_data);
                let data_str = serde_json::to_string(data).unwrap_or("{}".to_string());
                
                let name = json.get("name").and_then(|v| v.as_str()).unwrap_or("Session");
                let visibility = json.get("visibility").and_then(|v| v.as_str()).unwrap_or("public");

                db.prepare("INSERT INTO resources (id, owner_id, name, type, data, visibility) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
                    .bind(&[id.clone().into(), user_id.into(), name.into(), "session".into(), data_str.into(), visibility.into()])?
                    .run()
                    .await?;

                let tokens = generate_tokens(&id, &secret)?;

                let response_json = json!({
                    "id": id,
                    "tokens": tokens,
                    "_links": { "self": { "href": format!("/sessions/{}", id) } }
                });

                let mut res = Response::from_json(&response_json)?;
                add_cors_headers(&mut res);
                Ok(res)
            }
        })
        .get_async("/sessions/:id", |_, ctx| async move {
            let id = ctx.param("id").unwrap();
            let db = ctx.env.d1("DB")?;
            
            let query = db.prepare("SELECT id, name, type, data, visibility FROM resources WHERE id = ?1").bind(&[id.into()])?;
            let result = query.first::<serde_json::Value>(None).await?;
            
            if let Some(mut row) = result {
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
        })
        .put_async("/sessions/:id", |mut req, ctx| async move {
            let id = ctx.param("id").unwrap();
            let db = ctx.env.d1("DB")?;
            
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
        })
        .post_async("/auth/login", |_, _| async move {
            let mut res = Response::from_json(&json!({
                "access_token": "dummy_jwt_token",
                "user": { "id": "guest_user", "email": "guest@local" }
            }))?;
            add_cors_headers(&mut res);
            Ok(res)
        })
        .post_async("/auth/register", |_, _| async move {
            let mut res = Response::from_json(&json!({ "success": true }))?;
            add_cors_headers(&mut res);
            Ok(res)
        })
        .run(req, env)
        .await
        .map(|mut res| {
            if res.status_code() == 404 && res.headers().get("Access-Control-Allow-Origin").unwrap_or(None).is_none() {
                add_cors_headers(&mut res);
            }
            res
        })
        .or_else(|e| {
            let mut res = Response::error(e.to_string(), 500).unwrap();
            add_cors_headers(&mut res);
            Ok(res)
        })
}

fn add_cors_headers(res: &mut Response) {
    let _ = res.headers_mut().set("Access-Control-Allow-Origin", "*");
}
