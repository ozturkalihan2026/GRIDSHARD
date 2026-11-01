"""Visible values derived from the same parameter source as the main battle."""
from ..module_roster import MODULE_SPECS

LABELS={
 'windup_ms':('Hazırlık','Windup','seconds'),
 'kept_reduction':('Savunmayı delme','Defense penetration','percent'),
 'every_hits':('Güçlü isabet','Charged hit','count'),
 'charged_damage':('Güçlü atış hasarı','Charged shot damage','damage'),
 'shots':('Serideki mermi','Shots in burst','count'),
 'spacing_ms':('Seri aralığı','Burst spacing','seconds'),
 'block_ratio':('Engellenen hasar','Damage blocked','percent'),
 'reduction':('Hasar azaltma','Damage reduction','percent'),
 'reflect_ratio':('Yansıtılan hasar','Damage reflected','percent'),
 'guard_ratio':('Dost koruması','Ally protection','percent'),
 'phase_ms':('Faz süresi','Phase duration','seconds'),
 'shield_hp':('CAN kalkanı','Shield HP','hp'),
 'core_shield_hp':('Çekirdek kalkanı','Core shield','hp'),
 'duration_ms':('Etki süresi','Effect duration','seconds'),
 'heal':('Onarım','Repair','hp'),
 'shot_bonus':('Atış güçlendirme','Shot bonus','percent'),
 'interval_penalty':('Yavaşlatma','Slow','percent'),
 'next_interval_reduction':('Bekleme kısaltma','Cooldown reduction','percent'),
 'recovery_ms':('Kesinti koruması','Control recovery','seconds'),
 'healing_received_multiplier':('Alınan onarım','Received repair','percent'),
 'followup_ratio':('Takip hasarı','Follow-up damage','percent'),
 'followup_delay_ms':('Takip gecikmesi','Follow-up delay','seconds'),
 'dot_per_tick_ratio':('İz / saniye','DOT per second','percent'),
 'dot_ticks':('İz darbesi','DOT ticks','count'),
 'dot_step_ms':('İz darbe aralığı','DOT interval','seconds'),
 'echo_per_target_ratio':('Yankı / hedef sınırı','Echo per-target cap','percent'),
 'echo_total_ratio':('Toplam yankı havuzu','Total echo budget','percent'),
 'shield_strip_ratio':('Ek kalkan silme','Extra shield removal','percent'),
 'absorb_ratio':('İsabette emilim','Per-hit absorption','percent'),
 'heal_conversion_ratio':('Emilimden onarım','Absorption to repair','percent'),
 'ally_shield_total':('Toplam dost kalkanı','Total allied shield','hp'),
 'ally_shield_duration_ms':('Dost kalkanı süresi','Allied shield duration','seconds'),
 'healing_received_penalty':('Onarım baskısı','Repair penalty','percent'),
 'cleanse_control_guard_ms':('Arındırma koruması','Cleanse ward duration','seconds'),
 'cleanse_control_duration_reduction':('Kontrol süresi','Control duration','percent'),
}


def cycle_label(definition):
    if definition.cooldown_ms<=0:return ('','')
    return ('ATIŞ','FIRING') if definition.category=='saldırı' else ('DOLUM','RECHARGE')


def module_specials(definition,stats):
    spec=MODULE_SPECS.get(definition.id)
    if not spec:return []
    result=[]
    for key,value in stats.get('parameters',spec['parameters']).items():
        if key=='secondary_ratios':
            result.extend({'key':f'secondary_{i+1}','label_tr':f'Ek hedef {i+1}','label_en':f'Extra target {i+1}',
                           'value':round(ratio*100,2),'unit':'percent'} for i,ratio in enumerate(value))
            continue
        if key not in LABELS:continue
        tr,en,unit=LABELS[key]
        if key=='kept_reduction':value=1-value
        if key=='healing_received_multiplier':value-=1
        if unit=='percent':value=round(value*100,2)
        elif unit=='seconds':value=value/1000
        elif unit in {'hp','damage'}:value=round(value*stats['effect_multiplier'],2)
        result.append({'key':key,'label_tr':tr,'label_en':en,'value':value,'unit':unit})
    return result
