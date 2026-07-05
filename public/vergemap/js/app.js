import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const i18n = {
    en: {
        backLink: "&larr; Back to Main Index",
        title: "The Verge Map",
        shareBtn: "Share Link",
        searchStar: "Search Star System",
        selectStar: "-- Select a Star --",
        distCalc: "Distance Calculator (LY)",
        origin: "-- Origin --",
        destination: "-- Destination --",
        calcDist: "Calculate Distance",
        travelRoute: "Travel Route:",
        distancePlaceholder: "Distance (LY)",
        travelBtn: "Travel",
        shipControls: "Ship Controls",
        newShipName: "New Ship Name",
        newEntityNamePlaceholder: "New Entity Name...",
        createBtn: "Create",
        createEntityTitle: "Create New Entity",
        entityType: "Entity Type",
        entityNameLabel: "Name",
        entityNamePlaceholder: "Enter name...",
        starClassLabel: "Star Class",
        poiTypeLabel: "POI Type",
        coordinatesLabel: "Coordinates (X, Y, Z)",
        descriptionLabel: "Description",
        ownershipLabel: "Ownership",
        ownerLabel: "Owner",
        ownershipGM: "GM",
        ownershipPlayers: "Players",
        moveShipBtn: "Move Ship",
        moveShipTitle: "Move Ship",
        movePoiBtn: "Move POI",
        movePoiTitle: "Move POI",
        moveDestTypeLabel: "Destination Type",
        destCoordinates: "Coordinates",
        destEntity: "Entity (Star/POI/Ship)",
        selectTargetEntity: "Target Entity",
        moveBtn: "Move",
        moveHereBtn: "Move Ship Here",
        moveHereTitle: "Move Ship Here",
        selectShipToMove: "Select Ship",
        targetLabel: "Target",
        totalDistanceLabel: "Total Distance",
        travelDistanceLabel: "Travel Distance (LY)",
        logBtn: "Movement Log",
        logTitle: "Movement Log",
        addEntity: "Add New Entity",
        selectShip: "-- Select Ship to Edit --",
        uploadToken: "Upload Ship Token",
        updatePosition: "Update Position",
        deleteBtn: "Delete",
        dataManagement: "Data Management",
        exportYaml: "Export YAML",
        importYaml: "Import YAML",
        infoType: "Type",
        infoClass: "Class",
        infoCoords: "Coords",
        tokenEditor: "Token Editor",
        tokenRotation: "Rotation (Degrees)",
        tokenScale: "Scale (Size on Map)",
        tokenRemoveBg: "Auto-remove Background (Top-left Pixel)",
        tokenTolerance: "Tolerance (0 - 255)",
        saveToken: "Save Token",
        cancelToken: "Cancel",
        copied: "Copied!",
        distanceResult: "Distance: {dist} LY",
        routeResult: "Route: {a} &rarr; {b}",
        selectTwoPoints: "Please select two points.",
        distanceResultFull: "Distance from <strong>{a}</strong> to <strong>{b}</strong> is <strong>{dist} LY</strong>.",
        optgroupStars: "Stars",
        optgroupShips: "Ships",
        optgroupPois: "Points of Interest",
        shareSessionTitle: "Share Session Access Links",
        shareSessionDesc: "Below are your session access links. Keep the Game Master link private; share the Player link with players to allow them to move ships, and the Viewer link for spectators.",
        gmLink: "Game Master Link (Admin - Full Access)",
        gmLinkTip: "To save this, drag this button to your bookmarks bar or press Ctrl+D / Cmd+D.",
        playerLink: "Player Link (Navigation & Move Access)",
        viewerLink: "Viewer Link (Read-Only Spectator Access)",
        shareWhatsApp: "Share Player Link via WhatsApp",
        shareEmail: "Share Player Link via Email",
        closeBtn: "Close",
        copyBtn: "Copy",
        shareBtnLabel: "Share",
        cancelBtn: "Cancel"
    },
    es: {
        backLink: "&larr; Volver al Índice Principal",
        title: "Mapa The Verge",
        shareBtn: "Compartir Enlace",
        searchStar: "Buscar Sistema Estelar",
        selectStar: "-- Seleccionar Estrella --",
        distCalc: "Calculadora de Distancia (AL)",
        origin: "-- Origen --",
        destination: "-- Destino --",
        calcDist: "Calcular Distancia",
        travelRoute: "Ruta de Viaje:",
        distancePlaceholder: "Distancia (AL)",
        travelBtn: "Viajar",
        shipControls: "Controles de Nave",
        newShipName: "Nombre de Nave",
        newEntityNamePlaceholder: "Nueva Entidad...",
        createBtn: "Crear",
        createEntityTitle: "Crear Nueva Entidad",
        entityType: "Tipo de Entidad",
        entityNameLabel: "Nombre",
        entityNamePlaceholder: "Introducir nombre...",
        starClassLabel: "Clase de Estrella",
        poiTypeLabel: "Tipo de PDI",
        coordinatesLabel: "Coordenadas (X, Y, Z)",
        descriptionLabel: "Descripción",
        ownershipLabel: "Propiedad",
        ownerLabel: "Propietario",
        ownershipGM: "DJ",
        ownershipPlayers: "Jugadores",
        moveShipBtn: "Mover Nave",
        moveShipTitle: "Mover Nave",
        movePoiBtn: "Mover PDI",
        movePoiTitle: "Mover PDI",
        moveDestTypeLabel: "Tipo de Destino",
        destCoordinates: "Coordenadas",
        destEntity: "Entidad (Estrella/PDI/Nave)",
        selectTargetEntity: "Entidad Objetivo",
        moveBtn: "Mover",
        moveHereBtn: "Mover Nave Aquí",
        moveHereTitle: "Mover Nave Aquí",
        selectShipToMove: "Seleccionar Nave",
        targetLabel: "Destino",
        totalDistanceLabel: "Distancia Total",
        travelDistanceLabel: "Distancia de Viaje (AL)",
        logBtn: "Registro de Movimientos",
        logTitle: "Registro de Movimientos",
        addEntity: "Añadir Nueva Entidad",
        selectShip: "-- Seleccionar Nave a Editar --",
        uploadToken: "Subir Ficha de Nave",
        updatePosition: "Actualizar Posición",
        deleteBtn: "Eliminar",
        dataManagement: "Gestión de Datos",
        exportYaml: "Exportar YAML",
        importYaml: "Importar YAML",
        infoType: "Tipo",
        infoClass: "Clase",
        infoCoords: "Coords",
        tokenEditor: "Editor de Fichas",
        tokenRotation: "Rotación (Grados)",
        tokenScale: "Escala (Tamaño en el mapa)",
        tokenRemoveBg: "Auto-eliminar Fondo (Píxel sup. izq.)",
        tokenTolerance: "Tolerancia (0 - 255)",
        saveToken: "Guardar Ficha",
        cancelToken: "Cancelar",
        copied: "¡Copiado!",
        distanceResult: "Distancia: {dist} AL",
        routeResult: "Ruta: {a} &rarr; {b}",
        selectTwoPoints: "Por favor, seleccione dos puntos.",
        distanceResultFull: "La distancia de <strong>{a}</strong> a <strong>{b}</strong> es <strong>{dist} AL</strong>.",
        optgroupStars: "Estrellas",
        optgroupShips: "Naves",
        optgroupPois: "Puntos de Interés",
        shareSessionTitle: "Compartir Enlaces de Acceso",
        shareSessionDesc: "A continuación se presentan los enlaces de acceso a la sesión. Mantenga el enlace del Director de Juego en privado; comparta el enlace de Jugador para permitirles mover naves y el enlace de Visor para espectadores.",
        gmLink: "Enlace del Director de Juego (Admin - Acceso Total)",
        gmLinkTip: "Para guardarlo, arrastre este botón a su barra de marcadores o presione Ctrl+D / Cmd+D.",
        playerLink: "Enlace del Jugador (Acceso de Navegación y Movimiento)",
        viewerLink: "Enlace del Visor (Acceso de Solo Lectura)",
        shareWhatsApp: "Compartir enlace del jugador por WhatsApp",
        shareEmail: "Compartir enlace del jugador por Correo",
        closeBtn: "Cerrar",
        copyBtn: "Copiar",
        shareBtnLabel: "Compartir",
        cancelBtn: "Cancelar"
    }
};

let currentLang = 'en';

let scene, camera, renderer, labelRenderer, controls;
let starsData = [];
let shipsData = [];
let logsData = [];
let tokensData = [];
let lastMovedShipName = localStorage.getItem('lastMovedShipName') || null;

function setLastMovedShip(name) {
    lastMovedShipName = name;
    localStorage.setItem('lastMovedShipName', name);
}
const sceneObjects = {}; // Map name to 3D object for search
const interactiveObjects = []; // Array of meshes for raycasting
let mqttClient = null;

function applyTranslations(lang) {
    currentLang = lang;
    localStorage.setItem('vergeMapLang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) {
            el.innerHTML = i18n[lang][key];
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18n[lang][key]) {
            el.placeholder = i18n[lang][key];
        }
    });
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-label');
        if (i18n[lang][key]) {
            el.label = i18n[lang][key];
        }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (i18n[lang][key]) {
            el.title = i18n[lang][key];
        }
    });
    
    // Trigger any active distance results to update if they exist
    const distResult = document.getElementById('distance-result');
    if (distResult && distResult.innerHTML !== '') {
        document.getElementById('calc-btn').click();
    }
    
    if (typeof refreshDropdowns === 'function' && (starsData.length > 0 || shipsData.length > 0)) {
        refreshDropdowns();
    }
}

// Auto-detect Spanish browser language or use saved preference
const savedLang = localStorage.getItem('vergeMapLang');
const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
const initLang = savedLang || (browserLang.startsWith('es') ? 'es' : 'en');

applyTranslations(initLang);
document.getElementById('lang-select').value = initLang;



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

const urlParams = new URLSearchParams(window.location.search);
const sessionParam = urlParams.get('session');
let currentSessionId = null;
let currentMode = 'ro'; // Default to read-only for spectator safety if a session param is present
let sessionToken = null;

