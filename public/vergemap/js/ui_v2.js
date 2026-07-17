import { state, saveLogs } from './data.js';
import { enterSystem, exitSystem } from './scene.js';
import { store } from './store.js';

const HEXMAP_WORKER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8788'
    : window.location.hostname === 'frontend'
        ? 'http://hexmap-worker:8788'
        : 'https://hexmap-worker.mafalero.workers.dev';

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

export function getTranslatedText(text, lang) {
    if (!text) return "";
    const regex = new RegExp(`<${lang}>([\\s\\S]*?)<\\/${lang}>`, 'i');
    const match = text.match(regex);
    if (match) return match[1].trim();
    if (!/<[a-z]{2}>/i.test(text)) return text;
    if (lang !== 'en') {
        const enMatch = text.match(/<en>([\s\S]*?)<\/en>/i);
        if (enMatch) return enMatch[1].trim();
    }
    return "";
}

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
        
        let toggleContainer = document.getElementById('gm-inline-edit-toggle-container');
        if (!toggleContainer) {
            toggleContainer = document.createElement('div');
            toggleContainer.id = 'gm-inline-edit-toggle-container';
            toggleContainer.style.position = 'fixed';
            toggleContainer.style.top = '10px';
            toggleContainer.style.right = '360px';
            toggleContainer.style.background = 'rgba(0,0,0,0.7)';
            toggleContainer.style.padding = '5px 10px';
            toggleContainer.style.borderRadius = '5px';
            toggleContainer.style.border = '1px solid rgba(0, 229, 255, 0.3)';
            toggleContainer.style.zIndex = '1000';
            toggleContainer.style.display = 'flex';
            toggleContainer.style.alignItems = 'center';
            toggleContainer.style.gap = '8px';
            
            toggleContainer.innerHTML = `
                <label class="switch" style="margin: 0; font-size: 0.8em; display: inline-block; width: 34px; height: 20px; position: relative;">
                    <input type="checkbox" id="gm-inline-edit-toggle" style="opacity: 0; width: 0; height: 0;">
                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px;"></span>
                </label>
                <span style="color: #00e5ff; font-weight: bold; font-family: 'Russo One', sans-serif; font-size: 0.9em;">GM Edit Mode</span>
            `;
            document.body.appendChild(toggleContainer);
            
            const style = document.createElement('style');
            style.textContent = `
                #gm-inline-edit-toggle:checked + span { background-color: #00e5ff; }
                #gm-inline-edit-toggle:checked + span:before { transform: translateX(14px); }
                #gm-inline-edit-toggle + span:before {
                    position: absolute; content: ""; height: 12px; width: 12px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%;
                }
            `;
            document.head.appendChild(style);
            
            document.getElementById('gm-inline-edit-toggle').addEventListener('change', (e) => {
                window.isGmInlineEditMode = e.target.checked;
                if (document.getElementById('info-panel').style.display === 'block' && window.currentInfoUserData) {
                    showInfoPanel(window.currentInfoUserData);
                }
            });
        }
        toggleContainer.style.display = 'flex';
    } else {
        const toggleContainer = document.getElementById('gm-inline-edit-toggle-container');
        if (toggleContainer) toggleContainer.style.display = 'none';
        window.isGmInlineEditMode = false;
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
    window.currentInfoUserData = userData;
    const currentMode = uiCtx.getCurrentMode();
    const lastMovedShipName = uiCtx.getLastMovedShipName();
    const data = userData.data || userData;
    infoName.textContent = data.isHidden && currentMode === 'gm' ? `${data.name || userData.name || 'Unknown'} (Hidden)` : (data.name || userData.name || 'Unknown');
    infoType.textContent = data.type || data.subtype || userData.type || 'Unknown';
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
    if (userData.type === 'Ship' || userData.type === 'POI' || userData.type === 'Planet' || userData.type === 'Moon') {
        ownerGroup.style.display = 'block';
        const ownerVal = data.owner || 'GM';
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


    
    let descHtml = getTranslatedText(data.description, currentLang) || "No description available.";

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
        publicNotes.style.display = 'block';
        publicNotes.innerHTML = `<strong>Public Notes:</strong><br>${parseMarkdown(getTranslatedText(data.publicNotes, currentLang))}`;
    } else {
        publicNotes.style.display = 'none';
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
            privateNotes.innerHTML = `<strong>Private Notes:</strong><br>${parseMarkdown(getTranslatedText(data.privateNotes, currentLang))}`;
        } else {
            privateNotes.style.display = 'none';
        }
        editBtn.style.display = 'block';
        editBtn.onclick = () => openEntityEditor(userData);
    } else {
        privateNotes.style.display = 'none';
        editBtn.style.display = 'none';
    }
    
    // Inject GM Edit Mode Form
    let saveBtn = document.getElementById('inline-save-btn');
    if (!saveBtn) {
        saveBtn = document.createElement('button');
        saveBtn.id = 'inline-save-btn';
        saveBtn.textContent = 'Save Changes';
        saveBtn.style.cssText = 'margin-top: 10px; width: 100%; padding: 10px; background: #28a745; border: none; color: white; cursor: pointer; font-weight: bold; display: none;';
        document.getElementById('info-panel').appendChild(saveBtn);
    }
    
    if (window.isGmInlineEditMode && currentMode === 'gm') {
        
        infoName.innerHTML = `<input type="text" id="inline-edit-name" value="${data.name || ''}" style="width: calc(100% - 30px); margin-right: 30px; box-sizing: border-box; background: #222; color: white; border: 1px solid #444; padding: 4px; margin-bottom: 5px;">`;
        infoClass.innerHTML = `<input type="text" id="inline-edit-class" value="${data.class || ''}" style="width: 100%; box-sizing: border-box; background: #222; color: white; border: 1px solid #444; padding: 2px;">`;
        infoOwner.innerHTML = `<select id="inline-edit-owner" style="width: 100%; box-sizing: border-box; background: #222; color: white; border: 1px solid #444; padding: 2px;"><option value="GM" ${data.owner === 'GM' ? 'selected' : ''}>GM</option><option value="Players" ${data.owner === 'Players' ? 'selected' : ''}>Players</option></select>`;
        
        let customHtml = '';
        if (userData.type === 'Planet' || userData.type === 'Moon') {
            customHtml += `
                 <label>Planet Type (Biome)</label>
                 <select id="inline-edit-ptype" style="width: 100%; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px; padding: 4px;">
                     <option value="Terran" ${data.type === 'Terran' ? 'selected' : ''}>Terran</option>
                     <option value="Desert" ${data.type === 'Desert' ? 'selected' : ''}>Desert</option>
                     <option value="Ocean" ${data.type === 'Ocean' ? 'selected' : ''}>Ocean</option>
                     <option value="Ice" ${data.type === 'Ice' ? 'selected' : ''}>Ice</option>
                     <option value="Volcanic" ${data.type === 'Volcanic' ? 'selected' : ''}>Volcanic</option>
                     <option value="Barren" ${data.type === 'Barren' ? 'selected' : ''}>Barren</option>
                     <option value="Gas Giant" ${data.type === 'Gas Giant' ? 'selected' : ''}>Gas Giant</option>
                     <option value="Natural Satellite" ${data.type === 'Natural Satellite' ? 'selected' : ''}>Natural Satellite</option>
                 </select><br>
                 <label>Size / Category</label>
                 <select id="inline-edit-psize" style="width: 100%; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px; padding: 4px;" onchange="
                    const bases = { '0.05': 1500, '0.1': 3000, '0.15': 6371, '0.2': 12000, '0.3': 25000, '0.4': 60000 };
                    const base = bases[this.value];
                    if (base && document.getElementById('inline-edit-prad')) {
                        const variance = base * 0.1;
                        const randomRad = Math.floor(base - variance + Math.random() * (variance * 2));
                        document.getElementById('inline-edit-prad').value = randomRad;
                    }
                 ">
                     <option value="0.05" ${data.size === 0.05 ? 'selected' : ''}>Tiny</option>
                     <option value="0.1" ${data.size === 0.1 || (data.size && data.size > 0.05 && data.size < 0.15) ? 'selected' : ''}>Small</option>
                     <option value="0.15" ${data.size === 0.15 || !data.size ? 'selected' : ''}>Medium</option>
                     <option value="0.2" ${data.size === 0.2 ? 'selected' : ''}>Large</option>
                     <option value="0.3" ${data.size === 0.3 ? 'selected' : ''}>Giant</option>
                     <option value="0.4" ${data.size >= 0.4 ? 'selected' : ''}>Huge</option>
                 </select><br>
                 <label>Seed</label><input type="text" id="inline-edit-pseed" value="${data.planetSeed || data.id || ''}" style="width: 100%; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px;"><br>
                 <label>Radius (km)</label><input type="number" id="inline-edit-prad" value="${data.physicalRadius || 6371}" style="width: 100%; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px;"><br>
                 <label>Atmosphere</label><input type="text" id="inline-edit-patm" value="${data.atmosphere || ''}" style="width: 100%; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px;"><br>
                 <label>Temp (K)</label><input type="number" id="inline-edit-ptemp" value="${data.temperature ? parseFloat(data.temperature) : 288}" style="width: 100%; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px;"><br>
            `;
        }
        customHtml += `
             <label>Description</label><textarea id="inline-edit-desc" style="width: 100%; height: 60px; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px;">${data.description || ''}</textarea><br>
             <label>Public Notes</label><textarea id="inline-edit-pub" style="width: 100%; height: 40px; background: #222; color: white; border: 1px solid #444; margin-bottom: 5px;">${data.publicNotes || ''}</textarea><br>
             <label>Private Notes (GM)</label><textarea id="inline-edit-priv" style="width: 100%; height: 40px; background: #222; color: white; border: 1px solid #ffaa55; margin-bottom: 5px;">${data.privateNotes || ''}</textarea><br>
             <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;"><input type="checkbox" id="inline-edit-hidden" ${data.isHidden ? 'checked' : ''} style="width: auto; margin: 0;"> Hidden</label>
        `;
        infoDesc.innerHTML = customHtml;
        publicNotes.innerHTML = '';
        privateNotes.style.display = 'none';
        
        if (editBtn) editBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        
        saveBtn.onclick = async () => {
            const newSeedInput = document.getElementById('inline-edit-pseed');
            if (newSeedInput && (userData.type === 'Planet' || userData.type === 'Moon')) {
                const getPlanetType = (typeStr) => {
                    const str = (typeStr || '');
                    if (str.includes('Terran') || str.includes('Eyeball')) return 'terrestrial';
                    if (str.includes('Desert')) return 'desert';
                    if (str.includes('Ocean')) return 'ocean';
                    if (str.includes('Ice')) return 'ice';
                    if (str.includes('Volcanic') || str.includes('Scorched')) return 'volcanic';
                    return 'barren';
                };
                const getResolution = (R) => {
                    const r = R || 6371;
                    const nNeeded = (4 * Math.PI * r * r) / 100000;
                    if (nNeeded < 1602) return 3;
                    if (nNeeded < 6402) return 4;
                    if (nNeeded < 25602) return 5;
                    return 6;
                };

                const newSeed = newSeedInput.value.trim();
                const oldSeed = data.planetSeed || data.id || (store.state.currentSystemFocus ? store.state.currentSystemFocus.systemSeed + "_" + data.name : '');
                
                const ptypeEl = document.getElementById('inline-edit-ptype');
                const newTypeStr = ptypeEl ? ptypeEl.value : data.type;
                const oldTypeStr = data.type;
                
                const pradEl = document.getElementById('inline-edit-prad');
                const newRadStr = pradEl ? parseFloat(pradEl.value) : data.physicalRadius;
                const oldRadStr = data.physicalRadius;
                
                const oldPlanetType = getPlanetType(oldTypeStr);
                const newPlanetType = getPlanetType(newTypeStr);
                
                const oldRes = getResolution(oldRadStr);
                const newRes = getResolution(newRadStr);

                if (oldSeed && (newSeed !== oldSeed || oldPlanetType !== newPlanetType || oldRes !== newRes)) {
                    let hasManualChanges = false;
                    try {
                        const url = `${HEXMAP_WORKER_URL}/planet/${oldSeed}/dggs?type=${oldPlanetType}`;
                        const res = await fetch(url);
                        if (res.ok) {
                            const buffer = await res.arrayBuffer();
                            const text = new TextDecoder().decode(buffer);
                            if ((text.includes('"revealedFeatures":[') && !text.includes('"revealedFeatures":[]')) || 
                                (text.includes('"customFeatures":{') && !text.includes('"customFeatures":{}')) ||
                                (text.includes('"factions":{') && !text.includes('"factions":{}')) ||
                                (text.includes('"sectorScans":{') && !text.includes('"sectorScans":{}')) ||
                                (text.includes('"labels":[') && !text.includes('"labels":[]'))) {
                                hasManualChanges = true;
                            }
                        }
                    } catch(e) { console.warn("Failed to check for manual changes", e); }
                    
                    if (hasManualChanges) {
                        const confirmMsg = "The current changes will trigger a surface map regeneration, some changes will be lost.";
                        if (!confirm(confirmMsg)) {
                            newSeedInput.value = oldSeed;
                            if (ptypeEl) ptypeEl.value = oldTypeStr;
                            if (pradEl) pradEl.value = oldRadStr;
                            return; // Abort save
                        }
                    }
                }
            }
            
            if (document.getElementById('inline-edit-name')) data.name = document.getElementById('inline-edit-name').value;
            if (document.getElementById('inline-edit-class')) data.class = document.getElementById('inline-edit-class').value;
            if (document.getElementById('inline-edit-owner')) data.owner = document.getElementById('inline-edit-owner').value;
            if (document.getElementById('inline-edit-ptype')) data.type = document.getElementById('inline-edit-ptype').value;
            if (document.getElementById('inline-edit-psize')) data.size = parseFloat(document.getElementById('inline-edit-psize').value) || 0.15;
            if (document.getElementById('inline-edit-pseed')) data.planetSeed = document.getElementById('inline-edit-pseed').value;
            if (document.getElementById('inline-edit-prad')) data.physicalRadius = parseFloat(document.getElementById('inline-edit-prad').value) || 6371;
            if (document.getElementById('inline-edit-patm')) data.atmosphere = document.getElementById('inline-edit-patm').value;
            if (document.getElementById('inline-edit-ptemp')) data.temperature = parseFloat(document.getElementById('inline-edit-ptemp').value) || 288;
            if (document.getElementById('inline-edit-desc')) data.description = document.getElementById('inline-edit-desc').value;
            if (document.getElementById('inline-edit-pub')) data.publicNotes = document.getElementById('inline-edit-pub').value;
            if (document.getElementById('inline-edit-priv')) data.privateNotes = document.getElementById('inline-edit-priv').value;
            if (document.getElementById('inline-edit-hidden')) data.isHidden = document.getElementById('inline-edit-hidden').checked;
            
            const currentSessionId = uiCtx.getCurrentSessionId();
            if (window.store && window.store.saveStars) window.store.saveStars();
            if (window.store && window.store.saveShips) window.store.saveShips();
            
            const client = uiCtx.getMqttClient();
            if (client && currentSessionId) {
                client.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(data));
            }
            
            showInfoPanel(userData); // Re-render in read-only or edit mode
        };
    } else {
        saveBtn.style.display = 'none';
    }
    
    infoPanel.style.display = 'block';
}

