import pytest

from app.game.battle_pool import default_battle_pool
from app.game.models import Direction
from app.game.pvp_session import PvPSessionError, PvPSessionService
from app.game.pvp_setup import InitialModulePlacement, PvPSetupPayload


def valid_payload(player_id="a"):
    return PvPSetupPayload(
        battle_pool_ids=default_battle_pool().module_definition_ids,
        initial_modules=(
            InitialModulePlacement(f"{player_id}-core", "core", 2, 2),
            InitialModulePlacement(
                f"{player_id}-gen", "generator", 2, 3, Direction.UP
            ),
        ),
    )


def strict_session():
    service = PvPSessionService()
    session = service.create_session("match", setup_required=True)
    service.join("match", "a")
    service.join("match", "b")
    return service, session


def test_strict_session_cannot_start_without_setups():
    service, _ = strict_session()
    with pytest.raises(PvPSessionError):
        service.start("match")


def test_valid_setup_installs_six_card_deck_and_two_fixed_modules():
    service, session = strict_session()
    service.submit_setup("match", "a", valid_payload("a"))
    player = session.engine.state.players["a"]
    assert len(player.battle_pool.module_definition_ids) == 6
    assert len(player.modules) == 2
    assert all(module.status.value == "active" for module in player.modules.values())
    assert session.slots["a"].setup_submitted is True


def test_player_cannot_ready_before_setup():
    service, _ = strict_session()
    with pytest.raises(PvPSessionError):
        service.set_ready("match", "a", True)


def test_two_valid_ready_players_can_start():
    service, session = strict_session()
    for player in ("a", "b"):
        service.submit_setup("match", player, valid_payload(player))
        service.set_ready("match", player, True)
    service.start("match")
    assert session.engine.state.status.value == "running"


def test_invalid_deck_or_extra_initial_module_is_rejected():
    service, _ = strict_session()
    payload = valid_payload("a")
    with pytest.raises(PvPSessionError):
        service.submit_setup(
            "match",
            "a",
            PvPSetupPayload(payload.battle_pool_ids[:-1], payload.initial_modules),
        )
    with pytest.raises(PvPSessionError):
        service.submit_setup(
            "match",
            "a",
            PvPSetupPayload(
                payload.battle_pool_ids,
                payload.initial_modules + (
                    InitialModulePlacement("a-laser", "laser", 1, 3),
                ),
            ),
        )


def test_snapshot_exposes_both_six_card_decks_for_battle_hud():
    service, _ = strict_session()
    for player in ("a", "b"):
        service.submit_setup("match", player, valid_payload(player))
    service.set_ready("match", "a", True)
    snap = service.snapshot("match", "a")
    assert len(snap["players"]["a"]["battle_pool_ids"]) == 6
    assert len(snap["players"]["b"]["battle_pool_ids"]) == 6
    assert snap["players"]["b"]["display_name"] == "b"
