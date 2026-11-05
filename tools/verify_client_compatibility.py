"""Owned loopback HTTP proof for installed clients and old APIs; no production access.

Historical API/JS bytes come from pinned Git objects, not hand-written mocks.
Outputs are fresh test state under qa_reports; no old player files are loaded.
"""
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path
import socket
import subprocess
import sys
import tarfile
import time
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'client/tests/fixtures/installed/manifest.json'
STATIC_DATA={'arena_bot_profiles_v1.json','arena_progression_v1.json','module_roster_v2.json',
             'module_talents_v7.json','season_module_releases_v2.json','game_updates.json','cosmetic_releases_v1.json'}
JS_FILES=('relay-client.js','auth-session.js','native-secure-storage.js')


def git(*args):
    result=subprocess.run(['git',*args],cwd=ROOT,capture_output=True,check=False)
    if result.returncode:raise RuntimeError('Required pinned Git source unavailable; use --fetch-missing in an authorized network environment')
    return result.stdout


def snapshot(entry,destination,fetch_missing):
    commit=entry['commit']
    if not re.fullmatch(r'[0-9a-f]{40}',commit):raise ValueError('Invalid pinned source commit')
    if subprocess.run(['git','cat-file','-e',commit+'^{commit}'],cwd=ROOT,capture_output=True).returncode:
        if not fetch_missing:raise RuntimeError('Pinned source missing: '+commit)
        git('fetch','--no-tags','--depth=1','origin',commit)
    names=git('ls-tree','-r','--name-only',commit,'server','client/src').decode().splitlines()
    selected=[name for name in names if name.startswith(('server/app/','server/migrations/','server/json_migrations/'))
              or name.startswith('server/data/') and name.split('/')[-1] in STATIC_DATA
              or name in {'client/src/'+file for file in JS_FILES}]
    # Windows archive conversion must not rewrite the pinned executable bytes.
    archive=git('-c','core.autocrlf=false','archive','--format=tar',commit,*selected)
    destination.mkdir()
    with tarfile.open(fileobj=io.BytesIO(archive),mode='r:') as bundle:
        for member in bundle.getmembers():
            if member.isdir():continue
            target=(destination/member.name).resolve()
            if not member.isfile() or not target.is_relative_to(destination.resolve()):raise RuntimeError('Unsafe snapshot entry')
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(bundle.extractfile(member).read())
    data=(destination/'client/src/relay-client.js').read_bytes()
    assert hashlib.sha256(data).hexdigest()==entry['sha256'],'Installed executable differs from frozen reference'
    return {'version':entry['version'],'commit':commit,'relay_sha256':entry['sha256'],'files':len(selected)}


def environment(runtime):
    env={k:v for k,v in os.environ.items() if not k.startswith(('GRIDSHARD_','RELAY_'))
         and k not in {'DATABASE_URL','DATABASE_URL_FILE','REDIS_URL','REDIS_URL_FILE','PYTHONPATH','PYTHONHOME','GOOGLE_APPLICATION_CREDENTIALS'}}
    env.update({'PYTHONIOENCODING':'utf-8','GRIDSHARD_RUNTIME_MODE':'development',
                'GRIDSHARD_RUNTIME_DATA_DIR':str(runtime),'GRIDSHARD_CLIENT_DIR':str(ROOT/'client'),
                'GRIDSHARD_AUTH_REQUIRED':'1','GRIDSHARD_RATE_LIMIT_REQUIRED':'0',
                'GRIDSHARD_AUTH_SIGNING_KEY':'compatibility-isolated-key-not-for-production',
                'GRIDSHARD_PUSH_ENABLED':'0','GRIDSHARD_PURCHASE_TEST_MODE':'0','GRIDSHARD_AD_TEST_MODE':'0',
                'GRIDSHARD_SEASON_STARTS_AT':'','GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT':''})
    for variable,file in {'RELAY_PLAYER_DATA_PATH':'players.json','RELAY_TELEMETRY_PATH':'telemetry.json',
                         'RELAY_BATTLE_POOL_PRESET_PATH':'presets.json','GRIDSHARD_AUTH_IDENTITY_PATH':'identities.json',
                         'GRIDSHARD_PLATFORM_STATE_PATH':'platform.json','GRIDSHARD_PRODUCT_ANALYTICS_PATH':'analytics.json'}.items():
        env[variable]=str(runtime/file)
    return env


