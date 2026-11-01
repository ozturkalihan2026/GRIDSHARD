"""Main-game bot styles using only the active Current-only roster."""
from dataclasses import dataclass,replace
import hashlib
from .catalog import PLAYER_SELECTABLE_MODULE_IDS


@dataclass(slots=True,frozen=True)
class AIArchetype:
    id:str
    name_tr:str
    name_en:str
    description_tr:str
    description_en:str
    battle_pool_ids:tuple[str,...]
    expansion_module_ids:tuple[str,...]=()
    category_bias:tuple[tuple[str,int],...]=()
    attack_foundation_target:int=2
    defense_floor:int=0
    tactics_floor:int=0

    def bias_for(self,category):return dict(self.category_bias).get(category,0)


def style(key,name,deck,bias=()):
    return AIArchetype(key,name,name,'Akım ve boş hücrelere göre devresini kurar.',
        'Builds a circuit using Current and free cells.',tuple(deck),tuple(deck[-2:]),tuple(bias))


BALANCED_AI=style('balanced','Dengeli',('laser','pulse_cannon','shield','armor','repair','amplifier'))
AGGRESSIVE_AI=style('aggressive','Saldırgan',('laser','burst_cannon','pulse_cannon','missile_launcher','armor','speed_relay'),(('saldırı',7),))
DEFENSIVE_AI=style('defensive','Savunmacı',('laser','pulse_cannon','shield','barrier','repair','guardian_dome'),(('savunma',5),))
BALANCED_CONTROL_AI=style('balanced_control','Dengeli Kontrol',('laser','railgun','shield','emp','virus','cleanser'))
BALANCED_ECONOMY_AI=style('balanced_economy','Taktik Denge',('laser','pulse_cannon','armor','buffer_shield','amplifier','speed_relay'))
AI_ARCHETYPES={x.id:x for x in (BALANCED_AI,AGGRESSIVE_AI,DEFENSIVE_AI,BALANCED_CONTROL_AI,BALANCED_ECONOMY_AI)}
for key,base,name,bias in (
 ('fast_pressure',AGGRESSIVE_AI,'Hızlı Baskı',(('saldırı',8),)),
 ('heavy_damage',AGGRESSIVE_AI,'Ağır Hasar',(('saldırı',9),)),
 ('sustain',DEFENSIVE_AI,'Sürdürülebilirlik',(('destek',5),('savunma',3))),
 ('support_chain',BALANCED_AI,'Taktik Zinciri',(('destek',5),('saldırı',3))),
 ('area_damage',AGGRESSIVE_AI,'Alan Hasarı',(('saldırı',7),)),
 ('counter_meta',BALANCED_CONTROL_AI,'Karşı Meta',(('sabotaj',4),('savunma',2))),
):AI_ARCHETYPES[key]=replace(base,id=key,name_tr=name,category_bias=bias)
# Distinct tactics once those cards are unlocked; early arenas use legal
# replacements from the same role. No style gets a placement-rule exemption.
for key,deck in {
 'fast_pressure':('laser','burst_cannon','drone_bay','barrier','amplifier','speed_relay'),
 'heavy_damage':('pulse_cannon','railgun','missile_launcher','armor','buffer_shield','repair'),
 'sustain':('laser','quantum_repeater','armor','last_bastion','repair','cleanser'),
 'support_chain':('burst_cannon','railgun','shield','buffer_shield','amplifier','speed_relay'),
 'area_damage':('arc_cannon','plasma_mortar','drone_bay','guardian_dome','repair','cleanser'),
 'counter_meta':('shield_breaker','railgun','reflector','phase_armor','emp','virus'),
}.items():AI_ARCHETYPES[key]=replace(AI_ARCHETYPES[key],battle_pool_ids=deck,expansion_module_ids=deck[-2:])
# Visible three-class biases are independent of the preserved target profiles.
for key,x in tuple(AI_ARCHETYPES.items()):
    merged={}
    for category,bias in x.category_bias:
        category='taktik' if category in {'destek','sabotaj','enerji'} else category
        merged[category]=max(merged.get(category,0),bias)
    AI_ARCHETYPES[key]=replace(x,category_bias=tuple(merged.items()))
AI_ARCHETYPE_IDS=tuple(AI_ARCHETYPES)
BOT_ARCHETYPE_IDS={'Dengeli':'balanced','Hızlı Baskı':'fast_pressure','Ağır Hasar':'heavy_damage','Savunma':'defensive',
 'Sürdürülebilirlik':'sustain','Kontrol':'balanced_control','Destek Zinciri':'support_chain','Akım Ekonomisi':'balanced_economy',
 'Alan Hasarı':'area_damage','Karşı Meta':'counter_meta'}
BOT_ARCHETYPE_IDS.update({'Taktik Zinciri':'support_chain','Taktik Denge':'balanced_economy'})
LEGACY_ARCHETYPE_ALIASES={'sabotage':'balanced_control','economy':'balanced_economy'}


def normalize_ai_archetype_id(value):
    key=LEGACY_ARCHETYPE_ALIASES.get(str(value or '').strip().lower(),str(value or '').strip().lower())
    return key if key in AI_ARCHETYPES else 'balanced'


def get_ai_archetype(value):return AI_ARCHETYPES[normalize_ai_archetype_id(value)]


def select_ai_archetype_for_key(key):
    digest=hashlib.sha256(str(key).encode()).digest()
    return AI_ARCHETYPES[AI_ARCHETYPE_IDS[digest[0]%len(AI_ARCHETYPE_IDS)]]


def validate_ai_archetype_catalog():
    for x in AI_ARCHETYPES.values():
        if len(x.battle_pool_ids)!=6 or len(set(x.battle_pool_ids))!=6:raise ValueError('Bot destesi altı farklı kart olmalı.')
        if not set(x.battle_pool_ids)<=set(PLAYER_SELECTABLE_MODULE_IDS):raise ValueError('Bot aktif olmayan kartı kullanamaz.')


validate_ai_archetype_catalog()
