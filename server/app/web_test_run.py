from __future__ import annotations

from typing import Any

from .telemetry import InMemoryTelemetryService


def build_test_run_summary(
    *,
    telemetry_service: InMemoryTelemetryService,
    test_run_id: str,
) -> dict[str, Any]:
    events = [
        event
        for event in telemetry_service.events()
        if (
            event.get(
                "metadata",
                {},
            ).get(
                "test_run_id"
            )
            == test_run_id
        )
    ]

    preflight_snapshot_events = [
        event
        for event in events
        if event["event_type"]
        == "web_test_preflight_snapshot"
    ]
    preflight_snapshots = len(
        preflight_snapshot_events
    )
    preflight_ready_snapshots = sum(
        1
        for event
        in preflight_snapshot_events
        if event.get(
            "metadata",
            {},
        ).get(
            "preflight_ready"
        )
    )
    preflight_ready_rate = (
        preflight_ready_snapshots
        / preflight_snapshots
        if preflight_snapshots
        else 0.0
    )

    checklist_snapshot_events = [
        event
        for event in events
        if event["event_type"]
        == "web_test_checklist_snapshot"
    ]
    checklist_snapshots = len(
        checklist_snapshot_events
    )
    checklist_ready_snapshots = sum(
        1
        for event
        in checklist_snapshot_events
        if event.get(
            "metadata",
            {},
        ).get(
            "checklist_ready"
        )
    )
    checklist_ready_rate = (
        checklist_ready_snapshots
        / checklist_snapshots
        if checklist_snapshots
        else 0.0
    )

    launch_attempt_events = [
        event
        for event in events
        if event["event_type"]
        == "web_test_launch_attempted"
    ]
    launch_attempts = len(
        launch_attempt_events
    )
    launch_ready_attempts = sum(
        1
        for event
        in launch_attempt_events
        if event.get(
            "metadata",
            {},
        ).get(
            "launch_ready"
        )
    )
    launch_ready_rate = (
        launch_ready_attempts
        / launch_attempts
        if launch_attempts
        else 0.0
    )

    run_started_events = [
        event
        for event in events
        if (
            event["event_type"]
            == "web_test_run_started"
        )
    ]
    run_started = bool(
        run_started_events
    )
    run_started_at_ms = (
        min(
            int(
                event["timestamp_ms"]
            )
            for event in run_started_events
        )
        if run_started_events
        else None
    )

    started = [
        event
        for event in events
        if event["event_type"]
        == "web_test_session_started"
    ]
    bound = [
        event
        for event in events
        if event["event_type"]
        == "web_test_session_bound"
    ]
    finished = [
        event
        for event in events
        if (
            event["event_type"]
            == "web_test_session_finished"
            and event.get(
                "metadata",
                {},
            ).get(
                "technical_completed"
            )
        )
    ]

    started_ids = {
        event["event_id"]
        for event in started
    }
    bound_sources = {
        event["metadata"].get(
            "audit_event_id"
        )
        for event in bound
        if event["metadata"].get(
            "audit_event_id"
        )
    }
    finished_sources = {
        event["metadata"].get(
            "audit_event_id"
        )
        for event in finished
        if event["metadata"].get(
            "audit_event_id"
        )
    }

    bound_count = len(
        started_ids
        & bound_sources
    )
    finish_count = len(
        started_ids
        & finished_sources
    )

    timestamps = [
        int(
            event.get(
                "timestamp_ms",
                0,
            )
        )
        for event in events
        if int(
            event.get(
                "timestamp_ms",
                0,
            )
        ) >= 0
    ]

    first_event_at_ms = (
        min(timestamps)
        if timestamps
        else None
    )
    last_event_at_ms = (
        max(timestamps)
        if timestamps
        else None
    )
    measured_duration_ms = (
        last_event_at_ms
        - first_event_at_ms
        if (
            first_event_at_ms
            is not None
            and last_event_at_ms
            is not None
        )
        else 0
    )

    first_audit_started_at_ms = (
        min(
            int(event["timestamp_ms"])
            for event in started
        )
        if started
        else None
    )
    last_audit_finished_at_ms = (
        max(
            int(event["timestamp_ms"])
            for event in finished
        )
        if finished
        else None
    )

    lifecycle_state = (
        "empty"
        if not started_ids
        else (
            "completed"
            if finish_count > 0
            else "active"
        )
    )

    return {
        "test_run_id": test_run_id,
        "lifecycle_state":
            lifecycle_state,
        "run_started":
            run_started,
        "run_started_at_ms":
            run_started_at_ms,
        "preflight_snapshots":
            preflight_snapshots,
        "preflight_ready_snapshots":
            preflight_ready_snapshots,
        "preflight_ready_rate": round(
            preflight_ready_rate,
            6,
        ),
        "checklist_snapshots":
            checklist_snapshots,
        "checklist_ready_snapshots":
            checklist_ready_snapshots,
        "checklist_ready_rate": round(
            checklist_ready_rate,
            6,
        ),
        "launch_attempts":
            launch_attempts,
        "launch_ready_attempts":
            launch_ready_attempts,
        "launch_ready_rate": round(
            launch_ready_rate,
            6,
        ),
        "audit_session_starts":
            len(started_ids),
        "audit_session_bounds":
            bound_count,
        "audit_session_finishes":
            finish_count,
        "audit_to_session_rate":
            round(
                (
                    bound_count
                    / len(started_ids)
                )
                if started_ids
                else 0.0,
                6,
            ),
        "audit_to_finish_rate":
            round(
                (
                    finish_count
                    / len(started_ids)
                )
                if started_ids
                else 0.0,
                6,
            ),
        "bound_to_finish_rate":
            round(
                (
                    finish_count
                    / bound_count
                )
                if bound_count
                else 0.0,
                6,
            ),
        "event_count":
            len(events),
        "first_event_at_ms":
            first_event_at_ms,
        "last_event_at_ms":
            last_event_at_ms,
        "first_audit_started_at_ms":
            first_audit_started_at_ms,
        "last_audit_finished_at_ms":
            last_audit_finished_at_ms,
        "measured_duration_ms":
            measured_duration_ms,
    }


