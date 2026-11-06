"""Validate and render connected release briefs from the planning calendar/backlog."""
from __future__ import annotations

import argparse
from datetime import date
import json
import os
from pathlib import Path

if __package__:
    from tools.development_checklist import ROOT, BACKLOG, CHECKLIST, repository_path, validate as validate_backlog
    from tools.release_calendar import SOURCE, validate as validate_calendar, maintenance_summary
else:
    from development_checklist import ROOT, BACKLOG, CHECKLIST, repository_path, validate as validate_backlog
    from release_calendar import SOURCE, validate as validate_calendar, maintenance_summary

INDEX = ROOT / 'docs/GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md'


def link(path, origin, label=None):
    relative = Path(os.path.relpath(ROOT / path, origin.parent)).as_posix()
    return f'[{label or path}]({relative})'


def task_link(identity, origin):
    return link(CHECKLIST.relative_to(ROOT).as_posix(), origin, identity)[:-1] + '#' + identity.lower() + ')'


def validate(calendar, backlog):
    validate_backlog(backlog)
    releases = validate_calendar(calendar)
    tasks = {t['id']: t for t in backlog['tasks']}
    plans = {r['version']: r for r in backlog['release_plan']}
    for release in releases:
        version = release['version']
        packages = release['delivery_packages']
        if not packages or len({p['id'] for p in packages}) != len(packages):
            raise ValueError('Empty/duplicate delivery packages: ' + version)
        expected_path = f'docs/planning/releases/{version}.md'
        if release['delivery_document'] != expected_path or plans[version].get('delivery_document') != expected_path:
            raise ValueError('Release brief paths differ: ' + version)
        if any(release[k] != plans[version][v] for k, v in
               [('content', 'scope'), ('required', 'exit'), ('excluded', 'keep_closed')]):
            raise ValueError('Release scope differs between calendar and backlog: ' + version)
        gate_ids = plans[version]['gate_tasks']
        closure = set()

        def visit(identity):
            if identity in closure:
                return
            closure.add(identity)
            for dependency in tasks[identity]['depends_on']:
                visit(dependency)

        for identity in gate_ids:
            visit(identity)
        packaged = set()
        for package in packages:
            packaged.update(package['tasks'])
            if (not package['title'] or not package['tasks'] or set(package['tasks']) - tasks.keys()
                    or package['kind'] not in {'required', 'optional'}
                    or len(package['steps']) < 3 or len(package['acceptance']) < 2):
                raise ValueError('Incomplete delivery package: ' + version + '/' + package['id'])
            if package['kind'] == 'required' and set(package['tasks']) - closure:
                raise ValueError('Required package is outside release gate: ' + version + '/' + package['id'])
        if packaged != set(release['work_items']):
            raise ValueError('Work items differ from packages: ' + version)
        for phase in release['work_schedule']:
            start, end = (date.fromisoformat(phase[k]) for k in ('starts_on', 'ends_on'))
            if (start > end or start < date.fromisoformat(release['work_starts_on'])
                    or end > date.fromisoformat(release['target_release_on'])
                    or not phase['output'] or not phase['tasks'] or set(phase['tasks']) - packaged):
                raise ValueError('Invalid release phase: ' + version)
        scheduled = {t for phase in release['work_schedule'] for t in phase['tasks']}
        if scheduled != packaged:
            raise ValueError('Unscheduled work: ' + version)
    for task in backlog['tasks']:
        expected = [r['version'] for r in releases if task['id'] in r['work_items']]
        if task.get('planned_releases', []) != expected:
            raise ValueError('Task release backlinks differ: ' + task['id'])
    return releases


