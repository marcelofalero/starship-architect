const fs = require('fs');
let code = fs.readFileSync('public/hexmap/js/app.js', 'utf8');

const target = `function generateRivers() {
    if (!dggsData || !dggsData.metadata) return false;
    if (dggsData.metadata.rivers && dggsData.metadata.rivers.length > 0) return false; 
    
    const rivers = [];
    const numRivers = Math.floor(dggsData.cells.length / 300); 
    
    // Create flow network
    const flowTo = new Int32Array(dggsData.cells.length).fill(-1);
    const water = new Float32Array(dggsData.cells.length).fill(0);
    
    // Sort land cells by elevation descending
    const landCells = [];
    for (let i = 0; i < dggsData.cells.length; i++) {
        const t = dggsData.cells[i].tile;
        if (t.biome !== 0 && t.biome !== 1 && t.biome !== 9) { // Not ocean, not ice
            landCells.push(i);
            water[i] = t.moisture / 7.0; // Base water from moisture
        }
    }
    
    landCells.sort((a, b) => dggsData.cells[b].tile.elevation - dggsData.cells[a].tile.elevation);
    
    for (const curr of landCells) {
        const neighbors = dggsData.metadata.neighbors[curr];
        if (!neighbors) continue;
        
        let bestNext = -1;
        let lowestElevation = dggsData.cells[curr].tile.elevation;
        
        for (const nIdx of neighbors) {
            const nElev = dggsData.cells[nIdx].tile.elevation;
            if (nElev < lowestElevation) {
                lowestElevation = nElev;
                bestNext = nIdx;
            } else if (nElev === lowestElevation && nIdx < curr) {
                // Break ties deterministically to allow plateau traversal without infinite loops
                bestNext = nIdx;
            }
        }
        
        if (bestNext !== -1) {
            flowTo[curr] = bestNext;
            water[bestNext] += water[curr]; // Accumulate water downhill (ramification/tributaries)
        }
    }
    
    // Extract river segments where water volume > threshold
    for (let i = 0; i < dggsData.cells.length; i++) {
        if (flowTo[i] !== -1 && water[i] > 1.2) {
            rivers.push([i, flowTo[i], water[i]]);
        }
    }
    
    dggsData.metadata.rivers = rivers;
    return rivers.length > 0;
}`;

const replacement = `function generateRivers() {
    if (!dggsData || !dggsData.metadata) return false;
    if (dggsData.metadata.rivers && dggsData.metadata.rivers.length > 0) return false; 
    
    const rivers = [];
    
    // 1. Compute Distance to Sinks (Oceans or Local Minima) for perfect plateau routing
    const distToOcean = new Int32Array(dggsData.cells.length).fill(999999);
    const queue = [];
    
    for (let i = 0; i < dggsData.cells.length; i++) {
        const t = dggsData.cells[i].tile;
        if (t.biome === 0 || t.biome === 1) { // Ocean
            distToOcean[i] = 0;
            queue.push(i);
        } else {
            // Check if it is a local minimum (endorheic basin)
            let isMin = true;
            const neighbors = dggsData.metadata.neighbors[i];
            if (neighbors) {
                for (const n of neighbors) {
                    if (dggsData.cells[n].tile.elevation < t.elevation) {
                        isMin = false; break;
                    }
                }
            }
            if (isMin) {
                distToOcean[i] = 0;
                queue.push(i);
            }
        }
    }
    
    let head = 0;
    while (head < queue.length) {
        const curr = queue[head++];
        const neighbors = dggsData.metadata.neighbors[curr];
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (distToOcean[curr] + 1 < distToOcean[n]) {
                distToOcean[n] = distToOcean[curr] + 1;
                queue.push(n);
            }
        }
    }
    
    // 2. Create flow network
    const flowTo = new Int32Array(dggsData.cells.length).fill(-1);
    const water = new Float32Array(dggsData.cells.length).fill(0);
    
    // Sort land cells by elevation descending
    const landCells = [];
    for (let i = 0; i < dggsData.cells.length; i++) {
        const t = dggsData.cells[i].tile;
        if (t.biome !== 0 && t.biome !== 1 && t.biome !== 9 && t.biome !== 11) { // Not ocean, ice, lava
            landCells.push(i);
            water[i] = t.moisture / 7.0; // Base water from moisture
        }
    }
    
    landCells.sort((a, b) => dggsData.cells[b].tile.elevation - dggsData.cells[a].tile.elevation);
    
    for (const curr of landCells) {
        const neighbors = dggsData.metadata.neighbors[curr];
        if (!neighbors) continue;
        
        let bestNext = -1;
        let lowestElevation = dggsData.cells[curr].tile.elevation;
        let shortestDist = distToOcean[curr];
        
        for (const nIdx of neighbors) {
            const nElev = dggsData.cells[nIdx].tile.elevation;
            const nDist = distToOcean[nIdx];
            
            if (nElev < lowestElevation) {
                lowestElevation = nElev;
                shortestDist = nDist;
                bestNext = nIdx;
            } else if (nElev === lowestElevation && nDist < shortestDist) {
                // Flow across plateaus directly towards the nearest sink
                shortestDist = nDist;
                bestNext = nIdx;
            }
        }
        
        if (bestNext !== -1) {
            flowTo[curr] = bestNext;
            water[bestNext] += water[curr]; // Accumulate water downhill (ramification/tributaries)
        }
    }
    
    // 3. Extract river segments where water volume > threshold
    for (let i = 0; i < dggsData.cells.length; i++) {
        if (flowTo[i] !== -1 && water[i] > 0.8) {
            rivers.push([i, flowTo[i], water[i]]);
        }
    }
    
    dggsData.metadata.rivers = rivers;
    return rivers.length > 0;
}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('public/hexmap/js/app.js', code);
    console.log("Success");
} else {
    console.log("Target not found");
}
