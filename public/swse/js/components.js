import { useShipStore } from './store.js?v=2.1';
import { getLocalizedName, i18n } from './i18n.js?v=2.1';

const { computed, ref, reactive, watch } = Vue;
const { useI18n } = VueI18n;
const { useQuasar } = Quasar;

// --- BASE COMPONENTS ---
const StatPanel = {
    template: `
    <q-card id="tour-stats-panel" class="bg-grey-9 text-white">
        <q-card-section>
            <div class="text-caption text-grey">{{ $t('ui.chassis') }}</div>
            <div class="text-h5 text-primary">{{ getLocalizedName(store.chassis) }}</div>
            <div class="q-mt-xs text-caption text-grey">{{ store.chassis.size }} Starship (x{{ store.sizeMultVal }})</div>
            <div class="row items-center q-mt-sm">
                <div v-if="!editingName" class="text-h6 col-grow">{{ store.meta.name || 'Untitled Ship' }}</div>
                <q-input v-else dark dense v-model="store.meta.name" class="col-grow" autofocus @blur="editingName = false" @keyup.enter="editingName = false" />
                <q-btn flat round :icon="editingName ? 'check' : 'edit'" size="sm" @click="editingName = !editingName" />
            </div>
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
            <q-separator dark class="q-mt-sm" />
            <div class="q-mt-sm text-caption">
                <div class="row justify-between q-py-xs border-bottom-grey">
                    <div class="text-grey">Crew</div>
                    <div>{{ store.currentCrew }}</div>
                </div>
                <div class="row justify-between q-py-xs border-bottom-grey">
                    <div class="text-grey">Passengers</div>
                    <div>{{ store.currentPassengers }}</div>
                </div>
                <div class="row justify-between q-py-xs border-bottom-grey">
                    <div class="text-grey">Escape Pods for </div>
                    <div>{{ store.escapePodCapacity }}</div>
                </div>
                <div class="row justify-between q-py-xs border-bottom-grey">
                    <div class="text-grey">Cargo Capacity</div>
                    <div>{{ store.currentCargo }}</div>
                </div>
                <div class="row justify-between q-py-xs">
                    <div class="text-grey">Consumables</div>
                    <div>{{ store.currentConsumables }}</div>
                </div>
            </div>
        </q-card-section>
    </q-card>
    `,
    setup() { return {}; }
};

