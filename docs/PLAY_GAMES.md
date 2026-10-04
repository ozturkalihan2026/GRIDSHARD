# Android Play Games girişi

Bu akış Google web OAuth ve Apple girişinden ayrıdır. `play-services-games-v2:22.1.0` sürümü resmî Google Maven deposundan doğrulanıp sabitlenmiştir. SDK Application açılışında platform hesabını kontrol eder; yeni PGS profil oluşturma ekranı yalnız oyuncu **PLAY GAMES İLE DEVAM ET** seçtiğinde açılır. Mevcut uygulama oturumu normal güvenli cihaz sırrıyla geri gelir; otomatik platform kimlik doğrulaması GRIDSHARD hesabını kendiliğinden değiştirmez.

## Public yapılandırma

Android sync ve backend aynı `GRIDSHARD_PLAY_GAMES_ID` (sayısal oyun kimliği) ve `GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID` (Web application OAuth client ID) kullanır. Bunlar sır değildir. Android OAuth client ID bu sunucu client ID yerine kullanılmaz. İki değişken boşsa native özellik kapalıdır; biri eksik/geçersizse sync reddedilir. Üretim paketinin Play App Signing SHA-1 kaydı debug kaydından ayrıdır.

Backend sırrı: `GRIDSHARD_PLAY_GAMES_CLIENT_SECRET_FILE`, korumalı **proje dışı**, yalnız secret değeri içeren dosya. İsteğe bağlı `docker-compose.play-games.yml`, bu dosyayı `${GRIDSHARD_SECRETS_DIR}/play_games_client_secret` üzerinden read-only mount eder. JSON credential, secret, kod ve erişim/yenileme tokenları Git, kaynak ZIP, web bundle, APK veya log'a konmaz. Web Client secret telefona gönderilmez. Debug APK AdMob'un örnek app ID'sini taşımaya devam eder; reklam/ödeme sağlayıcıları bu değişiklikle açılmaz.

## Hesap güvenliği

1. Mevcut cihazın yetkili `/accounts/{player}/play-games/start` isteği S256 kanıtıyla 10 dakikalık bir deneme açar. Başka oyuncu adına istek 403'tür.
2. Native SDK Web client ID ile tek kullanımlık server auth code alır. Kod ve doğrulayıcı yalnız bellekte tutulur; soğuk kapanmada yeni deneme gerekir.
3. Backend denemeyi tüketir; sabit `https://oauth2.googleapis.com/token` adresinde `redirect_uri=""` ile kodu değiştirir. `applications/{game_id}/verify`, tokenın **bizim oyuna** ait olduğunu ve gerçek `player_id` değerini doğrular. Client player ID/e-posta kabul edilmez. Ek EMAIL/PROFILE/OPEN_ID izni istenmez; refresh token saklanmaz.
4. Login var olan PGS sahibini geri getirir; ilk bağlantı misafir profilini korur. Link başka bir sahibin hesabını alamaz. Zaten kalıcı kimliği olan profil farklı hesaba sessizce taşınamaz; mevcut PGS bağlantısı başka subject ile değiştirilemez. Hesaplar birleştirilmez.
5. 5 dakikalık server exchange yine S256 cihaz kanıtı ve SecureStorage cihaz sırrıyla `/auth/provider-session` üzerinde kullanılır. Yanlış kanıt kodu tüketmez; doğru kullanım tek seferdir.

Eski misafir kurulumlarına özelliği ekledikten sonra bir kez Play Games/misafir seçimi gösterilir. Misafir seçimi korunur; tekrar bağlama Ayarlar'dan yapılabilir. İptal/offline hatasında mevcut profil değişmez. Google/Apple web girişleri ayrı düğmelerdir.

## Açılıştaki GRIDSHARD ID

