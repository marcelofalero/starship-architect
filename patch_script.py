import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

ftl_block = """
    ftl_pl_map = {
        "Jump Drive": "PL 6 - Fusion Age",
        "Wormhole Screen": "PL 6 - Fusion Age",
        "Gate Activator": "PL 6 - Fusion Age",
        "Stardrive": "PL 7 - Gravity Age",
        "Psychoportive Drive": "PL 7 - Gravity Age",
        "Hyperdrive": "PL 8 - Energy Age",
        "Drivewave": "PL 8 - Energy Age",
        "Spacefold Drive": "PL 8 - Energy Age",
        "Transcendent Drive": "PL 9 - Matter Age",
        "Warpdrive": "PL 9 - Matter Age"
    }

    # Map FTL -> EQUIPMENT
    for e in raw.get("FTL_DRIVES", []):
        name = e.get("Engine") or e.get("Engine Type")
        if not name or name.startswith("_Progress"): continue
        out["EQUIPMENT"].append({
            "id": "ftl_" + slugify(name),
            "name": name,
            "category": "FTL Drives",
            "exclusiveGroup": "FTL",
            "group": ftl_pl_map.get(name, "FTL"),
            "tech": parse_tech(e.get("Tech")),
            "baseCost": parse_cost(e.get("Base Cost.") or e.get("Cost")),
            "costPerHull": parse_cost(e.get("Cost/Hull")),
            "powerConsumed": parse_float(e.get("Pow")) if str(e.get("Pow")) != "!" else 0,
            "hullCost": parse_hull_cost(e.get("Hull")),
            "minHullPts": parse_float(e.get("Min Size")) or 1.0,
            "baseEp": 0,
            "sizeMult": False,
            "description": f"Min Size: {e.get('Min Size')} | Pow: {e.get('Pow')}"
        })
"""

# Insert it before the # Map Weapons -> EQUIPMENT comment
content = content.replace('    # Map Weapons -> EQUIPMENT', ftl_block + '\n    # Map Weapons -> EQUIPMENT')

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)

