from collections import deque
from dataclasses import dataclass

from .models import BattleModule, Direction, ModuleStatus, PlayerBattleState, Position

DISRUPTOR_DEBUFF_ID = "line_disrupted"


DIRECTION_VECTOR = {
    Direction.UP: (0, -1),
    Direction.RIGHT: (1, 0),
    Direction.DOWN: (0, 1),
    Direction.LEFT: (-1, 0),
}

OPPOSITE_DIRECTION = {
    Direction.UP: Direction.DOWN,
    Direction.RIGHT: Direction.LEFT,
    Direction.DOWN: Direction.UP,
    Direction.LEFT: Direction.RIGHT,
}

LEFT_OF = {
    Direction.UP: Direction.LEFT,
    Direction.RIGHT: Direction.UP,
    Direction.DOWN: Direction.RIGHT,
    Direction.LEFT: Direction.DOWN,
}

RIGHT_OF = {
    Direction.UP: Direction.RIGHT,
    Direction.RIGHT: Direction.DOWN,
    Direction.DOWN: Direction.LEFT,
    Direction.LEFT: Direction.UP,
}


@dataclass(slots=True, frozen=True)
class EnergyTopology:
    adjacency: dict[str, tuple[str, ...]]
    reachable_from_generator: tuple[str, ...]
    connection_pairs: tuple[tuple[str, str], ...]


def _temporary_extra_ports(module: BattleModule) -> int:
    effect = module.temporary_boosters.get("dual_port_adapter")
    if effect is None:
        return 0
    return max(0, int(effect.data.get("extra_port_count", 0)))


def effective_port_count(module: BattleModule) -> int:
    return min(4, module.definition.port_count + _temporary_extra_ports(module))


def _generator_core_direction(
    module: BattleModule,
    core_position: Position,
) -> Direction:
    if module.position is None:
        return module.direction

    dx = core_position.x - module.position.x
    dy = core_position.y - module.position.y

    if abs(dx) + abs(dy) != 1:
        return module.direction

    if dx == 1:
        return Direction.RIGHT
    if dx == -1:
        return Direction.LEFT
    if dy == 1:
        return Direction.DOWN
    return Direction.UP


def module_port_directions(
    module: BattleModule,
    core_position: Position,
) -> tuple[Direction, ...]:
    if module.definition.id == "core":
        return (
            Direction.UP,
            Direction.RIGHT,
            Direction.DOWN,
            Direction.LEFT,
        )

    count = effective_port_count(module)
    if count <= 0:
        return ()

    forward = (
        _generator_core_direction(module, core_position)
        if module.definition.id == "generator"
        else module.direction
    )

    if count == 1:
        return (forward,)
    if count == 2:
        return (forward, OPPOSITE_DIRECTION[forward])
    if count == 3:
        return (forward, LEFT_OF[forward], RIGHT_OF[forward])

    return (
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
    )


def modules_are_port_connected(
    first: BattleModule,
    second: BattleModule,
    core_position: Position,
) -> bool:
    if first.position is None or second.position is None:
        return False

    dx = second.position.x - first.position.x
    dy = second.position.y - first.position.y

    direction = None
    if (dx, dy) == (0, -1):
        direction = Direction.UP
    elif (dx, dy) == (1, 0):
        direction = Direction.RIGHT
    elif (dx, dy) == (0, 1):
        direction = Direction.DOWN
    elif (dx, dy) == (-1, 0):
        direction = Direction.LEFT

    if direction is None:
        return False

    first_ports = module_port_directions(first, core_position)
    second_ports = module_port_directions(second, core_position)

    return (
        direction in first_ports
        and OPPOSITE_DIRECTION[direction] in second_ports
    )


def build_energy_topology(
    player: PlayerBattleState,
    core_position: Position,
) -> EnergyTopology:
    active = [
        module
        for module in player.modules.values()
        if module.status == ModuleStatus.ACTIVE
        and module.position is not None
        and DISRUPTOR_DEBUFF_ID not in module.debuffs
    ]

    adjacency_lists = {
        module.instance_id: []
        for module in active
    }
    pairs = []

    for index, first in enumerate(active):
        for second in active[index + 1:]:
            if not modules_are_port_connected(
                first,
                second,
                core_position,
            ):
                continue

            adjacency_lists[first.instance_id].append(second.instance_id)
            adjacency_lists[second.instance_id].append(first.instance_id)
            pairs.append(
                tuple(sorted((first.instance_id, second.instance_id)))
            )

    source_ids = sorted(
        module.instance_id
        for module in active
        if module.definition.energy_generation > 0
    )

    reachable = set(source_ids)
    queue = deque(source_ids)

    while queue:
        current = queue.popleft()

        for neighbor in sorted(adjacency_lists.get(current, ())):
            if neighbor in reachable:
                continue

            reachable.add(neighbor)
            queue.append(neighbor)

    adjacency = {
        module_id: tuple(sorted(neighbors))
        for module_id, neighbors in adjacency_lists.items()
    }

    return EnergyTopology(
        adjacency=adjacency,
        reachable_from_generator=tuple(sorted(reachable)),
        connection_pairs=tuple(sorted(set(pairs))),
    )
