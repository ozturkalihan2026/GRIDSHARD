from __future__ import annotations

import asyncio
import time
import json
from uuid import uuid4
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    limit: int
    remaining: int
    retry_after_seconds: int


class InMemoryRateLimiter:
    def __init__(self, *, now_func: Callable[[], float] = time.monotonic):
        self.now_func = now_func
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> RateLimitDecision:
        now = self.now_func()
        cutoff = now - window_seconds
        async with self._lock:
            bucket = self._requests[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(window_seconds - (now - bucket[0])) + 1)
                return RateLimitDecision(False, limit, 0, retry_after)
            bucket.append(now)
            return RateLimitDecision(True, limit, max(0, limit - len(bucket)), 0)

    async def cleanup(self) -> int:
        now = self.now_func()
        removed = 0
        async with self._lock:
            for key, bucket in list(self._requests.items()):
                if not bucket or now - bucket[-1] > 300:
                    self._requests.pop(key, None)
                    removed += 1
        return removed


class RuntimeCoordinator:
    def __init__(
        self,
        redis_url: str | None,
        *,
        namespace: str = "gridshard",
        strict: bool = False,
        now_func=time.monotonic,
    ):
        self.redis_url = str(redis_url or "").strip() or None
        self.namespace = namespace
        self.strict = strict
        self.redis = None
        self.local_limiter = InMemoryRateLimiter()
        self.last_error: str | None = None
        self.owner_id = uuid4().hex
        self.now_func = now_func
        self.lease_seconds = 30
        self._lease_deadline = 0.0
        self._lease_lost = False
        self._online_until = {}

    @property
    def owns_worker(self):
        return not self.strict or (not self._lease_lost and self.now_func() < self._lease_deadline)

    @property
    def worker_key(self):
        return f"{self.namespace}:worker:primary"

    async def claim_worker(self):
        if self.redis is None:
            raise RuntimeError("Worker lease için Redis zorunludur.")
        started = self.now_func()
        if not await self.redis.set(self.worker_key, self.owner_id, nx=True, ex=self.lease_seconds):
            raise RuntimeError("Başka bir worker lease'i var; yalnız tek üretim worker'ı desteklenir.")
        self._lease_deadline = started + self.lease_seconds - 2
        self._lease_lost = False

    async def renew_worker(self):
        if not self.strict:
            return
        if not self.owns_worker:
            self._lease_lost = True
            raise RuntimeError("Worker lease süresi doldu; yeniden başlatma gerekir.")
        started = self.now_func()
        try:
            renewed = await self.redis.eval(
                "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('EXPIRE', KEYS[1], ARGV[2]) else return 0 end",
                1, self.worker_key, self.owner_id, self.lease_seconds,
            )
            if not renewed:
                raise RuntimeError("Worker lease sahipliği kaybedildi.")
            self._lease_deadline = started + self.lease_seconds - 2
        except BaseException:
            self._lease_lost = True
            self.last_error = "Worker lease yenilenemedi; yeniden başlatma gerekir."
            raise

    async def release_worker(self):
        self._lease_deadline = 0.0
        if self.redis is not None:
            await self.redis.eval(
                "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
                1, self.worker_key, self.owner_id,
            )

    async def touch_player(self, player_id, ttl_seconds=90):
        if self.redis is not None:
            await self.redis.set(f"{self.namespace}:presence:{player_id}", self.owner_id, ex=ttl_seconds)
        self._online_until[player_id] = self.now_func() + ttl_seconds
        self._online_until = {owner: expiry for owner, expiry in self._online_until.items() if expiry > self.now_func()}

    def player_online(self, player_id):
        return self._online_until.get(player_id, 0) > self.now_func()

    async def open(self) -> None:
        if not self.redis_url:
            if self.strict:
                raise RuntimeError("Üretim modunda REDIS_URL zorunludur.")
            return
        try:
            import redis.asyncio as redis

            self.redis = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
                health_check_interval=20,
            )
            await self.redis.ping()
            if self.strict:
                await self.claim_worker()
            self.last_error = None
        except Exception as exc:
            self.last_error = str(exc)
            if self.redis is not None:
                await self.redis.aclose()
                self.redis = None
            if self.strict:
                raise RuntimeError("Redis bağlantısı kurulamadı.") from exc

    async def close(self) -> None:
        if self.redis is not None:
            try:
                if self.strict:
                    await self.release_worker()
            finally:
                await self.redis.aclose()
                self.redis = None

    async def rate_limit(
        self,
        scope: str,
        identity: str,
        *,
        limit: int,
        window_seconds: int,
    ) -> RateLimitDecision:
        if self.redis is None:
            if self.strict:
                raise RuntimeError("Üretim hız sınırı için Redis zorunludur.")
            return await self.local_limiter.check(
                f"{scope}:{identity}",
                limit=limit,
                window_seconds=window_seconds,
            )

        bucket = int(time.time()) // window_seconds
        key = f"{self.namespace}:rate:{scope}:{identity}:{bucket}"
        try:
            async with self.redis.pipeline(transaction=True) as pipeline:
                pipeline.incr(key)
                pipeline.expire(key, window_seconds + 2)
                count, _ = await pipeline.execute()
            count = int(count)
            if count > limit:
                ttl = int(await self.redis.ttl(key))
                return RateLimitDecision(False, limit, 0, max(1, ttl))
            return RateLimitDecision(True, limit, max(0, limit - count), 0)
        except Exception as exc:
            self.last_error = str(exc)
            if self.strict:
                raise
            return await self.local_limiter.check(
                f"{scope}:{identity}",
                limit=limit,
                window_seconds=window_seconds,
            )

    async def touch_session(self, session_id: str, *, ttl_seconds: int, player_ids=(), status="active", websocket_base_url="") -> None:
        if self.redis is None:
            return
        if not self.owns_worker:
            raise RuntimeError("Savaş sahibi worker etkin değil.")
        value = json.dumps({"owner_id": self.owner_id, "players": list(player_ids),
                            "status": status, "websocket_base_url": websocket_base_url})
        updated = await self.redis.eval(
            "local old = redis.call('GET', KEYS[1]); if old and cjson.decode(old).owner_id ~= ARGV[1] then return 0 end; redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1",
            1, f"{self.namespace}:session:{session_id}", self.owner_id, value, ttl_seconds,
        )
        if not updated:
            raise RuntimeError("Savaş başka bir worker'a ait; eski sahip üzerine yazamaz.")

    async def session_owner(self, session_id):
        if self.redis is None:
            return None
        raw = await self.redis.get(f"{self.namespace}:session:{session_id}")
        return json.loads(raw) if raw else None

    async def delete_session(self, session_id: str) -> None:
        if self.redis is not None:
            await self.redis.eval(
                "local old = redis.call('GET', KEYS[1]); if old and cjson.decode(old).owner_id == ARGV[1] then return redis.call('DEL', KEYS[1]) end; return 0",
                1, f"{self.namespace}:session:{session_id}", self.owner_id,
            )

    async def health(self) -> dict:
        if self.redis is None:
            return {
                "ready": not self.strict,
                "state": "fallback" if not self.redis_url else "degraded",
                "backend": "memory",
                "error": self.last_error,
            }
        try:
            latency_started = time.perf_counter()
            await self.redis.ping()
            lease_ready = self.owns_worker
            if self.strict and await self.redis.get(self.worker_key) != self.owner_id:
                self._lease_lost = True
                lease_ready = False
            latency_ms = round((time.perf_counter() - latency_started) * 1000, 2)
            return {
                "ready": lease_ready,
                "state": "ready",
                "backend": "redis",
                "worker_lease_ready": lease_ready,
                "latency_ms": latency_ms,
                "error": None,
            }
        except Exception as exc:
            return {
                "ready": False,
                "state": "unavailable",
                "backend": "redis",
                "error": str(exc),
            }
