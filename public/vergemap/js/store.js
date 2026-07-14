export const store = {
    state: {
        stars: [],
        ships: [],
        sceneObjects: {},
        logs: [],
        tokens: [],
        hexDict: { factions: {}, features: {} },
        currentLayer: 'GALAXY', // GALAXY or SYSTEM
        currentSystemFocus: null,
        currentMode: 'player', // 'player' or 'gm'
        currentSessionId: null,
    },
    
    // Mutations
    setLayer(layer) { this.state.currentLayer = layer; },
    setSystemFocus(focus) { this.state.currentSystemFocus = focus; },
    setMode(mode) { this.state.currentMode = mode; },
    setSessionId(id) { this.state.currentSessionId = id; },
    
    // Persistence
    saveStars() { localStorage.setItem('vergeMapStars', JSON.stringify(this.state.stars)); },
    saveShips() { localStorage.setItem('vergeMapShips', JSON.stringify(this.state.ships)); },
    saveLogs() { localStorage.setItem('vergeMapLogs', JSON.stringify(this.state.logs)); },
    saveTokens() { localStorage.setItem('vergeMapTokens', JSON.stringify(this.state.tokens)); },
    saveHexDict() { localStorage.setItem('vergeMapHexDict', JSON.stringify(this.state.hexDict)); }
};
