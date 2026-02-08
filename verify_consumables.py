from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # Navigate
        page.goto("http://localhost:8000/public/")
        page.wait_for_selector("#app-loading", state="hidden", timeout=10000)

        # 1. Check initial consumables
        left_drawer = page.locator(".q-drawer--left")

        # Current default light_fighter has "2 days" in data.json
        # The new formatter should likely output "2 days"
        page.wait_for_timeout(1000)
        initial_cons = left_drawer.get_by_text("Consumables").locator("xpath=following-sibling::div").text_content()
        print(f"Initial Consumables: {initial_cons}")

        # 2. Add Extended Range
        # Click "Hangar" to ensure we are on a ship (default is light_fighter)
        # Click "Add System" button in SystemList
        page.get_by_role("button", name="add").click()

        # In Dialog
        # Use Search
        page.get_by_label("Search Component").fill("Extended Range")
        page.get_by_role("option", name="Extended Range").click()

        # Verify Cost/EP in preview
        # baseEp should be 1
        preview_ep = page.locator(".text-caption.text-positive").text_content()
        print(f"Preview EP: {preview_ep}")
        if "1 EP" not in preview_ep:
            print("ERROR: EP cost is not 1!")

        # Install
        page.get_by_role("button", name="Install").click()

        # Check Consumables Update
        # 2 days + max(floor(2*0.1), 1) = 2 + 1 = 3 days
        page.wait_for_timeout(1000)
        updated_cons = left_drawer.get_by_text("Consumables").locator("xpath=following-sibling::div").text_content()
        print(f"Updated Consumables (1x ExtRange): {updated_cons}")

        if "3 days" not in updated_cons:
             print("ERROR: Consumables did not update correctly to 3 days.")

        # 3. Add Another Extended Range (Stacking)
        # Edit the installed component
        # Find "Extended Range" in list
        ext_range_item = page.locator(".q-item", has_text="Extended Range")
        ext_range_item.locator("button .q-icon[name='settings']").click() # Settings button

        # Change Quantity to 2
        page.get_by_label("Quantity").fill("2")
        page.keyboard.press("Enter")
        page.get_by_role("button", name="Close").click()

        # Check Consumables Update
        # 2 days + (1 * 2) = 4 days
        page.wait_for_timeout(1000)
        updated_cons_2 = left_drawer.get_by_text("Consumables").locator("xpath=following-sibling::div").text_content()
        print(f"Updated Consumables (2x ExtRange): {updated_cons_2}")

        if "4 days" not in updated_cons_2:
             print("ERROR: Consumables did not update correctly to 4 days.")

        browser.close()

if __name__ == "__main__":
    run()
