import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

patch_hull = """    const hullUsageDetails = computed(() => {
        let armor = 0, power = 0, sublight = 0, ftl = 0, weapons = 0, accommodations = 0, miscellaneous = 0;
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
            else accommodations += pts; // fallback
        });
        return { armor, power, sublight, ftl, weapons, accommodations, miscellaneous };
    });"""

patch_power = """    const powerUsageDetails = computed(() => {
        let armor = 0, sublight = 0, ftl = 0, weapons = 0, accommodations = 0, miscellaneous = 0;
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
            else accommodations += pwr; // fallback
        });
        return { armor, sublight, ftl, weapons, accommodations, miscellaneous };
    });"""

content = re.sub(r'    const hullUsageDetails = computed\(\(\) => \{.*?    \}\);', patch_hull, content, flags=re.DOTALL)
content = re.sub(r'    const powerUsageDetails = computed\(\(\) => \{.*?    \}\);', patch_power, content, flags=re.DOTALL)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)
