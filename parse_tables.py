import re
import json

weapon_map = {}
current_group = "Other Weapons"

with open("warships-rules/weapons-defenses.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    if line.startswith("### Table"):
        if "Table 5-8:" in line: current_group = "Beam Weapons"
        elif "Table 5-9:" in line: current_group = "Projectile Weapons"
        elif "Table 5-11:" in line: current_group = "Area Effect Weapons"
        elif "Table 5-12:" in line: current_group = "Torpedoes & Special Weapons"
        else: current_group = "Other Weapons"
    
    if current_group != "Other Weapons" and line.startswith("|") and not line.startswith("|---"):
        parts = [p.strip() for p in line.split("|")]
        if len(parts) > 2 and parts[1] != "Weapon" and parts[1] != "Tech":
            w_name = parts[1]
            clean_name = re.sub(r'[*]+$', '', w_name).strip()
            if clean_name.endswith(" -"): clean_name = clean_name[:-2].strip()
            
            tech = parts[2] if len(parts) > 2 else "-"
            pl = "PL 6"
            if tech == "G" or tech == "A": pl = "PL 7"
            if tech == "S" or tech == "Q": pl = "PL 8"
            if tech == "M": pl = "PL 9"
            if tech == "C" or tech == "F" or tech == "-": pl = "PL 6"
            
            weapon_map[clean_name.lower()] = {"type": current_group, "pl": pl}

with open("weapon_meta.json", "w") as f:
    json.dump(weapon_map, f, indent=2)

