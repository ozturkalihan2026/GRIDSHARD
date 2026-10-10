# Android v7 — prospective premium reward recovery

## 10 Ekim 2026, 23:17 TR — aday hazır, final kaynak sabitlemesi bekleniyor

Kullanıcı `1aa1db5d231eb28b0675fac217c4947c0ed8f101` commit/push'unu
tamamladı ve kalan işlemlerin sıralı ilerlemesini onayladı. Agent commit/push
yapmaz. Bu onay test kapılarını atlamak, üretim kanalına geçmek, gerçek ödeme
yapmak, eski Uç ödüllerini kesmek veya canlı veriyi sıfırlamak değildir.

[Quality run 38082575391](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/38082575391)
push/main, attempt1, exact SHA, completed/success: beş iş başarılı. Server
1410 PASS/41 altyapı skip; operator araçları14 PASS/4 skip. Ayrı gerçek
PostgreSQL/Redis persistence/restart işi **63 PASS, skip yok**; yeni premium
claim/chest/refund rollback ve cache reload testleri bu dosya içinde çalıştı.
Production API ve maintenance image build, Caddy validate, yeni konteyner
açılışı/restart/backup-restore smoke geçti. Tarayıcı matrisi24 PASS; iki gerçek
istemci/reconnect3 PASS. Kaynak paketleme işi başarılı. Bu kanıt yereldeki
41skip'i PASS'a dönüştürmez; CI'ın ayrı gerçek altyapı kanıtıdır.

## İmzalı yerel aday

Play'de mevcut v6 korunur. Yeni sürüm için `config/android-production.json`
ve native `android/app/build.gradle` versionCode6→7 değişti. VersionName
`2.1.0-beta.72`, paket `com.gridshardgame.app`, API, PGS/Ads kimlikleri,
mevcut upload anahtarı ve Billing9.1.0/native-purchases8.8.1 korunur.
İade/onay kaynak kodu yukarıdaki testli commit ile aynıdır; yeni metadata
henüz commit değildir. Bu nedenle aday **exact-commit final paket değildir**.

Klasör: `artifacts/android-production-20261010-v7-candidate`.

| Dosya | Byte | SHA256 |
| --- | ---: | --- |
| `GRIDSHARD-2.1.0-beta.72-v7.apk` |28295596|`6922156e42c44e3056dc71c0d888ad626f7b705dbc5d8e94384658ef5238410f`|
| `GRIDSHARD-2.1.0-beta.72-v7.aab` |27688707|`c0094ef294fa92276a27067bcc731e35f0b9389b2616950e11dedff1b11d3b29`|

Offline `assembleRelease bundleRelease`: BUILD SUCCESSFUL/36sn,
378task/54 executed/324 up-to-date; lintVitalRelease geçti. Yeni tam vendor
lint'i çalışmış gibi sunulmaz. İmza/audit PASS, paket başına74 web varlığı
dist ile SHA eşleşmesi,9 embedded font, doğru HTTPS API/debug kapalı,
review sırrı veya reklam-kimliği izni yok/Firebase auto-init kapalı.
AAB'nin kendi protobuf manifest kökü bağımsız okundu: doğru paket,
versionCode7/versionName2.1.0-beta.72. `season-rewards-v1` ve recovered receipt
consent kodu gerçek AAB web paketinde bulundu. Manifest AAB içine gömülüdür;
ayrı XML yüklemesi gerekmez. Parser alanları [AOSP AAPT2 Resources.proto](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/master/tools/aapt2/Resources.proto)
ile karşılaştırıldı; manifest kopyası varmış gibi sunulmaz.

V6 APK/AAB önceki SHA pinleriyle aynıdır; dosyaları korunmuştur. Yerel
upload-key APK mevcut Play-imzalı kuruluma yüklenmedi. Paket çakışmasını
uygulamayı kaldırarak/veri silerek çözmeye çalışma; kapalı test güncellemesi
Play üzerinden kurulmalıdır.

