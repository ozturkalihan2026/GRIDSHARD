"""Production purchase handlers and economic receipts on isolated PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app import main as gateway, shop_offers as offers, shop_transactions as transactions, version
from app.meta_progression import MetaProgressionService
from app.postgres_economic_operations import PostgresEconomicOperations
from app.postgres_repository import PostgresPool, PostgresPlayerDataRepository
from app.clean_install import ensure_clean_postgres_installation
from app.player_profile import PlayerProfileService
from app.player_data_store import PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from test_shop_offers import catalog, IDENTITY, SECRET
from test_postgres_social_api import social_db  # noqa: F401
from test_free_economy_rewards import clock  # noqa: F401
from test_server_backup import empty_database_pair, backup_tool  # noqa: F401


@pytest.fixture
def shop_db(clock,social_db,monkeypatch):
    pool,players,_,ids=social_db
    monkeypatch.setattr(gateway.player_profile_service,'_now_func',lambda:clock[0])
    monkeypatch.setattr(gateway,'meta_progression_service',MetaProgressionService(now_func=lambda:clock[0]))
    c=catalog();monkeypatch.setattr(offers,'load_catalog',lambda:c)
    with gateway._persistent_operation(ids):
        for owner in ids:
            gateway._team_member_profile(owner).circuit_credits=2000
            gateway.persist_player_data(owner)
    return pool,players,ids


def request(q,identity=None):
    return gateway.ShopOfferPurchaseRequest(request_id=identity or uuid4().hex,revision=q['offer']['revision'],preview_hash=q['offer']['preview_hash'])


def count_operations(pool,owner):
    with pool.connection() as connection:
        return connection.execute('SELECT COUNT(*) FROM player_economic_operations WHERE player_id=%s',(owner,)).fetchone()[0]


def test_parallel_different_requests_charge_two_and_cannot_overrun_weekly_limit(shop_db):
    pool,players,(owner,_,_)=shop_db
    q=gateway.get_player_shop_offer(owner,IDENTITY,1);before=players.load(owner).profile['meta_progression_state']
    def buy(_):
        try:return gateway.purchase_player_shop_offer(owner,IDENTITY,request(q))
        except offers.ShopOfferError as exc:return exc.code
    with ThreadPoolExecutor(max_workers=8) as workers:results=list(workers.map(buy,range(12)))
    delivered=[r['shop_purchase_receipt'] for r in results if isinstance(r,dict)]
    assert len(delivered)==2 and results.count('purchase_limit_reached')==10
    after=players.load(owner).profile['meta_progression_state'];reward=delivered[0]['rewards']
    assert after['circuit_credits']==1000 and len(after['shop_purchase_receipts'])==2
    assert after['module_shards'][reward['module_definition_id']]-before['module_shards'].get(reward['module_definition_id'],0)==reward['module_shards']*2
    assert count_operations(pool,owner)==2


def test_parallel_same_request_and_conflicting_payload_replay_one_charge(shop_db):
    pool,players,(owner,_,_)=shop_db;q=gateway.get_player_shop_offer(owner,IDENTITY,1);r=request(q,'same-request')
    with ThreadPoolExecutor(max_workers=8) as workers:
        results=list(workers.map(lambda _:gateway.purchase_player_shop_offer(owner,IDENTITY,r),range(12)))
    assert len({x['shop_purchase_receipt']['receipt_hash'] for x in results})==1
    meta=players.load(owner).profile['meta_progression_state']
    assert meta['circuit_credits']==1500 and len(meta['shop_purchase_receipts'])==1 and count_operations(pool,owner)==1
    before=players.load(owner).to_dict()
    with pytest.raises(offers.ShopOfferError) as error:
        gateway.purchase_player_shop_offer(owner,IDENTITY,gateway.ShopOfferPurchaseRequest(request_id=r.request_id,revision=1,preview_hash='f'*64))
    assert error.value.code=='purchase_request_conflict' and players.load(owner).to_dict()==before


@pytest.mark.parametrize('stage',['save','economic_complete'])
def test_failure_after_durable_write_rolls_back_wallet_limit_grant_and_both_receipts(shop_db,monkeypatch,stage):
    pool,players,(owner,_,_)=shop_db;q=gateway.get_player_shop_offer(owner,IDENTITY,1);r=request(q)
    before=players.load(owner).to_dict()
    with monkeypatch.context() as patch:
        if stage=='save':
            original=gateway.persist_player_data
            def fail(owner):original(owner);raise RuntimeError('injected shop durable save')
            patch.setattr(gateway,'persist_player_data',fail)
        else:
            original=PostgresEconomicOperations.complete
            def fail(self,*args,**kwargs):original(self,*args,**kwargs);raise RuntimeError('injected shop economic completion')
            patch.setattr(PostgresEconomicOperations,'complete',fail)
        with pytest.raises(RuntimeError,match='injected shop'):
            gateway.purchase_player_shop_offer(owner,IDENTITY,r)
    assert players.load(owner).to_dict()==before and count_operations(pool,owner)==0
    first=gateway.purchase_player_shop_offer(owner,IDENTITY,r)
    saved=players.load(owner).to_dict();gateway.player_profile_service._profiles.clear()
    assert gateway.purchase_player_shop_offer(owner,IDENTITY,r)['shop_purchase_receipt']==first['shop_purchase_receipt']
    assert players.load(owner).to_dict()==saved and count_operations(pool,owner)==1


def test_sql_replay_returns_original_receipt_and_current_wallet_after_catalog_and_rollout_close(shop_db,clock,monkeypatch):
    pool,players,(owner,_,_)=shop_db;q=gateway.get_player_shop_offer(owner,IDENTITY,1);r=request(q)
    first=gateway.purchase_player_shop_offer(owner,IDENTITY,r)['shop_purchase_receipt']
    with gateway._persistent_operation([owner]):
        p=gateway._team_member_profile(owner);p.circuit_credits-=7;gateway.persist_player_data(owner)
    clock[0]=datetime(2027,1,5,tzinfo=timezone.utc)
    monkeypatch.setattr(version,'VERSION','2.4.0')
    def unavailable():raise AssertionError('Committed replay should not load catalog')
    monkeypatch.setattr(offers,'load_catalog',unavailable)
    gateway.player_profile_service._profiles.clear()
    replay=gateway.purchase_player_shop_offer(owner,IDENTITY,r)
    assert replay['replayed'] and replay['shop_purchase_receipt']==first
    assert replay['meta_progression']['circuit_credits']==1493 and count_operations(pool,owner)==1


def test_real_dump_restore_preserves_wallet_private_limit_and_economic_receipt(clock,empty_database_pair,tmp_path):
    (source,target),pg_bin=empty_database_pair;pool=PostgresPool(source);pool.open();restored_pool=None
    try:
        installation=ensure_clean_postgres_installation(pool)
        service=PlayerProfileService(now_func=lambda:clock[0]);owner='shop02-backup'
        data=PlayerDataStoreService(profile_service=service,settings_service=PlayerSettingsService(),
            statistics_service=PlayerStatisticsService(),repository=PostgresPlayerDataRepository(pool))
        p=service.get_or_create(owner);p.circuit_credits=2000;c=catalog()
        q=transactions.quote(p,c,IDENTITY,1,moment=clock[0],secret=SECRET);data.save_player(owner)
        with pool.transaction():
            repo=PostgresEconomicOperations(pool);key,_=repo.begin(owner,'saved-buy','purchase_player_shop_offer',{'preview_hash':q['offer']['preview_hash']})
            receipt=transactions.purchase(p,c,IDENTITY,1,q['offer']['preview_hash'],request_id='saved-buy',
                moment=clock[0],secret=SECRET,persist=lambda:data.save_player(owner))
            repo.complete(owner,key,dict(shop_purchase_receipt=receipt,profile=p.to_view()),'basic')
        original=data.repository.load(owner).to_dict()
        backup_tool.backup(source,tmp_path/'backup',pg_bin)
        backup_tool.restore(target,tmp_path/'backup',tmp_path/'runtime',installation,pg_bin)
        restored_pool=PostgresPool(target);restored_pool.open()
        assert PostgresPlayerDataRepository(restored_pool).load(owner).to_dict()==original
        replacement=PlayerProfileService(now_func=lambda:clock[0])
        restored=PlayerDataStoreService(profile_service=replacement,settings_service=PlayerSettingsService(),
            statistics_service=PlayerStatisticsService(),repository=PostgresPlayerDataRepository(restored_pool))
        restored.load_player(owner);loaded=replacement.get_or_create(owner)
        assert transactions.quote(loaded,c,IDENTITY,1,moment=clock[0],secret=SECRET)['purchases_remaining']==1
        assert transactions.purchase(loaded,c,IDENTITY,1,q['offer']['preview_hash'],request_id='saved-buy',moment=clock[0],secret=SECRET)==receipt
        assert loaded.circuit_credits==1500 and len(loaded.shop_purchase_receipts)==1
        with restored_pool.transaction():
            _,outcome=PostgresEconomicOperations(restored_pool).begin(owner,'saved-buy','purchase_player_shop_offer',{'preview_hash':q['offer']['preview_hash']})
            assert outcome['receipts']['shop_purchase_receipt']==receipt
    finally:
        if restored_pool is not None:restored_pool.close()
        pool.close()
