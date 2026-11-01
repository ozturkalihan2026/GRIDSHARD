"""Authoritative Current-only actions for the main 24-module game.

Uses the established random placement and target selector. No energy, heat,
rarity power multipliers, composition quotas or elapsed-time damage pressure.
"""
from .models import ModuleStatus, TimedModuleEffect
from .combat import select_target, selectable_targets
from .sabotage import select_sabotage_target
from .operations import module_is_operational
from ..module_roster import MODULE_SPECS


def live(player,core=True):
    return [u for u in player.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0 and (core or u.definition.id!='core')]


def working(player):
    return [u for u in live(player,False) if module_is_operational(u)]


def params(unit):return unit.definition.runtime_parameters if unit.definition.runtime_parameters is not None else MODULE_SPECS.get(unit.definition.id,{}).get('parameters',{})
def ready(e,side,u,key='action'):return e.is_cooldown_ready(side,u.instance_id,key)


def cadence_anchor(e,u,key):
    prior=u.mechanic_state.get('v3_cycle_deadlines',{}).get(key,e.state.elapsed_ms)
    return prior if 0<=e.state.elapsed_ms-prior<100 else e.state.elapsed_ms


def restart(e,side,u,key='action',period=None,anchor_at_ms=None):
    duration=u.definition.cooldown_ms if period is None else period
    if 'virus' in u.debuffs:duration=round(duration*float(u.debuffs['virus'].data.get('interval_multiplier',1.25)))
    # Preserve sub-tick cadence: a 4% speed talent must cause real extra actions,
    # rather than rounding every 960ms laser cycle back up to 1000ms forever.
    deadlines=u.mechanic_state.setdefault('v3_cycle_deadlines',{})
    anchor=cadence_anchor(e,u,key) if anchor_at_ms is None else anchor_at_ms
    deadline=anchor+max(100,duration);deadlines[key]=deadline
    e.start_cooldown(side,u.instance_id,key,max(1,deadline-e.state.elapsed_ms))


def emit_effect(e,side,source,target,kind,value,unit='hp'):
    e._emit('module_contribution',{'player_id':side,'source_player_id':side,'source_module_id':source.instance_id,
        'target_player_id':target[0],'target_module_id':target[1].instance_id,'category':source.definition.combat_class,
        'contribution_kind':kind,'value':round(value,2),'unit':unit})


def heal(e,side,source,target,amount,core=False,*,budget_cap=None):
    if target.hp<=0 or target.status==ModuleStatus.DESTROYED:return 0
    virus=target.debuffs.get('virus')
    penalty=virus.data.get('healing_received_penalty',0) if virus and not virus.is_expired(e.state.elapsed_ms) else 0
    exact=amount*params(target).get('healing_received_multiplier',1)*(1-penalty)+target.mechanic_state.get('v4_heal_fraction',0)
    amount=round(exact)
    if budget_cap is not None:
        exact=min(exact,budget_cap);amount=min(amount,budget_cap)
    target.mechanic_state['v4_heal_fraction']=exact-amount
    actual=min(max(0,int(amount)),target.definition.max_hp-target.hp)
    if actual<amount:target.mechanic_state['v4_heal_fraction']=0
    if actual<=0:return 0
    before=target.hp;target.hp+=actual
    e._emit('module_repaired',{'player_id':side,'source_module_id':source.instance_id,
        'target_module_id':target.instance_id,'module_id':target.instance_id,'repair':actual,
        'hp_before':before,'hp_after':target.hp,'core':core})
    return actual


