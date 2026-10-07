# Savaş sonu ödüllü reklam — r13 / Android v4 devam notu

7 Ekim 2026. Kullanıcı reklamı kapalı testten önce açmak istiyor; hedef kitle
13 yaş ve üzeri. Gerçek ödeme açılması bu işin kapsamında değil.

## Son durum — 7 Ekim: sunucuda live, paket/cihaz kapıları açık

Mevcut r12 imajını koruyarak yalnız özel operatör `.env` ayarı
`GRIDSHARD_ADMOB_ROLLOUT_MODE=live` yapıldı. SSV1, doğru Android birimi,
boş test listesi, reklam/ödeme test kipleri0 ve dört read-only private
mount korunur. Production Compose/.env.example varsayılanları hâlâ kapalı.
R13 kaynak veya imajı dağıtılmadı; imzalı v4 henüz yok.

Önce yeni çevrimdışı yedek doğrulandı; yeniden halka açmadan kalıcı satır
fingerprint/sayıları birebir karşılaştırıldı. Son audit12profil/12kimlik/
65savaş/pending0/kritik0. R2 iş success/0;34 iç kontrol, bağımsız iş ağı
HTTPS331.302s/34 kontrol ve unsignedSSV403 geçti. AWS'den Cloudflare403
nedeniyle dış witness burada yapıldı; WAF kuralları değiştirilmedi.
R1 başarısızlıkta disabled'a güvenli döndü; R1 ve R2 yedekleri korunur,
DB restore veya veri silme yok. Ayrıntı checkpoint'in en üstünde ve ignored
`artifacts/admob-readiness-20261007/live-activation-final-audit.json`.

Bu, gerçek gösterim veya Google SSV ödülünün cihazda denenmesi değildir.
AdMob sınırlı sunum/doluluk ve imzalı v4/gerçek cihaz kapıları açık kalır.
R13 geçişinde bu yeni **live** kararı korunmalı; eski devirdeki kapalı
reklam talimatı tekrar uygulanmamalı. Gerçek ödemeye yetki verilmedi.

## Hazırlanan davranış

Oyuncu savaş sonunda kendi isteğiyle reklamı açar. Yerel SDK ödül olayını
bildirmeden ve reklam kapanmadan ödül talep edilmez. Reklam tamamlandıktan
sonra SSV veya bağlantı gecikirse aynı açık uygulama oturumunda **ÖDÜLÜ
KONTROL ET** düğmesi yeniden reklam oynatmadan sunucuya talep gönderir.
Bu RAM işareti hesaba ait uygulama oturumuyla sınırlıdır, uygulama yeniden
açılınca kaybolur; ödül kanıtı değildir. Test reklamı bu işareti veya gerçek
ödülü üretmez. Sunucu Google'ın imzalı SSV kaydını, oyuncuyu ve kalıcı savaş
sonucunu doğrular. Aynı savaşın ödülü ikinci kez verilmez; kupa ve takım
puanı ikiye katlanmaz.

Kaynak `versionCode` artık 4; sürüm adı `2.1.0-beta.72` kaldı. Bu, imzalı
APK/AAB üretildiği veya Play'e yüklendiği anlamına gelmez.

## AdMob paneli — yayın öncesi sınır

Paylaşılan panelde **İnceleme gerekli / Sınırlı reklam sunumu** var; mağaza
aramasında uygulama bulunmadı. Bu tüm reklamların engellendiği anlamına
gelmez: yayınlanmamış uygulamaya sınırlı sunum mümkün, doluluk garantisi yok.
Tam sunum için desteklenen mağazadaki herkese açık kayıtla ilişkilendirme ve
Google'ın hazırlık/doğrulama süreci gerekir. Dahili test katılım bağlantısı,
başka uygulama veya yayınlanmadığı mağaza kullanılmaz. Mevcut uygulama ve
reklam birimi yeniden oluşturulmaz.

`https://gridshardgame.com/app-ads.txt` bugün HTTP 200 ile doğru yayıncı
satırını sundu; bu **AdMob doğrulama onayı değildir**. Play mağaza girişindeki
geliştirici/destek web sitesi `https://gridshardgame.com/` olmalı; yalnız
gizlilik politikası URL'si tarayıcının mağazadan siteyi bulması için yeterli
değildir. Boş app-ads.txt tablosu yeni dosya gerektiğini kanıtlamaz.

Kaynaklar:

- https://support.google.com/admob/answer/9989980?hl=tr
- https://support.google.com/admob/answer/10564477?hl=tr
- https://support.google.com/admob/answer/9776740?hl=en

## Doğrulananlar ve doğrulanmayanlar

- İstemci tam Node test paketi: **246 geçti**; reklam alt kümesi **32 geçti**.
- Linux/Python 3.12 ve yalıtılmış PostgreSQL 17 üzerinde reklam rollout,
  imza, kalıcı ödül/yeniden açılış ve ödül bütünlüğü: **73 geçti**.
- Gerçek oturum olmadan 401, başka oyuncunun talebinde 403, SSV gelmeden
  422; imzalı kayıt tek kez saklanır. RAM önbelleği silinince doğrulanmış
  kayıt ve kalıcı savaş sonucu yeniden yüklenip ödül bir kez verilir.
  Yeni talep kimliğiyle tekrar da bakiyeyi artırmaz.
- Web derleme sözleşmeleri: **9 geçti**; `release_guard.py` geçti.
- Bu testler imza fixture'ı/native mock kullanır. Fiziksel Android, gerçek
  Google reklamı/SSV, r13 imaj smoke/backup/restore ve canlı geçiş henüz
  bu değişiklikler için doğrulanmadı. Test sonuçları hukuki uyum belgesi değil.

## Sıradaki yayın kapıları

