# GRIDSHARD — uygulanabilir gelişim kontrol listesi

**Tarih: 3 Kasım 2026 · Proje: mağaza, ödül, içerik ve yaşayan oyun**

Bu dosya araştırmayı uygulanabilir işlere böler. Toplam **50 iş** vardır: **42 yapılacak**, **1 dalda hazır; canlıda yok**, **7 ölçüme bağlı ileri aşama**. Dalda hazır iş canlıda yayımlanmış sayılmaz. Yeni mağaza, seçim kasası ve modlar henüz uygulanmadı.

## 1. Proje dosyaları ve kullanım

- [Önceki gelişim planı](GRIDSHARD_CANLI_OPERASYON_VE_GELISIM_PLANI_20261102.md): ürün yönü ve ilk araştırma.
- [Yeni rakip/ödül araştırması](GRIDSHARD_MAGAZA_ODUL_ARASTIRMASI_20261103.md): kaynaklar, tarih ve çıkarımlar.
- [Teknik tasarım](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md): mevcut/yeni altyapı, veri/API ve ekran sözleşmeleri.
- [Makine tarafından okunabilir iş listesi](planning/gridshard_development_backlog_v1.json): görevlerin tek kaynağı.

Görevi güncellemek için JSON içindeki `status`, `evidence` ve gerekiyorsa kabul ölçütlerini düzenle. Sonra repo kökünde çalıştır:

```powershell
python tools/development_checklist.py --write
python tools/development_checklist.py --check
```

Araç yalnız planı okur/yazar; oyun, sunucu, veritabanı veya mağazayı başlatmaz. Bağımlılık döngüsü, geçersiz kimlik, eksik kaynak yolu, kapsam kaybı ve işaretlenen işin kanıt eksikliğini denetler. Oyun testlerinin yerine geçmez. Bu Markdown dosyası üretilir; kalıcı görev değişikliklerini JSON üzerinden yap.

Durumlar: `todo`, `in_progress`, `branch_ready`, `done`, `later`. `[x]` ile işaretlenen dal hazırlığının yanında canlıda olmadığı açıkça yazılır. Gelecek işe yalnız tanımı hazır diye `done` yazılmaz.

## 2. Ürün kararları

1. Yeni ürünün oyuncu faydası önce tanımlanır: hedefli ilerleme, seçim, koleksiyon veya ustalık.
2. Mevcut dört sandığın fiyat/olasılık/hediye hakları korunarak baz ölçüm yapılır; yeni miktarlar ekonomik rapordan sonra seçilir.
3. İlk mağaza pilotu garantili parça ve ayrı kozmetik stoğudur. Yeni gerçek para paketleri ayrı sonraki kapıdadır.
4. Sezon/etkinlik koleksiyon ödülü başka dönemde veya mağazada tekrar sunulmaz. Kaynak para/parçalar tekrar kullanılabilir.
5. Yeni modlar tek etkinlik penceresiyle başlar; her mod için sürekli PvP kuyruğu açılmaz.
6. Kozmetik savaş gücü vermez; mevcut premium ilerleme avantajları yokmuş gibi pazarlanmaz.
7. Yeni para birimi, ücretli yeniden çekiliş, oyuncular arası ticaret ve web ödeme mağazası ilk kapsamda değildir.

## 3. Hazır olan ile yapılacak olanın sınırı

| Durum | İçerik |
| --- | --- |
| Canlı 2.2.1 | Profil/takım düzeltmeleri, yeni mesaj sırası, mevcut mağaza/sandık/ödül sistemi. |
| Dalda hazır | 15 kilitli kozmetik, dönem tekil tahsisi, özgünlük/hash kontrolü, örnek coverage; `COS-01`. |
| Bu turda hazırlanan | Kaynaklı araştırma, teknik tasarım, 50 görev, bağımlılık/kabul ölçütleri ve yerel plan doğrulama aracı. |
| Uygulanacak | Yeni teklifler, seçim hakları, kapanış kurtarması, genel takvim kapısı, yeni ekranlar ve modlar. |

Bu plan üretim yapılandırmasını, Play Console ürünlerini veya canlı bakiyeleri değiştirmez. İlk yeni yayın **minor** olmalıdır; aday 2.3.0. Sürüm numarası yayın anında kesinleştirilir, 2.2.1 üzerine yeni özellik paketi diye tekrar yayımlanmaz.

## 4. Teslim dilimleri ve çıkış kapıları

| Dilim | Somut teslim | Kapı / sonraki adım |
| --- | --- | --- |
| R0 | Ekonomi baz çizgisi, ekran prototipi, ilk deneyim ve ölçüm tanımı | BASE-01/02/03, ECON-01, UI-01 |
| R1 — ilk minor adayı | İki dönemlik özgün stok/kart hazırlığı, güvenli ödül tanımı, tema vitrini, birleşik yayın kapısı | RELEASE-01; stok veya kart eksikse takvim açılmaz |
| R2 — sonraki minor | Bir garantili parça teklifi, ayrı dört mağaza kozmetiği, seçim kasası ve kapanış hakları | RELEASE-02; mevcut ürün/ödeme hakları korunur |
| R3 | Günlük Devre Deneyi ve tek etkinlik vitrini; öğrenme/ustalık işleri ayrı tamamlanır | RELEASE-03; ölçüm ve koruyucu kalite kararı |
| R4 | PvE Seferi ve takım ortak hedefi; daha sonra draft/asenkron/BO3/boss/2v2 araştırmaları | Her mod ayrı kapsam/ölçüm/yayın kapısı alır |

R1/R2/R3 bir takvim günü veya kesin sürüm sözü değildir. Tek geliştirici için aynı anda bir büyük backend/motor işi ve bir küçük görsel paket önerilir. S≈1–2, M≈3–5, L≈6–10 geliştirici günü taslak efor bandıdır; sanat, cihaz QA ve beklemeler ayrıca tahmin edilir. XL işe başlamadan daha küçük alt işler ayrılır. Efor bantlarının toplamı teslim tarihi olarak kullanılmaz.

