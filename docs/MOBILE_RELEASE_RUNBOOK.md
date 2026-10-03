# GRIDSHARD Mobil Yayın Akışı

Bu akış sıra kilitlidir: **Android gerçek cihaz → Google Play kapalı test → iPhone gerçek cihaz → TestFlight**. Android kapalı test kanıtı olmadan iOS yayın kapısı açılmaz.

## Bir kez verilecek ürün kararları

1. Kalıcı Android paket kimliği **`com.gridshardgame.app`** olarak seçildi; kullanıcı 2 Ekim 2026'da bu kimlikle Play Console uygulama oluşturma adımını tamamladığını bildirdi. Capacitor varsayılanı, `GRIDSHARD_APP_ID` ve sunucunun `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME` ayarı aynı kimliği kullanmalıdır. `com.example.gridshard` yayın için bilerek reddedilir. Bu kayıt, mağazada yayın veya üretim erişimi onayı değildir.
2. HTTPS üretim API adresini hazırlayın (`GRIDSHARD_API_BASE_URL`). Mobil paket backend'i içine gömmez; yalnız bu adresi runtime yapılandırmasına yazar.
3. Backend'de `GRIDSHARD_CORS_ORIGINS=https://localhost,capacitor://localhost` değerini ayarlayın.
4. Google Play Console, Apple Developer/App Store Connect ve BrowserStack kimliklerini GitHub secrets olarak tanımlayın.

## Uygulama içi satın alma karar kapısı

Google/Apple hesabı için Android sistem tarayıcısı, doğrulanmış HTTPS App Links ve cihaz doğrulamalı tek kullanımlık exchange köprüsü eklendi. Panel/dış sırlar/güncel backend/fiziksel giriş kapıları hâlâ açık: [Native OAuth kurulumu](NATIVE_OAUTH.md). App/Browser eklentileri gerçek bağlantı onayı değildir; iOS Universal Links ayrıca gereklidir. Uzak APK denetimi artık App/Browser kayıtlarını, DEX sınıflarını ve yalnız API hostu `/native-auth/android-test` yolundaki doğrulanmış HTTPS filtresini de zorunlu tutar.

Ücretli sezon geçişi, Savaş Premium ve Akı/Devre Kredisi paketlerinin gerçek para akışı ile savaş sonu ödüllü reklam kodu eklendi. Sunucuda Google Play ve App Store makbuz doğrulaması, tekil teslim, Google Play tüketimi, AdMob SSV ve iade/iptal bildirimleri bulunur. Kurulum ayrıntıları: [Mağaza ve satın alma](STORE_PURCHASES.md). **Kodun eklenmesi gerçek satın almanın yayına hazır olduğu anlamına gelmez.**

Yayından önce Pub/Sub ve App Store bildirim adresleri kurulup denenmeli; native eklentiler Sandbox/lisans hesabıyla gerçek cihazda doğrulanmalı; bölgesel fiyat, vergi ve çocuk/ebeveyn politikaları tamamlanmalıdır. Üretimde `GRIDSHARD_PURCHASE_TEST_MODE` ve `GRIDSHARD_AD_TEST_MODE` kapalı olmalıdır. Mağaza formlarında uygulama içi satın alma ve reklam beyan edilmelidir.

Paket kimliği mağazada uygulama kaydı oluşturulduktan sonra değiştirilmemelidir. Android kimliği artık kesinleşti; bu karar tek başına native proje, imzalı AAB veya mağaza yayını üretmez. Gerçek HTTPS API, sağlayıcı ve imza ayarları tamamlanıp doğrulanmalıdır. `GRIDSHARD_LOCAL_DEBUG=1` ile üretilen yerel proje mağazaya yüklenmez.

## Geçici yerel Android denemesi (mağazaya yüklenmez)

