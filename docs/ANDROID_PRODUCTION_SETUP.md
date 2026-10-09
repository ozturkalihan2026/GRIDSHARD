# Kalıcı Android / mağaza geçişi — 4 Ekim 2026

Bu belge tek seferlik dış kurulumları toplar. Mevcut HTTPS + PostgreSQL + Redis
üretim sunucusu kullanılacak; yeni sunucu/veritabanı veya oyuncu sıfırlaması yok.
Derlenmiş release, Google Play genel yayın onayı veya çalışan gerçek ödeme kanıtı değildir.

**Güncel cihaz sonucu — 4 Ekim:** Kullanıcı onaylı tek-telefon Play geçişi
sonrasında Play Games bağlantısını, **Uç** oturumunun ve kupa/Akı/Devre Kredisi
bakiyelerinin geri geldiğini teyit etti. Hesap geri-dönüş kontrolü kullanıcı
teyidiyle tamamlandı; tekrar kurulum veya ikinci telefon gerekmez. Receipt
`artifacts/android-production-20261004-v1/play-profile-restore-20261004.json`.
Son salt-okunur USB envanterinde bağlı cihaz yoktu: Play installer/cihaz dağıtım
imzası bağımsız okunmadı. Önceki USB sürüm/non-debug/teslim APK SHA256 denetimi
yerel APK'nın tarihsel kaydıdır, Play APK'sının hash'i değildir.
Genel mağaza/AdMob onayı, gerçek reklam/SSV maç ödülü ve satın alma hâlâ açıktır.

**Sıradaki dış adım:** Kullanıcının Kontrol paneli ekranlarında kurulum eksikleri
ve kapalı test kilidi görüldü. Önce gizlilik politikası/mağaza beyanları tamamlanır;
aynı v1 dahili sürüm, paket, anahtar, PGS bağlantısı ve üretim altyapısı korunur.

## Kontrol paneli — doğrulanan yayın kapıları

4 Ekim 20949/20109/201023 ekranları şu kurulum görevlerini gösterir; tamamlandı
işareti görünmez. Beyanlar bu incelemeyle kaydedilmiş sayılmaz:

- Gizlilik politikası, oturum açma/inceleme erişimi, reklam.
- İçerik derecelendirmesi, hedef kitle, veri güvenliği.
- Resmi kurum, finans özellikleri ve sağlık beyanları.
- Uygulama kategorisi/iletişim bilgileri ve mağaza girişi.

