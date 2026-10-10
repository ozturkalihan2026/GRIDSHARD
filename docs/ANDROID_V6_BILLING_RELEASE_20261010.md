# Android v6 — Billing bağlantı sıralaması ve güvenli ürün tanılaması

Yeni 23:03 TR: Kullanıcı onayıyla **yerel aday** season-rewards-v1 recovery ve
TR/EN Terms taslağı hazır. 1410 sunucu PASS /41 skip,293 istemci PASS,24 build/site
PASS; yeni2SQL test CI'da, yerel DB yok. Defaultlegacy; yeni satın alma
verifiedtime/UTCcutover/pre-checkout consent kapılı. Legacy/Uç geçmiş test
korunur. Canlı değişiklik, commit/push veya yeni AAB yok. Bu v6 AAB aday
değişikliklerini içermez: sonraki istemci paketi ve kapalı test gerekir.
docs/PREMIUM_REFUND_POLICY_V1_DRAFT_20261010.md ve
test-results/premium-recovery-candidate-20261010.json güncel kaynaklardır.

Önceki22:22 TR: Kullanıcı iade sonrası normal reopen/pasif sezon geçişi/
1110Akı-5476kredi/mağaza normal teyit etti. READ ONLY22:22 aynı history1/
refunded/hakfalse/claimed17; sonraki doğal scan21:53 seen1/applied0.
Mevcut politika iade akışı geçti fakat premium ödülleri tutma suistimali açık.
Kaynak makbuza bağlı premium claim+sandık geri alma önerisi politika onayı
bekler. Kod/Terms/canlı bakiye değişmedi; geçmiş Uç testine retro-kesinti yok.
Bu açık çözülmeden üretim hazırlığı tamamlandı sayılmaz. Kanıt:
test-results/billing-v6/season-pass-refund-uc-20261010.json.

Önceki 20:24 TR: Uç ücretsiz sezon geçişi iadesi Google GET exact-match1 ve
20:23:51 doğal scan seen1/applied1 ile doğrulandı. 20:24:24 READ ONLY:
sezon hakkıfalse, tek makbuz/ledger refundedtrue, history1/Google voided
işlenmiş. Alınmış17 tier/1110Akı/5476kredi ve Savaş Premium false korundu.
İade sonrası telefon normal reopen ve sonraki doğal scan idempotency bekler;
forced replay/manual scan/restart/yeni ödeme veya bakiye-hak write yok.
Kaynak/CI/AAB/politika aynı. Kanıt:
test-results/billing-v6/season-pass-refund-uc-20261010.json.

Önceki20:14TR: V6 Uç sezon geçişi test alımı/consume/normal reopen geçti. Tek
test makbuzu+eşleşen ledger/haktrue/current stored sezon grant eşitliği;
Console test siparişi RAM exact-matchtrue.1110Akı/5476kredi/claimed17 kalıcı.
Baseline842/1456/claimed0; ödül almadan izole test şartı korunmadı. Forced
replay değildir; iade henüz açık, Savaş Premium hakfalse/makbuz-ledger0.
Agent ödeme/iade/scan/deploy veya bakiye/hak write yapmadı; source/CI/AAB aynı.
Kanıt test-results/billing-v6/season-pass-purchase-uc-20261010.json.

Önceki20:04TR: Kullanıcı Terms ZIP+Save'i tamamladı; Cloudflare Success/Production
b92f1b0b ve gridshardgame.com HTTPS11/11 route200/byte/SHA/header adaya eşit.
20:02:55TR ADB tek cihaz/Play/versionCode6;20:01TR iki current-process güvenli
native query code0/fetched10/unfetched0.10 ürün sorgusu geçti; tek tek UI
fiyatları veya premium teslim/iade PASS değildir.20:04TR Uç premium baseline
iki hakfalse/iki makbuz ve ledger0/842Akı/1456kredi. Kullanıcı sezon geçişi
checkout test kartı+no-charge uyarısını teyit etti; yeni screenshot yok.
Final alımı insan tamamlayacak; agent ödeme/yeni AAB/deploy/Google ayarı yok.
Kanıtlar terms-production-live-20261010.json/device-all-products-v6-20261010.json/
premium-pre-purchase-uc-20261010.json. Kaynak/CI/AAB pinleri aynı.

