export interface Env {
    DB: D1Database;
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

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        };

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

                return new Response(JSON.stringify({ id, _links: { self: { href: `/sessions/${id}` } } }), { headers: corsHeaders });
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

                // Parse the JSON string stored in the database back to an object
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
