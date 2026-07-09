import subprocess
import tempfile
import os
import json
import struct
import urllib.parse
import urllib.request
import pytest

# Python implementation of VMB format spec
def pack_tile(biome=0, elevation=0, moisture=0, faction=0, feature=0):
    return ((biome & 0xF) << 12) | \
           ((elevation & 0x7) << 9) | \
           ((moisture & 0x7) << 6) | \
           ((faction & 0x3) << 4) | \
           (feature & 0xF)

def unpack_tile(val):
    return {
        "biome": (val >> 12) & 0xF,
        "elevation": (val >> 9) & 0x7,
        "moisture": (val >> 6) & 0x7,
        "faction": (val >> 4) & 0x3,
        "feature": val & 0xF
    }

def encode_vmb(width, height, tiles, metadata=None):
    if metadata is None:
        metadata = {}
    meta_str = json.dumps(metadata) if not isinstance(metadata, str) else metadata
    meta_bytes = meta_str.encode('utf-8')
    meta_len = len(meta_bytes)
    
    header = struct.pack('>4sHHI', b'VRGM', width, height, meta_len)
    
    body = bytearray()
    for tile in tiles:
        if isinstance(tile, int):
            val = tile
        else:
            val = pack_tile(
                biome=tile.get("biome", 0),
                elevation=tile.get("elevation", 0),
                moisture=tile.get("moisture", 0),
                faction=tile.get("faction", 0),
                feature=tile.get("feature", 0)
            )
        body.extend(struct.pack('>H', val))
        
    return header + body + meta_bytes

def decode_vmb(data):
    if len(data) < 12:
        raise ValueError("Invalid VMB: Too short")
        
    magic, width, height, meta_len = struct.unpack('>4sHHI', data[:12])
    if magic != b'VRGM':
        raise ValueError("Invalid VMB: Bad magic")
        
    body_len = width * height * 2
    expected_len = 12 + body_len + meta_len
    if len(data) < expected_len:
        raise ValueError("Invalid VMB: Truncated")
        
    tiles = []
    for i in range(width * height):
        val, = struct.unpack('>H', data[12 + i*2 : 12 + i*2 + 2])
        tiles.append(unpack_tile(val))
        
    meta_bytes = data[12 + body_len : 12 + body_len + meta_len]
    meta_str = meta_bytes.decode('utf-8')
    try:
        metadata = json.loads(meta_str)
    except Exception:
        metadata = meta_str
        
    return {
        "width": width,
        "height": height,
        "tiles": tiles,
        "metadata": metadata
    }

# Resolve the absolute path and file URL of vmb.js dynamically
def get_vmb_js_url():
    vmb_abs_path = os.path.abspath(
        "/public/vergemap/js/vmb.js" if os.path.exists("/public/vergemap/js/vmb.js")
        else os.path.join(os.path.dirname(__file__), "../public/vergemap/js/vmb.js")
    )
    return urllib.parse.urljoin('file:', urllib.request.pathname2url(vmb_abs_path))

def test_python_roundtrip():
    width = 3
    height = 2
    tiles = [
        {"biome": 1, "elevation": 2, "moisture": 3, "faction": 0, "feature": 5},
        {"biome": 15, "elevation": 7, "moisture": 7, "faction": 3, "feature": 15},
        {"biome": 0, "elevation": 0, "moisture": 0, "faction": 0, "feature": 0},
        {"biome": 8, "elevation": 4, "moisture": 2, "faction": 1, "feature": 10},
        {"biome": 4, "elevation": 1, "moisture": 5, "faction": 2, "feature": 12},
        {"biome": 10, "elevation": 6, "moisture": 0, "faction": 3, "feature": 1},
    ]
    metadata = {"map_name": "Valhalla", "danger_level": "High"}
    
    binary = encode_vmb(width, height, tiles, metadata)
    decoded = decode_vmb(binary)
    
    assert decoded["width"] == width
    assert decoded["height"] == height
    assert decoded["tiles"] == tiles
    assert decoded["metadata"] == metadata

