from __future__ import annotations
from datetime import datetime, timezone
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'qa_reports'
IMPORTED=QA/'imported_browser_e2e.json'
HISTORY=QA/'browser_e2e_history.json'
COMPARISON=QA/'browser_e2e_history_comparison.json'

def load(path,default):
    try: return json.loads(path.read_text(encoding='utf-8'))
    except Exception: return default

def stable_run_id(payload):
    material=json.dumps({'source':payload.get('source',''),'hashes':payload.get('artifact_integrity',{}).get('sha256',{})},sort_keys=True,ensure_ascii=False).encode('utf-8')
    return hashlib.sha256(material).hexdigest()[:16]

def main():
    current=load(IMPORTED,{})
    history=load(HISTORY,{'version':'2.0.0-beta.32-fix.1','runs':[]})
    history['version']='2.0.0-beta.32-fix.1'
    runs=history.setdefault('runs',[])
    if current.get('status')!='VERIFIED_PASSED' or current.get('verified_passed') is not True:
        COMPARISON.write_text(json.dumps({'version':'2.0.0-beta.32-fix.1','status':'SKIPPED','reason':'Bütünlük doğrulamasını geçmiş gerçek Windows E2E importu yok.','history_count':len(runs),'current_added':False,'automatic_pass':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Browser E2E history: SKIPPED'); return 0
    run_id=stable_run_id(current)
    existing=next((x for x in runs if x.get('run_id')==run_id),None)
    entry={'run_id':run_id,'recorded_at':existing.get('recorded_at') if existing else datetime.now(timezone.utc).isoformat(),'browser':current.get('browser'),'source':current.get('source'),'status':'VERIFIED_PASSED','artifact_sha256':current.get('artifact_integrity',{}).get('sha256',{}),'checks':current.get('checks',[])}
    if existing: runs[runs.index(existing)]=entry; added=False
    else: runs.append(entry); added=True
    runs.sort(key=lambda x:x.get('recorded_at',''))
    HISTORY.write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    prev=runs[-2] if len(runs)>=2 else None
    comparison={'version':'2.0.0-beta.32-fix.1','status':'RECORDED','history_count':len(runs),'current_added':added,'current_run_id':run_id,'previous_run_id':prev.get('run_id') if prev else None,'same_browser_as_previous':(current.get('browser')==prev.get('browser')) if prev else None,'artifact_hashes_changed':(entry['artifact_sha256']!=prev.get('artifact_sha256',{})) if prev else None,'automatic_pass':False,'note':'Geçmiş yalnız VERIFIED_PASSED Windows browser importlarından oluşur.'}
    COMPARISON.write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Browser E2E history: RECORDED runs=',len(runs)); return 0
if __name__=='__main__': raise SystemExit(main())
