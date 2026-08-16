from app.game.combat import (
    ATTACK_COOLDOWN_ID,
    attack_damage_multiplier,
    select_target,
)
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    Direction,
    ModuleStatus,
    Position,
)


def add(
    engine,
    player_id,
    instance_id,
    definition_id,
    x,
    y,
    direction=Direction.UP,
):
    module = engine.grant_module(
        player_id,
        instance_id,
        definition_id,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def two_player_engine():
    engine = BattleEngine(BattleState(battle_id="combat"))
    engine.add_player("p1")
    engine.add_player("p2")

    add(engine, "p1", "p1-core", "core", 2, 2)
    add(engine, "p1", "p1-generator", "generator", 2, 3)
    add(
        engine,
        "p1",
        "p1-laser",
        "laser",
        2,
        1,
        Direction.DOWN,
    )

    add(engine, "p2", "p2-core", "core", 2, 2)
    add(engine, "p2", "p2-generator", "generator", 2, 3)
    add(
        engine,
        "p2",
        "p2-shield",
        "shield",
        3,
        1,
        Direction.LEFT,
    )

    return engine


def test_target_priority_prefers_normal_module_before_generator():
    engine = two_player_engine()
    target = select_target(engine.state.players["p2"])

    assert target.instance_id == "p2-shield"


def test_generator_becomes_target_after_other_modules_destroyed():
    engine = two_player_engine()
    engine.apply_damage("p2", "p2-shield", 999)

    target = select_target(engine.state.players["p2"])

    assert target.instance_id == "p2-generator"


def test_core_becomes_target_only_after_generator_destroyed():
    engine = two_player_engine()
    engine.apply_damage("p2", "p2-shield", 999)
    engine.apply_damage("p2", "p2-generator", 999)

    target = select_target(engine.state.players["p2"])

    assert target.instance_id == "p2-core"


def test_powered_laser_deals_real_damage():
    engine = two_player_engine()

    engine._process_energy_flow()
    shield = engine.state.players["p2"].modules["p2-shield"]
    before = shield.hp

    engine._process_combat_actions()

    assert shield.hp == before - 12
    assert any(
        event.type == "attack_performed"
        for event in engine.state.events
    )


def test_unpowered_attack_module_does_not_fire():
    engine = two_player_engine()
    laser = engine.state.players["p1"].modules["p1-laser"]
    laser.position = Position(4, 3)

    engine._process_energy_flow()

    shield = engine.state.players["p2"].modules["p2-shield"]
    before = shield.hp

    engine._process_combat_actions()

    assert laser.is_powered is False
    assert shield.hp == before
    assert engine.state.events[-1].type == "attack_skipped_unpowered"


def test_attack_starts_module_cooldown():
    engine = two_player_engine()

    engine._process_energy_flow()
    engine._process_combat_actions()

    assert (
        ATTACK_COOLDOWN_ID
        in engine.state.players["p1"]
        .modules["p1-laser"]
        .cooldowns_ready_at_ms
    )


def test_cooldown_prevents_attack_every_tick():
    engine = two_player_engine()

    engine._process_energy_flow()
    shield = engine.state.players["p2"].modules["p2-shield"]

    engine._process_combat_actions()
    hp_after_first = shield.hp

    engine._process_combat_actions()

    assert shield.hp == hp_after_first


def test_laser_can_attack_again_when_cooldown_finishes():
    engine = two_player_engine()

    engine._process_energy_flow()
    shield = engine.state.players["p2"].modules["p2-shield"]

    engine._process_combat_actions()
    hp_after_first = shield.hp

    engine.state.elapsed_ms = 1000
    engine._process_combat_actions()

    assert shield.hp == hp_after_first - 12


def test_attack_cell_increases_real_damage_by_15_percent():
    engine = two_player_engine()
    laser = engine.state.players["p1"].modules["p1-laser"]
    laser.position = Position(2, 0)

    assert attack_damage_multiplier(laser) == 1.15


def test_overcharge_and_attack_cell_stack_multiplicatively():
    engine = two_player_engine()
    laser = engine.state.players["p1"].modules["p1-laser"]
    laser.position = Position(2, 0)

    engine.add_temporary_booster_state(
        "p1",
        "p1-laser",
        "overcharge_chip",
        "Aşırı Yük Çipi",
        15_000,
        {"attack_multiplier": 1.25},
    )

    assert round(attack_damage_multiplier(laser), 6) == 1.4375


def test_damage_destroys_module_and_removes_position():
    engine = two_player_engine()
    shield = engine.state.players["p2"].modules["p2-shield"]

    engine.apply_damage("p2", "p2-shield", 999)

    assert shield.status == ModuleStatus.DESTROYED
    assert shield.position is None


def test_combat_does_not_pause_battle():
    engine = two_player_engine()
    engine.state.status = type(engine.state.status).RUNNING

    engine._process_energy_flow()
    engine._process_combat_actions()

    assert engine.state.status.value == "running"


def test_deterministic_target_order_uses_instance_id():
    engine = two_player_engine()
    add(
        engine,
        "p2",
        "p2-armor",
        "armor",
        1,
        1,
        Direction.RIGHT,
    )

    target = select_target(engine.state.players["p2"])

    assert target.instance_id == "p2-armor"
