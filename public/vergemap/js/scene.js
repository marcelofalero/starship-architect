import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { generateSystem } from './systemGenerator.js';
import { state, saveStars } from './data.js';
import {
    currentMode,
    currentSessionId,
    mqttClient,
    updateBackendSession,
    refreshDropdowns
} from './app.js';
import {
    showInfoPanel,
    infoPanel,
    infoName,
    infoCoords,
    currentLang,
    i18n,
    applyModeUI
} from './ui.js';

export let camera, renderer, labelRenderer, controls;
export let activeSystemView = null;
export const clock = new THREE.Clock();
export const interactiveObjects = []; // Array of meshes for raycasting

export let currentLayer = 'GALAXY';
export let currentSystemFocus = null;
export let galaxyScene = new THREE.Scene();
export let systemScene = new THREE.Scene();
export let currentScene = galaxyScene;
export let starTexture, starGeometry, shipGeometry, shipMat;
export const raycaster = new THREE.Raycaster();
export const pointer = new THREE.Vector2();

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
    delete state.sceneObjects[name];
}

export function renderStars() {
    // Clear old stars/POIs if re-rendering
    Object.keys(state.sceneObjects).forEach(key => {
        const mesh = state.sceneObjects[key];
        if (mesh.userData && (mesh.userData.type === 'Star' || mesh.userData.type === 'POI')) {
            removeMeshCompletely(mesh, key);
        }
    });

    state.stars.forEach(star => {
        if (star.isHidden && currentMode !== 'gm') return;
        
        const token = star.tokenId ? state.tokens.find(t => t.id === star.tokenId) : null;
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
        if (star.name === "Aegis") {
            starDiv.style.color = "#FF5722";
            starDiv.style.fontWeight = "bold";
            starDiv.style.fontSize = "16px";
        }
        const label = new CSS2DObject(starDiv);
        label.position.set(0, 1.2, 0);
        if (currentLayer === 'SYSTEM') starDiv.style.visibility = 'hidden';
        mesh.add(label);

        mesh.userData.stem = stem;
        state.sceneObjects[star.name] = mesh;
    });
}

export function renderShips() {
    // Clear old ships first if re-rendering
    Object.keys(state.sceneObjects).forEach(key => {
        const mesh = state.sceneObjects[key];
        if (mesh.userData && mesh.userData.type === 'Ship') {
            removeMeshCompletely(mesh, key);
        }
    });    
    
    // Group ships by coordinates to detect overlapping at stars
    const shipsAtStar = {};
    state.ships.forEach(ship => {
        const key = `${ship.x.toFixed(2)},${ship.y.toFixed(2)},${ship.z.toFixed(2)}`;
        const star = state.stars.find(s => s.x.toFixed(2) === ship.x.toFixed(2) && s.y.toFixed(2) === ship.y.toFixed(2) && s.z.toFixed(2) === ship.z.toFixed(2));
        if (star) {
            if (!shipsAtStar[key]) shipsAtStar[key] = [];
            shipsAtStar[key].push(ship);
        }
    });

    state.ships.forEach(ship => {
        if (ship.isHidden && currentMode !== 'gm') return;
        
        const token = ship.tokenId ? state.tokens.find(t => t.id === ship.tokenId) : null;
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
        const label = new CSS2DObject(shipDiv);
        
        if (orbitingShips) {
            label.position.set(0, 1.5, 0); // Keep it slightly above the small mesh
            shipDiv.style.fontSize = '10px';
        } else {
            label.position.set(0, 1, 0);
        }
        
        if (currentLayer === 'SYSTEM') shipDiv.style.visibility = 'hidden';
        mesh.add(label);
        
        state.sceneObjects[ship.name] = mesh;
    });
}

