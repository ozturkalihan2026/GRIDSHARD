# GRIDSHARD — üretime geçiş kontrol kaydı

Güncelleme: 10 Ekim 2026, Türkiye saati. Bu belge hazırlık durumudur; genel
yayın veya tüm ürünlerin satışa açılması onayı değildir. Güncel kayıt önceki
checkpoint ve yayın notlarındaki tarihsel “henüz test edilmedi” satırlarına
göre önceliklidir.

## Güncel — 10 Ekim 23:03 TR, premium iade kuralı yerel aday / yayın kapısı açık

Kullanıcı yeni kurallı sezon geçişlerinde yalnız premium kaynak ve gerçek
sandık çıktılarının bir kez geri alınmasını, harcanmış miktarın aynı kaynakta
oyunla kapanan açığını ve ücretsiz ilerlemenin korunmasını onayladı. Yerel
kod/test/TR-EN Terms taslağı hazır; varsayılan legacy ve UTC yürürlük kapısı
kapalı. Eski Uç test kazanımları retroaktif etkilenmez. Makbuz verified tarih,
değişmez policy stamp ve pre-checkout consent; restart/repurchase/reversal/
past-season/idempotency ve publisher-error causal düzeltme kodlandı.

1410 sunucu PASS /41 skip,293 istemci PASS,24 build-site PASS;31 script gerçek
client kaynakları disk çıktısını değiştirmeden derlendi. Yeni Ruff kontrolleri
geçti;4eski HEAD-unused bulgusu ayrıca kaydedildi. PostgreSQL/Redis tanımlı
olmadığından yeni2SQL rollback/restart testi yerelde PASS değildir; migration
CI dosyasına eklendi. Kanıt/taslak:
`test-results/premium-recovery-candidate-20261010.json`,
`docs/PREMIUM_REFUND_POLICY_V1_DRAFT_20261010.md`.

Yeni commit/push kullanıcıya ait; aynı commit yeşilCI, yeni APK/AAB kapalı test,
SQL/race/backup kontrolleri ve ayrı Terms/UTC/deploy onayı hâlâ gerekir. v6
AAB bu yerel aday kodunu içermez. Savaş Premium bonus clawback bu adayda yok;
ayrı teslim/iade testi açıktır. Genel üretim hazır/yayımlandı iddiası yok.

## Önceki — 10 Ekim 22:22 TR, mevcut iade akışı geçti; suistimal açığı açık

Kullanıcı normal kapat/aç sonrası pasif sezon geçişini,1110Akı/5476kredi
bakiyelerini ve mağazanın normal çalışmasını doğruladı.22:22:02 READ ONLY
aynı tek refunded makbuz/ledger/history1/hakfalse/claimed17; daha sonraki
doğal scan21:53:52 seen1/applied0. Mevcut politika teslim/iade ve kalıcılık
testi geçti; yeni cihaz görüntüsü veya forced replay değildir.

Kullanıcı ödülleri alıp sezon geçişini iade ederek bedelsiz kazanım sağlama
riskini tespit etti. Kaynakta revoke_purchase yalnız hakkı kapatır; premium
claim ve premium sandık çıktılarında alım bazlı clawback defteri yoktur.
Yayımlanmış Terms9 da önceki ödülleri korur. Üretim öncesi politika kararı
gerekir: öneri, açıkça yeni kuralla sunulan alımlarda yalnız premium kaynak
kazanımlarını (sandıkların gerçek içerikleri dahil) makbuza bağlayıp bir kez
geri alma; harcanan kaynağın aynı kaynakta oyunla kapatılabilen açığı. Ücretsiz
hat/XP/kupa/maç geçmişi korunmalı; doğrulanmış yayıncı hatası oyuncuya açık
yüklememeli. Sezon değişimi, iade sonrası yeniden alım/restore ve yinelenen
bildirimlerde adil ve tek uygulama testleri gerekir. Onaylanmış politika
değişikliği, yeni kaynak kodu/Terms yayını/canlı kesinti yok. Eski Uç test
ödüllerine retroaktif müdahale yapılmaz. Bu üretim kapısı açık tutulur.
Kanıt `test-results/billing-v6/season-pass-refund-uc-20261010.json`.

## Önceki — 10 Ekim 20:24 TR, sezon geçişi sunucu iadesi geçti

