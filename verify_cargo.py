from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 1024})
    page = context.new_page()

    try:
        # Load the app
        page.goto("http://localhost:8080")

        # Wait for app to load
        page.wait_for_selector("text=New Ship")

        # Create a new ship: Light Freighter
        page.click("text=New Ship")
        page.click("div.q-item:has-text('Light Freighter')")

        # Close Sheet if open? No, it's not open by default.

        # Install Cargo Pod (Small)
        page.click("button.bg-positive") # Add component
        page.wait_for_selector("text=Install System")
        page.wait_for_timeout(500)

        # Category: Starship Accessories
        page.click(".q-field:has-text('Category')")
        page.click("div.q-item__label:has-text('Starship Accessories')")

        # Type: Storage
        page.wait_for_timeout(500)
        page.click(".q-field:has-text('System Type')")
        page.click("div.q-item__label:has-text('Storage')")

        # Component: Cargo Pod (Small)
        page.wait_for_timeout(500)
        page.click(".q-field:has-text('Component')")
        page.click("div.q-item__label:has-text('Cargo Pod (Small)')")

        # Install
        page.click("button:has-text('Install')")
        page.wait_for_timeout(500)

        # Check New Cargo in Sheet
        page.click("text=Sheet")
        page.wait_for_selector("text=Cargo")

        # Light Freighter (Colossal Transport) Size Mod is 5.
        # Pod adds 1 * 5 = 5 tons.
        # Base 100. Total 105.

        if page.locator("text=Cargo 105 tons").count() > 0:
            print("SUCCESS: Cargo Pod Verified: 105 tons")
        else:
            print("FAILURE: Cargo Pod Incorrect")
            # Dump relevant text
            print(page.locator(".sheet-body").inner_text())

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="error_cargo.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
