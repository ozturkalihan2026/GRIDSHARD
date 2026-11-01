"""Paired main-engine talent scenarios. Diagnostic AI battles, not human win rates."""
import itertools,json,statistics,time
from pathlib import Path
from probe_main_roster_v2 import ROOT,DECKS,CORES,run


def main():
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='module-talents-v3');args=parser.parse_args()
    if Path(args.output).name!=args.output:raise ValueError('Output must be one artifact directory name.')
    rows=[];start=time.time()
    for index,(left,right) in enumerate(itertools.combinations(DECKS,2)):
        for name,picks in (
            ('baseline',None),
            ('power',{'a':dict.fromkeys(map(str,range(4)),'power'),'b':dict.fromkeys(map(str,range(4)),'power')}),
            ('resilience',{'a':dict.fromkeys(map(str,range(4)),'resilience'),'b':dict.fromkeys(map(str,range(4)),'resilience')}),
        ):
            rows.append({'talents':name,**run(left,right,15,CORES[index%7],index,picks)})
    summary={}
    for name in ('baseline','power','resilience'):
        group=[r for r in rows if r['talents']==name];durations=[r['seconds'] for r in group if r['finished']]
        summary[name]={'scenarios':len(group),'finished':len(durations),'timeouts_900s':len(group)-len(durations),
                       'seconds_min':min(durations,default=0),'seconds_median':statistics.median(durations) if durations else 0,
                       'seconds_max':max(durations,default=0),
                       'median_first_loss_seconds':statistics.median(r['first_loss_seconds'] for r in group if r['first_loss_seconds'] is not None)}
    out=ROOT/'artifacts'/args.output;out.mkdir(exist_ok=True)
    (out/'balance.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
    summary['runtime_seconds']=round(time.time()-start,2)
    (out/'balance-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(summary,ensure_ascii=False))


if __name__=='__main__':main()
