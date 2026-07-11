import { decodeVMB, encodeVMB } from './vmb.js';

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
    12: { name: 'Swamp', color: '#202e10', border: '#181e0a', desc: 'Waterlogged wetlands.' }
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
        } else {
            // Local minima (endorheic basins) act as sinks if no ocean is nearby
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
                currentQueue.push(i);
                inQueue[i] = 1;
            }
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
    
    // Sort by cost-distance to ocean descending, prioritizing the deepest/hardest-to-reach inland points
    candidates.sort((a, b) => distToOcean[b] - distToOcean[a]);
    
    // Take the top 20% furthest inland cells as our candidate pool
    const poolSize = Math.max(10, Math.floor(candidates.length * 0.2));
    candidates = candidates.slice(0, poolSize);
    
    // Shuffle the candidate pool
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    // Generate an abundant number of sources, we will cull the tiny ones later
    const numSources = Math.max(12, Math.floor(dggsData.cells.length / 120));
    const sources = candidates.slice(0, numSources);
    
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
                } else if (distToOcean[n] === shortestDist && n < bestNext) {
                    bestNext = n;
                }
                if (distToOcean[n] <= distToOcean[curr] && fallbackNext === -1) {
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
                branch.push({ idx: curr, water: water[curr], hidden: isGlacier });
                drawn[curr] = 1;
                curr = flowTo[curr];
            }
            if (curr !== -1) {
                const isGlacier = dggsData.cells[curr].tile.biome === 9;
                branch.push({ idx: curr, water: water[curr], hidden: isGlacier });
                
                // If this branch flows directly into the ocean and is just a tiny coastal creek, discard it
                const isOcean = dggsData.cells[curr].tile.biome === 0 || dggsData.cells[curr].tile.biome === 1;
                if (isOcean && branch.length < 5) {
                    continue; 
                }
            }
            if (branch.length > 1) {
                branches.push(branch);
            }
        }
    }
    
    dggsData.metadata.rivers = branches;
    return branches.length > 0;
}

function onDataLoaded() {
    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.revealedFeatures) dggsData.metadata.revealedFeatures = [];
    if (!dggsData.metadata.scannedCells) dggsData.metadata.scannedCells = [];

    initBiomeCache();

    let changed = false;
    for (let i = 0; i < dggsData.cells.length; i++) {
        const cell = dggsData.cells[i];
        if (cell.tile.feature > 0) {
            const fData = FEATURES[cell.tile.feature];
            if (fData && fData.scanLevel === 0 && !dggsData.metadata.revealedFeatures.includes(i)) {
                dggsData.metadata.revealedFeatures.push(i);
                changed = true;
            }
        }
        // Sync scanned cells with revealed features so auto-reveals light up
        if (dggsData.metadata.revealedFeatures.includes(i) && !dggsData.metadata.scannedCells.includes(i)) {
            dggsData.metadata.scannedCells.push(i);
            changed = true;
        }
    }

    precomputeEdgeNeighbors();

    generateRivers();

    // Auto-save if we revealed level 0 features on load
    if (changed && typeof saveDGGSMetadata === 'function') {
        saveDGGSMetadata().catch(console.error);
    }
}


const FEATURES = {
    0: { name: 'None', scanLevel: 0 },
    1: { name: 'Ancient Ruins', scanLevel: 2 },
    2: { name: 'Impact Crater', scanLevel: 0 },
    3: { name: 'Mineral Geode', scanLevel: 2 },
    4: { name: 'Energy Anomaly', scanLevel: 3 },
    5: { name: 'Research Station', scanLevel: 1 },
    6: { name: 'Abandoned Outpost', scanLevel: 1 },
    7: { name: 'Geothermal Vent', scanLevel: 0 },
    8: { name: 'Crystalline Spires', scanLevel: 2 },
    9: { name: 'Alien Monolith', scanLevel: 3 }
};
const FEATURE_COLORS = { 1: '#e040fb', 2: '#9e9e9e', 3: '#00e676', 4: '#00e5ff', 5: '#2979ff', 6: '#ff9100', 7: '#ff1744', 8: '#d500f9', 9: '#ffd600' };
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
let userRole = 'player';
let currentLens = 'biome';


