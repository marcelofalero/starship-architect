import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

patch = """        let adder = 0;
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
"""

content = re.sub(r'        let adder = 0;.*?return \(val \* multiplier\) \+ adder;', patch, content, flags=re.DOTALL)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)
