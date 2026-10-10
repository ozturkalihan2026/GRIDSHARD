# Codex için devir notu — r14 canlı / Play v6 cihazda (r13/v4 tarihçesi)

**10 Ekim 23:03 güncel — yeni premium iade politikası yerel aday:** Kullanıcı
yalnız kod/test/TR-EN Terms taslağını onayladı. `season-rewards-v1` private
claim/chest gerçek çıktıları ve kaynak defteri, signed deficit persistence,
atomic refund/claim, tekrar bildirim/yeniden alım/restore/past season ve trusted
publisher-error düzeltmesi eklendi. Verified provider satın alma zamanı +
UTC cutover + açık istemci onayı gerekir; defaultlegacy. Eski Uç/legacy alım
ve makbuz replay'e retro-kesinti yok. Yeni client onay/deficit UI hazır.
1410 sunucu PASS /41 SQL-Redis vb skip;293 istemci PASS;24 build/site PASS;
31script gerçek kaynak bundle in-memory compile PASS. Yeni Ruff kontrolleri
PASS, 4HEAD-baseline unused lint bulgusu ayrı. 2yeniSQL test CI migration
dosyasında, yerel DB olmadığı için çalıştırılmadı. Taslak ve rollout kapıları:
docs/PREMIUM_REFUND_POLICY_V1_DRAFT_20261010.md. Proof:
test-results/premium-recovery-candidate-20261010.json. Yayın/deploy/env/Terms
write/yeni AAB/commit-push yok; v6 bu kodu içermez. Kullanıcı commit/push ve
yeni tamCI + yeni istemci kapalı test + ayrı Terms/UTC/deploy onayı bekler.
Savaş Premium bonus iade kapsamı/testi ve genel üretim kapıları hâlâ açık.

**10 Ekim 22:22 önceki — telefon iadesi geçti, ödül-retention açığı açık:**
Kullanıcı normal reopen: sezon geçişi pasif,1110/5476,mağaza normal teyit etti.
22:22:02 READ ONLY aynı refunded makbuz/ledger/history1/hakfalse/claimed17;
sonraki doğal scan21:53:52 seen1/applied0. Current-policy iade ve kalıcılık
geçti; anti-abuse PASS değildir. Kullanıcı tüm premium ödülleri alıp iade
edebilme açığını işaretledi. Kod ve yayımlanmış Terms bilinçli olarak eski
ödülleri koruyor. Premium claim+sandık gerçek çıktıları purchase-attribution
ve clawback önerisi için politika onayı gerekir; henüz kod/Terms/canlı write
yok. Eski Uç test ödüllerini geriye dönük kesme. Üretim kapısı açık tutulur.
Kanıt: test-results/billing-v6/season-pass-refund-uc-20261010.json.

**10 Ekim 20:24 önceki — sezon geçişi iadesi doğal worker ile geçti:**
Kullanıcı yalnız eşleşen ücretsiz test siparişi iadesini tamamladı. Google
GET 20:22 exact-match1/developer-initiated/voided_at20:17:40 TR doğruladı.
20:23:51 doğal scan seen1/applied1; 20:24:24 READ ONLY aynı tek makbuz/ledger
refundedtrue, history1/Google voided işlenmiş, sezon hakkıfalse. Alınmış17
tier ve1110Akı/5476kredi korunuyor; Savaş Premium false ve makbuz/ledger0.
İlk erken provider0 ve worker öncesi haktrue kanıtları saklandı. Phone normal
reopen/pasif hak/aynı bakiyeler/mağaza normal teyidi soruldu, yanıt bekliyor.
Sonraki doğal scan idempotency ayrıca açık; manuel scan/restart/forced replay
veya provider/player write yok. Ham order/hash/token kaydı yok. Kanıt:
test-results/billing-v6/season-pass-refund-uc-20261010.json.
Policy/source/CI/AAB aynı; diğer premium ve üretim kapıları açık.

**10 Ekim20:14 önceki — sezon geçişi teslim/consume/normal reopen geçti:**
Uç kullanıcı free sezon geçişi alımını tamamladı.20:09/20:10/20:13 dar READ
ONLY: tek test makbuzu+tek ledger/consumedtrue/refundedfalse; sezon hakkıtrue,
grant stored active sezonla eşit. Normal reopen kullanıcı hakkın sürmesini
ve mağazanın çalışmasını teyit etti; server aynı1110Akı/5476kredi/claimed17.
Baseline842/1456/claimed0; ödül alınmadan test şartı korunmamış, bakiye delta
tamamen tek bir nedene atfedilmez. Mevcut premium refund politikası alınmış
ödülleri geri almaz; bakiye/claimed resetleme veya kural değiştirme yok.

20:12 Console liste görüntüsü Test: Ücretli Sezon Geçişi/İşlendi/199,99TRY/
20:07 alımı;20:13:58TR exact-order RAM karşılaştırması receipt1/ledger1/
console_order_matchestrue. Ham order/hash/token kimliklerini proof'a yazma.
Refund henüz yok: yalnız exact ücretsiz sezon geçişi siparişinin100% iade+
yararlanma hakkını kaldır işlemini insan yapacak. Sonra doğal scan/hakfalse/
tek refund history/preserved rewards ve normal reopen kontrolü. Son scan
20:13 tanığında19:53:50TR/seen1/applied0; manuel scan/restart/lease bypass yok.
Savaş Premium makbuz/ledger0/hakfalse, kendi testleri hâlâ açık. Kanıt
test-results/billing-v6/season-pass-purchase-uc-20261010.json. Scoped helper
read-only-uc-premium-20261010.py artık optional --expect-order-sha256 destekler;
digest yalnızRAM, çıktı kimliksiz. Checkout image yok; test/no-charge insan
teyidi ve ayrıca receipt_is_testtrue. Genel kapılar/source/CI/AAB aynı.

**10 Ekim20:04 önceki — kullanıcı Terms yayımladı; v6 native10/10:**
Kullanıcı ZIP+Save'i tamamladı; agent submit yapmadı. CUA Success ve reload
sonrası gridshard-public Production b92f1b0b-8330-4546-bd38-a8506d19ccdb/domain
doğrulandı. HTTPS11/11 route200/byte/SHA/header adaya eşit; Terms canlıdır.
14 madde/iade/eksi bakiye aynı. Kanıt terms-production-live-20261010.json.

20:02:55TR ADB tek cihaz/v6/Play;20:01TR iki güvenli query0/10 fetched/0
unfetched. UI tek tek fiyatlar ayrıca görülmedi. Yeni AAB veya server deploy
yok. Kanıt test-results/billing-v6/device-all-products-v6-20261010.json.

20:04:15TR READ ONLY Uç:842Akı/1456kredi, iki premiumfalse/claimed tier0,
iki premium makbuz/ledger0. Kullanıcı sezon geçişi checkout test kartı+no-charge
uyarısını teyit etti; screenshot yok ve ek ekran istemeden devam istedi.
İnsan yalnız doğru ürün/test kartı/no-charge uyarısı hâlâ görünürse tek
ücretsiz sezon geçişi alımını tamamlayacak. Agent purchase/refund/manual scan/
hak veya bakiye write yapmadı. Sonrası receipt/ledger test=true, consume,
sezon grant/hak, tek teslim ve normal reopen kontrolü; ardından ayrı ücretsiz
premium iade/revoke testi için exact-order doğrulaması gerekir. Premium PASS
henüz yok. Kanıt premium-pre-purchase-uc-20261010.json. Diğer genel kapılar
açık; source/CI/AAB pinleri aynı. Commit/push kullanıcıya ait.

**10 Ekim19:11 önceki — Terms upload formu ve premium baseline:**
Browser-first CUA ile mevcut Edge Cloudflare URL/proje/Production doğrulandı;
gridshard-public eski Production528af2d9. Approved21 dosyalık ZIP SHA6e892191...
ve tüm manifest isim/size/hash eşleşmeleri doğru. Filechooser setFiles local
file URL izni nedeniyle failed; güvenlik/izin değişimi yok, dosya listesi boş/
Save and deploy disabled, yeni yayın yok. Kullanıcı elle ZIP seçimi (Save'e
basmadan) istendi. CUA termsCloudflareTab Edge3/tab1378260585; handoff mark
korunuyor. Sonraki tur current state oku;21 dosya doğrulanınca action-time
publication onayı ve ardından live bytes. Kanıt
`test-results/public-site/terms-publication-preflight-20261010.json`.

19:11TR Uç dar READ ONLY başlangıcı:iki premiumfalse/claimed tier0/iki premium
makbuz ve ledger0,838Akı/1404kredi. USB cihaz0; kullanıcıya USB+Uç Mağaza
hazırlığı soruldu. Premium test-no-charge ekranı/ödeme/iade henüz yok. Kanıt
`test-results/billing-v6/premium-baseline-uc-20261010.json` ve scoped helper
`read-only-uc-premium-20261010.py`. İlk lisans-test alımı için kullanıcıdan
Google ücretsiz test banner ve always-approve card ekranı almadan final
onay yok. Live main import/manuel worker/ledger veya hak write yapılmayacak.
Source/CI/AAB/14madde politikası aynı; genel production kapıları açık.

**10 Ekim18:25 güncel durum — tüm ürünler Google tarafında ACTIVE:**
Kullanıcı kalan seçenekleri etkinleştirdi. Bağımsız tek salt-okunur Google
catalog GET200/complete single page:10 ürün/10 ACTIVE seçenek; tek standard/
legacyCompatible/TR AVAILABLE, fiyatlar önceki snapshotla aynı. Agent ürün
write/deploy/ödeme yapmadı.18:23TR v6 current-process native iki query0/
fetched1/unfetched9; telefon10/10 henüz doğrulanmadı. Normal reopen ve mağaza
fiyat ekranı istendi; kaldırma/data clear/app launch/log clear yok. Premium
teslim/iade ve diğer ürünlerin testlerini tamamlandı sayma. Güvenli kanıt
`test-results/billing-v6/catalog-all-active-20261010.json`.

Terms yayını onaylı, önceki tur Computer Use URL doğrulama engeliyle durdu;
10 Ekim adayı henüz Cloudflare'e yayımlanmadı. Kaynak/CI/AAB ve14 madde/iade/
eksi bakiye politikası aynı. Genel üretim erişimi/rapor/vitals/savaş QA ve
backup operasyonu hâlâ ayrı kapılar. Commit/push kullanıcıya ait.

**10 Ekim17:58 güncel durum — v6 kurulu/mağaza geçti, Ön lansman sonucu yok:**
17:53:11TR ADB salt-okunur:canonical/versionCode6/Play installer/tek cihaz;
device lastUpdateTime17:11:39. Current process/tag-only kimliksiz native
query17:51:21TR code0/fetched1/unfetched9; diğer9 product status3=
PRODUCT_NOT_FOUND. Global BillingUnavailable3 diye yorumlama. Önceki DRAFT
katalogla uyumlu çıkarım; provider bu tur yeniden kontrol edilmedi. Kullanıcı
120Akı29,99/bakiyeler aynı838/1404/düğmeler korunuyor teyidi verdi. Temel v6
store geçer; tümrace/purchase/consume/replay bu sürümde kanıtlandı deme.

Ön lansman17:55 Genel bakış boş, rapor sonucu yok;17:57 Ayarlar no credentials,
3 boş deep link, özel dil/Robo script yok, disable kontrolü görünmüyor.
Exact cause bilinmiyor; Google lab kapasitesine bağlı. Missing report=0error
veya missing upload değildir. Ayar/upload/yeni AAB değişimi yapılmadı. Rapor/
vitals, iki-phone savaş QA, Terms onaylı yayını, diğer ürün kapsamı ve backup
operation kapıları korunur. Kanıtlar
`test-results/billing-v6/device-v6-store-check-20261010.json`,
`test-results/billing-v6/prelaunch-report-status-20261010.json`.

**10 Ekim17:12 önceki durum — v6 güncellemesi geldi, cihaz teyidi bekliyordu:**
Kullanıcı güncellemenin geldiğini söyledi; kurulum tamamlandı demedi.
17:12:32TR normal ortamdaki salt-okunur ADB yetkili fiziksel telefon0;
versionCode6/Play installer kontrolü yok. Sandbox ilk query failure ürün hatası
değil; normal diagnostic sorgu başarılı. Kullanıcı Play güncellemesi+USB+mağaza
fiyat/bakiye kontrolüne yönlendirildi; yeni ödeme/kaldırma/data clear/install yok.
Güvenli ignored kayıt `test-results/billing-v6/v6-update-availability-20261010.json`.
Önceki testler/source/CI/AAB aynı; v6 cihaz QA veya yeni konsol statüsü varsayma.

**10 Ekim17:04 önceki durum — ret/bekleyen/yavaş onay ve normal reopen:**
Yavaş-onay testinde17:02TR beklerken yeni grant yok718/1404;17:03TR tek yeni
test makbuzu/ledger/consume/grant120, console order/sahip eşleşiyor838/1404.
Kullanıcı normal reopen ve mağaza responsive teyidi verdi;17:03:58TR dar
READ ONLY aynı bakiyeyi/tek yeni makbuzu doğruladı. Toplam2 makbuz: eski
refunded+yenisi nonrefunded. İki yavaş testin son onayını kullanıcı kendisi
yaptı; ödeme yöntemi/no-charge ekranı önceden agent'a gösterilmedi. Yeni
başarılı kaydın test=true olduğu sunucuda bağımsız doğrulandı. Ret/pending
kanıtı forced replay veya pending sırasında restart kanıtı değildir.

16:51 ve17:00TR READ ONLY: orijinal iade sonraki doğal scan seen1/applied0,
history/debit1/effect838→718/debit120; ikinci kesinti yok. Always-denied ekranı
ve sonrasında tek eski makbuz/no grant718/1404.16:58 pending ekranı→kullanıcı
iptal bildirimi→16:59/17:00 no grant718/1404; mağaza normal kullanıcı teyidi.
Ek yerel refund/reconciliation/policy51/51 geçti.14:01 backup audit scope:
2 tarihsel transient migration job'u/timer0/dört sistem cron+root/ubuntu job0;
16 backup/latestSHA sağlam; regular creation doğrulanmadı/retention OnFailure
boş, dış scheduler
ve offsite bilinmiyor. Scheduler/restore/restart kurulmadı. USB16:52 cihaz0.

