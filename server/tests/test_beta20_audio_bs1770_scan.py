from pathlib import Path
import json


ROOT=Path(__file__).resolve().parents[2]


def test_bs1770_scan_never_invents_lufs_when_unavailable_and_is_not_mastering():
    report=json.loads(
        (
            ROOT
            / "docs"
            / "AUDIO_BS1770_SCAN.json"
        ).read_text(
            encoding="utf-8"
        )
    )

    assert report[
        "final_mastering_complete"
    ] is False

    if report["available"]:
        assert report[
            "status"
        ] in {
            "MEASURED",
            "PARTIAL",
        }
        assert report["assets"]
        assert all(
            "integrated_lufs"
            in asset
            for asset
            in report["assets"]
        )
    else:
        assert report[
            "status"
        ]=="SKIPPED"
        assert report["assets"]==[]
