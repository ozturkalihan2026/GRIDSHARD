"""Explicit first-season scope; the checked-in draft never activates live play."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path

from .competition_control import configured_start
from .cosmetic_releases import fingerprint, REGISTRY
from .module_roster import MODULE_SPECS

PATH = Path(__file__).resolve().parents[1] / 'data/first_season_launch_v1.json'
PROFILE = json.loads(PATH.read_text(encoding='utf-8'))


def validate_profile(document, *, cosmetics=None):
    cosmetics = cosmetics or REGISTRY
    if (document.get('schema_version') != 1 or document.get('season_number') != 1
            or document.get('status') not in {'draft', 'published'}
            or document.get('road_additional_store_chests') is not False
            or len(document.get('existing_module_ids', [])) != 24
            or len(set(document.get('existing_module_ids', []))) != 24
            or not set(document.get('existing_module_ids', [])) <= set(MODULE_SPECS)):
        raise ValueError('İlk sezon profili mevcut kadro ve sabit ödül sözleşmesiyle eşleşmiyor.')
    start = datetime.fromisoformat(document['starts_at'].replace('Z', '+00:00'))
    if start.tzinfo is None or start.utcoffset().total_seconds() != 0 or start.weekday() != 0:
        raise ValueError('İlk sezon başlangıcı UTC Pazartesi olmalıdır.')
    if document.get('season_id') != 'gridshard_' + start.strftime('%Y_%m_%d'):
        raise ValueError('İlk sezon kimliği başlangıç tarihiyle eşleşmiyor.')
    if document.get('bot_competition_policy') != dict(
            scope='first_season_only', population=240, teams=12,
            reward_positions='actual_rank', bot_rewards=False,
            all_bot_prizes='append_frozen_package_to_plan_tail'):
        raise ValueError('İlk sezon bot katılımı ve ödül erteleme sözleşmesi eksik.')
    year, week, _ = (start + timedelta(days=21)).isocalendar()
    expected = [
        dict(source='season_road', period_id=document['season_id'], slot=40,
             cosmetics=dict(avatar_frame_id='aurora_frame', profile_background_id='aurora_banner')),
        dict(source='season_leaderboard', period_id=document['season_id'], slot=1,
             cosmetics=dict(avatar_frame_id='solar_frame', profile_background_id='solar_banner')),
        dict(source='weekly_tournament', period_id=f'{year}-W{week:02d}', slot=1,
             cosmetics=dict(avatar_frame_id='abyss_frame', profile_background_id='abyss_banner')),
        dict(source='team_tournament', period_id=start.date().isoformat(), slot=1,
             cosmetics=dict(team_emblem_id='aurora_sigil', team_frame_id='aurora_team_frame', team_name_color_id='aurora_team_name')),
    ]
    if document.get('cosmetic_allocations') != expected:
        raise ValueError('İlk sezonun üç oyuncu seti tekil kaynak/dönem/konuma ayrılmalıdır.')
    weeks = document.get('resource_weeks', [])
    if len(weeks) != 3:
        raise ValueError('İlk sezon üç açık kaynak ödülü haftası gerektirir.')
    for index, (week, module_id) in enumerate(zip(weeks, ('laser', 'shield', 'pulse_cannon'))):
        year, number, _ = (start + timedelta(days=index * 7)).isocalendar()
        expected_prizes = [dict(position=p, circuit_credits=c, flux_shards=f, module_definition_id=module_id, module_shards=s)
                           for p,c,f,s in ((1,1200,90,36), (2,760,55,24), (3,420,30,18))]
        if week != dict(period_id=f'{year}-W{number:02d}', prizes=expected_prizes):
            raise ValueError('İlk sezon kaynak haftaları 234 sıradan parça bütçesiyle eşleşmiyor.')
    if document['status'] == 'published':
        content = {key: value for key, value in document.items() if key != 'content_hash'}
        if document.get('content_hash') != fingerprint(content):
            raise ValueError('İlk sezon profili yayınlandıktan sonra değiştirilmiş.')
        if not all(document.get('release_checks', {}).get(k) is True for k in
                   ('reward_budget', 'unique_cosmetics', 'rollover_restore', 'old_clients', 'android_acceptance')):
            raise ValueError('İlk sezon yayın kabulü eksik.')
        for allocation in document['cosmetic_allocations']:
            release = cosmetics.releases.get((allocation['source'], allocation['period_id']))
            if not release or release['status'] != 'published' or not any(
                    p['slot'] == allocation['slot'] and p['cosmetics'] == allocation['cosmetics']
                    for p in release['placements']):
                raise ValueError('İlk sezonun tekil kozmetik tahsisi yayınlanmamış.')
        for week in weeks:
            release = cosmetics.releases.get(('weekly_tournament', week['period_id']))
            placements = [dict(slot=p['position'], cosmetics={}, resources={k:v for k,v in p.items() if k != 'position'})
                          for p in week['prizes']]
            if (not release or release['status'] != 'published' or release.get('reward_kind') != 'resource_only'
                    or release['placements'] != placements):
                raise ValueError('İlk sezon kaynak ödülü haftaları açık türle yayınlanmamış.')
    return deepcopy(document)


def fixed_road_for(season_id):
    if PROFILE.get('status') != 'published' or PROFILE.get('season_id') != season_id:
        return False
    document = validate_profile(PROFILE)
    start = configured_start()
    expected = datetime.fromisoformat(document['starts_at'].replace('Z', '+00:00')).astimezone(timezone.utc)
    if start != expected:
        raise ValueError('İlk sezon profili operatör başlangıcıyla eşleşmiyor.')
    return True


def content_ready(moment, start):
    """After the explicit S1 exception, incomplete follow-up content stays closed."""
    if PROFILE.get('status') != 'published':
        return True
    document = validate_profile(PROFILE)
    expected = datetime.fromisoformat(document['starts_at'].replace('Z', '+00:00'))
    if start != expected:
        raise ValueError('İlk sezon profili operatör başlangıcıyla eşleşmiyor.')
    number = max(1, (moment - start).days // 28 + 1)
    if number == 1:
        return True
    from .season_module_releases import MANIFEST, validate_season_release
    identity = 'gridshard_' + (start + timedelta(days=(number - 1) * 28)).strftime('%Y_%m_%d')
    releases = MANIFEST.get('roadmap', [])
    release = next((r for r in releases if r.get('season_number') == number and r.get('season_id') == identity), None)
    if not release or release.get('status') != 'published':
        return False
    existing = set(document['existing_module_ids'])
    for earlier in releases:
        if isinstance(earlier.get('season_number'), int) and earlier['season_number'] < number:
            existing.update(m['id'] for m in earlier.get('modules', []))
    try:
        ids = validate_season_release(release, existing_ids=existing)
    except ValueError:
        return False
    if not set(ids) <= set(MODULE_SPECS):
        return False  # A manifest cannot implement a new playable module.
    return all(REGISTRY.releases.get((source, identity), {}).get('status') == 'published'
               for source in ('season_road', 'season_leaderboard'))


validate_profile(PROFILE)
