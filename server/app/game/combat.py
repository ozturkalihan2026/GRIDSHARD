from dataclasses import dataclass

from .board import get_cell_effects
from .models import BattleModule, ModuleStatus, PlayerBattleState


ATTACK_COOLDOWN_ID = "attack"


@dataclass(slots=True, frozen=True)
class AttackResolution:
    attacker_player_id: str
    attacker_module_id: str
    target_player_id: str
    target_module_id: str
    base_damage: float
    damage_multiplier: float
    final_damage: int


def is_attack_module(module: BattleModule) -> bool:
    return (
        module.status == ModuleStatus.ACTIVE
        and module.definition.category == "saldırı"
        and module.definition.base_damage > 0
        and module.definition.cooldown_ms > 0
    )


def selectable_targets(player: PlayerBattleState) -> list[BattleModule]:
    active = [
        module
        for module in player.modules.values()
        if module.status == ModuleStatus.ACTIVE
        and module.hp > 0
    ]

    normal_targets = [
        module
        for module in active
        if module.definition.id not in {"generator", "core"}
    ]
    if normal_targets:
        return sorted(
            normal_targets,
            key=lambda module: module.instance_id,
        )

    generator_targets = [
        module
        for module in active
        if module.definition.id == "generator"
    ]
    if generator_targets:
        return sorted(
            generator_targets,
            key=lambda module: module.instance_id,
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
    targets = selectable_targets(player)
    return targets[0] if targets else None


def attack_damage_multiplier(module: BattleModule) -> float:
    multiplier = 1.0

    if module.position is not None:
        multiplier *= float(
            get_cell_effects(module.position).get(
                "attack_multiplier",
                1.0,
            )
        )

    overcharge = module.temporary_boosters.get("overcharge_chip")
    if overcharge is not None:
        multiplier *= float(
            overcharge.data.get(
                "attack_multiplier",
                1.0,
            )
        )

    return multiplier


def resolve_attack(
    attacker_player_id: str,
    attacker: BattleModule,
    target_player_id: str,
    target: BattleModule,
) -> AttackResolution:
    multiplier = attack_damage_multiplier(attacker)
    final_damage = max(
        0,
        int(round(attacker.definition.base_damage * multiplier)),
    )

    return AttackResolution(
        attacker_player_id=attacker_player_id,
        attacker_module_id=attacker.instance_id,
        target_player_id=target_player_id,
        target_module_id=target.instance_id,
        base_damage=attacker.definition.base_damage,
        damage_multiplier=multiplier,
        final_damage=final_damage,
    )
