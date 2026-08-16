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


@dataclass(slots=True)
class TimedModuleEffect:
    id: str
    name_tr: str
    expires_at_ms: int | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def is_expired(self, elapsed_ms: int) -> bool:
        return (
            self.expires_at_ms is not None
            and elapsed_ms >= self.expires_at_ms
        )


@dataclass(slots=True, frozen=True)
class ModuleDefinition:
    id: str
    name_tr: str
    category: str
    max_hp: int
    circuit_credit_cost: int = 0

    # alpha.7 — rol ve savaş/enerji tanım temeli.
    # Bu alanlar henüz gerçek saldırı/enerji simülasyonu değildir;
    # sonraki motor fazları için kanonik modül verisidir.
    strategic_role: str = ""
    description_tr: str = ""
    energy_generation: float = 0.0
    energy_consumption: float = 0.0
    base_damage: float = 0.0
    cooldown_ms: int = 0
    port_count: int = 1

    strong_against: tuple[str, ...] = ()
    weak_against: tuple[str, ...] = ()
    synergy_with: tuple[str, ...] = ()

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

    # alpha.5 — maç içi durum kalıcılığı
    heat: float = 0.0
    stored_energy: float = 0.0
    debuffs: dict[str, TimedModuleEffect] = field(default_factory=dict)
    persistent_effects: dict[str, TimedModuleEffect] = field(default_factory=dict)
    cooldowns_ready_at_ms: dict[str, int] = field(default_factory=dict)
    temporary_boosters: dict[str, TimedModuleEffect] = field(default_factory=dict)

    is_powered: bool = True
    energy_received_last_tick: float = 0.0
    energy_required_last_tick: float = 0.0

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


@dataclass(slots=True, frozen=True)
class BoosterDefinition:
    id: str
    name_tr: str
    description_tr: str
    duration_ms: int
    target_categories: tuple[str, ...] = ()
    effect_data: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class BoosterOffer:
    id: str
    booster_ids: tuple[str, ...]
    created_at_ms: int


@dataclass(slots=True, frozen=True)
class BattlePool:
    module_definition_ids: tuple[str, ...]

    def contains(self, definition_id: str) -> bool:
        return definition_id in self.module_definition_ids

    def as_set(self) -> set[str]:
        return set(self.module_definition_ids)

@dataclass(slots=True)
class PlayerBattleState:
    player_id: str
    modules: dict[str, BattleModule] = field(default_factory=dict)
    circuit_credits: int = 0
    total_circuit_credits_earned: int = 0
    total_circuit_credits_spent: int = 0
    battle_pool: BattlePool | None = None
    pending_booster_offer: BoosterOffer | None = None
    next_booster_offer_index: int = 0
    energy_generated_total: float = 0.0
    energy_consumed_total: float = 0.0
    energy_wasted_total: float = 0.0


@dataclass(slots=True)
class BattleState:
    battle_id: str
    status: BattleStatus = BattleStatus.WAITING
    tick: int = 0
    elapsed_ms: int = 0
    events: list[BattleEvent] = field(default_factory=list)
    players: dict[str, PlayerBattleState] = field(default_factory=dict)
