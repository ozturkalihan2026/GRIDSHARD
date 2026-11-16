"""Opt-in loopback acceptance: future shop catalog exists in memory only."""
from datetime import datetime, timezone
import os


def install():
    if (os.environ.get('GRIDSHARD_E2E_SHOP_OFFERS') != '1'
            or os.environ.get('GRIDSHARD_RUNTIME_MODE') != 'development'):
        raise RuntimeError('Shop fixture requires the isolated E2E runner')
    from fastapi import HTTPException, Request
    from app import main as gateway, shop_offers, version
    now = datetime(2026, 12, 28, 12, tzinfo=timezone.utc)
    version.VERSION = '2.5.0'
    os.environ['GRIDSHARD_FREE_ECONOMY_FROM'] = '2026-12-22T00:00:00Z'
    document = shop_offers.load_catalog().document
    document['offers'][0]['minimum_arena'] = 2
    document['offers'][0] = shop_offers.seal_offer(document['offers'][0])
    catalog = shop_offers.ShopOfferCatalog(document).publish('weekly.module-parts', 1,
        moment=datetime(2026, 11, 16, tzinfo=timezone.utc))
    if os.environ.get('GRIDSHARD_E2E_SHOP_PILOT') == '1':
        for identity in ('cosmetic.dockyard','cosmetic.workshop'):
            catalog = catalog.publish(identity,1,moment='2026-11-17T00:00:00Z')
    shop_offers.load_catalog = lambda: catalog
    gateway.player_profile_service._now_func = lambda: now
    gateway.meta_progression_service._now_func = lambda: now

    @gateway.app.post('/__e2e/shop/{player_id}/prepare')
    async def prepare(player_id: str, request: Request):
        if (request.client.host not in {'127.0.0.1', '::1'}
                or request.headers.get('x-gridshard-e2e') != 'shop-local-only'):
            raise HTTPException(status_code=403)
        profile = gateway.player_profile_service.get_or_create(player_id)
        if profile.shop_purchase_receipts:
            raise HTTPException(status_code=409)
        state = await request.json()
        profile.circuit_credits = 0 if state.get('state') == 'funds' else 5000 if os.environ.get('GRIDSHARD_E2E_SHOP_PILOT') == '1' else 2000
        profile.rating = profile.highest_rating = 0 if state.get('state') == 'locked' else 600
        if state.get('state') == 'partial':
            profile.unlocked_avatar_frame_ids += ('dockyard_latch_frame',)
        gateway.persist_player_data(player_id)
        return dict(profile=profile.to_view(), fixture=True, production_changed=False)
    route = gateway.app.router.routes.pop()
    gateway.app.router.routes.insert(0, route)
