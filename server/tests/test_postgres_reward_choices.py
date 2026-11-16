from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime,timedelta
from pathlib import Path
import tempfile
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app import main as gateway,reward_choices as choices
from app.postgres_reward_entitlements import PostgresRewardEntitlements
from app.postgres_battle_results import PostgresBattleResults
from app.player_profile import PlayerProfileService
from app.player_data_store import PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.postgres_repository import PostgresPool,PostgresPlayerDataRepository
from app.clean_install import ensure_clean_postgres_installation
from app.reward_definitions import seal
from test_postgres_free_economy import economy_db,clock  # noqa: F401
from test_postgres_social_api import social_db  # noqa: F401
from test_postgres_battle_results import finished_state
from test_server_backup import empty_database_pair,backup_tool  # noqa: F401


@pytest.fixture
def choice_db(economy_db,clock,monkeypatch):
    pool,players,ids=economy_db
    from app import postgres_battle_results as ledger_module
    class FixtureDateTime(datetime):
        @classmethod
        def now(cls,tz=None):return clock[0].astimezone(tz) if tz else clock[0].replace(tzinfo=None)
    monkeypatch.setattr(ledger_module,'datetime',FixtureDateTime)
    a,b,_=ids
    with gateway._persistent_operation(ids):
        for i in range(11):gateway._record_engineer_choices(finished_state(a,b),clock[0])
        for owner in ids:gateway.persist_player_data(owner)
    yield pool,players,ids


def earn(choice_db):
    _,_,(a,b,_)=choice_db
    state=finished_state(a,b);gateway.process_completed_pvp_battle(state)
    identity=gateway.get_player_reward_choices(a)['pending'][0]['entitlement_id']
    return identity,state


def request(option='attack',identity=None):
    return gateway.RewardChoiceClaimRequest(request_id=identity or uuid4().hex,option_id=option)


def test_twelfth_battle_right_and_progress_roll_back_then_recover_once(choice_db,monkeypatch):
    pool,players,(a,b,_)=choice_db
    before={x:players.load(x).to_dict() for x in (a,b)}
    state=finished_state(a,b);apply=PostgresBattleResults.apply
    def fail(self,*args):apply(self,*args);raise RuntimeError('injected earned-choice failure')
    with monkeypatch.context() as patch:
        patch.setattr(PostgresBattleResults,'apply',fail)
        with pytest.raises(RuntimeError,match='earned-choice failure'):gateway.process_completed_pvp_battle(state)
    assert {x:players.load(x).to_dict() for x in (a,b)}==before
    repo=PostgresRewardEntitlements(pool)
    assert repo.pending(a,source=choices.SOURCE)==[]
    gateway.player_profile_service._profiles.clear()
    gateway._recover_pending_battle_results()
    first=gateway.get_player_reward_choices(a)
    assert first['week']['progress']==12 and len(first['pending'])==1
    assert len(repo.pending(b,source=choices.SOURCE))==1
    saved=deepcopy(first['pending'])
    gateway.process_completed_pvp_battle(state)
    assert gateway.get_player_reward_choices(a)['pending']==saved


def test_parallel_different_requests_deliver_only_selected_parts_once(choice_db):
    _,players,(owner,_,_)=choice_db;identity,_=earn(choice_db)
    before=players.load(owner).to_dict()
    def claim(_):return gateway.claim_player_reward_choice(owner,identity,request())['reward_choice_receipt']
    with ThreadPoolExecutor(max_workers=8) as workers:results=list(workers.map(claim,range(12)))
    assert len({r['receipt_hash'] for r in results})==1
    award=results[0]['rewards'];after=players.load(owner).to_dict()
    old=before['profile']['meta_progression_state'];new=after['profile']['meta_progression_state']
    assert new['module_shards'][award['module_definition_id']]-old['module_shards'].get(award['module_definition_id'],0)==award['module_shards']
    assert new['circuit_credits']==old['circuit_credits']
    assert before['profile']['engagement']['season_xp']==after['profile']['engagement']['season_xp']
    assert gateway.get_player_reward_choices(owner)['pending']==[]
    assert gateway.get_player_reward_choice(owner,identity)['reward_choice']['status']=='claimed'


def test_competing_options_have_one_winner_and_owner_scope_is_enforced(choice_db):
    _,players,(a,b,_)=choice_db;identity,_=earn(choice_db)
    def choose(option):
        try:return gateway.claim_player_reward_choice(a,identity,request(option))['reward_choice_receipt']
        except HTTPException as exc:return exc.status_code
    with ThreadPoolExecutor(max_workers=2) as workers:results=list(workers.map(choose,['attack','defense']))
    assert sum(isinstance(r,dict) for r in results)==1
    before=players.load(b).to_dict()
    with pytest.raises(HTTPException) as error:gateway.claim_player_reward_choice(b,identity,request())
    assert error.value.status_code==404
    assert players.load(b).to_dict()==before


