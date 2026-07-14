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
