import json

try:
    with open('data.json', 'r') as f:
        json.load(f)
    print("data.json is valid.")
except Exception as e:
    print(f"data.json is invalid: {e}")
