from copy import deepcopy
from datetime import datetime,timedelta,timezone

import pytest

from app import free_economy_rewards as economy, version, first_season_profile, season_missions
from app import player_profile as profiles
from app.meta_progression import archive_and_soft_reset_season
from app.player_data_store import PlayerDataStoreService,JsonFilePlayerDataRepository
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.player_progression import PlayerProgressionService
from test_player_progression import finished_state

SEASON='gridshard_2026_12_28'


@pytest.fixture
def clock(monkeypatch):
    current=[datetime(2026,12,28,12,tzinfo=timezone.utc)]
    monkeypatch.setattr(version,'VERSION','2.5.0')
    monkeypatch.setenv('GRIDSHARD_FREE_ECONOMY_FROM','2026-12-22T00:00:00Z')
    monkeypatch.setenv('GRIDSHARD_SEASON_STARTS_AT','2026-12-28T00:00:00Z')
    monkeypatch.setenv('GRIDSHARD_SEASON_AUTO_CYCLES','1')
    monkeypatch.delenv('GRIDSHARD_OWNER_PLAYER_ID',raising=False)
    monkeypatch.delenv('GRIDSHARD_UNRANKED_PLAYER_IDS',raising=False)
    policy=deepcopy(economy.POLICY);policy['approved_seasons']=[SEASON]
    monkeypatch.setattr(economy,'POLICY',policy)
    # Only the fixture simulates an approved S2; no planned card is published.
    monkeypatch.setattr(first_season_profile,'content_ready',lambda *args:True)
    return current


def service(clock): return profiles.PlayerProfileService(now_func=lambda:clock[0])


def battle(s,identity):
    return s.record_battle_engagement('a',battle_id=identity,match_type='arena_ai',
        season_xp_awarded=0,damage_dealt=5000,circuit_actions=10,won=True,modules_destroyed=20,core_power_uses=2)


def test_six_daily_orders_grant_105_flux_120_credits_once_without_xp_inflation(clock):
    s=service(clock)
    for i in range(2):p=battle(s,f'daily-{i}')
    before=(p.circuit_credits,p.flux_shards,p.season_xp)
    for row in profiles.DAILY_MISSIONS:
        s.claim_daily_mission('a',row['id'],request_id='claim-'+row['id'])
        s.claim_daily_mission('a',row['id'],request_id='retry-'+row['id'])
    assert p.circuit_credits-before[0]==120
    assert p.flux_shards-before[1]==105
    assert p.season_xp-before[2]==sum(r['season_xp_reward'] for r in profiles.DAILY_MISSIONS)
    s.claim_daily_mission('a','complete_battles',request_id='claim-complete_battles')
    with pytest.raises(profiles.PlayerProfileError,match='Talep kimliği'):
        s.claim_daily_mission('a','core_power',request_id='claim-complete_battles')


def test_daily_snapshots_are_frozen_and_earned_unclaimed_settles_at_utc_rollover(clock,monkeypatch):
    s=service(clock)
    for i in range(2):p=battle(s,f'earned-{i}')
    before=(p.circuit_credits,p.flux_shards,p.season_xp)
    monkeypatch.setattr(economy,'catalog',lambda:(_ for _ in ()).throw(AssertionError('old right cannot reread catalog')))
    s.claim_daily_mission('a','complete_battles',request_id='first')
    # Disable new writes. Existing unclaimed rights still use their own data.
    monkeypatch.delenv('GRIDSHARD_FREE_ECONOMY_FROM')
    clock[0]+=timedelta(days=1)
    s.get_or_create('a')
    assert p.circuit_credits-before[0]==120 and p.flux_shards-before[1]==105
    assert p.season_xp-before[2]>=sum(r['season_xp_reward'] for r in profiles.DAILY_MISSIONS)
    after=(p.circuit_credits,p.flux_shards,p.season_xp)
    s.get_or_create('a');assert after==(p.circuit_credits,p.flux_shards,p.season_xp)


def test_login_and_road_multiply_only_currencies_and_keep_old_receipts(clock):
    s=service(clock);p=s.get_or_create('a')
    base=profiles.LOGIN_PERIOD_REWARDS[0]
    r=s.claim_login_reward('a',1,'login')
    assert (r['circuit_credits'],r['flux_shards'])==(base['circuit_credits']*2,base['flux_shards']*3)
    assert r['economy_revision']==1 and r['economy_receipt_hash']
    wallet=(p.circuit_credits,p.flux_shards,deepcopy(p.module_shards))
    assert s.claim_login_reward('a',1,'login')==r
    assert wallet==(p.circuit_credits,p.flux_shards,p.module_shards)
    p.season_xp=profiles.SEASON_REWARD_TRACK[-1]['required_xp'];s.get_or_create('a')
    before=(p.circuit_credits,p.flux_shards)
    for row in profiles.SEASON_REWARD_TRACK:s.claim_season_tier('a',row['tier'],f'tier-{row["tier"]}')
    assert p.circuit_credits-before[0]==2*sum(r['circuit_credits'] for r in profiles.SEASON_REWARD_TRACK)
    assert p.flux_shards-before[1]==2*sum(r['flux_shards'] for r in profiles.SEASON_REWARD_TRACK)
    assert p.season_xp==12240


