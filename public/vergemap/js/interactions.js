// User Interactions and Action Routing Module

import * as THREE from 'three';
import { state, saveStars, saveShips, saveLogs, saveTokens } from './data.js';
import {
    currentScene, camera, controls, 
    galaxyScene, systemScene, renderStars, renderShips, renderSystem,
    animateShip, removeMeshCompletely
} from './scene.js';
import {
    currentSessionId, currentMode, sessionToken, updateBackendSession,
    mqttClient, fetchBackendSession
} from './api.js';
import {
    uiCtx, currentLang, i18n, showInfoPanel, renderLogs,
    showShareModal, openEntityEditor, closeEntityEditor,
    openMoveShipModal, openMoveHereModal, updateMoveHereDistance,
    updateMoveCoordsFromSelectedEntity, currentEditEntity,
    currentMoveShip, currentMoveHereTarget
} from './ui.js';

// Local interaction state variables
let lastMovedShipName = localStorage.getItem('lastMovedShipName') || null;
let currentCreateType = 'Ship';
let currentTokenImg = null;
let currentTokenEntity = null;
let currentTokenEntityType = null;
let currentRoute = null;
let routeLine = null;

export function getLastMovedShipName() {
    return lastMovedShipName;
}

function setLastMovedShip(name) {
    lastMovedShipName = name;
    localStorage.setItem('lastMovedShipName', name);
}

export function openCreateModal() {
    currentCreateType = 'Ship';
    document.getElementById('create-entity-name').value = '';
    document.getElementById('create-entity-desc').value = '';
    document.getElementById('create-entity-x').value = '0';
    document.getElementById('create-entity-y').value = '0';
    document.getElementById('create-entity-z').value = '0';
    populateCreateTokenDropdown();
    
    if (store.state.currentLayer === 'SYSTEM') {
        document.getElementById('create-entity-coords-label').textContent = 'Position (Radius AU, Angle °)';
        document.getElementById('create-entity-x').placeholder = 'Radius (AU)';
        document.getElementById('create-entity-y').placeholder = 'Angle (°)';
        document.getElementById('create-entity-z').style.display = 'none';
        document.getElementById('tab-star').style.display = 'none';
        setActiveCreateTab('POI');
    } else {
        document.getElementById('create-entity-coords-label').textContent = 'Coordinates (X, Y, Z)';
        document.getElementById('create-entity-x').placeholder = 'X';
        document.getElementById('create-entity-y').placeholder = 'Y';
        document.getElementById('create-entity-z').style.display = 'inline-block';
        document.getElementById('tab-star').style.display = 'inline-block';
        setActiveCreateTab('Ship');
    }
    
    document.getElementById('create-entity-modal').style.display = 'flex';
}

export function setActiveCreateTab(type) {
    currentCreateType = type;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (type === 'Ship') {
        document.getElementById('tab-ship').classList.add('active');
        document.getElementById('create-star-class-group').style.display = 'none';
        document.getElementById('create-poi-type-group').style.display = 'none';
        document.getElementById('create-ship-class-group').style.display = 'block';
        document.getElementById('create-token-group').style.display = 'block';
        document.getElementById('create-owner-group').style.display = 'block';
    } else if (type === 'Star') {
        document.getElementById('tab-star').classList.add('active');
        document.getElementById('create-star-class-group').style.display = 'block';
        document.getElementById('create-poi-type-group').style.display = 'none';
        document.getElementById('create-ship-class-group').style.display = 'none';
        document.getElementById('create-token-group').style.display = 'none';
        document.getElementById('create-owner-group').style.display = 'none';
    } else if (type === 'POI') {
        document.getElementById('tab-poi').classList.add('active');
        document.getElementById('create-star-class-group').style.display = 'none';
        document.getElementById('create-poi-type-group').style.display = 'block';
        document.getElementById('create-ship-class-group').style.display = 'none';
        document.getElementById('create-token-group').style.display = 'block';
        document.getElementById('create-owner-group').style.display = 'block';
    }
}

