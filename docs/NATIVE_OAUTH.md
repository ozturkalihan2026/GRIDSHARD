# GRIDSHARD — Google/Apple hesabı ve Android uygulamaya dönüş

Durum: 3 Ekim 2026. Android/web giriş köprüsü kodlandı; **sağlayıcı kurulumu, uzak dağıtım ve fiziksel giriş testi henüz tamamlanmadı**. Yalnız yeni APK kurmak eski sunucudaki eksik yapılandırmayı gidermez. Bu tur ücretli üyelik/plan, DNS, Elastic IP veya canlı sunucu değişikliği yapılmadı.

## Kod tarafındaki akış

- Android, Google/Apple ekranını WebView içinde değil sistem tarayıcısında/Custom Tabs'te açar. App eklentisi sıcak/soğuk bağlantı dönüşünü dinler. Mevcut geri düğmesi, üst kamera boşluğu, alt kenar tam ekran ve ses yaşam döngüsü korunur. [Google gömülü tarayıcı politikası](https://developers.google.com/identity/protocols/oauth2/policies), [Capacitor Browser](https://capacitorjs.com/docs/apis/browser), [Capacitor App](https://capacitorjs.com/docs/apis/app).
- Yalnız sabit HTTPS kökeni/tam yolu: `com.gridshardgame.app` → `/native-auth/android`; `com.gridshard.remotedebug` → `/native-auth/android-test`. LAN debug'da filtre yok. `/.well-known/assetlinks.json` yalnız yapılandırılan public sertifika özetlerini yayımlar.
- Rastgele 256 bit doğrulayıcı uygulamadan çıkmadan SecureStorage'a yazılıp geri okunur. Web aynı korumayı tab'a özgü `sessionStorage` ile sağlar; kalıcı `localStorage` kopyası yoktur. Sunucu yalnız S256 özetini saklar. Bu **bizim callback→cihaz oturumu değişimimizin** korumasıdır; upstream Google isteğine PKCE eklenmiş olduğu iddiası değildir.
- Hedef/sağlayıcı/handoff/süre doğrulanır; exchange beş dakika geçerli ve tek kullanımlıktır. Yanlış doğrulayıcı gerçek kodu tüketmez. URL'den bearer token/oyuncu ID'si kabul edilmez; hesabı sunucu seçer. `link` başka sahibin sağlayıcısını alamaz; `login` mevcut sahibi getirir. Web dönüş parametreleri API isteğinden önce temizlenir; sahte bağlantı normal misafir açılışını engellemez.
- Apple token imzası, issuer/audience, süre ve nonce doğrulanır; private key P-256/ES256 olmalıdır. Client secret `_FILE` ile okunur; inline+file çakışması güvenli hata verir.
- **iOS native giriş etkinleştirilmedi**; Universal Links entitlement/associated-domain ve iPhone gerçek cihaz kapısı ayrıca gereklidir. Services ID hazır olduğunda Apple hesabıyla Android/web giriş denenebilir.

## Google Cloud — operatör adımı

OAuth uygulamasının marka/destek/gizlilik bilgilerini ve dış kullanıcı test modunu hazırlayın; denenecek Google hesaplarını test kullanıcılarına ekleyin. Uygulamanın yayın/doğrulama şartlarını panelden kontrol edin. Yalnız `openid email profile` kullanılır; Gmail okuma veya Play ödeme erişimi istenmez.

Credentials/Clients bölümünde **Web application** istemcisi oluşturun. Bu sunuculu authorization-code akışıdır; APK var diye Android tipinde client ID kullanmayın. Yetkili origin gerekiyorsa `https://play.gridshardgame.com`; redirect tam olarak `https://play.gridshardgame.com/oauth/google/callback` olmalı, sonuna `/` eklenmemelidir.

Client ID public'tir. Client secret/indirilen credential JSON yalnız proje dışındaki korumalı dosyaya kaydedilir; sohbet/Git/APK/web kökü/komut satırına yazılmaz. [Google web-server OAuth kurulumu](https://developers.google.com/identity/protocols/oauth2/web-server).

## Apple Developer — operatör adımı

Sign in with Apple etkin primary App ID gerekir. Certificates, Identifiers & Profiles → Identifiers bölümünde **Services ID** oluşturun; Sign in with Apple yapılandırmasını primary App ID ile eşleştirin. Domain `play.gridshardgame.com`, Return URL `https://play.gridshardgame.com/oauth/apple/callback`. Backend client ID'si bu Services ID'dir.