let savedSessionTokens = null;
try {
    const cached = localStorage.getItem('vergeMapSessionTokens');
    if (cached) savedSessionTokens = JSON.parse(cached);
} catch (e) {}

if (sessionParam) {
    const decoded = decodeToken(sessionParam);
    if (decoded && decoded.session_id && decoded.role) {
        currentSessionId = decoded.session_id;
        currentMode = decoded.role;
        sessionToken = sessionParam;
    } else {
        // Fallback for legacy raw UUID session IDs
        currentSessionId = sessionParam;
        currentMode = urlParams.get('mode') || 'nav';
        sessionToken = localStorage.getItem('vergemap_token');
    }
} else {
    // If no session in URL, default to 'gm' mode for local/new setup
    currentMode = 'gm';
    sessionToken = localStorage.getItem('vergemap_token');
}

let starTexture, starGeometry, shipGeometry, shipMat;

// Raycaster setup
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// UI Elements
const infoPanel = document.getElementById('info-panel');
const infoName = document.getElementById('info-name');
const infoType = document.getElementById('info-type');
const infoClass = document.getElementById('info-class');
const infoCoords = document.getElementById('info-coords');
const infoDesc = document.getElementById('info-desc');

// API and Session Sync
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' // Local NGINX proxy handles API requests
    : 'https://sa-backend.mafalero.workers.dev';
let isSyncing = false;

async function ensureAuth() {
    if (sessionToken) return;
    try {
        const guestId = crypto.randomUUID();
        const email = `guest_${guestId}@example.com`;
        const password = crypto.randomUUID();
        
        await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name: 'Guest' })
        });
        
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.access_token) {
            sessionToken = data.access_token;
            localStorage.setItem('vergemap_token', sessionToken);
        }
    } catch (e) {
        console.error("Auth failed", e);
    }
}

async function createBackendSession(ships, requestedId = null) {
    await ensureAuth();
    if (!sessionToken) return null;
    try {
        const res = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                id: requestedId || "",
                name: 'Verge Map Session',
                visibility: 'public',
                data: { ships: ships, stars: starsData, logs: logsData, tokens: tokensData }
            })
        });
        const data = await res.json();
        return data; // Returns the full response containing id and tokens
    } catch(e) {
        console.error("Create session failed", e);
        return null;
    }
}

async function fetchBackendSession(id) {
    try {
        const headers = {};
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        const res = await fetch(`${API_BASE}/sessions/${id}`, {
            cache: 'no-store',
            headers: headers
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data; // returns { ships: [...] }
    } catch (e) {
        console.error("Fetch session failed", e);
        return null;
    }
}

async function updateBackendSession(id, ships) {
    if (!sessionToken) await ensureAuth();
    if (!sessionToken || !id) return;
    try {
        await fetch(`${API_BASE}/sessions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                name: 'Verge Map Session',
                visibility: 'public',
                data: { ships: ships, stars: starsData, logs: logsData, tokens: tokensData }
            })
        });
    } catch(e) {
        console.error("Update session failed", e);
    }
}

function saveTokens() {
    localStorage.setItem('vergeMapTokens', JSON.stringify(tokensData));
}



function setupMqttPubSub(sessionId) {
    const brokerUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `ws://${window.location.hostname}:9001`
        : `wss://broker.hivemq.com:8884/mqtt`;
        
    mqttClient = mqtt.connect(brokerUrl);
    
    mqttClient.on('connect', () => {
        console.log("Connected to real-time Pub/Sub");
        mqttClient.subscribe(`vergemap/sessions/${sessionId}`);
    });
    
    mqttClient.on('message', (topic, message) => {
        try {
            const remoteShip = JSON.parse(message.toString());
            let localShip = shipsData.find(s => s.name === remoteShip.name);
            let shouldRender = false;

            const token = remoteShip.tokenId ? tokensData.find(t => t.id === remoteShip.tokenId) : null;
            if (remoteShip.tokenId && !token) {
                fetchBackendSession(currentSessionId).then(sessionData => {
                    if (sessionData && sessionData.tokens) {
                        tokensData = sessionData.tokens;
                        saveTokens();
                        renderShips();
                        renderStars();
                    }
                });
            }

            if (localShip) {
                // Determine if we need to animate position change
                const distSq = (localShip.x - remoteShip.x)**2 + (localShip.y - remoteShip.y)**2 + (localShip.z - remoteShip.z)**2;
                if (distSq > 0.01 || localShip.rx !== remoteShip.rx) {
                    
                    const timeSinceLocalMove = performance.now() - (localShip._lastLocalMove || 0);
                    if (timeSinceLocalMove > 5000) {
                        const oldX = localShip.x;
                        const oldY = localShip.y;
                        const oldZ = localShip.z;
                        
                        localShip.x = remoteShip.x;
                        localShip.y = remoteShip.y;
                        localShip.z = remoteShip.z;
                        
                        if (remoteShip.rx !== undefined) {
                            localShip.rx = remoteShip.rx;
                            localShip.ry = remoteShip.ry;
                            localShip.rz = remoteShip.rz;
                            localShip.rw = remoteShip.rw;
                        }
                        
                        if (sceneObjects[localShip.name]) {
                            animateShip(localShip, oldX, oldY, oldZ);
                        }
                        
                        if (document.getElementById('ship-select') && document.getElementById('ship-select').value === localShip.name) {
                            document.getElementById('ship-x').value = localShip.x.toFixed(2);
                            document.getElementById('ship-y').value = localShip.y.toFixed(2);
                            document.getElementById('ship-z').value = localShip.z.toFixed(2);
                        }
                    }
                }
                
                // Copy token properties
                if (localShip.tokenId !== remoteShip.tokenId || localShip.tokenScale !== remoteShip.tokenScale) {
                    localShip.tokenId = remoteShip.tokenId;
                    localShip.tokenScale = remoteShip.tokenScale;
                    shouldRender = true;
                }
            } else {
                // It's a new ship created remotely
                shipsData.push(remoteShip);
                shouldRender = true;
            }
            
            if (shouldRender) {
                renderShips();
                refreshDropdowns();
            }
            saveShips();
            
        } catch (e) {
            console.error("Failed to parse pub/sub message", e);
        }
    });
}

init();async function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.005);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 90);

    const container = document.getElementById('canvas-container');

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 200;
    
    // Restrict wobble to 15 degrees from straight-on view (Z-axis)
    controls.minAzimuthAngle = -Math.PI / 12;
    controls.maxAzimuthAngle = Math.PI / 12;
    controls.minPolarAngle = Math.PI / 2 - Math.PI / 12;
    controls.maxPolarAngle = Math.PI / 2 + Math.PI / 12;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    camera.add(pointLight); 
    scene.add(camera);

    const gridHelper = new THREE.GridHelper(120, 48, 0x333333, 0x111111);
    gridHelper.rotation.x = Math.PI / 2; 
    scene.add(gridHelper);

    await loadData();

    window.addEventListener('resize', onWindowResize);
    document.getElementById('search-star').addEventListener('change', onSearchChange);
    document.getElementById('calc-btn').addEventListener('click', calculateDistance);
    document.getElementById('close-info').addEventListener('click', () => infoPanel.style.display = 'none');
    document.getElementById('ship-select').addEventListener('change', onShipSelectChange);
    document.getElementById('move-ship-btn').addEventListener('click', updateShipPosition);
    // Create Entity Modal triggers
    document.getElementById('open-create-modal-btn').addEventListener('click', () => {
        currentCreateType = 'Ship';
        document.getElementById('create-entity-name').value = '';
        document.getElementById('create-entity-desc').value = '';
        document.getElementById('create-entity-x').value = '0';
        document.getElementById('create-entity-y').value = '0';
        document.getElementById('create-entity-z').value = '0';
        populateCreateTokenDropdown();
        setActiveCreateTab('Ship');
        document.getElementById('create-entity-modal').style.display = 'flex';
    });

    document.getElementById('tab-ship').addEventListener('click', () => setActiveCreateTab('Ship'));
    document.getElementById('tab-star').addEventListener('click', () => setActiveCreateTab('Star'));
    document.getElementById('tab-poi').addEventListener('click', () => setActiveCreateTab('POI'));

    document.getElementById('cancel-create-entity-btn').addEventListener('click', () => {
        document.getElementById('create-entity-modal').style.display = 'none';
    });

    document.getElementById('submit-create-entity-btn').addEventListener('click', submitCreateEntity);
    document.getElementById('delete-ship-btn').addEventListener('click', deleteShip);
    
    // Entity Editor
    document.getElementById('save-entity-btn').addEventListener('click', saveEntityEdits);
    document.getElementById('delete-entity-btn').addEventListener('click', deleteEntityEdits);
    document.getElementById('cancel-entity-btn').addEventListener('click', closeEntityEditor);
    document.getElementById('travel-btn').addEventListener('click', travelAlongRoute);
    
    // Token Upload (Create modal)
    document.getElementById('create-upload-token-btn').addEventListener('click', () => {
        currentTokenEntity = { name: document.getElementById('create-entity-name').value.trim() || 'New Entity' };
        currentTokenEntityType = 'Create';
        document.getElementById('token-upload-file').click();
    });

    // Token Upload (Modal - Any entity)
    document.getElementById('entity-upload-token-btn').addEventListener('click', () => {
        if (!currentEditEntity) return;
        currentTokenEntity = currentEditEntity.data;
        currentTokenEntityType = currentEditEntity.type; // 'Ship' or 'Star' or 'POI'
        document.getElementById('token-upload-file').click();
    });

    document.getElementById('token-upload-file').addEventListener('change', uploadEntityToken);

    // Token Editor Modal
    document.getElementById('token-rotation').addEventListener('input', updateTokenPreview);
    document.getElementById('token-remove-bg').addEventListener('change', updateTokenPreview);
    document.getElementById('token-tolerance').addEventListener('input', updateTokenPreview);
    document.getElementById('save-token-btn').addEventListener('click', saveTokenEdits);
    
    document.getElementById('lang-select').addEventListener('change', (e) => {
        applyTranslations(e.target.value);
    });

    document.getElementById('share-btn').addEventListener('click', () => {
        showShareModal();
    });

    document.querySelectorAll('.share-copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            const inputEl = document.getElementById(targetId);
            try {
                await navigator.clipboard.writeText(inputEl.value);
                const originalText = e.currentTarget.innerHTML;
                e.currentTarget.innerHTML = i18n[currentLang].copied || "Copied!";
                setTimeout(() => {
                    e.currentTarget.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        });
    });

    document.getElementById('close-share-modal-btn').addEventListener('click', () => {
        document.getElementById('share-modal').style.display = 'none';
    });
    document.getElementById('cancel-token-btn').addEventListener('click', closeTokenEditor);

    // YAML Import/Export
    document.getElementById('export-yaml-btn').addEventListener('click', exportYaml);
    document.getElementById('import-yaml-btn').addEventListener('click', () => {
        document.getElementById('import-yaml-file').click();
    });
    document.getElementById('import-yaml-file').addEventListener('change', importYaml);
    
    // Move Ship Modal
    document.getElementById('move-dest-type').addEventListener('change', (e) => {
        const selectGroup = document.getElementById('move-entity-select-group');
        if (e.target.value === 'entity') {
            selectGroup.style.display = 'block';
            updateMoveCoordsFromSelectedEntity();
        } else {
            selectGroup.style.display = 'none';
        }
    });
    document.getElementById('move-entity-select').addEventListener('change', updateMoveCoordsFromSelectedEntity);

    // Auto-detect entity when coords are typed manually
    function onMoveCoordInput() {
        const x = parseFloat(document.getElementById('move-coord-x').value);
        const y = parseFloat(document.getElementById('move-coord-y').value);
        const z = parseFloat(document.getElementById('move-coord-z').value);
        if (isNaN(x) || isNaN(y) || isNaN(z)) return;

        const TOLERANCE = 0.5;
        const all = [...starsData, ...shipsData].filter(e => !currentMoveShip || e.name !== currentMoveShip.name);
        const match = all.find(e => {
            const dx = e.x - x, dy = e.y - y, dz = e.z - z;
            return Math.sqrt(dx*dx + dy*dy + dz*dz) <= TOLERANCE;
        });

        const destTypeEl = document.getElementById('move-dest-type');
        const selectGroup = document.getElementById('move-entity-select-group');
        const entitySelect = document.getElementById('move-entity-select');

        if (match) {
            destTypeEl.value = 'entity';
            selectGroup.style.display = 'block';
            // Select the matching entity in the dropdown if it exists as an option
            if ([...entitySelect.options].some(o => o.value === match.name)) {
                entitySelect.value = match.name;
            }
        } else {
            destTypeEl.value = 'coords';
            selectGroup.style.display = 'none';
        }
    }
    ['move-coord-x', 'move-coord-y', 'move-coord-z'].forEach(id => {
        document.getElementById(id).addEventListener('input', onMoveCoordInput);
    });
    document.getElementById('cancel-move-ship-btn').addEventListener('click', () => {
        document.getElementById('move-ship-modal').style.display = 'none';
    });
    document.getElementById('confirm-move-ship-btn').addEventListener('click', submitMoveShip);

    // Move Here Modal
    document.getElementById('move-here-ship-select').addEventListener('change', updateMoveHereDistance);
    document.getElementById('cancel-move-here-btn').addEventListener('click', () => {
        document.getElementById('move-here-modal').style.display = 'none';
    });
    document.getElementById('confirm-move-here-btn').addEventListener('click', submitMoveHere);

    // Log Modal
    document.getElementById('log-btn').addEventListener('click', () => {
        document.getElementById('log-modal').style.display = 'flex';
        renderLogs();
    });
    document.getElementById('close-log-modal-btn').addEventListener('click', () => {
        document.getElementById('log-modal').style.display = 'none';
    });

    // Setup click listener for raycasting
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    applyModeUI();

    animate();
}

function getStarColor(cls) {
    switch(cls) {
        case 'O': return 0x9db4ff; // Blue
        case 'B': return 0xa2b9ff; // Blue-white
        case 'A': return 0xffffff; // White
        case 'F': return 0xffffd0; // Yellow-white
        case 'G': return 0xffff00; // Yellow
        case 'K': return 0xff9833; // Orange
        case 'M': return 0xff3333; // Red
        case 'P': return 0xff00ff; // POI (Magenta)
        case 'P_STATION': return 0x00ffcc; // Cyan for station
        case 'P_DERELICT': return 0x777777; // Gray for derelict
        case 'P_ANOMALY': return 0xff00bb; // Bright Pink/Magenta for anomaly
        default: return 0xffffff;
    }
}

function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    return new THREE.CanvasTexture(canvas);
}

