from copy import deepcopy
from datetime import datetime,timedelta,timezone

import pytest

from app import reward_choices as choices,free_economy_rewards as economy,version
from app.player_profile import PlayerProfile,PlayerProfileService
from app.player_data_store import PlayerDataStoreService,JsonFilePlayerDataRepository
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.main import RewardChoiceClaimRequest
from test_free_economy_rewards import clock  # noqa: F401
from test_player_progression import finished_state

SECRET=b'synthetic-engineer-test-key-32-bytes-long'


def profile(owner='a',rating=600):return PlayerProfile(player_id=owner,display_name=owner,rating=rating,highest_rating=rating)


def battle(p,identity,moment,*,secret=SECRET,mode='arena_ai',reason='core_destroyed',won=True):
    state=finished_state(battle_id=identity,winner='a' if won else 'b')
    if p.player_id!='a':
        state.players[p.player_id]=state.players.pop('a')
        state.players[p.player_id].player_id=p.player_id
    state.match_type=mode;state.finish_reason=reason;state.account_player_ids=(p.player_id,)
    return choices.record_battle(p,state,moment=moment,secret=secret)


def earn(p,moment,prefix='match',*,secret=SECRET):
    result=None
    for i in range(12):result=battle(p,f'{prefix}-{i}',moment,secret=secret)
    return result


def test_twelfth_match_freezes_three_eligible_class_targets_with_no_currency_or_xp(clock):
    p=profile();before=(p.circuit_credits,p.flux_shards,p.season_xp)
    for i in range(11):assert battle(p,str(i),clock[0],won=False) is None
    assert choices.view(p,moment=clock[0])['week']['progress']==11
    identity=battle(p,'12',clock[0],won=False)
    view=choices.view(p,moment=clock[0]);assert len(view['pending'])==1
    assert [o['option_id'] for o in view['pending'][0]['options']]==['attack','defense','tactical']
    pool=set(choices.unlocked_reward_module_ids(600,600))
    for row in view['pending'][0]['options']:
        spec=choices.MODULE_SPECS[row['module_definition_id']]
        assert row['module_definition_id'] in pool and spec['category']==row['category']
        assert row['module_shards']==choices.rule()['pieces_by_rarity'][spec['rarity']]
    assert before==(p.circuit_credits,p.flux_shards,p.season_xp)
    assert identity==view['pending'][0]['entitlement_id']
    assert identity==view['week']['entitlement_id']


def test_only_one_weekly_right_and_old_battle_never_counts_in_a_new_week(clock):
    p=profile();identity=earn(p,clock[0])
    for i in range(20):battle(p,f'additional-{i}',clock[0])
    assert len(p.reward_choice_state['rights'])==1
    assert choices.view(p,moment=clock[0])['week']['progress']==12
    next_week=clock[0]+timedelta(days=7)
    assert battle(p,'match-0',next_week) is None
    assert choices.view(p,moment=next_week)['week']['progress']==0
    assert choices.view(p,moment=next_week)['pending'][0]['entitlement_id']==identity


def test_partial_weeks_reset_on_iso_monday_and_do_not_backfill(clock):
    p=profile();sunday=datetime(2027,1,3,23,59,tzinfo=timezone.utc)
    for i in range(6):battle(p,f'sunday-{i}',sunday)
    monday=sunday+timedelta(minutes=1)
    for i in range(6):battle(p,f'monday-{i}',monday)
    value=choices.view(p,moment=monday)
    assert value['week']['period_id']=='2027-W01' and value['week']['progress']==6
    assert not value['pending']
    assert choices.week(datetime(2027,1,1,tzinfo=timezone.utc))['period_id']=='2026-W53'


@pytest.mark.parametrize('mode,reason,owner',[
    ('friend_battle','core_destroyed','a'),('unranked_ai','core_destroyed','a'),
    ('team_tournament','core_destroyed','a'),('arena_ai','player_forfeit','a'),
    ('arena_ai','player_inactive','a'),('ranked_pvp','mutual_inactivity','a'),
    ('arena_ai','core_destroyed','bot_a1')])
