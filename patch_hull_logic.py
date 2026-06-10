import re

with open("public/warships/js/store.js", "r", encoding="utf-8") as f:
    content = f.read()

patch = """            if (def.hullCost.type === 'pct') {
                hullCost = (def.hullCost.base || 0) + (chassis.value.baseHull || 0) * def.hullCost.val;
            } else {"""

content = content.replace("""            if (def.hullCost.type === 'pct') {
                hullCost = (chassis.value.baseHull || 0) * def.hullCost.val;
            } else {""", patch)

with open("public/warships/js/store.js", "w", encoding="utf-8") as f:
    f.write(content)
