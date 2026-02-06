import { useShipStore } from './store.js';
import { getLocalizedName, i18n } from './i18n.js';

const { computed, ref, reactive, watch } = Vue;
const { useI18n } = VueI18n;
const { useQuasar } = Quasar;

// --- BASE COMPONENTS ---
const StatPanel = {
    template: `
    <q-card class="bg-grey-9 text-white">
        <q-card-section>
            <div class="text-caption text-grey">{{ $t('ui.chassis') }}</div>
            <div class="text-h5 text-primary">{{ getLocalizedName(store.chassis) }}</div>
            <div class="q-mt-xs text-caption text-grey">{{ store.chassis.size }} Starship (x{{ store.sizeMultVal }})</div>
        </q-card-section>
        <q-separator dark />
        <q-card-section>
            <div class="row q-col-gutter-xs text-center">
                <div class="col-4"><div class="bg-grey-8 q-pa-xs rounded-borders"><div>{{ $t('stats.str') }}</div><div class="text-bold">{{ store.currentStats.str }}</div></div></div>
                <div class="col-4"><div class="bg-grey-8 q-pa-xs rounded-borders"><div>{{ $t('stats.dex') }}</div><div class="text-bold">{{ store.currentStats.dex }}</div></div></div>
                <div class="col-4"><div class="bg-grey-8 q-pa-xs rounded-borders"><div>{{ $t('stats.int') }}</div><div class="text-bold">{{ store.currentStats.int }}</div></div></div>
            </div>
            <div class="row q-mt-sm">
                <div class="col-12 row justify-between items-center q-pa-xs bg-primary rounded-borders"><span>{{ $t('stats.ref') }}</span><span class="text-h6">{{ store.reflexDefense }}</span></div>
            </div>
                <div class="row q-mt-xs text-center"><div class="col-12"><div class="bg-grey-8 q-pa-xs">{{ $t('stats.armor') }} +{{ store.currentStats.armor }}</div></div></div>
            <div class="row q-mt-xs q-col-gutter-xs">
                <div class="col-6"><div class="bg-grey-8 q-pa-xs text-center"><div>{{ $t('stats.hp') }}</div><div class="text-bold text-positive">{{ store.currentStats.hp }}</div></div></div>
                <div class="col-6"><div class="bg-grey-8 q-pa-xs text-center"><div>{{ $t('stats.shields') }}</div><div :class="store.isSrIllegal ? 'text-bold text-negative' : 'text-bold text-cyan'">{{ store.currentStats.sr }} <q-tooltip v-if="store.isSrIllegal" class="bg-negative">Max SR: {{ store.maxSrAllowed }}</q-tooltip></div></div></div>
                <div class="col-6"><div class="bg-grey-8 q-pa-xs text-center"><div>{{ $t('stats.dr') }}</div><div class="text-bold">{{ store.currentStats.dr }}</div></div></div>
                <div class="col-6"><div class="bg-grey-8 q-pa-xs text-center"><div>{{ $t('stats.speed') }}</div><div class="text-bold">{{ store.currentStats.speed }}</div></div></div>
            </div>
        </q-card-section>
    </q-card>
    `,
    setup() { return {}; }
};

const SystemList = {
    template: `
    <div class="q-pa-md col column">
        <div class="row justify-between items-center q-mb-md"><div class="text-h6">{{ $t('ui.installed_systems') }}</div><q-btn round color="positive" icon="add" size="sm" @click="store.showAddComponentDialog = true" /></div>
        <q-scroll-area class="col"><q-list separator dark>
            <q-item v-for="component in store.installedComponents" :key="component.instanceId">
                <q-item-section avatar><q-icon :name="getIcon(component.defId)" color="primary" /></q-item-section>
                <q-item-section>
                    <q-item-label>
                        {{ getName(component) }}
                        <q-badge v-if="isCustom(component.defId)" color="purple" label="Custom" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component) === 'Illegal'" color="deep-purple" label="Ill" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component) === 'Military'" color="negative" label="Mil" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component) === 'Restricted'" color="warning" text-color="black" label="Res" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component) === 'Licensed'" color="info" label="Lic" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component) === 'Common' && !isCustom(component.defId)" color="positive" label="Com" class="q-ml-xs" />
                        <q-badge v-if="component.isStock" color="grey-7" label="Stock" class="q-ml-xs" />
                        <q-badge v-if="component.isNonStandard" color="warning" text-color="black" :label="$t('ui.ns_tag')" class="q-ml-xs" />
                        <q-icon v-if="!checkValidity(component)" name="warning" color="negative" class="q-ml-sm"><q-tooltip>Invalid for Ship Size</q-tooltip></q-icon>
                    </q-item-label>
                    <q-item-label caption class="text-grey-5">
                        <span v-if="getEpDynamic(component.defId)" class="text-positive">+{{ Math.abs(getEpDynamic(component.defId)) }} EP</span>
                        <span v-else-if="store.getComponentEp(component) !== 0">{{ store.getComponentEp(component) }} EP</span>
                        <span v-else>{{ component.location }}</span>
                    </q-item-label>
                    <q-item-label v-if="component.modifications" caption class="text-info">
                        <span v-if="component.modifications.mount && component.modifications.mount !== 'single'" class="q-mr-xs text-uppercase">{{ component.modifications.mount }}</span>
                        <span v-if="component.modifications.fireLink > 1" class="q-mr-xs">Fire-Linked ({{ component.modifications.fireLink }})</span>
                        <span v-if="component.modifications.enhancement && component.modifications.enhancement !== 'normal'" class="q-mr-xs text-capitalize">{{ component.modifications.enhancement }}</span>
                        <span v-if="getUpgradeSpecs(component.defId)?.payload?.type === 'capacity' && component.modifications.payloadCount > 0" class="q-mr-xs">Payload: {{ getUpgradeSpecs(component.defId).payload.base }} + {{ component.modifications.payloadCount }}</span>
                        <span v-else-if="component.modifications.payloadOption" class="q-mr-xs">Extra Payload</span>
                        <span v-if="component.modifications.batteryCount > 1">Battery ({{ component.modifications.batteryCount }})</span>
                        <span v-if="component.modifications.quantity > 1"> (x{{ component.modifications.quantity }})</span>
                        <div v-if="component.modifications.weaponUser" class="text-caption text-grey-5">{{ component.modifications.weaponUser }}</div>
                    </q-item-label>
                </q-item-section>
                <q-item-section side>
                    <div class="text-right q-mr-sm">
                        <div class="text-caption text-amber">
                            <span v-if="isVariableCost(component.defId)" class="text-italic">{{ $t('ui.variable') }}</span>
                            <span v-else>{{ format(store.getComponentCost(component)) }}</span>
                        </div>
                    </div>
                    <div class="row items-center">
                        <q-badge v-if="component.miniaturization > 0" color="orange" label="Mini" class="q-mr-xs" />
                        <q-btn v-if="hasUpgrades(component.defId)" flat round icon="settings" color="accent" size="sm" @click="openConfig(component)" />
                        <q-btn flat round icon="delete" color="negative" size="sm" @click="store.removeComponent(component.instanceId)" />
                    </div>
                </q-item-section>
            </q-item>
            <div v-if="store.installedComponents.length === 0" class="text-center text-grey q-pa-lg">No systems installed.</div>
        </q-list></q-scroll-area>
        <q-dialog v-model="showConfigDialog">
            <q-card class="bg-grey-9 text-white" style="min-width: 350px">
                <q-card-section><div class="text-h6">Configure System</div></q-card-section>
                <q-card-section v-if="editingComponent">
                    <div v-if="isWeapon(editingComponent.defId)" class="q-mb-md">
                        <div class="text-caption">Weapon User</div>
                        <q-btn-toggle spread dark v-model="editingComponent.modifications.weaponUser" toggle-color="primary" :options="[{label: 'Pilot', value: 'Pilot'}, {label: 'Copilot', value: 'Copilot'}, {label: 'Gunner', value: 'Gunner'}]" />
                    </div>
                    <div v-if="hasUpgrades(editingComponent.defId)" class="q-mb-md">
                        <div class="q-gutter-y-md">
                            <div v-if="canMount(editingComponent.defId)">
                                <div class="text-caption q-mb-xs">Mount: <span class="text-white">{{ configModel.mountLabel }}</span></div>
                                <q-slider dark v-model="configModel.mountIndex" :min="0" :max="2" :step="1" snap markers label />
                            </div>
                            <div v-if="canFireLink(editingComponent.defId)">
                                <div class="text-caption q-mb-xs">Fire Link: <span class="text-white">{{ configModel.fireLinkLabel }}</span></div>
                                <q-slider dark v-model="configModel.fireLinkIndex" :min="0" :max="2" :step="1" snap markers label />
                            </div>
                            <div v-if="canEnhance(editingComponent.defId)">
                                <div class="text-caption q-mb-xs">Enhancement: <span class="text-white">{{ configModel.enhancementLabel }}</span></div>
                                <q-slider dark v-model="configModel.enhancementIndex" :min="0" :max="2" :step="1" snap markers label />
                            </div>
                        </div>
                    </div>
                    <div v-if="getUpgradeSpecs(editingComponent.defId)?.payload" class="q-mb-md">
                        <div v-if="getUpgradeSpecs(editingComponent.defId).payload.type === 'capacity'">
                            <div class="text-caption">Additional {{ getUpgradeSpecs(editingComponent.defId).payload.unitLabel }} ({{ format(store.allEquipment.find(e => e.id === editingComponent.defId).baseCost * getUpgradeSpecs(editingComponent.defId).payload.costFactor) }} each)</div>
                            <q-input dark type="number" filled v-model.number="editingComponent.modifications.payloadCount" label="Additional Capacity" min="0" :max="(getUpgradeSpecs(editingComponent.defId).payload.max * (editingComponent.modifications.fireLink || 1)) - (getUpgradeSpecs(editingComponent.defId).payload.base * (editingComponent.modifications.fireLink || 1))" :hint="'Base: ' + (getUpgradeSpecs(editingComponent.defId).payload.base * (editingComponent.modifications.fireLink || 1)) + ' | Max Total: ' + (getUpgradeSpecs(editingComponent.defId).payload.max * (editingComponent.modifications.fireLink || 1))" />
                        </div>
                        <q-checkbox v-else dark v-model="editingComponent.modifications.payloadOption" :label="getUpgradeSpecs(editingComponent.defId).payload.label + ' (' + format(getUpgradeSpecs(editingComponent.defId).payload.cost) + ')'" />
                    </div>
                    <div v-if="canBattery(editingComponent.defId) && (!editingComponent.modifications.fireLink || editingComponent.modifications.fireLink === 1)" class="q-mb-md">
                        <div class="text-caption">Battery Size ({{ editingComponent.modifications.batteryCount }})</div>
                        <q-slider dark v-model="editingComponent.modifications.batteryCount" :min="1" :max="6" :step="1" snap markers label />
                    </div>
                    <div v-if="getUpgradeSpecs(editingComponent.defId)?.quantity" class="q-mb-md">
                        <div class="text-caption">Quantity</div>
                        <q-input dark type="number" filled v-model.number="editingComponent.modifications.quantity" label="Quantity" min="1" />
                    </div>
                    <div v-if="getUpgradeSpecs(editingComponent.defId)?.fireLinkOption && (editingComponent.modifications.fireLink || 1) > 1" class="q-mb-md">
                        <q-checkbox dark v-model="editingComponent.modifications.fireLinkOption" :label="'Selective Fire (+' + format(getUpgradeSpecs(editingComponent.defId).fireLinkOption.cost) + ')'" />
                    </div>
                    <!-- Generic Options from componentOptions -->
                    <div v-for="opt in getGenericOptions(editingComponent.defId)" :key="opt.value" class="q-mb-md">
                         <q-checkbox dark v-model="editingComponent.modifications[opt.value]" :label="opt.label" />
                    </div>
                </q-card-section>
                <q-card-actions align="right">
                    <q-btn flat label="Close" color="primary" v-close-popup />
                </q-card-actions>
            </q-card>
        </q-dialog>
    </div>
    `,
    setup() { return {}; }
};

