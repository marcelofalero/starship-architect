import * as THREE from 'three';
import { state, saveStars, saveShips, saveLogs, saveTokens } from './data.js';
import { store } from './store.js';
import { loadHexDictionary, initDictionaryEditor } from './dictionary.js';
import {
    currentScene, camera, renderer, labelRenderer, controls,
    activeSystemView, clock, interactiveObjects,
    galaxyScene, systemScene,
    starTexture, starGeometry, shipGeometry, shipMat,
    raycaster, pointer,
    initScene, renderStars, renderShips, renderSystem,
    enterSystem, exitSystem, animateShip, onPointerDown, onWindowResize, animate, recenterMap,
    setPendingPlanetIdToFocus, pushCameraSync
} from './scene.js';
import {
    uiCtx, currentLang, i18n, applyTranslations, applyModeUI,
    showInfoPanel, renderLogs, showShareModal, openEntityEditor,
    closeEntityEditor, openMoveShipModal, openMoveHereModal,
    updateMoveHereDistance, updateMoveCoordsFromSelectedEntity,
    currentEditEntity, currentMoveShip, currentMoveHereTarget
} from './ui.js';
import {
    currentSessionId, currentMode, sessionToken, savedSessionTokens, mqttClient,
    setCurrentSessionId, setCurrentMode, setSessionToken, setSavedSessionTokens, setMqttClient,
    parseSessionFromUrl, syncSession, setupMqttPubSub, updateBackendSession as apiUpdateBackendSession,
    fetchBackendSession
} from './api.js';
import {
    getLastMovedShipName, openCreateModal, setActiveCreateTab, submitCreateEntity,
    deleteShip, onShipSelectChange, updateShipPosition, submitMoveShip, submitMoveHere,
    saveEntityEdits, deleteEntityEdits, onSearchChange, calculateDistance,
    travelAlongRoute, triggerCreateTokenUpload, triggerEntityTokenUpload,
    uploadEntityToken, updateTokenPreview, saveTokenEdits, closeTokenEditor,
    exportYaml, importYaml, onMoveCoordInput
} from './interactions.js';

// Re-export variables for scene.js
export { currentMode, currentSessionId, mqttClient } from './api.js';


// Auto-detect Spanish browser language or use saved preference
const savedLang = localStorage.getItem('vergeMapLang');
const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
const initLang = savedLang || (browserLang.startsWith('es') ? 'es' : 'en');

applyTranslations(initLang);
document.getElementById('lang-select').value = initLang;



// Initialize session state from URL/Cache
parseSessionFromUrl();

uiCtx.getCurrentMode = () => currentMode;
uiCtx.getCurrentSessionId = () => currentSessionId;
uiCtx.getSessionToken = () => sessionToken;
uiCtx.getLastMovedShipName = getLastMovedShipName;
uiCtx.getSavedSessionTokens = () => savedSessionTokens;
uiCtx.setSavedSessionTokens = (tokens) => { setSavedSessionTokens(tokens); };
uiCtx.updateBackendSession = updateBackendSession;
uiCtx.refreshDropdowns = refreshDropdowns;
uiCtx.getMqttClient = () => mqttClient;

export async function updateBackendSession(id, ships) {
    await apiUpdateBackendSession(id, ships, state.stars, state.logs, state.tokens);
}