def test_excluded_battles_never_progress(clock,mode,reason,owner):
    p=profile(owner)
    assert battle(p,'excluded',clock[0],mode=mode,reason=reason) is None
    assert not p.reward_choice_state


def test_owner_and_old_runtime_are_excluded_and_no_login_counts(clock,monkeypatch):
    p=profile();monkeypatch.setenv('GRIDSHARD_OWNER_PLAYER_ID','a')
    assert earn(p,clock[0]) is None and not p.reward_choice_state
    monkeypatch.delenv('GRIDSHARD_OWNER_PLAYER_ID');monkeypatch.setattr(version,'VERSION','2.4.0')
    assert earn(p,clock[0]) is None and not p.reward_choice_state


def test_earned_options_survive_pool_secret_catalog_and_rollout_changes(clock,monkeypatch):
    p=profile();identity=earn(p,clock[0]);original=choices.get(p,identity)
    p.rating=p.highest_rating=0
    monkeypatch.delenv('GRIDSHARD_FREE_ECONOMY_FROM')
    monkeypatch.setattr(choices,'_definition',lambda *a:(_ for _ in ()).throw(AssertionError('no reroll')))
    assert choices.get(p,identity)==original
    selected=original['record']['definition_snapshot']['payload']['options'][0]
    before=p.module_shards.get(selected['contents']['module_definition_id'],0)
    receipt=choices.claim(p,identity,selected['option_id'],request_id='choose',moment=clock[0]+timedelta(days=40))
    assert receipt['rewards']==selected['contents']
    assert p.module_shards[selected['contents']['module_definition_id']]-before==selected['contents']['module_shards']


def test_one_selection_replays_same_receipt_and_rejects_another_option_or_request_binding(clock):
    p=profile();identity=earn(p,clock[0]);before=deepcopy(p.module_shards)
    receipt=choices.claim(p,identity,'attack',request_id='first',moment=clock[0])
    saved=deepcopy(p.module_shards)
    assert choices.claim(p,identity,'attack',request_id='new-request',moment=clock[0])==receipt
    assert choices.claim(p,identity,'attack',request_id='first',moment=clock[0])==receipt
    assert p.module_shards==saved
    changed={k:v-before.get(k,0) for k,v in saved.items() if v!=before.get(k,0)}
    assert changed=={receipt['rewards']['module_definition_id']:receipt['rewards']['module_shards']}
    with pytest.raises(ValueError):choices.claim(p,identity,'defense',request_id='first',moment=clock[0])
    with pytest.raises(ValueError):choices.claim(p,identity,'defense',request_id='other',moment=clock[0])
    other=earn(p,clock[0]+timedelta(days=7),'next-week')
    with pytest.raises(ValueError):choices.claim(p,other,'attack',request_id='new-request',moment=clock[0]+timedelta(days=7))


def test_foreign_owner_tampering_and_arbitrary_quantity_cannot_be_claimed(clock):
    p=profile();identity=earn(p,clock[0]);other=profile('foreign')
    other.reward_choice_state=deepcopy(p.reward_choice_state)
    with pytest.raises(ValueError):choices.get(other,identity)
    wallet=deepcopy(p.module_shards)
    p.reward_choice_state['rights'][identity]['record']['definition_snapshot']['payload']['options'][0]['contents']['module_shards']=9999
    with pytest.raises(ValueError):choices.claim(p,identity,'attack',request_id='tamper',moment=clock[0])
    assert p.module_shards==wallet
    from pydantic import ValidationError
    with pytest.raises(ValidationError):RewardChoiceClaimRequest(request_id='bad',option_id='attack',module_shards=999)


