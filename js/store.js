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
    const installedMods = ref([]);
    const engineering = reactive({ hasStarshipDesigner: false });
    const showAddModDialog = ref(false);

    // Initialize DB Action
    function initDb(data) {
        Object.assign(db, data);
    }

    // Helper functions
    function getModEp(mod) {
        const def = db.EQUIPMENT.find(e => e.id === mod.defId);
        if (!def || mod.isStock) return 0;

        let epCost = def.baseEp;
        // Dynamic EP (Gain)
        if (def.stats && def.stats.ep_dynamic_pct) {
            epCost = Math.floor(chassis.value.baseEp * def.stats.ep_dynamic_pct);
        }

        // Modifications (Battery)
        if (mod.modifications) {
            if (mod.modifications.batteryCount > 1) {
                epCost *= mod.modifications.batteryCount;
            }
        }

        // Non-Standard Logic (New)
        if (mod.isNonStandard && epCost > 0) {
            epCost *= 2;
        }

        // Miniaturization
        if (epCost > 0) {
            if (mod.miniaturization === 1) epCost = Math.max(1, epCost - 1);
            else if (mod.miniaturization === 2) epCost = Math.ceil(epCost / 2);
        }
        return epCost;
    }

    function getModCost(mod) {
        const def = db.EQUIPMENT.find(e => e.id === mod.defId);
        if (!def || mod.isStock) return 0;

        let cost = def.baseCost;
        if (def.sizeMult) cost *= sizeMultVal.value;

        // Modifications (Payload, Battery)
        if (mod.modifications) {
             if (def.upgradeSpecs && def.upgradeSpecs.payload) {
                 if (def.upgradeSpecs.payload.type === 'capacity' && mod.modifications.payloadCount > 0) {
                     cost += mod.modifications.payloadCount * (def.baseCost * def.upgradeSpecs.payload.costFactor);
                 } else if (mod.modifications.payloadOption && def.upgradeSpecs.payload.type === 'toggle') {
                     cost += def.upgradeSpecs.payload.cost;
                 }
             }
             if (mod.modifications.batteryCount > 1) {
                 cost *= mod.modifications.batteryCount;
             }
        }

        if (mod.miniaturization === 1) cost *= 2;
        else if (mod.miniaturization === 2) cost *= 5;

        // Apply Non-Standard Multiplier
        if (mod.isNonStandard) cost *= 5;

        return cost;
    }

    // Computed Properties
    const chassis = computed(() => {
        if (!db.STOCK_SHIPS.length) return { size: 'Huge', baseEp: 0, cost: 0, stats: {}, logistics: {} }; // Fallback
        return db.STOCK_SHIPS.find(s => s.id === chassisId.value) || db.STOCK_SHIPS[0];
    });

    const template = computed(() => activeTemplate.value ? db.TEMPLATES.find(t => t.id === activeTemplate.value) : null);
    const templateCostMult = computed(() => template.value ? template.value.costMult : 1);
    const sizeMultVal = computed(() => db.SIZE_COST_MULTIPLIERS[chassis.value.size] || 1);

    const currentStats = computed(() => {
        const s = { ...chassis.value.stats, speed: 0 };
        if (template.value && template.value.stats) {
            for (const [key, val] of Object.entries(template.value.stats)) if (s[key] !== undefined) s[key] += val;
        }
        let modSR = null, bestHyperdrive = null;
        let bonusSR = 0, bonusArmor = 0, bonusHP = 0;
        let bonusDex = 0, bonusStr = 0, bonusPer = 0, speedFactor = 0, hyperdriveShift = 0;
        let hpBonusPct = 0;

        installedMods.value.forEach(mod => {
            const def = db.EQUIPMENT.find(e => e.id === mod.defId);
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
                if (def.stats.str_bonus) bonusStr += def.stats.str_bonus;
                if (def.stats.perception_bonus) bonusPer += def.stats.perception_bonus;
                if (def.stats.speed_factor) speedFactor += def.stats.speed_factor;
                if (def.stats.hyperdrive_bonus) hyperdriveShift += def.stats.hyperdrive_bonus;
                if (def.stats.hp_dynamic_str) bonusHP += Math.floor(Math.floor((s.str || 0) / 2) / 10) * 10;
                if (def.stats.hp_bonus_pct) hpBonusPct += def.stats.hp_bonus_pct;
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

        if (hpBonusPct > 0) s.hp += Math.floor(s.hp * hpBonusPct);
        if (s.speed > 0 && speedFactor > 0) s.speed += Math.max(1, Math.floor(s.speed * speedFactor));
        if (s.hyperdrive) s.hyperdrive += hyperdriveShift;
        return s;
    });

    const shipAvailability = computed(() => {
        let maxRank = 0;
        installedMods.value.forEach(mod => {
            const def = db.EQUIPMENT.find(e => e.id === mod.defId);
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
    const currentCargo = computed(() => {
        const baseStr = chassis.value.logistics.cargo;
        if (!baseStr) return '0 kg';
        const match = baseStr.match(/([\d,]+)\s*(tons|kg)/i);
        if (!match) return baseStr;
        let val = parseFloat(match[1].replace(/,/g, ''));
        const unit = match[2];
        let multiplier = 1.0;
        installedMods.value.forEach(mod => {
            const def = db.EQUIPMENT.find(e => e.id === mod.defId);
            if (def && def.stats && def.stats.cargo_factor) multiplier = def.stats.cargo_factor;
        });
        val = val * multiplier;
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) + ' ' + unit;
    });
    const totalEP = computed(() => {
        let ep = chassis.value.baseEp;
        if(template.value) ep += (template.value.epMod || 0);
        return ep;
    });
    const usedEP = computed(() => installedMods.value.reduce((total, mod) => total + getModEp(mod), 0));
    const remainingEP = computed(() => totalEP.value - usedEP.value);
    const epUsagePct = computed(() => usedEP.value / totalEP.value);

    const hullCost = computed(() => Math.floor(chassis.value.cost * templateCostMult.value));
    const modsCost = computed(() => installedMods.value.reduce((total, mod) => total + getModCost(mod), 0));
    const licensingCost = computed(() => installedMods.value.reduce((total, mod) => {
        if (mod.isStock) return total;
        const def = db.EQUIPMENT.find(e => e.id === mod.defId);
        if (!def || !def.availability) return total;
        const feePct = db.LICENSE_FEES[def.availability] || 0;
        return total + (getModCost(mod) * feePct);
    }, 0));
    const totalCost = computed(() => hullCost.value + modsCost.value + licensingCost.value);

    // Actions
    function addMod(defId, location, isNonStandard = false) {
        const def = db.EQUIPMENT.find(e => e.id === defId);
        if (!def) return;
        if (def.exclusiveGroup) {
            const existing = installedMods.value.find(m => {
                const mDef = db.EQUIPMENT.find(e => e.id === m.defId);
                return mDef && mDef.exclusiveGroup === def.exclusiveGroup;
            });
            if (existing) removeMod(existing.instanceId);
        }
        installedMods.value.push({ instanceId: crypto.randomUUID(), defId, location, miniaturization: 0, isStock: false, isNonStandard, modifications: { payloadCount: 0, payloadOption: false, batteryCount: 1 } });
    }
    function removeMod(instanceId) { installedMods.value = installedMods.value.filter(m => m.instanceId !== instanceId); }
    function reset() { activeTemplate.value = null; installedMods.value = []; engineering.hasStarshipDesigner = false; meta.name = ""; }
    function createNew(newChassisId) {
        reset(); chassisId.value = newChassisId;
        const ship = db.STOCK_SHIPS.find(s => s.id === newChassisId);
        if(ship && ship.defaultMods) ship.defaultMods.forEach(defId => {
            const def = db.EQUIPMENT.find(e => e.id === defId);
            let loc = 'Installed'; if(def && def.type === 'engine') loc = 'Aft Section';
            if(def) installedMods.value.push({ instanceId: crypto.randomUUID(), defId: def.id, location: loc, miniaturization: 0, isStock: true, isNonStandard: false, modifications: { payloadCount: 0, payloadOption: false, batteryCount: 1 } });
        });
    }
    function loadState(state) {
        if(!state) return; meta.name = state.meta.name; chassisId.value = state.configuration.baseChassis;
        if(Array.isArray(state.configuration.templates)) activeTemplate.value = state.configuration.templates[0] || null;
        else activeTemplate.value = state.configuration.template;
        engineering.hasStarshipDesigner = state.configuration.feats.starshipDesigner;
        installedMods.value = state.manifest.map(m => ({ instanceId: m.id, defId: m.defId, location: m.location, miniaturization: m.miniaturizationRank, isStock: m.isStock || false, isNonStandard: m.isNonStandard || false, modifications: m.modifications || { payloadCount: 0, payloadOption: false, batteryCount: 1 } }));
    }
    watch([meta, chassisId, activeTemplate, installedMods, engineering], () => {
        const saveObj = {
            apiVersion: "1.9",
            meta: { name: meta.name, model: chassisId.value, version: "1.0", notes: "" },
            configuration: { baseChassis: chassisId.value, template: activeTemplate.value, feats: { starshipDesigner: engineering.hasStarshipDesigner } },
            manifest: installedMods.value.map(m => ({ id: m.instanceId, defId: m.defId, location: m.location, miniaturizationRank: m.miniaturization, isStock: m.isStock, isNonStandard: m.isNonStandard, modifications: m.modifications }))
        };
        localStorage.setItem('swse_architect_current_build', JSON.stringify(saveObj));
    }, { deep: true });

    return {
        db, initDb,
        meta, chassisId, activeTemplate, installedMods, engineering, showAddModDialog,
        chassis, template, currentStats, currentCargo, reflexDefense, totalEP, usedEP, remainingEP, epUsagePct, totalCost, hullCost, modsCost, licensingCost, shipAvailability, sizeMultVal,
        addMod, removeMod, reset, createNew, loadState, getModCost, getModEp
    };
});
