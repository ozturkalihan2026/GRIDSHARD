"""Engineer crate: authoritative weekly progress and immutable three-way rights.

PostgreSQL owns earned rights in production. The profile holds weekly progress;
the JSON development adapter uses the same immutable record/receipt contract.
No client counter, seed, amount or catalog selection is accepted.
"""
from copy import deepcopy
from datetime import datetime,timedelta,timezone
from hashlib import sha256
import hmac
import re

from . import free_economy_rewards as economy, reward_entitlements as rights
from .reward_definitions import seal,fingerprint,checked
from .arena_canon import unlocked_reward_module_ids
from .module_roster import MODULE_SPECS
from .competition_control import competition_eligible
from .game.models import BattleStatus
from .catalog_migration import award_module_shards

SOURCE='engineer_weekly'
NODE='engineer_crate'
OPTIONS=(('attack','saldırı','Saldırı','Attack'),('defense','savunma','Savunma','Defense'),('tactical','taktik','Taktik','Tactical'))


class RewardChoiceError(ValueError): pass


def week(moment):
    current=datetime.fromisoformat(rights.utc(moment).replace('Z','+00:00'))
    year,number,_=current.isocalendar()
    start=datetime.fromisocalendar(year,number,1).replace(tzinfo=timezone.utc)
    return dict(period_id=f'{year}-W{number:02d}',starts_at=rights.utc(start),ends_at=rights.utc(start+timedelta(days=7)))


def _state(profile):
    state=profile.reward_choice_state
    if not isinstance(state,dict):raise RewardChoiceError('Seçim kasası kaydı doğrulanamadı; hakkın korunuyor.')
    if not state:
        state=dict(revision=1,weeks={},seen_battles={},rights={},requests={})
        profile.reward_choice_state=state
    if (type(state.get('revision')) is not int or state['revision']!=1
            or any(not isinstance(state.get(k),dict) for k in ('weeks','seen_battles','rights','requests'))):
        raise RewardChoiceError('Seçim kasası sürümü doğrulanamadı; hakkın korunuyor.')
    return state


def rule():
    value=deepcopy(economy.POLICY['engineer_choice'])
    _check_rule(value)
    return value


def _check_rule(value):
    if (not isinstance(value,dict) or type(value.get('revision')) is not int or value['revision']!=1
            or type(value.get('completed_qualified_battles_per_utc_week')) is not int
            or value['completed_qualified_battles_per_utc_week']<1
            or type(value.get('rights_per_utc_week')) is not int or value['rights_per_utc_week']!=1
            or value.get('options')!=[x[1] for x in OPTIONS]
            or value.get('target_selection')!='server_hash_of_player_week_and_class_from_eligible_pool_frozen_at_earn'
            or set(value.get('pieces_by_rarity',{}))!={'common','rare','epic','legendary'}
            or any(type(v) is not int or v<1 for v in value['pieces_by_rarity'].values())):
        raise RewardChoiceError('Mühendis Kasası kazanım kuralı geçersiz.')


def _check_week(value):
    _check_rule(value['rule'])
    if (value.get('rule_hash')!=fingerprint(value['rule']) or type(value.get('progress')) is not int
            or not 0<=value['progress']<=value['rule']['completed_qualified_battles_per_utc_week']):
        raise RewardChoiceError('Haftalık kasa ilerlemesi doğrulanamadı; hakkın korunuyor.')
    return value


def _qualified(profile,state):
    accounts=state.account_player_ids or tuple(state.players)
    return (state.status==BattleStatus.FINISHED and profile.player_id in accounts and profile.player_id in state.players
        and state.match_type in {'ranked_pvp','arena_ai'} and competition_eligible(profile.player_id)
        and not any(word in str(state.finish_reason) for word in ('forfeit','surrender','inactiv')))