def build_test_run_go_no_go(
    *,
    test_run_id: str,
    active_test_run_id: str,
    operation_readiness: dict[str, Any],
    run_summary: dict[str, Any],
    min_sample: int = 10,
) -> dict[str, Any]:
    def signal(
        value: float,
        sample: int,
    ) -> dict[str, Any]:
        return {
            "status":
                (
                    "observed"
                    if sample >= min_sample
                    else "insufficient_data"
                ),
            "sample": sample,
            "minimum_sample":
                min_sample,
            "value": value,
        }

    started = int(
        run_summary.get(
            "audit_session_starts",
            0,
        )
    )
    bound = int(
        run_summary.get(
            "audit_session_bounds",
            0,
        )
    )

    return {
        "test_run_id":
            test_run_id,
        "active_test_run_id":
            active_test_run_id,
        "historical_run":
            test_run_id
            != active_test_run_id,
        "decision":
            (
                "GO"
                if operation_readiness.get(
                    "ready"
                )
                else "NO_GO"
            ),
        "technical_ready":
            bool(
                operation_readiness.get(
                    "ready"
                )
            ),
        "behavior_blocks_release":
            False,
        "behavior_signals": {
            "audit_to_session":
                signal(
                    float(
                        run_summary.get(
                            "audit_to_session_rate",
                            0.0,
                        )
                    ),
                    started,
                ),
            "audit_to_finish":
                signal(
                    float(
                        run_summary.get(
                            "audit_to_finish_rate",
                            0.0,
                        )
                    ),
                    started,
                ),
            "bound_to_finish":
                signal(
                    float(
                        run_summary.get(
                            "bound_to_finish_rate",
                            0.0,
                        )
                    ),
                    bound,
                ),
        },
    }


