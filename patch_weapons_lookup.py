import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

patch = """
        clean_name = re.sub(r'[*]+$', '', name).strip()
        if clean_name.endswith(" -"): clean_name = clean_name[:-2].strip()
        
        meta = weapon_meta.get(clean_name.lower(), {"type": "Other Weapons", "pl": "PL 6"})
"""

content = content.replace('        meta = weapon_meta.get(name.lower(), {"type": "Other Weapons", "pl": "PL 6"})', patch)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)

