# Mobil bildirim teslimi — Beta.76

## Durum ve kapsam

FCM HTTP v1 (Android) ve APNs HTTP/2 (iOS) gönderim kodu, kalıcı kuyruk, cihaz token yenileme/iptal akışı ve bildirimden güvenli ekran açma bağlantısı eklendi. **Gerçek teslimat henüz doğrulanmadı.** Bu pakette test, derleme, sunucu, mobil proje üretimi veya sağlayıcıya gönderim çalıştırılmadı. Yalnız kilit dosyası güncellemesi (`pnpm install --lockfile-only --ignore-scripts`) yapıldı.

Bildirim üreten mevcut olaylar: arkadaş davetinin kabulü ve doğrudan mesaj. Yeni etkinlik/maç hatırlatma zamanlayıcısı eklenmedi. Bildirim açmak hiçbir kupa, maç, ödül veya profil hesabını değiştirmez. Normal LAN/mobil tarayıcıda Web Push sunulmaz; native Android/iOS uygulaması gerekir.

## Sunucu ayarı

Varsayılan `GRIDSHARD_PUSH_ENABLED=0`; bu durumda hiçbir sağlayıcı bağlantısı açılmaz. Eski `GRIDSHARD_PUSH_PROVIDER` tek başına hazır görünüm veya gönderim sağlamaz. Gönderim yalnız açık etkinleştirme ve geçerli en az bir adaptör yapılandırmasıyla başlar. Etkinleştirilmiş ama eksik/bozuk yapılandırma sunucunun başlamasını durdurur; başarı taklidi yapılmaz.

| Değişken | Kullanım |
| --- | --- |
| `GRIDSHARD_PUSH_ENABLED` | Canlı gönderimi açıkça etkinleştirmek için `1` |
| `GRIDSHARD_FCM_SERVICE_ACCOUNT_FILE` | FCM proje kimliği, hizmet hesabı e-postası ve RSA özel anahtarını içeren sunucu JSON dosyasının yolu |
| `GRIDSHARD_APNS_PRIVATE_KEY_FILE` | Apple APNs ES256/P-256 `.p8` anahtarının sunucudaki yolu |
| `GRIDSHARD_APNS_TEAM_ID` | Apple Developer takım kimliği |
| `GRIDSHARD_APNS_KEY_ID` | APNs anahtar kimliği |
| `GRIDSHARD_APNS_TOPIC` | Gerçek iOS bundle ID; Capacitor uygulama kimliğiyle eşleşir |
| `GRIDSHARD_APNS_ENVIRONMENT` | Açıkça `sandbox` veya `production`; varsayılan tahmin edilmez |

FCM için ilgili projede HTTP v1 API ve hizmet hesabının mesaj gönderme yetkisi etkin olmalı. Gönderici kısa ömürlü OAuth erişim belirteci alır ve süresi dolmadan yeniler. APNs JWT bellekte yeniden kullanılır, 50 dakikada yenilenir. OAuth Google/Apple giriş anahtarları bu iki bildirim anahtarının yerine geçmez. HTTP bağlantıları TLS doğrulamalıdır; yönlendirmeler izlenmez; sağlayıcı adresleri sabittir.

Anahtarları istemci varlıklarına, `runtime-config.js`, kaynak kod, ekran görüntüsü veya sohbet mesajlarına koymayın. Gizli dosyaları dağıtımın secret mekanizmasıyla **salt okunur** bağlayın. `docker-compose.yml` değişkenleri aktarır ama anahtar dosyalarını kendiliğinden bağlamaz. Yerel bir Compose override/secrets tanımıyla dosyaları konteyner içine bağlayın; `_FILE` değişkenlerine Windows host yolu değil konteyner yolunu yazın. Gerçek sır dosyalarını commit etmeyin. `secrets/`, `.p8`, Firebase admin anahtarları ve native Firebase yapılandırmaları Git/Docker bağlamı dışında tutulur.

`server/requirements.txt` artık HTTP/2 destekli `httpx[http2]` içerir; sunucunun bağımlılıkları dağıtım öncesi kurulmalıdır. `httpx`/`httpcore` ayrıntılı istek loglarını açmayın: APNs URL'si cihaz tokenı taşır. Adaptör bu kütüphanelerin log seviyesini WARNING yapar ve ham sağlayıcı hatalarını loglamaz.

