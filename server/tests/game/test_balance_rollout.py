"""Behavioral regressions for the staged 36-card balance rollout."""
from dataclasses import replace
from itertools import product
from math import isfinite

import pytest

from app.arena_canon import module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS as DEFINITIONS
from app.game.ai import choose_deploy_definition
from app.game.combat import AttackResolution, defense_profile, select_target
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position, TimedModuleEffect
from app.game.operations import has_disabling_sabotage, module_is_operational
from app.game.sabotage import (
    CONTROL_RECOVERY_MS, EMP_DEBUFF_ID, SINGULARITY_DEBUFF_ID,
    plan_sabotage, sabotage_duration_ms,
)
from app.game.support import attack_support_modifiers, repair_amount


def setup(level=1):
    e=BattleEngine(BattleState(battle_id="rollout-regression"))
    for owner in ("a","b"):
        p=e.add_player(owner);p.core_level=level
        e.state.player_upgrade_levels[owner]={key:level-1 for key in DEFINITIONS}
        add(e,owner,"core",f"{owner}-core",2,1)
    return e


def add(e,owner,key,iid=None,x=0,y=0):
    m=e.grant_module(owner,iid or f"{owner}-{key}",key)
    m.status=ModuleStatus.ACTIVE;m.position=Position(x,y)
    return m


def debuff(m,key,**data):
    m.debuffs[key]=TimedModuleEffect(key,key,5000,data)


@pytest.mark.parametrize("key",[key for key in DEFINITIONS if key!="core"])
@pytest.mark.parametrize("effect",["virus","support_jammed","line_disrupted"])
def test_soft_sabotage_never_shuts_down_an_unrelated_role(key,effect):
    e=setup();m=add(e,"b",key);debuff(m,effect);e._process_energy_flow()
    assert has_disabling_sabotage(m)==(effect=="line_disrupted" and m.definition.category=="enerji")
    if not has_disabling_sabotage(m):assert module_is_operational(m)


@pytest.mark.parametrize("effect",[EMP_DEBUFF_ID,SINGULARITY_DEBUFF_ID])
def test_disabled_shield_still_protects_core_by_its_physical_presence(effect):
    e=setup();shield=add(e,"b","shield");debuff(shield,effect);e._process_energy_flow()
    assert select_target(e.state.players["b"]) is shield
    assert defense_profile(shield)[1]==1.0


def test_jammer_weakens_repair_and_attack_support_without_stopping_them():
    e=setup();repair=add(e,"b","repair");amp=add(e,"b","amplifier","b-amp",1,0)
    gun=add(e,"b","laser","b-gun",2,0);e._process_energy_flow()
    before=repair_amount(repair)
    old=attack_support_modifiers(e.state.players["b"],gun,e.board.core_position).damage_multiplier
    debuff(repair,"support_jammed");debuff(amp,"support_jammed")
    e._process_energy_flow()
    assert module_is_operational(repair) and module_is_operational(amp)
    assert 0 < repair_amount(repair) < before
    new=attack_support_modifiers(e.state.players["b"],gun,e.board.core_position).damage_multiplier
    assert 1 < new < old


@pytest.mark.parametrize("sab,target,allowed",[
    ("jammer","laser",False),("jammer","repair",True),
    ("disruptor","laser",False),("disruptor","battery",True),
    ("disruptor","capacitor",True),("disruptor","current_balancer",True),
])
def test_specialists_choose_only_their_role(sab,target,allowed):
    e=setup();source=add(e,"a",sab);add(e,"b",target);e._process_energy_flow()
    assert (plan_sabotage(source,e.state.players["b"]) is not None)==allowed


def test_singularity_reaches_two_targets_without_cutting_their_energy_bus():
    e=setup(15);add(e,"a","singularity_projector")
    targets=[add(e,"b",key,f"b-{i}",i,0) for i,key in enumerate(("laser","shield","battery"))]
    e._process_energy_flow();e._process_sabotage_actions();e._process_energy_flow()
    affected=[m for m in targets if SINGULARITY_DEBUFF_ID in m.debuffs]
    assert len(affected)==2
    assert all(m.debuffs[SINGULARITY_DEBUFF_ID].expires_at_ms<=2000 for m in affected)
    assert all(select_target(e.state.players["b"]).definition.id!="core" for _ in range(2))


def test_hard_control_cannot_chain_immediately_after_expiry():
    e=setup(15);first=add(e,"a","emp","a-emp");second=add(e,"a","emp","a-second",1,0)
    target=add(e,"b","laser");e._process_energy_flow();e._process_sabotage_actions()
    end=target.debuffs[EMP_DEBUFF_ID].expires_at_ms
    target.debuffs.clear();target.is_powered=True
    assert plan_sabotage(second,e.state.players["b"],elapsed_ms=end) is None
    assert plan_sabotage(second,e.state.players["b"],elapsed_ms=end+CONTROL_RECOVERY_MS) is not None
    assert 0 < end <= 2400


def test_virus_has_six_damage_ticks_and_never_suspends_its_target():
    e=setup(15);source=add(e,"a","virus");target=add(e,"b","laser")
    source.definition=replace(source.definition,max_hp=10000);source.hp=10000
    target.definition=replace(target.definition,max_hp=10000);target.hp=10000
    e.start()
    for _ in range(62):e.step()
    hits=[ev for ev in e.state.events if ev.type=="virus_damage"]
    assert len(hits)==6
    assert all(a.data["damage"] < b.data["damage"] for a,b in zip(hits,hits[1:]))
    assert any(ev.type=="attack_performed" and ev.data["attacker_module_id"]==target.instance_id for ev in e.state.events)
    stats=module_stats(DEFINITIONS['virus'],14)
    displayed=next(s['value'] for s in stats['specials'] if s['key']=='virus_damage')
    assert sum(ev.data['damage'] for ev in hits)==displayed


