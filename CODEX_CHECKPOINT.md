# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 10 Ekim 2026

## En son durum — Google OAuth marka yayını tamamlandı

10 Ekim kullanıcı mevcut doğrulanmış GRIDSHARD adı/logo/bağlantıların Google
izin ekranında **Publish branding** ile yayımlanmasını ayrıca açıkça onayladı.
Edge'de mevcut `project-37a84396-b930-4141-b4d` Branding ekranında düğme
kullanıldı; işlem sonrası panel **Your branding has been verified and is
being shown to users** sonucunu verdi. Yayın başarıyla tamamlandı.

- Başarı gözlemi10 Ekim2026 **00:35:54 Türkiye**
  (`2026-10-09 21:35:54 UTC`). Artık marka doğrulaması,24 saat bekleme veya
  Publish branding onayı açık kapı değildir. Aşağıdaki bu işlemleri bekleyen
  kayıtlar tarihçedir; yeniden başvuru/yayın veya Testing'e dönüş yapma.
- Mevcut ad/logo/home/privacy/Terms/yetkili alan/iletişim korunarak yayımlandı.
  Kapsam, istemci/sır, Search Console owner/TXT, DNS/IAM değişmedi.
  Önceki OAuth **External / In production** ve üç non-sensitive kapsam
  korunur. Bu işlem Play Store üretim dağıtımı veya ödeme açılması değildir.
- Kanıt `test-results/oauth-publishing/branding-published-20261010.jpg`
  (ignored); Google sonuç sekmesi kullanıcı çıktısı olarak bırakıldı.
  Checkpoint/devir/readiness güncellendi. Oyun/server/Android/config HEAD
  diff'i boş; r13/Playkapalıv4/APK-AAB/ödeme/ürün/PGS/Cloud Billing değişmedi.
  Test/kurulum/deploy/commit/push yok. Konsol başarısı gerçek cihaz giriş veya
  profil geri getirme testi değildir; sonraki uygun kontrol mevcut uygulamayı
  kaldırmadan/verilerini silmeden cihazda Google/PGS giriş ve profil testidir.

## Önceki aşama — marka doğrulandı, Publish branding onayı bekliyordu

10 Ekim kullanıcı24 saat dolmadan yeniden denemeyi risk açıklamasından
sonra açıkça istedi: **dene**. Mevcut Google Branding / View issues formunda
**I have fixed the issues → Proceed** uygulandı; yeni kontrol başladı ve
tamamlandı. Panel **Your branding has been verified, but is not yet being
shown to users** sonucunu verdi. Sahiplik uyarısı bu denemede kontrolü
engellemedi; aşağıdaki24 saat bekleme kayıtları önceki aşamanın tarihçesidir.

- Başarı gözlemi10 Ekim2026 **00:33:52 Türkiye**
  (`2026-10-09 21:33:52 UTC`). Marka doğrulanmış, henüz yayımlanmamış.
  **Publish branding** etkin; panel doğrulanmış sonucu **7 gün içinde**
  yayımlamayı istiyor. Düğme tıklanmadı; yalnız yeniden deneme talebi
  yayına genişletilmedi. Sonraki adım mevcut doğrulanmış ad/logo/bağlantıların
  OAuth kullanıcılarına yayımlanması için ayrı açık onaydır. Başarılı
  doğrulamayı tekrar gönderme, eski View issues uyarısını güncel sonuç sanma.
- Kanıt `test-results/oauth-publishing/branding-verified-awaits-publish-20261010.jpg`
  (ignored). Doğrulama formu dışındaki marka alanları/kapsamlar/DNS/IAM
  değiştirilmedi; yanlış sorun beyanı/additional review yapılmadı.
  OAuth In production, Search Console owner/TXT, üç non-sensitive kapsam,
  oyun/r13/Playkapalıv4/APK-AAB/ödeme/ürün/PGS/Billing korunur.
  Checkpoint/devir/readiness güncellendi; test/kurulum/deploy/commit/push yok.

## Önceki aşama — alan sahipliği doğrulandı, marka kontrolü için24 saat bekleniyordu

10 Ekim kullanıcı Search Console alan mülkünü, yalnız tek yeni Google TXT
kaydını ve mevcut `ozturkalihan2010@gmail.com` hesabının doğrulanmış owner
yapılmasını action-time onayladı. Edge'de `gridshardgame.com` Domain property
oluşturuldu; Cloudflare otomatik bağlama/Domain Connect akışı kullanılmadı.
Manuel **Herhangi bir DNS sağlayıcı / TXT** yolu tamamlandı.

- Cloudflare DNS'e yalnız root `@` için Google'ın verdiği TXT eklendi;
  **DNS only / Auto**. Başlangıçtaki iki kayıt (`play` A / proxied ve root
  Pages CNAME / proxied) içerik, proxy ve TTL dahil birebir korundu.
  Reload sonrası toplam3 kayıt ve yalnız1 yeni satır DOM karşılaştırmasıyla
  doğrulandı. Başka doğrulama token'ı veya owner silinmedi/ezilmedi.
- Yetkili `aryanna.ns.cloudflare.com` üzerinde dar read-only TXT sorgusu
  Google challenge değerini aynen döndürdü. Search Console **Doğrula** sonrası
  **Sahiplik doğrulandı / Alan adı sağlayıcı** sonucunu verdi. Aynı Google
  hesabı panelde görünür. Doğrulama TXT kaydını kaldırma.
- Başarı gözlem zamanı10 Ekim2026 **00:28:06 Türkiye**
  (`2026-10-09 21:28:06 UTC`). Google Branding'in istediği24 saatlik bekleme
  nedeniyle yeniden deneme **11 Ekim2026 00:30 Türkiye'den önce yapılmaz**.
  Bu tur marka kontrolü yeniden denenmedi; I have fixed the issues veya
  issues are incorrect seçilmedi. Marka henüz onaylı değildir. Yeni
  otomasyon oluşturulmadı; bir sonraki tur bekleme koşulunu yeniden kontrol et.
- Kanıtlar `test-results/oauth-publishing/search-console-ownership-verified-20261010.jpg`,
  `dns-ownership-txt-saved-20261010.jpg` ve `dns-before-ownership-20261010.jpg`.
  Ignored ekran kanıtları Git ile taşınmaz. Checkpoint/devir/readiness güncellendi.
  Oyun/server/Android/config HEAD diff'i boş; test/kurulum/deploy/commit/push yok.
  OAuth In production/üç non-sensitive kapsam, r13/Playkapalıv4/APK-AAB,
  ödeme/ürün/PGS/IAM/Cloud Billing korunur.

## Önceki aşama — ilk marka kontrolü alan sahipliği nedeniyle geçmedi

10 Ekim kullanıcı mevcut ad/logo/site bağlantıları/kayıtlı iletişim bilgileriyle
marka doğrulama başvuru akışını ayrıca onayladı. Verify branding kullanıldı;
Google'ın otomatik kontrolü tamamlandı ve **View issues** döndü. Tek bildirilen
sorun: `https://gridshardgame.com/` ana sayfası kullanıcıya kayıtlı görünmüyor.
Google **önce sahipliği doğrula, ardından24 saat bekleyip yeniden dene** diyor.
Bu deneme marka onayı veya insan incelemesine kabul kanıtı değildir.

- Aynı Google hesabında `ozturkalihan2010@gmail.com` Search Console salt-okunur
  açıldı; hoş geldiniz / Web sitesi ekle ekranı var, mevcut mülk görünmüyor.
  Mülk oluşturulmadı veya sahibi doğrulanmadı. Salt-okunur NS sorgusu
  `aryanna.ns.cloudflare.com` / `luke.ns.cloudflare.com` ile Cloudflare DNS'i
  doğruladı; ilk sandbox sorgusu erişim engeli verdi, dar read-only sorgu
  sandbox dışında başarılı oldu. DNS kaydı değiştirilmedi.
- Sonraki iş için ayrı action-time onayı gerekir: yalnız `gridshardgame.com`
  Search Console alan mülkü, Google'ın verdiği tek yeni TXT kaydının mevcut
  Cloudflare DNS'e eklenmesi ve yukarıdaki hesabın doğrulanmış site sahibi
  yapılması. Mevcut kayıt/başka owner doğrulama token'ı silinmez veya ezilmez;
  geniş Cloudflare bağlama/Domain Connect yetkisi verilmez. Token henüz yok.
  TXT/hesap eşleşmesi ve başarılı Google sahiplik sonucu kanıtlanmadan
  **I have fixed the issues** seçme; **issues are incorrect** beyanı yapma.
  Sahiplik başarısından sonra panelin24 saat bekleme yönlendirmesine uy.
- Kanıt `test-results/oauth-publishing/branding-domain-ownership-issue-20261010.jpg`.
  OAuth In production, üç non-sensitive kapsam ve tüm marka alanları korunur.
  Oyun/server/Android/APK-AAB/r13/v4/ödeme/ürün/PGS/IAM/Billing değişmedi.
  Test/kurulum/deploy/commit/push yok. Açık marka sorunu çözülmeden onaylandı deme.

## Önceki tamamlanan aşama — OAuth In production, marka doğrulaması bekliyor

10 Ekim kullanıcı yalnız mevcut OAuth projesini Testing → In production
geçirmeyi ayrıca onayladı. Edge'de mevcut proje
`project-37a84396-b930-4141-b4d` Audience ekranında Publish app →
Push to production? / Confirm uygulandı. Yeniden yükleme sonrası
**External / In production** ve Back to testing düğmesi doğrulandı.
Bu, Play uygulaması üretim dağıtımı veya oyun/ödeme yayını değildir.

- Verification Center: **Data access verification is not required**, çünkü
  sensitive/restricted kapsam yok. Önceki üç non-sensitive kapsam korunur.
  **Branding is not being shown to users**; marka doğrulaması gerekiyor.
  Bu sonuç, önceki Testing nedeniyle doğrulama gerekmez kaydının yerini alır.
- Branding salt-okunur incelendi: GRIDSHARD adı/mevcut logo,
  `https://gridshardgame.com/`, `/privacy/`, `/terms/`, tek yetkili alan
  `gridshardgame.com`, kayıtlı destek/geliştirici iletişimi korunur.
  Save pasif; Verify branding etkin. **Verify branding tıklanmadı, başvuru
  gönderilmedi; Search Console sahiplik kanıtı henüz kontrol edilmedi.**
  Sonraki adım ayrıca onaylanan marka başvuru akışıdır. Başka kapsam,
  anahtar/erişim veya DNS değişikliği gerekiyorsa ayrı yetki gerekir.
- Kanıtlar `test-results/oauth-publishing/audience-production-20261010.jpg`
  ve `branding-needs-verification-20261010.jpg`. Önceki pre-publish ekranı
  tarihçedir; OAuth üretim durumunu geri alma veya tekrar Publish app yapma.
- Oyun/server/Android/config kaynakları HEAD'e göre hâlâ temiz. Canlır13,
  Play kapalıtestv4, APK/AAB, ödeme/ürünler, PGS kimlikleri/Kaydedilmiş Oyunlar,
  IAM/sırlar ve Cloud Billing değişmedi. Yeni test/kurulum/deploy veya
  commit/push yapılmadı. Üretim paneli gerçek cihaz giriş testi değildir.

## Önceki tamamlanan aşama — OAuth Data Access üç kapsamla kaydedildi

10 Ekim ev bilgisayarında kullanıcı yalnız `openid`,
`https://www.googleapis.com/auth/games_lite` ve
`https://www.googleapis.com/auth/drive.appdata` kapsamlarını mevcut
`project-37a84396-b930-4141-b4d` projesine kaydetmeyi ayrıca onayladı.
Kullanıcı bu üç satırı Edge'de elle seçti; agent tüm38 satırın seçimini
kontrol etti, başka kapsam olmadığını gördü ve Update → Save yaptı.
Yeniden yükleme sonrası üç kapsam korundu ve Save pasifti. Google üçünü de
**non-sensitive** listesinde gösterdi; sensitive/restricted listeleri boş.

- Normal Google OAuth kodu yalnız `openid` ister. Android PGS mevcut
  `requestServerSideAccess(client, false)` çağrısının varsayılan server-access
  kapsamları `games_lite` ve `drive.appdata` ile eşleşir. Drive kapsamı yalnız
  uygulamaya özgü veridir; tam Drive veya Kaydedilmiş Oyunlar etkinleştirmesi
  değildir. E-posta/profil, `games`, Gmail, tam Drive veya `androidpublisher`
  eklenmedi. Billing hizmet hesabının WIF Publisher kapsamı ayrı ve korundu.
- Verification Center yalnız **Testing nedeniyle doğrulama gerekmediğini**
  gösteriyor; marka/alan sahipliğinin doğrulandığı anlamına gelmez.
  Audience **External / Testing**,11 test kullanıcısı olarak korundu;
  **Publish app artık etkin**, ancak tıklanmadı. Sonraki adım ayrı action-time
  onayla OAuth In production geçişi, ardından gerçek marka/alan doğrulama
  gereksiniminin okunmasıdır. Otomatik verification submission yapma.
- PGS kimlikleri, Kaydedilmiş Oyunlar, OAuth istemcileri/sırlar/IAM,
  sunucu/oyun kodu, r13/v4, APK/AAB, ödeme/ürünler ve Billing değişmedi.
  `git diff --name-only HEAD -- server/app client android config` boş.
  Client PGS testleri doğru client çalışma dizininde **6/6** geçti; ilk root
  dizini denemesi fixture-path ENOENT idi, kod hatası değil. Yerel `.venv`
  içinde pytest yok; backend focused testleri çalıştırılamadı, kurulum veya
  backend test başarı iddiası yapılmadı. Bu tur kaynak kodu değiştirilmedi.
- Yerel kanıtlar `test-results/oauth-publishing/data-access-saved-20261010.jpg`
  ve `audience-before-publish-20261010.jpg`; ignored dosyalar Git ile taşınmaz.
  Commit/push yapılmadı. Terms yayını aşağıdaki önceki kayıtta tamamlanmıştır.

## Önceki tamamlanan aşama — TR/EN Terms yayımlandı, Google Branding URL kaydı doğrulandı

9 Ekim 23:57TR canlı HTTP kontrolü ve sonraki Google kayıt kontrolü:
kullanıcının ayrıca onayladığı21 dosyalık paket mevcut `gridshard-public`
Cloudflare Production ortamında yayımlandı. Edge yerel dosya yükleme izni
olmadığından kullanıcı ZIP'i elle seçti; agent Save and deploy yaptı. Yeni
proje/DNS/hesap ayarı veya uzantı dosya erişim izni açılmadı.

- Production deployment `528af2d9-8685-4649-826f-1fe24ddd0473` başarılı.
  ZIP261327bytes, SHA256
  `60bd39d1d288e876b457c99c76dac98c9a4152a415b59356b45d248a2bb7b60b`;
 21 dosyanın isim/boyut/özeti manifest ile birebir doğrulandı.
- `https://gridshardgame.com/terms/` ve `/en/terms/` canlı, iki dilde14 madde.
 10 HTML+app-ads.txt, **11/11 HTTPS200** ve tam manifest byte/SHA eşleşmesi;
  no-transform/CSP/plain mailto korunur, email obfuscation/izleme scripti yok.
- Google Branding'de **yalnız Terms URL** `https://gridshardgame.com/terms/`
  eklendi ve kaydedildi. Yeniden yükleme sonrası aynı değer ve pasif Save
  doğrulandı. Mevcut logo/home/privacy/domain/contact alanları zaten kayıtlıydı,
  korundu. Branding sayfası hâlâ **Testing**; Publish app kullanılmadı.
  Data Access ve alan sahipliği/marka doğrulaması ayrı açık kapılardır.
- `public-site/terms.js`, nav/sitemap/redirects ve15 yerel test eklendi/güncellendi.
  Türkçe ilk paragraftaki kaymış ifade anlam değiştirilmeden düzeltildi. Gizlilikte
  yalnız eski sağlayıcı-hazırlığı cümlesi gerçek özellik bulunabilirliğiyle
  uzlaştırıldı; veri akışı/saklama/varlık/app-ads/korumalar değişmedi.
- **15/15** public-site testi,18 Edge DOM/layout kontrolü (10desktop + TR/EN
  Terms/Privacy393requested/394measured ve320px) geçti. Başlık/giriş/support ve
  mobil nav görsel QA yapıldı; taşma/form/script yok. Headless Chromium bu ev
  bilgisayarında yok; yüklenmedi, Edge fallback kullanıldı. Loopback ağ testleri
  sandbox dışında geçti, geçici viewport sıfırlandı ve önizleme sunucusu durdu.
  `tools/verify-public-site-live.js` yalnız anonim custom-domain GET doğrulamasıdır.
- Kamu metni satışın kapalı olduğunu ve site yayınının ödeme açma, uygulama içi
  şartlar kabulü veya tam teknik/hukuki hazırlık olmadığını belirtir. Onaylı
  iade politikasının yayıncı-hatası istisnası ve ayrıntılı bildirim uygulaması
  **ücretli satıştan önce hâlâ tamamlanmalı**. Satış ön bilgisi/yaş/ülke ve gerekli
  şartlar onayı ayrı kalır. Mevcut hesaplara veya bakiyelere dokunulmadı.
- Canlır13, Play kapalı testv4, ödeme/ürünler, APK/AAB, OAuth Audience/PGS
  kimlikleri/scopes/IAM ve Cloud Billing korunur. Commit/push yapılmadı.
  Ignored ZIP/receipt/screenshots `artifacts/public-site-terms-20261009/` ve
  `test-results/public-site/` altında; Git ile taşınmış sayılmaz.

Aşağıdaki yerel taslak/Terms404/Branding boş kayıtları önceki aşamanın tarihçesidir.

## Önceki aşama — evde PGS doğrulandı, TR/EN Terms yerel taslağı hazır

Bu bölüm aşağıdaki önceki iş bilgisayarı devir kaydını günceller. Ev checkout'u
HEAD `748a8d523b5a4822059d8abd581588b42e75c008`; önceki devir dosyaları bu
kullanıcı commit'inde mevcut. Tur başlangıcında çalışma ağacı temizdi.

- Son kullanıcı ekranlarında PGS özellikleri ve altı mevcut credential
  **Yayınlandı**, Yayınlama **Yayınlanacak değişiklik yok**. Beş Android kaydı
  (dört app/bir eski remotedebug) ve bir sunucu kaydı korunur. PGS'yi tekrar
  yayınlama veya kimlikleri yeniden oluşturma. Bu OAuth/Play üretim yayını değil.
- OAuth Audience **External / Testing**, 11 test kullanıcısı; Branding eksik
  olduğu için Publish app pasif. Son Branding ekranında mevcut ad/iletişim var,
  logo/URL/yetkili alanlar boş. Sonraki kayıt kanıtı yok; Data Access gerçek
  kapsamları ve alan sahipliği henüz doğrulanmadı. PGS isim/dil/grafik işi tekrarlanmaz.
- TLS doğrulanmış GET: `https://gridshardgame.com/` ve `/privacy/` HTTP200,
  `/terms/` HTTP404. Sahte/canlı olmayan Terms bağlantısı panelde kullanılmaz.
- Kullanıcı TR/EN Terms metnini uygun buldu ve ortak iade/eksi bakiye politikasını
  "anlaşalım" yanıtıyla onayladı. `docs/TERMS_OF_SERVICE_DRAFT_20261009.md`
  bölüm9 iki dilde güncellendi; karar `docs/STORE_PURCHASES.md` içine işlendi.
  Yalnız iade edilen para birimi eksiye düşebilir; oyunla kapatılır, gerçek para
  borcu/yeniden ödeme zorunluluğu ve tek başına hesap/ücretsiz maç engeli yok.
  Premium ilgili sezonda kapanır, kazanılmış ödül/geliştirme/maç sonucu korunur.
  Doğrulanmış yayıncı teslimat/sunucu hatasında açık yüklenmez; her iade hile
  sayılmaz. İşlem/kesinti/kalan açık ve hatalı kesinti incelemesi açıklanır.
  **Kodun tam politika uygulaması henüz yok:** yayıncı-hatası istisnası ve
  ayrıntılı TR/EN bakiye bildirimi bekliyor; erişim/harcama/replay/reversal
  regresyonları ayrıca gerekir. Sebep kodu tek başına hata/hile kanıtı sayılmaz.
  Satış ön bilgisi/hukuki kontrol, yürürlük tarihi ve yayın kapıları ayrı. Metin site
  üreticisine/yayın paketine eklenmedi. Mevcut gizlilikte reklam hazırlığı
  cümlesinin gerçek r13 reklam durumuyla uzlaştırılması yayın öncesi açık kapı.
- Sıradaki adım eksik politika uygulamaları ve yayına hazırlık kapılarıdır;
  bu karar turunda yalnız belgeler güncellendi. Ayrı onaylı entegrasyon/yayın ve canlı
  TR/EN HTTPS200/içerik kontrolü olmadan Terms tamamlanmış veya URL hazır sayılmaz.
  Yeni çalışma uygulama/sunucu kodunu değiştirmez, canlı ödeme/ürün açmaz,
  SSH/deploy, APK/AAB, Google ayarı/anahtar/kapsam/IAM, Cloud Billing veya
  commit/push yapmaz. Canlı r13 ve kapalı test v4 korunur.
- Doğrulama: TR/EN 14 eşleşen bölüm, taslağın public output'tan dışlanması
  ve kaynakların HEAD'e göre korunması kontrol edildi. Public-site **12/12**,
  `git diff --check` temiz. Testler hukuki onay veya canlı Terms kanıtı değildir.

Devam ayrıntıları: `docs/PLAY_PUBLISHING_READINESS_20261009.md` ve yeni Terms
taslağı. Aşağıdaki önceki "yayın henüz doğrulanmadı" kayıtları tarihçedir.

## Önceki devir — iş bilgisayarında bitti, ev bilgisayarında devam

Kullanıcı bu bilgisayardaki çalışmayı bitirdi; bundan sonrası ev bilgisayarında
devam edecek. Devir kaydı dışında yeni panel/SSH/deploy/AAB/ödeme işlemi yapma.
Son yerel HEAD `f3a60f2e01efbc426f4a067782b8ce36a5afe403` (kullanıcının fix
commit'i); önceki `ea25c1c` uygulama kaynakları ile bu HEAD arasında server/app,
client, android, config ve public-site farkı yok, bu kaynaklar çalışma ağacında
da temiz. Agent commit/push/pull/cihaz aktarımı yapmadı. Son panel kanıtları ve
bu devir güncellemesi aşağıdaki üç dosyada yerel değişiklik olarak durur;
ev checkout'una otomatik aktarılmış sayılmaz:

- `CODEX_CHECKPOINT.md`
- `CODEX_HANDOFF_R13_V4.md`
- `docs/PLAY_PUBLISHING_READINESS_20261009.md`

Evde ilk adım: aynı sohbet ve güncel repo/devir notlarıyla **PGS yayınına
basıldı mı, yayımlandı mı** sonuç ekranından doğrula. Son kanıt yalnız
Yayınlamaya hazır/etkin Yayınla idi; tamamlandı diye varsayma, yayımlanmışsa
tekrar yayın/yeniden kimlik oluşturma. Sonra aynı mevcut Google projesinde
Google Auth Platform Audience, Data Access ve Branding durumlarını incele;
önceki Testing/eksik link/alan sahipliği kapıları ayrı kaldı. Varsayılan Türkçe,
EN çeviri, altı GRIDSHARD adı ve ortak grafik düzeltmesini yeniden yaptırma.
Canlı r13 ve Play kapalı test v4 korunur; ödeme/ürünler açılmaz. Gelecek
sunucu/AAB geçişi için ayrı taze onay/yedek/test kapıları geçerlidir.
Ignored artifacts/görseller/provalar Git ile otomatik taşınmaz; evde dosya
varlığını doğrula. Hiçbir sır/anahtar/credential dosyası Git'e eklenmez.
Evden SSH gerekirse kaynak-IP erişimini yeni ortamda doğrula; izinleri
genişletme veya host-key kontrolünü kapatma. Şimdi bu bilgisayarda dur.

## Önceki kullanıcı akışı — PGS/OAuth yayın hazırlığı; kod ve canlı sürüm korunur

Kullanıcı yayın altyapısını önce tamamlamak, mevcut kapalı test sürerken
post-v4 kod güncellemelerini korumak, tester geri bildirimi sonrasında ayrı
sunucu güncellemesi ve yeni AAB hazırlamak istiyor. Bu karar mevcut canlı
sunucuya ödeme katmanı uygulama veya ürünleri etkinleştirme onayı değildir.

- Yerel HEAD `f3a60f2e01efbc426f4a067782b8ce36a5afe403`; uygulama kaynaklarında
  HEAD'e göre kayıtsız değişiklik yok. Post-v4 değişiklikler commitlerde korunur.
  Canlı r13 ve Play v4 yerine yeni deploy/AAB bu panel hazırlığında yapılmadı.
- Son PGS özellik ekranlarında iki dilde GRIDSHARD, mevcut TR/EN açıklamaları
  ve Strateji kategorisi kaydedildi. Kullanıcı varsayılan dili Türkçe yapıp
  kaydettiğini bildirdi. Altı credential adını tamamladıktan sonraki son
  Yayınlama ekranı **Kimlik Bilgisi — Yayınlamaya hazır** gösteriyor; altı
  taslak kayıt/birer değişiklik, Yayınla etkin ve görünür eksik uyarısı yok.
  **PGS yayına hazır, henüz yayımlandığı doğrulanmadı.** Sıradaki kullanıcı
  adımı yalnız PGS Yayınla ve onay/sonuç kanıtı; OAuth Audience/Branding ayrı
  açık kapıdır. Client ID/paket/SHA/sırlar korunur, TEST Android silinmez.
  Kullanıcının dil geçişi denemesinde grafik alanı ortak çıktı; önceki ayrı
  dil grafiği/ters kayıt yorumu yanlıştı. Varsayılan Play mağaza girişinin
  aynı Türkçe grafiği kullanılacak. Yeni nesil kimlikler açık, Recall ve
  Kaydedilmiş oyunlar kapalı kalır. PGS'nin konsol engelleri kalktı; genel
  OAuth/marka ve Play uygulama üretim kapıları tamamlanmış sayılmaz.
- Cloud Branding'de ad GRIDSHARD; bağlantılar ve yetkili alanlar boş görüldü.
  Ana sayfa/gizlilik HTTPS200, `/terms/` HTTPS404: olmayan kullanım şartları
  bağlantısını girmeyin. Mevcut Data Access kapsamları ve alan sahipliği,
  OAuth üretim/marka yayını öncesinde ayrıca doğrulanacak.
- PGS yayını, OAuth üretim durumu ve uygulamanın Play üretim dağıtımı ayrı
  kapılardır. Henüz hiçbir yayın düğmesine basıldığı doğrulanmadı. Kart,
  deneme, Cloud Billing, yeni anahtar/kapsam/IAM izni eklenmez.
- Ayrıntılı devam planı: `docs/PLAY_PUBLISHING_READINESS_20261009.md`.
  Sonraki canlı geçişte taze onay/yedek/yalıtılmış test kapıları yeniden gerekir;
  yeni AAB sürüm kodu güncel Play kaydıyla doğrulanıp kullanılmamış daha yüksek
  bir değer seçilir. Tester katılımı ve geri bildirim koşulları ayrıca doğrulanır.

## En güncel devam noktası — kullanıcı ücretli Cloud istemiyor; AWS + API + periyodik iade

9 Ekim, sonraki kullanıcı kararı: **Cloud Billing hesabı/kart/ücretsiz deneme
açılmaz.** Mevcut Google projesi, Play API, billing servis hesabı, dar AWS WIF
ve PGS/OAuth ayarları korunur. Pub/Sub RTDN yerine mevcut tek-seferlik ürünlerin
iadeleri AWS üzerinde Voided Purchases API ile düzenli denetlenir. WIF-only
`StoreVerifiers` geçerlidir; önceki RTDN-only constructor ret sonucu RTDN'nin
her satın alma için zorunlu olduğu anlamına gelmez.

- Yeni **uygulanmamış** opt-in `docker-compose.google-play-polling.yml`: API
  için tarama1800 sn, RTDN audience/sender boş. Mevcut WIF katmanından sonra
  eklenir; sır, reklam/test kipi, ürün, kaynak imaj veya Android paketi değişmez.
- Belgeler ücretsiz API/kimlik yoluyla süreli Cloud denemesini ayırır. IAM API
  ücretsiz; API kotaları vardır. İade API'si belgelenen6000/gün/30 per30sn;
  olağan tek sayfalı30dk tarama yaklaşık48/gün, tester başına değildir.
  Gerçek proje quota değerleri ayrıca doğrulanmadı. Süresiz fiyat/limitsiz
  kullanım garantisi verilmez; Cloud hizmeti otomatik etkinleştirilmez.
- İade **anlık değildir**; Google API'ye yansıma +2dk bitiş payı/tarama/hata
  gecikmesi vardır. Son başarılı tarama izlenir, başarısız/stale tarama operatör
  işi ister.29gün lookback'ten uzun kesinti tam telafi sayılmaz. Geliştirici
  Google'da revoke seçmeden iade ederse kayıt API'de görünmez. Google'ın ek
  RTDN önerisi ve bu yöntemin abonelik yaşam döngüsüne yetmemesi belgede açık.
- Yerel WIF/verification/reconciliation/atomic refund/operator katman testleri
  **142 geçti**. İki yeni WIF-only tam constructor/checkpoint testinin RTDN
  değişkenleri hem yokken hem boşken çalışması doğrulandı. Token expiry/cache,
 401/403 invalidation ve sahte/doğrulanmamış alım ret kontrolleri korunur.
  Testler gerçek cihaz satın alması veya üretim imajı kanıtı değildir.
  Özel test-deps yalnız ignored artifacts'te: google-auth2.61.0,
  cryptography46.0.7; ilk import adı hatası düzeltildi, Windows TEMP izin
  sorunu yeni workspace geçici yolu ile giderildi.
- Git SSH banner zaman aşımı verdi; TCP22/banner ve TLS doğrulaması açık
  Windows CA deposuyla HTTPS200/ok görüldü. Aynı ED25519 pin/anahtarla Windows
  OpenSSH erişti. AWS/SSH izinleri değiştirilmedi. `sudo -n docker` gerekir;
  ubuntu Docker grubuna eklenmedi. API/bakım/PG17/Redis SHA pinleri aynı.
- Mevcut r13 imajıyla sınırlı yalıtılmış PG17/Redis/WIF-only330sn/restart/restore
  provası **geçti** (9 Ekim 11:52 UTC). Canlı ağ/DB/sır kullanılmadı;
  localhost-only API/PG, yeni test ağı, PG256MB/Redis64MB/API320MB sınırları.
  Özel WIF config önce eski SHA ile doğrulanır, yalnız yalıtılmış UID10001/0400
  kopyası salt okunur bağlanır; canlı secrets dizinine kopyalanmaz. İlk hazırlık
  host test aracında FastAPI eksikliği nedeniyle API başlamadan durdu, kendi
  PG/Redis/ağ/config kopyasını temizledi, production ID/starttime aynıydı.
  Eksik araç bağımlılığı yalnız özel test klasörüne kondu. Ardından salt-okunur
  fixture klasöründeki nested mount hedefi boş dosyayla ve probe import'u
  `server.app` ile düzeltildi; güvenlik kısıtları gevşetilmedi. Gerçek yalıtılmış
  tarama ve cold/cache/forced-expiry refresh geçti. 330sn soak sırasında kaynak
  IP değişip SSH koptu; bu deneme tam başarılı sayılmadı. Kullanıcı yeni dar
  SSH /32 kuralını kaydedince erişim döndü. Sonradan önceki geçici ağ/kapsayıcı/
  WIF kopyasının temizlendiği ve canlı dört ID/starttime'ın aynı kaldığı görüldü.
  Bağlantıdan bağımsız özel log/JSON kaydıyla beşinci deneme host umask077'nin
  sahte fixture secrets dizinini700 yapması nedeniyle durdu; kaynaklarını
  temizledi. Yalnız fake fixture klasöründe açık755 chmod eklendi, gerçek WIF
  dosyası UID10001/0400/salt-okunur kaldı. Altıncı denemede gerçek WIF cold/cache/
  forced-expiry refresh ve iade taraması ilk açılış, API restart ve boş hedef
  restore sonrası geçti. 330sn/33 başarılı lease/profil kontrolü, ordinary ve
  reviewer fixture profil/token korunması doğrulandı. PostgreSQL checkpoint
  restartta aynı kaldı; restore'da API açılmadan önce kaynakla birebir eşleşti.
  Sonradan geçici test kapsayıcı/ağ/fixture dizini/WIF kopyası yokluğu ayrıca
  doğrulandı. Kalıcı özel test logları/dependency/helper dosyaları operatör
  klasöründe korunur. Canlı dört ID/starttime aynı; dış HTTPS200/ok, Redis lease
  hazır, canlı iade kontrolü **disabled**. Yerel özel proof: ignored
  `artifacts/google-play-billing-20261009/attempt-6-result.json`, `attempt-6.log`.
  Gerçek bir saatlik token süresi beklenmedi; expiry testi
  özel probe nesnesinin cache süresini eşik altına çekip gerçek refresh yapar.
- Kullanıcının 9 Ekim ürün listesinde 10 doğru kimlik var, **0 etkin satın alma
  seçeneği/teklif**. `gridshard.flux_120` ayrıntısı: `standard`, Buy, eski sürüm
  uyumlu, Taslak; yalnız Türkiye, 29,99 TL. Liste diğer dokuz fiyatı doğrulamaz.
  Kapalı testin tüm ülkelere açılması ürün satış bölgelerini açmaz.
- Lisans testi ekranında yalnız 1 kişilik `geliştirici` listesi seçili;
  11 kişilik `GRIDSHARD Test` seçili değil. Kullanıcı telefonunda Play'den
  indiren hesabın seçili geliştirici hesabıyla aynı olduğunu teyit etti.
  Gerçek ödeme penceresinde test kartı/banner henüz görülmedi. Diğer kapalı
  tester'ların satın almaları lisans testi seçilmeden ücretsiz sayılmaz.
- **Canlı ödeme kapalı.** Live env/mount/restart/deploy, Cloud Billing/RTDN
  bağlantısı, IAM değişikliği, ürün etkinleştirme veya gerçek consume/refund yok.
  Gerçek lisans-test cihazı ve pending/interrupt/replay/tekil teslim/tüketim/iade
  kanıtı kalır. Yalıtılmış prova geçti; taze canlı geçiş onayı hâlâ alınmadı.
  Kullanıcının yeni savaş kodu bu config-only ödeme işine eklenmez; commit/push
  kullanıcıda, CLAUDE_CHECKPOINT kullanıcı değişikliği korunur.

## Önceki 9 Ekim devam noktası — RTDN hazırlığı ve Cloud Billing kontrolü

9 Ekim iş bilgisayarı. Kullanıcı yarım kalan gerçek mağaza satın alma kurulumuna
devam etti. Güncel kaynak-IP `/32` SSH kuralı kullanıcı tarafından eklenince
ED25519 parmak izi eski bağımsız kayıtla birebir eşleşti; sıkı pinli SSH başarılı.
IP/özel anahtar yolu izlenen dosyalara yazılmadı. AWS kuralı ajan tarafından
değiştirilmedi; yeni geniş izin, özel anahtar veya metadata ayarı yok.

- Canlı image hâlâ `sha256:3064683905f36f88c8aded85c0a27d2be900ad84ac622ed6ec59405ed30fd4d1`;
  r13 ve mevcut dört Compose katmanı korunuyor. API/PG17/Redis sağlıklı;
  dış HTTPS `/health` **200 / ok**. Reklam `live`, SSV1; sahte ödeme/reklam0.
- Önceki özel host WIF probe'u çalıştırılmadan önce okundu. Auth modülü mevcut
  kaynakla LF-normalized SHA üzerinden aynı; config SHA eski bağımsız pinle aynı.
  Gerçek IMDSv2 → Google STS **200** → billing SA impersonation **200**;
  kısa ömür/token sınırı ve bellek cache yeniden doğrulandı. Raw sır/token/body yok.
- Play `purchases/voidedpurchases` sınırlı finans okuması artık **200** (0 kayıt);
  önceki **401 permissionDenied engeli kalktı**. Ürün katalog liste API'si hâlâ
  **403**, nedeni netleşmedi; buna dayanarak katalog/admin yetkisi genişletilmez.
  Finans okuması gerçek satın alma teslimi/tüketim/iade testi değildir.
- Canlı API kapsayıcısından IMDSv2 token/instance-id/rol-adı kontrolleri **200**;
  beklenen instance/rol eşleşti. Bu kapsayıcı kontrolünde rol credential gövdesi
  veya Google token istenmedi; hostta başarılı WIF'in kapsayıcıda tam token testi
  yerine geçtiği iddia edilmez. IMDS hop-limit değişikliği gerektiren hata görülmedi.
- Canlı API'de Google Play config/package ve RTDN audience/sender ayarları yok;
  WIF opt-in katmanı uygulanmamış, **gerçek ödeme hâlâ kapalı**. Ürünlerin güncel
  etkinlik/fiyat durumu bu tur panelden doğrulanmadı; son kanıt taslak/0 etkin.
- Kullanıcının sonraki create-topic/ayrıntı ekranları doğru mevcut project ID'yi
  `project-37a84396-b930-4141-b4d` ve oluşturulan tam konu adını doğruladı:
  `projects/project-37a84396-b930-4141-b4d/topics/gridshard-play-rtdn`.
  Varsayılan abonelik/schema/ingestion/topic-retention/export/transform kapalı,
  Google-managed encryption seçiliydi. Konu üzerinde yalnız Google Play'in
  `google-play-developer-notifications@system.gserviceaccount.com` principal'ına
  `Pub/Sub Publisher` kullanıcı tarafından kaydedildi; izin paneli bunu gösterir.
  Oluşturma anındaki abonelik yok/mesaj kaybı uyarısı aşağıdaki abonelikle
  giderildi; Play'de RTDN etkinleştirme/test yayını henüz yapılmaz.
- Kullanıcı ayrı `gridshard-play-rtdn-push` hizmet hesabını oluşturdu. Liste
  `gridshard-play-rtdn-push@project-37a84396-b930-4141-b4d.iam.gserviceaccount.com`
  için Enabled / No keys gösteriyor; mevcut billing hesabı korunur. Oluştururken
  proje rolleri/kullanıcı erişimi boş bırakılması istendi; gerçek IAM policy
  ayrıca okunmadı. Sıradaki dar izin: yalnız bu push hesabının policy'sinde
  `service-376018782491@gcp-sa-pubsub.iam.gserviceaccount.com` Pub/Sub agent'ına
  `roles/iam.serviceAccountOpenIdTokenCreator` (yalnız getOpenIdToken).
  Kullanıcı formu paylaştıktan sonra kaydetti; Google-provided role grants
  gösterimi açılınca beklenen principal/OIDC rolü bu push hesabının ekranında
  göründü (OIDC satırında inheritance boş). Cloud Pub/Sub Service Agent rolü
  projeden kalıtılmış ayrı satırdır, değiştirilmez. Yeni binding ekran kanıtıyla
  doğrulandı; raw IAM policy veya gerçek push token/teslim testi henüz okunmadı.
  Proje geneli Token Creator, billing hesabına binding veya key eklenmedi.
  Google Pub/Sub dokümanı push için getOpenIdToken'ı yeterli kabul eder;
  IAM OIDC-only rolü bu izni içerir. Kullanıcı aboneliği oluşturdu;
  başarılı oluşturma/active ve kaydedilmiş Details ekranları doğrulandı:
  `gridshard-play-rtdn-sub`, mevcut RTDN konusu, Push;
  endpoint/audience `https://play.gridshardgame.com/billing/google/rtdn`,
  authentication açık ve mevcut RTDN Push SA; payload unwrapping kapalı.
  Exponential retry 10–600 sn, ack30 sn, retention7 gün, expiration Never;
  dead lettering/exactly-once/message-ordering/acked-retention kapalı.
  Gerçek teslim testi ve Play RTDN bağlantısı henüz yok; active görünmesi
  sunucunun bildirimi aldığına kanıt değildir. Canlı RTDN config kapalı
  olduğundan erken test yayını yapılmaz.
  Yeni IAM/kaynak yazısı, ürün etkinleştirme, canlı
  ödeme geçişi ve satın alma/iade testi ayrı açık onay kapıları olarak korunur.
- Yerel kaynak incelemesi ve ağsız constructor probe'u: RTDN ile satın alma
  doğrulayıcısı aynı `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME` değişkenini kullanır.
  Yalnız paket + RTDN audience/sender açılırsa `StoreVerifiers.from_environment`
  eksik satın alma kimliği nedeniyle ValueError verir; r13 bu kısmi ayarla
  başlatılmaz. İlgili auth kaynakları frozen804da6f ile aynı. Aynı r13 imajıyla
  **RTDN yolunda** ilerlemek WIF + RTDN'nin birlikte yapılandırılmasını gerektirir; bu işlem
  satın alma doğrulamasını da açar, bildirim-only geçiş diye sunulmaz.
  Canlı değişiklik öncesi yalıtılmış imaj/token/restart/expiry/backup kontrolleri
  ve taze açık geçiş onayı hâlâ gerekir; ürün etkinleştirme ayrı kalır.
- Yerel sahte HTTP/veri testleri: store verification + reconciliation + atomic
  refund **60 geçti**. İlk çalışma yerel venv'de pytest bulunmadığı, sonraki
  denemeler Windows geçici klasör izinleri nedeniyle tamamlanmadı; sistem
  Python ve doğrulanmış yeni özel pytest yolu ile exit0. Bunlar gerçek Google
  teslimi, canlı imajın yalıtılmış PG17/Redis testi veya gerçek satın alma değildir.
- Kullanıcı kart/banka bilgilerini erteleyerek devam etmek istedi. Aynı proje
  Billing / Linked account ekranı **This project has no billing account**
  ve projenin hiçbir faturalandırma hesabına bağlı olmadığını gösteriyor.
  Konu/abonelik oluşturulmuş olması aktif Cloud Billing veya çalışan RTDN
  teslimine kanıt sayılmaz. Resmî Pub/Sub Console quickstart ve Free Tier
  koşulları aktif Cloud Billing bağlantısı ister; gerçek bildirim akışı için
  bu ayrı kapı tamamlanmalıdır. Play/AdMob gelir alma IBAN'ı ile Cloud hizmet
  bedeli ödeme yöntemi farklıdır. Hesap/deneme/kart/proje bağlantısı yapılmadı.
  Manage billing accounts ekranında önce seçili Cloud organization filtresi,
  sonra kullanıcı `None selected` ile kuruluş filtresini kaldırdı. Her iki
  ekranda da hesap satırı yok, yalnız Add billing account var. Bu oturumun
  erişebildiği varsayılan aktif hesap listesinde mevcut hesap bulunamadı;
  başka Google oturumlarının/kapalı hesapların yokluğu iddia edilmez. Kullanıcı
  bireysel geliştirici olduğunu doğruladı; şirket/kuruluş ödeme profili açılmaz.
  Gerçek RTDN akışı için yeni Cloud Billing kurulum/ödeme yöntemi kapısı
  kullanıcı kararını bekler. Hesap oluşturma/bağlama veya deneme başlatma
  ayrıca onaylanmadı; kart girişi yalnız Google'ın resmî panelinde yapılır.
  Kaynaklar: https://docs.cloud.google.com/pubsub/docs/publish-receive-messages-console
  ve https://docs.cloud.google.com/free/docs/free-cloud-features .
- Sunucu salt-okunur yeniden envanteri: canlı servisler sağlıklı, yalnız mevcut
  iki production ağı + varsayılan Docker ağları var; API/bakım/PG17/Redis image
  kimlikleri mevcut ve sabitlenmiş, WIF config SHA eski pinle aynı. Yalıtılmış
  WIF + RTDN imaj/PG17/Redis/restart/restore çalışması henüz başlatılmadı;
  bu tur yeni uzak konteyner/ağ/birim, config kopyası veya mount oluşturulmadı.
- Oyuncu verisi okunmadı/değiştirilmedi; deploy/build/restart/commit/push yok.
  Yerel özel kanıt `artifacts/google-play-billing-20261009/READINESS.json`.
  Son savaş audit kaynakları commit edilmiş olsa da bu canlı r13/v4'e eklenmedi.

## Önceki yerel devam noktası — kapsamlı savaş audit + insan önceliği + ses yerelde

9 Ekim. Kullanıcı tüm savaş backend/frontend koduna debugging, refactoring,
review/static lint, bağımsız peer review ve ardından 10 sn insan öncelikli
PvP + reklamda duran/kısık sonuç müziği + daha kısık VFX/daha açık savaş
müziği istedi. **Bu değişiklikler yalnız çalışma ağacında; yeni yayın yetkisi
yok. Deploy/APK/AAB/commit/push yapılmadı.** Önceki canlı yayın aşağıda korunur.

- Ana audit: `docs/BATTLE_CODE_AUDIT_20261008.md`; önceki iki belge korunur.
- Socket başına serialized bounded writer, latest snapshot coalesce; ağ motoru
  bekletmez. Socket/session sınırı, terminal cancel/drain, publication/reconnect
  yarışları kapandı. Client publication marker olmadan ekonomik sync yapmaz.
- HTTP tek-flight/session-generation; monoton snapshot/cursor; maxHP doğru;
  RAF/sweep/ticker/core-wave rematch generation; başarısız deploy pending yaratmaz.
- Normal PvP insan-first, fallback 10 sn; tutorial ve açık AI-only override korunur.
  İki yerel başlatıcı default 0; canlı env okunmadı/değiştirilmedi.
- Mix v15: battle 2.85, SFX 0.28, result 0.55/320 ms attack; terminal combat duck
  korunur. Reklam basışı persistent per-result stop; geç decode/resume/play ve
  fallback kuşak kontrolü, slider restart yok. Ses dosyaları yeniden
  üretilmedi; kullanıcı tercihleri ve SSV ödül güvenliği korunur.
- Peer review bulguları kapandı. Bağımsız lifecycle 7/7, audio 14/14 ve son
  countdown/presentation receiver regresyonu 5/5 geçti; engelleyici bulgu yok.
- Son tam client 272, server 1313/39 skip, build 9 başarılı. Ruff game/main/
  matchmaking/profile: 0 hata; ESLint battle/app/relay/audio: 0 hata,
  10 legacy unused uyarısı. Genel import checker: 13 eski bulgu;
  ayrıntılar raporda, repo tümü temiz sayılmaz.
- Ek mobil E2E countdown native timer receiver `Illegal invocation` yakaladı;
  wrapper+regresyon eklendi. Yoğunluk fixture ilk snapshot/render'ı bekler.
  Son geniş 9 E2E senaryosu **9/9 geçti (2,3 dk)**. Arkadaş maçında iki client'ın
  page error listesi boş; Desktop + Pixel7 viewport dört client freeze 0.
  p95 kare: Desktop 30,5–31,5 ms, Pixel7 23,5–25,5 ms. Gerçek telefon değildir.
  Kanıt `artifacts/battle-audit-20261009/nine-scenarios-final.json`;
  SHA256 `2c3e97d7f6af3109814d78c650dac97d1053fa90ada5bce1f746744abd8604d8`.
- Offline profiler `tools/battle_profile.py`: 8208 step p95 0,667 ms; sentetik
  50 ms socket eski admission 80,722 ms → yeni 0,509 ms. Gerçek telefon ölçümü değildir.
- Fiziksel telefon yoğun insan PvP/ses henüz doğrulanmadı. Sayısal modül/rarity
  değişikliği yok. Eski Uç/Sinem raw event dizisi silinmiş; kesin donma anı
  kanıtlanamadı. Oyuncu/maç kimliklerini checkpoint veya rapora ekleme.

Yerel uygulama/test/rapor tamamlandı. Aşağıdaki önceki local bölüm tarihsel
kayıttır; yeni çalışma için fiziksel cihaz doğrulaması veya ayrı yayın talebi beklenir.

## Önceki yerel çalışma — PvP donma düzeltmesi / 3–2–1 / modül incelemesi

8 Ekim 2026. Kullanıcı arkadaş/insan PvP'de donup ardından biriken olayların
hızla akmasını düzeltme, enderlik korunarak modül incelemesi ve büyük altın
3–2–1 istedi. Ayrıca kendi son ortak arkadaş maçını salt-okunur inceledik;
sonuç uygulanmıştı fakat ayrıntılı motor zaman çizelgesi silinmiş olduğundan
donma anı/tek nedeni kanıtlanamadı. Oyuncu kimliklerini bu dosyada tutma.

- Bu turdaki değişiklikler **yalnız çalışma ağacında**; canlı r13 ve mevcut
  versionCode4 paketlere dahil değil. Dağıtım, APK/AAB, commit/push yapılmadı.
  Başlangıç HEAD: `d9416ee18cc1fd2638ac9e62d311a1f60485a6b0`.
- WebSocket her-message render / çift snapshot uygulama kaldırıldı;
  presentation queue tek RAF, son snapshot, en fazla 80 FX / 1.200 ms yaş.
  Yok edilme kayıtları FX'den önce korunur, önemli uyarılar korunur.
- Reconnect/live cursor monoton ilerler; client olay başına tekrar eleme,
  son 256 tanısal olay, heartbeat ACK cursor, eski snapshot'a geri dönüş yok.
  Yetki/görünürlük/oyuncu hesap güvenliği değiştirilmedi.
- Sunucu başlangıç kapısı 3 sn: motor/AI/enerji durur, erken komut reddi;
  büyük altın 3–2–1, kart/güç kilidi; reconnect geri sayımı yeniden başlatmaz.
- 36 modül / 7 çekirdek incelendi, enderlik/sayılar korundu. Üç yanıltıcı
  destek kısa etiketi paylaşılan etkiye göre düzeltildi. Tekillik/Kesici
  maliyet ayrımı yalnız gerekçeli **öneri**, uygulanmadı.
- Yerel istemci 252/252, build 9/9; tam sunucu 1.294 başarılı / 39 skip.
  İki-client E2E Desktop Chrome + Pixel7 emülasyonunda **6/6**: gerçek
  arkadaş arayüzü 3/2/1 + socket drop + unique cursor + sonuç; normal PvP
  sonucu; reconnect/rematch. Desktop/Android geri sayım görseli incelendi.
  Gerçek telefon yoğun maç/FPS doğrulaması değildir.
- Ayrıntılar: `docs/BATTLE_PERFORMANCE_FIX_20261008.md`,
  `docs/MODULE_REVIEW_20261008.md`. Yerel özel okuma script'i ignored
  `artifacts/battle-performance-20261008/` altında; sırlara dokunma.
- Yavaş socket mevcut broadcast timeout'u (2 sn) değişmedi. Telefon testi,
  uzun yoğun savaş ölçümü ve gelecekteki dağıtım için ayrı talep gerekir.

## Önceki yayın noktası — r13 canlı ve imzalı v4 APK/AAB hazır; ödeme kapalı

8 Ekim ev bilgisayarı. Kullanıcı yalıtılmış gerçek WIF/API kontrolünü,
sunucu güncellemesi ve imzalı APK/AAB **versionCode4** hazırlığını onayladı.
**Kullanıcı son canlı geçiş + ardından v4 üretimi için taze "onaylıyorum" yanıtını verdi.** Ürün etkinleştirme,
gerçek ödeme açma, geniş IAM/Play izinleri, yeni anahtar, USB kurulum veya
Play yüklemesi bu işlemlerin parçası değildir. Edge'de elle çalışma korunur.

- Kullanıcı commit/push yaptı: `804da6f3a3527a749103d682d800b2864091a16a`
  (`GRIDSHARD 2.1 v4 fix`). Bu exact commit'in CI koşusu
  [37688896714](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/37688896714)
  **completed/success**, beş işin tamamı yeşil. İstemci 248/248, Node araçları
  32/32; Windows gerçek checkout araçları 17/17 geçti. Windows'taki ek tam
  sunucu koşusu ilerlemediği için yalnız o koşunun doğrulanan kendi iki PID'si
  durduruldu; başarılı sayılmadı. Hedef Linux'ta tam kaynak sunucu testleri
  **1.326 geçti / 1 atlandı** (hostta pg_dump/pg_restore yok).
- Özel, ayrı host test alanında IMDSv2 → Google STS **200** → mevcut billing
  hizmet hesabı impersonation **200**: gerçek kısa ömürlü `androidpublisher`
  token alındı; bellek önbelleği ve 1 saat üst sınırı doğrulandı. Özel config
  özeti önceki `08acb219...` ile aynı. Credential/token/raw body basılmadı.
  Mevcut canlı `.env`, mount, oyuncu DB'si veya IAM/metadata ayarı değişmedi.
  Ancak salt-okunur Play finans API'si **401 / permissionDenied /
  insufficient permissions**, ürün liste API'si **403** verdi. Bu nedenle
  **Play uygulama erişimi ve gerçek ödeme hazır değildir**. Son izin ekranı
  üç GRIDSHARD iznini doğru gösteriyor; yönetici kapalı. Aynı hizmet hesabı,
  paket/kayıt ve etkin erişim/yayılım kontrolü ayrıca gerekli; yetkiyi genişletme.
  Ürünlerde etkin satın alma seçenekleri0 satın alınabilirliği engeller;
  finans API yetki hatasını gidermek için ürün etkinleştirme yapılmaz.
- Taze kaynak ZIP, eski adayın üzerine yazılmadan
  `artifacts/server-aws-20261008-billing-r13-candidate/` altında donduruldu:
  SHA256 `b0a2cb4fc9e9a1bf97035f918d273d59bb71cb592a0c61867bfc155f960951eb`,
  83.300.960 byte; manifest exact commit yukarıdakiyle aynı. r12 karşılaştırması:
  migration/JSON migration, Dockerfile, mevcut dört Compose katmanı ve client
  build lock'ları aynı; onaylanan Google-auth bağımlılığı/opt-in WIF katmanı
  ve uygulama/istemci farkları mevcut. WIF katmanı **canlıya uygulanmadı**.
- Hedef aday dizini `/opt/gridshard/releases/aws-20261008-billing-r13`.
  API `gridshard-production-relay-web:billing-r13-20261008-r2`, image
  `sha256:3064683905f36f88c8aded85c0a27d2be900ad84ac622ed6ec59405ed30fd4d1`;
  bakım `gridshard-production-maintenance:billing-r13-20261008-r2`, image
  `sha256:ac0eaad022544c80b2856b5f60cf7cd25855435cfb38344f644ef53813a850f5`.
  İlk candidate build operator umask077/ZIP izinleri nedeniyle non-root kod
  okumasında durdu; yalnız public kaynak izinleri normalize edildi, özel
  `.env`0600 korundu. İlk imaj/başarısız loglar korunup ayrı r2 tagleri kullanıldı.
  Bu uygulama kodu değişikliği değildir; dondurulmuş commit değişmedi.
- Kaynak ZIP'inde iki dış QA-report testi ve Git-list bağımlı araç testi
  çalışamaz. Tam source CI bu testleri kapsıyor; gerçek Windows checkout
  araçları17/17 ayrıca geçti. Linux araçları12/4 skip/1 deselect; dört skip
  Windows PowerShell fixture'ları. Bunlar geçti diye raporlanmadı. İlk araç
  koşusunun Git eksikliği ve Windows fixture TEMP'nin kaynak içinde olması
  hataları korundu; korumalar kaldırılmadan test ortamı düzeltildi.
- `verify-r3` ayrı PostgreSQL17/Redis7/sentetik reviewer sırlarıyla **exit0** tamamlandı.
  `verify-r2` tam sunucu testleri geçti ama canonical smoke'un sentetik sır
  dizini operator umask077 altında0700 olduğu için durdu. Yalnız disposable
  smoke subprocess'i canonical CI umask022 ile tekrar başlatıldı; gerçek
  sırların izinleri değişmedi. r13 image API'sinde premium19999 kuruş, sandık
  5/3/2/1 günlük sınırı/base fiyatları/UTC reset/yeni UI ve billing-closed;
  reviewer premium/iki cihaz/ordinary-profile koruması geçti.
  **330s soak (33 kontrol), restart ve gerçek maintenance backup/restore geçti**.
  `isolated-verification.json` exact image/hash/commit ile yazıldı; disposable
  PostgreSQL/Redis ve kendi test ağı temizlendi. Tarih: `2026-10-07T21:59:19Z`.
  Özet kanıt `logs/isolated-verification-export.json`; ilk operator hatalarının
  log/hash/exit kayıtları korunur. Source testler verify-r2, image smoke verify-r3;
  iki sonucu birleştiren makbuz yeni test koşusu diye sunulmaz.
- Aday bridge ağından IMDSv2 token/rol-listesi okunabildi; beklenen rol eşleşti.
  **credential_body_requests0/google_requests0/metadata_options_changed=false**.
  Bu bir gerçek candidate Google token/ödeme testi veya production network
  testi değildir. HTML SHA256
  `2b8af3f64e4e3adaf692a13220e59d8e32f8d95f463f9ccb0e818a30951d6877`;
  bağımsız dış HTTPS witness bu exact web sayfasını kullanacak.
  Dış HTTPS r12 health/lease/player-data hazır. Mevcut public assetlinks yalnız
  `com.gridshard.remotedebug` gösteriyor; canonical release App Link onaylanmış
  sayılmaz. PGS'nin native girişiyle bunu karıştırma; yeni link/sertifika/provider
  yazılmadı, cutover witness mevcut public debug linkini koruma kontrolüdür.
- Taze son onay sonrası ilk canlı denemede offline yedek ve değişmeyen satır
  fingerprint'leri doğrulandı; iç330s/33 sağlık kontrolü geçti. Ancak dış
  ham HTML özeti Cloudflare email-obfuscation ve beacon ekleri yüzünden
  eşleşmedi; witness teslim edilmedi ve **otomatik r12 image/config rollback
  yapıldı, canlı DB geri yüklenmedi**. Sonra r12 healthy,12 profil/12 kimlik/
  66 savaş,pending0/aktif0 yeniden doğrulandı. İlk yedek/log/exit1 saklıdır.
  Yalnız ignored operator proof düzeltildi: bilinen iki public e-posta
  dönüşümü ve tam tanımlı Cloudflare script'leri ayrılır, kalan HTML'nin
  **bütün byte'ları pinned image HTML SHA ile aynı olmalıdır**. Fixture'lar
  gerçek içerik farkını/bilinmeyen script'i/yinelenen dönüşümü reddediyor;
  canlı r12 origin SHA ile ayrıca tam eşleşme geçti. Uygulama/imaj/source
  değişmedi; Cloudflare/IAM/network ayarı değiştirilmedi.
- `deploy-r2` **exit0** tamamlandı: `2026-10-07T22:25:22.336667Z`
  (8 Ekim01:25 Türkiye). Yeni `20261008-before-billing-r13-attempt2` yedeği
  SHA/0600/kurulum/kayıt sayıları ve pg_restore-list ile doğrulandı.
  İç ve bağımsız dış **330s/33** kontrol geçti; TLS doğrulandı, unsigned SSV403,
  kritik log işareti0. Geçiş anında12 profil/12 kimlik/66 savaş/pending0 ve
  tüm profil/kimlik/takım satır fingerprint'leri aynı; reviewer satırları1/1.
  `deployment-receipt.json` SHA
  `2d14cf8f4863a05d8ab81e3dc5f9a4fd427f1aa5eb1136fb2eae38dec77f7bb5`.
  Bağımsız post-check exact image, mevcut read-only sırlar/unchanged private
  env, taze backup SHA ve eski r12 rollback image'in kaldığını ayrıca doğruladı.
  Sanitized yerel kanıtlar ignored candidate `server-receipts/` altında.
  Reklam **live/SSV1/test0**, mevcut PGS/demo salt-okunur sırları ve dört
  Compose/volume korunur; gerçek/sahte ödeme ve WIF layer kapalıdır.
- Android JDK21/SDK36 ve mevcut upload/DPAPI kullanılabilir; PrepareOnly
  tamamlandı, mobile build `1bb510de60ab21c5`. **İmzalı v4 üretildi**:
  r13 receipt/post-check sonrasında `build-v4.ps1` offline Gradle
  assembleRelease+bundleRelease **BUILD SUCCESSFUL (32s), exit0**; aynı upload
  signer ile ayrı `artifacts/android-production-20261008-v4/` dizinine
  overwrite-false copy ve binary audit geçti. Paket `com.gridshardgame.app`,
  versionCode4/versionName `2.1.0-beta.72`; V3 ile aynı signer
  `03:A4:5C:59:28:F2:4B:5D:79:DC:A8:73:1C:C5:54:C2:24:88:E2:C4:B1:82:A2:E7:DA:39:E3:C3:23:F6:1F:88`.
  APK `GRIDSHARD-2.1.0-beta.72-v4.apk`,28.291.480 byte, SHA256
  `79ef8f3638cc67da6823b5fec14318f4c11d129d26e81128905941fcde7bc5d1`.
  AAB `GRIDSHARD-2.1.0-beta.72-v4.aab`,27.684.311 byte, SHA256
  `9577008d0bd068614ac95daebf80fb2c409b55fc794acc3f33c69665afe6443f`.
  İki imza doğrulandı, her pakette74 web asset birebir güncel dist ile eşleşti;
  9 font gömülü, external font host yok; özel reviewer malzemesi/anahtar/env
  yok, debuggable/AD_ID/remote-web URL yok, Firebase auto-init kapalı.
  `release-audit.json` ve server/source/CI/signer bağlayan
  `release-provenance.json` aynı ignored teslim klasöründe. V3 teslim dosyaları
  değiştirilmedi. Gradle flatDir/line-ending uyarıları hata değildir; source
  karşılaştırması yalnız iki devir belgesinde değişiklik gösterdi.
  Paket sonrası canlı independent post-check yeniden geçti.
- **Kalan kullanıcı adımı:** AAB'yi kullanıcı Play dahili teste yükler; uygulamayı
  kaldırmadan/veri silmeden Play üzerinden güncelleyip PGS eski profil ve
  reviewer premium erişimi gerçek cihazda doğrulanır. USB install/Play upload,
  gerçek cihaz ve tam erişim beyanı **bu işlemde yapılmadı/doğrulanmadı**;
  audit'teki ilgili bayraklar false tutuldu. Ödeme API yetki hatası ayrı kaldı:
  gerçek/sahte ödeme veya ürün etkinleştirme açılmaz, geniş IAM eklenmez.
  Public canonical App Link hâlâ yok; yalnız eski debug link korundu.

Bu yeni bölümün yazılması yalnız kanıt/devir belgesidir; uygulama source
804da6f olarak dondurulmuştur. Kanıt/script/loglar özel ignored candidate
klasöründedir. Sunucu IP'si/SSH key yolu, private config ve player verileri
izlenen bu kayda alınmadı; commit/push kullanıcıda kalır.

## Önceki devam noktası — EC2 kimliği doğrulandı, gerçek Google WIF testi bekliyordu

7 Ekim, kullanıcının Edge'inde elle ilerlenen Google Cloud aşaması:

- Kullanıcı, yalnız dar kapsamlı havuz/sağlayıcı oluşturma işlemini
  **"onaylıyorum"** diyerek onayladı ve Save'e kendisi bastı. Son kullanıcı
  ekranı (`233658`) `gridshard-play-billing` havuz kimliğini, **Enabled**
  durumunu ve IAM principal içindeki proje numarası `376018782491` değerini
  doğruluyor. AWS türündeki **GRIDSHARD EC2** sağlayıcısı yeşil/etkin görünüyor.
  Sonraki Cloud Shell salt-okunur listesinde gerçek sağlayıcı adı
  `projects/376018782491/locations/global/workloadIdentityPools/gridshard-play-billing/providers/aws-ec2`,
  durum **ACTIVE** ve AWS accountId `583365237571` ayrıca doğrulandı.
- Kayıttan önceki ekran (`23350`) `google.subject = assertion.arn` ve
  `attribute.aws_role` varsayılan eşleştirmesinin başlangıcını gösterdi;
  ikinci ifadenin tamamı kutuda görünmüyordu. Girilen CEL koşulu görüldü:
  `assertion.account == '583365237571' && assertion.arn.startsWith('arn:aws:sts::583365237571:assumed-role/gridshard-play-billing-wif/')`.
  Koşul AWS hesabının tamamını değil yalnız bu rolün oturumlarını kabul eder.
  Sonraki Cloud Shell çıktısı kalıcı koşulun aynısını, `google.subject =
  assertion.arn` ve varsayılan normalize assumed-role ARN eşleştirmesinin
  tamamını doğruladı. Havuz grafiğinde veri yok; gerçek token denemesi yapılmadı.
- **Hizmet hesabı impersonation bağlantısı kullanıcı onayıyla kaydedildi.**
  `234243` ekranı mevcut hizmet hesabının tam e-postasını doğruladı:
  `gridshard-play-billing@project-37a84396-b930-4141-b4d.iam.gserviceaccount.com`.
  `234153` formunda seçilen filtre **subject**, tam beklenen değer
  `arn:aws:sts::583365237571:assumed-role/gridshard-play-billing-wif/i-0c00d7409aa5dcff1`.
  Bu değer bilinen rol/instance ve EC2 kimlik biçiminden türetildi; gerçek
  GetCallerIdentity sonucu henüz alınmadı. Tüm havuz yerine yalnız bu EC2
  rol oturumu kapsamı kullanıcıya açıklandı; kullanıcı **"onaylıyorum"**
  diyerek nihai IAM kaydını ayrıca onayladı ve Save'e kendisi bastı.
  `234355` ekranı aynı hesapla Configure your application penceresini ve
  **Policy updated** bildirimini gösteriyor (yayılım birkaç dakika sürebilir).
  `234550` ekranında Connected service accounts listesinde billing hesabı
  görüldü; açılan `234643` satırı kalıcı **google.subject** filtresinin yukarıdaki
  tam EC2 ARN'siyle eşleştiğini ayrıca doğruladı. Kullanıcının Edge Cloud
  Shell'inde çalıştırdığı **get-iam-policy** JSON'u yalnız bir binding gösterdi:
  `roles/iam.workloadIdentityUser`, yalnız bu exact `principal://` subject
  üyesi. Bu SA-resource policy kanıtıdır; gerçek AWS kimliği/token denemesi
  veya projenin tüm inherited IAM politikalarının denetimi değildir.
  `/*`, Owner/Editor veya geniş Token Creator seçilmedi; Play izinleri ve
  kuruluşun anahtar politikası değiştirilmedi.
- Kullanıcının **services list --enabled** çıktısı beş API'nin zaten açık
  olduğunu doğruladı: `androidpublisher.googleapis.com`,
  `cloudresourcemanager.googleapis.com`, `iam.googleapis.com`,
  `iamcredentials.googleapis.com`, `sts.googleapis.com`. Yeni API açılmadı;
  banka/billing profili, ücretsiz deneme veya key politikası değiştirilmedi.
- **Config üretimi ve yerel doğrulama tamamlandı:** Cloud Shell'de özel/yeni operator klasörüne
  `gcloud ... create-cred-config --aws --enable-imdsv2` ile anahtar içermeyen
  config üretmek (global STS, doğrulanmış provider/SA, varsayılan 1 saat).
  Kullanıcının komut çıktısı config'in Cloud Shell'de
  `./gridshard-wif-20261007-MMZ5NV/google_play_wif_config.json` olarak
  üretildiğini bildirdi. Bildirilen SHA256:
  `08acb21901427a430ed810ff06b8b107fd41b42a10e0bdde442934eb2990a030`.
  Kullanıcı **"indirdim"** dedi; 8 Ekim yerelde 966 byte dosyanın SHA256'sı
  bu değerle birebir eşleşti. Dosya, mevcut özel
  `secrets/google-play-billing-20261007/google_play_wif_config.json` konumuna
  **üzerine yazmadan kopyalandı**; yalnız mevcut kullanıcı + SYSTEM erişimi,
  beklenmeyen Allow ACL0, Git ignore ve tracked config0 doğrulandı.
  İndirilenler'deki özgün dosya silinmedi. Raw config/token basılmadı.
  İndirilen ve özel kopyada offline preflight **exit0**: config_valid,
  identity_pinned, IMDSv2 true; private_key false, max lifetime3600,
  network_calls0, **external_connection_verified=false**. Release input
  denetimi config'i ve secrets dosyalarını dışladı; ZIP üretilmedi.
  Ek preflight/paket sınırı testleri **11/11**, kaynak/version guard geçti.
  İlk test denemesi Windows sandbox TEMP/pytest-cache izinlerine takıldı;
  yeni, sınırları doğrulanmış artifacts temp ve cache kapalı tekrar geçti.
  Test/kaynak kodu değiştirilmedi. Özel kanıt:
  `artifacts/google-play-wif-local-20261007/CONFIG_LOCAL_VERIFICATION_20261008.md`.
- **İlk EC2 denemesi (önceki durum):** Tek kısa, read-only IMDS
  kimlik kontrolü denemesinde sandbox bağlantısı kurulmadan Permission denied
  verdi; aynı exact host/pin/rol-listesi script'i ağ izinli denemede **8 saniye
  connect timeout** oldu. Uzak script çalışmadı, role credential gövdesi veya
  Google token alınmadı. Güvenlik grubu/SSH erişimi/metadata ayarı değiştirilmedi.
  Timeout tek başına sunucu kapalı veya SG hatalı demek değildir.
- **8 Ekim erişim ve host kimliği doğrulandı:** Kullanıcının gönderdiği iki
  SG düzenleme ekranındaki SSH kaynakları yalnız tek-IP `/32` kurallarıydı.
  Doğrudan AWS checkip sorgusunda güncel dış IPv4 bu kaynaklarla eşleşmedi.
  Yalnız mevcut kaynak için SSH/TCP22 `/32` ekleme kapsamı açıklandı;
  kullanıcı **"kat-ydettim"** diyerek kaydettiğini bildirdi. Ajan AWS kuralı
  yazmadı; nihai kalıcı rule listesi/API ayrıca okunmadı. Dış kaynak tekrar
  eşleşti ve sıkı pinned host-key ile kısa SSH denemesi **exit0** oldu.
  Uzak IMDSv2 metadata kontrolü instance `i-0c00d7409aa5dcff1`, rol listesi
  yalnız `gridshard-play-billing-wif`, instance-profile ARN
  `arn:aws:iam::583365237571:instance-profile/gridshard-play-billing-wif`
  değerlerini bağımsız doğruladı. IMDSv2 mevcut ve zorunlu; rol-listesi ve
  iam-info HTTP200. **credential_body_requests0 / google_requests0**.
  Gerçek AWS GetCallerIdentity veya Google token henüz alınmadı; host
  metadata başarısı Docker ağından metadata erişimi veya WIF kanıtı değildir.
  Config transferi, yalıtılmış gerçek token/Play salt-okunur erişim testi ve
  canlı mount/deploy ayrı onay kapılarıdır. Mevcut canlı servis/env/oyuncu
  verisi ve IMDS ayarları değiştirilmedi; APK/AAB/build yok. Özel kanıt:
  `artifacts/google-play-wif-local-20261007/EC2_HOST_IDENTITY_20261008.md`.
- Gerçek WIF bağlantısı bekliyor. Özel
  anahtar, canlı mount/env, APK/AAB, dağıtım, ürün etkinleştirme, satın alma
  veya oyuncu verisi işlemi yapılmadı. Önceki AWS rolü ve güvenlik sınırları
  korunur; Edge'de elle çalışma tercihi geçerlidir.

## Önceki ev aşaması — kaynak/canlı ön kontrol ve ödeme izinleri

7 Ekim ev turunun başlangıcında HEAD `f2a6723d2fc0d5ade355a3c4b587c9f63c2e25f6`
(`fix`) ve temiz çalışma ağacı doğrulandı. Bu commit'in GitHub Actions
GRIDSHARD Quality koşusu `37628923191` **success**. Aynı upload anahtarı,
Windows DPAPI kayıtları ve JDK21/SDK36 kullanılabilir; yeni anahtar veya
APK/AAB üretilmedi. Yerel Docker Linux motoru çalışmıyor.

- Sıkı pinned host-key ile evden SSH **başarılı**. Salt-okunur denetimde
  canlı r12 API/Caddy/Postgres/Redis sağlıklı; dört read-only özel sır mount'u,
  Play Games/demo yapılandırması ve reklam `live`/SSV1 korunuyor. Sahte
  reklam/ödeme test kipleri0; Google Play ödeme hizmet hesabı dosyası henüz
  yapılandırılmamış. Denetim anında **12 profil / 12 kimlik / 66 savaş**,
  pending0, aktif PvP/websocket0. Oyuncu verisi veya canlı ayar değişmedi.
- r13 kaynak adayı yerelde donduruldu:
  `artifacts/server-aws-20261007-analytics-store-r13-candidate/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`,
  SHA256 `177f9a2e4ac242c0b11e019b4e9cf42b7a80ebc313d8614265b976c7080bd624`.
  Release guard/ZIP CRC geçti; r12'ye göre Docker/Compose/bağımlılık/DB
  migration dosyaları aynı. Sunucu değişiklikleri dört r13 kaynak dosyasıyla
  sınırlı. **İmaj build, yalıtılmış test, r13 deploy ve v4 build henüz yok.**
  Bu ZIP o andaki temiz HEAD'in dondurulmuş adayıdır; aşağıdaki yeni WIF
  desteğini ve diğer aracın daha sonra yaptığı fiyat/arayüz değişikliklerini
  içermez. ZIP sessizce değiştirilmedi; güncel kaynak için yeni aday gerekir.
- Kullanıcının yeni Play ekranları mevcut hesabın **Etkin** olduğunu ve tam
  adresini doğruladı:
  `gridshard-play-billing@project-37a84396-b930-4141-b4d.iam.gserviceaccount.com`.
  Gönderilen üç izin ekranı **Hesap izinleri**: görünen yönetici, finans,
  sipariş, yayın ve diğer hesap-geneli kutuları kapalı. Bu, GRIDSHARD'a
  özel uygulama izinlerinin eksik olduğunu kanıtlamaz; o bölüm henüz yeni
  görüntülerde görülmedi. Mevcut kaydın **Uygulama izinleri → GRIDSHARD**
  bölümünde salt-okunur uygulama bilgisi, finansal veri görüntüleme ve
  sipariş/abonelik yönetimi doğrulanacak. Hesap-geneli yetki genişletme,
  yeni hesap/davet/JSON anahtarı oluşturma yapılmadı.

**Son kullanıcı teyidi:** GRIDSHARD uygulama izinlerindeki üç gerekli
kutunun doğru seçili olduğunu bildirdi. Uygulama-özel nihai ekran/API
denetimi henüz yapılmadı; hesap kaydı Etkin olduğu ekranla doğrulanmıştı.
Yeni Cloud ekranında aynı hizmet hesabının **Anahtarlar** listesi boş
(`No rows to display`); mevcut kullanıcı anahtarı görülmedi. Kullanıcı
**tek JSON anahtarının oluşturulup indirilmesini açıkça onayladı**.
`secrets/google-play-billing-20261007/` boş özel klasörü hazırlandı:
ACL mirası kapalı, yalnız mevcut Windows kullanıcısı ve SYSTEM erişimi.
Git ignore ve release paketleme dışlama kontrolü geçti; izlenen sır
dosyası0. **JSON dosyası henüz oluşturulup indirilmedi/teslim alınmadı.**
Onay yalnız anahtar oluşturma/indirme ve güvenli yerel saklama kapsamında;
canlı sağlayıcı mount/env, RTDN, ürün etkinleştirme veya satış açma değil.

**Sonuç: JSON anahtarı oluşturma kuruluş politikasıyla engellendi.** Yeni
Cloud ekranı `iam.disableServiceAccountKeyCreation` zorlamasını gösteriyor;
anahtar/dosya üretilmedi, boş özel klasör duruyor. Politika/rol/proje
değiştirme veya CLI ile engeli aşma yapılmadı. Bu, Play uygulama izinleri
ya da Android upload anahtarının hatası değil. O andaki kaynak yalnız RSA
özel anahtarlı hizmet hesabını destekliyordu. Kullanıcıya AWS WIF ile
anahtarsız backend desteğinin **yalnız yerel hazırlık/test** aşaması önerildi;
kullanıcı **"devam et o zaman"** diyerek bu aşamayı onayladı. AWS/Cloud
güven ilişkisi, canlı ödeme ve dağıtım bu onayın içinde değildir. Politika
gevşetilmez; yeni proje/hesap/key ile kısıt dolaşılmaz.

### Son yerel sonuç — anahtarsız ödeme desteği hazır, bağlantı henüz kurulmadı

- `server/app/google_play_wif.py` ve `GooglePlayVerifier` için opt-in
  `aws_wif` kipi eklendi. Google `google-auth` **2.60.0** ile IMDSv2 →
  AWS imzalı kimlik → Google STS → mevcut hizmet hesabı adına kısa ömürlü
  `androidpublisher` token akışı **sahte HTTP yanıtlarıyla** doğrulandı.
  Varsayılan `service_account` ve mevcut RSA yolu korunur. Eksik/karışık
  yapılandırma, yanlış audience/hedef hesap, key/ADC/executable/arbitrary
  URL kaynağı, statik AWS anahtarları ve IMDSv1 reddedilir. Tokenlar bellek
  içindedir; hatalar gizlenir, yönlendirme takip edilmez, ağ hatası satın
  alma teslimatına veya alternatif kimliğe dönüşmez.
- `tools/google_play_wif_preflight.py` **çevrimdışı** yapılandırma/pin
  kontrolüdür; başarılı olsa bile `external_connection_verified: false`
  döndürür. Yeni `docker-compose.google-play-wif.yml` yalnız API için
  isteğe bağlı özel config mount/env şablonudur; **hiçbir sunucuya uygulanmadı**.
  Auth config dosyaları release paketleme sınırından ayrıca dışlandı.
- Son yerel doğrulama: tam sunucu paketi **1.290 geçti / 39 atlandı /
  0 başarısız**, araçlar **17/17**. Atlananlar yalıtılmış PostgreSQL ve
  gerçek Redis adresi gerektirir; canlı DB kullanılmadı. Bir Starlette
  test-client deprecation uyarısı var. `pip check`, release guard ve
  `git diff --check` geçti. İmaj/PG17/gerçek Redis, gerçek WIF token,
  Cloud IAM/Play bağlantısı, RTDN ve cihaz ödemesi bu kanıtın dışındadır.
  Test ortamı `artifacts/google-play-wif-local-20261007/venv/` altında özel,
  ignore edilmiş Python 3.12 ortamıdır; mevcut kullanıcı ortamı değişmedi.
- İngilizce kurulum/onay kapıları `docs/GOOGLE_PLAY_AWS_WIF.md`;
  ödeme kılavuzu ve `.env.example` yeni kipi belgeliyor. İstemciye sır
  eklenmedi, gerçek `.env` dosyası değiştirilmedi. Android build, deploy,
  gerçek/deneme ödeme, ürün etkinleştirme, commit/push ve oyuncu hesap
  değişikliği yapılmadı. r12 reklam `live`/SSV/test0 durumu korunur.
- Aynı çalışma ağacında diğer aracın **premium fiyatlarını 199,99 TL'ye
  çıkarma ve arayüz** değişiklikleri geldi. `CLAUDE_CHECKPOINT.md` ve o
  değişikliklere dokunulmadı; ortak `docs/STORE_PURCHASES.md` içindeki
  fiyat değişiklikleri korundu. Eski yeşil CI yalnız `f2a6723` içindir;
  yeni commit/CI ve taze kaynak/dependency/binary audit gereklidir.
- Sonraki dış kurulumun hedefini belirlemek için mevcut sunucu IAM rolü /
  IMDSv2 metadata'sına salt-okunur SSH denemesi yapıldı; **bağlantı zaman
  aşımı** nedeniyle uzak script çalışmadı. Rol/instance profile/IMDS ayarları
  doğrulanamadı; AWS credential gövdesi veya Google token alınmadı. SSH
  erişimini genişletme ya da anahtar denetimini kapatma yapılmadı.

### Son ek kontrol — iki premium ürünün fiyatı 199,99 TL

Kullanıcı diğer araçla yapılan fiyat değişikliğinde eksik kalanları kontrol
etmemizi istedi. `season_pass_premium` ve `battle_rewards_premium` kaynak
kataloğunda **19999 kuruş**, HTML düğmelerinde ve JS yedek metinlerinde
**199,99 TL** doğrulandı. Diğer aracın değişiklikleri korunarak yalnız kalan
eski devir tablosu ve `99_99` test adı düzeltildi; yol haritasının tarihsel
Tur 9 kaydına yeni fiyat/tarih açıklaması eklendi. Akı/Devre Kredisi paketleri
değişmedi. İstemciye iki regresyon testi eklendi: her iki premium yazısı /
yedek değer ve sahte Play metadata'sındaki 199,99 fiyat + doğru ürün/teklif.

Son kontrol: premium sunucu testleri **15/15**, tam istemci paketi doğru
`client/` çalışma dizininden **248/248**, JS syntax ve diff kontrolü geçti.
Play Console'daki iki Türkiye fiyatı **ayrıca doğrulanmalı**; Android'de
gösterilen ve tahsil edilen fiyat yerel etiketten değil Play'den gelir.
Mevcut canlı r12/Play v3 ve eski dondurulmuş r13 adayı değiştirilmedi;
bu yeni kaynak için commit/CI, yeni aday ve ayrı yayın kapıları geçerlidir.
Ürün etkinleştirme, satın alma, dağıtım veya Android build yapılmadı.

### Son AWS sonucu — anahtarsız ödeme rolü EC2'ye bağlandı

Kullanıcının 7 Ekim EC2 Güvenlik ekranında mevcut `gridshard-test`
sunucusunun **IAM rolü "—"**; ekranda AWS hesabı, instance kimliği,
Frankfurt bölgesi ve 3/3 altyapı durum kontrolü görüldü. Ayrıntılar özel
`artifacts/google-play-wif-local-20261007/EC2_CONSOLE_STATUS.md` kaydında;
sunucu adresi/SSH anahtar yolu izlenen belgelere eklenmedi. Bu ekran API
sağlığı, IMDSv2 seçenekleri veya WIF bağlantısı kanıtı değildir. Kullanıcının
yeniden teyit ettiği adrese strict pinned host-key ile tekrar SSH denendi;
**connect timeout**, uzak script çalışmadı. Güvenlik grubu değiştirilmedi.

**Bağımsız Console ön kontrolü:** kullanıcı yerleşik tarayıcıda AWS'ye
kendisi giriş yaptı; şifre/MFA okunmadı veya girilmedi. Oturum hesabı
`583365237571`, Frankfurt'taki `gridshard-test` /
`i-0c00d7409aa5dcff1` ARN'si ve başlangıçta **IAM rolü "—"** doğrulandı.
Instance ayrıntıları **IMDSv2 Required** gösteriyor; bu ayar değiştirilmedi.
Başlangıç IAM listesindeki üç hizmet-bağlantılı rolde hedef adla çakışma yoktu.

**Tamamlandı — 7 Ekim (rol oluşturulma zamanı Console'da 23:15 UTC+03:00):** kullanıcı dar
rol/profile oluşturma ve bağlama kapsamını ilk onayın ardından son inceleme
ekranında **"bağla"** diyerek işlem-anında onayladı. Yalnız
`ec2.amazonaws.com` principal'ına `sts:AssumeRole` güveni olan
`gridshard-play-billing-wif` rolü ve aynı isimli EC2 instance profile
oluşturuldu. Rol ayrıntıları **İzinler politikaları (0)** ve maksimum
oturum süresi **1 saat** gösteriyor. Gerçek ARN'ler Console'dan okundu:

- Rol: `arn:aws:iam::583365237571:role/gridshard-play-billing-wif`.
- Profile: `arn:aws:iam::583365237571:instance-profile/gridshard-play-billing-wif`.

EC2 formunda yalnız doğrulanmış `i-0c00d7409aa5dcff1` seçildi; aynı profile
ARN'si seçim listesinde görüldü. **Başarı bildirimi rolün bu instance'a
eklendiğini doğruladı; instance ayrıntıları artık IAM rolünü
`gridshard-play-billing-wif` olarak gösteriyor.** Başka rol değiştirilmedi;
ek AWS yetki politikası, güvenlik grubu, metadata seçeneği, SSH erişimi,
Google IAM/Play izni veya key politikası değişikliği yok. Sunucu restart,
uygulama deploy, APK/AAB, ürün etkinleştirme, satın alma ve oyuncu verisi
işlemi yapılmadı. Host metadata credential gövdesi veya gerçek Google token
alınmadı; AWS rolü bağlanması **WIF/ödeme bağlantısının çalıştığı kanıtı değil**.
Bilgisayar-kullanım becerisi inceleme/onay kapısı ve görsel sonuç kontrolünü
belirledi. Kanıtlar özel `artifacts/google-play-wif-local-20261007/` altında
`AWS_ROLE_CREATED_PERMISSIONS.jpg`, `AWS_ROLE_CREATED_TRUST.jpg`,
`AWS_ROLE_ATTACHED_SUCCESS.jpg`, `AWS_ROLE_ATTACHED_DETAILS.jpg` ve
`EC2_CONSOLE_STATUS.md`. AWS sonuç sekmesi kullanıcıya açık bırakıldı.

**AWS adımı sonunda sıradaki adım:** host IMDS erişimini ve mevcut Google
projesi/hizmet hesabını salt okunur doğrulayıp
dar kapsamlı WIF güven ilişkisini öner; **Google IAM değişikliklerinden önce
ayrı onay al**. Mevcut başka rolü otomatik değiştirme. WIF/RTDN,
test ürünleri ve gerçek satış ayrı kapılardır. Canlı r13 geçişinden hemen
önce de ayrıca onay gerekir; `CODEX_HANDOFF_R13_V4.md` §11–12 birlikte okunur.

**Son devam tercihi:** kullanıcı Google Cloud aşamasında Edge kullanmayı
önerdi. Tarayıcı aracı Edge'e bağlanamadı; envanter yalnız IAB/MCP Apps.
Kullanıcı seçenek sorusuna **"Hayır, Edge üzerinden elle ilerleyelim"**
dedi. Google Cloud kurulumu bundan sonra kullanıcının Edge ekranlarıyla
adım adım elle ilerler; IAB'de Google oturumu açma/kurulum yapılmaz.
Bu tercih alındığında Cloud projesi, hizmet hesabı, mevcut pool/provider'lar
ve API durumları henüz bu turda bağımsız Console'dan okunmamış; Google
kaynağı/IAM izni oluşturulmamıştı. İlk adım Workload Identity Pools listesini
görmek; API etkinleştirme/nihai kaydı mevcut durumu görmeden önerme.
Google güncel rehberi IMDSv2 credential config için `gcloud` ve
`--enable-imdsv2` gerektiriyor; yerel `gcloud` komutu bulunmadı. Bu ileride
elle Cloud Shell veya ayrıca onaylı yerel CLI yoluyla çözülür; JSON özel
anahtar/key politikası gevşetme veya canlı deploy alternatifi değildir.

## İş bilgisayarından devir — ödeme paneli hazırlığı / evde r13 + v4

Kullanıcı iş bilgisayarındaki devamı durdurup **yarım kalan ödeme kurulumunu,
r13 sunucu geçişini ve v4 APK/AAB üretimini ev bilgisayarında** sürdürmemizi
istedi. Bu tur yalnız devir notu yazıldı; canlı sunucu/Cloud/Play ayarı,
ürün etkinleştirmesi, anahtar oluşturma, build, commit veya push yapılmadı.
Not öncesi çalışma ağacı temiz, yerel HEAD `dd76af8` (`add admob`);
evde güncel commit/CI ve yerel değişiklikler yeniden kontrol edilecek.

- **Doğru Cloud projesi ekranlarla doğrulandı:** My First Project,
  proje numarası `376018782491`, ID `project-37a84396-b930-4141-b4d`.
  Eski altı GRIDSHARD OAuth istemcisi ve Audience test kullanıcıları duruyor;
  yeni proje/OAuth istemcisi oluşturulmadı, eskiler değiştirilmedi.
- **Google Play Android Developer API açık:** son kullanıcı ekranında
  `API Enabled`, servis `androidpublisher.googleapis.com` görüldü.
- **10 tek seferlik ürün oluşturuldu:** Console listesinde tam kimlikler
  eşleşiyor, her üründe etkin satın alma seçeneği/teklif sayısı **0**.
  İlk `gridshard.flux_120` ayrıntısında `standard`, Türkiye, **Taslak** ve
  nihai bölgesel fiyat **29,99 TL** görüldü. Diğer ürünlerin fiyat/ülke/
  ayrıntıları tek tek bağımsız okunmadı; hedef tablo ve tuzaklar devirde.
- **Kullanıcı teyidi:** lisans testi listesi kaydedildi, Cloud hizmet hesabı
  oluşturuldu, Play davet ekranında `Kullanıcı davet et` düğmesine basıldı.
  GRIDSHARD'a özel izin görüntüsünde finansal verileri görüntüleme ve
  siparişleri/abonelikleri yönetme seçili, yönetici/yayın yetkileri kapalıydı.
  Zorunlu temel erişim için salt-okunur uygulama bilgisi izni ayrıca önerildi.
  **Davet sonrası liste, tam hizmet hesabı e-postası ve nihai üç izin henüz
  görülmedi.** Evde mevcut kaydı doğrula; hesabı/daveti yeniden oluşturma.
- **JSON anahtarı oluşturulmadı/indirilmedi**, sunucuya ödeme sağlayıcısı
  kurulmadı. RTDN, iade takibi ve gerçek/lisans testi satın alma uçtan uca
  doğrulanmadı. Ürün taslakları satın almanın açık olduğu anlamına gelmez.
- Son iş-PC SSH denemesi sıkı host-key denetimiyle **banner exchange timeout**
  verdi; güncel sunucu denetimi yapılamadı, güvenlik grubu değiştirilmedi.
  Önceki başarılı r12 reklam audit'i aşağıda tarihli kayıt olarak korunur;
  evde yeni salt-okunur kontrol gerekir. IP/SSH anahtar yolu bu nota eklenmez.
- Kullanıcı **v3'te reklam oynattığını** bildirdi. Bu kullanıcı teyididir;
  Google imzalı SSV ile tek ekonomik ödül/ledger kaydı bağımsız doğrulanmadı.
  Önceki doğrulanmış canlı reklam `live` ayarı r13'e taşınırken korunacak;
  sırf eski devir metni reklam kapalı diyor diye kapatılmayacak.
- Yerelde config ve Gradle yeniden okundu: **versionCode 4**,
  versionName `2.1.0-beta.72`, paket `com.gridshardgame.app`.
  r13 dağıtılmadı, imzalı v4 APK/AAB üretilmedi; evde **aynı upload anahtarı**
  kullanılacak, yeni anahtar/sertifika veya USB'den Play uygulamasının
  üzerine kurulum yapılmayacak.

**Evde devam sırası:** güncel kaynak + CI / gerekli özel araçlar → mevcut
r12 ve sır mount'ları salt-okunur kontrol → r13 yalıtılmış test/smoke/
backup-restore → kullanıcıdan geçiş öncesi ayrı onay + taze doğrulanmış yedek
→ veriyi ve mevcut reklam ayarını koruyan r13 → ödeme anahtarı/sağlayıcı/
kimlik doğrulamalı RTDN kurulumu ve test kapıları (ayrı kapsam/onay)
→ aynı signer ile imzalı v4 APK/AAB + binary audit → kullanıcı Play kapalı
test yüklemesi/cihaz denemesi. Ödeme kapıları hazır değilse gerçek satış
kapalı kalır; r13/v4 başarısı ödeme testi yerine geçmez.

Ayrıntılı bağımsız devam listesi:
[evde ödeme/r13/v4 devir bölümü](CODEX_HANDOFF_R13_V4.md#11-evde-devam--ödeme-paneli-r13-ve-v4-7-ekim).
Aşağıdaki eski tamamlanma/bekleme ifadeleri bu en üst kayıtla birlikte okunur.

## Son tamamlanan — canlı reklam sunucu tarafında açık / r13 ve imzalı v4 bekliyor

Kullanıcının açık talebiyle **mevcut r12 imajında yalnız reklam rollout ayarı
`live` yapıldı**. SSV1, Android rewarded birimi doğru, test oyuncu listesi
boş, sahte reklam/ödeme test kipleri0. UMP/child-safe-v1/SSV/kalıcı sonuç/
tek ödül korumaları kaldırılmadı. Eski protokol ve web istemcisi reklam
yetkisi alamıyor. Gerçek ödeme açılmadı. **r13 kaynak/imaj geçişi yapılmadı.**

R2 systemd `gridshard-admob-live-20261007-r2.service` **Result=success /
ExecMainStatus0 / active-exited / AD_LIVE_ACTIVATION_PASSED**. Aynı image
`sha256:39645c83dcc8e5fa689112e9942c4d4dd106fceb04897e906c26149d9ffd86d8`,
aynı dört Compose katmanı/env (yalnız rollout farkı)/mountlar. Dört private
secret mount read-only. Kalıcı satır fingerprint/sayıları halka tekrar
açılmadan önce birebir; son audit **12 profil / 12 kimlik / 65 savaş**, tüm
kalıcı tablo sayıları yedek öncesiyle aynı, pending0/kritik log marker0.
DB restore, silme, oyuncu hesabı veya ekonomi işlemi yapılmadı.

Yeni çevrimdışı yedek
`/var/backups/gridshard-production/20261007-before-admob-live-r12-r2`,
**217726 byte**, SHA
`1569f58651372c8897ca97207323b8dd2d67281f05cbda8d9715b8807ce8e8b2`;
aynı kurulum/sayılar/SHA ve bağımsız `pg_restore --list` doğrulandı.
Yedek dizini0700, dump/manifest0600; dump repo/iş bilgisayarına taşınmadı.
R1'in ayrı yedeği/logu ve root0600 eski .env geri dönüş kopyaları korunur.

**34 iç sağlık kontrolü + iş bilgisayarından 331.302s / 34 bağımsız HTTPS
kontrolü geçti**, unsigned SSV403. AWS urllib dış isteği Cloudflare403
aldığından bağımsız dış kontrol bu makinede yapıldı; Cloudflare/WAF/DNS
değiştirilmedi. Dış kanıt root0600, olmadan R2 başarı yazamaz. Son bağımsız
salt-okunur audit başarılı. Yerel kişisel-verisiz makbuz:
`artifacts/admob-readiness-20261007/live-activation-final-audit.json`.
Operatör root0500 SHA
`4a1f402b4a680b121bed0a417f7ab15475d2d85f9f20e218b230b27aed905386`;
14 saf ayar/witness testi geçti. Önceki R1 başarısız denemesi aşağıda kayıtlı.
Yerel monitor session46239 tamamlandı/exit0; bekleyen exec yok.

Bu **sunucu canlı ayar doğrulamasıdır**, gerçek Android reklam gösterimi,
Google SSV ödülü veya AdMob tam sunum onayı değildir. Panel son kullanıcı
ekranında sınırlı sunum; doluluk garantisi yok. Kendi gerçek reklam trafiği
üretilmedi. Kaynak versionCode4 hazır, fakat **imzalı APK/AAB üretilmedi**:
kullanıcı evdeki aynı upload anahtarına şu an erişemiyor; işte JDK/SDK ve
özel audit dosyaları da eksik. Anahtar/parola taşınmadı, yeni anahtar yok.

**Sırada:** kullanıcı commit/push + güncel CI → r13 yalıtılmış imaj/smoke/
yedek-restore ve canlı ön kontrol → r13 geçişinden hemen önce ayrı onay →
veriyi koruyan geçiş → evde aynı upload anahtarıyla v4 build/binary audit →
kullanıcı Play kapalı teste yükler. R13 özel ortamı mevcut r12'nin **live**
ayarını korumalı; eski devirdeki reklamı kapatma notları artık geçerli ürün
kararı değil. Yeni imaj geçişi, r13'ün yeni arayüzü ve fiziksel cihaz/ödül
doğrulaması tamamlandı diye sunulmaz. Commit/push yapılmadı.

## Son devam — canlı reklam açma işi başlatıldı (sonuç bekleniyor)

**R1 sonucu / R2 takip:** R1 yeni yedeği doğruladı ve live ayarını uyguladı,
fakat AWS'den Cloudflare dış sağlık isteği403 verince otomatik olarak aynı
imajda disabled'a döndü; DB restore yapılmadı. Son salt-okunur denetim API
healthy/disabled, iş bilgisayarından HTTPSok; AWS urllib isteği403. WAF/DNS
değiştirilmedi. İlk yedek217726byte, SHA
`824417df7b696b448c511998f918479b7f499be163a7ae82c45040ee984d8c73` ve
R1 script/job/log korundu. R1'in başarısızlığı canlı reklam açıldı diye
sunulmamalı.

R2 operatör root0500 SHA
`4a1f402b4a680b121bed0a417f7ab15475d2d85f9f20e218b230b27aed905386`,
`/opt/gridshard/operators/admob-live-20261007-r2/activate-live.py`, systemd
`gridshard-admob-live-20261007-r2.service` başladı. Son dry-run tekrar
12profil/12kimlik/65savaş/idle0/pending0; **14 saf env/health-witness testi
geçti**. Yeni yedek ayrı `20261007-before-admob-live-r12-r2` adı kullanır.
R2 en az330s/34 iç health, iş bilgisayarından en az330s/34 HTTPS health ve
unsignedSSV403 kanıtı olmadan tamamlanmaz. Dış kanıt root0600
`external-health.json`; gelmez/başarısız olursa disabled'a geri döner.
Yerel bağımsız denetim `artifacts/admob-readiness-20261007/external-health-r2.ps1`
exec session46239 içinde sürüyor; tamamlanmış sonucu alınmalı. **R2 sonuç
makbuzu ve son audit henüz bekleniyor; tamamlandı denmez.**

Kullanıcı yeni ağın SSH /32 iznini ekledi. Git/OpenSSH keyscan ile ED25519
`SHA256:mUVfmM7mNK+USvleLKEHIfYfOQQLP0UOVWGaSL7teTo` birebir eşleşti;
ignored host kaydı sabitlendi ve sıkı SSH doğrulamasıyla giriş yapıldı.
Canlı r12 API sağlıklı, **12 profil / 12 kimlik / 65 savaş**, pending0,
aktifPvP0/socket0. Gerçek ortam **SSV1 / rollout disabled / test kipleri0**;
Android birimi doğru, test listesi boş, PGS/review secrets yerinde.
R12 image ID `sha256:39645c83dcc8e5fa689112e9942c4d4dd106fceb04897e906c26149d9ffd86d8`;
production + cloudflare + play-games + play-review dört Compose katmanı.

Kullanıcının bu turdaki açık canlı reklam talebi kapsamında **yalnız ayar
değişimi** başlatıldı; r13 imajı veya yeni kaynak aktarılmadı. Özel operatör
root0500 SHA `b33108a85bb60de46e76b20792819e62873a13f6f0443e0983280e3b6e7fef4a`,
`/opt/gridshard/operators/admob-live-20261007-r1/activate-live.py`; systemd
`gridshard-admob-live-20261007-r1.service`. Yedi saf ayar/red testi geçti;
son salt-okunur ön deneme geçti. Reklam/SSV ve callback/claim kodu mevcut
test edilmiş kaynakla eşleşir (ilk hash farkı CRLF/Windows stdin kodlaması;
LF/UTF-8 karşılaştırmasıyla giderildi). Özel .env root0600.

İşin kapsamı: aktif oyuncu yokken API/Caddy kısa duruşu → yeni özel yedek
`/var/backups/gridshard-production/20261007-before-admob-live-r12` → aynı
kurulum/sayılar/SHA/0700/0600/bağımsız pg_restore--list → yalnız özel .env
rollout=live → aynı imaj/env/mountlar ve kalıcı kayıtları yeniden açmadan
önce eşleştir → Caddy aç → en az330s/34 iç+dış sağlık kontrolü → unsigned
SSV403. Hata olursa eski disabled ayarı/imajla açar, DB restore yapmaz.
**Şu an tamamlandı denmez:** systemd sonucu, güvenli JSON stage satırları ve
root0600 `result.json` takip edilmeli. Ham .env/backup/private log basılmaz.
Gerçek reklam gösterimi/Google SSV ödülü test edilmedi; v4 imzalı paket yok.

## Son devam — işte imzalı v4 / canlı reklam için güncel engeller

**Yeni Wi-Fi sonrası son kontrol:** Kullanıcı ağını değiştirdi. HTTPS
`/health` yeniden `ok / 2.1.0-beta.72`; TCP 22 artık erişilebilir. Buna
rağmen hem keyscan hem kimlik doğrulamasız sıkı SSH denemesinde bağlantı
sunucu banner/host anahtarı alınmadan `Connection reset` ile kesildi.
Özel anahtar kullanılmadı, bilinmeyen anahtar kabul edilmedi, giriş veya
uzak komut çalıştırılmadı. Yeni ağın dış IPv4'ü doğrulandı (bu açık dosyaya
yazılmaz); mevcut güvenlik grubundaki SSH /32 kaynakları ile karşılaştırma
gerekiyor. Kaynağın eksikliği olası, henüz kanıtlı neden değil. Aşağıdaki
MEB engeli ve TCP erişimsizliği önceki ağa aittir; güncel sonuçla
karıştırılmamalı. Reklam rollout'u hâlâ uygulanmadı.

Kullanıcı bu bilgisayarda imzalı v4 üretmek ve kapalı testte gerçek savaş
sonu reklamını açmak istedi. Bu, reklam rollout'unu güvenli kontrollerden
sonra açma yetkisidir; reklamı açmak için aynı soru yeniden sorulmamalı.
Tam r13 imaj geçişinin hemen öncesindeki ayrı onay/yedek/veri koruma
kuralları ve gerçek ödeme kapalı kararı korunuyor.

Kullanıcı sunucu adresinin değişmediğini teyit etti; adres bu herkese açık
dosyaya yazılmadı. Tekrar salt-okunur TCP 22 kontrolü başarısız. Son HTTPS
istekleri bu iş ağında açıkça `MEB Erişim Engeli`, kategori `games` yanıtı
verdi. Önceki başarılı `/health` yanıtı bu son ağ kontrolünün sonucu gibi
sunulmamalı. SSH bağlantısı/host anahtarı doğrulaması tamamlanamadı; canlı
ortam, reklam rollout'u, güvenlik grubu veya sunucu verileri değiştirilmedi.
SSH sorununun yalnız güvenlik grubundan kaynaklandığı kanıtlanmış değil.
Kurumun izin verdiği bağlantıda tekrar kontrol ve güncel SSH gelen kuralları
gerekir; `Her yer` kuralı veya ağ kısıtını aşan proxy kurulmaz.

Kullanıcı mevcut upload anahtarına şu anda erişemediğini bildirdi.
`secrets/android-release/gridshard-upload.p12` burada yok. İmzalı v4 henüz
üretilemez; yeni upload anahtarı oluşturulmadı veya anahtar sıfırlanmadı.
Mevcut özel anahtar ve parolası güvenli yerel erişimle sağlanmalı veya
paket evde üretilmeli; DPAPI kaydı farklı Windows hesabında açılmaz.

İş/ev yol bağımlılığı giderildi: `tools/android-toolchain.ps1` yerel JDK
21+ ve SDK platform 36/build-tools 36.0.0'ı açık parametreler/ortam/default
kurulum yollarından çözer; Java 8 veya eksik SDK ile durur. Build ve binary
audit betikleri bu çözücüyü kullanır; build özel upload anahtarı/yerel DPAPI
yoksa web varlıklarını yeniden üretmeden durur. Araçlar kurulmadı, sistem
PATH'i değiştirilmedi. `tools/tests/test_android_toolchain.py`: **4/4 geçti**
(Windows sandbox temp izin engelinden sonra normal Windows izinlerinde).
Üç PowerShell dosyasının syntax kontrolü geçti. Mevcut audit'in özel review
vault ve public sertifika dosyaları burada da eksik; bu kontroller atlanmaz.

Sıradaki iş: izinli ağ + sıkı host anahtarı kontrolüyle salt-okunur sunucu
ön kontrolü; r13 geçiş kapılarını tamamla; kullanıcı tarafından istenen canlı
reklamı yalnız özel operatör ayarında aç, UMP/SSV/tek-ödül korumalarını tut.
AdMob `Sınırlı reklam sunumu` tüm reklamların engellendiği anlamına gelmez,
ama gerçek reklam doluluğu garanti değildir. Aynı upload anahtarı erişilebilir
olunca yerel JDK/SDK hazırlığı, v4 imzalama ve tam binary audit yapılır.

## Son devam — reklam akışı düzeltildi / v4 kaynak hazırlığı

7 Ekim, kullanıcı `devam et` dedi; önceki AdMob hazırlığının teknik kısmı
uygulandı. `client/src/app.js` içinde tamamlanan canlı reklam için RAM'de
savaş kimliğine bağlı bekleyen talep tutuluyor. SSV veya bağlantı gecikince
`ÖDÜLÜ KONTROL ET` yeniden reklam açmadan talebi yineliyor; başarıda işaret
siliniyor. `ÖDÜL DOĞRULANIYOR…` ayrı bekleme durumu. Reklam kipinin karar
anı sabitlendi; test sırasında panel yanıtı değişse bile test reklamından
gerçek ödül talebi çıkmaz. Erken kapanma/native hata işaret oluşturmaz.
Bu RAM işareti yalnız açık profil oturumunda yaşar, yeniden açılışta kaybolur
ve hiçbir zaman ödül kanıtı sayılmaz. SSV ve kalıcı savaş sonucu zorunlu,
aynı savaşın ödülü bir kez; kupa/takım puanı ikiye katlanmaz. Türkçe ve
İngilizce yeni metinler eklendi.

Doğrulama:

- Tam istemci Node test paketi **246/246 geçti** (reklam alt kümesi 32/32).
- Sunucu reklam rollout/SSV/kalıcı savaş ödülü/bütünlük alt kümesi Linux
  Python 3.12 ve yalıtılmış gerçek PostgreSQL 17 üzerinde **73/73 geçti**.
  Yerel imza fixture'ı kullanıldı, Google'a gerçek reklam isteği gönderilmedi.
  Yeni production-strict test gerçek oturum doğrulamasını kullanır: oturumsuz
  401, başka oyuncu 403, SSV yokken 422; callback tek kez saklanır ve tek
  başına bonus vermez. RAM profil/progression önbelleği boşaltılınca ödül
  kalıcı kayıttan bir kez verilir; yeni request_id ile tekrar bakiye artırmaz.
- Web derleme sözleşmeleri **9/9 geçti**, release_guard ve JS syntax geçti.
  Windows sandbox temp rename engeli yüzünden build testinin ilk koşusu
  hata verdi; aynı test normal Windows izinlerinde geçmiştir. Önceki
  sunucu Windows koşusunun yarım kalması bu Linux sonuçlarıyla giderildi.
- Yerel web `dist/` paketi başarıyla üretildi; build_id `6989184f47fa786e`.
  `git diff --check` temiz. Tam r13 imaj smoke/backup/restore, gerçek Android,
  gerçek Google SSV ve canlı ödül bu tur denenmedi.

`config/android-production.json` ve `android/app/build.gradle` **versionCode
4** için güncellendi; sürüm adı `2.1.0-beta.72`. **APK/AAB imzalanmadı veya
yüklenmedi.** Reklam rollout/SSV özel ortamı, gerçek ödeme, canlı sunucu,
AdMob/Play/Cloudflare paneli değiştirilmedi. Commit/push kullanıcıda.
Diğer AI'nın checkpoint dosyasına dokunulmadı.

Yeniden başlatılabilir yayın notu: `docs/REWARDED_AD_LAUNCH.md`.
`CODEX_HANDOFF_R13_V4.md` hâlâ r13 geçiş/yedek/rollback adımlarının kaynağı;
oradaki reklamı kalıcı kapalı tutma kararı 7 Ekim kullanıcı talebiyle
değişti; yukarıdaki son mesaj reklam açma yetkisini açıkça verir. Tam r13
imaj geçişinin hemen öncesindeki ayrı onay şartı değişmedi. AdMob sınırlı sunumu
toplam yasak değildir; mağaza ilişkilendirmesi/full serving onayı yok ve
doluluk garantisi verilemez. Testler kendi gerçek reklam trafiğini üretmez.
13+ herkes yetişkin demek değildir; mevcut UMP/G/NPA/izin korumaları korunur.

Sırada: kullanıcı commit/push → CI kontrolü → r13 yalıtılmış imaj doğrulama
ve canlı salt-okunur ön kontrol → yeni açık canlı geçiş onayı → taze,
doğrulanmış çevrimdışı yedekle geçiş → aynı upload anahtarıyla imzalı v4
üretim/binary denetimi → native güvenli reklam testi → kullanıcı Play'e
yükler. İş bilgisayarında beklenen Android Java/SDK, upload anahtarı/DPAPI
ve r12 özel betik/known_hosts kayıtları bulunamadı; evde devam veya araç/
aynı anahtarın güvenli aktarımı için kullanıcı seçimi gerekir. Yeni upload
anahtarı üretilmez, evdeki DPAPI kaydı başka Windows hesabında kullanılamaz.

## Son devam — savaş sonu reklam açma isteği / AdMob mağaza kapısı

**7 Ekim, doğrudan kullanıcı kararı:** Son sürüm ve kapalı testten önce
savaş sonu ödüllü reklamı etkinleştirmek istiyor; Play hedef kitlesinin
13 yaş ve üzeri seçildiğini yeniden teyit etti. Önceki reklamı kapalı
tutma notları artık kalıcı ürün kararı değildir; açma hazırlığı kapsamda.
Bu karar gerçek ödemeyi açma, gizlilik/yaş korumalarını kaldırma veya
doğrulanmamış canlı geçiş yapma yetkisi değildir.

AdMob genel bakış ekranı `İnceleme gerekli`, istek ve gösterim 0.
Mevcut uygulamaya mağaza ekleme ekranında `com.gridshardgame.app`
arandı; kullanıcı sonuç çıkmadığını bildirdi. Dahili test katılım
bağlantısı mağaza kaydı yerine kullanılamaz. Yanlış uygulama veya
yayınlanmadığı başka mağaza seçilmemeli; mevcut AdMob uygulaması ve
ödüllü reklam birimi yeniden oluşturulmamalı. Mağaza eşleşmesi,
app-ads.txt doğrulama durumu ve AdMob hazırlık incelemesi hâlâ dış kapı.
Bu oturumda panel ayarı, sunucu rollout veya reklam ödülü açılmadı.

**Yeni ekranla düzeltme (7 Ekim, 13950 ekranı):** Tüm uygulamalar
satırında `İnceleme gerekli` yanında `Sınırlı reklam sunumu / Limiti
kaldırmak için mağaza ekleyin` ve bir etkin reklam birimi görülüyor.
Bu durum tüm reklamların engellendiği anlamına gelmez; yayınlanmamış
uygulama onaya kadar sınırlı sunum alabilir (Google'ın 9989980 yardım
sayfası). Önceki `gerçek reklam ancak Hazır sonrası açılabilir` ifadesi
mutlak teknik kısıt olarak kullanılmamalı. Tam sunum/inceleme için
mağaza bağı ve doğrulamalar gerekir; sınırlı durum reklam doluluğu
garantisi değildir. Geliştirme testleri test reklamı/doğrulanmış test
cihazıyla yapılmalı. Bu yeni bilgi canlı rollout'u kendiliğinden açmadı;
SDK, rıza, imzalı ödül ve canlı geçiş doğrulama kapıları korunuyor.
https://support.google.com/admob/answer/9989980?hl=tr

**app-ads.txt ekranı (7 Ekim, 131525):** Panel `Henüz app-ads.txt
dosyasının uygulandığı reklam isteği yok` diyor, tablo boş. Bu dosyanın
yok veya bozuk olduğu kanıtı değil. Aynı tur salt-okunur canlı HTTPS
kontrolünde `https://gridshardgame.com/app-ads.txt` HTTP 200,
`text/plain; charset=utf-8`, mevcut yayıncı satırı birebir eşleşti.
Bu HTTP kontrolü AdMob tarafından doğrulandı demek değil. Google
tarayıcısı geliştirici web sitesini mağaza girişinden bulur; destek/
geliştirici web sitesi `https://gridshardgame.com/` olmalı (gizlilik
politikası bağlantısı bu alanın yerine geçmez). Mevcut 0 istek ve eksik
mağaza eşleşmesiyle boş ekran uyumlu; yeni dosya/app/domain kurulmadı.
https://support.google.com/admob/answer/9776740?hl=en

Kaynak incelemesi: native köprü, UMP, release/debug kapısı, imzalı SSV
ve tek-savaş ödülü zaten var; rollout `disabled`/`test`/`live` ayrımı
mevcut. 13+ hedefi her oyuncunun yetişkin/rıza verebilir olduğunu
kanıtlamaz; mevcut G-dereceli kişiselleştirilmemiş ve bilinmeyen yaş
korumaları kaldırılmadı. Yerel üç reklam istemci dosyasında 25/25 test
geçti (mock/statik); gerçek cihaz, gerçek reklam ve gerçek SSV ödülü
kanıtı değildir. Sunucu testleri ilk koşuda sandbox geçici dosya izin
hatasıyla toplanamadı; ayrı workspace runtime ile tekrar başlatıldı,
tamamlanmayınca yalnız o pytest oturumu durduruldu. Sunucu test paketi
bu tur geçti diye raporlanmamalı. Uygulama kaynak kodu değiştirilmedi.

İş bilgisayarı güncel hazırlık kontrolü: Docker motoru 29.8.2 çalışıyor
(sandbox dışındaki salt-okunur `docker version` ile doğrulandı); önceki
devirdeki `Docker kapalı` kaydı güncel değil. EC2 anahtarı mevcut, fakat
beklenen r12 yayın/known_hosts kayıtları, Android upload anahtarı ve
DPAPI kaydı burada bulunamadı. Derleme betiğinin beklediği Java/Android
SDK ve bunları gösteren ortam ayarları da bulunamadı. Sunucu kaynak ve
doğrulama hazırlığı burada mümkün; imzalı v4 için araçlar ile aynı
upload anahtarının güvenli aktarımı veya evde derleme gerekir. Yeni
imza anahtarı üretilmez; parola sohbete veya Git'e yazılmaz.

HEAD bu oturum sırasında kullanıcı tarafından `53d3212` oldu; commit
başlığındaki `v4` derlenmiş/imzalanmış/yüklenmiş paket kanıtı değildir.
Sıradaki güvenli yol: r13/v4 hazırlığı ve kapalı test reklam onayını
beklemek zorunda değil; gerçek reklam açma ayrıca AdMob kapıları,
güncel SDK/cihaz doğrulaması ve canlı rollout kontrolüyle yapılacak.
Resmî kaynaklar 7 Ekim okundu:
https://support.google.com/admob/answer/10564477?hl=tr
https://support.google.com/admob/answer/10037806?hl=tr
https://support.google.com/admob/answer/14538460?hl=tr
https://support.google.com/admob/answer/9388275?hl=tr
https://developers.google.com/admob/android/privacy
https://developers.google.com/admob/android/ssv

## Son devam — iş bilgisayarı / Play Console kurulumu tamamlandı

**7 Ekim 2026, kullanıcı teyidi:** Kullanıcı iş bilgisayarında olduğunu,
diğer yapay zekâ aracıyla ilerlediklerini ve Play Console kurulumunu
tamamladıklarını bildirdi. Bu, kullanıcı teyididir; bu oturumda Console
ekranı görülmedi. Kapalı testin yayımlandığı, test kullanıcılarının
katıldığı veya üretime erişimin açıldığı sonucu çıkarılmadı.

`CODEX_HANDOFF_R13_V4.md` tamamen okundu; `CLAUDE_CHECKPOINT.md` güncel
devir bölümleri incelendi. Yerel HEAD `f8b24fe`; bekleyenler Claude
checkpoint değişikliği ve izlenmeyen devir notuydu. Codex uygulama kodunu,
bu iki dosyayı veya imza ayarlarını değiştirmedi; commit/push yapmadı.

Diğer aracın kaydına göre canlı sunucu r12, Play dahili test paketi
versionCode 3 (`2.1.0-beta.72`); hedef kitle kullanıcı kararıyla 13 yaş ve
üzeri. Bu oturumda canlı durum ve Play paketi bağımsız doğrulanmadı.
Önceki çocuk yaş grubu niyetini anlatan bölümler tarihsel kayıttır;
güncel hedef kitle kararıyla karıştırılmamalı.

**Devam sırası:** İş bilgisayarında kapalı test kanalının güncel ekranı
üzerinden ülke/test kullanıcıları/sürüm durumu netleştirilebilir. Sunucu
r13, yeni imzalı Android paketi (önerilen versionCode 4) ve güncel site
paketi ev bilgisayarında hazırlanacak. Önce devir notundaki yerel
betikler ve kayıtlar okunacak; canlı geçiş için yeni açık onay, paket
üretimi için kullanıcı talimatı alınacak. Kaynak değişikliği yayımlanmış
ürün veya tamamlanmış yasal uygunluk sayılmaz. Gerçek reklam/ödeme kapalı
kalacak; oyuncu ve inceleme hesabı verilerine dokunulmayacak.

## Son devam — Veri türleri / e-posta ve telefon kapatma kapsamı

6 Ekim11:50 screenshot'ta Kişisel bilgiler altında yalnız E-posta seçili;
kullanıcı diğer AI ile telefon/e-posta girişini kapattıklarını belirtti.
Güncel kaynakta onboarding e-posta ve iletişim bağlama UI kaldırılmış;
main.py verification/request ve confirm422 CONTACT_BINDING_CLOSED_MESSAGE
veriyor. Fakat client/index.html account-recovery-identifier hâlâ
doğrulanmış e-posta/telefon alıyor; app.js kurtarma isteği ve
platform_services.request_recovery yolu duruyor. Google/Apple OAuth
scope/email saklama yolu da kaynakta var; PGS verified_subject yalnız
oyuncu kimliği döndürüyor. Normal iletişim bağlama kapalı olması tüm
e-posta/telefon aktarımı kapalı demek değil. Mağaza paketi ve backend
birlikte doğrulanmadan bu veri türlerini kaldırmayın. Yeni UI/backend
değişikliklerinin canlı/pakette uygulanmış olduğu bu tur doğrulanmadı.
Kişisel bilgiler için Ad (takma ad dahil) ve Kullanıcı kimlikleri gerekli;
diğer kişisel kategoriler için yeni kanıt yok. Google veri türleri
tanımı6Ekim tekrar okundu. Bu tur kaynak kodu değiştirilmedi; mevcut
diğer AI sohbet/child değişiklikleri kaynakta görülmüş olsa da eski
09:34 ön denetimi veya yayın/hukuk kapıları tamamlandı sayılmadı.

## Son devam — Play Veri güvenliği / ilk sayfa taslağı

6 Ekim kullanıcı Veri toplama ve güvenlik ekranını paylaştı ve birlikte
doldurmayı istedi. Screenshot'ta veri toplama/paylaşma ilk sorusu Evet,
şifreleme ve hesap yöntemleri boş. Kaynak eşleştirme önerisi: ilk soru
Evet; üretim HTTPS/WSS ve cleartext-kapalı yapılandırmasına göre aktarım
şifrelemesi Evet; hesap yöntemleri OAuth (Play Games/Google) ve Diğer
(kalıcı misafir profili, cihazda güvenli üretilen anahtarla doğrulama).
Diğer açıklaması için kullanıcı parola belirlemediğini belirtin. Normal
oyuncunun kullanıcı adı/parola kayıt akışı yok; inceleme demo erişim
şifresi normal hesap oluşturma yöntemi sayılmadı. Hesap oluşturmaya izin
vermiyor seçeneği doğru değil. Bağımsız güvenlik değerlendirmesi/UPI
rozetleri için kanıt yok; seçilmemeli. Bunlar **öneri/taslak**; kullanıcı
henüz seçim/İleri/Kaydet teyidi vermedi. Agent Console'a işlem yapmadı.
Bir sonraki ekranda veri türlerini gerçek dağıtılan paket/SDK davranışı
ile eşleştirin; gerçek reklam/ödeme kapalı olması SDK veri toplamaz
demek değil. Hedef kitle yasal onayı bu formdan çıkarılmaz.
Bu tur kaynak manifestinde FCM auto-init ve Firebase analytics false
satırları görüldü; bunlar diğer çalışmanın değişiklikleri olabilir,
önceki09:34 raporunu tüm çocuk güvenliği tamamlandı diye yorumlamayın.
Google Veri güvenliği ve hesap silme rehberleri6Ekim okundu:
https://support.google.com/googleplay/android-developer/answer/10787469
https://support.google.com/googleplay/android-developer/answer/13327111

## Son devam — sınırlı çocuk-kitle denetimi / başka araca güvenli devir

6 Ekim kullanıcı çocuk-kitle denetimini onayladı; haftalık hakkın bitmesi
halinde başka AI aracına aktarılabilir kayıt istedi. Bu tur davranışsal
çocuk-güvenliği kodu veya canlı değişiklik başlatılmıyor; salt-okunur
denetim ve rapor hazırlanıyor. Ana kayıt: `docs/CHILD_AUDIENCE_AUDIT.md`.
Hesap kontrolünde haftalık %97 kullanılmış/%3 kalmış; sıfırlanma
10 Ekim 2026 00:14:06 TR. Kalan yüzden kesin iş miktarı çıkartılmaz.
09:34 TR kaynak ön denetimi tamamlandı: serbest takım/DM zincirinde
çocuk güvenlik hatırlatması/yetişkin yönetimi doğrulanmadı; server kimlik
ve arkadaş/engel kontrolleri bu denetimin yerine geçmiyor. Analitik default
kapalı ve push isteğe bağlı, fakat çocuk izin/SDK soğuk-açılış veri davranışı
açık. Reklam TFUA/TFCD/G/NPA kaynağı, Android kaynak manifest izin kaldırma
ve Google25.4.0 sürümü incelendi; resmî Families listesi19.0.0+ içeriyor.
`node --test client/tests/native-ad-consent.test.js`:16/16 geçti; mock
testidir, gerçek çocuk cihaz/paket/hukuk kanıtı değildir. Rapor net bulgu,
altı adımlı uygulama planı, kabul testleri ve diğer AI'ya aktarım talimatı
içeriyor. Sıradaki iş kullanıcıyla çocuk/unknown sohbet–DM/yetişkin yönetimi
kapsamını belirlemek; yeni kod için yetki alınmalı. Tam uyum veya yayın
tamamlanmadı. AWS/Cloudflare/Gmail/Play ayarı/build/deploy yapılmadı.
Kullanım belgesi limit aktif turda dolarsa adil kullanım sınırlarıyla
devam edebileceğini söylüyor; garanti veya otomatik yeni tur varsayılmaz.
Rapor/kontrol noktası kullanıcı commit/pull işlemine dahil edilmeli;
diğer AI'nın dirty performans/UI değişiklikleri korunur. Çocuklarla
ilgili yasal uyum kutusu hâlâ doğrulanmış/onaylanmış sayılmaz.

## Son devam — çocuk hedef kitle seçildi / yasal uyumluluk beyanı henüz doğrulanmadı

**6 Ekim09:23TR Uygulama ayrıntıları ekranı:** Kullanıcı Hedef yaş adımı
tamamlanmış, ikinci adım açık screenshot paylaştı. “Bu uygulamanın (tüm
API'ler, SDK'lar ve reklamlar dahil) çocuklarla ilgili tüm geçerli yasalara
ve yönetmeliklere uyduğunu onaylıyorum” kutusu **boş**; COPPA/GDPR örnekleri
var. Bu kutuyu otomatik işaretleme veya tüm çocuk uyumu tamam demek için
kanıt yok. Önceki9–12 dahil hedef kitle niyeti korunur; işi kolaylaştırmak
için13+/18+ olarak değiştirme önerilmez.

Dar salt-okunur kontrol: native-store.js22–30 tüm/unknown istekler için
TFUA/TFCD/G korumasını gösteriyor ve incelenmiş karma yaş akışı olmadığını
açıklıyor. STORE_PURCHASES çocuk-kitle notunda tarafsız yaş akışı, SDK/paket,
sosyal/PGS/veri paylaşımı denetimleri açık kapı olarak kayıtlı. Gizlilik
metni hesap/cihaz kaydı, takım sohbeti ve özel mesajları açıklıyor. Bu
önlemler tek başına COPPA/GDPR veya Families uyumunu kanıtlamaz. Kaynak
kelime taraması tüm app/SDK davranışını doğrulamaz; bu tur yeni paket,
gerçek çocuk hesabı/veri veya ebeveyn akışı test edilmedi.

**Şimdiki devam kapısı:** Bu onay kutusunu işaretlemeden çocuk kullanıcı
giriş/veri, sosyal güvenlik-yetişkin kontrolleri ve gerçek reklam/SDK
yapılandırması denetimi tamamlanmalı. Yasal uygunluk gerekirse uzmanla
değerlendirilir; teknik inceleme tüm mevzuata sertifika değildir. Yeni
çocuk-güvenliği kaynak/UX değişikliği için kullanıcı yönü alınmalı;
yalnız Console screenshot gönderimi geniş uygulama değişikliği yetkisi
değildir. Agent checkbox/İleri/Kaydet, kaynak build/deploy veya diğer AI
dosyalarında değişiklik yapmadı. Resmî Families rehberi6Ekim okundu:
https://support.google.com/googleplay/android-developer/answer/9893335?hl=tr

### Önceki teyit — inceleme erişimi ve karma hedef kitle niyeti

**6 Ekim 2026 09:15 TR, iş bilgisayarı:** Kullanıcı dün akşam evde Uç
profilinden demo oturuma geçtiğini, demo profilinde premium ve ödeme yapmadan
erişim sağladığını, ardından önceki Uç profiline sorunsuz döndüğünü bildirdi.
Play Console'da premium/ücretli içerik dahil tam erişim sağlandığı beyanını
işaretleyip kaydettiğini teyit etti. Bunlar **kullanıcı cihaz/Console teyididir**;
bu tur yeni bağımsız native UI, kurulu versionCode, her premium ödül işlemi,
cüzdan veya uygulama yeniden açılışı testi yapılmadı. Önceki demo/native
kapılarında kullanıcının artık teyit ettiği premium/ücretsiz erişim ve Uç'a
geri dönüş bekliyor sayılmamalı; kapsam dışı kontroller geçmiş kanıtıyla ayrılır.
Gerçek reklam/ödeme veya herkese üretim yayını yetkisi çıkartılmaz.

**6 Ekim09:21TR hedef kitle teyidi:** Kullanıcı ekranı paylaştı; henüz kutu
seçilmemiş, ESRB uyarısı nedeniyle5yaş ve altı /6–8 seçenekleri kapalıydı.
“9–12 yaş grubunu da gerçekten hedefliyor muyuz?” sorusuna **“hedefliyoruz”**
dedi. Önceki genel kitle niyetiyle birlikte Console'da seçilecek gruplar:
**9–12,13–15,16–17,18 yaş ve üstü**. Yalnız niyet teyit edilmiştir; kutuların
işaretlendiği/İleri/Kaydet veya Google onayı henüz görülmedi. Sıradaki iş bu
gruplarla İleri ve açılan Uygulama ayrıntıları/reklam ekranını paylaşma.
Çocuklar-only veya yetişkin-only kabulü yapılmaz;5–8 grupları eklenmez.
Bu beyan içerik derecelendirme anketinden ayrıdır. Çocuk yaş grubunu dahil
etmek Families/reklam/veri/sosyal özellik uyumunu ayrıca gerektirir; yerel
korumalı reklam etiketleri tek başına uyum kanıtı değildir. Tarafsız yaş
ekranı, reklam SDK/çocuk koruması ve sosyal güvenlik soruları gerçek uygulama
durumuna göre yanıtlanmalı; mevcut olmayan özelliğe “var” denmemeli. Bu
niyet onayı uygulama kaynak değişikliği, gerçek reklam açma veya genel yayın
yetkisi değildir. Resmî rehber6Ekim okundu:
https://support.google.com/googleplay/android-developer/answer/9867159?hl=tr

Bu tur yalnız mevcut checkpoint/not ve resmî rehber incelendi; diğer AI'nın
devam eden performans/UI dosyaları korunur. Oyun build/deploy/restart,
Play/Cloudflare hesap ayarı, demo sırları veya canlı oyuncu verisi değiştirilmedi.

## Son yetki — inceleme erişimini çalışır sürüme hazırlama

5 Ekim gece: Kullanıcı zorunlu tam erişim kutusu nedeniyle “ne yapmamız
gerekiyor ise yapalım” dedi. Bu inceleme erişimini tamamlamak için eşleşen
backend dağıtımı ve aynı Android anahtarıyla yeni versionCode 2 paketi artık
yetkilidir; aşağıdaki kaynak-yalnız sınırı tarihsel önceki aşamadır. Gerçek
reklam/ödeme açma, hesap sıfırlama ve üretime herkese yayın yetkisi verilmedi.
Diğer aracın sonradan tamamladığı müzikler bu sabit ara sürüme eklenmedi. Yeni özel Compose
katmanı `docker-compose.play-review.yml`; varsayılan dağıtım hâlâ kapalıdır.
Yerel izole PostgreSQL/Android imza ve canlı yedek/geri dönüş kapıları
tamamlanmadan tam erişim kutusu doğrulandı sayılmayacak.

Ara durum: aynı imza anahtarıyla **versionCode 2 APK/AAB üretildi**, APK/AAB
imzaları, 61'er web varlığının build ile eşleşmesi, HTTPS/normal manifest ve
inceleme sırlarının pakete gömülmemesi doğrulandı.
`artifacts/android-production-20261005-v2/` altındaki AAB SHA-256:
`389bdae5df6fbcedaf69bfe194f7ffd0cb6901ea1ff251badc79a7403cdd72b5`.
Build ID `2b56167427155dda`; bu, birleştirilmiş son kapalı test değil, inceleme
erişimi için **sabit kaynak anından üretilmiş ara dahili test paketidir**.
Başlayan yeni müzik WAV/türevleri bu anın dışında; diğer aracın yeni dosyaları
korunur, ara pakete eklenmiş sayılmaz. Play yüklemesi/telefonda versionCode 2
kurulumu bağımsız doğrulanmadı; aşağıdaki son kullanıcı giriş teyidine bak.

Yerel tam sunucu süiti, yeni loopback PG16 kümesiyle **1154 geçti /1 Redis
atlandı**; inceleme PostgreSQL commit/rollback ikisi de geçti. Takım test
fixture'ı yeni 3000 krediye geçtiği için eski 321→339 sabiti yalnız testte
dinamik başlangıç bakiyesi +18/+19 olarak düzeltildi. İstemci 203, araç 30,
güncel kaynak tarayıcı demo/geri dönüş dört boyut tekrar geçti. Yeni tek kullanımlık
PG test kümeleri yalnız kendi `artifacts/play-review-access/postgres-*` dizininde
çalıştı ve durduruldu; mevcut sistem/sunucu DB'sine bağlanmadı.

**Canlı r11 geçişi tamamlandı (5 Ekim 23:28 TSİ).** Yeni API image kimliği
`sha256:8dd93d8ed5e619d3dba8d281e435562c988fda403f7b51e776c13f2395cb55b4`.
Eski r10 API image geri dönüş için korunuyor:
`sha256:0726e9dfd3837a2f63622f0987dc1c25ec6a2d6a1e7f1c4bf519090cee5db65d`.
Kaynak ZIP SHA `f79354517beea86a7d5559a35509e89f12eb064522ecf96d37481416a224a4ad`;
ayrı PG17/Redis süiti **1152 geçti /1 host pg_dump atlandı**, Windows QA
raporları paket dışında olduğu için iki yerel kanıt testi uzak süitte ayrıca
hariç tutuldu (yerelde geçti, uzak sahte rapor oluşturulmadı). Gerçek bakım
container backup/restore ve demo-token restart kontrolü ile **330s izole soak geçti**.
Verifier tek dosya, UID10001/0400,
API read-only mount; parola/DPAPI kasası sunucuya gönderilmedi.

Canlı geçişte fresh offline backup/UUID/count/SHA/pg_restore-list, eski
profil/kimlik/takım satır özetleri eşitliği, mevcut volumes/PGS/auth-key/TLS ve
**330s HTTPS lease geçti**, kritik log işareti 0. Fresh yedek:
`/var/backups/gridshard-production/20261005-before-play-review-r11`.
Eski live DB geri yükleme/silme yok; gerçek reklam/ödeme/test modu kapalı kaldı.
Canlı HTTPS demo kontrolü: ayrı sunucu seçimi profil, iki cihaz kanıtı, tüm premium
kademeler/Savaş Premium, demo kredisiyle gerçek sandık alımı, premium ödül alma,
ödül korunarak cüzdan doldurma ve normal kayıtlı-cihaz refresh geçti. Gerçek ödeme
veya sahte billing receipt yok; DPAPI sırları yalnız bellekte kullanıldı.
Demo oluşturulduktan sonraki son kontrol de **11 eski profil, 11 kimlik ve tüm
takım satırları aynı**, yalnız 1 ayrı demo profil/kimliği eklendi. Kanıtlar:
`artifacts/play-review-access/server-receipts/{isolated-verification,deployment-receipt,review-account-preservation}.json`
ve `artifacts/play-review-access/live-api-verification.json`.

**USB cihaz kapısı:** Kullanıcı telefonu bağladı ve önceki Play giriş hatasını
yeniden denemeyi istedi. Bağlı cihaz `57abfae6`, model `25113PN0EG`; kurulu
`com.gridshardgame.app` **versionCode 1**, Play Store yüklemesi (4 Ekim 19:55).
Salt okunur APK imza kontrolü Play SHA-1
`7C:FD:F8:68:FE:78:6E:BA:DF:B0:3B:31:D8:E6:15:5B:05:55:B0:0F` ve SHA-256
`09:6A:CD:18:59:57:46:7C:B9:25:92:00:74:12:C3:19:B6:42:BA:3C:EE:C4:DB:CB:8E:D7:A6:48:21:3C:A0:E6`
ile eşleşti. Bu imza yerel upload-key APK'dan farklıdır: **USB APK install/uninstall
ve veri silme yapma; AAB'yi aynı dahili test kanalına yükleyip Play'den güncelle.**
Kullanıcı normal giriş denemesini bildirdi: Play Games hesabı bağlanıyor, ancak
**Uç** profili açılışta “Profil geri getiriliyor / Bağlantı tamamlanamadı” noktasında
kalıyor. Daha önce Ayarlar → Hesap/Gizlilik'te cihaz oturumlarını kapatmış; bu,
iş bilgisayarında düzeltilen aynı revoked-device bootstrap kilididir. Kurulu
Play APK'sının tüm paketlenmiş JS/HTML dosyaları salt okunur karşılaştırıldı:
**v1'de recovery endpoint/reauth gate/recovery dialog/openRecovery yok; v2'de hepsi var**.
Sunucu veya profil sıfırlama/hesap taşıma ile çözmeye çalışma. Gereken adım aynı
dahili test kanalından v2 güncellemesi ve gerçek bağlı Play Games hesabıyla yeni
yeniden-giriş dialog'unu kullanmak.

**Son kullanıcı teyidi — 5 Ekim gece:** Kullanıcı **“giriş tamam”** dedi; Uç
profiline normal Play Games geri giriş kapısı kullanıcı teyidiyle tamamlandı.
Aynı tur salt okunur ADB kontrolünde bağlı cihaz yok, bu nedenle yeni versionCode,
Play yüklemesi veya hangi yeniden-giriş adımının çalıştığı bağımsız doğrulanmadı.
Kullanıcı teyidini tüm native testler geçti olarak genelleme. Tekrar hesap taşıma,
oturum kapatma, uygulama kaldırma/veri temizleme yaptırma.
Ardından kullanıcı Ayarlar → Hesap ve Gizlilik'teki **REVIEW / DEMO SIGN-IN**
düğmesinin göründüğünü (**“görünüyor”**) ve özel demo girişi sonrası profilin
açıldığını (**“açıldı”**) teyit etti. Demo sırlarını kendi özel Windows
PowerShell penceresinde kasadan alması tarif edildi; AI parola/kullanıcı adını okumadı veya
sohbete yazmadı. Bu native demo girişinin kullanıcı teyididir; paket versionCode/
Play yükleme kanıtı veya premium/yeniden açılış/geri dönüş testi yerine geçmez.
**Sıradaki kapılar:** demo profilinde premium ödülü ödeme gerektirmeden alma,
demo cüzdanı/mağaza erişimi, uygulamayı yeniden açınca aynı demo ve
**RETURN TO PREVIOUS PROFILE** üzerinden aynı Uç'a dönüş. Bunlar henüz bekliyor.
Oturumu kapatılmış/revoke olmuş gerçek hesaba demo erişimiyle
yeniden yetki verilmez. Console tam erişim kutusu bu native kapıdan önce tamamlandı
sayılmaz. AAB yüklemesi bu tur bağımsız doğrulanmadı; herkese üretim yayını yapılmadı.

## Son yetkili iş — Google Play incelemeci/demo erişimi, yalnız kaynakta

**5 Ekim 2026 akşamı:** Kullanıcı diğer aracın başka işle meşgul olduğunu
belirtip güvenli, tekrar kullanılabilir Google Play incelemeci erişimini **Codex'in
uygulamasını açıkça istedi**. Önceki “bu Console turunda kaynakları değiştirme”
sınırı yalnız bu iş için kaldırıldı. **APK/AAB üretme ve sunucuya dağıtma yasağı
devam ediyor.** Diğer aracın mevcut takım/tutorial/UI değişiklikleri korundu;
geniş yeniden yazım, commit/push, Android sync/build, canlı hesap/veritabanı
değişikliği veya deploy/restart yapılmadı.

Yeni kaynaklar: `server/app/review_access.py`, `client/src/review-access.js` ve
`.css`; `auth.py`, `main.py`, `auth-session.js`, `index.html` için küçük entegrasyonlar.
`app.js` demo için otomatik kişisel hesap bağlantısı ve ilk-oyuncu eğitimini bastırır;
incelemeci eğitimi Ayarlar'dan elle başlatabilir. Normal oyuncu eğitimi korunur.
Günlük meta normal şekilde seçilir; gecikmiş açılış penceresi inceleme formunu örtemez.
`relay-client.js` yalnız `review-<32 hex>` kimlik sözdizimini de kabul eder.
Bu ek kabul sunucu giriş kanıtı değildir. Tarayıcı testinde eski `wt-`-yalnız
kontrolün demoyu yeniden misafire çevirdiği ve açılış hesabı penceresinin inceleme
formunun üzerine açıldığı yakalandı; ikisi düzeltildi ve gerçek düğme tıklamalarıyla
yeniden doğrulandı. Önceki oyuncu hesabı cihaz kanıtıyla ayrıca saklanır/geri açılır.

Varsayılan kapalı API: `/auth/review-session`. Yalnız API ortamında mutlak
`GRIDSHARD_PLAY_REVIEW_CONFIG_FILE` ayarı özel parola doğrulayıcısını açar.
Parola PBKDF2-SHA256/600000 saltlı özetle doğrulanır, sabit sunucu seçimi rastgele
ayrılmış `review-...` hesaba normal cihaz/JWT oturumu verir. Kimlik `devices`
JSON/JSONB içindeki özel işaret kalıcıdır; mevcut işaretsiz/başka sahibin hesabı
asla yükseltilmez. Premium sezon/Savaş Premium, tüm premium kademelere yetecek
sezon XP'si ve demo cüzdan tabanları yalnız bu demo profiline verilir. Mevcut
oyuncu adları/takımları/kupaları/paraları değiştirilmez; gerçek ödeme/receipt
doğrulaması veya normal giriş güvenliği kaldırılmaz. Demo kişisel provider/email
bağlantısı ve genel secret reset'i reddedilir; kapatma/rotasyon kayıtlı demo
cihazlarını ve tokenlarını da reddeder. İstemciye parola/sunucu sırrı gömülmez.

İngilizce işletim, doğrulama ve **482 karakterlik Console erişim metni**:
`docs/PLAY_REVIEW_ACCESS.md`. Yerel hazırlama aracı
`tools/new-play-review-access.ps1`; doğrulama aracı
`tools/check-play-review-access.js`. Ev PC'sinde
`secrets/play-review-20261005-vault/` altında ACL korumalı verifier ve Windows
kullanıcı/PC bağlı `credential.dpapi.xml` hazırlandı; ikisinin eşleşmesi sırları
çıktıya yazmadan doğrulandı. Git/Docker dışında. **Kasa farklı iş bilgisayarında
doğrudan çözülemez**; kullanıcı kendi şifreli parola yöneticisiyle taşımalı.
İlk sandbox DPAPI denemesi `secrets/play-review-20261005/` altında başarısız kaldı;
o dosyalar aktivasyon için **kullanılmaz**. Gerçek parola hiçbir sohbet/log'a yazılmadı.

Yerel kontroller: istemci **195/195**, araçlar **30/30**, sunucu tam süiti
**1117 geçti /38 atlandı**. Yeni inceleme erişimi odak süiti **15/15** geçti;
JSON backend soğuk yeniden açılışında demo adı/kupası/alınmış ödülü korundu.
Yeni PostgreSQL commit/rollback testleri yerel izole DB olmadığı için **2 atlandı**;
canlı PostgreSQL doğrulaması iddia edilmez. Gerçek kaynak uygulama + ayrı geçici
loopback API ile 1280×900,393×852,320×740,740×320: görünür İngilizce giriş,
yeniden açılışta aynı demo, sunucudan premium hakları/tüm kademe erişimi ve
orijinal misafire dönüş geçti. Son tekrar açılış katmanının ve gecikmiş günlük
meta seçim penceresinin bitmesini bekler; profil terminali → Ayarlar → Hesap ve
Gizlilik → demo → geri dönüş gerçek görünür düğmelerle doğrulandı. İlk-oyuncu
eğitiminin demo erişimini örtebildiği ek durum yakalanıp yalnız demo için düzeltildi.
Takılan kaynak testlerinin yalnız kendilerine ait geçici API/tarayıcı süreçleri
kapatıldı; son dört boyut testi başarıyla tamamlanıp kendi süreçlerini kapattı.
Sırrı maskeleyen ekranlar
`artifacts/play-review-access/layout/` altında, Git dışında. Test verileri yalnız
ayrı OS temp alanlarında; gerçek kullanıcı/sunucu/Google servislerine erişilmedi.

**Sonraki kapı:** eşleşen backend ve yeni Android sürümünün ayrı yetkili
dağıtımı sırasında özel config'i read-only mount et; yeni kurulum ve mevcut
misafir Android cihazında erişim/geri dönüş/premium/cüzdanı doğrula. **Şu an
canlıda etkin değil**; eski beta.72 telefonda bu yeni giriş yok. Console tam
erişim onay kutusunu sırf yerel kaynak testiyle tamamlandı sayma.

### Console'da son gözlenen nokta

21:28 özet ekranlarında IARC yanıtları ve önizleme: fantastik/insan-olmayan
şiddet, sıklıkla atmosferik korkunç öğeler; dijital satın alma ve **ücretli rastgele
öğeler Evet**; sohbet/engelleme/bildirme Evet, denetim ve yalnız davetli arkadaş
kısıtlaması Hayır. Avrupa PEGI7,AlmanyaUSK12+,Brezilya18+,Kuzey Amerika10+;
görüntü Console önizlemesidir, kalıcı son onay değildir. Resmî PEGI genel ölçütleri
ile bu önizleme arasındaki farkın nedeni **doğrulanamadı**, gerekçe uydurma.
Kaydet önerildi fakat bağımsız kayıt başarı/sertifika teyidi yok.
21:35 **Hedef kitle ve içerik**, “Oturum açma bilgileri bölümünü tamamlayın”
mesajıyla kilitli. Demo erişimi son sürümde etkinleştirilmeden bu engel dürüstçe
tamamlanmış sayılmaz. Son sürüm SDK/veri akışlarıyla Veri güvenliği ve hedef
kitle beyanları ayrıca doğrulanacak; kapalı test henüz başlamadı.

## Ev bilgisayarı devam — önce Play Console kurulumu, paket kapalı test geçişinde

**5 Ekim 2026 akşamı, yeni kullanıcı talimatı:** Öncelik Play Console'daki
kurulum beyanlarını ve mağaza girişini tamamlamaktır. Kullanıcının
`Ekran görüntüsü_5-10-2026_193152_play.google.com.jpeg` görüntüsünde **1/11
tamamlandı**; gizlilik politikası işaretli, diğer on görev bekliyor. Bu ekran,
önceki kullanıcı gizlilik kaydı teyidini destekler; inceleme/yayın onayı değildir.

**Önceki “evde hemen birleşik test güncellemesi” sırası ertelendi.** Yeni APK/AAB
**kapalı teste geçiş aşamasında** hazırlanacak. Diğer yapay zekâ backend/frontend
düzenlemelerini paralel sürdürecek; bu Console çalışması ortak oyun kaynaklarını,
Android projesini veya canlı sunucuyu değiştirmez. Build, deploy/restart,
dahili/kapalı test sürümü yayını ve gerçek reklam/ödeme açılması bu tur yapılmadı.
Paket aşamasında birleşik kaynak ve eşleşen backend yeniden doğrulanmalıdır.

Bekleyen kurulum: Oturum açma bilgileri, Reklam, İçerik derecelendirme,
Hedef kitle, Veri güvenliği, Resmi kurum uygulamaları, Finans ile ilgili
özellikler, Sağlık, kategori/iletişim bilgileri ve mağaza girişi. Console
formlarını yalnız yeni ekran veya açık kullanıcı teyidiyle tamamlandı işaretle.
Bu oturumun bağlı tarayıcı envanterinde Play Console sekmesi görülmedi;
şimdilik kullanıcı ekranlarıyla adım adım ilerlenir.

İlk adım **Oturum açma bilgileri** ekranını açmak. Yerel istemcide
“ŞİMDİLİK MİSAFİR OLARAK DEVAM ET” ve isteğe bağlı Play Games bağlantısı var;
bu kaynak bulgusu tüm özelliklerin Google incelemecisine sınırsız açık olduğunu
tek başına kanıtlamaz. Erişim/ücretli özellikler için doğru talimat hazırlanır;
kişisel Google şifresi veya mevcut oyuncunun hesabı inceleme erişimi diye verilmez.
Çocukları da kapsayan önceki kitle niyeti korunur; yaş grupları kullanıcıyla
netleştirilir. Veri güvenliği beyanı son gönderilecek sürümün SDK/veri akışlarıyla
uyumlu olmalı; formun kaydı teknik uyumluluk veya yayın onayı sayılmaz.

**19:42 TR ekranları — Oturum açma bilgileri henüz tamamlanmadı:** Kullanıcı
“Evet” seçimi sonrası “Oturum açma bilgisi ekle” formunu paylaştı. Ad sınırı60,
diğer erişim bilgileri500 karakter; kullanıcı adı/şifre alanları ve premium
dahil tüm özelliklere tam erişim onayı var. `GRIDSHARD guest access` adıyla
misafir düğmesine basmayı ve isteğe bağlı PGS bağlantısını açıklayan İngilizce
taslak hazırlanır; bu metin premium kilidini açtığı iddiası değildir.
Kaynakta sezon premium/Savaş Premium hakları profil bazında kısıtlı ve
doğrulanmış, özel bir Google inceleme erişimi henüz bulunmadı. Mevcut ekonomik
haklar veya canlı hesaplar değiştirilmedi. Tam erişim kutusunu yalnız misafir
talimatıyla işaretleme, sahte inceleme kullanıcı adı/şifre üretme. Gereken
yeniden kullanılabilir tam inceleme erişimi son kapalı test paketinden önce
doğrulanmalı; bu kalem şimdilik beklerken diğer Console görevleri yapılabilir.
Resmî koşul: https://support.google.com/googleplay/android-developer/answer/15748846

### Console anketi devam — şiddet ve korku taslağı, sonuç henüz gönderilmedi

**5 Ekim akşamı:** Reklam ekranında mevcut AdMob entegrasyonu nedeniyle
“Evet, uygulamam reklam içeriyor” → Kaydet önerildi; bağımsız kayıt başarı
ekranı/teyidi yok, bu beyan gerçek reklam/ödül rollout'unu açmaz. Kullanıcı
sonra IARC anketinin Oyun kategorisindeki soruları paylaştı. Anket sonucu,
sertifika veya yeni tamamlanan-görev sayacı henüz görülmedi.

Şiddet taslağı: Evet; yalnız insan olmayanlara şiddet; Fantastik ortam;
pikselleştirilmiş/çocuksu tarz Hayır; tepkiler Gerçekçi olmayan; normal tüm-tahta
görünümüne göre Genellikle uzak açı; ilişkili kan Hiçbiri; insan gibi davranma
ve gerçek hayvanlara şiddet Hayır. Son gönderilecek sürüm farklı karakter,
kamera, kan veya ses içeriği getirirse bu yanıtlar yeniden değerlendirilir.

Korku tanımlarına ait Google yardım URL'leri web aracından erişilemedi.
Etiketlerin günlük dildeki anlamından kategorinin şiddeti çıkarılmadı;
kullanıcı yardım açıklamalarını paylaştı. **“Korkunç öğeler” açıklaması**
küçük çocuklara korkutucu gelebilen genel atmosferi ve rahatsız edici/saldırgan
müziği kapsıyor. **İkinci açıklama (“Korkutucu öğeler”; önceki formda
“Ürkütücü öğeler”)** yoğun tehdit/dehşet, korkmuş insanlar ve ani korkutmayı
kapsıyor. Güncel `docs/AUDIO_DIRECTION.md`/ses kaynağı disonanslı gerilim,
kritik çekirdekte siren ve kalp katmanları içeriyor; bu tur ses dosyaları
dinlenmedi. Bu kaynak ve kullanıcının verdiği tanımlara dayalı **öneri**:
korku Evet, yalnız ilk **Korkunç öğeler** seçeneği; yoğun dehşet/ani korkutma
seçeneğini işaretleme. Bu, otomatik IARC sonucu veya uygulamada korkutucu
karakter bulunduğu iddiası değil; kullanıcı seçimi/kayıt henüz doğrulanmadı.
Sıradaki ekran: seçimin açtığı ek sorular varsa paylaş, yoksa Cinsellik bölümü.

## İş bilgisayarı kapanış — Play gizlilik kaydı tamam / evde birleşik test güncellemesi

**5 Ekim 2026 16:32 TR:** Kullanıcı **“tamam kaydettim”** diyerek Play Console'da
`https://gridshardgame.com/privacy/` gizlilik URL'sini kaydettiğini teyit etti.
Bu **kullanıcı teyididir**; yeni Console ekranı/success toast görülmedi ve Google
inceleme/genel yayın/AdMob onayı anlamına gelmez. Public site'nin16:23 canlı
9/9 HTTPS/hash/no-transform/AWS/app-ads doğrulaması aşağıda korunur.

Kullanıcı iş bilgisayarındaki bu çalışmayı bitirdi; diğer yapay zekâ hâlâ
çalışıyor. **Commit/push kullanıcı tarafından**, iki çalışmanın kaynak/test/
belgeleri birlikte incelenerek yapılacak; ev bilgisayarında **pull sonrası**
devam edilecek. Bu tur yalnız kapanış notları yazıldı: stage/commit/push,
ortak build, APK/AAB, Play test yayını, oyun deploy/restart veya başka AI'nın
dosyalarında değişiklik yok. Kullanıcı evde devam edene ve diğer çalışma
tamamlanana kadar bu işleri başlatma; otomatik devam/monitor kurulmadı.

**Evde devam sırası:**

1. Pull sonrası bu checkpoint'i oku; branch/commit ve çalışma ağacı durumunu
   doğrula. Diğer AI'nın son savaş/CSS ve olası ek değişikliklerini birleşik
   kaynakta incele; eski çalışma ağacına göre hazır build kullanma. Çakışma/
   eksik untracked kaynak/test dosyası varsa yayın öncesi gider.
2. Güvenli giriş kaynak düzeltmesi aşağıda kayıtlıdır:116 odaklı test +8
   kaynak tarayıcı kontrolü önce geçti; **canlı sunucu ve telefona henüz
   uygulanmış sayılmaz**. Birleşik sürümün auth/Play Games recovery ve savaş/
   CSS/native regresyonlarını yeniden çalıştır. Sunucu recovery endpoint'leri
   ile Android istemcisinin sürüm uyumunu doğrula; sadece AAB yüklemek yeterli
   kabul edilmez. Gerekli sunucu yayını varsa o aşamanın mevcut dağıtım/onay
   sınırlarına göre ele al; canlı oyuncu verisini reset/restore etme.
3. Kontroller geçince mevcut paket/imzalama düzenini koruyarak, Play'deki
   son versionCode'dan yüksek sürümle **dahili test güncellemesini** hazırla ve
   evde devam talimatı kapsamında yayın akışını tamamla. Eski Uç profilini aynı
   Play Games hesabıyla geri getirme ve oturum kontrollerini gerçek telefonda
   doğrula; mevcut profil/veri silme, boş hesaba taşıma veya tokenı geri açma yok.

**Tekrar kurulmayacak tamamlanan işler:** Cloudflare public politika ve
iletişim düzeltmesi canlı; Play gizlilik URL kaydı kullanıcıca tamamlandı;
30gün yedek ve90gün destek görevleri önceki ayrı onaylarla etkin. Yerel
`tools/support-retention/Code.gs` hâlâ güvenli dry-run şablonudur; bunu özel
canlı script'e tekrar yükleyip görevi kapatma. İlk zamanlı çalışma/gerçek
expiry silme henüz gözlenmiş değildir; önceki sınırlar korunur.

**Commit sınırı:** checkpoint ve ilgili yeni kaynak/test/operasyon belgeleri
de commit'e dahil edilmeli. `.env`, SSH PEM, imzalama/OAuth sırları, kişisel
veri ve ignored `artifacts/`/build paketleri commit'e zorla eklenmez. Özel
ignored receipt/ekran/ZIP'ler Git pull ile eve gelmez; kalıcı, sır içermeyen
devam bilgisi bu checkpoint ve operasyon belgelerindedir. Evde gerekli
yerel anahtar/ayarların mevcut olduğu sırlarını göstermeden kontrol edilir.

### Tarihsel aşama — 16:23 public-site doğrulandı / Play kaydı henüz bekliyordu

**5Ekim16:23TR:** Kullanıcı **“yayınladım”** dedi. Anonim salt-okunur HTTPS
kontrolünde8TR/EN HTML route +app-ads.txt **9/9 HTTP200**; yönlendirmesiz mevcut
custom-domain URL'leri. **9/9 dosya boyut/SHA256 build manifestiyle birebir**.
Tüm yanıtlar **no-transform, public, max-age=300** ve değişmemiş script-free
CSP döndürüyor.8HTML'de açık destek adresi ve doğrudan mailto var;
email-protection/data-cfemail/script tag yok. TR/EN hesap-silme düğmesi subject
parametreli doğrudan mailto. İki gizlilik sayfasında AWS/yayıncı/kayıtlı
kapanış90gün var, Oracle yok. app-ads.txt doğru yeni yayıncı satırıyla birebir
ve text/plain. Bu tur yeni tarayıcı görsel QA/e-posta istemcisi açma testi yok;
HTTP içerik/başlık/hash kanıtıdır, önceki statik QA korunur.

**Cloudflare header düzeltmesi canlı doğrulandı.** Kullanıcı yayın yaptı;
agent Cloudflare hesap/DNS/security/analytics ayarı veya external write yapmadı.
Receipt `artifacts/public-site-20261005-privacy/public-live-no-transform-verified.json`
ignored; önceki başarısız iletişim receipt/screenshot tarihsel korunur.
**Sıradaki iş:** Play Console → GRIDSHARD → Gizlilik Politikası → mevcut
`https://gridshardgame.com/privacy/` URL'sini **Kaydet**, ardından kayıt
başarısını kullanıcı screenshot/teyidiyle doğrula. Play kaydı henüz görülmedi;
incelemeye gönderme/genel yayın/AdMob crawler onayı yok. Oyun build/deploy/
restart/APK/AAB/dahili test ertelemesi, mail/yedek görevlerinin önceki sınırları
korunur. Bu tur e-posta/yedek silmesi veya yeni görev kurulmadı.

### Tarihsel aşama — 16:15 Cloudflare e-posta dönüşümü düzeltmesi bekliyordu

**5Ekim16:15TR:** Kullanıcı **“açtım ve yüklemeyi yaptım”** dedi. Anonim
salt-okunur custom-domain HTTPS kontrolünde8TR/EN sayfa ve app-ads.txt **200**.
TR/EN gizlilik metninde **AWS / Alihan ÖZTÜRK / kayıtlı kapanıştan90gün** var,
**Oracle yok**. app-ads.txt yeni yayıncı satırı ve SHA ile birebir eşleşir.
Bu içerik yayınının kanıtıdır; Play Kaydet, genel yayın veya AdMob onayı değildir.

Ancak8HTML dosyasının hash'i build'den farklı: Cloudflare e-posta obfuscation
ve Web Analytics beacon script'i ekliyor. `/privacy/`, `/support/`,
`/delete-account/` yanıtlarında değişmemiş `default-src 'none'` CSP var;
adresler `__cf_email__` / `data-cfemail` / email-protection bağlantılarına
dönüşmüş. CUA canlı hesap-silme DOM ve screenshot'ta destek adresi gerçekten
**[email protected]**; e-posta hazırlama düğmesi mailto yerine proxy bağlantısı.
Script çalışmasını açmak için CSP gevşetilmedi. Dev logs boş döndü;
console hata satırı gözlendi denmez. Web aracı doğrudan canlı URL'leri
okuyamadı; doğrulama ayrı HTTPS ve CUA kanıtından gelir.

Yalnız public builder'ın `_headers` çıktısına tüm statik dosyalar için
**Cache-Control: public, max-age=300, no-transform** eklendi. Cloudflare'ın
resmî dokümanı bunun email obfuscation ve otomatik analytics injection'ı
engellediğini belirtir. app-ads'e ayrı aynı başlığı tekrarlama kaldırıldı;
CSP/diğer güvenlik kuralları aynı. **21/21** public/support testi geçti.
Yeni **GRIDSHARD-public-20261005-no-transform.zip** aynı ignored artifact
klasöründe,248128byte,19/19 dosya manifest adı/boyut/SHA kontrolü başarılı.
Önceki retention-ready ZIP ile karşılaştırmada **yalnız _headers farklı**;
HTML/CSS/marka/app-ads içerikleri aynı, yeni görsel QA iddiası yok.

**Sıradaki iş:** kullanıcı mevcut gridshard-public → Create deployment →
Production ekranında **no-transform ZIP** → **Save and deploy**. Ardından
custom-domain Cache-Control/no-transform,8HTML manifest hash'i, TR/EN açık
e-posta ve mailto hesap-silme bağlantısı, script injection olmaması ve
app-ads satırı yeniden doğrulanmalı. Henüz bu header düzeltmesi canlıda
doğrulanmadı; Play gizlilik Kaydet bekliyor. Önceki retention-ready paketi
yeniden yükleme; içerik canlıdır fakat edge dönüşümünü önleyen başlığı yok.
Kanıt `public-live-verification-result.json` ve `public-live-email-blocked.jpg`
yalnız ignored artifacts'ta. Oyun build/deploy/restart/APK/AAB/dahili test
ertelemesi korunur; Cloudflare hesap/güvenlik/analytics ayarı değiştirilmedi.

### Tarihsel aşama — 15:26 destek görevi etkin / ilk yayın paketi hazır

**5Ekim15:26TR — ayrı onayla tamamlandı:** Kullanıcı **“Evet, bu kapsamda
günlük görevi etkinleştir”** dedi. Risk sorusu geri alınamaz kalıcı silmeyi,
tam Gmail OAuth kapsamını ve dar sınırı açıkladı: yalnız yayıncının CLOSE
etiketiyle kapattığı taleplerin kayıtlı mesajları, kayıtlı kapanıştan90gün
sonra; yeni yanıtta reopen, etiketsiz mail/tüm Çöp Kutusu topluca silinmez.
Kullanıcı **“Hayır, yalnız destek Gmail hesabında tutuluyor”** diyerek dış
kopya olmadığını teyit etti; bu dış disk audit'i değildir.

Yalnız özel script'teki dryRun false / tam confirmation değişti; yeniden
yükleme sonrası normalize kaynak birebir eşleşti. Manifest/kalan kod aynı.
**Yerel Code.gs güvenli dryRun true/confirmation boş şablondur**; canlı modu
buradan çıkarma veya dosyayı haber vermeden tekrar yükleme. İlk etkin
runSupportRetention15:23:56–15:24:00 başarılı: dryRun false, bütün sayaçlar0,
**deletedMessages0**. Installer15:26:01–15:26:02 başarılı; UI'de **tek
runSupportRetention / Ana / Zaman tabanlı** tetikleyici. Salt-okunur edit
ekranı **günlük04:00–05:00GMT+03**, hata bildirimi **günlük**; ayar değiştirmeden
İptal ile kapatıldı. Henüz ilk zamanlı çalışma/gerçek90gün expiry veya silme
gözlenmedi. Google izin ekranına agent tıklamadı; başarılı Gmail/ScriptApp
çağrıları erişimi doğrular, izin formu/onay eylemi gözlendi denmez.

Yayıncı çözdüğü talebe **GRIDSHARD_SUPPORT_CLOSE** etiketi vermeli. Günlük
görev kapanış/mesaj kimliklerini kaydeder, CLOSED'a taşır; yeni yanıtta OPEN
olur. Kapanışı içerikten tahmin etmez; eski tarih uydurma. Hata/limit/backlog
hedefi aşabilir: Google günlük hata bildirimi/Executions takip edilir.
Yedek işinin önceki güvenli durma/yeni-yedek ve otomatik uyarı eksikliği korunur.
Yeni Codex monitor/hatırlatıcı veya posta connector'ı kurulmadı.

TR/EN politika gerçek dar kurulumlara göre güncellendi; backupVerified ve
supportVerified **true**, manifest privacyRetentionVerified **true**. Bunlar
tüm geçmiş maillerin temizliği/gelecekte hatasız çalışması/live-site veya Play
onayı değildir. Etiketsiz eski talepler/dış kopyalar, hata/limit sınırı ve
henüz gerçek90gün silme gözlenmediği açıkça yazılır. **20/20** public/support
testi, **12/12** CUA kontrolü:8desktop route +4TR/EN mobil privacy; form/script/
taşma yok.393px istek tarayıcıda394 ölçüldü: ilk katı genişlik eşitliği kontrolü
durdu, taşma yoktu; ölçek yuvarlamasıyla tekrar geçti.320px birebir. Geçici
viewport reset ve loopback server/QA sekmesi kapatıldı. Önceki24/24 layout
kanıtı tarihsel; bu tur güncel12kontrol. Bir EN full-page screenshot capture
başarısız; DOM ve mobil kontrolleri geçti. Diğer kanıt ekranları ignored'dır.

Yeni ignored **GRIDSHARD-public-20261005-retention-ready.zip**, aynı
`artifacts/public-site-20261005-privacy/` altında;248122byte,19/19 dosya adı/
uzunluk/SHA manifestine eşleşir, kökte index.html, yalnız statik dosyalar.
Oracle TR/EN'de **AWS** olarak düzeltilmiştir; kullanıcı bunu ayrıca hatırlattı.
Canlı sitedeki eski Oracle metni henüz değişmedi: Cloudflare yayını bekliyor.
Özel proje URL/digest/receipt/ekranlar yalnız ignored operator artifacts'ta;
özel script, manifest, anahtar veya veri ZIP'e girmez. Eski privacy-draft ZIP
stale; yükleme. **Sıradaki iş:** mevcut gridshard-public → Create deployment
→ Production ekranına yeni ZIP → custom-domain TR/EN politika/app-ads doğrulama
→ Play'de mevcut `/privacy/` URL'sini Kaydet. Yeni Pages/domain/DNS/oyun
deploy/restart/APK/AAB/dahili test yayını yok. Script sekmesi handoff bırakılır.

### Tarihsel ara aşama — 13:30 silmesiz kurulum

**5Ekim13:30TR:** Kullanıcı tek Google hesaplı oturumu **“hazır”** diye
bildirdi. Doğru `gridshardgame@gmail.com` hesabında özel **GRIDSHARD Support
Retention** projesi oluşturuldu. Yerel `tools/support-retention/Code.gs`,
editördeki `Kod.gs` dosyasına; manifest `appsscript.json` dosyasına aktarıldı.
Kaydedip sayfayı yeniden yükledikten sonra normalize kaynak metni birebir,
manifest yapısal olarak aynı: Gmail advanced v1, Europe/Istanbul, V8, açık
OAuth kapsamları. Google'ın varsayılan ayrı Cloud projesi korundu; mevcut
Play Games projesine bağlama, web-app Deploy/paylaşım yapılmadı.

`prepareSupportLabels` **13:29:02–13:29:03 başarılı**: doğru-mailbox guard
sonrası üç destek etiketi hazırlanır. Ardından `runSupportRetention`
**13:30:30–13:30:31 başarılı**: `dryRun:true`, closureRequests/kept/expired/
reopened/invalid/missing/limited **0**, deletedMessages **0**. Bu, gerçek
Gmail erişimi ve boş kapsamda silmesiz çalışmanın kanıtıdır; dolu talep,
gerçek 90gün expiry veya kalıcı silme denemesi değildir. Google izin ekranına
agent tıklamadı; izin formu/onay eylemi gözlenmedi, yalnız başarılı Gmail
çağrıları doğrulandı. Kaynak `dryRun:true` / `confirmation:''` korunur;
`installSupportRetentionTrigger` çalıştırılmadı. Tetikleyiciler ekranında
kurulum öncesi ve dry-run sonrası **0** görüldü; activation sonrası **1**
sayımı yukarıda ve ignored receipt'te tutulur.
Yerel support güvenlik mock testleri **11/11** geçti; gerçek mesaj içerikleri,
kimlikler, tokenlar veya kapanış kayıtları sohbete/Git'e alınmadı.

Özel proje bağlantısı ve kişisel-verisiz kanıt yalnız ignored
`artifacts/public-site-20261005-privacy/support-retention-setup-result.json`
ve `support-retention-dry-run.jpg` altında; public ZIP/Git'e girmez. Proje
sekmesi devam için handoff olarak bırakılır. **13:30 aşamasında** kalıcı silme/
trigger onayı yoktu; iki bayrak false'tu. Sonraki ayrı15:26 activation kanıtı
yukarıdadır. Onaylı kapsam dışında mevcut mesajlara keyfi etiket verme.
Gerekirse yayıncının seçtiği kişisel-verisiz test konuşmasıyla kapanış dalı
silmesiz doğrulanır; eski tarih uydurulmaz. Nihai Cloudflare/Play gizlilik
kaydı bekliyor. Oyun ortak build/Play yayını/deploy/restart ertelemesi korunur.

## Son kullanıcı sınırı — giriş kaynak düzeltmesi hazır / test yayını bekletiliyor

Kullanıcı **“güvenli girişi düzeltip kaldığımız yerden devam et”** ile aşağıdaki
dar kaynak değişikliğini onayladı. Ardından **“dahili test güncellemesini hemen
yapmayalım; diğer yapay zeka ile yaptığım işlemler de bitsin”** dedi. Bu son
talimat geçerlidir: **APK/AAB veya ortak web build üretme, Play'e yeni sürüm
yükleme/yayınlama, oyun sunucusu release/restart/deploy başlatma.** Diğer savaş/
CSS çalışmasının tamamlandığı kullanıcıca bildirilmeden güncellemeye geçme.
Yerel testler bu erteleme kapsamında tamamlandı; canlı veya telefon düzeltildi
denmez. Mevcut test sürümü aynı eski davranışı gösterir; kullanıcıdan tekrar
kurulum/veri temizleme/hesap taşıma isteme.

- Önceki salt-okunur Uç denetimi (5Ekim08:50:35UTC): aynı **167 kupa /32 maç**
  profili ve Play Games bağlantısı korunmuş; yetkili cihaz0/platform cihaz0,
  iptal token7. Oturumların kapatılması hesabı silmemiş. Sonuç ignored
  `artifacts/account-revocation-20261005/uc-readonly-audit-result.json`; sırlar,
  provider subject veya özel hesap/veri dump'ı public site/Git'e girmez.
- Hata: iptal edilmiş cihaz sırrıyla `/auth/session`401; açılış yalnız aynı
  başarısız yöntemi deniyor, sağlayıcı giriş UI'si başarılı açılışı bekliyordu.
  Auth kapısı kaldırılmadı, eski cihaz izni/iptal tokenlar geri açılmadı;
  canlı Uç veya başka hesap üzerinde yazma/migration yapılmadı.
- Kaynak çözümü: açılıştan bağımsız yeniden giriş dialog'u, aynı Play Games
  hesabıyla açık kullanıcı giriş eylemi; bu cihaz etiketi ve çıkış öncesi onay.
  Güvenli bağlı giriş hazır değilse mevcut cihazdan yanlışlıkla çıkış engellenir.
  Diğer cihazdan çıkış mevcut cihazın oturumunu kapatmaz. 401 yalnız RAM tokenı
  temizler; hatırlanan profil kimliği/güvenli cihaz sırrı korunur. Ağ/503 tek
  başına iptal edilmiş hesap sayılmaz. TR/EN ve klavye odağı kontrol edildi.
- Sunucuda yeni `/auth/play-games/recovery/start|complete`: 10dk/tek-kullanım
  nonce, PKCE, mevcut IP auth limiti10/dk ve en fazla100 bekleyen istek.
  Start mevcut/olmayan hesap için aynı yanıtı verir ve hesap oluşturmaz.
  Google sunucu kodu + Games uygulama doğrulaması yapılmadan giriş yok; yalnız
  tek mevcut provider sahibinin hatırlanan profile birebir eşleşmesi kabul
  edilir. Yanlış Google/başka sahip/çoklu sahip/silinmiş hesap reddedilir.
  Mevcut bir-kullanımlık provider-session proof üzerinden cihaz yetkilendirilir;
  eski iptal tokenlar iptal kalır. Recovery proof eksik kalıcı identity veya
  production profilini yeniden oluşturamaz. Erasure nonce/exchange'i temizler.
  Şema, paket, Google OAuth/PGS istemcileri ve imza anahtarı değişmedi.
- Dokunulan auth dosyaları: `client/src/auth-session.js`, `play-games.js`,
  `i18n-catalog.js`, yeni `account-session-controls.js/.css`; `client/index.html`
  ve `client/src/app.js` içinde **yalnız gerekli auth entegrasyonu**. Savaş/CSS
  değişiklikleri korunur; `battle/board-view.js`/`canon.css` tarafına bu işte
  yazma yapılmadı. Ortak dosyaların büyük diff'ini auth değişikliği sanma,
  topluca stage/commit veya başka AI düzenlemesini geri alma.
- Doğrulama: ilgili client **63/63**, server auth/PGS/OAuth/platform/integrity
  **53/53**; PostgreSQL belgesi sentetik row-lock fixture ile (canlı DB değil)
  kontrol edildi. Source-only loopback browser **8/8**: desktop/393px/320px/
  yatay740×320, TR/EN, modal üst katman/taşma/odağın geri gelişi/iptal/retry.
  `tools/check-account-session-controls.js` app build veya dış istek yapmaz;
  ekranlar ignored `artifacts/account-revocation-20261005/layout/` altında.
  İlk server denemesinde eksik Field importu bulundu/düzeltildi, seçili venv'de
  pytest olmadığı için mevcut sistem Python'uyla test edildi; dependency kurulmadı.
  Telefonun gerçek Play Games girişi/yeni test sürümü/canlı deployment test
  edilmiş değildir. Commit/push/Play yayını/canlı değişiklik bu tur yok.
- Bekleyen sıra: test yayınını ertele; aşağıdaki yedek30gün günlük görev
  kullanıcı onayıyla kuruldu/doğrulandı. Destek90gün Apps Script özel setup ve
  dry-run onaylandı; özel kaynak kurulumu/etiket hazırlığı/boş kapsamda gerçek
  dry-run yukarıdaki son devamda tamamlandı. Activation/trigger adımları
  yukarıdaki15:26 ayrı onayıyla tamamlandı. Final Cloudflare
  politika yayını/Play Kaydet hazır sayılmaz. Diğer AI bittikten sonra ortak
  kaynakların yeniden testi ve uyumlu backend + tek birleşik dahili sürüm için
  kullanıcıyla ilerle; şimdi eski APK/AAB'yi yeniden üretme veya yükletme.

## Güncel devam — iş bilgisayarı / Play gizlilik adımı (5 Ekim)

Kullanıcı başka bir AI ile savaş motoru/CSS düzenliyor; ilk kapsam yalnız
public-site, destek saklama hazırlığı ve ilgili operator belgeleriydi. Son
giriş düzeltmesi onayıyla dar auth kapsamı yukarıdaki son kayıtta eklenmiştir.
`client/index.html`, `client/src/app.js`, `client/src/battle/board-view.js`,
`client/src/canon.css` içindeki savaş/CSS değişiklikleri diğer çalışmaya aittir;
dokunma, topluca stage/commit etme, ortak APK/AAB/web build veya oyun sunucusu
release'i üretme. Index/app içindeki dar auth patch'i ayrı korunur.
Mevcut r10, canlı hesaplar/takımlar, DB/Redis ve kalıcı imza/paket korunur.

- Kullanıcı Play gizlilik formunda doğru `https://gridshardgame.com/privacy/`
  adresini gösterdi. Henüz Kaydet yapılmış/Google'a gönderilmiş sayılmaz.
- İlk iş ağında MEB games filtresi görüldü; kullanıcı farklı ağa geçti. Yeni
  ağda public politika bağımsız HTTPS200/text-html; canlı eski Oracle metni,
  eksik Alihan yayıncı adı ve bekleyen saklama takvimi doğrulandı. Yerel AWS/ad
  metni hâlâ yayınlanmamış; Cloudflare ekranı mevcut **gridshard-public → Create
  deployment / Production** hazır, fakat dosya yükleme/yayın yapılmadı.
- Yeni EC2 ekranı aynı adlı çalışan/3-3 başarılı instance'ın genel IPv4'ünün
  değiştiğini gösterdi. Önceki adrese güvenme; güncel adresi son kullanıcı
  ekranından al, origin IP'yi Git'e yazma. Hem eski hem güncel hedefte yalnız
  kimlik doğrulamasız SSH el sıkışması önce `connection reset` ile kesildi.
  Kullanıcıdan **Güvenlik → bağlı güvenlik grubu → Gelen kuralları**
  ekranı alındı:3 dar SSH22/32 ve15 Cloudflare HTTPS443 kuralı görünüyor.
  AWS'nin resmi checkip hizmetinden alınan güncel ağ IPv4'ü bu3 SSH kaynağının
  hiçbirisiyle eşleşmiyor; dar erişim için eksik bir izin doğrulandı (reset'in
  başka ağ nedeni olmadığı ayrıca kanıtlanmadı). Kullanıcı ek dar SSH/TCP22
  ağIPv4/32 kuralını **“kaydettim”** diye teyit etti; erişim ardından düzeldi.
  Mevcut ev/iş/Cloudflare kurallarına dokunma ve `0.0.0.0/0` açma. Agent kural
  yazmadı. Güncel geçici ağ IP'si sohbette sağlanır, Git'e konmaz.
- **5Ekim11:42TR salt-okunur yedek audit geçti:** Girişten önce ED25519
  `SHA256:mUVfmM7mNK+USvleLKEHIfYfOQQLP0UOVWGaSL7teTo` eski kullanıcı
  doğrulamasıyla birebir eşleşti. Yalnız bu işin ignored known_hosts dosyasına
  sabitlendi; sonra mevcut özel anahtarla SSH giriş yapıldı. Özel anahtar
  okunmadı/gösterilmedi/kopyalanmadı. `/var/backups/gridshard-production/`
  kökü0700, **9 yedek /9 manifest-SHA ve pg_restore--list başarılı**, dump0600,
  dizin0700; manifest7×0644/2×0600, üst dizin erişim sınırı korunuyor.
  Manifestler2–4Ekim, en eski yaklaşık2.59gün, **30gün dolan0**. SELECT-only
  canlı kurulum kimliği özeti9yedeğin tümüyle eşleşti. Bu arşiv/kimlik audit'i
  tam restore provası veya sıfır veri kaybı garantisi değildir.
  `/var/backups`, `/opt/gridshard`, `/home/ubuntu` içinde taranan adlandırılmış
  dump/backup/sql.gz/sql.zip adaylarında ek kopya yok; tüm sunucu/disk/snapshot,
  başka bilgisayar veya dışa aktarım kopyaları denetlendi denmez.
  Systemd listesinde17timer var, GRIDSHARD saklama işi yok; sınırlı systemd/cron/
  yerel operator dizini taramasında saklama referansı bulunmadı. Caddy/API/PG/
  Redis çalışıyor; yeni iş/timer, servis duruşu, backup/restore/DB değişikliği
  veya silme yapılmadı. Kişisel-verisiz sonuç ignored
  `artifacts/public-site-20261005-privacy/backup-readonly-audit-result.json`;
  salt-okunur helper ve pin aynı dizinde, public ZIP'e girmez.
- `https://play.gridshardgame.com/health` bağımsız HTTP200, beta.72/production,
  PostgreSQL/Redis/worker ready, aktifPvP0/socket0 sonucunu verdi; bu snapshot
  SSH erişimi, yedek expiry veya reklam/billing onayı değildir. Oyun çalışıyor;
  IP değişti diye DNS/redeploy/newserver işlemi yapma.
- Kaynak politika tarihi5Ekim; onaylı **yedek30 gün / kapanıştan sonra destek90
  gün** süreleri şimdi açıkça belirtilir, ancak süreçler etkinmiş gibi yazılmaz.
  `site.retention.backupVerified` aşağıdaki gerçek kurulumla **true**;
  bu ilk aşamada supportVerified ve manifest false'tu; son support activation
  kanıtıyla ikisi **true**.
  TR/EN yerel metin etkin yedek işi, daha yeni sağlam yedek yokken durması/
  30gün hedefini aşabilmesi ve bekleyen e-posta sürecini ayrı anlatır.
  Bu, nihai Play kaydı/yayın paketi değildir; Cloudflare yayını yapılmadı.
- Kullanıcı elle destek takibinde süre kaçırılacağını belirtti; otomatik süreç
  istedi. **`tools/support-retention/Code.gs` + appsscript.json/README** özel
  destek hesabı için Google Apps Script kurulum adayı hazır: varsayılan dry-run,
  doğru-mailbox guard, açık kapanış etiketi/otomatik timestamp,90gün kapısı,
  yeni mesajda reopen, yalnız kayıtlı mesaj IDs, yarış/kısmi API hata koruması,
  açık activation confirmation ve ayrı günlük tetikleyici. İlk kaynak hazırlığı
  sırasında Gmail erişimi/izin/kurulum/tetikleyici/mesaj silme yapılmadı;
  son özel setup/etiket/dry-run durumu yukarıda ayrı kayıtlıdır. Tam Gmail OAuth kapsamı
  ve kalıcı silme riski ayrıca yayıncıya açıklanıp onun kurulumu/onayı gerekir;
  script mevcut Play Games projesine bağlanmaz, public Pages'e yüklenmez.
- Doğrulama: public-site9/9 + support mock11/11 = **20/20**, public-site
  desktop/393px/320px × TR/EN ×4route **24/24** yerel browser/layout geçti.
  Özgün marka varlıkları/app-ads.txt korunur; izin listesi19 statik dosya.
  Gerçek Apps Script/Gmail veya canlı yedek işlemi test edilmiş gibi gösterme.
- Yerel aday ZIP `artifacts/public-site-20261005-privacy/GRIDSHARD-public-20261005-privacy-draft.zip`;
  yalnız19 statik dosya, **draft**. Kaynak, operator manifest/script, oyun
  dosyaları ve sırlar pakete girmez. Nihai kopyayı üretmeden 30/90 süreçlerinin
  gerçek kurulumu doğrulanmalı; mevcut draft Play'e nihai politika diye kaydedilmez.

**5Ekim12:54TR yedek görevi tamamlandı:** Kullanıcı **“Evet, bu kapsamda kur”**
dedi. `tools/backup-retention/` operator/tests/install/service/timer/README
hazır; sabit hedef yalnız `/var/backups/gridshard-production/`, süre30gün.
Linux'ta izole sentetik **22/22** güvenlik testi geçti; gerçek dry-run9valid/
0expired/0deleted. İlk guard mevcut0700 kökün UID10001'ini reddederek durdu;
son kökte mevcut güvenilir writer'ı kabul eden dar düzeltme sonrası kendi
bilinen eski operator hash'ine eşleşerek resume onarımı yapıldı. **Kök/atası
sahiplik ve izinleri değiştirilmedi.** İki unit ve root0600 kapsam config'i
kuruldu; source/unit/config hash'leri canlı byte'larla eşleşti. İlk etkin service
success/exit0,9valid/0expired/**0deleted**; timer **enabled/active/waiting**,
Türkiye04:00 günlük, sonraki **6Ekim04:00TR**, Persistent=true. Service'in
inactive/dead olması bitmiş oneshot için normaldir. Son doğrulama pinned SSH
host ile geçti; oyun4container id/restart_count/started_at aynı kaldı.
HTTPS health ok/beta.72/production/PG-Redis-worker ready. Receipt ignored
`artifacts/public-site-20261005-privacy/backup-retention-install-result.json`;
kurulum hash'i/anahtar/IP/veri public ZIP/Git'e eklenmez. Üretimde30gün dolan
yedek olmadığından gerçek expired deletion gözlendi denmez. Yeni rutin backup,
restore, DB/migration, game release/restart veya test yayını yapılmadı.
Görev, süresi dolmamış daha yeni sağlam yedek yoksa/verify hata verirse durur;
son yedeği körlemesine silmez. **Yeni düzenli yedek ve otomatik hata bildirimi
kurulmadı**; journal failure/birikme ve güncel backup yayıncıca izlenmelidir.
Bu güvenli durma30gün hedefini aşabilir; ayrı bakım/backup kararı gerekir.

**Sıradaki kapı:** Dar SSH/host pin/yedek görevi tamamlandı; ilk kurulum veya
timer activation'ı tekrarlama. Kullanıcı **“Kurulum ve silmesiz denemeye geç”**
diyerek yalnız `gridshardgame@gmail.com` özel Apps Script setup/dry-run
onayladı. Tam Gmail OAuth kapsamı açıklandı; izin ekranını yayıncı kendisi
onaylar. Bu **ilk setup/dry-run kararı** silme/trigger kapsamıyordu;
sonraki ayrı açık activation kararı ve gerçek durum en üstte kayıtlıdır.
Aşağıdaki ilk çoklu-hesap denemesi geçmiş kayıttır;
son tek-hesap kurulum/etiket/dry-run sonucu en üstteki son devamdadır.
Uygulama içi tarayıcıda `https://script.google.com/home` açıldı; ilk navigation
timeout sonrası mevcut sekme kontrol edildi, kontrol paneli görünür oldu.
İlk sekmede seçili hesap destek hesabı değildi. Kullanıcı **“açtım devam et”**
dedi; yeni `/u/1/home` sekmesinin hesap düğmesinde **gridshardgame@gmail.com**
doğrulandı. Ancak Apps Script oluşturma düğmesi yeni sekmede `/accounts?...`
yönlendirmesiyle **“Maalesef şu anda dosyayı açamıyoruz”** hatası verdi;
Google'ın verdiği continue hedefini tek doğrudan deneme de aynı hatayı verdi.
Resmi alternatif Drive→Yeni→Diğer→Google Apps Komutu denendi: Drive doğru
destek hesabındaydı, fakat açılan create editor **diğer Google hesabına**
yönlenip **“komut dosyası oluşturulamadı”** hatası verdi. Proje oluşturulduğu
kanıtı yok; kod yükleme, Gmail OAuth/izin, etiket/mesaj değişikliği, dry-run veya
trigger yapılmadı. Google'ın resmi Apps Script projects belgesi çoklu Google
girişinin desteklenmediğini ve tek hesap/private oturum önerisini doğrular;
gözlenen yönlendirme bu sorunla uyumlu. Bu ilk denemede tek-hesap yolu bekliyordu;
sonraki “hazır” ile başarılı kurulum yukarıda kayıtlıdır. Kullanıcı yalnız bu
Codex tarayıcısının Google oturumlarında diğer hesaplardan
çıkıp sadece destek hesabına kendisi girmeli; oyun içi GRIDSHARD oturumlarına
dokunulmaz. Alternatif kullanıcı ayrı/private tarayıcıda yalnız destek hesabıyla
editör açabilir. Google authentication/izin ekranını agent otomatik geçmez.
Doğru destek Apps Script dashboard sekmesi handoff olarak bırakılır; başarısız
agent-created geçici sekmeler kapatılır. Mevcut/başka PGS projesini değiştirme;
ilk denemede özel support script kurulumu ve gerçek dry-run bekliyordu.
Son kaynak doğrulaması: public-site9 + support mock11 =20/20, yalnız public
statik build/layout24/24. Bu ilk build'de support/manifest false'tu; son
activation/build/ZIP kaydı en üsttedir. Eski draft ZIP stale; uzak site/Play
kaydı yok. Oyun/client ortak build üretilmedi.
Destek hesabında Apps Script'in ayrı onaylı activation/trigger
adımları → gerçek süreçle tutarlı nihai TR/EN metin/paket → aynı gridshard-public
projesinde yayın → gerçek custom-domain metin/app-ads doğrulaması → Play Kaydet.
Yeni sağlanan ekranları ilk kurulum/PGS/account migration sanma ve tekrarlama.

Saklama işletim yönergesi: `docs/PRIVACY_RETENTION_OPERATIONS.md`. Bu tur yalnız
onaylı server operator/timer kurulumu oldu; silinen yedek0. Commit/push,
uzak public-site/oyun dağıtımı, test güncellemesi veya eski kayıt taşıma yok.

## Oturum kapanışı — ev bilgisayarı / iş bilgisayarında devam

**4 Ekim 2026, Europe/Istanbul:** Kullanıcı **“İşlem tamam”** diyerek 28Mehmethan profilinin yeni uygulamadaki geçişini tamamladığını bildirdi. Ardından bu ev bilgisayarındaki çalışmanın burada bitmesini ve **5 Ekim 2026 sabahı iş bilgisayarında kaldığımız yerden devam edilmesini** istedi. Bu talimatla çalışma durduruldu; otomatik devam/reminder, yeni dağıtım, APK üretimi veya sunucu işlemi başlatılmadı.

- **Hesap geçişi tamamlandı (kullanıcı teyidi):** 28Mehmethan'ın yeni canonical GRIDSHARD/Play Games oturumuna geçişi ve Giresunlular takımının devamı tamamlanmış kabul edilir. Son bağımsız sunucu ölçümü **44 kupa / 98 Akı / 978 Devre Kredisi / 7 maç**, takım **2 üye / lider28Mehmethan**; bu değerler son audit anına aittir, kapanışta yeni ölçüm yapılmadı. Kullanıcı telefondaki tek tek sayıları ayrıca yazmadı; bağımsız fiziksel cihaz doğrulaması yapılmış gibi gösterme. **Aşağıdaki “cihaz re-login bekliyor” notları bu son teyitten önceki tarihsel kayıtlardır.** Yeniden uygulama verisi temizletme, migration operatörünü tekrar çalıştırma, hesabı/takımı yeniden taşıma veya Uç profilini değiştirme yok.
- **Korunan canlı durum:** Aynı AWS r10 sunucusu, mevcut PostgreSQL/Redis/veri birimleri ve paket `com.gridshardgame.app`; kalıcı v1 AAB/APK `2.1.0-beta.72` ve Play sertifika/PGS istemcileri korunur. AdMob SSV URL doğrulandı/kaydedildi; gerçek reklam ödülü ve billing genel kullanıma açılmış/doğrulanmış değildir. Son Mehmethan backup yolu `/var/backups/gridshard-production/20261004-before-mehmethan-play-migration`, SHA ve ayrıntılar aşağıdaki sonuç kaydında; eski yedekleri geri yükleme veya silme yok.
- **Yarın ilk iş:** Mevcut Play Console GRIDSHARD **Kontrol paneli / mağaza kurulum eksiklerinden** devam et. Gizlilik politikasını gerçek veri işleme ve onaylı **30 gün yedek / destek talebi kapandıktan 90 gün yazışma** saklama uygulamasıyla tutarlı hâle getir; mevcut Cloudflare Pages projesinde yayıncı **Alihan ÖZTÜRK**, AWS ve politika düzeltmelerini tamamla. Onaylanmış ama uygulanmamış saklama otomasyonunu varmış gibi beyan etme. Ardından app access/reklam/içerik derecelendirme/karma çocuk-genel kitle/veri güvenliği/kategori/mağaza görselleri-açıklamaları görevlerini doğru bilgilerle tamamla. Gereksiz yeni altyapı veya tamamlanmış PGS işlemlerine geri dönüş yok.
- **Açık kapılar:** Kapalı test kurulumu ve gerçek katılım/süre (hesabın gösterdiği **12 kişi / aralıksız14 gün**; dahili tester eklenmesi bu süreyi başlatmış sayılmaz), genel mağaza/AdMob hazırlık onayı ve gerçek SSV maç ödülü, mevcut 10 ürünün Play Console'da oluşturulması/Developer API satın alma doğrulaması/RTDN ve gerçek mağaza fiyatları, taşınabilir güvenli imza anahtarı yedeği. Bunlar bu kapanışta tamamlandı denmez; sonraki mevcut iş sırası korunur.
- **Bilgisayarlar arası devam sınırı:** Bu checkpoint ve yerel değişiklikler **`D:\Projects\GRIDSHARD` ev bilgisayarı checkout'unda** kaydedildi. Çalışma ağacı kirli; commit/push/iş bilgisayarına dosya aktarımı veya senkronizasyon bu tur yapılmadı. İş bilgisayarındaki agent önce güncel proje/checkpoint bulunduğunu doğrulasın; eski kaynak ZIP'i güncel değişiklik sanmasın, kullanıcı değişikliklerini sıfırlamasın. SSH anahtarı ve Android imza `.p12`/DPAPI kimlik bilgileri ev makinesine bağlı özel dosyalardır; Git/kaynak ZIP/sohbete kopyalama ve yeni anahtar üretme yok. Gerekli erişim eksikse güvenli kullanıcı kurulumunu iste; mevcut sunucuya yeni dağıtım yapma.

Güncel sonuç receipt'i: `artifacts/android-production-20261004-v1/mehmethan-team-migration-result-20261004.json`; kullanıcı teyidi ve yarınki devam notu işlendi. Bu ignored artifact iş bilgisayarında yoksa yukarıdaki checkpoint sonucu yeterlidir; özel DB dump'ını proje içine alma.

## Güncel devam — kullanıcı kalıcı üretim geçişi istedi

**Güncel sonuç — 28Mehmethan PGS aktarımı sunucuda tamamlandı / cihaz re-login bekliyor:** Kullanıcı önerilen fresh backup/kısa bakım/yalnız canonical yerel oturum sıfırlamayı **“evet”** ile onayladı. Canlı preflight8 profil/pending0/ilkPvP0; r1 tam başlarken yeniPvP1 oluştuğu için **servis durdurmadan, backup/DB değişmeden güvenli ret** verdi. r2 aynı kapsamda en fazla6dk idle bekleme ekledi; eski r1 script/log korundu, yeni root0500 operator SHA **`c61ce0bbe866a266121112a8e8ce020a8e0e03f58be4c68059ceed526bddfe2c`**, payload **`0dabd9c761444d2651c0669a6eaa79a3c059dc5ba3884c4fb2961109dbaf0977`**. Cached maintenance image içinde sentetik2 test/14 refusal case geçti; aktifPvP/socket0 kapısında mevcut API/Caddy kısa durdu. **Yeni özel offline backup** `/var/backups/gridshard-production/20261004-before-mehmethan-play-migration`: **156460byte**, SHA256 **`2d92880ac34a1903f0c32312c4473cfe29d5238566f148859ec62b225f85f63e`**, sameinstallation/**8profil/8identity/43maç/team_document1/platform_document1**,0700/0600 ve bağımsız `pg_restore --list` doğrulandı. Dump repo/Git'e taşınmadı. Worker advisory lock ve tüm persistent tablo kilitleri altında önce gerçek DB dry-run→rollback/state fingerprint birebir, sonra tek transaction commit. **Yalnız Pilot-7BC79727'nin mevcut doğrulanmış PGS bağı orijinal28Mehmethan hesabına taşındı**, bu iki hesabın PGS pending state/exchange'leri geçersizleştirildi; diğer provider/session/accounts dokunulmadı. Tüm platform-dışı tablo satırlarının SHA256 fingerprint'leri birebir, eski player_id/profile/identity/team_document/diğerüye korundu; hiçbir oyuncu/DB silme/restore veya ekonomi merge yok. R2 unit `gridshard-mehmethan-play-migration-20261004-r2.service` **success/ExecMainStatus0**, marker **MEHMETHAN_MIGRATION_PASSED**; aynı r10image/config/volumes/container ile API/Caddy açık, origin+public HTTPS healthy.

Bağımsız post-resume SELECT-only: **28Mehmethan44 kupa /98 Akı /978 kredi /7maç /PGSbağlı**, **Giresunlular2üye/lider28** ve referanslar tutarlı; **Pilot-7BC79727 PGSbağlıdeğil, profil silinmedi**. PGSsubjectsunique/pending0/healthok/PvP0/socket0. Yerel normal PGS auth regresyonu **11/11 geçti**; ilk standart pytest temp klasörü ACL yüzünden11setup error verdi, yeni workspace `--basetemp` ile tekrar geçti, API auth guard'ı değiştirilmedi. Receipt delivery `mehmethan-team-migration-result-20261004.json`; önceki preflight false alanları tarihseldir. **Telefonda agent veri sıfırlamadı veya gerçek yeni login görmedi.** Sıradaki kullanıcı adımı yalnız **GRIDSHARD/com.gridshardgame.app** Android Uygulama→Depolama→Verileri temizle (yerel ayarlar silinebilir; server orijinali ve backup korundu), eski **GRIDSHARD TEST/com.gridshard.remotedebug** dokunulmaz; aynı PGS hesabıyla ilk açılıştaki **PLAY GAMES İLE DEVAM ET** (`login`, SettingsBAĞLA değil). Sonra28Mehmethan/44/98/978/Giresunlular/liderliği kullanıcıdan teyit et. Yeni APK/key/server/reklam-billing açma gerekmez/yapılmadı; maça ancak profil doğru geldikten sonra girilsin. Uç tamamlanmış hesabı ve diğer tester kayıtları korunur. Aşağıdaki backup/onay/PGSbağlıdeğil ifadeleri önceki preflight tarihsel kaydıdır.

**Güncel istek — 28Mehmethan / Giresunlular hesabını Play'e taşı:** Kullanıcı önceki tester sorunlarını hallettiğini söyledi; yeniden OAuth/kurulum hata teşhisine dönme. Eski test APK'lı telefona canonical uygulamayı kurdu, eski profil ve takımın taşınmasını istedi. Yeni adını **Pilot-7BC79727**, eski GRIDSHARD TEST içinde **28Mehmethan / Giresunlular hâlâ göründüğünü** teyit etti; bu cihaz erişimi kullanıcı teyididir, bağımsız USB auth kanıtı değildir. Canlı SELECT-only transaction: toplam7 profil; **28Mehmethan44 kupa /98 Akı /978 Devre Kredisi /7 maç /PGS bağlı değil**, profil takım referansı ile gerçek team_document üyeliği tutarlı; **Giresunlular2 üye, lider28Mehmethan**. Yeni **Pilot-7BC79727 0 kupa /0 Akı /350 kredi /0 maç /takım yok /PGS bağlı**. Her iki hesap contact/diğerOAuth yok; PGS subject'leri benzersiz. İlk healthPvP2, ikinciPvP1/socket0, pending0, healthy. Ham ID/subject/mail/token gösterilmedi. Salt-okunur helper `artifacts/server-aws-20261004-admob-ssv-r10-candidate/mehmethan-team-readonly.sh`; receipt delivery `mehmethan-team-migration-preflight-20261004.json`. **Aktarım, güncel yeni backup, DB/devicedata değişikliği yapılmadı.** Normal `link` korumasını gevşetme: PGS zaten Pilot sahibine bağlı olduğu için eski hesaptaki BAĞLA tek başına taşımaz. Önerilen dar admin adımı: kullanıcı onaylı kısa bakımda aktif PvP/socket0 ve yeni özel doğrulanmış offline backup → yalnız mevcut verified PGS bağını Pilot'tan eski28 hesabına taşı; **orijinal player_id/profil/team_document/diğerüyeler aynı**, ekonomik hesap birleştirme veya eski DB restore/silme yok. Daha sonra sadece yeni canonical uygulamanın boş yerel oturumu bir kez sıfırlanıp aynı PGS ile `login`; eski TEST verileri/uygulaması korunur. Kısa bakım ve canonical yerel oturum sıfırlama için açıklanmış onay henüz yok; alınmadan canlı provider link değiştirme/telefon sıfırlama yapma. Eski Uç backup/helper sabit1PGS/Uç167 kapıları bu yeni işlem için uygun değildir; o helper'ı değişmeden çalıştırma. Canlı aktif maç varken bakım başlatma, guard'ı atlama. Önceki Uç migration tamamlanmıştır, yeniden yürütülmez.

**Güncel tester hata görüntüleri — iki ayrı engel:** Kullanıcı WhatsApp20.31.38/20.30.48 görüntülerini verdi. İlki Google “uygulama testte / yalnız geliştiricinin onayladığı kullanıcılar” ve **403 access_denied**: OAuth Audience test erişimi kısıtı doğrulandı, tam client/düğme/Cloud allowlist kaydı henüz bağımsız okunmadı. Öncelik mevcut bağlı Cloud proje376018782491 → Google Auth Platform → Audience → Test users → Add users ile oyuncunun seçtiği hesabını kontrol/izin/kaydet; önceki PGS tester/release-track izni ayrıca gerekir. AdMob SSV veya AWS sunucu hatasıyla karıştırma; public publish/yeniOAuth/key/scopedep genişletme yok. Ekrandaki üçüncü kişinin adresi kayda alınmadı. İkincisi Play Store canonical`com.gridshardgame.app (unreviewed)` için genel “indirilemiyor”: kök neden **kanıtlanmadı**, unreviewed etiketi gerekçe değildir. Aynı gerçek opt-in/PlayStore hesabı, diğer app indirme/storage/network ve önce canonical APK'nın manuel kurulup kurulmadığı/modelAndroid istenir; kaldırma/oyunverisi/Playverisi silme önerilmez. Receipt `tester-access-errors-20261004.json` delivery klasöründe; docs/PLAY_GAMES güncellendi. Bu tur yalnız kaynak/resmi belge inceleme+receipt/doc; server/device/API/ads/billing/PGSpublicyayın/site değişmedi. Yayıncı Alihan ÖZTÜRK ve30/90 saklama onayı kayıtlı; süreleri uygulama/final politika yayını ayrı açık iş olarak korunur.

**Güncel kullanıcı yanıtı — yayıncı/saklama onayı + tester PGS girişi:** Kullanıcı public adı **Alihan ÖZTÜRK** verdi ve önerilen **yedek30 gün / destek yazışmaları talep kapandıktan90 gün** sürelerini “Uygundur” diyerek onayladı. Public ad yerel TR/EN politika girişlerine eklendi; receipt `publisher-privacy-decisions-20261004.json` delivery klasöründe. Onaylanan süreler henüz canlı expiry/destek süreci olarak uygulanmış/doğrulanmış değildir; false kapılar korunur, güncel yedekler/mesajlar silinmedi ve public site yayını yapılmadı. Kullanıcı ayrıca tester eklediğini ancak onların PGS ile giremediğini bildirdi; hangi liste/kanal/Google hesabı/hata henüz görülmedi. Resmi PGS publish belgesi taslakta tester allowlist veya mevcut release-track PGS erişimi gerektiğini doğrular; en olası eksik Play dağıtım tester listesi ile PGS listesinin karışması, kesin teşhis değil. Sıradaki kullanıcı işlemi PGS → Kurulum ve yönetim → Test kullanıcıları ekranı; tekil Play Games hesaplarını ekle veya mevcut ilgili kanalın Release tracks erişimini etkinleştir, kaydet/yayılmayı bekle. OAuth Audience Testing ise aynı hesap erişimi ayrıca kontrol edilir. İlgili `docs/PLAY_GAMES.md` güncellendi. Uç sahibinin girişi geçti; mevcut 3 Play sertifika/OAuth/server/key yeniden oluşturma/global PGS yayını/oyun verisi silme/ads-billing açma yok. Tester ekleme kapalı-test katılımı ve12/14 süre kanıtı değildir. Giriş engeli öncelikli, saklama uygulaması/final politika yayını ayrı kalan iş olarak sürer.

**Güncel mağaza kontrol paneli — kurulum eksikleri / kapalı test kapısı:** Kullanıcının 20949/20109/201023 ekranları içerik/mağaza kurulum görevlerini ve **kurulum tamamlanana kadar kilitli kapalı testi**, disabled Üretime başvur düğmesini gösteriyor. Hesaba özgü açık koşul **en az12 kapalı test katılımcısı / aralıksız14 gün**, mevcut kayıtlı0; süre başlamış gibi sayılmaz, önceki dahili test bu kapalı-test koşuluna sayılmaz. Resmi belge14151465 ile kontrol edildi; test bittiğinde otomatik yayın değil üretim erişim başvurusu/inceleme gerekir. Yeni receipt `artifacts/android-production-20261004-v1/play-store-dashboard-20261004.json`. İlk görev gizlilik: public `/privacy/` bağımsız HTTPS200/başlıkGRIDSHARD, **canlı eski Oracle metni var/AWS yok/saklama takvimi hâlâ pending**. Yerel `public-site/content.js` AWS düzeltmesi zaten hazır ama yayınlanmış değil. Final politika diye eski sayfayı gönderme, “veri toplanmıyor” veya çocukları kapsamıyor beyanı verme. Devam için yayıncının kullanılacak public geliştirici adı ve gerçek yedek/destek saklama kararı sorulacak; süreler uydurulmaz/uygulanmamış silme otomasyonu var denmez. Bu audit sadece read-only: panel kaydı/public-site deploy/DB/sunucu/device/key/build/ads/billing değişmedi. Kurulum ve gerçek test süreci aynı mevcut paket/PGS/server ile ilerler, yeni altyapı gerekmez. Uç/bakiye kullanıcı teyidi tamamlanmış olarak korunur.

**Güncel sonuç — Play Games ile Uç profili geri geldi:** Kullanıcı **“play games bağlandı, uç oturumu geldi. kupa akı devre kredisi tamam”** diyerek onaylı tek-telefon Play geçişi sonrasında aynı hesabın ve üç bakiyenin devamlılığını teyit etti. Bu hesap geri-dönüş kapısı kullanıcı teyidiyle tamamlandı; yeniden APK kurdurma/PGS istemcisi oluşturma/ikinci telefon isteme yok. Yeni receipt `artifacts/android-production-20261004-v1/play-profile-restore-20261004.json`; migration/device receipt'leri bu teyide bağlandı. Salt-okunur USB envanteri authorized0/unauthorized0/offline0: Play installer/kurulu dağıtım imzası ve tester listesi bağımsız okunmadı; kullanıcı teyidiyle karıştırılmaz. Eski yerel APK hash denetimi tarihsel kaldı, Play APK hash'i gibi sunulmaz. Güncel sunucu yedeği korunur; bu tur cihaz/veri/sunucu/key/ads/billing değişikliği veya build yok. **Sıradaki iş mevcut Play Console GRIDSHARD Kontrol panelindeki mağaza kurulum görevlerini görmek ve tamamlamaktır.** Genel mağaza/AdMob hazırlık onayı, gerçek imzalı reklam maç ödülü, ürünler/Developer API/RTDN ve taşınabilir imza anahtarı yedeği hâlâ ayrı açık kapılardır. AdMob resmi hazırlık belgesi uygulamanın desteklenen mağazada herkese açık kullanılabilir ve AdMob'a bağlı olmasını ister; dahili test/SSV URL başarısı bu onay yerine geçmez. Aşağıdaki “cihaz işlemi/giriş bekliyor”, ikinci cihaz ve kaldırma adımları bu son teyitten önceki **tarihsel** kayıtlardır; tekrar yürütülmez.

**Tek telefon geçişi — güncel yedek tamam, cihaz işlemi bekliyor:** Kullanıcı **“benim porfilim devam et”** diyerek Uç/167 profilini ve güncel yedekten sonra yalnız canonical yerel APK → Play geçişini onayladı. Güncel özel offline yedek **`/var/backups/gridshard-production/20261004-before-device-play-migration`**, dump **136119 byte**, SHA256 **`067319afc7fc079781387209c213fb7c1b6a8fee777ffa910a166fa734254b54`**; klasör0700/dump+manifest0600/sameinstallation/**5 profil/5 kimlik/40 maç/platform_document1**, SHA ve bağımsız `pg_restore --list` okunabilirliği doğrulandı. Dump kaynak/Git/APK'ya taşınmadı ve hiçbir DB restore/silme yapılmadı. AktifPvP0/socket0 kapısında mevcut API/Caddy kısa durdu; aynı container/image/env/volume/PGS secrets ile yeniden açıldı. Restart sonrası profil/identity/PGS link parmak izi/ledger baseline birebir, origin/public HTTPS healthy. İlk operator r1 `docker compose run --no-build` desteklenmediği için yedek dizini oluşmadan durdu ve EXIT korumasıyla mevcut servis yeniden açıldı; log/script korunuyor. Flag kaldırılıp cached maintenance image/pullnever ile r2 başarı: unit `gridshard-device-play-migration-backup-20261004-r2.service` **success/0/active-exited**, operator SHA **`23ecd7fe2b2f1899e1654b1c348c142531ee2495631d5a563ef73336b45dd704`**; **MIGRATION_BACKUP_PASSED**, kritikmarker0. Yeni sunucu/sürüm/anahtar/reklam/billing açma yok. Güncel receipt `artifacts/android-production-20261004-v1/play-single-device-migration.json`; eski readonly preflight false onay/yedek alanları tarihsel olarak korunur. **Telefonda kaldırma/kurulum henüz yapılmadı**; kullanıcı manuel kurulum tercihinde. Sıradaki güvenli kullanıcı adımı: mevcut internaltest4701676007761143472 linkini aynı Google hesabıyla mevcut telefonda aç → tester katılımını doğrula; erişim reddedilirse uygulamayı kaldırma, görüntü al. Katılım başarılıysa yalnız **GRIDSHARD /com.gridshardgame.app** yerel APK kaldır → Play'den aynı mevcut v1 yükle → ilk açılışta **PLAY GAMES İLE DEVAM ET** (`login`); Ayarlar'daki **PLAY GAMES BAĞLA** (`link`) eski sahipli hesaba geri dönmek için uygun yol değildir. Eski GRIDSHARD TEST/com.gridshard.remotedebug ve sunucu hesabı korunur. Yerel oturum/ayarlar silinebilir, yedek bunları kapsamıyor. Uç/167 geri gelmezse maça girme/boş profili bağlama; eski profil korunarak incele. Gerçek Play install/PGS restore/tester list ve genel yayın/AdMob/billing henüz doğrulanmadı. Aşağıdaki onay/yedek-bekleme notu bu kullanıcı teyidinden ve tamamlanan yedekten öncedir.

**Son kullanıcı kısıtı / salt-okunur hesap kontrolü:** Kullanıcı ikinci telefon olmadığını/başka telefonda Play Games ile giremediğini söyledi; ikinci cihaz şartı dayatma. Aynı telefonla geçiş için canonical yerel upload imzası ile Play deployment imzası farklı; mevcut APK üzerine normal Play güncellemesi yapılamaz. Anahtar/paket değiştirme, ADB imza kontrolü aşma, `uninstall -k`/work-profile ile çözülmüş varsayımı veya verisiz-yedek garantisi yok. Canlı r10 readonly audit healthy/aynıinstallation/4 backup SHA0600/PG+Redis, **5 profil/5 kimlik/40 maç**, pending0/kritik0/PvP0/socket0/ad-disabled. SELECT-only transaction ile platform_document içinde **1** benzersiz PGS bağlantısı, eksik profile0, bağlı public profil **Uç /167 kupa**; subject/token/e-posta gösterilmedi. Kodda verified PGS subject sahibine `login` restore desteği mevcut; bu Play fiziksel giriş kanıtı veya koşulsuz geri-yükleme garantisi değildir. Receipt `artifacts/android-production-20261004-v1/pgs-migration-preflight-20261004.json`; readonly helper r10 candidate `pgs-migration-readonly.sh`. **Güncel geçiş-öncesi backup henüz oluşturulmadı, telefon profili eşleşmesi kullanıcıca teyit edilmedi, kaldırma onayı yok ve cihaz/veri değiştirilmedi.** Sıradaki karar: Uç/167'nin mevcut profil olduğunu teyit et ve güncel sunucu yedeği → yalnız canonical yerel APK'nın bir defalık kaldırılması (yerel oturum/ayarlar silinir) → aynı mevcut test linkinden Play kurulum → aynı PGS hesabı ile geri giriş akışı için açık kullanıcı onayı iste. Sunucu hesabı/ilerlemesi ve eski remotedebug uygulaması silinmez. Onaydan önce kaldırma/reset/backup-restore yapma. İkinci cihaz önerisi aşağıda önceki aşama kaydıdır; Play gerçek giriş ve genel yayın/AdMob/billing kapıları halen açık.

**Son katılım bağlantısı:** Kullanıcı `https://play.google.com/apps/internaltest/4701676007761143472` bağlantısını paylaştı. Web okuyucuda sayfa içeriği gösterilemedi; bu bağlantının bozuk olduğuna veya Google/oyun hatası olduğuna kanıt değildir. Kullanıcı hesabıyla erişim, seçili tester listesi, katılım ve kurulum henüz doğrulanmadı. URL biçiminden dahili uygulama paylaşımı olduğuna karar verme/ek sertifika veya yeni APK isteme; son ekran etkin dahili test kanalıdır. Sıradaki işlem canonical sideload bulunmayan diğer Android cihazda listede/PGS test listesinde olan aynı Google hesabıyla bağlantıyı aç → tester katılımı → Play'den yükleme → isim/kupa/ilerleme kontrolü. Mevcut telefondaki upload imzalı canonical APK'yi kaldırma/veri silme yok. İkinci uygun cihaz yoksa güvenli kanal geçişi için yön istenir. Genel yayın/AdMob gerçek ödül/billing tamamlandı denmez.

**Son Play ekran kanıtı — 165644:** Kullanıcının ekranında Dahili test kanalı **Etkin**, son sürüm **1 (2.1.0-beta.72)**, yeşil **“Dahili test kullanıcıları tarafından kullanılabilir”**, Console gösterimiyle **4 Eki 15:40 tarihinde kullanıma sunuldu**, **İncelenmedi**. Dolayısıyla mevcut v1 dahili yayın adımı geçti; yeniden yayınlatma/AAB yükletme yok. Geçici ad `com.gridshardgame.app (unreviewed)` normal ilk mağaza incelemesi öncesi etiketi, PGS oyuncu adı değildir; genel Play mağaza onayı değildir. Sıradaki adım aynı sayfanın Test kullanıcıları sekmesinde denenecek hesabın bulunduğu e-posta listesinin seçilip kaydedildiğini kontrol et, katılım bağlantısını al, canonical sideload bulunmayan diğer Android cihazda aynı PGS hesabıyla Play'den yükleyip ilerlemeyi doğrula. Liste/katılım/Play gerçek giriş ve AdMob hazırlık durumu henüz görülmedi. Yerel upload imzalı mevcut telefondaki canonical uygulamayı veya debug uygulamasını kaldırma/veri silme yok. Supplement receipt bu ekran kanıtını genel yayın ve fiziksel Play girişinden ayrı kaydeder. Aşağıdaki dahili yayın bekleme notları önceki aşama kaydıdır.

**Son kullanıcı teyidi — üç Play OAuth bağlandı:** Kullanıcı üç Cloud Android istemcisini oluşturduğunu, ardından Play Console PGS yapılandırmasında mevcut GRIDSHARD oyununa üçünü bağlayıp kaydettiğini **“bağlandı”** diyerek teyit etti. Bu kullanıcı teyididir; Cloud/PGS paneli bağımsız okunmadı, Play'den kurulmuş APK ile gerçek giriş henüz denenmedi. `device-validation.json` kullanıcı teyidini bağımsız fiziksel doğrulamadan ayrı kaydeder. Cloud/PGS kurulumunu yeniden yaptırma veya yeni APK/AAB üretme yok. Sıradaki adım mevcut v1 dahili test sürümünün yayın durumunu ve test kullanıcı listesi/katılım bağlantısını kontrol et; Play dağıtım imzasıyla aynı hesabın ilerlemesini doğrula. Telefonda yerel upload imzalı canonical APK bulunduğu ve Play deployment imzası farklı olduğu için uygulamayı kaldırma/veri silme talimatı verme. Önce canonical sideload kurulmamış başka Android cihazla Play kanalı doğrulanmalı; böyle cihaz yoksa kullanıcıdan yön al ve güvenli geçiş planla. Debug ve server OAuth istemcileri, canlı sunucu/veriler ve gerçek ad/billing kapıları korunur. Aşağıdaki Cloud/PGS bağlama bekleme notu bu teyitten öncedir.

**Son Play sertifika sonucu — certificates.zip:** Kullanıcının verdiği ZIP bellek içinde okunarak üç public DER sertifikası doğrulandı; private key yok. ZIP SHA256 `84e9eb276a2a5a2e0a419e4db6e0020e86d5276c4137dbe0ac9d306cb4cf24ec`. Verilen SHA1 `7C:FD:F8:68:FE:78:6E:BA:DF:B0:3B:31:D8:E6:15:5B:05:55:B0:0F` / SHA256 `09:6A:CD:18:59:57:46:7C:B9:25:92:00:74:12:C3:19:B6:42:BA:3C:EE:C4:DB:CB:8E:D7:A6:48:21:3C:A0:E6` deployment cert ile eşleşir. Ek hybrid classical SHA1 `7B:97:CD:22:11:1B:F6:0F:68:F0:1A:D2:E8:79:05:38:B7:99:BD:12`, hybrid PQC SHA1 `B4:4E:55:F6:80:66:66:DE:83:2F:EF:7C:EE:99:CF:E9:1B:8E:C7:63`. Tüm SHA1/SHA256 public manifest `config/android-play-certificates.json`; güncel tek-seferlik talimat `docs/ANDROID_PRODUCTION_SETUP.md`. Google resmi güncel Play App Signing belgesi hibrit üç parmak izinin API sağlayıcılarına kaydını ister. Sıradaki dış adım aynı Cloud proje376018782491/paketcom.gridshardgame.app için üç ayrı Android OAuth (mevcut aynı paket+SHA1 varsa yeniden üretme) → mevcut aynı PGS oyununa Android kimlik bilgisi olarak bağla/kaydet. Debug/yerel release/server istemcileri korunur. Sertifika teslimi doğrulandı, **Cloud/PGS bağlaması ve Play'den giriş henüz doğrulanmadı**. Yeni APK/AAB/key yok, cihaz verisi silme yok, canlı env/assetlinks/restart/ad/billing açma yok. Eski aşağıdaki sertifika-bekleme satırları önceki aşama kaydıdır. Play signing ekranının yeni rotası Google Play ile korunanlar → Google Play Store koruması → Google Play Uygulama İmzalama'yı yönetin; anahtar değiştir/yükselt yapılmaz.

**Son Play inceleme ekranı — 152737:** Dahili test v1 ekranında0 görünen hata/3 uyarı ve “Kaydet ve yayınla” açık: test kullanıcıları yok; R8/ProGuard mapping yok; native debug symbols yok. `android/app/build.gradle` release `minifyEnabled false`, outputs içinde mapping/symbol ZIP üretilmemiş. Mapping yokluğu bu non-minified build için beklenen; native symbols teşhis iyileştirme eksiği, bu üç uyarı dahili dağıtım engeli değil. Şimdi aynı v1'i dahili kaydet/yayınla, Dahili test → Test kullanıcıları altında telefondaki Google hesabını e-posta listesine ekle/listesini seç/kaydet; PGS test kullanıcılarından ayrı. Sonra Uygulama bütünlüğü → Uygulama imzalama **uygulama imzalama anahtarı sertifikası SHA1** (upload değil) alınarak PGS ayrı istemci bağlanacak. Gerçek yayınlanma/Play sertifikası/testliste kaydı henüz teyit edilmedi; APK/AAB yeniden üretme, R8'i sırf uyarı için açma, sunucu değişikliği yok.

**Son Play ekranı:** Kullanıcının `Ekran görüntüsü_4-10-2026_152419_play.google.com.jpeg` görüntüsünde “Dahili test sürümü oluşturma” içinde App bundle sürüm1(2.1.0-beta.72), API24+, hedefSDK36 listeleniyor. Sürüm adı mevcut1(2.1.0-beta.72), tr-TR notları henüz placeholder; İleri açık. Bu dosyanın sürüm taslağında görünme kanıtı, Play genel yayın/onay/dağıtım sertifikası veya reklam/ödeme aktivasyon kanıtı değildir. Sonraki kullanıcı adımı gerçek kapsama uygun kısa tr-TR sürüm notları → İleri → hata/uyarı kontrolü; Play App Signing SHA1 ayrıca beklenir. AAB/anahtar/sunucu yeniden üretme veya genel yayını açma yok.

**Güncel sonuç:** Kalıcı release APK/AAB üretildi/denetlendi; SSV düzeltmesi **r10 canlıya aktarıldı**. Kullanıcı mevcut AdMob alanlarıyla Verify → Use → Save başarısını teyit etti. Aşağıdaki “sürüyor/henüz üretilmedi/canlı r9” satırları hazırlık geçmişidir.

**Kullanıcı sonucu:** “Doğrulandı ve kaydedildi” yanıtıyla AdMob gerçek panel Verify/Use/Save başarılı. 403 aşaması geçildi; aynı testi veya eski ekranı yeniden isteme. Ardından kullanıcı kalıcı APK'yı elle kurdu ve **“play games hesabı ile giriş tamam, oyuncu adı, kupalar vs. tamam”** dedi. Kalıcı APK kurulumu salt-okunur paket/sürüm/kurulu base.apk SHA256 ile ayrıca doğrulandı; PGS giriş/ilerleme devamlılığı kullanıcı teyidine dayanır. Bu sonuçlar gerçek reklam gösterimi/maç bonusu veya Play dağıtım imzası onayı değildir. Rolloutdisabled gerçek ödeme/ödül henüz kapalıdır.

**Son kontrol / sıradaki adım:** Telefon1 authorized; `com.gridshardgame.app` versionCode1/versionName2.1.0-beta.72/min24target36/non-debug ve kurulu base.apk teslim hash **73f135d505eca24aa751b05e92d5c59fcfbf748558bb550b4d368fe446c4efff** ile aynı; eski `com.gridshard.remotedebug` duruyor. Uygulama özel storage/hesap verisi okunmadı; kontrol anında canonical foreground değildi, kullanıcı giriş sonucunu bildirdi. Supplement receipt `artifacts/android-production-20261004-v1/device-validation.json`; ilk `release-audit.json` build-zamanı false kapıları tarihsel olarak korunur. Son readonly r10 audit: aynı kurulum/4 backup SHA0600/PG+Redis sağlıklı, **4 profil/4 kimlik/40 maç**, pending0, kritik0, aktifPvP0/socket0; SSV1/rolloutdisabled/test0. Yeniden başlatma/env/veri/reklam açma yok. Sıradaki dış adım mevcut AAB ile Play dahili sürüm yükleme/Play App Signing sertifikası, sonra store ürün/API/RTDN ve genel yayın beyanları. AdMob uygulama hazırlık durumu/onayı henüz görülmedi; SSV panel başarısıyla eş tutulmaz. Kullanıcıya kendi gerçek reklamına tıklama/gelir amaçlı izleme veya test-ad=SSV kanıtı talimatı verme. Aşağıdaki PGS/USB-kurulum bekleme satırları önceki aşamaların tarihsel kayıtlarıdır.

**PGS / cihaz sonraki adım:** Kullanıcı `143824`/`143841` kimlik ekleme ekranlarını verdi; aynı oyun376018782491, Android seçili, OAuth uygun istemci listesi boş. Ad GRIDSHARD, yeni-yüklemeler kutusu şimdilik boş, anti-piracy kapalı; ayrı Android OAuth `GRIDSHARD Android Release`, canonical paket ve yukarıdaki public releaseSHA1 ile oluştur → yenile → seç → kaydet adımları verildi. Kullanıcı “tamam” dedi; bu yanıt adımların alındığını gösterir, PGS cihaz başarı kanıtı değildir. Son salt-okunur `adb devices` listesi **boş**; bu tur APK kurma/başlatma/veri silme veya gerçek reklam/ödül açma yok. Telefon USB bağlantısı/hata ayıklama izni bekleniyor; eski debug uygulaması korunarak kalıcı APK/aynı PGS hesap devamlılığı kontrol edilecek.

**Son USB denemesi:** Kullanıcı “bağlandı” dedi; salt-okunur envanter1 authorized/0 unauthorized/0 offline, yalnız `com.gridshard.remotedebug` kurulu. Teslim APK SHA256/imza tekrar doğrulandı; canonical paket yok, SDK>=24 kapısı geçti. Yeni paket `adb install` denemesi **INSTALL_FAILED_USER_RESTRICTED: Install canceled by user** ile reddedildi; başarı sayılmaz, otomatik tekrar veya güvenlik ayarı değiştirme yok. Son pm listesinde yine yalnız eski debug paketi var; canonical APK kurulmadı/başlatılmadı, eski uygulama/verileri silinmedi. Marka Xiaomi, model25113PN0EG; cihaz seri numarası/kimliği/hesap verileri gösterilmedi. Telefonda USB kurulum izni/onayı için kullanıcı işlemi gerekli. PGS gerçek giriş/hesap devamlılığı ve gerçek reklam/ödül/billing kapıları hâlâ doğrulanmış değil.

- Canlı root `/opt/gridshard/releases/aws-20261004-admob-ssv-r10/GRIDSHARD-2.1.0-beta.72-signatures-social`; image `gridshard-production-relay-web:admob-ssv-r10-20261004`, actual Docker ID **`sha256:0726e9dfd3837a2f63622f0987dc1c25ec6a2d6a1e7f1c4bf519090cee5db65d`**. R9 rollback `before-admob-ssv-r10-20261004` = `sha256:f3eed74740532334eb6f236ad361572d89e2bcee62b55afb97d1fd4d16268329`. Aynı production PG/Redis/HTTPS/secrets/PGS; gerçekads/ödül/ödeme/test0 **hâlâ kapalı**. Paket SHA **`15bb149ee180f434319364540a5a017681fdef59886d17fd521e068d19cbb69c`**,838+manifest. Tam yerel server **1062/36skip**, client **157/157**, build/publicsite **15/15**. İlk sandbox TEMP ACL hataları izin/basetemp ile tekrar geçti.
- Ayrı PG/Redis **91/91 +90s** imaj lease/profile/restart/boş-hedef backuprestore; RAM-only independent UTF-8/tamper + reserved panel probe testleri geçti. DB/lease şeması değişmedi; r9 uzun330s kanıtına ek scoped90s kontroller kullanıldı. İzole kaynaklar temizlendi; üretim DB restore/silme yok.
- Yeni offline backup `/var/backups/gridshard-production/20261004-before-admob-ssv-r10`, SHA/0600/sameinstallation/counts doğrulandı; **3 profil/3 kimlik/40 maç**, pending0. Eski r7/r8/r9 ile **4/4** backup audit geçti. Root0500 operator SHA **`c1c60f8b69e689e0625b5642bfc2e51ea2bceeb35a4f61a1dd57afdc5420bf4a`**, job `gridshard-admob-r10-deploy-20261004.service` **success/0/active-exited/DEPLOYMENT_PASSED**. OriginTLS200/verify0/publicHTTPS200 +90s/9healthy/kritik0, son audit sağlıklı/aktifPvP0/socket0.
- Teslim `artifacts/android-production-20261004-v1/`: **GRIDSHARD-2.1.0-beta.72-v1.apk**18.958.855byte SHA **`73f135d505eca24aa751b05e92d5c59fcfbf748558bb550b4d368fe446c4efff`**, **.aab**18.390.136byte SHA **`dd2f2f08aa691263425fd079258f17ec37a5f790272b020111340c766fdfb9cd`**. pkgcom.gridshardgame.app/versionCode1/versionName2.1.0-beta.72/min24target36/mobilebuild **8d95b420f541bb12**. APKv2RSA3072 verified; debugfalse/AD_ID+AdServices yok/cleartextfalse/backupfalse/server.url yok;61webasset disthashaynı. AABjarverified (self-signed/noTSA + AGP ZIP manifest-order uyarıları, Play upload/validation henüz yok). Son offline Gradle başarılı; artifacts `release-audit.json` ayrı fiziksel/yayın/ödül/billing kapılarını false kaydeder.
- Public cert SHA1 **`E4:8A:96:52:1E:5B:A2:AB:53:CE:17:96:BE:D3:2E:3F:6E:B7:EB:7B`**, SHA256 **`03:A4:5C:59:28:F2:4B:5D:79:DC:A8:73:1C:C5:54:C2:24:88:E2:C4:B1:82:A2:E7:DA:39:E3:C3:23:F6:1F:88`**. Public DER/JSON teslim klasöründe; özel p12/DPAPI parola secrets/ACL dışında kopyalanmadı. **Portable key backup yok**; anahtar tekrar üretilmez.
- Dış kapılar: AdMob actualGooglepanel200/save tamamlandı; canonical sideload APK kurulumu/hash bağımsız, PGS giriş/hesap devamlılığı kullanıcıca tamamlandı. Play signingcert+PGS/AppLinksSHA256, gerçekadödültekliği, AdMob uygulama hazırlık onayı, Play10ürün+DeveloperAPIserviceaccount+RTDN/iade, publicpolicy saklama/yayıncı/yaşbeyanları ve Playmağazaonayı henüz gerekli. **Real ad/billing/general publish tamamlandı denmez**. Kalıcı APK telefonda, eski debug uygulaması/hesap korundu. `docs/ANDROID_PRODUCTION_SETUP.md` tüm bir-defalık dış adımları toplar.
- Son yerel public-site kopyası TR/EN eski “planlanan Oracle” ifadesini mevcut AWS oyun sunucusuna göre düzeltir; saklama takvimi uydurulmadan genel yayın öncesi eksikliği açık tutulur. Bu son metin **henüz public siteye yayımlanmadı**, immutable r10 kaynak ZIP'i ve APK/AAB değiştirilmedi. Son public-site regresyonları **7/7** ve diff-check geçti; APK/AAB SHA256 teslim kaydıyla tekrar eşleşti.

Önceki r9 panel retry yine403: canlı güvenli reason audit **unknown_ad_unit4 / missing_signature1**; sonuncu bizim unsigned smoke. Google imzası artık geçiyor; unit aşamasındaki ret doğrulandı, ham callback birimi gösterilmedi/formatı kesin bilinmiyor. Kullanıcı artık kalıcı APK/gerçek reklam/ödül/mağaza/aynı üretim altyapısını istedi. **Yeni imza anahtarı yoktu; Play ürünleri ve API erişimi henüz yok** (kullanıcı yanıtı).

- Yerel: SSV kayıtlı exact-full/numeric unit kabulü; yalnız Google imzalı güncel reserved panel probe çifti200/ignored, live modda dahi ekonomi/profil transaction yok; foreign publisher/tamper/stale/real oyuncu yanlış birim403. İlgili server57/57 geçti.
- Yerel: explicit canonical non-debug release ads config, native live guard canonical/no-testdevices, nondebug manifest metadata; default ve debug kapıları korunur. Permanent `android/` üretildi. Kalıcı RSA3072 upload key `secrets/android-release/` içinde, parola DPAPI/ACL korunur; **portable backup henüz yok**. Özel anahtar/parola asla okunup gösterilmez, üstüne üretim yok.
- Yerel: gerçek native bölge fiyatı/tek teklif eşleme, eksik/ambiguous fiyatın ödeme başlatmasını engelleme; istemci157/157. Kaynak `docs/ANDROID_PRODUCTION_SETUP.md` kurulum/ürün10liste/PGS/Play Signing/servis hesabı/RTDN dış adımları toplar. Ürün/API yokken gerçek satış açılmaz.
- İlk offline release Gradle, resmi Maven'de önbellekte olmayan5 lint bağımlılığı yüzünden başarısız; normal online derleme sürüyor. APK/AAB henüz doğrulanmış/teslim edilmiş sayılmaz. Yeni fiyat kodu eklendiği için derleme bittikten sonra yeniden sync/build gerekli. Debug uygulaması kurulu/hesap verisi korundu, release telefona kurulmadı.
- Canlı hâlâ r9/rolloutdisabled, veri3/3/39; yeni fix deploy/AdMob panel doğrulama/PGS permanent certificate binding/gerçek ad ödül ve ödeme tamamlanmadı. Anahtar ve ürün yokluğunu sahte başarıyla kapatma. Aynı production DB/Redis/HTTPS kullanılacak, yeni altyapı yok.

## Güncel tamamlanan — SSV imza-kodlama düzeltmesi canlı r9 (4 Ekim 2026)

Kullanıcının yeni yedek/kısa bakım onayıyla **r9 backend aktarımı tamamlandı**. SSV1, rollout `disabled`, allowlist boş, gerçek reklam/ödül ve test ödülleri0; yeni APK yok, mevcut r8 APK korundu. Aşağıdaki onay bekleme/yerel/sürüyor kayıtları bu işlemin tarihsel hazırlık aşamalarıdır. **Gerçek Google panel callback başarısı henüz kullanıcı tarafından yeniden test edilmedi**; r9 aktarım başarısı SSV panel başarı kanıtı veya canlı reklam açma yetkisi değildir.

- `[x]` Kaynak paket: `artifacts/server-aws-20261004-admob-ssv-r9-candidate/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`, SHA **`639e231fabb103c222d14c1d4169d10000f4dc9c20144e8c4f9b163e54cbf92c`**, 758 + manifest. Paket/code/test bu immutable snapshot'tan alındı; bu tamamlanma kaydı paket üretiminden sonra eklendi. Eski paket/APK/yedekler korunur.
- `[x]` Canlı root `/opt/gridshard/releases/aws-20261004-admob-ssv-r9/GRIDSHARD-2.1.0-beta.72-signatures-social`; API tag `gridshard-production-relay-web:admob-ssv-r9-20261004`, image **`sha256:f3eed74740532334eb6f236ad361572d89e2bcee62b55afb97d1fd4d16268329`**. R8 rollback `before-admob-ssv-r9-20261004` = **`sha256:a4e161772bd4f53de07a76861890e4c8731f8a68f769fad1f99b66e0eac6a881`**. Eski env/release değiştirilmedi. Production/Cloudflare/PGS üç Compose katmanı, kalıcı PostgreSQL/Redis/runtime birimleri, private secrets ve yalnız TCP443 korundu; DNS/AWS/firewall değişmedi.
- `[x]` Tam yerel server **1056 geçti / 36 dış servis testi atlandı**. Ayrı etiketli loopback PG/Redis ortamında **85/85**, yeni imajda **330s** lease/profil + restart + boş hedef backup/restore geçti. Yeni imajda bağımsız plaintext Türkçe imza/tamper testi geçti; test anahtarı yalnız RAM fixture'ında, üretim trust'a eklenmedi. Test container/network/anonim volume'ları temizlendi. Üretim veritabanına restore/silme yok.
- `[x]` Aktif PvP/socket0/pending0 kapısı, taze offline backup `/var/backups/gridshard-production/20261004-before-admob-ssv-r9`, aynı installation/counts/SHA/0600 doğrulandı. Son canlı **3 profil / 3 kimlik / 39 maç**, pending0; yeni yedek3/3/39, eski r8 yedek3/3/39 ve r7 yedek3/3/31 tekrar doğrulandı. Image rollback canlı veriyi eski dump'a döndürmez.
- `[x]` Root0500 digest/syntax doğrulanmış operatör betiği SHA **`2afaeb9ef6fa73846a00ee1863ca0751f96c6ae1adf317af817db37543eb6676`**; SSH'den bağımsız `gridshard-admob-r9-deploy-20261004.service` **Result=success / ExecMainStatus=0 / active/exited / DEPLOYMENT_PASSED**. OriginTLS200/verify0, publicHTTPS200/assetlinks/web UI, UID10001/PGS private400 mount ve Google production public key erişimi geçti. Canlı **+330s / 33 sağlıklı kontrol**, kritik marker0; son salt-okunur audit sağlıklı, aktif PvP/socket0. Ham günlük/URL/signature/oyuncu kimliği gösterilmedi.

**Sıradaki kullanıcı işlemi:** Mevcut AdMob doğrulama penceresinde URL ve alanları değiştirmeden **URL'yi doğrula**'ya yeniden bas: `https://play.gridshardgame.com/ads/admob/ssv`, User ID `gridshard-ssv-probe-20261004`, Custom data `probe-no-battle-20261004`. Başarılıysa doğrulanan URL'yi kullan → Kaydet; yalnız yeni sonuç ekranını iste, aynı eski tam ekranı yeniden isteme. 403 sürerse ignored `artifacts/server-aws-20261004-admob-ssv-r9-candidate/ssv-rejection-readonly.sh` son10dk yalnız sabit neden kodlarını sayar, ham callback verisi göstermez. İmza güvenini gevşetme/Google test key ekleme/gerçek ödül açma yok; ret nedenine göre araştır. Reklam cihaz/kitle/onay ve genel yayın kapıları ayrıca çözülmelidir.

## Güncel devam — AdMob panel 403 düzeltmesi r9 aktarımına onay verildi

Kullanıcı yeni yedek/kısa bakım ve reklam/ödül kapalı tutulması teklifine **“onaylıyorum.”** dedi. R9 aktarımı bu sınırlarla başlatıldı. Başlangıç salt-okunur r8 audit3/3/39, pending0, aktif PvP/socket0, kritik marker0; eski iki backup SHA/0600 ve aynı installation doğrulandı. Yeni r9 release/imaj/backup/job/temp adları boş, disk10.46GiB / MemAvailable1237.8MiB. Paket yeni namespace'e yükleniyor; ilk aşama yalnız ayrı imaj/test ortamı, canlı yeniden başlatılmadı. Bu satır süreç kaydıdır; tamamlanma/gerçek Google callback başarısı değildir.

R9 paket SHA/CRC/path doğrulandı ve yeni root `/opt/gridshard/releases/aws-20261004-admob-ssv-r9/GRIDSHARD-2.1.0-beta.72-signatures-social` hazırlandı; private env r8'den izin/sahip korunarak kopyalandı, SSV1/rolloutdisabled/test0 dışında genişleme yok, eski env değişmedi. Yeni API imajı **`sha256:f3eed74740532334eb6f236ad361572d89e2bcee62b55afb97d1fd4d16268329`**, tag `admob-ssv-r9-20261004`; r8 rollback `before-admob-ssv-r9-20261004` korundu, running/latest değişmedi. Ayrı etiketli loopback PG/Redis ortamında **85/85** test geçti (Starlette/httpx deprecation uyarısı, hata değil); 330s imaj soak/restart/restore sürüyor. Canlı aktarım henüz başlatılmadı. Operatör betiği digest **`2afaeb9ef6fa73846a00ee1863ca0751f96c6ae1adf317af817db37543eb6676`**, yeni job `gridshard-admob-r9-deploy-20261004.service`; root0500 kurulum/launch yalnız izole kontroller geçince yapılacak.

İzole **85/85 +330s + imaj restart/boş-hedef restore** tamamlandı; yeni imajda bağımsız UTF-8 plaintext imza/tamper testi de geçti (RAM-only fixture, gerçek Google callback/ödül değil). Fixture PG/Redis/container/network temizliği tamamlandı, gerçek üretim verisine dokunulmadı. Receipt `ssv_percent_encoding_passed:true`, image+ZIP digest bağını doğrular. Operatör hash/bash syntax/root0500 doğrulandı ve onaylı job SSH'den bağımsız başlatıldı. İlk canlı kapılar aktif PvP/socket0, aynı üretim birimleri/secrets/SSVonly ve pending0; yeni offline backup `/var/backups/gridshard-production/20261004-before-admob-ssv-r9` installation/counts/SHA/0600 doğrulandı. İş hâlâ `activating/start`; **tamamlandı denmez**, canlı +330s ve son audit beklenir. İzleme yalnız `progress-readonly.sh` güvenli allowlist satırlarını gösterir, ham günlük gösterilmez; sistemd/log adı yeniden kullanılmaz.

Kullanıcının `Ekran görüntüsü_4-10-2026_125624_admob.google.com.jpeg` görüntüsünde callback URL `https://play.gridshardgame.com/ads/admob/ssv`, User ID `gridshard-ssv-probe-20261004`, Custom data `probe-no-battle-20261004` **doğru ve dolu**, fakat panel HTTP403 alıyor. Aynı ekranı yeniden isteme; URL/birim/ödül etiketi/probe alanlarını değiştirtme. Son salt-okunur r8 denetimleri sağlıklı; canlı profil/kimlik/maç **3/3/39**, pending0, kritik marker0, SSV açık / gerçek reklam ve ödül kapalı. Bu hata düzeltmesinde canlı deploy/restart/env/DB değişikliği yapılmadı.

- `[x]` Yerelde bağımsız EC anahtarıyla Google biçiminde imzalanmış Türkçe `Savaş ödülü artırımı` sorgusu önce eski doğrulayıcıda `invalid signature` hatasını yeniden üretti. Google'ın [Tink referansı](https://github.com/tink-crypto/tink-java-apps/blob/main/rewardedads/src/main/java/com/google/crypto/tink/apps/rewardedads/RewardedAdsVerifier.java) `URI.getQuery()` kullanır; [resmî encoded-URL regresyonu](https://github.com/tink-crypto/tink-java-apps/blob/main/rewardedads/src/test/java/com/google/crypto/tink/apps/rewardedads/RewardedAdsVerifierTest.java) imzalanan metindeki `%20`/`%40` çözümünü açıkça doğrular. Eski kod ham percent-encoded byte'ları doğruluyordu. Bu kesin bir yerel uyumluluk hatasıdır; **gerçek panel isteğinin ret nedeni henüz yakalanmadı**, dolayısıyla panel 403'ünün tek nedeni olarak ilan edilmez.
- `[x]` `store_verification.py` imza öncesi **bir kez** UTF-8 percent-decode yapar; sıra, Unicode ve literal `+` korunur. Ham sorguyu yeniden kodlama/sıralama, iki imza biçimini kabul eden fallback, Google test anahtarını üretime ekleme, her isteğe200 veya gerçek oyuncu ödülü yok. İş alanları ayrı özgün sorgudan çözülür; yinelenen alanlar ve escape edilmiş `&` belirsizliği reddedilir, signature/key_id son iki alandır. Oyun yalnız sunucunun ürettiği devre/maç kimliklerini kullanır; kimliklerin içine alan ayırıcı gömülmesi desteklenmez.
- `[x]` Callback reddi yalnız sabit allowlist neden koduyla loglanır (`admob_ssv_rejected reason=...`); URL/signature/key/user/battle/ham hata loglanmaz. Kapalı rollout, geçerli imzadan sonra oyuncu transaction'ına hiç girmez. Türkçe/boşluk/@/+/emoji/literal-percent, kodlama bozulması, alan/trailer belirsizliği, tampering, eski yanlış imza biçimi ve PII'siz log regresyonları eklendi. Decode helper'ından bağımsız plaintext Türkçe imza regresyonu dahil son tam etkin server pytest **1056 geçti / 36 dış servis testi atlandı** (38.22s, exit0); `git diff --check` temiz. İzole gerçek PG/Redis/imaj testleri bu yeni düzeltme için henüz çalışmadı; önceki r8 sonuçları yeni imajın kanıtı değildir.

**Sonraki adım:** Düzeltme için yeni benzersiz kaynak ZIP/imaj, izole PG/Redis + restart/boş hedef restore + lease testi; aktif PvP/socket0, yeni özel backup, aynı üç Compose katmanı/birim/sırlar, r8 image rollback ve kısa bakım ile backend aktarımı gerekir. Önceki r8 dağıtımı tamamlanmış bir işlemdir; yeni kısa bakım için kullanıcı onayı istenir. Reklam rollout'u `disabled`, SSV1 ve test ödülleri0 kalmalıdır; yeni APK gerekmez. Aktarım doğrulanmadan kullanıcıdan paneli tekrar denemesini isteme. Sonra aynı probe değerleriyle URL'yi doğrula; başarı ekranı gelirse doğrulanan URL'yi kullan → Kaydet. Başarı kanıtı olmadan gerçek Google SSV tamamlandı deme.

Yerel immutable aday paket: `artifacts/server-aws-20261004-admob-ssv-r9-candidate/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`, SHA-256 **`639e231fabb103c222d14c1d4169d10000f4dc9c20144e8c4f9b163e54cbf92c`**, 758 kaynak + manifest; ZIP isim/boundary/duplicate/private/generated kontrolleri geçti. Paket oluşturulduktan sonra bu kayıt eklendi. Paket/imaj canlıya aktarılmadı; mevcut r8 ZIP/imaj/APK/yedeklere dokunulmadı. İmaj build/izole kontroller ve kısa bakım henüz yapılmadı.

## Güncel tamamlanan — yalnız SSV doğrulayıcı canlı r8 (4 Ekim 2026)

Kullanıcı kısa bakım, yeni yedek ve image rollback kapılarıyla yeni backend dağıtımına **“onaylıyorum”** dedi. **Dağıtım tamamlandı:** `GRIDSHARD_ADMOB_SSV_ENABLED=1`, rollout `disabled`, test oyuncu listesi boş; gerçek reklam/ödül/test ödülü kapalı. R8 APK korunur; yeni APK gerekmez. Aşağıdaki eski “onay beklenir/SSV kapalı” kayıtları artık tarihseldir.

Etkin pytest ayarı `server/pytest.ini` kullanılmalıdır: repo kökünden ilk deneme `docs/archive` testlerini toplayıp 11 collection hatası verdi; doğru server çalışma dizininde **1039 geçti / 36 atlandı**. Yeni signature-only regresyonu, kapalı rollout'ta imzalı isteğin oyuncu transaction'ına hiç girmediğini doğrular. Son tam sunucu **1040 geçti / 36 atlandı**, istemci **154/154**, ZIP sınırları/diff-check temiz. Atlanan izole dış servis testleri aşağıdaki ayrı gerçek ortamda ayrıca çalıştırıldı; skip listesi zorla kapatılmadı.

- `[x]` Paket `artifacts/server-aws-20261004-admob-ssv-r8-final/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`, 758 + manifest, SHA-256 **`69224623f42ae4b7bd3e15be8b612bc7290f6fb2dee2eb09ad04971e23756ee2`**. İlk candidate ZIP ve eski paketler korundu. Artifacts/dist/özel sır/runtime veri ZIP'de yok. Bu tamamlanma kaydı paket üretiminden sonra yazıldı.
- `[x]` Canlı root `/opt/gridshard/releases/aws-20261004-admob-ssv-r8/GRIDSHARD-2.1.0-beta.72-signatures-social`; imaj `gridshard-production-relay-web:admob-ssv-r8-20261004` / **`sha256:a4e161772bd4f53de07a76861890e4c8731f8a68f769fad1f99b66e0eac6a881`**; Docker web build `4dc32723776e5205`. Eski r7 `before-admob-ssv-r8-20261004` rollback tag'i ve eski env/release korunur. Production + Cloudflare + PGS üç katman/aynı birimler/sırlar/yalnız TCP443 korundu; DNS/AWS/firewall değişmedi; mobil dist aktarılmadı.
- `[x]` Etiketli, yalnız loopback portlu ayrı PG/Redis fixture'larında **49/49**, gerçek imajda **330 saniye** lease/profil + restart + boş hedefe backup/restore geçti. SSV açık ama eski/yeni capability isteklerinde sağlayıcı/birim/policy kapalı, imzasız callback403. Geçici test DB/container/network/anonim volume'ları temizlendi; üretim volume'u silinmedi.
- `[x]` Aktif PvP/socket0 kapısından sonra kısa API/Caddy duruşunda yeni özel backup `/var/backups/gridshard-production/20261004-before-admob-ssv-r8` alındı: aynı installation, **3 profil/3 kimlik/39 maç**, SHA/0600 doğru; pending0. Eski `20261003-before-repair-r7` backup3/3/31 de korundu ve son audit'te tekrar doğrulandı. Açılışta veri/ledger sayıları değişmedi. Canlı DB restore/silme yok; image rollback veriyi eski dump'a döndürmez.
- `[x]` Root0500 operatör betiği SSH kopuşundan bağımsız systemd tek-sefer işi: **Result=success / ExecMainStatus=0 / DEPLOYMENT_PASSED**. İç/OriginTLS/edgeHTTPS200, assetlinks, PGS UID10001/private400 mount ve gerçek container'dan Google public key erişimi geçti. Public imzasız SSV403. **330 saniye canlı HTTPS/lease/persistence** ve son salt-okunur audit hatasız; kritik log marker0, ham log/installation/sır gösterilmedi. Son hesap/maç sayıları aynı.

**Sıradaki kullanıcı işlemi:** Mevcut AdMob `Android_SavasSonu_Odullu` → Gelişmiş ayarlar → SSV kalemi → URL'yi ayarla/doğrula. URL `https://play.gridshardgame.com/ads/admob/ssv`, User ID `gridshard-ssv-probe-20261004`, Custom data `probe-no-battle-20261004`: ikisi de dolu, gerçek hesap/maç değil. URL'yi doğrula → başarılıysa doğrulanan URL'yi kullan → Kaydet. Sonuç ekranını iste; önceki ayar ekranını yeniden isteme. **Gerçek Google imzalı panel callback henüz görülmedi**; yerel ECDSA testi/Google key erişimi bunun yerine geçmez. Panel agent tarafından değiştirilmedi. R8 test hash'i boş/UMP-only; gerçek reklam/ekonomi açılması ayrıca yetki ve çocuk/kitle/cihaz kapıları gerektirir.

## Güncel devam — r8 fiziksel UMP / native engeller (4 Ekim 2026)

Kullanıcı r8 üzerine kurulum talimatından sonra **“oyun açık”** dedi. USB ile yalnız hedef `com.gridshard.remotedebug` paketinde versionCode **8** / `2.1.0-beta.72-https-debug.8`, açık debug WebView ve hazır ekran doğrulandı. Yeni APK kurulmadı; kullanıcı kurulumunun üzerinde tanılama yapıldı.

- `[x]` Fiziksel publisher-ID r8'de native `verifyLiveBuild` tam beklenen hata ile canlı birimi reddetti; `getTestSettings` tam beklenen hata ile boş SDK test cihazı listesine sahip UMP-only paketi reddetti. Bunlar gerçek native çağrılardır; reklam yükleme/gösterme veya MobileAds initialize çağrısı yapılmadı.
- `[x]` Yalnız `requestConsentInfo({tagForUnderAgeOfConsent:true})` başarılı: **NOT_REQUIRED / canRequestAds:true / isConsentFormAvailable:false / privacyOptionsRequirementStatus:NOT_REQUIRED**. Bu sonuç yetişkin rızası, yayımlanmış mesajın gerçek gösterimi veya karma-kitle genel yayın onayı değildir. Çocuk/unknown korumasında form gösterilmedi; debug coğrafyası, consent reset veya kalıcı uygulama rıza bayrağı değiştirilmedi.
- `[x]` Korumalı ignored `ump-r8.js` helper'ında izinli hazır menu/profile, native guard hataları, tek sorgu, unknown/string boolean ve hata redaksiyonu **4/4** geçti. İlk tanılama değerlendirmesi sonuçsuz kaldı; güvenli yeniden denemede başarılı probe sayaçları liveGuard1/testSettings1/consent1. Ham hata/cihaz kimliği/hesap/storage/log verisi gösterilmedi. Geçici RAM probe'u silindi; her kendi ADB forward'ı temizlendi. Son ekran **settings / ready**, native metodlar mevcut. Genel browser veya diğer cihaz uygulamaları incelenmedi.
- `[x]` Canlı **salt okunur** r7 audit tekrar geçti: beklenen image/release/üç Compose katmanı, PostgreSQL/Redis/API sağlıklı, aynı installation ve eski backup SHA/0600 doğrulandı; mevcut profil3/kimlik3/maç39/pending0, backup3/3/31. Son10dk kritik marker0, aktif PvP/socket0, PGS private secret mount doğru. SSV/AdMob ve üretim sahte ödülü hâlâ kapalı. Ham log/installation/sırlar yok; deploy/restart/env/DB değişikliği yapılmadı.

**Sonraki işlem / yeni onay gerekli:** Google imzalı panel adres testi için yeni rollout backend'i güvenli yedek/aktif maç/veri sınırı ve image rollback kapılarıyla canlıya dağıtılmalı; yalnız SSV doğrulayıcı açılıp rollout `disabled` kalmalı. Kısa bakım içerebileceği için kullanıcıya bu dağıtımı onaylayıp onaylamadığı sorulacak; açık onay gelmeden başlanmaz. Sonra mevcut AdMob biriminde planlanan `https://play.gridshardgame.com/ads/admob/ssv`, gerçek hesap/maç olmayan probe değerleriyle Verify URL → Use verified URL → Save test edilir. Ekran yeniden istenmez. Kendi biriminde SDK test hash'i hâlâ yok; bu nedenle reklam gösterimi/gerçek oyun ödülü açılmaz. Test reklamı SSV kanıtı değildir. Bu tur gameplay kaynağı, APK, canlı veriler değiştirilmedi.

## Önceki devam — kontrollü reklam kapısı / r8 UMP-only (3 Ekim 2026)

Kullanıcı **“sıradaki aşamaya devam et”** dedi ve istenen SSV ekranını verdiğini teyit etti. `221445` görüntüsünde mevcut `Android_SavasSonu_Odullu` normal ödüllü birimi, doğru public birim ID'si, ödül 1 ve **“Geri çağırma URL'si verilmedi”** açıkça görülür. Ekran yeniden istenmez; panel şimdilik değiştirilmez. Gerçek reklam/oyun ödülü/global sağlayıcı açılmadı.

- `[x]` Backend `AdRollout`: default `disabled`; `test` yalnız özel açık oyuncu izin listesi, `live` ayrı yayın modu. Her store/purchase yanıtı ve AdMob ödül talebi `child-safe-v1` + native platform beyanını gerektirir. Eski r7 normal isteği kapalı kalır; beyan profile kaydedilmez ve **attestation/rıza değildir**. Kimlik/Google imzası/yerel UMP ayrı denetlenir. Üretim Compose'a güvenli varsayılanlar eklendi; gerçek sunucu env/deploy değiştirilmedi.
- `[x]` Android native test kapısı: aynı app/birim yayıncısı, sadece debug test paketi, 32-hex SDK test cihazı listesi, initialize öncesi TFCD/G, yükleme öncesi `AdRequest.isTestDevice` true, dönen yüklenmiş birim eşleşmesi. `verifyLiveBuild` debug/UMP-only pakette canlı birimi reddeder; şu an build helper production live yetkisi üretmez. AD_ID/üç AdServices izni çıkarıldı, measurement init ertelendi. Yaş/karma-kitle genel yayın onayı sayılmaz.
- `[x]` Test reklamı UI gerçek x2 vaadi vermez; native gösterimden sonra test modunda gerçek bonus endpoint'i hiç çağrılmaz. **Test reklamı Google SSV endpoint'ini çağırmayabilir; yüklü eklenti rehberi çağırmadığını belirtir.** Önceki “kendi test birimi → gerçek SSV” planı düzeltilmiştir: SDK test gösterimi, AdMob panelinin imzalı probe'u ve ileride meşru üretim ödül kanıtı ayrı kapılardır. İmzasız mock callback kabul edilmez.
- `[x]` İstemci **154/154**, ilgili sunucu **63/63**, tam sunucu **1039 geçti / 36 atlandı**, build fixture **9/9**, diff-check geçti. SSV ECDSA/imzasız ret/tekrar/tek ödül sonuçları **yerel fixture**, gerçek Google callback değildir. VM UI test fixture'ına yeni storeState bağımlılığı eklendi; son testler temizdir.
- `[x]` Telefonun yalnız kendi paketinin PID/Ads logunda SDK önerilen test özeti bulunamadı (ham log/AAID okunup gösterilmedi). Bu nedenle ignored publisher config `testingDevices:[]` ve **ump-only**. Native publisher metadata gizlilik kontrolüne hazır, fakat kapalı backend nedeniyle kurulumda otomatik form/reklam beklenmez. Kontrollü UMP sorgusu fiziksel cihazda hâlâ yapılmalıdır.
- `[x]` **r8 APK hazır:** `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r8.apk`, **21.348.913 byte**, SHA-256 **`d11c6b3569b8ed4f610bd42a606eb7ec4c36b14a1d055602403304453b58e143`**. versionCode **8**, versionName **2.1.0-beta.72-https-debug.8** / aynı paket min24/target36/signer. Mobile build **`47f0ff6d889e01cd`**. APK audit 63 web dosyası/native sınıf/mod/public PGS kaynakları/HTTPS/secure storage, AAPT binary advertising izinleri ve apksigner geçti. Son Gradle offline derleme başarılı; ilk offline Kotlin ortak kitaplığı eksikti, resmi depodan normal derleme tamamlandıktan sonra offline tekrar geçti. R7 hash değişmedi. Mobil dist canlı web'e kopyalanmadı.

**Sonraki kapılar:** Kullanıcı yeni APK'yı mevcut oyun üzerine (kaldırma/veri silme olmadan) güncelleyip USB bağlı oyunu açar; publisher app ID'siyle yalnız UMP native sorgusu yapılır. Test cihazı kimliği güvenli biçimde doğrulanmadan kendi birimine SDK isteği yapılmaz. Yeni sunucu kaynağı yedek/aktif maç/veri sınırı kapılarıyla ayrıca dağıtılıp SSV verifier açık / rollout disabled olarak hazırlandıktan sonra panelde planlanan `https://play.gridshardgame.com/ads/admob/ssv` adresi Google imzalı probe ile doğrulanabilir. Bu tur telefon kurulumu, canlı deploy/restart/provider açma/panel kaydetme/hesap veya bakiye değişikliği yok. Genel yayın çocuk/kitle/gizlilik/PGS/sosyal kapıları ayrıca açık kalır. Ayrıntı `docs/STORE_PURCHASES.md`, paket kaydı `docs/MOBILE_RELEASE_RUNBOOK.md`.

## Önceki devam — ödüllü reklam / UMP onayı (3 Ekim 2026)

Kullanıcı r7 APK'yı kurduğunu, oyun oynayıp maçı problemsiz bitirdiğini bildirdi. Ardından APK yerine açılış güncellemesi olasılığını sordu; değerlendirmeden sonra **“Ödüllü reklamdan devam et”** seçti. Açılış güncelleme altyapısı bu tur uygulanmaz; değerlendirme `docs/MOBILE_UPDATE_STRATEGY.md` içindedir.

- `[x]` Yerel native reklam köprüsü UMP durumunu her yeni uygulama açılışında (sunucuda AdMob etkinse) SDK'dan alır; yalnız o açılış içinde eşzamanlı istekler birleştirilir. Reklam SDK başlatma/yükleme öncesi `canRequestAds === true` kapısı vardır. **Son kullanıcı kitle yanıtı aşağıdaki çocuk/yaşı bilinmeyen korumasını gerektirdi; `REQUIRED` artık bu korumada form açmak yerine reklamı engeller.** Hata/bilinmeyen durumda reklam engellenir, oyun açılışı bekletilmez. Kendi kalıcı rıza bayrağı veya zorunlu test coğrafyası eklenmedi.
- `[x]` Gerekliyse Ayarlar > Hesap ve Gizlilik içinde reklam tercihleri yeniden açılabilir; analitik izninden ayrıdır. Tercih değiştirme ve ödüllü reklam tek işlem kilidi kullanır. Arka plan mağaza yenilemesi native form/reklam işlemiyle çakışmaz. Tercih sonrası SDK tekrar sorgulanır; yenileme hatasında reklam kapalı kalırken gerekli tercih girişinin erişimi korunur.
- `[x]` Yüklü AdMob 8.1.0 SDK'sının ödül kazanmadan kapatmada `showRewardVideoAd` çağrısını sonuçlandırmayan yolu incelendi. Ödül/kapama/gösterim-hatası olayları gösterimden önce dinlenir; erken kapama/hata beklemeyi bırakır, dinleyiciler/kilit temizlenir. Kazanılmış olay sadece sunucu ödül isteme akışını başlatır; gerçek ek ödül hâlâ imzalı SSV ve sunucu idempotency kapısından geçer. Ödül verilmeden istemci bakiyesi artırılmaz.
- `[x]` Yerel doğrulama: yeni native UMP/iptal testleri **13/13**, son tam istemci **143/143**, build **9/9**, ilgili sunucu SSV/ekonomi **30/30** geçti. Android Chrome/iPhone Safari ayar emülasyonu **2/2** geçti; web/kapalı sağlayıcıda reklam tercihi düğmesinin gizli kalması da kontrol edildi. Gerçek UMP formu/cihaz/reklam/SSV henüz denenmiş sayılmaz. Ana `dist` veya r7 APK yeniden derlenmedi.
- `[x]` AdMob panel mesajı kullanıcı tarafından **yayımlandı**: son `195432` ekranında `GRIDSHARD Reklam Gizlilik Onayı`, uygulama GRIDSHARD, Türkçe +1 dil, **Yayınlandı** durumu ve açık yayın anahtarı görülüyor. Önceki editör ekranı “İzin vermeyin” Açık ve üç seçimli masaüstü/dikey telefon önizlemesini doğruladı. Hedefleme ekranında GDPR ülkeleri seçiliydi; aynı seçim önerildi. Gizlilik URL'si `https://gridshardgame.com/privacy/` ve İngilizce `/en/privacy/` HTTP200/title ile doğrulandı, fakat panel URL alanı/ek dil adı açılmış olarak gösterilmedi; son kullanıcıya bunları kontrol edip yayınlaması söylendi. Yayın teyidi cihazda UMP veya reklam/SSV başarı teyidi değildir.
- `[x]` Kullanıcı AdMob **test cihazını kaydettiğini** ve mevcut internetin SSH kaynağı için **güncel IP /32** kuralını kaydettiğini bildirdi. AAID sohbete/depoya alınmadı; paneli agent değiştirmedi. SSH, önceden güvenilen host kaydı ve `StrictHostKeyChecking=yes` ile yeniden çalıştı; dış-IP sorgusu yeniden denenmedi.
- `[x]` **r7 salt okunur son denetimi tamamlandı:** beklenen `sha256:6bf93cf2d0ddebc20c6fae241e7a455b6c0c79444f76b2c2b2262fed7d80eef8` image, r7 çalışma dizini ve production+Cloudflare+PGS üç Compose katmanı eşleşir. `20261003-before-repair-r7` dump SHA-256/0600 ve aynı installation doğrulandı. Yedek 3 profil/3 kimlik/31 maç; mevcut 3 profil/3 kimlik/32 maç, pending0. PostgreSQL/Redis lease/API sağlıklı, PGS private400 mount/UID10001 korunur. Son10dk kritik log marker0; aktif PvP/socket0. Gerçek AdMob/SSV ve üretim sahte reklam ödülü hâlâ kapalıdır. Ham log/installation ID/sırlar gösterilmedi. İlk SSH script aktarımı kontrollerden sonra ek Windows CR satırıyla exit1 verdi; yalnız aktarımda CR süzülüp aynı salt-okunur kontrol exit0 ile tekrar geçti. Deploy helper'ı/backup restore/restart/veri değişimi yapılmadı.
- `[x]` Kullanıcı **“genel kitle ama çocuklar daha çok oynayabilir”** dedi. Adult-only varsayımı yapılmadı. Tarafsız yaş akışı henüz yokken yerel köprü tüm reklam isteklerini korumalı tutar: UMP `tagForUnderAgeOfConsent:true`, SDK başlatma öncesi ayrı `tagForChildDirectedTreatment:true` + G içerik sınırı, her yüklemede `npa:true`. Reklam SDK'sında TFCD+TFUA aynı anda true yapılmaz. Beklenmeyen REQUIRED, önceki canRequestAds true olsa dahi çocuk/unknown kullanıcıdan onay istemez. Yaş bilgisi/PGS'den yaş çıkarma/kalıcı rıza eklenmedi; mevcut SDK'nın desteklemediği yeni age-treatment API'si uydurulmadı. Bu yerel ayarlar genel Families uyumluluk veya cihaz sonucu değildir; yaş ekranı/Play Console yaş grupları/native manifest/SDK başlangıç ölçümü/sosyal/PGS/veri güvenliği ve gerçek gizlilik beyanları genel yayın öncesi incelenmelidir. Güncel resmi kaynaklar `docs/STORE_PURCHASES.md` içindedir.
- `[x]` Son yerel testler: native reklam/çocuk kapıları **16/16**, tam istemci **146/146**, build fixture **9/9**, diff-check geçti. Build testinin ilk sandbox denemesi temp üst-dizin okumasında engellendi; izinli izolasyon tekrarı geçti, gerçek dist/APK derlenmedi. Native SDK Android/iOS kodunda age/config ayarlarının initialize/start öncesinde uygulanması incelendi. **Eski r7 bu değişiklikleri taşımaz; live sağlayıcıyı global açmak eski cihazları etkileyebilir.**

**Kalan kapılar:** Test cihazı kaydı kullanıcıca tamamlandı, SSH/r7 audit artık tamam. Gerçek cihaz SDK test modu/SSV ve karma-kitle genel yayın politikası tamamlanmadan canlı reklam açılmaz. Çocuk etiketi AAID iletimini engellediği için panel AAID kaydının kendi biriminde test garantisi olduğu varsayılmaz. Google demo ödüllü birimi güvenli gösterim denemesi olabilir; yayıncının SSV uç noktasına bağlı olmadığından gerçek oyun ödülü/SSV başarı kanıtı değildir. Kullanıcı USB bağlamaya izin verdi; son ADB envanteri **1 cihaz / unauthorized** gösterdi. Telefonda bilgisayara USB hata ayıklama izni vermesi istendi; paket kurulmadı, uygulama/veri okunmadı veya silinmedi. R7 Google örnek AdMob uygulama kimliğini kullanır; yayıncının UMP mesajı/kendi birimi için kontrollü yeni test yapılandırması ve eski istemciyi engelleyen açma kapısı gerekir. Bu tur r8 APK/native sync/canlı deploy/provider açma/DNS/AWS ücret değişikliği veya sır dosyası düzenleme yapılmadı. Mevcut r7 APK/dist ve gerçek hesaplar korunur. Kamuya açık gizlilik metninde eski planlanan Oracle sağlayıcısı, gerçek AWS kurulumu, saklama takvimi ve çocuk/kitle beyanları genel yayın öncesi tamamlanmalıdır.

**Önceki USB hazırlığı:** Kullanıcı telefonda izni verdi; tekrar envanteri **1 cihaz / device (yetkili)**. Hedef paket `com.gridshard.remotedebug`, versionCode7, `2.1.0-beta.72-https-debug.7` doğrulandı. İlk kontrolde uygulama kapalıydı; aşağıdaki fiziksel deneme bu durumun yerine geçer. R7 native variables içinde `playServicesAdsVersion='25.4.0'` zaten pinli görüldü; yeni paket oluştururken bu sürüm/UMP4.0.0 ve manifest/başlatma korumaları ayrıca denetlenir.

**Son USB sonucu — Google örnek reklamı fiziksel cihazda geçti:** Kullanıcı oyunu açtı; yalnız hedef uygulamanın kendi `https://localhost` debug WebView'ına, geçici ADB forward/CDP üzerinden RAM içi test düğmesi eklendi. Son yerel `NativeStoreBridge` ayrı sandbox nesnesinde kullanıldı; uygulamanın kalıcı köprüsü/profili/storeState'i değiştirilmedi. Kullanıcının fiziksel **ÖRNEK REKLAMI AÇ** dokunuşundan önce SDK/reklam isteği yoktu. Yalnız Google demo ödüllü birimi `ca-app-pub-3940256099942544/5224354917`, `isTesting:true`, `npa:true` kullanıldı; gerçek native çağrıdan SSV nesnesi tamamen çıkarıldı. UMP çocuk/unknown etiketi ile `NOT_REQUIRED / canRequestAds:true / privacyOptionsRequirementStatus:NOT_REQUIRED` döndü. SDK TFCD/G başlatıldı; yüklenen birim demo ID ile eşleştirildi. Gösterim, ödül ve kapama olayları görüldü; son durumda **complete / earned:true / dismissed:true / listenerCount:0 / busy:false / errorKind:null**, oyun **menu / ready**. Kullanıcı **“Test reklamı açıldı ve kapattım”** diye ayrıca teyit etti. Gerçek oyun ödülü/API/SSV çağrısı yapılmadı; üretim sağlayıcısı kapalı kaldı. Test diyaloğu/globali sonrasında kaldırıldı; her geçici ADB forward kendi portundan temizlendi. Özel hesap verileri/cihaz kimliği/ham SDK logları okunmadı veya gösterilmedi. Korumalı demo helper'ının offline testleri **6/6** (dokunma öncesi sıfır istek, UMP reddi/REQUIRED, erken kapama, yanlış birim, vazgeçme) geçti; helper'lar ignored `artifacts/admob-20261003/` içindedir. Fiziksel erken kapama ayrıca yapılmadı. **Bu sonuç yayıncının gerçek UMP mesajı, kendi reklam biriminde test modu veya imzalı SSV/ödül tekliği kanıtı değildir; RAM içi yeni korumalar r7 APK'ya kalıcı eklenmiş sayılmaz.** Sonraki iş: eski r7'yi reklam açılışından dışlayan kontrollü sunucu/istemci kapısı ve yayıncı app ID'siyle yalnız doğrulanmış test cihazına yönelik yeni native yapılandırma; ardından kendi biriminde gerçek imzalı SSV/tek ödül testi. r8/native sync/deploy/global reklam açma yapılmadı.

## Önceki kontrol noktası — cihaz arayüzü / tek ad hakkı / canlı onarım r7 (3 Ekim 2026)

Kullanıcı tablet yan boşluklarını, profil bandındaki gölgeyi, sezon lig satırını, telefon dock köşelerini ve kategorisiz ayarları düzelttikten sonra sunucu arızasının giderilmesini istedi. Bu talep aşağıdaki eski “onarım için yönlendirme bekleniyor” kaydının yerine geçer; kontrollü kurtarma açıkça yetkilidir. Eski dirty tree, gerçek hesaplar, önceki APK/release/backup ve dış sırlar korundu; commit/push/DNS/Elastic IP/AWS ücret değişikliği yok.

- `[x]` Dokunmatik tablet (>=600 CSS px) kabuğu ekran genişliğini kullanır; masaüstü portre önizlemesi korunur. Profil ayrıntısının shadow/filter/text-shadow etkisi kaldırıldı; para ikonlarının glow'u kendi kutusunda tutuldu. 360px sezon satırı üç kolon, lig sağda aynı satırdadır. Dock ve profil alt sekmeleri yatay 12px pay/yuvarlak köşeyle fiziksel alt köşelerden içeridedir; **Android altta kalıcı sistem tuşu boşluğu eklenmedi**. Önceki üst kamera koruması/geçici şeffaf tuş politikası değişmedi.
- `[x]` Ayarlar erişilebilir **Genel / Ses / Grafik / Hesap ve Gizlilik** sekmelerine ayrıldı; yön/Home/End klavye geçişi ve gizli panel kuralları var. Ad/dil/titreşim/eğitim/sürüm Genel, müzik/SFX Ses, kalite/perspektif Grafik, sağlayıcı/kurtarma/cihaz/bildirim/veri/rıza Hesap ve Gizlilik'tedir. Mevcut kontrol kimlikleri/otomatik kayıt/TR-EN korunur.
- `[x]` Ad değişimi sunucuda **hesap başına bir kez**, profil JSON'u içinde kalıcı sayaçla uygulanır. Eşzamanlı istek yalnız bir kez başarılı; aynı normalize adın tekrar teslimi hakkı tüketmez; geçersiz/alınmış ad veya kalıcı kayıt hatası hakkı tüketmez. Yeni ad öncesi onay, kalan/kullanılmış hakkı ve kilitli alan/düğme eklendi. Sayaçsız legacy özel ad kullanılmış sayılır; otomatik Pilot-8HEX veya değişmemiş player ID ilk hakkını korur. Bu seçim kullanıcıya bildirildi. Hesap ID/PGS subject değişmez; ayrı cihaz/restart yeni hak vermez.
- `[x]` Sunucuda yeniden üretilen TTL300/disconnect-grace30 hatası düzeltildi: kaldırılmış oturumun deadline'ı temizlenir; bitmiş maçın transport kapanışı yeni grace yaratmaz. Worker lease yenilemesi bakım/projeksiyon task'ından ayrıldı; bakım hatasında task ölmeyip tekrar dener. PostgreSQL sahiplik kontrolü ve async sonuç callback'i 5sn, socket yayın/kapama 2sn sınırlıdır; bir kopuk telefon karşı tarafın sonucunu durdurmaz. Sahiplik kaybında fail-closed/API503, kalıcı ledger ve ödül tekliği korumaları gevşetilmedi. İlk bildirilen donmanın tam tetikleyicisi hâlâ kesin kanıtlı değildir; doğrulanmış açık ve benzer yavaşlık yolları onarıldı.
- `[x]` Son tam sunucu **1025 geçti / 36 dış ortam testi atlandı**; istemci **130/130**, build **9/9**; Android Chrome + iPhone Safari **6/6** responsive/settings/tek-ad-reload/battle/titreşim testi geçti. 360/800 ve sezon/ses ekranları görsel incelendi. İlk istemci tekrarında yanlış cwd nedeniyle dosya bulunamadı; doğru client cwd ile 130/130 geçti. İlk iPhone settings testi toplam 60sn test bütçesini aştı; 120sn bütçe ile tam matris geçti, uygulama doğrulaması kapatılmadı.
- `[x]` Ayrı loopback PG/Redis fixture'larında gerçek entegrasyonlar **33/33**; yeni üretim image'ında **330sn / 33 kontrol**, profil/tek-ad hakkı, restart ve boş hedefe backup/restore geçti. Test fixture kapsayıcıları/anonim birimleri ve yalnız kendi ağı kaldırıldı; üretim birimleri silinmedi. Test venv'i yalnız `/opt/gridshard-verify-r7-20261003` altındadır.
- `[x]` **r7 APK:** `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r7.apk`, **21.030.693 byte**, SHA-256 **`0ca9bc5e42a3938ead240e658646d3ff007b7f50049ce0cf553d93132adb88ae`**; versionCode **7**, versionName **2.1.0-beta.72-https-debug.7**, aynı `com.gridshard.remotedebug`/min24/target36/signer. APK audit 63 web dosyası/HTTPS/PGS/SecureStorage/veri sınırı ve AAPT/apksigner geçti. Mobil build **`5498e6854e80e0bb`**. r1-r6 korunur; kaldırmadan güncelleme, veri temizleme yok. Yerel dist mobil çıktıdır; web sunucusuna kopyalanmadı. **Kullanıcı fiziksel r7 kurulumunu, oyun oynama ve problemsiz maç bitişini teyit etti.** Tablet/köşeler, özellikle bot yenilgi sonucu ve ikinci cihazda aynı PGS profili için ayrı ayrıntılı teyit alınmış sayılmaz.
- `[x]` Yeni immutable release `/opt/gridshard/releases/aws-20261003-repair-r7/GRIDSHARD-2.1.0-beta.72-signatures-social`; kaynak ZIP `artifacts/server-aws-20261003-repair-r7/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`, **750 kaynak + manifest**, SHA-256 **`adaba938491dbaa5e18effc14f38fdefa1872c03870f85c820dc84697d76b59d`**. Image **`sha256:6bf93cf2d0ddebc20c6fae241e7a455b6c0c79444f76b2c2b2262fed7d80eef8`**, tag `gridshard-production-relay-web:repair-r7-20261003`; eski r5 rollback tag `gridshard-production-relay-web:before-repair-r7-20261003`. ZIP son iki ek test/doc kaydından önce üretildi; runtime kodu aynıdır.
- `[x/~]` Kontrollü dağıtım helper'ı aynı production+Cloudflare+PGS üç katmanı/özgün birimler/sırlar/yalnız443 sınırını ve duruş öncesi **aktif PvP/socket0**, nonempty profil/kimlik, pending0 koşullarını geçti. Helper API/Caddy duruşu→yeni özel `/var/backups/gridshard-production/20261003-before-repair-r7` yedeği→kurulum/sayı/SHA/0600 doğrulaması→r7 image→hesap sayısı karşılaştırması→PGS mount→TLS/edge kapıları ve image-only rollback içerir; canlı DB restore/silme yok. SSH bağlantısı ilerleme çıktısı tamamlanmadan koptu. **Sonradan bağımsız public HTTPS kanıtı:** yeni ayar sekmeleri ve beklenen web build **`ac1931fafecba60a`** yayınlandı; health HTTP200/statusok/PG+Redis+worker hazır. Canlı **339sn / 32 ardışık kontrol** geçti. Bu r7 oyununun açık/sağlıklı olduğunu kanıtlar; kopma sonrası özel backup manifesti/counts/image/PGS/log audit'i SSH ile ayrıca okunmalıdır. Duruş öncesi çıktı dışındaki özel veri sayıları bu tur yeniden doğrulanmış gibi sunulmaz.

**Kalan kısa kapı:** SSH sonrasında üç salt-okunur deneme port22 timeout verdi. Kullanıcı aynı ev bilgisayarını **başka mekândaki internetten** kullandığını bildirdi; kaynak IP izin listesi farkı muhtemeldir. Otomatik dış-IP servisi sorgusu auto-review tarafından reddedildi; bu çağrı yapılmadı veya dolanılmadı. Kullanıcıya mevcut iş/ev kurallarını silmeden SSH/TCP22 için **IP'm /32** eklemesi, asla0.0.0.0/0 açmaması söylendi; kaydetme teyidi bekleniyor. Erişim geldiğinde deploy helper'ını körlemesine tekrar çalıştırma: önce running image/PGS/backup manifesti/dump hash/kurulum-counts/logs salt okunur doğrula. SSH kuralı/panel bu agent tarafından değiştirilmedi. Yeni APK fiziksel cihaz teyidini ve ikinci tester cihazında aynı PGS hesabını geri alma kapısını açık tut. Şifreli off-host backup/mağaza/iOS/reklam kapıları ayrı; sağlıklı test yayını tüm üretim kapılarının tamamı değildir.

## Geçmiş arayüz işi — açılış kimliği ve APK r6 (3 Ekim 2026)

Kullanıcı yükleme ekranındaki sağ üst `wt-…` kimliğinin Play Games kimliği olmadığını belirterek kaynağının araştırılmasını ve düzeltilmesini istedi. **Aşağıdaki bot maçı/API503 işi açık kalır; bu arayüz işi o sorunu çözmüş sayılmaz.** Bu tur canlı sunucuya bağlanılmadı, restart/deploy/panel/DNS/veri değişikliği veya commit/push yapılmadı.

- Kaynak zinciri: `RelayTestParticipantIdentity.getOrCreate()` → eski `project-relay.web-test.participant-id` yerel depo anahtarı / `wt-${UUID}` → `participantPlayerId` → başlangıçtaki erken `startupLoading.setPlayerId()`. `wt` eski web-test adlandırmasıdır; gerçek GRIDSHARD profil/ilerlemesinin hesap anahtarı olarak da kullanılıyor. Play Games bağlantısı bu hesabı korur; provider login sunucunun seçtiği bağlı oyun kimliğini depoya yazıp uygulamayı yeniden açar. PGS subject / oyun ID / OAuth client ID / token bu oyuncu ID'siyle aynı şey değildir. Gerçek hesap ID'leri/depo anahtarı önek göçüyle değiştirilmedi.
- Yanıltıcı **“Kimliğin:” → “GRIDSHARD ID:”**; TR/EN açıklama ve erişilebilir kopyalama etiketi ayrı mesaj anahtarlarıyla eklendi. ID artık yerel değer oluşturulur oluşturulmaz değil, sunucu bootstrap + katılımcı continuity eşleşmesi geçince **sunucunun doğrulanan returnedPlayerId** değeriyle gösteriliyor. Açılış/yeniden denemede doğrulanana kadar gizli; hata veya yanlış hesapta gösterilmiyor. Kısaltılmış görüntü/tam oyun ID kopyalama korunur. Kopyalama beklerken ID değişirse yanlış hesaba “kopyalandı” geri bildirimi verilmez; eski timer temizlenir. Google e-postası/PGS subject/token açılışa taşınmadı. Kimlik üreticisinde legacy prefix'in neden korunduğu yorumlandı; `docs/PLAY_GAMES.md` ayrımı açıklar.
- Doğrulama: tam istemci **130/130**, build **9/9**, Android Chrome + iPhone Safari **tarayıcı emülasyonunda 6/6** profil hata/kimlik gizleme, sunucu doğrulanmış ID/etiket ve mismatched hesap kapıları geçti. İki yeni emülasyon ekran görüntüsü görsel incelendi; sağ üst etiket sığıyor, kaynak amblem/animasyon CSS hash'i değişmedi. Fiziksel r6 kurulumu henüz teyitli değil. İlk build testleri Windows sandbox temp erişimiyle engellendi; izinli tekrar geçti. APK minify kontrolünde kaynak yerel değişken adına dayanan ilk literal beklenti yanlıştı; `returnedPlayerId` çağrısı minified değişken adıyla doğrulandı, kontrol atlanmadı.
- **r6 APK:** `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r6.apk`, **21.029.137 byte**, SHA-256 **`7f2fdd24701988fd8d35e6be1f2afc76a6318d41ce85a3ceea51328e4de334e2`**, versionCode **6** / versionName **2.1.0-beta.72-https-debug.6**. `com.gridshard.remotedebug`/min24/target36 ve r5 ile **aynı signer** apksigner/AAPT ile doğrulandı. Mevcut uygulamayı **kaldırmadan güncelle**; veri temizleme yok. Public PGS ID/Web client ID, SecureStorage, App/Browser, kamera/edge-to-edge ve HTTPS-only politika korunur. APK audit **63 web dosyası**, hash eşleşmesi, PGS metadata/kaynak/DEX ve yasaklı dosya sınırını geçti; private key/credential/test/QA dosyası yok. Paket içindeki yeni etiket ve doğrulanmış kimlik çağrısı ayrıca okundu. Mobil build ID **`a8069c6d0be8b927`**. r1–r5 korunur; yönetilen Android debug build çıktısı r6 oldu. Yerel `dist` güncel **mobil** çıktıdır; web sunucusuna kopyalanmaz. Canlı backend/web hâlâ önceki r5 release'idir.

**Devam önceliği:** aşağıdaki bot maçı/API503 teşhisinden kalıcı onarım ve kontrollü kurtarma için kullanıcı yönlendirmesi bekleniyor. r6 yalnız kimlik sunumu düzeltmesidir; sağlıksız API'yi iyileştirmez. Sonraki mobil paket r6 üzerine yazılmaz; yeni sürüm kodu/dosya kullanılır. İkinci cihaz Play Games aynı profil geri alma tester kapısı ve diğer dış sağlayıcı kapıları açık kalır.

## Geçmiş teşhis — bot maçından sonra donma / API sağlıksız (3 Ekim 2026; onarım durumu yukarıda)

Bu bölüm aşağıdaki PGS kaydındaki sıradaki cihaz testinin önüne geçer. Kullanıcı başka Android cihazdan oyuna eriştiğini bildirdi; o cihazın Google hesabı tester olmadığı için Play Games bağlanmadı. **İkinci cihaz oyun erişimi kullanıcı teyidiyle geçti; aynı profili ikinci cihazda PGS ile geri alma kapısı hâlâ açık.** İlk cihazdaki gerçek PGS bağlama ve kapat-aç/profil korunması teyitleri korunur.

- Kullanıcı bot rakibe yenildiğinde çekirdek patlamış/akım durmuş savaş ekranının yaklaşık 5 dakika beklediğini, sonra ilerlediğini; sonraki eşleştirmenin sunucu bağlantı uyarısı verdiğini, kart bilgi penceresinin yavaş kapandığını ve kötü görünümlü yeniden bağlan düğmesi çıktığını bildirdi. Görsel/istemci zaman çizelgesi henüz alınmadı. İlk donan savaşın sonucunu ayrı doğrulanmış sayma.
- **Salt okunur canlı teşhis:** r5 API Docker `unhealthy`, iç `/health` HTTP503; PostgreSQL ve Redis hazır fakat `worker_lease_ready=false`. Redis primary worker key TTL **-2 (yok)**; PostgreSQL advisory guard kilidi hâlâ var. API OOMKilled=false/RestartCount=0; ölçüm anında CPU <%1/bellek yaklaşık150MiB, PG idle-in-transaction0. AWS kapasitesi veya Play Games credential sorunu kanıtlanmadı; API uygulama işlemcisinin izni geçersiz ve koruma uçları503 veriyor. Yeni release/anahtar/DNS/EC2/panel/veri değişmedi, sunucu yeniden başlatılmadı.
- Ledger'de **31 applied / pending0** savaş görüldü; en büyük kayıt→uygulama gecikmesi yaklaşık0,1275sn. Bu yalnız kaydedilmiş savaşları kanıtlar; donan son savaşın da ödüllerinin işlendiği iddiası değildir. Tüm mevcut API container logları (66 satır) hassas URL/token değerleri saklanarak tarandı; açık traceback veya worker-ownership-loss logu yok. Bakım task'ının canlıdaki gerçek exception'ı mevcut logdan elde edilmedi.
- **Kod açığı yerelde yeniden üretildi:** `pvp_websocket.sweep_connection_health()` gecikmiş disconnect deadline'ı için daha önce TTL ile kaldırılmış oturuma `service.disconnect()` çağırınca `PvPSessionError` fırlatıyor; deadline da yerinde kalıyor. `_runtime_maintenance_loop()` bunu yakalamadığı için task sonlanıyor. Aynı task worker lease yenilediğinden izin daha sonra doluyor. Repo'daki gerçek bakım fonksiyonu AST ile tek başına, sahte IO/saat ve gerçek session/adapter üzerinde çalıştırıldı: task done=true, 6 renewal sonrası crash, deadline kalıyor, lease süresi geçince owns=false. Canlı oyuncu/Redis/PG/test profili kullanılmadı. Bu doğrulanmış hata canlıdaki lease kaybıyla uyumludur; **ilk maç sonu donmasının tam tetikleyicisi kesinleşmiş değildir**. Mevcut bağlantı testleri5/5 geçiyor ama bu TTL/grace kesişimini kapsamıyor.
- Diğer risk: terminal callback ve socket gönderimi tick runner içinde sonuç iletimini geciktirebilir/runner'ı sonlandırabilir; bakım task'ında exception supervision yok. Uzun istemci bekleyişi ve reconnect düğmesi ayrı ele alınmalı. Eksik kanıtları kesin kök neden gibi sunma; koruma/tek-worker sahipliği veya ödül idempotency kapıları gevşetilmez.

**Devam:** teşhis yapıldı; bu tur uygulama koduna düzeltme veya canlı kurtarma uygulanmadı. Kalıcı düzeltme ve kontrollü dağıtım/kurtarma için kullanıcı yönlendirmesi alınacak. Onaylanınca önce TTL/grace regression, bağımsız/supervised lease ve bakım hata yalıtımı ile terminal runner/istemci kısa bekleme-reconnect davranışı çalışılır; ilgili tam regresyonlar ve izole gerçek PG/Redis bot maçı/5 dakikalık expiry-soak kapısı geçmeden deploy edilmez. Mevcut r5, gerçek profiller, aynı üç Compose katmanı, dış sırlar/üretim birimleri ve backup/rollback korunur. Yalnız restart kalıcı çözüm sayılmaz. Bu teşhise ait Gitignored helper'lar `artifacts/play-games-20261003/diagnose-frozen-battle.sh`, `diagnose-worker-history.sh`, `reproduce-expired-session-maintenance.py`; sır/token çıktılanmadı, commit/push yok.

## Aktif devam — Android Play Games r5 (3 Ekim 2026)

Bu bölüm Google Play Games işi için aşağıdaki r4 “panel yanıtı bekleniyor” kaydının yerine geçer. Kullanıcı Android oyun açılışında Play Games ile devam etmeyi istedi; Cloud/PGS panelinde Android test ve oyun sunucusu Web credential kaydını tamamladı. Web secret JSON proje dışında doğrulandı; sır basılmadı/Git/APK'ya alınmadı. Apple ve genel Google tarayıcı OAuth ayrı, açık sağlayıcı kapılarıdır.

- `[x]` Resmî Google Maven metadata ile `play-services-games-v2:22.1.0` sabitlendi. Application başlatıcısı + yerel Capacitor plugin + tekrar çalıştırılabilir sync kancası eklendi. Kamera üst boşluğu/alt edge-to-edge ve mevcut App/Browser/SecureStorage korunur. Public oyun ID + Web client ID build env'den girer; secret telefona girmez. SDK otomatik platform kontrolü yapar, yeni profil oluşturma yalnız açık Play Games seçimiyle olur.
- `[x]` Yetkili start/complete uçları S256 cihaz kanıtı ve süreli tek kullanımlı state kullanır. Backend Google token exchange ve `applications/{game_id}/verify` ile hem oyunu hem gerçek oyuncuyu doğrular; client player ID/e-posta/token kabul edilmez. Login PGS sahibini geri getirir; link başka hesabı alamaz veya var olan subject'i değiştiremez. Mevcut kalıcı kimlik sessizce başka hesaba taşınmaz. Proof-bound provider session/SecureStorage korunur. Yeni opsiyonel external-secret Compose katmanı ve Git/Docker/ZIP/APK sınırları eklendi.
- `[x]` UI: Android native uygulamada Play Games seçimi/ayarlar bağlantısı, Türkçe/İngilizce metinler, mevcut misafir kurulumunda bir kez yeni seçim, iptal/misafir profilini koruma. Başka hesaplar birleştirilmez. Mevcut bağlı oturum normal güvenli cihaz sırrıyla açılır; platform auth otomatikliği GRIDSHARD profilini kendi kendine değiştirmez.
- `[x]` Yeni APK `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r5.apk`: **21.028.637 byte**, SHA-256 **`7870bdf41520413e882d4b15ffd85d8eb9ffcce4c99acd8eda2865f568777654`**, versionCode **5** / versionName **2.1.0-beta.72-https-debug.5**, aynı test kimliği/min24/target36/aynı debug signer. 63 web dosyası, genişletilmiş APK audit'inde PGS Application/plugin/resmî SDK DEX sınıfları ve public ID kaynakları geçti. AAPT gerçek binary manifestte Application/APP_ID/manual profil metadata'sını ayrıca doğruladı. APK ve yeni kaynak ZIP içinde **gerçek Web secret değeri yok**; credential JSON/sır dosyası yok. Önceki r1–r4 korunur. Mobil build ID **`0f0400bd7544b660`**. Canlı backend kapıları aşağıda doğrulandı; paket paylaşıldı ve kullanıcı aşağıdaki ilk gerçek giriş/bağlama teyidini verdi. Mevcut uygulamayı kaldırmadan güncelleme kuralı korunur.
- `[x]` Tam istemci **127/127**, build **9/9**, tam sunucu **1009 geçti / 36 gerçek dış ortam kapısı atlandı**, mobil tarayıcı emülasyonu **12/12**. Son PGS + deployment + kaynak sınırı regresyonları **24/24**; bunun deployment/kaynak sınırı alt kümesi **13/13**. Son pytest cache yazma uyarısı test başarısızlığı değildir. İlk pytest temp erişiminde engellendi; izinli tekrar geçti. İlk full-server çağrısının import kökü eksikti; iki kökle tekrar geçti. HTTP extra client player_id testi middleware'in daha erken 403 reddini doğrulayacak şekilde düzeltildi; aynı-owner extra alan ayrıca 422. Native sync'in ilk idempotency testi boşluk birikmesini yakaladı; kaynak onarıldı, test tekrar geçti. Testler kapatılmadı.
- `[x]` **Web builder izolasyonu:** ilk yeni sunucu derlemesi App/Browser SDK'larının pnpm 24 saatlik yayın yaşı kapısına takıldı; çalışan release değişmedi. Web bundle için gerekmeyen mobil SDK'lar Docker builder'dan ayrıldı. `tools/web-build/package.json` + kendi frozen lockfile'ı yalnız ana paketle aynı `esbuild:0.28.2` aracını kurar; 27 lock girdisi gerçek güvenlik kontrolünü geçti. Yayın yaşı/integrity kontrolü gevşetilmedi, istisna verilmedi. Mobil ana lock/SDK paketleri değiştirilmedi. Yeni imaj ayrı etiketli, loopback-only PG17/Redis7 fixture'larında **production_container_smoke + image backup/empty-target restore passed**; hesap/mağaza yetkisi, aynı profil/token restart ve restore, UID10001 ve image veri sınırı doğrulandı. Yalnız bu turdaki test kapsayıcıları/anonim birimleri/ağı temizlendi; üretim birimleri silinmedi.
- `[x]` **Yeni canlı release:** `/opt/gridshard/releases/aws-20261003-play-games-r5-web-builder/GRIDSHARD-2.1.0-beta.72-signatures-social`. Kaynak ZIP `artifacts/server-aws-20261003-play-games-r5-web-builder/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`, **747 kaynak + manifest**, SHA-256 **`0c8977ffe72d3d97499be0ca17bf92a85e30f078b73254a5cf1e00f5043c0d68`**. Yeni API imajı **`sha256:bcbc38ddadbc52694edd9c4b4dbbf4939df693b2dd4827a47bb106ce7f9b5f35`**. Önceki release/imaj/ZIP korunur; rollback tag **`gridshard-production-relay-web:before-pgs-r5-20261003`** eski `a0d23c...` imajına bağlıdır. Yeni release'deki root/0600 `.env` yalnız public Compose ayarları ve dış dizin yollarıdır; gerçek sırlar burada değildir. Release ZIP bu son checkpoint/audit kaydından önce üretilmiştir; runtime kodu değişmemiştir.
- `[x]` **PGS dış sır ve panel:** public oyun ID **`376018782491`**, Web server client ID **`376018782491-e1tucpaujknt2nrktntog9071u5u98v1.apps.googleusercontent.com`**. Kullanıcının son paneli GRIDSHARD oyun sunucusu credential'ının bu Web client ile kaydedildiğini gösterir. Web JSON proje dışında okundu/doğrulandı; sır pinli SSH stdin üzerinden `/etc/gridshard-production-secrets/play_games_client_secret` dosyasına **0400 / UID10001** kuruldu, içerik basılmadı. Production + Cloudflare + Play Games **üç Compose dosyası birlikte** kullanılır. Gerçek merge/preflight eski auth/database/TLS mount'larını ve production-clean birim adlarını korur; PGS secret read-only eklenir, yalnız TCP443 yayınlanır. Genel Google browser OAuth ve Apple hâlâ kapalıdır. Pinli SSH strict kontrolü kapatılmadı. İlk preflight'ta Compose run stdin'in script devamını tüketmesi `</dev/null` ile düzeltildi; eksik kontroller yeniden tamamlandı.
- `[x]` **Kontrollü canlı geçiş ve gerçek geri dönüş:** duruş öncesi **1 gerçek profil / 1 kimlik, PvP/socket 0/0** doğrulandı. İlk duruşta yeni `/var/backups/gridshard-production/20261003-before-play-games-r5` yedeği alındı. Yeni API iç sağlık kapısını geçti, fakat public kontrolün varsayılan Python User-Agent'ı Cloudflare'dan **403** aldı; otomatik rollback eski sürümü sağlıklı geri açtı. Salt okunur karşılaştırmada aynı adres tanımlı probe/curl ile **200**, origin CA/hostname kontrolüyle TLS verify **0** verdi; DNS veya uygulama bozulması değildi. Tanımlı health User-Agent ile ikinci geçişte ayrı `/var/backups/gridshard-production/20261003-before-play-games-r5-attempt2` yedeği alındı; ilk yedek üzerine yazılmadı. İki başarı manifesti/dump SHA/0600 izinleri/aynı kurulum ID'si doğrulandı. Caddy'nin ilk açılışındaki kısa SSL_SYSCALL sonraki sınırlı TLS-doğrulanmış tekrarda geçti; `-k` yok. Yeni API healthy; PG/Redis/worker lease hazır; Caddy çalışıyor. Origin ve Cloudflare public **health/oyun HTTP200/TLS0**, test `assetlinks.json` HTTP200 ve debug signer eşleşmesi geçti. Veritabanı/kimlik/auth key/kurulum UUID/birimler aynı kaldı. DNS/Elastic IP/AWS panel kuralı değiştirilmedi.
- `[x]` **Canlı PGS HTTP kapısı:** yalnız bu teste ait geçici guest ile altı HTTPS kontrolü geçti: sağlık, kimliksiz start401, PGS configured=true/genel Google-Apple kapalı, başka oyuncu adına start403, doğru public ID/no-store/süreli state, yanlış cihaz kanıtı422 ve hiçbir PGS kimliği bağlanmaması. Gerçek Google kodu gönderilmedi. Test hesabı kendi yetkili GDPR API'siyle silindi; profil tekrar401. Son SQL'de **1 gerçek profil/1 kimlik, test öneki 0 profil/0 kimlik**. Son sağlık PGS configured=true, active PvP/socket **0/0**. Bu kanıt fiziksel Google girişinin yerine geçmez. Son `git diff --check` temiz; commit/push yapılmadı.

- `[x]` **Kullanıcı gerçek cihaz teyidi — 3 Ekim 2026:** r5 paylaşımı sonrasında kullanıcı “play games ile giriş tamamlandı.hesap bağlandı” bildirdi. İlk gerçek Play Games giriş ve hesap bağlama kapısı kullanıcı kanıtıyla geçti; SDK/sağlayıcı/sunucu akışının bu cihazdaki ilk kullanım teyididir. Agent telefon ekranı, Google kimliği veya ek canlı SQL okumadı; hassas hesap bilgisi kaydedilmedi. Bu bildirim aynı profil/kupa/kredi korunması, bağlı hesapla kapat-aç, başka cihazdan geri alma, iptal/misafir/offline veya üretim mağaza sertifikası testlerini kendiliğinden doğrulamaz. Önceki SQL/sağlık sayıları dağıtım anının kanıtıdır; bu mesaj sonrası yeniden ölçülmüş sayılmaz. Bu tur yalnız checkpoint güncellendi; kod/APK/sunucu/panel değişmedi.

- `[x]` **Bağlı hesapla kapat-aç/profil korunması — 3 Ekim 2026:** uygulamayı tamamen kapatıp açınca aynı oyuncu adı, kupa/kredi ve Play Games'in bağlı durumunun korunup korunmadığı soruldu; kullanıcı “evet korundu” teyidini verdi. Aynı cihazda bağlı oturumun yeniden açılması ve bu değerlerin korunması kullanıcı kanıtıyla geçti. Başka temiz cihazdan Play Games ile hesap geri alma henüz denenmiş sayılmaz; mevcut güvenli cihaz oturumunun yeniden açılması bu ayrı sağlayıcı-login kapısını tek başına kanıtlamaz. Yeni SQL/sağlık ölçümü veya kod/APK/sunucu değişikliği yapılmadı.

**Sıradaki kapı: başka Android cihazdan aynı profili geri alma.** İlk Play Games giriş/bağlama ve aynı cihazda kapat-aç teyitleri tekrar istenmez; panel kurulumu veya APK üretimi tekrar yapılmaz. İkinci Android cihaz bulunup bulunmadığını sor; varsa mevcut telefondaki kurulum/verileri silmeden başka temiz cihazda aynı Play Games hesabıyla login ve aynı oyuncu adı/profil/kupa/kredinin geri gelmesini sınayın. İkinci cihaz yoksa bu kapıyı açık olarak kaydet; ilk cihazı kaldırma/verilerini silme talimatı verme. İptal/misafir/offline ve farklı PGS hesabına geçişte eski profilin korunması ayrıca açık; hesaplar birleştirilmez. Yeni test cihazının Google hesabı PGS test kullanıcıları ve gerekiyorsa Auth Platform test kullanıcıları listelerinde olmalı; PGS Properties oyun adı GRIDSHARD kontrol edilmeli. Panel kimlikleri/secret yeniden istenmez; zaten kuruldu. Sonraki geliştirme işi gerçek ödüllü reklam/UMP/AdMob SSV'dir; hesap geri alma fiziksel kapısı geçmediyse bunu tamamlanmış gösterme. Mağaza yayımlama, üretim paketinin Play App Signing sertifikası, iOS, ödeme ve dış şifreli backup hâlâ ayrı kapıdır. İki yeni bakım yedeği aynı hosttadır; off-host backup yerine geçmez. Elastic IP/DNS stop-start otomasyonu yapılmayacak. Kurulum/güvenlik ayrıntıları `docs/PLAY_GAMES.md`.

Bu dosya güncel çalışma paketini ve korunması gereken önceki kararları içerir. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya, ardından `git status --short` okunmalıdır.

## Aktif devam — Google/Apple giriş köprüsü ve APK r4 (3 Ekim 2026)

**OAuth kod durumu için bu bölüm aşağıdaki “köprü eksik” kayıtlarının yerine geçer; canlı sağlayıcı kapıları kapanmış sayılmaz.** Kullanıcı “sıradaki işi tamamla” dedi; r3 sonrası sıradaki Google/Apple giriş işi ele alındı. Panel kayıtlarının varlığı kullanıcıya soruldu, henüz yanıt gelmedi. AWS/Cloudflare/DNS/Elastic IP, canlı release, veri/birimler veya üretim sırları bu tur değiştirilmedi. Özel anahtar okunmadı; commit/push yok. Önceki APK ve dirty çalışma ağacı korundu.

1. `[x]` Android OAuth artık uygulama WebView'ı yerine `@capacitor/browser@8.0.5` ile sistem tarayıcısı/Custom Tabs kullanır. `@capacitor/app@8.1.2` sıcak/soğuk dönüş URL'sini dinler; mevcut native geri düğmesi ve r3 üst kamera/alt kenar tam ekran politikası korunur. Sync kancası yalnız tam HTTPS API hostu ve sabit `/native-auth/android-test` / `/native-auth/android` yolu için `autoVerify` filtresi ekler. Launcher/FileProvider korunur; tekrar sync aynı manifest özetini verdi. App/Browser kayıtları ve derlenmiş DEX sınıfları gerçek APK'da doğrulandı.
2. `[x]` `client/src/native-oauth.js`, `server/app/native_oauth.py` ve hesap uç noktaları: 256 bit cihaz doğrulayıcısı native SecureStorage'da tarayıcı açılmadan yazılıp geri okunur; web'de aynı tab'ın `sessionStorage` alanındadır, localStorage'a kopyalanmaz. Sunucu yalnız S256 challenge saklar. Server-owned hedef/handoff/provider/süre kontrolü, 5 dakikalık tek kullanımlı exchange ve doğru cihaz kanıtı gerekir. Yanlış kanıt kodu tüketmez; tekrar kullanım reddedilir. Bu S256 koruması **bizim server exchange→cihaz oturumumuz** içindir; upstream Google authorization PKCE uygulandığı iddiası değildir. URL'deki oyuncu ID/token kabul edilmez. Web adresi kod API'ye gönderilmeden temizlenir; sahte dönüş normal misafir açılışını bozmaz. Login mevcut sağlayıcı sahibini getirir, link başka sahibin hesabını alamaz.
3. `[x]` Public `/.well-known/assetlinks.json` yalnız yapılandırılmış test/yayın sertifika SHA-256'larını ayrı kimliklerle yayımlar. Sabit HTTPS fallback sayfası CSP/no-store/no-referrer kullanır, exchange body'ye gömülmez. Google client secret `_FILE` desteği, opsiyonel `docker-compose.oauth-google.yml` / `docker-compose.oauth-apple.yml` external secret katmanları, Apple P-256 kontrolü eklendi. `.p8`/ham OAuth secret/credential JSON kaynak ZIP ve Git sınırlarından; özel dosya/test/QA APK sınırından dışarıda. Katmanlar yalnız statik sözleşmelerle doğrulandı, bu bilgisayarda gerçek Docker birleşimi/uzak deployment çalıştırılmadı.
4. `[x]` **Yeni APK r4:** `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r4.apk`, **20.910.334 byte**, SHA-256 **`ee32114a5be23d2cda0af10ddcbb1a8784c3da1ec0ebe4a6112157b41dd9296e`**. Aynı `com.gridshard.remotedebug` / GRIDSHARD TEST, versionCode **4**, versionName **2.1.0-beta.72-https-debug.4**, minSdk24/targetSdk36/launcher AAPT binary manifest ile doğrulandı. `apksigner verify` r3/r4 aynı sertifikayı doğruladı: public SHA-256 `942ec01abb22d136744ac0103c8d566f9316b831d1ab6b002bf2e599f9a36a96`. **Kaldırmadan güncelleme** yapılabilir; fiziksel kurulum henüz doğrulanmadı. 63 web dosyası içerik özetleri, HTTPS-only/backup kapalı/gizli dosya sınırı, SecureStorage/display/App/Browser DEX ve tam host/path filtresi denetimi geçti. Build ID **`f69915512e3c48c9`**; mobil dist web sunucusuna kopyalanmadı.
5. `[x]` Son testler: tam istemci **122/122**, build **9/9**, hedefli OAuth/hesap/deployment/kaynak sınırı **36/36**; tam sunucu **998 geçti / 36 atlandı**. Atlananlar izole gerçek PostgreSQL/Redis/backup ortamı tanımlı olmayan testlerdir; tamamlanmış sayılmaz, testler devre dışı bırakılmadı. Android Chrome + iPhone Safari tarayıcı **emülasyonunda 10/10** açılış/savaş/dock/titreşim, ek **2/2** sahte OAuth dönüşü/URL temizliği/misafir açılışı geçti. Fiziksel cihaz veya canlı Google/Apple kanıtı değildir. İlk pytest komutunda yanlış eski dosya adı bulundu; doğru yollarla yeniden çalıştırıldı. İlk istemci çalışmasında eski statik `oauthParams.get` metin beklentisi kırıldı; yeni doğrulanmış callback sözleşmesine güncellendi ve tam test tekrar geçti. Derleme negative-fixture CSS hataları beklenen test çıktısıdır. Son `git diff --check` temiz; pnpm güvenlik yaş istisnası eklenmedi.
6. `[~]` **Gerçek Google/Apple hâlâ açık:** en son canlı kontrolde sağlayıcı kimlik/sırları yoktu; bu tur sunucuya bağlanılmadı. Panel kaydı/dış sırlar, güncel backend + public sertifika ayarı/Digital Asset Links dağıtımı ve fiziksel sıcak/soğuk giriş tamamlanmadan “çalışıyor” deme. **iOS native giriş fail-closed**; Universal Links/entitlement ve gerçek iPhone kapısı ayrıca gereklidir. Apple hesabıyla Android/web için Services ID akışı kodda hazırdır, gerçek sağlayıcı testi yapılmadı. Kurulum: `docs/NATIVE_OAUTH.md`; sırları sohbete/Git/APK'ya koyma.

### Sıradaki işler — bu kayıttan devam et

- `[ ]` **Önce sağlayıcı panel kapısı:** kullanıcının Google Cloud OAuth / Apple Developer kayıt durumu yanıtını al. Google için Web application OAuth client ID ve tam HTTPS callback kaydı; secret yalnız korumalı proje dışı dosya. Apple için primary App ID + Services ID/Team ID/Key ID/.p8. Otomatik ücretli üyelik veya private key isteme/çıktılama yok. Panel hazır olunca kontrollü backup/rollback ile güncel backend + seçilen OAuth katmanlarını dağıt; existing production auth/database/Cloudflare TLS mount'ları korunacak. Public test sertifika özetini ekle, HTTPS assetlinks 200 ve cihaz domain doğrulamasını kontrol et.
- `[ ]` R4'ü mevcut uygulamayı kaldırmadan kur; Google/Apple gerçek hesaba bağlanma, aynı profili geri alma, başka cihaz login, sıcak/soğuk dönüş, iptal/offline/tekrar kullanım güvenli mi? R3/r4 alt kalıcı boşluk yok/kamera boşluğu doğru/geçici şeffaf tuşlar/dock sabit/klavye/arka plan sesi/ANDROID · GRIDSHARD session adı da fiziksel teyit bekliyor. Önceki r1 Wi-Fi/mobil veri/profil dönüşü kullanıcı kanıtı korunur; iki gerçek cihaz PvP/reconnect hâlâ açık.
- `[ ]` Sonra gerçek ödüllü reklam/UMP/AdMob SSV kapısı. Giriş köprüsünün veya reklam düğmesinin eklenmesi sağlayıcıyı açmaz. Ödeme/iade/push, off-host şifreli backup/izleme ve yayın CI kapıları aşağıda korunur.
- `[ ]` **Elastic IP ve stop/start DNS otomasyonu şimdilik yapılmayacak**; kullanıcı yeniden talep ederse ele al. Bu tur canlı sağlık/DNS/HTTPS kontrolü yapılmadı; önceki kanıt güncel sağlık raporu değildir.

## Aktif devam — alt kenar tam ekran ve doğru uygulama oturumu (3 Ekim 2026)

**Bu bölüm mobil görünüm için aşağıdaki r2 üst+alt kalıcı güvenli alan kararının yerine geçer.** Kullanıcı r2'yi kurduğunu, kamera boşluğunun uygun olduğunu fakat alttaki kalıcı boşluğu istemediğini bildirdi. Alt tuşlar oyunun üstüne şeffaf/geçici açılmalı; dock yer değiştirmemeli. Kullanıcı sabit IP ve ilgili maliyet/altyapı işleriyle şimdilik uğraşmama kararı verdi; bu tur AWS/Cloudflare/DNS/sunucu/üretim sırları değiştirilmedi. Önceki çalışma ağacı ve APK'lar korundu; commit/push yok.

1. `[x]` Native `GridshardActivity` yalnız üst durum/kamera/caption ve gerekli yan kenarları görünürlükten bağımsız ayırır. **Normal durumda alt padding 0**; gezinme çubuğu kalıcı boşluk oluşturmaz. Sistem çubuğu/cutout inset'leri tüketildiği için WebView/CSS de alt boşluğu yeniden ekleyemez. Yalnız gerçek IME açıkken klavye yüksekliği kadar alt alan korunur. Önceki şeffaf renk/kontrast scrim kapalı/geçici kaydırma/oyun dokunuşunu tüketmeden bırakınca gizleme/odak dönüşü davranışları korundu. Android/OEM/erişilebilirlik kısıtları gerçek cihazda ayrıca doğrulanmalı; otomatik test bunu fiziksel kanıt saymaz.
2. `[x]` `auth-session.js` native oturum adını WebView user-agent'ından türetmez: **`ANDROID · GRIDSHARD` / `IOS · GRIDSHARD`**; gerçek tarayıcı **`WEB · Chrome/Edge/Safari`** kalır. Normal ve sağlayıcı session payload'larını çalıştıran 5 regresyon testi platform/cihaz adı, aynı cihaz ID'si ve cihaz sırrının korunduğunu doğrular. Sunucudaki mevcut `register_device` aynı cihaz kaydının adını bir sonraki oturumda günceller; hesap/cihaz verisini silmek veya sunucu migration'ı gerekmiyor. APK hibrittir: oyun UI varlıkları paketin içinde WebView'da, API/WSS uzak sunucuda; `server.url` ile web sitesini yükleyen paket değil. Bu mimari ve yeni inset politikası mobil runbook'a yazıldı.
3. `[x]` **Yeni güncelleme APK r3:** `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r3.apk`, **20.874.374 byte**, SHA-256 **`9885303ef26c092b0f6873271d2a699e06e8cd95919e86307bb68dd578550a79`**. Aynı `com.gridshard.remotedebug` / GRIDSHARD TEST; versionCode **3**, versionName **2.1.0-beta.72-https-debug.3**. Native kaynak ile generated sınıf SHA-256 eşleşti ve Gradle debug derlemesi geçti. 63 web dosyası izin listesi/içerik özeti, HTTPS-only, yedek kapalı, özel anahtar/test/QA dışarıda, SecureStorage/display DEX denetimi geçti. `apksigner verify` r2/r3 imzasının aynı olduğunu doğruladı; mevcut uygulamayı **kaldırmadan güncelleyin**, profil korunur. AAPT gerçek binary manifestte kimlik/sürüm/launcher/minSdk24/targetSdk36 doğruladı. APK kopyasının özeti de aynı. Yeni paket henüz kullanıcı telefonunda doğrulanmadı.
4. `[x]` Son kontroller: tam istemci **105/105**, build sözleşmeleri **9/9**, deployment/kaynak sınırı **10/10**, Android Chrome + iPhone Safari **emülasyonunda 4/4** mobil savaş/top-only azaltılmış viewport/dock/titreşim yerleşimi. İlk build fixture çalışması sandbox'ın geçici klasör erişimine takıldı; erişimli yeniden çalıştırmada bütün testler geçti, hiçbir test atlanmadı. APK denetim sarmalayıcısında AAPT çıktısına dizi `-notmatch` uygulamak yanlış ret verdi; gerçek tek package satırı kontrolüyle düzeltildi. Sonradan olmayan `dist/build-manifest.json` okuması hata verdi; derleme/denetim/kopya-özeti sonuçlarını değiştirmez. Mobil build ID **`62cf9d381a3b7633`**; bu `dist` web sunucusuna dağıtılmadı.

### Sıradaki işler — bu kayıttan devam et

- `[ ]` **r3 fiziksel telefon teyidi:** GRIDSHARD TEST'i kaldırmadan yeni APK ile güncelle; kamera boşluğu aynı, alt kenarda kalıcı boşluk yok, sistem tuşları geçici/şeffaf ve dock'u itmeden açılıyor, oyuna dokununca gizleniyor mu? Klavye, geri dönüş/arka plan sesi, mevcut profil ve ayarlardaki yeni oturum adı ayrıca kontrol edilsin. Emülasyon gerçek Android sistem çubuklarını sınamaz. İki gerçek cihaz PvP/reconnect kapısı hâlâ açık.
- `[ ]` **Google/Apple native giriş** ve ardından **gerçek ödüllü reklam** aşağıdaki sağlayıcı kontrol listesinden devam eder; mevcut eksik panel/secret/SSV yapılandırması tamamlanmış sayılmaz. Dış tarayıcı/Custom Tabs veya resmi giriş, doğrulanmış uygulamaya dönüş ve tek kullanımlık exchange olmadan yalnız credentials ekleyip native hazır ilan etme. Özel değerler sohbete/Git/APK'ya girmez. Sağlayıcı paneli/kimlikleri ve gerekli erişim kullanıcıdan alınacak.
- `[ ]` AWS/off-host şifreli backup/izleme, mağaza ödeme/iade/push ve yayın CI kapıları aşağıdaki kayıtlarda korunur. **Elastic IP veya stop/start DNS otomasyonu şimdilik yapılmayacak**; kullanıcı yeniden talep ederse ele alınır. Bu tur sunucuya bağlanılmadı; önceki canlı sağlık/DNS kanıtı güncel kontrol değildir.

## Aktif devam — uzak telefon testi ve sistem çubuğu/güvenli alan düzeltmeleri (3 Ekim 2026)

**Mobil durum için bu bölüm aşağıdaki 2 Ekim APK/telefon bekleme kayıtlarının yerine geçer.** Çalışan AWS/Cloudflare release, üretim birimleri ve sırları değişmedi; eski yerel uygulama/veriler aktarılmadı. Commit/push yapılmadı.

1. `[x]` Kullanıcı ayrı **GRIDSHARD TEST** APK'sının Wi-Fi ve mobil veriyle çalıştığını, kapatıp açınca aynı profilin geldiğini bildirdi. Ekran görüntüleri gerçek savaş sonunu, kredi/kupa/deneyim ödüllerini ve sistem çubukları gizliyken tam ekranı gösterir. Bu kullanıcı kanıtıdır; otomatik native gate, iki fiziksel cihaz PvP/reconnect veya arka plan sesinin bu APK'da ayrıca doğrulanması sayılmaz.
2. `[x]` Yeni Android güvenli viewport kodu: `tools/native-templates/GridshardActivity.java`, `tools/configure-native-display.js` ve sync kancası. MainActivity kimliği/mevcut kodu korunur. Kamera/durum çubuğu + alt gezinme boşluğu `getInsetsIgnoringVisibility` ile **native parent padding** olarak sürekli ayrılır; renk `#07142B`. Böylece alt tuşlar gösterilince viewport/dock yeniden yukarı kaymaz veya tuşların altında kalmaz. Capacitor `SystemBars.insetsHandling=disable` ile aynı boşluğu ikinci kez uygulamaz. IME/klavye açıkken kendi yüksekliği korunur; yazmaya müdahale edilmez. Şeffaf, açık renk ikonlu, kontrast scrim'i kapalı sistem çubukları `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` kullanır; oyundaki dokunuşun sonunda veya odak dönüşünde gizlenir, dokunuş tüketilmez. OS/OEM/erişilebilirlik politikaları gerçek cihazda ayrıca sınanmalı; tamamen engellenmiş sistem gezinmesi iddiası yok.
3. `[x]` Titreşim satırı diğer checkbox'larla aynı `settings-toggle` flex düzenini kullanır; tik/yazı yatay hizalı. Gerçek tarayıcı ekran görüntüsü incelendi. Ödüllü reklam sağlayıcısı kapalıysa savaş sonundaki uygun ödül bölümünde artık **neden kapalı olduğunu açıklayan disabled seçenek** görünür; sahte reklam oynatılmaz, sağlayıcı yokken reklam/ödül talebi başlatılmaz. Türkçe/İngilizce metinleri eklendi. Ödülsüz savaş/eksik battle ID için bölüm yine gizlidir.
4. `[x]` Tekrarlı native sync, önceki `androidDebugAdMob` regex'inde gerçek hata yakaladı: ilk self-closing metadata'dan FileProvider'ın paired metadata kapanışına kadar olan activity/provider içeriğini silebiliyordu. Regex self-closing/paired elementleri ayrı eşleştirir; iki activity + FileProvider + tekrar sync'i koruyan regresyon testi eklendi. Yalnız bu turdaki generated uzak manifest, kurulu Capacitor 8.5.0 şablonundan launcher/MainActivity/FileProvider korunarak onarıldı. Son XML parse ve iki sync'in SHA-256 idempotensi geçti; eski APK ve eski yerel generated proje silinmedi. İlk Gradle manifest parse hatası gerçekti; düzeltilmiş kaynakla tekrar derleme başarılı oldu.
5. `[x]` **Yeni APK r2 hazır:** `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r2.apk`, **20.874.354 byte**, SHA-256 **`992ed922edf8b5efa8a6c2750ff73e05c4b11766d4d062bac6cfb97ddfccdca7`**. Kimlik `com.gridshard.remotedebug`, ad GRIDSHARD TEST, versionCode **2**, versionName **2.1.0-beta.72-https-debug.2**. Gerçek debug derlemesi/63 web dosyası içerik özeti/ağ ve özel dosya sınırı/SecureStorage + yeni native display DEX sınıfı denetimi geçti; yeni dosya kopyasının özeti eşleşir. `apksigner verify` ile **önceki r1 APK'sıyla aynı imza** doğrulandı: kullanıcı mevcut test uygulamasını silmeden **güncelleyebilir**, profil verisi korunur. AAPT gerçek binary manifestte kimlik/sürüm/launcher/minSdk24/targetSdk36 doğruladı. Gerçek cihazda r2 kurulumu henüz yapılmadı. Java'nın eski Android için renk API'si deprecation uyarısı derlemeyi engellemedi; test/QA/key/runtime kimliği pakette yok.
6. `[x]` Son doğrulamalar: tam istemci **100/100**, build sözleşmeleri **9/9**, deployment/kaynak sınırı **10/10**; gerçek Android Chrome + iPhone Safari **emülasyonunda 4/4** mobil savaş ve azaltılmış güvenli viewport/dock/titreşim hizası testi. Emülasyon Android sistem çubuğu davranışını veya kamera donanımını doğrulamaz. Paket denetimi/imza kontrolü geçti. Bir ilk test yanlış eski checkbox ID'sini aradı, doğru mevcut ID ile düzeltildi; denetim sarmalayıcısının `$LASTEXITCODE` kontrolü PowerShell-only audit'i başarısız sanıyordu, `$?` ile doğru yeniden kontrol edildi. Kontroller atlanmadı. Pytest önbellek yazımı için erişim uyarısı var; **10 test geçti**. Yeni Docker image/web release dağıtılmadı; `dist` mobil çıktı **`da0a0576f89eb559`**, web sunucusuna aynen kopyalanmaz.
7. `[~]` **Sağlayıcılar hazır değil — gerçek sunucuda salt okunur doğrulandı:** Google OAuth client ID/secret/redirect, Apple client ID/team/key/private-key-file/redirect ayarları yok; AdMob SSV **kapalı**, reklam test modu **kapalı**. Yalnız var/yok bayrakları okundu, sır değerleri basılmadı; sunucu yapılandırması değiştirilmedi. Debug APK resmi Google örnek AdMob app ID'sini taşır, canlı yayıncı kimliği değil. Bu nedenle mevcut APK'ya reklam eklentisi eklemek veya yalnız butonu görünür kılmak Google/Apple bağlantısını ve reklam ödülünü çalıştırmaz.

### Sıradaki işler — öncelik sırası

- `[ ]` **r2 fiziksel telefon teyidi:** mevcut GRIDSHARD TEST'i kaldırmadan APK'yı güncelle; kamera boşluğu, alt üç düğmeyi/üst çubuğu kaydırarak açma, oyuna dokununca gizlenme, dock/SAVAŞ çakışmaması, klavye ve arka plan müziği tekrar kontrol edilsin. Wi-Fi/mobil veri + profil geri gelmesi r1'de kullanıcı tarafından geçti; iki gerçek cihaz PvP/reconnect hâlâ açık.
- `[ ]` **Google/Apple gerçek native OAuth:** sağlayıcı panelleri ve dış sunucu sırları kurulsun. Google redirect `https://play.gridshardgame.com/oauth/google/callback`; Apple `https://play.gridshardgame.com/oauth/apple/callback`, sağlayıcı kayıtlarıyla tam eşleşmeli. Sırları sohbete/Git/APK'ya koyma. Ayrıca mevcut `location.assign(authorization_url)` native WebView içinde yetkilendirmeye yönlenir; yalnız credentials eklemek native hazır kapısı değildir. Sistem tarayıcısı/Custom Tabs veya resmi native sign-in, doğrulanmış uygulamaya dönüş ve tek kullanımlık hesap exchange/kurtarma akışı uygulanıp gerçek cihazda test edilsin. `App` URL dinleyicisi kaynakta opsiyonel, ancak bu APK'daki dört native plugin arasında App/Browser yok; sahte dönüş/hesap bağlama açılmaz. Google [OAuth politikası](https://developers.google.com/identity/protocols/oauth2/policies) gömülü WebView yetkilendirmesini yasaklar. Web hesap akışı ve mevcut ilerleme korunacak, eski test uygulamasından hesap taşınmayacak.
- `[ ]` **Gerçek ödüllü reklam:** AdMob'da gerçek oyun API'sine SSV callback `https://play.gridshardgame.com/ads/admob/ssv`, doğru uygulama/birim kimliği, UMP/onay ve test cihazı kurulumu; SDK/panel/server yapılandırması eşleştirilsin. Debug örnek app ID ile canlı yayıncı birimini karıştırma. İmzalı SSV → aynı savaşa tek x2 kredi/deneyim, kupa hariç; replay/ikinci talep, başarısız veya yarım izleme ödülsüz testleri gerçek native cihazda doğrulandıktan sonra açılmalı. Üretimde test-provider/istemci onayıyla bakiye eklenmez.
- `[ ]` Aşağıdaki AWS alarm/şifreli off-host backup/key yedeği/expiry, disk şifrelemesi/CPU Standard/kredi paneli, gerçek ödeme/iade/push ve yayın CI kapıları korunur. User test hesabı/üretim verisi, eski APK/birimler silinmez. Sunucu durdurma/yeniden dağıtım gerekirse önce güncel canlı kullanım ve uygun yedek kontrol edilir.

## Aktif öncelik — AWS Free plan ile temiz Linux deneme sunucusu (2 Ekim 2026)

Oracle kayıt akışında kartlar kabul edilmedi; kullanıcı AWS hesabını açıp adım adım kuruluma geçti. Bu bölüm önceki sağlayıcı seçimi/Oracle kayıt adımlarının yerine geçer. Mevcut Cloudflare Pages destek sitesi ve yeni bireysel AdMob kimlikleri aşağıda korunur.

### Güncel durum — AWS/Cloudflare HTTPS/WSS ve HTTP yönlendirme doğrulandı; ayrı HTTPS test APK'sı hazır, gerçek cihaz kapısı açık (2 Ekim ev devamı)

**Bu kayıt aşağıdaki ilk bağlantı/duraklama tarihçesinin yerine geçer.** Başlangıç kaynağı `1a6b662`; bu turdaki değişiklikler çalışma ağacında, commit/push yapılmadı. Kullanıcı `play.gridshardgame.com` oyun alt alan adını açıkça onayladı. Root Pages destek sitesi korundu ve HTTPS 200 doğrulandı; son panel `www` kaydı bulunmadığını gösterir, çalışan `www` varsayılmaz. Oyun public HTTPS/WSS erişimi doğrulandı; tüm işletim/mağaza/native yayın kapıları tamamlandı sayılmaz.

1. `[x]` Kullanıcının son EC2 ekranında **ev ve iş için iki ayrı SSH/TCP 22 `/32` kuralı** görüldü. AWS günlüğüyle eşleşmiş ED25519 parmak izi evden yeniden karşılaştırıldı; tek public host kaydı proje dışında sabitlendi ve `StrictHostKeyChecking=yes` ile **ubuntu SSH girişi başarılı** oldu. Özel anahtar içerikleri okunmadı/kopyalanmadı; yerel anahtar ve public host dosyası owner-only `Read, Synchronize`, kalıtım kapalı. IP/SSH anahtar yolu, hesap/instance numarası veya MFA sırları Git'e eklenmedi. Agent AWS panelini değiştirmedi.
2. `[x]` Gerçek hedef **Ubuntu 24.04 LTS / amd64**, yaklaşık **1907 MiB RAM**, kök disk **19 GiB**, `cloud-init: done`, passwordless `sudo` olarak doğrulandı. Başlangıç image'ı 24.04.4 idi; Docker/oyun yoktu, UFW inactive. Resmi Docker APT deposuyla Engine **29.8.2**, Compose **5.6.0**, buildx kuruldu; ubuntu Docker grubuna eklenmedi. Host paket güncellemeleri ve gerçek reboot sonraki devamda tamamlandı; aşağıdaki 9. madde güncel kanıttır.
3. `[x]` Güncel izin-listeli kaynak ZIP'i SHA-256/CRC ve paket sınırıyla doğrulanıp yeni versioned Linux dizinine aktarıldı. İlk kaynak `artifacts/server-aws-20261002-1a6b662/`, düzeltilmiş kaynak **`artifacts/server-aws-20261002-1a6b662-tmpfs-fix/GRIDSHARD-2.1.0-beta.72-signatures-social.zip`**, SHA-256 **`5aae014457c7d543d7b8c9bfc8b25b02d8fe46379e0e1f63927aa97c15b02b38`**. Her ikisinde 724 kaynak + manifest; yalnız iki statik arena JSON'u, runtime/özel sır/QA çıktısı yok. Önceki ZIP ve kaynak silinmedi/üzerine yazılmadı. Kaynak ZIP testleri korur, **çalışan image test/QA dosyalarını içermez**. `/artifacts/` ayrıca Git ignore'a alındı. Bu son checkpoint/ignore kaydı ZIP üretiminden sonradır; runtime/build girdilerini değiştirmez.
4. `[x]` Sunucuda gerçek ana image **`gridshard-production-relay-web:latest` / `sha256:a0d23c99512eea431824a9a1fd96ddb3ac476f249810ad912f195315d9dcce37`**, bakım **`gridshard-production-maintenance:latest` / `sha256:1ef5e7006f6e832a24afd7dd672468b2dda086a9106750a30ffc6ae0bd1d12f0`** derlendi. Tamamen ayrı loopback-only PostgreSQL 17/Redis 7 fixture'larında `production_container_smoke` ve **image backup/empty-target restore passed**: ilk hesap, yetkisiz erişim reddi, token/profil korunarak restart ve bakım image'ından restore doğrulandı. Runtime UID **10001**, yalnız iki statik JSON, `.env`/sunucu testleri yok. Yalnız bu turun etiketli test kapsayıcıları ve anonim test birimleri temizlendi; eski/üretim verisi silinmedi.
5. `[x]` Gerçek standalone Compose ilk açılışında **tmpfs YAML hatası** yakalandı: tırnaksız virgüllü flow list dört mount gibi yorumlanıyordu (`invalid mount path: nosuid`). Hem API hem bakım için `tmpfs: ['/tmp:rw,noexec,nosuid,size=32m']` düzeltildi; parse edilen YAML'a regresyon testi eklendi. Image smoke bunun yerine doğru CLI mount'u kullandığı için önceki image kanıtı bu Compose açılışını kapsamıyordu. Düzeltilmiş kaynak **ayrı yeni** release dizinine açıldı; iki ZIP karşılaştırması runtime/build girdilerinin birebir aynı, farkların yalnız Compose/test/manifest olduğunu doğruladı. Bakım profili açık gerçek Compose modelinde tmpfs, yalnız Caddy TCP 443 ve iç ağ/port sınırı ayrıca geçti. İlk doğrulama komutunda kapalı bakım profilinin modelde olmaması komut hatasıydı; `--profile maintenance` ile düzeltildi.
6. `[x]` **Şu an çalışan gerçek üretim:** `/opt/gridshard/releases/aws-20261002-1a6b662-tmpfs-fix/GRIDSHARD-2.1.0-beta.72-signatures-social` kaynağından, Compose proje adı `gridshard-production`, **postgres/redis/relay-web healthy ve Caddy running**. Yeni dış sır dizini `/etc/gridshard-production-secrets`, dış backup dizini `/var/backups/gridshard-production`; sırlar araçla yeni üretildi, içerikleri basılmadı. Yeni `*-production-clean` PostgreSQL/Redis/runtime birimleri kullanılır; ilk kurulumda **0 player_data, 0 participant_identities, 0 store_receipts, 1 yeni installation** SQL ile doğrulandı. İç `/health` HTTP 200, production/PostgreSQL/Redis/worker lease ready. Son boşta ölçüm API yaklaşık **60 MiB**, PG **34 MiB**, Redis **4 MiB**; kapasite/yük garantisi değildir. **Yalnız Caddy TCP 443 hosta yayınlandı**; 8000/5432/6379/80/UDP443 yayınlanmıyor. Docker'ın `EXPOSE` çıktısı host port izni değildir. Cloudflare 443 güvenlik grubu eklemesi kullanıcı ekranıyla doğrulandı (10. madde); gerçek edge HTTPS/WSS kanıtı artık 11–12. maddelerdedir. Eski kayıtlar aktarılmadı.
7. `[x]` Cloudflare Origin CA alternatifi **`docker-compose.cloudflare.yml` + `deploy/Caddyfile.cloudflare`** eklendi: varsayılan ACME dosyası korunur, origin yalnız TCP 443, dış cert/key secrets, HTTP redirect/ACME/access log yok. `!override` için Compose >=2.24.4 gerekir; hedef 5.6.0 gerçek merge doğrulaması geçti. **Origin TLS private key yalnız Linux'ta**, root/0700 `/etc/gridshard-origin-tls-20261002` altında root/0600 kalır; indirilmedi/yeniden üretilmedi. Kullanıcının kaynak/Git dışındaki **public sertifika PEM'i** alındı: tam bir sertifika, private-key bloğu yok, SAN yalnız `play.gridshardgame.com`, geçerlilik **2 Ekim 2026 17:55 UTC – 28 Eylül 2041 17:55 UTC**. Sertifika public key hash'i mevcut sunucu key'iyle birebir eşleşti; resmi Cloudflare Origin RSA CA köküyle hostname/purpose/zincir doğrulaması **OK**. Public sertifika yeni dış `origin_cert.pem` olarak root/0600 kuruldu, eski dosya üzerine yazılmadı. Caddy **Valid configuration** verdi ve başlatıldı. Sunucunun loopback adresinde gerçek hostname/SNI + resmi CA doğrulamasıyla **HTTPS `/health` ve `/` HTTP 200, TLS verify result 0** geçti; `-k` kullanılmadı. İlk anlık curl, Caddy açılışı sırasında SSL_ERROR_SYSCALL verdi; sonraki sınırlı tekrarlar doğrulanmış TLS ile geçti. Bu origin kanıtıdır; DNS/Cloudflare edge/Full-strict/WSS kanıtı değildir. CSR aynı sunucu key'ine aittir; devamda yeni key üretme/üzerine yazma.
8. `[x]` Yerel tam istemci **91/91**, deployment/paket sınırı **10/10**, release guard ve `git diff --check` geçti. İlk istemci çağrısı yanlış proje kökünden çalıştırıldığı için `src/...` ENOENT verdi; paket script'iyle aynı `client` çalışma dizininden yeniden çağrıldığında tamamı geçti. Testler silinmedi/atlanmadı. Bu tur full server/uzak CI/native/edge WSS testi yapıldı sayılmaz.
9. `[x]` **Origin sertifikası devamında OS bakım kapısı kapandı:** duruş öncesi 0 oyuncu/aktif maç/WebSocket yeniden doğrulandı; doğru iki Compose dosyasıyla API/Caddy durdurulup bakım image'ından yeni **`/var/backups/gridshard-production/20261002-before-os-security`** yedeği alındı. Başarı manifesti ve dump SHA-256 doğrulandı; eski yedek/birim silinmedi veya üzerine yazılmadı. Resmi APT kaynaklarından **157 yükseltme + 9 yeni paket, 0 kaldırma** (`--no-remove`, mevcut config'ler korunarak) tamamlandı. Aynı pinli SSH ile kontrollü **OS reboot** sonrası kernel **`7.0.0-1014-aws`**, Docker/SSH active, PG/Redis/API healthy, Caddy running ve otomatik yeniden açılış doğrulandı. Kurulum UUID'si bakım yedeğiyle eşleşir; oyuncu/kimlik/makbuz sayıları yine 0. Gerçek hostname/CA kontrolüyle HTTPS health/oyun **200, TLS verify 0** yeniden geçti. `dpkg --audit` boş, reboot-required yok, failed systemd unit yok; APT kalan yalnız phased `sosreport` (0 yükseltme/0 kaldırma), zorla açılmadı. Kök diskte yaklaşık **12 GiB boş**. IMDS endpoint'ine **token olmadan yalnız durum kodu** sorgusu HTTP 401 verdi; **IMDSv2 token zorunluluğu** doğrulandı, metadata/rol credential'ı okunmadı. Bu bakım yedeği aynı hosttadır; şifreli dış yedek/izleme yerine geçmez. Yerel istemci **91/91** ve deployment/paket **10/10** tekrar geçti; gerçek native/edge WSS testi değil.

10. `[x]` **AWS Cloudflare 443 kuralı kaydedildi:** kullanıcı önce iki mevcut SSH `/32` satırını gösteren düzenleme ekranını, ardından AWS'nin başarılı kaydetme sonucunu paylaştı. Sonuçta **15 yeni TCP 443 kaynağının tamamı**, uygulama öncesinde resmi Cloudflare `ips-v4` listesinden doğrulanan 15 CIDR ile birebir eşleşir; açıklamaları `Cloudflare HTTPS`. Başarı ekranında yeni world-open/80/DB/API kuralı yok. Bu kullanıcı ekranı kanıtıdır; agent AWS paneline yazmadı, tam güvenlik grubu/API audit'i yapılmış sayılmaz. Önceki iki SSH kuralı korunması kararı değişmedi; yeni kural eklemelerini tekrar yapma. Sonraki DNS/strict/edge kapısı 11–12. maddelerde doğrulandı. IP/hesap/instance/güvenlik grubu kimlikleri Git'e yazılmadı.

11. `[x]` **Public Cloudflare HTTPS kapısı:** kullanıcının iki panel görüntüsünde `play` A kaydı mevcut hedefe **Proxied/turuncu bulut + Auto TTL**, SSL/TLS **Full (strict)**; root CNAME `gridshard-public.pages.dev` korunmuş. Public resolver artık Cloudflare edge adreslerini döndürüyor; önceki NXDOMAIN kaydı güncel değil. Dışarıdan gerçek güven kökü/hostname kontrolüyle **`https://play.gridshardgame.com/health` ve oyun `/` HTTP 200, TLS verify 0** geçti (`-k` yok). Edge `server: cloudflare`, CF-RAY, Caddy geçişi ve health `DYNAMIC` görüldü; production/PG/Redis/worker lease healthy. Root destek sitesi **`https://gridshardgame.com/` HTTPS 200** ayrıca geçti. Panelde `www` ve MX eksik uyarıları var; bunlar `play` HTTPS çalışmasını engellemiyor. İhtiyaç olmadan root/www/e-posta değiştirme, duplicate DNS ekleme veya proxy kapatma. İlk HTTP çağrıları zaman aşımına uğradı; kullanıcı Always Use HTTPS'i açtıktan sonraki gerçek 301→200 kontrolü 13. maddede tamamlandı. Origin 80 açılmadı. HSTS başlığı ilk HTTP yönlendirme kontrolünün yerine geçmez.

12. `[x]` **Gerçek iki istemcili edge WSS + hesap temizliği:** Git/paket dışında yok sayılan `artifacts/aws-bootstrap-20261002/verify_public_edge.py`, gerçek public HTTPS/WSS üzerinde iki yalnız bu teste ait yeni geçici hesapla çalıştı. Dokuz işlev kontrolü geçti: production health; kimliksiz mağaza HTTP 401; kimliksiz WSS handshake 403; yetkili yeni profil/mağaza 200; diğer hesaba erişim 403; iki ayrı TLS WSS bağlantısı; canlı deploy komut onayı; kontrollü kopuş/yeniden bağlanmada aynı oturum ve sequence korunması; iki istemcide aynı authoritative forfeit sonucu. Credential/token/device secret yalnız RAM'deydi, basılmadı/kaydedilmedi. İki geçici hesap yalnız kendi yetkili silme API'siyle silindi; tekrar profil erişimi 401, SQL'de test öneki için **0 profil/0 kimlik/0 mağaza makbuzu**. İdempotency sonuç defteri `applied`, katılımcı listesi boş ve terminal NULL olarak anonim kaldı; defter/üretim birimi silinmedi. İlk probe **exit 1** verdi: son kontrol `active_pvp_sessions` sayacını anlık aktif maç saydı. Kaynakta bu sayaç bitmiş sonuçları reconnect için **300 saniye** saklayan tüm RAM oturumlarını içerir; gerçek socket sayısı 0 ve maç bitmişti. TTL sonunda dış HTTPS kontrolünde **status ok, production, retained sessions 0 / WebSockets 0** kendiliğinden doğrulandı; restart/zorla silme yapılmadı. Bu ilk script exit'inin yeşil olduğu iddia edilmez; dokuz işlev ve ayrı doğal temizleme doğrulaması kanıttır. Uygulama sağlık kodu/testleri zayıflatılmadı. **İki fiziksel telefon veya yeni native APK denemesi yapılmış sayılmaz.**

13. `[x]` **HTTP→HTTPS ve native CORS:** kullanıcı Always Use HTTPS'i açtığını bildirdi. Gerçek dış çağrı **HTTP 301**, `Location: https://play.gridshardgame.com/`; redirect takipli çağrı **son HTTP 200, doğru HTTPS URL, TLS verify 0** verdi. Public health production/ok, retained sessions 0/WebSockets 0. `https://localhost` Origin'li `/auth/session` preflight **HTTP 200**, doğru allow-origin + POST/Authorization/Content-Type izinleriyle geçti. Cloudflare/SG yeni kural veya origin 80 açılmadı; paneli agent değiştirmedi.

14. `[x]` **Ayrı uzak Android test APK'sı hazır:** kullanıcı eski yerel uygulamayı güncellemek yerine ayrı test uygulamasını açıkça seçti. **`com.gridshard.remotedebug` / GRIDSHARD TEST**, `GRIDSHARD_LOCAL_DEBUG=1` + `GRIDSHARD_REMOTE_DEBUG=1`, `.mobile-debug/remote-android/`; eski `com.gridshard.localdebug` uygulaması/projesi, kalıcı `com.gridshardgame.app` ve cihaz verileri korunur. Ortak `tools/mobile-network-policy.js` API derlemesi/Capacitor/manifest için HTTPS kararını tekleştirir: debug kimliği tek başına cleartext açmaz; yerel HTTP yalnız ayrıca açık insecure bayrağı ve özel/loopback host ile kabul edilir, **uzak modda HTTP her durumda reddedilir**. HTTPS için `server.cleartext=false`, `allowMixedContent=false`, manifest `usesCleartextTraffic=false`, `allowBackup=false`; portre/tam ekran ayarı korunur. Debug AdMob SDK açılışında zorunlu public uygulama kimliği eksikti; kanca yalnız resmi Google örnek kimliğini ekler, canlı yayıncı kimliği/SSV açmaz. SecureStorage **8.0.1** native kaydı ve DEX sınıfı doğrulandı. Bu bilgisayarda JDK **21.0.10**, Gradle **8.14.3**, Android SDK **36** ile gerçek `assembleDebug` başarılı; bu ayrı generated projede AdMob SDK **25.4.0** sabitlendi, `versionName=2.1.0-beta.72-https-debug`, versionCode 1. APK: **`artifacts/mobile-https-20261002/GRIDSHARD-TEST-2.1.0-beta.72-20261002.apk`**, **20.874.175 byte**, SHA-256 **`719da52d8a98e91b02d891a90fc3afbcd6ebe5eb567bad2bcc022bc73d4ed88a`**; managed build çıktısı ayrı yerde korunur ve kopyanın özeti eşleşir. APK imzası **v2 verifies**, gerçek binary manifestte kimlik/ad/minSdk 24/targetSdk 36/cleartext false/backup false/portrait ve örnek AdMob kimliği kontrol edildi. Paket denetimi **63 web dosyası**, her dosya `dist` SHA'sıyla eşleşir; özel anahtar/QA/test/kaynak haritası/eski `com.example` kimliği yok. APK ve native projeler Git/Docker/source-release dışında tutulur; cihaz hesabı/secret/token pakete eklenmedi. Tam istemci **95/95**, build sözleşmeleri **9/9**, deployment/paket sınırı **10/10**, `git diff --check` geçti. İlk build fixture testleri sandbox temp erişimi, ilk Capacitor çağrısı sandbox `os.userInfo` engeliyle başarısızdı; aynı işlemler izinli ortamda geçti, kontroller atlanmadı. Bir audit çağrısı yanlış `client` dizininden başlatılmıştı; doğru kökten hem ilk hazırlık hem ayrı uzak APK denetimi geçti. Yeni helper için Docker **builder** COPY'si güncellendi; bu tur yeni Docker image/release dağıtılmadı, çalışan sunucu önceki doğrulanmış release/image'dadır. Yerel `dist` şu an **mobil** çıktıdır; web sunucusuna kopyalama, web için yeniden build gerekir. **Telefon kurulumu/soğuk açılış/profil geri gelmesi/gerçek ağ değişimi ve iki fiziksel cihaz maçı henüz yapılmadı.**

**Sıradaki adımlar / açık kapılar:**

- Public Origin sertifikası kuruldu ve origin HTTPS doğrulandı. Private key/API token/MFA isteme; yeni key veya self-signed sertifikayı mevcut sertifika yerine kullanma. Sertifika sona erme takibi ve ayrı güvenli key yedeği hâlâ işletim kapısıdır.
- OS paket güncellemeleri/reboot ve IMDSv2 doğrulandı; AWS disk şifrelemesi/CPU **Standard** ve kredi bakiyesi panelden henüz ayrıca doğrulanmadı. Yeni instance/ücretli plan/Elastic IP oluşturma yok.
- AWS güvenlik grubunda **15 Cloudflare origin IPv4 kaynağına TCP 443 eklenmesi başarılı kaydetme ekranıyla, gerçek edge erişimi HTTPS/WSS ile doğrulandı**; tekrar/duplicate ekleme yapma. SSH ev/iş `/32` korunur; 80/UDP443/DB/API veya world-open izin ekleme. Docker yayınları UFW'yi atlayabilir. Cloudflare IP allowlist zone'a özel mTLS değildir; Authenticated Origin Pulls ayrı kapı. IP listesi gelecekte değişirse yalnız resmi `https://www.cloudflare.com/ips-v4/` ile tekrar karşılaştır.
- `play` **A/Proxied, Full (strict), Always Use HTTPS ve HTTP 301→HTTPS 200** doğrulandı; tekrar DNS/kural ekleme. Root Pages HTTPS 200, mevcut CNAME korunur; `www`/MX uyarıları ihtiyaç kararı olmadan değiştirilmez. TLS private key yedek/güvenli kasa ve expiry takibi ayrı; public Origin CA doğrudan native/tarayıcı güven kökü değildir, proxy kapatılmaz.
- Yukarıdaki **güncel release dizini** ve iki Compose dosyası bütün bakım/yeniden açılışlarda korunur; aynı üretim birimleri/sırlar kullanılacak. Edge WSS/yeniden bağlanma/sonuç ve test hesabı temizliği geçti; ayrı **GRIDSHARD TEST** APK'sını telefonda yeni hesapla test et: Wi-Fi ve mobil veriyle açılış, soğuk yeniden açılışta aynı profil, tam ekran/arka plan sesi, devrem+rakip görünümü ve savaş/bağlantı geri dönüşü, mümkünse iki fiziksel cihaz. Eski uygulamayı kaldırma/veri temizleme/hesap aktarma yapılmaz. Eski yerel telefon onayı ve statik SecureStorage DEX denetimi bu yeni native kapıyı kapatmaz. Bağımsız alarm/şifreli uzak yedek hâlâ açık; test image restore otomatik uzak backup/gerçek oyuncu restore onayı değildir.
- Bağlı yüzeylerin önceki salt okunur envanterinde boş Codex IAB/MCP Apps, bağlı AWS/Cloudflare/Edge oturumu yoktu. Agent panel değişikliği yapmadı; AWS 443 ve DNS/proxy/Full-strict/HTTPS zorlama adımlarını kullanıcı tamamladı. Parola/MFA veya Console/API anahtarı sohbete istenmez.
- SSV/gerçek ödeme/OAuth/push hazır sayılmaz; AdMob SSV kapalı. SSH erişimi veya iç health, tam sunucu geçişi tamamlandı anlamına gelmez. Commit/push yapılmadı.

### Önceki AWS bağlantı/form/duraklama tarihçesi — aşağıdaki bekleyen SSH ifadeleri artık güncel değildir

**Güncel devam — ev bilgisayarı, 2 Ekim 2026:** Kullanıcı devam etmeyi istedi; önceki duraklama sona erdi. Çalışma ağacı başlangıçta temiz ve kaynak commit'i `1a6b662` idi; iş bilgisayarındaki güncel checkpoint/marka/Cloudflare/AdMob değişiklikleri burada mevcut. Kullanıcı güncel sunucu IPv4 adresi ile proje dışındaki yerel PEM yolunu sağladı; bu özel operasyon bilgileri Git'e yazılmadı. Anahtar dosyasının yalnız ACL metadata'sı incelendi. Kalıtımla diğer Windows kullanıcılarına verilen okuma erişimi yalnız bu dosyada kaldırıldı; son doğrulamada sahibine tek `Read, Synchronize` kuralı ve kapalı kalıtım görüldü. Dosya içeriği okunmadı/değiştirilmedi. **Evden, özel anahtar/agent kullanmadan yapılan SSH denemesi TCP 22 bağlantısında zaman aşımına uğradı.** Bu anahtar/parmak izi uyuşmazlığı kanıtı değildir: host el sıkışmasına ve kimlik doğrulamaya ulaşılmadı, host kaydı kabul edilmedi, uzak komut/kurulum yapılmadı. Sıradaki kapı AWS'de güncel `Running`/durum kontrolleri/IPv4 ve bağlı güvenlik grubunun ev dış IPv4'üne SSH 22 için `/32` izin vermesini doğrulamaktır. `/32` ev/iş kuralları korunur; erişim sorunu için `0.0.0.0/0` açılmaz. Önce bu ağ kapısı, sonra AWS günlüğüyle eşleşmiş ED25519 fingerprint'i yeniden karşılaştırıp güvenli SSH ve salt okunur sunucu kontrolü yapılır. MFA kodu/özel anahtar/şifre sohbete veya Git'e kaydedilmez; MFA sorusunun ardından başarılı Console girişi henüz kullanıcı tarafından doğrulanmadı.

**Ağ kapısı teşhisi — 2 Ekim ev devamı:** Kullanıcı Console'a giriş yaptı ve EC2 ekranını paylaştı: Frankfurt'ta `gridshard-test`, `t3.small`, **Çalışıyor / 3/3 denetim başarılı**. Kullanıcı güncel IPv4'ün aynı olduğunu bildirdi; kimlik doğrulamasız ikinci SSH kontrolü de TCP 22'de zaman aşımına uğradı. Ekrandaki bağlı `launch-wizard-1` grubunda görünen tek SSH/TCP 22 kaynak `/32` adresi, bu bilgisayardan AWS'nin resmi IPv4 kontrol hizmetiyle okunan güncel dış adresle **eşleşmiyor**. Adresler/hesap ve instance numaraları bu dosyaya yazılmadı. Kullanıcı mevcut iş kuralını koruyup ev dış IP'si için ayrı SSH/TCP 22 `/32` kuralı ekleyecek; kaydetme henüz doğrulanmadı. Agent AWS panelinde değişiklik yapmadı. Giriş kuralı kaydedilince host fingerprint/SSH kontrolü yeniden yapılır; geniş `0.0.0.0/0`, yeni instance veya ücretli plan gerekmez.

**Önceki duraklama / bilgisayar değişimi — 2 Ekim 2026:** Kullanıcı iş bilgisayarında çalışmayı burada durdurup akşam ev bilgisayarından devam etmek istedi. O kayıt sonrasında yeni devam isteğine kadar uzak bağlantı, kurulum, dağıtım veya otomatik devam yapılmadı. **EC2 oluşturma ve host parmak izi eşleşmesi tamamlandı; kimlik doğrulamalı SSH girişi ve oyun kurulumu henüz yapılmadı.** Devam noktası aşağıdaki "Ev bilgisayarında devam sırası"dır. Sunucu durdurulmadı; çalışır kaldığı sürede AWS kredi tüketimi devam eder. O turda commit/push istenmedi ve yapılmadı; evdeki güncel Git durumu üstteki devam kaydındadır.

1. `[x]` Kullanıcının kurulum öncesi AWS kredi/fatura ekranları **Free plan**, **100 USD kalan kredi**, **0 USD kullanılan kredi/tahmini fatura** gösterdi; VM açıldıktan sonraki bakiye henüz kontrol edilmedi. Hesap/kredi numarası, banka veya kişisel kimlik bilgileri kaydedilmedi. Kredi satırının 2027 son kullanma tarihi, Free plan'ın bir yıl süreceği anlamına gelmez: [güncel EC2 Free Tier](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html) yeni hesaplarda **en fazla 6 ay veya kredi bitene kadar** geçerlidir. Sürekli 6 ay çalışacağı veya kalıcı ücretsiz EC2 garantisi verilmez.
2. `[x]` Kullanıcı **MFA'nın etkin olduğunu** bildirdi; agent AWS panelinde işlem yapmadı. MFA QR/kurulum anahtarı, kod, root şifresi veya özel anahtar istenmedi/kaydedilmedi. Günlük kullanım için root erişim anahtarı oluşturulmaz.
3. `[x]` EC2 formu kullanıcı ekranlarıyla incelendi: **Europe (Frankfurt), `eu-central-1`**; son özette Canonical **Ubuntu 24.04 / amd64 noble image**, **`t3.small`**, **20 GiB**, **bir instance** görüldü. İlk Ubuntu 26.04 seçimi planlanan 24.04 ile değiştirildi. Kullanıcı **`gridshard-test` adlı sunucunun çalıştığını** bildirdi; agent instance oluşturmadı veya AWS durum/sağlık kontrollerini doğrulamadı. Kullanıcı IP ve yerel anahtar yolunu sağladı; SSH servisinin ağ yanıtı alındı, kimlik doğrulamalı SSH girişi yapılmadı. Ekrandaki Linux temel fiyatı **0,024 USD/saat** idi; kesintisiz 30 gün için **17,28 USD yalnız compute** hesabı paylaşıldı, disk/IPv4/trafik/olası CPU aşımı hariçtir. Free Tier-eligible etiketi kredi tüketilmediği anlamına gelmez; Paid plan yükseltmesi yapılmayacak.
4. `[~]` Yerel API + PostgreSQL + Redis + Caddy yapısı nedeniyle 1 GiB yerine 2 GiB deneme başlangıç adayı seçildi; bu ölçülmüş RAM alt sınırı veya oyuncu kapasitesi garantisi değildir. Gerçek VM build/yük ölçümü bekliyor. RSA/PEM `gridshard-test-key`, 20 GiB **gp3 + şifreleme / varsayılan aws/ebs**, CPU kredi şartnamesi **Standard**, ayrıntılı CloudWatch kapalı, Spot kapalı, yalnız IMDSv2 önerildi. Son özette anahtar seçimi, disk şifrelemesi ve Standard modu görünmedi; uygulanmış sayılmaz. Kullanıcı iki bilgisayar nedeniyle SSH'yi **Her yer / 0.0.0.0/0** bıraktığını bildirmişti; **My IP**, ardından ev/iş için ayrı `/32` kuralları önerildi, son durum henüz doğrulanmadı. Açık SSH güvenlik kapısıdır. Özel `.pem` içerikleri sohbete/Git'e yazılmaz; anahtar dosyası proje dışında saklanır. Bu Windows bilgisayarda **OpenSSH ssh.exe mevcut** olduğu salt okunur kontrolle doğrulandı. PostgreSQL/Redis/API portları internete açılmaz; HTTP/HTTPS başlangıçta kapalı önerildi, Cloudflare origin/TLS erişimi sonraki adımda sınırlanır.
5. `[ ]` Instance sağlık kontrolleri/IP/SSH doğrulamasından sonra hedefte güncel image build, boş PG/Redis/runtime kurulumu, oyun alt alan adı/Cloudflare/HTTPS-WSS ve iki cihaz testleri. Eski oyuncu/takım/kimlik/makbuz kayıtları **taşınmayacak**, eski dosyalar/birimler silinmeyecek. VM çalışması kullanıcı tarafından bildirildi; uzak işletim sistemi/SSH/Docker/oyun kurulumu veya oyun DNS/HTTPS/WSS dağıtımı henüz doğrulanmadı. Native/UMP/SSV/gerçek ödeme/uzak yedek kapıları açık, AdMob SSV kapalı kalır.

6. `[x]` Kullanıcı EC2 **Genel IPv4 adresini ve proje dışındaki `.pem` dosyasının tam yolunu** verdi. Origin gizleme hedefi nedeniyle IP/anahtar yolu Git'te izlenen bu dosyaya yazılmadı; gerektiğinde mevcut sohbetten veya EC2 panelinden alınmalı. Dosyanın varlığı ve yalnız ACL metadata'sı okundu; özel anahtar içeriği görüntülenmedi. İzinli, yalnız bu dosyaya uygulanan ACL düzenlemesiyle kalıtım kapatılıp mevcut sahibine yalnız **Read** verildi; diğer kullanıcı gruplarının okuma erişimi kaldırıldı ve sonuç kontrol edildi. Anahtar içeriği değiştirilmedi/taşınmadı. Sandbox ağ kontrolü engellendi; izinli salt okunur SSH el sıkışmasında **TCP 22 / Ubuntu OpenSSH** yanıtı alındı. Windows `ssh-keyscan` varsayılan KEX seçimiyle uyumsuzluk verdi; gerçek SSH istemcisi `curve25519-sha256` ve ED25519 ile host fingerprint'i alabildi. **StrictHostKeyChecking=yes** ve **özel anahtar/agent kullanılmadan** kontrol yapıldı; güvenilmeyen host anahtarı kabul edilmedi, giriş veya uzak komut/kurulum yapılmadı. Kullanıcı ağdan alınan **ED25519 `SHA256:mUVfmM7mNK+USvleLKEHIfYfOQQLP0UOVWGaSL7teTo`** değerinin **AWS sistem günlüğünde de bulunduğunu doğruladı**. Parmak izi herkese açık doğrulama bilgisidir; özel anahtar değildir. Böylece ilk host kimliği karşılaştırması kullanıcı kanıtıyla tamamlandı. Henüz `known_hosts` kaydı sabitlenmedi; kimlik doğrulamalı SSH, AWS durum kontrolleri ve son güvenlik grubu hâlâ doğrulanmadı. Eşleşme onayını takip eden tur kullanıcı tarafından durduruldu; o turda yalnız yerel okuma komutları başlatılmış olabilir, SSH girişi/uzak kurulum komutu başlatılmadı.

**Ev bilgisayarında devam sırası:**

1. Bu checkpoint ve `git status --short` okunur. **Checkpoint ve mevcut commit edilmemiş çalışma ağacı ev bilgisayarında da bulunmalı**; dosyanın burada kaydedilmesi başka bilgisayara otomatik Git aktarımı değildir. Mevcut Cloudflare Pages/AdMob/marka değişiklikleri ve ileri temiz PG/Redis geçişi korunur; kaynak GRIDSHARD2.1 yeniden topluca kopyalanmaz.
2. Orijinal `.pem` dosyası kullanıcı tarafından **güvenli biçimde**, Git/proje/yayın paketi dışında ev bilgisayarına aktarılır. AWS özel anahtarın aynı kopyasını tekrar indirtmez; yeni key pair oluşturmak mevcut sunucunun giriş anahtarını kendiliğinden değiştirmez. İçerik sohbete/e-postaya veya Git'e gönderilmez. Evde yalnız dosyanın yeni tam yolu istenir; Windows dosya izinleri evdeki kullanıcı için yeniden kontrol edilir, iş bilgisayarındaki ACL doğrulaması eve taşınmış sayılmaz.
3. AWS'de `gridshard-test` güncel **Genel IPv4 adresi** ve durum kontrolleri kontrol edilir. Sunucu durdurulup başlatılmış/yeniden oluşturulmuşsa IP veya host anahtarı değişebilir; eski IP'ye körlemesine bağlanılmaz. SSH kaynağı **iş/ev dış IP'leri için ayrı `/32`** kurallarıyla sınırlandırılır, `0.0.0.0/0` kalıcı bırakılmaz. Bu adımın uygulandığı henüz doğrulanmadı.
4. Evden SSH el sıkışmasındaki ED25519 fingerprint yukarıdaki **AWS günlüğüyle eşleşmiş değerle** yeniden karşılaştırılır; eşleşmeden `yes`, `StrictHostKeyChecking=no` veya kimlik doğrulama kullanılmaz. Gerekirse güncel AWS host fingerprint'i yalnız ilgili satırla doğrulanır. Eşleşme sonrası host kaydı güvenle sabitlenip **`ubuntu`** kullanıcısıyla anahtar tabanlı SSH kurulur. Önce yalnız Ubuntu sürümü, RAM/disk, mevcut servisler/ağ/izinler okunur; disk şifrelemesi, CPU Standard modu ve güvenlik grubu gibi açık ayarlar ayrıca kontrol edilir.
5. Sonra güncellemeler/Docker Engine + Compose, güncel tek kaynak sürümü ve **boş PostgreSQL/Redis/runtime** kurulur; Cloudflare oyun alt alan adı/origin TLS/HTTPS-WSS ve iki cihaz testlerine geçilir. **Eski oyuncu/takım/kimlik/makbuz verileri hiçbir şekilde taşınmaz, eski dosyalar/birimler silinmez.** Root Pages destek sitesi korunur; AdMob SSV/gerçek ödeme/native kapıları tamamlanmış sayılmaz.

**Sınırlar:** Free plan korunur; AWS Organizations/Control Tower veya plan yükseltmesi gibi ücretli plana geçirebilecek adımlar yapılmaz. Hesap/kredi/MFA/host eşleşmesi kanıtı gerçek oyun dağıtımı veya sağlayıcı reklam/ödeme hazırlığı değildir. Bu duraklama turunda yalnız checkpoint güncellendi; uygulama/Compose/gerçek `.env`/Google-Cloudflare-AWS panelleri değiştirilmedi, sunucuya giriş/komut gönderilmedi, commit/push yapılmadı. Kullanıcı ev bilgisayarından devam isteyene kadar çalışmaya devam edilmez.

## Aktif paket — bireysel AdMob hesabının yeni kimlikleri (2 Ekim 2026)

**Önce bu güncelleme esas alınır.** Kullanıcı eski kuruluş AdMob hesabını sıfırlayıp bireysel hesapla devam ettiğini bildirdi. Aşağıdaki Cloudflare/AdMob tarihçesindeki eski yayıncı, uygulama ve reklam birimi kimlikleri ile ilk ZIP **artık aktif kurulum için kullanılmaz**. Hesap türü bildirimi, Google hesap/uygulama onayının veya canlı reklam hazırlığının tamamlandığı anlamına gelmez.

1. `[x]` Yeni **herkese açık** yayıncı satırı kullanıcıdan alındı: `google.com, pub-4974825529326987, DIRECT, f08c47fec0942fa0`. `public-site/app-ads.txt`, paket/basit tarayıcı kontrolleri ve operatör rehberi güncellendi. Eski site ZIP'i silinmedi veya üzerine yazılmadı.
2. `[x]` Yeni Android **normal ödüllü** birim kimliği **`ca-app-pub-4974825529326987/6776291719`** ve türü kullanıcıdan alındı; `.env.example` ve mağaza rehberine kaydedildi. Yeni Android AdMob **uygulama kimliği** **`ca-app-pub-4974825529326987~9642213924`** kullanıcıdan alındı; gerçek Android manifest metadata örneği mağaza rehberine işlendi. Üç kimlik aynı yeni yayıncıyla eşleşir; birbirinden türetilmedi. Native `android/` projesi/manifest henüz oluşturulmadı; kimliğin rehbere yazılması SDK kurulumu değildir.
3. `[x]` Eski hesap kimlikleri aktif `.env.example` ve mağaza kurulum rehberinden çıkarıldı; regresyon testi yeni uygulama/birim/yayıncı eşleşmesini ve eski hesabın aktif örneklerde bulunmamasını denetler. **`GRIDSHARD_ADMOB_SSV_ENABLED=0`**, iOS birimi boş, Play/Capacitor paket adı **`com.gridshardgame.app`** ve yerel debug ayrımı korunur. Gerçek `.env`, sağlayıcı/native proje, Google panelleri veya sunucu geçişi kodu değiştirilmedi; canlı reklam açılmadı.
4. `[x]` Güncel odaklı kimlik/statik site testleri **11/11**, tam istemci **91/91**, yerel Chromium TR/EN 8 sayfa × masaüstü/393px/320px **24/24** geçti. Özgün marka varlıkları byte düzeyinde aynı; yeni site yalnız 19 izin listeli statik dosya içerir. Native/gerçek reklam/UMP/SSV/sağlayıcı ve uzak dağıtım doğrulaması yapılmış sayılmaz.
5. `[x]` Yeni yükleme ZIP'i **`artifacts/public-site-20261002-admob-individual/GRIDSHARD-public-site.zip`**, **247041 byte**, SHA-256 **`365b68a41ed58f0a7019c2c280800f8126c191a4d1a2c5d614e0217a555c2641`**. ZIP kökünde `index.html` bulunur; tüm girişler build manifest hash'leriyle ve yeni yayıncı satırıyla kontrol edildi. Kaynak proje, `.env`, oyun/özel veri, operatör manifesti veya uygulama/reklam birimi kimlikleri ZIP'e alınmadı.
6. `[x]` Kullanıcı yeni paketin Cloudflare yayınını **tamamladığını** bildirdi. Agent 2 Ekim'de gerçek `https://gridshardgame.com/app-ads.txt` adresini HTTPS ile okuyup **HTTP 200**, **`text/plain; charset=utf-8`** ve yeni satırın **birebir eşleşmesini** doğruladı. Ana sayfa, `/privacy/` ve `/delete-account/` ayrıca HTTP 200 döndü. İlk web aracı dosyayı okuyamadı ve sandbox HTTP okuması ağ izniyle engellendi; izinli salt okunur HTTP kontrolü başarılı oldu. Agent Cloudflare/Google panellerine yazmadı veya DNS değiştirmedi; yayın kullanıcı tarafından tamamlandı.
7. `[ ]` **AdMob'un kendi tarama/uygulama hazırlığı onayı ayrı kapıdır.** Canlı dosyanın doğru olması reklam gösterimi, mağaza bağlantısı veya native/UMP/SSV hazır onayı değildir. SSV kapalı kalır; uygulama mağazada keşfedilebilir olduğunda mevcut geliştirici web sitesi üzerinden AdMob keşif/doğrulaması kontrol edilecek. Yeni uygulama/birim oluşturma veya gerçek reklam açma yok.

**Sunucu seçim güncellemesi:** Kullanıcı Oracle kart engelinden sonra AWS hesabını açtı; Free plan/kredi ekranları ve MFA kullanıcı bildirimi üstteki aktif önceliğe kaydedildi. Aşağıdaki Oracle kayıt adımı artık yürütülen adım değildir. Frankfurt/Ubuntu 24.04/t3.small/20 GiB form özeti görüldü; kullanıcı `gridshard-test` VM'sinin çalıştığını bildirdi. IP/anahtar yolu alındı, SSH servis yanıtı ve AWS sistem günlüğüyle ED25519 host parmak izi eşleşmesi doğrulandı. Kimlik doğrulamalı SSH/sağlık ve ağ sertleştirme kontrolü henüz bekliyor; kullanıcı akşam ev bilgisayarından devam etmek üzere duraklattı. Ücretli plana geçiş onayı verilmedi. Gelişmiş temiz PG/Redis geçişi, eski kayıt taşımama, mevcut Cloudflare/Pages/domain ve gerçek HTTPS/WSS/native/UMP/SSV açık kapıları korunur. Commit/push yapılmadı.

## Önceki öncelik — Oracle Always Free deneme sunucusu (2 Ekim 2026)

Kullanıcı oyun satışlarının ödeme yönetimini şimdilik bekletip **sunucu kurulumuna devam etmeyi** onayladı. Bu, mevcut ödeme profilini silme, ücretli bulut hesabına geçme veya gerçek satın alma/reklam açma yetkisi değildir.

1. `[x]` Paylaşılan son Play ekranlarında mevcut profilin hesap türü **Bireysel**, satılan ürün kategorisi **Bilgisayar yazılımı** ve satıcı ödeme paneli görüldü. Banka hesabı doğrulaması bekliyor; %15 hizmet ücreti programı kaydı tamamlandı sayılmaz. Bu işler gerçek satış öncesine ertelendi. Geliştirici kimlik doğrulaması veya Google'ın verdiği son tarihler bu ertelemenin dışında kalır. Kişisel ad/adres, ödeme profili numarası ve banka bilgileri checkpoint'e alınmadı.
2. `[x]` Güncel checkpoint ve temiz dağıtım rehberi yeniden incelendi. Yerel Docker/PG17/Redis kanıtları korunur; uzak Linux, SSH, gerçek HTTPS/WSS ve iki cihaz denemesi henüz yok. Eski oyuncu/takım/kimlik/makbuz kayıtları **taşınmayacak**; eski dosyalar ve birimler silinmeyecek.
3. `[ ]` Kullanıcı Oracle Free Tier hesabını açacak; **Home Region** seçimi tamamlanmadan mevcut bölge seçenekleri birlikte kontrol edilecek. Oracle hesabı/ana bölge/IP/SSH henüz sağlanmadı. Ana bölge sonradan değiştirilemiyor ve Always Free Compute kaynakları bu bölgede açılmalı. Kart ve kimlik bilgileri yalnız Oracle'a girilir; sohbete/Git'e gönderilmez. Pay As You Go yükseltmesi yapılmayacak.
4. `[ ]` Güncel hesap limitleri ve kapasite doğrulandıktan sonra Always Free-eligible Ubuntu/Ampere A1 deneme VM'si seçilecek. 2 Ekim'de kontrol edilen [resmi Always Free belgesi](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) A1 için **aylık 1500 OCPU-saat / 9000 GB-saat, toplam 2 OCPU / 12 GB RAM** ve toplam **200 GB boot/block volume** sınırını bildiriyor. Eski 4 OCPU/24 GB bilgisini veya deneme kredisini kalıcı ücretsiz kaynak sayma; gerçek Console limit/etiket/ücret özeti yeniden kontrol edilecek. Kapasite bulunması garanti değil, boşta kalan ücretsiz VM'ler geri alınabilir; sahte yük üretme veya otomatik ücretli alternatife geçme yok.
5. `[ ]` Ardından güvenli SSH, hedef mimaride yeni image build, boş PG/Redis/runtime kurulumu, Cloudflare bağlantısı, HTTPS/WSS ve iki cihaz testleri yapılacak. Ana alan adındaki mevcut Pages destek sitesi korunacak. Oyun alt alan adı, origin erişim sınırı ve TLS yöntemi sunucu oluştuğunda netleştirilecek; uzak dağıtım veya DNS değişikliği henüz yapılmadı. Reklam SSV/gerçek ödeme/native yayın kapıları açık kalır.

**Şimdi kullanıcıdan gereken:** [Oracle Free Tier](https://www.oracle.com/cloud/free/) kayıt akışında ülkeyi Türkiye seçip e-postasını doğrulaması; **Home Region / Ana Bölge** seçeneklerini kişisel bilgileri gizleyerek paylaşması. Hesabı zaten açtıysa yalnız kayıtlı ana bölgeyi ve Console'a giriş yapabildiğini bildirmesi yeterli. [Oracle kayıt rehberi](https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingup_topic-Sign_Up_for_Free_Oracle_Cloud_Promotion.htm).

## Aktif paket — Cloudflare alan adı ve tanıtım/destek sitesi (2 Ekim 2026)

**Güncel dış girdiler:** Kullanıcı AdMob ve **bireysel Google Play Console kayıtlarını tamamladığını** bildirdi; bu bildirim hesap/üretim onaylarının tamamlandığı anlamına gelmez. `gridshardgame.com` alan adını **Cloudflare Registrar** üzerinden aldı; Cloudflare hesabı/DNS yönetimi artık mevcut, nameserver aktarımı gerekmiyor. İlk DNS ekranındaki “0 kayıt” bilgisi artık tarihçedir: `gridshard-public` Pages projesi ve custom domain kullanıcı tarafından kuruldu, domain **Active** oldu. Destek adresi **`gridshardgame@gmail.com`**. Kullanıcı önerilen **`com.gridshardgame.app`** kimliğiyle Play Console uygulama oluşturma adımını tamamladığını bildirdi; bu mağaza yayını değildir. Oracle/Linux/SSH hâlâ bekliyor.

1. `[x]` Oyun/sunucudan ayrı `public-site/` kaynağı, `tools/build-public-site.js` ve operatör rehberi hazırlandı. TR/EN ana sayfa, destek, gizlilik ve hesap silme sayfaları; özgün amblem/favikonlar byte düzeyinde korunur. JavaScript, çerez/yerel depolama, reklam/analitik SDK, login veya veri toplama formu yok. CSP/diğer başlıklar, sitemap ve gerçek 404 dosyası var. Güncelleme/build çıktısı yalnız `build/public-site/`; kaynak proje, `server/data`, sırlar veya oyun istemcisi Pages'e yüklenmeyecek.
2. `[x]` Kullanıcı **herkese açık** AdMob satırını sağladı: `google.com, pub-9009542461979439, DIRECT, f08c47fec0942fa0`. `public-site/app-ads.txt` ve site paketi bu satırı içerir. Örnek/uydurma kimlik üretilmez. Dosyanın hazırlanması **AdMob doğrulaması, reklam hazır onayı veya app/ad-unit ID yapılandırması değildir**.
3. `[x]` Hesap silme sayfası uygulama içi mevcut onaylı yolu tarif eder, uygulamayı kaldırmış oyuncuya e-posta taslağı ve açık destek adresi verir. Kendisi silme yapmaz/forma veri göndermez; destek kutusunun gerçekten izlenmesi ve asgari hesap sahipliği doğrulaması yayıncının işidir. Şifre/oturum/recovery sırrı/kart bilgisi istenmez. Hesap silmenin satın alma iadesi veya Google/Apple hesabı silme olmadığı belirtilir.
4. `[~]` **Gizlilik metni yayın öncesi açıklamadır; son hukuki/üretim onayı değildir.** Mevcut koda dayalı ürün analitiği varsayılan kapalı/ham kayıt 30 gün/opt-out silme, ayrı operasyonel telemetri ve PG hesap silme kapsamı açıklanır. Kesin üretim yedek/destek yazışması saklama takvimi, yaş/hedef kitle, gerçek etkin sağlayıcılar, Play Veri Güvenliği ve AdMob UMP/SDK açıklamaları **oyun yayını öncesi tamamlanmalı**. Kamuya açık metin eksik saklama takvimini gizlemez. `.env.example` içindeki eski 180 gün yorumu gerçek ürün analitiği saklama süresi değildir; bu tur sunucu/ortam kodu değiştirilmedi.
5. `[x]` Odaklı statik paket sözleşmeleri **6/6** geçti; gerçek yerel Chromium ile TR/EN 8 sayfa × masaüstü/393px/320px **24/24** sayfa/düzen kontrolü geçti. Yatay taşma, eksik amblem, dış istek veya sayfa hatası yok; mobil ana sayfa/hesap silme ekranları incelendi. Bu yalnız statik site doğrulamasıdır, oyun/telefon/uzak DNS/TLS/sağlayıcı kanıtı değildir.
6. `[x]` Kullanıcıya verilecek ZIP **`artifacts/public-site-20261002/GRIDSHARD-public-site.zip`**, **247041 byte**, SHA-256 **`532804ac3241a4e284d849cceca3be841e550c90f49c7160e0bbbcfc8cfe7793`**. Yalnız 19 izin listeli dosya; `index.html` ZIP kökünde. Her build dosyası manifest hash'iyle, ZIP girişleri izin listesiyle kontrol edildi. Üretim manifesti ZIP dışında kalır. Önceden var olan ZIP üzerine yazılmadı.

7. `[x]` Kullanıcının Pages yayını sonrasında gerçek HTTPS ana sayfa, `/privacy/`, `/delete-account/` ve `/app-ads.txt` **HTTP 200** olarak kontrol edildi. `app-ads.txt` **text/plain** ve sağlanan satırla birebir eşleşti. Bu AdMob tarama/uygulama onayı değildir; burada oyun API'si barındırılmıyor.
8. `[x]` Android kalıcı kimliği **`com.gridshardgame.app`** olarak Capacitor varsayılanına ve `.env.example` mobil/Google Play makbuz ayarlarına işlendi; yayın/ödeme rehberleri eşlendi. Yerel debug kimliği `com.gridshard.localdebug` ve `.mobile-debug/android` ayrımı korunur. Yeni kimlik regresyonları **4/4**, tam istemci **90/90**, JS sözdizimi ve diff denetimi geçti. İlk test çağrısı yanlışlıkla depo kökünde çalıştırıldığında eski testlerin göreli `src/` okumaları başarısız oldu; paket script'inin kullandığı `client/` çalışma dizininden tekrar çalıştırılıp tamamı geçti, test/uygulama kodu bu nedenle değiştirilmedi. Gerçek `.env`, hizmet hesabı/sır dosyası, native proje veya imzalı APK/AAB oluşturulmadı/değiştirilmedi.

9. `[x]` Kullanıcı Android AdMob uygulama kimliğini sağladı: **`ca-app-pub-9009542461979439~7800939638`**. Herkese açık kimlik, `docs/STORE_PURCHASES.md` içinde doğru Android manifest metadata örneğiyle kaydedildi. `android/` ve yerel debug manifesti şu anda yok; bu tur native proje/manifest üretilmedi veya reklam SDK'sı başlatılmadı. Reklam birimi kimliği, gerçek SSV/UMP/test cihazı ayarları ve sağlayıcı onayı hâlâ bekler. Android kimliği iOS'a yazılmaz; `GRIDSHARD_ADMOB_SSV_ENABLED=0` korunur. Yalnız belge değişikliği; uygulama testleri/derlemesi yeniden çalıştırılmadı.

10. `[x]` Android **normal ödüllü** birim kimliği **`ca-app-pub-9009542461979439/9939928525`** kullanıcıdan alındı; yeni oluşturma ekranı “ödüllü reklam uygulama kılavuzu” gösteriyor. Önceki **`…/1319116750`** ekranında “ödüllü geçiş” vardı; bu birim yapılandırmaya alınmadı/silinmedi. Doğru birim `.env.example` ve mağaza rehberine kaydedildi; gerçek `.env` veya SDK/native proje değiştirilmedi. **SSV kapalı (`0`), iOS birimi boş** kalır. Yeni regresyon testi bu sınırları ve doğru kimliği denetler; kimlik/örnek ortam kümesi **5/5**, tam istemci **91/91** ve diff denetimi geçti. Gerçek reklam gösterimi/UMP/SSV/sağlayıcı onayı tamamlanmış değildir.

11. `[x]` Kullanıcı Play Console mağaza iletişim bilgilerini **kaydettiğini** bildirdi: destek `gridshardgame@gmail.com`, web sitesi `https://gridshardgame.com`. Bu kullanıcı bildirimi; agent panelde doğrulamadı ve mağaza yayını/AdMob keşif doğrulaması anlamına gelmez.

**Güncel sıra:** Kullanıcının kararıyla ödeme yönetimi beklemede; **Oracle hesabı/ana bölge → Always Free Linux sunucu → güvenli temiz kurulum → Cloudflare/HTTPS-WSS → test sürümü** sırasına dönüldü. Yukarıdaki aktif öncelik esas alınır. Bireysel geliştirici kaydı, oyun içi satışlar için satıcı/ödeme yönteminin doğrulandığı anlamına gelmez; gerçek satış öncesinde banka doğrulaması, mağaza ürünleri, native sağlayıcı ve son gizlilik/Veri Güvenliği kapıları tamamlanmalı. Mevcut ödeme profilini gereksiz yere yeniden oluşturma/silme; kişisel kimlik/banka/vergi bilgileri yalnız Google'ın paneline girilir. SSV adresi yalnız gerçek HTTPS oyun API'si hazır olduğunda bağlanacak; tanıtım sitesi veya örnek API adresi kullanılmaz. Mağaza yayını sonrası AdMob mağaza bağlantısı ve tarama/onay ayrıca tamamlanır. Direct Upload Pages projesi yerinde Git-integrated modele çevrilemez; güncellemelerde yalnız izin listeli statik site paketi yayımlanmalıdır.

**Korunan sınırlar:** Agent bu tur Cloudflare/Play/AdMob panellerine yazmadı, commit/push yapmadı; statik sitenin uzak yayını kullanıcı tarafından tamamlandı. Sunucu geçişi, temiz PG/Redis kurulumu ve eski kayıt taşımama kararı değişmedi. `play.gridshardgame.com`/`api.gridshardgame.com` öneri, oluşturulmuş canlı adres değil; mevcut oyun istemcisinin aynı-origin API davranışı gerçek topolojiye göre ayrıca uyarlanmalı. Native/UMP/mağaza gerçek fiyatı/ödeme-iade ve Oracle/SSH/HTTPS-WSS/işletim kapıları aşağıda açık kalır.

## Aktif paket — kaynak marka görselleri ve animasyonlu açılış geri alındı (1 Ekim 2026)

Kullanıcı `D:\Projects\GRIDSHARD2.1` içindeki görsellerin **yeniden tasarlanmadan, animasyonlarıyla aynen** alınmasını istedi. Önceki seçici aktarımda eksik bırakılan `client/assets/branding/gridshard-emblem.webp` eklendi; sunucu geçişi/temiz kurulum kararları korunur.

1. `[x]` Kaynakla **39 görsel dosyası SHA-256 düzeyinde birebir** doğrulandı: web/mağaza/favikon/şeffaf amblem ve 32 Android/iOS PNG kaynağı. Web/mağaza ikonları zaten birebirdi; asıl eksik şeffaf açılış amblemiydi. Görseller yeniden üretilmedi veya yeniden kodlanmadı. Favicon önbellek parametresi `brand-20261001` oldu.
2. `[x]` Kaynağın `.boot-*` CSS bloğu ve keyframe'leri aynen alındı; tüm blok hash'i `5b9f8d3a4997e2ab33751e004528d92094dddb02236a996c4c7c1390dbbff009`. Dönen iki halka, süzülen amblem, kayan ışıklar, başlık parıltısı, çizgili ilerleme çubuğu ve yumuşak kapanış korundu. Root ID `startup-loading` olarak tutuldu; diğer görsel elemanlarda kaynak `boot-*` isimleri var.
3. `[x]` Kaynağın sunucu açılış orkestrasyonu hedefin üzerine kopyalanmadı. `startup-loading.js`, kaynak sunum sınıfını hedefin **sunucu → profil → koleksiyon → hesap** gerçek adımlarına bağlar. İlerleme yalnız tamamlanan API adımlarıyla artar; süreye bağlı sahte ilerleme/tamamlanma yok. Hata açık kalır ve yeniden denenebilir; tüm adımlar tamamlanmadan kapanış reddedilir. Kaynak görünme/kapanış süreleri korundu. Hesap/günlük meta/davet pencereleri ve ilk maç eğitimi açılışın önüne geçmez. Yeni dinamik açılış/sürüm/yüzde metinleri TR/EN sabit anahtarlarla çalışır.
4. `[x]` `native-assets/` içindeki hazır Android uyarlanabilir/yuvarlak/tek renk ikonları ve açılış amblemi, iOS AppIcon/açılış PNG'leri alındı. Yeni `tools/configure-native-branding.js` mevcut portre/Capacitor sync kancasına bağlandı; Android debug/üretim hedefleri ayrıdır. Kaynağın MainActivity/tam ekran araçları hedefe topluca kopyalanmadı; güvenli depolama/yedek dışlaması, üretim ağ sınırı ve ses/tam ekran yaşam döngüsü korunur. Bu tur native proje oluşturulmadı, APK/AAB/IPA üretilmedi veya telefona kurulmadı.
5. `[x]` Tam istemci **86/86**, paket sözleşmeleri **8/8** geçti. Gerçek tarayıcıda masaüstü Chromium + Android Chrome/iPhone WebKit **9/9** açılış/çevrimdışı sunucu/profil hatası/yeniden deneme ve orijinal animasyon kontrolü geçti; mobil ekran görüntüsü incelendi. Web build **727d555e1ed49b91** üretildi ve amblem pakete bağlandı. Paket testlerinin geçici dizin okuması ilk sandbox koşusunda reddedildi; aynı test komutu izinli ortamda 8/8 geçti. `pnpm` otomatik bağımlılık yeniden kurulumu istemi nedeniyle doğrulamalar doğrudan mevcut Node/Playwright komutlarıyla çalıştırıldı; bağımlılık/lockfile değiştirilmedi.

**Devam:** Kaynak/üretim kodu ve web build güncel; yeni Docker image yeniden derlenmeli. Commit/push/uzak dağıtım veya gerçek native cihaz doğrulaması yapılmadı. Sunucu/ödeme sağlayıcısı açık kapıları aşağıda korunur. Kullanıcı Cloudflare/Oracle hesabı henüz olmadığını, **AdMob hesabının mevcut olduğunu**, Google Play Console'u **bireysel yayın** için açtığını bildirdi. Sonraki monetizasyon adımları kalıcı application ID, mağaza ürünleri, mağazadan gerçek yerel fiyat sorgusu, AdMob UMP/gizlilik akışı ve gerçek hesap/cihaz doğrulamasıdır; sırları sohbete/Git'e koyma.

## Aktif paket — kart sırası ve operatör üst barı düzeltmeleri (1 Ekim 2026)

Kullanıcının son ekran görüntüsündeki dört küçük düzeltme uygulandı. Sunucu geçişi/temiz kurulum kararı ve önceki kaynak aktarımı korunur.

1. `[x]` Modül koleksiyonu alfabetik sıralanmıyor: **arena açılma sırası → yaygın/nadir/epik/efsanevi → aynı grupta kanonik kart sırası**. Dil, seçili deste veya kategori filtresi kartların ilerleme sırasını değiştirmez; sunucu koleksiyon dizisi yerinde değiştirilmez.
2. `[x]` İstemcinin otomatik `wt-…` hesaplarına sunucuda **14 karakterlik `Pilot-7A3C91B2` biçiminde** kalıcı görünen ad verilir. Kimlik/token/ilerleme değişmez. Bellek ve çevrimdışı kalıcı adlar mevcut benzersizlik politikasıyla kontrol edilir; çakışmada başka kısa ad seçilir. PostgreSQL yalnız kimlik/ad alanlarını okur, tam profilleri yüklemez; mevcut transaction/advisory kilidi ve son yazım tekillik kontrolü korunur. Hâlâ hesap kimliğini adı olarak gösteren profil normal kullanımında düzeltilir; kullanıcı tarafından seçilmiş adlar korunur. Toplu eski veri aktarımı/yeniden adlandırması yapılmadı.
3. `[x]` Üst bardaki tıklanabilir unvan, varsayılan buton puntosunu devralmak yerine daha küçük `.7rem` yardımcı yazı kullanır; unvan penceresi ve ödül bildirimi çalışmaya devam eder.
4. `[x]` Profil, kozmetik/ödül sekmeleri, arkadaş sekmeleri ve unvan bildirimleri ortak küçük, hafif parıltılı göstergelere geçti. Büyük parlak küre ve sürekli büyüyüp küçülme kaldırıldı; mesaj kutusunun okunmamış sayı rozeti de aynı renk/parıltı ailesine alındı. Bildirim durumunu/okundu mantığını değiştirmez.
5. `[x]` Tam istemci **78/78**, odaklı profil/isim/kalıcılık/kimlik/unvan sunucu kümesi **32/32** geçti. Gerçek Chromium ile ana gezinme ve **393×852 mobil görünüm** kontrolleri **2/2** geçti; kısa ad, hesap açılışı, kart sırası/kategori filtresi, unvan boyutu ve tek sade bildirim göstergesi kontrol edildi, ekran görüntüsü incelendi. Web build **dd20bc003284e9a8** üretildi. Bu tur gerçek cihaz veya yeni PostgreSQL/Docker image doğrulaması yapılmadı.

**Devam:** Aşağıdaki Docker doğrulaması önceki build'e aittir; yeni düzeltmeler dağıtımdan önce image'a yeniden derlenmelidir. Uzak Linux staging/SSH ve alan adı/DNS bilgisi hâlâ kullanıcıdan beklenen geçiş girdisidir. Commit/push/uzak dağıtım yapılmadı.

## Aktif paket — gerçek Docker/PostgreSQL 17/Redis doğrulaması tamam (1 Ekim 2026)

Kullanıcı Docker Desktop'ı açtı. Linux Docker Engine **29.6.2**, Docker Desktop **4.83.0**, Compose **5.3.1** ile yalnız bu tur için oluşturulan ayrı test ağı/kapsayıcıları kullanıldı. Eski `server/data`, eski Docker birimleri ve eski oyuncu kayıtları yeni kuruluma bağlanmadı.

1. `[x]` Gerçek PostgreSQL 17 + Redis 7 üzerinde Linux test kümesinde **1019 geçti**; kalan tek rapor testi, geçici `qa_reports` mount'unun gizlediği kaynak fixture bağlandıktan sonra ilişkili testlerle birlikte **4/4 geçti**. Böylece 1020 ayrı sunucu/operatör testinin tamamı doğrulandı; gerçek PG/Redis testleri atlanmadı. İlk ortam hataları (salt okunur rapor alanı/Git eksikliği) uygulama testlerini kaldırarak kapatılmadı; kaynak salt okunur tutuldu, raporlar geçici tmpfs'e yazıldı, Git yalnız test kapsayıcısına kuruldu.
2. `[x]` Ana image ve bakım image'ı gerçek Docker'da derlendi. Ana image `gridshard-transition:5eba90e5` / `sha256:ab38834e5d2cbeb9d040e461f9913135dbb941c2d94336f0b66c58484e79e725`; bakım `gridshard-maintenance-transition:5eba90e5` / `sha256:48457ee9b12f9210a93d1fa0901678daaa3e112b0b39b517d08e49da9bc600ec`. İstemci build ID **b20ec7c35515e357**; gerçek image UID **10001**, statik veri dizininde yalnız iki arena JSON'u var. Alt dizinlerdeki test/Node/Git önbellekleri `.dockerignore` ile build bağlamı dışında bırakıldı.
3. `[x]` `tools/production_container_smoke.py` ile boş DB/runtime üzerinde üretim açılışı, yetkisiz erişimin reddi, ilk hesap/token/profil, yeniden başlatma sonrası profil/token korunması, durmuş image'ın bakım image'ıyla yedeği ve **ayrı boş DB/runtime'a geri yüklenerek aynı token/profil ile açılışı geçti**. Docker Desktop bridge/rastgele yerel port desteği ve restart sonrası portu yeniden okuma eklendi. CI aynı gerçek image geri yükleme provasını artık çalıştırır; **uzak CI çalıştırılmadı, push yapılmadı**.
4. `[x]` Gerçek Caddy image'ı `deploy/Caddyfile` için `Valid configuration` verdi; standalone üretim Compose `config --quiet` geçti. Bu yerel kontroller gerçek alan adı/TLS/uzak WSS veya native cihaz doğrulaması değildir.
5. `[x]` Teste ait iki servis kapsayıcısı, kesin olarak Redis fixture'ına ait olduğu doğrulanan tek yeni anonim birim ve test ağı kaldırıldı. Smoke DB/runtime/sırları araç tarafından temizlendi. Eski birimler korunur; iki doğrulanmış build image'ı yerelde bırakıldı. Kaynak ZIP önceki pakettir ve bu turdaki araç/CI değişikliklerini içermez. Henüz commit/push/uzak dağıtım yok.

**Sıradaki gerekli kullanıcı bilgisi:** Kullanılacak Linux staging sunucusunun IP/SSH bağlantı adı ve oyun için alan adı/DNS erişimi. Docker açma engeli kapandı. Sonraki iş gerçek boş sunucu kurulumu, HTTPS/WSS/iki cihaz, ardından imzalı native paket ve gerçek sağlayıcı doğrulamasıdır; sırları sohbete/Git'e yazma.

## Aktif paket — GRIDSHARD2.1 son düzeltmelerinin seçici aktarımı (1 Ekim 2026)

30 Eylül kaynak kopyası `D:\Projects\GRIDSHARD2.1` hedefteki 1 Ekim sunucu geçişinden eskidir. Klasör topluca kopyalanmadı; aşağıdaki bağımsız düzeltmeler hedef koduna uyarlandı. Bu paket henüz commit/push veya uzak dağıtım değildir; önce `git status --short` okunmalıdır.

1. `[x]` Operatör unvanlarının tek seferlik ödülü, profil penceresi, bildirim işareti ve TR/EN metinleri alındı. Talep yolu hedefin kimlik doğrulaması ve `014` ekonomi idempotensi/tek PostgreSQL işlemi içine bağlandı. Savaş deneyimi değerleri ve arena bot havuzundaki 12 savunma destesi kaynak düzeltmelerine eşitlendi.
2. `[x]` Google Voided Purchases ile Apple Notification History üzerinden kaçırılan iade bildirimlerini tarama alındı. İade/tersine iade sırası için olay zamanı korunur; Apple imza hatası pencereyi ilerletmez. Canlı iade ile geçmiş mutabakatı hedefin profil+makbuz ortak transaction'ını kullanır. Worker sahipliği veya kapanışta tarama durur. Gerçek mağaza hesaplarıyla doğrulanmadı.
3. `[x]` Kaynağın yeni web/mağaza ikonları ve tekrarlanabilir `tools/generate_brand_assets.py` betiği alındı; favicon önbellek sürümü yenilendi. Betik bu ortamda Pillow bulunmadığı için çalıştırılmadı. Kaynak native şablon/kopyalama aracı ile ayrı açılış akışı alınmadı: hedefteki doğrulanmış tam ekran/ses yaşam döngüsünü ve sunucuya bağlı yükleme ekranını geriye götürebilir. Android/iOS ikonları değiştirilmedi.
4. `[x]` Odaklı sunucu testleri **37/37**, tam istemci **77/77**, mevcut ortamda `worker_ownership` dışındaki aktif sunucu **967 geçti, 36 atlandı, 5 seçilmedi**; Python/JS sözdizimi ve diff boşluk denetimi geçti. `worker_ownership` testleri `requirements-test.txt` içinde tanımlı fakat burada kurulu olmayan `fakeredis[lua]` nedeniyle bu turda çalıştırılamadı; gerçek Redis doğrulamasının yerini sentetik testler tutmaz. Gerçek Docker/PG17/Redis/HTTPS/native/sağlayıcı kapıları hâlâ açık; eski oyuncu/takım/kimlik/makbuz/analitik kayıtları aktarılmayacak, eski `server/data` ve Docker birimleri korunacak.

**Güncelleme:** Docker Desktop açıldı ve yukarıdaki gerçek altyapı doğrulaması tamamlandı. Sonraki kullanıcı girdisi Linux staging sunucusu/SSH ve alan adı/DNS bilgisidir. Sunucu geçişi kodu ve temiz kurulum kararı aşağıdaki 1 Ekim bölümünde korunur.

## Aktif paket — sunucu geçişi: yerel uygulama tamam, gerçek dağıtım kapıları açık (1 Ekim 2026)

**Devam ederken bu bölüm ve üstteki Docker doğrulama güncellemesi esas alınır.** Aşağıdaki 30 Eylül ve daha eski bölümler aşama tarihçesidir; oradaki eski test sayıları ve açık kod görevleri güncel durum değildir. Eski oyuncu, takım, kimlik, platform, makbuz ve analitik verileri yeni sunucuya **aktarılmayacak**. Kaynak `server/data` ve eski Docker birimleri korunur. Yeni üretim PostgreSQL'i ve runtime birimi boş başlar.

### Tamamlanan kod ve yerel doğrulama

1. `[x]` SERVER-1/2/3/4 ortak kalıcılık: PostgreSQL oyuncu/kimlik/platform/takım/preset/telemetri/analitik yolu üretimde zorunlu; `PersistentState` tek worker canlı nesnelerini kilitler ve ortak SQL commit/rollback sağlar. Sosyal davet/DM/outbox, takım üyeliği/bağış/turnuva ve hesap silme aynı sınırdadır. Sağlayıcı ağ çağrıları transaction dışında; eski işlem makbuzu sonraki üyelik/engel kararını canlandıramaz. `014_economic_operations.sql` ekonomi isteklerini oyuncuya kapsamlı işlem kimliği ve payload özetiyle tekilleştirir; çelişkili tekrar 409 olur, eski bakiye geri yazılmaz.
2. `[x]` SERVER-5 kalıcı sonuç defteri: `013` terminal niyeti önce `pending`, sonra profiller/istatistikler/turnuva ayağı/katılımcılar ve `applied` işaretini tek commit kaydeder. RAM kaybından sonra tekrar işleme ve hata rollback'i gerçek PostgreSQL'de geçti. Bekleyen sonuçlar sonraki sezon/gün/ödül mutasyonundan önce tamamlanır; sonuç tarihi korunur. 27 Eylül–2 Kasım uzun kesinti fixture'ı haftalık/sezon hesaplarını sınar. PvP, ödülsüz arkadaş antrenmanı ve takım turnuvası hesapları ayrıdır. **Aktif RAM maçları süreç kaybından sonra devam etmez; terminal niyet kaydından önce süreç kaybına sıfır veri kaybı garantisi verilmez.**
3. `[x]` SERVER-6/7 ownership ve reconnect kodu: PostgreSQL tek-worker advisory kilidi + Redis süreli sahiplik token'ı; lease kaybında runner/API/WS fail-closed, presence süreli, Redis rate-limit hatasında yerel fallback yok. Kimlik iptali/ownership kontrolü event loop'u engellemeyen thread'de; terminal auth kapanışında istemci komut kuyruğunu temizler ve yeniden bağlanmaz. Aynı süreçte iki tarayıcıyla gerçek PvP/yeniden bağlanma **2/2 geçti**. Gerçek Redis ve süreçler arası dağıtım doğrulaması aşağıda açık; çok-worker/HA desteği ilan edilmez.
4. `[x]` SERVER-8 güvenli native sır deposu kodu: pinli Capacitor secure-storage, doğrulanmış güvenli yazımdan sonra eski plaintext temizliği, RAM access token ve kesintide kurtarmayı koruyan iki aşamalı recovery kaydı. Üretim native'de plaintext fallback yok; Android backup dışlaması korunur. Yeni plugin'i içeren APK ve gerçek cihaz testi henüz yapılmadı.
5. `[x]` SERVER-0/9/10 dağıtım hazırlığı: izin listeli, UID 10001, salt okunur tek-worker image; ayrı `docker-compose.production.yml`, iç PostgreSQL 17/Redis ağı, yalnız Caddy 80/443, HTTPS/WSS exact-origin/host kontrolü, sır dosyaları, temiz kurulum UUID'si. `tools/provision_server_secrets.py` yalnız yeni dış Linux dizinine sır üretir, üzerine yazmaz ve içerikleri basmaz. QA/test çıktıları, eski runtime, anahtarlar ve sağlayıcı özel dosyaları paket sınırından dışlanır. Sunucu açılış/profil/içerik/hesap adımlarına bağlı yükleme ekranı ve hata/yeniden deneme çalışır.
6. `[x]` SERVER-11 yedek/kurtarma aracı: canlı worker varken yedek reddi, yeni hedef/kurulum UUID'si/şema checksum/kayıt sayısı/SHA-256 doğrulaması ve yalnız boş DB/runtime'a geri yükleme gerçek PostgreSQL 16'da geçti. `deploy/Dockerfile.maintenance` bakım profili ve `docs/SERVER_PRODUCTION_RUNBOOK.md` güvenli kurulum/geri dönüş rehberi eklendi. Otomatik dış alarm, şifreli uzak yedek ve WAL/PITR kuruldu anlamına gelmez.
7. `[x]` Güncel test sözleşmesi: kaldırılmış generator/taşıma/swap/laboratuvar/özel hücre ve eski `/web-test/*` yönetim API'lerine bağlı **67 tarihsel test dosyası silinmeden** `docs/archive/server-test-contracts-20261001/` altında korunur. Manifest/README her dosyanın nedenini ve güncel karşılığını açıklar. Yeni aktif negatif testler eski komutların reddini, eski HTTP yüzeylerinin 410 dönmesini ve veri değiştirmemesini sınar. Geçerli ekonomi/UI/ses/paket testleri arşivlenmedi, güncel sözleşmeye uyarlandı. Bu işlem eski testlerin aynen geçtiği veya sessiz `skip/xfail` ile kapatıldığı iddiası değildir.
8. `[x]` Son yerel sonuçlar: izole PostgreSQL 16 + şema **014** ile tam aktif sunucu **988 geçti, 1 atlandı**; tek atlama gerçek Redis URL/servisinin bulunmaması. Tam istemci **77/77**, production build sözleşmeleri **8/8**, Python operatör/paket araçları **5/5**. Paket denetimi büyük/küçük harfli özel dosyaları da dışlar; izlenen symlink veya checkout dışına çözülen yol varsa paketlemeyi reddeder. Masaüstü Chromium + Android Chrome/iPhone WebKit emülasyonunda başlangıç/menü/güncel sezon/savaş/ses/FCT/mobil düzen **12/12**, ayrıca gerçek iki istemci PvP **2/2**. `pnpm build:web` build ID: `d2e19155aa306804`. Testler eski oyun verilerinden ve birbirlerinden izole; tarayıcı emülasyonu native/sağlayıcı testi değildir.
9. `[x]` Temiz **kaynak** paketi `artifacts/server-transition-20261001/GRIDSHARD-2.1.0-beta.72-signatures-social.zip` altında üretildi; yanında SHA-256 dosyası vardır. ZIP bütünlüğü, yalnız iki statik arena JSON'u, 67 tarihsel test kaynağının korunması ve özel/runtime/QA çıktılarının dışarıda kalması denetlendi. Bu bir APK veya üretim hazır onayı değildir; Docker runtime ayrıca yalnız izin listesindeki kodu alır. Paket çalışma ağacındaki değişiklikleri içerir; henüz commit/push yapılmadı.

### Açık kapılar — sıradaki çalışma

1. `[~]` **SERVER-6/10/11 altyapı kapısı:** yerel gerçek PostgreSQL 17 + Redis + image açılış/yeniden başlatma + Caddy + bakım image geri yükleme doğrulaması yukarıda geçti. CI aynı kontrolleri içerir; **uzak CI çalıştırılmadı ve push yapılmadı**. Commit/push/yayın adayına bağlı uzak CI kanıtı henüz açık.
2. `[ ]` **SERVER-10 staging:** kullanıcıyla hosting/alan adı seçimi ve Linux/SSH/DNS yetkisi; rehberdeki yeni boş kurulum, gerçek HTTPS/WSS, iki cihaz oturumu, token iptali/reconnect, kalıcı profil ve sıfır çift ödül denemesi. Satın alma veya uzak sunucuya yazma bu turda yapılmadı; sırları sohbete/Git'e koyma.
3. `[ ]` **SERVER-8 native/sağlayıcı:** kalıcı application ID + yeni imzalı test paketi; secure-storage/recovery, tam ekran/arka plan ses duruşu, HTTPS/WSS gerçek telefon. OAuth/Google Play/Apple, ödeme-iade/ödüllü reklam, e-posta ve push için gerçek sağlayıcı hesabı/sırlarıyla uçtan uca kanıt. Sağlayıcı yapılandırılmamışken sahte hazır/başarı açma.
4. `[ ]` **SERVER-11 işletim:** gerçek image'dan alınan yedeği ayrı boş Compose projesine geri yükle; dış sağlık/disk/yedek yaşı alarmı, şifreli uzak kopya ve saklama politikası. Birimleri silme, `down -v`, eski JSON import veya canlı DB'ye restore yapma.

Yerel PostgreSQL 16 test kümesi `gridshard-pg-transition-20260930` başarıyla durduruldu; yalnız doğrulanmış temp dizini kaldırıldı. Canlı veriler/sırlar değişmedi. Sunucu geçişi hedefi gerçek dış kapılar kapanmadan **tamamlandı sayılmaz**. Yeni çalışmada önce bu kapılardan ilerlenebilir olanı seç; eski tarihçe görevlerini tekrar uygulama.

## Tarihçe — eski kayıt taşımadan temiz sunucu kurulumu (30 Eylül 2026)

Kullanıcının son kararı: **eski oyuncu, takım, platform, makbuz veya analitik kayıtlarından hiçbiri yeni sunucuya taşınmayacak.** Kaynak `server/data` ve eski Docker birimleri yerinde korunur; yeni kurulum boş PostgreSQL ve ayrı boş runtime birimiyle başlar. `Kesici` ad çakışması artık yeni kurulumun engeli değildir. Eski JSON → PostgreSQL veri aktarımı ve ad uzlaştırma çalışması iptal edildi.

1. `[~]` SERVER-9 temiz başlangıç sınırı: `006_clean_installation.sql` tek kurulum kimliği ekledi. Üretim açılışı kimlik ilk kez yazılırken tüm kalıcı PostgreSQL uygulama tablolarının boş olmasını ister; dolu eski veritabanını reddeder. `GRIDSHARD_RUNTIME_DATA_DIR` üretimde zorunlu ve kaynak ağacının dışında. İlk açılışta dizin boş olmalı; kurulum işareti veritabanı kimliğiyle eşleşir. `docker-compose.yml` eski `./server/data` bağını kaldırıp yeni `*-clean` adlı PostgreSQL/Redis/runtime birimleri kullanır. Eski dosya veya birim **silinmedi**. Sentetik temiz kurulum/yol testleri geçti. Gerçek Docker/PG açılışı henüz doğrulanmadı.
2. `[~]` SERVER-1/2/3 üretim depo geçişi: oyuncu ve kimlik PostgreSQL yoluna ek olarak `007`–`011` ile platform, takım, savaş havuzu presetleri, telemetri ve rızaya bağlı analitik PostgreSQL'e bağlandı. Üretim artık bu kayıtlar için JSON dosyası kullanmaz. Platform belgesi satır kilitli; takım belgesi revision/CAS korumalı. Bunlar eski kayıtlardan veri aktarmaz. Gerçek izole PostgreSQL çalıştırması `GRIDSHARD_TEST_DATABASE_URL` eksik olduğu için bekliyor; yalnız sentetik repo testleri geçti.
3. `[~]` SERVER-4 mağaza alımı/iadesi: `PostgresPool.transaction()` aynı istekteki oyuncu profili ve `platform_document` makbuz durumunu tek commit/rollback'e bağlar; makbuz tekrar kontrolü kilit altında, hata sonrası önbellek kalıcı kayıttan yüklenir. İade bildirimi kimliği aynı transaction içinde kaydedilir; henüz eşleşmeyen makbuz 503 ile sağlayıcıya yeniden denetilir. Google Play tüketim onayı ayrı, tekrar denenebilir adımdır. Diğer ekonomi, bağış ve maç sonucu yazımları hâlâ çapraz-kayıt atomik değil; bu kısmi kazanım üretim hazır onayı değildir.
4. `[~]` SERVER-3/4 takım modül bağışı: üretimde takım satırı ve ilgili iki oyuncu satırı kilitlenip takım isteği, bağışçı eksi parça ve alıcı artı parça tek PostgreSQL transaction'ında yazılır; hata sonrası önbellek disk kaydına döner. Diğer takım üyelik/turnuva ekonomi yolları aynı güvenceye alınmadı.
5. `[~]` SERVER-4 eşzamanlı profil yazısı: `012_player_revision.sql` oyuncu sürümünü ekledi. PostgreSQL repository mevcut sürümü karşılaştırarak günceller; eski sürüm sessizce yeni kupa/parça/bakiyeyi ezmek yerine hata verir. Hazırlık sosyal SQL yazıcısı da sürümü artırır. Aynı süreçte farklı işlemlerin paylaştığı canlı profil nesnesi için tüm mutasyonları kapsayan kilitleme/yeniden deneme hâlâ açık.
6. `[x]` SERVER-2 arkadaşlık alt paketi: üretimde istek/kabul/ret/iptal/engelleme/engeli kaldırma API yolları iki profil, ilişkisel arkadaş/istek/blok kenarları, gerçek `platform_document` blok aynası ve işlem makbuzunu ortak PostgreSQL commit/rollback'e bağlar. Kilit sırası platform → sabit kimlik sıralı oyuncular; önkoşullar kalıcı kayıttan kontrol edilir, önbellek yalnız commit sonrası güncel revision ile yüklenir. İşlem kimliği oyuncuya göre kapsamlanır; farklı hedef/eylemle yeniden kullanımı 409, tekrar teslimi mevcut sonucu verir. Eski bir iptal/kabul/blok paketi daha sonraki kararı geri çevirmez. Kabul anında 100 arkadaş sınırı ve iki tarafın engeli yeniden kontrol edilir. Üretim blok API'si artık `request_id` ister; mevcut istemci gönderir, eski istemci kimliksiz istekle 422 alır. Geliştirme JSON yolu korunur; hiçbir eski kayıt aktarılmaz. Arkadaş savaşı/davet kodu, DM-bildirim/outbox ve hesap silme bu kazanımın dışında.
7. `[x]` SERVER-2 sosyal iş akışı kodu: `PostgresSocialRuntime` arkadaş savaşı oluşturma/kabul/ret/tamamlanma, davet kodu tüketimi, DM ve okundu işlemlerini gerçek `platform_document` bildirimi/push iş kuyruğu, ilgili profiller ve idempotency makbuzlarıyla aynı transaction'a bağlar. Davet eski süreçten kaldığında sona erer; tamamlanmış davet tekrar kabul edilerek savaş canlandırılmaz. Aktif davetler geçmiş sınırı yüzünden budanmaz. `PostgresAccountErasure` soğuk profillerdeki sosyal bağlantıları, bildirim/push kaynaklarını, kimliği, analitiği ve takım üyeliği/yönetici devrini atomik temizler. Gerçek push sağlayıcısı/cihaz teslimi bu kod testinin yerine geçmez.
10. `[~]` SERVER-3/4 ortak işlem paketi: `PersistentState` tek worker üretimde eşzamanlı canlı profil mutasyonlarını sıralar; ilgili profilleri kalıcı kayıttan alır, platform/takım/profil/preset yazıcılarını ortak transaction'a bağlar ve hata sonrası önbelleği geri yükler. Sync profil/ekonomi/takım/sosyal handler'ları açıkça bu sınırda; sağlayıcı ağ çağrıları dışarıda. Okuma sırasında sezon/gün değişimi de kaydedilir. İlk yetkili giriş yeni profili kimlik/cihaz kaydıyla birlikte oluşturur. Eski takım kabul/ayrılma makbuzu sonraki üyeliği geri çeviremez. Takım üyeliği yazısından sonra hata, paralel bakiye değişimi ve ayar/analitik hata rollback testleri gerçek PostgreSQL'de geçti. Tüm ekonomi isteği türlerinde bağımsız işlem kimliği/payload çatışması denetimi ve gerçek HTTP yük senaryoları hâlâ denetlenmeli.
11. `[~]` SERVER-5 sonuç defteri: `013_battle_results.sql` bitiş olgularını önce `pending` kaydeder; profil, istatistik, turnuva ayağı ve katılımcı sonucu ile `applied` işareti tek commit olur. Hata sonrası RAM dedup işaretleri temizlenir; başlangıç/bakım yeniden denemesi RAM kaybından sonra pending sonucu tamamlar. Maç başına defter kilidi tekrar ödülü önler; farklı sonuçla aynı kimlik reddedilir. Maç sonrası ve geçmiş API'leri PostgreSQL sonucunu okur. Silinen katılımcı hayalet profil olarak geri oluşturulmaz. Tick callback'i DB işini ayrı thread'de yürütür. Odaklı gerçek PG/oyun kümesi **39/39 geçti** (son ek otomatik kayıt kontrolünde eski `coins` fixture'ı kanonik `circuit_credits` ile güncellendi; yeni toplu koşu bekliyor). Çok dönemli uzun kesinti, terminal kayıt yazılmadan süreç kaybı ve HTTP reconnect uçtan uca hâlâ ayrı kapılar.
12. `[ ]` Sıradaki SERVER-6/7 kapısı: tek worker yaşam döngüsü/ownership lease, Redis presence ve süreç kaybı/reconnect kurallarını tamamla; ardından SERVER-8 güvenli native sır deposu, SERVER-10/11 dağıtım/HTTPS/geri yükleme/CI kapıları. Docker komutu Windows PATH'te ve beklenen kurulum yolunda yok. WSL'de yalnız `docker-desktop` kaydı bulundu; distro içindeki CLI bu kullanımın desteklenmediğini bildirdi, gerçek motor/image doğrulanmadı. Yerel Redis hizmeti de bulunmadı. Uzak sunucu/alan adı satın alma yetkisi ve gerçek sağlayıcı bilgileri alınmadan bunlar tamamlandı sayılamaz.
13. Çalışma sürüyor: yalnız bu tura ait izole PostgreSQL 16 kümesi `C:\Users\S-A\AppData\Local\Temp\gridshard-pg-transition-20260930`, port `55444`, DB `gridshard_test` açıktır; eski verilere bağlı değildir. İş bitince `pg_ctl -m fast -w stop`, sonra doğrulanmış yalnız bu temp hedefi temizlenmeli. Önceki paket kümesi kapatılmıştı; bu yeni kümeyi onunla karıştırma. Kullanıcının “bitirene kadar durma” hedefi aktiftir; dış yetki gerektirmeyen işleri sürdür.
8. `[~]` Önceki paket: odaklı gerçek PostgreSQL + depo/mağaza bildirimi/takım testleri **30/30**, ek oyuncu kalıcılığı/sosyal/mağaza doğrulama testleri **34/34** geçti. İzinli ağ erişimiyle kilit dosyasındaki pnpm bağımlılıkları kuruldu, `pnpm build:web` geçti ve derlenmiş istemciyle üretim modülü içe aktarıldı (sahte bağlantı adresleriyle, servis açılışı değil). Eski kayıtlardan ayrı geçici PostgreSQL 16 kümesinde `012` dâhil gerçek SQL entegrasyon testleri **5/5 geçti**; profil+makbuz ortak commit/rollback'i, sürüm çatışması ve temiz kurulum kimliği/aynı dizinle yeniden açılış doğrulandı. Geçici test kümesi durdurulup yalnız kendi temp dizini kaldırıldı; eski oyun verilerine dokunulmadı. Tam sunucu test toplaması kaldırılmış eski oyun API'lerine bağlı 12 tarihsel içe aktarım hatasında duruyor; ayrı test borcu. Docker komutu kurulu değil; gerçek kapsayıcı/Redis/HTTPS/cihaz/sağlayıcı dağıtımı henüz doğrulanmadı.
9. `[x]` Arkadaşlık alt paketi doğrulaması: odaklı sunucu kümesi **70/70**, bunun içinde ayrı geçici PostgreSQL 16 üzerindeki gerçek entegrasyonlar **13/13** geçti. `test_postgres_social_api.py` üretim handler'larını gerçek DB ile sınar: ortak commit, platform yazısından sonra enjekte edilen hatada iki profil/kenar/makbuz/ayna rollback'i, eşzamanlı aynı ve çapraz istekler, uzun istemci kimliği, farklı hedefte kimlik çakışması, tekrar teslimde eski kararın canlanmaması, hayalet oyuncu oluşturmama ve eski önbellekle kalıcı arkadaş sınırını aşmama. `pnpm test:client` **68/68**, `pnpm build:web` ve `git diff --check` geçti. Geçici test PostgreSQL kümesi durduruldu ve yalnız bu paketin doğrulanmış test dizinleri kaldırıldı; canlı veriler/sırlar değiştirilmedi. Bunlar HTTP/cihaz/Redis/sağlayıcı uçtan uca veya üretim hazır onayı değildir.

## Tarihçe — eski veri için salt okunur sosyal geçiş hazırlığı (artık kullanılmıyor)

0. `[~]` `005_social_transactions.sql` ile işlem makbuzu, arkadaş savaşı daveti ve push outbox tabloları **additive** eklendi; `PostgresSocialTransactionRepository` arkadaşlık/istek/blok iki profil+ilişkisel kenar+platform blok aynasını, davette iki profil+bildirim+outbox'ı tek transaction'da hazırlar. Aynı operasyon kimliği tekrarı/idempotency ve çelişkili kimlik reddi vardır. **Canlı API'ye bağlanmadı; eski JSON veri aktarılmayacak.** Saf sosyal durum geçişi+envanter ve açık boş-platform CLI testleri 14/14 geçti, gerçek PostgreSQL entegrasyon testi ortamda `GRIDSHARD_TEST_DATABASE_URL` olmadığı için bekliyor. Eski oyuncu JSON'unda iki `Kesici` adı tespit edilmişti; artık aktarım dışıdır. İsim değişikliği veya silme yapılmadı.
1. `[x]` Sosyal/platform için geçerli işlem sınırı `docs/SERVER_MIGRATION_PLAN.md` içine açıkça yazıldı: arkadaş/istek/blok alanlarının kanonik kaydı oyuncu profilinde, platform blok alanı ayna; hedefte iki profil, sosyal tablolar, blok aynası ve outbox aynı PostgreSQL transaction'ında olmalı. Mağaza makbuzu/bakiye/iade ayrı SERVER-4 atomiklik kapısıdır. Mevcut endpoint kilitleri ve ayrı kayıt yazımları bu garantiyi sağlamaz.
2. `[x]` `server/app/social_migration_audit.py` ve `tools/audit_social_migration.py` eski verinin yalnız salt okunur envanteri için yazıldı. Üretim temiz kurulumunda kullanılmaz; hiçbir veri aktarılmadı veya yazılmadı.
3. `[ ]` Sıradaki kapı: ortak PostgreSQL transaction/idempotency/outbox uygulamasını gerçek sosyal API ve hesap silmeye bağla. Eski verinin denetimi, ad çakışması uzlaştırması ve içe alma artık yapılmayacak. `003`/`004` hazırlık tabloları canlı sosyal/mağaza API'sinin kaynak kaydı değildir.

## Aktif paket — istemci test triage ve PostgreSQL makbuz defteri (30 Eylül 2026)

1. `[x]` Tam `pnpm test:client` kümesindeki 15 kırık sınıflandırıldı. Eski metin/ses/sürüm/CSS kaynak eşleşmeleri, eski akım yolu beklentileri, kaldırılmış öğretici `runAction` API'si ve sahte DOM eksikliği güncel sözleşmeye uyarlandı. Mağaza testi gerçek native/test sağlayıcı ayrımını, öğretici testi bağlamla ilerlemeyi kontrol ediyor. **Tam küme 68/68 geçti.** Paketleme testi de 8/8 geçti; ilk deneme Windows geçici klasörü sandbox erişiminden dolayı başarısız olmuştu, izinli yeniden koşuda geçti. Bu, gerçek cihaz/E2E ve mağaza sağlayıcısı doğrulaması değildir.
2. `[~]` SERVER-2/4 hazırlığı: `004_store_ledger.sql` ile makbuz ve işlenmiş mağaza bildirimi tabloları, `PostgresStoreLedgerRepository` ile ilk makbuzu koruma, token özeti tekilliği, iade geçmişi ve bildirim idempotency kaydı eklendi. İzole PostgreSQL 16'daki oyuncu/kimlik/sosyal/makbuz entegrasyonu **3/3**, mevcut JSON makbuz/iade seçili regresyonu **2/2** geçti. Geçici PostgreSQL kümesi durdurulup kaldırıldı. **Canlı `PlatformService` hâlâ JSON kullanıyor; repository bağlanmadı ve hiçbir oyuncu verisi taşınmadı.** Bakiyeyle makbuz kaydının atomik transaction sınırı, önceki JSON kayıtlarının denetimli aktarımı ve iade/silme bağlantısı çözülmeden anahtarlama yapılmamalı.
3. `[ ]` Sıradaki geçiş kapısı: platform/sosyal repository sınırını profil içindeki arkadaş/blok yazılarıyla tutarlı tek işlem sözleşmesine indir; canlı JSON için salt okunur çakışma/envanter denetimi hazırla. Takım ve preset JSON'larına dokunulmadı. Docker image, gerçek ödeme/iade/AdMob ve uzak sunucu dağıtımı henüz doğrulanmadı.

## Aktif paket — Android tam ekran/ses yaşam döngüsü ve sunucu geçişi kapısı (29 Eylül 2026)

Kullanıcının telefon ekranında Android durum ve gezinme çubukları görünüyordu; uygulama arka plana alındığında müzik sürüyordu. İkinci ekran görüntüsü yalnız gelecekteki uzak sunucu açılış/karşılama akışı için referanstır; üçüncü taraf görseli/markası kullanılmayacaktır. Hosting ve alan adı **son aşama**; henüz satın alınmadı veya uzak sunucu kurulmadı.

1. `[x]` Native Capacitor `SystemBars.hidden` ve açılış/öne dönüşte `SystemBars.hide()` eklendi; `viewport-fit=cover` ayarlandı. Android sistem çubukları kenar hareketiyle geçici olarak açılabilir. Yeni yerel debug APK `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk` üretildi; geçici kimliği `com.gridshard.localdebug`, gömülü API adresi `http://192.168.1.105:8879`. Ağ adresi değişirse yeniden derlenmeli. APK paket denetimi geçti. **Kullanıcı telefon denemesini tamamladı ve sorun kalmadığını bildirdi.**
2. `[x]` Ses yöneticisi `visibilitychange`, `pagehide/pageshow`, native `blur/focus` ile arka planda müzik katmanlarını, sonuç sesini ve efektleri durdurup Web Audio bağlamını askıya alır; öne dönünce güncel oyun durumuna göre müziği geri kurar. **Kullanıcı telefon denemesinde sorun olmadığını bildirdi.**
3. `[x]` Sunucu geçişi SERVER-0 paket/gizli veri sınırı: `server/data/` içinde yalnız iki statik arena JSON'u kaynak ve Docker paketinde izinli. Daha önce Git tarafından izlenen beş çalışma zamanı JSON/geçici dosyası yalnız Git indeksinden çıkarıldı; **diskteki kopyaları yerinde bırakıldı**, oyuncu verisi silinmedi. Eski Git geçmişindeki kopyalar bu işlemle temizlenmez; yayımlanmış sır/kişisel veri varsa ayrıca olay incelemesi ve anahtar rotasyonu gerekir. `tools/package_release.py` yalnız statik arena dosyalarını paketler. Docker kuralları bu iki zorunlu statik dosyayı yeniden dahil eder; Docker ikilisi bu makinede olmadığı için image doğrulaması bekler.
4. `[x]` SERVER-1 ilk koruma: `GRIDSHARD_RUNTIME_MODE` yalnız `development`/`production` kabul eder; `prod` gibi yazım hatası artık sessizce geliştirme/JSON yoluna düşmez. Üretimde `DATABASE_URL` zorunluluğu korunur; iki negatif başlangıç testi geçti. İzole yerel PostgreSQL 16 kümesinde oyuncu/kimlik yazma-okuma testi geçti. Kimlik güncellemesinin `created_at` değerini yeniden yazma hatası düzeltildi ve gerçek DB testinde doğrulandı. Test kümesi kapatılıp yalnız kendi geçici dosyaları temizlendi. Platform/takım gibi diğer JSON depoları henüz PostgreSQL'e taşınmadı.
5. `[~]` SERVER-2 şema hazırlığı: `003_social_runtime.sql` ile sosyal hesap, arkadaşlık/istek, blok, DM/okundu, bildirim, push aboneliği, rapor, davet ve OAuth değişim tabloları eklendi; ayrı, açık onay gerektiren yıkıcı geri alma dosyası var. İzole PostgreSQL 16'da gerçek migration/şema testi geçti; geçici küme kapatılıp temizlendi. **Henüz repository bağlanmadı ve canlı JSON verisi taşınmadı.** Mevcut `PostgresPool.open` bekleyen SQL migration'larını açılışta uyguladığından, bu eklemeler sonraki PostgreSQL açılışında boş tablolar oluşturur; iş akışını değiştirmez.
6. `[~]` Doğrulama: odaklı mobil yaşam döngüsü ve ses testleri, web derlemesi, paketleme testleri, Gradle debug derlemesi ve APK içerik denetimi geçti. Kullanıcı gerçek telefonda iki hata için sorun kalmadığını doğruladı. SERVER-1/2 gerçek PostgreSQL entegrasyonu 30 Eylül'de 3/3; tam `pnpm test:client` 68/68 geçti. Buna rağmen gerçek mağaza/ödeme, E2E, Docker image ve üretim dağıtım kapıları **yeşil değil**.

### Sunucu geçişi sırası ve açık kapılar

`D:\Projects\Düzeltmeler\Sunucu Geçişi.md` içindeki faz sırası korunur; mevcut koddan çıkarılmış veri envanteri ve üretim engelleri `docs/SERVER_MIGRATION_PLAN.md` içindedir. SERVER-0 **yalnız paket sınırı düzeyinde ilerledi**, tamamlandı sayılmaz. Sır denetimi, sürüm kaydı ve Docker image testi bekliyor.

- `[ ]` SERVER-1: Mevcut PostgreSQL oyuncu/kimlik kalıcılığını üretim tek kaynak kuralına bağla; oyuncu `JSONB` yapısını ilk sürümde koru, sessiz JSON fallback bırakma.
- `[ ]` SERVER-2: Arkadaşlık, DM, bildirim, engelleme, rapor, davet, push ve mağaza makbuz defterini PostgreSQL'e taşı.
- `[ ]` SERVER-3: Takım, başvuru, sohbet, istek/bağış, antrenman ve turnuva kayıtlarını PostgreSQL'e taşı.
- `[ ]` SERVER-4: Ekonomi, satın alma/iade, kupa, ödül, bağış ve yükseltmelerde tek transaction/idempotency sınırı kur.
- `[ ]` SERVER-5: Bitmiş maç sonuç/katılımcı defteri ve geçmişi; profil/ödül kaydıyla tutarlı atomik işlem.
- `[ ]` SERVER-6: Redis presence/oturum/ownership yönlendirmesi; savaş simülasyonunu RAM'de tut.
- `[ ]` SERVER-7: PvP reconnect, süreç kesintisi ve tek worker üretim sertleştirmesi.
- `[ ]` SERVER-8: Kimlik/cihaz güvenliği; mobil gizli veriyi güvenli depoya taşı ve OAuth üretim sağlayıcılarını doğrula.
- `[~]` SERVER-9: Eski JSON → PostgreSQL aktarımı iptal. Yeni boş veritabanı ve ayrı boş runtime birimiyle kurulum kimliği doğrulandı; gerçek dağıtımda boş kaynak/geri yükleme provası ve yeniden açılış doğrulaması bekliyor. Eski canlı verileri değiştirme.
- `[ ]` SERVER-10: HTTPS/WSS staging ve üretim dağıtımı. Uzak API ile gerçek açılış/profil geri getirme adımlarına bağlı özgün GRIDSHARD yükleme ekranı bu aşamada yapılacak; sahte yüzde veya üçüncü taraf sanat kullanılmayacak.
- `[ ]` SERVER-11: İzleme, geri yükleme tatbikatı, CI/yayın kapıları; istemci birim kümesi geçti, E2E/gerçek mağaza/geri yükleme kapıları bekler. Bunlar geçince hosting/alan adı için kullanıcı seçimi ve yetkisi alınır.

## Aktif paket — GRIDSHARD2.1 tur 13–14 seçici aktarımı (29 Eylül 2026)

Kaynağın son checkpoint'i tur 14'e ilerledi. Önceki tur 10–12 aktarımı hedefte **henüz commit edilmemişti**; bu farklar korunarak yalnız yeni kanonik değişiklikler birleştirildi. Kaynağın kendi `CODEX_CHECKPOINT.md` dosyası kopyalanmadı; canlı oyuncu/kimlik/takım/telemetri verileri ve sırlar değiştirilmedi.

1. `[x]` Tur 13: Sabotaj ve Ekonomi AI arketipleri Dengeli Kontrol ve Dengeli Ekonomi ile değiştirildi. Eski `sabotage`/`economy` kimlikleri sunucuda yeni arketiplere yönlenir; arena bot eşlemesi, istemci seçicisi ve TR/EN ad/açıklamalar güncellendi. Savunmacı ve Saldırgan desteleri de kaynak denge kararlarıyla eşlendi.
2. `[x]` Tur 14: Seviye 1 Çekirdek enerji üretimi **5,5 → 9/sn**, Batarya üretimi **3 → 4,5/sn**; Batarya tanımı ve iki dilde kart açıklaması aynı değere getirildi. 120 arena botunun sürümlenmiş deste tanımı (`arena_bot_profiles_v1.json`) ve açıklama belgesi eşlendi. Bu dosya statik oyun içeriğidir, oyuncu kaydı değildir.
3. `[x]` Savaş kartında eski enerji yok etiketinin `::after` seçicisi CAN barını yerinden oynatıyordu. Etiket savaş kartından dışlandı; CAN barının konum/kutu değerleri sabitlendi. Isı barına dokunulmadı.
4. `[x]` Kanonik tasarım ve yol haritası yeni değer/arketiplere güncellendi; ilgili Python/istemci test beklentileri taşındı, **çalıştırılmadı**. Kullanıcının önceki isteğiyle kaldırılan, çalışma akışında bağlantısı olmayan `tools/bot_balance_sim.py` **yeniden eklenmedi**.

Kalan: sunucu yeniden başlatıldığında ve kullanıcı denemesinde yeni enerji/CAN barı davranışı görülmeli. Bu aktarımda oyun, test, derleme, tarayıcı, ödeme, migration ve bot simülasyonu çalıştırılmadı. Önceki paketlerin yayın/doğrulama sınırları aşağıda geçerlidir.

## Aktif paket — GRIDSHARD2.1 tur 10–12 seçici aktarımı (29 Eylül 2026)

Kaynak `D:\Projects\GRIDSHARD2.1` ayrı bir Git dalı değil, dosya anlık görüntüsüdür. Hedef çalışma ağacı aktarım başında temizdi. Kaynak dizin, canlı `server/data` kayıtları, sırlar ve hedefin yerelleştirme/analitik altyapısı ezilmedi. Kullanıcı önceki “yalnız kilitli önizleme” kararını bu aktarım için açıkça değiştirdi: **ödeme akışı da alınacak**. Gerçek satın alma veya reklam izleme denenmedi.

1. `[x]` Savaş motorunun ısı/akım paketi: modeller, enerji kuyruğu, soğutucu/destek, saldırı/sabotaj, AI, PvP oturumu ve ilgili katalog açıklamaları kaynakla birleştirildi. Isı 0–100 ölçeğinde; eşikler ve Çekirdek üretimi kod kaynağından alındı (kaynak checkpoint'indeki bazı sayısal özetler kodla aynı değildi). İstemci ısı göstergesi, savaş müziği evreleri, ses geçişleri ve perspektif ayarı eklendi. Isı senaryosu beklentileri güncellendi; test çalıştırılmadı.
2. `[x]` Mağaza/ödeme altyapısı: Play Billing ve App Store makbuz doğrulama, sunucu makbuz defteri, iade bildirimleri, AdMob SSV, istemci native satın alma/kurtarma köprüsü, sağlayıcı ortam ayarları ve bağımlılık kilidi taşındı. Kaynaktaki mağaza doğrulama testi eklendi fakat çalıştırılmadı. **Gerçek ödeme hazır veya etkin sayılmaz:** sağlayıcı anahtarları, ürün kimlikleri, native Android/iOS projeleri, mağaza sunucusu bildirimleri ve cihaz/iadelerle doğrulama gerekir. Geliştirme/test bayrakları üretim makbuzu yerine kullanılmamalı.
3. `[x]` Yenilenmiş ilk maç eğitimi ve yeni savaş performansı örnekleyicisi, cihaz kanıtı/yayın bütçesi kapısı eklendi. Ayrıntılı FPS/bellek/DOM özeti yalnız yerel `window.__GRIDSHARD_PERF` kanıtındadır; hedefin varsayılan kapalı, 30 gün saklanan, kaba FPS kategorili rızaya bağlı ürün analitiği korundu. Kaynaktaki varsayılan açık ve ayrıntılı telemetri gönderimi **bilinçli olarak alınmadı**. İstemci `/telemetry/` istekleri de kimlik belirteciyle gider. Kaynaktaki bağımsız `tools/bot_balance_sim.py` aracı önce eklendi, fakat başka bir bağlantısı olmadığı için kullanıcı isteğiyle kaldırıldı.
4. `[x]` Hedefteki `i18n-catalog.js` köprüsü, `/analytics/*` hakları, kişisel veri dışa aktarımı/silme ve üretim paketinin varlık izin listesi/test kancası engeli korundu. Kaynaktaki gerekli yeni TR/EN metinleri seçici taşındı. Kaynak checkpoint dosyası hedefe kopyalanmadı; önceki açık görevler aşağıda geçerlidir.
5. `[~]` Statik inceleme: değişen JS dosyaları `node --check`, Python dosyaları AST ve `git diff --check` ile kontrol edildi. `tools/check_imports.py` 366 dosyada 24 eski/ayrı kanondan kalan içe aktarım sorunu gösteriyor; kaynağın temizlenmiş küçük dosya kümesinde 0 sorun var. Hedefteki eski test/rapor araçları özellikle `topology`, `laboratory`, eski `MODULE_INTERACTION_UNLOCK_MS` gibi kaldırılmış yüzeyleri hâlâ anıyor. **Otomatik test, derleme, sunucu, tarayıcı, cihaz, canlı ödeme/reklam ve migration çalıştırılmadı**; kullanıcı denemeleri kendisi yapacak. Bu nedenle aktarım yayın adayı olarak işaretlenmemeli.

Sonraki güvenli işler: eski test/rapor araçlarını güncel motor sözleşmesine ayırarak temizle; yerelleştirme/analitik kararlarının gerçek ekranda sürüp sürmediğini doğrula; sağlayıcı/natif kimlik bilgileri hazır olduğunda gerçek cihazda satın alma, iade ve SSV uçtan uca denemelerini kullanıcı koordinesinde yap. Tek tıkla otomatik modül yerleştirme kararı değişmedi.

## Aktif paket — Beta.78 GRIDSHARD2.1 kaynak aktarımı (28 Eylül 2026)

Kaynak: `D:\Projects\GRIDSHARD2.1` (Git deposu değil), hedef: bu Git deposu. Kaynak Beta.72 tur 9 durumunda ve kendi checkpoint'inde **yarım** işaretli. Hedef aktarım öncesinde temizdi. Kullanıcının "farklarımızı bul ve aktar" isteğiyle kaynakta daha yeni olan oyun/istemci kararları hedefe taşındı; kaynak çalışma dizini değiştirilmedi.

1. `[x]` Yeni kanon ve işlevler: kaynak `client/src`, `server/app`, ilgili testler ve araçlar, E2E kaynakları, istemci giriş sayfası, paket sürümü ve seçili yapılandırma dosyaları aktarıldı. 36 modül + Çekirdek, 15 hücre/otomatik yerleştirme, dört haftalık yarışma döngüsü, takım turnuvası, sosyal arayüz, günlük meta çarkı, mağaza/ödül denemesi ve güncel ses hattı kaynakla eşlendi. Kaynağın belgeleri ve `server/json_migrations` betikleri eklendi. Kanonik `server/data/arena_progression_v1.json` eşlendi.
2. `[x]` Eski ve yeni sesleri ayır: 27 sesin OGG/AAC türevleri ve manifest aktarıldı; kaynakta bulunmayan 10 v10/jeneratör türevi ve `generator_move.wav` kaldırıldı. Laboratuvar, topoloji/güçlendirici motor dosyaları ve bunları kullanan iki eski E2E akışı kaldırıldı. Silinen dosyalar Git geçmişinden geri alınabilir.
3. `[x]` Canlı veri sınırı: oyuncu, kimlik, takım, platform durumu, telemetri, imza anahtarı, sır dosyaları ve şema yan dosyaları **aktarılmadı / değiştirilmedi**. Kaynak ve hedefteki bu dosyalar farklı; hiçbir çalışma zamanı kaydı kaynakla ezilmemeli. PostgreSQL SQL migration dosyaları içerik olarak zaten aynıydı.
4. `[x]` Statik denetim: 366 Python dosyası AST ile ayrıştırıldı; istemci/araç JS dosyaları `node --check` ile geçti; sunucunun göreli içe aktarımlarında eksik dosya bulunmadı; HTML'nin 21 yerel referansı mevcut; 54 ses türevi manifest boyutlarıyla eşleşiyor; `git diff --check` temiz. Kullanıcının önceki sınırı korunarak **test, derleme, sunucu, tarayıcı, gerçek cihaz, migration ve ödeme/reklam akışı çalıştırılmadı**.

### Aktarım sonrası zorunlu uyum işleri

- `[~]` Beta.77 yerelleştirme köprüsü kodda yeniden bağlandı: `i18n-catalog.js` kaynak sözlükten önce yükleniyor; `t`, `formatNumber`, `formatDate` ve eksik düz metin çevirileri fallback olarak çalışacak biçimde eklendi. Devre Yolu'nun yalnız Türkçe gelen ödülleri İngilizcede ödül yükünden oluşturuluyor; aşama ve ödül etiketleri, yerel sayı biçimi ve dil değişiminde açık günlük meta penceresi yenileniyor. Kart koleksiyonu seçili dile göre sıralanıyor. Köprü için yeni sözleşme testi yazıldı; **çalıştırılmadı**. Eski hedefteki bütün ekran/erişilebilirlik metinlerinin birebir eşdeğeri henüz denetlenmedi; HTTP hata `code` sözleşmesi kaynak Beta.72 istemcisine taşınmadı. TR→EN→TR, ödül, sandık, savaş, dar mobil ekran ve ekran okuyucu akışı gerçek doğrulama bekler. **Beta.77 tamamen bitti sayılmamalı.**
- `[~]` Rızaya bağlı ürün analitiği kodu yeni sunucu/istemciye yeniden bağlandı: ayar varsayılan kapalı; sunucu her olayda kayıtlı izni denetler, opt-out ve hesap silmede kayıtları temizler, kişisel dışa aktarım ve `/analytics/*` uçları geri geldi. Savaş sonucu yalnız sunucudan; istemci yalnız izinli oturum/ekran/eşleştirme/kaba FPS kategorileri gönderir. Saatlik 30 gün temizliği korunur. İstemci ayar kutusu ve TR/EN açıklaması eklendi. **Test/gerçek akış çalıştırılmadı**; rıza→olay→silme→dışa aktarma ve sunucu yeniden başlatma kanıtı yayın öncesi gerekir. Hukuki/gizlilik metni ayrıca ürün sahibi tarafından onaylanmalı.
- `[~]` Eski tarayıcı senaryolarında seçici uyumu yenilendi: `menu-navigation` güncel alt gezintiyi, `mobile-battle` ana ekrandaki `SAVAŞ` → 15+15 hücre / aynı görünüm / sunucunun tek dokunuşlu yerleştirmesini, `battle-density` dikey arena düzenini izliyor. `beta381-battle-events` kısayolu artık kaldırılmış `Oyna` girişine bağımlı değil; geliştirme kısayolu savaş ekranını kendisi açıyor. `tools/browser_e2e.py` kaldırılmış 18 kart/hızlı loadout yerine 6 kartlık hızlı yerel savaş kullanıyor; `e2e/real-device-browserstack.js` de yeni ana ekran ve otomatik yerleştirmeyi izliyor. Playwright proje listesinde olmayan dosya adları çıkarıldı. **Bu E2E'lerin hiçbiri çalıştırılmadı; özellikle mobil gerçek cihaz ve eski test/denge modülleri ayrıca incelenmeli.** Kaynak checkpoint'inin tur 8(b) E2E `SAVAŞ` rotası kodda kısmen kapandı; tarayıcı/cihaz kanıtı olmadan tamamlandı sayılmamalı.
- `[~]` Kaynak Beta.72 tur 9: mağaza istemci sözleşme testi `client/tests/beta78-store-ui-contract.test.js` olarak yazıldı, **çalıştırılmadı**. Tur 10–12 aktarımında gerçek Play Billing / StoreKit makbuz doğrulaması, AdMob SSV ve iade/iptal kodu eklendi; sağlayıcı/natif yapılandırması ve gerçek cihaz doğrulaması hâlâ açık. `docs/STORE_PURCHASES.md` güncellendi; gerçek ödeme/reklam **yayına hazır değil**.
- `[ ]` Statik kontrollerden sonra izole testler ve üretim derlemesi için kullanıcı izni/uygun ortamla doğrulama yapılmalı; testler çalışmadan aktarım yayın adayı sayılmaz.

Beta.78 devam turu statik denetimi: değişen JS dosyaları `node --check`, değişen Python dosyaları AST ve `git diff --check` geçti. `pyflakes` bu iş bilgisayarının Python ortamında kurulu olmadığından çalıştırılamadı. Önceki kullanıcı sınırı gereği test, derleme, sunucu, tarayıcı ve migration çalıştırılmadı. `server/data/platform_state.json` bu tur içinde dış çalışma zamanı tarafından değişmiş görünüyor; **dokunulmadı**, geri alınmamalı. Sonraki güvenli iş: güncellenen E2E akışlarının yetkili/izole ortamda denenmesi, kalan eski test/denge modüllerinin kanon karşılaştırması ve gerçek sağlayıcı kurulumu.

Bu devam turunda yeni mağaza sözleşme testi ve değişen istemci/E2E/Playwright JS dosyaları `node --check`, `tools/browser_e2e.py` Python AST ile, çalışma ağacının izlenen farkları `git diff --check` ile statik denetlendi. Test dosyalarının kendisi, Playwright, gerçek tarayıcı/cihaz ve ödeme/reklam çalıştırılmadı.

## Aktif paket — Beta.77 Türkçe/İngilizce yerelleştirme denetimi

Kullanıcı yerelleştirme çalışmalarının yarım kaldığını belirtti; Beta.75'in tamamlandı işareti gerçek ekran doğrulaması olmadan kesin kabul edilmiyor.

1. `[x]` Kaynak ve sözlük taramasında bulunan dinamik açıkları gider
   - `client/index.html` görünen metinleri ile `aria-label`/`title`/`placeholder` değerleri ve istemcideki sabit Türkçe dizgeler sözlükle statik karşılaştırıldı. Sabit HTML'de yeni sözlük açığı bulunmadı; sabit anahtar kullanımlarında eksik mesaj anahtarı bulunmadı.
   - Devre Yolu arena/lig ödül düğümleri sunucudan çoğunlukla yalnız `description_tr` aldığından, İngilizce görünümde ödül yükünden miktarları, hedef modül parçalarını, sandıkları ve çoklu ödülleri üreten yerel açıklama eklendi. Lig adında sunucunun `name_en` alanı kullanılıyor.
   - Sandık açılış/ödül başlıkları, alınan sandığın hazır açıklaması, maç sonu modül/Çekirdek adları, savaş kartı/emoji erişilebilirlik etiketleri, arkadaş mesajı boş durumu, hazır havuz boş özeti/seçeneği ve eşleştirme iptali seçili dile bağlandı. Modül/havuz listeleri seçili dildeki adla sıralanıyor.
   - Dil değişiminde ana ekran, modül ve Çekirdek koleksiyonu ile açık günlük meta penceresi yeniden çiziliyor. Yeni çeviri anahtarları için regresyon beklentileri eklendi.
2. `[~]` Tamamlanma kapısı
   - Kullanıcının önceki doğrulama sınırı nedeniyle test, derleme, sunucu, tarayıcı veya cihaz çalıştırılmadı; yalnız statik kaynak/diff denetimi yapıldı. TR→EN→TR gerçek ekran geçişi, Devre Yolu ödülleri, savaş/sandık durumları, dar mobil görünüm ve sunucu kaynaklı nadir açıklamalar kullanıcı onaylı uçtan uca doğrulama bekliyor. Bu yapılmadan yerelleştirme işi tamamlandı olarak işaretlenmemeli.

## Aktif paket — Beta.76 FCM/APNs mobil bildirim teslimi

İş bilgisayarından devam: kayıtlı son yönlendirme olan gerçek push gönderim paketi ele alındı. Beta.75 yerelleştirme notları ve önceki mobil/otomatik yerleştirme kararları korundu.

1. `[x]` Gerçek gönderici ve kalıcı kuyruk kodu
   - Android FCM HTTP v1 / hizmet hesabı OAuth ve iOS APNs HTTP/2 / ES256 adaptörleri ayrı `push_delivery.py` dosyasında. Varsayılan kapalı; yalnız `GRIDSHARD_PUSH_ENABLED=1` ve doğrulanan sağlayıcı ayarıyla etkinleşir. Sahte başarı veya eski `GRIDSHARD_PUSH_PROVIDER` bayrağıyla hazır görünümü yok.
   - `push_outbox.py`, platform hesabında bildirimle aynı atomik yazıda iş kaydeder; yeniden başlatma, süreli claim/lease, en çok 6 deneme, Retry-After/üstel gecikme/jitter, sağlayıcı beklemesi ve 24 saatlik süre sınırı uygular. Gönderim savaş tick'inden ve veri kilidinden ayrı thread'de yapılır.
   - Tüm platform JSON işlemleri thread + OS dosya kilidi altında korunur. Yerel ortak dosyayı paylaşan worker'lar aynı işi birlikte claim etmez; bağımsız makinelerde farklı JSON kopyalarıyla dağıtık outbox garantisi verilmez. Kabul sonrası bağlantı/süreç kaybında tekrar teslim mümkün; `accepted` cihazda görüldü anlamına gelmez.
2. `[x]` Mobil kayıt, token yenileme ve iptal bağlantısı
   - Capacitor push plugin 8.1.2 bağımlılığı ve kilit dosyası eklendi. `native-push.js`: açık kullanıcı izni, tek dinleyici kurulumu, başlangıç/öne dönüşte token yenileme, kayıt hatası, çevrimdışı iptali yeniden iletme ve bildirimden doğru hesaptaki güvenli profil/mesaj ekranını açma.
   - Ayarlarda bu cihaz için kapatma düğmesi; izin/token yanıtı geç gelince iptal geri alınmaz. POST/DELETE, Bearer sahipliği yanında mevcut cihaz oturumunu denetler. Aynı tokenın hesap değişimi, cihaz iptali, hesap silme, engellenen oyuncu ve 30 günlük eski abonelikler kuyrukta gözetilir. Geçersiz eski token yanıtı yenilenmiş tokenı silemez.
   - Türkçe/İngilizce arayüz metinleri, üretim HTTP/2 bağımlılığı, ortam örneği/Compose aktarımı ve sır dosyası ignore kuralları güncellendi. Oyun savaş/ödül/kupa hesabına dokunulmadı.
3. `[~]` Canlı mobil teslimi etkinleştir ve cihazda doğrula
   - **Hâlâ bekliyor:** gerçek Firebase hizmet hesabı, APNs key/team/topic/ortam değerleri, kalıcı native paket kimliği, Android Firebase dosyası ve iOS capability/provisioning/registration callback'leri. Depoda Android/iOS projeleri henüz yok; bu adımlar uygulanmış sayılmadı. Anahtarları sohbete veya repoya koyma; sunucuya secret olarak bağla.
   - Ayar, native kurulum, veri/teslim sınırları ve yayın kontrol listesi `docs/PUSH_NOTIFICATIONS.md` içinde. Mevcut olaylar DM ve davet kabulü; yeni maç/etkinlik hatırlatma zamanlayıcısı bu pakette yok. LAN tarayıcısı Web Push kapsamına alınmadı.

Doğrulama sınırı: Kullanıcının önceki tercihi korundu; test, derleme, sunucu, tarayıcı, oyun, migration ve gerçek bildirim gönderimi çalıştırılmadı. İzole gönderici/kuyruk/mobil yaşam döngüsü testleri yazıldı; çalıştırılmadı. Yalnız bağımlılık kilidi `--lockfile-only --ignore-scripts` ile güncellendi ve kod/diff statik incelendi. Gerçek `server/data` kayıtlarına dokunulmadı. Canlı teslim tamamlandı diye işaretlenmedi.

Sonraki adım: Sağlayıcı/native bilgiler hazırsa yukarıdaki kurulum ve izinli gerçek cihaz doğrulaması; bunlar hazır değilse Son Öneriler bakım kuyruğu 13'te kalan ekran/rota modülerleştirmesi, ardından 15'te CSS sahipliği. Gerçek cihaz FPS/portre doğrulaması kullanıcıda bekler. Tek dokunuşta sunucunun otomatik modül yerleştirmesi değişmez.

## Önceki paket — Beta.74 JSON dosya şema geçişleri

1. `[x]` Yedi JSON deposunu ortak sürüm sözleşmesine bağla
   - Kimlik, platform, oyuncu, telemetri, hazır deste, denge taslağı ve takım depoları ortak şema kaydını okumadan veri okumaz/yazmaz. Şemasız eski dosya sürüm 0 olarak okunabilir; bilinmeyen/bozuk sürüm ve değiştirilmiş migration günlüğü reddedilir.
   - Nesne ve liste köklü dosyaların mevcut biçimi korunur. Sürüm 1, veri dosyasını yeniden yazmayan güvenli benimseme adımıdır. Sürüm ve SHA-256 zincirli ileri/geri günlük `<dosya>.schema.json` içinde birlikte atomik yazılır; mevcut verinin birebir migration yedeği ayrıca tutulur.
2. `[x]` Bakım ve dağıtım kapısını ekle
   - `tools/json_schema_migrate.py status/check/up/down` etkin JSON yollarını aynı sunucu ortam değişkenlerinden çözer. Çoklu `up` önce bütün depoları okur/doğrular, sonra idempotent uygular. `check` bekleyen migration için sıfır olmayan çıkış verir. PostgreSQL etkinse kimlik/oyuncu dosyaları atlanır, kalan JSON depoları yönetilir.
   - Üretim başlangıcı etkin JSON depolarında bekleyen migration varsa durur. `down` tek depo ve açık `--allow-destructive` ister; yalnız şema sürümünü geri alır, arada kazanılan oyuncu ilerlemesini eski yedekle ezmez.
   - Bakım sırası, sunucuyu durdurma zorunluluğu, bağımsız yedek, komutlar ve geri alma sınırı `docs/JSON_SCHEMA_MIGRATIONS.md` dosyasında açıklandı. İzole fixture senaryoları için sözleşme testleri yazıldı.

Doğrulama sınırı: Kullanıcının önceki tercihi gereği otomatik test, sunucu veya migration komutu çalıştırılmadı. Gerçek `server/data` dosyaları ve özellikle önceden değişmiş `platform_state.json` korunmuştur; üretimden önce operatörün sunucuyu durdurup `up` ve `check` çalıştırması gerekir. Bu turdaki v1 benimsemesi veri içeriğini değiştirmez.

Devam durumu: Son Öneriler kuyruğundaki FCM/APNs gönderim kodu Beta.76'da eklendi; canlı sağlayıcı/native kurulum ve cihaz kanıtı hâlâ bekliyor. Gerçek cihaz performans/FPS ve portre doğrulaması kullanıcı tarafında bekliyor; tek dokunuşla sunucunun otomatik modül yerleştirmesi korunur.

## Aktif paket — Beta.73 mobil ses ve savaş müziği

1. `[x]` Kullanılan sesleri OGG/AAC biçimlerine dönüştür
   - 28 ses kimliği için OGG Vorbis ve AAC-LC türevleri `client/assets/audio/mobile/` altında manifest, boyut ve SHA-256 özetleriyle hazırlandı. WAV asılları korundu. Dört savaş durumu için yedi gövdeden ayrı 32 saniyelik yedek miks üretildi.
   - Karşılaştırılan toplam asıl/miks WAV boyutu 39.462.044 bayt; OGG 2.332.148, AAC 6.058.878 bayt. Kaynaklar tekrar `pnpm assets:audio` ile üretilebilir; araç FFmpeg gerektirir. Normal derleme hazır dosyaları kullanır.
2. `[x]` Savaş müziği katmanlarını ve durum geçişlerini aç
   - `GRIDSHARD_BATTLE_MUSIC_ENABLED` açık. Web Audio'da yedi gövde hazırlanıp aynı ses saatiyle başlar; giriş, normal savaş, baskı ve kritik Çekirdek durumları ayrı miks oranları kullanır. Web Audio yoksa her durumun kendi sıkıştırılmış ön miksi çalınır.
   - İstemci savaş süresi, baskı ve yerel/çevrimiçi Çekirdek CAN durumunu ses yöneticisine geçirir. SFX, menü ve sonuç sesleri de sıkıştırılmış biçimlerden yüklenir; desteklenen biçim oynatılamazsa diğer biçim denenir.
3. `[x]` Üretim paketini WAV'sız ve doğrulanır tut
   - Web/mobil derleme ses manifestindeki 28 kimliğin iki biçimini dosya boyutu ve SHA-256 ile denetler; WAV asıllarını `dist/` altına kopyalamaz. Yeniden üretme ve cihazda dinleme sınırları `docs/MOBILE_AUDIO.md` ve mobil yayın belgesine yazıldı.

Doğrulama sınırı: Varlık dönüştürme işlemi tamamlandı ve manifest üretildi. Kullanıcının önceki talebi gereği otomatik test, derleme, tarayıcı, sunucu veya savaş denemesi çalıştırılmadı. Gerçek Android/iPhone ses çalma, senkronizasyon ve geçiş sonucu kullanıcı doğrulamasında bekliyor. `server/data/platform_state.json` içindeki çalışma zamanı değişikliklerine dokunulmadı.

Devam durumu: JSON depoları için ortak dosya şema sürümü ve geri alınabilir migration günlüğü Beta.74'te tamamlandı. Gerçek cihaz/oynanış görevleri kullanıcı doğrulamasında kalır; tek dokunuşla sunucunun otomatik modül yerleştirmesi korunur.

## Aktif paket — Beta.72 üretim istemci derlemesi

1. `[x]` Son Öneriler / üretim istemci derleme hattının kodunu tamamla
   - `pnpm build:web` ile web, mevcut `pnpm build:mobile:web` ile mobil aynı `tools/build-client.js` hattını kullanır. Sabit `esbuild 0.28.2` ve platform paketleri kilit dosyasına alındı; diğer bağımlılıklar güncellenmedi.
   - `index.html` içindeki açık derleme blokları JS yürütme sırasını ve `styles.css → canon.css` sırasını belirler. JS/CSS birleştirilip küçültülür; SHA-256 içerik özeti taşıyan dosya adları HTML'e otomatik yazılır. Global istemci bağlantıları, fonksiyon/sınıf adları ve ayrı runtime API yapılandırması korunur.
   - Çıktıda yalnız uygulama HTML'i, JS/CSS paketleri, ikon/manifest/ses varlıkları ve genel API ayarı vardır; testler, kaynak haritaları ve geliştirme dosyaları kopyalanmaz. Paket önce geçici dizinde hazırlanır; derleme/kopyalama hatası önceki `dist/` çıktısını silmez.
2. `[x]` Üretim ve geliştirme statik servislerini ayır
   - Geliştirme varsayılan `client/` ve no-cache davranışında kalır. Üretim varsayılan `dist/` veya `GRIDSHARD_CLIENT_DIR` dizinini kullanır; eksik web manifesti ya da uyumsuz JS/CSS dosya özeti açılışı durdurur. Mobil çıktı yanlışlıkla web yayını olarak sunulamaz.
   - Yalnız manifestteki doğrulanmış içerik özetli JS/CSS bir yıl immutable önbelleğe alınabilir. Ana HTML, runtime ayarı ve derleme manifesti `no-store`; sabit adlı ses/ikon varlıkları ETag ile yeniden doğrulanır.
3. `[x]` Docker ve CI paketlemeye bağla
   - Docker ayrı Node derleme katmanından yalnız `dist/` içeriğini Python imajına taşır. Yerel ortam/sır dosyaları, Node bağımlılıkları ve eski çıktılar Docker bağlamından dışlanır.
   - Quality iş akışına derleme sözleşmeleri, web paketi üretimi ve commit SHA ile artifact eklendi. İncelemede `.github/workflows/quality.yml` dosyasının hâlâ Git ignore kapsamına girdiği görüldü; yalnız workflow YAML dosyalarını açan istisnalar düzeltildi. Commit/push veya CI çalıştırma yapılmadı.
   - Kullanım ve yayın/önbellek sınırları `docs/CLIENT_BUILD.md` dosyasına eklendi; mobil yayın belgesi ortak hattı gösterecek şekilde güncellendi.

Doğrulama: Kullanıcının önceki kararı korunarak test, derleme, Docker, tarayıcı, sunucu veya savaş denemesi çalıştırılmadı. Yalnız bağımlılık sürümü/kilit dosyası güncellendi ve kod/diff statik incelendi. Derleme sırası, içerik özeti, başarısız derlemede eski paketin korunması, mobil API zorunluluğu ve HTTP önbellek davranışı için sözleşmeler yazıldı; çalıştırılmadı. Gerçek CI ve cihaz sonucu yayın öncesi bekler. `server/data/platform_state.json` içindeki çalışma zamanı değişikliklerine dokunulmadı.

Devam durumu: WAV→OGG/AAC dönüşümü ve savaş müzik katmanları Beta.73'te tamamlandı; ardından JSON migration günlüğü açık. Gerçek cihaz/oynanış doğrulaması kullanıcıda kalır. Tek dokunuşla sunucunun otomatik modül yerleştirmesi korunur.

## Aktif paket — Beta.71 kart kaydırma, benzersiz ad ve veri yetkisi

1. `[x]` Kart ayrıntılarındaki sağ/sol okları kaldır, sürüklemeyi koru
   - Modül ve Çekirdek pencerelerinde ok düğmeleri ve eski stilleri kaldırıldı. Ortak `screens/card-swipe.js`, parmak/fare ile yatay sürüklemede kart değiştirir; dikey kaydırma ve işlem düğmeleri korunur.
   - İptal edilen/çoklu dokunuş hareketi geçiş üretmez; tamamlanan sürüklemenin yanlışlıkla seçim/yükseltme tıklamasına dönüşmesi engellenir. Klavyede sağ/sol ok desteği korunur.
2. `[x]` Sunucu otoriteli kullanıcı adı benzersizliği
   - Unicode NFKC, fazla boşluk ve harf büyüklüğü normalleştirilir; `I/İ/ı/i` aynı ad anahtarına karşılık gelir. Görünmez/kontrol karakterleri reddedilir. AI adları da ayrılmıştır.
   - JSON dosya kilidi ve PostgreSQL transaction advisory lock altında kalıcı kayıtlar kontrol edilir; çevrimdışı oyuncu adı veya eşzamanlı iki istek kontrolü aşamaz. Başarısız kalıcı yazıda bellekteki ad geri alınır; dolu ad HTTP `409` döner.
   - Mevcut veride 28 oyuncu ve bir yinelenen ad grubu (`Kesici`, iki hesap) salt okunur olarak tespit edildi. Eski hesaplar zorla yeniden adlandırılmadı; yeni ad talepleri bu adı alamaz. Eski çakışmaların temizlenmesi ayrı kullanıcı kararıdır ve alakasız ilerleme kayıtlarını durdurmaz.
3. `[x]` Kişisel veri kopyasını oyun kaydından ayır
   - Dışa aktarım artık kayıt yazmaz; sunucunun verisinden salt okunur, `restorable:false` kişisel kopya üretir. HMAC-SHA256 bütünlük imzası sunucu anahtarından ayrı bağlamla türetilir; istemciye anahtar verilmez. Yanıt önbelleğe alınmaz.
   - Eski `/player-data/{id}/save`, `/load` ve doğrudan silme uçları `410` ile kapatıldı. Oyuncu gönderdiği JSON ile ilerleme geri yükleyemez; normal maç/ödül/yükseltme kaydı ve açık onaylı hesap silme akışı korunur.
   - İsim/deste/kozmetik/yükseltme/Çekirdek isteklerine fazladan alan eklenmesi reddedilir. Üretimde kimlik denetimi ortam değişkeniyle kapatılamaz.
   - Kart parçası aktarımı da içerdiğinden takım uçları ortak Bearer/oyuncu sahipliği denetimine alındı; istemci takım isteklerinde de belirteç gönderir.
   - İndirilen dosyanın bilgisayarda düzenlenmesi engellenemez; güvenlik, dosyanın ilerleme kaynağı olarak kabul edilmemesidir. Sunucu dosyalarını/DB'yi doğrudan değiştirebilen makine yöneticisine karşı istemci güvenliği garantisi verilmez.
4. `[~]` Son Öneriler / yerel mobil portre kilidi
   - Android MainActivity ve iOS Info.plist yönleri için tekrar çalıştırılabilir `configure-native-orientation.js` eklendi; mobil proje oluşturma komutları ve Capacitor sync sonrası kancaya bağlandı.
   - Depoda henüz `android/` veya `ios/` projesi yok; kalıcı paket kimliği belirlendikten sonra üretilecek projelere uygulanır. Proje/şablon bulunmadığında açık hata verir. Büyük ekran/pencere modu istisnaları ve gerçek cihaz doğrulaması yayın belgesinde ayrıştırıldı.

Doğrulama: Kullanıcının isteği gereği otomatik test, derleme, tarayıcı, sunucu veya savaş denemesi çalıştırılmadı. Kod ve diff statik olarak incelendi. İsim çakışması, dosya imzası ve takım sahipliği regresyon sözleşmeleri yazıldı/güncellendi, çalıştırılmadı. Gerçek cihaz ve oynanış sonuçları tamamlanmış sayılmadı.

Devam durumu: Üretim istemci derleme hattının kodu Beta.72'de, mobil ses dönüşümü/müzik katmanları Beta.73'te tamamlandı. Portre kilidinin cihaz doğrulaması ile mevcut yinelenen adların değiştirilmesi kullanıcı tarafında bekliyor.

## Aktif paket — Beta.70 AI savaş gücü adaleti

1. `[~]` AI modüllerinin oyuncuya göre aşırı güçlü görünmesini incele
   - Kullanıcı otomatik yerleşimin çalıştığını doğruladı; deneme savaşında kendi modülleri hızla yok olurken AI modüllerini yok edemediğini bildirdi.
   - `[x]` Modül üretimi, seviye/nadirlik/yetenek çarpanları, günlük meta, başlangıç Akımı, enerji baskısı, hasar ve destek yolları koddan karşılaştırıldı. AI'ye özel ek CAN/hasar veya ücretsiz kart üretimi bulunmadı. AI ile insan aynı kanonik modül hesaplamasını ve kompozisyon sınırlarını kullanıyor.
   - `[x]` Sabotajda kimlik sırasından gelen ilk hamle avantajı giderildi. Önceden `local-ai-...` kimliği `wt-...` kimliğinden önce işlendiği için aynı tick'te hazır olan insan sabotajı hiç çalışmadan devre dışı kalabiliyordu. İki tarafın hedefi, direnci ve etkisi artık aynı başlangıç durumundan planlanıp sonra uygulanıyor. Aynı taraftaki sabotajların ayrı hedeflere yönelmesi korunuyor; doğrudan saldırı zaten iki aşamalıydı.
   - `[x]` AI modül seviyesi, eski kayıtlı `preferred_battle_pool_ids` yerine iki taraf hazır olduğunda oyuncunun gerçekten gönderdiği altılı destenin ortalama yükseltme seviyesinden hesaplanıyor. Çekirdek seviyesi de aynı noktada oyuncunun maça bağlı Çekirdek seviyesiyle eşleniyor. Yuvarlama, seviye sınırı, botun kart/Çekirdek türü ve günlük meta kuralları değiştirilmedi. Bu eşleme yalnız eşleştirme botlarına uygulanır; sabit eğitim AI'sı ve insan–insan maçları etkilenmez.
   - `[x]` AI eşleşmesi telemetrisindeki daima `0` yazılan kupa farkı gerçek eşleşme farkına düzeltildi.
   - `[ ]` Kullanıcının bildirdiği güç farkının yeni maçta doğrulanması bekliyor. Mevcut kalıcı telemetri maç sonucu/süresini ve harcamaları tutuyor; o maçın anlık CAN, enerji, destek ve hasar durumlarını içeren tekrar kaydı yok. Bu nedenle bildirimin tamamı iki kod hatasına bağlanmadı ve genel modül dengesi gelişigüzel düşürülmedi.

Doğrulama: Kullanıcının kararı gereği otomatik test, sunucu başlatma, tarayıcı veya savaş denemesi çalıştırılmadı. Kod yolları ve diff statik olarak incelendi; `git diff --check` temiz (yalnız Windows satır sonu uyarıları). `server/data/platform_state.json` içindeki önceden var olan çalışma zamanı değişikliklerine dokunulmadı.

Devam notu: Bu iki düzeltme yeni oluşturulan savaşlar içindir; çalışan sunucu yeni kodu yüklemelidir. Oynanış doğrulaması kullanıcıda kalır. Son Öneriler kuyruğundaki kod işleri aşağıda korunuyor; eski manuel hücre seçimi geri getirilmeyecek.

## Aktif paket — Beta.69 otomatik yerleşim ve devre kompozisyonu

Hotfix: Savaş saldırı döngüsünün Devre Gerilimi çarpanında kullandığı `effective_elapsed_ms` yeniden tanımlandı. Tick döngüsünü durduran `NameError` giderildi; bu değişken yalnız saldırı çarpanını hesaplar ve süreyle Çekirdek açma davranışını geri getirmez.

1. `[x]` Tek dokunuşla sunucu yerleşimini geri getir
   - Raf kartına dokunmak artık hücre seçimi başlatmıyor; istemci yalnız modül kimliğini gönderiyor ve sunucu uygun boş hücreyi deterministik olarak seçiyor.
   - Koordinatlı `deploy_module` istemci yolu, seçili kart/hücre vurgusu ve devre hücrelerindeki yerleştirme tıklamaları kaldırıldı.
   - Eski Relay `beginDrag/dropOnCell` yolu artık komut üretmiyor. Sunucu, eski istemciden `x/y` gelse bile oyuncu seçimini kullanmıyor; bütün yeni kopyalar `server_automatic` yerleşim moduyla üretiliyor.
2. `[x]` Kalkan Akım maliyetini kanonik `2` değeriyle eşleştir
   - Sunucu kanonu zaten `2` idi; istemcide kalmış `3` değeri ve kanon belgesindeki eski satırlar `2` olarak düzeltildi.
3. `[x]` Kırılamayan yardımcı-modül yığınını kompozisyon kurallarıyla engelle
   - Savunma, Destek, Sistem ve Sabotaj sınıflarının her biri sahada en fazla `3` aktif modül taşıyabilir.
   - Bu dört sınıfta aynı karttan aynı anda en fazla `2` aktif kopya bulunabilir.
   - Saldırı dışı aktif modül sayısı, aktif Saldırı sayısını en fazla `2` aşabilir; örneğin iki yardımcı karttan sonra üçüncü yardımcı kart için önce Saldırı modülü gerekir.
   - Aynı kurallar insan ve AI yerleşim kararında sunucu tarafından uygulanır; eski yerleştirme/değiştirme komutları da sınırı aşamaz.
4. `[x]` Destek etkilerinin üst üste binmesini sınırla
   - Aynı hedef aynı destek adımında yalnız bir Onarım, bir Soğutma ve bir Aşırı Hızlandırma etkisi alabilir.
   - Bir Saldırı modülü komşu Güçlendirici, Hedefleme Bilgisayarı ve Aşırı Hızlandırıcı arasından yalnız en güçlü tek saldırı desteğini kullanır.
5. `[x]` Süreyle Çekirdek açma ve eritme kuralını kaldır
   - `03:30` sonrası doğrudan Çekirdek hedefleme ile `04:00` sonrası otomatik Çekirdek hasarı kaldırıldı.
   - `03:00` Devre Gerilimi yalnız modül hattındaki saldırı/onarım dengesini hızlandırır; Çekirdek ancak diğer yaşayan modüller ve sistem hattı temizlendikten sonra normal hedef sırasıyla vurulabilir.
   - Verilen hasardan Akım kazanımı, öndeki oyuncuya ek kartopu etkisi yaratacağı için eklenmedi; yardımcı kartların CAN ve enerji değerleri de kompozisyon sınırıyla birlikte topluca cezalandırılmadı.

Doğrulama: Kullanıcının isteği gereği otomatik test, tarayıcı veya savaş denemesi çalıştırılmadı. Değişiklikler kod, kanonik veri ve kural belgeleri üzerinden statik olarak incelendi.

## Aktif paket — Beta.68 üretim kimliği ve yayın sınırı

1. `[x]` Apple ile giriş dönüşünü üretim güvenliğiyle tamamla
   - Apple yetkilendirmesi `form_post`, süreli `state` ve tek kullanımlık `nonce` ile başlatılıyor.
   - Apple client secret, Team ID + Key ID + P-256 özel anahtardan ES256 olarak sunucuda imzalanıyor; hazır istemci sırrı kullanımı da kontrollü dağıtımlar için korunuyor.
   - Apple kimlik belirteci Apple JWKS anahtarından RS256 ile doğrulanıyor; issuer, audience, süre ve nonce talepleri kabulden önce denetleniyor.
   - Hesap bağlama başka bir oyuncuya ait sağlayıcı kimliğini devralmıyor; giriş modu ise mevcut bağlı hesabı bulup güvenli cihaz değişimine yönlendiriyor.

2. `[x]` Google/Apple hesabını gerçek çoklu cihaz oturumuna dönüştür
   - Sağlayıcı dönüşü erişim belirteci taşımayan, beş dakika geçerli ve tek kullanımlık bir değişim kodu üretiyor.
   - Yeni cihaz kendi cihaz kimliği ve kendi yerel sırrıyla bağımsız doğrulayıcı alıyor; eski cihazın sırrı kopyalanmıyor veya üzerine yazılmıyor.
   - JSON ve PostgreSQL kimlik depoları cihaz bazlı doğrulayıcı haritasına geçirildi. Eski tek-sır kayıtları ilk başarılı girişte geriye uyumlu biçimde taşınıyor.
   - Cihaz oturumu iptal edildiğinde hem etkin belirteçler hem o cihazın yeniden giriş doğrulayıcısı kaldırılıyor; hesap kurtarma yalnız kurtaran cihaz için yeni sır kuruyor.

3. `[x]` Üretimde tanılama rotalarını kapat
   - `GRIDSHARD_RUNTIME_MODE=production` altında `/web-test` ve bütün `/web-test/*` istekleri rota çalışmadan açık `404 Not Found` alıyor.

4. `[x]` Çalışma zamanı verilerini Git indeksinden güvenle çıkar
   - `.gitignore`, bütün `server/data/web_test_*` JSON/BAK/TMP türevlerini kapsıyor.
   - Önceden izlenen sekiz JSON/BAK dosyası yalnız Git indeksinden çıkarıldı; dosyaların tamamının çalışma dizininde kaldığı ayrıca doğrulandı.

5. `[x]` Eski HTML5 drag-and-drop istemci yolunu kaldır
   - Modül yerleşimi ve güçlendirici hedefi masaüstü/mobil ayrımı olmadan dokun-seç/yerleştir akışını kullanıyor.
   - `dragstart`, `drop`, `dataTransfer`, sürükleme hayaleti ve bunlara ait ölü CSS kuralları istemciden çıkarıldı.
   - Gerçek Android/iOS uzun basma, kaydırma, iptal ve performans doğrulaması kullanıcının cihaz testinde bekliyor; bu nedenle aşağıdaki birleşik yayın maddesi tamamen kapatılmadı.

6. `[x]` Test bağımlılığı listesini düzelt
   - Kodda ve testlerde kullanımı olmayan `httpx2` kaldırıldı; FastAPI test istemcisinin kullandığı gerçek `httpx` bağımlılığı korundu.

7. `[x]` CI iş akışlarını sürüm kontrolüne al
   - `.github/workflows` genel gizli-klasör ignore kuralından güvenli istisna olarak çıkarıldı.
   - GitHub Actions; Python 3.12 sunucu sözleşmelerini, Node 22/pnpm istemci sözleşmelerini ve ikisi geçtikten sonra release guard + kaynak ZIP/SHA-256 paketini çalıştırıyor.
   - Üretilen kaynak adayı commit SHA ile adlandırılan, 14 gün saklanan CI artifact'i olarak yükleniyor.

8. `[x]` Uygulama içi satın alma karar kapısını kapat
   - Bu yayın için gerçek para, ücretli sezon yolu ve IAP kapsam dışı bırakıldı; mevcut teklifler yalnız kazanılan oyun içi para birimlerini kullanıyor.
   - Mobil yayın belgesi, Billing/StoreKit SDK'sı ve mağaza ürün kimliği eklenmemesini açıkça kaydediyor. Karar değişirse makbuz doğrulama, idempotent teslim ve iade/iptal işleme tamamlanmadan UI fiyatı açılamaz.

9. `[~]` PostgreSQL şema geçişlerini sürümlendir
   - Numaralı ileri/geri SQL dosyaları `schema_migrations` tablosunda SHA-256 checksum ile izleniyor; uygulanmış migration değişirse sunucu açılışı duruyor.
   - Çoklu cihaz alanı geçmiş `001` dosyasını değiştirmek yerine `002_identity_devices` migration'ına ayrıldı.
   - Eşzamanlı uygulama PostgreSQL advisory lock ile tekilleştirildi. `status`, dağıtım öncesi `check`, `up` ve yalnız `--allow-destructive` onaylı `down` operatör aracı eklendi.
   - PostgreSQL bölümü tamamlandı. Dosya tabanlı JSON depolarının ortak şema sürümü/ileri-geri migration kaydı henüz eklenmediği için ana kuyruk maddesi açık kalıyor.

Doğrulama: Kullanıcının talebi gereği otomatik test, tarayıcı veya gerçek cihaz denemesi çalıştırılmadı. Kod ve dağıtım farkları statik olarak incelendi; gerçek Apple/Google sağlayıcı anahtarları dağıtım ortamında girilmelidir.

## Aktif paket — Beta.67 gerçek telefon savaş ve profil yerleşimi

Kaynak doğrulama: Aynı Wi‑Fi ağında `192.168.1.104:8879` üzerinden açılan Android/Chrome portre görünümünün dört ekran görüntüsü incelendi. Aşağıdaki kararların kod uygulaması tamamlandı; gerçek cihaz yerleşim doğrulaması kullanıcıda bekliyor.

1. `[x]` Mobil savaşta oyuncu ve rakip devrelerini aynı arena görünümünde göster
   - Telefon görünümündeki `Devrem` / `Rakip` devre geçişi kaldırılmalı; rakip devresi üstte, oyuncu devresi altta ve `VS` ayracı ortada olacak şekilde iki taraf aynı anda görünmelidir.
   - Kullanıcı rakibin saldırısını, iki Çekirdeğin CAN durumunu, Akım animasyonlarını ve kendi devresinin sonucunu sekme değiştirmeden izleyebilmelidir.
   - İki devre mevcut boş dikey alanı kullanarak portre ekrana birlikte sığdırılmalı; kart oranları, dokunma hedefleri, isim/CAN bilgisi ve sabit alt el–Akım–Çekirdek gücü alanı okunabilir kalmalıdır.
   - `data-mobile-battle-panel="player|enemy"` ile bir tarafı gizleyen eski mobil kural ve buna bağlı Devrem/Rakip düğmeleri kaldırılmalı. Modül rafı gerekiyorsa devre görünürlüğünü bozmayan ayrı alt el davranışı olarak kalmalıdır.
   - Yerel AI, normal PvP, arkadaş maçı ve takım turnuvası aynı çift-devre mobil bileşenini kullanmalı; tek bir maç türü eski sekmeli düzene geri düşmemelidir.
   - Eski mobil savaş sekmeleri, `data-mobile-battle-panel` görünürlük kuralı ve kullanılmayan mobil panel denetleyicisi kaldırıldı. Ortak savaş DOM'u portrede rakibi üstte, oyuncuyu altta ve sabit rafı en altta birlikte gösteriyor.

2. `[x]` Yerleşmiş modüle dokununca açılan eski taşıma/iptal akışını kaldır
   - Devrede aktif olan bir modüle dokunmak `... seçildi · hedef hücreye dokun`, `Rafa Al` veya `Seçimi Kaldır` araç çubuğunu açmamalıdır.
   - Yerleşmiş modül yeniden taşınmamalı, başka hücreyle değiştirilmemeli ve savaş sırasında rafa geri alınmamalıdır; eski `beginDrag → dropOnCell/dropOnShelf` mobil yeniden yerleştirme yolu aktif kartlar için kapatılmalıdır.
   - Yeni modül yerleştirme alt elde/rafta bulunan uygun karta tek dokunuşla başlamalı; oyuncu hücre seçmemeli, sunucu uygun boş hücreyi otomatik belirlemelidir.
   - Yerleşmiş karta dokunma davranışı gerekiyorsa yalnız salt okunur savaş bilgisi veya hedef seçimi gibi güncel işlemlere ayrılmalı; taşıma vurgusu ve eski karar düğmeleri üretmemelidir.
   - Aktif modül için `beginDrag`, hücre taşıma/takas ve rafa alma istemci katmanında reddediliyor. Beta.69 ile raf kartı tek dokunuşta koordinatsız `deploy_module` gönderiyor ve sunucu uygun hücreyi otomatik seçiyor.

3. `[x]` Profil alt sekmesini Sezon Geçmişi ve İstatistikler içeriğinin üzerinden kaldır
   - Portre görünümünde `PROFİL / KOZMETİK / ÖDÜLLER / ARKADAŞ / AYARLAR` çubuğu kaydırılan profil içeriğinin ortasına yapışmamalı ve Sezon Geçmişi/İstatistik kartlarını kapatmamalıdır.
   - Alt sekme çubuğu profil terminal çerçevesinin gerçek alt kenarına sabitlenmeli; içerik alanına çubuğun yüksekliği ve cihaz güvenli alanı kadar alt boşluk verilmelidir.
   - Sayfa kaydırıldığında Sezon Geçmişi kartı, üç sezon özeti ve bütün istatistik kartları sekmenin arkasından görünmeden tamamen okunup dokunulabilmelidir.
   - Aynı düzeltme beş profil alt ekranında ve `360–430 px` telefon genişliklerinde doğrulanmalı; ana alt gezinme ile profil alt gezinmesi üst üste binmemelidir.
   - Beş düğmeli terminal çubuğu telefon görünümünde ana gezinmenin hemen üstündeki ayrılmış sabit alana taşındı. Profil, Kozmetik, Ödüller, Arkadaş ve Ayarlar içeriklerine çubuk yüksekliği ile güvenli alan kadar alt kaydırma boşluğu eklendi.

4. `[ ]` Beta.67 için gerçek cihaz regresyon kapsamı ekle
   - Portre telefon testinde aynı karede hem oyuncu hem rakip devresi bulunduğu, aktif modüle dokunmanın taşıma araçlarını açmadığı ve profil sekmesinin sezon/istatistik içeriğini kapatmadığı doğrulanmalıdır.
   - Tarayıcı performans göstergesi açıkken ve kapalıyken yerleşim değişmemeli; Android Chrome güvenli alanı ve alt sistem gezinme çubuğu ayrıca kontrol edilmelidir.
   - `[x]` DOM/CSS ve istemci komut sözleşmesini koruyan `beta67-mobile-battle-profile.test.js` eklendi; eski Relay taşıma beklentileri yeni sabit modül kararına uyarlandı.
   - `[ ]` Kullanıcının isteği gereği çalıştırmalı test ve tarayıcı/telefon denemesi yapılmadı. `360–430 px` Android Chrome, performans göstergesi ve sistem gezinme çubuğu kontrolleri kullanıcı doğrulamasına bırakıldı.

Doğrulama: Kullanıcının açık talebi nedeniyle test paketi ve tarayıcı çalıştırılmadı. Yalnız statik sözleşme kapsamı eklendi ve metin/diff tutarlılığı incelendi.

## Aktif paket — Beta.66 meta yüzdesi, sağlayıcı hesabı ve favicon

1. `[x]` Günlük meta kartında seçimin sayısal etkisini göster
   - Etkinlik Merkezi kartı artık sade açıklamayı korurken seçilen metanın `effect_tr` değerini de aynı satırda gösteriyor; örneğin `Destek etkisi +%12` kaybolmuyor.
2. `[x]` Çark durduğunda dilim yazılarının yerinden kaymasını engelle
   - Dilim üzerindeki radyal yerleşim dış kapsayıcıya, yazıyı düz tutan ters dönüş iç öğeye ayrıldı. Karşı dönüş artık konum dönüşümünü ezemediği için sonuç görünümünde başlıklar kendi dilim merkezlerinde kalıyor.
3. `[x]` E-posta doğrulamasını gerçek teslim adaptörüne bağla
   - SMTP/STARTTLS teslimi eklendi; Gmail veya Google Workspace gönderimi gerekli ortam değişkenleri girildiğinde doğrulama kodunu gerçekten gönderiyor.
   - Yerel geliştirmede açığa çıkarılan kod hem ilk açılışta hem Ayarlar ekranında doğrulama alanına otomatik yerleştiriliyor; artık yalnız `istek kaydedildi` çıkmazında kalmıyor.
4. `[x]` Google hesap bağlantısının OAuth dönüşünü tamamla
   - Google yetkilendirme adresi, süreli `state`, sunucuda kod-belirteç değişimi, UserInfo doğrulanmış e-posta kontrolü ve hesaba kalıcı bağlantı eklendi.
   - Başarı, iptal ve hata dönüşleri oyuna geri yönleniyor; Docker Compose sağlayıcı ortam değişkenlerini sunucuya aktarıyor. Gerçek bağlantı için Google Cloud'dan web OAuth istemci kimliği/gizli anahtarı ile kayıtlı callback URI girilmesi zorunlu; anahtar yokken sahte başarı üretilmiyor.
5. `[x]` Mağaza ikonunu tarayıcı faviconu olarak kullan
   - Mağaza ikonundan `32×32` ve `192×192` favicon türevleri eklendi; HTML bağlantılarına Beta.66 önbellek anahtarı verildi.
6. `[x]` `Son Öneriler.docx` raporunu güncel kodla karşılaştır
   - Rapor görev komutu olarak değil, eski Beta.43 durumuna göre hazırlanmış değerlendirme kaynağı olarak ele alındı.
   - Zaten tamamlanmış hesap kurtarma, cihaz oturumu/iptali, belirteç iptali, istemci push köprüsü, mağaza ikonu ve düzeltilmiş eski test maddeleri aşağıdaki kuyruğa yeniden eklenmedi.

Doğrulama: Tam istemci paketi `47/47`, platform servis paketi `7/7` geçti. `platform_services.py` ile `main.py` Python sözdizimi temizdir. `git diff --check` yalnız Windows satır sonu uyarıları verdi.

## Son Öneriler'den kalan gerçek görevler

### Yayın engelleyicileri

1. `[x]` Apple ile giriş dönüşünü ve üretim anahtar imzalama akışını tamamla
   - Apple client secret/JWT üretimi, form-post callback, kimlik belirteci doğrulaması ve hesap çakışması kuralları Google akışıyla aynı güvenlik düzeyine getirilmeli.
2. `[x]` Sağlayıcı hesabını gerçek çoklu cihaz oturumuna dönüştür
   - Google/Apple kimliğiyle başka cihazda mevcut oyuncu hesabını bulup yeni cihaza bağımsız kimlik bilgisi verilmesi gerekiyor; mevcut cihaz sırrını kopyalamak veya tek sırla değiştirmek yeterli değil.
3. `[x]` Üretimde `/web-test/*` rotalarını kapat
   - `GRIDSHARD_RUNTIME_MODE=production` altında tanılama rotaları kayıt edilmemeli veya açıkça `404` vermeli; istemci tarafındaki gizleme güvenlik sınırı sayılmamalı.
4. `[x]` Çalışma zamanı JSON/BAK/TMP dosyalarını Git geçmişinden güvenli biçimde çıkar
   - `.gitignore` desenleri hazır olsa da önceden izlenmiş `server/data/web_test_*` dosyaları hâlâ sürüm kontrolünde. Kullanıcı verisi silinmeden `git rm --cached` ve dağıtım veri dizini geçişi planlanmalı.
5. `[ ]` Mobil dokunma/işaretçi akışını gerçek cihazlarda doğrula ve eski HTML5 drag-and-drop yolunu kaldır
   - Birincil tek dokunuşla sunucunun otomatik hücreye yerleştirdiği akış korunmalı; manuel hücre seçimi geri getirilmemeli. iOS/Android uzun basma, kaydırma ve iptal davranışları kullanıcı tarafından doğrulanmalı.
   - `[x]` Kod tarafındaki HTML5 drag-and-drop ve ölü stil yolu kaldırıldı.
   - `[ ]` Gerçek Android/iOS uzun basma, kaydırma, iptal ve FPS kontrolü kullanıcı doğrulamasında bekliyor.

### Ürün ve altyapı

6. `[x]` Savaş seslerini mobil biçimlere dönüştür ve müzik katmanlarını etkinleştir
   - Beta.73: kullanılan 28 ses OGG/AAC türevleriyle manifestlendi, üretim paketi WAV'ları dışlıyor. Savaş katmanları açık; dört savaş durumu ayrı miks ve ayrı yedek ses kullanıyor. Gerçek cihazda dinleme ayrıca bekliyor.
7. `[~]` Dikey ekran kilidini yerel mobil kabuğa ekle
   - CSS medya sorgusuna ek olarak Capacitor/Android/iOS yapılandırmasında portrait orientation kilidi tanımlanmalı.
   - `[x]` Beta.71: Android MainActivity ve iOS Info.plist için portre yapılandırıcısı mobil add/sync akışına bağlandı; beklenmeyen şablonda sessiz başarı vermez.
   - `[ ]` Gerçek paket kimliğiyle yerel projeleri üretme ve cihazda dönüş/güvenli alan doğrulaması bekliyor. Mevcut depoda native projeler yok.
8. `[ ]` Gerçek cihaz performans bütçesi ve FPS ölçümü oluştur
   - Düşük/orta seviye cihazlarda savaş DOM güncellemeleri, efekt yoğunluğu, bellek ve kare süresi kaydedilmeli; kabul eşikleri release check'e bağlanmalı.
9. `[x]` JSON/PostgreSQL şema geçişlerini sürümlü migration sistemine taşı
   - Üretim veri değişiklikleri için Alembic benzeri ileri/geri migration, şema sürümü ve dağıtım öncesi kontrol eklenmeli.
   - `[x]` PostgreSQL numaralı migration, checksum, advisory lock, status/check/up ve onaylı down akışı tamamlandı.
   - `[x]` Beta.74: JSON depolarında ortak yan dosya sürümü, SHA-256 zincirli ileri/geri günlük, birebir veri yedeği, status/check/up/down ve üretim başlangıç kapısı tamamlandı. Gerçek veride `up` bu turda çalıştırılmadı; bakım penceresinde operatör adımı bekliyor.
10. `[~]` Gerçek FCM/APNs gönderim adaptörlerini tamamla
   - `[x]` Beta.76: FCM/APNs gönderici, kalıcı outbox/lease, retry/expiry, token yenileme ve güvenli hata temizliği, cihaz/hesap iptali, mobil plugin/izin/kapatma/deep-link bağlantısı eklendi. Sözleşme testleri yazıldı fakat kullanıcı tercihiyle çalıştırılmadı.
   - `[ ]` Gerçek sağlayıcı anahtarları, Firebase dosyası, imzalı native yapılandırma ve Android/iPhone teslim kanıtı bekliyor; `docs/PUSH_NOTIFICATIONS.md` izlenmeli. Yalnız kodun bulunması canlı teslimin tamamlandığı anlamına gelmez.
11. `[x]` CI iş akışlarını sürüm kontrolüne al
   - `.github/` genel ignore kapsamından çıkarılmalı; istemci, sunucu ve paketleme doğrulamaları için gerçek workflow dosyaları eklenmeli.
   - Beta.72: mevcut dosyanın Git tarafından hâlâ yok sayıldığı saptanıp workflow YAML istisnaları düzeltildi; üretim web paketi ve artifact adımları eklendi. Uzak CI çalıştırılmadı.
12. `[x]` Test bağımlılığındaki `httpx2` paketini doğrula ve gereksizse kaldır
   - `server/requirements-test.txt` içindeki `httpx` yanında bulunan `httpx2>=2.4,<3.0` kaynağı ve kullanımı doğrulanmalı.

### Bakım kuyruğu

13. `[~]` Büyük istemci ve sunucu dosyalarını alan modüllerine böl
   - `client/src/app.js` ve `server/app/main.py` ekran/rota alanlarına ayrılmalı; davranış önce sözleşme testleriyle sabitlenmeli.
   - Beta.71: kart sürükleme, ad normalleştirme/benzersizlik ve kişisel dışa aktarım ayrı alan modüllerine alındı. Büyük dosyaların kalan ekran/rota ayrıştırması henüz yapılmadı.
   - Beta.76: native bildirim yaşam döngüsü, sunucu göndericisi, kuyruk ve platform dosya kilidi ayrı modüllere alındı; mevcut sosyal/hesap rotalarının genel ayrıştırması açık.
14. `[x]` Üretim istemci derleme hattı kur
   - Beta.72: ortak web/mobil JS-CSS paketleme, küçültme, SHA-256 dosya adları, otomatik HTML güncellemesi, üretim önbelleği, Docker derleme katmanı ve CI artifact'i eklendi.
   - Kullanıcının talebiyle derleme/test çalıştırılmadı; kod uygulaması tamamlandı, CI/gerçek cihaz yayın doğrulaması bekliyor. İşletim ayrıntıları `docs/CLIENT_BUILD.md` içinde.
15. `[ ]` `canon.css` ve `styles.css` sahipliğini uzlaştır
   - Tekrarlanan kurallar ve yüksek sayıdaki `!important` kullanımı ekran bazında azaltılmalı; görsel regresyon testleriyle korunmalı.
16. `[~]` Türkçe/İngilizce yerelleştirmeyi tamamla
   - Beta.73: ana HTML ve istemcideki doğrudan Türkçe metinler genişletilmiş İngilizce sözlüğe alındı; çoğul, sayı, tarih ve hata mesajı için anahtarlı API eklendi; dil değişiminde özgün metni koruyan geri dönüş ve önemli ödül/ayar akışlarında anahtarlı kullanım eklendi. `docs/LOCALIZATION_AND_PRODUCT_ANALYTICS.md` sözleşmesi yazıldı.
   - Beta.74: `app.js` içindeki oyuncuya görünen değişkenli metinler, savaş/ödül/profil/havuz özetleri ve yönetici/beta durum metinleri TR/EN sabit anahtarlara taşındı; dil değişiminde ilgili paneller yeniden çiziliyor. HTTP hata yanıtlarına dil bağımsız `code` eklendi, istemci hata metnini `detail` yerine koddan seçiyor; savaş yerleştirme uyarısı da metin aramıyor. Dinamik HTML içine sunucu/oyuncu metni koyan birkaç alan güvenli metin düğümlerine çevrildi. Kullanıcının isteğiyle test/derleme çalıştırılmadı.
   - Beta.75: Profil ve herkese açık profil, kozmetikler, günlük/sezon ödülleri, etkinlikler, takım alt sekmeleri ile modül/çekirdek ve laboratuvar bilgi/önizleme panellerindeki kalan dinamik sabitler TR/EN anahtarlara taşındı. Sezon/görev/modül/yetenek/çekirdek/arena/laboratuvar/turnuva veri yanıtlarına İngilizce alanlar eklendi; açık bilgi pencereleri dil değişiminde yeniden çiziliyor. İlgili HTML bölümündeki çevirisiz sabit etiketler ve erişilebilirlik metinleri de sözlüğe eklendi. Kullanıcının isteğiyle test/derleme ve oyun denemesi çalıştırılmadı.
   - Beta.77: Kalan dinamik ödül ve savaş/sandık adları, dil değişiminde koleksiyon/meta yenilemesi ve dile göre sıralama ele alındı. Gerçek iki yönlü ekran/cihaz doğrulaması beklediği için bu madde yeniden açık.
17. `[x]` Ürün analitiğini mahremiyet kontrollü biçimde ekle
   - Beta.73: varsayılan kapalı sunucu onayı, ayarlardan opt-in/opt-out, opt-out ve hesap silmede ham olay temizliği, oyuncuya özel erişim/dışa aktarım, şema kısıtlı huni/savaş/retention/FPS olayları, 30 gün saklama, küçük kohort bastırmalı toplu rapor ve ayrı depo eklendi. Kullanıcı isteğiyle test/derleme çalıştırılmadı; üretim gizlilik bildirimi ürün/hukuk kontrolü bekliyor.
18. `[x]` Uygulama içi satın alma karar kapısını kapat
   - Para kazanma kapsamdaysa mağaza makbuz doğrulama ve ürün kataloğu tasarlanmalı; kapsam dışıysa release belgelerinde açıkça ertelenmeli.

## Aktif paket — Beta.65 hesap açılışı, Devre Koleksiyonu ve mağaza ikonu

1. `[x]` Günlük meta çarkındaki başlıkları her durumda düz tut
   - Dilim başlıkları çarkın dönüşünü eş zamanlı ters yönde dengeliyor; çark dönerken ve seçilen metada durduğunda yazılar baş aşağı kalmıyor.
   - Sabit çentik dönme katmanının dışında kalmaya devam ediyor.
2. `[x]` Profilin ilk kartını bütünüyle başarı koleksiyonuna ayır
   - Kart içindeki tekrarlanan avatar, oyuncu adı, unvan, ilerleme ve mevcut kupa satırı kaldırıldı.
   - Başlık `DEVRE KOLEKSİYONU` olarak değiştirildi ve ortalandı; kartın tamamı kalıcı sıralama kupaları ile rozetlerin sergilendiği alan oldu.
3. `[x]` Hareketli emoji ve rekabet ödülü çeşitliliğini artır
   - Savaş emoji çizicisi gliflerin yanında GIF/görsel kaynağını da güvenli `<img>` öğesiyle destekliyor.
   - Çekirdek Patlaması, Glitch Dalgası ve Aşırı Yük hareketli emojileri eklendi; ilk 10 sezon kasalarında yeni avatar, çerçeve ve profil çubuğu ödülleri dağıtıldı.
   - Yeni profil arka planları ve avatar çerçeveleri seçim ekranı ile üst profil barında kendi görsel stillerine sahip.
4. `[x]` İlk açılış hesap kaydı ekranını göster
   - Anonim cihaz oturumu oluşturulduktan sonra kalıcı e-posta/OAuth kimliği olmayan oyuncuya Google, Apple, e-posta doğrulama ve misafir seçenekleri sunuluyor.
   - E-posta kod isteme/doğrulama mevcut hesap API'sine bağlı; geliştirme modunda kod güvenli biçimde varsayılan olarak açılıyor ve giriş alanına otomatik taşınıyor. Üretim modunda bu davranış varsayılan olarak kapalı.
   - Google/Apple yapılandırılmadığında düğmeler açıkça hazır olmadığını söylüyor ve sahte başarı üretmiyor. Beta.66 ile Google callback/kod değişimi ve SMTP teslim adaptörü tamamlandı; Apple dönüşü ile dağıtım kimlik bilgileri hâlâ bekliyor.
5. `[x]` GRIDSHARD mağaza ikonunu üret ve projeye bağla
   - Özgün kırık cam Çekirdek, altın Akım halkası ve devre geometrisinden oluşan metinsiz ikon üretildi.
   - Kaynak, `1024x1024` mağaza/Apple ve `512x512` Android/PWA sürümleri `client/assets/branding/` altına eklendi.
   - Web manifesti ve Apple dokunma ikonu bağlantısı etkinleştirildi; köşeler mağaza maskeleri için görsele işlenmedi.

Doğrulama: JavaScript ve Python sözdizimi temiz; tam istemci paketi `46/46` test dosyası ve Relay alt paketi `176/176` geçti. Beta.61/Beta.62/Beta.65 sunucu paketi `11/11` geçti. `git diff --check` yalnız mevcut Windows satır sonu uyarılarını verdi, içerik hatası yoktur.

## Aktif paket — Beta.64 ödül önizleme katmanı ve profil başarı vitrini

1. `[x]` Liderlik ödül önizlemesini diğer sandıkların üstünde tut
   - Sandık parıltısının oluşturduğu ayrı CSS katmanı kaldırıldı; aynı görünüm `box-shadow` ile korunuyor.
   - Üzerine gelinen veya klavye odağı alan liderlik satırı listenin en üst katmanına taşınıyor; alttaki sıraların sandıkları açık önizlemenin önüne geçmiyor.
2. `[x]` Profil kimlik kartına gerçek kupa ve rozet koleksiyonu ekle
   - Kimlik kartı içinde `Kupa ve Rozet Vitrini` oluşturuldu; sıralama kupaları ile rozetler ayrı koleksiyonlarda gösteriliyor.
   - Vitrin yalnız sunucuda kalıcı olarak açılmış `unlocked_rank_trophy_ids` ve `unlocked_badge_ids` öğelerini kullanıyor; ödül kasası açıldığında profil yenilenerek vitrin de anında güncelleniyor.
   - Henüz kazanım yoksa iki koleksiyon da anlaşılır boş durum metni gösteriyor; bilinmeyen gelecek ödül kimlikleri de güvenli bir genel görünümle sergileniyor.

Doğrulama: Beta.64 hedef istemci testi geçti; tam istemci paketi `33/33` test dosyası ve Relay alt paketi `176/176` geçti. JavaScript sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.63 liderlik ödül önizlemesi ve sade meta kartı

1. `[x]` Liderlik ödüllerini sandık önizlemesine taşı
   - Genel Kupa ilk 10 satırında sandık adı ve evrensel parça özeti artık oyuncu adının altında sürekli görünmüyor.
   - Sandık üzerine gelindiğinde veya klavyeyle/mobil dokunmayla odaklandığında Devre Kredisi, Akı, evrensel kart parçası ve o sıraya ait bütün kozmetikler tek önizleme kartında gösteriliyor.
   - Önizleme ilk üç sırada aşağı, diğer sıralarda yukarı açılarak görünür listenin kenarlarında daha az kırpılıyor.
2. `[x]` Etkinlik Merkezi meta kartını sadeleştir
   - Tekrarlanan `ETKİNLİK MERKEZİ`, `BUGÜNÜN METASI`, ayrı sayısal etki ve AI/etkinlik programı ayrıntıları kaldırıldı.
   - Kartta yalnız seçilen meta adı ile tek cümlelik anlaşılır meta açıklaması kalıyor; seçim yapılmadıysa kısa çark yönlendirmesi gösteriliyor.

Doğrulama: Beta.59/Beta.61/Beta.62 hedef istemci paketi `3/3`; tam istemci paketi `44/44` test dosyası ve Relay alt paketi `176/176` geçti. JavaScript sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.62 görünüm düzeltmeleri, nadirlik dengesi ve platform altyapısı

1. `[x]` Günlük meta çarkını sonuç durumunda da okunabilir tut
   - Sabit üst çentik çarkla dönmüyor; dilim yazıları dilim merkezlerine bağlı kalıyor.
   - Sonuç ekranında çark küçülürken yazı yarıçapı da birlikte küçülüyor; başlıklar çemberin dışına taşmıyor.
2. `[x]` Lider Panosu kapsamını oyuncunun bulunduğu gruba sabitle ve sekmeleri kalıcı tut
   - `GRUP` görünümü arena/lig seçicisini kaldırdı; sunucunun oturum sahibi için döndürdüğü `viewer_trophy_group` otomatik kullanılıyor.
   - `KUPA`, `ÇEKİRDEK` ve `TAKIM` alt gezinmesi bütün sıralama türlerinde görünür kalan sabit alt satıra taşındı.
3. `[x]` Savaş Akım rotasını ve kart ayrıntısı gezinmesini düzelt
   - Akım önce çekirdek satırında beslenen bütün sütunlara ulaşıyor, ardından her sütunda yukarı/aşağı yerleşik modüllere ayrı dikey dal çiziyor.
   - Modül ve çekirdek önceki/sonraki okları kart ayrıntısının dikey orta çizgisine alındı.
4. `[x]` Takım yönetimini sayfa içine taşı; çıkarma ve ayrılmayı çalışır hale getir
   - Yönetim artık modal açmıyor; Takım ekranının normal içerik alanında geri dönüşlü ayrı panel olarak açılıyor.
   - Lider diğer üyeleri çıkarabiliyor; her oyuncu kendi satırında takımdan ayrılabiliyor. Lider ayrılırsa sıradaki üyeye yöneticilik aktarılıyor, son üye ayrılırsa takım dağılıyor.
5. `[x]` Modül ve çekirdek nadirlik eğrilerini savaş değerlerine uygula
   - Mevcut modül eğrisi CAN, saldırı, etki/onarım/sabotaj, bekleme ve Akım verimini Yaygın < Nadir < Epik < Efsanevi biçiminde koruyor.
   - Çekirdeklere de ayrı CAN, aktif etki, enerji üretimi ve güç dolumu çarpanları eklendi; laboratuvar gösterimi ile canlı savaş aynı enerji sözleşmesini kullanıyor.
6. `[x]` Hesap güvenliği ve veri hakları yüzeylerini kur
   - Süreli e-posta/telefon doğrulama kodu, deneme sınırı, hesap kurtarma, cihaz oturumu listeleme/iptal, belirteç iptali, veri dışa aktarma ve doğrulama metinli hesap silme uçtan uca bağlandı.
   - Google/Apple OAuth başlatma durum/nonce sözleşmesi ve Ayarlar düğmeleri eklendi; sağlayıcı yapılandırılmadığında sistem sahte başarı üretmiyor.
7. `[x]` Sosyal platform ve mobil köprüleri kur
   - Davet kodu, web bağlantısı ve QR içeriği; bağlantı açıldığında daveti kabul eden web/özel şema deep-link tüketimi; DM, engelleme, şikâyet ve profil paylaşımı eklendi.
   - Mobil `appUrlOpen` köprüsü ve PushNotifications eklentisi bulunduğunda izin/token kaydı eklendi; bildirimler hedef deep-link ile kalıcı kuyruğa yazılıyor.
8. `[x]` Savaş emojilerini gerçek zamanlı savaş kanalına bağla
   - Seçili ve kazanılmış emoji, üç saniyelik bekleme sınırıyla sunucu WebSocket komutu olarak doğrulanıyor.
   - Olay iki savaş istemcisine yayımlanıyor ve ilgili devrenin üzerinde süreli emoji balonu olarak gösteriliyor.

Üretim etkinleştirme notu: Google kod değişimi ve SMTP e-posta teslim kodu Beta.66'da tamamlandı; çalışmaları için gerçek sağlayıcı kimlik bilgileri dağıtım ortamına girilmelidir. Apple kod değişimi, SMS teslimi ve FCM/APNs gönderimi ile mobil imzalama hâlâ bekliyor. Kod bu değerler yokken başarı taklidi yapmaz.

Doğrulama: Beta.58–62 geniş sunucu paketi `38/38`; Beta.62 seçili paket `15/15`; istemci paketi `44/44` test dosyası ve Relay istemci alt paketi `176/176` geçti. JavaScript/Python sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.61 sosyal maç kapanışı, rekabet ödülleri ve takım yönetimi

1. `[x]` Biten arkadaş ve takım antrenman savaşlarının girişini kalıcı olarak kapat
   - Savaşın oturum kimliği terminal callback'te doğru `battle_id` alanından okunuyor; iki taraftaki arkadaş davetleri ve takım antrenman kayıtları `completed` durumuna geçiriliyor.
   - Okuma anındaki terminal durum uzlaştırması eski kabul kayıtlarını da kapatıyor; tamamlanan savaşta `SAVAŞ ALANINA GİR` düğmesi yeniden görünmüyor.
2. `[x]` Günlük meta çarkının sabit işaretçisini ve dilim yazılarını düzelt
   - Üst çentik dönen çarkın dışına taşındı; yalnız çark ve dilimler dönüyor.
   - Yedi başlık eşit açılarla, kendi diliminin merkezine dönük ve okunabilir yönde yerleştirildi.
3. `[x]` Çekirdekten yukarı/aşağı Akım omurgasını görünür yap
   - Besleme rotası önce çekirdeğin merkez sütununda hedef satıra, ardından yatay kola ilerliyor; sağ/sol bağlantılara ek olarak üst ve alt satırlarda da hareketli Akım çizgisi oluşuyor.
4. `[x]` Kart ayrıntıları arasında oklarla gezinme ekle
   - Modül ve çekirdek bilgi pencerelerine önceki/sonraki okları eklendi; pencere kapanmadan koleksiyonun tamamı döngüsel gezilebiliyor.
5. `[x]` Lider Panosunu Genel/Grup sıralaması ve ilk 10 kasasıyla genişlet
   - Alt sekmeler `KUPA`, `ÇEKİRDEK`, `TAKIM` adlarını gösteriyor; Kupa sıralamasında `GENEL` ve arena bazlı `GRUP` kapsamları bulunuyor.
   - Genel ilk 10 için konuma göre azalan Devre Kredisi, Akı ve evrensel modül parçası; seçili sıralarda kupa, rozet, avatar, çerçeve, savaş emojisi ve profil çubuğu arka planı tanımlandı.
   - Sıra yanındaki sandıklar mevcut sandık görsel dilini kullanıyor ve sezon kasası kimliğini önizliyor.
6. `[x]` Sezon/hafta/takım turnuvası ödüllerini mesaj kutusuna teslim et
   - Üst profil çubuğuna zarf düğmesi eklendi; alınmamış hediye varsa sarı yanıp sönüyor.
   - Kapanan sezon ilk 10, haftalık ilk 3 ve katkı şartını sağlayan takım turnuvası ilk 3 ödülleri tekil kimlikle kuyruğa alınır; `AL VE AÇ` işlemi kredi, Akı, evrensel parça ve kozmetiği kalıcı envantere işler.
   - Yeni dönem kaydı veya ilk yeni dönem maçı eski sayaçları sıfırlamadan önce ödül uzlaştırması çalışır; aynı ödül iki kez üretilemez veya alınamaz.
7. `[x]` Kozmetik ekranını emoji ve profil çubuğu arka planlarıyla tamamla
   - `AVATAR` alt sekmesi `KOZMETİK` oldu; avatar ve çerçevelerin altına savaş emojileri ile profil çubuğu arka planları eklendi.
   - Seçimler oyuncu profiline kalıcı yazılıyor; seçili profil arka planı üst profil çubuğunda ve profil kimliğinde uygulanıyor.
8. `[x]` Takım katılımını yönetici onaylı başvuruya ve takım profil barını yönetim alanına dönüştür
   - `KATIL` yerine `BAŞVUR` kullanılıyor; aday yönetici kabul edene kadar üye sayılmıyor ve aynı anda başka takıma başvuramıyor.
   - Takım başlığında avatar, çerçeve, isim çerçevesi ve profil çubuğu arka planını taşıyan kimlik kartı bulunuyor. Yönetici bu karttan başvuruları kabul/ret, üye çıkarma, yöneticilik devri ve takım kozmetiği seçimini yapabiliyor.
9. `[x]` Haftalık ve takım turnuvası ilk üç sandıklarını ayrı aileler olarak dengele
   - Haftalık 1. sandık Akı, Devre Kredisi, avatar, çerçeve ve savaş emojisi; 2. sandık emojisi çıkarılmış ve azaltılmış; 3. sandık emoji/çerçevesi çıkarılmış daha düşük pakettir.
   - Takım ilk üç sandığı normal sandıklardan farklı görsel kimlik kullanır; 1. takım avatarı, çerçevesi, isim çerçevesi ve takım barı arka planını birlikte verir, 2. ve 3. paketler kademeli azalır. En az `5` katkı puanı şartı korunur.

Doğrulama: Beta.58–61 seçili sunucu paketi `31/31`; Beta.61 sunucu paketi `4/4`; istemci paketi `43/43` test dosyası ve Relay istemci alt paketi `176/176` geçti. Python/JavaScript sözdizimi ve `git diff --check` temizdir. Takım başvurusu/onayı, bitiş callback kimliği, haftalık ödülün tekil teslimi ve kalıcı açılması, ilk 10/ilk 3 sandık sözleşmeleri, sabit çark işaretçisi, dikey Akım rotası ve yeni ekran yüzeyleri regresyon kapsamına alındı.

## Önceki aktif paket — Beta.60 maç türüne göre bağımsız hesaplama

1. `[x]` Normal PvP ilerlemesini arkadaş ve takım turnuvası maçlarından ayır
   - `ranked_pvp` ve dereceli `arena_ai` normal profil akışını kullanır; kupa, deneyim, Devre Yolu, Devre Kredisi, sandık, günlük emir ve kalıcı savaş istatistikleri yalnız bu normal ilerleme yolunda işlenir.
   - `friend_battle` ve `team_training` tamamen antrenman sayılır; profil, kupa, deneyim, Devre Yolu, kredi, sandık, günlük emir ve kalıcı istatistiklere hiçbir katkı yapmaz.
2. `[x]` Takım turnuvasını kendi puan defterine taşı
   - `team_tournament` normal profil ilerlemesine dokunmaz ve kupa hesaplamaz; yalnız turnuva maç/galibiyet sayacı ile galibiyet başına `1` takım katkı puanı işler.
   - Katkı puanı kalıcı oyuncu verisine eklendi; aylık takım sıralaması ve en az `5` puanlık ödül uygunluğu artık bu açık sayaçtan okunur.
3. `[x]` Haftalık Devre Turnuvasını yalnız kazanılmış PvP kupalarıyla sırala
   - Haftalık kayıt sonrasında sadece `ranked_pvp` ve dereceli `arena_ai` maçlarında kazanılan pozitif kupa ayrı haftalık toplamda birikir.
   - Arkadaş savaşı, takım antrenmanı ve takım turnuvası haftalık maç/galibiyet/kupa sayaçlarını değiştirmez.
4. `[x]` Maç sonu ekranında hesap türünü görünür kıl
   - Takım turnuvasında normal ödül kartları yerine takım katkı puanı gösterilir ve kupa/profil ilerlemesi olmadığı açıklanır.
   - Arkadaş ve takım antrenmanında ödül kartları gizlenir; maçın profil, kupa ve Devre Yolu bakımından nötr olduğu yazılır.

Doğrulama: Beta.60 sunucu paketi `7/7`; Beta.60/Beta.59/Beta.58 seçili sunucu paketi `23/23`; istemci paketi `42/42` test dosyası ve Relay istemci alt paketi `176/176` geçti. Arkadaş/antrenman nötrlüğü, takım turnuvasının yalnız kendi katkı puanını işlemesi, puanın kalıcılığı, haftalık sıralamanın yalnız normal dereceli PvP kupalarını toplaması ve ayrı maç sonu sunumları regresyon testleriyle kapsandı.

## Önceki aktif paket — Beta.59 etkinlikler, sosyal ağ ve kupasız savaş alanları

1. `[x]` Etkinlik merkezini günlük meta ve okunabilir ödül kartları etrafında yeniden düzenle
   - Ana ekrandaki büyük `Turnuvalar` başlığı kaldırıldı; günlük meta doğrudan etkinlik başlığına yerleştirildi.
   - İlk üç ödülü artık madalya, sandık görseli/adı, Devre Kredisi, Akı ve kozmetik içeriklerini ayrı etiketlerle gösteriyor.
   - Haftalık turnuvaya `100 Devre Kredisi` ile oyuncu katılımı, aylık takım turnuvasına yalnız liderin ücretsiz kayıt akışı eklendi.
2. `[x]` Haftalık sıralamayı kayıt sonrası kazanılan normal Arena kupalarına bağla
   - Kayıtsız gerçek oyuncular haftalık sıralamaya alınmıyor; kayıt anında haftalık sayaçlar sıfırlanıyor.
   - Kayıttan sonra yalnız `arena_ai` ve `ranked_pvp` maçlarında kazanılan pozitif kupa haftalık skora ekleniyor.
3. `[x]` AI zaferlerinde `+0 Kupa` üreten eşleştirme sapmasını kaldır
   - Normal AI eşleştirmesi artık sessizce takım turnuvası oturumuna çevrilmiyor; `arena_ai` dereceli ve kupa uygunluğu açık kuruluyor.
   - Arkadaş savaşı ve takım antrenmanı ise açıkça kupasız, ödülsüz ve normalleştirilmiş ayrı oturum türleri olarak kalıyor.
4. `[x]` Çekirdek patlamasından önce CAN göstergesini kesin olarak sıfırla
   - Terminal sonuç son savaş snapshot'ından önce gelse bile yok edilen çekirdek istemci modelinde ve görünen devrede `0 CAN / destroyed` durumuna sabitleniyor.
   - 2–3 saniyelik patlama sunumu boyunca kırmızı CAN artığı görünmüyor.
5. `[x]` Takım alt sekmelerinin dikey büyümesini durdur
   - Takım merkezi yalnız içerik ve sabit alt sekme satırından oluşan iki satırlı ızgaraya geçirildi; beş sekme 38 piksel yükseklikte sabitlendi.
6. `[x]` Profil altına Arkadaşlar alanı ve oyuncu profiline arkadaş eylemi ekle
   - Oyuncu arama, istek gönderme, kabul/ret, 100 arkadaş sınırı ve iki yönlü kalıcılık sunucu sözleşmesine bağlandı.
   - Herkese açık gerçek oyuncu profilinde ilişki durumuna göre `Arkadaş`, `İstek Gönderildi` veya `İsteği Kabul Et` eylemi gösteriliyor; AI profilleri sosyal istek almıyor.
7. `[x]` Arkadaş ve takım antrenman savaşlarını kupa hesabından ayır
   - Arkadaşlar sayfasından kupasız savaş daveti gönderme/kabul etme ve hazırlanmış savaş alanına iki tarafın yeniden girebilmesi eklendi.
   - Takım Savaş sekmesindeki antrenman daveti kabul edildiğinde de aynı ödülsüz özel PvP oturumu kuruluyor; kupa, deneyim, kredi ve sandık verilmez.
8. `[x]` Takım turnuvasına sistem saatli canlı eşleşme alanı kur
   - Takım liderinin aylık kaydı sonrası sistem cumartesi `18.00 UTC / 21.00 Türkiye` için yakın kupalı üye eşleşmeleri ve tekil savaş oturumları üretir.
   - Giriş penceresi maçtan 15 dakika önce açılır ve 30 dakika sonra kapanır; fikstürde oyuncunun rakibi, yerel saat ve canlı giriş düğmesi gösterilir.
   - İlk üç takım ödülünde üye uygunluğu en az `5` katkı puanına bağlıdır; takım avatarı ve takım çerçevesi ödül tanımlarına eklendi.
9. `[x]` Genel liderlik ilk beş kasa kararını görünür veri sözleşmesine geçir
   - İlk beş sıra için birbirinden farklı kasa adı/görsel kimliği, kredi, Akı, evrensel modül parçası ve kozmetik paketleri tanımlandı.
   - Lider panosunda kasa adı ile yapboz parçası simgeli evrensel parça önizlemesi gösteriliyor.

Doğrulama: Beta.59/Beta.58 seçili sunucu paketi `16/16`; istemci paketi `41/41` test dosyası ve Relay istemci alt paketi `176/176` geçti. Arkadaşlık kalıcılığı, kupasız savaş oturumu, normal AI savaşının dereceli kalması, haftalık kayıt filtresi, canlı takım fikstürü, zengin ödül sözleşmesi ve ilgili istemci yüzeyleri regresyon testleriyle kapsandı.

### Belge incelemesinden kalan altyapı kuyruğu

- `[x]` E-posta/telefon doğrulaması, hesap kurtarma, çoklu cihaz ve GDPR silme/veri dışa aktarma ürün akışları kuruldu; Google/Apple OAuth sağlayıcı etkinleştirmesi dağıtım kimlik bilgilerini bekliyor.
- `[x]` Davet linki/kod/QR içeriği, deep-link tüketimi, doğrudan mesaj, engelleme/şikâyet ve paylaşım tamamlandı; gerçek push teslimi FCM/APNs sağlayıcı anahtarlarını bekliyor.
- `[x]` Kazanılan savaş emojileri sunucu doğrulamalı WebSocket sosyal ifade paketiyle rakip istemciye iletiliyor.

## Önceki aktif paket — Beta.58 takım Profil sekmesi ve günlük meta çarkı

1. `[x]` Takım ekranını Profil sekmesiyle aç
   - Daha önce kaldırılan `Genel` konumu `Profil` adıyla geri getirildi ve Takım ekranının varsayılan ilk alt sekmesi yapıldı.
   - Herkese açık takım profilindeki takım kimliği; toplam/ortalama kupa, toplam maç, galibiyet oranı, turnuva sırası ve turnuva puanı aynı sunucu özetiyle bu sekmeye taşındı.
   - `Profil`, `Üyeler`, `İstek`, `Sohbet`, `Savaş` sıralı beş alt sekmeli düzen kuruldu.
2. `[x]` Sezonluk metayı oyuncu bazlı günlük metaya dönüştür
   - Hasar, Savunma, Destek, Sabotaj, Sistem, Çekirdek ve Akım Desteği olmak üzere yedi eşit olasılıklı meta tanımlandı.
   - Her oyuncunun seçimi UTC günü boyunca sunucuda saklanıyor; aynı gün yenileme veya yinelenen istek sonucu değiştirmiyor.
   - Günün ilk başarılı girişinde kapatılamayan çark ekranı açılıyor; `METAYI BELİRLE` sonucunda seçilen meta gösteriliyor ve ertesi güne kadar sabitleniyor.
   - Çark animasyonu artık sunucunun seçtiği dilimde duruyor; görsel sonuç ile kaydedilen günlük meta birbiriyle eşleşiyor.
   - Seçilen meta ilgili modül sınıfının savaş değerlerine uygulanıyor; etkileşimsiz AI oyuncular için gün ve oyuncu kimliğine bağlı kararlı günlük meta üretiliyor.
   - Eşleştirme AI'ları geçici maç slotu yerine kanonik bot kimliğiyle, yerel AI ise kanonik arşetip kimliğiyle tohumlanıyor; aynı UTC gününde yeni maç açmak metayı değiştirmiyor.
   - Etkinlik merkezindeki sezon metası kartı `Bugünün Metası` kartına dönüştürüldü.

Doğrulama: İstemci paketi `40/40` test (`176` Relay istemci kontrolü dâhil), Beta.58 takım/meta ve ilişkili oyun paketi `67/67` geçti. Yedi eşit seçenek, UTC yenilenmesi, aynı gün değişmezliği ve kalıcılık, yedi metanın gerçek savaş eksenlerine etkisi, sistem/akım metasının gerçek enerji üretimi, takım Profil özeti ile herkese açık takım özeti eşitliği ve istemci açılış/çark sözleşmeleri otomatik regresyon testleriyle kapsandı.

## Önceki aktif paket — Beta.57 takım profilleri ve etkinlik alt sayfaları

1. `[x]` Takımları herkese açık profil olarak görüntülenebilir yap
   - Oyuncunun kendi profilindeki takım adı, Takım Merkezi başlığı, takım lider panosu ve takım turnuvası sıralamasındaki takım adları takım profiline bağlandı.
   - Gerçek oyuncu takımları ile altı AI takımı aynı profil sözleşmesini kullanıyor; toplam/ortalama kupa, takım maçları, galibiyet oranı, aylık turnuva sırası ve puanı gösteriliyor.
   - Takım üyeleri kupa sırasıyla listeleniyor; üye adına tıklanınca yalnız herkese açık oyuncu profili açılıyor.
2. `[x]` AI profil galibiyet oranını tek veri sözleşmesine geçir
   - AI profillerinin yüzde değerini oran gibi yeniden yüzdeye çeviren çift dönüşüm kaldırıldı; sunucu gerçek oyuncularla aynı `0..1` oranını gönderiyor.
   - İstemci eski veya bozuk veri gelse bile galibiyet oranını `%0..%100` aralığında sınırlıyor; `%6600` benzeri gösterimler artık üretilemiyor.
3. `[x]` Etkinlik merkezini ayrı etkinlik sayfalarına böl
   - Ana Etkinlik ekranı aktif etkinlik adlarını listeliyor; isme/karta tıklanınca haftalık bireysel turnuva veya aylık takım turnuvasının ayrı ekranı açılıyor.
   - Haftalık etkinlikte `Genel`, `Sıralama`, `Ödüller`; takım etkinliğinde `Genel`, `Sıralama`, `Eşleşmeler`, `Ödüller` alt sekmeleri bulunuyor.
   - Takım sıralaması ve fikstürdeki takım adları da doğrudan takım profiline bağlandı.

Doğrulama: Kullanıcının önceki açık tercihi doğrultusunda çalıştırmalı test veya tarayıcı denemesi yapılmadı; yalnız kod, rota, görünüm ve veri sözleşmesi incelemesi uygulandı.

## Önceki aktif paket — Beta.56 takım, etkinlik ve sezon rekabeti

1. `[x]` Takım ekranını doğrudan Üyeler görünümünde aç
   - `Genel` sekmesi ve tekrar eden özet paneli kaldırıldı; Takım ekranına her girişte `Üyeler` sekmesi seçiliyor.
   - İstek, Sohbet ve ödülsüz antrenman savaşı işlevleri korunarak alt sekme düzeni dört sütuna indirildi.
2. `[x]` Oyuncu adlarının ilk harf ucunun/gölgesinin kırpılmasını oyun genelinde çöz
   - Oyuncu adı bağlantıları ve profil/savaş/takım/liderlik kimlikleri taşma kutusu içinde güvenli yatay pay kullanıyor.
   - Uzun adlarda üç nokta davranışı korunurken Orbitron benzeri gliflerin sol ucu artık kesilmiyor.
3. `[x]` Profil çekirdek alışkanlığı başlığını sadeleştir
   - Kendi profilinde ve açık oyuncu profilinde çekirdek adının üzerindeki `AKTİF ÇEKİRDEK` metni kaldırıldı; çekirdek adı ve seviyesi kaldı.
4. `[x]` Mağaza özel tekliflerini haftalık döngüye geçir
   - Teklifler artık pazartesi UTC 00:00'da yenileniyor; mevcut teklif kimlikleri ve eski makbuzlar geriye dönük uyumluluk için korunuyor.
   - Arayüz `Haftalık Özel Teklifler` başlığını ve bir sonraki pazartesi sıfırlamasını gösteriyor.
5. `[x]` Her takvim sezonuna ayrı stratejik meta tanımla
   - On iki aylık döngü için ayrı meta adı, açıklama, öne çıkan oyun planı ve üç özellikli modül tanımlandı.
   - Etkinlik merkezi aktif sezon metasını ve öne çıkan modülleri gösteriyor.
6. `[x]` Haftalık bireysel turnuva ve ilk üç ödülünü kur
   - Galibiyet `3`, çekirdek yıkımı `+1` puan sözleşmesiyle pazartesi yenilenen sıralama eklendi.
   - İlk üç için Elmas/Altın/Gümüş sandık ile Devre Kredisi ve Akı ödül paketleri tanımlandı; gerçek oyuncuların haftalık savaş sayaçları sunucu profilinde tutuluyor.
7. `[x]` Aylık takımlar arası turnuvayı kur
   - Takımlar round-robin programla her hafta farklı rakiple eşleşiyor; üyeler en yakın kupa değerine göre eşleniyor ve kişi başı rövanşlı iki maç yapıyor.
   - Galibiyet `1`, mağlubiyet `0` takım katkı puanı; ilk üç takım ödülü için üye başına en az `5` katkı puanı şartı uygulanıyor.
   - Takım üyesinin haftadaki ilk iki uygun arena eşleşmesi otomatik olarak programdaki rakip AI takımın en yakın kupalı üyesine yönlendiriliyor ve takım turnuvası olarak kaydediliyor.
8. `[x]` Liderlik ve turnuva için 240 kişilik AI nüfusu oluştur
   - Önceki 120 AI oyuncunun `Nova`, `Volt` ve `Arc` takıları gerçek ad biçimine dönüştürüldü.
   - Arenaların tamamına dağıtılmış, farklı deste/arşetip kararları kullanan 120 yeni benzersiz AI oyuncu eklendi.
   - Yeni oyuncular 20'şer üyeli altı takıma dağıtıldı; AI oyuncular ve takımlar genel liderlik ile etkinlik sıralamalarına katılıyor ve AI açık profilleri görüntülenebiliyor.

Doğrulama: Kullanıcının açık isteği doğrultusunda bu paket için tarayıcı denetimi veya çalıştırmalı test yapılmadı; yalnız kod ve sözleşme incelemesi uygulandı.

## Önceki aktif paket — Beta.55 profil, koleksiyon ve savaş tutarlılığı

1. `[x]` Seçili avatar çerçevesini üst profil çubuğunda görünür kıl
   - Üst bardaki genel avatar gölgesinin seçili `neon_cyan` ve `season_gold` çerçevelerini ezmesi engellendi; halka ve parıltı üst barda da korunuyor.
2. `[x]` Lider tablosundaki ad kırpılmasını düzelt; ilk üç sırada altın, gümüş ve bronz madalya göster
   - İsim bağlantısına güvenli iç boşluk verildi; ilk üç sıra erişilebilir sıra etiketiyle `🥇`, `🥈`, `🥉` madalyalarını gösteriyor.
3. `[x]` Çekirdek hızlı işlem kartını seçilen karta ortala; detay görselini nadirlik yazısından aşağı taşı
   - Hızlı işlem kutusunun kart genişliğine ulaşmasını engelleyen üst sınır kaldırıldı; detay görseli 14 piksel aşağı alındı.
4. `[x]` Sezon yolu deneyim şartını bir kademe büyüt ve kartın alt kenarına yaklaştır
   - Şart metni `.38rem` yerine `.44rem` ve daha alçak alt hizayla çiziliyor.
5. `[x]` Savaş modüllerindeki eski üst CAN çubuğunu kaldır; maç sonundaki anlık Akım sıçramasını engelle
   - Savaş kartlarında eski CAN çubuğu DOM'u artık üretilmiyor; yalnız alt kenardaki tek CAN katmanı kullanılıyor.
   - Çevrimdışı savaş Akımı sunucuyla aynı `6/12`, `2,5 sn +1` sözleşmesine geçti; eski `saniye × 10` hesabı kaldırıldı.
6. `[x]` Kalkan Akım maliyetini `2` yap ve bütün modül Akım maliyetlerini fayda/güç ölçeğine göre yeniden dengele
   - Yaygın kartlar `2`, nadir kartlar faydasına göre `2–4`, epikler `4`, efsaneviler `5` Akım bandında; Kalkan `2` oldu.
7. `[x]` Nadirlik artışının CAN, hasar, onarım, modül desteği ve devre katkısına savaş motorunda eksiksiz yansımasını doğrula ve tamamla
   - CAN, saldırı, bekleme süresi ve enerji verimine ek olarak onarım/destek, batarya-depolama, soğutma, savunma ve sabotaj dirençleri de nadirlik etki çarpanını kullanıyor.
8. `[x]` Sabotaj veya enerji kesintisi altındaki modülü hedef çekme dâhil bütün faaliyetlerden çıkar
   - Tek bir operasyonel-modül kuralı saldırı, hedefleme, savunma, destek, sabotaj ve enerji üretim/dağıtımına uygulandı; etki temizlenince faaliyet geri geliyor.

Doğrulama: `39/39` istemci paketi (`176` Relay istemci testi dâhil) ve seçili sunucu oyun/denge paketi `114/114` geçti.

## Son değerlendirme — Sandık.docx oranları

1. `[x]` Belge önerisini canlı sandık sözleşmesiyle karşılaştır
   - Savaşta sandık gelme dağılımı iki düzende de aynıdır: `%65 Bronz`, `%23 Gümüş`, `%9 Altın`, `%3 Elmas`.
   - Garanti Devre Kredisi ve Akı aralıkları da aynıdır; fark yalnız modül parçası olasılıklarındadır.
   - Belge önerisinin ağırlıklı sandık başına modül parçası beklentisi yaklaşık `0,576`, mevcut düzeninki yaklaşık `0,712` parçadır.
2. `[x]` Mevcut oranları koru
   - Belge Bronz/Gümüş modül düşüşünü `%30`, Altın düşüşünü `%35`, Elmas düşüşünü `%38` seviyesine indiriyor; mevcut değerler sırasıyla `%35`, `%35`, `%50`, `%53`.
   - Daha düşük belge oranları, yüksek seviye yükseltmelerdeki `74–200` parça gereksinimi ve parçaların uygun modüller arasında dağılması nedeniyle ilerlemeyi gereksiz yere yavaşlatıyor.
   - Belgenin Elmas sandık satırında Çekirdek Parçası yüzdesi boş bırakılmıştır; mevcut yalnız-Elmas `%6` bağımsız çekirdek parçası ihtimali korunmuştur.
   - Sonuç olarak `server/app/meta_progression.py` sandık değerlerinde değişiklik yapılmadı.

## Tamamlanan düzeltme — Savaş CAN görünürlüğü ve maç sonu yerleşimi

1. `[x]` Devre üzerindeki CAN çubuğunu bağımsız görünür katmana taşı
   - Oyuncu ve rakip tarafındaki yerleşik kartlar artık `battle-module-card` olarak işaretleniyor.
   - Alt kenardaki CAN katmanı eski genel çubuk yerleşiminden bağımsız çiziliyor; doluluk gerçek CAN yüzdesini, renk ise yeşil/sarı/kırmızı eşiklerini izliyor.
2. `[x]` Mağlubiyet ödüllerini sadeleştir
   - Ödül kartlarında kaynak adı zaten bulunduğu için değerlerden `Kupa`, `DK` ve `Deneyim` tekrarları kaldırıldı.
   - Kupa kartındaki taç simgesi gerçek kupa simgesiyle değiştirildi.
3. `[x]` Hasar istatistiği ile Devam düğmesini ayır
   - Maç sonu istatistik alanı ile `DEVAM` düğmesi arasına görünür boşluk eklendi; düğme artık kartın alt çizgisine binmiyor.

## Tamamlanan düzeltme — Savaş alanı modül CAN çubukları

1. `[x]` Yerleşik modüllerin CAN çubuğunu alt kenara geri getir
   - Oyuncu ve rakip tarafındaki her yerleşik modülün CAN çubuğu kartın tam alt kenarına taşındı.
   - Çubuk `%67–100` aralığında yeşil, `%34–66` aralığında sarı ve `%1–33` aralığında kırmızı gösteriliyor; doluluk gerçek CAN oranını izliyor.
   - Sağlık çubuğunun yerini alabilmesi için modül kartının alt kenar çizgisi kaldırıldı.
2. `[x]` Yerleşik hücrenin altındaki dikey kablo parçasını kaldır
   - Hücreler arasındaki kablo ağı ve akım animasyonu korunurken, yalnız modül yerleştirilmiş hücrenin altından çıkan kısa dikey bağlantı çizilmiyor.

## Tamamlanan düzeltme — Sezon kozmetik görünürlüğü ve kredi metni

1. `[x]` Kozmetik ödül önizlemesinin gizlenmesini engelle
   - Ödül adlarını gizleyen seçici avatar ve avatar çerçevesi önizlemelerini artık kapsamıyor; kozmetik görseli `×1` miktarının yanında görünür kalıyor.
2. `[x]` Görsel Devre Kredisi ödüllerinden `DK` tekrarını kaldır
   - Devre Kredisi simgesi bulunan ödül satırları yalnız `+miktar` gösteriyor; para birimi artık simgeyle ifade ediliyor.

## Tamamlanan düzeltme — Sezon yolu kozmetik önizlemeleri

1. `[x]` Avatar ve avatar çerçevesi ödüllerini gerçek görselleriyle göster
   - `Avatar` ve `Avatar Çerçevesi` metinleri kaldırıldı; ilgili kademede kazanılacak kozmetiğin gerçek profil önizlemesi ve `×1` miktarı gösteriliyor.
   - Avatar çerçevesi, standart avatar üzerinde kendi neon veya sezon çerçevesiyle sunuluyor.
2. `[x]` Kademe deneyim şartını eylem alanına taşı
   - `... Deneyim ile açılır` bilgisi kartın sol altından kaldırıldı.
   - Deneyim şartı sağ tarafta `Kilitli`, `Al` veya `Alındı` eyleminin hemen altında gösteriliyor.

## Tamamlanan düzeltme — Sezon yolu ödül ızgarası

1. `[x]` Kademe ödüllerini görsel ve iki sütunlu düzene geçir
   - Kademe numarası solda, ödüller sağda iki sütunlu simge + miktar ızgarasında gösteriliyor.
   - Sandık aynı ızgaraya `×1` miktarıyla katıldı; Akı, Devre Kredisi ve parça ödülleriyle aynı görsel ağırlığa getirildi.
   - `Modül Parçası ve Akı` gibi toplu metin başlıkları kaldırıldı; ödül adları erişilebilir etiket ve bilgi balonu olarak korunuyor.
   - Modül kartı parçası simgesi, modül kimliğini koruyan puzzle parçası görünümüne dönüştürüldü.

## Tamamlanan düzeltme — Sezon yolu sandık ölçüsü

1. `[x]` Sandık ödülünü diğer sezon ödülleriyle aynı görsel ölçüye getir
   - Sezon sandığına ayrılan tam genişlikte vitrin kutusu kaldırıldı.
   - Sandık simgesi diğer ödül simgeleriyle uyumlu kompakt ölçüye indirildi.
   - Büyük ödül kademesinin altın çerçevesi ile sandık nadirlik rengi korundu.

## Tamamlanan düzeltme — Çekirdek ölümüne bağlı maç sonu

1. `[x]` Süre/hasar hakemliğini kaldır
   - `03:00` sonunda çalışan `time_limit_tiebreak` ve `time_limit_draw` üretimi kaldırıldı.
   - Maç artık yalnız bir Çekirdek yok edildiğinde veya oyuncu savaştan çekildiğinde galibiyet/mağlubiyet üretir; iki Çekirdek aynı adımda yok edilirse berabere biter.
2. `[x]` Sonsuz savunma çıkmazını Devre Gerilimi ile çöz
   - `03:00` Devre Gerilimi başlangıcıdır: saldırı hasarı artar, onarım verimi düşer ve bu fark her 30 saniyede büyür.
   - Beta.69 kararıyla süreye bağlı doğrudan Çekirdek hedefleme ve otomatik Çekirdek hasarı kaldırıldı; gerilim yalnız yaşayan modül hattının çözülmesini hızlandırır.
3. `[x]` Çoklu Onarım Modülü yığılmasını sınırla
   - Bir Onarım Modülü artık her aktivasyonda bütün hasarlı modülleri değil yalnız en düşük CAN oranındaki tek modülü iyileştirir.
   - Aynı destek adımında aynı hedef yalnız bir kez onarılabilir; çok sayıda Onarım Modülü odak hasarı üst üste silmez.
   - İstemci Aşırı Yük, Çekirdek açılması ve Çekirdek kararsızlığı aşamalarını canlı savaş bildirimiyle gösterir; savaş saati Aşırı Yükte renk değiştirir.

## Tamamlanan düzeltme — Açık profil Bearer oturumu

1. `[x]` Açık profil isteğine görüntüleyen oyuncunun Bearer belirtecini ekle
   - Kök neden, sunucudaki `/public-profiles/{player_id}` rotasının oturum doğrulaması istemesine rağmen istemci oturum katmanının `/public-profiles/` önekini korumalı API rotası olarak tanımamasıydı.
   - `/public-profiles/` istemcinin korumalı rota listesine eklendi; istekler artık mevcut oyuncunun kayıtlı oturumuyla imzalanıyor ve özel API adresi yapılandırılmışsa doğru sunucu köküne yönlendiriliyor.
   - URL içindeki oyuncu kimliği hedef profildir; oturum açan oyuncu olarak yorumlanmaz. Böylece görüntüleyen oyuncunun mevcut kimliği korunur ve başka kayıtlı oyuncuların salt okunur profili açılabilir.
2. `[x]` Açık profil sınırlarını koru
   - Sunucudaki endpoint anonim erişime açılmadı; kimliği doğrulanmış oyuncu oturumu gerektirmeye devam ediyor.
   - Başka oyuncu görünümünde yalnız Profil ana sayfasındaki deste alışkanlığı, takım, sezon ve istatistikler gösterilir; Avatar, Ödüller ve Ayarlar sekmeleri üretilmez.
3. `[x]` Açık profil üst bilgisini sadeleştir
   - Başlığın altındaki `Yalnız profil sayfası görüntülenir.` açıklaması kaldırıldı.
   - Yükleme tamamlandıktan sonra gösterilen `Salt okunur profil · Avatar, Ödüller ve Ayarlar gizlidir.` ayrıntısı kaldırıldı; boş durum satırı artık yer kaplamıyor, gerçek yükleme ve hata mesajları gösterilmeye devam ediyor.

## Tamamlanan paket — Sandık ekonomisi ve toplu açılış

1. `[x]` Sandık ödül sözleşmesini yeniden dengele
   - Savaş zaferi sandık dağılımı toplam `%100` olacak şekilde korundu: `%65 Bronz`, `%23 Gümüş`, `%9 Altın`, `%3 Elmas`.
   - Devre Kredisi ve Akı bütün sandıklarda garanti ödül olarak kalır; modül ve çekirdek parçaları bunlardan bağımsız olasılıklardır.
   - Bronz: `45–75 DK`, `2–4 Akı`; `%35 Yaygın`, `1–2` parça.
   - Gümüş: `90–145 DK`, `3–6 Akı`; `%25 Yaygın (2–3)` veya `%10 Nadir (1–2)` parça.
   - Altın: `175–280 DK`, `5–9 Akı`; `%30 Yaygın (3–4)`, `%15 Nadir (2–3)` veya `%5 Epik (1–2)` parça.
   - Elmas: `320–480 DK`, `10–15 Akı`; `%25 Yaygın (4–5)`, `%15 Nadir (3–4)`, `%10 Epik (2–3)` veya `%3 Efsanevi (1)` parça. Bunlardan bağımsız `%6` çekirdek parçası şansı vardır.
   - Nadirlik yüzdeleri API içinde mutlak olasılık olarak ayrıca yayımlanıyor; açma işleminin kullandığı koşullu nadirlik dağılımı bu mutlak tablodan normalize edildi.
2. `[x]` Günlük özel teklif sandıklarını aynı kurala bağla
   - Bronz, Gümüş ve Altın günlük teklifler artık ayrı ve zamanla sapabilecek bir ödül tablosu taşımıyor.
   - Her teklif kendi sandık tanımından kredi, Akı, modül parçası miktarı ve nadirlik olasılığını doğrudan türetiyor.
   - Satın alma bedelleri korunmuştur: `120 / 400 / 900 DK`.
3. `[x]` Sandık biriktirme ve toplu açılışı ölçekle
   - Dört yuva sınırı savaş ve hediye sandığı kazanımından kaldırıldı; oyuncu onlarca veya yüzlerce sandık biriktirebilir.
   - `Hepsini Aç` işlemi sunucuda her sandığı idempotent makbuzla işler ve ayrıca tek bir `reward_totals` özeti üretir.
   - Toplu sonuç ekranı sandıkları tek tek uzayan listede göstermek yerine toplam DK, Akı ve modül/çekirdek türü başına birleştirilmiş parçaları tek görünümde gösterir.
4. `[x]` Hediye sandığına eylem önceliği ver
   - Aynı türden birikmiş sandıklar olsa bile `HEDİYE SANDIK AÇ` eylemi kartta ilk sırada kalır.
   - Hediye bekleme süresindeyse sayaçlı ve devre dışıdır; altında açılabilir envanter için `HEPSİNİ AÇ` ayrı eylem olarak görünür.

## Önceki tamamlanan paket — Herkese açık profil ve koleksiyon ekonomisi

1. `[x]` Diğer oyuncular için salt okunur profil
   - Lider panosu, takım üye listesi, modül istekleri, takım sohbeti, antrenman davetleri, canlı savaş rakip adı ve maç sonucu adları profil bağlantısına dönüştürüldü.
   - `/public-profiles/{player_id}` yalnız Profil ilk sayfasına gereken kimlik, seçili kozmetik, deste/çekirdek, takım, sezon ve savaş istatistiği alanlarını döndürüyor.
   - Başka oyuncu görünümünde Avatar, Ödüller ve Ayarlar sekmeleri üretilmiyor; özel hesap ilerlemesi ve ayarlar API yanıtına dahil edilmiyor.
   - Herkese açık profil çağrısı oturum doğrulaması gerektiriyor fakat oturum sahibinin başka bir kayıtlı oyuncuyu okumasına izin veriyor.
2. `[x]` Yeni hesaplarda tüm modül parçalarını sıfırla
   - Yeni Arena 1 profili açık ve kilitli bütün modüller için `0` kart parçası ile başlıyor.
   - Eski kayıtlardaki kazanılmış miktarlar korunuyor; eski kayıtta hiç bulunmayan modül anahtarları `0` ile tamamlanıyor.
   - Arena erişimi kartı koleksiyonda açmaya devam ediyor; seviye yükseltmek için parçanın oyun/ödül yollarından kazanılması gerekiyor.
3. `[x]` Modül yeteneklerini Akı ile sıfırla
   - Seçilmiş her yetenek için `25 Akı` sıfırlama bedeli tanımlandı.
   - Modül Yetenekler sekmesi seçili yetenek sayısını, toplam bedeli ve `YETENEKLERİ SIFIRLA` eylemini gösteriyor.
   - Sunucu işlemi idempotent makbuzla Akıyı düşürüyor ve o modülün bütün dal seçimlerini temizliyor.
4. `[x]` Devre Yolu kupa metnini mutlak eşiğe çevir
   - Görsel metin artık arena içi farkı değil `mevcut toplam kupa / sonraki aşamanın toplam kupa eşiği` biçimini kullanıyor.
   - Örnek: Arena 2 içinde 375 kupalı oyuncu `375 / 600 Kupa` görür.
5. `[x]` Çekirdekleri nadirlik gruplarına ayır
   - Rezonans: Yaygın.
   - Muhafız ve Aşırı Yük: Nadir.
   - Kesinti ve Kapasitör: Epik.
   - Anka ve Kuantum: Efsanevi.
   - Kartlar > Çekirdek sayfası bu dört nadirlik başlığı altında ayrı koleksiyon grupları gösteriyor; detay ekranına da nadirlik etiketi eklendi.

## Önceki paketten korunan tamamlanmış işler

- Sezon yolundaki sandık ödülleri metin yerine gerçek sandık görseliyle gösteriliyor.
- Enerji açığı bağlı modüllere oransal dağıtılıyor; sıranın sonundaki saldırı modülü keyfi biçimde enerjisiz kalmıyor. Yalnız EMP/Sinyal Bozucu gibi açık devre dışı bırakma etkileri modülü kapatabiliyor.

## Doğrulama

- Kullanıcı test ve denemeleri kendisinin yapacağını belirtti; bu pakette otomatik test, sözdizimi kontrol komutu veya tarayıcı denetimi çalıştırılmadı.
- Açık profil 401 düzeltmesi de istek akışı ve kod farkı üzerinden incelendi; kullanıcı talebi uyarınca çalıştırmalı test yapılmadı.
- Çekirdek ölümüne bağlı maç sonu ve Aşırı Yük paketi kod akışı üzerinden incelendi; kullanıcı talebi uyarınca çalıştırmalı savaş/test yapılmadı.
- `Sandık.docx` içindeki tek sayfalık önerinin metin ve tablo içeriği okundu. Paketlenmiş çalışma ortamında LibreOffice bulunmadığı için kaynak DOCX PNG olarak render edilemedi; belge içeriği `python-docx` ve OOXML sayfa bilgisi üzerinden incelendi.
- Değişiklikler kod farkları ve hedef dosya kesitleri üzerinden gözden geçirildi.

## Devam notu

- Çalışma dizini: `D:\Projects\GRIDSHARD`
- Kullanıcı çalışma zamanı verileri korunmalıdır; `server/data/web_test_*.json` ve `.bak` dosyaları geri alınmamalı veya düzenlenmemelidir.
- Beta.68 değişiklikleri: `.env.example`, `.gitignore`, `.github/workflows/quality.yml`, `client/src/app.js`, `client/src/auth-session.js`, `client/src/i18n.js`, `client/src/styles.css`, `docker-compose.yml`, `docs/GELISTIRME_ORTAMI.md`, `docs/MOBILE_RELEASE_RUNBOOK.md`, `server/app/auth.py`, `server/app/main.py`, `server/app/platform_services.py`, `server/app/postgres_repository.py`, `server/app/schema_migrations.py`, `server/migrations/*`, `server/requirements*.txt`, `tools/schema_migrate.py` ve bu checkpoint.
- Git durumunda `server/data/web_test_*.json(.bak)` dosyalarının `D` görünmesi kasıtlı indeks kaldırmadır; dosyalar diskte bulunur ve ignore edilir. `server/data/platform_state.json` kullanıcı/çalışma zamanı değişikliği olarak korunmuş, bu pakette düzenlenmemiştir.
- Önceki ürün paketinde değişen dosyalar: `client/index.html`, `client/src/app.js`, `client/src/auth-session.js`, `client/src/canon.css`, `client/src/styles.css`, `server/app/balance_simulation.py`, `server/app/game/catalog.py`, `server/app/game/catalog_view.py`, `server/app/game/combat.py`, `server/app/game/engine.py`, `server/app/game/energy.py`, `server/app/game/pvp_session.py`, `server/app/main.py`, `server/app/meta_progression.py`, `server/app/player_data_store.py`, `server/app/player_profile.py`, `server/app/web_test.py`, `docs/GRIDSHARD_2_1_KANONIK_TASARIM.md` ve bu checkpoint.
- Önceki paketten çalışma ağacında kalan dosya: `server/app/game/energy.py`.
