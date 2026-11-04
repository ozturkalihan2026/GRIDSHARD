"""Fresh reports must not claim PASS from missing, skipped or incomplete evidence."""
import importlib.util
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('browser_evidence', ROOT / 'tools/browser_e2e_evidence.py')
evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence)


@pytest.mark.parametrize(('report', 'status'), [
    (None, 'NOT_RUN'),
    ({'ok': True, 'skipped': True}, 'SKIPPED'),
    ({'ok': True, 'skipped': False}, 'FAILED'),
])
def test_report_without_complete_artifacts_is_never_passed(tmp_path, monkeypatch, report, status):
    monkeypatch.setattr(evidence, 'REPORT', tmp_path / 'browser.json')
    monkeypatch.setattr(evidence, 'ARTIFACT_DIR', tmp_path / 'artifacts')
    monkeypatch.setattr(evidence, 'PLAYWRIGHT_REPORT', tmp_path / 'playwright.json')
    monkeypatch.setattr(evidence, 'OUTPUT', tmp_path / 'summary.json')
    if report is not None:
        evidence.REPORT.write_text(json.dumps(report), encoding='utf-8')
    assert evidence.main() == 0
    result = json.loads(evidence.OUTPUT.read_text(encoding='utf-8'))
    assert result['status'] == status
    assert result['evidence_complete'] is False
    assert result['automatic_pass_from_skip'] is False
