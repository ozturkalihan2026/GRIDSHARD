# Gerçek para alımı ve ödüllü reklam

## Güncel — kalıcı Android / r10 (4 Ekim 2026)

SSV düzeltmesi aynı production verileriyle r10'a aktarıldı. R9'un gerçek callback
ret nedeni güvenli loglarda `unknown_ad_unit` olarak görüldü; Google imzası geçiyordu.
Kayıtlı exact-full ve sayısal birimler desteklenir; foreign publisher suffix'i
reddedilir. Ayrılmış Google imzalı güncel panel probe'u live modda dahi200/ignored,
profil/ledger/ödül işlemi yok. Bu panel testinin ekonomik ödülden ayrılmasıdır;
gerçek oyuncuya yanlış birim, sahte imza veya eski timestamp hâlâ403 verir.

Kalıcı `com.gridshardgame.app` release APK/AAB ve imza anahtarı hazırdır;
native bölge fiyatı/tek teklif alınmadan ödeme başlamaz. **Gerçek satış/reklam ödülü
henüz açık değil.** Kullanıcı ürün/API kurmadığını doğruladı. PGS kalıcı sertifika,
Play ürün/API/RTDN, AdMob Verify/Save ve cihaz kontrolleri için tek belge:
[Kalıcı Android kurulum adımları](ANDROID_PRODUCTION_SETUP.md).
Önceki tarihli r9/r8 metinleri tarihsel durumdur, güncel tamamlanma iddiası değildir.

**AdMob panel sonucu:** Kullanıcı “Doğrulandı ve kaydedildi” dedi; gerçek Google
panel URL doğrulaması/kaydı başarılı. Bu aşama artık bloke değil; gerçek SDK
gösterimi/maç bonusu ve mağaza erişimi kontrollerinin yerine geçmez.

**Güncel kalıcı cihaz / PGS sonucu:** Mevcut v1 dahili sürüm yayımlandı; üç Play
OAuth istemcisi bağlaması kullanıcıca teyit edildi. Güncel özel sunucu yedeğinden
sonra onaylı tek-telefon geçişinde kullanıcı **Uç** oturumunun, kupa/Akı/Devre
Kredisi bakiyelerinin geri geldiğini teyit etti. Son USB envanterinde cihaz yoktu;
Play installer/imzası bağımsız okunmadı, eski yerel APK hash kontrolü tarihsel
kayıttır. Yeni yedek5/5/40/sameinstallation/SHA/TOC doğrulandı; mevcut sunucu
sağlıklı yeniden açıldı. Bu son kullanıcı teyidinde yeniden build/deploy veya
reklam/ödeme açma yapılmadı. Şimdi Play Console Kontrol panelindeki mağaza kurulum
eksikleri tamamlanır; genel yayın/AdMob hazırlık onayı ve gerçek ödül ayrıca
doğrulanır. Play ürünleri/API/RTDN henüz oluşturulmadı.

## Durum ve kapsam

**4 Ekim 2026 güncel canlı durum — r9:** Kullanıcı onayıyla imza-kodlama düzeltmesi backend'e dağıtıldı; yalnız Google SSV doğrulayıcı açıktır. `SSV_ENABLED=1`, rollout `disabled`, test listesi boş, satın alma/reklam test ödülü `0`: gerçek reklam veya oyun bonusu açılmadı. Yeni özel r9 backup3/3/39, r8 backup3/3/39 ve r7 backup3/3/31; aynı kurulum/birimler/sırlar/PGS korundu. Son canlı profil/kimlik/maç3/3/39, pending0. Yerel server **1056 geçti / 36 dış servis testi atlandı**; yeni izole PG/Redis **85/85**, imaj restart/boş-hedef restore +330 saniye, bağımsız UTF-8 imza/tamper imaj testi ve canlı +330 saniye/33 sağlık kontrolü geçti. Job success/exit0, kritik marker0; HTTPS/TLS/assetlinks ve Google production public key erişimi başarılı. İmzasız callback403 olması beklenen güvenlik davranışıdır. **Gerçek Google imzalı panel isteği henüz yeniden doğrulanmadı**; aşağıdaki eski yerel/kapalı/dağıtılmadı kayıtları kendi aşamalarına aittir. Bu işlem yeni APK gerektirmedi.

**4 Ekim panel403 düzeltmesi — r9'da canlı:** Kullanıcının tam panel görüntüsünde aşağıdaki URL ve iki probe alanı doğrudur. Eski verifier ham URL kodlu metni imza kontrolüne veriyordu; Türkçe ödül etiketiyle bu uyumsuzluk yerelde yeniden üretildi. [Google Tink referansı](https://github.com/tink-crypto/tink-java-apps/blob/main/rewardedads/src/main/java/com/google/crypto/tink/apps/rewardedads/RewardedAdsVerifier.java) ve [encoded-URL testi](https://github.com/tink-crypto/tink-java-apps/blob/main/rewardedads/src/test/java/com/google/crypto/tink/apps/rewardedads/RewardedAdsVerifierTest.java) doğrultusunda kod imza öncesi bir kez percent-decode yapar; sıra/literal `+` korunur. Yinelenen alanlar/escape edilmiş ayırıcı belirsizliği reddedilir; ret logları yalnız sabit neden kodudur, callback/kimlik/imza içermez. Ham-imza fallback veya üretimde test key güveni eklenmedi. Kullanıcı onayıyla yeni yedek/rollback/izole test kapılarından sonra r9'a aktarıldı. **Bu kesin kod uyumsuzluğu, gerçek Google isteğinin tek ret nedeni olduğuna dair henüz canlı kanıt değildir.** Aynı alanlarla paneli yeniden test etmek gerekir; 403 devam ederse yalnız redakte sabit neden koduyla araştırılmalıdır. Yeni APK gerekmez.

