from pathlib import Path


ROOT=Path(__file__).resolve().parents[2]


def test_windows_browser_e2e_launcher_exports_portable_evidence_zip():
    launcher=(
        ROOT
        / "TARAYICI_E2E_TEST.bat"
    ).read_text(
        encoding="utf-8"
    )
    exporter=(
        ROOT
        / "tools"
        / "export_browser_e2e_evidence.py"
    ).read_text(
        encoding="utf-8"
    )

    assert (
        "tools\\export_browser_e2e_evidence.py"
        in launcher
    )
    assert (
        "gridshard-windows-browser-e2e-evidence.zip"
        in launcher
    )
    assert (
        "browser_e2e_artifacts"
        in exporter
    )
    assert (
        "Browser E2E SKIPPED"
        in exporter
    )
