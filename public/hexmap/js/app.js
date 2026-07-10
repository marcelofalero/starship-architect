import { decodeVMB } from './vmb.js';

const HEXMAP_WORKER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8788'
    : 'https://hexmap-worker.mafalero.workers.dev';

// ── Biome Lookup ──
const BIOMES = {
    0: { name: 'Deep Ocean', color: '#0f223d', border: '#1b3b63', desc: 'Deep aquatic basin. Highly pressurized.' },
    1: { name: 'Shallow Ocean', color: '#16385c', border: '#25507d', desc: 'Coastal waters. High potential for tidal power.' },
    2: { name: 'Desert Plains', color: '#cca262', border: '#dfb574', desc: 'Arid sandy fields. High solar exposure.' },
    3: { name: 'Sandy Beach', color: '#dac28d', border: '#ead19c', desc: 'Coastal sand dunes. Low elevation.' },
    4: { name: 'Grassland Plains', color: '#386a3b', border: '#468049', desc: 'Temperate grassy fields. Fertile soil.' },
    7: { name: 'Ice Cap', color: '#eef8ff', border: '#cce5ff', desc: 'Thick glacial ice sheets. Extremely cold.' },
    8: { name: 'Frozen Tundra', color: '#97b8cc', border: '#adcde2', desc: 'Sub-zero permafrost plains.' },
    9: { name: 'Lava Field', color: '#901c10', border: '#aa2415', desc: 'Flowing basaltic magma. High geothermal output.' },
    10: { name: 'Volcanic Ash / Barren', color: '#3c3c3e', border: '#4c4c4f', desc: 'Lifeless rocky expanse.' },
    11: { name: 'Mountain Ridge', color: '#65737d', border: '#788894', desc: 'Impassable rock formations. Contains minerals.' },
    13: { name: 'Desert Oasis', color: '#1e755f', border: '#269176', desc: 'Isolated moisture pocket with local flora.' }
};
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
const detailFaction = document.getElementById('hex-faction');
const detailFeature = document.getElementById('hex-feature');
const detailAnalysis = document.getElementById('hex-analysis-text');

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
        const biome = BIOMES[tile.biome] || { name: '?', color: '#333', border: '#444' };

        // Project polygon vertices
        const projVerts = [];
        let allFront = true;
        for (const v of cell.vertices) {
            const rv = rotate3D(v.x, v.y, v.z);
            if (rv.z < -0.2) { allFront = false; break; }
            projVerts.push({ x: rv.x * GLOBE_RADIUS, y: rv.y * GLOBE_RADIUS });
        }
        if (!allFront || projVerts.length < 3) continue;

        // Draw filled polygon
        ctx.beginPath();
        ctx.moveTo(projVerts[0].x, projVerts[0].y);
        for (let k = 1; k < projVerts.length; k++) {
            ctx.lineTo(projVerts[k].x, projVerts[k].y);
        }
        ctx.closePath();
        ctx.fillStyle = biome.color;
        ctx.fill();

        // Border
        ctx.strokeStyle = biome.border;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Faction border
        if (tile.faction > 0) {
            const fact = FACTIONS[tile.faction];
            if (fact) {
                ctx.strokeStyle = fact.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Feature marker
        if (tile.feature > 0) {
            const fc = FEATURE_COLORS[tile.feature] || '#fff';
            ctx.beginPath();
            ctx.arc(item.cx * GLOBE_RADIUS, item.cy * GLOBE_RADIUS, 3, 0, Math.PI * 2);
            ctx.fillStyle = fc;
            ctx.fill();
        }

        // Highlight hovered
        if (i === hoveredIdx) {
            ctx.beginPath();
            ctx.moveTo(projVerts[0].x, projVerts[0].y);
            for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
            ctx.closePath();
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // Highlight selected
        if (i === selectedIdx) {
            ctx.beginPath();
            ctx.moveTo(projVerts[0].x, projVerts[0].y);
            for (let k = 1; k < projVerts.length; k++) ctx.lineTo(projVerts[k].x, projVerts[k].y);
            ctx.closePath();
            ctx.strokeStyle = '#ffd600';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

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
    if (idx < 0 || !dggsData) { selectedIdx = -1; infoPanel.style.display = 'none'; return; }
    selectedIdx = idx;
    const cell = dggsData.cells[idx];
    const t = cell.tile;
    detailTitle.textContent = `Cell #${idx} (${cell.sides === 5 ? 'Pentagon' : 'Hexagon'})`;
    const biome = BIOMES[t.biome] || { name: '?', color: '#333', desc: 'Unknown.' };
    detailBiome.textContent = biome.name;
    detailBiome.style.color = biome.color === '#eef8ff' ? '#99ccff' : biome.color;
    detailElevation.textContent = `Level ${t.elevation}`;
    detailMoisture.textContent = `Level ${t.moisture}`;
    const fact = FACTIONS[t.faction];
    detailFaction.innerHTML = `<span class="faction-badge" style="background-color: ${fact.color === 'transparent' ? 'rgba(255,255,255,0.05)' : fact.color + '25'}; color: ${fact.color === 'transparent' ? '#88aacc' : fact.color}">${fact.name}</span>`;
    const feat = FEATURES[t.feature] || 'None';
    const featColor = FEATURE_COLORS[t.feature] || '#e0f2f1';
    detailFeature.innerHTML = `<span style="color: ${featColor}; font-weight: bold;">${feat}</span>`;
    let analysis = `A sector classified as ${biome.name.toLowerCase()} terrain. ${biome.desc}`;
    if (t.feature > 0) analysis += ` Sensors detected: ${FEATURES[t.feature]}.`;
    detailAnalysis.textContent = analysis;
    infoPanel.style.display = 'block';
}

// ── Data Loading ──
async function loadDGGS(seed, type, resolution) {
    try {
        const url = `${HEXMAP_WORKER_URL}/planet/${seed}/dggs?type=${type}&resolution=${resolution}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Worker returned ${res.status}`);
        const buffer = await res.arrayBuffer();
        dggsData = decodeVMB(buffer);

        hudSeed.textContent = dggsData.metadata.seed || seed;
        hudType.textContent = dggsData.metadata.type || type;
        const resLabels = { 3: 'Small', 4: 'Medium', 5: 'Large', 6: 'Huge' };
        hudSize.textContent = `${resLabels[resolution] || 'Res ' + resolution} (Res ${resolution})`;
        hudTiles.textContent = dggsData.cells.length.toLocaleString();

        selectedIdx = -1; hoveredIdx = -1;
        infoPanel.style.display = 'none';
        centerViewport();
    } catch (err) {
        console.error("Failed to load DGGS:", err);
        alert(`Could not load map: ${err.message}`);
    }
}

// ── Event Handlers ──
canvas.addEventListener('mousedown', (e) => {
    isDragging = true; hasMoved = false;
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
        hasMoved = true;
    }
    lastMouseX = e.clientX; lastMouseY = e.clientY;

    const idx = getCellUnderMouse(mx, my);
    hoveredIdx = idx;
    if (idx >= 0 && dggsData) {
        const cell = dggsData.cells[idx];
        const biome = BIOMES[cell.tile.biome] || { name: '?' };
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

closeInfoBtn.addEventListener('click', () => { selectedIdx = -1; infoPanel.style.display = 'none'; });

vmbUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadStatus.textContent = `Loading ${file.name}...`;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            dggsData = decodeVMB(evt.target.result);
            hudSeed.textContent = dggsData.metadata?.seed || 'Uploaded';
            hudType.textContent = dggsData.metadata?.type || 'unknown';
            hudSize.textContent = `${dggsData.cells.length} cells`;
            hudTiles.textContent = dggsData.cells.length.toLocaleString();
            selectedIdx = -1; hoveredIdx = -1;
            infoPanel.style.display = 'none';
            uploadStatus.textContent = 'Loaded!';
            centerViewport();
        } catch (err) {
            uploadStatus.textContent = `Error: ${err.message}`;
        }
    };
    reader.readAsArrayBuffer(file);
});

// ── Init ──
loadDGGS('Sol_III', 'terrestrial', 4);
requestAnimationFrame(draw);
