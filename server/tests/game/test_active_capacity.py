from app.game.battle_pool import default_battle_pool
from app.game.engine import BattleEngine, max_active_modules_for_elapsed_ms
from app.game.models import BattleCommand, BattleState


def create_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="capacity-test"))
    engine.add_player("player-1")
    engine.set_battle_pool("player-1", default_battle_pool().module_definition_ids)
    engine.grant_module("player-1", "core-1", "core")
    engine.grant_module("player-1", "generator-1", "generator")
    engine.set_initial_active_module("player-1", "core-1", 2, 2)
    engine.set_initial_active_module("player-1", "generator-1", 2, 3)
    engine.start()
    return engine


def command(engine: BattleEngine, kind: str, **payload) -> None:
    engine.enqueue_command(BattleCommand("player-1", kind, payload))
    engine.step()


def test_all_ten_slots_are_open_from_match_start():
    for elapsed_ms in (0, 14_999, 15_000, 30_000, 999_999):
        assert max_active_modules_for_elapsed_ms(elapsed_ms) == 10
    view = create_engine().module_capacity_view("player-1")
    assert view == {
        "active_module_count": 2,
        "active_module_limit": 10,
        "available_module_slots": 8,
        "next_module_slot_at_ms": None,
        "next_module_slot_in_ms": None,
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


def test_deployed_module_position_cannot_change():
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
