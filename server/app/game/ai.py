from collections import Counter
from dataclasses import dataclass
import hashlib

from .ai_archetypes import get_ai_archetype
from .catalog import get_module_definition
from .composition import deployment_rejection_reason
from .core_balance import (
    CORE_POWER_FULL_CHARGE,
    DISCHARGE_FULL_RESERVE_RATIO,
    LAST_STAND_HP_RATIO,
    STATIC_CHARGE_INTERVAL_MS,
)
from .energy import action_energy_per_second, core_reserve_capacity
from .models import ModuleStatus, PlayerBattleState


# Kart çeşitliliği: ölen kopyalar da sayılır; aynı kartı art arda basmak
# cezalandırılır. Böylece AI destesinin tamamını oynar.
ROTATION_PENALTY = 0.9
RECENT_PENALTY = 1.0
REPEAT_PENALTY = 3.0
# En iyi kart birkaç saniye içinde alınabilecekse ve sahada saldırı varsa
# AI ucuz kartı hemen basmak yerine bekler; pahalı kartlar da oynanır.
SAVE_WINDOW_MS = 5_000


# Çekirdek gücü hazırken koşulu gelmezse en geç bu süre sonra kullanılır.
CORE_POWER_HOLD_LIMIT_MS = 10_000


def should_use_core_power(ai_player: PlayerBattleState, opponent: PlayerBattleState | None) -> bool:
    """AI Çekirdek gücünü imzasına göre kullanır (dolum tamken çağrılır)."""
    if ai_player.core_power_charge < CORE_POWER_FULL_CHARGE:
        return False
    living = [
        module
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE and module.hp > 0
    ]
    core = next((module for module in living if module.definition.id == "core"), None)
    if core is None:
        return False
    damaged = any(module.hp < module.definition.max_hp for module in living)
    held_ms = int(ai_player.core_signature_state.get("held_ms", 0))
    held_too_long = held_ms >= CORE_POWER_HOLD_LIMIT_MS
    core_type = ai_player.core_type
    if core_type == "core_resonance":
        return damaged
    if core_type == "core_phoenix":
        # Dolum Küllerden Doğuş sigortasıdır: Çekirdek zayıfken saklanır.
        return damaged and core.hp >= core.definition.max_hp * 0.6
    if core_type == "core_guardian":
        return core.hp < core.definition.max_hp * LAST_STAND_HP_RATIO or held_too_long
    if core_type == "core_overdrive":
        return any(module.definition.category == "saldırı" for module in living)
    if core_type == "core_disruptor":
        rival_active = [
            module
            for module in (opponent.modules.values() if opponent is not None else ())
            if module.status == ModuleStatus.ACTIVE
        ]
        # Rakip Aşırı Yük açtıysa hemen siler; yoksa en az iki Statik yük biriktirir.
        if any("core_overdrive" in module.persistent_effects for module in rival_active):
            return True
        rival_supports = any(module.definition.category == "destek" for module in rival_active)
        return rival_supports and held_ms >= STATIC_CHARGE_INTERVAL_MS * 2
    if core_type == "core_capacitor":
        full_reserve = (
            ai_player.energy_stock
            >= core_reserve_capacity(ai_player) * DISCHARGE_FULL_RESERVE_RATIO
        )
        return full_reserve or held_too_long
    return True


def _variety_key(player_id: str, deploy_count: int, definition_id: str) -> int:
    """Eşit puanlı kartları maç ilerledikçe değişen deterministik sırayla ayırır."""
    digest = hashlib.sha256(f"{player_id}:{deploy_count}:{definition_id}".encode()).hexdigest()
    return int(digest[:8], 16)


@dataclass(slots=True, frozen=True)
class ThreatProfile:
    active_definition_ids: tuple[str, ...]
    attack_count: int
    defense_count: int
    support_count: int
    sabotage_count: int
    energy_count: int


