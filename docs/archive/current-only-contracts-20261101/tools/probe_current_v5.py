"""Controlled Current alternatives; same decks, seed and engine in every row."""
import argparse,json,statistics,time
from probe_main_roster_v2 import ROOT,run,CORES
from probe_combat_readability_v4 import run as camp_run
from app.game.economy import CircuitCreditConfig

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--phase',default='before-core-v5');parser.add_argument('--talents',action='store_true');args=parser.parse_args()
    variants={
      'old_2200_100_scaled':CircuitCreditConfig(current_regen_interval_ms=2200,damage_current_threshold=100,damage_current_normalize_levels=True),
      '2500_200_scaled':CircuitCreditConfig(current_regen_interval_ms=2500,damage_current_threshold=200,damage_current_normalize_levels=True),
      '2500_200_visible_cap6':CircuitCreditConfig(current_regen_interval_ms=2500,damage_current_threshold=200,damage_current_normalize_levels=False),
      '2500_200_visible_cap2_5':CircuitCreditConfig(current_regen_interval_ms=2500,damage_current_threshold=200,damage_current_normalize_levels=False,damage_current_min_interval_ms=2500),
    }
    pairs=(('starter','burst'),('pierce','chain'),('repeat','control'),('fortress','missiles'),
           ('starter','repeat'),('burst','chain'),('pierce','fortress'),('control','missiles'))
    rows=[];start=time.time()
    for name,config in variants.items():
        for level in (1,15):
            for seed,(left,right) in enumerate(pairs):rows.append({'economy':name,'kind':'mixed',**run(left,right,level,CORES[seed%7],seed,config=config,core_skills={s:tuple(f'{i}_{slot}' for i in range(3)) for s,slot in (('a','energy'),('b','charge'))} if args.talents and level==15 else None)})
        for style in ('defensive','sustain','counter_meta','aggressive'):
            for seed in range(2):rows.append({'economy':name,'kind':'camp',**camp_run(style,seed,config=config)})
    summary={}
    for name in variants:
        group=[r for r in rows if r['economy']==name];mixed=[r for r in group if r['kind']=='mixed'];camp=[r for r in group if r['kind']=='camp']
        summary[name]={'mixed':len(mixed),'finished':sum(r['finished'] for r in group),'total':len(group),'camp_wins':sum(r['winner']=='camp' for r in camp),
          'median_seconds':statistics.median(r['seconds'] for r in mixed),'min_seconds':min(r['seconds'] for r in mixed),'max_seconds':max(r['seconds'] for r in mixed),
          'median_deployments':statistics.median(r['deployments'] for r in mixed),
          'median_bonus_share':round(statistics.median(sum(r['current_from_damage'].values())/sum(r['total_current'].values()) for r in mixed),3),
          'by_level':{level:round(statistics.median(r['seconds'] for r in mixed if r['level']==level),2) for level in (1,15)}}
    out=ROOT/'artifacts/core-roles-v5';out.mkdir(exist_ok=True)
    (out/(args.phase+'-economy.json')).write_text(json.dumps({'summary':summary,'rows':rows,'runtime':round(time.time()-start,2)},ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
