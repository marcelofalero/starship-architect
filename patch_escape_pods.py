import json

def patch_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if 'EQUIPMENT' in data:
            equipment_list = data['EQUIPMENT']
        elif 'MISC_SYSTEMS' in data:
            equipment_list = data['MISC_SYSTEMS']
        else:
            return
            
        for item in equipment_list:
            if item.get('id') == 'misc_escape_pod':
                item.setdefault('stats', {})['escape_pod_capacity'] = 10
            elif item.get('id') == 'misc_evac_system':
                item.setdefault('stats', {})['escape_pod_capacity'] = 40
            elif item.get('id') == 'misc_extra_pods':
                item.setdefault('stats', {})['escape_pod_capacity'] = 20
                
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Patched {filepath}")
    except Exception as e:
        print(f"Error patching {filepath}: {e}")

patch_file('public/warships/data.json')
patch_file('public/warships/raw_data.json')
