from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class BattleStatus(str, Enum):
    WAITING = "waiting"
    RUNNING = "running"
    FINISHED = "finished"


class ModuleStatus(str, Enum):
    ACTIVE = "active"
    RESERVE = "reserve"
    DESTROYED = "destroyed"


class Direction(str, Enum):
    UP = "up"
    RIGHT = "right"
    DOWN = "down"
    LEFT = "left"

    def rotate_clockwise(self) -> "Direction":
        order = (Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT)
        return order[(order.index(self) + 1) % len(order)]

    def rotate_counterclockwise(self) -> "Direction":
        order = (Direction.UP, Direction.LEFT, Direction.DOWN, Direction.RIGHT)
        return order[(order.index(self) + 1) % len(order)]


@dataclass(slots=True, frozen=True)
class Position:
    x: int
    y: int


@dataclass(slots=True, frozen=True)
class BattleCommand:
    player_id: str
    kind: str
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class BattleEvent:
    type: str
    at_ms: int
    data: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class ModuleDefinition:
    id: str
    name_tr: str
    category: str
    max_hp: int
    movable: bool = True
    removable: bool = True
    rotatable: bool = True


@dataclass(slots=True)
class BattleModule:
    instance_id: str
    definition: ModuleDefinition
    hp: int
    status: ModuleStatus = ModuleStatus.RESERVE
    position: Position | None = None
    direction: Direction = Direction.UP

    @classmethod
    def create(
        cls,
        instance_id: str,
        definition: ModuleDefinition,
    ) -> "BattleModule":
        return cls(
            instance_id=instance_id,
            definition=definition,
            hp=definition.max_hp,
        )


@dataclass(slots=True)
class PlayerBattleState:
    player_id: str
    modules: dict[str, BattleModule] = field(default_factory=dict)


@dataclass(slots=True)
class BattleState:
    battle_id: str
    status: BattleStatus = BattleStatus.WAITING
    tick: int = 0
    elapsed_ms: int = 0
    events: list[BattleEvent] = field(default_factory=list)
    players: dict[str, PlayerBattleState] = field(default_factory=dict)