Önceki katalog takibi18:25TR: Kullanıcı tüm seçenekleri açtı; salt-okunur Google
GET10 ürün/10 ACTIVE doğruladı. Her birinde tek standard/legacyCompatible/
TR AVAILABLE; önceki fiyatlar korunuyor.18:23TR v6 native iki query0/1 fetched/
9 unfetched; tüm fiyatların telefonda görünmesi bekleniyor, normal reopen ve
ekran istendi. Premium teslim/iade testi tamamlandı sayılmaz. Kanıt
`test-results/billing-v6/catalog-all-active-20261010.json`.
Yeni ürün write/ödeme/deploy/AAB yok; onaylı Terms adayı hâlâ yayımlanmadı.

Önceki17:58 durum: **a451221 exact-commit CI ve final paket auditi geçti. Kullanıcının
17:53TR salt-okunur ADB canonical/versionCode6/Play kurulumunu doğruladı.
Güncel native query code0/fetched1/unfetched9; kullanıcı120Akı29,99TL ve
838/1404 korunuyor teyidi verdi. V6 temel kurulum/mağaza geçti; Ön lansman
Genel bakış boş, rapor sonucu yok. Yeni genel üretim statüsü bağımsız açılmadı.
Uç hesabında ücretsiz120 Akı test
makbuzu/+120 grant/consumed sunucuda doğrulandı. Normal kapat/aç sonrası
832 bakiye korundu (kullanıcı teyidi). Sonrasında aynı ücretsiz test iadesi
13:55TR kalıcı doğrulandı:838→718/debit120/tek history; cihaz718 kullanıcı
teyidi. Sonraki doğal taramalarda seen1/applied0/tek kesinti doğrulandı.
Reddedilen ve bekleyen→iptal denemeleri grant oluşturmadı. Yavaş-onay testinde
beklerken718, onay sonrası tek yeni test makbuzu/grant120/consume ve838;
normal kapat/aç sonrası838/kredi1404 ve mağaza normal doğrulandı.
Zorlanmış live replay/yeni v6 alım-consume testi ve tüm bağlantı yarışlarının
cihaz kanıtı yok; tek başarılı v6 ürün query'si ayrıca kaydedildi.**

## Üretim hazırlığı takip kaydı — 10 Ekim

17:58TR takip:17:53 ADB v6/Play kurulumunu doğruladı; cihaz update17:11:39.
Güncel process/tag-only17:51 query0/fetched1/unfetched9 ve9 allowlisted
SKU product-level status3 PRODUCT_NOT_FOUND. Bu global BillingUnavailable3
değil; önceki draft katalogla uyumlu çıkarım, provider yeniden okunmadı.
Kullanıcı120Akı29,99TL/bakiyeler aynı838/1404 teyidi. V6 temel mağaza geçer;
önceki ödeme testleri v6'ya yeniden atfedilmez. Ön lansman Genel bakış17:55
boş;17:57 Ayarlar no credentials/deep link3boş/özel dil-script yok. Exact
neden bilinmiyor; lab kapasitesi etkileyebilir. Yeni AAB/upload/ayar yazması
gerekli olduğu kanıtlanmadı, yapılmadı. Kanıtlar
`test-results/billing-v6/device-v6-store-check-20261010.json` ve
`test-results/billing-v6/prelaunch-report-status-20261010.json`.