def _definition(profile,period,config,secret):
    if not isinstance(secret,bytes) or len(secret)<32:raise RewardChoiceError('Sunucu seçim anahtarı yapılandırılmalı.')
    pool=unlocked_reward_module_ids(profile.rating,profile.highest_rating,(),profile.legacy_module_unlocks)
    options=[]
    for option_id,category,_,_ in OPTIONS:
        eligible=sorted(k for k in pool if k in MODULE_SPECS and MODULE_SPECS[k]['category']==category)
        if not eligible:raise RewardChoiceError('Seçim kasasının üç uygun parça havuzu hazır değil.')
        context=f'gridshard:engineer-choice:v1:{profile.player_id}:{period}:{option_id}'
        ticket=int.from_bytes(hmac.new(secret,context.encode(),sha256).digest(),'big')
        target=eligible[ticket%len(eligible)]
        amount=config['pieces_by_rarity'][MODULE_SPECS[target]['rarity']]
        options.append(dict(option_id=option_id,contents=dict(module_definition_id=target,module_shards=amount)))
    payload=dict(options=options)
    return seal(identity='free250.engineer.choice.'+fingerprint(payload),revision=1,kind='choice',
        minimum_server_version='2.5.0',payload=payload)


def _validate(profile,item):
    record=rights.validate(item['record'],player_id=profile.player_id)
    if record['source']!=SOURCE or record['node_id']!=NODE or record['definition_snapshot']['kind']!='choice':
        raise RewardChoiceError('Bu hak Mühendis Kasası seçimine ait değil.')
    definition=checked(record['definition_snapshot'])
    if definition['id']!='free250.engineer.choice.'+fingerprint(definition['payload']):
        raise RewardChoiceError('Seçim kasasının tanım kimliği doğrulanamadı.')
    if [o['option_id'] for o in definition['payload']['options']]!=[o[0] for o in OPTIONS]:
        raise RewardChoiceError('Seçim kasasının seçenekleri doğrulanamadı.')
    for option in definition['payload']['options']:
        body=option['contents']
        if set(body)!={'module_definition_id','module_shards'} or body['module_shards']<1:
            raise RewardChoiceError('Seçim kasasının sabit parça paketi geçersiz.')
    if item.get('receipt'):rights.validate_receipt(record,item['receipt'])
    return item


def record_battle(profile,state,*,moment,secret,repository=None):
    if not economy.enabled(moment) or not _qualified(profile,state):return None
    current=week(moment);period=current['period_id'];saved=_state(profile)
    battle=sha256(state.battle_id.encode()).hexdigest()
    if battle in saved['seen_battles']:return None
    previous=saved['weeks'].get(period)
    if previous:
        info=_check_week(previous)
    else:
        config=rule()
        info=dict(**current,rule=config,rule_hash=fingerprint(config),progress=0,entitlement_id=None)
    if info['entitlement_id']:
        saved['seen_battles'][battle]=period
        return None
    progress=info['progress']+1
    if progress==info['rule']['completed_qualified_battles_per_utc_week']:
        # Freeze before mutating progress, so an invalid pool cannot consume
        # the twelfth match in the development adapter either.
        definition=_definition(profile,period,info['rule'],secret)
        if repository is not None:
            item=repository.earn(player_id=profile.player_id,source=SOURCE,period_id=period,node_id=NODE,
                definition_snapshot=definition,earned_at=moment)
            _validate(profile,item)
        else:
            record=rights.create(player_id=profile.player_id,source=SOURCE,period_id=period,node_id=NODE,
                definition_snapshot=definition,earned_at=moment)
            item=dict(record=record,receipt=None)
            saved['rights'].setdefault(record['entitlement_id'],item)
            item=_validate(profile,saved['rights'][record['entitlement_id']])
        info['entitlement_id']=item['record']['entitlement_id']
    info['progress']=progress
    saved['weeks'][period]=info
    saved['seen_battles'][battle]=period
    return info['entitlement_id']


def get(profile,entitlement_id,*,repository=None):
    if not isinstance(entitlement_id,str) or not re.fullmatch('[0-9a-f]{64}',entitlement_id):
        raise RewardChoiceError('Kasa hakkı kimliği geçersiz.')
    item=(repository.get(profile.player_id,entitlement_id) if repository is not None
          else profile.reward_choice_state.get('rights',{}).get(entitlement_id))
    return deepcopy(_validate(profile,item)) if item else None


