from app.game.simulation import (
    BALANCED_LAYOUT,
    OFFENSE_LAYOUT,
    DEFENSE_LAYOUT,
    SABOTAGE_LAYOUT,
    BATTERY_PULSE_LAYOUT,
    ARMOR_COUNTER_LAYOUT,
    run_round_robin,
)


def test_six_layout_round_robin_resolves_without_a_timer_and_has_multiple_counters():
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
        max_ticks=6000,
        mirrored=True,
    )

    assert len(report.matches)==30

    # Süre sınırı yoktur. Bu koşum kart basmadığı için yalnız birebir aynı
    # iki düzen, iki tarafın saldırıları aynı anda yok olunca kilitlenebilir;
    # gerçek maçta oyuncular Akım ile yeni kart basar.
    by_id={layout.id:layout for layout in layouts}
    for match in report.matches:
        if match.timed_out:
            first=by_id[match.layout_a_id]
            second=by_id[match.layout_b_id]
            assert [
                (item.definition_id,item.x,item.y) for item in first.modules
            ]==[
                (item.definition_id,item.x,item.y) for item in second.modules
            ]

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
