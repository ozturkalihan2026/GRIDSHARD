# PGS ve OAuth yayın hazırlığı — 9 Ekim 2026

## 10 Ekim 23:03 güncel — premium iade kod/test/Terms taslağı yerel aday

Kullanıcı yeni alımlarda premium kaynak/clawback önerisini onayladı; kod ve
TR/EN Terms taslağı hazır. Varsayılanlegacy/UTCcutover kapalı, verifiedprovider
satın alma zamanı + açık istemci onayı gerekir; önceki Uç testi korunur.
1410 sunucu PASS /41 skip,293 istemci PASS,24 build-site PASS. Yerel DB yok; yeni2SQL
test mevcut migration CI dosyasında. YeniCI/istemci kapalı test/Terms tarih
ve ayrı yayın-deploy onayı gerekir. v6 AAB bu adayı içermez. Google Auth/PGS,
liveTerms, sunucuenv veya canlıoyuncu write yok. Genel üretim hazır sayılmaz.
Taslak docs/PREMIUM_REFUND_POLICY_V1_DRAFT_20261010.md; proof
test-results/premium-recovery-candidate-20261010.json.

## 10 Ekim 22:22 önceki — mevcut iade akışı geçti; ödül suistimali açık

Kullanıcı normal reopen sonrası pasif sezon geçişi,1110Akı/5476kredi ve
mağaza normal teyit etti. READ ONLY22:22 aynı refunded/history1/hakfalse/
claimed17; sonraki doğal scan21:53 seen1/applied0. Mevcut politika doğrulandı,
premium ödülleri alıp iade edebilme açığı kapandı sayılmaz. Kullanıcı bu açığı
işaretledi; yalnız premium kaynak kazanımlarını purchase ledger'a bağlayıp
iade ile geri alma önerisi onay bekler. Terms/kod/canlı değişmedi; geçmiş Uç
test ödüllerine kesinti yok. Genel üretim kapıları açık; source/CI/AAB aynı.

## 10 Ekim 20:24 önceki — v6 sezon geçişi iadesi sunucuda geçti

Kullanıcı eşleşen ücretsiz sezon geçişi test siparişini iade etti. 20:22 TR
Google GET exact-match1; 20:23:51 doğal scan seen1/applied1. 20:24:24 READ ONLY
sezon hakkıfalse/tek makbuz-ledger refundedtrue/history1/Google voided işlendi.
Alınmış17 tier ve1110Akı/5476kredi korunuyor; Savaş Premium false/makbuz0.
İade sonrası telefon normal reopen ve sonraki doğal scan idempotency henüz
bekler. Yeni agent ödeme/iade/manual scan/restart/provider veya player write
yok. Politika/source/CI/AAB aynı; genel yayın kapıları açık. Kanıt
test-results/billing-v6/season-pass-refund-uc-20261010.json.

## 10 Ekim20:14 önceki — v6 sezon geçişi test teslimi ve kalıcılığı geçti

Uç sezon geçişi tek test makbuzu+ledger/consume/haktrue/current stored sezon
grant eşitliği20:09/20:10/20:13 dar READ ONLY doğrulandı. Normal reopen sonrası
kullanıcı etkin geçiş/mağaza normal; server aynı1110/5476/claimed17.20:12 ekli
Console test order/İşlendi/199,99TRY; RAM exact-order matchtrue. Başlangıç
842/1456/claimed0; ödül alınmadan izolasyon korunmadı, delta'nın tümünü tek
nedene atfetme. İade henüz yapılmış sayılmaz; yalnız bu exact ücretsiz test
order100% iade+hak geri alma insan tarafından sonraki adım. Savaş Premium
hakfalse/makbuz-ledger0, kendi testleri açık. Ham order/hash/token kaydı ve
agent payment/refund/manual scan/kalıcı write yok. Genel kapılar/source/CI/
AAB aynı. Kanıt test-results/billing-v6/season-pass-purchase-uc-20261010.json.

## 10 Ekim20:04 önceki — Terms canlı; v6 native10 ürün geldi

Kullanıcı ZIP+Save yaptı; agent submit yapmadı. Cloudflare Success ve yeni
Production b92f1b0b/gridshardgame.com doğrulandı; anonim HTTPS11/11 route200/
byte/SHA/header onaylı adaya eşit.14 madde/iade/eksi bakiye aynı; Branding
Terms linki zaten doğru, yeni OAuth/Google ayarı yok.20:02TR ADB Play/v6/
tek cihaz;20:01TR iki native query0/10 fetched/0 unfetched. Tek tek fiyat UI
ve premium teslim/iade ayrı kapsamdır.20:04TR Uç iki premiumfalse/iki makbuz
ve ledger0/842Akı-1456kredi. Kullanıcı sezon geçişi test kartı/no-charge
uyarısını teyit etti, yeni screenshot yok. Final alımı insan tamamlayacak;
agent payment/refund/scan/deploy/release yapmadı. Genel üretim/rapor/vitals/
savaş QA/yedek kapıları açık. Kaynak/CI/AAB pinleri aynı. Kanıtlar
terms-production-live-20261010.json/device-all-products-v6-20261010.json/
premium-pre-purchase-uc-20261010.json.

## 10 Ekim18:25 önceki — Google katalog10/10 ACTIVE; cihaz görünürlüğü bekliyordu

Kullanıcı tüm seçenekleri etkinleştirdi. Bağımsız salt-okunur Google katalog
GET200/complete page:10 ürün/10 ACTIVE, her ürün tek standard/legacyCompatible/
yalnız TR AVAILABLE; önceki fiyatlar aynı. Agent provider write yapmadı.
18:23TR v6 current-process/tag-only iki native query0/fetched1/unfetched9;
tüm fiyatların cihazda görünmesi henüz doğrulanmadı. Normal reopen+mağaza
ekranı istendi; ödeme/install/data clear/app launch yok. Premium ve diğer
ürünlerde tüm teslim/iade kapsamını geçti sayma. Güvenli kanıt
`test-results/billing-v6/catalog-all-active-20261010.json`.

Önceki tur onaylı Terms yayını Computer Use URL doğrulama engeli nedeniyle
yapılmadı. Aday hâlâ yerel; source/CI/AAB,14 madde ve iade politikası aynı.
Genel üretim erişimi/rapor/vitals/savaş QA/backup kapıları açık kalır.

## 10 Ekim17:58 önceki durum — v6 Play/temel mağaza geçti; rapor sonucu yok

