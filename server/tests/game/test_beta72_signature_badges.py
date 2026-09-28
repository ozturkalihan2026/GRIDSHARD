from app.game.combat import PHASE_ARMOR_CYCLE_MS
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus
from app.game.pvp_session import PvPSessionService, module_signature_badges


def engine_with(*definition_ids):
    engine = BattleEngine(BattleState(battle_id="badges"))
    engine.add_player("a")
    engine.grant_module("a", "a-core", "core")
    engine.set_initial_active_module("a", "a-core", 2, 1)
    positions = iter(engine.board.placeable_positions)
    for definition_id in definition_ids:
        position = next(positions)
        engine.grant_module("a", definition_id, definition_id)
        engine.set_initial_active_module("a", definition_id, position.x, position.y)
    return engine


def badges(engine, instance_id, elapsed_ms=0):
    player = engine.state.players["a"]
    return module_signature_badges(player, player.modules[instance_id], elapsed_ms)


def test_counters_show_only_after_they_start():
    engine = engine_with("quantum_repeater", "swarm_fabricator", "quantum_cannon")
    assert badges(engine, "quantum_repeater") == []
    modules = engine.state.players["a"].modules
    modules["quantum_repeater"].mechanic_state["repeat_stacks"] = 3
    modules["swarm_fabricator"].mechanic_state["stored_drones"] = 2
    modules["quantum_cannon"].mechanic_state["quantum_charge"] = 13.9
    assert badges(engine, "quantum_repeater") == [{"kind": "repeat", "value": 3, "max": 4}]
    assert badges(engine, "swarm_fabricator") == [{"kind": "swarm", "value": 2, "max": 4}]
    # Yük %10 adımlarla gider; her tik rozeti değiştirmez.
    assert badges(engine, "quantum_cannon") == [{"kind": "quantum", "value": 40, "max": 100}]


def test_timed_windows_follow_the_engine_clock():
    engine = engine_with("missile_launcher", "chrono_relay", "phase_armor")
    modules = engine.state.players["a"].modules
    modules["missile_launcher"].mechanic_state.update(windup_target_id="b-core", windup_ready_at_ms=700)
    assert badges(engine, "missile_launcher", 100) == [{"kind": "lock"}]
    assert badges(engine, "missile_launcher", 700) == []

    modules["chrono_relay"].mechanic_state.update(chrono_boost_until_ms=4000, chrono_debt_until_ms=6500)
    assert badges(engine, "chrono_relay", 1000) == [{"kind": "chrono", "phase": "boost"}]
    assert badges(engine, "chrono_relay", 5000) == [{"kind": "chrono", "phase": "debt"}]
    assert badges(engine, "chrono_relay", 7000) == []

    assert badges(engine, "phase_armor", PHASE_ARMOR_CYCLE_MS) == [{"kind": "phase"}]
    assert badges(engine, "phase_armor", PHASE_ARMOR_CYCLE_MS + 1500) == []


def test_focus_rebirth_and_inactive_modules():
    engine = engine_with("laser")
    laser = engine.state.players["a"].modules["laser"]
    laser.mechanic_state.update(precision_focus_stacks=9, phoenix_revived=True)
    assert badges(engine, "laser") == [
        {"kind": "focus", "value": 4, "max": 4},
        {"kind": "reborn"},
    ]
    laser.status = ModuleStatus.DESTROYED
    assert badges(engine, "laser") == []


def test_snapshot_modules_carry_signature_badges():
    service = PvPSessionService()
    session = service.create_session("badges")
    service.join(session.session_id, "player")
    repeater = session.engine.grant_module("player", "repeater-1", "quantum_repeater")
    repeater.status = ModuleStatus.ACTIVE
    repeater.mechanic_state["repeat_stacks"] = 2
    snapshot = service.snapshot(session.session_id, "player")
    module_view = next(
        module
        for module in snapshot["players"]["player"]["modules"]
        if module["instance_id"] == "repeater-1"
    )
    assert module_view["signature_badges"] == [{"kind": "repeat", "value": 2, "max": 4}]
