"""Unpublished Recoil Cannon candidate. This module never registers live cards.

Authoritative firing support is shared by the candidate tests and the eventual
reviewed catalog. Release/arena/asset approval remains a separate gate.
"""
from .models import ModuleDefinition
from .talents import TALENT_LEVELS, talent_cost

IDENTITY = 'recoil_cannon'
BASE = dict(current_cost=4, max_hp=240, base_damage=50, cooldown_ms=3000, recoil_hp=16)


def stats(upgrade_level=0, selections=None):
    level=max(0,min(14,int(upgrade_level)))+1
    picks=dict(selections or {})
    for tier,choice in picks.items():
        if tier not in {'0','1','2','3'} or choice not in {'power','resilience'}:
            raise ValueError('Geçersiz Geri Tepme Topu yeteneği.')
        if level<TALENT_LEVELS['rare'][int(tier)]:
            raise ValueError('Bu yetenek eşiği henüz açılmadı.')
    scale=1.04**(level-1);hp=240*scale;damage=50*scale;fee=16*scale;cooldown=3000
    if picks.get('0')=='power':damage*=1.03
    if picks.get('0')=='resilience':hp*=1.05
    if picks.get('1')=='power':damage*=1.12
    if picks.get('1')=='resilience':fee*=.75
    if picks.get('2')=='power':cooldown*=.96
    if picks.get('2')=='resilience':hp*=1.05
    if picks.get('3')=='power':damage*=1.06
    if picks.get('3')=='resilience':hp*=1.08
    return dict(level=level,max_hp=round(hp),base_damage=round(damage,2),current_cost=4,
                cooldown_ms=round(cooldown),effect_multiplier=scale,recoil_hp=max(1,round(fee)))


def definition(upgrade_level=0, selections=None):
    s=stats(upgrade_level,selections)
    return ModuleDefinition(id=IDENTITY,name_tr='Geri Tepme Topu',category='saldırı',combat_class='saldırı',
        rarity='rare',max_hp=s['max_hp'],current_cost=4,base_damage=s['base_damage'],cooldown_ms=s['cooldown_ms'],
        effect_multiplier=s['effect_multiplier'],runtime_parameters={'recoil_hp':s['recoil_hp']},
        strategic_role='Kendi CAN bedeliyle güçlü tek atış.',description_tr='Her gerçek atışta kendi CAN’ını aşındırır; en az 1 CAN kalır.',
        signature_mechanic='Geri tepme',telegraph_tr='Tek ağır mermi ve gövdenin geri kayışı.',
        counterplay_tr='EMP ateşi durdurur; kalkan/zırh/Faz hasarı karşılar. Aşınmış gövdeyi normal saldırıyla yok et.')


def tree():
    rows=[(('Hasar +%3','Damage +3%'),('CAN +%5','HP +5%')),
          (('Ağır Atış: hasar +%12','Heavy Shot: damage +12%'),('Yumuşak Kızak: geri tepme −%25','Soft Slide: recoil −25%')),
          (('Dolum −%4','Recharge −4%'),('CAN +%5','HP +5%')),
          (('Hasar +%6','Damage +6%'),('CAN +%8','HP +8%'))]
    descriptions=[
        (('Doğrudan atış hasarını %3 artırır.','Increases direct shot damage by 3%.'),('Azami CAN’ı %5 artırır.','Increases maximum HP by 5%.')),
        (('Doğrudan atış hasarını %12 artırır; geri tepme bedeli değişmez.','Increases direct shot damage by 12%; recoil cost is unchanged.'),
         ('Her gerçek atışın kendi CAN bedelini %25 azaltır; hasar değişmez.','Reduces self HP cost per actual shot by 25%; damage is unchanged.')),
        (('Atış çevrimini %4 kısaltır; her atış kendi CAN bedelini korur.','Shortens the firing cycle by 4%; every shot retains its self HP cost.'),('Azami CAN’ı %5 artırır.','Increases maximum HP by 5%.')),
        (('Doğrudan atış hasarını %6 artırır.','Increases direct shot damage by 6%.'),('Azami CAN’ı %8 artırır.','Increases maximum HP by 8%.')),
    ]
    return tuple(dict(tier=str(i),kind=('basic','signature','tuning','mastery')[i],level=level,**talent_cost('rare',i),choices=[
        dict(id=choice,name_tr=pair[0],name_en=pair[1],description_tr=desc[0],description_en=desc[1])
        for choice,pair,desc in zip(('power','resilience'),rows[i],descriptions[i])])
        for i,level in enumerate(TALENT_LEVELS['rare']))


def fire(e,side,gun,target):
    """Commit one actual shot. Self-wear never goes through enemy damage hooks."""
    from .operations import module_is_operational
    if not module_is_operational(gun) or target.hp<=0:
        return False
    # Replayed snapshots/ticks cannot charge or fire this source twice.
    if gun.mechanic_state.get('recoil_last_fired_at_ms')==e.state.elapsed_ms:
        return False
    gun.mechanic_state['recoil_last_fired_at_ms']=e.state.elapsed_ms
    fee=int((gun.definition.runtime_parameters or {}).get('recoil_hp',16))
    before=gun.hp;actual=min(max(0,fee),max(0,before-1));gun.hp-=actual
    e._emit('module_recoil',dict(player_id=side,module_id=gun.instance_id,definition_id=IDENTITY,
        requested_hp=fee,hp_loss=actual,hp_before=before,hp_after=gun.hp,counts_as_enemy_damage=False))
    return True
