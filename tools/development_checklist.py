"""Validate and render the planning backlog; never starts the game or changes runtime data."""
from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BACKLOG = ROOT / 'docs/planning/gridshard_development_backlog_v1.json'
CHECKLIST = ROOT / 'docs/GRIDSHARD_GELISIM_CHECKLIST_20261103.md'
STATUSES = {'todo': 'Yapılacak', 'branch_ready': 'Dalda hazır; canlıda yok',
            'in_progress': 'Çalışılıyor', 'done': 'Kanıtla tamamlandı', 'later': 'Ölçüme bağlı ileri aşama'}
GOALS = {'shop', 'chests', 'rewards', 'content', 'presentation', 'modes', 'analytics', 'operations'}


def repository_path(value):
    if not isinstance(value, str) or not value or '\\' in value:
        raise ValueError(f'Invalid repository path: {value!r}')
    target = (ROOT / value).resolve()
    if not target.is_relative_to(ROOT) or Path(value).is_absolute():
        raise ValueError(f'Path outside repository: {value!r}')
    return target


def validate(document):
    if document.get('schema_version') != 1 or document.get('runtime_changes_authorized_by_this_file') is not False:
        raise ValueError('Invalid planning schema or runtime boundary')
    if set(document['goals']) != GOALS:
        raise ValueError('All eight project goals must remain covered')
    tasks = document['tasks']
    art = document.get('art_direction', {})
    if (art.get('policy') != 'preserve_approved_direction' or not art.get('change_requires')
            or not repository_path(art.get('document', '')).is_file()):
        raise ValueError('Shared art direction and a transition gate are required')
    ids = [t['id'] for t in tasks]
    if len(ids) != len(set(ids)) or not ids:
        raise ValueError('Empty or duplicate task IDs')
    by_id = {t['id']: t for t in tasks}
    covered, old_sections = set(), set()
    for relative in document['planning_docs']:
        if not repository_path(relative).is_file():
            raise ValueError(f'Missing planning document: {relative}')
    for t in tasks:
        if not re.fullmatch(r'[A-Z]{2,8}-\d{2}', t['id']):
            raise ValueError(f'Invalid task ID: {t["id"]}')
        if (not t['title'] or not t['owner'] or t['priority'] not in {'P0', 'P1', 'P2'}
                or t['effort'] not in {'S', 'M', 'L', 'XL'}
                or t['status'] not in STATUSES or t['stage'] not in document['stages']):
            raise ValueError(f'Incomplete task metadata: {t["id"]}')
        if len(t['acceptance']) < 2 or any(not isinstance(a, str) or not a.strip() for a in t['acceptance']):
            raise ValueError(f'Missing acceptance criteria: {t["id"]}')
        if not t['goals'] or not set(t['goals']) <= GOALS:
            raise ValueError(f'Invalid goals: {t["id"]}')
        covered.update(t['goals'])
        old_sections.update(t['old_plan_sections'])
        if set(t['depends_on']) - set(ids) or t['id'] in t['depends_on']:
            raise ValueError(f'Unknown/self dependency: {t["id"]}')
        if len(t['depends_on']) != len(set(t['depends_on'])):
            raise ValueError(f'Duplicate dependency: {t["id"]}')
        if not t['existing_paths']:
            raise ValueError(f'Task must connect to existing infrastructure: {t["id"]}')
        for relative in t['existing_paths']:
            if not repository_path(relative).exists():
                raise ValueError(f'Missing existing path in {t["id"]}: {relative}')
        for relative in t['proposed_paths']:
            repository_path(relative)
        if t['status'] in {'done', 'branch_ready'} and not t['evidence']:
            raise ValueError(f'Completed/branch-ready task needs evidence: {t["id"]}')
    if covered != GOALS or not set(range(3, 10)) <= old_sections:
        raise ValueError('Original plan coverage was lost')
    temporary, permanent, order = set(), set(), []

    def visit(identity):
        if identity in temporary:
            raise ValueError(f'Dependency cycle at {identity}')
        if identity in permanent:
            return
        temporary.add(identity)
        for dependency in by_id[identity]['depends_on']:
            visit(dependency)
        temporary.remove(identity)
        permanent.add(identity)
        order.append(identity)

    for identity in ids:
        visit(identity)
    releases = document.get('release_plan', [])
    versions = [r['version'] for r in releases]
    if not releases or len(versions) != len(set(versions)) or versions[0] != document['proposed_first_minor']:
        raise ValueError('Release plan must start with the proposed first minor and use unique versions')
    if any(not re.fullmatch(r'\d+\.\d+\.0', version) for version in versions):
        raise ValueError('Feature releases must have a full minor version')
    if versions != sorted(versions, key=lambda v: tuple(map(int, v.split('.')))):
        raise ValueError('Release versions must be in publication order')
    for release in releases:
        if (release['stage'] not in document['stages'] or not release['gate_tasks']
                or set(release['gate_tasks']) - set(ids)
                or any(not release.get(k) for k in ('name', 'scope', 'keep_closed', 'exit'))):
            raise ValueError(f'Invalid release gate: {release["version"]}')
    for t in tasks:
        if t['status'] in {'done', 'branch_ready'}:
            if any(by_id[d]['status'] not in {'done', 'branch_ready'} for d in t['depends_on']):
                raise ValueError(f'Completed task has incomplete prerequisites: {t["id"]}')
    return order


