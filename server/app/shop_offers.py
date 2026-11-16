"""Reviewed offer revisions and account/week-pinned previews; never charges.

Publishing is an offline catalog transition. HTTP ownership, atomic charging,
purchase counters and receipt replay belong to SHOP-02's transaction adapter.
"""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import hmac
import json
import os
from pathlib import Path
import re

from . import free_economy_rewards as economy, version
from .arena_canon import arena_index_for_rating, unlocked_reward_module_ids
from .competition_control import competition_eligible
from .module_roster import MODULE_SPECS
from .reward_definitions import fingerprint, seal, _version

CATALOG_PATH = Path(__file__).resolve().parents[1] / 'data/shop_offers_v1.json'
KEY = re.compile(r'^[a-z][a-z0-9_.-]{0,95}$')
HASH = re.compile(r'^[0-9a-f]{64}$')
AMOUNTS = dict(common=12, rare=6, epic=3, legendary=1)
LIMIT_KEY = 'weekly_module_parts'
SELECTION = 'player_utc_week_open_pool_v1'


class ShopOfferError(ValueError):
    def __init__(self, code, message):
        self.code = code
        super().__init__(message)


def _invalid(message='Teklif kataloğu doğrulanamadı.'):
    raise ShopOfferError('invalid_catalog', message)


def _moment(value):
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00')) if isinstance(value, str) else value
        if not isinstance(result, datetime) or result.tzinfo is None or result.utcoffset() != timedelta(0):
            raise ValueError()
        return result.astimezone(timezone.utc)
    except (TypeError, ValueError, AttributeError):
        _invalid('Teklif zamanı açık UTC olmalı.')


def _stamp(value):
    return _moment(value).isoformat(timespec='microseconds').replace('+00:00', 'Z')


def _text(value):
    return (isinstance(value, str) and bool(value.strip()) and value == value.strip()
            and len(value) <= 500 and not any(ord(c) < 32 or c in '<>' for c in value))


def client_root():
    return Path(os.environ.get('GRIDSHARD_CLIENT_DIR') or Path(__file__).resolve().parents[2] / 'client')


def _asset(value, root):
    if (not isinstance(value, dict) or set(value) != {'path', 'sha256'}
            or not isinstance(value['path'], str)
            or not re.fullmatch(r'assets/ui/[a-z0-9_/-]+\.webp', value['path'])
            or not isinstance(value['sha256'], str) or not HASH.fullmatch(value['sha256'])):
        _invalid('Ürün görsel kaydı geçersiz.')
    target = (root / value['path']).resolve()
    if not target.is_relative_to(root.resolve()) or not target.is_file():
        raise ShopOfferError('offer_preview_unavailable', 'Teklifin gerçek görseli bulunamadı.')
    if sha256(target.read_bytes()).hexdigest() != value['sha256']:
        raise ShopOfferError('offer_preview_unavailable', 'Teklif görseli incelenmiş kayıtla uyuşmuyor.')