export function submitCreateEntity() {
    if (currentMode !== 'gm') return;
    const nameInput = document.getElementById('create-entity-name');
    const name = nameInput.value.trim();
    if (!name) {
        alert("Please enter a name.");
        return;
    }
    
    if (state.ships.find(s => s.name === name) || state.stars.find(s => s.name === name)) {
        alert("Name already exists!");
        return;
    }
    
    const x = parseFloat(document.getElementById('create-entity-x').value) || 0;
    const y = parseFloat(document.getElementById('create-entity-y').value) || 0;
    const z = parseFloat(document.getElementById('create-entity-z').value) || 0;
    const desc = document.getElementById('create-entity-desc').value.trim();
    const tokenId = document.getElementById('create-entity-token').value;
    
    if (currentCreateType === 'Ship') {
        const cls = document.getElementById('create-ship-class').value.trim();
        let newShip = {
            name: name,
            description: desc || "A newly commissioned ship.",
            owner: document.getElementById('create-entity-owner').value
        };
        
        if (store.state.currentLayer === 'SYSTEM') {
            newShip.x = store.state.currentSystemFocus.x;
            newShip.y = store.state.currentSystemFocus.y;
            newShip.z = store.state.currentSystemFocus.z;
            newShip.sysRadius = x;
            newShip.sysAngle = y * Math.PI / 180;
        } else {
            newShip.x = x;
            newShip.y = y;
            newShip.z = z;
        }
        
        if (cls) newShip.class = cls;
        if (tokenId) newShip.tokenId = tokenId;
        state.ships.push(newShip);
        saveShips();
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        
        if (store.state.currentLayer === 'SYSTEM') {
            renderSystem();
        } else {
            renderShips();
        }
    } else if (currentCreateType === 'Star') {
        const cls = document.getElementById('create-star-class').value;
        state.stars.push({
            name: name,
            class: cls,
            x: x,
            y: y,
            z: z,
            description: desc || ""
        });
        saveStars();
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        renderStars();
    } else if (currentCreateType === 'POI') {
        const cls = document.getElementById('create-poi-type').value;
        const newPoi = {
            name: name,
            class: cls,
            description: desc || "",
            owner: document.getElementById('create-entity-owner').value
        };
        if (tokenId) newPoi.tokenId = tokenId;
        
        if (store.state.currentLayer === 'SYSTEM') {
            newPoi.originalName = name;
            newPoi.type = 'POI';
            newPoi.radius = x;
            newPoi.angle = y * Math.PI / 180;
            
            if (!store.state.currentSystemFocus.systemPois) store.state.currentSystemFocus.systemPois = [];
            store.state.currentSystemFocus.systemPois.push(newPoi);
            saveStars();
            renderSystem();
        } else {
            newPoi.x = x;
            newPoi.y = y;
            newPoi.z = z;
            state.stars.push(newPoi);
            saveStars();
            renderStars();
        }
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
    }
    
    uiCtx.refreshDropdowns();
    document.getElementById('create-entity-modal').style.display = 'none';
}

export function deleteShip() {
    if (currentMode !== 'gm') return;
    const shipName = document.getElementById('ship-select').value;
    if (!shipName) return;
    
    if (confirm(`Are you sure you want to delete ${shipName}?`)) {
        if (state.sceneObjects[shipName]) {
            removeMeshCompletely(state.sceneObjects[shipName], shipName);
        }
        
        state.ships = state.ships.filter(s => s.name !== shipName);
        saveShips();
        uiCtx.refreshDropdowns();
        
        document.getElementById('ship-x').value = '';
        document.getElementById('ship-y').value = '';
        document.getElementById('ship-z').value = '';
    }
}

