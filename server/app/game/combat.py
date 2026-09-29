from dataclasses import dataclass

from .heat import heat_efficiency, is_overheated
from .models import BattleModule, PlayerBattleState
from .operations import module_is_operational


ATTACK_COOLDOWN_ID = "attack"

TARGET_CATEGORY_PRIORITY = {
    "savunma": 0,
    "sabotaj": 1,
    "destek": 2,
    "enerji": 3,
    "saldırı": 4,
}


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
        if module_is_operational(module)
    ]

    normal_targets = [
        module
        for module in active
        if module.definition.mechanic_id != "core"
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
                    module.definition.mechanic_id == "barrier"
                    and module.is_powered
                )
                else 1,
                module.instance_id,
            ),
        )

    core_targets = [
        module
        for module in active
        if module.definition.mechanic_id == "core"
    ]
    return sorted(
        core_targets,
        key=lambda module: module.instance_id,
    )


def select_target(player: PlayerBattleState) -> BattleModule | None:
    # Süre Çekirdeği hedefe açmaz; hedef sırası her zaman modüller, sonra Çekirdek.
    targets = selectable_targets(player)
    return targets[0] if targets else None


def attack_damage_multiplier(module: BattleModule) -> float:
    multiplier = 1.0
    core_effect = module.persistent_effects.get("core_overdrive")
    if core_effect is not None:
        multiplier *= float(core_effect.data.get("damage_multiplier", 1.0))
    return multiplier


def counter_strategy_multiplier(attacker: BattleModule, target: BattleModule) -> float:
    multiplier = 1.0
    if target.definition.mechanic_id in attacker.definition.strong_against:
        multiplier *= 1.25
    if target.definition.mechanic_id in attacker.definition.weak_against:
        multiplier *= 0.80
    return multiplier


# Beta.72 imza mekanikleri --------------------------------------------------
# Füze/Plazma hedefe kilitlenir; hazırlık süresi saldırı döngüsünün içindedir.
ATTACK_WINDUP_MS = {"missile_launcher": 700, "plasma_mortar": 1200}
# Birincil vuruştan sonra sıradaki hedefe giden ikincil vuruş oranı.
SECONDARY_HIT_RATIOS = {
    "arc_cannon": 0.45,
    "drone_bay": 0.25,
    "plasma_mortar": 0.35,
    "ion_spear": 0.55,
}
QUANTUM_REPEAT_HITS = 4
QUANTUM_REPEAT_ECHO_RATIO = 0.65
SWARM_RELEASE_DRONES = 4
SWARM_RELEASE_TARGETS = 3
SWARM_RELEASE_RATIO_PER_TARGET = 0.25
QUANTUM_CHARGE_DAMAGE_BONUS = 0.80
PRISM_ENERGY_CONVERSION = 0.25

# Delici silahlar ham güç almaz; yüksek enerji ve ısı karşılığında savunma
# azaltımının bir kısmını yok sayar (oran = azaltımın korunan payı).
PIERCE_KEPT_REDUCTION = {
    "railgun": 0.60,
    "ion_spear": 0.40,
}
# Faz Zırhı her 6 sn'nin ilk 1 sn'sinde saldırıları tamamen boşa çıkarır.
PHASE_ARMOR_CYCLE_MS = 6000
PHASE_ARMOR_WINDOW_MS = 1000
GUARDIAN_DOME_CIRCUIT_REDUCTION = 0.12
GUARDIAN_DOME_MIN_MULTIPLIER = 0.78


def phase_armor_active(elapsed_ms: int) -> bool:
    return elapsed_ms % PHASE_ARMOR_CYCLE_MS < PHASE_ARMOR_WINDOW_MS


