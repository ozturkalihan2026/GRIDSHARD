"""Season content gate; planned concepts never silently enter live rewards."""
import json
from pathlib import Path
from .module_roster import MODULE_SPECS, COMBAT_CLASSES

MANIFEST=json.loads((Path(__file__).resolve().parent.parent/'data/season_module_releases_v2.json').read_text(encoding='utf-8'))

FREE_ACQUISITION = {
    'kind': 'arena_peak',
    'starting_level': 1,
    'permanent': True,
    'circuit_credits_cost': 0,
    'flux_cost': 0,
}


def validate_free_acquisition(module):
    """The base card is earned by peak arena, never a purchase or timed loan."""
    rule = module.get('acquisition')
    if not isinstance(rule, dict) or set(rule) != set(FREE_ACQUISITION):
        raise ValueError('Yeni modül için açık ve kalıcı ücretsiz arena edinimi gerekli.')
    if any(type(rule[key]) is not type(value) or rule[key] != value
           for key, value in FREE_ACQUISITION.items()):
        raise ValueError('Yeni modül seviye1 ve bedelsiz kalıcı arena edinimiyle açılmalı.')
    return dict(rule)


def validate_season_release(release, *, existing_ids=None, launch_profile=None):
    existing=set(MODULE_SPECS if existing_ids is None else existing_ids)
    modules=release.get('modules', [])
    if launch_profile is not None:
        from .first_season_profile import validate_profile
        profile = validate_profile(launch_profile)
        if (profile['status'] == 'published' and release.get('season_number') == 1
                and release.get('season_id') == profile['season_id'] and not modules):
            return ()  # Explicit first launch only; S2+ still requires a ready new module.
    if len(modules)<MANIFEST['policy']['minimum_new_modules_per_season']:
        raise ValueError('Her sezon en az bir yeni modül gerektirir.')
    ids=[m['id'] for m in modules]
    if len(set(ids))!=len(ids) or existing.intersection(ids):
        raise ValueError('Yeni modül kimliği tekrar kullanılamaz.')
    for m in modules:
        if m.get('category') not in COMBAT_CLASSES:
            raise ValueError('Yeni modül üç sınıftan birinde olmalı.')
        if not 1<=int(m.get('arena_unlock',0))<=12:
            raise ValueError('Yeni modülün arena açılışı tanımlanmalı.')
        checks=m.get('release_checks',{})
        if not all(checks.get(key) is True for key in MANIFEST['policy']['release_requires']):
            raise ValueError('Mekanik, görsel, karşı oyun, denge ve ücretsiz kazanım tamamlanmadan yayınlanamaz.')
        validate_free_acquisition(m)
    return tuple(ids)


def published_module_progression(base_ids, runtime_specs, arena_floors, *, document=None):
    """Build cumulative arena metadata only for admitted, implemented releases.

    Called at startup by arena_canon. No date opens a planned concept; later
    seasons do not remove a previously published card. The runtime roster and
    separately accepted release must both contain it before ownership exists.
    """
    document = MANIFEST if document is None else document
    policy = document['policy']
    if (policy.get('catalog_is_cumulative') is not True
            or policy.get('season_end_removes_cards') is not False
            or policy.get('paid_exclusive_power') is not False):
        raise ValueError('Sezon modülleri kalıcı ve ücretsiz katalogda korunmalı.')
    admitted = {}
    baseline = set(base_ids)
    if not baseline <= set(runtime_specs):
        raise ValueError('Kalıcı başlangıç kataloğundaki modüller kaldırılamaz.')
    existing = set(baseline)
    periods, numbers = set(), set()
    for release in document.get('roadmap', []):
        if release.get('status') != 'published':
            continue
        period = release.get('season_id')
        number = release.get('season_number')
        if (not isinstance(period, str) or not period.strip() or period in periods
                or type(number) is not int or number < 2 or number in numbers):
            raise ValueError('Yeni modül yayını benzersiz sezon kimliği ve numarası gerektirir.')
        ids = validate_season_release(release, existing_ids=existing)
        for item in release['modules']:
            identity = item['id']
            spec = runtime_specs.get(identity)
            if spec is None or spec.get('id') != identity or spec.get('category') != item['category']:
                raise ValueError('Yayımlanmış yeni modülün uyumlu motor kataloğu eksik.')
            arena = int(item['arena_unlock'])
            if arena not in arena_floors:
                raise ValueError('Yeni modülün ücretsiz arena eşiği bulunamadı.')
            floor = int(arena_floors[arena])
            admitted[identity] = {
                **{key: spec[key] for key in ('id', 'name_tr', 'category', 'rarity', 'current_cost', 'max_hp', 'base_damage', 'cooldown_ms')},
                'unlock_arena': arena,
                'unlock_trophies': floor,
                'road_reward_trophies': floor,
                'source_release': period,
                'acquisition': {**validate_free_acquisition(item), 'peak_trophies': floor},
            }
        existing.update(ids)
        periods.add(period)
        numbers.add(number)
    if set(runtime_specs) - baseline - set(admitted):
        raise ValueError('Yeni motor modülü tamamlanmış bir sezon yayını olmadan açılamaz.')
    return admitted