17:53TR salt-okunur ADB com.gridshardgame.app/versionCode6/Play installer;
güncel native query0/fetched1/unfetched9. Diğer9 product status3=
PRODUCT_NOT_FOUND; önceki DRAFT katalogla uyumlu çıkarım. Kullanıcı120Akı
29,99TL/bakiyeler aynı838/1404 teyidi. Temel mağaza geçti, fakat v6'da yeni
alım/consume/forced replay veya tümnative race testi yapılmış sayılmaz.
Ön lansman17:55 Genel bakış sonuçsuz boş durum;17:57 Ayarlar no credentials,
deep link3boş/özel dil ve script yok. Görünür rapor kapatma kontrolü yok;
exact cause bilinmiyor. Yeni AAB/Google ayarı/credential/upload değişimi yok.
Kanıt `test-results/billing-v6/device-v6-store-check-20261010.json` ve
`test-results/billing-v6/prelaunch-report-status-20261010.json`.

## 10 Ekim17:12 önceki durum — v6 güncellemesi geldi; cihaz teyidi bekliyordu

Kullanıcı v6 güncellemesinin geldiğini bildirdi; kurulum tamamlandı ifadesi yok.
17:12TR salt-okunur ADB yetkili fiziksel telefon0, package kontrolü yapılamadı.
Yeni konsol review/üretim statüsü ayrıca doğrulanmadı; son verified kurulum v5.
Play güncellemesi+USB+ödemesiz mağaza QA sonraki adımdır.120Akı testleri,
source/CI/AAB ve kalan üretim kapıları aynı; yeni upload/publish/install yok.

## 10 Ekim17:04 önceki durum — temel120Akı testleri geçti; üretim kapıları açık

Önceki iade sonraki doğal scan'lerde seen1/applied0/history1; ikinci kesinti yok.
Always-denied ve bekleyen→iptal denemeleri için yeni grant yok718/1404.
Yavaş-onay sırasında17:02TR yeni makbuz yok718;17:03TR tek yeni test makbuzu/
ledger/consume/grant120/console order eşleşmesi ile838/kredi1404. Kullanıcı
normal reopen ve mağaza normal teyidi;17:03:58TR READ ONLY aynı tek yeni
makbuz ve bakiyeyi doğruladı. İki yavaş test insan tarafından başlatıldı;
ön-onay ödeme yöntemi/no-charge ekranı gözlemlenmedi. Yeni başarılı alım
test=true bağımsız doğrulandı. Forced replay/pending sırasında restart/v6
cihaz veya diğer ürünlerin tam test kapsamı değildir. Ek51 yerel iade testi geçti.
Kaynak/CI/AAB değişmedi; agent ödeme/manuel tarama/canlı write/deploy yok.
Kanıt `test-results/billing-v6/pending-tests-uc-20261010.json`;
[kalan üretim kapıları](PRODUCTION_READINESS_20261010.md).

## Önceki durum — ücretsiz test iadesi işlendi; diğer üretim kapıları açık

13:55:21TR READ ONLY aynı tek120Akı test siparişinin Google iade/hak geri alma
kaydının normal13:53TR taramasıyla işlendiğini doğruladı: makbuz/ledger refunded,
eventseen, tek refund_history/debit120, flux838→718/waived0. Kullanıcı cihaz718
bildirdi; Devre Kredisi önceki/sonraki tanıkta1404. İlk teslim/iade akışı geçti;
sonraki doğal taramada ikinci kesinti yok canlı kontrolü bekliyor. Bu, diğer
ürünler/premium/eksi bakiye/replay veya v6 cihaz doğrulaması değildir. Agent
yeni refund/revoke/consume/manualscan/write/deploy yok; source/CI/AAB aynı.
Detay [Üretim kontrol kaydı](PRODUCTION_READINESS_20261010.md); güvenli ignored
kanıt `test-results/billing-v6/refund-uc-server-applied-20261010.json`.

## Önceki durum — beyanlar tamam / üretim süresi bekliyor

Kullanıcının dashboard ekranı12 test kullanıcısı/1 gün, incelemede güncelleme,
etkin olmayan üretim ve kapalı başvuru düğmesi gösteriyor;14 gün tamamlanmadı.
En son v6 bildirimi incelemede, son cihaz v5. Uygulama içeriği ekranlarında
bekleyen beyan yok/10 beyan tamam; bu form ayrıntılarının uygunluk onayı değildir.
Uç ücretsiz120 Akı alımı/kalıcı teslim/consume sonrasında normal reopen
bakiyesi832 kaldı (kullanıcı teyidi); replay/iade ve v6 cihaz doğrulaması yok.

Yeni ödeme/iade99, istemci17, site/saklama26 ve yerel görünüm30 test kontrolü
geçti. Canlı eski site11/11, r14 health/polling/checkpoint/retention başarılı.
Katalogda yalnız120Akı ACTIVE/diğer9 DRAFT; iki premium199,99 TL. Mevcut
a451221 CI5/5/AAB hash aynı. Düzenli yeni yedek üretimi/hata bildirimi
doğrulanmadı; sessiz job/restore/provider/yayın değişikliği yapılmadı.

Terms eski girişine yerel TR/EN bulunabilirlik/test-ücret açıklaması ve
sayfa-bazlı tarih düzeltmesi hazır;14 onaylı madde aynen korunur.21 dosyalık
adayda yalnız iki Terms HTML değişir; henüz canlı değil, Google URL aynı.
Yeni site değişikliği mevcut v6/source ZIP/CI içinde değildir; oyun/AAB
değişmediği için AAB yeniden üretimi gerekmez. Commit/push kullanıcıya ait.
Kalan testler, Google/operasyon kapıları ve dürüst başvuru hazırlığı:
[Üretim kontrol kaydı](PRODUCTION_READINESS_20261010.md).

## Önceki durum — Uç hesabının ücretsiz 120 Akı test alımı doğrulandı

Google Play ödeme ekranındaki 120 Akı / 29,99 TL, test kartı ve ödeme alınmayacağı
bildirimi görsel doğrulandı. Kullanıcı alım onayı/oyuna dönüş/Uç hesabına +120
Akı bildirdi. 12:56:44 TR pinned SSH / PostgreSQL READ ONLY sorgusu, 12:40 sonrası
tek flux_120 makbuzu/tek defter kaydı doğruladı: alım12:49:24 TR,
google_play/environment=test/test=true, grant120 flux_shards, consumed=true,
sahip/grant eşleşmesi, refunded=false. Kontrol anında bakiye832. Ham hesap,
order veya token kimliği açıklanmadı; doğrudan Google GET/consume POST yapılmadı.

Normal kapat/aç sonrası ikinci grant olmaması, iade testi ve telefonda v6
kurulumu henüz doğrulanmadı. Son cihaz bildirimi v5; bunu v6 fix kanıtı sayma.
Agent yeni alım/diğer ürün aktivasyonu/canlı write/deploy/commit-push yapmadı;
diğer9 son bağımsız katalogda DRAFT. Final source/CI/hash pinleri değişmedi.
Ignored kanıt `test-results/billing-v6/test-purchase-uc-20261010.json`.

