import { useShipStore } from './store.js';
import { i18n, getLocalizedName } from './i18n.js';
import { StatPanelWrapper, SystemListWrapper, ConfigPanelWrapper, ShipSheetWrapper } from './components.js';

const { createApp, ref, computed, onMounted, reactive, watch } = Vue;
const { createPinia } = Pinia;
const { useQuasar } = Quasar;
const { useI18n } = VueI18n;

// Main App Setup
const setup = () => {
    const $q = useQuasar();
    const { t, locale } = useI18n();
    const shipStore = useShipStore();

    const centerTab = ref('systems');
    const mobileTab = ref('overview');
    const hangarTab = ref('stock');
    const showHangarDialog = ref(false);

    const leftDrawerOpen = ref(true);
    const rightDrawerOpen = ref(true);

    const newComponentCategory = ref(null);
    const newComponentGroup = ref(null);
    const newComponentSelection = ref(null);
    const newComponentNonStandard = ref(false);
    const fileInput = ref(null);
    const libraryInput = ref(null);
    const showSheetDialog = ref(false);

    // Custom Component State
    const newCustomComponent = reactive({
        name: '',
        category: 'Weapon Systems',
        group: '',
        type: 'weapon',
        baseCost: 0,
        baseEp: 0,
        sizeMult: false,
        stats: {}
    });
    const customStatToAdd = reactive({ key: 'sr', value: 0 });
    const statOptions = ['sr', 'armor', 'hp', 'speed', 'hyperdrive', 'dex_bonus', 'str_bonus', 'perception_bonus', 'ep_dynamic_pct', 'cargo_factor'];

    const stockFighters = computed(() => shipStore.db.STOCK_SHIPS.filter(s => ['Huge', 'Gargantuan'].includes(s.size)));
    const stockFreighters = computed(() => shipStore.db.STOCK_SHIPS.filter(s => s.name.includes('Freighter') || s.name === 'Shuttle'));
    const stockCapitals = computed(() => shipStore.db.STOCK_SHIPS.filter(s => s.size.includes('Colossal') && !s.name.includes('Freighter') && !s.name.includes('Shuttle')));

    const categoryOptions = computed(() => {
        const cats = [...new Set(shipStore.allEquipment.map(e => e.category))];
        return cats.map(c => ({ label: t('cat.' + (c === 'Weapon Systems' ? 'weapons' : c === 'Movement Systems' ? 'movement' : c === 'Defense Systems' ? 'defense' : c === 'Modifications' ? 'components' : 'accessories')), value: c }));
    });

    const groupOptions = computed(() => {
        if (!newComponentCategory.value) return [];
        const groups = [...new Set(shipStore.allEquipment.filter(e => e.category === newComponentCategory.value).map(e => e.group))];
        return groups.map(g => ({ label: g, value: g }));
    });

    const itemOptions = computed(() => {
        if (!newComponentGroup.value) return [];
        return shipStore.allEquipment.filter(e => e.group === newComponentGroup.value).map(e => ({
            ...e,
            label: getLocalizedName(e)
        }));
    });

    const selectedItemDef = computed(() => {
        if (!newComponentSelection.value) return null;
        return shipStore.allEquipment.find(e => e.id === newComponentSelection.value);
    });

    const isSizeValid = (itemDef) => {
        const shipIndex = shipStore.db.SIZE_RANK.indexOf(shipStore.chassis.size);

        if (itemDef.maxSize) {
            const rankIndex = shipStore.db.SIZE_RANK.indexOf(itemDef.maxSize);
            if (shipIndex > rankIndex) return false;
        }

        if (itemDef.minShipSize) {
            const minRankIndex = shipStore.db.SIZE_RANK.indexOf(itemDef.minShipSize);
            if (shipIndex < minRankIndex) return false;
        }

        return true;
    };

    const previewCost = computed(() => {
        if (!selectedItemDef.value) return 0;
        return shipStore.getComponentCost({ defId: selectedItemDef.value.id, miniaturization: 0, isStock: false, isNonStandard: newComponentNonStandard.value });
    });

    const previewEp = computed(() => {
        if (!selectedItemDef.value) return 0;
        return shipStore.getComponentEp({ defId: selectedItemDef.value.id, miniaturization: 0, isStock: false, isNonStandard: newComponentNonStandard.value });
    });

    const resetGroup = () => { newComponentGroup.value = null; newComponentSelection.value = null; };
    const toggleLang = () => { locale.value = locale.value === 'en' ? 'es' : 'en'; };

    // Watch for Custom Dialog Open/Edit
    watch(() => shipStore.customDialogState.visible, (visible) => {
        if (visible && shipStore.customDialogState.componentId) {
             const existing = shipStore.customComponents.find(c => c.id === shipStore.customDialogState.componentId);
             if (existing) {
                 Object.assign(newCustomComponent, {
                     name: existing.name,
                     category: existing.category,
                     group: existing.group,
                     type: existing.type,
                     baseCost: existing.baseCost,
                     baseEp: existing.baseEp,
                     sizeMult: existing.sizeMult,
                     stats: { ...existing.stats }
                 });
             }
        } else if (!visible) {
             // Reset on close
             Object.assign(newCustomComponent, { name: '', category: 'Weapon Systems', group: '', type: 'weapon', baseCost: 0, baseEp: 0, sizeMult: false, stats: {} });
             shipStore.customDialogState.componentId = null;
        }
    });

    onMounted(() => {
        const saved = localStorage.getItem('swse_architect_current_build');
        if (saved) {
            try { shipStore.loadState(JSON.parse(saved)); }
            catch(e) { console.error("Save corruption", e); shipStore.createNew('light_fighter'); }
        } else {
            shipStore.createNew('light_fighter');
        }
    });

    const installComponent = () => {
        if(newComponentSelection.value) {
            const def = shipStore.allEquipment.find(e => e.id === newComponentSelection.value);

            const doInstall = () => {
                let loc = 'Installed';
                if (def) {
                    if (def.type === 'weapon') loc = 'Hardpoint'; else if (def.type === 'system') loc = 'Internal Bay'; else if (def.type === 'cargo') loc = 'Cargo Hold'; else if (def.type === 'modification') loc = 'Hull Config'; else if (def.type === 'engine') loc = 'Aft Section';
                }
                shipStore.addComponent(newComponentSelection.value, loc, newComponentNonStandard.value);
                newComponentSelection.value = null;
                newComponentNonStandard.value = false;
            };

            if (def && !isSizeValid(def)) {
                $q.dialog({
                    dark: true,
                    title: 'Warning',
                    message: 'This component is not compatible with the ship\'s size class. Install anyway?',
                    cancel: true,
                    persistent: true,
                    color: 'warning'
                }).onOk(() => {
                    doInstall();
                });
            } else {
                doInstall();
            }
        }
    };

    const selectStockShip = (id) => { shipStore.createNew(id); showHangarDialog.value = false; }
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = jsyaml.load(e.target.result);
                shipStore.loadState(data);
                showHangarDialog.value = false;
                $q.notify({ type: 'positive', message: 'Ship loaded successfully' });
            } catch (error) {
                console.error(error);
                $q.notify({ type: 'negative', message: 'Failed to parse file' });
            }
        };
        reader.readAsText(file);
    };

    const exportYaml = () => {
        const obj = JSON.parse(localStorage.getItem('swse_architect_current_build'));
        const yamlStr = jsyaml.dump(obj);
        const blob = new Blob([yamlStr], {type: 'text/yaml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ship_${obj.meta.name || 'untitled'}.yaml`;
        a.click();
    };

    const printSheet = () => { window.print(); };
    const openSheetPreview = () => { showSheetDialog.value = true; };

    // Enhanced Print Trigger with focus and delay for better reliability
    const triggerPrint = () => {
        // Focus the window first (crucial for some browsers/iframes)
        window.focus();

        // Small timeout to ensure UI updates (like hiding buttons) have rendered
        setTimeout(() => {
            window.print();
        }, 200);
    };

    const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

    const createCustomComponent = () => {
        if (!newCustomComponent.name) return;

        const isEdit = !!shipStore.customDialogState.componentId;
        const id = isEdit ? shipStore.customDialogState.componentId : 'custom_' + crypto.randomUUID();

        const comp = {
            id,
            name: newCustomComponent.name,
            name_es: newCustomComponent.name,
            category: newCustomComponent.category,
            group: newCustomComponent.group || 'Custom',
            type: newCustomComponent.type,
            baseCost: Number(newCustomComponent.baseCost),
            baseEp: Number(newCustomComponent.baseEp),
            sizeMult: newCustomComponent.sizeMult,
            availability: 'Common',
            stats: { ...newCustomComponent.stats }
        };

        if (isEdit) {
            shipStore.updateCustomComponent(comp);
            shipStore.customDialogState.visible = false;
        } else {
            shipStore.addCustomComponent(comp);
            // Install it
            let loc = 'Installed';
            if (comp.type === 'weapon') loc = 'Hardpoint';
            else if (comp.type === 'system') loc = 'Internal Bay';
            else if (comp.type === 'cargo') loc = 'Cargo Hold';
            else if (comp.type === 'modification') loc = 'Hull Config';
            else if (comp.type === 'engine') loc = 'Aft Section';

            shipStore.addComponent(id, loc, false);
            shipStore.customDialogState.visible = false;
            shipStore.showAddComponentDialog = false;
        }
    };

    const handleLibraryImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    let count = 0;
                    data.forEach(item => {
                        // Basic Validation
                        if (item.name && item.type) {
                            // Assign new ID to avoid collisions
                            const newId = 'custom_' + crypto.randomUUID();
                            const comp = { ...item, id: newId };
                            shipStore.addCustomComponent(comp);
                            count++;
                        }
                    });
                    $q.notify({ type: 'positive', message: `Imported ${count} components.` });
                } else {
                    $q.notify({ type: 'negative', message: 'Invalid file format. Expected JSON array.' });
                }
            } catch (error) {
                console.error(error);
                $q.notify({ type: 'negative', message: 'Failed to parse JSON.' });
            }
        };
        reader.readAsText(file);
    };

    const addStatToCustomComponent = () => {
        if (customStatToAdd.key && customStatToAdd.value !== '') {
            newCustomComponent.stats[customStatToAdd.key] = Number(customStatToAdd.value);
            customStatToAdd.value = 0;
        }
    };
    const removeStatFromCustomComponent = (key) => {
        delete newCustomComponent.stats[key];
    };

    return {
        shipStore, centerTab, mobileTab, hangarTab, showHangarDialog, showSheetDialog,
        leftDrawerOpen, rightDrawerOpen,
        newComponentCategory, newComponentGroup, newComponentSelection, newComponentNonStandard,
        categoryOptions, groupOptions, itemOptions, selectedItemDef, previewCost, previewEp, resetGroup, isSizeValid,
        fileInput, libraryInput, stockFighters, stockFreighters, stockCapitals, getLocalizedName, toggleLang,
        installComponent, selectStockShip, handleFileUpload, exportYaml, printSheet, openSheetPreview, triggerPrint, formatCreds,
        newCustomComponent, customStatToAdd, statOptions, createCustomComponent, addStatToCustomComponent, removeStatFromCustomComponent, handleLibraryImport
    };
};

// Fetch Data and Mount
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        const app = createApp({
            setup
        });

        app.use(createPinia());
        app.use(Quasar);
        app.use(i18n);

        app.component('stat-panel', StatPanelWrapper);
        app.component('system-list', SystemListWrapper);
        app.component('config-panel', ConfigPanelWrapper);
        app.component('ship-sheet', ShipSheetWrapper);

        // Initialize Store with Data
        const store = useShipStore();
        store.initDb(data);

        app.mount('#q-app');

        // Remove loading screen
        const loading = document.getElementById('app-loading');
        if (loading) loading.remove();
        document.getElementById('q-app').style.display = 'block';
    })
    .catch(err => console.error("Failed to load data.json", err));
