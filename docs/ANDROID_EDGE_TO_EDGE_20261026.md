# Android ekran uyumluluğu — 26 Ekim 2026

Kapsam: Play Console'un v10 (2.1.1) için gösterdiği ilk iki ekran önerisi.
İlk değişiklik AGP yükseltmesini veya dikey ekran kısıtlamasını kaldırmayı içermez.
Sonraki SDK araştırması ve kullanıcı isteğiyle yapılan AGP ön incelemesi aşağıdadır.

## Yapılanlar

- [x] `GridshardActivity` içindeki elle çoğaltılmış pencere/çentik/çubuk rengi
  politikası yerine `WindowCompat.enableEdgeToEdge(getWindow())` kullanıldı.
  AndroidX Core 1.17.0 zaten projede vardı; uygulamanın doğrudan kullandığı API
  için `app/build.gradle` dosyasına açık Core bağımlılığı eklendi. Sürüm yükseltilmedi.
- [x] Çağrı `super.onCreate` sonrasında, ilk çizimden ve `getBridge() == null`
  dönüşünden önce yapılır. WebView bulunamayan Capacitor hata ekranı da aynı
  pencere politikasından yararlanır.
- [x] Kamera/üst güvenli alan, klavye açıkken alt boşluk, geçici sistem çubukları,
  koyu zemin, açık renk sistem simgeleri ve tam ekranı geri getirme davranışı korundu.
  Insets için ikinci dinleyici veya CSS dolgusu eklenmedi.
- [x] Asıl kaynak şablonu ve Android kopyası birlikte güncellendi; Capacitor sync
  değişikliği eski haline döndürmez. Kopyalama ve tekrar çalıştırma test edildi.
- [x] Portre kilidi, AGP 8.13.0, Gradle, Capacitor, SDK, R8 kuralları ve versionCode
  değiştirilmedi. Yeni AAB/APK üretilmedi; yükleme, commit veya push yapılmadı.

## İkinci uyarı neden henüz kesin kapanmış sayılmaz?

Uygulama kaynağı artık doğrudan `SHORT_EDGES` yazmıyor. Ancak AndroidX Core'un
resmi `enableEdgeToEdge` uygulaması Android 9–10 için bu uyumluluk değerini,
Android 11+ için `ALWAYS` değerini kullanıyor. Yalnız kaynakta ismi ortadan
kaldırmak, derlenmiş DEX'ten bu dalın kalktığı anlamına gelmez.

Play ekranında görünen `androidx.emoji2.text.b.u`, R8 tarafından taşınmış veya
birleştirilmiş bir metot olabilir. Bu isim emoji SDK'sının kesin hatalı olduğunu
kanıtlamaz. Uyarıyı susturmak için reflection, sayısal sabit, geniş keep kuralı
veya AndroidX kaynak yaması eklenmedi.

- [x] Kullanıcının verdiği `C:\Users\SERVER\Downloads\10.aab` dosyasındaki
  mapping ve gerçek DEX incelendi; aşağıdaki kaynaklar doğrulandı.
- [ ] Sonraki release AAB'si üzerinden kalan çağrıların kaynağı kontrol edilecek.
- [ ] Yeni paket Play'e yüklendikten sonra Console'un ilk iki öneriyi yeniden
  değerlendirmesi görülecek. Yayımlanmış v10 bu kaynak değişikliğiyle değişmez.

### v10 paket incelemesi

Paket salt okunur incelendi, değiştirilmedi veya çalıştırılmadı.

- AAB SHA-256: `6aeffd6b3f346929abdf4f2e06a0c616f87cd85fff20b9b9f6e8cf9364a4dcf9`
- Gömülü mapping: `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`
- Mapping SHA-256: `0b7e6ef8f4d4176c98c9ca8fe1ac56908e2f78484092dbf95548378c72690ec3`

Eşleme:

