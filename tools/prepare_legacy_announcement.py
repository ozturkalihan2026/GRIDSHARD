"""Prepare a fail-closed, three-file announcement overlay for the pinned 2.3.0 server.

Never deploys, changes a version, activates S1 or writes an AAB. The unchanged
2.3.0 app reads this through its existing System mailbox; there is no popup.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server'))
from app.release_announcements import CATALOG

BASE='cef09390d01480d0152dabd22bbc60c53a14f9a2'


def source(ref, name):
    return subprocess.check_output(['git','show',f'{ref}:{name}'],cwd=ROOT)


def patched_main(original):
    marker=b'from .release_updates import INBOX_UPDATE_NOTICES'
    insertion=b'    notices = [dict(item) for item in INBOX_UPDATE_NOTICES]'
    if original.count(marker)!=1 or original.count(insertion)!=1 or b'from .release_announcements' in original:
        raise ValueError('Unexpected server source: refuse an unreviewed or already patched base')
    newline=b'\r\n' if b'\r\n' in original else b'\n'
    return original.replace(marker,marker+newline+b'from .release_announcements import active_announcements').replace(
        insertion,insertion+newline+b'    notices.extend(active_announcements(VERSION, player_profile_service.now()))')


def files(ref=BASE):
    if ref!=BASE:
        raise ValueError('Only the reviewed, pinned 2.3.0 base is supported')
    original=source(ref,'server/app/main.py')
    return {
        'server/app/main.py':patched_main(original),
        'server/app/release_announcements.py':(ROOT/'server/app/release_announcements.py').read_text(encoding='utf-8').encode('utf-8'),
        'server/data/release_announcements_v1.json':(ROOT/'server/data/release_announcements_v1.json').read_text(encoding='utf-8').encode('utf-8'),
    }, hashlib.sha256(original).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='qa_reports/legacy-230-announcement')
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    payload,base_hash=files()
    report=dict(base_commit=BASE,base_main_sha256=base_hash,server_version='2.3.0',native_version='2.3.0',
        server_transition_on=CATALOG['announcements'][0]['server_transition_on'],
        weekly_tournament_starts_at=CATALOG['announcements'][0]['weekly_tournament_starts_at'],
        maintenance_starts_at=CATALOG['announcements'][0]['server_transition_starts_at'],
        maintenance_ends_at=CATALOG['announcements'][0]['server_transition_ends_at'],
        maintenance_duration_minutes=CATALOG['announcements'][0]['maintenance_duration_minutes'],
        system_mail=True,automatic_popup=False,season_activated=False,production_changed=False,
        files={name:hashlib.sha256(data).hexdigest() for name,data in payload.items()})
    if not args.check:
        output=(ROOT/args.output).resolve()
        if not output.is_relative_to((ROOT/'qa_reports').resolve()):
            raise ValueError('Output must stay under workspace qa_reports')
        if output.exists():
            raise ValueError('Use a fresh output directory; previous review artifacts are retained')
        for name,data in payload.items():
            target=output/name
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
        (output/'manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
