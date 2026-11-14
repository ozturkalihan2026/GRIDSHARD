# Son karar: SDK hariç tutma 2.5.0 kapsamında — 14 Kasım 2026

- Kullanıcı 2.4.0'ın onaylanıp kullanıcılara açıldığını teyit etti;
  config/release-candidates/2.4.0.json published=true ve kullanıcı teyidiyle güncellendi.
- Kullanıcı talimatı: reklam/satın alma kodları silinmez; SDK/izin temizliği
  **2.5.0 paketine** alınır. Bu iş için2.4.1 üretme; mevcut2.4.0
  AAB/tag/canlı sunucuyu değiştirme.21 Aralık hedefi ve28 Aralık S2 korunuyor.
- config/mobile-distribution.json ve sürüme bağlı derleme politikası eklendi:
  2.5+ Capacitor allowlist'inde AdMob/Native Purchases yok; native-store.js
  web/mobil birleşik JS'ye alınmıyor. Kaynak/lockfile/Java şablonları korunur.
  Native üretim Ad Safety sınıfı/kaynak/kaydını ve doğrudan SDK'yı dışarıda bırakır;
  BILLING/reklam/AdServices izinleri birleştirmede engellenir. Firebase opt-in,
  Secure Storage, Play Games/giriş/bildirimler korunur. Sunucu eski hak/iade
  kodlarına ve oyuncu verilerine dokunulmadı.
- tools/audit_android_r8.py son AAB'nin kendi paket sürümüne göre2.5+ için
  DEX/R8 mapping/eklentiler/tüm manifestlerde SDK/izin varlığını reddeder;
  2.4 beklentisi korunur. Mevcut son rc.5 AAB yeniden denetlendi:9 eklenti PASS.
- 18 dağıtım/build +21 native regresyon +38 Python denetim/plan testi PASS;
  diff kontrolü temiz. CI çalıştırılmadı. Son2.5 imzalı AAB ve gerçek cihaz
  kabulü henüz yapılmadı; POLICY-01 in_progress, bitmiş sayma.
- Plan ve checklist bağlı kaynaklardan yeniden üretildi. Ayrıntı:
  docs/planning/mobile-250-without-monetization.md. Kullanıcı commit/push talimatı verdi;
  web/mağaza teslimi ile 2.5.0 paketleme çalışması iki ayrı commit olarak kaydediliyor.
- Play Console beyanları/ürünleri ve halka açık rozet kontrolü kullanıcıda;
  otomatik işlem yapma. Bütün10 ürünün kapandığı teyit edilmedi. Mevcut web
  yayını doğrulandı; metindeki2.4 inceleme durumu kullanıcı onay teyidinden önce
  hazırlanmıştı, sonraki site tesliminde güncellenmeli. Bu tur siteyi tekrar yayımlama.

# Önceki durum: web yayını doğrulandı, Play rozetleri inceleniyor — 14 Kasım 2026

- Kullanıcı web ZIP'ini yüklediğini teyit etti. Canlı `https://gridshardgame.com`
  **11 sayfa/app-ads +15 asset kontrolünde PASS**; boyut/SHA256 son teslimle
  birebir, scriptsiz CSP/no-transform/plain mailto korunuyor. Kanıt
  qa_reports/site-240-20261114/live-verification.json ve teslim klasöründeki
  PUBLICATION_VERIFIED.json. Site için yeni yükleme gerekmiyor.
- Kullanıcı Play mağazasında hâlâ “Reklam içerir · Uygulama içi satın alma”
  gördüğünü bildirdi. Son rc.5 imzalı APK'da **com.android.vending.BILLING**
  bulundu. Gerçek para girişleri gizli olsa da native satın alma/geri kazanım
  SDK'sı pakette korunmuş; katalog kapatma rozetin kalkmasını garanti etmez.
  SDK/izin temizliği yeni paket gerektirebilir. Sadece önbelleğe bağlama.
- Reklam etiketi için güncel reklam beyanı ve yayın özeti doğrulanmalı.
  Tüm10 ürünün kapanmış olduğu henüz kullanıcı/Console ile doğrulanmadı;
  yalnız260/480 Akı kapanışı önceki turda görüldü. Oyun sürümü onayı da
  ayrıca doğrulanmadan2.4.0 yayında kabul edilmez. Console kontrolü kullanıcıda;
  otomatik beyan/ürün/release değişikliği yapma.

# Son teslim: web sitesi paketi hazır, yükleme kullanıcıda — 14 Kasım 2026

- Kullanıcı siteyi güncellemeyi istedi, ardından Edge'den kendisinin
  yükleyeceğini söyledi. Cloudflare'da giriş/yayın yapılmadı; açılan geçici
  giriş sekmesi kapatıldı. Yeni talimat olmadan yükleme veya DNS değişikliği yapma.
- **deliverables/GRIDSHARD_WEB_2.4.0_2026-11-14.zip** hazır:
 29 izinli statik dosya, 909.226 byte; SHA256
  **780c8d7ad58749f2005505e2eeea99688f5b526bb85b5bedbf4f2fab586d37d0**.
  Son ZIP girdileri manifestle birebir doğrulandı. Talimat/manifestler aynı
  adlı teslim klasöründe, yüklenen arşivin dışında durur.
- TR/EN ana sayfa gerçek 2.4.0 ekranları, 6 açık/18 ilerlemeyle açılan modül,
 7 çekirdek, 30 Kasım 03.00 TR planı ve 2.4.0'ın incelemede olmasıyla yenilendi.
  Destek/gizlilik/hesap silme/kullanım şartları güncel ücretsiz modele uyarlandı;
  eski işlem ve iade hakları, veri/retention açıklamaları korundu. Yeni galeri
  oyunun ortak sanat yönünü kullanır. Eski app-ads.txt/logo/favicon/CSP korunur.
- 18 site testi ve 30 TR/EN rota/layout kontrolü PASS; son ek browser tekrarı
  otomatik onay kullanım kotasına takılıp çalışmadı. Son kaynak tekrar derlendi;
  paket byte/SHA karşılaştırması PASS. Canlıya yükleme henüz doğrulanmadı.
- Mevcut Cloudflare Pages **gridshard-public → Production** hedeflenir.
  Kullanıcı yükleyince canlı doğrulama gerekir; oyun sunucusu/AAB değişmedi.
  Not: docs/planning/public-site-240-refresh-20261114.md.
  Site/mağaza hazırlığı değişiklikleri çalışma ağacında; commit/push yapılmadı.

# Son kontrol: üretim modül kilitleri — 14 Kasım 2026

- Kullanıcı son AAB'de bütün 24 modülün açık kalmış olabileceğini sordu.
  Son imzalı rc.5 AAB'nin SHA256'sı teslim manifestiyle doğrulandı;
  üretim paket kimliği/HTTPS API doğru, yerel toplu açma uç noktası yok.
- Hem aynı değişmez üretim imajında hem canlı konteynerde yalnız bellekte
  oluşturulan sıfır kupalı yeni profilde **6 açık/18 kilitli** doğrulandı.
  Başlangıç destesi aynı altılı, legacy_module_unlocks boş. Diğer 18 modülün
  her biri eşikten bir kupa önce kilitli, eşikte açık: 36 sınır kontrolü PASS.
  Gerçek üretim hesabı oluşturulmadı veya değiştirilmedi.
- 24 açık modül, kullanıcının ses denemesi için daha önce açıkça istediği
  ayrı yerel S1 TEST hesabındaki haktır; üretim paketine başlangıç kuralı
  olarak taşınmamıştır. İlerlemiş gerçek hesapların kazanılmış açılımları
  korunur. Bu konu için oyun kodu, sunucu veya AAB değişmedi.
- Ham kanıt: qa_reports/module-unlock-audit-20261114/proof.json.

# Son durum: Play incelemesi ve mağaza hazırlığı — 13 Kasım 2026

- Kullanıcı rc.5 AAB'yi Play Console'a yüklediğini ve incelemeye gönderdiğini
  doğruladı. Onay veya üretime dağıtım henüz doğrulanmadı. Pin dosyasında
  `play_review_submitted=true`; `published=false` korunur. Canlı rc.5 değişmedi.
- Kullanıcı mağaza görsellerini ve satış/reklam/satıcı beyanlarını güncellemek
  istedi; ardından Console işlemlerini kendisinin yapacağını söyledi. Kontrol
  kendisine bırakıldı. Yeni talimat olmadan Console'da değişiklik yapma.
- Console'da 10 ürünün her birinde bir etkin `standard` satın alma seçeneği
  görüldü. Yalnız `gridshard.flux_260` ve `gridshard.flux_480` devre dışı
  bırakıldı; “Etkin değil” durumu doğrulandı. Kalan 8 ürün kullanıcının işi.
  Reklam/satıcı beyanı, açıklamalar ve görseller Console'da değiştirilmedi.
- Kullanıcıya ürün detayından “Satın alma seçeneğini göster → Devre dışı bırak”
  yolu verildi. Satıcı beyanı hesap genelidir; bugünkü ticari faaliyete göre
  doğru beyan kullanıcı tarafından yapılır, iş modeli değişirse güncellenir.
  Diğer veri güvenliği/sohbet beyanları otomatik olarak “yok” yapılamaz.