export function onShipSelectChange(e) {
    const shipName = e.target.value;
    const ship = state.ships.find(s => s.name === shipName);
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

export function updateShipPosition() {
    if (currentMode === 'ro') return;
    const shipName = document.getElementById('ship-select').value;
    if (!shipName) return;
    
    const ship = state.ships.find(s => s.name === shipName);
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

    if (currentRoute && currentRoute.ship === ship) {
        currentRoute = null;
        document.getElementById('travel-ui').style.display = 'none';
    }
    if (currentMoveHereTarget) {
        // Clear move here target
        // We'll update UI directly since it's an exported read-only binding or just set it locally
    }

    addLog(`${ship.name} updated position to X:${ship.x.toFixed(2)}, Y:${ship.y.toFixed(2)}, Z:${ship.z.toFixed(2)}`);
    saveShips();
    if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(ship));
}

export function submitMoveShip() {
    if (!currentMoveShip) return;
    
    if (currentMode === 'ro') return;
    const isStarOrPoi = state.stars.includes(currentMoveShip) || (currentMoveShip.class && currentMoveShip.class.startsWith('P'));
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

    if (currentRoute && currentRoute.ship === currentMoveShip) {
        currentRoute = null;
        document.getElementById('travel-ui').style.display = 'none';
    }

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
    }
    
    if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(currentMoveShip));
    
    const infoCoords = document.getElementById('info-coords');
    if (infoCoords) {
        infoCoords.textContent = `X:${currentMoveShip.x.toFixed(2)}, Y:${currentMoveShip.y.toFixed(2)}, Z:${currentMoveShip.z.toFixed(2)}`;
    }
    
    uiCtx.refreshDropdowns();
    document.getElementById('move-ship-modal').style.display = 'none';
}

export function submitMoveHere() {
    const shipName = document.getElementById('move-here-ship-select').value;
    if (!shipName || !currentMoveHereTarget) return;
    
    const ship = state.ships.find(s => s.name === shipName);
    if (!ship) return;
    
    if (currentMode === 'ro') return;
    if (currentMode === 'nav' && ship.owner === 'GM') {
        alert("You cannot move a GM-owned ship.");
        return;
    }
    
    if (store.state.currentLayer === 'SYSTEM') {
        ship.localTarget = currentMoveHereTarget.name;
        ship._lastLocalMove = performance.now();
        setLastMovedShip(ship.name);
        addLog(`${ship.name} traveled locally to ${currentMoveHereTarget.name} within the system.`);
        
        saveShips();
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(ship));
        uiCtx.refreshDropdowns();
        document.getElementById('move-here-modal').style.display = 'none';
        renderSystem();
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
    
    if (travelDist >= totalDistance) {
        ship.x = currentMoveHereTarget.x;
        ship.y = currentMoveHereTarget.y;
        ship.z = currentMoveHereTarget.z;
    } else {
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
    
    if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(ship));
    
    uiCtx.refreshDropdowns();
    document.getElementById('move-here-modal').style.display = 'none';
}

export function saveEntityEdits() {
    if (currentMode !== 'gm') return;
    if (!currentEditEntity) return;
    
    const data = currentEditEntity.data;
    const newName = document.getElementById('edit-entity-name').value.trim();
    
    if (newName && newName !== data.name) {
        if (state.sceneObjects[data.name]) {
            state.sceneObjects[newName] = state.sceneObjects[data.name];
            delete state.sceneObjects[data.name];
        }
        data.name = newName;
    }
    
    data.description = document.getElementById('edit-entity-desc').value;
    data.publicNotes = document.getElementById('edit-entity-public').value;
    data.privateNotes = document.getElementById('edit-entity-private').value;
    data.isHidden = document.getElementById('edit-entity-hidden').checked;
    
    if (currentEditEntity.type === 'Star' || currentEditEntity.type === 'POI') {
        data.class = document.getElementById('edit-entity-class').value;
    } else if (currentEditEntity.type === 'Ship') {
        const cls = document.getElementById('edit-ship-class').value.trim();
        if (cls) data.class = cls;
        else delete data.class;
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
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(data));
    } else {
        saveStars();
        renderStars();
        if (store.state.currentLayer === 'SYSTEM') renderSystem();
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(data));
    }
    
    uiCtx.refreshDropdowns();
    showInfoPanel(currentEditEntity);
    closeEntityEditor();
}