## Önceki durum — kullanıcı v6 yayını bildirdi; telefon v5 fiyatı döndü

Kullanıcı v6 AAB'yi Play'e gönderip yayımladığını bildirdi; konsol bağımsız
doğrulanmadı, agent upload/publish yok. Read-only ADB12:43TR hâlâ canonical
Play kurulumlu v5. Yerel v6 APK denemesi paket çakışması bildirdi; public signer
karşılaştırması kurulu Play09:6A:CD…A0:E6 ile upload03:A4:5C…1F:88 farkını
doğruladı. Tekrar yerel update/kaldırma/veri silme yok; v6 Play Store'dan gelecek.

Kullanıcı v5'te120 Akı tuşu29,99TL ile aktif dedi. Bu v6 fix doğrulaması değil;
UI/native query bağımsız teyit edilmedi. Ücretsiz test için Google ödeme
ekranında test uyarısı + test ödeme yöntemi kapısı hâlâ açık; son ödeme onayı,
teslim/consume/replay/iade kanıtı yok. Hesap/kart/token/ham log paylaşma.
Final a451221/CI/hash pinleri aynı; yayın öncesi freeze kayıtları korunur.
Detay [Android v6 kayıt](ANDROID_V6_BILLING_RELEASE_20261010.md).

## Önceki kaynak freeze — final v6 / a451221 CI yeşil; Alpha onayı bekleniyordu

Kullanıcı commit/push yaptı. Exact commit
`a45122176ea8c81ebd2de2f92052c884d9bad1ff` için
[Quality run38034762931](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/38034762931)
beş iş tamamlandı/başarılı. Clean kaynak ZIP'i/testli aday fingerprint eşleşmesi,
offline incremental final build ve imza/assets/güvenlik/manifest6 audit geçti.
Final `artifacts/android-production-20261010-v6`; AAB SHA
`aba0023e3b36f0b007814766efd2af4b0b8e2346194e74ee32791e4821124beb`.
Finalde queue/native tanılama var. Aynı kaynak full lint raporu0 hata/3 uyarı
korundu; yeni full lint koşulmuş gibi sunulmaz. V5/r14/ürün durumları aynı.

Yalnız Alpha v6 taslak/yükleme için ayrıca kapsam onayı gerekir; incelemeye
gönderme/yayın ayrı kapıdır. Henüz upload/yayın/cihaz kurulumu yok. 120 Akı
fiyatı, test banner ve ücretsiz alım/teslim/consume/replay/iade doğrulanmadı;
diğer9 DRAFT. Operasyon notları clean kaynak freeze/build/audit sonrasında
güncellendi; agent commit/push yapmadı.
Detay: [Android v6 kayıt](ANDROID_V6_BILLING_RELEASE_20261010.md).

## 10 Ekim önceki durum — v6 Billing adayı hazır, yeni CI/yayın kapıları açıktı

Dar düzeltme/tanılama/AAB kapsamı onaylandı. 16 odaklı +284 client +9 build
testi, offline signed build/lintVital ve imza/assets/manifest6 audit geçti.
Ek tam Billing lint0 hata/3 sürüm-bağımlılık uyarısı, Java helper0 bulgu.
V6 aday dosyaları ayrı klasörde;
v5 ve canlı r14 korunur. Kullanıcı commit/push, yeni exact-commit CI, final
paket audit ve ayrıca Alpha yayın onayı gerekir. Henüz upload/yayın/telefon
kurulumu yok. Diğer9 ürün DRAFT, ödeme test banner/alım/consume doğrulanmadı.
120Akı fiyat sorununun cihazda çözüldüğü henüz gösterilmedi.
Detay: [Android v6 kayıt](ANDROID_V6_BILLING_RELEASE_20261010.md).

## Önceki tanılama — Billing bağlantı yarışı; fiyat yokluğu hâlâ açık

09:56 TR güvenli cihaz logu getProducts/getPurchases çakışmasını, bağlantı
kapanmasını, setup timeout ve -1/SERVICE_DISCONNECTED'i gösterdi. Kaynak
incelemesi paralel başlangıç ve asenkron callback tamamlanmadan native
bağlantı yenilenmesini doğruluyor. Ancak 09:56:56.770 TR çakışma görülmeyen
sorgu da query0/fetched0; yarış tüm fiyat yokluğunun kesin nedeni değil.
V5 UnfetchedProduct neden kodlarını aktarmıyor. Sonraki öneri dar bağlantı
sıralaması düzeltmesi + güvenli neden tanılaması; kapsam onayı bekleniyor,
henüz app/native değişikliği yok. Telefona yeni kod için testli yeni APK/AAB,
kullanıcı commit/push, CI ve Alpha kapıları gerekir. Server-only geçiş yetmez.
Son 09:50:36 TR katalogda yalnız flux120 ACTIVE/TR2999, diğer9 DRAFT.
Önbellek temizliği açıkça teyit edilmedi. Veri silme/kurulum/hesap değişimi,
ürün/ödeme/server write veya yeni build/deploy yok. Frozen pinler korunur.
Yeni güvenli zaman çizelgesi mevcut ignored device-billing-empty-products
kanıtına eklendi; ham log/token/hesap bilgisi saklanmadı.

## 10 Ekim önceki tanılama — 120 Akı etkin, native ürün sorgusu boş

Kullanıcı120 Akı hâlâ kullanılamıyor dedi. Cihazdaki09:48:00/09:48:12TR
read-only native query doğruflux120/inapp; setup0/query0/fetched0. Fiyat
uygulamaya gelmemiş; alt sebep kesin değil. Yeni09:50:36TR katalog GET200
ACTIVE/standard/legacyCompatible true/tek TR AVAILABLE/2999 kuruş,
diğer9 DRAFT. Kullanıcı Play etkin ülkesini Türkiye diye teyit etti; SDK
storefront/ödeme hesabı bağımsız değil. Metadata yayılımı/önbellek veya
hesap/teklif uygunluğu henüz ayrılmadı. Native eklenti UnfetchedProduct
neden kodunu loglamıyor.4 fiyat testi geçti, gerçek cihaz alımı yapılmadı.
Sonraki dar adım yalnız Play Store önbellek temizliği + normal Store/oyun
açılışıyla yeni sorgu; uygulama/veri silme veya hesap/ülke değişimi yok.
Diğer9 aktivasyon/ödeme onayı yok; kaynak/build/deploy değişmedi.
Ignored kanıt `test-results/billing-v5/device-billing-empty-products-20261010.json`.

