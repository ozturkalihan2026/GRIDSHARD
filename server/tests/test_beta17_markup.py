from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta17_audio_preview_loadout_filter_and_human_review_markup():
    html=client.get("/").text

    assert 'id="settings-preview-music"' in html
    assert 'id="settings-preview-sfx"' in html
    assert 'id="battle-pool-preset-open"' in html
    assert 'id="battle-pool-preset-dialog"' in html
    assert 'id="initial-module-picker"' in html
    assert 'id="human-review-items"' in html
    assert "+ ile ekle, − ile çıkar" in html
