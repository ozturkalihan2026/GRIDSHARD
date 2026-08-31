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


def test_audit_waits_for_real_match_session_and_binds_before_finish():
    source = client.get("/src/app.js").text

    assert "let currentAuditSessionId = null;" in source
    assert "&& result.matched" in source
    assert "&& result.sessionId" in source
    assert "await finishWebTestSessionAudit(" in source
    assert "await bindWebTestSessionAudit(" in source


def test_pool_categories_plus_minus_and_save_recovery_are_wired():
    source = client.get("/src/app.js").text
    css = client.get("/src/styles.css").text

    assert re.search(r'document\.createElement\(\s*"details"', source)
    assert 'scope:"global"' in source
    assert 'scope:"selected"' in source
    assert re.search(r'selected\s*\?\s*"✓"\s*:\s*"\+"', source)
    assert 'removeMark.textContent=' in source
    assert re.search(r'\?\s*"◆"\s*:\s*"−"', source)
    assert re.search(r'presetNameEl\.addEventListener\(\s*"input"', source)
    assert '"Yeni Hazır Havuzu Kaydet"' in source
    assert "payload?.preset?.name" in source
    assert ".pool-category-group:not([open])" in css
    assert ".pool-selected-remove" in css


def test_beta26_port_guard_is_preserved_in_full_project():
    launcher = (ROOT / "HIZLI_SAVAS_TESTI.bat").read_text(
        encoding="utf-8"
    )

    assert "GRIDSHARD_EXPECTED_VERSION=2.0.0-beta.38.1" in launcher
    assert "for($p=8000;$p -le 8010;$p++)" in launcher
    assert "$r.version -eq '%GRIDSHARD_EXPECTED_VERSION%'" in launcher
    assert "Tarayici acilmadi" in launcher
