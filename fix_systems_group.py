with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('"category": "Systems",', '"category": "Systems",\n            "group": "Support Systems",')

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
