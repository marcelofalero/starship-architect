import re
import json

def build_speed_map(e):
    pcts = ["5", "10", "15", "20", "30", "40", "50"]
    keys = ["Accel @ 5%", "@ 10%", "@ 15%", "@ 20%", "@ 30%", "@ 40%", "@ 50%"]
    speed_map = {}
    for pct, key in zip(pcts, keys):
        v = e.get(key)
        if not v or v == '-' or v == '--': continue
        if type(v) == str and '*' in v: v = v.replace('*', '')
        try: v = float(v)
        except: pass
        speed_map[pct] = v
    return speed_map

import os


def parse_cost(cost_str):
    if not cost_str or cost_str == '-': return 0
    val = re.sub(r'[^0-9.]', '', str(cost_str))
    if not val or val == '.': return 0
    val = float(val)
    if 'M' in str(cost_str).upper(): return int(val * 1000000)
    if 'K' in str(cost_str).upper(): return int(val * 1000)
    return int(val)

def build_speed_map(e):
    pcts = ["5", "10", "15", "20", "30", "40", "50"]
    keys = ["Accel @ 5%", "@ 10%", "@ 15%", "@ 20%", "@ 30%", "@ 40%", "@ 50%"]
    speed_map = {}
    for pct, key in zip(pcts, keys):
        v = e.get(key)
        if not v or v == '-' or v == '--': continue
        if type(v) == str and '*' in v: v = v.replace('*', '')
        try: v = float(v)
        except: pass
        speed_map[pct] = v
    return speed_map

def parse_hull_cost(hull_str):
    if not hull_str or hull_str == '-': return {"type": "flat", "val": 0}
    hull_str = str(hull_str).strip()
    if '%' in hull_str:
        val = float(hull_str.replace('%', ''))
        return {"type": "pct", "val": val / 100.0}
    try:
        val = float(hull_str)
        return {"type": "flat", "val": val}
    except:
        return {"type": "flat", "val": 0}

def parse_tech(tech_str):
    if not tech_str or tech_str == "-": return []
    return [c.strip().upper() for c in str(tech_str).replace('.', '').split(',') if c.strip() and len(c.strip()) == 1] or []

def parse_float(val_str):
    if not val_str or val_str == '-': return 0.0
    try:
        return float(re.sub(r'[^0-9.]', '', str(val_str)))
    except:
        return 0.0

