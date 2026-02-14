import js
import json
import asyncio
from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import time
import uuid
import jwt
from jwt import PyJWKClient
import hashlib
import secrets
import os

# --- ASGI Adapter ---

async def asgi_fetch(app, request, env):
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

# --- App ---

app = FastAPI()

# --- Helpers ---

async def get_env(request: Request):
    return request.scope["extensions"]["cloudflare"]["env"]

async def get_db(request: Request):
    env = await get_env(request)
    return env.DB

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode(),
        salt.encode(),
        100000
    ).hex()
    return f"{salt}${pw_hash}"

def verify_password(stored_password: str, provided_password: str) -> bool:
    if not stored_password or '$' not in stored_password:
        return False
    salt, stored_hash = stored_password.split('$')
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        provided_password.encode(),
        salt.encode(),
        100000
    ).hex()
    return secrets.compare_digest(stored_hash, pw_hash)

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

# --- Auth ---

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
        print(f"Failed to fetch JWKS: {e}")
        return None

async def verify_google_token(token: str, client_id: str):
    keys = await get_jwks()
    if not keys:
        return None

    try:
        # Get the kid from the header
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            return None

        # Find the signing key
        key_data = next((k for k in keys if k["kid"] == kid), None)
        if not key_data:
            return None

        # Construct public key from JWK
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=client_id,
            options={"verify_at_hash": False}
        )
        return payload
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

async def get_current_user(request: Request) -> Optional[User]:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    env = await get_env(request)
    try:
        payload = jwt.decode(token, env.SESSION_SECRET, algorithms=["HS256"])
        return User(id=payload["sub"], email=payload["email"], name=payload["name"])
    except:
        return None

# --- Endpoints ---

@app.post("/auth/register")
async def register(user_req: RegisterUser, request: Request):
    db = await get_db(request)

    # Check if user exists
    res = await db.prepare("SELECT id FROM users WHERE email = ?").bind(user_req.email).all()
    if res.results:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = str(uuid.uuid4())
    pw_hash = hash_password(user_req.password)

    await db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)").bind(
        user_id, user_req.email, user_req.name, pw_hash
    ).run()

    return {"status": "ok", "user_id": user_id}

@app.post("/auth/login")
async def login(login_req: LoginUser, request: Request):
    db = await get_db(request)
    env = await get_env(request)

    res = await db.prepare("SELECT * FROM users WHERE email = ?").bind(login_req.email).all()
    results = res.results
    if hasattr(results, 'to_py'):
        results = results.to_py()

    if not results:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_row = results[0]
    stored_hash = user_row.get('password_hash')

    if not stored_hash:
        # User might be a Google-only user
        raise HTTPException(status_code=401, detail="Invalid credentials (try Google login)")

    if not verify_password(stored_hash, login_req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create session token
    session_payload = {
        "sub": user_row['id'],
        "email": user_row['email'],
        "name": user_row['name'],
        "exp": int(time.time()) + 86400 * 7 # 7 days
    }
    session_token = jwt.encode(session_payload, env.SESSION_SECRET, algorithm="HS256")
    return {"access_token": session_token, "token_type": "bearer"}

@app.get("/auth/google")
async def auth_google(token: str, request: Request):
    env = await get_env(request)
    payload = await verify_google_token(token, env.GOOGLE_CLIENT_ID)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid token")

    user_id = payload["sub"]
    email = payload["email"]
    name = payload.get("name", "")

    db = await get_db(request)

    # Upsert user
    res = await db.prepare("SELECT * FROM users WHERE id = ?").bind(user_id).all()
    results = res.results
    if hasattr(results, 'to_py'):
        results = results.to_py()

    if not results:
        # Check by email
        res_email = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).all()
        email_results = res_email.results
        if hasattr(email_results, 'to_py'):
            email_results = email_results.to_py()

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
    session_token = jwt.encode(session_payload, env.SESSION_SECRET, algorithm="HS256")
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
    results = res.results
    if hasattr(results, 'to_py'):
        results = results.to_py()

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
    results = res.results
    if hasattr(results, 'to_py'):
        results = results.to_py()

    if not results:
        # Check if ship exists
        check = await db.prepare("SELECT 1 FROM ships WHERE id = ?").bind(ship_id).all()
        if not check.results:
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

# --- Worker Entry Point ---

async def on_fetch(request, env):
    return await asgi_fetch(app, request, env)