def checked_offer(row, *, assets=None):
    if isinstance(row, dict) and row.get('kind') == 'cosmetic_set':
        from .shop_cosmetic_offers import checked
        return checked(row, assets=assets)
    required = {'id', 'revision', 'status', 'published_at', 'minimum_server_version',
                'starts_at', 'ends_at', 'minimum_arena', 'price', 'guarantee',
                'limit', 'title_tr', 'title_en', 'body_tr', 'body_en', 'art', 'targets', 'content_hash'}
    if not isinstance(row, dict) or set(row) != required:
        _invalid()
    if (not isinstance(row['id'], str) or not KEY.fullmatch(row['id'])
            or type(row['revision']) is not int or row['revision'] < 1
            or not isinstance(row['status'], str) or row['status'] not in {'draft', 'published'}):
        _invalid()
    if row['content_hash'] != fingerprint({k: v for k, v in row.items() if k != 'content_hash'}):
        _invalid('Teklif içerik hash kaydı uyuşmuyor.')
    try:
        if _version(row['minimum_server_version']) < (2, 5, 0):
            _invalid('Yeni teklifler en erken2.5.0 sürümünde kullanılabilir.')
    except ValueError:
        _invalid('Teklifin sürüm sınırı geçersiz.')
    start, end = _moment(row['starts_at']), _moment(row['ends_at'])
    if start >= end or start < _moment(economy.POLICY['earliest_effective_at']):
        _invalid('Teklif penceresi S1 sonrası ve sıralı olmalı.')
    if row['status'] == 'draft':
        if row['published_at'] is not None:
            _invalid('Taslak yayın tarihi taşıyamaz.')
    elif row['published_at'] is None or _moment(row['published_at']) > start:
        _invalid('Teklif başlamadan önce incelenip yayınlanmalı.')
    if type(row['minimum_arena']) is not int or not 1 <= row['minimum_arena'] <= 12:
        _invalid('Teklif arena sınırı geçersiz.')
    # This first adapter implements the ECON-01 reviewed shard offer only.
    # More products need an explicit adapter/budget, not another JSON kind.
    if (row['price'] != dict(currency='circuit_credits', amount=500)
            or type(row['price'].get('amount')) is not int
            or row['guarantee'] != dict(kind='module_shards', selection=SELECTION, pieces_by_rarity=AMOUNTS)
            or any(type(v) is not int for v in row['guarantee']['pieces_by_rarity'].values())
            or row['limit'] != dict(period='utc_week', count=2, key=LIMIT_KEY)
            or type(row['limit'].get('count')) is not int):
        _invalid('Teklif adaptörü incelenmiş fiyat/garanti/limit bütçesiyle eşleşmiyor.')
    if any(not _text(row[k]) for k in ('title_tr', 'title_en', 'body_tr', 'body_en')):
        _invalid('Ürünün TR/EN başlık ve açıklaması gerekli.')
    root = Path(assets) if assets is not None else client_root()
    _asset(row['art'], root)
    if not isinstance(row['targets'], list) or not row['targets']:
        _invalid('Garantili ürünün hedef önizlemeleri gerekli.')
    seen = set()
    for target in row['targets']:
        if (not isinstance(target, dict) or set(target) != {'module_definition_id', 'rarity', 'name_tr', 'name_en', 'art'}
                or not isinstance(target['module_definition_id'], str) or not KEY.fullmatch(target['module_definition_id'])
                or target['module_definition_id'] in seen or not isinstance(target['rarity'], str) or target['rarity'] not in AMOUNTS
                or not _text(target['name_tr']) or not _text(target['name_en'])):
            _invalid('Hedef ürünün kimlik/enderlik/TR-EN önizlemesi eksik.')
        seen.add(target['module_definition_id'])
        _asset(target['art'], root)
    return deepcopy(row)


def seal_offer(row):
    body = deepcopy({k: v for k, v in row.items() if k != 'content_hash'})
    return dict(body, content_hash=fingerprint(body))


