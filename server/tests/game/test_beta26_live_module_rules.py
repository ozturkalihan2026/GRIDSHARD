from app.game.engine import BattleEngine
from app.game.models import (
    BattleCommand,
    BattleState,
    Direction,
    ModuleStatus,
)


def _command(engine: BattleEngine, kind: str, **payload) -> None:
    engine.enqueue_command(BattleCommand("player", kind, payload))
    engine.step()


def _legal_four_module_start() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="beta26-live-rules"))
    engine.add_player("player")
    for instance_id, definition_id in (
        ("core-1", "core"),
        ("generator-1", "generator"),
        ("laser-1", "laser"),
        ("pulse-1", "pulse_cannon"),
        ("shield-1", "shield"),
        ("battery-1", "battery"),
        ("armor-1", "armor"),
    ):
        engine.grant_module("player", instance_id, definition_id)

    engine.set_initial_active_module("player", "core-1", 2, 2)
    engine.set_initial_active_module("player", "generator-1", 2, 3)
    engine.set_initial_active_module(
        "player", "laser-1", 1, 3, Direction.RIGHT
    )
    engine.set_initial_active_module(
        "player", "armor-1", 3, 3, Direction.LEFT
    )
    engine.start()
    return engine


def test_capacity_allows_one_new_slot_per_ten_second_tier() -> None:
    engine = _legal_four_module_start()
    for _ in range(150):
        engine.step()

    _command(engine, "place_module", module_id="shield-1", x=1, y=2)
    assert engine.state.players["player"].modules["shield-1"].status == ModuleStatus.RESERVE
    assert "4/4" in engine.state.events[-1].data["reason"]

    for _ in range(99):
        engine.step()
    assert engine.state.elapsed_ms == 25_000

    _command(engine, "place_module", module_id="shield-1", x=1, y=2)
    shield = engine.state.players["player"].modules["shield-1"]
    assert shield.status == ModuleStatus.ACTIVE
    assert shield.is_powered is True
    assert shield.energy_received_last_tick > 0

    _command(engine, "place_module", module_id="battery-1", x=3, y=2)
    assert engine.state.players["player"].modules["battery-1"].status == ModuleStatus.RESERVE
    assert "5/5" in engine.state.events[-1].data["reason"]


def test_replacements_remain_unlimited_inside_capacity_window() -> None:
    engine = _legal_four_module_start()
    for _ in range(250):
        engine.step()
    _command(engine, "place_module", module_id="shield-1", x=1, y=2)

    _command(
        engine,
        "replace_module",
        outgoing_module_id="shield-1",
        incoming_module_id="battery-1",
    )
    _command(
        engine,
        "replace_module",
        outgoing_module_id="armor-1",
        incoming_module_id="pulse-1",
    )

    modules = engine.state.players["player"].modules
    assert modules["battery-1"].status == ModuleStatus.ACTIVE
    assert modules["pulse-1"].status == ModuleStatus.ACTIVE
    assert engine.active_module_count("player") == 5


def test_unconnected_new_module_is_rejected_instead_of_silently_inactive() -> None:
    engine = _legal_four_module_start()
    for _ in range(250):
        engine.step()

    _command(engine, "place_module", module_id="shield-1", x=2, y=0)
    shield = engine.state.players["player"].modules["shield-1"]
    assert shield.status == ModuleStatus.RESERVE
    assert "port bağlantısı" in engine.state.events[-1].data["reason"]
