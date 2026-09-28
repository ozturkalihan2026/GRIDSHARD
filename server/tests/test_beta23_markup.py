from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta23_menu_and_dual_battle_markup():
    html=client.get('/').text
    # Eski lobi başlıkları kaldırıldı; Ev ekranı mobil savaş merkezidir.
    assert 'GRIDSHARD 2.0</h1>' not in html
    assert 'id="main-menu-title"' not in html
    assert 'class="mobile-home-hub"' in html
    assert 'menu-action-index' not in html
    assert 'id="enemy-board"' in html
    assert 'id="battle-settings-button"' in html
    assert 'id="battle-time"' in html
    assert 'Beta.39 · 6 Kartlık Deste · Sunucu Yerleşimi' in html