@dataclass(slots=True, frozen=True)
class CounterCandidate:
    module_definition_id: str
    score: int
    strong_hits: tuple[str, ...]
    weak_hits: tuple[str, ...]
    credit_cost: int


def build_threat_profile(
    opponent: PlayerBattleState,
) -> ThreatProfile:
    active = sorted(
        (
            module
            for module in opponent.modules.values()
            if module.status == ModuleStatus.ACTIVE
            and module.hp > 0
        ),
        key=lambda module: module.instance_id,
    )

    counts = {
        "saldırı": 0,
        "savunma": 0,
        "destek": 0,
        "sabotaj": 0,
        "enerji": 0,
    }

    for module in active:
        if module.definition.category in counts:
            counts[module.definition.category] += 1

    return ThreatProfile(
        active_definition_ids=tuple(
            module.definition.id
            for module in active
        ),
        attack_count=counts["saldırı"],
        defense_count=counts["savunma"],
        support_count=counts["destek"],
        sabotage_count=counts["sabotaj"],
        energy_count=counts["enerji"],
    )


def score_counter_candidate(
    module_definition_id: str,
    profile: ThreatProfile,
) -> CounterCandidate:
    definition = get_module_definition(
        module_definition_id
    )

    threats = set(profile.active_definition_ids)

    strong_hits = tuple(
        sorted(
            threat
            for threat in definition.strong_against
            if threat in threats
        )
    )

    weak_hits = tuple(
        sorted(
            threat
            for threat in definition.weak_against
            if threat in threats
        )
    )

    score = (
        len(strong_hits) * 5
        - len(weak_hits) * 3
    )

    # Rakibin yoğunlaştığı sınıfa karşı rol bazlı küçük tercih.
    if (
        profile.defense_count >= 2
        and definition.category == "saldırı"
    ):
        score += 1

    if (
        profile.support_count >= 2
        and definition.category == "sabotaj"
    ):
        score += 1

    if (
        profile.attack_count >= 2
        and definition.category == "savunma"
    ):
        score += 1

    return CounterCandidate(
        module_definition_id=module_definition_id,
        score=score,
        strong_hits=strong_hits,
        weak_hits=weak_hits,
        credit_cost=definition.current_cost,
    )


