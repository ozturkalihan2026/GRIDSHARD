"""Behavioral contracts for signatures, budgets and counterplay on real engine."""
import pytest
from app.game.battle_actions_v2 import hit,shield,heal,params,support_actions
from app.game.models import TimedModuleEffect
from app.game.module_effects_v7 import budget
from test_main_current_only_v2 import battle,place,advance

def test_fractional_budget_accumulates_without_rounding_each_small_hit_up():
 e=battle();u=place(e,'a','laser')
 values=[budget(u,'probe',.15) for _ in range(20)]
 assert sum(values)==3 and set(values)<={0,1}

def test_plasma_has_three_bounded_ticks_not_recursively_reapplied():
 e=battle();u=place(e,'a','plasma_mortar');t=place(e,'b','barrier')
 hit(e,'a',u,'b',t,100);assert t.debuffs['plasma_dot'].data['remaining']==15
 # Stop new normal attacks without deleting the source record.
 u.hp=0
 before=t.hp;advance(e,3100)
 assert before-t.hp==15 and 'plasma_dot' not in t.debuffs
 events=[v for v in e.state.events if v.type=='attack_performed' and v.data['damage_kind']=='dot']
 assert len(events)==3 and sum(v.data['damage'] for v in events)==15

def test_cleanse_removes_plasma_and_fuse_with_no_fake_followup():
 e=battle();u=place(e,'a','missile_launcher');t=place(e,'b','barrier');c=place(e,'b','cleanser')
 hit(e,'a',u,'b',t,100);u.hp=0
 assert t.debuffs['missile_followup'].data['remaining']==20
 support_actions(e,'b','a');before=t.hp;advance(e,1000)
 assert t.hp==before and 'missile_followup' not in t.debuffs

def test_derived_damage_uses_actual_hp_loss_not_shield_or_overkill():
 e=battle();u=place(e,'a','plasma_mortar');t=place(e,'b','barrier')
 shield(e,'b',t,t,95,5000);hit(e,'a',u,'b',t,100)
 assert 'plasma_dot' not in t.debuffs # 5 * .15 floors to 0, fraction retained.
 assert budget(u,'plasma_dot',.25)==1
 t.hp=1;hit(e,'a',u,'b',t,1000);assert t.hp==0 and 'plasma_dot' not in t.debuffs

def test_quantum_fourth_echo_is_shared_bounded_and_excludes_core():
 e=battle();u=place(e,'a','quantum_repeater');targets=[place(e,'b','barrier') for _ in range(5)]
 for _ in range(3):hit(e,'a',u,'b',targets[0],10)
 before={t.instance_id:t.hp for t in targets};core=e.state.players['b'].modules['b-core'];hp=core.hp
 hit(e,'a',u,'b',targets[0],100)
 extra=sum(before[t.instance_id]-t.hp for t in targets[1:])
 assert extra==60 and all(before[t.instance_id]-t.hp<=20 for t in targets[1:])
 assert core.hp==hp and len([v for v in e.state.events if v.type=='attack_performed' and v.data['damage_kind']=='echo'])==4

def test_phase_miss_does_not_charge_quantum_and_shield_contact_does():
 e=battle();u=place(e,'a','quantum_repeater');t=place(e,'b','phase_armor')
 hit(e,'a',u,'b',t,10);assert not u.mechanic_state.get('v2_same_hits')
 e.state.elapsed_ms=1100;shield(e,'b',t,t,100);hit(e,'a',u,'b',t,10)
 assert u.mechanic_state['v2_same_hits']==1

def test_buffer_absorbs_seventy_percent_and_converts_only_actual_absorption():
 e=battle();source=place(e,'a','buffer_shield');protected=place(e,'a','barrier');other=place(e,'a','laser');other.hp-=100
 shield(e,'a',source,protected,60,5000,'buffer');before=protected.hp;old=other.hp
 e.apply_damage('a',protected.instance_id,100)
 assert before-protected.hp==40 and other.hp-old==24
 assert protected.persistent_effects['v2_shield_buffer'].data['shield_hp']==0

