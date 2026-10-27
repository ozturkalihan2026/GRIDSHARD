from dataclasses import dataclass

from .heat import heat_efficiency, is_overheated
from .models import BattleModule, ModuleStatus, PlayerBattleState
from .module_cycles import SABOTAGE_GUARD_KEY, charged, sabotage_guard_ratio
from .operations import module_is_operational


SABOTAGE_COOLDOWN_ID = "sabotage"

EMP_DEBUFF_ID = "emp_disabled"
EMP_DURATION_MS = 1800

JAMMER_DEBUFF_ID = "support_jammed"
JAMMER_DURATION_MS = 3000

VIRUS_DEBUFF_ID = "virus"
VIRUS_DURATION_MS = 6000
VIRUS_TICK_INTERVAL_MS = 1000
VIRUS_TICK_DAMAGE = 4
# Tırmanan enfeksiyon: her tik bir öncekinden bu kadar fazla vurur.
VIRUS_TICK_ESCALATION = 2

DISRUPTOR_DEBUFF_ID = "line_disrupted"
DISRUPTOR_DURATION_MS = 3000
SINGULARITY_DEBUFF_ID = "singularity_disabled"
SINGULARITY_DURATION_MS = 1500
CONTROL_RECOVERY_MS = 1500
# Kesici yalnız enerji kartını keser; Tekillik iki hedefte kısa kontrol yapar.
SABOTAGE_ECHO_RATIOS = {"singularity_projector": 1.0}
DURATION_CAP_MS = {"emp": 2400, "jammer": 4000, "disruptor": 4000, "singularity_projector": 2000}


def base_sabotage_duration_ms(definition) -> int:
    return {"emp": EMP_DURATION_MS, "jammer": JAMMER_DURATION_MS,
            "virus": VIRUS_DURATION_MS, "disruptor": DISRUPTOR_DURATION_MS,
            "singularity_projector": SINGULARITY_DURATION_MS}.get(definition.id, 0)


def sabotage_duration_ms(definition, matchup_multiplier: float = 1.0) -> int:
    base = base_sabotage_duration_ms(definition)
    if definition.id == "virus":
        return base
    return max(500, round(min(DURATION_CAP_MS.get(definition.id, base),
                              base * definition.effect_multiplier * matchup_multiplier)))


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
    # Sabotaj direnci yükünü bu etkiye harcayan Bariyer (motor çevrimini başlatır).
    guard_module_id: str | None = None


# Seviye 1 değeri: yüklü Bariyer devreye uygulanan bir sabotajın süresini
# %35 kısaltır (module_cycles.sabotage_guard_ratio; seviyeyle büyür).
BARRIER_DURATION_MULTIPLIER = 0.65
ARMOR_DISRUPTOR_DURATION_MULTIPLIER = 0.60
STRONG_AGAINST_DURATION_MULTIPLIER = 1.25
WEAK_AGAINST_DURATION_MULTIPLIER = 0.75


def sabotage_cooldown_ms(module: BattleModule) -> int:
    return max(100, int(module.definition.cooldown_ms))


def _active_targets(player: PlayerBattleState) -> list[BattleModule]:
    return sorted(
        (
            module
            for module in player.modules.values()
            if module_is_operational(module)
            and module.definition.mechanic_id != "core"
        ),
        key=lambda module: module.instance_id,
    )


def select_sabotage_target(
    sabotage_module: BattleModule,
    opponent: PlayerBattleState,
    *,
    excluded_target_ids: frozenset[str] | set[str] = frozenset(),
    elapsed_ms: int = 0,
) -> BattleModule | None:
    targets = [
        module for module in _active_targets(opponent)
        if module.instance_id not in excluded_target_ids
    ]
    if not targets:
        return None

    module_id = sabotage_module.definition.id
    if module_id == "jammer":
        targets = [m for m in targets if m.definition.category == "destek" and JAMMER_DEBUFF_ID not in m.debuffs]
    elif module_id == "disruptor":
        targets = [m for m in targets if m.definition.category == "enerji" and DISRUPTOR_DEBUFF_ID not in m.debuffs]
    elif module_id == "virus":
        targets = [m for m in targets if VIRUS_DEBUFF_ID not in m.debuffs]
    elif module_id in {"emp", "singularity_projector"}:
        targets = [m for m in targets if int(m.mechanic_state.get("control_recovery_until_ms", 0)) <= elapsed_ms]
    if not targets:
        return None

    preferred = [
        module
        for module in targets
        if module.definition.mechanic_id
        in sabotage_module.definition.strong_against
    ]
    if preferred:
        return preferred[0]

    non_barriers = [
        module
        for module in targets
        if module.definition.mechanic_id != "barrier"
    ]
    if non_barriers:
        return non_barriers[0]

    return targets[0]


