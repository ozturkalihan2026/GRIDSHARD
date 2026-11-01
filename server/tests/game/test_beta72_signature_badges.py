from app.module_roster import MODULE_SPECS
PHASE_ARMOR_CYCLE_MS=MODULE_SPECS["phase_armor"]["cooldown_ms"]
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


def test_counters_and_timed_badges_use_current_signatures_only():
    engine=engine_with('quantum_repeater','missile_launcher','phase_armor')
    units=engine.state.players['a'].modules
    assert badges(engine,'quantum_repeater')==[]
    units['quantum_repeater'].mechanic_state['v2_same_hits']=3
    assert badges(engine,'quantum_repeater')==[{'kind':'repeat','value':3,'max':4}]
    units['missile_launcher'].mechanic_state['v2_windup']={'ready':700}
    assert badges(engine,'missile_launcher',100)==[{'kind':'lock'}]
    assert badges(engine,'phase_armor',PHASE_ARMOR_CYCLE_MS)==[{'kind':'phase'}]
    assert badges(engine,'phase_armor',PHASE_ARMOR_CYCLE_MS+1500)==[]
    units['quantum_repeater'].status=ModuleStatus.DESTROYED
    assert badges(engine,'quantum_repeater')==[]


def test_snapshot_modules_carry_signature_badges():
    service = PvPSessionService()
    session = service.create_session("badges")
    service.join(session.session_id, "player")
    repeater = session.engine.grant_module("player", "repeater-1", "quantum_repeater")
    repeater.status = ModuleStatus.ACTIVE
    repeater.mechanic_state["v2_same_hits"] = 2
    snapshot = service.snapshot(session.session_id, "player")
    module_view = next(
        module
        for module in snapshot["players"]["player"]["modules"]
        if module["instance_id"] == "repeater-1"
    )
    assert module_view["signature_badges"] == [{"kind": "repeat", "value": 2, "max": 4}]
