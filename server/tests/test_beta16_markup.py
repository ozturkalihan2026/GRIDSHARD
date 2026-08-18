from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta16_audio_and_quick_loadout_markup():
    html=client.get("/").text
    assert 'id="settings-sound-muted"' in html
    assert 'id="settings-music-muted"' in html
    assert 'id="quick-loadout-gallery"' in html
    assert 'id="quick-loadout-status"' in html
