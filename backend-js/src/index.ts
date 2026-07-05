export interface Env {
    DB: D1Database;
    SESSION_SECRET?: string;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
};

// HS256 JWT signing using Web Crypto API
async function signJwt(payload: object, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const header = { alg: "HS256", typ: "JWT" };
    const b64Header = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const b64Payload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signingInput = `${b64Header}.${b64Payload}`;

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
    const b64Sig = btoa(String.fromCharCode(...new Uint8Array(sig)))
        .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    return `${signingInput}.${b64Sig}`;
}

async function signSessionTokens(sessionId: string, secret: string): Promise<{ gm: string; player: string; viewer: string }> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 365; // 1 year

    const [gm, player, viewer] = await Promise.all([
        signJwt({ session_id: sessionId, role: "gm",     iat: now, exp }, secret),
        signJwt({ session_id: sessionId, role: "nav",    iat: now, exp }, secret),
        signJwt({ session_id: sessionId, role: "ro",     iat: now, exp }, secret),
    ]);

    return { gm, player, viewer };
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                }
            });
        }

        const secret = env.SESSION_SECRET || "default_secret_change_me";

        try {
            // Simplified Auth (creates a guest user if needed for the foreign key constraint)
            let userId = "guest_user";
            await env.DB.prepare(
                `INSERT OR IGNORE INTO users (id, email, name) VALUES (?1, ?2, ?3)`
            ).bind(userId, "guest@local", "Guest User").run();

            // POST /sessions
            if (request.method === "POST" && url.pathname.startsWith("/sessions")) {
                const reqBody: any = await request.json();
                const id = reqBody.id || crypto.randomUUID();
                const data = JSON.stringify(reqBody.data || {});

                await env.DB.prepare(
                    `INSERT INTO resources (id, owner_id, name, type, data, visibility) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
                ).bind(id, userId, reqBody.name || "Session", "session", data, reqBody.visibility || "public").run();

                const tokens = await signSessionTokens(id, secret);

                return new Response(JSON.stringify({
                    id,
                    tokens,
                    _links: { self: { href: `/sessions/${id}` } }
                }), { headers: corsHeaders });
            }

            // GET /sessions/:id
            if (request.method === "GET" && url.pathname.startsWith("/sessions/")) {
                const id = url.pathname.split("/").pop();
                const result = await env.DB.prepare(
                    `SELECT id, name, type, data, visibility FROM resources WHERE id = ?1`
                ).bind(id).first();

                if (!result) {
                    return new Response("Not found", { status: 404, headers: corsHeaders });
                }

                result.data = JSON.parse(result.data as string);

                return new Response(JSON.stringify(result), { headers: corsHeaders });
            }

            // PUT /sessions/:id
            if (request.method === "PUT" && url.pathname.startsWith("/sessions/")) {
                const id = url.pathname.split("/").pop();
                const reqBody: any = await request.json();
                const data = JSON.stringify(reqBody.data || {});

                await env.DB.prepare(
                    `UPDATE resources SET data = ?1 WHERE id = ?2`
                ).bind(data, id).run();

                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

            // Dummy Auth endpoint to trick app.js into thinking it logged in
            if (request.method === "POST" && url.pathname.startsWith("/auth/")) {
                return new Response(JSON.stringify({ access_token: "dummy_jwt_token", user: { id: userId, email: "guest@local" } }), { headers: corsHeaders });
            }

            return new Response("Not found", { status: 404, headers: corsHeaders });

        } catch (err: any) {
            console.error("Worker error:", err);
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    },
};
