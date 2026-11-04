"""Versioned, server-counted extra daily and season missions; XP only."""
from copy import deepcopy
from hashlib import sha256

REVISION = 1
ELIGIBLE_MODES = frozenset({'arena_ai', 'ranked_pvp'})
DAILY = (
    dict(id='daily_battles_4', name_tr='Devreye Devam', name_en='Keep the Circuit Going',
         description_tr='4 Arena savaşı tamamla.', description_en='Complete 4 Arena battles.', target=4, season_xp_reward=15),
    dict(id='daily_battles_6', name_tr='Sonraki Hamle', name_en='The Next Move',
         description_tr='6 Arena savaşı tamamla.', description_en='Complete 6 Arena battles.', target=6, season_xp_reward=15),
)
_GROUPS = (
    ('battles', 'completed_battles', 'Arena Savaşları', 'Arena Battles', 'Arena savaşı tamamla', 'Arena battles completed', ((20,150),(40,200),(80,250),(120,300))),
    ('wins', 'wins', 'Zafer Sinyali', 'Victory Signal', 'Arena savaşı kazan', 'Arena victories', ((10,100),(25,150),(40,200))),
    ('days', 'active_days', 'Devrede Kal', 'Stay in the Circuit', 'farklı UTC gününde Arena savaşı tamamla', 'different UTC days with an Arena battle', ((7,100),(14,100),(21,100))),
    ('core', 'core_uses', 'Çekirdek Ustalığı', 'Core Mastery', 'kez çekirdek gücü kullan', 'accepted core power uses', ((20,50),(50,100))),
)
SEASONAL = tuple(dict(id=f'season_{group}_{target}', metric=metric, name_tr=name_tr, name_en=name_en,
    description_tr=f'{target} {text_tr}.', description_en=f'{target} {text_en}.',
    target=target, season_xp_reward=xp)
    for group,metric,name_tr,name_en,text_tr,text_en,steps in _GROUPS for target,xp in steps)


class MissionError(ValueError):
    pass


def _state(profile):
    state = profile.season_mission_state
    if state.get('season_id') != profile.active_meta_season_id:
        state = dict(season_id=profile.active_meta_season_id, revision=REVISION,
                     progress={}, daily={}, active_days=[], seen_battles=[], rewards={})
        profile.season_mission_state = state
    if state.get('revision') != REVISION:
        raise MissionError('Emir sürümü doğrulanamadı; ilerlemen korunuyor.')
    return state


def record(profile, *, battle_id):
    """Called only from a finished battle, never from a client counter."""
    state = _state(profile)
    key = sha256(str(battle_id).encode()).hexdigest()
    if key in state['seen_battles']:
        return False
    state['seen_battles'].append(key)
    return True


def progress_battle(profile, *, match_type, moment, won, core_uses, eligible=True):
    if not eligible or match_type not in ELIGIBLE_MODES:
        return
    state = _state(profile)
    day = moment.date().isoformat()
    daily = state['daily'].setdefault(day, {'battles': 0})
    daily['battles'] = min(6, daily['battles'] + 1)
    if day not in state['active_days']:
        state['active_days'].append(day)
    counters = state['progress']
    counters['completed_battles'] = min(120, counters.get('completed_battles', 0) + 1)
    counters['wins'] = min(40, counters.get('wins', 0) + int(bool(won)))
    counters['core_uses'] = min(50, counters.get('core_uses', 0) + max(0, int(core_uses)))
    counters['active_days'] = min(21, len(state['active_days']))


def _rows(profile, *, day):
    state = profile.season_mission_state
    if state.get('season_id') != profile.active_meta_season_id:
        state = {}
    rewards = state.get('rewards', {})
    daily = state.get('daily', {}).get(day, {})
    def row(mission, scope, progress):
        key = f'{scope}:{day if scope == "daily" else ""}:{mission["id"]}'
        return dict(**mission, scope=scope, day_key=day if scope == 'daily' else '',
                    season_id=profile.active_meta_season_id, mission_protocol='season-v1', flux_shard_reward=0,
                    progress=min(mission['target'], progress), completed=progress >= mission['target'], claimed=key in rewards)
    return ([row(m,'daily',daily.get('battles',0)) for m in DAILY],
            [row(m,'seasonal',state.get('progress',{}).get(m['metric'],0)) for m in SEASONAL])


def view(profile, *, moment, active):
    daily, seasonal = _rows(profile, day=moment.date().isoformat())
    for row in daily + seasonal:
        row['claimable'] = active and row['completed'] and not row['claimed']
    return dict(extra_daily_missions=daily, seasonal_missions=seasonal, season_mission_revision=REVISION)


def _award(profile, row, *, automatic=False):
    from .player_profile import SEASON_REWARD_TRACK
    state = _state(profile)
    key = f'{row["scope"]}:{row["day_key"]}:{row["id"]}'
    if key in state['rewards']:
        return deepcopy(state['rewards'][key])
    before = sum(profile.season_xp >= t['required_xp'] for t in SEASON_REWARD_TRACK)
    profile.season_xp += row['season_xp_reward']
    after = sum(profile.season_xp >= t['required_xp'] for t in SEASON_REWARD_TRACK)
    profile.core_skill_points += max(0, after - before)
    receipt = dict(kind='season-missions', mission_id=row['id'], scope=row['scope'],
                   season_id=profile.active_meta_season_id, day_key=row['day_key'],
                   season_xp_reward=row['season_xp_reward'], revision=REVISION, automatic=automatic)
    state['rewards'][key] = receipt
    return deepcopy(receipt)


def claim(profile, *, mission_id, season_id, day_key, request_id, moment):
    if not request_id or not request_id.strip():
        raise MissionError('Talep kimliği zorunludur.')
    if season_id != profile.active_meta_season_id:
        raise MissionError('Bu emir başka bir sezona ait; ekranı yenile.')
    daily, seasonal = _rows(profile, day=moment.date().isoformat())
    row = next((r for r in daily + seasonal if r['id'] == mission_id), None)
    if not row or row['day_key'] != day_key:
        raise MissionError('Emir dönemi değişti; ekranı yenile.')
    previous = profile.engagement_claim_receipts.get(request_id)
    if previous:
        if any(previous.get(k) != v for k,v in dict(kind='season-missions', mission_id=mission_id,
                 season_id=season_id, day_key=day_key).items()):
            raise MissionError('Talep kimliği farklı bir ödüle ait.')
        return deepcopy(previous)
    if not row['completed']:
        raise MissionError('Emir henüz tamamlanmadı.')
    receipt = _award(profile, row)
    profile.engagement_claim_receipts[request_id] = deepcopy(receipt)
    return receipt


def settle_earned(profile, *, before_day=None, closing=False):
    """Earned XP is never discarded by a UTC day/season rollover."""
    state = profile.season_mission_state
    if not state or state.get('season_id') != profile.active_meta_season_id:
        return
    for day in list(state.get('daily', {})):
        if closing or (before_day and day < before_day):
            daily, _ = _rows(profile, day=day)
            for row in daily:
                if row['completed']:
                    _award(profile, row, automatic=True)
    if closing:
        _, seasonal = _rows(profile, day='')
        for row in seasonal:
            if row['completed']:
                _award(profile, row, automatic=True)