// ── DOM ──
const canvas = document.getElementById('hex-canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const infoPanel = document.getElementById('info-panel');
const closeInfoBtn = document.getElementById('close-info');
const seedInput = document.getElementById('map-seed');
const typeSelect = document.getElementById('map-type');
const radiusInput = document.getElementById('map-radius');
const generateBtn = document.getElementById('generate-btn');
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
const detailAddress = document.getElementById('hex-address');
const detailNeighbors = document.getElementById('hex-neighbors');
const landBtn = document.getElementById('land-btn');
const exportBtn = document.getElementById('export-btn');
const featureStatusRow = document.getElementById('feature-status-row');
const featureStatusValue = document.getElementById('feature-status-value');
const featureActionRow = document.getElementById('feature-action-row');
const featureActionBtn = document.getElementById('feature-action-btn');


function resizeCanvas() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
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

    // Auto-rotate
    if (autoRotateCheckbox.checked && !isDragging) { rotY += 0.002; }

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
            const finalTemp = Math.max(0, Math.min(1, baseTemp + latMod - elMod));

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
            // Base background EM (dark slate/purple) with slight procedural noise
            let em = Math.abs(Math.sin(cell.center.x * 20) * Math.cos(cell.center.y * 20)) * 0.15;

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

            // Ships
            if (dggsData.metadata && dggsData.metadata.landingCell === i) em = 1.0;

            em = Math.max(0, Math.min(1, em));

            // Color map: 0 = Dark blue (hsl(240, 50%, 15%)) -> 1 = Bright cyan (hsl(180, 100%, 80%))
            const hue = 240 - (em * 60);
            const sat = 50 + (em * 50);
            const light = 15 + (em * 65);

            fillColor = `hsl(${hue}, ${sat}%, ${light}%)`;
            borderColor = `hsl(${hue}, ${sat}%, ${light + 10}%)`;
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
        ctx.fill();

        ctx.strokeStyle = group.borderColor;
        ctx.lineWidth = 0.4;
        ctx.stroke();

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
        const isScanned = dggsData.metadata?.scannedCells?.includes(c.i);
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

        if (i === hoveredIdx || i === selectedIdx) {
            ctx.beginPath();
            ctx.moveTo(projVerts[0].x, projVerts[0].y);
            for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
            ctx.closePath();
            ctx.strokeStyle = i === selectedIdx ? '#00e5ff' : 'rgba(255,255,255,0.35)';
            ctx.lineWidth = i === selectedIdx ? 1.5 : 0.8;
            ctx.stroke();
        }

        if (tile.feature > 0) {
            const isRevealed = dggsData.metadata?.revealedFeatures?.includes(i);
            const fc = FEATURE_COLORS[tile.feature] || '#fff';
            if (userRole === 'gm') {
                if (isRevealed) {
                    ctx.beginPath();
                    ctx.arc(c.hexCx, c.hexCy, 3, 0, Math.PI * 2);
                    ctx.fillStyle = fc;
                    ctx.fill();
                } else {
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    ctx.beginPath();
                    ctx.arc(c.hexCx, c.hexCy, 3.5, 0, Math.PI * 2);
                    ctx.strokeStyle = fc;
                    ctx.setLineDash([1.5, 1.5]);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(c.hexCx, c.hexCy, 2, 0, Math.PI * 2);
                    ctx.fillStyle = fc;
                    ctx.fill();
                    ctx.restore();
                }
            } else if (isRevealed) {
                ctx.beginPath();
                ctx.arc(c.hexCx, c.hexCy, 3, 0, Math.PI * 2);
                ctx.fillStyle = fc;
                ctx.fill();
            }
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
            const points = [];
            for (const node of branch) {
                const cell = cells[node.idx];
                if (!cell) continue;
                
                // Deterministic wander within the hex footprint
                const h = node.idx;
                const rx = (Math.sin(h * 12.9898) - 0.5) * maxOffset;
                const ry = (Math.cos(h * 78.233) - 0.5) * maxOffset;
                const rz = (Math.sin(h * 37.719) - 0.5) * maxOffset;
                
                let nx = cell.center.x + rx;
                let ny = cell.center.y + ry;
                let nz = cell.center.z + rz;
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
                nx /= len; ny /= len; nz /= len;
                
                const rv = rotate3D(nx, ny, nz);
                points.push({
                    x: rv.x * GLOBE_RADIUS,
                    y: rv.y * GLOBE_RADIUS,
                    z: rv.z,
                    water: node.water,
                    hidden: node.hidden,
                    isOcean: cell.tile.biome === 0 || cell.tile.biome === 1
                });
            }
            
            // Render the branch as a smooth sequence of line segments
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                
                if (p1.z < -0.1 && p2.z < -0.1) continue; // Backface cull
                if (p1.hidden && p2.hidden) continue;     // Subglacial
                if (p1.isOcean) continue;                 // Prevent drawing ocean-to-ocean
                
                const avgWater = (p1.water + p2.water) / 2.0;
                const innerWidth = Math.min(6, 1.2 + avgWater * 0.4);
                const outerWidth = innerWidth + 2.5;
                
                // Truncate segment exactly at the coastline if it flows into the ocean
                let drawX = p2.x;
                let drawY = p2.y;
                if (p2.isOcean) {
                    drawX = (p1.x + p2.x) / 2;
                    drawY = (p1.y + p2.y) / 2;
                }
                
                // Outer border
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(drawX, drawY);
                ctx.strokeStyle = '#0a2342';
                ctx.lineWidth = outerWidth;
                ctx.stroke();
                
                // Inner water
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(drawX, drawY);
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = innerWidth;
                ctx.stroke();
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

    if (selectedIdx >= 0 && selectedIdx < cells.length) {
        const cell = cells[selectedIdx];
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
            ctx.strokeStyle = '#ffd600';
            ctx.lineWidth = 3.0;
            ctx.stroke();
        }
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

    ctx.restore();
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
    if (idx < 0 || !dggsData) { selectedIdx = -1; infoPanel.classList.remove('visible'); return; }
    selectedIdx = idx;
    const cell = dggsData.cells[idx];
    const t = cell.tile;

    detailTitle.textContent = `Cell #${idx} (${cell.sides === 5 ? 'Pentagon' : 'Hexagon'})`;

    // Address
    detailAddress.textContent = dggsData.metadata?.addresses?.[idx] || 'N/A';

    // Coordinates & 3D Position
    const latRad = Math.asin(cell.center.y);
    const lonRad = Math.atan2(cell.center.x, cell.center.z);
    const latDeg = (latRad * 180 / Math.PI).toFixed(2);
    const lonDeg = (lonRad * 180 / Math.PI).toFixed(2);
    const latSign = latDeg >= 0 ? 'N' : 'S';
    const lonSign = lonDeg >= 0 ? 'E' : 'W';
    detailCoords.textContent = `${Math.abs(latDeg)}° ${latSign}, ${Math.abs(lonDeg)}° ${lonSign}`;
    detailPos3D.textContent = `${cell.center.x.toFixed(3)}, ${cell.center.y.toFixed(3)}, ${cell.center.z.toFixed(3)}`;

    const planetType = dggsData.metadata?.type || 'terrestrial';
    const biome = getBiomeInfo(t.biome);
    detailBiome.textContent = biome.name;
    detailBiome.style.color = biome.color === '#eef8ff' ? '#99ccff' : biome.color;
    detailElevation.textContent = `Level ${t.elevation}`;
    detailMoisture.textContent = `Level ${t.moisture}`;

    const isFeatureRevealed = dggsData.metadata?.revealedFeatures?.includes(idx);

    // Feature display based on role and reveal status
    if (userRole === 'gm') {
        editFeature.parentElement.style.display = 'flex';
        detailFeature.parentElement.style.display = 'none';

        editFeature.value = t.feature;

        if (t.feature > 0) {
            featureStatusRow.style.display = 'flex';
            featureStatusValue.textContent = isFeatureRevealed ? 'REVEALED' : 'HIDDEN (FOW)';
            featureStatusValue.style.color = isFeatureRevealed ? '#00e676' : '#ff1744';

            featureActionRow.style.display = 'flex';
            featureActionBtn.textContent = isFeatureRevealed ? 'HIDE FROM PLAYERS' : 'REVEAL TO PLAYERS';
            featureActionBtn.style.borderColor = isFeatureRevealed ? '#ff1744' : '#00e5ff';
            featureActionBtn.style.color = isFeatureRevealed ? '#ff1744' : '#00e5ff';
            featureActionBtn.style.background = isFeatureRevealed ? 'rgba(255, 23, 68, 0.15)' : 'rgba(0, 229, 255, 0.15)';
        } else {
            featureStatusRow.style.display = 'none';
            featureActionRow.style.display = 'none';
        }
    } else {
        // Player or Viewer
        editFeature.parentElement.style.display = 'none';
        detailFeature.parentElement.style.display = 'flex';

        if (isFeatureRevealed && t.feature > 0) {
            const featData = FEATURES[t.feature] || { name: 'None', scanLevel: 0 };
            const featColor = FEATURE_COLORS[t.feature] || '#e0f2f1';
            detailFeature.innerHTML = `<span style="color: ${featColor}; font-weight: bold;">${featData.name}</span> <span style="font-size: 0.8em; color: #88aacc;">(Scan Lvl ${featData.scanLevel})</span>`;
            featureStatusRow.style.display = 'flex';
            featureStatusValue.textContent = 'Revealed';
            featureStatusValue.style.color = '#00e676';

            featureActionRow.style.display = 'none';
        } else {
            detailFeature.innerHTML = `<span style="color: #88aacc;">None</span>`;
            featureStatusRow.style.display = 'none';

            // Player can scan unexplored tiles
            if (userRole === 'player') {
                featureActionRow.style.display = 'flex';
                featureActionBtn.textContent = 'SCAN SECTOR';
                featureActionBtn.style.borderColor = '#00e5ff';
                featureActionBtn.style.color = '#00e5ff';
                featureActionBtn.style.background = 'rgba(0, 229, 255, 0.15)';
            } else {
                featureActionRow.style.display = 'none';
            }
        }
    }

    let analysis = `A sector classified as ${biome.name.toLowerCase()} terrain. ${biome.desc}`;
    if (t.feature > 0 && (isFeatureRevealed || userRole === 'gm')) {
        const featData = FEATURES[t.feature] || { name: 'Unknown' };
        analysis += ` Sensors detected: ${featData.name}.`;
        if (userRole === 'gm' && !isFeatureRevealed) {
            analysis += ` (Hidden from players)`;
        }
    }
    detailAnalysis.textContent = analysis;

    // Land btn state
    if (userRole === 'gm') {
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
    const neighborsList = dggsData.metadata?.neighbors?.[idx];
    if (neighborsList && neighborsList.length > 0) {
        neighborsList.forEach(nIdx => {
            const btn = document.createElement('button');
            btn.className = 'neighbor-btn';
            const neighborSides = dggsData.cells[nIdx]?.sides === 5 ? 'Pent' : 'Hex';
            btn.textContent = `#${nIdx} (${neighborSides})`;
            btn.addEventListener('click', () => {
                selectCell(nIdx);
            });
            detailNeighbors.appendChild(btn);
        });
    } else {
        detailNeighbors.textContent = 'No adjacency data available.';
    }

    infoPanel.classList.add('visible');
}

// ── Data Loading ──
let currentLoadId = 0;
async function loadDGGS(seed, type, resolution) {
    const loadId = ++currentLoadId;
    try {
        const url = `${HEXMAP_WORKER_URL}/planet/${seed}/dggs?type=${type}&resolution=${resolution}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Worker returned ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (loadId !== currentLoadId) return; // Prevent older slow fetches from overwriting newer ones (race condition)

        dggsData = decodeVMB(buffer);
        onDataLoaded();



        hudSeed.textContent = dggsData.metadata.seed || seed;
        hudType.textContent = dggsData.metadata.type || type;
        const resLabels = { 3: 'Small', 4: 'Medium', 5: 'Large', 6: 'Huge' };
        hudSize.textContent = `${resLabels[resolution] || 'Res ' + resolution} (Res ${resolution})`;
        hudTiles.textContent = dggsData.cells.length.toLocaleString();

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
    isDragging = true; hasMoved = false;
    dragStartX = e.clientX; dragStartY = e.clientY;
    lastMouseX = e.clientX; lastMouseY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
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
        tooltip.innerHTML = `<strong>Cell #${idx}</strong> (${cell.sides === 5 ? 'Pent' : 'Hex'})<br><strong>Biome:</strong> ${biome.name}<br><strong>Elev:</strong> ${cell.tile.elevation} <strong>Moist:</strong> ${cell.tile.moisture}`;
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none';
    }
});

canvas.addEventListener('mouseup', (e) => {
    isDragging = false;
    if (!hasMoved) {
        const rect = canvas.getBoundingClientRect();
        const idx = getCellUnderMouse(e.clientX - rect.left, e.clientY - rect.top);
        selectCell(idx);
    }
});
canvas.addEventListener('mouseleave', () => { isDragging = false; hoveredIdx = -1; tooltip.style.display = 'none'; });

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zf = e.deltaY < 0 ? 1.12 : 0.88;
    targetScale = Math.max(0.3, Math.min(5.0, targetScale * zf));
});