@pytest.mark.parametrize("key,cap",[("emp",2400),("singularity_projector",2000)])
def test_control_duration_has_a_ceiling_even_with_large_talent_effects(key,cap):
    d=replace(DEFINITIONS[key],effect_multiplier=10)
    assert sabotage_duration_ms(d,1.25)<=cap


@pytest.mark.parametrize("key",[key for key,d in DEFINITIONS.items() if d.category=="saldırı"])
def test_equal_level_survival_does_not_collapse_with_upgrades(key):
    d=DEFINITIONS[key]
    first,last=module_stats(d,0),module_stats(d,14)
    survival0=first['max_hp']/(first['base_damage']*1000/first['cooldown_ms'])
    survival15=last['max_hp']/(last['base_damage']*1000/last['cooldown_ms'])
    assert survival15>=.90*survival0
    assert last['max_hp']>first['max_hp'] and last['base_damage']>first['base_damage']


def test_equal_fractional_blocking_has_same_heat_at_low_and_max_level():
    heats=[]
    for level in (1,15):
        e=setup(level);shield=add(e,'b','shield')
        e._heat_defense_from_block('b',shield,.20*shield.definition.max_hp)
        heats.append(shield.heat)
    assert heats[0]==pytest.approx(heats[1])
    assert heats[0]>0


def test_cooler_reduces_heat_without_changing_control_time():
    e=setup();add(e,'b','cooler');gun=add(e,'b','laser','b-gun',1,0)
    gun.heat=80;debuff(gun,EMP_DEBUFF_ID)
    until=gun.debuffs[EMP_DEBUFF_ID].expires_at_ms
    e._process_energy_flow();e._process_support_actions()
    assert gun.debuffs[EMP_DEBUFF_ID].expires_at_ms==until
    gun.debuffs.clear();e._process_energy_flow();e._process_support_actions()
    assert gun.heat<80


def test_prism_does_not_turn_arbitrary_damage_into_unbounded_energy():
    for level in (1,15):
        e=setup(level);prism=add(e,'b','prism_shield');p=e.state.players['b']
        p.energy_stock=0
        hit=AttackResolution('a','gun','b',prism.instance_id,10000,1,1,10000,'Prism',.2,8000,2000,0)
        e._convert_prism_energy('b',prism,hit)
        assert 0 < p.energy_stock <= 3.0


def test_ai_saves_for_a_weapon_instead_of_endlessly_rebuying_cheap_utility():
    e=setup();p=e.state.players['a'];p.circuit_credits=2
    e.set_battle_pool('a',('pulse_cannon','missile_launcher','shield','repair','targeting_computer','battery'))
    add(e,'b','quantum_cannon');add(e,'b','ion_spear','b-ion',1,0)
    e._process_energy_flow()
    assert choose_deploy_definition(p,e.state.players['b']) is None
    p.circuit_credits=4
    assert DEFINITIONS[choose_deploy_definition(p,e.state.players['b'])].category=='saldırı'


def test_ai_can_save_for_a_better_weapon_after_repeated_cheap_mutual_losses():
    e=setup();p=e.state.players['a'];p.circuit_credits=3
    add(e,'b','laser')
    e.set_battle_pool('a',('pulse_cannon','arc_cannon','amplifier','reflector','repair','battery'))
    for n in range(8):
        m=add(e,'a','pulse_cannon',f'old-{n}');m.hp=0;m.status=ModuleStatus.DESTROYED
    assert choose_deploy_definition(p,e.state.players['b']) is None
    p.circuit_credits=4
    assert choose_deploy_definition(p,e.state.players['b'])=='arc_cannon'


def test_ai_breaks_mutual_wipe_standoffs_with_one_frontline_then_saves_for_attack():
    e=setup();p=e.state.players['a'];p.circuit_credits=3
    e.set_battle_pool('a',('railgun','quantum_repeater','precision_matrix','targeting_computer','armor','current_balancer'))
    for n in range(2):
        m=add(e,'a','railgun',f'old-{n}');m.hp=0;m.status=ModuleStatus.DESTROYED
    assert choose_deploy_definition(p,e.state.players['b'])=='armor'
    add(e,'a','armor')
    assert choose_deploy_definition(p,e.state.players['b']) is None


@pytest.mark.parametrize("key",[key for key in DEFINITIONS if key!='core'])
def test_all_max_level_talent_branches_keep_valid_card_stats_and_control_caps(key):
    d=DEFINITIONS[key]
    for choices in product(('power','resilience'),repeat=4):
        stats=module_stats(d,14,{str(tier):choice for tier,choice in enumerate(choices)})
        assert stats['max_hp']>d.max_hp
        for field in ('base_damage','cooldown_ms','energy_consumption','action_energy_cost','energy_per_second'):
            assert isfinite(stats[field]) and stats[field]>=0
        assert all(isfinite(s['value']) and s['value']>=0 for s in stats['specials'])
        duration=next((s['value'] for s in stats['specials'] if s['key']=='duration'),None)
        if key=='emp':assert duration<=2.4
        if key=='singularity_projector':assert duration<=2.0
        if key=='virus':assert duration==6.0
