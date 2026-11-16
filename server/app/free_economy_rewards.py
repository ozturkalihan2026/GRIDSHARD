"""Versioned currency components inside the existing player economic UOW.

Only server progression creates rights. Private snapshots and receipts travel
with the durable profile, while HTTP/battle ledgers own transaction and replay.
An explicit UTC cutover and a separately approved season are required.
"""
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path

from . import version
from .competition_control import competition_eligible
from .reward_definitions import catalog, snapshot_contents, seal, fingerprint, _version
from . import reward_entitlements as rights

POLICY_PATH = Path(__file__).resolve().parents[1]/'data/free_economy_rewards_v1.json'
POLICY = json.loads(POLICY_PATH.read_text(encoding='utf-8'))


def cutover():
    if _version(version.VERSION) < _version(POLICY['minimum_server_version']): return None
    raw = os.environ.get('GRIDSHARD_FREE_ECONOMY_FROM','').strip()
    if not raw: return None
    when = datetime.fromisoformat(rights.utc(raw).replace('Z','+00:00'))
    earliest = datetime.fromisoformat(POLICY['earliest_effective_at'].replace('Z','+00:00'))
    if when < earliest or any((when.hour,when.minute,when.second,when.microsecond)):
        raise ValueError('GRIDSHARD_FREE_ECONOMY_FROM must be a UTC midnight after S1.')
    return when


def enabled(moment):
    start = cutover()
    return start is not None and moment.astimezone(timezone.utc) >= start


def approved_season(season_id):
    start = cutover()
    if start is None: return False
    from .first_season_profile import PROFILE
    if season_id == PROFILE['season_id']: return False
    if season_id not in POLICY['approved_seasons']: return False
    season_start = datetime.strptime(season_id,'gridshard_%Y_%m_%d').replace(tzinfo=timezone.utc)
    return season_start >= start


def pin_season(profile,period,*,moment):
    if not enabled(moment): return
    pins = _state(profile).setdefault('season_revisions',{})
    if profile.active_meta_season_id not in pins:
        historical = (profile.login_period_id==period or bool(profile.season_xp)
            or bool(profile.season_reward_state.get('earned')) or bool(profile.season_mission_state.get('progress')))
        approved = approved_season(profile.active_meta_season_id) and not historical
        if approved:
            from .player_profile import LOGIN_PERIOD_REWARDS,SEASON_REWARD_TRACK
            from .season_missions import DAILY,SEASONAL
            names = ([f'free250.login.{r["day"]}.currency' for r in LOGIN_PERIOD_REWARDS]
                + [f'free250.season_road.{r["tier"]}.currency' for r in SEASON_REWARD_TRACK]
                + [f'free250.daily_extra_orders.{r["id"]}' for r in DAILY]
                + [f'free250.seasonal_orders.{r["id"]}' for r in SEASONAL])
            definitions = {name:catalog().freeze(name,revision=1) for name in names}
            _state(profile).setdefault('season_definitions',{})[profile.active_meta_season_id] = definitions
        pins[profile.active_meta_season_id] = int(approved)


def season_enabled(profile):
    # A published period is immutable even if the rollout/catalog later closes.
    return profile.free_economy_state.get('season_revisions',{}).get(profile.active_meta_season_id)==1


def _season_snapshot(profile,source,node):
    name = f'free250.{source}.{node}'
    snapshot = profile.free_economy_state.get('season_definitions',{}).get(profile.active_meta_season_id,{}).get(name)
    if snapshot is None: raise ValueError('Dönemin sabit ekonomi tanımı bulunamadı; hakların korunuyor.')
    snapshot_contents(snapshot,expected_id=name,expected_kind='fixed')
    return deepcopy(snapshot)


def _state(profile):
    state = profile.free_economy_state
    if not isinstance(state,dict): raise ValueError('Ekonomi hak kaydı doğrulanamadı.')
    if not state:
        state = dict(revision=1, entries={}, match_days={}, matches={})
        profile.free_economy_state = state
    if (type(state.get('revision')) is not int or state['revision'] != 1
            or any(not isinstance(state.get(k),dict) for k in ('entries','match_days','matches'))):
        raise ValueError('Ekonomi hak sürümü doğrulanamadı; hakların korunuyor.')
    return state


def _key(profile, source, period, node):
    return rights.entitlement_key(profile.player_id,source,str(period),str(node))


