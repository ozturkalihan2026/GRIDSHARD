from dataclasses import dataclass
from .heat import generates_heat, heat_efficiency, is_overheated
from .models import BattleModule, ModuleStatus, PlayerBattleState
from .module_cycles import OMEGA_CHARGE_KEY, OVERCLOCK_CHARGE_KEY, TARGETING_LOCK_KEY
from .operations import module_is_operational

REPAIR_COOLDOWN_ID = "support_repair"
BASE_REPAIR_AMOUNT = 15
# Tek saldırı modülünün aldığı tam pay (AMPLIFIER_PER_ATTACK_CAP ile aynı).
AMPLIFIER_DAMAGE_MULTIPLIER = 1.18
# Tek saldırı modülünün aldığı tam hız payı (TARGETING_PER_ATTACK_CAP ile aynı).
TARGETING_COOLDOWN_MULTIPLIER = 0.82
OVERCLOCK_DAMAGE_MULTIPLIER = 1.20
OVERCLOCK_COOLDOWN_MULTIPLIER = 0.80
# Aşırı Hızlandırıcı hedefini daha sık ateşlettiği için zaten ısıtır; her
# yüklemede eklediği ısı (2,5 sn'de %3,75; saniyede %1,5) Soğutucu olmadan
# Darbe Topunu ~16 sn'de susturur.
OVERCLOCK_HEAT_PER_PULSE = 3.75
# Eski sürekli kuralın saniyelik karşılığı (yalnız belgeler ve eski araçlar için).
OVERCLOCK_HEAT_PER_TICK = 0.15
# Soğutucu darbeyle çalışır (13 Ekim 2026): çevriminde bir (seviye 1'de 1 sn)
# önce aşırı ısınıp susmuş modülleri, sonra en sıcak modülleri seçer ve en
# fazla üç modülü %4,5 soğutur (susmuş modülde iki kat: havalandırmayla
# birlikte ~2,5 sn'de toparlar). Saniyelik etki eski sürekli kuralla aynıdır.
COOLER_HEAT_REDUCTION_PER_PULSE = 4.5
# Eski sürekli kuralın adım başına karşılığı (yalnız belgeler ve eski araçlar için).
COOLER_HEAT_REDUCTION_PER_TICK = 0.45
COOLER_MAX_TARGETS = 3
COOLER_OVERHEAT_MULTIPLIER = 2.0

# Tüm devreye etki eden destekler toplam paylarını sahadaki saldırı
# modüllerine böler: 1-2 saldırıda her biri tam pay, daha kalabalık devrede
# pay küçülür (Güçlendirici: 3 saldırıda %10, 4'te %7,5, 6'da %5).
# Güçlendirici darbeyle çalışır (12 Ekim 2026): çevrim süresinde bir saldırı
# modüllerini yükler, yük sıradaki atışta harcanır. Çevrimden hızlı ateş eden
# silahlar her atışta yük bulamadığı için pay eskisinden biraz yüksektir.
AMPLIFIER_PER_ATTACK_CAP = 0.18
AMPLIFIER_TOTAL_BUDGET = 0.36
AMPLIFIER_PULSE_COOLDOWN_ID = "amplifier_pulse"
AMPLIFIER_CHARGE_KEY = "amplifier_charged"
# Hedefleme Bilgisayarı da darbeyle çalışır (13 Ekim 2026): çevriminde bir
# saldırı modüllerine kilit verir; kilit sıradaki atışta harcanır ve o atıştan
# sonraki beklemeyi kısaltır. Güçlendirici'deki gerekçeyle pay %15 → %18.
TARGETING_PER_ATTACK_CAP = 0.18
TARGETING_TOTAL_BUDGET = 0.36
# Destek darbesinin saldırı modülünde bıraktığı yükler; atış hepsini harcar,
# en güçlü tek destek uygulanır.
SUPPORT_CHARGE_KEYS = (
    AMPLIFIER_CHARGE_KEY,
    TARGETING_LOCK_KEY,
    OVERCLOCK_CHARGE_KEY,
    OMEGA_CHARGE_KEY,
)
# Darbeyle bütün saldırı modüllerini yükleyen destekler → bıraktıkları yük.
SUPPORT_PULSE_CHARGES = {
    "amplifier": AMPLIFIER_CHARGE_KEY,
    "targeting_computer": TARGETING_LOCK_KEY,
    "omega_amplifier": OMEGA_CHARGE_KEY,
}

# Hassas Matris: çevriminde bir, hedefini değiştirmemiş saldırıya odak kademesi verir.
PRECISION_DAMAGE_PER_STACK = 0.04
PRECISION_COOLDOWN_PER_STACK = 0.03
PRECISION_MAX_STACKS = 4