`GRIDSHARD_LOCAL_DEBUG=1` yalnız Git tarafından yok sayılan `.mobile-debug/android/` projesini `com.gridshard.localdebug` kimliğiyle üretir. Bu kimlik üretim hesabı veya önceki test hesaplarıyla paylaşılmaz; yayın kimliği değildir. Debug kimliği tek başına HTTP/karma içerik izni açmaz. Bu izin yalnız ayrıca `GRIDSHARD_ALLOW_INSECURE_MOBILE_API=1` ve özel/loopback ağdaki HTTP API seçilince açılır; uzak HTTPS testinde iki izin kapalıdır. Android yedeği her iki modda da kapatılır. Özel imza anahtarı depoya veya web varlıklarına kopyalanmaz; Gradle standart yerel debug imzasını kullanır.

```powershell
$env:GRIDSHARD_LOCAL_DEBUG="1"
Remove-Item Env:GRIDSHARD_REMOTE_DEBUG -ErrorAction SilentlyContinue
$env:GRIDSHARD_API_BASE_URL="http://TELEFONUN_ERISEBILDIGI_YEREL_IP:8879"
$env:GRIDSHARD_ALLOW_INSECURE_MOBILE_API="1"
pnpm build:mobile:web
node node_modules/@capacitor/cli/bin/capacitor add android
node tools/configure-native-orientation.js android
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="C:\Users\S-A\AppData\Local\Android\Sdk"
Set-Location .mobile-debug/android
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw "Android debug derlemesi başarısız." }
Set-Location ../..
& ./tools/audit-mobile-debug.ps1
```

Yerel proje önceden varsa `add android` yerine `node node_modules/@capacitor/cli/bin/capacitor sync android` proje kökünde çalıştırılır. Çıktı `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk` olur. Sunucu aynı ağda erişilebilir adreste dinlemeli ve `https://localhost` CORS kökenine izin vermelidir; IP değişirse web paketi yeniden derlenip eşitlenmelidir. Bu APK yalnız cihaz denemesi içindir: gerçek Play satın alma/reklam doğrulaması veya mağaza yayın kapısı olarak değerlendirilmez.

## Ortak mobil web paketi

### Ayar kategorileri ve tek oyuncu adı değişimi (3 Ekim r7)

Ayarlar **Genel / Ses / Grafik / Hesap ve Gizlilik** alt sekmelerine ayrılır. Genel: oyuncu adı, dil, titreşim, eğitim ve sürüm; Ses: ses/müzik ve önizleme; Grafik: kalite ve savaş perspektifi; Hesap ve Gizlilik: sağlayıcı bağlantıları, kurtarma, cihazlar/bildirim, veri dışa aktarımı/silme ve analitik rızası. Mevcut otomatik kaydetme ve TR/EN metinleri korunur.

Oyuncu adını değiştirme hakkı cihaz başına değil **oyun hesabı başına bir kez** verilir ve sunucuda profil verisiyle saklanır. Başarısız/geçersiz/taken ad hakkı tüketmez; aynı normalize ada tekrar gönderim idempotenttir. Değiştirmeden önce açık uyarı/onay vardır; hak kullanıldıktan sonra alan ve düğme kilitlenir. Sayaçsız eski profilde otomatik `Pilot-XXXXXXXX` adı veya değişmemiş hesap kimliği ilk hakkını korur; mevcut özel ad zaten kullanılmış sayılır. Play Games bağlantısı/yeniden kurulum/sunucu yeniden başlatma yeni hak vermez; gerçek hesap kimliği değiştirilmez.

Tablet dokunmatik genişliğinde (en az 600 CSS px) oyun kabuğu ekran genişliğine uyarlanır; masaüstünün portre önizlemesi korunur. Dock'un yuvarlak fiziksel köşelerden yatay küçük payı vardır; altta kalıcı Android gezinme alanı eklenmez. 360/800 genişlik ve Android Chrome/iPhone Safari emülasyonu fiziksel tablet/telefon köşe ve OEM sistem çubuğu teyidinin yerine geçmez.

### Uzak HTTPS Android debug denemesi (mağazaya yüklenmez)

Cloudflare HTTPS/WSS ve HTTP→HTTPS doğrulandıktan sonra, kullanıcı kararıyla **ayrı** `GRIDSHARD_REMOTE_DEBUG=1` paketi hazırlanır: kimlik `com.gridshard.remotedebug`, ad **GRIDSHARD TEST**, kaynak/çıktı `.mobile-debug/remote-android/`. `GRIDSHARD_LOCAL_DEBUG=1` de gereklidir; kalıcı mağaza kimliği değiştirilmez. Eski yerel uygulama, cihaz verisi ve debug projesi korunur; eski hesaplar yeni uygulamaya veya temiz sunucuya aktarılmaz. Yerel HTTP istisnası uzak modda bayrak verilse bile reddedilir; manifest ve Capacitor ağ politikası HTTPS-only olarak eşitlenir.