function saveShips() {
    localStorage.setItem('vergeMapShips', JSON.stringify(shipsData));
}

function saveStars() {
    localStorage.setItem('vergeMapStars', JSON.stringify(starsData));
}

function saveLogs() {
    localStorage.setItem('vergeMapLogs', JSON.stringify(logsData));
}

function applyModeUI() {
    const shipControls = document.getElementById('panel-ship-controls');
    const openCreateBtn = document.getElementById('open-create-modal-btn');
    const tokenRow = document.getElementById('ui-token-row');
    const dataManagement = document.getElementById('panel-data-management');
    const moveBtn = document.getElementById('move-ship-btn');
    const delBtn = document.getElementById('delete-ship-btn');
    const logPanel = document.getElementById('panel-movement-log');
    
    if (currentMode === 'ro') {
        if (shipControls) shipControls.style.display = 'none';
        if (dataManagement) dataManagement.style.display = 'none';
        if (logPanel) logPanel.style.display = 'none';
    } else if (currentMode === 'nav') {
        if (shipControls) shipControls.style.display = 'block';
        if (openCreateBtn) openCreateBtn.style.display = 'none';
        if (tokenRow) tokenRow.style.display = 'none';
        if (delBtn) delBtn.style.display = 'none';
        if (dataManagement) dataManagement.style.display = 'none';
        if (moveBtn) moveBtn.style.flex = '1';
        if (logPanel) logPanel.style.display = 'block';
    } else if (currentMode === 'gm') {
        if (shipControls) shipControls.style.display = 'block';
        if (openCreateBtn) openCreateBtn.style.display = 'flex';
        if (tokenRow) tokenRow.style.display = 'flex';
        if (delBtn) delBtn.style.display = 'block';
        if (dataManagement) dataManagement.style.display = 'block';
        if (moveBtn) moveBtn.style.flex = '2';
        if (logPanel) logPanel.style.display = 'block';
    }
}

function showShareModal(tokens) {
    if (!tokens) {
        tokens = savedSessionTokens;
    }
    if (tokens) {
        savedSessionTokens = tokens;
        localStorage.setItem('vergeMapSessionTokens', JSON.stringify(tokens));
    }
    
    const baseUrl = window.location.origin + window.location.pathname;
    
    let gmVal = "";
    let playerVal = "";
    let viewerVal = "";
    
    if (tokens) {
        gmVal = `${baseUrl}?session=${tokens.gm}`;
        playerVal = `${baseUrl}?session=${tokens.nav}`;
        viewerVal = `${baseUrl}?session=${tokens.ro}`;
    } else if (currentSessionId && sessionToken) {
        // Fallback for current active token in URL
        if (currentMode === 'gm') {
            gmVal = window.location.href;
        } else if (currentMode === 'nav') {
            playerVal = window.location.href;
        } else {
            viewerVal = window.location.href;
        }
    } else if (currentSessionId) {
        // Legacy fallback
        const legacyUrl = `${baseUrl}?session=${currentSessionId}`;
        gmVal = legacyUrl + "&mode=gm";
        playerVal = legacyUrl + "&mode=nav";
        viewerVal = legacyUrl + "&mode=ro";
    }
    
    document.getElementById('share-gm-url').value = gmVal;
    document.getElementById('share-player-url').value = playerVal;
    document.getElementById('share-viewer-url').value = viewerVal;
    
    const targetShareUrl = playerVal || viewerVal || gmVal;
    if (targetShareUrl) {
        const encodedUrl = encodeURIComponent(targetShareUrl);
        document.getElementById('share-whatsapp-btn').href = `https://api.whatsapp.com/send?text=${encodeURIComponent("Join my Verge Map session: ")}` + encodedUrl;
        document.getElementById('share-email-btn').href = `mailto:?subject=Verge Map Session&body=${encodeURIComponent("Join my Verge Map session: ")}` + encodedUrl;
    }
    
    const nativeBtns = document.querySelectorAll('.share-native-btn');
    if (navigator.share && targetShareUrl) {
        nativeBtns.forEach(btn => {
            btn.style.display = 'inline-block';
            btn.onclick = (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                const role = e.currentTarget.getAttribute('data-role');
                const urlToShare = document.getElementById(targetId).value;
                if (!urlToShare) return;
                
                navigator.share({
                    title: `Verge Map Session - ${role} Access`,
                    text: `Join my Verge Map session as a ${role}:`,
                    url: urlToShare
                }).catch(err => console.error("Web Share failed", err));
            };
        });
        document.getElementById('fallback-share-actions').style.display = 'none';
    } else {
        nativeBtns.forEach(btn => btn.style.display = 'none');
        document.getElementById('fallback-share-actions').style.display = 'flex';
    }
    
    const gmRow = document.getElementById('share-gm-url').closest('div').parentElement;
    const playerRow = document.getElementById('share-player-url').closest('div').parentElement;
    const viewerRow = document.getElementById('share-viewer-url').closest('div').parentElement;
    
    if (currentMode === 'gm') {
        gmRow.style.display = gmVal ? 'block' : 'none';
        playerRow.style.display = playerVal ? 'block' : 'none';
        viewerRow.style.display = viewerVal ? 'block' : 'none';
    } else if (currentMode === 'nav') {
        gmRow.style.display = 'none';
        playerRow.style.display = playerVal ? 'block' : 'none';
        viewerRow.style.display = 'none';
    } else {
        gmRow.style.display = 'none';
        playerRow.style.display = 'none';
        viewerRow.style.display = viewerVal ? 'block' : 'none';
    }
    
    document.getElementById('share-modal').style.display = 'flex';
}

