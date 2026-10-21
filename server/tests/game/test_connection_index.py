"""Match-local fanout must not scan unrelated sockets as concurrency grows."""
import asyncio

import pytest

from app.game.pvp_session import PvPSessionError
from app.game.pvp_websocket import PvPConnection, PvPConnectionRegistry, PvPWebSocketAdapter


class NoGlobalScan(dict):
    def values(self):
        raise AssertionError("fanout scanned every match")


def connection(key, session="match", player="a", **kwargs):
    return PvPConnection(key, session, player, socket=None, **kwargs)


def test_index_tracks_reconnect_replacement_pruning_and_clear():
    original = connection("a")
    registry = PvPConnectionRegistry({"a": original})
    assert registry.active_for_session("match") == (original,)
    with pytest.raises(PvPSessionError):
        registry.bind(connection("a", "other"))
    registry.bind(connection("b", player="b"))
    registry.unbind("a")
    assert registry.active_for_player("match", "a") == ()
    replacement = connection("a", "other")
    registry.bind(replacement)
    assert registry.active_for_session("other") == (replacement,)
    registry.unbind("b")
    assert registry.active_for_session("match") == ()
    assert registry.prune_disconnected(now=61) == 1
    assert registry.get("a") is replacement
    registry.clear()
    assert registry.active_for_session("other") == ()
    assert not registry.connections
    assert not registry._active_by_session


def test_many_finished_matches_leave_no_session_index_entries():
    registry = PvPConnectionRegistry()
    for match in range(2000):
        for player in ("a", "b"):
            key = f"{match}:{player}"
            registry.bind(connection(key, str(match), player))
            registry.unbind(key)
    assert not registry._active_by_session
    assert registry.prune_disconnected(now=61) == 4000
    assert not registry.connections


def test_fanout_only_visits_target_match_in_both_delivery_modes():
    async def scenario():
        registry = PvPConnectionRegistry()
        for match in range(1000):
            for player in ("a", "b"):
                registry.bind(connection(f"{match}:{player}", str(match), player))
        registry.connections = NoGlobalScan(registry.connections)
        adapter = PvPWebSocketAdapter(None, registry)
        visited = []

        async def send(key, **_kwargs):
            visited.append(key)
            return {}

        assert await adapter._broadcast("51", send) == 2
        assert visited == ["51:a", "51:b"]
        assert len(registry.active_for_player("51", "a")) == 1
        visited.clear()

        async def pump(item):
            visited.append(item.connection_id)
            item.pending_broadcasts.clear()
            item.broadcast_task = None

        adapter._pump_broadcasts = pump
        assert adapter._queue_broadcast("51", "snapshot") == 2
        tasks = [item.broadcast_task for item in registry.active_for_session("51")]
        await asyncio.gather(*tasks)
        assert visited == ["51:a", "51:b"]
        assert await adapter._broadcast("missing", send) == 0
    asyncio.run(scenario())
