"""Purchase invariants and authenticated real HTTP handlers, synthetic data."""
from copy import deepcopy
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app import shop_transactions as transactions, shop_offers as offers, main as gateway, version
from app.auth import ParticipantAuthService, JsonIdentityRepository
from app.player_data_store import JsonFilePlayerDataRepository, PlayerDataStoreService
from app.player_profile import PlayerProfileService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.meta_progression import MetaProgressionService
from test_shop_offers import catalog, profile, IDENTITY, SECRET
from test_free_economy_rewards import clock  # noqa: F401


def quote(p, c, moment, revision=1):
    return transactions.quote(p,c,IDENTITY,revision,moment=moment,secret=SECRET)


def buy(p,c,q,moment,request_id='buy-one',persist=None):
    item=q['offer']
    return transactions.purchase(p,c,item['id'],item['revision'],item['preview_hash'],
        request_id=request_id,moment=moment,secret=SECRET,persist=persist)


def funded():
    p=profile();p.circuit_credits=2000
    return p


def test_two_distinct_purchases_charge_exactly_and_third_cannot_exceed_limit(clock):
    p,c=funded(),catalog();q=quote(p,c,clock[0]);target=q['offer']['target']['module_definition_id']
    initial=p.module_shards.get(target,0);xp=p.season_xp
    first=buy(p,c,q,clock[0]);second=buy(p,c,q,clock[0],'buy-two')
    assert first['purchase_id']!=second['purchase_id']
    assert p.circuit_credits==1000 and p.module_shards[target]-initial==2*first['rewards']['module_shards']
    assert p.season_xp==xp and len(p.shop_purchase_receipts)==2
    assert quote(p,c,clock[0])['purchases_remaining']==0
    before=deepcopy(p)
    with pytest.raises(offers.ShopOfferError) as error:buy(p,c,q,clock[0],'buy-three')
    assert error.value.code=='purchase_limit_reached' and p==before


def test_committed_request_replays_without_catalog_after_expiry_gate_close_and_spending(clock,monkeypatch):
    p,c=funded(),catalog();q=quote(p,c,clock[0]);first=buy(p,c,q,clock[0])
    p.circuit_credits=0;before=deepcopy(p)
    monkeypatch.setattr(version,'VERSION','2.4.0')
    def unavailable():raise AssertionError('Replay must not load a current catalog')
    assert buy(p,unavailable,q,datetime(2027,2,1,tzinfo=timezone.utc))==first
    assert p==before


@pytest.mark.parametrize('balance',[0,499,-50])
def test_insufficient_or_refund_deficit_never_charges_grants_or_consumes_a_slot(clock,balance):
    p,c=funded(),catalog();p.circuit_credits=balance;q=quote(p,c,clock[0]);before=deepcopy(p)
    assert q['blocking_code']=='insufficient_funds' and q['purchases_remaining']==2
    with pytest.raises(offers.ShopOfferError) as error:buy(p,c,q,clock[0])
    assert error.value.code=='insufficient_funds' and p==before


def test_stale_or_foreign_quote_hash_and_reused_request_are_rejected(clock):
    p,c=funded(),catalog();q=quote(p,c,clock[0]);bad=deepcopy(q);bad['offer']['preview_hash']='a'*64
    before=deepcopy(p)
    with pytest.raises(offers.ShopOfferError) as error:buy(p,c,bad,clock[0])
    assert error.value.code=='offer_preview_stale' and p==before
    buy(p,c,q,clock[0]);before=deepcopy(p)
    with pytest.raises(offers.ShopOfferError) as error:buy(p,c,bad,clock[0])
    assert error.value.code=='purchase_request_conflict' and p==before


