# Android v5 ve ödeme sunucusu — 10 Ekim 2026 hazırlığı

Durum: **imzalı yerel aday hazır; yayımlanmadı, sunucu güncellenmedi.**
Kullanıcı mevcut değişiklikleri commit/push etti ve sunucu güncellemesiyle
birlikte kapalı testin ilk düzeltme APK/AAB'sini istedi. Commit/push yine
kullanıcı tarafından yapılır.

## Kaynak ve yayın kapısı

- Kaynak parent `31b0388480816ada79fc25a34d80b61f840cd65e` GitHub main ile eşleşti.
- [Quality run37996501300](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/37996501300):
  sunucu, istemci, gerçek PostgreSQL/Redis/imaj/restore, tarayıcı ve kaynak
  paketi işlerinin beşi başarılı. Bu run **v4 kaynak** içindir.
- Yeni yerel değişiklik yalnız `config/android-production.json` ve
  `android/app/build.gradle` sürüm kodunu4→5 yükseltir; ek belgeler hazırlık kaydıdır.
  Bu değişikliklerden sonraki **son commit ve onun yeşil CI'sı henüz yok**.
- Yeni APK/AAB commit öncesi adaydır; nihai kaynak ZIP'i, CI, imaj ve artifact
  SHA'larını aynı son commit'e bağlayan release provenance sonraki kapıdır.
  Adayı sessizce commit-temiz nihai paket olarak etiketleme.

## İmzalı yerel aday

`artifacts/android-production-20261010-v5-candidate/` (ignored, Git ile taşınmaz):

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
parent CI gerçek persistence/image/restore işleri ayrı kanıttır.

Canlı salt-okunur audit: r13 healthy, image
`sha256:3064683905f36f88c8aded85c0a27d2be900ad84ac622ed6ec59405ed30fd4d1`;
Google billing auth/package/WIF ayarları boş, purchase test0, RTDN boş.
Mevcut dört Compose katmanı ve reklam/PGS/inceleme ayarları korunur.
Canlıya opt-in WIF/polling katmanları henüz uygulanmadı.

Fiziksel telefon `com.gridshardgame.app` v4/Beta72, Play installer,
ilk kurulum4 Ekim, son güncelleme8 Ekim. Kurulum/veri temizleme yapılmadı.
Play App Signing sertifikası upload signer'dan farklı olabilir; v5'i kapalı
testten **güncelle**, kör `adb install -r`/kaldır-kur yapma.

Play'deki10 ürünün etkin satın alma seçeneği0. Savaş Premium standart taslak
Türkiye fiyatı199,99TL doğrulandı; Sezon Geçişi fiyatının taze panel kontrolü
henüz yok. Ürün etkinleştirme ve fiziksel lisans-test alımı yapılmadı.
Kapalı test tek başına lisans-test güvencesi değildir: ödeme onayından önce
test hesabı, test satın alması ibaresi ve test kartı doğrulanmalı.

## Devam sırası

1. Sürüm5 kaynakları ve bu hazırlık belgeleri kullanıcı commit/push.
2. Son HEAD/remote eşleşmesi, o commit'in beş CI işi ve paket SHA/provenance.
3. Aynı kaynağın yalıtılmış imaj/PG17/Redis, mevcut AWS WIF/Play salt-okunur
   provası; oyuncu verisi ve sahte ödül kullanmadan doğrulama.
4. Taze yedek/geri dönüş planı ve geçiş kapsamını kullanıcıya göster;
   onaylı eşleşen sunucu–AAB kapalı-test geçişi. Kısa bakımın oyuncu etkisini bildir.
5. Mevcut profili koruyarak Play'den v5 güncelle; lisans-test satın alma,
   tek teslim/consume/replay ve revoke iade/yeniden başlatma kanıtları.
6. Gerçek ücretli satış yalnız kalan ürün/test/yasal bilgilendirme kapıları
   geçince açılır. Ücretli Google Cloud Billing/kart/free trial/PubSub/RTDN
   yok; mevcut Google proje/API/SA + AWS WIF ve periyodik iade denetimi korunur.

İade yayıncı-hatası inceleme aracı herkese açık HTTP route değildir.
Operatör `--apply` çalıştırmadan gerçek vaka kanıtı/yetki/yedek gerekir;
provider sebep koduyla otomatik muafiyet veya tüm borçları sıfırlama yapılmaz.