def render_brief(release, backlog):
    output = ROOT / release['delivery_document']
    tasks = {t['id']: t for t in backlog['tasks']}
    plan = next(r for r in backlog['release_plan'] if r['version'] == release['version'])
    lines = [f"# {release['version']} — {plan['name']}", '',
             '> Üretilen plan. İçerik/adımlar: release_calendar_v1.json; görev durumu/kabulü: backlog. Oyun kodu tamamlanma veya yayın kanıtı değildir.', '',
             link(INDEX.relative_to(ROOT).as_posix(), output, 'Sürüm rehberi') + ' · ' +
             link(CHECKLIST.relative_to(ROOT).as_posix(), output, 'Ortak checklist') + ' · ' +
             link('docs/GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md', output, 'Takvim ve ödül kararları'), '',
             f"**Geliştirme:** {release['work_starts_on']} → kapsam kapanışı {release['scope_freezes_on']}. "
             f"**Kabul testi:** {release['tests_start_on']}. **Yayın:** {release['target_release_on']} ({release['confidence']}).", '',
             f"**S{release['season']['number']}:** {release['season']['starts_on']} → {release['season']['ends_on']} "
             '(bitiş hariç), 03.00 Türkiye saati. Paket yayını ve sezon açılışı ayrı kararlardır.', '',
             '## Oyuncuya teslim ve sınır', '', release['content'], '',
             '**Yayın kabulü:** ' + release['required'], '',
             '**İkincil kapsam:** ' + release['optional'], '',
             '**Kapsam dışında:** ' + release['excluded'], '',
             '## Hangi zamanda ne yapılacak?', '',
             '| Tarih aralığı | İşler | Somut teslim / karar |', '| --- | --- | --- |']
    for phase in release['work_schedule']:
        lines.append(f"| {phase['starts_on']}–{phase['ends_on']} | {', '.join(phase['tasks'])} | {phase['output']} |")
    if release.get('server_transition'):
        position=lines.index('## Oyuncuya teslim ve sınır')
        lines[position:position]=[maintenance_summary(release),'']
    if release.get('development_policy'):
        position=lines.index('## Oyuncuya teslim ve sınır')
        lines[position:position]=['**Geliştirme ve yayın kararı:** '+release['development_policy'],'']
    lines += ['', 'Aralıklar aynı ana geliştirme akışının iş sırasıdır; eşzamanlı tam zamanlı ekip varsayımı değildir. '
              'Gözlem/patch için ayrılan kapasite kullanılır; kapsam kapanışında yeni özellik eklenmez.', '',
              '## İçerik nasıl geliştirilecek?', '']
    for package in release['delivery_packages']:
        lines += [f"### {package['id']} — {package['title']}", '',
                  '**' + ('Zorunlu' if package['kind'] == 'required' else 'İsteğe bağlı; ana sürümü engellemez') + '**', '']
        for i, step in enumerate(package['steps'], 1):
            lines.append(f'{i}. {step}')
        lines += ['', 'Paket kabulü:', '']
        lines += [f'- {criterion}' for criterion in package['acceptance']]
        lines += ['', 'Görevler ve dosya bağlantıları:', '']
        for identity in package['tasks']:
            t = tasks[identity]
            lines += [f"- {'[x]' if t['status'] in {'done', 'branch_ready'} else '[ ]'} "
                      f"{task_link(identity, output)} — {t['title']} ({t['status']}); "
                      f"önkoşullar: {', '.join(t['depends_on']) or 'yok'}."]
            lines.append('  - Mevcut: ' + ', '.join(link(p, output) for p in t['existing_paths']) + '.')
            if t['proposed_paths']:
                lines.append('  - Üretilecek teslim (henüz mevcut olmayabilir): ' + ', '.join(f'`{p}`' for p in t['proposed_paths']) + '.')
            for criterion in t['acceptance']:
                lines.append('  - Kabul: ' + criterion)
            if t['evidence']:
                # Ignored local outputs must render identically in a clean CI
                # checkout and on the machine that produced the evidence.
                records = [f'`{p}` (yerel kabul kaydı; depoya dahil değildir)'
                           if p.split('/', 1)[0] in {'artifacts', 'qa_reports', 'deliverables'}
                           else link(p, output) if repository_path(p).exists()
                           else f'`{p}` (tarihsel referans; bu yerel kopyada yok)'
                           for p in t['evidence']]
                lines.append('  - Önceki hazırlık kaydı (güncel kabul yerine geçmez): ' + ', '.join(records) + '.')
        lines.append('')
    lines += ['## Yayın, sezon ve sonraki pakete devir', '',
              '- [ ] Zorunlu paketlerdeki görevler ve alt kabul maddeleri kanıtlandı; görev dosyasına test/cihaz/rapor yolları yazıldı.',
              '- [ ] Yeni istemci ve desteklenen eski istemciler, veri koruyan geçiş, yedek/restore ve hak koruyan kapatma kabul edildi.',
              '- [ ] TR/EN 320×568 ve 393×852; ilgili savaş performansı, ses tercihi ve gerçek Android güncellemesi kabul edildi.',
              '- [ ] Yeşil CI, minor sürüm notu, imzalı AAB ve kontrollü yayın kaydı var. Bir haftalık gözlem sonrası sezon için ayrı açılış kararı var.',
              '- [ ] Sonraki sezonun yeni modülü/özgün stoğu hazır değilse bekleme durumu görünür; eski ödül tekrarı veya hak silme yok.', '',
              'Görev kutuları backlog durumundan üretilir. Durum ve kanıtlar backlog içinde güncellenir, üç plan aracı yeniden çalıştırılır. '
              'Paket kabul maddeleri koşulları, son yayın kutuları inceleme şablonunu gösterir; otomatik oyun testi sonucu değildir.', '']
    return '\n'.join(lines)


