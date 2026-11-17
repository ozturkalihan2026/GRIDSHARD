"""Real collection/persistence acceptance for an isolated admitted CARD-01.

No release flags, live roster, source files or global production switches are
changed: pytest's monkeypatch restores every test-owned in-memory admission.
"""
from copy import deepcopy
from datetime import datetime, timezone

import pytest

from app import arena_canon as arena, meta_progression as meta
from app.game import catalog
from app.game.recoil_cannon import definition
from app.module_roster import MODULE_SPECS
from app.player_profile import PlayerProfileService
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_statistics import PlayerStatisticsService
from app.player_settings import PlayerSettingsService
from app.season_module_releases import MANIFEST, published_module_progression, validate_season_release


def approved_document():
    document = deepcopy(MANIFEST)
    release = document['roadmap'][0]
    release.update(status='published', season_number=2, season_id='test-only-s2')
    release['modules'][0]['release_checks'] = {key: True for key in MANIFEST['policy']['release_requires']}
    return document


def candidate_spec():
    d = definition()
    return dict(id=d.id, name_tr=d.name_tr, category=d.combat_class, rarity=d.rarity,
                current_cost=d.current_cost, max_hp=d.max_hp, base_damage=d.base_damage, cooldown_ms=d.cooldown_ms)


def admit(document=None, specs=None):
    return published_module_progression(
        set(MODULE_SPECS), {**MODULE_SPECS, 'recoil_cannon': candidate_spec()} if specs is None else specs,
        arena.ARENA_MINIMUM_RATING_BY_INDEX, document=approved_document() if document is None else document)


@pytest.mark.parametrize('change', [
    {'kind': 'shop'}, {'starting_level': 2}, {'starting_level': True},
    {'permanent': False}, {'circuit_credits_cost': 1}, {'flux_cost': 1},
    {'requires_premium': True}, {'expires_at': '2027-01-01'},
])
def test_release_cannot_claim_free_acquisition_with_a_payment_level_or_lease(change):
    document = approved_document()
    document['roadmap'][0]['modules'][0]['acquisition'].update(change)
    with pytest.raises(ValueError):
        validate_season_release(document['roadmap'][0])
    with pytest.raises(ValueError):
        admit(document)


def test_release_booleans_alone_do_not_implement_a_playable_card():
    with pytest.raises(ValueError, match='motor kataloğu'):
        admit(specs=MODULE_SPECS)
    wrong = candidate_spec()
    wrong['id'] = 'different-card'
    with pytest.raises(ValueError, match='motor kataloğu'):
        admit(specs={**MODULE_SPECS, 'recoil_cannon': wrong})


def test_runtime_roster_alone_cannot_open_a_planned_or_unaccepted_card():
    with pytest.raises(ValueError, match='sezon yayını'):
        admit(deepcopy(MANIFEST))
    incomplete = approved_document()
    incomplete['roadmap'][0]['modules'][0]['release_checks']['art'] = False
    with pytest.raises(ValueError):
        admit(incomplete)
    # Current source remains the original 24, without any candidate admission.
    assert published_module_progression(MODULE_SPECS, MODULE_SPECS, arena.ARENA_MINIMUM_RATING_BY_INDEX) == {}
    assert len(MODULE_SPECS) == 24 and 'recoil_cannon' not in arena.MODULES


@pytest.mark.parametrize('key,value', [
    ('catalog_is_cumulative', False), ('season_end_removes_cards', True), ('paid_exclusive_power', True),
])
def test_catalog_cannot_remove_cards_or_add_paid_exclusive_power(key, value):
    document = approved_document()
    document['policy'][key] = value
    with pytest.raises(ValueError):
        admit(document)


def test_published_history_is_cumulative_and_duplicate_or_missing_periods_are_rejected():
    document = approved_document()
    first = deepcopy(document['roadmap'][0])
    second = deepcopy(first)
    second.update(season_number=3, season_id='test-only-s3')
    second['modules'][0].update(id='test-next-module', arena_unlock=5)
    document['roadmap'] = [first, second]
    extra = {**candidate_spec(), 'id': 'test-next-module'}
    admitted = admit(document, {**MODULE_SPECS, 'recoil_cannon': candidate_spec(), 'test-next-module': extra})
    assert set(admitted) == {'recoil_cannon', 'test-next-module'}
    assert admitted['recoil_cannon']['unlock_trophies'] == 600
    assert admitted['recoil_cannon']['acquisition']['permanent'] is True
    second['season_number'] = 2
    with pytest.raises(ValueError, match='benzersiz'):
        admit(document)
    document = approved_document()
    document['roadmap'][0].pop('season_id')
    with pytest.raises(ValueError, match='sezon kimliği'):
        admit(document)


