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
    rarity: str = "common"
    current_cost: int = 0
    effect_multiplier: float = 1.0

    # Current card identity, target profile and action parameters.
    strategic_role: str = ""
    description_tr: str = ""
    base_damage: float = 0.0
    cooldown_ms: int = 0
    strong_against: tuple[str, ...] = ()
    weak_against: tuple[str, ...] = ()
    synergy_with: tuple[str, ...] = ()
    # Enderlik kimliği: kartın mekaniğini oyuncuya anlatan kısa başlık, savaşta
    # nasıl okunduğu ve rakibin nasıl karşılık verebileceği.
    signature_mechanic: str = ""
    telegraph_tr: str = ""
    counterplay_tr: str = ""
    combat_class: str = ""
    runtime_parameters: dict | None = None


@dataclass(slots=True)
class BattleModule:
    instance_id: str
    definition: ModuleDefinition
    hp: int
    status: ModuleStatus = ModuleStatus.RESERVE
    position: Position | None = None
    # alpha.5 — maç içi durum kalıcılığı
    debuffs: dict[str, TimedModuleEffect] = field(default_factory=dict)
    persistent_effects: dict[str, TimedModuleEffect] = field(default_factory=dict)
    cooldowns_ready_at_ms: dict[str, int] = field(default_factory=dict)
    # İmza mekaniklerinin maç içi durumu (sayaç, yük, kilit, borç, diriltme izi).
    mechanic_state: dict[str, Any] = field(default_factory=dict)

    # Enerji sırasında beklerken ayırdığı aksiyon maliyeti.

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
    current_regen_remainder_ms: int = 0
    damage_current_progress: float = 0.0
    damage_current_earned: int = 0
    attack_current_total: float = 0.0
    defense_current_progress: float = 0.0
    defense_current_total: float = 0.0
    core_type: str = "core_resonance"
    core_level: int = 1
    core_skills: tuple[str, ...] = ()
    selected_battle_emoji_id: str = "none"
    # Savaşta paylaşılabilen emojiler (herkese açıklar + kazanılanlar).
    battle_emoji_ids: tuple[str, ...] = ()
    last_battle_emoji_at_ms: int = -10_000
    total_circuit_credits_earned: int = 0
    total_circuit_credits_spent: int = 0
    battle_pool: BattlePool | None = None
    # Hareketsizlik: Akım tavanda ve boş hücre varken kart basılmayan süre.
    idle_at_cap_ms: int = 0
    inactivity_warned: bool = False
    cell_debris_until_ms: dict[str, int] = field(default_factory=dict)
    core_power_charge: float = 0.0
    core_power_ready_emitted: bool = False
    core_power_uses: int = 0
    core_contributions: dict[str,float] = field(default_factory=dict)
    consumed_core_power_request_ids: set[str] = field(default_factory=set)
    # Çekirdek imzası izleri: dolu bekleme süresi, zincir sayısı, doğuş hakkı.
    core_signature_state: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class BattleState:
    battle_id: str
    match_type: str = "ranked_pvp"
    season_id: str = "core_awakening_s0"
    ranked_eligible: bool = True
    account_player_ids: tuple[str, ...] = ()
    normalized: bool = True
    player_upgrade_levels: dict[str, dict[str, int]] = field(default_factory=dict)
    player_module_talents: dict[str, dict[str, dict[str, str]]] = field(default_factory=dict)
    player_daily_meta_ids: dict[str, str] = field(default_factory=dict)
    player_unlocked_modules: dict[str, tuple[str, ...]] = field(default_factory=dict)
    player_match_ratings: dict[str, int] = field(default_factory=dict)
    status: BattleStatus = BattleStatus.WAITING
    tick: int = 0
    elapsed_ms: int = 0
    events: list[BattleEvent] = field(default_factory=list)
    players: dict[str, PlayerBattleState] = field(default_factory=dict)
    winner_player_id: str | None = None
    loser_player_id: str | None = None
    is_draw: bool = False
    finish_reason: str | None = None
    finished_at_ms: int | None = None
    result_summary: dict = field(default_factory=dict)
