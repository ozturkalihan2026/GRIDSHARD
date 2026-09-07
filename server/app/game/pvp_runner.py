from __future__ import annotations
import asyncio
import hashlib
from dataclasses import dataclass
from typing import Awaitable, Callable
from .engine import TICK_MS
from .ai import enqueue_ai_actions
from .models import BattleStatus, BattleCommand, ModuleStatus
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
    ai_decisions: int = 0
    match_finished_callback_failures: int = 0

class PvPTickRunner:
    def __init__(
        self,
        service: PvPSessionService,
        websocket_adapter: PvPWebSocketAdapter,
        *,
        sleep_func: SleepFunc = asyncio.sleep,
        snapshot_every_ticks: int = 10,
        ai_decision_interval_ms: int = 5_000,
        match_finished_callback=None,
    ):
        self.service=service
        self.websocket_adapter=websocket_adapter
        self.sleep_func=sleep_func
        self.snapshot_every_ticks=snapshot_every_ticks
        self.ai_decision_interval_ms=max(1_000,int(ai_decision_interval_ms))
        self.match_finished_callback=match_finished_callback
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

    async def stop_all(self) -> None:
        for session_id in tuple(self._tasks):
            await self.stop_session(session_id)

    async def run_single_tick(self,session_id: str) -> bool:
        session=self.service.get_session(session_id)
        if session.engine.state.status != BattleStatus.RUNNING:
            return False
        stats=self.stats_for(session_id)
        for ai_player_id in sorted(session.ai_player_ids):
            next_decision_at=session.ai_next_decision_at_ms.get(
                ai_player_id,
                0,
            )
            if session.engine.state.elapsed_ms < next_decision_at:
                continue
            opponent_player_id=next(
                (
                    player_id
                    for player_id in sorted(session.engine.state.players)
                    if player_id != ai_player_id
                ),
                None,
            )
            options = session.ai_profile_options.get(ai_player_id, {})
            roll = int(hashlib.sha256(f"{session_id}:{ai_player_id}:{session.engine.state.tick}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
            if opponent_player_id is not None and roll >= float(options.get("mistake_rate", 0)):
                ai = session.engine.state.players[ai_player_id]
                living = [m for m in ai.modules.values() if m.status == ModuleStatus.ACTIVE]
                if ai.core_power_charge >= 100 and (ai.core_type not in {"core_resonance", "core_phoenix"} or any(m.hp < m.definition.max_hp for m in living)):
                    session.engine.enqueue_command(BattleCommand(player_id=ai_player_id, kind="use_core_power",
                        payload={"request_id": f"{session_id}:{ai_player_id}:core:{session.engine.state.tick}"}))
                plan=enqueue_ai_actions(
                    session.engine,
                    ai_player_id,
                    opponent_player_id,
                    session.ai_archetypes.get(ai_player_id, "balanced"),
                )
                if plan is not None:
                    stats.ai_decisions+=1
            session.ai_next_decision_at_ms[ai_player_id]=(
                session.engine.state.elapsed_ms
                + int(options.get("decision_delay_ms", self.ai_decision_interval_ms))
            )
        self.service.step(session_id)
        stats.ticks_executed+=1
        stats.live_event_broadcasts += await self.websocket_adapter.broadcast_live_events(session_id)
        if stats.ticks_executed % self.snapshot_every_ticks == 0:
            stats.snapshot_broadcasts += await self.websocket_adapter.broadcast_snapshot(session_id)

        if session.engine.state.status == BattleStatus.FINISHED:
            # Match projections must be durable before the terminal envelope is
            # visible.  Otherwise the client can ask for /post-match in the
            # small window between the result broadcast and persistence and
            # remain on a pending reward state.
            if self.match_finished_callback is not None:
                try:
                    self.match_finished_callback(
                        session.engine.state
                    )
                except Exception:
                    # Projection failure is recorded, but the terminal result
                    # is still delivered so the battle itself never hangs.
                    stats.match_finished_callback_failures += 1

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