```powershell
$env:GRIDSHARD_LOCAL_DEBUG="1"
$env:GRIDSHARD_REMOTE_DEBUG="1"
$env:GRIDSHARD_API_BASE_URL="https://play.gridshardgame.com"
Remove-Item Env:GRIDSHARD_ALLOW_INSECURE_MOBILE_API -ErrorAction SilentlyContinue
pnpm build:mobile:web
# Proje yoksa add, varsa sync kullanılır; eski proje silinmez.
node node_modules/@capacitor/cli/bin/capacitor sync android
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="C:\Users\S-A\AppData\Local\Android\Sdk"
Set-Location .mobile-debug/remote-android
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw "Android HTTPS debug derlemesi başarısız." }
Set-Location ../..
& ./tools/audit-mobile-debug.ps1 -RemoteDebug -ApkPath ".mobile-debug/remote-android/app/build/outputs/apk/debug/app-debug.apk" -ExpectedApiBaseUrl "https://play.gridshardgame.com"
```

Denetim web dosyalarını içerik özetiyle karşılaştırır, özel anahtar/test/QA/geliştirme dosyalarını reddeder, HTTPS için plaintext/karma içerik ve Android yedeğinin kapalı olduğunu kontrol eder. SecureStorage native köprüsünün kaydı ve derlenmiş sınıfı da zorunludur; bu statik kontrol gerçek cihazda güvenli kayıt, soğuk açılış ve hesabın geri gelmesi denemesi yerine geçmez. Debug kancası varsayılan olarak AdMob SDK açılış çökmesini önlemek için Google'ın resmi örnek uygulama kimliğini ekler; yalnız aşağıdaki açık HTTPS debug yapılandırması yayıncı kimliğini kullanabilir. Hiçbiri sunucu SSV/gerçek reklam kapısını açmaz ([resmi kurulum](https://developers.google.com/admob/android/quick-start)). APK debug imzalıdır; Play yayını/gerçek satın alma/SSV/OAuth/push onayı değildir.

### Kontrollü AdMob native paketi (3 Ekim r8)

`GRIDSHARD_ADMOB_TEST_CONFIG` yalnız `GRIDSHARD_LOCAL_DEBUG=1`, `GRIDSHARD_REMOTE_DEBUG=1` ve açık HTTPS API ile kullanılabilir. Yol gerçek dosya çözümlemesinden sonra ignored `artifacts/` içinde kalmalıdır. JSON'un yalnız `appId`, `adUnitId`, `testingDevices` alanları bulunabilir; aynı yayıncının geçerli public app/birim kimlikleri, en çok sekiz SDK test cihazı özeti (32 büyük hex) kabul edilir. Sır/AAID/OAuth JSON'u veya ekstra alan kabul edilmez. Cihaz listesi boşsa mod **`ump-only`** olur ve kendi birimi yüklenemez; doluysa SDK test cihazı true denetimi yükleme öncesinde zorunludur.

Normal build'de bu ortam değişkeni yoksa mod `disabled`, demo app ID ve boş cihaz listesi üretilir. Yayın hazırlanırken `GRIDSHARD_ADMOB_TEST_CONFIG` kaldırılmalıdır; test yapılandırması otomatik üretim ayarı değildir. Native `verifyLiveBuild` debug ve `ump-only` paketleri reddeder; şu an hiçbir helper production `live` yetkilendirmesi üretmez. Sunucu compatibility beyanı bir native build/test cihazı doğrulaması yerine geçmez.

