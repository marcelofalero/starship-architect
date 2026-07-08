import pytest
import httpx
import uuid
import os

BASE_URL = os.environ.get("BASE_URL", "http://backend:8787")

@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        yield client

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

def test_session_lifecycle_and_jwt_sharing(client):
    # 1. Create session (no authentication headers needed to create)
    resp = client.post("/sessions", json={
        "name": "Integration Test Session",
        "visibility": "public",
        "data": {
            "ships": [{"name": "Enterprise", "x": 0, "y": 0, "z": 0}]
        }
    })
    assert resp.status_code == 200
    res_data = resp.json()
    session_id = res_data["id"]
    tokens = res_data["tokens"]
    
    assert "gm" in tokens
    assert "player" in tokens
    assert "viewer" in tokens
    
    # 2. Read with RO (viewer) token (should succeed)
    resp = client.get(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {tokens['viewer']}"})
    assert resp.status_code == 200
    
    # 3. Read with player (nav) token (should succeed)
    resp = client.get(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {tokens['player']}"})
    assert resp.status_code == 200
    
    # 4. Write/Update with RO (viewer) token (should fail / unauthorized)
    resp = client.put(f"/sessions/{session_id}", json={
        "name": "Updated Test Session",
        "data": {"ships": [{"name": "Defiant"}]}
    }, headers={"Authorization": f"Bearer {tokens['viewer']}"})
    assert resp.status_code == 401
    
    # 5. Write/Update with NAV (player) token (should fail / unauthorized)
    resp = client.put(f"/sessions/{session_id}", json={
        "name": "Updated Test Session",
        "data": {"ships": [{"name": "Defiant"}]}
    }, headers={"Authorization": f"Bearer {tokens['player']}"})
    assert resp.status_code == 401
    
    # 6. Write/Update with GM token (should succeed)
    resp = client.put(f"/sessions/{session_id}", json={
        "name": "Updated Test Session",
        "data": {"ships": [{"name": "Enterprise-D"}]}
    }, headers={"Authorization": f"Bearer {tokens['gm']}"})
    assert resp.status_code == 200
    assert resp.json() == {"success": True}
    
    # 7. Verify updates are saved and readable
    resp = client.get(f"/sessions/{session_id}", headers={"Authorization": f"Bearer {tokens['viewer']}"})
    assert resp.status_code == 200
    assert resp.json()["data"]["ships"][0]["name"] == "Enterprise-D"
