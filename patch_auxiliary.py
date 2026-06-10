import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

patch = """
        upgrade_specs = {"quantity": True}
        if "command deck" in name.lower():
            upgrade_specs["auxiliary"] = True

        out["EQUIPMENT"].append({
            "id": f"cmd_{slugify(name)}",
            "name": name,
            "category": "Command & Comms",
            "group": "Command",
            "tech": parse_tech(item.get("Tech")),
            "baseCost": base_cost,
            "costPerHull": cost_per_hull,
            "powerConsumed": pwr,
            "hullCost": hull,
            "baseEp": 0,
            "stats": {},
            "sizeMult": False,
            "upgradeSpecs": upgrade_specs,
            "description": item.get("Notes", "").strip()
        })
"""

content = re.sub(r'\n        out\["EQUIPMENT"\].append\(\{\n            "id": f"cmd_.*?\}\)', patch, content, flags=re.DOTALL)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
