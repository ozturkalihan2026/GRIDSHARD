from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest

from app import reward_entitlements as rights
from app.reward_definitions import seal

NOW=datetime(2026,11,16,tzinfo=timezone.utc)


def definition():
    return seal(identity='test.entitlement',revision=1,kind='fixed',payload={'circuit_credits':10,'flux_shards':2})


def earned(**changes):
    values=dict(player_id='one',source='daily_mission',period_id='2026-11-16',node_id='complete_battles',
                definition_snapshot=definition(),earned_at=NOW)
    values.update(changes)
    return rights.create(**values)


def test_context_is_unique_per_owner_source_period_and_node_without_changing_old_snapshot():
    original=earned()
    for key,value in [('player_id','two'),('source','season_mission'),('period_id','2026-11-17'),('node_id','win_battles')]:
        assert earned(**{key:value})['entitlement_id']!=original['entitlement_id']
    newer=definition();newer['payload']['flux_shards']=100
    assert rights.contents(original)=={'circuit_credits':10,'flux_shards':2}
    assert rights.validate(original)==original
    with pytest.raises(rights.RewardEntitlementError):rights.validate(original,player_id='two')


def test_frozen_context_or_reward_tampering_is_rejected():
    record=earned()
    for field,value in [('node_id','other'),('player_id','two'),('earned_at','2026-11-17T00:00:00Z')]:
        corrupt=deepcopy(record);corrupt[field]=value
        with pytest.raises(rights.RewardEntitlementError):rights.validate(corrupt)
    corrupt=deepcopy(record);corrupt['definition_snapshot']['payload']['circuit_credits']=999
    with pytest.raises(rights.RewardEntitlementError):rights.validate(corrupt)


def test_receipt_cannot_choose_or_credit_more_than_the_frozen_definition():
    record=earned()
    result=rights.receipt(record,option_id=None,delivered_at=NOW+timedelta(microseconds=1))
    assert result['rewards']=={'circuit_credits':10,'flux_shards':2}
    assert rights.validate_receipt(record,result)==result
    result['rewards']['flux_shards']=999
    with pytest.raises(rights.RewardEntitlementError):rights.validate_receipt(record,result)
    with pytest.raises(rights.RewardEntitlementError):rights.receipt(record,option_id=None,delivered_at=NOW-timedelta(seconds=1))
    with pytest.raises(rights.RewardEntitlementError):earned(earned_at=datetime(2026,11,16))


def test_choice_receipt_is_bound_to_one_of_the_three_earned_options():
    snapshot=seal(identity='test.choice',revision=1,kind='choice',payload={'options':[
        {'option_id':name,'contents':{'circuit_credits':amount}}
        for name,amount in [('attack',10),('defense',20),('tactical',30)]]})
    record=earned(definition_snapshot=snapshot)
    assert rights.receipt(record,option_id='defense',delivered_at=NOW)['rewards']=={'circuit_credits':20}
    with pytest.raises(rights.RewardEntitlementError):rights.contents(record,option_id='foreign')


@pytest.mark.parametrize('change',[{'source':''},{'node_id':'../arbitrary'},{'player_id':' one'},
                                  {'period_id':' '},{'player_id':'a'*73}])
def test_invalid_context_cannot_create_a_reward_right(change):
    with pytest.raises(rights.RewardEntitlementError):earned(**change)
