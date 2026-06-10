with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

patch = """        group_name = "Miscellaneous"
        if "berthing" in name.lower() or "passenger" in name.lower() or "stateroom" in name.lower():
            group_name = "Berthing"
        elif "life support" in name.lower() or "recycler" in name.lower() or "hydroponics" in name.lower() or "bioconservancy" in name.lower():
            group_name = "Life support"
            
        out["EQUIPMENT"].append({
            "id": "sys_" + slugify(name),
            "name": name,
            "category": "Accommodations",
            "group": group_name,"""

content = content.replace("""        out["EQUIPMENT"].append({
            "id": "sys_" + slugify(name),
            "name": name,
            "category": "Accommodations",
            "group": "Accommodations",""", patch)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
