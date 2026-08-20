from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta15_completes_gridshard_lobby_decisions():
    html=client.get("/").text

    assert 'class="lobby-board-grid"' in html
    assert html.count(
        "<span></span>"
    ) >= 20
    assert '<span class="lobby-subtitle">CORE ARENA</span>' in html
    assert "Tek Oyunculu · Dereceli PvP" not in html
    assert 'id="lobby-player-name"' in html
    assert 'id="lobby-player-details"' in html
    assert "Lig: Gümüş" in html
    assert "SAVAŞ ARŞİVİ" in html
    assert "SİSTEM KONSOLU" in html


def test_beta15_uses_preset_card_gallery():
    html=client.get("/").text

    assert 'id="battle-pool-preset-gallery"' in html
    assert 'id="battle-pool-preset-new"' in html
    assert 'class="preset-compat-select"' in html