## 10 Ekim önceki aşama — yalnız 120 Akı etkin; test ödeme ekranı bekleniyordu

Kullanıcı lisans-test dışındaki Alpha kullanıcılarının gerçek ücretle alım
yapabileceği açıklamasından sonra yalnız **120 Akı / standard / Türkiye /
29,99 TL** etkinleştirmesini onayladı ve Edge'de elle tamamladı. Paylaşılan
ekran doğru ürün/seçenek/ülke ve Etkin; yeni mevcut WIF read-only katalog
GET200 yalnız `gridshard.flux_120` ACTIVE / TR AVAILABLE /2999 kuruş,
kalan dokuz DRAFT doğruladı. Kontrol tamamlanma10 Ekim09:43:46TR;
kesin aktivasyon zamanı değildir. Agent Publisher/tarayıcı write yapmadı.

Ignored yeni kanıt `test-results/billing-v5/google-catalog-flux120-active-20261010.json`;
eski all-DRAFT kanıtı korunur. Sonraki kapı telefonda fiyatın ve Google ödeme
penceresindeki test uyarısı/test ödeme aracı/doğru hesabın doğrulanması.
Son satın alma onayı, ücretsiz teslim/consume/replay/iade kanıtı henüz yok.
Diğer dokuz ürün kapalı kalır; geniş satış/yasal hazırlık tamamlanmış sayılmaz.
Frozen a309/v5/r14, cihaz verileri ve yayın/izin ayarları korunur; build,
deploy, agent commit/push yapılmadı. Ayrıntı [v5 yayın kaydı](ANDROID_V5_BILLING_RELEASE_20261010.md).

## 10 Ekim önceki aşama — Play v5 cihazda; tüm ödeme seçenekleri DRAFT

Kullanıcı Alpha'yı yayımladığını ve telefonu güncellediğini bildirdi. Read-only
ADB canonical versionCode5/Beta72/min24/target36, Play installer/initiator,
ilk kurulum4 Ekim ve son güncelleme10 Ekim08:41:10TR doğruladı. Agent install/
uninstall/data-clear yok; telefonun oyun içi profil bütünlüğü henüz test değil.
Edge bağlantısı yok: Alpha kanalının/yönetilen yayınlamanın güncel konsol
durumu taze görülmedi; önceki in-review kanıtı tarihçedir. Yayını tekrarlama.

R14 taze health/WIF/Google scan/polling1800s/restart0 OK. Kullanıcı mağaza
görüntüsünde on üründe fiyat yok. Mevcut WIF read-only Google katalog GET200
**10/10 option DRAFT, ACTIVE0**, TR AVAILABLE; iki premium199,99TL doğruladı.
Uygulamadaki native fiyat koruması bu durumda ödeme başlatmaz. Oyun/server/
Android değişimi veya yeni AAB gerekmedi. HEAD0db145d yalnız operasyon belgesi;
frozen releasea309 ve exact-commit CI/provenance korunur.

Kullanıcı indiren Google hesabının lisans-test listesinde olduğunu teyit etti;
bağımsız console/billing banner/test kartı/alım/consume/replay/iade kanıtı yok.
Aktivasyon lisans-test dışındaki Alpha kullanıcısına gerçek satış açabilir;
ayrı scoped onay/yasal satış kapıları olmadan ürünleri topluca açma. Bu tur
ürün/ödeme/iade değişmedi. Sonraki uygun görünüm120 Akı satın alma seçeneği.
Ignored kanıt device-v5-update ve google-catalog-readonly JSON'ları billing-v5
test-results dizininde. Ayrıntı [v5 yayın kaydı](ANDROID_V5_BILLING_RELEASE_20261010.md).

## 10 Ekim önceki aşama — r14 canlıda, Alpha v5 inceleniyor

Kullanıcının açık r14 bakım/geçiş + yalnız Alpha inceleme onayıyla canlı
geçiş01:58:16TR başarı/exit0 tamamlandı. Taze özel yedek ve eski imaj/config
geri dönüşü korunur;39 profil/39 kimlik/91 savaş kayıt fingerprint'i korundu,
canlı DB restore/volume deletion yok. Altı Compose katmanla AWS WIF/keyless
Google doğrulaması ve1800s polling canlı; ilk gerçek read-only scan başarılı.
İç ve bağımsız dış HTTPS/TLS/HTML330s kontrolleri geçti. Ücretli Cloud Billing/
kart/free trial/PubSub/RTDN/static SA key yok; Ads/PGS/reviewer korunur.

Kullanıcı son Play gönderim düğmesine kendisi bastı.10 Ekim02:04:34TR gözlemi
**Değişiklikleriniz şu anda inceleniyor** ve yalnız **Kapalı test – Alpha /
5 (2.1.0-beta.72)** doğruladı. **Yönetilen yayınlama etkinleştirildi** korunur.
Bu nedenle Google onayı sonrasında ayrıca Alpha yayınlama gerekir; v5 şu an
testerlara dağıtılmıyor. Son yayın8 Ekim/v4; üretim kanalı/tester/ülkeler/
ücretli ürünler değişmedi. Toplu tüm değişiklikleri yayınlama veya yönetilen
yayınlamayı kapatma bu onay kapsamında değildir.

Kanıt `test-results/billing-v5/alpha-v5-review-submitted.jpg` (ignored).
Son exact-commit CI beş success/frozena309/APK-AAB hashleri korunur; yalnız
operasyon kayıtları güncellendi, yeni paket/agent commit-push yok. Gerçek
cihaz v5/lisans-test alımı/consume/replay/iade ve ücretli satış-yasal kapıları
henüz tamamlanmadı. Son USB kontrolünde telefon bağlı değildi.
Detay: [v5 yayın kaydı](ANDROID_V5_BILLING_RELEASE_20261010.md).

## 10 Ekim önceki aşama — v5 Alpha taslağı kaydedildi, r14 provası geçti

