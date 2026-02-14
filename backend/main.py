import js
import json
import asyncio
from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time
import uuid
import secrets
import os
import base64
import traceback
import sys

# --- ASGI Adapter ---

async def asgi_fetch(app, request, env):
    try:
        print(f"DEBUG: Handling request {request.method} {request.url}", flush=True)
        # Parse URL
        url = js.URL.new(request.url)

        # Parse headers
        headers = []
        try:
            iterator = request.headers.entries()
            while True:
                entry = iterator.next()
                if entry.done:
                    break
                key, value = entry.value
                headers.append((key.encode("latin-1"), value.encode("latin-1")))
        except Exception as e:
            print(f"DEBUG: Header parsing error: {e}", flush=True)
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

        # Create Response options object
        resp_init = js.Object.new()
        resp_init.headers = resp_headers
        resp_init.status = response.get("status", 200)
        resp_init.statusText = ""

        # Return Response
        return js.Response.new(
            response.get("body", b"").decode("utf-8"),
            resp_init
        )
    except BaseException as e:
        print(f"Internal Server Error: {e}", flush=True)
        traceback.print_exc(file=sys.stdout)

        resp_init = js.Object.new()
        resp_init.status = 500
        resp_init.statusText = "Internal Server Error"

        return js.Response.new(
            "Internal Server Error",
            resp_init
        )

# --- App ---

app = FastAPI()

# --- Helpers ---

async def get_env(request: Request):
    return request.scope["extensions"]["cloudflare"]["env"]

async def get_db(request: Request):
    env = await get_env(request)
    print(f"DEBUG: Accessing DB from env: {env}", flush=True)
    if not hasattr(env, 'DB'):
        print("DEBUG: env.DB is missing!", flush=True)
    return env.DB

def safe_results(res):
    """Safely extract results from D1 result object."""
    print(f"DEBUG: safe_results input: {res}", flush=True)
    # Check if res is valid
    if not res:
        print("DEBUG: res is falsy", flush=True)
        return []

    # Try to access results property
    try:
        results = res.results
        print(f"DEBUG: res.results: {results}", flush=True)
    except Exception as e:
        print(f"DEBUG: Failed to access res.results: {e}", flush=True)
        results = None

    if results is None:
        return []

    # Convert from JS proxy if needed
    try:
        if hasattr(results, 'to_py'):
            py_results = results.to_py()
            print(f"DEBUG: Converted to python: {py_results}", flush=True)
            return py_results
    except Exception as e:
        print(f"DEBUG: to_py() failed: {e}", flush=True)

    return results

# --- Password Hashing (Web Crypto) ---

async def hash_password(password: str) -> str:
    print(f"DEBUG: hashing password...", flush=True)
    try:
        enc = js.TextEncoder.new()
        password_key = await js.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            js.JSON.parse('{"name": "PBKDF2"}'),
            False,
            js.JSON.parse('["deriveBits", "deriveKey"]')
        )

        # Generate salt using os.urandom (supported in Pyodide usually)
        # or js.crypto.getRandomValues if python random is flaky
        salt_js = js.Uint8Array.new(16)
        js.crypto.getRandomValues(salt_js)
        salt_bytes = bytes(salt_js)
        salt_hex = salt_bytes.hex()

        # Derive bits
        algo = js.Object.new()
        algo.name = "PBKDF2"
        algo.salt = salt_js
        algo.iterations = 100000
        algo.hash = "SHA-256"

        derived_bits = await js.crypto.subtle.deriveBits(
            algo,
            password_key,
            256
        )

        hash_bytes = bytes(js.Uint8Array.new(derived_bits))
        hash_hex = hash_bytes.hex()

        print(f"DEBUG: password hashed successfully", flush=True)
        return f"{salt_hex}${hash_hex}"
    except Exception as e:
        print(f"DEBUG: hash_password failed: {e}", flush=True)
        raise e