**İlk çalışma paketi:** BASE-01 ve BASE-02 ile ekonomi/ölçüm bazını çıkar; COS-04 ile kaynak/stok sözleşmesini genişlet. COS-02 için sanat briefleri bu sırada hazırlanabilir. BASE-03 → UI-01 ve ECON-01 bunların ardından ürün/ekran kararlarını somutlaştırır. Bu başlangıç yeni ürün fiyatı veya canlı sezon açılışı gerektirmez.

## 5. İçerik kapasitesi ve karar kayıtları

- İki dönem: 24 oyuncu + 6 takım ödül öğesi gerekir. Hazır stok 6 oyuncu + 9 takım: **18 ek oyuncu öğesi** gerekir.
- İlk kozmetik mağazası ayrıca dört özgün öğe ister: ilk sanat hazırlığı **22 yeni öğe**. Bu öğeler henüz üretilmedi.
- Yeni etkinlik ayrı koleksiyon ödülü verecekse ek stok ayrıca hesaplanır; mevcut iki dönem hesabı her yeni modu kapsamaz.
- Mevcut sezon politikası en az bir yeni modül ister. İki dönem için iki modül çalışma/çizim/karşı oyun/denge/ücretsiz kazanım kapısından geçmelidir.
- Yeni unvan, avatar, çekirdek görünümü, takım vitrini ve arena kozmetiği ayrı renderer/sahiplik maliyetiyle CARD-03 kapsamında sıralanır.

Yayın öncesinde karar dosyasına yazılacaklar: yeni teklif miktarı/fiyatı ve limit; seçim kasası kazanım yolu; katılım tavanları; toplanmamış hakların kapanış davranışı; ilk etkinlik penceresi; sanat/cihaz kabulü. Bunlar bu tur için kullanıcıdan yanıt bekleyen engeller değildir; uygulama/yayın görevlerinin ölçülebilir teslimleridir.

## 6. Önceki planın kapsama haritası

| Önceki bölüm | Bu projedeki işler |
| --- | --- |
| §3 Mevcut altyapı | BASE-01, DATA-01, teknik tasarım §1 |
| §4 Kozmetik ve özgün dönem ödülü | COS-01/02/03/04, CARD-01/02/03, REWARD-01, OPS-01 |
| §5 Geri dönüş döngüleri | BASE-03, REWARD-03/04, LIVE-02/03/05/07/12, RET-01 |
| §6 On mod önerisi | LIVE-02/04/05/06/07/08/09/10/11/12; giriş LIVE-03 |
| §7 Kalıcı gelişim | BASE-03, UI-04/05/06, PLAY-01, BALANCE-01, QA-01 |
| §8 Ölçüm | BASE-02, ANALYT-01/02, ECON-01 |
| §9 Aşamalar | OPS-01/02 ve RELEASE-01/02/03 |

## 7. İş kontrol listesi

### R0 — Baz çizgi ve tasarım

- [ ] **BASE-01 — Mevcut ekonomi ve ürünlerin baz çizgisini çıkar**
  - Durum: Yapılacak. Öncelik: P0; rol: Oyun tasarımı / backend; efor: M.
  - Önkoşullar: yok.
  - Mevcut bağlar: `server/app/meta_progression.py`, `server/app/player_progression.py`, `server/app/store_catalog.py`.
  - Yeni teslim önerisi: `docs/planning/economy-baseline.md`.
  - Kabul 1: Dört sandığın garanti/olasılık, fiyat, limit ve hediye kaynağı tek tabloda doğrulanır.
  - Kabul 2: Ücretsiz/premium/AI-insan ayrımı ve kaynak giriş-çıkış varsayımları kaydedilir; mevcut fiyatlar değiştirilmez.

- [ ] **BASE-02 — Analitik ve ilk deneyim ölçüm planını hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / analiz; efor: S.
  - Önkoşullar: yok.
  - Mevcut bağlar: `server/app/product_analytics.py`, `tools/product_analytics_report.py`, `docs/LOCALIZATION_AND_PRODUCT_ANALYTICS.md`.
  - Yeni teslim önerisi: `docs/planning/measurement-baseline.md`.
  - Kabul 1: Onay/yaş/30 gün saklama/hesap silme ve düşük örneklem bastırması kaynakta doğrulanır.
  - Kabul 2: D1-D7-D28 için uygun kohort ve ilk maç/deste değişimi hunisi tanımlanır; onaysız oyuncu takip edilmez.

- [ ] **BASE-03 — İlk deneyim ve geri dönen oyuncu akışını tasarla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / istemci; efor: M.
  - Önkoşullar: BASE-02.
  - Mevcut bağlar: `client/src/app.js`, `client/index.html`, `e2e/onboarding-visibility.spec.js`.
  - Yeni teslim önerisi: `docs/planning/onboarding-return-flow.md`.
  - Kabul 1: İlk strateji kararı, ilk deste değişimi ve bugünün hedefi için ekran akışı hazırlanır.
  - Kabul 2: Eski oyuncu sürüm özeti ve isteğe bağlı öğrenme akışı görür; ilerlemesi veya kazanılmış hakkı sıfırlanmaz.

- [ ] **ECON-01 — Deterministik ekonomi simülasyonu kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / oyun tasarımı; efor: L.
  - Önkoşullar: BASE-01.
  - Mevcut bağlar: `server/app/meta_progression.py`, `server/app/player_progression.py`, `server/app/store_catalog.py`.
  - Yeni teslim önerisi: `tools/simulate_liveops_economy.py`.
  - Kabul 1: Yeni/ücretsiz/premium oyuncu senaryolarında 1 ve 28 günlük kaynak giriş-çıkışı mevcut tanımlardan hesaplanır.
  - Kabul 2: Yeni kartın ücretsiz edinimi, hedef deste gelişimi ve biriken para raporlanır; miktar/fiyat kararı rapora bağlanır.

