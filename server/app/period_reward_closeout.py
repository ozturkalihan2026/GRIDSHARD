"""Prepare closing on a copy; publish only with the caller's archive/UOW.

An inbox ID alone is not proof of transfer. Verify each frozen road package
and its historical extra chests before the old season counters can be reset.
Choice rights and competition closures have their own durable witnesses and
are deliberately neither selected nor reissued here.
"""
from copy import deepcopy
from hashlib import sha256

from .season_entitlements import SeasonEntitlementError, fingerprint, key


def _transferred_chest(profile, message_id):
    messages = [m for m in profile.reward_inbox if m.get('message_id') == message_id]
    if len(messages) != 1:
        raise SeasonEntitlementError('Sezon ödül aktarımı tekil olarak doğrulanamadı; hakkın korunuyor.')
    message = messages[0]
    chest = message.get('inventory_chest')
    if (message.get('status') not in {'unclaimed', 'claimed'}
            or message.get('category') != 'reward' or not isinstance(chest, dict)
            or message.get('source') != chest.get('source')
            or message.get('chest', {}).get('definition_id') != chest.get('definition_id')):
        raise SeasonEntitlementError('Sezon ödül aktarım kaydı uyuşmuyor; hakkın korunuyor.')
    return chest


def _verify_transfers(profile, queued):
    from .reward_delivery import TIER_DEFINITIONS
    from .reward_definitions import chest_contents, RewardDefinitionError

    season = profile.active_meta_season_id
    for transfer in queued:
        tier, premium = transfer['tier'], transfer['premium']
        entry = profile.season_reward_state['earned'][key(tier, premium)]
        message_id = transfer['message_id']
        chest = _transferred_chest(profile, message_id)
        definition = TIER_DEFINITIONS.get(entry['reward'].get('chest_tier'), 'field_3h')
        expected = dict(
            chest_id='earned-' + sha256(message_id.encode()).hexdigest()[:32],
            definition_id=definition, source='season_road',
            fixed_reward=entry['reward'], fixed_reward_hash=fingerprint(entry['reward']),
            reward_revision=entry['revision'], reward_content_hash=entry['content_hash'],
            premium_origin=entry['premium_origin'],
        )
        if any(chest.get(k) != value for k, value in expected.items()):
            raise SeasonEntitlementError('Kazanılmış sezon ödülü ile aktarımı uyuşmuyor; hakkın korunuyor.')
        # Old APIs granted a fixed road package AND separately counted random
        # store crates. Do not multiply the fixed resources or drop that debt.
        for index in range(entry['additional_chest_count']):
            identity = (f'season-premium-tier:{profile.player_id}:{season}:{tier}:{index}' if premium
                        else f'season-tier:{profile.player_id}:{season}:{tier}')
            if identity in profile.chest_receipts:
                continue  # Historical instant opening already discharged it.
            extra = _transferred_chest(profile, identity)
            source = f'season-{"premium-" if premium else ""}tier:{season}:{tier}'
            if (extra.get('definition_id') != definition or extra.get('source') != source
                    or extra.get('premium_origin') != entry['premium_origin']
                    or extra.get('fixed_reward') is not None):
                raise SeasonEntitlementError('Eski sezon sandık aktarımı uyuşmuyor; hakkın korunuyor.')
            try:
                chest_contents(extra)  # Check its frozen revision, never a new roll.
            except RewardDefinitionError as exc:
                raise SeasonEntitlementError('Eski sezon sandık aktarımı doğrulanamadı; hakkın korunuyor.') from exc


def prepare_period_closeout(profile, *, closed_at):
    """Return (prepared_profile, queued_rights), leaving the input untouched.

    Only authoritative rollover calls this, after draining pending results and
    acquiring the account lock. The caller commits archive+profile together.
    No new delivery format, migration, balance budget or rollout is introduced.
    """
    from .free_economy_rewards import settle_daily
    from .player_profile import DAILY_MISSIONS
    from .season_missions import settle_earned
    from .season_entitlements import queue_unclaimed
    from .meta_progression import parse_utc

    prepared = deepcopy(profile)
    moment = parse_utc(closed_at)
    settle_daily(prepared, moment=moment, active=True, missions=DAILY_MISSIONS)
    settle_earned(prepared, closing=True, moment=moment)
    # Missions may complete another road tier. Freeze/transfer after settlement.
    queued = queue_unclaimed(prepared, now_iso=closed_at)
    _verify_transfers(prepared, queued)
    return prepared, queued
