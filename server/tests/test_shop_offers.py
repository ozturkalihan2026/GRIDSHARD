"""Offer policy, review/publication boundaries and frozen weekly previews."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path

import pytest

from app import shop_offers as offers, version, free_economy_rewards as economy
from app.player_profile import PlayerProfile, PlayerProfileService
from app.player_data_store import PlayerDataStoreService, JsonFilePlayerDataRepository
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.premium_reward_recovery import wallet_snapshot
from test_free_economy_rewards import clock  # noqa: F401

IDENTITY = 'weekly.module-parts'
SECRET = b'synthetic-shop01-selection-secret-only'
PUBLISHED = datetime(2026, 11, 16, tzinfo=timezone.utc)


def document():
    return json.loads(offers.CATALOG_PATH.read_text(encoding='utf-8'))


def candidate(change=None):
    value = document()
    row = value['offers'][0]
    if change:
        change(row)
    value['offers'][0] = offers.seal_offer(row)
    return value


def catalog(change=None):
    return offers.ShopOfferCatalog(candidate(change)).publish(IDENTITY, 1, moment=PUBLISHED)


def profile(rating=600):
    return PlayerProfile(player_id='shop01-player', display_name='ShopFixture', rating=rating, highest_rating=rating)


def preview(p, c, moment):
    return offers.preview(p, c, IDENTITY, 1, moment=moment, secret=SECRET)


def test_checked_in_catalog_is_draft_and_economy_policy_is_explicit(clock):
    c = offers.load_catalog()
    assert c.document['offers'][0]['status'] == 'draft'
    with pytest.raises(offers.ShopOfferError) as error:
        preview(profile(), c, clock[0])
    assert error.value.code == 'offer_unpublished'
    assert c.document['offers'][0]['price'] == dict(currency='circuit_credits', amount=500)
    assert c.document['offers'][0]['limit'] == dict(period='utc_week', count=2, key=offers.LIMIT_KEY)


@pytest.mark.parametrize('field,value', [
    ('starts_at', '2026-12-28T00:00:00'), ('starts_at', '2026-12-28T03:00:00+03:00'),
    ('starts_at', '2026-11-24T00:00:00Z'), ('ends_at', '2026-12-28T00:00:00Z'),
    ('minimum_arena', 0), ('minimum_arena', True), ('revision', True), ('status', []),
    ('minimum_server_version', '2.4.0'), ('minimum_server_version', '2.5'),
    ('title_en', ''), ('body_tr', '<script>bad</script>'),
    ('price', {'currency': 'usd', 'amount': 500}), ('price', {'currency': 'circuit_credits', 'amount': -500}),
    ('limit', {'period': 'utc_week', 'count': 3, 'key': offers.LIMIT_KEY}),
    ('guarantee', {'kind': 'random'}),
])
def test_malformed_or_unbudgeted_offer_is_rejected(field, value):
    with pytest.raises(offers.ShopOfferError) as error:
        offers.ShopOfferCatalog(candidate(lambda r: r.update({field: value})))
    assert error.value.code == 'invalid_catalog'


@pytest.mark.parametrize('field,value,code', [
    ('name_en', '', 'invalid_catalog'), ('rarity', [], 'invalid_catalog'),
    ('art', {'path': 'assets/ui/missing-product.webp', 'sha256': 'a' * 64}, 'offer_preview_unavailable'),
    ('art', {'path': '../outside.webp', 'sha256': 'a' * 64}, 'invalid_catalog'),
    ('art', {'path': 'assets/ui/modules-physical-v1/laser.webp', 'sha256': 'a' * 64}, 'offer_preview_unavailable'),
])
def test_incomplete_or_changed_product_preview_never_publishes(field, value, code):
    with pytest.raises(offers.ShopOfferError) as error:
        offers.ShopOfferCatalog(candidate(lambda r: r['targets'][0].update({field: value})))
    assert error.value.code == code


def test_publication_checks_entire_live_roster_and_planned_targets_are_not_products():
    for change in (lambda r: r['targets'].pop(), lambda r: r['targets'][0].update(module_definition_id='planned_recoil_cannon')):
        with pytest.raises(offers.ShopOfferError):
            catalog(change)


def test_duplicate_revision_hash_tamper_and_post_start_publication_fail():
    value = document()
    value['offers'].append(deepcopy(value['offers'][0]))
    with pytest.raises(offers.ShopOfferError):
        offers.ShopOfferCatalog(value)
    value = document()
    value['offers'][0]['body_en'] = 'Changed without resealing'
    with pytest.raises(offers.ShopOfferError):
        offers.ShopOfferCatalog(value)
    with pytest.raises(offers.ShopOfferError):
        offers.load_catalog().publish(IDENTITY, 1, moment='2026-12-29T00:00:00Z')


def test_published_history_cannot_change_or_disappear_even_with_recomputed_hash():
    c = catalog()
    edited = c.document
    edited['offers'][0]['body_en'] = 'A recomputed hash is not publication approval'
    edited['offers'][0] = offers.seal_offer(edited['offers'][0])
    for value in (edited, dict(schema_version=1, offers=[])):
        with pytest.raises(offers.ShopOfferError) as error:
            offers.ShopOfferCatalog(value, previous=c)
        assert error.value.code == 'published_offer_immutable'
    assert c.publish(IDENTITY, 1, moment=PUBLISHED).document == c.document
    public = c.document
    public['offers'].clear()
    assert c.document['offers']


def test_overlap_cannot_reset_weekly_policy_through_new_id_or_revision():
    c = catalog()
    value = c.document
    row = deepcopy(value['offers'][0])
    row.update(id='other.module-parts', revision=1, status='draft', published_at=None)
    value['offers'].append(offers.seal_offer(row))
    extended = offers.ShopOfferCatalog(value, previous=c)
    with pytest.raises(offers.ShopOfferError):
        extended.publish('other.module-parts', 1, moment=PUBLISHED)


@pytest.mark.parametrize('moment,code', [('2026-12-27T23:59:59Z', 'offer_not_started'), ('2027-01-04T00:00:00Z', 'offer_expired')])
def test_start_end_are_utc_half_open_and_errors_do_not_pin(clock, moment, code):
    p = profile()
    before = deepcopy(p)
    with pytest.raises(offers.ShopOfferError) as error:
        preview(p, catalog(), datetime.fromisoformat(moment.replace('Z', '+00:00')))
    assert error.value.code == code
    assert p == before


def test_exact_open_boundary_and_unknown_revision(clock):
    p = profile()
    result = preview(p, catalog(), datetime(2026, 12, 28, tzinfo=timezone.utc))
    assert result['period_id'] == '2026-W53'
    with pytest.raises(offers.ShopOfferError) as error:
        offers.preview(p, catalog(), IDENTITY, 99, moment=clock[0], secret=SECRET)
    assert error.value.code == 'offer_revision_stale'


@pytest.mark.parametrize('gate', ['old_server', 'closed_rollout', 'arena', 'bot', 'missing_secret'])
def test_eligibility_gates_do_not_change_wallet_progress_or_pin(clock, monkeypatch, gate):
    p, c = profile(), catalog()
    secret = SECRET
    if gate == 'old_server': monkeypatch.setattr(version, 'VERSION', '2.4.0')
    elif gate == 'closed_rollout': monkeypatch.delenv('GRIDSHARD_FREE_ECONOMY_FROM')
    elif gate == 'arena': c = catalog(lambda r: r.update(minimum_arena=5))
    elif gate == 'bot': p.player_id = 'bot_a1'
    else: secret = b'too-short'
    before = deepcopy(p)
    with pytest.raises(offers.ShopOfferError):
        offers.preview(p, c, IDENTITY, 1, moment=clock[0], secret=secret)
    assert p == before


def test_preview_is_stable_through_arena_pool_growth_and_key_rotation_and_never_grants(clock):
    p, c = profile(0), catalog()
    before = wallet_snapshot(p), p.season_xp, deepcopy(p.reward_inbox)
    first = preview(p, c, clock[0])
    assert first['target']['module_definition_id'] in offers.unlocked_reward_module_ids(0, 0)
    p.rating = p.highest_rating = 10000
    again = offers.preview(p, c, IDENTITY, 1, moment=clock[0]+timedelta(hours=1), secret=b'rotated-synthetic-shop-secret-32-bytes')
    assert first == again
    assert before == (wallet_snapshot(p), p.season_xp, p.reward_inbox)
    assert first['reward_snapshot']['payload']['module_shards'] == offers.AMOUNTS[first['target']['rarity']]
    assert 'player_id' not in first and 'secret' not in json.dumps(first)
    assert 'shop_offer_state' not in p.to_view()


def test_same_week_new_revision_preserves_target_and_limit_scope(clock):
    c = catalog(lambda r: r.update(ends_at='2026-12-30T00:00:00Z'))
    p = profile(0)
    first = preview(p, c, clock[0])
    value = c.document
    row = deepcopy(value['offers'][0])
    row.update(revision=2, status='draft', published_at=None, starts_at='2026-12-30T00:00:00Z', ends_at='2027-01-04T00:00:00Z')
    value['offers'].append(offers.seal_offer(row))
    newer = offers.ShopOfferCatalog(value, previous=c).publish(IDENTITY, 2, moment=PUBLISHED)
    p.rating = p.highest_rating = 10000
    second = offers.preview(p, newer, IDENTITY, 2, moment=datetime(2026, 12, 30, tzinfo=timezone.utc), secret=SECRET)
    assert first['target'] == second['target'] and first['period_id'] == second['period_id']
    assert first['limit']['key'] == second['limit']['key']
    assert len(p.shop_offer_state['targets']) == 1


def test_new_iso_week_has_separate_pin_and_old_preview_expires(clock):
    c, p = catalog(), profile()
    first = preview(p, c, clock[0])
    value = c.document
    row = deepcopy(value['offers'][0])
    row.update(revision=2, status='draft', published_at=None, starts_at='2027-01-04T00:00:00Z', ends_at='2027-01-11T00:00:00Z')
    value['offers'].append(offers.seal_offer(row))
    newer = offers.ShopOfferCatalog(value, previous=c).publish(IDENTITY, 2, moment=PUBLISHED)
    boundary = datetime(2027, 1, 4, tzinfo=timezone.utc)
    second = offers.preview(p, newer, IDENTITY, 2, moment=boundary, secret=SECRET)
    assert first['period_id'] == '2026-W53' and second['period_id'] == '2027-W01'
    assert len(p.shop_offer_state['targets']) == 2
    with pytest.raises(offers.ShopOfferError) as error:
        preview(p, newer, boundary)
    assert error.value.code == 'offer_expired'


@pytest.mark.parametrize('malformed', ['hash', 'owner', 'empty_list', 'target_type'])
def test_corrupt_pinned_state_fails_without_reroll(clock, malformed):
    p, c = profile(), catalog()
    preview(p, c, clock[0])
    pin = next(iter(p.shop_offer_state['targets'].values()))
    if malformed == 'hash': pin['content_hash'] = 'wrong'
    elif malformed == 'owner':
        pin['player_id'] = 'another-player'
        pin['content_hash'] = offers.fingerprint({k:v for k,v in pin.items() if k!='content_hash'})
    elif malformed == 'target_type':
        pin['target_id'] = []
        pin['content_hash'] = offers.fingerprint({k:v for k,v in pin.items() if k!='content_hash'})
    else: p.shop_offer_state = []
    before = deepcopy(p)
    with pytest.raises(offers.ShopOfferError) as error:
        preview(p, c, clock[0])
    assert error.value.code == 'offer_pin_invalid' and p == before


def test_private_pin_roundtrip_survives_json_restart_and_closed_season(clock, tmp_path):
    service = PlayerProfileService(now_func=lambda: clock[0])
    data = PlayerDataStoreService(profile_service=service, settings_service=PlayerSettingsService(),
        statistics_service=PlayerStatisticsService(), repository=JsonFilePlayerDataRepository(tmp_path/'players.json'))
    p = service.get_or_create('shop01-restart')
    first = preview(p, catalog(), clock[0])
    data.save_player(p.player_id)
    service._profiles.clear()
    data.load_player(p.player_id)
    restored = service.get_or_create(p.player_id)
    assert preview(restored, catalog(), clock[0]) == first
    from app.meta_progression import archive_and_soft_reset_season
    saved = deepcopy(restored.shop_offer_state)
    archive_and_soft_reset_season(restored, 'gridshard_waiting', archived_at=clock[0].isoformat())
    assert restored.shop_offer_state == saved


def test_catalog_is_explicit_release_input_not_player_state():
    from tools.package_release import is_release_input
    assert is_release_input('server/data/shop_offers_v1.json')
    assert not is_release_input('server/data/shop_offer_player_state.json')
    root = Path(__file__).resolve().parents[2]
    assert 'COPY server/data/shop_offers_v1.json /app/server/data/' in (root/'Dockerfile').read_text()
    assert '!server/data/shop_offers_v1.json' in (root/'.dockerignore').read_text()
    html = (root/'client/index.html').read_text(encoding='utf-8')
    row = document()['offers'][0]
    for art in [row['art'], *(t['art'] for t in row['targets'])]:
        assert art['path'] in html, f"Preview art is absent from the client build allowlist: {art['path']}"
