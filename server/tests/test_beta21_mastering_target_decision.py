from pathlib import Path
import json


ROOT=Path(__file__).resolve().parents[2]


def test_loudness_measurement_is_separate_from_mastering_target_decision():
    decision=json.loads(
        (
            ROOT
            / "docs"
            / "AUDIO_MASTERING_TARGET_DECISION.json"
        ).read_text(
            encoding="utf-8"
        )
    )
    scan=json.loads(
        (
            ROOT
            / "docs"
            / "AUDIO_BS1770_SCAN.json"
        ).read_text(
            encoding="utf-8"
        )
    )

    assert (
        decision["status"]
        == "UNDECIDED"
    )
    assert (
        decision[
            "mastering_target_selected"
        ]
        is False
    )
    assert (
        decision[
            "integrated_lufs_target"
        ]
        is None
    )
    assert (
        scan[
            "mastering_target_selected"
        ]
        is False
    )
    assert (
        scan[
            "automatic_gain_change"
        ]
        is False
    )
    assert (
        scan[
            "final_mastering_complete"
        ]
        is False
    )
