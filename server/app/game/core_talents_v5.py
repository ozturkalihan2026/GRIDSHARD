"""Six role-specific choices per core, with the original IDs, gates and prices."""
from .core_balance import CORE_ROLES_V5
from .talents import CORE_TALENT_LEVELS,talent_cost

def option(tr,en,description,en_description,**changes):
    return dict(name_tr=tr,name_en=en,description_tr=description,description_en=en_description,changes=changes)

SPECIALIZATIONS={
 'core_resonance':(
    option('Odaklı Dalga','Focused Wave','Tüm dalga hasarını %15 artırır.','Increases all wave damage by 15%.',multiply={'damage':1.15}),
    option('Geniş Yankı','Wide Echo','Ek hedeflerin hasar oranını %50’den %70’e çıkarır.','Raises secondary target damage from 50% to 70%.',add={'secondary_ratio':.2})),
 'core_guardian':(
    option('Kale Zırhı','Fortress Armor','Çekirdeğin kale halindeki hasar azaltımını %60’tan %70’e çıkarır.','Raises fortress damage reduction from 60% to 70%.',add={'reduction':.1}),
    option('Ağır Kale Topu','Heavy Fortress Cannon','Kale atışlarının hasarını %25 artırır.','Increases fortress shot damage by 25%.',multiply={'damage':1.25})),
 'core_overdrive':(
    option('Yoğun Alev','Dense Flame','Her alev atışının hasarını %15 artırır.','Increases each flame shot damage by 15%.',multiply={'damage':1.15}),
    option('Uzun Fırtına','Long Storm','Alev Fırtınasını 6’dan 7 saniyeye uzatır.','Extends the Flame Storm from 6 to 7 seconds.',add={'duration_ms':1000})),
 'core_disruptor':(
    option('Çabuk Hüküm','Swift Verdict','İmha işaretinin bekleme süresini %25 kısaltır.','Shortens the execution mark delay by 25%.',multiply={'delay_ms':.75}),
    option('İmha Kazancı','Execution Yield','İşaret başarıyla imha ederse +1 Akım kazandırır; depo sınırı geçerlidir.','A successful marked execution grants 1 Current, subject to the cap.',add={'execution_current':1})),
 'core_capacitor':(
    option('Ağır Çağrı','Heavy Summon','Bedeli en az 3 olan deste kartlarından rastgele çağırır; yoksa tüm desteyi kullanır.','Randomly summons a deck card costing at least 3; falls back to the whole deck.',set_values={'summon_min_cost':3}),
    option('Sağlam Takviye','Sturdy Reinforcement','Çağrılan modülün azami CAN’ını %20 artırır.','Increases the summoned module maximum HP by 20%.',multiply={'summon_hp_multiplier':1.20})),
 'core_phoenix':(
    option('Yakıcı Alev','Searing Flame','Anka Alevinin hasarını %15 artırır.','Increases Phoenix Flame damage by 15%.',multiply={'damage':1.15}),
    option('Derin Can Çalma','Deep Drain','Gerçek hasarın %100’ü yerine %135’i kadar kendi çekirdeğini onarır.','Heals the core for 135% of actual HP damage instead of 100%.',add={'heal_ratio':.35})),
 'core_quantum':(
    option('Derin Yarık','Deep Rift','Götürülen mevcut CAN oranına 10 yüzde puan ekler.','Adds 10 percentage points to the fraction of current HP removed.',add={'hp_ratio':.1}),
    option('Değerli Hedef','Valuable Target','En yüksek CAN yerine Akım bedeli en yüksek rakip modülü hedefler.','Targets the highest-cost enemy module instead of the one with most HP.',set_values={'valuable_target':True})),
}

def primary(core_type):
    kind=CORE_ROLES_V5[core_type]['kind']
    if kind=='execution':return option('Hızlı İşaret','Quick Mark','İmha işaretinin beklemesini %8 kısaltır.','Reduces mark delay by 8%.')
    if kind=='reinforcement':return option('Dayanıklı Çağrı','Durable Summon','Çağrılan modülün azami CAN’ını %8 artırır.','Increases summoned module maximum HP by 8%.')
    if kind=='fracture':return option('Yarık Gücü','Rift Power','Götürülen CAN oranını %8 artırır.','Increases the removed HP fraction by 8%.')
    return option('Ateş Gücü','Firepower','Çekirdeğin kendi saldırı hasarını %8 artırır.','Increases the core own attack damage by 8%.')

def tree(core_type,rarity):
    pairs=((primary(core_type),option('Çekirdek CAN','Core HP','Çekirdeğin azami CAN’ını %5 artırır.','Increases core maximum HP by 5%.')),
        SPECIALIZATIONS[core_type],
        (option('Hızlı Dolum','Fast Charge','İlk ve sonraki güç dolumlarını %10 kısaltır.','Reduces initial and subsequent power charge times by 10%.'),
         option('Sağlam Çekirdek','Sturdy Core','Çekirdeğin azami CAN’ını %12 artırır.','Increases core maximum HP by 12%.')))
    return tuple({'id':f'{tier}_{slot}','tier':str(tier),'level':CORE_TALENT_LEVELS[tier],
        **talent_cost(rarity,tier,core=True),**{k:v for k,v in pair[index].items() if k!='changes'}}
        for tier,pair in enumerate(pairs) for index,slot in enumerate(('energy','charge')))

