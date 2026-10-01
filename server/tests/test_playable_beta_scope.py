from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_playable_beta_uses_server_matchmaking_not_retired_local_launch_controls():
    response = client.get("/")
    assert response.status_code == 200
    html = response.text
    assert 'id="local-play-start"' not in html
    assert 'id="online-play-prepare"' not in html
    assert 'id="home-battle-button"' in html
    assert 'id="active-match-mode"' in html
    assert 'id="player-core-summary"' in html
    assert 'data-open-screen="education"' not in html
    # AI-only versus human matchmaking is a server policy, not a stale 10s UI string.
    assert '"/matchmaking/join"' in client.get("/src/relay-client.js").text
