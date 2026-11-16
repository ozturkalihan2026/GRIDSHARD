"""Owned loopback browser acceptance only; production never imports this file."""
from copy import deepcopy
from datetime import datetime,timezone
import os


def install():
    if (os.environ.get('GRIDSHARD_E2E_FREE_ECONOMY')!='1'
            or os.environ.get('GRIDSHARD_RUNTIME_MODE')!='development'):
        raise RuntimeError('Free economy fixture requires the isolated E2E runner')
    from app import version,free_economy_rewards as economy,first_season_profile,player_profile
    from app import main as gateway
    now=datetime(2026,12,28,12,tzinfo=timezone.utc)
    version.VERSION='2.5.0'
    os.environ['GRIDSHARD_FREE_ECONOMY_FROM']='2026-12-22T00:00:00Z'
    os.environ['GRIDSHARD_SEASON_STARTS_AT']='2026-12-28T00:00:00Z'
    os.environ['GRIDSHARD_SEASON_AUTO_CYCLES']='1'
    economy.POLICY=deepcopy(economy.POLICY)
    economy.POLICY['approved_seasons']=['gridshard_2026_12_28']
    first_season_profile.content_ready=lambda *args:True
    original_launch,original_season=player_profile.launch_status,player_profile.season_descriptor
    player_profile.launch_status=lambda moment=None:original_launch(moment or now)
    player_profile.season_descriptor=lambda moment=None:original_season(moment or now)
    from app.game.models import BattleState,BattleStatus
    from app.game.engine import BattleEngine
    from fastapi import HTTPException,Request
    gateway.player_profile_service._now_func=lambda:now
    gateway.meta_progression_service._now_func=lambda:now

    @gateway.app.post('/__e2e/free-economy/{player_id}/prepare')
    async def prepare(player_id:str,request:Request):
        if request.client.host not in {'127.0.0.1','::1'} or request.headers.get('x-gridshard-e2e')!='free-economy-local-only':
            raise HTTPException(status_code=403)
        profile=gateway.player_profile_service.get_or_create(player_id)
        if profile.free_economy_state.get('matches'):raise HTTPException(status_code=409)
        results=[]
        for index in range(20):
            state=BattleState(battle_id=f'eco-browser-{player_id}-{index}',match_type='arena_ai',account_player_ids=(player_id,))
            engine=BattleEngine(state)
            for owner in (player_id,'bot_a-browser'):engine.add_player(owner)
            state.status=BattleStatus.FINISHED;state.winner_player_id=player_id;state.loser_player_id='bot_a-browser'
            state.finish_reason='core_destroyed';state.finished_at_ms=120000
            state.result_summary={player_id:dict(damage_dealt=5000,core_power_uses=2)}
            gateway.player_progression_service.process_finished_battle(state,completed_at=now)
            results.append(gateway.player_progression_service._results_by_battle_id[state.battle_id][player_id].to_dict())
        profile.season_xp=12240
        gateway.player_profile_service.get_or_create(player_id)
        gateway.persist_player_data(player_id)
        return dict(first_result=results[0],capped_result=results[-1],profile=profile.to_view(),fixture=True,production_changed=False)
    route=gateway.app.router.routes.pop()
    gateway.app.router.routes.insert(0,route)

    @gateway.app.post('/__e2e/free-economy/{player_id}/engineer')
    async def engineer(player_id:str,request:Request):
        if request.client.host not in {'127.0.0.1','::1'} or request.headers.get('x-gridshard-e2e')!='free-economy-local-only':
            raise HTTPException(status_code=403)
        from datetime import timedelta
        from app import reward_choices
        profile=gateway.player_profile_service.get_or_create(player_id)
        if profile.reward_choice_state:raise HTTPException(status_code=409)
        profile.rating=600;profile.highest_rating=600
        for period,moment,count in [('old',now-timedelta(days=5),12),('current',now,12)]:
            for index in range(count):
                state=BattleState(battle_id=f'engineer-browser-{player_id}-{period}-{index}',match_type='arena_ai',account_player_ids=(player_id,))
                engine=BattleEngine(state)
                for owner in (player_id,'bot_a-browser'):engine.add_player(owner)
                state.status=BattleStatus.FINISHED;state.winner_player_id=player_id
                state.finish_reason='core_destroyed'
                reward_choices.record_battle(profile,state,moment=moment,secret=gateway.participant_auth_service.signing_key)
        gateway.persist_player_data(player_id)
        return dict(choices=reward_choices.view(profile,moment=now),profile=profile.to_view(),fixture=True,production_changed=False)
    route=gateway.app.router.routes.pop()
    gateway.app.router.routes.insert(0,route)