- [ ] **UI-01 — Ekran hiyerarşileri ve ortak bileşen prototipini hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Arayüz / ürün; efor: M.
  - Önkoşullar: BASE-03.
  - Mevcut bağlar: `client/index.html`, `client/src/app.js`, `client/src/shop-rewards-v6.css`, `client/src/visual-polish-v9.css`, `docs/GORSEL_DONUSUM_PLANI_20261015.md`.
  - Yeni teslim önerisi: `docs/planning/screen-and-component-spec.md`.
  - Kabul 1: Ana ekran, mağaza, ürün, seçim kasası, sezon, profil ve maç sonrası için hiyerarşi/durumlar hazırlanır.
  - Kabul 2: Mevcut onaylı boyalı dil/dock korunur; prototip ile oyuna bağlanmış ekran açıkça ayrılır.

### R1 — Dönem ödülü/içerik temeli — ilk minor adayı

- [x] **COS-01 — Dalda hazır 15 kilitli kozmetik temelini koru**
  - Durum: Dalda hazır; canlıda yok. Öncelik: P0; rol: Backend / istemci; efor: S.
  - Önkoşullar: yok.
  - Mevcut bağlar: `server/app/cosmetic_releases.py`, `server/data/cosmetic_releases_v1.json`, `tools/prepare_liveops_rewards.py`, `server/tests/test_cosmetic_releases.py`, `e2e/liveops-cosmetics.spec.js`.
  - Yeni teslim önerisi: mevcut temel korunur.
  - Kabul 1: 15 öğe kilitli, tahsis sayısı sıfır ve sahiplik sunucuda doğrulanır.
  - Kabul 2: Hazır temel canlı 2.2.1 ile karıştırılmaz; yeni yayında kendi minor sürümü ve mesajı olur.
  - Geçmiş hazırlık kanıtı: `artifacts/liveops-foundations-20261102/server-tests.log`, `artifacts/liveops-foundations-20261102/browser-results.json`.

- [ ] **COS-02 — İki dönem için 18 yeni oyuncu tasarımı üret**
  - Durum: Yapılacak. Öncelik: P0; rol: Sanat / istemci; efor: XL.
  - Önkoşullar: COS-01.
  - Mevcut bağlar: `server/data/cosmetic_releases_v1.json`, `tools/prepare_liveops_rewards.py`, `client/src/liveops-cosmetics-v1.css`, `docs/GORSEL_DONUSUM_PLANI_20261015.md`.
  - Yeni teslim önerisi: `docs/planning/two-cycle-art-manifest.md`.
  - Kabul 1: Dokuz yeni çerçeve ve dokuz yeni zemin; özgün motif, TR/EN, tasarım kimliği ve önizleme hazırlanır; gerekirse renderer şeması genişletilir.
  - Kabul 2: En fazla 10 parçalık görsel incelemeler ve 320/393 px kabulü kaydedilir; yeniden renklendirme yeni tasarım sayılmaz.

- [ ] **COS-04 — Kaynak kayıtlarını ve stok denetimini genişlet**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / içerik araçları; efor: M.
  - Önkoşullar: COS-01.
  - Mevcut bağlar: `server/app/cosmetic_releases.py`, `tools/prepare_liveops_rewards.py`, `server/tests/test_cosmetic_releases.py`.
  - Yeni teslim önerisi: `server/data/liveops_content_sources_v1.json`.
  - Kabul 1: Mağaza ve yeni etkinlik kaynakları doğrulanmış sözleşmeyle eklenir; yalnız JSON adı ekleyerek yayın yapılamaz.
  - Kabul 2: Coverage aktif kaynak/takvimden ihtiyaç hesaplar; 30 dönem öğesi ve ayrı mağaza stoğu karıştırılmaz, yetersiz stokta yayın durur.

- [ ] **CARD-01 — Yankı Rölesi sezon modülünü uçtan uca geliştir**
  - Durum: Yapılacak. Öncelik: P0; rol: Oyun motoru / sanat / denge; efor: XL.
  - Önkoşullar: ECON-01.
  - Mevcut bağlar: `server/app/season_module_releases.py`, `server/data/season_module_releases_v2.json`, `server/app/module_roster.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `docs/planning/echo-relay-release.md`.
  - Kabul 1: Planlı echo_relay için mekanik, karşı oyun, çalışma görseli, aktif katalog ve arena kapısı tamamlanır.
  - Kabul 2: Ücretsiz kazanım yolu ve otomatik yerleşim/hedefleme sözleşmeleri test edilir; planlı kart hazır diye ödül havuzuna girmez.

- [ ] **CARD-02 — Kor Fırlatıcı ile ikinci dönem kart stoğunu hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun motoru / sanat / denge; efor: XL.
  - Önkoşullar: CARD-01.
  - Mevcut bağlar: `server/data/season_module_releases_v2.json`, `server/app/season_module_releases.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `docs/planning/ember-launcher-release.md`.
  - Kabul 1: Planlı ember_launcher için yanma, arındırma/karşı oyun ve okunabilir süre/hasar göstergesi hazırlanır.
  - Kabul 2: İki dönem için en az birer yeni kartın yayın kontrolleri tamamlanır; yetişmeyen kart için takvim yeniden planlanır.

- [ ] **REWARD-01 — Sürüm sabitlemeli ödül tanımlarını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: BASE-01.
  - Mevcut bağlar: `server/app/reward_delivery.py`, `server/app/meta_progression.py`, `server/app/postgres_economic_operations.py`, `server/tests/test_reward_integrity.py`.
  - Yeni teslim önerisi: `server/app/reward_definitions.py`, `server/data/reward_definitions_v1.json`.
  - Kabul 1: Fixed/choice/random tanımları sürüm ve içerik hash taşır; mevcut rastgele sandık ile fixed_reward farkı belgelenir.
  - Kabul 2: Yeni hak eski tanıma bağlı kalır; eski sandık stoğu ve makbuzları sessizce yeni oranlara taşınmaz.

- [ ] **UI-04 — Tema, sezon ve takım vitrini oluştur**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / sanat; efor: L.
  - Önkoşullar: UI-01, COS-01.
  - Mevcut bağlar: `client/src/social-profile-v5.css`, `client/src/liveops-cosmetics-v1.css`, `client/src/app.js`, `e2e/liveops-cosmetics.spec.js`.
  - Yeni teslim önerisi: `client/src/liveops/collection-view.js`.
  - Kabul 1: Gerçek oyuncu/takım üzerinde önizleme, kazanım kaynağı ve kilit nedeni görünür.
  - Kabul 2: Ücretsiz/premium/katkı/prestij ayrımı, dönem arşivi ve sahiplik kuşanma akışı tutarlı olur.

