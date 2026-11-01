"""The approved 24-card, Current-only game. Retired cards have no live definition."""
from ..module_roster import MODULE_SPECS
from .models import ModuleDefinition
from .core_stats import CORE_BASE_HP

BASIC_MODULE_DEFINITIONS={'core':ModuleDefinition(id='core',name_tr='Çekirdek',category='çekirdek',
    combat_class='çekirdek',max_hp=CORE_BASE_HP,strategic_role='Devrenin merkezi',description_tr='Koruman gereken devre merkezi.')}
for key,m in MODULE_SPECS.items():
    BASIC_MODULE_DEFINITIONS[key]=ModuleDefinition(
        id=key,name_tr=m['name_tr'],category=m['legacy_target_category'],combat_class=m['category'],
        max_hp=m['max_hp'],rarity=m['rarity'],current_cost=m['current_cost'],
        strategic_role=m['one_job'],description_tr=m['one_job'],base_damage=m['base_damage'],
        cooldown_ms=m['cooldown_ms'],signature_mechanic=m['rarity_signature'],
        telegraph_tr=m['visible_feedback'],counterplay_tr=m['counterplay'],
        strong_against=('shield','reflector') if key=='emp' else (),
    )

PLAYER_SELECTABLE_MODULE_IDS=tuple(MODULE_SPECS)
CARD_COPY={key:(m['one_job'],m['one_job']) for key,m in MODULE_SPECS.items()}
SIGNATURE_MECHANICS={key:m['rarity_signature'] for key,m in MODULE_SPECS.items()}
COUNTERPLAY_TR={key:m['counterplay'] for key,m in MODULE_SPECS.items()}
CANON_MECHANICS={key:key for key in MODULE_SPECS}
def get_module_definition(definition_id):
    try:return BASIC_MODULE_DEFINITIONS[definition_id]
    except KeyError as exc:raise ValueError(f'Bilinmeyen modül tanımı: {definition_id}') from exc


def get_module_definitions_by_category(category):
    return tuple(d for d in BASIC_MODULE_DEFINITIONS.values() if d.combat_class==category)


def get_counter_summary(definition_id):
    d=get_module_definition(definition_id)
    return {'strong_against':d.strong_against,'weak_against':d.weak_against,'synergy_with':d.synergy_with}
