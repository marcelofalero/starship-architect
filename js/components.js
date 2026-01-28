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
    <div class="q-pa-md full-height column">
        <div class="row justify-between items-center q-mb-md"><div class="text-h6">{{ $t('ui.installed_systems') }}</div><q-btn round color="positive" icon="add" size="sm" @click="store.showAddModDialog = true" /></div>
        <q-scroll-area class="col"><q-list separator dark>
            <q-item v-for="mod in store.installedMods" :key="mod.instanceId">
                <q-item-section avatar><q-icon :name="getIcon(mod.defId)" color="primary" /></q-item-section>
                <q-item-section>
                    <q-item-label>
                        {{ getName(mod.defId) }}
                        <q-badge v-if="!isModification(mod.defId) && getAvailability(mod.defId) === 'Military'" color="negative" label="Mil" class="q-ml-xs" />
                        <q-badge v-if="!isModification(mod.defId) && getAvailability(mod.defId) === 'Restricted'" color="warning" text-color="black" label="Res" class="q-ml-xs" />
                        <q-badge v-if="!isModification(mod.defId) && getAvailability(mod.defId) === 'Licensed'" color="info" label="Lic" class="q-ml-xs" />
                        <q-badge v-if="mod.isStock" color="grey-7" label="Stock" class="q-ml-xs" />
                        <q-badge v-if="mod.isNonStandard" color="warning" text-color="black" :label="$t('ui.ns_tag')" class="q-ml-xs" />
                    </q-item-label>
                    <q-item-label caption class="text-grey-5">
                        <span v-if="getEpDynamic(mod.defId)" class="text-positive">+{{ Math.abs(getEpDynamic(mod.defId)) }} EP</span><span v-else>{{ mod.location }}</span>
                    </q-item-label>
                    <q-item-label v-if="mod.modifications" caption class="text-info">
                        <span v-if="getUpgradeSpecs(mod.defId)?.payload?.type === 'capacity' && mod.modifications.payloadCount > 0" class="q-mr-xs">Payload: {{ getUpgradeSpecs(mod.defId).payload.base }} + {{ mod.modifications.payloadCount }}</span>
                        <span v-else-if="mod.modifications.payloadOption" class="q-mr-xs">Extra Payload</span>
                        <span v-if="mod.modifications.batteryCount > 1">Battery ({{ mod.modifications.batteryCount }})</span>
                    </q-item-label>
                </q-item-section>
                <q-item-section side>
                    <div class="text-right q-mr-sm">
                        <div class="text-caption text-amber">
                            <span v-if="isVariableCost(mod.defId)" class="text-italic">{{ $t('ui.variable') }}</span>
                            <span v-else>{{ format(store.getModCost(mod)) }}</span>
                        </div>
                    </div>
                    <div class="row items-center">
                        <q-badge v-if="mod.miniaturization > 0" color="orange" label="Mini" class="q-mr-xs" />
                        <q-btn v-if="hasUpgrades(mod.defId)" flat round icon="settings" color="accent" size="sm" @click="openConfig(mod)" />
                        <q-btn flat round icon="delete" color="negative" size="sm" @click="store.removeMod(mod.instanceId)" />
                    </div>
                </q-item-section>
            </q-item>
            <div v-if="store.installedMods.length === 0" class="text-center text-grey q-pa-lg">No systems installed.</div>
        </q-list></q-scroll-area>
        <q-dialog v-model="showConfigDialog">
            <q-card class="bg-grey-9 text-white" style="min-width: 350px">
                <q-card-section><div class="text-h6">Configure System</div></q-card-section>
                <q-card-section v-if="editingMod">
                    <div v-if="getUpgradeSpecs(editingMod.defId)?.payload" class="q-mb-md">
                        <div v-if="getUpgradeSpecs(editingMod.defId).payload.type === 'capacity'">
                            <div class="text-caption">Additional {{ getUpgradeSpecs(editingMod.defId).payload.unitLabel }} ({{ format(store.db.EQUIPMENT.find(e => e.id === editingMod.defId).baseCost * getUpgradeSpecs(editingMod.defId).payload.costFactor) }} each)</div>
                            <q-input dark type="number" filled v-model.number="editingMod.modifications.payloadCount" label="Additional Capacity" min="0" :max="getUpgradeSpecs(editingMod.defId).payload.maxAdd" :hint="'Base: ' + getUpgradeSpecs(editingMod.defId).payload.base + ' | Max Add: ' + getUpgradeSpecs(editingMod.defId).payload.maxAdd" />
                        </div>
                        <q-checkbox v-else dark v-model="editingMod.modifications.payloadOption" :label="getUpgradeSpecs(editingMod.defId).payload.label + ' (' + format(getUpgradeSpecs(editingMod.defId).payload.cost) + ')'" />
                    </div>
                    <div v-if="getUpgradeSpecs(editingMod.defId)?.battery" class="q-mb-md">
                        <div class="text-caption">Battery Size</div>
                        <q-input dark type="number" filled v-model.number="editingMod.modifications.batteryCount" label="Battery Count" min="1" max="6" />
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
            <div class="row justify-between text-grey-4"><span>{{ $t('ui.systems') }}</span><span>{{ format(store.modsCost) }}</span></div>
            <div class="row justify-between text-grey-4"><span>{{ $t('ui.lic_fees') }}</span><span>{{ format(store.licensingCost) }}</span></div>
            <q-separator dark class="q-my-xs" />
            <div class="row justify-between text-h6 text-primary"><span>{{ $t('ui.total') }}</span><span>{{ format(store.totalCost) }}</span></div>
            <div class="q-mt-md"><div class="row justify-between text-h6"><span>{{ $t('ui.free_ep') }}</span><span :class="store.remainingEP < 0 ? 'text-negative' : 'text-amber'">{{ store.remainingEP }}</span></div></div>
        </q-card-section>

        <q-separator dark />

        <q-card-section class="col-auto">
            <div class="text-h6 q-mb-sm">{{ $t('ui.template') }}</div>
            <q-select filled dark v-model="store.activeTemplate" :options="templateOptions" :label="$t('ui.template')" emit-value map-options dense options-dense><template v-slot:prepend><q-icon name="layers" /></template></q-select>
        </q-card-section>
    </q-card>
    `,
    setup() { return {}; }
};

const ShipSheet = {
    template: `
    <div class="swse-block">
        <div class="swse-header"><span>{{ store.meta.name || 'Untitled Ship' }}</span><span>CL {{ calculateCL }}</span></div>
        <div class="swse-sub">{{ store.chassis.size }} Starfighter ({{ getLocalizedName(store.chassis) }})</div>
        <div class="stat-grid">
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
            <div class="section-title">Logistics</div>
            <div class="stat-grid">
                <div><span class="bold">Crew</span> {{ store.chassis.logistics.crew }}</div>
                <div><span class="bold">Passengers</span> {{ store.chassis.logistics.pass }}</div>
                <div><span class="bold">Cargo</span> {{ store.currentCargo }}</div>
                <div><span class="bold">Consumables</span> {{ store.chassis.logistics.cons }}</div>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; text-align: right;">
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
        const editingMod = ref(null);

        const getName = (id) => {
            const def = store.db.EQUIPMENT.find(e => e.id === id);
            return getLocalizedName(def);
        };
        const getAvailability = (id) => {
            const def = store.db.EQUIPMENT.find(e => e.id === id);
            return def ? def.availability : '';
        }
        const getIcon = (id) => {
            const e = store.db.EQUIPMENT.find(e => e.id === id);
            if (e?.type === 'weapon') return 'gps_fixed';
            if (e?.type === 'engine') return 'speed';
            if (e?.type === 'upgrade') return 'upgrade';
            if (e?.type === 'modification') return 'swap_horiz';
            return 'memory';
        }
        const getEpDynamic = (id) => {
            const def = store.db.EQUIPMENT.find(e => e.id === id);
            if (def && def.stats && def.stats.ep_dynamic_pct) return Math.floor(store.chassis.baseEp * def.stats.ep_dynamic_pct);
            return null;
        }
        const isVariableCost = (id) => {
            const def = store.db.EQUIPMENT.find(e => e.id === id);
            return def && def.variableCost;
        }
        const isModification = (id) => {
            const def = store.db.EQUIPMENT.find(e => e.id === id);
            return def && def.category === 'Modifications';
        }
        const format = (n) => n === 0 ? '-' : new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        const hasUpgrades = (defId) => !!store.db.EQUIPMENT.find(e => e.id === defId)?.upgradeSpecs;
        const getUpgradeSpecs = (defId) => store.db.EQUIPMENT.find(e => e.id === defId)?.upgradeSpecs;
        const openConfig = (mod) => { editingMod.value = mod; showConfigDialog.value = true; };

        return { store, getName, getIcon, getEpDynamic, getAvailability, isVariableCost, isModification, format, showConfigDialog, editingMod, hasUpgrades, getUpgradeSpecs, openConfig };
    }
};

