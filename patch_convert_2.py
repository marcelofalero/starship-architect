with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    for line in lines:
        if 'out["EQUIPMENT"].append({' in line:
            f.write(line)
        elif 'upgradeSpecs": {"quantity": True},' in line and 'description": f"Pow: {e.get(' in line: # This is inside ENGINES or FTL
            f.write(line)
        elif '"upgradeSpecs": {"quantity": True},' in line:
            # We want to add stats to FTL and ENGINES
            f.write(line)
        else:
            f.write(line)
