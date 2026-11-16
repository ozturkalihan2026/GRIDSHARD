from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import timedelta
from uuid import uuid4
from pathlib import Path
import tempfile

import pytest
from fastapi import HTTPException

from app import main as gateway, free_economy_rewards as economy
from app.player_profile import PlayerProfileService,LOGIN_PERIOD_REWARDS
from app.player_data_store import PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.postgres_repository import PostgresPool,PostgresPlayerDataRepository
from app.postgres_battle_results import PostgresBattleResults
from app.player_progression import PlayerProgressionService
from app.clean_install import ensure_clean_postgres_installation
from test_free_economy_rewards import clock, battle  # noqa: F401
from test_postgres_social_api import social_db  # noqa: F401
from test_server_backup import empty_database_pair,backup_tool  # noqa: F401
from test_postgres_battle_results import finished_state


@pytest.fixture
def economy_db(clock,social_db,monkeypatch):
    pool,players,_,ids=social_db
    s=gateway.player_profile_service
    monkeypatch.setattr(s,'_now_func',lambda:clock[0])
    monkeypatch.setattr(gateway,'player_progression_service',PlayerProgressionService(s))
    monkeypatch.setattr(gateway.product_analytics_service,'record',lambda *a,**k:False)
    for owner in ids:
        for i in range(2):
            s.record_battle_engagement(owner,battle_id=f'seed-{owner}-{i}',match_type='arena_ai',
                season_xp_awarded=0,damage_dealt=0,circuit_actions=0)
        gateway.player_data_store_service.save_player(owner)
    try: yield pool,players,ids
    finally:
        with pool.connection() as c:c.execute('DELETE FROM battle_results WHERE account_player_ids && %s',(list(ids),))


def test_parallel_different_requests_grant_one_daily_right_and_same_receipt(economy_db):
    _,players,(owner,_,_)=economy_db
    before=players.load(owner).profile['meta_progression_state']
    def claim(_):return gateway.claim_daily_mission_reward(owner,'complete_battles',gateway.MetaOperationRequest(request_id=uuid4().hex))
    with ThreadPoolExecutor(max_workers=8) as workers:results=list(workers.map(claim,range(12)))
    after=players.load(owner).profile['meta_progression_state']
    assert after['circuit_credits']-before['circuit_credits']==15
    receipts=[r['daily_mission_receipt'] for r in results]
    assert len({r['economy_receipt_hash'] for r in receipts})==1
    assert all(r['flux_shards']==15 for r in receipts)
    assert after['free_economy_state']


def test_failure_after_wallet_save_rolls_back_right_and_operation_then_safe_retry(economy_db,monkeypatch):
    _,players,(owner,_,_)=economy_db
    before=players.load(owner).to_dict()
    save=gateway.persist_player_data
    request=gateway.MetaOperationRequest(request_id=uuid4().hex)
    def fail(owner):save(owner);raise RuntimeError('injected economy save')
    with monkeypatch.context() as patch:
        patch.setattr(gateway,'persist_player_data',fail)
        with pytest.raises(RuntimeError,match='injected economy save'):
            gateway.claim_daily_mission_reward(owner,'complete_battles',request)
    assert players.load(owner).to_dict()==before
    first=gateway.claim_daily_mission_reward(owner,'complete_battles',request)
    saved=players.load(owner).to_dict()
    gateway.player_profile_service._profiles.clear()
    second=gateway.claim_daily_mission_reward(owner,'complete_battles',request)
    assert second['daily_mission_receipt']==first['daily_mission_receipt']
    assert saved==players.load(owner).to_dict()
    with pytest.raises(HTTPException) as conflict:
        gateway.claim_daily_mission_reward(owner,'core_power',request)
    assert conflict.value.status_code==409


@pytest.mark.parametrize('channel',['login','extra_daily','seasonal','road'])
def test_each_season_currency_channel_joins_the_real_wallet_transaction(economy_db,channel,monkeypatch):
    _,players,(owner,_,_)=economy_db
    s=gateway.player_profile_service
    p=s.get_or_create(owner)
    if channel in {'extra_daily','seasonal'}:
        target=4 if channel=='extra_daily' else 20
        for i in range(2,target):
            s.record_battle_engagement(owner,battle_id=f'{channel}-{i}',match_type='arena_ai',
                season_xp_awarded=0,damage_dealt=0,circuit_actions=0)
    if channel=='road':
        p.season_xp=gateway.SEASON_REWARD_TRACK[0]['required_xp'];s.get_or_create(owner)
    gateway.persist_player_data(owner)
    before=players.load(owner).to_dict();request_id=uuid4().hex
    if channel in {'extra_daily','seasonal'}:
        identity='daily_battles_4' if channel=='extra_daily' else 'season_battles_20'
        request=gateway.SeasonMissionClaimRequest(request_id=request_id,season_id=p.active_meta_season_id,
            day_key=p.daily_mission_day if channel=='extra_daily' else '')
        claim=lambda:gateway.claim_season_mission_reward(owner,identity,request)
        receipt_key='season_mission_receipt';expected=30 if channel=='extra_daily' else 200
    else:
        request=gateway.MetaOperationRequest(request_id=request_id)
        if channel=='login':
            claim=lambda:gateway.claim_login_period_reward(owner,1,request)
            receipt_key='daily_login_receipt';expected=2*LOGIN_PERIOD_REWARDS[0]['circuit_credits']
        else:
            claim=lambda:gateway.claim_season_tier_reward(owner,1,request)
            receipt_key='season_reward_receipt';expected=2*gateway.SEASON_REWARD_TRACK[0]['circuit_credits']
    save=gateway.persist_player_data
    def fail(actor):save(actor);raise RuntimeError('injected channel rollback')
    with monkeypatch.context() as patch:
        patch.setattr(gateway,'persist_player_data',fail)
        with pytest.raises(RuntimeError,match='injected channel rollback'):claim()
    assert players.load(owner).to_dict()==before
    first=claim();saved=players.load(owner).to_dict()
    assert first[receipt_key]['economy_revision']==1
    assert saved['profile']['meta_progression_state']['circuit_credits']-before['profile']['meta_progression_state']['circuit_credits']==expected
    gateway.player_profile_service._profiles.clear()
    assert claim()[receipt_key]==first[receipt_key]
    assert players.load(owner).to_dict()==saved


