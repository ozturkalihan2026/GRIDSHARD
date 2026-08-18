from app.game.engine import (
    BattleEngine,
    MODULE_INTERACTION_UNLOCK_MS,
)
from app.game.models import (
    BattleState,
    Direction,
    Position,
)


def setup_engine():
    engine=BattleEngine(
        BattleState(
            battle_id="generator-gates"
        )
    )
    engine.add_player("p1")

    core=engine.grant_module(
        "p1","core-1","core"
    )
    generator=engine.grant_module(
        "p1","generator-1","generator"
    )

    engine.set_initial_active_module(
        "p1",core.instance_id,2,2
    )
    engine.set_initial_active_module(
        "p1",generator.instance_id,2,3,Direction.UP
    )

    engine.start()
    engine.state.elapsed_ms=MODULE_INTERACTION_UNLOCK_MS
    return engine,generator


def test_generator_can_move_between_core_gates():
    engine,generator=setup_engine()
    engine._cmd_move_module(
        "p1",
        {
            "module_id":generator.instance_id,
            "x":1,
            "y":2,
        },
    )
    assert generator.position==Position(1,2)


def test_generator_cannot_move_to_normal_placeable_cell():
    engine,generator=setup_engine()
    try:
        engine._cmd_move_module(
            "p1",
            {
                "module_id":generator.instance_id,
                "x":1,
                "y":1,
            },
        )
    except Exception as exc:
        assert "Çekirdek kapısı" in str(exc)
    else:
        raise AssertionError(
            "Jeneratör normal hücreye taşınmamalıydı."
        )


def test_generator_still_cannot_be_removed():
    engine,generator=setup_engine()
    try:
        engine._cmd_remove_module(
            "p1",
            {"module_id":generator.instance_id},
        )
    except Exception as exc:
        assert "devreden çıkarılamaz" in str(exc)
    else:
        raise AssertionError(
            "Jeneratör rafa alınmamalıydı."
        )
