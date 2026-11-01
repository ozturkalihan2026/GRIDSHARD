"""Cores are direct battlefield actors. Deck/target/placement rules stay shared."""
import hashlib
from .models import ModuleStatus,TimedModuleEffect
from .operations import module_is_operational
from .combat import select_target,selectable_targets
from .core_balance import CORE_ROLES_V5
from .core_impact import record


def settings(player):
    from .core_talents_v5 import effective_settings
    return effective_settings(player.core_type,player.core_skills)


def scale(player):return 1.04**(max(1,min(15,player.core_level))-1)


def core_of(player):return next((u for u in player.modules.values() if u.definition.id=='core'),None)


def strike(e,side,enemy,target,amount,*,piercing=False):
    from .battle_actions_v2 import hit
    core=core_of(e.state.players[side])
    if not core or core.hp<=0 or target.hp<=0:return 0
    actual=hit(e,side,core,enemy,target,round(amount,2),reflect=not piercing,piercing=piercing) or 0
    record(e,side,'direct_damage',actual,enemy,target.instance_id)
    return actual


def finish_mode(e,side):
    p=e.state.players[side];mode=p.core_signature_state.pop('v5_mode',None)
    if mode:e._emit('core_mode_ended',{'player_id':side,'power_id':p.core_type})


def tick_effects(e):
    from .battle_actions_v2 import live
    now=e.state.elapsed_ms
    # Marks have no generic expiry: the resolver must run before they disappear.
    for enemy,p in e.state.players.items():
        for target in live(p,False):
            mark=target.debuffs.get('core_execution')
            if not mark:continue
            side=mark.data['source_player_id'];source=core_of(e.state.players[side])
            if not source or source.hp<=0:
                target.debuffs.pop('core_execution',None);continue
            if now<mark.data['execute_at_ms']:continue
            target.debuffs.pop('core_execution',None)
            actual=strike(e,side,enemy,target,target.hp,piercing=True)
            if target.hp==0:
                record(e,side,'executions',1,enemy,target.instance_id,'count')
                if mark.data.get('execution_current'):
                    before=e.state.players[side].circuit_credits
                    e.award_circuit_credits(side,mark.data['execution_current'],'core_execution_talent')
                    record(e,side,'current',e.state.players[side].circuit_credits-before,side,source.instance_id,'count')
                e._emit('core_execution_resolved',{'player_id':side,'power_id':e.state.players[side].core_type,
                    'target_player_id':enemy,'target_module_id':target.instance_id,'damage':actual})
    for side,p in e.state.players.items():
        mode=p.core_signature_state.get('v5_mode');core=core_of(p)
        if not mode:continue
        if not core or core.hp<=0 or now>=mode['ends_at_ms']:
            finish_mode(e,side);continue
        if not module_is_operational(core) or now<mode['next_at_ms']:continue
        enemy=next((s for s in e.state.players if s!=side),None)
        target=select_target(e.state.players[enemy]) if enemy else None
        if target:
            strike(e,side,enemy,target,mode['damage'])
            mode['shots']+=1
        # Interrupted time never becomes a burst of catch-up shots.
        mode['next_at_ms']=max(now,mode['next_at_ms'])+mode['interval_ms']


