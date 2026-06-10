import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("    import json\n", "")

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