def test_new_match_reward_and_cap_roll_back_with_terminal_ledger(economy_db,clock,monkeypatch):
    pool,players,(a,b,_)=economy_db
    ledger=PostgresBattleResults(pool);state=finished_state(a,b)
    from app import postgres_battle_results as battle_ledger
    class FixtureDateTime(type(clock[0])):
        @classmethod
        def now(cls,tz=None):return clock[0].astimezone(tz) if tz else clock[0].replace(tzinfo=None)
    monkeypatch.setattr(battle_ledger,'datetime',FixtureDateTime)
    original=PostgresBattleResults.apply
    before={p:players.load(p).to_dict() for p in (a,b)}
    def fail(self,*args):original(self,*args);raise RuntimeError('injected match reward rollback')
    with monkeypatch.context() as patch:
        patch.setattr(PostgresBattleResults,'apply',fail)
        with pytest.raises(RuntimeError,match='injected match reward rollback'):gateway.process_completed_pvp_battle(state)
    assert {p:players.load(p).to_dict() for p in (a,b)}==before
    gateway.player_profile_service._profiles.clear()
    gateway._recover_pending_battle_results()
    result=ledger.player_result(state.battle_id,a)
    assert result['flux_shards_awarded']==2
    assert result['circuit_credits_awarded']==52
    saved={p:players.load(p).to_dict() for p in (a,b)}
    gateway.player_profile_service._profiles.clear()
    gateway.process_completed_pvp_battle(state)
    assert saved=={p:players.load(p).to_dict() for p in (a,b)}
    assert ledger.player_result(state.battle_id,a)==result


def test_real_dump_restore_keeps_daily_receipt_and_six_match_cap(clock,empty_database_pair,tmp_path):
    (source,target),pg_bin=empty_database_pair
    pool=PostgresPool(source);pool.open();other=None
    def store(p):
        s=PlayerProfileService(now_func=lambda:clock[0])
        return s,PlayerDataStoreService(profile_service=s,statistics_service=PlayerStatisticsService(),
            settings_service=PlayerSettingsService(),repository=PostgresPlayerDataRepository(p))
    try:
        installation=ensure_clean_postgres_installation(pool)
        s,data=store(pool);progress=PlayerProgressionService(s)
        for i in range(7):
            state=finished_state('a','b');state.account_player_ids=('a',)
            progress.process_finished_battle(state,completed_at=clock[0])
        s.claim_daily_mission('a','complete_battles',request_id='before-backup');data.save_player('a')
        before=deepcopy(s.get_or_create('a').free_economy_state)
        with tempfile.TemporaryDirectory(prefix='gridshard-free-economy-restore-') as directory:
            backup_path=Path(directory)/'backup'
            backup_tool.backup(source,backup_path,pg_bin)
            backup_tool.restore(target,backup_path,Path(directory)/'runtime',installation,pg_bin)
        other=PostgresPool(target);other.open();restored,recovered=store(other);recovered.load_player('a')
        p=restored.get_or_create('a');assert p.free_economy_state==before
        wallet=(p.circuit_credits,p.flux_shards)
        restored.claim_daily_mission('a','complete_battles',request_id='after-restore')
        assert wallet==(p.circuit_credits,p.flux_shards)
        state=finished_state('a','b');state.account_player_ids=('a',)
        assert economy.match_currency(p,state,moment=clock[0],base_credits=35)[1]==0
        clock[0]+=timedelta(days=1)
        state=finished_state('a','b');state.account_player_ids=('a',)
        assert economy.match_currency(p,state,moment=clock[0],base_credits=35)[1]==2
        assert PostgresPlayerDataRepository(pool).load('a').profile['meta_progression_state']['free_economy_state']==before
    finally:
        if other is not None:other.close()
        pool.close()
