from playwright.sync_api import sync_playwright
import time

def verify_logistics_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set large viewport
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        # 1. Open the app
        page.goto("http://localhost:8080/index.html")

        # 2. Check Light Fighter stats (Default)
        # Should see Crew, Pass, Esc. Pods in left panel
        # Left panel is StatPanel.
        page.wait_for_selector("text=Crew", timeout=2000)

        # Verify values for Light Fighter (Crew 1, Pass 0, Pods should be 1? or 0? 1/8 rounded up = 1)
        # But wait, does Light Fighter HAVE escape pods?
        # Non-Colossal ships logic:
        # hasEscapePods = false.
        # escapePodCount = Math.ceil(TotalPop / 8).
        # So yes, it should show 1.

        print("Checking Light Fighter Logistics...")
        crew_el = page.locator(".text-center:has-text('Crew') .text-white").first
        pass_el = page.locator(".text-center:has-text('Pass') .text-white").first
        pods_el = page.locator(".text-center:has-text('Esc. Pods') .text-white").first

        print(f"Crew: {crew_el.inner_text()}")
        print(f"Pass: {pass_el.inner_text()}")
        print(f"Pods: {pods_el.inner_text()}")

        # 3. Add Passenger Conversion
        # Open Add Dialog
        # We need to click the add button in SystemList.
        page.click("button:has(i:has-text('add'))")

        # Wait for dialog
        page.wait_for_selector("text=Install System", timeout=2000)

        # Search "Passenger"
        page.fill("input[aria-label='Search Component']", "Passenger Conversion")
        page.click("div.q-item__label:has-text('Passenger Conversion')")

        # Click Install
        page.click("button:has-text('Install')")

        # Wait for update
        time.sleep(1)

        # Check Updated Logistics
        # Passenger Conversion usually adds passengers.
        # Let's see how much it adds.
        # Light Fighter is Huge. Multiplier 1.
        # Pass should increase by 1.

        print("Checking Logistics after Passenger Conversion...")
        print(f"Crew: {crew_el.inner_text()}")
        print(f"Pass: {pass_el.inner_text()}")
        print(f"Pods: {pods_el.inner_text()}")

        # 4. Take screenshot
        page.screenshot(path="verification_logistics.png")
        print("Screenshot saved to verification_logistics.png")

        browser.close()

if __name__ == "__main__":
    verify_logistics_ui()