export function renderSystem() {
    // Clear previous
    clearScene(systemScene);

    const genMode = document.getElementById('generation-mode-select') ? document.getElementById('generation-mode-select').value : 'Normal';
    const isFirstTime = !currentSystemFocus.planets;
    activeSystemView = generateSystem(currentSystemFocus, genMode);
    activeSystemView.position.set(0, 0, 0);
    
    if (isFirstTime) {
        saveStars();
    }

    // Add labels to the interactable meshes
    if (activeSystemView.userData && activeSystemView.userData.interactableMeshes) {
        activeSystemView.userData.interactableMeshes.forEach(mesh => {
            if (mesh.userData.name && !mesh.userData.isOrbiter) {
                const labelDiv = document.createElement('div');
                labelDiv.className = 'star-label';
                labelDiv.textContent = mesh.userData.name;
                labelDiv.style.color = "#FF5722";
                labelDiv.style.fontWeight = "bold";
                labelDiv.style.fontSize = mesh.userData.isStar ? "16px" : "11px";
                labelDiv.style.marginTop = mesh.userData.isStar ? "2em" : "1.5em";
                labelDiv.style.pointerEvents = "auto";
                labelDiv.style.cursor = "pointer";
                
                labelDiv.onclick = (e) => {
                    e.stopPropagation();
                    if (mesh.userData.isStar) {
                        showInfoPanel({ type: 'Star', data: currentSystemFocus });
                    } else if (mesh.userData.data) {
                        // Make sure x/y/z are present so it doesn't crash the panel coords display
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
            }
        });
    }

    // Render System POIs
    if (currentSystemFocus.systemPois) {
        currentSystemFocus.systemPois.forEach(poi => {
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

    state.ships.forEach(ship => {
        const sysX = (currentSystemFocus.x || 0).toFixed(2);
        const sysY = (currentSystemFocus.y || 0).toFixed(2);
        const sysZ = (currentSystemFocus.z || 0).toFixed(2);
        
        if (ship.x.toFixed(2) === sysX && ship.y.toFixed(2) === sysY && ship.z.toFixed(2) === sysZ) {
            if (ship.isHidden && currentMode !== 'gm') return;
            
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
            
            const token = ship.tokenId ? state.tokens.find(t => t.id === ship.tokenId) : null;
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

    systemScene.add(activeSystemView);
}

export function enterSystem(starData) {
    currentLayer = 'SYSTEM';
    currentSystemFocus = starData;
    currentScene = systemScene;
    currentScene.add(camera);
    
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
    currentLayer = 'GALAXY';
    currentSystemFocus = null;
    currentScene = galaxyScene;
    currentScene.add(camera);
    activeSystemView = null;
    
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
    const mesh = state.sceneObjects[ship.name];

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

export function onPointerDown(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        const selectedMesh = intersects[0].object;
        showInfoPanel(selectedMesh.userData);
    }
}

export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
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

export function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(clock.getDelta(), 0.1);
    
    interactiveObjects.forEach(mesh => {
        if(mesh.userData.type === 'Ship') {
            if (!mesh.userData.hasToken) {
                mesh.rotation.y += 0.02;
                mesh.rotation.x += 0.01;
            }
            if (mesh.userData.isOrbiting) {
                mesh.userData.orbitAngle -= 0.005; // Orbit speed
                const center = mesh.userData.orbitCenter;
                const r = mesh.userData.orbitRadius;
                mesh.position.set(
                    center.x + Math.cos(mesh.userData.orbitAngle) * r,
                    center.y + Math.sin(mesh.userData.orbitAngle) * r,
                    center.z
                );
            }
        }
    });

    if (currentLayer === 'SYSTEM' && activeSystemView) {
        if (activeSystemView.userData.starGroup) {
            activeSystemView.userData.starGroup.rotation.y += 0.25 * delta;
            if (activeSystemView.userData.starUniforms) {
                activeSystemView.userData.starUniforms.forEach(u => {
                    if(u.uTime) u.uTime.value += delta * 1.5;
                });
            }
        }
        if (activeSystemView.userData.beltMeshes) {
            activeSystemView.userData.beltMeshes.forEach(b => {
                b.mesh.rotation.z += b.speed * delta;
            });
        }
        if (activeSystemView.userData.orbitBodies) {
            activeSystemView.userData.orbitBodies.forEach((p) => {
                p.orbitAngle += p.orbitSpeed * delta;
                p.mesh.position.set(
                    p.a * Math.cos(p.orbitAngle) - p.c,
                    p.b * Math.sin(p.orbitAngle),
                    0
                );
                
                if (p.isTidalLocked) {
                    p.mesh.rotation.y = -p.orbitAngle + Math.PI / 2;
                } else {
                    p.mesh.rotation.y += p.rotationSpeed * delta;
                }
                
                if (p.mesh.userData.orbiters) {
                    p.mesh.userData.orbiters.forEach((o) => {
                        o.angle += o.speed * delta;
                        o.mesh.position.set(
                            o.dist * Math.cos(o.angle),
                            o.dist * Math.sin(o.angle),
                            0
                        );
                        o.mesh.rotation.y += (0.1 + Math.abs(o.speed)) * delta;
                    });
                }
            });
        }
    }

    // Limit the OrbitControls target to keep the user from panning outside of the actual map
    if (currentLayer === 'SYSTEM') {
        controls.target.x = Math.max(-40, Math.min(40, controls.target.x));
        controls.target.y = Math.max(-40, Math.min(40, controls.target.y));
        controls.target.z = Math.max(-40, Math.min(40, controls.target.z));
    } else {
        controls.target.x = Math.max(-70, Math.min(70, controls.target.x));
        controls.target.y = Math.max(-70, Math.min(70, controls.target.y));
        controls.target.z = Math.max(-40, Math.min(40, controls.target.z));
    }

    controls.update();
    renderer.render(currentScene, camera);
    labelRenderer.render(currentScene, camera);
}

export function initScene(container) {
    galaxyScene.fog = new THREE.FogExp2(0x050505, 0.005);
    systemScene.fog = new THREE.FogExp2(0x020208, 0.003);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 90);

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
    galaxyScene.add(ambientLight);
    
    // System scene: lower ambient so the star's point light does more work
    const ambientLightSys = new THREE.AmbientLight(0x111133, 0.5);
    systemScene.add(ambientLightSys);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    camera.add(pointLight); 
    galaxyScene.add(camera);

    const gridHelper = new THREE.GridHelper(120, 48, 0x333333, 0x111111);
    gridHelper.rotation.x = Math.PI / 2; 
    
    galaxyScene.add(gridHelper);

    // Setup click listener for raycasting
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Setup system tools UI listeners
    document.getElementById('back-to-galaxy-btn').addEventListener('click', exitSystem);

    document.getElementById('floating-system-tools').addEventListener('click', () => {
        document.getElementById('system-tools-modal').style.display = 'flex';
    });

    document.getElementById('close-system-tools-btn').addEventListener('click', () => {
        document.getElementById('system-tools-modal').style.display = 'none';
    });

    document.getElementById('regenerate-system-btn').addEventListener('click', () => {
        if (currentSystemFocus && currentMode === 'gm') {
            currentSystemFocus.systemSeed = Math.random().toString(36).substring(2, 15);
            delete currentSystemFocus.planets;
            renderSystem();
            saveStars();
            
            if (currentSessionId) updateBackendSession(currentSessionId, state.ships);
            if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(currentSystemFocus));
            
            document.getElementById('system-tools-modal').style.display = 'none';
        }
    });

    starTexture = createStarTexture();
    starGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    shipGeometry = new THREE.TetrahedronGeometry(0.5);
    shipMat = new THREE.MeshPhongMaterial({
        color: 0x4bb5c1,
        emissive: 0x389ebd,
        emissiveIntensity: 0.5
    });
}
