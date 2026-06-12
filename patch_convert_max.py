import re

with open("scripts/convert_data.py", "r", encoding="utf-8") as f:
    content = f.read()

patch = """        hull_cost_str = str(item.get("Hull", "1"))
        if "+" in hull_cost_str:
            hull = {"type": "pct", "base": 2, "val": 0.01, "max": 10} # Command Deck is +1 per 100 hull points (1%)"""

content = content.replace("""        hull_cost_str = str(item.get("Hull", "1"))
        if "+" in hull_cost_str:
            hull = {"type": "pct", "base": 2, "val": 0.01} # Command Deck is +1 per 100 hull points (1%)""", patch)

with open("scripts/convert_data.py", "w", encoding="utf-8") as f:
    f.write(content)