Android kancası Ads SDK `25.4.0` doğrudan bağımlılığını sabitler, ölçüm başlangıcını erteler ve `AD_ID` / üç AdServices iznini manifest birleşiminden çıkarır. Denetimde yayıncı paketi için `-ExpectedAdMobAppId` ve `-ExpectedAdMobMode ump-only|test` birlikte ve `-RemoteDebug` ile verilmelidir. `GridshardAdSafety` derlenmiş sınıfı, mod/kaynaklar, APK web hash'leri, güvenli depo ve mevcut PGS kimlikleri ayrıca doğrulanır; binary manifest izinleri AAPT ile kontrol edilir.

Son r8: `artifacts/mobile-https-20261003/GRIDSHARD-TEST-2.1.0-beta.72-20261003-r8.apk`, versionCode **8**, versionName **2.1.0-beta.72-https-debug.8**, mobile build **`47f0ff6d889e01cd`**, **21.348.913 byte**, SHA-256 **`d11c6b3569b8ed4f610bd42a606eb7ec4c36b14a1d055602403304453b58e143`**. Mode `ump-only`; test cihazı listesi boş, canlı birim yetkisi yok. `com.gridshard.remotedebug` / min24 / target36 ve r7 ile aynı debug sertifika özeti (`942ec01abb22d136744ac0103c8d566f9316b831d1ab6b002bf2e599f9a36a96`) doğrulandı. Eski r7 dosyası/hash'i korunur. Yeni paket bu tur telefona kurulmadı; gerçek UMP/native cihaz denemesi ayrıca yapılacaktır. Mobil `dist` web sunucusuna kopyalanmaz.

```powershell
Remove-Item Env:GRIDSHARD_LOCAL_DEBUG -ErrorAction SilentlyContinue
Remove-Item Env:GRIDSHARD_REMOTE_DEBUG -ErrorAction SilentlyContinue
Remove-Item Env:GRIDSHARD_ALLOW_INSECURE_MOBILE_API -ErrorAction SilentlyContinue
Remove-Item Env:GRIDSHARD_ADMOB_TEST_CONFIG -ErrorAction SilentlyContinue
$env:GRIDSHARD_APP_ID="com.gridshardgame.app"
$env:GRIDSHARD_API_BASE_URL="https://api.gridshard.example"
pnpm build:mobile:web
```

Komut web yayınıyla aynı üretim hattını kullanır (`tools/build-client.js`, ayrıntı: [Üretim istemci paketi](CLIENT_BUILD.md)). JS ve CSS'yi içerik özetli tek pakete derler, `dist/` içine yalnız izin verilen varlıkları kopyalar ve HTTPS API adresini ayrı `dist/runtime-config.js` dosyasına yazar. Önce `pnpm install --frozen-lockfile --ignore-scripts` ile sabit `esbuild` kurulmalıdır. HTTP adresleri ancak iki açık yerel debug bayrağı ve özel/loopback host ile kabul edilir; mağaza adayı için kabul edilmez. `tools/mobile-network-policy.js` derleme, Capacitor ve Android manifesti için ortak sözleşmedir; Docker builder bu yardımcıyı da kopyalar, son runtime image'a girmez.

### Mobil ses biçimleri

Paketten önce `python tools/encode_mobile_audio.py` ile OGG/AAC türevleri üretilir (ffmpeg gerekir). `pnpm build:mobile:web` türevi doğrulanan WAV'ları pakete almaz; WAV türevinden yeniyse veya türev eksik/bozuksa durur. Ayrıntı: `docs/AUDIO_DIRECTION.md` §19.

## 1 — Android kapalı test

### Yerel portre yönü

`mobile:add:android` / `mobile:add:ios` komutları yerel proje üretildikten sonra `tools/configure-native-orientation.js` aracını uygular. Sonraki `cap sync` işlemlerinde aynı araç `capacitor:sync:after` kancasıyla tekrar çalışır. İşlem tekrar çalıştırılabilir; mevcut uygulama kimliği ve diğer etkinlikler değiştirilmez. Android application üzerinde ortak ağ/yedek politikası, debug modunda varsayılan örnek AdMob metadata'sı (açık test yapılandırmasında kontrollü yayıncı ID'si) ve native reklam kapıları ayrıca uygulanır.

