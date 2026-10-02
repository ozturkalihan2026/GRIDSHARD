# GRIDSHARD Mobil Yayın Akışı

Bu akış sıra kilitlidir: **Android gerçek cihaz → Google Play kapalı test → iPhone gerçek cihaz → TestFlight**. Android kapalı test kanıtı olmadan iOS yayın kapısı açılmaz.

## Bir kez verilecek ürün kararları

1. Kalıcı Android paket kimliği **`com.gridshardgame.app`** olarak seçildi; kullanıcı 2 Ekim 2026'da bu kimlikle Play Console uygulama oluşturma adımını tamamladığını bildirdi. Capacitor varsayılanı, `GRIDSHARD_APP_ID` ve sunucunun `GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME` ayarı aynı kimliği kullanmalıdır. `com.example.gridshard` yayın için bilerek reddedilir. Bu kayıt, mağazada yayın veya üretim erişimi onayı değildir.
2. HTTPS üretim API adresini hazırlayın (`GRIDSHARD_API_BASE_URL`). Mobil paket backend'i içine gömmez; yalnız bu adresi runtime yapılandırmasına yazar.
3. Backend'de `GRIDSHARD_CORS_ORIGINS=https://localhost,capacitor://localhost` değerini ayarlayın.
4. Google Play Console, Apple Developer/App Store Connect ve BrowserStack kimliklerini GitHub secrets olarak tanımlayın.

## Uygulama içi satın alma karar kapısı

Ücretli sezon geçişi, Savaş Premium ve Akı/Devre Kredisi paketlerinin gerçek para akışı ile savaş sonu ödüllü reklam kodu eklendi. Sunucuda Google Play ve App Store makbuz doğrulaması, tekil teslim, Google Play tüketimi, AdMob SSV ve iade/iptal bildirimleri bulunur. Kurulum ayrıntıları: [Mağaza ve satın alma](STORE_PURCHASES.md). **Kodun eklenmesi gerçek satın almanın yayına hazır olduğu anlamına gelmez.**

Yayından önce Pub/Sub ve App Store bildirim adresleri kurulup denenmeli; native eklentiler Sandbox/lisans hesabıyla gerçek cihazda doğrulanmalı; bölgesel fiyat, vergi ve çocuk/ebeveyn politikaları tamamlanmalıdır. Üretimde `GRIDSHARD_PURCHASE_TEST_MODE` ve `GRIDSHARD_AD_TEST_MODE` kapalı olmalıdır. Mağaza formlarında uygulama içi satın alma ve reklam beyan edilmelidir.

Paket kimliği mağazada uygulama kaydı oluşturulduktan sonra değiştirilmemelidir. Android kimliği artık kesinleşti; bu karar tek başına native proje, imzalı AAB veya mağaza yayını üretmez. Gerçek HTTPS API, sağlayıcı ve imza ayarları tamamlanıp doğrulanmalıdır. `GRIDSHARD_LOCAL_DEBUG=1` ile üretilen yerel proje mağazaya yüklenmez.

## Geçici yerel Android denemesi (mağazaya yüklenmez)

`GRIDSHARD_LOCAL_DEBUG=1` yalnız Git tarafından yok sayılan `.mobile-debug/android/` projesini `com.gridshard.localdebug` kimliğiyle üretir. Bu kimlik üretim hesabı veya önceki test hesaplarıyla paylaşılmaz; yayın kimliği değildir. HTTP/karma içerik izni yalnız bu modda açılır ve Android yedeği kapatılır. Özel imza anahtarı depoya veya web varlıklarına kopyalanmaz; Gradle standart yerel debug imzasını kullanır.

```powershell
$env:GRIDSHARD_LOCAL_DEBUG="1"
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

```powershell
$env:GRIDSHARD_APP_ID="com.gridshardgame.app"
$env:GRIDSHARD_API_BASE_URL="https://api.gridshard.example"
pnpm build:mobile:web
```

Komut web yayınıyla aynı üretim hattını kullanır (`tools/build-client.js`, ayrıntı: [Üretim istemci paketi](CLIENT_BUILD.md)). JS ve CSS'yi içerik özetli tek pakete derler, `dist/` içine yalnız izin verilen varlıkları kopyalar ve HTTPS API adresini ayrı `dist/runtime-config.js` dosyasına yazar. Önce `pnpm install --frozen-lockfile --ignore-scripts` ile sabit `esbuild` kurulmalıdır. HTTP adresleri ancak açık yerel geliştirme bayrağıyla kabul edilir; mağaza adayı için kabul edilmez.

### Mobil ses biçimleri

Paketten önce `python tools/encode_mobile_audio.py` ile OGG/AAC türevleri üretilir (ffmpeg gerekir). `pnpm build:mobile:web` türevi doğrulanan WAV'ları pakete almaz; WAV türevinden yeniyse veya türev eksik/bozuksa durur. Ayrıntı: `docs/AUDIO_DIRECTION.md` §19.

## 1 — Android kapalı test

### Yerel portre yönü

`mobile:add:android` / `mobile:add:ios` komutları yerel proje üretildikten sonra `tools/configure-native-orientation.js` aracını uygular. Sonraki `cap sync` işlemlerinde aynı araç `capacitor:sync:after` kancasıyla tekrar çalışır. İşlem tekrar çalıştırılabilir; uygulama kimliği, izinler ve diğer etkinlikler değiştirilmez.

- Android: yalnız `MainActivity` için `android:screenOrientation="portrait"`.
- iPhone/iPad: `UISupportedInterfaceOrientations` ve `UISupportedInterfaceOrientations~ipad` yalnız portre; eski iPad sürümleri için `UIRequiresFullScreen=true`.
- Proje dosyası yoksa veya beklenmeyen bir şablon varsa komut açık hata verir; kilit uygulanmış gibi devam etmez.
- Bu ayar web tarayıcısının yönünü zorla kilitlemez. Yeni Android büyük ekran/pencere modları ile yeni iPad pencere davranışları yön talebini geçersiz kılabilir; duyarlı CSS korunmalıdır. Telefon dönüşü ve güvenli alan doğrulaması gerçek cihazda ayrıca yapılmalıdır.

### Tam ekran ve arka plan sesi

Capacitor 8'in yerleşik `SystemBars` ayarı uygulama açılırken üst durum ve alt gezinme çubuklarını gizler. İstemci `viewport-fit=cover` ile kullanılabilir alanı doldurur ve uygulama odağa dönünce çubukları yeniden gizler. Android'in sistem kenar kaydırmasıyla çubukları geçici göstermesi normaldir; sistem gezinmesi kalıcı olarak engellenmez.

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
