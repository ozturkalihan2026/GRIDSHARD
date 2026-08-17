from __future__ import annotations

from typing import Any

from .telemetry import InMemoryTelemetryService


GAMEPLAY_EVENT_TYPES = frozenset({
    "match_started",
    "match_completed",
    "module_changed",
    "circuit_credit_spent",
    "module_shelf_used",
    "booster_used",
    "rematch_requested",
})


def _run_window(
    *,
    telemetry_service: InMemoryTelemetryService,
    test_run_id: str,
) -> tuple[int | None, int | None]:
    events = telemetry_service.events()

    starts = [
        int(event["timestamp_ms"])
        for event in events
        if (
            event["event_type"]
            == "web_test_run_started"
            and event.get(
                "metadata",
                {},
            ).get(
                "test_run_id"
            )
            == test_run_id
        )
    ]
    finishes = [
        int(event["timestamp_ms"])
        for event in events
        if (
            event["event_type"]
            == "web_test_run_finished"
            and event.get(
                "metadata",
                {},
            ).get(
                "test_run_id"
            )
            == test_run_id
        )
    ]

    return (
        min(starts)
        if starts
        else None,
        max(finishes)
        if finishes
        else None,
    )


def _gameplay_signals(
    *,
    telemetry_service: InMemoryTelemetryService,
    test_run_id: str,
) -> dict[str, Any]:
    started_at,finished_at = (
        _run_window(
            telemetry_service=
                telemetry_service,
            test_run_id=
                test_run_id,
        )
    )

    if started_at is None:
        return {
            "window_available":
                False,
            "completed_matches":
                0,
            "module_changes":
                0,
            "boosters_used":
                0,
            "module_shelf_uses":
                0,
            "total_circuit_credits_spent":
                0,
            "rematch_requests":
                0,
        }

    upper_bound = (
        finished_at
        if finished_at is not None
        else float("inf")
    )

    events = [
        event
        for event in telemetry_service.events()
        if (
            event["event_type"]
            in GAMEPLAY_EVENT_TYPES
            and started_at
            <= int(
                event["timestamp_ms"]
            )
            <= upper_bound
        )
    ]

    completed_sessions = {
        event.get(
            "session_id"
        )
        for event in events
        if (
            event["event_type"]
            == "match_completed"
            and event.get(
                "session_id"
            )
        )
    }

    return {
        "window_available":
            True,
        "completed_matches":
            len(
                completed_sessions
            ),
        "module_changes":
            sum(
                1
                for event in events
                if event["event_type"]
                == "module_changed"
            ),
        "boosters_used":
            sum(
                1
                for event in events
                if event["event_type"]
                == "booster_used"
            ),
        "module_shelf_uses":
            sum(
                1
                for event in events
                if event["event_type"]
                == "module_shelf_used"
            ),
        "total_circuit_credits_spent":
            sum(
                int(
                    event.get(
                        "metadata",
                        {},
                    ).get(
                        "amount",
                        0,
                    )
                )
                for event in events
                if event["event_type"]
                == "circuit_credit_spent"
            ),
        "rematch_requests":
            sum(
                1
                for event in events
                if event["event_type"]
                == "rematch_requested"
            ),
    }


def build_beta_findings(
    *,
    telemetry_service: InMemoryTelemetryService,
    test_run_id: str,
    feedback_summary: dict[str, Any],
    minimum_feedback: int = 3,
) -> dict[str, Any]:
    feedback_count = int(
        feedback_summary.get(
            "feedback_count",
            0,
        )
    )
    averages = dict(
        feedback_summary.get(
            "average_ratings",
            {},
        )
    )
    low_scores = dict(
        feedback_summary.get(
            "low_score_counts",
            {},
        )
    )
    gameplay = _gameplay_signals(
        telemetry_service=
            telemetry_service,
        test_run_id=
            test_run_id,
    )

    sample_status = (
        "sufficient"
        if feedback_count
        >= minimum_feedback
        else "insufficient_data"
    )

    concerns: list[dict[str, Any]] = []

    if sample_status == "sufficient":
        labels = {
            "usability":
                "Kullanılabilirlik",
            "connection":
                "Bağlantı deneyimi",
            "battle_balance":
                "Savaş dengesi",
            "module_booster_balance":
                "Modül/güçlendirici dengesi",
        }

        for key,label in labels.items():
            average = averages.get(
                key
            )
            low_count = int(
                low_scores.get(
                    key,
                    0,
                )
            )

            if (
                isinstance(
                    average,
                    (int,float),
                )
                and average < 3.0
            ):
                concerns.append({
                    "area":key,
                    "label":label,
                    "severity":
                        "high",
                    "reason":
                        "average_below_3",
                    "average":
                        average,
                    "low_score_count":
                        low_count,
                })
            elif low_count > 0:
                concerns.append({
                    "area":key,
                    "label":label,
                    "severity":
                        "watch",
                    "reason":
                        "low_scores_present",
                    "average":
                        average,
                    "low_score_count":
                        low_count,
                })

    battle_balance_context = {
        "feedback_average":
            averages.get(
                "battle_balance"
            ),
        "completed_matches":
            gameplay[
                "completed_matches"
            ],
        "rematch_requests":
            gameplay[
                "rematch_requests"
            ],
    }

    module_booster_context = {
        "feedback_average":
            averages.get(
                "module_booster_balance"
            ),
        "module_changes":
            gameplay[
                "module_changes"
            ],
        "boosters_used":
            gameplay[
                "boosters_used"
            ],
        "module_shelf_uses":
            gameplay[
                "module_shelf_uses"
            ],
        "total_circuit_credits_spent":
            gameplay[
                "total_circuit_credits_spent"
            ],
    }

    return {
        "test_run_id":
            test_run_id,
        "status":
            sample_status,
        "minimum_feedback":
            minimum_feedback,
        "feedback_count":
            feedback_count,
        "feedback":
            feedback_summary,
        "gameplay_signals":
            gameplay,
        "concerns":
            concerns,
        "battle_balance_context":
            battle_balance_context,
        "module_booster_context":
            module_booster_context,
        "automatic_balance_change":
            False,
        "human_review_required":
            True,
        "note":
            (
                "Bulgular gerçek geri bildirim ve teknik telemetriyi birlikte özetler; "
                "otomatik denge değişikliği uygulanmaz."
            ),
    }
