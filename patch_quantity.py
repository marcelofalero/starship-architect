import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace `upgrade_specs = {"quantity": True}` for Command Deck logic
patch = """        upgrade_specs = {"quantity": True}
        if "command deck" in name.lower():
            upgrade_specs = {"auxiliary": True} # Remove quantity, add auxiliary"""

content = content.replace("""        upgrade_specs = {"quantity": True}
        if "command deck" in name.lower():
            upgrade_specs["auxiliary"] = True""", patch)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
