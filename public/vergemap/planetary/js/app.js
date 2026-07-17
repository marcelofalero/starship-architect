import { decodeVMB, encodeVMB } from './vmb.js?v=3';

const HEXMAP_WORKER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8788'
    : window.location.hostname === 'frontend'
        ? 'http://hexmap-worker:8788'
        : 'https://hexmap-worker.mafalero.workers.dev';

// ── Biome Styles (Rimworld-abstract) ──
const BIOME_STYLES = {
    0: { name: 'Deep Ocean', color: '#162d45', border: '#1a3550', desc: 'Abyssal ocean depths.' },
    1: { name: 'Ocean', color: '#1e4a74', border: '#244d70', desc: 'Open ocean waters.' },
    2: { name: 'Coast', color: '#b09040', border: '#987830', desc: 'Sandy coastal lowlands.' },
    3: { name: 'Desert', color: '#b87838', border: '#a06830', desc: 'Arid desert expanse.' },
    4: { name: 'Savanna', color: '#6a5a20', border: '#5a4c1a', desc: 'Dry scrubland.' },
    5: { name: 'Plains', color: '#3c6818', border: '#305410', desc: 'Open fertile plains.' },
    6: { name: 'Forest', color: '#204c0c', border: '#183c08', desc: 'Dense deciduous forest.' },
    7: { name: 'Taiga', color: '#182c10', border: '#10200a', desc: 'Cold conifer forest.' },
    8: { name: 'Tundra', color: '#586050', border: '#485040', desc: 'Frozen permafrost.' },
    9: { name: 'Ice Cap', color: '#98bcd8', border: '#7aaac8', desc: 'Glacial ice sheet.' },
    10: { name: 'Mountains', color: '#404850', border: '#323840', desc: 'High rocky terrain.' },
    11: { name: 'Volcanic', color: '#300a06', border: '#200604', desc: 'Active volcanic zone.' },
    12: { name: 'Swamp', color: '#202e10', border: '#181e0a', desc: 'Waterlogged wetlands.' },
    13: { name: 'Scorched', color: '#1a1010', border: '#100a0a', desc: 'Dead, scorched earth.' },
    14: { name: 'Urban Sprawl', color: '#444d56', border: '#323840', desc: 'Concrete, steel, and planetary pavement.' }
};

function getBiomeInfo(id) {
    return BIOME_STYLES[id] || { name: 'Unknown', color: '#222', border: '#333', desc: '' };
}

// ── Seeded per-cell RNG (stable — same seed = same decorations every frame) ──
function cellRng(seed) {
    let h = (seed * 2654435761) >>> 0;
    return function () {
        h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
        return (h >>> 0) / 0xFFFFFFFF;
    };
}

// ── Procedural biome decoration drawers ──
function drawWaves(ctx, cx, cy, r, rng) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) {
        const y = cy + (i - 1) * r * 0.28;
        const xo = (rng() - 0.5) * r * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.45 + xo, y);
        ctx.bezierCurveTo(cx - r * 0.1 + xo, y - r * 0.07, cx + r * 0.1 + xo, y + r * 0.07, cx + r * 0.45 + xo, y);
        ctx.stroke();
    }
}

function drawGrass(ctx, pts, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    for (const p of pts) {
        ctx.beginPath(); ctx.moveTo(p.x - 1.5, p.y + 2); ctx.lineTo(p.x, p.y - 2.5); ctx.lineTo(p.x + 1.5, p.y + 2); ctx.stroke();
    }
}

function drawScrub(ctx, pts, rng) {
    ctx.fillStyle = 'rgba(80,65,20,0.55)';
    for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 + rng() * 1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(80,65,20,0.4)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y + 2); ctx.lineTo(p.x, p.y - 2); ctx.stroke();
    }
}

function drawTrees(ctx, pts, rng) {
    for (const p of pts) {
        const r = 2.2 + rng() * 1.3;
        ctx.fillStyle = `rgba(12,55,8,${0.6 + rng() * 0.25})`;
        ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.2, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(8,35,4,0.5)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 0.2 + r); ctx.lineTo(p.x, p.y + r); ctx.stroke();
    }
}

function drawPines(ctx, pts, rng) {
    for (const p of pts) {
        const h = 4 + rng() * 2, w = h * 0.6;
        ctx.fillStyle = `rgba(10,30,8,${0.65 + rng() * 0.2})`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - h); ctx.lineTo(p.x + w, p.y + h * 0.5); ctx.lineTo(p.x - w, p.y + h * 0.5); ctx.closePath(); ctx.fill();
    }
}

function drawPeaks(ctx, cx, cy, r, rng) {
    const n = 2 + (rng() > 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
        const px = cx + (rng() - 0.5) * r * 0.9;
        const py = cy + (rng() - 0.3) * r * 0.5;
        const pw = r * (0.22 + rng() * 0.16), ph = r * (0.38 + rng() * 0.22);
        ctx.fillStyle = `rgba(70,80,90,${0.5 + rng() * 0.3})`;
        ctx.beginPath(); ctx.moveTo(px, py - ph); ctx.lineTo(px + pw, py + ph * 0.35); ctx.lineTo(px - pw, py + ph * 0.35); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `rgba(200,215,230,${0.45 + rng() * 0.2})`;
        ctx.beginPath(); ctx.moveTo(px, py - ph); ctx.lineTo(px + pw * 0.38, py - ph * 0.48); ctx.lineTo(px - pw * 0.38, py - ph * 0.48); ctx.closePath(); ctx.fill();
    }
}

function drawIce(ctx, cx, cy, r, rng) {
    ctx.strokeStyle = 'rgba(140,190,230,0.45)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 5; i++) {
        const a = rng() * Math.PI * 2, len = r * (0.25 + rng() * 0.45);
        const mx = cx + Math.cos(a) * len * 0.5 + (rng() - 0.5) * 2;
        const my = cy + Math.sin(a) * len * 0.5 + (rng() - 0.5) * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
    }
}

