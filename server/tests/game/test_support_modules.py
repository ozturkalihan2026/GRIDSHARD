from app.game.combat import resolve_attack
from app.game.engine import BattleEngine
from app.game.models import BattleState, Direction, ModuleStatus, Position
from app.game.support import (
    AMPLIFIER_DAMAGE_MULTIPLIER,
    COOLER_HEAT_REDUCTION_PER_TICK,
    OVERCLOCK_COOLDOWN_MULTIPLIER,
    OVERCLOCK_DAMAGE_MULTIPLIER,
    TARGETING_COOLDOWN_MULTIPLIER,
    attack_support_modifiers,
    repair_amount,
)

def add(engine, player, iid, did, x, y, direction=Direction.UP):
    m=engine.grant_module(player,iid,did)
    m.status=ModuleStatus.ACTIVE
    m.position=Position(x,y)
    m.direction=direction
    return m

def make_engine():
    e=BattleEngine(BattleState(battle_id="support"))
    e.add_player("p1"); e.add_player("p2")
    return e

def powered_support_line(engine, support_id, support_def, target_id, target_def):
    add(engine,"p1","core","core",2,2)
    add(engine,"p1","gen","generator",2,3)
    add(engine,"p1","splitter","splitter",2,1,Direction.DOWN)
    support=add(engine,"p1",support_id,support_def,1,1,Direction.RIGHT)
    target=add(engine,"p1",target_id,target_def,0,1,Direction.RIGHT)
    engine._process_energy_flow()
    return support,target

def test_repair_heals_connected_damaged_module_with_cell_bonus():
    e=make_engine()
    repair,shield=powered_support_line(e,"repair","repair","shield","shield")
    shield.hp=40
    e._process_support_actions()
    assert repair.is_powered is True
    assert shield.hp==58

def test_repair_cell_bonus_is_real():
    e=make_engine()
    repair=add(e,"p1","repair","repair",1,1,Direction.RIGHT)
    assert repair_amount(repair)==18

def test_unpowered_repair_does_nothing():
    e=make_engine()
    add(e,"p1","core","core",2,2)
    add(e,"p1","gen","generator",2,3)
    repair=add(e,"p1","repair","repair",4,3,Direction.UP)
    shield=add(e,"p1","shield","shield",3,3,Direction.RIGHT)
    shield.hp=40
    e._process_energy_flow()
    e._process_support_actions()
    assert repair.is_powered is False
    assert shield.hp==40

def test_cooler_reduces_connected_heat():
    e=make_engine()
    cooler,rail=powered_support_line(e,"cooler","cooler","rail","railgun")
    rail.heat=10
    e._process_support_actions()
    assert cooler.is_powered is True
    assert rail.heat==10-COOLER_HEAT_REDUCTION_PER_TICK

def test_amplifier_increases_damage():
    e=make_engine()
    amp,laser=powered_support_line(e,"amp","amplifier","laser","laser")
    mods=attack_support_modifiers(e.state.players["p1"],laser,Position(2,2))
    assert amp.is_powered is True
    assert mods.amplifier_active is True
    assert mods.damage_multiplier==AMPLIFIER_DAMAGE_MULTIPLIER

def test_targeting_reduces_cooldown():
    e=make_engine()
    targeting,laser=powered_support_line(e,"targeting","targeting_computer","laser","laser")
    mods=attack_support_modifiers(e.state.players["p1"],laser,Position(2,2))
    assert targeting.is_powered is True
    assert mods.targeting_active is True
    assert mods.cooldown_multiplier==TARGETING_COOLDOWN_MULTIPLIER

def test_overclock_boosts_damage_cooldown_and_heat():
    e=make_engine()
    overclock,laser=powered_support_line(e,"overclock","overclock_unit","laser","laser")
    mods=attack_support_modifiers(e.state.players["p1"],laser,Position(2,2))
    before=laser.heat
    e._process_support_actions()
    assert overclock.is_powered is True
    assert mods.overclock_active is True
    assert mods.damage_multiplier==OVERCLOCK_DAMAGE_MULTIPLIER
    assert mods.cooldown_multiplier==OVERCLOCK_COOLDOWN_MULTIPLIER
    assert laser.heat>before

def test_support_multiplier_changes_real_attack_resolution():
    e=make_engine()
    attacker=add(e,"p1","laser","laser",1,1)
    target=add(e,"p2","armor","armor",2,1)
    normal=resolve_attack("p1",attacker,"p2",target)
    boosted=resolve_attack("p1",attacker,"p2",target,support_damage_multiplier=1.15)
    assert boosted.raw_damage>normal.raw_damage

def test_support_only_affects_direct_neighbor():
    e=make_engine()
    add(e,"p1","core","core",2,2)
    add(e,"p1","gen","generator",2,3)
    add(e,"p1","splitter","splitter",2,1,Direction.DOWN)
    add(e,"p1","amp","amplifier",1,1,Direction.RIGHT)
    laser=add(e,"p1","laser","laser",0,1,Direction.RIGHT)
    other=add(e,"p1","other","laser",3,1,Direction.LEFT)
    e._process_energy_flow()
    a=attack_support_modifiers(e.state.players["p1"],laser,Position(2,2))
    b=attack_support_modifiers(e.state.players["p1"],other,Position(2,2))
    assert a.amplifier_active is True
    assert b.amplifier_active is False

def test_support_processing_never_pauses():
    e=make_engine()
    e.state.status=type(e.state.status).RUNNING
    e._process_support_actions()
    assert e.state.status.value=="running"
