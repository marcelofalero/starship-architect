import requests
url = "https://api.taiga.io/api/v1/auth"
res = requests.post(url, json={"type": "normal", "username": "mfalero@dimble.net", "password": "3?J]WW-;Y;J]c8>"}).json()
auth_token = res.get('auth_token')
headers = {"Authorization": f"Bearer {auth_token}"}
projects = requests.get("https://api.taiga.io/api/v1/projects?member=me", headers=headers).json()
for p in projects:
    print(f"ID: {p['id']}, Name: {p['name']}, Slug: {p['slug']}")