Son kullanıcı commit/push `a3095c33a17cb2b29daa13648cfe495c3c67f51b`;
Quality run37998290434 beş işte success. Temiz son kaynaktan v5 yeniden
üretildi, manifest/imza/asset audit geçti. Kullanıcı AAB'yi elle seçti;
Play Alpha taslağı kaydedildi. Önizleme2/2'de mapping/native debug sembol
iki uyarı, engelleyen hata yok. **Kaydet/incelemeye gönderme/yayın henüz yok**;
taslak onayı nihai dağıtım yetkisi değildir, tester/ülke ayarları korunur.
Gerçek read-only Google WIF + PG17/Redis/330s soak/restart/boş-hedef restore
ve checkpoint/reviewer koruması geçti. Yeni Linux dependency source1342pass/
39skip, iki operator rapor testi hariç/CI ayrı;6 offline deploy guard pass.
Canlı r13/ödemekapalı/ürünleretkin0/Playaktifv4 korunur. Hazır deploy.py
çalıştırılmadı. Sonraki kapı kullanıcı bakım onayı, taze maç/WS0 ve özel yedek;
başarılı sunucu geçişinden sonra ayrıca yetkili Alpha inceleme/sunum.
Üretim kanalı, gerçek ürün etkinleştirme/lisans-test/yasal satış kapıları
bu taslak işleminden ayrı. Google ücretli Cloud Billing/kart/PubSub/RTDN yok.
Kaynak/provenance/kanıtlar: [v5 yayın kaydı](ANDROID_V5_BILLING_RELEASE_20261010.md).

## 10 Ekim önceki hazırlık — yeni kapalı-test Android v5 adayı

OAuth marka yayını aşağıdaki kayıtta tamam. Sonraki aktif iş gerçek Google Play
Billing ve eşleşen sunucu/kapalı-test güncellemesi. Kullanıcı commit/push
`31b0388` için beş Quality işi başarılı. Yerel v5 sürüm yükseltmesi bu commit'ten
sonra yapıldı; son commit/CI henüz yok. İmzalı APK/AAB ve manifest/imza/asset
denetimi başarılı; **yayın/cihaz kurulumu/sunucu geçişi/gerçek ödeme yapılmadı**.
Ürünler taslak; fiziksel lisans-test alımı/iade ayrı kapı. Mevcut r13/Playv4,
OAuth/scopes/PGS/Ads ve Google ücretli Cloud kapalı durumu korunur.
Kanıtlar ve devam sırası: [v5 hazırlık kaydı](ANDROID_V5_BILLING_RELEASE_20261010.md).

## Son durum — 10 Ekim: Google OAuth markası doğrulandı ve yayımlandı

Kullanıcı mevcut doğrulanmış GRIDSHARD adı/logo/bağlantıların Google izin
ekranında **Publish branding** ile yayımlanmasını ayrıca açıkça onayladı.
Edge'de mevcut projede düğme kullanıldı; panel **Your branding has been
verified and is being shown to users** sonucunu verdi. Başarı gözlemi
10 Ekim2026 **00:35:54 Türkiye** (`2026-10-09 21:35:54 UTC`).

Marka yayını tamamlandı.24 saat bekleme, yeniden verification ve7 gün içinde
Publish branding onayı bekleme kayıtları önceki aşamaların tarihçesidir;
bu işlemleri tekrarlama. Önceki **External / In production**, üç non-sensitive
kapsam ve Search Console doğrulanmış owner/TXT korunur. Marka alanları/istemci/
sır/kapsam/DNS/IAM değiştirilmedi; mevcut doğrulanmış bilgiler yayımlandı.

Kanıt `test-results/oauth-publishing/branding-published-20261010.jpg` ignored.
Checkpoint/devir güncellendi; oyun/server/Android/config HEAD diff boş.
r13/Playkapalıv4/APK-AAB/ödeme/ürün/PGS/Cloud Billing değişmedi;
test/kurulum/deploy/commit/push yapılmadı. Bu, Play Store üretim yayını veya
ödemelerin açılması değil; gerçek cihazda Google/PGS giriş ve mevcut profil
geri getirme testi henüz bu konsol akışıyla doğrulanmış sayılmaz. Sonraki
kontrol mevcut uygulamayı kaldırmadan veya verilerini silmeden yapılmalı.

## Önceki aşama — 10 Ekim: marka doğrulandı, henüz yayımlanmamıştı

Kullanıcı24 saat dolmadan yeniden kontrolün başarısız dönebileceği
açıklanmasına rağmen açıkça **dene** istedi. Google Branding / View issues
üzerinde **I have fixed the issues → Proceed** kullanıldı. Kontrol başladı,
ardından **Your branding has been verified, but is not yet being shown to
users** sonucuna geçti. Başarı gözlemi10 Ekim2026 **00:33:52 Türkiye**
(`2026-10-09 21:33:52 UTC`). Bu deneme gerçekten başarılı; yalnız önceki
başvurunun View issues metninin okunması değildir.

**Publish branding** etkin. Google paneli doğrulanmış sonucun7 gün içinde
yayımlanmasını istiyor. Publish branding kullanılmadı; mevcut doğrulanmış
GRIDSHARD adı/logo/home/privacy/Terms/iletişim yayını ayrı açık onay bekliyor.
Aşağıdaki24 saat bekleme koşulu önceki aşamanın tarihçesidir; marka
doğrulamasını gereksiz yere yeniden çalıştırma. Sahiplik TXT kaydını koru.

Kanıt `test-results/oauth-publishing/branding-verified-awaits-publish-20261010.jpg`
ignored. Başka marka alanı, kapsam, DNS, owner veya IAM değişmedi. OAuth In
production/üç non-sensitive kapsam/r13/Playkapalıv4/APK-AAB/ödeme/ürün/PGS/
Billing korunur. Checkpoint/devir güncellendi; test/kurulum/deploy/commit/push yok.

## Önceki aşama — 10 Ekim: Search Console sahipliği doğrulandı

Kullanıcı yalnız `gridshardgame.com` Domain property, tek yeni Google TXT
kaydı ve mevcut `ozturkalihan2010@gmail.com` hesabının doğrulanmış owner
yapılmasını action-time onayladı. Edge'de manuel **Herhangi bir DNS sağlayıcı
/ TXT** yolu kullanıldı; Cloudflare otomatik servis bağlama yetkisi verilmedi.

Cloudflare'da root `@` TXT **DNS only / Auto** olarak eklendi. Önceki root
`gridshard-public.pages.dev` CNAME ve `play` A kayıtları içerik/proxy/TTL dahil
aynen korundu; reload DOM karşılaştırması toplam3 kayıt, yalnız1 eklenen
satır ve2 değişmeyen eski satır gösterdi. Mevcut token/owner silinmedi.
Yetkili NS TXT sorgusu challenge değerini birebir döndürdü. Search Console
Doğrula sonrası **Sahiplik doğrulandı / Alan adı sağlayıcı** verdi.
Doğrulanmış sahipliği korumak için bu TXT kaydı kalmalı.

Başarı gözlemi10 Ekim2026 **00:28:06 Türkiye** (`2026-10-09 21:28:06 UTC`).
Google Branding issues panelinin sahiplik sonrası24 saat bekleme koşulu
nedeniyle bir sonraki marka denemesi **11 Ekim2026 00:30 Türkiye'den önce
yapılmamalı**. Sahiplik başarısı marka onayı değildir. Bu tur yeniden marka
başvurusu veya I have fixed the issues / issues are incorrect beyanı yok;
otomasyon oluşturulmadı. OAuth üretim durumu ve önceki üç kapsam korunur.

