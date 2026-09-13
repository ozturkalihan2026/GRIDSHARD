from app.game.combat import (
    ATTACK_COOLDOWN_ID,
    attack_damage_multiplier,
    select_target,
)
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
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
):
    module = engine.grant_module(
        player_id,
        instance_id,
        definition_id,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def two_player_engine():
    engine = BattleEngine(BattleState(battle_id="combat"))
    engine.add_player("p1")
    engine.add_player("p2")

    add(engine, "p1", "p1-core", "core", 2, 1)
    add(
        engine,
        "p1",
        "p1-laser",
        "laser",
        1,
        1,
    )

    add(engine, "p2", "p2-core", "core", 2, 1)
    add(
        engine,
        "p2",
        "p2-shield",
        "shield",
        3,
        1,
    )

    return engine


def test_target_priority_prefers_normal_module_before_core():
    engine = two_player_engine()
    target = select_target(engine.state.players["p2"])

    assert target.instance_id == "p2-shield"


def test_core_becomes_target_after_other_modules_are_destroyed():
    engine = two_player_engine()
    engine.apply_damage("p2", "p2-shield", 999)

    target = select_target(engine.state.players["p2"])

    assert target.instance_id == "p2-core"


def test_powered_laser_deals_real_damage():
    engine = two_player_engine()

    engine._process_energy_flow()
    shield = engine.state.players["p2"].modules["p2-shield"]
    before = shield.hp

    engine._process_combat_actions()

    assert shield.hp < before
    assert any(
        event.type == "attack_performed"
        for event in engine.state.events
    )


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
    before = shield.hp

    engine._process_combat_actions()
    hp_after_first = shield.hp
    first_damage = before - hp_after_first

    engine._process_combat_actions()

    assert shield.hp == hp_after_first


def test_laser_can_attack_again_when_cooldown_finishes():
    engine = two_player_engine()

    engine._process_energy_flow()
    shield = engine.state.players["p2"].modules["p2-shield"]
    before = shield.hp

    engine._process_combat_actions()
    hp_after_first = shield.hp
    first_damage = before - hp_after_first

    engine.state.elapsed_ms = 1000
    engine._process_combat_actions()

    assert shield.hp == hp_after_first - first_damage


def test_normal_cells_have_no_hidden_attack_bonus():
    engine = two_player_engine()
    laser = engine.state.players["p1"].modules["p1-laser"]
    laser.position = Position(2, 0)

    assert attack_damage_multiplier(laser) == 1.0


def test_overcharge_is_the_only_attack_multiplier_on_a_normal_cell():
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

    assert round(attack_damage_multiplier(laser), 6) == 1.25


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
    )

    target = select_target(engine.state.players["p2"])

    assert target.instance_id == "p2-armor"


def test_canonical_target_class_order_then_core():
    engine = two_player_engine()
    targets = (
        add(engine, "p2", "p2-sabotage", "emp", 0, 1),
        add(engine, "p2", "p2-support", "repair", 1, 1),
        add(engine, "p2", "p2-energy", "battery", 3, 2),
        add(engine, "p2", "p2-attack", "pulse_cannon", 4, 2),
    )

    expected = [
        "p2-shield",
        "p2-sabotage",
        "p2-support",
        "p2-energy",
        "p2-attack",
        "p2-core",
    ]

    for instance_id in expected:
        target = select_target(engine.state.players["p2"])
        assert target is not None
        assert target.instance_id == instance_id
        engine.apply_damage("p2", instance_id, 999)

    assert all(module.hp == 0 for module in targets)
    assert select_target(engine.state.players["p2"]) is None


def test_player_without_living_attack_module_deals_no_damage():
    engine = two_player_engine()
    engine.apply_damage("p1", "p1-laser", 999)
    shield = engine.state.players["p2"].modules["p2-shield"]
    before = shield.hp

    engine._process_energy_flow()
    engine._process_combat_actions()

    assert shield.hp == before
    assert not any(
        event.type == "attack_performed"
        and event.data["attacker_player_id"] == "p1"
        for event in engine.state.events
    )
