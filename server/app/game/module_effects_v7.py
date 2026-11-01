"""Bounded V7 effects. Derived damage never recursively creates a signature."""
from math import floor
from .models import TimedModuleEffect,ModuleStatus

RULESET='modules_v7'
CLEANSE_ORDER=('core_execution','plasma_dot','missile_followup','emp_disabled','virus')

def budget(source,key,amount):
    fractions=source.mechanic_state.setdefault('v7_fractions',{})
    exact=max(0,amount)+fractions.get(key,0);whole=floor(exact+1e-9)
    fractions[key]=max(0,exact-whole)
    return whole

def split(total,targets):
    if not targets:return []
    q,r=divmod(max(0,int(total)),len(targets))
    return [(target,q+(i<r)) for i,target in enumerate(targets)]

def damaged_allies(player,excluded=()):
    return sorted((u for u in player.modules.values() if u.status==ModuleStatus.ACTIVE and u.hp>0
        and u.definition.id!='core' and u.instance_id not in excluded and u.hp<u.definition.max_hp),
        key=lambda u:(u.hp/u.definition.max_hp,u.instance_id))

def delayed(e,side,source,enemy,target,kind,total,ticks,step_ms):
    if target.hp<=0 or total<=0:return
    old=target.debuffs.get(kind)
    if old and not old.is_expired(e.state.elapsed_ms) and old.data.get('remaining',0)>=total:return
    target.debuffs[kind]=TimedModuleEffect(kind,'Plazma İzi' if kind=='plasma_dot' else 'Takip Yükü',
        e.state.elapsed_ms+ticks*step_ms+1,{'source_player_id':side,'source_module_id':source.instance_id,
        'remaining':total,'ticks':ticks,'step_ms':step_ms,'next_ms':e.state.elapsed_ms+step_ms})
    e._emit('module_delayed_applied',{'player_id':side,'source_module_id':source.instance_id,
        'target_player_id':enemy,'target_module_id':target.instance_id,'effect_id':kind,'value':total,'ticks':ticks,'duration_ms':ticks*step_ms})

def tick_delayed(e):
    from .battle_actions_v2 import hit
    for side,p in e.state.players.items():
        for target in tuple(p.modules.values()):
            if target.hp<=0:continue
            for key in ('plasma_dot','missile_followup'):
                effect=target.debuffs.get(key)
                if not effect:continue
                d=effect.data
                if e.state.elapsed_ms<d['next_ms']:continue
                owner=e.state.players.get(d['source_player_id']);source=owner.modules.get(d['source_module_id']) if owner else None
                if not source:target.debuffs.pop(key,None);continue
                amount=d['remaining']//d['ticks'];d['remaining']-=amount;d['ticks']-=1;d['next_ms']+=d['step_ms']
                if d['ticks']<=0:target.debuffs.pop(key,None)
                if amount:hit(e,d['source_player_id'],source,side,target,amount,secondary=True,reflect=False,damage_kind='dot' if key=='plasma_dot' else 'followup')

def after_direct_hit(e,side,gun,enemy,target,actual,fourth=False):
    from .battle_actions_v2 import params,hit
    p=params(gun)
    if actual<=0:return
    if gun.definition.id=='plasma_mortar':
        delayed(e,side,gun,enemy,target,'plasma_dot',budget(gun,'plasma_dot',actual*p['dot_per_tick_ratio']*p['dot_ticks']),p['dot_ticks'],p['dot_step_ms'])
    elif gun.definition.id=='missile_launcher':
        delayed(e,side,gun,enemy,target,'missile_followup',budget(gun,'missile_followup',actual*p['followup_ratio']),1,p['followup_delay_ms'])
    elif gun.definition.id=='quantum_repeater' and fourth:
        from .combat import selectable_targets
        targets=[u for u in selectable_targets(e.state.players[enemy]) if u is not target and u.definition.id!='core']
        total=floor(actual*min(p['echo_total_ratio'],len(targets)*p['echo_per_target_ratio'])+1e-9)
        cap=floor(actual*p['echo_per_target_ratio']+1e-9)
        for other,share in split(total,targets):
            value=min(cap,share)
            if value:hit(e,side,gun,enemy,other,value,secondary=True,reflect=False,damage_kind='echo')

def buffer_conversion(e,side,protected,effect,absorbed):
    from .battle_actions_v2 import heal
    d=effect.data;source=e.state.players[side].modules.get(d.get('source_module_id'))
    if not source:return
    exact=absorbed*d.get('conversion_ratio',0)+d.get('conversion_fraction',0)
    total=floor(exact+1e-9);d['conversion_fraction']=max(0,exact-total)
    targets=damaged_allies(e.state.players[side],(protected.instance_id,))[:2]
    left=total
    for target,share in split(total,targets):
        spent=min(share,target.definition.max_hp-target.hp)
        heal(e,side,source,target,spent,budget_cap=spent);left-=spent
    # Redistribute only within the original two recipients; never bank unused HP.
    for target in targets:
        if left<=0:break
        spent=min(left,target.definition.max_hp-target.hp)
        heal(e,side,source,target,spent,budget_cap=spent);left-=spent

def bastion_legacy(e,side,source):
    from .battle_actions_v2 import shield,params,live
    if source.mechanic_state.get('v7_legacy_used'):return
    source.mechanic_state['v7_legacy_used']=True
    p=params(source);scale=source.definition.effect_multiplier;friends=live(e.state.players[side],False)
    core=next((u for u in live(e.state.players[side]) if u.definition.id=='core'),None)
    if core:shield(e,side,source,core,round(p['core_shield_hp']*scale),0,'bastion')
    friends=sorted(friends,key=lambda u:(u.hp/u.definition.max_hp,u.instance_id))[:2]
    for target,share in split(round(p.get('ally_shield_total',0)*scale),friends):
        if share:shield(e,side,source,target,share,p.get('ally_shield_duration_ms',5000),'bastion_ally')

def control_duration(e,target,kind,duration):
    guard=target.persistent_effects.get('v7_cleanse_guard')
    if kind in {'emp_disabled','virus'} and guard and not guard.is_expired(e.state.elapsed_ms):
        duration=round(duration*(1-guard.data['reduction']));target.persistent_effects.pop('v7_cleanse_guard',None)
    return duration
