from collections import Counter
from dataclasses import dataclass
import hashlib

from .ai_archetypes import get_ai_archetype
from .catalog import get_module_definition
from .composition import deployment_rejection_reason
from .core_balance import CORE_POWER_FULL_CHARGE
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
    core_type = ai_player.core_type
    enemies=[u for u in (opponent.modules.values() if opponent else ()) if u.status==ModuleStatus.ACTIVE and u.hp>0]
    if core_type=='core_capacitor':return bool(ai_player.battle_pool) and len(living)<15
    if core_type in {'core_disruptor','core_quantum'}:return any(u.definition.id!='core' for u in enemies)
    if core_type=='core_phoenix':
        damage=150*1.04**(ai_player.core_level-1)
        return bool(enemies) and (core.hp<core.definition.max_hp*.9 or any(u.hp<=damage*1.5 for u in enemies))
    return bool(enemies)



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
    regen_interval_ms: int = 2_200,
    *, prefer_balanced_opening: bool = False,
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
        category = module.definition.combat_class
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
        cost = max(1, definition.current_cost)
        counter = score_counter_candidate(definition_id, threat_profile)
        score = float(counter.score + archetype.bias_for(definition.combat_class))
        # Önce çalışan bir saldırı omurgası, sonra arketipin sınıf tabanları.
        if definition.category == "saldırı" and category_counts.get("saldırı", 0) == 0:
            score += 20
        # With composition quotas removed, bots must grow their offense too.
        # This is a preference score, never a restriction on player placement.
        desired_weapons = max(archetype.attack_foundation_target, (len(active_modules) + 1) // 2)
        if ((threat_profile.attack_count==0 and len(threat_profile.active_definition_ids)>1)
                or (threat_profile.attack_count<=1 and len(threat_profile.active_definition_ids)>=4)):
            desired_weapons=max(desired_weapons,(len(active_modules)*3+3)//4)
        if definition.category == "saldırı" and category_counts.get("saldırı", 0) < desired_weapons:
            score += 8
        if definition.category == "savunma" and category_counts.get("savunma", 0) < archetype.defense_floor:
            score += 9
        # A preference for earning the joint bonus, never a deployment quota.
        if (prefer_balanced_opening and definition.combat_class=='savunma'
                and category_counts.get('saldırı',0)>0 and category_counts.get('savunma',0)==0):
            score += 12
        if definition.combat_class == "taktik" and category_counts.get("taktik", 0) < archetype.tactics_floor:
            score += 7
        if definition_id in archetype.expansion_module_ids:
            # Arketip kimliği küçük bir tercih; dönüşüm cezasını ezmemeli.
            score += max(0, 3 - archetype.expansion_module_ids.index(definition_id))
        if definition_id == "repair" and any(u.hp < u.definition.max_hp for u in active_modules if u.definition.id != 'core'):
            score += 4
        if definition_id == "cleanser" and not any(u.debuffs for u in active_modules):
            score -= 5
        if definition_id == "cleanser" and any(u.debuffs for u in active_modules):
            score += 5
        if definition_id == "shield_breaker" and any(k in threat_profile.active_definition_ids for k in ('shield','buffer_shield','last_bastion')):
            score += 3
        if definition_id in {'arc_cannon','plasma_mortar','quantum_repeater'} and len(threat_profile.active_definition_ids)>=4:
            score += 2
        if definition_id == "buffer_shield" and sum(u.hp<u.definition.max_hp for u in active_modules if u.definition.id!='core')>=2:
            score += 3
        if definition_id in {"emp", "virus"} and threat_profile.attack_count == 0:
            score -= 6
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
    # Rebuild an offense after losses; avoid spending every regenerated point
    # on a cheap support card before a weapon can be afforded.
    if category_counts.get("saldırı", 0) == 0:
        # After repeated mutual wipes, don't rebuild identical naked weapons
        # forever. One affordable frontline changes that exchange. Once it
        # exists the normal save-for-offense rule applies again.
        if (threat_profile.attack_count == 0 and len(active_modules) == 1
                and sum(m.definition.category == "saldırı" for m in ai_player.modules.values()) >= 2):
            frontline = [item for item in candidates if item[2] <= ai_player.circuit_credits
                         and get_module_definition(item[3]).category == "savunma"]
            if frontline:
                return frontline[0][3]
        attacks = [item for item in candidates if get_module_definition(item[3]).category == "saldırı"]
        if attacks:
            affordable_attacks = [item for item in attacks if item[2] <= ai_player.circuit_credits]
            best_attack = attacks[0]
            if best_attack[2] <= ai_player.circuit_credits:
                return best_attack[3]
            if affordable_attacks:
                cheap = affordable_attacks[0]
                wait_ms = (best_attack[2] - ai_player.circuit_credits) * regen_interval_ms - ai_player.current_regen_remainder_ms
                if best_attack[0] - cheap[0] <= 4 or wait_ms > SAVE_WINDOW_MS:
                    return cheap[3]
            return None
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
        prefer_balanced_opening=True,
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
