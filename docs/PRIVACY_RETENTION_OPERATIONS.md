# Gizlilik saklama düzeni — 5 Ekim 2026

Yayıncı: **Alihan ÖZTÜRK**. Destek: **gridshardgame@gmail.com**.
Onaylı süreler: üretim yedekleri oluşturulmalarından itibaren **30 gün**;
destek yazışmaları talep kapandıktan itibaren **90 gün**.
Onaylı süre bir uygulama kanıtı değildir. Bu belge tek başına sunucuda iş
zamanlamaz, e-postaya erişmez veya herhangi bir veriyi silmez.

## Güncel doğrulama sınırı

**5 Ekim16:32TR iş bilgisayarı kapanışı:** Kullanıcı **“tamam kaydettim”**
diyerek Play gizlilik URL'sini kaydettiğini teyit etti; Console sonucu agent
tarafından yeniden görülmedi. Public site'si önceki16:23 canlı kanıtıyla
doğrulanmıştır. Bu kullanıcı teyidi Google inceleme/genel yayın onayı değildir.
Kullanıcı diğer AI'nın çalışması tamamlandıktan sonra iki çalışma grubunu
commit edecek; evde pull ve birleşik regresyon kontrollerinden sonra dahili
test güncellemesi yapılacak. Burada commit/build/deploy/test yayını yapılmaz.
Yedek/destek görevlerini yeniden kurma veya canlı Apps Script'e safe dry-run
şablonunu tekrar yükleme. Ignored özel kanıtlar Git pull ile taşınmaz;
tamamlanan durum ve güvenli devam sınırı checkpoint'te kayıtlıdır.
Aşağıdaki önceki kayıtlar tarihsel doğrulama aşamalarıdır.

**5Ekim16:23TR son public-site yayını:** Kullanıcı **“yayınladım”** dedi.
8TR/EN HTML +app-ads **9/9 HTTPS200 / dosya boyut-SHA manifestle birebir**.
no-transform başlığı ve script-free CSP tüm yanıtlarında aynı; açık destek
adresi/düz mailto bağlantıları var, obfuscation ve injected script yok.
TR/EN hesap-silme subject-prefilled mailto korunur; AWS/yayıncı/kayıtlı
kapanış90gün canlı, Oracle yok, app-ads doğru plain-text satır. Bu tur HTTP
doğrulamasıdır; yeni görsel QA veya e-posta gönderimi testi değildir.
Public yayın düzeltmesi tamam; **Play Gizlilik Politikası URL Kaydet henüz
teyit edilmedi**. Kullanıcı mevcut /privacy/ URL'sini kaydedip sonucu paylaşmalı.
İncelemeye gönderme/genel yayın/AdMob onayı, oyun build/deploy/restart/dahili
test veya ek saklama görevi/silme yapılmadı. Aşağıdaki16:15 ve öncesi kayıtlar
tarihsel aşamadır; günlük görevlerin ayrı kanıt ve sınırlamaları değişmez.

**5Ekim16:15TR public-site devamı:** Kullanıcı yüklemeyi bildirdi;8TR/EN route
ve app-ads HTTPS200. TR/EN politika **AWS / Alihan ÖZTÜRK / kayıtlı kapanış90gün**
ile canlıda; Oracle yok, app-ads yeni satır ve hash ile aynı. Cloudflare HTML'e
email obfuscation ve analytics script'i ekliyor; değişmemiş script-free CSP
altında CUA hesap-silme sayfasında adres **[email protected]** göründü ve düğme
mailto yerine email-protection bağlantısıydı. Yerel builder `_headers` çıktısı
`Cache-Control: public, max-age=300, no-transform` ile düzeltildi; CSP gevşetilmedi,
Cloudflare hesap ayarı değiştirilmedi.21/21 test geçti. Yeni no-transform ZIP'in
19dosyası manifestle aynı; önceki paketten yalnız _headers farklı. Bu düzeltmenin
user Production yayını ve canlı header/HTML/iletişim kontrolü, ardından Play
gizlilik Kaydet bekliyor. Günlük saklama görevlerinin önceki kanıtı değişmez;
bu tur yedek/mail silmesi veya oyun build/deploy/restart/test yayını yapılmadı.
Aşağıdaki eski Oracle/pending durumu sabah/15:26 tarihsel aşamasıdır.

