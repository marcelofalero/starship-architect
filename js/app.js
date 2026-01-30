import { useShipStore } from './store.js';
import { i18n, getLocalizedName } from './i18n.js';
import { StatPanelWrapper, SystemListWrapper, ConfigPanelWrapper, ShipSheetWrapper } from './components.js';

const { createApp, ref, computed, onMounted } = Vue;
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

    const newComponentCategory = ref(null);
    const newComponentGroup = ref(null);
    const newComponentSelection = ref(null);
    const newComponentNonStandard = ref(false);
    const fileInput = ref(null);
    const showSheetDialog = ref(false);

    const stockFighters = computed(() => shipStore.db.STOCK_SHIPS.filter(s => ['Huge', 'Gargantuan'].includes(s.size)));
    const stockFreighters = computed(() => shipStore.db.STOCK_SHIPS.filter(s => s.name.includes('Freighter') || s.name === 'Shuttle'));
    const stockCapitals = computed(() => shipStore.db.STOCK_SHIPS.filter(s => s.size.includes('Colossal') && !s.name.includes('Freighter') && !s.name.includes('Shuttle')));

    const categoryOptions = computed(() => {
        const cats = [...new Set(shipStore.db.EQUIPMENT.map(e => e.category))];
        return cats.map(c => ({ label: t('cat.' + (c === 'Weapon Systems' ? 'weapons' : c === 'Movement Systems' ? 'movement' : c === 'Defense Systems' ? 'defense' : c === 'Modifications' ? 'components' : 'accessories')), value: c }));
    });

    const groupOptions = computed(() => {
        if (!newComponentCategory.value) return [];
        const groups = [...new Set(shipStore.db.EQUIPMENT.filter(e => e.category === newComponentCategory.value).map(e => e.group))];
        return groups.map(g => ({ label: g, value: g }));
    });

    const itemOptions = computed(() => {
        if (!newComponentGroup.value) return [];
        return shipStore.db.EQUIPMENT.filter(e => e.group === newComponentGroup.value).map(e => ({
            ...e,
            label: getLocalizedName(e)
        }));
    });

    const selectedItemDef = computed(() => {
        if (!newComponentSelection.value) return null;
        return shipStore.db.EQUIPMENT.find(e => e.id === newComponentSelection.value);
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
            const def = shipStore.db.EQUIPMENT.find(e => e.id === newComponentSelection.value);
            let loc = 'Installed';
            if (def) {
                if (def.type === 'weapon') loc = 'Hardpoint'; else if (def.type === 'system') loc = 'Internal Bay'; else if (def.type === 'cargo') loc = 'Cargo Hold'; else if (def.type === 'modification') loc = 'Hull Config'; else if (def.type === 'engine') loc = 'Aft Section';
            }
            shipStore.addComponent(newComponentSelection.value, loc, newComponentNonStandard.value);
            newComponentSelection.value = null;
            newComponentNonStandard.value = false;
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

    return {
        shipStore, centerTab, mobileTab, hangarTab, showHangarDialog, showSheetDialog,
        newComponentCategory, newComponentGroup, newComponentSelection, newComponentNonStandard,
        categoryOptions, groupOptions, itemOptions, selectedItemDef, previewCost, previewEp, resetGroup, isSizeValid,
        fileInput, stockFighters, stockFreighters, stockCapitals, getLocalizedName, toggleLang,
        installComponent, selectStockShip, handleFileUpload, exportYaml, printSheet, openSheetPreview, triggerPrint, formatCreds
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
    })
    .catch(err => console.error("Failed to load data.json", err));
