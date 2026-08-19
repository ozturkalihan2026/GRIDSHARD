from pathlib import Path
import json


ROOT=Path(__file__).resolve().parents[2]


def test_packaged_browser_summary_does_not_claim_pass_without_complete_real_artifacts():
    summary=json.loads(
        (
            ROOT
            / "qa_reports"
            / "browser_e2e_evidence_summary.json"
        ).read_text(
            encoding="utf-8"
        )
    )

    if summary[
        "status"
    ]=="PASSED":
        assert (
            summary[
                "evidence_complete"
            ]
            is True
        )
        assert all(
            summary[
                "screenshots"
            ].values()
        )
    elif summary[
        "status"
    ]=="SKIPPED":
        assert (
            summary["passed"]
            is False
        )
        assert (
            summary[
                "automatic_pass_from_skip"
            ]
            is False
        )
