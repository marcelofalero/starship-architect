export const state = {
    stars: [],
    ships: [],
    sceneObjects: {},
    logs: [],
    tokens: []
};

export function saveStars() {
    localStorage.setItem('vergeMapStars', JSON.stringify(state.stars));
}

export function saveShips() {
    localStorage.setItem('vergeMapShips', JSON.stringify(state.ships));
}

export function saveLogs() {
    localStorage.setItem('vergeMapLogs', JSON.stringify(state.logs));
}

export function saveTokens() {
    localStorage.setItem('vergeMapTokens', JSON.stringify(state.tokens));
}