@pytest.mark.parametrize('stage',['grant','save'])
def test_interruption_preserves_wallet_parts_limit_receipt_and_pin(clock,monkeypatch,stage):
    p,c=funded(),catalog();q=quote(p,c,clock[0]);before=deepcopy(p)
    def failed_save():raise RuntimeError('injected shop save')
    if stage=='grant':
        original=transactions.award_module_shards
        def fail(*args):original(*args);raise RuntimeError('injected grant')
        monkeypatch.setattr(transactions,'award_module_shards',fail)
    with pytest.raises(RuntimeError):buy(p,c,q,clock[0],persist=failed_save if stage=='save' else None)
    assert p==before


def test_corrupt_or_foreign_purchase_receipt_never_resets_limit(clock):
    p,c=funded(),catalog();q=quote(p,c,clock[0]);buy(p,c,q,clock[0])
    key=next(iter(p.shop_purchase_receipts));p.shop_purchase_receipts[key]['rewards']['module_shards']+=1
    before=deepcopy(p)
    with pytest.raises(offers.ShopOfferError) as error:buy(p,c,q,clock[0],'new-request')
    assert error.value.code=='purchase_receipt_invalid' and p==before


def test_revision_change_does_not_reset_same_week_purchase_limit(clock):
    c=catalog(lambda row:row.update(ends_at='2026-12-30T00:00:00Z'));p=funded();q=quote(p,c,clock[0])
    buy(p,c,q,clock[0]);buy(p,c,q,clock[0],'second')
    document=c.document;row=deepcopy(document['offers'][0])
    row.update(revision=2,status='draft',published_at=None,starts_at='2026-12-30T00:00:00Z',ends_at='2027-01-04T00:00:00Z')
    document['offers'].append(offers.seal_offer(row))
    newer=offers.ShopOfferCatalog(document,previous=c).publish(IDENTITY,2,moment='2026-11-16T00:00:00Z')
    when=datetime(2026,12,30,tzinfo=timezone.utc);updated=quote(p,newer,when,revision=2)
    assert updated['purchases_remaining']==0 and updated['offer']['target']==q['offer']['target']
    with pytest.raises(offers.ShopOfferError) as error:buy(p,newer,updated,when,'third')
    assert error.value.code=='purchase_limit_reached'


def test_new_utc_week_gets_two_slots_without_erasing_old_receipt(clock):
    c,p=catalog(),funded();q=quote(p,c,clock[0]);old=buy(p,c,q,clock[0])
    buy(p,c,q,clock[0],'second')
    document=c.document;row=deepcopy(document['offers'][0])
    row.update(revision=2,status='draft',published_at=None,starts_at='2027-01-04T00:00:00Z',ends_at='2027-01-11T00:00:00Z')
    document['offers'].append(offers.seal_offer(row))
    newer=offers.ShopOfferCatalog(document,previous=c).publish(IDENTITY,2,moment='2026-11-16T00:00:00Z')
    when=datetime(2027,1,4,tzinfo=timezone.utc);newq=quote(p,newer,when,revision=2)
    assert newq['purchases_remaining']==2
    buy(p,newer,newq,when,'next-week')
    assert buy(p,newer,q,when)==old and len(p.shop_purchase_receipts)==3


@pytest.fixture
def shop_http(clock,tmp_path,monkeypatch):
    service=PlayerProfileService(now_func=lambda:clock[0]);settings=PlayerSettingsService();statistics=PlayerStatisticsService()
    data=PlayerDataStoreService(profile_service=service,settings_service=settings,statistics_service=statistics,
        repository=JsonFilePlayerDataRepository(tmp_path/'players.json'))
    auth=ParticipantAuthService(JsonIdentityRepository(tmp_path/'identities.json'),SECRET)
    owner='shop-http-owner';token=auth.register_or_login(owner,'a'*40)['access_token']
    monkeypatch.setenv('GRIDSHARD_AUTH_REQUIRED','1')
    for name,value in dict(RUNTIME_STRICT=False,participant_auth_service=auth,player_profile_service=service,
        player_settings_service=settings,player_statistics_service=statistics,player_data_store_service=data,
        player_data_repository=data.repository,meta_progression_service=MetaProgressionService(now_func=lambda:clock[0])).items():
        monkeypatch.setattr(gateway,name,value)
    c=catalog();monkeypatch.setattr(offers,'load_catalog',lambda:c)
    p=service.get_or_create(owner);p.circuit_credits=2000;data.save_player(owner)
    return TestClient(gateway.app),owner,{'authorization':'Bearer '+token},data,clock,c


