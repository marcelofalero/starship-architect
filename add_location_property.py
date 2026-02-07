import json

def is_weapon(item):
    cat = item.get('category')
    return cat == 'Weapon Systems' or item.get('id') == 'sensor_decoy'

def is_engine(item):
    return item.get('group') == 'Sublight Drives' and 'stats' in item and 'speed' in item['stats']

def get_location(item):
    if is_weapon(item):
        return 'Hardpoint'
    if is_engine(item):
        return 'Aft Section'
    if item.get('category') in ['Modifications', 'Weapon Upgrades']:
        return 'Installed'
    if item.get('group') == 'Storage':
        return 'Cargo Hold'
    return 'Internal Bay'

def main():
    try:
        with open('data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        equipment = data.get('EQUIPMENT', [])

        for item in equipment:
            item['location'] = get_location(item)

        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

        print("Successfully added 'location' property to data.json")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
