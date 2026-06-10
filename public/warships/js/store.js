const { defineStore } = Pinia;
const { reactive, ref, computed, watch } = Vue;

export const useShipStore = defineStore('ship', () => {
    const round = (num) => Math.round(num * 100) / 100;

    // Database State
    const db = reactive({
        STOCK_SHIPS: [],
        EQUIPMENT: [],
        TEMPLATES: [],
        SIZE_COST_MULTIPLIERS: {},
        REFLEX_SIZE_MODS: {},
        LICENSE_FEES: {},
        AVAILABILITY_RANK: [],
        SIZE_RANK: []
    });

    // App State
    const isDev = ref(new URLSearchParams(window.location.search).get('dev') === 'true');
    const meta = reactive({ name: 'Untitled Ship', version: '1.0' });
    const chassisId = ref(null);
    const activeTemplate = ref(null);
    const installedComponents = ref([]);

    const showAddComponentDialog = ref(false);
    const cargoToEpAmount = ref(0);
    const escapePodsToEpPct = ref(0);
    const crewQuality = ref('Normal');

    // Hangar State
    const hangar = ref([]);
    const activeShipId = ref(null);

    // Template Edit State
    const isTemplateEditMode = ref(false);
    const templateEditId = ref(null);
    const preEditState = ref(null);

    // Libraries State (Replaces customComponents)
    const libraries = ref([]);

    const customDialogState = reactive({ visible: false, componentId: null });
    const customShipDialogState = reactive({ visible: false, shipId: null });
    const showCustomManager = ref(false);

    // Initialize DB Action
    function initDb(data) {
        Object.assign(db, data);
    }

    // Consolidated Equipment List (Base + Libraries with Priority)
    const allEquipment = computed(() => {
        const map = new Map();
        // 1. Base
        db.EQUIPMENT.forEach(e => map.set(e.id, e));

        // 2. Libraries (in order)
        libraries.value.forEach(lib => {
            if (lib.active) {
                lib.components.forEach(c => map.set(c.id, c));
            }
        });
        return Array.from(map.values());
    });

    // Consolidated Ship List (Base + Libraries with Priority)
    const allShips = computed(() => {
        const map = new Map();
        // 1. Base
        db.STOCK_SHIPS.forEach(s => map.set(s.id, s));

        // 2. Libraries (in order)
        libraries.value.forEach(lib => {
            if (lib.active) {
                lib.ships.forEach(s => map.set(s.id, s));
            }
        });
        return Array.from(map.values());
    });

    // Legacy Computed for backward compatibility (flattened custom components)
    const customComponents = computed(() => {
        return libraries.value.flatMap(l => l.components);
    });

    // Helper functions
    const chassis = computed(() => {
        if (!allShips.value.length) return { size: 'Huge', baseHull: 0, cost: 0, stats: {}, logistics: {} }; // Fallback
        return allShips.value.find(s => s.id === chassisId.value) || allShips.value[0];
    });

    function isWeapon(defId) {
        const def = allEquipment.value.find(e => e.id === defId);
        if (!def) return false;
        return def.category === 'Weapon Systems' || def.id === 'sensor_decoy';
    }

    function isEngine(defId) {
        const def = allEquipment.value.find(e => e.id === defId);
        if (!def) return false;
        return def.group === 'Sublight Drives' && def.stats && def.stats.speed !== undefined;
    }

    function calculateHullPts(instance) {
        const def = allEquipment.value.find(e => e.id === instance.defId);
        if (!def) return 0;

        let hullCost = 0;
        const batteryCount = instance.modifications?.batteryCount || 1;
        const quantity = instance.modifications?.quantity || 1;
        const enhancement = instance.modifications?.enhancement || 'normal';
        const auxiliary = instance.modifications?.auxiliary || false;
        const emplacement = instance.modifications?.emplacement || 'Standard Mount';
        const weaponMount = instance.modifications?.weaponMount || 'Single';
        const concealed = instance.modifications?.concealed || false;

        if (def.hullCost) {
            if (def.hullCost.type === 'pct') {
                hullCost = (def.hullCost.base || 0) + (chassis.value.baseHull || 0) * def.hullCost.val;
                if (def.hullCost.max !== undefined) {
                    hullCost = Math.min(hullCost, def.hullCost.max);
                }
            } else {
                hullCost = def.hullCost.val;
            }
        }

        if (def.category === 'Sublight' || def.category === 'FTL Drives') {
            const pctHull = Math.ceil((chassis.value.baseHull || 0) * (quantity / 100));
            hullCost = Math.max(def.minHullPts || 1, pctHull);
        } else if (def.minHullPts !== undefined) {
            // Power plants use quantity as Allocated Hull Points
            hullCost = Math.max(def.minHullPts, quantity);
        }

        // 1. Enhancement
        if (enhancement === 'enhanced') hullCost += 1;
        if (enhancement === 'advanced') {
            if (isWeapon(def.id) || def.category === 'Weapon Systems') {
                hullCost = hullCost * 0.8;
            } else {
                hullCost += 2;
            }
        }

        // Weapon Modifiers
        if (isWeapon(def.id) || def.category === 'Weapon Systems' || def.category === 'Sensors') {
            let baseWpnHull = hullCost;
            let mountHull = baseWpnHull;
            if (emplacement === 'Fixed Mount') {
                if (baseWpnHull === 1) mountHull = 1;
                else if (baseWpnHull === 2) mountHull = 2;
                else if (baseWpnHull === 3) mountHull = 2;
                else if (baseWpnHull === 4) mountHull = 3;
                else mountHull = Math.round(baseWpnHull * 0.75);
            } else if (emplacement === 'Turret') {
                if (baseWpnHull === 1) mountHull = 1;
                else if (baseWpnHull === 2) mountHull = 3;
                else if (baseWpnHull === 3) mountHull = 4;
                else if (baseWpnHull === 4) mountHull = 5;
                else mountHull = Math.round(baseWpnHull * 1.25);
            }
            hullCost = mountHull;
        }

        if (isWeapon(def.id) || def.category === 'Weapon Systems') {
            if (weaponMount === 'Twin') hullCost = Math.round(hullCost * 1.5);
            else if (weaponMount === 'Triple') hullCost = hullCost * 2;
            else if (weaponMount === 'Quad') hullCost = Math.round(hullCost * 2.5);

            if (concealed) hullCost = Math.round(hullCost * 1.5);
            
            if (instance.modifications?.fireControl && instance.modifications.fireControl !== 'None') {
                hullCost += 1;
            }
        }

        // 4. Auxiliary Command Deck
        if (auxiliary) {
            hullCost *= 2;
        }

        if (batteryCount > 1) {
            hullCost *= batteryCount;
        }

        // Multiply by quantity if it's not a power plant and not a percentage-based scaling (like armor)
        if (def.minHullPts === undefined && (!def.hullCost || def.hullCost.type !== 'pct') && quantity > 1) {
            hullCost *= quantity;
        }

        if (hullCost > 0) {
            if (instance.miniaturization === 1) hullCost = Math.max(1, hullCost - 1);
            else if (instance.miniaturization === 2) hullCost = Math.ceil(hullCost / 2);
        }
        return hullCost;
    }

    function getComponentHullPts(instance) {
        return calculateHullPts(instance);
    }

    function getComponentPower(instance) {
        const def = allEquipment.value.find(e => e.id === instance.defId);
        if (!def) return { generated: 0, consumed: 0 };
        
        let gen = 0;
        let con = 0;
        
        if (def.powerPerHull) {
            // Power plants
            const quantity = instance.modifications?.quantity || 1;
            const allocatedHull = Math.max(def.minHullPts || 1, quantity);
            gen = def.powerPerHull * allocatedHull;
        }
        
        if (def.powerConsumed) {
            con = def.powerConsumed;
            const quantity = instance.modifications?.quantity || 1;
            // Similar to hull cost, if it's a weapon, multiply by quantity
            if (quantity > 1) con *= quantity;
            
            if (isWeapon(def.id) || def.category === 'Weapon Systems') {
                const weaponMount = instance.modifications?.weaponMount || 'Single';
                if (weaponMount === 'Twin') con *= 2;
                else if (weaponMount === 'Triple') con *= 3;
                else if (weaponMount === 'Quad') con *= 4;
            }
        }

        if (def.powerConsumedPerHull) {
            con += def.powerConsumedPerHull * getComponentHullPts(instance);
        }

        if (isWeapon(def.id) || def.category === 'Weapon Systems') {
            const enhancement = instance.modifications?.enhancement || 'normal';
            if (enhancement === 'advanced') {
                con *= 1.2;
            }
        }
        
        return { generated: gen, consumed: con };
    }

    function getComponentDamage(instance) {
        const def = allEquipment.value.find(e => e.id === instance.defId);
        if (!def || !def.damage) return null;

        const match = def.damage.match(/(\d+)d(\d+)(x\d+)?/);
        if (!match) return def.damage;

        let diceCount = parseInt(match[1]);
        const dieType = parseInt(match[2]);
        const multiplier = match[3] || '';

        let prefix = '';

        if (instance.modifications) {
            const enhancement = instance.modifications.enhancement || 'normal';

            // 1. Enhancement
            if (enhancement === 'enhanced') diceCount += 1;
            if (enhancement === 'advanced') diceCount += 2;
        }

        // Global Bonuses (Template)
        if (currentStats.value.weapon_damage_dice) {
            diceCount += currentStats.value.weapon_damage_dice;
        }

        return `${prefix}${diceCount}d${dieType}${multiplier}`;
    }

    function calculateComponentCost(instance, ignoreStock = false) {
        const def = allEquipment.value.find(e => e.id === instance.defId);
        if (!def || (!ignoreStock && instance.isStock)) return 0;

        let cost = def.baseCost || 0;
        
        if (def.costPerHull) {
            let hullPts = calculateHullPts(instance);
            
            // Armor rule: Minimum cost of 1 hull point worth of armor (only for flat values)
            if (def.category === 'Armor' && (!def.hullCost || def.hullCost.type !== 'pct')) {
                hullPts = Math.max(1, hullPts);
            }
            
            cost += (def.costPerHull * hullPts);
        }

        // Modifications (Payload, Battery, Fire-link, Quantity)
        if (instance.modifications) {
             const enhancement = instance.modifications.enhancement || 'normal';
             const emplacement = instance.modifications.emplacement || 'Standard Mount';
             const weaponMount = instance.modifications.weaponMount || 'Single';
             const concealed = instance.modifications.concealed || false;

             // 1. Enhancement (Multiplier)
             if (enhancement === 'enhanced') cost *= 2;
             if (enhancement === 'advanced') cost *= 5;

             // Weapon/Sensor Emplacement Modifiers
             if (isWeapon(def.id) || def.category === 'Weapon Systems' || def.category === 'Sensors') {
                 if (emplacement === 'Fixed Mount') cost *= 0.75;
                 if (emplacement === 'Sponson' || emplacement === 'Turret' || emplacement === 'Bank') cost *= 1.25;
             }

             // Weapon Modifiers
             if (isWeapon(def.id) || def.category === 'Weapon Systems') {
                 if (weaponMount === 'Twin') cost *= 1.5;
                 else if (weaponMount === 'Triple') cost *= 2.0;
                 else if (weaponMount === 'Quad') cost *= 2.5;

                 if (concealed) cost *= 1.5;

                 if (instance.modifications.fireControl && instance.modifications.fireControl !== 'None') {
                     const tempInstance = JSON.parse(JSON.stringify(instance));
                     tempInstance.modifications.fireControl = 'None';
                     tempInstance.modifications.quantity = 1;
                     tempInstance.modifications.batteryCount = 1;
                     const baseWeaponHull = calculateHullPts(tempInstance);

                     if (instance.modifications.fireControl === 'Ordinary') cost += baseWeaponHull * 200000;
                     if (instance.modifications.fireControl === 'Good') cost += baseWeaponHull * 300000;
                     if (instance.modifications.fireControl === 'Amazing') cost += baseWeaponHull * 300000;
                 }
             }

             // 4. Auxiliary
             if (instance.modifications?.auxiliary) cost *= 2;

             if (def.upgradeSpecs && def.upgradeSpecs.payload) {
                 if (def.upgradeSpecs.payload.type === 'capacity' && instance.modifications.payloadCount > 0) {
                     cost += instance.modifications.payloadCount * (def.baseCost * def.upgradeSpecs.payload.costFactor);
                 } else if (instance.modifications.payloadOption && def.upgradeSpecs.payload.type === 'toggle') {
                     cost += def.upgradeSpecs.payload.cost;
                 }
             }
             // Helper to resolve cost from definition or default
             const resolveCost = (key, baseCost) => {
                 let costDef = null;
                 // 1. Check Component Override
                 if (def.upgradeSpecs && def.upgradeSpecs.optionCosts && def.upgradeSpecs.optionCosts[key] !== undefined) {
                     costDef = def.upgradeSpecs.optionCosts[key];
                 } else if (def.upgradeSpecs && def.upgradeSpecs[key] && typeof def.upgradeSpecs[key] === 'object' && def.upgradeSpecs[key].cost !== undefined) {
                     // Check legacy/direct object structure (e.g. fireLinkOption.cost)
                     costDef = def.upgradeSpecs[key].cost;
                 }

                 // 2. Check Global Default
                 if (costDef === null && db.DEFAULT_OPTION_COSTS && db.DEFAULT_OPTION_COSTS[key] !== undefined) {
                     costDef = db.DEFAULT_OPTION_COSTS[key];
                 }

                 if (costDef === null) return 0;

                 // 3. Calculate Logic (Fixed or Multiplier)
                 if (typeof costDef === 'number') {
                     return costDef;
                 } else if (typeof costDef === 'object') {
                     if (costDef.multiplier) {
                         return baseCost * costDef.multiplier;
                     }
                     if (costDef.cost) {
                         // Legacy object { cost: 1000 } or { cost: 1000 }
                         let val = costDef.cost;
                         return val;
                     }
                 }
                 return 0;
             };

             // Selective Fire
             if (instance.modifications.fireLinkOption) {
                 cost += resolveCost('fireLinkOption', cost);
             }

             // Generic Option Costs
             for (const [key, val] of Object.entries(instance.modifications)) {
                 if (val === true) {
                     // Exclude known keys handled elsewhere to avoid double counting if they overlap
                     // fireLinkOption handled above.
                     if (key === 'fireLinkOption') continue;

                     // We check if this key implies a cost (either via spec override or default)
                     const addedCost = resolveCost(key, def.baseCost);
                     if (addedCost > 0) {
                         cost += addedCost;
                     }
                 }
             }

             if (instance.modifications.batteryCount > 1) {
                 cost *= instance.modifications.batteryCount;
             }
             if (instance.modifications.quantity > 1 && def.minHullPts === undefined && (!def.hullCost || def.hullCost.type !== 'pct')) {
                 cost *= instance.modifications.quantity;
             }
        }

        if (instance.miniaturization === 1) cost *= 2;
        else if (instance.miniaturization === 2) cost *= 5;

        return Math.round(cost);
    }

    function getComponentCost(instance) {
        if (isTemplateEditMode.value) return 0;
        return calculateComponentCost(instance, false);
    }

    // Computed Properties
    const template = computed(() => activeTemplate.value ? db.TEMPLATES.find(t => t.id === activeTemplate.value) : null);
    const templateCostMult = computed(() => template.value ? template.value.costMult : 1);

    const currentStats = computed(() => {
        const s = { ...chassis.value.stats, speed: 0 };
        // Handle chassis SR if present, but components overwrite it.
        // If chassis has SR, it is kept unless components overwrite it later with modSR.
        // If chassis does NOT have SR (undefined), s.sr is undefined.
        // We should ensure it's not undefined for display? No, UI handles it.
        // BUT user said "SR depends on installed shield generator".
        // If I removed SR from custom ship dialog, custom ships have NO base SR.
        // So s.sr will be undefined (from spread) or effectively 0 if we default it.
        // Let's ensure s.sr is handled if undefined -> 0?
        if (s.sr === undefined) s.sr = 0;

        if (template.value && template.value.stats) {
            for (const [key, val] of Object.entries(template.value.stats)) {
                if (s[key] !== undefined) s[key] += val;
                else s[key] = val;
            }
        }
        let modSR = null, bestHyperdrive = null;
        let bonusSR = 0, bonusArmor = 0, bonusHP = 0;
        let bonusDex = 0, bonusStr = 0, bonusPer = 0, speedFactor = 0, hyperdriveShift = 0;
        let hpBonusPct = 0, weaponDice = 0;
        
        let armorLI = "-", armorHI = "-", armorEn = "-";

        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats) {
                if (def.category === 'Armor') {
                    if (def.stats.LI) armorLI = def.stats.LI;
                    if (def.stats.HI) armorHI = def.stats.HI;
                    if (def.stats.En) armorEn = def.stats.En;
                }
                
                if (def.stats.sr !== undefined) modSR = def.stats.sr;
                if (def.stats.hyperdrive !== undefined) {
                    if (bestHyperdrive === null || def.stats.hyperdrive < bestHyperdrive) {
                        bestHyperdrive = def.stats.hyperdrive;
                    }
                }
                if (def.stats.speed_map) {
                    let pct = instance.modifications.quantity || 5;
                    const enhancement = instance.modifications?.enhancement || 'normal';
                    if (enhancement === 'advanced') {
                        const steps = [5, 10, 15, 20, 30, 40, 50];
                        const idx = steps.indexOf(pct);
                        if (idx !== -1 && idx < steps.length - 1) {
                            pct = steps[idx + 1];
                        }
                    }
                    const pctStr = String(pct);
                    if (def.stats.speed_map[pctStr] !== undefined) {
                        if (def.category === 'Sublight') s.speed = def.stats.speed_map[pctStr];
                        else if (def.category === 'FTL Drives') s.ftlSpeed = def.stats.speed_map[pctStr];
                    }
                }
                if (def.category === 'FTL Drives' && (def.name === 'Stardrive' || def.name === 'Drivewave')) {
                    const hp = chassis.value.baseHull || 0;
                    const steps = ['5 Ly', '10 Ly', '20 Ly', '30 Ly', '50 Ly'];
                    let currentSpeed = '5 Ly';
                    if (hp < 100) currentSpeed = '5 Ly';
                    else if (hp <= 300) currentSpeed = '10 Ly';
                    else if (hp <= 600) currentSpeed = '20 Ly';
                    else if (hp <= 900) currentSpeed = '30 Ly';
                    else currentSpeed = '50 Ly';

                    const enhancement = instance.modifications?.enhancement || 'normal';
                    if (enhancement === 'advanced') {
                        const idx = steps.indexOf(currentSpeed);
                        if (idx !== -1 && idx < steps.length - 1) {
                            currentSpeed = steps[idx + 1];
                        }
                    }
                    s.ftlSpeed = currentSpeed;
                } else if (def.stats.speed !== undefined) {
                    s.speed = def.stats.speed;
                }

                if (def.stats.sr_bonus) bonusSR += def.stats.sr_bonus;
                if (def.stats.armor_bonus) bonusArmor += def.stats.armor_bonus;
                if (def.stats.dex_bonus) bonusDex += def.stats.dex_bonus;
                if (def.stats.int_bonus) s.int += def.stats.int_bonus;
                if (def.stats.str_bonus) bonusStr += def.stats.str_bonus;
                if (def.stats.perception_bonus) bonusPer += def.stats.perception_bonus;
                if (def.stats.speed_factor) speedFactor += def.stats.speed_factor;
                if (def.stats.hyperdrive_bonus) hyperdriveShift += def.stats.hyperdrive_bonus;
                if (def.stats.hp_dynamic_str) bonusHP += Math.floor(Math.floor((s.str || 0) / 2) / 10) * 10;
                if (def.stats.hp_bonus_pct) hpBonusPct += def.stats.hp_bonus_pct;
                if (def.stats.weapon_damage_dice) weaponDice += def.stats.weapon_damage_dice;
            }
        });
        
        s.LI = armorLI;
        s.HI = armorHI;
        s.En = armorEn;
        
        if (modSR !== null) s.sr = modSR;
        if (bestHyperdrive !== null) s.hyperdrive = bestHyperdrive;

        s.sr = (s.sr || 0) + bonusSR;
        s.armor = (s.armor || 0) + bonusArmor;
        s.hp = (s.hp || 0) + bonusHP;
        s.dex = (s.dex || 0) + bonusDex;
        s.str = (s.str || 0) + bonusStr;
        s.perception_bonus = bonusPer;

        if (s.dex < 0) s.dex = 0; // Prevent negative Dex

        if (hpBonusPct > 0) s.hp += Math.floor(s.hp * hpBonusPct);
        if (s.speed > 0 && speedFactor > 0) s.speed += Math.max(1, Math.floor(s.speed * speedFactor));
        if (s.hyperdrive) s.hyperdrive += hyperdriveShift;
        s.weapon_damage_dice = (s.weapon_damage_dice || 0) + weaponDice;
        return s;
    });

    const fortitudeDefense = computed(() => {
        const str = currentStats.value.str || 10;
        return 10 + Math.floor((str - 10) / 2);
    });

    const damageThreshold = computed(() => {
        return fortitudeDefense.value;
    });

    const shipAvailability = computed(() => {
        let maxRank = 0;
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.availability) {
                const rank = db.AVAILABILITY_RANK.indexOf(def.availability);
                if (rank > maxRank) maxRank = rank;
            }
        });

        // Escape Pod Rule
        if (escapePodsToEpPct.value > 0) {
             const militaryIndex = db.AVAILABILITY_RANK.indexOf('Military');
             if (maxRank < militaryIndex) {
                  return 'Illegal';
             }
        }

        return db.AVAILABILITY_RANK[maxRank];
    });

    const reflexDefense = computed(() => {
        const dexMod = Math.floor(((currentStats.value.dex || 10) - 10) / 2);
        const armor = currentStats.value.armor || 0;
        return 10 + dexMod + armor;
    });
    const maxCargoCapacity = computed(() => {
        const baseStr = chassis.value.logistics.cargo;
        if (!baseStr) return 0;
        const match = baseStr.match(/([\d,]+)\s*(tons|kg)/i);
        if (!match) return 0;
        let val = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2].toLowerCase();
        if (unit === 'kg') val /= 1000;

        let multiplier = 1.0;
        let adder = 0;
        let cargo_bonus = 0;
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats) {
                if (def.stats.cargo_factor) multiplier = def.stats.cargo_factor;
                if (def.stats.cargo_bonus_size_mult) adder += def.stats.cargo_bonus_size_mult;
                if (def.stats.cargo_tons_bonus) cargo_bonus += def.stats.cargo_tons_bonus * (instance.modifications?.quantity || 1);
            }
        });
        return (val * multiplier) + adder + cargo_bonus;

    });

    const currentCargo = computed(() => {
        const used = Math.min(cargoToEpAmount.value, maxCargoCapacity.value);
        let val = maxCargoCapacity.value - used;
        if (val < 0) val = 0;

        if (val > 0 && val < 1) {
             return new Intl.NumberFormat('en-US').format(Math.floor(val * 1000)) + ' kg';
        }
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) + ' tons';
    });

    const stockConfigurationEp = computed(() => {
        if (!chassis.value.defaultMods) return 0;
        return chassis.value.defaultMods.reduce((total, modConfig) => {
             let defId = modConfig;
             let batteryCount = 1;
             let quantity = 1;
             if (typeof modConfig === 'object' && modConfig !== null) {
                 defId = modConfig.id;
                 if (modConfig.batteryCount) batteryCount = modConfig.batteryCount;
                 if (modConfig.quantity) quantity = modConfig.quantity;
             }
             return total + calculateEp({ defId, batteryCount, quantity });
        }, 0);
    });

    const currentCrew = computed(() => {
        let crew = chassis.value.logistics.crew || 0;
        let factor = 1.0;

        installedComponents.value.forEach(instance => {
            if (instance.defId === 'slave_circuits') factor = Math.min(factor, 0.666);
            if (instance.defId === 'slave_circuits_adv' || instance.defId === 'slave_circuits_recall') factor = Math.min(factor, 0.333);
            if (instance.defId === 'comp_ai_automation') factor = Math.min(factor, 0.05);
        });

        crew = Math.ceil(crew * factor);
        if (crew < 1 && (chassis.value.logistics.crew || 0) > 0) crew = 1;
        return crew;
    });

    const currentPassengers = computed(() => {
        let pass = chassis.value.logistics.pass || 0;

        installedComponents.value.forEach(instance => {
            if (instance.defId === 'passenger_conversion') {
                let qty = instance.modifications?.quantity || 1;
                pass += qty;
            }
        });
        return pass;
    });

    const totalBerthingCapacity = computed(() => {
        let total = 0;
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats && def.stats.berthing_capacity) {
                total += def.stats.berthing_capacity * (instance.modifications?.quantity || 1);
            }
        });
        return total;
    });

    const totalPassengerCapacity = computed(() => {
        let total = 0;
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats && def.stats.passenger_capacity) {
                total += def.stats.passenger_capacity * (instance.modifications?.quantity || 1);
            }
        });
        return total;
    });

    const totalLifeSupportCapacity = computed(() => {
        let total = 0;
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats && def.stats.life_support_hull) {
                total += def.stats.life_support_hull * (instance.modifications?.quantity || 1);
            }
        });
        return total;
    });

    const currentConsumables = computed(() => {
        const consStr = chassis.value.logistics.cons || "1 day";

        const parseDays = (str) => {
            let total = 0;
            const years = str.match(/(\d+)\s*years?/);
            const months = str.match(/(\d+)\s*months?/);
            const days = str.match(/(\d+)\s*days?/);

            if (years) total += parseInt(years[1]) * 360;
            if (months) total += parseInt(months[1]) * 30;
            if (days) total += parseInt(days[1]);

            if (total === 0 && str.includes("day") && !days) {
                 const simple = str.match(/(\d+)\s*day/);
                 if (simple) total += parseInt(simple[1]);
            }
            return total || 1;
        };

        let baseDays = parseDays(consStr) * currentCrew.value; // Rulebook: base is what the ship provides for its crew? Wait, if it says "1 month", and crew is 20, that's 600 days.
        
        let bonusStores = 0;
        let hydroponicsReduction = 0;
        let recyclerCapacity = 0;
        let extendedRangeCount = 0;

        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats) {
                if (def.stats.stores_days) bonusStores += def.stats.stores_days * (instance.modifications?.quantity || 1);
                if (def.stats.hydroponics_reduction) hydroponicsReduction += def.stats.hydroponics_reduction * (instance.modifications?.quantity || 1);
                if (def.stats.recycler_capacity) recyclerCapacity += def.stats.recycler_capacity * (instance.modifications?.quantity || 1);
            }
            if (instance.defId === 'extended_range') {
                extendedRangeCount += (instance.modifications?.quantity || 1);
            }
        });

        let totalStores = baseDays + bonusStores;

        const bonusPerInstance = Math.max(Math.floor(baseDays * 0.10), 1);
        totalStores += bonusPerInstance * extendedRangeCount;

        const population = currentCrew.value + currentPassengers.value;
        if (population <= 0) return "Unlimited";

        let dailyConsumption = population - hydroponicsReduction;
        if (dailyConsumption < 0) dailyConsumption = 0;

        if (dailyConsumption > 0 && recyclerCapacity > 0) {
            let recycledPop = Math.min(recyclerCapacity, dailyConsumption);
            let unrecycledPop = dailyConsumption - recycledPop;
            dailyConsumption = (recycledPop * 0.1) + unrecycledPop;
        }
        
        if (dailyConsumption === 0) return "Self-Sustaining";

        const totalDays = Math.floor(totalStores / dailyConsumption);

        const years = Math.floor(totalDays / 360);
        const remYear = totalDays % 360;
        const months = Math.floor(remYear / 30);
        const days = remYear % 30;

        const parts = [];
        if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
        if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);

        if (parts.length === 0) return "0 days";
        return parts.join(' ');
    });

    const totalPopulation = computed(() => currentCrew.value + currentPassengers.value);

    const hasEscapePods = computed(() => {
        if (!chassis.value.size) return false;
        return chassis.value.size.startsWith('Colossal');
    });

    const escapePodsEpGain = computed(() => {
        return Math.floor(escapePodsToEpPct.value / 10);
    });

    const escapePodCapacity = computed(() => {
        let pop = totalPopulation.value;
        if (hasEscapePods.value && escapePodsToEpPct.value > 0) {
            pop = Math.ceil(pop * (100 - escapePodsToEpPct.value) / 100);
        }
        return pop;
    });

    const bonusHull = computed(() => {
        let bonus = chassis.value.bonusHull || 0;
        const cargoBonus = Math.min(cargoToEpAmount.value, maxCargoCapacity.value);
        bonus += cargoBonus;
        if (hasEscapePods.value) {
            bonus += escapePodsEpGain.value;
        }
        return bonus;
    });

    const totalHull = computed(() => {
        return (chassis.value.baseHull || 0) + bonusHull.value;
    });

    const usedHull = computed(() => {
        let used = 0;
        installedComponents.value.forEach(instance => {
            used += getComponentHullPts(instance);
        });
        return round(used);
    });

    const remainingHull = computed(() => {
        return round(totalHull.value - usedHull.value);
    });

    const hullUsagePct = computed(() => {
        if (totalHull.value === 0) return 0;
        return Math.min(100, Math.max(0, (usedHull.value / totalHull.value) * 100));
    });

    const totalPowerGenerated = computed(() => {
        let pow = 0;
        installedComponents.value.forEach(instance => {
            pow += getComponentPower(instance).generated;
        });
        return round(pow);
    });

    const totalPowerConsumed = computed(() => {
        let pow = 0;
        installedComponents.value.forEach(instance => {
            pow += getComponentPower(instance).consumed;
        });
        return round(pow);
    });

    const hullUsageDetails = computed(() => {
        let armor = 0, power = 0, sublight = 0, ftl = 0, weapons = 0, accommodations = 0, miscellaneous = 0;
        let command = 0, computers = 0, sensors = 0;
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (!def) return;
            const pts = getComponentHullPts(instance);
            if (def.category === 'Armor') armor += pts;
            else if (def.category === 'Power') power += pts;
            else if (def.category === 'Sublight') sublight += pts;
            else if (def.category === 'FTL Drives') ftl += pts;
            else if (def.category === 'Weapon Systems') weapons += pts;
            else if (def.category === 'Accommodations') accommodations += pts;
            else if (def.category === 'Miscellaneous') miscellaneous += pts;
            else if (def.category === 'Command & Comms') command += pts;
            else if (def.category === 'Computers') computers += pts;
            else if (def.category === 'Sensors') sensors += pts;
            else miscellaneous += pts; // fallback
        });
        return { armor: round(armor), power: round(power), sublight: round(sublight), ftl: round(ftl), weapons: round(weapons), accommodations: round(accommodations), miscellaneous: round(miscellaneous), command: round(command), computers: round(computers), sensors: round(sensors) };
    });

    const powerUsageDetails = computed(() => {
        let armor = 0, sublight = 0, ftl = 0, weapons = 0, accommodations = 0, miscellaneous = 0;
        let command = 0, computers = 0, sensors = 0;
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (!def) return;
            const pwr = getComponentPower(instance).consumed;
            if (def.category === 'Armor') armor += pwr;
            else if (def.category === 'Sublight') sublight += pwr;
            else if (def.category === 'FTL Drives') ftl += pwr;
            else if (def.category === 'Weapon Systems') weapons += pwr;
            else if (def.category === 'Accommodations') accommodations += pwr;
            else if (def.category === 'Miscellaneous') miscellaneous += pwr;
            else if (def.category === 'Command & Comms') command += pwr;
            else if (def.category === 'Computers') computers += pwr;
            else if (def.category === 'Sensors') sensors += pwr;
            else miscellaneous += pwr; // fallback
        });
        return { armor: round(armor), sublight: round(sublight), ftl: round(ftl), weapons: round(weapons), accommodations: round(accommodations), miscellaneous: round(miscellaneous), command: round(command), computers: round(computers), sensors: round(sensors) };
    });

    const powerUsagePct = computed(() => {
        if (totalPowerGenerated.value === 0) return totalPowerConsumed.value > 0 ? 100 : 0;
        return Math.min(100, Math.max(0, (totalPowerConsumed.value / totalPowerGenerated.value) * 100));
    });

    const hullCost = computed(() => {
        let base = Math.floor(chassis.value.cost * templateCostMult.value);

        // In Template Mode, add cost of "Stock" components to Hull Base
        if (isTemplateEditMode.value) {
            const stockCost = installedComponents.value.reduce((total, instance) => {
                return total + calculateComponentCost(instance, true);
            }, 0);
            base += stockCost;
        }
        return base;
    });
    const componentsCost = computed(() => installedComponents.value.reduce((total, instance) => total + getComponentCost(instance), 0));
    const licensingCost = computed(() => {
        return 0; // Removed per user request
    });
    const totalCost = computed(() => {
        let total = hullCost.value + componentsCost.value;
        return total;
    });

    const componentsByCategory = computed(() => {
        const groups = {};
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (!def) return;
            const cat = def.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(instance);
        });
        return groups;
    });

    // Actions
    function addComponent(defId, location) {
        const def = allEquipment.value.find(e => e.id === defId);
        if (!def) return;
        if (def.exclusiveGroup) {
            const existing = installedComponents.value.find(instance => {
                const mDef = allEquipment.value.find(e => e.id === instance.defId);
                return mDef && mDef.exclusiveGroup === def.exclusiveGroup;
            });
            if (existing) removeComponent(existing.instanceId);
        }
        let minSize = def.minHullPts || 1;
        if (def.category === 'Sublight' || def.category === 'FTL Drives') {
            minSize = Math.max(10, Math.ceil((minSize / (chassis.value.baseHull || 1)) * 100));
            if (def.category === 'FTL Drives' && ['Jump Drive', 'Stardrive', 'Drivewave', 'Psychoportive Drive', 'Transcendent Drive'].includes(def.name)) {
                minSize = 10;
            }
        }
        
        if (['Accommodations', 'Miscellaneous'].includes(def.category)) {
            if (def.stats?.life_support_hull) {
                minSize = Math.max(1, Math.ceil(totalHull.value / def.stats.life_support_hull));
            } else if (def.stats?.berthing_capacity) {
                let currentBerthingCap = totalBerthingCapacity.value;
                let needed = currentCrew.value - currentBerthingCap;
                if (needed > 0) minSize = Math.max(1, Math.ceil(needed / def.stats.berthing_capacity));
            } else if (def.stats?.passenger_capacity) {
                let currentPassCap = totalPassengerCapacity.value;
                let needed = currentPassengers.value - currentPassCap;
                if (needed > 0) minSize = Math.max(1, Math.ceil(needed / def.stats.passenger_capacity));
            }
        }
        const mods = { payloadCount: 0, payloadOption: false, batteryCount: 1, quantity: minSize, fireLinkOption: false };
        if (isWeapon(def.id)) mods.weaponUser = 'Pilot';

        // In Template Mode, new components are Stock
        const isStock = isTemplateEditMode.value;

        installedComponents.value.push({ instanceId: crypto.randomUUID(), defId, location, miniaturization: 0, isStock, modifications: mods });
    }

    // Library Actions
    function getEditableLibrary() {
        if (libraries.value.length === 0) {
            libraries.value.push({ id: crypto.randomUUID(), name: 'User Library', active: true, components: [], ships: [], editable: true });
        }
        // Prefer first editable, or just first one
        let lib = libraries.value.find(l => l.editable);
        if (!lib) {
             // If no editable library exists, force create one or use first one?
             // Let's assume user wants to edit something.
             lib = libraries.value[0];
        }
        return lib;
    }

    function addCustomComponent(component, libraryId) {
        const lib = libraryId ? libraries.value.find(l => l.id === libraryId) : getEditableLibrary();
        if (lib) {
            lib.components.push(component);
        }
    }

    function updateCustomComponent(component) {
        // Find which library has it
        for (const lib of libraries.value) {
            const idx = lib.components.findIndex(c => c.id === component.id);
            if (idx !== -1) {
                lib.components[idx] = component;
                return;
            }
        }
        // If not found, add to editable
        addCustomComponent(component);
    }

    function removeCustomComponent(componentId) {
        for (const lib of libraries.value) {
            const idx = lib.components.findIndex(c => c.id === componentId);
            if (idx !== -1) {
                lib.components.splice(idx, 1);
                // Also remove from installed if present
                installedComponents.value = installedComponents.value.filter(m => m.defId !== componentId);
                return;
            }
        }
    }

    function addCustomShip(ship, libraryId) {
        const lib = libraryId ? libraries.value.find(l => l.id === libraryId) : getEditableLibrary();
        if (lib) {
            lib.ships.push(ship);
        }
    }

    function updateCustomShip(ship) {
        for (const lib of libraries.value) {
            const idx = lib.ships.findIndex(s => s.id === ship.id);
            if (idx !== -1) {
                lib.ships[idx] = ship;
                return;
            }
        }
        addCustomShip(ship);
    }

    function removeCustomShip(shipId) {
        for (const lib of libraries.value) {
            const idx = lib.ships.findIndex(s => s.id === shipId);
            if (idx !== -1) {
                lib.ships.splice(idx, 1);
                return;
            }
        }
    }

    function isCustomComponentInstalled(componentId) {
        return installedComponents.value.some(m => m.defId === componentId);
    }

    function openCustomDialog(componentId = null) {
        customDialogState.componentId = componentId;
        customDialogState.targetLibraryId = getEditableLibrary().id;
        customDialogState.visible = true;
    }

    function openCustomShipDialog(shipId = null) {
        customShipDialogState.shipId = shipId;
        customShipDialogState.targetLibraryId = getEditableLibrary().id;
        customShipDialogState.visible = true;
    }

    // Library Management Actions
    function addLibrary(name = 'New Library') {
        libraries.value.push({
            id: crypto.randomUUID(),
            name: name,
            active: true,
            components: [],
            ships: [],
            editable: true
        });
    }

    function removeLibrary(libId) {
        const idx = libraries.value.findIndex(l => l.id === libId);
        if (idx !== -1) {
            libraries.value.splice(idx, 1);
        }
    }

    function toggleLibrary(libId) {
        const lib = libraries.value.find(l => l.id === libId);
        if (lib) {
            lib.active = !lib.active;
        }
    }

    function moveLibrary(libId, direction) {
        const idx = libraries.value.findIndex(l => l.id === libId);
        if (idx === -1) return;

        if (direction === 'up' && idx > 0) {
            const temp = libraries.value[idx];
            libraries.value[idx] = libraries.value[idx - 1];
            libraries.value[idx - 1] = temp;
        } else if (direction === 'down' && idx < libraries.value.length - 1) {
            const temp = libraries.value[idx];
            libraries.value[idx] = libraries.value[idx + 1];
            libraries.value[idx + 1] = temp;
        }
    }

    function importLibrary(libraryData) {
        // libraryData structure: { name, version, components: [], ships: [] }
        // Ensure structure
        const lib = {
            id: crypto.randomUUID(),
            name: libraryData.name || 'Imported Library',
            active: true,
            components: Array.isArray(libraryData.components) ? libraryData.components : [],
            ships: Array.isArray(libraryData.ships) ? libraryData.ships : [],
            editable: true // Assume imported are editable for now
        };
        libraries.value.push(lib);
    }

    function updateLibrary(libId, newData) {
        const lib = libraries.value.find(l => l.id === libId);
        if (lib) {
            Object.assign(lib, newData);
        }
    }

    function removeComponent(instanceId) { installedComponents.value = installedComponents.value.filter(m => m.instanceId !== instanceId); }

    function duplicateComponent(instanceId) {
        const instance = installedComponents.value.find(m => m.instanceId === instanceId);
        if (!instance) return;
        const copy = {
            instanceId: crypto.randomUUID(),
            defId: instance.defId,
            location: instance.location,
            miniaturization: instance.miniaturization,
            isStock: instance.isStock,
            modifications: JSON.parse(JSON.stringify(instance.modifications))
        };
        installedComponents.value.push(copy);
    }

    function addEquipment(component) {
        // Prevent duplicate IDs
        const idx = db.EQUIPMENT.findIndex(e => e.id === component.id);
        if (idx !== -1) {
            db.EQUIPMENT[idx] = component;
        } else {
            db.EQUIPMENT.push(component);
        }
    }
    function removeEquipment(componentId) {
        db.EQUIPMENT = db.EQUIPMENT.filter(e => e.id !== componentId);
    }
    function updateEquipment(newDef) {
        const idx = db.EQUIPMENT.findIndex(e => e.id === newDef.id);
        if (idx !== -1) {
            db.EQUIPMENT[idx] = newDef;
        }
    }
    function downloadDataJson() {
        const jsonStr = JSON.stringify(db, null, 4);
        const blob = new Blob([jsonStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        a.click();
    }
    function reset() {
        activeTemplate.value = null;
        installedComponents.value = [];
        crewQuality.value = 'Normal';
        meta.name = "";
        cargoToEpAmount.value = 0;
        escapePodsToEpPct.value = 0;
    }
    function createNew(newChassisId) {
        if (!isTemplateEditMode.value) {
            activeShipId.value = crypto.randomUUID();
        }

        reset(); chassisId.value = newChassisId;
        const ship = allShips.value.find(s => s.id === newChassisId) || db.STOCK_SHIPS.find(s => s.id === newChassisId);
        if(ship && ship.defaultMods) ship.defaultMods.forEach(modConfig => {
            let defId = modConfig;

            // Default Mods Object
            const mods = { payloadCount: 0, payloadOption: false, batteryCount: 1, quantity: 1, fireLinkOption: false };

            if (typeof modConfig === 'object' && modConfig !== null) {
                defId = modConfig.id;
                if (modConfig.batteryCount) mods.batteryCount = modConfig.batteryCount;
                if (modConfig.quantity) mods.quantity = modConfig.quantity;
                if (modConfig.mount) mods.mount = modConfig.mount;
                if (modConfig.fireLink) mods.fireLink = modConfig.fireLink;
                if (modConfig.enhancement) mods.enhancement = modConfig.enhancement;
                if (modConfig.payloadCount) mods.payloadCount = modConfig.payloadCount;
                if (modConfig.payloadOption) mods.payloadOption = modConfig.payloadOption;
                if (modConfig.fireLinkOption) mods.fireLinkOption = modConfig.fireLinkOption;
                if (modConfig.pointBlank) mods.pointBlank = modConfig.pointBlank;
                if (modConfig.weaponUser) mods.weaponUser = modConfig.weaponUser;
            } else {
                 defId = modConfig;
            }

            const def = allEquipment.value.find(e => e.id === defId);
            if(def) {
                let loc = def.location || '';
                if (isWeapon(def.id) && !mods.weaponUser) mods.weaponUser = 'Pilot';
                installedComponents.value.push({ instanceId: crypto.randomUUID(), defId: def.id, location: loc, miniaturization: 0, isStock: true, isNonStandard: false, modifications: mods });
            }
        });
    }
    function loadState(state) {
        if(!state) return; meta.name = state.meta.name; chassisId.value = state.configuration.baseChassis;
        if(Array.isArray(state.configuration.templates)) activeTemplate.value = state.configuration.templates[0] || null;
        else activeTemplate.value = state.configuration.template;
        cargoToEpAmount.value = state.configuration.cargoToEpAmount || 0;
        escapePodsToEpPct.value = state.configuration.escapePodsToEpPct || 0;
        crewQuality.value = state.configuration.crewQuality || 'Normal';

        // Migration Logic
        if (state.libraries) {
            libraries.value = state.libraries;
        } else if (state.customComponents && state.customComponents.length > 0) {
            // Migrate old customComponents to a default library
            libraries.value = [{
                id: crypto.randomUUID(),
                name: 'User Library',
                active: true,
                components: state.customComponents,
                ships: [],
                editable: true
            }];
        } else {
            libraries.value = [];
        }

        installedComponents.value = state.manifest.map(m => {
            const mods = m.modifications || { payloadCount: 0, payloadOption: false, batteryCount: 1, quantity: 1, fireLinkOption: false };
            if (!mods.quantity) mods.quantity = 1;
            
            let defId = m.defId;
            let def = allEquipment.value.find(e => e.id === defId);
            
            // Backward compatibility for power plants that lacked the pow_ prefix
            if (!def) {
                const normalizedDefId = defId.replace(/[^a-z0-9]/g, '').toLowerCase();
                def = allEquipment.value.find(e => {
                    const normalizedEId = e.id.replace(/[^a-z0-9]/g, '').toLowerCase();
                    return e.category === 'Power' && normalizedEId.endsWith(normalizedDefId);
                });
                if (def) defId = def.id;
            }

            if (def && isWeapon(def.id) && !mods.weaponUser) mods.weaponUser = 'Pilot';

            // Enforce minimum size requirements for backwards compatibility
            const shipChassis = allShips.value.find(s => s.id === state.chassis) || allShips.value[0];
            const baseHull = shipChassis ? shipChassis.baseHull : 1;
            if (def && (def.category === 'Sublight' || def.category === 'FTL Drives')) {
                const minPct = Math.ceil(((def.minHullPts || 1) / baseHull) * 100);
                if (def.category === 'FTL Drives' && ['Jump Drive', 'Stardrive', 'Drivewave', 'Psychoportive Drive', 'Transcendent Drive'].includes(def.name)) {
                    mods.quantity = 10;
                } else if (mods.quantity < minPct) {
                    mods.quantity = minPct;
                }
            } else if (def && def.minHullPts && mods.quantity < def.minHullPts) {
                mods.quantity = def.minHullPts;
            }

            return { instanceId: m.id, defId: defId, location: m.location, miniaturization: m.miniaturizationRank, isStock: m.isStock || false, modifications: mods };
        });
    }

    // Hangar Actions
    function initHangar() {
        const saved = localStorage.getItem('warships_architect_hangar');
        if (saved) {
            try {
                hangar.value = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load hangar:', e);
                hangar.value = [];
            }
        }
    }

    function saveHangar() {
        localStorage.setItem('warships_architect_hangar', JSON.stringify(hangar.value));
    }

    function syncActiveToHangar() {
        if (!activeShipId.value) return;

        const idx = hangar.value.findIndex(s => s.id === activeShipId.value);
        const snapshot = {
            id: activeShipId.value,
            lastModified: Date.now(),
            apiVersion: "2.0",
            meta: { name: meta.name, model: chassisId.value, version: "1.0", notes: "" },
            configuration: { baseChassis: chassisId.value, template: activeTemplate.value, cargoToEpAmount: cargoToEpAmount.value, escapePodsToEpPct: escapePodsToEpPct.value, crewQuality: crewQuality.value },
            libraries: libraries.value,
            manifest: installedComponents.value.map(m => ({ id: m.instanceId, defId: m.defId, location: m.location, miniaturizationRank: m.miniaturization, isStock: m.isStock, modifications: { ...m.modifications } }))
        };

        if (idx !== -1) {
            hangar.value[idx] = snapshot;
        } else {
            hangar.value.push(snapshot);
        }
        saveHangar();
    }

    function loadFromHangar(shipId) {
        const ship = hangar.value.find(s => s.id === shipId);
        if (ship) {
            loadState(ship);
            activeShipId.value = ship.id;
        }
    }

    function unloadShip() {
        activeShipId.value = null;
        chassisId.value = null;
        reset();
        localStorage.removeItem('warships_architect_current_build');
    }

    function removeFromHangar(shipId) {
        hangar.value = hangar.value.filter(s => s.id !== shipId);
        if (activeShipId.value === shipId) {
            unloadShip();
        } else {
            saveHangar();
        }
    }

    // Template Actions
    function startTemplateEdit(shipId) {
        const ship = allShips.value.find(s => s.id === shipId);
        if (!ship) return;

        // Snapshot Current State
        preEditState.value = {
            activeShipId: activeShipId.value,
            meta: { ...meta },
            chassisId: chassisId.value,
            activeTemplate: activeTemplate.value,
            cargoToEpAmount: cargoToEpAmount.value,
            escapePodsToEpPct: escapePodsToEpPct.value,
            crewQuality: crewQuality.value,
            manifest: installedComponents.value.map(m => ({ ...m, modifications: { ...m.modifications } }))
        };

        activeShipId.value = null;
        isTemplateEditMode.value = true;
        templateEditId.value = shipId;

        createNew(ship.id);

        meta.name = `Template: ${ship.name}`;
    }

    function restorePreEditState() {
        if (!preEditState.value) {
            reset();
            return;
        }
        const s = preEditState.value;
        activeShipId.value = s.activeShipId;
        meta.name = s.meta.name;
        meta.version = s.meta.version;
        chassisId.value = s.chassisId;
        activeTemplate.value = s.activeTemplate;

        cargoToEpAmount.value = s.cargoToEpAmount;
        escapePodsToEpPct.value = s.escapePodsToEpPct;
        crewQuality.value = s.crewQuality;
        installedComponents.value = s.manifest;

        preEditState.value = null;
    }

    function saveTemplateEdit() {
        if (!isTemplateEditMode.value || !templateEditId.value) return;

        // Serialize Components
        const defaultMods = installedComponents.value.map(c => {
             const mods = c.modifications;
             const entry = { id: c.defId };

             if (mods.batteryCount > 1) entry.batteryCount = mods.batteryCount;
             if (mods.quantity > 1) entry.quantity = mods.quantity;
             if (mods.mount && mods.mount !== 'single') entry.mount = mods.mount;
             if (mods.fireLink && mods.fireLink > 1) entry.fireLink = mods.fireLink;
             if (mods.enhancement && mods.enhancement !== 'normal') entry.enhancement = mods.enhancement;
             if (mods.payloadCount > 0) entry.payloadCount = mods.payloadCount;
             if (mods.payloadOption) entry.payloadOption = true;
             if (mods.fireLinkOption) entry.fireLinkOption = true;
             if (mods.pointBlank) entry.pointBlank = true;
             if (mods.weaponUser && mods.weaponUser !== 'Pilot') entry.weaponUser = mods.weaponUser;

             // Check if entry can be simplified to string (only id)
             if (Object.keys(entry).length === 1) return c.defId;
             return entry;
        });

        // Update Library
        for (const lib of libraries.value) {
            const idx = lib.ships.findIndex(s => s.id === templateEditId.value);
            if (idx !== -1) {
                lib.ships[idx].defaultMods = defaultMods;
                break;
            }
        }

        isTemplateEditMode.value = false;
        templateEditId.value = null;

        restorePreEditState();
    }

    function cancelTemplateEdit() {
        isTemplateEditMode.value = false;
        templateEditId.value = null;
        restorePreEditState();
    }

    // Watch libraries instead of customComponents
    watch([meta, chassisId, activeTemplate, installedComponents, cargoToEpAmount, escapePodsToEpPct, libraries, crewQuality], () => {
        const saveObj = {
            apiVersion: "2.0", // Bumped version
            meta: { name: meta.name, model: chassisId.value, version: "1.0", notes: "" },
            configuration: { baseChassis: chassisId.value, template: activeTemplate.value, cargoToEpAmount: cargoToEpAmount.value, escapePodsToEpPct: escapePodsToEpPct.value, crewQuality: crewQuality.value },
            libraries: libraries.value, // Save libraries
            manifest: installedComponents.value.map(m => ({ id: m.instanceId, defId: m.defId, location: m.location, miniaturizationRank: m.miniaturization, isStock: m.isStock, modifications: m.modifications }))
        };
        localStorage.setItem('warships_architect_current_build', JSON.stringify(saveObj));

        // Sync to Hangar
        syncActiveToHangar();
    }, { deep: true });

    const CREW_QUALITY_STATS = {
        'Untrained': { skill: 0, atk: -5, cl: -1 },
        'Normal': { skill: 5, atk: 0, cl: 0 },
        'Skilled': { skill: 6, atk: 2, cl: 1 },
        'Expert': { skill: 8, atk: 5, cl: 2 },
        'Ace': { skill: 12, atk: 10, cl: 4 }
    };

    const crewStats = computed(() => CREW_QUALITY_STATS[crewQuality.value] || CREW_QUALITY_STATS['Normal']);

    function factoryReset() {
        if (confirm("Are you sure you want to clear all local storage? This will delete all your ships and settings.")) {
            localStorage.clear();
            window.location.reload();
        }
    }

    return {
        db, initDb,
        meta, chassisId, activeTemplate, installedComponents, showAddComponentDialog, cargoToEpAmount, escapePodsToEpPct, crewQuality, crewStats, CREW_QUALITY_STATS,
        libraries, allEquipment, allShips, customComponents, // Exported for components.js
        customDialogState, customShipDialogState, showCustomManager,
        hangar, activeShipId, initHangar, loadFromHangar, removeFromHangar, unloadShip, // Hangar Exports
        isTemplateEditMode, startTemplateEdit, saveTemplateEdit, cancelTemplateEdit, // Template Exports
        chassis, template, currentStats, currentCargo, maxCargoCapacity, reflexDefense, bonusHull, totalHull, usedHull, remainingHull, hullUsagePct, hullUsageDetails, totalPowerGenerated, totalPowerConsumed, powerUsagePct, powerUsageDetails, totalCost, hullCost, componentsCost, licensingCost, shipAvailability, hasEscapePods, escapePodsEpGain, currentCrew, currentPassengers, currentConsumables, totalPopulation, escapePodCapacity, totalBerthingCapacity, totalPassengerCapacity, totalLifeSupportCapacity,
        componentsByCategory,
        addComponent, duplicateComponent, addCustomComponent, updateCustomComponent, openCustomDialog, removeComponent, removeCustomComponent, isCustomComponentInstalled, addCustomShip, updateCustomShip, removeCustomShip, openCustomShipDialog, addEquipment, removeEquipment, updateEquipment, downloadDataJson, reset, createNew, loadState, getComponentCost, getComponentHullPts, getComponentPower, getComponentDamage,
        addLibrary, removeLibrary, toggleLibrary, moveLibrary, importLibrary, updateLibrary, damageThreshold, fortitudeDefense,
        isDev, factoryReset, isWeapon, isEngine
    };
});
