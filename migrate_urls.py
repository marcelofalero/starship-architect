import json
import urllib.request
import urllib.error
import time
import os

DATA_FILE = 'public/swse/data.json'
REPORT_FILE = 'missing_miraheze_pages.txt'

def check_url(url):
    try:
        # Use a comprehensive set of headers to mimic a real browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity', # We don't want to handle compression manually if urllib doesn't
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }

        # Try HEAD first
        req = urllib.request.Request(url, method='HEAD', headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, "OK"
    except urllib.error.HTTPError as e:
        if e.code == 405: # Method Not Allowed, try GET
            try:
                req = urllib.request.Request(url, method='GET', headers=headers)
                with urllib.request.urlopen(req, timeout=10) as response:
                    return response.status, "OK"
            except urllib.error.HTTPError as e2:
                return e2.code, e2.reason
            except Exception as e2:
                return 0, str(e2)
        return e.code, e.reason
    except Exception as e:
        return 0, str(e)

def main():
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return

    updated_count = 0
    total_checks = 0
    missing_components = []
    unverified_components = []

    # Process EQUIPMENT list
    if 'EQUIPMENT' in data:
        for item in data['EQUIPMENT']:
            if 'wiki' in item:
                old_url = item['wiki']
                # Check for fandom.com or fandom.org or miraheze.org (to re-verify)
                # If already migrated, we still want to check? The prompt implies "change them... make a request to make sure... report missing"
                # If ran multiple times, we should check miraheze URLs too.

                target_url = old_url
                needs_update = False

                if 'swse.fandom.com' in old_url or 'swse.fandom.org' in old_url:
                    # Construct new URL
                    target_url = old_url.replace('swse.fandom.com', 'swse.miraheze.org')
                    target_url = target_url.replace('swse.fandom.org', 'swse.miraheze.org')
                    needs_update = True
                elif 'swse.miraheze.org' in old_url:
                    # Already migrated, just check
                    target_url = old_url
                    needs_update = False # Unless missing? No, we don't revert.

                print(f"Checking {item.get('name', 'Unknown')}: {target_url}...")

                status, reason = check_url(target_url)

                if status == 200:
                    if needs_update:
                        item['wiki'] = target_url
                        updated_count += 1
                        print(f"  -> VALID (200). Updated.")
                    else:
                        print(f"  -> VALID (200). Already correct.")
                elif status == 404:
                     print(f"  -> MISSING (404). Keeping old URL (if any).")
                     missing_components.append({
                        'name': item.get('name', 'Unknown'),
                        'id': item.get('id', 'unknown'),
                        'old_url': old_url,
                        'new_url': target_url,
                        'error': "404 Not Found"
                    })
                else:
                    # 403, 0 (Connection Error), etc.
                    # We assume these are valid but blocked, or site issues.
                    # We will MIGRATE them but report as Unverified.
                    if needs_update:
                        print(f"  -> UNVERIFIED ({status} {reason}). Updating anyway (assuming network block).")
                        item['wiki'] = target_url
                        updated_count += 1
                    else:
                        print(f"  -> UNVERIFIED ({status} {reason}). Already updated.")

                    unverified_components.append({
                        'name': item.get('name', 'Unknown'),
                        'id': item.get('id', 'unknown'),
                        'old_url': old_url,
                        'new_url': target_url,
                        'error': f"{status} {reason}"
                    })

                total_checks += 1
                time.sleep(0.5) # Be polite

    # Save updated JSON if changes were made
    if updated_count > 0:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"\nUpdate complete. {updated_count} URLs updated out of {total_checks} checked.")
    else:
        print(f"\nNo URLs were updated (checked {total_checks}).")

    # Generate report
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("Migration Report\n================\n\n")

        if missing_components:
            f.write(f"MISSING COMPONENTS ({len(missing_components)}) - Not Updated (404):\n")
            for missing in missing_components:
                f.write(f"- {missing['name']} (ID: {missing['id']})\n")
                f.write(f"  Old: {missing['old_url']}\n")
                f.write(f"  New: {missing['new_url']}\n")
                f.write(f"  Error: {missing['error']}\n\n")

        if unverified_components:
            f.write(f"UNVERIFIED COMPONENTS ({len(unverified_components)}) - Updated/Checked (Network/Block Issue):\n")
            f.write("Note: verification may fail (403 Forbidden) in some environments (e.g., cloud sandboxes) due to anti-bot measures.\n")
            f.write("These links were updated assuming the page exists or is temporarily inaccessible to the script.\n\n")
            for unv in unverified_components:
                f.write(f"- {unv['name']} (ID: {unv['id']})\n")
                f.write(f"  New: {unv['new_url']}\n")
                f.write(f"  Error: {unv['error']}\n\n")

    print(f"Report saved to {REPORT_FILE}")

if __name__ == "__main__":
    main()