def _entry(profile, source, period, node):
    state = profile.free_economy_state
    if not state: return None
    entry = _state(profile)['entries'].get(_key(profile,source,period,node))
    if entry:
        snapshot_contents(entry['snapshot'],expected_id=f'free250.{source}.{node}',expected_kind='fixed')
        if entry.get('record'):
            record = rights.validate(entry['record'],player_id=profile.player_id)
            if (record['entitlement_id'] != _key(profile,source,period,node)
                    or record['definition_snapshot'] != entry['snapshot']):
                raise ValueError('Ekonomi hak bağlamı doğrulanamadı.')
            if (type(entry.get('xp')) is not int or entry['xp'] < 0
                    or entry.get('xp_hash')!=fingerprint(dict(entitlement_hash=record['content_hash'],xp=entry['xp']))):
                raise ValueError('Emir XP kaydı doğrulanamadı.')
            if entry.get('receipt'): rights.validate_receipt(record,entry['receipt'])
    return entry


def freeze(profile, source, period, node, *, earned_at=None, xp=0):
    entry = _entry(profile,source,period,node)
    if entry is None:
        snapshot = (_season_snapshot(profile,source,node) if source!='daily_orders' and season_enabled(profile)
                    else catalog().freeze(f'free250.{source}.{node}',revision=1))
        entry = dict(snapshot=snapshot)
        _state(profile)['entries'][_key(profile,source,period,node)] = entry
    if earned_at is not None and not entry.get('record'):
        entry['record'] = rights.create(player_id=profile.player_id,source=source,period_id=str(period),node_id=str(node),
            definition_snapshot=entry['snapshot'],earned_at=earned_at)
        entry['xp'] = int(xp)
        entry['xp_hash'] = fingerprint(dict(entitlement_hash=entry['record']['content_hash'],xp=entry['xp']))
    return entry


def facts(snapshot):
    return dict(economy_definition_id=snapshot['id'],economy_revision=snapshot['revision'],
                economy_content_hash=snapshot['content_hash'])


def preview(profile, source, period, node):
    entry = _entry(profile,source,period,node)
    if entry: return dict(snapshot_contents(entry['snapshot']),**facts(entry['snapshot']))
    if source in {'login','season_road'} and season_enabled(profile):
        snapshot = _season_snapshot(profile,source,node)
        return dict(snapshot_contents(snapshot),**facts(snapshot))
    if source in {'daily_extra_orders','seasonal_orders'} and season_enabled(profile):
        snapshot = _season_snapshot(profile,source,node)
        return dict(snapshot_contents(snapshot),**facts(snapshot))
    return None


def currency_reward(profile, source, period, identity, base, *, earned_at=None):
    # The closed login calendar deliberately has no period. It can display
    # locked rows, but must never mint or look up an empty-context right.
    if not period: return deepcopy(base)
    node = f'{identity}.currency'
    if earned_at is not None and season_enabled(profile):
        freeze(profile,source,period,node,earned_at=earned_at)
    value = preview(profile,source,period,node)
    return dict(base,**value) if value else deepcopy(base)


def grant(profile, source, period, node, *, moment):
    entry = _entry(profile,source,period,node)
    if entry is None or not entry.get('record'): raise ValueError('Kazanılmış ekonomi hakkı bulunamadı.')
    receipt = entry.get('receipt')
    if receipt is None:
        receipt = rights.receipt(entry['record'],option_id=None,delivered_at=moment)
        value = receipt['rewards']
        profile.circuit_credits += value.get('circuit_credits',0)
        profile.flux_shards += value.get('flux_shards',0)
        profile.season_xp += entry.get('xp',0)
        entry['receipt'] = receipt
    return dict(deepcopy(receipt['rewards']),**facts(entry['snapshot']),
                economy_receipt_hash=receipt['receipt_hash'],season_xp_reward=entry.get('xp',0))


def complete_currency(profile,source,period,node,*,moment):
    entry = _entry(profile,source,period,node)
    if not entry: return {}
    if not entry.get('receipt'):
        entry['receipt'] = rights.receipt(entry['record'],option_id=None,delivered_at=moment)
    return dict(economy_receipt_hash=entry['receipt']['receipt_hash'])


def start_daily(profile, day, *, moment, mission_ids):
    if enabled(moment) and competition_eligible(profile.player_id):
        for node in mission_ids: freeze(profile,'daily_orders',day,node)


def daily_row(profile, mission):
    value = preview(profile,'daily_orders',profile.daily_mission_day,mission['id'])
    return dict(mission,flux_shard_reward=value['flux_shards'],circuit_credit_reward=value['circuit_credits'],
                **{k:v for k,v in value.items() if k.startswith('economy_')}) if value else dict(mission)


