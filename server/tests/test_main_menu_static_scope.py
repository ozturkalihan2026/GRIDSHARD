from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_main_menu_and_shared_shell_keep_the_current_five_section_scope():
    response = client.get("/")
    assert response.status_code == 200
    html = response.text
    assert html.count('id="app-bottom-dock"') == 1
    for screen in ("shop", "modules", "menu", "team", "events"):
        assert html.count(f'data-shell-screen="{screen}"') == 1
    assert 'id="home-battle-button"' in html
    assert 'id="app-progress-ribbon"' in html
    assert 'id="lobby-circuit-credits"' in html
    assert '<span class="menu-action-title">EV</span>' in html
    for retired in ('data-open-screen="laboratory"', 'id="laboratory-screen"',
                    'data-roadmap-feature=', 'data-open-screen="education"'):
        assert retired not in html