5 Ekim'de canlı `/privacy/` HTTPS200 döndü. Eski Oracle sağlayıcı metni,
eksik yayıncı bilgisi ve bekleyen saklama açıklaması görüldü. Yerel AWS/yayıncı
düzeltmesi canlıda değildir. Yeni ağ SSH kaynağı mevcut3 dar izinle eşleşmedi;
kullanıcı ek SSH/TCP22 IPv4/32 kuralını kaydetti. Ardından erişim düzeldi;
agent güvenlik grubu değiştirmedi, mevcut ev/iş/Cloudflare kuralları korunur.
Giriş öncesi ED25519 fingerprint önceki kullanıcı doğrulamasıyla eşleşti ve
yalnız bu işe ait ignored known_hosts kaydına sabitlendi.

**5 Ekim 11:42 TR salt-okunur audit:** Kök `/var/backups/gridshard-production/`
0700,9yedeğin dizini0700/dump0600; manifest7×0644/2×0600 olup üst dizin
erişim sınırı korunuyor.9/9 manifest SHA ve `pg_restore --list` doğrulaması
başarılı,2–4Ekim oluşturma tarihleri,30günü aşan0. SELECT-only canlı kurulum
kimliği özeti tüm9manifestle eşleşti. Bu, tam restore provası değildir.
Kurulum öncesi systemd17timer listesi ve sınırlı systemd/cron/operator taramasında
GRIDSHARD saklama görevi bulunmadı. Bu ilk salt-okunur audit sırasında yeni
timer/görev, silme, restore/DB/servis değişikliği yapılmadı.

**5 Ekim 12:54 TR kurulum ve son doğrulama:** Kullanıcı yalnız doğrulanmış
`/var/backups/gridshard-production/` yedeklerinde30gün kalıcı temizleme için
**“Evet, bu kapsamda kur”** onayı verdi. Linux'ta izole sentetik dosyalarla
**22/22** güvenlik testi geçti. İlk dry-run mevcut yedek kökünün UID10001
sahipliğini reddedip güvenli durdu; hiçbir silme/timer activation olmadı.
Bu mevcut güvenilir yedek writer'ı son0700 kökte kabul eden dar kontrol
düzeltildi; üst klasörler root-owned kalır, mevcut sahiplik/izin değiştirilmedi.
Bilinen eski operator hash'i kontrol edilerek yalnız kendi operator dosyamız
onarılmış; tekrar dry-run ve systemd unit/takvim doğrulaması başarılıdır.

`gridshard-backup-retention.service` ilk etkin çalışması **success / exit0**:
**9 doğrulanmış /0 süresi dolan /0 silinen /9 korunan yedek**.
`gridshard-backup-retention.timer` **enabled / active / waiting**;
günlük Türkiye04:00 (yaklaşık1dk pencerede), sonraki çalışma **6Ekim04:00TR**.
Tek seferlik service'in çalışmayı bitirdikten sonra inactive/dead olması normaldir.
Görev NTP-senkronize hostta çalışır, kaçırılan zaman için Persistent=true'dur.
İş, daha yeni süresi dolmamış sağlam yedek yoksa veya herhangi bir doğrulama
başarısızsa silmez; journal hata kaydı/operatör müdahalesi gerekir.
**Yeni düzenli yedek üretimi ve otomatik hata bildirimi kurulmadı.**
Son yedeğin yaşlanması halinde görev güvenli durabilir ve30gün hedefi aşılabilir;
yayıncı hata kayıtlarını/güncel yedek bulunmasını izlemelidir.

