from dataclasses import dataclass
from .board import get_cell_effects
from .heat import heat_generation_multiplier
from .models import BattleModule, ModuleStatus, PlayerBattleState, Position
from .topology import build_energy_topology

REPAIR_COOLDOWN_ID = "support_repair"
BASE_REPAIR_AMOUNT = 15
AMPLIFIER_DAMAGE_MULTIPLIER = 1.15
TARGETING_COOLDOWN_MULTIPLIER = 0.85
OVERCLOCK_DAMAGE_MULTIPLIER = 1.20
OVERCLOCK_COOLDOWN_MULTIPLIER = 0.80
OVERCLOCK_HEAT_PER_TICK = 1.0
COOLER_HEAT_REDUCTION_PER_TICK = 2.0

@dataclass(slots=True, frozen=True)
class AttackSupportModifiers:
    damage_multiplier: float = 1.0
    cooldown_multiplier: float = 1.0
    amplifier_active: bool = False
    targeting_active: bool = False
    overclock_active: bool = False

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
    amp=any(m.definition.id=="amplifier" and m.is_powered for m in neighbors)
    targeting=any(m.definition.id=="targeting_computer" and m.is_powered for m in neighbors)
    overclock=any(m.definition.id=="overclock_unit" and m.is_powered for m in neighbors)
    damage=1.0
    cooldown=1.0
    if amp: damage*=AMPLIFIER_DAMAGE_MULTIPLIER
    if targeting: cooldown*=TARGETING_COOLDOWN_MULTIPLIER
    if overclock:
        damage*=OVERCLOCK_DAMAGE_MULTIPLIER
        cooldown*=OVERCLOCK_COOLDOWN_MULTIPLIER
    return AttackSupportModifiers(damage,cooldown,amp,targeting,overclock)

def repair_amount(repair_module):
    multiplier=1.0
    if repair_module.position is not None:
        multiplier*=float(
            get_cell_effects(repair_module.position).get("repair_multiplier",1.0)
        )
    return max(1,int(round(BASE_REPAIR_AMOUNT*multiplier)))

def repair_target(player, repair_module, core_position):
    topology=build_energy_topology(player,core_position)
    candidates=[
        m for m in _neighbors(repair_module,topology,player)
        if m.hp>0 and m.hp<m.definition.max_hp
    ]
    if not candidates: return None
    return sorted(
        candidates,
        key=lambda m:(m.hp/m.definition.max_hp,m.instance_id)
    )[0]

def cooler_targets(player, cooler_module, core_position):
    topology=build_energy_topology(player,core_position)
    return [m for m in _neighbors(cooler_module,topology,player) if m.heat>0]

def overclock_targets(player, overclock_module, core_position):
    topology=build_energy_topology(player,core_position)
    return [
        m for m in _neighbors(overclock_module,topology,player)
        if m.definition.category=="saldırı" and m.status==ModuleStatus.ACTIVE
    ]