def shield(e,side,source,target,amount,duration=5000,kind='guard'):
    key='v2_shield_'+kind
    old=target.persistent_effects.get(key)
    previous=int(old.data.get('shield_hp',0)) if old and not old.is_expired(e.state.elapsed_ms) else 0
    value=max(int(amount),previous)
    target.persistent_effects[key]=TimedModuleEffect(key,'CAN Kalkanı',e.state.elapsed_ms+duration if duration else None,
        {'shield_hp':value,'source_module_id':source.instance_id,'core_power':e.state.players[side].core_type if source.definition.id=='core' else None})
    if kind=='buffer':
        if previous>=amount and old:
            target.persistent_effects[key].data=dict(old.data)
        else:
            target.persistent_effects[key].data.update(absorb_ratio=params(source).get('absorb_ratio',.7),conversion_ratio=params(source).get('heal_conversion_ratio',.4),conversion_fraction=0)
    e._emit('core_effect_applied',{'player_id':side,'source_module_id':source.instance_id,
        'target_player_id':side,'target_module_id':target.instance_id,'effect_kind':'defense','value':value-previous,'unit':'hp'})
    return value-previous


def apply_damage(e,side,uid,amount,source_player_id=None,source_module_id=None,ignore_shields=False):
    if amount<0:raise ValueError('Hasar negatif olamaz.')
    u=e._require_module(side,uid)
    if u.status==ModuleStatus.DESTROYED:return 0
    remaining=int(amount);conversions=[]
    for key,effect in sorted(u.persistent_effects.items(),key=lambda p:p[1].expires_at_ms or float('inf')):
        if ignore_shields:break
        if not key.startswith('v2_shield_') or effect.is_expired(e.state.elapsed_ms):continue
        absorbed=min(int(remaining*effect.data.get('absorb_ratio',1)),int(effect.data.get('shield_hp',0)))
        effect.data['shield_hp']-=absorbed;remaining-=absorbed
        if absorbed and key=='v2_shield_buffer':conversions.append((effect,absorbed))
        if absorbed and effect.data.get('core_power'):
            from .core_impact import record
            record(e,side,'damage_blocked',absorbed,side,uid)
        if absorbed:e._emit('module_contribution',{'player_id':side,'source_module_id':effect.data.get('source_module_id'),
            'target_player_id':side,'target_module_id':uid,'category':'savunma','contribution_kind':'damage_blocked','value':absorbed,'unit':'hp'})
    applied=min(u.hp,remaining);u.hp-=applied
    if applied:
        from .pressure_current import credit_received_damage
        credit_received_damage(e,side,u,source_player_id,source_module_id,applied)
    e._emit('module_damaged',{'player_id':side,'module_id':uid,'damage':applied,'attempted_damage':amount,
        'hp':u.hp,'source_player_id':source_player_id,'source_module_id':source_module_id})
    if u.hp==0:
        position=u.position;u.status=ModuleStatus.DESTROYED
        debris=None
        if u.definition.id!='core':
            u.position=None
            if position:
                debris=e.state.elapsed_ms+3000
                e.state.players[side].cell_debris_until_ms[e._position_key(position)]=debris
        e._emit('module_destroyed',{'player_id':side,'module_id':uid,'x':position.x if position else None,
            'y':position.y if position else None,'debris_until_ms':debris})
        if u.definition.id=='last_bastion':
            from .module_effects_v7 import bastion_legacy
            bastion_legacy(e,side,u)
    from .module_effects_v7 import buffer_conversion
    for effect,absorbed in conversions:buffer_conversion(e,side,u,effect,absorbed)
    return applied


