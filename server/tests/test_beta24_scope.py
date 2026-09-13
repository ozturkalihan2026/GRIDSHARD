from fastapi.testclient import TestClient

from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.battle_pool import default_battle_pool
from app.game.engine import BattleEngine
from app.game.models import BattleState
from app.main import app


client = TestClient(app)


def test_beta24_menu_preparation_and_result_markup():
    html = client.get("/").text

    assert "GRIDSHARD // CORE ARENA" not in html
    assert '<span class="lobby-subtitle">CORE ARENA</span>' in html
    assert 'id="lobby-player-name"' in html
    assert 'id="lobby-player-details"' in html
    assert 'id="battle-prepare-local"' not in html
    assert 'id="battle-prepare-online"' not in html
    assert 'id="battle-pool-preset-dialog"' in html
    assert 'id="initial-module-picker"' in html
    assert '<h3>Global Modüller</h3>' in html
    assert '<h3>Seçilen Deste</h3>' in html
    assert 'class="post-match-analysis"' in html
    assert "Savaş Analizini Aç" in html
    assert 'id="battle-pool-confirm" type="button" disabled>Savaş</button>' in html
    assert "Eşleştirme: 10 sn doldu · AI rakip devraldı" in client.get("/src/app.js").text


def test_embedded_energy_network_powers_adjacent_repair_module():
    generator_definition = BASIC_MODULE_DEFINITIONS["generator"]
    assert generator_definition.id == "generator"

    engine = BattleEngine(BattleState(battle_id="beta24-energy"))
    engine.add_player("player")
    engine.grant_module("player", "core", "core")
    engine.grant_module("player", "generator", "generator")
    engine.grant_module("player", "repair", "repair")
    engine.set_initial_active_module("player", "core", 2, 1)
    engine.set_initial_active_module("player", "generator", 2, 0)
    engine.set_initial_active_module(
        "player",
        "repair",
        1,
        0,
    )

    engine.start()
    engine.step()

    repair = engine.state.players["player"].modules["repair"]
    assert repair.is_powered is True
    assert repair.energy_required_last_tick == 0.2
    assert repair.energy_received_last_tick == 0.2


def test_local_ai_gateway_returns_server_authoritative_dual_snapshot():
    battle_pool = list(default_battle_pool().module_definition_ids)
    response = client.post(
        "/local-ai/sessions",
        json={
            "player_id": "beta24-player",
            "battle_pool_ids": battle_pool,
        },
    )
    assert response.status_code == 200, response.text

    payload = response.json()
    assert payload["authority"] == "server_battle_engine"
    snapshot = payload["snapshot"]
    assert snapshot["status"] == "running"
    assert len(snapshot["players"]) == 2
    assert snapshot["players"]["beta24-player"]["circuit_credits"] == 200

    player_modules = snapshot["players"]["beta24-player"]["modules"]
    generator = next(
        module
        for module in player_modules
        if module["definition_id"] == "generator"
    )
    assert "ports" not in generator

    follow_up = client.get(
        f"/local-ai/sessions/{payload['session_id']}/snapshot",
        params={
            "player_id": "beta24-player",
            "cursor": payload["event_cursor"],
        },
    )
    assert follow_up.status_code == 200
    assert follow_up.json()["authority"] == "server_battle_engine"


def test_beta24_result_audio_assets_are_wired():
    html = client.get("/").text
    app_source = client.get("/src/app.js").text
    audio_source = client.get("/src/gridshard-audio.js").text

    assert "victory_sting.wav" in audio_source
    assert "defeat_sting.wav" in audio_source
    assert '? "victory"' in app_source
    assert ': "defeat"' in app_source
    assert 'id="battle-time"' in html