def mark_daily(profile, *, moment, active, missions):
    for mission in missions:
        if (mission['id'] not in profile.claimed_daily_missions
                and profile.daily_mission_progress.get(mission['id'],0) >= mission['target']
                and _entry(profile,'daily_orders',profile.daily_mission_day,mission['id'])):
            freeze(profile,'daily_orders',profile.daily_mission_day,mission['id'],earned_at=moment,
                   xp=mission['season_xp_reward'] if active else 0)


def claim_daily(profile, mission, *, moment, active):
    entry = _entry(profile,'daily_orders',profile.daily_mission_day,mission['id'])
    if not entry: return None
    mark_daily(profile,moment=moment,active=active,missions=[mission])
    value = grant(profile,'daily_orders',profile.daily_mission_day,mission['id'],moment=moment)
    profile.claimed_daily_missions = tuple(sorted({*profile.claimed_daily_missions,mission['id']}))
    return value


def settle_daily(profile, *, moment, active, missions):
    # Only new, actually completed rights are settled. Old unversioned days
    # retain their historical behavior and are never retroactively repriced.
    for mission in missions:
        entry = _entry(profile,'daily_orders',profile.daily_mission_day,mission['id'])
        if entry and entry.get('record') and not entry.get('receipt'):
            claim_daily(profile,mission,moment=moment,active=active)


def mission_snapshot(profile, row, *, moment=None):
    source = 'daily_extra_orders' if row['scope']=='daily' else 'seasonal_orders'
    period = row['day_key'] if row['scope']=='daily' else profile.active_meta_season_id
    if moment is not None and season_enabled(profile):
        freeze(profile,source,period,row['id'],earned_at=moment)
    return preview(profile,source,period,row['id'])


def grant_mission(profile,row,*,moment):
    source = 'daily_extra_orders' if row['scope']=='daily' else 'seasonal_orders'
    period = row['day_key'] if row['scope']=='daily' else profile.active_meta_season_id
    value = preview(profile,source,period,row['id'])
    if not value: return {}
    result = grant(profile,source,period,row['id'],moment=moment)
    result.pop('season_xp_reward',None)
    return result


def match_currency(profile,state,*,moment,base_credits,premium=False):
    from .store_catalog import BATTLE_PREMIUM_BONUS_PERCENT
    legacy = round(base_credits*(100+BATTLE_PREMIUM_BONUS_PERCENT)/100) if premium else base_credits
    if (not enabled(moment) or not competition_eligible(profile.player_id)
            or state.match_type not in {'ranked_pvp','arena_ai'}
            or (state.account_player_ids and profile.player_id not in state.account_player_ids)
            or any(word in str(state.finish_reason) for word in ('forfeit','surrender','inactiv'))):
        return legacy,0,None
    key = sha256(state.battle_id.encode()).hexdigest()
    saved = _state(profile)
    if key in saved['matches']: raise ValueError('Tamamlanmış maç ekonomik defterden tekrar oynatılamaz.')
    match = POLICY['match_rewards']
    amount = round(base_credits*match['credit_multiplier_numerator']/match['credit_multiplier_denominator'])
    if premium: amount = round(amount*(100+BATTLE_PREMIUM_BONUS_PERCENT)/100)
    day = moment.astimezone(timezone.utc).date().isoformat()
    count = saved['match_days'].get(day,0)
    if type(count) is not int or not 0 <= count <= match['daily_flux_battle_cap']:
        raise ValueError('Günlük maç Akı sınırı doğrulanamadı.')
    flux = match['flux_per_completed_battle'] if count < match['daily_flux_battle_cap'] else 0
    snapshot = seal(identity=f'free250.match.currency.{amount}.{flux}',revision=1,kind='fixed',minimum_server_version='2.5.0',
        payload=dict(circuit_credits=amount,flux_shards=flux))
    record = rights.create(player_id=profile.player_id,source='matches',period_id=day,node_id=key,
        definition_snapshot=snapshot,earned_at=moment)
    receipt = rights.receipt(record,option_id=None,delivered_at=moment)
    saved['match_days'][day] = min(match['daily_flux_battle_cap'],count+1)
    saved['matches'][key] = dict(record=record,receipt=receipt)
    profile.flux_shards += flux
    return amount,flux,dict(**facts(snapshot),economy_receipt_hash=receipt['receipt_hash'],
        flux_daily_cap=match['daily_flux_battle_cap']*match['flux_per_completed_battle'],
        flux_battle_cap=match['daily_flux_battle_cap'],flux_battles_today=saved['match_days'][day])
