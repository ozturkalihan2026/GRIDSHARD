from dataclasses import dataclass
from .board import get_cell_effects
from .heat import heat_generation_multiplier
from .models import BattleModule, ModuleStatus, PlayerBattleState, Position
from .operations import module_is_operational
from .topology import build_energy_topology

REPAIR_COOLDOWN_ID = "support_repair"
BASE_REPAIR_AMOUNT = 15
AMPLIFIER_DAMAGE_MULTIPLIER = 1.15
TARGETING_COOLDOWN_MULTIPLIER = 0.85
OVERCLOCK_DAMAGE_MULTIPLIER = 1.20
OVERCLOCK_COOLDOWN_MULTIPLIER = 0.80
OVERCLOCK_HEAT_PER_TICK = 1.0
COOLER_HEAT_REDUCTION_PER_TICK = 2.0
JAMMER_DEBUFF_ID = "support_jammed"

REPAIR_CLEANSABLE_DEBUFFS = (
    "virus",
    "support_jammed",
    "energy_leech",
)

COOLER_REDUCIBLE_DEBUFFS = (
    "emp_disabled",
    "line_disrupted",
)

COOLER_DEBUFF_REDUCTION_MS_PER_TICK = 500

@dataclass(slots=True, frozen=True)
class AttackSupportModifiers:
    damage_multiplier: float = 1.0
    cooldown_multiplier: float = 1.0
    amplifier_active: bool = False
    targeting_active: bool = False
    overclock_active: bool = False
    contributions: tuple[dict, ...] = ()

def _neighbors(module, topology, player):
    return [
        player.modules[mid]
        for mid in topology.adjacency.get(module.instance_id, ())
        if mid in player.modules
        and player.modules[mid].status == ModuleStatus.ACTIVE
    ]

def attack_support_modifiers(player, attack_module, core_position):
    topology=build_energy_topology(player,core_position)
    neighbors=_neighbors(attack_module,topology,player)
    def strongest(mechanic):
        candidates = [
            module
            for module in neighbors
            if module.definition.mechanic_id == mechanic
            and module_is_operational(module)
            and JAMMER_DEBUFF_ID not in module.debuffs
        ]
        if not candidates:
            return None, 0.0
        source = sorted(
            candidates,
            key=lambda module: (
                -module.definition.effect_multiplier,
                module.instance_id,
            ),
        )[0]
        return (
            source,
            source.definition.effect_multiplier
            * player.energy_support_multiplier,
        )

    # One attack module may receive only one offensive support at a time.
    # Pick the strongest real contribution instead of multiplying several
    # different support cards on the same target.
    support_options = []
    for mechanic, impact in (
        ("amplifier", .15),
        ("targeting_computer", .15),
        ("overclock_unit", .40),
    ):
        source, effect = strongest(mechanic)
        if source is not None:
            support_options.append((impact * effect, effect, mechanic, source))

    selected = (
        sorted(
            support_options,
            key=lambda item: (-item[0], -item[1], item[2], item[3].instance_id),
        )[0]
        if support_options
        else None
    )
    amp_source = targeting_source = overclock_source = None
    amp = targeting = overclock = 0.0
    if selected is not None:
        _, effect, mechanic, source = selected
        if mechanic == "amplifier":
            amp_source, amp = source, effect
        elif mechanic == "targeting_computer":
            targeting_source, targeting = source, effect
        else:
            overclock_source, overclock = source, effect
    damage = (1 + .15 * amp) * (1 + .20 * overclock)
    cooldown = max(.65, 1 - .15 * targeting) * max(.65, 1 - .20 * overclock)
    contributions = []
    if amp_source is not None:
        contributions.append({
            "source_module_id": amp_source.instance_id,
            "contribution_kind": "attack_boost",
            "value": .15 * amp * 100,
        })
    if targeting_source is not None:
        contributions.append({
            "source_module_id": targeting_source.instance_id,
            "contribution_kind": "cooldown_reduction",
            "value": (1 - max(.65, 1 - .15 * targeting)) * 100,
        })
    if overclock_source is not None:
        contributions.append({
            "source_module_id": overclock_source.instance_id,
            "contribution_kind": "attack_boost",
            "value": .20 * overclock * 100,
        })
    return AttackSupportModifiers(
        damage_multiplier=damage,
        cooldown_multiplier=cooldown,
        amplifier_active=bool(amp),
        targeting_active=bool(targeting),
        overclock_active=bool(overclock),
        contributions=tuple(contributions),
    )

def repair_amount(repair_module):
    multiplier=repair_module.definition.effect_multiplier
    if repair_module.position is not None:
        multiplier*=float(
            get_cell_effects(repair_module.position).get("repair_multiplier",1.0)
        )
    return max(1,int(round(BASE_REPAIR_AMOUNT*multiplier)))

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
    topology=build_energy_topology(player,core_position)
    return [
        m
        for m in _neighbors(cooler_module,topology,player)
        if m.heat > 0 and module_is_operational(m)
    ]

def overclock_targets(player, overclock_module, core_position):
    topology=build_energy_topology(player,core_position)
    return [
        m for m in _neighbors(overclock_module,topology,player)
        if m.definition.category=="saldırı" and module_is_operational(m)
    ]


def repair_cleanse_target(player, repair_module, core_position):
    topology = build_energy_topology(player, core_position)
    candidates = []

    for module in _neighbors(repair_module, topology, player):
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
    topology = build_energy_topology(player, core_position)
    results = []

    for module in _neighbors(cooler_module, topology, player):
        for effect_id in COOLER_REDUCIBLE_DEBUFFS:
            if effect_id in module.debuffs:
                results.append((module, effect_id))
                break

    return sorted(
        results,
        key=lambda item: item[0].instance_id,
    )