class ShopOfferCatalog:
    def __init__(self, document, *, previous=None, assets=None):
        if (not isinstance(document, dict) or set(document) != {'schema_version', 'offers'}
                or type(document['schema_version']) is not int or document['schema_version'] != 1
                or not isinstance(document['offers'], list)):
            _invalid()
        self._assets = assets
        self._offers = {}
        for raw in document['offers']:
            row = checked_offer(raw, assets=assets)
            key = row['id'], row['revision']
            if key in self._offers:
                _invalid('Teklif ID/revision yinelenemez.')
            self._offers[key] = row
        published = [r for r in self._offers.values() if r['status'] == 'published']
        for i, a in enumerate(published):
            for b in published[i + 1:]:
                if (a['limit']['key'] == b['limit']['key']
                        and max(_moment(a['starts_at']), _moment(b['starts_at'])) < min(_moment(a['ends_at']), _moment(b['ends_at']))):
                    _invalid('Aynı limit için iki yayınlanmış teklif penceresi çakışamaz.')
        if previous is not None:
            for key, old in previous._offers.items():
                if old['status'] == 'published' and self._offers.get(key) != old:
                    raise ShopOfferError('published_offer_immutable', 'Yayınlanmış teklif değiştirilemez veya silinemez.')

    @property
    def document(self):
        return dict(schema_version=1, offers=deepcopy(list(self._offers.values())))

    def publish(self, identity, revision, *, moment):
        if not isinstance(identity, str) or type(revision) is not int:
            raise ShopOfferError('offer_not_found', 'Geçerli teklif ID/revision gerekli.')
        row = deepcopy(self._offers.get((identity, revision)))
        if row is None:
            raise ShopOfferError('offer_not_found', 'Teklif bulunamadı.')
        if row['status'] == 'published':
            return self
        if any(r['id'] == identity and r['status'] == 'published' and r['revision'] >= revision for r in self._offers.values()):
            _invalid('Yayınlanan yeni teklif revision değeri artmalı.')
        # Every declared target must already be real main-game content.
        if row.get('kind') == 'cosmetic_set':
            from .shop_cosmetic_offers import checked
            checked(row, assets=self._assets)
        elif {t['module_definition_id'] for t in row['targets']} != set(MODULE_SPECS):
            _invalid('Teklif havuzu güncel ana oyunun tüm modüllerini içermeli.')
        for target in row.get('targets', []):
            spec = MODULE_SPECS[target['module_definition_id']]
            if (target['rarity'] != spec['rarity'] or target['name_tr'] != spec['name_tr']
                    or spec['runtime_status'] != 'main_game' or spec['art_status'] != 'runtime_registered'):
                _invalid('Planlı veya yanlış enderlik/görselli modül yayınlanamaz.')
        row.update(status='published', published_at=_stamp(moment))
        document = self.document
        document['offers'] = [seal_offer(row) if (r['id'], r['revision']) == (identity, revision) else r for r in document['offers']]
        return ShopOfferCatalog(document, previous=self, assets=self._assets)

    def offer(self, identity, revision, *, moment):
        if not isinstance(identity, str) or type(revision) is not int:
            raise ShopOfferError('offer_not_found', 'Geçerli teklif ID/revision gerekli.')
        row = self._offers.get((identity, revision))
        if row is None:
            code = 'offer_revision_stale' if any(k[0] == identity for k in self._offers) else 'offer_not_found'
            raise ShopOfferError(code, 'Teklif veya istenen revision bulunamadı; ekranı yenile.')
        if row['status'] != 'published':
            raise ShopOfferError('offer_unpublished', 'Bu teklif henüz yayınlanmadı.')
        current = _moment(moment)
        if _version(version.VERSION) < _version(row['minimum_server_version']) or not economy.enabled(current):
            raise ShopOfferError('offer_rollout_closed', 'Teklif sürüm/yürürlük kapısı henüz açık değil.')
        if current < _moment(row['starts_at']):
            raise ShopOfferError('offer_not_started', 'Teklif henüz başlamadı.')
        if current >= _moment(row['ends_at']):
            raise ShopOfferError('offer_expired', 'Teklif süresi doldu; ekranı yenile.')
        return checked_offer(row, assets=self._assets)


def load_catalog(path=CATALOG_PATH, **kwargs):
    return ShopOfferCatalog(json.loads(Path(path).read_text(encoding='utf-8')), **kwargs)


def _week(moment):
    current = _moment(moment)
    year, number, _ = current.isocalendar()
    start = datetime.fromisocalendar(year, number, 1).replace(tzinfo=timezone.utc)
    return f'{year}-W{number:02d}', start, start + timedelta(days=7)


