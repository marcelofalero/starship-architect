import subprocess
import time
import socket
import httpx
import pytest
import os
from test_vmb import decode_vmb, decode_vrgd

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
        yield f"http://127.0.0.1:{port}"
        return

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


# ── DGGS Endpoint Tests ──

# Expected cell counts per resolution: 10 * 4^res + 2
EXPECTED_CELLS = {
    0: 12,
    1: 42,
    2: 162,
    3: 642,
    4: 2562,
    5: 10242,
}

def test_dggs_generation_default(run_worker):
    """Test DGGS endpoint with default params (resolution=4, type=terrestrial)."""
    base_url = run_worker
    
    resp = httpx.get(f"{base_url}/planet/earth-prime/dggs")
    assert resp.status_code == 200
    assert resp.headers.get("content-type") == "application/octet-stream"
    
    decoded = decode_vmb(resp.content)
    assert decoded["format"] == "dggs"
    assert decoded["cellCount"] == EXPECTED_CELLS[4]
    assert decoded["metadata"]["seed"] == "earth-prime"
    assert decoded["metadata"]["type"] == "terrestrial"
    assert decoded["metadata"]["resolution"] == 4
    assert decoded["metadata"]["cellCount"] == EXPECTED_CELLS[4]


def test_dggs_resolution_cell_counts(run_worker):
    """Verify cell counts for resolutions 3, 4, 5 match icosahedral formula."""
    base_url = run_worker
    
    for res in [3, 4, 5]:
        resp = httpx.get(f"{base_url}/planet/cell-count-{res}/dggs?resolution={res}")
        assert resp.status_code == 200
        decoded = decode_vrgd(resp.content)
        assert decoded["cellCount"] == EXPECTED_CELLS[res], \
            f"Resolution {res}: expected {EXPECTED_CELLS[res]} cells, got {decoded['cellCount']}"


def test_dggs_binary_format(run_worker):
    """Validate VRGD binary structure: magic bytes, cell blocks, vertex data."""
    base_url = run_worker
    
    resp = httpx.get(f"{base_url}/planet/format-check/dggs?resolution=3")
    assert resp.status_code == 200
    data = resp.content
    
    # Magic bytes
    assert data[0:4] == b'VRGD', "Magic bytes should be VRGD"
    
    decoded = decode_vrgd(data)
    
    # All cells should have 5 or 6 sides (pentagons and hexagons)
    pentagon_count = 0
    hexagon_count = 0
    for cell in decoded["cells"]:
        assert cell["sides"] in (5, 6), f"Cell has {cell['sides']} sides, expected 5 or 6"
        assert len(cell["vertices"]) == cell["sides"]
        if cell["sides"] == 5:
            pentagon_count += 1
        else:
            hexagon_count += 1
        
        # Center should be approximately on unit sphere
        c = cell["center"]
        length = (c["x"]**2 + c["y"]**2 + c["z"]**2) ** 0.5
        assert 0.95 < length < 1.05, f"Cell center not on unit sphere: length={length}"
        
        # Each vertex should also be approximately on unit sphere
        for v in cell["vertices"]:
            vlen = (v["x"]**2 + v["y"]**2 + v["z"]**2) ** 0.5
            assert 0.90 < vlen < 1.10, f"Vertex not on unit sphere: length={vlen}"
    
    # Goldberg polyhedron has exactly 12 pentagons
    assert pentagon_count == 12, f"Expected 12 pentagons, got {pentagon_count}"
    assert hexagon_count == decoded["cellCount"] - 12


def test_dggs_planet_types(run_worker):
    """Test that different planet types produce valid biome data."""
    base_url = run_worker
    
    planet_types = ["terrestrial", "desert", "ocean", "ice", "volcanic", "barren"]
    for ptype in planet_types:
        resp = httpx.get(f"{base_url}/planet/type-test/dggs?type={ptype}&resolution=3")
        assert resp.status_code == 200, f"Failed for planet type: {ptype}"
        decoded = decode_vrgd(resp.content)
        assert decoded["metadata"]["type"] == ptype
        assert decoded["cellCount"] == EXPECTED_CELLS[3]
        
        # Verify all tiles have valid field ranges
        for cell in decoded["cells"]:
            t = cell["tile"]
            assert 0 <= t["biome"] <= 15
            assert 0 <= t["elevation"] <= 7
            assert 0 <= t["moisture"] <= 7
            assert 0 <= t["faction"] <= 3
            assert 0 <= t["feature"] <= 15


