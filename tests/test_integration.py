import pytest
import httpx
import uuid

BASE_URL = "http://backend:8787"

@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL) as client:
        yield client

def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

def test_auth_flow_and_ships(client):
    # 1. Register
    email = f"test_{uuid.uuid4()}@example.com"
    password = "secretpassword"
    name = "Test User"

    resp = client.post("/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    assert resp.status_code == 200
    assert "user_id" in resp.json()

    # 2. Login
    resp = client.post("/auth/login", json={
        "email": email,
        "password": password
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]

    # 3. Create Ship
    headers = {"Authorization": f"Bearer {token}"}
    ship_data = {"hull": "fighter", "speed": 100}
    resp = client.post("/ships", json={
        "name": "X-Wing",
        "data": ship_data,
        "visibility": "private"
    }, headers=headers)

    assert resp.status_code == 200
    ship = resp.json()
    assert ship["name"] == "X-Wing"
    ship_id = ship["id"]

    # 4. List Ships
    resp = client.get("/ships", headers=headers)
    assert resp.status_code == 200
    ships = resp.json()
    assert len(ships) >= 1
    found = False
    for s in ships:
        if s["id"] == ship_id:
            found = True
            break
    assert found
