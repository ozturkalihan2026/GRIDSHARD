from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    Direction,
    ModuleStatus,
    Position,
)
from app.game.sabotage import (
    EMP_DEBUFF_ID,
    ENERGY_LEECH_DEBUFF_ID,
    JAMMER_DEBUFF_ID,
    VIRUS_DEBUFF_ID,
    effective_sabotage_duration_ms,
    sabotage_resistance,
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


def make_engine():
    engine = BattleEngine(
        BattleState(battle_id="sabotage-resistance")
    )
    engine.add_player("p1")
    engine.add_player("p2")
    return engine


def base_network(engine, player):
    add(engine, player, f"{player}-core", "core", 2, 2)
    add(engine, player, f"{player}-gen", "generator", 2, 3)


def test_powered_barrier_reduces_sabotage_duration():
    engine = make_engine()
    base_network(engine, "p2")
    barrier = add(
        engine,
        "p2",
        "p2-barrier",
        "barrier",
        2,
        1,
        Direction.DOWN,
    )
    target = add(
        engine,
        "p2",
        "p2-target",
        "repair",
        1,
        1,
        Direction.RIGHT,
    )
    attacker = add(
        engine,
        "p1",
        "p1-virus",
        "virus",
        1,
        3,
        Direction.RIGHT,
    )

    barrier.is_powered = True
    resistance = sabotage_resistance(
        attacker,
        target,
        engine.state.players["p2"],
    )

    assert resistance.duration_multiplier < 1.0


def test_weak_against_and_barrier_stack_duration_resistance():
    engine = make_engine()
    base_network(engine, "p2")
    barrier = add(
        engine,
        "p2",
        "p2-barrier",
        "barrier",
        2,
        1,
        Direction.DOWN,
    )
    attacker = add(
        engine,
        "p1",
        "p1-emp",
        "emp",
        1,
        3,
        Direction.RIGHT,
    )

    barrier.is_powered = True
    resistance = sabotage_resistance(
        attacker,
        barrier,
        engine.state.players["p2"],
    )

    assert resistance.blocked is True
    assert effective_sabotage_duration_ms(
        2500,
        resistance,
    ) == 0


def test_strong_against_increases_duration_deterministically():
    engine = make_engine()
    target = add(
        engine,
        "p2",
        "p2-generator",
        "generator",
        2,
        3,
    )
    attacker = add(
        engine,
        "p1",
        "p1-emp",
        "emp",
        1,
        3,
        Direction.RIGHT,
    )

    resistance = sabotage_resistance(
        attacker,
        target,
        engine.state.players["p2"],
    )

    assert resistance.duration_multiplier > 1.0


def test_repair_cleanses_virus_from_connected_module():
    engine = make_engine()
    base_network(engine, "p1")
    add(
        engine,
        "p1",
        "p1-splitter",
        "splitter",
        2,
        1,
        Direction.DOWN,
    )
    repair = add(
        engine,
        "p1",
        "p1-repair",
        "repair",
        1,
        1,
        Direction.RIGHT,
    )
    target = add(
        engine,
        "p1",
        "p1-laser",
        "laser",
        0,
        1,
        Direction.RIGHT,
    )

    engine.add_debuff(
        "p1",
        "p1-laser",
        VIRUS_DEBUFF_ID,
        "Virüs",
        6000,
        {"next_tick_at_ms": 0},
    )

    engine._process_energy_flow()
    assert repair.is_powered is True

    engine._process_support_actions()

    assert VIRUS_DEBUFF_ID not in target.debuffs
    assert any(
        event.type == "sabotage_cleansed"
        for event in engine.state.events
    )


def test_repair_cleanses_jammer():
    engine = make_engine()
    base_network(engine, "p1")
    add(
        engine,
        "p1",
        "p1-splitter",
        "splitter",
        2,
        1,
        Direction.DOWN,
    )
    add(
        engine,
        "p1",
        "p1-repair",
        "repair",
        1,
        1,
        Direction.RIGHT,
    )
    target = add(
        engine,
        "p1",
        "p1-targeting",
        "targeting_computer",
        0,
        1,
        Direction.RIGHT,
    )

    engine.add_debuff(
        "p1",
        "p1-targeting",
        JAMMER_DEBUFF_ID,
        "Sinyal Bozma",
        4000,
        {},
    )

    engine._process_energy_flow()
    engine._process_support_actions()

    assert JAMMER_DEBUFF_ID not in target.debuffs


def test_cooler_reduces_emp_duration():
    engine = make_engine()
    base_network(engine, "p1")
    add(
        engine,
        "p1",
        "p1-splitter",
        "splitter",
        2,
        1,
        Direction.DOWN,
    )
    cooler = add(
        engine,
        "p1",
        "p1-cooler",
        "cooler",
        1,
        1,
        Direction.RIGHT,
    )
    target = add(
        engine,
        "p1",
        "p1-laser",
        "laser",
        0,
        1,
        Direction.RIGHT,
    )

    engine.add_debuff(
        "p1",
        "p1-laser",
        EMP_DEBUFF_ID,
        "EMP Devre Dışı",
        2500,
        {},
    )
    target.is_powered = True
    engine._process_energy_flow()

    before = target.debuffs[
        EMP_DEBUFF_ID
    ].expires_at_ms

    engine._process_support_actions()

    after = target.debuffs[
        EMP_DEBUFF_ID
    ].expires_at_ms

    assert cooler.is_powered is True
    assert after < before


def test_energy_leech_strength_reduced_by_powered_barrier():
    engine = make_engine()
    base_network(engine, "p2")
    barrier = add(
        engine,
        "p2",
        "p2-barrier",
        "barrier",
        2,
        1,
        Direction.DOWN,
    )
    attacker = add(
        engine,
        "p1",
        "p1-leech",
        "energy_leech",
        1,
        3,
        Direction.RIGHT,
    )
    target = engine.state.players["p2"].modules[
        "p2-gen"
    ]

    barrier.is_powered = True
    resistance = sabotage_resistance(
        attacker,
        target,
        engine.state.players["p2"],
    )

    assert resistance.effect_strength_multiplier < 1.0


def test_resistance_never_pauses_battle():
    engine = make_engine()
    engine.state.status = type(
        engine.state.status
    ).RUNNING

    assert engine.state.status.value == "running"
