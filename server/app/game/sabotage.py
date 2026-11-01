"""EMP and Virus target selection; shared deterministic preference is preserved."""
from .models import BattleModule,PlayerBattleState
from .operations import module_is_operational
VIRUS_DEBUFF_ID="virus"

def _active_targets(player: PlayerBattleState) -> list[BattleModule]:
    return sorted(
        (
            module
            for module in player.modules.values()
            if module_is_operational(module)
            and module.definition.id != "core"
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
    if module_id == "virus":
        targets = [m for m in targets if VIRUS_DEBUFF_ID not in m.debuffs]
    elif module_id == "emp":
        targets = [m for m in targets if int(m.mechanic_state.get("control_recovery_until_ms", 0)) <= elapsed_ms]
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
