from __future__ import annotations
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa_reports'
MATRIX=QA/'ux_interaction_matrix.json'
HISTORY=QA/'browser_e2e_history.json'
OUTPUT=QA/'ux_performance_observation.json'
BANDS={'average_frame_gap_ms':{'attention':33,'high_attention':50},'max_frame_gap_ms':{'attention':100,'high_attention':250},'pause_violation_ms':1000}
def load(path,default):
    try:return json.loads(path.read_text(encoding='utf-8'))
    except Exception:return default
def classify(value,band):
    if value>=band['high_attention']:return 'HIGH_ATTENTION'
    if value>=band['attention']:return 'ATTENTION'
    return 'OBSERVE'
def main():
    matrix=load(MATRIX,{})
    if matrix.get('status')!='MEASURED':
        payload={'version':'2.0.0-beta.22','status':'NOT_MEASURED','performance_pass':None,'reason':'Gerçek PASSED browser UX matrisi yok; performans sonucu üretilmedi.','observation_bands':BANDS,'categories':{},'trend':'NOT_AVAILABLE'}
        OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print('UX performance observation: NOT_MEASURED'); return 0
    categories={}
    for category,value in matrix.get('categories',{}).items():
        avg=float(value.get('average_frame_gap_ms',0) or 0); mx=float(value.get('max_frame_gap_ms',0) or 0)
        categories[category]={**value,'average_frame_gap_observation':classify(avg,BANDS['average_frame_gap_ms']),'max_frame_gap_observation':classify(mx,BANDS['max_frame_gap_ms'])}
    run_count=len(load(HISTORY,{'runs':[]}).get('runs',[]))
    payload={'version':'2.0.0-beta.22','status':'OBSERVED','performance_pass':None,'source':matrix.get('source'),'evidence_status':matrix.get('evidence_status'),'pause_violation_count':matrix.get('pause_violation_count'),'observation_bands':BANDS,'categories':categories,'trend':'HISTORY_AVAILABLE' if run_count>=2 else 'INSUFFICIENT_HISTORY','history_run_count':run_count,'note':'Beta.22 eşikleri gözlem bandıdır; platform hedefi belirlenmeden PASS/FAIL üretmez.'}
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print('UX performance observation: OBSERVED'); return 0
if __name__=='__main__': raise SystemExit(main())
