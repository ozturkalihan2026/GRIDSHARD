"""Real 2.3.0 API + unchanged installed client proof for the three-file mail overlay."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

from prepare_legacy_announcement import ROOT, BASE, files
from verify_client_compatibility import snapshot, start_api, stop_api, git


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='qa_reports/legacy-230-proof')
    parser.add_argument('--fetch-missing',action='store_true')
    parser.add_argument('--browser',action='store_true')
    args=parser.parse_args()
    output=(ROOT/args.output).resolve()
    if not output.is_relative_to((ROOT/'qa_reports').resolve()):raise ValueError('Use workspace qa_reports')
    output.mkdir(parents=True,exist_ok=False)
    entry=next(i for i in json.loads((ROOT/'client/tests/fixtures/installed/manifest.json').read_text())['clients'] if i['version']=='2.3.0')
    old=output/'2.3.0'
    snapshot(entry,old,args.fetch_missing)
    payload,expected=files()
    assert hashlib.sha256((old/'server/app/main.py').read_bytes()).hexdigest()==expected
    for name,data in payload.items():
        target=old/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    # Frozen code/HTML/CSS for the installed app; unchanged shared binary art is
    # served by the owned loopback server. No current app.js is substituted.
    names=git('ls-tree','-r','--name-only',BASE,'client/src','client/index.html').decode().splitlines() if args.browser else []
    for name in names:
        target=old/name;target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(git('show',BASE+':'+name))
    run=output/'runtime-proof';run.mkdir()
    process,log,url=start_api(old,run,now='2026-11-05T00:00:00Z')
    try:
        spec=dict(client_dir=str(old/'client/src'),client_version='2.3.0',api_version='2.3.0',base_url=url,current_client=False,
                  system_notice_id='preview-2-4-0-season-one',browser_proof=False)
        path=output/'scenario.json';path.write_text(json.dumps(spec),encoding='utf-8')
        completed=subprocess.run(['node',str(ROOT/'tools/verify-client-compatibility.cjs'),str(path)],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',timeout=120)
        if completed.returncode:
            (output/'runner.private.log').write_text(completed.stderr,encoding='utf-8')
            raise RuntimeError('Legacy API/client proof failed; see private local diagnostic')
        result=json.loads(completed.stdout)
        if args.browser:
            spec.update(old_client_root=str(old/'client'),output=str(output))
            path.write_text(json.dumps(spec),encoding='utf-8')
            completed=subprocess.run(['node',str(ROOT/'tools/verify-legacy-announcement.cjs'),str(path)],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',timeout=180)
            if completed.returncode:
                (output/'browser.private.log').write_text(completed.stderr,encoding='utf-8')
                raise RuntimeError('Unchanged legacy UI proof failed; see private local diagnostic')
            result['browser']=json.loads(completed.stdout)
    finally:stop_api(process,log)
    result.update(base_commit=BASE,overlay_files=sorted(payload),production_changed=False,aab_changed=False,
                  popup_supported=False,fixture_clock='2026-11-05T00:00:00Z',
                  overlay_sha256={name:hashlib.sha256(data).hexdigest() for name,data in payload.items()},
                  working_tree_changes_included=bool(git('status','--porcelain').strip()),
                  source_commit=git('rev-parse','HEAD').decode().strip())
    (output/'proof.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result))


if __name__=='__main__':main()
