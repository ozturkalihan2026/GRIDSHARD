"""Real isolated PostgreSQL: closeout/archive are one account transaction."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import timedelta

import pytest

from app.meta_progression import archive_and_soft_reset_season
from app.player_profile import PlayerProfileService
from app.postgres_repository import PostgresPlayerDataRepository
from app.postgres_repository import PostgresPool
from app.clean_install import ensure_clean_postgres_installation
from app.premium_reward_recovery import wallet_snapshot
from app import season_entitlements as rights
from test_season_entitlements import s1, earn, store, open_mail  # noqa: F401
from test_postgres_reward_entitlements import database  # noqa: F401
from test_server_backup import empty_database_pair, backup_tool  # noqa: F401


@pytest.fixture
def closing_db(s1, database):
    pool, owner, _ = database
    clock, service, profile, meta = s1
    profile.player_id = owner
    service._profiles = {owner: profile}
    data = store(service, PostgresPlayerDataRepository(pool))
    profile.storage_revision = data.repository.load(owner).revision
    earn(s1, tier=5)
    data.save_player(owner)
    clock[0] += timedelta(days=28)
    return pool, owner, data, s1


def reload_profile(pool, owner, clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    data = store(service, PostgresPlayerDataRepository(pool))
    data.load_player(owner)
    return data, service.get(owner)


def test_failure_after_closeout_save_rolls_back_then_restart_retries_once(closing_db):
    pool, owner, data, (clock, _, profile, meta) = closing_db
    before = data.repository.load(owner).to_dict()
    with pytest.raises(RuntimeError, match='after closeout save'):
        with pool.transaction():
            archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
            data.save_player(owner)
            raise RuntimeError('after closeout save')
    assert data.repository.load(owner).to_dict() == before
    data, profile = reload_profile(pool, owner, clock)
    assert not profile.season_archives and not profile.reward_inbox
    with pool.transaction():
        archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
        data.save_player(owner)
    data, restored = reload_profile(pool, owner, clock)
    assert len(restored.season_archives) == 1 and len(restored.reward_inbox) == 5
    with pool.transaction():
        message = next(m for m in restored.reward_inbox if m['message_id'].endswith(':free:5'))
        receipt = open_mail(restored, meta, message)
        data.save_player(owner)
    data, restored = reload_profile(pool, owner, clock)
    before_retry = data.repository.load(owner).to_dict()
    assert archive_and_soft_reset_season(restored, 'gridshard_waiting') is None
    message = next(m for m in restored.reward_inbox if m['message_id'].endswith(':free:5'))
    assert open_mail(restored, meta, message) == receipt
    assert data.repository.load(owner).to_dict() == before_retry


def test_real_backup_restore_keeps_closed_road_packages_and_first_open_receipt(s1, empty_database_pair, tmp_path):
    (source, target), pg_bin = empty_database_pair
    clock, service, profile, meta = s1
    pool = PostgresPool(source)
    pool.open()
    restored_pool = None
    try:
        installation = ensure_clean_postgres_installation(pool)
        data = store(service, PostgresPlayerDataRepository(pool))
        earn(s1, tier=5)
        clock[0] += timedelta(days=28)
        with pool.transaction():
            archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
            message = next(m for m in profile.reward_inbox if m['message_id'].endswith(':free:1'))
            first_receipt = open_mail(profile, meta, message)
            data.save_player(profile.player_id)
        before = data.repository.load(profile.player_id).to_dict()
        backup = tmp_path / 'closed-backup'
        backup_tool.backup(source, backup, pg_bin)
        backup_tool.restore(target, backup, tmp_path / 'restored-runtime', installation, pg_bin)
        restored_pool = PostgresPool(target)
        restored_pool.open()
        assert PostgresPlayerDataRepository(restored_pool).load(profile.player_id).to_dict() == before
        _, restored = reload_profile(restored_pool, profile.player_id, clock)
        claimed = next(m for m in restored.reward_inbox if m['message_id'].endswith(':free:1'))
        wallet = wallet_snapshot(restored)
        assert open_mail(restored, meta, claimed) == first_receipt
        assert wallet_snapshot(restored) == wallet
        pending = next(m for m in restored.reward_inbox if m['message_id'].endswith(':free:5'))
        receipt = open_mail(restored, meta, pending)
        assert receipt['reward_content_hash'] == restored.season_archives[0]['reward_state']['earned']['free:5']['content_hash']
        assert len(restored.season_archives) == 1
    finally:
        if restored_pool is not None:
            restored_pool.close()
        pool.close()


def test_concurrent_closeout_locks_preserve_one_archive_and_five_rights(closing_db):
    pool, owner, data, (clock, _, _, _) = closing_db

    def close(_):
        with pool.transaction() as connection:
            connection.execute('SELECT player_id FROM player_data WHERE player_id=%s FOR UPDATE', (owner,)).fetchone()
            local, profile = reload_profile(pool, owner, clock)
            archive = archive_and_soft_reset_season(profile, 'gridshard_waiting', archived_at=clock[0].isoformat())
            if archive is not None:
                local.save_player(owner)
            return archive is not None

    with ThreadPoolExecutor(max_workers=4) as workers:
        results = list(workers.map(close, range(8)))
    assert sum(results) == 1
    _, profile = reload_profile(pool, owner, clock)
    assert len(profile.season_archives) == 1
    assert len(profile.reward_inbox) == len({m['message_id'] for m in profile.reward_inbox}) == 5


def test_conflict_in_durable_mail_never_commits_reset_or_new_archive(closing_db):
    pool, owner, data, (clock, _, profile, _) = closing_db
    clock[0] -= timedelta(days=28)
    rights.queue_unclaimed(profile, now_iso=clock[0].isoformat())
    profile.reward_inbox[-1]['inventory_chest']['reward_content_hash'] = 'wrong-transfer'
    data.save_player(owner)
    clock[0] += timedelta(days=28)
    before = deepcopy(data.repository.load(owner).to_dict())
    with pytest.raises(rights.SeasonEntitlementError, match='aktar'):
        with pool.transaction():
            local, restored = reload_profile(pool, owner, clock)
            archive_and_soft_reset_season(restored, 'gridshard_waiting', archived_at=clock[0].isoformat())
            local.save_player(owner)
    assert data.repository.load(owner).to_dict() == before
