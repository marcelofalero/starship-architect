from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8080")

    # Wait for app to load
    page.wait_for_selector("#q-app")

    # Click Sheet button
    # It has icon "description".
    page.locator("button:has(.q-icon:text('description'))").first.click()

    # Wait for dialog
    expect(page.locator(".q-dialog")).to_be_visible()

    # Wait for sheet content
    expect(page.locator(".swse-block")).to_be_visible()

    # Take screenshot of the sheet
    # We can screenshot just the card or the whole page
    page.locator(".q-dialog .q-card").screenshot(path="verification/sheet_style.png")

    print("Sheet verification screenshot taken.")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        run(p)
