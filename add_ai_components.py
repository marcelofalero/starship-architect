import json

with open("public/warships/data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

ai_cradle = {
  "id": "comp_ai_cradle",
  "name": "AI Cradle",
  "category": "Computers",
  "group": "PL 8 - Energy Age",
  "tech": ["C"],
  "baseCost": 200000,
  "costPerHull": 0,
  "powerConsumed": 4.0,
  "hullCost": {
    "type": "flat",
    "val": 4.0
  },
  "baseEp": 0,
  "stats": {
    "pl": "PL 8"
  },
  "sizeMult": False,
  "description": "Hardware matrix designed to host advanced synthetic intelligence."
}

ai_automation = {
  "id": "comp_ai_automation",
  "name": "AI Automation",
  "category": "Computers",
  "group": "PL 8 - Energy Age",
  "tech": ["C"],
  "baseCost": 500000,
  "costPerHull": 0,
  "powerConsumed": 1.0,
  "hullCost": {
    "type": "pct",
    "val": 0.05
  },
  "baseEp": 0,
  "stats": {
    "pl": "PL 8"
  },
  "sizeMult": False,
  "requires": ["comp_ai_cradle"],
  "description": "Allows ship systems to operate autonomously. Requires an AI Cradle."
}

# Remove if they already exist
data["EQUIPMENT"] = [e for e in data["EQUIPMENT"] if e["id"] not in ["comp_ai_cradle", "comp_ai_automation"]]

data["EQUIPMENT"].append(ai_cradle)
data["EQUIPMENT"].append(ai_automation)

with open("public/warships/data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("AI components added.")
