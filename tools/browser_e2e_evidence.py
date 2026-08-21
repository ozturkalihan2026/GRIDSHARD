from __future__ import annotations

import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/"qa_reports/browser_e2e.json"
ARTIFACT_DIR=ROOT/"qa_reports/browser_e2e_artifacts"
OUTPUT=ROOT/"qa_reports/browser_e2e_evidence_summary.json"


def load_json(path:Path,default):
    try:
        return json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )
    except Exception:
        return default


def main()->int:
    report=load_json(
        REPORT,
        {},
    )

    if report.get("skipped"):
        source_status="SKIPPED"
    elif report.get("ok") is True:
        source_status="PASSED"
    elif report:
        source_status="FAILED"
    else:
        source_status="NOT_RUN"

    checks=load_json(
        ARTIFACT_DIR/"checks.json",
        [],
    )
    console=load_json(
        ARTIFACT_DIR/"console.json",
        [],
    )
    network=load_json(
        ARTIFACT_DIR/"network.json",
        [],
    )

    screenshot_names=[
        "01-main-menu.png",
        "02-loadout-ready.png",
        "03-battle-started.png",
        "04-battle-result.png",
    ]
    screenshots={
        name:
            (ARTIFACT_DIR/name).exists()
        for name in screenshot_names
    }

    ux_check=next(
        (
            item
            for item
            in checks
            if item.get("name")
            == "no_ui_pause_violation"
        ),
        None,
    )
    interaction_check=next(
        (
            item
            for item
            in checks
            if item.get("name")
            == "battle_ui_does_not_pause_tick"
        ),
        None,
    )

    final_metrics=(
        ux_check.get(
            "metrics"
        )
        if isinstance(
            ux_check,
            dict,
        )
        else None
    )

    evidence_complete=(
        source_status=="PASSED"
        and all(
            screenshots.values()
        )
        and bool(checks)
        and all(
            item.get("ok")
            is True
            for item in checks
        )
        and (
            ARTIFACT_DIR
            / "console.json"
        ).exists()
        and (
            ARTIFACT_DIR
            / "network.json"
        ).exists()
        and sum(
            1
            for item
            in console
            if item.get("type")
            == "error"
        ) == 0
        and sum(
            1
            for item
            in network
            if int(
                item.get(
                    "status",
                    0,
                )
                or 0
            ) >= 400
        ) == 0
    )

    status=(
        "SKIPPED"
        if source_status
        == "SKIPPED"
        else (
            "PASSED"
            if evidence_complete
            else (
                "NOT_RUN"
                if source_status
                == "NOT_RUN"
                else "FAILED"
            )
        )
    )

    summary={
        "version":
            "2.0.0-beta.25",
        "source_status":
            source_status,
        "status":status,
        "passed":
            status=="PASSED",
        "skipped":
            status=="SKIPPED",
        "failed":
            status=="FAILED",
        "reason":
            report.get(
                "reason"
            ),
        "browser":
            report.get(
                "browser"
            ),
        "evidence_complete":
            evidence_complete,
        "screenshots":
            screenshots,
        "console":{
            "artifact_exists":
                (
                    ARTIFACT_DIR
                    / "console.json"
                ).exists(),
            "message_count":
                len(console),
            "error_count":
                sum(
                    1
                    for item
                    in console
                    if item.get(
                        "type"
                    )=="error"
                ),
        },
        "network":{
            "artifact_exists":
                (
                    ARTIFACT_DIR
                    / "network.json"
                ).exists(),
            "response_count":
                len(network),
            "http_error_count":
                sum(
                    1
                    for item
                    in network
                    if int(
                        item.get(
                            "status",
                            0,
                        )
                        or 0
                    ) >= 400
                ),
        },
        "ux_timing":{
            "clock_progress_check":
                interaction_check,
            "final_metrics":
                final_metrics,
            "category_counts":
                (
                    final_metrics.get(
                        "ux_categories",
                        {},
                    )
                    if isinstance(
                        final_metrics,
                        dict,
                    )
                    else {}
                ),
            "interaction_matrix":
                (
                    final_metrics.get(
                        "ux_matrix",
                        {},
                    )
                    if isinstance(
                        final_metrics,
                        dict,
                    )
                    else {}
                ),
        },
        "checks":
            checks,
        "automatic_pass_from_skip":
            False,
    }

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    OUTPUT.write_text(
        json.dumps(
            summary,
            ensure_ascii=False,
            indent=2,
        )+"\n",
        encoding="utf-8",
    )

    print(
        f"GRIDSHARD Browser E2E evidence: {status}"
    )
    print(
        f"Rapor: {OUTPUT}"
    )
    return 0


if __name__=="__main__":
    raise SystemExit(main())