Kaynak bütünlük guard PASS. Version7 metadata ile4 Android toolchain ve24
build/site test PASS. İlk sandbox test girişimi temporary directory erişim
engeline takıldı; aynı testler normal izin/task-temp ile geçti. Ürün hatası
gizlenmedi, testler değiştirilmedi. Aday proof: `release-provenance.json`.

## Sıralı kapılar

1. Kullanıcı mevcut version7 metadata ve bu operasyon kayıtlarını commit/push
   yapar. O exact commit'in tüm CI işleri doğrulanır. Temiz kaynakla final
   rebuild/source archive/audit yapılır; testli kaynak fingerprintleri korunur.
   Adayı final diye yükleme.
2. Mevcut **Kapalı test / Alpha**, tester/ülke ayarlarını koruyarak yeni final
   v7 taslağı. Üretim kanalına geçiş yok. İnceleme/yayın sonucu ve telefonda
   Play installer/versionCode7 ayrıca doğrulanır; hazır dosya cihaz QA değildir.
3. Yeni istemci legacy sunucuda geriye uyum; izole yeni-policy checkout
   onay/ret/pending/kurtarma/iade/yeniden alım/aynı kaynakta açık kapatma
   ve eski makbuzların korunması sınanır. Ön bellekte eski checkout/cutover
   yarışları ayrıca test edilir. Lisans testinde ücretsiz yöntem/no-charge
   doğrulanmadan son satın alma onayı yapılmaz; hiçbir gerçek ücret alınmaz.
4. Onaylı TR/EN Terms9 değişikliği ve açık UTC/TR yürürlük zamanı, QA sonrası
   birlikte hazırlanır ve doğrulanır. Bu aşamada tarih seçilmedi ve public-site
   Terms değiştirilmedi. Yayınlanan metin ve uygulamadaki bağlantı yeni kuralı
   doğru açıklamadan özellik açılmaz. UI yayın için gerekiyorsa eylem-anı
   onayı alınır; mevcut genel sıralı onay testleri kaldırmaz.
5. Yeni sunucu adayında private provenance'ın gerçek veritabanı/yedek/restore
   ve operatör hata incelemesi korunur. Taze yedek, güvenli maintenance,
   restore planı ve güncel maç/WS/resource kapısı ile sunucu geçişi.
   `GRIDSHARD_SEASON_PASS_REFUND_POLICY=season-rewards-v1` ve aynı Terms UTC
   `GRIDSHARD_SEASON_PASS_REFUND_POLICY_FROM` ancak bu kapılardan sonra açılır.
   Bayrağı legacy'ye almak damgalanmış makbuzları silmez; defteri bilmeyen eski
   sunucuya kör rollback yok. Oyuncu verisi/volume silme veya live DB restore yok.

Canlı r14, mevcut v6, ürün/fiyatlar, oyuncu verileri ve yayımlanmış Terms bu
hazırlıkta değiştirilmedi. Savaş Premium bonus geri alma kapsam dışı ve ayrı
teslim/iade testi açık. Genel üretim/12tester14gün/prelaunch/vitals/savaş QA
kapıları tamamlanmış sayılmaz.

## Kapalı test sürüm notu — aday

TR: Yeni sezon geçişi iade koşulları için satın alma öncesi açıklama/onay ve
kaynak açıklarının mağazada gösterimi eklendi. Satın alma kurtarma, yinelenen
işlem ve kaynak kalıcılığı kontrolleri güçlendirildi. Eski alımlar ve ücretsiz
ilerleme korunur. Yeni kural sunucudan ayrı yürürlük tarihiyle etkinleştirilir.

EN: Added pre-purchase explanation/consent for the new Season Pass refund
conditions and Store display of resource deficits. Improved purchase recovery,
duplicate-transaction and resource persistence safeguards. Earlier purchases
and free progression remain protected. The new rule is enabled separately
on the server with an explicit effective date.