const ConfigPanel = {
    template: `
    <q-card class="bg-grey-9 text-white full-height column">
        <q-card-section class="col-auto">
            <q-input dark filled v-model="store.meta.name" :label="$t('ui.ship_name')" dense class="q-mb-md" />
            <div class="text-h6">{{ $t('ui.engineering') }}</div>
            <div class="row items-center">
                <q-toggle dark v-model="store.engineering.hasStarshipDesigner" :label="$t('ui.designer')" color="primary" />
                <q-btn flat round dense icon="info" size="xs" color="grey-5" class="q-ml-xs">
                    <q-tooltip content-class="bg-grey-9" max-width="250px">{{ $t('ui.starship_designer_tip') }}</q-tooltip>
                </q-btn>
            </div>
        </q-card-section>

        <q-separator dark />

        <q-card-section class="col-auto">
            <div class="text-h6">{{ $t('ui.ledger') }}</div>
            <div class="row justify-between text-grey-4"><span>{{ $t('ui.hull_base') }}</span><span>{{ format(store.hullCost) }}</span></div>
            <div class="row justify-between text-grey-4"><span>{{ $t('ui.systems') }}</span><span>{{ format(store.componentsCost) }}</span></div>
            <div class="row justify-between text-grey-4"><span>{{ $t('ui.lic_fees') }}</span><span>{{ format(store.licensingCost) }}</span></div>
            <q-separator dark class="q-my-xs" />
            <div class="row justify-between text-h6 text-primary"><span>{{ $t('ui.total') }}</span><span>{{ format(store.totalCost) }}</span></div>
            <div class="q-mt-md">
                <div class="row justify-between text-h6 items-center">
                    <span>{{ $t('ui.free_ep') }}</span>
                    <div class="row items-center">
                        <span :class="store.remainingEP < 0 ? 'text-negative' : 'text-amber'" class="q-mr-sm">{{ store.remainingEP }}</span>
                         <q-btn flat round icon="swap_horiz" size="sm" color="accent" @click="showEpDialog = true">
                            <q-tooltip>{{ $t('ui.convert_cargo_ep') }}</q-tooltip>
                        </q-btn>
                    </div>
                </div>
            </div>
        </q-card-section>

        <q-separator dark />

        <q-card-section class="col-auto">
            <div class="text-h6 q-mb-sm">{{ $t('ui.template') }}</div>
            <q-select filled dark v-model="store.activeTemplate" :options="templateOptions" :label="$t('ui.template')" emit-value map-options dense options-dense><template v-slot:prepend><q-icon name="layers" /></template></q-select>
        </q-card-section>

        <q-separator dark v-if="store.isAdmin" />
        <q-card-section v-if="store.isAdmin" class="col-auto">
             <q-btn outline color="accent" label="Download Data.json" @click="store.downloadDataJson" class="full-width" icon="download" />
        </q-card-section>
    </q-card>

    <q-dialog v-model="showEpDialog">
        <q-card class="bg-grey-9 text-white" style="min-width: 350px">
            <q-card-section>
                <div class="text-h6">{{ $t('ui.convert_cargo_ep') }}</div>
                <div class="text-caption text-grey">{{ $t('ui.cargo_to_ep_hint', { sizeMult: store.sizeMultVal }) }}</div>
            </q-card-section>

            <q-card-section>
                <div class="q-mb-sm">
                    <div class="row justify-between text-caption">
                        <span>{{ $t('ui.cargo_converted') }}: {{ store.cargoToEpAmount }} tons</span>
                        <span>{{ $t('ui.max_cargo') }}: {{ new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(store.maxCargoCapacity) }} tons</span>
                    </div>
                </div>
                <q-slider dark v-model="store.cargoToEpAmount" :min="0" :max="store.maxCargoCapacity" :step="store.sizeMultVal" label color="accent" />
                <div class="text-center q-mt-md text-positive text-h6">
                    +{{ Math.floor(store.cargoToEpAmount / store.sizeMultVal) }} EP
                </div>
            </q-card-section>

            <q-card-actions align="right">
                <q-btn flat :label="$t('ui.close')" color="primary" v-close-popup />
            </q-card-actions>
        </q-card>
    </q-dialog>
    `,
    setup() { return {}; }
};

