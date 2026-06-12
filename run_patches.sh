#!/bin/bash
python3 scripts/parse_warships.py
python3 support_systems.py
python3 parse_sensors.py
python3 patch_misc_data.py
python3 fix_raw_data.py
python3 patch_stats.py

python3 -c '
import json
with open("public/warships/raw_data.json", "r", encoding="utf-8") as f: raw = json.load(f)
with open("scratch.json", "r", encoding="utf-8") as f: scratch = json.load(f)
raw["FTL_DRIVES"] = scratch["FTL_DRIVES"]
with open("public/warships/raw_data.json", "w", encoding="utf-8") as f: json.dump(raw, f, indent=2)
'

python3 scripts/convert_data.py
