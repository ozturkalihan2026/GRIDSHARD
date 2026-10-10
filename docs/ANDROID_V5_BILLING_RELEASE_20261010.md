# Android v5 ve ödeme sunucusu — 10 Ekim 2026 yayın kaydı

Yeni dar Billing düzeltmesi ve sürüm kodu6 yerel adayı hazır; kullanıcı
commit/push + exact yeni CI bekleniyor. V5 dosyaları/pinleri ve cihaz kurulumu
değişmedi. Bu dosyadaki v5/frozen a309 yayın kaydı yeni adaya uygulanmaz.
Güncel durum: [Android v6 kayıt](ANDROID_V6_BILLING_RELEASE_20261010.md).

Durum: **r14 canlı; kullanıcı Alpha yayını bildirdi. Play kurulumlu v5
telefonda doğrulandı; yalnız 120 Akı satın alma seçeneği ACTIVE, kalan9 DRAFT.**
Kullanıcı mevcut değişiklikleri commit/push etti ve sunucu güncellemesiyle
birlikte kapalı testin ilk düzeltme APK/AAB'sini istedi. Commit/push yine
kullanıcı tarafından yapılır.

Kullanıcı kısa bakım/taze yedekle r14 ve ardından yalnız Alpha inceleme
gönderimini ayrıca açıkça onayladı; son Play gönderim düğmesine kendisi bastı.
10 Ekim02:04:34TR (`2026-10-09T23:04:34Z`) salt-okunur Edge gözlemi
**Değişiklikleriniz şu anda inceleniyor** ve yalnız Alpha v5'i doğruladı.
Bu gözlem zamanı kesin gönderim zamanı değildir. Yönetilen yayınlama açık:
Google onayından sonra ayrıca yalnız Alpha yayınlama adımı gerekiyordu.
Bu, önceki aşamanın tarihçesidir. Kullanıcı daha sonra yayımladığını bildirdi;
10 Ekim sabahı USB canonical v5/Play installer doğrulandı. Edge şu an bağlı
olmadığından güncel kanal/yönetilen yayınlama konsol durumu bağımsız yeniden
görülmedi. Agent üretim kanalı/ürün/cihaz kurulumu değiştirmedi.

## 10 Ekim güncel durum — bağlantı yarışı bulundu, ürün sorgusu hâlâ boş

Son güvenli cihaz logları: 09:56:06.630/631 TR `getProducts` ve `getPurchases`
beraber başlıyor; ürün sorgusu devam ederken ortak BillingClient kapatılıyor.
09:56:11.650 setup timeout ve 09:56:12.667 setup `-1/SERVICE_DISCONNECTED`
görüldü. `loadStoreState` paralel fiyat/kurtarma çağrıları yapıyor; eklentinin
single-thread executor'ı asenkron sorgu callback ömrünü sıralamıyor. Mevcut
storePriceFlight kilidi yalnız fiyat sorgularını koruyor. Bu somut güvenilirlik
kusuru, kaynağa ve cihaz zaman çizelgesine dayanıyor.