- [ ] **QA-01 — Ortak mobil, dil ve erişilebilirlik kapısını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: QA / istemci; efor: M.
  - Önkoşullar: UI-01.
  - Mevcut bağlar: `client/src/i18n-catalog.js`, `playwright.config.js`, `e2e/presentation-refinements.spec.js`, `e2e/battle-render-budget.spec.js`.
  - Yeni teslim önerisi: `docs/planning/ui-acceptance-matrix.md`.
  - Kabul 1: 320x568 ve 393x852, TR/EN, uzun ad, hata/boş/yükleme/yeniden deneme ve en az 44px hedef doğrulanır.
  - Kabul 2: Azaltılmış hareket, ses tercihi ve odak sırası korunur; Chromium/WebKit performans eşikleri gevşetilmez.

- [ ] **DATA-01 — Yeni hakların kalıcılık ve kurtarma tasarımını tamamla**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / QA; efor: L.
  - Önkoşullar: REWARD-01.
  - Mevcut bağlar: `server/app/json_schema_migrations.py`, `server/app/postgres_economic_operations.py`, `server/migrations`, `tools/server_backup.py`.
  - Yeni teslim önerisi: `docs/planning/reward-persistence-migration.md`.
  - Kabul 1: Yeni hak/teklif tabloları ve eşsiz indeksler uygulama şemasıyla kesinleştirilir; eski SQL dosyaları değiştirilmez.
  - Kabul 2: Yeni/legacy profil ve makbuzlarla restart, backup/boş hedef restore, eşzamanlı işlem ve rollback uyumluluğu doğrulanır.

- [ ] **ANALYT-01 — Mağaza/ödül/etkinlik olay şemasını genişlet**
  - Durum: Yapılacak. Öncelik: P0; rol: Analiz / backend / istemci; efor: M.
  - Önkoşullar: BASE-02, UI-01.
  - Mevcut bağlar: `server/app/product_analytics.py`, `tools/product_analytics_report.py`, `server/tests/test_product_analytics.py`, `server/tests/test_analytics_age_gate.py`.
  - Yeni teslim önerisi: `docs/planning/liveops-analytics-schema.md`.
  - Kabul 1: Offer/event/choice/equip olayları sınırlı enum alanlarıyla; istemci olayı ile sunucu teslimi ayrı tanımlanır.
  - Kabul 2: Yaş/onay/silme/retention korunur; olay kaybı oyunu veya ödül teslimini bozmaz, kimlik/serbest metin eklenmez.

- [ ] **LIVE-01 — Birleşik içerik ve etkinlik yayın kapısını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / içerik araçları; efor: L.
  - Önkoşullar: COS-04, REWARD-01.
  - Mevcut bağlar: `server/app/competition_control.py`, `server/app/competition_cycle.py`, `server/app/cosmetic_releases.py`, `server/app/season_module_releases.py`.
  - Yeni teslim önerisi: `server/app/liveops_calendar.py`, `server/data/liveops_calendar_v1.json`.
  - Kabul 1: Takvim, modül hazırlığı, yeni kozmetik stoğu, ödül bütçesi ve uygunluk birlikte doğrulanır; eksikse açılış reddedilir.
  - Kabul 2: Taslak yayın operatör başlangıcını açmaz; UTC sınırı, başlamış maç ve kazanılmış haklar sürümünü korur.

