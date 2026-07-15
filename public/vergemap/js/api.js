// API and Session Synchronization Module

export let currentSessionId = null;
export let currentMode = 'ro';
export let sessionToken = null;
export let savedSessionTokens = null;
export let mqttClient = null;

export function setCurrentSessionId(val) { currentSessionId = val; }
export function setCurrentMode(val) { currentMode = val; }
export function setSessionToken(val) { sessionToken = val; }
export function setSavedSessionTokens(val) { savedSessionTokens = val; }
export function setMqttClient(val) { mqttClient = val; }

export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' // Local NGINX proxy handles API requests
    : (window.location.hostname === 'starship.dimble.net' || window.location.hostname === 'starship-architect.pages.dev')
        ? 'https://sa-backend.mafalero.workers.dev'
        : 'https://sa-backend-dev.mafalero.workers.dev';

export function decodeToken(token) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export function parseSessionFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let sessionParam = urlParams.get('session');
    
    // Read from sessionStorage if not in URL
    if (!sessionParam) {
        sessionParam = sessionStorage.getItem('vergeMapSessionToken');
    }
    
    try {
        const cached = sessionStorage.getItem('vergeMapSessionTokens');
        if (cached) savedSessionTokens = JSON.parse(cached);
    } catch (e) {}
    
    if (sessionParam) {
        const decoded = decodeToken(sessionParam);
        if (decoded && decoded.session_id && decoded.role) {
            currentSessionId = decoded.session_id;
            currentMode = decoded.role;
            sessionToken = sessionParam;
            // Persist valid token to session storage
            sessionStorage.setItem('vergeMapSessionToken', sessionToken);
        } else {
            // Any non-valid JWT should be ignored completely, triggering new session creation
            currentSessionId = null;
            currentMode = 'gm';
            sessionToken = null;
            sessionStorage.removeItem('vergeMapSessionToken');
        }
    } else {
        // If no session in URL, default to 'gm' mode for local/new setup
        currentMode = 'gm';
        sessionToken = null;
    }
}

// POST /sessions — no auth required; backend returns { id, tokens: { gm, player, viewer } }
export async function createBackendSession(ships, stars, logs, tokens, requestedId = null) {
    try {
        const res = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: requestedId || '',
                name: 'Verge Map Session',
                data: { ships: ships, stars: stars, logs: logs, tokens: tokens }
            })
        });
        if (!res.ok) {
            console.error("Create session failed:", res.status, await res.text());
            return null;
        }
        return await res.json(); // { id, tokens: { gm, player, viewer } }
    } catch(e) {
        console.error("Create session failed", e);
        return null;
    }
}

// GET /sessions/:id — requires token if role-restricted
export async function fetchBackendSession(id) {
    try {
        const headers = {};
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        const res = await fetch(`${API_BASE}/sessions/${id}`, {
            cache: 'no-store',
            headers: headers
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data; // returns { ships, stars, logs, tokens }
    } catch (e) {
        console.error("Fetch session failed", e);
        return null;
    }
}

// PUT /sessions/:id — requires GM token
export async function updateBackendSession(id, ships, stars, logs, tokens) {
    if (!sessionToken || !id) return;
    try {
        await fetch(`${API_BASE}/sessions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({
                name: 'Verge Map Session',
                visibility: 'public',
                data: { ships: ships, stars: stars, logs: logs, tokens: tokens }
            })
        });
    } catch(e) {
        console.error("Update session failed", e);
    }
}

// syncSession encapsulates local storage loading and creating/fetching backend session
export async function syncSession(fallbackShips, fallbackStars, fallbackLogs) {
    let needNewSession = !currentSessionId;
    if (currentSessionId) {
        const sessionData = await fetchBackendSession(currentSessionId);
        if (sessionData) {
            return {
                ships: sessionData.ships?.length > 0 ? sessionData.ships : fallbackShips,
                stars: sessionData.stars?.length > 0 ? sessionData.stars : fallbackStars,
                logs: sessionData.logs?.length > 0 ? sessionData.logs : fallbackLogs,
                tokens: sessionData.tokens || []
            };
        } else {
            // Token was valid but session not found — create a fresh one
            needNewSession = true;
            currentSessionId = null;
            sessionToken = null;
        }
    }

    if (needNewSession) {
        let ships = fallbackShips;
        const savedShips = localStorage.getItem('vergeMapShips');
        if (savedShips) {
            const parsed = JSON.parse(savedShips);
            if (parsed.length > 0) ships = parsed;
        }

        const activeGm = localStorage.getItem('activeGmSessionId');
        if (activeGm) {
            const terminate = confirm("A GM session is already active in another tab. Do you want to terminate it and start a new one here?");
            if (!terminate) {
                // If they say no, just run offline mode for this tab
                return { ships, stars: fallbackStars, logs: fallbackLogs, tokens: [] };
            }
        }

        const generatedId = crypto.randomUUID();
        const resData = await createBackendSession(ships, fallbackStars, fallbackLogs, [], generatedId);
        if (resData && resData.id && resData.tokens) {
            currentSessionId = resData.id;
            sessionToken = resData.tokens.gm;
            currentMode = 'gm';
            sessionStorage.setItem('vergeMapSessionToken', sessionToken);
            savedSessionTokens = resData.tokens;
            sessionStorage.setItem('vergeMapSessionTokens', JSON.stringify(resData.tokens));
            
            // Set singleton lock
            localStorage.setItem('activeGmSessionId', currentSessionId);

            const url = new URL(window.location);
            url.searchParams.set('session', resData.tokens.gm);
            url.searchParams.delete('mode');
            window.history.replaceState({}, '', url);

            return {
                ships: ships,
                stars: fallbackStars,
                logs: fallbackLogs,
                tokens: [],
                showShareTokens: resData.tokens
            };
        } else {
            console.error("Failed to create backend session — running offline.");
            return {
                ships: ships,
                stars: fallbackStars,
                logs: fallbackLogs,
                tokens: []
            };
        }
    }
}

// Real-time synchronization
export function setupMqttPubSub(sessionId, onMessageCallback) {
    if (typeof mqtt === 'undefined') {
        console.warn("MQTT library not loaded. Real-time sync disabled.");
        return;
    }

    const brokerUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `ws://${window.location.hostname}:9001`
        : `wss://broker.hivemq.com:8884/mqtt`;
        
    mqttClient = mqtt.connect(brokerUrl);
    
    mqttClient.on('connect', () => {
        console.log("Connected to real-time Pub/Sub");
        mqttClient.subscribe(`vergemap/sessions/${sessionId}`);
    });
    
    mqttClient.on('message', (topic, message) => {
        try {
            const remoteEntity = JSON.parse(message.toString());
            onMessageCallback(remoteEntity);
        } catch (e) {
            console.error("Failed to parse pub/sub message", e);
        }
    });
}

// Listen for cross-tab GM session terminations
window.addEventListener('storage', (e) => {
    if (e.key === 'activeGmSessionId' && currentMode === 'gm') {
        const newValue = e.newValue;
        // If the active GM session changed to something else, we were terminated
        if (newValue && newValue !== currentSessionId) {
            alert("Your GM session has been terminated because a new one was started in another tab.");
            sessionStorage.removeItem('vergeMapSessionToken');
            sessionStorage.removeItem('vergeMapSessionTokens');
            window.location.href = window.location.pathname; // Reload as disconnected/viewer
        }
    }
});