// ── Controls ──
generateBtn.addEventListener('click', () => {
    const seed = seedInput.value.trim() || 'Sol_III';
    const type = typeSelect.value;
    const resolution = parseInt(radiusInput.value) || 4;
    loadDGGS(seed, type, resolution);
});

closeInfoBtn.addEventListener('click', () => { selectedIdx = -1; infoPanel.classList.remove('visible'); });

vmbUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadStatus.textContent = `Loading ${file.name}...`;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            dggsData = decodeVMB(evt.target.result);
            onDataLoaded();


            hudSeed.textContent = dggsData.metadata?.seed || 'Uploaded';
            hudType.textContent = dggsData.metadata?.type || 'unknown';
            hudSize.textContent = `${dggsData.cells.length} cells`;
            hudTiles.textContent = dggsData.cells.length.toLocaleString();
            selectedIdx = -1; hoveredIdx = -1;
            infoPanel.classList.remove('visible');
            uploadStatus.textContent = 'Loaded!';
            centerViewport();
        } catch (err) {
            uploadStatus.textContent = `Error: ${err.message}`;
        }
    };
    reader.readAsArrayBuffer(file);
});

// ── Init ──
const urlParams = new URLSearchParams(window.location.search);
const seedParam = urlParams.get('seed') || 'Sol_III';
const typeParam = urlParams.get('type') || 'terrestrial';
const resParam = parseInt(urlParams.get('resolution')) || 4;
const roleParam = urlParams.get('role') || 'player';
userRole = roleParam.toLowerCase();