Team ID, Key ID ve Sign in with Apple `.p8` anahtarı gerekir. Private key yalnız korumalı dış sunucu dosyasında tutulur. Hesap/üyelik yetkisi yoksa bu kapı açık kalır; ücretli kayıt kullanıcı kararı olmadan yapılmaz. [Apple web hesabı kurulumu](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/), [özel anahtar oluşturma](https://developer.apple.com/help/account/keys/create-a-private-key/).

## Sunucudaki dış dosyalar ve Compose katmanları

Önce sağlayıcı kayıtları, sonra [sunucu runbook'u](SERVER_PRODUCTION_RUNBOOK.md) ile yedek/rollback korunarak kontrollü dağıtım. **Aşağıdaki işlemler canlı sunucuda henüz uygulanmadı.**

`GRIDSHARD_SECRETS_DIR` dış dizinindeki Google dosyası `google_oauth_client_secret` yalnız secret değeridir; credential JSON'un tamamı değildir. Apple dosyası `apple_oauth_private_key.p8` asıl private key'dir. Dosyalar UID/GID `10001:10001`, izin `0600`; dış dizin root/`0700` olmalı. Compose salt okunur bağlar. İçerikleri çıktılamayın; eski auth/database/TLS sırlarını değiştirmeyin.

Public deployment değişkenleri: Google `GRIDSHARD_GOOGLE_OAUTH_CLIENT_ID`; Apple `GRIDSHARD_APPLE_OAUTH_CLIENT_ID`, `GRIDSHARD_APPLE_OAUTH_TEAM_ID`, `GRIDSHARD_APPLE_OAUTH_KEY_ID`. Inline client secret/private key kullanmayın. Örneğin yalnız Google hazırsa:

```sh
docker compose -p gridshard-production \
  -f docker-compose.production.yml -f docker-compose.cloudflare.yml \
  -f docker-compose.oauth-google.yml config --quiet
```

Apple hazırsa `-f docker-compose.oauth-apple.yml` eklenir; hazır olmayan sağlayıcının katmanı eklenmez. Katmanlar API secret listesini genişletir; mevcut database/auth/Caddy sırları korunur. Önce birleşmiş yapılandırma/mount'lar doğrulanır, kontrollü yedek alınır, güncel release build ve gerekli servis yeniden oluşturması yapılır. `down -v`, veri sıfırlama veya eski hesap aktarımı gerekmez. Bu tur yalnız statik katman sözleşmesi test edildi; gerçek Compose/Docker birleşimi ve uzak dağıtım ayrıca doğrulanmalı.

## Android App Links

`GRIDSHARD_ANDROID_TEST_AUTH_CERT_SHA256` uzak test APK imzasının public SHA-256'sıdır. R3/r4 aynı sertifikayı taşır:

`94:2E:C0:1A:BB:22:D1:36:74:4A:C0:10:3C:8D:56:6F:93:16:B8:31:D1:AB:6B:00:2B:F2:E5:99:F9:A3:6A:96`

Mağaza için ayrı `GRIDSHARD_ANDROID_AUTH_CERT_SHA256`, **Play App Signing** sertifikasını kullanır; upload key/debug sertifikası değil. Birden fazla public özet virgülle ayrılabilir; private signing key istenmez.

`https://play.gridshardgame.com/.well-known/assetlinks.json` 200/application-json ve doğru paket/sertifikayı vermeli; login/Cloudflare challenge/başka hosta redirect istememelidir. Kurulumdan sonra doğrulamaya süre tanıyın. Android 12+ bağlı cihazda:

```sh
adb shell pm verify-app-links --re-verify com.gridshard.remotedebug
adb shell pm get-app-links com.gridshard.remotedebug
```

Domain doğrulanmış olmalı. Tarayıcı otomatik dönmezse callback sayfasındaki dönüş düğmesi aynı HTTPS hedefini açar; doğrulayıcı yine zorunludur. Geniş host/path filtresi veya custom scheme ile güvenlik aşılmaz. [Android bağlantı doğrulama rehberi](https://developer.android.com/training/app-links/verify-applinks).

## Gerçek tamamlanma kapısı

1. Sağlayıcı paneli/dış sırlar hazır, yeni backend kontrollü dağıtıldı, asset links doğru.
2. R4 mevcut GRIDSHARD TEST üzerine **kaldırmadan** kuruldu; profil korunuyor.
3. Google/Apple gerçek hesabı sistem tarayıcısında seçildi; sıcak/soğuk dönüş, yeniden başlatma ve farklı cihazda hesabı geri alma doğru profili getiriyor.
4. İptal/offline/tekrar callback ve başka sahibin hesabını bağlama güvenli; veri kaybı yok, kanıtlarda sır değerleri yok.

Otomatik testler sağlayıcı yanıtlarını taklit eder; canlı giriş, Android servis doğrulaması veya fiziksel cihaz kanıtı değildir. OAuth kurulumu AdMob SSV, Play ödeme, Apple ödeme veya push'u kendiliğinden açmaz.
