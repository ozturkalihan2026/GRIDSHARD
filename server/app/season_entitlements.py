"""Freeze earned road rights before a claim or season reset can change them.

Private snapshots include actual fragment targets and premium provenance. A
rollover queues fixed contents, never rerolls a reward from a newer template.
Historical nested store chests remain separate, explicitly counted rights.
"""
from copy import deepcopy
from hashlib import sha256
import json

REVISION = 1


class SeasonEntitlementError(ValueError):
    pass


def fingerprint(value):
    return sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def _checked(entry):
    contents = {key: value for key, value in entry.items() if key != 'content_hash'}
    if entry.get('content_hash') != fingerprint(contents):
        raise SeasonEntitlementError('Sezon ödül kaydı doğrulanamadı; kazanılmış hakkın korunuyor.')
    return entry


def key(tier, premium=False):
    return f'{"premium" if premium else "free"}:{int(tier)}'


def earned(profile, tier, premium=False):
    state = profile.season_reward_state
    if state.get('season_id') != profile.active_meta_season_id:
        return None
    entry = state.get('earned', {}).get(key(tier, premium))
    return deepcopy(_checked(entry)) if entry else None


def freeze_earned(profile):
    from .player_profile import SEASON_REWARD_TRACK, SEASON_PREMIUM_REWARD_TRACK, _profile_reward_identity
    from .player_profile import period_reward
    from .reward_delivery import premium_origin
    from .first_season_profile import fixed_road_for

    if profile.active_meta_season_id == 'gridshard_waiting':
        return
    state = deepcopy(profile.season_reward_state)
    if state and state.get('season_id') != profile.active_meta_season_id:
        raise SeasonEntitlementError('Önceki sezon ödül kaydı kapatılmadan yeni kayıt açılamaz.')
    if not state:
        state = dict(season_id=profile.active_meta_season_id, revision=REVISION, earned={})
    if state.get('revision') != REVISION:
        raise SeasonEntitlementError('Sezon ödül sürümü doğrulanamadı; kazanılmış hakkın korunuyor.')
    for entry in state['earned'].values():
        _checked(entry)
    # Paid rows are frozen only while the entitlement is active. Previously
    # frozen/refunded rows remain private and cannot be opened until restored.
    paid = profile.season_premium_pass_season_id == profile.active_meta_season_id
    fixed = fixed_road_for(profile.active_meta_season_id)
    for premium, track in ((False, SEASON_REWARD_TRACK), (True, SEASON_PREMIUM_REWARD_TRACK)):
        if premium and not paid:
            continue
        claimed = profile.claimed_premium_season_tiers if premium else profile.claimed_season_tiers
        for base in track:
            tier = int(base['tier'])
            identity = key(tier, premium)
            if base['required_xp'] > profile.season_xp or identity in state['earned']:
                continue
            if tier in claimed:
                continue  # Do not invent a new right for an old completed claim.
            source = deepcopy(base) if premium else period_reward('season_road', profile.active_meta_season_id, tier, base)
            reward = _profile_reward_identity(profile, source,
                f'{"season-premium" if premium else "season"}:{profile.active_meta_season_id}:{profile.player_id}:{tier}')
            count = 0 if fixed or not reward.get('chest_tier') else int(reward.get('chest_count', 0) if premium else 1)
            entry = dict(tier=tier, premium=premium, reward=reward, additional_chest_count=count,
                         premium_origin=premium_origin(profile) if premium else None, revision=REVISION)
            entry['content_hash'] = fingerprint(entry)
            state['earned'][identity] = entry
    profile.season_reward_state = state


def reward_for(profile, tier, premium=False):
    freeze_earned(profile)
    entry = earned(profile, tier, premium)
    if not entry:
        raise SeasonEntitlementError('Bu sezon kademesinin kazanılmış ödül kaydı bulunamadı.')
    return dict(deepcopy(entry['reward']), reward_revision=entry['revision'],
                reward_content_hash=entry['content_hash'], additional_chest_count=entry['additional_chest_count'])