Panel testi (r9 backend artık hazır): mevcut birim SSV kalemi → `https://play.gridshardgame.com/ads/admob/ssv`, User ID `gridshard-ssv-probe-20261004`, Custom data `probe-no-battle-20261004`. Mevcut doğru alanları değiştirmeden URL'yi doğrula'ya tekrar basın. İki test alanını boş bırakmayın; gerçek oyuncu/maç kimliği kullanmayın. Başarılıysa doğrulanan URL'yi kullan → Kaydet. Kapalı rollout geçerli Google imzasından sonra oyuncu transaction'ına girmeden `200/ignored` verir; bu oyun ödülü/SDK test gösterimi değildir. [Google panel rehberi](https://support.google.com/admob/answer/9603226?hl=tr).

Beta.72 tur 9'da ürünler ve fiyatlar (`server/app/store_catalog.py`), tur 10'da gerçek mağaza ve reklam doğrulaması (`server/app/store_verification.py`), tur 11'de iade ve iptal bildirimleri eklendi. 3 Ekim'de Google örnek ödüllü reklamı fiziksel Android cihazında açılıp kapandı; yerel testler ve kontrollü r8 Android derlemesi tamamlandı. **Gerçek ödeme, yayıncının kendi biriminde doğrulanmış test gösterimi ve gerçek Google imzalı SSV/oyun ödülü henüz uçtan uca doğrulanmadı.** Canlı sağlayıcılar kapalıdır; aşağıdaki eski tarihli kayıtlar o aşamanın kapsamını belirtir.

| Ürün | Mağaza ürün kimliği | Fiyat | Tür |
| --- | --- | --- | --- |
| Ücretli Sezon Geçişi | `gridshard.season_pass_premium` | 199,99 TL (7 Ekim 2026'dan önce 99,99 TL) | Tüketilebilir (hak sunucuda, sezon başına) |
| Savaş Premium | `gridshard.battle_rewards_premium` | 199,99 TL (7 Ekim 2026'dan önce 99,99 TL) | Tüketilebilir (hak sunucuda, sezon başına) |
| 120 / 260 / 480 / 1.050 Akı | `gridshard.flux_120` … `gridshard.flux_1050` | 29,99 / 59,99 / 99,99 / 199,99 TL | Tüketilebilir |
| 1.000 / 2.200 / 4.000 / 9.000 Devre Kredisi | `gridshard.credits_1000` … `gridshard.credits_9000` | aynı fiyatlar | Tüketilebilir |

Bütün ürünler mağazada **tüketilebilir** kaydedilir. Sezon geçişi ve Savaş Premium'un hangi sezonda etkin olduğu sunucudaki profilde tutulur; bir sonraki sezon aynı ürün yeniden satın alınabilir.

## Güvenlik kuralları

- İstemci hiçbir zaman kendi başına ürün vermez. Sunucu makbuzu **mağazanın kendi sunucusundan** doğrular; istemcinin gönderdiği işlem kimliğine güvenilmez, kayıt doğrulanmış kimlikle tutulur.
- **Hesap bağı:** alım ödeme penceresinde oyuncu hesabına bağlanır. Sunucu mağaza görünümünde `account_token` (oyuncu kimliğinden UUID v5, `store_account_token`) yayımlar; istemci bunu `appAccountToken` olarak geçirir (Google Play'de `obfuscatedAccountId`). Sunucu mağazanın imzalı verisindeki belirteci oyuncununkiyle karşılaştırır; başka hesaba bağlı ya da bağsız makbuz `422` ("Mağaza alımı bu hesaba ait değil."). Böylece tek ödemenin makbuzu ikinci bir hesapta kullanılamaz (makbuz kayıtları oyuncu başınadır).
- Aynı sağlayıcı + doğrulanmış işlem kimliği ikinci kez ürün vermez (`purchase_receipts`). Ağ kesilirse istemci aynı makbuzu yeniden gönderir; ödeme penceresi ikinci kez açılmaz.
- **Otomatik onay kapalı** (`autoAcknowledgePurchases: false`): eklentinin varsayılanı alımı hemen onaylar; onaylanmış alımı Google iade etmez, bu yüzden kapatıldı.
- Google Play: hak kaydedildikten sonra alım sunucuda tüketilir (`purchases.products.consume`); sunucu tüketemezse istemci tüketir. Tüketilmeyen/onaylanmayan alımı Google üç gün içinde iade eder; bu yüzden reddedilen alıma (ör. sezon geçişi zaten etkin) dokunulmaz.
- App Store: işlem imzası (JWS) x5c zinciri yapılandırılmış Apple kök sertifikasına kadar doğrulanmadan kabul edilmez; iade edilmiş (`revocationDate`) işlem reddedilir. Sunucu yanıtından sonra istemci işlemi bitirir (`acknowledgePurchase`); bitmeyen işlem kuyrukta kalıp sonraki alımları engeller. Apple'da reddedilen alım kendiliğinden iade edilmez; oyuncu Apple'dan iade ister.
- **Geçici hata:** mağazaya ulaşılamıyorsa, sunucunun mağaza yetkisi reddedildiyse ya da Google ödemesi bekliyorsa (nakit vb.) uç nokta `503` döner; istemci alımı bitirmeden saklar ve yeniden gönderir. Kalıcı retler `422`.
- **Yarım kalan alım:** uygulama ödeme ile sunucu yanıtı arasında kapanırsa alım mağazada bitirilmemiş kalır. Mağaza durumu yüklenince istemci bu hesaba bağlı, bilinen ve tamamlanmış alımları (`getPurchases`) ve uygulama açıkken mağazanın bildirdiği işlemleri (`transactionUpdated`) sessizce yeniden gönderir. İşlenen alımlar cihazda `gridshard.store.processed-purchases` altında tutulur (son 100).
- Deneme sağlayıcısı (`test`) üretimde kapalıdır (`GRIDSHARD_RUNTIME_MODE=production` ya da `GRIDSHARD_PURCHASE_TEST_MODE=0`). Deneme alımları makbuzda `test: true` taşır ve arayüzde "DENEME MODU" yazar.
- Anahtar, belirteç ve makbuz içeriği loglanmaz.
- İade edilen alımın verdiği geri alınır (aşağıda "İade ve iptal"). İade edilmiş makbuz yeniden gönderilirse `422` ("Bu alım iade edilmiş.").

## Sunucu ayarı

Değişken yoksa ilgili doğrulayıcı kapalıdır ve o sağlayıcı reddedilir. Değişken verilmiş ama geçersizse sunucu açılmaz; başarı taklidi yapılmaz.

### Google Play

| Değişken | Kullanım |
| --- | --- |
| `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME` | `com.gridshardgame.app`; Play Console kaydı ve `GRIDSHARD_APP_ID` ile aynı kalıcı Android kimliği |
| `GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE` | Play Console'a bağlı hizmet hesabının JSON anahtar dosyası |
| `GRIDSHARD_GOOGLE_PLAY_AUTH_MODE` | Varsayılan `service_account`; yalnız açıkça seçilirse anahtarsız `aws_wif` |
| `GRIDSHARD_GOOGLE_PLAY_WIF_CONFIG_FILE` | `aws_wif` için doğrulanmış, özel anahtar içermeyen AWS IMDSv2 WIF yapılandırma dosyası |
| `GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` | `aws_wif` için Play'de yetkili mevcut hizmet hesabının sabitlenen e-postası |
| `GRIDSHARD_GOOGLE_PLAY_WIF_AUDIENCE` | `aws_wif` için proje **numarası**, pool ve provider içeren sabitlenen tam audience |

Hizmet hesabına Play Console → Kullanıcılar ve izinler bölümünde "Finansal verileri görüntüle" ve "Siparişleri ve abonelikleri yönet" izinleri verilir. Ürünler Play Console'da yukarıdaki kimliklerle "tek seferlik ürün" olarak açılır.

7 Ekim yerel hazırlık: kuruluş `iam.disableServiceAccountKeyCreation` politikası
JSON özel anahtarını engelliyorsa politikayı gevşetmek yerine AWS WIF desteği
seçilebilir. [Anahtarsız kurulum ve ayrı onay kapıları](GOOGLE_PLAY_AWS_WIF.md).
Yerel kod/test hazırlığı canlı ödeme bağlantısı değildir. Varsayılan kip,
mevcut sunucu/Compose/env ve Play izinleri değişmez; yeni katman kendiliğinden
uygulanmaz. `aws_wif` kipinde özel anahtar dosyası, karışık veya eksik ayarlar,
ADC/kullanıcı hesabı kaynakları ve statik AWS anahtarları kabul edilmez.

### App Store

| Değişken | Kullanım |
| --- | --- |
| `GRIDSHARD_APP_STORE_ISSUER_ID` | App Store Connect → Kullanıcılar ve Erişim → Entegrasyonlar → Uygulama İçi Satın Alma anahtarının "Issuer ID" değeri |
| `GRIDSHARD_APP_STORE_KEY_ID` | Aynı anahtarın 10 karakterlik kimliği |
| `GRIDSHARD_APP_STORE_PRIVATE_KEY_FILE` | İndirilen `.p8` (ES256/P-256) anahtarın sunucudaki yolu |
| `GRIDSHARD_APP_STORE_BUNDLE_ID` | iOS bundle ID |
| `GRIDSHARD_APP_STORE_ENVIRONMENT` | `production` (varsayılan) ya da yalnız sandbox kullanan deneme sunucusu için `sandbox`. Üretim sunucusu işlemi önce üretimde, bulunamazsa sandbox'ta arar (Apple'ın önerisi: uygulama incelemesi ve TestFlight alımları sandbox'tadır); sandbox makbuzu deneme olarak kaydedilir. |
| `GRIDSHARD_APPLE_ROOT_CA_FILES` | Apple kök sertifikalarının yolları, virgülle (ör. Apple PKI sayfasından `AppleRootCA-G3.cer`) |

Ürünler App Store Connect'te aynı kimliklerle "Tüketilebilir" olarak açılır.

### AdMob ödüllü reklam

**Güncel hesap (2 Ekim 2026):** Kullanıcı eski kuruluş AdMob hesabını yeniden kurup **bireysel** hesapla devam ettiğini bildirdi. Yeni herkese açık yayıncı satırı `google.com, pub-4974825529326987, DIRECT, f08c47fec0942fa0`; `public-site/app-ads.txt` bu satıra güncellendi. Kullanıcı yeni site paketini Cloudflare Pages'e yayımladı; gerçek `https://gridshardgame.com/app-ads.txt` adresi HTTP 200, `text/plain; charset=utf-8` ve satırın birebir eşleşmesiyle tekrar doğrulandı. Dosya yayını AdMob tarama/uygulama veya canlı reklam hazır onayı değildir.

**Android AdMob uygulama kimliği:** `ca-app-pub-4974825529326987~9642213924`, kullanıcı tarafından 2 Ekim 2026'da sağlandı. Yayıncı kimliğiyle eşleşir; uygulama/reklam birimi kimlikleri yayıncı kimliğinden türetilmez. Eski hesabın kimlikleri artık aktif kurulum için kullanılmaz. Android paket adı **`com.gridshardgame.app` değişmez**; bu AdMob hesabından farklı bir tanımlayıcıdır.

Üretim `android/` projesi henüz oluşturulmadı. Oluşturulduğunda `android/app/src/main/AndroidManifest.xml` içindeki `<application>` alanına aşağıdaki metadata eklenip gerçek paket içinde doğrulanmalı. Burada kayıt altına alınması manifest/SDK veya canlı reklam yapılandırmasının tamamlandığı anlamına gelmez. Yerel debug/test için Google'ın test kimlikleri ve test reklamları kullanılmalıdır.

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-4974825529326987~9642213924" />
```

**Android normal ödüllü reklam birimi:** `ca-app-pub-4974825529326987/6776291719`. Kullanıcı 2 Ekim 2026'da kimliği ve **ödüllü reklam** türünü bildirdi; yeni yayıncı kimliğiyle eşleşir. Yeni birim `.env.example` içine kaydedildi; iOS birimi boş, `GRIDSHARD_ADMOB_SSV_ENABLED=0` kalır. Gerçek `.env`, SDK/native proje veya Google panelleri değiştirilmedi. Panel kaydı/kimlik, gerçek reklam gösterimi veya uygulama hazır onayı değildir.

Yeni uygulama ve ödüllü birimi tekrar oluşturma. **Ödüllü geçiş** birimi yerine normal ödüllü biçim kullanılmalı. Önerilen tanınabilir ad `Android_SavasSonu_Odullu`, ödül miktarı `1`, öğesi `Savaş ödülü artırımı`. Bu miktar bir doğrulanmış izleme hakkını temsil eder; oyun ödül tutarı sunucudaki savaş kaydından hesaplanır, AdMob panelindeki etiketten bakiye eklenmez. Gerçek HTTPS oyun API'si hazır olmadan SSV adresine tanıtım sitesini veya örnek adresi yazma; UMP/onay, test cihazı ve sunucu doğrulaması tamamlanmadan canlı reklam açılmamalı.

Kaynaklar: [Google Android SDK uygulama kimliği](https://developers.google.com/admob/android/quick-start), [AdMob ödüllü reklam birimi oluşturma](https://support.google.com/admob/answer/7311747?hl=tr).

#### UMP ve erken reklam kapatma (3 Ekim 2026, yerel devam)

`native-store.js` sunucunun AdMob sağlayıcısı açıkken yeni uygulama açılışında UMP bilgisini sorgular. Açılış sorgusu oyun yüklemesini veya reklam SDK başlatılmasını bekletmez; reklam gösterimi öncesi SDK'nın `canRequestAds` sonucu **gerçek boolean true** olmalıdır. Rıza uygulamanın kendi localStorage bayrağından çıkarılmaz. Sorgu hatası bu uygulamada reklamı kapalı bırakır, normal oyun devam eder. `canRequestAds` kişiselleştirilmiş reklama rıza anlamına gelmez. Aşağıdaki çocuk/yaşı bilinmeyen korumasında beklenmeyen `REQUIRED` sonucu form açmak yerine reklamı engeller. [Resmî UMP rehberi](https://developers.google.com/admob/android/privacy).

UMP gerekli diyorsa **Ayarlar > Hesap ve Gizlilik > Reklam Gizlilik Tercihleri** görünür. Bu seçim analitik izninden ayrıdır. Formdan sonra UMP yeniden sorgulanır; hata eski yetkiyle reklam başlatmaz. Tek işlem kilidi ve arka plan yenileme koruması form/ödüllü gösterim yarışını engeller.

Yüklü `@capacitor-community/admob` 8.1.0 uygulamasında ödül kazanılmadan kapama/gösterim hatası, ödül promise'ini sonuçlandırmayabilir. Köprü gösterimden önce ödül, kapama ve gösterim-hatası dinleyicileri kurar; bitişte temizler. Erken kapama ve hata kilidi serbest bırakır ve ödül istemez. Ödül kazanılsa da reklam kapanmadan oyun ödül çağrısı yapılmaz; istemci olayı SSV yerine geçmez.

Panel kurulumu mevcut GRIDSHARD uygulamasını/reklam birimini kullanır; yeniden oluşturulmaz. Mesaj adı için `GRIDSHARD Reklam Gizlilik Onayı`, Türkçe/İngilizce önizleme, görünür reddetme seçeneği ve gizlilik URL'si `https://gridshardgame.com/privacy/` gözden geçirilir. Hedefleme açık bir panel seçimidir; yalnız GDPR ülkeleri seçilmişse Türkiye cihazında otomatik form çıkacağı varsayılmaz. Test coğrafyası yalnız kayıtlı debug test cihazında kullanılır, yayın koduna taşınmaz. [Google mesaj oluşturma adımları](https://support.google.com/admob/answer/10113207?hl=tr).

**Mesaj/test cihazı teyidi (3 Ekim):** Kullanıcının panel ekranında `GRIDSHARD Reklam Gizlilik Onayı` mevcut GRIDSHARD uygulamasına bağlı, Türkçe +1 dil ve **Yayınlandı** durumundadır. Reddetme düğmesi masaüstü/dikey önizlemede görünür. Kullanıcı daha sonra AdMob test cihazı kaydını tamamladığını bildirdi; AAID depoya/sohbete aktarılmadı. Bu, gerçek cihazda form gösterimi veya canlı reklam hazır onayı değildir. [Google test cihazı kurulumu](https://support.google.com/admob/answer/9691433?hl=tr).

#### Çocukları da kapsayan kitle — korumalı yerel hazırlık

Kullanıcı oyunun genel kitleye yönelik olduğunu, çocukların daha çok oynayabileceğini bildirdi. Yetişkin-only kabulü yapılmaz. İncelenmiş tarafsız yaş akışı olmadığı için mevcut **yerel** köprü bütün reklam isteklerini çocuk/yaşı bilinmeyen korumasında tutar; yaş/doğum tarihi toplamaz veya Play Games bağlantısından yaş çıkarmaya çalışmaz:

- UMP sorgusu: `tagForUnderAgeOfConsent:true`. Bu sinyal UMP'den reklam SDK'sına otomatik aktarılmaz. Bu durumda Google onay formu istemeyebilir; form çıkmaması tek başına bozuk UMP kanıtı değildir. Beklenmeyen `REQUIRED`, önceki `canRequestAds:true` ile dahi reklam açmaz. [Google UMP yaş etiketi](https://developers.google.com/admob/android/privacy/gdpr).
- Reklam SDK başlatma: `tagForChildDirectedTreatment:true`, `maxAdContentRating:"General"` (G). Yüklü AdMob 8.1.0 Android/iOS kodunda yapılandırma `MobileAds.initialize/start` öncesindedir. Reklam SDK çağrısında eski TFCD ve TFUA aynı anda true yapılmaz; UMP'deki TFUA ayrı çağrıdır. Her ödüllü istekte ayrıca `npa:true` kullanılır. Güncel Google rehberindeki yeni `ageRestrictedTreatment` API'si bu eklentinin public seçeneklerinde bulunmaz; desteklenmeyen seçenek gönderilmedi, mevcut legacy çocuk etiketi kullanıldı. [Google hedefleme/yaş/içerik rehberi](https://developers.google.com/admob/android/targeting).
- Bu seçenekler tek başına Families uyumluluk onayı değildir. Karma kitle için tarafsız yaş akışı, Play Console gerçek hedef yaş grupları, SDK sürümü/manifest izinleri ve başlatma ölçümü, sosyal/PGS/veri paylaşımı, gizlilik metni ve veri güvenliği beyanları **genel yayın kapısı** olarak ayrıca incelenmelidir. [Google Play Families politikası](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en), [sertifikalı SDK listesi](https://support.google.com/googleplay/android-developer/answer/12955712?hl=en-GB).

Çocuk etiketi Android reklam kimliğinin iletimini engeller. Bu nedenle panelde AAID ile kayıt yapılmış olmasından kendi reklam biriminin mutlaka test modunda olacağı çıkarılmaz. Kontrollü cihaz/SDK test doğrulaması olmadan kendi birimine istek yapılmaz. İlk güvenli cihaz denemesinde Google demo ödüllü birimi kullanılabilir, fakat demo birimi yayıncının SSV uç noktasına bağlı değildir ve **gerçek oyun ödülü/SSV başarı kanıtı sayılmaz**. [Google test reklam rehberi](https://developers.google.com/admob/android/test-ads).

Canlı sunucu SSV/AdMob sağlayıcısı kapalı kalır. Eski r7 APK bu yeni UMP/çocuk korumasını taşımadığından, sağlayıcıyı herkese açmak eski istemcileri de etkiler; cihaz testi ve eski istemciyi engelleyen kontrollü açma kapısı kurulmadan global etkinleştirme yapılmaz. Mevcut APK/signer/profil korunur; kaldırıp kurma veya veri temizleme yapılmaz.

**Açık yayın kapıları:** Gerçek AdMob uygulama kimliğiyle UMP cihaz testi, test cihazı/test reklam işaretleri, hedef kitle/çocuk ayarları ve imzalı SSV ödül tekliği. Güncel r7 debug APK örnek Google uygulama kimliğini kullanır; yalnız panel kaydı bu paketi gerçek UMP mesajına bağlamaz. Üretim sağlayıcısı/SSV bu yerel değişiklikle açılmadı, yeni APK üretilmedi. Kamuya açık gizlilik metnindeki yayın öncesi sağlayıcı/saklama bilgileri de genel yayın öncesi tamamlanmalıdır.

#### USB cihaz denemesi — Google demo birimi (3 Ekim 2026)

Fiziksel r7 Android cihazında, uygulamanın kendi debug WebView'ına yalnız bu oturum için eklenen düğmeyle son yerel köprü RAM içinde denendi. Reklam ancak kullanıcının dokunuşuyla açıldı. Google demo ödüllü ID'si, `isTesting:true`, `npa:true` zorlandı; SSV bilgisi gerçek native isteğe gönderilmedi ve oyun ödül uç noktası çağrılmadı. UMP'ye `tagForUnderAgeOfConsent:true` gönderildi; sonuç `NOT_REQUIRED / canRequestAds:true`, gizlilik tercih gereksinimi `NOT_REQUIRED` oldu. SDK çocuk/G yapılandırmasından sonra demo birimini yükledi. Gösterim, kazanım ve kapama olayları alındı; sonunda dinleyici sayısı sıfır ve reklam işlem kilidi serbestti. Kullanıcı reklamın açılıp kapandığını teyit etti. Geçici test düğmesi/durum nesnesi ve ADB portları temizlendi; APK kurulmadı veya hesap verisi değiştirilmedi.

Bu deneme native SDK gösterimi ve köprünün kazanım/kapama temizliğini doğrular; r7'ye yeni kaynakların kalıcı kurulumu, yayıncının UMP mesajı, kendi biriminde test cihazı güvenliği veya imzalı SSV/gerçek ek ödül doğrulaması değildir. Çocuk etiketiyle `NOT_REQUIRED` görülmesi yetişkin rızası olarak yorumlanmaz. Fiziksel erken kapama henüz denenmedi; offline demo helper testleri **6/6** ile erken kapama/UMP engeli/yanlış birim/vazgeçme ve kullanıcı dokunuşu öncesi sıfır SDK isteğini kapsar. Kontrollü yeni native paket ve eski istemci reklam kapısı olmadan üretim sağlayıcısı açılmaz.

| Değişken | Kullanım |
| --- | --- |
| `GRIDSHARD_ADMOB_SSV_ENABLED` | `1` ile sunucu doğrulamasını açar |
| `GRIDSHARD_ADMOB_ROLLOUT_MODE` | Varsayılan `disabled`; doğrulayıcının açılması tek başına istemcide reklam açmaz. `test` yalnız açık izin listesini, `live` genel yayın kapısını seçer. |
| `GRIDSHARD_ADMOB_TEST_PLAYER_IDS` | Yalnız `test` modunda gerekli, virgülle ayrılmış özel oyuncu izin listesi; istemciye yayımlanmaz. Diğer modlarda dolu olması veya test modunda boş olması başlangıcı reddeder. |
| `GRIDSHARD_ADMOB_REWARDED_AD_UNIT_ANDROID` | `ca-app-pub-4974825529326987/6776291719`; yeni bireysel hesabın Android normal ödüllü reklam birimi |
| `GRIDSHARD_ADMOB_REWARDED_AD_UNIT_IOS` | iOS ödüllü reklam birimi |

### Kontrollü açma kapısı ve r8 (3 Ekim)

Sunucu `/store/{player_id}` ve satın alma dönüşünde yalnız o istekteki `ad_protocol=child-safe-v1&ad_platform=android|ios` beyanını kabul eder. Sağlayıcı, platform birimi ve açma politikası uygun değilse reklam birimi/`ad_policy` verilmez. Beyan kaydedilmez; eski APK'nın normal isteği kapalı kalır. **Bu protokol cihaz doğrulaması veya onay kanıtı değildir**; kimlik doğrulama, native UMP/yaş koruması ve Google imzalı SSV ayrı kapılardır. AdMob ödül talebi aynı beyanı ve platformu gerektirir. Satın alma doğrulayıcıları bundan bağımsızdır.

Android `GridshardAdSafety` testte debug paketini, aynı yayıncı app/birim kimliğini ve SDK test cihazı yapılandırmasını doğrular. SDK `AdRequest.isTestDevice` sonucu yüklemeden önce true olmalıdır; yüklenen birim de beklenen kimlikle karşılaştırılır. Yalnız panel AAID kaydı yeterli sayılmaz. Debug/`ump-only` paket, sunucunun `live` yanıtında dahi kendi birimini yükleyemez. Üretim native `live` yetkilendirmesini şu an hiçbir build helper üretmez; genel yayın ayrıca incelenmelidir. [Google test cihazı rehberi](https://developers.google.com/admob/android/test-ads).

r8 app ID'si yayıncı kimliğidir; SDK test cihazı özeti mevcut hedef uygulama Ads logunda bulunamadığı için yapılandırma **`ump-only`**, cihaz listesi boştur. Native ölçüm başlangıcı ertelenir; `AD_ID` ve üç AdServices izni birleşik manifestten ve binary APK'dan çıkarılmıştır. Reklam/SSV üretimde kapalı olduğu için r8 kurulunca otomatik olarak onay formu veya reklam beklenmez. r7/signer/profil korunur; uygulama kaldırılmaz veya verisi silinmez.

**4 Ekim fiziksel r8 sorgusu:** Kullanıcı oyunu açtı; USB yalnız kendi hazır debug uygulamasında native canlı/test kapıları beklenen hatalarla reddetti. Ardından tek çocuk/unknown UMP sorgusu `NOT_REQUIRED / canRequestAds:true / isConsentFormAvailable:false / privacyOptionsRequirementStatus:NOT_REQUIRED` döndü. Reklam SDK initialize/load/show, form gösterimi/reset, hesap/maç API'si veya uygulama storage erişimi yapılmadı. Geçici RAM probe'u ve kendi ADB forward'ları temizlendi; oyun settings/ready kaldı. Bu, yayıncının mesajının görünmesi/gerçek ödül/çocuk politikası uygunluk kanıtı değildir. Offline helper testleri **4/4** geçti; APK yeniden üretilmedi. Canlı salt-okunur audit sağlıklı ve SSV/AdMob kapalı; yeni backend dağıtımı/kısa bakım için kullanıcı onayı beklenir.

Test modundaki maç sonu UI açıkça **test reklamı / gerçek ek ödül yok** der ve başarılı gösterimden sonra gerçek ödül talebine geçmez. Test reklamı, Google imzalı SSV ödül doğrulamasının yerine geçmez. Yüklü eklentinin rehberine göre test reklamları SSV uç noktasını çağırmaz; SDK gösterimi ve AdMob panelinin imzalı adres doğrulaması ayrı testlerdir. [Eklentinin ödüllü reklam rehberi](https://github.com/capacitor-community/admob/blob/main/docs/rewarded.md), [Google SSV rehberi](https://developers.google.com/admob/android/ssv).

Son yerel sonuçlar: istemci **154/154**, sunucu **1039 geçti / 36 atlandı**, build fixture **9/9**. SSV imza/tekrar/tek ödül testleri yerel ECDSA fixture'ıdır, gerçek Google callback denemesi değildir. Yeni backend kaynağı canlıya dağıtılmadı; reklam açma değişkenleri değiştirilmedi.

### Panel adres doğrulaması — henüz yapılandırılmadı

Kullanıcının `221445` ekranında mevcut normal ödüllü birim ve **“Geri çağırma URL'si verilmedi”** görüldü. Mevcut birim yeniden oluşturulmaz. Planlanan adres `https://play.gridshardgame.com/ads/admob/ssv`; yeni sunucu kapısı kontrollü dağıtılıp doğrulayıcı hazır olmadan panelde kaydedilmez. İmza doğrulayıcı açık, rollout `disabled` tutulduğunda Google imzası denetlenebilir fakat hiçbir oyuncu izlemesi/ödülü kaydedilmez. Panel denemesinde gerçek hesap veya maç yerine ayrı, var olmayan probe kimlikleri kullanılır. `Verify URL` başarılı olunca `Use verified URL` ve `Save` uygulanır; unsigned mock callback kabul edilmez. [Google panel kurulum adımları](https://support.google.com/admob/answer/9603226).

Üretim kapıları ayrıca tamamlandıktan sonra gerçek ödüllü reklam akışı:

1. Oyuncu savaş sonunda "REKLAM İZLE · x2"ye dokunur; istemci reklamı SSV seçenekleriyle açar (`userId` = oyuncu kimliği, `customData` = savaş kimliği).
2. Reklam ödülü verince AdMob sunucuya imzalı geri çağrı gönderir. Sunucu ECDSA imzasını Google'ın yayımladığı anahtarlarla (`verifier-keys.json`) doğrular, reklam birimini ve zaman damgasını (en çok 1 saat) denetler ve izlemeyi oyuncunun profiline kaydeder (`verified_ad_views`, işlem kimliğiyle tekil).
3. İstemci ödülü ister; sunucu yalnız bu savaş için doğrulanmış ve kullanılmamış bir izleme varsa ödülü verir. Geri çağrı birkaç saniye gecikebildiği için istemci talebi kısa aralıklarla yineler.

Doğrulayıcı açıkken geçerli imzalı panel isteği, kapalı rollout veya tanınmayan oyuncu kayıt oluşturmadan `200` alır. İmzasız/geçersiz callback `403`, henüz kapalı doğrulayıcı `404` döner; sırf adres doğrulaması için bu kontroller gevşetilmez.

## İade ve iptal

Doğrulanan her gerçek alım sunucudaki **makbuz defterine** yazılır (platform deposu, `store_receipts`): makbuzun sahibi olan oyuncu, ürün ve verdiği (para birimi miktarı ya da etkin sezon). Satın alma belirteci yalnız SHA-256 özetiyle saklanır. Defter oyuncu kaydından bağımsızdır; oyuncu kaydındaki eski makbuz düşse bile iade doğru oyuncudan geri alınır ve aynı makbuz ikinci kez ürün vermez. Hesap silinince oyuncunun defter kayıtları da silinir.

30 Eylül geçiş durumu: bu paragraftaki **canlı** defter hâlâ `PlatformService` JSON deposudur. PostgreSQL `004_store_ledger.sql` ve `PostgresStoreLedgerRepository` izole testten geçti, fakat henüz satın alma/iade yoluna bağlanmadı. Makbuz ile oyuncu bakiyesi tek transaction içinde güncellenip eski kayıtlar denetimli taşınmadan kaynak değiştirilmeyecek.

Geri alma kuralları (`revoke_purchase`):

| Ürün | İade edilince |
| --- | --- |
| Akı / Devre Kredisi paketi | Verilen miktarın tamamı düşülür. Harcanmışsa bakiye **eksiye** iner; oyuncu yeniden kazanana kadar o para birimiyle hiçbir şey alamaz (sunucudaki bütün harcama denetimleri bakiyeyi karşılaştırır). |
| Ücretli Sezon Geçişi / Savaş Premium | Yalnız iade edilen sezon hâlâ sürüyorsa kapatılır. Önceden alınmış premium ödüller geri alınmaz. |

Oyuncunun gelen kutusuna "Alım iade edildi" bildirimi düşer. App Store'da iade geri çevrilirse (`REFUND_REVERSED`) geri alınan yeniden verilir. Aynı bildirim yeniden gelse de değişiklik bir kez uygulanır (bildirim kimliği ve defterdeki iade durumu).

### Google Play gerçek zamanlı geliştirici bildirimleri (RTDN)

| Değişken | Kullanım |
| --- | --- |
| `GRIDSHARD_GOOGLE_RTDN_AUDIENCE` | Pub/Sub itme aboneliğinin kimlik doğrulama "hedef kitlesi" (ör. `https://<api-adresi>/billing/google/rtdn`) |
| `GRIDSHARD_GOOGLE_RTDN_SERVICE_ACCOUNT` | İtme aboneliğinin belirteç ürettiği hizmet hesabı e-postası |

Kurulum:
1. Google Cloud'da bir Pub/Sub konusu açın; konuya `google-play-developer-notifications@system.gserviceaccount.com` için "Pub/Sub Publisher" rolü verin.
2. Play Console → Uygulama → Para kazanma kurulumu → "Gerçek zamanlı geliştirici bildirimleri" alanına konunun tam adını yazın ve "Test bildirimi gönder" ile deneyin (sunucu `200` ve `ignored: test` döner).
3. Konuya **itme** aboneliği açın: uç nokta `https://<api-adresi>/billing/google/rtdn`, **kimlik doğrulamayı etkinleştir** (hizmet hesabı = `GRIDSHARD_GOOGLE_RTDN_SERVICE_ACCOUNT`, hedef kitle = `GRIDSHARD_GOOGLE_RTDN_AUDIENCE`).

Sunucu isteğin OIDC belirtecini Google anahtarlarıyla (RS256) doğrular ve hedef kitle, hizmet hesabı, `email_verified`, süre ve yayımcıyı denetler; paket adı `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME` ile eşleşmelidir. Yalnız `voidedPurchaseNotification` (iade/ters ibraz) işlenir; test, tek seferlik alım ve abonelik bildirimleri onaylanıp geçilir. Belirteç geçersizse `403` (Pub/Sub yeniden dener).

### App Store Server Notifications V2

App Store Connect → Uygulama → App Bilgileri → "App Store Sunucu Bildirimleri" alanlarına (üretim ve sandbox) `https://<api-adresi>/billing/app-store/notifications` yazılır, sürüm **Version 2**. Ek değişken gerekmez; App Store doğrulayıcısının değişkenleri (yukarıda) kullanılır.

Sunucu `signedPayload` imzasını ve içindeki işlemi Apple kök sertifikasına kadar doğrular. `REFUND` geri alır, `REFUND_REVERSED` yeniden verir; diğer türler (ör. `CONSUMPTION_REQUEST`, `TEST`) onaylanıp geçilir. Başka uygulamaya ait ya da sunucunun kabul etmediği ortamdaki bildirim `200` ve `ignored` ile onaylanır; imza geçersizse `403` (Apple yeniden dener).

### İade mutabakatı (yedek denetim)

Bildirim teslimi uzun süre kesilirse sunucu Google Play Voided Purchases API'den tek seferlik iptal/iade kayıtlarını, App Store Get Notification History'den `REFUND` ve `REFUND_REVERSED` kayıtlarını düzenli okur. Google hizmet hesabının finansal veri görüntüleme izni gerekir. Apple kayıtları canlı bildirimle aynı sertifika zincirinden doğrulanır; doğrulanamayan kayıtta kontrol noktası ilerlemez.

Her sağlayıcının başarılı tarama kontrol noktası platform durumunda tutulur. Pencere 6 saat örtüşür; ilk koşu ve uzun kesintide en çok 29 gün geriye bakılır. Makbuzun oyuncu ödülüyle değişimi hedefin PostgreSQL ortak işlem sınırında gerçekleşir; eski tarihli Apple bildirimi daha yeni iade iptalini geri alamaz. Mağaza hatası, eşleşmeyen makbuz veya işlenemeyen kayıt olursa aynı pencere sonraki koşuda tekrar denenir. `GRIDSHARD_STORE_RECONCILE_INTERVAL_SECONDS` varsayılan 1800 saniyedir; en az 300, `0` kapatır. İlk koşu açılıştan yaklaşık bir dakika sonradır. `/health` içinde yalnız son koşu zamanı/başarı durumu görünür, hata ayrıntısı logdadır. Gerçek mağaza hesabıyla uçtan uca doğrulama yapılmadan bu akış yayın hazır sayılmaz.

## İstemci ayarı

Köprü `client/src/native-store.js` dosyasındadır; eklentileri çalışma anında arar. Eklenti yoksa ya da sunucuda ilgili doğrulayıcı kapalıysa gerçek mağaza/reklam kullanılmaz (web'de her zaman böyledir).

Eklentiler (API'si bu sürümlere göre doğrulandı; ikisi de Capacitor 8 ister):

```powershell
pnpm add @capgo/native-purchases@8.8.1 @capacitor-community/admob@8.1.0
pnpm mobile:sync:android
pnpm mobile:sync:ios
```

`pnpm` yoksa (PowerShell "pnpm is not recognized" der) proje sürümü bir kez kurulur: `npm install -g pnpm@11.19.0` (kullanıcı npm klasörüne kurulur, yönetici izni gerekmez). Kurmadan tek seferlik: `npx pnpm@11.19.0 add …`.

- AdMob uygulama kimlikleri Android `AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`) ve iOS `Info.plist` (`GADApplicationIdentifier`) dosyalarına yazılır.
- Eklentilerin sürümleri kilit dosyasına işlendikten sonra `native-store.js` içindeki çağrı biçimleri (satın alma sonucu ve SSV seçenekleri) gerçek cihazda doğrulanmalıdır; bu tur yalnız statik olarak yazıldı.

## Yayın öncesi kontrol listesi

1. Üretim sunucusunda `GRIDSHARD_PURCHASE_TEST_MODE` ve `GRIDSHARD_AD_TEST_MODE` açık değil.
2. Google Play: lisans test hesabıyla her ürün alınır; makbuzda `environment: test`, ürün bir kez verilir, alım tüketilir.
3. App Store: Sandbox hesabıyla (`GRIDSHARD_APP_STORE_ENVIRONMENT=sandbox`) aynı kontrol; üretime geçerken `production`.
4. AdMob: Google demo birimi ve yayıncının SDK test reklamı yalnız güvenli gösterim/erken kapama denemesidir, yayıncının SSV kanıtı değildir. Kendi birimine SDK isteği yalnız doğrulanmış test cihazında yapılır. İmzalı adres testi AdMob panelinden ayrı probe kimlikleriyle yapılır; gerçek oyun ödülü ise ayrıca yetkilendirilmiş üretim akışında imzalı geri çağrıdan sonra verilir, aynı savaş için ikinci ödül verilmez.
5. İade bildirimleri: Play Console'dan test bildirimi `200` alır; lisans test hesabıyla alınıp Play Console'dan iade edilen paketin miktarı oyuncudan düşer. App Store'da sandbox alımı iade edilince (`REFUND`) aynı kontrol.
