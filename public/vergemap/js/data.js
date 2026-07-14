import { store } from './store.js';

export const state = store.state;
export const saveStars = () => store.saveStars();
export const saveShips = () => store.saveShips();
export const saveLogs = () => store.saveLogs();
export const saveTokens = () => store.saveTokens();
