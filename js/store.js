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
    const meta = reactive({ name: 'Untitled Ship', version: '1.0' });
    const chassisId = ref('light_fighter');
    const activeTemplate = ref(null);
    const installedComponents = ref([]);
    const engineering = reactive({ hasStarshipDesigner: false });
    const showAddComponentDialog = ref(false);
    const cargoToEpAmount = ref(0);
    const customComponents = ref([]);
    const customDialogState = reactive({ visible: false, componentId: null });
    const showCustomManager = ref(false);

    // Initialize DB Action
    function initDb(data) {
        Object.assign(db, data);
    }

    const allEquipment = computed(() => {
        return [...db.EQUIPMENT, ...customComponents.value];
    });

    // Helper functions
    const chassis = computed(() => {
        if (!db.STOCK_SHIPS.length) return { size: 'Huge', baseEp: 0, cost: 0, stats: {}, logistics: {} }; // Fallback
        return db.STOCK_SHIPS.find(s => s.id === chassisId.value) || db.STOCK_SHIPS[0];
    });

    function calculateEp(defId, batteryCount = 1, isNonStandard = false, miniaturization = 0, quantity = 1, mount = 'single', fireLink = 1, enhancement = 'normal') {
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

    function getComponentEp(component) {
        const batteryCount = component.modifications?.batteryCount || 1;
        const quantity = component.modifications?.quantity || 1;
        const mount = component.modifications?.mount || 'single';
        const fireLink = component.modifications?.fireLink || 1;
        const enhancement = component.modifications?.enhancement || 'normal';
        return calculateEp(component.defId, batteryCount, component.isNonStandard, component.miniaturization, quantity, mount, fireLink, enhancement);
    }

    function getComponentCost(component) {
        const def = allEquipment.value.find(e => e.id === component.defId);
        if (!def || component.isStock) return 0;

        let cost = def.baseCost;
        if (def.sizeMult) cost *= sizeMultVal.value;

        // Dynamic Cost (Percentage of Hull)
        if (def.stats && def.stats.cost_dynamic_pct) {
            cost += Math.floor(hullCost.value * def.stats.cost_dynamic_pct);
        }

        // Modifications (Payload, Battery, Fire-link, Quantity)
        if (component.modifications) {
             const mount = component.modifications.mount || 'single';
             const fireLink = component.modifications.fireLink || 1;
             const enhancement = component.modifications.enhancement || 'normal';

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
                 if (def.upgradeSpecs.payload.type === 'capacity' && component.modifications.payloadCount > 0) {
                     cost += component.modifications.payloadCount * (def.baseCost * def.upgradeSpecs.payload.costFactor);
                 } else if (component.modifications.payloadOption && def.upgradeSpecs.payload.type === 'toggle') {
                     cost += def.upgradeSpecs.payload.cost;
                 }
             }
             // Selective Fire cost (distinct from Fire-Link multipliers)
             if (def.upgradeSpecs && def.upgradeSpecs.fireLinkOption && component.modifications.fireLinkOption) {
                 cost += (def.upgradeSpecs.fireLinkOption.cost || 0);
             }
             if (component.modifications.batteryCount > 1) {
                 cost *= component.modifications.batteryCount;
             }
             if (component.modifications.quantity > 1) {
                 cost *= component.modifications.quantity;
             }
        }

        if (component.miniaturization === 1) cost *= 2;
        else if (component.miniaturization === 2) cost *= 5;

        // Apply Non-Standard Multiplier
        if (component.isNonStandard) cost *= 5;

        return cost;
    }

    // Computed Properties
    const template = computed(() => activeTemplate.value ? db.TEMPLATES.find(t => t.id === activeTemplate.value) : null);
    const templateCostMult = computed(() => template.value ? template.value.costMult : 1);
    const sizeMultVal = computed(() => db.SIZE_COST_MULTIPLIERS[chassis.value.size] || 1);

    const currentStats = computed(() => {
        const s = { ...chassis.value.stats, speed: 0 };
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

        installedComponents.value.forEach(mod => {
            const def = allEquipment.value.find(e => e.id === mod.defId);
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

    const shipAvailability = computed(() => {
        let maxRank = 0;
        installedComponents.value.forEach(mod => {
            const def = allEquipment.value.find(e => e.id === mod.defId);
            if (def && def.availability) {
                const rank = db.AVAILABILITY_RANK.indexOf(def.availability);
                if (rank > maxRank) maxRank = rank;
            }
        });
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
        installedComponents.value.forEach(mod => {
            const def = allEquipment.value.find(e => e.id === mod.defId);
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
             return total + calculateEp(defId, batteryCount, false, 0, quantity);
        }, 0);
    });

    const totalEP = computed(() => {
        let ep = chassis.value.baseEp + stockConfigurationEp.value;
        if(template.value) ep += (template.value.epMod || 0);
        const cargoEp = Math.min(cargoToEpAmount.value, maxCargoCapacity.value);
        ep += Math.floor(cargoEp / sizeMultVal.value);
        return ep;
    });
    const usedEP = computed(() => installedComponents.value.reduce((total, mod) => total + getComponentEp(mod), 0));
    const remainingEP = computed(() => totalEP.value - usedEP.value);
    const epUsagePct = computed(() => usedEP.value / totalEP.value);

    const hullCost = computed(() => Math.floor(chassis.value.cost * templateCostMult.value));
    const componentsCost = computed(() => installedComponents.value.reduce((total, mod) => total + getComponentCost(mod), 0));
    const licensingCost = computed(() => installedComponents.value.reduce((total, mod) => {
        if (mod.isStock) return total;
        const def = allEquipment.value.find(e => e.id === mod.defId);
        if (!def || !def.availability) return total;
        const feePct = db.LICENSE_FEES[def.availability] || 0;
        return total + (getComponentCost(mod) * feePct);
    }, 0));
    const totalCost = computed(() => hullCost.value + componentsCost.value + licensingCost.value);

    // Actions
    function addComponent(defId, location, isNonStandard = false) {
        const def = allEquipment.value.find(e => e.id === defId);
        if (!def) return;
        if (def.exclusiveGroup) {
            const existing = installedComponents.value.find(m => {
                const mDef = allEquipment.value.find(e => e.id === m.defId);
                return mDef && mDef.exclusiveGroup === def.exclusiveGroup;
            });
            if (existing) removeComponent(existing.instanceId);
        }
        const mods = { payloadCount: 0, payloadOption: false, batteryCount: 1, quantity: 1, fireLinkOption: false };
        if (def.type === 'weapon') mods.weaponUser = 'Pilot';
        installedComponents.value.push({ instanceId: crypto.randomUUID(), defId, location, miniaturization: 0, isStock: false, isNonStandard, modifications: mods });
    }
    function addCustomComponent(component) {
        customComponents.value.push(component);
    }
    function updateCustomComponent(component) {
        const idx = customComponents.value.findIndex(c => c.id === component.id);
        if (idx !== -1) {
            customComponents.value[idx] = component;
        }
    }
    function openCustomDialog(componentId = null) {
        customDialogState.componentId = componentId;
        customDialogState.visible = true;
    }
    function removeComponent(instanceId) { installedComponents.value = installedComponents.value.filter(m => m.instanceId !== instanceId); }
    function removeCustomComponent(componentId) {
        customComponents.value = customComponents.value.filter(c => c.id !== componentId);
        installedComponents.value = installedComponents.value.filter(m => m.defId !== componentId);
    }
    function isCustomComponentInstalled(componentId) {
        return installedComponents.value.some(m => m.defId === componentId);
    }
    function reset() { activeTemplate.value = null; installedComponents.value = []; engineering.hasStarshipDesigner = false; meta.name = ""; cargoToEpAmount.value = 0; }
    function createNew(newChassisId) {
        reset(); chassisId.value = newChassisId;
        const ship = db.STOCK_SHIPS.find(s => s.id === newChassisId);
        if(ship && ship.defaultMods) ship.defaultMods.forEach(modConfig => {
            let defId = modConfig;
            let batteryCount = 1;
            let quantity = 1;

            if (typeof modConfig === 'object' && modConfig !== null) {
                defId = modConfig.id;
                if (modConfig.batteryCount) batteryCount = modConfig.batteryCount;
                if (modConfig.quantity) quantity = modConfig.quantity;
            }

            const def = allEquipment.value.find(e => e.id === defId);
            let loc = 'Installed'; if(def && def.type === 'engine') loc = 'Aft Section';
            if(def) {
                const mods = { payloadCount: 0, payloadOption: false, batteryCount: batteryCount, quantity: quantity, fireLinkOption: false };
                if (def.type === 'weapon') mods.weaponUser = 'Pilot';
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
        if (state.customComponents) customComponents.value = state.customComponents;
        else customComponents.value = [];
        installedComponents.value = state.manifest.map(m => {
            const mods = m.modifications || { payloadCount: 0, payloadOption: false, batteryCount: 1, quantity: 1, fireLinkOption: false };
            if (!mods.quantity) mods.quantity = 1;
            const def = allEquipment.value.find(e => e.id === m.defId);
            if (def && def.type === 'weapon' && !mods.weaponUser) mods.weaponUser = 'Pilot';
            return { instanceId: m.id, defId: m.defId, location: m.location, miniaturization: m.miniaturizationRank, isStock: m.isStock || false, isNonStandard: m.isNonStandard || false, modifications: mods };
        });
    }
    watch([meta, chassisId, activeTemplate, installedComponents, engineering, cargoToEpAmount, customComponents], () => {
        const saveObj = {
            apiVersion: "1.9",
            meta: { name: meta.name, model: chassisId.value, version: "1.0", notes: "" },
            configuration: { baseChassis: chassisId.value, template: activeTemplate.value, feats: { starshipDesigner: engineering.hasStarshipDesigner }, cargoToEpAmount: cargoToEpAmount.value },
            customComponents: customComponents.value,
            manifest: installedComponents.value.map(m => ({ id: m.instanceId, defId: m.defId, location: m.location, miniaturizationRank: m.miniaturization, isStock: m.isStock, isNonStandard: m.isNonStandard, modifications: m.modifications }))
        };
        localStorage.setItem('swse_architect_current_build', JSON.stringify(saveObj));
    }, { deep: true });

    return {
        db, initDb,
        meta, chassisId, activeTemplate, installedComponents, engineering, showAddComponentDialog, cargoToEpAmount, customComponents, allEquipment, customDialogState, showCustomManager,
        chassis, template, currentStats, currentCargo, maxCargoCapacity, reflexDefense, totalEP, usedEP, remainingEP, epUsagePct, totalCost, hullCost, componentsCost, licensingCost, shipAvailability, sizeMultVal,
        addComponent, addCustomComponent, updateCustomComponent, openCustomDialog, removeComponent, removeCustomComponent, isCustomComponentInstalled, reset, createNew, loadState, getComponentCost, getComponentEp
    };
});
