import pytest
from playwright.sync_api import Page, expect

def test_hexmap_panel_visibility(page: Page):
    # Log all console messages
    page.on("console", lambda msg: print(f"\nBROWSER CONSOLE [{msg.type}]: {msg.text}"))
    page.on("pageerror", lambda err: print(f"\nBROWSER ERROR: {err}"))

    # Go to hexmap page
    page.goto("/hexmap/")
    
    # Wait for the canvas to be visible
    page.wait_for_selector("#hex-canvas", state="visible", timeout=10000)
    
    # Let the page load completely and render
    page.wait_for_timeout(2000)
    
    # Get bounding box of the canvas to click in the center
    canvas = page.locator("#hex-canvas")
    box = canvas.bounding_box()
    assert box is not None, "Canvas bounding box is None"
    
    center_x = box["x"] + box["width"] / 2
    center_y = box["y"] + box["height"] / 2
    
    print(f"\nCanvas box: {box}")
    print(f"Clicking at center: ({center_x}, {center_y})")
    
    # Click at the center of the canvas
    page.mouse.click(center_x, center_y)
    
    # Wait a bit for transition/render
    page.wait_for_timeout(1000)
    
    # Check info panel class
    info_panel = page.locator("#info-panel")
    classes = info_panel.evaluate("el => el.className")
    style = info_panel.evaluate("el => el.getAttribute('style')")
    
    print(f"\ninfo-panel classes: {classes}")
    print(f"info-panel style: {style}")
    
    # We expect info-panel to have 'visible' class
    expect(info_panel).to_have_class("visible")


def test_hexmap_fog_of_war_and_roles(page: Page):
    # 1. GM Role
    page.goto("/hexmap/?role=gm&seed=Sol_III&resolution=3")
    page.wait_for_selector("#hex-canvas", state="visible", timeout=10000)
    page.wait_for_timeout(1000)
    
    # Verify GM edit feature select is in the DOM and visible
    edit_feature = page.locator("#edit-feature")
    expect(edit_feature).to_be_visible()
    
    # 2. Player Role
    page.goto("/hexmap/?role=player&seed=Sol_III&resolution=3")
    page.wait_for_selector("#hex-canvas", state="visible", timeout=10000)
    page.wait_for_timeout(1000)
    
    # Verify GM edit feature select parent is hidden
    edit_feature_row = page.locator("#edit-feature").locator("..")
    expect(edit_feature_row).to_be_hidden()
    
    # Click canvas center to select a tile
    canvas = page.locator("#hex-canvas")
    box = canvas.bounding_box()
    center_x = box["x"] + box["width"] / 2
    center_y = box["y"] + box["height"] / 2
    page.mouse.click(center_x, center_y)
    page.wait_for_timeout(500)
    
    # Scan button should be visible for Player
    scan_btn = page.locator("#feature-action-btn")
    expect(scan_btn).to_be_visible()
    assert scan_btn.inner_text() == "SCAN SECTOR"


def test_hexmap_gm_toggle_and_multiselect(page: Page):
    # Log console messages
    page.on("console", lambda msg: print(f"\nBROWSER CONSOLE [{msg.type}]: {msg.text}"))
    page.on("pageerror", lambda err: print(f"\nBROWSER ERROR: {err}"))

    # 1. GM Role
    page.goto("/hexmap/?role=gm&seed=Sol_III&resolution=3")
    page.wait_for_selector("#hex-canvas", state="visible", timeout=10000)
    page.wait_for_timeout(1000)

    # GM Edit Mode checkbox container should be visible
    gm_toggle_container = page.locator("#gm-toggle-container")
    expect(gm_toggle_container).to_be_visible()

    # The checkbox should be checked by default for GM
    gm_toggle_mode = page.locator("#gm-toggle-mode")
    expect(gm_toggle_mode).to_be_checked()

    # Uncheck it
    gm_toggle_mode.uncheck()
    page.wait_for_timeout(500)
    
    # Programmatically select a cell
    page.evaluate("window.triggerSelectCell(562)")
    page.wait_for_timeout(500)

    # GM edit controls should be hidden since we toggled GM mode off
    edit_feature_row = page.locator("#edit-feature").locator("..")
    expect(edit_feature_row).to_be_hidden()

    # Toggle it back on
    gm_toggle_mode.check()
    page.wait_for_timeout(500)
    expect(edit_feature_row).to_be_visible()

    # Programmatically multiselect a second cell (Ctrl + select)
    page.evaluate("window.triggerSelectCell(566, true)")
    page.wait_for_timeout(500)

    # Header Title should indicate multiple selection
    detail_title = page.locator("#hex-coord-title")
    expect(detail_title).to_contain_text("2 Cells Selected")

    # Let's select Town (Lvl 2) in the Faction dropdown
    edit_faction = page.locator("#edit-faction")
    edit_faction.select_option("2")
    page.wait_for_timeout(1000)

    # Programmatically select only the first cell and verify it has Town (Lvl 2)
    page.evaluate("window.triggerSelectCell(562)")
    page.wait_for_timeout(500)
    expect(edit_faction).to_have_value("2")