def defense_profile(
    target: BattleModule,
    *,
    attacker: BattleModule | None = None,
    elapsed_ms: int = 0,
) -> tuple[str, float, float]:
    defense_type = "Yok"
    multiplier = 1.0
    reflection_ratio = 0.0
    phased = False

    if target.definition.mechanic_id != "core" and not module_is_operational(target):
        return defense_type, multiplier, reflection_ratio
    # Aşırı ısınan savunma modülü susar; ısındıkça koruması azalır.
    if is_overheated(target):
        return defense_type, multiplier, reflection_ratio

    target_id = target.definition.id
    if target_id == "guardian_dome" and target.is_powered:
        defense_type = "Koruyucu Kubbe"
        multiplier *= 0.68
    elif target_id == "prism_shield" and target.is_powered:
        defense_type = "Prizma Kalkanı"
        multiplier *= 0.70
    elif target_id == "phase_armor":
        phased = phase_armor_active(elapsed_ms)
        defense_type = "Faz Zırhı · Faz" if phased else "Faz Zırhı"
        multiplier *= 0.0 if phased else 0.82
    elif target.definition.mechanic_id == "shield" and target.is_powered:
        defense_type = "Kalkan"
        multiplier *= 0.65
    elif target.definition.mechanic_id == "armor":
        defense_type = "Zırh"
        multiplier *= 0.75
    elif target.definition.mechanic_id == "reflector" and target.is_powered:
        defense_type = "Yansıtıcı"
        multiplier *= 0.75
        reflection_ratio = 0.20
    elif target.definition.mechanic_id == "barrier" and target.is_powered:
        defense_type = "Bariyer"
        multiplier *= 0.80

    effectiveness = target.definition.effect_multiplier * heat_efficiency(target)
    if phased:
        multiplier = 0.0
    elif multiplier < 1:
        multiplier = max(.35, 1 - (1 - multiplier) * effectiveness)

    kept = PIERCE_KEPT_REDUCTION.get(attacker.definition.id) if attacker is not None else None
    if kept is not None and multiplier < 1:
        multiplier = 1 - (1 - multiplier) * kept
        defense_type += f" · %{round((1 - kept) * 100)} delindi"
    reflection_ratio = min(.35, reflection_ratio * effectiveness)
    return defense_type, multiplier, reflection_ratio


def circuit_guard_multiplier(player: PlayerBattleState, target: BattleModule) -> float:
    """Yaşayan Koruyucu Kubbe devredeki diğer modüllere gelen hasarı azaltır."""
    if target.definition.id == "guardian_dome":
        return 1.0
    domes = [
        module
        for module in player.modules.values()
        if module.definition.id == "guardian_dome"
        and module_is_operational(module)
        and not is_overheated(module)
    ]
    if not domes:
        return 1.0
    strongest = max(
        module.definition.effect_multiplier * heat_efficiency(module)
        for module in domes
    )
    return max(
        GUARDIAN_DOME_MIN_MULTIPLIER,
        1.0 - GUARDIAN_DOME_CIRCUIT_REDUCTION * strongest,
    )


def secondary_targets(
    player: PlayerBattleState,
    primary: BattleModule,
    count: int = 1,
) -> list[BattleModule]:
    """Birincil hedeften sonra aynı hedef sırasındaki sonraki modüller."""
    return [
        module
        for module in selectable_targets(player)
        if module.instance_id != primary.instance_id
    ][:count]


def resolve_attack(
    attacker_player_id: str,
    attacker: BattleModule,
    target_player_id: str,
    target: BattleModule,
    support_damage_multiplier: float = 1.0,
    defense_effectiveness: float = 1.0,
    circuit_guard: float = 1.0,
    elapsed_ms: int = 0,
) -> AttackResolution:
    attack_multiplier = (
        attack_damage_multiplier(attacker)
        * support_damage_multiplier
    )
    counter_multiplier = counter_strategy_multiplier(attacker, target)

    raw_damage = max(
        0,
        int(round(attacker.definition.base_damage * attack_multiplier * counter_multiplier)),
    )

    defense_type, defense_multiplier, reflection_ratio = defense_profile(
        target, attacker=attacker, elapsed_ms=elapsed_ms
    )
    defense_multiplier = 1 - (1 - defense_multiplier) * defense_effectiveness
    if circuit_guard < 1.0:
        defense_multiplier *= max(0.0, circuit_guard)
        defense_type = (
            f"{defense_type} + Kubbe" if defense_type != "Yok" else "Kubbe"
        )
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