function renderLogs() {
    const list = document.getElementById('movement-log-list');
    if (!list) return;
    list.innerHTML = '';
    
    logsData.forEach(log => {
        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        div.style.paddingBottom = '4px';
        div.style.borderBottom = '1px solid #333';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = `[${new Date(log.timestamp).toLocaleString()}] ${log.message}`;
        div.appendChild(textSpan);
        
        if (currentMode === 'gm') {
            const delLogBtn = document.createElement('button');
            delLogBtn.textContent = 'x';
            delLogBtn.style.background = 'transparent';
            delLogBtn.style.border = 'none';
            delLogBtn.style.color = '#ff3333';
            delLogBtn.style.cursor = 'pointer';
            delLogBtn.style.padding = '0 5px';
            delLogBtn.onclick = () => {
                logsData = logsData.filter(l => l.id !== log.id);
                saveLogs();
                if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
                renderLogs();
            };
            div.appendChild(delLogBtn);
        }
        
        list.appendChild(div);
    });
}

function addLog(message) {
    logsData.unshift({
        id: crypto.randomUUID(),
        message: message,
        timestamp: Date.now()
    });
    if (logsData.length > 100) logsData.pop();
    saveLogs();
    if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
    renderLogs();
}

async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        const savedStars = localStorage.getItem('vergeMapStars');
        if (savedStars) {
            starsData = JSON.parse(savedStars);
        } else {
            starsData = data.stars || [];
            saveStars();
        }
        
        const savedLogs = localStorage.getItem('vergeMapLogs');
        if (savedLogs) {
            logsData = JSON.parse(savedLogs);
        } else {
            logsData = data.logs || [];
            saveLogs();
        }

        const savedTokens = localStorage.getItem('vergeMapTokens');
        if (savedTokens) {
            tokensData = JSON.parse(savedTokens);
        } else {
            tokensData = [];
            saveTokens();
        }
        
        let customIdToCreate = null;
        if (currentSessionId) {
            const sessionData = await fetchBackendSession(currentSessionId);
            if (sessionData && sessionData.ships) {
                shipsData = sessionData.ships;
                if (sessionData.stars) starsData = sessionData.stars;
                if (sessionData.logs) logsData = sessionData.logs;
                if (sessionData.tokens) tokensData = sessionData.tokens || [];
            } else {
                // Session ID in URL was invalid or 404'd. Remove it so we can create a new one.
                customIdToCreate = currentSessionId;
                currentSessionId = null;
            }
        }
        
        if (!currentSessionId) {
            // Check local backup first
            const savedShips = localStorage.getItem('vergeMapShips');
            shipsData = savedShips ? JSON.parse(savedShips) : (data.ships || []);
            
            // Create a new session with our starting state
            const resData = await createBackendSession(shipsData, customIdToCreate);
            if (resData && resData.id) {
                currentSessionId = resData.id;
                
                if (resData.tokens) {
                    savedSessionTokens = resData.tokens;
                    localStorage.setItem('vergeMapSessionTokens', JSON.stringify(resData.tokens));
                    sessionToken = resData.tokens.gm; // We created it, we are the GM!
                    currentMode = 'gm';
                    
                    const url = new URL(window.location);
                    url.searchParams.set('session', resData.tokens.gm);
                    window.history.pushState({}, '', url);
                    
                    // Show the sharing links modal to let the user save/copy the links
                    showShareModal(resData.tokens);
                } else {
                    const url = new URL(window.location);
                    url.searchParams.set('session', resData.id);
                    window.history.pushState({}, '', url);
                }
            }
        }
        saveShips();

        starTexture = createStarTexture();
        starGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        shipGeometry = new THREE.TetrahedronGeometry(0.5);
        shipMat = new THREE.MeshPhongMaterial({
            color: 0x4bb5c1,
            emissive: 0x389ebd,
            emissiveIntensity: 0.5
        });

        renderStars();
        renderShips();
        renderLogs();
        refreshDropdowns();
        
        if (currentSessionId) {
            setupMqttPubSub(currentSessionId);
        }

    } catch (e) {
        console.error('Error loading data:', e);
    }
}

function removeMeshCompletely(mesh, name) {
    scene.remove(mesh);
    if (mesh.userData.stem) scene.remove(mesh.userData.stem);
    mesh.children.forEach(child => {
        if (child.element) child.element.remove();
    });
    const index = interactiveObjects.indexOf(mesh);
    if (index > -1) interactiveObjects.splice(index, 1);
    delete sceneObjects[name];
}

function renderStars() {
    // Clear old stars/POIs if re-rendering
    Object.keys(sceneObjects).forEach(key => {
        const mesh = sceneObjects[key];
        if (mesh.userData && (mesh.userData.type === 'Star' || mesh.userData.type === 'POI')) {
            removeMeshCompletely(mesh, key);
        }
    });

    starsData.forEach(star => {
        if (star.isHidden && currentMode !== 'gm') return;
        
        const token = star.tokenId ? tokensData.find(t => t.id === star.tokenId) : null;
        const resolvedTokenUrl = token ? token.url : star.tokenUrl;
        
        let mesh;
        if (resolvedTokenUrl) {
            const textureLoader = new THREE.TextureLoader();
            const tokenTexture = textureLoader.load(resolvedTokenUrl);
            
            const scale = star.tokenScale || 1.0;
            const tokenGeom = new THREE.PlaneGeometry(2 * scale, 2 * scale);
            
            const tokenMat = new THREE.MeshBasicMaterial({
                map: tokenTexture,
                transparent: true,
                opacity: star.isHidden ? 0.3 : 1,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            mesh = new THREE.Mesh(tokenGeom, tokenMat);
        } else {
            const colorHex = getStarColor(star.class);
            let geom = starGeometry;
            let mat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: star.isHidden,
                opacity: star.isHidden ? 0.3 : 1
            });
            
            if (star.class === 'P_STATION') {
                geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                mat = new THREE.MeshBasicMaterial({ 
                    color: colorHex,
                    transparent: star.isHidden,
                    opacity: star.isHidden ? 0.3 : 1
                });
            } else if (star.class === 'P_DERELICT') {
                geom = new THREE.ConeGeometry(0.8, 2, 4);
                mat = new THREE.MeshBasicMaterial({ 
                    color: colorHex,
                    transparent: star.isHidden,
                    opacity: star.isHidden ? 0.3 : 1
                });
            } else if (star.class === 'P_ANOMALY') {
                geom = new THREE.SphereGeometry(0.8, 8, 8);
                mat = new THREE.MeshBasicMaterial({ 
                    color: colorHex,
                    transparent: true,
                    opacity: star.isHidden ? 0.2 : 0.5
                });
            }
            
            mesh = new THREE.Mesh(geom, mat);
            
            const spriteMat = new THREE.SpriteMaterial({
                map: starTexture,
                color: colorHex,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: star.isHidden ? 0.3 : 1
            });
            const sprite = new THREE.Sprite(spriteMat);
            if (star.class === 'P_ANOMALY') {
                sprite.scale.set(6, 6, 1);
            } else if (star.class === 'P_STATION' || star.class === 'P_DERELICT') {
                sprite.scale.set(3, 3, 1);
            } else {
                sprite.scale.set(4, 4, 1);
            }
            mesh.add(sprite);
        }

        mesh.position.set(-star.x, star.y, star.z);
        
        const isPoi = star.class && star.class.startsWith('P');
        mesh.userData = { type: isPoi ? 'POI' : 'Star', data: star };
        scene.add(mesh);
        interactiveObjects.push(mesh);

        const stemGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-star.x, star.y, 0),
            new THREE.Vector3(-star.x, star.y, star.z)
        ]);
        const stemMat = new THREE.LineBasicMaterial({ color: 0x444444 });
        const stem = new THREE.Line(stemGeom, stemMat);
        scene.add(stem);

        const starDiv = document.createElement('div');
        starDiv.className = 'star-label';
        starDiv.textContent = star.name;
        if (star.name === "Aegis") {
            starDiv.style.color = "#FF5722";
            starDiv.style.fontWeight = "bold";
            starDiv.style.fontSize = "16px";
        }
        const label = new CSS2DObject(starDiv);
        label.position.set(0, 1.2, 0);
        mesh.add(label);

        mesh.userData.stem = stem;
        sceneObjects[star.name] = mesh;
    });
}

function renderShips() {
    // Clear old ships first if re-rendering
    Object.keys(sceneObjects).forEach(key => {
        const mesh = sceneObjects[key];
        if (mesh.userData && mesh.userData.type === 'Ship') {
            removeMeshCompletely(mesh, key);
        }
    });    
    shipsData.forEach(ship => {
        if (ship.isHidden && currentMode !== 'gm') return;
        
        const token = ship.tokenId ? tokensData.find(t => t.id === ship.tokenId) : null;
        const resolvedTokenUrl = token ? token.url : ship.tokenUrl;
        
        let mesh;
        if (resolvedTokenUrl) {
            const textureLoader = new THREE.TextureLoader();
            const tokenTexture = textureLoader.load(resolvedTokenUrl);
            
            const scale = ship.tokenScale || 1.0;
            const tokenGeom = new THREE.PlaneGeometry(2 * scale, 2 * scale);
            
            const tokenMat = new THREE.MeshBasicMaterial({
                map: tokenTexture,
                transparent: true,
                opacity: ship.isHidden ? 0.5 : 1,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            mesh = new THREE.Mesh(tokenGeom, tokenMat);
            
            // Clean up any weird 3D rotations from older saves so tokens don't appear edge-on
            if (ship.rx !== undefined) {
                const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(ship.rx, ship.ry, ship.rz, ship.rw));
                mesh.rotation.set(0, 0, euler.z);
            }
            mesh.userData = { type: 'Ship', data: ship, hasToken: true };
        } else {
            mesh = new THREE.Mesh(shipGeometry, shipMat.clone());
            if (ship.isHidden) mesh.material.opacity = 0.3;
            if (ship.rx !== undefined) {
                mesh.quaternion.set(ship.rx, ship.ry, ship.rz, ship.rw);
            }
            mesh.userData = { type: 'Ship', data: ship, hasToken: false };
        }
        
        mesh.position.set(-ship.x, ship.y, ship.z);
        mesh.userData = { type: 'Ship', data: ship, hasToken: !!resolvedTokenUrl };
        mesh.renderOrder = 10;
        mesh.frustumCulled = false;
        scene.add(mesh);
        interactiveObjects.push(mesh);

        const stemGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-ship.x, ship.y, 0),
            new THREE.Vector3(-ship.x, ship.y, ship.z)
        ]);
        const stemMat = new THREE.LineBasicMaterial({ color: 0x4bb5c1, transparent: true, opacity: 0.5 });
        const stem = new THREE.Line(stemGeom, stemMat);
        scene.add(stem);

        const shipDiv = document.createElement('div');
        shipDiv.className = 'star-label';
        shipDiv.textContent = ship.name;
        shipDiv.style.color = "#00ffcc";
        const label = new CSS2DObject(shipDiv);
        label.position.set(0, 1, 0);
        mesh.add(label);
        
        mesh.userData.stem = stem;
        sceneObjects[ship.name] = mesh;
    });
}

