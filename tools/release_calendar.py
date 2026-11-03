"""Validate/render planning dates only. Never configures the live game."""
from datetime import date, timedelta
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/planning/release_calendar_v1.json'
REPORT = ROOT / 'docs/GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md'
REPORTS = (REPORT, ROOT / 'docs/GRIDSHARD_CANLI_OPERASYON_VE_GELISIM_PLANI_20261102.md')
START = '<!-- release-calendar:begin -->'
END = '<!-- release-calendar:end -->'


def validate(document):
    if (document.get('schema_version') != 1 or document.get('planning_only') is not True
            or document.get('timezone') != 'Europe/Istanbul'):
        raise ValueError('Calendar must remain a planning document')
    backlog = json.loads((ROOT / 'docs/planning/gridshard_development_backlog_v1.json').read_text(encoding='utf-8'))
    known = {t['id'] for t in backlog['tasks']}
    plans = {r['version']: r for r in backlog['release_plan']}
    releases = document['releases']
    if len({r['version'] for r in releases}) != len(releases):
        raise ValueError('Duplicate release')
    last_date = last_season_end = None
    for number, release in enumerate(releases, 1):
        version = release['version']
        if (version not in plans or any(plans[version].get(key) != release[key]
                for key in ('target_release_on', 'scope_freezes_on'))
                or plans[version].get('season_starts_on') != release['season']['starts_on']):
            raise ValueError('Backlog and calendar release dates differ: ' + version)
        if (release['confidence'] not in {'hedef','tahmin','koşullu'} or not release['required']
                or not release['content'] or set(release['work_items']) - known):
            raise ValueError('Missing scope, gate or work items: ' + version)
        begin, freeze, testing, target = [date.fromisoformat(release[k]) for k in
            ('work_starts_on','scope_freezes_on','tests_start_on','target_release_on')]
        if not begin < freeze <= testing < target or (last_date and target <= last_date):
            raise ValueError('Invalid development/release sequence: ' + version)
        season = release['season']
        starts, ends = date.fromisoformat(season['starts_on']), date.fromisoformat(season['ends_on'])
        if (target >= starts or ends - starts != timedelta(days=28) or starts.weekday() != 0
                or season['starts_at_utc'] != '00:00' or season['number'] != number
                or (last_season_end and starts != last_season_end)):
            raise ValueError('Invalid season or rollout buffer: ' + version)
        last_date, last_season_end = target, ends
    return releases


def render(document, releases):
    display = lambda value: date.fromisoformat(value).strftime('%d.%m.%Y')
    rows = [START, '| Sürüm | Çalışma dönemi | Kapsam kapanışı | Hedef yayın | Sezon başlangıcı | Oyuncuya gelen ana içerik | Kesinlik |',
            '| --- | --- | --- | --- | --- | --- | --- |']
    for r in releases:
        rows.append(f"| **{r['version']}** | {display(r['work_starts_on'])}–{display(r['scope_freezes_on'])} | {display(r['scope_freezes_on'])} | **{display(r['target_release_on'])}** | {display(r['season']['starts_on'])}, 03.00 TR | {r['content']} | {r['confidence']} |")
    rows += ['', '| Sezon | Başlangıç — bitiş (bitiş hariç) | Modül planı |', '| --- | --- | --- |']
    for r in releases:
        s = r['season']
        rows.append(f"| S{s['number']} | {display(s['starts_on'])}–{display(s['ends_on'])}, 03.00 TR | {s['module']} |")
    rows += ['', END]
    return '\n'.join(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    args = parser.parse_args()
    document = json.loads(SOURCE.read_text(encoding='utf-8'))
    releases = validate(document)
    for report in REPORTS:
        text = report.read_text(encoding='utf-8')
        start, end = text.index(START), text.index(END) + len(END)
        expected = text[:start] + render(document, releases) + text[end:]
        if args.write:
            report.write_text(expected, encoding='utf-8')
        elif expected != text:
            raise ValueError('Release table differs; run python tools/release_calendar.py --write')
    print(json.dumps({'releases':len(releases),'dates_and_backlog_equal':True,'season_days':28,'production_changed':False}))


if __name__ == '__main__':
    main()