const SystemList = {
    template: `
    <div id="tour-system-list" class="q-pa-md col column">
        <div class="row justify-between items-center q-mb-md"><div class="text-h6">{{ $t('ui.installed_systems') }}</div><q-btn id="tour-add-btn" round color="positive" icon="add" size="sm" @click="store.showAddComponentDialog = true" /></div>
        <component :is="$q.screen.gt.sm ? 'q-scroll-area' : 'div'" :class="$q.screen.gt.sm ? 'col' : ''"><q-list separator dark>
            <q-item v-for="instance in store.installedComponents" :key="instance.instanceId">
                <q-item-section avatar><q-icon :name="getIcon(instance.defId)" color="primary" /></q-item-section>
                <q-item-section>
                    <q-item-label>
                        {{ getName(instance) }}
                        <q-badge v-if="isCustom(instance.defId)" color="purple" label="Custom" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(instance) === 'Illegal'" color="deep-purple" label="Ill" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(instance) === 'Military'" color="negative" label="Mil" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(instance) === 'Restricted'" color="warning" text-color="black" label="Res" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(instance) === 'Licensed'" color="info" label="Lic" class="q-ml-xs" />
                        <q-badge v-if="getAvailability(instance) === 'Common' && !isCustom(instance.defId)" color="positive" label="Com" class="q-ml-xs" />
                        <q-badge v-if="instance.isStock" color="grey-7" label="Stock" class="q-ml-xs" />
                        <q-badge v-if="instance.isNonStandard" color="warning" text-color="black" :label="$t('ui.ns_tag')" class="q-ml-xs" />
                        <q-icon v-if="!checkValidity(instance)" name="warning" color="negative" class="q-ml-sm"><q-tooltip>Invalid for Ship Size</q-tooltip></q-icon>
                    </q-item-label>
                    <q-item-label caption class="text-grey-5">
                        <span v-if="getEpDynamic(instance.defId)" class="text-positive">+{{ Math.abs(getEpDynamic(instance.defId)) }} EP</span>
                        <span v-else-if="store.getComponentEp(instance) !== 0">{{ store.getComponentEp(instance) }} EP <span class="text-grey-7">| {{ instance.location }}</span></span>
                        <span v-else>{{ instance.location }}</span>
                    </q-item-label>
                    <q-item-label v-if="instance.modifications" caption class="text-info">
                        <span v-if="instance.modifications.mount && instance.modifications.mount !== 'single'" class="q-mr-xs text-uppercase">{{ instance.modifications.mount }}</span>
                        <span v-if="instance.modifications.fireLink > 1" class="q-mr-xs">Fire-Linked ({{ instance.modifications.fireLink }})</span>
                        <span v-if="instance.modifications.enhancement && instance.modifications.enhancement !== 'normal'" class="q-mr-xs text-capitalize">{{ instance.modifications.enhancement }}</span>
                        <span v-if="getUpgradeSpecs(instance.defId)?.payload?.type === 'capacity' && instance.modifications.payloadCount > 0" class="q-mr-xs">Payload: {{ getUpgradeSpecs(instance.defId).payload.base }} + {{ instance.modifications.payloadCount }}</span>
                        <span v-else-if="instance.modifications.payloadOption" class="q-mr-xs">Extra Payload</span>
                        <span v-if="instance.modifications.batteryCount > 1">Battery ({{ instance.modifications.batteryCount }})</span>
                        <span v-if="instance.modifications.quantity > 1"> (x{{ instance.modifications.quantity }})</span>
                        <div v-if="instance.modifications.weaponUser" class="text-caption text-grey-5">{{ instance.modifications.weaponUser }}</div>
                    </q-item-label>
                </q-item-section>
                <q-item-section side>
                    <div class="text-right q-mr-sm">
                        <div class="text-caption text-amber">
                            <span v-if="isVariableCost(instance.defId)" class="text-italic">{{ $t('ui.variable') }}</span>
                            <span v-else>{{ format(store.getComponentCost(instance)) }}</span>
                        </div>
                    </div>
                    <div class="row items-center">
                        <q-badge v-if="instance.miniaturization > 0" color="orange" label="Mini" class="q-mr-xs" />
                        <q-btn v-if="hasUpgrades(instance.defId)" flat round icon="settings" color="accent" size="sm" @click="openConfig(instance)" />
                        <q-btn flat round icon="help_outline" color="info" size="sm" @click="openWiki(instance.defId)" />
                        <q-btn flat round icon="delete" color="negative" size="sm" @click="store.removeComponent(instance.instanceId)" />
                    </div>
                </q-item-section>
            </q-item>
            <div v-if="store.installedComponents.length === 0" class="text-center text-grey q-pa-lg">No systems installed.</div>
        </q-list></component>
        <q-dialog v-model="showConfigDialog">
            <q-card class="bg-grey-9 text-white" style="min-width: 350px">
                <q-card-section><div class="text-h6">Configure System</div></q-card-section>
                <q-card-section v-if="editingInstance">
                    <div v-if="isWeapon(editingInstance.defId)" class="q-mb-md">
                        <div class="text-caption">Weapon User</div>
                        <q-btn-toggle spread dark v-model="editingInstance.modifications.weaponUser" toggle-color="primary" :options="[{label: 'Pilot', value: 'Pilot'}, {label: 'Copilot', value: 'Copilot'}, {label: 'Gunner', value: 'Gunner'}]" />
                    </div>
                    <div v-if="hasUpgrades(editingInstance.defId)" class="q-mb-md">
                        <div class="q-gutter-y-md">
                            <div v-if="canMount(editingInstance.defId)">
                                <div class="text-caption q-mb-xs">Mount: <span class="text-white">{{ configModel.mountLabel }}</span></div>
                                <q-slider dark v-model="configModel.mountIndex" :min="0" :max="2" :step="1" snap markers label />
                            </div>
                            <div v-if="canFireLink(editingInstance.defId)">
                                <div class="text-caption q-mb-xs">Fire Link: <span class="text-white">{{ configModel.fireLinkLabel }}</span></div>
                                <q-slider dark v-model="configModel.fireLinkIndex" :min="0" :max="2" :step="1" snap markers label />
                            </div>
                            <div v-if="canEnhance(editingInstance.defId)">
                                <div class="text-caption q-mb-xs">Enhancement: <span class="text-white">{{ configModel.enhancementLabel }}</span></div>
                                <q-slider dark v-model="configModel.enhancementIndex" :min="0" :max="2" :step="1" snap markers label />
                            </div>
                        </div>
                    </div>
                    <div v-if="getUpgradeSpecs(editingInstance.defId)?.payload" class="q-mb-md">
                        <div v-if="getUpgradeSpecs(editingInstance.defId).payload.type === 'capacity'">
                            <div class="text-caption">Additional {{ getUpgradeSpecs(editingInstance.defId).payload.unitLabel }} ({{ format(store.allEquipment.find(e => e.id === editingInstance.defId).baseCost * getUpgradeSpecs(editingInstance.defId).payload.costFactor) }} each)</div>
                            <q-input dark type="number" filled v-model.number="editingInstance.modifications.payloadCount" label="Additional Capacity" min="0" :max="(getUpgradeSpecs(editingInstance.defId).payload.max * (editingInstance.modifications.fireLink || 1)) - (getUpgradeSpecs(editingInstance.defId).payload.base * (editingInstance.modifications.fireLink || 1))" :hint="'Base: ' + (getUpgradeSpecs(editingInstance.defId).payload.base * (editingInstance.modifications.fireLink || 1)) + ' | Max Total: ' + (getUpgradeSpecs(editingInstance.defId).payload.max * (editingInstance.modifications.fireLink || 1))" />
                        </div>
                        <q-checkbox v-else dark v-model="editingInstance.modifications.payloadOption" :label="getUpgradeSpecs(editingInstance.defId).payload.label + ' (' + format(getUpgradeSpecs(editingInstance.defId).payload.cost) + ')'" />
                    </div>
                    <div v-if="canBattery(editingInstance.defId) && (!editingInstance.modifications.fireLink || editingInstance.modifications.fireLink === 1)" class="q-mb-md">
                        <div class="text-caption">Battery Size ({{ editingInstance.modifications.batteryCount }})</div>
                        <q-slider dark v-model="editingInstance.modifications.batteryCount" :min="1" :max="6" :step="1" snap markers label />
                    </div>
                    <div v-if="getUpgradeSpecs(editingInstance.defId)?.quantity" class="q-mb-md">
                        <div class="text-caption">Quantity</div>
                        <q-input dark type="number" filled v-model.number="editingInstance.modifications.quantity" label="Quantity" min="1" />
                    </div>
                    <div v-if="getUpgradeSpecs(editingInstance.defId)?.fireLinkOption && (editingInstance.modifications.fireLink || 1) > 1" class="q-mb-md">
                        <q-checkbox dark v-model="editingInstance.modifications.fireLinkOption" :label="'Optional Fire-Link (+' + format(getOptionCost(editingInstance.defId, 'fireLinkOption')) + ')'" />
                    </div>
                    <div v-if="canPointBlank(editingInstance.defId)" class="q-mb-md">
                        <q-checkbox dark v-model="editingInstance.modifications.pointBlank" :label="'Point Blank (+' + format(getOptionCost(editingInstance.defId, 'pointBlank')) + ')'" />
                    </div>
                    <div v-for="opt in getGenericOptions(editingInstance.defId)" :key="opt.value" class="q-mb-md">
                         <q-checkbox dark v-model="editingInstance.modifications[opt.value]" :label="opt.label" />
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
    <q-card id="tour-config-panel" class="bg-grey-9 text-white full-height column">
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
            <div class="row items-center q-mb-sm">
                <div class="text-h6">{{ $t('ui.template') }}</div>
                <q-btn flat round dense icon="info" size="xs" color="grey-5" class="q-ml-xs">
                    <q-tooltip>{{ $t('ui.template_help') }}</q-tooltip>
                </q-btn>
            </div>
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

                <div v-if="store.hasEscapePods" class="q-mt-lg">
                    <q-separator dark class="q-mb-md" />
                    <div class="text-h6">Escape Pods</div>
                    <div class="text-caption text-grey">Capacity Reduced: {{ store.escapePodsToEpPct }}%</div>
                     <div class="text-caption text-grey-5 q-mb-sm">
                        Required Capacity: {{ store.chassis.logistics.crew + store.chassis.logistics.pass }} beings
                    </div>
                    <q-slider dark v-model="store.escapePodsToEpPct" :min="0" :max="100" :step="10" label color="negative" />
                    <div class="text-center q-mt-md text-positive text-h6">
                        +{{ store.escapePodsEpGain }} EP
                    </div>
                    <div class="text-caption text-negative q-mt-sm" style="font-size: 0.8em; line-height: 1.2;">
                        * Unless the vessel is a military one it is illegal to remove escape pods.
                    </div>
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
            <div><span class="bold">HP</span> {{ store.currentStats.hp }}; <span class="bold">DR</span> {{ store.currentStats.dr }}; <span class="bold">SR</span> {{ store.currentStats.sr || 0 }}; <span class="bold">Threshold</span> {{ store.damageThreshold }}</div>

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
                <div><span class="bold">Crew</span> {{ store.currentCrew }}</div>
                <div><span class="bold">Passengers</span> {{ store.currentPassengers }}</div>
                <div><span class="bold">Cargo</span> {{ store.currentCargo }}</div>
                <div><span class="bold">Consumables</span> {{ store.currentConsumables }}</div>
            </div>

            <div class="cost-line">
                <span class="bold">Total Cost:</span> {{ formatCreds(store.totalCost) }} <span style="font-size: 0.8em;">(Inc. {{ formatCreds(store.licensingCost) }} fees)</span>
            </div>
        </div>
    </div>
    `,
    setup() { return {}; }
};

