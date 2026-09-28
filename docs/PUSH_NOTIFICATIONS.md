# Mobil bildirim teslimi

## Durum ve kapsam

FCM HTTP v1 (Android) ve APNs HTTP/2 (iOS) gönderim kodu, kalıcı teslim kuyruğu, cihaz belirteci yenileme/iptal akışı ve bildirimden güvenli ekran açma bağlantısı GRIDSHARD projesinden taşındı. **Gerçek teslimat henüz doğrulanmadı.** Bu turda test, derleme, sunucu, mobil proje üretimi veya sağlayıcıya gönderim çalıştırılmadı.

Bildirim üreten olaylar:

| Olay | Bağlantı | Açılan ekran |
| --- | --- | --- |
| Arkadaş davetinin kabulü | `gridshard://profile/<oyuncu>` | Davet edenin açık profili |
| Doğrudan mesaj | `gridshard://friends/messages/<oyuncu>` | Arkadaşlar → sohbet |
| Kupasız savaş daveti | `gridshard://inbox` | Gelen kutusu (davet kendiliğinden kabul edilmez) |

Yeni etkinlik veya maç hatırlatma zamanlayıcısı eklenmedi. Bildirim açmak hiçbir kupa, maç, ödül veya profil hesabını değiştirmez. Tarayıcıda Web Push sunulmaz; native Android/iOS uygulaması gerekir. Web'de bildirim düğmeleri gizlenir.

## Sunucu ayarı

Varsayılan `GRIDSHARD_PUSH_ENABLED=0`; bu durumda hiçbir sağlayıcı bağlantısı açılmaz. Eski `GRIDSHARD_PUSH_PROVIDER` artık kullanılmaz. Gönderim yalnız açık etkinleştirme ve geçerli en az bir sağlayıcı yapılandırmasıyla başlar. Etkinleştirilmiş ama eksik veya bozuk yapılandırma sunucunun açılmasını durdurur; başarı taklidi yapılmaz.

| Değişken | Kullanım |
| --- | --- |
| `GRIDSHARD_PUSH_ENABLED` | Canlı gönderimi açıkça etkinleştirmek için `1` |
| `GRIDSHARD_FCM_SERVICE_ACCOUNT_FILE` | FCM proje kimliği, hizmet hesabı e-postası ve RSA özel anahtarını içeren sunucu JSON dosyasının yolu |
| `GRIDSHARD_APNS_PRIVATE_KEY_FILE` | Apple APNs ES256/P-256 `.p8` anahtarının sunucudaki yolu |
| `GRIDSHARD_APNS_TEAM_ID` | Apple Developer takım kimliği |
| `GRIDSHARD_APNS_KEY_ID` | APNs anahtar kimliği |
| `GRIDSHARD_APNS_TOPIC` | Gerçek iOS bundle ID; Capacitor uygulama kimliğiyle eşleşir |
| `GRIDSHARD_APNS_ENVIRONMENT` | Açıkça `sandbox` veya `production`; varsayılan tahmin edilmez |

FCM için projede HTTP v1 API ve hizmet hesabının mesaj gönderme yetkisi açık olmalıdır. Gönderici kısa ömürlü OAuth erişim belirteci alır ve süresi dolmadan yeniler. APNs JWT bellekte yeniden kullanılır, 50 dakikada yenilenir. Google/Apple giriş (OAuth) anahtarları bu iki bildirim anahtarının yerine geçmez. HTTP bağlantıları TLS doğrular; yönlendirme izlenmez; sağlayıcı adresleri sabittir.

Anahtarları istemci varlıklarına, `runtime-config.js`, kaynak koda, ekran görüntüsüne veya sohbet mesajlarına koymayın. Sır dosyalarını dağıtımın secret mekanizmasıyla **salt okunur** bağlayın. `docker-compose.yml` değişkenleri aktarır ama anahtar dosyalarını kendiliğinden bağlamaz; yerel bir Compose override/secrets tanımıyla dosyaları konteynere bağlayın ve `_FILE` değişkenlerine konteyner içindeki yolu yazın. `secrets/`, `.p8`, Firebase admin anahtarları ve native Firebase yapılandırmaları `.gitignore` ve `.dockerignore` ile dışarıda tutulur.

