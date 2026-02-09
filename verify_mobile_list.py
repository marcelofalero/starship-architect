from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Mobile viewport
        context = browser.new_context(viewport={'width': 375, 'height': 667})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8000/public/swse/")

        # Disable tutorial
        page.evaluate("localStorage.setItem('swse_tutorial_completed', 'true')")
        page.reload()

        # Wait for app to load
        print("Waiting for app to load...")
        try:
            page.wait_for_selector("#q-app", state="visible", timeout=10000)
        except Exception as e:
            print("Timeout waiting for #q-app. Taking error screenshot.")
            page.screenshot(path="error_loading.png")
            raise e

        # Check for open drawers/backdrop and close them
        # Drawers might be open by default on some setups or if show-if-above logic is overridden by v-model init
        print("Checking for open drawers...")
        try:
            # Check for any visible backdrop
            backdrop = page.locator(".q-drawer__backdrop").first
            if backdrop.is_visible(timeout=3000):
                print("Drawer backdrop found. Clicking to close...")
                backdrop.click()
                page.wait_for_timeout(1000) # Wait for animation
        except:
            print("No visible drawer backdrop found.")

        # Wait for tabs to be visible
        print("Waiting for tabs...")
        page.wait_for_selector(".q-tabs", state="visible")

        # Click on Systems tab
        print("Clicking Systems tab...")
        try:
            # Locate the tab specifically within the tab bar
            # Force click if necessary
            page.locator(".q-tabs .q-tab").filter(has_text="Systems").click(force=True)
        except Exception as e:
             print(f"Could not click tab: {e}")
             page.screenshot(path="error_tab.png")
             raise e

        # Wait for the system list to appear
        print("Waiting for system list...")
        try:
            # Wait for at least one item
            page.wait_for_selector(".q-item", state="visible", timeout=5000)
        except Exception as e:
            print("Timeout waiting for items. Taking error screenshot.")
            page.screenshot(path="error_items.png")
            # Don't raise, verify counts

        print("Taking screenshot...")
        page.screenshot(path="mobile_systems_list.png")

        # Verify content exists
        items = page.locator(".q-item").count()
        print(f"Found {items} items in the list.")

        if items > 0:
            print("SUCCESS: Items are visible.")
        else:
            print("FAILURE: No items found.")

        browser.close()

if __name__ == "__main__":
    run()