def preview(profile, catalog, identity, revision, *, moment, secret):
    """Pin before returning; caller must persist the profile in its own UOW.

    Pure domain adapter: no wallet change, purchase eligibility, counter or
    delivery is implied by a preview. SHOP-02 revalidates this snapshot.
    """
    row = catalog.offer(identity, revision, moment=moment)
    if not competition_eligible(profile.player_id):
        raise ShopOfferError('account_ineligible', 'Bu hesap teklif için uygun değil.')
    if arena_index_for_rating(max(profile.rating, profile.highest_rating)) < row['minimum_arena']:
        raise ShopOfferError('arena_locked', 'Teklifin arena şartı henüz açılmadı.')
    if row.get('kind') == 'cosmetic_set':
        from .shop_cosmetic_offers import preview as cosmetic_preview
        return cosmetic_preview(row)
    if not isinstance(secret, bytes) or len(secret) < 32:
        raise ShopOfferError('selection_not_configured', 'Teklif seçimi için sunucu anahtarı gerekli.')
    saved = deepcopy(profile.shop_offer_state)
    if saved == {}:
        saved = dict(revision=1, targets={})
    if (not isinstance(saved, dict) or set(saved) != {'revision', 'targets'}
            or type(saved['revision']) is not int or saved['revision'] != 1 or not isinstance(saved['targets'], dict)):
        raise ShopOfferError('offer_pin_invalid', 'Haftalık teklif kaydı doğrulanamadı.')
    period, start, end = _week(moment)
    slot = f'{LIMIT_KEY}:{period}'
    pin = saved['targets'].get(slot)
    pool = sorted(set(unlocked_reward_module_ids(profile.rating, profile.highest_rating, (), profile.legacy_module_unlocks)) & set(MODULE_SPECS))
    targets = {t['module_definition_id']: t for t in row['targets']}
    if pin is None:
        eligible = [x for x in pool if x in targets]
        if not eligible:
            raise ShopOfferError('offer_target_unavailable', 'Teklifin uygun modül önizlemesi bulunamadı.')
        ticket = int.from_bytes(hmac.new(secret, f'gridshard:shop-target:v1:{profile.player_id}:{slot}'.encode(), sha256).digest(), 'big')
        body = dict(player_id=profile.player_id, period_id=period, limit_key=LIMIT_KEY,
                    target_id=eligible[ticket % len(eligible)], pinned_at=_stamp(moment))
        pin = dict(body, content_hash=fingerprint(body))
        saved['targets'][slot] = pin
    elif (not isinstance(pin, dict) or set(pin) != {'player_id', 'period_id', 'limit_key', 'target_id', 'pinned_at', 'content_hash'}
          or not isinstance(pin['target_id'], str)
          or pin['content_hash'] != fingerprint({k: v for k, v in pin.items() if k != 'content_hash'})
          or pin['player_id'] != profile.player_id or pin['period_id'] != period or pin['limit_key'] != LIMIT_KEY
          or not start <= _moment(pin['pinned_at']) < end):
        raise ShopOfferError('offer_pin_invalid', 'Haftalık teklif hedefi doğrulanamadı; hedef yeniden seçilmedi.')
    if pin['target_id'] not in targets or pin['target_id'] not in pool:
        raise ShopOfferError('offer_target_unavailable', 'Sabit hedef şu anda uygun değil; yeni hedef seçilmedi.')
    target = targets[pin['target_id']]
    if target['rarity'] != MODULE_SPECS[pin['target_id']]['rarity']:
        raise ShopOfferError('offer_target_unavailable', 'Teklifin sabit hedef enderliği uyuşmuyor.')
    reward = dict(module_definition_id=pin['target_id'], module_shards=row['guarantee']['pieces_by_rarity'][target['rarity']])
    snapshot = dict(protocol='shop-offer-preview-v1', id=row['id'], revision=row['revision'],
        offer_hash=row['content_hash'], period_id=period, starts_at=_stamp(max(start, _moment(row['starts_at']))),
        ends_at=_stamp(min(end, _moment(row['ends_at']))), minimum_arena=row['minimum_arena'],
        minimum_server_version=row['minimum_server_version'], art=row['art'], price=row['price'], limit=row['limit'], target=target,
        title_tr=row['title_tr'], title_en=row['title_en'], body_tr=row['body_tr'], body_en=row['body_en'],
        reward_snapshot=seal(identity='shop.module-parts.'+fingerprint(reward), revision=1, kind='fixed',
                             payload=reward, minimum_server_version=row['minimum_server_version']))
    snapshot['preview_hash'] = fingerprint(snapshot)
    profile.shop_offer_state = saved
    return deepcopy(snapshot)
