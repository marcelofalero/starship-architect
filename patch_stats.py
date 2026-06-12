import json

def parse_val(v):
    if not v or v == '-' or v == '--': return None
    if '*' in v: v = v.replace('*', '')
    try: return float(v)
    except: return v

with open('public/warships/raw_data.json', 'r') as f:
    raw = json.load(f)

with open('public/warships/data.json', 'r') as f:
    data = json.load(f)

def build_speed_map(e):
    # FTL drives use "Accel @ 5%" or "1 LY" etc. Sublight uses "0.1*"
    pcts = ["5", "10", "15", "20", "30", "40", "50"]
    keys = ["Accel @ 5%", "@ 10%", "@ 15%", "@ 20%", "@ 30%", "@ 40%", "@ 50%"]
    
    speed_map = {}
    for pct, key in zip(pcts, keys):
        val = e.get(key)
        v = parse_val(val)
        if v is not None:
            speed_map[pct] = v
    return speed_map

for e in raw.get("ENGINES", []):
    name = e.get("Engine") or e.get("Engine Type")
    for eq in data["EQUIPMENT"]:
        if eq["name"] == name and eq["category"] == "Sublight":
            if "stats" not in eq: eq["stats"] = {}
            eq["stats"]["speed_map"] = build_speed_map(e)

for e in raw.get("FTL_DRIVES", []):
    name = e.get("Engine") or e.get("Engine Type")
    for eq in data["EQUIPMENT"]:
        if eq["name"] == name and eq["category"] == "FTL Drives":
            if "stats" not in eq: eq["stats"] = {}
            eq["stats"]["speed_map"] = build_speed_map(e)

with open('public/warships/data.json', 'w') as f:
    json.dump(data, f, indent=2)
