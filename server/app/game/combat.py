"""Canonical target order. Damage/effects are owned by battle_actions_v2."""
from .models import BattleModule, PlayerBattleState
from .operations import module_is_operational,module_is_present

TARGET_CATEGORY_PRIORITY = {
    "savunma": 0,
    "sabotaj": 1,
    "destek": 2,
    "enerji": 3,
    "saldırı": 4,
}


def is_attack_module(module: BattleModule) -> bool:
    return (
        module_is_operational(module)
        and module.definition.category in {"saldırı", "sabotaj"}
        and module.definition.base_damage > 0
        and module.definition.cooldown_ms > 0
    )


def has_living_attack_module(player: PlayerBattleState) -> bool:
    return any(
        is_attack_module(module)
        for module in player.modules.values()
    )


def selectable_targets(player: PlayerBattleState) -> list[BattleModule]:
    active = [
        module
        for module in player.modules.values()
        if module_is_present(module)
    ]

    normal_targets = [
        module
        for module in active
        if module.definition.id != "core"
    ]
    if normal_targets:
        return sorted(
            normal_targets,
            key=lambda module: (
                TARGET_CATEGORY_PRIORITY.get(
                    module.definition.category,
                    len(TARGET_CATEGORY_PRIORITY),
                ),
                # Powered barriers retain their established precedence, but
                # only inside the defense class selected by the canonical
                # class order above.
                0
                if (
                    module.definition.id == "barrier"

                )
                else 1,
                module.instance_id,
            ),
        )

    core_targets = [
        module
        for module in active
        if module.definition.id == "core"
    ]
    return sorted(
        core_targets,
        key=lambda module: module.instance_id,
    )


def select_target(player: PlayerBattleState) -> BattleModule | None:
    # Süre Çekirdeği hedefe açmaz; hedef sırası her zaman modüller, sonra Çekirdek.
    targets = selectable_targets(player)
    return targets[0] if targets else None
