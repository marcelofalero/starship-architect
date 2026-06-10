import os
import re
import json

RULES_DIR = "warships-rules"
OUTPUT_FILE = "public/warships/raw_data.json"

def parse_markdown_table(filepath):
    tables = {}
    current_table = None
    headers = []
    
    if not os.path.exists(filepath):
        return tables
        
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Start of a table
            if line.startswith("### Table") or line.startswith("## Table"):
                current_table = line.replace("### ", "").replace("## ", "").strip()
                tables[current_table] = []
                headers = []
                current_size = "Unknown"
                continue
                
            if current_table:
                if not line:
                    continue
                
                # Check if it's a separator line
                if "---" in line and "|" in line:
                    continue
                
                # Split the line
                parts = [p.strip() for p in line.strip('|').split('|')]
                
                # If we don't have headers yet, and it looks like a header line (has pipes)
                if not headers and len(parts) > 1:
                    headers = parts
                    continue
                    
                # Data row
                if headers and len(parts) > 1:
                    # Check for category rows (e.g. **Small Craft**)
                    if parts[0].startswith("**") and len(parts) > 1 and not parts[1]:
                        current_size = parts[0].replace('**', '').strip()
                        continue
                        
                    # We might have trailing empty strings because of markdown syntax, so pad or trim
                    if len(parts) < len(headers) - 1:
                        continue
                    if len(parts) >= len(headers):
                        row_data = dict(zip(headers, parts[:len(headers)]))
                    else:
                        # Padding missing columns with empty string
                        padded_parts = parts + [""] * (len(headers) - len(parts))
                        row_data = dict(zip(headers, padded_parts))
                    
                    row_data["SizeCategory"] = current_size
                    tables[current_table].append(row_data)
                
                # End of table
                if not "|" in line and not line.startswith("###") and not line.startswith("##") and not line == "":
                    current_table = None

    return tables

def main():
    data = {
        "HULLS": [],
        "ARMOR": [],
        "POWER_PLANTS": [],
        "ENGINES": [],
        "WEAPONS": []
    }
    
    # Parse Hulls
    hulls_tables = parse_markdown_table(os.path.join(RULES_DIR, "class-hull.md"))
    for t_name, rows in hulls_tables.items():
        if "Military Hulls" in t_name or "Civilian Hulls" in t_name:
            category = "Military" if "Military Hulls" in t_name else "Civilian"
            for r in rows: r["Category"] = category
            data["HULLS"].extend(rows)
            
    # Parse Armor
    armor_tables = parse_markdown_table(os.path.join(RULES_DIR, "armor.md"))
    for t_name, rows in armor_tables.items():
        if "Armor" in t_name:
            data["ARMOR"].extend(rows)
            
    # Parse Power Plants
    power_tables = parse_markdown_table(os.path.join(RULES_DIR, "power-plant.md"))
    for t_name, rows in power_tables.items():
        if "Power Plants" in t_name:
            data["POWER_PLANTS"].extend(rows)
            
    # Parse Engines
    engine_tables = parse_markdown_table(os.path.join(RULES_DIR, "engines.md"))
    for t_name, rows in engine_tables.items():
        if "Engines" in t_name:
            data["ENGINES"].extend(rows)
            
    # Parse Weapons & Defenses
    weapon_tables = parse_markdown_table(os.path.join(RULES_DIR, "weapons-defenses.md"))
    for t_name, rows in weapon_tables.items():
        if "Weapons" in t_name or "Guns" in t_name or "Missiles" in t_name:
            data["WEAPONS"].extend(rows)
        elif "Defensive Systems" in t_name:
            data["DEFENSIVE_SYSTEMS"] = rows

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        
    print(f"Parsed data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
