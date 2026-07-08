import os
import httpx
import uuid
from playwright.sync_api import Page, expect

# Use same backend url resolver
BACKEND_URL = os.environ.get("BASE_URL", "http://backend:8787")

def create_session_tokens():
    with httpx.Client(base_url=BACKEND_URL, timeout=10.0) as client:
        # Create session with a custom ship directly (no authentication needed to create a session)
        resp = client.post("/sessions", json={
            "name": "UI Test Session",
            "visibility": "public",
            "data": {
                "ships": [
                    {
                        "name": "TestShip",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "description": "Test Ship"
                    }
                ]
            }
        })
        assert resp.status_code == 200
        return resp.json()["tokens"]

def test_vergemap_ro_permissions(page: Page):
    # 1. Get tokens
    tokens = create_session_tokens()
    ro_token = tokens["viewer"]
    
    # 2. Go to the vergemap page with the read-only token
    page.goto(f"/vergemap/?session={ro_token}")
    
    # Wait for the app/renderer to initialize (wait for the canvas-container to be visible)
    page.wait_for_selector("#canvas-container", state="visible", timeout=30000)
    
    # 3. Verify that the UI layers are set up correctly
    # Ship controls panel should be hidden
    ship_controls = page.locator("#panel-ship-controls")
    expect(ship_controls).to_be_hidden()
    
    # Plus button (+ button) to open create modal should not be visible
    open_create_btn = page.locator("#open-create-modal-btn")
    expect(open_create_btn).to_be_hidden()
    
    # Delete ship button should not be visible
    delete_ship_btn = page.locator("#delete-ship-btn")
    expect(delete_ship_btn).to_be_hidden()
    
    # 4. Try to trigger the travel UI by selecting a ship and a star in the distance calculator
    # Wait for the select options to be populated
    page.wait_for_selector("#star-a option[value='TestShip']", state="attached", timeout=10000)
    page.wait_for_selector("#star-b option[value='Krios']", state="attached", timeout=10000)
    
    # Select point A (TestShip) and point B (Krios)
    page.select_option("#star-a", value="TestShip")
    page.select_option("#star-b", value="Krios")
    
    # Click Calculate Distance
    page.click("button:has-text('Calculate Distance'), button:has-text('Calcular Distancia')")
    
    # Verify that the travel-ui is STILL not displayed/hidden
    travel_ui = page.locator("#travel-ui")
    expect(travel_ui).to_have_css("display", "none")

def test_vergemap_ownership_flow(page: Page):
    # 1. Get GM token
    tokens = create_session_tokens()
    gm_token = tokens["gm"]
    
    # 2. Go to Verge Map as GM
    page.goto(f"/vergemap/?session={gm_token}")
    page.wait_for_selector("#canvas-container", state="visible", timeout=30000)
    
    # 3. Open Create Entity Modal
    # The + button (#open-create-modal-btn) should be visible in GM mode
    page.wait_for_selector("#open-create-modal-btn", state="visible")
    page.click("#open-create-modal-btn")
    
    # Wait for Create modal to show
    page.wait_for_selector("#create-entity-modal", state="visible")
    
    # Verify the ownership selection is present and default is Players
    create_owner = page.locator("#create-entity-owner")
    expect(create_owner).to_be_visible()
    expect(create_owner).to_have_value("Players")
    
    # Type new ship name
    page.fill("#create-entity-name", "OwnerShip")
    
    # Change owner to GM
    page.select_option("#create-entity-owner", value="GM")
    
    # Fill description
    page.fill("#create-entity-desc", "Vessel owned by GM.")
    
    # Click Create
    page.click("#submit-create-entity-btn")
    
    # Wait for Create modal to hide
    page.wait_for_selector("#create-entity-modal", state="hidden")
    
    # 4. Search and select the newly created ship in search dropdown to open info panel
    page.wait_for_selector("#search-star option[value='OwnerShip']", state="attached", timeout=10000)
    page.select_option("#search-star", value="OwnerShip")
    
    # Wait for info panel to show details
    page.wait_for_selector("#info-panel", state="visible")
    
    # Verify the owner displays "GM"
    info_owner = page.locator("#info-owner")
    expect(info_owner).to_contain_text("GM")
    
    # 5. Open Edit modal
    edit_btn = page.locator("#edit-entity-btn")
    expect(edit_btn).to_be_visible()
    edit_btn.click()
    
    # Wait for Edit Modal
    page.wait_for_selector("#entity-editor-modal", state="visible")
    
    # Verify edit ownership selection is visible and has value GM
    edit_owner = page.locator("#edit-entity-owner")
    expect(edit_owner).to_be_visible()
    expect(edit_owner).to_have_value("GM")
    
    # Change ownership to Players
    page.select_option("#edit-entity-owner", value="Players")
    
    # Save edits
    page.click("#save-entity-btn")
    
    # Wait for Edit Modal to hide
    page.wait_for_selector("#entity-editor-modal", state="hidden")
    
    # Verify updated owner in info panel shows "Players"
    expect(info_owner).to_contain_text("Players")

