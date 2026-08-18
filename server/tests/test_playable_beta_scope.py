from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_playable_beta_exposes_local_and_online_modes():
    response=client.get("/")
    assert response.status_code==200

    html=response.text
    assert 'id="local-play-start"' in html
    assert 'id="online-play-prepare"' in html
    assert "Tek Oyunculu Test Maçı" in html
    assert "Online PvP" in html
    assert 'data-open-screen="education"' not in html
    assert 'id="active-match-mode"' in html
    assert 'id="player-core-summary"' in html