Kanıtlar `test-results/oauth-publishing/search-console-ownership-verified-20261010.jpg`,
`dns-ownership-txt-saved-20261010.jpg`, `dns-before-ownership-20261010.jpg`.
Ekran kanıtları ignored; checkpoint/devir güncellendi. Oyun/server/Android/
config HEAD diff boş; r13/Playkapalıv4/APK-AAB/ödeme/ürün/PGS/IAM/Billing
değişmedi, test/kurulum/deploy/commit/push yapılmadı.

## Önceki aşama — 10 Ekim: marka kontrolündeki tek sorun alan sahipliği

Kullanıcı mevcut marka bilgilerinin Google'a doğrulama için gönderilmesini
ayrıca onayladı. Verify branding → otomatik kontrol → View issues sonucunda
ana sayfa `https://gridshardgame.com/` kullanıcıya kayıtlı görünmedi.
Panel sahiplik doğrulamasından **sonra24 saat beklemeyi**, ardından yeniden
marka kontrolünü ister. Marka onayı veya manuel incelemeye kabul doğrulanmadı.

Aynı Google hesabında Search Console welcome / Web sitesi ekle ekranı görüldü;
mevcut mülk görünmüyor. Alan eklenmedi/owner doğrulanmadı. Salt-okunur NS
sorgusu Cloudflare DNS sağlayıcısını doğruladı; DNS değiştirilmedi.
Bir sonraki dar işlem ayrı onay gerektirir: `gridshardgame.com` alan mülkü,
yalnız yeni Google TXT doğrulama kaydı ve mevcut Google hesabının
`ozturkalihan2010@gmail.com` doğrulanmış owner yapılması. Başka DNS kaydı veya
owner token'ı silme/ezme; geniş servis bağlama yetkisi verme. Başarı kanıtı
olmadan I have fixed the issues veya issues are incorrect beyanı yapma.