def build_test_run_catalog(
    *,
    telemetry_service: InMemoryTelemetryService,
    active_test_run_id: str,
) -> dict[str, Any]:
    run_ids = {
        str(
            event.get(
                "metadata",
                {},
            ).get(
                "test_run_id"
            )
        )
        for event in telemetry_service.events()
        if event.get(
            "metadata",
            {},
        ).get(
            "test_run_id"
        )
    }

    run_ids.add(
        active_test_run_id
    )

    runs = []

    for run_id in sorted(
        run_ids
    ):
        summary = build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=run_id,
        )

        runs.append({
            "test_run_id":
                run_id,
            "active":
                run_id
                == active_test_run_id,
            "run_started":
                summary[
                    "run_started"
                ],
            "run_started_at_ms":
                summary[
                    "run_started_at_ms"
                ],
            "launch_attempts":
                summary[
                    "launch_attempts"
                ],
            "launch_ready_attempts":
                summary[
                    "launch_ready_attempts"
                ],
            "launch_ready_rate":
                summary[
                    "launch_ready_rate"
                ],
            "audit_session_starts":
                summary[
                    "audit_session_starts"
                ],
            "audit_session_bounds":
                summary[
                    "audit_session_bounds"
                ],
            "audit_session_finishes":
                summary[
                    "audit_session_finishes"
                ],
            "lifecycle_state":
                summary[
                    "lifecycle_state"
                ],
            "event_count":
                summary[
                    "event_count"
                ],
            "first_event_at_ms":
                summary[
                    "first_event_at_ms"
                ],
            "last_event_at_ms":
                summary[
                    "last_event_at_ms"
                ],
            "measured_duration_ms":
                summary[
                    "measured_duration_ms"
                ],
        })

    return {
        "active_test_run_id":
            active_test_run_id,
        "run_count":
            len(runs),
        "runs":
            runs,
    }


def compare_test_runs(
    *,
    telemetry_service: InMemoryTelemetryService,
    baseline_test_run_id: str,
    candidate_test_run_id: str,
    minimum_sample: int = 10,
) -> dict[str, Any]:
    baseline = build_test_run_summary(
        telemetry_service=
            telemetry_service,
        test_run_id=
            baseline_test_run_id,
    )
    candidate = build_test_run_summary(
        telemetry_service=
            telemetry_service,
        test_run_id=
            candidate_test_run_id,
    )

    metric_names = (
        "audit_to_session_rate",
        "audit_to_finish_rate",
        "bound_to_finish_rate",
    )

    metrics = {}

    for name in metric_names:
        baseline_value = float(
            baseline.get(
                name,
                0.0,
            )
        )
        candidate_value = float(
            candidate.get(
                name,
                0.0,
            )
        )

        metrics[name] = {
            "baseline":
                baseline_value,
            "candidate":
                candidate_value,
            "delta":
                round(
                    candidate_value
                    - baseline_value,
                    6,
                ),
            "delta_percentage_points":
                round(
                    (
                        candidate_value
                        - baseline_value
                    )
                    * 100,
                    2,
                ),
        }

    baseline_sample = int(
        baseline[
            "audit_session_starts"
        ]
    )
    candidate_sample = int(
        candidate[
            "audit_session_starts"
        ]
    )

    sample_status = (
        "comparable"
        if (
            baseline_sample
            >= minimum_sample
            and candidate_sample
            >= minimum_sample
        )
        else "insufficient_data"
    )

    return {
        "comparison_status":
            sample_status,
        "minimum_sample":
            minimum_sample,
        "baseline_sample":
            baseline_sample,
        "candidate_sample":
            candidate_sample,
        "statistical_significance_claimed":
            False,
        "baseline_test_run_id":
            baseline_test_run_id,
        "candidate_test_run_id":
            candidate_test_run_id,
        "baseline": {
            "lifecycle_state":
                baseline[
                    "lifecycle_state"
                ],
            "audit_session_starts":
                baseline[
                    "audit_session_starts"
                ],
            "audit_session_bounds":
                baseline[
                    "audit_session_bounds"
                ],
            "audit_session_finishes":
                baseline[
                    "audit_session_finishes"
                ],
        },
        "candidate": {
            "lifecycle_state":
                candidate[
                    "lifecycle_state"
                ],
            "audit_session_starts":
                candidate[
                    "audit_session_starts"
                ],
            "audit_session_bounds":
                candidate[
                    "audit_session_bounds"
                ],
            "audit_session_finishes":
                candidate[
                    "audit_session_finishes"
                ],
        },
        "metrics":
            metrics,
    }
