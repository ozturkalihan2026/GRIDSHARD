from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta13_pool_preset_and_hp_markup():
    html=client.get("/").text

    assert 'id="battle-pool-preset-select"' in html
    assert 'id="battle-pool-preset-name"' in html
    assert 'id="battle-pool-preset-save"' in html
    assert 'id="battle-pool-toggle-selected"' not in html
