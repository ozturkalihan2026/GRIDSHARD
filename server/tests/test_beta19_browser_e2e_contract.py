from pathlib import Path


ROOT=Path(__file__).resolve().parents[2]


def test_browser_e2e_collects_artifacts_and_windows_launcher_exists():
    runner=(
        ROOT
        / "tools"
        / "browser_e2e.py"
    ).read_text(
        encoding="utf-8"
    )
    launcher=(
        ROOT
        / "TARAYICI_E2E_TEST.bat"
    ).read_text(
        encoding="utf-8"
    )

    for name in (
        "01-main-menu.png",
        "02-loadout-ready.png",
        "03-battle-started.png",
        "04-battle-result.png",
        "console.json",
        "network.json",
        "checks.json",
    ):
        assert name in runner

    assert (
        "battle_ui_does_not_pause_tick"
        in runner
    )
    assert (
        "__GRIDSHARD_BATTLE_UX"
        in runner
    )
    assert "browser_e2e.py" in launcher
    assert (
        "browser_e2e_artifacts"
        in launcher
    )
