import { encodeVMB, decodeVMB, packTile, unpackTile } from "../public/vergemap/js/vmb.js";
import assert from "assert";

console.log("Starting JS VMB tests...");

// Test 1: packTile and unpackTile round-trip
{
    const original = { biome: 12, elevation: 5, moisture: 3, faction: 2, specialization: 0, settlement: 0, feature: 11, subsurface: true };
    const packed = packTile(original);
    const unpacked = unpackTile(packed);
    assert.deepStrictEqual(unpacked, original, "Tile packing round-trip failed");
    console.log("  ✓ Test 1: packTile/unpackTile round-trip passed");
}

// Test 2: packTile boundary values
{
    const maxValues = { biome: 15, elevation: 7, moisture: 7, faction: 63, specialization: 15, settlement: 7, feature: 31, subsurface: true };
    const packedMax = packTile(maxValues);
    const unpackedMax = unpackTile(packedMax);
    assert.deepStrictEqual(unpackedMax, maxValues, "Boundary values packing failed");
    
    // Ensure bit mask works (values above limit should be truncated/masked)
    const overflowValues = { biome: 16, elevation: 8, moisture: 8, faction: 64, specialization: 16, settlement: 8, feature: 32, subsurface: false };
    const packedOverflow = packTile(overflowValues);
    const unpackedOverflow = unpackTile(packedOverflow);
    assert.deepStrictEqual(unpackedOverflow, { biome: 0, elevation: 0, moisture: 0, faction: 0, specialization: 0, settlement: 0, feature: 0, subsurface: false }, "Overflow masking failed");
    console.log("  ✓ Test 2: Boundary values & overflow masking passed");
}

// Test 3: encodeVMB and decodeVMB round-trip (with object tiles)
{
    const width = 4;
    const height = 3;
    const tiles = [];
    for (let i = 0; i < width * height; i++) {
        tiles.push({
            biome: i % 16,
            elevation: i % 8,
            moisture: i % 8,
            faction: i % 64,
            specialization: i % 16,
            settlement: i % 8,
            feature: i % 32,
            subsurface: (i % 2) === 0
        });
    }
    const metadata = { name: "Aegis Prime", notes: "Volcanic activity detected", temp: [12.5, 45.0] };
    
    const binary = encodeVMB(width, height, tiles, metadata);
    const decoded = decodeVMB(binary);
    
    assert.strictEqual(decoded.width, width, "Width mismatch");
    assert.strictEqual(decoded.height, height, "Height mismatch");
    assert.deepStrictEqual(decoded.tiles, tiles, "Tiles data mismatch");
    assert.deepStrictEqual(decoded.metadata, metadata, "Metadata mismatch");
    console.log("  ✓ Test 3: Standard VMB round-trip passed");
}

// Test 4: encodeVMB with raw numbers
{
    const width = 2;
    const height = 2;
    const tiles = [0x1234, 0x5678, 0x9ABC, 0xDEF0];
    const metadata = "plain text metadata";
    
    const binary = encodeVMB(width, height, tiles, metadata);
    const decoded = decodeVMB(binary);
    
    const expectedTiles = tiles.map(unpackTile);
    assert.deepStrictEqual(decoded.tiles, expectedTiles, "Raw number tiles decode mismatch");
    assert.strictEqual(decoded.metadata, metadata, "String metadata mismatch");
    console.log("  ✓ Test 4: Raw number tiles and string metadata passed");
}

// Test 5: Error handling
{
    // Too short header
    assert.throws(() => decodeVMB(new Uint8Array([1, 2, 3])), /Too short to contain header/);
    
    // Invalid Magic
    const badMagic = new Uint8Array(12);
    badMagic.set([0x41, 0x42, 0x43, 0x44]); // ABCD instead of VRGM
    assert.throws(() => decodeVMB(badMagic), /Incorrect magic bytes/);
    
    // Truncated body
    const truncated = encodeVMB(3, 3, new Array(9).fill(0), { test: true });
    assert.throws(() => decodeVMB(truncated.slice(0, 20)), /File size.*is smaller than expected/);
    
    console.log("  ✓ Test 5: Error handling and verification passed");
}

console.log("All JS VMB tests passed successfully!");