def test_dggs_resolution_boundaries(run_worker):
    """Test that resolution 0 works and resolution 7+ is rejected."""
    base_url = run_worker
    
    # Resolution 0 should work (12 cells = base icosahedron vertices)
    resp = httpx.get(f"{base_url}/planet/res-zero/dggs?resolution=0")
    assert resp.status_code == 200
    decoded = decode_vrgd(resp.content)
    assert decoded["cellCount"] == EXPECTED_CELLS[0]
    
    # Resolution 7 should be rejected
    resp7 = httpx.get(f"{base_url}/planet/res-over/dggs?resolution=7")
    assert resp7.status_code == 400
    
    # Resolution 10 should also be rejected
    resp10 = httpx.get(f"{base_url}/planet/res-over/dggs?resolution=10")
    assert resp10.status_code == 400


def test_dggs_deterministic(run_worker):
    """Same seed + type + resolution should produce identical binary output."""
    base_url = run_worker
    
    url = f"{base_url}/planet/deterministic-test/dggs?type=volcanic&resolution=3"
    resp1 = httpx.get(url)
    resp2 = httpx.get(url)
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    
    # The binary content should be byte-for-byte identical (cached or regenerated)
    assert resp1.content == resp2.content, "DGGS output is not deterministic"


def test_dggs_adjacency_and_hierarchical_keys(run_worker):
    """Validate neighbor graph and hierarchical cell addresses in DGGS metadata."""
    import re
    base_url = run_worker
    
    # Check at resolution 3
    resp = httpx.get(f"{base_url}/planet/test-dggs-graph/dggs?resolution=3")
    assert resp.status_code == 200
    decoded = decode_vrgd(resp.content)
    
    metadata = decoded["metadata"]
    assert "neighbors" in metadata, "Adjacency graph not found in metadata"
    assert "addresses" in metadata, "Hierarchical addresses not found in metadata"
    
    neighbors = metadata["neighbors"]
    addresses = metadata["addresses"]
    
    cell_count = decoded["cellCount"]
    assert len(neighbors) == cell_count, "Neighbors count mismatch"
    assert len(addresses) == cell_count, "Addresses count mismatch"
    
    # 1. Validate Adjacency Graph invariants
    pentagon_count = 0
    hexagon_count = 0
    
    for i, n_list in enumerate(neighbors):
        # Every neighbor list should be sorted and unique
        assert n_list == sorted(list(set(n_list))), f"Cell {i} neighbors not sorted or unique"
        
        # Verify neighbor symmetry: if j is in neighbors[i], i must be in neighbors[j]
        for neighbor in n_list:
            assert neighbor < cell_count, f"Cell {i} has invalid neighbor index {neighbor}"
            assert i in neighbors[neighbor], f"Adjacency is asymmetric between {i} and {neighbor}"
            
        # Pentagons (12) must have exactly 5 neighbors, Hexagons must have exactly 6
        n_count = len(n_list)
        assert n_count in (5, 6), f"Cell {i} has {n_count} neighbors, expected 5 or 6"
        if n_count == 5:
            pentagon_count += 1
        else:
            hexagon_count += 1
            
    assert pentagon_count == 12, f"Expected 12 pentagons in neighbor graph, got {pentagon_count}"
    assert hexagon_count == cell_count - 12
    
    # 2. Validate Hierarchical Addressing invariants
    address_set = set()
    addr_pattern = re.compile(r"^\d+-\d*-[0-2]$")
    
    for i, addr in enumerate(addresses):
        assert isinstance(addr, str), f"Address at {i} is not a string"
        assert addr_pattern.match(addr), f"Address '{addr}' at {i} does not match expected format"
        
        # Uniqueness
        assert addr not in address_set, f"Address '{addr}' is duplicate"
        address_set.add(addr)


def test_dggs_persistence_and_caching(run_worker):
    base_url = run_worker
    seed = "dggs-persist-test"
    
    # Ensure the DGGS map is generated
    resp = httpx.get(f"{base_url}/planet/{seed}/dggs?type=terrestrial&resolution=3")
    assert resp.status_code == 200
    initial_decoded = decode_vrgd(resp.content)
    assert initial_decoded["metadata"]["type"] == "terrestrial"
    
    # POST edit JSON to update metadata
    edit_payload = {
        "notes": "Custom GM notes for this DGGS map.",
        "revealedFeatures": [2, 4, 7],
        "gmEditCount": 2
    }
    post_resp = httpx.post(f"{base_url}/planet/{seed}/dggs?type=terrestrial&resolution=3", json=edit_payload)
    assert post_resp.status_code == 200
    
    # GET again to verify persistent edits
    resp_after = httpx.get(f"{base_url}/planet/{seed}/dggs?type=terrestrial&resolution=3")
    assert resp_after.status_code == 200
    decoded_after = decode_vrgd(resp_after.content)
    
    assert decoded_after["metadata"]["notes"] == "Custom GM notes for this DGGS map."
    assert decoded_after["metadata"]["revealedFeatures"] == [2, 4, 7]
    assert decoded_after["metadata"]["gmEditCount"] == 2

