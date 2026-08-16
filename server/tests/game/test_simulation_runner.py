from app.game.simulation import (
    BALANCED_LAYOUT,
    DEFAULT_SIMULATION_LAYOUTS,
    DEFENSE_LAYOUT,
    OFFENSE_LAYOUT,
    run_match,
    run_mirrored_pair,
    run_round_robin,
)


def test_same_input_produces_same_result():
    first = run_match(
        BALANCED_LAYOUT,
        DEFENSE_LAYOUT,
        max_ticks=300,
    )
    second = run_match(
        BALANCED_LAYOUT,
        DEFENSE_LAYOUT,
        max_ticks=300,
    )

    assert first == second


def test_match_runner_has_timeout_safety():
    result = run_match(
        BALANCED_LAYOUT,
        DEFENSE_LAYOUT,
        max_ticks=1,
    )

    assert result.timed_out is True
    assert result.elapsed_ms == 100


def test_mirrored_pair_swaps_layout_sides():
    first, second = run_mirrored_pair(
        BALANCED_LAYOUT,
        OFFENSE_LAYOUT,
        max_ticks=10,
    )

    assert first.layout_a_id == "balanced"
    assert first.layout_b_id == "offense"
    assert second.layout_a_id == "offense"
    assert second.layout_b_id == "balanced"


def test_round_robin_generates_all_mirrored_pairs():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=5,
        mirrored=True,
    )

    layout_count = len(DEFAULT_SIMULATION_LAYOUTS)
    expected = (
        layout_count * (layout_count - 1) // 2
    ) * 2

    assert len(report.matches) == expected


def test_report_totals_match_match_count():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=5,
        mirrored=True,
    )

    resolved_wins = sum(
        report.wins_by_layout.values()
    )

    assert (
        resolved_wins
        + report.draws
        + report.timeouts
        == len(report.matches)
    )


def test_report_has_average_duration():
    report = run_round_robin(
        DEFAULT_SIMULATION_LAYOUTS,
        max_ticks=3,
    )

    assert report.average_duration_ms > 0


def test_layout_ids_are_unique():
    ids = [
        layout.id
        for layout in DEFAULT_SIMULATION_LAYOUTS
    ]

    assert len(ids) == len(set(ids))
