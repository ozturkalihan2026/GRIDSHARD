from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Callable
from uuid import uuid4


BASE_RATING_WINDOW = 100
RATING_WINDOW_EXPANSION = 50
EXPANSION_INTERVAL_SECONDS = 10
MAX_RATING_WINDOW = 400


@dataclass(slots=True)
class MatchmakingEntry:
    player_id: str
    rating: int
    league_name_tr: str
    level: int
    joined_at: float


@dataclass(slots=True, frozen=True)
class MatchmakingPair:
    match_id: str
    player_a_id: str
    player_b_id: str
    rating_difference: int
    matched_at: float = 0.0
    opponent_type: str = "human"
    owner_instance_id: str = ""
    websocket_base_url: str = ""
    ready: bool = True


class MatchmakingError(ValueError):
    pass


class MatchmakingService:
    def __init__(
        self,
        *,
        now_func: Callable[[], float],
    ):
        self.now_func = now_func
        self._queue: dict[str, MatchmakingEntry] = {}
        self._matches_by_player: dict[
            str,
            MatchmakingPair,
        ] = {}

    def enqueue(
        self,
        player_id: str,
        *,
        rating: int,
        league_name_tr: str,
        level: int,
    ) -> MatchmakingEntry:
        if not player_id:
            raise MatchmakingError(
                "Oyuncu kimliği boş olamaz."
            )
        if player_id in self._queue:
            return self._queue[player_id]

        entry = MatchmakingEntry(
            player_id=player_id,
            rating=max(0, int(rating)),
            league_name_tr=league_name_tr,
            level=max(1, int(level)),
            joined_at=self.now_func(),
        )
        self._queue[player_id] = entry
        return entry

    def cancel(
        self,
        player_id: str,
    ) -> bool:
        return self._queue.pop(
            player_id,
            None,
        ) is not None

    def queued(
        self,
        player_id: str,
    ) -> bool:
        return player_id in self._queue

    def accepted_rating_window(
        self,
        entry: MatchmakingEntry,
    ) -> int:
        waited = max(
            0.0,
            self.now_func() - entry.joined_at,
        )
        expansions = int(
            waited
            // EXPANSION_INTERVAL_SECONDS
        )
        return min(
            MAX_RATING_WINDOW,
            BASE_RATING_WINDOW
            + expansions
            * RATING_WINDOW_EXPANSION,
        )

    def try_match(
        self,
        player_id: str,
    ) -> MatchmakingPair | None:
        if player_id not in self._queue:
            raise MatchmakingError(
                "Oyuncu eşleştirme kuyruğunda değil."
            )

        source = self._queue[player_id]
        source_window = self.accepted_rating_window(
            source
        )

        candidates = []
        for candidate in self._queue.values():
            if candidate.player_id == player_id:
                continue

            candidate_window = (
                self.accepted_rating_window(
                    candidate
                )
            )
            difference = abs(
                source.rating
                - candidate.rating
            )

            if (
                difference <= source_window
                and difference
                <= candidate_window
            ):
                candidates.append(
                    (
                        difference,
                        candidate.joined_at,
                        candidate.player_id,
                        candidate,
                    )
                )

        if not candidates:
            return None

        candidates.sort(
            key=lambda item: (
                item[0],
                item[1],
                item[2],
            )
        )
        candidate = candidates[0][3]

        self._queue.pop(
            source.player_id,
            None,
        )
        self._queue.pop(
            candidate.player_id,
            None,
        )

        pair = MatchmakingPair(
            match_id=f"mm-{uuid4().hex}",
            player_a_id=source.player_id,
            player_b_id=candidate.player_id,
            rating_difference=abs(
                source.rating
                - candidate.rating
            ),
            matched_at=self.now_func(),
        )

        self._matches_by_player[
            pair.player_a_id
        ] = pair
        self._matches_by_player[
            pair.player_b_id
        ] = pair

        return pair

    def match_with_ai(
        self,
        player_id: str,
    ) -> MatchmakingPair:
        """10 saniyelik insan aramasından sonra kuyruğu AI rakiple kapatır."""
        if player_id not in self._queue:
            existing = self.matched_pair_for(player_id)
            if existing is not None:
                return existing
            raise MatchmakingError(
                "Oyuncu AI eşleştirmesi için kuyrukta değil."
            )

        source = self._queue.pop(player_id)
        match_id = f"local-ai-match-{uuid4().hex}"
        ai_player_id = f"{match_id}-opponent"
        pair = MatchmakingPair(
            match_id=match_id,
            player_a_id=source.player_id,
            player_b_id=ai_player_id,
            rating_difference=0,
            matched_at=self.now_func(),
            opponent_type="ai",
        )
        self._matches_by_player[pair.player_a_id] = pair
        self._matches_by_player[pair.player_b_id] = pair
        return pair

    def matched_pair_for(
        self,
        player_id: str,
    ) -> MatchmakingPair | None:
        return self._matches_by_player.get(
            player_id
        )

    def clear_match(
        self,
        player_id: str,
    ) -> None:
        pair = self._matches_by_player.get(
            player_id
        )
        if pair is None:
            return

        self._matches_by_player.pop(
            pair.player_a_id,
            None,
        )
        self._matches_by_player.pop(
            pair.player_b_id,
            None,
        )

    def cleanup_expired(
        self,
        *,
        queue_ttl_seconds: float = 180.0,
        match_ttl_seconds: float = 900.0,
    ) -> dict[str, int]:
        now = self.now_func()
        expired_queue = [
            player_id
            for player_id, entry in self._queue.items()
            if now - entry.joined_at >= queue_ttl_seconds
        ]
        for player_id in expired_queue:
            self._queue.pop(player_id, None)

        unique_pairs = {
            pair.match_id: pair
            for pair in self._matches_by_player.values()
        }
        expired_matches = [
            pair
            for pair in unique_pairs.values()
            if now - pair.matched_at >= match_ttl_seconds
        ]
        for pair in expired_matches:
            self.clear_match(pair.player_a_id)

        return {
            "queue_entries": len(expired_queue),
            "matches": len(expired_matches),
        }

    def queue_snapshot(
        self,
        player_id: str,
    ) -> dict:
        pair = self.matched_pair_for(
            player_id
        )
        if pair is not None:
            return {
                "queued": False,
                "matched": True,
                "player_id": player_id,
                "session_id": pair.match_id,
                "players": [
                    pair.player_a_id,
                    pair.player_b_id,
                ],
                "rating_difference": (
                    pair.rating_difference
                ),
                "opponent_type": pair.opponent_type,
            }

        entry = self._queue.get(
            player_id
        )
        if entry is None:
            return {
                "queued": False,
                "matched": False,
                "player_id": player_id,
            }

        waited_seconds = max(
            0,
            int(
                self.now_func()
                - entry.joined_at
            ),
        )

        return {
            "queued": True,
            "matched": False,
            "player_id": entry.player_id,
            "rating": entry.rating,
            "league_name_tr": (
                entry.league_name_tr
            ),
            "level": entry.level,
            "waited_seconds": (
                waited_seconds
            ),
            "accepted_rating_window": (
                self.accepted_rating_window(
                    entry
                )
            ),
        }


