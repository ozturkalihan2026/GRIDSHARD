# Android Billing ana iş parçacığı düzeltmesi — 11 Ekim 2026

Durum: kaynak düzeltmesi ve yerel doğrulama hazır; commit/push, CI, yeni
APK/AAB, Play yayını ve düzeltilmiş pakette gerçek cihaz testi yapılmadı.
Kullanıcı yalnız bu düzeltme ve testlerin hazırlanmasını onayladı.

## Kanıt ve sınır

v7'de 11 Ekim 19:58 TR cihaz kaydı: Sezon Geçişi ve 9000 DK için taze ürün
sorgusu başarılı, ödeme başlatma sonucu 0, ardından callback 4
`ITEM_UNAVAILABLE`, satın alma sayısı 0. `Launching billing flow` satırları
ana thread dışında, callback ana thread üzerinde. Başka v7 telefon ve
lisans-test hesabında 120 Akı aynı hatası insan tarafından bildirildi.

[Google entegrasyon kılavuzu](https://developer.android.com/google/play/billing/integrate#launch)
ödeme başlatmanın ana iş parçacığında yapılmasını ister. Aynı native SDK
çağrı kodu çalışan v6'da da vardı: sözleşme ihlali doğrulanmıştır, fakat
`ITEM_UNAVAILABLE` hatasının kesin nedeni olduğu henüz kanıtlanmamıştır.
Bu düzeltme kontrollü, tek değişkenli bir sonraki cihaz testi içindir.

## Değişiklik

`tools/configure-native-billing.js`, sabitlenen native-purchases 8.8.1 /
Billing 9.1.0 kaynağının yalnız mevcut launch bloğunu dönüştürür:

- Aynı Activity ve önceden oluşturulmuş BillingFlowParams kullanılır.
- Launch, `Activity.runOnUiThread` içinde bir kez yapılır.
- Ürün/teklif/hesap kimlikleri, adet, fiyat, sonuç kodları, receipt callback,
  grant/consume/ack akışı ve iade politikası değiştirilmez.
- Kaynak şablonu/sürüm değişirse patch işlemi yazmadan önce durur.
- Sync tekrarında aynı sonuç üretilir; pnpm paylaşılan hard-link inode'u
  değiştirilmez, yalnız workspace girdisi atomik olarak yenilenir.

Generated node_modules dosyası commit edilmez. Reprodüksiyon için managed
patch ve iki test dosyası commit'e dahil edilmelidir; yeni test dosyası
`client/tests/native-billing-main-thread.test.js` henüz untracked'dir.
İlgisiz mevcut yerel düzenlemeler korunmuştur.

## Doğrulama

- 27 odaklı ödeme/politika testinin tamamı geçti.
- Son test kaynağıyla tüm istemci testleri: 295 geçti, 0 hata, 0 atlama.
- JVM queued-Activity fixture: 10 ürün × 4 launch sonucu × 2 çağıran thread
  olmak üzere 80 kontrol geçti. Eski bloğun worker thread üzerinde aynı
  sözleşmeyi ihlal ettiği negatif kontrol de doğrulandı.
- Gerçek Android SDK 36 / Billing 9.1.0 ile yalnız native module
  `compileDebugJavaWithJavac` ve `compileReleaseJavaWithJavac` başarılı.
- JavaScript sözdizimi ve `git diff --check` başarılı.
- Generated kaynağın yalnız launch bölgesi değiştiği ters dönüşümle ve
  ikinci sync'in idempotent olduğu SHA/eşitlik kontrolüyle doğrulandı.

İlk test çalışmasında sandbox hard-link EPERM ve yeni Java fixture'ın eksik
Log import'u vardı. Fixture import'u düzeltildi, hard-link testi normal
yetkilerle geçti. İlk Android derlemesi SDK yolu tanımsız olduğu için durdu;
yalnız komutun geçici ANDROID_HOME ortamı ayarlandı, proje ayarı değiştirilmedi.
Bu ilk denemeler gerçek mağaza/oyun arızası veya geçen ödeme testi değildir.

## Sonraki yayın kapıları

Commit/push kullanıcıda kalır. Ardından CI doğrulanmalı, değiştirilmiş native
kod yeni sürüm kodlu AAB'ye dahil edilmeli ve kullanıcı Play üzerinden
teslim etmelidir. Bu adımlara mevcut hazırlama onayıyla başlanmadı.

Yeni paket kurulduğunda önce ödeme ekranı açma/iptal testi, güvenli logda
launch ana-thread doğrulaması ve code4 kontrolü yapılmalı. Ücretsiz lisans
testi ibaresi görülmeden son ödeme onayına basılmamalı. İade kuralı ve mevcut
veriler korunur; sunucu/site yayını bu düzeltme için değiştirilmedi.

Yerel testler ve Android derlemesi Google Play satın alımının geçtiğini
kanıtlamaz. Mevcut v7 telefonlar bu kaynak düzeltmesini henüz içermiyor.
