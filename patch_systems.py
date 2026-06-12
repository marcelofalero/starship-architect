import json

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

systems_map_code = """
    # Map Support Systems -> EQUIPMENT
    for s in raw.get("SUPPORT_SYSTEMS", []):
        name = s.get("System")
        if not name or name.startswith("_Progress"): continue
        
        stats = {}
        notes = str(s.get("Notes", "")).lower()
        
        if "berthing for" in notes:
            import re
            m = re.search(r"berthing for (\d+)", notes)
            if m: stats["berthing_capacity"] = int(m.group(1))
            if "standard" in name.lower():
                stats["stores_days"] = 500
        elif "life support for" in notes:
            import re
            m = re.search(r"life support for (\d+)", notes)
            if m: stats["life_support_hull"] = int(m.group(1))
            if "recycling for" in notes:
                m2 = re.search(r"recycling for (\d+)", notes)
                if m2: stats["recycler_capacity"] = int(m2.group(1))
        elif "short-term seating for" in notes:
            import re
            m = re.search(r"seating for (\d+)", notes)
            if m: stats["passenger_capacity"] = int(m.group(1))
        elif "staterooms for" in notes:
            import re
            m = re.search(r"staterooms for (\d+)", notes)
            if m: stats["berthing_capacity"] = int(m.group(1)) # Treat stateroom as berthing
        elif "reduces consumption to 10% normal for" in notes:
            import re
            m = re.search(r"for (\d+)", notes)
            if m: stats["recycler_capacity"] = int(m.group(1))
        elif "increases stores by" in notes:
            import re
            m = re.search(r"increases stores by ([\d,]+)", notes)
            if m: stats["stores_days"] = int(m.group(1).replace(',', ''))
        elif "hydroponics bay" in name.lower():
            stats["hydroponics_reduction"] = 20
        elif "galley" in name.lower() or "medical bay" in name.lower():
            import re
            m = re.search(r"(?:capacity of|feeds) (\d+)", notes)
            if m: stats["facility_capacity"] = int(m.group(1))
            
        out["EQUIPMENT"].append({
            "id": "sys_" + slugify(name),
            "name": name,
            "category": "Systems",
            "tech": parse_tech(s.get("Tech")),
            "baseCost": parse_cost(s.get("Cost")),
            "powerConsumed": parse_float(s.get("Power")),
            "hullCost": parse_hull_cost(s.get("Hull")),
            "baseEp": 0,
            "stats": stats,
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": s.get("Notes", "")
        })

    # Map Weapons -> EQUIPMENT
"""

content = content.replace("    # Map Weapons -> EQUIPMENT", systems_map_code)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)

