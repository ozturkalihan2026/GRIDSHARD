from .models import BattleModule, ModuleStatus


# Every sabotage family suspends the affected card's contribution while the
# effect is alive.  The card remains on the board so the player can read and
# cleanse the state, but battle systems must treat it as absent.
DISABLING_SABOTAGE_DEBUFF_IDS = frozenset({
    "emp_disabled",
    "support_jammed",
    "virus",
    "energy_leech",
    "line_disrupted",
})


def has_disabling_sabotage(module: BattleModule) -> bool:
    return any(
        effect_id in module.debuffs
        for effect_id in DISABLING_SABOTAGE_DEBUFF_IDS
    )


def module_is_operational(module: BattleModule) -> bool:
    return (
        module.status == ModuleStatus.ACTIVE
        and module.hp > 0
        and module.is_powered
        and not has_disabling_sabotage(module)
    )
