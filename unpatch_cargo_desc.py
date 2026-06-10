with open("public/warships/js/components.js", "r", encoding="utf-8") as f:
    content = f.read()

patch = """                else if (def.stats?.cargo_tons_bonus) parts.push(`Cargo: +${def.stats.cargo_tons_bonus * qty} tons`);
            }"""

content = content.replace(patch, "            }")

with open("public/warships/js/components.js", "w", encoding="utf-8") as f:
    f.write(content)