def test_http_auth_ownership_schema_and_no_cache_are_enforced(shop_http):
    client,owner,headers,data,clock,c=shop_http;base=f'/profile/{owner}/shop-offers'
    assert client.get(base).status_code==401
    assert client.get('/profile/foreign/shop-offers',headers=headers).status_code==403
    listing=client.get(base,headers=headers);assert listing.status_code==200 and len(listing.json()['offers'])==1
    assert listing.headers['cache-control']=='no-store'
    q=client.get(base+'/'+IDENTITY+'?revision=1',headers=headers).json()
    assert q['purchases_remaining']==2 and q['offer']['reward_snapshot']['payload']['module_shards']>0
    body=dict(request_id='buy',revision=1,preview_hash=q['offer']['preview_hash']);uri=base+'/'+IDENTITY+'/purchase'
    before=data.repository.load(owner).to_dict()
    for key,value in [('price',1),('module_shards',999),('rewards',{}),('revision',1.0),('revision',True),('revision','1')]:
        assert client.post(uri,headers=headers,json={**body,key:value}).status_code==422
    assert client.post(uri,headers=headers,json={**body,'player_id':'foreign'}).status_code==403
    assert data.repository.load(owner).to_dict()==before
    first=client.post(uri,headers=headers,json=body)
    assert first.status_code==200 and first.json()['meta_progression']['circuit_credits']==1500
    assert first.headers['cache-control']=='no-store'
    assert client.post(uri,headers=headers,json=body).json()['shop_purchase_receipt']==first.json()['shop_purchase_receipt']
    assert client.post(uri,headers=headers,json={**body,'request_id':'second'}).status_code==200
    blocked=client.post(uri,headers=headers,json={**body,'request_id':'third'})
    assert blocked.status_code==409 and blocked.json()['code']=='purchase_limit_reached' and blocked.json()['message_en']


def test_http_restart_replay_uses_current_wallet_and_original_receipt_after_gate_closes(shop_http,monkeypatch):
    client,owner,headers,data,clock,c=shop_http;base=f'/profile/{owner}/shop-offers/'+IDENTITY
    q=client.get(base+'?revision=1',headers=headers).json()
    body=dict(request_id='persisted',revision=1,preview_hash=q['offer']['preview_hash'])
    first=client.post(base+'/purchase',headers=headers,json=body).json()['shop_purchase_receipt']
    data.load_player(owner);p=data.profile_service.get(owner);p.circuit_credits-=7;data.save_player(owner)
    data.profile_service._profiles.clear();monkeypatch.setattr(version,'VERSION','2.4.0')
    replay=client.post(base+'/purchase',headers=headers,json=body)
    assert replay.status_code==200 and replay.json()['shop_purchase_receipt']==first
    assert replay.json()['meta_progression']['circuit_credits']==1493
    assert 'shop_purchase_receipts' not in replay.json()['profile']


def test_http_default_draft_is_hidden_and_stale_preview_never_charges(shop_http,monkeypatch):
    client,owner,headers,data,clock,c=shop_http;base=f'/profile/{owner}/shop-offers'
    before=data.repository.load(owner).to_dict()
    response=client.post(base+'/'+IDENTITY+'/purchase',headers=headers,json=dict(request_id='bad',revision=1,preview_hash='a'*64))
    assert response.status_code==409 and response.json()['code']=='offer_preview_stale'
    assert data.repository.load(owner).to_dict()==before
    draft=offers.ShopOfferCatalog(__import__('json').loads(offers.CATALOG_PATH.read_text(encoding='utf-8')))
    monkeypatch.setattr(offers,'load_catalog',lambda:draft)
    assert client.get(base,headers=headers).json()['offers']==[]
