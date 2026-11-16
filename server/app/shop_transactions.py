"""Soft-currency purchases, owned by the caller's account lock/economic UOW."""
from copy import deepcopy
from dataclasses import fields
from hashlib import sha256

from . import shop_offers as offers
from .catalog_migration import award_module_shards
from .reward_definitions import checked, fingerprint

ShopTransactionError = offers.ShopOfferError


def _request_key(request_id):
    if not isinstance(request_id, str) or not request_id.strip() or len(request_id) > 160:
        raise ShopTransactionError('purchase_request_invalid', 'Geçerli talep kimliği gerekli.')
    return sha256(request_id.strip().encode()).hexdigest()


def _validated(profile):
    saved = profile.shop_purchase_receipts
    if not isinstance(saved, dict):
        raise ShopTransactionError('purchase_receipt_invalid', 'Mağaza alım makbuzları doğrulanamadı.')
    keys = {'format_version', 'purchase_id', 'request_hash', 'player_id', 'purchased_at',
            'offer_snapshot', 'charged', 'rewards', 'receipt_hash'}
    result = deepcopy(saved)
    try:
        for key, row in result.items():
            if (not isinstance(row, dict) or set(row) != keys
                    or type(row['format_version']) is not int or row['format_version'] != 1
                    or not isinstance(key, str) or not offers.HASH.fullmatch(key)
                    or row['request_hash'] != key or row['player_id'] != profile.player_id
                    or row['purchase_id'] != fingerprint(dict(player_id=profile.player_id, request_hash=key))
                    or row['receipt_hash'] != fingerprint({k:v for k,v in row.items() if k != 'receipt_hash'})):
                raise ValueError('Receipt context')
            snapshot = row['offer_snapshot']
            if (not isinstance(snapshot, dict) or snapshot.get('protocol') != 'shop-offer-preview-v1'
                    or snapshot.get('preview_hash') != fingerprint({k:v for k,v in snapshot.items() if k != 'preview_hash'})
                    or not isinstance(snapshot.get('id'), str) or not offers.KEY.fullmatch(snapshot['id'])
                    or type(snapshot.get('revision')) is not int or snapshot['revision'] < 1
                    or snapshot.get('price') != dict(currency='circuit_credits', amount=500)
                    or type(snapshot['price']['amount']) is not int
                    or snapshot.get('limit') != dict(period='utc_week', count=2, key=offers.LIMIT_KEY)
                    or type(snapshot['limit']['count']) is not int):
                raise ValueError('Offer snapshot')
            when = offers._moment(row['purchased_at'])
            if (offers._week(when)[0] != snapshot['period_id']
                    or not offers._moment(snapshot['starts_at']) <= when < offers._moment(snapshot['ends_at'])):
                raise ValueError('Period binding')
            reward = checked(snapshot['reward_snapshot'])
            if (reward['kind'] != 'fixed' or set(reward['payload']) != {'module_definition_id', 'module_shards'}
                    or reward['id'] != 'shop.module-parts.' + fingerprint(reward['payload'])
                    or row['charged'] != snapshot['price'] or row['rewards'] != reward['payload']
                    or snapshot['target']['module_definition_id'] != row['rewards']['module_definition_id']
                    or offers.AMOUNTS[snapshot['target']['rarity']] != row['rewards']['module_shards']):
                raise ValueError('Reward binding')
    except (ValueError, KeyError, TypeError, AttributeError) as exc:
        raise ShopTransactionError('purchase_receipt_invalid', 'Eski mağaza makbuzu doğrulanamadı; alım uygulanmadı.') from exc
    return result


def _used(receipts, snapshot):
    return sum(r['offer_snapshot']['period_id'] == snapshot['period_id']
               and r['offer_snapshot']['limit']['key'] == snapshot['limit']['key'] for r in receipts.values())


def quote(profile, catalog, identity, revision, *, moment, secret):
    receipts = _validated(profile)
    balance = profile.circuit_credits
    if type(balance) is not int:
        raise ShopTransactionError('wallet_invalid', 'Devre Kredisi kaydı doğrulanamadı.')
    snapshot = offers.preview(profile, catalog, identity, revision, moment=moment, secret=secret)
    used = _used(receipts, snapshot)
    remaining = max(0, snapshot['limit']['count'] - used)
    reason = 'purchase_limit_reached' if not remaining else 'insufficient_funds' if balance < snapshot['price']['amount'] else None
    return dict(offer=snapshot, purchases_used=used, purchases_remaining=remaining,
                balance=balance, can_purchase=reason is None, blocking_code=reason)


def purchase(profile, catalog, identity, revision, preview_hash, *, request_id, moment, secret, persist=None):
    """Charge+grant+receipt on a copy, then persist in the existing outer UOW.

    A matching committed request is replayable after expiry, rollover, catalog
    replacement or rollout closure. A fresh request always revalidates its quote.
    """
    request_hash = _request_key(request_id)
    if (not isinstance(identity, str) or type(revision) is not int or revision < 1
            or not isinstance(preview_hash, str) or not offers.HASH.fullmatch(preview_hash)):
        raise ShopTransactionError('purchase_request_invalid', 'Teklif ID/revision ve önizleme hash gerekli.')
    receipts = _validated(profile)
    previous = receipts.get(request_hash)
    if previous is not None:
        old = previous['offer_snapshot']
        if (old['id'], old['revision'], old['preview_hash']) != (identity, revision, preview_hash):
            raise ShopTransactionError('purchase_request_conflict', 'Talep kimliği başka bir alıma ait.')
        return deepcopy(previous)
    if callable(catalog):
        catalog = catalog()
    working = deepcopy(profile)
    view = quote(working, catalog, identity, revision, moment=moment, secret=secret)
    snapshot = view['offer']
    if snapshot['preview_hash'] != preview_hash:
        raise ShopTransactionError('offer_preview_stale', 'Teklif önizlemesi değişti; yeniden incele.')
    if not view['can_purchase']:
        code = view['blocking_code']
        raise ShopTransactionError(code, 'Bu haftanın iki alımı kullanıldı.' if code == 'purchase_limit_reached' else 'Devre Kredisi yetersiz.')
    reward = deepcopy(snapshot['reward_snapshot']['payload'])
    working.circuit_credits -= snapshot['price']['amount']
    award_module_shards(working, reward['module_definition_id'], reward['module_shards'])
    body = dict(format_version=1, purchase_id=fingerprint(dict(player_id=profile.player_id, request_hash=request_hash)),
        request_hash=request_hash, player_id=profile.player_id, purchased_at=offers._stamp(moment),
        offer_snapshot=deepcopy(snapshot), charged=deepcopy(snapshot['price']), rewards=reward)
    receipt = dict(body, receipt_hash=fingerprint(body))
    receipts[request_hash] = receipt
    working.shop_purchase_receipts = receipts
    _validated(working)
    original = deepcopy(profile)
    try:
        for field in fields(profile):
            setattr(profile, field.name, getattr(working, field.name))
        if persist is not None:
            persist()
    except BaseException:
        for field in fields(profile):
            setattr(profile, field.name, getattr(original, field.name))
        raise
    return deepcopy(receipt)
