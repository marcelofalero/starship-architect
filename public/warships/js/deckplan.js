import { useShipStore } from './store.js';
import { getLocalizedName } from './i18n.js';

const { computed, ref, onMounted, onUnmounted, watch, nextTick } = Vue;

export const DeckPlanWrapper = {
    setup() {
        const store = useShipStore();
        
        if (!store.deckPlan) store.deckPlan = { decks: [] };
        
        const activeDeckId = ref(null);
        const activeSectionId = ref(null);
        const tools = ['select', 'floor', 'wall', 'door', 'elevator', 'stairs', 'ladder', 'tunnel', 'erase'];
        const activeTool = ref('select');
        const showMasterMap = ref(false);
        const masterMapZoom = ref(1.0);
        const masterMapPanX = ref(0);
        const masterMapPanY = ref(0);
        
        const isMasterMapPanning = ref(false);
        const masterMapPanStartX = ref(0);
        const masterMapPanStartY = ref(0);
        const masterMapStartPanX = ref(0);
        const masterMapStartPanY = ref(0);

        // Background image per deck
        const showBgSettings = ref(false);
        // Background is shared across all decks - stored on deckPlan root
        // Structure: { data, masterMap: { opacity, scale, offsetX, offsetY }, sectionEditor: { ... } }
        const activeDeckBg = computed(() => store.deckPlan?.background || null);
        // Returns the settings sub-object for the currently active view
        const activeBgSettings = computed(() => {
            if (!activeDeckBg.value) return null;
            // Migrate old flat format gracefully
            if (!activeDeckBg.value.masterMap) {
                const flat = activeDeckBg.value;
                store.deckPlan.background = {
                    data: flat.data,
                    opacity: flat.opacity ?? flat.masterMap?.opacity ?? 0.3,
                    masterMap: { scale: flat.scale ?? flat.masterMap?.scale ?? 5, offsetX: flat.offsetX ?? flat.masterMap?.offsetX ?? 0, offsetY: flat.offsetY ?? flat.masterMap?.offsetY ?? 0 },
                    sectionEditor: { scale: flat.sectionEditor?.scale ?? 10, offsetX: flat.sectionEditor?.offsetX ?? 0, offsetY: flat.sectionEditor?.offsetY ?? 0 }
                };
            }
            return showMasterMap.value ? activeDeckBg.value.masterMap : activeDeckBg.value.sectionEditor;
        });

        // Master map display options
        const showSectionLabels = ref(true);
        const glueSections = ref(false);

        const uploadDeckBackground = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 2000;
                    let w = img.width, h = img.height;
                    if (w > MAX || h > MAX) {
                        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                        else       { w = Math.round(w * MAX / h); h = MAX; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    store.deckPlan.background = {
                        data: canvas.toDataURL('image/jpeg', 0.85),
                        opacity: 0.3,
                        masterMap:     { scale: 5,  offsetX: 0, offsetY: 0 },
                        sectionEditor: { scale: 10, offsetX: 0, offsetY: 0 }
                    };
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        };

        const clearDeckBackground = () => {
            if (store.deckPlan) delete store.deckPlan.background;
        };

        const onMasterMapWheel = (e) => {
            if (e.deltaY < 0) {
                masterMapZoom.value = Math.min(3.0, masterMapZoom.value + 0.1);
            } else {
                masterMapZoom.value = Math.max(0.1, masterMapZoom.value - 0.1);
            }
        };

        const onMasterMapMouseDown = (e) => {
            if (e.button === 2) { // Right click
                isMasterMapPanning.value = true;
                masterMapPanStartX.value = e.clientX;
                masterMapPanStartY.value = e.clientY;
                masterMapStartPanX.value = masterMapPanX.value;
                masterMapStartPanY.value = masterMapPanY.value;
            }
        };

        const onMasterMapMouseMove = (e) => {
            if (isMasterMapPanning.value) {
                const dx = (e.clientX - masterMapPanStartX.value) / masterMapZoom.value;
                const dy = (e.clientY - masterMapPanStartY.value) / masterMapZoom.value;
                masterMapPanX.value = masterMapStartPanX.value + dx;
                masterMapPanY.value = masterMapStartPanY.value + dy;
            }
        };

        const onMasterMapMouseUp = (e) => {
            if (e.button === 2 || e.type === 'mouseleave') {
                isMasterMapPanning.value = false;
            }
        };

        const elementsTab = ref('systems');
        
        const history = ref([]);
        const redoHistory = ref([]);
        const selectedItemIds = ref([]);
        const clipboard = ref([]);
        const selectionBox = ref(null);
        
        // --- DRAG / DRAW STATE ---
        const interaction = ref({
            active: false,
            mode: null,
            startX: 0,
            startY: 0,
            originals: []
        });

        const getExpectedSections = () => {
            const size = store.chassis.size || '';
            const baseHull = store.chassis.baseHull || 0;
            let locations = [];
            if (size.startsWith('Small')) {
                locations = baseHull <= 20 ? ['Fore', 'Aft'] : ['Fore', 'Fore Center', 'Aft Center', 'Aft'];
            } else if (size.startsWith('Light')) {
                locations = ['Fore', 'Port', 'Fore Center', 'Starboard', 'Aft Center', 'Aft'];
            } else if (size.startsWith('Medium')) {
                locations = ['Fore', 'Fore Port', 'Fore Center', 'Fore Starboard', 'Aft Port', 'Aft Center', 'Aft Starboard', 'Aft'];
            } else if (size.startsWith('Heavy')) {
                locations = ['Fore', 'Fore Port', 'Fore Center', 'Fore Starboard', 'Center Fore', 'Port', 'Starboard', 'Center Aft', 'Aft Port', 'Aft Center', 'Aft Starboard', 'Aft'];
            } else if (size.startsWith('Super') || size.startsWith('Colossal')) {
                locations = ['Fore', 'Far Fore Port', 'Far Fore Center', 'Far Fore Starboard', 'Fore Port', 'Fore Center', 'Fore Starboard', 'Center Fore', 'Port Center', 'Port', 'Starboard', 'Starboard Center', 'Center Aft', 'Aft Port', 'Aft Center', 'Aft Starboard', 'Far Aft Port', 'Far Aft Center', 'Far Aft Starboard', 'Aft'];
            }
            return locations;
        };

        const initSection = (loc) => ({
            id: loc,
            name: loc,
            width: 30,
            height: 20,
            items: []
        });

        const sanitizeDeckPlanInstanceIds = () => {
            if (!store.deckPlan || !store.deckPlan.decks) return;

            // 1. Gather all unique instanceIds currently used in the entire deck plan
            const placedIds = new Set();
            store.deckPlan.decks.forEach(d => {
                d.sections.forEach(s => {
                    if (s.items) {
                        s.items.forEach(item => {
                            if (item.type === 'component' && item.instanceId) {
                                placedIds.add(item.instanceId);
                            }
                        });
                    }
                });
            });

            // 2. Iterate and fix duplicate or section-mismatched instanceIds
            const seenIds = new Set();
            store.deckPlan.decks.forEach(d => {
                d.sections.forEach(s => {
                    if (s.items) {
                        s.items.forEach(item => {
                            if (item.type === 'component' && item.instanceId) {
                                const matchedComp = store.installedComponents.find(c => c.instanceId === item.instanceId);
                                const isDuplicate = seenIds.has(item.instanceId);
                                const isSectionMismatch = matchedComp && matchedComp.location !== s.id;

                                if (isDuplicate || isSectionMismatch) {
                                    // Try to find a sibling instance of the same defId in this section s.id
                                    const defId = matchedComp ? matchedComp.defId : item.instanceId;
                                    const siblings = store.installedComponents.filter(c => c.defId === defId && c.location === s.id);
                                    // Find an unplaced sibling
                                    const unplaced = siblings.find(c => !placedIds.has(c.instanceId));
                                    if (unplaced) {
                                        if (isSectionMismatch && !isDuplicate) {
                                            placedIds.delete(item.instanceId);
                                        }
                                        item.instanceId = unplaced.instanceId;
                                        placedIds.add(unplaced.instanceId);
                                    }
                                }
                                seenIds.add(item.instanceId);
                            }
                        });
                    }
                });
            });
        };

        const syncDecks = () => {
            const expected = getExpectedSections();
            store.deckPlan.decks.forEach(d => {
                if (!d.sections) {
                    d.sections = [];
                    const foreSec = initSection('Fore');
                    d.sections.push(foreSec);
                    delete d.tiles;
                    delete d.items;
                    delete d.width;
                    delete d.height;
                }
                expected.forEach(loc => {
                    if (!d.sections.find(s => s.id === loc)) {
                        d.sections.push(initSection(loc));
                    }
                });
            });
            sanitizeDeckPlanInstanceIds();
        };

        syncDecks();
        watch(() => store.chassisId, syncDecks);
        watch(() => store.installedComponents, () => {
            sanitizeDeckPlanInstanceIds();
        }, { deep: true });

        const addDeck = () => {
            const newId = 'deck_' + Date.now();
            const expected = getExpectedSections();
            const newDeck = {
                id: newId,
                name: `Floor ${store.deckPlan.decks.length + 1}`,
                sections: expected.map(loc => initSection(loc))
            };
            store.deckPlan.decks.push(newDeck);
            activeDeckId.value = newId;
            if (!activeSectionId.value) {
                activeSectionId.value = expected[0];
            }
        };

        const removeDeck = () => {
            if (store.deckPlan.decks.length <= 1) return;
            if (!confirm('Are you sure you want to completely delete this floor and all its contents?')) return;
            
            const idx = activeDeckIndex.value;
            store.deckPlan.decks.splice(idx, 1);
            
            const newIdx = Math.max(0, idx - 1);
            activeDeckId.value = store.deckPlan.decks[newIdx].id;
            activeSectionId.value = store.deckPlan.decks[newIdx].sections[0]?.id;
            
            history.value = [];
        };

        if (store.deckPlan.decks.length === 0) {
            addDeck();
        } else if (!activeDeckId.value) {
            const lastDeck = store.deckPlan.decks.find(d => d.id === store.deckPlan.lastDeckId);
            if (lastDeck) {
                activeDeckId.value = lastDeck.id;
                const lastSec = lastDeck.sections.find(s => s.id === store.deckPlan.lastSectionId);
                activeSectionId.value = lastSec ? lastSec.id : lastDeck.sections[0]?.id;
            } else {
                activeDeckId.value = store.deckPlan.decks[0].id;
                activeSectionId.value = store.deckPlan.decks[0].sections[0]?.id;
            }
        }
        
        watch(activeDeckId, (val) => { store.deckPlan.lastDeckId = val; });
        watch(activeSectionId, (val) => { store.deckPlan.lastSectionId = val; });

        const activeDeckIndex = computed(() => {
            return store.deckPlan.decks.findIndex(d => d.id === activeDeckId.value);
        });

        const goDeckUp = () => {
            const idx = activeDeckIndex.value;
            if (idx < store.deckPlan.decks.length - 1) {
                activeDeckId.value = store.deckPlan.decks[idx + 1].id;
            }
        };

        const goDeckDown = () => {
            const idx = activeDeckIndex.value;
            if (idx > 0) {
                activeDeckId.value = store.deckPlan.decks[idx - 1].id;
            }
        };

        const moveDeckUp = () => {
            const idx = activeDeckIndex.value;
            if (idx < store.deckPlan.decks.length - 1) {
                const currentDeck = store.deckPlan.decks[idx];
                const targetDeck = store.deckPlan.decks[idx + 1];
                
                const curSecIdx = currentDeck.sections.findIndex(s => s.id === activeSectionId.value);
                const tgtSecIdx = targetDeck.sections.findIndex(s => s.id === activeSectionId.value);
                
                if (curSecIdx !== -1 && tgtSecIdx !== -1) {
                    const temp = currentDeck.sections[curSecIdx];
                    currentDeck.sections[curSecIdx] = targetDeck.sections[tgtSecIdx];
                    targetDeck.sections[tgtSecIdx] = temp;
                    
                    deckWidth.value = currentDeck.sections[curSecIdx].width;
                    deckHeight.value = currentDeck.sections[curSecIdx].height;
                    selectedItemIds.value = [];
                    selectionBox.value = null;
                }
            }
        };

        const moveDeckDown = () => {
            const idx = activeDeckIndex.value;
            if (idx > 0) {
                const currentDeck = store.deckPlan.decks[idx];
                const targetDeck = store.deckPlan.decks[idx - 1];
                
                const curSecIdx = currentDeck.sections.findIndex(s => s.id === activeSectionId.value);
                const tgtSecIdx = targetDeck.sections.findIndex(s => s.id === activeSectionId.value);
                
                if (curSecIdx !== -1 && tgtSecIdx !== -1) {
                    const temp = currentDeck.sections[curSecIdx];
                    currentDeck.sections[curSecIdx] = targetDeck.sections[tgtSecIdx];
                    targetDeck.sections[tgtSecIdx] = temp;
                    
                    deckWidth.value = currentDeck.sections[curSecIdx].width;
                    deckHeight.value = currentDeck.sections[curSecIdx].height;
                    selectedItemIds.value = [];
                    selectionBox.value = null;
                }
            }
        };

        const activeDeck = computed(() => {
            return store.deckPlan.decks.find(d => d.id === activeDeckId.value) || store.deckPlan.decks[0];
        });
        
        const activeSection = computed(() => {
            if (!activeDeck.value) return null;
            return activeDeck.value.sections.find(s => s.id === activeSectionId.value) || activeDeck.value.sections[0];
        });

        const deckWidth = ref(30);
        const deckHeight = ref(20);

        watch(activeSection, (newSec) => {
            if (newSec) {
                deckWidth.value = newSec.width;
                deckHeight.value = newSec.height;
                selectedItemIds.value = [];
                selectionBox.value = null;
            }
        }, { immediate: true });
        
        watch(showMasterMap, (newVal) => {
            if (newVal) {
                nextTick(() => {
                    const container = document.getElementById('master-map-container');
                    const activeCell = document.getElementById('master-map-cell-' + activeSectionId.value);
                    if (container && activeCell) {
                        // Reset pan/zoom to ensure accurate native layout measurements
                        masterMapPanX.value = 0;
                        masterMapPanY.value = 0;
                        masterMapZoom.value = 1.0;
                        
                        nextTick(() => {
                            const cRect = container.getBoundingClientRect();
                            const aRect = activeCell.getBoundingClientRect();
                            
                            // Target center of the viewport
                            const cCenterX = cRect.left + (cRect.width / 2);
                            const cCenterY = cRect.top + (cRect.height / 2);
                            
                            // Current center of the target cell
                            const aCenterX = aRect.left + (aRect.width / 2);
                            const aCenterY = aRect.top + (aRect.height / 2);
                            
                            // Shift the map by the difference
                            masterMapPanX.value = cCenterX - aCenterX;
                            masterMapPanY.value = cCenterY - aCenterY;
                        });
                    }
                });
            }
        });

        const activeSectionName = computed({
            get: () => {
                if (!activeSection.value) return '';
                if (activeSection.value.name) return activeSection.value.name;
                if (activeDeck.value && activeDeck.value.name) return activeDeck.value.name;
                return `Deck ${activeDeckIndex.value + 1}`;
            },
            set: (val) => {
                if (activeSection.value) {
                    saveHistory();
                    activeSection.value.name = val;
                }
            }
        });

        const saveHistory = () => {
            if (!activeSection.value || !activeDeck.value) return;
            history.value.push({
                deckId: activeDeck.value.id,
                sectionId: activeSection.value.id,
                items: JSON.parse(JSON.stringify(activeSection.value.items))
            });
            if (history.value.length > 50) history.value.shift();
            redoHistory.value = [];
        };

        const undo = () => {
            if (history.value.length === 0) return;
            if (activeSection.value && activeDeck.value) {
                redoHistory.value.push({
                    deckId: activeDeck.value.id,
                    sectionId: activeSection.value.id,
                    items: JSON.parse(JSON.stringify(activeSection.value.items))
                });
            }
            const lastState = history.value.pop();
            const d = store.deckPlan.decks.find(deck => deck.id === lastState.deckId);
            if (d) {
                const s = d.sections.find(sec => sec.id === lastState.sectionId);
                if (s) {
                    s.items = lastState.items;
                    if (activeDeckId.value !== d.id) activeDeckId.value = d.id;
                    if (activeSectionId.value !== s.id) activeSectionId.value = s.id;
                    selectedItemIds.value = [];
                }
            }
        };

        const redo = () => {
            if (redoHistory.value.length === 0) return;
            if (activeSection.value && activeDeck.value) {
                history.value.push({
                    deckId: activeDeck.value.id,
                    sectionId: activeSection.value.id,
                    items: JSON.parse(JSON.stringify(activeSection.value.items))
                });
            }
            const nextState = redoHistory.value.pop();
            const d = store.deckPlan.decks.find(deck => deck.id === nextState.deckId);
            if (d) {
                const s = d.sections.find(sec => sec.id === nextState.sectionId);
                if (s) {
                    s.items = nextState.items;
                    if (activeDeckId.value !== d.id) activeDeckId.value = d.id;
                    if (activeSectionId.value !== s.id) activeSectionId.value = s.id;
                    selectedItemIds.value = [];
                }
            }
        };

        const rotateItem = () => {
            if (!activeSection.value || selectedItemIds.value.length === 0) return;
            saveHistory();
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) {
                    if (item.type === 'wall_thin_h') {
                        item.type = 'wall_thin_v';
                    } else if (item.type === 'wall_thin_v') {
                        item.type = 'wall_thin_h';
                    } else {
                        if (item.rotation === undefined) item.rotation = 0;
                        else if (item.rotation === 0) item.rotation = 90;
                        else if (item.rotation === 90) item.rotation = 180;
                        else if (item.rotation === 180) item.rotation = 270;
                        else delete item.rotation;
                    }
                }
            });
        };

        const setVDir = (dir) => {
            if (selectedItemIds.value.length === 0) return;
            saveHistory();
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) item.vDir = dir;
            });
        };

        const changeTextSize = (delta) => {
            if (selectedItemIds.value.length === 0) return;
            saveHistory();
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) {
                    const currentSize = item.textSize || 10;
                    item.textSize = Math.max(4, currentSize + delta);
                }
            });
        };

        const rotateText = () => {
            if (selectedItemIds.value.length === 0) return;
            saveHistory();
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) {
                    item.textRot = item.textRot === -90 ? 0 : -90;
                }
            });
        };

        const handleKeydown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                redo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedItemIds.value.length > 0 && activeSection.value) {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    saveHistory();
                    activeSection.value.items = activeSection.value.items.filter(i => !selectedItemIds.value.includes(i.id));
                    selectedItemIds.value = [];
                }
            } else if (e.key.toLowerCase() === 'f') {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                rotateItem();
            }
        };

        onMounted(() => { window.addEventListener('keydown', handleKeydown); });
        onUnmounted(() => { window.removeEventListener('keydown', handleKeydown); });

        const updateDeckSize = () => {
            if (!activeSection.value) return;
            const s = activeSection.value;
            let newW = parseInt(deckWidth.value);
            let newH = parseInt(deckHeight.value);
            if (isNaN(newW) || newW < 5) newW = 5;
            if (isNaN(newH) || newH < 5) newH = 5;
            if (newW > 200) newW = 200;
            if (newH > 200) newH = 200;
            
            deckWidth.value = newW;
            deckHeight.value = newH;
            
            if (s.width === newW && s.height === newH) return;
            
            saveHistory();
            s.width = newW;
            s.height = newH;
            
            s.items = s.items.filter(item => {
                if (item.x >= newW || item.y >= newH) return false;
                if (item.x + item.w > newW) item.w = newW - item.x;
                if (item.y + item.h > newH) item.h = newH - item.y;
                return item.w > 0 && item.h > 0;
            });
        };

        // --- CLIPBOARD & MIRRORING ---
        const copySection = () => {
            if (!activeSection.value) return;
            let targetItems = activeSection.value.items;
            if (selectedItemIds.value.length > 0) {
                targetItems = activeSection.value.items.filter(i => selectedItemIds.value.includes(i.id));
            }
            clipboard.value = JSON.parse(JSON.stringify(targetItems));
        };

        const clearSection = () => {
            if (!activeSection.value) return;
            if (!confirm('Are you sure you want to clear all structural items from this section? Components will remain.')) return;
            saveHistory();
            activeSection.value.items = activeSection.value.items.filter(i => i.type === 'component');
        };

        const pasteSection = () => {
            if (!activeSection.value || clipboard.value.length === 0) return;
            saveHistory();
            
            const secW = activeSection.value.width;
            const secH = activeSection.value.height;
            
            const newItems = clipboard.value.map(item => {
                const cloned = JSON.parse(JSON.stringify(item));
                cloned.id = 'obj_' + Date.now() + Math.random().toString(36).substr(2, 9);
                
                cloned.x = Math.max(0, Math.min(cloned.x, secW - cloned.w));
                cloned.y = Math.max(0, Math.min(cloned.y, secH - cloned.h));
                
                return cloned;
            });
            
            activeSection.value.items.push(...newItems);
        };

        const flipX = () => {
            if (!activeSection.value) return;
            saveHistory();
            const secW = activeSection.value.width;
            const targetIds = selectedItemIds.value.length > 0 ? selectedItemIds.value : activeSection.value.items.map(i => i.id);
            
            targetIds.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) item.x = secW - item.w - item.x;
            });
        };

        const flipY = () => {
            if (!activeSection.value) return;
            saveHistory();
            const secH = activeSection.value.height;
            const targetIds = selectedItemIds.value.length > 0 ? selectedItemIds.value : activeSection.value.items.map(i => i.id);
            
            targetIds.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) item.y = secH - item.h - item.y;
            });
        };

        const getDefaultZ = (type) => {
            if (type === 'component') return 10;
            if (type === 'floor') return 1;
            return 5;
        };

        const bringToFront = () => {
            if (!activeSection.value || selectedItemIds.value.length === 0) return;
            saveHistory();
            const maxZ = Math.max(10, ...activeSection.value.items.map(i => i.z !== undefined ? i.z : getDefaultZ(i.type)));
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                // force reactivity assignment
                if (item) Object.assign(item, { z: maxZ + 1 });
            });
            const selected = activeSection.value.items.filter(i => selectedItemIds.value.includes(i.id));
            const unselected = activeSection.value.items.filter(i => !selectedItemIds.value.includes(i.id));
            activeSection.value.items.splice(0, activeSection.value.items.length, ...unselected, ...selected);
        };

        const sendToBack = () => {
            if (!activeSection.value || selectedItemIds.value.length === 0) return;
            saveHistory();
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                // force reactivity assignment
                if (item) Object.assign(item, { z: 1 });
            });
            const selected = activeSection.value.items.filter(i => selectedItemIds.value.includes(i.id));
            const unselected = activeSection.value.items.filter(i => !selectedItemIds.value.includes(i.id));
            activeSection.value.items.splice(0, activeSection.value.items.length, ...selected, ...unselected);
        };

        const getGridCoords = (e) => {
            const gridEl = document.getElementById('deck-grid-canvas');
            if (!gridEl) return { x: 0, y: 0 };
            const rect = gridEl.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / 30);
            const y = Math.floor((e.clientY - rect.top) / 30);
            return { x, y };
        };

        const onGridMouseDown = (e) => {
            if (e.button === 2) {
                activeTool.value = 'select';
                return;
            }
            if (!activeSection.value || activeTool.value === 'erase') return;
            const { x, y } = getGridCoords(e);
            
            const isStructuralTool = ['floor', 'wall', 'wall_thin_h', 'wall_thin_v', 'door', 'elevator', 'stairs', 'ladder', 'tunnel'].includes(activeTool.value);
            const isAmenityTool = amenities.some(a => a.value === activeTool.value);
            
            if (isStructuralTool || isAmenityTool) {
                saveHistory();
                const newItem = {
                    id: 'obj_' + Date.now() + Math.random().toString(36).substr(2, 9),
                    type: activeTool.value,
                    x, y, w: 1, h: 1
                };
                activeSection.value.items.push(newItem);
                selectedItemIds.value = [newItem.id];
                interaction.value = {
                    active: true,
                    mode: 'draw',
                    startX: x,
                    startY: y,
                    originals: [{ id: newItem.id, origX: x, origY: y, origW: 1, origH: 1 }]
                };
            }
            else if (activeTool.value === 'select') {
                let clickedItem = null;
                
                // If Shift is pressed, skip item hit-testing to force a Marquee selection box
                if (!isShiftPressed.value) {
                    for (let i = activeSection.value.items.length - 1; i >= 0; i--) {
                        const item = activeSection.value.items[i];
                        if (item.hidden) continue;
                        if (x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h) {
                            clickedItem = item;
                            break;
                        }
                    }
                }
                
                if (clickedItem) {
                    if (e.ctrlKey || e.metaKey) {
                        if (selectedItemIds.value.includes(clickedItem.id)) {
                            selectedItemIds.value = selectedItemIds.value.filter(id => id !== clickedItem.id);
                        } else {
                            selectedItemIds.value.push(clickedItem.id);
                        }
                    } else if (!selectedItemIds.value.includes(clickedItem.id)) {
                        selectedItemIds.value = [clickedItem.id];
                    }
                    
                    const originals = selectedItemIds.value.map(id => {
                        const it = activeSection.value.items.find(i => i.id === id);
                        return { id: it.id, origX: it.x, origY: it.y, origW: it.w, origH: it.h };
                    });
                    
                    interaction.value = {
                        active: true,
                        mode: 'move',
                        startX: x,
                        startY: y,
                        originals
                    };
                } else {
                    if (!isShiftPressed.value) selectedItemIds.value = [];
                    interaction.value = {
                        active: true,
                        mode: 'marquee',
                        startX: x,
                        startY: y,
                        originals: []
                    };
                    selectionBox.value = { x, y, w: 1, h: 1 };
                }
            }
        };
        
        const onResizeMouseDown = (e, item, edge = 'se') => {
            e.stopPropagation();
            if (activeTool.value !== 'select' || item.hidden) return;
            if (!selectedItemIds.value.includes(item.id)) selectedItemIds.value = [item.id];
            const gridEl = document.getElementById('deck-grid-canvas');
            if (!gridEl) return;
            const gridRect = gridEl.getBoundingClientRect();
            const x = Math.floor((e.clientX - gridRect.left) / 30);
            const y = Math.floor((e.clientY - gridRect.top) / 30);
            
            interaction.value = {
                active: true,
                mode: 'resize',
                edge: edge,
                startX: x,
                startY: y,
                originals: [{ id: item.id, origX: item.x, origY: item.y, origW: item.w, origH: item.h }]
            };
        };

        const onGridMouseMove = (e) => {
            if (!interaction.value.active || !activeSection.value) return;
            const { x, y } = getGridCoords(e);

            if (interaction.value.mode === 'draw') {
                const orig = interaction.value.originals[0];
                const item = activeSection.value.items.find(i => i.id === orig.id);
                if (!item || item.hidden) return;

                let newX = Math.min(orig.origX, x);
                let newY = Math.min(orig.origY, y);
                let newW = Math.abs(x - orig.origX) + 1;
                let newH = Math.abs(y - orig.origY) + 1;

                item.x = Math.max(0, Math.min(newX, activeSection.value.width - newW));
                item.y = Math.max(0, Math.min(newY, activeSection.value.height - newH));
                item.w = newW;
                item.h = newH;
            } 
            else if (interaction.value.mode === 'resize') {
                const orig = interaction.value.originals[0];
                const item = activeSection.value.items.find(i => i.id === orig.id);
                if (!item || item.hidden) return;

                const edge = interaction.value.edge || 'se';
                let newX = orig.origX;
                let newY = orig.origY;
                let newW = orig.origW;
                let newH = orig.origH;

                if (edge.includes('e')) {
                    newW = Math.min(Math.max(1, x - orig.origX + 1), activeSection.value.width - orig.origX);
                }
                if (edge.includes('s')) {
                    newH = Math.min(Math.max(1, y - orig.origY + 1), activeSection.value.height - orig.origY);
                }
                if (edge.includes('w')) {
                    const targetX = Math.max(0, x);
                    const moveX = Math.min(targetX - orig.origX, orig.origW - 1);
                    newX = orig.origX + moveX;
                    newW = orig.origW - moveX;
                }
                if (edge.includes('n')) {
                    const targetY = Math.max(0, y);
                    const moveY = Math.min(targetY - orig.origY, orig.origH - 1);
                    newY = orig.origY + moveY;
                    newH = orig.origH - moveY;
                }

                item.x = newX;
                item.y = newY;
                item.w = newW;
                item.h = newH;
            }
            else if (interaction.value.mode === 'move') {
                const dx = x - interaction.value.startX;
                const dy = y - interaction.value.startY;
                
                interaction.value.originals.forEach(orig => {
                    const item = activeSection.value.items.find(i => i.id === orig.id);
                    if (item && !item.hidden) {
                        item.x = Math.max(0, Math.min(orig.origX + dx, activeSection.value.width - item.w));
                        item.y = Math.max(0, Math.min(orig.origY + dy, activeSection.value.height - item.h));
                    }
                });
            }
            else if (interaction.value.mode === 'marquee') {
                let newX = Math.min(interaction.value.startX, x);
                let newY = Math.min(interaction.value.startY, y);
                let newW = Math.abs(x - interaction.value.startX) + 1;
                let newH = Math.abs(y - interaction.value.startY) + 1;
                selectionBox.value = { x: newX, y: newY, w: newW, h: newH };
            }
        };

        const onGridMouseUp = (e) => {
            if (!interaction.value.active) return;
            
            if (interaction.value.mode === 'marquee' && selectionBox.value) {
                const box = selectionBox.value;
                const selected = activeSection.value.items.filter(item => {
                    if (item.hidden) return false;
                    return !(item.x >= box.x + box.w || 
                             item.x + item.w <= box.x || 
                             item.y >= box.y + box.h || 
                             item.y + item.h <= box.y);
                });
                const newIds = selected.map(i => i.id);
                if (e && (e.ctrlKey || e.metaKey || e.shiftKey || isShiftPressed.value)) {
                    selectedItemIds.value = Array.from(new Set([...selectedItemIds.value, ...newIds]));
                } else {
                    selectedItemIds.value = newIds;
                }
                selectionBox.value = null;
            }
            
            interaction.value.active = false;
        };

        const onItemClick = (e, item) => {
            if (item.hidden) return;
            if (activeTool.value === 'erase') {
                saveHistory();
                activeSection.value.items = activeSection.value.items.filter(i => i.id !== item.id);
            }
        };

        const sectionComponents = computed(() => {
            if (!activeSectionId.value) return [];
            const comps = store.installedComponents.filter(c => 
                c.location === activeSectionId.value && 
                c.location !== 'Distributed'
            );
            const groups = {};
            comps.forEach(c => {
                if (!groups[c.defId]) {
                    groups[c.defId] = {
                        instanceId: c.instanceId,
                        sample: c,
                        count: 0
                    };
                }
                const qty = c.modifications?.quantity || 1;
                groups[c.defId].count += qty;
            });
            return Object.values(groups);
        });

        const sortedSectionItems = computed(() => {
            if (!activeSection.value) return [];
            return [...activeSection.value.items].sort((a, b) => {
                const za = a.z !== undefined ? a.z : getDefaultZ(a.type);
                const zb = b.z !== undefined ? b.z : getDefaultZ(b.type);
                return zb - za; 
            });
        });

        const toggleVisibility = (item) => {
            saveHistory();
            item.hidden = !item.hidden;
            if (item.hidden && selectedItemIds.value.includes(item.id)) {
                selectedItemIds.value = selectedItemIds.value.filter(id => id !== item.id);
            }
        };

        const getName = (instance) => {
            if (!instance) return 'Missing Component';
            const id = instance.defId || instance;
            const def = store.allEquipment.find(e => e.id === id);
            let name = def ? (getLocalizedName(def) || def.id) : (id || 'Unknown');
            
            if (instance?.modifications?.customSuffix) {
                name = `${name} ${instance.modifications.customSuffix}`;
            }
            return name;
        };

        const startComponentDrag = (evt, comp) => {
            evt.dataTransfer.dropEffect = 'copy';
            evt.dataTransfer.effectAllowed = 'copy';
            evt.dataTransfer.setData('instanceId', comp.instanceId);
        };

        const onDropGrid = (evt) => {
            if (!activeSection.value) return;
            const instanceId = evt.dataTransfer.getData('instanceId');
            if (instanceId) {
                const { x, y } = getGridCoords(evt);
                saveHistory();
                
                let targetInstanceId = instanceId;
                const draggedComp = store.installedComponents.find(c => c.instanceId === instanceId);
                if (draggedComp) {
                    const siblings = store.installedComponents.filter(c => c.defId === draggedComp.defId && c.location === activeSectionId.value);
                    const placedIds = new Set();
                    store.deckPlan.decks.forEach(d => {
                        d.sections.forEach(s => {
                            if (s.items) {
                                s.items.forEach(item => {
                                    if (item.type === 'component') {
                                        placedIds.add(item.instanceId);
                                    }
                                });
                            }
                        });
                    });
                    const unplaced = siblings.find(c => !placedIds.has(c.instanceId));
                    if (unplaced) {
                        targetInstanceId = unplaced.instanceId;
                    }
                }
                
                const newItem = {
                    id: 'obj_' + Date.now() + Math.random().toString(36).substr(2, 9),
                    type: 'component',
                    instanceId: targetInstanceId,
                    x, y, w: 1, h: 1
                };
                activeSection.value.items.push(newItem);
                selectedItemIds.value = [newItem.id];
            }
        };

        const getItemStyle = (item, gridSize = 30) => {
            const type = item.type || item;
            
            if (type === 'wall_thin_h') {
                return {
                    position: 'absolute',
                    left: (item.x * gridSize) + 'px',
                    top: (item.y * gridSize - (gridSize * 0.1)) + 'px',
                    width: (item.w * gridSize) + 'px',
                    height: (gridSize * 0.2) + 'px',
                    border: selectedItemIds.value.includes(item.id) ? '2px solid yellow' : 'none',
                    boxSizing: 'border-box',
                    cursor: activeTool.value === 'erase' ? 'crosshair' : (activeTool.value === 'select' ? 'move' : 'default'),
                    zIndex: item.z !== undefined ? item.z : getDefaultZ(type),
                    backgroundColor: getItemColor(item),
                    display: item.hidden ? 'none' : 'block'
                };
            }
            if (type === 'wall_thin_v') {
                return {
                    position: 'absolute',
                    left: (item.x * gridSize - (gridSize * 0.1)) + 'px',
                    top: (item.y * gridSize) + 'px',
                    width: (gridSize * 0.2) + 'px',
                    height: (item.h * gridSize) + 'px',
                    border: selectedItemIds.value.includes(item.id) ? '2px solid yellow' : 'none',
                    boxSizing: 'border-box',
                    cursor: activeTool.value === 'erase' ? 'crosshair' : (activeTool.value === 'select' ? 'move' : 'default'),
                    zIndex: item.z !== undefined ? item.z : getDefaultZ(type),
                    backgroundColor: getItemColor(item),
                    display: item.hidden ? 'none' : 'block'
                };
            }
            
            return {
                position: 'absolute',
                left: (item.x * gridSize) + 'px',
                top: (item.y * gridSize) + 'px',
                width: (item.w * gridSize) + 'px',
                height: (item.h * gridSize) + 'px',
                border: selectedItemIds.value.includes(item.id) ? '2px solid yellow' : '1px solid rgba(255,255,255,0.2)',
                boxSizing: 'border-box',
                cursor: activeTool.value === 'erase' ? 'crosshair' : (activeTool.value === 'select' ? 'move' : 'default'),
                zIndex: item.z !== undefined ? item.z : getDefaultZ(item.type),
                backgroundColor: getItemColor(item),
                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.2) 1px, transparent 1px)',
                backgroundSize: gridSize + 'px ' + gridSize + 'px',
                backgroundPosition: '-1px -1px',
                display: item.hidden ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: '#fff',
                textShadow: '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000',
                fontSize: (item.textSize ? item.textSize * (gridSize / 30) : (gridSize === 30 ? 10 : 6)) + 'px',
                textAlign: 'center',
                userSelect: 'none'
            };
        };

        const amenities = [
            { value: 'mess_hall', label: 'Mess Hall', color: 'rgba(180, 80, 30, 1)', icon: 'restaurant' },
            { value: 'bar', label: 'Bar', color: 'rgba(150, 40, 150, 1)', icon: 'local_bar' },
            { value: 'conference_room', label: 'Conference Rm', color: 'rgba(40, 160, 180, 1)', icon: 'groups' },
            { value: 'entertainment_area', label: 'Entertainment', color: 'rgba(200, 50, 120, 1)', icon: 'sports_esports' },
            { value: 'gym', label: 'Gym', color: 'rgba(220, 100, 50, 1)', icon: 'fitness_center' },
            { value: 'weapon_locker', label: 'Weapon Locker', color: 'rgba(100, 110, 120, 1)', icon: 'lock' },
            { value: 'armor_locker', label: 'Armor Locker', color: 'rgba(80, 120, 140, 1)', icon: 'shield' },
            { value: 'internal_defense', label: 'Int. Defense', color: 'rgba(200, 40, 40, 1)', icon: 'gps_fixed', iconOnly: true },
            { value: 'camera', label: 'Camera', color: 'rgba(50, 180, 200, 1)', icon: 'videocam', iconOnly: true },
            { value: 'escape_pod_access', label: 'Escape Pod Access', color: 'rgba(200, 80, 40, 1)', icon: 'rocket_launch' },
            { value: 'art_piece', label: 'Art', color: 'rgba(120, 80, 200, 1)', icon: 'palette' },
            { value: 'lounge', label: 'Lounge', color: 'rgba(100, 150, 60, 1)', icon: 'weekend' },
            { value: 'washroom', label: 'Washroom', color: 'rgba(60, 130, 200, 1)', icon: 'wc' },
            { value: 'storage', label: 'Storage', color: 'rgba(100, 100, 100, 1)', icon: 'inventory_2' },
            { value: 'computer', label: 'Computer', color: 'rgba(0, 100, 200, 1)', icon: 'computer' },
            { value: 'terminal', label: 'Terminal', color: 'rgba(30, 140, 100, 1)', icon: 'terminal' }
        ];

        const activeColor = ref('rgba(255,255,255,1)');

        const applyColor = (val) => {
            if (!activeSection.value || selectedItemIds.value.length === 0) return;
            saveHistory();
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) item.color = activeColor.value;
            });
        };

        const clearColor = () => {
            if (!activeSection.value || selectedItemIds.value.length === 0) return;
            saveHistory();
            selectedItemIds.value.forEach(id => {
                const item = activeSection.value.items.find(i => i.id === id);
                if (item) delete item.color;
            });
        };

        const formatType = (itemOrType) => {
            if (!itemOrType) return '';
            const type = typeof itemOrType === 'string' ? itemOrType : (itemOrType.type || '');
            let baseLabel = type.replace(/_/g, ' ').toUpperCase();
            const amenity = amenities.find(a => a.value === type);
            if (amenity) baseLabel = amenity.label.toUpperCase();
            
            if (typeof itemOrType === 'object' && itemOrType.customLabel) {
                return `${baseLabel} ${itemOrType.customLabel}`;
            }
            return baseLabel;
        };

        const getItemColor = (item) => {
            if (item.color) return item.color;
            const type = item.type || item;
            if (type === 'floor') return 'rgba(80, 80, 80, 1)';
            if (type === 'wall' || type === 'wall_thin_h' || type === 'wall_thin_v') return 'rgba(40, 40, 40, 1)';
            if (type === 'door') return 'rgba(0, 100, 0, 1)';
            if (type === 'elevator') return 'rgba(0, 60, 180, 1)';
            if (type === 'stairs') return 'rgba(120, 120, 0, 1)';
            if (type === 'ladder') return 'rgba(120, 40, 0, 1)';
            if (type === 'tunnel') return 'rgba(80, 0, 120, 1)';
            
            const amenity = amenities.find(a => a.value === type);
            if (amenity) return amenity.color;

            if (type === 'component') {
                const instance = store.installedComponents.find(x => x.instanceId === item.instanceId);
                if (instance) {
                    const def = store.allEquipment.find(e => e.id === instance.defId);
                    if (def) {
                        const cat = def.category;
                        if (cat === 'Weapon Systems') return 'rgba(160, 30, 30, 1)';
                        if (cat === 'Defenses' || cat === 'Armor') return 'rgba(30, 80, 160, 1)';
                        if (cat === 'Sublight' || cat === 'FTL Drives') return 'rgba(160, 90, 0, 1)';
                        if (cat === 'Power') return 'rgba(140, 120, 0, 1)';
                        if (cat === 'Sensors' || cat === 'Command & Comms' || cat === 'Computers') return 'rgba(0, 110, 120, 1)';
                        if (cat === 'Accommodations' || cat === 'Miscellaneous') return 'rgba(100, 60, 40, 1)';
                    }
                }
                return 'rgba(40, 100, 110, 1)';
            }
            return 'rgba(255, 0, 0, 1)';
        };

        const getStairSVG = (item, gridSize) => {
            const W = item.w * gridSize;
            const H = item.h * gridSize;
            const rot = item.rotation || 0;
            
            let html = `<svg width="${W}" height="${H}" style="position: absolute; top: 0; left: 0; pointer-events: none;">
                <defs>
                    <marker id="stair-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.8)" />
                    </marker>
                </defs>`;
                
            // SQUARE: Circular Stair
            if (item.w === item.h) {
                const cx = W / 2;
                const cy = H / 2;
                const rOut = (W / 2) - 2;
                const rIn = Math.max(2, W / 8);
                html += `<circle cx="${cx}" cy="${cy}" r="${rOut}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                html += `<circle cx="${cx}" cy="${cy}" r="${rIn}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                
                // Draw radial steps
                const stepCount = 12; // 12 steps in a circle
                for (let i = 0; i < stepCount; i++) {
                    const angle = (i * 30 * Math.PI) / 180;
                    if (i === 0) continue; // Gap for entrance
                    const x1 = cx + Math.cos(angle) * rIn;
                    const y1 = cy + Math.sin(angle) * rIn;
                    const x2 = cx + Math.cos(angle) * rOut;
                    const y2 = cy + Math.sin(angle) * rOut;
                    html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>`;
                }
                
                // Curved arrow
                const rMid = (rOut + rIn) / 2;
                const startAngle = 30 * Math.PI / 180;
                const endAngle = 300 * Math.PI / 180;
                const ax1 = cx + Math.cos(startAngle) * rMid;
                const ay1 = cy + Math.sin(startAngle) * rMid;
                const ax2 = cx + Math.cos(endAngle) * rMid;
                const ay2 = cy + Math.sin(endAngle) * rMid;
                html += `<path d="M ${ax1} ${ay1} A ${rMid} ${rMid} 0 1 1 ${ax2} ${ay2}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" marker-end="url(#stair-arrow)"/>`;
                
            } 
            // U-SHAPED STAIR: Both W > 1 and H > 1 (e.g. 2x3, 3x2)
            else if (item.w > 1 && item.h > 1) {
                let isVertical = item.h > item.w;
                
                if (isVertical) {
                    const isUp = rot === 0 || rot === 270;
                    const landingDepth = W / 2;
                    const stairArea = H - landingDepth;
                    const stepCount = Math.max(3, Math.floor(stairArea / (gridSize / 4)));
                    const stepH = stairArea / stepCount;
                    
                    const stepsTop = isUp ? landingDepth : 0;
                    
                    // Landing separator
                    const sepY = !isUp ? (H - landingDepth) : landingDepth;
                    html += `<line x1="0" y1="${sepY}" x2="${W}" y2="${sepY}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    
                    // Central divider
                    if (isUp) html += `<line x1="${W/2}" y1="${landingDepth}" x2="${W/2}" y2="${H}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    else html += `<line x1="${W/2}" y1="0" x2="${W/2}" y2="${H-landingDepth}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    
                    // Steps on both sides
                    for (let i = 1; i < stepCount; i++) {
                        const y = stepsTop + i * stepH;
                        html += `<line x1="0" y1="${y}" x2="${W/2}" y2="${y}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>`;
                        html += `<line x1="${W/2}" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>`;
                    }
                    
                    // U-shaped arrow
                    const leftX = W / 4;
                    const rightX = 3 * W / 4;
                    const arrowBottom = isUp ? H - (stairArea/4) : (stairArea/4);
                    const arrowTop = isUp ? landingDepth/2 : H - landingDepth/2;
                    
                    if (isUp) {
                        html += `<path d="M ${rightX} ${arrowBottom} L ${rightX} ${arrowTop} Q ${rightX} ${arrowTop-landingDepth/4} ${W/2} ${arrowTop-landingDepth/4} Q ${leftX} ${arrowTop-landingDepth/4} ${leftX} ${arrowTop} L ${leftX} ${arrowBottom}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" marker-end="url(#stair-arrow)"/>`;
                    } else {
                        html += `<path d="M ${leftX} ${arrowBottom} L ${leftX} ${arrowTop} Q ${leftX} ${arrowTop+landingDepth/4} ${W/2} ${arrowTop+landingDepth/4} Q ${rightX} ${arrowTop+landingDepth/4} ${rightX} ${arrowTop} L ${rightX} ${arrowBottom}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" marker-end="url(#stair-arrow)"/>`;
                    }
                } else {
                    const isRight = rot === 90 || rot === 180;
                    const landingDepth = H / 2;
                    const stairArea = W - landingDepth;
                    const stepCount = Math.max(3, Math.floor(stairArea / (gridSize / 4)));
                    const stepW = stairArea / stepCount;
                    
                    const stepsLeft = !isRight ? landingDepth : 0;
                    
                    // Landing separator
                    const sepX = isRight ? (W - landingDepth) : landingDepth;
                    html += `<line x1="${sepX}" y1="0" x2="${sepX}" y2="${H}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    
                    // Central divider
                    if (isRight) html += `<line x1="0" y1="${H/2}" x2="${W-landingDepth}" y2="${H/2}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    else html += `<line x1="${landingDepth}" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    
                    // Steps on both sides
                    for (let i = 1; i < stepCount; i++) {
                        const x = stepsLeft + i * stepW;
                        html += `<line x1="${x}" y1="0" x2="${x}" y2="${H/2}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>`;
                        html += `<line x1="${x}" y1="${H/2}" x2="${x}" y2="${H}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>`;
                    }
                    
                    // U-shaped arrow
                    const topY = H / 4;
                    const bottomY = 3 * H / 4;
                    const arrowStart = !isRight ? W - (stairArea/4) : (stairArea/4);
                    const arrowEnd = !isRight ? landingDepth/2 : W - landingDepth/2;
                    
                    if (!isRight) {
                        html += `<path d="M ${arrowStart} ${bottomY} L ${arrowEnd} ${bottomY} Q ${arrowEnd-landingDepth/4} ${bottomY} ${arrowEnd-landingDepth/4} ${H/2} Q ${arrowEnd-landingDepth/4} ${topY} ${arrowEnd} ${topY} L ${arrowStart} ${topY}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" marker-end="url(#stair-arrow)"/>`;
                    } else {
                        html += `<path d="M ${arrowStart} ${topY} L ${arrowEnd} ${topY} Q ${arrowEnd+landingDepth/4} ${topY} ${arrowEnd+landingDepth/4} ${H/2} Q ${arrowEnd+landingDepth/4} ${bottomY} ${arrowEnd} ${bottomY} L ${arrowStart} ${bottomY}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" marker-end="url(#stair-arrow)"/>`;
                    }
                }
            }
            // STRAIGHT STAIR: (W == 1 || H == 1)
            else {
                let isVertical = item.h > item.w;
                const landingSize = isVertical ? W : H;
                const hasLanding = isVertical ? (H >= W * 1.5) : (W >= H * 1.5);
                
                if (isVertical) {
                    const isUp = rot === 0 || rot === 270;
                    const stairArea = hasLanding ? H - landingSize : H;
                    const stepCount = Math.max(3, Math.floor(stairArea / (gridSize / 4))); 
                    const stepH = stairArea / stepCount;
                    
                    const stepsTop = (hasLanding && isUp) ? landingSize : 0;
                    
                    if (hasLanding) {
                        const sepY = !isUp ? (H - landingSize) : landingSize;
                        html += `<line x1="0" y1="${sepY}" x2="${W}" y2="${sepY}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    }
                    
                    for (let i = 1; i < stepCount; i++) {
                        const y = stepsTop + i * stepH;
                        html += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;
                    }
                    
                    const arrowX = W / 2;
                    const arrowStart = isUp ? H - (stairArea/4) : (stairArea/4);
                    const arrowEnd = isUp ? landingSize/2 : H - landingSize/2;
                    if (hasLanding && H > W) {
                        html += `<line x1="${arrowX}" y1="${arrowStart}" x2="${arrowX}" y2="${arrowEnd}" stroke="rgba(255,255,255,0.8)" stroke-width="2" marker-end="url(#stair-arrow)"/>`;
                    }
                } else {
                    const isRight = rot === 90 || rot === 180;
                    const stairArea = hasLanding ? W - landingSize : W;
                    const stepCount = Math.max(3, Math.floor(stairArea / (gridSize / 4)));
                    const stepW = stairArea / stepCount;
                    
                    const stepsLeft = (hasLanding && !isRight) ? landingSize : 0;
                    
                    if (hasLanding) {
                        const sepX = isRight ? (W - landingSize) : landingSize;
                        html += `<line x1="${sepX}" y1="0" x2="${sepX}" y2="${H}" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>`;
                    }
                    
                    for (let i = 1; i < stepCount; i++) {
                        const x = stepsLeft + i * stepW;
                        html += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;
                    }
                    
                    const arrowY = H / 2;
                    const arrowStart = !isRight ? W - (stairArea/4) : (stairArea/4);
                    const arrowEnd = !isRight ? landingSize/2 : W - landingSize/2;
                    if (hasLanding && W > H) {
                        html += `<line x1="${arrowStart}" y1="${arrowY}" x2="${arrowEnd}" y2="${arrowY}" stroke="rgba(255,255,255,0.8)" stroke-width="2" marker-end="url(#stair-arrow)"/>`;
                    }
                }
            }
            
            html += `</svg>`;
            return html;
        };

        const masterMapLayout = computed(() => {
            const size = store.chassis.size || '';
            const baseHull = store.chassis.baseHull || 0;
            let rows = [];
            
            if (size.startsWith('Small')) {
                if (baseHull <= 20) rows = [[null, 'Fore', null], [null, 'Aft', null]];
                else rows = [[null, 'Fore', null], [null, 'Fore Center', null], [null, 'Aft Center', null], [null, 'Aft', null]];
            } else if (size.startsWith('Light')) {
                rows = [[null, 'Fore', null], ['Port', 'Fore Center', 'Starboard'], [null, 'Aft Center', null], [null, 'Aft', null]];
            } else if (size.startsWith('Medium')) {
                rows = [[null, 'Fore', null], ['Fore Port', 'Fore Center', 'Fore Starboard'], ['Aft Port', 'Aft Center', 'Aft Starboard'], [null, 'Aft', null]];
            } else if (size.startsWith('Heavy')) {
                rows = [[null, 'Fore', null], ['Fore Port', 'Fore Center', 'Fore Starboard'], ['Port', 'Center Fore', 'Starboard'], ['Aft Port', 'Center Aft', 'Aft Starboard'], [null, 'Aft', null]];
            } else if (size.startsWith('Super') || size.startsWith('Colossal')) {
                rows = [
                    [null, 'Fore', null], 
                    ['Far Fore Port', 'Far Fore Center', 'Far Fore Starboard'], 
                    ['Fore Port', 'Fore Center', 'Fore Starboard'], 
                    ['Port Center', 'Center Fore', 'Starboard Center'], 
                    ['Port', 'Center Aft', 'Starboard'], 
                    ['Aft Port', 'Aft Center', 'Aft Starboard'], 
                    ['Far Aft Port', 'Far Aft Center', 'Far Aft Starboard'], 
                    [null, 'Aft', null]
                ];
            } else {
                rows = [[null, 'Fore', null], [null, 'Aft', null]];
            }

            return rows;
        });

        const getAbbreviation = (sec) => {
            if (!sec) return '';
            return sec.split(' ').map(p => p[0]).join('').toUpperCase();
        };

        const getSectionName = (secId) => {
            if (!activeDeck.value) return '';
            const sec = activeDeck.value.sections.find(s => s.id === secId);
            if (sec && sec.name) return sec.name;
            if (activeDeck.value.name) return activeDeck.value.name;
            return `Deck ${activeDeckIndex.value + 1}`;
        };

        const isShiftPressed = ref(false);
        const handleKeyDown = (e) => { if (e.key === 'Shift') isShiftPressed.value = true; };
        const handleKeyUp = (e) => { if (e.key === 'Shift') isShiftPressed.value = false; };

        onMounted(() => {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
        });
        onUnmounted(() => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        });

        const exportToImage = async () => {
            if (!activeSection.value) return;
            const canvas = document.createElement('canvas');
            const renderScale = 50; 
            
            canvas.width = activeSection.value.width * renderScale;
            canvas.height = activeSection.value.height * renderScale;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            await renderSectionToCtx(ctx, activeSection.value, 0, 0, renderScale);
            
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `deckplan_${activeSection.value.id.replace(/\s+/g, '_').toLowerCase()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        // Render a section's items onto an existing canvas context at (originX, originY)
        const renderSectionToCtx = async (ctx, section, originX, originY, rs) => {
            // Background cell fill
            ctx.fillStyle = '#111111';
            ctx.fillRect(originX, originY, section.width * rs, section.height * rs);

            // Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 0.5;
            for (let gx = 0; gx <= section.width; gx++) {
                ctx.beginPath();
                ctx.moveTo(originX + gx * rs, originY);
                ctx.lineTo(originX + gx * rs, originY + section.height * rs);
                ctx.stroke();
            }
            for (let gy = 0; gy <= section.height; gy++) {
                ctx.beginPath();
                ctx.moveTo(originX, originY + gy * rs);
                ctx.lineTo(originX + section.width * rs, originY + gy * rs);
                ctx.stroke();
            }

            // Items — two passes: fill first, then text on top
            const sortedItems = [...section.items].sort((a, b) => {
                const za = a.z !== undefined ? a.z : getDefaultZ(a.type);
                const zb = b.z !== undefined ? b.z : getDefaultZ(b.type);
                return za - zb;
            });

            // Pass 1: fill rectangles
            sortedItems.forEach(item => {
                if (item.hidden) return;
                ctx.fillStyle = getItemColor(item);
                if (item.type === 'wall_thin_h') {
                    ctx.fillRect(originX + item.x * rs, originY + item.y * rs - rs * 0.1, item.w * rs, rs * 0.2);
                } else if (item.type === 'wall_thin_v') {
                    ctx.fillRect(originX + item.x * rs - rs * 0.1, originY + item.y * rs, rs * 0.2, item.h * rs);
                } else {
                    ctx.fillRect(originX + item.x * rs, originY + item.y * rs, item.w * rs, item.h * rs);
                }
            });

            const drawSvgToCtx = (svgStr, x, y) => {
                return new Promise(resolve => {
                    const img = new Image();
                    const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
                    const url = URL.createObjectURL(blob);
                    img.onload = () => {
                        ctx.drawImage(img, x, y);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.src = url;
                });
            };

            // Pass 2: text labels
            const noLabel = new Set(['floor', 'wall', 'wall_thin_h', 'wall_thin_v']);
            for (const item of sortedItems) {
                if (item.hidden) continue;
                if (noLabel.has(item.type)) continue;

                const cellW = item.w * rs;
                const cellH = item.h * rs;
                if (cellW < 8 || cellH < 8) continue; // too small to bother

                const drawAtX = originX + item.x * rs;
                const drawAtY = originY + item.y * rs;

                if (item.type === 'stairs') {
                    let svgStr = getStairSVG(item, rs);
                    if (!svgStr.includes('xmlns=')) {
                        svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                    await drawSvgToCtx(svgStr, drawAtX, drawAtY);
                    continue;
                }

                if (item.type === 'internal_defense') {
                    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${cellW}" height="${cellH}" stroke="rgba(255,255,255,0.8)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h8l-3-6H6z" /><circle cx="7" cy="14" r="2" /><path d="M8 12.5l5-4.5" /><rect x="7" y="4" width="8" height="6" rx="1" /><path d="M15 6h7" /><path d="M7 5H4v4h3" /></svg>`;
                    await drawSvgToCtx(svgStr, drawAtX, drawAtY);
                    continue;
                }

                if (item.type === 'camera') {
                    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${cellW}" height="${cellH}" stroke="rgba(255,255,255,0.8)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
                    await drawSvgToCtx(svgStr, drawAtX, drawAtY);
                    continue;
                }

                if (item.type === 'ladder') {
                    const isUp = item.vDir === 'up';
                    const isDn = item.vDir === 'down';
                    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${cellW}" height="${cellH}" stroke="rgba(255,255,255,0.8)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="21"></line><line x1="18" y1="3" x2="18" y2="21"></line><line x1="6" y1="8" x2="18" y2="8"></line><line x1="6" y1="12" x2="18" y2="12"></line><line x1="6" y1="16" x2="18" y2="16"></line>${isUp ? '<polyline points="12 6 12 1 9 4 12 1 15 4" stroke="#4BB5C1"></polyline>' : isDn ? '<polyline points="12 18 12 23 9 20 12 23 15 20" stroke="#4BB5C1"></polyline>' : '<polyline points="12 1 12 6 9 3 12 1 15 3" stroke="#4BB5C1"></polyline><polyline points="12 23 12 18 9 21 12 23 15 21" stroke="#4BB5C1"></polyline>'}</svg>`;
                    await drawSvgToCtx(svgStr, drawAtX, drawAtY);
                    continue;
                }

                let label = '';
                if (item.type === 'component') {
                    const inst = store.installedComponents.find(c => c.instanceId === item.instanceId);
                    if (inst) label = getName(inst);
                    if (item.customLabel) label = `${label} ${item.customLabel}`;
                } else {
                    // amenity or structural type — use a readable format
                    const amenity = amenities.find(a => a.value === item.type);
                    label = amenity ? amenity.label : item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    if (item.customLabel) label = `${label} ${item.customLabel}`;
                }
                if (!label) continue;

                // Font size: fit roughly to the smaller dimension
                const fontSize = Math.max(8, Math.min(14, Math.floor(Math.min(cellW, cellH) * 0.22)));
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const cx = originX + item.x * rs + cellW / 2;
                const cy = originY + item.y * rs + cellH / 2;

                // Clip to item bounds so text doesn't bleed
                ctx.save();
                ctx.rect(originX + item.x * rs, originY + item.y * rs, cellW, cellH);
                ctx.clip();

                // Word-wrap: break into lines that fit
                const words = label.split(' ');
                const maxWidth = cellW - 4;
                const lines = [];
                let currentLine = '';
                words.forEach(word => {
                    const test = currentLine ? currentLine + ' ' + word : word;
                    if (ctx.measureText(test).width <= maxWidth) {
                        currentLine = test;
                    } else {
                        if (currentLine) lines.push(currentLine);
                        currentLine = word;
                    }
                });
                if (currentLine) lines.push(currentLine);

                const lineH = fontSize + 2;
                const startY = cy - (lines.length - 1) * lineH / 2;
                lines.forEach((line, i) => {
                    ctx.fillText(line, cx, startY + i * lineH);
                });

                ctx.restore();
            }

            // Section border
            ctx.strokeStyle = '#4BB5C1';
            ctx.lineWidth = 2;
            ctx.strokeRect(originX, originY, section.width * rs, section.height * rs);
        };

        const exportMasterMapImage = async () => {
            if (!activeDeck.value) return;
            const layout = masterMapLayout.value;
            const rs = 50; // render scale: px per grid square
            const GAP = rs; // gap between sections in pixels (exactly 1 square for VTT alignment)

            // Compute section positions in canvas space
            const numCols = layout[0]?.length || 1;
            const numRows = layout.length;

            // First pass: figure out column widths and row heights
            const colWidths  = Array(numCols).fill(0);
            const rowHeights = Array(numRows).fill(0);

            layout.forEach((row, rIdx) => {
                row.forEach((secId, cIdx) => {
                    if (!secId) return;
                    const sec = activeDeck.value.sections.find(s => s.id === secId);
                    if (!sec) return;
                    colWidths[cIdx]  = Math.max(colWidths[cIdx],  sec.width  * rs);
                    rowHeights[rIdx] = Math.max(rowHeights[rIdx], sec.height * rs);
                });
            });

            // Total canvas size
            const totalW = colWidths.reduce((a, b) => a + b, 0)  + GAP * (numCols + 1);
            const totalH = rowHeights.reduce((a, b) => a + b, 0) + GAP * (numRows + 1);

            const canvas = document.createElement('canvas');
            canvas.width  = totalW;
            canvas.height = totalH;
            const ctx = canvas.getContext('2d');

            // Black background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, totalW, totalH);

            // Draw ship background image if present
            const bg = activeDeckBg.value;
            if (bg && bg.masterMap) {
                await new Promise((resolve) => {
                    const s  = bg.masterMap.scale  || 1;
                    const ox = bg.masterMap.offsetX || 0;
                    const oy = bg.masterMap.offsetY || 0;
                    const bgImg = new Image();
                    bgImg.onload = () => {
                        ctx.save();
                        ctx.globalAlpha = bg.opacity ?? 0.3;
                        const iw = bgImg.width * s;
                        const ih = bgImg.height * s;
                        ctx.drawImage(bgImg,
                            totalW / 2 - iw / 2 + ox,
                            totalH / 2 - ih / 2 + oy,
                            iw, ih);
                        ctx.restore();
                        resolve();
                    };
                    bgImg.src = bg.data;
                });
            }

            // Draw sections sequentially so context state isn't interleaved
            let y = GAP;
            for (let rIdx = 0; rIdx < layout.length; rIdx++) {
                const row = layout[rIdx];
                let x = GAP;
                for (let cIdx = 0; cIdx < row.length; cIdx++) {
                    const secId = row[cIdx];
                    if (secId) {
                        const sec = activeDeck.value.sections.find(s => s.id === secId);
                        if (sec) {
                            const cellX = x + (colWidths[cIdx]  - sec.width  * rs) / 2;
                            const cellY = y + (rowHeights[rIdx] - sec.height * rs) / 2;
                            await renderSectionToCtx(ctx, sec, cellX, cellY, rs);
                            // Section ID label
                            ctx.font = 'bold 13px sans-serif';
                            ctx.fillStyle = '#4BB5C1';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText(secId, cellX + sec.width * rs / 2, cellY - 4);
                        }
                    }
                    x += colWidths[cIdx] + GAP;
                }
                y += rowHeights[rIdx] + GAP;
            }

            const sqW = Math.round(totalW / rs);
            const sqH = Math.round(totalH / rs);

            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${(store.meta?.name || 'ship').replace(/\s+/g, '_')}_deck${activeDeckIndex.value + 1}_mastermap_${sqW}x${sqH}sq.png`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };


        const scaleOptions = [
            { label: '1 sq = 1m', value: 1 },
            { label: '1 sq = 1.5m (5ft)', value: 1.5 },
            { label: '1 sq = 2m', value: 2 },
            { label: '1 sq = 3m', value: 3 },
            { label: '1 sq = 5m', value: 5 },
            { label: '1 sq = 10m', value: 10 }
        ];

        const gridScale = computed({
            get: () => store.deckPlan.gridScale || 1.5,
            set: (val) => { store.deckPlan.gridScale = val; }
        });

        const getWeaponArcs = (item) => {
            if (item.type !== 'component') return { arcs: [], isFixed: false };
            const target = store.installedComponents.find(c => c.instanceId === item.instanceId);
            if (!target) return { arcs: [], isFixed: false };

            let arcs = target.modifications?.arcs || [];
            if (arcs.includes('Zero-Port')) arcs = [...arcs, 'Zero', 'Port'];
            if (arcs.includes('Zero-Starboard')) arcs = [...arcs, 'Zero', 'Starboard'];
            const isFixed = ['Fixed Mount', 'Spinal Mount'].includes(target.modifications?.emplacement);
            return { arcs, isFixed };
        };

        return {
            store, activeDeckId, activeSectionId, activeDeck, activeSection, 
            tools, activeTool, sectionComponents, getName, showMasterMap, masterMapLayout,
            addDeck, removeDeck, updateDeckSize, undo, redo, history, redoHistory, deckWidth, deckHeight,
            onGridMouseDown, onGridMouseMove, onGridMouseUp, onResizeMouseDown, onItemClick,
            startComponentDrag, onDropGrid, getItemStyle, selectedItemIds, selectionBox,
            clipboard, copySection, pasteSection, clearSection, flipX, flipY,
            bringToFront, sendToBack, elementsTab, sortedSectionItems, toggleVisibility, getDefaultZ,
            scaleOptions, gridScale, activeDeckIndex, goDeckUp, goDeckDown, moveDeckUp, moveDeckDown, exportToImage, exportMasterMapImage, getAbbreviation, getSectionName,
            isShiftPressed, amenities, formatType, activeSectionName, rotateItem, setVDir, changeTextSize, rotateText, getStairSVG,
            masterMapZoom, masterMapPanX, masterMapPanY, isMasterMapPanning,
            onMasterMapWheel, onMasterMapMouseDown, onMasterMapMouseMove, onMasterMapMouseUp,
            activeColor, applyColor, clearColor, getWeaponArcs,
            showBgSettings, activeDeckBg, activeBgSettings, uploadDeckBackground, clearDeckBackground,
            showSectionLabels, glueSections
        };
    },
    template: `
    <div class="row q-pa-md" style="height: 100vh; max-height: calc(100vh - 100px); overflow: hidden;">
        
        <!-- SIDEBAR -->
        <div class="col-12 col-md-3 q-pr-md flex column" style="height: 100%; overflow-y: hidden;">
            <q-card dark class="bg-grey-9 q-mb-md flex column" style="flex-shrink: 0;">
                <q-card-section>
                    <!-- Top Bar: +/- FloorName Down/Up -->
                    <div v-if="activeDeck" class="row items-center justify-between q-mb-sm">
                        <div class="row q-gutter-x-xs">
                            <q-btn round outline color="negative" icon="remove" @click="removeDeck" size="xs" :disable="store.deckPlan.decks.length <= 1"><q-tooltip>Remove Floor</q-tooltip></q-btn>
                            <q-btn round color="accent" icon="add" @click="addDeck" size="xs"><q-tooltip>Add Floor</q-tooltip></q-btn>
                        </div>
                        
                        <div class="col q-px-sm">
                            <q-input dark dense borderless v-model="activeSectionName" input-class="text-center text-bold text-primary" style="font-size: 1.1em; padding: 0;" />
                        </div>
                        
                        <div class="row q-gutter-x-xs">
                            <q-btn round outline color="warning" icon="vertical_align_bottom" @click="moveDeckDown" size="xs" :disable="activeDeckIndex <= 0"><q-tooltip>Swap Floor Down</q-tooltip></q-btn>
                            <q-btn round outline color="warning" icon="vertical_align_top" @click="moveDeckUp" size="xs" :disable="activeDeckIndex >= store.deckPlan.decks.length - 1"><q-tooltip>Swap Floor Up</q-tooltip></q-btn>
                            <q-btn round outline color="primary" icon="arrow_downward" @click="goDeckDown" size="xs" :disable="activeDeckIndex <= 0"><q-tooltip>Go to Floor Down</q-tooltip></q-btn>
                            <q-btn round outline color="primary" icon="arrow_upward" @click="goDeckUp" size="xs" :disable="activeDeckIndex >= store.deckPlan.decks.length - 1"><q-tooltip>Go to Floor Up</q-tooltip></q-btn>
                        </div>
                    </div>
                    
                    <!-- Mini Diagram -->
                    <div class="mini-diagram bg-dark rounded-borders q-pa-sm" style="border: 1px solid #4BB5C1;">
                        <div v-for="(row, rIdx) in masterMapLayout" :key="rIdx" class="row justify-center q-gutter-x-xs q-mb-xs">
                            <div v-for="(sec, sIdx) in row" :key="sIdx" 
                                 class="col text-center rounded-borders" 
                                 :class="!sec ? 'invisible' : (activeSectionId === sec ? 'bg-primary text-dark text-bold cursor-pointer' : 'bg-grey-8 text-white cursor-pointer')"
                                 :style="!sec ? 'border: 1px solid transparent; padding: 4px 2px; min-height: 24px;' : 'border: 1px solid #333; padding: 4px 2px; font-size: 0.85em; font-weight: bold; min-height: 24px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;'"
                                 @click="sec && (activeSectionId = sec)">
                                 {{ sec ? getAbbreviation(sec) : '' }}
                                 <q-tooltip v-if="sec">{{ sec }}</q-tooltip>
                            </div>
                        </div>
                    </div>

                    <!-- Active Section Tools -->
                    <div v-if="activeSection" class="q-mt-sm row items-center justify-between q-gutter-x-sm">
                        <div class="col">
                            <q-input dark dense filled type="number" v-model.number="deckWidth" label="Width"></q-input>
                        </div>
                        <div class="col">
                            <q-input dark dense filled type="number" v-model.number="deckHeight" label="Height"></q-input>
                        </div>
                        <q-btn outline color="primary" @click="updateDeckSize" padding="sm" icon="check" />
                        <q-btn flat round icon="undo" color="info" size="sm" @click="undo" :disable="history.length === 0"><q-tooltip>Undo (Ctrl+Z)</q-tooltip></q-btn>
                        <q-btn flat round icon="redo" color="info" size="sm" @click="redo" :disable="redoHistory.length === 0"><q-tooltip>Redo (Ctrl+Y)</q-tooltip></q-btn>
                    </div>

                    <div v-if="activeSection" class="q-mt-sm row q-col-gutter-xs">
                        <div class="col-3"><q-btn outline color="info" size="xs" class="full-width" icon="content_copy" @click="copySection"><q-tooltip>Copy</q-tooltip></q-btn></div>
                        <div class="col-3"><q-btn outline :disable="clipboard.length===0" color="secondary" size="xs" class="full-width" icon="content_paste" @click="pasteSection"><q-tooltip>Paste</q-tooltip></q-btn></div>
                        <div class="col-3"><q-btn outline color="accent" size="xs" class="full-width" icon="flip" @click="flipX"><q-tooltip>Flip X</q-tooltip></q-btn></div>
                        <div class="col-3"><q-btn outline color="accent" size="xs" class="full-width" icon="flip_camera_android" @click="flipY"><q-tooltip>Flip Y</q-tooltip></q-btn></div>
                        <div class="col-12 q-mt-xs"><q-btn outline color="negative" size="xs" class="full-width" icon="delete_sweep" @click="clearSection">Clear Structural</q-btn></div>
                    </div>
                </q-card-section>
            </q-card>
            
            <q-card dark class="bg-grey-9 col flex column" v-if="!showMasterMap">
                <q-card-section class="q-pb-none row items-center justify-between">
                    <div class="text-h6 text-primary">Map Elements</div>
                    <q-btn-toggle v-model="elementsTab" dense toggle-color="primary" :options="[{label: 'Systems', value: 'systems'}, {label: 'Layers', value: 'layers'}]" />
                </q-card-section>
                
                <q-card-section class="col" style="overflow-y: auto;" v-if="elementsTab === 'systems'">
                    <div v-if="sectionComponents.length === 0" class="text-grey text-center q-mt-md">No systems assigned to this section.</div>
                    <div v-for="g in sectionComponents" :key="g.instanceId" 
                         class="draggable-item bg-dark q-pa-sm q-mb-sm text-center" style="border: 1px solid #4BB5C1; cursor: grab; user-select: none;"
                         draggable="true" @dragstart="startComponentDrag($event, g.sample)">
                        <div style="font-weight: bold; font-size: 0.9em; line-height: 1.2;">
                            {{ getName(g.sample) }}
                            <span v-if="g.count > 1" class="text-accent q-ml-xs">x{{ g.count }}</span>
                        </div>
                        <div class="text-grey-5" style="font-size: 0.75em; margin-top: 4px;">Size: {{ store.getComponentHullPts(g.sample) }} Hull Pts.</div>
                    </div>
                </q-card-section>

                <q-card-section class="col q-pa-none" style="overflow-y: auto;" v-if="elementsTab === 'layers'">
                    <q-list dark separator dense>
                        <q-item v-for="item in sortedSectionItems" :key="item.id" clickable @click="selectedItemIds = [item.id]" :class="{'bg-secondary text-dark': selectedItemIds.includes(item.id)}">
                            <q-item-section avatar style="min-width: 40px; padding-right: 0;">
                                <q-btn flat round dense size="sm" :color="selectedItemIds.includes(item.id) ? 'dark' : 'grey-4'" :icon="item.hidden ? 'visibility_off' : 'visibility'" @click.stop="toggleVisibility(item)" />
                            </q-item-section>
                            <q-item-section>
                                <q-item-label style="text-transform: capitalize;">
                                    {{ item.type === 'component' ? getName(store.installedComponents.find(c => c.instanceId === item.instanceId)) + (item.customLabel ? ' ' + item.customLabel : '') : formatType(item) }}
                                </q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>
            </q-card>
        </div>
        
        <!-- MAIN CANVAS/GRID CONTAINER -->
        <div class="col-12 col-md-9 flex column" style="height: 100%;">
            
            <!-- Hidden file input for background upload -->
            <input type="file" accept="image/*" ref="bgUpload" style="display:none" @change="uploadDeckBackground" />

            <div class="row items-center q-gutter-sm q-pa-sm bg-dark text-white q-mb-sm rounded-borders shadow-2" style="border: 1px solid #4BB5C1;">
                <q-toggle v-model="showMasterMap" label="Master Map" color="accent" class="q-mr-sm" />

                <!-- Background image button + inline settings -->
                <q-btn flat round dense icon="image" :color="activeDeckBg ? 'accent' : 'grey-6'" @click="showBgSettings = !showBgSettings">
                    <q-tooltip>Floor Background Image</q-tooltip>
                </q-btn>
                <transition name="q-transition--fade">
                <div v-if="showBgSettings" class="row items-center q-gutter-sm bg-grey-9 q-pa-sm rounded-borders" style="border: 1px solid #4BB5C1; flex-wrap: nowrap;">
                    <q-btn v-if="!activeDeckBg" dense color="primary" icon="upload" label="Upload" size="sm" @click="$refs.bgUpload.click()" />
                    <template v-if="activeDeckBg && activeBgSettings">
                        <q-img :src="activeDeckBg.data" style="width:40px;height:40px;border-radius:4px;flex-shrink:0;" fit="cover" />
                        <div class="column q-gutter-xs" style="min-width:160px;">
                            <!-- Shared opacity -->
                            <div class="row items-center q-gutter-xs">
                                <span class="text-caption text-grey-4" style="width:52px;">Opacity</span>
                                <q-slider dark dense v-model="activeDeckBg.opacity" :min="0" :max="1" :step="0.05" color="accent" style="flex:1" />
                                <span class="text-caption" style="width:30px;">{{ Math.round(activeDeckBg.opacity*100) }}%</span>
                            </div>
                            <!-- Per-view scale & offset -->
                            <div class="text-caption text-accent" style="font-size:0.7em; letter-spacing:0.05em; text-transform:uppercase; margin-top:2px;">
                                {{ showMasterMap ? 'Master Map' : 'Section Editor' }}
                            </div>
                            <div class="row items-center q-gutter-xs">
                                <span class="text-caption text-grey-4" style="width:52px;">Scale</span>
                                <q-slider dark dense v-model="activeBgSettings.scale" :min="1" :max="20" :step="0.1" color="primary" style="flex:1" />
                                <span class="text-caption" style="width:30px;">{{ activeBgSettings.scale.toFixed(1) }}x</span>
                            </div>
                            <div class="row items-center q-gutter-xs">
                                <span class="text-caption text-grey-4" style="width:52px;">Offset X</span>
                                <q-input dark dense borderless type="number" v-model.number="activeBgSettings.offsetX" style="width:70px" />
                                <span class="text-caption text-grey-4" style="width:10px;">Y</span>
                                <q-input dark dense borderless type="number" v-model.number="activeBgSettings.offsetY" style="width:70px" />
                            </div>
                        </div>
                        <q-btn flat round dense icon="upload" color="grey-4" size="sm" @click="$refs.bgUpload.click()">
                            <q-tooltip>Replace image</q-tooltip>
                        </q-btn>
                        <q-btn flat round dense icon="delete" color="negative" size="sm" @click="clearDeckBackground">
                            <q-tooltip>Remove background</q-tooltip>
                        </q-btn>
                    </template>
                </div>
                </transition>
                
                <template v-if="!showMasterMap">
                    <q-separator dark vertical class="q-mx-sm" />
                    
                    <q-btn-group outline>
                        <q-btn :color="activeTool === 'select' ? 'accent' : 'grey-8'" icon="near_me" @click="activeTool = 'select'"><q-tooltip>Select / Move / Resize</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'floor' ? 'primary' : 'grey-8'" label="Floor" @click="activeTool = 'floor'" />
                        <q-btn :color="activeTool === 'wall' ? 'primary' : 'grey-8'" label="Wall" @click="activeTool = 'wall'" />
                        <q-btn :color="activeTool === 'wall_thin_h' ? 'primary' : 'grey-8'" icon="horizontal_rule" @click="activeTool = 'wall_thin_h'"><q-tooltip>Thin Wall (Horizontal)</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'wall_thin_v' ? 'primary' : 'grey-8'" icon="vertical_split" @click="activeTool = 'wall_thin_v'"><q-tooltip>Thin Wall (Vertical)</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'door' ? 'primary' : 'grey-8'" label="Door" @click="activeTool = 'door'" />
                        <q-btn :color="activeTool === 'elevator' ? 'primary' : 'grey-8'" icon="elevator" @click="activeTool = 'elevator'"><q-tooltip>Elevator</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'stairs' ? 'primary' : 'grey-8'" icon="stairs" @click="activeTool = 'stairs'"><q-tooltip>Stairs</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'ladder' ? 'primary' : 'grey-8'" icon="format_align_justify" @click="activeTool = 'ladder'"><q-tooltip>Ladder</q-tooltip></q-btn>
                        <q-btn :color="activeTool === 'tunnel' ? 'primary' : 'grey-8'" icon="panorama_horizontal" @click="activeTool = 'tunnel'"><q-tooltip>Tunnel</q-tooltip></q-btn>
                        
                        <q-btn-dropdown auto-close :color="amenities.some(a => a.value === activeTool) ? 'primary' : 'grey-8'" icon="chair" label="Amenities">
                            <q-list dark class="bg-grey-9">
                                <q-item v-for="a in amenities" :key="a.value" clickable @click="activeTool = a.value" :class="{'bg-primary text-dark': activeTool === a.value}">
                                    <q-item-section avatar style="min-width: 30px;"><q-icon :name="a.icon" size="xs" /></q-item-section>
                                    <q-item-section>{{ a.label }}</q-item-section>
                                </q-item>
                            </q-list>
                        </q-btn-dropdown>

                        <q-btn :color="activeTool === 'erase' ? 'negative' : 'grey-8'" icon="delete" @click="activeTool = 'erase'"><q-tooltip>Erase (Click Item)</q-tooltip></q-btn>
                        <q-separator dark vertical class="q-mx-xs" />
                        <q-btn color="info" outline icon="photo_camera" @click="exportToImage"><q-tooltip>Export AI Mask PNG</q-tooltip></q-btn>
                    </q-btn-group>

                    <q-space />

                    <div class="row items-center">
                        <span class="q-mr-sm text-caption">1 sq =</span>
                        <q-input dark dense filled v-model.number="gridScale" type="number" style="width: 100px" suffix="m" />
                    </div>

                    <div class="row items-center q-mr-sm" v-if="selectedItemIds.length === 1 && activeSection && !['floor', 'wall', 'wall_thin_h', 'wall_thin_v'].includes(activeSection.items.find(i => i.id === selectedItemIds[0])?.type)">
                        <q-input dark dense filled v-model="activeSection.items.find(i => i.id === selectedItemIds[0]).customLabel" placeholder="Custom Suffix" style="width: 150px" />
                    </div>

                    <q-btn-group outline v-if="selectedItemIds.length === 1 && activeSection && ['ladder', 'elevator'].includes(activeSection.items.find(i => i.id === selectedItemIds[0])?.type)" class="q-mr-sm">
                        <q-btn :color="activeSection.items.find(i => i.id === selectedItemIds[0]).vDir === 'up' ? 'primary' : 'grey-8'" label="UP" @click="setVDir('up')" />
                        <q-btn :color="activeSection.items.find(i => i.id === selectedItemIds[0]).vDir === 'down' ? 'primary' : 'grey-8'" label="DN" @click="setVDir('down')" />
                        <q-btn :color="!['up', 'down'].includes(activeSection.items.find(i => i.id === selectedItemIds[0]).vDir) ? 'primary' : 'grey-8'" label="U/D" @click="setVDir('both')" />
                    </q-btn-group>

                    <q-btn-group outline v-if="selectedItemIds.length > 0" class="q-mr-sm">
                        <q-btn color="secondary" outline icon="palette">
                            <q-tooltip>Change Color</q-tooltip>
                            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                                <q-color v-model="activeColor" @change="applyColor" default-view="palette" format-model="rgba" no-header no-footer />
                            </q-popup-proxy>
                        </q-btn>
                        <q-btn color="secondary" outline icon="format_color_reset" @click="clearColor"><q-tooltip>Reset Color</q-tooltip></q-btn>
                        <q-btn color="secondary" outline icon="text_increase" @click="changeTextSize(2)"><q-tooltip>Increase Text Size</q-tooltip></q-btn>
                        <q-btn color="secondary" outline icon="text_decrease" @click="changeTextSize(-2)"><q-tooltip>Decrease Text Size</q-tooltip></q-btn>
                        <q-btn color="secondary" outline icon="rotate_90_degrees_cw" @click="rotateText"><q-tooltip>Rotate Text 90°</q-tooltip></q-btn>
                    </q-btn-group>

                    <q-btn-group outline>
                        <q-btn :disable="selectedItemIds.length===0" color="secondary" outline icon="rotate_right" label="Facing" @click="rotateItem"><q-tooltip>Change Facing (F)</q-tooltip></q-btn>
                        <q-btn :disable="selectedItemIds.length===0" color="secondary" outline icon="flip_to_front" label="Front" @click="bringToFront"><q-tooltip>Bring to Front</q-tooltip></q-btn>
                        <q-btn :disable="selectedItemIds.length===0" color="secondary" outline icon="flip_to_back" label="Back" @click="sendToBack"><q-tooltip>Send to Back</q-tooltip></q-btn>
                    </q-btn-group>
                </template>
            </div>

            <!-- MAIN CANVAS/GRID -->
            <div class="col" style="overflow: auto; background-color: #000; border: 2px solid #4BB5C1; position: relative;" 
                 @mousedown="onGridMouseDown"
                 @mousemove="onGridMouseMove"
                 @mouseleave="onGridMouseUp" 
                 @mouseup="onGridMouseUp"
                 @contextmenu.prevent>
            
            <!-- MASTER MAP MODE -->
            <div v-if="showMasterMap && activeDeck" id="master-map-container" class="q-pa-lg flex col" style="overflow: hidden; position: relative;"
                 @wheel.prevent="onMasterMapWheel"
                 @mousedown="onMasterMapMouseDown"
                 @mousemove="onMasterMapMouseMove"
                 @mouseup="onMasterMapMouseUp"
                 @mouseleave="onMasterMapMouseUp"
                 @contextmenu.prevent>

                <div style="position: sticky; top: 0; left: 100%; width: 0; height: 0; z-index: 100;">
                    <div style="position: absolute; right: 0; top: 0;" class="bg-dark rounded-borders shadow-2 p-1 border">
                        <q-btn-group outline>
                            <q-btn color="secondary" outline icon="zoom_out" @click="masterMapZoom = Math.max(0.1, masterMapZoom - 0.1)" />
                            <q-btn color="secondary" outline icon="refresh" @click="masterMapZoom = 1.0; masterMapPanX = 0; masterMapPanY = 0;" />
                            <q-btn color="secondary" outline icon="zoom_in" @click="masterMapZoom = Math.min(3.0, masterMapZoom + 0.1)" />
                            <q-separator dark vertical />
                            <q-btn :color="showSectionLabels ? 'info' : 'grey-7'" outline icon="label" @click="showSectionLabels = !showSectionLabels">
                                <q-tooltip>Toggle section labels</q-tooltip>
                            </q-btn>
                            <q-btn :color="glueSections ? 'accent' : 'grey-7'" outline icon="grid_off" @click="glueSections = !glueSections">
                                <q-tooltip>Glue sections together</q-tooltip>
                            </q-btn>
                            <q-separator dark vertical />
                            <q-btn color="positive" outline icon="download" @click="exportMasterMapImage">
                                <q-tooltip>Export as VTT map PNG</q-tooltip>
                            </q-btn>
                        </q-btn-group>
                    </div>
                </div>

                <div :style="{ transform: 'scale(' + masterMapZoom + ') translate(' + masterMapPanX + 'px, ' + masterMapPanY + 'px)', transformOrigin: 'center center', margin: 'auto', position: 'relative', transition: isMasterMapPanning ? 'none' : 'transform 0.1s ease-out' }">
                    <!-- Background image moves with pan/zoom (master map settings) -->
                    <img v-if="activeDeckBg && activeDeckBg.masterMap" :src="activeDeckBg.data"
                         :style="{ position: 'absolute', top: '50%', left: '50%', maxWidth: 'none',
                                   transform: 'translate(calc(-50% + ' + (activeDeckBg.masterMap.offsetX||0) + 'px), calc(-50% + ' + (activeDeckBg.masterMap.offsetY||0) + 'px)) scale(' + (activeDeckBg.masterMap.scale||1) + ')',
                                   opacity: activeDeckBg.opacity, pointerEvents: 'none', zIndex: 0, userSelect: 'none', objectFit: 'contain' }" />
                    <table :style="{ borderSpacing: glueSections ? '0' : '20px', borderCollapse: 'separate', margin: '0 auto', userSelect: 'none', position: 'relative', zIndex: 1 }">
                        <tr v-for="(row, rIdx) in masterMapLayout" :key="'row'+rIdx">
                            <td v-for="(secId, sIdx) in row" :key="'sec'+sIdx" :style="{ verticalAlign: glueSections ? 'bottom' : 'top', textAlign: 'center' }">
                                <template v-if="secId">
                                    <div v-if="showSectionLabels" class="text-subtitle2 text-info q-mb-sm">{{ secId }} <span class="text-white text-caption">({{ getSectionName(secId) }})</span></div>
                                    <div v-if="activeDeck.sections.find(s => s.id === secId)" 
                                         :id="'master-map-cell-' + secId"
                                         class="cursor-pointer"
                                         @click="activeSectionId = secId; showMasterMap = false;"
                                         :style="{ position: 'relative', margin: '0 auto', width: (activeDeck.sections.find(s => s.id === secId).width * 20) + 'px', height: (activeDeck.sections.find(s => s.id === secId).height * 20) + 'px' }"
                                         style="background-color: #111; background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 20px 20px; border: 1px solid #4BB5C1; overflow: hidden; transition: box-shadow 0.2s;"
                                         onmouseover="this.style.boxShadow='0 0 10px #4BB5C1'"
                                         onmouseout="this.style.boxShadow='none'">
                                         
                                         <div v-for="item in activeDeck.sections.find(s => s.id === secId).items" :key="'mi'+item.id" :style="getItemStyle(item, 20)">
                                             <span v-if="item.type === 'component'" :style="{ textTransform: 'uppercase', whiteSpace: item.textRot ? 'nowrap' : 'normal', transform: item.textRot ? 'rotate(' + item.textRot + 'deg)' : 'none' }">{{ getName(store.installedComponents.find(c => c.instanceId === item.instanceId)) }}{{ item.customLabel ? ' ' + item.customLabel : '' }}</span>
                                             <span v-else-if="item.type !== 'floor' && item.type !== 'wall' && item.type !== 'wall_thin_h' && item.type !== 'wall_thin_v' && item.type !== 'ladder' && item.type !== 'stairs'" :style="{ textTransform: 'uppercase', whiteSpace: item.textRot ? 'nowrap' : 'normal', transform: item.textRot ? 'rotate(' + item.textRot + 'deg)' : 'none' }">
                                                 <template v-if="amenities.find(a => a.value === item.type)?.iconOnly">
                                                     <svg v-if="item.type === 'internal_defense'" viewBox="0 0 24 24" width="1.2em" height="1.2em" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                                         <path d="M4 22h8l-3-6H6z" />
                                                         <circle cx="7" cy="14" r="2" />
                                                         <path d="M8 12.5l5-4.5" />
                                                         <rect x="7" y="4" width="8" height="6" rx="1" />
                                                         <path d="M15 6h7" />
                                                         <path d="M7 5H4v4h3" />
                                                     </svg>
                                                     <q-icon v-else :name="amenities.find(a => a.value === item.type).icon" size="1.2em" />
                                                 </template>
                                                 <template v-else>{{ formatType(item) }}</template>
                                             </span>
                                             <div v-if="item.type === 'stairs'" v-html="getStairSVG(item, 20)"></div>
                                             <div v-if="'rotation' in item && item.type !== 'stairs'" :style="{ position: 'absolute', top: item.rotation === 0 ? '0' : item.rotation === 180 ? 'auto' : '50%', bottom: item.rotation === 180 ? '0' : 'auto', left: item.rotation === 270 ? '0' : item.rotation === 90 ? 'auto' : '50%', right: item.rotation === 90 ? '0' : 'auto', width: (item.rotation === 0 || item.rotation === 180) ? '20px' : '3px', height: (item.rotation === 90 || item.rotation === 270) ? '20px' : '3px', transform: (item.rotation === 0 || item.rotation === 180) ? 'translateX(-50%)' : 'translateY(-50%)', backgroundColor: '#FFEB3B', zIndex: 5 }"></div>
                                             <q-icon v-if="item.type === 'ladder'" :name="item.vDir === 'up' ? 'arrow_upward' : item.vDir === 'down' ? 'arrow_downward' : 'swap_vert'" style="position: absolute; bottom: 1px; right: 1px; color: rgba(255,255,255,0.8); font-size: 8px;" />
                                             <span v-if="item.type === 'elevator'" style="font-size: 5px; font-weight: bold; position: absolute; bottom: 1px; right: 1px; color: rgba(255,255,255,0.8);">{{ item.vDir === 'up' ? 'UP' : item.vDir === 'down' ? 'DN' : 'U/D' }}</span>
                                         </div>
                                    </div>
                                </template>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- EDITING MODE (VECTOR OBJECTS) -->
            <div v-else-if="activeSection" 
                 id="deck-grid-canvas"
                 :style="{ position: 'relative', width: (activeSection.width * 30) + 'px', height: (activeSection.height * 30) + 'px', margin: '60px auto' }"
                 style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 30px 30px;"
                 @dragover.prevent
                 @drop="onDropGrid">
                 <!-- Deck background image (section editor settings) -->
                 <img v-if="activeDeckBg && activeDeckBg.sectionEditor" :src="activeDeckBg.data"
                      :style="{ position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%',
                                transform: 'translate(calc(-50% + ' + (activeDeckBg.sectionEditor.offsetX||0) + 'px), calc(-50% + ' + (activeDeckBg.sectionEditor.offsetY||0) + 'px)) scale(' + (activeDeckBg.sectionEditor.scale||1) + ')',
                                opacity: activeDeckBg.opacity, pointerEvents: 'none', zIndex: 0, userSelect: 'none', objectFit: 'contain' }" />
                 
                 <div v-for="item in activeSection.items" :key="item.id" 
                      :style="getItemStyle(item, 30)"
                      @mousedown="e => onItemClick(e, item)">
                     
                     <template v-if="item.type === 'component'">
                         <span :style="{ whiteSpace: item.textRot ? 'nowrap' : 'normal', transform: item.textRot ? 'rotate(' + item.textRot + 'deg)' : 'none', zIndex: 10, position: 'relative' }">{{ getName(store.installedComponents.find(c => c.instanceId === item.instanceId)) }}{{ item.customLabel ? ' ' + item.customLabel : '' }}</span>
                         
                         <!-- Render Weapon Arcs Overlay -->
                         <template v-if="getWeaponArcs(item).arcs.length > 0">
                             <svg style="position: absolute; width: 140px; height: 140px; top: 50%; left: 50%; pointer-events: none; z-index: 5; transform: translate(-50%, -50%); opacity: 0.8;" viewBox="0 0 140 140">
                                 <g v-if="getWeaponArcs(item).arcs.includes('Forward')">
                                    <line x1="70" y1="70" x2="70" :y2="getWeaponArcs(item).isFixed ? 15 : 20" stroke="rgba(89, 183, 199, 0.9)" stroke-width="2"/>
                                    <polygon v-if="getWeaponArcs(item).isFixed" points="70,5 65,15 75,15" fill="rgba(89, 183, 199, 1)"/>
                                    <polygon v-else points="70,10 60,30 80,30" fill="rgba(89, 183, 199, 0.8)"/>
                                 </g>
                                 <g v-if="getWeaponArcs(item).arcs.includes('Aft')">
                                    <line x1="70" y1="70" x2="70" :y2="getWeaponArcs(item).isFixed ? 125 : 120" stroke="rgba(89, 183, 199, 0.9)" stroke-width="2"/>
                                    <polygon v-if="getWeaponArcs(item).isFixed" points="70,135 65,125 75,125" fill="rgba(89, 183, 199, 1)"/>
                                    <polygon v-else points="70,130 60,110 80,110" fill="rgba(89, 183, 199, 0.8)"/>
                                 </g>
                                 <g v-if="getWeaponArcs(item).arcs.includes('Port')">
                                    <line x1="70" y1="70" :x2="getWeaponArcs(item).isFixed ? 15 : 20" y2="70" stroke="rgba(89, 183, 199, 0.9)" stroke-width="2"/>
                                    <polygon v-if="getWeaponArcs(item).isFixed" points="5,70 15,65 15,75" fill="rgba(89, 183, 199, 1)"/>
                                    <polygon v-else points="10,70 30,60 30,80" fill="rgba(89, 183, 199, 0.8)"/>
                                 </g>
                                 <g v-if="getWeaponArcs(item).arcs.includes('Starboard')">
                                    <line x1="70" y1="70" :x2="getWeaponArcs(item).isFixed ? 125 : 120" y2="70" stroke="rgba(89, 183, 199, 0.9)" stroke-width="2"/>
                                    <polygon v-if="getWeaponArcs(item).isFixed" points="135,70 125,65 125,75" fill="rgba(89, 183, 199, 1)"/>
                                    <polygon v-else points="130,70 110,60 110,80" fill="rgba(89, 183, 199, 0.8)"/>
                                 </g>
                                 <g v-if="getWeaponArcs(item).arcs.includes('Zero')">
                                    <circle cx="70" cy="70" r="30" fill="none" stroke="rgba(89, 183, 199, 0.9)" stroke-width="1.5" stroke-dasharray="4,3"/>
                                 </g>
                             </svg>
                         </template>
                     </template>
                     
                     <span v-else-if="item.type !== 'floor' && item.type !== 'wall' && item.type !== 'wall_thin_h' && item.type !== 'wall_thin_v' && item.type !== 'ladder' && item.type !== 'stairs'" :style="{ whiteSpace: item.textRot ? 'nowrap' : 'normal', transform: item.textRot ? 'rotate(' + item.textRot + 'deg)' : 'none' }">
                         <template v-if="amenities.find(a => a.value === item.type)?.iconOnly">
                             <svg v-if="item.type === 'internal_defense'" viewBox="0 0 24 24" width="1.5em" height="1.5em" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                 <path d="M4 22h8l-3-6H6z" />
                                 <circle cx="7" cy="14" r="2" />
                                 <path d="M8 12.5l5-4.5" />
                                 <rect x="7" y="4" width="8" height="6" rx="1" />
                                 <path d="M15 6h7" />
                                 <path d="M7 5H4v4h3" />
                             </svg>
                             <q-icon v-else :name="amenities.find(a => a.value === item.type).icon" size="1.5em" />
                         </template>
                         <template v-else>{{ formatType(item) }}</template>
                     </span>
                     <div v-if="item.type === 'stairs'" v-html="getStairSVG(item, 30)"></div>
                     <div v-if="'rotation' in item && item.type !== 'stairs'" :style="{ position: 'absolute', top: item.rotation === 0 ? '0' : item.rotation === 180 ? 'auto' : '50%', bottom: item.rotation === 180 ? '0' : 'auto', left: item.rotation === 270 ? '0' : item.rotation === 90 ? 'auto' : '50%', right: item.rotation === 90 ? '0' : 'auto', width: (item.rotation === 0 || item.rotation === 180) ? '30px' : '4px', height: (item.rotation === 90 || item.rotation === 270) ? '30px' : '4px', transform: (item.rotation === 0 || item.rotation === 180) ? 'translateX(-50%)' : 'translateY(-50%)', backgroundColor: '#FFEB3B', zIndex: 5 }"></div>
                     
                     <q-icon v-if="item.type === 'ladder'" :name="item.vDir === 'up' ? 'arrow_upward' : item.vDir === 'down' ? 'arrow_downward' : 'swap_vert'" style="position: absolute; bottom: 2px; right: 2px; color: rgba(255,255,255,0.8); font-size: 14px;" />
                     <!-- Rendering for Items -->
                     <span v-if="['stairs', 'elevator', 'ladder', 'tunnel'].includes(item.type) && item.vDir" style="position: absolute; top: 0; left: 0; font-size: 8px; color: white; background: rgba(0,0,0,0.5); padding: 1px;">
                         {{ item.vDir.toUpperCase() }}
                     </span>
                     
                     <span v-show="isShiftPressed" style="position: absolute; top: 0; left: 0; font-size: 8px; color: yellow; background: rgba(0,0,0,0.5); padding: 1px;">z:{{ item.z !== undefined ? item.z : getDefaultZ(item.type) }}</span>
                     
                     <!-- Resize Handles -->
                     <template v-if="selectedItemIds.includes(item.id) && activeTool === 'select' && !item.hidden">
                         <!-- Corners -->
                         <div @mousedown="e => onResizeMouseDown(e, item, 'nw')" style="position: absolute; left: 0; top: 0; width: 8px; height: 8px; background-color: yellow; cursor: nwse-resize; z-index: 20;"></div>
                         <div @mousedown="e => onResizeMouseDown(e, item, 'ne')" style="position: absolute; right: 0; top: 0; width: 8px; height: 8px; background-color: yellow; cursor: nesw-resize; z-index: 20;"></div>
                         <div @mousedown="e => onResizeMouseDown(e, item, 'sw')" style="position: absolute; left: 0; bottom: 0; width: 8px; height: 8px; background-color: yellow; cursor: nesw-resize; z-index: 20;"></div>
                         <div @mousedown="e => onResizeMouseDown(e, item, 'se')" style="position: absolute; right: 0; bottom: 0; width: 8px; height: 8px; background-color: yellow; cursor: nwse-resize; z-index: 20;"></div>
                         <!-- Edges -->
                         <div @mousedown="e => onResizeMouseDown(e, item, 'n')" style="position: absolute; left: 8px; right: 8px; top: 0; height: 8px; background-color: transparent; cursor: ns-resize; z-index: 19;"></div>
                         <div @mousedown="e => onResizeMouseDown(e, item, 's')" style="position: absolute; left: 8px; right: 8px; bottom: 0; height: 8px; background-color: transparent; cursor: ns-resize; z-index: 19;"></div>
                         <div @mousedown="e => onResizeMouseDown(e, item, 'w')" style="position: absolute; top: 8px; bottom: 8px; left: 0; width: 8px; background-color: transparent; cursor: ew-resize; z-index: 19;"></div>
                         <div @mousedown="e => onResizeMouseDown(e, item, 'e')" style="position: absolute; top: 8px; bottom: 8px; right: 0; width: 8px; background-color: transparent; cursor: ew-resize; z-index: 19;"></div>
                     </template>
                 </div>
                 
                 <!-- Marquee Selection Box -->
                 <div v-if="selectionBox"
                      :style="{
                          position: 'absolute',
                          left: (selectionBox.x * 30) + 'px',
                          top: (selectionBox.y * 30) + 'px',
                          width: (selectionBox.w * 30) + 'px',
                          height: (selectionBox.h * 30) + 'px',
                          backgroundColor: 'rgba(75, 181, 193, 0.3)',
                          border: '1px dashed #4BB5C1',
                          pointerEvents: 'none',
                          zIndex: 50
                      }">
                 </div>
            </div>
        </div>
        </div>
        
    </div>
    `
};
