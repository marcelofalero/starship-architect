import subprocess
import time
import socket
import httpx
import pytest
import os
from test_vmb import decode_vmb

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

@pytest.fixture(scope="session", autouse=True)
def run_worker():
    # 1. Use environment variable if provided
    env_url = os.environ.get("HEXMAP_URL")
    if env_url:
        # Give wrangler container a brief moment to boot/compile
        time.sleep(2)
        yield env_url
        return

    # 2. Use localhost if port 8788 is already open
    port = 8788
    if is_port_open(port):
        return f"http://127.0.0.1:{port}"

    # 3. Otherwise fall back to launching wrangler dev locally
    proc = subprocess.Popen(
        ["npx", "wrangler", "dev", "--port", str(port), "--ip", "127.0.0.1"],
        cwd="/app/hexmap-worker" if os.path.exists("/app/hexmap-worker") else "hexmap-worker",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for wrangler dev to start
    start_time = time.time()
    opened = False
    while time.time() - start_time < 30:
        if is_port_open(port):
            opened = True
            break
        time.sleep(0.5)
        
    if not opened:
        proc.terminate()
        stdout, stderr = proc.communicate(timeout=1)
        raise RuntimeError(f"Wrangler dev failed to start on port {port}. stdout: {stdout.decode()}, stderr: {stderr.decode()}")
        
    yield f"http://127.0.0.1:{port}"
    
    proc.terminate()
    proc.wait()

def test_worker_generation(run_worker):
    base_url = run_worker
    
    # Test 1: GET map with default params
    resp = httpx.get(f"{base_url}/planet/alpha-centauri/map")
    assert resp.status_code == 200
    assert resp.headers.get("content-type") == "application/octet-stream"
    
    binary_data = resp.content
    decoded = decode_vmb(binary_data)
    
    assert decoded["width"] == 21  # 2 * 10 + 1
    assert decoded["height"] == 21
    assert decoded["metadata"]["seed"] == "alpha-centauri"
    assert decoded["metadata"]["type"] == "terrestrial"
    assert decoded["metadata"]["radius"] == 10
    
    # Test 2: GET map with custom params
    resp2 = httpx.get(f"{base_url}/planet/vulcan/map?type=volcanic&radius=5")
    assert resp2.status_code == 200
    decoded2 = decode_vmb(resp2.content)
    assert decoded2["width"] == 11  # 2 * 5 + 1
    assert decoded2["height"] == 11
    assert decoded2["metadata"]["seed"] == "vulcan"
    assert decoded2["metadata"]["type"] == "volcanic"
    assert decoded2["metadata"]["radius"] == 5

def test_worker_persistence_and_caching(run_worker):
    base_url = run_worker
    seed = "mercury"
    
    # Ensure the map is generated first
    resp = httpx.get(f"{base_url}/planet/{seed}/map?type=barren&radius=4")
    assert resp.status_code == 200
    initial_decoded = decode_vmb(resp.content)
    assert initial_decoded["metadata"]["type"] == "barren"
    
    # POST edit JSON to merge/update the metadata trailer
    edit_payload = {
        "notes": "Deep cave systems explored by mining bots.",
        "revealedFeatures": [3, 8],
        "gmEditCount": 1
    }
    post_resp = httpx.post(f"{base_url}/planet/{seed}/map", json=edit_payload)
    assert post_resp.status_code == 200
    
    # Decode the response and check updated metadata trailer
    post_decoded = decode_vmb(post_resp.content)
    assert post_decoded["metadata"]["notes"] == "Deep cave systems explored by mining bots."
    assert post_decoded["metadata"]["revealedFeatures"] == [3, 8]
    assert post_decoded["metadata"]["gmEditCount"] == 1
    assert "updatedAt" in post_decoded["metadata"]
    
    # Verify that future GET retrieves the updated map from the cache
    get_updated = httpx.get(f"{base_url}/planet/{seed}/map")
    assert get_updated.status_code == 200
    get_decoded = decode_vmb(get_updated.content)
    assert get_decoded["metadata"]["notes"] == "Deep cave systems explored by mining bots."
    assert get_decoded["metadata"]["revealedFeatures"] == [3, 8]
    
def test_worker_invalid_requests(run_worker):
    base_url = run_worker
    
    # Invalid radius
    resp = httpx.get(f"{base_url}/planet/test/map?radius=-3")
    assert resp.status_code == 400
    
    # Not found route
    resp2 = httpx.get(f"{base_url}/planet/test/invalid")
    assert resp2.status_code == 404
