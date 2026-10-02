# Gerçek para alımı ve ödüllü reklam

## Durum ve kapsam

Beta.72 tur 9'da ürünler ve fiyatlar (`server/app/store_catalog.py`), tur 10'da gerçek mağaza ve reklam doğrulaması (`server/app/store_verification.py`), tur 11'de iade ve iptal bildirimleri eklendi. **Gerçek ödeme ve gerçek reklam henüz hiçbir cihazda denenmedi.** Test, sunucu ve mobil proje üretimi çalıştırılmadı (kullanıcı kararı); doğrulama statiktir.

| Ürün | Mağaza ürün kimliği | Fiyat | Tür |
| --- | --- | --- | --- |
| Ücretli Sezon Geçişi | `gridshard.season_pass_premium` | 99,99 TL | Tüketilebilir (hak sunucuda, sezon başına) |
| Savaş Premium | `gridshard.battle_rewards_premium` | 99,99 TL | Tüketilebilir (hak sunucuda, sezon başına) |
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

Hizmet hesabına Play Console → Kullanıcılar ve izinler bölümünde "Finansal verileri görüntüle" ve "Siparişleri ve abonelikleri yönet" izinleri verilir. Ürünler Play Console'da yukarıdaki kimliklerle "tek seferlik ürün" olarak açılır.

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

| Değişken | Kullanım |
| --- | --- |
| `GRIDSHARD_ADMOB_SSV_ENABLED` | `1` ile sunucu doğrulamasını açar |
| `GRIDSHARD_ADMOB_REWARDED_AD_UNIT_ANDROID` | `ca-app-pub-4974825529326987/6776291719`; yeni bireysel hesabın Android normal ödüllü reklam birimi |
| `GRIDSHARD_ADMOB_REWARDED_AD_UNIT_IOS` | iOS ödüllü reklam birimi |

AdMob'da reklam biriminin "Sunucu tarafı doğrulama" ayarına `https://<api-adresi>/ads/admob/ssv` yazılır. Akış:

1. Oyuncu savaş sonunda "REKLAM İZLE · x2"ye dokunur; istemci reklamı SSV seçenekleriyle açar (`userId` = oyuncu kimliği, `customData` = savaş kimliği).
2. Reklam ödülü verince AdMob sunucuya imzalı geri çağrı gönderir. Sunucu ECDSA imzasını Google'ın yayımladığı anahtarlarla (`verifier-keys.json`) doğrular, reklam birimini ve zaman damgasını (en çok 1 saat) denetler ve izlemeyi oyuncunun profiline kaydeder (`verified_ad_views`, işlem kimliğiyle tekil).
3. İstemci ödülü ister; sunucu yalnız bu savaş için doğrulanmış ve kullanılmamış bir izleme varsa ödülü verir. Geri çağrı birkaç saniye gecikebildiği için istemci talebi kısa aralıklarla yineler.

AdMob konsolunun adres doğrulama isteği ve tanınmayan oyuncu kimlikleri kayıt oluşturmadan `200` alır.

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
4. AdMob: test reklam birimiyle ödül yalnız SSV geri çağrısından sonra verilir; aynı savaş için ikinci ödül verilmez.
5. İade bildirimleri: Play Console'dan test bildirimi `200` alır; lisans test hesabıyla alınıp Play Console'dan iade edilen paketin miktarı oyuncudan düşer. App Store'da sandbox alımı iade edilince (`REFUND`) aynı kontrol.
