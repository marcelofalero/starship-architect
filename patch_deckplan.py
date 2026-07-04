import os

content = r"""import { useShipStore } from './store.js';
import { getLocalizedName } from './i18n.js';

const { computed, ref, onMounted, onUnmounted, watch } = Vue;

export const DeckPlanWrapper = {
    setup() {
        const store = useShipStore();
        
        if (!store.deckPlan) store.deckPlan = { decks: [] };
        
        const activeDeckId = ref(null);
        const activeSectionId = ref(null);
        const tools = ['select', 'floor', 'wall', 'door', 'elevator', 'stairs', 'ladder', 'tunnel', 'erase'];
        const activeTool = ref('select');
        const showMasterMap = ref(false);
        
        const history = ref([]);
        const selectedItemId = ref(null);
        
        // --- DRAG / DRAW STATE ---
        const interaction = ref({
            active: false,
            mode: null,
            itemId: null,
            startX: 0,
            startY: 0,
            origX: 0,
            origY: 0,
            origW: 0,
            origH: 0
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
            
            const predefined = new Set(locations);
            store.installedComponents.forEach(c => {
                if (c.location && !predefined.has(c.location) && c.location !== 'Distributed') {
                    locations.push(c.location);
                    predefined.add(c.location);
                }
            });
            return locations;
        };

        const initSection = (loc) => ({
            id: loc,
            name: loc,
            width: 30,
            height: 20,
            items: [] // { id, type, instanceId, x, y, w, h }
        });

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
        };

        syncDecks();
        watch(() => store.chassisId, syncDecks);
        watch(() => store.installedComponents.length, syncDecks);

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
            activeSectionId.value = expected[0];
        };

        if (store.deckPlan.decks.length === 0) {
            addDeck();
        } else if (!activeDeckId.value) {
            activeDeckId.value = store.deckPlan.decks[0].id;
            activeSectionId.value = store.deckPlan.decks[0].sections[0]?.id;
        }

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
                selectedItemId.value = null; 
            }
        }, { immediate: true });

        const saveHistory = () => {
            if (!activeSection.value || !activeDeck.value) return;
            history.value.push({
                deckId: activeDeck.value.id,
                sectionId: activeSection.value.id,
                items: JSON.parse(JSON.stringify(activeSection.value.items))
            });
            if (history.value.length > 50) history.value.shift();
        };

        const undo = () => {
            if (history.value.length === 0) return;
            const lastState = history.value.pop();
            const d = store.deckPlan.decks.find(deck => deck.id === lastState.deckId);
            if (d) {
                const s = d.sections.find(sec => sec.id === lastState.sectionId);
                if (s) {
                    s.items = lastState.items;
                    if (activeDeckId.value !== d.id) activeDeckId.value = d.id;
                    if (activeSectionId.value !== s.id) activeSectionId.value = s.id;
                    selectedItemId.value = null;
                }
            }
        };

        const handleKeydown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedItemId.value && activeSection.value) {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    saveHistory();
                    activeSection.value.items = activeSection.value.items.filter(i => i.id !== selectedItemId.value);
                    selectedItemId.value = null;
                }
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

        const getGridCoords = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / 30);
            const y = Math.floor((e.clientY - rect.top) / 30);
            return { x, y };
        };

        const onGridMouseDown = (e) => {
            if (!activeSection.value || activeTool.value === 'erase') return;
            const { x, y } = getGridCoords(e);
            
            if (['floor', 'wall', 'door', 'elevator', 'stairs', 'ladder', 'tunnel'].includes(activeTool.value)) {
                saveHistory();
                const newItem = {
                    id: 'obj_' + Date.now(),
                    type: activeTool.value,
                    x, y, w: 1, h: 1
                };
                activeSection.value.items.push(newItem);
                selectedItemId.value = newItem.id;
                interaction.value = {
                    active: true,
                    mode: 'draw',
                    itemId: newItem.id,
                    startX: x,
                    startY: y,
                    origX: x,
                    origY: y,
                    origW: 1,
                    origH: 1
                };
            }
            else if (activeTool.value === 'select') {
                let clickedItem = null;
                for (let i = activeSection.value.items.length - 1; i >= 0; i--) {
                    const item = activeSection.value.items[i];
                    if (x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h) {
                        clickedItem = item;
                        break;
                    }
                }
                
                selectedItemId.value = clickedItem ? clickedItem.id : null;
                
                if (clickedItem) {
                    interaction.value = {
                        active: true,
                        mode: 'move',
                        itemId: clickedItem.id,
                        startX: x,
                        startY: y,
                        origX: clickedItem.x,
                        origY: clickedItem.y,
                        origW: clickedItem.w,
                        origH: clickedItem.h
                    };
                }
            }
        };
        
        const onResizeMouseDown = (e, item) => {
            e.stopPropagation();
            if (activeTool.value !== 'select') return;
            selectedItemId.value = item.id;
            const gridEl = document.getElementById('deck-grid-canvas');
            if (!gridEl) return;
            const gridRect = gridEl.getBoundingClientRect();
            const x = Math.floor((e.clientX - gridRect.left) / 30);
            const y = Math.floor((e.clientY - gridRect.top) / 30);
            
            interaction.value = {
                active: true,
                mode: 'resize',
                itemId: item.id,
                startX: x,
                startY: y,
                origX: item.x,
                origY: item.y,
                origW: item.w,
                origH: item.h
            };
        };

        const onGridMouseMove = (e) => {
            if (!interaction.value.active || !activeSection.value) return;
            const { x, y } = getGridCoords(e);
            const item = activeSection.value.items.find(i => i.id === interaction.value.itemId);
            if (!item) return;

            if (interaction.value.mode === 'draw' || interaction.value.mode === 'resize') {
                let newX = Math.min(interaction.value.origX, x);
                let newY = Math.min(interaction.value.origY, y);
                let newW = Math.abs(x - interaction.value.origX) + 1;
                let newH = Math.abs(y - interaction.value.origY) + 1;
                
                if (interaction.value.mode === 'resize') {
                    newX = interaction.value.origX;
                    newY = interaction.value.origY;
                    newW = Math.max(1, x - newX + 1);
                    newH = Math.max(1, y - newY + 1);
                }

                item.x = Math.max(0, Math.min(newX, activeSection.value.width - newW));
                item.y = Math.max(0, Math.min(newY, activeSection.value.height - newH));
                item.w = newW;
                item.h = newH;
            } 
            else if (interaction.value.mode === 'move') {
                const dx = x - interaction.value.startX;
                const dy = y - interaction.value.startY;
                item.x = Math.max(0, Math.min(interaction.value.origX + dx, activeSection.value.width - item.w));
                item.y = Math.max(0, Math.min(interaction.value.origY + dy, activeSection.value.height - item.h));
            }
        };

        const onGridMouseUp = () => {
            if (interaction.value.active) {
                interaction.value.active = false;
            }
        };

        const onItemClick = (e, item) => {
            if (activeTool.value === 'erase') {
                saveHistory();
                activeSection.value.items = activeSection.value.items.filter(i => i.id !== item.id);
            }
        };

        const unplacedComponents = computed(() => {
            if (!activeSectionId.value) return [];
            const placedIds = new Set();
            store.deckPlan.decks.forEach(d => {
                if (d.sections) {
                    d.sections.forEach(s => {
                        if (s.items) s.items.forEach(i => {
                            if (i.type === 'component') placedIds.add(i.instanceId);
                        });
                    });
                }
            });
            return store.installedComponents.filter(c => 
                !placedIds.has(c.instanceId) && 
                c.location === activeSectionId.value && 
                c.location !== 'Distributed'
            );
        });

        const getName = (instance) => {
            const id = instance.defId || instance;
            const def = store.allEquipment.find(e => e.id === id);
            return def ? (getLocalizedName(def) || def.id) : (id || 'Unknown');
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
                
                const newItem = {
                    id: 'obj_' + Date.now(),
                    type: 'component',
                    instanceId: instanceId,
                    x, y, w: 1, h: 1
                };
                activeSection.value.items.push(newItem);
                selectedItemId.value = newItem.id;
            }
        };

        const getItemStyle = (item, gridSize = 30) => {
            return {
                position: 'absolute',
                left: (item.x * gridSize) + 'px',
                top: (item.y * gridSize) + 'px',
                width: (item.w * gridSize) + 'px',
                height: (item.h * gridSize) + 'px',
                border: selectedItemId.value === item.id ? '2px solid yellow' : '1px solid rgba(255,255,255,0.2)',
                boxSizing: 'border-box',
                cursor: activeTool.value === 'erase' ? 'crosshair' : (activeTool.value === 'select' ? 'move' : 'default'),
                zIndex: item.type === 'component' ? 10 : (item.type === 'floor' ? 1 : 5),
                backgroundColor: getItemColor(item.type),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                color: '#fff',
                fontSize: gridSize === 30 ? '10px' : '6px',
                textAlign: 'center',
                userSelect: 'none'
            };
        };

        const getItemColor = (type) => {
            if (type === 'floor') return 'rgba(100, 100, 100, 0.5)';
            if (type === 'wall') return 'rgba(50, 50, 50, 1)';
            if (type === 'door') return 'rgba(0, 255, 0, 0.5)';
            if (type === 'elevator') return 'rgba(0, 100, 255, 0.5)';
            if (type === 'stairs') return 'rgba(150, 150, 0, 0.5)';
            if (type === 'ladder') return 'rgba(150, 50, 0, 0.5)';
            if (type === 'tunnel') return 'rgba(100, 0, 150, 0.5)';
            if (type === 'component') return 'rgba(75, 181, 193, 0.8)';
            return 'rgba(255, 0, 0, 0.5)';
        };

        const masterMapLayout = computed(() => {
            const size = store.chassis.size || '';
            const baseHull = store.chassis.baseHull || 0;
            let rows = [];
            
            if (size.startsWith('Small')) {
                if (baseHull <= 20) rows = [['Fore'], ['Aft']];
                else rows = [['Fore'], ['Fore Center'], ['Aft Center'], ['Aft']];
            } else if (size.startsWith('Light')) {
                rows = [['Fore'], ['Port', 'Fore Center', 'Starboard'], ['Aft Center'], ['Aft']];
            } else if (size.startsWith('Medium')) {
                rows = [['Fore'], ['Fore Port', 'Fore Center', 'Fore Starboard'], ['Aft Port', 'Aft Center', 'Aft Starboard'], ['Aft']];
            } else if (size.startsWith('Heavy')) {
                rows = [['Fore'], ['Fore Port', 'Fore Center', 'Fore Starboard'], ['Port', 'Center Fore', 'Starboard'], ['Aft Port', 'Center Aft', 'Aft Starboard'], ['Aft']];
            } else if (size.startsWith('Super') || size.startsWith('Colossal')) {
                rows = [
                    ['Fore'], 
                    ['Far Fore Port', 'Far Fore Center', 'Far Fore Starboard'], 
                    ['Fore Port', 'Fore Center', 'Fore Starboard'], 
                    ['Port Center', 'Center Fore', 'Starboard Center'], 
                    ['Port', 'Center Aft', 'Starboard'], 
                    ['Aft Port', 'Aft Center', 'Aft Starboard'], 
                    ['Far Aft Port', 'Far Aft Center', 'Far Aft Starboard'], 
                    ['Aft']
                ];
            } else {
                rows = [['Fore'], ['Aft']];
            }

            if (activeDeck.value) {
                const custom = [];
                const predefined = new Set(rows.flat());
                activeDeck.value.sections.forEach(s => {
                    if (!predefined.has(s.id) && s.id !== 'Distributed') {
                        custom.push(s.id);
                    }
                });
                if (custom.length > 0) {
                    rows.push(custom);
                }
            }
            return rows;
        });

        return {
            store, activeDeckId, activeSectionId, activeDeck, activeSection, 
            tools, activeTool, unplacedComponents, getName, showMasterMap, masterMapLayout,
            addDeck, updateDeckSize, undo, deckWidth, deckHeight,
            onGridMouseDown, onGridMouseMove, onGridMouseUp, onResizeMouseDown, onItemClick,
            startComponentDrag, onDropGrid, getItemStyle, selectedItemId
        };
    },
    template: `
    <div class="row fit q-pa-md">
        
        <!-- SIDEBAR -->
        <div class="col-12 col-md-3 q-pr-md flex column">
            <q-card dark class="bg-grey-9 q-mb-md">
                <q-card-section>
                    <div class="row justify-between items-center">
                        <div class="text-h6 text-primary">Floor Management</div>
                        <q-btn flat round icon="undo" color="info" size="sm" @click="undo"><q-tooltip>Undo (Ctrl+Z) or press Delete key to remove</q-tooltip></q-btn>
                    </div>
                    
                    <div v-if="activeDeck" class="q-mt-sm">
                        <q-input dark dense filled v-model="activeDeck.name" label="Floor Name" class="q-mb-sm"></q-input>
                        <q-select dark dense filled v-model="activeDeckId" :options="store.deckPlan.decks" option-value="id" option-label="name" emit-value map-options class="q-mb-sm"></q-select>
                    </div>
                    <q-btn outline color="secondary" icon="add" label="New Floor" class="full-width" @click="addDeck"></q-btn>
                    
                    <div class="q-mt-md text-subtitle2 text-accent">Sections</div>
                    <q-select v-if="activeDeck" dark dense filled v-model="activeSectionId" :options="activeDeck.sections" option-value="id" option-label="name" emit-value map-options class="q-mt-sm"></q-select>
                    
                    <div v-if="activeSection" class="q-mt-sm q-pa-sm bg-dark rounded-borders">
                        <div class="row q-col-gutter-sm items-center">
                            <div class="col-4">
                                <q-input dark dense filled type="number" v-model.number="deckWidth" label="Width"></q-input>
                            </div>
                            <div class="col-4">
                                <q-input dark dense filled type="number" v-model.number="deckHeight" label="Height"></q-input>
                            </div>
                            <div class="col-4">
                                <q-btn color="primary" class="full-width" @click="updateDeckSize">Resize</q-btn>
                            </div>
                        </div>
                    </div>
                </q-card-section>
            </q-card>
            
            <q-card dark class="bg-grey-9 q-mb-md">
                <q-card-section>
                    <div class="row justify-between items-center">
                        <div class="text-h6 text-primary">Tools</div>
                        <q-toggle v-model="showMasterMap" label="Master Map" color="accent" />
                    </div>
                    <div v-if="!showMasterMap" class="q-mt-sm row q-col-gutter-sm">
                        <div class="col-12"><q-btn :color="activeTool === 'select' ? 'accent' : 'grey-8'" class="full-width" @click="activeTool = 'select'">Select / Move / Resize</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'floor' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'floor'">+ Floor</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'wall' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'wall'">+ Wall</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'door' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'door'">+ Door</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'elevator' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'elevator'">+ Elevator</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'stairs' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'stairs'">+ Stairs</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'ladder' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'ladder'">+ Ladder</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'tunnel' ? 'primary' : 'grey-8'" class="full-width" @click="activeTool = 'tunnel'">+ Tunnel</q-btn></div>
                        <div class="col-6"><q-btn :color="activeTool === 'erase' ? 'negative' : 'grey-8'" class="full-width" @click="activeTool = 'erase'">Erase (Click Item)</q-btn></div>
                    </div>
                </q-card-section>
            </q-card>
            
            <q-card dark class="bg-grey-9 col flex column" v-if="!showMasterMap">
                <q-card-section class="q-pb-none">
                    <div class="text-h6 text-primary">Unplaced Components</div>
                    <div class="text-caption text-grey-5">Showing systems assigned to {{ activeSectionId }}</div>
                </q-card-section>
                <q-card-section class="col" style="overflow-y: auto;">
                    <div v-if="unplacedComponents.length === 0" class="text-grey text-center q-mt-md">No unplaced systems in this section.</div>
                    <div v-for="c in unplacedComponents" :key="c.instanceId" 
                         class="draggable-item bg-dark q-pa-sm q-mb-sm text-center" style="border: 1px solid #4BB5C1; cursor: grab; user-select: none;"
                         draggable="true" @dragstart="startComponentDrag($event, c)">
                        {{ getName(c) }}
                    </div>
                </q-card-section>
            </q-card>
        </div>
        
        <!-- MAIN CANVAS/GRID -->
        <div class="col-12 col-md-9" style="overflow: auto; background-color: #000; border: 2px solid #4BB5C1; position: relative;" @mouseleave="onGridMouseUp" @mouseup="onGridMouseUp">
            
            <!-- MASTER MAP MODE -->
            <div v-if="showMasterMap && activeDeck" class="q-pa-lg flex flex-center column">
                <div v-for="(row, rIdx) in masterMapLayout" :key="'row'+rIdx" class="row justify-center q-gutter-md q-mb-md">
                    <div v-for="secId in row" :key="secId">
                        <div class="text-center text-subtitle2 text-info q-mb-sm">{{ secId }}</div>
                        <div v-if="activeDeck.sections.find(s => s.id === secId)" 
                             :style="{ position: 'relative', width: (activeDeck.sections.find(s => s.id === secId).width * 20) + 'px', height: (activeDeck.sections.find(s => s.id === secId).height * 20) + 'px' }"
                             style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 20px 20px; border: 1px solid #4BB5C1;">
                             
                             <div v-for="item in activeDeck.sections.find(s => s.id === secId).items" :key="'mi'+item.id" :style="getItemStyle(item, 20)">
                                 <span v-if="item.type === 'component'" style="font-size: 6px;">{{ getName(store.installedComponents.find(c => c.instanceId === item.instanceId)) }}</span>
                                 <span v-else-if="item.type !== 'floor' && item.type !== 'wall'" style="font-size: 6px; text-transform: uppercase;">{{ item.type }}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- EDITING MODE (VECTOR OBJECTS) -->
            <div v-else-if="activeSection" 
                 id="deck-grid-canvas"
                 :style="{ position: 'relative', width: (activeSection.width * 30) + 'px', height: (activeSection.height * 30) + 'px' }"
                 style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 30px 30px;"
                 @mousedown="onGridMouseDown"
                 @mousemove="onGridMouseMove"
                 @dragover.prevent
                 @drop="onDropGrid">
                 
                 <div v-for="item in activeSection.items" :key="item.id" 
                      :style="getItemStyle(item, 30)"
                      @mousedown="e => onItemClick(e, item)">
                     
                     <span v-if="item.type === 'component'">{{ getName(store.installedComponents.find(c => c.instanceId === item.instanceId)) }}</span>
                     <span v-else-if="item.type !== 'floor' && item.type !== 'wall'" style="text-transform: uppercase;">{{ item.type }}</span>
                     
                     <!-- Resize Handle (bottom right) -->
                     <div v-if="selectedItemId === item.id && activeTool === 'select'" 
                          @mousedown="e => onResizeMouseDown(e, item)"
                          style="position: absolute; right: 0; bottom: 0; width: 10px; height: 10px; background-color: yellow; cursor: nwse-resize; z-index: 20;">
                     </div>
                 </div>
            </div>
        </div>
        
    </div>
    `
};
"""

with open("/home/dimble/WebstormProjects/starship-architect/public/warships/js/deckplan.js", "w") as f:
    f.write(content)
