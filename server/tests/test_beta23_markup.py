from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta23_menu_and_dual_battle_markup():
    html=client.get('/').text
    assert '<h1>GRIDSHARD</h1>' in html
    assert 'GRIDSHARD 2.0</h1>' not in html
    assert '<h2 id="main-menu-title">GRIDSHARD</h2>' in html
    assert 'menu-action-index' not in html
    assert 'id="enemy-board"' in html
    assert 'id="battle-settings-button"' in html
    assert 'id="battle-time"' in html
    assert 'Beta.38.1 · Savaş Olayları · Ses Kurtarma · Özgür Güçlendirici Hedefleme' in html
