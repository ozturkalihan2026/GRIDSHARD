from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_shared_shell_and_independent_engagement_pages_markup():
    response=client.get("/")
    assert response.status_code==200
    html=response.text
    assert html.count('data-open-screen="play"')==1
    assert html.count('data-open-screen="profile"')==1
    assert html.count('data-open-screen="statistics"')==1
    assert html.count('data-open-screen="settings"')==1
    assert html.count('data-open-screen="daily"')==1
    assert html.count('data-open-screen="rewards"')==1
    assert 'data-open-screen="education"' not in html
    assert html.count('data-menu-focus=') == 0
    assert html.count('data-shell-screen=') == 4
    assert html.count('data-roadmap-feature=') == 2
    assert html.count('data-open-screen="laboratory"') == 1
    assert "Olay Günlüğü" in html
    assert '<details class="diagnostic-panel play-technical-panel"' in html
    assert "screen-subtitle" in html
