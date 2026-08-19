from pathlib import Path
import json
import subprocess
import sys
import tempfile
import zipfile


ROOT=Path(__file__).resolve().parents[2]
OUTPUT=(
    ROOT
    / "qa_reports"
    / "imported_browser_e2e.json"
)


PNG_1X1=(
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01"
    b"\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDAT"
    b"\x08\xd7c\xf8\x0f\x00"
    b"\x01\x01\x01\x00"
    b"\x18\xdd\x8d\xb1"
    b"\x00\x00\x00\x00IEND"
    b"\xaeB`\x82"
)


def make_evidence_zip(
    path:Path,
    *,
    skipped:bool=False,
):
    with tempfile.TemporaryDirectory() as tmp:
        base=Path(tmp)
        artifacts=(
            base
            / "browser_e2e_artifacts"
        )
        artifacts.mkdir()

        report={
            "ok":True,
            "skipped":skipped,
            "browser":"Chrome",
        }
        (
            base
            / "browser_e2e.json"
        ).write_text(
            json.dumps(report),
            encoding="utf-8",
        )

        for name in (
            "01-main-menu.png",
            "02-loadout-ready.png",
            "03-battle-started.png",
            "04-battle-result.png",
        ):
            (
                artifacts/name
            ).write_bytes(
                PNG_1X1
            )

        (
            artifacts
            / "console.json"
        ).write_text(
            "[]",
            encoding="utf-8",
        )
        (
            artifacts
            / "network.json"
        ).write_text(
            json.dumps([
                {
                    "status":200,
                    "url":"http://127.0.0.1/",
                }
            ]),
            encoding="utf-8",
        )
        (
            artifacts
            / "checks.json"
        ).write_text(
            json.dumps([
                {
                    "name":"root_200",
                    "ok":True,
                },
                {
                    "name":"no_ui_pause_violation",
                    "ok":True,
                    "metrics":{
                        "ux_matrix":{},
                    },
                },
            ]),
            encoding="utf-8",
        )

        with zipfile.ZipFile(
            path,
            "w",
            zipfile.ZIP_DEFLATED,
        ) as archive:
            for item in base.rglob("*"):
                if item.is_file():
                    archive.write(
                        item,
                        item.relative_to(
                            base
                        ),
                    )


def test_complete_windows_e2e_zip_is_verified_passed():
    original=(
        OUTPUT.read_text(
            encoding="utf-8"
        )
        if OUTPUT.exists()
        else None
    )

    try:
        with tempfile.TemporaryDirectory() as tmp:
            archive=(
                Path(tmp)
                / "windows-e2e.zip"
            )
            make_evidence_zip(
                archive
            )

            result=subprocess.run(
                [
                    sys.executable,
                    "tools/import_browser_e2e_evidence.py",
                    "--source",
                    str(archive),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
            assert result.returncode==0

            payload=json.loads(
                OUTPUT.read_text(
                    encoding="utf-8"
                )
            )
            assert (
                payload["status"]
                == "VERIFIED_PASSED"
            )
            assert (
                payload[
                    "verified_passed"
                ]
                is True
            )
            assert (
                payload[
                    "artifact_integrity"
                ]["complete"]
                is True
            )
            assert len(
                payload[
                    "artifact_integrity"
                ]["sha256"]
            )==7
    finally:
        if original is None:
            OUTPUT.unlink(
                missing_ok=True
            )
        else:
            OUTPUT.write_text(
                original,
                encoding="utf-8",
            )


def test_skipped_windows_e2e_zip_stays_skipped_not_passed():
    original=(
        OUTPUT.read_text(
            encoding="utf-8"
        )
        if OUTPUT.exists()
        else None
    )

    try:
        with tempfile.TemporaryDirectory() as tmp:
            archive=(
                Path(tmp)
                / "windows-e2e-skipped.zip"
            )
            make_evidence_zip(
                archive,
                skipped=True,
            )

            result=subprocess.run(
                [
                    sys.executable,
                    "tools/import_browser_e2e_evidence.py",
                    "--source",
                    str(archive),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
            assert result.returncode==0

            payload=json.loads(
                OUTPUT.read_text(
                    encoding="utf-8"
                )
            )
            assert (
                payload["status"]
                == "SKIPPED"
            )
            assert (
                payload[
                    "verified_passed"
                ]
                is False
            )
            assert (
                payload[
                    "automatic_pass_from_skip"
                ]
                is False
            )
    finally:
        if original is None:
            OUTPUT.unlink(
                missing_ok=True
            )
        else:
            OUTPUT.write_text(
                original,
                encoding="utf-8",
            )
