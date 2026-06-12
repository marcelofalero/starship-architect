import re
import json

weapon_map = {}
current_pl = "PL 6"
current_type = "Beam Weapons"

with open("warships-rules/weapons-defenses.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    if line.startswith("### Progress Level"):
        m = re.search(r"Level (\d+)", line)
        if m: current_pl = f"PL {m.group(1)}"
    elif line == "### Beams": current_type = "Beam Weapons"
    elif line == "### Projectiles": current_type = "Projectile Weapons"
    elif line.startswith("### Missiles, Bombs"): current_type = "Area Effect Weapons"
    elif line.startswith("### Torpedoes"): current_type = "Torpedoes & Special Weapons"
    elif line == "### Defensive Systems": current_type = "Defenses"
    elif line.startswith("### ") and "(PL" in line:
        name_match = re.search(r"### (.*?) \(PL (\d+)", line)
        if name_match:
            weapon_name = name_match.group(1).strip()
            pl = f"PL {name_match.group(2)}"
            weapon_map[weapon_name.lower()] = {"type": current_type, "pl": pl}

with open("weapon_meta.json", "w") as f:
    json.dump(weapon_map, f, indent=2)