export function populateTokenDropdown() {
    const dropdown = document.getElementById('edit-entity-token');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Default 3D Shape</option>';
    state.tokens.forEach(token => {
        const opt = document.createElement('option');
        opt.value = token.id;
        opt.textContent = token.name;
        dropdown.appendChild(opt);
    });
}

export function populateCreateTokenDropdown() {
    const dropdown = document.getElementById('create-entity-token');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">Default 3D Shape</option>';
    state.tokens.forEach(token => {
        const opt = document.createElement('option');
        opt.value = token.id;
        opt.textContent = token.name;
        dropdown.appendChild(opt);
    });
}

export function deleteEntityEdits() {
    if (currentMode !== 'gm') return;
    if (!currentEditEntity) return;
    
    const data = currentEditEntity.data;
    if (confirm(`Are you sure you want to delete ${data.name}?`)) {
        if (state.sceneObjects[data.name]) {
            removeMeshCompletely(state.sceneObjects[data.name], data.name);
        }
        
        if (currentEditEntity.type === 'Ship') {
            state.ships = state.ships.filter(s => s.name !== data.name);
            saveShips();
            renderShips();
            if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        } else {
            state.stars = state.stars.filter(s => s.name !== data.name);
            saveStars();
            renderStars();
            if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        }
        
        uiCtx.refreshDropdowns();
        document.getElementById('info-panel').style.display = 'none';
        closeEntityEditor();
    }
}

export function onSearchChange(e) {
    const starName = e.target.value;
    if (!starName || !state.sceneObjects[starName]) return;

    const targetPos = state.sceneObjects[starName].position;
    
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
    showInfoPanel(state.sceneObjects[starName].userData);
}

export function calculateDistance() {
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
            if (routeLine.parent) routeLine.parent.remove(routeLine);
            routeLine.geometry.dispose();
            routeLine.material.dispose();
            routeLine = null;
        }
        return;
    }

    const starA = state.stars.find(s => s.name === nameA) || state.ships.find(s => s.name === nameA);
    const starB = state.stars.find(s => s.name === nameB) || state.ships.find(s => s.name === nameB);

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
        
        if (routeLine) {
            if (routeLine.parent) routeLine.parent.remove(routeLine);
            routeLine.geometry.dispose();
            routeLine.material.dispose();
            routeLine = null;
        }
        
        if (distance > 0) {
            const p1 = new THREE.Vector3(-starA.x, starA.y, starA.z);
            const p2 = new THREE.Vector3(-starB.x, starB.y, starB.z);
            const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
            
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
            galaxyScene.add(routeLine);
        }

        const originIsShip = state.ships.some(s => s.name === starA.name);

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

export function travelAlongRoute() {
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
    
    const nx = currentRoute.vector.x / currentRoute.distance;
    const ny = currentRoute.vector.y / currentRoute.distance;
    const nz = currentRoute.vector.z / currentRoute.distance;
    
    ship.x = ship.x + (nx * travelDist);
    ship.y = ship.y + (ny * travelDist);
    ship.z = ship.z + (nz * travelDist);
    ship._lastLocalMove = performance.now();
    
    animateShip(ship, oldX, oldY, oldZ);
    setLastMovedShip(ship.name);
    addLog(`${ship.name} traveled ${travelDist} LY towards ${currentRoute.target.name} (now at X:${ship.x.toFixed(2)}, Y:${ship.y.toFixed(2)}, Z:${ship.z.toFixed(2)})`);
    saveShips();
    if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
    if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(ship));
    
    if (document.getElementById('ship-select').value === ship.name) {
        document.getElementById('ship-x').value = ship.x.toFixed(2);
        document.getElementById('ship-y').value = ship.y.toFixed(2);
        document.getElementById('ship-z').value = ship.z.toFixed(2);
    }
    
    currentRoute.vector.x = currentRoute.target.x - ship.x;
    currentRoute.vector.y = currentRoute.target.y - ship.y;
    currentRoute.vector.z = currentRoute.target.z - ship.z;
    currentRoute.distance = Math.sqrt(
        currentRoute.vector.x*currentRoute.vector.x + 
        currentRoute.vector.y*currentRoute.vector.y + 
        currentRoute.vector.z*currentRoute.vector.z
    );
    
    calculateDistance();
}