export const ConfigPanelWrapper = {
    ...ConfigPanel,
    setup() {
        const store = useShipStore();
        const { t } = useI18n();
        const templateOptions = computed(() => {
            if (!store.db.TEMPLATES) return [];
            return [
                { label: t('ui.template') + ': ' + t('ui.none'), value: null },
                ...store.db.TEMPLATES.map(tmp => ({ label: getLocalizedName(tmp), value: tmp.id }))
            ];
        });
        const format = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';
        return { store, templateOptions, format };
    }
};

export const ShipSheetWrapper = {
    ...ShipSheet,
    setup() {
        const store = useShipStore();
        const getName = (id) => {
            const def = store.db.EQUIPMENT.find(e => e.id === id);
            return getLocalizedName(def);
        };
        const getMod = (score) => Math.floor((score - 10) / 2);
        const weapons = computed(() => store.installedMods.filter(m => {
            const def = store.db.EQUIPMENT.find(e => e.id === m.defId);
            return def && def.type === 'weapon';
        }));
        const systemNames = computed(() => {
            const nonWeapons = store.installedMods.filter(m => {
                const def = store.db.EQUIPMENT.find(e => e.id === m.defId);
                return def && def.type !== 'weapon' && def.type !== 'engine';
            });
            if (nonWeapons.length === 0) return i18n.global.t('ui.installed_systems');
            return nonWeapons.map(m => getName(m.defId)).join(', ');
        });

        // Enhanced Damage Logic for Variants
        const getDmg = (id) => {
            if (id.includes('laser_light')) {
                if (id.includes('quad')) return '5d10x2';
                if (id.includes('twin')) return '4d10x2';
                return '3d10x2';
            }
            if (id.includes('laser_med')) {
                if (id.includes('quad')) return '6d10x2';
                if (id.includes('twin')) return '5d10x2';
                return '4d10x2';
            }
            if (id.includes('laser_hvy')) {
                if (id.includes('quad')) return '7d10x2';
                if (id.includes('twin')) return '6d10x2';
                return '5d10x2';
            }
            if(id.includes('turbo')) return '7d10x5';
            if(id.includes('proton')) return '9d10x2';
            if(id.includes('ion')) return '5d10x2';
            if(id.includes('concussion')) return '8d10x2';
            if(id.includes('tractor')) return '-';
            return '-';
        }
        const calculateCL = computed(() => { let cl = 10; if(store.chassis.size === 'Colossal') cl += 5; cl += Math.floor(store.installedMods.length / 2); if(store.template) cl += 2; return cl; });
        const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';
        return { store, getName, getMod, weapons, systemNames, getDmg, calculateCL, formatCreds, getLocalizedName };
    }
};
