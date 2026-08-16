import pytest

from app.game.models import (
    BattleCommand,
    Direction,
)
from app.game.pvp_session import (
    PvPSessionError,
    PvPSessionService,
)


def setup_service():
    service = PvPSessionService()
    session = service.create_session("pvp-1")
    service.join("pvp-1", "alice")
    service.join("pvp-1", "bob")
    return service, session


def install_minimal_board(session, player_id):
    engine = session.engine
    engine.grant_module(
        player_id,
        f"{player_id}-core",
        "core",
    )
    engine.grant_module(
        player_id,
        f"{player_id}-gen",
        "generator",
    )
    engine.set_initial_active_module(
        player_id,
        f"{player_id}-core",
        2,
        2,
    )
    engine.set_initial_active_module(
        player_id,
        f"{player_id}-gen",
        2,
        3,
        Direction.UP,
    )


def test_join_assigns_two_stable_slots():
    service, session = setup_service()

    assert session.slots["alice"].slot_index == 0
    assert session.slots["bob"].slot_index == 1


def test_third_player_is_rejected():
    service, session = setup_service()

    with pytest.raises(PvPSessionError):
        service.join("pvp-1", "eve")


def test_rejoin_restores_existing_slot():
    service, session = setup_service()
    service.disconnect("pvp-1", "alice")

    slot = service.join("pvp-1", "alice")

    assert slot.slot_index == 0
    assert slot.connected is True


def test_match_requires_two_players():
    service = PvPSessionService()
    service.create_session("solo")
    service.join("solo", "alice")

    with pytest.raises(PvPSessionError):
        service.start("solo")


def test_impersonation_command_is_rejected():
    service, session = setup_service()
    install_minimal_board(session, "alice")
    install_minimal_board(session, "bob")
    service.start("pvp-1")

    with pytest.raises(PvPSessionError):
        service.submit_command(
            "pvp-1",
            "alice",
            BattleCommand(
                "bob",
                "rotate_module",
                {"module_id": "bob-gen"},
            ),
        )


def test_authenticated_command_uses_real_engine_queue():
    service, session = setup_service()
    install_minimal_board(session, "alice")
    install_minimal_board(session, "bob")
    service.start("pvp-1")

    # 15 saniye sonrası gerçek komut doğrulaması için state'i ilerlet.
    session.engine.state.elapsed_ms = 15_000
    session.engine.state.tick = 150

    service.submit_command(
        "pvp-1",
        "alice",
        BattleCommand(
            "alice",
            "rotate_module",
            {
                "module_id": "alice-gen",
                "clockwise": True,
            },
        ),
    )
    service.step("pvp-1")

    # Jeneratör rotatable=False olduğundan motor komutu reddeder;
    # asıl doğrulama oturum servisinin komutu normal motor kuyruğuna taşımasıdır.
    assert any(
        event.type == "command_rejected"
        for event in session.engine.state.events
    )


def test_snapshot_hides_opponent_private_economy():
    service, session = setup_service()

    snap = service.snapshot(
        "pvp-1",
        "alice",
    )

    assert "circuit_credits" in snap["players"]["alice"]
    assert "circuit_credits" not in snap["players"]["bob"]


def test_snapshot_is_viewer_scoped_and_deterministic():
    service, session = setup_service()

    first = service.snapshot(
        "pvp-1",
        "alice",
    )
    second = service.snapshot(
        "pvp-1",
        "alice",
    )

    assert first == second
    assert first["viewer_player_id"] == "alice"


def test_events_since_uses_cursor():
    service, session = setup_service()

    session.engine._emit(
        "custom_event",
        {"value": 1},
    )

    first = service.events_since(
        "pvp-1",
        "alice",
        0,
    )
    second = service.events_since(
        "pvp-1",
        "alice",
        first["cursor"],
    )

    assert len(first["events"]) == 1
    assert second["events"] == []