Kanıt `test-results/oauth-publishing/branding-domain-ownership-issue-20261010.jpg`.
OAuth In production ve üç non-sensitive kapsam korunur; oyun/server/PGS,
Playkapalıv4/r13/APK-AAB/ödeme/ürün/IAM/Billing/deploy/commit/push değişmedi.
Resmî kaynaklar: [Homepage sahiplik sorunu](https://support.google.com/cloud/answer/13807376),
[Search Console sahiplik doğrulaması](https://support.google.com/webmasters/answer/9008080?hl=en).

## Önceki tamamlanan aşama — 10 Ekim: OAuth In production

Kullanıcı mevcut projede yalnız OAuth Testing → In production geçişini
ayrıca onayladı. Audience Publish app → Confirm tamamlandı; reload sonrası
**External / In production** ve Back to testing görüldü. Google girişinin
OAuth üretim durumu değişti; Play kapalı test/üretim kanalı, PGS kimlikleri,
sunucu/r13, APK/AAB/v4 veya ödeme/ürün açılması değişmedi.

Üretim sonrası Verification Center iki durumu ayrı gösterir:

- **Data access:** sensitive/restricted kapsam olmadığından verification
  gerekmiyor. Önceki yalnız üç non-sensitive kapsam korunur.
- **Branding:** marka henüz kullanıcılara gösterilmiyor; doğrulanmalı.
  Branding'de Verify branding etkin. Mevcut GRIDSHARD adı/logo,
  ana sayfa/gizlilik/Terms URL'leri, `gridshardgame.com` yetkili alanı ve
  kayıtlı iletişim bilgileri korundu; Save pasif. Alan sahipliğinin Google
  Search Console kanıtı henüz incelenmedi. Verify branding **tıklanmadı**,
  doğrulama başvurusu **gönderilmedi**; bu ayrı onay gerektiren sonraki adımdır.

Kanıtlar `test-results/oauth-publishing/audience-production-20261010.jpg`
ve `branding-needs-verification-20261010.jpg`. Oyun/server/Android/config
kaynakları HEAD'e göre temiz, bu tur test/kurulum/deploy/commit/push yok.
OAuth panel sonucu cihaz girişi, marka onayı veya Play üretim yayını değildir.
Önceki Testing / Publish app basılmadı kayıtları aşağıda tarihçedir.

## Önceki tamamlanan aşama — 10 Ekim: Data Access kaydı

Kullanıcı mevcut Google projesine yalnız aşağıdaki üç kapsamın kaydını açıkça
onayladı ve Edge'de kendisi seçti. Agent38 satırın tamamında seçili kümenin
yalnız bu üç kapsam olduğunu kontrol ederek Update → Save yaptı:

| Kapsam | Mevcut kodla eşleşmesi | Panel sınıflandırması |
| --- | --- | --- |
| `openid` | Normal Google girişindeki kimlik doğrulaması | Non-sensitive |
| `https://www.googleapis.com/auth/games_lite` | PGS server-access varsayılanı | Non-sensitive |
| `https://www.googleapis.com/auth/drive.appdata` | PGS server-access varsayılanı; uygulamaya özgü veri | Non-sensitive |

Yeniden yükleme sonrası üç satır korundu, Save pasif; sensitive/restricted
listeleri boş. E-posta/profil, legacy `games`, Gmail, tam Drive veya
`androidpublisher` eklenmedi. Publisher kapsamı oyuncu consent'i değildir.
Kaydedilmiş Oyunlar kapalı kaldı; scope beyanı özellik etkinleştirmez.

Kod kanıtı: `server/app/platform_services.py` Google authorize için yalnız
`openid`; `android/app/src/main/java/com/gridshard/nativeui/GridshardPlayGames.java`
iki parametreli `requestServerSideAccess(client, false)` kullanır, ek
EMAIL/PROFILE istemez. PGS SDK22.1.0 korunur. Client PGS testleri **6/6** geçti;
ilk yanlış root-cwd denemesi fixture-path ENOENT idi. Yerel `.venv` pytest
içermediği için backend focused testleri çalışmadı; bağımlılık kurulmadı.
Oyun kaynakları HEAD'e göre değişmedi; bu konsol işi yeni server/APK/AAB testi
veya gerçek cihaz giriş başarı kanıtı değildir.

Verification Center yalnız Testing nedeniyle verification gerekmediğini
bildiriyor. Audience External/Testing ve11 test kullanıcısı korunur;
Publish app artık etkin ama kullanılmadı. Ayrı action-time onayla yalnız
OAuth In production geçişi yapılabilir; bu Play üretim dağıtımı veya ödeme
açılması değildir. Sonra Verification Center gerçek marka/alan gereklilikleri
okunmalı, brand verification veya alan sahipliği tamamlanmış varsayılmamalı.
Google'a verification gönderme adımı ayrıca kapsam/onay gerektirir.

Kanıt: `test-results/oauth-publishing/data-access-saved-20261010.jpg` ve
`audience-before-publish-20261010.jpg`. Sunucu/r13/Playv4/ödeme/ürünler,
PGS credential'ları, IAM/Billing korunur; commit/push yapılmadı.

Resmî kaynaklar: [PGS server access](https://developer.android.com/games/pgs/android/server-access),
[Data Access](https://support.google.com/cloud/answer/15549135?hl=en),
[Audience](https://support.google.com/cloud/answer/15549945?hl=en),
[OAuth ve brand verification](https://support.google.com/cloud/answer/13463073).

## Önceki tamamlanan aşama: Terms ve Google bağlantısı

Kullanıcı mevcut Cloudflare projesine21 dosyalık TR/EN Terms yayınını ve yalnız
Google Branding Terms URL Save işlemini ayrıca onayladı. Edge upload izni
değiştirilmeden kullanıcı ZIP'i elle seçti; agent Production Save and deploy
yaptı. Deployment `528af2d9-8685-4649-826f-1fe24ddd0473` başarılı.
`https://gridshardgame.com/terms/` ve `/en/terms/`14 maddeyle canlı.
10HTML+app-ads.txt **11/11 HTTPS200**, manifest ile tam boyut/SHA eşleşmesi,
script-free CSP/no-transform/plain mailto ve script/obfuscation yokluğu doğrulandı.
Yayının tarih/saat kanıtı9Ekim23:57TR HTTPS kontrolü ve sonraki panel kaydıdır.

Mevcut Google Branding logo/home/privacy/domain/contact zaten kayıtlıydı.
Yalnız Terms URL `https://gridshardgame.com/terms/` eklendi; Save sonra reload,
korunmuş alan değeri ve pasif Save doğrulandı. Branding hâlâ **Testing**.
OAuth üretime geçiş/marka doğrulaması veya Play uygulama üretim yayını yapılmadı.
PGS yayımlanmış altı credential korunur; Data Access gerçek kapsamları ve
gereken alan sahipliği/marka kanıtı ayrı açık kapılardır.

Yerel doğrulama15/15 test ve18 Edge DOM/layout kontrolü; headless Chromium
yok, kurulmadı, Edge fallback kullanıldı. Geçici viewport reset ve loopback
sunucu durdurma yapıldı. ZIP21files/261327bytes/SHA256
`60bd39d1d288e876b457c99c76dac98c9a4152a415b59356b45d248a2bb7b60b`.
İlk TR paragraftaki kaymış ifade EN anlamıyla uyumlu düzeltildi. Gizlilikte
yalnız eski sağlayıcı-hazırlığı cümlesi özellik bulunabilirliğiyle uzlaştırıldı.
Onaylı iade kuralları korunur; yayıncı-hatası istisnası/ayrıntılı bildirim kodu,
satış ön bilgisi/hukuki/yaş/ülke ve gerekiyorsa uygulama içi şartlar onayı satış
öncesi kapılardır. Site bu eksiklerin bittiğini veya ödemenin açıldığını iddia etmez.
Canlır13/Playkapalıtestv4/ödeme/ürünler/APK-AAB/IAM/Billing ve commit/push değişmedi.
Önceki Terms404, boş Branding ve yerel taslak kayıtları aşağıda tarihçedir.

## Önceki kayıt: ev bilgisayarında yayın kanıtı ve yerel Terms taslağı

Ev checkout'unda HEAD `748a8d523b5a4822059d8abd581588b42e75c008`; önceki devir
notları bu kullanıcı commit'inde mevcut. Bu tur başlamadan çalışma ağacı temizdi.
Ignored artifacts/görseller/provalar ve dış sırlar Git ile taşınmış sayılmaz.

- Son kullanıcı ekranları PGS özelliklerini, beş Android credential'ı ve bir
  oyun sunucusu credential'ını **Yayınlandı** gösteriyor. Yayınlama ekranında
  **Yayınlanacak değişiklik yok**. PGS yayını doğrulandı; tekrar yayınlama veya
  yeni credential oluşturma gerekmez. Mevcut kimlikler/isimler korunur.
- Google Auth Platform Audience ayrı olarak **External / Testing**, 11 test
  kullanıcısı/100 sınırı gösteriyor. Publish app, Branding tamamlanmadığı için
  pasif. OAuth üretim geçişi veya marka doğrulaması yapılmış sayılmaz.
- Son Branding ekranlarında ad/destek/geliştirici iletişimi var; logo, ana sayfa,
  gizlilik, Terms ve yetkili alanlar boş. Sonrasında kaydetme kanıtı gelmedi.
  Data Access gerçek kapsamları ve alan sahipliği doğrulaması henüz incelenmedi.
- TLS doğrulanmış salt-okunur GET: ana sayfa ve `/privacy/` HTTPS200,
  `/terms/` HTTPS404. Olmayan Terms bağlantısı girilmez.
- Kullanıcı TR/EN Terms metnini uygun buldu, ortak iade/eksi bakiye politikasını
  "anlaşalım" ile onayladı. Yerel metin bölüm9 ve `docs/STORE_PURCHASES.md`
  güncellendi. Açık yalnız ilgili para biriminde, oyunla kapatılabilir; gerçek
  para borcu/zorunlu alım/tek başına hesap veya ücretsiz maç engeli yok.
  Doğrulanmış yayıncı-hatası istisnası, ayrıntılı bildirim ve politika regresyonları
  **kodda henüz tamamlanmadı**. Yerel metin
  `docs/TERMS_OF_SERVICE_DRAFT_20261009.md`; yürürlük tarihi yok, satış ön
  bilgilendirmeleri/hukuki kontrol ve yayına hazırlık kapıları bekliyor.
  Bu taslak site üreticisine/yayın paketine eklenmedi; kamuya yayın onayı değildir.
- Yerel doğrulama: iki dilde 14 eşleşen bölüm ve yayın paketinden dışlama
  kontrolü geçti; mevcut public-site testleri **12/12**, `git diff --check`
  temiz. Hukuki uygunluk veya canlı Terms erişimi bu testlerle kanıtlanmaz.

Sıradaki Terms adımı eksik politika uygulamaları, yayına hazırlık ve ayrı onaylı
site entegrasyonu/yayınıdır. Onaylanmış iki dil canlıda doğru içerikle HTTPS200
vermeden Terms URL kullanılmaz. Branding/Data Access/Audience kapıları ayrıca
sürer. Canlı r13, ödeme kapalı, ürünler etkin değil ve Play kapalı test v4
korunur. Bu tur agent commit/push, SSH/deploy, APK/AAB, satın alma, yeni
anahtar/kapsam/IAM veya Cloud Billing/kart/deneme işlemi yapmadı.

## Amaç ve kapsam

Önce mevcut Play Games/OAuth yayın altyapısı hazırlanır. Kullanıcının bildirdiği
Play kapalı test v4 sürer; post-v4 uygulama değişiklikleri yerel commitlerde
korunur. Gerçek tester geri bildiriminden sonra sunucu/AAB ayrı hazırlanır.
Bu hazırlık canlı ödeme değişikliği, ürün etkinleştirme, satın alma veya
Cloud Billing/kart/deneme yetkisi değildir. Yeni OAuth istemcisi/anahtar,
geniş kapsam/izin veya yeni Google projesi oluşturulmaz.

## PGS özellikleri: ekran kanıtı ve sıradaki kayıt

- Proje/oyun kimliği 376018782491. Önceki 5/6/yayın bekliyor kanıtının yerini
  evde paylaşılan **Yayınlandı** ve **Yayınlanacak değişiklik yok** ekranları aldı.
- Son iki özellik ekranında görünen ad GRIDSHARD, TR/EN açıklamaları ve
  Strateji kategorisi kaydedilmiş görünüyor. Önceki boş alan kaydı güncel değil.
- Kullanıcı varsayılan dili Türkçe yaptığını ve kaydettiğini bildirdi;
  İngilizce ek çeviri olarak korunur. Son Yayınlama ekranındaki tr-TR ad
  gereklilikleri yeni varsayılan dil bilgisiyle tutarlı.
- Kullanıcı kontrollü dil geçişinde özellik grafiğini değiştirince diğer
  dilde de aynı son görselin göründüğünü açıkladı. Mevcut formdaki grafik
  alanı ortak olarak ele alınır. Önceki ayrı dil grafikleri/ters kaydedildi
  yorumu yanlıştı; aynı görseli dil değiştirerek tekrar tekrar yüklemeyin.
  Varsayılan Play mağaza girişindeki görselin aynısı kullanılır; Türkçe
  mağaza ana içeriği için mevcut Türkçe grafik tercih edilir. Bunun mevcut
  Play mağaza grafiğiyle eşleşmesi ayrıca kontrol edilir.
- Yeni nesil kimlikler AÇIK, Recall KAPALI, Kaydedilmiş oyunlar KAPALI;
  Firebase bağlı değil. Bunlar değiştirilmez. Aynı paket için birden fazla
  mevcut Android credential ve oyun sunucusu credential'ı silinmez.
- Son yapılandırma ekranında altı mevcut credential adı GRIDSHARD ve tamamı
  **Yayınlandı** görünüyor: dört `com.gridshardgame.app`, bir
  `com.gridshard.remotedebug` Android kaydı ve bir oyun sunucusu kaydı.
  Önceki Yayınlamaya hazır/taslak kayıtlar artık güncel durum değildir.
- Kullanıcı yalnız mevcut ad alanlarını tamamlayarak ilerledi. OAuth client
  ID/paket/SHA/sırlar değiştirilmez. Eski `com.gridshard.remotedebug` TEST
  Android credential korunur; yeni yüklemeler seçimi ve korsanlık ayarları
  değiştirilmez. Bu credential, Play kapalı test kanalı değildir.
- PGS yayımlandı; tekrar Yayınla adımı önerilmez. Resmî belgeye göre PGS
  yayını, yapılandırılmış hizmetleri oyunun kurulu
  kopyalarına açar; APK/AAB yayımlamaz veya uygulamayı Play'de üretime açmaz.
  Yayılım iki saate kadar sürebilir; tester verileri otomatik silinmez.
  OAuth Audience/Branding ayrı açık kapıdır; PGS yayını onu üretime geçirmez.

Metin kaynağı `docs/PLAY_STORE_LISTING.md`; görseller
`artifacts/play-store-listing-20261007/en-US/feature-graphic-1024x500.png`,
`artifacts/play-store-listing-20261007/tr-TR/feature-graphic-1024x500.png` ve
`client/assets/branding/gridshard-store-icon-512.png`.

## OAuth/marka kontrolü — Terms yayını öncesindeki tarihçe

Cloud Branding ekranında GRIDSHARD ve mevcut destek/geliştirici iletişimi
var; logo, ana sayfa, gizlilik, şartlar ve yetkili alanlar boş.
TLS doğrulanmış salt-okunur kontrolde `https://gridshardgame.com/` ve
`https://gridshardgame.com/privacy/` HTTP200; `/terms/` HTTP404.
Olmayan kullanım şartları sayfasını varmış gibi girmeyin. Yerel iki dilli
metin/politika kullanıcı tarafından onaylı; eksik uygulama/hukuki kontrol,
yürürlük tarihi, site entegrasyonu ve
ayrı kamuya yayın onayı bekler. Data Access gerçek kapsamları ve gereken alan
sahipliği kanıtı ayrıca bekliyor. Audience son ekranında External/Testing.

PGS yayını, OAuth Audience üretim durumu/marka doğrulaması ve Play uygulama
üretim dağıtımı farklı işlemlerdir. Yalnız PGS yayını ekranlardan doğrulandı;
OAuth veya Play uygulama üretim geçişi doğrulanmadı.

## Korunan kod ve sonraki sürüm

HEAD `748a8d523b5a4822059d8abd581588b42e75c008`; server/app, client, android,
config kaynaklarında HEAD'e göre kayıtsız değişiklik yok. Public-site ve ilgili
build/check/test araçları bu onaylı Terms akışında değişti; yerel kaynak/doküman
değişiklikleri commit/push yapılmadığından korunmalıdır.
Kullanıcının diğer kirli dosyaları korunur; commit/push/reset yapılmaz.
Gelecek deploy öncesi taze onay, doğrulanmış yedek, yalıtılmış test ve oyuncu
hesabı/verisi koruma kapıları yeniden gerekir. AAB sürüm kodu güncel Play
kaydıyla karşılaştırılarak kullanılmamış daha yüksek bir değer seçilir.
Yeni sürüm tek başına kapalı test katılım/gerçek geri bildirim koşullarını
tamamlamaz; bunlar Play panelinden ayrıca doğrulanır.

## Resmî başvuru kaynakları

- https://developer.android.com/games/pgs/console/setup
- https://developer.android.com/games/pgs/console/publish
- https://support.google.com/googleplay/android-developer/answer/2990418?hl=en
- https://support.google.com/cloud/answer/15549049?hl=en
- https://support.google.com/cloud/answer/15549945?hl=en
- https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