Ignored kanıtlar `test-results/billing-v6/refund-repeat-and-decline-uc-20261010.json`,
`test-results/billing-v6/pending-tests-uc-20261010.json`,
`test-results/production-backup-scheduler-readonly-20261010.json`.
Agent purchase/refund/revoke/consume/manualscan/balancewrite/deploy/commitpush
yok. Source/CI/AAB aynı. Kalanlar: v6 cihaz/QA,12 kişi14gün, Terms onaylı
yayını, diğer ürün kapsamı/testleri ve yedek operasyonu; genel üretim PASS değil.

**10 Ekim önceki durum — test iadesi kalıcı işlendi / cihaz718:**
13:55:21TR dar READ ONLY: aynı tek120Akı ücretsiz test makbuzu/defteri refunded=true,
normal13:53:46TR scan seen1/applied1; kalıcı işlem13:53:47TR. refund_effect
flux838→718/debit120/waived0; tek history/debit, voided event işlenmiş. Kullanıcı
cihaz718 bildirdi. Devre Kredisi önceki ve sonraki tanıkta1404. İlk uçtan uca
iade akışı geçti; ikinci doğal scan/applied0/ikinci debit yok canlı kanıtı hâlâ
bekliyor. Forced replay yok; son kullanıcı yanıtında restart açıkça belirtilmedi.
Diğer ürün/premium/eksi bakiye senaryolarını PASS sayma. Agent canlı write,
yeni refund/revoke/consume/manualscan/deploy/commitpush yok; source/CI/AAB aynı.
Güvenli ignored kayıt `test-results/billing-v6/refund-uc-server-applied-20261010.json`.

**10 Ekim önceki durum — test iadesi / sunucu uygulaması bekleniyordu:**
Kullanıcı aynı ücretsiz120Akı test siparişini iade etti;13:36TR ekranı
refunded/toplam0,00TRY gösteriyor.13:40:58TR WIF Voided Purchases GET aynı
tek siparişin hak geri almasını doğruladı (13:35:56TR,geliştirici kaynaklı).
13:42:23TR READ ONLY sunucu defteri henüz refunded=false/history0/eventseen=false;
Akı838/Devre Kredisi1404. Son normal tarama13:23:46TR iadeden önceydi;
sonraki yaklaşık13:54TR. Arada aktivite yoksa120 kesinti sonrası718 beklenir.
Uçtan uca iade PASS değil: doğal taramada kalıcı refund_effect/debit120/
history1/eventseen ve normal reopen, sonra ikinci taramada ikinci debit yok
kanıtı gerekiyor. Agent yeni iade/consume/revoke/manualworker/bakiye write yok.
Ham order/token/digest saklanmadı. Güvenli ignored kayıt
`test-results/billing-v6/refund-uc-provider-confirmed-20261010.json`.
Pinler/diğer ürünler/Terms adayı/üretim kapsamı aynı.

**10 Ekim önceki durum — üretim hazırlığı:** Kullanıcının son v6 bildirimi
incelemede. Dashboard12 katılımcı/1 gün, üretim etkin değil ve başvuru kapalı;
14 gün tamamlanmadı. Uygulama içeriği0 bekleyen/10 tamamlanan beyan; form
detayları ayrıca onaylanmış sayılmaz. Kullanıcı normal reopen sonrası Uç
bakiyesi832 kaldı dedi; canlı replay/iade veya v6 kurulumu kanıtı değil.

Salt-okunur preflight:99 backend ödeme/iade+17 istemci+26 site/saklama testi,
30 yerel görünüm kontrolü geçti. Canlı eski site11/11, r14/health/polling
checkpoint ve retention timer başarılı. Katalog10/10/TR; iki premium199,99 TL,
yalnız120Akı ACTIVE/diğer9 DRAFT. Düzenli yeni yedek oluşturma ve hata bildirimi
doğrulanmadı; eldeki16 yedekte30 gün geçen0, en yenisi11,21h/SHA sağlam.

Yerel Terms giriş/tarih düzeltmesi hazır;14 onaylı madde değişmedi.21 dosyalık
adayda yalnız TR/EN Terms HTML farklı; canlı yayın yapılmadı. Oyun kodu/AAB
değişmedi, yeni AAB gerekmez. Commit/push kullanıcıya ait. Yeni site kodu
frozen a451221/source ZIP/CI içinde değildir; mevcut v6 hash/CI5/5 aynıdır.
Detay `docs/PRODUCTION_READINESS_20261010.md`; güvenli ignored kanıt
`test-results/production-preflight-20261010.json`. Sonraki kapılar başarısız/
bekleyen ödeme, doğru ücretsiz test siparişinde onaylı iade/geri alma,
satışa açılacak ürünlerin testi, v6 cihaz/rapor kontrolü ve yedek operasyonudur.
Agent canlı write/yayın/ödeme/iade/aktivasyon/deploy/commit-push yapmadı.

**10 Ekim önceki durum — Uç hesabında ücretsiz 120 Akı test alımı tamamlandı:**
12:48 TR paylaşılan Google Play ekranında 120 Akı / 29,99 TL, test kartı
her zaman onaylanır ve ödeme alınmayacağı bildirimi görsel doğrulandı.
Kullanıcı onay/oyuna dönüş/+120 Akı/Uç hesabı bildirdi. Son cihaz bildirimi v5;
fiyat veya bu alım v6 fix'in cihaz kanıtı değildir. V6 Play yayını insan beyanı.
12:56:44 TR pinned SSH / PostgreSQL READ ONLY: tek Uç profili, 12:40 sonrası
tek flux_120 makbuzu ve tek matching ledger. Alım 12:49:24 TR, google_play,
test=true/environment=test, flux_shards grant120, consumed=true; sahip/grant
eşleşiyor, refunded=false, token digest varlığı boolean. Güncel bakiye832.
Kalıcı kayıtlar sorgulandı; doğrudan Google GET/consume POST/live replay/iade yok.
Agent canlı write/deploy/yeni alım/diğer ürün aktivasyonu/commit-push yapmadı.
Ignored güvenli kanıt test-results/billing-v6/test-purchase-uc-20261010.json.
Sıradaki adım normal kapat/aç sonrası ikinci +120 olmamasını teyit; henüz
reopen/replay/iade veya telefonda v6 kurulumu kanıtlanmadı. Veri silme/kaldırma
yok. Diğer9 son bağımsız katalogda DRAFT; final source/CI/hash pinleri korunur.

**10 Ekim önceki durum — v6 Play yayını kullanıcı bildirdi; cihaz v5'te120 Akı fiyatı döndü:**
Read-only ADB12:43TR canonical/Play installer/versionCode5; son update08:41:10TR.
Manuel yerel v6 APK paket çakışması bildirdi. Kurulu public signer09:6A:CD…A0:E6,
yerel upload signer03:A4:5C…1F:88 farklı; agent install/uninstall/data-clear yok.
Tekrar APK deneme/kaldırma/veri silme/key-package değişimi önerme.
Kullanıcı v6 AAB upload/publish bildirdi; konsol bağımsız doğrulanmadı, agent
upload/publish yapmadı. Aynı yayını tekrarlama. Sonra v5'te120 Akı29,99TL tuşu
aktif dedi; UI/native query bağımsız doğrulanmadı, v6 fix etkisi diye sunma.
Google ödeme ekranında test uyarısı ve ücretsiz test ödeme yöntemi görülmeden
son ödeme onayı yok; hesap/kart/token/ham log paylaşma. Play Store'dan v6
update'i/versionCode6 ayrıca doğrulanacak; final kaynak/CI/hash pinleri aynı.
Ignored device-signature-and-price-status-20261010.json billing-v6 klasöründe.

**10 Ekim önceki kaynak freeze — a451221 CI yeşil, final v6 doğrulandı; Alpha onayı bekleniyordu:**
Kullanıcı commit/push yaptı; `a45122176ea8c81ebd2de2f92052c884d9bad1ff`.
Quality38034762931 aynı SHA/push/main/attempt1 completed/success; beş iş geçti.
Clean kaynak ZIP961 dosya+manifest, runtime data yok;8 fingerprint testli adayla
eşleşiyor. Offline incremental final build22sn, lintVital ve mevcut imza/audit
74 asset/9font/manifest6/queue/native class-tag kontrolleri geçti. Aynı kaynak
önceki full lint0hata/3uyarı/helper0 bulgu raporu korundu, yeniden full lint yok.
Final artifacts/android-production-20261010-v6; AAB SHA
aba0023e3b36f0b007814766efd2af4b0b8e2346194e74ee32791e4821124beb;
APK3702ae9534abb3f36df59d861440eec3c2bbb0b5b06525cdaa41a40e20dc976c.
ZIPc505db1d1167d1943c9ebe0817f3126ca1305f61368b2a3be1b93d09e74544ab.
Final byte'lar testli adayla aynı; clean/exact CI provenance artık doğrulandı.
Build/audit öncesi ve sonrası tree clean; sonradan yalnız operasyon notları
güncellendi. Agent commit/push yok. V5 pinleri yeniden doğrulandı; r14 aynı.
Play upload/yayın/telefon kurulumu/diğer ürün aktivasyonu yok. Yalnız Alpha v6
taslak/yükleme için ayrı onay al; gönderme/yayın ayrı kapı. Diğer9 DRAFT;
120Akı fiyatı/test banner/ücretsiz alım/teslim/consume/replay/iade cihazda kanıtlanmadı.
Detay docs/ANDROID_V6_BILLING_RELEASE_20261010.md ve final release-provenance.json.

**10 Ekim önceki durum — v6 Billing düzeltmesi/adayı hazır; kullanıcı commit/push + CI bekleniyordu:**
Dar kapsam onaylandı. Android native ürün/kurtarma/purchase/consume çağrıları
promise tamamlanana kadar sıralanır; eski/eksik fiyatla ödeme koruması korunur.
Kalıcı sync tool/Java template sadece bilinen INAPP ID/sayısal query+unfetched
status loglar; hesap/token/debug metni yok. pnpm ortak store inode'u korunur.
16 odaklı,284 client,9 build testi geçti; gerçek9.1.0 Java derlemesi ve
lintVitalRelease/signed build/audit geçti. Ek tam lint offline test-dep eksikliği
sonrası repository erişimiyle tamamlandı: XML0 hata/3 sürüm-bağımlılık uyarısı,
Java helper0 bulgu. Uyarılar gizlenmedi, bağımlılık yükseltilmedi.
V6 aday klasörü artifacts/android-production-20261010-v6-candidate; AAB SHA
aba0023e3b36f0b007814766efd2af4b0b8e2346194e74ee32791e4821124beb.
Henüz final/publishable değil: sourceHEAD0db yeni app değişikliklerini içermez;
kullanıcı tüm tool/Java/test/config/app dosyalarını commit/push etmeli. Yeni
exact CI + final rebuild/audit sonrası ayrıca Alpha onayı gerekir.
Telefon/v5, canlı r14, diğer9 DRAFT, veri ve yayın değişmedi; v5 hashleri aynı.
120Akı cihaz fiyatı/gerçek ücretsiz alım hâlâ doğrulanmadı. Detay
docs/ANDROID_V6_BILLING_RELEASE_20261010.md.

**10 Ekim önceki tanılama — bağlantı çakışması kanıtlandı; fiyat yokluğu henüz çözülmedi:**
09:56:06.630/631 TR getProducts/getPurchases paralel başlıyor; native ortak
BillingClient sorgu sürerken kapanıyor. 09:56:11.650 timeout ve 09:56:12.667
setup -1/SERVICE_DISCONNECTED görüldü. Kaynakta loadStoreState paralel çağrıları
ve native executor'ın callback ömrünü beklememesi bu çakışmayı açıklıyor.
Ancak 09:56:56.770 TR getPurchases çakışması görülmeyen sorgu da setup/query0,
fetched0: bağlantı yarışı fiyat yokluğunun tek nedeni olarak kanıtlanmadı.
UnfetchedProduct neden kodları v5'te aktarılmıyor. Önerilen dar bağlantı sıralaması
düzeltmesi ve güvenli ürün-bazlı neden tanılaması için kapsam onayı bekleniyor;
henüz uygulama değişikliği yok. Yeni cihaz kodu testli yeni APK/AAB ve kullanıcı
commit/push + CI + Alpha kapıları ister; server-only güncelleme yetmez.
Son katalog 09:50:36 TR yalnız flux120 ACTIVE/TR2999, diğer9 DRAFT.
Önbellek temizliğinin yapıldığı insan tarafından açıkça teyit edilmedi.
Veri silme/kurulum/hesap değişimi, ürün/ödeme/server write, build/deploy yok.
Yeni güvenli zaman çizelgesi mevcut ignored device-billing-empty-products kanıtına
eklendi; ham log/token/hesap bilgisi yok. Frozen a309/v5/r14 pinleri korunur.

**10 Ekim önceki tanılama — cihazda Billing OK fakat ürün listesi boş:**
120 Akı hâlâ kullanılamıyor. Read-only ADB v5/Play installer ve modern Play
Store53.4.34;09:48:00/09:48:12TR native sorgular doğruflux120/inapp,
setup0/query0/fetched0. Ham log/token/hesap bilgisi yayımlanmadı. Yeni katalog
GET20009:50:36TR yalnızflux120 ACTIVE/standard/legacyCompatible true/
TR AVAILABLE/2999 kuruş, diğer9 DRAFT. Kullanıcı Play ülkesini Türkiye diye
teyit etti; SDK storefront/ödeme hesabı henüz bağımsız değil. Alt sebep
belirsiz: metadata yayılımı/önbellek veya hesap/teklif uygunluğu ayrılmadı.
V5 eklentisi UnfetchedProduct neden kodunu loglamıyor; elde edilmiş sayma.
Fiyat testleri4/4 geçti, cihaz alımı değil. Sonraki kullanıcı adımı yalnız
Play Store önbelleğini temizleyip Store/oyunu normal açarak yeniden sorgulama;
uygulama/Play Store/Play Services veri silme, kaldır-kur, hesap/ülke değişimi
yok. Sonra güvenli ADB query kanıtı; gerçek ödeme veya diğer9 aktivasyon yok.
Ignored kanıt device-billing-empty-products-20261010.json. Oyun/server/Android/
node_modules değişmedi; yalnız ignored katalog probe güvenli alanları genişledi.
Yeni AAB/build/deploy/agent commit/push yok. Önceki pinler/kanıtlar korunur.