async def verify_password(stored_password: str, provided_password: str) -> bool:
    try:
        if not stored_password or '$' not in stored_password:
            return False
        salt_hex, stored_hash_hex = stored_password.split('$')

        salt_bytes = bytes.fromhex(salt_hex)
        salt_js = js.Uint8Array.new(salt_bytes)

        enc = js.TextEncoder.new()
        password_key = await js.crypto.subtle.importKey(
            "raw",
            enc.encode(provided_password),
            js.JSON.parse('{"name": "PBKDF2"}'),
            False,
            js.JSON.parse('["deriveBits", "deriveKey"]')
        )

        algo = js.Object.new()
        algo.name = "PBKDF2"
        algo.salt = salt_js
        algo.iterations = 100000
        algo.hash = "SHA-256"

        derived_bits = await js.crypto.subtle.deriveBits(
            algo,
            password_key,
            256
        )

        hash_bytes = bytes(js.Uint8Array.new(derived_bits))
        hash_hex = hash_bytes.hex()

        # Constant time compare (secrets module is good for this)
        return secrets.compare_digest(stored_hash_hex, hash_hex)
    except Exception as e:
        print(f"DEBUG: verify_password failed: {e}", flush=True)
        return False

# --- Web Crypto JWT Implementation ---

def base64url_decode(input: str) -> bytes:
    input += "=" * (-len(input) % 4)
    return base64.urlsafe_b64decode(input)

def base64url_encode(input: bytes) -> str:
    return base64.urlsafe_b64encode(input).rstrip(b"=").decode("utf-8")

async def verify_rs256_token(token: str, client_id: str):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts

        header = json.loads(base64url_decode(header_b64))
        payload = json.loads(base64url_decode(payload_b64))

        # Verify audience
        if payload.get("aud") != client_id:
            return None

        # Verify expiration
        if payload.get("exp", 0) < time.time():
            return None

        kid = header.get("kid")
        if not kid:
            return None

        # Fetch keys using js.fetch
        jwks = await get_jwks()
        if not jwks:
            return None

        key_data = next((k for k in jwks if k["kid"] == kid), None)
        if not key_data:
            return None

        # Import key using Web Crypto
        # key_data is a dict. Convert to JS object
        key_js = js.JSON.parse(json.dumps(key_data))
        algo = js.Object.new()
        algo.name = "RSASSA-PKCS1-v1_5"
        algo.hash = "SHA-256"

        crypto_key = await js.crypto.subtle.importKey(
            "jwk",
            key_js,
            algo,
            False,
            js.Array.new("verify")
        )

        # Verify signature
        # Signature is base64url encoded
        signature = base64url_decode(signature_b64)
        signature_js = js.Uint8Array.new(signature)

        # Data to verify is header.payload
        data = f"{header_b64}.{payload_b64}".encode("utf-8")
        data_js = js.Uint8Array.new(data)

        is_valid = await js.crypto.subtle.verify(
            algo,
            crypto_key,
            signature_js,
            data_js
        )

        if is_valid:
            return payload
        return None

    except Exception as e:
        print(f"RS256 verification error: {e}", flush=True)
        return None

async def sign_hs256_token(payload: dict, secret: str) -> str:
    try:
        header = {"typ": "JWT", "alg": "HS256"}
        header_b64 = base64url_encode(json.dumps(header).encode("utf-8"))
        payload_b64 = base64url_encode(json.dumps(payload).encode("utf-8"))

        data = f"{header_b64}.{payload_b64}".encode("utf-8")
        data_js = js.Uint8Array.new(data)

        # Import secret key
        secret_bytes = secret.encode("utf-8")
        secret_js = js.Uint8Array.new(secret_bytes)

        algo = js.Object.new()
        algo.name = "HMAC"
        algo.hash = "SHA-256"

        crypto_key = await js.crypto.subtle.importKey(
            "raw",
            secret_js,
            algo,
            False,
            js.Array.new("sign")
        )

        signature_ab = await js.crypto.subtle.sign(
            algo,
            crypto_key,
            data_js
        )
        # signature_ab is ArrayBuffer, convert to bytes
        signature_bytes = bytes(js.Uint8Array.new(signature_ab))
        signature_b64 = base64url_encode(signature_bytes)

        return f"{header_b64}.{payload_b64}.{signature_b64}"
    except Exception as e:
        print(f"HS256 signing error: {e}", flush=True)
        return ""

