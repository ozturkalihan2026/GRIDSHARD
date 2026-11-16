from app import main as gateway,shop_offers as offers
from test_shop_transactions import shop_http  # noqa: F401
from test_shop_cosmetic_purchases import catalog,IDENTITY
from test_free_economy_rewards import clock  # noqa: F401


def test_http_soft_currency_ownership_and_exact_receipt_replay(shop_http,monkeypatch):
    client,owner,headers,data,clock,_=shop_http
    c=catalog();monkeypatch.setattr(offers,'load_catalog',lambda:c)
    p=data.profile_service.get_or_create(owner);p.rating=p.highest_rating=600;p.circuit_credits=5000;data.save_player(owner)
    base=f'/profile/{owner}/shop-offers';uri=f'{base}/{IDENTITY}/purchase'
    assert client.get(base).status_code==401
    assert client.get('/profile/foreign/shop-offers',headers=headers).status_code==403
    listing=client.get(base,headers=headers);assert listing.status_code==200
    assert len(listing.json()['offers'])==3 and listing.headers['cache-control']=='no-store'
    q=client.get(f'{base}/{IDENTITY}?revision=1',headers=headers).json()
    body=dict(request_id='cosmetic-http',revision=1,preview_hash=q['offer']['preview_hash'])
    for field,value in [('currency','TRY'),('price',1),('cosmetics',{}),('revision',True)]:
        assert client.post(uri,headers=headers,json={**body,field:value}).status_code==422
    first=client.post(uri,headers=headers,json=body);assert first.status_code==200
    assert first.json()['meta_progression']['circuit_credits']==3500
    assert first.json()['shop_purchase_receipt']['rewards']['avatar_frame_id']=='dockyard_latch_frame'
    second=client.post(uri,headers=headers,json={**body,'request_id':'new-request'})
    assert second.status_code==409 and second.json()['code']=='already_owned'
    assert client.post(uri,headers=headers,json=body).json()['shop_purchase_receipt']==first.json()['shop_purchase_receipt']
    assert client.get(f'{base}/{IDENTITY}?revision=1',headers=headers).json()['blocking_code']=='already_owned'
    data.load_player(owner);assert data.profile_service.get(owner).circuit_credits==3500
    assert 'dockyard_latch_frame' in data.profile_service.get(owner).unlocked_avatar_frame_ids