def test_callback_save_failure_rolls_back_sql_receipt_parts_and_http_request(choice_db,monkeypatch):
    pool,players,(a,_,_)=choice_db;identity,_=earn(choice_db)
    before=players.load(a).to_dict();save=gateway.persist_player_data;r=request()
    def fail(owner):save(owner);raise RuntimeError('injected choice wallet save')
    with monkeypatch.context() as patch:
        patch.setattr(gateway,'persist_player_data',fail)
        with pytest.raises(RuntimeError,match='choice wallet save'):gateway.claim_player_reward_choice(a,identity,r)
    assert players.load(a).to_dict()==before
    assert PostgresRewardEntitlements(pool).get(a,identity)['receipt'] is None
    first=gateway.claim_player_reward_choice(a,identity,r)
    saved=players.load(a).to_dict();gateway.player_profile_service._profiles.clear()
    again=gateway.claim_player_reward_choice(a,identity,r)
    assert again['reward_choice_receipt']==first['reward_choice_receipt']
    assert players.load(a).to_dict()==saved
    with pytest.raises(HTTPException) as error:
        gateway.claim_player_reward_choice(a,identity,request('defense',r.request_id))
    assert error.value.status_code==409


def test_pending_query_does_not_mix_another_reward_source_or_hide_earned_right(choice_db,clock):
    pool,_,(a,_,_)=choice_db;identity,_=earn(choice_db)
    with pool.transaction():
        PostgresRewardEntitlements(pool).earn(player_id=a,source='other_source',period_id='future',node_id='fixed',
            definition_snapshot=seal(identity='other.reward',revision=1,kind='fixed',payload={'circuit_credits':1}),earned_at=clock[0])
    listing=gateway.get_player_reward_choices(a,limit=1)
    assert [r['entitlement_id'] for r in listing['pending']]==[identity]
    clock[0]+=timedelta(days=35)
    after=gateway.get_player_reward_choices(a)
    assert after['week']['progress']==0 and after['pending'][0]['entitlement_id']==identity


def test_real_dump_restore_keeps_pending_and_claimed_choice_options(clock,empty_database_pair,tmp_path,monkeypatch):
    (source,target),pg_bin=empty_database_pair
    pool=PostgresPool(source);pool.open();restored_pool=None
    def store(db):
        s=PlayerProfileService(now_func=lambda:clock[0])
        return s,PlayerDataStoreService(profile_service=s,statistics_service=PlayerStatisticsService(),
            settings_service=PlayerSettingsService(),repository=PostgresPlayerDataRepository(db))
    try:
        installation=ensure_clean_postgres_installation(pool)
        s,data=store(pool);p=s.get_or_create('a');data.save_player('a');repo=PostgresRewardEntitlements(pool)
        identities=[]
        for w in range(2):
            moment=clock[0]+timedelta(days=7*w)
            with pool.transaction():
                for i in range(12):
                    state=finished_state('a','b');state.account_player_ids=('a',)
                    identity=choices.record_battle(p,state,moment=moment,secret=b'synthetic-restore-secret-32-bytes-long',repository=repo)
                identities.append(identity);data.save_player('a')
        with pool.transaction():
            first=choices.claim(p,identities[0],'attack',request_id='before-backup',moment=clock[0],repository=repo,persist=lambda:data.save_player('a'))
        original_pending=repo.get('a',identities[1]);source_wallet=deepcopy(p.module_shards)
        with tempfile.TemporaryDirectory(prefix='gridshard-choice-restore-') as directory:
            root=Path(directory);backup_tool.backup(source,root/'backup',pg_bin)
            backup_tool.restore(target,root/'backup',root/'runtime',installation,pg_bin)
        clock[0]+=timedelta(days=35)
        restored_pool=PostgresPool(target);restored_pool.open();other,restored=store(restored_pool);restored.load_player('a')
        player=other.get_or_create('a');target_repo=PostgresRewardEntitlements(restored_pool)
        assert target_repo.get('a',identities[1])==original_pending
        monkeypatch.delenv('GRIDSHARD_FREE_ECONOMY_FROM')
        with restored_pool.transaction():
            assert choices.claim(player,identities[0],'attack',request_id='old-replay',moment=clock[0],repository=target_repo,
                persist=lambda:restored.save_player('a'))==first
        assert player.module_shards==source_wallet
        with restored_pool.transaction():
            award=choices.claim(player,identities[1],'defense',request_id='pending-choice',moment=clock[0],repository=target_repo,
                persist=lambda:restored.save_player('a'))
        saved=deepcopy(player.module_shards)
        with restored_pool.transaction():
            assert choices.claim(player,identities[1],'defense',request_id='repeat',moment=clock[0],repository=target_repo,
                persist=lambda:restored.save_player('a'))==award
        assert player.module_shards==saved
        assert repo.get('a',identities[1])==original_pending
    finally:
        if restored_pool is not None:restored_pool.close()
        pool.close()