- Android: yalnız `MainActivity` için `android:screenOrientation="portrait"`.
- iPhone/iPad: `UISupportedInterfaceOrientations` ve `UISupportedInterfaceOrientations~ipad` yalnız portre; eski iPad sürümleri için `UIRequiresFullScreen=true`.
- Proje dosyası yoksa veya beklenmeyen bir şablon varsa komut açık hata verir; kilit uygulanmış gibi devam etmez.
- Bu ayar web tarayıcısının yönünü zorla kilitlemez. Yeni Android büyük ekran/pencere modları ile yeni iPad pencere davranışları yön talebini geçersiz kılabilir; duyarlı CSS korunmalıdır. Telefon dönüşü ve güvenli alan doğrulaması gerçek cihazda ayrıca yapılmalıdır.

### Tam ekran ve arka plan sesi

Capacitor 8'in yerleşik `SystemBars` ayarı uygulama açılırken üst durum ve alt gezinme çubuklarını gizler. Android'de sync kancası `tools/native-templates/GridshardActivity.java` kaynağını projeye kopyalar ve mevcut `MainActivity` kimliği/kodu korunarak bu etkinlikten türetir. `insetsHandling=disable` ile tek inset sahibi native etkinliktir: kamera/durum alanı üstte ve gerekli yan kenarlarda görünürlükten bağımsız olarak, oyun arka plan rengi `#07142B` üzerinde korunur. **Altta gezinme çubuğu için kalıcı boşluk yoktur; oyun fiziksel alt kenara kadar uzanır.** Sistem tuşları geçici olarak oyunun üstüne açılır; WebView viewport'u ve dock yeniden boyutlanmaz/yer değiştirmez. Gezinme inset'i de tüketilir, WebView/CSS bu boşluğu yeniden ekleyemez. Klavye açılınca yalnız IME yüksekliği alt alanı daraltır, yazma engellenmez. Şeffaf çubuklar kenar kaydırmasıyla geçici açılır; oyuna dokunup bırakınca veya odak geri gelince yeniden gizlenir. OS/OEM erişilebilirlik politikaları şeffaflığı/gizlenmeyi sınırlayabilir; sistem gezinmesi kalıcı engellenmez. Bu karar 3 Ekim'deki önceki üst+alt kalıcı boşluk politikasının yerine geçer.

APK, Capacitor ile paketlenmiş **hibrit uygulamadır**: HTML/CSS/JavaScript oyun arayüzü APK içindeki yerel varlıklardan Android WebView'da çalışır; hesaplar, eşleştirme ve diğer API çağrıları HTTPS/WSS ile sunucuya bağlanır. `server.url` ile uzaktaki web sitesini açan bir paket değildir. Android WebView'ın Chrome user-agent bilgisi tarayıcı oturumu anlamına gelmez. Native oturum adı artık `ANDROID · GRIDSHARD` (iOS için `IOS · GRIDSHARD`), gerçek web tarayıcısı ise `WEB · Chrome/Edge/Safari` olarak kaydedilir. Yeni oturum açılırken mevcut cihaz kimliği korunarak adı güncellenir; uygulamayı/veriyi silmek gerekmez.

