from __future__ import annotations

from typing import Any


def build_operation_readiness(
    *,
    manifest: dict[str, Any],
    data_health: dict[str, Any],
    rc_report: dict[str, Any],
) -> dict[str, Any]:
    checks = {
        "server_version":
            bool(
                manifest.get(
                    "server_version"
                )
            ),
        "web_test_build":
            bool(
                manifest.get(
                    "web_test_build"
                )
            ),
        "pvp_protocol":
            int(
                manifest.get(
                    "pvp_protocol_version",
                    0,
                )
            ) >= 1,
        "release_ready":
            bool(
                manifest.get(
                    "release_ready"
                )
            ),
        "player_data_ready":
            bool(
                data_health.get(
                    "player_data",
                    {},
                ).get(
                    "ready"
                )
            ),
        "telemetry_ready":
            bool(
                data_health.get(
                    "telemetry",
                    {},
                ).get(
                    "ready"
                )
            ),
        "retention_configured":
            int(
                data_health.get(
                    "telemetry",
                    {},
                ).get(
                    "retention_limit",
                    0,
                )
            ) >= 1,
        "rc_ready":
            bool(
                rc_report.get(
                    "ready"
                )
            ),
    }

    warnings: list[str] = []

    player_data = data_health.get(
        "player_data",
        {},
    )
    telemetry = data_health.get(
        "telemetry",
        {},
    )

    if (
        player_data.get(
            "player_count",
            0,
        ) > 0
        and not player_data.get(
            "backup_ready"
        )
    ):
        warnings.append(
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
        warnings.append(
            "Telemetri verisi var ancak sağlam yedek henüz oluşmamış."
        )

    return {
        "ready": all(
            checks.values()
        ),
        "checks": checks,
        "warnings": warnings,
        "server_version":
            manifest.get(
                "server_version"
            ),
        "web_test_build":
            manifest.get(
                "web_test_build"
            ),
        "pvp_protocol_version":
            manifest.get(
                "pvp_protocol_version"
            ),
        "player_count":
            int(
                player_data.get(
                    "player_count",
                    0,
                )
            ),
        "telemetry_event_count":
            int(
                telemetry.get(
                    "event_count",
                    0,
                )
            ),
        "telemetry_retention_limit":
            int(
                telemetry.get(
                    "retention_limit",
                    0,
                )
            ),
        "rc_critical_failures":
            list(
                rc_report.get(
                    "critical_failures",
                    [],
                )
            ),
    }
