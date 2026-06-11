import { useShipStore } from './store.js?v=2.1';
import { getLocalizedName, i18n } from './i18n.js?v=2.1';

const { computed, ref, reactive, watch } = Vue;
const { useI18n } = VueI18n;
const { useQuasar } = Quasar;

const TECH_DEFINITIONS = {
    'G': { name: 'Gravity Manipulation', desc: 'The ability to create, project, and control fields of artificial gravity or negate the effects of naturally occurring gravity.' },
    'D': { name: 'Dark Matter Tech', desc: 'We know of four fundamental forces in the universe: gravity, electromagnetics, the weak nuclear force, and the strong nuclear force. For purposes of the ALTERNITY game, we’re assuming some tiny portion of the unseen mass that comprises 90 percent of the universe is comprised of a different kind of matter through which a fifth fundamental force can be harnessed. The decay of dark matter into “normal” matter releases immense amounts of energy, and a civilization with this technology can harness it to create mass reactors and weapons of tremendous power.' },
    'A': { name: 'Antimatter Tech', desc: 'The efficient manufacture and storage of antimatter makes a number of high-energy power and weapon systems practical.' },
    'M': { name: 'Matter Coding', desc: 'How does a particle “know” how to be a particle? How does it “know” how to interact with other particles? This technology is based on the principle that subatomic matter may operate under a kind of universal coding system that can be unraveled and manipulated to make matter behave as desired.' },
    'F': { name: 'Fusion Tech', desc: 'It’s possible to create fusion reactions with our current technology—the H-bomb is a great example. Harnessing the power of fusion in safe, economical, and self-sustaining power plants is the next big step in the energy revolution.' },
    'Q': { name: 'Quantum Manipulation', desc: 'Quantum Manipulation technology is based on the understanding of the forces that control the interactions of the various subatomic particles. The tantalizing quantum-fluctuation (or zero-point) energy source represents the ultimate goal of this line of inquiry.' },
    'T': { name: 'Matter Transmission', desc: 'A civilization with this technology has mastered the teleportation of matter from one point to another. Naturally, this has a number of military and commercial applications.' },
    'S': { name: 'Super-Materials', desc: 'Materials technology is crucial to the design of hull and armor systems in the future. Ranging from tough composites to monofilaments and artificial materials in which every atom has been nanoengineered for maximum strength, advanced materials make incredibly strong hulls possible.' },
    'P': { name: 'Psi-tech', desc: 'Technology that harnesses the power of thought, psi-tech allows a civilization to change reality with willpower and superior mental skill.' },
    'X': { name: 'Energy Transformation', desc: 'Energy Transformation is nothing less than the ability to control the manifestation of matter and energy. A tiny amount of matter can be transformed into an incredible amount of energy. At the higher progress levels, this technology provides the ability to actually change the type of energy.' },
    'C': { name: 'Computer Tech', desc: 'While any spacefaring civilization will possess some amount of computing technology, extremely sophisticated nanotechnologies, sensors, and control systems fall under this category.' }
};