function refreshDropdowns() {
    const searchSelect = document.getElementById('search-star');
    const starASelect = document.getElementById('star-a');
    const starBSelect = document.getElementById('star-b');
    const shipSelect = document.getElementById('ship-select');

    let starsOptions = `<optgroup data-i18n-label="optgroupStars" label="${i18n[currentLang].optgroupStars}">`;
    let poisOptions = `<optgroup data-i18n-label="optgroupPois" label="${i18n[currentLang].optgroupPois}">`;
    starsData.forEach(star => {
        if (star.isHidden && currentMode !== 'gm') return;
        if (star.class && star.class.startsWith('P')) {
            poisOptions += `<option value="${star.name}">${star.name}</option>`;
        } else {
            starsOptions += `<option value="${star.name}">${star.name}</option>`;
        }
    });
    starsOptions += '</optgroup>';
    poisOptions += '</optgroup>';

    let shipsOptions = `<optgroup data-i18n-label="optgroupShips" label="${i18n[currentLang].optgroupShips}">`;
    shipsData.forEach(ship => {
        if (ship.isHidden && currentMode !== 'gm') return;
        shipsOptions += `<option value="${ship.name}">${ship.name}</option>`;
    });
    shipsOptions += '</optgroup>';

    searchSelect.innerHTML = `<option value="" data-i18n="selectStar">${i18n[currentLang].selectStar}</option>` + shipsOptions + starsOptions + poisOptions;
    starASelect.innerHTML = `<option value="" data-i18n="origin">${i18n[currentLang].origin}</option>` + shipsOptions + starsOptions + poisOptions;
    starBSelect.innerHTML = `<option value="" data-i18n="destination">${i18n[currentLang].destination}</option>` + shipsOptions + starsOptions + poisOptions;
    shipSelect.innerHTML = `<option value="" data-i18n="selectShip">${i18n[currentLang].selectShip}</option>` + shipsOptions;
}

let currentCreateType = 'Ship';

function setActiveCreateTab(type) {
    currentCreateType = type;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (type === 'Ship') {
        document.getElementById('tab-ship').classList.add('active');
        document.getElementById('create-star-class-group').style.display = 'none';
        document.getElementById('create-poi-type-group').style.display = 'none';
        document.getElementById('create-token-group').style.display = 'block';
        document.getElementById('create-owner-group').style.display = 'block';
    } else if (type === 'Star') {
        document.getElementById('tab-star').classList.add('active');
        document.getElementById('create-star-class-group').style.display = 'block';
        document.getElementById('create-poi-type-group').style.display = 'none';
        document.getElementById('create-token-group').style.display = 'none';
        document.getElementById('create-owner-group').style.display = 'none';
    } else if (type === 'POI') {
        document.getElementById('tab-poi').classList.add('active');
        document.getElementById('create-star-class-group').style.display = 'none';
        document.getElementById('create-poi-type-group').style.display = 'block';
        document.getElementById('create-token-group').style.display = 'block';
        document.getElementById('create-owner-group').style.display = 'block';
    }
}

function submitCreateEntity() {
    if (currentMode !== 'gm') return;
    const nameInput = document.getElementById('create-entity-name');
    const name = nameInput.value.trim();
    if (!name) {
        alert("Please enter a name.");
        return;
    }
    
    if (shipsData.find(s => s.name === name) || starsData.find(s => s.name === name)) {
        alert("Name already exists!");
        return;
    }
    
    const x = parseFloat(document.getElementById('create-entity-x').value) || 0;
    const y = parseFloat(document.getElementById('create-entity-y').value) || 0;
    const z = parseFloat(document.getElementById('create-entity-z').value) || 0;
    const desc = document.getElementById('create-entity-desc').value.trim();
    const tokenId = document.getElementById('create-entity-token').value;
    
    if (currentCreateType === 'Ship') {
        const newShip = {
            name: name,
            x: x,
            y: y,
            z: z,
            description: desc || "A newly commissioned ship.",
            owner: document.getElementById('create-entity-owner').value
        };
        if (tokenId) newShip.tokenId = tokenId;
        shipsData.push(newShip);
        saveShips();
        if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        renderShips();
    } else if (currentCreateType === 'Star') {
        const cls = document.getElementById('create-star-class').value;
        starsData.push({
            name: name,
            class: cls,
            x: x,
            y: y,
            z: z,
            description: desc || ""
        });
        saveStars();
        if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        renderStars();
    } else if (currentCreateType === 'POI') {
        const cls = document.getElementById('create-poi-type').value;
        const newPoi = {
            name: name,
            class: cls,
            x: x,
            y: y,
            z: z,
            description: desc || "",
            owner: document.getElementById('create-entity-owner').value
        };
        if (tokenId) newPoi.tokenId = tokenId;
        starsData.push(newPoi);
        saveStars();
        if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        renderStars();
    }
    
    refreshDropdowns();
    document.getElementById('create-entity-modal').style.display = 'none';
}

function deleteShip() {
    if (currentMode !== 'gm') return;
    const shipName = document.getElementById('ship-select').value;
    if (!shipName) return;
    
    if (confirm(`Are you sure you want to delete ${shipName}?`)) {
        if (sceneObjects[shipName]) {
            removeMeshCompletely(sceneObjects[shipName], shipName);
        }
        
        shipsData = shipsData.filter(s => s.name !== shipName);
        saveShips();
        refreshDropdowns();
        
        document.getElementById('ship-x').value = '';
        document.getElementById('ship-y').value = '';
        document.getElementById('ship-z').value = '';
    }
}

function onShipSelectChange(e) {
    const shipName = e.target.value;
    const ship = shipsData.find(s => s.name === shipName);
    if (ship) {
        document.getElementById('ship-x').value = ship.x.toFixed(2);
        document.getElementById('ship-y').value = ship.y.toFixed(2);
        document.getElementById('ship-z').value = ship.z.toFixed(2);
    } else {
        document.getElementById('ship-x').value = '';
        document.getElementById('ship-y').value = '';
        document.getElementById('ship-z').value = '';
    }
}

function updateShipPosition() {
    if (currentMode === 'ro') return;
    const shipName = document.getElementById('ship-select').value;
    if (!shipName) return;
    
    const ship = shipsData.find(s => s.name === shipName);
    if (!ship) return;
    
    if (currentMode === 'nav' && ship.owner === 'GM') {
        alert("You cannot move a GM-owned ship.");
        return;
    }
    
    const oldX = ship.x;
    const oldY = ship.y;
    const oldZ = ship.z;
    
    ship.x = parseFloat(document.getElementById('ship-x').value) || 0;
    ship.y = parseFloat(document.getElementById('ship-y').value) || 0;
    ship.z = parseFloat(document.getElementById('ship-z').value) || 0;
    ship._lastLocalMove = performance.now();
    
    animateShip(ship, oldX, oldY, oldZ);
    setLastMovedShip(ship.name);

    // Clear any active navigation route for this ship so "toward X" label doesn't persist
    if (currentRoute && currentRoute.ship === ship) {
        currentRoute = null;
        document.getElementById('travel-ui').style.display = 'none';
    }
    if (currentMoveHereTarget) currentMoveHereTarget = null;

    addLog(`${ship.name} updated position to X:${ship.x.toFixed(2)}, Y:${ship.y.toFixed(2)}, Z:${ship.z.toFixed(2)}`);
    saveShips();
    if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(ship));
}

function animateShip(ship, oldX, oldY, oldZ) {
    const startPos = new THREE.Vector3(-oldX, oldY, oldZ);
    const endPos = new THREE.Vector3(-ship.x, ship.y, ship.z);
    
    const startTime = performance.now();
    const duration = 4500;
    
    const moveDir = endPos.clone().sub(startPos);
    let startQuat, endQuat;
    const mesh = sceneObjects[ship.name];
    
    if (mesh && moveDir.lengthSq() > 0.001) {
        startQuat = mesh.quaternion.clone();
        const dummy = new THREE.Object3D();
        
        // Calculate 2D angle in the XY plane
        // The token's front points to +Y. We rotate around Z to face the travel direction.
        const angle = Math.atan2(moveDir.y, moveDir.x) - Math.PI / 2;
        
        if (mesh.userData.hasToken) {
            // Tokens should only rotate in the 2D plane (Z-axis)
            dummy.rotation.set(0, 0, angle);
        } else {
            // Full 3D rotation for 3D meshes
            dummy.rotation.set(0, 0, angle); // Assuming default ship geometry points along Y
        }
        
        endQuat = dummy.quaternion.clone();
        
        ship.rx = endQuat.x;
        ship.ry = endQuat.y;
        ship.rz = endQuat.z;
        ship.rw = endQuat.w;
    }

    function tweenShip(time) {
        const elapsed = time - startTime;
        
        // Rotation phase: 0 to 1000ms
        const rotDuration = 1000;
        let rotProgress = 0;
        let rotEase = 0;
        
        if (startQuat && endQuat) {
            rotProgress = Math.min(elapsed / rotDuration, 1);
            rotEase = 1 - Math.pow(1 - rotProgress, 3);
        }
        
        // Translation phase: 1000ms to 4500ms
        const moveDuration = duration - rotDuration;
        const moveProgress = Math.max(0, Math.min((elapsed - rotDuration) / moveDuration, 1));
        const moveEase = 1 - Math.pow(1 - moveProgress, 3);
        
        const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, moveEase);
        
        if (mesh) {
            mesh.position.copy(currentPos);
            
            if (startQuat && endQuat) {
                mesh.quaternion.slerpQuaternions(startQuat, endQuat, rotEase);
            }
            
            if (mesh.userData.stem) {
                const newStemGeom = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(currentPos.x, currentPos.y, 0),
                    new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)
                ]);
                mesh.userData.stem.geometry.dispose();
                mesh.userData.stem.geometry = newStemGeom;
            }
            if (infoPanel.style.display !== 'none' && infoName.textContent === ship.name) {
                infoCoords.textContent = `X:${(-currentPos.x).toFixed(2)}, Y:${currentPos.y.toFixed(2)}, Z:${currentPos.z.toFixed(2)}`;
            }
        }
        
        if (elapsed < duration) {
            requestAnimationFrame(tweenShip);
        }
    }
    requestAnimationFrame(tweenShip);
}

