import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

# Add a rounding helper to the top of store.js
if "const round = " not in content:
    content = content.replace("export const useShipStore = defineStore('ship', () => {", "export const useShipStore = defineStore('ship', () => {\n    const round = (num) => Math.round(num * 100) / 100;\n")

# Patch usedHull
content = content.replace("""    const usedHull = computed(() => {
        let used = 0;
        installedComponents.value.forEach(instance => {
            used += getComponentHullPts(instance);
        });
        return used;
    });""", """    const usedHull = computed(() => {
        let used = 0;
        installedComponents.value.forEach(instance => {
            used += getComponentHullPts(instance);
        });
        return round(used);
    });""")

# Patch remainingHull
content = content.replace("""    const remainingHull = computed(() => {
        return totalHull.value - usedHull.value;
    });""", """    const remainingHull = computed(() => {
        return round(totalHull.value - usedHull.value);
    });""")

# Patch totalPowerGenerated
content = content.replace("""    const totalPowerGenerated = computed(() => {
        let pow = 0;
        installedComponents.value.forEach(instance => {
            pow += getComponentPower(instance).generated;
        });
        return pow;
    });""", """    const totalPowerGenerated = computed(() => {
        let pow = 0;
        installedComponents.value.forEach(instance => {
            pow += getComponentPower(instance).generated;
        });
        return round(pow);
    });""")

# Patch totalPowerConsumed
content = content.replace("""    const totalPowerConsumed = computed(() => {
        let pow = 0;
        installedComponents.value.forEach(instance => {
            pow += getComponentPower(instance).consumed;
        });
        return pow;
    });""", """    const totalPowerConsumed = computed(() => {
        let pow = 0;
        installedComponents.value.forEach(instance => {
            pow += getComponentPower(instance).consumed;
        });
        return round(pow);
    });""")

# Patch hullUsageDetails
content = re.sub(r'return \{ armor, power, sublight, ftl, weapons, accommodations, miscellaneous, command, computers, sensors \};\n    \}\);', 
                 r'return { armor: round(armor), power: round(power), sublight: round(sublight), ftl: round(ftl), weapons: round(weapons), accommodations: round(accommodations), miscellaneous: round(miscellaneous), command: round(command), computers: round(computers), sensors: round(sensors) };\n    });', 
                 content)

# Patch powerUsageDetails
content = re.sub(r'return \{ armor, sublight, ftl, weapons, accommodations, miscellaneous, command, computers, sensors \};\n    \}\);', 
                 r'return { armor: round(armor), sublight: round(sublight), ftl: round(ftl), weapons: round(weapons), accommodations: round(accommodations), miscellaneous: round(miscellaneous), command: round(command), computers: round(computers), sensors: round(sensors) };\n    });', 
                 content)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)
