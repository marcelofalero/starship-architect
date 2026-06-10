import re

with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

patch = """        const getDescriptionLine = (instance) => {
            const def = store.allEquipment.find(e => e.id === instance.defId);
            if (!def) return '';
            let parts = [];
            
            if (def.stats?.pl) {
                parts.push(def.stats.pl);
            }
"""

content = content.replace("""        const getDescriptionLine = (instance) => {
            const def = store.allEquipment.find(e => e.id === instance.defId);
            if (!def) return '';
            let parts = [];""", patch)

with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
    f.write(content)
