import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

patch = """        if (def.category === 'Sublight' || def.category === 'FTL Drives') {
            minSize = Math.max(10, Math.ceil((minSize / (chassis.value.baseHull || 1)) * 100));
            if (def.category === 'FTL Drives' && ['Jump Drive', 'Stardrive', 'Drivewave', 'Psychoportive Drive', 'Transcendent Drive'].includes(def.name)) {
                minSize = 10;
            }
        }
        
        if (def.category === 'Systems') {
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
        }"""

content = content.replace(
"""        if (def.category === 'Sublight' || def.category === 'FTL Drives') {
            minSize = Math.max(10, Math.ceil((minSize / (chassis.value.baseHull || 1)) * 100));
            if (def.category === 'FTL Drives' && ['Jump Drive', 'Stardrive', 'Drivewave', 'Psychoportive Drive', 'Transcendent Drive'].includes(def.name)) {
                minSize = 10;
            }
        }""",
patch
)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)

