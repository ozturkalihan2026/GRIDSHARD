from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.engine import BattleEngine
from app.game.models import (
    BattleCommand,
    BattleState,
    Direction,
    ModuleStatus,
)


def create_engine() -> BattleEngine:
    state = BattleState(battle_id="dynamic-test")
    engine = BattleEngine(state)
    engine.add_player("player-1")
    return engine


def grant_standard_modules(engine: BattleEngine) -> None:
    engine.grant_module("player-1", "core-1", "core")
    engine.grant_module("player-1", "generator-1", "generator")
    engine.grant_module("player-1", "laser-1", "laser")
    engine.grant_module("player-1", "shield-1", "shield")
    engine.grant_module("player-1", "battery-1", "battery")


def start_with_core_and_generator(engine: BattleEngine) -> None:
    grant_standard_modules(engine)
    engine.set_initial_active_module("player-1", "core-1", 2, 2)
    engine.set_initial_active_module("player-1", "generator-1", 2, 3)
    engine.start()

    # alpha.4: dinamik modül müdahalesi 15. saniyede açılır.
    for _ in range(150):
        engine.step()


def run_command(engine: BattleEngine, kind: str, **payload) -> None:
    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind=kind,
            payload=payload,
        )
    )
    engine.step()


def test_basic_catalog_uses_turkish_player_facing_names():
    assert BASIC_MODULE_DEFINITIONS["core"].name_tr == "Çekirdek"
    assert BASIC_MODULE_DEFINITIONS["generator"].name_tr == "Jeneratör"
    assert BASIC_MODULE_DEFINITIONS["laser"].name_tr == "Lazer"
    assert BASIC_MODULE_DEFINITIONS["repair"].name_tr == "Onarım Modülü"


def test_place_module_while_battle_keeps_running():
    engine = create_engine()
    start_with_core_and_generator(engine)

    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.status == ModuleStatus.ACTIVE
    assert (laser.position.x, laser.position.y) == (3, 3)
    assert engine.state.elapsed_ms == 15_100


def test_command_is_not_applied_until_next_tick():
    engine = create_engine()
    start_with_core_and_generator(engine)

    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind="place_module",
            payload={"module_id": "laser-1", "x": 3, "y": 3},
        )
    )

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.status == ModuleStatus.RESERVE

    engine.step()
    assert laser.status == ModuleStatus.ACTIVE


def test_active_module_remains_in_battle_until_remove_command_is_processed():
    engine = create_engine()
    start_with_core_and_generator(engine)
    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)

    laser = engine.state.players["player-1"].modules["laser-1"]

    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind="remove_module",
            payload={"module_id": "laser-1"},
        )
    )

    assert laser.status == ModuleStatus.ACTIVE
    assert laser.position is not None

    engine.step()

    assert laser.status == ModuleStatus.RESERVE
    assert laser.position is None


def test_remove_module_preserves_current_hp():
    engine = create_engine()
    start_with_core_and_generator(engine)
    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)

    engine.apply_damage("player-1", "laser-1", 57)
    run_command(engine, "remove_module", module_id="laser-1")

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.status == ModuleStatus.RESERVE
    assert laser.hp == 43


def test_redeploy_module_returns_with_same_hp():
    engine = create_engine()
    start_with_core_and_generator(engine)
    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)

    engine.apply_damage("player-1", "laser-1", 57)
    run_command(engine, "remove_module", module_id="laser-1")
    run_command(engine, "place_module", module_id="laser-1", x=1, y=2)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.status == ModuleStatus.ACTIVE
    assert laser.hp == 43
    assert (laser.position.x, laser.position.y) == (1, 2)


def test_move_module_changes_only_position():
    engine = create_engine()
    start_with_core_and_generator(engine)
    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)
    engine.apply_damage("player-1", "laser-1", 10)

    run_command(engine, "move_module", module_id="laser-1", x=3, y=4)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert (laser.position.x, laser.position.y) == (3, 4)
    assert laser.hp == 90


def test_replace_module_keeps_outgoing_hp_in_reserve():
    engine = create_engine()
    start_with_core_and_generator(engine)
    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)
    engine.apply_damage("player-1", "laser-1", 25)

    run_command(
        engine,
        "replace_module",
        outgoing_module_id="laser-1",
        incoming_module_id="shield-1",
    )

    modules = engine.state.players["player-1"].modules
    laser = modules["laser-1"]
    shield = modules["shield-1"]

    assert laser.status == ModuleStatus.RESERVE
    assert laser.hp == 75
    assert laser.position is None

    assert shield.status == ModuleStatus.ACTIVE
    assert (shield.position.x, shield.position.y) == (3, 3)


def test_rotate_module_changes_direction():
    engine = create_engine()
    start_with_core_and_generator(engine)
    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.direction == Direction.LEFT

    run_command(engine, "rotate_module", module_id="laser-1")
    assert laser.direction == Direction.UP

    run_command(
        engine,
        "rotate_module",
        module_id="laser-1",
        clockwise=False,
    )
    assert laser.direction == Direction.LEFT


def test_destroyed_module_cannot_be_redeployed():
    engine = create_engine()
    start_with_core_and_generator(engine)
    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)

    engine.apply_damage("player-1", "laser-1", 100)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.status == ModuleStatus.DESTROYED
    assert laser.hp == 0
    assert laser.position is None

    run_command(engine, "place_module", module_id="laser-1", x=3, y=4)

    assert laser.status == ModuleStatus.DESTROYED
    assert engine.state.events[-1].type == "command_rejected"


def test_cannot_place_module_on_occupied_cell():
    engine = create_engine()
    start_with_core_and_generator(engine)

    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)
    run_command(engine, "place_module", module_id="shield-1", x=3, y=3)

    shield = engine.state.players["player-1"].modules["shield-1"]
    assert shield.status == ModuleStatus.RESERVE
    assert engine.state.events[-1].type == "command_rejected"


def test_core_cannot_be_removed_or_moved():
    engine = create_engine()
    start_with_core_and_generator(engine)

    core = engine.state.players["player-1"].modules["core-1"]

    run_command(engine, "remove_module", module_id="core-1")
    assert core.status == ModuleStatus.ACTIVE

    run_command(engine, "move_module", module_id="core-1", x=1, y=1)
    assert core.position.x == 2
    assert core.position.y == 2


def test_dynamic_commands_do_not_pause_battle_clock():
    engine = create_engine()
    start_with_core_and_generator(engine)

    run_command(engine, "place_module", module_id="laser-1", x=3, y=3)
    run_command(engine, "move_module", module_id="laser-1", x=4, y=3)
    run_command(engine, "rotate_module", module_id="laser-1")
    run_command(engine, "remove_module", module_id="laser-1")
    run_command(engine, "place_module", module_id="shield-1", x=3, y=3)

    assert engine.state.elapsed_ms == 15_500