def use(e,side,payload):
    from .engine import CommandRejected
    from .battle_actions_v2 import heal,live
    p=e.state.players[side];core=core_of(p);request=str(payload.get('request_id') or '')
    if not request:raise CommandRejected('Çekirdek gücü istek kimliği gerekli.')
    if request in p.consumed_core_power_request_ids:return
    if not core or core.hp<=0 or core.status!=ModuleStatus.ACTIVE:raise CommandRejected('Çekirdek etkin değil.')
    if p.core_power_charge<99.999:raise CommandRejected('Çekirdek gücü henüz hazır değil.')
    if payload.get('target_module_id') and payload['target_module_id']!=core.instance_id:
        raise CommandRejected('Çekirdek hedefini kendisi seçer.')
    enemy=next((s for s in e.state.players if s!=side),None)
    if enemy is None:raise CommandRejected('Rakip devre bulunamadı.')
    cfg=settings(p);kind=cfg['kind'];now=e.state.elapsed_ms;effects=[];targets=[]
    def effect(kind,owner,u,value,unit='hp'):
        if value>0:effects.append({'kind':kind,'player_id':owner,'module_id':u.instance_id,'value':value,'unit':unit})
    if kind in {'flame','fortress'}:
        if not select_target(e.state.players[enemy]):raise CommandRejected('Saldırılacak hedef yok.')
        p.core_signature_state['v5_mode']={**cfg,'ends_at_ms':now+cfg['duration_ms'],'next_at_ms':now,
            'damage':round(cfg['damage']*scale(p),2),'shots':0}
        targets=[(side,core)];effect('channel',side,core,cfg['duration_ms'],'ms')
    elif kind=='shockwave':
        targets=[(enemy,u) for u in selectable_targets(e.state.players[enemy])[:3]]
        if not targets:raise CommandRejected('Saldırılacak hedef yok.')
        for i,(_,u) in enumerate(targets):effect('direct_damage',enemy,u,strike(e,side,enemy,u,cfg['damage']*scale(p)*(1 if i==0 else cfg['secondary_ratio'])))
    elif kind=='execution':
        candidates=[u for u in live(e.state.players[enemy],False) if 'core_execution' not in u.debuffs]
        if not candidates:raise CommandRejected('İşaretlenecek rakip modül yok; çekirdek hedeflenemez.')
        target=max(candidates,key=lambda u:(u.definition.current_cost,u.hp,u.definition.base_damage,u.instance_id))
        target.debuffs['core_execution']=TimedModuleEffect('core_execution','İmha İşareti',None,
            {'source_player_id':side,'source_module_id':core.instance_id,'execute_at_ms':now+cfg['delay_ms'],'execution_current':cfg.get('execution_current',0)})
        targets=[(enemy,target)];effect('execution_mark',enemy,target,cfg['delay_ms'],'ms')
    elif kind=='reinforcement':
        deck=p.battle_pool.module_definition_ids if p.battle_pool else ()
        if not deck:raise CommandRejected('Takviye için savaş destesi gerekli.')
        from .catalog import get_module_definition
        preferred=tuple(k for k in deck if get_module_definition(k).current_cost>=cfg.get('summon_min_cost',0))
        deck=preferred or deck
        roll=int(hashlib.sha256(f'{e.state.battle_id}:{side}:reinforce:{p.core_power_uses}'.encode()).hexdigest()[:12],16)
        # Failed requests cannot reroll the card; successful activations advance use count.
        target=e.deploy_scripted_module(side,deck[roll%len(deck)],hp_multiplier=cfg['summon_hp_multiplier'])
        if target is None:raise CommandRejected('Boş hücre yok; çekirdek dolumu korunuyor.')
        targets=[(side,target)];effect('reinforcement',side,target,1,'count')
        record(e,side,'reinforcements',1,side,target.instance_id,'count')
    elif kind=='drain':
        target=select_target(e.state.players[enemy])
        if not target:raise CommandRejected('Saldırılacak hedef yok.')
        targets=[(enemy,target)]
        actual=strike(e,side,enemy,target,cfg['damage']*scale(p));effect('direct_damage',enemy,target,actual)
        restored=heal(e,side,core,core,round(actual*cfg['heal_ratio']),True) if core.hp>0 else 0
        effect('repair',side,core,restored);record(e,side,'repair',restored,side,core.instance_id)
    elif kind=='fracture':
        candidates=live(e.state.players[enemy],False)
        if not candidates:raise CommandRejected('Yarık için rakip modül gerekli; çekirdek hedeflenemez.')
        target=max(candidates,key=lambda u:(u.definition.current_cost,u.hp,u.instance_id) if cfg.get('valuable_target') else (u.hp,u.definition.current_cost,u.instance_id))
        targets=[(enemy,target)]
        actual=strike(e,side,enemy,target,max(1,round(target.hp*cfg['hp_ratio'])),piercing=True)
        effect('direct_damage',enemy,target,actual)
        if not actual:effect('blocked',enemy,target,1,'count')
    p.core_power_charge=0;p.core_power_uses+=1;p.consumed_core_power_request_ids.add(request)
    e._emit('core_power_used',{'player_id':side,'request_id':request,'power_id':p.core_type,'role':kind,
        'target_module_id':core.instance_id,'affected_module_ids':[u.instance_id for _,u in targets],
        'affected_targets':[{'player_id':owner,'module_id':u.instance_id} for owner,u in targets],
        'effects':effects,'charge':0,'hp':core.hp})
