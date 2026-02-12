import time
import os
import subprocess
import sys
from playwright.sync_api import sync_playwright

def verify_changes():
    # Start server
    server_process = subprocess.Popen([sys.executable, "-m", "http.server", "8000"], cwd=os.getcwd())
    time.sleep(2) # Give it a moment to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1280, 'height': 720})
            page = context.new_page()

            # Navigate to app
            page.goto("http://localhost:8000/public/swse/")

            # Bypass tutorial
            page.evaluate("localStorage.setItem('swse_tutorial_completed', 'true')")
            page.reload()

            # Wait for app to load
            page.wait_for_selector(".q-page", state="visible")
            time.sleep(1)

            # Open Custom Manager Dialog
            print("Clicking Custom Lib button...")
            page.get_by_role("button", name="Custom Lib").click()

            # Wait for dialog
            print("Waiting for Library Manager...")
            page.wait_for_selector("div.text-h6:has-text('Library Manager')")
            time.sleep(1)

            # Click "New Library" to add one
            print("Clicking New Library (Add button)...")
            page.get_by_role("button", name="New Library").click()
            time.sleep(1)

            # Expand library
            print("Expanding library...")
            page.locator(".q-expansion-item__toggle-icon").first.click()
            time.sleep(1)

            # Click "New Ship"
            print("Clicking New Ship...")
            # Use specific locator to exclude the header button (which apparently matches 'New Ship'??)
            # The header button has ID 'tour-hangar-btn'
            page.locator("button:has-text('New Ship'):not(#tour-hangar-btn)").click()

            # Wait for Custom Ship Dialog
            print("Waiting for Custom Ship Dialog...")
            page.wait_for_selector("div.text-h6:has-text('Create Custom Ship')")
            time.sleep(1)

            # Check for fields
            print("Checking for fields...")

            # Use get_by_label for inputs
            used_cost_field = page.get_by_label("Used Cost (cr)")
            availability_field = page.get_by_label("Availability")

            # Check visibility
            if used_cost_field.is_visible():
                print("PASS: 'Used Cost (cr)' field is visible.")
            else:
                print("FAIL: 'Used Cost (cr)' field is NOT visible.")

            if availability_field.is_visible():
                print("PASS: 'Availability' field is visible.")
            else:
                print("FAIL: 'Availability' field is NOT visible.")

            # Take screenshot
            page.screenshot(path="verification/verification.png")
            print("Screenshot taken: verification/verification.png")

    except Exception as e:
        print(f"Error during verification: {e}")
        try:
            page.screenshot(path="verification/error_screenshot.png")
            print("Error screenshot taken.")
        except:
            pass
    finally:
        server_process.terminate()

if __name__ == "__main__":
    verify_changes()
