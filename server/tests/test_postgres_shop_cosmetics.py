from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy

import pytest

from app import main as gateway,shop_offers as offers
from app.postgres_economic_operations import PostgresEconomicOperations
from test_postgres_shop_transactions import shop_db,request,count_operations  # noqa: F401
from test_shop_cosmetic_purchases import catalog,IDENTITY
from test_postgres_social_api import social_db  # noqa: F401
from test_free_economy_rewards import clock  # noqa: F401


@pytest.fixture
def cosmetic_db(shop_db,monkeypatch):
    c=catalog();monkeypatch.setattr(offers,'load_catalog',lambda:c)
    _,_,ids=shop_db
    with gateway._persistent_operation(ids):
        for owner in ids:
            p=gateway._team_member_profile(owner);p.rating=p.highest_rating=600
            gateway.persist_player_data(owner)
    return shop_db


@pytest.mark.parametrize('same_request',[False,True])
def test_concurrent_cosmetic_requests_create_one_charge_one_unlock_and_one_sql_receipt(cosmetic_db,same_request):
    pool,players,(owner,_,_)=cosmetic_db;q=gateway.get_player_shop_offer(owner,IDENTITY,1);r=request(q)
    def buy(_):
        try:return gateway.purchase_player_shop_offer(owner,IDENTITY,r if same_request else request(q))
        except offers.ShopOfferError as exc:return exc.code
    with ThreadPoolExecutor(max_workers=8) as workers:results=list(workers.map(buy,range(12)))
    delivered=[x['shop_purchase_receipt'] for x in results if isinstance(x,dict)]
    assert len(delivered)==(12 if same_request else 1)
    assert len({r['receipt_hash'] for r in delivered})==1
    saved=players.load(owner).profile
    assert saved['meta_progression_state']['circuit_credits']==500
    assert saved['cosmetics']['unlocked_avatar_frame_ids'].count('dockyard_latch_frame')==1
    assert saved['cosmetics']['unlocked_profile_background_ids'].count('dockyard_deck_background')==1
    assert count_operations(pool,owner)==1


@pytest.mark.parametrize('stage',['save','economic_complete'])
def test_postgres_rollback_preserves_both_cosmetics_and_credits_then_retries_once(cosmetic_db,monkeypatch,stage):
    pool,players,(owner,_,_)=cosmetic_db;q=gateway.get_player_shop_offer(owner,IDENTITY,1);r=request(q)
    before=deepcopy(players.load(owner).to_dict())
    with monkeypatch.context() as patch:
        if stage=='save':
            original=gateway.persist_player_data
            def fail(*args):original(*args);raise RuntimeError('injected cosmetic save')
            patch.setattr(gateway,'persist_player_data',fail)
        else:
            original=PostgresEconomicOperations.complete
            def fail(self,*args,**kwargs):original(self,*args,**kwargs);raise RuntimeError('injected cosmetic completion')
            patch.setattr(PostgresEconomicOperations,'complete',fail)
        with pytest.raises(RuntimeError,match='injected cosmetic'):gateway.purchase_player_shop_offer(owner,IDENTITY,r)
    assert players.load(owner).to_dict()==before and count_operations(pool,owner)==0
    first=gateway.purchase_player_shop_offer(owner,IDENTITY,r)
    gateway.player_profile_service._profiles.clear()
    assert gateway.purchase_player_shop_offer(owner,IDENTITY,r)['shop_purchase_receipt']==first['shop_purchase_receipt']
    assert count_operations(pool,owner)==1