def render_index(releases, backlog):
    lines = ['# GRIDSHARD — sürümlere göre bağlı uygulama rehberi', '',
             '**4 Kasım 2026.** 3 Kasım takvimi ve ürün yönü korunur. İlk çalışma 2.4.0; '
             'sarı geri/ileri kontrolleri, saldırı/çekirdek sesleri, Topla kasa açılışı ve XP emirleri bu paketin zorunlu kapsamına eklendi. '
             + link('docs/planning/season-1-rewards-and-xp.md', INDEX, 'S1 ödül ve XP sözleşmesi') + '.', '',
             '## Kullanım ve tek kaynak düzeni', '',
             '1. Takvimden sürümü aç; aşağıdaki ayrıntılı brief içinden iş sırasını, uygulama adımlarını ve dosyaları takip et.',
             '2. Görev durumu, önkoşullar, kabul ve kanıtlar ' + link(BACKLOG.relative_to(ROOT).as_posix(), INDEX, 'backlog') + ' içinde tutulur.',
             '3. Tarihler, sürüme özel alt paketler ve çalışma aralıkları ' + link(SOURCE.relative_to(ROOT).as_posix(), INDEX, 'takvim JSON') + ' içinde tutulur.',
             '4. Checklist, takvim tabloları ve bu brief’ler kaynaklardan yeniden üretilir; elle durum çoğaltılmaz.', '',
             '```powershell', 'python tools/development_checklist.py --write', 'python tools/release_calendar.py --write',
             'python tools/release_delivery_plan.py --write',
             'python tools/development_checklist.py --check', 'python tools/release_calendar.py --check',
             'python tools/release_delivery_plan.py --check', '```', '',
             '## Sürüm özeti ve ayrıntılı içerik bağlantıları', '',
             '| Sürüm / brief | Somut içerik | Çalışma başlangıcı | Kapsam kapanışı | Kabul testleri | Yayın hedefi | Sezon |',
             '| --- | --- | --- | --- | --- | --- | --- |']
    policy_lines=[]
    for release in releases:
        if release.get('development_policy'):
            policy_lines += [f"**{release['version']} geliştirme ve yayın kararı:** {release['development_policy']}", '']
    lines[4:4]=policy_lines
    for r in releases:
        lines.append(f"| {link(r['delivery_document'], INDEX, r['version'])} | {r['content']} | {r['work_starts_on']} | {r['scope_freezes_on']} | {r['tests_start_on']} | {r['target_release_on']} ({r['confidence']}) | S{r['season']['number']}: {r['season']['starts_on']}, 03.00 TR |")
    for r in releases:
        if r.get('server_transition'):lines+=['',maintenance_summary(r)]
    lines += ['', '## Kapasite ve karar sınırları', '',
              '- Tek ana akış, haftada 5 gün/günde 4–6 saat ve yaklaşık %20 hata/test/gözlem payı önceki varsayımdır. '
              'Önceki buton/ses kapsamı için 2.4.0 ön tahmini 14–17 aktif gündü; kasa açılışı, çekirdek teslimi ve '
              'XP emirleri bu tahmine ek iştir ve efor yeniden ölçülmelidir. '
              '6 Kasım kontrolünde eski 12–15 gün bandına ek yük ölçülür. 16 Kasım kapanışına sığmıyorsa takvim yeniden karara bağlanır; zorunlu kalite işi sessizce çıkarılmaz.',
              '- 2.5.0 kapsamı yoğun: seçim/mağaza, 1 modül ve 10 oyuncu öğesi. 30 Kasım kontrolünde darboğaz ölçülür; '
              'ikincil teklifler önce çıkarılır, ana teslimler yetişmiyorsa tarih yeniden planlanır.',
              '- 2.6–2.8 eforları 4 Ocak 2027’de; Draft ve S6 modül brief’i 1 Mart 2027’de değerlendirilir. '
              '1 Mart, 2.9.0 geliştirmesinden önce karar kontrolüdür; ayrı üretim başlangıcı değildir.',
              '- Kaynak miktarı, fiyat, hasar/süre, katkı eşiği ve draft katılım eşikleri ilgili rapor/prototipten sonra '
              'sayısal karar dosyasına yazılır. Bu değerler kesinleşmeden ilgili özellik yayınlanamaz; plan sayıları uydurmaz.',
              '- COS-02 üst üretim işi 18 öğenin toplamıdır; sürüm kapıları COS-05/06/07 alt gruplarını izler. '
              'CARD-03 fizibilite işidir; CARD-04/05/06 gerçek modül teslim kapılarıdır. Lisans/kupon REWARD-05 ortak araştırması ana sürümü kilitlemez.', '',
              '## Tarihsiz kalan destek ve araştırma işleri', '',
              'Aşağıdaki işler kaybolmadı; ana paketlerin zorunlu kapsamına kendiliğinden eklenmez. '
              'Bir sürüme alınırsa takvim paketi, bağımlılık ve çıkış kapısı birlikte güncellenir.', '']
    assigned = {t for r in releases for t in r['work_items']}
    for t in backlog['tasks']:
        if t['id'] not in assigned and t['status'] not in {'done', 'branch_ready'}:
            lines.append(f"- {task_link(t['id'], INDEX)} — {t['title']} ({t['status']}).")
    lines += ['', 'Ortak sanat yönü: ' + link('docs/SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md', INDEX) + '. '
              'Teknik sözleşmeler: ' + link('docs/GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md', INDEX) + '.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    args = parser.parse_args()
    calendar = json.loads(SOURCE.read_text(encoding='utf-8'))
    backlog = json.loads(BACKLOG.read_text(encoding='utf-8'))
    releases = validate(calendar, backlog)
    outputs = {INDEX: render_index(releases, backlog)}
    outputs.update({ROOT / r['delivery_document']: render_brief(r, backlog) for r in releases})
    for path, expected in outputs.items():
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(expected, encoding='utf-8')
        elif path.read_text(encoding='utf-8') != expected:
            raise ValueError(f'Stale delivery plan: {path}; run --write')
    print(json.dumps({'release_briefs': len(releases), 'packages': sum(len(r['delivery_packages']) for r in releases),
                      'gate_coverage': True, 'runtime_changed': False}))


if __name__ == '__main__':
    main()
