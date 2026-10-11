# Android v7 — prospective premium reward recovery

11 Ekim 08:20 TR güncel: İnsan yeni tarihli siteyi yayımladı;
05:14:13 UTC 11/11 HTTPS/exact manifest PASS. İkinci açılış
05:17:52 UTC, yeni `20261011-before-premium-policy-v1-0820` özel yedek ve
ayrı 0820 kayıtlarıyla aynı r15 imajında yalnız iki env değiştirdi.
Yedek/geçiş verileri/.env/secrets/volumes doğrulandı. 05:20:07 UTC runtime
healthy ve UTC kapısı true. 05:25:30 UTC activation exit0; 330 sn iç43/dış39
kontrol (31 yürürlük sonrası) PASS. `policy-result-v1-0820.json` ve
`external-policy-witness-0820.json` ayrı operasyon kanıtlarıdır.
Terms tanığı 05:26:10 UTC exit0/16 başarılı 11-route kontrol (11 postcutover);
05:26:44 UTC final runtime aynı imaj/healthy/timegate true.
Native yeni-policy QA henüz geçmedi. Mevcut v7 değişmedi/yeni AAB yok.
Eski Uç alımları/17 kademe korunur. Alt zamanlı bloklar tarihçedir.

11 Ekim08:05TR güncel: ilk00:30kural açılışı staleTermsproof nedeniyle
00:29:21'de failclosed/same-r15legacy rollback/exit1 oldu. Yeni politika
aktifleşmedi; sabah read-onlyv1receipt/profile0, serverhealthy/polling/env/
source aynı. İlkattempt/externalwitness PASS değildir. Appv7 değişmedi.
Kullanıcı yeni **08:20TR/05:20UTC** yürürlüğünü onayladı. İkiTerms sayfasında
yalnıztarih değişti; yeni21dosyaZIP `artifacts/public-site-premium-refund-20261011-0820/GRIDSHARD-public-20261011-0820-premium-refund.zip`.
262445bytes SHA `3bb0af9643fd711edb75d31f8367d0699623cba1c9baecf0738fa3207a4a8ada`.
16unit/30layout/allZIPstreamSHA/diğer19dosya/app14frozeninput aynı PASS.
HumanProduction yayın→yenidatedliveTerms verification bekler; serverOFF.
NativeQA açık; yenialımsononaylarıinsanda, eskiUçödüllerine reset/kesinti yok.

11 Ekim00:16TR güncel: kullanıcı mevcutv7/globalyeni kural testi istedi;
izole emülatör sırası reddedildi. UTCcutover açıkça `2026-10-10T21:30:00Z`
(11 Ekim00:30TR) onaylandı. YalnızpublicTerms madde9/website testleri değişti;
v7/app/server frozen14fingerprint aynı, yeniAAB gerekmedi. 21dosyaZIP hazır:
`artifacts/public-site-premium-refund-20261011/GRIDSHARD-public-20261011-premium-refund.zip`;
SHA `d38d862bf199fdc67d4d4f22e2e2ae34de370bc3b71f618857efcbefeb5f34d5`.
16unit/30headlesslocalEdge layout, ZIPallstreamhash ve diğer19publicdosya
aynı doğrulandı. KullanıcıProduction deploy→liveTerms proof öncesi ruleOFF.
Deadlineaşılırsa OFF ve yeni tarihkararı; sessizbackdate yok. Ardından yeni
yedekli aynır15image/policyenv-onlyactivation, mevcutv7no-charge nativeQA.
NativeQA henüz geçmiş değildir; eskiUç alımları/17ödül geriye dönük kesilmez.

