# Android v5 ve ödeme sunucusu — 10 Ekim 2026 yayın kaydı

Durum: **r14 canlı sunucu geçişi tamamlandı; final imzalı v5 Alpha sürümü
Google incelemesinde. Henüz onaylanmadı/testerlara yayımlanmadı.**
Kullanıcı mevcut değişiklikleri commit/push etti ve sunucu güncellemesiyle
birlikte kapalı testin ilk düzeltme APK/AAB'sini istedi. Commit/push yine
kullanıcı tarafından yapılır.

Kullanıcı kısa bakım/taze yedekle r14 ve ardından yalnız Alpha inceleme
gönderimini ayrıca açıkça onayladı; son Play gönderim düğmesine kendisi bastı.
10 Ekim02:04:34TR (`2026-10-09T23:04:34Z`) salt-okunur Edge gözlemi
**Değişiklikleriniz şu anda inceleniyor** ve yalnız Alpha v5'i doğruladı.
Bu gözlem zamanı kesin gönderim zamanı değildir. Yönetilen yayınlama açık:
Google onayından sonra ayrıca yalnız Alpha yayınlama adımı gerekir.
Üretim kanalı/ücretli ürünler/cihaz kurulumu değişmedi.

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

## Play Alpha incelemesi

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

Fiziksel telefon `com.gridshardgame.app` v4/Beta72, Play installer,
ilk kurulum4 Ekim, son güncelleme8 Ekim (önceki bağlı cihaz gözlemi).
Son geçiş kontrolünde USB telefon bağlı görünmedi. Kurulum/veri temizleme yok.
Play App Signing sertifikası upload signer'dan farklı olabilir; v5'i kapalı
testten **güncelle**, kör `adb install -r`/kaldır-kur yapma.

Play'deki10 ürünün etkin satın alma seçeneği0. Savaş Premium standart taslak
Türkiye fiyatı199,99TL doğrulandı; Sezon Geçişi fiyatının taze panel kontrolü
henüz yok. Ürün etkinleştirme ve fiziksel lisans-test alımı yapılmadı.
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
5. **Bekliyor:** Google inceleme sonucu; yönetilen yayınlama nedeniyle ayrıca
   yalnız Alpha v5 yayınlama. Üretim/diğer değişiklikler/ürünler ayrı kapsam.
6. Mevcut profili koruyarak Play'den v5 güncelle; lisans-test satın alma,
   tek teslim/consume/replay ve revoke iade/yeniden başlatma kanıtları.
7. Gerçek ücretli satış yalnız kalan ürün/test/yasal bilgilendirme kapıları
   geçince açılır. Ücretli Google Cloud Billing/kart/free trial/PubSub/RTDN
   yok; mevcut Google proje/API/SA + AWS WIF ve periyodik iade denetimi korunur.

İade yayıncı-hatası inceleme aracı herkese açık HTTP route değildir.
Operatör `--apply` çalıştırmadan gerçek vaka kanıtı/yetki/yedek gerekir;
provider sebep koduyla otomatik muafiyet veya tüm borçları sıfırlama yapılmaz.
