import pytest

from app.game.combat import resolve_attack
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position
from app.game.support import (
    AMPLIFIER_DAMAGE_MULTIPLIER,
    COOLER_HEAT_REDUCTION_PER_TICK,
    OVERCLOCK_COOLDOWN_MULTIPLIER,
    OVERCLOCK_DAMAGE_MULTIPLIER,
    TARGETING_COOLDOWN_MULTIPLIER,
    attack_support_modifiers,
    repair_amount,
)

def add(engine, player, iid, did, x, y):
    m=engine.grant_module(player,iid,did)
    m.status=ModuleStatus.ACTIVE
    m.position=Position(x,y)
    return m

def make_engine():
    e=BattleEngine(BattleState(battle_id="support"))
    e.add_player("p1"); e.add_player("p2")
    return e

def powered_support_line(engine, support_id, support_def, target_id, target_def):
    add(engine,"p1","core","core",2,1)
    support=add(engine,"p1",support_id,support_def,1,0)
    target=add(engine,"p1",target_id,target_def,0,0)
    engine._process_energy_flow()
    return support,target

def test_repair_heals_damaged_module():
    e=make_engine()
    repair,shield=powered_support_line(e,"repair","repair","shield","shield")
    shield.hp=40
    e._process_support_actions()
    assert repair.is_powered is True
    assert shield.hp==55


def test_repair_heals_one_lowest_health_target_and_emits_actual_value():
    e=make_engine()
    add(e,"p1","core","core",2,1)
    repair=add(e,"p1","repair","repair",0,0)
    shield=add(e,"p1","shield","shield",1,0)
    laser=add(e,"p1","laser","laser",4,2)
    repair.hp=93
    shield.hp=40
    laser.hp=95
    e._process_energy_flow()

    e._process_support_actions()

    assert repair.hp == 93
    assert shield.hp == 55
    assert laser.hp == 95
    repaired = [
        event.data
        for event in e.state.events
        if event.type == "module_repaired"
        and event.data.get("source_module_id") == repair.instance_id
    ]
    assert {
        event["target_module_id"]: event["repair"] for event in repaired
    } == {"shield": 15}

def test_normal_cells_have_no_hidden_repair_bonus():
    e=make_engine()
    repair=add(e,"p1","repair","repair",0,2)
    assert repair_amount(repair)==round(15 * repair.definition.effect_multiplier)

def test_embedded_bus_powers_remote_repair():
    e=make_engine()
    add(e,"p1","core","core",2,1)
    repair=add(e,"p1","repair","repair",4,2)
    shield=add(e,"p1","shield","shield",3,2)
    shield.hp=40
    e._process_energy_flow()
    e._process_support_actions()
    assert repair.is_powered is True
    assert shield.hp>40

def test_cooler_reduces_circuit_heat():
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
    assert mods.damage_multiplier==pytest.approx(1 + (AMPLIFIER_DAMAGE_MULTIPLIER - 1) * amp.definition.effect_multiplier)

def test_targeting_reduces_cooldown():
    e=make_engine()
    targeting,laser=powered_support_line(e,"targeting","targeting_computer","laser","laser")
    mods=attack_support_modifiers(e.state.players["p1"],laser,Position(2,2))
    assert targeting.is_powered is True
    assert mods.targeting_active is True
    assert mods.cooldown_multiplier==pytest.approx(1 - (1 - TARGETING_COOLDOWN_MULTIPLIER) * targeting.definition.effect_multiplier)

def test_overclock_boosts_damage_cooldown_and_heat():
    e=make_engine()
    overclock,laser=powered_support_line(e,"overclock","overclock_unit","laser","laser")
    mods=attack_support_modifiers(e.state.players["p1"],laser,Position(2,2))
    before=laser.heat
    e._process_support_actions()
    assert overclock.is_powered is True
    assert mods.overclock_active is True
    assert mods.damage_multiplier==pytest.approx(1 + (OVERCLOCK_DAMAGE_MULTIPLIER - 1) * overclock.definition.effect_multiplier)
    assert mods.cooldown_multiplier==pytest.approx(1 - (1 - OVERCLOCK_COOLDOWN_MULTIPLIER) * overclock.definition.effect_multiplier)
    assert laser.heat>before

def test_support_multiplier_changes_real_attack_resolution():
    e=make_engine()
    attacker=add(e,"p1","laser","laser",1,1)
    target=add(e,"p2","armor","armor",2,1)
    normal=resolve_attack("p1",attacker,"p2",target)
    boosted=resolve_attack("p1",attacker,"p2",target,support_damage_multiplier=1.15)
    assert boosted.raw_damage>normal.raw_damage

def test_amplifier_reaches_every_attack_and_shares_its_budget():
    e=make_engine()
    add(e,"p1","core","core",2,1)
    amp=add(e,"p1","amp","amplifier",1,0)
    lasers=[add(e,"p1",f"laser-{index}","laser",x,y) for index,(x,y) in enumerate(((0,0),(4,0),(0,2),(4,2)))]
    e._process_energy_flow()
    player=e.state.players["p1"]
    mods=[attack_support_modifiers(player,laser,Position(2,2)) for laser in lasers]
    # Yerleşim önemsizdir; dört saldırıda %30 pay dörde bölünür.
    assert all(item.amplifier_active for item in mods)
    assert all(item.damage_multiplier==pytest.approx(1 + 0.30 / 4 * amp.definition.effect_multiplier) for item in mods)

def test_support_processing_never_pauses():
    e=make_engine()
    e.state.status=type(e.state.status).RUNNING
    e._process_support_actions()
    assert e.state.status.value=="running"