## Mobil uygulama bağlantısı

`@capacitor/push-notifications` **8.1.2** kilitlendi. Mevcut Capacitor 8.5.0 ile aynı ana sürümdedir. Gerçek `android/` ve `ios/` projeleri henüz bulunmadığı için imzalama, entitlements ve Firebase dosyası uygulanmış sayılmaz. Önce [mobil yayın adımları](MOBILE_RELEASE_RUNBOOK.md) ile kalıcı uygulama kimliğini belirleyin ve projeleri üretin; sonra bağımlılıkları kurup native sync yapın.

### Android

- Firebase'de aynı paket kimliğini kaydedin; projeye ait `google-services.json` dosyasını `android/app/` altına güvenli dağıtım adımıyla yerleştirin. Bu, sunucunun hizmet hesabı özel anahtarı **değildir**.
- Kullanıcı Ayarlar'dan bildirimleri açtığında Android 13+ izni istenir. Başlangıçta kendiliğinden izin penceresi açılmaz. Plugin Android'de FCM tokenı döndürür.
- İstemci `gridshard_social` kanalını oluşturur; sunucu mesajı bu kanala yollar. Android 12 ve altında plugin izin yanıtı sistemin tüm görünür bildirim ayarlarını yansıtmayabilir; cihaz ayarlarını da kontrol edin.
- Yayın öncesi beyaz/şeffaf tek renk bildirim simgesini native kaynaklara ekleyip manifestin `com.google.firebase.messaging.default_notification_icon` alanına bağlayın. Renkli mağaza ikonu bildirim çubuğu ikonu yerine kullanılmamalı.

### iOS