function onPointerDown(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        const selectedMesh = intersects[0].object;
        showInfoPanel(selectedMesh.userData);
    }
}

function showInfoPanel(userData) {
    const data = userData.data;
    infoName.textContent = data.isHidden && currentMode === 'gm' ? `${data.name} (Hidden)` : data.name;
    infoType.textContent = userData.type;
    let displayClass = data.class || "N/A";
    if (displayClass === 'P_STATION') displayClass = 'Space Station';
    else if (displayClass === 'P_DERELICT') displayClass = 'Derelict Ship';
    else if (displayClass === 'P_ANOMALY') displayClass = 'Space Anomaly';
    else if (displayClass === 'P') displayClass = 'Point of Interest';
    
    infoClass.textContent = displayClass;
    
    const ownerGroup = document.getElementById('info-owner-group');
    const infoOwner = document.getElementById('info-owner');
    if (userData.type === 'Ship' || userData.type === 'POI') {
        ownerGroup.style.display = 'block';
        const ownerVal = data.owner || 'Players';
        const ownerText = ownerVal === 'GM' ? (i18n[currentLang].ownershipGM || 'GM') : (i18n[currentLang].ownershipPlayers || 'Players');
        infoOwner.textContent = ownerText;
    } else {
        ownerGroup.style.display = 'none';
    }
    
    infoCoords.textContent = `X:${data.x.toFixed(2) || data.x}, Y:${data.y.toFixed(2) || data.y}, Z:${data.z.toFixed(2) || data.z}`;
    
    // Support HTML content inside the description
    infoDesc.innerHTML = data.description || "No description available.";
    
    const publicNotes = document.getElementById('info-public-notes');
    const privateNotes = document.getElementById('info-private-notes');
    const editBtn = document.getElementById('edit-entity-btn');
    
    if (data.publicNotes) {
        publicNotes.innerHTML = `<strong>Public Notes:</strong><br>${data.publicNotes.replace(/\\n/g, '<br>')}`;
    } else {
        publicNotes.innerHTML = '';
    }
    
    const moveShipBtn = document.getElementById('info-move-ship-btn');
    if ((userData.type === 'Ship' || userData.type === 'POI') && currentMode !== 'ro') {
        moveShipBtn.style.display = 'block';
        if (userData.type === 'POI') {
            moveShipBtn.textContent = i18n[currentLang].movePoiBtn;
            moveShipBtn.setAttribute('data-i18n', 'movePoiBtn');
        } else {
            moveShipBtn.textContent = i18n[currentLang].moveShipBtn;
            moveShipBtn.setAttribute('data-i18n', 'moveShipBtn');
        }
        moveShipBtn.onclick = () => openMoveShipModal(userData);
    } else {
        moveShipBtn.style.display = 'none';
    }

    const moveHereBtn = document.getElementById('info-move-here-btn');
    if ((userData.type === 'Star' || userData.type === 'POI') && currentMode !== 'ro') {
        moveHereBtn.style.display = 'block';
        moveHereBtn.onclick = () => openMoveHereModal(userData);
    } else {
        moveHereBtn.style.display = 'none';
    }

    if (currentMode === 'gm') {
        if (data.privateNotes) {
            privateNotes.style.display = 'block';
            privateNotes.innerHTML = `<strong>Private Notes:</strong><br>${data.privateNotes.replace(/\\n/g, '<br>')}`;
        } else {
            privateNotes.style.display = 'none';
        }
        editBtn.style.display = 'block';
        editBtn.onclick = () => openEntityEditor(userData);
    } else {
        privateNotes.style.display = 'none';
        editBtn.style.display = 'none';
    }
    
    infoPanel.style.display = 'block';
}

let currentEditEntity = null;

function openEntityEditor(userData) {
    currentEditEntity = userData;
    const data = userData.data;
    
    document.getElementById('edit-entity-name').value = data.name || '';
    
    const classContainer = document.getElementById('edit-class-container');
    if (userData.type === 'Star' || userData.type === 'POI') {
        classContainer.style.display = 'block';
        document.getElementById('edit-entity-class').value = data.class || 'G';
    } else {
        classContainer.style.display = 'none';
    }
    
    const ownerContainer = document.getElementById('edit-owner-group');
    if (userData.type === 'Ship' || userData.type === 'POI') {
        ownerContainer.style.display = 'block';
        document.getElementById('edit-entity-owner').value = data.owner || 'Players';
    } else {
        ownerContainer.style.display = 'none';
    }
    
    populateTokenDropdown();
    document.getElementById('edit-entity-token').value = data.tokenId || '';
    
    document.getElementById('edit-entity-desc').value = data.description || '';
    document.getElementById('edit-entity-public').value = data.publicNotes || '';
    document.getElementById('edit-entity-private').value = data.privateNotes || '';
    document.getElementById('edit-entity-hidden').checked = !!data.isHidden;
    
    document.getElementById('entity-editor-modal').style.display = 'flex';
}

function closeEntityEditor() {
    document.getElementById('entity-editor-modal').style.display = 'none';
    currentEditEntity = null;
}

let currentMoveShip = null;

function openMoveShipModal(userData) {
    currentMoveShip = userData.data; // The ship or POI object
    const isPoi = userData.type === 'POI';
    
    // Set title header dynamically
    const titleHeader = document.getElementById('move-ship-title-header');
    if (isPoi) {
        titleHeader.setAttribute('data-i18n', 'movePoiTitle');
        titleHeader.textContent = i18n[currentLang].movePoiTitle;
    } else {
        titleHeader.setAttribute('data-i18n', 'moveShipTitle');
        titleHeader.textContent = i18n[currentLang].moveShipTitle;
    }
    
    // Default destination type to entity, show entity select
    const destType = document.getElementById('move-dest-type');
    destType.value = 'entity';
    document.getElementById('move-entity-select-group').style.display = 'block';
    
    // Populate entity dropdown with all other entities (stars, POIs, other ships)
    const entitySelect = document.getElementById('move-entity-select');
    let options = '';
    
    // Add other ships
    shipsData.forEach(ship => {
        if (ship.name !== currentMoveShip.name) {
            options += `<option value="${ship.name}">${ship.name} (Ship)</option>`;
        }
    });
    
    // Add stars and POIs
    starsData.forEach(ent => {
        if (ent.name !== currentMoveShip.name) {
            let label = ent.class && ent.class.startsWith('P') ? 'POI' : 'Star';
            options += `<option value="${ent.name}">${ent.name} (${label})</option>`;
        }
    });
    
    entitySelect.innerHTML = options;

    // Preload coordinates from the first selected target entity if available
    if (entitySelect.value) {
        updateMoveCoordsFromSelectedEntity();
    } else {
        document.getElementById('move-coord-x').value = currentMoveShip.x;
        document.getElementById('move-coord-y').value = currentMoveShip.y;
        document.getElementById('move-coord-z').value = currentMoveShip.z;
    }
    
    document.getElementById('move-ship-modal').style.display = 'flex';
}

function updateMoveCoordsFromSelectedEntity() {
    const entityName = document.getElementById('move-entity-select').value;
    if (!entityName) return;
    
    // Find the entity in shipsData or starsData
    let found = shipsData.find(s => s.name === entityName);
    if (!found) {
        found = starsData.find(s => s.name === entityName);
    }
    
    if (found) {
        document.getElementById('move-coord-x').value = found.x;
        document.getElementById('move-coord-y').value = found.y;
        document.getElementById('move-coord-z').value = found.z;
    }
}

