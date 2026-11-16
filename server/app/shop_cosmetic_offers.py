"""Explicit soft-currency pilot. No payment provider, randomized item or power."""
from copy import deepcopy

from . import cosmetic_releases as cosmetics
from .reward_definitions import fingerprint, seal

SETS = {
    'cosmetic.dockyard': ('dockyard_latch_frame', 'dockyard_deck_background'),
    'cosmetic.workshop': ('workshop_shelf_frame', 'workshop_bay_background'),
}
PRICE = dict(currency='circuit_credits', amount=1500)


def invalid(message='Kozmetik seti doğrulanamadı.'):
    from .shop_offers import ShopOfferError
    raise ShopOfferError('invalid_catalog', message)


def reward_payload(identity):
    if identity not in SETS:
        invalid()
    frame, background = SETS[identity]
    return dict(avatar_frame_id=frame, profile_background_id=background)


def validate_items(identity, items, *, live=False):
    from . import shop_offers as offers
    expected = reward_payload(identity)
    if not isinstance(items, list) or len(items) != 2:
        invalid()
    for item, (field, key) in zip(items, expected.items()):
        if (not isinstance(item, dict) or item.get('id') != key or item.get('field') != field
                or item.get('inventory_pool') != 'shop' or item.get('status') != 'approved'
                or not offers._text(item.get('name_tr')) or not offers._text(item.get('name_en'))
                or not isinstance(item.get('design_id'), str)):
            invalid()
        look = item.get('look', {})
        if not isinstance(look,dict):
            invalid()
        pattern = look.get('pattern')
        asset = look.get('asset', {})
        if (not isinstance(pattern,str) or not isinstance(asset,dict)
                or cosmetics.AUTHORED_SHOP_PATTERNS.get(pattern) != field
                or asset.get('path') != f'assets/ui/cosmetics-shop-v1/{pattern}.svg'
                or not isinstance(asset.get('sha256'), str) or not offers.HASH.fullmatch(asset['sha256'])):
            invalid()
        if live and cosmetics.REGISTRY.items.get(key) != item:
            invalid('Set incelenmiş mağaza sanatıyla uyuşmuyor.')
        if live:
            try:
                cosmetics.checked_shop_art(item)
            except cosmetics.CosmeticReleaseError as exc:
                invalid(str(exc))


def checked(row, *, assets=None):
    from . import shop_offers as offers
    required = {'id','revision','kind','status','published_at','minimum_server_version','starts_at','ends_at',
                'minimum_arena','price','guarantee','limit','title_tr','title_en','body_tr','body_en',
                'art','cosmetics','content_hash'}
    if not isinstance(row, dict) or set(row) != required or row.get('kind') != 'cosmetic_set' or not isinstance(row.get('id'),str) or row['id'] not in SETS:
        invalid()
    if (type(row['revision']) is not int or row['revision'] < 1 or not isinstance(row['status'],str) or row['status'] not in {'draft','published'}
            or row['content_hash'] != fingerprint({k:v for k,v in row.items() if k != 'content_hash'})
            or row['minimum_server_version'] != '2.5.0' or type(row['minimum_arena']) is not int or row['minimum_arena'] != 2
            or row['price'] != PRICE or type(row['price']['amount']) is not int
            or row['limit'] != dict(period='account',count=1,key=row['id']) or type(row['limit']['count']) is not int
            or row['guarantee'] != dict(kind='cosmetic_set',items=list(SETS[row['id']]))) :
        invalid('Kozmetik pilotu yalnız oyun içi1500 Devre Kredisi ve hesap başına bir set edinimini destekler.')
    start,end = offers._moment(row['starts_at']), offers._moment(row['ends_at'])
    if start >= end or start < offers._moment(offers.economy.POLICY['earliest_effective_at']):
        invalid()
    if ((row['status']=='draft' and row['published_at'] is not None)
            or (row['status']=='published' and (row['published_at'] is None or offers._moment(row['published_at'])>start))
            or any(not offers._text(row[k]) for k in ('title_tr','title_en','body_tr','body_en'))):
        invalid()
    validate_items(row['id'], row['cosmetics'], live=True)
    if row['art'] != row['cosmetics'][0]['look']['asset']:
        invalid()
    if assets is not None:
        for item in row['cosmetics']:
            asset = item['look']['asset']; target = (assets / asset['path']).resolve()
            if not target.is_relative_to(assets.resolve()) or not target.is_file() or offers.sha256(target.read_bytes()).hexdigest() != asset['sha256']:
                invalid('Kozmetik kaynağı dağıtım kökünde bulunamadı.')
    return deepcopy(row)


def preview(row):
    from . import shop_offers as offers
    reward = reward_payload(row['id'])
    snapshot = {key:deepcopy(row[key]) for key in ('id','revision','kind','minimum_arena','minimum_server_version',
        'price','limit','art','cosmetics','title_tr','title_en','body_tr','body_en')}
    snapshot.update(protocol='shop-offer-preview-v1',offer_hash=row['content_hash'],period_id='account',
        starts_at=offers._stamp(row['starts_at']),ends_at=offers._stamp(row['ends_at']),
        reward_snapshot=seal(identity='shop.cosmetic-set.'+fingerprint(reward), revision=1,kind='fixed',
            payload=reward,minimum_server_version=row['minimum_server_version']))
    snapshot['preview_hash'] = fingerprint(snapshot)
    return snapshot


def validate_snapshot(snapshot, reward):
    """A historical receipt remains readable after catalog/art changes."""
    identity = snapshot['id']
    validate_items(identity, snapshot['cosmetics'])
    expected = reward_payload(identity)
    if (snapshot['price'] != PRICE or type(snapshot['price']['amount']) is not int
            or snapshot['limit'] != dict(period='account',count=1,key=identity) or type(snapshot['limit']['count']) is not int
            or snapshot['period_id'] != 'account' or snapshot['art'] != snapshot['cosmetics'][0]['look']['asset']
            or reward['kind'] != 'fixed' or reward['payload'] != expected
            or reward['id'] != 'shop.cosmetic-set.'+fingerprint(expected)):
        invalid()


def owned(profile, snapshot):
    reward = snapshot['reward_snapshot']['payload']
    return (reward['avatar_frame_id'] in profile.unlocked_avatar_frame_ids
            or reward['profile_background_id'] in profile.unlocked_profile_background_ids)


def grant(profile, reward):
    profile.unlocked_avatar_frame_ids = tuple(dict.fromkeys((*profile.unlocked_avatar_frame_ids,reward['avatar_frame_id'])))
    profile.unlocked_profile_background_ids = tuple(dict.fromkeys((*profile.unlocked_profile_background_ids,reward['profile_background_id'])))
