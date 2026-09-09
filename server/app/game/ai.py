from dataclasses import dataclass

from .boosters import (
    BOOSTER_DEFINITIONS,
    booster_target_rejection_reason,
    get_booster_definition,
)
from .ai_archetypes import get_ai_archetype
from .catalog import get_module_definition
from .models import ModuleStatus, PlayerBattleState


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


@dataclass(slots=True, frozen=True)
class AIDecision:
    counter_module_definition_id: str | None
    counter_score: int
    target_threat_ids: tuple[str, ...]
    booster_id: str | None
    booster_target_module_id: str | None
    reason_tr: str


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


def choose_counter_module(
    ai_player: PlayerBattleState,
    opponent: PlayerBattleState,
    archetype_id: str = "balanced",
) -> CounterCandidate | None:
    if ai_player.battle_pool is None:
        return None

    archetype = get_ai_archetype(archetype_id)
    active_definition_ids = {
        module.definition.id
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE
    }

    threat_profile = build_threat_profile(opponent)

    candidates = [
        score_counter_candidate(
            definition_id,
            threat_profile,
        )
        for definition_id
        in ai_player.battle_pool.module_definition_ids
        if definition_id not in active_definition_ids
        and definition_id not in {"core", "generator"}
    ]

    affordable = [
        candidate
        for candidate in candidates
        if candidate.credit_cost
        <= ai_player.circuit_credits
    ]

    if not affordable:
        return None

    active_by_category = {
        "saldırı": 0,
        "savunma": 0,
        "destek": 0,
        "sabotaj": 0,
        "enerji": 0,
    }
    for module in ai_player.modules.values():
        if module.status == ModuleStatus.ACTIVE and module.hp > 0:
            if module.definition.category in active_by_category:
                active_by_category[module.definition.category] += 1

    def candidate_score(candidate: CounterCandidate) -> float:
        definition = get_module_definition(candidate.module_definition_id)
        score = float(candidate.score + archetype.bias_for(definition.category))

        # Arketipin stratejik omurgası tamamlanana kadar ilgili sınıfa ek ağırlık ver.
        if definition.category == "enerji" and active_by_category["enerji"] < archetype.energy_floor:
            score += 12
        if definition.category == "savunma" and active_by_category["savunma"] < archetype.defense_floor:
            score += 10 + min(4, threat_profile.attack_count * 2)
        if (
            definition.category == "sabotaj"
            and active_by_category["sabotaj"] < archetype.sabotage_floor
        ):
            score += 10 + min(4, (threat_profile.energy_count + threat_profile.support_count) * 2)

        # Ekonomi AI düşük maliyetli enerji hattını daha erken tamamlamayı tercih eder.
        if archetype.id == "economy" and definition.category == "enerji":
            score += max(0.0, (100 - candidate.credit_cost) / 20)

        return score

    active_attack_count = active_by_category["saldırı"]
    if active_attack_count < archetype.attack_foundation_target:
        attack_foundation = [
            candidate
            for candidate in affordable
            if get_module_definition(
                candidate.module_definition_id
            ).category == "saldırı"
        ]
        if attack_foundation:
            def foundation_score(candidate: CounterCandidate) -> float:
                definition = get_module_definition(
                    candidate.module_definition_id
                )
                damage_per_second = (
                    definition.base_damage
                    / max(1, definition.cooldown_ms)
                    * 1000
                )
                return damage_per_second * (
                    1 + max(0, candidate.score) * 0.08
                ) + max(0, archetype.bias_for("saldırı"))

            # Dengeli profil eski davranışı aynen korur: bir saldırı varken ikinci saldırı omurgası kurulur.
            if archetype.id == "balanced" and active_attack_count == 0:
                pass
            else:
                return sorted(
                    attack_foundation,
                    key=lambda candidate: (
                        -foundation_score(candidate),
                        candidate.credit_cost,
                        candidate.module_definition_id,
                    ),
                )[0]

    return sorted(
        affordable,
        key=lambda candidate: (
            -candidate_score(candidate),
            candidate.credit_cost,
            candidate.module_definition_id,
        ),
    )[0]