def test_pending_pagination_keeps_all_weeks_and_claimed_receipt_remains_addressable(clock):
    p=profile()
    identities=[earn(p,clock[0]+timedelta(days=7*w),str(w)) for w in range(5)]
    a=choices.view(p,moment=clock[0],limit=2)
    b=choices.view(p,moment=clock[0],limit=2,after=a['next_cursor'])
    c=choices.view(p,moment=clock[0],limit=2,after=b['next_cursor'])
    assert {r['entitlement_id'] for r in a['pending']+b['pending']+c['pending']}==set(identities)
    choices.claim(p,identities[0],'attack',request_id='claim',moment=clock[0]+timedelta(days=40))
    assert choices.get(p,identities[0])['receipt']
    assert len(choices.view(p,moment=clock[0],limit=100)['pending'])==4


def test_json_restart_and_empty_restore_keep_progress_rights_and_delivery(clock,tmp_path):
    def store(path):
        s=PlayerProfileService(now_func=lambda:clock[0])
        return s,PlayerDataStoreService(profile_service=s,statistics_service=PlayerStatisticsService(),
            settings_service=PlayerSettingsService(),repository=JsonFilePlayerDataRepository(path))
    path=tmp_path/'source.json';s,data=store(path);p=s.get_or_create('a')
    identity=earn(p,clock[0]);choices.claim(p,identity,'attack',request_id='saved',moment=clock[0]);data.save_player('a')
    target=tmp_path/'restored.json';target.write_bytes(path.read_bytes())
    restarted,loaded=store(target);loaded.load_player('a');copy=restarted.get_or_create('a')
    assert copy.reward_choice_state==p.reward_choice_state
    wallet=deepcopy(copy.module_shards)
    choices.claim(copy,identity,'attack',request_id='after-restore',moment=clock[0])
    assert copy.module_shards==wallet


def test_authenticated_http_choices_reject_foreign_owners_and_extra_payload_then_deliver(clock,tmp_path,monkeypatch):
    from fastapi.testclient import TestClient
    from app import main as gateway
    from app.auth import ParticipantAuthService,JsonIdentityRepository
    s=PlayerProfileService(now_func=lambda:clock[0])
    data=PlayerDataStoreService(profile_service=s,statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),repository=JsonFilePlayerDataRepository(tmp_path/'players.json'))
    auth=ParticipantAuthService(JsonIdentityRepository(tmp_path/'identities.json'),SECRET)
    owner='choice-user'
    token=auth.register_or_login(owner,'a'*40)['access_token']
    monkeypatch.setenv('GRIDSHARD_AUTH_REQUIRED','1')
    monkeypatch.setattr(gateway,'RUNTIME_STRICT',False)
    monkeypatch.setattr(gateway,'participant_auth_service',auth)
    monkeypatch.setattr(gateway,'player_profile_service',s)
    monkeypatch.setattr(gateway,'player_data_store_service',data)
    monkeypatch.setattr(gateway,'player_data_repository',data.repository)
    p=s.get_or_create(owner);identity=earn(p,clock[0]);data.save_player(owner)
    client=TestClient(gateway.app);headers={'authorization':'Bearer '+token}
    assert client.get(f'/profile/{owner}/reward-choices').status_code==401
    assert client.get('/profile/foreign/reward-choices',headers=headers).status_code==403
    listing=client.get(f'/profile/{owner}/reward-choices',headers=headers)
    assert listing.status_code==200 and len(listing.json()['pending'])==1
    uri=f'/profile/{owner}/reward-choices/{identity}/claim'
    assert client.post(uri,headers=headers,json=dict(request_id='bad',option_id='attack',module_shards=999)).status_code==422
    first=client.post(uri,headers=headers,json=dict(request_id='choose',option_id='attack'))
    assert first.status_code==200
    again=client.post(uri,headers=headers,json=dict(request_id='another',option_id='attack'))
    assert again.json()['reward_choice_receipt']==first.json()['reward_choice_receipt']
    assert client.get(f'/profile/{owner}/reward-choices/{identity}',headers=headers).json()['reward_choice']['status']=='claimed'
