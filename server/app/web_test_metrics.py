from __future__ import annotations

from collections import defaultdict
from typing import Any

from .telemetry import InMemoryTelemetryService


class WebTestKpiService:
    def __init__(
        self,
        telemetry_service: InMemoryTelemetryService,
    ):
        self.telemetry_service = telemetry_service

    def snapshot(
        self,
        *,
        player_id: str | None = None,
    ) -> dict[str, Any]:
        events = self.telemetry_service.events(
            player_id=player_id
        )

        counts: dict[str, int] = defaultdict(int)
        for event in events:
            counts[event["event_type"]] += 1

        started_sessions = {
            event["session_id"]
            for event in events
            if (
                event["event_type"] == "match_started"
                and event["session_id"]
            )
        }
        completed_events = [
            event for event in events
            if event["event_type"] == "match_completed"
        ]
        completed_sessions = {
            event["session_id"]
            for event in completed_events
            if event["session_id"]
        }

        duration_by_session: dict[str, int] = {}
        for event in completed_events:
            session_id = event["session_id"]
            if not session_id:
                continue
            duration_by_session.setdefault(
                session_id,
                int(
                    event["metadata"].get(
                        "duration_ms",
                        0,
                    )
                ),
            )

        completed_match_count = len(
            completed_sessions
        )
        started_match_count = len(
            started_sessions
        )

        match_completion_rate = (
            completed_match_count
            / started_match_count
            if started_match_count
            else 0.0
        )

        average_match_duration_ms = (
            round(
                sum(
                    duration_by_session.values()
                )
                / len(duration_by_session)
            )
            if duration_by_session
            else 0
        )

        module_changes = counts[
            "module_changed"
        ]
        average_module_changes = (
            module_changes
            / completed_match_count
            if completed_match_count
            else 0.0
        )

        credit_events = [
            event for event in events
            if (
                event["event_type"]
                == "circuit_credit_spent"
            )
        ]
        total_credit_spent = sum(
            int(
                event["metadata"].get(
                    "amount",
                    0,
                )
            )
            for event in credit_events
        )

        rematch_requests = counts[
            "rematch_requested"
        ]
        rematch_request_rate = (
            rematch_requests
            / completed_match_count
            if completed_match_count
            else 0.0
        )

        return {
            "player_id": player_id,
            "game_opened": counts[
                "game_opened"
            ],
            "matchmaking_started": counts[
                "matchmaking_started"
            ],
            "started_matches": (
                started_match_count
            ),
            "completed_matches": (
                completed_match_count
            ),
            "match_completion_rate": round(
                match_completion_rate,
                6,
            ),
            "rematch_requests": (
                rematch_requests
            ),
            "rematch_request_rate": round(
                rematch_request_rate,
                6,
            ),
            "module_changes": module_changes,
            "average_module_changes_per_match": round(
                average_module_changes,
                6,
            ),
            "total_circuit_credits_spent": (
                total_credit_spent
            ),
            "module_shelf_uses": counts[
                "module_shelf_used"
            ],
            "boosters_used": counts[
                "booster_used"
            ],
            "average_match_duration_ms": (
                average_match_duration_ms
            ),
        }
