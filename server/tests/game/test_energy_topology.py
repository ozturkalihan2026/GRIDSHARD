from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    Direction,
    ModuleStatus,
    Position,
)
from app.game.topology import (
    build_energy_topology,
    effective_port_count,
    module_port_directions,
    modules_are_port_connected,
)


def make_engine():
    engine = BattleEngine(BattleState(battle_id="topology"))
    engine.add_player("p1")
    return engine


def active(
    engine,
    instance_id,
    definition_id,
    x,
    y,
    direction=Direction.UP,
):
    module = engine.grant_module(
        "p1",
        instance_id,
        definition_id,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def test_core_has_four_ports():
    engine = make_engine()
    core = active(engine, "core-1", "core", 2, 2)

    assert set(
        module_port_directions(core, Position(2, 2))
    ) == {
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
    }


def test_one_port_module_only_connects_forward():
    engine = make_engine()
    laser = active(
        engine,
        "laser-1",
        "laser",
        2,
        1,
        Direction.DOWN,
    )

    assert module_port_directions(
        laser,
        Position(2, 2),
    ) == (Direction.DOWN,)


def test_two_port_module_uses_opposite_axis():
    engine = make_engine()
    battery = active(
        engine,
        "battery-1",
        "battery",
        2,
        1,
        Direction.LEFT,
    )

    assert set(
        module_port_directions(battery, Position(2, 2))
    ) == {
        Direction.LEFT,
        Direction.RIGHT,
    }


def test_splitter_has_three_ports():
    engine = make_engine()
    splitter = active(
        engine,
        "splitter-1",
        "splitter",
        2,
        1,
        Direction.DOWN,
    )

    assert set(
        module_port_directions(splitter, Position(2, 2))
    ) == {
        Direction.DOWN,
        Direction.LEFT,
        Direction.RIGHT,
    }


def test_generator_gate_port_faces_core():
    engine = make_engine()
    generator = active(
        engine,
        "generator-1",
        "generator",
        2,
        3,
    )

    assert Direction.UP in module_port_directions(
        generator,
        Position(2, 2),
    )


def test_connection_requires_reciprocal_ports():
    engine = make_engine()
    first = active(
        engine,
        "laser-1",
        "laser",
        1,
        1,
        Direction.RIGHT,
    )
    second = active(
        engine,
        "shield-1",
        "shield",
        2,
        1,
        Direction.RIGHT,
    )

    assert modules_are_port_connected(
        first,
        second,
        Position(2, 2),
    )

    second.direction = Direction.UP

    assert not modules_are_port_connected(
        first,
        second,
        Position(2, 2),
    )


def test_generator_reaches_branch_through_splitter():
    engine = make_engine()

    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    active(
        engine,
        "splitter-1",
        "splitter",
        2,
        1,
        Direction.DOWN,
    )
    active(
        engine,
        "laser-1",
        "laser",
        1,
        1,
        Direction.RIGHT,
    )
    active(
        engine,
        "shield-1",
        "shield",
        3,
        1,
        Direction.LEFT,
    )

    topology = build_energy_topology(
        engine.state.players["p1"],
        Position(2, 2),
    )

    assert set(topology.reachable_from_generator) == {
        "generator-1",
        "core-1",
        "splitter-1",
        "laser-1",
        "shield-1",
    }


def test_disconnected_module_is_not_reachable():
    engine = make_engine()

    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    active(
        engine,
        "laser-1",
        "laser",
        4,
        3,
        Direction.UP,
    )

    topology = build_energy_topology(
        engine.state.players["p1"],
        Position(2, 2),
    )

    assert "laser-1" not in topology.reachable_from_generator


def test_dual_port_adapter_adds_real_port():
    engine = make_engine()
    laser = active(
        engine,
        "laser-1",
        "laser",
        1,
        1,
        Direction.RIGHT,
    )

    engine.add_temporary_booster_state(
        "p1",
        "laser-1",
        "dual_port_adapter",
        "Çift Port Adaptörü",
        15_000,
        {"extra_port_count": 1},
    )

    assert effective_port_count(laser) == 2
    assert set(
        module_port_directions(laser, Position(2, 2))
    ) == {
        Direction.RIGHT,
        Direction.LEFT,
    }


def test_rotation_changes_reachability_immediately():
    engine = make_engine()

    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    laser = active(
        engine,
        "laser-1",
        "laser",
        2,
        1,
        Direction.UP,
    )

    player = engine.state.players["p1"]

    before = build_energy_topology(
        player,
        Position(2, 2),
    )
    assert "laser-1" not in before.reachable_from_generator

    laser.direction = Direction.DOWN

    after = build_energy_topology(
        player,
        Position(2, 2),
    )
    assert "laser-1" in after.reachable_from_generator
