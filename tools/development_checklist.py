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
    for t in tasks:
        if t['status'] in {'done', 'branch_ready'}:
            if any(by_id[d]['status'] not in {'done', 'branch_ready'} for d in t['depends_on']):
                raise ValueError(f'Completed task has incomplete prerequisites: {t["id"]}')
    return order


def render(document, order):
    tasks = document['tasks']
    counts = Counter(t['status'] for t in tasks)
    summary = ', '.join(f'**{counts[status]} {label.lower()}**'
                        for status, label in STATUSES.items() if counts[status])
    lines = ['# GRIDSHARD — uygulanabilir gelişim kontrol listesi', '',
             '**Tarih: 3 Kasım 2026 · Proje: mağaza, ödül, içerik ve yaşayan oyun**', '',
             'Bu dosya araştırmayı uygulanabilir işlere böler. Toplam '
             f'**{len(tasks)} iş** vardır: {summary}. '
             'Dalda hazır iş canlıda yayımlanmış sayılmaz. Yeni mağaza, seçim kasası ve modlar henüz uygulanmadı.', '',
             '## 1. Proje dosyaları ve kullanım', '',
             '- [Önceki gelişim planı](GRIDSHARD_CANLI_OPERASYON_VE_GELISIM_PLANI_20261102.md): ürün yönü ve ilk araştırma.',
             '- [Yeni rakip/ödül araştırması](GRIDSHARD_MAGAZA_ODUL_ARASTIRMASI_20261103.md): kaynaklar, tarih ve çıkarımlar.',
             '- [Teknik tasarım](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md): mevcut/yeni altyapı, veri/API ve ekran sözleşmeleri.',
             '- [Makine tarafından okunabilir iş listesi](planning/gridshard_development_backlog_v1.json): görevlerin tek kaynağı.', '',
             'Görevi güncellemek için JSON içindeki `status`, `evidence` ve gerekiyorsa kabul '
             'ölçütlerini düzenle. Sonra repo kökünde çalıştır:', '',
             '```powershell', 'python tools/development_checklist.py --write',
             'python tools/development_checklist.py --check', '```', '',
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
             '## 3. Hazır olan ile yapılacak olanın sınırı', '',
             '| Durum | İçerik |', '| --- | --- |',
             '| Canlı 2.2.1 | Profil/takım düzeltmeleri, yeni mesaj sırası, mevcut mağaza/sandık/ödül sistemi. |',
             '| Dalda hazır | 15 kilitli kozmetik, dönem tekil tahsisi, özgünlük/hash kontrolü, örnek coverage; `COS-01`. |',
             '| Bu turda hazırlanan | Kaynaklı araştırma, teknik tasarım, 50 görev, bağımlılık/kabul ölçütleri ve yerel plan doğrulama aracı. |',
             '| Uygulanacak | Yeni teklifler, seçim hakları, kapanış kurtarması, genel takvim kapısı, yeni ekranlar ve modlar. |', '',
             'Bu plan üretim yapılandırmasını, Play Console ürünlerini veya canlı bakiyeleri değiştirmez. '
             'İlk yeni yayın **minor** olmalıdır; aday 2.3.0. Sürüm numarası yayın anında '
             'kesinleştirilir, 2.2.1 üzerine yeni özellik paketi diye tekrar yayımlanmaz.', '',
             '## 4. Teslim dilimleri ve çıkış kapıları', '',
             '| Dilim | Somut teslim | Kapı / sonraki adım |', '| --- | --- | --- |',
             '| R0 | Ekonomi baz çizgisi, ekran prototipi, ilk deneyim ve ölçüm tanımı | BASE-01/02/03, ECON-01, UI-01 |',
             '| R1 — ilk minor adayı | İki dönemlik özgün stok/kart hazırlığı, güvenli ödül tanımı, tema vitrini, birleşik yayın kapısı | RELEASE-01; stok veya kart eksikse takvim açılmaz |',
             '| R2 — sonraki minor | Bir garantili parça teklifi, ayrı dört mağaza kozmetiği, seçim kasası ve kapanış hakları | RELEASE-02; mevcut ürün/ödeme hakları korunur |',
             '| R3 | Günlük Devre Deneyi ve tek etkinlik vitrini; öğrenme/ustalık işleri ayrı tamamlanır | RELEASE-03; ölçüm ve koruyucu kalite kararı |',
             '| R4 | PvE Seferi ve takım ortak hedefi; daha sonra draft/asenkron/BO3/boss/2v2 araştırmaları | Her mod ayrı kapsam/ölçüm/yayın kapısı alır |', '',
             'R1/R2/R3 bir takvim günü veya kesin sürüm sözü değildir. Tek geliştirici için '
             'aynı anda bir büyük backend/motor işi ve bir küçük görsel paket önerilir. '
             'S≈1–2, M≈3–5, L≈6–10 geliştirici günü taslak efor bandıdır; sanat, cihaz QA ve '
             'beklemeler ayrıca tahmin edilir. XL işe başlamadan daha küçük alt işler ayrılır. '
             'Efor bantlarının toplamı teslim tarihi olarak kullanılmaz.', '',
             '**İlk çalışma paketi:** BASE-01 ve BASE-02 ile ekonomi/ölçüm bazını çıkar; '
             'COS-04 ile kaynak/stok sözleşmesini genişlet. COS-02 için sanat briefleri '
             'bu sırada hazırlanabilir. BASE-03 → UI-01 ve ECON-01 bunların ardından '
             'ürün/ekran kararlarını somutlaştırır. Bu başlangıç yeni ürün fiyatı veya '
             'canlı sezon açılışı gerektirmez.', '',
             '## 5. İçerik kapasitesi ve karar kayıtları', '',
             '- İki dönem: 24 oyuncu + 6 takım ödül öğesi gerekir. Hazır stok 6 oyuncu + 9 takım: **18 ek oyuncu öğesi** gerekir.',
             '- İlk kozmetik mağazası ayrıca dört özgün öğe ister: ilk sanat hazırlığı **22 yeni öğe**. Bu öğeler henüz üretilmedi.',
             '- Yeni etkinlik ayrı koleksiyon ödülü verecekse ek stok ayrıca hesaplanır; mevcut iki dönem hesabı her yeni modu kapsamaz.',
             '- Mevcut sezon politikası en az bir yeni modül ister. İki dönem için iki modül çalışma/çizim/karşı oyun/denge/ücretsiz kazanım kapısından geçmelidir.',
             '- Yeni unvan, avatar, çekirdek görünümü, takım vitrini ve arena kozmetiği ayrı renderer/sahiplik maliyetiyle CARD-03 kapsamında sıralanır.', '',
             'Yayın öncesinde karar dosyasına yazılacaklar: yeni teklif miktarı/fiyatı ve limit; '
             'seçim kasası kazanım yolu; katılım tavanları; toplanmamış hakların kapanış davranışı; '
             'ilk etkinlik penceresi; sanat/cihaz kabulü. Bunlar bu tur için kullanıcıdan yanıt '
             'bekleyen engeller değildir; uygulama/yayın görevlerinin ölçülebilir teslimleridir.', '',
             '## 6. Önceki planın kapsama haritası', '',
             '| Önceki bölüm | Bu projedeki işler |', '| --- | --- |',
             '| §3 Mevcut altyapı | BASE-01, DATA-01, teknik tasarım §1 |',
             '| §4 Kozmetik ve özgün dönem ödülü | COS-01/02/03/04, CARD-01/02/03, REWARD-01, OPS-01 |',
             '| §5 Geri dönüş döngüleri | BASE-03, REWARD-03/04, LIVE-02/03/05/07/12, RET-01 |',
             '| §6 On mod önerisi | LIVE-02/04/05/06/07/08/09/10/11/12; giriş LIVE-03 |',
             '| §7 Kalıcı gelişim | BASE-03, UI-04/05/06, PLAY-01, BALANCE-01, QA-01 |',
             '| §8 Ölçüm | BASE-02, ANALYT-01/02, ECON-01 |',
             '| §9 Aşamalar | OPS-01/02 ve RELEASE-01/02/03 |', '',
             '## 7. İş kontrol listesi', '']
    for stage, label in document['stages'].items():
        lines += [f'### {stage} — {label}', '']
        for t in (t for t in tasks if t['stage'] == stage):
            checked = 'x' if t['status'] in {'done', 'branch_ready'} else ' '
            lines += [f'- [{checked}] **{t["id"]} — {t["title"]}**',
                      f'  - Durum: {STATUSES[t["status"]]}. Öncelik: {t["priority"]}; rol: {t["owner"]}; efor: {t["effort"]}.',
                      '  - Önkoşullar: ' + (', '.join(t['depends_on']) or 'yok') + '.',
                      '  - Mevcut bağlar: ' + ', '.join(f'`{p}`' for p in t['existing_paths']) + '.',
                      '  - Yeni teslim önerisi: ' + (', '.join(f'`{p}`' for p in t['proposed_paths']) or 'mevcut temel korunur') + '.']
            lines += [f'  - Kabul {i}: {criterion}' for i, criterion in enumerate(t['acceptance'], 1)]
            if t['evidence']:
                lines.append('  - Geçmiş hazırlık kanıtı: ' + ', '.join(f'`{p}`' for p in t['evidence']) + '.')
            lines.append('')
    lines += ['## 8. Ortak tamamlanma tanımı', '',
              '- [ ] Görevin tüm kabul ölçütleri kanıtlandı; sahte/sunum fixture kanıtı gerçek ödeme/ödül teslimi diye gösterilmedi.',
              '- [ ] Hesap sahipliği, tekrar talep, eşzamanlı talep, yanlış revision, süre sınırı ve çevrimdışı dönüş senaryoları ilgili işte doğrulandı.',
              '- [ ] Eski oyuncu/maç/sandık/makbuz, premium iade ve varsa eski istemci uyumluluğu korundu.',
              '- [ ] UI değişiminde TR/EN, iki dar ekran, kilit/boş/hata/yükleme ve performans kanıtı var.',
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
                      'startable_now': startable, 'runtime_changed': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