def test_vergemap_move_ship_flow(page: Page):
    # 1. Get GM token
    tokens = create_session_tokens()
    gm_token = tokens["gm"]
    
    # 2. Go to Verge Map as GM
    page.goto(f"/vergemap/?session={gm_token}")
    page.wait_for_selector("#canvas-container", state="visible", timeout=30000)
    
    # 3. Select TestShip from search dropdown to open info panel
    page.wait_for_selector("#search-star option[value='TestShip']", state="attached", timeout=10000)
    page.select_option("#search-star", value="TestShip")
    
    # Wait for info panel to show details
    page.wait_for_selector("#info-panel", state="visible")
    
    # 4. Verify Move Ship button is visible and click it
    move_ship_btn = page.locator("#info-move-ship-btn")
    expect(move_ship_btn).to_be_visible()
    move_ship_btn.click()
    
    # Wait for Move Ship Modal
    page.wait_for_selector("#move-ship-modal", state="visible")
    
    # Check default type is Entity and target entity dropdown is visible
    expect(page.locator("#move-dest-type")).to_have_value("entity")
    expect(page.locator("#move-entity-select-group")).to_be_visible()
    
    # Since Krios is the first entity in the populated select list, coordinates
    # should be immediately pre-loaded to Krios's coordinates: X:-1, Y:38, Z:-10
    expect(page.locator("#move-coord-x")).to_have_value("-1")
    expect(page.locator("#move-coord-y")).to_have_value("38")
    expect(page.locator("#move-coord-z")).to_have_value("-10")
    
    # 5. Change Destination Type to Coordinates
    page.select_option("#move-dest-type", value="coordinates")
    
    # Select group should be hidden
    expect(page.locator("#move-entity-select-group")).to_be_hidden()
    
    # Change back to Entity
    page.select_option("#move-dest-type", value="entity")
    expect(page.locator("#move-entity-select-group")).to_be_visible()
    
    # Adjust coordinates (simulating "selecting how much to move")
    page.fill("#move-coord-x", "-2")
    
    # Click confirm move button
    page.click("#confirm-move-ship-btn")
    
    # Wait for Move Ship Modal to hide
    page.wait_for_selector("#move-ship-modal", state="hidden")
    
    # Check updated coordinates displayed on the info panel
    expect(page.locator("#info-coords")).to_contain_text("X:-2.00, Y:38.00, Z:-10.00")