def test_seasonal_and_extra_daily_orders_keep_1800_xp_and_have_finite_currency(clock):
    s=service(clock)
    total_xp=0
    for day in range(28):
        clock[0]=datetime(2026,12,28,12,tzinfo=timezone.utc)+timedelta(days=day)
        for b in range(6):p=battle(s,f'{day}-{b}')
        for row in [*season_missions.view(p,moment=clock[0],active=True)['extra_daily_missions'],
                    *season_missions.view(p,moment=clock[0],active=True)['seasonal_missions']]:
            if row['completed'] and not row['claimed']:
                r=s.claim_season_mission('a',row['id'],season_id=SEASON,day_key=row['day_key'],request_id=f'{day}:{row["id"]}')
                total_xp+=r['season_xp_reward']
    rewards=p.season_mission_state['rewards'].values()
    seasonal=[r for r in rewards if r['scope']=='seasonal']
    assert len(seasonal)==12
    assert sum(r['season_xp_reward'] for r in seasonal)==1800
    assert sum(r['circuit_credits'] for r in seasonal)==3000
    assert sum(r['flux_shards'] for r in seasonal)==600
    assert total_xp==1800+28*30


def test_match_credit_multiplier_and_flux_cap_restart_at_utc_midnight(clock):
    s=service(clock);progress=PlayerProgressionService(s)
    results=[]
    for i in range(8):
        state=finished_state(battle_id=f'cap-{i}');state.match_type='arena_ai';state.account_player_ids=('a',)
        assert progress.process_finished_battle(state,completed_at=clock[0])
        results.append(progress._results_by_battle_id[state.battle_id]['a'].to_dict())
        assert not progress.process_finished_battle(state,completed_at=clock[0])
    assert [r['flux_shards_awarded'] for r in results]==[2]*6+[0]*2
    assert results[0]['circuit_credits_awarded']==52
    assert results[0]['xp_awarded']==40
    clock[0]+=timedelta(days=1)
    state=finished_state(battle_id='next-day');state.account_player_ids=('a',)
    progress.process_finished_battle(state,completed_at=clock[0])
    assert progress._results_by_battle_id['next-day']['a'].flux_shards_awarded==2


@pytest.mark.parametrize('mode,reason,owner',[
    ('ranked_pvp','forfeit','a'),('arena_ai','surrender','a'),('friend_battle','core_destroyed','a'),
    ('unranked_ai','core_destroyed','a'),('arena_ai','core_destroyed','bot_a12')])
def test_ineligible_matches_cannot_create_new_currency(clock,mode,reason,owner):
    s=service(clock);p=s.get_or_create(owner)
    state=finished_state();state.match_type=mode;state.finish_reason=reason
    credits,flux,facts=economy.match_currency(p,state,moment=clock[0],base_credits=35)
    assert (credits,flux,facts)==(35,0,None)


def test_between_seasons_basic_orders_and_matches_remain_but_season_channels_are_closed(clock):
    clock[0]+=timedelta(days=29)
    s=service(clock)
    for i in range(2):p=battle(s,f'intermission-{i}')
    before=(p.circuit_credits,p.flux_shards)
    for m in profiles.DAILY_MISSIONS:s.claim_daily_mission('a',m['id'])
    assert (p.circuit_credits-before[0],p.flux_shards-before[1])==(120,105)
    assert p.season_xp==0
    with pytest.raises(profiles.PlayerProfileError,match='başlamadı'):s.claim_login_reward('a',1)
    assert p.login_period_day==0
    assert all(r['season_xp_reward']==0 for r in p.engagement_view()['daily_missions'])