Önceki17:12TR kullanıcı v6 güncellemesi geldi dedi. Güncelleme bulunabilirliği
kurulum tamamlandı anlamına geçirilmez; USB cihaz0/version kontrolü yok.
Play güncellemesi+USB bağlantısı, ardından ödeme yapmadan mağaza fiyat/bakiye
ve güvenli native query kontrolü bekliyor. Agent install/clear/launch yapmadı.
Kanıt `test-results/billing-v6/v6-update-availability-20261010.json`.

17:04TR takip:16:51 ve17:00 dar READ ONLY, önceki iadenin doğal sonraki
scan'lerinde seen1/applied0/history1/debit120 ile ikinci kesinti olmadığını
doğruladı. Always-denied ekranı sonrası yeni grant yok718/1404.16:58 pending
ekranı ve kullanıcı iptal bildirimi sonrası yeni grant yok718/1404; mağaza normal.
Yavaş-onay17:01 ekranı/17:02 no grant tanığı;17:03 tek yeni test makbuzu,
grant120/consumed=true/refunded=false/order/sahip eşleşmesi;838/kredi1404.
Normal reopen kullanıcı teyidi ve17:03:58TR READ ONLY aynı tek yeni kayıt ve
bakiye. İki yavaş alımı kullanıcı başlattı; ön-onay kart/no-charge ekranı
görülmedi; başarılı makbuz test=true doğrulandı. Pending sırasında restart
ve forced replay iddiası yok. Ek51 yerel refund/policy/reconciliation testi geçti.
USB16:52 yetkili cihaz0; v6 cihaz sürümü doğrulanmadı. Kanıtlar
`test-results/billing-v6/refund-repeat-and-decline-uc-20261010.json` ve
`test-results/billing-v6/pending-tests-uc-20261010.json`.

Önceki13:55TR iade takibi: Kullanıcı aynı ücretsiz120Akı test siparişini iade etti;
ekran refunded/toplam0,00TRY, bağımsız WIF Voided Purchases GET hak geri alma
kaydını doğruladı. Normal13:53:46TR taraması seen1/applied1;13:55:21TR
READ ONLY makbuz/defter refunded=true,eventseen=true,tek history/debit,
refund_effect flux838→718/debit120/waived0. Devre Kredisi1404 korundu;
kullanıcı cihaz718 bildirdi. İlk uçtan uca iade akışı geçti; sonraki doğal
taramada ikinci kesinti yok canlı kanıtı bekliyor. Son mesajda restart eylemi
açıkça belirtilmedi. Agent canlı write/yeniden iade/manuel worker/AAB rebuild yok.
Güvenli ignored kayıt:`test-results/billing-v6/refund-uc-server-applied-20261010.json`.

Dashboard12 katılımcı/1 gün;14 günlük koşul tamamlanmadığı için üretim
başvurusu kapalı. Uygulama içeriği bekleyen0/tamamlanan10 beyan gösteriyor.
Yeni odaklı preflight99 backend+17 client+26 site/saklama,30 yerel görünüm
kontrolü geçti. R14/Google iade polling/checkpoint sağlıklı; yalnız120Akı
ACTIVE/diğer9 DRAFT, iki premium199,99 TL. Exact CI5/5 ve AAB hash tekrar aynı.
Yerel Terms giriş/tarih düzeltmesi ayrı site adayıdır; onaylı14 madde ve
oyun kodu değişmedi. Henüz site yayını yok; bu düzeltme yeni AAB gerektirmez
ve mevcut v6/source freeze içinde değildir. Yedek üretimi/hata bildirimi,
diğer ürün/premium test kapsamı ve v6 cihaz/rapor kapıları açık. Ücretsiz
120Akı temel ret/pending/teslim/normal reopen ve ilk iade/tekrar scan kanıtları
yukarıda tamamlandı; tüm ürünlerde tüm hata senaryoları anlamına gelmez.
Detay: [Üretim kontrol kaydı](PRODUCTION_READINESS_20261010.md).

