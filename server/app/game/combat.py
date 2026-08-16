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
    attack_multiplier: float
    counter_multiplier: float
    raw_damage: int
    defense_type: str
    defense_multiplier: float
    reduced_damage: int
    final_damage: int
    reflected_damage: int


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
        powered_barriers = [
            module for module in normal_targets
            if module.definition.id == "barrier" and module.is_powered
        ]
        if powered_barriers:
            return sorted(powered_barriers, key=lambda module: module.instance_id)
        return sorted(normal_targets, key=lambda module: module.instance_id)

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


def counter_strategy_multiplier(attacker: BattleModule, target: BattleModule) -> float:
    multiplier = 1.0
    if target.definition.id in attacker.definition.strong_against:
        multiplier *= 1.25
    if target.definition.id in attacker.definition.weak_against:
        multiplier *= 0.80
    return multiplier


def defense_profile(target: BattleModule) -> tuple[str, float, float]:
    defense_type = "Yok"
    multiplier = 1.0
    reflection_ratio = 0.0

    if target.definition.id == "shield" and target.is_powered:
        defense_type = "Kalkan"
        multiplier *= 0.65
    elif target.definition.id == "armor":
        defense_type = "Zırh"
        multiplier *= 0.75
    elif target.definition.id == "reflector" and target.is_powered:
        defense_type = "Yansıtıcı"
        multiplier *= 0.75
        reflection_ratio = 0.20
    elif target.definition.id == "barrier" and target.is_powered:
        defense_type = "Bariyer"
        multiplier *= 0.80

    if target.position is not None:
        durability = float(
            get_cell_effects(target.position).get("defense_multiplier", 1.0)
        )
        if durability > 0 and durability != 1.0:
            multiplier /= durability
            defense_type = (
                f"{defense_type} + Savunma Hücresi"
                if defense_type != "Yok"
                else "Savunma Hücresi"
            )

    return defense_type, multiplier, reflection_ratio


def resolve_attack(
    attacker_player_id: str,
    attacker: BattleModule,
    target_player_id: str,
    target: BattleModule,
) -> AttackResolution:
    attack_multiplier = attack_damage_multiplier(attacker)
    counter_multiplier = counter_strategy_multiplier(attacker, target)

    raw_damage = max(
        0,
        int(round(attacker.definition.base_damage * attack_multiplier * counter_multiplier)),
    )

    defense_type, defense_multiplier, reflection_ratio = defense_profile(target)
    final_damage = max(0, int(round(raw_damage * defense_multiplier)))
    reduced_damage = max(0, raw_damage - final_damage)
    reflected_damage = (
        max(0, int(round(final_damage * reflection_ratio)))
        if reflection_ratio > 0 else 0
    )

    return AttackResolution(
        attacker_player_id=attacker_player_id,
        attacker_module_id=attacker.instance_id,
        target_player_id=target_player_id,
        target_module_id=target.instance_id,
        base_damage=attacker.definition.base_damage,
        attack_multiplier=attack_multiplier,
        counter_multiplier=counter_multiplier,
        raw_damage=raw_damage,
        defense_type=defense_type,
        defense_multiplier=defense_multiplier,
        reduced_damage=reduced_damage,
        final_damage=final_damage,
        reflected_damage=reflected_damage,
    )