def plan_sabotage(
    sabotage_module: BattleModule,
    opponent: PlayerBattleState,
    *,
    excluded_target_ids: frozenset[str] | set[str] = frozenset(),
    elapsed_ms: int = 0,
) -> SabotagePlan | None:
    target = select_sabotage_target(
        sabotage_module,
        opponent,
        excluded_target_ids=excluded_target_ids,
        elapsed_ms=elapsed_ms,
    )
    if target is None:
        return None

    definition_id = sabotage_module.definition.mechanic_id

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

    if sabotage_module.definition.id == "singularity_projector":
        return SabotagePlan(
            SINGULARITY_DEBUFF_ID,
            "Tekillik Alanı",
            SINGULARITY_DURATION_MS,
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
    matchup_multiplier = 1.0
    effect_strength_multiplier = sabotage_module.definition.effect_multiplier
    reasons: list[str] = []

    if target.definition.mechanic_id in sabotage_module.definition.strong_against:
        matchup_multiplier *= STRONG_AGAINST_DURATION_MULTIPLIER
        reasons.append("güçlü-karşılaşma")

    if target.definition.mechanic_id in sabotage_module.definition.weak_against:
        matchup_multiplier *= WEAK_AGAINST_DURATION_MULTIPLIER
        reasons.append("zayıf-karşılaşma")

    base = base_sabotage_duration_ms(sabotage_module.definition)
    duration_multiplier = sabotage_duration_ms(sabotage_module.definition, matchup_multiplier) / max(1, base)

    # Sabotaj direnci bir yüktür: Bariyer'in çevrimi dolunca hazır olur ve
    # devreye uygulanan tek bir sabotajda harcanır.
    powered_barriers = sorted(
        (
            module
            for module in target_player.modules.values()
            if module.status == ModuleStatus.ACTIVE
            and module.definition.mechanic_id == "barrier"
            and module.is_powered
            and module_is_operational(module)
            and module.hp > 0
            and not is_overheated(module)
            and charged(module, SABOTAGE_GUARD_KEY)
        ),
        key=lambda module: (
            -module.definition.effect_multiplier * heat_efficiency(module),
            module.instance_id,
        ),
    )
    guard_module_id = None

    if powered_barriers:
        guard = powered_barriers[0]
        duration_multiplier *= 1 - sabotage_guard_ratio(
            guard.definition.effect_multiplier, heat_efficiency(guard)
        )
        guard_module_id = guard.instance_id
        reasons.append("enerjili-bariyer")

    if (
        sabotage_module.definition.mechanic_id == "disruptor"
        and target.definition.mechanic_id == "armor"
    ):
        duration_multiplier *= max(
            0.30,
            1
            - (1 - ARMOR_DISRUPTOR_DURATION_MULTIPLIER)
            * target.definition.effect_multiplier,
        )
        reasons.append("zırh-hat-direnci")

    # Sabotajın doğrudan enerjili Bariyere yönelmesi ve sabotajın
    # Bariyere karşı zayıf olması durumunda etki tamamen engellenir.
    blocked = (
        target.definition.mechanic_id == "barrier"
        and target.is_powered
        and not is_overheated(target)
        and target.definition.mechanic_id in sabotage_module.definition.weak_against
    )

    if blocked:
        reasons.append("bariyer-tam-engelleme")

    return SabotageResistance(
        duration_multiplier=duration_multiplier,
        effect_strength_multiplier=effect_strength_multiplier,
        blocked=blocked,
        reasons=tuple(reasons),
        guard_module_id=guard_module_id,
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
