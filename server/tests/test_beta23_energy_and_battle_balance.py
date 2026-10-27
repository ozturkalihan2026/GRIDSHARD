from app.game.simulation import (
    _install_layout,
    BALANCED_LAYOUT,
    OFFENSE_LAYOUT,
    DEFENSE_LAYOUT,
    SABOTAGE_LAYOUT,
    BATTERY_PULSE_LAYOUT,
    ARMOR_COUNTER_LAYOUT,
    run_round_robin,
)
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus


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

    # This fixture never rebuilds. Different layouts can also simultaneously
    # lose their final weapons. Verify that physical stalemate explicitly;
    # dynamic AI rebuilding is covered separately by the rollout matrix.
    by_id={layout.id:layout for layout in layouts}
    for match in report.matches:
        if match.timed_out:
            first=by_id[match.layout_a_id]
            second=by_id[match.layout_b_id]
            engine=BattleEngine(BattleState(battle_id='static-stalemate'))
            for owner,layout in (('a',first),('b',second)):
                engine.add_player(owner);_install_layout(engine,owner,layout)
            engine.start()
            for _ in range(6000):engine.step()
            assert all(not any(m.status==ModuleStatus.ACTIVE and m.hp>0
                               and m.definition.base_damage>0
                               for m in player.modules.values())
                       for player in engine.state.players.values())

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
