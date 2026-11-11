"""Build only a pinned, clean candidate; never deploy, publish or activate seasons."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def run(args, cwd=ROOT):
    subprocess.run([str(a) for a in args], cwd=cwd, check=True)


def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True, encoding='utf-8').strip()


def load_candidate(version, root=ROOT):
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid release version')
    data = json.loads((root / 'config/release-candidates' / (version + '.json')).read_text(encoding='utf-8'))
    if (data.get('schema_version') != 1 or data.get('version') != version
            or not re.fullmatch(r'[0-9a-f]{40}', data.get('source_commit', ''))
            or not re.fullmatch(re.escape(version) + r'-rc[1-9][0-9]*', data.get('candidate_id', ''))
            or data.get('tag') != 'v' + version + '-rc.' + data.get('candidate_id', '').rsplit('rc', 1)[-1]
            or type(data.get('version_code')) is not int or data['version_code'] < 1):
        raise ValueError('Invalid pinned candidate manifest')
    return data


def source_path(data, root=ROOT):
    base = (root / 'qa_reports/release-candidates').resolve()
    path = (base / data['candidate_id'] / 'source').resolve()
    if not base.is_relative_to(root.resolve()) or not path.is_relative_to(base):
        raise ValueError('Candidate checkout escapes the workspace')
    return path


def pinned_json(data, relative, root=ROOT):
    return json.loads(git('show', data['source_commit'] + ':' + relative, cwd=root))


def validate_pin(data, root=ROOT):
    commit = data['source_commit']
    if git('rev-parse', '--verify', commit + '^{commit}', cwd=root) != commit:
        raise ValueError('Candidate is not a full immutable commit')
    if git('rev-parse', '--verify', data['tag'] + '^{commit}', cwd=root) != commit:
        raise ValueError('Candidate tag and immutable commit disagree')
    package = pinned_json(data, 'package.json', root)
    native = pinned_json(data, 'config/android-production.json', root)
    server = git('show', commit + ':server/app/version.py', cwd=root)
    if (package['version'] != data['version'] or native['versionName'] != data['version']
            or package['gridshard']['androidVersionCode'] != data['version_code']
            or native['versionCode'] != data['version_code']
            or not re.match(r'^VERSION = "' + re.escape(data['version']) + r'"(?:\n|$)', server)):
        raise ValueError('Pinned server/client/Android identities disagree')
    return source_path(data, root)


def check_source(data, root=ROOT):
    path = validate_pin(data, root)
    if not path.is_dir() or not (path / '.git').is_file():
        raise ValueError('Prepare the isolated candidate checkout first')
    if git('rev-parse', 'HEAD', cwd=path) != data['source_commit']:
        raise ValueError('Wrong candidate commit; never reset or replace a checkout automatically')
    # Native generators write LF on Windows. Git status can report a stat/EOL
    # change even when the normalized Git content is identical to HEAD.
    # SQL/binary files retain their -text byte checks through Git attributes.
    if (git('diff', '--name-only', 'HEAD', '--', cwd=path)
            or git('ls-files', '--others', '--exclude-standard', '-z', cwd=path)):
        raise ValueError('Candidate source is dirty; make and review a new candidate instead')
    extras = git('ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--',
                 'client', 'server/app', 'server/data', 'server/migrations', 'tools', cwd=path).split('\0')
    if any(p and '__pycache__' not in Path(p).parts and not p.endswith(('.pyc', '.pyo')) for p in extras):
        raise ValueError('Ignored extra files exist in candidate source inputs')
    return path


def prepare(data, *, root=ROOT, offline=False, source_only=False):
    path = validate_pin(data, root)
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        run(['git', 'worktree', 'add', '--detach', path, data['source_commit']], cwd=root)
    check_source(data, root)
    if not source_only:
        pnpm = shutil.which('pnpm.cmd') or shutil.which('pnpm')
        if not pnpm:
            raise ValueError('pnpm is required for isolated candidate dependencies')
        args = [pnpm, 'install', '--frozen-lockfile', '--ignore-scripts']
        if offline:
            args.append('--offline')
        run(args, cwd=path)
        check_source(data, root)
    return path


def commands(data, path, *, root=ROOT):
    shell = shutil.which('pwsh.exe') or shutil.which('powershell.exe') or 'powershell'
    signing = root / 'secrets/android-release'
    return {
        'aab': [shell, '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
                str(path / 'tools/build-android-production.ps1'), '-SigningDirectory', str(signing)],
        'server-image': ['docker', 'build', '--label', 'org.opencontainers.image.revision=' + data['source_commit'],
                         '--tag', 'gridshard:' + data['version'] + '-' + data['source_commit'][:12], str(path)],
        'server-source': [sys.executable, str(path / 'tools/package_release.py'), '--output-dir',
                          str(root / 'deliverables' / data['candidate_id'])],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version')
    parser.add_argument('action', choices=['plan', 'prepare', 'check', 'aab', 'server-image', 'server-source'])
    parser.add_argument('--offline', action='store_true', help='Use only cached package dependencies')
    parser.add_argument('--source-only', action='store_true', help='Prepare source without installing dependencies')
    args = parser.parse_args()
    if args.source_only and args.action != 'prepare':
        parser.error('--source-only belongs to prepare')
    if args.offline and args.action not in {'prepare', 'aab'}:
        parser.error('--offline belongs to prepare or aab')
    data = load_candidate(args.version)
    path = validate_pin(data)
    if args.action == 'prepare':
        path = prepare(data, offline=args.offline, source_only=args.source_only)
    elif args.action != 'plan':
        path = check_source(data)
    plan = commands(data, path)
    if args.offline and args.action == 'aab':
        plan['aab'].append('-Offline')
    if args.action in plan:
        if args.action == 'aab' and not (path / 'node_modules').is_dir():
            raise ValueError('Run prepare to install isolated, lockfile-pinned dependencies first')
        run(plan[args.action], cwd=path)
        check_source(data)
    print(json.dumps(dict(candidate_id=data['candidate_id'], tag=data['tag'], version=data['version'],
        source_commit=data['source_commit'], source_path=str(path), commands=plan,
        action=args.action, deployed=False, uploaded=False, season_activated=False), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        print('Candidate operation stopped: ' + str(exc), file=sys.stderr)
        raise SystemExit(2)