def test_vergemap_move_here_and_log_flow(page: Page):
    # 1. Get GM token
    tokens = create_session_tokens()
    gm_token = tokens["gm"]
    
    # 2. Go to Verge Map as GM
    page.goto(f"/vergemap/?session={gm_token}")
    page.wait_for_selector("#canvas-container", state="visible", timeout=30000)
    
    # 3. Search and select a Star (Krios) to open its info panel
    page.wait_for_selector("#search-star option[value='Krios']", state="attached", timeout=10000)
    page.select_option("#search-star", value="Krios")
    
    # Wait for info panel to show details
    page.wait_for_selector("#info-panel", state="visible")
    
    # 4. Verify "Move Ship Here" button is visible and "Move Ship" is hidden
    move_here_btn = page.locator("#info-move-here-btn")
    move_ship_btn = page.locator("#info-move-ship-btn")
    expect(move_here_btn).to_be_visible()
    expect(move_ship_btn).to_be_hidden()
    
    # 5. Click "Move Ship Here" button
    move_here_btn.click()
    
    # Wait for Move Here Modal
    page.wait_for_selector("#move-here-modal", state="visible")
    
    # Verify selected ship is TestShip
    expect(page.locator("#move-here-ship-select")).to_have_value("TestShip")
    
    # Verify target name is Krios
    expect(page.locator("#move-here-target-name")).to_have_text("Krios")
    
    # Change travel distance to a partial value (e.g., 5.0)
    page.fill("#move-here-distance", "5.0")
    
    # Click confirm move button
    page.click("#confirm-move-here-btn")
    
    # Wait for Move Here Modal to hide
    page.wait_for_selector("#move-here-modal", state="hidden")
    
    # 6. Open Movement Log modal via the header log button
    log_btn = page.locator("#log-btn")
    expect(log_btn).to_be_visible()
    log_btn.click()
    
    # Wait for Log Modal
    page.wait_for_selector("#log-modal", state="visible")
    
    # Verify log list contains the movement entry
    log_list = page.locator("#movement-log-list")
    expect(log_list).to_contain_text("TestShip traveled 5.00 LY towards Krios")
    
    # Close Log Modal
    page.click("#close-log-modal-btn")
    page.wait_for_selector("#log-modal", state="hidden")
    
    # 7. Open Move Here modal again for Krios to verify the last moved ship preselection
    page.select_option("#search-star", value="")
    page.select_option("#search-star", value="Krios")
    page.wait_for_selector("#info-panel", state="visible")
    move_here_btn.click()
    
    page.wait_for_selector("#move-here-modal", state="visible")
    expect(page.locator("#move-here-ship-select")).to_have_value("TestShip")
    
    # Close Modal
    page.click("#cancel-move-here-btn")
    page.wait_for_selector("#move-here-modal", state="hidden")

def test_vergemap_move_poi_flow(page: Page):
    # 1. Get GM token
    tokens = create_session_tokens()
    gm_token = tokens["gm"]
    
    # 2. Go to Verge Map as GM
    page.goto(f"/vergemap/?session={gm_token}")
    page.wait_for_selector("#canvas-container", state="visible", timeout=30000)
    
    # 3. Create a POI via the "+" button
    page.wait_for_selector("#open-create-modal-btn", state="visible")
    page.click("#open-create-modal-btn")
    
    page.wait_for_selector("#create-entity-modal", state="visible")
    
    # Switch to POI tab
    page.click("#tab-poi")
    
    # Fill POI details
    page.fill("#create-entity-name", "MovableStation")
    page.fill("#create-entity-x", "10")
    page.fill("#create-entity-y", "10")
    page.fill("#create-entity-z", "10")
    
    page.click("#submit-create-entity-btn")
    page.wait_for_selector("#create-entity-modal", state="hidden")
    
    # 4. Search and select MovableStation
    page.wait_for_selector("#search-star option[value='MovableStation']", state="attached", timeout=10000)
    page.select_option("#search-star", value="MovableStation")
    
    # Wait for info panel
    page.wait_for_selector("#info-panel", state="visible")
    
    # 5. Verify "Move POI" button is visible and click it
    move_poi_btn = page.locator("#info-move-ship-btn")
    expect(move_poi_btn).to_be_visible()
    expect(move_poi_btn).to_contain_text("Move POI")
    move_poi_btn.click()
    
    # Wait for Move Ship Modal (which now shows Move POI)
    page.wait_for_selector("#move-ship-modal", state="visible")
    expect(page.locator("#move-ship-title-header")).to_contain_text("Move POI")
    
    # Select Target Entity: TestShip
    page.select_option("#move-entity-select", value="TestShip")
    
    # Click Confirm Move
    page.click("#confirm-move-ship-btn")
    page.wait_for_selector("#move-ship-modal", state="hidden")
    
    # Verify new coordinates on the info panel (TestShip is at X:0, Y:0, Z:0)
    expect(page.locator("#info-coords")).to_contain_text("X:0.00, Y:0.00, Z:0.00")
    
    # 6. Open Movement Log and check the entry
    page.click("#log-btn")
    page.wait_for_selector("#log-modal", state="visible")
    
    log_list = page.locator("#movement-log-list")
    expect(log_list).to_contain_text("MovableStation moved to TestShip (at X:0.00, Y:0.00, Z:0.00)")
    
    # Close Log Modal
    page.click("#close-log-modal-btn")