async def verify_hs256_token(token: str, secret: str):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts

        # Decode payload for expiry check
        payload = json.loads(base64url_decode(payload_b64))

        if payload.get("exp", 0) < time.time():
            return None

        # Verify signature
        data = f"{header_b64}.{payload_b64}".encode("utf-8")
        data_js = js.Uint8Array.new(data)

        signature = base64url_decode(signature_b64)
        signature_js = js.Uint8Array.new(signature)

        secret_bytes = secret.encode("utf-8")
        secret_js = js.Uint8Array.new(secret_bytes)

        algo = js.Object.new()
        algo.name = "HMAC"
        algo.hash = "SHA-256"

        crypto_key = await js.crypto.subtle.importKey(
            "raw",
            secret_js,
            algo,
            False,
            js.Array.new("verify")
        )

        is_valid = await js.crypto.subtle.verify(
            algo,
            crypto_key,
            signature_js,
            data_js
        )

        if is_valid:
            return payload
        return None

    except Exception as e:
        print(f"HS256 verification error: {e}", flush=True)
        return None

# --- Models ---

class Link(BaseModel):
    href: str
    rel: str
    method: str

class Ship(BaseModel):
    id: str
    owner_id: str
    name: Optional[str]
    data: Dict[str, Any]
    visibility: str
    created_at: int
    updated_at: int
    links: Dict[str, Link] = Field(alias="_links")

class CreateShip(BaseModel):
    name: str
    data: Dict[str, Any]
    visibility: str = "private"

class ShareShip(BaseModel):
    grantee_id: str
    grantee_type: str # user, group, app
    access_level: str # read, write, admin

class User(BaseModel):
    id: str
    email: str
    name: str

class RegisterUser(BaseModel):
    email: str
    password: str
    name: str

class LoginUser(BaseModel):
    email: str
    password: str

# --- Auth Helpers ---

jwks_cache = {"keys": None, "expiry": 0}

async def get_jwks():
    now = time.time()
    if jwks_cache["keys"] and now < jwks_cache["expiry"]:
        return jwks_cache["keys"]

    try:
        # Use js.fetch for Cloudflare Workers compatibility
        resp = await js.fetch("https://www.googleapis.com/oauth2/v3/certs")
        if resp.status != 200:
            return None
        data = await resp.json()
        # Convert JS object to Python dict
        keys_data = data.to_py()
        jwks_cache["keys"] = keys_data.get("keys", [])
        jwks_cache["expiry"] = now + 3600
        return jwks_cache["keys"]
    except Exception as e:
        print(f"Failed to fetch JWKS: {e}", flush=True)
        return None

async def get_current_user(request: Request) -> Optional[User]:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    env = await get_env(request)

    payload = await verify_hs256_token(token, env.SESSION_SECRET)
    if payload:
        return User(id=payload["sub"], email=payload["email"], name=payload["name"])
    return None

# --- Endpoints ---

