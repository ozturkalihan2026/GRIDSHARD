from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    Direction,
    ModuleStatus,
    Position,
)
from app.game.sabotage import (
    DISRUPTOR_DEBUFF_ID,
    EMP_DEBUFF_ID,
    ENERGY_LEECH_DEBUFF_ID,
    JAMMER_DEBUFF_ID,
    SABOTAGE_COOLDOWN_ID,
    VIRUS_DEBUFF_ID,
    sabotage_cooldown_ms,
)


def add(
    engine,
    player,
    iid,
    did,
    x,
    y,
    direction=Direction.UP,
):
    module = engine.grant_module(
        player,
        iid,
        did,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def setup_engine(sabotage_id, sabotage_definition):
    engine = BattleEngine(
        BattleState(battle_id=f"sabotage-{sabotage_id}")
    )
    engine.add_player("p1")
    engine.add_player("p2")

    for player in ("p1", "p2"):
        add(engine, player, f"{player}-core", "core", 2, 2)
        add(engine, player, f"{player}-gen", "generator", 2, 3)

    sabotage = add(
        engine,
        "p1",
        sabotage_id,
        sabotage_definition,
        2,
        1,
        Direction.DOWN,
    )

    engine._process_energy_flow()

    return engine, sabotage


def test_emp_disables_preferred_energy_target():
    engine, emp = setup_engine("emp-1", "emp")
    shield = add(
        engine,
        "p2",
        "p2-shield",
        "shield",
        3,
        1,
        Direction.LEFT,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()

    generator = engine.state.players["p2"].modules["p2-gen"]

    assert EMP_DEBUFF_ID in generator.debuffs
    assert generator.is_powered is False
    assert emp.cooldowns_ready_at_ms[SABOTAGE_COOLDOWN_ID] > 0


def test_jammer_disables_support_module():
    engine, _ = setup_engine("jammer-1", "jammer")
    support = add(
        engine,
        "p2",
        "p2-targeting",
        "targeting_computer",
        2,
        1,
        Direction.DOWN,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()

    assert JAMMER_DEBUFF_ID in support.debuffs


def test_virus_deals_periodic_damage():
    engine, _ = setup_engine("virus-1", "virus")
    repair = add(
        engine,
        "p2",
        "p2-repair",
        "repair",
        2,
        1,
        Direction.DOWN,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()

    assert VIRUS_DEBUFF_ID in repair.debuffs

    before = repair.hp
    engine._process_virus_effects()

    assert repair.hp < before
    assert any(
        event.type == "virus_damage"
        for event in engine.state.events
    )


def test_energy_leech_reduces_generator_output():
    engine, _ = setup_engine(
        "leech-1",
        "energy_leech",
    )

    engine._process_sabotage_actions()

    generator = engine.state.players["p2"].modules["p2-gen"]
    assert ENERGY_LEECH_DEBUFF_ID in generator.debuffs

    before = engine.state.players["p2"].energy_generated_total
    engine._process_energy_flow()
    generated = (
        engine.state.players["p2"].energy_generated_total
        - before
    )

    assert round(generated, 6) == 0.56


def test_disruptor_breaks_target_from_energy_topology():
    engine, _ = setup_engine(
        "disruptor-1",
        "disruptor",
    )

    splitter = add(
        engine,
        "p2",
        "p2-splitter",
        "splitter",
        2,
        1,
        Direction.DOWN,
    )
    laser = add(
        engine,
        "p2",
        "p2-laser",
        "laser",
        1,
        1,
        Direction.RIGHT,
    )

    engine._process_energy_flow()
    assert laser.is_powered is True

    engine._process_sabotage_actions()

    assert DISRUPTOR_DEBUFF_ID in splitter.debuffs

    engine._process_energy_flow()
    assert laser.is_powered is False


def test_signal_cell_reduces_sabotage_cooldown():
    engine, sabotage = setup_engine(
        "jammer-1",
        "jammer",
    )

    normal = sabotage_cooldown_ms(sabotage)
    sabotage.position = Position(3, 3)
    signal = sabotage_cooldown_ms(sabotage)

    assert signal < normal


def test_unpowered_sabotage_does_not_fire():
    engine, sabotage = setup_engine(
        "virus-1",
        "virus",
    )
    sabotage.position = Position(4, 3)

    repair = add(
        engine,
        "p2",
        "p2-repair",
        "repair",
        2,
        1,
        Direction.DOWN,
    )

    engine._process_energy_flow()
    assert sabotage.is_powered is False

    engine._process_sabotage_actions()

    assert VIRUS_DEBUFF_ID not in repair.debuffs


def test_sabotage_targeting_is_deterministic():
    engine, _ = setup_engine(
        "jammer-1",
        "jammer",
    )

    add(
        engine,
        "p2",
        "z-repair",
        "repair",
        3,
        1,
        Direction.LEFT,
    )
    add(
        engine,
        "p2",
        "a-target",
        "targeting_computer",
        2,
        1,
        Direction.DOWN,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()

    assert JAMMER_DEBUFF_ID in (
        engine.state.players["p2"]
        .modules["a-target"]
        .debuffs
    )


def test_sabotage_never_pauses_battle():
    engine, _ = setup_engine(
        "emp-1",
        "emp",
    )
    engine.state.status = type(
        engine.state.status
    ).RUNNING

    engine._process_sabotage_actions()

    assert engine.state.status.value == "running"