_REDIS_CLEANUP_LUA = r"""
local now_parts = redis.call('TIME')
local now_ms = tonumber(now_parts[1]) * 1000
    + math.floor(tonumber(now_parts[2]) / 1000)

local expired_players = redis.call(
    'ZRANGEBYSCORE', KEYS[3], '-inf', now_ms
)
for _, expired_player_id in ipairs(expired_players) do
    redis.call('ZREM', KEYS[1], expired_player_id)
    redis.call('ZREM', KEYS[3], expired_player_id)
    redis.call('HDEL', KEYS[2], expired_player_id)
end

local expired_match_ids = redis.call(
    'ZRANGEBYSCORE', KEYS[6], '-inf', now_ms
)
for _, expired_match_id in ipairs(expired_match_ids) do
    local expired_match_raw = redis.call(
        'HGET', KEYS[5], expired_match_id
    )
    if expired_match_raw then
        local expired_match = cjson.decode(expired_match_raw)
        local mapped_a = redis.call(
            'HGET', KEYS[4], expired_match.player_a_id
        )
        if mapped_a == expired_match_id then
            redis.call(
                'HDEL', KEYS[4], expired_match.player_a_id
            )
        end
        local mapped_b = redis.call(
            'HGET', KEYS[4], expired_match.player_b_id
        )
        if mapped_b == expired_match_id then
            redis.call(
                'HDEL', KEYS[4], expired_match.player_b_id
            )
        end
    end
    redis.call('HDEL', KEYS[5], expired_match_id)
    redis.call('ZREM', KEYS[6], expired_match_id)
end
"""