```text
androidx.emoji2.text.ConcurrencyHelpers$Handler28Impl$$ExternalSyntheticApiModelOutline0
    -> androidx.emoji2.text.b
void m(android.view.WindowManager$LayoutParams) -> u
```

Bu R8 tarafından üretilen sentetik bir API yardımcı metodudur; sınıfın adından
emoji çiziminin hatalı olduğu çıkarılamaz. `base/dex/classes.dex` içindeki `u`
metodunun kod birimleri `1012 1059 0185 000e`: sabit `1` yükler, gerçek field
tablosundaki `WindowManager.LayoutParams.layoutInDisplayCutoutMode` alanına
yazar ve döner. `1`, uyarıdaki `SHORT_EDGES` değeridir.

İki çağıran metodun DEX komut sınırları çözülerek çağrılar ayrıca doğrulandı:

| Paketteki çağıran | Mapping ile gerçek kaynak | Kaynak SDK |
| --- | --- | --- |
| `q3.d.h`, kod birimi ofseti 116 | `com.google.android.gms.ads.internal.overlay.zzm.zzj()` | `com.google.android.gms:play-services-ads:25.4.0` |
| `com.google.android.play.core.hsdp.service.HsdpShimActivity.onCreate`, ofset 27 | Aynı isim | `com.google.android.play:hsdp:2.0.1` |

Sonuç: Console'un verdiği **bu metot** reklam/Play SDK ekranlarınca kullanılıyor.
Bu, pakette başka eski çağrı olmadığı iddiası değildir. Önceki uygulama
aktivitesinde de eski Android uyumluluk dalı vardı. Uygulama aktivitesini
AndroidX'e geçirmek bu iki SDK'nın iç uygulamasını değiştirmez.

`python tools/audit_android_r8.py C:/Users/SERVER/Downloads/10.aab` geçti:
R8 8.13.6, full mode, kod ve kaynak optimizasyonu açık, metadata/DEX checksumları
eşleşiyor, runtime annotation ve metotlarıyla dokuz plugin doğrulanıyor.
Bu statik sonuç gerçek cihazda ödeme/reklam testi veya RAM ölçümü değildir.

Google'ın reklam SDK sürüm notlarında 25.5.0 bulunuyor, ancak bu çentik
çağrısının giderildiğine dair açık bir not yok. Kör sürüm değişikliği yapılmadı;
SDK güncellemesi aday paketin DEX denetimi ve reklam/Play dönüş cihaz testiyle
birlikte ele alınmalı. SDK sınıfları silinmedi, bytecode yaması veya uyarıyı
saklayan keep/reflection hilesi uygulanmadı. İkinci öneri henüz kapalı değildir.

### SDK güncelleme adayları — inceleme tamamlandı

- [x] Google Maven metadata'sı doğrudan kontrol edildi: reklam SDK'sının kararlı
  son sürümü **25.5.0**, Play Games v2'nin **22.1.0**, HSDP'nin **2.2.0**.
- [x] Resmi AAR/POM dosyaları yalnız Git dışı
  `artifacts/sdk-screen-audit-20261026` klasörüne indirildi. AAR'ların
  `classes.jar` içeriği JDK 17 `javap -c -p` ile okundu; SDK kodu çalıştırılmadı.
- [x] Reklam 25.4.0/25.5.0 ve HSDP 2.0.1/2.2.0 bytecode'u karşılaştırıldı.
- [x] Geçişin hedef uyarıyı düzeltmediği görüldüğünden SDK sürümleri değiştirilmedi.

| Bileşen | Mevcut / aday | Gerçek derlenmiş kod sonucu |
| --- | --- | --- |
| Google Mobile Ads | 25.4.0 → 25.5.0 | Her ikisinde de `zzm.zzj()` içinde `layoutInDisplayCutoutMode = 1` var; aynı `28 <= SDK_INT <= 34` koşulu altında. Yeni sürüm bu çağrıyı kaldırmıyor. |
| Play Games v2 | 22.1.0 | Zaten son kararlı sürüm; bu uyarı için yükseltme yok. |
| HSDP | 2.0.1 → 2.2.0 | Her ikisinde de `HsdpShimActivity.onCreate()` Android 28+ için `layoutInDisplayCutoutMode = 1` yazıyor. Son sürüm de düzeltmiyor. |