**10 Ekim önceki aşama — yalnız 120 Akı etkin, test ödeme ekranı bekleniyordu:**
Lisans-test dışı Alpha kullanıcılarına gerçek satış açılabileceği açıklanarak
kullanıcıdan yalnız 120 Akı / standard / Türkiye / 29,99 TL için scoped onay
alındı. Kullanıcı Edge'de elle etkinleştirdi; ekran doğru ürün/seçenek/ülke ve
Etkin gösteriyor. Yeni mevcut WIF read-only katalog GET200 tek sayfa/10 ürün:
yalnız gridshard.flux_120 ACTIVE, TR AVAILABLE /2999 kuruş; diğer dokuz DRAFT.
Kontrol tamamlanma10 Ekim09:43:46TR, kesin aktivasyon zamanı değil. Publisher
write0; yeni ignored kanıt google-catalog-flux120-active-20261010.json.
Provenance kısmi aktivasyonu kaydeder; eski all-DRAFT kanıtı korunur.

Telefonda mağazayı yeniden açıp120 Akı29,99TL ve Google ödeme penceresindeki
test uyarısı/test kartı/doğru hesabı doğrula; son satın alma onayı henüz yok.
Gerçek ücretsiz teslim/consume/replay/iade ve profil bütünlüğü henüz test değil.
Diğer dokuz ürünü açma, yeni teklif/fiyat/ülke/izin/tester ayarı değiştirme veya
gerçek kartla deneme yapma. Geniş satış/yasal test kapıları hâlâ ayrı. Oyun kodu,
server deploy, AAB, cihaz verileri ve frozena309 değişmedi; agent commit/push yok.

**10 Ekim önceki aşama — kullanıcı yayımladı; Play kurulumlu v5 doğrulandı:**
Kullanıcı Alpha yayını ve telefon güncellemesini bildirdi. Bilinen USB cihazda
read-only ADB canonical package/versionCode5/Beta72/min24/target36 ve Play
installer/initiator doğruladı. Son güncelleme10 Ekim08:41:10TR, ilk kurulum
4 Ekim19:55:08TR (cihaz Europe/Istanbul). Agent install/uninstall/data-clear
yok. Paket sorgusu oyun içi profil/bakiye bütünlüğü testi değildir.
Edge artık bağlı değil; yalnız boş yerleşik/MCP tarayıcı yüzeyleri var. Alpha
konsol durumu/yönetilen yayınlama taze gözlemi yok; yayını yeniden gönderme.

R14 taze pinli read-only health OK; exact image/WIF/nonroot/read-only/polling
1800s/Google scan OK/restart0/Ads/PGS/reviewer korunur. Geçiş receipt39/39/91
bugünkü canlı sayım değildir. Deploy tekrar yok. Kullanıcı mağaza görüntüsünde
on üründe fiyat yok/Şu an kullanılamıyor. Mevcut WIF tek read-only katalog GET200:
10/10 üründe birer DRAFT option/ACTIVE0; TR AVAILABLE, premiumlar19999 kuruş,
paketler2999/5999/9999/19999. Somut engel taslak seçenekler; fiyat-güvenlik
korumasını kaldırma. İlk helper import yolu API öncesi düzeltildi, oyun kodu yok.

Kullanıcı indiren hesabın lisans-test listesinde olduğunu teyit etti; console/
ödeme banner/test kartı bağımsız görülmedi. Hiçbir ürün aktive/ödeme/iade yok.
Aktivasyon lisans-test dışı Alpha kullanıcısına gerçek satış açabilir; yeni dar
onay ve satış/yasal kapıları gerekir. Sonraki uygun görünüm120 Akı ürün detayı;
toplu on ürün açma/gerçek kartla deneme yapma. Kanıtlar device-v5-update ve
google-catalog-readonly JSON'ları test-results/billing-v5 içinde (ignored).
Kullanıcı HEAD0db145d yalnız dört operasyon belgesini commit etti; frozen
releasea309/source-image-package değişmedi. Agent commit/push/build/deploy yok.

**10 Ekim önceki aşama — r14 canlıda, Alpha v5 Google incelemesinde:**
Kullanıcı kısa bakım/taze yedekle r14 + yalnız Alpha inceleme gönderimini
onayladı. R14 geçişi10 Ekim01:58:16TR başarı/exit0 ile tamamlandı. Kullanıcı
son Play gönderimini kendisi yaptı; salt-okunur Edge paneli10 Ekim02:04:34TR
**Değişiklikleriniz şu anda inceleniyor** ve yalnız **Kapalı test – Alpha /
5 (2.1.0-beta.72)** gösterdi. Yönetilen yayınlama açık kalır: Google onayı
otomatik tester yayını değildir. Henüz v5 yayımlanmadı; mevcut dağıtımv4.
Sonraki adım Google sonucundan sonra ayrıca yalnız Alpha'yı yayımlamak;
üretim kanalı/ürün etkinleştirme/tester-ülke değişimi bu kapsama dahil değil.

Frozen sourcea309 ve beş yeşil exact-commit CI işi/APK-AAB hashleri korunur.
Canlı API `sha256:dbc3feee11e514721c43dea5e3228f6393911f585f718618a528d7eac49ccf09`;
bakım `sha256:6d18ddc6fc8e52ccc70dc553ab862fbb6726308decd072408774b71e1e501c77`.
Taze özel yedek `/var/backups/gridshard-production/20261010-before-billing-r14`
ve eski r13 imaj/config geri dönüşü korunur; asla canlı DB restore veya volume
silme yapma. Deploy tamamlandı: `deploy.py` yeniden çalıştırılmaz. İlk deneme
maintenance-profile config preflight'ta, servis durdurulmadan durdu; operator
guard düzeltildi/10 offline test geçti, ikinci deneme başarıyla tamamlandı.
İlk denemenin kanıtları korunur; frozen uygulama kaynağı değişmedi.

Geçişte maç/WS0,39 profil/39 kimlik/91 savaş/pending0 fingerprint korundu.
Altı Compose katman, mevcut PG/Redis volume'leri, Ads LIVE/SSV, PGS/reviewer,
nonroot/read-only rootfs ve WIF mount doğrulandı. WIF/keyless Google doğrulama
ve1800s polling canlı; ilk gerçek read-only scan başarılı, RTDN/static key/
ücretli Cloud yok. İç ve bağımsız dış TLS/HTML/health330s/33'er kontrol geçti;
restart0/unsigned SSV403. Gerçek alım/consume/iade testi henüz yok; ürünler
etkinleştirilmedi. Son USB kontrolünde telefon bağlı değil; Play onayı/yayını
sonrası verileri koruyarak v5 güncelle ve lisans-test hesabı/banner/test kartı
doğrulanmadan ödeme onayı verme. Upload APK'yı Play imzası üzerine kör kurma.

Kanıt `test-results/billing-v5/alpha-v5-review-submitted.jpg`; Edge handoff.
`deployment-verified-sanitized.json` r14 artifact dizininde, güncel
`release-provenance.json` final Android dizininde. Yalnız operasyon belgeleri
dirty; agent commit/push yok, yeniden AAB gerekmez. Aşağıdaki bekleyen kayıtlar
tarihçedir; ayrıntı `docs/ANDROID_V5_BILLING_RELEASE_20261010.md`.

**10 Ekim önceki aşama — final v5 Alpha taslağı ve başarılı r14 provası:**
Kullanıcı commit/push `a3095c33a17cb2b29daa13648cfe495c3c67f51b` remote main
ile eşleşti; run37998290434 beş işte success. Temiz son kaynaktan final
APK/AAB yeniden üretildi/audit geçti; nihai dizin
`artifacts/android-production-20261010-v5/`. Manifest AAB içinde, signer/appId/
Beta72 korunur. Kullanıcının yalnız taslak onayı ve elle AAB seçimiyle Play
Alpha v5 taslağı kaydedildi. Önizleme2/2: mapping/native sembol iki uyarı,
engelleyen hata ve cihaz kaybı yok. **Önizleme Kaydet/inceleme/yayın yok**;
mevcut tester/ülke ayarları korundu, aktif Playv4. Edge handoff hazır.
Aynı kaynak ZIP `5d7b137672f5f708d38c7b70b9fbdb883f0d47a66c9b367f853a2f4dc71eea2c`
taze r14 adayına aktarıldı, ayrı API/bakım tag'leri build edildi. Gerçek WIF
read-only scan/refresh/financial200 + PG17/Redis/330s soak/restart/boş test
restore ve birebir checkpoint/reviewer koruması geçti. Test fixture cleanup
doğrulandı. Yeni dependency source1342pass/39skip/1warning; iki QA-report
testi bu komutta dışarıda, exact CI ayrı geçti; deploy guard6 offline pass.
Canlı hâlâ r13, WIFfile kurulmadı, receipts/notifications0, ödeme/ürünler
kapalı. `deploy.py` hazır/çalıştırılmadı, bakım/yedek henüz yok. Explicit kısa
bakım + Alpha inceleme/sunum onayı ve taze aktif maç/WS0 kapısı sonraki adım.
Geri dönüş yalnız eski imaj/config; asla canlı DB restore/volume deletion.
Google ücretli Cloud/PubSub/RTDN/deneme/kart açılmaz; telefon kaldır/data-clear
yapılmaz; gerçek ücretsiz lisans-test alımı henüz yok. Kanıt/provenance ve
güncel kapılar `docs/ANDROID_V5_BILLING_RELEASE_20261010.md` içinde.
Bu turun yalnız operasyon dokümanları dirty olabilir; oyun kaynağı frozen
a309. Agent commit/push yapmadı; doküman değişimi yeniden AAB gerektirmez.

**10 Ekim önceki hazırlık — imzalı v5 aday hazır, canlı hâlâ r13/Playv4:**
Ödeme politikası/Terms değişiklikleri kullanıcı commit/push
`31b0388480816ada79fc25a34d80b61f840cd65e` içinde. GitHub main eşleşti;
Quality run37996501300 beş işte başarılı (gerçek PG/Redis/imaj/restore dahil).
Bu commit sürüm kodu4'tür. Kullanıcının yeni kapalı-test APK/AAB talebi üzerine
sonrasında canonical config ve Android Gradle yerelde5'e yükseltildi; bunlar ve
hazırlık belgeleri **yeniden kullanıcı commit/push gerektirir**. Agent yapmaz.
Parent CI'yı son v5 commit kanıtı sayma. İmzalı/audit geçmiş v5 aday
`artifacts/android-production-20261010-v5-candidate/`; APK/AAB imza, manifest,
74 web dosyası/9 font ve private/debug/remote-web korumaları doğrulandı.
Manifest pakette; ayrı Play yükleme dosyası değil. Frozen provenance, son CI,
yalıtılmış WIF/Play provası, taze yedek ve geçiş kapsamı sonraki kapılardır.
Yerel server1344/39skip, client272, ödeme-focused192; ek tools18/web-site24.
İade yayıncı-hatası istisnası ve atomic ayrıntılı TR/EN bildirim yerel kodda;
CLI --apply ile canlı bakiye değişikliği yapılmadı, yeni HTTP yetkisi yok.
Canlı healthy r13 billing boş/test0; ürünler taslak, ücretsiz lisans-test alımı
ve v5 kurulumu/yayını yok. USB mevcut Playv4 doğrulandı; kaldır/data-clear yapma.
Ücretli Cloud Billing/PubSub/RTDN yok; Google proje/API/SA + AWS WIF korunur.
Tam hashler/signer/gates: `docs/ANDROID_V5_BILLING_RELEASE_20261010.md`.
Aşağıdaki OAuth yayını tamam, tekrar çalışma gerektirmez.

**10 Ekim en son durum — Google OAuth marka yayını tamamlandı:**
Kullanıcı mevcut doğrulanmış GRIDSHARD adı/logo/bağlantıların Google izin
ekranında yayımlanmasını ayrıca onayladı. Mevcut projede Publish branding
kullanıldı; panel **Your branding has been verified and is being shown to
users** gösterdi. Başarı gözlemi10 Ekim2026 00:35:54TR (9Ekim21:35:54UTC).
Kanıt `test-results/oauth-publishing/branding-published-20261010.jpg` ignored.
Marka doğrulama/yayın/24 saat bekleme kapıları tamam; aşağıdaki bekliyor
kayıtları tarihçedir. Tekrar verification veya Publish branding çalıştırma.
Mevcut marka bilgileri, External/In production, üç non-sensitive kapsam,
Search Console owner/TXT korundu; DNS/IAM/istemci/sır değişmedi. Oyun/server/
Android/config HEAD diff boş; r13/Playv4/APKAAB/ödeme/ürün/PGS/Billing korundu.
Checkpoint/readiness güncellendi; test/kurulum/deploy/commit/push yok.
Sonraki uygun kontrol cihazda Google/PGS giriş ve mevcut profilin gelmesidir;
konsol başarısını gerçek cihaz testinin yerine koyma. Uygulamayı kaldırma veya
verilerini silme; bu yayın Play Store üretime çıkış veya ödeme açılması değil.

