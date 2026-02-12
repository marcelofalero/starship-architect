const { defineStore } = Pinia;
const { reactive, ref, computed, watch } = Vue;

export const useShipStore = defineStore('ship', () => {
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
    const isAdmin = ref(new URLSearchParams(window.location.search).get('admin') === 'true');
    const meta = reactive({ name: 'Untitled Ship', version: '1.0' });
    const chassisId = ref('light_fighter');
    const activeTemplate = ref(null);
    const installedComponents = ref([]);
    const engineering = reactive({ hasStarshipDesigner: false });
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
        if (!allShips.value.length) return { size: 'Huge', baseEp: 0, cost: 0, stats: {}, logistics: {} }; // Fallback
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

    function calculateEp({ defId, batteryCount = 1, isNonStandard = false, miniaturization = 0, quantity = 1, mount = 'single', fireLink = 1, enhancement = 'normal' } = {}) {
        const def = allEquipment.value.find(e => e.id === defId);
        if (!def) return 0;

        let epCost = def.baseEp;
        // Dynamic EP (Gain)
        if (def.stats && def.stats.ep_dynamic_pct) {
            epCost = Math.floor(chassis.value.baseEp * def.stats.ep_dynamic_pct);
        }

        // 1. Enhancement EP
        if (enhancement === 'enhanced') epCost += 1;
        if (enhancement === 'advanced') epCost += 2;

        // 2. Mount EP
        if (mount === 'quad') epCost += 1;

        // 3. Fire-Link EP Multiplier
        if (fireLink > 1) {
             epCost *= fireLink;
        }

        // Modifications (Battery)
        if (batteryCount > 1) {
            epCost *= batteryCount;
        }

        // Modifications (Quantity)
        if (quantity > 1) {
            epCost *= quantity;
        }

        // Non-Standard Logic
        if (isNonStandard && epCost > 0) {
            epCost *= 2;
        }

        // Miniaturization
        if (epCost > 0) {
            if (miniaturization === 1) epCost = Math.max(1, epCost - 1);
            else if (miniaturization === 2) epCost = Math.ceil(epCost / 2);
        }
        return epCost;
    }

    function getComponentEp(instance) {
        const batteryCount = instance.modifications?.batteryCount || 1;
        const quantity = instance.modifications?.quantity || 1;
        const mount = instance.modifications?.mount || 'single';
        const fireLink = instance.modifications?.fireLink || 1;
        const enhancement = instance.modifications?.enhancement || 'normal';
        return calculateEp({
            defId: instance.defId,
            batteryCount,
            isNonStandard: instance.isNonStandard,
            miniaturization: instance.miniaturization,
            quantity,
            mount,
            fireLink,
            enhancement
        });
    }

    function getComponentDamage(instance) {
        const def = allEquipment.value.find(e => e.id === instance.defId);
        if (!def || !def.damage) return null;

        const match = def.damage.match(/(\d+)d(\d+)(x\d+)?/);
        if (!match) return def.damage;

        let diceCount = parseInt(match[1]);
        const dieType = parseInt(match[2]);
        const multiplier = match[3] || '';

        if (instance.modifications) {
            const mount = instance.modifications.mount || 'single';
            const fireLink = instance.modifications.fireLink || 1;
            const enhancement = instance.modifications.enhancement || 'normal';

            // 1. Enhancement
            if (enhancement === 'enhanced') diceCount += 1;
            if (enhancement === 'advanced') diceCount += 2;

            // 2. Mount
            if (mount === 'twin') diceCount += 1;
            if (mount === 'quad') diceCount += 2;

            // 3. Fire-Link
            if (fireLink === 2) diceCount += 1;
            if (fireLink === 4) diceCount += 2;
        }

        // Global Bonuses (Template)
        if (currentStats.value.weapon_damage_dice) {
            diceCount += currentStats.value.weapon_damage_dice;
        }

        return `${diceCount}d${dieType}${multiplier}`;
    }

    function getComponentCost(instance) {
        const def = allEquipment.value.find(e => e.id === instance.defId);
        if (!def || instance.isStock) return 0;

        let cost = def.baseCost;
        if (def.sizeMult) cost *= sizeMultVal.value;

        // Dynamic Cost (Percentage of Hull)
        if (def.stats && def.stats.cost_dynamic_pct) {
            cost += Math.floor(hullCost.value * def.stats.cost_dynamic_pct);
        }

        // Modifications (Payload, Battery, Fire-link, Quantity)
        if (instance.modifications) {
             const mount = instance.modifications.mount || 'single';
             const fireLink = instance.modifications.fireLink || 1;
             const enhancement = instance.modifications.enhancement || 'normal';

             // 1. Enhancement (Multiplier)
             if (enhancement === 'enhanced') cost *= 2;
             if (enhancement === 'advanced') cost *= 5;

             // 2. Mount (Multiplier)
             let mountMult = 1;
             if (mount === 'twin') mountMult = 3;
             if (mount === 'quad') mountMult = 5;
             cost *= mountMult;

             // 3. Fire-Link (Multiplier)
             if (fireLink > 1) cost *= fireLink;

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
                         // Legacy object { cost: 1000 } or { cost: 1000, sizeMult: true }
                         let val = costDef.cost;
                         if (costDef.sizeMult) val *= sizeMultVal.value;
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
             if (instance.modifications.quantity > 1) {
                 cost *= instance.modifications.quantity;
             }
        }

        if (instance.miniaturization === 1) cost *= 2;
        else if (instance.miniaturization === 2) cost *= 5;

        // Apply Non-Standard Multiplier
        if (instance.isNonStandard) cost *= 5;

        return cost;
    }

    // Computed Properties
    const template = computed(() => activeTemplate.value ? db.TEMPLATES.find(t => t.id === activeTemplate.value) : null);
    const templateCostMult = computed(() => template.value ? template.value.costMult : 1);
    const sizeMultVal = computed(() => db.SIZE_COST_MULTIPLIERS[chassis.value.size] || 1);

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

        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats) {
                if (def.stats.sr !== undefined) modSR = def.stats.sr;
                if (def.stats.hyperdrive !== undefined) {
                        if (bestHyperdrive === null || def.stats.hyperdrive < bestHyperdrive) {
                        bestHyperdrive = def.stats.hyperdrive;
                    }
                }
                if (def.stats.speed !== undefined) s.speed = def.stats.speed;

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

    const DT_SIZE_MODS = {
        'Fine': -10, 'Diminutive': -5, 'Tiny': -2, 'Small': -1, 'Medium': 0,
        'Large': 5, 'Huge': 10, 'Gargantuan': 20, 'Colossal': 50,
        'Colossal (Frigate)': 100, 'Colossal (Cruiser)': 200, 'Colossal (Station)': 500
    };

    const fortitudeDefense = computed(() => {
        const str = currentStats.value.str || 10;
        return 10 + Math.floor((str - 10) / 2);
    });

    const damageThreshold = computed(() => {
        const fort = fortitudeDefense.value;

        const size = chassis.value.size;
        // Handle variations of Colossal if size string starts with Colossal
        let sizeKey = size;
        // Check if size string matches keys in DT_SIZE_MODS
        if (!DT_SIZE_MODS[sizeKey]) {
             // Fallback logic for Colossal variants if exact match fails?
             if (size.startsWith('Colossal')) {
                 if (size.includes('Frigate')) sizeKey = 'Colossal (Frigate)';
                 else if (size.includes('Cruiser')) sizeKey = 'Colossal (Cruiser)';
                 else if (size.includes('Station')) sizeKey = 'Colossal (Station)';
                 else sizeKey = 'Colossal';
             }
        }

        const sizeMod = DT_SIZE_MODS[sizeKey] || 0;
        return fort + sizeMod;
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
        const sizeMod = db.REFLEX_SIZE_MODS[chassis.value.size] || 0;
        return 10 + dexMod + armor + sizeMod;
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
        installedComponents.value.forEach(instance => {
            const def = allEquipment.value.find(e => e.id === instance.defId);
            if (def && def.stats) {
                if (def.stats.cargo_factor) multiplier = def.stats.cargo_factor;
                if (def.stats.cargo_bonus_size_mult) adder += (def.stats.cargo_bonus_size_mult * sizeMultVal.value);
            }
        });
        return (val * multiplier) + adder;
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
                pass += (sizeMultVal.value * qty);
            }
        });
        return pass;
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

        const baseDays = parseDays(consStr);

        let extendedRangeCount = 0;
        installedComponents.value.forEach(instance => {
            if (instance.defId === 'extended_range') {
                extendedRangeCount += (instance.modifications?.quantity || 1);
            }
        });

        const bonusPerInstance = Math.max(Math.floor(baseDays * 0.10), 1);
        const totalBonus = bonusPerInstance * extendedRangeCount;

        const totalDays = baseDays + totalBonus;

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

    const totalEP = computed(() => {
        let ep = chassis.value.baseEp + stockConfigurationEp.value;
        if(template.value) ep += (template.value.epMod || 0);
        const cargoEp = Math.min(cargoToEpAmount.value, maxCargoCapacity.value);
        ep += Math.floor(cargoEp / sizeMultVal.value);
        if (hasEscapePods.value) {
            ep += escapePodsEpGain.value;
        }
        return ep;
    });
    const usedEP = computed(() => installedComponents.value.reduce((total, instance) => total + getComponentEp(instance), 0));
    const remainingEP = computed(() => totalEP.value - usedEP.value);
    const epUsagePct = computed(() => usedEP.value / totalEP.value);

    const hullCost = computed(() => Math.floor(chassis.value.cost * templateCostMult.value));
    const componentsCost = computed(() => installedComponents.value.reduce((total, instance) => total + getComponentCost(instance), 0));
    const licensingCost = computed(() => installedComponents.value.reduce((total, instance) => {
        if (instance.isStock) return total;
        const def = allEquipment.value.find(e => e.id === instance.defId);
        if (!def || !def.availability) return total;
        const feePct = db.LICENSE_FEES[def.availability] || 0;
        return total + (getComponentCost(instance) * feePct);
    }, 0));
    const totalCost = computed(() => hullCost.value + componentsCost.value + licensingCost.value);

    // Actions
    function addComponent(defId, location, isNonStandard = false) {
        const def = allEquipment.value.find(e => e.id === defId);
        if (!def) return;
        if (def.exclusiveGroup) {
            const existing = installedComponents.value.find(instance => {
                const mDef = allEquipment.value.find(e => e.id === instance.defId);
                return mDef && mDef.exclusiveGroup === def.exclusiveGroup;
            });
            if (existing) removeComponent(existing.instanceId);
        }
        const mods = { payloadCount: 0, payloadOption: false, batteryCount: 1, quantity: 1, fireLinkOption: false };
        if (isWeapon(def.id)) mods.weaponUser = 'Pilot';
        installedComponents.value.push({ instanceId: crypto.randomUUID(), defId, location, miniaturization: 0, isStock: false, isNonStandard, modifications: mods });
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
        engineering.hasStarshipDesigner = false;
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
        engineering.hasStarshipDesigner = state.configuration.feats.starshipDesigner;
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
            const def = allEquipment.value.find(e => e.id === m.defId);
            if (def && isWeapon(def.id) && !mods.weaponUser) mods.weaponUser = 'Pilot';
            return { instanceId: m.id, defId: m.defId, location: m.location, miniaturization: m.miniaturizationRank, isStock: m.isStock || false, isNonStandard: m.isNonStandard || false, modifications: mods };
        });
    }

    // Hangar Actions
    function initHangar() {
        const saved = localStorage.getItem('swse_architect_hangar');
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
        localStorage.setItem('swse_architect_hangar', JSON.stringify(hangar.value));
    }

    function syncActiveToHangar() {
        if (!activeShipId.value) return;

        const idx = hangar.value.findIndex(s => s.id === activeShipId.value);
        const snapshot = {
            id: activeShipId.value,
            lastModified: Date.now(),
            apiVersion: "2.0",
            meta: { name: meta.name, model: chassisId.value, version: "1.0", notes: "" },
            configuration: { baseChassis: chassisId.value, template: activeTemplate.value, feats: { starshipDesigner: engineering.hasStarshipDesigner }, cargoToEpAmount: cargoToEpAmount.value, escapePodsToEpPct: escapePodsToEpPct.value, crewQuality: crewQuality.value },
            libraries: libraries.value,
            manifest: installedComponents.value.map(m => ({ id: m.instanceId, defId: m.defId, location: m.location, miniaturizationRank: m.miniaturization, isStock: m.isStock, isNonStandard: m.isNonStandard, modifications: { ...m.modifications } }))
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

    function removeFromHangar(shipId) {
        hangar.value = hangar.value.filter(s => s.id !== shipId);
        if (activeShipId.value === shipId) {
            activeShipId.value = null;
        }
        saveHangar();
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
            engineering: { ...engineering },
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
        engineering.hasStarshipDesigner = s.engineering.hasStarshipDesigner;
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
    watch([meta, chassisId, activeTemplate, installedComponents, engineering, cargoToEpAmount, escapePodsToEpPct, libraries, crewQuality], () => {
        const saveObj = {
            apiVersion: "2.0", // Bumped version
            meta: { name: meta.name, model: chassisId.value, version: "1.0", notes: "" },
            configuration: { baseChassis: chassisId.value, template: activeTemplate.value, feats: { starshipDesigner: engineering.hasStarshipDesigner }, cargoToEpAmount: cargoToEpAmount.value, escapePodsToEpPct: escapePodsToEpPct.value, crewQuality: crewQuality.value },
            libraries: libraries.value, // Save libraries
            manifest: installedComponents.value.map(m => ({ id: m.instanceId, defId: m.defId, location: m.location, miniaturizationRank: m.miniaturization, isStock: m.isStock, isNonStandard: m.isNonStandard, modifications: m.modifications }))
        };
        localStorage.setItem('swse_architect_current_build', JSON.stringify(saveObj));

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

    return {
        db, initDb,
        meta, chassisId, activeTemplate, installedComponents, engineering, showAddComponentDialog, cargoToEpAmount, escapePodsToEpPct, crewQuality, crewStats, CREW_QUALITY_STATS,
        libraries, allEquipment, allShips, customComponents, // Exported for components.js
        customDialogState, customShipDialogState, showCustomManager,
        hangar, activeShipId, initHangar, loadFromHangar, removeFromHangar, // Hangar Exports
        isTemplateEditMode, startTemplateEdit, saveTemplateEdit, cancelTemplateEdit, // Template Exports
        chassis, template, currentStats, currentCargo, maxCargoCapacity, reflexDefense, totalEP, usedEP, remainingEP, epUsagePct, totalCost, hullCost, componentsCost, licensingCost, shipAvailability, sizeMultVal, hasEscapePods, escapePodsEpGain, currentCrew, currentPassengers, currentConsumables, totalPopulation, escapePodCapacity,
        addComponent, addCustomComponent, updateCustomComponent, openCustomDialog, removeComponent, removeCustomComponent, isCustomComponentInstalled, addCustomShip, updateCustomShip, removeCustomShip, openCustomShipDialog, addEquipment, removeEquipment, updateEquipment, downloadDataJson, reset, createNew, loadState, getComponentCost, getComponentEp, getComponentDamage,
        addLibrary, removeLibrary, toggleLibrary, moveLibrary, importLibrary, updateLibrary, damageThreshold, fortitudeDefense, DT_SIZE_MODS,
        isAdmin, isWeapon, isEngine
    };
});