export const HangarDialog = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `
    <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
        <q-card class="bg-grey-9 text-white" :style="$q.screen.lt.sm ? 'width: 100%' : 'min-width: 500px; max-width: 90vw;'">
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

        const stockFighters = computed(() => store.allShips.filter(s => ['Huge', 'Gargantuan'].includes(s.size)));
        const stockFreighters = computed(() => store.allShips.filter(s => s.name.includes('Freighter') || s.name === 'Shuttle'));
        const stockCapitals = computed(() => store.allShips.filter(s => s.size.includes('Colossal') && !s.name.includes('Freighter') && !s.name.includes('Shuttle')));

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

export const CustomManagerDialog = {
    template: `
    <q-dialog v-model="store.showCustomManager">
        <q-card class="bg-grey-9 text-white" :style="$q.screen.lt.sm ? 'width: 100%; height: 100vh; display: flex; flex-direction: column;' : 'min-width: 600px; height: 80vh; display: flex; flex-direction: column;'">
            <q-card-section class="row items-center q-pb-none">
                <div class="text-h6">Library Manager</div>
                <q-space></q-space>
                <q-btn icon="close" flat round dense v-close-popup></q-btn>
            </q-card-section>

            <q-card-section class="q-py-sm">
                <div class="row q-gutter-sm">
                    <q-btn color="primary" icon="add" label="New Library" @click="store.addLibrary()"></q-btn>
                    <q-btn color="secondary" icon="upload" label="Import Library" @click="triggerLibraryImport"></q-btn>
                    <input type="file" ref="libraryInput" @change="handleLibraryImport" accept=".json" style="display: none" />
                </div>
            </q-card-section>

            <q-card-section class="col q-pa-none scroll">
                <q-list separator dark class="q-pa-md">
                    <q-expansion-item v-for="(lib, index) in store.libraries" :key="lib.id" class="bg-grey-8 q-mb-sm rounded-borders" group="libraries">
                        <template v-slot:header>
                            <q-item-section avatar>
                                <q-toggle v-model="lib.active" color="positive" @click.stop />
                            </q-item-section>
                            <q-item-section>
                                <q-item-label class="text-bold">
                                    {{ lib.name }}
                                    <q-badge v-if="lib.editable" color="info" label="Editable" class="q-ml-sm" />
                                </q-item-label>
                                <q-item-label caption class="text-grey-4">
                                    {{ lib.components.length }} Components, {{ lib.ships.length }} Ships
                                </q-item-label>
                            </q-item-section>
                            <q-item-section side>
                                <div class="row q-gutter-xs">
                                    <q-btn flat round icon="keyboard_arrow_up" size="sm" @click.stop="store.moveLibrary(lib.id, 'up')" :disable="index === 0"></q-btn>
                                    <q-btn flat round icon="keyboard_arrow_down" size="sm" @click.stop="store.moveLibrary(lib.id, 'down')" :disable="index === store.libraries.length - 1"></q-btn>
                                    <q-btn flat round icon="edit" color="info" size="sm" @click.stop="editLibraryName(lib)"></q-btn>
                                    <q-btn flat round icon="download" color="accent" size="sm" @click.stop="exportLibrary(lib)"></q-btn>
                                    <q-btn flat round icon="delete" color="negative" size="sm" @click.stop="deleteLibrary(lib)"></q-btn>
                                </div>
                            </q-item-section>
                        </template>

                        <q-card class="bg-grey-9">
                             <q-card-section class="row items-center q-pb-none">
                                <div class="text-subtitle2">Contents</div>
                                <q-space></q-space>
                                <q-btn size="sm" color="primary" icon="add" label="Add Component" @click="store.openCustomDialog()" :disable="!lib.editable" class="q-mr-sm" />
                                <q-btn size="sm" color="accent" icon="rocket" label="New Ship" @click="store.openCustomShipDialog()" :disable="!lib.editable" />
                             </q-card-section>
                             <q-card-section>
                                <q-list separator dark dense>
                                    <q-item-label header class="text-grey-5">Components</q-item-label>
                                    <q-item v-for="comp in lib.components" :key="comp.id">
                                        <q-item-section>{{ comp.name }}</q-item-section>
                                        <q-item-section side>
                                            <div class="row q-gutter-xs">
                                                <q-btn flat round icon="edit" size="xs" color="info" @click="store.openCustomDialog(comp.id)" :disable="!lib.editable" />
                                                <q-btn flat round icon="delete" size="xs" color="negative" @click="store.removeCustomComponent(comp.id)" :disable="!lib.editable" />
                                            </div>
                                        </q-item-section>
                                    </q-item>
                                    <div v-if="lib.components.length === 0" class="text-caption text-grey q-ml-md">None</div>

                                    <q-item-label header class="text-grey-5">Ships</q-item-label>
                                    <q-item v-for="ship in lib.ships" :key="ship.id">
                                        <q-item-section>{{ ship.name }} ({{ ship.size }})</q-item-section>
                                        <q-item-section side>
                                            <div class="row q-gutter-xs">
                                                <q-btn flat round icon="edit" size="xs" color="info" @click="store.openCustomShipDialog(ship.id)" :disable="!lib.editable" />
                                                <q-btn flat round icon="delete" size="xs" color="negative" @click="store.removeCustomShip(ship.id)" :disable="!lib.editable" />
                                            </div>
                                        </q-item-section>
                                    </q-item>
                                    <div v-if="lib.ships.length === 0" class="text-caption text-grey q-ml-md">None</div>
                                </q-list>
                             </q-card-section>
                        </q-card>
                    </q-expansion-item>
                    <div v-if="store.libraries.length === 0" class="text-center text-grey q-pa-lg">
                        No libraries loaded.
                    </div>
                </q-list>
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
                    // Support legacy import (array of components) by wrapping
                    if (Array.isArray(data)) {
                        store.importLibrary({
                            name: file.name.replace('.json', ''),
                            components: data
                        });
                         $q.notify({ type: 'positive', message: 'Legacy library imported successfully.' });
                    } else if (data.components || data.ships) {
                         // Standard Library Import
                         store.importLibrary(data);
                         $q.notify({ type: 'positive', message: 'Library imported successfully.' });
                    } else {
                        $q.notify({ type: 'negative', message: 'Invalid file format.' });
                    }
                } catch (error) {
                    console.error(error);
                    $q.notify({ type: 'negative', message: 'Failed to parse JSON.' });
                }
                if (libraryInput.value) libraryInput.value.value = '';
            };
            reader.readAsText(file);
        };

        const exportLibrary = (lib) => {
            const exportObj = {
                name: lib.name,
                version: "1.0",
                components: lib.components,
                ships: lib.ships
            };
            const jsonStr = JSON.stringify(exportObj, null, 2);
            const blob = new Blob([jsonStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `swse_lib_${lib.name.replace(/\s+/g, '_').toLowerCase()}.json`;
            a.click();
        };

        const deleteLibrary = (lib) => {
            $q.dialog({
                dark: true,
                title: 'Confirm Deletion',
                message: `Are you sure you want to delete library "${lib.name}"?`,
                cancel: true,
                persistent: true,
                color: 'negative'
            }).onOk(() => {
                store.removeLibrary(lib.id);
            });
        };

        const editLibraryName = (lib) => {
             $q.dialog({
                dark: true,
                title: 'Edit Library Name',
                prompt: {
                    model: lib.name,
                    type: 'text'
                },
                cancel: true,
                persistent: true,
                color: 'primary'
            }).onOk(data => {
                store.updateLibrary(lib.id, { name: data });
            });
        };

        return { store, libraryInput, triggerLibraryImport, handleLibraryImport, exportLibrary, deleteLibrary, editLibraryName };
    }
};

