import json

with open("public/warships/raw_data.json", "r", encoding="utf-8") as f:
    raw = json.load(f)

# Append to raw_data.json under COMPUTERS so convert_data.py processes them in the future if needed.
if "COMPUTERS" not in raw:
    raw["COMPUTERS"] = []

ai_cradle = {
  "Computer": "AI Cradle",
  "Tech": "Energy",
  "Cost": "200000",
  "Pow": 4,
  "Hull": 4,
  "Notes": "Hardware matrix designed to host advanced synthetic intelligence."
}

ai_automation = {
  "Computer": "AI Automation",
  "Tech": "Energy",
  "Cost": "500000",
  "Pow": 1,
  "Hull": 0,
  "Notes": "Allows ship systems to operate autonomously. Requires an AI Cradle."
}

# Instead of putting `requires` in raw_data, it's easier to just keep our direct data.json modifications.
# Wait, I'll just append it to raw_data.json anyway
raw["COMPUTERS"].append(ai_cradle)
raw["COMPUTERS"].append(ai_automation)

with open("public/warships/raw_data.json", "w", encoding="utf-8") as f:
    json.dump(raw, f, indent=2)
