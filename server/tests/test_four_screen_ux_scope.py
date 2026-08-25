from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_four_screen_scope_and_ux_markup():
    response=client.get("/")
    assert response.status_code==200
    html=response.text
    assert html.count('data-open-screen="play"')==1
    assert html.count('data-open-screen="profile"')==1
    assert html.count('data-open-screen="statistics"')==1
    assert html.count('data-open-screen="settings"')==1
    assert 'data-open-screen="education"' not in html
    assert html.count('data-menu-focus=') == 2
    assert html.count('data-roadmap-feature=') == 3
    assert "Olay Günlüğü" in html
    assert '<details class="diagnostic-panel play-technical-panel"' in html
    assert "screen-subtitle" in html