const ShipSheet = {
    template: `
    <div class="swse-block">
        <div class="swse-header"><span>{{ store.meta.name || 'Untitled Ship' }}</span><span>CL {{ calculateCL }}</span></div>
        <div class="swse-sub">{{ store.chassis.size }} Starfighter ({{ getLocalizedName(store.chassis) }})</div>
        <div class="sheet-body">
            <div><span class="bold">Init</span> +{{ getMod(store.currentStats.dex) }}; <span class="bold">Senses</span> Perception +{{ getMod(store.currentStats.int) }}</div>

            <div class="section-title">Defense</div>
            <div><span class="bold">Ref</span> {{ store.reflexDefense }} (Flat-footed {{ store.reflexDefense - getMod(store.currentStats.dex) }}), <span class="bold">Fort</span> {{ 10 + getMod(store.currentStats.str) }}; <span class="bold">+{{ store.currentStats.armor }} Armor</span></div>
            <div><span class="bold">HP</span> {{ store.currentStats.hp }}; <span class="bold">DR</span> {{ store.currentStats.dr }}; <span class="bold">SR</span> {{ store.currentStats.sr }}; <span class="bold">Threshold</span> {{ store.currentStats.str + 10 }}</div>

            <div class="section-title">Offense</div>
            <div><span class="bold">Speed</span> fly {{ store.currentStats.speed }} squares (starship scale)</div>
            <div v-for="w in weapons" :key="w.instanceId" class="weapon-line"><span class="bold">Ranged</span> {{ getName(w) }} +5 ({{ getDmg(w) }})</div>

            <div class="section-title">Statistics</div>
            <div class="stat-grid">
                <div><span class="bold">Str</span> {{ store.currentStats.str }}</div>
                <div><span class="bold">Dex</span> {{ store.currentStats.dex }}</div>
                <div><span class="bold">Int</span> {{ store.currentStats.int }}</div>
            </div>
            <div><span class="bold">Base Atk</span> +2; <span class="bold">Grapple</span> +{{ 2 + (getMod(store.currentStats.str)) + (store.sizeMultVal > 1 ? 10 : 0) }}</div>

            <div class="section-title">Systems</div>
            <div>{{ systemNames }}</div>

            <div v-if="componentsWithDescriptions.length > 0">
                <div class="section-title">Special Equipment Rules</div>
                <div v-for="c in componentsWithDescriptions" :key="c.instanceId" class="q-mb-sm">
                    <span class="bold">{{ getName(c.defId) }}:</span> {{ getDescription(c.defId) }}
                </div>
            </div>

            <div class="section-title">Logistics</div>
            <div class="stat-grid">
                <div><span class="bold">Crew</span> {{ store.chassis.logistics.crew }}</div>
                <div><span class="bold">Passengers</span> {{ store.chassis.logistics.pass }}</div>
                <div><span class="bold">Cargo</span> {{ store.currentCargo }}</div>
                <div><span class="bold">Consumables</span> {{ store.chassis.logistics.cons }}</div>
            </div>

            <div class="cost-line">
                <span class="bold">Total Cost:</span> {{ formatCreds(store.totalCost) }} <span style="font-size: 0.8em;">(Inc. {{ formatCreds(store.licensingCost) }} fees)</span>
            </div>
        </div>
    </div>
    `,
    setup() { return {}; }
};

// --- NEW REFACTORED DIALOGS ---

