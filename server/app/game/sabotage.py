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
