import requests
import json
import os

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8787")

def test_hardcoded_types():
    # Test that 'ship' works
    print(f"Testing 'ship' type against {BASE_URL}...")
    try:
        # We need a user. For now just checking if endpoint exists.
        # Actually without auth we get 401, which proves existence.
        resp = requests.get(f"{BASE_URL}/ships")
        print(f"/ships status: {resp.status_code}")

        # Test a non-existent type
        resp = requests.get(f"{BASE_URL}/unknowns")
        print(f"/unknowns status: {resp.status_code}")

    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_hardcoded_types()
