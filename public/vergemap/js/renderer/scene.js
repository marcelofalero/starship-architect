import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { generateSystem } from '../procgen/system.js';
import { store } from '../store.js';
import { saveStars } from '../data.js';
import { updateBackendSession } from '../api.js';
import { showInfoPanel, infoPanel, infoName, infoCoords, currentLang, i18n, applyModeUI, uiCtx } from '../ui_v2.js';
import { camera, controls, galaxyScene, systemScene, currentScene, setScene, renderer, labelRenderer, clock } from './core.js';
import { interactiveObjects } from '../interactions/raycaster.js';

export let activeSystemView = null;
export let starTexture, starGeometry, shipGeometry, shipMat;
export let pendingPlanetIdToFocus = null;

export function setPendingPlanetIdToFocus(id) {
    pendingPlanetIdToFocus = id;
}

const cameraSyncBuffer = [];
export function pushCameraSync(state) {
    cameraSyncBuffer.push({
        time: performance.now(),
        state: state
    });
    // Keep buffer small
    if (cameraSyncBuffer.length > 20) {
        cameraSyncBuffer.shift();
    }
}

export function initGeometries() {
    starTexture = createStarTexture();
    starGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    shipGeometry = new THREE.TetrahedronGeometry(0.5);
    shipMat = new THREE.MeshPhongMaterial({
        color: 0x4bb5c1,
        emissive: 0x389ebd,
        emissiveIntensity: 0.5
    });
}
export function getStarColor(cls) {
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
export function createStarTexture() {
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
export function toggleLabels(sceneObj, isVisible) {
    sceneObj.traverse((child) => {
        if (child.isCSS2DObject && child.element) {
            child.element.style.visibility = isVisible ? 'visible' : 'hidden';
        }
    });
}
export function clearScene(sceneObj) {
    for (let i = sceneObj.children.length - 1; i >= 0; i--) {
        const child = sceneObj.children[i];
        if (child.isCamera || child.isLight) continue;
        sceneObj.remove(child);
        child.traverse(c => {
            if (c && c.element && typeof c.element.remove === 'function') {
                try { c.element.remove(); } catch(e) {}
            }
        });
    }
}
export function removeMeshCompletely(mesh, name) {
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.userData.stem && mesh.userData.stem.parent) mesh.userData.stem.parent.remove(mesh.userData.stem);
    mesh.children.forEach(child => {
        if (child.element) child.element.remove();
        const childIdx = interactiveObjects.indexOf(child);
        if (childIdx > -1) interactiveObjects.splice(childIdx, 1);
    });
    const index = interactiveObjects.indexOf(mesh);
    if (index > -1) interactiveObjects.splice(index, 1);
    delete store.state.sceneObjects[name];
}
export function renderStars() {
    // Clear old stars/POIs if re-rendering
    Object.keys(store.state.sceneObjects).forEach(key => {
        const mesh = store.state.sceneObjects[key];
        if (mesh.userData && (mesh.userData.type === 'Star' || mesh.userData.type === 'POI')) {
            removeMeshCompletely(mesh, key);
        }
    });

    store.state.stars.forEach(star => {
        const isHidden = star.isHidden || false;
        if (isHidden && uiCtx.getCurrentMode() !== 'gm') return;
        
        const token = star.tokenId ? store.state.tokens.find(t => t.id === star.tokenId) : null;
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
                transparent: !!star.isHidden,
                opacity: star.isHidden ? 0.3 : 1
            });
            
            if (star.class === 'P_STATION') {
                geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                mat = new THREE.MeshBasicMaterial({ 
                    color: colorHex,
                    transparent: !!star.isHidden,
                    opacity: star.isHidden ? 0.3 : 1
                });
            } else if (star.class === 'P_DERELICT') {
                geom = new THREE.ConeGeometry(0.8, 2, 4);
                mat = new THREE.MeshBasicMaterial({ 
                    color: colorHex,
                    transparent: !!star.isHidden,
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
        
        // Add invisible larger hitbox to make it easy to click but not interfere with orbits
        const hitboxRadius = (star.class === 'P_ANOMALY') ? 0.9 : 0.75;
        const hitboxGeo = new THREE.SphereGeometry(hitboxRadius, 8, 8);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitbox.userData = mesh.userData;
        mesh.add(hitbox);
        
        galaxyScene.add(mesh);
        interactiveObjects.push(hitbox);

        const stemGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-star.x, star.y, 0),
            new THREE.Vector3(-star.x, star.y, star.z)
        ]);
        const stemMat = new THREE.LineBasicMaterial({ color: 0x444444 });
        const stem = new THREE.Line(stemGeom, stemMat);
        galaxyScene.add(stem);

        const starDiv = document.createElement('div');
        starDiv.className = 'star-label';
        starDiv.textContent = star.name;
        starDiv.style.pointerEvents = "auto";
        starDiv.style.cursor = "pointer";
        starDiv.onclick = (e) => {
            e.stopPropagation();
            showInfoPanel({ type: isPoi ? 'POI' : 'Star', data: star });
        };
        if (star.name === "Aegis") {
            starDiv.style.color = "#FF5722";
            starDiv.style.fontWeight = "bold";
            starDiv.style.fontSize = "16px";
        }
        const label = new THREE.Group(); // Or keeping it as CSS2DObject
        const cssLabel = new CSS2DObject(starDiv);
        cssLabel.position.set(0, 1.2, 0);
        if (store.state.currentLayer === 'SYSTEM') starDiv.style.visibility = 'hidden';
        mesh.add(cssLabel);

        mesh.userData.stem = stem;
        store.state.sceneObjects[star.name] = mesh;
    });
}
export function renderShips() {
    // Clear old ships first if re-rendering
    Object.keys(store.state.sceneObjects).forEach(key => {
        const mesh = store.state.sceneObjects[key];
        if (mesh.userData && mesh.userData.type === 'Ship') {
            removeMeshCompletely(mesh, key);
        }
    });    
    
    // Group ships by coordinates to detect overlapping at stars
    const shipsAtStar = {};
    store.state.ships.forEach(ship => {
        if (ship.x === undefined || ship.y === undefined || ship.z === undefined) return;
        const key = `${ship.x.toFixed(2)},${ship.y.toFixed(2)},${ship.z.toFixed(2)}`;
        const star = store.state.stars.find(s => 
            s.x !== undefined && s.y !== undefined && s.z !== undefined && 
            s.x.toFixed(2) === ship.x.toFixed(2) && s.y.toFixed(2) === ship.y.toFixed(2) && s.z.toFixed(2) === ship.z.toFixed(2)
        );
        if (star) {
            if (!shipsAtStar[key]) shipsAtStar[key] = [];
            shipsAtStar[key].push(ship);
        }
    });

    store.state.ships.forEach(ship => {
        if (ship.isHidden && uiCtx.getCurrentMode() !== 'gm') return;
        
        const token = ship.tokenId ? store.state.tokens.find(t => t.id === ship.tokenId) : null;
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
        if (ship.x === undefined || ship.y === undefined || ship.z === undefined) return;
        const key = `${ship.x.toFixed(2)},${ship.y.toFixed(2)},${ship.z.toFixed(2)}`;
        const orbitingShips = shipsAtStar[key];
        
        if (orbitingShips) {
            const shipIndex = orbitingShips.indexOf(ship);
            const total = orbitingShips.length;
            const angle = (shipIndex / total) * Math.PI * 2;
            const radius = 1.2;
            
            mesh.position.set(-ship.x + Math.cos(angle)*radius, ship.y + Math.sin(angle)*radius, ship.z);
            mesh.scale.set(0.4, 0.4, 0.4);
            mesh.userData.isOrbiting = true;
            mesh.userData.orbitAngle = angle;
            mesh.userData.orbitRadius = radius;
            mesh.userData.orbitCenter = new THREE.Vector3(-ship.x, ship.y, ship.z);
        } else {
            mesh.position.set(-ship.x, ship.y, ship.z);
            const stemGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-ship.x, ship.y, 0),
                new THREE.Vector3(-ship.x, ship.y, ship.z)
            ]);
            const stemMat = new THREE.LineBasicMaterial({ color: 0x4bb5c1, transparent: true, opacity: 0.5 });
            const stem = new THREE.Line(stemGeom, stemMat);
            galaxyScene.add(stem);
            mesh.userData.stem = stem;
        }
        
        mesh.renderOrder = 10;
        mesh.frustumCulled = false;
        
        // Add invisible larger hitbox to make it easy to click
        const hitboxGeo = new THREE.SphereGeometry(0.6, 8, 8);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitbox.userData = mesh.userData;
        mesh.add(hitbox);
        
        galaxyScene.add(mesh);
        interactiveObjects.push(hitbox);

        const shipDiv = document.createElement('div');
        shipDiv.className = 'star-label';
        shipDiv.textContent = ship.name;
        shipDiv.style.color = "#00ffcc";
        shipDiv.style.pointerEvents = "auto";
        shipDiv.style.cursor = "pointer";
        shipDiv.onclick = (e) => {
            e.stopPropagation();
            showInfoPanel({ type: 'Ship', data: ship, hasToken: !!resolvedTokenUrl });
        };
        const label = new CSS2DObject(shipDiv);
        
        if (orbitingShips) {
            label.position.set(0, 1.5, 0); // Keep it slightly above the small mesh
            shipDiv.style.fontSize = '10px';
        } else {
            label.position.set(0, 1, 0);
        }
        
        if (store.state.currentLayer === 'SYSTEM') shipDiv.style.visibility = 'hidden';
        mesh.add(label);
        
        store.state.sceneObjects[ship.name] = mesh;
    });
}
export async function renderSystem() {
    if (store.state.currentSystemFocus && !store.state.currentSystemFocus.planets && !store.state.currentSystemFocus._triedFetch) {
        store.state.currentSystemFocus._triedFetch = true;
    }


    // Clear previous
    clearScene(systemScene);

    const genMode = document.getElementById('generation-mode-select') ? document.getElementById('generation-mode-select').value : 'Normal';
    const isFirstTime = !store.state.currentSystemFocus.planets;
    activeSystemView = generateSystem(store.state.currentSystemFocus, genMode, systemAnimationTime);
    activeSystemView.position.set(0, 0, 0);
    systemScene.add(activeSystemView);
    
    if (isFirstTime) {
        store.saveStars();
        const sessionId = uiCtx.getCurrentSessionId();
        if (sessionId) updateBackendSession(sessionId, store.state.ships);
    }

    // Add labels to the interactable meshes
    if (activeSystemView.userData && activeSystemView.userData.interactableMeshes) {
        activeSystemView.userData.interactableMeshes.forEach(mesh => {
            if (mesh.userData.name) {
                const labelDiv = document.createElement('div');
                labelDiv.className = 'star-label';
                labelDiv.textContent = mesh.userData.name;
                
                if (mesh.userData.isStar) {
                    labelDiv.style.color = "#FF5722";
                    labelDiv.style.fontSize = "16px";
                    labelDiv.style.marginTop = "2em";
                } else if (mesh.userData.isOrbiter) {
                    labelDiv.style.color = "#99aaBB";
                    labelDiv.style.fontSize = "10px";
                    labelDiv.style.marginTop = "1em";
                } else {
                    labelDiv.style.color = "#FF5722";
                    labelDiv.style.fontSize = "11px";
                    labelDiv.style.marginTop = "1.5em";
                }
                
                labelDiv.style.fontWeight = "bold";
                labelDiv.style.pointerEvents = "auto";
                labelDiv.style.cursor = "pointer";
                labelDiv.style.transition = "opacity 0.2s ease";
                
                labelDiv.onclick = (e) => {
                    e.stopPropagation();
                    if (mesh.userData.isStar) {
                        showInfoPanel({ type: 'Star', data: store.state.currentSystemFocus });
                    } else if (mesh.userData.data) {
                        if (mesh.userData.data.x === undefined) {
                            mesh.userData.data.x = 0;
                            mesh.userData.data.y = 0;
                            mesh.userData.data.z = 0;
                        }
                        showInfoPanel({ type: 'Planet', data: mesh.userData.data });
                    }
                };
                
                const label = new CSS2DObject(labelDiv);
                label.position.set(0, 0, 0); 
                mesh.add(label);
                mesh.userData.labelObject = label;
            }
        });
    }

    // Render System POIs
    if (store.state.currentSystemFocus.systemPois) {
        store.state.currentSystemFocus.systemPois.forEach(poi => {
            const poiGeo = new THREE.SphereGeometry(0.2, 16, 16);
            const poiMat = new THREE.MeshBasicMaterial({ color: 0xaa22ff }); 
            const mesh = new THREE.Mesh(poiGeo, poiMat);
            mesh.position.set(Math.cos(poi.angle) * poi.radius, Math.sin(poi.angle) * poi.radius, 0);
            
            mesh.userData = { type: 'POI', name: poi.name, data: poi };
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'star-label';
            labelDiv.textContent = poi.name;
            labelDiv.style.color = "#aa22ff";
            labelDiv.style.fontWeight = "bold";
            labelDiv.style.fontSize = "12px";
            labelDiv.style.marginTop = "1.5em";
            labelDiv.style.cursor = "pointer";
            labelDiv.style.pointerEvents = "auto";
            
            labelDiv.onclick = (e) => {
                e.stopPropagation();
                showInfoPanel({ type: 'POI', data: poi });
            };
            
            const label = new CSS2DObject(labelDiv);
            label.position.set(0,0,0);
            mesh.add(label);
            
            activeSystemView.add(mesh);
            if (!activeSystemView.userData.interactableMeshes) activeSystemView.userData.interactableMeshes = [];
            activeSystemView.userData.interactableMeshes.push(mesh);
        });
    }

    // Render Ships in System
    let maxRadius = 5.0;
    const bodyCoords = {};
    if (activeSystemView.userData && activeSystemView.userData.interactableMeshes) {
        activeSystemView.userData.interactableMeshes.forEach(m => {
            if (m.userData && m.userData.name) {
                const r = Math.sqrt(m.position.x*m.position.x + m.position.y*m.position.y);
                if (r > maxRadius) maxRadius = r;
                bodyCoords[m.userData.name] = { x: m.position.x, y: m.position.y };
            }
        });
    }

    store.state.ships.forEach(ship => {
        const sysX = (store.state.currentSystemFocus.x || 0).toFixed(2);
        const sysY = (store.state.currentSystemFocus.y || 0).toFixed(2);
        const sysZ = (store.state.currentSystemFocus.z || 0).toFixed(2);
        
        if (ship.x.toFixed(2) === sysX && ship.y.toFixed(2) === sysY && ship.z.toFixed(2) === sysZ) {
            if (ship.isHidden && uiCtx.getCurrentMode() !== 'gm') return;
            
            let targetMesh = null;
            if (ship.localTarget) {
                targetMesh = activeSystemView.userData.interactableMeshes.find(m => m.userData && m.userData.name === ship.localTarget);
            }
            
            let sx = 0, sy = 0;
            if (!targetMesh) {
                if (ship.sysRadius !== undefined && ship.sysAngle !== undefined) {
                    sx = Math.cos(ship.sysAngle) * ship.sysRadius;
                    sy = Math.sin(ship.sysAngle) * ship.sysRadius;
                } else {
                    ship.sysRadius = maxRadius + 2.0 + Math.random() * 2.0;
                    ship.sysAngle = Math.random() * Math.PI * 2;
                    sx = Math.cos(ship.sysAngle) * ship.sysRadius;
                    sy = Math.sin(ship.sysAngle) * ship.sysRadius;
                }
            }

            const scale = ship.tokenScale || 1.0;
            let mesh;
            
            const token = ship.tokenId ? store.state.tokens.find(t => t.id === ship.tokenId) : null;
            const resolvedTokenUrl = token ? token.url : ship.tokenUrl;
            
            if (resolvedTokenUrl) {
                const textureLoader = new THREE.TextureLoader();
                const tokenTexture = textureLoader.load(resolvedTokenUrl);
                const tokenGeom = new THREE.PlaneGeometry(0.5 * scale, 0.5 * scale);
                const tokenMat = new THREE.MeshBasicMaterial({
                    map: tokenTexture, transparent: true, opacity: ship.isHidden ? 0.5 : 1, side: THREE.DoubleSide, depthWrite: false
                });
                mesh = new THREE.Mesh(tokenGeom, tokenMat);
            } else {
                const geom = new THREE.SphereGeometry(0.2, 16, 16);
                const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: ship.isHidden ? 0.5 : 1.0 });
                mesh = new THREE.Mesh(geom, mat);
            }

            if (targetMesh) {
                mesh.position.set(0.4, 0.4, 0);
                targetMesh.add(mesh);
            } else {
                mesh.position.set(sx, sy, 0);
                activeSystemView.add(mesh);
            }
            
            mesh.userData = {
                type: 'Ship',
                name: ship.name,
                data: ship,
                hasToken: !!resolvedTokenUrl
            };
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'star-label';
            labelDiv.textContent = ship.name;
            labelDiv.style.color = "#00ff00";
            labelDiv.style.fontWeight = "bold";
            labelDiv.style.fontSize = "12px";
            labelDiv.style.marginTop = "1.5em";
            labelDiv.style.cursor = "pointer";
            labelDiv.style.pointerEvents = "auto";
            
            labelDiv.onclick = (e) => {
                e.stopPropagation();
                showInfoPanel({ type: 'Ship', data: ship, hasToken: !!resolvedTokenUrl });
            };
            
            const label = new CSS2DObject(labelDiv);
            label.position.set(0,0,0);
            mesh.add(label);

            if (!activeSystemView.userData.interactableMeshes) activeSystemView.userData.interactableMeshes = [];
            activeSystemView.userData.interactableMeshes.push(mesh);
        }
    });

    if (pendingPlanetIdToFocus && activeSystemView.userData.interactableMeshes) {
        const targetMesh = activeSystemView.userData.interactableMeshes.find(m => {
            if (!m.userData || !m.userData.data) return false;
            const pid = m.userData.data.planetaryId || (store.state.currentSystemFocus.name + '-' + m.userData.data.originalName).replace(/[^a-z0-9]/gi, '-').toLowerCase();
            return pid === pendingPlanetIdToFocus;
        });
        if (targetMesh) {
            showInfoPanel({ type: 'Planet', data: targetMesh.userData.data });
            pendingPlanetIdToFocus = null;
        }
    }

    systemScene.add(activeSystemView);
}
export function enterSystem(starData) {
    store.state.currentLayer = 'SYSTEM';
    store.state.currentSystemFocus = starData;
    setScene(systemScene);
    systemScene.add(camera);
    
    const mode = uiCtx.getCurrentMode();
    const sessionId = uiCtx.getCurrentSessionId();
    const client = uiCtx.getMqttClient();
    if (mode === 'gm' && client && sessionId) {
        console.log(`[MQTT] Publishing layer_change to SYSTEM for star: ${starData.name}`);
        client.publish(`vergemap/sessions/${sessionId}`, JSON.stringify({ type: 'layer_change', layer: 'SYSTEM', starName: starData.name }));
    } else {
        console.log(`[MQTT] Not publishing layer_change. mode=${mode}, hasClient=${!!client}, id=${sessionId}`);
    }
    
    document.getElementById('back-to-galaxy-btn').style.display = 'inline-block';
    document.getElementById('info-panel').style.display = 'none';
    
    // Unlock orbit controls for free 3D rotation in system view
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.maxDistance = 300;
    
    // Show system HUD
    const hud = document.getElementById('system-hud');
    if (hud) {
        const starClassNames = { O: 'Blue', B: 'Blue-White', A: 'White', F: 'Yellow-White', G: 'Yellow', K: 'Orange', M: 'Red' };
        document.getElementById('system-hud-name').textContent = starData.name;
        document.getElementById('system-hud-class').textContent =
            starData.class ? `Class ${starData.class} — ${starClassNames[starData.class] || starData.class}` : '';
        hud.style.opacity = '0';
        hud.style.display = 'block';
        setTimeout(() => { hud.style.opacity = '1'; }, 50);
    }
    
    applyModeUI();
    
    toggleLabels(galaxyScene, false);
    toggleLabels(systemScene, true);
    
    // Animate camera to origin for system view
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(0, 0, 90);
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);
    
    const duration = 1000;
    const startTime = performance.now();

    function tweenCamera(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPos, endPos, ease);
        controls.target.lerpVectors(startTarget, endTarget, ease);
        
        if (progress < 1) {
            requestAnimationFrame(tweenCamera);
        } else {
            renderSystem();
        }
    }
    requestAnimationFrame(tweenCamera);
}
export function exitSystem() {
    store.state.currentLayer = 'GALAXY';
    store.state.currentSystemFocus = null;
    setScene(galaxyScene);
    galaxyScene.add(camera);
    activeSystemView = null;
    
    // Clear deep link parameter so refreshing stays on the galaxy map
    const url = new URL(window.location.href);
    if (url.searchParams.has('planet')) {
        url.searchParams.delete('planet');
        window.history.replaceState({}, '', url.toString());
    }
    
    const mode = uiCtx.getCurrentMode();
    const sessionId = uiCtx.getCurrentSessionId();
    const client = uiCtx.getMqttClient();
    if (mode === 'gm' && client && sessionId) {
        client.publish(`vergemap/sessions/${sessionId}`, JSON.stringify({ type: 'layer_change', layer: 'GALAXY' }));
    }
    
    // Restore galaxy orbit constraints
    controls.minAzimuthAngle = -Math.PI / 12;
    controls.maxAzimuthAngle = Math.PI / 12;
    controls.minPolarAngle = Math.PI / 2 - Math.PI / 12;
    controls.maxPolarAngle = Math.PI / 2 + Math.PI / 12;
    controls.maxDistance = 200;
    
    // Hide system HUD
    const hud = document.getElementById('system-hud');
    if (hud) {
        hud.style.opacity = '0';
        setTimeout(() => { hud.style.display = 'none'; }, 300);
    }
    
    toggleLabels(galaxyScene, true);
    toggleLabels(systemScene, false);
    
    // Clear system scene meshes
    clearScene(systemScene);

    document.getElementById('back-to-galaxy-btn').style.display = 'none';
    const toolsModal = document.getElementById('system-tools-modal');
    if (toolsModal) toolsModal.style.display = 'none';
    
    applyModeUI();
}
export function animateShip(ship, oldX, oldY, oldZ) {
    const startPos = new THREE.Vector3(-oldX, oldY, oldZ);
    const endPos = new THREE.Vector3(-ship.x, ship.y, ship.z);
    
    const startTime = performance.now();
    const duration = 4500;
    
    const moveDir = endPos.clone().sub(startPos);
    let startQuat, endQuat;
    const mesh = store.state.sceneObjects[ship.name];

    if (mesh) {
        mesh.userData.isOrbiting = false;
        mesh.scale.set(1, 1, 1);
        
        // Reset label position if it was orbiting
        mesh.children.forEach(child => {
            if (child.isCSS2DObject) {
                child.position.set(0, 1, 0);
                child.element.style.fontSize = '';
            }
        });
    }

    // Capture camera start position once so the lerp is clean across frames
    const cameraStartTarget = controls.target.clone();
    
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

            // Pan orbit target from its original position to the destination over the animation
            controls.target.lerpVectors(cameraStartTarget, endPos, moveEase);
            
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
        } else {
            // Animation finished. Render ships again so they snap into orbit if applicable
            renderShips();
        }
    }
    requestAnimationFrame(tweenShip);
}
export function animateSystemShip(shipName, startWorldPos) {
    if (!activeSystemView || !activeSystemView.userData.interactableMeshes) return;
    const mesh = activeSystemView.userData.interactableMeshes.find(m => m.userData && m.userData.name === shipName);
    if (!mesh) return;

    const endWorldPos = new THREE.Vector3();
    mesh.getWorldPosition(endWorldPos);
    
    const parent = mesh.parent;
    systemScene.attach(mesh);
    mesh.position.copy(startWorldPos);

    const startTime = performance.now();
    const duration = 2500;
    
    const moveDir = endWorldPos.clone().sub(startWorldPos);
    let startQuat, endQuat;
    if (moveDir.lengthSq() > 0.001) {
        startQuat = mesh.quaternion.clone();
        const dummy = new THREE.Object3D();
        const angle = Math.atan2(moveDir.y, moveDir.x) - Math.PI / 2;
        dummy.rotation.set(0, 0, angle);
        endQuat = dummy.quaternion.clone();
    }

    function tweenShip(time) {
        const elapsed = time - startTime;
        
        const rotDuration = 800;
        let rotProgress = 0;
        let rotEase = 0;
        
        if (startQuat && endQuat) {
            rotProgress = Math.min(elapsed / rotDuration, 1);
            rotEase = 1 - Math.pow(1 - rotProgress, 3);
            mesh.quaternion.slerpQuaternions(startQuat, endQuat, rotEase);
        }
        
        const moveDuration = duration - rotDuration;
        const moveProgress = Math.max(0, Math.min((elapsed - rotDuration) / moveDuration, 1));
        const moveEase = 1 - Math.pow(1 - moveProgress, 3);
        
        const targetWorldPos = new THREE.Vector3();
        const dummyTarget = new THREE.Vector3(0.4, 0.4, 0); 
        if (parent.type !== 'Scene') {
            parent.localToWorld(dummyTarget);
        } else {
            // Free roaming system ships
            const ship = store.state.ships.find(s => s.name === shipName);
            if (ship) {
                dummyTarget.set(Math.cos(ship.sysAngle) * ship.sysRadius, Math.sin(ship.sysAngle) * ship.sysRadius, 0);
            }
        }
        targetWorldPos.copy(dummyTarget);
        
        mesh.position.lerpVectors(startWorldPos, targetWorldPos, moveEase);
        
        if (elapsed < duration) {
            requestAnimationFrame(tweenShip);
        } else {
            parent.attach(mesh);
            if (parent.type !== 'Scene') {
                mesh.position.set(0.4, 0.4, 0);
            } else {
                const ship = store.state.ships.find(s => s.name === shipName);
                if (ship) mesh.position.set(Math.cos(ship.sysAngle) * ship.sysRadius, Math.sin(ship.sysAngle) * ship.sysRadius, 0);
            }
            if (mesh.userData.hasToken) {
                mesh.quaternion.set(0, 0, 0, 1);
            }
        }
    }
    requestAnimationFrame(tweenShip);
}

