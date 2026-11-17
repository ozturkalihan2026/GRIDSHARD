"""Repeatable full-engine candidate diagnostic; no live registration or deploy."""
import argparse
import json
from pathlib import Path
import statistics
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
from recoil_cannon_candidate import candidate_catalog
from probe_main_roster_v2 import run,DECKS,CORES


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'qa_reports/card01-balance.json')
    parser.add_argument('--seeds',type=int,default=1)
    args=parser.parse_args()
    if not 1<=args.seeds<=8:parser.error('seeds must be 1..8')
    start=time.monotonic();rows=[]
    DECKS['recoil']=('recoil_cannon','laser','barrier','repair','emp','cleanser')
    DECKS['pulse-reference']=('pulse_cannon','laser','barrier','repair','emp','cleanser')
    try:
        with candidate_catalog():
            for level in (1,15):
                for seed in range(args.seeds):
                    for index,counter in enumerate(('starter','pierce','control','fortress','pulse-reference')):
                        for left,right in (('recoil',counter),(counter,'recoil')):
                            row=run(left,right,level,CORES[index%len(CORES)],100+seed)
                            rows.append(row)
    finally:
        DECKS.pop('recoil',None);DECKS.pop('pulse-reference',None)
    seconds=[r['seconds'] for r in rows]
    summary=dict(matches=len(rows),finished=sum(r['finished'] for r in rows),
        recoil_wins=sum((r['winner']=='a' if r['left']=='recoil' else r['winner']=='b') for r in rows),
        min_seconds=min(seconds),median_seconds=statistics.median(seconds),max_seconds=max(seconds),
        candidate_deployed_in_all_matches=all('recoil_cannon' in r['cards_used'] for r in rows),
        runtime_seconds=round(time.monotonic()-start,2),production_changed=False,
        scope='Candidate fixed AI decks, two levels, swapped sides; not human win-rate or final balance acceptance')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(dict(summary=summary,matches=rows),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False))


if __name__=='__main__':main()