- Yeni görsel teslimi yerelde hazır: **deliverables/GRIDSHARD_MAGAZA_2.4.0_2026-11-13/**
  ve aynı adlı ZIP. TR/EN sekizer 1080×1920 PNG, gerçek yeni savaş/çekirdek
  etkinleşmesi ve altı menü; görüntüler uydurulmadı. Ölçü, metin sınırı,
  gerçek sayfalarda JS/eksik görsel/taşma ve toplu görsel QA geçti. Eski
  Premium kolajı çıkarıldı; açıklamalar gerçek parayla alımsız/reklamsız
  modele göre hazırlandı. Yükleme öncesi tüm 10 Play ürününün kapalı olması ve
  2.4.0'ın onaylanıp dağıtılmasıyla metin/oyun durumunu eşleştir.
- Yeniden üretim araçları tools/capture-store-240.cjs,
  tools/capture-store-240-battle.cjs, tools/package-store-240.cjs.
  Bunlar üretim hesabına dokunmadan ayrı loopback 8899 üzerinde çalıştı.
  Telefonun 8897 sunucusu/hesabı korunur. Bu tur yeni AAB/sunucu üretilmedi.
- Ayrıntılı not: docs/planning/play-store-240-refresh-20261113.md.
  Bu mağaza hazırlığı dosyaları henüz commit/push edilmedi.

# Önceki operasyon: 2.4.0 rc.5 sunucu ve imzalı AAB tamamlandı — 13 Kasım 2026 23.28 TR

- Kullanıcının açık isteğiyle son turnuva düzeltmeleri canlıya alındı. Kaynak
  **825cbe27c10407a729aeb50393f4979fdba96152**, etiket **v2.4.0-rc.5**;
  güncel pin `config/release-candidates/2.4.0.json`. Eski rc.4 ve v2.4.0
  etiketleri korunur, yeni teslim için seçilmez. AAB 2.4.0/code15 olarak kaldı.
- Canlı imaj **sha256:4f9b62995f551770691adcb4f26926256618136cddf9759f6d19833c0fe32b52**.
 59 profil/28 tablonun bütün içeriği korundu; yeni yedek izole PG'de restore
  doğrulandı. Geçiş 19,28 sn; ortam/mount/diğer servis değişikliği yok.
  HTTPS healthy/runtime2.4.0, protokol 2/eski istemciler, restart 0 ve kabul
  edilen JS hash'i doğrulandı. Wire alias server_release_version=2.3.0 kalır.
- İki turnuva kartı 30 Kas başlangıcını gösterir; kapalı turnuvada eski kayıtlar
  olsa bile sıralama boş, haftalık ilk dönem 30 Kas–6 Ara'dır. Takım kartı
  artık dönem sonunu haftalık yenilenme tarihi diye göstermez. Sezon/iki
  turnuva 30 Kasım 03.00 TR–28 Aralık 03.00 TR. S1 içerik yayın kabulü hâlâ ayrı
  tamamlanacak; bu işlem sezonu aktive etmedi. Ücretli alanlar/reklamlar kapalı.
- Son test: **2103 Linux/Python 3.12+PG17/Redis PASS, sıfır skip**; 784 istemci,
 13 build,103 araç; yeni turnuva Chromium/WebKit2/2 PASS. Üretim imajı gerçek
  PG/Redis hesap/restart/full restore/reviewer iki cihaz/kapalı reklam PASS.
  Windows tam testinin ilerlemeyen ilk süreci durduruldu; tanılı tekrar native
  access violation ile kesildi. Linux ilk denemede rapor dizini readonly yüzünden
  3 hata verdi; yalnız QA rapor bağı yazılabilir yapılıp tam 2103/2103 geçildi.
  Yeni hosted CI sonucu yok; skip ci commitleri quota tüketimini önler.
- **Güncel AAB:** `deliverables/release-2.4.0-v15-20261113-rc5/GRIDSHARD-2.4.0-v15.aab`
 42.713.464 byte; SHA256 **7a0ce973f6504555a3da2d3b90e6e378a22a9efbeff787b4e92478ff538403d1**.
  Mevcut upload imzası,580 web dosyası/paket, 9 R8 native eklentisi PASS.
  Manifest/mapping/TR-EN Play notları/App Access talimatı aynı klasörde.
  Teslim anında Play yüklemesi yapılmamıştı; sonraki kullanıcı teyidi üstte.
  Eski rc.4 AAB yerine rc.5 kullan.
- Fiziksel S1 TEST son AAB web dosyalarıyla tekrar güncellendi; 582 ortak dosyada
  yalnız yerel API adresi farklı. Aynı hesap/24 modül, iki doğru kart ve boş
  sıralamalar PASS. Play'deki üretim uygulaması değiştirilmedi.
- Yerel telefon API 8897/PID 8992, `.mobile-debug/runtime-s1-20261106` korunur.
  Yeniden başlatırken S1_ACCEPTANCE=1 / S1_BOTS=1 yanında
  **GRIDSHARD_E2E_S1_PRELAUNCH=1** kullan: gerçek bugüne göre bekleme görünür;
  bu bayrak olmadan bot kabul senaryosu yeniden 12 Aralık'a ilerler.
  Telefonda test sırasında başka uygulama öne gelirse yeniden S1 TEST'i aç.
- Yeni operasyon `/opt/gridshard/operations/release-240-20261113-825cbe27c104-r2`,
  yedek `/var/backups/gridshard-production/20261113-before-240-825cbe27c104-r2`.
  Geçici aktarım arşivi checksum doğrulandıktan sonra silindi, yedek/imajlar durur.
- Kabul raporu `docs/planning/release-240-rc5-acceptance-20261113.md`.
  Aşağıdaki rc.4 kayıtları tarihçedir; güncel teslim bu üst bölümdeki rc.5'tir.

# 2.4.0 sunucu geçişi tamamlandı — 13 Kasım 2026 21.39 TR

- Canlı runtime **2.4.0**, kaynak **d465dffda1cb5c13d0faf2eca4e33924c83729a4**,
  değişmez **v2.4.0-rc.4**. AAB/code15 aynı ayrı kaynakta üretildi. Güncel
  pin `config/release-candidates/2.4.0.json`; eski rc.1–rc.3 etiketleri korunur.
- Yeni yedek ayrı PostgreSQL'e restore edildi;59 profil ve 28 tablonun tamamı
  birebir eşleşti. Uygulama geçişi22,72 sn; PG/Redis/Caddy ve kalıcı bağlar aynı.
  Eski yedek canlıya yazılmadı. Son dış HTTPS healthy/runtime2.4.0, protokol 2,
  2.2.1/2.3.0/2.4.0 istemci uyumu doğrulandı. Restart/sağlık son denetimi ayrıca kayıtlıdır.
- **Wire alias tuzağı:** server_release_version=2.3.0 bilerek korunur;
  gerçek build `runtime_release_version` alanıdır. İlk tam deneme yanlış
  alan yüzünden geri döndü; ikinci deneme doğru alanla geçti. Runtime SQL
  migration baytları aynı; JSON migration checksum'u zaten CRLF→LF normalize
  eder. Bu farklar için veri/şema geçmişine dokunulmadı.
- Son testler:2049 sunucu /52 harici skip;129 Python3.12+PG17/Redis;
  784 istemci,13 build,103 araç PASS. Ana UI118PASS/7 koşullu skip;
  TR/EN dar/geniş mağaza ve gizli ücretli sezon yolu3PASS; S1 gerçek teslim12,
  son30Kasım takım takvimiyle bot UI6, gerçek iki istemcili PvP3PASS.
  Windows WebKit FPS sınırlaması aşağıdaki kabul kaydında açıkça belirtilir;
  yeni GitHub Actions/macOS sonucu yoktur, CI yeşil diye raporlanmaz.
- Telefonda son rc.4 web içeriğiyle S1 TEST güncellendi. Aynı hesap/24 modül,
  44 ses, iki2.4.0 etiketi, gizli ücretli sezon başlığı/hücreleri, geniş ücretsiz
  yol ve soğuk açılış PASS.582 ortak AAB/telefon web dosyasında yalnız beklenen
  yerel API runtime-config farkı var. Play'deki üretim uygulaması değiştirilmedi.
- Teslim **deliverables/release-2.4.0-v15-20261113-rc4/GRIDSHARD-2.4.0-v15.aab**;
  42.713.476 byte, SHA256 **dd406546b72f437ba2310a6cfa1e1f0eedcd7ebb37e96f6cbd14af965ee1b05b**.
  Mevcut upload sertifikası ve paket denetimleri PASS; manifest/mapping/TR-EN
  Play notları aynı klasörde. **Play Console yüklemesi/dağıtımı yapılmadı.**
- Kullanıcının son kesin kararı: S1, günlük giriş/sezon ödülleri, haftalık ve
  takım turnuvaları **30 Kasım 03.00 TR**; bitiş **28 Aralık03.00TR**. Dört hafta
  korunur. İki canlı tarih de2026-11-30T00:00:00Z, AdMob rollout disabled,
  test oyuncu listesi boş, ödeme/reklam test modları kapalı. Sezon şimdi aktif değil.
- **Sonraki iş:** kullanıcı AAB'yi Play'e yüklerken App access açıklamasını
  docs/PLAY_REVIEW_ACCESS.md'deki Settings > Account and Privacy yoluna günceller.
  S1 profili/kozmetik tahsisleri taslak; 30 Kasım'dan önce yayın kabulü ve
  dönem kataloğu ayrı tamamlanır. Bu gece otomatik olarak published/Android
  kabul kutuları işaretlenmedi. Genel sürüm takvimi/S2–S6 değişmedi.
- Operasyon: `/opt/gridshard/operations/release-240-20261113-d465dffda1cb-r2`;
  yedek `/var/backups/gridshard-production/20261113-before-240-d465dffda1cb-r2`.
  Operatör teşhis/secret/veri kayıtları yalnız sunucuda; Git'e alınmadı.
  Ayrıntı: [yerel yayın kabulü](docs/planning/release-240-local-acceptance-20261113.md).

---

# Önceki son yayın kararı — 13 Kasım 2026, rc.4 hazırlığı

- Kullanıcı aynı gün geçişin hemen yapılmasını onayladı. En son açık takvim:
  **S1 + günlük giriş/sezon ödülleri + haftalık ve takım turnuvaları
  30 Kasım 2026 03.00 TR**; bitiş **28 Aralık 03.00 TR**. Dört tam hafta
  ve mevcut üç kaynak haftası + kozmetik finali korunur. S1/S2–S6 tarihleri
  kaydırılmaz. Eski 7 Aralık takım başlangıcı kararı artık geçersizdir.
- Ücretli sezon başlığı ve ödül sütunu, mağazadaki gibi gizlendi; ücretsiz
  yol iki sütunlu (kademe + ücretsiz ödül) yerleşimde genişletildi. Kod ve
  premium hakları silinmedi. Yeni TR/EN×320/393 mağaza/sezon/win-result
  kabulü üç tarayıcıda 3 PASS. Sezon öncesinde günlük ve kademe haklarının
  sunucuda reddedildiği, başlangıç anında açıldığı ve 28 günlük iki dönemin
  eşit olduğu sınır testi PASS. Odaklı grup 60 PASS / 2 gerçek PG skip.
- Takım kozmetik tahsisi 30 Kasım dönemine bağlandı; stok raporu 7 dönem,
  9 tekil kozmetik, 7140 Kredi / 525 Akı / 234 modül parçası olarak yeterli.
  Sezon profili hâlâ taslaktır; yayın kabulü/sezon açılışı tamamlandı sayılmaz.
- rc.3 / 86ad7bf5 önceki ara adaydır; son istekleri içermez. Eski etiketler
  korunur; son paketler yeni rc.4 kaynağından üretilecek. Eski AAB teslim edilmez.
- Yerel Chromium/Android kare bütçesi PASS (p95 7,5 ms). Windows WebKit
  bütçesi FAIL; değiştirilmemiş ve macOS CI'si yeşil rc.2 de aynı Windows'ta
  FAIL (yaklaşık13fps/p95 93,5ms; yeni aday 12,3 fps / p95 97,5ms). Bu Windows
  ölçümü macOS veya gerçek iPhone kabulü olarak gösterilmez; eşik gevşetilmedi.
  Üç tarayıcıdaki tüm işlevsel kontroller PASS; Android fiziksel kabul aşağıda.
- Canlı son kontrol: sağlıklı 2.3.0,59 profil, sıfır maç/WebSocket. Önceki
  katalog denemesi geri alındı; 2.4.0 dağıtımı bu kayıt anında henüz yapılmadı.

---

# Önceki evde yayın kabulü — 13 Kasım 2026

- Kullanıcı 22.00'yi beklemeyip geçişi **şimdi** yapmamızı istedi. S1
  30 Kasım 03.00 TR; takım turnuvası ayrı kapıda, bu kararla sezon açılmaz.
- SSH ev IP kuralı kullanıcı tarafından güncellendi; bağlantı çalışıyor.
  Canlı 2.3.0 sağlıklı, 59 profil ve son kontrolde sıfır aktif maç/WebSocket.
- Yerel kabul: 784 istemci, 13 build, 2048 sunucu (52 harici servis atlaması),
  103 araç testi; gerçek PostgreSQL 17/Redis grubunda 104 PASS. Duyuru PG testi
  değişmiş canlı kampanyaya bağımlılıktan ayrıldı; görünür popup, rollback ve
  cache kaybı sonrası tekrar onayı doğrular. Ürün davranışı gevşetilmedi.
- Üç tarayıcı ana UI: 118 PASS / 7 koşullu skip, retry/flaky yok. Ücretli alan
  duraklatma 3 PASS; hazır test sağlayıcısı, TR/EN×320/393, reload, gerçek savaş
  ve programatik tıklamalarda sıfır yeni işlem. S1 12, bot UI 6, PvP 3 PASS.
- Üretim imajı hesap/restart/boş hedef restore ve reviewer hesabı akışlarını
  geçti. Eski 2.2.1/2.3.0 gerçek HTTP uyumu 10 senaryo PASS; eski 2.3.0'da
  yeni haberin okunması/okundu kalması web ve native-origin emülasyonunda PASS.
- İmzalı 2.4.0/code15 AAB/APK mevcut yükleme anahtarıyla üretildi ve denetlendi;
  kaynak kabulü bitince son sabit adaydan tekrar paketlenip teslim edilecek.
  Kullanıcı Play'de code15'in kullanılmadığını doğruladı. Play yüklemesi yok.
- Gerçek Android S1 TEST güncellendi: aynı hesap/24 modül, iki 2.4.0 etiketi,
  gizli ücretli mağaza, normal sandıklar, 44 ses hash'i ve soğuk açılış PASS.
  Kaydedilmiş menü5/savaş55 korunur; yeni hesap varsayılanı5/50. Test APK ve AAB
  içindeki 582 ortak web dosyasında yalnız beklenen API runtime-config farkı var.
  Ses beğenisi kullanıcı dinleme kabulüdür; bu tur yeniden dinlendi sayılmaz.
- Ön haberin yalnız katalog operasyonunda güncel yedek ve izole restore geçti:
  28 tablonun tüm içerikleri eşleşti. Env/Mounts sıralaması karşılaştırması
  geri dönüş tetikledi; çalışan eski imaj geri geldi. Son kontrol değer bazında
  tüm ortam/bağların aynı olduğunu doğruladı. Yeni tam operatör karşılaştırması
  anahtar/hedef bazında yapılır. Canlı 2.4.0 henüz uygulanmadı.
- Kullanıcının erken geçiş kararı nedeniyle 2.4.0 sonrası haber eski 22.00
  bakım vaadini tekrar etmez. Ayrı turnuva rehberi 13 Kasım15.30UTC'den ve
  yalnız 2.4.0 sunucu kapısından sonra görünür. Sezon takvimi değişmez.

---

# Önceki evde birleştirme — 13 Kasım 2026, yeni 2.4.0 yayın adayı

- Okulun `4249aa14` değişikliği, 11 Kasım ses/UI düzeltmeleri ve kaynak
  sabitleme araçları korunarak `codex/release-2.4.0-rc3` dalına alındı.
  İki plan dosyasındaki çakışma iki tarafın kayıtları korunarak çözüldü.
- Son uzak tam CI `43078476162`, rc.2 / `7e8eb415` için 6/6 başarılı.
  Bugünkü yama için uzak CI sonucu yok; rc.2 başarısı yeni adayın kabulü değildir.
  Yerel testler ve üretim paketi doğrulamaları devam ediyor.
- Sunucu, istemci ve Android üretim ayarı 2.4.0/code15 olarak hizalı;
  2.4.0 notunun tarihi erken yama günü 13 Kasım'a güncellendi.
  S1 stok raporu değişen takvim hash'iyle yeniden üretildi; sezon taslak kalır.
- 17.11'deki gerçek `pull`: main `4866e58a` → `103ad39a`; 196 eklenen dosya
  gerekli kaynak/varlık/test/plan dosyalarıdır. Kökteki iki yeni dosya Playwright
  yapılandırmasıdır. Altı eski yerel XML/boş klasör temizlendi; 28 eski pytest
  klasörü NTFS erişim engeli nedeniyle korundu. Anahtarlar/adaylar silinmedi.
- Canlı HTTPS sağlıklı 2.3.0; kayıtlı SSH hedefi zaman aşımına uğruyor.
  Canlıda katalog/ayar/imaj/veri değişmedi; yeni imzalı AAB henüz üretilmedi.

---

# Okul teslimi — 13 Kasım erken yama ve evde 22.00–00.00 TR geçişi

- Kullanıcı 2.4.0 sunucu geçişi ve imzalı AAB hazırlığını ev bilgisayarından
  **13 Kasım 2026 22.00 → 14 Kasım 00.00 Türkiye saati** olarak onayladı.
  Önceki 23 Kasım hedefi yalnız 2.4.0 için öne alındı. S1–S6, haftalık
  dönemler, koşullu takım açılışı ve sonraki sürümler değişmedi.
- [Evde uygulanacak sıra](docs/planning/release-240-expedited-handoff-20261113.md)
  güncel ana teslimdir; docs/README, bağlı takvim/backlog/checklist ve briefler
  buna göre güncellendi. Açık fiziksel cihaz/ses/CI/restore kapıları kapanmış sayılmaz.
- Yeni TR/EN Sistem haberi: `preview-2-4-0-early-patch-20261113`.
  Yalnız zorunlu yama gerekçesi, yeni bakım saati ve tam S1–S6 takvimi var;
  özel gerekçe yok. 5 Kasım’da canlıya gönderilmiş eski haberi okuyan/silen/
  onaylayan hesap yeni haberi okunmamış alır. Ön haber bakımda sona erer.
  Sonraki `preview-2-4-0-tournament-launch` ayrı kimlik ve 2.4.0 sürüm kapısını
  korur; 13 Kasım 19.00 UTC’den sonra seçilebilir. Ödül/bot açıklamaları aynı.
- Canlı 2.3.0’da duyuru modülü zaten mevcut. Evde canlı taban keşfi ve hash
  kontrolünden sonra katalog güncellemesi yapılır; ilk kurulum main.py yaması
  tekrar uygulanmaz. Yeni haber henüz canlıya gönderilmedi.
- Kaynak sunucu hâlâ 2.3.0; istemci 2.4.0/code15. Üretim ayarı hâlâ
  2.3.0/code14. Evde sürüm damgası/sürüm notu/release_guard ve üretim ayarı
  birlikte hazırlanıp denetlenmeli. Mağazada kullanılmışsa code15 yükseltilir.
  Güncel kaynakla imzalı AAB henüz üretilmedi; eski debug APK yeterli değildir.
- MONETIZATION_ENABLED=false değişikliği aşağıda ayrıntılıdır. Eski AAB
  kendiliğinden değişmez. Evde AdMob rollout disabled/test oyuncu listesi boş
  kontrolü yapılır; mevcut ödeme kurtarması/iade doğrulaması korunur.
- **Bu kaynakta yerel kabul:** 40 ilgili Python testi PASS; bağlı plan,
  ekonomi, duyuru ve release_guard kontrolleri PASS. Duyuru E2E: Chromium,
  Android Chrome/Safari öykünmesinde **12 PASS**, retry yok. Eski orijinal
  2.3.0 API/istemci web+native-origin doğrulaması ve Ayarlar dil seçicisiyle
  **TR/EN × 320/393 dört görsel** PASS; fiziksel telefon değildir.
  Kanıt: `qa_reports/early-patch-20261113-reviewed-proof/proof.json`,
  `.audit-runtime/early-patch-announcement-browser.log` (12 PASS).
  Yerel kanıtlar Git ile taşınmaz; rehberde tekrar üretim komutları var.
- Evde alınacak dal: `codex/early-240-patch-20261113`. Son commit ve uzak
  eşleşmesi Git’ten doğrulanır. Git teslimi canlı yayın veya mağaza dağıtımı değildir.

---

# Önceki yerel kabul — 2.4.0 istemcisinde ödeme/reklam görünürlüğü, 13 Kasım 2026

- Kullanıcı yeni gerçek para alımlarını ve savaş sonu reklamını silmeden
  gizlememizi istedi. `client/src/app.js`: `MONETIZATION_ENABLED = false`.
  Mağaza ücretli paket bölümü, sezon premium satın alma girişi, savaş sonu
  premium teklifi/reklam alanı ilk boyamadan itibaren CSS ile gizli; doğrudan
  çağrılan ödeme/reklam işleyicileri de yeni işlem başlatmaz. Fiyat/UMP otomatik
  sorguları bekler. Mevcut kod/katalog ve önceki ödeme kurtarması korunur.
- Oyun içi para birimiyle sandık/hediye ve mevcut ödül/XP bütçeleri korunur.
  Tek anahtarı tekrar `true` yapmak kaynak özelliğini açar; yeni paket gerekir.
  Canlı sunucu, kurulu eski APK/AAB, Play Console veya AdMob değiştirilmedi.
  Bu ek yerel çalışma ağacındadır; commit/push/yayın yapılmış sayılmaz.
- Yerel 783 istemci ve 13 build sözleşmesi PASS; web paketleme PASS.
  Chromium/Android Chrome/Safari öykünmesinde 3 akış PASS: TR/EN 320/393
  mağaza, reload, gerçek yerel savaş sonucu, hidden yeniden açıldığında CSS
  gizlemesi ve programatik ödeme/reklam tıklamalarında sıfır yeni işlem.
  QA yanıtında sağlayıcılar test olarak açık gösterildi; gerçek ödeme/reklam yok.
  Kanıt: `qa_reports/monetization-pause-browser.json` ve aynı adlı görsel klasörü.
  Web hash `a06418bf9a90e484`; release_guard/diff-check PASS.
  Ayrıntı: `docs/STORE_PURCHASES.md`.

---

# Önceki tam CI yeşil — 2.4.0 adayı rc.2, 11 Kasım 2026

- Kullanıcının bildirdiği kırmızı CI giderildi. Sebep uygulama hatası değil,
  e2e/release221-social.spec.js'in yeni sunucuda da ilk notu2.3.0 beklemesiydi.
  Test artık gerçek server VERSION ve game_updates.json'dan sıralamayı üretir;
  ön duyuru/güncelleme türü ayrılır. Güncel ve eski notların açılması, tarih ve
  reload'da okundu korunması hedef üç tarayıcıda3 PASS/57,6sn doğrulandı.
- **RC2 tam CI43078476162:6/6 SUCCESS.** Server contracts, Client contracts,
  gerçek PostgreSQL/Redis/production image+restore, Safari/WebKit,
  Chromium/Android ve kaynak paketi geçti. Exact kaynak:
  **7e8eb4155c2d2a102317e514c0413735f982428a**.
  https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/43078476162
- **Aktif etiket v2.4.0-rc.2**; codex/release-2.4.0 aynıSHA'da origin'de.
  Eski v2.4.0-rc.1/d5ba0e96 aynen korundu; eski kırmızı koşu tarihçedir.
  İki rc arasında client/server/android/config diff'i boş: yalnız E2E ve
  hazırlık kaydı değişti. Yeni özellik veya sonraki sezon içeriği2.4'e girmedi.
- Çalışma dalı codex/develop-2.5.0. config/release-candidates/2.4.0.json
  rc2/tag2/yeniSHA ve başarılıCI URL'sine bağlı. Kaynak bağımsız
  qa_reports/release-candidates/2.4.0-rc2/source; offline deps, gerçek native
  -PrepareOnly ve root launcher check PASS.2.4 aab/server-image/server-source
  komutları yalnız bu kaynağı kullanır. Sonuç qa_reports/release240-freeze-ready.json.
- Yeni AAB/APK imzalama, Play upload, yerel yayın imajı veya canlı geçiş yok.
  CI kendi izole test imajını ve kaynakZIP'ini üretir; bunlar dağıtım değildir.
  Sezon draft/Android yayın kabulü kapalıdır; fiziksel kabul/Play App access ve
  canlı yedek/restore önkontrolü yayın zamanının kalan kapılarıdır.
- Test düzeltmesi ve pin4cf52e3a ile dev dalına push edildi; bu yeşil sonuç
  checkpoint kaydı da ayrı doküman commit'iyle push edilir. RC2 taşınmaz.

---

# CI düzeltildi; aktif aday rc.2, tam CI sonucu bekleniyor — 11 Kasım 2026

- Kullanıcı CI kırmızı bildirdi. rc.1 koşusu43070306313'te tek neden eski
  mesaj E2E beklentisiydi:2.3.0 bekleyip doğru2.4.0'ı reddediyordu. İki browser
  işi aynı nedenle FAIL; Server/Client/PG-Redis-image-restore PASS.
- Release düzeltmesi **7e8eb4155c2d2a102317e514c0413735f982428a**, etiket
  **v2.4.0-rc.2**, codex/release-2.4.0 origin'e push edildi. rc.1/d5ba0e96
  aynen korunur. Oyun/runtime değişmedi; yalnız mesaj testi ve hazırlık kaydı.
- E2E beklenen not listesini gerçek sunucu VERSION ve game_updates.json'dan
  hesaplar; hepsinin sırasını, güncel+eski notların açılmasını ve reload'da
  okundu kalmasını doğrular. Ön duyuru da2.4 metni içerebildiğinden data-kind
  update seçimi reload sonrasında da korunur. Hedef3 browser PASS/57,6sn;
  timeout artışı, force click, test atlama yok.
- codex/develop-2.5.0 dalına yalnız aynı E2E dosyası alındı. Aktif pin manifest
  config/release-candidates/2.4.0.json rc2/tag2/yeniSHA'ya bağlı. Kaynak ayrı
  qa_reports/release-candidates/2.4.0-rc2/source; offline bağımsız deps ve
  native -PrepareOnly PASS. Root başlatıcı check PASS. AAB/Play/canlı yok.
- Tam yeni CI **43078476162** release dalı ve tam7e8eb415 üzerindedir:
  https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/43078476162
  Takip: python qa_reports/github-quality-rc2.py status. Helper credential'ı
  yalnız memory'de kullanır. Eski github-quality-frozen.py rc.1 kırmızıyı izler;
  onu güncel sonuç sanma. YeniCI bitene kadar yeşil deme; sonuca kadar takip et.
- Kaynak etiket/branch/protokol/sürümler sabit; sonraki içerik2.5 dalındadır.
  Sonuç geldiğinde qa_reports/release240-freeze-ready.json ve bu checkpoint'i
  yeni kanıtla güncelle; dev dalını push et, rc etiketlerini taşıma.

---

# 2.4.0 sabitlendi; sonraki çalışma dalı2.5.0 — 11 Kasım 2026

- Kullanıcı AAB üretmeden ve canlıya geçmeden2.4 kaynağını sabitlememizi istedi;
  main varsayımı düzeltildi. Kaynak d5ba0e9629e3ef76b0f292b2c82ee6b67d7f7c5d,
  **v2.4.0-rc.1** annotated etiketi ve **codex/release-2.4.0** dalıyla origin'e
  push edildi. Main'e merge yapılmadı; final v2.4.0 etiketi henüz yok.
- Şu an çalışma dalı **codex/develop-2.5.0**. Manifest
  config/release-candidates/2.4.0.json yalnız tam SHA+etikete bağlıdır.
  İzole source qa_reports/release-candidates/2.4.0-rc1/source; detached aynıSHA.
  Gelecek dalda sürümün2.5/16 yapılması ve yeni dosya eklenmesi, dondurulmuş
  kaynakta görünmüyor: gerçek izole Git fixture regresyonu6 PASS.
- Adayın kendi node_modules bağımlılıkları --offline/frozen-lockfile ile
  kuruldu; paylaşılmış geliştirme node_modules'u kullanılmadı. Bu izole
  kaynakta build-android-production.ps1 -PrepareOnly PASS; AAB/APK imzalanmadı.
  Native üreticinin CRLF/LF değişiklikleri Git status'ta M görünebilir; Git
  normalize diff HEAD sıfır. Dev daldaki başlatıcı gerçek Git içerik farkı+
  untracked+ignored üretim kaynağı denetler; migration -text kuralı korunur.
  Başlatıcı/root config dev dalındadır; frozen klasörden doğrudan başlatma.
- Tek komutlar depo kökünde:
  python tools/release_candidate.py 2.4.0 check
  python tools/release_candidate.py 2.4.0 aab
  python tools/release_candidate.py 2.4.0 server-image
  python tools/release_candidate.py 2.4.0 server-source
  Son üçü gerektiğinde üretir; hiçbirisi Play upload, canlı deploy veya sezon
  aktivasyonu yapmaz. Kaynak/commit/etiket yanlış veya gerçek kod kirliyse durur.
- JDK/SDK ve mevcut DPAPI/PKCS12 anahtar erişimi gerçek keytool-list ile PASS;
  şifre/log/anahtar kopyalanmadı. JAVA_HOME17 otomatik Studio21'e fallback yapar;
  açık geçersiz JavaHome reddedilir. Docker engine29.9.2 erişilebilir. Dosya
  secrets/android-release ana çalışma alanında kalır; Git'e girmez.
- RC1 kaynak server VERSION2.4.0, production Android2.4.0/15, native meta,
  release_guard/source archive 2.4.0-season-one olarak hazır. Legacy alias ve
  protokol 2 değişmedi.2.4 notları kaynakta var; mesaj ancak sunucu deploy olunca
  görünür. Bugün canlı2.3 sunucu/oyuncu/telefon API verisine dokunulmadı.
- Yerel782 istemci PASS;100 araç PASS, launcher son ek regresyon6 PASS;
  yeni2.4 mesajının25 ilgili testi PASS. Tam sunucudaki tek sabit seen-list
  beklentisi düzeltildi. CI **43070306313** tam d5ba0e96 üzerinde başlatıldı;
  son kontrolde Server, Client ve gerçek PG/Redis/imaj/restore PASS; iki tarayıcı
  işi sürüyor. URL https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/43070306313
  CI takip helper'ı qa_reports/github-quality-frozen.py (credential yalnız memory).
  Sonuç gelmeden tümCI yeşil/yayın hazır deme. Hazırlık kanıtı
  qa_reports/release240-freeze-ready.json; native log release240-pin-native.log.
-2.4 son kabul veya bug fix gerekirse release dalında yeni commit/test ve yeni
  rc.2 etiketi+manifest/path; rc.1 taşınmaz. S1 draft/Android kabulüfalse kalır.
  Eski tools/production_cutover.py beta reset aracıdır, bu geçişte kullanılmaz.
  Canlı uygulama bakımda güncel keşif/yedek/restore/sağlık ve aynı imaj digest'iyle
  yapılır. Bu tur AAB, yerel yayın imajı/ZIP, Play upload veya canlı geçiş yok.
- Yeni pin manifesti, başlatıcı EOL denetimi, runbook ve bu checkpoint dev dalına
  commit/push edilerek diğer bilgisayara taşınır;2.4 etiketi değişmeyecek.

---

# 2.4.0 kaynak dondurma hazırlığı — 11 Kasım 2026

- Kullanıcı gelecekteki içeriğin2.4 paket/sunucu kaynağına karışmasını önlemek
  için sabit aday ve sonradan tek komutla üretim istedi; AAB/canlı yayın bugün yok.
  Kullanıcıya v2.4.0-rc.1 etiketinin current main değil mevcut geliştirme dalındaki
  tam commit'e konacağı, final v2.4.0'ın yayın gününde kalacağı açıklandı.
- tools/release_candidate.py plan/prepare/check/aab/server-image/server-source
  komutları: config/release-candidates/2.4.0.json içindeki SHA+tag eşleşmesini
  ve ayrı qa_reports/release-candidates/2.4.0-rc1/source worktree'sini doğrular.
  Kirli/yanlış kaynak, ignored ek üretim dosyası ve sürüm uyuşmazlığında durur.
  Eski worktree silinmez/resetlenmez; sonraki düzeltme rc.2/newpin/newpath olur.
- Üretim kaynak kimliği2.4.0/15'e hazırlandı: server VERSION, config Android,
  root native version, release_guard ve source package label season-one.
  Legacy health/release/server alias'ları ve protokol 2 korundu. Üretim24 notu
  kaynakta eklendi, yalnız2.4 sunucu yayınında görünür; bugünkü canlı230 değişmedi.
- build-android-production.ps1 dış SigningDirectory alır; upload key/DPAPI
  secret Git/worktree içine kopyalanmaz. -PrepareOnly gerçek native/web sync
  PASS; final AAB/APK, kaynakZIP veya Docker imajı üretilmedi.
- docs/planning/release-240-freeze.md komutlar, dal/etiket disiplini ve kalan
  yayın kabulünü kaydeder. S1 draft/Android kapalı kaldı; sunucu hazırlığı
  sezon açılışı veya canlı geçiş değildir. Eski beta reset aracı kullanılmaz.
- İstemci782 PASS; araç ve tam sunucu sonuçları qa_reports/release240-freeze-*.log.
  Sunucuda yeni2.4 mesajıyla bir testin sabit seen listesi güncellendi; ilgili25
  test PASS. İmzalama/JDK/SDK önkontrolü PASS; eski global JAVA_HOME17 yerine Studio21 fallback düzeltildi. Commit/tag/worktree sıradaki adımlardır.
- Önceki bütün ses/stok/gelecek üretim planı değişiklikleri aynı aday kaydına
  dahil edilir; gelecek içerik runtime'ı henüz yok. Etiketli kayıttan sonra ayrı
  codex/develop-2.5.0 dalına geçilir. Bu kayıttan canlı dağıtım yapma.

---

# Güncel devam işi — gelecek sezon üretim planı, 11 Kasım 2026

- Kullanıcı sunucu/AAB için erken olduğunu, gelecek sezonlar için içerik üretimi
  veya en azından somut üretim planı hazırlanmasını istedi. Yayın takvimi korundu.
- Ana teslim docs/planning/two-cycle-production-calendar.md. İlk iki görsel
  örnek Manyetik Köprü çerçeve+zemin; sonra altı S2 oyuncu öğesi, ayrı dört
  mağaza öğesi ve Yankı Rölesi. S3 Kor Fırlatıcı ve altı oyuncu öğesi; S4 altı
  oyuncu öğesi + Siper İttifakı üç takım öğesi. Ortak boyalı/hacimli sanat yönü,
  en fazla 10 öğelik inceleme grupları, TR/EN 320/393 ve kilit/sahiplik korunur.
- Hazırlanan 5 dosya: two-cycle-production-calendar.md, shop-art-manifest.md,
  art-2.5.0-acceptance.md, echo-relay-release.md, ember-launcher-release.md.
  Hepsi docs/planning altında. İki modülün sayıları prototip önerisidir;
  denge/katalog/ücretsiz edinim/sanat/ses kabulü olmadan modül hazır sayılmaz.
  Sanat dosyaları brief'tir, gerçek çizim/approved stok üretilmedi.
- Önemli ayrım: 24 yeni öğelik açık, S1 sonrası iki tam-kozmetik çevrimindir.
  Mevcut 6 yeni oyuncu öğesi/sezon kapsamı iki sezonda12 öğe ister; diğer üç
  haftanın açık kaynak profilinin ayrıca üretilmesi gerekir. S1'e özel istisna
  S2'ye taşınmaz. Genel season_reward_profiles.py/JSON önerilen, mevcut olmayan
  işler olarak OPS-01'e bağlandı. OPS-01 in_progress yalnız hazırlık/plan kısmı;
  COS-03/05/06/07 ve CARD-01/02 üretim görevleri todo kaldı.
- Takvim motoruyla gerçek dönemler kontrol edildi: S2 W53/W01/W02/W03, S3
  W04–07, S4 W08–11. Takım adayları bağımsız4 Ocak/1 Şubat/1 Mart; ilk iki
  mevcut takım seti yalnız hiç ayrılmamış/dağıtılmamışsa kullanılabilir.
- Backlog'a dosyalar bağlandı; checklist/sürüm briefleri araçlarla güncellendi.
  Plan kontrolleri, yeni5 dosyanın bağlantıları, git diff --check ve S1 stok
  audit --check geçti. Canonical yayın takvimi, oyun kaynakları ve istemci
  paketine bu planlama turunda ekleme yapılmadı. Yeni test gerektiren çalışma
  kodu yok; aşağıdaki ses/test sonuçları önceki işindir.
- Bu üretim planı ve önceki ses/stok çalışmaları henüz commit/push edilmedi.
  Yeni PNG/rasterses yok, canlı yayın/sezon/AAB işlemi yapılmadı. Sıradaki
  somut üretim Manyetik Köprü çiftinin oyun dışında iki görsel örneği;
  ardından renderer şablonları ve2.5 motor/ödül prototipi.

---

# Güncel durum — ayrı müzik kontrolleri ve S1 stok denetimi, 11 Kasım 2026

- Son kullanıcı kararı: menü müziği varsayılanı **%5**, savaş müziği **%50**.
  Ortak sliderın savaşı da aşırı kısması düzeltildi: music_volume menü/hazırlık,
  battle_music_volume savaş/sonuç içindir. Üç slider Efekt Sesi, Menü Müziği,
  Savaş Müziği anlık yüzde ve aria-valuetext gösterir. Kayıtlı tercihler korunur;
  eski kayıtta savaş alanı yoksa %50 kullanılır. Ortak müzik mute ikisini kapatır.
- Savaş müzik çarpanı 2,35 → 2,15 (yaklaşık %9); SFX çarpanı 0,70 korundu.
  İki kompakt ses kartı, üç slider; müzik/SFX önizleme düğmeleri ve app
  handlerları kaldırıldı. Gerçek input/kayıt boyunca dock konumu üç tarayıcıda
  kare kare kontrol edildi. Bir kanalı sıfırlamak diğer kanalı susturmaz;
  sessiz kanala geçişte önceki ekranın müziği devam etmez. HTML/Web Audio ve
  arka plandan dönüş sınırları testlidir.
- Yeni battle_music_volume alanı API, client viewModel, request, JSON/PG snapshot
  geri yükleme yoluna eklendi; eski istemcinin kısmi güncellemesi alanı sıfırlamaz.
  Eski kayıtta eksik alan ve açıkça saklanmış sıfır ayrı testlerle doğrulandı.
- **COS-04 tamamlandı:** docs/planning/season-1-stock-audit.md/json çevrimdışı
  kanıtı; tools/prepare_first_season.py --audit-check artık CI kapısıdır.
  İlk sezon coverage takımın bağımsız 7 Aralık başlangıcını önce saymıyordu;
  artık 7 dönem, 6 oyuncu + 3 takım öğesinin tümü doğrulanır. Kaynak haftası
  indirimi yalnız tam eşleşen açık ilk-sezon profiliyle olur; generic full_cosmetic
  profilde sessiz fallback yok. Üç haftada 7.140 kredi, 525 akı, 234 sıradan parça;
  bunlar mevcut bütçedir, yeni ek hibe değildir. Eksik/değişmiş tahsis kapanır.
  Eski iki çevrim profili 30 öğe/18 eksik; S1 sonrası iki tam-kozmetik çevrim
  profili 24 yeni öğe gerektirir. Mağaza/yeni etkinlik adaptörleri kapalıdır.
  Kaynak hash'leri CRLF/LF normalize; test iki platform eşitliğini ve stale rapor
  reddini doğrular. Takvim ve ilk sezon canlı taslak/Android kabulü değiştirilmedi.
- Son yerel doğrulama: **782 istemci PASS**, **2047 sunucu PASS / 52 dış servis
  SKIP**, **7 stok araç testi PASS**, **13 paketleme testi PASS**. Son %5/%50
  ile 3 tarayıcıda yüzde/bağımsız kayıt/reload/dock testi PASS (320/393).
  Tam sunucu ilk denemesinde eski generic coverage çağrısı tek hata verdi;
  test açık ilk-sezon+takım profiline geçirilip tam suite yeniden yeşil alındı.
  Plan/ekonomi/ses/stock kontrolleri ve APK audit PASS (582 dosya).
- Telefona son **GRIDSHARD S1 TEST / com.gridshard.localdebug 2.4.0/15** kuruldu.
  Web **71ac115e81b2a271**; APK SHA256 **2f0238184a227fd6e70a1df895c723f7c0a3faa0eb9c4ed7a2317771c34e711a**.
  Yerel API retained runtime korunarak, yedeği alınıp son varsayılanlarla yeniden
  açıldı: PID18376 / 8897, .mobile-debug/runtime-s1-20261106, 12 Aralık fixture.
  PID tekrar kullanılmadan komut satırını ve runtime yolunu doğrula. Üretim yok.
  Aynı hesap/24 modül ve native varsayılan %5/%50 doğrulandı. Kullanıcının
  kaydettiği gerçek %5 menü/%55 savaş korunup yüzde etiketleriyle sunucuda eşleşti.
  Kanıt qa_reports/native-s1-20261106/native-240-split-audio-20261111-proof.json.
  apk-v21-ready.json installed=true/native_verification=passed. Ekran görüntüsü
  ve sonradan backgrounddaki UI click timeout'ları ürün hatası sayılmadı;
  salt okunur odaklı native kontrol tamamlandı, yeni native screenshot yok.
  Fiziksel dinleme beğenisi ayrı pending kabul; kullanıcı seviyeleri değiştirilmeyecek.
- **Bu turun değişiklikleri henüz commit/push edilmedi.** Dal
  codex/s1-bots-tournament-rewards, başlangıç HEAD2c8fa72e. Önceki ürün CI'si
  f5050ae8/42345535071 yeşildi; bu yeni değişiklikler için uzak CI çalışmadı.
  Yeni audit JSON/MD de commit'e dahil edilmeli. 2.4.0 geliştirme sürümünde
  kalındı; canlı sunucu geçişi, imzalı AAB ve sezon açılışı yapılmadı.

---

# Güncel durum — son 2.4.0 test paketi telefonda doğrulandı, 11 Kasım 2026

- Kullanıcı telefonu bağladı ve devam etmemizi istedi. Önceki kurulum komutu
  otomatik onay incelemesinin kullanım limiti hatasıyla hiç çalışmamıştı;
  11 Kasım yeniden denemesinde onay verildi. Telefon57abfae6 bağlı, test
  uygulaması kapalı/savaş dışında olduğu doğrulandı. APK SHA256 denetlendi.
- Kapalı8897 yerel API, korunmuş .mobile-debug/runtime-s1-20261106 verisiyle
  PID4120 olarak gizli yeniden açıldı; sabit fixture tarihi12 Aralık değişmedi.
  Hiçbir hesap/veri yeniden seed edilmedi. Yeniden kullanırken PID komut
  satırını ve health içindeki retained runtime yolunu tekrar doğrula.
- **Son APK kuruldu:** com.gridshard.localdebug / GRIDSHARD S1 TEST2.4.0/15,
  web76319202e6e08898; SHA256
  d55adf33a4c3b625c607590570aabb48d8bf3bb03ad20a0e484d094e75d81d2e.
  adb install -r Success ve USB reverse8897. Aynı test hesabı,24 açık modül,
  mixv21 ve44 OGG dosyasının hash eşitliği native WebView’de doğrulandı.
  Açılış/ayarlar2.4.0; açılış/kayıtta review düğmesi yok. Mesaj/Kartlar
  sekmelerine tıklanarak alt çizgisiz görünüm doğrulandı; iki koleksiyon
  düğmesinin #d7b66b yüzeyi ve #302514 yazısı native CSS’te doğrulandı,
  oyuncu önizleme düğmesi gerçekten görünür bulundu. Uygulama menüye bırakıldı.
- Kanıt qa_reports/native-s1-20261106/native-240-installed-20261111-proof.json;
  apk-v21-ready.json artık installed=true/native_verification=passed.
  Element screenshot adımındaki stabilite timeout’u sonrasında yalnız gereksiz
  screenshot kaldırılıp gerçek UI kontrolleri tamamlandı; başarılı ekran
  görüntüsü varmış gibi gösterilmez. Fiziksel ses beğenisi hâlâ pending;
  android_acceptance ve canlı sezon taslağı bu kurulumla açılmadı.
- Son ürün kodu f5050ae8 push edildi; tam CI42345535071’de sunucu, istemci,
  Chromium/Android, Safari/WebKit, PostgreSQL/Redis/imaj ve kaynak paketi
  işlerinin6’sı da geçti. Bu kurulum kaydı ürün kodunu değiştirmez.

---

# Önceki hazırlık ve CI kayıtları — 6–7 Kasım 2026

- **7 Kasım CI kırmızı düzeltmesi:** 044a7c7a koşusu42297048089’da sunucu,
  istemci, PostgreSQL/Redis/imaj ve Safari işleri geçti; Android’de S1 ödül
  önizlemesi geri tuşunu kapattı. Geç /events yanıtı aynı ödül listesini
  yeniden kurup açık önizlemenin tetikleyicisini DOM’dan koparıyordu.
  Gerçek gecikmeli yanıt testi eski kodda isConnected=false ile hatayı
  yeniden üretti. renderTournamentRewards artık içerik+dil+not değişmedikçe
  düğmeyi korur; içerik gerçekten değişirse kendi eski önizlemesini kapatır.
  Zorlanmış tıklama veya uzatılmış timeout kullanılmadı. Yeni regresyon ve
  mevcut TR/EN320/393 bot/ödül akışları üç tarayıcıda6 PASS;781 istemci PASS.
  Kanıt qa_reports/release240-preview-refresh-repro.log (önceki FAIL) ve
  release240-preview-refresh-e2e.log (düzeltilmiş PASS). CI S1 grep’i her iki
  testi kapsar. Son düzeltme aynı2.4 dalına commit/push edilip tam CI yeniden
  başlatılacak; son koşunun GitHub sonucunu kontrol et. APK yeniden üretildi,
  web76319202e6e08898; USB bağlantısı olmadan kurulum yapılmaz.
- **7 Kasım son UI isteği:** Mesaj/Kartlar/Takım/Turnuva/Ayarlar/Kozmetik
  dahil ortak alt sekmelerin seçili metin alt çizgisi kaldırıldı; turkuaz
  yüzey/kenar, bildirim ve klavye odağı korundu. Oyuncu/takım koleksiyon
  önizleme düğmesi ortak gs-action-button pahını, sakin altın yüzeyi
  (#d7b66b) ve koyu yazıyı (#302514) kullanır; hak/mağaza davranışı değişmedi.
  İki tarayıcıdaki4 UI akışı PASS;393/320 görselleri test-results altında.
  Kanıt qa_reports/release240-tabs-e2e.log. Telefona son UI güncellemesi
  kurulum öncesi savaş/bağlantı durumuna göre ayrıca doğrulanmalı.
- **Git/CI ilerlemesi:** b61e3e62 ana2.4 hazırlığı ve4f48e630 ekonomi kaynak
  özeti düzeltmesi uzak dalda. İlk CI ekonomi raporunda takvim hash’i,
  Docker build’de eksik client-version.js/ana package.json ve iki tarihsel
  ses testinin v19/eski pulse tepe beklentisini yakaladı. Kaynak özeti
  güncellendi; Docker girdileri tamamlandı, ses testleri v21 sözleşmesine
  alındı. Yerel781 istemci ve17 ilgili Python testi geçti. Son UI/CI düzeltmesi
  aynı dala ek commit ile gönderilecek; son uzak CI sonucu ayrıca izlenir.
  Bu işler üretim yayını veya fiziksel ses kabulü değildir.
- UI düzeltmesi cb239d53 ile push edildi. Bu commit’in uzak CI’sinde sunucu,
  istemci, PostgreSQL/Redis ve üretim imajı/restore işleri geçti. Safari genel
  akışında tek minimum-sürüm fixture’ı eski sunucu2.3.0’a göre2.3.1 istediği
  için başarısızdı; istemci2.4.0 doğru biçimde bunu güncelleme saymıyordu.
  e2e/client-compatibility.spec.js artık minimumu canonical istemcinin bir
  üst patch’inden, gelecek sunucuyu bir üst minor’dan üretir. TR/EN korunmuş
  hesap ve gelecek sunucu senaryoları üç tarayıcıda6 PASS:
  qa_reports/release240-compat-e2e.log. Son fixture düzeltmesi ek commit ile
  gönderilir; son CI sonucu GitHub’dan kontrol edilmeli.
- Son UI test APK’sı hazır/audit PASS582 dosya; web00bd3a9962bf82d4,
  SHA256641c990038a308efe4ad2bf11f003a09cf5e2d90bb63616c05680539ce002a78.
  Telefon USB’den ayrıldığı için bu son sekme/düğme paketi **kurulmadı**.
  Son kurulan/proof’lu içerik b7bb715fe124efdd’dir. apk-v21-ready.json yeni
  paketi installed=false ve pending_usb_connection olarak kaydeder; kullanıcı
  yeniden bağladığında savaşta olmadığını doğrulayarak adb install -r uygula.
- **Git teslimi:** Kullanıcı bütün biriken 2.4.0 çalışmalarını commit/push
  etmeyi istedi. Dal codex/s1-bots-tournament-rewards; yayın/merge talebi yok.
  Kaynak ve plan kontrolleri geçti. Commit/push ve uzak CI sonucu Git/GitHub
  kayıtlarından doğrulanmalı; Git teslimi canlı yayın veya Android ses kabulü
  sayılmaz. Sonraki bilgisayarda önce bu dalın uzak ucunu kontrol et.
- **Son kullanıcı kararı — yayın ritmi:** 2.4.0 yayınlanana kadar bütün hata
  düzeltmeleri/UI iyileştirmeleri aynı2.4.0 üzerinde birikir. Her düzeltmede
  2.4.1 açma; test paketini gerektiğinde yenile. Play’e yeni yükleme olursa
  versionCode gerektiği kadar ilerler; görünen sürüm2.4.0 kalır. Sunucu geçişi
  ve son imzalı AAB üretimi/dağıtımı yayın zamanında, kabul kapılarıyla yapılır.
  Genel2.4–2.9 takvimi değişmedi:2.4 hedef23 Kasım, S1 hedef30 Kasım03.00 TR.
  Yeni fikirler uygun sürüme/backlog’a eklenebilir; tarihler kendiliğinden kaymaz.
  Yayın sonrası ayrı hata düzeltme yayını2.4.1; minor/major kuralı korunur.
  Güncel telefondaki APK son üretim AAB’si veya yayın kanıtı değildir.
  Kararın tek kaynağı release_calendar_v1.json içindeki development_policy;
  takvimler, sürüm rehberi ve2.4 brief’ine araçlarla yansıtılır.
- Kullanıcı eski açılış sürüm etiketini bildirdi, hediye sandık için mağazada
  Kartlar ile aynı yeşil ışığı istedi ve açılış/kayıttaki REVIEW / DEMO SIGN-IN
  girişinin kaldırılmasını istedi. Üçü son test APK’sına dahil edildi.
- İstemci canonical kimliği package.json:2.4.0, gridshard.androidVersionCode15.
  tools/client-version.js açılış/ayarlar etiketlerini doğrular; uyuşmazlık
  derlemeyi son başarılı çıktıya dokunmadan durdurur. Native debug sürümü
  configure-native-orientation ile aynı kaynaktan otomatik yazılır. Boot
  expectedVersion ve telemetri artık eski 2.3.0 sabiti yerine etiketi okur.
- Sunucu VERSION ve son üretim yapılandırması2.3.0/14 olarak ayrı kaldı.
  Kaynak release_guard incelenmiş client compatibility üzerinden2.4.0’ı
  doğrular. İmzalı üretim derlemesinden önce android-production yapılandırması
  aynı2.4.0/15 kimliğine hazırlanmalı; yeni üretim kontrolü uyuşmazlığı reddeder.
- Mağaza hediyesi sunucu durumuna göre yeşil ışık yakar; bakmak silmez,
  sunucu onaylı alım söndürür. Soğuma/erişilemeyen hediye bildirim üretmez.
  İndirim rozeti bağımsız korunur. TR/EN erişilebilir etiketler eklendi.
  İki tarayıcıda gerçek geçici hesapla alım ve reload kabulü PASS:
  qa_reports/shop-gift-light-e2e.log.
- Açılış ve ilk kayıt düğmeleri ve kullanılmayan başlangıç stili kaldırıldı.
  İnceleme erişimi Ayarlar → Hesap ve Gizlilik ve oturum kurtarmada kaldı;
  sunucu demo hesabı kapatılmadı. Google ücretli içeriğe inceleme erişimi
  ister, açılış düğmesi zorunlu değildir. docs/PLAY_REVIEW_ACCESS.md içindeki
  yeni500 karakter altı İngilizce tarif Play Console App access’e yayın öncesi
  konmalı. Console değişmedi. Bu, yeni bir izin talebi değil kalan yayın işi.
- tools/check-play-review-access.js artık gerçek misafir → günlük meta →
  duyuru → Ayarlar yoluyla giriş ve asıl hesaba dönüşü doğrular. Sezon öncesi
  premium kapalı olduğu için aktif sezon kabulü mevcut yalnız-loopback S1
  fixture’da yapıldı. Canlı taslak açılmadı. Dört viewport PASS; kanıt
  qa_reports/release240-review-entry-e2e.log. Yenileme bekleme ve tek seferlik
  duyuru adımları test akışına dahil edildi; gizli alanlar loglanmadı.
- 781 istemci,13 build,8 ön duyuru araç testi PASS;492 import/0 sorun.
  İki tarayıcıda dar/masaüstü başlangıç yerleşimi PASS. Son diff-check temiz.
  Sesin önceki99 Python/araç ve codec/miks sonuçları aşağıda; bu turda ses
  değişmedi, aynı44 OGG son native pakette hash doğrulamasından geçti.
- **Son APK telefona kuruldu:** com.gridshard.localdebug / GRIDSHARD S1 TEST,
  2.4.0/15; aynı imza ve adb install -r, hesap silinmedi. Webhash
  b7bb715fe124efdd; APK SHA256
  59bc114c151cee54cd729a726b606ecff684609a88dd5c3533a952ea581718ea.
  Build/audit PASS582 dosya. qa_reports/native-s1-20261106/apk-v21-ready.json
  güncel son paketi gösterir. Dosya .mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk.
- Native son kanıt native-240-final-content-proof.json: iki sürüm etiketi,
  kaldırılmış iki giriş, Ayarlar’da kalan giriş, aynı hesap ve24 modül,44
  ses hash’i PASS. Son kontrolde play ekranı açık olduğundan yeniden yükleme
  veya navigasyon yapılmadı. Önceki7077c5f581ab7cea paketinde görünür2.4.0
  açılış/ayarlar screenshot ve proof’u var; temiz son başlangıç tarayıcıda
  doğrulandı. Kullanıcının savaşı bitmeden yeni native reload/install yapma.
- Yerel8897 API ve retained runtime korunur; USB reverse gerekir. Canlı
  2.3.0/Play yayını ve üretim hesapları değişmedi. Kullanıcı commit/push ve
  uzak CI aşamasına geçilmesini istedi. Fiziksel ses beğenisi bekleniyor;
  android_acceptance=false ve canlı S1 taslağı korunur.
- Sonraki adım: kullanıcının v21 müzik/çekirdek/modül geri bildirimi;
  ardından kalan yayın kapıları/commit-push/uzak CI. Ayrıntı
  docs/planning/native-s1-test-20261106.md ve release-240-s1-acceptance.md.

---

# Önceki durum — ilk v21 ses paketi telefonda doğrulandı, 6 Kasım 2026

- Kullanıcı v20 seslerini artık duyduğunu doğruladı; müzik geride kaldı,
  çekirdek ana kahraman gibi duyulmadı. Bütün modüller için görevlerine göre
  daha iyi ortak tema istedi. Son “devam et” bu çalışmayı sürdürdü.
- Yeni aday: docs/planning/audio-direction-circuit-forge-v21.md.
  24 modül: silah boşalması, savunma emilme/kilit, destek onarım/yönlendirme.
  Yedi çekirdek: D/A ortak enerji toplanması, güçlü boşalma ve kısa kristal
  kuyruk; her güç kendi dokusunu taşır. Aktivatör0.90–1.08s, atış0.23–0.32s.
- tools/combat_sfx_theme_v21.py yeni asıl sentez; combat_sfx_synth.py sabit
  API facade. generate_combat_theme.py 44 WAV üretir/--check ile doğrular:
  24 modül+14 core+6 canlı eski yönlendirme. 88 OGG/AAC türevi güncel.
  Yeni modül adı yazılmamışsa üretim reddedilir; rastgele ses ödünç alınmaz.
- v21 müzik2.35/SFX0.70 (v20:1.65/0.90); kullanıcı sliderları, menü/result
  müziği ve bütün müzik dosyaları korunur. Modül trimleri göreve göre ayrıdır.
  Core0.78/0.58; destek daha geride. Üç rutin ses/420ms korunur.
- Güçlendirici artık enerji-transfer UI dosyasını paylaşmaz. Kalkan/Zırh
  kendi koruma seslerini kullanır. attackWasDefended hedefin defense_type
  adına değil gerçek hasar engellenmesine bakar; onarım/virüs isabetinde
  sahte destek sesi ve overkill’de sahte blok üretilmez. İlgili testler var.
- Yumuşak crest/slew denetimi, düşük geçiren süzme, sıfır sınırlar ve DC
  düzeltmesi; sert kırpma yok. 25 kaynak/generator/hero-hiyerarşi testi PASS.
- Son:781 istemci,99 Python/araç (tools+değişmeyen müzik PCM),11 build PASS.
  İki tarayıcı38 actual codec yönlendirmesi, fallback/mute/voice-budget ve
  yoğun miks PASS: tepe0.78226268,0 kırpılan örnek.492 import PASS;105 ses
  manifesti PASS. Rapor ve iki matris güncel; cihaz beğenisi henüz false.
- Yeni APK build/audit PASS,582 web dosyası; hash9bbe2b39a6c8c44f.
  Dosya .mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk.
  **V21 TELEFONA KURULDU.** Kullanıcı USB’yi bağladı; aynı pakete
  adb install -r Success, veri silinmedi. Geçici USB kesilmesi sonrası
  reverse8897 ve native WebView kontrolü tamamlandı: mix v21, 44 OGG
  SHA-256 eşitliği, aynı yerel hesap ve24 açık modül PASS; Rezonans seçili.
  Kanıt qa_reports/native-s1-20261106/native-v21-install-proof.json.
  Hazır paket kanıtı qa_reports/native-s1-20261106/apk-v21-ready.json.
- Kapanmış telefon API’si aynı retained runtime ile PID13628/8897 olarak
  açıldı, health200. Runtime .mobile-debug/runtime-s1-20261106 silinmedi,
  hesap seed edilmedi. Yeniden işlemden önce süreç kimliğini doğrula.
- Sonraki adım: Kullanıcı GRIDSHARD S1 TEST içinde yeni savaşta müzik,
  Rezonans gücü ve modül seslerini dinleyerek geri bildirim verecek.
  Paket ve dosya doğrulaması fiziksel kalite kabulü değildir;
  Android_acceptance true yapma. Yeniden kurulum gerekmiyor.
- QA önizlemesi qa_reports/audio-v21-theme-preview.wav: eski/yeni Rezonans,
  Plazma,Ark,Tekrarlayıcı,Kalkan,Zırh,Onarım,Güçlendirici. Kullanıcıya
  sohbette dinlenebilir olarak gösterildi; zaman listesi aynı adlıJSON.
  V20 baseline70 dosya qa_reports/audio-v21-baseline içinde korundu.
- Tüm bu dal hâlâ commit/push edilmedi; canlı2.3.0 ve Play AAB değişmedi.
  S1 bot/ödül/sekme işleri aşağıdaki önceki kayıtta. Yayın kapıları açık,
  gerçek fiziksel kabulden sonra commit/push/uzak CI sırası değerlendirilir.

---

# Önceki durum — v20 ses APK’sı telefonda, 6 Kasım 2026

- Kullanıcı “devam et” dedi; önceki duraklama sona erdi. Dal
  `codex/s1-bots-tournament-rewards`; bu turun tüm işleri hâlâ commit/push
  edilmedi. Canlı2.3.0 ve Play AAB değişmedi.
- V19 fiziksel reddi: Rezonans aktivasyon ve Plazma/Ark/Tekrarlayıcı
  duyulmadı; yalnız müzik duyuldu. Müziksiz gerçek efekt testi çok kısık
  duyuldu. Önceki PASS yazılım/decode kabulüydü, fiziksel kalite kabulü değil.
- v20 tamamlandı: fazı sürekli orta bant katmanıyla23 WAV,46 OGG/AAC türevi
  üretildi. Savaş müziği2.85→1.65, SFX0.42→0.90; coreactivate0.78,
  coreshot0.58; yeni saldırı cue0.70. Mevcut Lazer/destek/EMP trimleri,
  menü/result müziği, kullanıcı ayarı ve üç rutin ses/420ms korunur.
- `tools/tests/test_combat_audio_generation.py`:23 kaynak/telefon bandı
  testi; 600Hz üç kademeli filtrede kalan RMS oranı≥0.20, yumuşak sınırlar,
  RMS/tepe/örnek adımı sınırı. Quantum presence1000Hz; core880+index×60Hz.
- 779 istemci,11 build,85 odaklı Python (üretici+gerçek core motoru) PASS;
  490 import kontrolü ve105 mobil ses hash kontrolü PASS. İki tarayıcıda
  gerçek OGG/AAC, mute/arka plan/bütçe ve yoğun miks PASS: yaklaşık0.609305
  tepe,0 kırpılan örnek. Kanıt qa_reports/audio-v20-mix-evidence.json.
- Rapor üreticisi ve iki audio matrisi/JSON yeni ölçümlerle güncel.
  Eski0.782059/v19 sonucu kullanılmıyor. `device_listening_verified=false`.
- APK offline build/audit PASS,582 web dosyası, hook/secret yok. Bağlı
  telefonda savaş yokken aynı `com.gridshard.localdebug` paketi veri silmeden
  güncellendi; adı GRIDSHARD S1 TEST. Web hash291b3fcd28a2b17e.
- Native WebView’de v20, gerçek beş codec dosyasının SHA-256 eşitliği,
  aynı yerel hesap ve24 açık modül PASS; Rezonans seçili. Kanıt
  qa_reports/native-s1-20261106/native-v20-install-proof.json.
- Telefon API25020/8897 açık; retained runtime ve24 modül açık aynı hesap
  korunur. Sırf bu istemci ses düzeltmesi için API yeniden başlatılmadı.
  USB reverse8897 gerekir. Asıl uygulama/canlı hesap değişmedi.
- Kullanıcıya yeni savaşta Rezonans ve Plazma/Ark/Tekrarlayıcı duyulabilirliği
  soruldu; yanıt bekleniyor. Fiziksel ses/dokunma kabulü tamamlanmadan
  `android_acceptance=true` yapma. Sonraki adım bu geri bildirim, gerekirse
  düzeltme; ardından commit/push ve uzak CI. RELEASE-01 açık.
- S1 bot/ödül/sekme kapsamı ve önceki tam2108 Python/araç,25 PG kayıtları
  aşağıdadır. Yeni ses kodundan sonra bütün sunucu paketini tekrar koşturmak
  yerine ilgili85 test çalıştırıldı; eski geniş sonuçları v20 tam koşusu diye
  sunma. Ayrıntı docs/planning/native-s1-test-20261106.md.

---

# Önceki duraklama — fiziksel ses geri bildirimi, 6 Kasım 2026

Kullanıcı çıkacağı için açıkça durmamızı istedi. “Devam et” dediğinde aşağıdaki
ses düzeltmesinden sürdür; yeni iş/derleme/kurulum şimdi yapılmadı. Bu dalın
değişiklikleri henüz commit/push edilmedi. Canlı sunucu ve Play paketi değişmedi.

## Son kullanıcı geri bildirimi ve gerçek cihaz bulgusu

- Kullanıcı Rezonans çekirdeğini etkinleştirirken ses duymadı; Plazma Topu,
  Ark Topu ve Tekrarlayıcı atış/isabet sesleri de duyulmadı. Eski ses/müzik
  karşılaştırmasında **yalnız müzik** duyduğunu söyledi.
- Gerçek Android WebView'de beş örnek decode ve playback=true; ses dosyaları
  eksik değil. Gerçek uygulama yöneticisi soundVolume1, musicVolume0.7,
  mute=false; bağlam running ve görünür/odaklı. AnalyserNode ile Rezonans
  efekt çıkışında 0.223, Plazma'da0.164 tepe ölçüldü. Bunlar kullanıcı
  tarafından duyulma kabulü değildir.
- Müzik birkaç saniyeliğine kapatılıp dört efekt gerçek uygulama kanalında
  çalındığında kullanıcı **“Çok kısık duydum”** dedi. Müzik tercihi geri
  yüklendi. Root bulgusu: çok düşük algılanan efekt seviyesi / müzik baskısı;
  sentezlerin özellikle bas bölgesinde yoğunlaşması telefon hoparlöründe
  sorunu büyütüyor. Hiçbir fiziksel ses kabulü PASS sayılmadı.
- Telefon medya sesi değişmeden okundu:49/150, muted=false, çıkış speaker.
  Kullanıcının sistem sesini değiştirmedik. Sahip olunan test uygulaması
  zaman zaman kapalıydı; kullanıcı daha sonra açık bıraktı. Uygulama çökmesi
  kanıtlanmadı, kullanıcı kapatmasıyla karıştırma.

## Yarım kalan ses düzeltmesi — henüz kodlanmış mobil türev / APK yok

- `client/src/gridshard-audio.js`: mix v20; battleMusicGain2.85→1.65,
  battleSfxGain0.42→0.90; core activate gain0.52→0.78,
  core shot0.32→0.58. Menü/result müzik, kullanıcı sliderları, limiter,
  compressor ve üç rutin ses/420ms bütçesi korunur.
- `client/src/battle/module-presentation-profiles.js`: saldırı cue gain0.70;
  lazerin mevcut özel cue gain0.65 ve pasif/destek/EMP trimleri korunur.
- `tools/combat_sfx_synth.py`: fazı sürekli, telefon için orta frekans
  katmanı eklendi; ham RMS ve peak hedefleri korunur, gürültü/click eklenmez.
  Core presence880+index×60Hz; saldırılar880–1400Hz, .65/.06 harmonikler.
- Sekiz saldırı modül WAV'ı, 14 çekirdek WAV'ı ve `pulse_cannon_fire.wav`
  jeneratörlerle yeniden üretildi. Son core en büyük örnek adımı0.08658
  (mevcut<0.09 hedefinde). Bütün kaynakların son testleri henüz çalışmadı.
- **Mobil OGG/AAC türevleri ve manifest şu anda eski kaynak hash'lerini
  taşıyor.** Bu ara durumda build/check'in uyumsuzluğu reddetmesi beklenir.
  Kaynakları geri alma; önce encode et, sonra ölçüm/denetim yap.
- ffmpeg bulundu: `C:/Users/S-A/AppData/Local/Microsoft/WinGet/Packages/
  Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/` altında; sonraki turda
  `Get-ChildItem ... -Recurse -Filter ffmpeg.exe` ile tam yolu al ve
  `python tools/encode_mobile_audio.py --ffmpeg <tam-yol>` çalıştır.
- Bazı istemci testleri v20/battle0.495 hedefiyle güncellendi
  (`gridshard-audio-result`, audio/browser-lifecycle sürüm kontrolleri).
  Sadece sabit sayı testiyle yetinme: hoparlör bandı, gerçek decode/miks,
  yoğun savaşta kırpma ve gerçek sunucu olay→ses bağlantısını doğrula.
- `tools/report_combat_audio.py` ve üretilen iki md/JSON henüz eski.
  Özellikle eski “genel kanal yükseltilmedi” ve 0.782059 tepe anlatımı v20
  için geçerli değildir. Gerçek yeni ölçümden güncelle; cihaz kabulü false.
- Sırada: kaynak/codec üretimi → anlamlı ses testleri + offline miks tepe
  kabulü → mevcut ayrı S1 TEST APK’sını yeniden derle/denetle → kullanıcı
  savaşta değilken veri koruyarak güncelle → fiziksel kullanıcı dinleme.
  Telefondaki mevcut paket **hâlâ v19**, web hash eb7152c64351e435.

## Yerel tanı ve korunacak test durumu

- `qa_reports/native-s1-20261106/` içinde native-audio-probe.json,
  native-audio-baseline.json, native-real-output.json ve tanı cjs dosyaları.
  Gizli oturum anahtarı çıktıya yazılmadı. Kanıtlar Git'e girmez.
- WebView'de geçici `window.__qaCoreAudio` tanı gözlemcisi vardır; triggerCue,
  core receive ve publishPlaybackState sarmalandı. Ses davranışını değiştirmez;
  yeni APK/yeniden açılışta kaybolur. Olası eski appDirector işaretçisini
  yeniden açılmış WebView'de varsayma. Son test müzik tercihini geri yükledi.
- Telefon API PID25020 / port8897 / retained runtime ve 24 açık modüllü
  aynı yerel hesap korunur. Durumu aşağıdaki kayıtta. Yalnız sahip olunan
  süreci komut satırıyla doğrulayarak yönet; canlı/asıl oyuna dokunma.
- Önceki 2108 Python/araç +25 PG, 779 istemci ve11 build PASS kayıtları
  **bu yeni ses değişikliklerinden öncedir**; v20 test sonucu diye sunma.

---

# Önceki durum — S1 botları, ödül planı ve telefon testi, 6 Kasım 2026

- Çalışma dalı `codex/s1-bots-tournament-rewards`, taban `49b2eca`.
  Bu turun kodu henüz commit/push edilmedi. Canlı 2.3.0 ve Play AAB değişmedi;
  önceki 5 Kasım bakım duyurusu dağıtımı aşağıdaki tarihsel kayıttadır.
- Kullanıcı kararı: 240 bot bütün turnuva ve lider panolarında bulunur;
  gerçek sıra korunur, botlar ödül alamaz. Bütün ödül sıraları bot ise bütün
  paket aynı içerikle kalıcı ödül planının sonuna bir kez eklenir. İnsan
  ikinciyse ikinci ödülünü alır; bot atlayarak birinciliğe taşınmaz.
- `server/data/bot_nicknames_v1.json`: 240 tek kelimelik benzersiz ad,
  Uç hariç; 12×20 takım. Kimlikler ve arena kurallarına uyan mevcut 24
  modüllü desteler korunur. Botlar yalnız yayımlanmış S1 istisnasıyla katılır;
  owner sıralama dışında, botlar ödül kuyruğunda ayrıca engellenir.
- Kapanışlar ve hash'li özgün paketler `team_document.tournaments.
  _competition_rewards_v1` içinde saklanır. `deferred` kuyruğu artan sıra ile
  `planned/after_reviewed_calendar` olarak eklenir; aynı dönem çoğalmaz.
  Gelecek takvime tahsis ayrı incelenmiş yayın işidir, kendiliğinden tarih
  açmaz veya aynı kozmetiği ikinci kez rezerve etmez.
- Haftalık ve takım turnuvasına ÖDÜLLER sekmesi eklendi. Yetkili dönem kasası
  mevcut sanatla önizlenir; cüzdan/envanter/hak değişmez. Arkadaşlar'ın beş
  sekmesindeki alt çizgi kaldırıldı; seçim/odak/rozetler korunur. İlk 12
  dışında kalan kendi takım sırası da görünür.
- Aday profil artık yedi dönem, altı oyuncu + üç Kutup Işığı takım öğesi.
  Takım ayrı başlangıçla en erken 7 Aralık 03.00 TR hedeflidir. Eksik dönem
  içeriğiyle takım açılmaz. S1 içinde başlayan ilk takım dönemi sezon devrinde
  silinmez. Kaynak profil draft, android_acceptance=false; canlı ayar açılmadı.
- Kod/kurallar ve güncel checklist/takvim/duyurular:
  `docs/planning/release-240-bot-competition.md`.
  Kaynak paketi, Docker COPY/izin listeleri ve CI PG/tarayıcı kapsamı yeni
  bot dosyasına bağlandı. Ekonomi tutarları değişmedi; kaynak hash'leri yenilendi.
- Yerel tam kontrol: 2108 Python/araç PASS / 52 dış servis SKIP;
  gerçek PostgreSQL ile ayrıca 25 odaklı test PASS (karma ikincilik,
  kapanış/erteleme rollback + reload ve gerçek S1 yedek/restore). 779 istemci, 11 build, 490 import kontrolü,
  plan/guard ve 10 gerçek HTTP eski istemci senaryosu geçti. Eski 2.3.0
  System duyurusu izole gerçek eski API ile tekrar geçti. Uzak CI çalıştırılmadı.
- Üç tarayıcıda TR/EN 320/393: beş arkadaş sekmesi ve iki turnuva ÖDÜLLER
  görünümü geçti. Son üçlü koşu tüm lider panolarındaki botları da doğrular.
  Gerçek PG kapanış ve teslimin birlikte rollback/reload kabulü geçti.
- Telefon: ayrı `com.gridshard.localdebug`, ad GRIDSHARD S1 TEST, Android16.
  Veri silmeden güncellendi. Normal WebView girişi, korunan aynı yerel hesap,
  40 sezon kademesi ve üç açılmamış test kasası PASS. Web hash
  `eb7152c64351e435`; 582 web dosyalı APK denetimi PASS, hook/secret yok.
- Son kullanıcı isteğiyle o yerel hesaba 24 modülün tamamı açıldı. Kupa,
  cüzdan, seviyeler ve seçili deste değişmedi; gerçek Kartlar ekranında 24
  modül doğrulandı ve açık bırakıldı. Kullanıcı sesleri deniyor. Dinleme ve
  kendi dokunma kabulü henüz onaylanmadı; android_acceptance true yapma.
- Telefon API 127.0.0.1:8897, USB reverse8897; yalnız test sunucusu PID25020
  (yeniden kullanmadan `server-process.json` ve komut satırını doğrula).
  Retained runtime `.mobile-debug/runtime-s1-20261106`; silme/prepare ile
  yeniden seed etme. `GRIDSHARD_E2E_S1_ACCEPTANCE=1`, `GRIDSHARD_E2E_S1_BOTS=1`;
  yalnız bu süreçte tarih12 Aralık. Native düzenek ve kanıtlar:
  `docs/planning/native-s1-test-20261106.md`, `qa_reports/native-s1-20261106/`.
- QA süreç hatası düzeltildi: tarayıcı teardown PID kaydı artık port başına;
  8899 testleri 8897 telefon sunucusunu kapatmıyor. Telefon test ederken bu
  sunucuyu kapatma veya yeni kod için savaş ortasında yeniden başlatma.
- Sonraki adım: kullanıcı fiziksel ses/Topla/arayüz geri bildirimi, commit/push
  ve uzak CI; ardından yayın kapıları. 2.4.0 paket hedefi23 Kasım, S1/ilk haftalık
  30 Kasım 03.00 TR. Canlıya bütün geliştirme kaynağını erken dağıtma.

---

# Güncel durum — bakım ön duyurusu canlıda, 5 Kasım 2026

- Ev bilgisayarından küçük 2.3.0 Sistem mesajı yaması dağıtıldı. Kayıt:
  `docs/planning/release-230-prerelease-deployment-20261105.md`.
  Duyuru kaynağı main `c720f22`; yalnız üç dosya alındı, bütün 2.4/S1 kodu dağıtılmadı.
  Bu operasyonun kayıt dalı `codex/legacy-230-system-mail`; uygulama kodu değişmedi.
- Canlı ana kaynak ilk LF manifestinden farklı hash taşıdı; içerik birebir aynı,
  yalnız CRLF satır sonları farklıydı. Canlı baytlar korunarak yama yeniden
  hazırlandı ve eski 2.3.0 uygulaması/gerçek API ile tekrar sınandı.
- İmaj `gridshard-production:2.3.0-mail-20261105`; kimliği
  `sha256:060346eabfb7c05919a0ae6cbdbdb98fb785f7a0aff8fe6dec2b1c741f05ba39`.
  Server 2.3.0, legacy alias 2.2.1, protokol 2; Android code14/AAB değişmedi.
- Aktif savaş/WebSocket/bekleyen sonuç yokken yalnız API durdu. Gerçek yedek,
  boş PostgreSQL restore ve bütün tablo karşılaştırması geçti. 55 mevcut profil
  ve korunan tablolar geçişte birebir aynı; ortam/secret/birimler korundu.
  Duruş-yedek-restore-açılış 22,4 sn. Healthy/restart 0; prova kaynakları kaldırıldı.
- Yedek `/var/backups/gridshard-production/20261105-before-legacy-mail-c720f22`;
  operasyon `/opt/gridshard/operations/legacy-mail-20261105-c720f22`.
  Yeni Compose katmanı bu operasyonun `overlay.json` dosyasıdır. Sonraki
  dağıtımda mevcut katmanları yeniden keşfet; eski komutu varsayma.
- Gerçek HTTPS eski istemci: tek yeni konuk hesabı, normal auth/bootstrap,
  Sistem mesajı ve okundu/yeniden açılış PASS; mevcut oyuncu hesabı kullanılmadı.
  TR/EN 320/393 dört birleşim, aynı dağıtılan hash'lerle yerelde gerçek Ayarlar
  dil seçimi üzerinden ayrıca PASS. Canlı dil değiştirme görsellerinin tamamı
  kabul değildir; ikinci canlı hesap oluşturulmadı. Ayrıntı raporda.
- Son HTTPS kontrolü 5 Kasım 18.39 TR: 200, PostgreSQL/Redis hazır, savaş0.
  Operasyon/kapsayıcı son kontrolünden sonraki isteğe bağlı ek SSH denemesi
  zaman aşımına uğradı; sonraki sunucu işinde erişimi yeniden doğrula.
- `preview-2-4-0-season-one` artık mevcut uygulamada Sistem'de görünür.
  Bakım hedefi 23 Kasım 22.00–24 Kasım 00.00 TR. Ayrı turnuva popup'ı henüz
  görünmez; 2.4.0 sunucusu/AAB sonrasındaki kendi kapısı geçerli. S1/ilk haftalık
  turnuva hedefi 30 Kasım 03.00 TR; sezon ve takım başlangıcı açılmadı.
- Sırada 2.4.0/S1'in ertelenmiş fiziksel Android yükseltme/hesap dönüşü,
  hoparlör/kulaklık ve genel yayın kabulleri var. RELEASE-01 açık; bakım
  duyurusu diye tam geliştirme sunucusunu şimdi dağıtma. Takvim değişmedi.

---

# Önceki devir — S1 kabulü ve iki aşamalı duyuru, 5 Kasım 2026

- Dal `codex/s1-release-acceptance`; taban `afad546` (PR #2 sonrası main).
  Kullanıcı bu turdaki hazırlığı iş bilgisayarında, canlı ön duyuru dağıtımını
  **ev bilgisayarında** yapmamızı istedi. Bu bilgisayarda canlı sunucuya bağlanılmadı.
- Son kullanıcı eki **UI-09**: Gelen/Giden İstek sekmelerindeki sarılan metnin
  üstüne taşan alt çizgi kaldırıldı. Seçili turkuaz yüzey/kenar, odak ve rozet
  korunur. Üç tarayıcıda TR/EN 320/393 geçti; 2.4.0 paketi/takvim/checklist bağlı.
- Üretim kodu referansı `619c90a7527146ebc0ee2652fa81cfc9ccdf2bfe`;
  [PR #3](https://github.com/ozturkalihan2026/GRIDSHARD/pull/3),
  [CI 42019478488](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/42019478488).
  **Bütün işler PASS**: sunucu 2024/50 SKIP, araçlar 61/4 platform SKIP;
  gerçek PG/Redis 83 ve imaj restart/restore; istemci 779, build 11;
  Chromium/Android genel 78 + S1 8 + performans 2 + gerçek PvP 3;
  Safari genel 35 + S1 4 + performans 1; kaynak paketi üretildi.
  Sonraki kayıt commit’i belge ve WebKit’in mevcut 150 sn proje test bütçesine
  uyumdur; üretim kodu bu referansla aynıdır. Önceki başarısız koşular kabul değildir.
- Ödül önizlemesi okundu yanıtında kartın yeniden kurulması, gecikmiş odak
  kaydırması ve hover ile kapanıyordu. Rozet alanları liste imzasından çıkarıldı;
  gerçek ödül değişimi hâlâ listeyi yeniler. Sabit panel görünür sandıkla kayar,
  görünümden çıkınca kapanır; hover/odak seçimi değiştirmez, açık tıklama değiştirir.
  Regresyon gerçek okunma yanıtını pin sonrasına bırakıp aynı paneli, rozetin
  sönmesini, kaydırmayı ve görünümden çıkışta kapanmayı birlikte sınar.
- [S1 matrisi](docs/planning/release-240-s1-acceptance.md): REWARD-06 ve
  SEASON-01 yazılım kabulü done; SEASON-00 ve UI-08 branch_ready. Gerçek yerel
  PostgreSQL ile 68 test geçti; 80 hak kapanış/rollback/reload ve gerçek
  pg_dump/pg_restore ile korundu. 22 haftalık/ilk 10 kasası sabit bütçeyle açıldı.
- `first_season_launch_v1.json`: reward_budget, unique_cosmetics,
  rollover_restore, old_clients true; android_acceptance false; status draft.
  Altı dönem/altı oyuncu öğesi/234 ek sıradan parça, hash’li aday pakette sabit.
  Yetkili kozmetik kataloğu ve canlı sezon yayımlanmadı; takım ayrıca kapalı.
- Yeni `e2e/s1-acceptance.spec.js`: gerçek yerel API makbuzları; üç tarayıcıda
  TR/EN 320/393 boyutlarının 12 birleşimi, ayrıca azaltılmış hareket geçti.
  Önizlemenin alt dock’u kapatması düzeltildi. Fiziksel Android ve hoparlör/
  kulaklık kullanıcı isteğiyle ertelendi; emülasyonla kapatılmayacak.
- [İki duyuru ve evden dağıtım](docs/planning/release-230-prerelease-system-mail.md):
  `preview-2-4-0-season-one` yalnız 2.3.0 Sistem mesajında bakım ön haberi.
  **23 Kasım 22.00 → 24 Kasım 00.00 TR**, yaklaşık 2 saat;
  UTC 23 Kasım 19.00–21.00. AAB değiştirmeyen üç dosyalık eski sunucu paketi hazır.
- `preview-2-4-0-tournament-launch` ayrı popup+Sistem kampanyasıdır. 2.4.0
  sunucusu ve yeni AAB sonrasında; min_server_version 2.4.0, yayın başlangıcı
  23 Kasım 19.00 UTC. S1/ilk haftalık turnuva **30 Kasım 03.00 TR**, haftalık
  katılım/kupa/ödüller, ilk 10, kozmetikler ve ayrı takım başlangıcı anlatılır.
  Eski haberin okunması/onayı yeni pencerenin onayını tüketmez. İkisi aynı kimlik değildir.
- Bakım penceresi takvim/backlog/katalogda bağlı ve doğrulanır. Genel sonraki
  sürüm popup standardı korunur; 2.4.0 turnuva penceresi tek başına önceki ön
  duyuru yayın kapısını karşılamaz. Tarih kayarsa iki dil ve kanonik takvim birlikte değişir.
- Yerel: 2089 Python PASS / 50 dış servis SKIP, 779 istemci PASS, build 11 PASS;
  yeni turnuva popup’ı üç tarayıcıda TR/EN 320/393; eski 2.3.0’ın değiştirilmemiş
  arayüzü ve gerçek eski API ile System mesajı/okunma kalıcılığı geçti.
  Yerel son S1 matrisinde Windows WebKit EN393 toplam 120 sn sınırını bir kez
  aştı; proje bütçesiyle tekrarsız geçti. Uzak 12 S1 birleşimi tekrarsız PASS.
  Kanıt: `qa_reports/s1-ci-42019478488.json`; eski CI kayıtları aşağıda tarihseldir.
- Evde önce bu dalı güncelle. `tools/prepare_legacy_announcement.py` ile
  `qa_reports/legacy-230-announcement-handoff` üret; `tools/verify_legacy_announcement.py --browser`
  ile doğrula. `qa_reports` Git ile taşınmaz, komutlarla aynı paket yeniden üretilir.
  Canlı main SHA-256, manifestteki incelenmiş 2.3.0 tabanıyla eşleşmiyorsa
  üzerine yazma; gerçek tabandan aynı küçük yamayı yeniden hazırlayıp test et.
  Bütün 2.4/S1 geliştirme sunucusunu bakım duyurusu diye erkenden dağıtma.
- Paket etiketi 2.3.0/code14, canlı ortam/AAB/başlangıç ayarları değişmedi.
  RELEASE-01 ve fiziksel cihaz/yayın kapıları açıktır; yeni sanat veya ekonomi
  baz çizgisini baştan üretmek sıradaki iş değildir.

---

# Önceki kabul — 5 Kasım 2026

- COMM-01 ve COMPAT-01 yazılım kabulü done. Dal `codex/prerelease-announcements`.
  Uygulama kaynağı `0cbe34cc8113dccdd7e62f0022a870ad19eec3e6`; CI 41919146605 bütün işler PASS.
  Sonraki commit yalnız kabul/checklist/checkpoint belgeleridir.
- Duyuru ilk uygun ana ekranda bir kez; Tamam hesapta kalıcı, offline outbox
  ve Sistem mesajı ayrı. Sürüm sonrası aynı kimlikte sezon metni; eski onay
  yeniden açılmaz. Patch/minor/major sürüm kapısı ön duyuruyu zorunlu tutar.
- AUDIO-03 / 2.5.0 ve AUDIO-04 / 2.7.0 yalnız üretim planıdır; todo kalır.
  Hedefler 21 Aralık / 15 Şubat, sayılar 1 menü+1 savaş / 1 menü+2 savaş.
- Kabul: `docs/planning/prerelease-announcement-acceptance-20261105.md`. Yerel 2072 Python PASS / 48 dış servis SKIP,
  779 istemci; son kaynak CI gerçek PG/Redis/imaj/Chromium/Android/WebKit/kaynak
  paketini geçti. Oyun grafik uyumu 4 saniyelik pencerelerle korunur;
  Safari referansı Apple Silicon'dır; performans yayın eşikleri değişmedi.
- Canlı 2.3.0/code14, AAB, sezon açılışı ve fiziksel cihaz/ses dinlemesi
  yapılmadı. Sırada S1 kaynak/ödül/görsel/cihaz yayın matrisinin kalan kabulleri
  var; yeni sanat üretimi ya da BASE-01 tekrarı değildir.
- Aşağıdaki eski CI bekleme kayıtları tarihsel kayıttır; güncel kaynak üstteki
  kabul ve `artifacts/prerelease-20261104/FINAL_STATUS.json` ile doğrulanır.

---

# Ön duyuru standardı ve müzik planı — 4 Kasım 2026

- Yeni dal: `codex/prerelease-announcements`; önceki sürüm dalındaki takılı
  CI'ın concurrency grubundan bağımsızdır. Uygulama/Play etiketleri 2.3.0/code14.
- COMM-01 dalda hazır. `release_announcements_v1.json` tek TR/EN kaynaktır:
  2.4.0 öncesi sürüm duyurusu; aynı kimlikle sürüm sonrası S1 öncesi metin.
  Önceden Tamam diyen yeniden görmez. Sistem mesajı ayrıca okunabilir.
- Onay hesapta kalıcıdır; cihazdaki hesaba özel outbox ağ hatasında Tamam'ı
  kaydeder ve sonraki inbox yenilemesinde eşitler. Okuma/silme onaydan ayrıdır.
  Yükleme/savaş/başka modal sırasında açılmaz; eski API'de alan yoksa devam eder.
- 2.3.0 sonrası patch/minor/major sürümlerde release_guard incelenmiş ön
  duyuru ister. Taslak/denetim: `tools/release_announcements.py`; yayın penceresi,
  hedef takvim ve iki dil doğrulanır. Ön duyuru, gerçek güncelleme notu değildir.
- AUDIO-03 / 2.5.0: en az bir yeni menü + bir savaş bestesi; merak/umut ve
  kontrollü rekabet. AUDIO-04 / 2.7.0: bir menü + iki özgün savaş bestesi;
  gizem, keşif gerilimi ve cesaret. Bu iki iş planlandı, müzik üretilmedi.
  Ortak sanat/ses yönü, mevcut codec/miks/tercih hattı ve master kararı korunur.
- Ayrıntı: `docs/planning/prerelease-announcements-and-music.md`; checklist,
  takvim ve 2.4/2.5/2.7 briefleri bağlı olarak üretildi. Tarihler değişmedi.
- Yerel testler `artifacts/prerelease-20261104/`: tam Python ve istemci,
  build, 320/393 TR/EN + reload/offline, gerçek PG rollback/cache kaybı geçti.
  CI kaynak/sonuç dosyaları aynı klasördedir; yeni commit CI sonucu beklenecek.
  Fiziksel Android, canlı sunucu, AAB veya sezon açılışı yapılmadı.
- İlk yeni CI'da sunucu/istemci/PG-imaj geçti; Safari savaş bütçesi kaldı.
  Bağımsız boş sayfa rAF kanıtı Intel Mac havuzunun oyunsuz durumda bile
  34 ms sınırını aştığını gösterdi. Grafik uyumu denemesi geri alındı;
  oyun kodunun 4 saniyelik kademesi, manuel ayar ve yayın bütçesi korunur.
  macOS 15 Apple Silicon havuzunda aynı test tekrar çalışacak.
  Testte savaş kareleri atılmaz; bağımsız zamanlama kanıtı ayrıca kaydedilir.
- Bu istemci kodu kurulmadan eski native 2.3.0 popup gösteremez; sunucu
  dağıtılınca Sistem mesajını okuyabilir. 2.4.0 istemcisinde sezon öncesi
  metin, aynı onay kimliğiyle desteklenir. Kaynak hazırlığı canlı yayın sayılmaz.

---

# COMPAT-01 ara CI kaydı — 4 Kasım 2026, 20.29 Türkiye saati

- Uygulama kaynağı `0c90cc9037983ee21b9ff206cfe9051ceb05b61a`,
  `codex/release-2-4-0` dalına push edildi. Görev hâlâ `branch_ready`.
- CI: https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/41873986873
  Sunucu, istemci, gerçek PG/Redis/üretim imajı ve Chromium/Android PASS.
- Safari ARM Mac kapasitesinden dolayı önce hiç başlamadı; desteklenen
  `macos-15-intel` havuzuna taşındı. Bu son kaynakta Intel Mac işi
  `126728333059`, tarayıcı kurulumunda tanımlı 10 dakika sınırını aştı.
  Normal ve force-cancel istekleri kabul edildi; GitHub işi kapatmadığından
  tek işi yeniden çalıştırma isteğini `already running` ile reddediyor.
  GitHub bağlayıcısında Actions yazma izni yok; mevcut Git oturumu API'si
  dispatch/cancel işlemlerinde kullanıldı. Kimlik bilgisi dosyaya yazılmadı.
- Sıradaki adım: iş kapandığında aynı kaynaktaki Safari işini ve bağımlı
  kaynak paketleme kontrolünü yeniden çalıştır; bütün CI işleri geçince
  COMPAT-01'i done yap, checklist/sürüm belgelerini üret ve kayıt commit'ini push et.
- Yerel son kaynak kanıtı: `artifacts/compat-240-20261104/http-proof-mac-source/proof.json`.
  Temiz commit, 10 gerçek HTTP + üç UI açılışı PASS. Python 2057 PASS / 47
  dış servis SKIP; client 778, build 11, yerel PG 77 PASS / 1 Redis SKIP;
  6 mobil akış + 2 saklı kimlik kontrolü PASS. Son durum `FINAL_STATUS.json`.
- Canlı 2.3.0/code14, sezon başlangıcı, AWS/env, AAB ve 8891 değişmedi.
  Fiziksel Android/Play/ses dinlemesi yayın kapısında kalır.

---

# COMPAT-01 — 4 Kasım 2026 ev bilgisayarındaki uygulama

- Dal codex/release-2-4-0. Kurulu2.3/2.2.1 ve yeni istemci yazılım uyumu
  uygulandı. Kabul docs/planning/release-240-client-compatibility.md; en son
  durum artifacts/compat-240-20261104/FINAL_STATUS.json'dan okunur.
- Gerçek sağlık derlemesi **runtime_release_version**. server_release_version
  artık2.3.0 alias; release_version2.2.1, versionbeta72 sabit. Operatör gerçek
  sürümü yeni alandan okumalı. API/minimum/incelenmiş minor hatları/yetenekler
  ayrıca denetlenir. Yeni eksik sözleşme eski alana düşmez; proto/kalıcılık geçmez.
- client/tests/fixtures/installed altında iki TAM değiştirilmemiş eski relay
  executable ve Git/SHA-256 kökeni; bunlar aktif test girdisidir, eski PASS
  raporu değildir. .gitattributes baytları korur, üretim bundle'a girmezler.
- Gerçek loopback HTTP: eski2.2.1/2.3→yeniAPI ve yeni→yeni/iki eskiAPI;
  web+native-origin emülasyonuyla10senaryo PASS. Auth/bootstrap/yüklemede
  aynı kimlik/korunan takım rotası gerçekHTTP; SecureStorage bellekte emüle.
- Yeni UI üç API'de Chrome'da açıldı, JS/varlık hatası0. İki telefonda6E2E
  PASS: geleceksürüm/minimumTR-EN/protokol hazır olma/503retry. Fiziksel
  Android/Keystore/TLS/Play yükseltmesi kanıtı değildir; bu kabul kullanıcı
  isteğiyle ertelenmiş genel RELEASE-01 kapısında kalır.
- Gelecek2.4 karşılaştırması için yalnız izole sağlık kimliği ve test
  expectedVersion parametresi2.4 simüle edildi. Gerçek handler'lar çalıştı;
  paket etiketleri hâlâ2.3/code14. AWS/env/S1 başlangıcı/AAB/8891 değişmedi.
- Tam yerel Python/istemci son sayıları ve CI kaydı FINAL_STATUS.json'dadır.
  CI'a aynı gerçekHTTP kaynağı ve yeni browser testleri eklendi. Branch_ready
  yerel kabulü anlatır; yeni commit CI sonucu ayrıca kaydedilecektir.
- Sonraki iş: SEASON-00/REWARD-06/SEASON-01 gerçek PG/Redis rollback/reload,
  genel CI/yayın kabulleri ve ertelenen cihaz doğrulamaları. BASE-01 done;
  sıradaki iş tekrar ekonomi baz çizgisi veya yeni sanat üretimi değildir.

---

# GRIDSHARD — güncel çalışma durumu

4 Kasım 2026. Başlangıç: [belge dizini](docs/README.md).

## Ev bilgisayarına devir — 4 Kasım 2026

- Kullanıcı iş bilgisayarındaki birikmiş 2.4.0 çalışmalarının commit/push edilmesini,
  sıradaki işin ev bilgisayarında yapılmasını istedi. Bu kaydı içeren commit;
  S1 planı/profili, sabit kasa açılışı, günlük/sezonluk emirler ve sarı gezinme/ses
  uygulamalarını birlikte taşır. Aşağıdaki eski "commit/push edilmedi" notları
  ilgili dilimin kayıt anını anlatır.
- Evde önce yerel değişiklikleri `git status` ile kontrol et; temiz `main` üzerinde
  `git pull --ff-only` ile bu kaydı al. Yerel değişiklikleri silme veya üzerine yazma.
- Sıradaki iş **COMPAT-01**: değiştirilmemiş 2.3 ve 2.2.1 istemcileriyle yeni
  sağlık/başlangıç/protokol, eski API, minimum/capability uyumu ve native
  yönlendirme/güvenli güncelleme kabulü. Kanıt dosyası:
  `docs/planning/release-240-client-compatibility.md`. Bu işe iş bilgisayarında başlanmadı.
- Fiziksel Android hoparlör/kulaklık dinlemesi kullanıcı isteğiyle ertelendi.
  Gerçek PG/Redis ve CI/cihaz yayın kabulleri açık; yerel testleri bunların yerine sayma.
  Canlı ortam, sezon açılışı, AAB ve 2.3.0 paket etiketi değiştirilmedi.

## Depo ve yayın

- İş bilgisayarı: `D:/Projects/GRIDSHARD`; mevcut dal `main`.
- Kullanıcı yerel/uzak eşitlemesini bildirdi; önce `git status` ile güncel durumu kontrol et.
- Son teyit edilen yayın 2.3.0/code14. Play yayını kullanıcı beyanıdır;
  ayrıca fiziksel cihaz kabulü bildirilmedi. [Teyit](docs/planning/release-230-user-confirmation-20261103.md).
- Aktif hedef 2.4.0; kasa teslimi/açılışı ve ek günlük/sezonluk emirler geliştirme kodunda. Canlı veri,
  AWS, sezon açılış ayarı ve AAB değiştirilmedi.

## Güncel karar ve çalışma sırası

- [Bağlı sürüm rehberi](docs/GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md),
  [2.4.0 briefi](docs/planning/releases/2.4.0.md),
  [checklist](docs/GRIDSHARD_GELISIM_CHECKLIST_20261103.md).
- 2.4.0: mevcut 24 modülle S1; 40 kademe/kaynak bütçesi, açık kaynak haftaları,
  tekil kozmetik tahsisi, kazanılmış hakların kapanış/restore koruması ve eski istemci uyumu.
- Zorunlu sunum işleri: UI-07 bütün geri/ileri gezinme kontrollerinde son sarı tasarım;
  AUDIO-01 saldırı VFX ses kapsamı/cızırtı; AUDIO-02 çekirdek aktivasyon/etki sesleri.
  Yerel uygulamaları ve ölçümleri tamamlandı; aşağıdaki kabul kaydı esas alınır.
- BASE-01 raporu tamamlandı: [ekonomi baz çizgisi](docs/planning/economy-baseline.md).
  SEASON-00 kalan yayın kabulleri, COMPAT-01 ve yayın doğrulaması sıradadır.
  Gelecek sezon sanatını ilk iş diye başlatma.
- Hedef yayın 23 Kasım, S1 30 Kasım 03.00 TR. Ek yük için 6 Kasım kapasite kontrolü;
  riskte tarih yeniden karara bağlanır, kalite işleri sessizce çıkarılmaz.
- S2+ yeni hazır modül gerektirir. Planlı kayıt hazır içerik değildir; eski koleksiyon
  başka dönem/mağazada tekrar sunulmaz. Takım açılışı kişisel sezondan bağımsızdır.

## Kaynaklar ve doğrulama

- [Backlog](docs/planning/gridshard_development_backlog_v1.json): görev durumu/bağımlılık/kabul/kanıt.
- [Takvim](docs/planning/release_calendar_v1.json): tarihler, alt paketler, çalışma aralıkları.
- `python tools/development_checklist.py --write`, `python tools/release_calendar.py --write`,
  `python tools/release_delivery_plan.py --write`; ardından her biri için `--check`.
- 71 görev, 28 alt paket, altı brief; yeni özellikler plan yazıldığı için tamamlanmaz.
- Geçerli oyun: [oyun kanonu](docs/OYUN_KANONU.md), Akım V8, modül V7 ve mevcut kaynak/testler.
  Sanat yönü: [ortak kabul](docs/SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md).
- Eski checkpoint, devir kayıtları, emekli test gövdeleri ve eski raporlar Git geçmişindedir.
  Geçmiş PASS sayılarını yeni commit'in kanıtı olarak kullanma.

## 4 Kasım temizlik doğrulaması

- Eski karar/test arşivleri ve tarihsel QA raporları kaldırıldı; geçerli regresyonlar korundu.
  Salt eski raporu okuyan test, yeni eksik/atlanmış kanıtın PASS olamadığı izole testlere çevrildi.
- Bu tur: sunucu/araç Python testleri **1994 geçti, 44 dış servis senaryosu atlandı**;
  istemci **765**, JS derleme/site/araç **38** geçti. Üretim web derlemesi,
  462 dosyalık import denetimi, üç plan kontrolü ve yerel belge bağlantıları geçti.
- Font TTF aslı `native-assets/fonts/Rowdies-Bold.ttf` altında korundu;
  eski önizleme testi kaldırıldı, aktif gömülü font testleri korundu.

## BASE-01 sonucu

- `python tools/report_economy_baseline.py --write` / `--check`: kaynaklardan
  40 kademe, 28 giriş günü, dört sandık, on ürün ve altı 1/28 gün senaryosu üretir.
- 40. kademe 12.240 XP; altı görev 135 XP/75 Akı günlük. Dört maç/gün ve tüm
  görev varsayımında ücretsiz oyuncu 28 kademeye, iki premium birlikte 33'e ulaşır.
  XP/fiyat değişmedi; erişilebilirlik kararı SEASON-00 kabulüne taşındı.
- Baz çizgisi S1 sabit bütçesini modeller. Sonraki API incelemesinde servis
  katmanına ek olarak eski API'nin rastgele kademe sandığı verdiği doğrulandı.
  Yayınlanacak S1 profili ek sandık sayısını sıfırlar; eski kazanılmış ek sandık
  hakları korunur. Rapor eski API'nin toplam geliri diye okunmamalıdır.
- S1 önerisi: mevcut 40 kademe kaynakları; ücretsiz 40'ta aurora çifti, sıralama
  1.'sine solar çifti, son hafta 1.'sine abyss çifti. İlk üç hafta laser/shield/
  pulse_cannon için ilk üçe 36/24/18 parça; toplam ek tavan 234 sıradan parça.
  Bunlar yalnız bütçe önerisi; runtime tahsis/yayın değişmedi. Takım ayrıca kapalı.
- BASE-01 doğrulaması: ekonomi/bütçe/plan ve mevcut sezon/ödül teslimi için
  56 odaklı test geçti; baz çizgisi --check, üç plan kontrolü ve 464 dosyalık
  import denetimi geçti. BASE-01 done; SEASON-00 ve sunum envanterleri açık.

## S1 kullanıcı açıklaması — kasa ve XP

- [S1 sözleşmesi](docs/planning/season-1-rewards-and-xp.md), kaynak
  [XP planı](docs/planning/season-1-engagement-v1.json); `tools/plan_season_xp.py --write/--check`.
- Kullanıcı XP açığını bilerek istiyor: 12.240 eşiğini düşürme. Mevcut altı
  günlük emir korunur; 4 ve 6 Arena savaşı için ayrı +15 XP, 12 sezonluk emir
  toplam 1.800 XP önerisi. Yeni emirler kaynak para/parça vermez.
- Ücretsiz, %50 zafer, tüm ilgili emirler varsayımı: 6 maç+1 reklam/gün 27. gün;
  8 maç/reklamsız 25. gün biter. 6 maç/reklamsız 39. kademede kalır.
  Giriş tek başına XP vermez; aktif gün için uygun bitmiş savaş gerekir.
- REWARD-06 sabit kasa çekirdek teslimi; UI-08 Topla → aynı kasa al/aç →
  animasyon/ses/makbuz sonucu. Bunlar 2.4 zorunlu işleri; UI-03 2.5 seçim kasasıdır.
- Haftalık/takım/ilk 10 kasaları mevcut ödül türlerini sabit içerikle taşır;
  her kasaya her tür veya her sıraya yeni kozmetik vaat edilmez. Mevcut giriş
  25 çekirdek parçası korunur; yarışmaya ek çekirdek miktarı bütçelenmeden açılmaz.
- REWARD-06/UI-08 ve SEASON-01 ilk dilimleri kodlandı. RELEASE-01 bağımlılıklarıdır. Ek yük 6 Kasım kontrolüne
  girer. Tarihler otomatik kaydırılmadı; eski kazanılmış haklar korunacak.

## İlk uygulama dilimi — kasa teslimi/açılışı

- [Kod sözleşmesi ve kanıt](docs/planning/release-240-fixed-crate-contract.md).
  REWARD-06/UI-08 in_progress; tüm kabul koşulları bitmiş sayılmaz.
- Sabit kasa core_type_id/core_shards desteği ve tüm içerik mutasyondan önce
  doğrulama. Topla `?chest_delivery=open` ile aynı işlemi al/aç; eski query'siz
  toplama korunur. Yeni istek kimliği `inbox-open:{message_id}`; açılmış kasa
  makbuzu tekrar/restore halinde yeniden kullanılır, ikinci grant yoktur.
- UI açılış/ödül sesi/tekli ve toplu makbuz sonucu; kısmi hatada yalnız başarılar
  gösterilir. 2015 Python PASS/44 dış servis SKIP, 767 istemci PASS; 26 odaklı
  teslim testi. Yerel Chrome TR393/EN320 görsel fixture kontrolü PASS.
- Gerçek PG rollback testi eklendi, servis ortamı olmadan atlanır. Android kabulü
  bekliyor. Sıradaki ana iş S1 profile/tekil tahsis/kapanış ve sarı gezinme/ses envanteridir.

## SEASON-01 ilk uygulaması — günlük/sezonluk emirler

- [Kabul kaydı](docs/planning/release-240-mission-acceptance.md). Görev in_progress;
  yeni emirler artık kodda, tüm 2.4.0 kapıları kapanmış değildir.
- `server/app/season_missions.py` revision 1: 4/6 uygun savaşa ayrı +15 XP;
  12 sezonluk emir toplam 1.800 XP. Eski altı emir ve 12.240 XP eşiği korunur.
- Motorun bitmiş Arena AI/dereceli PvP sonuçları; sunucu tarafında maç tekilliği,
  aktif UTC günü ve kabul edilmiş çekirdek kullanımı. Yeni emir XP'si premiumla çarpılmaz.
- Özel meta JSON durumunda kayıt/restore; gün devrinde kazanılmış ek günlük XP,
  sezon devrinde kazanılmış bütün yeni emir XP'si önce kapanan sezona işlenir.
  Ayrıntılı eski emir defteri özel arşivde kalır. Tam sezon yolu teslimi SEASON-00'dadır.
- Yeni dönemli talep API'si `engagement/season-missions/{id}/claim`; eski talep
  gövdeleri korunur. Sekiz günlük/12 sezonluk kart, TR/EN, klavye sekme geçişi.
- Gerçek PG rollback/replay testi eklendi; yerel servis olmadan SKIP. Android
  güncelleme/hesap değiştirme ve bütün sezon yolu hakları kabulü açık.
- Son kaynak doğrulaması: **2031 Python PASS / 46 dış servis SKIP**, **770 istemci PASS**,
  **iki Chrome akışı PASS**. TR393/EN320 görüntülendi; 469 dosya/0 import sorunu,
  web derlemesi ve beş plan/bütçe kontrolü geçti.
- Değişiklikler henüz commit/push edilmedi. Canlı sunucu, env, AAB ve sürüm etiketi değişmedi.

## SEASON-00 ilk uygulaması — S1 profili ve kapanış

- [S1 profil/kapanış sözleşmesi](docs/planning/first-season-launch-profile.md).
  `server/data/first_season_launch_v1.json` draft; beş yayın kabulü false.
  Gerçek kozmetik kataloğu hâlâ 15 öğe / 0 rezervasyon / 0 yayın.
- Hazırlık komutu `python tools/prepare_first_season.py --check` / `--preview`;
  dosya yazmadan altı aday dönemi, altı tekil oyuncu öğesini ve 234 ek sıradan
  parçayı doğrular. Kaynak paketine profil dahil; CI kontrolü eklendi.
- Açık `resource_only` haftaları: W49 Lazer, W50 Kalkan, W51 Darbe Topu;
  ilk üçe 36/24/18, mevcut Kredi/Akı. W52 birinciye Derin Akım; sezon yolu
  40'a Kutup Işığı, liderlik birinciye Güneş Ocağı. Takım ayrı kapalı kalır.
- Kazanılmış kademe gerçek hedef/miktar/revision/hash ile özel kayda alınır.
  Kapanış önce emir XP'sini işler, sonra alınmamış sabit hakları mesaj kutusuna
  aktarır. Başarısız kapanış bütün profil üzerinde geri alınır. Premium kökeni
  eski sezonun iade/restore defterine bağlı kalır; tarihsel ek sandık hakkı korunur.
- S2 yeni hazır modül ve yayınlı dönem ödülü yokken waiting_for_content;
  yeni sezon XP/premium/turnuva açılmaz. Eski mesajlar açılabilir. Eski istek
  tekrarı ilk makbuzun dönemini kullanır; yeni sezon stoğu üretmez.
- Haftalık ilk kapanış tüm katılımcılara özel sıra tanığı yazar ve ilk üçün
  paketlerini birlikte sabitler. Yeniden kayıt ve kazanan hesapların silinmesi
  sonraki oyuncuyu yeni kazanan yapmaz. Eski kısmi dağıtımlar otomatik yeniden hesaplanmaz.
- Son doğrulama: **2052 Python PASS / 47 dış servis SKIP**, **770 istemci PASS**,
  **3 Chrome akışı PASS**, 474 dosya / 0 import sorunu; web derlemesi ve kaynak
  sürüm kontrolü geçti. Yeni gerçek PG kapanış rollback/reload testi servis yokken SKIP.
- SEASON-00 in_progress. Gerçek PG/Redis, değiştirilmemiş eski istemci ve Android
  kabulü açık. Bu dilimi izleyen sunum işi aşağıdaki sarı gezinme ve ses uygulamasıdır.
  Bu değişiklikler commit/push edilmedi; canlı env/tarih ve AAB değiştirilmedi.

## UI-07 / AUDIO-01 / AUDIO-02 — yerel uygulama

- Kullanıcı bağlı Android cihaz yerine **yerel kontrollerle ilerlenmesini** istedi.
  Fiziksel hoparlör/kulaklık dinlemesini tamamlanmış sayma; yayın kapısı ayrı kalır.
- [Gezinme matrisi](docs/planning/release-240-navigation-matrix.md): 11 statik geri,
  iki ileri kontrol sahibi; 44×44 sarı yüzey, eski mavi pseudo yüzey/dot kaldırıldı.
  Basılı/klavye odağı/devre dışı durumlar; ödül/rehber TR/EN 320×568 ve 393×852.
  Profil/pano, etkinlik, takım yönetimi ve boş sohbet gerçek dönüşleri yerelde
  test edilir. Mesaj gönderilmez. Her profil penceresinin dört dil/boyut birleşimi
  için ayrı görsel yayın kabulü açık; native geri yöneticisi değiştirilmedi.
- [Modül matrisi](docs/planning/release-240-module-audio-matrix.md),
  [çekirdek matrisi](docs/planning/release-240-core-audio-matrix.md),
  [PCM/hash ölçümleri](docs/planning/release-240-audio-measurements.json).
  Sekiz saldırı WAV’ı ve yedi çekirdeğin 14 WAV’ı sürekli faz/yumuşak uçlarla
  üretildi; genel SFX/müzik kazançları ve rutin 3 ses/420 ms bütçesi korundu.
  Gerçek çekirdek sesi görsel ankraja bağlı kalmaz; tekrar snapshot çift ses vermez.
  Takviye için olmayan atış mekaniği üretilmez.
- `modules/` OGG/AAC alt klasörü ve içerik hash kontrolü; WebAudio diğer codec’i
  WAV’dan önce dener. Üretim web paketi 105 kaynak WAV’ı çıkarır. Gerçek Chromium
  ve Android öykünmesinde 24 cue başlatıldı; OGG hatasında AAC ile çalıştı.
  Dört saniyelik yoğun müzik/savaş render’ı: tepe **0,782059**, kırpılan örnek **0**.
  Windows yerel WebKit AudioContext sunmaz; ses senaryosu burada SKIP, macOS CI
  kapısı etkin. Bu fiziksel iPhone/Android ses kabulü değildir.
- Yerel doğrulama: **774 istemci testi**, **11 paketleme testi**, **2052 Python
  PASS / 47 dış servis SKIP**; son eklenen üretici tekrar üretilebilirlik testi ve
  odaklı eski ses sözleşmesi **4 PASS**. Python taraması **477 dosya / 0 sorun**.
  Son kaynakla tamamlanan tarayıcı senaryoları **14 PASS / 1 yerel WebKit ses SKIP**
  (üç profil; son takım/sohbet kontrolleri ayrı odaklı koşuda doğrulandı).
  Darbe Topu üretici isim çakışması giderildi; master aynı hash ile yeniden üretildi.
  Web derlemesi ve kaynak sürüm koruması geçti; paket etiketi hâlâ **2.3.0**.
- Checklist’te üç sunum işi `branch_ready`: dalda hazır, canlıda yok. Gerçek cihaz,
  dış servis/CI, eski istemci ve S1 yayın kabulü ayrıca tamamlanacak. COMPAT-01
  aktif sürümde sıradaki başlanabilir iş; commit/push, canlı env/tarih ve AAB yok.
