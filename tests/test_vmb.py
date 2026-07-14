import subprocess
import tempfile
import os
import json
import struct
import urllib.parse
import urllib.request
import pytest

# Python implementation of VMB format spec
def pack_tile(biome=0, elevation=0, moisture=0, faction=0, specialization=0, settlement=0, feature=0, subsurface=False):
    return ((biome & 0xF) << 24) | \
           ((elevation & 0x7) << 21) | \
           ((moisture & 0x7) << 18) | \
           ((faction & 0x3F) << 12) | \
           ((specialization & 0xF) << 8) | \
           ((settlement & 0x7) << 5) | \
           (feature & 0x1F) | \
           ((1 << 28) if subsurface else 0)

def unpack_tile(val):
    return {
        "biome": (val >> 24) & 0xF,
        "elevation": (val >> 21) & 0x7,
        "moisture": (val >> 18) & 0x7,
        "faction": (val >> 12) & 0x3F,
        "specialization": (val >> 8) & 0xF,
        "settlement": (val >> 5) & 0x7,
        "feature": val & 0x1F,
        "subsurface": bool(val & (1 << 28))
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
                specialization=tile.get("specialization", 0),
                settlement=tile.get("settlement", 0),
                feature=tile.get("feature", 0),
                subsurface=tile.get("subsurface", False)
            )
        body.extend(struct.pack('>I', val))
        
    return header + body + meta_bytes

def decode_vrgd(data):
    """Decode a VRGD (DGGS globe) binary payload.
    
    Format:
      Header (12 bytes): Magic "VRGD" (4 bytes), CellCount (u32), MetaLen (u32)
      Per cell (88 bytes fixed):
        center: 3×f32 (12 bytes)
        tile: u16 (2 bytes)
        sides: u8 (1 byte), pad: u8 (1 byte)
        polygon: 6 × 3×f32 = 72 bytes
      Trailer: JSON metadata
    """
    if len(data) < 12:
        raise ValueError("Invalid VRGD: Too short")
    
    magic = data[:4]
    if magic != b'VRGD':
        raise ValueError("Invalid VRGD: Bad magic")
    
    cell_count, = struct.unpack('>I', data[4:8])
    meta_len, = struct.unpack('>I', data[8:12])
    
    CELL_BLOCK = 88
    expected_len = 12 + cell_count * CELL_BLOCK + meta_len
    if len(data) < expected_len:
        raise ValueError(f"Invalid VRGD: Truncated (got {len(data)}, expected {expected_len})")
    
    cells = []
    for i in range(cell_count):
        off = 12 + i * CELL_BLOCK
        
        # Center position (3 × f32, big-endian)
        cx, cy, cz = struct.unpack('>fff', data[off:off+12])
        
        # Tile data (u16, big-endian)
        tile_val, = struct.unpack('>H', data[off+12:off+14])
        tile = unpack_tile(tile_val)
        
        # Sides count
        sides = data[off+14]
        
        # Polygon vertices (up to 6 × 3 × f32)
        vertices = []
        for vi in range(sides):
            voff = off + 16 + vi * 12
            vx, vy, vz = struct.unpack('>fff', data[voff:voff+12])
            vertices.append({"x": vx, "y": vy, "z": vz})
        
        cells.append({
            "center": {"x": cx, "y": cy, "z": cz},
            "tile": tile,
            "sides": sides,
            "vertices": vertices,
        })
    
    meta_start = 12 + cell_count * CELL_BLOCK
    meta_bytes = data[meta_start:meta_start + meta_len]
    meta_str = meta_bytes.decode('utf-8')
    try:
        metadata = json.loads(meta_str)
    except Exception:
        metadata = meta_str
    
    return {
        "format": "dggs",
        "cellCount": cell_count,
        "cells": cells,
        "metadata": metadata,
    }


def decode_vmb(data):
    """Auto-detect and decode a VMB binary payload (VRGM flat grid or VRGD DGGS globe)."""
    if len(data) < 12:
        raise ValueError("Invalid VMB: Too short")
    
    # Auto-detect format by magic bytes
    if data[0:3] == b'VRG':
        if data[3:4] == b'D':
            return decode_vrgd(data)
        elif data[3:4] == b'M':
            pass  # fall through to VRGM decode below
        else:
            raise ValueError("Invalid VMB: Unrecognized magic bytes")
    else:
        raise ValueError("Invalid VMB: Bad magic")
        
    magic, width, height, meta_len = struct.unpack('>4sHHI', data[:12])
        
    body_len = width * height * 4
    expected_len = 12 + body_len + meta_len
    if len(data) < expected_len:
        raise ValueError("Invalid VMB: Truncated")
        
    tiles = []
    for i in range(width * height):
        val, = struct.unpack('>I', data[12 + i*4 : 12 + i*4 + 4])
        tiles.append(unpack_tile(val))
        
    meta_bytes = data[12 + body_len : 12 + body_len + meta_len]
    meta_str = meta_bytes.decode('utf-8')
    try:
        metadata = json.loads(meta_str)
    except Exception:
        metadata = meta_str
        
    return {
        "format": "flat",
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
        {"biome": 1, "elevation": 2, "moisture": 3, "faction": 0, "specialization": 0, "settlement": 0, "feature": 5, "subsurface": False},
        {"biome": 15, "elevation": 7, "moisture": 7, "faction": 63, "specialization": 15, "settlement": 7, "feature": 31, "subsurface": True},
        {"biome": 5, "elevation": 0, "moisture": 1, "faction": 12, "specialization": 4, "settlement": 2, "feature": 0, "subsurface": False},
        {"biome": 0, "elevation": 0, "moisture": 0, "faction": 0, "specialization": 0, "settlement": 0, "feature": 0, "subsurface": False},
        {"biome": 8, "elevation": 4, "moisture": 4, "faction": 50, "specialization": 1, "settlement": 1, "feature": 10, "subsurface": True},
        {"biome": 10, "elevation": 5, "moisture": 2, "faction": 3, "specialization": 2, "settlement": 3, "feature": 2, "subsurface": False},
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
        {"biome": 1, "elevation": 2, "moisture": 3, "faction": 1, "specialization": 0, "settlement": 0, "feature": 4, "subsurface": False},
        {"biome": 5, "elevation": 6, "moisture": 7, "faction": 2, "specialization": 0, "settlement": 0, "feature": 8, "subsurface": True},
        {"biome": 9, "elevation": 0, "moisture": 1, "faction": 3, "specialization": 0, "settlement": 0, "feature": 12, "subsurface": False},
        {"biome": 13, "elevation": 4, "moisture": 5, "faction": 0, "specialization": 0, "settlement": 0, "feature": 15, "subsurface": True},
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
        {"biome": 14, "elevation": 5, "moisture": 6, "faction": 2, "specialization": 0, "settlement": 0, "feature": 1, "subsurface": False},
        {"biome": 3, "elevation": 1, "moisture": 2, "faction": 0, "specialization": 0, "settlement": 0, "feature": 11, "subsurface": True},
        {"biome": 11, "elevation": 7, "moisture": 4, "faction": 3, "specialization": 0, "settlement": 0, "feature": 5, "subsurface": False},
        {"biome": 6, "elevation": 3, "moisture": 0, "faction": 1, "specialization": 0, "settlement": 0, "feature": 9, "subsurface": True},
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