def test_old_runtime_and_s1_never_adopt_new_season_amounts(clock,monkeypatch):
    monkeypatch.setattr(version,'VERSION','2.4.0')
    s=service(clock);p=s.get_or_create('a')
    assert not p.free_economy_state
    assert s.claim_login_reward('a',1)['flux_shards']==profiles.LOGIN_PERIOD_REWARDS[0]['flux_shards']
    monkeypatch.setattr(version,'VERSION','2.5.0')
    policy=deepcopy(economy.POLICY);policy['approved_seasons'].append(first_season_profile.PROFILE['season_id'])
    monkeypatch.setattr(economy,'POLICY',policy)
    assert not economy.approved_season(first_season_profile.PROFILE['season_id'])
    assert not economy.season_enabled(s.get_or_create('a'))  # Started under 2.4, no mid-season repricing.


def test_frozen_road_survives_catalog_closure_and_archive(clock,monkeypatch):
    s=service(clock);p=s.get_or_create('a');p.season_xp=1000;s.get_or_create('a')
    earned=deepcopy(p.season_reward_state)
    monkeypatch.delenv('GRIDSHARD_FREE_ECONOMY_FROM')
    archive=archive_and_soft_reset_season(p,'gridshard_waiting',archived_at='2027-01-25T00:00:00Z')
    assert archive['reward_state']==earned
    assert archive['queued_earned_rewards']
    for message in p.reward_inbox:
        reward=message.get('inventory_chest',{}).get('fixed_reward',{})
        if reward:assert reward['circuit_credits']==profiles.SEASON_REWARD_TRACK[reward['tier']-1]['circuit_credits']*2


def test_json_restart_and_empty_target_restore_preserve_snapshots_and_cap(clock,tmp_path):
    def store(s,path):
        return PlayerDataStoreService(profile_service=s,statistics_service=PlayerStatisticsService(),
            settings_service=PlayerSettingsService(),repository=JsonFilePlayerDataRepository(path))
    path=tmp_path/'source.json';s=service(clock);data=store(s,path)
    for i in range(2):p=battle(s,f'persist-{i}')
    s.claim_daily_mission('a','complete_battles',request_id='saved');data.save_player('a')
    copied=tmp_path/'restored.json';copied.write_bytes(path.read_bytes())
    target=service(clock);restored=store(target,copied);restored.load_player('a')
    restored_profile=target.get_or_create('a')
    assert restored_profile.free_economy_state==p.free_economy_state
    wallet=(restored_profile.circuit_credits,restored_profile.flux_shards)
    target.claim_daily_mission('a','complete_battles',request_id='another')
    assert wallet==(restored_profile.circuit_credits,restored_profile.flux_shards)


def test_tampered_currency_or_xp_fails_before_wallet_write(clock):
    s=service(clock)
    for i in range(2):p=battle(s,f'tamper-{i}')
    entry=economy._entry(p,'daily_orders',p.daily_mission_day,'complete_battles')
    wallet=(p.circuit_credits,p.flux_shards,p.season_xp)
    entry['xp']+=1
    with pytest.raises(ValueError,match='XP kaydı'):s.claim_daily_mission('a','complete_battles')
    assert wallet==(p.circuit_credits,p.flux_shards,p.season_xp)


@pytest.mark.parametrize('raw',['2026-12-21T00:00:00Z','2026-12-22T12:00:00Z','2026-12-22','invalid'])
def test_cutover_rejects_pre_s1_intraday_naive_or_invalid_dates(clock,monkeypatch,raw):
    monkeypatch.setenv('GRIDSHARD_FREE_ECONOMY_FROM',raw)
    with pytest.raises(ValueError):economy.cutover()


def test_published_season_parameters_survive_catalog_and_rollout_closure(clock,monkeypatch):
    s=service(clock);p=s.get_or_create('a')
    monkeypatch.delenv('GRIDSHARD_FREE_ECONOMY_FROM')
    monkeypatch.setattr(economy,'catalog',lambda:(_ for _ in ()).throw(AssertionError('period already frozen')))
    receipt=s.claim_login_reward('a',1,'frozen-login')
    assert receipt['flux_shards']==3*profiles.LOGIN_PERIOD_REWARDS[0]['flux_shards']
    for i in range(6):battle(s,f'frozen-battle-{i}')
    row=season_missions.view(p,moment=clock[0],active=True)['extra_daily_missions'][0]
    r=s.claim_season_mission('a',row['id'],season_id=SEASON,day_key=row['day_key'],request_id='frozen-extra')
    assert (r['circuit_credits'],r['flux_shards'])==(30,5)


def test_real_season_closeout_with_extra_order_progress_never_creates_an_empty_daily_period(clock):
    s=service(clock)
    for i in range(6):p=battle(s,f'closing-{i}')
    clock[0]+=timedelta(days=29)
    s.get_or_create('a')
    assert p.active_meta_season_id=='gridshard_waiting'
    assert p.season_archives[-1]['mission_state']['rewards']