@pytest.fixture
def admitted_collection(monkeypatch):
    """Future approved metadata plugged into the existing real collection path."""
    additions = admit()
    monkeypatch.setitem(arena.MODULES, 'recoil_cannon', additions['recoil_cannon'])
    monkeypatch.setitem(MODULE_SPECS, 'recoil_cannon', candidate_spec())
    monkeypatch.setitem(catalog.BASIC_MODULE_DEFINITIONS, 'recoil_cannon', definition())
    monkeypatch.setitem(meta.MODULE_RARITY, 'recoil_cannon', 'rare')
    now = lambda: datetime(2026, 11, 17, tzinfo=timezone.utc)
    profiles = PlayerProfileService(now_func=now)
    store = PlayerDataStoreService(profile_service=profiles, statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(), repository=InMemoryPlayerDataRepository())
    return profiles, store, meta.MetaProgressionService(now_func=now)


def card(service, profile):
    return next(m for m in service.view(profile)['module_collection'] if m['definition_id'] == 'recoil_cannon')


def test_existing_peak_unlocks_base_card_for_free_without_a_reward_claim(admitted_collection):
    profiles, store, service = admitted_collection
    profile = profiles.get_or_create('test-veteran')
    profile.rating, profile.highest_rating = 100, 600
    profile.circuit_credits, profile.flux_shards, profile.universal_module_shards = 0, 0, 0
    before = (profile.circuit_credits, profile.flux_shards, deepcopy(profile.module_shards))
    item = card(service, profile)
    assert item['unlocked'] is True and item['level'] == 0  # zero upgrades == playable level1
    assert item['acquisition'] == dict(kind='arena_peak', starting_level=1, permanent=True,
                                      circuit_credits_cost=0, flux_cost=0, peak_trophies=600)
    assert (profile.circuit_credits, profile.flux_shards, profile.module_shards) == before
    assert 'recoil_cannon' in arena.unlocked_reward_module_ids(profile.rating, profile.highest_rating)
    store.save_player(profile.player_id)
    profiles._profiles.clear()
    store.load_player(profile.player_id)
    assert card(service, profiles.get(profile.player_id))['unlocked'] is True


def test_new_account_stays_locked_until_peak600_and_cannot_get_candidate_from_rewards(admitted_collection):
    profiles, _, service = admitted_collection
    profile = profiles.get_or_create('test-newcomer')
    for peak in (0, 599):
        profile.highest_rating = profile.rating = peak
        assert card(service, profile)['unlocked'] is False
        assert 'recoil_cannon' not in arena.unlocked_reward_module_ids(peak, peak, ('recoil_cannon',))
    assert len(arena.unlocked_module_ids(0)) == 6
    profile.highest_rating = profile.rating = 600
    assert card(service, profile)['unlocked'] is True
    assert 'recoil_cannon' in arena.unlocked_reward_module_ids(600, 600, ('recoil_cannon',))


def test_arena_drop_season_close_save_load_and_repeat_do_not_relock_or_reset_collection(admitted_collection):
    profiles, store, service = admitted_collection
    profile = profiles.get_or_create('test-permanent')
    profile.rating, profile.highest_rating = 9000, 9500
    profile.module_upgrade_levels['recoil_cannon'] = 6
    profile.module_shards['recoil_cannon'] = 23
    profile.module_talents['recoil_cannon'] = {'0': 'resilience'}
    profile.circuit_credits, profile.flux_shards = 37, 12
    profile.active_meta_season_id = 'test-only-s2'
    profile.season_reward_state = {}  # No earned track rights in this synthetic period.
    assert meta.archive_and_soft_reset_season(profile, 'test-only-rest', archived_at='2026-11-17T00:00:00Z')
    assert meta.archive_and_soft_reset_season(profile, 'test-only-rest') is None
    profile.rating = 0
    store.save_player(profile.player_id)
    profiles._profiles.clear()
    store.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)
    item = card(service, restored)
    assert item['unlocked'] is True and item['level'] == 6 and item['shards'] == 23
    assert restored.module_talents['recoil_cannon'] == {'0': 'resilience'}
    assert (restored.circuit_credits, restored.flux_shards, restored.highest_rating) == (37, 12, 9500)


