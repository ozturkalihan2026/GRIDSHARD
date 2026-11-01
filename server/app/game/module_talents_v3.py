"""Talents for the active roster: improve the existing job, never add a quota.

The former rarity thresholds and dual-currency costs are imported unchanged.
Parameters returned here are shared by collection previews and live combat.
"""
from copy import deepcopy
from .talents import TALENT_LEVELS, talent_cost
from ..module_roster import MODULE_SPECS
import json
from pathlib import Path
V7=json.loads((Path(__file__).resolve().parents[2]/'data/module_talents_v7.json').read_text(encoding='utf8'))

CHOICES=('power','resilience')


def option(tr,en,description,en_description,**changes):
    return {'name_tr':tr,'name_en':en,'description_tr':description,'description_en':en_description,'changes':changes}


PRIMARY={
 'shield':('block_ratio','Blok gücü','Block strength'), 'armor':('reduction','Zırh etkisi','Armor effect'),
 'barrier':('healing_received_multiplier','Alınan onarım','Received repair'),
 'reflector':('reflect_ratio','Yansıma','Reflection'), 'guardian_dome':('guard_ratio','Dost koruması','Ally guard'),
 'phase_armor':('phase_ms','Faz süresi','Phase duration'), 'buffer_shield':('shield_hp','Kalkan CAN','Shield HP'),
 'last_bastion':('core_shield_hp','Çekirdek kalkanı','Core shield'), 'repair':('heal','Onarım','Repair'),
 'amplifier':('shot_bonus','Atış bonusu','Shot bonus'), 'emp':('duration_ms','Kesinti süresi','Interruption duration'),
 'virus':('interval_penalty','Yavaşlatma','Slow'), 'speed_relay':('next_interval_reduction','Hız yükü','Haste charge'),
}

# Keep import/API/paid-choice IDs stable while the authoritative definitions
# move to V7. These are runtime data, never imported from the design documents.
SPECIALIZATIONS={key:tuple(deepcopy(value['specializations'])) for key,value in V7['modules'].items()}


def primary_copy(module_id,percent):
    spec=MODULE_SPECS[module_id]
    if spec['category']=='saldırı':tr,en='Hasar','Damage'
    elif module_id=='cleanser':
        return option(f'Dolum −%{percent}',f'Recharge −{percent}%',f'Arındırma aralığını %{percent} kısaltır.',f'Reduces cleanse interval by {percent}%.')
    else:_,tr,en=PRIMARY[module_id]
    return option(f'{tr} +%{percent}',f'{en} +{percent}%',f'{tr} değerini %{percent} artırır.',f'Increases {en.lower()} by {percent}%.')


def tree(module_id):
    spec=MODULE_SPECS[module_id];rarity=spec['rarity']
    hp=lambda n:option(f'CAN +%{n}',f'HP +{n}%',f'Azami CAN’ı %{n} artırır.',f'Increases maximum HP by {n}%.')
    tuning=option('Dolum −%4','Recharge −4%','Atış veya eylem çevrimini %4 kısaltır.','Reduces firing or action interval by 4%.') if spec['cooldown_ms'] else primary_copy(module_id,4)
    pairs=((primary_copy(module_id,3),hp(5)),SPECIALIZATIONS[module_id],(tuning,hp(5)),(primary_copy(module_id,6),hp(8)))
    kinds=('basic','signature','tuning','mastery')
    return tuple({'tier':str(i),'level':level,'kind':kinds[i],**talent_cost(rarity,i),
                  'choices':[{'id':choice,**{k:v for k,v in deepcopy(item).items() if k!='changes'}} for choice,item in zip(CHOICES,pairs[i])]}
                 for i,level in enumerate(TALENT_LEVELS[rarity]))


def effective_stats(module_id,stats,selections):
    if module_id not in MODULE_SPECS:return stats
    result=dict(stats);parameters=deepcopy(MODULE_SPECS[module_id]['parameters']);picks=dict(selections or {})
    def power(percent):
        factor=1+percent/100
        if MODULE_SPECS[module_id]['category']=='saldırı':
            result['base_damage']*=factor
            if 'charged_damage' in parameters:parameters['charged_damage']*=factor
        elif module_id=='cleanser':result['cooldown_ms']*=1-percent/100
        else:
            key=PRIMARY[module_id][0];parameters[key]=parameters.get(key,1.0)*factor
    if picks.get('1') in CHOICES:
        changes=SPECIALIZATIONS[module_id][CHOICES.index(picks['1'])]['changes']
        aliases={'damage':'base_damage','hp':'max_hp','period_ms':'cooldown_ms'}
        for key,value in changes.get('set',{}).items():
            if key in aliases:result[aliases[key]]=value*(result['effect_multiplier'] if key in {'damage','hp'} else 1)
            else:parameters[key]=deepcopy(value)
        for key,value in changes.get('multiply',{}).items():
            if key in aliases:result[aliases[key]]*=value
            else:parameters[key]=parameters.get(key,1)*value
    for tier,percent in (('0',3),('3',6)):
        if picks.get(tier)=='power':power(percent)
    if picks.get('0')=='resilience':result['max_hp']*=1.05
    if picks.get('3')=='resilience':result['max_hp']*=1.08
    if picks.get('2')=='power':
        if result['cooldown_ms']:result['cooldown_ms']*=.96
        else:power(4)
    if picks.get('2')=='resilience':result['max_hp']*=1.05
    if module_id=='last_bastion':
        factor=1
        for tier,percent in (('0',3),('2',4),('3',6)):
            if picks.get(tier)=='power':factor*=1+percent/100
        parameters['ally_shield_total']*=factor
    cap_fields={'reduction':'ordinary_armor_reduction','block_ratio':'periodic_block_ratio','guard_ratio':'dome_guard_ratio',
        'reflect_ratio':'reflection_ratio','phase_ms':'phase_duration_ms','interval_penalty':'virus_interval_penalty',
        'healing_received_penalty':'virus_heal_penalty','shot_bonus':'amplifier_bonus','next_interval_reduction':'speed_reduction'}
    for field,cap in cap_fields.items():
        if field in parameters:parameters[field]=min(parameters[field],V7['caps'][cap])
    if module_id=='emp':parameters['duration_ms']=min(parameters['duration_ms'],V7['caps']['emp_duration_ms'])
    if module_id=='phase_armor':parameters['phase_ms']=min(parameters['phase_ms'],result['cooldown_ms']*V7['caps']['phase_max_duty_ratio'])
    result['max_hp']=round(result['max_hp']);result['base_damage']=round(result['base_damage'],2)
    result['cooldown_ms']=max(0,round(result['cooldown_ms']))
    result['parameters']=parameters
    return result


if set(SPECIALIZATIONS)!=set(MODULE_SPECS):
    raise ValueError('Her aktif modülün iki uzmanlığı tanımlanmalı.')
