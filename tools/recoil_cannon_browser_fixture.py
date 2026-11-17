"""Owned loopback QA only: future admitted card through the actual app/battle.

Production never imports this module. No source catalog/season dates/approval
files are changed. All profiles, matches and publication copies are disposable.
"""
import os
from copy import deepcopy
from dataclasses import replace


def install():
    if (os.environ.get('GRIDSHARD_E2E_RECOIL_CANNON') != '1'
            or os.environ.get('GRIDSHARD_RUNTIME_MODE') != 'development'):
        raise RuntimeError('Recoil QA requires the isolated loopback runner')
    from fastapi import HTTPException, Request
    from app import main as gateway, arena_canon as arena, meta_progression as meta
    from app.game import catalog, battle_pool, catalog_view
    from app.game.models import ModuleStatus, TimedModuleEffect, BattlePool
    from app.game.board import get_default_board
    from app.game.recoil_cannon import definition
    from app.module_roster import MODULE_SPECS
    from app.season_module_releases import MANIFEST, published_module_progression

    d = definition()
    baseline = set(MODULE_SPECS)
    spec = dict(id=d.id, name_tr=d.name_tr, category=d.combat_class, rarity=d.rarity,
        current_cost=d.current_cost, max_hp=d.max_hp, base_damage=d.base_damage, cooldown_ms=d.cooldown_ms,
        legacy_target_category='saldırı', one_job=d.description_tr, candidate_effect='50 hasar / 3 sn; 16 kendi CAN',
        rarity_signature=d.signature_mechanic, visible_feedback=d.telegraph_tr, counterplay=d.counterplay_tr,
        parameters=dict(recoil_hp=16))
    document = deepcopy(MANIFEST)
    release = document['roadmap'][0]
    release.update(status='published', season_number=2, season_id='qa-only-recoil-s2')
    release['modules'][0]['release_checks'] = {key:True for key in document['policy']['release_requires']}
    additions = published_module_progression(baseline, {**MODULE_SPECS,d.id:spec},
        arena.ARENA_MINIMUM_RATING_BY_INDEX, document=document)
    MODULE_SPECS[d.id] = spec
    arena.MODULES.update(additions)
    catalog.BASIC_MODULE_DEFINITIONS[d.id] = d
    battle_pool.PLAYER_SELECTABLE_MODULE_IDS = (*battle_pool.PLAYER_SELECTABLE_MODULE_IDS,d.id)
    catalog_view.MODULE_COPY_EN[d.id] = ('Recoil Cannon','One heavy direct shot costs self HP; at least 1 HP remains.')
    public = next(m for m in catalog_view.build_module_catalog_view()['modules'] if m['id']==d.id)
    meta.MODULE_RARITY[d.id] = 'rare'
    meta.MODULE_CATALOG_VIEW[d.id] = public
    meta.MODULE_EFFECT_LINES[d.id] = public['effect_lines']

    def authorize(request):
        if request.client.host not in {'127.0.0.1','::1'} or request.headers.get('x-gridshard-e2e') != 'recoil-local-only':
            raise HTTPException(status_code=403)

    @gateway.app.get('/__e2e/recoil/catalog')
    async def compiled_catalog(request: Request):
        authorize(request)
        return {**spec,'unlock_arena':3,'unlock_trophies':600}

    @gateway.app.post('/__e2e/recoil/{player_id}/prepare')
    async def prepare(player_id: str, request: Request):
        authorize(request)
        profile = gateway.player_profile_service.get_or_create(player_id)
        profile.rating = profile.highest_rating = 600
        profile.preferred_battle_pool_ids = ('recoil_cannon','laser','shield','armor','repair','amplifier')
        profile.module_upgrade_levels['recoil_cannon'] = 0
        profile.module_talents.pop('recoil_cannon',None)
        gateway.persist_player_data(player_id)
        return dict(fixture=True,production_changed=False,compiled_card=public)

    @gateway.app.post('/__e2e/recoil/{player_id}/scenario')
    async def scenario(player_id: str, request: Request):
        authorize(request)
        payload = await request.json()
        session = next((s for s in gateway.pvp_service._sessions.values() if player_id in s.slots and s.engine.state.status.value=='running'),None)
        if session is None:
            raise HTTPException(status_code=409,detail='No running QA match')
        engine = session.engine
        enemy = next(p for p in engine.state.players if p != player_id)
        session.ai_player_ids.clear()  # Controlled target; no incidental AI EMP or damage.
        for side in (player_id,enemy):
            for identity,module in list(engine.state.players[side].modules.items()):
                if module.definition.id=='core':
                    module.definition=replace(module.definition,max_hp=10000)
                    module.hp=10000
                elif side==enemy:
                    del engine.state.players[side].modules[identity]
        opponent = engine.state.players[enemy]
        opponent.battle_pool=BattlePool(('laser','pulse_cannon','shield','armor','repair','amplifier'))
        target=engine.grant_module(enemy,'qa-recoil-target','repair')
        target.definition=replace(target.definition,max_hp=10000,cooldown_ms=1000000)
        target.hp=10000
        target.status=ModuleStatus.ACTIVE
        used={m.position for m in opponent.modules.values() if m.status==ModuleStatus.ACTIVE}
        target.position=next(p for p in get_default_board().placeable_positions if p not in used)
        gun=next((m for m in engine.state.players[player_id].modules.values() if m.definition.id=='recoil_cannon' and m.status==ModuleStatus.ACTIVE),None)
        kind=payload.get('kind','normal')
        if gun and kind=='emp':
            gun.debuffs['emp_disabled']=TimedModuleEffect('emp_disabled','EMP',engine.state.elapsed_ms+5000,{})
        elif kind=='phase':
            target.definition=replace(catalog.get_module_definition('phase_armor'),max_hp=10000,
                runtime_parameters={'phase_ms':1000000})
        elif gun and kind=='low-hp':
            gun.hp=5
        return dict(fixture=True,kind=kind,elapsed_ms=engine.state.elapsed_ms,
                    gun_hp=gun.hp if gun else None,target_id=target.instance_id)

    # These owned QA routes must precede the static-file catch-all.
    for _ in range(3):
        route=gateway.app.router.routes.pop()
        gateway.app.router.routes.insert(0,route)
