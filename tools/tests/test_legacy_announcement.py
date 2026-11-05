"""The 2.3 server overlay adds only System mail; never a release or season activation."""
import importlib.util
from pathlib import Path

import pytest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('legacy_notice',ROOT/'tools/prepare_legacy_announcement.py')
tool=importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


@pytest.mark.parametrize('newline',[b'\n',b'\r\n'])
def test_overlay_preserves_source_and_only_adds_mail_projection(newline):
    original=newline.join([b'from .release_updates import INBOX_UPDATE_NOTICES',
        b'def _inbox_notices(profile):',b'    notices = [dict(item) for item in INBOX_UPDATE_NOTICES]',b'    return notices',b''])
    result=tool.patched_main(original)
    assert result.replace(newline+b'from .release_announcements import active_announcements',b'').replace(
        newline+b'    notices.extend(active_announcements(VERSION, player_profile_service.now()))',b'')==original
    assert b'acknowledge' not in result and b'GRIDSHARD_SEASON_STARTS_AT' not in result
    with pytest.raises(ValueError):tool.patched_main(result)


def test_unreviewed_source_ref_is_rejected():
    with pytest.raises(ValueError):tool.files('main')