def choose_deploy_definition(
    ai_player: PlayerBattleState,
    opponent: PlayerBattleState,
    archetype_id: str = "balanced",
    regen_interval_ms: int = 2_500,
) -> str | None:
    """Choose one of the six deck cards; deployed definitions may repeat.

    ``None`` means no legal card or a short wait for a better, pricier card.
    """
    if ai_player.battle_pool is None:
        return None

    archetype = get_ai_archetype(archetype_id)
    threat_profile = build_threat_profile(opponent)
    active_modules = [
        module
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE and module.hp > 0
    ]
    counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    for module in active_modules:
        definition_id = module.definition.id
        counts[definition_id] = counts.get(definition_id, 0) + 1
        category = module.definition.category
        category_counts[category] = category_counts.get(category, 0) + 1
    # Modüller yok edilince de oyuncu durumunda kalır; sözlük sırası basım sırasıdır.
    history = [
        module.definition.id
        for module in ai_player.modules.values()
        if module.definition.id != "core"
    ]
    deployed_counts = Counter(history)
    recent = history[-3:]

    candidates: list[tuple[float, int, int, str]] = []
    for definition_id in ai_player.battle_pool.module_definition_ids:
        definition = get_module_definition(definition_id)
        if deployment_rejection_reason(ai_player, definition) is not None:
            continue
        cost = max(1, definition.current_cost - (1 if ai_player.discounted_deployments else 0))
        counter = score_counter_candidate(definition_id, threat_profile)
        score = float(counter.score + archetype.bias_for(definition.category))
        # Önce çalışan bir saldırı omurgası, sonra arketipin sınıf tabanları.
        if definition.category == "saldırı" and category_counts.get("saldırı", 0) == 0:
            score += 20
        if definition.category == "saldırı" and category_counts.get("saldırı", 0) < archetype.attack_foundation_target:
            score += 8
        if definition.category == "savunma" and category_counts.get("savunma", 0) < archetype.defense_floor:
            score += 9
        if definition.category == "enerji" and category_counts.get("enerji", 0) < archetype.energy_floor:
            score += 8
        if definition.category == "sabotaj" and category_counts.get("sabotaj", 0) < archetype.sabotage_floor:
            score += 7
        if definition_id in archetype.expansion_module_ids:
            # Arketip kimliği küçük bir tercih; dönüşüm cezasını ezmemeli.
            score += max(0, 3 - archetype.expansion_module_ids.index(definition_id))
        if ai_player.energy_load_ratio > 1.2:
            if definition_id == "current_balancer":
                score += 10
            elif definition_id in {"battery", "capacitor"} and ai_player.energy_stock > 0:
                score += 4
            elif definition.category == "saldırı":
                # Saldırılar enerjiyi atış anında öder; yük yüksekken
                # saniyelik enerji talebi büyük olan kartlar geri planda kalır.
                score -= max(0.0, action_energy_per_second(definition) - 1.5) * 4
        # Tek kart spamini yasaklamadan çeşitliliği teşvik et.
        score -= counts.get(definition_id, 0) * 2.5
        score -= deployed_counts.get(definition_id, 0) * ROTATION_PENALTY
        score -= recent.count(definition_id) * RECENT_PENALTY
        if history and history[-1] == definition_id:
            score -= REPEAT_PENALTY
        candidates.append((
            score,
            _variety_key(ai_player.player_id, len(history), definition_id),
            cost,
            definition_id,
        ))

    if not candidates:
        return None
    candidates.sort(key=lambda item: (-item[0], item[1]))
    _score, _key, best_cost, best_id = candidates[0]
    credits = ai_player.circuit_credits
    if best_cost <= credits:
        return best_id
    wait_ms = (best_cost - credits) * regen_interval_ms - ai_player.current_regen_remainder_ms
    if category_counts.get("saldırı", 0) > 0 and wait_ms <= SAVE_WINDOW_MS:
        return None
    affordable = [item for item in candidates if item[2] <= credits]
    return affordable[0][3] if affordable else None


@dataclass(slots=True, frozen=True)
class AIActionPlan:
    kind: str
    commands: tuple
    reason_tr: str


def build_ai_action_plan(
    engine,
    ai_player_id: str,
    opponent_player_id: str,
    archetype_id: str = "balanced",
) -> AIActionPlan | None:
    from .engine import MAX_ACTIVE_MODULES
    from .models import BattleCommand

    ai_player = engine.state.players[ai_player_id]
    opponent = engine.state.players[opponent_player_id]

    active_count = sum(
        1
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE
        and module.hp > 0
    )

    if active_count >= MAX_ACTIVE_MODULES:
        return None
    definition_id = choose_deploy_definition(
        ai_player,
        opponent,
        archetype_id,
        engine.circuit_credit_config.current_regen_interval_ms,
    )
    if definition_id is None:
        return None
    definition = get_module_definition(definition_id)
    return AIActionPlan(
        kind="deploy",
        commands=(BattleCommand(
            ai_player_id,
            "deploy_module",
            {"definition_id": definition_id},
        ),),
        reason_tr=f"AI deste kartını üretiyor: {definition.name_tr}.",
    )


def enqueue_ai_actions(
    engine,
    ai_player_id: str,
    opponent_player_id: str,
    archetype_id: str = "balanced",
) -> AIActionPlan | None:
    plan = build_ai_action_plan(
        engine,
        ai_player_id,
        opponent_player_id,
        archetype_id,
    )

    if plan is None:
        return None

    for command in plan.commands:
        engine.enqueue_command(command)

    return plan