@app.post("/auth/register")
async def register(user_req: RegisterUser, request: Request):
    print("DEBUG: Entering register endpoint", flush=True)
    try:
        db = await get_db(request)
        print(f"DEBUG: DB Object: {db}", flush=True)

        # Check if user exists
        print(f"DEBUG: Checking for existing user {user_req.email}", flush=True)
        stmt = db.prepare("SELECT id FROM users WHERE email = ?")
        print("DEBUG: Statement prepared", flush=True)
        stmt = stmt.bind(user_req.email)
        print("DEBUG: Statement bound", flush=True)

        # Add timeout to catch hangs
        res = await asyncio.wait_for(stmt.all(), timeout=5.0)
        print(f"DEBUG: Query executed. Result: {res}", flush=True)
        results = safe_results(res)

        if results:
            print("DEBUG: User already exists", flush=True)
            raise HTTPException(status_code=400, detail="User already exists")

        print("DEBUG: Generating UUID", flush=True)
        user_id = str(uuid.uuid4())
        print(f"DEBUG: Generated UUID: {user_id}", flush=True)

        pw_hash = await hash_password(user_req.password)

        print("DEBUG: Creating new user", flush=True)
        insert_stmt = db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)")
        insert_stmt = insert_stmt.bind(user_id, user_req.email, user_req.name, pw_hash)
        await asyncio.wait_for(insert_stmt.run(), timeout=5.0)

        print("DEBUG: User created successfully", flush=True)
        return {"status": "ok", "user_id": user_id}
    except asyncio.TimeoutError:
        print("DEBUG: Database operation timed out!", flush=True)
        raise HTTPException(status_code=504, detail="Database operation timed out")
    except Exception as e:
        print(f"DEBUG: Error in register: {e}", flush=True)
        traceback.print_exc(file=sys.stdout)
        raise e

@app.post("/auth/login")
async def login(login_req: LoginUser, request: Request):
    db = await get_db(request)
    env = await get_env(request)

    res = await db.prepare("SELECT * FROM users WHERE email = ?").bind(login_req.email).all()
    results = safe_results(res)

    if not results:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_row = results[0]
    stored_hash = user_row.get('password_hash')

    if not stored_hash:
        # User might be a Google-only user
        raise HTTPException(status_code=401, detail="Invalid credentials (try Google login)")

    if not await verify_password(stored_hash, login_req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create session token
    session_payload = {
        "sub": user_row['id'],
        "email": user_row['email'],
        "name": user_row['name'],
        "exp": int(time.time()) + 86400 * 7 # 7 days
    }
    session_token = await sign_hs256_token(session_payload, env.SESSION_SECRET)
    return {"access_token": session_token, "token_type": "bearer"}

@app.get("/auth/google")
async def auth_google(token: str, request: Request):
    env = await get_env(request)
    payload = await verify_rs256_token(token, env.GOOGLE_CLIENT_ID)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid token")

    user_id = payload["sub"]
    email = payload["email"]
    name = payload.get("name", "")

    db = await get_db(request)

    # Upsert user
    res = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user_id).all()
    results = safe_results(res)

    if not results:
        # Check by email
        res_email = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).all()
        email_results = safe_results(res_email)

        if email_results:
            user_row = email_results[0]
            user_id = user_row['id']
        else:
            await db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").bind(user_id, email, name).run()

    # Create session token
    session_payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": int(time.time()) + 86400 * 7 # 7 days
    }
    session_token = await sign_hs256_token(session_payload, env.SESSION_SECRET)
    return {"access_token": session_token, "token_type": "bearer"}

