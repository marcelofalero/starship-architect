import { useShipStore } from './store.js?v=2.1';
import { i18n, getLocalizedName } from './i18n.js?v=2.1';
import { StatPanelWrapper, SystemListWrapper, ConfigPanelWrapper, ShipSheetWrapper, HangarDialog, AddModDialog, CustomManagerDialog, CustomComponentDialog, CustomShipDialog } from './components.js?v=2.2';
import { initTutorial } from './tutorial.js?v=2.1';

const { createApp, ref, onMounted } = Vue;
const { createPinia } = Pinia;
const { useQuasar } = Quasar;
const { useI18n } = VueI18n;

// Main App Setup
const setup = () => {
    const $q = useQuasar();
    const { locale } = useI18n();
    const shipStore = useShipStore();

    const centerTab = ref('systems');
    const mobileTab = ref('overview');

    // Hangar Dialog State (Parent controlled)
    const showHangarDialog = ref(false);

    const leftDrawerOpen = ref(false);
    const rightDrawerOpen = ref(false);
    const showSheetDialog = ref(false);

    onMounted(() => {
        const saved = localStorage.getItem('swse_architect_current_build');
        if (saved) {
            try { shipStore.loadState(JSON.parse(saved)); }
            catch(e) { console.error("Save corruption", e); shipStore.createNew('light_fighter'); }
        } else {
            shipStore.createNew('light_fighter');
        }

        // Initialize Tutorial
        setTimeout(() => {
            initTutorial({
                setMobileTab: (tab) => mobileTab.value = tab,
                openLeftDrawer: () => leftDrawerOpen.value = true,
                openRightDrawer: () => rightDrawerOpen.value = true,
                isMobile: () => !$q.screen.gt.sm
            });
        }, 500);
    });

    // Toolbar Logic
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

    const triggerPrint = () => {
        window.focus();
        setTimeout(() => {
            window.print();
        }, 200);
    };

    const toggleLang = () => { locale.value = locale.value === 'en' ? 'es' : 'en'; };
    const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

    return {
        shipStore, centerTab, mobileTab, showHangarDialog, showSheetDialog,
        leftDrawerOpen, rightDrawerOpen,
        toggleLang, handleFileUpload, exportYaml, printSheet, openSheetPreview, triggerPrint, formatCreds
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

        // Quasar Config with Rebels Theme
        app.use(Quasar, {
            config: {
                brand: {
                    primary: '#FF5722',   // Deep Orange (Rebels)
                    secondary: '#263238', // Dark Blue Grey
                    accent: '#FF9100',    // Orange Accent
                    dark: '#1d1d1d',
                    positive: '#21ba45',
                    negative: '#c10015',
                    info: '#31ccec',
                    warning: '#f2c037'
                }
            }
        });

        app.use(i18n);

        app.component('stat-panel', StatPanelWrapper);
        app.component('system-list', SystemListWrapper);
        app.component('config-panel', ConfigPanelWrapper);
        app.component('ship-sheet', ShipSheetWrapper);

        // New Components
        app.component('hangar-dialog', HangarDialog);
        app.component('add-mod-dialog', AddModDialog);
        app.component('custom-manager-dialog', CustomManagerDialog);
        app.component('custom-component-dialog', CustomComponentDialog);
        app.component('custom-ship-dialog', CustomShipDialog);

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