`server/requirements.txt` HTTP/2 destekli `httpx[http2]` içerir; bağımlılıklar dağıtımdan önce `pip install -r server/requirements.txt` ile kurulmalıdır. `httpx`/`httpcore` ayrıntılı istek loglarını açmayın: APNs URL'si cihaz belirtecini taşır. Gönderici bu kütüphanelerin log seviyesini WARNING yapar ve ham sağlayıcı hatalarını loglamaz.

## Mobil uygulama bağlantısı

`@capacitor/push-notifications` **8.1.2** kilitlendi; Capacitor 8.5.0 ile aynı ana sürümdedir. `android/` ve `ios/` projeleri henüz üretilmediği için imzalama, entitlements ve Firebase dosyası uygulanmış sayılmaz. Önce [mobil yayın adımları](MOBILE_RELEASE_RUNBOOK.md) ile kalıcı uygulama kimliğini belirleyin ve projeleri üretin; sonra bağımlılıkları kurup native eşitleme yapın.

### Android

- Firebase'de aynı paket kimliğini kaydedin; projeye ait `google-services.json` dosyasını `android/app/` altına güvenli dağıtım adımıyla yerleştirin. Bu, sunucunun hizmet hesabı özel anahtarı **değildir**.
- Oyuncu Ayarlar'da **MOBİL BİLDİRİMLERİ AÇ** düğmesine bastığında Android 13+ izni istenir. Açılışta kendiliğinden izin penceresi açılmaz. Eklenti Android'de FCM belirtecini döndürür.
- İstemci `gridshard_social` kanalını oluşturur; sunucu mesajı bu kanala yollar. Android 12 ve altında eklentinin izin yanıtı sistemin bütün bildirim ayarlarını yansıtmayabilir; cihaz ayarlarını da kontrol edin.
- Yayından önce beyaz/şeffaf tek renk bildirim simgesini native kaynaklara ekleyip manifestteki `com.google.firebase.messaging.default_notification_icon` alanına bağlayın. Renkli mağaza ikonu bildirim çubuğunda kullanılmamalıdır.

### iOS

