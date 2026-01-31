from playwright.sync_api import sync_playwright, expect
import time

def run(page):
    page.goto("http://localhost:3000")

    # Wait for app to load
    page.wait_for_selector(".q-page")

    # 1. Open Add Component Dialog
    page.locator("button .q-icon").filter(has_text="add").click()

    # 2. Select Category: Weapon Systems
    page.get_by_label("Category").click()
    page.get_by_role("option", name="Weapon Systems").click()

    # 3. Select Group: Ion Weapons
    page.get_by_label("System Type").click()
    page.get_by_role("option", name="Ion Weapons").click()

    # 4. Open Component Dropdown
    page.get_by_label("Component", exact=True).click()

    # Take screenshot of the dropdown showing options with EP and badges
    # Heavy Ion Cannon should be in the list (Military availability).
    page.get_by_role("option", name="Heavy Ion Cannon").first.wait_for()
    page.screenshot(path="verification/1_dropdown.png")

    # 5. Select Heavy Ion Cannon (Invalid Size for Light Fighter, Military)
    page.get_by_role("option", name="Heavy Ion Cannon").first.click()

    # 6. Verify Preview Card
    # Should show Military badge, Invalid Size badge/icon.
    time.sleep(0.5) # Wait for animation
    page.screenshot(path="verification/2_preview_card.png")

    # 7. Install
    page.get_by_role("button", name="Install").click()

    # 8. Handle Warning Dialog (Invalid Size)
    page.get_by_role("button", name="OK").click()

    # 9. Verify Installed List
    # Should show Military badge and Invalid Size icon in list.
    time.sleep(0.5)
    page.screenshot(path="verification/3_installed_list.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            run(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