Yalnız operator, iki systemd unit ve root0600 kapsam config'i kuruldu.
Kök10001:10001/0700 korundu. Oyun/Caddy/PostgreSQL/Redis container kimlik,
restart_count ve started_at değerleri önce/sonra aynı; hiçbir oyun release,
restart, DB migration/restore veya yeni backup yapılmadı.
HTTPS health **ok / beta.72 / production / PostgreSQL-Redis-worker ready**.
Kurulum kanıtı kişisel-verisiz ignored
`artifacts/public-site-20261005-privacy/backup-retention-install-result.json`.
Bugün üretimde süresi dolmuş yedek olmadığından gerçek eski-yedek silmesi
gözlenmedi; bu dal yalnız izole sentetik Linux testlerinde doğrulandı.

Ek kopya araması yalnız `/var/backups`, `/opt/gridshard`, `/home/ubuntu`
altındaki adlandırılmış dump/backup/sql.gz/sql.zip adaylarını kapsadı; ek aday
yok. Diğer host yolları, sağlayıcı snapshot'ları, dışa aktarımlar ve başka
bilgisayarlardaki kopyalar doğrulanmış sayılmaz. Kişisel-verisiz ayrıntılı sonuç
`artifacts/public-site-20261005-privacy/backup-readonly-audit-result.json`;
bu ignored dosya/helper/host pin public pakete girmez.

Kaynak `site.retention.backupVerified` bu kurulum kanıtıyla **true**.
Son15:26 support activation kanıtı ve dış kopya kullanıcı teyidiyle
`supportVerified` ve build manifest `privacyRetentionVerified` de **true** oldu.
TR/EN metin iki etkin scoped-job ve güvenli durma/limit sınırlarını açıklar;
15:26'da bu değişiklik Cloudflare yayını bekliyordu;16:15'te politika içeriği
canlı doğrulandı fakat edge e-posta dönüşümü düzeltmesi bekliyor. Eski draft
ve retention-ready ZIP yerine yeni no-transform ZIP'i kullanın. Bu bayraklar
live-site/Play onayı, tüm geçmiş taleplerin temizliği veya hatasız gelecek
çalışma garantisi değildir. Oracle yerine AWS TR/EN'de canlı doğrulanmıştır;
public iletişim bağlantıları ve nihai Play kaydı henüz tamamlanmış sayılmaz.

## Üretim yedekleri — 30 gün

- Sınır yalnız sunucudaki doğrulanmış `/var/backups/gridshard-production/`
  kişisel veri yedekleri ve varsa onaylı diğer yedek kopyalarıdır. Kaynak,
  release dizinleri, PostgreSQL/Redis birimleri, canlı profiller, imza anahtarları
  ve sağlayıcı sırları yedek-silme hedefi değildir.
- Önce güncel instance/IP ve yalnız yetkili ev/iş/yeni ağ IP'lerinin SSH `/32`
  erişimini doğrulayın. Bağlantı hatası için `0.0.0.0/0` açmayın. Bilinen host
  fingerprint'i eşleşmeden giriş veya otomatik host kabulü yapmayın.
- İlk işlem salt okunur envanterdir: her yedeğin gerçek oluşturma tarihi,
  manifesti, doğruluğu, yaşı, izinleri ve tüm ek kopyaları kontrol edilir.
  Dosya adındaki tarih tek başına güvenilir süre ölçümü değildir.
- Günlük kontrol/zamanlayıcı planı oluşturun. Süresi dolan yedekler için açık
  mutlak hedef listesi ve sınır kontrolü gerekir. Sembolik link, bilinmeyen
  arşiv biçimi, eksik manifest veya yanlış kurulum kimliğinde otomatik silmeyin;
  operatör incelemesi ve hata kaydı oluşturun.