- [ ] **BALANCE-01 — Katalog büyümesi için denge ve karşı oyun raporu kur**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / QA; efor: L.
  - Önkoşullar: BASE-01, CARD-01.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`, `server/tests/test_catalog_migration_v2.py`.
  - Yeni teslim önerisi: `tools/report_module_balance.py`.
  - Kabul 1: Kart seçilme/kazanma yanında arena, seviye farkı ve AI/insan ayrımlı yorum yapılır.
  - Kabul 2: Yeni kartlar için karşı oyun senaryosu ve eski altılı destelerle regresyon seti oluşturulur; düşük örneklemde kesin güç iddiası kurulmaz.

- [ ] **OPS-01 — İki dönemlik içerik üretim takvimini işlet**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / sanat / backend; efor: M.
  - Önkoşullar: COS-02, COS-04, CARD-02, ECON-01.
  - Mevcut bağlar: `tools/prepare_liveops_rewards.py`, `server/app/competition_cycle.py`, `server/app/competition_control.py`.
  - Yeni teslim önerisi: `docs/planning/two-cycle-production-calendar.md`.
  - Kabul 1: Yedi dönem paketi/döngü, kart, brief, sahip, sanat/test yükü ve kapanış raporu için iki döngü kayıtlanır.
  - Kabul 2: Haftalık/aylık yeni stok yetersizse tarih revize edilir; eski kozmetik geri dönmez, açılışlar operatör kontrolündedir.

- [ ] **OPS-02 — Yayın durdurma ve hak koruyan rollback akışını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / operasyon; efor: M.
  - Önkoşullar: LIVE-01, DATA-01.
  - Mevcut bağlar: `server/app/release_updates.py`, `tools/release_guard.py`, `tools/package_release.py`, `docs/SURUM_VE_GUNCELLEME_MESAJLARI.md`, `Dockerfile`, `.dockerignore`, `.gitignore`.
  - Yeni teslim önerisi: `docs/planning/liveops-release-and-rollback.md`.
  - Kabul 1: Yeni satış/etkinliği durdurma ile kazanılmış hakkı teslim alma ayrılır; içerik hash ve sürüm notu korunur.
  - Kabul 2: Uygulanmış SQL baytları sabit; veri sıfırlama/otomatik live restore yok, eski sürümün yeni hakkı okuyamadığı durum açıkça ele alınır.
  - Kabul 3: Yeni statik JSON kaynak/Docker paket izin listeleri ve eşlenik release-boundary kontrollerine eklenir; özel runtime veri pakete girmez.

- [ ] **RELEASE-01 — İlk minor: yeni dönem ödülü ve içerik temelini yayıma hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / QA / operasyon; efor: L.
  - Önkoşullar: QA-01, DATA-01, ANALYT-01, OPS-01, OPS-02, UI-04, BALANCE-01.
  - Mevcut bağlar: `.github/workflows/quality.yml`, `tools/release_guard.py`, `tools/package_release.py`, `server/data/game_updates.json`.
  - Yeni teslim önerisi: `docs/planning/release-r1-evidence.md`.
  - Kabul 1: Ödül kilidi, iki dönem stok/kart hazırlığı, gerçek teslim, restart/restore ve TR/EN mobil kanıtları tamamlanır.
  - Kabul 2: Aday 2.3.0 için sürüm notu/CI/imzalı AAB ve veri koruyan dağıtım hazırlanır; bu checklist tek başına yayın izni veya canlı değişim değildir.

### R2 — Mağaza ve seçim kasası — sonraki minor

- [ ] **COS-03 — Mağazaya özel dört ayrı kozmetik hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Sanat / ürün; efor: L.
  - Önkoşullar: COS-01, ECON-01.
  - Mevcut bağlar: `server/data/cosmetic_releases_v1.json`, `client/src/liveops-cosmetic-catalog.js`.
  - Yeni teslim önerisi: `docs/planning/shop-art-manifest.md`.
  - Kabul 1: İki mağaza çerçevesi ve iki zemin dönem ödül stoğundan farklı ID/tasarımla hazırlanır.
  - Kabul 2: Sahip olunan veya dönem ödülü olmuş öğe yeni mağaza ürünü gibi satılmaz; görünürlük ve kuşanma önizlemesi doğrulanır.

- [ ] **REWARD-02 — Kalıcı seçim hakkı ve tek teslim işlemini geliştir**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: REWARD-01, ECON-01, DATA-01.
  - Mevcut bağlar: `server/app/postgres_economic_operations.py`, `server/app/reward_delivery.py`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `server/app/reward_choices.py`, `server/tests/test_reward_choices.py`.
  - Kabul 1: Uygun üç seçenek hak doğarken sabitlenir; ödül miktarı istemciden kabul edilmez.
  - Kabul 2: Eşzamanlı/farklı request_id/tekrar bağlantı aynı hakkı ikinci kez vermez; başka hesap ve seçenek değiştirme reddedilir.

- [ ] **REWARD-03 — Kapanışta kazanılmış ama alınmamış hakları koru**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / ürün; efor: L.
  - Önkoşullar: REWARD-01, DATA-01.
  - Mevcut bağlar: `server/app/player_profile.py`, `server/app/reward_delivery.py`, `server/app/premium_reward_recovery.py`.
  - Yeni teslim önerisi: `server/app/period_reward_closeout.py`, `server/tests/test_period_reward_closeout.py`.
  - Kabul 1: Sezon kapanışı, geç dönen oyuncu ve dolu Mesaj Kutusu için kazanılmış hak kaybolmadan tekil aktarım tasarlanır.
  - Kabul 2: Premium iade, önceden alınmış ödül ve birden çok kapanış denemesi aynı teslimi tekrar üretmez.

- [ ] **SHOP-01 — Sürümlü ve incelenebilir teklif kataloğu kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: REWARD-01, ECON-01, COS-04.
  - Mevcut bağlar: `server/app/store_catalog.py`, `server/app/meta_progression.py`, `server/app/cosmetic_releases.py`.
  - Yeni teslim önerisi: `server/app/shop_offers.py`, `server/data/shop_offers_v1.json`.
  - Kabul 1: UTC başlangıç/bitiş, arena, fiyat türü, garanti içerik, limit, görsel ve TR/EN doğrulanır.
  - Kabul 2: Yayınlanan teklif değişmez; süre bitmiş/eski revision ve eksik ürün önizlemesi doğru hata verir.

- [ ] **SHOP-02 — Limit ve cüzdan işlemlerini atomik bağla**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: SHOP-01, DATA-01.
  - Mevcut bağlar: `server/app/postgres_economic_operations.py`, `server/app/main.py`, `server/app/store_refund_policy.py`, `client/src/auth-session.js`.
  - Yeni teslim önerisi: `server/app/shop_transactions.py`, `server/tests/test_shop_offers.py`.
  - Kabul 1: Önizlemedeki teklif ID/sürümüyle alım yapılır; istemci ödül veya fiyat belirlemez.
  - Kabul 2: İki eşzamanlı alım limit aşamaz; yanıt kaybı tekrar ücret düşürmez; bakiyeler/eski makbuzlar korunur.
  - Kabul 3: Yeni API yolları Bearer kimliği/hesap sahipliği ve native API prefix yönlendirmesiyle doğrulanır.

- [ ] **SHOP-03 — İlk garantili teklif ve kozmetik pilotunu hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / backend / istemci; efor: M.
  - Önkoşullar: SHOP-02, COS-03.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/cosmetic_releases.py`, `client/src/app.js`.
  - Yeni teslim önerisi: `docs/planning/first-shop-release.md`.
  - Kabul 1: Bir hedefli güncel modül-parçası teklifi ve iki ayrı kozmetik seti ekonomik bütçeyle tanımlanır.
  - Kabul 2: Arena uygunluğu, sahip olunan ürün reddi, açık fiyat/miktar ve satın alma limitleri gerçek API ile doğrulanır.

- [ ] **UI-02 — Mağaza gezinmesini ve ürün detayını uygula**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci; efor: L.
  - Önkoşullar: UI-01, SHOP-01.
  - Mevcut bağlar: `client/index.html`, `client/src/app.js`, `client/src/shop-rewards-v6.css`, `e2e/painted-shop-chests.spec.js`.
  - Yeni teslim önerisi: `client/src/shop/offer-view.js`.
  - Kabul 1: Dört mağaza bölümü, mevcut Bronz hediye ve garanti/olasılık ayrımı görünür; yeni hediye kaynağı eklenmez.
  - Kabul 2: Yetersiz bakiye, limit dolu, sahip olunan, süresi bitmiş, fiyat yüklenmedi ve çevrimdışı durumları doğru çalışır.

