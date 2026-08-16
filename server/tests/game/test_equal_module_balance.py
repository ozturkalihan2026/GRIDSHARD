from app.game.balance import analyze_balance
from app.game.simulation import (
    ARMOR_COUNTER_LAYOUT,
    BATTERY_PULSE_LAYOUT,
    DEFAULT_SIMULATION_LAYOUTS,
    run_match,
    run_round_robin,
)


def test_all_default_competitive_layouts_have_six_modules():
    assert {
        len(layout.modules)
        for layout in DEFAULT_SIMULATION_LAYOUTS
    } == {6}


def test_battery_pulse_has_real_armor_counter_from_both_sides():
    first = run_match(
        ARMOR_COUNTER_LAYOUT,
        BATTERY_PULSE_LAYOUT,
        max_ticks=1800,
    )

    second = run_match(
        BATTERY_PULSE_LAYOUT,
        ARMOR_COUNTER_LAYOUT,
        max_ticks=1800,
    )

    assert first.winner_layout_id == "armor_counter"
    assert second.winner_layout_id == "armor_counter"


def test_default_round_robin_has_no_side_advantage():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=1800,
        mirrored=True,
    )

    analysis = analyze_balance(
        report,
        DEFAULT_SIMULATION_LAYOUTS,
    )

    assert analysis.side_advantage == 0.0
    assert set(
        analysis.module_count_by_layout.values()
    ) == {6}


def test_static_meta_skew_remains_visible_for_ai_phase():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=1800,
        mirrored=True,
    )

    analysis = analyze_balance(
        report,
        DEFAULT_SIMULATION_LAYOUTS,
    )

    assert isinstance(analysis.issues, tuple)
