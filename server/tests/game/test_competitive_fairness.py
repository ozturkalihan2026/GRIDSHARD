from app.game.adaptive_simulation import run_symmetric_ai_match
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    BattleStatus,
    ModuleStatus,
    Position,
)


def add(engine, player, iid, did, x, y):
    module = engine.grant_module(player, iid, did)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def test_symmetric_adaptive_ai_never_ends_on_a_timer():
    result = run_symmetric_ai_match(max_ticks=1800)
    assert result.ai_action_count > 0
    assert result.finish_reason in {
        None,
        "core_destroyed",
        "simultaneous_core_destroyed",
    }


def test_battle_has_no_time_limit_while_both_cores_live():
    engine = BattleEngine(BattleState(battle_id="no-time-limit"))
    engine.add_player("a")
    engine.add_player("b")
    for player in ("a", "b"):
        add(engine, player, f"{player}-core", "core", 2, 1)
    add(engine, "a", "a-armor", "armor", 1, 1)

    engine.state.status = BattleStatus.RUNNING
    engine.state.elapsed_ms = 30 * 60 * 1000
    engine._evaluate_battle_end()

    assert engine.state.status == BattleStatus.RUNNING
    assert engine.state.winner_player_id is None


def test_simultaneous_tick_attacks_are_marked_in_event():
    engine = BattleEngine(BattleState(battle_id="simultaneous-attacks"))
    engine.add_player("a")
    engine.add_player("b")
    for player in ("a", "b"):
        add(engine, player, f"{player}-core", "core", 2, 1)
        add(
            engine, player, f"{player}-laser",
            "laser", 1, 1
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