def test_js_test_suite():
    # Execute the JS test suite and ensure it exits with code 0
    js_test_path = os.path.join(os.path.dirname(__file__), "test_vmb.mjs")
    res = subprocess.run(["node", js_test_path], capture_output=True, text=True)
    assert res.returncode == 0, f"JS test suite failed: {res.stderr}\nOutput: {res.stdout}"

def test_cross_language_decode():
    # Encode in Python, decode in Node.js
    width = 2
    height = 2
    tiles = [
        {"biome": 1, "elevation": 2, "moisture": 3, "faction": 1, "feature": 4},
        {"biome": 5, "elevation": 6, "moisture": 7, "faction": 2, "feature": 8},
        {"biome": 9, "elevation": 0, "moisture": 1, "faction": 3, "feature": 12},
        {"biome": 13, "elevation": 4, "moisture": 5, "faction": 0, "feature": 15},
    ]
    metadata = {"source": "python"}
    
    binary = encode_vmb(width, height, tiles, metadata)
    
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(binary)
        temp_name = f.name
        
    try:
        vmb_url = get_vmb_js_url()
        # Run a small Node script to decode it and print JSON
        js_code = f"""
        import {{ decodeVMB }} from "{vmb_url}";
        import * as fs from "fs";
        const buffer = fs.readFileSync("{temp_name}");
        const decoded = decodeVMB(buffer);
        console.log(JSON.stringify(decoded));
        """
        
        with tempfile.NamedTemporaryFile(suffix=".mjs", delete=False, mode="w") as js_file:
            js_file.write(js_code)
            js_temp_name = js_file.name
            
        try:
            res = subprocess.run(["node", js_temp_name], capture_output=True, text=True)
            assert res.returncode == 0, f"Node decoding failed: {res.stderr}"
            decoded_js = json.loads(res.stdout)
            
            assert decoded_js["width"] == width
            assert decoded_js["height"] == height
            assert decoded_js["tiles"] == tiles
            assert decoded_js["metadata"] == metadata
        finally:
            if os.path.exists(js_temp_name):
                os.remove(js_temp_name)
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)

def test_cross_language_encode():
    # Encode in Node.js, decode in Python
    width = 2
    height = 2
    tiles = [
        {"biome": 14, "elevation": 5, "moisture": 6, "faction": 2, "feature": 1},
        {"biome": 3, "elevation": 1, "moisture": 2, "faction": 0, "feature": 11},
        {"biome": 11, "elevation": 7, "moisture": 4, "faction": 3, "feature": 5},
        {"biome": 6, "elevation": 3, "moisture": 0, "faction": 1, "feature": 9},
    ]
    metadata = {"source": "js"}
    
    with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as f:
        temp_name = f.name
        
    try:
        vmb_url = get_vmb_js_url()
        js_code = f"""
        import {{ encodeVMB }} from "{vmb_url}";
        import * as fs from "fs";
        const tiles = {json.dumps(tiles)};
        const metadata = {json.dumps(metadata)};
        const binary = encodeVMB({width}, {height}, tiles, metadata);
        fs.writeFileSync("{temp_name}", binary);
        """
        
        with tempfile.NamedTemporaryFile(suffix=".mjs", delete=False, mode="w") as js_file:
            js_file.write(js_code)
            js_temp_name = js_file.name
            
        try:
            res = subprocess.run(["node", js_temp_name], capture_output=True, text=True)
            assert res.returncode == 0, f"Node encoding failed: {res.stderr}"
            
            with open(temp_name, "rb") as f:
                binary = f.read()
                
            decoded = decode_vmb(binary)
            assert decoded["width"] == width
            assert decoded["height"] == height
            assert decoded["tiles"] == tiles
            assert decoded["metadata"] == metadata
        finally:
            if os.path.exists(js_temp_name):
                os.remove(js_temp_name)
    finally:
        if os.path.exists(temp_name):
            os.remove(temp_name)
