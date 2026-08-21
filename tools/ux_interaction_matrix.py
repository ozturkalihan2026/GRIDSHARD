from __future__ import annotations

from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/"qa_reports"
OUTPUT=QA/"ux_interaction_matrix.json"

CATEGORIES=[
    "module_place",
    "module_move",
    "generator_gate",
    "booster",
    "technical_drawer",
    "other_ui",
]


def load(path:Path):
    try:
        return json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )
    except Exception:
        return None


def matrix_from_checks(checks:list)->dict:
    final=next(
        (
            item.get(
                "metrics"
            )
            for item
            in checks
            if item.get("name")
            == "no_ui_pause_violation"
        ),
        None,
    )
    if not isinstance(
        final,
        dict,
    ):
        return {}
    return final.get(
        "ux_matrix",
        {},
    ) or {}


def main()->int:
    source="none"
    matrix={}
    pause_violations=None
    evidence_status="NOT_AVAILABLE"

    imported=load(
        QA/"imported_browser_e2e.json"
    )
    if (
        isinstance(imported,dict)
        and imported.get(
            "status"
        )=="VERIFIED_PASSED"
    ):
        matrix=matrix_from_checks(
            imported.get(
                "checks",
                [],
            )
        )
        final=next(
            (
                item.get(
                    "metrics"
                )
                for item
                in imported.get(
                    "checks",
                    [],
                )
                if item.get("name")
                == "no_ui_pause_violation"
            ),
            None,
        )
        pause_violations=(
            final.get(
                "pause_violation_count"
            )
            if isinstance(
                final,
                dict,
            )
            else None
        )
        source="imported_windows_e2e"
        evidence_status="VERIFIED_PASSED"
    else:
        local=load(
            QA
            / "browser_e2e_evidence_summary.json"
        )
        if (
            isinstance(local,dict)
            and local.get(
                "status"
            )=="PASSED"
        ):
            matrix=(
                local.get(
                    "ux_timing",
                    {},
                )
                .get(
                    "interaction_matrix",
                    {},
                )
                or {}
            )
            final=(
                local.get(
                    "ux_timing",
                    {},
                )
                .get(
                    "final_metrics"
                )
            )
            pause_violations=(
                final.get(
                    "pause_violation_count"
                )
                if isinstance(
                    final,
                    dict,
                )
                else None
            )
            source="local_browser_e2e"
            evidence_status="PASSED"

    normalized={}
    for category in CATEGORIES:
        value=matrix.get(
            category,
            {},
        )
        normalized[category]={
            "count":
                int(
                    value.get(
                        "count",
                        0,
                    )
                    or 0
                ),
            "average_frame_gap_ms":
                float(
                    value.get(
                        "average_frame_gap_ms",
                        0,
                    )
                    or 0
                ),
            "max_frame_gap_ms":
                float(
                    value.get(
                        "max_frame_gap_ms",
                        0,
                    )
                    or 0
                ),
            "average_clock_delta_ms":
                float(
                    value.get(
                        "average_clock_delta_ms",
                        0,
                    )
                    or 0
                ),
            "max_clock_delta_ms":
                float(
                    value.get(
                        "max_clock_delta_ms",
                        0,
                    )
                    or 0
                ),
        }

    measured=bool(matrix)

    payload={
        "version":
            "2.0.0-beta.25",
        "status":
            "MEASURED"
            if measured
            else "SKIPPED",
        "source":
            source,
        "evidence_status":
            evidence_status,
        "categories":
            normalized,
        "pause_violation_count":
            pause_violations,
        "simulation_clock_paused_by_ui":
            (
                pause_violations
                is not None
                and pause_violations
                > 0
            ),
        "note":
            (
                "Kategori matrisi yalnız gerçek PASSED browser kanıtından üretilir."
                if measured
                else "Gerçek PASSED browser kanıtı yok; kategori matrisi uydurulmadı."
            ),
    }

    OUTPUT.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )+"\n",
        encoding="utf-8",
    )

    print(
        "UX interaction matrix:",
        payload["status"],
    )
    return 0


if __name__=="__main__":
    raise SystemExit(main())