**10 Ekim önceki aşama — marka doğrulandı, Publish branding bekliyordu:**
Kullanıcı erken denemenin aynı uyarıyı döndürebileceği açıklandıktan sonra
**dene** dedi. View issues / I have fixed the issues → Proceed ile yeni
kontrol tamamlandı; Google **Your branding has been verified, but is not
yet being shown to users** gösterdi. Başarı gözlemi10 Ekim2026 00:33:52TR
(9Ekim21:33:52UTC). Publish branding etkin; doğrulama sonucu7 gün içinde
yayımlanmalı. Publish branding basılmadı; mevcut doğrulanmış marka yayını
için ayrı açık kullanıcı onayı istenmeli.24 saat bekleme önceki aşamanın
yönlendirmesidir; yeni başarıyı yok sayarak yeniden doğrulama çalıştırma.
Kanıt `test-results/oauth-publishing/branding-verified-awaits-publish-20261010.jpg`
ignored. Marka alanları/üç kapsam/DNS/IAM değiştirilmedi; OAuth In production,
Search Console owner/TXT/r13/Playv4/APKAAB/ödeme/ürün/PGS/Billing korundu.
Checkpoint/readiness güncellendi; test/kurulum/deploy/commit/push yok.

**10 Ekim önceki aşama — Search Console alan sahipliği doğrulandı:**
Kullanıcının dar action-time onayıyla mevcut Google hesabı
`ozturkalihan2010@gmail.com` için `gridshardgame.com` Domain property eklendi.
Manuel DNS/TXT yolu kullanıldı; geniş Cloudflare/Domain Connect erişimi yok.
Mevcut Cloudflare root Pages CNAME ve play A kayıtları içerik/proxy/TTL dahil
aynen korundu; yalnız root Google TXT / DNS only / Auto eklendi. Reload
karşılaştırması2 eski satırın korunmasını ve toplam3 satırı doğruladı.
Yetkili NS TXT sorgusu exact challenge döndürdü; Search Console Doğrula
**Sahiplik doğrulandı / Alan adı sağlayıcı** sonucunu verdi. TXT'yi kaldırma.
Başarı gözlemi10 Ekim2026 00:28:06TR (9Ekim21:28:06UTC). Google Branding
panelinin24 saat bekleme koşuluyla **11 Ekim2026 00:30TR'den önce yeniden
kontrol yapma**. Marka onayı yok; I have fixed the issues / issues are
incorrect seçilmedi, otomasyon oluşturulmadı. Sonraki tur mevcut marka
akışında bekleme dolduğunu kontrol ederek ilerlemeli; sahipliği tekrar kurma.
Kanıt `test-results/oauth-publishing/search-console-ownership-verified-20261010.jpg`
ve `dns-ownership-txt-saved-20261010.jpg` ignored. Oyun/server/Android/config
HEAD diff boş; OAuth In production/üç non-sensitive kapsam/r13/Playv4/
APKAAB/ödeme/ürün/PGS/IAM/Billing korunur. Test/kurulum/deploy/commit/push yok.
Aşağıdaki mülk/owner henüz yok kayıtları önceki aşamanın tarihçesidir.

**10 Ekim önceki aşama — marka kontrolü sahiplik uyarısıyla sonuçlandı:**
Kullanıcı mevcut ad/logo/link/iletişim ile marka doğrulama akışını ayrıca
onayladı. Verify branding otomatik kontrolü bitti; View issues tek sorun
bildirdi: ana sayfa kullanıcıya kayıtlı değil. Panel önce sahiplik doğrula,
sonra24 saat bekleyip yeniden dene diyor. Marka onayı/manual review kabul
kanıtı yok. Aynı hesap Search Console'da welcome / Web sitesi ekle var,
mevcut mülk görünmüyor. Mülk eklenmedi/owner doğrulanmadı. Read-only NS
sorgusu Cloudflare DNS'i doğruladı; hiçbir DNS kaydı değişmedi.
Sonraki ayrı onaylı dar işlem: `gridshardgame.com` alan mülkü, tek yeni
Google TXT kaydı, mevcut `ozturkalihan2010@gmail.com` hesabının doğrulanmış
owner yapılması. Mevcut kayıt/başka owner token'ı silme veya ezme;
Cloudflare geniş servis bağlama yetkisi verme. Başarı ve panelde istenen
bekleme olmadan I have fixed the issues / issues are incorrect beyanı yapma.
Kanıt `test-results/oauth-publishing/branding-domain-ownership-issue-20261010.jpg`.
OAuth In production/üç non-sensitive kapsam/r13/Playv4/oyun/APKAAB/ödeme/
ürün/PGS/IAM/Billing korunur. Test/kurulum/deploy/commit/push yok. Aşağıdaki
Verify branding basılmadı kayıtları önceki aşamanın tarihçesidir.

**10 Ekim önceki tamamlanan aşama — OAuth In production:**
Kullanıcının ayrıca onayladığı yalnız OAuth üretim geçişi mevcut projede
Audience Publish app → Confirm ile tamamlandı. Reload sonrası External /
In production ve Back to testing doğrulandı. Tekrar Publish app veya
Testing'e geri dönüş yapma. Verification Center artık sensitive/restricted
kapsam olmadığından Data Access doğrulaması gerekmediğini; Branding'in
henüz kullanıcılara gösterilmediğini ve doğrulanması gerektiğini bildirir.
Mevcut ad/logo/home/privacy/Terms/yetkili alan/iletişim salt-okunur doğrulandı,
Save pasif, Verify branding etkin. **Verify branding basılmadı, başvuru yok,
Search Console alan sahipliği kanıtı kontrol edilmedi.** Sonraki marka
başvurusu ayrı onaylı akıştır; yeni kapsam/erişim/DNS ayrıca yetki ister.
Kanıtlar `test-results/oauth-publishing/audience-production-20261010.jpg`
ve `branding-needs-verification-20261010.jpg` ignored. Canlır13/Playkapalıv4/
APKAAB/ödeme/ürünler/PGS/IAM/Billing korunur, oyun kaynakları HEAD'e göre
temiz. Test/kurulum/deploy/commit/push yok. Aşağıdaki Testing ve Publish app
basılmadı kayıtları önceki tamamlanan aşamanın tarihçesidir.

**10 Ekim önceki tamamlanan aşama — OAuth Data Access üç kapsamla kaydedildi:**
Kullanıcı yalnız `openid`, `https://www.googleapis.com/auth/games_lite` ve
`https://www.googleapis.com/auth/drive.appdata` kaydını açıkça onayladı.
Kullanıcının Edge'de yaptığı seçim38 satır boyunca kontrol edildi; agent
Update/Save yaptı. Reload sonrası üç satır korundu, Save pasifti.
Üçü non-sensitive; sensitive/restricted boş. E-posta/profil/tam Drive/
Gmail/legacy games/androidpublisher eklenmedi; Kaydedilmiş Oyunlar kapalı.
Mevcut normal Google ve PGS SDK server-access koduyla eşleşir; oyun kodu
değişmedi. Client PGS6/6; yerel `.venv` pytest içermediği için backend test
çalışmadı, kurulum yapılmadı. R13/Playv4/APK-AAB/ödeme/ürün/IAM/Billing korunur.
Verification Center Testing nedeniyle verification gerekmediğini gösterir;
marka/alan sahipliği doğrulandı demek değildir. Audience External/Testing,
11 tester; Publish app artık etkin **ama basılmadı**. Sonraki ayrı onaylı
işlem yalnız OAuth In production, sonra gerçek brand/domain kapılarının
salt-okunur kontrolüdür; verification başvurusu otomatik yapılmaz.
Kanıtlar `test-results/oauth-publishing/` altında ignored; commit/push yok.
Aşağıdaki Data Access henüz bekliyor kaydı önceki aşamanın tarihçesidir.

**9 Ekim önceki tamamlanan aşama — Terms yayımlandı ve Google URL kaydedildi:**
Kullanıcının scoped action-time onayıyla mevcut Cloudflare `gridshard-public`
Production deployment `528af2d9-8685-4649-826f-1fe24ddd0473` tamamlandı.
21 dosya/261327byte ZIP özeti
`60bd39d1d288e876b457c99c76dac98c9a4152a415b59356b45d248a2bb7b60b`.
Edge upload izni değiştirilmedi; kullanıcı ZIP'i elle seçti.10TR/EN HTML ve
app-ads.txt **11/11 HTTPS200**, birebir manifest hash/size, no-transform/CSP ve
plain mailto ile doğrulandı. `/terms/` ve `/en/terms/` artık canlı;14 madde/dil.
Google Branding'e yalnız `https://gridshardgame.com/terms/` eklendi; Save ve
reload sonrasında korunması/pasif Save doğrulandı. Mevcut logo/home/privacy/
domain/contact korundu, Testing devam ediyor, Publish app kullanılmadı.
15/15 test ve18 Edge yerleşim kontrolü geçti; Chromium yüklenmedi, viewport
sıfırlandı, loopback kapatıldı. İlk TR paragrafın yazım/sıra düzeltmesi ve
Privacy sağlayıcı bulunabilirliği açıklaması dışında onaylı maddeler korundu.
Tam iade-politikası kodu, satış ön bilgisi/hukuki/yaş/ülke ve uygulama içi
şartlar onayı ayrı kapılar olarak sürer. Canlır13/Playv4/ödeme/ürünler/APK-AAB/
OAuth Audience/IAM/kapsam/anahtar/Cloud Billing değişmedi; commit/push yapılmadı.
Ignored receipt/screenshots/ZIP Git ile otomatik taşınmaz. Ayrıntılar checkpoint
ve `docs/PLAY_PUBLISHING_READINESS_20261009.md` içinde. Sonraki iş Terms'ü
yeniden yayımlamak değil, kalan OAuth alan sahipliği/Data Access incelemesi ve
ücretli satış öncesi politika uygulama kapılarıdır; ayrı yetki gerekir.

**9 Ekim önceki yerel taslak aşaması — aşağıdaki kayıt tarihçedir:**
HEAD `748a8d523b5a4822059d8abd581588b42e75c008`, devir notları mevcut; tur
başlangıcında çalışma ağacı temiz. PGS özellikleri/altı credential **Yayınlandı**,
Yayınlama **Yayınlanacak değişiklik yok** ekranlarıyla doğrulandı. Tekrar PGS
yayını/kimlik oluşturma önerme. OAuth Audience ayrı **External / Testing**,
11 tester; Branding eksik nedeniyle Publish app pasif. Son Branding ekranında
ad/iletişim var, logo/URL/yetkili alanlar boş; sonraki kayıt kanıtı ve Data Access
gerçek kapsamları henüz yok. TLS doğrulanmış GET ana sayfa/gizlilik200, Terms404.

Kullanıcı TR/EN Terms metnini uygun buldu, ortak iade politikasını "anlaşalım"
ile onayladı. Terms bölüm9 ve STORE_PURCHASES güncellendi: yalnız ilgili para
birimi gerekirse eksiye iner, oyunla kapatılır; gerçek para borcu/zorunlu alım/
tek başına hesap veya ücretsiz maç engeli yok. Premium ilgili sezonda kapanır;
alınmış ödül/geliştirme/sonuç korunur. Doğrulanmış yayıncı hatasında açık
yüklenmez; işlem/miktar/kalan açık açıklanır, inceleme yolu vardır. Tam teknik
uygulama **bekliyor**: yayıncı-hatası istisnası, ayrıntılı TR/EN bildirim ve
erişim/harcama/replay/reversal testleri. Bu tur kod/bakiye değişmedi.
`docs/TERMS_OF_SERVICE_DRAFT_20261009.md` yayına hazırlık, hukuki kontrol ve
yürürlük tarihi bekler; site kaynaklarına/yayın paketine eklenmedi.
Gizlilikteki reklam hazırlığı cümlesi gerçek r13 durumuyla
yayın öncesi uzlaştırılmalı. Ayrı onaylı entegrasyon/yayın ve canlı TR/EN doğru
içerik/HTTPS200 olmadan Terms URL kullanılmaz. Bu tur deploy/AAB/ödeme/ürün,
Google ayarı/IAM/kapsam/anahtar/Cloud Billing veya commit/push yetkisi yok;
canlı r13 ve Play kapalı test v4 korunur. Ayrıntılar yayın hazırlığı belgesinde.
TR/EN 14 bölüm/draft dışlama kontrolleri ve public-site12/12 geçti; diff-check
temiz, uygulama/site kaynakları değişmedi. Bunlar hukuki onay/yayın kanıtı değil.
Aşağıdaki iş bilgisayarı "PGS yayın henüz doğrulanmadı" kayıtları tarihçedir.

**9 Ekim son kullanıcı talimatı — ev bilgisayarına devir:** İş bilgisayarında
iş bitti; burada devir kaydı dışında yeni işlem yapma. Son HEAD
`f3a60f2e01efbc426f4a067782b8ce36a5afe403`; ea25c1c ile uygulama kaynakları aynı
ve çalışma ağacında temiz. Son panel kanıtı **PGS Yayınlamaya hazır**, etkin
Yayınla; kullanıcıya yayın düğmesi önerildi ama yayın sonucu henüz yok.
Evde önce yayımlanma durumunu doğrula, ardından aynı Google projesinde OAuth
Audience/Data Access/Branding kapılarını tamamla. Türkçe varsayılan/EN çeviri,
altı GRIDSHARD adı/ortak grafik düzeltmesi yeniden yapılmaz. TEST Android ve
mevcut kimlikler korunur. Canlı r13/Play kapalı test v4 değiştirilmez;
ödeme katmanı/deploy/yeni AAB için taze ayrı onay gerekir.
Bu dosya, CODEX_CHECKPOINT ve yayın hazırlığı belgesinin son güncellemeleri
**yerel, henüz commit/push/ev bilgisayarına aktarım yapılmadı**. Kullanıcı
repo/notları senkronize etmeden ev checkout'u güncel sayılmaz. Ignored
artifacts/görseller/provalar ve dış sırlar Git ile taşınmaz; sırları Git'e
ekleme. Evde dosya ve gerekirse SSH kaynak-IP/pinli erişim tekrar doğrulanır.