export const CustomShipDialog = {
    template: `
    <q-dialog v-model="store.customShipDialogState.visible">
        <q-card class="bg-grey-9 text-white" :style="$q.screen.lt.sm ? 'width: 100%' : 'min-width: 600px'">
            <q-card-section>
                <div class="text-h6">{{ store.customShipDialogState.shipId ? 'Edit Custom Ship' : 'Create Custom Ship' }}</div>
            </q-card-section>
            <q-card-section class="q-pt-none scroll" style="max-height: 80vh">
                <div class="column q-gutter-md">
                    <!-- Basic Info -->
                    <div class="text-subtitle2 text-primary">General Information</div>
                    <div><q-select filled dark v-model="store.customShipDialogState.targetLibraryId" :options="store.libraries.filter(l => l.editable).map(l => ({ label: l.name, value: l.id }))" label="Target Library" emit-value map-options></q-select></div>
                    <div class="row q-col-gutter-sm">
                        <div class="col-8"><q-input filled dark v-model="newShip.name" label="Ship Name" :rules="[val => !!val || 'Name is required']"></q-input></div>
                        <div class="col-4">
                            <q-select filled dark v-model="newShip.size" :options="store.db.SIZE_RANK" label="Size" emit-value map-options></q-select>
                        </div>
                        <div class="col-12" v-if="store.isAdmin">
                            <q-input filled dark v-model="newShip.id" label="ID (Admin)" hint="Leave blank to auto-generate"></q-input>
                        </div>
                    </div>
                    <div class="row q-col-gutter-sm">
                        <div class="col-6"><q-input filled dark v-model="newShip.cost" label="Base Cost (cr)" type="number"></q-input></div>
                        <div class="col-6"><q-input filled dark v-model="newShip.baseEp" label="Base EP" type="number"></q-input></div>
                    </div>

                    <q-separator dark />

                    <!-- Stats -->
                    <div class="text-subtitle2 text-primary">Base Statistics</div>
                    <div class="row q-col-gutter-sm">
                        <div class="col-4"><q-input filled dark v-model.number="newShip.stats.str" label="Strength" type="number"></q-input></div>
                        <div class="col-4"><q-input filled dark v-model.number="newShip.stats.dex" label="Dexterity" type="number"></q-input></div>
                        <div class="col-4"><q-input filled dark v-model.number="newShip.stats.int" label="Intelligence" type="number"></q-input></div>
                    </div>
                    <div class="row q-col-gutter-sm">
                <div class="col-6"><q-input filled dark v-model.number="newShip.stats.hp" label="HP" type="number"></q-input></div>
                <div class="col-6"><q-input filled dark v-model.number="newShip.stats.armor" label="Armor" type="number"></q-input></div>
                <div class="col-6"><q-input filled dark v-model.number="newShip.stats.dr" label="DR" type="number"></q-input></div>
                    </div>

                    <q-separator dark />

                    <!-- Logistics -->
                    <div class="text-subtitle2 text-primary">Logistics</div>
                    <div class="row q-col-gutter-sm">
                        <div class="col-6"><q-input filled dark v-model.number="newShip.logistics.crew" label="Min Crew" type="number"></q-input></div>
                        <div class="col-6"><q-input filled dark v-model.number="newShip.logistics.pass" label="Passengers" type="number"></q-input></div>
                    </div>
                    <div class="row q-col-gutter-sm">
                        <div class="col-6"><q-input filled dark v-model="newShip.logistics.cargo" label="Cargo Capacity" hint="e.g. '100 tons'"></q-input></div>
                        <div class="col-6"><q-input filled dark v-model="newShip.logistics.cons" label="Consumables" hint="e.g. '1 month'"></q-input></div>
                    </div>
                    <div>
                <q-input filled dark v-model="newShip.description" label="Description" type="textarea" autogrow></q-input>
                    </div>

                </div>
            </q-card-section>
            <q-card-actions align="right">
                <q-btn flat label="Cancel" color="grey" v-close-popup />
                <q-btn unelevated class="q-ml-sm" :label="store.customShipDialogState.shipId ? 'Save Changes' : 'Create'" color="positive" @click="createCustomShip" :disable="!newShip.name" />
            </q-card-actions>
        </q-card>
    </q-dialog>
    `,
    setup() {
        const store = useShipStore();
        const $q = useQuasar();

        const newShip = reactive({
            id: '',
            name: '',
            size: 'Huge',
            cost: 0,
            baseEp: 0,
            description: '',
            stats: { str: 0, dex: 0, int: 0, hp: 0, armor: 0, dr: 0 },
            logistics: { crew: 0, pass: 0, cargo: '', cons: '' }
        });

        const createCustomShip = () => {
            if (!newShip.name) return;
            const isEdit = !!store.customShipDialogState.shipId;

            let id = newShip.id;
            if (!id) {
                 id = isEdit ? store.customShipDialogState.shipId : 'custom_ship_' + crypto.randomUUID();
            }

            const ship = {
                id: id,
                name: newShip.name,
                size: newShip.size,
                cost: Number(newShip.cost),
                baseEp: Number(newShip.baseEp),
                description: newShip.description,
                stats: { ...newShip.stats },
                logistics: { ...newShip.logistics }
            };

            if (isEdit) {
                store.updateCustomShip(ship);
            } else {
                store.addCustomShip(ship, store.customShipDialogState.targetLibraryId);
            }
            store.customShipDialogState.visible = false;
        };

        watch(() => store.customShipDialogState.visible, (visible) => {
            if (visible) {
                if (store.customShipDialogState.shipId) {
                    const existing = store.allShips.find(s => s.id === store.customShipDialogState.shipId);
                    if (existing) {
                        newShip.id = existing.id;
                        newShip.name = existing.name;
                        newShip.size = existing.size;
                        newShip.cost = existing.cost;
                        newShip.baseEp = existing.baseEp;
                        newShip.description = existing.description || '';

                        newShip.stats = { str: 0, dex: 0, int: 0, hp: 0, armor: 0, dr: 0, ...existing.stats };
                        newShip.logistics = { crew: 0, pass: 0, cargo: '', cons: '', ...existing.logistics };
                    }
                } else {
                    // Reset
                    newShip.id = '';
                    newShip.name = '';
                    newShip.size = 'Huge';
                    newShip.cost = 0;
                    newShip.baseEp = 0;
                    newShip.description = '';
                    newShip.stats = { str: 40, dex: 10, int: 10, hp: 120, armor: 5, dr: 10 };
                    newShip.logistics = { crew: 1, pass: 0, cargo: '0 tons', cons: '1 day' };
                }
            } else {
                store.customShipDialogState.shipId = null;
            }
        });

        return { store, newShip, createCustomShip };
    }
};