# Kronos Rölesi: 4 sn hızlanma, ardından zaman borcu. Çevrim (hızlanma + borç)
# seviye 1'de 6,5 sn'dir ve seviyeyle kısalır; kısalan kısım borçtur.
CHRONO_BOOST_MS = 4000
CHRONO_DEBT_MS = 2500
CHRONO_MIN_DEBT_MS = 500


def chrono_debt_ms(chrono_module: BattleModule) -> int:
    cycle = int(chrono_module.definition.cooldown_ms or 0)
    if cycle <= 0:
        return CHRONO_DEBT_MS
    return max(CHRONO_MIN_DEBT_MS, cycle - CHRONO_BOOST_MS)
CHRONO_BOOST_COOLDOWN = 0.72
CHRONO_DEBT_COOLDOWN = 1.18
CHRONO_DEBT_DAMAGE = 0.95

# Omega Güçlendirici: devredeki her farklı sınıf toplam paya %8 ekler.
OMEGA_BUDGET_PER_CATEGORY = 0.08
OMEGA_PER_ATTACK_CAP = 0.20
OMEGA_MAX_CATEGORIES = 5

# Nano Medik iki hedefe, her birine temel onarımın %62'si kadar.
NANO_MEDIC_TARGETS = 2
NANO_MEDIC_REPAIR_RATIO = 0.62
# Anka Onarımı: 30 sn'de bir, sınıf sınırlarına uyarak yok edilmiş bir modülü
# %30 CAN ile geri getirir; her modül maçta en fazla bir kez dirilir.
PHOENIX_COOLDOWN_ID = "phoenix_rebirth"
PHOENIX_COOLDOWN_MS = 30_000
PHOENIX_REVIVE_HP_RATIO = 0.30
PHOENIX_REVIVE_ENERGY = 10.0
PHOENIX_REPAIR_RATIO = 1.15
JAMMER_DEBUFF_ID = "support_jammed"

REPAIR_CLEANSABLE_DEBUFFS = (
    "virus",
    "support_jammed",
)

COOLER_REDUCIBLE_DEBUFFS = (
    "emp_disabled",
    "line_disrupted",
)

# Soğutucu darbesi EMP ve hat kesintisinin kalan süresinden bu kadar keser
# (eski sürekli kural adım başına 200 ms'ydi; saniyelik etki yakındır).
COOLER_DEBUFF_REDUCTION_MS_PER_PULSE = 1800
COOLER_DEBUFF_REDUCTION_MS_PER_TICK = 200

@dataclass(slots=True, frozen=True)
class AttackSupportModifiers:
    damage_multiplier: float = 1.0
    cooldown_multiplier: float = 1.0
    amplifier_active: bool = False
    targeting_active: bool = False
    overclock_active: bool = False
    contributions: tuple[dict, ...] = ()
    # Seçilen tek desteğin türü (ör. "amplifier"); destek yoksa boş.
    kind: str = ""

def _operational_supports(
    player: PlayerBattleState,
    definition_id: str,
) -> list[BattleModule]:
    return sorted(
        (
            module
            for module in player.modules.values()
            if module.definition.id == definition_id
            and module_is_operational(module)
            and JAMMER_DEBUFF_ID not in module.debuffs
            and not is_overheated(module)
        ),
        key=lambda module: (
            -module.definition.effect_multiplier * heat_efficiency(module),
            module.instance_id,
        ),
    )


def operational_attack_count(player: PlayerBattleState) -> int:
    return sum(
        1
        for module in player.modules.values()
        if module.definition.category == "saldırı"
        and module.definition.base_damage > 0
        and module_is_operational(module)
    )


def shared_support_share(per_attack_cap: float, total_budget: float, attack_count: int) -> float:
    """Tüm devreye etki eden destek, toplam payını saldırı modüllerine böler."""
    return min(per_attack_cap, total_budget / max(1, attack_count))


def overclock_assignments(player: PlayerBattleState) -> dict[str, BattleModule]:
    """Her Aşırı Hızlandırıcı en ağır, henüz seçilmemiş saldırı modülünü seçer.

    Seçim yerleşimden bağımsızdır; hız/hasar bonusu ve ısı aynı hedefe gider.
    """
    overclocks = _operational_supports(player, "overclock_unit")
    attacks = sorted(
        (
            module
            for module in player.modules.values()
            if module.definition.category == "saldırı"
            and module_is_operational(module)
            and not is_overheated(module)
        ),
        key=lambda module: (
            -module.definition.action_energy_cost,
            -module.definition.base_damage,
            module.instance_id,
        ),
    )
    return {
        target.instance_id: overclock
        for overclock, target in zip(overclocks, attacks, strict=False)
    }


