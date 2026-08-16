from dataclasses import dataclass

from .board import get_cell_effects
from .models import BattleModule, ModuleStatus, PlayerBattleState


SABOTAGE_COOLDOWN_ID = "sabotage"

EMP_DEBUFF_ID = "emp_disabled"
EMP_DURATION_MS = 2500

JAMMER_DEBUFF_ID = "support_jammed"
JAMMER_DURATION_MS = 4000

VIRUS_DEBUFF_ID = "virus"
VIRUS_DURATION_MS = 6000
VIRUS_TICK_INTERVAL_MS = 1000
VIRUS_TICK_DAMAGE = 4

ENERGY_LEECH_DEBUFF_ID = "energy_leech"
ENERGY_LEECH_DURATION_MS = 5000
ENERGY_LEECH_GENERATION_MULTIPLIER = 0.70

DISRUPTOR_DEBUFF_ID = "line_disrupted"
DISRUPTOR_DURATION_MS = 3500


@dataclass(slots=True, frozen=True)
class SabotagePlan:
    effect_id: str
    name_tr: str
    duration_ms: int
    target_module_id: str


@dataclass(slots=True, frozen=True)
class SabotageResistance:
    duration_multiplier: float = 1.0
    effect_strength_multiplier: float = 1.0
    blocked: bool = False
    reasons: tuple[str, ...] = ()


BARRIER_DURATION_MULTIPLIER = 0.75
ARMOR_DISRUPTOR_DURATION_MULTIPLIER = 0.60
STRONG_AGAINST_DURATION_MULTIPLIER = 1.25
WEAK_AGAINST_DURATION_MULTIPLIER = 0.75


def sabotage_cooldown_ms(module: BattleModule) -> int:
    multiplier = 1.0
    if module.position is not None:
        multiplier *= float(
            get_cell_effects(module.position).get(
                "cooldown_multiplier",
                1.0,
            )
        )

    return max(
        100,
        int(round(module.definition.cooldown_ms * multiplier)),
    )


def _active_targets(player: PlayerBattleState) -> list[BattleModule]:
    return sorted(
        (
            module
            for module in player.modules.values()
            if module.status == ModuleStatus.ACTIVE
            and module.hp > 0
            and module.definition.id != "core"
        ),
        key=lambda module: module.instance_id,
    )


def select_sabotage_target(
    sabotage_module: BattleModule,
    opponent: PlayerBattleState,
) -> BattleModule | None:
    targets = _active_targets(opponent)
    if not targets:
        return None

    preferred = [
        module
        for module in targets
        if module.definition.id
        in sabotage_module.definition.strong_against
    ]
    if preferred:
        return preferred[0]

    non_barriers = [
        module
        for module in targets
        if module.definition.id != "barrier"
    ]
    if non_barriers:
        return non_barriers[0]

    return targets[0]


def plan_sabotage(
    sabotage_module: BattleModule,
    opponent: PlayerBattleState,
) -> SabotagePlan | None:
    target = select_sabotage_target(
        sabotage_module,
        opponent,
    )
    if target is None:
        return None

    definition_id = sabotage_module.definition.id

    if definition_id == "emp":
        return SabotagePlan(
            EMP_DEBUFF_ID,
            "EMP Devre Dışı",
            EMP_DURATION_MS,
            target.instance_id,
        )

    if definition_id == "jammer":
        return SabotagePlan(
            JAMMER_DEBUFF_ID,
            "Sinyal Bozma",
            JAMMER_DURATION_MS,
            target.instance_id,
        )

    if definition_id == "virus":
        return SabotagePlan(
            VIRUS_DEBUFF_ID,
            "Virüs",
            VIRUS_DURATION_MS,
            target.instance_id,
        )

    if definition_id == "energy_leech":
        return SabotagePlan(
            ENERGY_LEECH_DEBUFF_ID,
            "Enerji Sömürüsü",
            ENERGY_LEECH_DURATION_MS,
            target.instance_id,
        )

    if definition_id == "disruptor":
        return SabotagePlan(
            DISRUPTOR_DEBUFF_ID,
            "Hat Kesintisi",
            DISRUPTOR_DURATION_MS,
            target.instance_id,
        )

    return None


def sabotage_resistance(
    sabotage_module: BattleModule,
    target: BattleModule,
    target_player: PlayerBattleState,
) -> SabotageResistance:
    duration_multiplier = 1.0
    effect_strength_multiplier = 1.0
    reasons: list[str] = []

    if target.definition.id in sabotage_module.definition.strong_against:
        duration_multiplier *= STRONG_AGAINST_DURATION_MULTIPLIER
        reasons.append("güçlü-karşılaşma")

    if target.definition.id in sabotage_module.definition.weak_against:
        duration_multiplier *= WEAK_AGAINST_DURATION_MULTIPLIER
        reasons.append("zayıf-karşılaşma")

    powered_barriers = [
        module
        for module in target_player.modules.values()
        if module.status == ModuleStatus.ACTIVE
        and module.definition.id == "barrier"
        and module.is_powered
        and module.hp > 0
    ]

    if powered_barriers:
        duration_multiplier *= BARRIER_DURATION_MULTIPLIER
        reasons.append("enerjili-bariyer")

    if (
        sabotage_module.definition.id == "disruptor"
        and target.definition.id == "armor"
    ):
        duration_multiplier *= ARMOR_DISRUPTOR_DURATION_MULTIPLIER
        reasons.append("zırh-hat-direnci")

    # Sabotajın doğrudan enerjili Bariyere yönelmesi ve sabotajın
    # Bariyere karşı zayıf olması durumunda etki tamamen engellenir.
    blocked = (
        target.definition.id == "barrier"
        and target.is_powered
        and target.definition.id in sabotage_module.definition.weak_against
    )

    if blocked:
        reasons.append("bariyer-tam-engelleme")

    if sabotage_module.definition.id == "energy_leech":
        # Bariyer Enerji Sömürücü şiddetini de azaltır.
        if powered_barriers:
            effect_strength_multiplier *= 0.85

    return SabotageResistance(
        duration_multiplier=duration_multiplier,
        effect_strength_multiplier=effect_strength_multiplier,
        blocked=blocked,
        reasons=tuple(reasons),
    )


def effective_sabotage_duration_ms(
    base_duration_ms: int,
    resistance: SabotageResistance,
) -> int:
    if resistance.blocked:
        return 0
    return max(
        500,
        int(round(base_duration_ms * resistance.duration_multiplier)),
    )
