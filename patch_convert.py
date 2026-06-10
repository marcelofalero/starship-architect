import sys

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

speed_func = """
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
"""

content = content.replace("import json", "import json\n" + speed_func)

# Replace "baseEp": 0, with "baseEp": 0,\n            "stats": {"speed_map": build_speed_map(e)},
content = content.replace('"baseEp": 0,', '"baseEp": 0,\n            "stats": {"speed_map": build_speed_map(e)},')

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)

