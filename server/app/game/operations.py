from .models import BattleModule, ModuleStatus


# Hard control stops work, not the module's physical presence. Infection and
# support interference have their own effects and do not shut the card down.
DISABLING_SABOTAGE_DEBUFF_IDS = frozenset({
    "emp_disabled",
    "singularity_disabled",
    "core_support_disabled",
})
JAMMER_BASE_REDUCTION = 0.35
JAMMER_MAX_REDUCTION = 0.50


def module_is_present(module: BattleModule) -> bool:
    return module.status == ModuleStatus.ACTIVE and module.hp > 0


def jammer_efficiency(module: BattleModule) -> float:
    effect = module.debuffs.get("support_jammed")
    if effect is None or module.definition.category != "destek":
        return 1.0
    strength = max(0.0, float(effect.data.get("effect_strength_multiplier", 1.0)))
    return 1.0 - min(JAMMER_MAX_REDUCTION, JAMMER_BASE_REDUCTION * strength)


def has_disabling_sabotage(module: BattleModule) -> bool:
    # This predicate runs many times per tick; avoid allocating a generator for
    # every card/system check. Read current keys, never cache mutable debuffs.
    return bool(module.debuffs) and (
        not DISABLING_SABOTAGE_DEBUFF_IDS.isdisjoint(module.debuffs)
        or ("line_disrupted" in module.debuffs and module.definition.category == "enerji")
    )


def module_is_operational(module: BattleModule) -> bool:
    return (
        module_is_present(module)
        and module.is_powered
        and not has_disabling_sabotage(module)
    )
