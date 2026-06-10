import re
import json

pl_map = {}
type_map = {}
current_pl = "PL 6"

with open("warships-rules/weapons-defenses.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    
    # Extract PL from headings like "### Tachyon Gun (PL 9)"
    if line.startswith("### ") and "(PL" in line:
        m = re.search(r"### (.*?) \(PL (\d+)\)", line)
        if m:
            name = m.group(1).strip().lower()
            pl_map[name] = f"PL {m.group(2)}"

current_group = "Other Weapons"
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
            clean_name = clean_name.lower()
            
            type_map[clean_name] = current_group

weapon_meta = {}
# For every weapon found in the tables, assign its type and look up its PL
for name, w_type in type_map.items():
    # Attempt to find the PL in pl_map. Some names might not match exactly, so we do a fallback.
    pl = pl_map.get(name)
    if not pl:
        # Try substring match
        for k, v in pl_map.items():
            if k in name or name in k:
                pl = v
                break
    if not pl:
        pl = "PL 6" # Default fallback
        
    weapon_meta[name] = {"type": w_type, "pl": pl}

with open("weapon_meta.json", "w") as f:
    json.dump(weapon_meta, f, indent=2)

