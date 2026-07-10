import { decodeVMB, encodeVMB } from './vmb.js';

const HEXMAP_WORKER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8788'
    : window.location.hostname === 'frontend'
        ? 'http://hexmap-worker:8788'
        : 'https://hexmap-worker.mafalero.workers.dev';

// ── Biome Styles (Rimworld-abstract) ──
const BIOME_STYLES = {
    0:  { name: 'Deep Ocean', color: '#162d45', border: '#1a3550', desc: 'Abyssal ocean depths.' },
    1:  { name: 'Ocean',      color: '#1e4a74', border: '#244d70', desc: 'Open ocean waters.' },
    2:  { name: 'Coast',      color: '#b09040', border: '#987830', desc: 'Sandy coastal lowlands.' },
    3:  { name: 'Desert',     color: '#b87838', border: '#a06830', desc: 'Arid desert expanse.' },
    4:  { name: 'Savanna',    color: '#6a5a20', border: '#5a4c1a', desc: 'Dry scrubland.' },
    5:  { name: 'Plains',     color: '#3c6818', border: '#305410', desc: 'Open fertile plains.' },
    6:  { name: 'Forest',     color: '#204c0c', border: '#183c08', desc: 'Dense deciduous forest.' },
    7:  { name: 'Taiga',      color: '#182c10', border: '#10200a', desc: 'Cold conifer forest.' },
    8:  { name: 'Tundra',     color: '#586050', border: '#485040', desc: 'Frozen permafrost.' },
    9:  { name: 'Ice Cap',    color: '#98bcd8', border: '#7aaac8', desc: 'Glacial ice sheet.' },
    10: { name: 'Mountains',  color: '#404850', border: '#323840', desc: 'High rocky terrain.' },
    11: { name: 'Volcanic',   color: '#300a06', border: '#200604', desc: 'Active volcanic zone.' },
    12: { name: 'Swamp',      color: '#202e10', border: '#181e0a', desc: 'Waterlogged wetlands.' }
};

function getBiomeInfo(id) {
    return BIOME_STYLES[id] || { name: 'Unknown', color: '#222', border: '#333', desc: '' };
}

// ── Seeded per-cell RNG (stable — same seed = same decorations every frame) ──
function cellRng(seed) {
    let h = (seed * 2654435761) >>> 0;
    return function() {
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
        case 2:         drawSand(ctx, pts, rng); break;
        case 3:         drawSand(ctx, pts, rng); break; // rocks similar to sand but darker (color already differs)
        case 4:         drawScrub(ctx, pts, rng); break;
        case 5:         drawGrass(ctx, pts, 'rgba(35,90,12,0.6)'); break;
        case 6:         drawTrees(ctx, pts, rng); break;
        case 7:         drawPines(ctx, pts, rng); break;
        case 8:         /* tundra — sparse, just border */ break;
        case 9:         drawIce(ctx, cx, cy, r, rng); break;
        case 10:        drawPeaks(ctx, cx, cy, r, rng); break;
        case 11:        drawLava(ctx, cx, cy, r, rng); break;
        case 12:        drawMarsh(ctx, pts, rng); break;
    }
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
                    if ((nv.x-v1.x)**2+(nv.y-v1.y)**2+(nv.z-v1.z)**2 < 1e-5) h1 = true;
                    if ((nv.x-v2.x)**2+(nv.y-v2.y)**2+(nv.z-v2.z)**2 < 1e-5) h2 = true;
                    if (h1 && h2) break;
                }
                if (h1 && h2) { found = nIdx; break; }
            }
            edges.push(found);
        }
        cellEdgeNeighbors[i] = edges;
    }
}

function onDataLoaded() {
    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.revealedFeatures) dggsData.metadata.revealedFeatures = [];
    precomputeEdgeNeighbors();
}


