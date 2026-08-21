from pathlib import Path
import json
from fastapi.testclient import TestClient
from app.main import app
ROOT=Path(__file__).resolve().parents[2]
client=TestClient(app)

def test_beta26_single_matchmaking_entry_and_launcher_shipped():
    html=client.get('/').text
    assert 'id="local-battle-quick-start"' not in html
    assert 'id="battle-pool-confirm"' in html
    assert '10 sn sonra AI devralır' in html
    launcher=(ROOT/'HIZLI_SAVAS_TESTI.bat').read_text(encoding='utf-8')
    assert 'BASLAT_WEB_TEST.bat' in launcher

def test_review_v3_candidate_local_keys_and_audio_options():
    app_js=(ROOT/'client/src/app.js').read_text(encoding='utf-8')
    assert 'HUMAN_REVIEW_CANDIDATE_PREFIX' in app_js
    assert 'saveCandidateReviewDraft' in app_js
    decision=json.loads((ROOT/'docs/AUDIO_MASTERING_TARGET_DECISION.json').read_text(encoding='utf-8'))
    assert decision['mastering_target_selected'] is False
    assert decision['automatic_mastering_apply'] is False
    assert all(x['apply'] is False for x in decision['candidate_profiles'])
