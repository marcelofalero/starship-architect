import json

with open("public/warships/raw_data.json", "r") as f:
    raw = json.load(f)

for s in raw["SUPPORT_SYSTEMS"]:
    if s["System"] == "Galley":
        s["Notes"] = "Capacity of 50 people"
    elif s["System"] == "Hydroponics bay":
        s["Notes"] = "Reduces stores consumption by 20 days/day"

with open("public/warships/raw_data.json", "w") as f:
    json.dump(raw, f, indent=2)