def additional_chest_count(profile, tier, premium=False):
    entry = earned(profile, tier, premium)
    if entry:
        return entry['additional_chest_count']
    # Replays of historical claims without a snapshot retain their old API
    # contract. New fixed-period claims always have an earned snapshot first.
    from .player_profile import SEASON_REWARD_TRACK, SEASON_PREMIUM_REWARD_TRACK
    from .first_season_profile import fixed_road_for
    track = SEASON_PREMIUM_REWARD_TRACK if premium else SEASON_REWARD_TRACK
    base = next((r for r in track if r['tier'] == tier), {})
    return 0 if fixed_road_for(profile.active_meta_season_id) or not base.get('chest_tier') else int(base.get('chest_count', 0) if premium else 1)


def origin_for(profile, tier, season_id):
    """A replay must never borrow the next season's purchase provenance."""
    states = [profile.season_reward_state, *(a.get('reward_state', {}) for a in profile.season_archives)]
    for state in states:
        if state.get('season_id') == season_id:
            entry = state.get('earned', {}).get(key(tier, True))
            if entry:
                return deepcopy(_checked(entry)['premium_origin'])
    root = profile.premium_reward_recovery.get(season_id)
    if not root:
        return None  # legacy entitlement
    from .premium_reward_recovery import POLICY_VERSION, PremiumRecoveryError
    if root.get('policy_version') != POLICY_VERSION or not root.get('purchases'):
        raise PremiumRecoveryError('Premium satın alma kaynak kaydı inceleme gerektiriyor.')
    purchase = profile.season_premium_purchase_key
    if purchase not in root['purchases']:
        purchase = sorted(root['purchases'])[0]
    return dict(season_id=season_id, purchase_key=purchase)


def queue_unclaimed(profile, *, now_iso):
    from .reward_delivery import queue_chest, TIER_DEFINITIONS
    from .meta_progression import MetaProgressionService

    freeze_earned(profile)
    queued = []
    season = profile.active_meta_season_id
    meta = MetaProgressionService()
    for identity, raw in profile.season_reward_state.get('earned', {}).items():
        entry = _checked(raw)
        tier, premium = entry['tier'], entry['premium']
        claimed = profile.claimed_premium_season_tiers if premium else profile.claimed_season_tiers
        if tier in claimed:
            continue
        reward = deepcopy(entry['reward'])
        message_id = f'season-road:{season}:{profile.player_id}:{identity}'
        definition = TIER_DEFINITIONS.get(reward.get('chest_tier'), 'field_3h')
        chest = dict(chest_id='earned-' + sha256(message_id.encode()).hexdigest()[:32],
            definition_id=definition, name_tr=f'Kademe {tier} {"Premium " if premium else ""}Ödülü',
            source='season_road', source_battle_id=None, awarded_at=now_iso, unlocks_at=now_iso,
            fixed_reward=reward, fixed_reward_hash=fingerprint(reward),
            reward_revision=entry['revision'], reward_content_hash=entry['content_hash'])
        if entry['premium_origin']:
            chest['premium_origin'] = deepcopy(entry['premium_origin'])
        queue_chest(profile, chest, message_id=message_id, title='Önceki sezonun kazanılmış ödülü')
        # Legacy random-store obligations are distinct from the fixed package.
        # Never multiply the fixed resources by these historical chest counts.
        for index in range(entry['additional_chest_count']):
            request_id = (f'season-premium-tier:{profile.player_id}:{season}:{tier}:{index}' if premium
                          else f'season-tier:{profile.player_id}:{season}:{tier}')
            if request_id not in profile.chest_receipts:
                meta.deliver_reward_chest(profile, definition,
                    f'season-{ "premium-" if premium else ""}tier:{season}:{tier}', request_id,
                    origin=entry['premium_origin'])
        queued.append(dict(tier=tier, premium=premium, message_id=message_id, content_hash=entry['content_hash']))
    return queued
