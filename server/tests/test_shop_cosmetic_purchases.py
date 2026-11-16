"""Soft-currency pilot: permanent ownership, atomic charge and old receipt replay."""
from copy import deepcopy
from datetime import datetime,timezone

import pytest

from app import shop_offers as offers,shop_transactions as transactions,shop_cosmetic_offers as cosmetics,version
from test_shop_offers import profile,document,SECRET
from test_free_economy_rewards import clock  # noqa: F401

IDENTITY='cosmetic.dockyard'


def catalog():
    c=offers.ShopOfferCatalog(document())
    for identity in [IDENTITY,'cosmetic.workshop','weekly.module-parts']:
        c=c.publish(identity,1,moment='2026-11-17T00:00:00Z')
    return c


def funded():
    p=profile();p.circuit_credits=5000;return p


def quote(p,c,moment,identity=IDENTITY):
    return transactions.quote(p,c,identity,1,moment=moment,secret=SECRET)


def buy(p,c,q,moment,request_id='set-one',persist=None):
    o=q['offer'];return transactions.purchase(p,c,o['id'],o['revision'],o['preview_hash'],
        request_id=request_id,moment=moment,secret=SECRET,persist=persist)


def test_two_different_sets_grant_only_cosmetics_and_never_auto_equip_or_grant_power(clock):
    p,c=funded(),catalog();before=deepcopy(p);q=quote(p,c,clock[0]);r=buy(p,c,q,clock[0])
    assert r['rewards']==cosmetics.reward_payload(IDENTITY) and p.circuit_credits==3500
    assert set(r['rewards'])=={'avatar_frame_id','profile_background_id'}
    assert r['rewards']['avatar_frame_id'] in p.unlocked_avatar_frame_ids
    assert r['rewards']['profile_background_id'] in p.unlocked_profile_background_ids
    assert p.selected_avatar_frame_id==before.selected_avatar_frame_id
    assert p.selected_profile_background_id==before.selected_profile_background_id
    assert p.module_shards==before.module_shards and p.season_xp==before.season_xp
    other=quote(p,c,clock[0],'cosmetic.workshop');buy(p,c,other,clock[0],'set-two')
    assert p.circuit_credits==2000
    module=quote(p,c,clock[0],'weekly.module-parts');assert module['purchases_remaining']==2
    buy(p,c,module,clock[0],'module');assert p.circuit_credits==1500


@pytest.mark.parametrize('partial',[False,True])
def test_any_existing_set_item_rejects_new_charge_and_does_not_consume_receipt(clock,partial):
    p,c=funded(),catalog();q=quote(p,c,clock[0])
    if partial:p.unlocked_avatar_frame_ids+=('dockyard_latch_frame',)
    else:buy(p,c,q,clock[0])
    before=deepcopy(p);assert quote(p,c,clock[0])['blocking_code']=='already_owned'
    with pytest.raises(offers.ShopOfferError) as exc:buy(p,c,q,clock[0],'new-request')
    assert exc.value.code=='already_owned' and p==before


@pytest.mark.parametrize('balance',[0,1499,-50])
def test_refund_deficit_or_insufficient_earned_credits_never_unlocks_anything(clock,balance):
    p,c=funded(),catalog();p.circuit_credits=balance;q=quote(p,c,clock[0]);before=deepcopy(p)
    assert q['blocking_code']=='insufficient_funds'
    with pytest.raises(offers.ShopOfferError):buy(p,c,q,clock[0])
    assert p==before


def test_account_limit_does_not_reset_next_week_and_receipt_replays_without_catalog_or_gate(clock,monkeypatch):
    p,c=funded(),catalog();q=quote(p,c,clock[0]);r=buy(p,c,q,clock[0])
    # Even if an ownership projection was lost, the immutable receipt protects the charge.
    p.unlocked_avatar_frame_ids=('none',);p.unlocked_profile_background_ids=('default',)
    next_week=datetime(2027,1,5,tzinfo=timezone.utc)
    assert quote(p,c,next_week)['blocking_code']=='purchase_limit_reached'
    monkeypatch.setattr(version,'VERSION','2.4.0')
    def unavailable():raise AssertionError('Replay must not load live art/catalog')
    before=deepcopy(p);assert buy(p,unavailable,q,datetime(2027,2,1,tzinfo=timezone.utc))==r and p==before


@pytest.mark.parametrize('stage',['grant','save'])
def test_failures_roll_back_both_unlocks_wallet_and_receipt(clock,monkeypatch,stage):
    p,c=funded(),catalog();q=quote(p,c,clock[0]);before=deepcopy(p)
    def failed():raise RuntimeError('injected set persistence')
    if stage=='grant':
        original=cosmetics.grant
        def fail(*args):original(*args);failed()
        monkeypatch.setattr(cosmetics,'grant',fail)
    with pytest.raises(RuntimeError):buy(p,c,q,clock[0],persist=failed if stage=='save' else None)
    assert p==before


@pytest.mark.parametrize('change',['currency','price','stock','items','weekly'])
def test_catalog_cannot_install_real_money_season_art_or_resettable_ownership(change):
    d=document();r=next(r for r in d['offers'] if r['id']==IDENTITY)
    if change=='currency':r['price']['currency']='TRY'
    if change=='price':r['price']['amount']=1
    if change=='stock':r['cosmetics'][0]['inventory_pool']='competition'
    if change=='items':r['cosmetics'][0]['id']='aurora_frame'
    if change=='weekly':r['limit']['period']='utc_week'
    d['offers']=[offers.seal_offer(r)]
    with pytest.raises(offers.ShopOfferError):offers.ShopOfferCatalog(d)


def test_damaged_live_art_returns_the_stable_catalog_error(monkeypatch):
    def damaged(*args):raise cosmetics.cosmetics.CosmeticReleaseError('damaged source')
    monkeypatch.setattr(cosmetics.cosmetics,'checked_shop_art',damaged)
    with pytest.raises(offers.ShopOfferError) as exc:catalog()
    assert exc.value.code=='invalid_catalog'
