# Android 2.1.1 / versionCode 10 — R8

Bu sürüm yalnız Android paketleme ve doğrulamasını değiştirir. Sunucu API'si,
web istemcisi ve görünen sürüm 2.1.1 kalır; canlı sunucuyu yeniden dağıtmak veya
hesap/sezon geçişini tekrarlamak gerekmez. Önceki Android paketi versionCode 9'dur.

## Etkin ayarlar

- Release: `minifyEnabled true`, `shrinkResources true`.
- `proguard-android-optimize.txt` kullanılır; optimizasyonu kapatan eski varsayılan kullanılmaz.
- AGP 8.13 için `android.r8.optimizedResourceShrinking=true`.
- Capacitor 8.5.1 korunur. 8.5.4'ü bekleyen dar annotation/callback koruma kuralları
  uygulama ProGuard dosyasında upstream'den alınmıştır; geliştirme sürümüne geçilmez.
- Play Games ve reklam güvenliği köprülerinin `getIdentifier` ile bulduğu kaynaklar
  `res/raw/gridshard_keep.xml` içinde korunur. Bütün SDK paketlerini tutan yeni bir kural eklenmez.

Kaynaklar:
[Android R8](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization),
[Capacitor upstream kuralları](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/proguard-rules.pro),
[DEX biçimi](https://source.android.com/docs/core/runtime/dex-format).

## Gerçek paket denetimi

`tools/audit_android_r8.py` AAB içindeki R8 metadata'sında optimizasyon,
obfuscation, shrinking, full mode ve birleşik kaynak küçültmesini doğrular.
Metadata'daki DEX checksumları paketteki gerçek DEX ile eşleşmelidir.

DEX class definition ve annotation tablolarından, plugin kayıt dosyasındaki
sınıfların, kurucuların ve runtime `CapacitorPlugin` annotation'larının kaldığı
kontrol edilir. NativePurchases, SecureStorage, Play Games, reklam güvenliği ve
SystemBars köprüleri dahil dokuz dinamik plugin doğrulanır. Yalnız string içinde
sınıf adı bulunması başarılı sayılmaz. Kritik ödeme ve oturum metotları ayrıca kontrol edilir.

Üretim derleme aracı bu kontrolü otomatik çalıştırır. İmzalı paket denetimi
ayrıca APK kaynak tablosunda dinamik isimlerin kaldığını doğrular ve sonucu
`release-audit.json` / `r8-audit.json` olarak kaydeder.

İlk adayda DEX 19.628.060 bayttan 5.595.556 bayta indi. Bu Android kod boyutudur;
oyunun WebView çizim FPS'si veya toplam RAM kazancı olarak yorumlanamaz.

## Yayın dosyaları

Nihai dosyalar son commit CI'si yeşil olduktan sonra yeniden derlenir.
İmzalı AAB/APK yanında `mapping.txt` ve optimizer raporları aynı versionCode ile
arşivlenir. Mapping AAB'nin `BUNDLE-METADATA` bölümünde de bulunur; Play native
çökme raporlarının çözümlenmesinde kullanır. Bu metadata kurulu uygulama kodu değildir.

Statik paket kontrolü cihaz testi yerine geçmez. Gerçek Play Games hesabı ve
Google Play ödeme/iade akışı kapalı test veya lisans-test cihazında doğrulanmalıdır.
Yayın yüklemesini kullanıcı yapar.