def test_match_setup_rejects_below600_then_allows_free_level1_card_with_only_battle_current(admitted_collection, monkeypatch):
    from app.game import battle_pool
    from app.game.pvp_session import PvPSessionError, PvPSessionService
    from app.game.pvp_setup import PvPSetupPayload, InitialModulePlacement
    monkeypatch.setattr(battle_pool, 'PLAYER_SELECTABLE_MODULE_IDS', (*battle_pool.PLAYER_SELECTABLE_MODULE_IDS, 'recoil_cannon'))
    profiles, _, _ = admitted_collection
    profile = profiles.get_or_create('test-match-owner')
    profile.rating = profile.highest_rating = 599
    profile.circuit_credits = profile.flux_shards = 0
    pvp = PvPSessionService(now_func=lambda: 0)
    session = pvp.create_session('candidate-free-test', setup_required=True)
    for player in ('a', 'b'):
        pvp.join(session.session_id, player)
    payload = PvPSetupPayload(('recoil_cannon','laser','shield','armor','repair','amplifier'),
                              (InitialModulePlacement('a-core','core',2,1),))
    session.engine.state.player_unlocked_modules['a'] = arena.unlocked_module_ids(profile.highest_rating)
    with pytest.raises(PvPSessionError, match='açılmamış'):
        pvp.submit_setup(session.session_id, 'a', payload)
    profile.highest_rating = 600
    session.engine.state.player_unlocked_modules['a'] = arena.unlocked_module_ids(profile.highest_rating)
    pvp.submit_setup(session.session_id, 'a', payload)
    pvp.submit_setup(session.session_id, 'b', PvPSetupPayload(arena.STARTER_IDS, (InitialModulePlacement('b-core','core',2,1),)))
    for player in ('a', 'b'):
        pvp.set_ready(session.session_id, player, True)
    pvp.start(session.session_id)
    before = session.engine.state.players['a'].circuit_credits
    session.engine._cmd_deploy_module('a', {'definition_id':'recoil_cannon'})
    gun = next(m for m in session.engine.state.players['a'].modules.values() if m.definition.id == 'recoil_cannon')
    assert gun.hp == 240 and gun.definition.base_damage == 50 and gun.definition.runtime_parameters['recoil_hp'] == 16
    assert session.engine.state.players['a'].circuit_credits == before - 4
    assert profile.circuit_credits == profile.flux_shards == 0


def test_owned_upgrade_and_talent_use_only_existing_earned_currency_and_survive_replay(admitted_collection):
    profiles, _, service = admitted_collection
    profile = profiles.get_or_create('test-earned-upgrades')
    profile.rating = profile.highest_rating = 600
    profile.module_shards['recoil_cannon'] = 2
    profile.circuit_credits, profile.flux_shards = 300, 0
    receipt = service.upgrade_module(profile, 'recoil_cannon', 'test-upgrade-1')
    assert profile.module_upgrade_levels['recoil_cannon'] == 1
    assert profile.module_shards['recoil_cannon'] == 0 and profile.circuit_credits == 0
    assert service.upgrade_module(profile, 'recoil_cannon', 'test-upgrade-1') == receipt
    profile.module_upgrade_levels['recoil_cannon'] = 8  # rare signature tier unlocks at level9
    profile.circuit_credits = 4000
    receipt = service.choose_module_talent(profile, 'recoil_cannon', '1', 'resilience', 'test-talent-1')
    assert profile.circuit_credits == 0 and profile.flux_shards == 0
    assert service.choose_module_talent(profile, 'recoil_cannon', '1', 'resilience', 'test-talent-1') == receipt
    assert profile.module_talents['recoil_cannon'] == {'1':'resilience'}
    item = card(service, profile)
    assert item['stats']['parameters']['recoil_hp'] == round(12 * 1.04**8)
    assert all(c['description_tr'] and c['description_en'] for node in item['talents'] for c in node['choices'])


def test_real_reward_delivery_rejects_locked_target_before_spending_and_preserves_earned_pieces(admitted_collection):
    from app.reward_delivery import apply_fixed_contents
    profiles, store, _ = admitted_collection
    profile = profiles.get_or_create('test-free-piece-owner')
    profile.rating = profile.highest_rating = 599
    rewards = dict(module_definition_id='recoil_cannon', module_shards=5, circuit_credits=10)
    before = (profile.circuit_credits, deepcopy(profile.module_shards))
    with pytest.raises(ValueError, match='hedefi uygun değil'):
        apply_fixed_contents(profile, rewards)
    assert (profile.circuit_credits, profile.module_shards) == before
    profile.highest_rating = 600
    profile.rating = 0
    apply_fixed_contents(profile, rewards)
    store.save_player(profile.player_id)
    profiles._profiles.clear()
    store.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)
    assert restored.module_shards['recoil_cannon'] == 5
    assert restored.circuit_credits == before[0] + 10