**Bağımlılık zinciri ayrıca doğrulandı:** v10'daki HSDP, Play Games veya ödeme
eklenti sürümünden değil, reklam SDK'sının alt bağımlılığından geliyor:

```text
play-services-ads:25.4.0
  -> play-services-ads-api:[25.4.0]
     -> com.google.android.play:hsdp:2.0.1

play-services-ads:25.5.0 (aday)
  -> play-services-ads-api:[25.5.0]
     -> com.google.android.play:hsdp:2.0.1 (aynı)
```

Kaynak POM'lar Google Maven'dan okundu. Bu nedenle Play Games sürümünü
değiştirmek reklam ekranındaki bu iki çağrıyı kaldırmaz; HSDP'yi 2.2.0'a
zorlamak da uyarıyı çözmeden SDK'nın test edilmiş bağımlılık ağını değiştirir.
Bu tür override uygulanmadı. 25.5.0'ın minSdk 24 gereksinimi projeyle uyumlu
olsa da bu, uyarının giderildiği veya cihazda reklamların test edildiği anlamına gelmez.

İncelenen AAR SHA-256 değerleri:

```text
play-services-ads-25.4.0  fc18d3cde6dec8c927cac5048b2dfff1fbe377a15474805a643b723d1e850219
play-services-ads-25.5.0  9c27b4a694954e13b4f60c071f894e579340452e250056fa43a1768ca93ddb29
hsdp-2.0.1               5e57065e411d985f4e4eb0cd028c617c3a5d3bf836d20fc524ec23a0df39af75
hsdp-2.2.0               39e1e335b512c66b166fd6c74e360a480564541745c57ad4a89bdb581d0bdcdd
```

Tekrar inceleme (Windows JDK `javap`):

```powershell
javap -c -p -classpath artifacts/sdk-screen-audit-20261026/play-services-ads-25.5.0-classes.jar com.google.android.gms.ads.internal.overlay.zzm
javap -c -p -classpath artifacts/sdk-screen-audit-20261026/hsdp-2.2.0-classes.jar com.google.android.play.core.hsdp.service.HsdpShimActivity
```

Karar: **mevcut kararlı SDK güncellemeleri bu uyarıyı kapatmıyor**. SDK iç
koduna yama yapılmayacak, reklam/Play bileşenleri uyarıyı gizlemek için
silinmeyecek. İlgili resmi SDK düzeltmesi ve ardından aday AAB/Play kontrolü
beklenmeli. SDK ailesini bütünüyle değiştirmek bu küçük güncellemeden ayrı,
reklam/onay/ödül akışlarının yeniden doğrulanmasını gerektiren bir geçiştir.
AGP ve portre ayarları bu incelemede de korunmuştur.

## AGP 9 geçişi — ön inceleme

Kullanıcının sonraki isteği üzerine mevcut Capacitor 8 eklentileri, Gradle
ayarları, makine araçları ve resmi geçiş dokümanları okundu. **Bu bölüm
uygulanmış bir AGP yükseltmesi değildir**; aktif AGP/Gradle/SDK sürümleri korunuyor.

### Doğrulanan geçiş noktaları

- [x] Ana proje AGP 8.13.0 / Gradle 8.14.3 kullanıyor.
- [x] Resmi AGP 9.2 belgelerinde 9.2.1 düzeltmesi bulunuyor; 9.2 ailesi
  Gradle **9.4.1** ve SDK Build Tools **36.0.0** istiyor. AGP'nin asgari JDK'sı
  17 olsa da projenin Capacitor/Java kaynak hedefi **21**; proje için JDK 21 gerekli.
