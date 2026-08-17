from __future__ import annotations
from typing import Any


def build_first_run_checklist(
    *,
    version: str,
    build: str,
    test_run_id: str,
    launch_readiness: dict[str, Any],
    data_health: dict[str, Any],
    rc_candidate: dict[str, Any],
    run_summary: dict[str, Any],
) -> dict[str, Any]:
    player = data_health.get(
        "player_data",
        {},
    )
    telemetry = data_health.get(
        "telemetry",
        {},
    )

    checks = {
        "launch_ready":
            bool(
                launch_readiness.get(
                    "launch_ready"
                )
            ),
        "player_data_ready":
            bool(
                player.get(
                    "ready"
                )
            ),
        "telemetry_ready":
            bool(
                telemetry.get(
                    "ready"
                )
            ),
        "retention_configured":
            int(
                telemetry.get(
                    "retention_limit",
                    0,
                )
            ) >= 1,
        "rc_candidate":
            bool(
                rc_candidate.get(
                    "rc_candidate"
                )
            ),
        "test_run_match":
            launch_readiness.get(
                "test_run_id"
            )
            == test_run_id
            == rc_candidate.get(
                "test_run_id"
            ),
    }

    notes = []

    if (
        player.get(
            "player_count",
            0,
        ) > 0
        and not player.get(
            "backup_ready"
        )
    ):
        notes.append(
            "Oyuncu verisi var ancak sağlam yedek henüz oluşmamış."
        )

    if (
        telemetry.get(
            "event_count",
            0,
        ) > 0
        and not telemetry.get(
            "backup_ready"
        )
    ):
        notes.append(
            "Telemetri verisi var ancak sağlam yedek henüz oluşmamış."
        )

    audit_chain = {
        "launch_attempts":
            int(
                run_summary.get(
                    "launch_attempts",
                    0,
                )
            ),
        "audit_session_starts":
            int(
                run_summary.get(
                    "audit_session_starts",
                    0,
                )
            ),
        "audit_session_bounds":
            int(
                run_summary.get(
                    "audit_session_bounds",
                    0,
                )
            ),
        "audit_session_finishes":
            int(
                run_summary.get(
                    "audit_session_finishes",
                    0,
                )
            ),
    }

    behavior = rc_candidate.get(
        "behavior",
        {},
    )

    return {
        "ready":
            all(
                checks.values()
            ),
        "version":
            version,
        "build":
            build,
        "test_run_id":
            test_run_id,
        "checks":
            checks,
        "failed_checks": [
            name
            for name,ok
            in checks.items()
            if not ok
        ],
        "notes":
            notes,
        "persistence": {
            "player_data": {
                "ready":
                    bool(
                        player.get(
                            "ready"
                        )
                    ),
                "backup_available":
                    bool(
                        player.get(
                            "backup_available"
                        )
                    ),
                "backup_ready":
                    bool(
                        player.get(
                            "backup_ready"
                        )
                    ),
            },
            "telemetry": {
                "ready":
                    bool(
                        telemetry.get(
                            "ready"
                        )
                    ),
                "backup_available":
                    bool(
                        telemetry.get(
                            "backup_available"
                        )
                    ),
                "backup_ready":
                    bool(
                        telemetry.get(
                            "backup_ready"
                        )
                    ),
                "retention_limit":
                    int(
                        telemetry.get(
                            "retention_limit",
                            0,
                        )
                    ),
                "retention_active":
                    bool(
                        telemetry.get(
                            "retention_active"
                        )
                    ),
            },
        },
        "audit_chain":
            audit_chain,
        "behavior": {
            "blocks_launch":
                False,
            "insufficient_signal_count":
                int(
                    behavior.get(
                        "insufficient_signal_count",
                        0,
                    )
                ),
            "insufficient_signals":
                list(
                    behavior.get(
                        "insufficient_signals",
                        [],
                    )
                ),
        },
    }
