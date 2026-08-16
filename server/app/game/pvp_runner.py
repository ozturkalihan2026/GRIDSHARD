from __future__ import annotations
import asyncio
from dataclasses import dataclass
from typing import Awaitable, Callable
from .engine import TICK_MS
from .models import BattleStatus
from .pvp_session import PvPSessionService
from .pvp_websocket import PvPWebSocketAdapter

SleepFunc = Callable[[float], Awaitable[None]]

@dataclass(slots=True)
class RunnerStats:
    ticks_executed: int = 0
    live_event_broadcasts: int = 0
    snapshot_broadcasts: int = 0
    match_finished_broadcasts: int = 0
    closed_connections: int = 0

class PvPTickRunner:
    def __init__(
        self,
        service: PvPSessionService,
        websocket_adapter: PvPWebSocketAdapter,
        *,
        sleep_func: SleepFunc = asyncio.sleep,
        snapshot_every_ticks: int = 10,
    ):
        self.service=service
        self.websocket_adapter=websocket_adapter
        self.sleep_func=sleep_func
        self.snapshot_every_ticks=snapshot_every_ticks
        self.tick_interval_seconds=TICK_MS/1000.0
        self._tasks={}
        self._stats={}

    def is_running(self,session_id: str) -> bool:
        task=self._tasks.get(session_id)
        return task is not None and not task.done()

    def stats_for(self,session_id: str) -> RunnerStats:
        return self._stats.setdefault(session_id,RunnerStats())

    async def ensure_started(self,session_id: str) -> None:
        session=self.service.get_session(session_id)
        if session.engine.state.status != BattleStatus.RUNNING:
            return
        if self.is_running(session_id):
            return
        self._stats.setdefault(session_id,RunnerStats())
        self._tasks[session_id]=asyncio.create_task(
            self._run_loop(session_id)
        )

    async def stop_session(self,session_id: str) -> None:
        task=self._tasks.pop(session_id,None)
        if task is None:
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    async def run_single_tick(self,session_id: str) -> bool:
        session=self.service.get_session(session_id)
        if session.engine.state.status != BattleStatus.RUNNING:
            return False
        self.service.step(session_id)
        stats=self.stats_for(session_id)
        stats.ticks_executed+=1
        stats.live_event_broadcasts += await self.websocket_adapter.broadcast_live_events(session_id)
        if stats.ticks_executed % self.snapshot_every_ticks == 0:
            stats.snapshot_broadcasts += await self.websocket_adapter.broadcast_snapshot(session_id)

        if session.engine.state.status == BattleStatus.FINISHED:
            # Son savaş olayları gönderildikten sonra terminal sonuç ayrı zarfla yayınlanır.
            stats.match_finished_broadcasts += (
                await self.websocket_adapter.broadcast_match_finished(
                    session_id
                )
            )
            stats.closed_connections += (
                await self.websocket_adapter.close_finished_session_connections(
                    session_id
                )
            )

        return True

    async def run_ticks(self,session_id: str,count: int) -> int:
        executed=0
        for _ in range(count):
            if not await self.run_single_tick(session_id):
                break
            executed+=1
        return executed

    async def _run_loop(self,session_id: str) -> None:
        try:
            while True:
                session=self.service.get_session(session_id)
                if session.engine.state.status != BattleStatus.RUNNING:
                    break
                await self.run_single_tick(session_id)
                if session.engine.state.status != BattleStatus.RUNNING:
                    break
                await self.sleep_func(self.tick_interval_seconds)
        finally:
            self._tasks.pop(session_id,None)