export const HangarDialog = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
        <q-card class="bg-grey-9 text-white" style="min-width: 500px; max-width: 90vw;">
            <q-card-section><div class="text-h6">{{ $t('ui.hangar') }}</div></q-card-section>
            <q-tabs v-model="hangarTab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify">
                <q-tab name="stock" icon="factory" :label="$t('ui.new_stock')"></q-tab>
                <q-tab name="import" icon="upload_file" :label="$t('ui.import_file')"></q-tab>
            </q-tabs>
            <q-separator dark></q-separator>
            <q-tab-panels v-model="hangarTab" animated class="bg-grey-9">
                <q-tab-panel name="stock" style="height: 400px" class="q-pa-none">
                    <q-scroll-area class="full-height">
                        <q-list separator dark>
                            <q-item-label header class="text-grey-5">{{ $t('cat.fighters') }}</q-item-label>
                            <q-item clickable v-ripple v-for="ship in stockFighters" :key="ship.id" @click="selectStockShip(ship.id)"><q-item-section><q-item-label>{{ getLocalizedName(ship) }}</q-item-label><q-item-label caption class="text-grey-6">{{ ship.size }}</q-item-label></q-item-section><q-item-section side><q-btn flat round icon="chevron_right" color="primary" /></q-item-section></q-item>
                            <q-item-label header class="text-grey-5">{{ $t('cat.freighters') }}</q-item-label>
                            <q-item clickable v-ripple v-for="ship in stockFreighters" :key="ship.id" @click="selectStockShip(ship.id)"><q-item-section><q-item-label>{{ getLocalizedName(ship) }}</q-item-label><q-item-label caption class="text-grey-6">{{ ship.size }}</q-item-label></q-item-section><q-item-section side><q-btn flat round icon="chevron_right" color="primary" /></q-item-section></q-item>
                            <q-item-label header class="text-grey-5">{{ $t('cat.capitals') }}</q-item-label>
                            <q-item clickable v-ripple v-for="ship in stockCapitals" :key="ship.id" @click="selectStockShip(ship.id)"><q-item-section><q-item-label>{{ getLocalizedName(ship) }}</q-item-label><q-item-label caption class="text-grey-6">{{ ship.size }}</q-item-label></q-item-section><q-item-section side><q-btn flat round icon="chevron_right" color="primary" /></q-item-section></q-item>
                        </q-list>
                    </q-scroll-area>
                </q-tab-panel>
                <q-tab-panel name="import" style="height: 400px" class="column flex-center">
                    <q-icon name="upload_file" size="100px" color="grey-7" class="q-mb-md">{{ $t('ui.upload_yaml') }}</q-icon>
                    <div class="text-h6 q-mb-md">{{ $t('ui.upload_yaml') }}</div>
                    <input type="file" ref="fileInput" @change="handleFileUpload" accept=".yaml,.yml,.json" style="display: none" />
                    <q-btn color="primary" :label="$t('ui.select_file')" @click="triggerFileSelect"></q-btn>
                </q-tab-panel>
            </q-tab-panels>
        </q-card>
    </q-dialog>
    `,
    setup(props, { emit }) {
        const store = useShipStore();
        const $q = useQuasar();
        const hangarTab = ref('stock');
        const fileInput = ref(null);

        const stockFighters = computed(() => store.db.STOCK_SHIPS.filter(s => ['Huge', 'Gargantuan'].includes(s.size)));
        const stockFreighters = computed(() => store.db.STOCK_SHIPS.filter(s => s.name.includes('Freighter') || s.name === 'Shuttle'));
        const stockCapitals = computed(() => store.db.STOCK_SHIPS.filter(s => s.size.includes('Colossal') && !s.name.includes('Freighter') && !s.name.includes('Shuttle')));

        const selectStockShip = (id) => {
            store.createNew(id);
            emit('update:modelValue', false);
        };

        const triggerFileSelect = () => {
             if(fileInput.value) fileInput.value.click();
        };

        const handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = jsyaml.load(e.target.result);
                    store.loadState(data);
                    emit('update:modelValue', false);
                    $q.notify({ type: 'positive', message: 'Ship loaded successfully' });
                } catch (error) {
                    console.error(error);
                    $q.notify({ type: 'negative', message: 'Failed to parse file' });
                }
            };
            reader.readAsText(file);
        };

        return { hangarTab, stockFighters, stockFreighters, stockCapitals, selectStockShip, handleFileUpload, fileInput, triggerFileSelect, getLocalizedName };
    }
};

export const AddModDialog = {
    template: `
    <q-dialog v-model="store.showAddComponentDialog">
        <q-card class="bg-grey-9 text-white" style="min-width: 500px">
            <q-card-section>
                <div class="row items-center justify-between">
                    <div class="text-h6">{{ $t('ui.install_system') }}</div>
                    <q-btn v-if="store.isAdmin" outline color="primary" label="Create New (Admin)" icon="add" size="sm" @click="createNew" />
                </div>
                <div class="text-caption text-grey">{{ $t('ui.install_caption') }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none q-gutter-md">
                <!-- Search Bar -->
                <div class="q-mb-md">
                    <q-select
                        filled dark
                        v-model="searchSelection"
                        use-input
                        input-debounce="300"
                        :label="$t('ui.search_component')"
                        :options="searchOptions"
                        option-label="label"
                        option-value="id"
                        @filter="filterSearch"
                        @update:model-value="onSearchSelect"
                        clearable
                        dense
                    >
                        <template v-slot:prepend><q-icon name="search" /></template>
                        <template v-slot:option="scope">
                            <q-item v-bind="scope.itemProps">
                                <q-item-section>
                                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                                    <q-item-label caption class="text-grey-5">{{ scope.opt.category }} - {{ scope.opt.group }}</q-item-label>
                                </q-item-section>
                            </q-item>
                        </template>
                    </q-select>
                </div>
                <q-separator dark class="q-mb-md" />

                <!-- Form Elements -->
                <q-select filled dark v-model="newComponentCategory" :options="categoryOptions" :label="$t('ui.category')" emit-value map-options @update:model-value="resetGroup">
                    <template v-slot:prepend><q-icon name="folder" /></template>
                </q-select>
                <q-select filled dark v-model="newComponentGroup" :options="groupOptions" :label="$t('ui.sys_type')" emit-value map-options :disable="!newComponentCategory" @update:model-value="newComponentSelection = null">
                    <template v-slot:prepend><q-icon name="category" /></template>
                </q-select>
                <q-select filled dark v-model="newComponentSelection" :options="itemOptions" :label="$t('ui.component')" option-label="label" option-value="id" emit-value map-options :disable="!newComponentGroup">
                    <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                            <q-item-section>
                                <q-item-label>
                                    {{ scope.opt.label }} <span class="text-caption text-grey-5 q-ml-xs">({{ scope.opt.baseEp }} EP)</span>
                                    <q-badge v-if="scope.opt.availability === 'Licensed'" color="info" label="Lic" />
                                    <q-badge v-if="scope.opt.availability === 'Restricted'" color="warning" text-color="black" label="Res" />
                                    <q-badge v-if="scope.opt.availability === 'Military'" color="negative" label="Mil" />
                                    <q-badge v-if="scope.opt.availability === 'Illegal'" color="deep-purple" label="Ill" />
                                    <q-badge v-if="scope.opt.availability === 'Common' || !scope.opt.availability" color="positive" label="Com" />
                                </q-item-label>
                            </q-item-section>
                            <q-item-section side v-if="!isSizeValid(scope.opt)">
                                <q-icon name="warning" color="negative">
                                    <q-tooltip>
                                        <span v-if="scope.opt.maxSize">{{ $t('ui.max_size') }}: {{ scope.opt.maxSize }}</span>
                                        <span v-if="scope.opt.minShipSize">{{ $t('ui.min_size') }}: {{ scope.opt.minShipSize }}</span>
                                    </q-tooltip>
                                </q-icon>
                            </q-item-section>
                        </q-item>
                    </template>
                </q-select>
                <div v-if="newComponentSelection">
                    <q-checkbox dark v-model="newComponentNonStandard" :label="$t('ui.non_standard')" color="warning">
                        <q-tooltip>{{ $t('ui.non_standard_tip') }}</q-tooltip>
                    </q-checkbox>
                </div>
                <q-card v-if="selectedItemDef" class="bg-grey-8 q-pa-sm q-mt-md" flat bordered>
                    <div class="row items-center justify-between">
                        <div>
                            <div class="text-subtitle2">{{ getLocalizedName(selectedItemDef) }} <span v-if="newComponentNonStandard" class="text-warning text-caption">({{ $t('ui.ns_tag') }})</span></div>
                            <div class="text-caption text-grey-4">
                                <span v-if="selectedItemDef.variableCost">{{ $t('ui.cost_variable') }}</span>
                                <span v-else>{{ $t('ui.base_cost') }}: {{ selectedItemDef.baseCost }} cr</span> | {{ $t('ui.base_ep') }}: {{ selectedItemDef.baseEp }}
                                <br v-if="selectedItemDef.category !== 'Modifications'">
                                <span v-if="selectedItemDef.category !== 'Modifications'">
                                    {{ $t('ui.avail') }}:
                                    <q-badge v-if="selectedItemDef.availability === 'Licensed'" color="info" label="Lic" />
                                    <q-badge v-if="selectedItemDef.availability === 'Restricted'" color="warning" text-color="black" label="Res" />
                                    <q-badge v-if="selectedItemDef.availability === 'Military'" color="negative" label="Mil" />
                                    <q-badge v-if="selectedItemDef.availability === 'Illegal'" color="deep-purple" label="Ill" />
                                    <q-badge v-if="selectedItemDef.availability === 'Common' || !selectedItemDef.availability" color="positive" label="Com" />
                                </span>
                                <q-icon v-if="!isSizeValid(selectedItemDef)" name="warning" color="negative" class="q-ml-xs">
                                    <q-tooltip>
                                        <span v-if="selectedItemDef.maxSize">{{ $t('ui.max_size') }}: {{ selectedItemDef.maxSize }}</span>
                                        <span v-if="selectedItemDef.minShipSize">{{ $t('ui.min_size') }}: {{ selectedItemDef.minShipSize }}</span>
                                    </q-tooltip>
                                </q-icon>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-h6 text-amber">
                                <span v-if="selectedItemDef.variableCost" class="text-italic text-body1">{{ $t('ui.variable') }}</span>
                                <span v-else>{{ formatCreds(previewCost) }}</span>
                            </div>
                            <div class="text-caption text-positive">{{ previewEp }} EP</div>
                        </div>
                    </div>
                    <div v-if="selectedItemDef.sizeMult && !selectedItemDef.variableCost" class="text-xs text-grey-5 q-mt-xs">* {{ $t('ui.size_mult_msg', { size: store.chassis.size }) }}</div>
                    <div v-if="store.isAdmin" class="row q-gutter-sm q-mt-sm justify-end">
                        <q-btn flat dense icon="open_in_new" label="Wiki" color="info" @click="openWiki"></q-btn>
                        <q-btn flat dense icon="code" label="Edit JSON" color="accent" @click="openJsonEditor"></q-btn>
                        <q-btn flat dense icon="delete" label="Delete" color="negative" @click="deleteComponent"></q-btn>
                    </div>
                </q-card>
            </q-card-section>
            <q-card-actions align="right">
                <q-space></q-space>
                <q-btn flat :label="$t('ui.cancel')" color="grey" v-close-popup></q-btn>
                <q-btn unelevated :label="$t('ui.install')" color="positive" @click="installComponent" v-close-popup :disable="!newComponentSelection"></q-btn>
            </q-card-actions>
        </q-card>
        <q-dialog v-model="showJsonEditor" persistent>
            <q-card class="bg-grey-9 text-white" style="min-width: 600px; max-width: 90vw;">
                <q-card-section>
                    <div class="text-h6">Edit Component JSON</div>
                </q-card-section>
                <q-card-section>
                    <q-input
                        v-model="jsonContent"
                        filled
                        dark
                        type="textarea"
                        autogrow
                        style="font-family: monospace;"
                    />
                </q-card-section>
                <q-card-actions align="right">
                    <q-btn flat label="Cancel" color="grey" v-close-popup />
                    <q-btn flat label="Save" color="primary" @click="saveJson" />
                </q-card-actions>
            </q-card>
        </q-dialog>
    </q-dialog>
    `,
    setup() {
        const store = useShipStore();
        const { t } = useI18n();
        const $q = useQuasar();

        const newComponentCategory = ref(null);
        const newComponentGroup = ref(null);
        const newComponentSelection = ref(null);
        const newComponentNonStandard = ref(false);

        // Search State
        const searchSelection = ref(null);
        const searchOptions = ref([]);

        const filterSearch = (val, update) => {
            if (val === '') {
                update(() => { searchOptions.value = [] });
                return;
            }
            update(() => {
                const needle = val.toLowerCase();
                searchOptions.value = store.allEquipment
                    .filter(e => getLocalizedName(e).toLowerCase().includes(needle))
                    .map(e => ({ ...e, label: getLocalizedName(e) }));
            });
        };

        const onSearchSelect = (item) => {
            if (!item) return;
            newComponentCategory.value = item.category;
            newComponentGroup.value = item.group;
            newComponentSelection.value = item.id;
            searchSelection.value = null; // Reset search
        };

        const categoryOptions = computed(() => {
            const cats = [...new Set(store.allEquipment.map(e => e.category))];
            return cats.map(c => ({ label: t('cat.' + (c === 'Weapon Systems' ? 'weapons' : c === 'Movement Systems' ? 'movement' : c === 'Defense Systems' ? 'defense' : c === 'Modifications' ? 'components' : 'accessories')), value: c })).sort((a, b) => a.label.localeCompare(b.label));
        });

        const groupOptions = computed(() => {
            if (!newComponentCategory.value) return [];
            const groups = [...new Set(store.allEquipment.filter(e => e.category === newComponentCategory.value).map(e => e.group))];
            return groups.map(g => ({ label: g, value: g })).sort((a, b) => a.label.localeCompare(b.label));
        });

        const itemOptions = computed(() => {
            if (!newComponentGroup.value) return [];
            return store.allEquipment.filter(e => e.group === newComponentGroup.value).map(e => ({
                ...e,
                label: getLocalizedName(e)
            })).sort((a, b) => a.label.localeCompare(b.label));
        });

        const selectedItemDef = computed(() => {
            if (!newComponentSelection.value) return null;
            return store.allEquipment.find(e => e.id === newComponentSelection.value);
        });

        const isSizeValid = (itemDef) => {
            const shipIndex = store.db.SIZE_RANK.indexOf(store.chassis.size);

            if (itemDef.maxSize) {
                const rankIndex = store.db.SIZE_RANK.indexOf(itemDef.maxSize);
                if (shipIndex > rankIndex) return false;
            }

            if (itemDef.minShipSize) {
                const minRankIndex = store.db.SIZE_RANK.indexOf(itemDef.minShipSize);
                if (shipIndex < minRankIndex) return false;
            }

            return true;
        };

        const previewCost = computed(() => {
            if (!selectedItemDef.value) return 0;
            return store.getComponentCost({ defId: selectedItemDef.value.id, miniaturization: 0, isStock: false, isNonStandard: newComponentNonStandard.value });
        });

        const previewEp = computed(() => {
            if (!selectedItemDef.value) return 0;
            return store.getComponentEp({ defId: selectedItemDef.value.id, miniaturization: 0, isStock: false, isNonStandard: newComponentNonStandard.value });
        });

        const resetGroup = () => { newComponentGroup.value = null; newComponentSelection.value = null; };
        const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        const showJsonEditor = ref(false);
        const jsonContent = ref('');

        const openWiki = () => {
            if (selectedItemDef.value) {
                const name = selectedItemDef.value.name.replace(/ /g, '_');
                window.open(`https://swse.fandom.com/wiki/${name}`, '_blank');
            }
        };

        const openJsonEditor = () => {
            if (selectedItemDef.value) {
                jsonContent.value = JSON.stringify(selectedItemDef.value, null, 4);
                showJsonEditor.value = true;
            }
        };

        const saveJson = () => {
            try {
                const newDef = JSON.parse(jsonContent.value);
                store.updateEquipment(newDef);
                showJsonEditor.value = false;
                $q.notify({ type: 'positive', message: 'Component updated' });
            } catch (e) {
                $q.notify({ type: 'negative', message: 'Invalid JSON' });
            }
        };

        const createNew = () => {
            store.openCustomDialog();
        };

        const deleteComponent = () => {
            if (!newComponentSelection.value) return;
            $q.dialog({
                dark: true,
                title: 'Confirm Deletion',
                message: 'Are you sure you want to delete this component from the database? This cannot be undone.',
                cancel: true,
                persistent: true,
                color: 'negative'
            }).onOk(() => {
                store.removeEquipment(newComponentSelection.value);
                newComponentSelection.value = null;
                $q.notify({ type: 'positive', message: 'Component deleted' });
            });
        };

        const installComponent = () => {
            if(newComponentSelection.value) {
                const def = store.allEquipment.find(e => e.id === newComponentSelection.value);

                const doInstall = () => {
                    let loc = 'Installed';
                    if (def) {
                        if (def.type === 'weapon') loc = 'Hardpoint'; else if (def.type === 'system') loc = 'Internal Bay'; else if (def.type === 'cargo') loc = 'Cargo Hold'; else if (def.type === 'modification') loc = 'Hull Config'; else if (def.type === 'engine') loc = 'Aft Section';
                    }
                    store.addComponent(newComponentSelection.value, loc, newComponentNonStandard.value);
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

        return { store, newComponentCategory, newComponentGroup, newComponentSelection, newComponentNonStandard, categoryOptions, groupOptions, itemOptions, selectedItemDef, isSizeValid, previewCost, previewEp, resetGroup, formatCreds, installComponent, getLocalizedName, searchSelection, searchOptions, filterSearch, onSearchSelect,
            showJsonEditor, jsonContent, openWiki, openJsonEditor, saveJson, createNew, deleteComponent
        };
    }
};

export const CustomManagerDialog = {
    template: `
    <q-dialog v-model="store.showCustomManager">
        <q-card class="bg-grey-9 text-white" style="min-width: 600px; height: 70vh; display: flex; flex-direction: column;">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Custom Components Library</div>
                <q-space></q-space>
                <q-btn icon="close" flat round dense v-close-popup></q-btn>
            </q-card-section>

            <q-card-section class="q-py-sm">
                <div class="row q-gutter-sm">
                    <q-btn color="primary" icon="add" label="Create New" @click="store.openCustomDialog()"></q-btn>
                    <q-btn color="secondary" icon="upload" label="Import JSON" @click="triggerLibraryImport"></q-btn>
                    <q-btn color="accent" icon="download" label="Export JSON" @click="exportCustomLibrary" :disable="store.customComponents.length === 0"></q-btn>
                    <input type="file" ref="libraryInput" @change="handleLibraryImport" accept=".json" style="display: none" />
                </div>
            </q-card-section>

            <q-card-section class="col q-pa-none">
                <q-scroll-area class="fit">
                    <q-list separator dark class="q-pa-md">
                        <q-item v-for="comp in store.customComponents" :key="comp.id">
                            <q-item-section>
                                <q-item-label>{{ comp.name }}</q-item-label>
                                <q-item-label caption class="text-grey-5">{{ comp.type }} | {{ comp.baseCost }} cr | {{ comp.baseEp }} EP</q-item-label>
                            </q-item-section>
                            <q-item-section side>
                                <div class="row q-gutter-xs">
                                    <q-btn flat round icon="edit" color="info" size="sm" @click="store.openCustomDialog(comp.id)"></q-btn>
                                    <q-btn flat round icon="delete" :color="store.isCustomComponentInstalled(comp.id) ? 'grey-8' : 'negative'" size="sm" @click="deleteCustomComponent(comp.id)">
                                        <q-tooltip v-if="store.isCustomComponentInstalled(comp.id)">Uninstall from ship first</q-tooltip>
                                    </q-btn>
                                </div>
                            </q-item-section>
                        </q-item>
                        <div v-if="store.customComponents.length === 0" class="text-center text-grey q-pa-lg">
                            No custom components found. Create or Import one.
                        </div>
                    </q-list>
                </q-scroll-area>
            </q-card-section>
        </q-card>
    </q-dialog>
    `,
    setup() {
        const store = useShipStore();
        const $q = useQuasar();
        const libraryInput = ref(null);

        const triggerLibraryImport = () => { if(libraryInput.value) libraryInput.value.click(); };

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
                            if (item.name && item.type) {
                                const newId = 'custom_' + crypto.randomUUID();
                                const comp = { ...item, id: newId };
                                store.addCustomComponent(comp);
                                count++;
                            }
                        });
                        $q.notify({ type: 'positive', message: 'Imported ' + count + ' components.' });
                    } else {
                        $q.notify({ type: 'negative', message: 'Invalid file format. Expected JSON array.' });
                    }
                } catch (error) {
                    console.error(error);
                    $q.notify({ type: 'negative', message: 'Failed to parse JSON.' });
                }
                if (libraryInput.value) libraryInput.value.value = '';
            };
            reader.readAsText(file);
        };

        const exportCustomLibrary = () => {
            if (store.customComponents.length === 0) {
                $q.notify({ type: 'warning', message: 'No custom components to export.' });
                return;
            }
            const jsonStr = JSON.stringify(store.customComponents, null, 2);
            const blob = new Blob([jsonStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'swse_custom_components.json';
            a.click();
        };

        const deleteCustomComponent = (id) => {
            if (store.isCustomComponentInstalled(id)) {
                $q.notify({ type: 'warning', message: 'Cannot delete: Component is currently installed on the ship. Uninstall it first.' });
                return;
            }
            $q.dialog({
                dark: true,
                title: 'Confirm Deletion',
                message: 'Are you sure you want to delete this custom component?',
                cancel: true,
                persistent: true,
                color: 'negative'
            }).onOk(() => {
                store.removeCustomComponent(id);
            });
        };

        return { store, libraryInput, triggerLibraryImport, handleLibraryImport, exportCustomLibrary, deleteCustomComponent };
    }
};

