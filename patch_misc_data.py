import json

misc_systems = [
    {"System": "Airlock", "Tech": "-", "Hull": 1, "Power": 0, "Cost": "$10 K", "Type": "Hangar", "Notes": "Free with command deck or crew quarters"},
    {"System": "Brig", "Tech": "-", "Hull": 2, "Power": 0, "Cost": "$20 K", "Type": "Accom.", "Notes": "per 4 prisoners"},
    {"System": "Cargo Space", "Tech": "-", "Hull": 1, "Power": 0, "Cost": "$10 K", "Type": "Cargo", "Notes": "per 24m3"},
    {"System": "Cargo Bay", "Tech": "-", "Hull": 2, "Power": 0, "Cost": "$20 K", "Type": "Cargo", "Notes": "per 50m3"},
    {"System": "Cargo Hold", "Tech": "-", "Hull": 3, "Power": 0, "Cost": "$50 K", "Type": "Cargo", "Notes": "per 100m3"},
    {"System": "Docking Clamps", "Tech": "-", "Hull": 2, "Power": 0, "Cost": "$50 K", "Type": "Hangar", "Notes": "per 10 hull point capacity"},
    {"System": "Escape Pod", "Tech": "-", "Hull": 1, "Power": 0, "Cost": "$50 K", "Type": "Hangar", "Notes": "10 man capacity"},
    {"System": "Fuel Collectors", "Tech": "-", "Hull": 2, "Power": 0, "Cost": "$100 K", "Type": "Fuel", "Notes": "-"},
    {"System": "Hangar", "Tech": "-", "Hull": 1, "Power": 0, "Cost": "$100/25 K*", "Type": "Hangar", "Notes": "per hull point capacity"},
    {"System": "Lab Section", "Tech": "-", "Hull": 2, "Power": 0, "Cost": "$100 K", "Type": "Accom.", "Notes": "-"},
    {"System": "Magazine", "Tech": "-", "Hull": 1, "Power": 0, "Cost": "$50 K", "Type": "Misc.", "Notes": "per 4 size points of carried ordnance"},
    {"System": "Reentry Capsule", "Tech": "-", "Hull": 0.5, "Power": 0, "Cost": "$5 K", "Type": "Hangar", "Notes": "2 crewmen"},
    {"System": "Sick Bay", "Tech": "-", "Hull": 2, "Power": 0, "Cost": "$150 K", "Type": "Misc.", "Notes": "4 beds"},
    {"System": "Workshop", "Tech": "-", "Hull": 2, "Power": 1, "Cost": "$20 K", "Type": "Misc.", "Notes": "-"},
    {"System": "Accumulator", "Tech": "S", "Hull": 1, "Power": 0, "Cost": "$40 K", "Type": "Power", "Notes": "stores 10 power points"},
    {"System": "Autocargo", "Tech": "-", "Hull": 1, "Power": 1, "Cost": "$30 K", "Type": "Cargo", "Notes": "per 6 hull points of cargo serviced"},
    {"System": "Boarding Pod", "Tech": "-", "Hull": 2, "Power": 0, "Cost": "$200 K", "Type": "Hangar", "Notes": "10 troop capacity"},
    {"System": "Evac System", "Tech": "-", "Hull": 4, "Power": 0, "Cost": "$250 K", "Type": "Hangar", "Notes": "4 10-man lifeboats"},
    {"System": "Extra pods", "Tech": "-", "Hull": 1, "Power": 0, "Cost": "$50 K", "Type": "Hangar", "Notes": "2 10-man lifeboats"},
    {"System": "Fabrication Facility", "Tech": "-", "Hull": 4, "Power": 2, "Cost": "$200 K", "Type": "Misc.", "Notes": "-"}
]

with open("public/warships/raw_data.json", "r") as f:
    raw = json.load(f)

raw["MISC_SYSTEMS"] = misc_systems

with open("public/warships/raw_data.json", "w") as f:
    json.dump(raw, f, indent=2)