**9 Ekim sonraki aktif akış — önce yayın altyapısı:** Kullanıcı PGS/OAuth
hazırlığını tamamlamak, post-v4 kodlarını korumak ve gerçek tester geri
bildiriminden sonra ayrı sunucu/AAB güncellemesi yapmak istiyor. Yerel HEAD
`f3a60f2e01efbc426f4a067782b8ce36a5afe403`; uygulama kaynakları HEAD'e göre
temiz. Bu tur deploy, AAB, ürün etkinleştirme veya canlı ödeme onayı yok.
Son PGS özellik ekranlarında iki dilde GRIDSHARD/TR-EN açıklamaları/Strateji
kaydedildi. Kullanıcı varsayılan dili Türkçe yapıp kaydettiğini bildirdi;
Altı Türkçe credential adı tamamlandı; son Yayınlama **Yayınlamaya hazır**,
altı taslak/birer değişiklik ve etkin Yayınla gösteriyor. **PGS hazır,
yayın gerçekleştiği henüz doğrulanmadı.** Sıradaki adım yalnız PGS Yayınla
ve onay/sonuç kanıtı; OAuth Audience/Branding ayrı açık kapı. ID/paket/SHA/
sırlar ve eski TEST Android credential korunur; yeni yükleme/korsanlık ayarı
değişmez. PGS yayını, Play APK/AAB üretim dağıtımı veya OAuth üretim geçişi
değildir.
Kullanıcının dil geçişi denemesinde grafik alanı ortak çıktı; önceki ayrı dil
grafikleri/ters kayıt yorumu yanlıştı. Ana Play mağaza grafiğinin aynısı
kullanılır. Kimlik/Recall/Saved Games ayarları değişmez. Cloud kapsam/alan sahipliği ve gerçek kullanım
şartları sayfası henüz açık kapı; `/terms/` 404, sahte bağlantı girilmez.
PGS/OAuth/Play uygulama üretim yayını birbirinden ayrıdır ve henüz doğrulanmadı.
Sıradaki kullanıcı adımı ve sınırlar: `docs/PLAY_PUBLISHING_READINESS_20261009.md`.
Canlı geçiş için taze onay/yedek ve yayın kapıları yeniden gerekir.

**9 Ekim en yeni karar — ücretli Cloud yok:** Kullanıcı Cloud Billing/kart/
deneme istemiyor ve ücretsiz yolu seçti. Mevcut proje, Play API, billing SA,
AWS WIF ve PGS/OAuth korunur; mevcut tek-seferlik ürünlerde AWS satın alma
doğrulaması/tüketimi + periyodik Voided Purchases iade kontrolü kullanılır.
RTDN zorunlu değildir; önceki RTDN-only startup ret sonucu WIF-only yolu
engellemez. Yeni opt-in `docker-compose.google-play-polling.yml` yerelde
hazır (1800sn, RTDN değişkenleri boş), canlıya uygulanmadı. İadeler anlık
değil, başarılı sonraki taramada; stale/hata/29gün kesinti/revoke caveat'leri
`docs/GOOGLE_PLAY_AWS_WIF.md` ve `docs/STORE_PURCHASES.md` içinde.
Yerel **142 test geçti**. Windows OpenSSH aynı pinle bağlandı; Git SSH banner
timeout ve Docker için sudo ihtiyacı nedeniyle güvenlik kuralı/grup değişmedi.
Mevcut r13 imajında ayrı PG17/Redis/WIF-only330sn/restart/restore provası
**geçti** (9 Ekim11:52 UTC): 33 lease/profil kontrolü, gerçek WIF cold/cache/
zorlanmış expiry refresh ve iade taraması üç açılışta başarılı. PostgreSQL
checkpoint restartta ve boş hedef backup/restore'da birebir korundu; ordinary/
reviewer fixture profil/token da korundu. Tam bir saatlik gerçek token expiry
beklenmedi; cache eşiği zorlanıp gerçek refresh yapıldı. Hazırlık bağımlılık/
mount/import/umask hataları ve SSH kaynak-IP değişimi checkpoint'te kayıtlı.
Güvenlik kısıtları gevşetilmedi, gerçek WIF UID10001/0400/salt-okunur. Son geçici
ağ/kapsayıcı/fixture/WIF kopyası temizliği ayrıca doğrulandı; özel proof/loglar
korundu. Canlı dört ID/starttime aynı, HTTPS200/ok ve lease hazır; canlı
mutabakat disabled. Taze canlı geçiş onayı henüz yok.
Yeni ekranlarda 10 ürünün etkin seçenek sayısı0; 120 Akı standard/Buy/legacy
compatible/Taslak ve yalnız Türkiye29,99 TL. Diğer fiyatlar teyit edilmedi.
Lisans testinde geliştirici1 seçili, GRIDSHARD Test11 seçili değil; telefonun
indiren hesabının seçili hesapla aynı olduğu kullanıcı teyidi var. Ödeme
test kartı/banner henüz kanıtlanmadı. **Gerçek ödeme hâlâ kapalı; yeni canlı
geçiş/ürün etkinleştirme/lisans cihazı testi ayrı onay ve kanıt ister.**

**9 Ekim ödeme devamı:** Güncel dar SSH kaynak kuralından sonra pinli SSH yeniden
başarılı; canlı r13 image ve dört Compose katmanı, reklam live/SSV1/test0 korunuyor.
Özel host WIF probe'unda STS/SA impersonation200 ve Play finans/iade okuması artık
**200**; aşağıdaki 8 Ekim401 sonucu tarihsel. Katalog listesi403 sürüyor; izin
genişletilmedi. API kapsayıcısı IMDSv2/instance/rol-adı200 ve dış HTTPS sağlık200.
Google Play/WIF ve RTDN canlı ayarları henüz yok; **ödeme hâlâ kapalı**. Kullanıcı
doğru mevcut projede `gridshard-play-rtdn` konusunu ve Google Play'e yalnız konu
üzerinde Publisher iznini kaydetti; ayrı `gridshard-play-rtdn-push` hesabı
Enabled / No keys. Yeni push hesabı üzerinde Pub/Sub agent'ına dar OIDC-only
token izni kullanıcı tarafından kaydedildi ve ekranla doğrulandı.
`gridshard-play-rtdn-sub` authenticated Push aboneliği oluşturuldu/active;
kaydedilmiş endpoint/audience aynı `/billing/google/rtdn`, push SA doğru,
unwrapping0, retry10–600sn, ack30sn, retention7gün, Never expire doğrulandı.
Gerçek teslim testi ve Play RTDN bağlantısı yapılmadı. Mevcut r13 auth kodunda
RTDN ile satın alma aynı paket değişkenini paylaşır; RTDN-only eksik auth
config startup'ta reddedilir (ağsız probe doğrulandı). RTDN kullanılacaksa aynı
r13 imajında WIF + RTDN birlikte açılır; bu satın alma doğrulamasını da etkinleştirir, canlı
değişiklik için yeni açık onay gerekir. Yerel sahte HTTP/veri testleri60 geçti;
gerçek teslim/yalıtılmış üretim imajı kanıtı değildir. Sonra yalıtılmış token/restart/iade kontrolleri
→ ayrı canlı geçiş/ürün etkinleştirme/lisans testi onayları sıradadır. Deploy,
oyuncu verisi, APK/AAB veya ürünlerde değişiklik yapılmadı. Yeni savaş kaynakları
commit edilmiş olsa da canlı r13/v4'e sessizce eklenmez. Ayrıntı CODEX_CHECKPOINT'te.

**9 Ekim sonraki Cloud Billing kontrolü:** Kullanıcı aynı proje Billing ekranını
paylaştı: proje bir faturalandırma hesabına bağlı **değil**. Resmî Pub/Sub / Free
Tier koşulları aktif Cloud Billing ister; konu/abonelik active görünümü gerçek
teslimin kanıtı değildir. Kart/deneme/hesap bağlantısı veya canlı geçiş yapılmadı.
Manage billing accounts kullanıcı tarafından salt-okunur kontrol edildi;
`None selected` ile kuruluş filtresi kaldırılınca da aktif hesap listesi boş.
Kullanıcı bireysel geliştirici; şirket ödeme profili kurulmaz. Yeni Cloud
Billing/ödeme yöntemi kurulumu veya erteleme kullanıcı kararını bekler;
hesap açma/bağlama/deneme onayı yok. Son yeniden SSH envanteri sağlıklı;
yalıtılmış WIF + RTDN konteyner/PG17/Redis provası henüz başlatılmadı.

**8 Ekim en yeni Codex sonucu:** exact commit `804da6f3` için CI beş iş yeşil.
Taze `server-aws-20261008-billing-r13-candidate` kaynak ZIP'i
`b0a2cb4fc9e9a1bf97035f918d273d59bb71cb592a0c61867bfc155f960951eb`;
API image `billing-r13-20261008-r2` / `sha256:3064683905f36f88c8aded85c0a27d2be900ad84ac622ed6ec59405ed30fd4d1`.
Hedef Linux source sunucu1326/1skip; Windows checkout araçları17/17,
istemci248 ve Node araçları32 geçti. Yalıtılmış PG17/Redis7 reviewer premium,
r13 API fiyat/sınır/UTC reset/yeni UI,330s lease,restart ve maintenance
backup/restore **geçti**, kendi disposable ortamı temizlendi. Operator ZIP
mode/umask ve Git olmayan arşiv test bağlamı hataları kaynak korumalarını
kaldırmadan düzeltildi; ayrıntılı skip/sınırlar checkpoint'te, eski loglar saklı.
Gerçek host Google WIF/impersonation200 başarılı ama Play finans erişimi401
permissionDenied ve ürün listesi403: **ödeme kapalı**, ürün etkinleştirme/izin
genişletme yok. Canlı r12/PGS/demo/reklam live/SSV1/test0 korunuyor.
**Son taze onay alındı; r13 deploy-r2 exit0 ve imzalı v4 APK/AAB hazır.**
İlk geçişin iç330s kontrolü geçti ama dış ham HTML, Cloudflare'ın e-posta
gizleme/beacon dönüşümleri nedeniyle eşleşmedi. Güvenli r12 image/config
rollback doğrulandı, DB geri yüklenmedi;12 profil/12 kimlik/66 savaş korundu.
Ignored operator witness yalnız bilinen edge dönüşümlerini ayırır ve kalan
HTML'yi pinned SHA ile birebir karşılaştırır; negatif fixture ve gerçek r12
origin karşılaştırması geçti. Aynı imajla ayrı taze yedek/log/witness kullanan
ikinci deneme exit0 tamamlandı: `2026-10-07T22:25:22Z` (8 Ekim01:25TR).
İç+dış330s/33, unsigned SSV403, kritik log0; reviewer1/1 ve tüm eski
profil/kimlik/takım fingerprint'leri aynı. Backup/rollback/private env/secret
mount bağımsız post-check de geçti. Mevcut v3 upload signer ile offline v4
build32s ve binary audit exit0: `artifacts/android-production-20261008-v4/`.
APK SHA `79ef8f3638cc67da6823b5fec14318f4c11d129d26e81128905941fcde7bc5d1`;
AAB SHA `9577008d0bd068614ac95daebf80fb2c409b55fc794acc3f33c69665afe6443f`.
Her pakette74 asset/9 gömülü font; özel sır/AD_ID/debuggable/remote-web yok,
Firebase auto-init kapalı; source hâlâ804da6f, yalnız iki devir belgesi değişik.
Audit/provenance aynı teslim klasöründe. USB/Play yüklemesi ve fiziksel cihaz
testi yapılmadı; AAB'yi kullanıcı dahili teste yükler ve verileri silmeden
Play üzerinden güncelleyip PGS eski profil/reviewer premium doğrular.
Gerçek/sahte ödeme kapalı, Play API yetki sorunu ve canonical App Link ayrı
kaldı; Console fiyatları veya tam erişim/yasal beyan doğrulanmış sayılmaz.
Commit/push kullanıcıda; bu ek yalnız devir kanıtıdır, uygulama source değişmedi.

**Yazan:** Claude, 7 Ekim 2026, iş bilgisayarı. **Neden:** Claude'un haftalık kullanım hakkı dolmak üzere; kullanıcı yayın işini Codex ile sürdürecek. Bu dosya o iş için tek başına yeterli olacak şekilde yazıldı; ayrıntı gerekirse `CLAUDE_CHECKPOINT.md` (özellikle "6 Ekim akşamı (ev bilgisayarı): kalite denetimi yeşil, sunucu r12 canlıda" bölümü) ve `docs/SERVER_PRODUCTION_RUNBOOK.md`, `docs/MOBILE_RELEASE_RUNBOOK.md`.

**İstenen iş:** (1) canlı sunucuyu r12'den r13'e güncellemek, (2) yeni imzalı APK/AAB üretmek. Kullanıcı sohbette "v3 apk ve aab" dedi; sürüm kodu 3 Play'in dahili test kanalına yüklendiği için yeni paket **sürüm kodu 4** olmalıdır (Play aynı kodu ikinci kez kabul etmez). Kullanıcıya bunu teyit ettir.

## 1. Nerede yapılır

**Ev bilgisayarında.** İş bilgisayarında Android imza anahtarı yok, Docker motoru kapalı ve aşağıdaki r12 betikleri yok. Evde olması gerekenler (içerikleri ekrana ya da dosyaya yazdırılmaz):