def public(item):
    record=item['record'];receipt=item.get('receipt');options=[]
    for value in record['definition_snapshot']['payload']['options']:
        option_id=value['option_id'];category,tr,en=next(x[1:] for x in OPTIONS if x[0]==option_id)
        target=value['contents']['module_definition_id'];spec=MODULE_SPECS.get(target,{})
        options.append(dict(option_id=option_id,category=category,name_tr=tr,name_en=en,
            **deepcopy(value['contents']),module_name_tr=spec.get('name_tr',target),module_name_en=spec.get('name_en',target)))
    return dict(entitlement_id=record['entitlement_id'],period_id=record['period_id'],earned_at=record['earned_at'],
        definition_id=record['definition_snapshot']['id'],revision=record['definition_snapshot']['revision'],
        content_hash=record['definition_snapshot']['content_hash'],options=options,
        status='claimed' if receipt else 'pending',selected_option_id=receipt['option_id'] if receipt else None)


def view(profile,*,moment,limit=20,after=None,repository=None):
    if type(limit) is not int or not 1<=limit<=100:raise RewardChoiceError('Kasa liste sınırı geçersiz.')
    if after is not None and (not isinstance(after,str) or not re.fullmatch('[0-9a-f]{64}',after)):raise RewardChoiceError('Kasa sayfa anahtarı geçersiz.')
    saved=_state(profile) if profile.reward_choice_state else {}
    current=week(moment);info=saved.get('weeks',{}).get(current['period_id'])
    if info:_check_week(info)
    config=info['rule'] if info else rule()
    if repository is not None:
        records=repository.pending(profile.player_id,limit=limit,after=after,source=SOURCE)
        items=[dict(record=record,receipt=None) for record in records]
    else:
        entries=[_validate(profile,x) for _,x in sorted(saved.get('rights',{}).items())]
        items=[x for x in entries if not x.get('receipt') and (after is None or x['record']['entitlement_id']>after)][:limit]
    return dict(protocol='engineer-choice-v1',earning_enabled=economy.enabled(moment) and competition_eligible(profile.player_id),
        week=dict(**current,progress=info['progress'] if info else 0,target=config['completed_qualified_battles_per_utc_week'],
            earned=bool(info and info['entitlement_id']),entitlement_id=info['entitlement_id'] if info else None),
        pending=[public(_validate(profile,x)) for x in items],
        next_cursor=items[-1]['record']['entitlement_id'] if len(items)==limit else None)


def claim(profile,entitlement_id,option_id,*,request_id,moment,repository=None,persist=None):
    if option_id not in {o[0] for o in OPTIONS}:raise RewardChoiceError('Bu kasa seçeneği geçersiz.')
    if not isinstance(request_id,str) or not request_id.strip() or len(request_id)>160:raise RewardChoiceError('Geçerli talep kimliği zorunlu.')
    item=get(profile,entitlement_id,repository=repository)
    if not item:raise RewardChoiceError('Bu hesaba ait seçim hakkı bulunamadı.')
    def grant(contents):
        # Eligibility was frozen at earning. A later rating/season change must
        # never reroll or revoke an earned target. Existing retirement policy
        # handles historical pieces consistently with every other fixed reward.
        award_module_shards(profile,contents['module_definition_id'],contents['module_shards'])
        if persist is not None:persist()
    if repository is not None:
        if persist is None:raise RewardChoiceError('Kalıcı cüzdan aynı işlemde kaydedilmeli.')
        return repository.deliver(profile.player_id,entitlement_id,request_id=request_id,option_id=option_id,
                                  delivered_at=moment,grant=grant)
    saved=_state(profile);key=sha256(request_id.strip().encode()).hexdigest()
    binding=dict(entitlement_id=entitlement_id,option_id=option_id)
    if key in saved['requests'] and saved['requests'][key]!=binding:raise RewardChoiceError('Talep kimliği farklı bir seçime ait.')
    if item.get('receipt'):
        if item['receipt']['option_id']!=option_id:raise RewardChoiceError('Bu kasa başka bir seçimle teslim edilmiş.')
        saved['requests'][key]=binding
        return deepcopy(item['receipt'])
    receipt=rights.receipt(item['record'],option_id=option_id,delivered_at=moment)
    grant(receipt['rewards'])
    saved['rights'][entitlement_id]['receipt']=deepcopy(receipt)
    saved['requests'][key]=binding
    return receipt
