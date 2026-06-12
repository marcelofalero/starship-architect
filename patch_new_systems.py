import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

patch = """
    # Map Command & Comms -> EQUIPMENT
    for item in raw.get("COMMAND_SYSTEMS", []):
        name = item["System"].strip()
        if not name: continue
        
        hull_cost_str = str(item.get("Hull", "1"))
        if "+" in hull_cost_str:
            hull = {"type": "pct", "base": 2, "val": 0.01} # Command Deck is +1 per 100 hull points (1%)
        else:
            hull = {"type": "flat", "val": parse_float(hull_cost_str) or 1.0}
            
        pwr = parse_float(item.get("Power"))
        
        cost_str = str(item.get("Cost", "0"))
        base_cost = parse_cost(cost_str)
        cost_per_hull = 0
        if "/hull" in cost_str.lower():
            cost_per_hull = base_cost
            base_cost = 0

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
            "upgradeSpecs": {"quantity": True},
            "description": item.get("Notes", "").strip()
        })
"""

content = re.sub(r'\n    # Map Command & Comms -> EQUIPMENT.*?# Map Computers -> EQUIPMENT', patch + '\n    # Map Computers -> EQUIPMENT', content, flags=re.DOTALL)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