- [ ] **UI-03 — Seçim kasası ve sandık sonucunu geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / sanat; efor: L.
  - Önkoşullar: UI-01, REWARD-02.
  - Mevcut bağlar: `client/src/app.js`, `client/src/reward-chest-art-v5.css`, `e2e/casual-chest-opening.spec.js`.
  - Yeni teslim önerisi: `client/src/rewards/choice-view.js`.
  - Kabul 1: Üç seçenekli önizleme/seç/onay/teslim akışı; çıkışta ve bağlantı kopmasında hak korunur.
  - Kabul 2: Sandık sonucu makbuzla aynı; kaynak/garanti/olasılık etiketi, atla ve toplu açma özeti test edilir.

- [ ] **POLICY-01 — Yeni ürünler için fiyat/olasılık ve yaş kapısını denetle**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / ödeme / QA; efor: M.
  - Önkoşullar: SHOP-01, REWARD-02.
  - Mevcut bağlar: `server/tests/test_chest_odds_disclosure.py`, `server/tests/test_analytics_age_gate.py`, `docs/CHILD_AUDIENCE_AUDIT.md`, `docs/STORE_PURCHASES.md`.
  - Yeni teslim önerisi: `docs/planning/new-products-store-review.md`.
  - Kabul 1: Satın alma öncesinde garanti, olasılık, uygun havuz ve yerel Billing fiyatı doğru görünür; sahte indirim etiketi yoktur.
  - Kabul 2: O gün geçerli Play/varsa iOS ve hedef bölge politikası kontrol edilir; reklam/IAP/analitik rolloutları kendiliğinden açılmaz.

- [ ] **RELEASE-02 — İkinci minor: mağaza ve seçim kasası pilotunu yayıma hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / QA / operasyon; efor: L.
  - Önkoşullar: RELEASE-01, SHOP-03, UI-02, UI-03, REWARD-03, POLICY-01.
  - Mevcut bağlar: `e2e/reward-navigation.spec.js`, `server/tests/test_reward_delivery.py`, `.github/workflows/quality.yml`.
  - Yeni teslim önerisi: `docs/planning/release-r2-evidence.md`.
  - Kabul 1: Gerçek API ile limit/ödeme/tekrar/çevrimdışı/yanlış seçenek/sahiplik ve eski stok senaryoları geçer.
  - Kabul 2: Kazanılmış haklar korunarak pilot kapatılabilir; fiyat/miktar kararı ve sonraki minor numarası kayıtlanır.

### R3 — Günlük deney ve öğrenme döngüsü

- [ ] **REWARD-04 — Katkı ve ustalık ödül bütçelerini tanımla**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / backend; efor: M.
  - Önkoşullar: ECON-01.
  - Mevcut bağlar: `server/app/season_competition.py`, `server/app/team_tournament.py`, `server/app/player_progression.py`.
  - Yeni teslim önerisi: `docs/planning/participation-reward-budget.md`.
  - Kabul 1: Sıralama prestiji ile sınırlı katkı kaynak ödülü ayrılır; yalnız ilk üç dışında erişilebilir hedef tanımlanır.
  - Kabul 2: AI, eğitim, teslim olma ve tekrar maç istismarı için uygunluk/tavan açıkça yazılır.

- [ ] **UI-05 — Savaş bilgisinin okunabilirliğini iyileştir**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / oyun tasarımı; efor: M.
  - Önkoşullar: UI-01.
  - Mevcut bağlar: `client/src/battle`, `e2e/battle-render-budget.spec.js`, `e2e/battle-density.spec.js`.
  - Yeni teslim önerisi: `docs/planning/battle-readability-review.md`.
  - Kabul 1: Hasar, iyileştirme, koruma ve çekirdek yeteneği birbirinden ayırt edilir; hedef/yerleşim kuralı değişmez.
  - Kabul 2: Yeni süs efekti kapalıyken bilgi kaybolmaz; mevcut platform kare bütçesi eşikleri korunur.

- [ ] **UI-06 — Maç sonrası öğrenme ve deste kaydetme akışını tasarla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / istemci / backend; efor: L.
  - Önkoşullar: BASE-03, UI-05.
  - Mevcut bağlar: `server/app/game/engine.py`, `client/src/app.js`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `docs/planning/post-battle-learning.md`.
  - Kabul 1: Kesinleşmiş maçtan doğrulanabilir kısa neden özeti ve tek sonraki eylem sunulur.
  - Kabul 2: Gizli rakip bilgisi ifşa edilmez; deste kaydetme/tekrar giriş gerçek hesap ve eski maç sürümleriyle ele alınır.

- [ ] **ANALYT-02 — Baz rapor ve deney karar dosyasını hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / analiz; efor: M.
  - Önkoşullar: ANALYT-01, RELEASE-01.
  - Mevcut bağlar: `tools/product_analytics_report.py`, `server/app/product_analytics.py`.
  - Yeni teslim önerisi: `docs/planning/liveops-experiment-decisions.md`.
  - Kabul 1: İlk iki haftalık baz çizgi, kohort uygunluğu, onaylı örneklem yanlılığı ve ana/koruyucu metrikler yazılır.
  - Kabul 2: Beş kişilik rapor eşiği yeterli deney örneklemi sayılmaz; sonuçta devam/düzelt/durdur kararı kayıt altına alınır.

