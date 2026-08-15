from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus


def create_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="state-persistence-test"))
    engine.add_player("player-1")
    engine.grant_module("player-1", "core-1", "core")
    engine.grant_module("player-1", "generator-1", "generator")
    engine.grant_module("player-1", "laser-1", "laser")
    engine.set_initial_active_module("player-1", "core-1", 2, 2)
    engine.set_initial_active_module("player-1", "generator-1", 2, 3)
    engine.start()

    for _ in range(150):
        engine.step()

    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind="place_module",
            payload={"module_id": "laser-1", "x": 3, "y": 3},
        )
    )
    engine.step()
    return engine


def remove_laser(engine: BattleEngine) -> None:
    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind="remove_module",
            payload={"module_id": "laser-1"},
        )
    )
    engine.step()


def redeploy_laser(engine: BattleEngine) -> None:
    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind="place_module",
            payload={"module_id": "laser-1", "x": 4, "y": 3},
        )
    )
    engine.step()


def test_heat_is_preserved_in_reserve_and_on_redeploy():
    engine = create_engine()
    engine.set_module_heat("player-1", "laser-1", 72.5)

    remove_laser(engine)
    laser = engine.state.players["player-1"].modules["laser-1"]

    assert laser.status == ModuleStatus.RESERVE
    assert laser.heat == 72.5

    redeploy_laser(engine)
    assert laser.status == ModuleStatus.ACTIVE
    assert laser.heat == 72.5


def test_stored_energy_is_preserved_in_reserve_and_on_redeploy():
    engine = create_engine()
    engine.set_module_stored_energy("player-1", "laser-1", 18.75)

    remove_laser(engine)
    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.stored_energy == 18.75

    redeploy_laser(engine)
    assert laser.stored_energy == 18.75


def test_debuff_remains_attached_while_module_is_in_reserve():
    engine = create_engine()

    engine.add_debuff(
        "player-1",
        "laser-1",
        "signal_slow",
        "Sinyal Yavaşlatma",
        duration_ms=5_000,
        data={"cooldown_multiplier": 1.25},
    )

    remove_laser(engine)
    laser = engine.state.players["player-1"].modules["laser-1"]

    assert "signal_slow" in laser.debuffs
    assert laser.status == ModuleStatus.RESERVE


def test_timed_debuff_expires_with_battle_clock_even_in_reserve():
    engine = create_engine()

    engine.add_debuff(
        "player-1",
        "laser-1",
        "emp_lock",
        "EMP Kilidi",
        duration_ms=500,
    )
    remove_laser(engine)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert "emp_lock" in laser.debuffs

    for _ in range(6):
        engine.step()

    assert laser.status == ModuleStatus.RESERVE
    assert "emp_lock" not in laser.debuffs


def test_non_timed_persistent_effect_survives_reserve_and_redeploy():
    engine = create_engine()

    engine.add_persistent_effect(
        "player-1",
        "laser-1",
        "battle_mark",
        "Savaş İşareti",
        duration_ms=None,
        data={"stacks": 2},
    )

    remove_laser(engine)
    redeploy_laser(engine)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert "battle_mark" in laser.persistent_effects
    assert laser.persistent_effects["battle_mark"].data["stacks"] == 2


def test_cooldown_continues_while_module_is_in_reserve():
    engine = create_engine()

    engine.start_cooldown(
        "player-1",
        "laser-1",
        "primary_fire",
        duration_ms=500,
    )
    remove_laser(engine)

    assert engine.is_cooldown_ready(
        "player-1",
        "laser-1",
        "primary_fire",
    ) is False

    for _ in range(6):
        engine.step()

    assert engine.is_cooldown_ready(
        "player-1",
        "laser-1",
        "primary_fire",
    ) is True


def test_temporary_booster_state_can_persist_into_reserve_until_expiry():
    engine = create_engine()

    engine.add_temporary_booster_state(
        "player-1",
        "laser-1",
        "overcharge_chip",
        "Aşırı Yük Çipi",
        duration_ms=1_000,
        data={"attack_multiplier": 1.25},
    )
    remove_laser(engine)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert "overcharge_chip" in laser.temporary_boosters

    for _ in range(5):
        engine.step()

    assert "overcharge_chip" in laser.temporary_boosters

    for _ in range(6):
        engine.step()

    assert "overcharge_chip" not in laser.temporary_boosters


def test_all_persistent_state_survives_remove_and_redeploy_without_reset():
    engine = create_engine()
    engine.apply_damage("player-1", "laser-1", 37)
    engine.set_module_heat("player-1", "laser-1", 44.0)
    engine.set_module_stored_energy("player-1", "laser-1", 9.5)
    engine.add_persistent_effect(
        "player-1",
        "laser-1",
        "calibration",
        "Kalibrasyon",
        data={"level": 1},
    )
    engine.add_debuff(
        "player-1",
        "laser-1",
        "armor_break",
        "Zırh Kırılması",
        duration_ms=10_000,
    )
    engine.start_cooldown(
        "player-1",
        "laser-1",
        "primary_fire",
        duration_ms=5_000,
    )

    remove_laser(engine)
    redeploy_laser(engine)

    laser = engine.state.players["player-1"].modules["laser-1"]

    assert laser.hp == 63
    assert laser.heat == 44.0
    assert laser.stored_energy == 9.5
    assert "calibration" in laser.persistent_effects
    assert "armor_break" in laser.debuffs
    assert "primary_fire" in laser.cooldowns_ready_at_ms
