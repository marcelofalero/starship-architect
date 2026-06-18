import { useShipStore } from './store.js?v=4.16';
import { i18n, getLocalizedName } from './i18n.js?v=3.1';
import { StatPanelWrapper, SystemListWrapper, ConfigPanelWrapper, ShipSheetWrapper, HangarDialog, AddModDialog, CustomManagerDialog, CustomComponentDialog, CustomShipDialog, LocationDiagramWrapper, HitLocationDiagramWrapper, ArcDiagramWrapper, ImageManagerDialog } from './components.js?v=4.15';
import { DeckPlanWrapper } from './deckplan.js?v=1.0';
import { initTutorial } from './tutorial.js?v=3.0';

const { createApp, ref, onMounted, watch } = Vue;
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

    watch(centerTab, (newVal) => {
        if (newVal === 'deckplan') {
            leftDrawerOpen.value = false;
            rightDrawerOpen.value = false;
        } else {
            leftDrawerOpen.value = true;
            rightDrawerOpen.value = true;
        }
    });

    onMounted(() => {
        shipStore.initHangar();

        const saved = localStorage.getItem('warships_architect_current_build');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.configuration && state.configuration.baseChassis) {
                    shipStore.loadState(state);
                } else {
                    showHangarDialog.value = true;
                }
            } catch(e) {
                console.error("Save corruption", e);
                showHangarDialog.value = true;
            }
        } else {
            showHangarDialog.value = true;
        }

        // Initialize Tutorial
        setTimeout(() => {
            initTutorial({
                firstRun: showHangarDialog.value,
                hasShip: !!shipStore.chassisId,
                setMobileTab: (tab) => mobileTab.value = tab,
                openLeftDrawer: () => leftDrawerOpen.value = true,
                openRightDrawer: () => rightDrawerOpen.value = true,
                isMobile: () => !$q.screen.gt.sm
            });
        }, 500);

        watch(() => shipStore.chassisId, (newVal) => {
            if (newVal) {
                setTimeout(() => {
                    initTutorial({
                        hasShip: true,
                        setMobileTab: (tab) => mobileTab.value = tab,
                        openLeftDrawer: () => leftDrawerOpen.value = true,
                        openRightDrawer: () => rightDrawerOpen.value = true,
                        isMobile: () => !$q.screen.gt.sm
                    });
                }, 500);
            }
        });
    });

    // Toolbar Logic
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const processYaml = (yamlString) => {
            try {
                const data = jsyaml.load(yamlString);
                shipStore.loadState(data);
                showHangarDialog.value = false;
                $q.notify({ type: 'positive', message: 'Ship loaded successfully' });
            } catch (error) {
                console.error(error);
                $q.notify({ type: 'negative', message: 'Failed to parse ship data' });
            }
        };

        if (file.name.endsWith('.ship') || file.name.endsWith('.zip')) {
            JSZip.loadAsync(file).then(zip => {
                const yamlFile = zip.file("ship.yaml");
                if (yamlFile) {
                    yamlFile.async("string").then(async yamlString => {
                        let data;
                        try { data = jsyaml.load(yamlString); } catch(e) { return $q.notify({ type: 'negative', message: 'Failed to parse ship.yaml' }); }
                        
                        if (data.shipImages && Array.isArray(data.shipImages)) {
                            for (let img of data.shipImages) {
                                if (img.file) {
                                    const imgFile = zip.file(img.file);
                                    if (imgFile) {
                                        const base64 = await imgFile.async("base64");
                                        const ext = img.file.split('.').pop();
                                        img.data = `data:image/${ext};base64,${base64}`;
                                    }
                                    delete img.file;
                                }
                            }
                        } else {
                            // Backwards compatibility for single image
                            const oldImg = zip.file("image.jpg") || zip.file("image.png");
                            if (oldImg) {
                                const base64 = await oldImg.async("base64");
                                const ext = oldImg.name.split('.').pop();
                                data.shipImages = [{ id: crypto.randomUUID(), data: `data:image/${ext};base64,${base64}`, caption: '', isHeader: true }];
                            }
                        }
                        
                        shipStore.loadState(data);
                        showHangarDialog.value = false;
                        $q.notify({ type: 'positive', message: 'Ship loaded successfully' });
                    });
                } else {
                    $q.notify({ type: 'negative', message: 'Invalid .ship archive (missing ship.yaml)' });
                }
            }).catch(err => {
                console.error(err);
                $q.notify({ type: 'negative', message: 'Failed to read .ship archive' });
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => processYaml(e.target.result);
            reader.readAsText(file);
        }
    };

    const exportYaml = async () => {
        const obj = JSON.parse(localStorage.getItem('warships_architect_current_build'));
        const zip = new JSZip();

        if (obj.shipImages && Array.isArray(obj.shipImages)) {
            obj.shipImages.forEach((img, i) => {
                if (img.data) {
                    const base64Data = img.data.split(',')[1];
                    const mimeType = img.data.split(';')[0].split(':')[1];
                    const ext = mimeType.split('/')[1] || 'jpg';
                    const filename = `image_${i}.${ext}`;
                    zip.file(filename, base64Data, {base64: true});
                    img.file = filename;
                    delete img.data; // Remove base64 string from YAML
                }
            });
        }

        const yamlStr = jsyaml.dump(obj);
        zip.file("ship.yaml", yamlStr);

        const blob = await zip.generateAsync({type:"blob"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ship_${obj.meta.name || 'untitled'}.ship`;
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
fetch('data.json?v=' + Date.now())
    .then(response => response.json())
    .then(data => {
        const app = createApp({
            setup
        });

        app.use(createPinia());

        // Quasar Config with AAA Theme
        app.use(Quasar, {
            config: {
                brand: {
                    primary: '#389EBD',   // AAA Cyan
                    secondary: '#4BB5C1', // Lighter Cyan
                    accent: '#59B7C7',    // Teal Accent
                    dark: '#001A33',      // AAA Navy Base
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
        app.component('location-diagram', LocationDiagramWrapper);
        app.component('hit-location-diagram', HitLocationDiagramWrapper);
        app.component('arc-diagram', ArcDiagramWrapper);
        app.component('image-manager-dialog', ImageManagerDialog);
        app.component('deck-plan', DeckPlanWrapper);

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