def test_buffer_cannot_recycle_heal_penalty_into_extra_heal_attempts():
 e=battle();source=place(e,'a','buffer_shield');protected=place(e,'a','barrier');other=place(e,'a','laser');other.hp-=100
 other.debuffs['virus']=TimedModuleEffect('virus','Virüs',5000,{'healing_received_penalty':.25})
 shield(e,'a',source,protected,60,5000,'buffer');old=other.hp
 e.apply_damage('a',protected.instance_id,100)
 assert other.hp-old==18 # 24 budget * .75, never retried as a fresh heal.

def test_weaker_buffer_cannot_attach_stronger_conversion_to_an_old_larger_pool():
 from dataclasses import replace
 e=battle();strong=place(e,'a','buffer_shield');weak=place(e,'a','buffer_shield');t=place(e,'a','barrier')
 strong.definition=replace(strong.definition,runtime_parameters={**params(strong),'heal_conversion_ratio':.30})
 weak.definition=replace(weak.definition,runtime_parameters={**params(weak),'heal_conversion_ratio':.60})
 shield(e,'a',strong,t,75,5000,'buffer');shield(e,'a',weak,t,50,5000,'buffer')
 pool=t.persistent_effects['v2_shield_buffer']
 assert pool.data['shield_hp']==75 and pool.data['conversion_ratio']==.30
 assert pool.data['source_module_id']==strong.instance_id

def test_shield_strip_does_not_heal_or_gain_current_and_phase_blocks_strip():
 e=battle();gun=place(e,'a','shield_breaker');source=place(e,'b','buffer_shield');t=place(e,'b','phase_armor');hurt=place(e,'b','laser');hurt.hp-=50
 shield(e,'b',source,t,60,5000,'buffer');before=hurt.hp
 hit(e,'a',gun,'b',t,20);assert t.persistent_effects['v2_shield_buffer'].data['shield_hp']==60
 e.state.elapsed_ms=1100;hit(e,'a',gun,'b',t,20)
 assert t.persistent_effects['v2_shield_buffer'].data['shield_hp']==36 # 10 stripped +14 absorbed
 assert hurt.hp-before==5 and e.state.players['a'].damage_current_earned==0

def test_reflection_uses_actual_hp_damage_and_never_reflects_an_echo():
 e=battle();gun=place(e,'a','laser');t=place(e,'b','reflector');shield(e,'b',t,t,90)
 old=gun.hp;hit(e,'a',gun,'b',t,100);assert old-gun.hp==3
 e.state.elapsed_ms=2000;old=gun.hp;hit(e,'a',gun,'b',t,100,secondary=True,damage_kind='echo');assert gun.hp==old

def test_bastion_budget_is_once_and_shared_not_per_friend():
 e=battle();u=place(e,'a','last_bastion');one=place(e,'a','laser');two=place(e,'a','pulse_cannon')
 e.apply_damage('a',u.instance_id,u.hp)
 assert one.persistent_effects['v2_shield_bastion_ally'].data['shield_hp']==20
 assert two.persistent_effects['v2_shield_bastion_ally'].data['shield_hp']==20
 e.apply_damage('a',u.instance_id,100)
 assert one.persistent_effects['v2_shield_bastion_ally'].data['shield_hp']==20

def test_no_heal_can_revive_a_destroyed_source():
 e=battle();u=place(e,'a','repair');t=place(e,'a','laser');e.apply_damage('a',t.instance_id,t.hp)
 assert heal(e,'a',u,t,100)==0 and t.hp==0

def test_cleanse_ward_is_one_use_and_does_not_block_execution():
 e=battle();c=place(e,'a','cleanser');t=place(e,'a','laser')
 from dataclasses import replace
 c.definition=replace(c.definition,runtime_parameters={**params(c),'cleanse_control_guard_ms':2000,'cleanse_control_duration_reduction':.30})
 t.debuffs['core_execution']=TimedModuleEffect('core_execution','İmha',2000)
 support_actions(e,'a','b');assert 'core_execution' not in t.debuffs
 from app.game.module_effects_v7 import control_duration
 assert control_duration(e,t,'core_execution',1500)==1500
 assert control_duration(e,t,'emp_disabled',1000)==700
 assert control_duration(e,t,'emp_disabled',1000)==1000
