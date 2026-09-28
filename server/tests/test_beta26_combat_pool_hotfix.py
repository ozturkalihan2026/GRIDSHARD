from pathlib import Path
import re

from fastapi.testclient import TestClient

from app.main import app


ROOT = Path(__file__).resolve().parents[2]
client = TestClient(app)


def test_online_combat_fx_audio_and_enemy_board_scaffold_are_wired():
    source = client.get("/src/app.js").text

    assert "function processLocalServerEvents" in source
    assert 'triggerGridshardCue(' in source
    assert 'sourceModule?.definition_id' in source
    assert '"laser_fire"' in source
    assert '"shield_hit"' in source
    assert '"core_hit"' in source
    assert "if (!enemyBoard.children?.length)" in source
    assert "createEnemyBoard();" in source


def test_pool_categories_plus_minus_and_save_recovery_are_wired():
    source = client.get("/src/app.js").text
    css = client.get("/src/styles.css").text

    assert re.search(r'document\.createElement\(\s*"details"', source)
    assert 'scope:"global"' in source
    assert 'scope:"selected"' in source
    assert re.search(r'selected\s*\?\s*"✓"\s*:\s*"\+"', source)
    assert 'removeMark.textContent=' in source
    assert 'removeMark.textContent="−"' in source
    assert re.search(r'presetNameEl\.addEventListener\(\s*"input"', source)
    assert '"Yeni Hazır Havuzu Kaydet"' in source
    assert "payload?.preset?.name" in source
    assert ".pool-category-group:not([open])" in css
    assert ".pool-selected-remove" in css
