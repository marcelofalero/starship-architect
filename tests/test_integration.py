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

def register_and_login(client):
    email = f"test_{uuid.uuid4()}@example.com"
    password = "secretpassword"
    name = "Test User"

    # Register
    resp = client.post("/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    assert resp.status_code == 200
    assert "user_id" in resp.json()

    # Login
    resp = client.post("/auth/login", json={
        "email": email,
        "password": password
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data

    return {"Authorization": f"Bearer {data['access_token']}"}

def test_ships(client):
    headers = register_and_login(client)

    # Create Ship with valid data (configuration object and manifest array)
    ship_data = {
        "configuration": {"hull": "fighter", "speed": 100},
        "manifest": []
    }
    resp = client.post("/ships", json={
        "name": "X-Wing",
        "data": ship_data,
        "visibility": "private"
    }, headers=headers)

    assert resp.status_code == 200, f"Failed to create ship: {resp.text}"
    ship = resp.json()
    assert ship["name"] == "X-Wing"
    ship_id = ship["id"]

    # List Ships
    resp = client.get("/ships", headers=headers)
    assert resp.status_code == 200
    ships = resp.json()

    found = False
    for s in ships:
        if s["id"] == ship_id:
            found = True
            break
    assert found, "Created ship not found in list"

def test_libraries(client):
    headers = register_and_login(client)

    # Create Library with valid data
    library_data = {
        "components": [],
        "ships": []
    }
    resp = client.post("/libraries", json={
        "name": "My Library",
        "data": library_data,
        "visibility": "private"
    }, headers=headers)

    assert resp.status_code == 200, f"Failed to create library: {resp.text}"
    library = resp.json()
    assert library["name"] == "My Library"
    library_id = library["id"]

    # List Libraries
    resp = client.get("/libraries", headers=headers)
    assert resp.status_code == 200
    libraries = resp.json()

    found = False
    for l in libraries:
        if l["id"] == library_id:
            found = True
            break
    assert found, "Created library not found in list"

def test_hangars(client):
    headers = register_and_login(client)

    # Create Hangar with valid data (must have ships array)
    hangar_data = {
        "ships": []
    }
    resp = client.post("/hangars", json={
        "name": "My Hangar",
        "data": hangar_data,
        "visibility": "private"
    }, headers=headers)

    assert resp.status_code == 200, f"Failed to create hangar: {resp.text}"
    hangar = resp.json()
    assert hangar["name"] == "My Hangar"
    hangar_id = hangar["id"]

    # List Hangars
    resp = client.get("/hangars", headers=headers)
    assert resp.status_code == 200
    hangars = resp.json()

    found = False
    for h in hangars:
        if h["id"] == hangar_id:
            found = True
            break
    assert found, "Created hangar not found in list"

def test_configurations(client):
    headers = register_and_login(client)

    # Create Configuration
    config_data = {
        "setting": "value"
    }
    resp = client.post("/configurations", json={
        "name": "My Config",
        "data": config_data,
        "visibility": "private"
    }, headers=headers)

    assert resp.status_code == 200, f"Failed to create configuration: {resp.text}"
    config = resp.json()
    assert config["name"] == "My Config"
    config_id = config["id"]

    # List Configurations
    resp = client.get("/configurations", headers=headers)
    assert resp.status_code == 200
    configs = resp.json()

    found = False
    for c in configs:
        if c["id"] == config_id:
            found = True
            break
    assert found, "Created configuration not found in list"