const FEATURES = { 0:'None',1:'Ancient Ruins',2:'Impact Crater',3:'Mineral Geode',4:'Energy Anomaly',5:'Research Station',6:'Abandoned Outpost',7:'Geothermal Vent',8:'Crystalline Spires',9:'Alien Monolith' };
const FEATURE_COLORS = { 1:'#e040fb',2:'#9e9e9e',3:'#00e676',4:'#00e5ff',5:'#2979ff',6:'#ff9100',7:'#ff1744',8:'#d500f9',9:'#ffd600' };
const FACTIONS = { 0:{name:'Unclaimed Territory',color:'transparent'},1:{name:'United Colonies',color:'#00e5ff'},2:{name:'Verge Syndicate',color:'#ffaa00'},3:{name:'Precursor Remnants',color:'#d500f9'} };

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
            const d2 = dx*dx + dy*dy + dz*dz;
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

    // Depth sort: draw back-to-front
    const sorted = [];
    for (let i = 0; i < cells.length; i++) {
        const c = cells[i].center;
        const r = rotate3D(c.x, c.y, c.z);
        sorted.push({ idx: i, z: r.z, cx: r.x, cy: r.y });
    }
    sorted.sort((a, b) => a.z - b.z);

    for (const item of sorted) {
        // Cull backside
        if (item.z < -0.05) continue;

        const i = item.idx;
        const cell = cells[i];
        const tile = cell.tile;
        const planetType = dggsData.metadata?.type || 'terrestrial';
        const biome = getBiomeInfo(tile.biome);

        // Project polygon vertices
        const projVerts = [];
        let allFront = true;
        for (const v of cell.vertices) {
            const rv = rotate3D(v.x, v.y, v.z);
            if (rv.z < -0.2) { allFront = false; break; }
            projVerts.push({ x: rv.x * GLOBE_RADIUS, y: rv.y * GLOBE_RADIUS });
        }
        if (!allFront || projVerts.length < 3) continue;

        // ── Hex cell centroid ──
        const hexCx = item.cx * GLOBE_RADIUS;
        const hexCy = item.cy * GLOBE_RADIUS;
        const hexR = Math.sqrt(
            (projVerts[0].x - hexCx) ** 2 + (projVerts[0].y - hexCy) ** 2
        ) * 0.92;

        // ── 1. Clip to polygon, fill base color ──
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(projVerts[0].x, projVerts[0].y);
        for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = biome.color;
        ctx.fill();

        // ── 2. Draw abstract biome decorations (clipped inside polygon) ──
        drawBiomeTile(ctx, tile.biome, hexCx, hexCy, hexR, i);

        ctx.restore();

        // ── 3. Hover highlight ──
        if (i === hoveredIdx || i === selectedIdx) {
            ctx.beginPath();
            ctx.moveTo(projVerts[0].x, projVerts[0].y);
            for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
            ctx.closePath();
            ctx.strokeStyle = i === selectedIdx ? '#00e5ff' : 'rgba(255,255,255,0.35)';
            ctx.lineWidth = i === selectedIdx ? 1.5 : 0.8;
            ctx.stroke();
        } else {
            // ── 4. Border ──
            ctx.beginPath();
            ctx.moveTo(projVerts[0].x, projVerts[0].y);
            for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
            ctx.closePath();
            ctx.strokeStyle = biome.border;
            ctx.lineWidth = 0.4;
            ctx.stroke();
        }


        // Feature marker
        if (tile.feature > 0) {
            const isRevealed = dggsData.metadata?.revealedFeatures?.includes(i);
            const fc = FEATURE_COLORS[tile.feature] || '#fff';
            if (userRole === 'gm') {
                if (isRevealed) {
                    ctx.beginPath();
                    ctx.arc(item.cx * GLOBE_RADIUS, item.cy * GLOBE_RADIUS, 3, 0, Math.PI * 2);
                    ctx.fillStyle = fc;
                    ctx.fill();
                } else {
                    // Unexplored feature for GM: draw semi-transparent with a dotted ring
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    ctx.beginPath();
                    ctx.arc(item.cx * GLOBE_RADIUS, item.cy * GLOBE_RADIUS, 3.5, 0, Math.PI * 2);
                    ctx.strokeStyle = fc;
                    ctx.setLineDash([1.5, 1.5]);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(item.cx * GLOBE_RADIUS, item.cy * GLOBE_RADIUS, 2, 0, Math.PI * 2);
                    ctx.fillStyle = fc;
                    ctx.fill();
                    ctx.restore();
                }
            } else if (isRevealed) {
                // Players and Viewers only see revealed features
                ctx.beginPath();
                ctx.arc(item.cx * GLOBE_RADIUS, item.cy * GLOBE_RADIUS, 3, 0, Math.PI * 2);
                ctx.fillStyle = fc;
                ctx.fill();
            }
        }


        // Draw landing ship
        if (dggsData.metadata && dggsData.metadata.landingCell === i) {
            ctx.save();
            ctx.translate(item.cx * GLOBE_RADIUS, item.cy * GLOBE_RADIUS);
            
            // Draw a neat little triangular starship icon pointing upwards
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(6, 6);
            ctx.lineTo(2, 4);
            ctx.lineTo(-2, 4);
            ctx.lineTo(-6, 6);
            ctx.closePath();
            
            ctx.fillStyle = '#ffd600'; // bright yellow starship
            ctx.fill();
            ctx.strokeStyle = '#020208';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Draw landing engine glow
            ctx.beginPath();
            ctx.arc(0, 6, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3d00'; // bright orange/red glow
            ctx.fill();
            
            ctx.restore();
        }

    }

    // ── Draw Winding Rivers ──
    if (dggsData.metadata && dggsData.metadata.rivers) {
        for (const path of dggsData.metadata.rivers) {
            for (let idx = 0; idx < path.length - 1; idx++) {
                const c1 = path[idx];
                const c2 = path[idx + 1];
                
                const cellA = cells[c1];
                const cellB = cells[c2];
                if (!cellA || !cellB) continue;
                
                // Depth check: cull if both are on the backside
                const rotatedA = rotate3D(cellA.center.x, cellA.center.y, cellA.center.z);
                const rotatedB = rotate3D(cellB.center.x, cellB.center.y, cellB.center.z);
                if (rotatedA.z < -0.05 && rotatedB.z < -0.05) continue;
                
                const v1 = cellA.center;
                const v2 = cellB.center;
                
                const rv1 = rotate3D(v1.x, v1.y, v1.z);
                const rv2 = rotate3D(v2.x, v2.y, v2.z);
                if (rv1.z < -0.2 && rv2.z < -0.2) continue;
                
                // Winding normal offset
                const dx = v2.x - v1.x;
                const dy = v2.y - v1.y;
                const dz = v2.z - v1.z;
                const mx = (v1.x + v2.x) / 2;
                const my = (v1.y + v2.y) / 2;
                const mz = (v1.z + v2.z) / 2;
                
                let px = my * dz - mz * dy;
                let py = mz * dx - mx * dz;
                let pz = mx * dy - my * dx;
                const plen = Math.sqrt(px*px + py*py + pz*pz);
                if (plen > 1e-6) { px /= plen; py /= plen; pz /= plen; }
                
                // Stable noise
                const seed = Math.sin(mx * 12.9898 + my * 78.233 + mz * 437.287) * 43758.5453;
                const noise = (seed - Math.floor(seed)) - 0.5;
                const segmentLen = Math.sqrt(dx*dx + dy*dy + dz*dz);
                const offsetDist = segmentLen * 0.22 * noise;
                
                const ctrlPointLocal = {
                    x: mx + px * offsetDist,
                    y: my + py * offsetDist,
                    z: mz + pz * offsetDist
                };
                const cpLen = Math.sqrt(ctrlPointLocal.x*ctrlPointLocal.x + ctrlPointLocal.y*ctrlPointLocal.y + ctrlPointLocal.z*ctrlPointLocal.z);
                const ctrlPoint = {
                    x: ctrlPointLocal.x / cpLen,
                    y: ctrlPointLocal.y / cpLen,
                    z: ctrlPointLocal.z / cpLen
                };
                
                const rvCtrl = rotate3D(ctrlPoint.x, ctrlPoint.y, ctrlPoint.z);
                
                const p1x = rv1.x * GLOBE_RADIUS;
                const p1y = rv1.y * GLOBE_RADIUS;
                const pCtrlx = rvCtrl.x * GLOBE_RADIUS;
                const pCtrly = rvCtrl.y * GLOBE_RADIUS;
                const p2x = rv2.x * GLOBE_RADIUS;
                const p2y = rv2.y * GLOBE_RADIUS;
                
                // Draw dark blue outer border
                ctx.beginPath();
                ctx.moveTo(p1x, p1y);
                ctx.quadraticCurveTo(pCtrlx, pCtrly, p2x, p2y);
                ctx.strokeStyle = '#0a2342';
                ctx.lineWidth = 4.5;
                ctx.stroke();
                
                // Draw light blue inner river
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2.5;
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
        const d = dx*dx + dy*dy;
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
            const feat = FEATURES[t.feature] || 'None';
            const featColor = FEATURE_COLORS[t.feature] || '#e0f2f1';
            detailFeature.innerHTML = `<span style="color: ${featColor}; font-weight: bold;">${feat}</span>`;
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
        analysis += ` Sensors detected: ${FEATURES[t.feature]}.`;
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
async function loadDGGS(seed, type, resolution) {
    try {
        const url = `${HEXMAP_WORKER_URL}/planet/${seed}/dggs?type=${type}&resolution=${resolution}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Worker returned ${res.status}`);
        const buffer = await res.arrayBuffer();
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
        rotX = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, rotX));
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

featureActionBtn.addEventListener('click', async () => {
    if (selectedIdx < 0 || !dggsData) return;
    
    if (!dggsData.metadata) dggsData.metadata = {};
    if (!dggsData.metadata.revealedFeatures) dggsData.metadata.revealedFeatures = [];
    
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
        featureActionBtn.disabled = true;
        featureActionBtn.textContent = 'SCANNING...';
        featureActionBtn.style.borderColor = '#ffd600';
        featureActionBtn.style.color = '#ffd600';
        
        setTimeout(async () => {
            if (!dggsData.metadata.revealedFeatures.includes(selectedIdx)) {
                dggsData.metadata.revealedFeatures.push(selectedIdx);
            }
            
            await saveDGGSMetadata();
            featureActionBtn.disabled = false;
            
            const cell = dggsData.cells[selectedIdx];
            if (cell.tile.feature > 0) {
                alert(`Scan Complete! Found: ${FEATURES[cell.tile.feature]}`);
            } else {
                alert('Scan Complete. No geological anomalies detected.');
            }
            
            selectCell(selectedIdx);
        }, 1500);
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

