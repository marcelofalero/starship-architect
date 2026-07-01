import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, controls;
let starsData = [];
let shipsData = [];
const sceneObjects = {}; // Map name to 3D object for search
const interactiveObjects = []; // Array of meshes for raycasting

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

init();

async function init() {
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
    document.getElementById('create-ship-btn').addEventListener('click', createShip);
    document.getElementById('delete-ship-btn').addEventListener('click', deleteShip);
    document.getElementById('travel-btn').addEventListener('click', travelAlongRoute);
    
    // YAML Import/Export
    document.getElementById('export-yaml-btn').addEventListener('click', exportYaml);
    document.getElementById('import-yaml-btn').addEventListener('click', () => {
        document.getElementById('import-yaml-file').click();
    });
    document.getElementById('import-yaml-file').addEventListener('change', importYaml);
    
    // Setup click listener for raycasting
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

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
        
        const savedShips = localStorage.getItem('vergeMapShips');
        if (savedShips) {
            shipsData = JSON.parse(savedShips);
        } else {
            shipsData = data.ships || [];
            saveShips();
        }

        starTexture = createStarTexture();
        starGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        shipGeometry = new THREE.TetrahedronGeometry(0.5);
        shipMat = new THREE.MeshPhongMaterial({
            color: 0x00ffcc,
            emissive: 0x00aa88,
            emissiveIntensity: 0.5
        });

        renderStars();
        renderShips();
        refreshDropdowns();

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
    // Clear old stars if re-rendering
    Object.keys(sceneObjects).forEach(key => {
        const mesh = sceneObjects[key];
        if (mesh.userData && mesh.userData.type === 'Star') {
            removeMeshCompletely(mesh, key);
        }
    });

    starsData.forEach(star => {
        const colorHex = getStarColor(star.class);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const mesh = new THREE.Mesh(starGeometry, mat);
        mesh.position.set(-star.x, star.y, star.z);
        
        const spriteMat = new THREE.SpriteMaterial({
            map: starTexture,
            color: colorHex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(4, 4, 1);
        mesh.add(sprite);

        mesh.userData = { type: 'Star', data: star };
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
        const mesh = new THREE.Mesh(shipGeometry, shipMat);
        mesh.position.set(-ship.x, ship.y, ship.z);
        mesh.userData = { type: 'Ship', data: ship };
        scene.add(mesh);
        interactiveObjects.push(mesh);

        const stemGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-ship.x, ship.y, 0),
            new THREE.Vector3(-ship.x, ship.y, ship.z)
        ]);
        const stemMat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 });
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

    let starsOptions = '<optgroup label="Stars">';
    starsData.forEach(star => {
        starsOptions += `<option value="${star.name}">${star.name}</option>`;
    });
    starsOptions += '</optgroup>';

    let shipsOptions = '<optgroup label="Ships">';
    shipsData.forEach(ship => {
        shipsOptions += `<option value="${ship.name}">${ship.name}</option>`;
    });
    shipsOptions += '</optgroup>';

    searchSelect.innerHTML = '<option value="">-- Search --</option>' + starsOptions + shipsOptions;
    starASelect.innerHTML = '<option value="">-- Origin --</option>' + starsOptions + shipsOptions;
    starBSelect.innerHTML = '<option value="">-- Destination --</option>' + starsOptions + shipsOptions;
    shipSelect.innerHTML = '<option value="">-- Select Ship to Edit --</option>' + shipsOptions;
}

function createShip() {
    const nameInput = document.getElementById('new-ship-name');
    const name = nameInput.value.trim();
    if (!name) return;
    
    if (shipsData.find(s => s.name === name) || starsData.find(s => s.name === name)) {
        alert("Name already exists!");
        return;
    }
    
    shipsData.push({
        name: name,
        x: 0,
        y: 0,
        z: 0,
        description: "A newly commissioned ship."
    });
    
    saveShips();
    renderShips();
    refreshDropdowns();
    nameInput.value = '';
}

function deleteShip() {
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
    const shipName = document.getElementById('ship-select').value;
    if (!shipName) return;
    
    const ship = shipsData.find(s => s.name === shipName);
    if (!ship) return;
    
    ship.x = parseFloat(document.getElementById('ship-x').value) || 0;
    ship.y = parseFloat(document.getElementById('ship-y').value) || 0;
    ship.z = parseFloat(document.getElementById('ship-z').value) || 0;
    
    updateShipMesh(ship);
    saveShips();
}

function updateShipMesh(ship) {
    const mesh = sceneObjects[ship.name];
    if (mesh) {
        mesh.position.set(-ship.x, ship.y, ship.z);
        if (mesh.userData.stem) {
            const newStemGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-ship.x, ship.y, 0),
                new THREE.Vector3(-ship.x, ship.y, ship.z)
            ]);
            mesh.userData.stem.geometry.dispose();
            mesh.userData.stem.geometry = newStemGeom;
        }
        
        if (infoPanel.style.display !== 'none' && infoName.textContent === ship.name) {
            infoCoords.textContent = `X:${ship.x.toFixed(2)}, Y:${ship.y.toFixed(2)}, Z:${ship.z.toFixed(2)}`;
        }
    }
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
    infoName.textContent = data.name;
    infoType.textContent = userData.type;
    infoClass.textContent = data.class || "N/A";
    infoCoords.textContent = `X:${data.x.toFixed(2) || data.x}, Y:${data.y.toFixed(2) || data.y}, Z:${data.z.toFixed(2) || data.z}`;
    
    // Support HTML content inside the description
    infoDesc.innerHTML = data.description || "No description available.";
    
    infoPanel.style.display = 'block';
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

function calculateDistance() {
    const nameA = document.getElementById('star-a').value;
    const nameB = document.getElementById('star-b').value;
    const resDiv = document.getElementById('distance-result');
    const travelUi = document.getElementById('travel-ui');

    if (!nameA || !nameB) {
        resDiv.style.display = 'block';
        resDiv.innerHTML = "Please select two points.";
        travelUi.style.display = 'none';
        currentRoute = null;
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
        resDiv.innerHTML = `Distance from <strong>${starA.name}</strong> to <strong>${starB.name}</strong> is <strong>${distance.toFixed(2)} LY</strong>.`;
        
        const originIsShip = shipsData.some(s => s.name === starA.name);

        if (originIsShip) {
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
    if (!currentRoute) return;
    
    const travelDist = parseFloat(document.getElementById('travel-distance').value);
    
    if (isNaN(travelDist)) {
        alert("Please enter a valid travel distance.");
        return;
    }
    
    const ship = currentRoute.ship;
    
    // Normalize vector
    const nx = currentRoute.vector.x / currentRoute.distance;
    const ny = currentRoute.vector.y / currentRoute.distance;
    const nz = currentRoute.vector.z / currentRoute.distance;
    
    // Calculate new position from current position
    ship.x = ship.x + (nx * travelDist);
    ship.y = ship.y + (ny * travelDist);
    ship.z = ship.z + (nz * travelDist);
    
    updateShipMesh(ship);
    saveShips();
    
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
    
    // Pre-fill input with remaining distance
    document.getElementById('travel-distance').value = currentRoute.distance.toFixed(2);
    
    alert(`${ship.name} traveled ${travelDist} LY toward ${currentRoute.target.name}!`);
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
        if(mesh.userData.type === 'Ship') {
            mesh.rotation.y += 0.02;
            mesh.rotation.x += 0.01;
        }
    });

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
