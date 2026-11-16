"""Immutable reward definitions and self-contained earned snapshots.

No wallet mutations live here. A choice is not a random roll; selecting an
option only resolves its frozen contents. The caller owns entitlement/transaction
deduplication and validates the player's arena and fragment eligibility.
"""
from copy import deepcopy
from functools import lru_cache
from hashlib import sha256
import json
import math
from pathlib import Path
import re

CATALOG_PATH = Path(__file__).resolve().parents[1] / 'data/reward_definitions_v1.json'
AMOUNTS = frozenset({'circuit_credits', 'flux_shards', 'module_shards', 'core_shards', 'universal_module_shards'})
IDENTITIES = frozenset({'module_definition_id', 'core_type_id', 'avatar_id', 'avatar_frame_id',
    'profile_background_id', 'emoji_id', 'badge_id', 'rank_trophy_id'})
ID = re.compile(r'^[a-z][a-z0-9_.-]{0,127}$')


class RewardDefinitionError(ValueError):
    pass


def fingerprint(value):
    try:
        canonical = json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise RewardDefinitionError('Ödül tanımı doğrulanamadı; kazanılmış hakkın korunuyor.') from exc
    return sha256(canonical.encode('utf-8')).hexdigest()


def _version(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d+\.\d+\.\d+', value):
        raise RewardDefinitionError('Ödülün sürüm sınırı geçersiz.')
    return tuple(map(int, value.split('.')))


def validate_fixed(payload):
    if not isinstance(payload, dict) or not payload or set(payload) - AMOUNTS - IDENTITIES:
        raise RewardDefinitionError('Sabit ödül içeriği geçersiz.')
    for key, value in payload.items():
        if key in AMOUNTS and (type(value) is not int or value < 0):
            raise RewardDefinitionError('Ödül miktarı geçersiz.')
        if key in IDENTITIES and (not isinstance(value, str) or not ID.fullmatch(value)):
            raise RewardDefinitionError('Ödül hedefi geçersiz.')
    for amount, target in (('module_shards', 'module_definition_id'), ('core_shards', 'core_type_id')):
        if payload.get(amount, 0) and not payload.get(target):
            raise RewardDefinitionError('Ödül parçasının hedefi eksik.')
    return deepcopy(payload)


def _random(payload):
    if not isinstance(payload, dict) or not ID.fullmatch(str(payload.get('id', ''))):
        raise RewardDefinitionError('Rastgele sandık kimliği geçersiz.')
    def interval(values):
        return (isinstance(values, (list, tuple)) and len(values) == 2
            and all(type(v) is int and v >= 0 for v in values) and values[0] <= values[1])
    if any(not interval(payload.get(key)) for key in ('coins', 'flux', 'shards')):
        raise RewardDefinitionError('Sandık miktar aralığı geçersiz.')
    odds = payload.get('rarity_odds')
    allowed = payload.get('allowed_rarities')
    if (not isinstance(odds, dict) or not odds or set(odds) - {'common', 'rare', 'epic', 'legendary'}
            or not isinstance(allowed, list) or len(allowed) != len(set(allowed)) or set(allowed) != set(odds)
            or any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 1 for v in odds.values())
            or not math.isclose(sum(odds.values()), 1, abs_tol=1e-9)):
        raise RewardDefinitionError('Sandık olasılıkları geçersiz.')
    for key in ('module_drop_chance', 'core_drop_chance'):
        value = payload.get(key)
        if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 1:
            raise RewardDefinitionError('Sandık düşüş olasılığı geçersiz.')
    if type(payload.get('core_drop_shards')) is not int or payload['core_drop_shards'] < 1:
        raise RewardDefinitionError('Çekirdek parçası miktarı geçersiz.')
    if (not isinstance(payload.get('shards_by_rarity'), dict)
            or set(odds) - payload['shards_by_rarity'].keys()
            or any(not interval(v) for v in payload['shards_by_rarity'].values())):
        raise RewardDefinitionError('Sandık parça aralığı geçersiz.')
    expected = dict(circuit_credits=1.0, flux_shards=1.0,
        module_shards=payload['module_drop_chance'], core_shards=payload['core_drop_chance'])
    disclosed = payload.get('reward_odds', {})
    rarity_disclosed = payload.get('module_rarity_drop_odds', {})
    if (set(disclosed) != set(expected) or set(rarity_disclosed) != set(odds)
            or any(type(disclosed[k]) not in (int, float) or not math.isclose(disclosed[k], v, abs_tol=1e-9)
                   for k,v in expected.items())
            or any(type(rarity_disclosed[k]) not in (int, float)
                   or not math.isclose(rarity_disclosed[k], v*payload['module_drop_chance'], abs_tol=1e-4)
                   for k,v in odds.items())):
        raise RewardDefinitionError('Sandık açıklaması ve gerçek olasılık aynı olmalı.')