- Son doğrulanmış geri dönüş yedeğini körlemesine silmeyin. Güncel sağlam
  yedek yoksa alarm ve mevcut güvenli bakım/yedek prosedürü gerekir; süreyi
  sağladığını iddia ederek hatayı gizlemeyin. Yeni bakım/backup için aktif
  maç kapıları ve gereken kullanıcı onayı ayrıca korunur.
- Hazırlanacak silme planı/testleri ve zamanlayıcı önce salt okunur/dry-run
  doğrulanır. Üretimde etkinliği, 30 günden yaşlı kopya kalmadığını ve sonraki
  çalıştırma zamanını kanıtlayan kişisel-verisiz sonuç kaydı tutulur.
- Hesap silme sonrasında bir yedek geri yüklenirse silinen hesabı yeniden
  etkinleştirmeyin; ilgili silme taleplerini tekrar uygulamadan servisi açmayın.
  Mevcut üretim veritabanına eski dump restore edilmez.

## Destek yazışmaları — kapanıştan sonra 90 gün

**Son kullanıcı kararı:** Elle takipte sürenin kaçırılabileceğini belirtti;
otomatik takip hazırlanır. `tools/support-retention/` özel Google Apps Script
kurulum adayı ve mock testleri hazırdır, varsayılanı deneme modudur.
Kullanıcı5Ekim **“Kurulum ve silmesiz denemeye geç”** dedi. Bu izin yalnız
özel destek hesabında setup ve dry-run içindir; Google OAuth ekranını yayıncı
kendisi onaylar. Bu **ilk karar** tetikleyici/kalıcı silmeyi kapsamıyordu;
sonraki ayrı15:26 activation kararı aşağıdadır. Yerel güvenli şablon
`dryRun:true` kalır; canlı özel script'in çalışma bayrağı ayrıca kayıtlıdır.
İlk Apps Script sekmesinde destek hesabı seçili değildi. Sonraki kullanıcı
**“açtım devam et”** adımında `/u/1/home` dashboard ve Drive hesap düğmelerinde
doğru destek hesabı doğrulandı. Normal proje oluşturma/Google'ın verdiği tek
continue hedefi “dosyayı açamıyoruz”; resmi Drive→Yeni→Diğer→Apps Script yolu
ise yanlış Google hesabına yönlenip “komut dosyası oluşturulamadı” hatası verdi.
**Bu ilk denemede** yeni proje, kod yükleme, OAuth izni, etiket/mesaj değişikliği,
gerçek dry-run ve trigger kurulumu yapılmadı. Google çoklu girişin Apps Script'te desteklenmediğini
belgeliyor; gözlenen hata bununla uyumlu. Kullanıcı tarayıcıda yalnız destek
hesabıyla giriş yapmalı veya ayrı/private tek-hesap oturumu açmalı.
Google giriş/izin ekranları kullanıcıya bırakılır; oyun içi oturumlara dokunulmaz.

**5Ekim13:30TR — tek hesapla kurulum ve deneme tamamlandı:** Kullanıcı “hazır”
dedi; doğru destek hesabında özel **GRIDSHARD Support Retention** oluşturuldu.
Kaynak editörde `Kod.gs` olarak, manifest `appsscript.json` olarak kaydedildi.
Yeniden yükleme sonrası normalize metin ve yapısal manifest eşleşti; Gmail
advanced v1 / Europe/Istanbul / V8 doğrulandı. Ayrı varsayılan Cloud projesi
korundu; Play Games projesine bağlama, web-app dağıtımı/paylaşım yok.
`prepareSupportLabels`13:29:02–13:29:03 başarılı, üç etiketi hazırlar.
`runSupportRetention`13:30:30–13:30:31 başarılı: dryRun true, tüm kapsam
sayaçları0 ve **deletedMessages0**. Gmail çağrılarının çalıştığı doğrulandı;
Google izin formu/onay eylemi gözlenmedi ve agent izin ekranına tıklamadı.
Kapsamda kapanış isteği veya kayıt yok; dolu talep/gerçek90gün expiry/kalıcı
silme test edilmiş değildir. Yerel mock test11/11, son kaynak dryRun true /
confirmation boş. Trigger kurma işlevi çalıştırılmadı, günlük otomasyon kapalı.
Ignored receipt ve dry-run ekranı `artifacts/public-site-20261005-privacy/`
altında; özel script bağlantısı ve operator kanıtı public pakete/Git'e girmez.
13:30 aşamasında `supportVerified` false'tu; sonraki ayrı activation kanıtı
aşağıda kayıtlıdır. Test için mevcut müşteri
mesajını keyfi seçmeyin veya geçmiş kapanış tarihi uydurmayın.

