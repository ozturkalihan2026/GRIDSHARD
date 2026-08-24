from fastapi.testclient import TestClient

from app.game.engine import (
    BATTLE_TIME_LIMIT_MS,
    BattleEngine,
)
from app.game.models import (
    BattleState,
    Direction,
)
from app.main import (
    app,
    player_statistics_service,
)
from app.player_statistics import (
    PlayerStatisticsError,
    PlayerStatisticsService,
)


client=TestClient(app)


def finished_match(
    *,
    battle_id="m1",
):
    engine=BattleEngine(
        BattleState(
            battle_id=battle_id
        )
    )

    for p in ("a","b"):
        engine.add_player(p)
        engine.grant_module(
            p,
            f"{p}-core",
            "core",
        )
        engine.grant_module(
            p,
            f"{p}-gen",
            "generator",
        )
        engine.set_initial_active_module(
            p,
            f"{p}-core",
            2,
            2,
        )
        engine.set_initial_active_module(
            p,
            f"{p}-gen",
            2,
            3,
            Direction.UP,
        )

    engine.start()
    engine.state.elapsed_ms = (
        BATTLE_TIME_LIMIT_MS - 100
    )
    engine.step()
    return engine.state


def test_finished_match_updates_basic_counts():
    service=PlayerStatisticsService()
    state=finished_match()

    assert service.process_finished_battle(
        state
    ) is True

    a=service.get_or_create("a")

    assert a.total_matches==1
    assert a.draws==1
    assert a.wins==0
    assert a.losses==0
    assert a.average_match_duration_ms==180000


def test_same_battle_is_not_counted_twice():
    service=PlayerStatisticsService()
    state=finished_match()

    assert service.process_finished_battle(state) is True
    assert service.process_finished_battle(state) is False
    assert service.get_or_create("a").total_matches==1


def test_running_battle_cannot_be_processed():
    service=PlayerStatisticsService()
    state=BattleState(
        battle_id="running"
    )

    try:
        service.process_finished_battle(state)
    except PlayerStatisticsError:
        pass
    else:
        raise AssertionError(
            "Çalışan maç istatistiğe işlenmemeliydi."
        )


def test_statistics_view_has_requested_metrics():
    service=PlayerStatisticsService()
    service.process_finished_battle(
        finished_match()
    )

    view=service.get_or_create(
        "a"
    ).to_view()

    assert "total_matches" in view
    assert "wins" in view
    assert "losses" in view
    assert "draws" in view
    assert "win_rate" in view
    assert "average_match_duration_ms" in view
    assert "total_damage_dealt" in view
    assert "module_replacements" in view
    assert "boosters_used" in view
    assert "most_used_modules" in view
    assert view["most_used_modules"] == []


def test_circuit_habit_excludes_fixed_core_and_generator_from_old_data():
    stats = PlayerStatisticsService().get_or_create("legacy")
    stats.module_usage.update({
        "core": 9,
        "generator": 9,
        "laser": 3,
        "shield": 2,
    })

    assert stats.to_view()["most_used_modules"] == [
        {"definition_id": "laser", "matches_used": 3},
        {"definition_id": "shield", "matches_used": 2},
    ]


def test_statistics_endpoint_returns_empty_default():
    player_statistics_service._statistics.clear()
    player_statistics_service._processed_battle_ids.clear()

    response=client.get(
        "/statistics/new-player"
    )

    assert response.status_code==200
    body=response.json()
    assert body["total_matches"]==0
    assert body["win_rate"]==0.0
