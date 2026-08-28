from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta7_battle_pool_builder_and_settings_status_exist():
    response=client.get("/")
    assert response.status_code==200

    html=response.text
    assert 'id="battle-pool-selection"' in html
    assert 'id="battle-pool-detail"' in html
    assert 'id="battle-pool-selected"' in html
    assert 'id="battle-pool-toggle-selected"' not in html
    assert 'id="battle-pool-preset-select"' in html
    assert 'id="battle-pool-confirm"' in html
    assert 'id="settings-save-status"' not in html
    assert 'id="settings-persistence-status"' in html
    assert "BAŞLANGIÇ STRATEJİNİ SEÇ" in html
