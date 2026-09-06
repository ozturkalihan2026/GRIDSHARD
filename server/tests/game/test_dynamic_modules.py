from app.game.battle_pool import default_battle_pool
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, Direction, ModuleStatus


def create_engine():
    engine = BattleEngine(BattleState(battle_id="dynamic-test"))
    engine.add_player("player")
    engine.set_battle_pool("player", default_battle_pool().module_definition_ids)
    engine.grant_module("player", "core", "core")
    engine.grant_module("player", "generator", "generator")
    engine.set_initial_active_module("player", "core", 2, 2)
    engine.set_initial_active_module("player", "generator", 2, 3)
    engine.state.players["player"].circuit_credits = 2_000
    engine.start()
    return engine


def command(engine, kind, **payload):
    engine.enqueue_command(BattleCommand("player", kind, payload))
    engine.step()


def deployed(engine, definition_id):
    return [m for m in engine.state.players["player"].modules.values()
            if m.definition.id == definition_id and m.status == ModuleStatus.ACTIVE]


def test_deck_click_creates_a_new_active_instance_on_next_tick():
    engine = create_engine()
    engine.enqueue_command(BattleCommand("player", "deploy_module", {
        "definition_id": "laser",
    }))
    assert deployed(engine, "laser") == []
    engine.step()
    assert len(deployed(engine, "laser")) == 1


def test_same_card_can_create_multiple_distinct_instances():
    engine = create_engine()
    command(engine, "deploy_module", definition_id="laser")
    command(engine, "deploy_module", definition_id="laser")
    lasers = deployed(engine, "laser")
    assert len(lasers) == 2
    assert len({laser.instance_id for laser in lasers}) == 2
    assert len({laser.position for laser in lasers}) == 2


def test_position_is_fixed_but_orientation_can_change():
    engine = create_engine()
    command(engine, "deploy_module", definition_id="laser")
    laser = deployed(engine, "laser")[0]
    position = laser.position
    direction = laser.direction
    command(engine, "move_module", module_id=laser.instance_id, x=0, y=0)
    assert laser.position == position
    command(engine, "rotate_module", module_id=laser.instance_id)
    assert laser.position == position
    assert laser.direction != direction


def test_destroyed_module_leaves_five_second_debris():
    engine = create_engine()
    command(engine, "deploy_module", definition_id="laser")
    laser = deployed(engine, "laser")[0]
    position = laser.position
    engine.apply_damage("player", laser.instance_id, laser.hp)
    assert laser.status == ModuleStatus.DESTROYED
    assert engine.cell_debris_view("player") == [{
        "x": position.x,
        "y": position.y,
        "until_ms": engine.state.elapsed_ms + 5_000,
        "remaining_ms": 5_000,
    }]


def test_legacy_cell_targeted_placement_is_rejected():
    engine = create_engine()
    command(engine, "place_module", module_id="missing", x=3, y=3)
    assert engine.state.events[-1].type == "command_rejected"
