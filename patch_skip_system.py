import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add a check: if name.lower() == "system": continue

patch = """    for item in raw.get("COMMAND_SYSTEMS", []):
        name = item["System"].strip()
        if not name or name.lower() == "system": continue"""
content = content.replace("""    for item in raw.get("COMMAND_SYSTEMS", []):
        name = item["System"].strip()
        if not name: continue""", patch)

patch2 = """    for item in raw.get("COMPUTERS", []):
        name = item["System"].strip()
        if not name or name.lower() == "system": continue"""
content = content.replace("""    for item in raw.get("COMPUTERS", []):
        name = item["System"].strip()
        if not name: continue""", patch2)

patch3 = """    for item in raw.get("SENSORS", []):
        name = item["System"].strip()
        if not name or name.lower() == "system": continue"""
content = content.replace("""    for item in raw.get("SENSORS", []):
        name = item["System"].strip()
        if not name: continue""", patch3)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
