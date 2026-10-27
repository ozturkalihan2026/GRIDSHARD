from dataclasses import dataclass

from .heat import heat_efficiency, is_overheated
from .models import BattleModule, PlayerBattleState
from .module_cycles import (
    BLOCK_BASE_RATIO,
    BLOCK_CHARGE_KEY,
    DOME_CHARGE_KEY,
    MIRROR_CHARGE_KEY,
    PHASE_WINDOW_MS,
    block_ratio,
    charged,
    cycle_ms,
    dome_guard_ratio,
    mirror_reflect_ratio,
    passive_reduction,
)
from .operations import module_is_operational, module_is_present


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
    # Bu vuruşta harcanan savunma yükleri (motor çevrimi yeniden başlatır).
    block_charge_used: bool = False
    mirror_charge_used: bool = False


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
    "plasma_mortar": 0.55,
    "ion_spear": 0.55,
}
QUANTUM_REPEAT_HITS = 4
QUANTUM_REPEAT_ECHO_RATIO = 0.65
SWARM_RELEASE_DRONES = 4
SWARM_RELEASE_TARGETS = 3
SWARM_RELEASE_RATIO_PER_TARGET = 0.45
QUANTUM_CHARGE_DAMAGE_BONUS = 0.60
# Seviye 1 değeri; savaşta oran module_cycles.prism_conversion_ratio ile büyür.
PRISM_ENERGY_CONVERSION = 0.08

# Delici silahlar ham güç almaz; yüksek enerji ve ısı karşılığında savunma
# azaltımının bir kısmını yok sayar (oran = azaltımın korunan payı).
PIERCE_KEPT_REDUCTION = {
    "railgun": 0.60,
    "ion_spear": 0.40,
}
# Faz Zırhı her çevrimin (seviye 1'de 6 sn) ilk 1 sn'sinde saldırıları tamamen
# boşa çıkarır; çevrim seviyeyle kısalır (module_cycles.py).
PHASE_ARMOR_CYCLE_MS = 6000
PHASE_ARMOR_WINDOW_MS = PHASE_WINDOW_MS


def phase_armor_active(elapsed_ms: int, cycle: int = PHASE_ARMOR_CYCLE_MS) -> bool:
    return elapsed_ms % max(PHASE_ARMOR_WINDOW_MS + 100, int(cycle)) < PHASE_ARMOR_WINDOW_MS


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

    # Seviye ve yetenek etkiyi büyütür; ısınan savunmanın etkisi aynı oranda düşer.
    effect = target.definition.effect_multiplier
    efficiency = heat_efficiency(target)
    target_id = target.definition.id
    mechanic_id = target.definition.mechanic_id
    if target_id == "guardian_dome":
        if target.is_powered:
            defense_type = "Koruyucu Kubbe"
            multiplier = 1 - passive_reduction("guardian_dome", effect, efficiency)
    elif target_id == "phase_armor":
        phased = phase_armor_active(elapsed_ms, cycle_ms(target.definition, PHASE_ARMOR_CYCLE_MS))
        defense_type = "Faz Zırhı · Faz" if phased else "Faz Zırhı"
        multiplier = 0.0 if phased else 1 - passive_reduction("phase_armor", effect, efficiency)
    elif mechanic_id == "shield":
        # Kalkan ailesi sürekli emmez: çevrim dolunca tek saldırıyı karşılar.
        if target.is_powered and charged(target, BLOCK_CHARGE_KEY):
            defense_type = "Prizma Kalkanı" if target_id == "prism_shield" else "Kalkan"
            multiplier = 1 - block_ratio(
                target_id if target_id in BLOCK_BASE_RATIO else "shield", effect, efficiency
            )
    elif mechanic_id == "armor":
        defense_type = "Sönümleyici"
        multiplier = 1 - passive_reduction("armor", effect, efficiency)
    elif mechanic_id == "reflector" and target.is_powered:
        defense_type = "Yansıtıcı"
        multiplier = 1 - passive_reduction("reflector", effect, efficiency)
        if charged(target, MIRROR_CHARGE_KEY):
            # Yansıma, yüklü Yansıtıcı'nın karşıladığı saldırıda geri döner.
            reflection_ratio = mirror_reflect_ratio(effect, efficiency)
    elif mechanic_id == "barrier" and target.is_powered:
        defense_type = "Bariyer"
        multiplier = 1 - passive_reduction("barrier", effect, efficiency)

    kept = PIERCE_KEPT_REDUCTION.get(attacker.definition.id) if attacker is not None else None
    if kept is not None and multiplier < 1:
        multiplier = 1 - (1 - multiplier) * kept
        defense_type += f" · %{round((1 - kept) * 100)} delindi"
    return defense_type, multiplier, reflection_ratio