Yükleme ekranındaki **GRIDSHARD ID**, oyunun kendi hesap kimliğidir; Play Games oyuncu kimliği, Google e-postası, OAuth client ID veya oturum tokenı değildir. `wt-…` öneki ilk web-test kimlik üreticisinden kalmıştır. Bu kimlik gerçek hesaplarda da profil/ilerleme kayıtlarının anahtarıdır; Play Games bağlanınca değiştirilmez. Sunucu doğruladığı sağlayıcı kimliğini bu oyun hesabına bağlar, login ise bağlı hesabın oyun kimliğini geri getirir.

Kimlik yerel depodan okunur okunmaz gösterilmez: sunucudan profil yüklenip katılımcı kimliği eşleşmesi doğrulandıktan sonra açılış ekranında görünür. Yeniden denemede doğrulanana kadar gizlenir. Ekranda kısaltılır; kopyalama tam GRIDSHARD kimliğini verir. “Kimliğin” gibi sağlayıcıyla karışabilecek belirsiz etiket kullanılmaz. Öneki silerek veya Play Games kimliğini oyun ID'sinin yerine yazarak hesap/veri göçü yapılmaz.

## Sunucu web derlemesi

Docker web builder yalnız `tools/web-build/package.json` ve kendi frozen lockfile'ındaki `esbuild:0.28.2` aracını kurar. Capacitor/App/Browser SDK'ları web bundle üretmek için gerekmez; yalnız Android/iOS geliştirme paketinde kalır. Ana paket ile build-tool esbuild sürümü eşitliği test edilir. pnpm'in yayın yaşı/integrity kontrolleri kapatılmaz veya istisna verilmez; yalnız gerekli derleme girdileri kurulur.

## Gerçek cihaz kapısı

APK denetiminde `tools/audit-mobile-debug.ps1` için `-ExpectedPlayGamesId` ve `-ExpectedPlayGamesServerClientId` public değerleri birlikte verilebilir. Manifest Application/APP_ID/manual profil metadata'sı, gerçek APK'nın derlenmiş public kaynakları ve Application/plugin/resmî SDK DEX sınıfları kontrol edilir; bu kontrol gerçek Google girişini taklit etmez.

Canlı dağıtımda production + Cloudflare + Play Games Compose katmanları birlikte kullanılmalıdır; eski auth/database/origin TLS mount'ları ve veri birimleri korunur. Worker durdurulup ayrı yeni yedek alınmadan yeniden dağıtım yapmayın. Cloudflare sağlık probe'u tanımlı `User-Agent: GRIDSHARD-deployment-health/1.0` kullanır; varsayılan Python isteğinin 403 alması gerçek oyuncu erişiminin bozulduğu anlamına gelmez. Origin CA + hostname ve public HTTPS doğrulaması yine zorunludur; TLS kontrolü veya Cloudflare güvenliği kapatılmaz.

PGS taslakken telefonun Google hesabı **Play Console → Play Oyun Hizmetleri → Test kullanıcıları** ve gerekliyse **Google Auth Platform → Audience → Test users** listesinde bulunmalı. Cloud OAuth kaydı ayrıca PGS credential'a bağlanmış olmalı. Properties'teki oyuncuya görünen oyun adı GRIDSHARD olarak kontrol edilmeli. Mağaza yayını ve PGS yayını ayrı kapılardır; yerel debug denemesi için oyunu herkese yayımlama.

### Diğer test kullanıcıları giriş yapamıyorsa

Dahili/kapalı Play dağıtım listesini doldurmak tek başına taslak PGS erişimi
vermez. Aynı oyunun **Kullanıcı sayısını artırın → Play Oyun Hizmetleri → Kurulum
ve yönetim → Test kullanıcıları** bölümünde ya oyuncunun Play Games'te gerçekten
seçtiği Google hesabı tek tek eklenir, ya da **Sürüm kanalları / Release tracks**
sekmesinden mevcut ilgili test kanalı **Kanal ekle / Add tracks** ile PGS testine
yetkilendirilir. Liste/kanal kaydedilir; kullanıcının kendi kayıtları silinmez.
Google, tekil tester erişiminin birkaç saat içinde yayılabileceğini belirtir.

