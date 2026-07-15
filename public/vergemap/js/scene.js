export * from './renderer/core.js';
export * from './renderer/scene.js';
export * from './interactions/raycaster.js';

import { initCore, onWindowResize } from './renderer/core.js';
import { onPointerDown } from './interactions/raycaster.js';
import { initGeometries, exitSystem, renderSystem, activeSystemView } from './renderer/scene.js';
import { store } from './store.js';
import { uiCtx } from './ui.js';
import { updateBackendSession } from './api.js';
import { saveStars } from './data.js';

export function initScene(container) {
    initCore(container, (e) => onPointerDown(e, activeSystemView));
    initGeometries();

    document.getElementById('back-to-galaxy-btn').addEventListener('click', exitSystem);

    document.getElementById('floating-system-tools').addEventListener('click', () => {
        document.getElementById('system-tools-modal').style.display = 'flex';
    });

    document.getElementById('close-system-tools-btn').addEventListener('click', () => {
        document.getElementById('system-tools-modal').style.display = 'none';
    });

    document.getElementById('regenerate-system-btn').addEventListener('click', () => {
        if (store.state.currentSystemFocus && uiCtx.getCurrentMode() === 'gm') {
            store.state.currentSystemFocus.systemSeed = Math.random().toString(36).substring(2, 15);
            delete store.state.currentSystemFocus.planets;
            delete store.state.currentSystemFocus._triedFetch;
            renderSystem();
            saveStars();
            
            const currentSessionId = uiCtx.getCurrentSessionId();
            const mqttClient = uiCtx.getMqttClient();
            if (currentSessionId) updateBackendSession(currentSessionId, store.state.ships);
            if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(store.state.currentSystemFocus));
            
            document.getElementById('system-tools-modal').style.display = 'none';
        }
    });

    document.getElementById('reset-system-default-btn').addEventListener('click', () => {
        if (store.state.currentSystemFocus && uiCtx.getCurrentMode() === 'gm') {
            delete store.state.currentSystemFocus.systemSeed;
            delete store.state.currentSystemFocus.planets;
            delete store.state.currentSystemFocus._triedFetch;
            renderSystem();
            saveStars();
            
            const currentSessionId = uiCtx.getCurrentSessionId();
            const mqttClient = uiCtx.getMqttClient();
            if (currentSessionId) updateBackendSession(currentSessionId, store.state.ships);
            if (mqttClient) mqttClient.publish(`vergemap/sessions/${currentSessionId}`, JSON.stringify(store.state.currentSystemFocus));
            
            document.getElementById('system-tools-modal').style.display = 'none';
        }
    });
}
