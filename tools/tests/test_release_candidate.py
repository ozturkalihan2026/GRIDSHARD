"""A frozen release must remain independent from future development and local edits."""
import json
from pathlib import Path
import subprocess

import pytest
from tools import release_candidate as candidate


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()


@pytest.fixture
def repo(tmp_path):
    git(tmp_path, 'init')
    for name, data in {
        'package.json': {'version':'2.4.0','gridshard':{'androidVersionCode':15}},
        'config/android-production.json': {'versionName':'2.4.0','versionCode':15},
    }.items():
        path=tmp_path/name;path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(data))
    path=tmp_path/'server/app/version.py';path.parent.mkdir(parents=True)
    path.write_text('VERSION = "2.4.0"\n')
    (tmp_path/'.gitignore').write_text('qa_reports/\nnode_modules/\n')
    git(tmp_path,'add','.')
    git(tmp_path,'-c','user.name=Release tests','-c','user.email=release-tests@example.invalid','commit','-m','candidate')
    git(tmp_path,'tag','v2.4.0-rc.1')
    data=dict(schema_version=1,version='2.4.0',version_code=15,candidate_id='2.4.0-rc1',tag='v2.4.0-rc.1',source_commit=git(tmp_path,'rev-parse','HEAD'))
    return tmp_path,data


def test_new_development_cannot_enter_the_frozen_source(repo):
    root,data=repo
    frozen=candidate.prepare(data,root=root,source_only=True)
    (root/'future-module.txt').write_text('not for 2.4.0')
    git(root,'add','future-module.txt')
    git(root,'-c','user.name=Release tests','-c','user.email=release-tests@example.invalid','commit','-m','future content')
    assert candidate.check_source(data,root)==frozen
    assert not (frozen/'future-module.txt').exists()
    (frozen/'package.json').write_text('{}')
    with pytest.raises(ValueError,match='dirty'):
        candidate.check_source(data,root)


def test_wrong_head_is_rejected_without_resetting_it(repo):
    root,data=repo
    frozen=candidate.prepare(data,root=root,source_only=True)
    (frozen/'wrong.txt').write_text('wrong source')
    git(frozen,'add','wrong.txt')
    git(frozen,'-c','user.name=Release tests','-c','user.email=release-tests@example.invalid','commit','-m','wrong head')
    wrong=git(frozen,'rev-parse','HEAD')
    with pytest.raises(ValueError,match='Wrong candidate commit'):
        candidate.check_source(data,root)
    assert git(frozen,'rev-parse','HEAD')==wrong


def test_build_commands_use_only_frozen_paths_and_never_deploy(repo):
    root,data=repo
    frozen=candidate.prepare(data,root=root,source_only=True)
    plan=candidate.commands(data,frozen,root=root)
    assert str(frozen/'tools/build-android-production.ps1') in plan['aab']
    assert str(root/'secrets/android-release') in plan['aab']
    assert plan['server-image'][-1]==str(frozen)
    assert data['source_commit'] in ' '.join(plan['server-image'])
    assert set(plan)=={'aab','server-image','server-source'}


def test_mismatched_version_and_unsafe_manifest_are_rejected(repo):
    root,data=repo
    with pytest.raises(ValueError,match='identities disagree'):
        candidate.validate_pin({**data,'version_code':99},root)
    with pytest.raises(ValueError,match='Invalid release version'):
        candidate.load_candidate('../../secret',root)


def test_ignored_future_art_in_source_also_stops_a_build(repo):
    root,data=repo
    frozen=candidate.prepare(data,root=root,source_only=True)
    art=frozen/'client/assets/new-concept.png';art.parent.mkdir(parents=True)
    exclude=Path(git(frozen,'rev-parse','--git-path','info/exclude'))
    if not exclude.is_absolute():exclude=frozen/exclude
    exclude.parent.mkdir(parents=True,exist_ok=True)
    with exclude.open('a') as stream:stream.write('\n*.png\n')
    art.write_bytes(b'future concept')
    with pytest.raises(ValueError,match='Ignored extra files'):
        candidate.check_source(data,root)
