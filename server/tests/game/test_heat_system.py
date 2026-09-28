from app.game.engine import BattleEngine
from app.game.heat import (
    CRITICAL_HEAT_THRESHOLD,
    HIGH_HEAT_COOLDOWN_MULTIPLIER,
    HIGH_HEAT_DAMAGE_MULTIPLIER,
    HIGH_HEAT_THRESHOLD,
    OVERHEAT_DEBUFF_ID,
    heat_performance,
)
from app.game.models import BattleState, ModuleStatus, Position

def add(engine, player, iid, did, x, y):
    m=engine.grant_module(player,iid,did)
    m.status=ModuleStatus.ACTIVE
    m.position=Position(x,y)
    return m

def combat_engine():
    e=BattleEngine(BattleState(battle_id="heat"))
    e.add_player("p1"); e.add_player("p2")
    add(e,"p1","p1-core","core",2,1)
    laser=add(e,"p1","p1-laser","laser",1,1)
    add(e,"p2","p2-core","core",2,1)
    shield=add(e,"p2","p2-shield","shield",1,1)
    e._process_energy_flow()
    return e,laser,shield

def test_attack_generates_heat():
    e,laser,_=combat_engine()
    before=laser.heat
    e._process_combat_actions()
    assert laser.heat>before

def test_high_heat_penalizes_damage_and_cooldown():
    e,laser,_=combat_engine()
    laser.heat=HIGH_HEAT_THRESHOLD
    p=heat_performance(laser,e.state.elapsed_ms)
    assert p.high_heat is True
    assert p.damage_multiplier==HIGH_HEAT_DAMAGE_MULTIPLIER
    assert p.cooldown_multiplier==HIGH_HEAT_COOLDOWN_MULTIPLIER

def test_critical_heat_causes_overload():
    e,laser,_=combat_engine()
    laser.heat=CRITICAL_HEAT_THRESHOLD-1
    e._process_combat_actions()
    assert OVERHEAT_DEBUFF_ID in laser.debuffs
    assert any(ev.type=="module_overheated" for ev in e.state.events)

def test_overheated_module_cannot_attack():
    e,laser,shield=combat_engine()
    e.add_debuff("p1","p1-laser",OVERHEAT_DEBUFF_ID,"Aşırı Yük",2500,{"reason":"test"})
    before=shield.hp
    e._process_combat_actions()
    assert shield.hp==before
    assert any(ev.type=="attack_skipped_overheated" for ev in e.state.events)

def test_overload_self_damage_is_real():
    e,laser,_=combat_engine()
    laser.heat=CRITICAL_HEAT_THRESHOLD-1
    before=laser.hp
    e._process_combat_actions()
    assert laser.hp<before

def test_passive_cooling_reduces_powered_heat():
    e,laser,_=combat_engine()
    laser.heat=50
    e._process_passive_heat()
    assert laser.heat<50

def test_unpowered_module_preserves_heat():
    e,laser,_=combat_engine()
    laser.heat=50
    laser.is_powered=False
    e._process_passive_heat()
    assert laser.heat==50

def test_heat_state_exposed_in_module_event():
    e,laser,_=combat_engine()
    laser.heat=75
    data=e._module_event_data("p1",laser)
    assert data["heat_state"]=="high"

def test_heat_never_pauses_battle():
    e,laser,_=combat_engine()
    e.state.status=type(e.state.status).RUNNING
    laser.heat=110
    e._process_passive_heat()
    assert e.state.status.value=="running"
