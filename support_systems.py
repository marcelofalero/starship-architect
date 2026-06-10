import json

raw_systems = [
    {"System": "Life support", "Tech": "-", "Hull": "1", "Power": "1", "Cost": "$100 K", "Notes": "Life support for 20 hull points"},
    {"System": "Berthing, standard", "Tech": "-", "Hull": "3", "Power": "0", "Cost": "$40 K", "Notes": "Berthing for 20 crewmen"},
    {"System": "Berthing, 2-man", "Tech": "-", "Hull": "1", "Power": "0", "Cost": "$20 K", "Notes": "Berthing for 2 crewmen"},
    {"System": "Berthing, 6-man", "Tech": "-", "Hull": "2", "Power": "0", "Cost": "$20 K", "Notes": "Berthing for 6 crewmen"},
    {"System": "Passenger seating", "Tech": "-", "Hull": "2", "Power": "0", "Cost": "$10 K", "Notes": "Short-term seating for 20 passengers"},
    {"System": "Stateroom", "Tech": "-", "Hull": "2", "Power": "0", "Cost": "$50 K", "Notes": "Staterooms for 2 passengers"},
    {"System": "Galley", "Tech": "-", "Hull": "2", "Power": "1", "Cost": "$100 K", "Notes": "Capacity of 12 people"},
    {"System": "Medical bay", "Tech": "-", "Hull": "2", "Power": "1", "Cost": "$75 K", "Notes": "Feeds 10 people"},
    {"System": "Recycler unit", "Tech": "-", "Hull": "1", "Power": "1", "Cost": "$300 K", "Notes": "Reduces consumption to 10% normal for 20 people"},
    {"System": "Cargo hold (stores)", "Tech": "-", "Hull": "1", "Power": "0", "Cost": "$5 K", "Notes": "Increases stores by 1,000 days"},
    {"System": "Life support (PL 7)", "Tech": "-", "Hull": "1", "Power": "1", "Cost": "$200 K", "Notes": "Life support for 40 hull points"},
    {"System": "Hydroponics bay", "Tech": "S", "Hull": "1", "Power": "1", "Cost": "$250 K", "Notes": "Capacity of 12 people"},
    {"System": "Bioconservancy", "Tech": "P, M", "Hull": "1", "Power": "1", "Cost": "$250 K", "Notes": "Life support for 100 hull pts, recycling for 20 people"}
]

with open("public/warships/raw_data.json", "r") as f:
    raw = json.load(f)

raw["SUPPORT_SYSTEMS"] = raw_systems

with open("public/warships/raw_data.json", "w") as f:
    json.dump(raw, f, indent=2)

