from app.game.adaptive_simulation import run_symmetric_ai_match
from app.game.engine import BATTLE_TIME_LIMIT_MS, BattleEngine
from app.game.models import (
    BattleState,
    BattleStatus,
    Direction,
    ModuleStatus,
    Position,
)


def add(engine, player, iid, did, x, y, direction=Direction.UP):
    module = engine.grant_module(player, iid, did)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def test_symmetric_adaptive_ai_finishes_as_time_limit_draw():
    result = run_symmetric_ai_match(
        max_ticks=BATTLE_TIME_LIMIT_MS // 100,
    )
    assert result.timed_out is False
    assert result.is_draw is True
    assert result.winner_player_id is None
    assert result.elapsed_ms == BATTLE_TIME_LIMIT_MS
    assert result.finish_reason == "time_limit_draw"
    assert result.ai_action_count > 0


def test_time_limit_uses_existing_rank_tiebreak():
    engine = BattleEngine(BattleState(battle_id="time-limit-rank"))
    engine.add_player("a")
    engine.add_player("b")
    for player in ("a", "b"):
        add(engine, player, f"{player}-core", "core", 2, 2)
        add(engine, player, f"{player}-gen", "generator", 2, 3)
    add(engine, "a", "a-armor", "armor", 2, 1, Direction.DOWN)

    engine.state.status = BattleStatus.RUNNING
    engine.state.elapsed_ms = BATTLE_TIME_LIMIT_MS - 100
    engine._evaluate_battle_end()

    assert engine.state.status == BattleStatus.FINISHED
    assert engine.state.winner_player_id == "a"
    assert engine.state.finish_reason == "time_limit_tiebreak"


def test_simultaneous_tick_attacks_are_marked_in_event():
    engine = BattleEngine(BattleState(battle_id="simultaneous-attacks"))
    engine.add_player("a")
    engine.add_player("b")
    for player in ("a", "b"):
        add(engine, player, f"{player}-core", "core", 2, 2)
        add(engine, player, f"{player}-gen", "generator", 2, 3)
        add(
            engine, player, f"{player}-laser",
            "laser", 2, 1, Direction.DOWN
        )

    engine._process_energy_flow()
    engine._process_combat_actions()

    attack_events = [
        event for event in engine.state.events
        if event.type == "attack_performed"
    ]
    assert len(attack_events) == 2
    assert all(
        event.data["simultaneous_tick"] is True
        for event in attack_events
    )


def test_energy_priority_is_role_based_not_instance_id():
    engine = BattleEngine(BattleState(battle_id="energy-priority"))
    player = engine.add_player("p1")
    add(engine, "p1", "core", "core", 2, 2)
    add(engine, "p1", "gen", "generator", 2, 3)
    emp = add(
        engine, "p1", "a-emp",
        "emp", 1, 3, Direction.RIGHT
    )
    railgun = add(
        engine, "p1", "z-railgun",
        "railgun", 3, 3, Direction.LEFT
    )

    engine._process_energy_flow()
    assert railgun.is_powered is True
    assert emp.is_powered is False