def slugify(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')

def main():
    with open('public/warships/raw_data.json', 'r', encoding='utf-8') as f:
        raw = json.load(f)

    out = {
        "AVAILABILITY_RANK": {},
        "DEFAULT_OPTION_COSTS": {},
        "LICENSE_FEES": {},
        "REFLEX_SIZE_MODS": {},
        "SIZE_COST_MULTIPLIERS": {},
        "SIZE_RANK": [
            "Small Craft",
            "Light Ships",
            "Medium Ships",
            "Heavy Ships",
            "Super-Heavy Ships",
            "Fortress Ships"
        ],
        "TEMPLATES": [],
        "STOCK_SHIPS": [],
        "EQUIPMENT": []
    }

    # Map Hulls -> STOCK_SHIPS
    for h in raw.get("HULLS", []):
        name = h.get("Hull Type")
        if not name or name.startswith("_Progress"):
            continue
        
        hp = 0
        bonus_hp = 0
        try: 
            raw_hp = str(h.get("Hull Pts.", "0"))
            hp_str = raw_hp.split('(')[0].strip()
            hp = int(hp_str)
            if '(' in raw_hp:
                bonus_str = raw_hp.split('(')[1].split(')')[0].replace('+', '').strip()
                bonus_hp = int(bonus_str)
        except: pass
        
        crew = 0
        try: crew = int(h.get("Crew", 0))
        except: pass
        
        out["STOCK_SHIPS"].append({
            "id": "hull_" + slugify(name),
            "name": name,
            "name_es": name,
            "size": h.get("SizeCategory", "Unknown"),
            "category": h.get("Category", "Unknown"),
            "cost": parse_cost(h.get("Cost")),
            "baseHull": hp,
            "bonusHull": bonus_hp,
            "toughness": h.get("Tough", "Unknown"),
            "baseEp": 0,
            
            "stats": {
                "hp": hp,
                "str": 0, "dex": 0, "int": 0, "dr": 0, "armor": 0, "sr": 0
            },
            "logistics": {
                "crew": crew,
                "pass": 0,
                "cargo": "0",
                "cons": "0 days"
            },
            "defaultMods": []
        })

    engine_pl_map = {
        "Planetary thruster": "PL 6 - Fusion Age",
        "Photon sail": "PL 6 - Fusion Age",
        "Fusion torch": "PL 6 - Fusion Age",
        "Ion engine": "PL 6 - Fusion Age",
        "Particle impulse": "PL 7 - Gravity Age",
        "Induction engine": "PL 7 - Gravity Age",
        "Inertial flux engine": "PL 8 - Energy Age",
        "Gravitic redirector": "PL 8 - Energy Age",
        "Spatial compressor": "PL 9 - Matter Age"
    }

    # Map Engines -> EQUIPMENT
    for e in raw.get("ENGINES", []):
        name = e.get("Engine") or e.get("Engine Type")
        if not name or name.startswith("_Progress"): continue
        out["EQUIPMENT"].append({
            "id": "eng_" + slugify(name),
            "name": name,
            "category": "Sublight",
            "exclusiveGroup": "Sublight",
            "group": engine_pl_map.get(name, "Sublight"),
            "tech": parse_tech(e.get("Tech")),
            "baseCost": parse_cost(e.get("Base Cost.") or e.get("Cost")),
            "costPerHull": parse_cost(e.get("Cost/Hull")),
            "powerConsumed": parse_float(e.get("Pow")),
            "hullCost": parse_hull_cost(e.get("Hull")),
            "minHullPts": parse_float(e.get("Min Size")) or 1.0,
            "baseEp": 0,
            "stats": {"speed_map": build_speed_map(e)},
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": f"Pow: {e.get('Pow')}"
        })

    power_plant_pl_map = {
        "Solar Cell": "PL 6 - Fusion Age",
        "Fission Generator": "PL 6 - Fusion Age",
        "Fusion Generator": "PL 6 - Fusion Age",
        "Grav-fusion Cell": "PL 6 - Fusion Age",
        "Fuel Tank": "PL 6 - Fusion Age",
        "Tachyonic Collider": "PL 7 - Gravity Age",
        "Antimatter Reactor": "PL 7 - Gravity Age",
        "Mass Reactor": "PL 7 - Gravity Age",
        "Dynamic Mass Reactor": "PL 8 - Energy Age",
        "Matter Converter": "PL 8 - Energy Age",
        "Quantum Cell": "PL 8 - Energy Age",
        "Singularity Generator": "PL 9 - Matter Age"
    }

    # Map Power Plants -> EQUIPMENT
    for p in raw.get("POWER_PLANTS", []):
        name = p.get("Power Plant")
        if not name or name.startswith("_Progress"): continue
        out["EQUIPMENT"].append({
            "id": "pow_" + slugify(name),
            "name": name,
            "category": "Power",
            "group": power_plant_pl_map.get(name, "Power Plants"),
            "tech": parse_tech(p.get("Tech")),
            "baseCost": parse_cost(p.get("Base Cost") or p.get("Cost")),
            "costPerHull": parse_cost(p.get("Cost/Hull Pt.")),
            "powerPerHull": parse_float(p.get("Pow")),
            "minHullPts": parse_float(p.get("Min Size")) or 1.0,
            "baseEp": 0,
            
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": f"En: {p.get('Pow') or p.get('En')}"
        })


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
            "stats": {"speed_map": build_speed_map(e)},
            "sizeMult": False,
            "description": f"Min Size: {e.get('Min Size')} | Pow: {e.get('Pow')}"
        })


    # Map Support Systems -> EQUIPMENT
    for s in raw.get("SUPPORT_SYSTEMS", []):
        name = s.get("System")
        if not name or name.startswith("_Progress"): continue
        
        stats = {}
        notes = str(s.get("Notes", "")).lower()
        
        if "berthing for" in notes:
            
            m = re.search(r"berthing for (\d+)", notes)
            if m: stats["berthing_capacity"] = int(m.group(1))
            if "standard" in name.lower():
                stats["stores_days"] = 500
        elif "life support for" in notes:
            
            m = re.search(r"life support for (\d+)", notes)
            if m: stats["life_support_hull"] = int(m.group(1))
            if "recycling for" in notes:
                m2 = re.search(r"recycling for (\d+)", notes)
                if m2: stats["recycler_capacity"] = int(m2.group(1))
        elif "short-term seating for" in notes:
            
            m = re.search(r"seating for (\d+)", notes)
            if m: stats["passenger_capacity"] = int(m.group(1))
        elif "staterooms for" in notes:
            
            m = re.search(r"staterooms for (\d+)", notes)
            if m: stats["berthing_capacity"] = int(m.group(1)) # Treat stateroom as berthing
        elif "reduces consumption to 10% normal for" in notes:
            
            m = re.search(r"for (\d+)", notes)
            if m: stats["recycler_capacity"] = int(m.group(1))
        elif "increases stores by" in notes:
            
            m = re.search(r"increases stores by ([\d,]+)", notes)
            if m: stats["stores_days"] = int(m.group(1).replace(',', ''))
        elif "hydroponics bay" in name.lower():
            stats["hydroponics_reduction"] = 20
        elif "galley" in name.lower() or "medical bay" in name.lower():
            
            m = re.search(r"(?:capacity of|feeds) (\d+)", notes)
            if m: stats["facility_capacity"] = int(m.group(1))
            
        group_name = "Miscellaneous"
        if "berthing" in name.lower() or "passenger" in name.lower() or "stateroom" in name.lower():
            group_name = "Berthing"
        elif "life support" in name.lower() or "recycler" in name.lower() or "hydroponics" in name.lower() or "bioconservancy" in name.lower():
            group_name = "Life support"
            
        out["EQUIPMENT"].append({
            "id": "sys_" + slugify(name),
            "name": name,
            "category": "Accommodations",
            "group": group_name,
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
            hull = {"type": "pct", "base": 2, "val": 0.01, "max": 10} # Command Deck is +1 per 100 hull points (1%)
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
            upgrade_specs = {"auxiliary": True} # Remove quantity, add auxiliary

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
        if "/hull" in cost_str.lower() or "*" in cost_str:
            cost_per_hull = base_cost
            base_cost = 0

        stats = {"pl": pl_str.split(" - ")[0]}
        notes = item.get("Notes", "").strip().lower()
        if "step bonus" in notes:
            
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
        })

    # Map Misc Systems -> EQUIPMENT
    for item in raw.get("MISC_SYSTEMS", []):
        name = item["System"].strip()
        if not name: continue
        
        tech = parse_tech(item.get("Tech"))
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

    # Map Weapons -> EQUIPMENT

    try:
        with open("weapon_meta.json", "r") as f:
            weapon_meta = json.load(f)
    except:
        weapon_meta = {}

    for w in raw.get("WEAPONS", []):
        name = w.get("Weapon") or w.get("Weapon Type")
        if not name or name.startswith("_Progress") or not w.get("Damage") or name.lower() in ["tech", "weapon"]: continue
        
        clean_name = re.sub(r'[*]+$', '', name).strip()
        if clean_name.endswith(" -"): clean_name = clean_name[:-2].strip()
        
        meta = weapon_meta.get(clean_name.lower(), {"type": "Other Weapons", "pl": "PL 6"})

        cost_str = w.get("Cost") or w.get("Cost.") or w.get("Acc")
        out["EQUIPMENT"].append({
            "id": "wpn_" + slugify(name),
            "name": name,
            "category": "Weapon Systems",
            "group": meta["type"],
            "tech": parse_tech(w.get("Tech")),
            "baseCost": parse_cost(cost_str),
            "powerConsumed": parse_float(w.get("Pow") or w.get("Power")),
            "hullCost": parse_hull_cost(w.get("Hull")),
            "baseEp": 0,
            "stats": {"pl": meta["pl"]},
            "sizeMult": False,
            "damage": w.get("Damage"),
            "fire": w.get("Fire"),
            "description": f"Damage: {w.get('Damage')} | Mode: {w.get('Mode')} | Pow: {w.get('Pow') or w.get('Power')}"
        })

    # Map Defensive Systems -> EQUIPMENT
    for item in raw.get("DEFENSIVE_SYSTEMS", []):
        name = item.get("System", "").strip()
        if not name or name.lower() == "system": continue

        tech = parse_tech(item.get("Tech"))
        
        # Parse Hull
        hull_str = str(item.get("Hull", "1")).strip()
        if "%" in hull_str:
            try:
                hull = {"type": "pct", "val": float(hull_str.replace("%", "").strip()) / 100.0}
            except:
                hull = {"type": "pct", "val": 0.0}
        else:
            hull = {"type": "flat", "val": parse_float(hull_str) or 1.0}

        # Parse Power
        pwr_str = str(item.get("Power", "0")).strip()
        power_consumed = 0.0
        power_consumed_per_hull = None
        if "/hull" in pwr_str.lower():
            power_consumed_per_hull = parse_float(pwr_str.split("/")[0])
        else:
            power_consumed = parse_float(pwr_str)

        # Parse Cost
        cost_str = str(item.get("Cost", "0")).strip()
        base_cost = parse_cost(cost_str)
        cost_per_hull = 0.0
        if "/hull" in cost_str.lower() or "*" in cost_str:
            cost_per_hull = base_cost
            base_cost = 0.0

        # Group and Category
        category = "Defenses"
        group = "Defenses"
        if name in ["Generator", "Capacitor", "Energy Compiler"]:
            group = "Energy Shields"

        coverage = item.get("Coverage", "").strip()
        notes = item.get("Notes", "").strip()
        if coverage and coverage != "--" and coverage != "-":
            description = f"Coverage: {coverage} | {notes}"
        else:
            description = notes

        eq_item = {
            "id": f"def_{slugify(name)}",
            "name": name,
            "category": category,
            "group": group,
            "tech": tech,
            "baseCost": base_cost,
            "costPerHull": cost_per_hull,
            "powerConsumed": power_consumed,
            "hullCost": hull,
            "baseEp": 0,
            "stats": {},
            "sizeMult": False,
            "upgradeSpecs": {"quantity": True},
            "description": description
        }
        if power_consumed_per_hull is not None:
            eq_item["powerConsumedPerHull"] = power_consumed_per_hull

        out["EQUIPMENT"].append(eq_item)

    current_armor_pl = "PL 6"
    # Map Armor -> EQUIPMENT
    for a in raw.get("ARMOR", []):
        name = a.get("Armor") or a.get("Armor Type")
        if not name: continue
        if name.startswith("_Progress"):
            pl_match = re.search(r"Level (\d+)", name)
            if pl_match:
                current_armor_pl = f"PL {pl_match.group(1)}"
            continue
        
        parts = name.split(',')
        armor_type = parts[0].strip()
        if len(parts) > 1:
            armor_level = parts[1].replace('!', '').replace('*', '').strip().title()
            final_name = f"{armor_type}, {armor_level} ({current_armor_pl})"
        else:
            armor_level = name.replace('!', '').replace('*', '').strip()
            final_name = f"{armor_level} ({current_armor_pl})"
        
        cost_str = a.get("Cost/Hull Pt.") or a.get("Cost")
        
        
        min_ship_size = None
        if "super-heavy" in armor_level.lower() or "super" in armor_level.lower():
            min_ship_size = "Medium Ships"
        elif "heavy" in armor_level.lower():
            min_ship_size = "Light Ships"
            
        out["EQUIPMENT"].append({
            "id": "arm_" + slugify(name),
            "name": final_name,
            "category": "Armor",
            "group": armor_type,
            "exclusiveGroup": "Armor",
            "tech": parse_tech(a.get("Tech")),
            "baseCost": 0,
            "costPerHull": parse_cost(cost_str),
            "hullCost": parse_hull_cost(a.get("Hull")),
            "powerConsumed": parse_float(a.get("Pow")),
            "baseEp": 0,
            
            "sizeMult": False,
            "minShipSize": min_ship_size,
            "description": f"LI: {a.get('LI')} | HI: {a.get('HI')} | En: {a.get('En')} | Hull: {a.get('Hull')}",
            "stats": {
                "LI": a.get("LI"),
                "HI": a.get("HI"),
                "En": a.get("En")
            }
        })

    with open('public/warships/data.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)

if __name__ == "__main__":
    main()