function submitMoveShip() {
    if (!currentMoveShip) return;
    
    if (currentMode === 'ro') return;
    const isStarOrPoi = starsData.includes(currentMoveShip) || (currentMoveShip.class && currentMoveShip.class.startsWith('P'));
    const labelType = isStarOrPoi ? 'POI' : 'ship';
    
    if (currentMode === 'nav' && currentMoveShip.owner === 'GM') {
        alert(currentLang === 'es' ? `No puedes mover un ${labelType === 'POI' ? 'PDI' : 'nave'} propiedad del DJ.` : `You cannot move a GM-owned ${labelType}.`);
        return;
    }
    
    const oldX = currentMoveShip.x;
    const oldY = currentMoveShip.y;
    const oldZ = currentMoveShip.z;
    
    currentMoveShip.x = parseFloat(document.getElementById('move-coord-x').value) || 0;
    currentMoveShip.y = parseFloat(document.getElementById('move-coord-y').value) || 0;
    currentMoveShip.z = parseFloat(document.getElementById('move-coord-z').value) || 0;
    currentMoveShip._lastLocalMove = performance.now();
    
    animateShip(currentMoveShip, oldX, oldY, oldZ);
    setLastMovedShip(currentMoveShip.name);

    // Clear any active navigation route for this ship so "toward X" label doesn't persist
    if (currentRoute && currentRoute.ship === currentMoveShip) {
        currentRoute = null;
        document.getElementById('travel-ui').style.display = 'none';
    }
    if (currentMoveHereTarget) currentMoveHereTarget = null;

    const destType = document.getElementById('move-dest-type').value;
    const targetEntityName = document.getElementById('move-entity-select').value;
    let logMsg = '';
    if (destType === 'entity' && targetEntityName) {
        logMsg = `${currentMoveShip.name} moved to ${targetEntityName} (at X:${currentMoveShip.x.toFixed(2)}, Y:${currentMoveShip.y.toFixed(2)}, Z:${currentMoveShip.z.toFixed(2)})`;
    } else {
        logMsg = `${currentMoveShip.name} moved to X:${currentMoveShip.x.toFixed(2)}, Y:${currentMoveShip.y.toFixed(2)}, Z:${currentMoveShip.z.toFixed(2)}`;
    }
    addLog(logMsg);
    
    if (isStarOrPoi) {
        saveStars();
        renderStars();
    } else {
        saveShips();
        renderShips();
    }
    
    if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(currentMoveShip));
    
    // Update coordinates shown in the info panel if it's currently showing this ship/POI
    const infoCoords = document.getElementById('info-coords');
    if (infoCoords) {
        infoCoords.textContent = `X:${currentMoveShip.x.toFixed(2)}, Y:${currentMoveShip.y.toFixed(2)}, Z:${currentMoveShip.z.toFixed(2)}`;
    }
    
    // Refresh dropdowns in the sidebar
    refreshDropdowns();
    
    // Hide modal
    document.getElementById('move-ship-modal').style.display = 'none';
}

let currentMoveHereTarget = null;

function openMoveHereModal(userData) {
    currentMoveHereTarget = userData.data; // The target star/POI object
    
    // Set target name in UI
    document.getElementById('move-here-target-name').textContent = currentMoveHereTarget.name;
    
    // Populate ship dropdown: only ships that this user can move
    const shipSelect = document.getElementById('move-here-ship-select');
    let options = '';
    
    const allowedShips = shipsData.filter(ship => {
        if (currentMode === 'gm') return true;
        if (currentMode === 'nav') return ship.owner !== 'GM'; // player ownership
        return false;
    });
    
    if (allowedShips.length === 0) {
        options = `<option value="">-- No Ships Owned --</option>`;
        shipSelect.innerHTML = options;
        document.getElementById('move-here-total-dist').textContent = '0';
        document.getElementById('move-here-distance').value = '0';
        document.getElementById('confirm-move-here-btn').disabled = true;
        document.getElementById('move-here-modal').style.display = 'flex';
        return;
    }
    
    document.getElementById('confirm-move-here-btn').disabled = false;
    
    allowedShips.forEach(ship => {
        options += `<option value="${ship.name}">${ship.name}</option>`;
    });
    shipSelect.innerHTML = options;
    
    // Preselect the last moved ship if we own it
    let preselected = allowedShips.find(s => s.name === lastMovedShipName);
    if (preselected) {
        shipSelect.value = preselected.name;
    } else {
        shipSelect.selectedIndex = 0;
    }
    
    // Calculate distance and set inputs
    updateMoveHereDistance();
    
    document.getElementById('move-here-modal').style.display = 'flex';
}

function updateMoveHereDistance() {
    const shipName = document.getElementById('move-here-ship-select').value;
    if (!shipName || !currentMoveHereTarget) return;
    
    const ship = shipsData.find(s => s.name === shipName);
    if (!ship) return;
    
    // Calculate distance
    const dx = currentMoveHereTarget.x - ship.x;
    const dy = currentMoveHereTarget.y - ship.y;
    const dz = currentMoveHereTarget.z - ship.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    document.getElementById('move-here-total-dist').textContent = distance.toFixed(2);
    document.getElementById('move-here-distance').value = distance.toFixed(2);
}

function submitMoveHere() {
    const shipName = document.getElementById('move-here-ship-select').value;
    if (!shipName || !currentMoveHereTarget) return;
    
    const ship = shipsData.find(s => s.name === shipName);
    if (!ship) return;
    
    if (currentMode === 'ro') return;
    if (currentMode === 'nav' && ship.owner === 'GM') {
        alert("You cannot move a GM-owned ship.");
        return;
    }
    
    const travelDist = parseFloat(document.getElementById('move-here-distance').value);
    if (isNaN(travelDist) || travelDist <= 0) {
        alert("Please enter a valid travel distance.");
        return;
    }
    
    const dx = currentMoveHereTarget.x - ship.x;
    const dy = currentMoveHereTarget.y - ship.y;
    const dz = currentMoveHereTarget.z - ship.z;
    const totalDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (totalDistance < 0.001) {
        alert("Ship is already at this location.");
        document.getElementById('move-here-modal').style.display = 'none';
        return;
    }
    
    const oldX = ship.x;
    const oldY = ship.y;
    const oldZ = ship.z;
    
    // If the entered travel distance >= total distance, place ship exactly on target
    if (travelDist >= totalDistance) {
        ship.x = currentMoveHereTarget.x;
        ship.y = currentMoveHereTarget.y;
        ship.z = currentMoveHereTarget.z;
    } else {
        // Move partway along the vector
        const nx = dx / totalDistance;
        const ny = dy / totalDistance;
        const nz = dz / totalDistance;
        
        ship.x = ship.x + (nx * travelDist);
        ship.y = ship.y + (ny * travelDist);
        ship.z = ship.z + (nz * travelDist);
    }
    ship._lastLocalMove = performance.now();
    
    animateShip(ship, oldX, oldY, oldZ);
    setLastMovedShip(ship.name);
    addLog(`${ship.name} traveled ${travelDist.toFixed(2)} LY towards ${currentMoveHereTarget.name} (now at X:${ship.x.toFixed(2)}, Y:${ship.y.toFixed(2)}, Z:${ship.z.toFixed(2)})`);
    saveShips();
    
    if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(ship));
    
    // Refresh dropdowns in the sidebar
    refreshDropdowns();
    
    // Hide modal
    document.getElementById('move-here-modal').style.display = 'none';
}

function saveEntityEdits() {
    if (currentMode !== 'gm') return;
    if (!currentEditEntity) return;
    
    const data = currentEditEntity.data;
    
    // We cannot change the name easily without breaking relationships right now,
    // so we will just update the visual label if name is updated, but it's safer
    // to keep the underlying name identical for now, or update it carefully.
    const newName = document.getElementById('edit-entity-name').value.trim();
    
    // If name changed, we need to update the data array and sceneObjects map
    if (newName && newName !== data.name) {
        // Remove old name from sceneObjects map
        if (sceneObjects[data.name]) {
            sceneObjects[newName] = sceneObjects[data.name];
            delete sceneObjects[data.name];
        }
        data.name = newName;
    }
    
    data.description = document.getElementById('edit-entity-desc').value;
    data.publicNotes = document.getElementById('edit-entity-public').value;
    data.privateNotes = document.getElementById('edit-entity-private').value;
    data.isHidden = document.getElementById('edit-entity-hidden').checked;
    
    if (currentEditEntity.type === 'Star' || currentEditEntity.type === 'POI') {
        data.class = document.getElementById('edit-entity-class').value;
    }
    
    if (currentEditEntity.type === 'Ship' || currentEditEntity.type === 'POI') {
        data.owner = document.getElementById('edit-entity-owner').value;
    }
    
    data.tokenId = document.getElementById('edit-entity-token').value;
    if (!data.tokenId) {
        delete data.tokenId;
    }
    
    if (currentEditEntity.type === 'Ship') {
        saveShips();
        renderShips();
        if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(data));
    } else {
        saveStars();
        renderStars();
        if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
    }
    
    refreshDropdowns();
    showInfoPanel(currentEditEntity);
    closeEntityEditor();
}

function populateTokenDropdown() {
    const dropdown = document.getElementById('edit-entity-token');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Default 3D Shape</option>';
    tokensData.forEach(token => {
        const opt = document.createElement('option');
        opt.value = token.id;
        opt.textContent = token.name;
        dropdown.appendChild(opt);
    });
}

function populateCreateTokenDropdown() {
    const dropdown = document.getElementById('create-entity-token');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Default 3D Shape</option>';
    tokensData.forEach(token => {
        const opt = document.createElement('option');
        opt.value = token.id;
        opt.textContent = token.name;
        dropdown.appendChild(opt);
    });
}

function deleteEntityEdits() {
    if (currentMode !== 'gm') return;
    if (!currentEditEntity) return;
    
    const data = currentEditEntity.data;
    if (confirm(`Are you sure you want to delete ${data.name}?`)) {
        if (sceneObjects[data.name]) {
            removeMeshCompletely(sceneObjects[data.name], data.name);
        }
        
        if (currentEditEntity.type === 'Ship') {
            shipsData = shipsData.filter(s => s.name !== data.name);
            saveShips();
            renderShips();
            if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        } else {
            starsData = starsData.filter(s => s.name !== data.name);
            saveStars();
            renderStars();
            if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        }
        
        refreshDropdowns();
        infoPanel.style.display = 'none';
        closeEntityEditor();
    }
}

function onSearchChange(e) {
    const starName = e.target.value;
    if (!starName || !sceneObjects[starName]) return;

    const targetPos = sceneObjects[starName].position;
    
    const duration = 1000;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    
    const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z + 50);
    
    const startTime = performance.now();

    function tweenCamera(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPos, endPos, ease);
        controls.target.lerpVectors(startTarget, targetPos, ease);
        
        if (progress < 1) {
            requestAnimationFrame(tweenCamera);
        }
    }
    
    requestAnimationFrame(tweenCamera);
    showInfoPanel(sceneObjects[starName].userData);
}

// Store current calculation for route travel
let currentRoute = null;
let routeLine = null;

