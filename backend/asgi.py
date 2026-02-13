import js
import json
import asyncio

async def fetch(app, request, env):
    # Parse URL
    url = js.URL.new(request.url)

    # Parse headers
    headers = []
    # request.headers is a Headers object. Iterate over entries.
    try:
        iterator = request.headers.entries()
        while True:
            entry = iterator.next()
            if entry.done:
                break
            key, value = entry.value
            headers.append((key.encode("latin-1"), value.encode("latin-1")))
    except Exception:
        # Fallback or empty if iteration fails
        pass

    # Read body
    try:
        body_text = await request.text()
        body_bytes = body_text.encode("utf-8")
    except:
        body_bytes = b""

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.1"},
        "http_version": "1.1",
        "method": request.method,
        "scheme": url.protocol.replace(":", ""),
        "path": url.pathname,
        "query_string": url.search.encode("utf-8")[1:] if url.search else b"",
        "root_path": "",
        "headers": headers,
        "server": (url.hostname, 443 if url.protocol == "https:" else 80),
        "client": ("127.0.0.1", 0),
        "extensions": {"cloudflare": {"env": env}},
    }

    async def receive():
        return {
            "type": "http.request",
            "body": body_bytes,
            "more_body": False,
        }

    response = {}

    async def send(message):
        nonlocal response
        if message["type"] == "http.response.start":
            response["status"] = message["status"]
            response["headers"] = message["headers"]
        elif message["type"] == "http.response.body":
            body = message.get("body", b"")
            if "body" in response:
                response["body"] += body
            else:
                response["body"] = body

    await app(scope, receive, send)

    # Convert headers
    resp_headers = js.Headers.new()
    if "headers" in response:
        for k, v in response["headers"]:
            resp_headers.append(k.decode("latin-1"), v.decode("latin-1"))

    # Return Response
    return js.Response.new(
        response.get("body", b"").decode("utf-8"), # Simplified: assume text/json
        headers=resp_headers,
        status=response.get("status", 200),
        statusText=""
    )
