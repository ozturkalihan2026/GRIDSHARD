"""Only actual HP lost by Defense cards fills the 50 incoming counter."""
from dataclasses import replace
import pytest
from app.game.engine import BattleEngine
from app.game.models import BattleState
from app.game.battle_actions_v2 import hit,heal,shield
from test_main_current_only_v2 import place
def engine_with_weapons():
    e=BattleEngine(BattleState('defense-current'))
    for side in ('a','b'):
        e.add_player(side);e.grant_module(side,side+'-core','core')
        e.set_initial_active_module(side,side+'-core',2,1)
    e.start();a=place(e,'a','laser');b=place(e,'b','laser')
    for u in (a,b):u.definition=replace(u.definition,max_hp=10000);u.hp=10000
    return e,a,b



def battle():
    e,a,b=engine_with_weapons()
    d=place(e,'a','armor')
    return e,a,b,d


def incoming(e,attacker,target,amount):
    return e.apply_damage('a',target.instance_id,amount,source_player_id='b',source_module_id=attacker.instance_id)


@pytest.mark.parametrize('key',('laser','repair','core'))
def test_non_defense_hp_loss_cannot_qualify(key):
    e,a,b,_=battle();p=e.state.players['a'];target=p.modules['a-core'] if key=='core' else place(e,'a',key)
    hit(e,'a',a,'b',b,200);incoming(e,b,target,100)
    assert p.defense_current_total==0 and p.circuit_credits==7


@pytest.mark.parametrize('reverse',(False,True))
def test_attack_and_real_defense_hp_both_required(reverse):
    e,a,b,d=battle();p=e.state.players['a']
    actions=[lambda:hit(e,'a',a,'b',b,100),lambda:incoming(e,b,d,50)]
    if reverse:actions.reverse()
    actions[0]();assert p.circuit_credits==7
    actions[1]();assert p.circuit_credits==8 and p.damage_current_earned==1
    assert p.damage_current_progress==p.defense_current_progress==0


def test_protection_of_attack_card_is_not_damage_received_by_defense_source():
    e,a,b,_=battle();p=e.state.players['a'];buffer=place(e,'a','buffer_shield')
    hit(e,'a',a,'b',b,100);shield(e,'a',buffer,a,60,5000,'buffer');hit(e,'b',b,'a',a,100)
    assert p.defense_current_total==0 and p.circuit_credits==7


def test_protection_on_defense_card_counts_only_remaining_actual_hp_loss():
    e,a,b,d=battle();p=e.state.players['a'];source=place(e,'a','buffer_shield')
    hit(e,'a',a,'b',b,100);shield(e,'a',source,d,60,5000,'buffer');before=d.hp
    hit(e,'b',b,'a',d,100)
    assert p.defense_current_total==before-d.hp
    assert p.defense_current_total<50 and p.circuit_credits==7
    # A fully phased hit has no received HP, even though the card is Defense.
    phase=place(e,'a','phase_armor');prior=p.defense_current_total
    hit(e,'b',b,'a',phase,100);assert p.defense_current_total==prior


def test_defense_hp_from_different_cards_pools_but_healed_hp_is_not_recounted():
    e,a,b,d=battle();p=e.state.players['a'];d2=place(e,'a','barrier')
    hit(e,'a',a,'b',b,100);incoming(e,b,d,30);heal(e,'a',d,d,30);incoming(e,b,d,30)
    assert p.defense_current_progress==30 and p.circuit_credits==7
    incoming(e,b,d2,20);assert p.circuit_credits==8


def test_multiple_pairs_without_wait_and_passive_still_runs():
    e,a,b,d=battle();p=e.state.players['a'];p.circuit_credits=0
    hit(e,'a',a,'b',b,300);incoming(e,b,d,150)
    assert p.circuit_credits==3 and e.state.elapsed_ms==0
    for _ in range(30):e._apply_passive_circuit_credit_income()
    assert p.circuit_credits==4


def test_defense_only_side_needs_weapon_outgoing_damage_not_own_core_damage():
    e,_,b,d=battle();p=e.state.players['a']
    incoming(e,b,d,100);hit(e,'a',p.modules['a-core'],'b',b,200)
    assert p.damage_current_progress==0 and p.defense_current_progress==100 and p.circuit_credits==7


@pytest.mark.parametrize('field', ('damage_current_threshold','defense_current_threshold'))
@pytest.mark.parametrize('value', (0,-1,float('nan'),float('inf')))
def test_combat_thresholds_must_be_positive_and_finite(field,value):
    e,_,_,_=battle()
    with pytest.raises(ValueError):
        BattleEngine(BattleState('invalid'),replace(e.circuit_credit_config,**{field:value}))
