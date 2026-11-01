"""Presence and the current EMP interruption; no power-supply state."""
from .models import BattleModule,ModuleStatus

def module_is_present(module: BattleModule) -> bool:
    return module.status == ModuleStatus.ACTIVE and module.hp > 0


def module_is_operational(module: BattleModule) -> bool:
    return (
        module_is_present(module)
        and "emp_disabled" not in module.debuffs
    )
