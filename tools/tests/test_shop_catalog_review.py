"""Offline publisher never rewrites its source or a published baseline."""
import json

from tools.prepare_shop_offers import main
from app.shop_offers import CATALOG_PATH, seal_offer


def test_check_reports_reviewed_budget_and_no_runtime_write(capsys):
    original = CATALOG_PATH.read_bytes()
    assert main(['check']) == 0
    report = json.loads(capsys.readouterr().out)
    assert not report['runtime_changed'] and not report['production_changed']
    row = report['offers'][0]
    assert row['status'] == 'draft' and row['preview_count'] == 24
    assert row['price']['amount'] == 500 and row['limit']['count'] == 2
    assert CATALOG_PATH.read_bytes() == original


def publish_args(output):
    return ['publish', '--id', 'weekly.module-parts', '--revision', '1', '--at', '2026-11-16T00:00:00Z', '--output', str(output)]


def test_publication_is_new_artifact_not_a_catalog_or_runtime_change(tmp_path, capsys):
    original = CATALOG_PATH.read_bytes()
    output = tmp_path/'reviewed.json'
    assert main(publish_args(output)) == 0
    assert json.loads(output.read_text())['offers'][0]['status'] == 'published'
    assert CATALOG_PATH.read_bytes() == original
    assert main(publish_args(CATALOG_PATH)) == 2
    assert CATALOG_PATH.read_bytes() == original
    published = output.read_bytes()
    assert main(publish_args(output)) == 2
    assert output.read_bytes() == published


def test_recomputed_catalog_cannot_erase_published_history(tmp_path, capsys):
    baseline = tmp_path/'baseline.json'
    assert main(publish_args(baseline)) == 0
    document = json.loads(baseline.read_text())
    document['offers'][0]['body_en'] = 'An unreviewed rewrite with a valid recomputed hash'
    document['offers'][0] = seal_offer(document['offers'][0])
    candidate = tmp_path/'candidate.json'
    candidate.write_text(json.dumps(document), encoding='utf-8')
    assert main(['check', '--catalog', str(candidate), '--against', str(baseline)]) == 2
    assert json.loads(capsys.readouterr().err.splitlines()[-1])['code'] == 'published_offer_immutable'


def test_publication_with_missing_source_or_non_utc_time_creates_no_artifact(tmp_path):
    output = tmp_path/'published.json'
    args = publish_args(output)
    args[args.index('--at')+1] = '2026-11-16T00:00:00'
    assert main(args) == 2 and not output.exists()
    assert main(['check', '--catalog', str(tmp_path/'missing.json')]) == 2