function drawLava(ctx, cx, cy, r, rng) {
    for (let i = 0; i < 4; i++) {
        const a = rng() * Math.PI * 2, len = r * (0.2 + rng() * 0.55);
        const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len;
        ctx.strokeStyle = `rgba(200,${60 + rng() * 60 | 0},0,${0.45 + rng() * 0.35})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(240,100,0,0.7)';
    ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill();
}

function drawMarsh(ctx, pts, rng) {
    ctx.strokeStyle = 'rgba(35,90,25,0.55)'; ctx.lineWidth = 0.7;
    for (let i = 0; i < Math.min(4, pts.length); i++) {
        const p = pts[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0.2, Math.PI * 1.8); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(50,80,20,0.45)'; ctx.lineWidth = 0.5;
    for (let i = 4; i < pts.length; i++) {
        const p = pts[i];
        ctx.beginPath(); ctx.moveTo(p.x, p.y + 2.5); ctx.lineTo(p.x, p.y - 3.5); ctx.stroke();
    }
}

function drawSand(ctx, pts, rng) {
    ctx.fillStyle = 'rgba(140,110,40,0.4)';
    for (const p of pts) {
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 1 + rng() * 1.2, 0.6 + rng() * 0.6, rng() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
}

// ── Main per-cell biome decoration renderer ──
function drawBiomeTile(ctx, biomeId, cx, cy, r, cellIdx) {
    const rng = cellRng(cellIdx);
    const pts = [];
    for (let i = 0; i < 7; i++) {
        const a = rng() * Math.PI * 2, rd = Math.sqrt(rng()) * r * 0.6;
        pts.push({ x: cx + Math.cos(a) * rd, y: cy + Math.sin(a) * rd });
    }
    switch (biomeId) {
        case 0: case 1: drawWaves(ctx, cx, cy, r, rng); break;
        case 2: drawSand(ctx, pts, rng); break;
        case 3: drawSand(ctx, pts, rng); break; // rocks similar to sand but darker (color already differs)
        case 4: drawScrub(ctx, pts, rng); break;
        case 5: drawGrass(ctx, pts, 'rgba(35,90,12,0.6)'); break;
        case 6: drawTrees(ctx, pts, rng); break;
        case 7: drawPines(ctx, pts, rng); break;
        case 8:         /* tundra — sparse, just border */ break;
        case 9: drawIce(ctx, cx, cy, r, rng); break;
        case 10: drawPeaks(ctx, cx, cy, r, rng); break;
        case 11: drawLava(ctx, cx, cy, r, rng); break;
        case 12: drawMarsh(ctx, pts, rng); break;
    }
}

// ── Offscreen Canvas Caching (LOD & Performance) ──
const biomeVariantCache = {};
const NUM_VARIANTS = 16;
const CACHE_SIZE = 120;
const VIRTUAL_R = 15;
let isCacheInitialized = false;

function initBiomeCache() {
    if (isCacheInitialized) return;
    for (let b = 0; b <= 12; b++) {
        biomeVariantCache[b] = [];
        for (let v = 0; v < NUM_VARIANTS; v++) {
            const canvas = document.createElement('canvas');
            const dpr = window.devicePixelRatio || 1;
            canvas.width = CACHE_SIZE * dpr;
            canvas.height = CACHE_SIZE * dpr;

            const ctx = canvas.getContext('2d', { alpha: true });
            const scaleFactor = (CACHE_SIZE / 2) / VIRTUAL_R;
            ctx.scale(scaleFactor * dpr, scaleFactor * dpr);

            const pseudoIdx = (b * 1000) + v;
            drawBiomeTile(ctx, b, VIRTUAL_R, VIRTUAL_R, VIRTUAL_R * 0.9, pseudoIdx);

            biomeVariantCache[b].push(canvas);
        }
    }
    isCacheInitialized = true;
}

// ── Edge neighbor precomputation (kept for roads/rivers overlay layer) ──
let cellEdgeNeighbors = [];

function precomputeEdgeNeighbors() {
    cellEdgeNeighbors = [];
    if (!dggsData) return;
    const neighborsMap = dggsData.metadata?.neighbors || {};
    for (let i = 0; i < dggsData.cells.length; i++) {
        const cell = dggsData.cells[i];
        const numVerts = cell.vertices.length;
        const neighbors = neighborsMap[i] || [];
        const edges = [];
        for (let k = 0; k < numVerts; k++) {
            const v1 = cell.vertices[k], v2 = cell.vertices[(k + 1) % numVerts];
            let found = -1;
            for (const nIdx of neighbors) {
                const nc = dggsData.cells[nIdx]; if (!nc) continue;
                let h1 = false, h2 = false;
                for (const nv of nc.vertices) {
                    if ((nv.x - v1.x) ** 2 + (nv.y - v1.y) ** 2 + (nv.z - v1.z) ** 2 < 1e-5) h1 = true;
                    if ((nv.x - v2.x) ** 2 + (nv.y - v2.y) ** 2 + (nv.z - v2.z) ** 2 < 1e-5) h2 = true;
                    if (h1 && h2) break;
                }
                if (h1 && h2) { found = nIdx; break; }
            }
            edges.push(found);
        }
        cellEdgeNeighbors[i] = edges;
    }
}

function generateRivers() {
    if (!dggsData || !dggsData.metadata) return false;

    // Use a simple seeded PRNG to ensure rivers are identical for the same map seed
    let seedVal = 1337;
    if (dggsData.metadata.seed) {
        for (let i = 0; i < dggsData.metadata.seed.length; i++) seedVal += dggsData.metadata.seed.charCodeAt(i);
    }
    const random = () => {
        const x = Math.sin(seedVal++) * 10000;
        return x - Math.floor(x);
    };

    const rivers = [];

    // 1. Compute SPFA Dijkstra Distance to Sinks (Oceans or Local Minima)
    // This allows rivers to intelligently cross plateaus and even carve through small hills (uphill)
    // to reach the ocean, mimicking real-world river basin carving (like the Nile or Colorado).
    const distToOcean = new Int32Array(dggsData.cells.length).fill(999999);
    const inQueue = new Uint8Array(dggsData.cells.length).fill(0);
    let currentQueue = [];

    for (let i = 0; i < dggsData.cells.length; i++) {
        const t = dggsData.cells[i].tile;
        if (t.biome === 0 || t.biome === 1) { // Ocean
            distToOcean[i] = 0;
            currentQueue.push(i);
            inQueue[i] = 1;
            // Rivers must reach the ocean. Do not allow endorheic basins to act as sinks.
        }
    }

    while (currentQueue.length > 0) {
        const nextQueue = [];
        for (let i = 0; i < currentQueue.length; i++) {
            const curr = currentQueue[i];
            inQueue[curr] = 0;

            const neighbors = dggsData.metadata.neighbors[curr];
            if (!neighbors) continue;

            const currElev = dggsData.cells[curr].tile.elevation;

            for (const n of neighbors) {
                const nElev = dggsData.cells[n].tile.elevation;
                // Cost for water to flow FROM n TO curr:
                let cost = 1;
                if (nElev === currElev) cost = 6;       // Traversing a flat plain
                else if (nElev < currElev) cost = 45;   // Carving uphill through a higher macro-elevation hex

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

    // 2. Identify Sources and Trace Paths
    const flowTo = new Int32Array(dggsData.cells.length).fill(-1);
    const water = new Float32Array(dggsData.cells.length).fill(0);
    
    // Pick candidates (strictly inland)
    let candidates = [];
    for (let i = 0; i < dggsData.cells.length; i++) {
        const t = dggsData.cells[i].tile;
        // Require at least a little moisture, but don't strictly require high elevation
        if (t.biome !== 0 && t.biome !== 1 && t.moisture >= 1 && distToOcean[i] > 2) {
            candidates.push(i);
        }
    }
    
    // Sort by cost-distance to ocean descending PLUS a heavy moisture bonus!
    // This ensures rivers start in high-moisture inland areas (Mountains, Forests, Swamps) instead of Deserts.
    candidates.sort((a, b) => {
        const scoreA = distToOcean[a] + (dggsData.cells[a].tile.moisture * 3);
        const scoreB = distToOcean[b] + (dggsData.cells[b].tile.moisture * 3);
        return scoreB - scoreA;
    });
    
    // Take the top 30% best (inland + wet) cells as our candidate pool
    const poolSize = Math.max(50, Math.floor(candidates.length * 0.3));
    candidates = candidates.slice(0, poolSize);
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    // Generate an abundant number of sources for a global map
    const numSources = Math.max(30, Math.floor(dggsData.cells.length / 30));
    const sources = candidates.slice(0, numSources);
    
    console.log(`[River Generation] Top candidates found: ${candidates.length}. Selected ${numSources} sources for tracing.`);
    
    for (const source of sources) {
        let curr = source;
        const visited = new Set([curr]);
        
        while (distToOcean[curr] > 0) {
            if (flowTo[curr] !== -1) break; // Merged into an existing river path
            
            const neighbors = dggsData.metadata.neighbors[curr];
            if (!neighbors) break;
            
            let bestNext = -1;
            let shortestDist = distToOcean[curr];
            let fallbackNext = -1;
            
            for (const n of neighbors) {
                if (distToOcean[n] < shortestDist) {
                    shortestDist = distToOcean[n];
                    bestNext = n;
                } else if (distToOcean[n] === shortestDist && n < bestNext && !visited.has(n)) {
                    bestNext = n;
                }
                if (distToOcean[n] <= distToOcean[curr] && fallbackNext === -1 && !visited.has(n)) {
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
    
    // 3. Accumulate Water Flow
    const activeCells = [];
    for (let i = 0; i < dggsData.cells.length; i++) {
        if (flowTo[i] !== -1) activeCells.push(i);
        water[i] = 0;
    }
    for (const s of sources) water[s] = 1.0;
    
    activeCells.sort((a, b) => distToOcean[b] - distToOcean[a]);
    
    for (const curr of activeCells) {
        const next = flowTo[curr];
        if (next !== -1) {
            water[next] += water[curr] + (dggsData.cells[curr].tile.moisture / 10.0);
        }
    }
    
    // 4. Extract Continuous Branches
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
                const isGlacier = dggsData.cells[curr].tile.biome === 9;
                const isOcean = dggsData.cells[curr].tile.biome === 0 || dggsData.cells[curr].tile.biome === 1;
                branch.push({ idx: curr, water: water[curr], hidden: isGlacier, isOcean });
                drawn[curr] = 1;
                
                if (isOcean) break;
                curr = flowTo[curr];
            }
            
            // Connect to merge point if it hit an existing branch
            if (curr !== -1 && drawn[curr]) {
                const isGlacier = dggsData.cells[curr].tile.biome === 9;
                const isOcean = dggsData.cells[curr].tile.biome === 0 || dggsData.cells[curr].tile.biome === 1;
                branch.push({ idx: curr, water: water[curr], hidden: isGlacier, isOcean });
            }
            
            if (branch.length > 0) {
                if (branch.length > 1) {
                    branches.push(branch);
                }
            }
        }
    }
    
    // Telemetry for debugging and analysis
    let singleHex = 0;
    let totalLen = 0;
    for (const b of branches) {
        if (b.length === 2) singleHex++;
        totalLen += b.length;
    }
    const avgLen = branches.length > 0 ? (totalLen / branches.length).toFixed(1) : 0;
    console.log(`[River Generation] Extracted ${branches.length} continuous branches.`);
    console.log(`[River Generation] Average length: ${avgLen} nodes. Tributaries (1-hex): ${singleHex}.`);
    
    // Log all branches to compare visual with data
    console.log("[River Generation] Branch Data:");
    branches.forEach((b, idx) => {
        const pathDetails = b.map(n => {
            const isOcean = dggsData.cells[n.idx].tile.biome === 0 || dggsData.cells[n.idx].tile.biome === 1;
            return `${n.idx}${isOcean ? '(O)' : ''}`;
        }).join(' -> ');
        console.log(`  Branch ${idx} [len ${b.length}]: ${pathDetails}`);
    });
    console.log(`[River Generation] Raw branch data:`, branches);
    
    dggsData.metadata.rivers = branches;
    return branches.length > 0;
}

function computePollution() {
    if (!dggsData || !dggsData.metadata.neighbors) return;
    
    const pollMod = (dggsData.metadata.pollution !== undefined ? dggsData.metadata.pollution : 100) / 100.0;
    const numCells = dggsData.cells.length;
    
    // 1. Calculate base pollution for all cells
    let pollution = new Float32Array(numCells);
    for (let i = 0; i < numCells; i++) {
        const cell = dggsData.cells[i];
        let p = 0;
        if (cell.tile.biome === 11 || cell.tile.biome === 13) p += 0.4;
        
        let urbanPol = 0.0;
        if (cell.tile.faction === 1) urbanPol = 0.15;
        else if (cell.tile.faction === 2) urbanPol = 0.4;
        else if (cell.tile.faction === 3) urbanPol = 0.9;
        else if (cell.tile.faction === 4) urbanPol = 1.5; // Megacities vastly exceed cap natively
        
        pollution[i] = p + (urbanPol * pollMod);
    }
    
    // 2. Diffuse/Spillover (Run for iterations to simulate propagation)
    const MAX_CAP = 1.0;
    const THRESHOLD = 0.4; // Lower threshold so smog spreads faster
    const iterations = 8; 
    
    for (let iter = 0; iter < iterations; iter++) {
        let nextPollution = new Float32Array(pollution);
        
        // A. Diffuse
        for (let i = 0; i < numCells; i++) {
            if (pollution[i] > THRESHOLD) {
                const excess = pollution[i] - THRESHOLD;
                if (excess > 0) {
                    const neighbors = dggsData.metadata.neighbors[i];
                    if (neighbors && neighbors.length > 0) {
                        // 15% of excess flows to EACH neighbor (up to 90% total outward flow)
                        const spillAmount = excess * 0.15;
                        
                        nextPollution[i] -= (spillAmount * neighbors.length);
                        for (const n of neighbors) {
                            nextPollution[n] += spillAmount;
                        }
                    }
                }
            }
        }
        
        // B. Re-apply Sources (Cities constantly pump out smog, they don't just run out)
        for (let i = 0; i < numCells; i++) {
            const cell = dggsData.cells[i];
            let urbanPol = 0.0;
            if (cell.tile.faction === 4) urbanPol = 1.5;
            else if (cell.tile.faction === 3) urbanPol = 0.9;
            else if (cell.tile.faction === 2) urbanPol = 0.4;
            else if (cell.tile.faction === 1) urbanPol = 0.15;
            
            if (urbanPol > 0) {
                // Ensure the city never drops below its base output
                nextPollution[i] = Math.max(nextPollution[i], urbanPol * pollMod);
            }
            pollution[i] = nextPollution[i];
        }
    }
    
    // Cap all at MAX_CAP for rendering
    for (let i = 0; i < numCells; i++) {
        pollution[i] = Math.min(MAX_CAP, pollution[i]);
    }
    
    dggsData.metadata.computedPollution = pollution;
}

function applyMetadataOverrides() {
    if (!dggsData || !dggsData.metadata) return;
    
    // 1. Mutations (terrain changes)
    if (dggsData.metadata.mutations) {
        for (const idx in dggsData.metadata.mutations) {
            const mut = dggsData.metadata.mutations[idx];
            const cell = dggsData.cells[idx];
            if (cell) {
                if (mut.biome !== undefined) cell.tile.biome = mut.biome;
                if (mut.elevation !== undefined) cell.tile.elevation = mut.elevation;
                if (mut.moisture !== undefined) cell.tile.moisture = mut.moisture;
            }
        }
    }
    
    // 2. Custom Features
    if (dggsData.metadata.customFeatures) {
        for (const idx in dggsData.metadata.customFeatures) {
            const feat = dggsData.metadata.customFeatures[idx];
            const cell = dggsData.cells[idx];
            if (cell) {
                cell.tile.feature = feat;
            }
        }
    }
}

function resolveSpecialization(cellIdx) {
    const favs = dggsData.favorabilities[cellIdx];
    if (!favs) return 'industrial'; // fallback
    
    let bestSpec = 'industrial';
    let maxVal = -1;
    for (const spec of ['agri', 'mining', 'research', 'industrial', 'tourism']) {
        if (favs[spec] > maxVal) {
            maxVal = favs[spec];
            bestSpec = spec;
        }
    }
    
    const specNames = {
        agri: 'agricultural',
        mining: 'mining',
        research: 'research',
        industrial: 'industrial',
        tourism: 'tourism'
    };
    return specNames[bestSpec];
}

function computeFavorabilities() {
    if (!dggsData) return;
    
    dggsData.favorabilities = new Array(dggsData.cells.length);
    
    const riverCells = new Set();
    if (dggsData.metadata && dggsData.metadata.rivers) {
        for (const branch of dggsData.metadata.rivers) {
            for (const node of branch) {
                riverCells.add(node.idx);
            }
        }
    }
    
    for (let i = 0; i < dggsData.cells.length; i++) {
        const cell = dggsData.cells[i];
        const t = cell.tile;
        const moisture = t.moisture;
        const elevation = t.elevation;
        const biome = t.biome;
        const feature = t.feature;
        
        const isRiver = riverCells.has(i);
        
        let isCoastal = false;
        if (elevation === 4) {
            const neighbors = cellEdgeNeighbors[i] || [];
            for (const nIdx of neighbors) {
                if (nIdx !== -1 && nIdx !== undefined) {
                    const nc = dggsData.cells[nIdx];
                    if (nc && (nc.tile.elevation <= 3 || nc.tile.biome === 0 || nc.tile.biome === 1)) {
                        isCoastal = true;
                        break;
                    }
                }
            }
        }
        
        // 1. Agricultural
        let agri = 0;
        if (biome > 1 && biome !== 11) {
            if (biome === 5) agri += 40;
            else if (biome === 4) agri += 30;
            else if (biome === 6) agri += 30;
            else if (biome === 12) agri += 25;
            
            if (isRiver) agri += 45;
            if (isCoastal) agri += 10;
            
            agri += moisture * 5;
            
            if (biome === 3) agri -= 25;
            if (biome === 10) agri -= 35;
            if (biome === 8) agri -= 35;
            if (biome === 9) agri -= 48;
        }
        agri = Math.max(0, Math.min(100, Math.round(agri)));
        
        // 2. Mining
        let mining = 0;
        if (biome > 1) {
            if (feature === 3) mining += 65;
            else if (feature === 8) mining += 65;
            else if (feature === 7) mining += 20;
            
            if (biome === 10) mining += 40;
            else if (biome === 13) mining += 30;
            else if (biome === 11) mining += 25;
            
            mining += elevation * 5;
            
            if (biome === 5 || biome === 6 || biome === 12) mining -= 15;
            if (biome === 9) mining -= 15;
        }
        mining = Math.max(0, Math.min(100, Math.round(mining)));
        
        // 3. Research
        let research = 5;
        if (feature > 0) {
            if (feature === 9) research += 80;
            else if (feature === 1) research += 70;
            else if (feature === 4) research += 70;
            else if (feature === 5) research += 55;
            else if (feature === 6) research += 35;
            else if (feature === 2) research += 20;
        }
        if (biome === 8 || biome === 12 || biome === 11) research += 10;
        research = Math.max(0, Math.min(100, Math.round(research)));
        
        // 4. Industrial
        let industrial = 0;
        if (biome > 0) {
            if (feature === 7) industrial += 60;
            if (biome === 11) industrial += 35;
            else if (biome === 13) industrial += 20;
            
            if (isCoastal) industrial += 35;
            if (isRiver) industrial += 20;
            
            industrial += elevation * 3;
            if (biome === 9) industrial -= 25;
        }
        industrial = Math.max(0, Math.min(100, Math.round(industrial)));
        
        // 5. Tourism
        let tourism = 0;
        if (biome > 1) {
            if (feature === 10) tourism += 85;
            else if (feature === 8) tourism += 45;
            else if (feature === 1) tourism += 35;
            
            if (isCoastal) tourism += 35;
            if (isRiver) tourism += 15;
            
            if (biome === 5 || biome === 6) tourism += 15;
            
            if (biome === 11 || biome === 13) tourism -= 20;
            if (biome === 8) tourism -= 10;
            if (biome === 9) tourism -= 25;
        }
        tourism = Math.max(0, Math.min(100, Math.round(tourism)));
        
        dggsData.favorabilities[i] = { agri, mining, research, industrial, tourism };
    }
}

function onDataLoaded() {
    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.sectorScans) dggsData.metadata.sectorScans = {};
    if (!dggsData.metadata.stealthOverrides) dggsData.metadata.stealthOverrides = {};
    if (!dggsData.metadata.mutations) dggsData.metadata.mutations = {};
    if (!dggsData.metadata.customFeatures) dggsData.metadata.customFeatures = {};
    if (!dggsData.metadata.names) dggsData.metadata.names = {};
    if (!dggsData.metadata.descriptions) dggsData.metadata.descriptions = {};
    if (!dggsData.metadata.labels) dggsData.metadata.labels = [];

    // Layer metadata mutations and custom features onto the cells
    applyMetadataOverrides();

    // Map feature 5 (Research Station) to 0 (None)
    for (let i = 0; i < dggsData.cells.length; i++) {
        if (dggsData.cells[i].tile.feature === 5) {
            dggsData.cells[i].tile.feature = 0;
        }
    }

    initBiomeCache();

    let changed = false;
    
    if (!dggsData.metadata.revealedFeatures) {
        dggsData.metadata.revealedFeatures = [];
        changed = true;
    }
    if (!dggsData.metadata.scannedCells) {
        dggsData.metadata.scannedCells = [];
        changed = true;
    }

    for (let i = 0; i < dggsData.cells.length; i++) {
        const cell = dggsData.cells[i];
        if (cell.tile.feature > 0) {
            const fData = FEATURES[cell.tile.feature];
            if (fData && fData.scanLevel === 0 && !dggsData.metadata.revealedFeatures.includes(i)) {
                dggsData.metadata.revealedFeatures.push(i);
                changed = true;
            }
        }
        if (dggsData.metadata.revealedFeatures.includes(i) && !dggsData.metadata.scannedCells.includes(i)) {
            dggsData.metadata.scannedCells.push(i);
            changed = true;
        }
    }

    precomputeEdgeNeighbors();
    generateRivers();
    computeFavorabilities();
    computePollution();

    // Process factions and specializations
    let metadataChanged = changed;
    if (!dggsData.metadata.factions) {
        dggsData.metadata.factions = {};
        for (let i = 0; i < dggsData.cells.length; i++) {
            const factionLevel = dggsData.cells[i].tile.faction;
            if (factionLevel > 0) {
                const spec = resolveSpecialization(i);
                dggsData.metadata.factions[i] = { level: factionLevel, spec: 'auto' };
                dggsData.cells[i].tile.faction = factionLevel;
                dggsData.cells[i].tile.specialization = spec;
            }
        }
        metadataChanged = true;
    } else {
        for (let i = 0; i < dggsData.cells.length; i++) {
            const cell = dggsData.cells[i];
            const fac = dggsData.metadata.factions[i];
            if (fac) {
                cell.tile.faction = fac.level;
                cell.tile.specialization = fac.spec === 'auto' ? resolveSpecialization(i) : fac.spec;
            } else {
                cell.tile.faction = 0;
                cell.tile.specialization = undefined;
            }
        }
    }

    // Update sliders to match metadata
    const urbVal = dggsData.metadata.urbanization !== undefined ? dggsData.metadata.urbanization : 15;
    const pollVal = dggsData.metadata.pollution !== undefined ? dggsData.metadata.pollution : 100;
    const consVal = dggsData.metadata.conservation !== undefined ? dggsData.metadata.conservation : 0;

    const urbInput = document.getElementById('map-urbanization');
    const urbSpan = document.getElementById('urban-value');
    if (urbInput && urbSpan) {
        urbInput.value = urbToSlider(urbVal);
        urbSpan.textContent = formatUrb(urbVal);
    }

    const pollInput = document.getElementById('map-pollution');
    const pollSpan = document.getElementById('poll-value');
    if (pollInput && pollSpan) {
        pollInput.value = pollVal;
        pollSpan.textContent = `${pollVal}%`;
    }

    const consInput = document.getElementById('map-conservation');
    const consSpan = document.getElementById('cons-value');
    if (consInput && consSpan) {
        consInput.value = consVal;
        consSpan.textContent = `${consVal}%`;
    }

    // Auto-save if metadata initialized/changed on load
    if (metadataChanged && typeof saveDGGSMetadata === 'function') {
        saveDGGSMetadata().catch(console.error);
    }
}

function sliderToUrb(val) {
    const x = parseFloat(val);
    if (x <= 0) return 0;
    const p = Math.pow(10, (x / 25) - 2);
    return Math.round(p * 1000) / 1000;
}

function urbToSlider(p) {
    if (p <= 0) return 0;
    const x = 25 * (Math.log10(p) + 2);
    return Math.round(x);
}

function formatUrb(p) {
    if (p === 0) return '0%';
    if (p < 0.01) return `${p.toFixed(3)}%`;
    if (p < 0.1) return `${p.toFixed(2)}%`;
    if (p < 1) return `${p.toFixed(2)}%`;
    if (p < 10) return `${p.toFixed(1)}%`;
    return `${Math.round(p)}%`;
}



const FEATURES = {
    0: { name: 'None', scanLevel: 0, shielding: 0 },
    1: { name: 'Ancient Ruins', scanLevel: 2, shielding: -1 },
    2: { name: 'Impact Crater', scanLevel: 0, shielding: 0 },
    3: { name: 'Mineral Geode', scanLevel: 2, shielding: 0 },
    4: { name: 'Energy Anomaly', scanLevel: 3, shielding: -2 },
    5: { name: 'None', scanLevel: 0, shielding: 0 },
    6: { name: 'Abandoned Outpost', scanLevel: 1, shielding: 0 },
    7: { name: 'Geothermal Vent', scanLevel: 0, shielding: 0 },
    8: { name: 'Crystalline Spires', scanLevel: 2, shielding: -1 },
    9: { name: 'Alien Monolith', scanLevel: 3, shielding: -2 },
    10: { name: 'Natural Marvel', scanLevel: 1, shielding: 0 }
};
const FEATURE_COLORS = { 1: '#e040fb', 2: '#9e9e9e', 3: '#00e676', 4: '#00e5ff', 5: 'transparent', 6: '#ff9100', 7: '#ff1744', 8: '#d500f9', 9: '#ffd600', 10: '#ffd54f' };


function getUrbStealth(factionLevel, isUnderground, isAbandoned) {
    let stealth = 1;
    if (isUnderground) stealth += 1;
    if (isAbandoned) {
        if (factionLevel === 1) stealth += 2;
        else if (factionLevel === 2) stealth += 1;
    }
    return Math.min(stealth, 5);
}

function getFeatureBaseStealth(type) {
    switch(type) {
        case 2: case 7: return 1;
        case 6: case 10: return 2;
        case 1: case 3: case 8: return 3;
        case 4: case 9: return 4;
        default: return 1;
    }
}
const FACTIONS = { 0: { name: 'Unclaimed Territory', color: 'transparent' }, 1: { name: 'United Colonies', color: '#00e5ff' }, 2: { name: 'Verge Syndicate', color: '#ffaa00' }, 3: { name: 'Precursor Remnants', color: '#d500f9' } };

// ── State ──
let dggsData = null;   // decoded DGGS data { cells, metadata, ... }
let GLOBE_RADIUS = 260;
let rotX = 0.3, rotY = 0.0;
let scale = 1.0, targetScale = 1.0;
let offsetX = 0, offsetY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0;
let lastMouseX = 0, lastMouseY = 0, hasMoved = false;
let hoveredIdx = -1, selectedIdx = -1;
let selectedIndices = [];
let userRole = 'player';
let originalRole = 'player';
let currentLens = 'biome';
let ships = [];


// ── DOM ──
const canvas = document.getElementById('hex-canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const infoPanel = document.getElementById('info-panel');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

function activateTab(tabName) {
    tabButtons.forEach(b => {
        if (b.getAttribute('data-tab') === tabName) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    tabContents.forEach(content => {
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        activateTab(tabName);
    });
});

const closeInfoBtn = document.getElementById('close-info');
const seedInput = document.getElementById('map-seed');
const typeSelect = document.getElementById('map-type');
const radiusInput = document.getElementById('map-radius');
const generateBtn = document.getElementById('generate-btn');
const mapToolsModal = document.getElementById('map-tools-modal');
const floatingMapToolsBtn = document.getElementById('floating-map-tools');
const closeMapToolsBtn = document.getElementById('close-map-tools-btn');
const vmbUpload = document.getElementById('vmb-upload');
const uploadStatus = document.getElementById('upload-status');
const viewModeSelect = document.getElementById('view-mode');
const autoRotateCheckbox = document.getElementById('auto-rotate');
const hudSeed = document.getElementById('info-seed');
const hudType = document.getElementById('info-type');
const hudSize = document.getElementById('info-size');
const hudTiles = document.getElementById('info-tiles');
const detailTitle = document.getElementById('hex-coord-title');
const detailBiome = document.getElementById('hex-biome');
const detailElevation = document.getElementById('hex-elevation');
const detailMoisture = document.getElementById('hex-moisture');
const detailFeature = document.getElementById('hex-feature');
const detailAnalysis = document.getElementById('hex-analysis-text');
const detailCoords = document.getElementById('hex-coords');
const detailPos3D = document.getElementById('hex-pos-3d');

const editFeature = document.getElementById('edit-feature');
const editFaction = document.getElementById('edit-faction');
const editFactionSpec = document.getElementById('edit-faction-spec');
const editName = document.getElementById('edit-name');
const editDesc = document.getElementById('edit-desc');
const newLabelText = document.getElementById('new-label-text');
const newLabelType = document.getElementById('new-label-type');
const addLabelBtn = document.getElementById('add-label-btn');
const activeLabelsContainer = document.getElementById('active-labels-container');

const gmFactionRow = document.getElementById('gm-faction-row');
const gmFactionSpecRow = document.getElementById('gm-faction-spec-row');
const gmFeatureRow = document.getElementById('gm-feature-row');
const gmNameRow = document.getElementById('gm-name-row');
const playerNameRow = document.getElementById('player-name-row');
const hexNameSpan = document.getElementById('hex-name');
const gmDescRow = document.getElementById('gm-desc-row');
const playerDescRow = document.getElementById('player-desc-row');
const hexDescDiv = document.getElementById('hex-desc');
const gmLabelPanel = document.getElementById('gm-label-panel');

const suitAgriSpan = document.getElementById('suit-agri');
const suitMiningSpan = document.getElementById('suit-mining');
const suitResearchSpan = document.getElementById('suit-research');
const suitIndustrialSpan = document.getElementById('suit-industrial');
const suitTourismSpan = document.getElementById('suit-tourism');

const detailAddress = document.getElementById('hex-address');
const detailNeighbors = document.getElementById('hex-neighbors');
const landBtn = document.getElementById('land-btn');
const exportBtn = document.getElementById('export-btn');
const featureStatusRow = document.getElementById('feature-status-row');
const featureStatusValue = document.getElementById('feature-status-value');
const featureActionRow = document.getElementById('feature-action-row');

function setupCompoundGroup(groupId, onChange) {
    const group = document.getElementById(groupId);
    if (!group) return;
    const buttons = group.querySelectorAll('.scan-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (onChange) onChange(parseInt(btn.getAttribute('data-level')));
        });
    });
}

const playerScanLevel = document.getElementById('player-scan-level');
const gmNeededLevel = document.getElementById('gm-needed-level');
const gmCurrentLevel = document.getElementById('gm-current-level');
const scanSizeSelect = document.getElementById('scan-size');


const playerFeatureStatusRow = document.getElementById('player-feature-status-row');
const playerFeatureStatusValue = document.getElementById('player-feature-status-value');
const playerFeatureActionRow = document.getElementById('player-feature-action-row');
const featureActionBtn = document.getElementById('feature-action-btn');


function resizeCanvas() { 
    canvas.width = canvas.clientWidth; 
    canvas.height = canvas.clientHeight; 
    if (typeof offsetX !== 'undefined') {
        offsetX = canvas.width / 2;
        offsetY = canvas.height / 2;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function centerViewport() {
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    scale = 1.0; targetScale = 1.0;
    rotX = 0.3; rotY = 0.0;
}

// ── 3D Math ──
function rotate3D(px, py, pz) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = px * cosY - pz * sinY;
    const z1 = px * sinY + pz * cosY;
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const y2 = py * cosX - z1 * sinX;
    const z2 = py * sinX + z1 * cosX;
    return { x: x1, y: y2, z: z2 };
}

function findSharedVertices(cellA, cellB) {
    const shared = [];
    if (!cellA.vertices || !cellB.vertices) return shared;
    for (const va of cellA.vertices) {
        for (const vb of cellB.vertices) {
            const dx = va.x - vb.x;
            const dy = va.y - vb.y;
            const dz = va.z - vb.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < 1e-5) {
                shared.push(va);
                break;
            }
        }
    }
    return shared;
}

// ── Render ──
function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Ensure context is fully reset to prevent smeared frames on errors
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!dggsData) { requestAnimationFrame(draw); return; }

    // Auto-rotate (only for controlling clients, viewers rely on MQTT sync)
    if (autoRotateCheckbox.checked && !isDragging && !isViewer) { rotY += 0.002; }

    // Smooth zoom
    scale += (targetScale - scale) * 0.15;
    if (Math.abs(targetScale - scale) < 0.005) scale = targetScale;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const cells = dggsData.cells;

    // ── Pre-calculate visible cells and group by Lens color ──
    const groupsByColor = {};
    const visibleCells = [];

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        // Fast backface cull
        const rCenter = rotate3D(cell.center.x, cell.center.y, cell.center.z);
        if (rCenter.z < -0.05) continue;

        const projVerts = [];
        let allFront = true;
        for (const v of cell.vertices) {
            const rv = rotate3D(v.x, v.y, v.z);
            if (rv.z < -0.2) { allFront = false; break; }
            projVerts.push({ x: rv.x * GLOBE_RADIUS, y: rv.y * GLOBE_RADIUS });
        }
        if (!allFront || projVerts.length < 3) continue;

        const hexCx = rCenter.x * GLOBE_RADIUS;
        const hexCy = rCenter.y * GLOBE_RADIUS;
        const hexR = Math.sqrt((projVerts[0].x - hexCx) ** 2 + (projVerts[0].y - hexCy) ** 2) * 0.92;

        const cellData = { i, cell, projVerts, hexCx, hexCy, hexR };
        visibleCells.push(cellData);

        let fillColor, borderColor;
        if (currentLens === 'elevation') {
            const el = cell.tile.elevation || 0;
            const v = Math.min(255, Math.max(0, el * 25));
            fillColor = `rgb(${v}, ${v}, ${v})`;
            borderColor = `rgb(${Math.min(255, v + 20)}, ${Math.min(255, v + 20)}, ${Math.min(255, v + 20)})`;
        } else if (currentLens === 'thermal') {
            // Map temperature heavily to biome to reflect ecological realities, rather than purely latitude
            const biomeTemps = {
                11: 1.0, // Lava (Extremely Hot)
                2: 0.9,  // Desert (Very Hot)
                3: 0.7,  // Sand/Beach (Warm)
                4: 0.7,  // Scrubland (Warm)
                5: 0.6,  // Grassland (Temperate)
                6: 0.6,  // Forest (Temperate)
                12: 0.6, // Marsh (Temperate)
                0: 0.5,  // Deep Ocean (Moderate)
                1: 0.5,  // Shallow Ocean (Moderate)
                7: 0.3,  // Pine/Taiga (Cool)
                10: 0.2, // Peaks (Cold)
                8: 0.15, // Tundra (Very Cold)
                9: 0.0   // Ice (Freezing)
            };
            const baseTemp = biomeTemps[cell.tile.biome] !== undefined ? biomeTemps[cell.tile.biome] : 0.5;

            // Add a small modifier based on elevation and latitude so it's not completely uniform
            const latMod = (1.0 - Math.abs(cell.center.y) - 0.5) * 0.1;
            const elMod = ((cell.tile.elevation || 0) / 10) * 0.1;
            let finalTemp = Math.max(0, Math.min(1, baseTemp + latMod - elMod));
            
            // Urbanization generates heat (Urban Heat Island effect)
            if (cell.tile.faction > 0) {
                finalTemp = Math.min(1, finalTemp + (cell.tile.faction * 0.15));
            }

            // hue 240 (blue) to 0 (red)
            const hue = (1.0 - finalTemp) * 240;
            fillColor = `hsl(${hue}, 80%, 50%)`;
            borderColor = `hsl(${hue}, 80%, 40%)`;
        } else if (currentLens === 'gravity') {
            // Gravity depends primarily on elevation (mass) and features (anomalies)
            const el = cell.tile.elevation || 0;
            let grav = el / 10; // 0 to 1
            if (cell.tile.biome === 0) grav = 0; // Deep ocean is lowest

            // Anomalies for features
            if (cell.tile.feature === 9) grav = 1.2; // Monolith = massive gravity spike
            if (cell.tile.feature === 4) grav = -0.2; // Energy anomaly = low gravity pocket

            const clampedGrav = Math.max(0, Math.min(1, grav));

            // Cyan/Blue (low) to Purple/Red (high)
            const hue = 180 - (clampedGrav * 180);
            fillColor = `hsl(${hue}, 90%, 50%)`;
            borderColor = `hsl(${hue}, 90%, 30%)`;
        } else if (currentLens === 'em') {
            // EM Field Scan: Detects energy signatures from ruins, anomalies, ships, storms
            
            // Global Background Radio Noise (scales with planetary urbanization for non-local communication scatter)
            const urb = dggsData.metadata?.urbanization !== undefined ? dggsData.metadata.urbanization : 15;
            const globalRadioNoise = (urb / 100.0) * 0.35; // Up to 0.35 global noise floor on Ecumenopolis worlds
            
            // Base background EM (dark slate/purple) with slight procedural noise + global scatter
            let em = globalRadioNoise + Math.abs(Math.sin(cell.center.x * 20) * Math.cos(cell.center.y * 20)) * 0.15;

            // Geological / Natural
            if (cell.tile.biome === 11) em += 0.2; // Lava generates some EM noise

            // Features (Anomalies, Ruins, Vents)
            const f = cell.tile.feature;
            if (f === 1) em = 0.5; // Ancient Ruins
            else if (f === 3) em = 0.3; // Mineral Geode
            else if (f === 4) em = 1.0; // Energy Anomaly (Huge Spike)
            else if (f === 5) em = 0.8; // Research Station
            else if (f === 6) em = 0.6; // Abandoned Outpost
            else if (f === 7) em = 0.4; // Geothermal Vent
            else if (f === 8) em = 0.7; // Crystalline Spires
            else if (f === 9) em = 0.9; // Alien Monolith
            
            // Urbanization EM Output
            if (cell.tile.faction === 1) em = Math.max(em, 0.4);
            else if (cell.tile.faction === 2) em = Math.max(em, 0.6);
            else if (cell.tile.faction === 3) em = Math.max(em, 0.85);
            else if (cell.tile.faction === 4) em = Math.max(em, 1.0);

            // Ships
            if (dggsData.metadata && dggsData.metadata.landingCell === i) em = 1.0;

            em = Math.max(0, Math.min(1, em));

            // Color map: 0 = Dark blue (hsl(240, 50%, 15%)) -> 1 = Bright cyan (hsl(180, 100%, 80%))
            const hue = 240 - (em * 60);
            const sat = 50 + (em * 50);
            const light = 15 + (em * 65);

            fillColor = `hsl(${hue}, ${sat}%, ${light}%)`;
            borderColor = `hsl(${hue}, ${sat}%, ${light + 10}%)`;
        } else if (currentLens === 'pollution') {
            // Pollution: Now uses the pre-computed spillover diffusion array
            const pol = (dggsData.metadata.computedPollution && dggsData.metadata.computedPollution[i] !== undefined) 
                ? dggsData.metadata.computedPollution[i] 
                : 0.0;
            
            // Color map: 0 = Clean (Light Green) -> 1 = Toxic (Deep Orange/Brown)
            const hue = 110 - (pol * 110); // 110 (green) -> 0 (red)
            const sat = 70 - (pol * 20); // 70 -> 50
            const light = 60 - (pol * 35); // 60 -> 25
            
            fillColor = `hsl(${hue}, ${sat}%, ${light}%)`;
            borderColor = `hsl(${hue}, ${sat}%, ${light - 10}%)`;
        } else if (currentLens === 'holo') {
            const isOcean = cell.tile.biome === 0 || cell.tile.biome === 1;
            fillColor = isOcean ? 'rgba(0, 150, 255, 0.05)' : 'rgba(0, 229, 255, 0.05)';
            borderColor = isOcean ? 'rgba(0, 150, 255, 0.3)' : 'rgba(0, 229, 255, 0.6)';
        } else {
            const biome = getBiomeInfo(cell.tile.biome);
            fillColor = biome.color;
            borderColor = biome.border;
        }

        const groupKey = fillColor + '|' + borderColor;
        if (!groupsByColor[groupKey]) {
            groupsByColor[groupKey] = { fillColor, borderColor, cells: [], biomeBuckets: {} };
        }
        groupsByColor[groupKey].cells.push(cellData);

        if (!groupsByColor[groupKey].biomeBuckets[cell.tile.biome]) {
            groupsByColor[groupKey].biomeBuckets[cell.tile.biome] = [];
        }
        groupsByColor[groupKey].biomeBuckets[cell.tile.biome].push(cellData);
    }

    // ── 1. Batch Render Cells ──
    if (currentLens === 'biome' && !isCacheInitialized) initBiomeCache();

    for (const key in groupsByColor) {
        const group = groupsByColor[key];

        ctx.beginPath();
        for (const c of group.cells) {
            ctx.moveTo(c.projVerts[0].x, c.projVerts[0].y);
            for (let k = 1; k < c.projVerts.length; k++) ctx.lineTo(c.projVerts[k].x, c.projVerts[k].y);
            ctx.closePath();
        }

        ctx.fillStyle = group.fillColor;
        
        if (currentLens === 'holo') ctx.globalCompositeOperation = 'lighter';
        ctx.fill();

        ctx.strokeStyle = group.borderColor;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        if (currentLens === 'holo') ctx.globalCompositeOperation = 'source-over';

        if (currentLens === 'biome' && scale > 0.6) {
            for (const b in group.biomeBuckets) {
                const bucketCells = group.biomeBuckets[b];
                if (bucketCells.length === 0) continue;

                ctx.save();
                ctx.beginPath();
                for (const c of bucketCells) {
                    ctx.moveTo(c.projVerts[0].x, c.projVerts[0].y);
                    for (let k = 1; k < c.projVerts.length; k++) ctx.lineTo(c.projVerts[k].x, c.projVerts[k].y);
                    ctx.closePath();
                }
                ctx.clip();
                for (const c of bucketCells) {
                    const variant = c.i % NUM_VARIANTS;
                    const cacheCanvas = biomeVariantCache[b]?.[variant];
                    if (cacheCanvas) {
                        const drawSize = (c.hexR / 0.9) * 2;
                        ctx.drawImage(cacheCanvas, c.hexCx - drawSize / 2, c.hexCy - drawSize / 2, drawSize, drawSize);
                    }
                }
                ctx.restore();
            }
        }
    }

    // ── 2. Overlays (Scanned, Fog of War) ──
    const scannedGroup = [];
    const fowGroup = [];

    for (const c of visibleCells) {
        const isScanned = (dggsData.metadata?.sectorScans?.[c.i] || 0) >= 1;
        if (isScanned) {
            scannedGroup.push(c);
        } else if (userRole === 'player') {
            fowGroup.push(c);
        }
    }

    if (scannedGroup.length > 0) {
        ctx.beginPath();
        for (const c of scannedGroup) {
            ctx.moveTo(c.projVerts[0].x, c.projVerts[0].y);
            for (let k = 1; k < c.projVerts.length; k++) ctx.lineTo(c.projVerts[k].x, c.projVerts[k].y);
            ctx.closePath();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fill();
    }

    if (fowGroup.length > 0) {
        ctx.beginPath();
        for (const c of fowGroup) {
            ctx.moveTo(c.projVerts[0].x, c.projVerts[0].y);
            for (let k = 1; k < c.projVerts.length; k++) ctx.lineTo(c.projVerts[k].x, c.projVerts[k].y);
            ctx.closePath();
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
    }

    // ── 3. Features & Interactive Highlights ──
    for (const c of visibleCells) {
        const i = c.i;
        const cell = c.cell;
        const tile = cell.tile;
        const projVerts = c.projVerts;

        const isSelected = selectedIndices.includes(i);
        if (i === hoveredIdx || isSelected) {
            ctx.beginPath();
            ctx.moveTo(projVerts[0].x, projVerts[0].y);
            for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
            ctx.closePath();
            ctx.strokeStyle = isSelected ? '#00e5ff' : 'rgba(255,255,255,0.35)';
            ctx.lineWidth = isSelected ? 1.5 : 0.8;
            ctx.stroke();
        }

        if (tile.feature > 0) {
            const currentScanLevel = dggsData.metadata?.sectorScans?.[i] || 0;
            const overrideLevel = dggsData.metadata?.stealthOverrides?.[i];
            const isUnderground = dggsData.metadata?.underground?.[i];
            let defaultNeeded = getFeatureBaseStealth(tile.feature) + (isUnderground ? 1 : 0);
            defaultNeeded = Math.min(defaultNeeded, 5);
            
            const neededLevel = overrideLevel !== undefined ? overrideLevel : defaultNeeded;
            const isRevealedToPlayers = currentScanLevel >= neededLevel;
            const fc = FEATURE_COLORS[tile.feature] || '#fff';
            
            const drawFeatureIcon = (type, color, isHidden) => {
                ctx.save();
                ctx.translate(c.hexCx, c.hexCy);
                if (isHidden) {
                    ctx.globalAlpha = 0.4;
                    ctx.strokeStyle = color;
                    ctx.setLineDash([1.5, 1.5]);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                
                ctx.fillStyle = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                const size = 2.5;
                
                ctx.beginPath();
                switch(type) {
                    case 1: // Ruins: Square
                        ctx.rect(-size, -size, size*2, size*2);
                        ctx.fill();
                        break;
                    case 2: // Crater: Empty circle with dot
                        ctx.arc(0, 0, size, 0, Math.PI*2);
                        ctx.stroke();
                        ctx.beginPath(); ctx.arc(0, 0, size*0.3, 0, Math.PI*2); ctx.fill();
                        break;
                    case 3: // Geode: Diamond
                        ctx.moveTo(0, -size*1.2); ctx.lineTo(size*1.2, 0); ctx.lineTo(0, size*1.2); ctx.lineTo(-size*1.2, 0);
                        ctx.fill();
                        break;
                    case 4: // Anomaly: Star/Cross
                        ctx.moveTo(-size*1.2, -size*1.2); ctx.lineTo(size*1.2, size*1.2);
                        ctx.moveTo(size*1.2, -size*1.2); ctx.lineTo(-size*1.2, size*1.2);
                        ctx.moveTo(0, -size*1.5); ctx.lineTo(0, size*1.5);
                        ctx.moveTo(-size*1.5, 0); ctx.lineTo(size*1.5, 0);
                        ctx.stroke();
                        break;
                    case 5: // Station: Triangle
                        ctx.moveTo(0, -size*1.2); ctx.lineTo(size*1.2, size*0.8); ctx.lineTo(-size*1.2, size*0.8);
                        ctx.fill();
                        break;
                    case 6: // Outpost: Crosshair
                        ctx.arc(0, 0, size, 0, Math.PI*2); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(0, -size*1.5); ctx.lineTo(0, size*1.5); ctx.moveTo(-size*1.5, 0); ctx.lineTo(size*1.5, 0); ctx.stroke();
                        break;
                    case 7: // Vent: Triangle up empty
                        ctx.moveTo(0, -size*1.2); ctx.lineTo(size*1.2, size*0.8); ctx.lineTo(-size*1.2, size*0.8); ctx.closePath();
                        ctx.stroke();
                        break;
                    case 8: // Spires: 3 vertical spikes
                        ctx.moveTo(-size*0.6, size); ctx.lineTo(-size*0.6, -size*0.5);
                        ctx.moveTo(0, size); ctx.lineTo(0, -size*1.2);
                        ctx.moveTo(size*0.6, size); ctx.lineTo(size*0.6, -size*0.2);
                        ctx.stroke();
                        break;
                    case 9: // Monolith: Tall rectangle
                        ctx.rect(-size*0.5, -size*1.5, size, size*3);
                        ctx.fill();
                        break;
                    case 10: // Natural Marvel: Two mountain peaks
                        ctx.beginPath();
                        ctx.moveTo(-size, size); ctx.lineTo(-size*0.3, -size*0.8); ctx.lineTo(size*0.4, size);
                        ctx.moveTo(-size*0.2, size); ctx.lineTo(size*0.5, -size*1.2); ctx.lineTo(size*1.2, size);
                        ctx.stroke();
                        break;
                    default:
                        ctx.arc(0, 0, size, 0, Math.PI * 2);
                        ctx.fill();
                }
                ctx.restore();
            };
 
            if (userRole === 'gm') {
                drawFeatureIcon(tile.feature, fc, !isRevealedToPlayers);
            } else if (isRevealedToPlayers) {
                drawFeatureIcon(tile.feature, fc, false);
            }
        }
 
        if (tile.faction > 0) {
            const isUnderground = dggsData.metadata?.underground?.[i];
            const isAbandoned = dggsData.metadata?.abandoned?.[i];
            const urbNeeded = getUrbStealth(tile.faction, isUnderground, isAbandoned);
            const currentScanLevel = dggsData.metadata?.sectorScans?.[i] || 0;
            const isUrbRevealed = currentScanLevel >= urbNeeded;

            if (!isUrbRevealed && userRole !== 'gm') {
                // Players don't see hidden urbanization
                continue;
            }

            ctx.save();
            if (!isUrbRevealed) {
                ctx.globalAlpha = 0.4;
            }
            
            ctx.translate(c.hexCx + (tile.feature > 0 ? 3 : 0), c.hexCy + (tile.feature > 0 ? -3 : 0));
            
            // Map specialization to color
            const specColors = {
                agricultural: '#00e676',
                mining: '#ffd600',
                research: '#e040fb',
                industrial: '#00e5ff',
                tourism: '#ff4081'
            };
            const spec = tile.specialization;
            const cityColor = specColors[spec] || '#00e5ff';
            
            ctx.fillStyle = cityColor;
            ctx.shadowColor = cityColor;
            ctx.shadowBlur = 4;
            
            const level = tile.faction;
            if (level === 1) {
                // Outpost (Custom shape based on specialization)
                if (spec === 'agricultural') {
                    // Triangle
                    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(2, 1.5); ctx.lineTo(-2, 1.5); ctx.closePath(); ctx.fill();
                } else if (spec === 'mining') {
                    // Diamond
                    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(2, 0); ctx.lineTo(0, 2); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
                } else if (spec === 'research') {
                    // Circle
                    ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
                } else if (spec === 'tourism') {
                    // Small star
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 2.2, Math.sin((18 + i * 72) * Math.PI / 180) * 2.2);
                        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * 0.9, Math.sin((54 + i * 72) * Math.PI / 180) * 0.9);
                    }
                    ctx.closePath(); ctx.fill();
                } else {
                    // Default Outpost: Small Square
                    ctx.fillRect(-1.5, -1.5, 3, 3);
                }
            } else if (level === 2) {
                // Town (Custom shapes)
                if (spec === 'agricultural') {
                    // 3 small green dots (sprout cluster)
                    ctx.beginPath(); ctx.arc(-1.2, 0.8, 1, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(1.2, 0.8, 1, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(0, -1.2, 1.1, 0, Math.PI*2); ctx.fill();
                } else if (spec === 'mining') {
                    // Hammer / Cross shape
                    ctx.fillRect(-2, -0.6, 4, 1.2);
                    ctx.fillRect(-0.6, -2, 1.2, 4);
                } else if (spec === 'research') {
                    // Double ring
                    ctx.strokeStyle = cityColor;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 0.9, 0, Math.PI * 2); ctx.fill();
                } else if (spec === 'tourism') {
                    // Hexagon
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        ctx.lineTo(Math.cos(i * Math.PI / 3) * 2.2, Math.sin(i * Math.PI / 3) * 2.2);
                    }
                    ctx.closePath(); ctx.fill();
                } else {
                    // Default Town: 4 small squares
                    ctx.fillRect(-2, -2, 1.5, 1.5);
                    ctx.fillRect(0.5, -2, 1.5, 1.5);
                    ctx.fillRect(-2, 0.5, 1.5, 1.5);
                    ctx.fillRect(0.5, 0.5, 1.5, 1.5);
                }
            } else if (level === 3) {
                // Metropolis (Glowing Hub)
                ctx.beginPath();
                ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, Math.PI * 2);
                ctx.fill();
            } else if (level >= 4) {
                // Megacity (Planetary Capital Star-Hub)
                ctx.beginPath();
                ctx.moveTo(0, -4.5); ctx.lineTo(1.5, -1.5); ctx.lineTo(4.5, 0); 
                ctx.lineTo(1.5, 1.5); ctx.lineTo(0, 4.5); ctx.lineTo(-1.5, 1.5); 
                ctx.lineTo(-4.5, 0); ctx.lineTo(-1.5, -1.5); ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (dggsData.metadata && dggsData.metadata.landingCell === i) {
            ctx.save();
            ctx.translate(c.hexCx, c.hexCy);

            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(6, 6);
            ctx.lineTo(2, 4);
            ctx.lineTo(-2, 4);
            ctx.lineTo(-6, 6);
            ctx.closePath();

            ctx.fillStyle = '#ffd600';
            ctx.fill();
            ctx.strokeStyle = '#020208';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 6, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3d00';
            ctx.fill();

            ctx.restore();
        }
    }

    // ── Draw Vector River Overlay ──
    if (dggsData.metadata && dggsData.metadata.rivers && (currentLens === 'biome' || currentLens === 'elevation')) {
        const maxOffset = 1.3 / Math.sqrt(cells.length);
        
        for (const branch of dggsData.metadata.rivers) {
            if (branch.length < 2) continue;
            
            // Calculate meandering 3D points
            const basePoints = [];
            for (let i = 0; i < branch.length; i++) {
                const node = branch[i];
                const cell = cells[node.idx];
                if (!cell) continue;
                
                let nx = cell.center.x;
                let ny = cell.center.y;
                let nz = cell.center.z;
                
                // Stop the river slightly past the coastline (hex edge) rather than drawing to the center of the ocean
                if (node.isOcean && i > 0) {
                    const prevCell = cells[branch[i-1].idx];
                    if (prevCell) {
                        nx = prevCell.center.x * 0.4 + nx * 0.6;
                        ny = prevCell.center.y * 0.4 + ny * 0.6;
                        nz = prevCell.center.z * 0.4 + nz * 0.6;
                    }
                }
                
                basePoints.push({
                    idx: node.idx,
                    origX: nx,
                    origY: ny,
                    origZ: nz,
                    water: node.water,
                    hidden: node.hidden,
                    isOcean: node.isOcean
                });
            }
            
            // Fractal Subdivide
            function fractalSubdivide(p1, p2, iterations, maxDisp) {
                if (iterations === 0) return [];
                
                const mx = (p1.origX + p2.origX) / 2;
                const my = (p1.origY + p2.origY) / 2;
                const mz = (p1.origZ + p2.origZ) / 2;
                
                const dx = p2.origX - p1.origX;
                const dy = p2.origY - p1.origY;
                const dz = p2.origZ - p1.origZ;
                
                let px = my * dz - mz * dy;
                let py = mz * dx - mx * dz;
                let pz = mx * dy - my * dx;
                const plen = Math.sqrt(px * px + py * py + pz * pz);
                if (plen > 1e-6) { px /= plen; py /= plen; pz /= plen; }
                
                // Deterministic seed based on coordinates and iteration depth
                const edgeId = (p1.origX + p2.origX) * 1000 + (p1.origY + p2.origY) * 100;
                const seed = Math.sin(edgeId * 13.9898 + iterations * 17.3) * 43758.5453;
                const noise = (seed - Math.floor(seed)) - 0.5;
                
                const disp = maxDisp * noise;
                
                let cx = mx + px * disp;
                let cy = my + py * disp;
                let cz = mz + pz * disp;
                
                const cLen = Math.sqrt(cx*cx + cy*cy + cz*cz);
                cx /= cLen; cy /= cLen; cz /= cLen;
                
                const midNode = { 
                    origX: cx, origY: cy, origZ: cz, 
                    water: (p1.water + p2.water) / 2, 
                    hidden: p1.hidden && p2.hidden,
                    isOcean: false 
                };
                
                const left = fractalSubdivide(p1, midNode, iterations - 1, maxDisp * 0.5);
                const right = fractalSubdivide(midNode, p2, iterations - 1, maxDisp * 0.5);
                
                return [...left, midNode, ...right];
            }
            
            const fractalPoints = [];
            for (let i = 0; i < basePoints.length - 1; i++) {
                fractalPoints.push(basePoints[i]);
                const segmentLen = 0.05; // average hex distance
                const inner = fractalSubdivide(basePoints[i], basePoints[i+1], 3, segmentLen * 0.8);
                fractalPoints.push(...inner);
            }
            fractalPoints.push(basePoints[basePoints.length - 1]);
            
            // Project to 2D
            const points = [];
            for (const p of fractalPoints) {
                const rv = rotate3D(p.origX, p.origY, p.origZ);
                points.push({
                    x: rv.x * GLOBE_RADIUS,
                    y: rv.y * GLOBE_RADIUS,
                    z: rv.z,
                    origX: p.origX,
                    origY: p.origY,
                    origZ: p.origZ,
                    water: p.water,
                    hidden: p.hidden,
                    isOcean: p.isOcean
                });
            }
            
            // Extract visible sub-paths (to handle backface culling and subglacial hiding)
            const subPaths = [];
            let currentPath = [];
            let maxWater = 0;
            
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                maxWater = Math.max(maxWater, p.water);
                
                if (p.z >= -0.1 && !p.hidden) {
                    currentPath.push(p);
                } else {
                    if (currentPath.length > 1) subPaths.push(currentPath);
                    currentPath = [];
                }
            }
            if (currentPath.length > 1) subPaths.push(currentPath);
            
            const innerWidth = Math.min(3.5, 0.8 + maxWater * 0.2);
            const outerWidth = innerWidth + 1.2;
            
            // Solid RimWorld-style polylines
            ctx.lineJoin = 'miter';
            ctx.miterLimit = 2;
            ctx.lineCap = 'round';
            
            for (const sp of subPaths) {
                const drawLine = (color, width) => {
                    ctx.beginPath();
                    ctx.moveTo(sp[0].x, sp[0].y);
                    for (let i = 1; i < sp.length; i++) {
                        ctx.lineTo(sp[i].x, sp[i].y);
                    }
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width;
                    ctx.stroke();
                };
                
                drawLine('#091a2e', outerWidth); // Darker border
                drawLine('#2a6b9a', innerWidth); // Lighter muddy blue core
            }
        }
    }

    // ── Draw Hover & Selection Highlights on Top ──
    if (hoveredIdx >= 0 && hoveredIdx < cells.length) {
        const cell = cells[hoveredIdx];
        const projVerts = [];
        let allFront = true;
        for (const v of cell.vertices) {
            const rv = rotate3D(v.x, v.y, v.z);
            if (rv.z < -0.2) { allFront = false; break; }
            projVerts.push({ x: rv.x * GLOBE_RADIUS, y: rv.y * GLOBE_RADIUS });
        }
        if (allFront && projVerts.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(projVerts[0].x, projVerts[0].y);
            for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
            ctx.closePath();
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
    }

    if (selectedIndices && selectedIndices.length > 0) {
        selectedIndices.forEach(idx => {
            if (idx >= 0 && idx < cells.length) {
                const cell = cells[idx];
                const projVerts = [];
                let allFront = true;
                for (const v of cell.vertices) {
                    const rv = rotate3D(v.x, v.y, v.z);
                    if (rv.z < -0.2) { allFront = false; break; }
                    projVerts.push({ x: rv.x * GLOBE_RADIUS, y: rv.y * GLOBE_RADIUS });
                }
                if (allFront && projVerts.length >= 3) {
                    ctx.beginPath();
                    ctx.moveTo(projVerts[0].x, projVerts[0].y);
                    for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
                    ctx.closePath();
                    
                    if (idx === selectedIdx) {
                        ctx.strokeStyle = '#ffd600';
                        ctx.lineWidth = 3.5;
                    } else {
                        ctx.strokeStyle = 'rgba(255, 214, 0, 0.5)';
                        ctx.lineWidth = 2.0;
                    }
                    ctx.stroke();
                }
            }
        });
    }

    // Draw rotation axis
    ctx.save();
    const poleLength = 1.25;
    const northLocal = { x: 0, y: poleLength, z: 0 };
    const southLocal = { x: 0, y: -poleLength, z: 0 };

    const rNorth = rotate3D(northLocal.x, northLocal.y, northLocal.z);
    const rSouth = rotate3D(southLocal.x, southLocal.y, southLocal.z);

    const nx = rNorth.x * GLOBE_RADIUS;
    const ny = rNorth.y * GLOBE_RADIUS;
    const sx = rSouth.x * GLOBE_RADIUS;
    const sy = rSouth.y * GLOBE_RADIUS;

    // Draw the axis line
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Draw glowing crosshairs / dots at the poles
    ctx.beginPath();
    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffcc';
    ctx.fill();
    ctx.strokeStyle = '#020208';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '9px "Chakra Petch", monospace';
    ctx.fillStyle = '#88aacc';
    ctx.fillText('N. POLE', nx + 8, ny + 3);

    ctx.beginPath();
    ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffcc';
    ctx.fill();
    ctx.strokeStyle = '#020208';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillText('S. POLE', sx + 8, sy + 3);
    ctx.restore();

    // ── 4. Render Region Labels & Custom Names Overlays ──
    if (dggsData.metadata) {
        // Draw Custom Names (if zoomed in enough)
        if (scale > 0.5 && dggsData.metadata.names) {
            for (const c of visibleCells) {
                const name = dggsData.metadata.names[c.i];
                if (name) {
                    ctx.save();
                    ctx.font = 'bold 9px "Chakra Petch", sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = '#000000';
                    ctx.shadowBlur = 3;
                    ctx.fillText(name, c.hexCx, c.hexCy - c.hexR - 5);
                    ctx.restore();
                }
            }
        }

        // Draw Region Labels (always, but styled differently)
        if (dggsData.metadata.labels) {
            for (const label of dggsData.metadata.labels) {
                const cell = cells[label.cell];
                if (!cell) continue;
                
                const rCenter = rotate3D(cell.center.x, cell.center.y, cell.center.z);
                if (rCenter.z >= 0) { // visible front hemisphere
                    const lx = rCenter.x * GLOBE_RADIUS;
                    const ly = rCenter.y * GLOBE_RADIUS;
                    
                    ctx.save();
                    if (label.type === 'territory') {
                        ctx.font = 'bold 10px "Russo One", sans-serif';
                        ctx.fillStyle = 'rgba(255, 235, 59, 0.9)'; // Golden territory text
                        ctx.shadowColor = '#000';
                        ctx.shadowBlur = 4;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label.text.toUpperCase(), lx, ly);
                    } else {
                        ctx.font = 'italic 10px "Chakra Petch", sans-serif';
                        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)'; // Soft blue ocean text
                        ctx.shadowColor = '#000';
                        ctx.shadowBlur = 4;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label.text, lx, ly);
                    }
                    ctx.restore();
                }
            }
        }
    }

    ctx.restore();
    broadcastPlanetaryState();
    requestAnimationFrame(draw);
}

// ── Hit Testing ──
function getCellUnderMouse(mx, my) {
    if (!dggsData) return -1;
    let closest = -1, minD = Infinity;
    for (let i = 0; i < dggsData.cells.length; i++) {
        const c = dggsData.cells[i].center;
        const r = rotate3D(c.x, c.y, c.z);
        if (r.z <= 0) continue;
        const sx = offsetX + r.x * GLOBE_RADIUS * scale;
        const sy = offsetY + r.y * GLOBE_RADIUS * scale;
        const dx = mx - sx, dy = my - sy;
        const d = dx * dx + dy * dy;
        if (d < minD) { minD = d; closest = i; }
    }
    const threshold = 20 * scale;
    return minD < threshold * threshold ? closest : -1;
}

// ── Selection Panel ──
function selectCell(idx) {
    if (idx < 0 || !dggsData) {
        selectedIdx = -1;
        selectedIndices = [];
        infoPanel.classList.remove('visible');
        return;
    }
    
    // Ensure selectedIndices contains at least the primary cell
    if (!selectedIndices.includes(idx)) {
        selectedIndices = [idx];
    }
    selectedIdx = idx;
    
    const cell = dggsData.cells[idx];
    const t = cell.tile;
    
    // Helper to extract common values across all selected cells
    const getCommonValue = (extractor, defaultValue = '-') => {
        if (selectedIndices.length === 0) return defaultValue;
        const first = extractor(selectedIndices[0]);
        for (let k = 1; k < selectedIndices.length; k++) {
            if (extractor(selectedIndices[k]) !== first) {
                return '<Multiple>';
            }
        }
        return first;
    };
    
    // Helper to update dropdowns with multiple-value option support
    const setSelectValue = (selectElem, commonValue) => {
        let multiOpt = selectElem.querySelector('option[value="-1"]');
        if (commonValue === '<Multiple>') {
            if (!multiOpt) {
                multiOpt = document.createElement('option');
                multiOpt.value = "-1";
                multiOpt.disabled = true;
                multiOpt.selected = true;
                multiOpt.style.display = "none";
                multiOpt.textContent = "<Multiple Values>";
                selectElem.appendChild(multiOpt);
            }
            selectElem.value = "-1";
        } else {
            if (multiOpt) {
                selectElem.removeChild(multiOpt);
            }
            selectElem.value = commonValue;
        }
    };
    
    // Helper to update input/textarea values
    const setInputValue = (inputElem, commonValue) => {
        if (commonValue === '<Multiple>') {
            inputElem.value = '';
            inputElem.placeholder = '<Multiple Values>';
        } else {
            inputElem.value = commonValue || '';
            inputElem.placeholder = inputElem.tagName === 'INPUT' ? 'Rename hex...' : 'Add custom description...';
        }
    };

    // Header Title
    if (selectedIndices.length > 1) {
        detailTitle.textContent = `${selectedIndices.length} Cells Selected`;
    } else {
        detailTitle.textContent = `Sector ${idx}`;
    }

    // Address
    detailAddress.textContent = getCommonValue(i => dggsData.metadata?.addresses?.[i] || 'N/A', 'N/A');

    // Coordinates & 3D Position
    if (selectedIndices.length > 1) {
        detailCoords.textContent = '<Multiple>';
        detailPos3D.textContent = '<Multiple>';
    } else {
        const latRad = Math.asin(cell.center.y);
        const lonRad = Math.atan2(cell.center.x, cell.center.z);
        const latDeg = (latRad * 180 / Math.PI).toFixed(2);
        const lonDeg = (lonRad * 180 / Math.PI).toFixed(2);
        const latSign = latDeg >= 0 ? 'N' : 'S';
        const lonSign = lonDeg >= 0 ? 'E' : 'W';
        detailCoords.textContent = `${Math.abs(latDeg)}° ${latSign}, ${Math.abs(lonDeg)}° ${lonSign}`;
        detailPos3D.textContent = `${cell.center.x.toFixed(3)}, ${cell.center.y.toFixed(3)}, ${cell.center.z.toFixed(3)}`;
    }

    // Biome, Elevation, Moisture
    const commonBiome = getCommonValue(i => dggsData.cells[i].tile.biome);
    if (commonBiome === '<Multiple>') {
        detailBiome.textContent = '<Multiple>';
        detailBiome.style.color = '#fff';
    } else {
        const biome = getBiomeInfo(commonBiome);
        detailBiome.textContent = biome.name;
        detailBiome.style.color = biome.color === '#eef8ff' ? '#99ccff' : biome.color;
    }
    const commonElev = getCommonValue(i => dggsData.cells[i].tile.elevation);
    detailElevation.textContent = commonElev === '<Multiple>' ? '<Multiple>' : `Level ${commonElev}`;
    const commonMoist = getCommonValue(i => dggsData.cells[i].tile.moisture);
    detailMoisture.textContent = commonMoist === '<Multiple>' ? '<Multiple>' : `Level ${commonMoist}`;

    const factionRow = document.getElementById('faction-row');
    const factionValue = document.getElementById('hex-faction');
    const commonFaction = getCommonValue(i => dggsData.cells[i].tile.faction);
    const hasFaction = commonFaction > 0 && commonFaction !== '<Multiple>';
    
    // Update favorability scores
    if (selectedIndices.length > 1) {
        suitAgriSpan.textContent = '<Multiple>';
        suitMiningSpan.textContent = '<Multiple>';
        suitResearchSpan.textContent = '<Multiple>';
        suitIndustrialSpan.textContent = '<Multiple>';
        suitTourismSpan.textContent = '<Multiple>';
    } else {
        const favs = dggsData.favorabilities[idx];
        if (favs) {
            suitAgriSpan.textContent = `${favs.agri}%`;
            suitMiningSpan.textContent = `${favs.mining}%`;
            suitResearchSpan.textContent = `${favs.research}%`;
            suitIndustrialSpan.textContent = `${favs.industrial}%`;
            suitTourismSpan.textContent = `${favs.tourism}%`;
        } else {
            suitAgriSpan.textContent = '-';
            suitMiningSpan.textContent = '-';
            suitResearchSpan.textContent = '-';
            suitIndustrialSpan.textContent = '-';
            suitTourismSpan.textContent = '-';
        }
    }

    // Configure Tabs & Roles
    const infoTabs = document.getElementById('info-tabs');
    if (userRole === 'gm') {
        infoTabs.style.display = 'flex';
    } else {
        infoTabs.style.display = 'none';
        activateTab('general');
    }

    // Populate GM Edit values
    setSelectValue(editFeature, getCommonValue(i => dggsData.cells[i].tile.feature));
    setSelectValue(editFaction, getCommonValue(i => dggsData.cells[i].tile.faction));
    
    const editUnderground = document.getElementById('edit-underground');
    if (editUnderground) editUnderground.checked = getCommonValue(i => dggsData.metadata.underground?.[i]) === true;
    
    const editAbandoned = document.getElementById('edit-abandoned');
    if (editAbandoned) editAbandoned.checked = getCommonValue(i => dggsData.metadata.abandoned?.[i]) === true;
    
    const commonSpec = getCommonValue(i => dggsData.metadata.factions[i]?.spec || 'auto');
    const anyHasFaction = selectedIndices.some(i => dggsData.cells[i].tile.faction > 0);
    if (anyHasFaction) {
        gmFactionSpecRow.style.display = 'flex';
        setSelectValue(editFactionSpec, commonSpec);
    } else {
        gmFactionSpecRow.style.display = 'none';
    }

    setInputValue(editName, getCommonValue(i => dggsData.metadata.names?.[i] || ''));
    setInputValue(editDesc, getCommonValue(i => dggsData.metadata.descriptions?.[i] || ''));

    // Populate GM Ops label editor list
    updateLabelEditorList(idx);

    // Populate Player/General (DATA) read-only views
    // Settlement Name with Specialization
    if (commonFaction === '<Multiple>') {
        factionRow.style.display = 'flex';
        factionValue.textContent = '<Multiple Settlements>';
    } else if (hasFaction) {
        factionRow.style.display = 'flex';
        const factionNames = { 1: 'Outpost', 2: 'Town', 3: 'Metropolis', 4: 'Megacity' };
        let facText = factionNames[commonFaction] || `Level ${commonFaction}`;
        const spec = dggsData.metadata.factions[idx]?.spec === 'auto' ? resolveSpecialization(idx) : (dggsData.metadata.factions[idx]?.spec);
        if (spec) {
            if (commonFaction === 1 && spec === 'research') {
                facText = 'Research Station';
            } else {
                const capSpec = spec.charAt(0).toUpperCase() + spec.slice(1);
                facText = `${capSpec} ${facText}`;
            }
        }
        factionValue.textContent = facText;
    } else {
        factionRow.style.display = 'none';
    }

    // Custom Names
    const commonName = getCommonValue(i => dggsData.metadata.names?.[i] || '');
    if (commonName === '<Multiple>') {
        playerNameRow.style.display = 'flex';
        hexNameSpan.textContent = '<Multiple Custom Names>';
    } else if (commonName) {
        playerNameRow.style.display = 'flex';
        hexNameSpan.textContent = commonName;
    } else {
        playerNameRow.style.display = 'none';
    }

    // Custom Descriptions
    const commonDesc = getCommonValue(i => dggsData.metadata.descriptions?.[i] || '');
    if (commonDesc === '<Multiple>') {
        playerDescRow.style.display = 'flex';
        hexDescDiv.textContent = '<Multiple Custom Descriptions>';
    } else if (commonDesc) {
        playerDescRow.style.display = 'flex';
        hexDescDiv.textContent = commonDesc;
    } else {
        playerDescRow.style.display = 'none';
    }

    // FOW / Scan Controls Status logic:
    featureStatusRow.style.display = 'none';
    playerFeatureStatusRow.style.display = 'none';
    playerFeatureActionRow.style.display = 'none';

    const currentScanLevel = dggsData.metadata?.sectorScans?.[idx] || 0;
    const isUnderground = dggsData.metadata?.underground?.[idx] || false;
    const isAbandoned = dggsData.metadata?.abandoned?.[idx] || false;
    
    const lvlNames = { 0: 'Unscanned', 1: 'Marginal', 2: 'Ordinary', 3: 'Good', 4: 'Amazing', 5: 'Impossible' };

    const commonFeature = getCommonValue(i => dggsData.cells[i].tile.feature);
    let neededLevel = 1;
    let overrideLevel = dggsData.metadata?.stealthOverrides?.[idx];
    
    if (commonFeature > 0 && commonFeature !== '<Multiple>') {
        let defaultNeeded = getFeatureBaseStealth(commonFeature) + (isUnderground ? 1 : 0);
        defaultNeeded = Math.min(defaultNeeded, 5);
        neededLevel = overrideLevel !== undefined ? overrideLevel : defaultNeeded;
    }

    const isFeatureRevealedToPlayers = (commonFeature > 0 && commonFeature !== '<Multiple>') ? (currentScanLevel >= neededLevel) : false;

    if (userRole === 'gm') {
        featureStatusRow.style.display = 'flex';
        
        const neededContainer = document.getElementById('gm-needed-container');
        if (neededContainer) {
            if (commonFeature > 0 && commonFeature !== '<Multiple>') {
                neededContainer.style.display = 'flex';
            } else {
                neededContainer.style.display = 'none';
            }
        }
        
        // Update Needed Level UI
        const neededBtns = document.getElementById('gm-needed-level')?.querySelectorAll('.scan-btn');
        if (neededBtns) {
            neededBtns.forEach(b => b.classList.remove('active'));
            const neededVal = neededLevel;
            const btnToActivate = Array.from(neededBtns).find(b => parseInt(b.getAttribute('data-level')) === neededVal);
            if (btnToActivate) btnToActivate.classList.add('active');
        }

        // Update Current Level UI
        const currentBtns = document.getElementById('gm-current-level')?.querySelectorAll('.scan-btn');
        if (currentBtns) {
            currentBtns.forEach(b => b.classList.remove('active'));
            const btnToActivate = Array.from(currentBtns).find(b => parseInt(b.getAttribute('data-level')) === currentScanLevel);
            if (btnToActivate) btnToActivate.classList.add('active');
        }
    }

    if (commonFeature > 0 && commonFeature !== '<Multiple>') {
        if (isFeatureRevealedToPlayers || userRole === 'gm') {
            const featData = FEATURES[commonFeature] || { name: 'None' };
            const featColor = FEATURE_COLORS[commonFeature] || '#e0f2f1';
            const reqLvl = lvlNames[neededLevel] || `Lvl ${neededLevel}`;
            
            detailFeature.innerHTML = `<span style="color: ${featColor}; font-weight: bold;">${featData.name}</span> <span style="font-size: 0.8em; color: #88aacc;">(Check: ${reqLvl})</span>`;
            
            playerFeatureStatusRow.style.display = 'flex';
            playerFeatureStatusValue.textContent = lvlNames[currentScanLevel].toUpperCase();
            playerFeatureStatusValue.style.color = currentScanLevel > 0 ? '#00e676' : '#88aacc';
        } else {
            detailFeature.innerHTML = `<span style="color: #88aacc;">None</span>`;
            playerFeatureStatusRow.style.display = 'flex';
            playerFeatureStatusValue.textContent = lvlNames[currentScanLevel].toUpperCase();
            playerFeatureStatusValue.style.color = currentScanLevel > 0 ? '#00e676' : '#88aacc';
        }
    } else {
        detailFeature.innerHTML = `<span style="color: #88aacc;">None</span>`;
        playerFeatureStatusRow.style.display = 'flex';
        playerFeatureStatusValue.textContent = lvlNames[currentScanLevel].toUpperCase();
        playerFeatureStatusValue.style.color = currentScanLevel > 0 ? '#00e676' : '#88aacc';
    }

    if (!isViewer && userRole !== 'gm') {
        playerFeatureActionRow.style.display = 'flex';
    }


    let analysis = '';
    if (selectedIndices.length > 1) {
        analysis = `${selectedIndices.length} sectors selected. Batch editing enabled.`;
    } else {
        const biome = getBiomeInfo(t.biome);
        analysis = `A sector classified as ${biome.name.toLowerCase()} terrain. ${biome.desc}`;
        const currentScan = dggsData.metadata?.sectorScans?.[idx] || 0;
        const override = dggsData.metadata?.stealthOverrides?.[idx];
        const needed = override !== undefined ? override : getFeatureBaseStealth(t.feature);
        const isRevealed = (currentScan >= needed);

        if (t.feature > 0 && (isRevealed || userRole === 'gm')) {
            const featData = FEATURES[t.feature] || { name: 'Unknown', scanLevel: 0, shielding: 0 };
            analysis += ` Sensors detected: ${featData.name}.`;
            const lvlNames = { 0: 'None', 1: 'Ordinary', 2: 'Good', 3: 'Amazing' };
            const reqLvl = lvlNames[featData.scanLevel] || `Level ${featData.scanLevel}`;
            analysis += ` [Sensor Check: ${reqLvl} Success Required`;
            if (featData.shielding < 0) {
                analysis += `, Shielding Penalty: ${featData.shielding}`;
            }
            analysis += `]`;
            if (userRole === 'gm' && !isRevealed) {
                analysis += ` (Hidden from players)`;
            }
        }
    }
    detailAnalysis.textContent = analysis;

    // Land btn state
    const isGm = userRole === 'gm';
    const isPlayer = userRole === 'player';
    const canLand = isGm || (isPlayer && hasShipAtPlanet());

    if (canLand) {
        landBtn.style.display = 'block';
        if (dggsData.metadata && dggsData.metadata.landingCell === idx) {
            landBtn.textContent = 'SHIP LANDED';
            landBtn.style.background = 'rgba(255, 214, 0, 0.3)';
            landBtn.style.borderColor = '#ffd600';
            landBtn.style.color = '#ffd600';
        } else {
            landBtn.textContent = 'LAND SHIP HERE';
            landBtn.style.background = 'rgba(255, 214, 0, 0.15)';
            landBtn.style.borderColor = '#ffd600';
            landBtn.style.color = '#ffd600';
        }
    } else {
        landBtn.style.display = 'none';
    }

    // Neighbors badging
    detailNeighbors.innerHTML = '';
    if (selectedIndices.length > 1) {
        detailNeighbors.textContent = 'Adjacency not displayed for multi-selection.';
    } else {
        const neighborsList = dggsData.metadata?.neighbors?.[idx];
        if (neighborsList && neighborsList.length > 0) {
            neighborsList.forEach(nIdx => {
                const btn = document.createElement('button');
                btn.className = 'neighbor-btn';
                const neighborSides = dggsData.cells[nIdx]?.sides === 5 ? 'Pent' : 'Hex';
                btn.textContent = `#${nIdx} (${neighborSides})`;
                btn.addEventListener('click', () => {
                    selectedIndices = [nIdx];
                    selectCell(nIdx);
                });
                detailNeighbors.appendChild(btn);
            });
        } else {
            detailNeighbors.textContent = 'No adjacency data available.';
        }
    }

    infoPanel.classList.add('visible');
}