export function recenterMap() {
    const duration = 800;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    
    const endTarget = new THREE.Vector3(0, 0, 0);
    const endPos = new THREE.Vector3(0, 0, 90);
    
    const startTime = performance.now();

    function tweenCamera(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPos, endPos, ease);
        controls.target.lerpVectors(startTarget, endTarget, ease);
        
        if (progress < 1) {
            requestAnimationFrame(tweenCamera);
        }
    }
    requestAnimationFrame(tweenCamera);
}
export let isSystemAnimationPaused = false;
export function toggleSystemAnimation() {
    isSystemAnimationPaused = !isSystemAnimationPaused;
}

let systemAnimationTime = 0;
let lastCameraSyncTime = 0;
let lastCameraState = '';

export function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Broadcast Camera Sync (GM only)
    const mode = uiCtx.getCurrentMode();
    const sessionId = uiCtx.getCurrentSessionId();
    const client = uiCtx.getMqttClient();
    
    if (mode === 'gm' && client && sessionId) {
        const now = Date.now();
        if (now - lastCameraSyncTime > 50) { // Max 20 fps
            const camState = {
                px: Number(camera.position.x.toFixed(3)), py: Number(camera.position.y.toFixed(3)), pz: Number(camera.position.z.toFixed(3)),
                tx: Number(controls.target.x.toFixed(3)), ty: Number(controls.target.y.toFixed(3)), tz: Number(controls.target.z.toFixed(3))
            };
            const stateStr = JSON.stringify(camState);
            if (stateStr !== lastCameraState) {
                lastCameraState = stateStr;
                lastCameraSyncTime = now;
                client.publish(`vergemap/sessions/${sessionId}`, JSON.stringify({
                    type: 'camera_sync',
                    state: camState
                }));
            }
        }
    } else if (mode !== 'gm') {
        const renderTime = performance.now() - 100; // 100ms artificial delay
        if (cameraSyncBuffer.length > 0) {
            let prev = null;
            let next = null;
            for (let i = 0; i < cameraSyncBuffer.length - 1; i++) {
                if (cameraSyncBuffer[i].time <= renderTime && cameraSyncBuffer[i+1].time > renderTime) {
                    prev = cameraSyncBuffer[i];
                    next = cameraSyncBuffer[i+1];
                    break;
                }
            }
            if (prev && next) {
                const t = (renderTime - prev.time) / (next.time - prev.time);
                const p1 = new THREE.Vector3(prev.state.px, prev.state.py, prev.state.pz);
                const p2 = new THREE.Vector3(next.state.px, next.state.py, next.state.pz);
                const t1 = new THREE.Vector3(prev.state.tx, prev.state.ty, prev.state.tz);
                const t2 = new THREE.Vector3(next.state.tx, next.state.ty, next.state.tz);
                camera.position.lerpVectors(p1, p2, t);
                controls.target.lerpVectors(t1, t2, t);
            } else if (cameraSyncBuffer[cameraSyncBuffer.length - 1].time <= renderTime) {
                // If we've passed the latest state, just lerp towards it to avoid snapping
                const latest = cameraSyncBuffer[cameraSyncBuffer.length - 1].state;
                const p = new THREE.Vector3(latest.px, latest.py, latest.pz);
                const tgt = new THREE.Vector3(latest.tx, latest.ty, latest.tz);
                camera.position.lerp(p, 0.1);
                controls.target.lerp(tgt, 0.1);
            }
        }
    }

    const delta = clock.getDelta();

    if (store.state.currentLayer === 'SYSTEM' && activeSystemView) {
        if (!isSystemAnimationPaused) {
            systemAnimationTime += delta;
            
            if (activeSystemView.userData.orbitBodies) {
                activeSystemView.userData.orbitBodies.forEach(ob => {
                    ob.orbitAngle += ob.orbitSpeed * delta;
                    ob.mesh.position.set(
                        ob.a * Math.cos(ob.orbitAngle) - ob.c,
                        ob.b * Math.sin(ob.orbitAngle),
                        0
                    );
                    if (!ob.isTidalLocked) {
                        ob.mesh.rotation.z += ob.rotationSpeed * delta;
                    }
                    
                    if (ob.mesh.userData.orbiters) {
                        ob.mesh.userData.orbiters.forEach(moon => {
                            moon.angle += moon.speed * delta;
                            moon.mesh.position.set(
                                Math.cos(moon.angle) * moon.dist,
                                Math.sin(moon.angle) * moon.dist,
                                0
                            );
                        });
                    }
                });
            }
            
            if (activeSystemView.userData.beltMeshes) {
                activeSystemView.userData.beltMeshes.forEach(belt => {
                    belt.mesh.rotation.z += belt.speed * delta * 60;
                });
            }
        }

        const cameraPos = new THREE.Vector3();
        camera.getWorldPosition(cameraPos);
        const meshPos = new THREE.Vector3();

        if (activeSystemView.userData.interactableMeshes) {
            activeSystemView.userData.interactableMeshes.forEach(mesh => {
                if (mesh.userData.isOrbiting) {
                    const angle = systemAnimationTime * 0.2 + mesh.userData.orbitAngle;
                    mesh.position.x = mesh.userData.orbitCenter.x + Math.cos(angle) * mesh.userData.orbitRadius;
                    mesh.position.y = mesh.userData.orbitCenter.y + Math.sin(angle) * mesh.userData.orbitRadius;
                }
                
                if (mesh.userData.labelObject) {
                    mesh.getWorldPosition(meshPos);
                    const dist = cameraPos.distanceTo(meshPos);
                    let opacity = 1.0;
                    if (mesh.userData.isOrbiter) {
                        opacity = dist < 120 ? (1.0 - (dist - 60) / 60) : 0; 
                    } else if (!mesh.userData.isStar) {
                        opacity = dist < 450 ? (1.0 - (dist - 300) / 150) : 0; 
                    }
                    opacity = Math.max(0, Math.min(1, opacity));
                    mesh.userData.labelObject.element.style.opacity = opacity;
                    mesh.userData.labelObject.element.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
                }
            });
        }
    } else if (store.state.currentLayer === 'GALAXY') {
        const time = clock.getElapsedTime();
        Object.values(store.state.sceneObjects).forEach(mesh => {
            if (mesh.userData.isOrbiting) {
                const angle = time * 0.2 + mesh.userData.orbitAngle;
                mesh.position.x = mesh.userData.orbitCenter.x + Math.cos(angle) * mesh.userData.orbitRadius;
                mesh.position.y = mesh.userData.orbitCenter.y + Math.sin(angle) * mesh.userData.orbitRadius;
            }
        });
    }

    renderer.render(currentScene, camera);
    labelRenderer.render(currentScene, camera);
}
