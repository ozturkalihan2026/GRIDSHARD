"""Planning regressions for five-channel free progression without XP inflation."""
from copy import deepcopy
from datetime import date, timedelta

import pytest

from tools import simulate_liveops_economy as model


def case(identity='regular_4'):
    return deepcopy(next(r for r in model.load_policy()['scenarios'] if r['id'] == identity))


def test_current_model_matches_currency_sources_without_counting_ads_or_premium():
    from tools import report_economy_baseline as old
    c = case()
    baseline = old.scenario(days=28, rating=0, wins=2, losses=2,
                           mission_ids=[m['id'] for m in model.profile.DAILY_MISSIONS], gifts=2)
    result = model.simulate(c)
    for old_key,new_key in [('matches_and_ads','matches'),('missions','daily_orders'),
            ('login','login'),('victory_chests_expected','victory_chests_expected'),
            ('gift_chests_expected','gift_chests_expected')]:
        for key in model.CURRENCIES:
            assert result['sources'][new_key][key] == pytest.approx(baseline['sources'][old_key][key])
    assert result['season_xp'] > baseline['season_xp']  # Includes implemented extra mission XP.
    assert result['extra_from_rebalance'] == model.currencies()


def test_five_channels_reconcile_without_extra_xp_or_an_extra_support_campaign():
    c=case()
    current=model.simulate(c)
    candidate=model.simulate(c, proposed=True)
    assert candidate['extra_from_rebalance']==model.currencies(14776,2263)
    assert candidate['total_expected']==model.currencies(33072,5179.44)
    for key in model.CURRENCIES:
        assert candidate['total_expected'][key]-current['total_expected'][key]==pytest.approx(
            sum(row[key] for row in candidate['bonus_by_source'].values()))
    assert not any('support' in key for key in candidate['sources'])
    assert candidate['season_xp']==current['season_xp']
    assert candidate['reached_tier']==current['reached_tier']


def test_match_flux_is_capped_but_normal_match_credits_keep_growing():
    six=model.simulate(case('engaged_6'),proposed=True)
    eight=model.simulate(case('active_8'),proposed=True)
    assert six['bonus_by_source']['matches']['flux_shards']==eight['bonus_by_source']['matches']['flux_shards']==12*28
    assert eight['total_expected']['circuit_credits']>six['total_expected']['circuit_credits']


def test_losses_get_currency_boost_and_login_only_receives_its_own_reward():
    losses=model.simulate(case('losses_4'),proposed=True)
    regular=model.simulate(case(),proposed=True)
    login=model.simulate(case('login_only'),proposed=True)
    assert losses['bonus_by_source']['matches']['flux_shards']==regular['bonus_by_source']['matches']['flux_shards']
    assert losses['bonus_by_source']['daily_orders']['circuit_credits']>0
    assert login['total_expected']==model.currencies(5356,402)
    for source in ('matches','daily_orders','seasonal_orders','season_road'):
        assert login['sources'][source]==model.currencies()
    assert login['season_xp']==0


def test_daily_orders_and_seasonal_currency_have_explicit_finite_totals():
    policy=model.load_policy()
    assert sum(r['flux_shards'] for r in policy['daily_orders'].values())==105
    assert sum(r['circuit_credits'] for r in policy['daily_orders'].values())==120
    assert sum(r['flux_shards'] for r in policy['seasonal_orders'].values())==600
    assert sum(r['circuit_credits'] for r in policy['seasonal_orders'].values())==3000


def test_missed_login_rewards_are_not_backfilled_even_when_each_claim_is_larger():
    c=case('returning_4_days')
    result=model.simulate(c,proposed=True)
    policy=model.load_policy()
    start=date.fromisoformat(policy['simulation_starts_on'])
    expected=sum(row['circuit_credits'] for i,row in enumerate(model.profile.LOGIN_PERIOD_REWARDS)
                 if (start+timedelta(days=i)).weekday() in c['login_weekdays'])
    assert result['sources']['login']['circuit_credits']==expected*policy['login_multiplier']['circuit_credits']
    assert result['active_battle_days']==16


def test_between_seasons_keeps_daily_flux_but_not_season_login_or_xp():
    result=model.simulate(case('between_seasons'),proposed=True)
    assert result['season_xp']==result['reached_tier']==0
    assert result['sources']['season_road']==result['sources']['login']==model.currencies()
    assert result['sources']['daily_orders']['flux_shards']==105*28
    assert result['sources']['daily_orders']['circuit_credits']==120*28
    assert result['sources']['seasonal_orders']==model.currencies()
    assert result['bonus_by_source']['matches']['flux_shards']==8*28


@pytest.mark.parametrize('change',[{'mode':'unranked_ai'},{'forfeit':True}])
def test_unqualified_battles_cannot_claim_the_match_boost_or_seasonal_currency(change):
    c=case();c.update(change)
    result=model.simulate(c,proposed=True)
    assert result['bonus_by_source']['matches']==model.currencies()
    assert result['sources']['seasonal_orders']==model.currencies()


def test_seasonal_thresholds_are_claimed_once_and_not_repeated_after_completion():
    result=model.simulate(case('active_8'),proposed=True)
    assert result['seasonal_currency_claims']==12
    assert result['sources']['seasonal_orders']==model.currencies(3000,600)
    assert result['trajectory'][-1]['new_seasonal_xp']==0


def test_season_road_increases_only_currencies_on_the_same_earned_tiers():
    c=case('active_8')
    current=model.simulate(c)
    candidate=model.simulate(c,proposed=True)
    assert current['reached_tier']==candidate['reached_tier']==40
    for key in model.CURRENCIES:
        assert candidate['sources']['season_road'][key]==2*current['sources']['season_road'][key]


def test_casual_player_receives_only_the_orders_the_scenario_completes():
    result=model.simulate(case('casual_2'),days=1,proposed=True)
    assert result['sources']['daily_orders']==model.currencies(65,55)
    assert result['seasonal_currency_claims']==0


def test_a_lost_match_gets_the_base_credit_increase_and_direct_flux_without_a_win_chest():
    c=case('losses_4')
    result=model.simulate(c,days=1,proposed=True)
    assert result['sources']['matches']==model.currencies(4*18,4*2)
    assert result['sources']['victory_chests_expected']==model.currencies()


def test_full_season_keeps_the_intentional_xp_workload():
    four=model.simulate(case(),proposed=True)
    six=model.simulate(case('engaged_6'),proposed=True)
    eight=model.simulate(case('active_8'),proposed=True)
    assert four['reached_tier']<six['reached_tier']<40
    assert eight['reached_tier']==40
    assert model.profile.SEASON_REWARD_TRACK[-1]['required_xp']==12240


def test_talent_and_upgrade_spend_do_not_disappear_from_free_game_budget():
    probes=model.cost_probes()
    assert probes['legendary_all_talents']==model.currencies(100000,10000)
    assert probes['legendary_level_14_to_15']['flux_shards']==10000
    result=model.simulate(case(),proposed=True)
    cost=result['currency_coverage']['legendary_all_talents']
    assert not cost['currency_only_affordable']
    assert cost['remaining_after_currency_spend']['flux_shards']<0


@pytest.mark.parametrize('change',[{'battles':-1},{'wins':5},{'wins':0},
                                  {'mode':'friend_battle'},{'missions':['win_battles','win_battles']}])
def test_invalid_planning_assumptions_cannot_create_optimistic_income(change):
    c=case();c.update(change)
    with pytest.raises(ValueError):model.simulate(c,proposed=True)