export function openEntityEditor(userData) {
    currentEditEntity = userData;
    const data = userData.data;
    
    document.getElementById('edit-entity-name').value = data.name || '';
    
    const classContainer = document.getElementById('edit-class-container');
    const entityClassSelect = document.getElementById('edit-entity-class') || document.getElementById('edit-star-class') || document.getElementById('edit-poi-type');
    const shipClassContainer = document.getElementById('edit-ship-class-container');
    const shipClassInput = document.getElementById('edit-ship-class');
    const ownerContainer = document.getElementById('edit-owner-group') || document.getElementById('edit-owner-container');
    const ownerSelect = document.getElementById('edit-entity-owner') || document.getElementById('edit-ownership');
    
    const planetContainer = document.getElementById('edit-planet-container');
    const pType = document.getElementById('edit-planet-type');
    const pSeed = document.getElementById('edit-planet-seed');
    const pRadius = document.getElementById('edit-planet-radius');
    const pAtm = document.getElementById('edit-planet-atmosphere');
    const pTemp = document.getElementById('edit-planet-temperature');
    
    if (userData.type === 'Star') {
        if (planetContainer) planetContainer.style.display = 'none';
        if (classContainer) classContainer.style.display = 'block';
        if (shipClassContainer) shipClassContainer.style.display = 'none';
        if (entityClassSelect) entityClassSelect.value = data.class || 'G';
        if (ownerContainer) ownerContainer.style.display = 'none';
    } else if (userData.type === 'POI') {
        if (planetContainer) planetContainer.style.display = 'none';
        if (classContainer) classContainer.style.display = 'block';
        if (shipClassContainer) shipClassContainer.style.display = 'none';
        if (entityClassSelect) entityClassSelect.value = data.class || 'P';
        if (ownerContainer) ownerContainer.style.display = 'block';
        if (ownerSelect) ownerSelect.value = data.owner || 'GM';
    } else if (userData.type === 'Ship') {
        if (planetContainer) planetContainer.style.display = 'none';
        if (classContainer) classContainer.style.display = 'none';
        if (shipClassContainer) shipClassContainer.style.display = 'block';
        if (shipClassInput) shipClassInput.value = data.class || '';
        if (ownerContainer) ownerContainer.style.display = 'block';
        if (ownerSelect) ownerSelect.value = data.owner || 'GM';
    } else {
        if (classContainer) classContainer.style.display = 'none';
        if (shipClassContainer) shipClassContainer.style.display = 'none';
        if (ownerContainer) ownerContainer.style.display = 'block';
        if (ownerSelect) ownerSelect.value = data.owner || 'GM';
        
        if (planetContainer) {
            planetContainer.style.display = 'block';
            if (pType) {
                let currentType = data.type || '';
                if (currentType.includes('Terran') || currentType.includes('Eyeball')) currentType = 'Terran';
                else if (currentType.includes('Desert')) currentType = 'Desert';
                else if (currentType.includes('Ocean')) currentType = 'Ocean';
                else if (currentType.includes('Ice')) currentType = 'Ice';
                else if (currentType.includes('Volcanic') || currentType.includes('Scorched')) currentType = 'Volcanic';
                else if (currentType.includes('Gas')) currentType = 'Gas Giant';
                else currentType = 'Barren';
                pType.value = currentType;
            }
            if (pSeed) pSeed.value = data.planetSeed || data.id || (store.state.currentSystemFocus ? store.state.currentSystemFocus.systemSeed + "_" + data.name : '');
            if (pRadius) pRadius.value = data.physicalRadius || 6371;
            if (pAtm) pAtm.value = data.atmosphere || '';
            if (pTemp) pTemp.value = data.temperature ? parseFloat(data.temperature) : 288;
        }
    }
    
    const cx = document.getElementById('edit-coord-x'); if (cx) cx.value = data.x || 0;
    const cy = document.getElementById('edit-coord-y'); if (cy) cy.value = data.y || 0;
    const cz = document.getElementById('edit-coord-z'); if (cz) cz.value = data.z || 0;
    const ed = document.getElementById('edit-entity-desc'); if (ed) ed.value = data.description || '';
    const epu = document.getElementById('edit-entity-public'); if (epu) epu.value = data.publicNotes || '';
    const epr = document.getElementById('edit-entity-private'); if (epr) epr.value = data.privateNotes || '';
    
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
