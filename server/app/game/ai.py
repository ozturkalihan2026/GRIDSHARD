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
        credit_cost=definition.circuit_credit_cost,
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
        if reserve.definition.circuit_credit_cost <= ai_player.circuit_credits:
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
        if reserve.definition.circuit_credit_cost <= ai_player.circuit_credits:
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
        if reserve.definition.circuit_credit_cost > ai_player.circuit_credits:
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
            reserve.definition.circuit_credit_cost,
            reserve.instance_id,
        )

    return sorted(candidates, key=sort_key)[0][1]

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
        if booster_id == "dual_port_adapter":
            candidates = eligible_targets(booster_id, active)
            if candidates:
                target = sorted(
                    candidates,
                    key=lambda module: (
                        module.definition.port_count,
                        module.instance_id,
                    ),
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


def _clockwise_rotation_count(
    current_direction,
    target_direction,
) -> int:
    count = 0
    direction = current_direction

    while direction != target_direction and count < 4:
        direction = direction.rotate_clockwise()
        count += 1

    return count


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


def _find_connected_placement(
    engine,
    player,
    module,
):
    from .models import Direction
    from .topology import modules_are_port_connected

    active = [
        current
        for current in player.modules.values()
        if current.status == ModuleStatus.ACTIVE
        and current.position is not None
    ]

    occupied = {
        current.position
        for current in active
        if current.position is not None
    }

    positions = sorted(
        (
            position
            for position in engine.board.placeable_positions
            if position not in occupied
        ),
        key=lambda position: (
            position.y,
            position.x,
        ),
    )

    directions = (
        Direction.UP,
        Direction.RIGHT,
        Direction.DOWN,
        Direction.LEFT,
    )

    original_position = module.position
    original_direction = module.direction

    try:
        for position in positions:
            for direction in directions:
                module.position = position
                module.direction = direction

                if any(
                    modules_are_port_connected(
                        module,
                        current,
                        engine.board.core_position,
                    )
                    for current in active
                ):
                    return position, direction
    finally:
        module.position = original_position
        module.direction = original_direction

    return None


def _find_direction_at_position(
    engine,
    player,
    module,
    position,
    *,
    exclude_instance_id: str | None = None,
):
    from .models import Direction
    from .topology import modules_are_port_connected

    active = [
        current
        for current in player.modules.values()
        if current.status == ModuleStatus.ACTIVE
        and current.position is not None
        and current.instance_id != exclude_instance_id
    ]

    original_position = module.position
    original_direction = module.direction
    try:
        for direction in (
            Direction.UP,
            Direction.RIGHT,
            Direction.DOWN,
            Direction.LEFT,
        ):
            module.position = position
            module.direction = direction
            if any(
                modules_are_port_connected(
                    module,
                    current,
                    engine.board.core_position,
                )
                for current in active
            ):
                return direction
    finally:
        module.position = original_position
        module.direction = original_direction

    return None


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
    from .engine import (
        MODULE_INTERACTION_UNLOCK_MS,
        max_active_modules_for_elapsed_ms,
    )
    from .models import BattleCommand

    ai_player = engine.state.players[ai_player_id]
    opponent = engine.state.players[opponent_player_id]

    # Güçlendirici hakkı varsa modül değişikliğinden önce kullan.
    booster_id, booster_target_id = choose_booster(
        ai_player,
        archetype_id,
    )
    if (
        booster_id is not None
        and booster_target_id is not None
    ):
        offer = ai_player.pending_booster_offer
        if offer is None:
            return None
        return AIActionPlan(
            kind="booster",
            commands=(
                BattleCommand(
                    ai_player_id,
                    "use_booster",
                    {
                        "offer_id": offer.id,
                        "booster_id": booster_id,
                        "target_module_id": booster_target_id,
                    },
                ),
            ),
            reason_tr=(
                f"AI güçlendirici uyguluyor: {booster_id}"
            ),
        )

    if (
        engine.state.elapsed_ms
        < MODULE_INTERACTION_UNLOCK_MS
    ):
        return None

    capacity = max_active_modules_for_elapsed_ms(
        engine.state.elapsed_ms
    )
    if capacity is None:
        return None

    active_count = sum(
        1
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE
        and module.hp > 0
    )

    # Boş hak varsa önce onu doldur. Bu yol counter kararı bulunamasa bile
    # çalışır; AI patlayan modüller sonrası haklarını boş bırakmaz.
    if active_count < capacity:
        incoming = choose_fill_module(
            ai_player,
            opponent,
            archetype_id,
        )
        if incoming is None:
            return None

        placement = _find_connected_placement(
            engine,
            ai_player,
            incoming,
        )
        if placement is None:
            return None

        position, target_direction = placement
        required_credits = incoming.definition.circuit_credit_cost
        if ai_player.circuit_credits < required_credits:
            return None

        commands = [
            BattleCommand(
                ai_player_id,
                "place_module",
                {
                    "module_id": incoming.instance_id,
                    "x": position.x,
                    "y": position.y,
                },
            )
        ]

        return AIActionPlan(
            kind="place",
            commands=tuple(commands),
            reason_tr=(
                f"Boş hak anında dolduruluyor: "
                f"{incoming.definition.name_tr} devreye alınıyor."
            ),
        )

    decision = build_ai_decision(
        ai_player,
        opponent,
        archetype_id,
    )
    if decision.counter_module_definition_id is None:
        return None

    incoming = _reserve_module_for_definition(
        ai_player,
        decision.counter_module_definition_id,
    )
    if incoming is None:
        return None

    outgoing = _outgoing_module_for_replacement(
        ai_player,
        opponent,
        archetype_id,
    )
    if outgoing is None or outgoing.position is None:
        return None

    target_direction = _find_direction_at_position(
        engine,
        ai_player,
        incoming,
        outgoing.position,
        exclude_instance_id=outgoing.instance_id,
    )
    if target_direction is None:
        return None

    required_credits = incoming.definition.circuit_credit_cost

    if ai_player.circuit_credits < required_credits:
        return None

    commands = [
        BattleCommand(
            ai_player_id,
            "replace_module",
            {
                "outgoing_module_id": outgoing.instance_id,
                "incoming_module_id": incoming.instance_id,
            },
        )
    ]

    return AIActionPlan(
        kind="replace",
        commands=tuple(commands),
        reason_tr=(
            f"{outgoing.definition.name_tr} çıkarılıp "
            f"{incoming.definition.name_tr} ile değiştiriliyor."
        ),
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
