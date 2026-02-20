import pytest
from playwright.sync_api import Page

@pytest.fixture(scope="function", autouse=True)
def disable_tutorial(page: Page):
    # Disable tutorial by setting localStorage keys
    # We use add_init_script so it runs before any script on the page
    page.add_init_script("""
        window.localStorage.setItem('swse_tutorial_completed', 'true');
        window.localStorage.setItem('swse_tutorial_part1_completed', 'true');
    """)
