import json

def patch_data():
    with open("public/warships/data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Update cmd_command_deck
    cmd_deck = next((e for e in data["EQUIPMENT"] if e["id"] == "cmd_command_deck"), None)
    if cmd_deck and "upgradeSpecs" in cmd_deck and "auxiliary" in cmd_deck["upgradeSpecs"]:
        del cmd_deck["upgradeSpecs"]["auxiliary"]
        if not cmd_deck["upgradeSpecs"]:
            del cmd_deck["upgradeSpecs"]

    # 2. Add cmd_backup_command_deck if not exists
    if not any(e["id"] == "cmd_backup_command_deck" for e in data["EQUIPMENT"]):
        import copy
        if cmd_deck:
            backup_deck = copy.deepcopy(cmd_deck)
            backup_deck["id"] = "cmd_backup_command_deck"
            backup_deck["name"] = "Backup Command Deck"
            data["EQUIPMENT"].append(backup_deck)

    with open("public/warships/data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def patch_raw():
    with open("public/warships/raw_data.json", "r", encoding="utf-8") as f:
        raw = json.load(f)

    # In raw_data.json, we don't use upgradeSpecs directly, but we can append it to COMMAND
    if "COMMAND" not in raw:
        raw["COMMAND"] = []

    if not any(e.get("Command") == "Backup Command Deck" for e in raw["COMMAND"]):
        cmd_deck_raw = next((e for e in raw["COMMAND"] if e.get("Command") == "Command Deck"), None)
        if cmd_deck_raw:
            import copy
            backup_deck_raw = copy.deepcopy(cmd_deck_raw)
            backup_deck_raw["Command"] = "Backup Command Deck"
            raw["COMMAND"].append(backup_deck_raw)

    with open("public/warships/raw_data.json", "w", encoding="utf-8") as f:
        json.dump(raw, f, indent=2)

if __name__ == "__main__":
    patch_data()
    patch_raw()
    print("Patched data.json and raw_data.json")