function calculateDistance() {
    const nameA = document.getElementById('star-a').value;
    const nameB = document.getElementById('star-b').value;
    const resDiv = document.getElementById('distance-result');
    const travelUi = document.getElementById('travel-ui');

    if (!nameA || !nameB) {
        resDiv.style.display = 'block';
        resDiv.innerHTML = i18n[currentLang].selectTwoPoints;
        travelUi.style.display = 'none';
        currentRoute = null;
        if (routeLine) {
            scene.remove(routeLine);
            routeLine.geometry.dispose();
            routeLine.material.dispose();
            routeLine = null;
        }
        return;
    }

    const starA = starsData.find(s => s.name === nameA) || shipsData.find(s => s.name === nameA);
    const starB = starsData.find(s => s.name === nameB) || shipsData.find(s => s.name === nameB);

    if (starA && starB) {
        const dx = starB.x - starA.x;
        const dy = starB.y - starA.y;
        const dz = starB.z - starA.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        resDiv.style.display = 'block';
        resDiv.innerHTML = i18n[currentLang].distanceResultFull
            .replace('{a}', starA.name)
            .replace('{b}', starB.name)
            .replace('{dist}', distance.toFixed(2));
        
        // Draw or update the dashed line between the two points
        if (routeLine) {
            scene.remove(routeLine);
            routeLine.geometry.dispose();
            routeLine.material.dispose();
            routeLine = null;
        }
        
        if (distance > 0) {
            const p1 = new THREE.Vector3(-starA.x, starA.y, starA.z);
            const p2 = new THREE.Vector3(-starB.x, starB.y, starB.z);
            const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
            
            // Gap at the ends
            const gap = distance > 2 ? 1 : (distance * 0.1);
            const lineStart = p1.clone().add(dir.clone().multiplyScalar(gap));
            const lineEnd = p2.clone().sub(dir.clone().multiplyScalar(gap));
            
            const lineGeom = new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]);
            const lineMat = new THREE.LineDashedMaterial({
                color: 0x59b7c7,
                linewidth: 1,
                scale: 1,
                dashSize: 0.5,
                gapSize: 0.5,
                transparent: true,
                opacity: 0.6
            });
            routeLine = new THREE.Line(lineGeom, lineMat);
            routeLine.computeLineDistances();
            scene.add(routeLine);
        }

        const originIsShip = shipsData.some(s => s.name === starA.name);

        if (originIsShip && currentMode !== 'ro') {
            const movingShip = starA;
            const target = starB;
            
            const vx = target.x - movingShip.x;
            const vy = target.y - movingShip.y;
            const vz = target.z - movingShip.z;

            currentRoute = { 
                ship: movingShip, 
                target: target, 
                vector: { x: vx, y: vy, z: vz }, 
                distance: distance 
            };
            
            document.getElementById('travel-ship-name').textContent = movingShip.name;
            document.getElementById('travel-distance').value = distance.toFixed(2);
            travelUi.style.display = 'block';
        } else {
            currentRoute = null;
            travelUi.style.display = 'none';
        }
    }
}

function travelAlongRoute() {
    if (currentMode === 'ro') return;
    if (!currentRoute) return;
    
    const travelDist = parseFloat(document.getElementById('travel-distance').value);
    
    if (isNaN(travelDist)) {
        alert("Please enter a valid travel distance.");
        return;
    }
    
    const ship = currentRoute.ship;
    if (currentMode === 'nav' && ship.owner === 'GM') {
        alert("You cannot move a GM-owned ship.");
        return;
    }
    
    const oldX = ship.x;
    const oldY = ship.y;
    const oldZ = ship.z;
    
    // Normalize vector
    const nx = currentRoute.vector.x / currentRoute.distance;
    const ny = currentRoute.vector.y / currentRoute.distance;
    const nz = currentRoute.vector.z / currentRoute.distance;
    
    // Calculate new position from current position
    ship.x = ship.x + (nx * travelDist);
    ship.y = ship.y + (ny * travelDist);
    ship.z = ship.z + (nz * travelDist);
    ship._lastLocalMove = performance.now();
    
    animateShip(ship, oldX, oldY, oldZ);
    setLastMovedShip(ship.name);
    addLog(`${ship.name} traveled ${travelDist} LY towards ${currentRoute.target.name} (now at X:${ship.x.toFixed(2)}, Y:${ship.y.toFixed(2)}, Z:${ship.z.toFixed(2)})`);
    saveShips();
    if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(ship));
    
    // Update the Ship Controls panel inputs if that ship is currently selected
    if (document.getElementById('ship-select').value === ship.name) {
        document.getElementById('ship-x').value = ship.x.toFixed(2);
        document.getElementById('ship-y').value = ship.y.toFixed(2);
        document.getElementById('ship-z').value = ship.z.toFixed(2);
    }
    
    // Update route vector for consecutive travel clicks
    currentRoute.vector.x = currentRoute.target.x - ship.x;
    currentRoute.vector.y = currentRoute.target.y - ship.y;
    currentRoute.vector.z = currentRoute.target.z - ship.z;
    currentRoute.distance = Math.sqrt(
        currentRoute.vector.x*currentRoute.vector.x + 
        currentRoute.vector.y*currentRoute.vector.y + 
        currentRoute.vector.z*currentRoute.vector.z
    );
    
    // Refresh the distance calculation UI and dashed line
    calculateDistance();
}

let currentTokenImg = null;
let currentTokenEntity = null;
let currentTokenEntityType = null;

function uploadEntityToken(event) {
    if (currentMode !== 'gm') return;
    const file = event.target.files[0];
    if (!file) return;
    if (!currentTokenEntity) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        currentTokenImg = new Image();
        currentTokenImg.onload = function() {
            document.getElementById('token-rotation').value = 0;
            document.getElementById('token-scale').value = currentTokenEntity.tokenScale || 1.0;
            document.getElementById('token-remove-bg').checked = false;
            document.getElementById('token-tolerance').value = 10;
            
            updateTokenPreview();
            document.getElementById('token-editor-modal').style.display = 'flex';
        };
        currentTokenImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function updateTokenPreview() {
    if (!currentTokenImg) return;
    
    const canvas = document.getElementById('token-preview');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const rotation = parseInt(document.getElementById('token-rotation').value) || 0;
    const removeBg = document.getElementById('token-remove-bg').checked;
    const tolerance = parseInt(document.getElementById('token-tolerance').value) || 0;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    
    const maxSize = 256;
    let width = currentTokenImg.width;
    let height = currentTokenImg.height;
    if (width > height) {
        if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
        }
    }
    
    ctx.drawImage(currentTokenImg, -width / 2, -height / 2, width, height);
    ctx.restore();
    
    if (removeBg) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        let targetR = 0, targetG = 0, targetB = 0;
        let foundTarget = false;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                targetR = data[i];
                targetG = data[i + 1];
                targetB = data[i + 2];
                foundTarget = true;
                break;
            }
        }
        
        if (foundTarget) {
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const diff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
                    if (diff <= tolerance * 3) {
                        data[i + 3] = 0;
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }
    }
}

function saveTokenEdits() {
    if (currentMode !== 'gm') return;
    if (!currentTokenEntity) return;
    
    const canvas = document.getElementById('token-preview');
    const tokenUrl = canvas.toDataURL('image/webp', 0.8);
    const tokenScale = parseFloat(document.getElementById('token-scale').value) || 1.0;
    
    const tokenId = 't_' + Date.now();
    const tokenName = (currentTokenEntity.name || 'Entity') + ' Token';
    
    tokensData.push({
        id: tokenId,
        name: tokenName,
        url: tokenUrl
    });
    saveTokens();
    
    if (currentTokenEntityType === 'Create') {
        refreshDropdowns();
        closeTokenEditor();
        populateTokenDropdown();
        populateCreateTokenDropdown();
        const createTokenSelect = document.getElementById('create-entity-token');
        if (createTokenSelect) {
            createTokenSelect.value = tokenId;
        }
        return;
    }
    
    currentTokenEntity.tokenId = tokenId;
    delete currentTokenEntity.tokenUrl;
    currentTokenEntity.tokenScale = tokenScale;
    
    if (currentTokenEntityType === 'Ship') {
        if (currentTokenEntity.rx === undefined) {
            currentTokenEntity.rx = 0; currentTokenEntity.ry = 0; currentTokenEntity.rz = 0; currentTokenEntity.rw = 1;
        }
        saveShips();
        renderShips();
        if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(currentTokenEntity));
        
        document.getElementById('ship-select').value = currentTokenEntity.name;
        onShipSelectChange({ target: { value: currentTokenEntity.name } });
    } else {
        saveStars();
        renderStars();
        if (currentSessionId) updateBackendSession(currentSessionId, shipsData);
        
        if (currentEditEntity && currentEditEntity.data.name === currentTokenEntity.name) {
            showInfoPanel(currentEditEntity);
        }
    }
    
    refreshDropdowns();
    closeTokenEditor();
    
    populateTokenDropdown();
    const tokenSelect = document.getElementById('edit-entity-token');
    if (tokenSelect) {
        tokenSelect.value = tokenId;
    }
}

function closeTokenEditor() {
    document.getElementById('token-editor-modal').style.display = 'none';
    currentTokenImg = null;
    currentTokenEntity = null;
    currentTokenEntityType = null;
}

function exportYaml() {
    const data = {
        stars: starsData,
        ships: shipsData
    };
    
    try {
        // js-yaml must be loaded via script tag
        const yamlStr = jsyaml.dump(data);
        const blob = new Blob([yamlStr], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vergemap_data.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("YAML export failed", e);
        alert("Failed to export YAML. Make sure js-yaml is loaded.");
    }
}

function importYaml(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = jsyaml.load(e.target.result);
            if (data.stars) starsData = data.stars;
            if (data.ships) shipsData = data.ships;
            
            saveStars();
            saveShips();
            renderStars();
            renderShips();
            refreshDropdowns();
            alert("Map data imported successfully!");
        } catch (err) {
            console.error("YAML parsing error", err);
            alert("Failed to parse YAML file. Check console for details.");
        }
    };
    reader.readAsText(file);
    
    // reset input
    event.target.value = '';
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    interactiveObjects.forEach(mesh => {
        if(mesh.userData.type === 'Ship' && !mesh.userData.hasToken) {
            mesh.rotation.y += 0.02;
            mesh.rotation.x += 0.01;
        }
    });

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
