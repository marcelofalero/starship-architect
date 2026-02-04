import { useShipStore } from './store.js';
import { getLocalizedName, i18n } from './i18n.js';

const { computed, ref } = Vue;
const { useI18n } = VueI18n;

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
                        {{ getName(component.defId) }}
                        <q-badge v-if="isCustom(component.defId)" color="purple" label="Custom" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component.defId) === 'Illegal'" color="deep-purple" label="Ill" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component.defId) === 'Military'" color="negative" label="Mil" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component.defId) === 'Restricted'" color="warning" text-color="black" label="Res" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component.defId) === 'Licensed'" color="info" label="Lic" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(component.defId) === 'Common' && !isCustom(component.defId)" color="positive" label="Com" class="q-ml-xs" />
                        <q-badge v-if="component.isStock" color="grey-7" label="Stock" class="q-ml-xs" />
                        <q-badge v-if="component.isNonStandard" color="warning" text-color="black" :label="$t('ui.ns_tag')" class="q-ml-xs" />
                        <q-icon v-if="!checkValidity(component)" name="warning" color="negative" class="q-ml-sm"><q-tooltip>Invalid for Ship Size</q-tooltip></q-icon>
                    </q-item-label>
                    <q-item-label caption class="text-grey-5">
                        <span v-if="getEpDynamic(component.defId)" class="text-positive">+{{ Math.abs(getEpDynamic(component.defId)) }} EP</span>
                        <span v-else-if="getBaseEp(component.defId) !== 0">{{ getBaseEp(component.defId) }} EP</span>
                        <span v-else>{{ component.location }}</span>
                    </q-item-label>
                    <q-item-label v-if="component.modifications" caption class="text-info">
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
                    <div v-if="getUpgradeSpecs(editingComponent.defId)?.payload" class="q-mb-md">
                        <div v-if="getUpgradeSpecs(editingComponent.defId).payload.type === 'capacity'">
                            <div class="text-caption">Additional {{ getUpgradeSpecs(editingComponent.defId).payload.unitLabel }} ({{ format(store.allEquipment.find(e => e.id === editingComponent.defId).baseCost * getUpgradeSpecs(editingComponent.defId).payload.costFactor) }} each)</div>
                            <q-input dark type="number" filled v-model.number="editingComponent.modifications.payloadCount" label="Additional Capacity" min="0" :max="getUpgradeSpecs(editingComponent.defId).payload.max - getUpgradeSpecs(editingComponent.defId).payload.base" :hint="'Base: ' + getUpgradeSpecs(editingComponent.defId).payload.base + ' | Max Total: ' + getUpgradeSpecs(editingComponent.defId).payload.max" />
                        </div>
                        <q-checkbox v-else dark v-model="editingComponent.modifications.payloadOption" :label="getUpgradeSpecs(editingComponent.defId).payload.label + ' (' + format(getUpgradeSpecs(editingComponent.defId).payload.cost) + ')'" />
                    </div>
                    <div v-if="getUpgradeSpecs(editingComponent.defId)?.battery" class="q-mb-md">
                        <div class="text-caption">Battery Size</div>
                        <q-input dark type="number" filled v-model.number="editingComponent.modifications.batteryCount" label="Battery Count" min="1" max="6" />
                    </div>
                    <div v-if="getUpgradeSpecs(editingComponent.defId)?.quantity" class="q-mb-md">
                        <div class="text-caption">Quantity</div>
                        <q-input dark type="number" filled v-model.number="editingComponent.modifications.quantity" label="Quantity" min="1" />
                    </div>
                    <div v-if="getUpgradeSpecs(editingComponent.defId)?.fireLinkOption" class="q-mb-md">
                        <q-checkbox dark v-model="editingComponent.modifications.fireLinkOption" :label="'Selective Fire (+' + format(getUpgradeSpecs(editingComponent.defId).fireLinkOption.cost) + ')'" />
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
            <div v-for="w in weapons" :key="w.instanceId" class="weapon-line"><span class="bold">Ranged</span> {{ getName(w.defId) }} +5 ({{ getDmg(w.defId) }})</div>

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

        const getName = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return getLocalizedName(def);
        };
        const getAvailability = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.availability ? def.availability : 'Common';
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
        const isCustom = (id) => {
            return store.customComponents.some(c => c.id === id);
        }
        const format = (n) => n === 0 ? '-' : new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        const hasUpgrades = (defId) => isWeapon(defId) || !!store.allEquipment.find(e => e.id === defId)?.upgradeSpecs;
        const getUpgradeSpecs = (defId) => store.allEquipment.find(e => e.id === defId)?.upgradeSpecs;
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

        return { store, getName, getIcon, getEpDynamic, getAvailability, getBaseEp, isVariableCost, isModification, isWeapon, isCustom, format, showConfigDialog, editingComponent, hasUpgrades, getUpgradeSpecs, openConfig, checkValidity };
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
        const getName = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return getLocalizedName(def);
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
        const getDmg = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.damage ? def.damage : '-';
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
