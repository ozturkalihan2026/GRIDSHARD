from app.game.engine import (
    BattleEngine,
    max_active_modules_for_elapsed_ms,
)
from app.game.models import BattleCommand, BattleState, ModuleStatus


def create_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="capacity-test"))
    engine.add_player("player-1")

    engine.grant_module("player-1", "core-1", "core")
    engine.grant_module("player-1", "generator-1", "generator")
    engine.grant_module("player-1", "laser-1", "laser")
    engine.grant_module("player-1", "shield-1", "shield")
    engine.grant_module("player-1", "battery-1", "battery")
    engine.grant_module("player-1", "amplifier-1", "amplifier")
    engine.grant_module("player-1", "cooler-1", "cooler")
    engine.grant_module("player-1", "repair-1", "repair")

    engine.set_initial_active_module("player-1", "core-1", 2, 2)
    engine.set_initial_active_module("player-1", "generator-1", 2, 3)
    engine.start()
    return engine


def advance_to(engine: BattleEngine, elapsed_ms: int) -> None:
    target_tick = elapsed_ms // 100
    while engine.state.tick < target_tick:
        engine.step()


def command(engine: BattleEngine, kind: str, **payload) -> None:
    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind=kind,
            payload=payload,
        )
    )
    engine.step()


def test_capacity_schedule_boundaries():
    assert max_active_modules_for_elapsed_ms(0) is None
    assert max_active_modules_for_elapsed_ms(14_999) is None
    assert max_active_modules_for_elapsed_ms(15_000) == 5
    assert max_active_modules_for_elapsed_ms(24_999) == 5
    assert max_active_modules_for_elapsed_ms(25_000) == 6
    assert max_active_modules_for_elapsed_ms(34_999) == 6
    assert max_active_modules_for_elapsed_ms(35_000) == 7
    assert max_active_modules_for_elapsed_ms(45_000) == 8
    assert max_active_modules_for_elapsed_ms(55_000) == 9
    assert max_active_modules_for_elapsed_ms(65_000) == 10
    assert max_active_modules_for_elapsed_ms(75_000) == 10
    assert max_active_modules_for_elapsed_ms(85_000) == 10
    assert max_active_modules_for_elapsed_ms(999_999) == 10


def test_dynamic_place_is_rejected_before_15_seconds():
    engine = create_engine()
    advance_to(engine, 14_900)

    command(engine, "place_module", module_id="laser-1", x=3, y=3)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.status == ModuleStatus.RESERVE
    assert engine.state.events[-1].type == "command_rejected"


def test_at_15_seconds_five_active_modules_are_allowed():
    engine = create_engine()
    advance_to(engine, 15_000)

    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    command(engine, "place_module", module_id="shield-1", x=3, y=2)
    command(engine, "place_module", module_id="battery-1", x=1, y=2)

    assert engine.active_module_count("player-1") == 5


def test_sixth_active_module_is_rejected_before_25_seconds():
    engine = create_engine()
    advance_to(engine, 15_000)

    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    command(engine, "place_module", module_id="shield-1", x=3, y=2)
    command(engine, "place_module", module_id="battery-1", x=1, y=2)
    command(engine, "place_module", module_id="amplifier-1", x=1, y=3)

    amplifier = engine.state.players["player-1"].modules["amplifier-1"]
    assert amplifier.status == ModuleStatus.RESERVE
    assert engine.active_module_count("player-1") == 5
    assert engine.state.events[-1].type == "command_rejected"


def test_sixth_active_module_is_allowed_at_25_seconds():
    engine = create_engine()
    advance_to(engine, 15_000)

    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    command(engine, "place_module", module_id="shield-1", x=3, y=2)
    command(engine, "place_module", module_id="battery-1", x=1, y=2)

    advance_to(engine, 25_000)
    command(engine, "place_module", module_id="amplifier-1", x=1, y=3)

    amplifier = engine.state.players["player-1"].modules["amplifier-1"]
    assert amplifier.status == ModuleStatus.ACTIVE
    assert engine.active_module_count("player-1") == 6


def test_replace_does_not_require_free_capacity():
    engine = create_engine()
    advance_to(engine, 15_000)

    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    command(engine, "place_module", module_id="shield-1", x=3, y=2)

    assert engine.active_module_count("player-1") == 4

    command(
        engine,
        "replace_module",
        outgoing_module_id="laser-1",
        incoming_module_id="battery-1",
    )

    assert engine.active_module_count("player-1") == 4
    assert engine.state.players["player-1"].modules["battery-1"].status == ModuleStatus.ACTIVE


def test_remove_is_allowed_when_at_capacity_and_reduces_count():
    engine = create_engine()
    advance_to(engine, 15_000)

    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    command(engine, "place_module", module_id="shield-1", x=3, y=2)
    assert engine.active_module_count("player-1") == 4

    command(engine, "remove_module", module_id="laser-1")

    assert engine.active_module_count("player-1") == 3


def test_capacity_changes_do_not_pause_battle_clock():
    engine = create_engine()
    advance_to(engine, 24_900)
    assert engine.max_active_modules() == 5

    engine.step()

    assert engine.state.elapsed_ms == 25_000
    assert engine.max_active_modules() == 6
    assert engine.state.status.value == "running"
