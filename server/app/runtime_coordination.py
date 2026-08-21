from __future__ import annotations

import asyncio
import time
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
    ):
        self.redis_url = str(redis_url or "").strip() or None
        self.namespace = namespace
        self.strict = strict
        self.redis = None
        self.local_limiter = InMemoryRateLimiter()
        self.last_error: str | None = None

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

    async def touch_session(self, session_id: str, *, ttl_seconds: int) -> None:
        if self.redis is None:
            return
        await self.redis.set(
            f"{self.namespace}:session:{session_id}",
            "active",
            ex=ttl_seconds,
        )

    async def delete_session(self, session_id: str) -> None:
        if self.redis is not None:
            await self.redis.delete(f"{self.namespace}:session:{session_id}")

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
            latency_ms = round((time.perf_counter() - latency_started) * 1000, 2)
            return {
                "ready": True,
                "state": "ready",
                "backend": "redis",
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