function handleMqttMessage(remoteEntity) {
    if (remoteEntity.type === 'layer_change') {
        console.log(`[MQTT] Received layer_change: ${remoteEntity.layer}`);
        if (remoteEntity.layer === 'SYSTEM' && remoteEntity.starName) {
            const localStar = state.stars.find(s => s.name === remoteEntity.starName);
            if (localStar && store.state.currentLayer !== 'SYSTEM') {
                console.log(`[MQTT] Transitioning viewer to SYSTEM for ${remoteEntity.starName}`);
                enterSystem(localStar);
            }
        } else if (remoteEntity.layer === 'GALAXY' && store.state.currentLayer === 'SYSTEM') {
            console.log(`[MQTT] Transitioning viewer to GALAXY`);
            exitSystem();
        } else if (remoteEntity.layer === 'PLANETARY' && remoteEntity.planetaryUrl) {
            console.log(`[MQTT] Transitioning viewer to PLANETARY`);
            window.location.href = remoteEntity.planetaryUrl;
        }
        return;
    } else if (remoteEntity.type === 'camera_sync') {
        const mode = uiCtx.getCurrentMode();
        if (mode !== 'gm' && remoteEntity.state) { // Viewers and Players follow GM's camera
            pushCameraSync(remoteEntity.state);
        }
        return;
    }

    // Check if it's actually a Star or POI being moved/updated
    let localStar = state.stars.find(s => s.name === remoteEntity.name);
    if (localStar) {
        const timeSinceLocalMove = performance.now() - (localStar._lastLocalMove || 0);
        if (timeSinceLocalMove > 5000) {
            localStar.x = remoteEntity.x;
            localStar.y = remoteEntity.y;
            localStar.z = remoteEntity.z;
            if (remoteEntity.description !== undefined) localStar.description = remoteEntity.description;
            if (remoteEntity.privateNotes !== undefined) localStar.privateNotes = remoteEntity.privateNotes;
            if (remoteEntity.systemSeed !== undefined) localStar.systemSeed = remoteEntity.systemSeed;
            if (remoteEntity.planets !== undefined) localStar.planets = remoteEntity.planets;
            else delete localStar.planets;
            
            if (localStar.tokenId !== remoteEntity.tokenId || localStar.tokenScale !== remoteEntity.tokenScale) {
                localStar.tokenId = remoteEntity.tokenId;
                localStar.tokenScale = remoteEntity.tokenScale;
            }
            renderStars();
            refreshDropdowns();
            saveStars();
            
            // If we are currently inside the system that was just regenerated/edited, re-render it live!
            if (store.state.currentLayer === 'SYSTEM' && store.state.currentSystemFocus === localStar) {
                renderSystem();
            }
        }
        return;
    }

    const remoteShip = remoteEntity;
    let localShip = state.ships.find(s => s.name === remoteShip.name);
    let shouldRender = false;

    const token = remoteShip.tokenId ? state.tokens.find(t => t.id === remoteShip.tokenId) : null;
    if (remoteShip.tokenId && !token) {
        fetchBackendSession(currentSessionId).then(sessionData => {
            if (sessionData && sessionData.tokens) {
                state.tokens = sessionData.tokens;
                saveTokens();
                renderShips();
                renderStars();
            }
        });
    }

    if (localShip) {
        let changed = false;
        
        // Copy system-related properties of remoteShip to localShip
        if (localShip.localTarget !== remoteShip.localTarget) {
            localShip.localTarget = remoteShip.localTarget;
            changed = true;
        }
        if (localShip.sysRadius !== remoteShip.sysRadius) {
            localShip.sysRadius = remoteShip.sysRadius;
            changed = true;
        }
        if (localShip.sysAngle !== remoteShip.sysAngle) {
            localShip.sysAngle = remoteShip.sysAngle;
            changed = true;
        }
        if (localShip.isHidden !== remoteShip.isHidden) {
            localShip.isHidden = remoteShip.isHidden;
            changed = true;
        }
        
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
                
                if (state.sceneObjects[localShip.name]) {
                    animateShip(localShip, oldX, oldY, oldZ);
                }
                
                if (document.getElementById('ship-select') && document.getElementById('ship-select').value === localShip.name) {
                    document.getElementById('ship-x').value = localShip.x.toFixed(2);
                    document.getElementById('ship-y').value = localShip.y.toFixed(2);
                    document.getElementById('ship-z').value = localShip.z.toFixed(2);
                }
                
                changed = true;
            }
        }
        
        // Copy token properties
        if (localShip.tokenId !== remoteShip.tokenId || localShip.tokenScale !== remoteShip.tokenScale) {
            localShip.tokenId = remoteShip.tokenId;
            localShip.tokenScale = remoteShip.tokenScale;
            shouldRender = true;
        }
        
        if (changed) {
            shouldRender = true;
        }
    } else {
        // It's a new ship created remotely
        state.ships.push(remoteShip);
        shouldRender = true;
    }
    
    if (shouldRender) {
        renderShips();
        if (store.state.currentLayer === 'SYSTEM') {
            renderSystem();
        }
        refreshDropdowns();
    }
    saveShips();
}

init();async function init() {
    const container = document.getElementById('canvas-container');
    initScene(container);

    await loadHexDictionary();
    initDictionaryEditor();

    await loadData();

    window.addEventListener('resize', onWindowResize);
    document.getElementById('search-star').addEventListener('change', onSearchChange);
    document.getElementById('calc-btn').addEventListener('click', calculateDistance);
    document.getElementById('close-info').addEventListener('click', () => infoPanel.style.display = 'none');
    document.getElementById('ship-select').addEventListener('change', onShipSelectChange);
    document.getElementById('move-ship-btn').addEventListener('click', updateShipPosition);
    
    // Create Entity Modal triggers
    document.getElementById('open-create-modal-btn').addEventListener('click', openCreateModal);
    document.getElementById('recenter-map-btn').addEventListener('click', recenterMap);

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
    document.getElementById('create-upload-token-btn').addEventListener('click', triggerCreateTokenUpload);

    // Token Upload (Modal - Any entity)
    document.getElementById('entity-upload-token-btn').addEventListener('click', triggerEntityTokenUpload);

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

    const presBtn = document.getElementById('pres-btn');
    if (presBtn) {
        presBtn.addEventListener('click', () => {
            // Synchronously open a new tab to bypass popup blockers
            const presTab = window.open('about:blank', '_blank');
            
            // Get the viewer token from saved session tokens
            let viewerToken = null;
            try {
                const cached = sessionStorage.getItem('vergeMapSessionTokens');
                if (cached) {
                    const tokens = JSON.parse(cached);
                    viewerToken = tokens.viewer;
                }
            } catch (e) {}
            
            if (viewerToken) {
                const baseUrl = window.location.origin + window.location.pathname;
                presTab.location.href = `${baseUrl}?session=${viewerToken}&pres=true`;
            } else {
                presTab.document.write('Error: No presentation token available.');
            }
        });
    }

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
    
    document.getElementById('reset-session-btn').addEventListener('click', () => {
        if (confirm("Are you sure you want to reset your session? This will wipe your local data and disconnect you from the current session.")) {
            localStorage.removeItem('vergeMapShips');
            localStorage.removeItem('vergeMapStars');
            localStorage.removeItem('vergeMapLogs');
            localStorage.removeItem('vergeMapTokens');
            document.cookie = "vergeMapSessionToken=; path=/; max-age=0";
            window.location.href = window.location.origin + window.location.pathname;
        }
    });
    
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

    applyModeUI();

    animate();
}




