import pytest
import httpx
import uuid
import os

BASE_URL = os.environ.get("BASE_URL", "http://backend:8787")

@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        yield client

def create_user(client, name="Test User"):
    email = f"test_{uuid.uuid4()}@example.com"
    password = "secretpassword"

    resp = client.post("/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    assert resp.status_code == 200, f"Register failed: {resp.text}"
    user_id = resp.json().get("user_id")

    resp = client.post("/auth/login", json={
        "email": email,
        "password": password
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json().get("access_token")

    return {
        "id": user_id,
        "email": email,
        "password": password,
        "headers": {"Authorization": f"Bearer {token}"}
    }

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

# Auth Tests

def test_auth_register_duplicate(client):
    user = create_user(client)

    resp = client.post("/auth/register", json={
        "email": user["email"],
        "password": "newpassword",
        "name": "Duplicate User"
    })
    assert resp.status_code == 400

def test_auth_login_failure(client):
    resp = client.post("/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401

# Resource Tests

RESOURCE_TYPES = [
    ("ships", {"configuration": {"hull": "fighter", "speed": 100}, "manifest": []}),
    ("libraries", {"components": [], "ships": []}),
    ("hangars", {"ships": []}),
    ("configurations", {"setting": "value"})
]

@pytest.mark.parametrize("resource_type, initial_data", RESOURCE_TYPES)
def test_resource_lifecycle(client, resource_type, initial_data):
    user = create_user(client)
    headers = user["headers"]

    # Create
    resp = client.post(f"/{resource_type}", json={
        "name": f"My {resource_type}",
        "data": initial_data,
        "visibility": "private"
    }, headers=headers)
    assert resp.status_code == 200, f"Create failed: {resp.text}"
    resource = resp.json()
    resource_id = resource["id"]
    assert resource["name"] == f"My {resource_type}"

    # Get
    resp = client.get(f"/{resource_type}/{resource_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == resource_id

    # Update
    new_name = f"Updated {resource_type}"
    resp = client.put(f"/{resource_type}/{resource_id}", json={
        "name": new_name,
        "data": initial_data,
        "visibility": "private"
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == new_name

    # Delete
    resp = client.delete(f"/{resource_type}/{resource_id}", headers=headers)
    assert resp.status_code == 204

    # Verify Gone
    resp = client.get(f"/{resource_type}/{resource_id}", headers=headers)
    assert resp.status_code == 404

@pytest.mark.parametrize("resource_type, initial_data", RESOURCE_TYPES)
def test_resource_sharing(client, resource_type, initial_data):
    owner = create_user(client, name="Owner")
    grantee = create_user(client, name="Grantee")

    # Owner creates private resource
    resp = client.post(f"/{resource_type}", json={
        "name": "Private Resource",
        "data": initial_data,
        "visibility": "private"
    }, headers=owner["headers"])
    assert resp.status_code == 200
    resource_id = resp.json()["id"]

    # Grantee tries to access (should fail)
    resp = client.get(f"/{resource_type}/{resource_id}", headers=grantee["headers"])
    assert resp.status_code == 404 # Backend returns 404 for not found or access denied

    # Share (Read)
    resp = client.patch(f"/{resource_type}/{resource_id}/share", json={
        "grantee_id": grantee["id"],
        "grantee_type": "user",
        "access_level": "read"
    }, headers=owner["headers"])
    assert resp.status_code == 200

    # Grantee tries to access (should succeed)
    resp = client.get(f"/{resource_type}/{resource_id}", headers=grantee["headers"])
    assert resp.status_code == 200
    assert resp.json()["id"] == resource_id

    # Grantee tries to update (should fail)
    resp = client.put(f"/{resource_type}/{resource_id}", json={
        "name": "Hacked Resource",
        "data": initial_data,
        "visibility": "private"
    }, headers=grantee["headers"])
    assert resp.status_code == 403

    # Share (Write)
    resp = client.patch(f"/{resource_type}/{resource_id}/share", json={
        "grantee_id": grantee["id"],
        "grantee_type": "user",
        "access_level": "write"
    }, headers=owner["headers"])
    assert resp.status_code == 200

    # Grantee tries to update (should succeed)
    resp = client.put(f"/{resource_type}/{resource_id}", json={
        "name": "Collab Resource",
        "data": initial_data,
        "visibility": "private"
    }, headers=grantee["headers"])
    assert resp.status_code == 200

    # Grantee tries to delete (should fail - need admin)
    resp = client.delete(f"/{resource_type}/{resource_id}", headers=grantee["headers"])
    assert resp.status_code == 403

    # Share (Admin)
    resp = client.patch(f"/{resource_type}/{resource_id}/share", json={
        "grantee_id": grantee["id"],
        "grantee_type": "user",
        "access_level": "admin"
    }, headers=owner["headers"])
    assert resp.status_code == 200

    # Grantee tries to delete (should succeed)
    resp = client.delete(f"/{resource_type}/{resource_id}", headers=grantee["headers"])
    assert resp.status_code == 204

    # Verify Gone for Owner too
    resp = client.get(f"/{resource_type}/{resource_id}", headers=owner["headers"])
    assert resp.status_code == 404

def test_session_jwt_sharing(client):
    owner = create_user(client, name="Session Owner")
    
    # Create session
    resp = client.post("/sessions", json={
        "name": "Role Test Session",
        "visibility": "public",
        "data": {"ships": []}
    }, headers=owner["headers"])
    
    assert resp.status_code == 200
    res_data = resp.json()
    session_id = res_data["id"]
    tokens = res_data["tokens"]
    
    assert "gm" in tokens
    assert "nav" in tokens
    assert "ro" in tokens
    
    # 1. Read with RO token (should succeed)
    resp = client.get(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {tokens['ro']}"})
    assert resp.status_code == 200
    
    # 2. Write/Update with RO token (should fail)
    resp = client.put(f"/sessions/{session_id}", json={
        "name": "Updated Role Test Session",
        "visibility": "public",
        "data": {"ships": [{"name": "Enterprise"}]}
    }, headers={"Authorization": f"Bearer {tokens['ro']}"})
    assert resp.status_code == 403
    
    # 3. Write/Update with NAV token (should succeed)
    resp = client.put(f"/sessions/{session_id}", json={
        "name": "Updated Role Test Session",
        "visibility": "public",
        "data": {"ships": [{"name": "Enterprise"}]}
    }, headers={"Authorization": f"Bearer {tokens['nav']}"})
    assert resp.status_code == 200
    
    # 4. Delete with NAV token (should fail)
    resp = client.delete(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {tokens['nav']}"})
    assert resp.status_code == 403
    
    # 5. Delete with GM token (should succeed)
    resp = client.delete(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {tokens['gm']}"})
    assert resp.status_code == 204
    
    # 6. Verify Deleted
    resp = client.get(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {tokens['ro']}"})
    assert resp.status_code == 404

