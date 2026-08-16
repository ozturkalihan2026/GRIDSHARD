from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    BattleStatus,
    Direction,
    ModuleStatus,
    Position,
)


def add(engine, player, iid, did, x, y, direction=Direction.UP):
    module=engine.grant_module(player,iid,did)
    module.status=ModuleStatus.ACTIVE
    module.position=Position(x,y)
    module.direction=direction
    return module


def base_engine():
    engine=BattleEngine(BattleState(battle_id="result"))
    engine.add_player("a")
    engine.add_player("b")
    for player in ("a","b"):
        add(engine,player,f"{player}-core","core",2,2)
        add(engine,player,f"{player}-gen","generator",2,3)
    engine.state.status=BattleStatus.RUNNING
    return engine


def test_single_core_destruction_finishes_match():
    engine=base_engine()
    core=engine.state.players["b"].modules["b-core"]
    engine.apply_damage("b","b-core",core.hp)
    engine._evaluate_battle_end()

    assert engine.state.status==BattleStatus.FINISHED
    assert engine.state.winner_player_id=="a"
    assert engine.state.loser_player_id=="b"
    assert engine.state.is_draw is False
    assert engine.state.finish_reason=="core_destroyed"


def test_battle_finished_event_contains_summary():
    engine=base_engine()
    core=engine.state.players["b"].modules["b-core"]
    engine.apply_damage("b","b-core",core.hp)
    engine._evaluate_battle_end()

    event=engine.state.events[-1]
    assert event.type=="battle_finished"
    assert "a" in event.data["summary"]
    assert "b" in event.data["summary"]


def test_finished_match_no_longer_advances_on_next_step():
    engine=base_engine()
    core=engine.state.players["b"].modules["b-core"]
    engine.apply_damage("b","b-core",core.hp)
    engine._evaluate_battle_end()
    tick_before=engine.state.tick

    engine.step()

    assert engine.state.tick==tick_before


def test_simultaneous_equal_core_destruction_is_draw():
    engine=base_engine()
    for player in ("a","b"):
        core=engine.state.players[player].modules[f"{player}-core"]
        engine.apply_damage(player,f"{player}-core",core.hp)

    engine._evaluate_battle_end()

    assert engine.state.is_draw is True
    assert engine.state.winner_player_id is None
    assert engine.state.finish_reason=="simultaneous_core_draw"


def test_simultaneous_core_tiebreak_uses_living_module_count():
    engine=base_engine()
    extra=add(engine,"a","a-laser","laser",2,1,Direction.DOWN)

    for player in ("a","b"):
        core=engine.state.players[player].modules[f"{player}-core"]
        engine.apply_damage(player,f"{player}-core",core.hp)

    engine._evaluate_battle_end()

    assert engine.state.winner_player_id=="a"
    assert engine.state.finish_reason=="simultaneous_core_tiebreak"


def test_tiebreak_then_hp_ratio():
    engine=base_engine()
    a_laser=add(engine,"a","a-laser","laser",2,1,Direction.DOWN)
    b_laser=add(engine,"b","b-laser","laser",2,1,Direction.DOWN)
    b_laser.hp=10

    for player in ("a","b"):
        core=engine.state.players[player].modules[f"{player}-core"]
        engine.apply_damage(player,f"{player}-core",core.hp)

    engine._evaluate_battle_end()

    assert engine.state.winner_player_id=="a"


def test_summary_contains_energy_and_credit_data():
    engine=base_engine()
    engine.state.players["a"].circuit_credits=42
    engine.state.players["a"].energy_generated_total=12.5
    core=engine.state.players["b"].modules["b-core"]
    engine.apply_damage("b","b-core",core.hp)
    engine._evaluate_battle_end()

    summary=engine.state.result_summary["a"]
    assert summary["circuit_credits"]==42
    assert summary["energy_generated_total"]==12.5


def test_match_end_does_not_pause_before_core_is_destroyed():
    engine=base_engine()
    engine._evaluate_battle_end()
    assert engine.state.status==BattleStatus.RUNNING