export const AddModDialog = {
    template: `
    <q-dialog v-model="store.showAddComponentDialog">
        <q-card class="bg-grey-9 text-white" :style="$q.screen.lt.sm ? 'width: 100%' : 'min-width: 500px'">
            <q-card-section>
                <div class="row items-center justify-between">
                    <div class="text-h6">{{ $t('ui.install_system') }}</div>
                    <q-btn v-if="store.isAdmin" outline color="primary" label="Create New (Admin)" icon="add" size="sm" @click="createNew" />
                </div>
                <div class="text-caption text-grey">{{ $t('ui.install_caption') }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none q-gutter-md">
                <!-- Search Bar -->
                <div class="q-mb-md row items-center">
                    <div class="col-grow">
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
                    <div class="col-auto q-ml-sm">
                        <q-btn flat round dense icon="info" size="sm" color="grey-5">
                            <q-tooltip>{{ $t('ui.search_help') }}</q-tooltip>
                        </q-btn>
                    </div>
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
                    <div class="row q-gutter-sm q-mt-sm justify-end">
                        <q-btn flat dense icon="open_in_new" label="Wiki" color="info" @click="openWiki"></q-btn>
                        <q-btn v-if="store.isAdmin" flat dense icon="code" label="Edit JSON" color="accent" @click="openJsonEditor"></q-btn>
                        <q-btn v-if="store.isAdmin" flat dense icon="delete" label="Delete" color="negative" @click="deleteComponent"></q-btn>
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
            <q-card class="bg-grey-9 text-white" :style="$q.screen.lt.sm ? 'width: 100%' : 'min-width: 600px; max-width: 90vw;'">
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

        // --- Helper Logic Extracted for Maintainability ---

        // 1. Search Logic
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

        // 2. Menu Options Logic (Computed)
        // Computes available categories based on all equipment
        const categoryOptions = computed(() => {
            const cats = [...new Set(store.allEquipment.map(e => e.category))];
            return cats.map(c => {
                const key = 'cat.' + c.replace(/ /g, '_').toLowerCase();
                const label = t(key);
                return { label: label !== key ? label : c, value: c };
            }).sort((a, b) => a.label.localeCompare(b.label));
        });

        // Computes available groups based on selected category
        const groupOptions = computed(() => {
            if (!newComponentCategory.value) return [];
            const groups = [...new Set(store.allEquipment.filter(e => e.category === newComponentCategory.value).map(e => e.group))];
            return groups.map(g => ({ label: g, value: g })).sort((a, b) => a.label.localeCompare(b.label));
        });

        // Computes available items based on selected group AND category
        // Ensuring strict category check prevents cross-category group pollution
        const itemOptions = computed(() => {
            if (!newComponentGroup.value) return [];
            return store.allEquipment.filter(e => e.group === newComponentGroup.value && e.category === newComponentCategory.value).map(e => ({
                ...e,
                label: getLocalizedName(e)
            })).sort((a, b) => {
                const nameCompare = a.label.localeCompare(b.label);
                if (nameCompare !== 0) return nameCompare;
                return a.baseEp - b.baseEp;
            });
        });

        const selectedItemDef = computed(() => {
            if (!newComponentSelection.value) return null;
            return store.allEquipment.find(e => e.id === newComponentSelection.value);
        });

        // 3. Validation Logic
        // Checks if component is compatible with ship size
        const isSizeValid = (itemDef) => {
            const shipIndex = store.db.SIZE_RANK.indexOf(store.chassis.size);

            // Backward compatibility for maxSize -> maxShipSize
            const max = itemDef.maxShipSize || itemDef.maxSize;
            if (max) {
                const rankIndex = store.db.SIZE_RANK.indexOf(max);
                if (shipIndex > rankIndex) return false;
            }

            if (itemDef.minShipSize) {
                const minRankIndex = store.db.SIZE_RANK.indexOf(itemDef.minShipSize);
                if (shipIndex < minRankIndex) return false;
            }

            return true;
        };

        // 4. Cost/EP Preview
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

        // 5. JSON Editor Logic
        const showJsonEditor = ref(false);
        const jsonContent = ref('');

        const openWiki = () => {
            if (selectedItemDef.value && selectedItemDef.value.wiki) {
                window.open(selectedItemDef.value.wiki, '_blank');
            } else if (selectedItemDef.value) {
                // Fallback for items that might miss the wiki property
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

        // Saves JSON edits and updates UI state to reflect changes immediately
        const saveJson = () => {
            try {
                const newDef = JSON.parse(jsonContent.value);
                store.updateEquipment(newDef);

                // Explicitly update local component state if category or group changed
                // This forces the UI menus to refresh and show the item in its new location
                if (newDef.category !== newComponentCategory.value) {
                    newComponentCategory.value = newDef.category;
                }
                if (newDef.group !== newComponentGroup.value) {
                    newComponentGroup.value = newDef.group;
                }

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
                    let loc = def.location || '';
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

export const CustomComponentDialog = {
    template: `
    <q-dialog v-model="store.customDialogState.visible">
        <q-card class="bg-grey-9 text-white" :style="$q.screen.lt.sm ? 'width: 100%' : 'min-width: 500px'">
            <q-card-section>
                <div class="text-h6">{{ store.customDialogState.componentId ? 'Edit Custom Component' : 'Create Custom Component' }}</div>
            </q-card-section>
            <q-card-section class="q-pt-none">
                <div class="column q-gutter-md">
                    <div><q-select filled dark v-model="store.customDialogState.targetLibraryId" :options="store.libraries.filter(l => l.editable).map(l => ({ label: l.name, value: l.id }))" label="Target Library" emit-value map-options></q-select></div>
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
                    <div><q-input filled dark v-model="newCustomComponent.location" label="Location" hint="Default install location"></q-input></div>
                    <div class="row q-col-gutter-sm">
                        <div class="col"><q-input filled dark v-model="newCustomComponent.baseCost" label="Base Cost" type="number"></q-input></div>
                        <div class="col"><q-input filled dark v-model="newCustomComponent.baseEp" label="Base EP" type="number"></q-input></div>
                    </div>
                    <div>
                        <q-checkbox dark v-model="newCustomComponent.sizeMult" label="Cost Multiplied by Size"></q-checkbox>
                    </div>

                    <div>
                        <div class="text-subtitle2 q-mb-sm">
                            Properties & Modifiers
                            <q-icon name="info" color="grey-5" size="xs" class="q-ml-xs">
                                <q-tooltip>{{ $t('ui.properties_help') }}</q-tooltip>
                            </q-icon>
                        </div>
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
        const newCustomComponent = reactive({ name: '', category: 'Weapon Systems', group: '', location: '', baseCost: 0, baseEp: 0, sizeMult: false, stats: {} });
        const activeProperties = ref([]);
        const propertyToAdd = ref(null);
        const groupOptionsFiltered = ref([]);
        const exclusiveOptionsFiltered = ref([]);

        // Property Definitions (Moved from app.js)
        const propertyDefinitions = [
            { label: 'Location', key: 'location', type: 'string', location: 'root' },
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
            return cats.map(c => {
                const key = 'cat.' + c.replace(/ /g, '_').toLowerCase();
                const label = t(key);
                return { label: label !== key ? label : c, value: c };
            });
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
                location: newCustomComponent.location,
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
                store.addCustomComponent(comp, store.customDialogState.targetLibraryId);
                store.customDialogState.visible = false;
            }
        };

        watch(() => store.customDialogState.visible, (visible) => {
            if (visible) {
                activeProperties.value = [];
                if (store.customDialogState.componentId) {
                    const existing = store.allEquipment.find(c => c.id === store.customDialogState.componentId);
                    if (existing) {
                        Object.assign(newCustomComponent, {
                            name: existing.name, category: existing.category, group: existing.group, location: existing.location,
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
                    Object.assign(newCustomComponent, { name: '', category: 'Weapon Systems', group: '', location: '', baseCost: 0, baseEp: 0, sizeMult: false, stats: {}, id: '', addToCore: false });
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
        const editingName = ref(false);
        return { store, getLocalizedName, editingName };
    }
};

export const SystemListWrapper = {
    ...SystemList,
    setup() {
        const store = useShipStore();
        const showConfigDialog = ref(false);
        const editingInstance = ref(null);

        const getName = (instance) => {
            const id = instance.defId || instance;
            const def = store.allEquipment.find(e => e.id === id);
            let name = getLocalizedName(def);

            if (instance && instance.defId) {
                const calcDmg = store.getComponentDamage(instance);
                if (calcDmg) {
                    name = name.replace(/\(\d+d\d+(x\d+)?\)/, `(${calcDmg})`);
                }
            }
            return name;
        };
        const getAvailability = (idOrInstance) => {
            const id = idOrInstance.defId || idOrInstance;
            const def = store.allEquipment.find(e => e.id === id);
            let avail = def && def.availability ? def.availability : 'Common';

            if (idOrInstance.modifications) {
                 const levels = { 'Common': 0, 'Licensed': 1, 'Restricted': 2, 'Military': 3, 'Illegal': 4 };
                 const reverse = ['Common', 'Licensed', 'Restricted', 'Military', 'Illegal'];
                 let currentLevel = levels[avail] || 0;
                 const mods = idOrInstance.modifications;

                 if (mods.mount === 'quad') currentLevel = Math.max(currentLevel, 2);
                 if (mods.fireLink > 1) currentLevel = Math.max(currentLevel, 2);
                 if (mods.enhancement === 'enhanced') currentLevel = Math.max(currentLevel, 2);
                 if (mods.enhancement === 'advanced') currentLevel = Math.max(currentLevel, 3);

                 if (def.upgradeSpecs && def.upgradeSpecs.optionCosts) {
                     for (const [key, value] of Object.entries(def.upgradeSpecs.optionCosts)) {
                         if (mods[key]) {
                             if (value.availability) {
                                 const availLevel = levels[value.availability];
                                 if (availLevel !== undefined) {
                                     currentLevel = Math.max(currentLevel, availLevel);
                                 }
                             }
                         }
                     }
                 }

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
            if (!e) return 'memory';
            if (store.isWeapon(e.id)) return 'gps_fixed';
            if (store.isEngine(e.id)) return 'speed';
            if (e.category === 'Modifications' || e.category === 'Weapon Upgrades') return 'upgrade';
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
            return store.isWeapon(id);
        }
        const isLauncher = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.group === 'Launchers';
        }
        const isCustom = (id) => {
            // Updated to check flattened allEquipment vs base equipment?
            // Actually, customComponents in store now returns all components from libraries.
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
            return false;
        };
        const canFireLink = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (specs.componentOptions && specs.componentOptions.includes('weapon.fireLink')) return true;
            if (specs.fireLink !== undefined) return specs.fireLink;
            return false;
        };
        const canEnhance = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (specs.componentOptions && specs.componentOptions.includes('weapon.enhancement')) return true;
            if (specs.enhancement !== undefined) return specs.enhancement;
            return false;
        };
        const checkConstraints = (specValue) => {
            if (specValue === true) return true;
            if (typeof specValue === 'object') {
                const shipIndex = store.db.SIZE_RANK.indexOf(store.chassis.size);

                if (specValue.minShipSize) {
                    const minIndex = store.db.SIZE_RANK.indexOf(specValue.minShipSize);
                    if (shipIndex < minIndex) return false;
                }
                if (specValue.maxShipSize) {
                    const maxIndex = store.db.SIZE_RANK.indexOf(specValue.maxShipSize);
                    if (shipIndex > maxIndex) return false;
                }
                return true;
            }
            return false;
        };

        const canBattery = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (specs.componentOptions && specs.componentOptions.includes('weapon.battery')) return true;

            return checkConstraints(specs.battery);
        };

        const canPointBlank = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs) return false;
            if (!specs.componentOptions || !specs.componentOptions.includes('weapon.pointBlank')) return false;
            if (specs.pointBlank) return checkConstraints(specs.pointBlank);
            return true;
        };

        const getGenericOptions = (defId) => {
            const specs = getUpgradeSpecs(defId);
            if (!specs || !specs.componentOptions) return [];
            const handled = ['weapon.multibarrel', 'weapon.fireLink', 'weapon.enhancement', 'weapon.battery', 'ordnance', 'weapon.pointBlank'];
            const labels = {
                'weapon.autofire': 'Autofire Capability',
                'slaveCircuits.recall': 'Recall Circuit Functionality',
                'slave': 'Slave Circuit'
            };
            return specs.componentOptions
                .filter(opt => !handled.includes(opt))
                .map(opt => ({ value: opt, label: labels[opt] || opt }));
        };

        const openConfig = (instance) => { editingInstance.value = instance; showConfigDialog.value = true; };

        const openWiki = (defId) => {
             const def = store.allEquipment.find(e => e.id === defId);
             if (!def) return;

             if (def.wiki) {
                 window.open(def.wiki, '_blank');
             } else {
                 const name = def.name.replace(/ /g, '_');
                 window.open(`https://swse.fandom.com/wiki/${name}`, '_blank');
             }
        };

        const checkValidity = (instance) => {
            const def = store.allEquipment.find(e => e.id === instance.defId);
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

        const getOptionCost = (defId, key) => {
            return store.getComponentCost({ defId: defId, modifications: { [key]: true }, isStock: false }); // Hacky reuse of store function?
            // Actually store.getComponentCost is instance based.
            // But we can replicate the cost lookup logic or just trust the store exposes it.
            // The Wrapper previous implementation had logic here.
            // I should have kept the previous logic for getOptionCost or use the one in store if available.
            // Store has internal logic.
            // Let's restore the logic from previous file content for safety as it was there.

             const def = store.allEquipment.find(e => e.id === defId);
             if (!def) return 0;
             let costDef = null;
             if (def.upgradeSpecs && def.upgradeSpecs.optionCosts && def.upgradeSpecs.optionCosts[key] !== undefined) {
                 costDef = def.upgradeSpecs.optionCosts[key];
             } else if (def.upgradeSpecs && def.upgradeSpecs[key] && typeof def.upgradeSpecs[key] === 'object' && def.upgradeSpecs[key].cost !== undefined) {
                 costDef = def.upgradeSpecs[key].cost;
             }
             if (costDef === null && store.db.DEFAULT_OPTION_COSTS && store.db.DEFAULT_OPTION_COSTS[key] !== undefined) {
                 costDef = store.db.DEFAULT_OPTION_COSTS[key];
             }
             if (costDef === null) return 0;
             if (typeof costDef === 'number') {
                 return costDef;
             } else if (typeof costDef === 'object') {
                 if (costDef.multiplier) return def.baseCost * costDef.multiplier;
                 if (costDef.cost) {
                     let val = costDef.cost;
                     if (costDef.sizeMult) val *= store.sizeMultVal;
                     return val;
                 }
             }
             return 0;
        };

        const configModel = computed(() => {
            if (!editingInstance.value || !editingInstance.value.modifications) return {};
            const mods = editingInstance.value.modifications;

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
                         const def = store.allEquipment.find(e => e.id === editingInstance.value.defId);
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

        return { store, getName, getIcon, getEpDynamic, getAvailability, getBaseEp, isVariableCost, isModification, isWeapon, isLauncher, isCustom, format, showConfigDialog, editingInstance, hasUpgrades, getUpgradeSpecs, canMount, canFireLink, canEnhance, canBattery, canPointBlank, getGenericOptions, openConfig, openWiki, checkValidity, configModel, getOptionCost };
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
        const getName = (instance) => {
            const id = instance.defId || instance;
            const def = store.allEquipment.find(e => e.id === id);
            let name = getLocalizedName(def);

            if (instance.modifications) {
                const parts = [];
                if (instance.modifications.fireLink > 1) parts.push(`Fire-Linked (${instance.modifications.fireLink})`);
                if (instance.modifications.enhancement && instance.modifications.enhancement !== 'normal') parts.push(instance.modifications.enhancement.charAt(0).toUpperCase() + instance.modifications.enhancement.slice(1));
                if (instance.modifications.mount && instance.modifications.mount !== 'single') parts.push(instance.modifications.mount.charAt(0).toUpperCase() + instance.modifications.mount.slice(1));
                if (parts.length > 0) name = `${parts.join(' ')} ${name}`;
            }
            return name;
        };
        const getMod = (score) => Math.floor((score - 10) / 2);
        const weapons = computed(() => store.installedComponents.filter(instance => {
            const def = store.allEquipment.find(e => e.id === instance.defId);
            return def && store.isWeapon(def.id);
        }));
        const systemNames = computed(() => {
            const nonWeapons = store.installedComponents.filter(instance => {
                const def = store.allEquipment.find(e => e.id === instance.defId);
                return def && !store.isWeapon(def.id) && !store.isEngine(def.id);
            });
            if (nonWeapons.length === 0) return i18n.global.t('ui.installed_systems');
            return nonWeapons.map(instance => getName(instance.defId)).join(', ');
        });

        const getDmg = (instance) => {
            return store.getComponentDamage(instance) || '-';
        }
        const calculateCL = computed(() => { let cl = 10; if(store.chassis.size.includes('Colossal')) cl += 5; cl += Math.floor(store.installedComponents.length / 2); if(store.template) cl += 2; return cl; });
        const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        const componentsWithDescriptions = computed(() => {
            const seen = new Set();
            const unique = [];
            store.installedComponents.forEach(instance => {
                const def = store.allEquipment.find(e => e.id === instance.defId);
                if (def && def.description && !seen.has(instance.defId)) {
                    unique.push(instance);
                    seen.add(instance.defId);
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