export function triggerCreateTokenUpload() {
    currentTokenEntity = { name: document.getElementById('create-entity-name').value.trim() || 'New Entity' };
    currentTokenEntityType = 'Create';
    document.getElementById('token-upload-file').click();
}

export function triggerEntityTokenUpload() {
    if (!currentEditEntity) return;
    currentTokenEntity = currentEditEntity.data;
    currentTokenEntityType = currentEditEntity.type;
    document.getElementById('token-upload-file').click();
}

export function uploadEntityToken(event) {
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

export function updateTokenPreview() {
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

export function saveTokenEdits() {
    if (currentMode !== 'gm') return;
    if (!currentTokenEntity) return;
    
    const canvas = document.getElementById('token-preview');
    const tokenUrl = canvas.toDataURL('image/webp', 0.8);
    const tokenScale = parseFloat(document.getElementById('token-scale').value) || 1.0;
    
    const tokenId = 't_' + Date.now();
    const tokenName = (currentTokenEntity.name || 'Entity') + ' Token';
    
    state.tokens.push({
        id: tokenId,
        name: tokenName,
        url: tokenUrl
    });
    saveTokens();
    
    if (currentTokenEntityType === 'Create') {
        uiCtx.refreshDropdowns();
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
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(currentTokenEntity));
        
        document.getElementById('ship-select').value = currentTokenEntity.name;
        onShipSelectChange({ target: { value: currentTokenEntity.name } });
    } else {
        saveStars();
        renderStars();
        if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
        
        if (currentEditEntity && currentEditEntity.data.name === currentTokenEntity.name) {
            showInfoPanel(currentEditEntity);
        }
    }
    
    uiCtx.refreshDropdowns();
    closeTokenEditor();
    
    populateTokenDropdown();
    const tokenSelect = document.getElementById('edit-entity-token');
    if (tokenSelect) {
        tokenSelect.value = tokenId;
    }
}

export function closeTokenEditor() {
    document.getElementById('token-editor-modal').style.display = 'none';
    currentTokenImg = null;
    currentTokenEntity = null;
    currentTokenEntityType = null;
}

export function exportYaml() {
    const data = {
        stars: state.stars,
        ships: state.ships
    };
    
    try {
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

export function importYaml(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = jsyaml.load(e.target.result);
            if (data.stars) state.stars = data.stars;
            if (data.ships) state.ships = data.ships;
            
            saveStars();
            saveShips();
            renderStars();
            renderShips();
            uiCtx.refreshDropdowns();
            alert("Map data imported successfully!");
        } catch (err) {
            console.error("YAML parsing error", err);
            alert("Failed to parse YAML file. Check console for details.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

export function addLog(message) {
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

export function onMoveCoordInput() {
    const x = parseFloat(document.getElementById('move-coord-x').value);
    const y = parseFloat(document.getElementById('move-coord-y').value);
    const z = parseFloat(document.getElementById('move-coord-z').value);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return;

    const TOLERANCE = 0.5;
    const all = [...state.stars, ...state.ships].filter(e => !currentMoveShip || e.name !== currentMoveShip.name);
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
        if ([...entitySelect.options].some(o => o.value === match.name)) {
            entitySelect.value = match.name;
        }
    } else {
        destTypeEl.value = 'coords';
        selectGroup.style.display = 'none';
    }
}