**5Ekim15:26TR — açık ayrı onay ve gerçek etkinleştirme:** Kullanıcı yalnız
CLOSE ile işaretlediği kapalı GRIDSHARD taleplerinin kayıtlı mesajlarını,
kayıtlı kapanıştan90gün sonra (ilgili Çöp Kutusu mesajları dahil) geri alınamaz
kalıcı silen günlük görev için **“Evet, bu kapsamda günlük görevi etkinleştir”**
dedi. Yeni yanıt yeniden açar; tüm posta kutusu/Çöp Kutusu topluca silinmez.
Google kapsamının tüm Gmail'e erişebildiği açıklandı; dar kapsamı betik korur.
Kullanıcı **yalnız destek Gmail hesabında saklama, dış kopya yok** diye teyit etti;
dış disk/başka hesap audit'i yapılmış değildir.

Yalnız özel script'te dryRun false / tam activation confirmation kaydedildi;
yeniden yükleme sonrası normalize kaynak birebir eşleşti, kalan kod/manifest
değişmedi. Yerel `tools/support-retention/Code.gs` güvenli dry-run şablonudur;
canlı modun kaynak göstergesi veya doğrudan tekrar yükleme dosyası sayılmaz.
İlk etkin çalışma15:23:56–15:24:00 başarılı: dryRun false, bütün sayaçlar0,
**deletedMessages0**. Trigger installer15:26:01–15:26:02 başarılı; UI'de
tek runSupportRetention / Ana / Zaman tabanlı görev. Salt-okunur düzenleme
ekranında günlük04:00–05:00GMT+03 ve günlük hata bildirimi doğrulandı;
Kaydet'e basmadan İptal ile kapatıldı. Henüz ilk zamanlı yürütme/gerçek90gün
expiry veya mesaj silme gözlenmedi. Gmail/ScriptApp çağrıları çalıştı; Google
izin formu/onay eylemi gözlendi veya agent tarafından onaylandı denmez.

Yayıncı kapattığı talebe **GRIDSHARD_SUPPORT_CLOSE** etiketi verir; görev
kapanışı kaydedip CLOSED'a taşır. Yeni yanıtta OPEN olur. Kapanış mesaj
içeriğinden tahmin edilmez, etiketlenmemiş eski talepler otomatik kapsanmaz.
Gmail dışı yeni bir kopya oluşturulursa aynı saklama hedefi için ayrıca takip
edilmelidir. Hata/limit/backlog için Google'ın günlük hata bildirimleri ve
Executions kontrol edilir; kaynak50kayıt/100mesaj günlük limitindedir.
Bu süreç yalnız destek mesajlarını yönetir; gerçek oyun hesabı silme talepleri
ve kimlik doğrulama işlemleri ayrıca mevcut güvenli akışla yerine getirilir.
Yeni bir Codex hatırlatıcı veya başka posta entegrasyonu kurulmadı.

Operator receipt/kanıt ekranları ignored artifacts'tadır; özel proje
URL/ID, closure metadata, message IDs veya sırları public-site/Git'e koymayın.
`supportVerified:true` artık bu dar gerçek kurulumun kanıtıdır, tüm tarihsel
maillerin temizliği veya genel yayın uygunluğu iddiası değildir.

