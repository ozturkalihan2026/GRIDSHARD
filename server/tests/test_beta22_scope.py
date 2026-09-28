from pathlib import Path
import json
from fastapi.testclient import TestClient
from app.main import app
ROOT=Path(__file__).resolve().parents[2]
client=TestClient(app)

def test_audio_mastering_decision_stays_manual():
    decision=json.loads((ROOT/'docs/AUDIO_MASTERING_TARGET_DECISION.json').read_text(encoding='utf-8'))
    assert decision['mastering_target_selected'] is False
    assert decision['automatic_mastering_apply'] is False
    assert all(x['apply'] is False for x in decision['candidate_profiles'])