def effective_settings(core_type,selected=()):
    cfg={**CORE_ROLES_V5[core_type],'hp_multiplier':1.0,'charge_multiplier':1.0,'summon_hp_multiplier':1.0}
    selected=set(selected or ())
    if '0_energy' in selected:
        if cfg['kind']=='execution':cfg['delay_ms']*=.92
        elif cfg['kind']=='reinforcement':cfg['summon_hp_multiplier']*=1.08
        elif cfg['kind']=='fracture':cfg['hp_ratio']*=1.08
        else:cfg['damage']*=1.08
    if '0_charge' in selected:cfg['hp_multiplier']*=1.05
    for index,slot in enumerate(('energy','charge')):
        if f'1_{slot}' not in selected:continue
        changes=SPECIALIZATIONS[core_type][index]['changes']
        for key,value in changes.get('multiply',{}).items():cfg[key]*=value
        for key,value in changes.get('add',{}).items():cfg[key]=cfg.get(key,0)+value
        cfg.update(changes.get('set_values',{}))
    if '2_energy' in selected:cfg['charge_multiplier']*=.9
    if '2_charge' in selected:cfg['hp_multiplier']*=1.12
    for key in ('duration_ms','delay_ms','interval_ms'):
        if key in cfg:cfg[key]=round(cfg[key])
    return cfg

def default_ai_skills(core_type,level):
    seed=sum(map(ord,core_type))
    return tuple(f'{i}_{"energy" if (seed+i)%2==0 else "charge"}' for i,threshold in enumerate(CORE_TALENT_LEVELS) if level>=threshold)


def description(core_type,selected=(),level=1,english=False):
    """Collection copy uses the exact same effective values as battle actions."""
    c=effective_settings(core_type,selected);kind=c['kind']
    damage=round(c.get('damage',0)*1.04**(max(1,min(15,level))-1),2)
    n=lambda v:f'{v:g}'
    seconds=c.get('duration_ms',0)/1000
    if kind=='shockwave':
        values=' / '.join(n(damage*r) for r in (1,c['secondary_ratio'],c['secondary_ratio']))
        return f'Hits up to three targets in priority order for {values} damage before defenses.' if english else f'Öncelik sırasındaki en fazla üç hedefe savunmalardan önce {values} hasar verir.'
    if kind in {'flame','fortress'}:
        text=(f'The core fires for {n(seconds)}s, dealing {n(damage)} damage every {n(c["interval_ms"]/1000)}s.' if english else f'Çekirdek {n(seconds)} sn boyunca {n(c["interval_ms"]/1000)} saniyede bir {n(damage)} hasarla ateş eder.')
        if kind=='fortress':text+=(f' Reduces its own incoming damage by {n(c["reduction"]*100)}%.' if english else f' Kendi aldığı hasarı %{n(c["reduction"]*100)} azaltır.')
        return text
    if kind=='execution':
        text=(f'Marks the highest-cost enemy module for destruction after {n(c["delay_ms"]/1000)}s. Cleanser removes the mark; phase blocks it. Cannot target cores.' if english else f'Akım bedeli en yüksek rakip modülü {n(c["delay_ms"]/1000)} sn sonra imha eder. Arındırıcı işareti siler; faz imhayı engeller. Çekirdek hedeflenmez.')
        if c.get('execution_current'):text+=(' A successful execution grants +1 Current, subject to the cap.' if english else ' Başarılı imha +1 Akım verir; depo sınırı geçerlidir.')
        return text
    if kind=='reinforcement':
        text=('Freely summons one random card from your deck at its own level and talents. No free cell: charge is retained.' if english else 'Destenden rastgele bir kartı kendi seviye ve yetenekleriyle ücretsiz kurar. Boş hücre yoksa dolum korunur.')
        if c.get('summon_min_cost'):text+=(' Prefers cards costing at least 3.' if english else ' Bedeli en az 3 olan kartları tercih eder.')
        if c['summon_hp_multiplier']>1:text+=(f' Summoned maximum HP +{n(round((c["summon_hp_multiplier"]-1)*100,2))}%.' if english else f' Çağrılan modülün azami CAN’ı +%{n(round((c["summon_hp_multiplier"]-1)*100,2))}.')
        return text
    if kind=='drain':return (f'Deals {n(damage)} damage before defenses; heals only its own core for {n(c["heal_ratio"]*100)}% of actual HP damage.' if english else f'Savunmalardan önce {n(damage)} hasar verir; gerçek CAN hasarının %{n(c["heal_ratio"]*100)} kadarıyla yalnız kendi çekirdeğini onarır.')
    target=('highest-cost' if c.get('valuable_target') else 'highest-HP') if english else ('Akım bedeli en yüksek' if c.get('valuable_target') else 'CAN’ı en yüksek')
    return (f'Removes {n(c["hp_ratio"]*100)}% of the {target} enemy module current HP. Bypasses armor and shields; phase blocks it. Cannot target cores.' if english else f'{target} rakip modülün mevcut CAN’ının %{n(c["hp_ratio"]*100)} kadarını götürür. Zırh ve kalkanı aşar; faz engeller. Çekirdek hedeflenmez.')
