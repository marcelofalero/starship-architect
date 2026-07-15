import { state, saveLogs } from './data.js';
import { enterSystem, exitSystem } from './scene.js';
import { store } from './store.js';

export const uiCtx = {
    getCurrentMode: () => 'ro',
    getCurrentSessionId: () => null,
    getSessionToken: () => null,
    getLastMovedShipName: () => null,
    getSavedSessionTokens: () => null,
    setSavedSessionTokens: () => {},
    updateBackendSession: () => {},
    refreshDropdowns: () => {},
    getMqttClient: () => null
};

export let currentLang = 'en';
export let currentEditEntity = null;
export let currentMoveShip = null;
export let currentMoveHereTarget = null;


// UI Elements
export const infoPanel = document.getElementById('info-panel');
export const infoName = document.getElementById('info-name');
export const infoType = document.getElementById('info-type');
export const infoClass = document.getElementById('info-class');
export const infoCoords = document.getElementById('info-coords');
export const infoDesc = document.getElementById('info-desc');

export const i18n = {
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

export function applyTranslations(lang) {
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
    
    const distResult = document.getElementById('distance-result');
    if (distResult && distResult.innerHTML !== '') {
        document.getElementById('calc-btn').click();
    }
    
    if (typeof uiCtx.refreshDropdowns === 'function' && (state.stars.length > 0 || state.ships.length > 0)) {
        uiCtx.refreshDropdowns();
    }
}

export function parseMarkdown(text) {
    if (!text) return "";
    
    let parsed = text;
    parsed = parsed.replace(/\\n/g, '\n');
    
    parsed = parsed
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    parsed = parsed.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    parsed = parsed.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    parsed = parsed.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #4bb5c1; text-decoration: underline;">$1</a>');
    
    parsed = parsed.replace(/\n/g, '<br>');
    
    return parsed;
}

export function applyModeUI() {
    const currentMode = uiCtx.getCurrentMode();
    const shipControls = document.getElementById('panel-ship-controls');
    const openCreateBtn = document.getElementById('open-create-modal-btn');
    const tokenRow = document.getElementById('ui-token-row');
    const dataManagement = document.getElementById('panel-data-management');
    const moveBtn = document.getElementById('move-ship-btn');
    const delBtn = document.getElementById('delete-ship-btn');
    const logPanel = document.getElementById('panel-movement-log');
    const sysToolsBtn = document.getElementById('floating-system-tools');
    
    const isGalaxy = (store.state.currentLayer === 'GALAXY');
    document.getElementById('panel-search').style.display = isGalaxy ? 'block' : 'none';
    document.getElementById('panel-distance').style.display = isGalaxy ? 'block' : 'none';
    
    const presBtn = document.getElementById('pres-btn');
    const modeIndicator = document.getElementById('mode-indicator');
    
    const isPresentation = new URLSearchParams(window.location.search).get('pres') === 'true';
    if (presBtn) presBtn.style.display = currentMode === 'gm' ? 'flex' : 'none';
    
    if (modeIndicator) {
        modeIndicator.style.display = 'block';
        if (currentMode === 'gm') {
            modeIndicator.textContent = 'GM';
            modeIndicator.style.backgroundColor = '#dc3545';
        } else if (currentMode === 'nav') {
            modeIndicator.textContent = 'Player';
            modeIndicator.style.backgroundColor = '#007bff';
        } else if (currentMode === 'ro' && isPresentation) {
            modeIndicator.textContent = 'Presentation';
            modeIndicator.style.backgroundColor = '#9b59b6';
        } else {
            modeIndicator.textContent = 'Viewer';
            modeIndicator.style.backgroundColor = '#6c757d';
        }
    }

    if (currentMode === 'ro') {
        if (shipControls) shipControls.style.display = 'none';
        if (openCreateBtn) openCreateBtn.style.display = 'none';
        if (tokenRow) tokenRow.style.display = 'none';
        if (delBtn) delBtn.style.display = 'none';
        if (dataManagement) dataManagement.style.display = 'none';
        if (logPanel) logPanel.style.display = 'none';
        if (sysToolsBtn) sysToolsBtn.style.display = 'none';
        document.getElementById('panel-search').style.display = 'none';
        document.getElementById('panel-distance').style.display = 'none';
        
        // Completely hide the ui-layer container in presentation mode
        const uiLayer = document.getElementById('ui-layer');
        if (uiLayer && isPresentation) uiLayer.style.display = 'none';
    } else if (currentMode === 'nav') {
        if (shipControls) shipControls.style.display = isGalaxy ? 'block' : 'none';
        if (openCreateBtn) openCreateBtn.style.display = 'none';
        if (tokenRow) tokenRow.style.display = 'none';
        if (delBtn) delBtn.style.display = 'none';
        if (dataManagement) dataManagement.style.display = 'none';
        if (moveBtn) moveBtn.style.flex = '1';
        if (logPanel) logPanel.style.display = isGalaxy ? 'block' : 'none';
        if (sysToolsBtn) sysToolsBtn.style.display = 'none';
    } else if (currentMode === 'gm') {
        if (shipControls) shipControls.style.display = isGalaxy ? 'block' : 'none';
        if (openCreateBtn) openCreateBtn.style.display = 'flex';
        if (tokenRow) tokenRow.style.display = 'flex';
        if (delBtn) delBtn.style.display = 'block';
        if (dataManagement) dataManagement.style.display = isGalaxy ? 'block' : 'none';
        if (moveBtn) moveBtn.style.flex = '2';
        if (logPanel) logPanel.style.display = isGalaxy ? 'block' : 'none';
        if (sysToolsBtn) {
            sysToolsBtn.style.display = store.state.currentLayer === 'SYSTEM' ? 'flex' : 'none';
        }
    }
}

export function showShareModal(tokens) {
    const currentMode = uiCtx.getCurrentMode();
    const currentSessionId = uiCtx.getCurrentSessionId();
    const sessionToken = uiCtx.getSessionToken();
    let savedSessionTokens = uiCtx.getSavedSessionTokens();

    if (!tokens) {
        tokens = savedSessionTokens;
    }
    if (tokens) {
        savedSessionTokens = tokens;
        uiCtx.setSavedSessionTokens(tokens);
    }
    
    const baseUrl = window.location.origin + window.location.pathname;
    
    let gmVal = "";
    let playerVal = "";
    let viewerVal = "";
    
    if (tokens) {
        gmVal = `${baseUrl}?session=${tokens.gm}`;
        playerVal = `${baseUrl}?session=${tokens.player}`;
        viewerVal = `${baseUrl}?session=${tokens.viewer}`;
    } else if (currentSessionId && sessionToken) {
        if (currentMode === 'gm') {
            gmVal = window.location.href;
        } else if (currentMode === 'nav') {
            playerVal = window.location.href;
        } else {
            viewerVal = window.location.href;
        }
    } else if (currentSessionId) {
        const legacyUrl = `${baseUrl}?session=${currentSessionId}`;
        gmVal = legacyUrl + "&mode=gm";
        playerVal = legacyUrl + "&mode=nav";
        viewerVal = legacyUrl + "&mode=ro";
    }
    
    document.getElementById('share-gm-url').value = gmVal;
    document.getElementById('share-player-url').value = playerVal;
    
    const targetShareUrl = playerVal || gmVal;
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
    
    if (currentMode === 'gm') {
        gmRow.style.display = gmVal ? 'block' : 'none';
        playerRow.style.display = playerVal ? 'block' : 'none';
    } else if (currentMode === 'nav') {
        gmRow.style.display = 'none';
        playerRow.style.display = playerVal ? 'block' : 'none';
    } else {
        gmRow.style.display = 'none';
        playerRow.style.display = 'none';
    }
    
    document.getElementById('share-modal').style.display = 'flex';
}

export function renderLogs() {
    const currentMode = uiCtx.getCurrentMode();
    const currentSessionId = uiCtx.getCurrentSessionId();
    const list = document.getElementById('movement-log-list');
    if (!list) return;
    list.innerHTML = '';
    
    state.logs.forEach(log => {
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
                state.logs = state.logs.filter(l => l.id !== log.id);
                saveLogs();
                if (currentSessionId) uiCtx.updateBackendSession(currentSessionId, state.ships);
                renderLogs();
            };
            div.appendChild(delLogBtn);
        }
        
        list.appendChild(div);
    });
}