@app.get("/ships", response_model=List[Ship])
async def list_ships(request: Request):
    user = await get_current_user(request)
    user_id = user.id if user else None

    db = await get_db(request)

    if user_id:
        # Access Ranks: admin=3, write=2, read=1
        sql = """
        SELECT s.*,
        MAX(CASE
            WHEN s.owner_id = ? THEN 3
            WHEN p.access_level = 'admin' THEN 3
            WHEN p.access_level = 'write' THEN 2
            WHEN p.access_level = 'read' THEN 1
            ELSE 0
        END) as access_rank
        FROM ships s
        LEFT JOIN permissions p ON s.id = p.target_id
        LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
        WHERE s.visibility = 'public'
           OR s.owner_id = ?
           OR (p.grantee_id = ? AND p.grantee_type = 'user')
           OR (gm.user_id = ?)
        GROUP BY s.id
        """
        params = [user_id, user_id, user_id, user_id]
    else:
        sql = "SELECT *, 0 as access_rank FROM ships WHERE visibility = 'public'"
        params = []

    res = await db.prepare(sql).bind(*params).all()
    results = safe_results(res)

    ships = []
    for row in results:
        access_rank = row.get('access_rank', 0)

        # HATEOAS Links
        links = {
            "self": Link(href=f"/ships/{row['id']}", rel="self", method="GET")
        }

        if access_rank >= 2: # write or admin
            links["update"] = Link(href=f"/ships/{row['id']}", rel="update", method="PUT")

        if access_rank >= 3: # admin
            links["share"] = Link(href=f"/ships/{row['id']}/share", rel="share", method="PATCH")
            links["delete"] = Link(href=f"/ships/{row['id']}", rel="delete", method="DELETE")

        ships.append(Ship(
            id=row['id'],
            owner_id=row['owner_id'],
            name=row['name'],
            data=json.loads(row['data']),
            visibility=row['visibility'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            _links=links
        ))
    return ships

@app.post("/ships", response_model=Ship)
async def create_ship(ship_req: CreateShip, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    ship_id = str(uuid.uuid4())
    db = await get_db(request)

    # Store data
    await db.prepare("""
        INSERT INTO ships (id, owner_id, name, data, visibility)
        VALUES (?, ?, ?, ?, ?)
    """).bind(
        ship_id, user.id, ship_req.name, json.dumps(ship_req.data), ship_req.visibility
    ).run()

    links = {
        "self": Link(href=f"/ships/{ship_id}", rel="self", method="GET"),
        "update": Link(href=f"/ships/{ship_id}", rel="update", method="PUT"),
        "share": Link(href=f"/ships/{ship_id}/share", rel="share", method="PATCH"),
        "delete": Link(href=f"/ships/{ship_id}", rel="delete", method="DELETE")
    }

    current_time = int(time.time())

    return Ship(
        id=ship_id,
        owner_id=user.id,
        name=ship_req.name,
        data=ship_req.data,
        visibility=ship_req.visibility,
        created_at=current_time,
        updated_at=current_time,
        _links=links
    )

@app.patch("/ships/{ship_id}/share")
async def share_ship(ship_id: str, share_req: ShareShip, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = await get_db(request)

    # Access Ranks
    sql = """
        SELECT s.owner_id,
        MAX(CASE
            WHEN s.owner_id = ? THEN 3
            WHEN p.access_level = 'admin' THEN 3
            ELSE 0
        END) as access_rank
        FROM ships s
        LEFT JOIN permissions p ON s.id = p.target_id
        LEFT JOIN group_members gm ON p.grantee_id = gm.group_id AND p.grantee_type = 'group'
        WHERE s.id = ? AND (
           s.owner_id = ?
           OR (p.grantee_id = ? AND p.grantee_type = 'user')
           OR (gm.user_id = ?)
        )
        GROUP BY s.id
    """

    res = await db.prepare(sql).bind(user.id, ship_id, user.id, user.id, user.id).all()
    results = safe_results(res)

    if not results:
        # Check if ship exists
        check = await db.prepare("SELECT 1 FROM ships WHERE id = ?").bind(ship_id).all()
        check_results = safe_results(check)
        if not check_results:
            raise HTTPException(status_code=404, detail="Ship not found")
        raise HTTPException(status_code=403, detail="Not authorized")

    access_rank = results[0].get('access_rank', 0)

    if access_rank < 3:
        raise HTTPException(status_code=403, detail="Not authorized to share this ship")

    # Upsert permission
    await db.prepare("""
        INSERT INTO permissions (target_id, grantee_id, grantee_type, access_level)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(target_id, grantee_id, grantee_type)
        DO UPDATE SET access_level = excluded.access_level
    """).bind(
        ship_id, share_req.grantee_id, share_req.grantee_type, share_req.access_level
    ).run()

    return {"status": "ok"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# --- Worker Entry Point ---

async def on_fetch(request, env):
    return await asgi_fetch(app, request, env)
