"""Budget conservation, real-cost parity and free-access planning contracts."""
from collections import Counter
from copy import deepcopy

import pytest

from tools import simulate_progression_budget as budget


def case(identity):
    return deepcopy(next(c for c in budget.scenarios() if c['id'] == identity))


@pytest.mark.parametrize('identity', ['regular_4', 'losses_4', 'returning_4_days', 'between_seasons', 'arena3_mixed_4'])
def test_single_wallet_and_every_fragment_reconcile_after_joint_spend(identity):
    run = budget.simulate(case(identity), proposed=True, buy_offer=True, claim_choice=True)
    for row in run['checkpoints']:
        for key in budget.income.CURRENCIES:
            assert type(row['wallet'][key]) is int and row['wallet'][key] >= 0
            assert row['earned'][key] - row['spent'][key] == row['wallet'][key]
        for key in set(row['cumulative_module_pieces']) | set(run['starting_module_pieces']):
            assert (row['cumulative_module_pieces'].get(key, 0) + run['starting_module_pieces'].get(key, 0)
                    - row['cumulative_module_pieces_spent'].get(key, 0)) == row['remaining_module_pieces'].get(key, 0)
        for key, amount in row['cumulative_core_pieces'].items():
            assert amount - row['cumulative_core_pieces_spent'].get(key, 0) == row['remaining_core_pieces'].get(key, 0)


def test_reproducible_real_loot_and_same_parts_under_two_income_models():
    c = case('regular_4')
    a = budget.simulate(c, proposed=False, seed=4)
    b = budget.simulate(c, proposed=True, seed=4)
    assert b == budget.simulate(c, proposed=True, seed=4)
    for old, new in zip(a['checkpoints'], b['checkpoints']):
        assert old['cumulative_module_pieces'] == new['cumulative_module_pieces']
        assert old['cumulative_core_pieces'] == new['cumulative_core_pieces']
        assert new['earned']['circuit_credits'] > old['earned']['circuit_credits']


def test_login_only_never_receives_match_rights_or_chest_income():
    run = budget.simulate(case('login_only'), proposed=True, buy_offer=True, claim_choice=True)
    assert run['choices'] == []
    final = run['checkpoints'][-1]
    assert final['earned'] == budget.income.currencies(5356, 402)
    assert all(k in run['eligible_module_pool'] for k in final['remaining_module_pieces'])


def test_weekly_choice_and_offer_caps_are_not_repeated_daily():
    c = case('between_seasons')
    run = budget.simulate(c, proposed=True, buy_offer=True, claim_choice=True)
    assert len(run['choices']) == 4
    weeks = [tuple(r['utc_week']) for r in run['choices']]
    assert len(set(weeks)) == len(weeks)
    assert len(run['purchases']) <= 8
    for right in run['choices']:
        assert {o['option_id'] for o in right['options']} == {'saldırı','savunma','taktik'}
        assert right['selected'] in right['options']
        assert all(o['module_definition_id'] in run['eligible_module_pool'] for o in right['options'])
    assert run['checkpoints'][-1]['offer_credits_spent'] == len(run['purchases']) * 500


def test_offer_target_cannot_be_rerolled_by_deck_or_same_week_second_purchase():
    run = budget.simulate(case('between_seasons'), proposed=True, buy_offer=True)
    policy = budget.load_policy()
    start = budget.date.fromisoformat(budget.income.load_policy()['simulation_starts_on'])
    for purchase in run['purchases']:
        week = (start+budget.timedelta(days=purchase['day']-1)).isocalendar()[:2]
        pool = sorted(run['eligible_module_pool'])
        expected = pool[budget.income.meta._hash_range(f'0:{week}:offer',0,len(pool)-1)]
        assert purchase['module_id'] == expected


def test_combined_cost_does_not_pool_fragments_or_charge_locked_talents():
    policy = budget.load_policy()
    starter = budget.cost_basket(policy['deck'],5,5,policy)
    mixed = budget.cost_basket(policy['mixed_deck'],5,5,policy)
    assert starter['circuit_credits'] == 17100
    assert mixed['circuit_credits'] == 18100
    assert starter['module_pieces'] == {k:36 for k in policy['deck']}
    assert starter['core_pieces'] == {'core_resonance':36}


@pytest.mark.parametrize('change', [{'mode':'unranked_ai'}, {'forfeit':True}])
def test_neutral_or_forfeit_matches_do_not_earn_choice_rights(change):
    c = case('regular_4'); c.update(change)
    assert budget.simulate(c, proposed=True, claim_choice=True)['choices'] == []


def test_new_module_ownership_is_arena_access_and_not_an_extra_currency_purchase():
    policy = budget.load_policy()
    row = budget.acquisition(case('arena3_mixed_4'), policy)
    assert row['arena_reached_day'] == 0
    assert row['currency_price'] == budget.income.currencies()
    assert row['required_unlock_pieces'] == 0
    assert row['module_is_active'] is False
    assert row['level_1_to_5_cost'] == dict(circuit_credits=2800, flux_shards=0, shards=36)
    assert budget.acquisition(case('losses_4'), policy)['arena_reached_day'] is None
    assert budget.acquisition(case('active_8'), policy)['arena_reached_day'] == 28


def test_budget_upgrade_debits_match_real_module_and_core_operations():
    policy = budget.load_policy()
    policy['deck_target_level'] = policy['core_target_level'] = 2
    policy['buy_first_talents'] = False
    p = budget._new_profile(case('regular_4'), 0, policy)
    p.circuit_credits = 5000
    p.module_shards = {'laser': 2}
    p.core_shards_by_type = {'core_resonance':2}
    expected = deepcopy(p)
    engine = budget.income.meta.MetaProgressionService()
    engine.upgrade_module(expected, 'laser', 'test-module-cost')
    engine.upgrade_core(expected, 'core_resonance', 'test-core-cost')
    spent = dict(**budget.income.currencies(), module_pieces=Counter(), core_pieces=Counter())
    budget._spend(p, policy, spent)
    assert p.circuit_credits == expected.circuit_credits
    assert p.module_upgrade_levels == expected.module_upgrade_levels
    assert p.core_upgrade_levels == expected.core_upgrade_levels
    assert p.module_shards['laser'] == expected.module_shards['laser'] == 0
    assert p.core_shards_by_type['core_resonance'] == expected.core_shards_by_type['core_resonance'] == 0


def test_missing_season_does_not_remove_free_weekly_battle_access():
    run = budget.simulate(case('between_seasons'), proposed=True, claim_choice=True)
    assert len(run['choices']) == 4
    assert run['checkpoints'][-1]['cumulative_module_pieces']