def chrono_phase(chrono_module: BattleModule, elapsed_ms: int) -> str:
    boost_until = int(chrono_module.mechanic_state.get("chrono_boost_until_ms", 0))
    debt_until = int(chrono_module.mechanic_state.get("chrono_debt_until_ms", 0))
    if elapsed_ms < boost_until:
        return "boost"
    if elapsed_ms < debt_until:
        return "debt"
    return "idle"


def circuit_category_diversity(player: PlayerBattleState) -> int:
    return min(
        OMEGA_MAX_CATEGORIES,
        len({
            module.definition.category
            for module in player.modules.values()
            if module.definition.id != "core" and module_is_operational(module)
        }),
    )


def attack_support_modifiers(player, attack_module, core_position, elapsed_ms: int = 0):
    """Bir saldırı modülünün aldığı tek saldırı desteğini ve Kronos borcunu hesaplar.

    Destekler yerleşimden bağımsız olarak tüm devrede çalışır. Bir saldırı modülü
    yalnız en güçlü tek desteği kullanır; Kronos borcu ise seçimden bağımsız bir
    cezadır ve başka destekle atlatılamaz.
    """
    del core_position
    support = player.energy_support_multiplier
    attacks = operational_attack_count(player)
    # (etki, tür, kaynak, hasar çarpanı, bekleme çarpanı)
    options: list[tuple[float, str, BattleModule, float, float]] = []

    amplifiers = _operational_supports(player, "amplifier")
    # Yük, Güçlendirici'nin son darbesinden beri atış yapmamış modülde durur;
    # yeni yerleşen modül ilk atışına yüklü başlar.
    if amplifiers and attack_module.mechanic_state.get(AMPLIFIER_CHARGE_KEY, True):
        source = amplifiers[0]
        bonus = (
            shared_support_share(AMPLIFIER_PER_ATTACK_CAP, AMPLIFIER_TOTAL_BUDGET, attacks)
            * source.definition.effect_multiplier
            * support
            * heat_efficiency(source)
        )
        options.append((bonus, "amplifier", source, 1 + bonus, 1.0))

    targeting = _operational_supports(player, "targeting_computer")
    if targeting and attack_module.mechanic_state.get(TARGETING_LOCK_KEY, True):
        source = targeting[0]
        reduction = (
            shared_support_share(TARGETING_PER_ATTACK_CAP, TARGETING_TOTAL_BUDGET, attacks)
            * source.definition.effect_multiplier
            * support
            * heat_efficiency(source)
        )
        options.append((reduction, "targeting_computer", source, 1.0, max(.65, 1 - reduction)))

    overclock = overclock_assignments(player).get(attack_module.instance_id)
    if overclock is not None and attack_module.mechanic_state.get(OVERCLOCK_CHARGE_KEY, True):
        effect = overclock.definition.effect_multiplier * support * heat_efficiency(overclock)
        options.append((
            .40 * effect,
            "overclock_unit",
            overclock,
            1 + (OVERCLOCK_DAMAGE_MULTIPLIER - 1) * effect,
            max(.65, 1 - (1 - OVERCLOCK_COOLDOWN_MULTIPLIER) * effect),
        ))

    matrices = _operational_supports(player, "precision_matrix")
    stacks = max(0, min(PRECISION_MAX_STACKS, int(attack_module.mechanic_state.get("precision_focus_stacks", 0))))
    if matrices and stacks:
        source = matrices[0]
        effect = source.definition.effect_multiplier * support * heat_efficiency(source)
        damage = 1 + PRECISION_DAMAGE_PER_STACK * stacks * effect
        cooldown = max(.72, 1 - PRECISION_COOLDOWN_PER_STACK * stacks * effect)
        options.append(((damage - 1) + (1 - cooldown), "precision_matrix", source, damage, cooldown))

    chronos = _operational_supports(player, "chrono_relay")
    chrono_debt = False
    if chronos:
        source = chronos[0]
        phase = chrono_phase(source, elapsed_ms)
        if phase == "boost":
            cooldown = max(
                .65,
                1 - (1 - CHRONO_BOOST_COOLDOWN)
                * source.definition.effect_multiplier
                * support
                * heat_efficiency(source),
            )
            options.append((1 - cooldown, "chrono_relay", source, 1.0, cooldown))
        elif phase == "debt":
            chrono_debt = True

    omegas = _operational_supports(player, "omega_amplifier")
    if omegas and attack_module.mechanic_state.get(OMEGA_CHARGE_KEY, True):
        source = omegas[0]
        diversity = circuit_category_diversity(player)
        source.mechanic_state["resonance_categories"] = diversity
        bonus = (
            shared_support_share(OMEGA_PER_ATTACK_CAP, OMEGA_BUDGET_PER_CATEGORY * diversity, attacks)
            * source.definition.effect_multiplier
            * support
            * heat_efficiency(source)
        )
        if bonus > 0:
            options.append((bonus, "omega_amplifier", source, 1 + bonus, 1.0))

    selected = (
        sorted(options, key=lambda item: (-item[0], item[1], item[2].instance_id))[0]
        if options
        else None
    )
    damage = cooldown = 1.0
    kind = ""
    contributions: list[dict] = []
    if selected is not None:
        _, kind, source, damage, cooldown = selected
        if damage > 1.0:
            contributions.append({
                "source_module_id": source.instance_id,
                "contribution_kind": "attack_boost",
                "value": (damage - 1.0) * 100,
            })
        if cooldown < 1.0:
            contributions.append({
                "source_module_id": source.instance_id,
                "contribution_kind": "cooldown_reduction",
                "value": (1.0 - cooldown) * 100,
            })
    if chrono_debt:
        damage *= CHRONO_DEBT_DAMAGE
        cooldown *= CHRONO_DEBT_COOLDOWN
    return AttackSupportModifiers(
        damage_multiplier=damage,
        cooldown_multiplier=cooldown,
        amplifier_active=kind in {"amplifier", "omega_amplifier"},
        targeting_active=kind in {"targeting_computer", "precision_matrix", "chrono_relay"},
        overclock_active=kind == "overclock_unit",
        contributions=tuple(contributions),
        kind=kind,
    )