def start_api(source,output,version=None,now=None):
    runtime=output/'runtime';runtime.mkdir()
    with socket.socket() as listener:
        listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
    log=(output/'server.private.log').open('w',encoding='utf-8')
    args=[sys.executable,str(Path(__file__).resolve()),'--serve',str(source),'--port',str(port)]
    if version:args+=['--simulate-release',version]
    if now:args+=['--simulate-now',now]
    process=subprocess.Popen(args,cwd=ROOT,env=environment(runtime),stdout=log,stderr=log)
    url=f'http://127.0.0.1:{port}'
    try:
        for _ in range(100):
            if process.poll() is not None:raise RuntimeError('Isolated API failed to start; private local diagnostic retained')
            try:
                with urllib.request.urlopen(url+'/health',timeout=1) as response:
                    if json.load(response)['status']=='ok':return process,log,url
            except (OSError,ValueError):pass
            time.sleep(.15)
        raise RuntimeError('Isolated API startup deadline exceeded')
    except Exception:
        stop_api(process,log)
        raise


def stop_api(process,log):
    process.terminate()
    try:process.wait(timeout=5)
    except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
    log.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='qa_reports/client-compatibility')
    parser.add_argument('--fetch-missing',action='store_true')
    parser.add_argument('--browser',action='store_true',help='Also run the current UI in local Chrome against each API')
    parser.add_argument('--serve',type=Path,help=argparse.SUPPRESS)
    parser.add_argument('--port',type=int,help=argparse.SUPPRESS)
    parser.add_argument('--simulate-release',help=argparse.SUPPRESS)
    parser.add_argument('--simulate-now',help=argparse.SUPPRESS)
    args=parser.parse_args()
    if args.serve:
        sys.path.insert(0,str(args.serve/'server'))
        import uvicorn
        from app import main as gateway
        # Release labels stay 2.3 until final packaging. This simulates only the
        # future health build identity; actual development API handlers run.
        if args.simulate_release:gateway.VERSION=args.simulate_release
        if args.simulate_now:
            from datetime import datetime
            moment=datetime.fromisoformat(args.simulate_now.replace('Z','+00:00'))
            if moment.tzinfo is None:raise ValueError('Owned fixture clock requires a timezone')
            gateway.player_profile_service._now_func=lambda:moment
        uvicorn.run(gateway.app,host='127.0.0.1',port=args.port,access_log=False,log_level='error')
        return
    output=(ROOT/args.output).resolve()
    if not output.is_relative_to(ROOT/'qa_reports') and not output.is_relative_to(ROOT/'artifacts'):
        raise RuntimeError('Proof output must stay in this workspace qa_reports or artifacts')
    output.mkdir(parents=True,exist_ok=False)
    entries=json.loads(MANIFEST.read_text(encoding='utf-8'))['clients']
    snapshots=[]
    for entry in entries:snapshots.append(snapshot(entry,output/entry['version'],args.fetch_missing))
    runner=ROOT/'tools/verify-client-compatibility.cjs'
    def exercise(client_dir,client_version,api_version,base,current_client):
        spec={'client_dir':str(client_dir),'client_version':client_version,'api_version':api_version,'base_url':base,
              'current_client':current_client,'browser_proof':args.browser and current_client,
              'screenshot':str(output/('browser-'+api_version+'.png'))}
        spec_path=output/('scenario-'+client_version+'-'+api_version+'.json')
        spec_path.write_text(json.dumps(spec),encoding='utf-8')
        process=subprocess.run(['node',str(runner),str(spec_path)],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',timeout=120)
        if process.returncode:
            (output/'runner.private.log').write_text(process.stderr,encoding='utf-8')
            raise RuntimeError('Compatibility HTTP scenario failed: '+client_version+' -> '+api_version+'; private local diagnostic retained')
        return json.loads(process.stdout)
    scenarios=[]
    target=output/'current';target.mkdir();process,log,url=start_api(ROOT,target,'2.4.0')
    try:
        for entry in entries:
            scenarios.append(exercise(output/entry['version']/'client/src',entry['version'],'2.4.0',url,False))
        scenarios.append(exercise(ROOT/'client/src','2.4.0','2.4.0',url,True))
    finally:stop_api(process,log)
    for entry in entries:
        target=output/('api-'+entry['version']);target.mkdir()
        process,log,url=start_api(output/entry['version'],target)
        try:scenarios.append(exercise(ROOT/'client/src','2.4.0',entry['version'],url,True))
        finally:stop_api(process,log)
    report={'passed':True,'snapshots':snapshots,'scenarios':scenarios,'scenario_count':len(scenarios)*2,
            'future_build_identity_simulated':True,'actual_http_api_and_authentication':True,
            'production_accessed':False,'physical_device_verified':False,'database_backend':'isolated-json',
            'source_commit':git('rev-parse','HEAD').decode().strip(),
            'working_tree_changes_included':bool(git('status','--porcelain').strip()),
            'runtime_source_sha256':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in
                ('server/app/main.py','server/app/client_compatibility.py','client/src/relay-client.js',
                 'client/src/app.js','client/src/startup-loading.js','client/src/auth-session.js')}}
    (output/'proof.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'passed':True,'http_scenarios':report['scenario_count'],'production_accessed':False,'proof':str(output/'proof.json')}))


if __name__=='__main__':main()
