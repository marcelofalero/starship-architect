import re
import json

with open("warships-rules/command-sensors.md", "r", encoding="utf-8") as f:
    lines = f.readlines()

def extract_table(header_start):
    table_lines = []
    in_table = False
    for line in lines:
        if header_start in line:
            in_table = True
            continue
        if in_table:
            if line.startswith("|") and not line.startswith("|---"):
                parts = [p.strip() for p in line.split("|")[1:-1]]
                table_lines.append(parts)
            elif not line.strip() or line.startswith("###"):
                if len(table_lines) > 0:
                    break
    return table_lines

comms = extract_table("### Table 5-14: Command, Control")
computers = extract_table("### Table 5-14a: Computers")
sensors = extract_table("### Table 5-15: Sensors")

with open('public/warships/raw_data.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

# Helper to build dicts
def to_dict(keys, row):
    return dict(zip(keys, row))

comms_keys = ["System", "Tech", "Hull", "Power", "Cost", "Notes"]
comp_keys = ["System", "Tech", "Hull", "Power", "Cost", "Notes"]
sensor_keys = ["System", "Tech", "Hull", "Power", "Cost", "Type", "Range", "Arcs", "Targeting"]

raw["COMMAND_SYSTEMS"] = [to_dict(comms_keys, r) for r in comms if len(r) == len(comms_keys)]
raw["COMPUTERS"] = [to_dict(comp_keys, r) for r in computers if len(r) == len(comp_keys)]

# Some sensor lines are corrupted text wrapping in the original file, we must filter them
valid_sensors = []
for r in sensors:
    if len(r) >= len(sensor_keys):
        valid_sensors.append(to_dict(sensor_keys, r[:len(sensor_keys)]))

raw["SENSORS"] = valid_sensors

with open('public/warships/raw_data.json', 'w', encoding='utf-8') as f:
    json.dump(raw, f, indent=2)