function addLog(message) {
    state.logs.unshift({
        id: crypto.randomUUID(),
        message: message,
        timestamp: Date.now()
    });
    if (state.logs.length > 100) state.logs.pop();
    saveLogs();
    if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
    renderLogs();
}

async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        const savedStars = localStorage.getItem('vergeMapStars');
        if (savedStars) {
            const parsed = JSON.parse(savedStars);
            state.stars = parsed.length > 0 ? parsed : (data.stars || []);
        } else {
            state.stars = data.stars || [];
            saveStars();
        }
        
        const savedLogs = localStorage.getItem('vergeMapLogs');
        if (savedLogs) {
            const parsed = JSON.parse(savedLogs);
            state.logs = parsed.length > 0 ? parsed : (data.logs || []);
        } else {
            state.logs = data.logs || [];
            saveLogs();
        }

        const savedTokens = localStorage.getItem('vergeMapTokens');
        if (savedTokens) {
            state.tokens = JSON.parse(savedTokens);
        } else {
            state.tokens = [];
            saveTokens();
        }
        
        // Sync via the API module
        const fallbackShips = data.ships || [];
        const syncResult = await syncSession(fallbackShips, state.stars, state.logs);
        
        if (syncResult) {
            state.ships = syncResult.ships;
            state.stars = syncResult.stars;
            state.logs = syncResult.logs;
            state.tokens = syncResult.tokens;
            
            saveStars();
            saveShips();
            saveLogs();
            saveTokens();
            
            if (syncResult.showShareTokens) {
                showShareModal(syncResult.showShareTokens);
            }
        }
        
        renderStars();
        renderShips();
        renderLogs();
        refreshDropdowns();
        
        if (currentSessionId) {
            setupMqttPubSub(currentSessionId, handleMqttMessage);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const planetId = urlParams.get('planet');
        if (planetId) {
            const foundStar = state.stars.find(star => 
                star.planets && star.planets.some(p => {
                    const pid = p.planetaryId || (star.name + '-' + p.originalName).replace(/[^a-z0-9]/gi, '-').toLowerCase();
                    return pid === planetId;
                })
            );
            if (foundStar) {
                setPendingPlanetIdToFocus(planetId);
                enterSystem(foundStar);
            }
        }

    } catch (e) {
        console.error('Error loading data:', e);
    }
}

export function refreshDropdowns() {
    const searchSelect = document.getElementById('search-star');
    const starASelect = document.getElementById('star-a');
    const starBSelect = document.getElementById('star-b');
    const shipSelect = document.getElementById('ship-select');

    let starsOptions = `<optgroup data-i18n-label="optgroupStars" label="${i18n[currentLang].optgroupStars}">`;
    let poisOptions = `<optgroup data-i18n-label="optgroupPois" label="${i18n[currentLang].optgroupPois}">`;
    [...state.stars].sort((a, b) => a.name.localeCompare(b.name)).forEach(star => {
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
    [...state.ships].sort((a, b) => a.name.localeCompare(b.name)).forEach(ship => {
        if (ship.isHidden && currentMode !== 'gm') return;
        shipsOptions += `<option value="${ship.name}">${ship.name}</option>`;
    });
    shipsOptions += '</optgroup>';

    searchSelect.innerHTML = `<option value="" data-i18n="selectStar">${i18n[currentLang].selectStar}</option>` + shipsOptions + starsOptions + poisOptions;
    starASelect.innerHTML = `<option value="" data-i18n="origin">${i18n[currentLang].origin}</option>` + shipsOptions + starsOptions + poisOptions;
    starBSelect.innerHTML = `<option value="" data-i18n="destination">${i18n[currentLang].destination}</option>` + shipsOptions + starsOptions + poisOptions;
    shipSelect.innerHTML = `<option value="" data-i18n="selectShip">${i18n[currentLang].selectShip}</option>` + shipsOptions;
}