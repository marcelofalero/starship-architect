import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

patch_hull = """    const hullUsageDetails = computed(() => {
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
        return { armor, power, sublight, ftl, weapons, accommodations, miscellaneous, command, computers, sensors };
    });"""

patch_power = """    const powerUsageDetails = computed(() => {
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
        return { armor, sublight, ftl, weapons, accommodations, miscellaneous, command, computers, sensors };
    });"""

content = re.sub(r'    const hullUsageDetails = computed\(\(\) => \{.*?return \{ armor, power, sublight, ftl, weapons, accommodations, miscellaneous \};\n    \}\);', patch_hull, content, flags=re.DOTALL)
content = re.sub(r'    const powerUsageDetails = computed\(\(\) => \{.*?return \{ armor, sublight, ftl, weapons, accommodations, miscellaneous \};\n    \}\);', patch_power, content, flags=re.DOTALL)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)