Ancak 09:56:56.770 TR logda kurtarma çakışması olmayan sorgu da setup/query
0/OK ve fetched0 döndü. Boş listenin tek veya kesin nedeni henüz bilinmiyor.
V5 eklentisi `UnfetchedProduct` neden kodlarını aktarmıyor; Google bu kodlarla
ürün-bazlı sorgu başarısızlığının ayrılmasını destekliyor.
[Google Billing entegrasyon belgesi](https://developer.android.com/google/play/billing/integrate).

Önerilen sonraki adım dar bağlantı sıralaması düzeltmesi + yalnız bilinen
ürün ID/nümerik neden kodu içeren tanılama; kapsam onayı bekleniyor. App/native
kodu henüz değiştirilmedi. Değişiklik telefona yeni testli APK/AAB ve kullanıcı
commit/push, yeni CI, Alpha yayın kapılarıyla gider; server-only geçiş yetmez.
Diğer9 ürün DRAFT kalır; satın alma/test banner doğrulaması henüz yapılmadı.
Önbellek temizliği yapıldığı açıkça teyit edilmedi. Veri silme/kurulum/hesap
değişimi, yeni build/deploy veya ödeme onayı yok. Frozen pinler değişmedi.
Güvenli kanıt `test-results/billing-v5/device-billing-empty-products-20261010.json`.

## 10 Ekim önceki tanılama — 120 Akı etkin ama SDK ürün listesi boş

Kullanıcı120 Akı telefonda hâlâ kullanılamıyor dedi. Read-only ADB canonical
Play kurulumlu v5/Beta72 ve Play Store53.4.34 doğruladı. Yalnız oyun işlemindeki
bounded logcat güvenli zaman/kod/sayı alanlarına indirildi; ham log veya
token/hesap bilgisi yayımlanmadı.09:48:00 ve09:48:12TR sorgularında doğru
`gridshard.flux_120`/`inapp`, setup **0/OK**, query **0/OK**, fetched **0**.
Bu, fiyatın JS filtresine ulaşmadığını gösterir; alt sebebi tek başına çözmez.
Eklenti UnfetchedProduct neden kodlarını loglamıyor.

Yeni mevcut WIF read-only katalog GET200 kontrolü09:50:36TR:
yalnızflux120 ACTIVE/standard/legacyCompatible true/tek TR AVAILABLE/2999
kuruş; diğer9 DRAFT. Kullanıcı Play etkin ülkesini Türkiye diye teyit etti,
SDK storefront/ödeme hesabı bağımsız doğrulanmadı. Metadata yayılımı/önbellek
veya hesap/teklif uygunluğu henüz ayrılmadı; kesin bekleme süresi yok.
Mevcut native fiyat testleri4/4 geçti; fiziksel ücretsiz alım yerine geçmez.

Sonraki dar kullanıcı adımı yalnız Play Store **önbelleğini** temizleyip
Store/oyunu normal açarak mağazayı tekrar sorgulama, sonra güvenli ADB kanıtı.
Play Store/Services/GRIDSHARD verisi silme, kaldır-kur veya hesap/ülke değişimi
yok. Diğer9 ürün aktivasyonu/ödeme onayı yok; oyun/server/Android/node_modules
değişmedi, yeni AAB/build/deploy/agent commit-push yapılmadı. Yalnız ignored
katalog helper güvenli standard/legacy/regional-count alanlarıyla genişletildi.
Ignored kanıt `test-results/billing-v5/device-billing-empty-products-20261010.json`.
[Google ürün sorgusu ve UnfetchedProduct açıklaması](https://developer.android.com/google/play/billing/integrate).

## 10 Ekim önceki aşama — yalnız 120 Akı etkin

Kullanıcı, aktivasyonun lisans-test dışındaki Alpha kullanıcılarına gerçek
ücretli satış da açabileceği açıklamasından sonra yalnız **120 Akı / standard /
Türkiye /29,99 TL** kapsamını onayladı. Edge'de işlemi kullanıcı elle yaptı;
paylaşılan ekran `gridshard.flux_120`, `standard`, Türkiye ve **Etkin**.

Yeni mevcut WIF read-only katalog GET **200**:10 ürün/tek sayfa/ürün başına
tek seçenek; yalnız `gridshard.flux_120` **ACTIVE**, TR AVAILABLE /2999 kuruş,
kalan dokuz **DRAFT**. Premiumlar19999 kuruş ve taslak. Kontrol tamamlanma
**10 Ekim09:43:46TR** (`2026-10-10T06:43:46Z`), kesin etkinleştirme zamanı değil.
Publisher write0; agent ürün/teklif/fiyat/ülke değiştirmedi. Ignored kanıt
`test-results/billing-v5/google-catalog-flux120-active-20261010.json`;
eski tüm-DRAFT kanıtı ve frozen source/package/image pinleri korunur.

Sonraki adım telefonda120 Akı29,99TL görünmesi ve Google ödeme penceresindeki
test uyarısı/test ödeme aracı/doğru hesabın görülmesidir. Son satın alma onayı
henüz verilmedi; ücretsiz teslim/consume/replay/iade testi henüz yok. Diğer9
ürün açılmaz; geniş ücretli satış/yasal hazırlık tamamlanmış sayılmaz.
Yeni AAB, server deploy, cihaz install/uninstall/data-clear veya agent
commit/push yapılmadı. Lisans-test hesabı yalnız kullanıcı beyanıyla teyitli.
[Google test ödeme ekranı ve ücret ayrımı](https://developer.android.com/google/play/billing/test).

## 10 Ekim önceki sabah aşaması — yayın sonrası salt-okunur kontrol

- Kullanıcı **yayınladık, telefondaki uygulama güncellendi** dedi. Bilinen
  USB cihaz canonical package/versionCode5/Beta72/min24/target36; installer
  ve initiatingPackage `com.android.vending`. Europe/Istanbul cihaz saatinde
  lastUpdate10 Ekim08:41:10, firstInstall4 Ekim19:55:08. Agent install/
  uninstall/data-clear yok; ilk kurulum korunur. Paket bilgisi oyun içi
  profil/bakiye bütünlüğü kanıtı değildir.
- Taze pinli SSH health r14 exact image/OK, Google scan OK/polling1800s/
  worker-lease/persistence ready/restart0. WIF/nonroot/read-only/Ads/PGS/
  reviewer korunur. Receipt39/39/91 değerleri geçiş baseline'ıdır.
- Kullanıcı mağaza ekranında on üründe **Şu an kullanılamıyor**, fiyat yok.
  Native geçerli fiyat/tek anlamlı offer gelmeden paidProductPrice bu metni
  gösterir ve satın alma kapalı kalır. Fiyatı uydurma veya güvenlik korumasını
  bypass etme; ekran tek başına tüm olası metadata hatalarını ayırmaz.
- Mevcut WIF ile bir publisher katalog GET200: canonical10 üründe birer
  **DRAFT** option/**ACTIVE0**, TR AVAILABLE. İki premium19999 kuruş; dört
  Akı ve dört Devre Kredisi paketi2999/5999/9999/19999 kuruş. Taslak seçenekler
  somut erişim engelidir. İlk helper import yolu API isteğinden önce düzeltildi;
  ignored operator helper dışında uygulama kodu değişmedi. Publisher mutation0.
- Kullanıcı indiren Google hesabının lisans-test listesinde olduğunu teyit
  etti. Bu insan beyanı; bağımsız console/billing banner/test ödeme aracı
  görülmedi. Ücretsiz alım/consume/replay/iade henüz yok; ürünler aktive edilmedi.
  Aktivasyon lisans-test dışındaki Alpha kullanıcılarına gerçek satış açabilir;
  scoped onay ve satış/yasal kapıları gerekir. İlk uygun dar ürün120 Akı;
  toplu on ürünü açma veya gerçek kartla test yapma.
- Kullanıcı HEAD `0db145d26c2576f0ba801acf0e324fde3b5bf051` yalnız dört operasyon
  belgesini commit etti. Frozen build/deploy kaynağıa309; source/image/package
  değişmedi. Agent commit/push, yeni AAB veya sunucu deploy yapılmadı.

Ignored proof: `test-results/billing-v5/device-v5-update-20261010.json` ve
`google-catalog-readonly-20261010.json`. Android provenance güncellendi;
kesin Alpha konsol/yayın zamanı yalnız kullanıcı beyanıyla doldurulmaz.
[Google ürün state tanımı](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.onetimeproducts),
[lisans-test ve gerçek ücret ayrımı](https://developer.android.com/google/play/billing/test).

## Kaynak ve yayın kapısı

- Son kaynak `a3095c33a17cb2b29daa13648cfe495c3c67f51b` GitHub main ile eşleşti.
- [Quality run37998290434](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/37998290434):
  sunucu, istemci, gerçek PostgreSQL/Redis/imaj/restore, tarayıcı ve kaynak
  paketi işlerinin beşi başarılı. Bu run **son v5 commit** içindir.
- Canonical config ve Android Gradle4→5 yükseltmesi bu commit'te mevcut.
  Temiz son kaynaktan APK/AAB yeniden üretildi. Önceki adayla byte-identical
  hash olması doğal; final build, kaynak temizliği ve audit ayrıca doğrulandı.
- Nihai kaynak ZIP SHA
  `5d7b137672f5f708d38c7b70b9fbdb883f0d47a66c9b367f853a2f4dc71eea2c`;
  `artifacts/server-aws-20261010-billing-r14/` içinden taze uzak adayına aktarıldı.
  Kaynak/CI/paket/imajları bağlayan `release-provenance.json` final Android
  dizininde. Daha sonraki operasyon dokümanları frozen oyun kaynağını değiştirmez.

## Final imzalı paket

`artifacts/android-production-20261010-v5/` (ignored, Git ile taşınmaz;
eski v4 ve v5-candidate dizinleri ayrıca korunur):

| Dosya | Byte | SHA256 |
| --- | ---: | --- |
| `GRIDSHARD-2.1.0-beta.72-v5.apk` | 28294068 | `8506b4c6ad0ceb6fd30b4d92d591911bda463332359c1be8fabec3e26516f240` |
| `GRIDSHARD-2.1.0-beta.72-v5.aab` | 27686907 | `46025964f182026f9f8b89c715db31b09bc20dc68c03fcae3b2e7679e6fb66aa` |

- Mevcut upload anahtarı/Windows DPAPI kullanıldı; yeni key/debug imzası yok.
- Sertifika SHA256:
  `03:A4:5C:59:28:F2:4B:5D:79:DC:A8:73:1C:C5:54:C2:24:88:E2:C4:B1:82:A2:E7:DA:39:E3:C3:23:F6:1F:88`.
- JDK21+/SDK36, offline `assembleRelease bundleRelease`: BUILD SUCCESSFUL.
  `lintVitalRelease` geçti; flatDir uyarısı var, hatasız build tam lint kanıtı değildir.
- `tools/audit-android-review-release.ps1 -VersionCode 5` başarılı:
  APK/AAB imzaları, her pakette74 web varlığının dist ile SHA eşleşmesi,
 9 yerel font, doğru HTTPS API, uzaktan web yükleme/debug kapalı,
  özel inceleme verisi/anahtar ve reklam-kimliği izinleri yok;
  Firebase otomatik bildirim/analytics başlangıcı kapalı.
- Kalıcı kimlik `com.gridshardgame.app`, sürüm kodu5,
  sürüm adı `2.1.0-beta.72`, minSdk24/targetSdk36.
- AndroidManifest.xml APK içine otomatik derlenir; AAB'de
  `base/manifest/AndroidManifest.xml` mevcut (33678 byte).
  Bundle derleme manifestinin kimlik/sürümü ayrıca doğrulandı; okunabilir
  kopyası `AndroidManifest.bundle.xml`. Bu kopya ayrıca Play'e yüklenmez.
- Billing köprüsü `@capgo/native-purchases`8.8.1, Billing Library9.1.0;
  mevcut PGS/Ads kimlikleri ve güvenlik kapıları değişmedi.

## Test ve canlı durum

Yerel sunucu1344 geçti/39 altyapı atlandı; istemci272, odaklı ödeme/WIF/politika192,
Python operator/paketleme18 ve Node web/site24 geçti. `release_guard.py` ve
`git diff --check` temiz. Atlanan dış servis testleri yerel başarı sayılmaz;
son exact-commit CI gerçek persistence/image/restore işleri ayrı kanıttır.

Canlı r14 API image:
`sha256:dbc3feee11e514721c43dea5e3228f6393911f585f718618a528d7eac49ccf09`;
bakım image:
`sha256:6d18ddc6fc8e52ccc70dc553ab862fbb6726308decd072408774b71e1e501c77`.
Final kaynak/imajlar10 Ekim01:58:16TR'de canlıya uygulandı; durable executor
exit0. Başarılı geçiş kanıtı aşağıda. Aday provası ayrıca korunur.

Bu imajla gerçek read-only Google WIF + PG17/Redis provası geçti:

- 330s worker lease/kalıcılık/profil ve reviewer-premium korunması.
- İlk açılış, restart ve ayrı boş test hedefi backup/restore sonrası üç başarılı
  gerçek voided-purchase scan; PG checkpoint ilk yeni scan öncesinde birebir korundu.
- Cold cache + zorlanmış yakın-expiry yenilemesi ve financial GET200.
  Bir saat fiilen beklenmedi; elapsed-hour token kanıtı diye etiketleme.
- Publisher write0, token ifşası0, gerçek alım/consume/iade0. Yalnız bu tur
  yaratılan disposable PG/Redis/network temizlendi, yoklukları ayrıca doğrulandı.
- Yeni Linux bağımlılıklarıyla extracted server1342pass/39skip/1 TestClient
  deprecation uyarısı. İki operator QA-report testi bu komutta dışarıda ve CI
  ayrı geçti;39 altyapı atlaması başarı değildir. Son offline deploy guard10pass
  (6 runtime +4 Compose regresyon koruması).

Uzak kanıt `/opt/gridshard/releases/aws-20261010-billing-r14/isolated-verification.json`;
operatör araçları ve source-contracts-proof ignored r14 artifact dizininde.
`deploy.py` **çalıştı ve tamamlandı; yeniden çalıştırma**. Başarı kaydı
`2026-10-09T22:58:16.019439+00:00`; executor exit0. İlk deneme maintenance
profilinin Compose config'te dışarıda kalması nedeniyle preflight'ta, servis
durdurulmadan/yedek aşamasından önce durdu. Operatör `--profile maintenance`
config koruması ve yalnız birebir izinli public-pin/config hazırlığını kabul
eden retry korumaları düzeltildi. Gerçek6 katman config +10 offline test geçti;
ikinci deneme başarılı. İlk denemenin kanıtları silinmedi; uygulama kaynağı
frozena309 olarak kaldı.

Canlı geçiş doğrulamaları:

- Taze aktif maç/websocket0 kapısı ve resource kontrolleri geçti. API dururken
  özel `/var/backups/gridshard-production/20261010-before-billing-r14` yedeği
  alındı; izin/hash/installation/count/archive/pg_restore TOC doğrulandı.
- Eski r13 API/bakım imajları `before-billing-r14-20261010` tag'lerinde tutulur.
  Geri dönüş yalnız eski imaj/config; canlı DB restore/volume deletion yok.
  Özel yedeği mevcut oyuncu DB'si üzerine geri yükleme.
- Fingerprint kontrolü39 profil/39 kimlik/91 savaş/pending0 ve diğer korunması
  gereken verileri doğruladı. Mevcut PG/Redis volume'leri ve Ads LIVE/SSV,
  PGS/reviewer ayarları aynı kaldı; purchase/ad test mode kapalı.
- Altı Compose katman: production/cloudflare/play-games/play-review/
  google-play-wif/google-play-polling. Gerçek10001:10001/read-only rootfs/
  dropALL/no-new-privileges ve WIF read-only mount doğrulandı. Üretim WIF
  dosyası0400/UID10001 ve bilinen SHA ile kuruldu; statik SA anahtarı yok.
- AWS WIF doğrulama ve1800s voided-purchase polling canlı; ilk gerçek Google
  read-only scan başarılı. RTDN boş; ücretli Google Cloud Billing/PubSub yok.
- İç worker/health/polling ve bağımsız dış public HTTPS/TLS/HTML kontrolleri
  ayrı ayrı330s/33 kontrol geçti; origin TLS kendi CA'sıyla, dış TLS normal
  sertifika denetimiyle doğrulandı. Cloudflare bilinen transform'ları hariç
  HTML byte hash final kaynakla aynı. Unsigned SSV403, restart0, kritik yeni
  uygulama log hatası yok. Login/oyuncu verisi isteği yapılmadı.

Özel uzak receipt `/opt/gridshard/releases/aws-20261010-billing-r14/deployment-receipt.json`
(ham veri fingerprint/özel alanları dökme). Yerel güvenli özet
`artifacts/server-aws-20261010-billing-r14/deployment-verified-sanitized.json`;
bağımsız `external-witness.json` ve final Android `release-provenance.json`.
Bu başarı gerçek satın alma/consume/iade testinin yerine geçmez.

## Önceki aşama — Play Alpha incelemesi

Kullanıcı yalnız final v5 Alpha taslağı hazırlama/yüklemeyi onayladı. Edge
dosya erişim izni değiştirilmedi; AAB'yi kullanıcı elle seçti ve **yükledim**
dedi. Play bundle5 kabul edildi; sürüm adı `5 (2.1.0-beta.72)` ve Türkçe
ödeme/iade güvenliği notlarıyla taslak kaydı doğrulandı. Mevcut tester/ülkeler
korundu; önceki v4 yeni bundle setine dahil değil, aktif kanal hâlâ v4.
Sonraki açık kısa bakım/r14 + yalnız Alpha inceleme onayıyla önizleme Kaydet
tamamlandı. Kullanıcı nihai gönderimi kendisi yaptı; panel **Değişiklikleriniz
şu anda inceleniyor** altında yalnız Alpha5 (2.1.0-beta.72) gösterdi.

Önizle ve onayla2/2: yalnız iki uyarı, engelleyici hata ve desteklenen cihaz
kaybı yok. R8/proguard mapping yok (minifyEnabled false, sahte mapping yükleme);
native debug sembolleri tavsiyesi (prebuilt bağımlılıklar). Bu uyarıları
manifest eksikliği sayma. Önizleme kaydedildi ve **incelemede**, publish yok.
Yeni install26.4MB/update3.42MB Play tahmini. Varsayılan Alpha sunumu100%,
bu değer üretim dağıtımı değildir. **Yönetilen yayınlama etkinleştirildi**
korunur; Google onayı otomatik Alpha yayını değildir. Onay sonrasında ayrıca
yalnız v5 Alpha yayınlama gerekir; tüm değişiklikleri topluca yayımlama.

Kanıt: `test-results/billing-v5/alpha-v5-draft-saved.jpg`,
`alpha-v5-preview-awaits-approval.jpg` (önceki aşama) ve güncel
`alpha-v5-review-submitted.jpg`. Edge sekmesi Google sonucu sonrası devam için
handoff bırakıldı. Gönderim gözlemi10 Ekim02:04:34TR; onay/dağıtım tarihi yok.

Önceki fiziksel telefon gözlemi `com.gridshardgame.app` v4/Beta72, Play installer,
ilk kurulum4 Ekim, son güncelleme8 Ekim (önceki bağlı cihaz gözlemi).
Son geçiş kontrolünde USB telefon bağlı görünmedi. Kurulum/veri temizleme yok.
Play App Signing sertifikası upload signer'dan farklı olabilir; v5'i kapalı
testten **güncelle**, kör `adb install -r`/kaldır-kur yapma.

Yeni read-only katalog GET200: Play'deki10 ürünün etkin satın alma seçeneği0,
hepsi DRAFT; **Savaş Premium ve Sezon Geçişi** TR199,99TL. Ürün etkinleştirme
ve fiziksel lisans-test alımı yapılmadı. Taze Alpha konsol ekranı henüz yok.
Kapalı test tek başına lisans-test güvencesi değildir: ödeme onayından önce
test hesabı, test satın alması ibaresi ve test kartı doğrulanmalı.

## Devam sırası

1. **Tamam:** kullanıcı v5 commit/push; exact SHA/remote, beş yeşil CI işi.
2. **Tamam:** final yeniden build/audit/provenance; kullanıcının onaylı Alpha taslağı.
3. **Tamam:** aynı kaynak aday-imaj/PG17/Redis/WIF/Play read-only soak/restart/
   boş-hedef restore; mevcut üretim verileri değiştirilmedi.
4. **Tamam:** explicit r14/Alpha inceleme onayı; taze maç/WS0/resource kapısı,
   özel yedek,6 katman WIF/polling canlı geçişi, fingerprint/runtime korumaları,
   330s iç ve bağımsız dış kontroller; kullanıcı Alpha v5 inceleme gönderimi.
5. **Kullanıcı tamamladı:** Alpha yayın beyanı + Play kurulumlu v5 cihazda
   bağımsız doğrulandı. Güncel kanal/yönetilen yayınlama konsol görünümü
   Edge bağlı olmadığından yeniden okunmadı; yayını tekrar gönderme.
6. **Bekliyor:** oyun içi profil doğrulaması; DRAFT seçenek için ayrı dar
   etkinleştirme kapsamı/yasal satış kapıları; lisans-test banner/test kartı,
   ücretsiz alım/tek teslim/consume/replay/revoke iade/yeniden başlatma kanıtı.
7. Gerçek ücretli satış yalnız kalan ürün/test/yasal bilgilendirme kapıları
   geçince açılır. Ücretli Google Cloud Billing/kart/free trial/PubSub/RTDN
   yok; mevcut Google proje/API/SA + AWS WIF ve periyodik iade denetimi korunur.

İade yayıncı-hatası inceleme aracı herkese açık HTTP route değildir.
Operatör `--apply` çalıştırmadan gerçek vaka kanıtı/yetki/yedek gerekir;
provider sebep koduyla otomatik muafiyet veya tüm borçları sıfırlama yapılmaz.