export const CustomComponentDialog = {
    template: `
    <q-dialog v-model="store.customDialogState.visible">
        <q-card class="bg-grey-9 text-white" style="min-width: 500px">
            <q-card-section>
                <div class="text-h6">{{ store.customDialogState.componentId ? 'Edit Custom Component' : 'Create Custom Component' }}</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="column q-gutter-md">
                    <div><q-input filled dark v-model="newCustomComponent.name" label="Name"></q-input></div>
                    <div v-if="store.isAdmin">
                        <q-input filled dark v-model="newCustomComponent.id" label="ID (Admin)" hint="Leave blank to auto-generate"></q-input>
                        <q-checkbox dark v-model="newCustomComponent.addToCore" label="Save to Core Database" color="accent" class="q-mt-sm"></q-checkbox>
                    </div>
                    <div><q-select filled dark v-model="newCustomComponent.category" :options="categoryOptions" label="Category" emit-value map-options></q-select></div>
                    <div>
                        <q-select filled dark v-model="newCustomComponent.group" use-input hide-selected fill-input input-debounce="0" new-value-mode="add-unique" :options="groupOptionsFiltered" @filter="filterGroupFn" label="Group" hint="Select existing or type new" >
                            <template v-slot:no-option><q-item><q-item-section class="text-grey">Type to add new group</q-item-section></q-item></template>
                        </q-select>
                    </div>
                    <div><q-select filled dark v-model="newCustomComponent.type" :options="['weapon', 'system', 'engine', 'modification', 'cargo']" label="Type"></q-select></div>
                    <div class="row q-col-gutter-sm">
                        <div class="col"><q-input filled dark v-model="newCustomComponent.baseCost" label="Base Cost" type="number"></q-input></div>
                        <div class="col"><q-input filled dark v-model="newCustomComponent.baseEp" label="Base EP" type="number"></q-input></div>
                    </div>
                    <div>
                        <q-checkbox dark v-model="newCustomComponent.sizeMult" label="Cost Multiplied by Size"></q-checkbox>
                    </div>

                    <div>
                        <div class="text-subtitle2 q-mb-sm">Properties & Modifiers</div>
                        <div class="row q-col-gutter-sm items-center q-mb-md">
                            <div class="col">
                                <q-select filled dark v-model="propertyToAdd" :options="propertyDefinitions" label="Select Property" dense option-label="label"></q-select>
                            </div>
                            <div class="col-auto">
                                <q-btn icon="add" label="Add" color="primary" @click="addPropertyToCustomComponent" :disable="!propertyToAdd"></q-btn>
                            </div>
                        </div>

                        <div class="q-gutter-y-sm">
                            <div v-for="prop in activeProperties" :key="prop.key" class="row q-col-gutter-sm items-center">
                                <div class="col">
                                    <q-input v-if="prop.def.type === 'string'" filled dark v-model="prop.value" :label="prop.def.label" dense></q-input>
                                    <q-input v-else-if="prop.def.type === 'text'" filled dark v-model="prop.value" :label="prop.def.label" type="textarea" autogrow dense></q-input>
                                    <q-input v-else-if="prop.def.type === 'number'" filled dark v-model="prop.value" :label="prop.def.label" type="number" dense></q-input>
                                    <q-select v-else-if="prop.def.type === 'exclusive_select'" filled dark v-model="prop.value" use-input hide-selected fill-input input-debounce="0" new-value-mode="add-unique" :options="exclusiveOptionsFiltered" @filter="filterExclusiveFn" :label="prop.def.label" dense>
                                        <template v-slot:no-option><q-item><q-item-section class="text-grey">Type to add new exclusive group</q-item-section></q-item></template>
                                    </q-select>
                                    <q-select v-else-if="prop.def.type === 'size_select'" filled dark v-model="prop.value" :options="store.db.SIZE_RANK" :label="prop.def.label" dense></q-select>
                                    <q-checkbox v-else-if="prop.def.type === 'boolean'" dark v-model="prop.value" :label="prop.def.label" dense></q-checkbox>
                                    <q-select v-else-if="prop.def.type === 'multiselect'" filled dark v-model="prop.value" :options="prop.def.options" :label="prop.def.label" multiple emit-value map-options dense></q-select>
                                </div>
                                <div class="col-auto">
                                    <q-btn flat round icon="delete" color="negative" size="sm" @click="removePropertyFromCustomComponent(prop.key)"></q-btn>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </q-card-section>
            <q-card-actions align="right">
                <q-btn flat label="Cancel" color="grey" v-close-popup />
                <q-btn unelevated class="q-ml-sm" :label="store.customDialogState.componentId ? 'Save Changes' : 'Create'" color="positive" @click="createCustomComponent" :disable="!newCustomComponent.name" />
            </q-card-actions>
        </q-card>
    </q-dialog>
    `,
    setup() {
        const store = useShipStore();
        const { t } = useI18n();
        const newCustomComponent = reactive({ name: '', category: 'Weapon Systems', group: '', type: 'weapon', baseCost: 0, baseEp: 0, sizeMult: false, stats: {} });
        const activeProperties = ref([]);
        const propertyToAdd = ref(null);
        const groupOptionsFiltered = ref([]);
        const exclusiveOptionsFiltered = ref([]);

        // Property Definitions (Moved from app.js)
        const propertyDefinitions = [
            { label: 'Damage', key: 'damage', type: 'string', location: 'root' },
            { label: 'Damage Type', key: 'damageType', type: 'string', location: 'root' },
            { label: 'Description', key: 'description', type: 'text', location: 'root' },
            { label: 'Exclusive Group', key: 'exclusiveGroup', type: 'exclusive_select', location: 'root' },
            { label: 'Min Ship Size', key: 'minShipSize', type: 'size_select', location: 'root' },
            { label: 'Max Ship Size', key: 'maxSize', type: 'size_select', location: 'root' },
            { label: 'Modification Options', key: 'componentOptions', type: 'multiselect', location: 'upgradeSpecs', options: [{ label: 'Multi-Barrel (Twin/Quad)', value: 'weapon.multibarrel' }, { label: 'Fire-Link', value: 'weapon.fireLink' }, { label: 'Enhancement', value: 'weapon.enhancement' }, { label: 'Battery', value: 'weapon.battery' }, { label: 'Autofire', value: 'weapon.autofire' }, { label: 'Recall Circuit', value: 'slaveCircuits.recall' }] },
            { label: 'Shield Rating (Set)', key: 'sr', type: 'number', location: 'stats' },
            { label: 'Shield Bonus (Add)', key: 'sr_bonus', type: 'number', location: 'stats' },
            { label: 'Armor Bonus (Add)', key: 'armor_bonus', type: 'number', location: 'stats' },
            { label: 'HP (Set)', key: 'hp', type: 'number', location: 'stats' },
            { label: 'Speed (Set)', key: 'speed', type: 'number', location: 'stats' },
            { label: 'Hyperdrive Class (Set)', key: 'hyperdrive', type: 'number', location: 'stats' },
            { label: 'Dex Bonus (Add)', key: 'dex_bonus', type: 'number', location: 'stats' },
            { label: 'Str Bonus (Add)', key: 'str_bonus', type: 'number', location: 'stats' },
            { label: 'Perception Bonus (Add)', key: 'perception_bonus', type: 'number', location: 'stats' },
            { label: 'EP Modifier %', key: 'ep_dynamic_pct', type: 'number', location: 'stats' },
            { label: 'Cargo Factor', key: 'cargo_factor', type: 'number', location: 'stats' }
        ];

        const categoryOptions = computed(() => {
            const cats = [...new Set(store.allEquipment.map(e => e.category))];
            return cats.map(c => ({ label: t('cat.' + (c === 'Weapon Systems' ? 'weapons' : c === 'Movement Systems' ? 'movement' : c === 'Defense Systems' ? 'defense' : c === 'Modifications' ? 'components' : 'accessories')), value: c }));
        });

        const filterGroupFn = (val, update) => {
            update(() => {
                const groups = [...new Set(store.allEquipment.map(e => e.group))];
                if (val === '') groupOptionsFiltered.value = groups;
                else groupOptionsFiltered.value = groups.filter(v => v && v.toLowerCase().indexOf(val.toLowerCase()) > -1);
            });
        };

        const filterExclusiveFn = (val, update) => {
            update(() => {
                const groups = [...new Set(store.allEquipment.map(e => e.exclusiveGroup).filter(g => g))];
                if (val === '') exclusiveOptionsFiltered.value = groups;
                else exclusiveOptionsFiltered.value = groups.filter(v => v && v.toLowerCase().indexOf(val.toLowerCase()) > -1);
            });
        };

        const addPropertyToCustomComponent = () => {
            if (!propertyToAdd.value) return;
            if (activeProperties.value.find(p => p.key === propertyToAdd.value.key)) return;
            let defaultVal = '';
            if (propertyToAdd.value.type === 'number') defaultVal = 0;
            if (propertyToAdd.value.type === 'boolean') defaultVal = true;
            if (propertyToAdd.value.type === 'multiselect') defaultVal = [];
            activeProperties.value.push({ key: propertyToAdd.value.key, def: propertyToAdd.value, value: defaultVal });
            propertyToAdd.value = null;
        };

        const removePropertyFromCustomComponent = (key) => {
            activeProperties.value = activeProperties.value.filter(p => p.key !== key);
        };

        const createCustomComponent = () => {
            if (!newCustomComponent.name) return;
            const isEdit = !!store.customDialogState.componentId;

            let id = newCustomComponent.id;
            if (!id) {
                 id = isEdit ? store.customDialogState.componentId : 'custom_' + crypto.randomUUID();
            }

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
                stats: {}
            };
            activeProperties.value.forEach(prop => {
                if (prop.def.location === 'root') comp[prop.key] = prop.value;
                else if (prop.def.location === 'stats') comp.stats[prop.key] = Number(prop.value);
                else if (prop.def.location === 'upgradeSpecs') {
                    if (!comp.upgradeSpecs) comp.upgradeSpecs = {};
                    comp.upgradeSpecs[prop.key] = prop.value;
                }
            });

            if (store.isAdmin && newCustomComponent.addToCore) {
                store.addEquipment(comp);
                $q.notify({ type: 'positive', message: 'Saved to Core DB' });
                store.customDialogState.visible = false;
                return;
            }

            if (isEdit) {
                store.updateCustomComponent(comp);
                store.customDialogState.visible = false;
            } else {
                store.addCustomComponent(comp);
                store.customDialogState.visible = false;
            }
        };

        watch(() => store.customDialogState.visible, (visible) => {
            if (visible) {
                activeProperties.value = [];
                if (store.customDialogState.componentId) {
                    const existing = store.customComponents.find(c => c.id === store.customDialogState.componentId);
                    if (existing) {
                        Object.assign(newCustomComponent, {
                            name: existing.name, category: existing.category, group: existing.group, type: existing.type,
                            baseCost: existing.baseCost, baseEp: existing.baseEp, sizeMult: existing.sizeMult, stats: {},
                            id: existing.id, addToCore: false
                        });
                        propertyDefinitions.forEach(def => {
                            let val = undefined;
                            if (def.location === 'root' && existing[def.key] !== undefined) val = existing[def.key];
                            else if (def.location === 'stats' && existing.stats && existing.stats[def.key] !== undefined) val = existing.stats[def.key];
                            else if (def.location === 'upgradeSpecs' && existing.upgradeSpecs && existing.upgradeSpecs[def.key] !== undefined) val = existing.upgradeSpecs[def.key];
                            if (val !== undefined) activeProperties.value.push({ key: def.key, def: def, value: val });
                        });
                    }
                } else {
                    Object.assign(newCustomComponent, { name: '', category: 'Weapon Systems', group: '', type: 'weapon', baseCost: 0, baseEp: 0, sizeMult: false, stats: {}, id: '', addToCore: false });
                    activeProperties.value = [];
                }
            } else {
                 store.customDialogState.componentId = null;
            }
        });

        return { store, newCustomComponent, activeProperties, propertyToAdd, propertyDefinitions, groupOptionsFiltered, exclusiveOptionsFiltered, categoryOptions, filterGroupFn, filterExclusiveFn, addPropertyToCustomComponent, removePropertyFromCustomComponent, createCustomComponent };
    }
};