// --- BASE COMPONENTS ---
const StatPanel = {
    template: `
    <q-card id="tour-stats-panel" class="bg-grey-9 text-white col">
        <q-card-section>
            <div class="text-caption text-grey">{{ $t('ui.chassis') }}</div>
            <div class="text-h5 text-primary">{{ getLocalizedName(store.chassis) }}</div>
            <div class="q-mt-xs text-caption text-grey">{{ store.chassis.size }} Starship</div>
            <div class="row items-center q-mt-sm">
                <div v-if="!editingName" class="text-h6 col-grow">{{ store.meta.name || 'Untitled Ship' }}</div>
                <q-input v-else dark dense v-model="store.meta.name" class="col-grow" autofocus @blur="editingName = false" @keyup.enter="editingName = false" />
                <q-btn flat round :icon="editingName ? 'check' : 'edit'" size="sm" @click="editingName = !editingName" />
            </div>
        </q-card-section>
        <q-separator dark />
        <q-card-section>
            <div class="row q-mt-sm q-col-gutter-xs">
                <div class="col-12"><div class="row justify-between items-center q-pa-xs bg-primary rounded-borders"><span>Toughness</span><span class="text-h6">{{ store.chassis?.toughness?.replace('(', '').replace(')', '') || '-' }}</span></div></div>
            </div>
            <div class="row q-mt-xs text-center q-col-gutter-xs">
                <div class="col-4"><div class="bg-grey-8 q-pa-xs">LI: <span class="text-bold">{{ store.currentStats.LI || '-' }}</span></div></div>
                <div class="col-4"><div class="bg-grey-8 q-pa-xs">HI: <span class="text-bold">{{ store.currentStats.HI || '-' }}</span></div></div>
                <div class="col-4"><div class="bg-grey-8 q-pa-xs">En: <span class="text-bold">{{ store.currentStats.En || '-' }}</span></div></div>
            </div>
            <div class="row q-mt-xs q-col-gutter-xs">

                <template v-if="store.currentStats.ftlSpeed">
                    <div class="col-6"><div class="bg-grey-8 q-pa-xs text-center"><div>{{ $t('stats.speed') }}</div><div class="text-bold">{{ store.currentStats.speed }}</div></div></div>
                    <div class="col-6"><div class="bg-grey-8 q-pa-xs text-center"><div>FTL Speed</div><div class="text-bold">{{ store.currentStats.ftlSpeed }}</div></div></div>
                </template>
                <div v-else class="col-12"><div class="bg-grey-8 q-pa-xs text-center"><div>{{ $t('stats.speed') }}</div><div class="text-bold">{{ store.currentStats.speed }}</div></div></div>
            </div>
            <q-separator dark class="q-mt-sm" />
            <div class="q-mt-sm text-caption">
                <div class="row justify-between q-py-xs border-bottom-grey">
                    <div class="text-grey">Crew / Berthing</div>
                    <div :class="store.totalBerthingCapacity < store.currentCrew ? 'text-negative text-bold' : ''">{{ store.currentCrew }} / {{ store.totalBerthingCapacity || 0 }} <q-tooltip v-if="store.totalBerthingCapacity < store.currentCrew" class="bg-negative">Insufficient Berthing</q-tooltip></div>
                </div>
                <div class="row justify-between q-py-xs border-bottom-grey">
                    <div class="text-grey">Passengers / Seating</div>
                    <div :class="store.totalPassengerCapacity < store.currentPassengers ? 'text-negative text-bold' : ''">{{ store.currentPassengers }} / {{ store.totalPassengerCapacity || 0 }} <q-tooltip v-if="store.totalPassengerCapacity < store.currentPassengers" class="bg-negative">Insufficient Seating</q-tooltip></div>
                </div>
                <div class="row justify-between q-py-xs border-bottom-grey">
                    <div class="text-grey">Life Support Cover (Hull Pts)</div>
                    <div :class="store.totalLifeSupportCapacity < store.totalHull ? 'text-negative text-bold' : ''">{{ store.totalLifeSupportCapacity || 0 }} / {{ store.totalHull }} <q-tooltip v-if="store.totalLifeSupportCapacity < store.totalHull" class="bg-negative">Insufficient Life Support</q-tooltip></div>
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
    <div id="tour-system-list" class="q-pa-md col column bg-grey-9">
        <div class="row justify-between items-center q-mb-md"><div class="text-h6">{{ $t('ui.installed_systems') }}</div><q-btn id="tour-add-btn" round color="positive" icon="add" size="sm" @click="store.showAddComponentDialog = true" /></div>
        <component :is="$q.screen.gt.sm ? 'q-scroll-area' : 'div'" :class="$q.screen.gt.sm ? 'col' : ''"><q-list separator dark>
            <template v-for="(components, category) in store.componentsByCategory" :key="category">
                <q-item-label header class="text-white bg-primary q-py-xs q-mt-sm rounded-borders">{{ category }}</q-item-label>
                <q-item v-for="instance in components" :key="instance.instanceId">
                <q-item-section avatar><q-icon :name="getIcon(instance.defId)" color="primary" /></q-item-section>
                <q-item-section>
                    <q-item-label>
                        {{ getName(instance) }}
                        <q-badge v-if="isCustom(instance.defId)" color="purple" label="Custom" class="q-ml-xs" />
                        <q-badge v-if="instance.modifications?.advanced || getDef(instance.defId)?.unique" color="orange" label="Unique" class="q-ml-xs" />
                        <q-badge v-if="instance.isStock" color="grey-7" label="Stock" class="q-ml-xs" />
                        <q-badge v-if="instance.isNonStandard" color="warning" text-color="black" :label="$t('ui.ns_tag')" class="q-ml-xs" />
                        <q-badge v-if="getDef(instance.defId)?.category === 'Armor'" color="accent" text-color="black" :label="'Toughness: ' + (store.chassis?.toughness?.replace('(', '').replace(')', '') || '-')" class="q-ml-xs" />
                        <q-icon v-if="!checkValidity(instance)" name="warning" color="negative" class="q-ml-sm"><q-tooltip>Invalid for Ship Size</q-tooltip></q-icon>
                    </q-item-label>
                    <q-item-label caption class="text-grey-5">
                        <span>{{ getDescriptionLine(instance) }}</span>
                        <template v-if="instance.modifications">
                            <span v-if="instance.modifications.mount && instance.modifications.mount !== 'single'" class="q-ml-xs text-info text-uppercase">| {{ instance.modifications.mount }}</span>
                            <span v-if="instance.modifications.fireLink > 1" class="q-ml-xs text-info">| Fire-Linked ({{ instance.modifications.fireLink }})</span>
                            <span v-if="instance.modifications.advanced" class="q-ml-xs text-info">| Advanced</span>
                            <span v-if="getUpgradeSpecs(instance.defId)?.payload?.type === 'capacity' && instance.modifications.payloadCount > 0" class="q-ml-xs text-info">| Payload: {{ getUpgradeSpecs(instance.defId).payload.base }} + {{ instance.modifications.payloadCount }}</span>
                            <span v-else-if="instance.modifications.payloadOption" class="q-ml-xs text-info">| Extra Payload</span>
                            <span v-if="instance.modifications.batteryCount > 1" class="q-ml-xs text-info">| Battery ({{ instance.modifications.batteryCount }})</span>
                            <span v-if="instance.modifications.quantity > 1 && !instance.defId.startsWith('pow_') && !['Sublight', 'FTL Drives'].includes(getDef(instance.defId)?.category)" class="q-ml-xs text-info">| (x{{ instance.modifications.quantity }})</span>
                            <span v-if="instance.modifications.emplacement && instance.modifications.emplacement !== 'Standard Mount'" class="q-ml-xs text-info">| {{ instance.modifications.emplacement }}</span>
                            <span v-if="instance.modifications.weaponUser" class="q-ml-xs text-info">| {{ instance.modifications.weaponUser }}</span>
                        </template>
                    </q-item-label>
                </q-item-section>
                <q-item-section side>
                    <div class="text-right q-mr-sm">
                        <div class="text-caption text-cyan">
                            <span v-if="isVariableCost(instance.defId)" class="text-italic">{{ $t('ui.variable') }}</span>
                            <span v-else>{{ format(store.getComponentCost(instance)) }}</span>
                        </div>
                    </div>
                    <div class="row items-center">
                        <q-badge v-if="instance.miniaturization > 0" color="cyan" label="Mini" class="q-mr-xs" />
                        <q-btn flat round icon="settings" color="accent" size="sm" @click="openConfig(instance)"><q-tooltip>Configure</q-tooltip></q-btn>
                        <q-btn flat round icon="help_outline" color="info" size="sm" @click="openWiki(instance.defId)"><q-tooltip>Wiki Info</q-tooltip></q-btn>
                        <q-btn flat round icon="content_copy" color="secondary" size="sm" @click="store.duplicateComponent(instance.instanceId)"><q-tooltip>Duplicate</q-tooltip></q-btn>
                        <q-btn flat round icon="delete" color="negative" size="sm" @click="store.removeComponent(instance.instanceId)"><q-tooltip>Delete</q-tooltip></q-btn>
                    </div>
                </q-item-section>
            </q-item>
            </template>
            <div v-if="store.installedComponents.length === 0" class="text-center text-grey q-pa-lg">No systems installed.</div>
        </q-list></component>
        <q-dialog v-model="showConfigDialog">
            <q-card class="bg-grey-9 text-white" style="min-width: 350px">
                <q-card-section><div class="text-h6">Configure System</div></q-card-section>
                <q-card-section v-if="editingInstance">
                    <div class="q-mb-md">
                        <div class="text-caption">Location</div>
                        <q-select dark filled v-model="editingInstance.location" :options="['Fore', 'Aft', 'Port', 'Starboard', 'Core', 'Dorsal', 'Ventral', 'Distributed']" new-value-mode="add-unique" use-input hint="Enter a custom location or select from list" />
                    </div>
                    <div v-if="isWeapon(editingInstance.defId)" class="q-mb-md">
                        <div class="text-caption">Weapon User</div>
                        <q-btn-toggle spread dark v-model="editingInstance.modifications.weaponUser" toggle-color="primary" :options="[{label: 'Pilot', value: 'Pilot'}, {label: 'Copilot', value: 'Copilot'}, {label: 'Gunner', value: 'Gunner'}]" />
                    </div>
                    <div v-if="isSensor(editingInstance.defId) && !isWeapon(editingInstance.defId)" class="q-mb-md">
                        <div class="q-gutter-y-md">
                            <div>
                                <q-select dark filled v-model="editingInstance.modifications.emplacement" :options="emplacementOptions" label="Emplacement" emit-value map-options />
                            </div>
                        </div>
                    </div>
                    <div v-if="isWeapon(editingInstance.defId)" class="q-mb-md">
                        <div class="q-gutter-y-md">
                            <div>
                                <q-select dark filled v-model="editingInstance.modifications.emplacement" :options="emplacementOptions" label="Emplacement" emit-value map-options @update:model-value="onEmplacementChanged" />
                            </div>
                            <div>
                                <q-select dark filled v-model="editingInstance.modifications.weaponMount" :options="weaponMountOptions" label="Multiple Mount" emit-value map-options />
                            </div>
                            <div>
                                <q-select dark filled v-model="editingInstance.modifications.fireControl" :options="['None', 'Ordinary', 'Good', 'Amazing']" label="Fire Control Computer" />
                            </div>
                            <div>
                                <q-checkbox dark v-model="editingInstance.modifications.concealed" label="Concealed Mount (x1.5 Cost/Hull)" />
                            </div>
                            <div>
                                <div class="text-caption">Firing Arcs (Max {{ maxArcsAllowed }})</div>
                                <div class="row q-gutter-sm">
                                    <q-checkbox dark v-model="editingInstance.modifications.arcs" val="Forward" label="Fwd" :disable="isArcDisabled('Forward')" @update:model-value="onEmplacementChanged" />
                                    <q-checkbox dark v-model="editingInstance.modifications.arcs" val="Port" label="Port" :disable="isArcDisabled('Port')" @update:model-value="onEmplacementChanged" />
                                    <q-checkbox dark v-model="editingInstance.modifications.arcs" val="Starboard" label="Stbd" :disable="isArcDisabled('Starboard')" @update:model-value="onEmplacementChanged" />
                                    <q-checkbox dark v-model="editingInstance.modifications.arcs" val="Aft" label="Aft" :disable="isArcDisabled('Aft')" @update:model-value="onEmplacementChanged" />
                                </div>
                                <div class="row q-gutter-sm q-mt-xs">
                                    <q-checkbox dark v-model="editingInstance.modifications.arcs" val="Zero" label="Zero" disable />
                                    <q-checkbox dark v-model="editingInstance.modifications.arcs" val="Zero-Port" label="Zero-Port" :disable="isArcDisabled('Zero-Port')" @update:model-value="onEmplacementChanged" />
                                    <q-checkbox dark v-model="editingInstance.modifications.arcs" val="Zero-Starboard" label="Zero-Starboard" :disable="isArcDisabled('Zero-Starboard')" @update:model-value="onEmplacementChanged" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="hasUpgrades(editingInstance.defId)" class="q-mb-md">
                        <div class="q-gutter-y-md">
                            <div v-if="canEnhance(editingInstance.defId)">
                                <q-checkbox dark v-model="editingInstance.modifications.advanced" label="Advanced" />
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
                        <template v-if="['Sublight', 'FTL Drives'].includes(getDef(editingInstance.defId)?.category)">
                            <template v-if="getDef(editingInstance.defId)?.category === 'FTL Drives' && ['Jump Drive', 'Stardrive', 'Drivewave', 'Psychoportive Drive', 'Transcendent Drive'].includes(getDef(editingInstance.defId)?.name)">
                                <div class="text-caption q-mb-xs">Size (% of Hull): <span class="text-white">10% (Fixed)</span></div>
                            </template>
                            <template v-else>
                                <div class="text-caption q-mb-xs">Size (% of Hull): <span class="text-white">{{ configModel.sublightPctLabel }}</span></div>
                                <q-slider dark v-model="configModel.sublightPctIndex" :min="configModel.sublightPctMinIndex" :max="6" :step="1" snap markers label />
                            </template>
                        </template>
                        <template v-else>
                            <div class="text-caption">Size</div>
                            <q-input dark type="number" filled v-model.number="editingInstance.modifications.quantity" label="Size" :min="getDef(editingInstance.defId)?.minHullPts || 1" />
                        </template>
                    </div>
                    <div v-if="getUpgradeSpecs(editingInstance.defId)?.fireLinkOption && (editingInstance.modifications.fireLink || 1) > 1" class="q-mb-md">
                        <q-checkbox dark v-model="editingInstance.modifications.fireLinkOption" :label="'Optional Fire-Link (+' + format(getOptionCost(editingInstance.defId, 'fireLinkOption')) + ')'" />
                    </div>
                    <div v-if="canPointBlank(editingInstance.defId)" class="q-mb-md">
                        <q-checkbox dark v-model="editingInstance.modifications.pointBlank" :label="'Point Blank (+' + format(getOptionCost(editingInstance.defId, 'pointBlank')) + ')'" />
                    </div>
                    <div v-if="getUpgradeSpecs(editingInstance.defId)?.auxiliary" class="q-mb-md">
                        <q-checkbox dark v-model="editingInstance.modifications.auxiliary" label="Auxiliary Command Deck (x2 Cost and Hull Points)" />
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
    <q-card id="tour-config-panel" class="bg-grey-9 text-white col column">


        <q-card-section class="col-auto">
            <div class="text-h6">HULL POINTS</div>
            <div class="row justify-between text-grey-4"><span>Base</span><span>{{ store.chassis.baseHull || 0 }}</span></div>
            <div v-if="store.bonusHull" class="row justify-between text-grey-4"><span>Bonus</span><span>{{ store.bonusHull }}</span></div>
            <div v-if="store.hullUsageDetails.armor" class="row justify-between text-grey-4"><span>Armor</span><span>-{{ store.hullUsageDetails.armor }}</span></div>
            <div v-if="store.hullUsageDetails.power" class="row justify-between text-grey-4"><span>Power Plants</span><span>-{{ store.hullUsageDetails.power }}</span></div>
            <div v-if="store.hullUsageDetails.sublight" class="row justify-between text-grey-4"><span>Sublight</span><span>-{{ store.hullUsageDetails.sublight }}</span></div>
            <div v-if="store.hullUsageDetails.ftl" class="row justify-between text-grey-4"><span>FTL Drives</span><span>-{{ store.hullUsageDetails.ftl }}</span></div>
            <div v-if="store.hullUsageDetails.weapons" class="row justify-between text-grey-4"><span>Weapons</span><span>-{{ store.hullUsageDetails.weapons }}</span></div>
            <div v-if="store.hullUsageDetails.command" class="row justify-between text-grey-4"><span>Command</span><span>-{{ store.hullUsageDetails.command }}</span></div>
            <div v-if="store.hullUsageDetails.computers" class="row justify-between text-grey-4"><span>Computers</span><span>-{{ store.hullUsageDetails.computers }}</span></div>
            <div v-if="store.hullUsageDetails.sensors" class="row justify-between text-grey-4"><span>Sensors</span><span>-{{ store.hullUsageDetails.sensors }}</span></div>
            <div v-if="store.hullUsageDetails.accommodations" class="row justify-between text-grey-4"><span>Accommodations</span><span>-{{ store.hullUsageDetails.accommodations }}</span></div>
            <div v-if="store.hullUsageDetails.miscellaneous" class="row justify-between text-grey-4"><span>Miscellaneous</span><span>-{{ store.hullUsageDetails.miscellaneous }}</span></div>
            <div v-if="store.hullUsageDetails.rounding" class="row justify-between text-grey-4"><span>Rounding</span><span>-{{ store.hullUsageDetails.rounding }}</span></div>
            <q-separator dark class="q-my-xs" />
            <div class="row justify-between text-h6 items-center">
                <span>Remaining</span>
                <span :class="store.remainingHull < 0 ? 'text-negative' : 'text-cyan'">{{ store.remainingHull }}</span>
            </div>
        </q-card-section>

        <q-separator dark />

        <q-card-section class="col-auto">
            <div class="text-h6">POWER</div>
            <div class="row justify-between text-grey-4"><span>Generated</span><span>{{ store.totalPowerGenerated }}</span></div>
            <div v-if="store.powerUsageDetails.armor" class="row justify-between text-grey-4"><span>Armor</span><span>-{{ store.powerUsageDetails.armor }}</span></div>
            <div v-if="store.powerUsageDetails.sublight" class="row justify-between text-grey-4"><span>Sublight</span><span>-{{ store.powerUsageDetails.sublight }}</span></div>
            <div v-if="store.powerUsageDetails.ftl" class="row justify-between text-grey-4"><span>FTL Drives</span><span>-{{ store.powerUsageDetails.ftl }}</span></div>
            <div v-if="store.powerUsageDetails.weapons" class="row justify-between text-grey-4"><span>Weapons</span><span>-{{ store.powerUsageDetails.weapons }}</span></div>
            <div v-if="store.powerUsageDetails.command" class="row justify-between text-grey-4"><span>Command</span><span>-{{ store.powerUsageDetails.command }}</span></div>
            <div v-if="store.powerUsageDetails.computers" class="row justify-between text-grey-4"><span>Computers</span><span>-{{ store.powerUsageDetails.computers }}</span></div>
            <div v-if="store.powerUsageDetails.sensors" class="row justify-between text-grey-4"><span>Sensors</span><span>-{{ store.powerUsageDetails.sensors }}</span></div>
            <div v-if="store.powerUsageDetails.accommodations" class="row justify-between text-grey-4"><span>Accommodations</span><span>-{{ store.powerUsageDetails.accommodations }}</span></div>
            <div v-if="store.powerUsageDetails.miscellaneous" class="row justify-between text-grey-4"><span>Miscellaneous</span><span>-{{ store.powerUsageDetails.miscellaneous }}</span></div>
            <q-separator dark class="q-my-xs" />
            <div class="row justify-between text-h6 items-center">
                <span>Remaining</span>
                <span :class="store.totalPowerGenerated - store.totalPowerConsumed < 0 ? 'text-negative' : 'text-positive'">{{ store.totalPowerGenerated - store.totalPowerConsumed }}</span>
            </div>
        </q-card-section>

        <q-separator dark />

        <q-card-section class="col-auto">
            <div class="text-h6">{{ $t('ui.ledger') }}</div>
            <div class="row justify-between text-grey-4"><span>{{ $t('ui.hull_base') }}</span><span>{{ format(store.hullCost) }}</span></div>
            <div class="row justify-between text-grey-4"><span>{{ $t('ui.systems') }}</span><span>{{ format(store.componentsCost) }}</span></div>
            <q-separator dark class="q-my-xs" />
            <div class="row justify-between text-h6 text-primary"><span>{{ $t('ui.total') }}</span><span>{{ format(store.totalCost) }}</span></div>
        </q-card-section>

        <q-separator dark v-if="store.isDev" />
        <q-card-section v-if="store.isDev" class="col-auto">
             <div class="row q-col-gutter-sm">
                 <div class="col-6"><q-btn outline color="accent" label="Download Data.json" @click="store.downloadDataJson" class="full-width" icon="download" /></div>
                 <div class="col-6"><q-btn outline color="negative" label="Factory Reset" @click="store.factoryReset" class="full-width" icon="delete_forever" /></div>
             </div>
        </q-card-section>
    </q-card>

    <q-dialog v-model="showEpDialog">
        <q-card class="bg-grey-9 text-white" style="min-width: 350px">
            <q-card-section>
                <div class="text-h6">{{ $t('ui.convert_cargo_ep') }}</div>
                <div class="text-caption text-grey">{{ $t('ui.cargo_to_ep_hint') }}</div>
            </q-card-section>

            <q-card-section>
                <div class="q-mb-sm">
                    <div class="row justify-between text-caption">
                        <span>{{ $t('ui.cargo_converted') }}: {{ store.cargoToEpAmount }} tons</span>
                        <span>{{ $t('ui.max_cargo') }}: {{ new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(store.maxCargoCapacity) }} tons</span>
                    </div>
                </div>
                <q-slider dark v-model="store.cargoToEpAmount" :min="0" :max="store.maxCargoCapacity" :step="1" label color="accent" />
                <div class="text-center q-mt-md text-positive text-h6">
                    +{{ store.cargoToEpAmount }} Hull Pts
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
                        +{{ store.escapePodsEpGain }} Hull Pts
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
    <div class="warships-block">
        <div class="warships-header"><span>{{ store.meta.name || 'Untitled Ship' }}</span><span>CL {{ calculateCL }}</span></div>
        <div class="warships-sub">{{ store.chassis.size }} Starfighter ({{ getLocalizedName(store.chassis) }})</div>
        <div class="sheet-body">
            <div><span class="bold">Init</span> +{{ getMod(store.currentStats.dex) + store.crewStats.skill }}; <span class="bold">Senses</span> Perception +{{ getMod(store.currentStats.int) + store.crewStats.skill }}</div>

            <div class="section-title">Defense</div>
            <div><span class="bold">Ref</span> {{ store.reflexDefense }} (Flat-footed {{ store.reflexDefense - getMod(store.currentStats.dex) }}), <span class="bold">Fort</span> {{ 10 + getMod(store.currentStats.str) }}; <span class="bold">+{{ store.currentStats.armor }} Armor</span></div>


            <div class="section-title">Offense</div>
            <div><span class="bold">Acceleration</span> fly {{ store.currentStats.speed }} squares (starship scale)</div>
            <div v-for="w in weaponData" :key="w.instanceId" class="weapon-line">
                <span class="bold">Ranged</span> {{ w.name }} +{{ w.attackBonus }} ({{ w.damage }})
                <div v-if="w.details" class="text-caption text-italic q-ml-md" style="font-size: 0.8em;">{{ w.details }}</div>
            </div>

            <div class="section-title">Statistics</div>
            <div class="stat-grid">
                <div><span class="bold">Str</span> {{ store.currentStats.str }}</div>
                <div><span class="bold">Dex</span> {{ store.currentStats.dex }}</div>
                <div><span class="bold">Int</span> {{ store.currentStats.int }}</div>
            </div>
            <div><span class="bold">Base Atk</span> +{{ store.crewStats.atk }}; <span class="bold">Grapple</span> +{{ store.crewStats.atk + (getMod(store.currentStats.str)) }}</div>

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
                <span class="bold">Total Cost:</span> {{ formatCreds(store.totalCost) }}
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
        <q-card id="hangar-dialog-card" class="bg-grey-9 text-white" :style="$q.screen.lt.sm ? 'width: 100%' : 'min-width: 500px; max-width: 90vw;'">
            <q-card-section><div class="text-h6">{{ $t('ui.hangar') }}</div></q-card-section>
            <q-tabs v-model="hangarTab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify">
                <q-tab name="hangar" icon="garage" :label="$t('ui.hangar')"></q-tab>
                <q-tab name="military" icon="shield" label="Military"></q-tab>
                <q-tab name="civilian" icon="local_shipping" label="Civilian"></q-tab>
                <q-tab name="import" icon="upload_file" :label="$t('ui.import_file')"></q-tab>
            </q-tabs>
            <q-separator dark></q-separator>
            <q-tab-panels v-model="hangarTab" animated class="bg-grey-9">
                <q-tab-panel name="hangar" style="height: 400px" class="q-pa-none">
                    <q-scroll-area class="full-height">
                        <q-list separator dark>
                            <q-item v-for="ship in store.hangar" :key="ship.id" clickable v-ripple @click="loadShip(ship.id)">
                                <q-item-section>
                                    <q-item-label>{{ ship.meta.name || 'Untitled Ship' }}</q-item-label>
                                    <q-item-label caption class="text-grey-6">
                                        {{ getLocalizedName(store.allShips.find(s => s.id === ship.configuration.baseChassis) || {name: ship.configuration.baseChassis}) }}
                                        <span v-if="ship.activeShipId === store.activeShipId" class="text-positive q-ml-sm">(Active)</span>
                                    </q-item-label>
                                </q-item-section>
                                <q-item-section side>
                                    <q-btn flat round icon="delete" color="negative" size="sm" @click.stop="deleteShip(ship.id)" />
                                </q-item-section>
                            </q-item>
                            <div v-if="store.hangar.length === 0" class="text-center text-grey q-pa-lg">Hangar is empty.</div>
                        </q-list>
                    </q-scroll-area>
                </q-tab-panel>
                <q-tab-panel name="military" style="height: 400px" class="q-pa-none">
                    <q-scroll-area class="full-height">
                        <q-list separator dark>
                            <template v-for="(ships, size) in groupedMilitaryShips" :key="size">
                                <q-item-label header class="text-grey-5">{{ size }}</q-item-label>
                                <q-item clickable v-ripple v-for="ship in ships" :key="ship.id" @click="selectStockShip(ship.id)">
                                    <q-item-section>
                                        <q-item-label>{{ getLocalizedName(ship) }}</q-item-label>
                                        <q-item-label caption class="text-grey-6">{{ ship.size }}</q-item-label>
                                    </q-item-section>
                                    <q-item-section side><q-btn flat round icon="chevron_right" color="primary" /></q-item-section>
                                </q-item>
                            </template>
                        </q-list>
                    </q-scroll-area>
                </q-tab-panel>
                <q-tab-panel name="civilian" style="height: 400px" class="q-pa-none">
                    <q-scroll-area class="full-height">
                        <q-list separator dark>
                            <template v-for="(ships, size) in groupedCivilianShips" :key="size">
                                <q-item-label header class="text-grey-5">{{ size }}</q-item-label>
                                <q-item clickable v-ripple v-for="ship in ships" :key="ship.id" @click="selectStockShip(ship.id)">
                                    <q-item-section>
                                        <q-item-label>{{ getLocalizedName(ship) }}</q-item-label>
                                        <q-item-label caption class="text-grey-6">{{ ship.size }}</q-item-label>
                                    </q-item-section>
                                    <q-item-section side><q-btn flat round icon="chevron_right" color="primary" /></q-item-section>
                                </q-item>
                            </template>
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
        const hangarTab = ref('hangar');
        const fileInput = ref(null);

        const groupedMilitaryShips = computed(() => {
            const groups = {};
            store.allShips.filter(s => s.category === 'Military').forEach(s => {
                if (!groups[s.size]) groups[s.size] = [];
                groups[s.size].push(s);
            });
            return groups;
        });

        const groupedCivilianShips = computed(() => {
            const groups = {};
            store.allShips.filter(s => s.category === 'Civilian').forEach(s => {
                if (!groups[s.size]) groups[s.size] = [];
                groups[s.size].push(s);
            });
            return groups;
        });

        const selectStockShip = (id) => {
            store.createNew(id);
            emit('update:modelValue', false);
        };

        const loadShip = (shipId) => {
            store.loadFromHangar(shipId);
            emit('update:modelValue', false);
        };

        const deleteShip = (shipId) => {
             $q.dialog({
                dark: true,
                title: 'Confirm Deletion',
                message: 'Delete this ship from the hangar?',
                cancel: true,
                persistent: true,
                color: 'negative'
            }).onOk(() => {
                store.removeFromHangar(shipId);
            });
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

        return { store, hangarTab, groupedMilitaryShips, groupedCivilianShips, selectStockShip, loadShip, deleteShip, handleFileUpload, fileInput, triggerFileSelect, getLocalizedName };
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
                                                <q-btn flat round icon="build" size="xs" color="accent" @click="editTemplate(ship.id)" :disable="!lib.editable">
                                                    <q-tooltip>Edit Template Components</q-tooltip>
                                                </q-btn>
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
            a.download = `warships_lib_${lib.name.replace(/\s+/g, '_').toLowerCase()}.json`;
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

        const editTemplate = (shipId) => {
            store.startTemplateEdit(shipId);
            store.showCustomManager = false;
        };

        return { store, libraryInput, triggerLibraryImport, handleLibraryImport, exportLibrary, deleteLibrary, editLibraryName, editTemplate };
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
                        <div class="col-6"><q-input filled dark v-model="newShip.name" label="Ship Class" :rules="[val => !!val || 'Name is required']"></q-input></div>
                        <div class="col-3">
                            <q-select filled dark v-model="newShip.size" :options="store.db.SIZE_RANK" label="Size" emit-value map-options></q-select>
                        </div>
                        <div class="col-3">
                            <q-input filled dark v-model.number="newShip.challengeLevel" label="CL" hint="Override" type="number"></q-input>
                        </div>
                        <div class="col-12" v-if="store.isDev">
                            <q-input filled dark v-model="newShip.id" label="ID (Admin)" hint="Leave blank to auto-generate"></q-input>
                        </div>
                    </div>
                    <div class="row q-col-gutter-sm">
                        <div class="col-6"><q-input filled dark v-model="newShip.cost" label="Base Cost (cr)" type="number"></q-input></div>
                        <div class="col-6"><q-input filled dark v-model="newShip.baseHull" label="Base Hull Pts" type="number"></q-input></div>
                    </div>
                    <div class="row q-col-gutter-sm">
                        <div class="col-12"><q-input filled dark v-model="newShip.usedCost" label="Used Cost (cr)" type="number"></q-input></div>
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
            challengeLevel: null,
            cost: 0,
            baseHull: 0,
            availability: 'Common',
            usedCost: 0,
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
                challengeLevel: newShip.challengeLevel !== '' && newShip.challengeLevel !== null ? Number(newShip.challengeLevel) : null,
                cost: Number(newShip.cost),
                baseHull: Number(newShip.baseHull),
                availability: newShip.availability,
                usedCost: Number(newShip.usedCost),
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
                        newShip.challengeLevel = existing.challengeLevel || null;
                        newShip.cost = existing.cost;
                        newShip.baseHull = existing.baseHull;
                        newShip.availability = existing.availability || 'Common';
                        newShip.usedCost = existing.usedCost || 0;
                        newShip.description = existing.description || '';

                        newShip.stats = { str: 0, dex: 0, int: 0, hp: 0, armor: 0, dr: 0, ...existing.stats };
                        newShip.logistics = { crew: 0, pass: 0, cargo: '', cons: '', ...existing.logistics };
                    }
                } else {
                    // Reset
                    newShip.id = '';
                    newShip.name = '';
                    newShip.size = 'Huge';
                    newShip.challengeLevel = null;
                    newShip.cost = 0;
                    newShip.baseHull = 0;
                    newShip.availability = 'Common';
                    newShip.usedCost = 0;
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
                    <q-btn v-if="store.isDev" outline color="primary" label="Create New (Admin)" icon="add" size="sm" @click="createNew" />
                </div>
                <div class="text-caption text-grey">{{ $t('ui.install_caption') }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none q-gutter-md">
                <!-- Smart Search Bar -->
                <div class="q-mb-md row items-center">
                    <div class="col-grow">
                        <q-select
                            filled dark
                            v-model="searchTags"
                            use-input
                            use-chips
                            multiple
                            hide-dropdown-icon
                            input-debounce="0"
                            new-value-mode="add-unique"
                            :label="$t('ui.search_component')"
                            hint="Filter by Category, Type, PL, or search by name"
                            :options="searchTagOptions"
                            @filter="filterSearchTags"
                            @update:model-value="onSearchTagsUpdated"
                            clearable
                        >
                            <template v-slot:prepend><q-icon name="search" /></template>
                        </q-select>
                    </div>
                </div>
                <q-select filled dark v-model="newComponentSelection" :options="itemOptions" :label="$t('ui.component')" option-label="label" option-value="id" emit-value map-options :disable="!itemOptions.length">
                    <template v-slot:option="scope">
                        <q-item v-bind="scope.itemProps">
                            <q-item-section>
                                <q-item-label>
                                    {{ scope.opt.label }} <span class="text-caption text-grey-5 q-ml-xs" v-if="scope.opt.category === 'Power'">(Pow: {{ scope.opt.powerPerHull }}/Hull Pt)</span><span class="text-caption text-grey-5 q-ml-xs" v-else>(Pow: -{{ scope.opt.powerConsumed || 0 }})</span>
                                    <q-badge v-if="scope.opt.unique" color="orange" label="Unique" />
                                </q-item-label>
                            </q-item-section>
                            <q-item-section side v-if="!isSizeValid(scope.opt) || !checkRequirements(scope.opt).valid">
                                <q-icon v-if="!isSizeValid(scope.opt)" name="warning" color="negative">
                                    <q-tooltip>
                                        <span v-if="scope.opt.maxSize">{{ $t('ui.max_size') }}: {{ scope.opt.maxSize }}</span>
                                        <span v-if="scope.opt.minShipSize">{{ $t('ui.min_size') }}: {{ scope.opt.minShipSize }}</span>
                                    </q-tooltip>
                                </q-icon>
                                <q-icon v-if="!checkRequirements(scope.opt).valid" name="error" color="warning" class="q-ml-xs">
                                    <q-tooltip>
                                        Missing prerequisites: {{ checkRequirements(scope.opt).missing.join(', ') }}
                                    </q-tooltip>
                                </q-icon>
                            </q-item-section>
                        </q-item>
                    </template>
                </q-select>
                <q-card v-if="selectedItemDef" class="bg-grey-8 q-pa-sm q-mt-md" flat bordered>
                    <div class="row items-center justify-between">
                        <div>
                            <div class="text-subtitle2">{{ getLocalizedName(selectedItemDef) }}</div>
                            <div class="row q-gutter-xs q-my-xs">
                                <q-chip v-if="selectedItemDef.group?.startsWith('PL')" dense color="secondary" text-color="white" size="sm" :label="selectedItemDef.group" />
                                <template v-if="selectedItemDef.tech?.length">
                                    <q-chip v-for="t in selectedItemDef.tech" :key="t" dense color="primary" text-color="white" size="sm" :label="TECH_DEFINITIONS[t]?.name || t">
                                        <q-tooltip class="bg-grey-9 text-body2" style="max-width: 300px">
                                            <div>{{ TECH_DEFINITIONS[t]?.desc }}</div>
                                        </q-tooltip>
                                    </q-chip>
                                </template>
                            </div>
                            <div class="text-caption text-grey-4">
                                <span v-if="selectedItemDef.variableCost">{{ $t('ui.cost_variable') }}</span>
                                <span v-else>{{ $t('ui.base_cost') }}: {{ selectedItemDef.baseCost }} cr</span> | {{ $t('ui.base_ep') }}: {{ selectedItemDef.baseEp }}
                                <br v-if="selectedItemDef.category !== 'Modifications'">
                                <span v-if="selectedItemDef.category !== 'Modifications'">
                                    <q-badge v-if="selectedItemDef.unique" color="orange" label="Unique" />
                                </span>
                                <q-icon v-if="!isSizeValid(selectedItemDef)" name="warning" color="negative" class="q-ml-xs">
                                    <q-tooltip>
                                        <span v-if="selectedItemDef.maxSize">{{ $t('ui.max_size') }}: {{ selectedItemDef.maxSize }}</span>
                                        <span v-if="selectedItemDef.minShipSize">{{ $t('ui.min_size') }}: {{ selectedItemDef.minShipSize }}</span>
                                    </q-tooltip>
                                </q-icon>
                                <q-icon v-if="!checkRequirements(selectedItemDef).valid" name="error" color="warning" class="q-ml-xs">
                                    <q-tooltip>
                                        Missing prerequisites: {{ checkRequirements(selectedItemDef).missing.join(', ') }}
                                    </q-tooltip>
                                </q-icon>
                            </div>
                            <div v-if="!checkRequirements(selectedItemDef).valid" class="text-caption text-warning q-mt-xs">
                                <q-icon name="warning" /> Missing Requirements: {{ checkRequirements(selectedItemDef).missing.join(', ') }}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-h6 text-cyan">
                                <span v-if="selectedItemDef.variableCost" class="text-italic text-body1">{{ $t('ui.variable') }}</span>
                                <span v-else>{{ formatCreds(previewCost) }}</span>
                            </div>
                            <div class="text-caption text-positive">{{ previewHullPts }} Hull Pts</div>
                        </div>
                    </div>
                    <div v-if="selectedItemDef.sizeMult && !selectedItemDef.variableCost" class="text-xs text-grey-5 q-mt-xs">* {{ $t('ui.size_mult_msg', { size: store.chassis.size }) }}</div>
                    <div class="row q-gutter-sm q-mt-sm justify-end">
                        <q-btn flat dense icon="open_in_new" label="Wiki" color="info" @click="openWiki"></q-btn>
                        <q-btn v-if="store.isDev" flat dense icon="code" label="Edit JSON" color="accent" @click="openJsonEditor"></q-btn>
                        <q-btn v-if="store.isDev" flat dense icon="delete" label="Delete" color="negative" @click="deleteComponent"></q-btn>
                    </div>
                </q-card>
            </q-card-section>
            <q-card-actions align="right">
                <q-space></q-space>
                <q-btn flat :label="$t('ui.cancel')" color="grey" v-close-popup></q-btn>
                <q-btn unelevated :label="$t('ui.install')" color="positive" @click="installComponent" :disable="!newComponentSelection"></q-btn>
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

        const searchTags = ref([]);
        const newComponentSelection = ref(null);
        const searchTagOptions = ref([]);

        const resetSelections = () => {
            searchTags.value = [];
            newComponentSelection.value = null;
        };

        const allAvailableTags = computed(() => {
            const tags = new Set();
            const activeCats = (searchTags.value || []).filter(t => t.startsWith("Category: ")).map(t => t.replace("Category: ", ""));
            
            for (const e of store.allEquipment) {
                if (e.category) tags.add(`Category: ${e.category}`);
                if (e.stats?.pl) tags.add(`PL: ${e.stats.pl}`);
                // Only show types if they belong to a currently selected category
                if (e.group && activeCats.length > 0 && activeCats.includes(e.category)) {
                    tags.add(`Type: ${e.group}`);
                }
                // Add Damage tag for weapons (damage type after '/')
                if (e.fire) {
                    const dmgCode = e.fire.split('/')[1];
                    const dmgMap = { S: 'Sm', L: 'Lt', M: 'Md', H: 'Hv', SH: 'Shv' };
                    const dmg = dmgMap[dmgCode] || dmgCode;
                    tags.add(`Damage: ${dmg}`);
                }
                // Add Armor toughness tag using the armor's toughness field
                if (e.category === 'Armor' && e.toughness) {
                    tags.add(`Toughness: ${e.toughness}`);
                }
            }
            return Array.from(tags).sort();
        });

        const filterSearchTags = (val, update) => {
            if (val === '') {
                update(() => {
                    searchTagOptions.value = allAvailableTags.value;
                });
                return;
            }
            update(() => {
                const needle = val.toLowerCase();
                searchTagOptions.value = allAvailableTags.value.filter(v => v.toLowerCase().includes(needle));
            });
        };

        const activeCategories = ref([]);
        const onSearchTagsUpdated = (newTags) => {
            if (!newTags) newTags = [];
            newComponentSelection.value = null; // Always clear the selected component

            let newCats = newTags.filter(t => t.startsWith("Category: ")).map(t => t.replace("Category: ", ""));
            let categoriesToKeep = newCats;
            let tagsToFilterOut = new Set();
            
            // Enforce single category: if there are multiple categories, keep only the most recently added one
            if (newCats.length > 1) {
                const latestCat = newCats[newCats.length - 1];
                const removedCats = newCats.filter(c => c !== latestCat);
                categoriesToKeep = [latestCat];
                
                removedCats.forEach(c => tagsToFilterOut.add(`Category: ${c}`));
                for (const cat of removedCats) {
                    store.allEquipment.filter(e => e.category === cat && e.group).forEach(e => tagsToFilterOut.add(`Type: ${e.group}`));
                }
            }

            // Standard cleanup: if a category was manually removed, remove its types
            const removedCatsNormal = activeCategories.value.filter(c => !categoriesToKeep.includes(c));
            for (const cat of removedCatsNormal) {
                store.allEquipment.filter(e => e.category === cat && e.group).forEach(e => tagsToFilterOut.add(`Type: ${e.group}`));
            }
            
            if (tagsToFilterOut.size > 0) {
                const filteredTags = searchTags.value.filter(t => !tagsToFilterOut.has(t));
                if (filteredTags.length !== searchTags.value.length) {
                    setTimeout(() => {
                        searchTags.value = filteredTags;
                    }, 10);
                }
            }
            
            activeCategories.value = categoriesToKeep;
        };

        const filteredEquipmentPool = computed(() => {
            if (!searchTags.value.length) return store.allEquipment;

            const categories = searchTags.value.filter(t => t.startsWith("Category: ")).map(t => t.replace("Category: ", ""));
            const types = searchTags.value.filter(t => t.startsWith("Type: ")).map(t => t.replace("Type: ", ""));
            const pls = searchTags.value.filter(t => t.startsWith("PL: ")).map(t => t.replace("PL: ", ""));
            const damages = searchTags.value.filter(t => t.startsWith("Damage: ")).map(t => t.replace("Damage: ", ""));
            const armorTough = searchTags.value.filter(t => t.startsWith("Toughness: ")).map(t => t.replace("Toughness: ", ""));
            const rawSearches = searchTags.value.filter(t => !t.startsWith("Category: ") && !t.startsWith("Type: ") && !t.startsWith("PL: ") && !t.startsWith("Damage: ") && !t.startsWith("Toughness: ")).map(t => t.toLowerCase());

            return store.allEquipment.filter(e => {
                if (categories.length > 0 && !categories.includes(e.category)) return false;
                if (types.length > 0 && !types.includes(e.group)) return false;
                if (pls.length > 0 && !pls.includes(e.stats?.pl)) return false;
                if (damages.length > 0) {
                    if (!e.fire) return false;
                    const dmgCode = e.fire.split('/')[1];
                    const dmgMap = { S: 'Sm', L: 'Lt', M: 'Md', H: 'Hv', SH: 'Shv' };
                    const dmg = dmgMap[dmgCode] || dmgCode;
                    if (!damages.includes(dmg)) return false;
                }
                if (armorTough.length > 0) {
                    if (!e.toughness || !armorTough.includes(e.toughness)) return false;
                }
                for (const needle of rawSearches) {
                    const nameMatch = getLocalizedName(e).toLowerCase().includes(needle);
                    const descMatch = e.description && e.description.toLowerCase().includes(needle);
                    if (!nameMatch && !descMatch) return false;
                }
                return true;
            });
        });

        // Computes available items based on ALL selected filters
        const itemOptions = computed(() => {
            // Require at least one filter to show items (to avoid showing the entire DB at once)
            if (!searchTags.value.length) return [];
            
            return filteredEquipmentPool.value.map(e => ({
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

        const checkRequirements = (itemDef) => {
            if (!itemDef.requires || !itemDef.requires.length) return { valid: true, missing: [] };
            const missing = [];
            for (const reqId of itemDef.requires) {
                const hasReq = store.installedComponents.some(c => c.defId === reqId);
                if (!hasReq) {
                    const reqDef = store.allEquipment.find(e => e.id === reqId);
                    missing.push(reqDef ? getLocalizedName(reqDef) : reqId);
                }
            }
            return { valid: missing.length === 0, missing };
        };

        // 4. Cost/EP Preview
        const previewCost = computed(() => {
            if (!selectedItemDef.value) return 0;
            return store.getComponentCost({ defId: selectedItemDef.value.id, miniaturization: 0, isStock: false });
        });

        const previewHullPts = computed(() => {
            if (!selectedItemDef.value) return 0;
            return store.getComponentHullPts({ defId: selectedItemDef.value.id, miniaturization: 0, isStock: false });
        });


        const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        // 5. JSON Editor Logic
        const showJsonEditor = ref(false);
        const jsonContent = ref('');

        const openWiki = () => {
            const def = selectedItemDef.value;
            if (!def) return;
            if (def.wiki) {
                window.open(def.wiki, '_blank');
                return;
            }
            
            let url = 'https://aaa.dimble.net/warships/ship-construction/';
            if (def.category === 'Armor') url += 'armor/';
            else if (def.category === 'Sublight') url += 'engines/';
            else if (def.category === 'FTL Drives') url += 'ftl-drive/';
            else if (def.category === 'Power') url += 'power-plant/';
            else if (def.category === 'Weapon Systems') url += 'weapons-defenses/';
            else url += 'systems-crew/';
            
            window.open(url, '_blank');
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

                // If the user modified the component's category or group, ensure the new tags are selected
                if (newDef.category && !searchTags.value.includes(`Category: ${newDef.category}`)) {
                    searchTags.value.push(`Category: ${newDef.category}`);
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
                    store.addComponent(newComponentSelection.value, loc);
                    $q.notify({ type: 'positive', message: `${getLocalizedName(def)} installed.`, position: 'bottom', timeout: 1500 });
                };

                const installErrors = [];
                if (!isSizeValid(def)) installErrors.push('This component is not compatible with the ship\'s size class.');
                const reqs = checkRequirements(def);
                if (!reqs.valid) installErrors.push(`Missing prerequisites: ${reqs.missing.join(', ')}`);

                if (installErrors.length > 0) {
                    $q.dialog({
                        dark: true,
                        title: 'Warning',
                        message: installErrors.join(' ') + ' Install anyway?',
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

        return { store, searchTags, searchTagOptions, filterSearchTags, onSearchTagsUpdated, newComponentSelection, itemOptions, selectedItemDef, isSizeValid, checkRequirements, previewCost, previewHullPts, resetSelections, formatCreds, installComponent, getLocalizedName,
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
                    <div v-if="store.isDev">
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

            if (store.isDev && newCustomComponent.addToCore) {
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
        const getDef = (id) => store.allEquipment.find(e => e.id === id);
        const getBaseEp = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def ? def.baseEp : 0;
        }
        const getIcon = (id) => {
            const e = store.allEquipment.find(e => e.id === id);
            if (!e) return 'memory';
            if (e.category === 'Armor') return 'security';
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
        const getDescriptionLine = (instance) => {
            const def = store.allEquipment.find(e => e.id === instance.defId);
            if (!def) return instance.location || '';
            let parts = [];
            
            if (instance.modifications?.auxiliary) {
                parts.push("Auxiliary");
            }
            if (def.stats?.pl) {
                parts.push(def.stats.pl);
            }
            if (def.group && def.group.startsWith('PL')) {
                parts.push(def.group);
            }
            if (def.tech && def.tech.length > 0) {
                const techNames = def.tech.map(t => TECH_DEFINITIONS[t]?.name || t).join(', ');
                parts.push(techNames);
            }
            const epDyn = getEpDynamic(instance.defId);
            if (epDyn) {
                parts.push('Size: +' + Math.abs(epDyn) + ' Hull points');
            } else {
                const pts = store.getComponentHullPts(instance);
                if (pts !== 0) {
                    if (def && ['Sublight', 'FTL Drives'].includes(def.category)) {
                        parts.push('Size: ' + instance.modifications.quantity + '% (' + pts + ' Hull points)');
                    } else {
                        parts.push('Size: ' + pts + ' Hull points');
                    }
                }
            }
            if (instance.location) {
                parts.push('Location: ' + instance.location);
            }
            if (['Accommodations', 'Miscellaneous'].includes(def.category)) {
                let qty = instance.modifications?.quantity || 1;
                if (def.stats?.facility_capacity) parts.push(`Supports: ${def.stats.facility_capacity * qty} people`);
                else if (def.stats?.berthing_capacity) parts.push(`Beds: ${def.stats.berthing_capacity * qty}`);
                else if (def.stats?.passenger_capacity) parts.push(`Seats: ${def.stats.passenger_capacity * qty}`);
                else if (def.stats?.life_support_hull) parts.push(`Coverage: ${def.stats.life_support_hull * qty} Hull`);
                else if (def.stats?.stores_days) parts.push(`Stores: +${def.stats.stores_days * qty} days`);
                else if (def.stats?.hydroponics_reduction) parts.push(`Hydroponics: -${def.stats.hydroponics_reduction * qty} Cons./day`);
                else if (def.stats?.recycler_capacity) parts.push(`Recycles: ${def.stats.recycler_capacity * qty} people (10%)`);
                else if (def.stats?.cargo_tons_bonus) parts.push(`Cargo: +${def.stats.cargo_tons_bonus * qty} tons`);
            } else if (def.category === 'Sensors') {
                if (def.stats?.sensor_type) parts.push(`Type: ${def.stats.sensor_type}`);
                if (def.stats?.sensor_range) parts.push(`Range: ${def.stats.sensor_range}`);
                if (def.stats?.sensor_arcs) parts.push(`Arcs: ${def.stats.sensor_arcs}`);
                if (def.stats?.sensor_targeting) parts.push(`Targeting: ${def.stats.sensor_targeting}`);
            } else if (def.category === 'Computers') {
                if (def.stats?.skill_bonus) parts.push(`Bonus: +${def.stats.skill_bonus} steps`);
            } else if (store.isWeapon(def.id)) {
                if (def.damage) parts.push('Damage: ' + def.damage);
                if (def.fire) parts.push('Quality: ' + def.fire);
            }
            return parts.join(' | ');
        };
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
        const isSensor = (id) => {
            const def = store.allEquipment.find(e => e.id === id);
            return def && def.category === 'Sensors';
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

        const hasUpgrades = (defId) => isWeapon(defId) || canEnhance(defId) || !!store.allEquipment.find(e => e.id === defId)?.upgradeSpecs;
        const getUpgradeSpecs = (defId) => store.allEquipment.find(e => e.id === defId)?.upgradeSpecs;

        const emplacementOptions = computed(() => {
            const def = store.allEquipment.find(e => e.id === editingInstance.value?.defId);
            const opts = [
                { label: 'Fixed Mount (-25% Cost/Hull)', value: 'Fixed Mount' },
                { label: 'Standard Mount', value: 'Standard Mount' },
                { label: 'Sponson (+25% Cost)', value: 'Sponson' },
                { label: 'Turret (+25% Cost/Hull)', value: 'Turret' }
            ];
            if (def && (def.stats?.pl >= 8) && (def.group === 'Beams' || (def.name && (def.name.toLowerCase().includes('laser') || def.name.toLowerCase().includes('plasma') || def.name.toLowerCase().includes('beam'))))) {
                opts.push({ label: 'Bank (+25% Cost)', value: 'Bank' });
            }
            return opts;
        });

        const weaponMountOptions = [
            { label: 'Single', value: 'Single' },
            { label: 'Twin Mount (x1.5 Cost/Hull, x2 Power)', value: 'Twin' },
            { label: 'Triple Mount (x2.0 Cost/Hull, x3 Power)', value: 'Triple' },
            { label: 'Quad Mount (x2.5 Cost/Hull, x4 Power)', value: 'Quad' }
        ];

        const maxArcsAllowed = computed(() => {
            if (!editingInstance.value?.modifications) return 1;
            const emp = editingInstance.value.modifications.emplacement || 'Standard Mount';
            if (emp === 'Fixed Mount' || emp === 'Standard Mount') return 1;
            if (emp === 'Sponson') return 2;
            if (emp === 'Turret' || emp === 'Bank') return 3;
            return 1;
        });

        const getEffectiveArcLimit = (assumingArc = null) => {
             const emp = editingInstance.value?.modifications?.emplacement || 'Standard Mount';
             const arcs = editingInstance.value?.modifications?.arcs || [];
             let limit = maxArcsAllowed.value;
             let hasZeroSpecial = arcs.includes('Zero-Port') || arcs.includes('Zero-Starboard');
             if (assumingArc === 'Zero-Port' || assumingArc === 'Zero-Starboard') hasZeroSpecial = true;
             if (emp === 'Standard Mount' && hasZeroSpecial) {
                 limit = 2;
             }
             return limit;
        };

        const isArcDisabled = (arc) => {
            if (!editingInstance.value?.modifications) return false;
            let arcs = editingInstance.value.modifications.arcs || [];
            
            // Standard Mount zero-port/zero-stbd rules
            if (arc === 'Zero-Port' || arc === 'Zero-Starboard') {
                 if (store.chassis.value?.size === 'Small Craft') return true;
                 const emp = editingInstance.value.modifications.emplacement || 'Standard Mount';
                 if (emp === 'Fixed Mount' || emp === 'Sponson' || emp === 'Bank') return true; // Only Standard/Turret
                 if (arc === 'Zero-Port' && arcs.includes('Zero-Starboard')) return true; // Can't have both
                 if (arc === 'Zero-Starboard' && arcs.includes('Zero-Port')) return true;
            }

            if (arcs.includes(arc)) return false;

            let totalSelected = arcs.length;
            if (arcs.includes('Zero')) totalSelected--; // Zero is free and automatic for small weapons
            
            return totalSelected >= getEffectiveArcLimit(arc);
        };

        const onEmplacementChanged = () => {
             if (!editingInstance.value?.modifications) return;
             let arcs = editingInstance.value.modifications.arcs || [];
             const limit = getEffectiveArcLimit();
             let nonZeroArcs = arcs.filter(a => a !== 'Zero');
             if (nonZeroArcs.length > limit) {
                 editingInstance.value.modifications.arcs = arcs.filter(a => a === 'Zero').concat(nonZeroArcs.slice(0, limit));
             }
        };
        const canEnhance = (defId) => {
            const def = store.allEquipment.find(e => e.id === defId);
            if (!def) return false;
            if (['Sublight', 'FTL Drives', 'Defenses'].includes(def.category)) return true;
            if (isWeapon(defId) || def.category === 'Weapon Systems') return true;
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

        const openConfig = (instance) => {
            if (!instance.modifications.arcs) {
                instance.modifications.arcs = [];
            }
            const def = store.allEquipment.find(e => e.id === instance.defId);
            if (def && (isWeapon(def.id) || isSensor(def.id))) {
                if (!instance.modifications.emplacement) instance.modifications.emplacement = 'Standard Mount';
            }
            if (def && isWeapon(def.id)) {
                if (!instance.modifications.weaponMount) instance.modifications.weaponMount = 'Single';
                if (!instance.modifications.concealed) instance.modifications.concealed = false;
                if (!instance.modifications.fireControl) instance.modifications.fireControl = 'None';
                
                const isSmallCraft = store.chassis.value?.size === 'Small Craft';
                if (isSmallCraft) {
                    if (!instance.modifications.arcs.includes('Zero')) {
                        instance.modifications.arcs.push('Zero');
                    }
                    instance.modifications.arcs = instance.modifications.arcs.filter(a => a !== 'Zero-Port' && a !== 'Zero-Starboard');
                } else {
                    instance.modifications.arcs = instance.modifications.arcs.filter(a => a !== 'Zero');
                }
            }
            editingInstance.value = instance; 
            showConfigDialog.value = true; 
        };

        const openWiki = (defId) => {
             const def = store.allEquipment.find(e => e.id === defId);
             if (!def) return;

             if (def.wiki) {
                 window.open(def.wiki, '_blank');
                 return;
             }
             
             let url = 'https://aaa.dimble.net/warships/ship-construction/';
             if (def.category === 'Armor') url += 'armor/';
             else if (def.category === 'Sublight') url += 'engines/';
             else if (def.category === 'FTL Drives') url += 'ftl-drive/';
             else if (def.category === 'Power') url += 'power-plant/';
             else if (def.category === 'Weapon Systems') url += 'weapons-defenses/';
             else url += 'systems-crew/';
             
             window.open(url, '_blank');
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

            const enginePctMap = [5, 10, 15, 20, 30, 40, 50];

            return {

                get sublightPctIndex() { 
                    let val = mods.quantity || 10;
                    if (val < 5) val = 5;
                    let closest = 0;
                    let minDiff = Infinity;
                    for (let i = 0; i < enginePctMap.length; i++) {
                        let diff = Math.abs(enginePctMap[i] - val);
                        if (diff < minDiff) { minDiff = diff; closest = i; }
                    }
                    return closest;
                },
                set sublightPctIndex(idx) { 
                    mods.quantity = enginePctMap[idx]; 
                },
                get sublightPctLabel() { return enginePctMap[this.sublightPctIndex] + '%'; },
                get sublightPctMinIndex() {
                    const def = store.allEquipment.find(e => e.id === editingInstance.value.defId);
                    const minPct = def ? Math.ceil(((def.minHullPts || 1) / (store.chassis.baseHull || 1)) * 100) : 5;
                    let minIndex = 0;
                    for (let i = 0; i < enginePctMap.length; i++) {
                        if (enginePctMap[i] >= minPct) { minIndex = i; break; }
                        if (i === enginePctMap.length - 1) minIndex = i;
                    }
                    return minIndex;
                }
            };
        });

        return { store, getName, getDef, getIcon, getEpDynamic, getDescriptionLine, getBaseEp, isVariableCost, isModification, isWeapon, isSensor, isLauncher, isCustom, format, showConfigDialog, editingInstance, hasUpgrades, getUpgradeSpecs, canEnhance, canBattery, canPointBlank, getGenericOptions, openConfig, openWiki, checkValidity, configModel, getOptionCost, emplacementOptions, weaponMountOptions, maxArcsAllowed, isArcDisabled, onEmplacementChanged };
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
        const crewQualityOptions = computed(() => {
            if (!store.CREW_QUALITY_STATS) return [];
            return Object.keys(store.CREW_QUALITY_STATS).map(k => ({ label: k, value: k }));
        });
        const format = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';
        return { store, templateOptions, crewQualityOptions, format, showEpDialog };
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
                if (instance.modifications.advanced) parts.push('Advanced');
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
            return nonWeapons.map(instance => getName(instance)).join(', ');
        });

        const getDmg = (instance) => {
            return store.getComponentDamage(instance) || '-';
        }
        const calculateCL = computed(() => {
            if (store.chassis.challengeLevel !== null && store.chassis.challengeLevel !== undefined) {
                return store.chassis.challengeLevel;
            }
            let cl = 10;
            if(store.chassis.size.includes('Colossal')) cl += 5;
            cl += Math.floor(store.installedComponents.length / 2);
            if(store.template) cl += 2;
            cl += store.crewStats.cl;
            return cl;
        });
        const formatCreds = (n) => new Intl.NumberFormat('en-US', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' cr';

        const weaponData = computed(() => {
            return weapons.value.map(w => {
                const def = store.allEquipment.find(e => e.id === w.defId);
                const name = getName(w); // Uses the existing getName which handles some mods
                const damage = getDmg(w);

                // Calculate Attack Bonus: Crew Atk + Int Mod + Range(0) + Size?
                // Usually Starship weapons are Int based.
                // SotG p16: "Attack Bonus" is Base Atk.
                // We add ship's Int modifier (or Pilot's Dex if we had a pilot, but we assume generic crew).
                // "Generic crew use the ship's Intelligence modifier for attack rolls with ship weapons."
                const atk = store.crewStats.atk + getMod(store.currentStats.int);

                const detailsParts = [];
                if (w.modifications.batteryCount > 1) detailsParts.push(`Battery (${w.modifications.batteryCount} guns)`);
                if (w.modifications.weaponMount && w.modifications.weaponMount !== 'Single') detailsParts.push(`${w.modifications.weaponMount} Battery`);
                
                if (w.modifications.fireControl) {
                    if (w.modifications.fireControl === 'Ordinary') detailsParts.push('Ordinary FC (-1 step)');
                    if (w.modifications.fireControl === 'Good') detailsParts.push('Good FC (-2 step)');
                    if (w.modifications.fireControl === 'Amazing') detailsParts.push('Amazing FC (-3 step)');
                }
                
                if (w.modifications.autofire) detailsParts.push('Autofire');
                if (w.modifications.pointBlank) detailsParts.push('Point-Blank');

                // Range isn't easily available in data.json currently without parsing description or adding a field.
                // We'll skip range for now or infer it? Laser Cannon = Short?
                // We'll just stick to declarative mods.

                return {
                    instanceId: w.instanceId,
                    name: name,
                    damage: damage,
                    attackBonus: atk,
                    details: detailsParts.join(', '),
                    defId: w.defId
                };
            });
        });

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

        return { store, getName, getMod, weapons, weaponData, systemNames, getDmg, calculateCL, formatCreds, getLocalizedName, componentsWithDescriptions, getDescription };
    }
};
