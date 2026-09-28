from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    BattleStatus,
)
from app.player_profile import (
    PlayerProfileService,
)
from app.player_progression import (
    PlayerProgressionError,
    PlayerProgressionService,
)


def finished_state(
    *,
    battle_id="m",
    winner="a",
    draw=False,
):
    state=BattleState(
        battle_id=battle_id
    )

    for player_id in ("a","b"):
        engine=BattleEngine(state)
        if player_id not in state.players:
            engine.add_player(player_id)

    state.status=BattleStatus.FINISHED
    state.winner_player_id=(
        None if draw else winner
    )
    state.loser_player_id=(
        None
        if draw
        else ("b" if winner=="a" else "a")
    )
    state.is_draw=draw
    state.finish_reason=(
        "simultaneous_core_destroyed"
        if draw
        else "core_destroyed"
    )
    state.finished_at_ms=120000
    return state


def test_running_battle_is_rejected():
    profiles=PlayerProfileService()
    service=PlayerProgressionService(
        profiles
    )

    state=BattleState(
        battle_id="running"
    )

    try:
        service.process_finished_battle(
            state
        )
    except PlayerProgressionError:
        pass
    else:
        raise AssertionError(
            "Bitmemiş maç ilerlemeye işlenmemeliydi."
        )
