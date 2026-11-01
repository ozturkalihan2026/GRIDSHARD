"""Season content gate; planned concepts never silently enter live rewards."""
import json
from pathlib import Path
from .module_roster import MODULE_SPECS, COMBAT_CLASSES

MANIFEST=json.loads((Path(__file__).resolve().parent.parent/'data/season_module_releases_v2.json').read_text(encoding='utf-8'))


def validate_season_release(release, *, existing_ids=None):
    existing=set(MODULE_SPECS if existing_ids is None else existing_ids)
    modules=release.get('modules', [])
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
    return tuple(ids)
