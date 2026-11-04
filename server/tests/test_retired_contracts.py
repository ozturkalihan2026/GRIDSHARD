"""Negative replacements for explicitly retired game and admin contracts.

Retired implementations live in Git history; these assertions protect the current runtime.
Positive current/signature/economy/restore behavior has its own active suites.
"""
import pytest
from fastapi.testclient import TestClient

from app import main
from app.game.board import BoardCellType, get_default_board
from app.game.catalog import get_module_definition
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus
from app.telemetry import InMemoryTelemetryService, TelemetryError, TelemetryEvent
from app.version import VERSION

RETIRED_PATHS = [
    "/telemetry/balance-change-draft",
    "/telemetry/balance-change-regression",
    "/telemetry/balance-change-simulate",
    "/telemetry/kpis",
    "/telemetry/manual-battle-report",
    "/web-test/audit/checklist-snapshot",
    "/web-test/audit/launch-attempt",
    "/web-test/audit/operation-snapshot",
    "/web-test/audit/preflight-snapshot",
    "/web-test/audit/session-bind",
    "/web-test/audit/session-finish",
    "/web-test/audit/session-start",
    "/web-test/audit/stability-snapshot",
    "/web-test/data-health",
    "/web-test/feedback",
    "/web-test/feedback/summary",
    "/web-test/findings",
    "/web-test/first-run-checklist",
    "/web-test/go-no-go",
    "/web-test/launch-readiness",
    "/web-test/monitoring",
    "/web-test/operation-readiness",
    "/web-test/persistence/restore-backup",
    "/web-test/preflight",
    "/web-test/rc-candidate",
    "/web-test/rc-report",
    "/web-test/review-candidates",
    "/web-test/status",
    "/web-test/telemetry/restore-backup",
    "/web-test/test-run",
    "/web-test/test-run/finish",
    "/web-test/test-run/report",
    "/web-test/test-run/start",
    "/web-test/test-run/status",
    "/web-test/test-runs",
    "/web-test/test-runs/compare",
    "/web-test/test-runs/old-run/go-no-go",
    "/web-test/test-runs/web-test-beta.13/summary",
    "/web-test",
    "/web-test/manifest",
    "/web-test/release-check",
    "/laboratory/retired-case",
    "/laboratory/retired-case/upgrade",
    "/laboratory/retired-case/reset"
]


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


def test_core_rarity_has_no_energy_resource():
    from app.game.models import PlayerBattleState,ModuleDefinition
    assert 'energy_stock' not in PlayerBattleState.__dataclass_fields__
    assert 'energy_generation' not in ModuleDefinition.__dataclass_fields__


@pytest.mark.parametrize("kind", ("web_test_session_started", "web_test_session_bound", "web_test_session_finished",
                                  "web_test_launch_attempted", "web_test_run_started", "web_test_feedback_submitted"))
def test_retired_audit_events_are_rejected_without_persistence(kind):
    service = InMemoryTelemetryService()
    with pytest.raises(TelemetryError):
        service.record(TelemetryEvent("retired", kind, 1, player_id="a"))
    assert service.events() == []


def test_health_is_the_current_readiness_contract_not_a_legacy_release_stamp():
    response = TestClient(main.app).get("/health")
    assert response.status_code == 200
    body = response.json()
    from app.version import LEGACY_HEALTH_VERSION
    assert body["version"] == LEGACY_HEALTH_VERSION
    assert body["release_version"] == "2.2.1"
    assert body["server_release_version"] == VERSION
    from app.game.pvp_protocol import PVP_PROTOCOL_VERSION
    assert body["pvp_protocol_version"] == PVP_PROTOCOL_VERSION
    assert {"player_data", "telemetry"} <= body["persistence"].keys()
    assert "release_ready" not in body