- `secrets\android-release\gridshard-upload.p12` ve `credential.dpapi.xml` (paket imzası; DPAPI kaydı o Windows hesabına bağlıdır).
- `artifacts/server-aws-20261006-child-safety-r12-candidate/` — r12'de kullanılan betikler (kaynak paketi hazırlama, yalıtılmış doğrulama, `deploy.sh`) ve `server-receipts/` altında makbuzlar ile üç adımın günlükleri. Git'te izlenmez. **r13 bu betiklerin uyarlamasıyla yapılır; önce okuyun.** (Bu notu yazan oturum o betikleri iş bilgisayarından göremedi; aşağıdaki adımlar Claude'un ev oturumunun kaydına dayanır.)
- `artifacts/play-review-access/ssh/known_hosts` — sunucunun sabitlenmiş açık anahtar kaydı; `artifacts/play-review-access/server-receipts/` — r11 kayıtları.
- Docker (r12'de 29.6.2 ile çalışıldı).

## 2. Başlangıç durumu (7 Ekim'de doğrulandı)

- Depo: `main` = `origin/main` = `f8b24fe`, çalışma ağacı temizdi. GitHub kalite denetimi bu commit için **yeşil** (PostgreSQL 17, gerçek Redis, imaj derlemesi ve imaj duman testi dahil). Bu dosya ve `CLAUDE_CHECKPOINT.md` sonradan eklendi; kullanıcı commit + push edecek. Başlamadan önce `git pull`, `git status --short`, ve son commit için denetim sonucu: `https://api.github.com/repos/ozturkalihan2026/GRIDSHARD/actions/runs` (depo herkese açık; oturum gerekmez).
- Canlı sunucu: **r12**, imaj `gridshard-production-relay-web:child-safety-r12-20261006`, sürüm klasörü `/opt/gridshard/releases/aws-20261006-child-safety-r12`. Compose katmanı **dört** tanedir: production + cloudflare + play-games + play-review. Kullanıcı adı `ubuntu`.
- Play: dahili testte **v3** (sürüm kodu 3, sürüm adı `2.1.0-beta.72`). `config/android-production.json` ve `android/app/build.gradle` içinde sürüm kodu şu an 3.
- r12 kaynağından (`60d0cbb` içeriği) bugüne sunucu farkı: yalnız `server/app` altında dört dosya (`main.py`, `player_settings.py`, `player_data_store.py`, `meta_progression.py`). `server/migrations`, Compose dosyaları, `Dockerfile` ve bağımlılık dosyalarında `git diff 60d0cbb HEAD` boş. Yine de r12'deki gibi iki kaynak paketi karşılaştırılarak doğrulanmalı.

## 3. Bu sürümle gelenler

Sunucu (r13):

- **Analitik yaş sorusu:** analitik izni kapalı gelir; açmak isteyene doğum yılı sorulur, kararı sunucu verir (eşik 18), doğum yılı saklanmaz. Sonuç oyuncunun ayar belgesine yazılır; tablo/şema değişmez.
- **Mağaza sandıkları:** günlük alım sınırı (Bronz 5, Gümüş 3, Altın 2, Elmas 1; UTC gün dönümünde yenilenir; `STORE_CHEST_DAILY_LIMITS`) ve yeni fiyatlar (Bronz 1000, Gümüş 2000 Devre Kredisi; Altın 500, Elmas 1000 Akı; `STORE_CHEST_PRICES`). Sayım mevcut mağaza makbuzlarından yapılır; kayıt biçimi değişmez. Hediye Bronz Sandık (8 saatte bir) sınıra girmez.
- İmajın içindeki web arayüzü de yenilenir (aşağıdaki istemci değişiklikleri).

**Slogan (7 Ekim, kullanıcı kararı; bu not yazıldıktan sonra eklendi):** "Devreni kur. Stratejini konuştur." / "Build your circuit. Make your strategy count." Açılış ekranı, sayfa başlığı, web bildirimi ve `/identity` uç noktası değişti; eski slogan ("…Çekirdeği Kır.") hiçbir yerde kalmamalı. Kaynak paketini bu değişikliği içeren commit'ten üretin ve denetim yeşil olmadan başlamayın.

İstemci (web arayüzü ve yeni paket): analitik yaş sorusu ekranı; mağazada hediye düğmesi yerine tek açma düğmesi ("HEDİYE SANDIK AÇ" → "SANDIK AÇ"), kartta "Günlük alım hakkı x / y", "ÖDÜL LİSTESİ" sekmesi; Kartlar'da Bilgi / Seç kutusu; takım isteği kutucukları.

**Play'deki v3, r13 ile çalışmaya devam eder:** yeni fiyatları gösterir (fiyat sunucudan gelir); sınırı aşan alımda sunucunun iletisini görür ("Bugünkü alım sınırına ulaştın: …"); analitiği hiç açamaz (sunucu güncelleme ister). Kalan hak satırı, tek düğme ve yaş sorusu yeni pakette görünür.

## 4. Değişmez kurallar (kullanıcı kararları)

1. **Gizli bilgi sohbete ve dosyaya yazılmaz.** Depo herkese açıktır: sunucunun IP adresi ve SSH anahtarının yolu izlenen hiçbir dosyaya yazılmaz; ikisini de kullanıcı sohbette verir.
2. **Canlı geçişten hemen önce kullanıcının açık onayı alınır.** Önceki bir onay yeni geçiş için geçerli değildir.
3. Bağlanmadan önce sunucunun ED25519 anahtarı `CODEX_CHECKPOINT.md` içindeki kayıtlı parmak iziyle ve sabitlenmiş `known_hosts` kaydıyla karşılaştırılır; eşleşmezse bağlanılmaz. Sıkı anahtar denetimiyle bağlanılır.
4. Gerçek reklam ve gerçek ödeme açılmaz; test kipleri kapalı kalır.
5. Oyuncu verisi sıfırlanmaz. Kullanıcının "Uç" hesabına ve inceleme (demo) hesabına dokunulmaz.
6. Telefona USB ile APK kurulmaz (Play imzası farklıdır). AAB'yi kullanıcı Play'e yükler.
7. Commit ve push'u kullanıcı yapar.
8. Play Console'daki beyanlar ve yasal uyum kutusu kullanıcının kararıdır; teknik denetim hukuki uyum belgesi değildir. Denenmemiş bir şey "denendi" diye yazılmaz.
9. `CLAUDE_CHECKPOINT.md` Claude'un devir notudur; Codex sonucu kendi `CODEX_CHECKPOINT.md` dosyasına yazar. Bu dosyanın sonuna kısa bir "sonuç" bölümü eklenmesi Claude'un sonraki oturumuna yeter.

## 5. Sunucu r13 — adımlar (r12 ile aynı yöntem)

1. **Kaynak paketi:** `python tools/release_guard.py`, sonra `python tools/package_release.py`. SHA-256 değerini kaydet. r12 kaynak paketiyle karşılaştır: fark yalnız `server/app` (ve istemci dosyaları) olmalı; Compose, Dockerfile, bağımlılık ve `server/migrations` aynı kalmalı. Fark çıkarsa dur ve kullanıcıya bildir.
2. **Salt okunur denetim:** çalışan Compose projesi, dört katman, imaj etiketi ve özeti, sağlıklı kapsayıcılar, aktif maç/bağlantı sayısı, disk alanı.
3. **Yeni sürüm klasörü:** `/opt/gridshard/releases/` altında r13 için ayrı klasör; özel ortam dosyası çalışan (r12) sürümden kopyalanır, içeriği gösterilmez. İmaj ve bakım imajı yeni etiketle derlenir. Çalışan r12 imajına geri dönüş etiketi verilir (r12'de `before-child-safety-r12-20261006` idi).
4. **Yalıtılmış doğrulama (canlıya bağlanmadan):** ayrı PostgreSQL 17 / Redis 7 ile tam sunucu test paketi (r12'de 1230 geçti, 1 atlandı; bugün yerelde PostgreSQL'siz 1208 geçti) ve `tools/production_container_smoke.py` (inceleme girişi, `--soak-seconds 330`, yeniden başlatma, boş hedefe yedek/geri yükleme). Bu ortamda ayrıca yeni davranışı sına: mağaza görünümünde `daily_limit` / `remaining_today` / `limit_resets_at` alanları ve fiyatlar (1000 / 2000 / 500 / 1000); sınırı aşan alımın 422 ile reddi. Deneme kapsayıcıları ve ağı temizlenir; makbuz yazılır.
5. **Kullanıcının açık onayı.**
6. **Geçiş (`deploy.sh` uyarlaması):** aktif maç ve bağlantı yokken; API ve Caddy durur (r12'de kesinti bir dakikanın altındaydı); taze çevrimdışı yedek `/var/backups/gridshard-production/` altına alınır ve doğrulanır (kurulum kimliği, kayıt sayıları, dosya özeti, izinler, `pg_restore --list`); yeni imaj açılır.
7. **Geçişten sonra:** profil, kimlik ve savaş sonucu sayıları ile profil/kimlik/takım satır özetleri geçişten öncekiyle aynı; inceleme hesabının satırları yerinde; kapsayıcı içinde Play Games sırrı ve inceleme doğrulayıcısı salt okunur bağlı, reklam ve ödül kapalı, test kipleri kapalı, sohbet yalnız hazır mesaj kabul ediyor; dışarıdan HTTPS `/health` sağlıklı, yeni web arayüzü sunuluyor (sayfada `chest-store-limit-note` ve `analytics-age-panel` kimlikli öğeler var), imzasız reklam geri çağrısı 403; 330 saniyelik canlı sağlık denetimi; günlükte kritik işaret yok.
8. **Geri dönüş:** önceki imajı ve ayarı açmaktır; veritabanını eski yedeğe döndürmek değildir. r12 imajı, r12 sürüm klasörü ve yeni yedek saklanır.
9. Makbuzlar sürüm klasörüne ve `artifacts/` altına (izlenmeyen) yazılır.

## 6. Android paketi — sürüm kodu 4

1. `config/android-production.json` içinde `versionCode` 3 → 4. Sürüm adı kullanıcı aksini söylemedikçe `2.1.0-beta.72` kalır (değişirse `server/app/version.py` ve `tools/release_guard.py` içindeki beklenen sürüm de değişir). Derleme betiği `android/app/build.gradle` dosyasını bu ayardan günceller; iki dosya da commit edilir.
2. Kullanıcının "üret" demesiyle: `tools/build-android-production.ps1 -Offline` (v3 böyle üretildi). Çıktı izlenmeyen bir klasöre (ör. `artifacts/android-production-<tarih>-v4/`).
3. Denetim: `tools/audit-android-review-release.ps1 -Directory <klasör> -VersionCode 4`. Beklenenler: imza sertifikası v2 ve v3 ile aynı; APK ve AAB imzaları geçerli; sürüm kodu 4; hata ayıklama kapalı; reklam kimliği izni yok; manifestte Firebase otomatik başlatma ve analitik toplama kapalı; 9 yazı tipi dosyası pakette, Google yazı tipi adresi yok; uzak web adresi ve inceleme sırları pakette yok; paketteki web dosyaları `dist/` ile birebir aynı.
4. Pakette yeni arayüzün bulunduğuna bak: `SANDIK AÇ`, `Günlük alım hakkı`, yaş sorusu ekranı.
5. **Sıra:** önce sunucu r13, sonra paket. Yeni paket yaş sorusu ve sınır alanları için r13'e ihtiyaç duyar; r12'ye karşı çalışır ama bu özellikler görünmez.
6. Açık soru (karar verilmedi, değiştirmeyin): web görünümünde otomatik doldurmanın kapatılması.

## 7. Site paketi (aynı oturumda yapılabilir)

Gizlilik metni (`public-site/content.js`) yaş sorusunu ve kısmi veri silmeyi anlatıyor; canlı sitede eski metin var. `node -e "require('./tools/build-public-site.js').buildPublicSite()"`, `node tools/check-public-site.js`, sonra `build/public-site` içeriği kökte `index.html` olacak şekilde ziplenir. Kullanıcı Cloudflare'de gridshard-public → Create deployment → Production ile yükler; **r13 canlıya geçtikten sonra**.

## 8. Bittiğinde

- Kullanıcıda: AAB'yi Play'e yüklemek (dahili ya da kapalı test), cihazda denemek (mağaza: fiyatlar, günlük hak satırı, beşinci Bronz alımından sonra "SINIR DOLDU", tek açma düğmesinin üç hali; Ayarlar'da analitik yaş sorusu; menü müziği; bildirim), siteyi yüklemek, commit + push.
- Play Console'da sırada **kapalı test** var (kanal "Etkin değil"; görevler: ülke seç, test kullanıcılarını seç, yeni sürüm oluştur, önizle ve onayla, incelemeye gönder). Mağaza girişi metinleri ve görselleri hazır: `docs/PLAY_STORE_LISTING.md` (görseller yalnız iş bilgisayarında, `artifacts/play-store-listing-20261007/`).
- Kayda geçirilecekler: kaynak paketi özeti, imaj etiketi ve özeti, yedek klasörü, geçiş saati, önce/sonra sayıları, paket dosyalarının SHA-256 değerleri, denetim sonucu; ve **denenmeyenler** (gerçek cihaz, canlıda inceleme hesabıyla giriş).

## 9. Bilinen tuzaklar

- İmaj duman testi yedek klasörünü kapsayıcının kendi kullanıcısıyla okur ve temizler (`864ebc9` düzeltmesi); Linux'ta sıradan kullanıcıyla dosyaya doğrudan erişmeye çalışmayın.
- Uçtan uca testler izlenen `qa_reports/startup-*.png` dosyalarının üzerine yazar; koşudan sonra `git restore qa_reports/startup-*.png`.
- Hiç maç oynamamış hesapta yapay zekâ rakip ilk hamlesini 15 saniye sonra yapar (ilk maç kolaylığı); canlıda yeni hesapla yapılan bir denemede bu hata sanılmasın.
- Bu notun r12 ile ilgili sayıları (sürüm klasörü, etiketler, test sayıları) Claude'un 6 Ekim ev oturumunun kaydından alınmıştır; sunucudaki gerçek durum salt okunur denetimle teyit edilmelidir.

## 10. Codex sonucu — 7 Ekim, iş bilgisayarı

Kullanıcı son sürüm/kapalı test öncesinde savaş sonu reklamını açmak istedi;
4. maddedeki reklamı kalıcı kapalı tutma kararı bununla değişti. Gerçek ödeme
ve doğrulanmamış canlı geçiş açılmadı; yeni canlı onay şartı korunuyor.
Geciken SSV/bağlantıda ikinci reklam yerine ödül kontrolü eklendi; test
reklamı gerçek ödül üretmez. Kaynak versionCode artık 4 (config + Gradle),
imzalı APK/AAB henüz yok. Tam istemci 246, PostgreSQL 17 dahil reklam/ödül
alt kümesi 73, build sözleşmesi 9 test geçti; yerel web build üretildi.
Gerçek Android/SSV ve tam r13 imaj smoke/backup/restore bu değişikliklerle
henüz denenmedi. Ayrıntı `CODEX_CHECKPOINT.md` ve `docs/REWARDED_AD_LAUNCH.md`.
Docker işte çalışıyor; Java/Android SDK, upload anahtarı ve r12 özel
betik/known_hosts kayıtları beklenen konumlarda bulunamadı. AdMob sınırlı
sunum gösteriyor: tüm reklamların engellendiği sonucunu çıkarmayın; tam
sunum mağaza/doğrulama bekliyor, doluluk garanti değil. Commit/push kullanıcıda.

Son kullanıcı mesajı canlı reklam rollout'u için açık yetki verdi; tam r13
imaj geçişinin hemen öncesindeki ayrı onay/yedek kapıları korunur. Son erişim
kontrolünde TCP 22 yanıtsız, iş ağında HTTPS `MEB Erişim Engeli / games`;
canlı ayar uygulanmadı. Kullanıcı upload anahtarına şu anda erişemiyor,
dolayısıyla burada imzalı v4 henüz yok. Build/audit araç yolları iş/ev için
parametreli hale getirildi; JDK/SDK çözümleyicisinin dört testi geçti, araç
kurulmadı. Güncel devam noktası `CODEX_CHECKPOINT.md` en üst bölümüdür.

**En son sonuç — canlı reklam açıldı:** Dar SSH izni sonrası güvenilen
ED25519 eşleşti. Mevcut r12 imajında yalnız özel rollout `live`; SSV1 ve
test0/UMP/kalıcı tek-ödül korumaları sürer. Taze offline yedek + değişmeyen
kalıcı fingerprint/sayılar (12profil/12kimlik/65savaş),34 iç ve331s/34 dış
health/unsignedSSV403/son audit geçti. R1 Cloudflare-egress403 nedeniyle
disabled'a güvenli döndü; R2 bağımsız dış witness ile success/0. Cloudflare
değiştirilmedi, DB restore/silme yok. R13 geçişinde mevcut **live** ayarını
koruyun; eski kapalı reklam talimatı güncel karar değil. **R13 dağıtılmadı,
imzalı v4 ve gerçek cihaz/Google SSV ödül testi hâlâ yok**; aynı upload
anahtarı kullanıcıya işte erişilebilir değil. Checkpoint en üstü günceldir.

## 11. Evde devam — ödeme paneli, r13 ve v4 (7 Ekim)

**Kullanıcı kararı:** iş bilgisayarında dur; yarım kalan ödeme işini, r13
sunucu güncellemesini ve imzalı v4 APK/AAB'yi ev bilgisayarında sürdür.
Bu bölüm önceki "ürünler/API henüz yok" ve "sürüm kodu 3" durumlarını
günceller; önceki r12 reklam canlı açılış sonucu korunur. Bu not ödeme
açma veya yeni canlı dağıtım için otomatik onay değildir.

### Panelde tamamlananlar ve kanıt sınırı

- **Cloud projesi:** My First Project; numara `376018782491`,
  ID `project-37a84396-b930-4141-b4d`. Dashboard numarası ve mevcut
  OAuth client ID önekleri eşleşiyor. Clients ekranında **GRIDSHARD Play
  Hybrid PQC**, **GRIDSHARD Play Hybrid Classical**, **GRIDSHARD Play**,
  **GRIDSHARD Android Release**, **GRIDSHARD Play Games Server** (Web),
  **GRIDSHARD TEST Android** var. Audience altında eski test kullanıcıları
  da görüldü (adresler redakte; bu nota alınmadı). Yeni proje/OAuth
  istemcisi veya test listesi açma, eski çalışan girişi değiştirme.
- **API etkinliği bağımsız ekran kanıtı:** Google Play Android Developer
  API / `androidpublisher.googleapis.com` / **API Enabled**.
- **Hizmet hesabı:** oluşturulduğu ve Play'de davet düğmesine basıldığı
  kullanıcı teyidi. Önerilen hesap adı GRIDSHARD Play Billing,
  ID `gridshard-play-billing` idi; **gerçek e-posta/ID henüz okunmadı**.
  Cloud tarafında Owner/Editor veya gereksiz proje rolü verilmemesi istendi.
  Play izin modalında yalnız **GRIDSHARD** için finansal verileri görüntüleme
  ve siparişleri/abonelikleri yönetme seçiliydi; yönetici ve diğer izinler
  kapalıydı. `Uygula` zorunlu temel erişim seçilmediği için kapalıydı;
  **Uygulama bilgilerini görüntüleme (salt okunur)** da seçilmesi söylendi.
  Kullanıcı ardından davete bastığını bildirdi. **Son kullanıcı listesi,
  davetin durumu ve nihai üç izin henüz bağımsız görülmedi.** İlk devamda
  mevcut hizmet hesabı/Play kaydını kontrol et; tekrar hesap/davet oluşturma.
- **Lisans testi:** kullanıcı hesap düzeyindeki listeyi kaydettiğini
  bildirdi; liste/telefondaki gerçek Play kurulum hesabı henüz okunmadı.
  OAuth Audience, Play Games Testers, kapalı test ve lisans testi ayrı
  erişim kapılarıdır; birindeki kayıt diğerinin yerine geçmez.
- **Ürün listesi:** 10/10 tam kimlikler ekranla eşleşti, her üründe etkin
  satın alma seçeneği/teklif **0**. İlk ürünün ayrıntısında `standard`,
  Satın al, Türkiye, **Taslak**, eski sürümlerle uyumlu etiketi görüldü.
  Nihai Türkiye fiyatı **29,99 TL** ayrı tablo görüntüsüyle doğrulandı.
  Diğer dokuz ürünün ayrıntı/fiyat/ülke ayarı tek tek doğrulanmadı.

### Ürünlerde hedeflenen ayarlar (satış açma talimatı değildir)

| Ürün kimliği | İçerik | Hedef nihai Türkiye fiyatı |
| --- | --- | --- |
| `gridshard.flux_120` | 120 Akı | 29,99 TL |
| `gridshard.flux_260` | 260 Akı | 59,99 TL |
| `gridshard.flux_480` | 480 Akı | 99,99 TL |
| `gridshard.flux_1050` | 1.050 Akı | 199,99 TL |
| `gridshard.credits_1000` | 1.000 Devre Kredisi | 29,99 TL |
| `gridshard.credits_2200` | 2.200 Devre Kredisi | 59,99 TL |
| `gridshard.credits_4000` | 4.000 Devre Kredisi | 99,99 TL |
| `gridshard.credits_9000` | 9.000 Devre Kredisi | 199,99 TL |
| `gridshard.season_pass_premium` | Mevcut sezon premium ödül hattı | 199,99 TL |
| `gridshard.battle_rewards_premium` | Mevcut sezon savaş kredi/XP +%50; kupa hariç | 199,99 TL |

7 Ekim akşamı kullanıcı kararıyla bu iki premium ürünün hedef fiyatı
99,99 TL'den **199,99 TL**'ye çıktı. Güncel kaynak/istemci ve yerel testler
bu fiyatı kullanır; Play Console'daki iki Türkiye fiyatı henüz bağımsız
doğrulanmadı. Android'de gösterilen/tahsil edilen fiyat Play'den gelir;
yerel fiyat değişikliği Console fiyatını güncellemez. Akı/Devre Kredisi
paketleri değişmedi. Eski dondurulmuş aday yerine güncel kaynakla yeniden
aday hazırlanmalı; bu not ürün etkinleştirme veya satış açma onayı değildir.

Tek seferlik ürün, tek normal seçenek `standard` / **Satın al**, içerik
**Dijital içerik**, çoklu miktar kapalı, simge/etiketler boş bırakılabilir.
Sezon ürünleri otomatik yenilenen abonelik değildir. Hak sunucuda sezon
başına tutulur; başka sezon tekrar alım tüketilebilir işlemle mümkündür.

Bu hazırlıkta **yalnız Türkiye kullanılabilir**, diğer bölgeler kullanılamaz
olacak şekilde yönlendirildi. İlk ürün bu kapsamda taslak kaydedildi;
diğer dokuzunun kapsamını ayrıca denetle. Bölgesel nihai fiyatı esas al:
toplu fiyat aracına 29,99 girilince ekranda %20 vergiyle **35,99** çıktı;
Türkiye satırının fiyatı doğrudan **29,99** olarak düzeltildi. Tüm bölgeler
kullanılabilir ama çoğunun fiyatı boşken **taslak kaydı da hata verdi**;
diğer bölgeler kullanılamaz yapılınca ilk kayıt başarıyla taslakta göründü.
Ürün ayrıntısındaki ABD yaş derecesi **Belirtilmemiş** yalnız taslak hazırlık
olarak bırakıldı; hedef kitle 13+ olması ürünün ABD yaş derecesini otomatik
belirlemez. ABD satış/uyum doğrulanmadı ve etkinleştirilmez.

### Henüz yapılmayan ödeme işleri

1. **Hizmet hesabı JSON anahtarı oluşturulmadı veya indirilmedi.** Önce
   mevcut hesabın e-postasını, proje/Play uygulama kapsamını ve güvenli
   aktarım yolunu doğrula. Anahtarı sohbet/Git/APK/kaynak ZIP'e koyma;
   içerik/token/makbuz/private key basma. Cloud rol genişletme veya güvenlik
   politikasını atlatma yok. Anahtar oluşturma/kapsam genişletme adımında
   kullanıcı bilgilendirilip açık onayı alınır; tek gerekli anahtar kullanılır.
2. **Canlı Google Play sağlayıcısı henüz kurulmadı.** Kaynak doğrulayıcı
   `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME=com.gridshardgame.app` ve
   `GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE` bekliyor. JSON sunucunun
   repo/image dışı özel sır alanında, uygun kullanıcı/izinlerle read-only
   mount edilmelidir. Ham `.env`/sır dosyası basılmadan merge/preflight
   denetlenir. Sırf fake purchase test modu 0 olması Google sağlayıcısını
   açmaz. R13'e ödeme mount/env değişiklikleri sessizce eklenmez; izole
   doğrulama ve canlı uygulamadan önce ayrı onay gerekir.
3. **Kimlik doğrulamalı Pub/Sub RTDN + iade mutabakatı bekliyor.** Gerekli
   topic/abonelik/kimlik/audience/paket eşleşmeleri, gerçek test bildirimi,
   voided-purchase takibi kaynak ve runbook üzerinden yeniden doğrulanır;
   dış hizmet entegrasyonu çalışmış varsayılmaz. Ayrıntı
   `docs/STORE_PURCHASES.md` ve `docs/ANDROID_PRODUCTION_SETUP.md`.
4. **Ödeme profili/mağaza hazır oluşu doğrulanmadı.** Ürün oluşturulabilmesi
   banka/vergi/merchant kurulumunun tamamlandığının kanıtı değildir;
   hassas banka/vergi verileri yalnız Google'ın ilgili ekranında kullanıcıca
   girilir, repo/sohbet içine alınmaz.
5. **Satın alma/iade uçtan uca denenmedi:** lisans test hesabıyla test ödeme
   ibaresi, fiyat/tek seçenek, pending ödeme, uygulama kapanması/ağ kesilmesi,
   hesap bağı, tek kalıcı teslimat, yeniden gönderim, tüketme/onay ve iade
   sonrası geri alma kontrolü gerekir. Test ödeme profili görülmeden
   deneme düğmesine basma; test kanalı tek başına ücretsiz ödeme değildir.
   Test için gerekli ürün etkinleştirme ve gerçek satış açma ayrı kullanıcı
   kararlarıdır. Başarılı cihaz ödemesi görülmeden hazır/çalışıyor deme.

### Evde çalışma sırası ve korunacak durum

- Not yazılmadan önce işte yerel HEAD **`dd76af8` / add admob**, çalışma
  ağacı temizdi. Bu belge değişikliklerini **kullanıcı commit/push eder**.
  Evde güncel kaynak, çalışma ağacı ve son CI doğrulanır; yerel değişiklik
  varsa korunur. Otomatik reset/restore veya kullanıcının dosyalarını silme yok.
- Evde aynı upload anahtarı/yerel DPAPI kaydı, JDK/SDK, Docker ve önceki
  özel deploy/audit dosyaları bulunur. İşte anahtara erişilemedi; yeniden
  anahtar üretme. Config ve Gradle **versionCode 4** / **2.1.0-beta.72**
  olarak bu tur okunup doğrulandı. **İmzalı v4 APK/AAB henüz üretilmedi.**
- Son iş-PC bağlantısı strict pinned host-key ile **banner exchange
  timeout** verdi. Yeni sunucu denetimi/ayar değişikliği yapılmadı.
  IP ve özel SSH anahtar yolu izlenen belgelere yazılmaz; evde kullanıcıdan
  güncel erişim alınıp mevcut güvenilir fingerprint/known_hosts eşleşmesi
  sağlanır. SSH Her yer'e açılmaz, host-key kontrolü kapatılmaz.
- **r12 reklam `live` korunur.** Kullanıcı v3 ile reklam oynattığını bildirdi;
  bu bağımsız Google SSV/ekonomik ödül/ledger kanıtı değildir. AdMob paneli
  en son sınırlı sunum gösteriyordu; tam sunum ve doluluk garanti edilmez.
  Yeni r13 geçişinde mevcut mount/PGS/demo giriş/UMP/SSV/test0 ve oyuncu
  ilerlemesi korunur. Gerçek ödeme bu panel adımlarıyla açılmadı.
- Önce **r13 yalıtılmış test + smoke/backup-restore + canlı ön kontrol**;
  ardından kullanıcıdan geçiş öncesi ayrı onay, taze doğrulanmış yedek ve
  veriyi koruyan canlı geçiş. Yeni ödeme ayarları ayrıca doğrulanıp
  onaylanır; test kapıları hazır değilse gerçek satış kapalı kalır.
- Sonra **aynı signer ile v4 APK/AAB + binary audit**. Mevcut Play v3'e
  USB'den yerel APK yükleme yok; AAB'yi kullanıcı test kanalına yükler.
  Kapalı testin ülke/hedefleme ve gerçek opt-in durumunu kontrol et;
  önceki kayıtta 10 kişi seçilmiş, iki kişi daha eklenecekti. Listeye kişi
  eklemek 12 gerçek katılımcı/aralıksız 14 gün koşulunun sağlandığı kanıtı
  değildir. Süre veya test yayını başlamış varsayılmaz.
- Site/politika paketi için 7. bölüm geçerli: yeni davranışları anlatan
  metin, r13 davranışı doğrulanmadan yayımlanmaz. Diğer araca/ev makinesine
  devam için bu bölüm ve `CODEX_CHECKPOINT.md` en üst kayıt birlikte okunur.

**Bu not turunun kapsamı:** yalnız iki Markdown devir dosyası; kod, ürünler,
Cloud/Play/AWS ayarları, canlı veri ve sırlar değişmedi. Build/deploy,
anahtar oluşturma, ödeme/ürün etkinleştirme, commit/push yapılmadı.

## 12. Codex sonucu — 7 Ekim evde anahtarsız ödeme hazırlığı

Bu bölüm, önceki kayıtların ardından yapılan **yerel** çalışmayı anlatır.
Canlı r12 veya Play v3 güncellenmedi; v4 APK/AAB üretilmedi.

- Başlangıç HEAD `f2a6723` ve o commit'in CI koşusu `37628923191` yeşildi.
  Evden salt-okunur canlı ön kontrol başarılıydı: r12 sağlıklı, reklam
  `live`/SSV1/test0; 12 profil/12 kimlik/66 savaş, pending0. Bu bir anlık
  kontroldür, yeni geçiş öncesi yeniden yapılmalıdır.
- Kaynak adayı yerelde donduruldu:
  `artifacts/server-aws-20261007-analytics-store-r13-candidate/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`,
  SHA256 `177f9a2e4ac242c0b11e019b4e9cf42b7a80ebc313d8614265b976c7080bd624`.
  ZIP/imaj karşılaştırma hazırlığı dışında remote image build/yalıtılmış
  PG17–Redis test/deploy yapılmadı. **Bu ZIP aşağıdaki WIF kodunu ve aynı
  akşam diğer aracın yeni fiyat/arayüz değişikliklerini içermez.** Sessizce
  üzerine yazma; yeni commit/CI sonrası taze aday/audit gerekir.
- Mevcut Play billing hizmet hesabı etkin; kullanıcı gerekli üç GRIDSHARD
  uygulama iznini teyit etti. Cloud Anahtarlar listesi boş. Onaylanan JSON
  anahtar denemesi `iam.disableServiceAccountKeyCreation` ile engellendi;
  anahtar/dosya üretilmedi. Politika, Play izinleri veya proje değiştirilmedi.
- Kullanıcı anahtarsız desteğin **yerel hazırlanıp test edilmesini**
  onayladı. `server/app/google_play_wif.py`, opt-in `aws_wif` doğrulayıcı,
  `google-auth>=2.60,<3.0`, çevrimdışı preflight ve **uygulanmamış**
  API-only `docker-compose.google-play-wif.yml` hazır. IMDSv2 / exact
  audience+mevcut hesap / kısa ömürlü token yolu dış kaynak keşfetmez;
  statik key/ADC/fallback/istenmeyen URL ve karışık config reddedilir.
  Varsayılan RSA yolu korunur, token/credential gövdeleri loglanmaz.
- Son yerel testler: **sunucu 1.290 geçti, 39 atlandı; araçlar 17/17**.
  Gerçek Google SDK 2.60.0 ve sahte HTTP yanıtları kullanıldı. Atlananlar
  yalıtılmış PostgreSQL/gerçek Redis gerektirir. `pip check`, release guard
  ve diff whitespace kontrolü geçti. Bunlar gerçek WIF bağlantısı, imaj
  çalışması, ödeme/iade veya RTDN kanıtı değildir. İngilizce rehber:
  `docs/GOOGLE_PLAY_AWS_WIF.md`.
- Son IAM/IMDS salt-okunur SSH denemesi **connect timeout** oldu; uzak
  script çalışmadı, IAM rolü/instance profile/metadata seçenekleri henüz
  doğrulanamadı. Erişim kuralı genişletilmedi, host-key kontrolü korunur.
  Sonraki kullanıcı EC2 Güvenlik ekranı **IAM rolü "—"** gösterdi; rol
  bağlı değil. Hedef AWS hesabı/instance ekranla belirlenip özel operator
  kaydına alındı; metadata/instance-profile API incelemesi hâlâ yapılmadı.
  Teyit edilen adrese yeni SSH denemesi de connect timeout verdi. Önerilen
  `gridshard-play-billing-wif` EC2 rolü/profile (ek AWS servis yetkisi
  olmadan) oluşturma ve yalnız bu instance'a bağlama kullanıcı tarafından
  **onaylandı**. Kullanıcı
  yerleşik tarayıcıya kendisi giriş yaptı. Bağımsız Console kontrolünde
  hesap `583365237571`, Frankfurt instance'ı `i-0c00d7409aa5dcff1`,
  IAM rolü "—" ve **IMDSv2 Required** doğrulandı. IAM listesindeki üç
  hizmet-bağlantılı rolde hedef adla çakışma yoktu. Kullanıcı son rol
  inceleme ekranında **"bağla"** diyerek işlem-anı onayı verdi. Rol ve aynı
  isimli instance profile **oluşturuldu ve yalnız bu instance'a bağlandı**:
  `gridshard-play-billing-wif`, yalnız `ec2.amazonaws.com` /
  `sts:AssumeRole`, **İzinler politikaları (0)**, maksimum oturum 1 saat.
  Gerçek rol ARN'si `arn:aws:iam::583365237571:role/gridshard-play-billing-wif`,
  profile ARN'si
  `arn:aws:iam::583365237571:instance-profile/gridshard-play-billing-wif`.
  EC2 başarı bildirimi ve instance ayrıntılarındaki IAM rolü doğrulandı;
  IMDSv2 Required korundu. Başka rol veya AWS yetki politikası, metadata,
  güvenlik grubu, Google IAM, deploy veya oyuncu verisi değişmedi.
  Sonuç ekranı açık, görsel kanıtlar özel artifacts kaydında. Host metadata
  credential gövdesi/gerçek Google token alınmadı; WIF bağlantısı henüz
  doğrulanmış değil. Ayrıntılar `CODEX_CHECKPOINT.md` en üstte.
  Sonraki Google pool-provider / scoped impersonation değişiklikleri için
  **ayrı onay gerekir**. IMDS hop-limit gibi ağ/güvenlik değişikliği de ayrıca
  değerlendirilir; IMDSv1/static keys/privileged container çözümü kullanılmaz.
- Google Cloud sonraki aşaması **kullanıcının Edge'inde elle** yürütülecek.
  Araç Edge'e bağlı değil (yalnız IAB/MCP Apps); kullanıcı IAB alternatifini
  reddedip elle Edge seçti. AWS aşaması sonunda Cloud oturumu/proje/pool/API
  kontrolü veya Google kaynak/IAM yazısı yapılmamıştı. Workload Identity Pools
  ekranıyla başla, durum ve izin kapsamı doğrulanmadan nihai kayıt yapma.
  IMDSv2 credential config için Google rehberinin `gcloud --enable-imdsv2`
  yolu gereklidir; yerel CLI bulunmadı. Özel anahtar veya IMDSv1 kullanılmaz.
- Diğer aracın 199,99 TL premium fiyatları/arayüz değişiklikleri ve
  `CLAUDE_CHECKPOINT.md` korundu. WIF yerel değişiklikleri henüz commit/CI
  kapsamında değildir; kullanıcı commit/push eder. AWS IAM'da yalnız yukarıda
  onaylanan EC2 identity oluşturma/bağlama yapıldı; o aşamada Google Cloud IAM, canlı
  mount/env, RTDN, ürün etkinleştirme, oyuncu verisi değişmedi. r13 geçiş
  onayı, taze doğrulanmış yedek, aynı signer v4 ve gerçek cihaz test kapıları
  geçerlidir; yerel test sonucu bunların yerine geçmez.

### Son Google sonucu — havuz ve dar impersonation bağlantısı kaydedildi

Kullanıcı Edge'deki dar kapsamlı havuz/sağlayıcı kaydını işlem öncesinde
**"onaylıyorum"** diyerek onayladı; Save'e kendisi bastı. 7 Ekim `233658`
ekranı `gridshard-play-billing` havuzunu **Enabled**, **GRIDSHARD EC2** AWS
sağlayıcısını etkin ve principal içindeki proje numarasını `376018782491`
gösteriyor. Sonraki salt-okunur Cloud Shell listesi gerçek sağlayıcıyı
`projects/376018782491/locations/global/workloadIdentityPools/gridshard-play-billing/providers/aws-ec2`,
**ACTIVE**, AWS accountId `583365237571` olarak ayrıca doğruladı.
Kaydetmeden önce görülen ve son CLI çıktısında aynen doğrulanan CEL koşulu:

```text
assertion.account == '583365237571' && assertion.arn.startsWith('arn:aws:sts::583365237571:assumed-role/gridshard-play-billing-wif/')
```

`google.subject = assertion.arn` görüldü; uzun varsayılan `attribute.aws_role`
ifadesi ekranda kısmen görünüyordu; son CLI çıktısında normalize assumed-role
ARN eşleştirmesinin tamamı ve kalıcı koşul doğrulandı. `234243` ekranı mevcut
`gridshard-play-billing@project-37a84396-b930-4141-b4d.iam.gserviceaccount.com`
adresini doğruladı. Grant access using service account impersonation formu
(`234153`) **subject** filtresinde yalnız şu beklenen kimliği gösterdi:

```text
arn:aws:sts::583365237571:assumed-role/gridshard-play-billing-wif/i-0c00d7409aa5dcff1
```

Kimlik bilinen rol/instance ve EC2 biçiminden türetildi; gerçek
GetCallerIdentity henüz alınmadı. Kullanıcı dar hesap bağlantısını **ayrıca
"onaylıyorum"** diyerek onayladı ve Save'e kendisi bastı. `234355` ekranında
aynı hizmet hesabıyla Configure your application ve **Policy updated**
bildirimi görüldü. Tüm havuz `/*`, Owner/Editor veya geniş Token Creator
seçilmedi. `234550` listesinde billing hesabı, açılan `234643` satırında
kalıcı **google.subject** filtresinin tam EC2 ARN'siyle eşleşmesi doğrulandı.
Son Cloud Shell **get-iam-policy** çıktısı yalnız bir binding doğruladı:
`roles/iam.workloadIdentityUser`, yalnız bu exact `principal://` subject
üyesi. Bu SA-resource policy kontrolüdür; inherited proje IAM'ının tamamını
denetlemez ve gerçek GetCallerIdentity/token kanıtı değildir.
**services list --enabled** beş gerekli API'yi zaten açık gösterdi:
Android Publisher, Cloud Resource Manager, IAM, IAM Credentials ve STS.
Bu tur API etkinleştirme veya ücretsiz deneme/billing değişikliği yapılmadı.
**Config üretimi:** aynı Edge Cloud Shell'de özel/yeni operator klasöründe
`create-cred-config --aws --enable-imdsv2` (global STS, doğrulanmış audience
ve SA, varsayılan 1 saat) → config indirme → yerelde çevrimdışı pin/preflight.
Kullanıcının çıktısı Cloud Shell'de
`./gridshard-wif-20261007-MMZ5NV/google_play_wif_config.json` üretildiğini
bildirdi; SHA256
`08acb21901427a430ed810ff06b8b107fd41b42a10e0bdde442934eb2990a030`.
8 Ekim kullanıcı indirdi; yerel 966 byte dosyanın hash'i birebir eşleşti.
Mevcut özel `secrets/google-play-billing-20261007/google_play_wif_config.json`
konumuna üzerine yazmadan kopyalandı. Yalnız kullanıcı+SYSTEM Allow ACL,
Git ignore ve tracked config0 doğrulandı; özgün indirme silinmedi.
Her iki kopyada offline preflight **exit0**: doğru audience/SA, IMDSv2,
private_key=false, lifetime3600, network_calls0 ve
**external_connection_verified=false**. Config/secrets gerçek release
input listesinden dışlandı; ZIP/build üretilmedi. Ek testler **11/11**;
ilk sandbox TEMP/cache izin hatasından sonra yeni workspace temp ve cache
kapalı tekrar geçti, test/kod değişmedi. Kaynak/version guard da geçti.
Kanıt `artifacts/google-play-wif-local-20261007/CONFIG_LOCAL_VERIFICATION_20261008.md`.
Raw config/token basma, Cloud Shell'de AWS config ile oturum/test yapma.
**Önceki bağlantı denemesi:** read-only SSH/IMDS denemesi sandbox'ta
bağlantı öncesi Permission denied, ağ izinli denemede 8 saniye connect timeout
verdi. Uzak script çalışmadı; credential gövdesi/Google token yok.
**8 Ekim SSH düzeldi ve host metadata doğrulandı:** Kullanıcının SG düzenleme
ekranındaki SSH `/32` kaynakları güncel doğrudan dış IPv4 ile eşleşmedi.
Yalnız mevcut IP için SSH/TCP22 `/32` ekleme kapsamı açıklandı, kullanıcı
"kat-ydettim" dedi. Ajan AWS kuralı yazmadı; nihai SG kaydı ayrıca API ile
okunmadı. Kaynak eşleşmesi ve pinned host-key doğrulamasıyla SSH **exit0**:
instance `i-0c00d7409aa5dcff1`, rol `gridshard-play-billing-wif`,
profile `arn:aws:iam::583365237571:instance-profile/gridshard-play-billing-wif`,
IMDSv2 mevcut/zorunlu, iam-info/rol-listesi HTTP200.
**credential_body_requests0 / google_requests0**; gerçek GetCallerIdentity
ve WIF/Play token testi yapılmadı. Host sonucu bridged Docker IMDS erişimini
kanıtlamaz. Kanıt:
`artifacts/google-play-wif-local-20261007/EC2_HOST_IDENTITY_20261008.md`.
Config transferi, yalıtılmış token/Play salt-okunur erişim testi ve canlı
mount/deploy için ayrı onay gerekir. SSH Her yer'e açılmaz. JSON özel anahtarı, Play izin/politika
değişikliği, canlı mount/env/deploy, APK/AAB, ürün etkinleştirme, satın alma
ve oyuncu verisi işlemi yapılmadı. Edge'de elle devam edilir.
