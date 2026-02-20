import pytest
import re
from playwright.sync_api import Page, expect

def test_hangar_load(page: Page):
    """Test loading a stock ship from the Hangar."""
    page.goto("/swse/")

    # Increase timeout for initial load
    page.wait_for_selector("#q-app", state="visible", timeout=60000)

    # Handle Hangar Dialog which may auto-open
    # Wait for either the dialog or the main UI empty state
    # We check for the dialog first as it's the default behavior on fresh session
    try:
        page.wait_for_selector("#hangar-dialog-card", state="visible", timeout=10000)
        # If visible, ensure we can interact with it
    except:
        # If not visible, open it
        if page.is_visible("button:has-text('Open Hangar')"):
             page.click("button:has-text('Open Hangar')")
        else:
             # Fallback, maybe it's closed but button is not "Open Hangar" (e.g. icon button)
             page.click("#tour-hangar-btn")
        page.wait_for_selector("#hangar-dialog-card", state="visible", timeout=10000)

    page.click("#hangar-tab-stock")
    page.wait_for_selector("text=Light Fighter", state="visible")
    page.click("text=Light Fighter")

    expect(page.locator("#tour-stats-panel")).to_contain_text("Light Fighter")
    expect(page.locator("#tour-stats-panel")).to_contain_text("Huge Starship")

def test_systems_add(page: Page):
    """Test adding a component (Laser Cannon) to the ship."""
    page.goto("/swse/")
    page.wait_for_selector("#q-app", state="visible", timeout=60000)

    # Ensure a ship is loaded
    try:
        page.wait_for_selector("#hangar-dialog-card", state="visible", timeout=5000)
        page.click("#hangar-tab-stock")
        page.click("text=Light Fighter")
    except:
        if page.is_visible("text=No Ship Loaded") or page.is_visible("button:has-text('Open Hangar')"):
            page.click("button:has-text('Open Hangar')")
            page.wait_for_selector("#hangar-dialog-card", state="visible", timeout=10000)
            page.click("#hangar-tab-stock")
            page.click("text=Light Fighter")
        elif not page.is_visible("text=Light Fighter"):
             # Try to open hangar if not obvious
             page.click("#tour-hangar-btn")
             page.wait_for_selector("#hangar-dialog-card", state="visible", timeout=10000)
             page.click("#hangar-tab-stock")
             page.click("text=Light Fighter")

    page.click("#tour-add-btn")
    page.wait_for_selector("text=Install System", state="visible", timeout=10000)

    # Select Category
    page.locator(".q-field__control").filter(has=page.locator(".q-field__label", has_text="Category")).click()
    page.wait_for_selector(".q-menu", state="visible")
    page.click("div[role='option']:has-text('Weapon Systems')")

    # Select Group
    page.locator(".q-field__control").filter(has=page.locator(".q-field__label", has_text="System Type")).click()
    page.wait_for_selector(".q-menu", state="visible")
    page.click("div[role='option']:has-text('Laser Cannons')")

    # Select Component
    page.locator(".q-field__control").filter(has=page.locator(".q-field__label", has_text=re.compile(r"^Component$"))).click()
    page.wait_for_selector(".q-menu", state="visible")
    page.click("div[role='option']:has-text('Laser Cannon, Light')")

    page.click("button:has-text('Install')")

    expect(page.locator("#tour-system-list")).to_contain_text("Laser Cannon, Light")

def test_custom_ship(page: Page):
    """Test creating a custom ship via Library Manager."""
    page.goto("/swse/")
    page.wait_for_selector("#q-app", state="visible", timeout=60000)

    # Close Hangar Dialog if open
    if page.is_visible("#hangar-dialog-card"):
        page.keyboard.press("Escape")
        page.wait_for_selector("#hangar-dialog-card", state="hidden")

    # Open Library
    if page.is_visible("button:has-text('Custom Lib')"):
        page.click("button:has-text('Custom Lib')")
    else:
        if page.is_visible("button[icon='more_vert']"):
             page.click("button[icon='more_vert']")
             page.click("div:has-text('Custom Lib')")

    page.wait_for_selector("text=Library Manager", state="visible", timeout=10000)

    if page.is_visible("text=No libraries loaded."):
        page.click("button:has-text('New Library')")

    if not page.is_visible("button:has-text('New Ship')"):
        page.click(".q-expansion-item")

    page.click("button:has-text('New Ship')")

    page.wait_for_selector("text=Create Custom Ship", state="visible", timeout=10000)
    page.fill("input[aria-label='Ship Class']", "My Custom Ship")
    page.click("button:has-text('Create')")

    page.wait_for_selector("text=Create Custom Ship", state="hidden")

    page.keyboard.press("Escape")
    page.wait_for_selector("text=Library Manager", state="hidden")

    page.click("#tour-hangar-btn")
    page.wait_for_selector("#hangar-dialog-card", state="visible", timeout=10000)
    page.click("#hangar-tab-stock")

    # Scroll to find it if needed or just click
    page.click("text=My Custom Ship")

    expect(page.locator("#tour-stats-panel")).to_contain_text("My Custom Ship")