- Apple Developer'da gerçek App ID için Push Notifications yeteneği ve uygun provisioning/imza açılmalı. Xcode hedefinde Push Notifications capability etkin olmalı.
- `AppDelegate.swift` içinde başarılı kayıt callback'inin cihaz tokenını `.capacitorDidRegisterForRemoteNotifications`, başarısız callback'in hatayı `.capacitorDidFailToRegisterForRemoteNotifications` bildirimine ilettiğini doğrulayın. Eksikse [resmî plugin kurulumundaki](https://capacitorjs.com/docs/apis/push-notifications) iki callback'i uygulayın.
- İstemcinin iOS tokenı **APNs tokenıdır**, FCM tokenı değildir. Sunucudaki `topic`, team/key ve sandbox/production seçimi uygulamanın imzasıyla eşleşmelidir. TestFlight/App Store dağıtımı için production yapılandırması kullanılır.
- Bu paket görünür bildirimler içindir; sessiz/background iş yürütme eklemez. Ön planda ses/uyarı sunumu Capacitor ayarında tanımlıdır.

## Kayıt, iptal ve güvenlik

- `POST /notifications/{player_id}/push-subscriptions` mevcut Bearer oyuncu denetimine ek olarak oturum tokenının gönderilen `device_id` altında kayıtlı olmasını ister. Platform yalnız `android`/`ios`; APNs tokenı hex, FCM tokenı izin verilen karakterlerle sınırlandırılır.
- `DELETE /notifications/{player_id}/push-subscriptions/{device_id}` yalnız mevcut cihaz oturumundan iptal eder. Cihaz oturumunu sonlandırmak ve hesap silmek de ilgili bekleyen işleri kaldırır/iptal eder.
- Aynı native token başka hesaba bağlanınca eski hesabın aboneliği ve bekleyen işleri iptal edilir. Token yenilendiğinde eski revizyona ait işler gönderilmez; yeni olaylar yeni tokena gider. Eski tokena ait gecikmiş hata yenisini silemez. APNs 410 zaman damgası taze kayıt zamanından önceyse abonelik silinmez.
- İstemci izin tercihini saklar ama tokenı diske yazmaz. Başlangıç/öne dönüşte izin ve token yenilenir. Dinleyiciler bir kez kurulur; kapatma sırasında geç gelen callback aboneliği yeniden açamaz. Ağ kesintisindeki kapatma bir sonraki bağlantı/başlangıçta sunucuya tekrar iletilir.
- Bildirim dokunuşları kimlik hazır olana kadar bekler; yalnız aynı alıcı hesabı için `gridshard://profile/...` ve `gridshard://friends/messages/...` açılır. Harici URL, otomatik davet kabulü ve tekrar gelen aynı bildirim kimliği işlenmez.
- Abonelik/anahtar/ham sağlayıcı yanıtları API görünümünde veya kişisel dışa aktarımda bulunmaz. Hesabın kendi görünümü yalnız yapılandırılmış platformları ve teslim durumlarının adetlerini içerir. DM içeriği push gövdesine konmaz; genel mesaj bilgisi kullanılır.

## Kuyruk ve işletim sınırları

- İşler mevcut platform JSON hesabının `push_jobs` alanında, bildirimle aynı atomik yazıda saklanır. Şema v1 ile geriye uyumlu ek alandır; ayrı bir veri dosyası veya eski veriyi sıfırlama gerekmez. Önceki migration bakım kapısı geçerlidir.
- Platform işlemlerinin tamamı reentrant thread + işletim sistemi dosya kilidi kullanır. `.lock` dosyası kalıcıdır; silinmez ve süreç çökünce kilit OS tarafından bırakılır. Aynı **yerel** veri dosyasını paylaşan worker'lar 120 saniyelik claim/lease ile tek işi aynı anda almaz. Ayrı makinelerde ayrı JSON kopyalarıyla çoklu gönderici çalıştırmayın; dağıtık üretim için ortak transactional outbox'a geçiş gerekir.
- Bildirim sağlayıcı çağrısı JSON kilidinin dışında, savaş tick döngüsünden ayrı worker thread'inde yapılır. HTTP aşama zaman aşımı 10 saniye; kapanış devam eden işi bekler.
- Geçici ağ/429/5xx hatalarında en az 60 saniye, üstel gecikme ve jitter uygulanır; `Retry-After` gözetilir. Yetkilendirme hatasında en az 300 saniye beklenir. Worker içinde aynı sağlayıcıya bir bekleme aralığı uygulanarak diğer işlerle hata fırtınası önlenir.
- Her iş en çok 6 deneme ve 24 saat ömür taşır. Abonelik 30 gün yenilenmezse temizlenir. Hesap başına en çok 10 abonelik, son 100 bildirim ve 1.000 iş saklanır; terminal işler süreleri dolduktan bir gün sonra temizlenir. Eski inbox kayıtları yeni dağıtımda geriye dönük topluca gönderilmez.
- FCM `UNREGISTERED` ve APNs `Unregistered` abonelik temizler. Yetki/yanlış topic/yanlış ortam/payload hataları tokenı otomatik silmez. Engellenen kaynak oyuncunun bekleyen işleri gönderilmez.
- `accepted`, sağlayıcının kabulüdür; cihazın gösterdiğini kanıtlamaz. Ağ kopması veya kabul sonrası süreç çökmesi tekrar gönderime neden olabilir; **tam bir kez teslim garantisi yoktur**. Sabit bildirim kimliği, Android tag ve APNs collapse ID tekrarları azaltır. Başlamış HTTP gönderimi veya sağlayıcının zaten kabul ettiği bildirim geri çağrılamaz; kapatma/hesap silme gelecekteki ve henüz başlamamış işleri durdurur.

## Yayın öncesi bekleyen doğrulama

Kullanıcının çalıştırmalı test izni geldiğinde önce izole `server/tests/test_push_delivery.py` ve `client/tests/native-push.test.js` sözleşmelerini, mevcut platform/auth ve istemci başlangıç testlerini çalıştırın. Gerçek anahtarlar test süreçlerine verilmemeli; test ayarı push gönderimini varsayılan kapatır.

Sonra gerçek Android ve iPhone üzerinde: izin ver/reddet, ön plan/arka plan/kapalı uygulama dokunuşu, token yenileme, hesap değişimi, çevrimdışı kapatma ve cihaz oturumunu iptal etme senaryolarını doğrulayın. Sandbox/production ayrı ayrı kanıtlanmalı. Bu kanıtlar gelmeden checkpoint'teki canlı teslim maddesi tamamlandı işaretlenmemeli.

Protokol kaynakları: [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [FCM hata sözleşmesi](https://firebase.google.com/docs/cloud-messaging/error-codes), [Google hizmet hesabı OAuth](https://developers.google.com/identity/protocols/oauth2/service-account), [APNs token bağlantısı](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns), [APNs yanıtları](https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns).
