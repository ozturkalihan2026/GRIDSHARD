from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_starter_deck_has_six_valid_unique_module_ids():
    source = (ROOT / "client/src/app.js").read_text(encoding="utf-8")
    start = source.index("const STARTER_BATTLE_POOL_PRESET")
    end = source.index("function withStarterBattlePoolPresets", start)
    block = source[start:end]

    expected = {
        "battery", "laser", "pulse_cannon",
        "shield", "repair", "targeting_computer",
    }
    assert all(f'"{module_id}"' in block for module_id in expected)
    assert '"generator"' not in block
    assert '"core"' not in block


def test_short_tutorial_is_wired_before_app_startup():
    html = (ROOT / "client/index.html").read_text(encoding="utf-8")
    assert 'id="tutorial-overlay"' in html
    assert 'id="tutorial-replay"' not in html
    assert 'id="battle-pool-preset-open"' in html
    assert html.index("tutorial-controller.js") < html.index("app.js")


def test_native_runtime_configuration_loads_before_authentication():
    html = (ROOT / "client/index.html").read_text(encoding="utf-8")
    assert html.index("runtime-config.js") < html.index("auth-session.js")
    assert (ROOT / "capacitor.config.js").is_file()
    assert (ROOT / "tools/build-mobile-web.js").is_file()