Kurulum ve geniş Gmail kapsamı/kalıcı silme onayı için bu klasörün README'si
izlenir. Aşağıdaki manuel süreç otomasyonun işleyeceği kapsamı tarif eder;
yayıncının manuel yöntem seçtiği/etkinleştirdiği anlamına gelmez.

Bu süreç yayıncının kullandığı destek posta kutusunda uygulanır. Otomatik Gmail
silmesi, bağlı Gmail entegrasyonu veya uzaktan mesaj silme yetkisi var sayılmaz.

1. Talep açıkken yalnız çözüm için gereken bilgileri tutun; mesajlarda şifre,
   oturum/kurtarma sırrı, kimlik belgesi veya ödeme kartı istemeyin.
2. Talebi kapatırken kapanış tarihini ve 90 gün sonraki silme tarihini kaydedin.
   Tarihli kapalı-talep etiketi veya yayıncının özel takip kaydı kullanılabilir.
   Takip kaydı yalnız gerekli talep numarası ve tarihlerden oluşmalı; mesaj
   içerikleri/profil verileri Git'e, bu projeye veya herkese açık siteye konmaz.
3. Yayıncı düzenli olarak süresi dolan kapalı talepleri kontrol eder. İlgili
   gelen/gönderilen mesajlar, ekler ve varsa dışa aktarılmış destek kopyaları
   birlikte kapsanır. Gmail'de sadece arşivlemek silmek değildir.
4. Mesajı Çöp Kutusu'na taşımak kalıcı silme değildir. İlgili çöp kopyaları
   da tamamlanmalıdır; yayıncı tüm Çöp Kutusu'nu körlemesine boşaltmamalıdır.
   Agent kalıcı silme işlemi yapacaksa hedefler ve işlem anında onay gerekir.
5. Yayıncı sorumluluğu ve gerçek etkin görev doğrulanmadan `supportVerified`
   true olmaz. Bu dar kurulum doğrulandı; mevcut kapsam boş. Geçmiş etiketsiz
   mesajlar temizlendi veya dışa aktarım kopyaları silindi denmez.
6. Gerçek bir yasal saklama veya uyuşmazlık istisnası gerekiyorsa kapsam/gerekçe
   ve süre ayrıca değerlendirilip politikada açıkça belirtilmelidir; bütün
   talepleri süresiz tutan genel bir istisna uydurmayın.

## Cloudflare ve Play tamamlama kapıları

- Yalnız mevcut **gridshard-public** Pages projesi güncellenir; yeni proje,
  domain/DNS değişikliği, oyun istemcisi build'i veya AWS release dağıtımı yok.
- Yedek/sunucu kanıtı ve destek süreç teyidi tamamlanınca TR/EN nihai metin,
  hesap silme sayfaları, testler ve manifest birlikte güncellenir.
- `node tools/build-public-site.js` sadece izin listeli statik çıktıyı üretir.
  `node --test tools/tests/public-site.test.js` ve
  `node tools/check-public-site.js` geçmelidir.
- **Create deployment → Production** için yalnız `build/public-site/` içeriği
  veya kökte `index.html` bulunan izin listeli ZIP kullanılır. Operator manifest,
  bu yönerge, oyun kodu, veri/sır dosyaları ZIP'e girmez.
- Yayından sonra gerçek custom domain'de TR/EN politika ve hesap silme, yayıncı,
  AWS, doğru etkin saklama metni ve mevcut app-ads.txt birebir doğrulanır.
- Ardından mevcut `https://gridshardgame.com/privacy/` Play formunda kaydedilir.
  Form kaydı Google inceleme/uygunluk veya genel oyun yayını kanıtı değildir.

Kaynaklar: [Google Play kullanıcı verileri/gizlilik politikası](https://support.google.com/googleplay/android-developer/answer/10144311?hl=tr),
[Cloudflare mevcut Direct Upload projesini güncelleme](https://developers.cloudflare.com/pages/get-started/direct-upload/#create-a-new-deployment).
