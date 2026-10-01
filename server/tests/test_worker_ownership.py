import asyncio
from types import SimpleNamespace

import pytest
from fastapi.responses import JSONResponse

from app import main as gateway
from app.runtime_coordination import RuntimeCoordinator
from app.postgres_worker_guard import PostgresWorkerGuard
from test_postgres_social_api import social_db  # noqa: F401


def test_redis_worker_lease_fences_stale_owner_and_session_writes():
    from fakeredis.aioredis import FakeRedis

    async def scenario():
        clock = [100.0]
        redis = FakeRedis(decode_responses=True)
        first = RuntimeCoordinator(None, strict=True, now_func=lambda: clock[0])
        second = RuntimeCoordinator(None, strict=True, now_func=lambda: clock[0])
        first.redis = second.redis = redis
        try:
            await first.claim_worker()
            with pytest.raises(RuntimeError, match="Başka"):
                await second.claim_worker()
            await first.touch_session("match", ttl_seconds=300, player_ids=("a", "b"))
            assert (await first.session_owner("match"))["owner_id"] == first.owner_id
            await first.renew_worker()
            await redis.delete(first.worker_key)  # simulate expiry/replacement
            await second.claim_worker()
            with pytest.raises(RuntimeError, match="sahipliği"):
                await first.renew_worker()
            assert not first.owns_worker
            with pytest.raises(RuntimeError, match="etkin değil"):
                await first.touch_session("match", ttl_seconds=300)
            with pytest.raises(RuntimeError, match="başka bir worker"):
                await second.touch_session("match", ttl_seconds=300)
            await second.delete_session("match")
            assert await first.session_owner("match") is not None
            await first.release_worker()
            assert await redis.get(second.worker_key) == second.owner_id
            clock[0] += 29
            with pytest.raises(RuntimeError, match="süresi doldu"):
                await second.renew_worker()
            assert not (await second.health())["ready"]
        finally:
            await redis.aclose()
    asyncio.run(scenario())


def test_presence_expires_and_failed_write_does_not_mark_player_online():
    from fakeredis.aioredis import FakeRedis

    async def scenario():
        clock = [0.0]
        coordinator = RuntimeCoordinator(None, now_func=lambda: clock[0])
        coordinator.redis = FakeRedis(decode_responses=True)
        await coordinator.touch_player("a", ttl_seconds=10)
        assert coordinator.player_online("a")
        clock[0] = 11
        assert not coordinator.player_online("a")
        await coordinator.redis.aclose()
        class FailedRedis:
            async def set(self, *args, **kwargs):
                raise RuntimeError("offline")
        coordinator.redis = FailedRedis()
        with pytest.raises(RuntimeError):
            await coordinator.touch_player("b")
        assert not coordinator.player_online("b")
    asyncio.run(scenario())


def test_database_worker_lock_is_exclusive_and_released(social_db):
    pool, *_ = social_db
    first, second = PostgresWorkerGuard(pool), PostgresWorkerGuard(pool)
    try:
        first.acquire()
        first.check()
        with pytest.raises(RuntimeError, match="başka bir"):
            second.acquire()
        first.release()
        second.acquire()
        second.check()
        second.connection.close()
        with pytest.raises(RuntimeError, match="kaybedildi"):
            second.check()
    finally:
        first.release()
        second.release()


def test_production_health_has_failure_status_when_worker_not_ready(monkeypatch):
    monkeypatch.setattr(gateway, "RUNTIME_STRICT", True)
    monkeypatch.setattr(gateway, "postgres_worker_guard", SimpleNamespace(held=False))
    response = asyncio.run(gateway.health())
    assert isinstance(response, JSONResponse)
    assert response.status_code == 503


def test_startup_gate_failure_releases_guard_and_pool(monkeypatch):
    calls = []
    class Pool:
        def open(self): calls.append("open")
        def close(self): calls.append("close")
    class Guard:
        def acquire(self): calls.append("acquire")
        def release(self): calls.append("release")
    def fail_clean(*args):
        raise RuntimeError("not clean")
    monkeypatch.setattr(gateway, "RUNTIME_STRICT", True)
    monkeypatch.setattr(gateway, "postgres_pool", Pool())
    monkeypatch.setattr(gateway, "postgres_worker_guard", Guard())
    monkeypatch.setattr(gateway, "ensure_clean_postgres_installation", fail_clean)
    async def scenario():
        with pytest.raises(RuntimeError, match="not clean"):
            async with gateway.application_lifespan(gateway.app):
                pytest.fail("must not serve")
    asyncio.run(scenario())
    assert calls == ["open", "acquire", "release", "close"]