- Apple Developer'da gerçek App ID için Push Notifications yeteneği ve uygun provisioning/imza açılmalı; Xcode hedefinde Push Notifications capability etkin olmalıdır.
- `AppDelegate.swift` içinde başarılı kayıt callback'inin cihaz belirtecini `.capacitorDidRegisterForRemoteNotifications`, başarısız callback'in hatayı `.capacitorDidFailToRegisterForRemoteNotifications` bildirimine ilettiğini doğrulayın. Eksikse [resmî eklenti kurulumundaki](https://capacitorjs.com/docs/apis/push-notifications) iki callback'i ekleyin.
- İstemcinin iOS belirteci **APNs belirtecidir**, FCM belirteci değildir. Sunucudaki `topic`, takım/anahtar ve sandbox/production seçimi uygulamanın imzasıyla eşleşmelidir. TestFlight/App Store için production kullanılır.
- Yalnız görünür bildirimler desteklenir; sessiz/arka plan işi yoktur. Ön planda ses ve uyarı sunumu `capacitor.config.js` içinde tanımlıdır.

## Kayıt, iptal ve güvenlik

- `POST /notifications/{player_id}/push-subscriptions` mevcut Bearer oyuncu denetimine ek olarak oturum belirtecinin gönderilen `device_id` altında kayıtlı olmasını ister. Platform yalnız `android`/`ios`; APNs belirteci onaltılık, FCM belirteci izinli karakterlerle sınırlıdır. İstek gövdesinde fazladan alan kabul edilmez.
- `DELETE /notifications/{player_id}/push-subscriptions/{device_id}` aboneliği yalnız aynı cihaz oturumundan iptal eder. Cihaz oturumunu sonlandırmak ve hesabı silmek de bekleyen işleri iptal eder.
- Aynı native belirteç başka hesaba bağlanınca eski hesabın aboneliği ve bekleyen işleri iptal edilir. Belirteç yenilendiğinde eski revizyona ait işler gönderilmez. Eski belirtece ait gecikmiş hata yenisini silemez; APNs 410 zaman damgası taze kayıttan eskiyse abonelik silinmez.
- İstemci izin tercihini saklar ama belirteci diske yazmaz. Açılışta, öne dönüşte ve bağlantı gelince izin ve belirteç yenilenir. Dinleyiciler bir kez kurulur; kapatma sırasında geç gelen callback aboneliği yeniden açamaz. Ağ kesintisindeki kapatma bir sonraki açılışta sunucuya tekrar iletilir.
- Bildirim dokunuşları kimlik hazır olana kadar bekler. Yalnız aynı alıcı hesap için yukarıdaki üç bağlantı türü açılır. Harici URL, `gridshard://invite/...` ile otomatik davet kabulü ve tekrar gelen aynı bildirim kimliği işlenmez.
- `native-push.js` yüklenemezse yalnız bildirim düğmeleri gizlenir; oyun açılmaya devam eder.
- Abonelik, anahtar ve ham sağlayıcı yanıtları API görünümünde veya kişisel dışa aktarımda bulunmaz. Hesabın kendi görünümü yalnız yapılandırılmış platformları ve teslim durumlarının adetlerini içerir. Mesaj içeriği push gövdesine konmaz; genel bilgi kullanılır.

## Kuyruk ve işletim sınırları

- İşler `platform_state.json` içindeki hesabın `push_jobs` alanında, bildirimle aynı atomik yazıda saklanır. Bu geriye uyumlu ek bir alandır; JSON şema göçü veya eski veriyi sıfırlama gerekmez. Bu dosya artık `.gitignore` ve sürüm paketi dışında tutulur.
- Platform işlemlerinin tamamı yeniden girilebilir iş parçacığı kilidi ve işletim sistemi dosya kilidi (`platform_state.json.lock`) kullanır. `.lock` dosyası kalıcıdır; silinmez, süreç çökünce kilidi işletim sistemi bırakır. Aynı **yerel** veri dosyasını paylaşan işçiler 120 saniyelik kiralama ile aynı işi aynı anda almaz. Ayrı makinelerde ayrı JSON kopyalarıyla birden çok gönderici çalıştırmayın; dağıtık üretim için ortak işlemsel kuyruk gerekir.
- Sağlayıcı çağrısı JSON kilidinin dışında, savaş tick döngüsünden ayrı iş parçacığında yapılır. HTTP zaman aşımı 10 saniyedir; kapanış süren işi bekler.
- Geçici ağ/429/5xx hatalarında en az 60 saniye, üstel gecikme ve rastgele sapma uygulanır; `Retry-After` gözetilir. Yetkilendirme hatasında en az 300 saniye beklenir ve aynı sağlayıcıya bekleme aralığı uygulanır.
- Her iş en çok 6 deneme ve 24 saat ömür taşır. 30 gün yenilenmeyen abonelik temizlenir. Hesap başına en çok 10 abonelik, son 100 bildirim ve 1.000 iş saklanır; biten işler süreleri dolduktan bir gün sonra silinir. Eski gelen kutusu kayıtları geriye dönük gönderilmez.
- FCM `UNREGISTERED` ve APNs `Unregistered` aboneliği temizler. Yetki, yanlış topic/ortam veya yük hataları belirteci otomatik silmez. Engellenen kaynak oyuncunun bekleyen işleri gönderilmez.
- `accepted`, sağlayıcının kabulüdür; cihazın gösterdiğini kanıtlamaz. Ağ kopması veya kabulden sonra süreç çökmesi tekrar gönderime yol açabilir; **tam bir kez teslim garantisi yoktur**. Sabit bildirim kimliği, Android tag ve APNs collapse ID tekrarları azaltır.

## Yayın öncesi bekleyen doğrulama

Test izni gelince önce `server/tests/test_push_delivery.py` ve `client/tests/native-push.test.js` sözleşmelerini, ardından platform/auth ve istemci açılış testlerini çalıştırın. Gerçek anahtarlar test süreçlerine verilmemelidir; test ayarında gönderim kapalıdır.

Sonra gerçek Android ve iPhone üzerinde izin verme/reddetme, ön plan/arka plan/kapalı uygulama dokunuşu, belirteç yenileme, hesap değişimi, çevrimdışı kapatma ve cihaz oturumunu iptal etme senaryolarını doğrulayın. Sandbox ve production ayrı ayrı kanıtlanmalıdır. Bu kanıtlar gelmeden canlı teslim maddesi tamamlandı sayılmaz.

Protokol kaynakları: [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [FCM hata sözleşmesi](https://firebase.google.com/docs/cloud-messaging/error-codes), [Google hizmet hesabı OAuth](https://developers.google.com/identity/protocols/oauth2/service-account), [APNs belirteç tabanlı bağlantı](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns), [APNs yanıtları](https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns).
