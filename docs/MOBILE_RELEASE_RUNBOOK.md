# GRIDSHARD Mobil Yayın Akışı

Bu akış sıra kilitlidir: **Android gerçek cihaz → Google Play kapalı test → iPhone gerçek cihaz → TestFlight**. Android kapalı test kanıtı olmadan iOS yayın kapısı açılmaz.

## Bir kez verilecek ürün kararları

1. Kalıcı paket kimliğini seçin (`GRIDSHARD_APP_ID`, ör. `com.sirket.gridshard`). `com.example.gridshard` yayın için bilerek reddedilir.
2. HTTPS üretim API adresini hazırlayın (`GRIDSHARD_API_BASE_URL`). Mobil paket backend'i içine gömmez; yalnız bu adresi runtime yapılandırmasına yazar.
3. Backend'de `GRIDSHARD_CORS_ORIGINS=https://localhost,capacitor://localhost` değerini ayarlayın.
4. Google Play Console, Apple Developer/App Store Connect ve BrowserStack kimliklerini GitHub secrets olarak tanımlayın.

Paket kimliği mağazada uygulama kaydı oluşturulduktan sonra değiştirilmemelidir. Bu nedenle `android/` ve `ios/` projeleri, gerçek kimlik kesinleşmeden depoya üretilmez.

## Ortak mobil web paketi

```powershell
$env:GRIDSHARD_APP_ID="com.sirket.gridshard"
$env:GRIDSHARD_API_BASE_URL="https://api.gridshard.example"
pnpm build:mobile:web
```

Komut `client/` içeriğini `dist/` altına kopyalar ve yalnız üretilen `dist/runtime-config.js` içine HTTPS API adresini yazar. HTTP adresleri ancak açık yerel geliştirme bayrağıyla kabul edilir; mağaza adayı için kabul edilmez.

## 1 — Android kapalı test

1. Gerçek paket kimliğiyle bir kez `pnpm mobile:add:android` çalıştırın ve oluşan `android/` projesini depoya ekleyin.
2. `pnpm mobile:sync:android` ile web paketini eşitleyin.
3. Android Studio/Gradle üzerinden release keystore ile imzalı `.aab` üretin. Google Play yeni uygulamalarda Play App Signing kullanır.
4. GitHub'daki `GRIDSHARD Real Mobile Device Gate` iş akışını çalıştırın; `android-chrome.json` kanıtının `passed: true`, `device_kind: real` ve aynı commit SHA değerinde olduğunu doğrulayın.
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
  "app_id": "com.sirket.gridshard",
  "commit_sha": "tam-git-sha",
  "play_release_name": "2.0.0-beta.34",
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
- Dış bağımlılık: kalıcı bundle id kararı, üretim HTTPS backend'i, mağaza hesapları, imza anahtarları/provisioning, gerçek tester grupları ve mağaza panelindeki yükleme/onay işlemleri.

Resmî başvuru kaynakları: [Capacitor kurulumu](https://capacitorjs.com/docs), [Android App Bundle yükleme](https://developer.android.com/studio/publish/upload-bundle), [Google Play test kanalları](https://support.google.com/googleplay/android-developer/answer/9845334), [TestFlight genel bakış](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview).