def render(document, order):
    tasks = document['tasks']
    deployed = document.get('deployment_status', {}).get('server_release') == '2.3.0'
    published = document.get('deployment_status', {}).get('play_rollout_confirmed_by_user') is True
    release_status = ('2.3.0 sunucu ve AAB yayını kullanıcı tarafından teyit edildi; RELEASE-00 tamam. '
                      'Fiziksel cihaz testinin ayrıca raporlanmadığı kayıtta korunur. '
                      'Aktif geliştirme 2.4.0 mevcut 24 modülle ilk sezon açılışıdır; geniş üretim sonraki paketlere bölündü.' if published else
                      '2.3.0 sunucu geçişi ve imzalı AAB code14 teslimi tamamlandı. Play yükleme/yayını '
                      've fiziksel cihaz güncellemesi bekliyor; RELEASE-00 bu nedenle açık. Sonraki geliştirme '
                      'kademesi 2.4.0 dönem içeriği ve ödül takvimidir.')
    counts = Counter(t['status'] for t in tasks)
    summary = ', '.join(f'**{counts[status]} {label.lower()}**'
                        for status, label in STATUSES.items() if counts[status])
    lines = ['# GRIDSHARD — uygulanabilir gelişim kontrol listesi', '',
             '**Tarih: 3 Kasım 2026 · Proje: mağaza, ödül, içerik ve yaşayan oyun**', '',
             'Bu dosya araştırmayı uygulanabilir işlere böler. Toplam '
             f'**{len(tasks)} iş** vardır: {summary}. '
             'Dalda hazır iş canlıda yayımlanmış sayılmaz. Yeni mağaza, seçim kasası ve modlar henüz uygulanmadı.', '',
             '**Son ayrıntılandırma: 4 Kasım 2026.** Takvim → sürüm briefi → görev → dosya/kanıt bağlantıları kuruldu; '
             '2.4.0 sarı geri/ileri kontrolleri ve saldırı/çekirdek sesleri zorunlu kapsamdadır.', '',
             '## 1. Proje dosyaları ve kullanım', '',
             '- [Önceki gelişim planı](GRIDSHARD_CANLI_OPERASYON_VE_GELISIM_PLANI_20261102.md): ürün yönü ve ilk araştırma.',
             '- [Yeni rakip/ödül araştırması](GRIDSHARD_MAGAZA_ODUL_ARASTIRMASI_20261103.md): kaynaklar, tarih ve çıkarımlar.',
             '- [Teknik tasarım](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md): mevcut/yeni altyapı, veri/API ve ekran sözleşmeleri.',
             '- [Ortak sanat yönü](SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md): bütün paketler için referans aile ve yön değişikliği koşulları.',
             '- [2.4.0 geliştirme kademeleri](RELEASE_2_4_0_GELISTIRME_PLANI_20261103.md): güncel kapsam, ilk stok uygulaması ve sonraki üretim işleri.',
             '- [Ödül portföyü ve tarihli yayın takvimi](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md): ödül çeşitleri, haftalık iş, kapsam kapanışı, sürüm ve sezon tarihleri.',
             '- [Makine tarafından okunabilir iş listesi](planning/gridshard_development_backlog_v1.json): görevlerin tek kaynağı.', '',
             '- [Sürüm uygulama rehberi](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md): her sürümün alt paketleri, çalışma aralıkları, dosyaları ve kabulü.', '',
             'Görevi güncellemek için JSON içindeki `status`, `evidence` ve gerekiyorsa kabul '
             'ölçütlerini düzenle. Sonra repo kökünde çalıştır:', '',
             '```powershell', 'python tools/development_checklist.py --write',
             'python tools/development_checklist.py --check', '```', '',
             'Bağlı brief ve takvim için ayrıca `python tools/release_calendar.py --write` ve '
             '`python tools/release_delivery_plan.py --write` çalıştır; ardından ikisinin `--check` komutunu kullan.', '',
             'Araç yalnız planı okur/yazar; oyun, sunucu, veritabanı veya mağazayı başlatmaz. '
             'Bağımlılık döngüsü, geçersiz kimlik, eksik kaynak yolu, kapsam kaybı ve işaretlenen '
             'işin kanıt eksikliğini denetler. Oyun testlerinin yerine geçmez. '
             'Bu Markdown dosyası üretilir; kalıcı görev değişikliklerini JSON üzerinden yap.', '',
             'Durumlar: `todo`, `in_progress`, `branch_ready`, `done`, `later`. '
             '`[x]` ile işaretlenen dal hazırlığının yanında canlıda olmadığı açıkça yazılır. '
             'Gelecek işe yalnız tanımı hazır diye `done` yazılmaz.', '',
             '## 2. Ürün kararları', '',
             '1. Yeni ürünün oyuncu faydası önce tanımlanır: hedefli ilerleme, seçim, koleksiyon veya ustalık.',
             '2. Mevcut dört sandığın fiyat/olasılık/hediye hakları korunarak baz ölçüm yapılır; yeni miktarlar ekonomik rapordan sonra seçilir.',
             '3. İlk mağaza pilotu garantili parça ve ayrı kozmetik stoğudur. Yeni gerçek para paketleri ayrı sonraki kapıdadır.',
             '4. Sezon/etkinlik koleksiyon ödülü başka dönemde veya mağazada tekrar sunulmaz. Kaynak para/parçalar tekrar kullanılabilir.',
             '5. Yeni modlar tek etkinlik penceresiyle başlar; her mod için sürekli PvP kuyruğu açılmaz.',
             '6. Kozmetik savaş gücü vermez; mevcut premium ilerleme avantajları yokmuş gibi pazarlanmaz.',
             '7. Yeni para birimi, ücretli yeniden çekiliş, oyuncular arası ticaret ve web ödeme mağazası ilk kapsamda değildir.', '',
             'Bütün sürümlerde mevcut onaylı sanat yönü korunur. Yön değişecekse önce '
             'brief, yan yana örnekler, varlık/ekran envanteri ve geçiş işleri hazırlanır; '
             'tek ekranın farklı stile kayması tamamlanmış geçiş sayılmaz.', '',
             '## 3. Hazır olan ile yapılacak olanın sınırı', '',
             '| Durum | İçerik |', '| --- | --- |',
             ('| Canlı sunucu 2.3.0 | Profil/takım düzeltmeleri, ortak yalnız-ok geri düğmeleri ve sürüm mesajları; mevcut mağaza/sandık/ödül sistemi korunur. |' if deployed else
              '| Canlı 2.2.1 | Profil/takım düzeltmeleri, yeni mesaj sırası, mevcut mağaza/sandık/ödül sistemi. |'),
             ('| Canlıda kilitli | 15 kozmetik ve üç tema önizlemesi; tahsis/yayın sıfır, mevcut sahiplik korundu; `COS-01` tamam. |' if deployed else
              '| Dalda hazır | 15 kilitli kozmetik, dönem tekil tahsisi, özgünlük/hash kontrolü, örnek coverage; `COS-01`. |'),
             f'| Bu turda hazırlanan | Kaynaklı araştırma, teknik tasarım, {len(tasks)} görev, sürümlü yayın kademeleri ve yerel plan doğrulama aracı. |',
             '| Uygulanacak | Yeni teklifler, seçim hakları, kapanış kurtarması, genel takvim kapısı, yeni ekranlar ve modlar. |', '',
             (release_status if deployed else
              'Bu plan üretim yapılandırmasını, Play Console ürünlerini veya canlı bakiyeleri değiştirmez. '
              'İlk yeni yayın **minor** olmalıdır; aday 2.3.0. Sürüm numarası yayın anında '
              'kesinleştirilir, 2.2.1 üzerine yeni özellik paketi diye tekrar yayımlanmaz.'), '',
             '## 4. Teslim dilimleri ve çıkış kapıları', '',
             '| Dilim | Somut teslim | Kapı / sonraki adım |', '| --- | --- | --- |',
             '| R0 | Ekonomi baz çizgisi, ekran prototipi, ilk deneyim ve ölçüm tanımı | BASE-01/02/03, ECON-01, UI-01 |',
             '| R1 | Önce 2.3.0 kilitli kozmetik; sonra 2.4.0 dönem ödülü/içerik açılışı | RELEASE-00 → RELEASE-01; 2.3.0 için yeni sezon/kart stoğu beklenmez |',
             '| R2 — sonraki minor | Bir garantili parça teklifi, ayrı dört mağaza kozmetiği, seçim kasası ve kapanış hakları | RELEASE-02; mevcut ürün/ödeme hakları korunur |',
             '| R3 | Günlük Devre Deneyi ve tek etkinlik vitrini; öğrenme/ustalık işleri ayrı tamamlanır | RELEASE-03; ölçüm ve koruyucu kalite kararı |',
             '| R4 | PvE Seferi ve takım ortak hedefi; daha sonra draft/asenkron/BO3/boss/2v2 araştırmaları | Her mod ayrı kapsam/ölçüm/yayın kapısı alır |', '',
             'R1/R2/R3 bir takvim günü veya kesin sürüm sözü değildir. Tek geliştirici için '
             'aynı anda bir büyük backend/motor işi ve bir küçük görsel paket önerilir. '
             'S≈1–2, M≈3–5, L≈6–10 geliştirici günü taslak efor bandıdır; sanat, cihaz QA ve '
             'beklemeler ayrıca tahmin edilir. XL işe başlamadan daha küçük alt işler ayrılır. '
             'Efor bantlarının toplamı teslim tarihi olarak kullanılmaz.', '',
             (('**RELEASE-00 / 2.3.0:** kullanıcı yayın teyidiyle tamam. ' if published else
               '**RELEASE-00 / 2.3.0:** sunucu ve AAB tamam; Play/cihaz doğrulamasını kapat. ') +
              '**Sonraki paket RELEASE-01 / 2.4.0:** mevcut 24 modülle S1; BASE-01, SEASON-00 '
              've COMPAT-01 ile ödül/kapanış/uyum kapılarını tamamla. Yeni kart ve geniş sanat stoğu '
              '2.5.0 ve sonrasına bölündü.' if deployed else
              '**İlk yayın paketi RELEASE-00 / 2.3.0:** dalda hazır kilitli kozmetiği '
              'görsel/sahiplik/native kontrollerinden geçirip yeni AAB ve sunucu paketi hazırla. '
              'BASE-01/02 ve COS-04 paralel ilerleyebilir; COS-02/CARD-01/02 ve iki dönem '
              'üretim stoğu 2.4.0 açılışının önkoşuludur, 2.3.0 önizlemesini bekletmez.'), '',
             '## 5. İçerik kapasitesi ve karar kayıtları', '',
             '- Güncel S1 planı: mevcut üç oyuncu seti sezon yolu, sıralama ve son haftaya; diğer haftalar açık kaynak ödülü türüne ayrılır. Yeni profil henüz uygulanmadı; kaynak yokluğu eski kozmetiğe düşmez.',
             '- Eski her-hafta-kozmetik profili iki dönemde 18/20 ek oyuncu öğesi ister. Mevcut coverage hâlâ bu profili hesaplar; bu miktar yeni S1 açılışının sanat koşulu değildir.',
             '- 18 öğelik oyuncu brief\'i S2/S3/S4 için altışar öğeye bölündü. Mağazanın ayrı dört öğesi 2.5.0\'dadır. İlk üç takım seti tüketilince yeni takım stoğu ayrıca gerekir.',
             '- Yeni etkinlik ayrı koleksiyon ödülü verecekse ek stok ayrıca hesaplanır; mevcut iki dönem hesabı her yeni modu kapsamaz.',
             '- Yalnız S1 için mevcut 24 modül istisnası kullanıcı tarafından seçildi; kodda uygulanacak. S2 ve sonrasında en az bir yeni hazır modül, ücretsiz edinim ve karşı oyun koşulu korunur.',
             '- Yeni unvan, avatar, çekirdek görünümü, takım vitrini ve arena kozmetiği ayrı renderer/sahiplik maliyetiyle CARD-03 kapsamında sıralanır.', '',
             'Yayın öncesinde karar dosyasına yazılacaklar: yeni teklif miktarı/fiyatı ve limit; '
             'seçim kasası kazanım yolu; katılım tavanları; toplanmamış hakların kapanış davranışı; '
             'ilk etkinlik penceresi; sanat/cihaz kabulü. Bunlar bu tur için kullanıcıdan yanıt '
             'bekleyen engeller değildir; uygulama/yayın görevlerinin ölçülebilir teslimleridir.', '',
             '## 6. Ürün hedeflerinin kapsama haritası', '',
             '| Ürün hedefi | Bu projedeki işler |', '| --- | --- |',
             '| Mevcut altyapı | BASE-01, DATA-01, teknik tasarım §1 |',
             '| Kozmetik ve özgün dönem ödülü | COS-01/02/03/04/05/06/07/08/09, CARD-01/02/04/05/06, REWARD-01 |',
             '| Geri dönüş döngüleri | BASE-03, REWARD-03/04, LIVE-02/03/05/07/12, RET-01 |',
             '| Modlar ve ileri araştırma | LIVE-02/04/05/06/07/08/09/10/11/12; giriş LIVE-03 |',
             '| Kalıcı gelişim ve sunum | BASE-03, UI-04/05/06/07, AUDIO-01/02, PLAY-01, BALANCE-01, QA-01 |',
             '| Ölçüm | BASE-02, ANALYT-01/02, ECON-01 |',
             '| Yayın aşamaları | OPS-01/02 ve RELEASE-00/01/02/03/04/05/06; sürüm planı |', '',
             '## 7. İş kontrol listesi', '']
    publication = ['### 4.1. Sürümlere göre açık yayın planı', '',
                   '| Sürüm | Hedef yayın | Oyuncuya gelen kapsam | Kapalı kalan | Çıkış kapısı |',
                   '| --- | --- | --- | --- | --- |']
    for release in document['release_plan']:
        version_label = (f'[{release["version"]}](planning/releases/{release["version"]}.md)'
                         if release.get('delivery_document') else release['version'])
        publication.append(f'| **{version_label} — {release["name"]}** | {release.get("target_release_on", "Yayımlandı")} | {release["scope"]} | '
                           f'{release["keep_closed"]} | {", ".join(release["gate_tasks"])}: {release["exit"]} |')
    publication += ['', 'Tarihlerin hedef/tahmin/koşullu ayrımı ödül portföyü ve sürüm takviminde tanımlıdır. '
                    'Tarih gelmesi kendiliğinden yayın kararı değildir. Her pakette ortak tamamlanma kapısı uygulanır. '
                    'Hazır olmayan özellik kapalı kalır; eski ödülü tekrar vererek takvim doldurulmaz.', '',
                    'Her yayın: geliştirme → yerel/cihaz kabulü → iç test → kapalı test → '
                    'kontrollü üretim → gözlem. Sunucu yeni ve önceki desteklenen istemciyle '
                    'uyumlu hazırlanır; oyuncu mağazadan güncelleyene kadar güvenli davranır. '
                    'Hata düzeltmesi mevcut minor üstünde PATCH, yeni özellik sonraki MINOR; '
                    'büyük dönüşüm için MAJOR ayrıca planlanır. Yeni bir 3.0.0 sözü verilmez.', '']
    position = lines.index('## 5. İçerik kapasitesi ve karar kayıtları')
    lines[position:position] = publication
    for stage, label in document['stages'].items():
        lines += [f'### {stage} — {label}', '']
        for t in (t for t in tasks if t['stage'] == stage):
            checked = 'x' if t['status'] in {'done', 'branch_ready'} else ' '
            lines += [f'<a id="{t["id"].lower()}"></a>', '',
                      f'- [{checked}] **{t["id"]} — {t["title"]}**',
                      f'  - Durum: {STATUSES[t["status"]]}. Öncelik: {t["priority"]}; rol: {t["owner"]}; efor: {t["effort"]}.',
                      '  - Önkoşullar: ' + (', '.join(t['depends_on']) or 'yok') + '.',
                      '  - Mevcut bağlar: ' + ', '.join(f'`{p}`' for p in t['existing_paths']) + '.',
                      '  - Yeni teslim önerisi: ' + (', '.join(f'`{p}`' for p in t['proposed_paths']) or 'mevcut temel korunur') + '.']
            if t.get('planned_releases'):
                lines.append('  - Sürüm briefleri: ' + ', '.join(
                    f'[{v}](planning/releases/{v}.md)' for v in t['planned_releases']) + '.')
            lines += [f'  - Kabul {i}: {criterion}' for i, criterion in enumerate(t['acceptance'], 1)]
            if t['evidence']:
                lines.append('  - Geçmiş hazırlık kanıtı: ' + ', '.join(f'`{p}`' for p in t['evidence']) + '.')
            lines.append('')
    lines += ['## 8. Ortak tamamlanma tanımı', '',
              '- [ ] Görevin tüm kabul ölçütleri kanıtlandı; sahte/sunum fixture kanıtı gerçek ödeme/ödül teslimi diye gösterilmedi.',
              '- [ ] Hesap sahipliği, tekrar talep, eşzamanlı talep, yanlış revision, süre sınırı ve çevrimdışı dönüş senaryoları ilgili işte doğrulandı.',
              '- [ ] Eski oyuncu/maç/sandık/makbuz, premium iade ve varsa eski istemci uyumluluğu korundu.',
              '- [ ] UI değişiminde TR/EN, iki dar ekran, kilit/boş/hata/yükleme ve performans kanıtı var.',
              '- [ ] Ortak sanat yönüyle yan yana karşılaştırma var; yön değişiyorsa ayrı brief ve aşamalı geçiş kabul edildi.',
              '- [ ] Yeni kaynak JSON/uç/varlık varsa paketleme ve native API prefix bağları güncellendi.',
              '- [ ] İçerik/ödül artışının ekonomi raporu, sanat kabulü ve kaynak stoğu yeterli.',
              '- [ ] Yeni minor sürüm notu, gerekli CI/AAB ve veri koruyan yayın/geri dönüş planı hazır.',
              '- [ ] Kazanılmış haklar kapatma/rollback ile silinmiyor; kullanıcıya görünen açıklama gerçek sunucu kuralıyla aynı.', '',
              '## 9. Bağımlılığa göre geçerli çalışma sırası', '',
              'Bu sıra tek olası plan değildir; önkoşulları önceleyen doğrulanmış bir sıralamadır. '
              '`later` işlerin burada bulunması başlayacakları anlamına gelmez.', '',
              ' → '.join(order), '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--write', action='store_true')
    action.add_argument('--check', action='store_true')
    args = parser.parse_args()
    document = json.loads(BACKLOG.read_text(encoding='utf-8'))
    order = validate(document)
    expected = render(document, order)
    if args.write:
        CHECKLIST.write_text(expected, encoding='utf-8')
    elif not CHECKLIST.is_file() or CHECKLIST.read_text(encoding='utf-8') != expected:
        raise ValueError('Checklist differs from backlog; run --write')
    completed = {'done', 'branch_ready'}
    by_id = {t['id']: t for t in document['tasks']}
    startable = [t['id'] for t in document['tasks'] if t['status'] == 'todo'
                 and all(by_id[d]['status'] in completed for d in t['depends_on'])]
    print(json.dumps({'tasks': len(order), 'status_counts': dict(Counter(t['status'] for t in document['tasks'])),
                      'acyclic': True, 'goals_covered': sorted(GOALS),
                      'startable_now': startable,
                      'startable_in_active_release': [identity for identity in startable
                          if document['active_development']['target_version'] in by_id[identity].get('planned_releases', [])],
                      'runtime_changed': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
