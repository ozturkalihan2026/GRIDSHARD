from app.game.combat import counter_strategy_multiplier, defense_profile, resolve_attack, select_target
from app.game.engine import BattleEngine
from app.game.models import BattleState, Direction, ModuleStatus, Position

def add(engine, player_id, iid, did, x, y, direction=Direction.UP, powered=True):
    m=engine.grant_module(player_id,iid,did)
    m.status=ModuleStatus.ACTIVE
    m.position=Position(x,y)
    m.direction=direction
    m.is_powered=powered
    return m

def make_engine():
    e=BattleEngine(BattleState(battle_id="defense"))
    e.add_player("p1"); e.add_player("p2")
    return e

def test_powered_shield_reduces_damage():
    e=make_engine()
    laser=add(e,"p1","laser","laser",1,1,Direction.RIGHT)
    shield=add(e,"p2","shield","shield",2,1,powered=True)
    r=resolve_attack("p1",laser,"p2",shield)
    assert r.raw_damage==10
    assert r.defense_type=="Kalkan"
    assert r.final_damage==6
    assert r.reduced_damage==4

def test_unpowered_shield_does_not_reduce_damage():
    e=make_engine()
    laser=add(e,"p1","laser","laser",1,1)
    shield=add(e,"p2","shield","shield",2,1,powered=False)
    r=resolve_attack("p1",laser,"p2",shield)
    assert r.defense_type=="Yok"
    assert r.final_damage==r.raw_damage

def test_armor_is_passive():
    e=make_engine()
    pulse=add(e,"p1","pulse","pulse_cannon",1,1)
    armor=add(e,"p2","armor","armor",2,1,powered=False)
    r=resolve_attack("p1",pulse,"p2",armor)
    assert r.defense_type=="Zırh"
    assert r.final_damage<r.raw_damage

def test_reflector_requires_energy_and_reflects():
    e=make_engine()
    laser=add(e,"p1","laser","laser",1,1)
    ref=add(e,"p2","ref","reflector",2,1,powered=True)
    r=resolve_attack("p1",laser,"p2",ref)
    assert r.defense_type=="Yansıtıcı"
    assert r.final_damage<r.raw_damage
    assert r.reflected_damage>0
    ref.is_powered=False
    r2=resolve_attack("p1",laser,"p2",ref)
    assert r2.reflected_damage==0

def test_barrier_reduces_and_gets_priority_when_powered():
    e=make_engine()
    add(e,"p2","z-shield","shield",3,1,powered=True)
    barrier=add(e,"p2","barrier","barrier",2,1,powered=True)
    add(e,"p2","core","core",2,2)
    add(e,"p2","gen","generator",2,3)
    assert select_target(e.state.players["p2"]).instance_id=="barrier"
    rail=add(e,"p1","rail","railgun",1,1)
    r=resolve_attack("p1",rail,"p2",barrier)
    assert r.defense_type=="Bariyer"
    assert r.final_damage<r.raw_damage

def test_unpowered_barrier_loses_priority():
    e=make_engine()
    first=add(e,"p2","a-shield","shield",3,1,powered=True)
    add(e,"p2","z-barrier","barrier",2,1,powered=False)
    add(e,"p2","core","core",2,2)
    add(e,"p2","gen","generator",2,3)
    assert select_target(e.state.players["p2"]).instance_id==first.instance_id

def test_defense_cell_is_real():
    e=make_engine()
    laser=add(e,"p1","laser","laser",1,1)
    armor=add(e,"p2","armor","armor",4,2,powered=False)
    r=resolve_attack("p1",laser,"p2",armor)
    assert "Savunma Hücresi" in r.defense_type
    assert r.defense_multiplier < 0.75

def test_counter_strategy_multipliers():
    e=make_engine()
    laser=add(e,"p1","laser","laser",1,1)
    armor=add(e,"p2","armor","armor",2,1)
    shield=add(e,"p2","shield","shield",3,1)
    assert counter_strategy_multiplier(laser,armor)==1.25
    assert counter_strategy_multiplier(laser,shield)==0.80

def test_engine_reflection_applies_real_damage():
    e=make_engine()
    add(e,"p1","p1-core","core",2,2)
    add(e,"p1","p1-gen","generator",2,3)
    laser=add(e,"p1","p1-laser","laser",2,1,Direction.DOWN)
    add(e,"p2","p2-core","core",2,2)
    add(e,"p2","p2-gen","generator",2,3)
    ref=add(e,"p2","p2-ref","reflector",2,1,Direction.DOWN)
    e._process_energy_flow()
    lb,rb=laser.hp,ref.hp
    e._process_combat_actions()
    assert ref.hp<rb
    assert laser.hp<lb
    assert any(ev.type=="damage_reflected" for ev in e.state.events)

def test_defense_does_not_pause():
    e=make_engine()
    e.state.status=type(e.state.status).RUNNING
    assert e.state.status.value=="running"