Kullanıcı eşleşen ücretsiz test siparişinde iade/hak geri alma adımını
tamamladı. 20:22:05 TR Google Voided Purchases GET exact-match1, geliştirici
başlatmış, voided_at20:17:40 TR. 20:23:51 TR doğal worker seen1/applied1;
20:24:24 TR READ ONLY tek makbuz/ledger refundedtrue/history1, Google voided
işlenmiş ve sezon hakkıfalse. Alınmış17 premium tier/1110Akı/5476kredi korundu;
Savaş Premium false ve makbuz/ledger0 değişmedi. Mevcut politika aynıdır.
İlk erken provider0 ve worker öncesi haktrue tanıkları proof'ta korunur.

İade sonrası telefon normal reopen/pasif hak/aynı bakiyeler/mağaza normal
teyidi soruldu; yanıt bekliyor. Sonraki doğal scan repeat-idempotency henüz
doğrulanmadı. Agent ödeme/iade/manual scan/restart/bakiye veya hak write
yapmadı. Ham order/hash/token yok; kaynak/CI/AAB ve genel yayın kapıları aynı.
Kanıt `test-results/billing-v6/season-pass-refund-uc-20261010.json`.

## Önceki — 10 Ekim20:14TR, sezon geçişi teslim ve kalıcılık geçti

Uç/Ücretli Sezon Geçişi kullanıcı alımı sonrası20:09/20:10/20:13 scoped READ
ONLY aynı tek test makbuzu/tek ledger/consume/sezon hakkı ve grant-current
stored season eşleşmesini doğruladı. Normal kapat/aç kullanıcı hakkın devamını
ve mağazanın çalışmasını teyit etti; sonraki server aynı1110Akı/5476kredi/
claimed17. Başlangıç842/1456/claimed0 idi: ödül alınmadan izole test koşulu
korunmadı; bakiye delta'nın tamamı belli bir ödül grubuna ayrıca atfedilmedi.
Forced replay veya server restart testi değildir. Checkout test kartı/no-charge
görüntüsü değil kullanıcı teyididir; yeni receipt_is_testtrue bağımsızdır.

20:12 Console listesi Test: Ücretli Sezon Geçişi/İşlendi/199,99TRY/20:07
alımı;20:13:58TR RAM-only exact-order karşılaştırması profil makbuz1/ledger1/
console_order_matchestrue. Agent payment/refund/manual scan veya kalıcı write
yapmadı; ham order/hash/token/hesap kimliği dosyaya yazılmadı. **Sezon geçişi
iadesi hâlâ açık.** Sırada yalnız bu exact ücretsiz siparişin insan tarafından
tam iadesi+hak geri alma; doğal worker sonrası hakkın bir kez kapanması ve
mevcut politikaya göre alınmış17 ödülün korunması. Savaş Premium makbuz0/
ledger0/hakfalse, kendi teslim ve iade testleri yapılmadı. Genel production
kapıları/source/CI/AAB aynı. Kanıt
`test-results/billing-v6/season-pass-purchase-uc-20261010.json`.

## Önceki — 10 Ekim20:04TR

Kullanıcı onaylı ZIP'i Cloudflare'de yükleyip Save'i tamamladı; agent submit
yapmadı. Success ekranı ve yenilenmiş gridshard-public/Production/domain
kaydı b92f1b0b-8330-4546-bd38-a8506d19ccdb doğrulandı. **Terms canlı:** anonim
HTTPS10 TR/EN sayfa+app-ads.txt11/11 HTTP200/byte/SHA/header adaya eşit.
Yalnız TR/EN Terms değişti;14 madde/iade/eksi bakiye/premium kuralları aynı.
Kanıt `test-results/public-site/terms-production-live-20261010.json`.

**V6 native ürün bulunabilirliği geçti:**20:02:55TR ADB tek cihaz/Play/v6;
20:01TR iki current-process kimliksiz query code0/fetched10/unfetched0.
Tüm tek tek fiyatların UI görüntüsü ayrıca alınmadı. Önceki1/9 gözlemler
tarihseldir; nedenin kesin yayılım/önbellek tanısı yapılmaz. Kanıt
`test-results/billing-v6/device-all-products-v6-20261010.json`.

**Premium teslim/iade hâlâ açık:**20:04:15TR dar READ ONLY Uç iki hakfalse/
claimed tier0/iki premium makbuz ve ledger0; güncel842Akı/1456kredi. Kullanıcı
ücretli sezon geçişi checkout always-approve test kartı+no-charge uyarısını
teyit etti, fakat yeni screenshot görülmedi. Ek görüntü istemeden devam
talebi üzerine final alımı yalnız insan tamamlayacak: doğru ürün/test kartı/
no-charge uyarısı görünür değilse durmalı. Agent payment/refund/manual scan
veya kalıcı write yapmadı. Tek ücretsiz alım sonrası hak/receipt/ledger/
consume/normal reopen doğrulaması bekler. Google/OAuth/release/server/AAB
değişmedi; genel erişim/rapor/vitals/savaş QA/yedek operasyonu ayrı kapılar.
Kanıt `test-results/billing-v6/premium-pre-purchase-uc-20261010.json`.

