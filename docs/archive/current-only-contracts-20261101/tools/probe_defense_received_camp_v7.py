"""One live weapon + defenses against adaptive mixed, on paired economies."""
import json,itertools
from pathlib import Path
import probe_camp_v7 as camp

probe=camp.probe
ROOT=Path(__file__).resolve().parents[1]


def main():
    out=ROOT/'artifacts/defense-received-camp';out.mkdir(exist_ok=True)
    results={}
    for name,threshold,received in (('passive_control',0,0),('candidate',100,50)):
        rows=[probe.run('camp','mixed',index,core,level,907+index,swap,
            starting=7,regen=3000,threshold=threshold,joint_received=received,
            received_defense_only=bool(received))
            for index,core,level,swap in itertools.product(range(3),probe.CORES,(1,8,15),(False,True))]
        (out/f'{name}-battles.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
        results[name]=probe.summarize(rows)
        print(name,json.dumps(results[name],ensure_ascii=False),flush=True)
    for old,new in zip(json.loads((out/'passive_control-battles.json').read_text(encoding='utf8')),
                       json.loads((out/'candidate-battles.json').read_text(encoding='utf8'))):
        for key in ('policies','deck_index','decks','core','level','seed','swapped','talents'):assert old[key]==new[key],key
    (out/'summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')


if __name__=='__main__':main()
