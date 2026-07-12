import http from 'http';
import { decodeVMB } from './vmb.js';

// The exact generateRivers logic
function analyzeRivers(dggsData) {
    const LCG_MULTIPLIER = 1664525;
    const LCG_INCREMENT = 1013904223;
    const LCG_MODULUS = Math.pow(2, 32);

    const seedStr = dggsData.metadata?.seed || "Sol_III";
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
        seed = (seed * 31 + seedStr.charCodeAt(i)) % LCG_MODULUS;
    }
    
    function random() {
        seed = (LCG_MULTIPLIER * seed + LCG_INCREMENT) % LCG_MODULUS;
        return seed / LCG_MODULUS;
    }

    const distToOcean = new Int32Array(dggsData.cells.length).fill(999999);
    let currentQueue = [];
    const inQueue = new Uint8Array(dggsData.cells.length).fill(0);
    
    for (let i = 0; i < dggsData.cells.length; i++) {
        const t = dggsData.cells[i].tile;
        if (t.biome === 0 || t.biome === 1) {
            distToOcean[i] = 0;
            currentQueue.push(i);
            inQueue[i] = 1;
        }
    }
    
    const maxLocalSinks = Math.floor(dggsData.cells.length * 0.02);
    let sinksFound = 0;
    for (let i = 0; i < dggsData.cells.length && sinksFound < maxLocalSinks; i++) {
        const t = dggsData.cells[i].tile;
        if (t.biome !== 0 && t.biome !== 1 && t.elevation <= 2) {
            const currElev = t.elevation;
            let isMin = true;
            for (const n of dggsData.metadata.neighbors[i]) {
                if (dggsData.cells[n].tile.elevation < currElev) {
                    isMin = false;
                    break;
                }
            }
            if (isMin) {
                distToOcean[i] = 0;
                currentQueue.push(i);
                inQueue[i] = 1;
                sinksFound++;
            }
        }
    }

    let iterations = 0;
    while (currentQueue.length > 0 && iterations < 100) {
        iterations++;
        const nextQueue = [];
        for (const curr of currentQueue) {
            inQueue[curr] = 0;
            const currElev = dggsData.cells[curr].tile.elevation;
            for (const n of dggsData.metadata.neighbors[curr]) {
                const nElev = dggsData.cells[n].tile.elevation;
                let cost = 1;
                if (nElev === currElev) cost = 6;
                else if (nElev < currElev) cost = 45; 
                
                const newDist = distToOcean[curr] + cost;
                if (newDist < distToOcean[n]) {
                    distToOcean[n] = newDist;
                    if (!inQueue[n]) {
                        nextQueue.push(n);
                        inQueue[n] = 1;
                    }
                }
            }
        }
        currentQueue = nextQueue;
    }

    let candidates = [];
    for (let i = 0; i < dggsData.cells.length; i++) {
        const t = dggsData.cells[i].tile;
        if (t.biome !== 0 && t.biome !== 1 && t.moisture >= 1 && distToOcean[i] > 2) {
            candidates.push(i);
        }
    }
    
    candidates.sort((a, b) => distToOcean[b] - distToOcean[a]);
    const poolSize = Math.max(50, Math.floor(candidates.length * 0.3));
    candidates = candidates.slice(0, poolSize);
    
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    const numSources = Math.max(30, Math.floor(dggsData.cells.length / 30));
    const sources = candidates.slice(0, numSources);
    
    console.log(`[River Test] Candidates found: ${candidates.length}. Selected ${numSources} sources for tracing.`);

    const flowTo = new Int32Array(dggsData.cells.length).fill(-1);
    const water = new Float32Array(dggsData.cells.length).fill(0);

    for (const source of sources) {
        let curr = source;
        const visited = new Set([curr]);
        while (distToOcean[curr] > 0) {
            if (flowTo[curr] !== -1) break; 
            
            let bestNext = -1;
            let shortestDist = distToOcean[curr];
            let fallbackNext = -1;
            let fallbackDist = 999999;
            
            for (const n of dggsData.metadata.neighbors[curr]) {
                if (distToOcean[n] < shortestDist) {
                    shortestDist = distToOcean[n];
                    bestNext = n;
                } else if (distToOcean[n] === shortestDist && distToOcean[n] < fallbackDist && !visited.has(n)) {
                    fallbackDist = distToOcean[n];
                    fallbackNext = n;
                }
            }
            
            if (bestNext === -1) bestNext = fallbackNext;
            if (bestNext === -1 || visited.has(bestNext)) break;
            
            flowTo[curr] = bestNext;
            curr = bestNext;
            visited.add(curr);
        }
    }
    
    const activeCells = [];
    for (let i = 0; i < dggsData.cells.length; i++) {
        if (flowTo[i] !== -1) {
            activeCells.push(i);
            water[i] = dggsData.cells[i].tile.moisture / 10.0;
        }
    }
    
    activeCells.sort((a, b) => distToOcean[b] - distToOcean[a]);
    
    for (const curr of activeCells) {
        const next = flowTo[curr];
        if (next !== -1) {
            water[next] += water[curr] + (dggsData.cells[curr].tile.moisture / 10.0);
        }
    }
    
    const inDegree = new Int32Array(dggsData.cells.length).fill(0);
    for (let i = 0; i < dggsData.cells.length; i++) {
        if (flowTo[i] !== -1) inDegree[flowTo[i]]++;
    }
    
    const branches = [];
    const drawn = new Uint8Array(dggsData.cells.length).fill(0);
    
    for (let i = 0; i < dggsData.cells.length; i++) {
        if (flowTo[i] !== -1 && inDegree[i] === 0) {
            const branch = [];
            let curr = i;
            while (curr !== -1 && !drawn[curr]) {
                const isOcean = dggsData.cells[curr].tile.biome === 0 || dggsData.cells[curr].tile.biome === 1;
                branch.push(curr);
                drawn[curr] = 1;
                if (isOcean) break;
                curr = flowTo[curr];
            }
            
            if (curr !== -1 && drawn[curr]) {
                branch.push(curr); // Add merge point
            }
            
            if (branch.length > 0) {
                const finalNode = branch[branch.length - 1];
                const isOcean = dggsData.cells[finalNode].tile.biome === 0 || dggsData.cells[finalNode].tile.biome === 1;
                if (isOcean && branch.length < 4) {
                    continue; 
                }
                if (branch.length > 1) {
                    branches.push(branch);
                }
            }
        }
    }
    
    let singleHex = 0;
    let totalLen = 0;
    for (const b of branches) {
        if (b.length === 2) singleHex++;
        totalLen += b.length;
    }
    const avgLen = branches.length > 0 ? (totalLen / branches.length).toFixed(1) : 0;
    console.log(`[River Test] Extracted ${branches.length} continuous branches.`);
    console.log(`[River Test] Average length: ${avgLen} nodes. Tributaries (1-hex): ${singleHex}.`);
    
    // Log the first few branches for detailed inspection
    for(let i=0; i<Math.min(5, branches.length); i++) {
        console.log(`Branch ${i} length: ${branches[i].length} | Path:`, branches[i].join(' -> '));
    }
}

// Fetch a map from the local worker
const url = 'http://127.0.0.1:8788/planet/Sol_III/dggs?resolution=4';
http.get(url, (res) => {
    let chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        // Node Buffers often share underlying ArrayBuffers. We must extract just our slice.
        const arrayBuffer = fullBuffer.buffer.slice(fullBuffer.byteOffset, fullBuffer.byteOffset + fullBuffer.byteLength);
        console.log(`[River Test] Downloaded VMB: ${arrayBuffer.byteLength} bytes.`);
        const dggsData = decodeVMB(arrayBuffer);
        console.log(`[River Test] Decoded map with ${dggsData.cells.length} cells.`);
        analyzeRivers(dggsData);
    });
}).on('error', err => {
    console.error("Error fetching map:", err);
});
