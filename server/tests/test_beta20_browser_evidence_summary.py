from pathlib import Path
import json
import subprocess
import sys


ROOT=Path(__file__).resolve().parents[2]


def test_browser_evidence_summary_never_turns_skipped_into_passed():
    report_path=(
        ROOT
        / "qa_reports"
        / "browser_e2e.json"
    )
    original=(
        report_path.read_text(
            encoding="utf-8"
        )
        if report_path.exists()
        else None
    )
    playwright_path=(
        ROOT
        / "qa_reports"
        / "playwright-results.json"
    )
    playwright_original=(
        playwright_path.read_bytes()
        if playwright_path.exists()
        else None
    )

    try:
        playwright_path.unlink(
            missing_ok=True
        )
        report_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        report_path.write_text(
            json.dumps({
                "ok":True,
                "skipped":True,
                "reason":
                    "test policy block",
            }),
            encoding="utf-8",
        )

        result=subprocess.run(
            [
                sys.executable,
                "tools/browser_e2e_evidence.py",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        assert result.returncode==0

        summary=json.loads(
            (
                ROOT
                / "qa_reports"
                / "browser_e2e_evidence_summary.json"
            ).read_text(
                encoding="utf-8"
            )
        )
        assert summary["status"]=="SKIPPED"
        assert summary["passed"] is False
        assert summary["skipped"] is True
        assert (
            summary[
                "automatic_pass_from_skip"
            ]
            is False
        )
    finally:
        if original is None:
            report_path.unlink(
                missing_ok=True
            )
        else:
            report_path.write_text(
                original,
                encoding="utf-8",
            )
        if playwright_original is not None:
            playwright_path.write_bytes(
                playwright_original
            )