// --- WRAPPERS ---
export const StatPanelWrapper = {
    ...StatPanel,
    setup() {
        const store = useShipStore();
        return { store, getLocalizedName };
    }
};

export const SystemListWrapper = {
    ...SystemList,
    setup() {
        const store = useShipStore();
        const showConfigDialog = ref(false);
        const editingComponent = ref(null);

        const getName = (component) => {
            const id = component.defId || component;
            const def = store.allEquipment.find(e => e.id === id);
            let name = getLocalizedName(def);

            if (component && component.defId) {
                const calcDmg = store.getComponentDamage(component);
                if (calcDmg) {
                    name = name.replace(/\(\d+d\d+(x\d+)?\)/, `(${calcDmg})`);
                }
            }
            return name;
        };
        const getAvailability = (idOrComp) => {
            const id = idOrComp.defId || idOrComp;
            const def = store.allEquipment.find(e => e.id === id);
            let avail = def && def.availability ? def.availability : 'Common';

            // If a full component object is passed, check modifications
            if (idOrComp.modifications) {
                 const levels = { 'Common': 0, 'Licensed': 1, 'Restricted': 2, 'Military': 3, 'Illegal': 4 };
                 const reverse = ['Common', 'Licensed', 'Restricted', 'Military', 'Illegal'];
                 let currentLevel = levels[avail] || 0;
                 const mods = idOrComp.modifications;

                 // Mod Availabilities (Best Effort based on context)
                 if (mods.mount === 'quad') currentLevel = Math.max(currentLevel, 2); // Restricted
                 if (mods.fireLink > 1) currentLevel = Math.max(currentLevel, 2); // Restricted
                 if (mods.enhancement === 'enhanced') currentLevel = Math.max(currentLevel, 2); // Restricted
                 if (mods.enhancement === 'advanced') currentLevel = Math.max(currentLevel, 3); // Military

                 return reverse[currentLevel];
            }
            return avail;
        }
        const getBaseEp = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def ? def.baseEp : 0;
        }
        const getIcon = (id) => {
            const e = store.allEquipment.find(e => e.id === id);
            if (e?.type === 'weapon') return 'gps_fixed';
            if (e?.type === 'engine') return 'speed';
            if (e?.type === 'upgrade') return 'upgrade';
            if (e?.type === 'modification') return 'swap_horiz';
            return 'memory';
        }
        const getEpDynamic = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            if (def && def.stats && def.stats.ep_dynamic_pct) return Math.floor(store.chassis.baseEp * def.stats.ep_dynamic_pct);
            return null;
        }
        const isVariableCost = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.variableCost;
        }
        const isModification = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.category === 'Modifications';
        }
        const isWeapon = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.type === 'weapon';
        }
        const isLauncher = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.group === 'Launchers';
        }
        const isCustom = (id) => {
            return store.customComponents.some(c => c.id === id);
        }
        const format = (n) => n === 0 ? '-' : new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        const hasUpgrades = (defId) => isWeapon(defId) || !!store.allEquipment.find(e => e.id === defId)?.upgradeSpecs;
        const getUpgradeSpecs = (defId) => store.allEquipment.find(e => e.id === defId)?.upgradeSpecs;

        const canMount = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (specs.componentOptions && specs.componentOptions.includes('weapon.multibarrel')) return true;
            if (specs.mounts !== undefined) return specs.mounts;
            return specs.weaponVariants && !isLauncher(defId);
        };
        const canFireLink = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (specs.componentOptions && specs.componentOptions.includes('weapon.fireLink')) return true;
            if (specs.fireLink !== undefined) return specs.fireLink;
            return specs.weaponVariants;
        };
        const canEnhance = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (specs.componentOptions && specs.componentOptions.includes('weapon.enhancement')) return true;
            if (specs.enhancement !== undefined) return specs.enhancement;
            return specs.weaponVariants && !isLauncher(defId);
        };
        const canBattery = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (specs.componentOptions && specs.componentOptions.includes('weapon.battery')) return true;
            return specs.battery;
        };

        const getGenericOptions = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs || !specs.componentOptions) return [];
            // Filter out options that are handled by specific UI controls
            const handled = ['weapon.multibarrel', 'weapon.fireLink', 'weapon.enhancement', 'weapon.battery', 'ordnance'];
            // We need labels for these. Ideally these should be localized or defined in store/app.
            // For now, mapping known ones.
            const labels = {
                'weapon.autofire': 'Autofire Capability',
                'slaveCircuits.recall': 'Recall Circuit Functionality',
                'slave': 'Slave Circuit'
            };
            return specs.componentOptions
                .filter(opt => !handled.includes(opt))
                .map(opt => ({ value: opt, label: labels[opt] || opt }));
        };

        const openConfig = (component) => { editingComponent.value = component; showConfigDialog.value = true; };

        const checkValidity = (component) => {
            const def = store.allEquipment.find(e => e.id === component.defId);
            if (!def) return true;

            const shipIndex = store.db.SIZE_RANK.indexOf(store.chassis.size);
            if (def.maxSize) {
                const rankIndex = store.db.SIZE_RANK.indexOf(def.maxSize);
                if (shipIndex > rankIndex) return false;
            }
            if (def.minShipSize) {
                const minRankIndex = store.db.SIZE_RANK.indexOf(def.minShipSize);
                if (shipIndex < minRankIndex) return false;
            }
            return true;
        };

        const configModel = computed(() => {
            if (!editingComponent.value || !editingComponent.value.modifications) return {};
            const mods = editingComponent.value.modifications;

            const mountMap = ['single', 'twin', 'quad'];
            const fireLinkMap = [1, 2, 4];
            const enhancementMap = ['normal', 'enhanced', 'advanced'];

            const mountLabels = ['Single', 'Twin', 'Quad'];
            const fireLinkLabels = ['None', 'Fire-Link (2)', 'Fire-Link (4)'];
            const enhancementLabels = ['Standard', 'Enhanced', 'Advanced'];

            return {
                get mountIndex() { return mountMap.indexOf(mods.mount || 'single'); },
                set mountIndex(idx) { mods.mount = mountMap[idx]; },
                get mountLabel() { return mountLabels[this.mountIndex]; },

                get fireLinkIndex() { return fireLinkMap.indexOf(mods.fireLink || 1); },
                set fireLinkIndex(idx) {
                    const val = fireLinkMap[idx];
                    mods.fireLink = val;
                    if (val > 1) {
                         mods.batteryCount = 1;
                         const def = store.allEquipment.find(e => e.id === editingComponent.value.defId);
                         if (def && def.upgradeSpecs && def.upgradeSpecs.payload && def.upgradeSpecs.payload.type === 'capacity') {
                             mods.fireLinkOption = true;
                         }
                    }
                },
                get fireLinkLabel() { return fireLinkLabels[this.fireLinkIndex]; },

                get enhancementIndex() { return enhancementMap.indexOf(mods.enhancement || 'normal'); },
                set enhancementIndex(idx) { mods.enhancement = enhancementMap[idx]; },
                get enhancementLabel() { return enhancementLabels[this.enhancementIndex]; }
            };
        });

        return { store, getName, getIcon, getEpDynamic, getAvailability, getBaseEp, isVariableCost, isModification, isWeapon, isLauncher, isCustom, format, showConfigDialog, editingComponent, hasUpgrades, getUpgradeSpecs, canMount, canFireLink, canEnhance, canBattery, getGenericOptions, openConfig, checkValidity, configModel };
    }
};

