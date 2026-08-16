from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    BattleStatus,
)
from app.player_profile import (
    PlayerProfileService,
)
from app.player_progression import (
    DRAW_XP,
    LOSS_XP,
    WIN_XP,
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
        "time_limit_draw"
        if draw
        else "core_destroyed"
    )
    state.finished_at_ms=120000
    return state


def test_win_loss_rating_and_xp():
    profiles=PlayerProfileService()
    service=PlayerProgressionService(
        profiles
    )

    state=finished_state()

    assert service.process_finished_battle(
        state
    ) is True

    a=profiles.get("a")
    b=profiles.get("b")

    assert a.rating==1020
    assert b.rating==980
    assert a.experience==WIN_XP
    assert b.experience==LOSS_XP


def test_draw_keeps_rating_and_awards_draw_xp():
    profiles=PlayerProfileService()
    service=PlayerProgressionService(
        profiles
    )

    service.process_finished_battle(
        finished_state(draw=True)
    )

    for player in ("a","b"):
        profile=profiles.get(player)
        assert profile.rating==1000
        assert profile.experience==DRAW_XP


def test_same_battle_cannot_award_twice():
    profiles=PlayerProfileService()
    service=PlayerProgressionService(
        profiles
    )
    state=finished_state()

    assert service.process_finished_battle(
        state
    ) is True
    assert service.process_finished_battle(
        state
    ) is False

    assert profiles.get("a").rating==1020
    assert profiles.get("a").experience==WIN_XP


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


def test_progression_result_records_before_after():
    profiles=PlayerProfileService()
    service=PlayerProgressionService(
        profiles
    )
    state=finished_state()

    service.process_finished_battle(
        state
    )

    result=service.player_result(
        "m",
        "a",
    )

    assert result["rating_before"]==1000
    assert result["rating_after"]==1020
    assert result["rating_delta"]==20
    assert result["xp_awarded"]==WIN_XP