def circuit_guard(player: PlayerBattleState, target: BattleModule) -> tuple[float, BattleModule | None]:
    """Kubbe darbesi: yüklü Koruyucu Kubbe başka bir modüle gelen saldırıyı karşılar.

    Çarpanı ve yükü harcanacak kubbeyi döndürür; yüklü kubbe yoksa (1.0, None).
    Kubbe kendisini bu darbeyle değil kendi sürekli azaltımıyla korur.
    """
    if target.definition.id == "guardian_dome":
        return 1.0, None
    domes = sorted(
        (
            module
            for module in player.modules.values()
            if module.definition.id == "guardian_dome"
            and module_is_operational(module)
            and not is_overheated(module)
            and charged(module, DOME_CHARGE_KEY)
        ),
        key=lambda module: (
            -module.definition.effect_multiplier * heat_efficiency(module),
            module.instance_id,
        ),
    )
    if not domes:
        return 1.0, None
    dome = domes[0]
    return 1.0 - dome_guard_ratio(dome.definition.effect_multiplier, heat_efficiency(dome)), dome


def circuit_guard_multiplier(player: PlayerBattleState, target: BattleModule) -> float:
    return circuit_guard(player, target)[0]


def mirror_interceptor(player: PlayerBattleState, target: BattleModule) -> BattleModule | None:
    """Ateşlenen saldırıyı üzerine çekecek yüklü Yansıtıcı (yoksa None).

    Hedef Çekirdek ise ya da zaten yüklü bir Yansıtıcı ise saldırı çekilmez.
    """
    if target.definition.mechanic_id == "core":
        return None
    if target.definition.mechanic_id == "reflector" and charged(target, MIRROR_CHARGE_KEY):
        return None
    mirrors = sorted(
        (
            module
            for module in player.modules.values()
            if module.definition.mechanic_id == "reflector"
            and module_is_operational(module)
            and not is_overheated(module)
            and charged(module, MIRROR_CHARGE_KEY)
        ),
        key=lambda module: module.instance_id,
    )
    return mirrors[0] if mirrors else None


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


def adjacent_targets(player: PlayerBattleState, primary: BattleModule) -> list[BattleModule]:
    """Birincil hedefe devrede bitişik (yan yana ya da alt alta) çalışan modüller.

    Çekirdek bu listeye girmez: Çekirdek ancak modüller bittiğinde hedef olur.
    """
    if primary.position is None:
        return []
    return sorted(
        (
            module
            for module in player.modules.values()
            if module.instance_id != primary.instance_id
            and module.definition.mechanic_id != "core"
            and module_is_operational(module)
            and module.position is not None
            and abs(module.position.x - primary.position.x) + abs(module.position.y - primary.position.y) == 1
        ),
        key=lambda module: module.instance_id,
    )


def resolve_attack(
    attacker_player_id: str,
    attacker: BattleModule,
    target_player_id: str,
    target: BattleModule,
    support_damage_multiplier: float = 1.0,
    defense_effectiveness: float = 1.0,
    circuit_guard: float = 1.0,
    elapsed_ms: int = 0,
    armor_break: float = 0.0,
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
    if armor_break > 0 and defense_multiplier < 1:
        # Zırh kıran yetenek: hedefin kendi azaltımının bir kısmı yok sayılır.
        defense_multiplier = 1 - (1 - defense_multiplier) * (1 - min(1.0, armor_break))
        defense_type += f" · %{round(min(1.0, armor_break) * 100)} kırıldı"
    if circuit_guard < 1.0:
        defense_multiplier *= max(0.0, circuit_guard)
        defense_type = (
            f"{defense_type} + Kubbe" if defense_type != "Yok" else "Kubbe"
        )
    final_damage = max(0, int(round(raw_damage * defense_multiplier)))
    reduced_damage = max(0, raw_damage - final_damage)
    # Yansıma gelen (azaltılmamış) hasarın payıdır.
    reflected_damage = (
        max(0, int(round(raw_damage * reflection_ratio)))
        if reflection_ratio > 0 else 0
    )
    # Blok yükü yalnız gerçekten karşıladığı saldırıda harcanır.
    block_charge_used = raw_damage > 0 and defense_type.startswith(("Kalkan", "Prizma Kalkanı"))

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
        block_charge_used=block_charge_used,
        mirror_charge_used=raw_damage > 0 and reflection_ratio > 0,
    )