def hit(e,side,gun,enemy,target,raw,secondary=False,reflect=True,*,piercing=False,damage_kind=None):
    if target.hp<=0:return 0
    target_position={"x":target.position.x,"y":target.position.y} if (gun.definition.id=='core' or damage_kind in {'dot','followup','echo'}) and target.position else None
    damage=float(raw);reduction=0;now=e.state.elapsed_ms;p=params(target)
    damage_kind=damage_kind or ('secondary' if secondary else 'direct')
    direct=damage_kind=='direct';periodic=damage_kind in {'dot','followup'}
    kind=target.definition.id
    if module_is_operational(target):
        if kind=='phase_armor' and now%max(100,target.definition.cooldown_ms)<p['phase_ms']:
            reduction=1
        elif piercing:reduction=0
        elif kind=='core':
            mode=e.state.players[enemy].core_signature_state.get('v5_mode',{})
            if mode.get('kind')=='fortress' and now<mode.get('ends_at_ms',0):reduction=mode['reduction']
        elif kind in {'armor','barrier'}:reduction=p.get('reduction',0)*params(gun).get('kept_reduction',1)
        elif kind=='shield' and not periodic and ready(e,enemy,target,'block') and not params(gun).get('bypass_periodic_block'):
            reduction=p['block_ratio'];restart(e,enemy,target,'block')
    if direct and gun.definition.id=='shield_breaker' and reduction<1:
        strip=max(0,int(raw*params(gun).get('shield_strip_ratio',0)));removed=0
        for key,effect in sorted(target.persistent_effects.items(),key=lambda item:item[1].expires_at_ms or float('inf')):
            if strip<=0:break
            if not key.startswith('v2_shield_') or effect.is_expired(now):continue
            lost=min(strip,int(effect.data.get('shield_hp',0)));effect.data['shield_hp']-=lost;strip-=lost;removed+=lost
        if removed:emit_effect(e,side,gun,(enemy,target),'shield_removed',removed)
    damage*=1-reduction
    quantum=target.persistent_effects.get('v4_quantum_guard')
    if quantum and not quantum.is_expired(now) and quantum.data['hits']>0 and damage>0:
        from .core_impact import record
        quantum.data['hits']-=1
        record(e,enemy,'damage_blocked',round(damage),enemy,target.instance_id)
        damage=0
    domes=sorted((u for u in working(e.state.players[enemy]) if u.definition.id=='guardian_dome'
                  and u.instance_id!=target.instance_id and ready(e,enemy,u,'guard')),key=lambda u:u.instance_id)
    if domes and damage>0 and not piercing and not periodic:
        dome=domes[0];blocked=damage*params(dome)['guard_ratio'];damage-=blocked
        restart(e,enemy,dome,'guard');emit_effect(e,enemy,dome,(enemy,target),'damage_blocked',blocked)
    reflects=reflect and direct and kind=='reflector' and module_is_operational(target) and ready(e,enemy,target,'reflect')
    shields_before=sum(int(v.data.get('shield_hp',0)) for k,v in target.persistent_effects.items() if k.startswith('v2_shield_') and not v.is_expired(now))
    hp_before=target.hp
    damage=max(0,round(damage));actual=e.apply_damage(enemy,target.instance_id,damage,
        source_player_id=side,source_module_id=gun.instance_id,ignore_shields=piercing)
    if side!=enemy and gun.definition.combat_class=='saldırı':
        from .pressure_current import credit_weapon_damage
        credit_weapon_damage(e,side,enemy,target,actual,source=gun)
    if kind=='core' and reduction>0 and not piercing:
        from .core_impact import record
        prevented=max(0,min(hp_before,max(0,round(raw)-shields_before))-min(hp_before,max(0,damage-shields_before)))
        record(e,enemy,'damage_blocked',prevented,enemy,target.instance_id)
    e._emit('attack_performed',{'attacker_player_id':side,'attacker_module_id':gun.instance_id,
        'target_player_id':enemy,'target_module_id':target.instance_id,'base_damage':round(raw) if gun.definition.id=='core' else gun.definition.base_damage,
        'raw_damage':round(raw),'damage':actual,'reduced_damage':min(round(raw),round(raw*reduction)),
        **({'target_position':target_position} if target_position else {}),
        'core_attack':gun.definition.id=='core','power_id':e.state.players[side].core_type if gun.definition.id=='core' else '',
        'defense_type':kind,'secondary':secondary,'damage_kind':damage_kind,'simultaneous_tick':True,'rarity':gun.definition.rarity,
        'signature':('quantum_echo' if damage_kind=='echo' else 'plasma_dot' if damage_kind=='dot' else 'missile_followup' if damage_kind=='followup' else
                     'quantum_fourth' if gun.definition.id=='quantum_repeater' and direct and ((gun.mechanic_state.get('v2_same_hits',0)+1) if gun.mechanic_state.get('v2_last_target')==target.instance_id else 1)%4==0 else
                     'block_bypass' if gun.definition.id=='shield_breaker' else 'chain' if secondary and gun.definition.id=='arc_cannon' else
                     'area' if secondary and gun.definition.id=='plasma_mortar' else '')})
    if reflects:
        from .module_effects_v7 import budget
        amount=budget(target,'reflection',actual*p['reflect_ratio']);restart(e,enemy,target,'reflect')
        e._emit('damage_reflected',{'source_player_id':enemy,'source_module_id':target.instance_id,
            'target_player_id':side,'target_module_id':gun.instance_id,'damage':amount})
        e.apply_damage(side,gun.instance_id,amount,source_player_id=enemy,source_module_id=target.instance_id)
    if direct:
        from .module_effects_v7 import after_direct_hit
        fourth=False
        if gun.definition.id=='quantum_repeater' and (actual>0 or shields_before>sum(int(v.data.get('shield_hp',0)) for k,v in target.persistent_effects.items() if k.startswith('v2_shield_') and not v.is_expired(now))):
            count=gun.mechanic_state.get('v2_same_hits',0)+1 if gun.mechanic_state.get('v2_last_target')==target.instance_id else 1
            gun.mechanic_state['v2_last_target']=target.instance_id;gun.mechanic_state['v2_same_hits']=count;fourth=count%4==0
        after_direct_hit(e,side,gun,enemy,target,actual,fourth)
    return actual