def choose_fill_module(
    ai_player: PlayerBattleState,
    opponent: PlayerBattleState,
    archetype_id: str = "balanced",
):
    if ai_player.battle_pool is None:
        return None

    active_modules = [
        module
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE and module.hp > 0
    ]
    active_definition_ids = {
        module.definition.id
        for module in active_modules
    }

    # Savunma + temel saldırı omurgası her arketip için korunur.
    for definition_id in ("shield", "laser"):
        if definition_id in active_definition_ids:
            continue
        reserve = _reserve_module_for_definition(ai_player, definition_id)
        if reserve is None:
            continue
        if reserve.definition.current_cost <= ai_player.circuit_credits:
            return reserve

    archetype = get_ai_archetype(archetype_id)
    active_count = len(active_modules)

    # 5. ve 6. aktif hak arketipin kimliğini görünür kılar. Bir plan modülü
    # daha önce yok edilmişse sıradaki uygun plan modülüne geçilir.
    plan_start_index = max(0, active_count - 4)
    expansion_order = (
        archetype.expansion_module_ids[plan_start_index:]
        + archetype.expansion_module_ids[:plan_start_index]
    )
    for definition_id in expansion_order:
        if definition_id in active_definition_ids:
            continue
        reserve = _reserve_module_for_definition(ai_player, definition_id)
        if reserve is None:
            continue
        if reserve.definition.current_cost <= ai_player.circuit_credits:
            return reserve

    threat_profile = build_threat_profile(opponent)
    candidates = []
    for definition_id in ai_player.battle_pool.module_definition_ids:
        if definition_id in {"core", "generator"}:
            continue
        if definition_id in active_definition_ids:
            continue
        reserve = _reserve_module_for_definition(ai_player, definition_id)
        if reserve is None:
            continue
        if reserve.definition.current_cost > ai_player.circuit_credits:
            continue
        candidate = score_counter_candidate(definition_id, threat_profile)
        candidates.append((candidate, reserve))

    if not candidates:
        return None

    active_by_category = {
        "saldırı": 0,
        "savunma": 0,
        "destek": 0,
        "sabotaj": 0,
        "enerji": 0,
    }
    for module in active_modules:
        if module.definition.category in active_by_category:
            active_by_category[module.definition.category] += 1

    def sort_key(item):
        candidate, reserve = item
        definition = reserve.definition
        bonus = float(candidate.score + archetype.bias_for(definition.category))
        if definition.category == "saldırı" and active_by_category["saldırı"] < archetype.attack_foundation_target:
            bonus += 12
        if definition.category == "savunma" and active_by_category["savunma"] < archetype.defense_floor:
            bonus += 11
        if definition.category == "enerji" and active_by_category["enerji"] < archetype.energy_floor:
            bonus += 10
        if definition.category == "sabotaj" and active_by_category["sabotaj"] < archetype.sabotage_floor:
            bonus += 8
        return (
            -bonus,
            reserve.definition.current_cost,
            reserve.instance_id,
        )

    return sorted(candidates, key=sort_key)[0][1]


def choose_deploy_definition(
    ai_player: PlayerBattleState,
    opponent: PlayerBattleState,
    archetype_id: str = "balanced",
) -> str | None:
    """Choose one of the six deck cards; deployed definitions may repeat."""
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

    candidates: list[tuple[float, int, str]] = []
    for definition_id in ai_player.battle_pool.module_definition_ids:
        definition = get_module_definition(definition_id)
        cost = max(1, definition.current_cost - (1 if ai_player.discounted_deployments else 0))
        if cost > ai_player.circuit_credits:
            continue
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
            score += max(0, 5 - archetype.expansion_module_ids.index(definition_id))
        if ai_player.energy_load_ratio > 1.2:
            if definition_id == "current_balancer":
                score += 10
            elif definition_id in {"battery", "capacitor"} and ai_player.energy_stock > 0:
                score += 4
            elif definition.category == "saldırı":
                score -= max(0, definition.energy_consumption - 3) * 1.5
        # Tek kart spamini yasaklamadan çeşitliliği hafifçe teşvik et.
        score -= counts.get(definition_id, 0) * 2.5
        candidates.append((score, cost, definition_id))

    if not candidates:
        return None
    return sorted(candidates, key=lambda item: (-item[0], item[1], item[2]))[0][2]