if (userRole !== 'gm') {
    editFeature.parentElement.style.display = 'none';
}


if (seedInput) seedInput.value = seedParam;
if (typeSelect) typeSelect.value = typeParam;
if (radiusInput) radiusInput.value = resParam.toString();

loadDGGS(seedParam, typeParam, resParam);
requestAnimationFrame(draw);

// ── Metadata Sync Helper ──
async function saveDGGSMetadata() {
    if (!dggsData) return;
    try {
        const seed = dggsData.metadata?.seed || seedParam;
        const type = dggsData.metadata?.type || typeParam;
        const res = dggsData.metadata?.resolution || resParam;

        const url = `${HEXMAP_WORKER_URL}/planet/${seed}/dggs?type=${type}&resolution=${res}`;

        const payload = {
            revealedFeatures: dggsData.metadata.revealedFeatures || [],
            scannedCells: dggsData.metadata.scannedCells || [],
            landingCell: dggsData.metadata.landingCell !== undefined ? dggsData.metadata.landingCell : null
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


    } catch (err) {
        console.error("Failed to save map metadata:", err);
        alert(`Failed to save changes to server: ${err.message}`);
    }
}

// ── Event Handlers for Interactive Editing & Export ──
editFeature.addEventListener('change', () => {
    if (selectedIdx >= 0 && dggsData) {
        dggsData.cells[selectedIdx].tile.feature = parseInt(editFeature.value) || 0;
        selectCell(selectedIdx); // refresh badges
    }
});

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

featureActionBtn.addEventListener('click', async () => {
    if (selectedIdx < 0 || !dggsData) return;

    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.revealedFeatures) dggsData.metadata.revealedFeatures = [];
    if (!dggsData.metadata.scannedCells) dggsData.metadata.scannedCells = [];

    const isRevealed = dggsData.metadata.revealedFeatures.includes(selectedIdx);

    if (userRole === 'gm') {
        if (isRevealed) {
            dggsData.metadata.revealedFeatures = dggsData.metadata.revealedFeatures.filter(idx => idx !== selectedIdx);
        } else {
            dggsData.metadata.revealedFeatures.push(selectedIdx);
        }

        featureActionBtn.disabled = true;
        featureActionBtn.textContent = 'SAVING...';
        await saveDGGSMetadata();
        featureActionBtn.disabled = false;

        selectCell(selectedIdx);
    } else if (userRole === 'player') {
        const countInput = document.getElementById('scan-count');
        const count = countInput ? parseInt(countInput.value) || 1 : 1;
        const cellsToScan = getNearbyCells(selectedIdx, count);

        let scanDelay = 1500;

        for (const idx of cellsToScan) {
            const c = dggsData.cells[idx];
            const fData = FEATURES[c.tile.feature];
            const sLevel = (c.tile.feature > 0 && fData) ? fData.scanLevel : 1;

            if (sLevel === 2 && scanDelay < 1500) scanDelay = 1500;
            if (sLevel === 3 && dggsData.metadata.landingCell === idx) {
                scanDelay = 4000;
            }
        }

        // base delay for multiple hexes
        if (count > 1 && scanDelay < 1000 + count * 100) {
            scanDelay = Math.min(1000 + count * 100, 5000); // max 5s for big scans
        }

        // If scanning a single level 3 and not landed, block
        if (count === 1) {
            const fData = FEATURES[dggsData.cells[selectedIdx].tile.feature];
            const sLevel = (dggsData.cells[selectedIdx].tile.feature > 0 && fData) ? fData.scanLevel : 1;
            if (sLevel === 3 && dggsData.metadata.landingCell !== selectedIdx) {
                alert('Cannot scan: Ground presence required. You must land here first to perform a deep scan.');
                return;
            }
        }

        featureActionBtn.disabled = true;
        featureActionBtn.textContent = 'SCANNING...';
        featureActionBtn.style.borderColor = '#ffd600';
        featureActionBtn.style.color = '#ffd600';

        setTimeout(async () => {
            const foundFeatures = [];

            for (const idx of cellsToScan) {
                if (!dggsData.metadata.scannedCells.includes(idx)) {
                    dggsData.metadata.scannedCells.push(idx);
                }
                const c = dggsData.cells[idx];
                const sLevel = (c.tile.feature > 0 && FEATURES[c.tile.feature]) ? FEATURES[c.tile.feature].scanLevel : 1;

                if (c.tile.feature > 0) {
                    if (sLevel === 3 && dggsData.metadata.landingCell !== idx) {
                        continue; // Requires ground presence
                    }
                    if (!dggsData.metadata.revealedFeatures.includes(idx)) {
                        dggsData.metadata.revealedFeatures.push(idx);
                        foundFeatures.push(FEATURES[c.tile.feature].name);
                    }
                }
            }

            await saveDGGSMetadata();
            featureActionBtn.disabled = false;
            featureActionBtn.textContent = 'SCAN SECTOR';
            featureActionBtn.style.borderColor = '#00e5ff';
            featureActionBtn.style.color = '#00e5ff';

            if (foundFeatures.length > 0) {
                alert(`Scan Complete! Found: ${foundFeatures.join(', ')}`);
            }

            selectCell(selectedIdx);
        }, scanDelay);
    }
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

const lensRadios = document.querySelectorAll('input[name="map-lens"]');
lensRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.checked) {
            currentLens = e.target.value;
        }
    });
});

