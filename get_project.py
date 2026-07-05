import requests
url = "https://api.taiga.io/api/v1/auth"
payload = {
    "type": "normal",
    "username": "mfalero@dimble.net",
    "password": "3?J]WW-;Y;J]c8>"
}
res = requests.post(url, json=payload).json()
auth_token = res.get('auth_token')
if auth_token:
    headers = {"Authorization": f"Bearer {auth_token}"}
    projects = requests.get("https://api.taiga.io/api/v1/projects", headers=headers).json()
    for p in projects:
        print(f"ID: {p['id']}, Name: {p['name']}, Slug: {p['slug']}")
else:
    print(res)
