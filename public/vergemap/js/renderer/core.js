import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { store } from '../store.js';

export let camera, renderer, labelRenderer, controls;
export let galaxyScene = new THREE.Scene();
export let systemScene = new THREE.Scene();
export let currentScene = galaxyScene;
export const clock = new THREE.Clock();

export function setScene(scene) {
    currentScene = scene;
}

export function initCore(container, onPointerDown) {
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
    
    const ambientLightSys = new THREE.AmbientLight(0x111133, 0.5);
    systemScene.add(ambientLightSys);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    camera.add(pointLight); 
    galaxyScene.add(camera);

    const gridHelper = new THREE.GridHelper(120, 48, 0x333333, 0x111111);
    gridHelper.rotation.x = Math.PI / 2; 
    galaxyScene.add(gridHelper);

    if (onPointerDown) {
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
    }
}

export function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}