- [ ] **LIVE-02 — Günlük Devre Deneyi sunucu prototipini geliştir**
  - Durum: Yapılacak. Öncelik: P0; rol: Oyun motoru / backend; efor: L.
  - Önkoşullar: LIVE-01, REWARD-04, DATA-01.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/game/pvp_runner.py`, `server/app/reward_delivery.py`.
  - Yeni teslim önerisi: `server/app/challenge_rules.py`, `server/tests/test_daily_challenge.py`.
  - Kabul 1: Gün/tohum/altılı deste/kural/başarı sunucuya aittir; tekrar oynanabilir tek kısa görev hazırlanır.
  - Kabul 2: İlk başarı ödülü kalıcı tekildir; tarih değişimi, iptal, AI sonuç doğrulaması ve tekrar istismarı test edilir.

- [ ] **LIVE-03 — Etkinlik girişini ve Bugünün Deneyi akışını bağla**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / içerik; efor: M.
  - Önkoşullar: LIVE-02, UI-04.
  - Mevcut bağlar: `client/index.html`, `client/src/app.js`, `client/assets/ui/events-v2`.
  - Yeni teslim önerisi: `client/src/liveops/event-view.js`.
  - Kabul 1: Başlamadan hedef, kural, süre ve ödül; tamamlandıktan sonra sonuç ve tekrar seçeneği görünür.
  - Kabul 2: Günlük meta ile deney ayrılır; aynı anda tek özel vitrin ve alternatif ana savaş erişimi korunur.

- [ ] **LIVE-07 — Modül/çekirdek ustalığı ve kalıcı hedefleri geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / backend; efor: L.
  - Önkoşullar: REWARD-04, UI-05.
  - Mevcut bağlar: `server/app/player_profile.py`, `server/app/player_progression.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `server/app/mastery_progress.py`, `server/tests/test_mastery_progress.py`.
  - Kabul 1: Sadece kullanım sayısı yerine doğrulanabilir başarı, öğrenme hedefi ve kalıcı vitrin tasarlanır.
  - Kabul 2: Eğitim/AI/tekrar maç uygunluğu ve sezon ödülünden ayrı kalıcı kimlikler test edilir.

- [ ] **LIVE-12 — Haftanın Kuralı için sınırlı etkinlik şablonu hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / backend; efor: M.
  - Önkoşullar: LIVE-02.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `docs/planning/weekly-rule-template.md`.
  - Kabul 1: Tek anlaşılır kural farkı ve farklı deste problemi için en az dört içerik briefi hazırlanır.
  - Kabul 2: Normal arena etkilenmez; farklı tohum tek başına yeni içerik sayılmaz, ödül kaynağı için ek stok hesaplanır.

- [ ] **PLAY-01 — Ödülsüz deste deneme alanını geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun motoru / istemci; efor: L.
  - Önkoşullar: BASE-03.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/player_profile.py`, `client/src/app.js`.
  - Yeni teslim önerisi: `docs/planning/deck-lab-flow.md`.
  - Kabul 1: Dengeli AI ile hızlı tekrar, deste kaydetme ve sınırlı etkinlik kartı denemesi tasarlanır.
  - Kabul 2: Sahip olunmayan kart gerçek koleksiyona eklenmez; normal savaş/mağaza ödülü üretmez.

- [ ] **RELEASE-03 — Üçüncü minor: günlük deney pilotunu değerlendirmeye aç**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / QA / operasyon; efor: L.
  - Önkoşullar: RELEASE-02, LIVE-03, ANALYT-02, REWARD-04.
  - Mevcut bağlar: `.github/workflows/quality.yml`, `e2e/battle-render-budget.spec.js`.
  - Yeni teslim önerisi: `docs/planning/release-r3-evidence.md`.
  - Kabul 1: Devre Deneyi, ilk başarı/tekrar, gün değişimi ve gerçek ödül makbuzu uçtan uca doğrulanır.
  - Kabul 2: Tek etkinlik vitrini, yeterli yeni ödül stoğu, koruyucu kalite ölçüleri ve devam/düzelt/durdur kararı tanımlanır.

- [ ] **RET-01 — Geri dönüş ve bildirim tercihlerini uygula**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / istemci; efor: M.
  - Önkoşullar: BASE-03, RELEASE-01.
  - Mevcut bağlar: `server/app/release_updates.py`, `client/src/app.js`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `docs/planning/returning-player-summary.md`.
  - Kabul 1: Dönen oyuncu kısa sürüm özeti, korunmuş ilerleme ve tek uygun hedef görür.
  - Kabul 2: Bildirim açık tercih/sessiz saat kuralına bağlıdır; bu iş e-posta/push/mesaj gönderimini kendiliğinden açmaz.

### R4 — Ölçüme bağlı büyüme

- [ ] **CARD-03 — Yeni içerik kategorileri ve ileri kart stoğunu tasarla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun tasarımı / sanat; efor: M.
  - Önkoşullar: CARD-02.
  - Mevcut bağlar: `server/data/season_module_releases_v2.json`, `server/app/game/core_balance.py`.
  - Yeni teslim önerisi: `docs/planning/content-expansion-catalog.md`.
  - Kabul 1: Darbe Muhafızı/Toparlanma Feneri için ayrı mekanik brief; çekirdek görünümü, unvan ve takım vitrini için fizibilite çıkarılır.
  - Kabul 2: Yeni kozmetik tipleri sahiplik/renderer/perf maliyetiyle sıralanır; yeni savaş gücü ve para birimi otomatik açılmaz.

- [ ] **SHOP-04 — Yeni gerçek para paketlerini ayrı kapıdan geçir**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Ödeme / ürün; efor: L.
  - Önkoşullar: SHOP-02, RELEASE-02.
  - Mevcut bağlar: `server/app/store_catalog.py`, `server/app/store_verification.py`, `server/app/premium_reward_recovery.py`, `docs/STORE_PURCHASES.md`, `client/tests/native-store-prices.test.js`.
  - Yeni teslim önerisi: `docs/planning/new-iap-product-release.md`.
  - Kabul 1: Gerekli olursa product_id, yerel Billing fiyatı, hesap bağı ve iade kökeni uçtan uca tasarlanır.
  - Kabul 2: Makbuz doğrulanmadan hak verilmez; mevcut ürünler/abonelikler değişmez, web ödeme mağazası kendiliğinden açılmaz.

- [ ] **LIVE-04 — Üç duraklı PvE Seferi geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun motoru / backend / istemci; efor: XL.
  - Önkoşullar: RELEASE-03.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/reward_delivery.py`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `server/app/pve_expedition.py`, `server/tests/test_pve_expedition.py`.
  - Kabul 1: Üç farklı rakip dizisi ve durak arası kayıt; koşu/kural/ödül sürümü sabitlenir.
  - Kabul 2: İlk tamamlama ve tekrar ödülü ayrılır; cihaz değişimi/çökme/aynı durak tekrarı kaynak çoğaltmaz.

