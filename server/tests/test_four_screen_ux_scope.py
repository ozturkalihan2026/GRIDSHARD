from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_independent_profile_and_reward_pages_share_current_terminal_navigation():
    response = client.get("/")
    assert response.status_code == 200
    html = response.text
    assert html.count('data-shell-screen=') == 5
    for screen in ("profile", "avatar", "daily", "daily-missions", "rewards", "settings", "friends"):
        assert html.count(f'data-screen-panel="{screen}"') == 1
    for screen in ("profile", "avatar", "daily", "settings", "friends"):
        assert f'data-open-screen="{screen}"' in html
    assert 'id="daily-missions-screen"' in html
    assert 'id="season-rewards-screen"' in html
    assert 'data-open-screen="laboratory"' not in html
