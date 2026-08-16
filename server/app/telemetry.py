from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable

from .game.models import BattleState, BattleStatus


TELEMETRY_EVENT_TYPES = frozenset({
    "game_opened",
    "matchmaking_started",
    "matchmaking_matched",
    "match_started",
    "match_completed",
    "module_changed",
    "circuit_credit_spent",
    "module_shelf_used",
    "booster_used",
    "rematch_requested",
})


@dataclass(slots=True, frozen=True)
class TelemetryEvent:
    event_id: str
    event_type: str
    timestamp_ms: int
    player_id: str | None = None
    session_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp_ms": self.timestamp_ms,
            "player_id": self.player_id,
            "session_id": self.session_id,
            "metadata": dict(self.metadata),
        }


class TelemetryError(ValueError):
    pass


class InMemoryTelemetryService:
    def __init__(
        self,
        *,
        now_func: Callable[[], float] = time.time,
    ):
        self.now_func = now_func
        self._events: list[TelemetryEvent] = []
        self._event_ids: set[str] = set()

    def record(self, event: TelemetryEvent) -> bool:
        self._validate(event)

        if event.event_id in self._event_ids:
            return False

        stored = TelemetryEvent(
            event_id=event.event_id,
            event_type=event.event_type,
            timestamp_ms=int(event.timestamp_ms),
            player_id=event.player_id,
            session_id=event.session_id,
            metadata=dict(event.metadata),
        )
        self._events.append(stored)
        self._event_ids.add(stored.event_id)
        return True

    def record_now(
        self,
        *,
        event_id: str,
        event_type: str,
        player_id: str | None = None,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        return self.record(
            TelemetryEvent(
                event_id=event_id,
                event_type=event_type,
                timestamp_ms=round(self.now_func() * 1000),
                player_id=player_id,
                session_id=session_id,
                metadata=dict(metadata or {}),
            )
        )

    def events(
        self,
        *,
        player_id: str | None = None,
        session_id: str | None = None,
        event_type: str | None = None,
    ) -> list[dict[str, Any]]:
        result = self._events

        if player_id is not None:
            result = [
                event for event in result
                if event.player_id == player_id
            ]
        if session_id is not None:
            result = [
                event for event in result
                if event.session_id == session_id
            ]
        if event_type is not None:
            result = [
                event for event in result
                if event.event_type == event_type
            ]

        return [event.to_dict() for event in result]

    def summary(
        self,
        *,
        player_id: str | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        selected = self.events(
            player_id=player_id,
            session_id=session_id,
        )

        counts: dict[str, int] = {}
        credit_spent = 0

        for event in selected:
            kind = event["event_type"]
            counts[kind] = counts.get(kind, 0) + 1

            if kind == "circuit_credit_spent":
                credit_spent += int(
                    event["metadata"].get("amount", 0)
                )

        return {
            "event_count": len(selected),
            "counts_by_type": counts,
            "total_circuit_credits_spent": credit_spent,
        }

    def ingest_finished_battle(self, state: BattleState) -> int:
        if state.status != BattleStatus.FINISHED:
            raise TelemetryError(
                "Yalnızca tamamlanmış savaş telemetriye aktarılabilir."
            )

        recorded = 0
        battle_id = state.battle_id

        if any(event.type == "battle_started" for event in state.events):
            for player_id in state.players:
                recorded += int(self.record_now(
                    event_id=f"server:{battle_id}:match_started:{player_id}",
                    event_type="match_started",
                    player_id=player_id,
                    session_id=battle_id,
                    metadata={"source": "battle_engine"},
                ))

        for index, event in enumerate(state.events):
            player_id = event.data.get("player_id")

            if event.type == "module_replaced":
                recorded += int(self.record_now(
                    event_id=f"server:{battle_id}:{index}:module_changed",
                    event_type="module_changed",
                    player_id=player_id,
                    session_id=battle_id,
                    metadata={
                        "outgoing_module_id": event.data.get("outgoing_module_id"),
                        "incoming_module_id": event.data.get("incoming_module_id"),
                        "battle_elapsed_ms": event.at_ms,
                    },
                ))

            elif event.type == "circuit_credits_spent":
                recorded += int(self.record_now(
                    event_id=f"server:{battle_id}:{index}:credit_spent",
                    event_type="circuit_credit_spent",
                    player_id=player_id,
                    session_id=battle_id,
                    metadata={
                        "amount": int(event.data.get("amount", 0)),
                        "reason": event.data.get("reason"),
                        "balance": event.data.get("balance"),
                        "battle_elapsed_ms": event.at_ms,
                    },
                ))

            elif event.type == "booster_applied":
                recorded += int(self.record_now(
                    event_id=f"server:{battle_id}:{index}:booster_used",
                    event_type="booster_used",
                    player_id=player_id,
                    session_id=battle_id,
                    metadata={
                        "booster_id": event.data.get("booster_id"),
                        "target_module_id": event.data.get("target_module_id"),
                        "battle_elapsed_ms": event.at_ms,
                    },
                ))

        duration_ms = (
            state.finished_at_ms
            if state.finished_at_ms is not None
            else state.elapsed_ms
        )

        for player_id in state.players:
            recorded += int(self.record_now(
                event_id=f"server:{battle_id}:match_completed:{player_id}",
                event_type="match_completed",
                player_id=player_id,
                session_id=battle_id,
                metadata={
                    "winner_player_id": state.winner_player_id,
                    "is_draw": state.is_draw,
                    "finish_reason": state.finish_reason,
                    "duration_ms": duration_ms,
                },
            ))

        return recorded

    def clear(self) -> None:
        self._events.clear()
        self._event_ids.clear()

    def _validate(self, event: TelemetryEvent) -> None:
        if not event.event_id:
            raise TelemetryError("Telemetri event_id boş olamaz.")
        if event.event_type not in TELEMETRY_EVENT_TYPES:
            raise TelemetryError("Desteklenmeyen telemetri olay türü.")
        if event.timestamp_ms < 0:
            raise TelemetryError("Telemetri timestamp negatif olamaz.")
        if not isinstance(event.metadata, dict):
            raise TelemetryError("Telemetri metadata nesne olmalıdır.")