async function loadShips() {
    if (currentSessionId) {
        try {
            const response = await fetch(`${HEXMAP_WORKER_URL}/session/${currentSessionId}`);
            if (response.ok) {
                const sessionData = await response.json();
                if (sessionData && sessionData.ships) {
                    ships = sessionData.ships;
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to fetch ships from session", e);
        }
    }
    const savedShips = localStorage.getItem('vergeMapShips');
    if (savedShips) {
        try {
            ships = JSON.parse(savedShips) || [];
        } catch (e) {
            ships = [];
        }
    }
}

function hasShipAtPlanet() {
    if (!systemX || !systemY || !systemZ) return false;
    const sysX = parseFloat(systemX).toFixed(2);
    const sysY = parseFloat(systemY).toFixed(2);
    const sysZ = parseFloat(systemZ).toFixed(2);
    return ships.some(ship => {
        if (ship.x === undefined || ship.y === undefined || ship.z === undefined) return false;
        const inSystem = ship.x.toFixed(2) === sysX && ship.y.toFixed(2) === sysY && ship.z.toFixed(2) === sysZ;
        return inSystem && ship.localTarget === planetParam;
    });
}

// ── Data Loading ──
let currentLoadId = 0;
async function loadDGGS(seed, type, resolution, urbanization = 15, pollution = 100, conservation = 0) {
    const loadId = ++currentLoadId;
    try {
        await loadShips();
        const url = `${HEXMAP_WORKER_URL}/planet/${seed}/dggs?type=${type}&resolution=${resolution}&urbanization=${urbanization}&pollution=${pollution}&conservation=${conservation}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Worker returned ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (loadId !== currentLoadId) return; // Prevent older slow fetches from overwriting newer ones (race condition)

        dggsData = decodeVMB(buffer);
        onDataLoaded();
        updateMapInfoHUD();

        selectedIdx = -1; hoveredIdx = -1;
        infoPanel.classList.remove('visible');
        centerViewport();
    } catch (err) {
        console.error("Failed to load DGGS:", err);
        alert(`Could not load map: ${err.message}`);
    }
}

// ── Event Handlers ──
canvas.addEventListener('mousedown', (e) => {
    if (isViewer) return;
    isDragging = true; hasMoved = false;
    dragStartX = e.clientX; dragStartY = e.clientY;
    lastMouseX = e.clientX; lastMouseY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isViewer) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (isDragging) {
        const dx = e.clientX - lastMouseX, dy = e.clientY - lastMouseY;
        rotY += dx * 0.005;
        rotX -= dy * 0.005;
        rotX = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, rotX));
        if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 5) {
            hasMoved = true;
        }
    }
    lastMouseX = e.clientX; lastMouseY = e.clientY;

    const idx = getCellUnderMouse(mx, my);
    hoveredIdx = idx;
    if (idx >= 0 && dggsData) {
        const cell = dggsData.cells[idx];
        const planetType = dggsData.metadata?.type || 'terrestrial';
        const biome = getBiomeInfo(cell.tile.biome);
        tooltip.innerHTML = `<strong>Sector ${idx}</strong> (${cell.sides === 5 ? 'Pent' : 'Hex'})<br><strong>Biome:</strong> ${biome.name}<br><strong>Elev:</strong> ${cell.tile.elevation} <strong>Moist:</strong> ${cell.tile.moisture}`;
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none';
    }
});

function getPathCells(startIdx, endIdx) {
    if (startIdx === endIdx) return [startIdx];
    const parent = {};
    const queue = [startIdx];
    const visited = new Set([startIdx]);
    
    let head = 0;
    let found = false;
    while (head < queue.length) {
        const curr = queue[head++];
        if (curr === endIdx) {
            found = true;
            break;
        }
        const neighbors = cellEdgeNeighbors[curr] || [];
        for (const nIdx of neighbors) {
            if (nIdx !== -1 && nIdx !== undefined && !visited.has(nIdx)) {
                visited.add(nIdx);
                parent[nIdx] = curr;
                queue.push(nIdx);
            }
        }
    }
    
    if (!found) return [endIdx];
    
    const path = [];
    let curr = endIdx;
    while (curr !== undefined) {
        path.push(curr);
        curr = parent[curr];
    }
    return path.reverse();
}

canvas.addEventListener('mouseup', (e) => {
    if (isViewer) return;
    isDragging = false;
    if (!hasMoved) {
        const rect = canvas.getBoundingClientRect();
        const idx = getCellUnderMouse(e.clientX - rect.left, e.clientY - rect.top);
        if (idx >= 0 && dggsData) {
            if (userRole === 'gm') {
                if (e.ctrlKey || e.metaKey) {
                    const sIdx = selectedIndices.indexOf(idx);
                    if (sIdx >= 0) {
                        selectedIndices.splice(sIdx, 1);
                    } else {
                        selectedIndices.push(idx);
                    }
                    if (selectedIndices.length > 0) {
                        selectCell(selectedIndices[selectedIndices.length - 1]);
                    } else {
                        selectCell(-1);
                    }
                } else if (e.shiftKey && selectedIndices.length > 0) {
                    const path = getPathCells(selectedIndices[0], idx);
                    for (const pIdx of path) {
                        if (!selectedIndices.includes(pIdx)) {
                            selectedIndices.push(pIdx);
                        }
                    }
                    selectCell(idx);
                } else {
                    selectedIndices = [idx];
                    selectCell(idx);
                }
            } else {
                selectedIndices = [idx];
                selectCell(idx);
            }
        } else {
            selectedIndices = [];
            selectCell(-1);
        }
    }
});
canvas.addEventListener('mouseleave', () => { isDragging = false; hoveredIdx = -1; tooltip.style.display = 'none'; });

canvas.addEventListener('wheel', (e) => {
    if (isViewer) return;
    e.preventDefault();
    const zf = e.deltaY < 0 ? 1.12 : 0.88;
    targetScale = Math.max(0.3, Math.min(5.0, targetScale * zf));
});

const urbanizationInput = document.getElementById('map-urbanization');
const urbanValueSpan = document.getElementById('urban-value');
if (urbanizationInput) {
    urbanizationInput.addEventListener('input', (e) => {
        const val = sliderToUrb(e.target.value);
        urbanValueSpan.textContent = formatUrb(val);
    });
}

// ── Controls ──
generateBtn.addEventListener('click', () => {
    const seed = seedInput.value.trim() || 'Sol_III';
    const type = typeSelect.value;
    const resolution = parseInt(radiusInput.value) || 4;
    const urbanization = sliderToUrb(document.getElementById('map-urbanization')?.value || 79);
    const pollution = parseInt(document.getElementById('map-pollution')?.value || 100);
    const conservation = parseInt(document.getElementById('map-conservation')?.value || 0);
    loadDGGS(seed, type, resolution, urbanization, pollution, conservation);
    if (mapToolsModal) mapToolsModal.style.display = 'none';
});

if (floatingMapToolsBtn) {
    floatingMapToolsBtn.addEventListener('click', () => {
        if (mapToolsModal) mapToolsModal.style.display = 'flex';
    });
}
if (closeMapToolsBtn) {
    closeMapToolsBtn.addEventListener('click', () => {
        if (mapToolsModal) mapToolsModal.style.display = 'none';
    });
}

closeInfoBtn.addEventListener('click', () => { selectedIdx = -1; infoPanel.classList.remove('visible'); });

function syncUrlWithCurrentPlanet() {
    if (!dggsData || !dggsData.metadata) return;
    const metadata = dggsData.metadata;
    const seed = metadata.seed || 'Sol_III';
    const type = metadata.type || 'terrestrial';
    const resolution = metadata.resolution || 4;
    
    const urbValInput = document.getElementById('map-urbanization')?.value || 79;
    const pollValInput = document.getElementById('map-pollution')?.value || 100;
    const consValInput = document.getElementById('map-conservation')?.value || 0;

    const url = new URL(window.location.href);
    url.searchParams.set('seed', seed);
    url.searchParams.set('type', type);
    url.searchParams.set('resolution', resolution);
    url.searchParams.set('urbanization', urbValInput);
    url.searchParams.set('pollution', pollValInput);
    url.searchParams.set('conservation', consValInput);
    if (planetParam) {
        url.searchParams.set('planet', planetParam);
    }
    
    window.history.replaceState({}, '', url.toString());
}

function updateMapInfoHUD() {
    if (!dggsData) return;
    const seed = dggsData.metadata?.seed || 'unknown';
    const type = dggsData.metadata?.type || 'unknown';
    const res = dggsData.metadata?.resolution || 4;
    const cellCount = dggsData.cells.length;
    const resLabels = { 3: 'Small', 4: 'Medium', 5: 'Large', 6: 'Huge' };
    const resStr = `${resLabels[res] || 'Res ' + res} (Res ${res})`;

    // Update player HUD
    const hudSeed = document.getElementById('info-seed');
    const hudType = document.getElementById('info-type');
    const hudSize = document.getElementById('info-size');
    const hudTiles = document.getElementById('info-tiles');
    if (hudSeed) hudSeed.textContent = seed;
    if (hudType) hudType.textContent = type;
    if (hudSize) hudSize.textContent = resStr;
    if (hudTiles) hudTiles.textContent = cellCount.toLocaleString();

    // Update live HUD
    const hudSeedLive = document.getElementById('info-seed-live');
    const hudTypeLive = document.getElementById('info-type-live');
    const hudSizeLive = document.getElementById('info-size-live');
    const hudTilesLive = document.getElementById('info-tiles-live');
    if (hudSeedLive) hudSeedLive.textContent = seed;
    if (hudTypeLive) hudTypeLive.textContent = type;
    if (hudSizeLive) hudSizeLive.textContent = resStr;
    if (hudTilesLive) hudTilesLive.textContent = cellCount.toLocaleString();

    syncUrlWithCurrentPlanet();
}

const handleVmbUpload = (e, statusEl) => {
    const file = e.target.files[0];
    if (!file) return;
    if (statusEl) statusEl.textContent = `Loading ${file.name}...`;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            dggsData = decodeVMB(evt.target.result);
            onDataLoaded();
            updateMapInfoHUD();
            
            // Calculate Urbanization
            let urbanCount = 0;
            let totalLand = 0;
            for (const cell of dggsData.cells) {
                if (cell.tile.biome > 1) totalLand++; // Not ocean/deep ocean
                if (cell.tile.faction > 0) urbanCount++;
            }
            const urbanPercent = totalLand > 0 ? ((urbanCount / totalLand) * 100).toFixed(1) : 0;
            const urbanPercentEl = document.getElementById('urban-percent');
            if (urbanPercentEl) urbanPercentEl.textContent = `${urbanPercent}%`;
            const urbanBarEl = document.getElementById('urban-bar');
            if (urbanBarEl) urbanBarEl.style.width = `${urbanPercent}%`;
            
            selectedIdx = -1; hoveredIdx = -1;
            infoPanel.classList.remove('visible');
            if (statusEl) statusEl.textContent = 'Loaded!';
            centerViewport();
        } catch (err) {
            console.error("VMB parse error:", err);
            if (statusEl) statusEl.textContent = `Error: ${err.message}`;
            alert("Error parsing .vmb file: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
};

if (vmbUpload) {
    vmbUpload.addEventListener('change', (e) => handleVmbUpload(e, uploadStatus));
}
const vmbUploadLive = document.getElementById('vmb-upload-live');
if (vmbUploadLive) {
    vmbUploadLive.addEventListener('change', (e) => handleVmbUpload(e, null));
}

function decodeToken(token) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// ── Init ──
const urlParams = new URLSearchParams(window.location.search);
const seedParam = urlParams.get('seed') || 'Sol_III';
const typeParam = urlParams.get('type') || 'terrestrial';
const resParam = parseInt(urlParams.get('resolution')) || 4;
const urbParam = urlParams.get('urbanization') !== null ? parseInt(urlParams.get('urbanization')) : 79;
const pollParam = urlParams.get('pollution') !== null ? parseInt(urlParams.get('pollution')) : 100;
const consParam = urlParams.get('conservation') !== null ? parseInt(urlParams.get('conservation')) : 0;
const planetParam = urlParams.get('planet') || '';

const systemX = urlParams.get('systemX');
const systemY = urlParams.get('systemY');
const systemZ = urlParams.get('systemZ');

let currentSessionId = urlParams.get('session_id') || null;
let sessionParam = urlParams.get('session');

// Fallback to sessionStorage if not in URL
if (!sessionParam) {
    sessionParam = sessionStorage.getItem('vergeMapSessionToken');
}

if (sessionParam) {
    const decoded = decodeToken(sessionParam);
    if (decoded && decoded.role) {
        userRole = decoded.role.toLowerCase();
        if (decoded.session_id) currentSessionId = decoded.session_id;
        // Persist back to sessionStorage just in case
        sessionStorage.setItem('vergeMapSessionToken', sessionParam);
    } else {
        sessionStorage.removeItem('vergeMapSessionToken');
    }
} else {
    const roleParam = urlParams.get('role') || 'player';
    userRole = roleParam.toLowerCase();
}
originalRole = userRole;

const isViewer = userRole === 'viewer' || userRole === 'ro';

if (isViewer) {
    document.getElementById('control-panel').style.display = 'none';
    document.getElementById('lens-bar').style.display = 'none';
    document.getElementById('toggle-sidebar-btn').style.display = 'none';
    document.getElementById('back-to-system-btn').style.display = 'none';
    const gmToggle = document.getElementById('gm-toggle-container');
    if (gmToggle) gmToggle.style.display = 'none';
}

const nameParam = urlParams.get('name') || '';

if (nameParam) {
    const titleEl = document.getElementById('app-title-name');
    if (titleEl) titleEl.textContent = nameParam.toUpperCase();
}

if (planetParam) {
    if (seedInput) seedInput.disabled = true;
    if (typeSelect) typeSelect.disabled = true;
    if (radiusInput) radiusInput.disabled = true;
}

let mqttClient = null;
let lastSyncTime = 0;
let lastSyncState = '';

if (currentSessionId && typeof mqtt !== 'undefined') {
    const brokerUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `ws://${window.location.hostname}:9001`
        : `wss://broker.hivemq.com:8884/mqtt`;
    mqttClient = mqtt.connect(brokerUrl);
    
    mqttClient.on('connect', () => {
        if (isViewer) {
            mqttClient.subscribe(`vergemap/sessions/${currentSessionId}/planetary`);
        }
    });

    if (isViewer) {
        mqttClient.on('message', (topic, msg) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.type === 'layer_change' && data.layer === 'SYSTEM') {
                    if (data.url) window.location.href = data.url;
                    return;
                }
                
                if (data.type === 'planetary_metadata_update') {
                    if (dggsData) {
                        dggsData.metadata = data.metadata;
                        applyMetadataOverrides();
                        updateMapInfoHUD();
                        // Force immediate redraw to prevent smearing
                        ctx.setTransform(1, 0, 0, 1, 0, 0); 
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        if (selectedIdx >= 0) {
                            selectCell(selectedIdx);
                        }
                    }
                    return;
                }
                
                if (data.type === 'planetary_sync') {
                    rotX = data.rotX;
                    rotY = data.rotY;
                    scale = data.scale;
                    targetScale = data.scale;
                    
                    if (currentLens !== data.currentLens) {
                        currentLens = data.currentLens;
                        const lensBtns = document.querySelectorAll('.lens-btn');
                        lensBtns.forEach(b => {
                            if (b.getAttribute('data-value') === currentLens) {
                                b.classList.add('active');
                            } else {
                                b.classList.remove('active');
                            }
                        });
                    }
                    
                    if (data.selectedIdx !== selectedIdx || JSON.stringify(data.selectedIndices) !== JSON.stringify(selectedIndices)) {
                        selectedIndices = data.selectedIndices || [];
                        selectCell(data.selectedIdx);
                    }
                    
                    hoveredIdx = data.hoveredIdx;
                    
                    // Force immediate redraw to prevent smearing
                    ctx.setTransform(1, 0, 0, 1, 0, 0); 
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            } catch (e) {}
        });
    }
}

function broadcastPlanetaryState() {
    if (userRole === 'gm' && mqttClient && currentSessionId) {
        const now = Date.now();
        if (now - lastSyncTime > 50) { // Max 20fps updates
            lastSyncTime = now;
            const stateObj = {
                type: 'planetary_sync',
                rotX, rotY, scale, offsetX, offsetY, currentLens, selectedIdx, selectedIndices, hoveredIdx
            };
            const stateStr = JSON.stringify(stateObj);
            if (stateStr !== lastSyncState) {
                lastSyncState = stateStr;
                mqttClient.publish(`vergemap/sessions/${currentSessionId}/planetary`, stateStr);
            }
        }
    }
}

const backBtn = document.getElementById('back-to-system-btn');
if (backBtn) {
    backBtn.onclick = () => {
        let url = '../index.html';
        const params = new URLSearchParams();
        if (planetParam) params.append('planet', planetParam);
        
        const queryString = params.toString();
        if (queryString) {
            url += '?' + queryString;
        }
        
        if (userRole === 'gm' && mqttClient && currentSessionId) {
            let safeUrl = '../index.html';
            if (planetParam) safeUrl += `?planet=${encodeURIComponent(planetParam)}&role=ro`;
            else safeUrl += `?role=ro`;
            
            mqttClient.publish(`vergemap/sessions/${currentSessionId}/planetary`, JSON.stringify({ type: 'layer_change', layer: 'SYSTEM', url: safeUrl }), { qos: 1 }, () => {
                setTimeout(() => { window.location.href = url; }, 100);
            });
            setTimeout(() => { window.location.href = url; }, 1000);
            return;
        }
        window.location.href = url;
    };
}

// ── Control Panel Tab System ──
const controlTabButtons = document.querySelectorAll('.control-tab-btn');
const controlTabContents = document.querySelectorAll('.control-tab-content');
const cTabEditor = document.getElementById('c-tab-editor');
const cTabLive = document.getElementById('c-tab-live');

function activateControlTab(tabName) {
    controlTabButtons.forEach(b => {
        if (b.getAttribute('data-tab') === `c-${tabName}` || b.getAttribute('data-tab') === tabName) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    controlTabContents.forEach(content => {
        if (content.id === `tab-${tabName}` || content.id === `tab-c-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

controlTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab').replace(/^c-/, '');
        activateControlTab(tabName);
    });
});

function updateControlPanelTabsVisibility() {
    if (userRole === 'gm') {
        if (cTabEditor) cTabEditor.style.display = 'block';
        if (cTabLive) cTabLive.style.display = 'block';
        if (floatingMapToolsBtn) floatingMapToolsBtn.style.display = 'block';
    } else {
        if (cTabEditor) cTabEditor.style.display = 'none';
        if (cTabLive) cTabLive.style.display = 'none';
        if (floatingMapToolsBtn) floatingMapToolsBtn.style.display = 'none';
        activateControlTab('player');
    }
}

// ── Sidebar Collapse Toggle ──
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const controlPanel = document.getElementById('control-panel');

if (toggleSidebarBtn && controlPanel) {
    toggleSidebarBtn.addEventListener('click', () => {
        controlPanel.classList.toggle('collapsed');
        toggleSidebarBtn.classList.toggle('sidebar-collapsed');
        if (controlPanel.classList.contains('collapsed')) {
            toggleSidebarBtn.textContent = '▶';
        } else {
            toggleSidebarBtn.textContent = '◀';
        }
    });
}

// GM Mode Toggle UI setup
const gmToggleContainer = document.getElementById('gm-toggle-container');
const gmToggleMode = document.getElementById('gm-toggle-mode');

const infoTabs = document.getElementById('info-tabs');

if (originalRole === 'gm') {
    if (gmToggleContainer) gmToggleContainer.style.display = 'flex';
    if (gmToggleMode) {
        gmToggleMode.checked = (userRole === 'gm');
        gmToggleMode.addEventListener('change', () => {
            userRole = gmToggleMode.checked ? 'gm' : 'player';
            
            updateControlPanelTabsVisibility();
            if (userRole === 'gm') {
                if (infoTabs) infoTabs.style.display = 'flex';
                activateTab('gm-edit');
                if (gmFeatureRow) gmFeatureRow.style.display = 'flex';
                if (gmFactionRow) gmFactionRow.style.display = 'flex';
                activateControlTab('editor');
            } else {
                if (infoTabs) infoTabs.style.display = 'none';
                activateTab('general');
                if (gmFeatureRow) gmFeatureRow.style.display = 'none';
                if (gmFactionRow) gmFactionRow.style.display = 'none';
            }

            if (selectedIndices.length > 0) {
                selectCell(selectedIndices[0]);
            } else {
                infoPanel.classList.remove('visible');
            }
        });
    }
}

// Initial state setup based on role
updateControlPanelTabsVisibility();
if (userRole === 'gm') {
    if (infoTabs) infoTabs.style.display = 'flex';
    activateTab('gm-edit');
    if (gmFeatureRow) gmFeatureRow.style.display = 'flex';
    if (gmFactionRow) gmFactionRow.style.display = 'flex';
    activateControlTab('editor');
} else {
    if (infoTabs) infoTabs.style.display = 'none';
    activateTab('general');
    if (gmFeatureRow) gmFeatureRow.style.display = 'none';
    if (gmFactionRow) gmFactionRow.style.display = 'none';
}


if (seedInput) seedInput.value = seedParam;
if (typeSelect) typeSelect.value = typeParam;
if (radiusInput) radiusInput.value = resParam.toString();

const mapUrbanizationEl = document.getElementById('map-urbanization');
if (mapUrbanizationEl) {
    mapUrbanizationEl.value = urbParam;
    const urbanVal = document.getElementById('urban-value');
    if (urbanVal) {
        const p = sliderToUrb(urbParam);
        urbanVal.textContent = (p < 1) ? `${p.toFixed(3)}%` : `${Math.round(p)}%`;
    }
}
const mapPollutionEl = document.getElementById('map-pollution');
if (mapPollutionEl) {
    mapPollutionEl.value = pollParam;
    const pollVal = document.getElementById('poll-value');
    if (pollVal) pollVal.textContent = `${pollParam}%`;
}
const mapConservationEl = document.getElementById('map-conservation');
if (mapConservationEl) {
    mapConservationEl.value = consParam;
    const consVal = document.getElementById('cons-value');
    if (consVal) consVal.textContent = `${consParam}%`;
}

// Deep linking share button handler
const copyShareBtn = document.getElementById('copy-share-btn');
const copyStatus = document.getElementById('copy-status');
if (copyShareBtn) {
    copyShareBtn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('session');
        url.searchParams.set('role', 'viewer');
        if (currentSessionId) {
            url.searchParams.set('session_id', currentSessionId);
        }
        navigator.clipboard.writeText(url.toString())
            .then(() => {
                if (copyStatus) {
                    copyStatus.textContent = 'Copied share link to clipboard!';
                    setTimeout(() => {
                        copyStatus.textContent = '';
                    }, 2000);
                }
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                if (copyStatus) {
                    copyStatus.textContent = 'Failed to copy!';
                }
            });
    });
}

// Auto-collapse control panel on mobile screens
if (window.innerWidth < 768) {
    const controlPanel = document.getElementById('control-panel');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    if (controlPanel) {
        controlPanel.classList.add('collapsed');
    }
    if (toggleSidebarBtn) {
        toggleSidebarBtn.classList.add('sidebar-collapsed');
        toggleSidebarBtn.textContent = '▶';
    }
}

const initialUrbanization = sliderToUrb(urbParam);
loadDGGS(seedParam, typeParam, resParam, initialUrbanization, pollParam, consParam);
requestAnimationFrame(draw);

// ── Metadata Sync Helper ──
async function saveDGGSMetadata() {
    if (!dggsData) return;
    try {
        const seed = dggsData.metadata?.seed || seedParam;
        const type = dggsData.metadata?.type || typeParam;
        const res = dggsData.metadata?.resolution || resParam;
        const urbInput = document.getElementById('map-urbanization');
        const urb = dggsData.metadata?.urbanization !== undefined ? dggsData.metadata.urbanization : (urbInput ? sliderToUrb(urbInput.value) : 15);
        const pollInput = document.getElementById('map-pollution');
        const poll = dggsData.metadata?.pollution !== undefined ? dggsData.metadata.pollution : (pollInput ? parseInt(pollInput.value) : 100);
        const consInput = document.getElementById('map-conservation');
        const cons = dggsData.metadata?.conservation !== undefined ? dggsData.metadata.conservation : (consInput ? parseInt(consInput.value) : 0);

        const url = `${HEXMAP_WORKER_URL}/planet/${seed}/dggs?type=${type}&resolution=${res}&urbanization=${urb}&pollution=${poll}&conservation=${cons}`;

        const payload = {
            revealedFeatures: dggsData.metadata.revealedFeatures || [],
            scannedCells: dggsData.metadata.scannedCells || [],
            sectorScans: dggsData.metadata.sectorScans || {},
            stealthOverrides: dggsData.metadata.stealthOverrides || {},
            underground: dggsData.metadata.underground || {},
            abandoned: dggsData.metadata.abandoned || {},
            landingCell: dggsData.metadata.landingCell !== undefined ? dggsData.metadata.landingCell : null,
            factions: dggsData.metadata.factions || {},
            customFeatures: dggsData.metadata.customFeatures || {},
            mutations: dggsData.metadata.mutations || {},
            names: dggsData.metadata.names || {},
            descriptions: dggsData.metadata.descriptions || {},
            labels: dggsData.metadata.labels || []
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        dggsData = decodeVMB(buffer);
        onDataLoaded();

        if (mqttClient && currentSessionId) {
            mqttClient.publish(`vergemap/sessions/${currentSessionId}/planetary`, JSON.stringify({
                type: 'planetary_metadata_update',
                metadata: dggsData.metadata
            }));
        }

    } catch (err) {
        console.error("Failed to save map metadata:", err);
        alert(`Failed to save changes to server: ${err.message}`);
    }
}

// Helper to update label list in editor panel
function updateLabelEditorList(cellIdx) {
    activeLabelsContainer.innerHTML = '';
    if (!dggsData || !dggsData.metadata || !dggsData.metadata.labels) return;
    
    const cellLabels = dggsData.metadata.labels.filter(l => l.cell === cellIdx);
    if (cellLabels.length === 0) {
        activeLabelsContainer.innerHTML = '<span style="color: #6688aa; font-style: italic;">No region labels anchored here.</span>';
        return;
    }
    
    cellLabels.forEach((label) => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '4px 8px';
        div.style.borderRadius = '4px';
        div.style.border = '1px solid rgba(255,255,255,0.1)';
        div.style.gap = '4px';
        
        const span = document.createElement('span');
        span.textContent = `"${label.text}" (${label.type === 'territory' ? 'Pol' : 'Geo'})`;
        span.style.color = label.type === 'territory' ? '#fff' : '#00e5ff';
        span.style.overflow = 'hidden';
        span.style.textOverflow = 'ellipsis';
        span.style.whiteSpace = 'nowrap';
        
        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.style.background = 'transparent';
        delBtn.style.border = 'none';
        delBtn.style.color = '#ff1744';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontSize = '1.2em';
        delBtn.style.padding = '0 4px';
        delBtn.style.lineHeight = '1';
        delBtn.addEventListener('click', async () => {
            dggsData.metadata.labels = dggsData.metadata.labels.filter(l => l !== label);
            
            delBtn.disabled = true;
            await saveDGGSMetadata();
            delBtn.disabled = false;
            
            selectCell(cellIdx);
        });
        
        div.appendChild(span);
        div.appendChild(delBtn);
        activeLabelsContainer.appendChild(div);
    });
}

// ── Event Handlers for Interactive Editing & Export ──
editFeature.addEventListener('change', async () => {
    if (selectedIndices.length > 0 && dggsData) {
        const val = parseInt(editFeature.value) || 0;
        if (val === -1) return; // Ignore placeholder Multiple option
        
        for (const idx of selectedIndices) {
            dggsData.cells[idx].tile.feature = val;
            if (!dggsData.metadata.customFeatures) dggsData.metadata.customFeatures = {};
            dggsData.metadata.customFeatures[idx] = val;
            if (dggsData.metadata.stealthOverrides) delete dggsData.metadata.stealthOverrides[idx]; // Clear GM override on feature change
        }
        
        editFeature.disabled = true;
        await saveDGGSMetadata();
        editFeature.disabled = false;
        
        computeFavorabilities(); // Feature changes can alter mining/research suitability
        selectCell(selectedIdx);
    }
});

editFaction.addEventListener('change', async () => {
    if (selectedIndices.length > 0 && dggsData) {
        const val = parseInt(editFaction.value) || 0;
        if (val === -1) return; // Ignore placeholder
        
        if (!dggsData.metadata.factions) dggsData.metadata.factions = {};
        
        for (const idx of selectedIndices) {
            if (val === 0) {
                delete dggsData.metadata.factions[idx];
                dggsData.cells[idx].tile.faction = 0;
                dggsData.cells[idx].tile.specialization = undefined;
            } else {
                const currentSpec = dggsData.metadata.factions[idx]?.spec || 'auto';
                dggsData.metadata.factions[idx] = { level: val, spec: currentSpec };
                dggsData.cells[idx].tile.faction = val;
                dggsData.cells[idx].tile.specialization = currentSpec === 'auto' ? resolveSpecialization(idx) : currentSpec;
            }
        }
        
        editFaction.disabled = true;
        await saveDGGSMetadata();
        editFaction.disabled = false;
        
        selectCell(selectedIdx);
    }
});

const editUnderground = document.getElementById('edit-underground');
if (editUnderground) {
    editUnderground.addEventListener('change', async (e) => {
        if (selectedIndices.length === 0 || !dggsData) return;
        if (!dggsData.metadata) dggsData.metadata = {};
        if (!dggsData.metadata.underground) dggsData.metadata.underground = {};
        if (!dggsData.metadata.stealthOverrides) dggsData.metadata.stealthOverrides = {};
        for (const idx of selectedIndices) {
            if (e.target.checked) dggsData.metadata.underground[idx] = true;
            else delete dggsData.metadata.underground[idx];
            
            delete dggsData.metadata.stealthOverrides[idx]; // Clear GM override on underground change
        }
        await saveDGGSMetadata();
        selectCell(selectedIdx);
    });
}

const editAbandoned = document.getElementById('edit-abandoned');
if (editAbandoned) {
    editAbandoned.addEventListener('change', async (e) => {
        if (selectedIndices.length === 0 || !dggsData) return;
        if (!dggsData.metadata) dggsData.metadata = {};
        if (!dggsData.metadata.abandoned) dggsData.metadata.abandoned = {};
        for (const idx of selectedIndices) {
            if (e.target.checked) dggsData.metadata.abandoned[idx] = true;
            else delete dggsData.metadata.abandoned[idx];
        }
        await saveDGGSMetadata();
        selectCell(selectedIdx);
    });
}

editFactionSpec.addEventListener('change', async () => {
    if (selectedIndices.length > 0 && dggsData) {
        const val = editFactionSpec.value;
        if (val === '-1') return; // Ignore placeholder
        
        if (!dggsData.metadata.factions) dggsData.metadata.factions = {};
        
        for (const idx of selectedIndices) {
            const currentLvl = dggsData.metadata.factions[idx]?.level || 0;
            if (currentLvl > 0) {
                dggsData.metadata.factions[idx] = { level: currentLvl, spec: val };
                dggsData.cells[idx].tile.specialization = val === 'auto' ? resolveSpecialization(idx) : val;
            }
        }
        
        editFactionSpec.disabled = true;
        await saveDGGSMetadata();
        editFactionSpec.disabled = false;
        
        selectCell(selectedIdx);
    }
});

editName.addEventListener('change', async () => {
    if (selectedIndices.length > 0 && dggsData) {
        const val = editName.value.trim();
        if (!dggsData.metadata.names) dggsData.metadata.names = {};
        
        for (const idx of selectedIndices) {
            if (val === '') {
                delete dggsData.metadata.names[idx];
            } else {
                dggsData.metadata.names[idx] = val;
            }
        }
        
        editName.disabled = true;
        await saveDGGSMetadata();
        editName.disabled = false;
        
        selectCell(selectedIdx);
    }
});

editDesc.addEventListener('change', async () => {
    if (selectedIndices.length > 0 && dggsData) {
        const val = editDesc.value.trim();
        if (!dggsData.metadata.descriptions) dggsData.metadata.descriptions = {};
        
        for (const idx of selectedIndices) {
            if (val === '') {
                delete dggsData.metadata.descriptions[idx];
            } else {
                dggsData.metadata.descriptions[idx] = val;
            }
        }
        
        editDesc.disabled = true;
        await saveDGGSMetadata();
        editDesc.disabled = false;
        
        selectCell(selectedIdx);
    }
});

addLabelBtn.addEventListener('click', async () => {
    if (selectedIdx >= 0 && dggsData) {
        const text = newLabelText.value.trim();
        if (!text) return;
        
        const type = newLabelType.value;
        if (!dggsData.metadata.labels) dggsData.metadata.labels = [];
        
        dggsData.metadata.labels.push({ cell: selectedIdx, text, type });
        newLabelText.value = '';
        
        addLabelBtn.disabled = true;
        await saveDGGSMetadata();
        addLabelBtn.disabled = false;
        
        selectCell(selectedIdx);
    }
});


function getCellsByRadius(startIdx, rings) {
    if (rings === 0) return [startIdx];
    const visited = new Set([startIdx]);
    let currentRing = [startIdx];
    const result = [startIdx];
    
    for (let r = 1; r <= rings; r++) {
        const nextRing = [];
        for (const curr of currentRing) {
            const neighbors = cellEdgeNeighbors[curr] || [];
            for (const nIdx of neighbors) {
                if (nIdx !== -1 && nIdx !== undefined && !visited.has(nIdx)) {
                    visited.add(nIdx);
                    nextRing.push(nIdx);
                    result.push(nIdx);
                }
            }
        }
        currentRing = nextRing;
    }
    return result;
}

function getNearbyCells(startIdx, count) {
    if (count <= 1) return [startIdx];
    const visited = new Set([startIdx]);
    const queue = [startIdx];
    const result = [startIdx];

    let head = 0;
    while (head < queue.length && result.length < count) {
        const curr = queue[head++];
        const neighbors = cellEdgeNeighbors[curr] || [];
        for (const nIdx of neighbors) {
            if (nIdx !== -1 && nIdx !== undefined && !visited.has(nIdx)) {
                visited.add(nIdx);
                queue.push(nIdx);
                result.push(nIdx);
                if (result.length >= count) break;
            }
        }
    }
    return result;
}


setupCompoundGroup('gm-needed-level', async (level) => {
    if (selectedIdx < 0 || !dggsData || userRole !== 'gm') return;
    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.stealthOverrides) dggsData.metadata.stealthOverrides = {};
    
    if (level === 0) {
        delete dggsData.metadata.stealthOverrides[selectedIdx];
    } else {
        dggsData.metadata.stealthOverrides[selectedIdx] = level;
    }
    await saveDGGSMetadata();
    selectCell(selectedIdx);
});

setupCompoundGroup('gm-current-level', async (level) => {
    if (selectedIdx < 0 || !dggsData || userRole !== 'gm') return;
    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.sectorScans) dggsData.metadata.sectorScans = {};
    
    dggsData.metadata.sectorScans[selectedIdx] = level;
    await saveDGGSMetadata();
    selectCell(selectedIdx);
});

let currentPlayerScanIntensity = 1;
setupCompoundGroup('player-scan-level', (level) => {
    currentPlayerScanIntensity = level;
});

featureActionBtn.addEventListener('click', async () => {
    if (selectedIdx < 0 || !dggsData) return;

    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.sectorScans) dggsData.metadata.sectorScans = {};

    const scanSize = scanSizeSelect ? parseInt(scanSizeSelect.value) : 0;
    
    let cellsToScan = [];
    if (scanSize === 99) {
        cellsToScan = dggsData.cells.map((_, i) => i);
    } else {
        cellsToScan = getCellsByRadius(selectedIdx, scanSize);
    }

    featureActionBtn.disabled = true;
    featureActionBtn.textContent = 'SCANNING...';
    featureActionBtn.style.borderColor = '#ffd600';
    featureActionBtn.style.color = '#ffd600';

    let scanDelay = 1500 + (cellsToScan.length * 10);
    scanDelay = Math.min(scanDelay, 5000); // max 5 seconds

    setTimeout(async () => {
        let newFeaturesFound = [];

        for (const idx of cellsToScan) {
            const currentLvl = dggsData.metadata.sectorScans[idx] || 0;
            if (currentPlayerScanIntensity > currentLvl) {
                dggsData.metadata.sectorScans[idx] = currentPlayerScanIntensity;
                
                const c = dggsData.cells[idx];
                if (c) {
                    // Check Feature
                    if (c.tile.feature > 0) {
                        const overrideLevel = dggsData.metadata?.stealthOverrides?.[idx];
                        const isUnder = dggsData.metadata?.underground?.[idx];
                        let defNeeded = getFeatureBaseStealth(c.tile.feature) + (isUnder ? 1 : 0);
                        defNeeded = Math.min(defNeeded, 5);
                        const neededLevel = overrideLevel !== undefined ? overrideLevel : defNeeded;
                        
                        if (currentLvl < neededLevel && currentPlayerScanIntensity >= neededLevel) {
                            const featData = FEATURES[c.tile.feature];
                            if (featData) {
                                newFeaturesFound.push(featData.name);
                            }
                        }
                    }
                    // Check Settlement
                    if (c.tile.faction > 0) {
                        const isUnder = dggsData.metadata?.underground?.[idx];
                        const isAband = dggsData.metadata?.abandoned?.[idx];
                        const urbNeeded = getUrbStealth(c.tile.faction, isUnder, isAband);
                        
                        if (currentLvl < urbNeeded && currentPlayerScanIntensity >= urbNeeded) {
                            const factionNames = {1: 'Outpost', 2: 'Town', 3: 'Metropolis', 4: 'Megacity'};
                            let name = factionNames[c.tile.faction] || 'Settlement';
                            if (isAband) name = 'Abandoned ' + name;
                            if (isUnder) name = 'Underground ' + name;
                            newFeaturesFound.push(name);
                        }
                    }
                }
            }
        }

        await saveDGGSMetadata();
        featureActionBtn.disabled = false;
        featureActionBtn.textContent = 'EXECUTE SCAN';
        featureActionBtn.style.borderColor = '#00e5ff';
        featureActionBtn.style.color = '#00e5ff';

        if (newFeaturesFound.length > 0) {
            alert(`Scan Complete!\n\nNew planetary features detected:\n- ${newFeaturesFound.join('\n- ')}`);
        } else {
            alert(`Scan Complete!\n\nNo new planetary features detected in the scanned area.`);
        }

        selectCell(selectedIdx);
    }, scanDelay);
});

landBtn.addEventListener('click', async () => {
    if (selectedIdx >= 0 && dggsData) {
        if (!dggsData.metadata) dggsData.metadata = {};
        dggsData.metadata.landingCell = selectedIdx;

        landBtn.disabled = true;
        landBtn.textContent = 'SAVING...';
        await saveDGGSMetadata();
        landBtn.disabled = false;

        selectCell(selectedIdx); // refresh details and button state
    }
});

exportBtn.addEventListener('click', () => {
    if (!dggsData) return;
    try {
        const binary = encodeVMB(dggsData.cells, dggsData.metadata || {});
        const blob = new Blob([binary], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const seed = dggsData.metadata?.seed || 'planet';
        const type = dggsData.metadata?.type || 'terrestrial';
        a.href = url;
        a.download = `${seed}_${type}_dggs.vmb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Failed to export map:", err);
        alert(`Failed to export map: ${err.message}`);
    }
});

const lensBtns = document.querySelectorAll('.lens-btn');
lensBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        lensBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLens = btn.getAttribute('data-value');
    });
});

// ESC key listener to clear selection
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        selectedIndices = [];
        selectedIdx = -1;
        selectCell(-1);
    }
});



// Expose variables for testing
window.getSelectionState = () => ({
    selectedIdx,
    selectedIndices
});
window.triggerSelectCell = (idx, ctrlKey = false, shiftKey = false) => {
    if (ctrlKey) {
        const sIdx = selectedIndices.indexOf(idx);
        if (sIdx >= 0) {
            selectedIndices.splice(sIdx, 1);
        } else {
            selectedIndices.push(idx);
        }
        if (selectedIndices.length > 0) {
            selectCell(selectedIndices[selectedIndices.length - 1]);
        } else {
            selectCell(-1);
        }
    } else if (shiftKey && selectedIndices.length > 0) {
        const path = getPathCells(selectedIndices[0], idx);
        for (const pIdx of path) {
            if (!selectedIndices.includes(pIdx)) {
                selectedIndices.push(pIdx);
            }
        }
        selectCell(idx);
    } else {
        selectedIndices = [idx];
        selectCell(idx);
    }
};