Kanal katılımı ve Play Games'teki oyun hesabı aynı Google hesabıyla kontrol edilir;
çok hesaplı telefonda seçilen PGS hesabının farklı olduğu varsayılmaz, doğrulanır.
OAuth consent Audience durumu Testing ise aynı hesapların oradaki tester erişimi
de kontrol edilir. Bu koşullar sağlanıp hata sürüyorsa tam hata ekranı ve kurulum
kaynağı (Play'deki aynı canonical sürüm mü/eski APK mı) istenir; e-posta/ham token
ve Google şifresi paylaşılmaz. Paket/SHA1/istemci yeniden oluşturma veya oyun
verilerini silme ilk çözüm değildir; sahibin Uç hesabında giriş zaten kullanıcıca
başarılıdır. Yanlış hesabı mevcut PGS sahipli hesaba link etmeye çalışılmaz.

PGS testine kanal ekleme, uygulamayı genel Play mağazasında yayımlamak veya
12 katılımcı/14 günlük kapalı test koşulunu otomatik karşılamak değildir.
[Resmi PGS tester ve kanal erişimi](https://developer.android.com/games/pgs/console/publish),
[OAuth consent erişimi](https://developer.android.com/games/pgs/console/setup).

**4 Ekim tester ekran kanıtı:** Bir oyuncunun görüntüsünde Google'ın açık
“uygulama şu anda test edilmektedir / yalnız onaylanan test kullanıcıları” metni
ve **403 access_denied** var. Bu, Google OAuth audience test erişimi engelidir;
AdMob SSV403 veya AWS sağlık kanıtı değildir. Öncelik mevcut bağlı Cloud proje
376018782491 → **Google Auth Platform → Audience → Test users → Add users**
altında oyuncunun gerçekten seçtiği hesabın izinli olduğunu kontrol etmek ve
kaydetmektir. Mevcut PGS tester/kanal erişimi ayrı korunur. Panel bağımsız okunmadı;
görüntüden tam client ID veya hangi giriş düğmesinin seçildiği anlaşılamaz.
Yalnız bu mesajı gidermek için public OAuth publish, yeni client/key veya
doğrulamayı atlama talimatı verilmez. Ekrandaki üçüncü kişinin e-postası receipt,
kaynak veya log'a kopyalanmaz.
[OAuth Audience test modu](https://support.google.com/cloud/answer/15549945?hl=en).

İkinci tester ekranı Play Store'da canonical paket için genel “indirilemiyor”
mesajıdır. Nedeni tek başına kesin değildir: aynı hesabın opt-in/Store seçimi,
diğer uygulamaların indirilmesi, depolama/ağ ve eski elle kurulmuş canonical APK
olup olmadığı kontrol edilir. `unreviewed` geçici mağaza etiketi neden olarak
sunulmaz; imza farkı yalnız eski APK gerçekten varsa ayrıca araştırılır. Hesabı
PGS'ye bağlı olmayan başka oyuncuya kaldırma/veri temizleme talimatı verilmez.

Telefon: mevcut uygulamayı kaldırmadan güncelle; Play Games seçimi, iptal/misafir, aynı profil/kupa/kredi, kapat-aç, başka temiz cihazda login, yanlış PGS hesabına geçişte eski profilin korunması ve offline davranışı doğrula. SDK'nın derlenmesi veya taklit HTTP testi bu fiziksel kapıları kapatmaz. Üretim paket/SHA-1 ve iOS ayrıca açık kalır.

Resmî kaynaklar: [Android platform authentication](https://developer.android.com/games/pgs/android/android-signin), [server access](https://developer.android.com/games/pgs/android/server-access), [applications.verify](https://developer.android.com/games/services/web/api/rest/v1/applications/verify).
