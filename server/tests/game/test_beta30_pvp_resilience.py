from app.game.models import BattleCommand
from app.game.pvp_session import PvPSessionService


FULL_BOARD_LAYOUT = (
    ("core", 2, 1),
    ("laser", 1, 1),
    ("battery", 1, 0),
    ("capacitor", 3, 0),
    ("shield", 4, 2),
    ("repair", 0, 2),
    ("emp", 3, 1),
    ("arc_cannon", 4, 1),
    ("armor", 0, 0),
    ("railgun", 2, 0),
    ("barrier", 4, 0),
    ("cooler", 0, 1),
    ("jammer", 1, 2),
    ("virus", 2, 2),
    ("amplifier", 3, 2),
)


def install_full_board(service, session_id, player_id):
    engine = service.get_session(session_id).engine
    for definition_id, x, y in FULL_BOARD_LAYOUT:
        instance_id = f"{player_id}-{definition_id}"
        engine.grant_module(player_id, instance_id, definition_id)
        engine.set_initial_active_module(player_id, instance_id, x, y)


def test_two_player_snapshot_keeps_all_thirty_active_modules_visible():
    service = PvPSessionService()
    service.create_session("density")
    for player_id in ("a", "b"):
        service.join("density", player_id)
        install_full_board(service, "density", player_id)
    service.start("density")

    for viewer in ("a", "b"):
        snapshot = service.snapshot("density", viewer)
        assert sum(
            module["status"] == "active"
            for player in snapshot["players"].values()
            for module in player["modules"]
        ) == 30
        assert all(
            len([
                module
                for module in player["modules"]
                if module["status"] == "active"
            ]) == 15
            for player in snapshot["players"].values()
        )


def test_fifty_back_to_back_finished_sessions_are_expired_without_leaks():
    now = [0.0]
    service = PvPSessionService(
        now_func=lambda: now[0],
        finished_ttl_seconds=5.0,
    )

    for index in range(50):
        session_id = f"soak-{index:02d}"
        service.create_session(session_id)
        service.join(session_id, f"a-{index}")
        service.join(session_id, f"b-{index}")
        service.start(session_id)
        service.submit_sequenced_command(
            session_id,
            f"a-{index}",
            1,
            BattleCommand(f"a-{index}", "forfeit_battle", {}),
        )
        service.step(session_id)
        state = service.get_session(session_id).engine.state
        assert state.status.value == "finished"
        assert state.finish_reason == "player_forfeit"
        assert state.winner_player_id == f"b-{index}"
        now[0] += 0.01

    assert len(service.active_session_ids()) == 50
    now[0] += 6.0
    expired = service.cleanup_expired_sessions()
    assert len(expired) == 50
    assert service.active_session_ids() == ()