- [ ] **LIVE-05 — Asenkron takım ortak hedefi geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Backend / oyun tasarımı; efor: XL.
  - Önkoşullar: RELEASE-03, REWARD-04.
  - Mevcut bağlar: `server/app/team_service.py`, `server/app/team_tournament.py`, `server/app/reward_delivery.py`.
  - Yeni teslim önerisi: `server/app/team_shared_goal.py`, `server/tests/test_team_shared_goal.py`.
  - Kabul 1: Üyeler farklı zamanlarda doğrulanmış PvE katkısı yapar; küçük takımlar için erişilebilir hedef belirlenir.
  - Kabul 2: Katkı tavanı, üyelik anı, takım değiştirme ve ödülü kimin alacağı sabit hak olarak test edilir.

- [ ] **LIVE-06 — Eşit seviyeli Draft Arenası pilotu hazırla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun motoru / ürün; efor: XL.
  - Önkoşullar: RELEASE-03, ANALYT-02.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`, `server/app/matchmaking.py`.
  - Yeni teslim önerisi: `docs/planning/draft-arena-pilot.md`.
  - Kabul 1: Güncel katalogdan seçme sırası, havuz ve seviye eşitleme kuralları prototiplenir.
  - Kabul 2: Aktif rakip/kuvvet farkı/bekleme ölçülmeden yeni kalıcı kuyruk açılmaz; ödül budget kapısından geçer.

- [ ] **LIVE-08 — Asenkron arkadaş meydan okumasını tasarla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Backend / ürün; efor: L.
  - Önkoşullar: LIVE-04.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `docs/planning/async-challenge-design.md`.
  - Kabul 1: Paylaşılabilir tohum/kurulum sürümü ve sunucuda doğrulanan hedef belirlenir.
  - Kabul 2: Canlı rakip gerekmez; paylaşım kişisel veri/erişim belirteci taşımaz; süresi ve ödül tavanı tanımlanır.

- [ ] **LIVE-09 — BO3 ve deste yasağı fizibilitesini hazırla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun tasarımı / backend; efor: L.
  - Önkoşullar: LIVE-06, ANALYT-02.
  - Mevcut bağlar: `server/app/game/pvp_runner.py`, `server/app/team_tournament.py`.
  - Yeni teslim önerisi: `docs/planning/bo3-ban-design.md`.
  - Kabul 1: Seri durumu, yasak/seçim, kopma/yeniden bağlanma ve süre aşımı sözleşmesi çıkarılır.
  - Kabul 2: Yeterli eşleşme hacmi ve turnuva ihtiyacı ölçülmeden üretim kuyruğu açılmaz.

- [ ] **LIVE-10 — 2v2 için protokol ve performans araştırması yap**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Ağ / oyun motoru; efor: XL.
  - Önkoşullar: LIVE-05, ANALYT-02.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/game/pvp_runner.py`.
  - Yeni teslim önerisi: `docs/planning/2v2-protocol-spike.md`.
  - Kabul 1: Dört katılımcı sahipliği, komut sırası, eşleşme, kopma ve hile modeli tasarlanır.
  - Kabul 2: Düşük cihaz yükü ve ağ prototipi olumlu olmadan tam 2v2 uygulama taahhüdü verilmez.

- [ ] **LIVE-11 — Boss ve özel arena davranışı prototiple**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun motoru / sanat; efor: XL.
  - Önkoşullar: LIVE-04.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/game/core_balance.py`.
  - Yeni teslim önerisi: `docs/planning/boss-arena-prototype.md`.
  - Kabul 1: Bir boss için aşama/telegraph/karşı oyun ve sürümlü kural paketi tasarlanır.
  - Kabul 2: Ödül bütçesi ve düşük cihaz okunabilirliğiyle dene; normal arenanın ortak kuralları değişmez.

## 8. Ortak tamamlanma tanımı

- [ ] Görevin tüm kabul ölçütleri kanıtlandı; sahte/sunum fixture kanıtı gerçek ödeme/ödül teslimi diye gösterilmedi.
- [ ] Hesap sahipliği, tekrar talep, eşzamanlı talep, yanlış revision, süre sınırı ve çevrimdışı dönüş senaryoları ilgili işte doğrulandı.
- [ ] Eski oyuncu/maç/sandık/makbuz, premium iade ve varsa eski istemci uyumluluğu korundu.
- [ ] UI değişiminde TR/EN, iki dar ekran, kilit/boş/hata/yükleme ve performans kanıtı var.
- [ ] Yeni kaynak JSON/uç/varlık varsa paketleme ve native API prefix bağları güncellendi.
- [ ] İçerik/ödül artışının ekonomi raporu, sanat kabulü ve kaynak stoğu yeterli.
- [ ] Yeni minor sürüm notu, gerekli CI/AAB ve veri koruyan yayın/geri dönüş planı hazır.
- [ ] Kazanılmış haklar kapatma/rollback ile silinmiyor; kullanıcıya görünen açıklama gerçek sunucu kuralıyla aynı.

## 9. Bağımlılığa göre geçerli çalışma sırası

Bu sıra tek olası plan değildir; önkoşulları önceleyen doğrulanmış bir sıralamadır. `later` işlerin burada bulunması başlayacakları anlamına gelmez.

BASE-01 → BASE-02 → BASE-03 → ECON-01 → COS-01 → COS-02 → COS-03 → COS-04 → CARD-01 → CARD-02 → CARD-03 → REWARD-01 → DATA-01 → REWARD-02 → REWARD-03 → REWARD-04 → SHOP-01 → SHOP-02 → SHOP-03 → UI-01 → QA-01 → ANALYT-01 → OPS-01 → LIVE-01 → OPS-02 → UI-04 → BALANCE-01 → RELEASE-01 → UI-02 → UI-03 → POLICY-01 → RELEASE-02 → SHOP-04 → UI-05 → UI-06 → ANALYT-02 → LIVE-02 → LIVE-03 → RELEASE-03 → LIVE-04 → LIVE-05 → LIVE-06 → LIVE-07 → LIVE-08 → LIVE-09 → LIVE-10 → LIVE-11 → LIVE-12 → PLAY-01 → RET-01
