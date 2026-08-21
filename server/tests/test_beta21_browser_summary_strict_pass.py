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
        playwright_matrix=(
            summary.get(
                "playwright_matrix",
                {},
            )
        )
        if playwright_matrix.get(
            "complete"
        ):
            assert (
                playwright_matrix[
                    "passed_by_project"
                ]
                == playwright_matrix[
                    "expected_projects"
                ]
            )
            assert playwright_matrix[
                "test_count"
            ]==5
        else:
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
