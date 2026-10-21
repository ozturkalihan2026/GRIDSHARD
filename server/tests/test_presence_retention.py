import asyncio

from app.runtime_coordination import RuntimeCoordinator


def test_presence_refresh_does_not_copy_or_rescan_all_players_per_request():
    async def scenario():
        calls = 0
        def now():
            nonlocal calls
            calls += 1
            return 100.0
        coordinator = RuntimeCoordinator(None, now_func=now)
        storage = coordinator._online_until
        for player in range(2000):
            await coordinator.touch_player(str(player))
        assert coordinator._online_until is storage
        assert len(storage) == 2000
        assert calls <= 2001  # Previously >2 million clock calls / full-map copies.
    asyncio.run(scenario())


def test_presence_expiry_refresh_and_idle_cleanup_preserve_online_semantics():
    async def scenario():
        clock = [100.0]
        coordinator = RuntimeCoordinator(None, now_func=lambda: clock[0])
        await coordinator.touch_player("short", ttl_seconds=2)
        await coordinator.touch_player("renewed", ttl_seconds=10)
        clock[0] = 102
        assert not coordinator.player_online("short")
        assert coordinator.player_online("renewed")
        await coordinator.touch_player("renewed", ttl_seconds=30)
        clock[0] = 111
        await coordinator.touch_player("new", ttl_seconds=1)
        assert "short" not in coordinator._online_until
        assert coordinator.player_online("renewed")
        clock[0] = 133
        assert not coordinator.player_online("renewed")
        assert not coordinator._online_until
    asyncio.run(scenario())
