from app.game.energy import process_energy_tick
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    ModuleStatus,
    Position,
)


def test_generator_on_energy_cell_gets_bonus():
    engine = BattleEngine(
        BattleState(battle_id="energy-cell")
    )
    player = engine.add_player("p1")

    generator = engine.grant_module(
        "p1",
        "generator-1",
        "generator",
    )
    generator.status = ModuleStatus.ACTIVE
    generator.position = Position(2, 4)

    result = process_energy_tick(
        player,
        Position(2, 2),
    )

    assert round(result.generated, 6) == 1.265
