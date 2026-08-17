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

        completed_by_player: dict[
            str,
            list[dict[str, Any]],
        ] = defaultdict(list)
        matchmaking_by_player: dict[
            str,
            list[dict[str, Any]],
        ] = defaultdict(list)
        rematch_by_player: dict[
            str,
            list[dict[str, Any]],
        ] = defaultdict(list)

        for event in events:
            player = event["player_id"]
            if not player:
                continue

            if event["event_type"] == "match_completed":
                completed_by_player[
                    player
                ].append(event)
            elif event["event_type"] == "matchmaking_started":
                matchmaking_by_player[
                    player
                ].append(event)
            elif event["event_type"] == "rematch_requested":
                rematch_by_player[
                    player
                ].append(event)

        players_with_completed_match = len(
            completed_by_player
        )
        players_starting_second_match = 0

        for player, completed in completed_by_player.items():
            first_completed_at = min(
                event["timestamp_ms"]
                for event in completed
            )
            if any(
                event["timestamp_ms"]
                >= first_completed_at
                for event
                in matchmaking_by_player.get(
                    player,
                    [],
                )
            ):
                players_starting_second_match += 1

        second_match_transition_rate = (
            players_starting_second_match
            / players_with_completed_match
            if players_with_completed_match
            else 0.0
        )

        losing_players: set[
            tuple[str, str]
        ] = set()
        losing_players_requesting_rematch: set[
            tuple[str, str]
        ] = set()

        for event in completed_events:
            player = event["player_id"]
            session_id = event["session_id"]
            if not player or not session_id:
                continue

            metadata = event["metadata"]
            if metadata.get("is_draw"):
                continue

            winner = metadata.get(
                "winner_player_id"
            )
            if winner == player:
                continue

            key = (
                player,
                session_id,
            )
            losing_players.add(key)

            completion_time = event[
                "timestamp_ms"
            ]

            if any(
                rematch["timestamp_ms"]
                >= completion_time
                and (
                    rematch["session_id"]
                    == session_id
                    or rematch[
                        "metadata"
                    ].get(
                        "previous_session_id"
                    )
                    == session_id
                )
                for rematch
                in rematch_by_player.get(
                    player,
                    [],
                )
            ):
                losing_players_requesting_rematch.add(
                    key
                )

        losing_player_rematch_rate = (
            len(
                losing_players_requesting_rematch
            )
            / len(losing_players)
            if losing_players
            else 0.0
        )

        audit_started = {
            event["event_id"]
            for event in events
            if (
                event["event_type"]
                == "web_test_session_started"
            )
        }
        audit_bound_sources = {
            str(
                event["metadata"].get(
                    "audit_event_id"
                )
            )
            for event in events
            if (
                event["event_type"]
                == "web_test_session_bound"
                and event["metadata"].get(
                    "audit_event_id"
                )
            )
        }

        bound_audit_count = len(
            audit_started
            & audit_bound_sources
        )
        audit_to_session_rate = (
            bound_audit_count
            / len(audit_started)
            if audit_started
            else 0.0
        )

        audit_finished_sources = {
            str(
                event["metadata"].get(
                    "audit_event_id"
                )
            )
            for event in events
            if (
                event["event_type"]
                == "web_test_session_finished"
                and event["metadata"].get(
                    "audit_event_id"
                )
                and event["metadata"].get(
                    "technical_completed"
                )
            )
        }

        finished_audit_count = len(
            audit_started
            & audit_finished_sources
        )
        audit_to_finish_rate = (
            finished_audit_count
            / len(audit_started)
            if audit_started
            else 0.0
        )
        bound_to_finish_rate = (
            finished_audit_count
            / bound_audit_count
            if bound_audit_count
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
            "players_with_completed_match": (
                players_with_completed_match
            ),
            "players_starting_second_match": (
                players_starting_second_match
            ),
            "second_match_transition_rate": round(
                second_match_transition_rate,
                6,
            ),
            "losing_player_matches": (
                len(losing_players)
            ),
            "losing_player_rematch_requests": (
                len(
                    losing_players_requesting_rematch
                )
            ),
            "losing_player_rematch_rate": round(
                losing_player_rematch_rate,
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
            "audit_session_starts": (
                len(audit_started)
            ),
            "audit_session_bounds": (
                bound_audit_count
            ),
            "audit_to_session_rate": round(
                audit_to_session_rate,
                6,
            ),
            "audit_session_finishes": (
                finished_audit_count
            ),
            "audit_to_finish_rate": round(
                audit_to_finish_rate,
                6,
            ),
            "bound_to_finish_rate": round(
                bound_to_finish_rate,
                6,
            ),
        }