11 Ekim00:04TR ek kayıt: kullanıcı refunded geçiş için `pasif` teyit etti;
önceki fiyat/bakiye teyidiyle normal-reopen protokolündeki temel mağaza kullanıcı
QA tamamlandı. Exact ölçüm veya agent UI gözlemi değil. Native yeni-policy QA
açık: server store yalnız globalpolicy+UTC aktifken yeni açıklamayı sunar,
query capability opt-in aktivasyon değildir. Üretimi genel açmadan ayrı native
testAPK/privateDB/emülatör pilotu öneriliyor; henüz başlatılmadı. GooglePlay'li
yerel AVD config read-only bulundu. Aynı paket adı/lisans-test hesabıyla debug
APK sideload yöntemi [Google Billing test rehberinde](https://developer.android.com/google/play/billing/test)
desteklenir. Google giriş ve son ücretsiz ödeme/iade onayları insanda kalır.

11 Ekim00:01TR /10 Ekim21:01UTC ek kayıt: kullanıcı v7'de `bakiyeler normal,
fiyatlar tamam` teyit etti. Exact değerler tekrar verilmedi, fiyat/bakiye
kullanıcı kontrolü geçti. Refunded Sezon Geçişi UI pasifliği ve normal reopen
ayrı açık teyit değildir. Proof `store-regression-user-confirmation.json`;
native yeni-policy QA ve Terms/siteZIP/enable hâlâ açık, politika legacy/OFF.

## Güncel final kayıt — 10 Ekim 2026, 20:59 UTC

Kullanıcı final commit/push'u tamamladı. Temiz main kaynak
`ccc5e99ba943e8c88856f3476c1c15736c912308`.
[Quality38083415413](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/38083415413)
push/main/attempt1/exactSHA/completed-success **5/5**,20:27:14UTC:
1410server PASS/41skip, operator14PASS/4skip,293client PASS/0skip,
9build-contract PASS, gerçekPG/Redis/restart63PASS/0skip ve production
image/empty-target backup restore/Caddy PASS, browser24/reconnect3PASS.
Skipler PASS sayılmaz. Agent commit/push yapmadı.

Final klasör: `artifacts/android-production-20261010-v7`.
Exact-commit temiz offline rebuild BUILD SUCCESSFUL22sn,
378task/35executed/343up-to-date; lintVitalRelease geçti (yeni tam vendor
lint iddiası yok). İmza/audit,74asset SHA eşleşmesi/9font, private/debug/AD_ID
sınırları, kendi AAB protobuf manifest7 ve yeni policy/recovery-consent kodu
PASS. Source guard/CRC/private boundary,968sourcefile+manifest/exactcommit/
14fingerprint PASS. Önceki adayla APK/AAB byte-identical, fakat final temiz
build provenance ayrıca doğrulandı; v6 hashleri/dosyaları korunur.

| Final dosya | Byte | SHA256 |
| --- | ---: | --- |
| `GRIDSHARD-2.1.0-beta.72-v7.apk` |28295596|`6922156e42c44e3056dc71c0d888ad626f7b705dbc5d8e94384658ef5238410f`|
| `GRIDSHARD-2.1.0-beta.72-v7.aab` |27688707|`c0094ef294fa92276a27067bcc731e35f0b9389b2616950e11dedff1b11d3b29`|
| `GRIDSHARD-2.1.0-beta.72-signatures-social.zip` |83525668|`c8c325f834af352a7608cc156f7dbe664f2012ccb122cbea1b560736dc98fdd2`|

`release-provenance.json` build-anı snapshot'ıdır. Sonraki insan Console
işlemleri ve sunucu geçişi ayrı operasyon kaydıdır; snapshot'taki
`play_uploaded:false` sonraki insan teyidini inkâr etmez. Bu belgelerin
freeze sonrası düzenlenmesi paket kodunu değiştirmez. Manifest AAB'ye gömülü,
ayrı XML gerekmez. Play-imzalı uygulamaya upload-key APK sideload/uninstall/
veri silme yok; telefon güncellemesi Play üzerinden olmalı.

### Console ve sunucu sırasının ayrılması

Kullanıcı final v7'yi yüklediğini, daha sonra telefonun güncellendiğini bildirdi.
20:59UTC salt-okunur USB package-manager: canonicalapp/versionCode7/
versionName2.1.0-beta.72, installer+initiatorcom.android.vending doğrulandı.
**Play cihaz kurulumu PASS**; Console review sonucu/kanal bağımsız
doğrulanmadı. Cihaz seriali kaydedilmedi; UI/purchase/data-delete yok. Proof
`artifacts/android-production-20261010-v7/device-update-verification.json`.
Mevcut Kapalı test/Alpha tester/ülkeleri korunur; üretim kanalı yok.
Kullanıcı bilgisayar-kullanım aracını yasakladı; Console/Play/Cloudflare UI
adımları insana aittir. Dosya/CLI/onaylı SSH devam eder.

Onaylı sıra: **r15 kodu legacy ile geçer**, paralelde insan v7 Alpha incelemesi;
v7 cihaz/yeni-policy QA ve TR/EN Terms+UTC doğrulandıktan sonra yeni kural
ayrı açılır. Uç'un eski17 premium kademesi/ödülleri kesilmez.

### R15 aday ve tamamlanan legacy kod geçişi

Remote root `/opt/gridshard/releases/aws-20261010-premium-r15-candidate`.
API image `sha256:258254f31cfdb41c4152536d12d1bdff43f338c541866bc421044df242bc2957`;
maintenance `sha256:c820cf754769c38de77c9fbaf6ac04b18386ae4dafe540225474d16d5f881206`.
FinalZIP/SHA/fingerprint/6Compose katmanı doğrulandı; env byte-identical600,
nonroot10001. İzole gerçekPG/Redis politika **67PASS/0skip**. Legacy/yeni-policy
gerçek imaj/reviewer hakları/old-client yeni-pass gate/diğer ürünler, gerçek
sandık+signed deficit, privateledger+wallet+receipt restart ve boş hedefe
backup restore geçti. Provider writes0/live_changedfalse; native Play QA değil.

İki önceki fixture hatası korunur: ikinci process worker-owner değildi;
iki faz aynı Redis lease DB'yi kullanıyordu. Yalnız harness düzeltildi;
app/üretim korumaları değişmedi. Başarılı tekrar `verify-2.log` ve
`sql-policy-tests-2.xml`; scoped test container/networkleri temizlendi,
production volume'larına dokunulmadı.

**20:51:28UTC geçiş tamamlandı;20:52:31UTC dış kanıt da geçti.** Offline private
backup `20261010-before-premium-r15-legacy` SHA/count/installation/600/TOC
doğrulandı. Yeni API çalışıyor; bakımda player/identity/team/private ledger
fingerprintleri, env/secrets/volumes/originTLS korundu. İç330sn worker/WIF
**32 başarılı kontrol**, bağımsız dış330sn HTTPS+exactHTML **31 başarılı
kontrol**, geçerli TLS ve doğal Google polling PASS. Dış HTML hash
`9f7719b39d0497d3c13330a917ee3c5bd99d6c9aef19b1214f2fa4fc06ec4bb9`;
yalnız bilinen Cloudflare email/beacon dönüşümleri ters çevrilerek tüm kalan
byte'lar pinlendi. Login/player-data istekleri ve provider write0. Başarı
kanıtları local r15 klasöründeki `deployment-receipt-legacy.json` ve
`external-witness.json`; root durable runner exit0. Live DB restore/deletion yok.

### Hâlâ açık kapılar / site ZIP teslimi

- **Yeni politika KAPALI: legacy, UTC FROM boş.** Kodun canlı olması
  `season-rewards-v1` etkinleşmesi değildir.
- V7 Play installer/versionCode7 doğrulandı; normal-reopen protokolünde fiyat/
  bakiye normal ve refunded hakkın pasifliği kullanıcı teyitleri tamamlandı.
  Native yeni-policy onay/ret/pending/kurtarma,
  iade/yeniden alım/aynı kaynakta açık kapatma/checkout-cutover yarışları açık.
  No-charge lisans testi doğrulanmadan son ödeme onayı yok; gerçek ücret yok.
- TR/EN Terms9 taslağındaki UTC/TR placeholder henüz doldurulmadı;
  **public Terms değişmedi, yeni-kural final site ZIP'i henüz yok**. Tarih ve
  metin QA sonrası bütün21dosyalık finalZIP kullanıcıya verilmeli; eski
  availability ZIP veya placeholder yeni site diye sunulmamalı. Cloudflare
  yayını insan yapacak; canlı metin ve v7 Terms bağlantısı doğrulanacak.
- Yeni kural aynı Terms UTC ile `GRIDSHARD_SEASON_PASS_REFUND_POLICY=season-rewards-v1`
  ve `GRIDSHARD_SEASON_PASS_REFUND_POLICY_FROM` gerektirir. Damgalanmış
  receiptler varken r14'e kör rollback yok; flag-off defteri silmez.
- Savaş Premium bonus clawback kapsam dışı, ayrı teslim/iade testi açık.
  Genel12tester14gün/üretim erişimi/prelaunch/vitals/savaş QA tamamlanmış değil.

## Tarihsel kayıt — 10 Ekim 2026, 23:17 TR — aday/final sabitleme öncesi

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
