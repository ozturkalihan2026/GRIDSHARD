"""Public catalog: exactly the three player-facing classes and no energy/heat."""
from .catalog import BASIC_MODULE_DEFINITIONS
from .module_sheet import module_specials
from ..module_roster import MODULE_SPECS

CATEGORY_ORDER=('saldırı','savunma','taktik')
CATEGORY_LABELS={'saldırı':'Saldırı','savunma':'Savunma','taktik':'Taktik','çekirdek':'Çekirdek'}
CATEGORY_LABELS_EN={'saldırı':'Attack','savunma':'Defense','taktik':'Tactics','çekirdek':'Core'}
MODULE_COPY_EN={
 'laser':('Steady fire','Fires steadily at its target.'),
 'pulse_cannon':('Heavy pulse','Shows its preparation and fires one heavy shot.'),
 'railgun':('Armor penetration','Fires a shot that bypasses part of armor reduction.'),
 'missile_launcher':('Locked missile','Locks on visibly before firing a heavy missile.'),
 'drone_bay':('Distributed drones','Sends small drone attacks to two targets.'),
 'arc_cannon':('Chained arc','Jumps electricity to the next priority target.'),
 'plasma_mortar':('Plasma spread','After a long windup, spreads plasma to three targets.'),
 'quantum_repeater':('Fourth hit','Every fourth hit on the same target is stronger.'),
 'burst_cannon':('Triple burst','Fires three small rounds at the same target.'),
 'shield_breaker':('Block penetration','Fires a shot that bypasses periodic single-hit blocks.'),
 'shield':('Personal block','Blocks part of one incoming hit and recharges.'),
 'armor':('Personal armor','Continuously reduces its own incoming damage.'),
 'barrier':('Priority tank','Uses the established target priority to draw enemy fire.'),
 'reflector':('Return hit','Returns part of one incoming hit to its attacker.'),
 'guardian_dome':('Ally guard','Blocks part of one hit aimed at another ally.'),
 'phase_armor':('Phase window','Periodically becomes untouchable for a short time.'),
 'buffer_shield':('Temporary shield','Gives temporary shield HP to the ally under fire.'),
 'last_bastion':('Core safeguard','When destroyed, tops up the core shield.'),
 'repair':('Regeneration','Repairs a wounded ally over 3 seconds; regeneration does not stack on one target.'),
 'amplifier':('Shot charge','Charges one allied weapon for a stronger next shot.'),
 'emp':('Short interruption','Briefly pauses one enemy using its established target preference.'),
 'virus':('Slowing virus','Briefly lengthens one enemy module action interval.'),
 'cleanser':('Cleanse','Removes one negative effect from one ally.'),
 'speed_relay':('Reload charge','Shortens the cooldown after one allied weapon next shot.'),
}


def build_module_catalog_view():
    modules=[]
    for key,m in MODULE_SPECS.items():
        d=BASIC_MODULE_DEFINITIONS[key];en=MODULE_COPY_EN[key]
        modules.append({'id':key,'name_tr':d.name_tr,'category':d.combat_class,
            'category_label':CATEGORY_LABELS[d.combat_class],'category_label_en':CATEGORY_LABELS_EN[d.combat_class],
            'max_hp':d.max_hp,'current_cost':d.current_cost,'base_damage':d.base_damage,'cooldown_ms':d.cooldown_ms,
            'strategic_role':d.strategic_role,'strategic_role_en':en[0],'description_tr':d.description_tr,'description_en':en[1],
            'strong_against':[],'weak_against':[],'synergy_with':[],
            'effect_lines':[m['one_job'],m['candidate_effect']], 'effect_lines_en':[en[1]],
            'rarity':d.rarity,'signature_mechanic':d.signature_mechanic,'telegraph_tr':d.telegraph_tr,
            'counterplay_tr':d.counterplay_tr})
    return {'ruleset':'akim_24_v2','category_order':list(CATEGORY_ORDER),'category_labels':CATEGORY_LABELS,
            'category_labels_en':CATEGORY_LABELS_EN,'modules':modules,
            'battle_rules':{'energy':False,'heat':False,'copy_limit':None,'class_limit':None,'target_selection':'preserved',
                'damage_current':{'threshold':100,'defense_hp_threshold':50,'condition':'both','bonus':1,'min_interval_ms':0,'passive_interval_ms':3000,'starting':7,'cap':12,'passive_regen_preserved':True,'healing_farm':False,'reflection_income':False}}}
