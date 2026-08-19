from pathlib import Path
import json


ROOT=Path(__file__).resolve().parents[2]


def test_audio_mastering_prep_is_explicitly_pre_master_and_not_fake_lufs():
    report=json.loads(
        (
            ROOT
            / "docs"
            / "AUDIO_MASTERING_PREP.json"
        ).read_text(
            encoding="utf-8"
        )
    )

    assert report[
        "final_mastering_complete"
    ] is False
    assert report[
        "status"
    ]=="pre-mastering-analysis"
    assert len(report["assets"])>=10

    for asset in report["assets"]:
        assert (
            "rms_loudness_proxy_dbfs"
            in asset
        )
        assert (
            "crest_factor_db"
            in asset
        )
        assert (
            asset[
                "final_lufs_measurement_required"
            ]
            is True
        )