def checked(definition):
    if not isinstance(definition, dict):
        raise RewardDefinitionError('Ödül kaydı geçersiz.')
    required = {'id', 'revision', 'kind', 'minimum_server_version', 'payload', 'content_hash'}
    if set(definition) != required or not isinstance(definition['id'], str) or not ID.fullmatch(definition['id']):
        raise RewardDefinitionError('Ödül tanımının kimliği geçersiz.')
    if type(definition['revision']) is not int or definition['revision'] < 1:
        raise RewardDefinitionError('Ödül revision geçersiz.')
    _version(definition['minimum_server_version'])
    body = {k: v for k, v in definition.items() if k != 'content_hash'}
    if definition['content_hash'] != fingerprint(body):
        raise RewardDefinitionError('Ödül içeriği doğrulanamadı; kazanılmış hakkın korunuyor.')
    kind, payload = definition['kind'], definition['payload']
    if kind == 'fixed':
        validate_fixed(payload)
    elif kind == 'choice':
        if (not isinstance(payload, dict) or set(payload) != {'options'}
                or not isinstance(payload['options'], list) or len(payload['options']) != 3):
            raise RewardDefinitionError('Seçim kasasında üç sabit seçenek gerekir.')
        seen = set()
        for option in payload['options']:
            if (not isinstance(option, dict) or set(option) != {'option_id', 'contents'}
                    or not isinstance(option['option_id'], str) or not ID.fullmatch(option['option_id'])
                    or option['option_id'] in seen):
                raise RewardDefinitionError('Seçim kimliği geçersiz veya yinelenmiş.')
            seen.add(option['option_id'])
            validate_fixed(option['contents'])
    elif kind == 'random':
        _random(payload)
    else:
        raise RewardDefinitionError('Ödül türü fixed/choice/random olmalı.')
    return deepcopy(definition)


def seal(*, identity, revision, kind, payload, minimum_server_version='0.0.0'):
    # JSON roundtrip makes tuples/ranges canonical before hashing or persisting.
    body = json.loads(json.dumps(dict(id=identity, revision=revision, kind=kind,
        minimum_server_version=minimum_server_version, payload=payload), ensure_ascii=False, allow_nan=False))
    return checked(dict(body, content_hash=fingerprint(body)))


class RewardCatalog:
    def __init__(self, document):
        if not isinstance(document, dict) or document.get('schema_version') != 1 or not isinstance(document.get('definitions'), list):
            raise RewardDefinitionError('Ödül kataloğu geçersiz.')
        self._definitions = {}
        for definition in document['definitions']:
            value = checked(definition)
            key = value['id'], value['revision']
            if key in self._definitions:
                raise RewardDefinitionError('Ödül kimliği/revision yinelenemez.')
            self._definitions[key] = value

    def freeze(self, identity, *, revision=None, server_version=None):
        if server_version is None:
            from .version import VERSION
            server_version = VERSION
        current = _version(server_version)
        candidates = [row for (name, number), row in self._definitions.items()
            if name == identity and (revision is None or number == revision)
            and _version(row['minimum_server_version']) <= current]
        if not candidates:
            raise RewardDefinitionError('Ödül tanımı bu sürümde kullanılamıyor.')
        return deepcopy(max(candidates, key=lambda row: row['revision']))


@lru_cache(maxsize=1)
def catalog():
    return RewardCatalog(json.loads(CATALOG_PATH.read_text(encoding='utf-8')))


def snapshot_contents(snapshot, *, expected_id=None, expected_kind=None, option_id=None):
    row = checked(snapshot)
    if ((expected_id is not None and row['id'] != expected_id)
            or (expected_kind is not None and row['kind'] != expected_kind)):
        raise RewardDefinitionError('Ödül kaydı bu hakka ait değil.')
    if row['kind'] == 'choice':
        option = next((x for x in row['payload']['options'] if x['option_id'] == option_id), None)
        if option is None:
            raise RewardDefinitionError('Bu seçim kazanılmış hakkın içinde değil.')
        return deepcopy(option['contents'])
    if option_id is not None:
        raise RewardDefinitionError('Bu ödül bir seçim kasası değil.')
    return deepcopy(row['payload'])


def freeze_chest(chest):
    if chest.get('fixed_reward') is None:
        if chest.get('reward_definition_snapshot') is not None:
            chest_contents(chest)  # Moving a frozen right must never rebind it.
        else:
            chest['reward_definition_snapshot'] = catalog().freeze('legacy.chest.' + chest['definition_id'])
    return chest


def chest_contents(chest):
    identity = 'legacy.chest.' + str(chest['definition_id'])
    snapshot = chest.get('reward_definition_snapshot')
    if snapshot is None:
        # Unversioned installed stock always retains the reviewed legacy table.
        snapshot = catalog().freeze(identity, revision=1, server_version='0.0.0')
    payload = snapshot_contents(snapshot, expected_id=identity, expected_kind='random')
    if payload['id'] != chest['definition_id']:
        raise RewardDefinitionError('Sandık ödül hedefi doğrulanamadı.')
    return payload, {key: snapshot[key] for key in ('id', 'revision', 'content_hash')}
