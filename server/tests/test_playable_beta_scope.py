from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_playable_beta_exposes_single_online_with_ai_fallback_mode():
    response=client.get("/")
    assert response.status_code==200

    html=response.text
    assert 'id="local-play-start"' not in html
    assert 'id="online-play-prepare"' not in html
    assert 'id="battle-pool-confirm" type="button" disabled>Savaş</button>' in html
    assert "10 sn AI Devralma" in html
    assert "Başlangıç Devresi · 4 Aktif" in html
    assert 'data-open-screen="education"' not in html
    assert 'id="active-match-mode"' in html
    assert 'id="player-core-summary"' in html
