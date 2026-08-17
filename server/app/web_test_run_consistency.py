from __future__ import annotations
from typing import Any


def build_run_started_consistency(
    *,
    active_test_run_id: str,
    run_status: dict[str, Any],
    preflight: dict[str, Any],
) -> dict[str, Any]:
    started = bool(
        run_status.get(
            "started"
        )
    )

    if not started:
        return {
            "status":
                "not_started",
            "consistent":
                True,
            "active_test_run_id":
                active_test_run_id,
            "checks": {
                "run_started":
                    False,
            },
        }

    checks = {
        "run_started":
            True,
        "status_run_match":
            run_status.get(
                "test_run_id"
            )
            == active_test_run_id,
        "preflight_run_match":
            preflight.get(
                "test_run_id"
            )
            == active_test_run_id,
    }

    return {
        "status":
            (
                "consistent"
                if all(
                    checks.values()
                )
                else "mismatch"
            ),
        "consistent":
            all(
                checks.values()
            ),
        "active_test_run_id":
            active_test_run_id,
        "checks":
            checks,
        "failed_checks": [
            name
            for name,ok
            in checks.items()
            if not ok
        ],
    }
