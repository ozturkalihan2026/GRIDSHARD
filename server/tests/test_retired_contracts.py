"""Negative replacements for explicitly retired game and admin contracts.

Historical assertions remain in docs/archive, not hidden behind skip/xfail.
Positive energy/signature/economy/restore behavior has its own active suites.
"""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import main
from app.game.board import BoardCellType, get_default_board
from app.game.catalog import get_module_definition
from app.game.core_balance import CORE_SIGNATURES
from app.game.energy import process_energy_tick
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus
from app.telemetry import InMemoryTelemetryService, TelemetryError, TelemetryEvent
from app.version import VERSION

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE = ROOT / "docs/archive/server-test-contracts-20261001"
MANIFEST = json.loads((ARCHIVE / "manifest.json").read_text(encoding="utf-8"))
RETIRED_PATHS = [*MANIFEST["retired_api_paths"], "/web-test", "/web-test/manifest",
                 "/web-test/release-check", "/laboratory/retired-case",
                 "/laboratory/retired-case/upgrade", "/laboratory/retired-case/reset"]


@pytest.mark.parametrize("path", RETIRED_PATHS)
@pytest.mark.parametrize("method", ("GET", "POST"))
def test_retired_http_surface_cannot_create_profile_or_write_telemetry(path, method):
    before_profiles = set(main.player_profile_service._profiles)
    before_events = main.telemetry_service.events()
    response = TestClient(main.app).request(method, path, json={"player_id": "retired-case", "admin_token": "not-a-real-key"})
    assert response.status_code == 410
    assert "kaldırıldı" in response.json()["detail"]
    assert set(main.player_profile_service._profiles) == before_profiles
    assert main.telemetry_service.events() == before_events


@pytest.mark.parametrize("kind", ("move_module", "swap_modules", "rotate_module", "return_to_reserve"))
def test_retired_module_commands_do_not_change_position_or_current(kind):
    engine = BattleEngine(BattleState(battle_id="retired-command"))
    player = engine.add_player("a")
    player.circuit_credits = 10
    module = engine.grant_module("a", "laser", "laser")
    module.status = ModuleStatus.ACTIVE
    module.position = engine.board.placeable_positions[0]
    position = module.position
    engine._process_command(BattleCommand("a", kind, {"module_id": "laser", "x": 4, "y": 2}))
    assert module.position == position
    assert player.circuit_credits == 10
    assert engine.state.events[-1].type == "command_rejected"


def test_old_generator_and_special_cells_do_not_return():
    with pytest.raises(ValueError):
        get_module_definition("generator")
    board = get_default_board()
    assert len(board.cells) == 15
    assert len(board.placeable_positions) == 14
    assert {cell.cell_type for cell in board.cells} == {BoardCellType.CORE, BoardCellType.NORMAL}


def test_core_rarity_is_not_an_energy_power_curve():
    produced = []
    for core_type in CORE_SIGNATURES:
        engine = BattleEngine(BattleState(battle_id=core_type))
        player = engine.add_player("a")
        core = engine.grant_module("a", "core", "core")
        core.status = ModuleStatus.ACTIVE
        core.position = engine.board.core_position
        player.core_type = core_type
        produced.append(process_energy_tick(player).generated)
    assert produced and produced[0] > 0
    assert all(value == pytest.approx(produced[0]) for value in produced)


@pytest.mark.parametrize("kind", ("web_test_session_started", "web_test_session_bound", "web_test_session_finished",
                                  "web_test_launch_attempted", "web_test_run_started", "web_test_feedback_submitted"))
def test_retired_audit_events_are_rejected_without_persistence(kind):
    service = InMemoryTelemetryService()
    with pytest.raises(TelemetryError):
        service.record(TelemetryEvent("retired", kind, 1, player_id="a"))
    assert service.events() == []


def test_archive_keeps_original_test_bodies_and_documents_replacements():
    assert MANIFEST["format"] == 1 and len(MANIFEST["files"]) == 67
    for item in MANIFEST["files"]:
        assert not (ROOT / item["path"]).exists()
        source = (ROOT / item["archived"]).read_text(encoding="utf-8")
        names = item["tests"] if isinstance(item["tests"], list) else [item["tests"]]
        assert all(f"def {name}(" in source for name in names)
        assert item["reason"] and item["replacement"]


def test_health_is_the_current_readiness_contract_not_a_legacy_release_stamp():
    response = TestClient(main.app).get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == VERSION
    assert body["pvp_protocol_version"] == 1
    assert {"player_data", "telemetry"} <= body["persistence"].keys()
    assert "release_ready" not in body