_REDIS_ENQUEUE_LUA = _REDIS_CLEANUP_LUA + r"""
local player_id = ARGV[1]
local match_id = redis.call('HGET', KEYS[4], player_id)
if match_id then
    local match_raw = redis.call('HGET', KEYS[5], match_id)
    if match_raw then
        return {'matched', match_raw}
    end
    redis.call('HDEL', KEYS[4], player_id)
end

local existing_entry = redis.call('HGET', KEYS[2], player_id)
if existing_entry then
    return {'queued', existing_entry}
end

local entry = {
    player_id = player_id,
    rating = tonumber(ARGV[2]),
    league_name_tr = ARGV[3],
    level = tonumber(ARGV[4]),
    joined_at_ms = now_ms
}
local entry_raw = cjson.encode(entry)
redis.call('HSET', KEYS[2], player_id, entry_raw)
redis.call('ZADD', KEYS[1], entry.rating, player_id)
redis.call(
    'ZADD', KEYS[3], now_ms + tonumber(ARGV[5]), player_id
)
return {'queued', entry_raw}
"""


_REDIS_TRY_MATCH_LUA = _REDIS_CLEANUP_LUA + r"""
local player_id = ARGV[1]
local existing_match_id = redis.call('HGET', KEYS[4], player_id)
if existing_match_id then
    local existing_match = redis.call(
        'HGET', KEYS[5], existing_match_id
    )
    if existing_match then
        return {'matched', existing_match}
    end
    redis.call('HDEL', KEYS[4], player_id)
end

local source_raw = redis.call('HGET', KEYS[2], player_id)
if not source_raw then
    return {'missing'}
end

local source = cjson.decode(source_raw)
local base_window = tonumber(ARGV[6])
local expansion = tonumber(ARGV[7])
local interval_ms = tonumber(ARGV[8])
local max_window = tonumber(ARGV[9])

local function accepted_window(joined_at_ms)
    local waited_ms = math.max(0, now_ms - joined_at_ms)
    local expansions = math.floor(waited_ms / interval_ms)
    return math.min(
        max_window,
        base_window + expansions * expansion
    )
end

local source_window = accepted_window(source.joined_at_ms)
local candidate_ids = redis.call(
    'ZRANGEBYSCORE',
    KEYS[1],
    source.rating - max_window,
    source.rating + max_window
)
local best = nil
local best_difference = nil

for _, candidate_id in ipairs(candidate_ids) do
    if candidate_id ~= player_id then
        local candidate_raw = redis.call(
            'HGET', KEYS[2], candidate_id
        )
        if not candidate_raw then
            redis.call('ZREM', KEYS[1], candidate_id)
            redis.call('ZREM', KEYS[3], candidate_id)
        else
            local candidate = cjson.decode(candidate_raw)
            local difference = math.abs(
                source.rating - candidate.rating
            )
            local candidate_window = accepted_window(
                candidate.joined_at_ms
            )
            local is_better = best == nil
                or difference < best_difference
                or (
                    difference == best_difference
                    and candidate.joined_at_ms < best.joined_at_ms
                )
                or (
                    difference == best_difference
                    and candidate.joined_at_ms == best.joined_at_ms
                    and candidate.player_id < best.player_id
                )
            if difference <= source_window
                and difference <= candidate_window
                and is_better then
                best = candidate
                best_difference = difference
            end
        end
    end
end

if not best then
    return {'waiting'}
end

redis.call('ZREM', KEYS[1], source.player_id, best.player_id)
redis.call('ZREM', KEYS[3], source.player_id, best.player_id)
redis.call('HDEL', KEYS[2], source.player_id, best.player_id)

local pair = {
    match_id = ARGV[2],
    player_a_id = source.player_id,
    player_b_id = best.player_id,
    rating_difference = best_difference,
    matched_at_ms = now_ms,
    opponent_type = 'human',
    owner_instance_id = ARGV[3],
    websocket_base_url = ARGV[4],
    ready = false
}
local pair_raw = cjson.encode(pair)
redis.call('HSET', KEYS[5], pair.match_id, pair_raw)
redis.call('HSET', KEYS[4], pair.player_a_id, pair.match_id)
redis.call('HSET', KEYS[4], pair.player_b_id, pair.match_id)
redis.call(
    'ZADD', KEYS[6], now_ms + tonumber(ARGV[5]), pair.match_id
)
return {'matched', pair_raw}
"""