def repair_amount(repair_module):
    return max(1, int(round(BASE_REPAIR_AMOUNT * repair_module.definition.effect_multiplier)))

def repair_targets(player, repair_module, core_position):
    del repair_module, core_position
    return sorted(
        (
            module
            for module in player.modules.values()
            if module.status == ModuleStatus.ACTIVE
            and module.definition.id != "core"
            and module.hp > 0
            and module_is_operational(module)
            and module.hp < module.definition.max_hp
        ),
        key=lambda module: (module.hp / module.definition.max_hp, module.instance_id),
    )


def repair_target(player, repair_module, core_position):
    """Compatibility helper for callers that still need the first target."""
    targets = repair_targets(player, repair_module, core_position)
    return targets[0] if targets else None

def cooler_targets(player, cooler_module, core_position):
    # Yerleşim otomatik olduğu için Soğutucu komşuluğa değil tüm devreye bakar.
    # Önce aşırı ısınıp susmuş modüller (yeniden devreye girsin), sonra en
    # sıcaklar.
    del cooler_module, core_position
    return sorted(
        (
            module
            for module in player.modules.values()
            if generates_heat(module)
            and module.heat > 0
            and module_is_operational(module)
        ),
        key=lambda module: (
            not is_overheated(module),
            -module.heat,
            module.instance_id,
        ),
    )[:COOLER_MAX_TARGETS]


def overclock_targets(player, overclock_module, core_position):
    del core_position
    return [
        target
        for target_id, source in overclock_assignments(player).items()
        if source is overclock_module
        for target in (player.modules[target_id],)
    ]


def repair_cleanse_target(player, repair_module, core_position):
    # Kartlar birbirine bağlanmak zorunda olmadığından temizleme de tüm devreye bakar.
    del core_position
    candidates = []

    for module in player.modules.values():
        if module is repair_module or module.status != ModuleStatus.ACTIVE or module.hp <= 0:
            continue
        active_effects = [
            effect_id
            for effect_id in REPAIR_CLEANSABLE_DEBUFFS
            if effect_id in module.debuffs
        ]
        if active_effects:
            candidates.append((module.instance_id, module, active_effects[0]))

    if not candidates:
        return None

    _, module, effect_id = sorted(
        candidates,
        key=lambda item: item[0],
    )[0]
    return module, effect_id


def cooler_reducible_debuff_targets(
    player,
    cooler_module,
    core_position,
):
    del cooler_module, core_position
    results = []

    for module in player.modules.values():
        if module.status != ModuleStatus.ACTIVE or module.hp <= 0:
            continue
        for effect_id in COOLER_REDUCIBLE_DEBUFFS:
            if effect_id in module.debuffs:
                results.append((module, effect_id))
                break

    return sorted(
        results,
        key=lambda item: item[0].instance_id,
    )[:COOLER_MAX_TARGETS]