Kapalı test, kurulum tamamlanana kadar kilitli. Üretime başvuru için bu hesabın
ekranında en az **12** kapalı test katılımcısının aralıksız en az **14 gün** kayıtlı
kalması isteniyor; mevcut sayı **0**. Dahili test bu süreye sayılmaz. Gerçek
katılım ve test geri bildirimleriyle süreç yürütülür; sahte katılımcı/süre veya
otomatik üretim onayı iddiası yok. Şartlar sağlanınca üretim erişim başvurusu
ve Google incelemesi ayrıca gerekir. [Resmi test şartları](https://support.google.com/googleplay/android-developer/answer/14151465?hl=tr).

### İlk görev — gizlilik politikasını nihai hale getirme

**Yeni yayıncı kararı:** Kullanıcı public geliştirici adını **Alihan ÖZTÜRK** olarak
verdi; üretim yedekleri **30 gün**, destek yazışmaları **talep kapandıktan sonra90
gün** saklama önerisini onayladı. Ad yerel TR/EN politika girişlerine eklendi.
Bu onay, sürelerin canlıda uygulanmış olduğunun kanıtı değildir: yedek expiry
ve destek kapatma/silme süreci henüz kurulup doğrulanmadı; güncel/geri dönüş
yedekleri bu tur silinmedi. Süreler ancak gerçek düzen doğrulanınca nihai politika
olarak yayımlanır. Receipt `publisher-privacy-decisions-20261004.json` teslim
klasöründe; yayıncı bilgisi tekrar sorulmaz.

Canlı `https://gridshardgame.com/privacy/` bu kontrol sırasında HTTPS200 ve GRIDSHARD
başlığı döndü; ancak eski Oracle sağlayıcı metni ve kesinleştirilmemiş saklama
açıklaması hâlâ var, AWS düzeltmesi canlıda yok. Yerel `public-site/content.js`
AWS düzeltmesini içerir; bu bir yayın kanıtı değildir. Eski sayfayı final politika
olarak göndermeyin. Kullanılacak public geliştirici adı/irtibat ve fiilen uygulanacak
yedek/destek saklama düzeni yayıncıyla netleştirilir; tarih/silme garantisi uydurulmaz.
Mevcut `gridshard-public` Cloudflare Pages projesi güncellenip canlı TR/EN sayfalar
doğrulanmadan politika tamamlandı sayılmaz. Yeni site/proje/domain veya oyun
sunucusu kurulmaz. [Kullanıcı verileri/gizlilik şartları](https://support.google.com/googleplay/android-developer/answer/10144311?hl=tr).

Reklam beyanı planlanan AdMob ödüllü reklam içeriğini doğru yansıtmalıdır; bu
beyan reklam rollout'unu açmaz. İnceleme erişiminde yalnız misafir/PGS akışının
gerçek erişebildiği özelliklere göre talimat verilir; tüm özellikler serbest diye
varsayılmaz. Çocukları içeren hedef kitle, sosyal özellikler, SDK verileri ve
satın alma işlevleri gerçek kaynak davranışıyla birlikte ayrıca değerlendirilir.
[İçerik beyanları](https://support.google.com/googleplay/android-developer/answer/9859455?hl=tr).

Evidence receipt: `artifacts/android-production-20261004-v1/play-store-dashboard-20261004.json`.

**Güncel öncelik:** Kullanıcı tester eklediğini fakat diğer oyuncuların PGS girişinin
başarısız olduğunu bildirdi. Hangi liste olduğu/giriş hata kodu henüz görülmedi.
Önce PGS Test kullanıcıları/kanal erişimi ve seçili Google hesabı kontrol edilir;
kurulum kanalı listesiyle karıştırılmaz. [PGS tester adımları](PLAY_GAMES.md).
Bu sorunun çözümü yeni sunucu/APK veya tamamlanmış 14 günlük test anlamına gelmez.

## Kalıcı kimlik ve tekrar üretim

- Paket: `com.gridshardgame.app`, API: `https://play.gridshardgame.com`.
- Public yapılandırma: `config/android-production.json`; ilk versionCode **1**.
  Mağazaya gönderilen her yeni sürümde kod artırılır, paket/anahtar değiştirilmez.
- Üretim derlemesi: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-android-production.ps1`.
  Kaynak `android/`, çıktılar `android/app/build/outputs/apk/release/app-release.apk`
  ve `android/app/build/outputs/bundle/release/app-release.aab`.
- Derleme debug/test bayraklarını temizler; release Gradle işi kalıcı anahtar
  olmadan başarısız olur, debug imzaya geri düşmez. Publisher birimi yalnız
  canonical, non-debuggable, explicit-live pakette native olarak yetkilendirilir.
- Test uygulaması `com.gridshard.remotedebug` ayrı kalır. Kalıcı APK'yı kurmak
  önceki hesabı otomatik taşımaz; PGS bağlaması tamamlandıktan sonra aynı Google
  hesabıyla devamlılık ayrıca doğrulanır. Eski uygulamayı/verileri silmeyin.

## Anahtarın kullanıcıya teslimi / yedek

`secrets/android-release/gridshard-upload.p12` RSA3072, alias `gridshard-upload`.
Parola `credential.dpapi.xml` içinde yalnız bu Windows kullanıcısı tarafından
açılabilen DPAPI korumasında; açık metin kaynakta/sohbette yok. Klasör ACL'si
mevcut kullanıcı, SYSTEM ve Administrators ile sınırlı; Git ve kaynak ZIP dışında.
Mevcut anahtarın üstüne yeniden üretim yapılmaz.

**Bu, taşınabilir yedek değildir.** Windows hesabı yeniden kurulmadan önce anahtarın
ayrı güvenli kopyası ve parolanın parola yöneticisine güvenli aktarımı tamamlanmalıdır.
Özel anahtarı/parolayı sohbete göndermeyin. Play App Signing seçildiğinde bu anahtar
yükleme anahtarı olarak kalır; Play'in dağıtım imzası farklı olabilir. Sideload APK ile
Play dağıtımının imzası farklıysa aynı paket üzerine güncelleme yapılamaz; bunu
kullanıcı verisini silerek çözmeyin, Play kanalı/PGS devamlılığını önceden hazırlayın.

## Play Games (tek seferlik)

Play Console → Play Oyun Hizmetleri → Yapılandırma → Android kimlik bilgisi:
paket **com.gridshardgame.app**, yerel release SHA-1:

`E4:8A:96:52:1E:5B:A2:AB:53:CE:17:96:BE:D3:2E:3F:6E:B7:EB:7B`.

Public sertifika JSON/DER dosyaları `artifacts/android-production-20261004-v1/`
klasöründe bulunur. Bu SHA-1 gizli anahtar/parola değildir.
Yeni paket için ayrı Android OAuth istemcisi oluşturup bu oyuna bağla;
mevcut test istemcisinin paketini veya parmak izini değiştirme.
Mevcut oyun ID **376018782491** ve mevcut web/server OAuth istemcisi korunur.
Eski debug ve yerel release istemcilerini silmeyin. Upload sertifikası tek başına
Play'den kurulan oyunu yetkilendirmez.

### Play dağıtım sertifikaları — doğrulandı, OAuth bağlaması kullanıcıca teyit edildi

4 Ekim'de kullanıcının `certificates.zip` dosyasındaki üç DER sertifikası bellek
içinde okunarak doğrulandı; private key içermez. Gönderilen SHA-1/SHA-256,
`deployment_cert.der` ile birebir eşleşir. Public kayıt
`config/android-play-certificates.json` içinde kaynak ZIP SHA256 ile saklanır.
Bu kayıt tek başına Google Cloud/Play Console'a kayıt veya canlı App Links yayını değildir.

Kullanıcı üç Cloud Android istemcisini oluşturup mevcut GRIDSHARD PGS oyununa
bağladığını “bağlandı” diyerek teyit etti. Panel bağımsız okunmadı; bu teyit
tek başına cihaz giriş kanıtı değildi. Sonraki tek-telefon geçişinde Play Games
ile Uç profilinin/bakiyelerin geri geldiği ayrıca kullanıcıca teyit edildi.
Aşağıdaki bağlama adımları tamamlanan kurulumun referansıdır; aynı istemcileri
yeniden oluşturmayın.

Play'in hibrit imzalama akışı üç dağıtım sertifikası kullanır; API sağlayıcılarına
üçü de kaydedilir. [Play App Signing / API kaydı](https://support.google.com/googleplay/android-developer/answer/9842756?hl=tr).
Sertifikalar Play Console → Google Play ile korunanlar → Google Play Store koruması
→ Google Play Uygulama İmzalama'yı yönetin altında bulunur; eski Uygulama bütünlüğü
sayfası bu ekrana yönlendirir. Anahtarı değiştirme/yeni sürüme geçirme işlemi yapmayın.

Google Cloud'da mevcut bağlı proje **376018782491** → Google Auth Platform → Clients
→ Create client → Android. Her satır için aynı paket **com.gridshardgame.app** ve
ilgili SHA-1 ile ayrı istemci oluşturun; aynı paket+SHA-1 zaten varsa onu kullanın.

| Cloud Android OAuth adı | Sertifika | SHA-1 |
| --- | --- | --- |
| GRIDSHARD Play | deployment | `7C:FD:F8:68:FE:78:6E:BA:DF:B0:3B:31:D8:E6:15:5B:05:55:B0:0F` |
| GRIDSHARD Play Hybrid Classical | hybrid classical | `7B:97:CD:22:11:1B:F6:0F:68:F0:1A:D2:E8:79:05:38:B7:99:BD:12` |
| GRIDSHARD Play Hybrid PQC | hybrid PQC | `B4:4E:55:F6:80:66:66:DE:83:2F:EF:7C:EE:99:CF:E9:1B:8E:C7:63` |

Ardından Play Console → Play Oyun Hizmetleri → Kurulum ve yönetim → Yapılandırma
→ Kimlik bilgisi ekle → Android. Görünen oyun adı **GRIDSHARD**; OAuth listesini
yenileyip ilgili Cloud istemcisini seçin ve kaydedin. Üç istemciyi de mevcut aynı
oyuna bağlayın; mevcut server/web istemcisini veya yeni yükleme varsayılanını bu
işlem için değiştirmeyin. SHA256 alanı Android OAuth SHA-1 alanına yapıştırılmaz.
[PGS istemci bağlama](https://developer.android.com/games/pgs/console/setup).

Mevcut AAB v1 (2.1.0-beta.72), kullanıcının 4 Ekim `165644` ekranında etkin dahili
kanalda **Dahili test kullanıcıları tarafından kullanılabilir** olarak görülür;
Console yayına sunma zamanı 4 Eki 15:40, durum **İncelenmedi**. Dahili yayın teyit
edildi; sonraki tek-telefon geçişinde hesap geri dönüşü kullanıcıca teyit edildi.
Tester listesi/kurulu Play imzası bağımsız okunmadı.
Geçici `com.gridshardgame.app (unreviewed)` mağaza adı PGS oyuncu kimliği değildir;
ilk mağaza incelemesi öncesi etikettir, genel yayın onayı anlamına gelmez.
Bu sertifika kaydı için yeni APK/AAB üretmek veya sunucuyu yeniden başlatmak gerekmez.
Onaysız/yedeksiz kaldırma veya imza denetimini aşma yok. Aşağıdaki kontrollü
tek-seferlik geçiş kullanıcıca tamamlandı; tekrar edilmez. Play test kanalı,
PGS test kullanıcıları ve lisans test kullanıcıları ayrı ayarlardır.
[Google Play test kanalları](https://support.google.com/googleplay/android-developer/answer/9845334?hl=tr).

Mevcut v1'i aynı kurulum için tekrar yüklemeyin/yayınlamayın. Dahili test hesabı
erişimi ile PGS tester kaydı ve lisans testi birbirinden ayrıdır. Tek telefonla
hesap geri dönüşü aşağıda tamamlandı; ikinci cihazla testi zorunlu tutmayın.

### Tek telefonla kontrollü Play geçişi

**Güncel sonuç:** Kullanıcı Uç/167 profilini ve geçişi onayladı. 4 Ekim'de
`/var/backups/gridshard-production/20261004-before-device-play-migration` güncel
yedeği alındı: 136119 byte, SHA256
`067319afc7fc079781387209c213fb7c1b6a8fee777ffa910a166fa734254b54`;
klasör0700/dump+manifest0600, aynı kurulum/5 profil/5 kimlik/40 maç, SHA ve
`pg_restore --list` doğrulandı. Mevcut aynı servis yeniden sağlıklı açıldı;
PGS bağlantısı/profil/ledger değişmedi. Ardından kullanıcı manuel geçiş adımları
sonrasında **“play games bağlandı, uç oturumu geldi. kupa akı devre kredisi tamam”**
diyerek hesap/bakiye geri dönüşünü teyit etti. USB bağlı olmadığı için kurulum
kaynağı/imzası bağımsız okunmadı; aynı adımları yeniden yaptırmayın. Bu yedek
yalnız sunucu verisidir, telefonun yerel oturum/ayarlarını kapsamaz. Yedek receipt'i
`artifacts/android-production-20261004-v1/play-single-device-migration.json`,
son kullanıcı teyidi `play-profile-restore-20261004.json`.

**Tamamlanan geçişin referansı — tekrar yürütülmez:**

Önce mevcut telefonda dahili katılım linki aynı Google hesabıyla açılmalı ve tester
katılımı doğrulanmalıdır; erişim reddediliyorsa APK kaldırılmaz. Katılım başarılıysa
yalnız normal GRIDSHARD (`com.gridshardgame.app`) yerel APK kaldırılır; GRIDSHARD
TEST korunur. Play'den mevcut v1 kurulduktan sonra ilk açılıştaki **PLAY GAMES İLE
DEVAM ET** seçeneği `login` ile eski profile dönmek içindir. Ayarlar'daki **PLAY
GAMES BAĞLA** `link` işlemi eski hesap başka bir profile bağlıyken restore yolu
değildir. Uç/167 görünmeden maç/ödeme yapılmaz; boş profil yeniden bağlanmaz.

Kullanıcı ikinci telefon bulunmadığını bildirdi. İkinci cihaz zorunlu değildir;
ancak mevcut upload imzalı canonical APK ile Play imzası eşleşmediği için standart
yerinde güncelleme mümkün değildir. Paket/anahtar değiştirme, Android imza
denetimini aşma, ikinci kullanıcı/work profile veya `uninstall -k` yöntemini
imza farkını güvenle çözen bir alternatif olarak önermeyin.

4 Ekim salt-okunur canlı kontrolünde bir benzersiz PGS hesabı, karşılığı mevcut
**Uç /167 kupa** profili, sağlıklı PostgreSQL/Redis ve dört sağlam eski yedek
görüldü. Bu, kullanıcının doğru Google hesabını yeniden seçtiği veya Play sürümünde
girişin başarılı olduğu kanıtı değildir. Sunucu `login` akışı doğrulanmış PGS
subject'in mevcut profil sahibine geri döner; yerel misafir kimliğiyle yeni hesabı
eski sahibin üzerine bağlama yoluna gidilmez.

Bu geçişte mevcut telefon profili kullanıcıya teyit ettirildi ve açık onaydan
sonra güncel sunucu yedeği oluşturulup bütünlüğü doğrulandı. Yalnız yerel
`com.gridshardgame.app` APK'sının kaldırılması ve mevcut dahili linkten Play
kurulumu bir defalık kanal geçişidir: telefondaki yerel oturum/ayarlar silinebilir;
sunucu profilinin/ilerlemenin silinmesi veya eski `com.gridshard.remotedebug`
uygulamasının kaldırılması bu işleme dahil değildir. Güncel yedek ve onay olmadan
kaldırma talimatı vermeyin. Google hesabı erişilebilirliği, tester katılımı,
Play kurulum imzası ve aynı PGS hesabıyla profil devamlılığı ayrıca doğrulanır.
Yanlış/boş profil açılırsa yeni hesabı bağlamaya veya yedeği canlı veritabanının
üzerine topluca geri yüklemeye çalışmayın; eski profil korunarak inceleyin.
[Android güncelleme imzası kuralı](https://developer.android.com/studio/publish/app-signing).

## AdMob adres testi / gerçek ödül

URL `https://play.gridshardgame.com/ads/admob/ssv`.
4 Ekim'de kullanıcı mevcut alanlarla URL'nin doğrulandığını ve kaydedildiğini
teyit etti. 403 aşaması geçildi; aynı panel testini yeniden yapmak gerekmez.
Kalıcı panel test User ID `gridshard-ssv-probe`, Custom data
`configuration-check-no-reward`. Eski tarihli probe çifti de korunur.
Bu ayrılmış çift, Google'ın production ECDSA imzası ve güncel timestamp
doğrulandıktan sonra HTTP200/ignored alır; panelin sentetik birimi ekonomik
ödül kontrolüne sokulmaz. Profil okuma/oluşturma/transaction/ödül kaydı yok.
Sahte imza veya tarihi geçmiş probe reddedilir.

Gerçek oyuncu callback'inde yalnız kayıtlı sayısal birim veya **tam birebir**
publisher/birim kabul edilir. Yabancı publisher'ın aynı suffix'i reddedilir.
Gerçek oyuncu/maç ödülü yalnız imzalı SSV + kalıcı maç sonucu ile, tek sefer verilir.
Panel başarısı gerçek reklam izleme/ödül kanıtı değildir. Callback adresi
doğrulanıp kaydedilmeden, PGS bağlaması ve release cihaz kontrolü olmadan
sunucu rollout'u `disabled` kalır. Üretim sahte reklam/ödeme modu hep0.

SSV paneli ve tek-telefon Play Games hesap geri dönüşü kullanıcı teyidiyle geçti;
genel mağaza/AdMob uygulama hazırlık onayı henüz görülmedi. Desteklenen mağazada
herkese açık kullanılabilirlik ve AdMob mağaza bağlantısı inceleme koşullarıdır;
dahili test yayını bunların yerine geçmez. Önce Play mağaza kurulum görevleri
tamamlanır; AdMob → Uygulamalar → Tüm uygulamaları görüntüle
alanındaki durum ve canonical mağaza bağlantısı ayrıca kontrol edilir. AdMob
incelemesi, panel SSV adres testiyle aynı onay değildir. Geliştirici kendi gerçek
reklamlarını test amacıyla tıklamamalı; SDK test reklamları gerçek SSV ödülü kanıtı
olarak gösterilmemelidir. [AdMob hazırlık durumu](https://support.google.com/admob/answer/10564477?hl=tr),
[Google test reklamı kuralları](https://developers.google.com/admob/android/test-ads).

Çocukları içeren kitle nedeniyle tüm istekler şu an korumalı: UMP TFUA,
reklam TFCD/G ve NPA; AD_ID/AdServices izinleri çıkarılmıştır. Kişiselleştirilmiş
yetişkin reklama geçiş yok. Play hedef yaşları, veri güvenliği ve gizlilik
beyanları gerçek uygulama işlevleriyle ayrıca tutarlı tamamlanmalıdır.

## Ürünler — 9 Ekim 2026: kayıtlar var, etkinleştirme henüz yok

Kullanıcının güncel Play Console ekranında aşağıdaki 10 ürün mevcut; tümünde
etkin satın alma seçeneği/teklif sayısı0. `gridshard.flux_120` için `standard`
Buy seçeneği Taslak, eski sürüm uyumlu ve yalnız Türkiye29,99 TL olarak
doğrulandı. Diğer dokuz ürünün güncel fiyat/bölge ayrıntıları henüz görülmedi.
Android Developer API ve dar billing servis hesabı/AWS WIF hazırlanmış durumda;
canlı API katmanı uygulanmadığından gerçek ödeme hâlâ kapalıdır.
Mevcut kullanıcı kararı katalog fiyatları aşağıdadır; Play'in cihaz/bölge fiyatı
oyunda native `getProducts` ile gösterilir. Eksik fiyat veya belirsiz teklif
ödeme açmaz; makbuz sunucuda doğrulanıp kalıcı yazılmadan tüketilmez.

| Play ürün kimliği | İçerik | TR temel fiyatı |
| --- | --- | --- |
| gridshard.season_pass_premium | Bu sezon premium geçiş | 199,99 TL |
| gridshard.battle_rewards_premium | Bu sezon Savaş Premium | 199,99 TL |
| gridshard.flux_120 | 120 Akı | 29,99 TL |
| gridshard.flux_260 | 260 Akı | 59,99 TL |
| gridshard.flux_480 | 480 Akı | 99,99 TL |
| gridshard.flux_1050 | 1.050 Akı | 199,99 TL |
| gridshard.credits_1000 | 1.000 Devre Kredisi | 29,99 TL |
| gridshard.credits_2200 | 2.200 Devre Kredisi | 59,99 TL |
| gridshard.credits_4000 | 4.000 Devre Kredisi | 99,99 TL |
| gridshard.credits_9000 | 9.000 Devre Kredisi | 199,99 TL |

Tek seferlik ürünler, tek normal satın alma seçeneği; otomatik yenilenen abonelik
değiller. Sezon hakları her sezon yeniden alınabilen tüketilebilir işlemdir;
aynı sezonda ikinci satın alma sunucu/UI tarafından engellenir.

Gerekli dış adımlar:

1. AAB'yi önce Play test kanalına yükle; Play App Signing ve PGS dağıtım sertifikası bağlamasını tamamla.
2. Mevcut ürünleri yeniden oluşturma. Satın alma seçeneklerinin ülke/fiyat
   ayrıntılarını kontrol et; kapalı test dağıtım bölgeleri ürün satış bölgeleri
   değildir. Lisans-test hesabını ve test ödeme penceresini doğrula. Ürünleri
   açık etkinleştirme kararı olmadan açma; ilk kontrollü testte tek ürün yeterli.
3. Mevcut projedeki Android Developer API, uygulama-sınırlı billing hesabı ve
   dar AWS WIF kimliğini koru. JSON anahtarı üretme/indirme, IAM yetkisini
   genişletme. WIF config yalnız API'ye UID10001/0400 ve salt-okunur bağlanır;
   APK/Git'e girmez. Canlı katman/yedek/restart için taze onay gerekir.
4. Kullanıcının seçimi: Cloud Billing/kart/deneme/Pub/Sub açmadan AWS üzerinde
   periyodik Voided Purchases kontrolü (1800sn). İadeler anlık değildir;
   checkpoint/başarılı son tarama izlenir. Makbuz/pending/tüketim/iade/tekrar/
   hesap bağı gerçek lisans-test cihazında ayrıca doğrulanır. Ayrıntılar:
   `docs/GOOGLE_PLAY_AWS_WIF.md`, `docs/STORE_PURCHASES.md`. RTDN ayrı gelecekteki
   karar olabilir; mevcut konuyu/aboneliği silme veya Play'e bağlama yok.
5. Reklam içerir, hedef kitle/yaş, veri güvenliği, gizlilik politikası, hesap
   silme bağlantısı, içerik derecelendirmesi ve mağaza görsellerini tamamla.
6. Hesabın Play üretim erişim koşullarını geçmeden genel yayın yapılmaz.

Kaynaklar: [Android imzalama](https://developer.android.com/studio/publish/app-signing),
[Play Games kurulumu](https://developer.android.com/games/pgs/console/setup),
[AdMob SSV paneli](https://support.google.com/admob/answer/9603226?hl=tr).
