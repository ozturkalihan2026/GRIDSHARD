from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.energy import (
    BASE_DISTRIBUTION_EFFICIENCY,
    SPLITTER_DISTRIBUTION_EFFICIENCY,
)
from app.game.simulation import (
    BALANCED_LAYOUT,
    OFFENSE_LAYOUT,
    DEFENSE_LAYOUT,
    SABOTAGE_LAYOUT,
    BATTERY_PULSE_LAYOUT,
    ARMOR_COUNTER_LAYOUT,
    run_round_robin,
)


def test_generator_11_units_supports_active_battle_but_preserves_storage_role():
    generator=BASIC_MODULE_DEFINITIONS['generator']
    assert generator.energy_generation==11.0

    base=generator.energy_generation*BASE_DISTRIBUTION_EFFICIENCY
    splitter=generator.energy_generation*SPLITTER_DISTRIBUTION_EFFICIENCY

    # Regular combat pairs stay active without forcing constant waiting.
    assert base >= 3+5  # laser + pulse cannon
    assert base >= 3+2  # laser + shield

    # Three common modules become viable with a splitter.
    assert base < 3+5+2
    assert splitter >= 3+5+2

    # Highest-demand pair still needs stored energy/support.
    assert splitter < 5+6  # pulse cannon + railgun


def test_six_layout_round_robin_always_resolves_and_has_multiple_counters():
    layouts=(
        BALANCED_LAYOUT,
        OFFENSE_LAYOUT,
        DEFENSE_LAYOUT,
        SABOTAGE_LAYOUT,
        BATTERY_PULSE_LAYOUT,
        ARMOR_COUNTER_LAYOUT,
    )
    report=run_round_robin(
        layouts,
        max_ticks=1800,
        mirrored=True,
    )

    assert len(report.matches)==30
    assert report.timeouts==0
    assert all(
        match.finish_reason != 'timeout'
        for match in report.matches
    )
    assert all(
        match.elapsed_ms <= 180_000
        for match in report.matches
    )

    # There is no single layout winning every pairing.
    winning_layouts={
        layout_id
        for layout_id,wins
        in report.wins_by_layout.items()
        if wins>0
    }
    assert len(winning_layouts)>=4

    # Exact/late draws may happen, but they are finalized results, not endless simulations.
    assert report.draws <= 2
