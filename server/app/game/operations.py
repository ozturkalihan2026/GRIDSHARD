from .models import BattleModule, ModuleStatus


# Every sabotage family suspends the affected card's contribution while the
# effect is alive.  The card remains on the board so the player can read and
# cleanse the state, but battle systems must treat it as absent.
DISABLING_SABOTAGE_DEBUFF_IDS = frozenset({
    "emp_disabled",
    "support_jammed",
    "virus",
    "line_disrupted",
})


def has_disabling_sabotage(module: BattleModule) -> bool:
    # This predicate runs many times per tick; avoid allocating a generator for
    # every card/system check. Read current keys, never cache mutable debuffs.
    return bool(module.debuffs) and not DISABLING_SABOTAGE_DEBUFF_IDS.isdisjoint(module.debuffs)


def module_is_operational(module: BattleModule) -> bool:
    return (
        module.status == ModuleStatus.ACTIVE
        and module.hp > 0
        and module.is_powered
        and not has_disabling_sabotage(module)
    )
