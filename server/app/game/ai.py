from dataclasses import dataclass

from .boosters import BOOSTER_DEFINITIONS
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
) -> CounterCandidate | None:
    if ai_player.battle_pool is None:
        return None

    active_definition_ids = {
        module.definition.id
        for module in ai_player.modules.values()
        if module.status == ModuleStatus.ACTIVE
    }

    profile = build_threat_profile(opponent)

    candidates = [
        score_counter_candidate(
            definition_id,
            profile,
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

    return sorted(
        affordable,
        key=lambda candidate: (
            -candidate.score,
            candidate.credit_cost,
            candidate.module_definition_id,
        ),
    )[0]


def choose_booster(
    ai_player: PlayerBattleState,
) -> tuple[str | None, str | None]:
    offer = ai_player.pending_booster_offer
    if offer is None:
        return None, None

    active = sorted(
        (
            module
            for module in ai_player.modules.values()
            if module.status == ModuleStatus.ACTIVE
            and module.hp > 0
        ),
        key=lambda module: module.instance_id,
    )

    # Önce ağır hasarlı modüle Acil Onarım.
    damaged = [
        module
        for module in active
        if module.hp / module.definition.max_hp <= 0.50
    ]
    if (
        "emergency_repair" in offer.booster_ids
        and damaged
    ):
        target = sorted(
            damaged,
            key=lambda module: (
                module.hp / module.definition.max_hp,
                module.instance_id,
            ),
        )[0]
        return "emergency_repair", target.instance_id

    attacks = [
        module
        for module in active
        if module.definition.category == "saldırı"
    ]

    if (
        "overcharge_chip" in offer.booster_ids
        and attacks
    ):
        target = sorted(
            attacks,
            key=lambda module: (
                -module.definition.base_damage,
                module.instance_id,
            ),
        )[0]
        return "overcharge_chip", target.instance_id

    if (
        "dual_port_adapter" in offer.booster_ids
        and active
    ):
        target = sorted(
            active,
            key=lambda module: (
                module.definition.port_count,
                module.instance_id,
            ),
        )[0]
        return "dual_port_adapter", target.instance_id

    return None, None


def build_ai_decision(
    ai_player: PlayerBattleState,
    opponent: PlayerBattleState,
) -> AIDecision:
    profile = build_threat_profile(opponent)
    counter = choose_counter_module(
        ai_player,
        opponent,
    )
    booster_id, booster_target = choose_booster(
        ai_player
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
):
    profile = build_threat_profile(opponent)

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
            ).score,
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
        ai_player
    )
    if (
        booster_id is not None
        and booster_target_id is not None
    ):
        return AIActionPlan(
            kind="booster",
            commands=(
                BattleCommand(
                    ai_player_id,
                    "select_booster",
                    {"booster_id": booster_id},
                ),
                BattleCommand(
                    ai_player_id,
                    "apply_booster",
                    {
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

    decision = build_ai_decision(
        ai_player,
        opponent,
    )

    if decision.counter_module_definition_id is None:
        return None

    incoming = _reserve_module_for_definition(
        ai_player,
        decision.counter_module_definition_id,
    )
    if incoming is None:
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
    )

    if active_count < capacity:
        placement = _find_connected_placement(
            engine,
            ai_player,
            incoming,
        )
        if placement is None:
            return None

        position, target_direction = placement
        rotations = _clockwise_rotation_count(
            incoming.direction,
            target_direction,
        )

        required_credits = (
            incoming.definition.circuit_credit_cost
            + (
                rotations
                * engine.circuit_credit_config.rotate_cost
            )
        )

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

        for _ in range(rotations):
            commands.append(
                BattleCommand(
                    ai_player_id,
                    "rotate_module",
                    {
                        "module_id": incoming.instance_id,
                        "clockwise": True,
                    },
                )
            )

        return AIActionPlan(
            kind="place",
            commands=tuple(commands),
            reason_tr=(
                f"{incoming.definition.name_tr} "
                f"karşı modül olarak devreye alınıyor."
            ),
        )

    outgoing = _outgoing_module_for_replacement(
        ai_player,
        opponent,
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

    rotations = _clockwise_rotation_count(
        incoming.direction,
        target_direction,
    )

    required_credits = (
        incoming.definition.circuit_credit_cost
        + (
            rotations
            * engine.circuit_credit_config.rotate_cost
        )
    )

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

    for _ in range(rotations):
        commands.append(
            BattleCommand(
                ai_player_id,
                "rotate_module",
                {
                    "module_id": incoming.instance_id,
                    "clockwise": True,
                },
            )
        )

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
) -> AIActionPlan | None:
    plan = build_ai_action_plan(
        engine,
        ai_player_id,
        opponent_player_id,
    )

    if plan is None:
        return None

    for command in plan.commands:
        engine.enqueue_command(command)

    return plan