Kaynaklar: [Android immersive mode](https://developer.android.com/develop/ui/views/layout/immersive), [edge-to-edge ve üç düğmeli gezinme kontrastı](https://developer.android.com/develop/ui/views/layout/edge-to-edge).

Ses yöneticisi görünürlük, sayfadan ayrılma ve yerel uygulama odak kaybında müzik ile efektleri durdurur; öne gelince mevcut oyun ekranının müziğini yeniden başlatır. Yeni APK için mobil web paketini yeniden derleyip `cap sync android` ve `assembleDebug` çalıştırmak gerekir; eski APK bu değişiklikleri taşımaz. Gerçek cihaz kontrolü: soğuk açılışta iki sistem çubuğu gizli, Ana Ekran/Son Uygulamalar veya bildirim paneline geçince müzik sessiz, geri dönünce müzik tekrar duyulur; savaş, giriş ve klavye ekranlarında kesilme/taşma ayrıca gözlenir.

Kaynaklar: [Capacitor CLI kancaları](https://capacitorjs.com/docs/cli/hooks), [Android activity yönü](https://developer.android.com/guide/topics/manifest/activity-element#screen), [Apple desteklenen yönler](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportedinterfaceorientations), [iPad tam ekran davranışı](https://developer.apple.com/documentation/bundleresources/information-property-list/uirequiresfullscreen).

1. Gerçek paket kimliğiyle bir kez `pnpm mobile:add:android` çalıştırın ve oluşan `android/` projesini depoya ekleyin.
2. `pnpm mobile:sync:android` ile web paketini eşitleyin.
3. Android Studio/Gradle üzerinden release keystore ile imzalı `.aab` üretin. Google Play yeni uygulamalarda Play App Signing kullanır.
4. GitHub'daki `GRIDSHARD Real Mobile Device Gate` iş akışını çalıştırın; `android-chrome.json` kanıtının `passed: true`, `device_kind: real`, aynı commit SHA değerinde olduğunu ve `performance` özetinin [savaş performans bütçesini](PERFORMANCE_BUDGET.md) geçtiğini doğrulayın.
5. Yükleme öncesi kapıyı çalıştırın:

```powershell
python tools/mobile_release_gate.py --stage android `
  --artifact path/to/gridshard-release.aab `
  --device-evidence qa_reports/device_evidence/android-chrome.json
```

6. Kapı `ready: true` üretirse AAB'yi önce Google Play kapalı test kanalına yükleyin. Kapalı test sonucu şu şemayla `qa_reports/store_evidence/android-closed-test.json` olarak kaydedilir:

```json
{
  "schema_version": 1,
  "stage": "android_closed_test",
  "passed": true,
  "app_id": "com.gridshardgame.app",
  "commit_sha": "tam-git-sha",
  "play_release_name": "2.1.0-beta.72",
  "completed_at": "ISO-8601"
}
```

Yeni kişisel Google Play hesaplarında üretim erişimi için en az 12 test kullanıcısının 14 gün boyunca kesintisiz katılımı gerekebilir. Hesap türünüzdeki güncel koşulu Play Console'dan doğrulayın.

## 2 — iOS / TestFlight

Bu aşama yalnız başarılı Android kapalı test kanıtından sonra başlar.

1. macOS/Xcode ortamında aynı paket kimliğiyle bir kez `pnpm mobile:add:ios` çalıştırın ve `ios/` projesini depoya ekleyin.
2. `pnpm mobile:sync:ios` çalıştırın; Apple signing certificate ve provisioning profile ile imzalı `.ipa` arşivi üretin.
3. Gerçek cihaz iş akışının `iphone-safari.json` kanıtını aynı commit için üretin.
4. TestFlight kapısını çalıştırın:

```powershell
python tools/mobile_release_gate.py --stage ios `
  --artifact path/to/gridshard.ipa `
  --device-evidence qa_reports/device_evidence/iphone-safari.json `
  --android-closed-test-evidence qa_reports/store_evidence/android-closed-test.json
```

5. Kapı `ready: true` üretirse build'i App Store Connect'e yükleyin; önce iç test grubu, ardından gerekiyorsa Apple beta incelemesinden geçen dış grup kullanın.

## Bu depoda otomatik olanlar / dış bağımlılıklar

- Otomatik: statik mobil paket, API yönlendirme, auth/WebSocket adresleme, CORS yapılandırması, Android/iPhone tarayıcı matrisi, gerçek cihaz kanıt şeması ve sıralı yayın kapısı.
- Dış bağımlılık: üretim HTTPS backend'i, sağlayıcı ayarları, imza anahtarları/provisioning, gerçek tester grupları ve mağaza panelindeki yükleme/onay işlemleri. Android paket kimliği seçildi; Apple uygulama kaydı ve provisioning henüz doğrulanmadı.
- Para kazanma: ürün, sunucu doğrulaması ve iade kodu eklendi; bildirim kurulumu ve gerçek cihaz denemesi yayından önce tamamlanmalıdır. Mağaza formlarında uygulama içi satın alma ve reklam bulunduğu beyan edilmelidir.

Resmî başvuru kaynakları: [Capacitor kurulumu](https://capacitorjs.com/docs), [Android App Bundle yükleme](https://developer.android.com/studio/publish/upload-bundle), [Google Play test kanalları](https://support.google.com/googleplay/android-developer/answer/9845334), [TestFlight genel bakış](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview).
