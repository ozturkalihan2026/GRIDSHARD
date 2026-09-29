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
    behavior_id: str = ""
    effect_multiplier: float = 1.0

    @property
    def mechanic_id(self) -> str:
        return self.behavior_id or self.id

    # alpha.7 — rol ve savaş/enerji tanım temeli.
    # Bu alanlar henüz gerçek saldırı/enerji simülasyonu değildir;
    # sonraki motor fazları için kanonik modül verisidir.
    strategic_role: str = ""
    description_tr: str = ""
    energy_generation: float = 0.0
    energy_consumption: float = 0.0
    # Sürekli bakım enerjisi (energy_consumption) ile aksiyon başına harcanan
    # enerji ayrıdır; saldırı/onarım/sabotaj işi yaptığı anda öder.
    action_energy_cost: float = 0.0
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


@dataclass(slots=True)
class BattleModule:
    instance_id: str
    definition: ModuleDefinition
    hp: int
    status: ModuleStatus = ModuleStatus.RESERVE
    position: Position | None = None
    # alpha.5 — maç içi durum kalıcılığı
    heat: float = 0.0
    stored_energy: float = 0.0
    debuffs: dict[str, TimedModuleEffect] = field(default_factory=dict)
    persistent_effects: dict[str, TimedModuleEffect] = field(default_factory=dict)
    cooldowns_ready_at_ms: dict[str, int] = field(default_factory=dict)
    # İmza mekaniklerinin maç içi durumu (sayaç, yük, kilit, borç, diriltme izi).
    mechanic_state: dict[str, Any] = field(default_factory=dict)

    is_powered: bool = True
    energy_received_last_tick: float = 0.0
    energy_required_last_tick: float = 0.0
    energy_waiting: bool = False
    # Enerji sırasında beklerken ayırdığı aksiyon maliyeti.
    energy_wait_cost: float = 0.0
    last_action_energy_cost: float = 0.0

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
    # energy.CORE_STARTING_ENERGY ile aynı; rezerv tavanı Çekirdek seviyesine bağlıdır.
    energy_stock: float = 16.0
    energy_load_ratio: float = 0.0
    energy_support_multiplier: float = 1.0
    # Enerji sırası: önce beklemeye giren aksiyon önce ödenir; sonradan gelen
    # ucuz aksiyonlar ancak sıradakilerin payı kalıyorsa araya girer.
    energy_wait_queue: list[str] = field(default_factory=list)
    energy_wait_touched: set[str] = field(default_factory=set)
    core_type: str = "core_resonance"
    core_level: int = 1
    core_skills: tuple[str, ...] = ()
    selected_battle_emoji_id: str = "none"
    # Savaşta paylaşılabilen emojiler (herkese açıklar + kazanılanlar).
    battle_emoji_ids: tuple[str, ...] = ()
    last_battle_emoji_at_ms: int = -10_000
    discounted_deployments: int = 0
    total_circuit_credits_earned: int = 0
    total_circuit_credits_spent: int = 0
    battle_pool: BattlePool | None = None
    # Hareketsizlik: Akım tavanda ve boş hücre varken kart basılmayan süre.
    idle_at_cap_ms: int = 0
    inactivity_warned: bool = False
    energy_generated_total: float = 0.0
    energy_consumed_total: float = 0.0
    energy_wasted_total: float = 0.0
    # Per-definition telemetry is kept on the transient battle state so the
    # result sheet can explain what support and energy modules contributed.
    module_energy_consumed: dict[str, float] = field(default_factory=dict)
    module_energy_discharged: dict[str, float] = field(default_factory=dict)
    cell_debris_until_ms: dict[str, int] = field(default_factory=dict)
    core_power_charge: float = 0.0
    core_power_ready_emitted: bool = False
    core_power_uses: int = 0
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
