"""Owned loopback E2E only: exercise the real published S1 handlers without live state."""
from copy import deepcopy
from datetime import datetime, timezone
import os


def install():
    if os.environ.get('GRIDSHARD_E2E_S1_ACCEPTANCE') != '1' or os.environ.get('GRIDSHARD_RUNTIME_MODE') != 'development':
        raise RuntimeError('S1 fixture requires the isolated development E2E runner')
    from fastapi import Request, HTTPException
    from app import first_season_profile as first, cosmetic_releases, player_profile, store_catalog
    from prepare_first_season import candidate
    registry, _ = candidate()
    now = datetime(2026, 11, 30, tzinfo=timezone.utc)
    for release in list(registry.releases.values()):
        registry = registry.publish(release['id'], now=datetime(2026, 11, 5, tzinfo=timezone.utc))
    document = deepcopy(first.PROFILE)
    document['status'] = 'published'
    document['release_checks'] = {key:True for key in document['release_checks']}
    document['content_hash'] = cosmetic_releases.fingerprint(document)
    first.PROFILE, first.REGISTRY, cosmetic_releases.REGISTRY = document, registry, registry
    os.environ['GRIDSHARD_SEASON_STARTS_AT'] = document['starts_at']
    os.environ['GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT'] = ''
    original_launch, original_season = player_profile.launch_status, player_profile.season_descriptor
    player_profile.launch_status = lambda moment=None: original_launch(moment or now)
    store_catalog.launch_status = player_profile.launch_status
    player_profile.season_descriptor = lambda moment=None: original_season(moment or now)
    from app import main as gateway
    gateway.player_profile_service._now_func = lambda:now
    gateway.meta_progression_service._now_func = lambda:now

    @gateway.app.post('/__e2e/s1/{player_id}/prepare')
    async def seed(player_id: str, request: Request):
        if request.client.host not in {'127.0.0.1','::1'} or request.headers.get('x-gridshard-e2e') != 's1-local-only':
            raise HTTPException(status_code=403)
        with gateway._store_economy_transaction(player_id):
            profile = gateway.player_profile_service.get_or_create(player_id)
            if any(m.get('source') == 's1-core-fixture' for m in profile.reward_inbox):
                raise HTTPException(status_code=409,detail='Fresh isolated account required')
            profile.season_xp = player_profile.SEASON_REWARD_TRACK[-1]['required_xp']
            gateway.player_profile_service.get_or_create(player_id)
            for source, period, prize in (
                ('weekly_tournament','2026-W49',gateway.WEEKLY_PRIZES[0]),
                ('season_leaderboard',document['season_id'],gateway.LEADERBOARD_PRIZES[0]),
            ):
                gateway._queue_competition_reward(profile,source=source,period_id=period,position=1,prize=prize)
            profile.reward_inbox.append(dict(message_id='s1-core-fixture',source='s1-core-fixture',status='unclaimed',
                title_tr='Çekirdek teslimi kabul örneği',chest=dict(chest_tier='gold',circuit_credits=100,
                core_type_id='core_resonance',core_shards=3)))
            gateway.persist_player_data(player_id)
        return dict(profile=gateway.get_profile(player_id),inbox=gateway._reward_inbox_view(profile),
                    fixture=True,production_changed=False)
    # main's static '/' mount is last at import time. This loopback-only
    # fixture route must precede that catch-all; production never imports us.
    fixture_route = gateway.app.router.routes.pop()
    gateway.app.router.routes.insert(0, fixture_route)