_REDIS_MATCH_WITH_AI_LUA = _REDIS_CLEANUP_LUA + r"""
local player_id = ARGV[1]
local existing_match_id = redis.call('HGET', KEYS[4], player_id)
if existing_match_id then
    local existing_match = redis.call(
        'HGET', KEYS[5], existing_match_id
    )
    if existing_match then
        return {'matched', existing_match}
    end
    redis.call('HDEL', KEYS[4], player_id)
end

local source_raw = redis.call('HGET', KEYS[2], player_id)
if not source_raw then
    return {'missing'}
end

redis.call('ZREM', KEYS[1], player_id)
redis.call('ZREM', KEYS[3], player_id)
redis.call('HDEL', KEYS[2], player_id)

local pair = {
    match_id = ARGV[2],
    player_a_id = player_id,
    player_b_id = ARGV[3],
    rating_difference = 0,
    matched_at_ms = now_ms,
    opponent_type = 'ai',
    owner_instance_id = ARGV[4],
    websocket_base_url = ARGV[5],
    ready = false
}
local pair_raw = cjson.encode(pair)
redis.call('HSET', KEYS[5], pair.match_id, pair_raw)
redis.call('HSET', KEYS[4], pair.player_a_id, pair.match_id)
redis.call('HSET', KEYS[4], pair.player_b_id, pair.match_id)
redis.call(
    'ZADD', KEYS[6], now_ms + tonumber(ARGV[6]), pair.match_id
)
return {'matched', pair_raw}
"""


_REDIS_SNAPSHOT_LUA = _REDIS_CLEANUP_LUA + r"""
local player_id = ARGV[1]
local match_id = redis.call('HGET', KEYS[4], player_id)
if match_id then
    local match_raw = redis.call('HGET', KEYS[5], match_id)
    if match_raw then
        return {'matched', match_raw, tostring(now_ms)}
    end
    redis.call('HDEL', KEYS[4], player_id)
end

local entry_raw = redis.call('HGET', KEYS[2], player_id)
if entry_raw then
    return {'queued', entry_raw, tostring(now_ms)}
end
return {'missing', '', tostring(now_ms)}
"""


_REDIS_CANCEL_LUA = _REDIS_CLEANUP_LUA + r"""
local player_id = ARGV[1]
if redis.call('HEXISTS', KEYS[4], player_id) == 1 then
    return 0
end
local removed = redis.call('HDEL', KEYS[2], player_id)
redis.call('ZREM', KEYS[1], player_id)
redis.call('ZREM', KEYS[3], player_id)
return removed
"""


_REDIS_CLEAR_MATCH_LUA = _REDIS_CLEANUP_LUA + r"""
local player_id = ARGV[1]
local match_id = redis.call('HGET', KEYS[4], player_id)
if not match_id then
    return 0
end

local pair_raw = redis.call('HGET', KEYS[5], match_id)
if pair_raw then
    local pair = cjson.decode(pair_raw)
    local mapped_a = redis.call('HGET', KEYS[4], pair.player_a_id)
    if mapped_a == match_id then
        redis.call('HDEL', KEYS[4], pair.player_a_id)
    end
    local mapped_b = redis.call('HGET', KEYS[4], pair.player_b_id)
    if mapped_b == match_id then
        redis.call('HDEL', KEYS[4], pair.player_b_id)
    end
end
redis.call('HDEL', KEYS[5], match_id)
redis.call('ZREM', KEYS[6], match_id)
return 1
"""


