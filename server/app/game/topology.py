from collections import deque
from dataclasses import dataclass

from .models import ModuleStatus, PlayerBattleState, Position

DISRUPTOR_DEBUFF_ID = "line_disrupted"


@dataclass(slots=True, frozen=True)
class EnergyTopology:
    adjacency: dict[str, tuple[str, ...]]
    reachable_from_generator: tuple[str, ...]
    connection_pairs: tuple[tuple[str, str], ...]


def build_energy_topology(player: PlayerBattleState, core_position: Position) -> EnergyTopology:
    # Buried board cables supply every occupied cell; ports never gate power.
    del core_position
    active = [m for m in player.modules.values() if m.status == ModuleStatus.ACTIVE and m.position is not None and m.hp > 0]
    adjacency = {m.instance_id: tuple(sorted(n.instance_id for n in active if n.instance_id != m.instance_id and
                 abs(m.position.x - n.position.x) + abs(m.position.y - n.position.y) == 1)) for m in active}
    pairs = tuple(sorted({tuple(sorted((key, neighbor))) for key, values in adjacency.items() for neighbor in values}))
    return EnergyTopology(adjacency, tuple(sorted(m.instance_id for m in active)), pairs)