1. Kullanıcı değişiklikleri commit/push eder; CI sonucu kontrol edilir.
   r13 için `CODEX_HANDOFF_R13_V4.md` ve üretim runbook'undaki yalıtılmış
   imaj/restart/yedek-geri-yükleme kontrolleri tamamlanır. Canlı r12'nin
   durumu, dört Compose katmanı, sabitlenmiş SSH anahtarı ve taze yedek
   bağımsız doğrulanır; r12 imajına geri dönüş korunur.
2. **Tam r13 imaj geçişinden hemen önce yeni kullanıcı onayı alınır.**
   Kullanıcının son `Canlı reklamı açalım; v4 kapalı testte açık olsun`
   mesajı reklam rollout'u için açık yetkidir; bunun için aynı onay yeniden
   sorulmaz. Güvenli sunucu ön kontrolü, yedek ve geçiş kuralları korunur.
   Mağaza onayı olmaması otomatik bir teknik kapatma sebebi sayılmaz;
   doluluk veya inceleme onayı vaat edilmez.
3. İmzalı v4 aynı upload anahtarıyla üretilir ve APK/AAB denetlenir.
   `tools/build-android-production.ps1 -Offline` ve
   `tools/audit-android-review-release.ps1 -Directory <çıktı> -VersionCode 4`
   kullanılır. Telefonun Play imzasını bozacak USB APK kurulumu yapılmaz.
4. Geliştirme testinde yalnız Google demo reklamı veya SDK'nın doğruladığı
   test cihazı kullanılır; test kendi gerçek reklam trafiğini üretmez.
   Mevcut `test` rollout'u açık HTTPS **debug** test paketine yöneliktir;
   üretim v4'e sadece sunucu test bayrağı açılarak uygun hale gelmez.
   Test reklamı gerçek ekonomiye ödül vermez.
5. UMP her açılışta güncellenir; `canRequestAds` yoksa reklam kapalı kalır.
   13+ hedef yaş herkesin yetişkin olduğunu kanıtlamaz. Mevcut G dereceli,
   kişiselleştirilmemiş, bilinmeyen yaş korumaları ve AD_ID/AdServices izin
   kaldırmaları korunur. Analitik yaş sorusu reklam rızası yerine kullanılmaz.
6. Gerçek rollout yalnız özel operatör ayarında açılır: `GRIDSHARD_ADMOB_SSV_ENABLED=1`,
   `GRIDSHARD_ADMOB_ROLLOUT_MODE=live`, test oyuncu listesi boş,
   mevcut Android rewarded birimi doğru olmalı. `.env.example` ve Compose
   varsayılanları `disabled` kalır. Eski protokol/web istemcisine reklam
   yetkisi verilmez; ödeme ve sahte reklam test kipleri kapalı kalır.
7. Geri çağrı panel testi imzalı olsa bile probe ekonomiye dokunmadan 200
   döner; bu gerçek bir oyuncunun ödül akışının denendiğini kanıtlamaz.
   Native testte erken kapanma, no-fill, rıza hatası, geciken SSV ve bağlantı
   kaybı kontrol edilir. Gerçek reklamla kendi gösterim/tıklamasını sınama
   yapılmaz. Sorunda rollout `disabled` ile durdurulur, oyuncu verisi silinmez.

Resmî teknik kaynaklar:

- https://developers.google.com/admob/android/privacy
- https://developers.google.com/admob/android/targeting
- https://developers.google.com/admob/android/ssv
- https://support.google.com/admob/answer/9388275?hl=tr

## İş bilgisayarı sınırı

Docker çalışıyor; testler bu bilgisayarda yapılabildi. Beklenen Android
Studio Java/Android SDK, upload `.p12`, DPAPI kaydı ve r12 özel yayın/SSH
known_hosts kayıtları burada bulunamadı. Kullanıcı mevcut upload anahtarına
şu anda erişemediğini teyit etti. Aynı upload anahtarı güvenli şekilde
getirilebilir veya evde derlenebilir; yeni anahtar üretilmez. Evdeki DPAPI
kaydı başka Windows hesabında doğrudan kullanılamaz. Parola, sunucu adresi
ve özel anahtar yolu izlenen dosyalara veya günlük çıktısına yazılmaz.

Build/audit betikleri artık makineye özel ev yolu yerine
`-JavaHome` / `-AndroidSdkRoot` veya yerel ortam/varsayılan kurulum yollarını
kullanır. JDK 21+, platform 36 ve build-tools 36.0.0 zorunlu; dört yol/eksik
araç testi geçti. Bu, araçların kurulduğu veya APK/AAB üretildiği anlamına
gelmez. Audit'in mevcut özel review vault/signer kontrolleri de korunur.

Son sunucu erişim denemesinde TCP 22 yanıt vermedi; HTTPS isteklerine mevcut
iş ağı `MEB Erişim Engeli / games` yanıtı verdi. Canlı ayar uygulanamadı;
güvenlik grubu kaynaklı olduğu kesinleşmedi. İzinli ağdan tekrar kontrol,
güncel SSH kuralları ve eşleşen ED25519 host anahtarı gerekir; herkese açık
SSH veya kurumsal ağ kısıtını aşan araç kullanılmaz.

Kullanıcı yeni Wi-Fi'ye geçince HTTPS sağlıklı ve TCP 22 erişilebilir oldu;
SSH ise sunucu banner/host anahtarından önce `Connection reset` verdi.
Güncel SSH /32 kaynakları yeni ağla karşılaştırılmalı; anahtar doğrulaması
ve yönetici girişi gerçekleşmedi. Önceki MEB engeli bu yeni ağın sonucu
değildir; canlı reklam ayarı hâlâ uygulanmadı.