_REDIS_MARK_READY_LUA = r"""
local match_id = ARGV[1]
local owner_instance_id = ARGV[2]
local pair_raw = redis.call('HGET', KEYS[5], match_id)
if not pair_raw then
    return nil
end
local pair = cjson.decode(pair_raw)
if pair.owner_instance_id ~= owner_instance_id then
    return nil
end
pair.ready = true
local updated_raw = cjson.encode(pair)
redis.call('HSET', KEYS[5], match_id, updated_raw)
return updated_raw
"""


_REDIS_CLEANUP_ONLY_LUA = _REDIS_CLEANUP_LUA + r"""
return {#expired_players, #expired_match_ids}
"""


class RedisMatchmakingService:
    """Redis üzerinde çok süreçli, atomik eşleştirme deposu."""

    def __init__(
        self,
        redis_client,
        *,
        namespace: str = "gridshard",
        instance_id: str,
        websocket_base_url: str = "",
        queue_ttl_seconds: int = 180,
        match_ttl_seconds: int = 900,
    ):
        self._redis_client = redis_client
        self.instance_id = instance_id
        self.websocket_base_url = websocket_base_url.strip().rstrip("/")
        self.queue_ttl_ms = max(1, int(queue_ttl_seconds * 1000))
        self.match_ttl_ms = max(1, int(match_ttl_seconds * 1000))
        key_root = f"{namespace}:{{matchmaking}}"
        self._keys = (
            f"{key_root}:queue",
            f"{key_root}:entries",
            f"{key_root}:queue-expiry",
            f"{key_root}:player-matches",
            f"{key_root}:matches",
            f"{key_root}:match-expiry",
        )

    async def _eval(self, script: str, *args):
        redis_client = (
            self._redis_client()
            if callable(self._redis_client)
            else self._redis_client
        )
        if redis_client is None:
            raise RuntimeError("Redis eşleştirme bağlantısı hazır değil.")
        return await redis_client.eval(
            script,
            len(self._keys),
            *self._keys,
            *args,
        )

    @staticmethod
    def _entry_from_raw(raw: str) -> MatchmakingEntry:
        payload = json.loads(raw)
        return MatchmakingEntry(
            player_id=str(payload["player_id"]),
            rating=max(0, int(payload["rating"])),
            league_name_tr=str(payload["league_name_tr"]),
            level=max(1, int(payload["level"])),
            joined_at=float(payload["joined_at_ms"]) / 1000.0,
        )

    @staticmethod
    def _pair_from_raw(raw: str) -> MatchmakingPair:
        payload = json.loads(raw)
        return MatchmakingPair(
            match_id=str(payload["match_id"]),
            player_a_id=str(payload["player_a_id"]),
            player_b_id=str(payload["player_b_id"]),
            rating_difference=max(0, int(payload["rating_difference"])),
            matched_at=float(payload["matched_at_ms"]) / 1000.0,
            opponent_type=str(payload.get("opponent_type", "human")),
            owner_instance_id=str(payload.get("owner_instance_id", "")),
            websocket_base_url=str(payload.get("websocket_base_url", "")),
            ready=bool(payload.get("ready", False)),
        )

    async def enqueue(
        self,
        player_id: str,
        *,
        rating: int,
        league_name_tr: str,
        level: int,
    ) -> MatchmakingEntry | MatchmakingPair:
        if not player_id:
            raise MatchmakingError("Oyuncu kimliği boş olamaz.")
        result = await self._eval(
            _REDIS_ENQUEUE_LUA,
            player_id,
            max(0, int(rating)),
            league_name_tr,
            max(1, int(level)),
            self.queue_ttl_ms,
        )
        if result[0] == "matched":
            return self._pair_from_raw(result[1])
        return self._entry_from_raw(result[1])

    async def try_match(self, player_id: str) -> MatchmakingPair | None:
        result = await self._eval(
            _REDIS_TRY_MATCH_LUA,
            player_id,
            f"mm-{uuid4().hex}",
            self.instance_id,
            self.websocket_base_url,
            self.match_ttl_ms,
            BASE_RATING_WINDOW,
            RATING_WINDOW_EXPANSION,
            EXPANSION_INTERVAL_SECONDS * 1000,
            MAX_RATING_WINDOW,
        )
        if result[0] == "matched":
            return self._pair_from_raw(result[1])
        if result[0] == "missing":
            existing = await self.matched_pair_for(player_id)
            if existing is not None:
                return existing
            raise MatchmakingError("Oyuncu eşleştirme kuyruğunda değil.")
        return None

    async def match_with_ai(self, player_id: str) -> MatchmakingPair:
        match_id = f"local-ai-match-{uuid4().hex}"
        result = await self._eval(
            _REDIS_MATCH_WITH_AI_LUA,
            player_id,
            match_id,
            f"{match_id}-opponent",
            self.instance_id,
            self.websocket_base_url,
            self.match_ttl_ms,
        )
        if result[0] == "matched":
            return self._pair_from_raw(result[1])
        raise MatchmakingError(
            "Oyuncu AI eşleştirmesi için kuyrukta değil."
        )

    async def matched_pair_for(
        self,
        player_id: str,
    ) -> MatchmakingPair | None:
        result = await self._eval(_REDIS_SNAPSHOT_LUA, player_id)
        if result[0] != "matched":
            return None
        return self._pair_from_raw(result[1])

    async def mark_ready(self, pair: MatchmakingPair) -> MatchmakingPair:
        raw = await self._eval(
            _REDIS_MARK_READY_LUA,
            pair.match_id,
            self.instance_id,
        )
        if raw is None:
            raise MatchmakingError(
                "Eşleşme başka bir sunucuya ait veya süresi dolmuş."
            )
        return self._pair_from_raw(raw)

    async def cancel(self, player_id: str) -> bool:
        removed = await self._eval(_REDIS_CANCEL_LUA, player_id)
        return bool(int(removed))

    async def clear_match(self, player_id: str) -> bool:
        removed = await self._eval(_REDIS_CLEAR_MATCH_LUA, player_id)
        return bool(int(removed))

    async def cleanup_expired(self) -> dict[str, int]:
        queue_count, match_count = await self._eval(
            _REDIS_CLEANUP_ONLY_LUA
        )
        return {
            "queue_entries": int(queue_count),
            "matches": int(match_count),
        }

    async def queue_snapshot(self, player_id: str) -> dict:
        result = await self._eval(_REDIS_SNAPSHOT_LUA, player_id)
        state = result[0]
        if state == "matched":
            pair = self._pair_from_raw(result[1])
            if not pair.ready:
                return {
                    "queued": True,
                    "matched": False,
                    "provisioning": True,
                    "player_id": player_id,
                    "session_id": pair.match_id,
                }
            return {
                "queued": False,
                "matched": True,
                "player_id": player_id,
                "session_id": pair.match_id,
                "players": [pair.player_a_id, pair.player_b_id],
                "rating_difference": pair.rating_difference,
                "opponent_type": pair.opponent_type,
                "match_owner": pair.owner_instance_id,
                "websocket_base_url": pair.websocket_base_url or None,
            }
        if state == "missing":
            return {
                "queued": False,
                "matched": False,
                "player_id": player_id,
            }

        entry = self._entry_from_raw(result[1])
        now_ms = int(result[2])
        waited_seconds = max(0, int(now_ms / 1000 - entry.joined_at))
        expansions = waited_seconds // EXPANSION_INTERVAL_SECONDS
        accepted_window = min(
            MAX_RATING_WINDOW,
            BASE_RATING_WINDOW + expansions * RATING_WINDOW_EXPANSION,
        )
        return {
            "queued": True,
            "matched": False,
            "player_id": entry.player_id,
            "rating": entry.rating,
            "league_name_tr": entry.league_name_tr,
            "level": entry.level,
            "waited_seconds": waited_seconds,
            "accepted_rating_window": accepted_window,
        }
