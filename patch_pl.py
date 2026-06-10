import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

patch = """
    # Map Command & Comms -> EQUIPMENT
    for item in raw.get("COMMAND_SYSTEMS", []):
        name = item["System"].strip()
        if not name or name.lower() == "system": continue

        pl_str = "PL 6 - Fusion Age"
        if name in ["Mass Transceiver", "Drivesat Comm Array"]: pl_str = "PL 7 - Gravity Age"
        elif name in ["Drive Transceiver", "Psionic Transceiver"]: pl_str = "PL 8 - Energy Age"
        elif name == "Ansible": pl_str = "PL 9 - Matter Age"

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
            
        upgrade_specs = {"quantity": True}
        if "command deck" in name.lower():
            upgrade_specs["auxiliary"] = True

        out["EQUIPMENT"].append({
            "id": f"cmd_{slugify(name)}",
            "name": name,
            "category": "Command & Comms",
            "group": pl_str,
            "tech": parse_tech(item.get("Tech")),
            "baseCost": base_cost,
            "costPerHull": cost_per_hull,
            "powerConsumed": pwr,
            "hullCost": hull,
            "baseEp": 0,
            "stats": {"pl": pl_str.split(" - ")[0]},
            "sizeMult": False,
            "upgradeSpecs": upgrade_specs,
            "description": item.get("Notes", "").strip()
        })

    # Map Computers -> EQUIPMENT
    for item in raw.get("COMPUTERS", []):
        name = item["System"].strip()
        if not name or name.lower() == "system": continue

        pl_str = "PL 6 - Fusion Age"
        if "Good" in name or name == "Attack Computer": pl_str = "PL 7 - Gravity Age"
        elif "Amazing" in name: pl_str = "PL 8 - Energy Age"
        
        hull = {"type": "flat", "val": parse_float(item.get("Hull")) or 1.0}
        pwr = parse_float(item.get("Power"))
        
        cost_str = str(item.get("Cost", "0"))
        base_cost = parse_cost(cost_str)
        cost_per_hull = 0
        if "/hull" in cost_str.lower():
            cost_per_hull = base_cost
            base_cost = 0

        stats = {"pl": pl_str.split(" - ")[0]}
        notes = item.get("Notes", "").strip().lower()
        if "step bonus" in notes:
            import re
            m = re.search(r'-([0-9]+)\s+step', notes)
            if m: stats["skill_bonus"] = int(m.group(1))

        out["EQUIPMENT"].append({
            "id": f"comp_{slugify(name)}",
            "name": name,
            "category": "Computers",
            "group": pl_str,
            "tech": parse_tech(item.get("Tech")),
            "baseCost": base_cost,
            "costPerHull": cost_per_hull,
            "powerConsumed": pwr,
            "hullCost": hull,
            "baseEp": 0,
            "stats": stats,
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": item.get("Notes", "").strip()
        })

    # Map Sensors -> EQUIPMENT
    for item in raw.get("SENSORS", []):
        name = item["System"].strip()
        if not name or name.lower() == "system": continue
        
        pl_str = "PL 6 - Fusion Age"
        if name in ["Mass Detector", "Multiband Radar", "Probe, advanced", "Remote Network", "Spectroanalyzer", "Drive Detection Array"]: pl_str = "PL 7 - Gravity Age"
        elif name in ["CE Passive Array", "Drive Detector", "Madar", "Multiphase Radar", "Omniscience Sphere"]: pl_str = "PL 8 - Energy Age"
        elif name == "Mass Radar": pl_str = "PL 8 - Energy Age"
        elif "Madar" in name: pl_str = "PL 8 - Energy Age"

        hull = {"type": "flat", "val": parse_float(item.get("Hull")) or 1.0}
        pwr = parse_float(item.get("Power"))
        base_cost = parse_cost(str(item.get("Cost")))

        stats = {
            "pl": pl_str.split(" - ")[0],
            "sensor_type": item.get("Type", "").strip(),
            "sensor_range": item.get("Range", "").strip(),
            "sensor_arcs": item.get("Arcs", "").strip(),
            "sensor_targeting": item.get("Targeting", "").strip()
        }

        out["EQUIPMENT"].append({
            "id": f"sens_{slugify(name)}",
            "name": name,
            "category": "Sensors",
            "group": pl_str,
            "tech": parse_tech(item.get("Tech")),
            "baseCost": base_cost,
            "powerConsumed": pwr,
            "hullCost": hull,
            "baseEp": 0,
            "stats": stats,
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": ""
        })"""

content = re.sub(r'\n    # Map Command & Comms -> EQUIPMENT.*?# Map Misc Systems -> EQUIPMENT', patch.replace('\\', '\\\\') + '\n\n    # Map Misc Systems -> EQUIPMENT', content, flags=re.DOTALL)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
