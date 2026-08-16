from app.game.balance import analyze_balance
from app.game.simulation import (
    DEFAULT_SIMULATION_LAYOUTS,
    run_round_robin,
)


def test_default_analysis_confirms_equal_module_counts():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=5,
        mirrored=True,
    )
    analysis = analyze_balance(
        report,
        DEFAULT_SIMULATION_LAYOUTS,
    )

    assert set(
        analysis.module_count_by_layout.values()
    ) == {6}

    assert not any(
        "aktif modül sayıları eşit değil" in issue
        for issue in analysis.issues
    )

def test_mirrored_analysis_calculates_side_advantage():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=5,
        mirrored=True,
    )
    analysis = analyze_balance(
        report,
        DEFAULT_SIMULATION_LAYOUTS,
    )

    assert 0.0 <= analysis.side_advantage <= 1.0


def test_rates_are_normalized():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=2,
        mirrored=True,
    )
    analysis = analyze_balance(
        report,
        DEFAULT_SIMULATION_LAYOUTS,
    )

    assert 0.0 <= analysis.timeout_rate <= 1.0
    assert 0.0 <= analysis.draw_rate <= 1.0


def test_win_shares_sum_to_one_when_wins_exist():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=1800,
        mirrored=True,
    )
    analysis = analyze_balance(
        report,
        DEFAULT_SIMULATION_LAYOUTS,
    )

    if analysis.resolved_matches:
        assert round(
            sum(analysis.win_share_by_layout.values()),
            9,
        ) == 1.0
