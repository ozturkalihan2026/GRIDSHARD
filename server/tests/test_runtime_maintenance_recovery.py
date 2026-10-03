import asyncio
from types import SimpleNamespace
from app import main as gateway


def test_slow_cleanup_does_not_starve_independent_worker_lease(monkeypatch):
    async def scenario():
        original_sleep = asyncio.sleep
        async def fast_sleep(_delay):
            await original_sleep(0)
        blocked, renewed = asyncio.Event(), asyncio.Event()
        count = 0
        async def renew():
            nonlocal count
            count += 1
            if count >= 10:
                renewed.set()
        async def cleanup():
            await blocked.wait()
        monkeypatch.setattr(gateway, "RUNTIME_STRICT", True)
        monkeypatch.setattr(gateway, "runtime_coordinator", SimpleNamespace(owns_worker=True, renew_worker=renew))
        monkeypatch.setattr(gateway, "postgres_worker_guard", SimpleNamespace(check=lambda: None))
        monkeypatch.setattr(gateway, "_runtime_maintenance_pass", cleanup)
        monkeypatch.setattr(gateway.asyncio, "sleep", fast_sleep)
        tasks = [asyncio.create_task(gateway._runtime_worker_lease_loop()), asyncio.create_task(gateway._runtime_maintenance_loop())]
        try:
            await asyncio.wait_for(renewed.wait(), timeout=2)
            assert count >= 10 and not tasks[1].done()
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
    asyncio.run(scenario())


def test_maintenance_exception_retries_instead_of_dying(monkeypatch):
    async def scenario():
        original_sleep = asyncio.sleep
        async def fast_sleep(_delay):
            await original_sleep(0)
        done = asyncio.Event()
        count = 0
        async def maintenance():
            nonlocal count
            count += 1
            if count < 3:
                raise RuntimeError("stale session")
            done.set()
        monkeypatch.setattr(gateway, "RUNTIME_STRICT", False)
        monkeypatch.setattr(gateway, "_runtime_maintenance_pass", maintenance)
        monkeypatch.setattr(gateway.product_analytics_service, "prune_expired", lambda: None)
        monkeypatch.setattr(gateway.asyncio, "sleep", fast_sleep)
        task = asyncio.create_task(gateway._runtime_maintenance_loop())
        try:
            await asyncio.wait_for(done.wait(), timeout=2)
            assert count >= 3 and not task.done()
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
    asyncio.run(scenario())
