"""Validate/preview the first-season draft without publishing or changing a launch date."""
import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app.first_season_profile import PROFILE, validate_profile
from app.cosmetic_releases import REGISTRY
from app.liveops_content import content_coverage, load_sources

AUDIT_JSON = ROOT / 'docs/planning/season-1-stock-audit.json'
AUDIT_MD = ROOT / 'docs/planning/season-1-stock-audit.md'
AUDIT_SOURCES = (
    'server/data/first_season_launch_v1.json', 'server/data/cosmetic_releases_v1.json',
    'server/data/liveops_content_sources_v1.json', 'server/app/liveops_content.py',
    'server/app/cosmetic_releases.py', 'server/app/first_season_profile.py',
    'docs/planning/release_calendar_v1.json', 'tools/prepare_first_season.py',
)


def write_bundle(output):
    """Freeze the reviewed candidate, never the authoritative catalog or start setting."""
    registry, coverage = candidate()
    output.mkdir(parents=True,exist_ok=False)
    payloads = {'first_season_launch_v1.json':PROFILE,'candidate_cosmetic_releases_v1.json':registry.document,
                'coverage.json':coverage}
    hashes = {}
    for name,document in payloads.items():
        data = (json.dumps(document,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
        (output/name).write_bytes(data)
        hashes[name] = hashlib.sha256(data).hexdigest()
    report = dict(schema_version=1,production_changed=False,season_activated=False,
        status=PROFILE['status'],release_checks=PROFILE['release_checks'],files=hashes,
        reserved_periods=len(registry.releases),unique_personal_items=6, unique_team_items=3,
        added_common_shards=sum(p['module_shards'] for w in PROFILE['resource_weeks'] for p in w['prizes']))
    (output/'manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return report


def candidate(document=PROFILE, registry=REGISTRY):
    validate_profile(document, cosmetics=registry)
    if document['status'] == 'published':
        return registry, content_coverage(registry, cycles=1, starts_at=document['starts_at'],
            team_starts_at=_team_start(document), first_season_profile=document)
    result = registry
    for index, allocation in enumerate(document['cosmetic_allocations']):
        result = result.reserve(allocation['source'], allocation['period_id'], f's1-cosmetics-{index + 1}')
        reserved = result.releases[allocation['source'], allocation['period_id']]
        if reserved['placements'] != [dict(slot=allocation['slot'], cosmetics=allocation['cosmetics'])]:
            raise ValueError('The planned one-time cosmetic allocation is unavailable; do not recycle another set')
    for index, week in enumerate(document['resource_weeks']):
        placements = [dict(slot=p['position'], cosmetics={}, resources={k:v for k,v in p.items() if k != 'position'})
                      for p in week['prizes']]
        result = result.reserve_resources(week['period_id'], f's1-resources-{index + 1}', placements)
    coverage = content_coverage(result, cycles=1, starts_at=document['starts_at'],
        team_starts_at=_team_start(document), first_season_profile=document)
    if not coverage['stock_ready']:
        raise ValueError('The first-season draft exceeds available reviewed stock')
    return result, coverage


def _team_start(document):
    allocation = next(a for a in document['cosmetic_allocations'] if a['source'] == 'team_tournament')
    return allocation['period_id'] + 'T00:00:00Z'


def stock_audit():
    registry, coverage = candidate()
    calendar = json.loads((ROOT / 'docs/planning/release_calendar_v1.json').read_text(encoding='utf-8'))
    release = next(r for r in calendar['releases'] if r['version'] == '2.4.0')
    season = release['season']
    start = season['starts_on'] + 'T' + season['starts_at_utc'] + ':00Z'
    next_start = datetime.fromisoformat(start.replace('Z', '+00:00')) + timedelta(days=28)
    next_team = datetime.fromisoformat(_team_start(PROFILE).replace('Z', '+00:00')) + timedelta(days=28)
    if (start != PROFILE['starts_at'] or season['number'] != PROFILE['season_number']
            or season['ends_on'] != next_start.date().isoformat()):
        raise ValueError('The reviewed calendar and first-season stock profile differ')
    allocations = []
    for (source, period), allocation in sorted(registry.releases.items()):
        if (source, period) in REGISTRY.releases and allocation != REGISTRY.releases[source, period]:
            raise ValueError('An existing stock reservation changed')
        allocations.append(dict(source=source, period_id=period,
            reward_kind=allocation.get('reward_kind', 'cosmetic_set'),
            status=allocation['status'], placements=allocation['placements']))
    # Keep the old all-cosmetic projection visible. Never claim S1's limited
    # stock covers two seasons, and never borrow from shop/planned-mode pools.
    baseline = content_coverage(REGISTRY, cycles=2, starts_at=start, team_starts_at=_team_start(PROFILE))
    future = content_coverage(registry, cycles=2, starts_at=next_start, team_starts_at=next_team)
    return dict(schema_version=1, release='2.4.0', production_changed=False, season_activated=False,
        publication_ready=False, stock_ready=coverage['stock_ready'],
        source_hash_normalization='CRLF-to-LF',
        source_sha256={p:hashlib.sha256((ROOT / p).read_bytes().replace(b'\r\n', b'\n')).hexdigest() for p in AUDIT_SOURCES},
        season_calendar=dict(starts_at=start, ends_at=next_start.isoformat(), team_starts_at=_team_start(PROFILE),
                             team_ends_at=next_team.isoformat()),
        source_contracts=list(load_sources().sources.values()), allocations=allocations,
        first_season=coverage, full_cosmetic_two_cycle_baseline=baseline,
        next_two_cycles_after_s1=future,
        release_checks=PROFILE['release_checks'],
        resource_totals={k:sum(p[k] for w in PROFILE['resource_weeks'] for p in w['prizes'])
                         for k in ('circuit_credits', 'flux_shards', 'module_shards')},
        deferred_prize_policy=PROFILE['bot_competition_policy']['all_bot_prizes'])


def audit_markdown(report):
    def tr(value):
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=3))).strftime('%d.%m.%Y %H:%M')
    calendar = report['season_calendar']
    lines = ['# S1 — sezon ve etkinlik stok/kaynak denetimi', '',
        'Üreten: `python tools/prepare_first_season.py --audit-write`. '
        'Doğrulama: `python tools/prepare_first_season.py --audit-check`.', '',
        '**2.4.0 ilk sezon stoğu yeterli.** Bu çevrimdışı tahsis denetimidir; '
        'sezon açmaz, kozmetik vermez ve Android/yayın kabulünün yerine geçmez.', '',
        f"{tr(calendar['starts_at'])}–{tr(calendar['ends_at'])} TR; takım dönemi ayrı kapıyla {tr(calendar['team_starts_at'])} TR başlar. "
        'Sezon ve takım dönemi aynı 28 günü kapsar; ayrılmış üç takım ödülü korunur.', '',
        '| Kaynak | Dönem | Tür | Ayrılmış içerik |', '| --- | --- | --- | --- |']
    for allocation in report['allocations']:
        items = [i for p in allocation['placements'] for i in p['cosmetics'].values()]
        kind = 'Sabit kaynak' if allocation['reward_kind'] == 'resource_only' else 'Tekil kozmetik seti'
        content = ', '.join(items) if items else '1–3. sıra: kredi, akı ve mevcut modül parçası'
        lines.append(f"| {allocation['source']} | {allocation['period_id']} | {kind} | {content} |")
    total = report['resource_totals']
    lines += ['', 'İlk sezon için 6 oyuncu + 3 takım kozmetiği; 7 ayrı kaynak/dönem tahsisi, '
        'aynı öğeyi farklı dönemlere yeniden ayırma yok. Üç kaynak haftası açıkça tanımlıdır; '
        'eksik kozmetiğin yerine sessizce kaynak konmaz.', '',
        f"Kaynak haftalarının toplamı: {total['circuit_credits']} kredi, {total['flux_shards']} akı, "
        f"{total['module_shards']} sıradan modül parçası. Bunlar önceki ekonomi bütçesindeki tahsislerdir; ek ödül değildir.", '',
        '| Stok profili | Gereken kozmetik | Takvime ayrılmış | Serbest onaylı stok | Üretilip incelenecek |',
        '| --- | ---: | ---: | ---: | ---: |']
    for label, key in [('İlk sezon (kaynak haftaları dahil)', 'first_season'),
                       ('Eski tam kozmetik / iki çevrim', 'full_cosmetic_two_cycle_baseline'),
                       ('S1 sonrası iki çevrim / tam kozmetik', 'next_two_cycles_after_s1')]:
        rows = report[key]['content_tasks']
        sums = [sum(r[k] for r in rows) for k in ('required', 'reserved_for_calendar', 'ready_unassigned', 'create_and_review')]
        lines.append('| ' + label + ' | ' + ' | '.join(map(str, sums)) + ' |')
    lines += ['', 'Serbest stok yalnız kendi havuzunda ve aynı kozmetik alanında sayılır; fazla takım çerçevesi oyuncu çerçevesi açığını kapatmaz. Mağaza ve günlük deney adaptörleri planlı/kapalıdır; '
        'onların stoğu sezon stoğu gibi kullanılamaz. Gelecek çevrim raporu bir yayın izni değildir; '
        'gelecek sürümün onaylı kaynak/kozmetik profili ve yeni içerikleri hazırlanırken yeniden çalıştırılır.', '',
        'Tüm ödül sıraları botlara giderse mevcut paket hash ile dondurulup planın sonuna bir kez eklenir; '
        'yeni sanat stoğu veya onaylı gelecek dönem tahsisi olarak sayılmaz. Botlara teslim edilmez.', '',
        'Eksik kaynak/dönem, değiştirilmiş sabit ödül, yanlış takım takvimi, yinelenen tasarım veya yetersiz stok '
        'kontrolü başarısız yapar. Kaynak dosyalarının satır sonları normalize edilmiş SHA256 özetleri eşlik eden JSON raporundadır. '
        'Canlı profil taslak ve Android kabulü kapalı kalır.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--check', action='store_true')
    action.add_argument('--preview', action='store_true')
    action.add_argument('--audit-write', action='store_true', help='Write deterministic first-season stock evidence')
    action.add_argument('--audit-check', action='store_true', help='Fail on stale or insufficient first-season stock evidence')
    action.add_argument('--bundle', metavar='DIRECTORY',help='Write a review-only frozen candidate under qa_reports')
    args = parser.parse_args()
    if args.audit_write or args.audit_check:
        report = stock_audit()
        if not report['stock_ready']:
            raise SystemExit('First-season stock/source audit failed')
        outputs = {AUDIT_JSON:json.dumps(report,ensure_ascii=False,indent=2)+'\n', AUDIT_MD:audit_markdown(report)}
        for path, text in outputs.items():
            if args.audit_write:
                path.write_text(text,encoding='utf-8')
            elif not path.exists() or path.read_text(encoding='utf-8') != text:
                raise SystemExit('Stock evidence is stale; run --audit-write and review the changes')
        print(json.dumps(dict(stock_ready=True, periods=len(report['allocations']),
            cosmetic_items=sum(t['required'] for t in report['first_season']['content_tasks']), production_changed=False)))
        return
    if args.bundle:
        output=(ROOT/args.bundle).resolve()
        if not output.is_relative_to((ROOT/'qa_reports').resolve()):
            parser.error('A review bundle must stay in workspace qa_reports')
        print(json.dumps(write_bundle(output),indent=2))
        return
    registry, coverage = candidate()
    print(json.dumps(dict(profile_valid=True, published=PROFILE['status'] == 'published', production_changed=False,
        reserved_periods=len(registry.releases) - len(REGISTRY.releases), personal_items_reserved=6, team_items_reserved=3,
        added_common_shards=sum(p['module_shards'] for w in PROFILE['resource_weeks'] for p in w['prizes']),
        **(dict(profile=PROFILE, candidate_catalog=registry.document, coverage=coverage) if args.preview else {})),
        ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
