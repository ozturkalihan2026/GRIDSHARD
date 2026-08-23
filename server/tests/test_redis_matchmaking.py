import asyncio

import pytest

fakeredis = pytest.importorskip("fakeredis.aioredis")

from app.matchmaking import MatchmakingError, RedisMatchmakingService


def run(coroutine):
    return asyncio.run(coroutine)


def services(*, queue_ttl_seconds=180, match_ttl_seconds=900):
    redis = fakeredis.FakeRedis(decode_responses=True)
    first = RedisMatchmakingService(
        redis,
        namespace="test-gridshard",
        instance_id="node-a",
        websocket_base_url="wss://node-a.example.test",
        queue_ttl_seconds=queue_ttl_seconds,
        match_ttl_seconds=match_ttl_seconds,
    )
    second = RedisMatchmakingService(
        redis,
        namespace="test-gridshard",
        instance_id="node-b",
        websocket_base_url="wss://node-b.example.test",
        queue_ttl_seconds=queue_ttl_seconds,
        match_ttl_seconds=match_ttl_seconds,
    )
    return redis, first, second


def enqueue(service, player_id, rating):
    return service.enqueue(
        player_id,
        rating=rating,
        league_name_tr="Gümüş",
        level=1,
    )


def test_match_is_discovered_across_instances_and_routes_to_owner():
    async def scenario():
        redis, node_a, node_b = services()
        try:
            await enqueue(node_a, "a", 1000)
            await enqueue(node_b, "b", 1040)

            pair = await node_b.try_match("b")
            assert pair is not None
            assert pair.owner_instance_id == "node-b"
            assert pair.websocket_base_url == "wss://node-b.example.test"
            assert pair.ready is False

            discovered = await node_a.matched_pair_for("a")
            assert discovered is not None
            assert discovered.match_id == pair.match_id
            assert (await node_a.queue_snapshot("a"))["provisioning"] is True

            ready = await node_b.mark_ready(pair)
            assert ready.ready is True
            snapshot = await node_a.queue_snapshot("a")
            assert snapshot["matched"] is True
            assert snapshot["session_id"] == pair.match_id
            assert snapshot["match_owner"] == "node-b"
            assert snapshot["websocket_base_url"] == "wss://node-b.example.test"
        finally:
            await redis.aclose()

    run(scenario())


def test_concurrent_match_attempts_create_only_one_pair():
    async def scenario():
        redis, node_a, node_b = services()
        try:
            await enqueue(node_a, "a", 1000)
            await enqueue(node_a, "b", 1080)
            await enqueue(node_b, "c", 1010)

            first, second = await asyncio.gather(
                node_a.try_match("a"),
                node_b.try_match("a"),
            )
            pairs = [pair for pair in (first, second) if pair is not None]
            assert len(pairs) == 2
            assert {pair.match_id for pair in pairs} == {pairs[0].match_id}
            assert {pairs[0].player_a_id, pairs[0].player_b_id} == {"a", "c"}
            assert await redis.hlen(node_a._keys[4]) == 1
            assert await redis.hlen(node_a._keys[3]) == 2
        finally:
            await redis.aclose()

    run(scenario())


def test_human_match_and_ai_fallback_race_has_single_winner():
    async def scenario():
        redis, node_a, node_b = services()
        try:
            await enqueue(node_a, "a", 1000)
            await enqueue(node_b, "b", 1000)

            ai_result, human_result = await asyncio.gather(
                node_a.match_with_ai("a"),
                node_b.try_match("b"),
            )
            stored_for_a = await node_b.matched_pair_for("a")
            assert stored_for_a is not None
            assert stored_for_a.match_id == ai_result.match_id
            if human_result is not None:
                assert human_result.match_id == stored_for_a.match_id
            assert await redis.hlen(node_a._keys[4]) == 1
        finally:
            await redis.aclose()

    run(scenario())


def test_only_match_owner_can_mark_session_ready():
    async def scenario():
        redis, node_a, node_b = services()
        try:
            await enqueue(node_a, "a", 1000)
            await enqueue(node_b, "b", 1000)
            pair = await node_a.try_match("a")
            assert pair is not None
            with pytest.raises(MatchmakingError):
                await node_b.mark_ready(pair)
            assert (await node_a.matched_pair_for("a")).ready is False
        finally:
            await redis.aclose()

    run(scenario())


def test_queue_and_match_ttls_are_cleaned_from_all_indexes():
    async def scenario():
        redis, node_a, node_b = services(
            queue_ttl_seconds=1,
            match_ttl_seconds=0.001,
        )
        try:
            await enqueue(node_a, "queued", 1000)
            await redis.zadd(node_a._keys[2], {"queued": 0})
            cleaned = await node_b.cleanup_expired()
            assert cleaned["queue_entries"] == 1
            assert (await node_a.queue_snapshot("queued"))["queued"] is False

            await enqueue(node_a, "a", 1000)
            await enqueue(node_b, "b", 1000)
            pair = await node_b.try_match("b")
            assert pair is not None
            await asyncio.sleep(0.01)
            cleaned = await node_a.cleanup_expired()
            assert cleaned["matches"] == 1
            assert await node_a.matched_pair_for("a") is None
            assert await node_b.matched_pair_for("b") is None
        finally:
            await redis.aclose()

    run(scenario())


def test_all_redis_keys_share_one_cluster_hash_slot_tag():
    redis, node_a, _ = services()
    try:
        assert all("{matchmaking}" in key for key in node_a._keys)
    finally:
        run(redis.aclose())


def test_gateway_provisions_owner_session_and_returns_websocket_route():
    async def scenario():
        from app import main as gateway

        redis = fakeredis.FakeRedis(decode_responses=True)
        original_redis = gateway.runtime_coordinator.redis
        original_instance = gateway.redis_matchmaking_service.instance_id
        original_ws_base = gateway.redis_matchmaking_service.websocket_base_url
        gateway.runtime_coordinator.redis = redis
        gateway.redis_matchmaking_service.instance_id = "gateway-node"
        gateway.redis_matchmaking_service.websocket_base_url = (
            "wss://gateway-node.example.test"
        )
        gateway.pvp_service._sessions.clear()
        gateway.player_profile_service._profiles.clear()
        try:
            first = await gateway.matchmaking_join(
                gateway.MatchmakingJoinRequest(player_id="gateway-a")
            )
            assert first["matched"] is False

            second = await gateway.matchmaking_join(
                gateway.MatchmakingJoinRequest(player_id="gateway-b")
            )
            assert second["matched"] is True
            assert second["match_owner"] == "gateway-node"
            assert second["websocket_base_url"] == (
                "wss://gateway-node.example.test"
            )

            session = gateway.pvp_service.get_session(second["session_id"])
            assert set(session.slots) == {"gateway-a", "gateway-b"}

            discovered = await gateway.matchmaking_status("gateway-a")
            assert discovered["matched"] is True
            assert discovered["session_id"] == second["session_id"]
        finally:
            gateway.runtime_coordinator.redis = original_redis
            gateway.redis_matchmaking_service.instance_id = original_instance
            gateway.redis_matchmaking_service.websocket_base_url = original_ws_base
            await redis.aclose()

    run(scenario())