Kullanıcı, bağlantı çakışmasının düzeltilmesini, güvenli ürün-bazlı hata
tanılamasının eklenmesini ve yeni AAB hazırlanmasını onayladı. Bu onay
yayınlama, diğer ürünlerin etkinleştirilmesi, sunucu geçişi veya veri silme
yetkisi değildir. Commit/push kullanıcı tarafından yapılır.

## Uç hesabı — ücretsiz test alımı, 10 Ekim 12:49 TR

- Paylaşılan Google Play ödeme ekranı 120 Akı / 29,99 TL, "Test kartı, her
  zaman onaylanır" ve ödeme alınmayacağı test uyarısını gösterdi. Kullanıcı
  işlemin onaylandığını, oyuna dönüldüğünü ve +120 Akı geldiğini bildirdi.
- 12:56:44 TR pinned-host SSH üzerinden yalnız Uç/flux_120 ve 12:40 sonrası
  alımlar için PostgreSQL READ ONLY transaction/timeout/rollback kullanıldı.
  Tek makbuz ve tek defter kaydı: purchased_at 12:49:24 TR, google_play,
  environment=test, test=true, grant flux_shards/120, consumed=true. Sahip ve
  grant eşleşti; refunded=false, token digest varlığı boolean. Akı bakiyesi832.
- Tüketim sunucudaki kalıcı bayraktan doğrulandı; bu denetimde doğrudan Google
  purchase GET, consume POST, canlı receipt replay, iade veya yeni alım yok.
  Ham hesap/order/token kimliği çıktı veya dosyaya alınmadı. İlk Docker
  salt-okunur sorgu erişimi yetki gerektirdi; aynı sorgu sudo ile tamamlandı,
  izin/yapılandırma değiştirilmedi.
- Normal kapat/aç sonrası bakiyenin832 kaldığı kullanıcı tarafından teyit edildi.
  Bu normal reopen kanıtıdır; doğrudan canlı receipt replay testi yapılmadı.
  Son cihaz bildirimi v5; bu alımdan v6 queue etkisi çıkarılmaz. V6 Play Store
  güncellemesi ve versionCode6 ayrı doğrulanmalı. Diğer9 aktive edilmedi;
  son bağımsız katalog durumu DRAFT. Build/CI/hash freeze kayıtları korunur.

Ignored kanıt: `test-results/billing-v6/test-purchase-uc-20261010.json`.

## Önceki cihaz ve yayın bildirimi — 10 Ekim, 12:43 TR sonrası

- Kullanıcının yerel APK yükleme denemesi paket çakışmasıyla başarısız oldu.
  Read-only ADB v5/canonical/Play installer'ı doğruladı; son update08:41:10TR.
  Kurulu base APK'nin public signer SHA256'sı
  `096acd185957467cb92592007412c319b642ba3ceec4dbcb8ed7a648213ca0e6`
  (kayıtlı Play deployment sertifikası); yerel v6 upload signer'ı
  `03a45c5928f24b5d79dca8731cc554c22488e2c4b182a2e7da39e3c323f61f88`.
  İmzalar farklıdır; yerel upload-key APK mevcut Play kurulumuna uygun
  güncelleme değildir. Ham Android install error kodu elde edilmedi; agent
  tekrar install denemedi, kaldırma/veri silme veya key/package değişimi yapmadı.
- Kullanıcı daha sonra v6 AAB'yi Play'e gönderip yayımladığını bildirdi.
  Bu insan beyanıdır; agent upload/publish yapmadı, konsol durumu yeniden
  doğrulanmadı. Final build/audit/provenance dosyaları yayın öncesi freeze
  kayıtlarıdır; sonraki kullanıcı yayını bunların hash/source pinlerini değiştirmez.
- Telefon hâlâ v5 iken kullanıcı120 Akı satın alma tuşunun29,99 TL ile aktif
  olduğunu bildirdi. UI/native query bağımsız teyit edilmedi; fiyatın dönmesini
  v6 bağlantı düzeltmesine atfetme. Önceki boş query'nin kesin alt nedeni açık.