## Önceki katalog takibi — 10 Ekim19:02TR

Son kullanıcı bildirimi “Geldi butonlar”: mağaza görünürlüğü iyileşti.
Tek tek fiyatlar ve tam görüntülenen ürün adedi için yeni ekran yok.
19:02:20TR salt-okunur ADB yetkili fiziksel cihaz0; native10 fetched/0
unfetched yeniden doğrulaması yapılamadı. Kullanıcı görünürlük teyidi ile
önceki bağımsız Google10/10 ACTIVE kanıtı ayrı tutulur. Yeni ödeme veya
ayar müdahalesi yok; premium teslim/iade ve Terms yayını henüz tamamlanmadı.

Kullanıcı tüm satın alma seçeneklerini etkinleştirdi. Tek salt-okunur Google
oneTimeProducts GET200/complete single page10 ürün/10 ACTIVE seçeneği bağımsız
doğruladı. Her birinde tek standard/legacyCompatible=true/yalnız TR AVAILABLE.
Önceki fiyatlar korunuyor:120/260/480/1050 Akı29,99/59,99/99,99/199,99TL;
1000/2200/4000/9000 kredi aynı fiyat dizisi; iki premium199,99TL.

18:23:42TR ADB tek yetkili cihaz/v6/current process;18:23:04TR iki native
query code0/fetched1/unfetched9. Tüm ürünlerin telefonda bulunabilirliği
henüz doğrulanmadı; kullanıcıdan normal kapat/aç+mağaza fiyat ekranı istendi.
Google güncellemelerinin cihazlara yansıması gecikebilir; bu olasılık burada
kesin neden olarak kanıtlanmadı. [Resmi katalog yayılım açıklaması](https://developer.android.com/google/play/billing/manage-catalog?hl=en).
Önceki120Akı testleri tüm diğer ürün/premium teslim ve iade kapsamı değildir.
Güvenli kanıt `test-results/billing-v6/catalog-all-active-20261010.json`.

Agent provider write/ödeme/iade/deploy/install/uninstall/data clear/app launch
veya log clear yapmadı. Terms yayını onaylı fakat önceki tur Computer Use
Edge URL doğrulama engeliyle durdu;10 Ekim adayı henüz yayımlanmadı. Genel
üretim erişimi/rapor/vitals/savaş QA/backup operasyonu kapıları değişmedi.
Source/CI/AAB ve14 madde/iade/eksi bakiye politikası aynı.

## Terms ve premium hazırlığı — 10 Ekim19:11TR

Mevcut Cloudflare Pages gridshard-public/Production/domain browser-first CUA
ile doğrulandı; önceki Production528af2d9. Onaylı ZIP SHA6e892191... ve21
allowlisted dosyanın manifest isim/size/hash'leri tekrar eşleşti. Form
Production seçili fakat filechooser local file URL izni nedeniyle setFiles
başarısız. İzin/güvenlik değişimi yok; dosya listesi boş ve Save and deploy
disabled. Elle ZIP seçimi kullanıcıya soruldu; final yayın action-time onayı
ve sonrası live byte kontrolü bekliyor. **Henüz yeni Terms yayını yok.**
Kanıt `test-results/public-site/terms-publication-preflight-20261010.json`.

19:11:12TR scoped READ ONLY premium baseline: Uç tek profil/stored season
mevcut; ücretli sezon geçişi ve Savaş Premium haklarıfalse; claimed premium
tier0, her ürünün profil makbuz/ledger sayısı0; Akı838/Devre Kredisi1404.
19:11:13TR USB yetkili cihaz0; bağlantı+Uç Mağaza hazırlığı istendi. Kaynak
kuralları tekrar okundu: haklar ilgili sezon için, aynı sezondaki iade hakkı
kapatır; geçmiş claim ödülleri geri çekilmez. Bu, canlı teslim/iade PASS
değildir; ücretsiz test/no-charge ekranı görülmeden final satın alma onayı
yok. Agent ödeme/iade/manuel worker/scan/kalıcı write yapmadı. Kanıt
`test-results/billing-v6/premium-baseline-uc-20261010.json`.

## Google tarafındaki güncel durum

- Kontrol paneli ekranı `Ekran görüntüsü_10-10-2026_13058_play.google.com.jpeg`:
  güncelleme **İncelemede**, üretim **Etkin değil**, kapalı test yayını ve
  12 katılımcı koşulu işaretli; **12 test kullanıcısı 1 gündür kayıtlı**.
  14 günlük koşul henüz tamamlanmamış; “Üretime başvur” kapalıdır.
- **V6 kurulu:**17:53:11TR salt-okunur ADB canonical paket/versionCode6/
  versionName2.1.0-beta.72/Google Play installer; device update17:11:39.
  Güncel process/tag-only17:51:21TR ürün query code0/fetched1/unfetched9;
  kullanıcı120Akı29,99TL ve bakiyeler aynı838/1404 teyidi. Temel mağaza geçti;
  önceki ödeme testleri v6'da yeniden çalıştırılmış gibi gösterilmez. Yeni
  konsol review/üretim statüsü ayrıca açılmadı. Kanıt
  `test-results/billing-v6/device-v6-store-check-20261010.json`.
- **Ön lansman sonucu yok:**17:55 Genel bakış boş durum; sürüm/rapor/issue
  sayıları görünmüyor.17:57 Ayarlar kimlik bilgisi sağlama,3 boş deep link,
  özel dil veya Robo script yok; raporu kapatan görünür kontrol yok. Bu,
  raporun neden oluşmadığının kesin tanısı veya sıfır hata PASS değildir.
  Google rapor üretimini cihaz laboratuvarının kapasitesine bağlı yapar;
  birkaç saat gecikme olabilir. Yeni AAB/upload/ayar değişikliği yapılmadı.
  [Resmi rapor üretimi](https://support.google.com/googleplay/android-developer/answer/9842757?hl=en).
- Uygulama içeriği ekranları `..._13948_...` ve `..._131024_...`:
  **tamamlanmayı bekleyen beyan yok / 10 beyan tamamlandı**. Görünenler veri
  güvenliği, finans özellikleri, reklam kimliği, hedef kitle/içerik, içerik
  derecelendirmeleri, resmi kurum ve sağlık uygulamaları, oturum açma bilgileri,
  reklam ve gizlilik politikasıdır. Form ayrıntıları açılmadı; bu liste
  beyanların teknik veya hukuki doğruluğunun ayrıca onaylandığı anlamına gelmez.
- Önceki doğrulanan OAuth/PGS/Branding kayıtları korunur. Tekrar OAuth Publish,
  yeni kapsam, PGS yayını veya Cloud Billing/PubSub/RTDN kurulumu gerekmez.

Google, en az 12 kişinin en az 14 gün kesintisiz katıldığı kapalı testin
ardından üretim erişimi başvurusu ister. Süre dolması otomatik üretim onayı
değildir; katılımın yanında test, geri bildirim ve hazırlık soruları vardır.
Test sürümü güncellenebilir; katılımcılar testten ayrılmamalıdır.
[Resmi test ve başvuru koşulları](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## Bu turda doğrulananlar

Son takip17:04TR: Önceki iadenin sonraki doğal taramaları16:23/16:53TR
seen1/applied0;16:51 ve17:00 dar READ ONLY aynı tek history/debit120 ve
838→718 etkisini doğruladı. **İade ikinci kez kesilmedi.** Always-denied
test ekranı ve16:51 sunucu kontrolünde yeni makbuz/grant yok718/kredi1404.
16:58 pending sipariş ekranı, kullanıcı iptal bildirimi ve16:59/17:00 kontrolü:
yeni grant yok718/1404; kullanıcı bakiye/mağaza normal teyidi.

Yavaş-onay17:01 ekranında bekleme mesajı/718;17:02:06TR sunucuda hâlâ tek
eski makbuz/defter, yeni grant yok.17:02:51TR ödeme sonrası yeni teslim;
17:03:14TR tek yeni test makbuzu/ledger/order/sahip/grant eşleşmesi,
grant120/consumed=true/refunded=false, Akı838/Devre Kredisi1404. Kullanıcı
normal kapat/aç sonrası aynı bakiyeler/mağaza normal teyidi;17:03:58TR
READ ONLY aynı tek yeni kayıt ve bakiyeyi doğruladı. Toplam iki başarılı test
makbuzu: önceki iade edilmiş + yeni alım. **Yavaş onayda erken teslim yok,
onay sonrası tek teslim ve normal reopen'da tekrar teslim yok doğrulandı.**
İki yavaş testi kullanıcı kendisi başlattı; ön-onay test yöntemi/no-charge
ekranı görülmedi. Başarılı yeni makbuz test=true ayrıca doğrulandı. Bekleyen
ret sırasında restart açıkça doğrulanmadı; forced receipt replay yapılmadı.
Güvenli kanıtlar `test-results/billing-v6/refund-repeat-and-decline-uc-20261010.json`
ve `test-results/billing-v6/pending-tests-uc-20261010.json`.

Önceki iade takibi13:55TR: Kullanıcı aynı tek ücretsiz120Akı test siparişinin iadesini
tamamladı;13:36 ekranında “Geri ödeme yapıldı”/toplam0,00TRY.13:40:58TR
mevcut WIF Voided Purchases GET hak geri alma kaydını doğruladı. Normal
13:53:46TR taraması1 kayıt gördü/1 iade uyguladı;13:55:21TR READ ONLY kontrol:
makbuz/defter refunded=true, voided event işlenmiş, history/debit_count1,
refund_effect flux_shards838→718/debit120/waived0. Kullanıcı cihaz718 bildirdi;
Devre Kredisi önceki13:42 ve sonraki13:55 tanıkta1404. **İlk alım/teslim/iade/
kalıcı hak geri alma akışı geçti.** O13:55 snapshot'ında sonraki doğal tarama
henüz doğrulanmamıştı; yukarıdaki yeni kanıt önceliklidir. Forced replay yok.
İade sonrası ilk kullanıcı yanıtı kapat/aç
eylemini ayrıca belirtmedi. Diğer ürün/premium/eksi bakiye senaryolarını kapsamaz.
Agent yeni iade/revoke/consume/manual scan veya bakiye müdahalesi yapmadı.
Güvenli yerel kanıt:`test-results/billing-v6/refund-uc-server-applied-20261010.json`;
önceki provider/pre-refund snapshotları korunur.

| Kontrol | Sonuç / kanıt sınırı |
| --- | --- |
| V6 cihaz / temel mağaza |20:02TR ADB versionCode6/Play installer;20:01TR iki query0/10 fetched/0 unfetched. Native10 ürün bulundu; tümrace/yeni v6 ödeme veya tek tek UI fiyatları kanıtı değildir. |
| Diğer9 native product sonucu | Önceki PRODUCT_NOT_FOUND sonuçları tarihsel. Güncel iki query tüm10 ürünü getiriyor; kesin gecikme/önbellek nedeni kanıtlanmadı. |
| Ön lansman | Genel bakış sonuçsuz boş; Ayarlar incelendi, görünen kapatma kontrolü yok. Exact cause ve stability/performance/accessibility sonuçları bilinmiyor; yeşil rapor sayılmaz. |
| Uç / 120 Akı ücretsiz test | Google test kartı ve ücret alınmayacağı bildirimi görsel doğrulandı; kullanıcı onay/oyuna dönüş/+120 bildirdi. |
| Kalıcı teslim | 12:56:44 TR dar PostgreSQL READ ONLY kontrolü: tek makbuz + tek eşleşen defter, test=true, grant120, consumed=true; bakiye832. Ham order/token kaydı yok. |
| Normal kapat/aç | Kullanıcı başka alım/harcama olmadan bakiyenin832 kaldığını doğruladı. Bu, canlı receipt replay testi değildir. |
| Odaklı backend ödeme/iade testleri | **99/99** geçti; skip yok. Bir mevcut Starlette/httpx deprecation uyarısı korunur. |
| Ek yerel iade/reconciliation/policy koşusu | **51/51** geçti; failure/error/skip0. Normal izole pytest/JUnit; canlı negatif bakiye veya tüm ürünlerde cihaz testi değildir. |
| Billing / mağaza istemci testleri | **17/17** geçti. |
| Terms / public site / destek saklama testleri | Yerel son değişiklikle **26/26** geçti. Destek testleri canlı Gmail işlemi değildir. |
| Site görünüm kontrolü | **30/30** yerel TR/EN sayfa kontrolü:1280,393,320px; yatay taşma, script/form ve dış istek yok. Chromium cache eksikti; kurulu Edge ile başlıksız, yalnız loopback test tamamlandı. |
| Önceden yayımlanmış site | 13:03:56 TR anonim HTTPS kontrolü:10 TR/EN sayfa + app-ads.txt **11/11**200/hash/header kontrolü. Bu, aşağıdaki yeni Terms adayının yayımlandığı anlamına gelmez. |
| Canlı sunucu | 13:05:11 TR salt-okunur kontrol:4 container çalışıyor, relay/PG/Redis healthy, restart sayıları0, r14 image pini aynı, health/worker lease hazır. |
| Google iade taraması | Aktif,1800sn aralık;22:22 tanığında son başarılı doğal koşu21:53:52TR, seen1/applied0. Sezon geçişi ilk iadesi20:23:51TR applied1; tekrar etki yok. RTDN ayarları boş. Anlık iade teslimi garantisi yok. |
| Uç / 120 Akı iadesi | Google iade/hak geri alma + normal worker ters kaydı838→718/debit120/history1; sonraki doğal scan'ler applied0/tek kesinti. Diğer ürün/eksi bakiye canlı iade testi değildir. |
| Ret / bekleyen→iptal | Always-denied ekranı + yeni grant yok; pending console ekranı→kullanıcı iptal teyidi→yeni grant yok718/1404. Mağaza normal kullanıcı teyidi. Ret için pending sırasında restart ayrıca yapılmış sayılmaz. |
| Yavaş-onay / tekrar alım / normal reopen | Pending sırasında yeni grant yok718; sonrasında tek yeni test makbuzu/ledger/grant120/consume838/1404. Normal reopen sonrası kullanıcı ve17:03:58TR READ ONLY aynı kayıt/bakiyeyi doğruladı. |
| Katalog |18:25TR GET10 ürün/10 ACTIVE/standard/legacyCompatible/TR ve fiyatlar aynı;20:01TR v6 native iki query10 fetched/0 unfetched. Agent provider write yapmadı. UI tek tek fiyatlar ve premium teslim/iade ayrı kapsamdır. |
| Yeni Terms canlı yayını | Kullanıcı ZIP+Save'i yaptı; Cloudflare Production b92f1b0b ve20:02TR HTTPS11/11 route200/byte/SHA/header adaya eşit.14 madde/iade/eksi bakiye aynı; yeni agent submit/Google yazması yok. |
| V6 Ücretli Sezon Geçişi teslim / normal reopen | Uç tek test makbuzu+ledger/consumed/current-season grant ve haktrue. Normal reopen sonrası aynı kayıt/hak/1110Akı-5476kredi/claimed17; Console exact-order RAM eşleşmesi true. Forced replay veya tüm premiumlar PASS değildir. |
| Sezon geçişi iadesi / Savaş Premium | Google GET exact-match ve doğal worker applied1; tek refunded/history1/hakfalse. Telefon reopen kullanıcı teyidi ve sonraki doğal scan applied0 geçti;17 tier/1110Akı/5476kredi korundu. Ödül-retention suistimali için politika kararı açık. Savaş Premium makbuz/ledger0/hakfalse; kendi alım/iade testi açık. |
| Kaynak / CI / AAB | a451221 exact-commit Quality38034762931 yeniden kontrol edildi:5/5 success. V6 AAB hash pini yeniden aynı. Bu CI yeni Terms değişikliğini içermez. |

İlk test koşularındaki sandbox geçici dosya/hard-link/loopback izinleri ve
istemci çalışma dizini sorunu, normal yerel çalıştırma ve doğru cwd ile
giderildi; uygulama hatası olarak gösterilmez. Bu tur tam sunucu/istemci
paketi yeniden çalıştırılmadı; dondurulmuş v6 için yukarıdaki exact CI vardır.

## Terms düzeltmesi — kullanıcı yayımladı,20:02TR canlı doğrulandı

`public-site/terms.js` TR/EN girişinde eski “satın almalar etkin değil”
ifadesi kaldırıldı. Genel yayın henüz yok; ürün bulunabilirliğinin sürüm,
kanal ve ülkeye bağlı olduğu, kapalı teste katılmanın alımları kendiliğinden
ücretsiz yapmadığı ve yalnız Google Play test/no-charge ekranının ücretsiz
testi doğruladığı açıklandı. Daha önce kararlaştırılan **14 madde, iade,
eksi bakiye ve premium kuralları değişmedi**.

Sayfa üreticisi Terms'e ait10 Ekim tarihini kullanır; değişmeyen politikaların
9 Ekim tarihi korunur. Önceki yayımlanmış21 dosyalık ZIP ile byte karşılaştırması:
yalnız `terms/index.html` ve `en/terms/index.html` değişti.

- Hazır aday: `artifacts/public-site-terms-20261010-availability-candidate/GRIDSHARD-public-20261010-availability.zip`.
- 21 allowlisted dosya, ZIP içerik SHA/size eşleşmesi doğrulandı.
- ZIP SHA256:`6e8921912db9019bf9600b08b7cb60be9dcbfd44daf614130087e7c734b0d5ce`.
- Cloudflare Production yayını ve sonrasındaki canlı byte kontrolü **yapılmadı**.
- Terms URL aynı kalacak; Google Branding bağlantısını tekrar değiştirmek
  gerekmez. Oyun kodu, sunucu, APK/AAB veya OAuth yayın durumu değişmedi.
  Bu web değişikliği için AAB yeniden üretimi gerekmez.
- Kaynak commit/push kullanıcıya aittir. Yeni site değişikliği mevcut v6
  freeze/source ZIP içindeymiş gibi gösterilmez; mevcut AAB korunur.

Lisans-test ödeme yöntemleri, reddedilme ve gecikmiş ödeme senaryoları Google
tarafından sağlanır. Normal kapalı test kullanıcıları gerçek ücret ödeyebilir.
[Resmi Billing test rehberi](https://developer.android.com/google/play/billing/test).

## Tamamlanmadan “üretime hazır” sayılmayacak işler

1. **Google bekleme koşulu:**12 kesintisiz katılımcı/14 gün; üretim erişimi
   için güncel dashboard koşulu ayrıca doğrulanacak. V6 telefon versionCode6/
   Play installer ve temel mağaza kontrolü geçti. Kaldırma/veri silme ve
   upload-key APK ile Play kurulumunun üzerine yükleme yapılmayacak.
2. **Ödeme başarısız/bekleyen kapsamı:**120Akı'da always-denied/no grant,
   pending→iptal/no grant, yavaş-onay pending/no grant→tek grant/consume ve
   normal reopen/no second grant kanıtları alındı. Bekleyen-ret sırasında
   restart ve v6'da yeni ödeme/consume kapsamı ayrıca tamamlanabilir; temel
   v6 ürün query/kurulum kanıtı alınmıştır. Tüm ürünlere genellenmez.
   Gelecek işlemlerde ücretsiz test/no-charge ekranı görülmeden son onay yok.
3. **Ücretsiz test alımının iade/iptal ve hak geri alma kontrolü:** doğru tek
   test siparişi, Google hak geri alma, normal worker kalıcı ters kaydı ve
   sonraki doğal scan'de ikinci kesinti olmaması geçti. Tek120 debit838→718,
   kredi1404 korundu. Bu, diğer ürün/premium/eksi bakiye/forced replay testi
   değildir. Mevcut gerçek oyuncu bakiyesi/başka siparişlere toplu müdahale yok.
4. **Satışa açılan ürün kapsamı:** kullanıcı tüm seçenekleri açtı; bağımsız
   Google GET10/10 ACTIVE/TR AVAILABLE ve aynı fiyatları doğruladı.18:23TR
   cihaz sorgusu1 fetched/9 unfetched; tüm fiyatların görünürlüğü ayrıca
   kontrol edilecek. Özellikle premium süresi/tekrar alım/teslim/iade ve diğer
   ürün lisans-test teslimi tamamlandı sayılmaz. Aktivasyon normal kapalı test
   kullanıcılarına da gerçek ücretli satış açar; kullanıcıya bildirildi.
   Tüm ürünlerin aktif olması tek başına Google üretim erişimi onayı değildir.
5. **Sürüm değerlendirmesi:** güncel Ön lansman raporu/Android vitals,
   reviewer erişimi, ana giriş/hesap silme/reklam ödülü ve gerçek iki-telefon
   arkadaş/PvP maçı kontrolü. Donma/toplu hızlı akış,3-2-1 geri sayımı ve
   müzik/reklam sessizliği için gerçek cihaz geri bildirimi saklanır; önceki
   masaüstü/emüle testler bunların yerine geçirilmez. V6 kurulum/temel mağaza
   kanıtı alındı; Ön lansman sonucu yok, yeni vitals ve iki-telefon savaş QA
   sonucu yok. Rapor ayarlarında görünür kapatma kontrolü bulunmadı; exact
   neden bilinmiyor. Kimlik bilgisi/deep link/script sessizce değiştirilmeyecek.
6. **Operasyon:** düzenli yeni yedek oluşturma, hata bildirimi ve kurtarma
   hedefi/operatör yöntemi netleştirilmeli. Günlük30 gün saklama temizleme
   timer'ı aktif ve son çalışması başarılı.16 yedek var,30 günü geçen0;
   en yenisi10 Ekim01:52:34 TR,14:01 snapshot'ında12,15 saatlik ve SHA sağlam.
   Bounded systemd ExecStart/timer +4 sistem cron dosyası/root/ubuntu audit:
  2 tarihsel4Ekim transient device-migration backup job'u (ilk failed,
   sonraki r2 success), bunlara bağlı timer0, eşleşen cron job0. Retention
   service OnFailure bildirimi boş. Bu tarihsel job'lar günlük yaratım kanıtı
   değildir; **düzenli yeni yedek üretimi doğrulanmadı**. Dolaylı/dış scheduler,
   offsite ve EC2 snapshot denetlenmedi; tüm olası yedekleri yok sayma.
   Mevcut backup aracı live worker advisory lock'unda durur; düzenli üretim
   için operatör yöntemi/izin netleştirilecek, sessiz maç kesintisi/lock bypass
   yapılmayacak. Yeni timer/silme/restore/ücretli dış hizmet kurulmadı.
   Önceki isolated restore kanıtı korunur; bu tur yeni restore yok. Kanıt
   `test-results/production-backup-scheduler-readonly-20261010.json`.
7. **Son site ve beyan uyumu:** yukarıdaki Terms adayının onaylı yayını/canlı
   kontrolü. Uygulama içeriğinde eksik beyan görünmüyor; yeni SDK/veri işleme
   veya hedef ülke/yaş kapsamı değişirse form ayrıntıları kaynakla yeniden
   karşılaştırılır. Ekrandaki “tamamlandı” hukuki uygunluk garantisi değildir.

Geliştiricinin iadesinin Voided Purchases API'ye düşmesi için satın alma
hakkının da geri alınması gerekir; yalnız para iadesi testi bu kapıyı
kanıtlamaz. Bu nedenle doğru test siparişinde iade/geri alma seçeneği ayrıca
kontrol edilir. [Resmi Voided Purchases açıklaması](https://developers.google.com/android-publisher/voided-purchases).

## Üretim erişimi başvurusu için dürüst hazırlık

Başvuru henüz gönderilmez. Katılımcı listesi ve gün sayısını yeni dashboard
belirler; aktif oynama sıklığı bu ekranlardan çıkarılamaz. Aşağıdaki notlar
başvuruya otomatik cevap veya tamamlanmış test iddiası değildir:

- Bilinen geri bildirim: arkadaş/PvP maçında donma ve olayların toplu hızlı
  gösterilmesi; mağaza fiyatlarının görünmemesi/Billing bağlantı yarışı.
- Yapılanlar: kayıtlı savaş/refactoring çalışmaları; v6 native Billing
  bağlantı sıralaması ve kimliksiz ürün tanılaması; otomatik test/CI ve
  Uç hesabıyla120Akı test teslimi/iade/ikinci scan, ret ve pending testleri,
  yavaş-onay sonrası ikinci başarılı alım/consume/normal reopen kontrolü.
- Hâlâ gerçek veriyle tamamlanacak: test kullanıcılarının oynama sıklığı,
  denenmiş özellikler, cihaz/sürüm kapsamı, geri bildirim kanalı ve son
  düzeltmelerden sonra kalan sorunlar. “12 kişinin tamamı her gün oynadı”
  veya “tüm ürünler/iade senaryoları sorunsuz” gibi kanıtsız cevap yazılmaz.
- Nihai “hazır” cevabı ancak yukarıdaki kapılar geçtikten sonra verilir.
  Başvuru gönderme, üretim sürümü taslağı ve halka açık yayın ayrı kararlardır.

İnceleme için beyanlar ve kısıtlı alanlara erişim talimatları güncel olmalıdır.
[Resmi uygulama inceleme hazırlığı](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

## Korunan sürüm pinleri ve kanıtlar

- Source: `a45122176ea8c81ebd2de2f92052c884d9bad1ff`.
- [Exact CI38034762931](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/38034762931).
- V6 AAB: `artifacts/android-production-20261010-v6/GRIDSHARD-2.1.0-beta.72-v6.aab`;
  SHA256:`aba0023e3b36f0b007814766efd2af4b0b8e2346194e74ee32791e4821124beb`.
- Canlı r14 image: `sha256:dbc3feee11e514721c43dea5e3228f6393911f585f718618a528d7eac49ccf09`.
- Güvenli yerel kanıt:`test-results/production-preflight-20261010.json`;
  `test-results/billing-v6/test-purchase-uc-20261010.json` (reopen kullanıcı
  takibi eklendi); backendJUnit:`test-results/production-preflight-billing-normal-20261010.xml`.
- Ek51 yerel test JUnit:`test-results/refund-idempotency-followup-normal-20261010.xml`.
- Son iade/ret/pending kanıtları:`test-results/billing-v6/refund-repeat-and-decline-uc-20261010.json`
  ve `test-results/billing-v6/pending-tests-uc-20261010.json`.
- V6 kurulum/temel mağaza:`test-results/billing-v6/device-v6-store-check-20261010.json`;
  rapor durumu:`test-results/billing-v6/prelaunch-report-status-20261010.json`.
- İlk paket/audit provenance dosyaları tarihsel freeze kayıtlarıdır;
  sonraki kullanıcı yayını veya test alımı için geriye dönük değiştirilmez.

Agent bu tur commit/push, canlı deploy/restart, yeni ödeme/iade, ürün
aktivasyonu, Google beyan düzenlemesi veya Production yayını yapmadı.
