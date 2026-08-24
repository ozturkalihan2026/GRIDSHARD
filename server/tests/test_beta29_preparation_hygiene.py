from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RETIRED_AUDIO = {
    "battle_pulse.wav",
    "battle_pulse_v4.wav",
    "critical_core_layer.wav",
    "critical_core_layer_v4.wav",
    "menu_pulse.wav",
    "menu_pulse_v4.wav",
    "menu_shardglass_v5.wav",
    "pool_pulse.wav",
    "pool_pulse_v4.wav",
    "pool_flux_v5.wav",
}


def test_preparation_pool_cards_share_the_battle_icon_language():
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    css = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")

    assert app.count('"module-icon pool-module-icon"') == 2
    assert app.count('"pool-module-category"') == 2
    assert app.count("moduleIconFor(module)") >= 3
    assert ".battle-pool-selection .pool-category-list" in css
    assert ".battle-pool-selected .pool-category-list" in css
    assert "grid-template-columns:repeat(2,minmax(0,1fr))" in css
    assert '.pool-module-card[data-category="saldırı"]' in css


def test_beta29_repository_has_no_retired_runtime_audio_or_root_manifest():
    audio_dir = ROOT / "client" / "assets" / "audio"
    actual = {path.name for path in audio_dir.glob("*.wav")}

    assert not (actual & RETIRED_AUDIO)
    assert not (ROOT / "RELEASE_MANIFEST.json").exists()


def test_release_packager_excludes_every_root_release_artifact():
    source = (ROOT / "tools" / "package_release.py").read_text(
        encoding="utf-8"
    )

    assert "GRIDSHARD-*.zip" in source
    assert "GRIDSHARD-*.zip.sha256" in source
    assert "is_generated_root_artifact" in source
    assert '"--output-dir"' in source
