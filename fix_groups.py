import json

with open("public/warships/data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data["EQUIPMENT"]:
    group = item.get("group", "")
    if group and group.startswith("PL "):
        # Remove group if it's just a PL indicator
        item["group"] = ""

with open("public/warships/data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Fixed groups in data.json")