- Şimdi Google ödeme ekranında test uyarısı + ücretsiz test ödeme yöntemi
  doğrulanmalı. Fiyat görünmesi veya lisans-listesinde bulunma tek başına
  ücretsiz işlem kanıtı değildir. Bu kapıda son ödeme onayı yok; hesap/kart/
  token/ham ödeme logu paylaşılmamalı. Sonra Play Store üzerinden v6 update
  ve güvenli GridshardBilling tanılaması; uygulama kaldırma/veri silme yok.

Ignored kanıt: `test-results/billing-v6/device-signature-and-price-status-20261010.json`.
[Play imzalı APK ve upload key ayrımı](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en).

## Değişiklik ve sınırlar

- `client/src/native-store.js`: Android fiyat sorgusu, satın alma kurtarma,
  satın alma penceresi ve tüketme çağrıları native promise tamamlanana kadar
  aynı kuyrukta tutulur. Hata/iptal kuyruğu serbest bırakır; bekleyen native
  işlem sürerken sıradaki işlemi başlatacak JS timeout kullanılmaz.
- Satın alma, sırası geldiğinde güncel fiyat/teklifi tekrar doğrular. Eksik
  fiyatla ödeme, otomatik onay/tüketim veya istemci tarafından ürün verme yok.
  Önceki hesap bağlama, makbuz filtreleri ve sunucudan doğrulama korunur.
- `tools/configure-native-billing.js` ve Java şablonu: native-purchases
  **8.8.1 / Billing Library 9.1.0** için tam eşleşmeli, idempotent tanılama
  hazırlığı. Sürüm/şablon sapması hata verir. pnpm hard-link dosyasını yerinde
  değiştirmek yerine workspace entry atomik değiştirilir; paylaşılmış store
  inode'u korunur. Android sync sonrasında yeniden uygulanır.
- Yeni `GridshardBilling` tanılaması yalnız sayısal query kodu/sayıları ve
  10 bilinen INAPP ürün kimliğinin `UnfetchedProduct` status kodunu loglar.
  SDK serbest debug metni, hesap/offer/purchase token, makbuz veya fiyat
  okunmaz/yazılmaz. Bu, tüm üçüncü taraf vendor loglarının temizlendiği
  anlamına gelmez; cihazdan yalnız güvenli tag/alanlar okunmaya devam edilir.
- Android `versionCode` **6**; `versionName` **2.1.0-beta.72** ve canonical
  `com.gridshardgame.app` korunur. Sunucu/PGS/Ads kimlikleri, fiyatlar,
  ödeme sağlayıcısı, refund politikası veya oyuncu verileri değişmedi.
- Diğer 9 ürün DRAFT kalır. Son read-only katalog kanıtı 09:50:36 TR:
  yalnız `gridshard.flux_120` / standard / Türkiye / 29,99 TL ACTIVE.

## Kanıt ve belirsizlik

