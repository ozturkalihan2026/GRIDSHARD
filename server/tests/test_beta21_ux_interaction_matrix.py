from pathlib import Path
import json
import subprocess
import sys


ROOT=Path(__file__).resolve().parents[2]
QA=ROOT/"qa_reports"
IMPORTED=QA/"imported_browser_e2e.json"
OUTPUT=QA/"ux_interaction_matrix.json"


def test_ux_matrix_uses_verified_windows_browser_evidence():
    original_import=(
        IMPORTED.read_text(
            encoding="utf-8"
        )
        if IMPORTED.exists()
        else None
    )
    original_output=(
        OUTPUT.read_text(
            encoding="utf-8"
        )
        if OUTPUT.exists()
        else None
    )

    try:
        IMPORTED.write_text(
            json.dumps({
                "status":
                    "VERIFIED_PASSED",
                "verified_passed":
                    True,
                "checks":[
                    {
                        "name":
                            "no_ui_pause_violation",
                        "ok":True,
                        "metrics":{
                            "pause_violation_count":0,
                            "ux_matrix":{
                                "module_place":{
                                    "count":2,
                                    "average_frame_gap_ms":16,
                                    "max_frame_gap_ms":21,
                                    "average_clock_delta_ms":500,
                                    "max_clock_delta_ms":700,
                                },
                                "generator_gate":{
                                    "count":1,
                                    "average_frame_gap_ms":17,
                                    "max_frame_gap_ms":17,
                                    "average_clock_delta_ms":900,
                                    "max_clock_delta_ms":900,
                                },
                            },
                        },
                    }
                ],
            }),
            encoding="utf-8",
        )

        result=subprocess.run(
            [
                sys.executable,
                "tools/ux_interaction_matrix.py",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        assert result.returncode==0

        matrix=json.loads(
            OUTPUT.read_text(
                encoding="utf-8"
            )
        )
        assert matrix["status"]=="MEASURED"
        assert (
            matrix["source"]
            == "imported_windows_e2e"
        )
        assert (
            matrix["categories"]
            ["module_place"]
            ["count"]==2
        )
        assert (
            matrix[
                "pause_violation_count"
            ]==0
        )
        assert (
            matrix[
                "simulation_clock_paused_by_ui"
            ]
            is False
        )
    finally:
        if original_import is None:
            IMPORTED.unlink(
                missing_ok=True
            )
        else:
            IMPORTED.write_text(
                original_import,
                encoding="utf-8",
            )

        if original_output is None:
            OUTPUT.unlink(
                missing_ok=True
            )
        else:
            OUTPUT.write_text(
                original_output,
                encoding="utf-8",
            )