export const ConfigPanelWrapper = {
    ...ConfigPanel,
    setup() {
        const store = useShipStore();
        const { t } = useI18n();
        const showEpDialog = ref(false);
        const templateOptions = computed(() => {
            if (!store.db.TEMPLATES) return [];
            return [
                { label: t('ui.template') + ': ' + t('ui.none'), value: null },
                ...store.db.TEMPLATES.map(tmp => ({ label: getLocalizedName(tmp), value: tmp.id }))
            ];
        });
        const format = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';
        return { store, templateOptions, format, showEpDialog };
    }
};

export const ShipSheetWrapper = {
    ...ShipSheet,
    setup() {
        const store = useShipStore();
        const getName = (component) => {
            const id = component.defId || component;
            const def = store.allEquipment.find(e => e.id === id);
            let name = getLocalizedName(def);

            if (component.modifications) {
                const parts = [];
                if (component.modifications.fireLink > 1) parts.push(`Fire-Linked (${component.modifications.fireLink})`);
                if (component.modifications.enhancement && component.modifications.enhancement !== 'normal') parts.push(component.modifications.enhancement.charAt(0).toUpperCase() + component.modifications.enhancement.slice(1));
                if (component.modifications.mount && component.modifications.mount !== 'single') parts.push(component.modifications.mount.charAt(0).toUpperCase() + component.modifications.mount.slice(1));
                if (parts.length > 0) name = `${parts.join(' ')} ${name}`;
            }
            return name;
        };
        const getMod = (score) => Math.floor((score - 10) / 2);
        const weapons = computed(() => store.installedComponents.filter(c => {
            const def = store.allEquipment.find(e => e.id === c.defId);
            return def && def.type === 'weapon';
        }));
        const systemNames = computed(() => {
            const nonWeapons = store.installedComponents.filter(c => {
                const def = store.allEquipment.find(e => e.id === c.defId);
                return def && def.type !== 'weapon' && def.type !== 'engine';
            });
            if (nonWeapons.length === 0) return i18n.global.t('ui.installed_systems');
            return nonWeapons.map(c => getName(c.defId)).join(', ');
        });

        // Enhanced Damage Logic for Variants
        const getDmg = (component) => {
            return store.getComponentDamage(component) || '-';
        }
        const calculateCL = computed(() => { let cl = 10; if(store.chassis.size.includes('Colossal')) cl += 5; cl += Math.floor(store.installedComponents.length / 2); if(store.template) cl += 2; return cl; });
        const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        const componentsWithDescriptions = computed(() => {
            const seen = new Set();
            const unique = [];
            store.installedComponents.forEach(c => {
                const def = store.allEquipment.find(e => e.id === c.defId);
                if (def && def.description && !seen.has(c.defId)) {
                    unique.push(c);
                    seen.add(c.defId);
                }
            });
            return unique;
        });
        const getDescription = (id) => {
             const def = store.allEquipment.find(e => e.id === id);
             return def ? def.description : '';
        };

        return { store, getName, getMod, weapons, systemNames, getDmg, calculateCL, formatCreds, getLocalizedName, componentsWithDescriptions, getDescription };
    }
};
