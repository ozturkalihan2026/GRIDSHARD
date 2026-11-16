"""Local art/ownership acceptance only; never imported by production."""
from hashlib import sha256
import os


def install():
    if (os.environ.get('GRIDSHARD_E2E_SHOP_COSMETICS') != '1'
            or os.environ.get('GRIDSHARD_RUNTIME_MODE') != 'development'):
        raise RuntimeError('Shop cosmetic fixture requires isolated loopback runner')
    from fastapi import HTTPException, Request
    from app import main as gateway

    @gateway.app.post('/__e2e/shop-cosmetics/{player_id}/prepare')
    async def prepare(player_id: str, request: Request):
        if (request.client.host not in {'127.0.0.1', '::1'}
                or request.headers.get('x-gridshard-e2e') != 'shop-art-local-only'):
            raise HTTPException(status_code=403)
        state = await request.json()
        frames = ('dockyard_latch_frame', 'workshop_shelf_frame')
        backgrounds = ('dockyard_deck_background', 'workshop_bay_background')
        profile = gateway.player_profile_service.get_or_create(player_id)
        if state.get('owned'):
            profile.unlocked_avatar_frame_ids = tuple(dict.fromkeys((*profile.unlocked_avatar_frame_ids, *frames)))
            profile.unlocked_profile_background_ids = tuple(dict.fromkeys((*profile.unlocked_profile_background_ids, *backgrounds)))
            gateway.persist_player_data(player_id)
        token = sha256(player_id.encode()).hexdigest()[:12]
        visitor = gateway.player_profile_service.get_or_create('cos03-visit-' + token)
        visitor.display_name = 'Tersane' + token[:8]
        visitor.unlocked_avatar_frame_ids += tuple(f for f in frames if f not in visitor.unlocked_avatar_frame_ids)
        visitor.unlocked_profile_background_ids += tuple(b for b in backgrounds if b not in visitor.unlocked_profile_background_ids)
        index = 1 if state.get('theme') == 'workshop' else 0
        gateway.player_profile_service.set_cosmetics(visitor.player_id,
            avatar_frame_id=frames[index], profile_background_id=backgrounds[index])
        gateway.persist_player_data(visitor.player_id)
        return dict(visitor_id=visitor.player_id, visitor_name=visitor.display_name,
                    fixture=True, production_changed=False)
    route = gateway.app.router.routes.pop()
    gateway.app.router.routes.insert(0, route)
