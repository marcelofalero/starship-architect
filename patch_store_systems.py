import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

new_computed = """    const totalBerthingCapacity = computed(() => {
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
    });"""

# Find currentConsumables block
start = content.find("    const currentConsumables = computed(() => {")
end = content.find("    const totalPopulation = computed(() => currentCrew.value + currentPassengers.value);")

new_content = content[:start] + new_computed + "\n\n" + content[end:]
with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(new_content)
