import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

# We need to extract the existing SUPPORT_SYSTEMS block and replace it.
start_idx = content.find('for item in data.get("SUPPORT_SYSTEMS", []):')
end_idx = content.find('for item in data.get("MECHA", []):')

if start_idx != -1 and end_idx != -1:
    patch = """    for item in data.get("SUPPORT_SYSTEMS", []):
        name = item["System"].strip()
        
        # Determine Tech requirement
        tech = []
        t = item["Tech"].strip()
        if t != "-":
            for char in t.split(","):
                tech_req = tech_map.get(char.strip())
                if tech_req: tech.append(tech_req)
                
        # Determine Hull
        hull_str = str(item["Hull"]).strip().lower()
        hull = {"type": "flat", "val": float(hull_str) if hull_str.replace('.','',1).isdigit() else 1.0}
        
        # Determine Power
        pwr_str = str(item["Power"]).strip().lower()
        pwr = float(pwr_str) if pwr_str.replace('.','',1).isdigit() else 0.0
        
        # Cost processing
        cost_str = item["Cost"].strip()
        base_cost = 0
        if "$" in cost_str:
            m = re.search(r'\$?(\d+)\s*K?', cost_str)
            if m:
                base_cost = int(m.group(1)) * 1000
                
        stats = {}
        notes = item["Notes"].strip().lower()
        
        if "berthing" in name.lower():
            m = re.search(r"berthing for (\d+) crewmen", notes)
            if m: stats["berthing_capacity"] = int(m.group(1))
            stats["stores_days"] = 500
        elif "passenger" in name.lower():
            m = re.search(r"seating for (\d+) passengers", notes)
            if m: stats["passenger_capacity"] = int(m.group(1))
        elif "life support" in name.lower():
            m = re.search(r"life support for (\d+)", notes)
            if m: stats["life_support_hull"] = int(m.group(1))
        elif "galley" in name.lower() or "medical bay" in name.lower():
            m = re.search(r"(?:capacity of|feeds) (\d+)", notes)
            if m: stats["facility_capacity"] = int(m.group(1))
        elif "cargo hold" in name.lower():
            m = re.search(r"increases stores by ([\d,]+)", notes)
            if m: stats["stores_days"] = int(m.group(1).replace(",",""))
        elif "hydroponics" in name.lower():
            m = re.search(r"reduces consumption by (\d+)", notes)
            if m: stats["hydroponics_reduction"] = int(m.group(1))
        elif "recycler" in name.lower():
            stats["recycler_capacity"] = 20

        out["EQUIPMENT"].append({
            "id": f"sys_{name.replace(' ', '_').replace(',', '').replace('(', '').replace(')', '').lower()}",
            "name": name,
            "category": "Systems",
            "group": "Support Systems",
            "tech": tech,
            "baseCost": base_cost,
            "powerConsumed": pwr,
            "hullCost": hull,
            "baseEp": 0,
            "stats": stats,
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": item["Notes"].strip()
        })

    # Parsing Misc Systems
    for item in data.get("MISC_SYSTEMS", []):
        name = item["System"].strip()
        
        tech = []
        t = item["Tech"].strip()
        if t != "-":
            for char in t.split(","):
                tech_req = tech_map.get(char.strip())
                if tech_req: tech.append(tech_req)
                
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
            "category": "Systems",
            "group": "Miscellaneous",
            "tech": tech,
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
    
    new_content = content[:start_idx] + patch + content[end_idx:]
    with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
        f.write(new_content)