- [x] AdMob 8.1.0 eklentisi `kotlin-android` / `kotlinOptions` kullanıyor.
  AGP 9'un varsayılan built-in Kotlin ve yeni DSL politikasıyla olduğu gibi
  uyumlu varsayılamaz. Capacitor 8'i koruyan geçici yol, resmi dokümandaki
  `android.builtInKotlin=false` ve `android.newDsl=false` uyumluluk seçeneklerini
  gerçek derlemede doğrulamaktır; bu seçenekler R8'i kapatmaz.
- [x] Aynı AdMob eklentisi `getDefaultProguardFile('proguard-android.txt')`
  çağırıyor. AGP 9 bu dosyayı varsayılan olarak reddediyor. Geçişte dar,
  sürüm kontrollü ve sync sonrası tekrarlanabilir bir düzenlemeyle
  `proguard-android-optimize.txt` kullanılmalı; global optimizasyon kapatılmamalı.
- [x] Eklentilerin buildscript'lerinde 8.13.x AGP bildirimleri var. Ana proje
  ile classpath çözümlemesi gerçek Gradle koşusunda kontrol edilmeli.
  Kör toplu `node_modules` değiştirme veya pnpm-store inode'una yazma yapılmadı.
- [x] Mevcut CI web/sunucu/tarayıcı testlerini çalıştırıyor; Android native
  release derlemesi yapmıyor. Yeşil CI tek başına AGP geçişini doğrulamaz.
- [x] `capacitor.settings.gradle` oluşturulmuş dosyasında eski 8.5.0 pnpm
  yolları var; kurulu paketler 8.5.1. Elle yol yazmak yerine normal build/sync
  adımının yeniden üretmesi gerekir; bu incelemede sync/build başlatılmadı.

### Bu makinedeki doğrulanmış engel

`Resolve-GridshardAndroidToolchain` mevcut ortamda `JDK 21 or newer is required`
ile duruyor. `JAVA_HOME` JDK 17.0.20'yi gösteriyor. Standart Android SDK
klasörü var fakat yalnız platform **android-35** ve Build Tools **35.0.1** kurulu.
`platforms/android-36/android.jar`, `build-tools/36.0.0/aapt.exe` ve
`apksigner.bat` yok. `cmdline-tools/latest/bin/sdkmanager.bat` mevcut.

Bu eksikleri kurmadan burada geçişi gerçek derlemeyle doğrulayamıyoruz.
Sistem araçları kurulmadı, PATH/JAVA_HOME kalıcı değiştirilmedi, Android
lisansları kullanıcı adına kabul edilmedi. JDK 21 ve Android 36/Build Tools
36.0.0 kurulumu veya bunların kurulu olduğu makineye geçiş için kullanıcı yönü gerekli.

### Uygulama sırası (henüz açık)

- [ ] Kullanıcının seçtiği JDK 21 / Android 36 araç ortamını hazırla.
- [ ] AGP/Gradle çiftini ve Capacitor 8 için gereken geçici Kotlin/DSL uyumluluğunu
  birlikte uygula. Portre, API hedefi, ödeme/reklam kimlikleri ve sürüm kodu korunacak.
- [ ] AdMob ProGuard uyumluluğunu otomatik sync sırasında tekrarlanabilir hale getir.
- [ ] Native sync, bağımlılık çözümlemesi ve debug derlemesiyle yapılandırmayı doğrula.
- [ ] Kullanıcının mevcut imzalama ortamında release AAB üret; R8/plugin audit'ini
  çalıştır, yeni optimizer metadata ve mapping'i arşivle. Anahtar yenilenmez.
- [ ] Release cihazda giriş, reklamdan dönüş, satın alma ve savaş ekranını doğrula.
- [ ] Sonraki versionCode ile Play test kanalında R8 önerisinin durumunu kontrol et.

