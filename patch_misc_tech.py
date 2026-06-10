import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

patch = """    # Map Misc Systems -> EQUIPMENT
    for item in raw.get("MISC_SYSTEMS", []):
        name = item["System"].strip()
        if not name: continue
        
        hull_str = str(item["Hull"]).strip().lower()
        hull = {"type": "flat", "val": float(hull_str) if hull_str.replace('.','',1).isdigit() else 1.0}
        
        pwr_str = str(item["Power"]).strip().lower()
        pwr = float(pwr_str) if pwr_str.replace('.','',1).isdigit() else 0.0
        
        cost_str = item["Cost"].strip()
        base_cost = 0
        if "$" in cost_str:
            m = re.search(r'\$?([\d\.]+)\s*(K|M)?', cost_str.replace('100/25 K*','100 K'))
            if m:
                val = float(m.group(1))
                if m.group(2) == "K": val *= 1000
                elif m.group(2) == "M": val *= 1000000
                base_cost = int(val)
                
        stats = {}
        notes = item["Notes"].strip().lower()
        
        if "cargo space" in name.lower() or "cargo bay" in name.lower() or "cargo hold" in name.lower():
            m = re.search(r"per (\d+)m3", notes)
            if m: stats["cargo_tons_bonus"] = int(m.group(1))

        out["EQUIPMENT"].append({
            "id": f"misc_{name.replace(' ', '_').replace(',', '').lower()}",
            "name": name,
            "category": "Miscellaneous",
            "group": "Cargo & Misc",
            "tech": parse_tech(item.get("Tech")),
            "baseCost": base_cost,
            "powerConsumed": pwr,
            "hullCost": hull,
            "baseEp": 0,
            "stats": stats,
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": item["Notes"].strip()
        })
"""

content = re.sub(r'    # Map Misc Systems -> EQUIPMENT.*?out\["EQUIPMENT"\].append\(\{.*?\}\)', patch, content, flags=re.DOTALL)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
