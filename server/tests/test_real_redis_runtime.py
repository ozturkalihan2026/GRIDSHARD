"""Only an explicitly local disposable Redis DB; never FLUSHDB/FLUSHALL."""
import asyncio
import os
from urllib.parse import urlsplit
from uuid import uuid4

import pytest

from app.runtime_coordination import RuntimeCoordinator


def test_real_redis_worker_presence_rate_limit_and_owner_fencing():
    url = os.environ.get("GRIDSHARD_TEST_REDIS_URL", "")
    if not url:
        pytest.skip("Gerçek izole Redis adresi yok.")
    parsed = urlsplit(url)
    if parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.path != "/15":
        pytest.fail("Redis testi yalnız yerel test DB 15'e bağlanır.")
    namespace = "gridshard-test:" + uuid4().hex

    async def scenario():
        from redis.asyncio import Redis
        first = RuntimeCoordinator(url, strict=True, namespace=namespace)
        second = RuntimeCoordinator(url, strict=True, namespace=namespace)
        inspector = Redis.from_url(url, decode_responses=True)
        try:
            await first.open()
            assert (await first.health())["ready"]
            with pytest.raises(RuntimeError):
                await second.open()
            await first.touch_player("a")
            assert await inspector.get(namespace + ":presence:a") == first.owner_id
            await first.touch_session("battle", ttl_seconds=300, player_ids=["a", "b"], websocket_base_url="wss://example.com")
            assert (await first.session_owner("battle"))["players"] == ["a", "b"]
            assert (await first.rate_limit("auth", "a", limit=1, window_seconds=60)).allowed
            assert not (await first.rate_limit("auth", "a", limit=1, window_seconds=60)).allowed
            await inspector.set(first.worker_key, second.owner_id, ex=30)
            with pytest.raises(RuntimeError):
                await first.renew_worker()
            assert not first.owns_worker
            await first.release_worker()
            assert await inspector.get(first.worker_key) == second.owner_id
            assert not (await first.health())["ready"]
        finally:
            await first.close()
            await second.close()
            keys = [key async for key in inspector.scan_iter(match=namespace + ":*")]
            if keys:
                await inspector.delete(*keys)
            await inspector.aclose()
    asyncio.run(scenario())
