from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position
from app.game.topology import build_energy_topology


def _active(engine, instance_id, definition_id, x, y):
    module = engine.grant_module("p1", instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def test_embedded_cables_reach_all_orthogonally_connected_modules():
    engine = BattleEngine(BattleState(battle_id="embedded-topology"))
    engine.add_player("p1")
    _active(engine, "core", "core", 2, 1)
    _active(engine, "generator", "generator", 2, 0)
    _active(engine, "splitter", "splitter", 2, 2)
    _active(engine, "laser", "laser", 1, 2)
    _active(engine, "shield", "shield", 3, 2)

    topology = build_energy_topology(
        engine.state.players["p1"],
        engine.board.core_position,
    )

    assert set(topology.reachable_from_generator) == {
        "core",
        "generator",
        "splitter",
        "laser",
        "shield",
    }
    assert topology.connection_pairs


def test_embedded_cables_supply_occupied_cells_without_port_gating():
    engine = BattleEngine(BattleState(battle_id="embedded-gap"))
    engine.add_player("p1")
    _active(engine, "core", "core", 2, 1)
    _active(engine, "generator", "generator", 2, 0)
    _active(engine, "laser", "laser", 4, 2)

    topology = build_energy_topology(
        engine.state.players["p1"],
        engine.board.core_position,
    )

    assert set(topology.reachable_from_generator) == {"core", "generator", "laser"}
