import * as THREE from 'three';
import { store } from '../store.js';
import { camera } from '../renderer/core.js';
import { showInfoPanel } from '../ui.js';

export const raycaster = new THREE.Raycaster();
export const pointer = new THREE.Vector2();
export const interactiveObjects = [];

export function rebuildInteractiveObjects(activeSystemView) {
    interactiveObjects.length = 0;
    if (store.state.currentLayer === 'GALAXY') {
        Object.values(store.state.sceneObjects).forEach(mesh => {
            const hitbox = mesh.children.find(child => child.geometry && child.material && child.material.visible === false);
            interactiveObjects.push(hitbox || mesh);
        });
    } else if (store.state.currentLayer === 'SYSTEM' && activeSystemView && activeSystemView.userData.interactableMeshes) {
        activeSystemView.userData.interactableMeshes.forEach(mesh => {
            interactiveObjects.push(mesh);
        });
    }
}

export function onPointerDown(event, activeSystemView) {
    rebuildInteractiveObjects(activeSystemView);

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        const selectedMesh = intersects[0].object;
        showInfoPanel(selectedMesh.userData);
    } else if (store.state.currentLayer === 'SYSTEM') {
        import('../renderer/scene.js').then(module => {
            module.toggleSystemAnimation();
        });
    }
}
