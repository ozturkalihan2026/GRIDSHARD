from app.game.boosters import BOOSTER_DEFINITIONS, get_booster_definition
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus

def build_engine():
    engine = BattleEngine(BattleState(battle_id="booster-test"))
    engine.add_player("p1")
    for instance_id, definition_id in (
        ("core-1","core"), ("generator-1","generator"),
        ("laser-1","laser"), ("shield-1","shield"),
    ):
        engine.grant_module("p1", instance_id, definition_id)
    engine.set_initial_active_module("p1","core-1",2,2)
    engine.set_initial_active_module("p1","generator-1",2,3)
    engine.start()
    for _ in range(150):
        engine.step()
    engine.enqueue_command(BattleCommand("p1","place_module",{"module_id":"laser-1","x":3,"y":1}))
    engine.step()
    engine.enqueue_command(BattleCommand("p1","place_module",{"module_id":"shield-1","x":4,"y":3}))
    engine.step()
    return engine

def apply_booster(engine, booster_id, target_module_id):
    engine.enqueue_command(BattleCommand("p1","apply_booster",{
        "booster_id":booster_id,
        "target_module_id":target_module_id,
    }))
    engine.step()

def test_three_boosters_exist():
    assert set(BOOSTER_DEFINITIONS)=={"overcharge_chip","emergency_repair","dual_port_adapter"}

def test_turkish_names():
    assert get_booster_definition("overcharge_chip").name_tr=="Aşırı Yük Çipi"
    assert get_booster_definition("emergency_repair").name_tr=="Acil Onarım"
    assert get_booster_definition("dual_port_adapter").name_tr=="Çift Port Adaptörü"

def test_overcharge_attack_only():
    engine=build_engine()
    apply_booster(engine,"overcharge_chip","laser-1")
    laser=engine.state.players["p1"].modules["laser-1"]
    assert laser.temporary_boosters["overcharge_chip"].data["attack_multiplier"]==1.25

def test_overcharge_rejects_shield():
    engine=build_engine()
    apply_booster(engine,"overcharge_chip","shield-1")
    shield=engine.state.players["p1"].modules["shield-1"]
    assert "overcharge_chip" not in shield.temporary_boosters
    assert engine.state.events[-1].type=="command_rejected"

def test_emergency_repair_25_percent():
    engine=build_engine()
    laser=engine.state.players["p1"].modules["laser-1"]
    engine.apply_damage("p1","laser-1",50)
    apply_booster(engine,"emergency_repair","laser-1")
    assert laser.hp==75

def test_repair_does_not_exceed_max():
    engine=build_engine()
    laser=engine.state.players["p1"].modules["laser-1"]
    engine.apply_damage("p1","laser-1",10)
    apply_booster(engine,"emergency_repair","laser-1")
    assert laser.hp==laser.definition.max_hp

def test_dual_port_temporary_state():
    engine=build_engine()
    apply_booster(engine,"dual_port_adapter","shield-1")
    shield=engine.state.players["p1"].modules["shield-1"]
    assert shield.temporary_boosters["dual_port_adapter"].data["extra_port_count"]==1

def test_target_must_be_active():
    engine=build_engine()
    engine.grant_module("p1","battery-1","battery")
    apply_booster(engine,"dual_port_adapter","battery-1")
    battery=engine.state.players["p1"].modules["battery-1"]
    assert battery.status==ModuleStatus.RESERVE
    assert engine.state.events[-1].type=="command_rejected"

def test_apply_does_not_pause():
    engine=build_engine()
    before=engine.state.elapsed_ms
    apply_booster(engine,"dual_port_adapter","shield-1")
    assert engine.state.elapsed_ms==before+100
    assert engine.state.status.value=="running"

def test_timed_booster_expires():
    engine=build_engine()
    apply_booster(engine,"dual_port_adapter","shield-1")
    shield=engine.state.players["p1"].modules["shield-1"]
    assert "dual_port_adapter" in shield.temporary_boosters
    for _ in range(151):
        engine.step()
    assert "dual_port_adapter" not in shield.temporary_boosters
