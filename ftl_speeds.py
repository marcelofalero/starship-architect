import json

ftl_speeds = {
    "Jump Drive": {"Accel @ 5%": "-", "@ 10%": "var", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Wormhole Screen": {"Accel @ 5%": "**", "@ 10%": "-", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Gate Activator": {"Accel @ 5%": "**", "@ 10%": "-", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Hyperdrive": {"Accel @ 5%": "1/day", "@ 10%": "2/day", "@ 15%": "3/day", "@ 20%": "4/day", "@ 30%": "5/day", "@ 40%": "6/day", "@ 50%": "7/day"},
    "Stardrive": {"Accel @ 5%": "var", "@ 10%": "-", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Drivewave": {"Accel @ 5%": "var", "@ 10%": "-", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Spacefold Drive": {"Accel @ 5%": "-", "@ 10%": "pow", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Psychoportive Drive": {"Accel @ 5%": "-", "@ 10%": "PEP", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Transcendent Drive": {"Accel @ 5%": "-", "@ 10%": "PEP/hr", "@ 15%": "-", "@ 20%": "-", "@ 30%": "-", "@ 40%": "-", "@ 50%": "-"},
    "Warpdrive": {"Accel @ 5%": "1/hr", "@ 10%": "2/hr", "@ 15%": "4/hr", "@ 20%": "8/hr", "@ 30%": "16/hr", "@ 40%": "32/hr", "@ 50%": "64/hr"}
}

with open("public/warships/raw_data.json", "r") as f:
    raw = json.load(f)

for drive in raw.get("FTL_DRIVES", []):
    name = drive.get("Engine")
    if name in ftl_speeds:
        drive.update(ftl_speeds[name])

with open("public/warships/raw_data.json", "w") as f:
    json.dump(raw, f, indent=2)