export function showInfoPanel(userData) {
    if (!userData) return;
    const currentMode = uiCtx.getCurrentMode();
    const lastMovedShipName = uiCtx.getLastMovedShipName();
    const data = userData.data || userData;
    infoName.textContent = data.isHidden && currentMode === 'gm' ? `${data.name || userData.name || 'Unknown'} (Hidden)` : (data.name || userData.name || 'Unknown');
    infoType.textContent = data.subtype || userData.type || 'Unknown';
    const classGroup = document.getElementById('info-class').parentNode;
    if (data.class) {
        classGroup.style.display = 'block';
        let displayClass = data.class;
        if (displayClass === 'P_STATION') displayClass = 'Space Station';
        else if (displayClass === 'P_DERELICT') displayClass = 'Derelict Ship';
        else if (displayClass === 'P_ANOMALY') displayClass = 'Space Anomaly';
        else if (displayClass === 'P') displayClass = 'Point of Interest';
        else if (userData.type === 'Star') {
            const starMap = { 'O': 'Class O - Blue', 'B': 'Class B - Blue-White', 'A': 'Class A - White', 'F': 'Class F - Yellow-White', 'G': 'Class G - Yellow', 'K': 'Class K - Orange', 'M': 'Class M - Red' };
            if (starMap[displayClass]) displayClass = starMap[displayClass];
        }
        infoClass.textContent = displayClass;
    } else {
        classGroup.style.display = 'none';
    }
    
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
    
    const coordsGroup = document.getElementById('info-coords').parentNode;
    if (userData.type === 'Planet' || userData.type === 'Moon' || ((userData.type === 'Star' || userData.type === 'POI') && store.state.currentLayer === 'SYSTEM')) {
        coordsGroup.style.display = 'none';
    } else {
        coordsGroup.style.display = 'block';
        infoCoords.textContent = `X:${data.x !== undefined ? data.x.toFixed(2) : 0}, Y:${data.y !== undefined ? data.y.toFixed(2) : 0}, Z:${data.z !== undefined ? data.z.toFixed(2) : 0}`;
    }

    const seedGroup = document.getElementById('info-seed-group');
    if ((userData.type === 'Planet' || userData.type === 'Moon') && store.state.currentLayer === 'SYSTEM') {
        const seedValue = data.planetSeed || data.id || store.state.currentSystemFocus.systemSeed + "_" + data.name;
        document.getElementById('info-seed-display').textContent = seedValue;
        document.getElementById('info-seed-input').value = seedValue;
        
        if (currentMode === 'gm') {
            seedGroup.style.display = 'block';
            
            const editBtn = document.getElementById('info-seed-edit-btn');
            const saveBtn = document.getElementById('info-seed-save-btn');
            const displaySpan = document.getElementById('info-seed-display');
            const inputEl = document.getElementById('info-seed-input');
            
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
            displaySpan.style.display = 'inline';
            inputEl.style.display = 'none';
            
            editBtn.onclick = () => {
                editBtn.style.display = 'none';
                saveBtn.style.display = 'inline-block';
                displaySpan.style.display = 'none';
                inputEl.style.display = 'inline-block';
                inputEl.focus();
            };
            
            saveBtn.onclick = () => {
                data.planetSeed = inputEl.value.trim();
                displaySpan.textContent = data.planetSeed;
                
                editBtn.style.display = 'inline-block';
                saveBtn.style.display = 'none';
                displaySpan.style.display = 'inline';
                inputEl.style.display = 'none';
                
                // Trigger save
                if (window.store && window.store.saveStars) window.store.saveStars();
                else console.log('Cannot save star system changes automatically.');
            };
        } else {
            seedGroup.style.display = 'none';
        }
    } else {
        seedGroup.style.display = 'none';
    }
    
    let descHtml = data.description || "No description available.";

    if (data.graph) descHtml += `\n\n**GRAPH Rating:** ${data.graph}`;
    if (data.gravity) descHtml += `\n\n**Gravity:** ${data.gravity}`;
    if (data.physicalRadius) descHtml += `\n**Physical Radius:** ${data.physicalRadius.toLocaleString()} km`;
    if (data.temperature) descHtml += `\n**Temperature:** ${data.temperature}`;
    if (data.atmosphere) descHtml += `\n**Atmosphere:** ${data.atmosphere}`;
    if (data.year) descHtml += `\n**Orbital Period (Year):** ${data.year}`;
    if (data.day) descHtml += `\n**Rotational Period (Day):** ${data.day}`;
    if (data.tilt) descHtml += `\n**Axial Tilt:** ${data.tilt}`;
    
    let finalHtml = parseMarkdown(descHtml);
    
    if (data.temperature && data.atmosphere) {
        const tempK = parseInt(data.temperature);
        const atm = data.atmosphere;
        let viability = null;
        if (atm === "Nitrogen/Oxygen (1 atm)" && tempK >= 250 && tempK <= 350) {
            viability = "<span style='color: #00ffcc;'>Highly Viable</span>";
        } else if (["Thin Carbon Dioxide", "Nitrogen/Oxygen (Thick)", "Ammonia/Methane (Thick)", "Thin Nitrogen/Methane"].includes(atm)) {
            viability = "<span style='color: #ffaa55;'>Barely Viable</span>";
        } else if (atm === "Nitrogen/Oxygen (1 atm)" && tempK < 250) {
            viability = "<span style='color: #44aaff;'>Barely Viable (Extreme Cold)</span>";
        } else if (atm === "Nitrogen/Oxygen (1 atm)" && tempK > 350) {
            viability = "<span style='color: #ff4444;'>Barely Viable (Extreme Heat)</span>";
        }
        if (viability) {
            finalHtml += `<br><br><strong>Habitability:</strong> ${viability}`;
        }
    }
    
    infoDesc.innerHTML = finalHtml;    
    const publicNotes = document.getElementById('info-public-notes');
    const privateNotes = document.getElementById('info-private-notes');
    const editBtn = document.getElementById('edit-entity-btn');
    
    if (data.publicNotes) {
        publicNotes.innerHTML = `<strong>Public Notes:</strong><br>${parseMarkdown(data.publicNotes)}`;
    } else {
        publicNotes.innerHTML = '';
    }
    
    const moveShipBtn = document.getElementById('info-move-ship-btn');
    if (userData.type === 'Ship' || (userData.type === 'POI' && store.state.currentLayer !== 'SYSTEM') && currentMode !== 'ro') {
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
    if ((userData.type === 'Star' || userData.type === 'POI' || userData.type === 'Planet' || userData.type === 'Moon') && currentMode !== 'ro') {
        moveHereBtn.style.display = 'block';
        
        const allowedShips = state.ships.filter(ship => {
            if (currentMode === 'gm') return true;
            if (currentMode === 'nav') return ship.owner !== 'GM';
            return false;
        });
        
        let targetShip = allowedShips.find(s => s.name === lastMovedShipName);
        if (!targetShip && allowedShips.length > 0) targetShip = allowedShips[0];
        
        const targetCoords = (store.state.currentLayer === 'SYSTEM') ? store.state.currentSystemFocus : data;
        
        const baseText = i18n[currentLang].moveHereBtn || "Move Ship Here";
        if (targetShip && targetCoords.x !== undefined) {
            const dx = targetShip.x - targetCoords.x;
            const dy = targetShip.y - targetCoords.y;
            const dist = Math.sqrt(dx*dx + dy*dy).toFixed(2);
            moveHereBtn.innerHTML = `${baseText}<br><span style="font-size: 0.7em; color: #888; font-weight: normal; text-transform: none;">${targetShip.name} - ${dist} LY</span>`;
            moveHereBtn.removeAttribute('data-i18n');
        } else {
            moveHereBtn.innerHTML = baseText;
            moveHereBtn.setAttribute('data-i18n', 'moveHereBtn');
        }

        moveHereBtn.onclick = () => openMoveHereModal(userData);
    } else {
        moveHereBtn.style.display = 'none';
    }

    const enterSystemBtn = document.getElementById('info-enter-system-btn');
    if (userData.type === 'Star' && store.state.currentLayer !== 'SYSTEM') {
        enterSystemBtn.textContent = i18n[currentLang].enterSystemBtn || "Enter System";
        enterSystemBtn.style.display = 'block';
        enterSystemBtn.onclick = () => enterSystem(userData.data);
    } else {
        enterSystemBtn.style.display = 'none';
    }

    const viewSurfaceBtn = document.getElementById('info-view-surface-btn');
    let showSurface = false;
    if ((userData.type === 'Planet' || userData.type === 'Moon') && !(data.type || '').includes('Gas')) {
        if (currentMode === 'gm') {
            showSurface = true;
        } else if (currentMode === 'ro') {
            showSurface = false;
        } else {
            // Check if player has any ships in the current system focus
            const hasShipInSystem = store.state.currentSystemFocus && store.state.ships.some(ship => {
                const sysX = (store.state.currentSystemFocus.x || 0).toFixed(2);
                const sysY = (store.state.currentSystemFocus.y || 0).toFixed(2);
                const sysZ = (store.state.currentSystemFocus.z || 0).toFixed(2);
                return ship.x.toFixed(2) === sysX && ship.y.toFixed(2) === sysY && ship.z.toFixed(2) === sysZ;
            });
            showSurface = hasShipInSystem;
        }
    }

    if (showSurface) {
        viewSurfaceBtn.style.display = 'block';
        
        let planetType = 'terrestrial';
        const typeStr = data.type || '';
        if (typeStr.includes('Terran') || typeStr.includes('Eyeball')) {
            planetType = 'terrestrial';
        } else if (typeStr.includes('Desert')) {
            planetType = 'desert';
        } else if (typeStr.includes('Ocean')) {
            planetType = 'ocean';
        } else if (typeStr.includes('Ice')) {
            planetType = 'ice';
        } else if (typeStr.includes('Volcanic') || typeStr.includes('Scorched')) {
            planetType = 'volcanic';
        } else {
            planetType = 'barren';
        }
        
        const R = data.physicalRadius || 6371;
        const nNeeded = (4 * Math.PI * R * R) / 100000;
        let resolution = 4;
        if (nNeeded < 1602) resolution = 3;
        else if (nNeeded < 6402) resolution = 4;
        else if (nNeeded < 25602) resolution = 5;
        else resolution = 6;
        
        viewSurfaceBtn.onclick = () => {
            const session = uiCtx.getSessionToken();
            const planetId = data.planetaryId || (store.state.currentSystemFocus.name + '-' + data.originalName).replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const actualSeed = data.planetSeed || data.id || store.state.currentSystemFocus.systemSeed + "_" + data.name;
            let url = `planetary/index.html?seed=${encodeURIComponent(actualSeed)}&name=${encodeURIComponent(data.name || 'Planet')}&type=${planetType}&resolution=${resolution}&physicalRadius=${R}`;
            if (store.state.currentSystemFocus) {
                const sysX = (store.state.currentSystemFocus.x || 0).toFixed(2);
                const sysY = (store.state.currentSystemFocus.y || 0).toFixed(2);
                const sysZ = (store.state.currentSystemFocus.z || 0).toFixed(2);
                url += `&systemX=${sysX}&systemY=${sysY}&systemZ=${sysZ}`;
            }
            if (planetId) {
                url += `&planet=${encodeURIComponent(planetId)}`;
            }
            if (session) {
                url += `&session=${encodeURIComponent(session)}`;
            } else {
                const mode = uiCtx.getCurrentMode();
                const role = (mode === 'gm') ? 'gm' : 'player';
                url += `&role=${role}`;
            }
            // Mark the planet as having had its surface generated
            data.hexmapGenerated = true;
            if (window.store && window.store.saveStars) window.store.saveStars();
            const currentSessionId = uiCtx.getCurrentSessionId();
            if (currentSessionId && window.store && window.store.state) {
                uiCtx.updateBackendSession(currentSessionId, window.store.state.ships);
            }
            
            // Set the URL search param on the current page to 'planet' so the back button resumes here
            if (planetId) {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('planet', planetId);
                window.history.replaceState({}, '', newUrl.toString());
                
                const client = uiCtx.getMqttClient();
                const mode = uiCtx.getCurrentMode();
                if (mode === 'gm' && client && currentSessionId) {
                    let safeUrl = `planetary/index.html?seed=${encodeURIComponent(actualSeed)}&name=${encodeURIComponent(data.name || 'Planet')}&type=${planetType}&resolution=${resolution}&physicalRadius=${R}`;
                    if (store.state.currentSystemFocus) {
                        const sysX = (store.state.currentSystemFocus.x || 0).toFixed(2);
                        const sysY = (store.state.currentSystemFocus.y || 0).toFixed(2);
                        const sysZ = (store.state.currentSystemFocus.z || 0).toFixed(2);
                        safeUrl += `&systemX=${sysX}&systemY=${sysY}&systemZ=${sysZ}`;
                    }
                    if (planetId) safeUrl += `&planet=${encodeURIComponent(planetId)}`;
                    safeUrl += `&role=ro&session_id=${currentSessionId}&pres=true`;
                    if (uiCtx.getCurrentSessionId()) {
                        // Let the viewer's planetary page read the token from cookies
                    }
                    client.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify({ type: 'layer_change', layer: 'PLANETARY', planetaryUrl: safeUrl }), { qos: 1 }, () => {
                        setTimeout(() => { window.location.href = url; }, 100);
                    });
                    // Fallback in case publish callback doesn't fire
                    setTimeout(() => { window.location.href = url; }, 1000);
                    return; // Prevent immediate navigation
                }
            }
            
            // Open in the same tab immediately if not publishing
            window.location.href = url;
        };
    } else {
        viewSurfaceBtn.style.display = 'none';
    }

    if (currentMode === 'gm') {
        if (data.privateNotes) {
            privateNotes.style.display = 'block';
            privateNotes.innerHTML = `<strong>Private Notes:</strong><br>${parseMarkdown(data.privateNotes)}`;
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

export function openEntityEditor(userData) {
    currentEditEntity = userData;
    const data = userData.data;
    
    document.getElementById('edit-entity-name').value = data.name || '';
    
    const classContainer = document.getElementById('edit-class-container');
    const classSelect = document.getElementById('edit-star-class');
    const typeSelect = document.getElementById('edit-poi-type');
    const ownerContainer = document.getElementById('edit-owner-container');
    const ownerSelect = document.getElementById('edit-ownership');
    
    if (userData.type === 'Star') {
        classContainer.style.display = 'block';
        classSelect.value = data.class || 'G';
        ownerContainer.style.display = 'none';
    } else if (userData.type === 'POI') {
        classContainer.style.display = 'block';
        classSelect.style.display = 'none';
        typeSelect.style.display = 'block';
        typeSelect.value = data.class || 'P';
        ownerContainer.style.display = 'block';
        ownerSelect.value = data.owner || 'Players';
    } else {
        classContainer.style.display = 'none';
        ownerContainer.style.display = 'block';
        ownerSelect.value = data.owner || 'Players';
    }
    
    document.getElementById('edit-coord-x').value = data.x || 0;
    document.getElementById('edit-coord-y').value = data.y || 0;
    document.getElementById('edit-coord-z').value = data.z || 0;
    document.getElementById('edit-entity-desc').value = data.description || '';
    document.getElementById('edit-public-notes').value = data.publicNotes || '';
    document.getElementById('edit-private-notes').value = data.privateNotes || '';
    
    document.getElementById('entity-editor-modal').style.display = 'flex';
}

export function closeEntityEditor() {
    document.getElementById('entity-editor-modal').style.display = 'none';
    currentEditEntity = null;
}

export function openMoveShipModal(userData) {
    currentMoveShip = userData.data;
    const isPoi = userData.type === 'POI';
    
    const titleHeader = document.getElementById('move-ship-title-header');
    if (isPoi) {
        titleHeader.setAttribute('data-i18n', 'movePoiTitle');
        titleHeader.textContent = i18n[currentLang].movePoiTitle;
    } else {
        titleHeader.setAttribute('data-i18n', 'moveShipTitle');
        titleHeader.textContent = i18n[currentLang].moveShipTitle;
    }
    
    const destType = document.getElementById('move-dest-type');
    destType.value = 'entity';
    document.getElementById('move-entity-select-group').style.display = 'block';
    
    const entitySelect = document.getElementById('move-entity-select');
    let options = '';
    
    [...state.ships].sort((a, b) => a.name.localeCompare(b.name)).forEach(ship => {
        if (ship.name !== currentMoveShip.name) {
            options += `<option value="${ship.name}">${ship.name} (Ship)</option>`;
        }
    });
    
    [...state.stars].sort((a, b) => a.name.localeCompare(b.name)).forEach(ent => {
        if (ent.name !== currentMoveShip.name) {
            let label = ent.class && ent.class.startsWith('P') ? 'POI' : 'Star';
            options += `<option value="${ent.name}">${ent.name} (${label})</option>`;
        }
    });
    
    entitySelect.innerHTML = options;

    if (entitySelect.value) {
        updateMoveCoordsFromSelectedEntity();
    } else {
        document.getElementById('move-coord-x').value = currentMoveShip.x;
        document.getElementById('move-coord-y').value = currentMoveShip.y;
        document.getElementById('move-coord-z').value = currentMoveShip.z;
    }
    
    document.getElementById('move-ship-modal').style.display = 'flex';
}

export function openMoveHereModal(userData) {
    const currentMode = uiCtx.getCurrentMode();
    const lastMovedShipName = uiCtx.getLastMovedShipName();
    currentMoveHereTarget = (userData.type === 'Planet' || userData.type === 'Moon') 
        ? { name: userData.data.name, x: store.state.currentSystemFocus.x, y: store.state.currentSystemFocus.y, z: store.state.currentSystemFocus.z } 
        : userData.data;
    
    document.getElementById('move-here-target-name').textContent = currentMoveHereTarget.name;
    
    const shipSelect = document.getElementById('move-here-ship-select');
    let options = '';
    
    const allowedShips = state.ships.filter(ship => {
        if (store.state.currentLayer === 'SYSTEM') {
            const dx = ship.x - store.state.currentSystemFocus.x;
            const dy = ship.y - store.state.currentSystemFocus.y;
            const dz = ship.z - store.state.currentSystemFocus.z;
            if (Math.sqrt(dx*dx + dy*dy + dz*dz) > 0.1) return false;
        }
        
        if (currentMode === 'gm') return true;
        if (currentMode === 'nav') return ship.owner !== 'GM';
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
    
    [...allowedShips].sort((a, b) => a.name.localeCompare(b.name)).forEach(ship => {
        options += `<option value="${ship.name}">${ship.name}</option>`;
    });
    shipSelect.innerHTML = options;
    
    let preselected = allowedShips.find(s => s.name === lastMovedShipName);
    if (preselected) {
        shipSelect.value = preselected.name;
    } else {
        shipSelect.selectedIndex = 0;
    }
    
    updateMoveHereDistance();
    
    document.getElementById('move-here-modal').style.display = 'flex';
}

export function updateMoveHereDistance() {
    const shipName = document.getElementById('move-here-ship-select').value;
    if (!shipName || !currentMoveHereTarget) return;
    
    const ship = state.ships.find(s => s.name === shipName);
    if (!ship) return;
    
    if (store.state.currentLayer === 'SYSTEM') {
        document.getElementById('move-here-total-dist').textContent = 'Local';
        document.getElementById('move-here-distance').value = '0';
        document.getElementById('move-here-distance').style.display = 'none';
        const distLabel = document.getElementById('move-here-distance-label');
        if (distLabel) distLabel.style.display = 'none';
        return;
    }
    
    document.getElementById('move-here-distance').style.display = 'block';
    const distLabel = document.getElementById('move-here-distance-label');
    if (distLabel) distLabel.style.display = 'block';
    
    const dx = currentMoveHereTarget.x - ship.x;
    const dy = currentMoveHereTarget.y - ship.y;
    const dz = currentMoveHereTarget.z - ship.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    document.getElementById('move-here-total-dist').textContent = distance.toFixed(2);
    document.getElementById('move-here-distance').value = distance.toFixed(2);
}

export function updateMoveCoordsFromSelectedEntity() {
    const entityName = document.getElementById('move-entity-select').value;
    if (!entityName) return;
    
    let found = state.ships.find(s => s.name === entityName);
    if (!found) {
        found = state.stars.find(s => s.name === entityName);
    }
    
    if (found) {
        document.getElementById('move-coord-x').value = found.x;
        document.getElementById('move-coord-y').value = found.y;
        document.getElementById('move-coord-z').value = found.z;
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && store.state.currentLayer === 'SYSTEM') {
        exitSystem();
    }
});
