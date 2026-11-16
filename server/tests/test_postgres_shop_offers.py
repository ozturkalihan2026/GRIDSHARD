"""Real PostgreSQL persistence for previews; no purchase API is implied."""
from concurrent.futures import ThreadPoolExecutor

import pytest

from app import shop_offers as offers
from app.player_profile import PlayerProfileService
from app.player_data_store import PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.postgres_repository import PostgresPool, PostgresPlayerDataRepository
from app.clean_install import ensure_clean_postgres_installation
from test_free_economy_rewards import clock  # noqa: F401
from test_postgres_reward_entitlements import database  # noqa: F401
from test_server_backup import empty_database_pair, backup_tool  # noqa: F401
from test_shop_offers import catalog, preview, IDENTITY


def local_store(pool, owner, clock):
    profiles = PlayerProfileService(now_func=lambda: clock[0])
    data = PlayerDataStoreService(profile_service=profiles, settings_service=PlayerSettingsService(),
        statistics_service=PlayerStatisticsService(), repository=PostgresPlayerDataRepository(pool))
    data.load_player(owner)
    return data, profiles.get_or_create(owner)


def test_preview_save_failure_rolls_back_pin_and_restart_reads_committed_target(database, clock):
    pool, owner, _ = database
    repository = PostgresPlayerDataRepository(pool)
    before = repository.load(owner).to_dict()
    c = catalog()
    with pytest.raises(RuntimeError, match='after pin save'):
        with pool.transaction():
            data, p = local_store(pool, owner, clock)
            preview(p, c, clock[0])
            data.save_player(owner)
            raise RuntimeError('after pin save')
    assert repository.load(owner).to_dict() == before
    with pool.transaction():
        data, p = local_store(pool, owner, clock)
        result = preview(p, c, clock[0])
        data.save_player(owner)
    _, restored = local_store(pool, owner, clock)
    assert preview(restored, c, clock[0]) == result
    assert len(restored.shop_offer_state['targets']) == 1


def test_parallel_preview_transactions_pin_once_across_pool_growth(database, clock):
    pool, owner, _ = database
    c = catalog()

    def read(index):
        with pool.transaction() as connection:
            connection.execute('SELECT player_id FROM player_data WHERE player_id=%s FOR UPDATE', (owner,)).fetchone()
            data, p = local_store(pool, owner, clock)
            if index % 2:
                p.rating = p.highest_rating = 10000
            result = preview(p, c, clock[0])
            data.save_player(owner)
            return result

    with ThreadPoolExecutor(max_workers=4) as workers:
        results = list(workers.map(read, range(8)))
    assert all(r == results[0] for r in results)
    _, p = local_store(pool, owner, clock)
    assert len(p.shop_offer_state['targets']) == 1


def test_real_backup_restore_preserves_preview_price_target_hash_and_private_pin(clock, empty_database_pair, tmp_path):
    (source, target), pg_bin = empty_database_pair
    pool = PostgresPool(source)
    pool.open()
    restored_pool = None
    try:
        installation = ensure_clean_postgres_installation(pool)
        profiles = PlayerProfileService(now_func=lambda: clock[0])
        data = PlayerDataStoreService(profile_service=profiles, settings_service=PlayerSettingsService(),
            statistics_service=PlayerStatisticsService(), repository=PostgresPlayerDataRepository(pool))
        p = profiles.get_or_create('shop01-backup')
        with pool.transaction():
            original = preview(p, catalog(), clock[0])
            data.save_player(p.player_id)
        snapshot = data.repository.load(p.player_id).to_dict()
        backup_tool.backup(source, tmp_path/'backup', pg_bin)
        backup_tool.restore(target, tmp_path/'backup', tmp_path/'runtime', installation, pg_bin)
        restored_pool = PostgresPool(target)
        restored_pool.open()
        assert PostgresPlayerDataRepository(restored_pool).load(p.player_id).to_dict() == snapshot
        _, restored = local_store(restored_pool, p.player_id, clock)
        assert offers.preview(restored, catalog(), IDENTITY, 1, moment=clock[0], secret=b'rotated-shop01-restored-key-32-bytes') == original
        assert restored.shop_offer_state == p.shop_offer_state
        assert 'shop_offer_state' not in restored.to_view()
    finally:
        if restored_pool is not None:
            restored_pool.close()
        pool.close()