def support_actions(e,side,enemy):
    player=e.state.players[side]
    for u in sorted(working(player),key=lambda u:u.instance_id):
        key=u.definition.id
        if not ready(e,side,u):continue
        target=None
        if key=='repair':
            targets=[v for v in live(player,False) if v is not u and v.hp<v.definition.max_hp and 'v4_repair' not in v.persistent_effects]
            target=min(targets,key=lambda v:(v.hp/v.definition.max_hp,v.instance_id)) if targets else None
            if target:
                total=round(params(u)['heal']*u.definition.effect_multiplier);first=round(total*params(u).get('heal_pulse_weights',[1/3,1/3,1/3])[0]);duration=params(u).get('duration_ms',3000)
                heal(e,side,u,target,first)
                target.persistent_effects['v4_repair']=TimedModuleEffect('v4_repair','Yenilenme',e.state.elapsed_ms+duration,
                    {'source_module_id':u.instance_id,'remaining_hp':total-first,'ticks':2,'next_ms':e.state.elapsed_ms+duration//3,'step_ms':duration//3})
        elif key in {'amplifier','speed_relay'}:
            charge='v2_damage_charge' if key=='amplifier' else 'v2_speed_charge'
            guns=[v for v in working(player) if v.definition.category=='saldırı' and not v.mechanic_state.get(charge)]
            target=max(guns,key=lambda v:(v.definition.base_damage,-len(v.instance_id))) if guns else None
            if target:
                target.mechanic_state[charge]={'value':params(u).get('shot_bonus',params(u).get('next_interval_reduction')),
                    'source':u.instance_id}
                e._emit('amplifier_pulse',{'player_id':side,'module_id':u.instance_id,'charged_module_ids':[target.instance_id]})
        elif key=='buffer_shield':
            target=select_target(player)
            if target:shield(e,side,u,target,round(params(u)['shield_hp']*u.definition.effect_multiplier),params(u)['duration_ms'],'buffer')
        elif key=='cleanser':
            targets=[v for v in live(player) if v.debuffs]
            target=min(targets,key=lambda v:('core_execution' not in v.debuffs,v.hp/v.definition.max_hp,v.instance_id)) if targets else None
            if target:
                from .module_effects_v7 import CLEANSE_ORDER
                effect=min(target.debuffs,key=lambda k:(CLEANSE_ORDER.index(k) if k in CLEANSE_ORDER else len(CLEANSE_ORDER),k));target.debuffs.pop(effect,None)
                if params(u).get('cleanse_control_guard_ms'):
                    until=e.state.elapsed_ms+params(u)['cleanse_control_guard_ms'];old=target.persistent_effects.get('v7_cleanse_guard')
                    target.persistent_effects['v7_cleanse_guard']=TimedModuleEffect('v7_cleanse_guard','Kontrol koruması',max(until,old.expires_at_ms if old else 0),{'reduction':params(u)['cleanse_control_duration_reduction']})
                e._emit('module_debuff_removed',{'player_id':side,'module_id':target.instance_id,'target_module_id':target.instance_id,'source_module_id':u.instance_id,'effect_id':effect})
        elif key in {'emp','virus'}:
            target=select_sabotage_target(u,e.state.players[enemy],elapsed_ms=e.state.elapsed_ms)
            if target:
                duration=params(u)['duration_ms'];effect='emp_disabled' if key=='emp' else 'virus'
                from .module_effects_v7 import control_duration
                duration=control_duration(e,target,effect,duration)
                target.debuffs[effect]=TimedModuleEffect(effect,'Kesinti' if key=='emp' else 'Yavaşlama',e.state.elapsed_ms+duration,
                    {'source_module_id':u.instance_id,'interval_multiplier':1+params(u)['interval_penalty'] if key=='virus' else 1,'healing_received_penalty':params(u).get('healing_received_penalty',0)})
                if key=='emp':
                    target.mechanic_state['control_recovery_until_ms']=e.state.elapsed_ms+duration+params(u)['recovery_ms']
                    for name in list(target.cooldowns_ready_at_ms):target.cooldowns_ready_at_ms[name]+=duration
                e._emit('sabotage_applied',{'attacker_player_id':side,'attacker_module_id':u.instance_id,
                    'target_player_id':enemy,'target_module_id':target.instance_id,'effect_id':effect,'duration_ms':duration})
        else:continue
        if target:restart(e,side,u)


def tick(e):
    from .module_effects_v7 import tick_delayed
    tick_delayed(e)
    # Expire first: a module resumes on its actual deadline, not one tick late.
    e._expire_timed_module_state()
    from .core_actions_v5 import tick_effects
    tick_effects(e)
    for side,player in e.state.players.items():
        for target in live(player,False):
            pause=target.debuffs.get('emp_disabled')
            if pause and pause.data.get('core_owner') and not pause.is_expired(e.state.elapsed_ms):
                from .core_impact import record
                record(e,pause.data['core_owner'],'control_ms',100,side,target.instance_id,'ms',emit=False)
            effect=target.persistent_effects.get('v4_repair')
            if effect and effect.data['ticks']>0 and e.state.elapsed_ms>=effect.data['next_ms']:
                data=effect.data;source=player.modules.get(data['source_module_id'])
                amount=round(data['remaining_hp']/data['ticks'])
                if source:heal(e,side,source,target,amount)
                data['remaining_hp']-=amount;data['ticks']-=1;data['next_ms']+=data['step_ms']
    for side,player in e.state.players.items():
        for u in working(player):
            if u.definition.id!='phase_armor':continue
            active=e.state.elapsed_ms%max(100,u.definition.cooldown_ms)<params(u)['phase_ms']
            if active!=u.mechanic_state.get('v4_phase_active',False):
                u.mechanic_state['v4_phase_active']=active
                e._emit('module_signature_triggered',{'player_id':side,'source_module_id':u.instance_id,
                    'target_module_id':u.instance_id,'signature':'phase','active':active,'duration_ms':params(u)['phase_ms']})
    sides=sorted(e.state.players)
    for side in sides:
        enemy=next((x for x in sides if x!=side),None)
        if enemy:support_actions(e,side,enemy)
    intents=[]
    for side in sides:
        enemy=next((x for x in sides if x!=side),None)
        if enemy is None:continue
        player=e.state.players[side];opponent=e.state.players[enemy]
        for gun in sorted(working(e.state.players[side]),key=lambda u:u.instance_id):
            if gun.definition.category!='saldırı' or gun.definition.base_damage<=0:continue
            now=e.state.elapsed_ms;target=select_target(opponent)
            if target is None:continue
            burst=gun.mechanic_state.get('v2_burst')
            if burst:
                if now<burst['next']:continue
                previous=opponent.modules.get(burst['target'])
                if previous is None or previous.hp<=0:
                    gun.mechanic_state.pop('v2_burst',None);continue
                target=previous;burst['remaining']-=1;burst['next']+=params(gun)['spacing_ms']
                if not burst['remaining']:gun.mechanic_state.pop('v2_burst',None)
            else:
                if not ready(e,side,gun,'attack'):continue
                windup=params(gun).get('windup_ms',0)
                fired_at_ms=None
                if windup:
                    preparation=gun.mechanic_state.get('v2_windup')
                    if not preparation or preparation['target']!=target.instance_id:
                        gun.mechanic_state['v2_windup']={'target':target.instance_id,'ready':cadence_anchor(e,gun,'attack')+windup}
                        e._emit('attack_windup_started',{'player_id':side,'module_id':gun.instance_id,
                            'target_player_id':enemy,'target_module_id':target.instance_id,'windup_ms':windup})
                        continue
                    if now<preparation['ready']:continue
                    fired_at_ms=preparation['ready'] if now-preparation['ready']<100 else now
                    gun.mechanic_state.pop('v2_windup',None)
                interval=gun.definition.cooldown_ms
                speed=gun.mechanic_state.pop('v2_speed_charge',None)
                if speed:
                    shortened=round(interval*speed['value']);interval-=shortened
                    source=player.modules.get(speed['source'])
                    if source:emit_effect(e,side,source,(side,gun),'cooldown_reduction',shortened/1000,'seconds')
                restart(e,side,gun,'attack',max(100,interval-windup),anchor_at_ms=fired_at_ms)
                if gun.definition.id=='burst_cannon':
                    gun.mechanic_state['v2_burst']={'target':target.instance_id,'remaining':2,'next':now+params(gun)['spacing_ms']}
            raw=gun.definition.base_damage
            if gun.definition.id=='quantum_repeater':
                count=gun.mechanic_state.get('v2_same_hits',0)+1 if gun.mechanic_state.get('v2_last_target')==target.instance_id else 1
                if count%4==0:raw=params(gun)['charged_damage']*gun.definition.effect_multiplier
            bonus=gun.mechanic_state.pop('v2_damage_charge',None)
            if bonus:
                gained=raw*bonus['value'];raw+=gained
                source=player.modules.get(bonus['source'])
                if source:emit_effect(e,side,source,(side,gun),'damage_boosted',gained,'damage')
            intents.append((side,gun,enemy,target,raw,False,True))
            others=[v for v in selectable_targets(opponent) if v is not target and v.definition.id!='core']
            for other,ratio in zip(others,params(gun).get('secondary_ratios',())):
                intents.append((side,gun,enemy,other,raw*ratio,True,True))
    for intent in intents:hit(e,*intent)


def charge_cores(e):
    for p in e.state.players.values():
        from .core_actions_v5 import settings
        duration=(20000 if p.core_power_uses==0 else 35000)*settings(p)['charge_multiplier']
        previous=p.core_power_charge;p.core_power_charge=min(100,p.core_power_charge+100*100/duration)
        if p.core_power_charge>99.999:p.core_power_charge=100
        if previous<100<=p.core_power_charge:
            e._emit('core_power_ready',{'player_id':p.player_id,'power_id':p.core_type,'charge':100})


def use_core(e,side,payload):
    from .core_actions_v5 import use
    return use(e,side,payload)
