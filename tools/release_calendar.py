"""Validate/render planning dates only. Never configures the live game."""
from datetime import date, datetime, timedelta, timezone
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
        if plans[version].get('server_transition') != release.get('server_transition'):
            raise ValueError('Backlog and calendar maintenance windows differ: '+version)
        policy = release.get('server_transition_policy')
        if plans[version].get('server_transition_policy') != policy:
            raise ValueError('Backlog and calendar transition policies differ: '+version)
        if policy:
            prior = next((r for r in releases if r['season']['number'] == policy['after_season_number']), None)
            if prior is None or prior['season']['number'] >= release['season']['number']:
                raise ValueError('Transition policy requires an earlier season: '+version)
            earliest = datetime.fromisoformat(policy['not_before'].replace('Z','+00:00'))
            season_end = datetime.fromisoformat(prior['season']['ends_on']+'T'+prior['season']['starts_at_utc']+':00+00:00')
            if (earliest.tzinfo is None or earliest < season_end
                    or policy['requires_closeout_acceptance'] is not True
                    or policy['exact_window_status'] != 'not_scheduled'):
                raise ValueError('Server transition must follow accepted season closeout: '+version)
        maintenance=release.get('server_transition')
        if maintenance:
            start=datetime.fromisoformat(maintenance['starts_at'].replace('Z','+00:00'))
            end=datetime.fromisoformat(maintenance['ends_at'].replace('Z','+00:00'))
            minutes=maintenance['duration_minutes']
            if (start.tzinfo is None or end.tzinfo is None or type(minutes) is not int or minutes<=0
                    or end-start!=timedelta(minutes=minutes) or maintenance['timezone']!='Europe/Istanbul'
                    or start.astimezone(timezone(timedelta(hours=3))).date().isoformat()!=release['target_release_on']):
                raise ValueError('Invalid maintenance window: '+version)
        if (release['confidence'] not in {'hedef','tahmin','koşullu'} or not release['required']
                or not release['content'] or set(release['work_items']) - known):
            raise ValueError('Missing scope, gate or work items: ' + version)
        begin, freeze, testing, target = [date.fromisoformat(release[k]) for k in
            ('work_starts_on','scope_freezes_on','tests_start_on','target_release_on')]
        expedited = release.get('expedited_patch')
        if plans[version].get('expedited_patch') != expedited:
            raise ValueError('Backlog and calendar expedited decisions differ: ' + version)
        if expedited and (date.fromisoformat(expedited['decision_on']) != target
                or date.fromisoformat(expedited['previous_target_release_on']) <= target
                or not expedited.get('reason', '').strip()
                or expedited.get('season_calendar_unchanged') is not True):
            raise ValueError('Invalid expedited patch decision: ' + version)
        valid_sequence = begin < freeze <= testing and (testing <= target if expedited else testing < target)
        if not valid_sequence or (last_date and target <= last_date):
            raise ValueError('Invalid development/release sequence: ' + version)
        season = release['season']
        starts, ends = date.fromisoformat(season['starts_on']), date.fromisoformat(season['ends_on'])
        non_monday = season.get('operator_anchored_weeks') is True
        manual = season.get('start_mode') == 'manual'
        if (target >= starts or ends - starts != timedelta(days=28) or (starts.weekday() != 0 and not non_monday)
                or season['starts_at_utc'] != '00:00' or season['number'] != number
                or (last_season_end and (starts < last_season_end or (starts != last_season_end and not manual)))):
            raise ValueError('Invalid season or rollout buffer: ' + version)
        last_date, last_season_end = target, ends
    return releases


def maintenance_summary(release):
    maintenance=release.get('server_transition')
    if not maintenance:return ''
    tr=timezone(timedelta(hours=3))
    display=lambda value:datetime.fromisoformat(value.replace('Z','+00:00')).astimezone(tr).strftime('%d.%m.%Y %H.%M')
    minutes=maintenance['duration_minutes']
    duration=f'{minutes//60} saat' if minutes%60==0 else f'{minutes} dakika'
    return (f"**{release['version']} sunucu bakım penceresi:** {display(maintenance['starts_at'])} → "
            f"{display(maintenance['ends_at'])}, Türkiye saati; yaklaşık {duration}. Sezon açılışı ayrı tarihtedir.")


def season_timing_note(season):
    if season.get('start_mode') == 'manual':
        return 'koşullu hedef; ayrıca operatör onayı, otomatik açılmaz'
    if season.get('depends_on_season'):
        return f"S{season['depends_on_season']} onayına bağlı tahmin"
    if season.get('start_mode') == 'automatic':
        return 'otomatik açılış'
    return ''


def publication_label(release):
    return 'yayımlandı' if release.get('publication_status') == 'published' else release['confidence']


def transition_policy_summary(release):
    policy = release.get('server_transition_policy')
    if not policy: return ''
    local = datetime.fromisoformat(policy['not_before'].replace('Z','+00:00')).astimezone(timezone(timedelta(hours=3)))
    return (f"**Canlı sunucu geçişi:** S{policy['after_season_number']} kapanışı ve ödül teslimi "
            f"doğrulandıktan sonra; en erken {local.strftime('%d.%m.%Y %H.%M')} TR. "
            'Kesin bakım penceresi henüz belirlenmedi. Paket hazırlık hedefi canlı geçiş tarihi değildir.')


def render(document, releases):
    display = lambda value: date.fromisoformat(value).strftime('%d.%m.%Y')
    rows = [START]
    if document.get('season_intermission_policy'):
        rows += ['**Güncel sezon ve ara kararı:** ' + document['season_intermission_policy'], '']
    for release in releases:
        if release.get('development_policy'):
            rows += [f"**{release['version']} geliştirme ve yayın kararı:** {release['development_policy']}", '']
    rows += ['| Sürüm | Çalışma dönemi | Kapsam kapanışı | Hedef yayın | Sezon başlangıcı | Oyuncuya gelen ana içerik | Kesinlik |',
            '| --- | --- | --- | --- | --- | --- | --- |']
    for r in releases:
        label = f"[{r['version']}](planning/releases/{r['version']}.md)" if r.get('delivery_document') else r['version']
        note = season_timing_note(r['season'])
        timing = f" ({note})" if note else ''
        target = f"**{display(r['target_release_on'])}**"
        if r.get('server_transition_policy'): target += ' paket hazırlığı; canlı S1 sonrası'
        rows.append(f"| **{label}** | {display(r['work_starts_on'])}–{display(r['scope_freezes_on'])} | {display(r['scope_freezes_on'])} | {target} | {display(r['season']['starts_on'])}, 03.00 TR{timing} | {r['content']} | {publication_label(r)} |")
    rows += ['', '| Sezon | Başlangıç — bitiş (bitiş hariç) | Modül planı |', '| --- | --- | --- |']
    for r in releases:
        s = r['season']
        note = season_timing_note(s)
        note = f' ({note})' if note else ''
        rows.append(f"| S{s['number']} | {display(s['starts_on'])}–{display(s['ends_on'])}, 03.00 TR{note} | {s['module']} |")
    for r in releases:
        if r.get('server_transition'):rows+=['',maintenance_summary(r)]
        if r.get('server_transition_policy'):rows+=['',transition_policy_summary(r)]
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