V5 cihazda 09:56:06 TR ürün sorgusu/kurtarma çakışması, bağlantı kapanması,
setup timeout ve `-1/SERVICE_DISCONNECTED` görüldü. Ancak 09:56:56.770 TR
çakışma görülmeyen query de 0/OK ve fetched0 döndü. Dolayısıyla kod kusuru
düzeltildi, fakat 120 Akı fiyat yokluğunun kesin tek nedeni veya yeni sürümde
telefon sorununun çözüldüğü henüz doğrulanmış değildir. Yeni neden kodları
telefon v6 ile güncellendikten sonra alınabilir; v5'e server-only geçiş yetmez.
[Google Billing ürün sorgusu ve hata kodları](https://developer.android.com/google/play/billing/integrate).

## Yerel doğrulama

- Odaklı fiyat/kuyruk/tanılama: **16/16 geçti**, atlama yok. Native callback
  ömrü, kurtarma/fiyat/tüketme çakışmaları, iptal, hata sonrası kuyruk devamı,
  eski fiyatla ödeme engeli, listener içinde tüketme ve iOS fiyat sıralaması.
- Tam istemci: **284/284 geçti**, atlama yok. Java helper ayrıca stub API ile
  javac/JVM'de çalıştı; bilinmeyen ID veya SUBS hata ayrıntısı yayımlamadı.
- Üretim web paketleme sözleşmeleri: **9/9 geçti**. Sandbox hard-link/rename
  izin hataları normal yerel test ortamında yeniden çalıştırılarak ayrıldı;
  başarısız ilk koşular gizlenmedi ve ürün hatası diye etiketlenmedi.
- JDK21+/SDK36 ile offline `assembleRelease bundleRelease`: **BUILD SUCCESSFUL**.
  Gerçek Billing9.1.0 API'siyle Java helper derlendi; `lintVitalRelease` geçti.
  Ek tam Billing modülü lint'i offline eksik sabit test bağımlılıklarına takıldı;
  normal Gradle repository erişimiyle tekrar **başarılı** tamamlandı. XML raporu:
  **0 hata, 3 uyarı**, yeni Java helper'da **0 bulgu**. Uyarılar
  AndroidGradlePluginVersion, GradleDependency, NewerVersionAvailable;
  bu kapsamda bağımlılık yükseltilmedi. FlatDir uyarıları da mevcut.
  Kanıt: aday klasöründeki `billing-lint-release.xml`.
- Audit: mevcut upload sertifikasıyla APK/AAB imzaları doğru; her pakette
  **74 web asset** dist ile SHA eşleşiyor ve **9 yerel font** var. Doğru HTTPS
  API, debug/remote web URL kapalı, private review materyali ve reklam-kimliği
  izinleri yok; Firebase otomatik init kapalı.
- Her iki pakette kuyruk kodu ve native tanılama sınıfı/tag'i ayrıca bulundu.
  Manifest gömülü; bundle manifest kimliği/sürüm kodu6 bağımsız doğrulandı.
- V5 APK/AAB SHA'ları önceki pinlerle aynı; dosyalar korunuyor.

## Final kaynak sabitlemesi — 10 Ekim 2026, 10:39 TR

- Kullanıcı commit/push yaptı: `a45122176ea8c81ebd2de2f92052c884d9bad1ff`
  (`beta 72 v6 fix`). Build öncesi ve build/audit sonrası çalışma ağacı temiz.
- [Quality run38034762931](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/38034762931):
  push/main, attempt1, aynı head SHA, completed/success. Beş iş başarılı:
  Server contracts, Client contracts, PostgreSQL/Redis/production image,
  Startup/mobile layout/two-client reconnect ve Reproducible source package.
- Sekiz app/tool/Java template/test/config fingerprint'i testli adayla ve
  commit'ten oluşturulan kaynak ZIP'iyle eşleşti. ZIP: 961 kaynak dosyası +
  RELEASE_MANIFEST.json; manifest kaynak commit'i doğru, runtime oyuncu verisi yok.
- Final offline incremental Gradle build: **22 sn / BUILD SUCCESSFUL**, 378
  task (35 executed,343 up-to-date). Sync tanılamayı idempotent hazırladı;
  lintVitalRelease geçti. Aynı kaynak için önceki tam lint raporu aynen korundu;
  yeniden tam lint çalıştırılmış gibi sunulmaz (0 hata/3 uyarı/helper0 bulgu).
- Final imza/assets/font/güvenlik auditi ve iki pakette queue/native sınıf/tag
  kontrolü geçti. APK kimliği ve okunabilir bundle manifest versionCode6 doğrulandı;
  APK/AAB'nin kendi manifestleri gömülü. XML ayrı Play yüklemesi değildir.
- APK/AAB byte'ları testli adayla aynı. Final doğrulama farklı kaynak kodu
  üretmedi; commit, clean kaynak ve exact CI kanıtını sabitledi. V5 hashleri
  yeniden doğrulandı ve dosyaları korunuyor. Sunucu r14 değişmedi.
- Bu kayıt/checkpoint/devir/yayın notları kaynak arşivi ve final build/audit
  sonrasında güncellendi; post-freeze operasyon notu değişiklikleri app kaynağı
  veya final paket içinde varmış gibi gösterilmez. Agent commit/push yapmadı.

Final klasör: `artifacts/android-production-20261010-v6`.

| Dosya | Byte | SHA256 |
| --- | ---: | --- |
| `GRIDSHARD-2.1.0-beta.72-v6.apk` | 28294148 | `3702ae9534abb3f36df59d861440eec3c2bbb0b5b06525cdaa41a40e20dc976c` |
| `GRIDSHARD-2.1.0-beta.72-v6.aab` | 27687251 | `aba0023e3b36f0b007814766efd2af4b0b8e2346194e74ee32791e4821124beb` |
| `GRIDSHARD-2.1.0-beta.72-signatures-social.zip` | 83457166 | `c505db1d1167d1943c9ebe0817f3126ca1305f61368b2a3be1b93d09e74544ab` |

`release-audit.json`, `release-provenance.json`, `billing-lint-release.xml` ve
`AndroidManifest.bundle.xml` final klasörde. Exact commit CI, kaynak ve hash
pinleri provenance'da. V6 upload/yayın/cihaz kurulumu yok; diğer9 ürün DRAFT.
120 Akı cihaz fiyatı/test banner/ücretsiz alım/teslim/consume/replay/iade henüz
doğrulanmadı. Cloud Billing veya ödeme sağlayıcısı değişmedi.

## Önceki yerel aday dosyalar

Klasör: `artifacts/android-production-20261010-v6-candidate`.

| Dosya | Byte | SHA256 |
| --- | ---: | --- |
| `GRIDSHARD-2.1.0-beta.72-v6.apk` | 28294148 | `3702ae9534abb3f36df59d861440eec3c2bbb0b5b06525cdaa41a40e20dc976c` |
| `GRIDSHARD-2.1.0-beta.72-v6.aab` | 27687251 | `aba0023e3b36f0b007814766efd2af4b0b8e2346194e74ee32791e4821124beb` |

`release-audit.json`, `release-provenance.json` ve okunabilir
`AndroidManifest.bundle.xml` aynı klasörde. XML ayrı Play yüklemesi değildir.
Çalışma ağacı aday build'de kirliydi; kaynak HEAD
`0db145d26c2576f0ba801acf0e324fde3b5bf051` yeni app değişikliklerini içermez.
Önceki a309 CI başarısı bu adayın exact-commit CI kanıtı değildir.

## Sonraki kapılar

1. **Tamamlandı:** kullanıcı commit/push, exact-commit CI, clean kaynak/ZIP
   fingerprint karşılaştırması ve final rebuild/audit. Agent commit/push yapmaz.
2. **Kullanıcı bildirimi:** v6 AAB Play'e gönderildi/yayımlandı; agent işlem
   yapmadı ve konsol bağımsız doğrulanmadı. Aynı upload/yayını tekrar yapma.
3. **Tamamlandı17:53TR:** cihaz versionCode6/Play installer; güvenli tek native
   query0/fetched1 ve kullanıcı120Akı29,99/bakiye838/1404 teyidi. Yerel
   upload-key APK/kaldırma/veri silme yapılmadı.
4. Önceki120Akı ücretsiz ret/pending/teslim/consume/normal reopen/iade/tekrar
   scan kanıtları korunur; bunlar v6'ya tekrar atfedilmez. Yeni v6 satın alma
   veya forced replay yok. Her yeni alımda test banner+ücretsiz yöntem kapısı.
5. Ön lansman sonucu henüz yok; Ayarlar okunmuş, exact cause bilinmiyor.
   Güncel vitals/gerçek cihaz savaş QA ve diğer üretim kapıları açık.