def choose_booster(
    ai_player: PlayerBattleState,
    archetype_id: str = "balanced",
) -> tuple[str | None, str | None]:
    offer = ai_player.pending_booster_offer
    if offer is None:
        return None, None

    archetype = get_ai_archetype(archetype_id)
    active = sorted(
        (
            module
            for module in ai_player.modules.values()
            if module.status == ModuleStatus.ACTIVE
            and module.hp > 0
        ),
        key=lambda module: module.instance_id,
    )

    damaged = [
        module
        for module in active
        if module.hp / module.definition.max_hp <= 0.50
    ]
    attacks = [
        module
        for module in active
        if module.definition.category == "saldırı"
    ]

    def eligible_targets(booster_id: str, candidates):
        booster = get_booster_definition(booster_id)
        return [
            module
            for module in candidates
            if booster_target_rejection_reason(booster, module) is None
        ]

    for booster_id in archetype.booster_priority:
        if booster_id not in offer.booster_ids:
            continue
        if booster_id == "emergency_repair":
            candidates = eligible_targets(booster_id, damaged)
            if candidates:
                target = sorted(
                    candidates,
                    key=lambda module: (
                        module.hp / module.definition.max_hp,
                        module.instance_id,
                    ),
                )[0]
                return booster_id, target.instance_id
        if booster_id == "overcharge_chip":
            candidates = eligible_targets(booster_id, attacks)
            if candidates:
                target = sorted(
                    candidates,
                    key=lambda module: (
                        -module.definition.base_damage,
                        module.instance_id,
                    ),
                )[0]
                return booster_id, target.instance_id
        if booster_id == "cooling_burst":
            candidates = eligible_targets(booster_id, active)
            if candidates:
                target = sorted(
                    candidates,
                    key=lambda module: (
                        -module.heat,
                        module.instance_id,
                    ),
                )[0]
                return booster_id, target.instance_id
        if booster_id == "signal_cleanser":
            candidates = eligible_targets(booster_id, active)
            if candidates:
                target = sorted(
                    candidates,
                    key=lambda module: (-len(module.debuffs), module.instance_id),
                )[0]
                return booster_id, target.instance_id

    return None, None


def build_ai_decision(
    ai_player: PlayerBattleState,
    opponent: PlayerBattleState,
    archetype_id: str = "balanced",
) -> AIDecision:
    profile = build_threat_profile(opponent)
    counter = choose_counter_module(
        ai_player,
        opponent,
        archetype_id,
    )
    booster_id, booster_target = choose_booster(
        ai_player,
        archetype_id,
    )

    if counter is None:
        reason = (
            "Uygun ve karşılanabilir yeni counter modül yok."
        )
        counter_id = None
        score = 0
        threats = ()
    else:
        counter_id = counter.module_definition_id
        score = counter.score
        threats = counter.strong_hits
        reason = (
            f"{counter_id} seçildi; "
            f"counter skoru {counter.score}."
        )

    return AIDecision(
        counter_module_definition_id=counter_id,
        counter_score=score,
        target_threat_ids=threats,
        booster_id=booster_id,
        booster_target_module_id=booster_target,
        reason_tr=reason,
    )


@dataclass(slots=True, frozen=True)
class AIActionPlan:
    kind: str
    commands: tuple
    reason_tr: str


def _reserve_module_for_definition(
    ai_player,
    definition_id,
):
    candidates = sorted(
        (
            module
            for module in ai_player.modules.values()
            if module.status == ModuleStatus.RESERVE
            and module.definition.id == definition_id
        ),
        key=lambda module: module.instance_id,
    )

    return candidates[0] if candidates else None


def prepare_ai_reserve_modules(
    engine,
    player_id: str,
) -> None:
    from .models import BattleStatus

    player = engine.state.players[player_id]

    if engine.state.status != BattleStatus.WAITING:
        raise ValueError(
            "AI rezerv modülleri yalnızca maç başlamadan hazırlanabilir."
        )

    if player.battle_pool is None:
        raise ValueError(
            "AI için önce Savaş Havuzu ayarlanmalıdır."
        )

    existing_definitions = {
        module.definition.id
        for module in player.modules.values()
    }

    for definition_id in player.battle_pool.module_definition_ids:
        if definition_id in existing_definitions:
            continue

        engine.grant_module(
            player_id,
            f"{player_id}-reserve-{definition_id}",
            definition_id,
        )


def _cell_accepts_module(engine, module, position) -> bool:
    cell = engine.board.get_cell(position)
    if (
        cell.allowed_definition_ids
        and module.definition.id not in cell.allowed_definition_ids
    ):
        return False
    if (
        cell.allowed_categories
        and module.definition.category not in cell.allowed_categories
    ):
        return False
    return True


def _outgoing_module_for_replacement(
    ai_player,
    opponent,
    archetype_id: str = "balanced",
):
    profile = build_threat_profile(opponent)
    archetype = get_ai_archetype(archetype_id)

    active = [
        module
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE
        and module.definition.removable
        and module.definition.id not in {"core", "generator"}
    ]

    if not active:
        return None

    scored = [
        (
            score_counter_candidate(
                module.definition.id,
                profile,
            ).score
            + archetype.bias_for(module.definition.category),
            module.instance_id,
            module,
        )
        for module in active
    ]

    return sorted(
        scored,
        key=lambda item: (
            item[0],
            item[1],
        ),
    )[0][2]


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
