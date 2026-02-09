from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # Navigate
        page.goto("http://localhost:8000/public/swse/")
        page.evaluate("localStorage.setItem('swse_tutorial_completed', 'true')")
        page.reload()
        page.wait_for_selector("#app-loading", state="hidden", timeout=10000)

        # 1. Check initial consumables
        left_drawer = page.locator(".q-drawer--left")

        # Current default light_fighter has "2 days" in data.json
        # The new formatter should likely output "2 days"
        page.wait_for_timeout(1000)
        # Using specific locator for consumables value
        cons_row = left_drawer.locator("div.row.justify-between.q-py-xs", has_text="Consumables")
        initial_cons = cons_row.locator("div").nth(1).text_content()
        print(f"Initial Consumables: {initial_cons}")

        # 2. Add Extended Range
        # Click "Add System" button in SystemList. It's a round button with icon 'add'
        # The button is inside SystemList.
        # Let's locate it by icon name or tooltip if available, or just class
        page.locator(".q-btn i:has-text('add')").click()

        # In Dialog
        # Use Search
        # Wait for dialog
        page.wait_for_selector(".q-dialog")

        # The search input is a q-select.
        # Click it to focus
        # page.locator("label[aria-label='Search Component']").click()
        page.get_by_label("Search Component").click()
        page.keyboard.type("Extended Range")

        # Select from dropdown
        page.locator(".q-item__label", has_text="Extended Range").first.click()

        # Verify Cost/EP in preview
        # baseEp should be 1
        # The preview card appears after selection
        page.wait_for_selector(".text-caption.text-positive")
        preview_ep = page.locator(".text-caption.text-positive").text_content()
        print(f"Preview EP: {preview_ep}")

        # Install
        # Button with label "Install"
        # page.locator("button span:has-text('Install')").click()
        page.get_by_role("button", name="Install").click()

        # Check Consumables Update
        # 2 days + max(floor(2*0.1), 1) = 2 + 1 = 3 days
        page.wait_for_timeout(1000)
        updated_cons = cons_row.locator("div").nth(1).text_content()
        print(f"Updated Consumables (1x ExtRange): {updated_cons}")

        # 3. Add Another Extended Range (Stacking) via Quantity modification on installed item
        # Find "Extended Range" in list
        # It's in the system list
        system_list = page.locator(".q-list")
        ext_range_item = system_list.locator(".q-item", has_text="Extended Range")

        # Click Settings button (icon 'settings')
        ext_range_item.locator("button i:has-text('settings')").click()

        # Dialog opens
        # Find Quantity input
        # It's a q-input with label Quantity
        # page.locator("label[aria-label='Quantity']").click()
        page.get_by_label("Quantity").click()
        page.keyboard.type("2")
        page.keyboard.press("Enter")

        # Close dialog
        # page.locator("button span:has-text('Close')").click()
        page.get_by_role("button", name="Close").click()

        # Check Consumables Update
        # 2 days + (1 * 2) = 4 days
        page.wait_for_timeout(1000)
        updated_cons_2 = cons_row.locator("div").nth(1).text_content()
        print(f"Updated Consumables (2x ExtRange): {updated_cons_2}")

        browser.close()

if __name__ == "__main__":
    run()
