from app.game.battle_pool import default_battle_pool
from app.game.engine import MAX_ACTIVE_MODULES, BattleEngine
from app.game.models import BattleCommand, BattleState


def create_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="capacity-test"))
    engine.add_player("player-1")
    engine.set_battle_pool("player-1", default_battle_pool().module_definition_ids)
    engine.grant_module("player-1", "core-1", "core")
    engine.set_initial_active_module("player-1", "core-1", 2, 1)
    engine.start()
    return engine


def command(engine: BattleEngine, kind: str, **payload) -> None:
    engine.enqueue_command(BattleCommand("player-1", kind, payload))
    engine.step()


def test_all_fifteen_cells_are_open_from_match_start():
    assert MAX_ACTIVE_MODULES == 15
    view = create_engine().module_capacity_view("player-1")
    assert view == {
        "active_module_count": 1,
        "active_module_limit": 15,
        "available_module_slots": 14,
    }


def test_deploy_is_immediate_and_allows_duplicate_definitions():
    engine = create_engine()
    engine.state.players["player-1"].circuit_credits = 1_000
    command(engine, "deploy_module", definition_id="laser")
    command(engine, "deploy_module", definition_id="laser")
    lasers = [
        module
        for module in engine.state.players["player-1"].modules.values()
        if module.definition.id == "laser"
    ]
    assert len(lasers) == 2
    assert all(module.status.value == "active" for module in lasers)
    assert len({module.position for module in lasers}) == 2


def test_deploy_requires_deck_membership_and_credit():
    engine = create_engine()
    engine.state.players["player-1"].circuit_credits = 0
    command(engine, "deploy_module", definition_id="laser")
    assert engine.state.events[-1].type == "command_rejected"
    engine.state.players["player-1"].circuit_credits = 1_000
    command(engine, "deploy_module", definition_id="armor")
    assert engine.state.events[-1].type == "command_rejected"


def test_manual_movement_commands_do_not_exist():
    engine = create_engine()
    engine.state.players["player-1"].circuit_credits = 1_000
    command(engine, "deploy_module", definition_id="laser")
    laser = next(
        module
        for module in engine.state.players["player-1"].modules.values()
        if module.definition.id == "laser"
    )
    original = laser.position
    command(engine, "move_module", module_id=laser.instance_id, x=0, y=1)
    assert laser.position == original
    assert engine.state.events[-1].type == "command_rejected"
