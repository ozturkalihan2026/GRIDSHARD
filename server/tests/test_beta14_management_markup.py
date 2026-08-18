from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta14_preset_and_balance_draft_markup():
    html=client.get("/").text

    assert 'id="battle-pool-preset-rename"' in html
    assert 'id="battle-pool-active-preset"' in html
    assert 'id="battle-pool-preset-dirty"' in html
    assert 'id="balance-draft-items"' in html
    assert 'id="balance-draft-refresh"' in html
