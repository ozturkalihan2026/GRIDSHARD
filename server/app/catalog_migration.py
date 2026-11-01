"""Idempotent v2 collection migration, applied inside normal profile persistence.

No player files are opened here. Signed balances keep premium refund debt intact.
Historical transaction receipts are never rewritten.
"""
from copy import deepcopy
from .module_roster import RETIRED_MODULE_IDS, MODULE_SPECS
from .game.battle_pool import migrate_battle_pool

V7_CHANGED=frozenset({'missile_launcher','drone_bay','arc_cannon','plasma_mortar','quantum_repeater','shield_breaker',
    'reflector','buffer_shield','last_bastion','repair','virus','cleanser'})

def grant_v7_reselection(profile):
    archive=profile.retired_rules_archive
    if archive.get('module_v7_migrated'):return False
    archive['module_v7_reselection']={key:{'available':True,'paid_tiers':list(picks),'free_tiers':[]} for key,picks in profile.module_talents.items() if key in V7_CHANGED and picks}
    archive['module_v7_migrated']=True
    return True


def restore_active_module_talents(profile):
    """Reattach paid choices once; a later paid reset must stay reset."""
    archive=profile.retired_rules_archive
    if archive.get('module_talents_v3_restored'):return False
    for key,picks in archive.get('module_talents',{}).items():
        if key not in MODULE_SPECS or not isinstance(picks,dict):continue
        valid={str(tier):choice for tier,choice in picks.items()
               if str(tier) in {'0','1','2','3'} and choice in {'power','resilience'}}
        if valid:
            current=profile.module_talents.setdefault(key,{})
            for tier,choice in valid.items():current.setdefault(tier,choice)
    archive['module_talents_v3_restored']=True
    return True


def restore_core_talents_v5(profile):
    archive=profile.retired_rules_archive
    if archive.get('core_talents_v5_restored'):return False
    from .game.core_balance import CORE_ROLES_V5
    valid={f'{tier}_{slot}' for tier in range(3) for slot in ('energy','charge')}
    for core,skills in archive.get('core_skills',{}).items():
        if core not in CORE_ROLES_V5 or not isinstance(skills,(list,tuple)):continue
        current=list(profile.core_skills.get(core,()))
        tiers={x.split('_')[0] for x in current}
        for skill in skills:
            if skill in valid and skill.split('_')[0] not in tiers:
                current.append(skill);tiers.add(skill.split('_')[0])
        if current:profile.core_skills[core]=tuple(current)
    archive['core_talents_v5_restored']=True
    return True


def migrate_profile_roster(profile):
    old_revision = profile.module_roster_revision
    retiring = RETIRED_MODULE_IDS & (profile.module_shards.keys() | profile.module_upgrade_levels.keys())
    if old_revision >= 2 and not retiring:
        changed=restore_active_module_talents(profile)
        changed=restore_core_talents_v5(profile) or changed
        return grant_v7_reselection(profile) or changed
    archive = profile.retired_module_archive
    transferred = 0
    for key in sorted(retiring):
        entry = archive.setdefault(key, {})
        amount = int(profile.module_shards.pop(key, 0))
        transferred += amount
        entry['shards_converted_1_to_1'] = int(entry.get('shards_converted_1_to_1', 0)) + amount
        if key in profile.module_upgrade_levels:
            entry['upgrade_level'] = profile.module_upgrade_levels.pop(key)
        entry['retired_in_revision'] = 2
    profile.universal_module_shards += transferred
    if old_revision < 2:
        profile.retired_rules_archive = {
            **profile.retired_rules_archive,
            'module_talents': deepcopy(profile.module_talents),
            'core_skills': deepcopy(profile.core_skills),
            'preferred_battle_pool_ids': list(profile.preferred_battle_pool_ids),
            'converted_shards': transferred,
            'migration': 'akim_24_v2',
        }
        profile.module_talents.clear()
        profile.core_skills.clear()
    for key in MODULE_SPECS:
        profile.module_shards.setdefault(key, 0)
    profile.preferred_battle_pool_ids = migrate_battle_pool(profile.preferred_battle_pool_ids).module_definition_ids
    profile.module_roster_revision = 2
    restore_active_module_talents(profile)
    restore_core_talents_v5(profile)
    grant_v7_reselection(profile)
    return True


def award_module_shards(profile, module_id, amount):
    """Late historical rewards use the same approved 1:1 retirement policy."""
    if module_id in RETIRED_MODULE_IDS:
        profile.universal_module_shards += int(amount)
    elif module_id in MODULE_SPECS:
        profile.module_shards[module_id] = int(profile.module_shards.get(module_id, 0)) + int(amount)
    else:
        raise ValueError('Bilinmeyen modül ödülü.')