SDK kaynaklı ikinci öneri AGP yükseltmesiyle otomatik çözülmüş sayılmayacak.
Reklam SDK ailesini değiştirmek ise bu uyumluluk geçişinden daha büyük ve ayrıca
onay/onaylı akış testleri gerektiren bir iştir; bu incelemede başlatılmadı.

## Doğrulama

Otomatik: `client` klasöründen:

```powershell
node --test tests/native-display.test.js tests/native-orientation.test.js tests/native-branding.test.js
```

Testler: tek edge-to-edge başlangıcı, WebView yokken de pencere yapılandırması,
Core sürümü/bağımlılığı, eski uygulama çağrılarının tekrar eklenmemesi, şablon
eşitliği, sync idempotansı, kamera/klavye dolgusu ve portre kilidi.
Kaynak testleri Android cihaz testinin yerine geçmez.

26 Ekim sonuçları: ilgili 17 test geçti. Tam istemci koşusunda 744 testten
743'ü geçti; tek hata `native-billing-diagnostics.test.js` içindeki fixture
hardlink oluşturulurken Windows sandbox'ın verdiği `EPERM` hatasıydı.
Ödeme kodu veya bu test değiştirilmedi. Tam çıktı yerel, Git dışı
`artifacts/edge-to-edge-20261026.tap` dosyasındadır. `git diff --check` temizdir.

Bu bilgisayarda varsayılan Android Studio JDK ve Android SDK 36 bulunmadığından
native derleme/cihaz doğrulaması yapılmadı. Var olan derleme düzeni değiştirilmedi.

### Cihaz kontrolü (açık)

- [ ] Android 9/10 çentikli telefon: üst alan ve tam ekran.
- [ ] Android 14, 15 ve 16: hareketle ve üç düğmeyle gezinme, dock'a erişim.
- [ ] Sistem çubuklarını kaydırarak göster/gizle: devre ve dock yer değiştirmemeli.
- [ ] Sohbet/giriş klavyesi aç/kapat: alan yalnız klavye açıkken küçülmeli.
- [ ] Arka plana al/geri dön, OAuth ve reklamdan geri dön: tam ekran geri gelmeli.
- [ ] Giriş, eğitim, mağaza, bilgi pencereleri ve savaş: çentik altında içerik kalmamalı.

## Resmi kaynaklar

- [WindowCompat.enableEdgeToEdge — Core 1.17.0](https://developer.android.com/reference/androidx/core/view/WindowCompat#enableEdgeToEdge(android.view.Window))
- [Uçtan uca görüntüleme](https://developer.android.com/develop/ui/views/layout/edge-to-edge)
- [AndroidX WindowCompat uygulaması](https://github.com/androidx/androidx/blob/androidx-main/core/core/src/main/java/androidx/core/view/WindowCompat.java)
- [DEX komut biçimleri](https://source.android.com/docs/core/runtime/dalvik-bytecode)
- [Google Mobile Ads sürüm notları](https://developers.google.com/admob/android/rel-notes)
- [Google Maven: reklam sürümleri](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-ads/maven-metadata.xml)
- [Google Maven: Play Games v2 sürümleri](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-games-v2/maven-metadata.xml)
- [Google Maven: HSDP sürümleri](https://dl.google.com/dl/android/maven2/com/google/android/play/hsdp/maven-metadata.xml)
- [Reklam 25.5.0 API bağımlılıkları](https://dl.google.com/dl/android/maven2/com/google/android/gms/play-services-ads-api/25.5.0/play-services-ads-api-25.5.0.pom)
- [AGP 9.2 uyumluluk tablosu ve 9.2.1 düzeltmesi](https://developer.android.com/build/releases/agp-9-2-0-release-notes)
- [AGP 9 DSL/ProGuard davranışları](https://developer.android.com/build/releases/agp-9-0-0-release-notes)
- [Built-in Kotlin geçişi ve geçici opt-out](https://developer.android.com/build/migrate-to-built-in-kotlin)
