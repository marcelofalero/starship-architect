import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

# For getComponentHullPts:
hull_patch = """        // 4. Auxiliary Command Deck
        if (instance.modifications?.auxiliary) {
            hullCost *= 2;
        }

        if (batteryCount > 1) {"""

content = content.replace("        if (batteryCount > 1) {", hull_patch)

# For calculateComponentCost:
cost_patch = """             // 3. Fire-Link (Multiplier)
             if (fireLink > 1) cost *= fireLink;

             // 4. Auxiliary
             if (instance.modifications?.auxiliary) cost *= 2;

             if (def.upgradeSpecs && def.upgradeSpecs.payload) {"""

content = content.replace("""             // 3. Fire-Link (Multiplier)
             if (fireLink > 1) cost *= fireLink;

             if (def.upgradeSpecs && def.upgradeSpecs.payload) {""", cost_patch)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)
