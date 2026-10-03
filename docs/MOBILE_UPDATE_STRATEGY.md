# Mobil güncelleme değerlendirmesi

3 Ekim 2026: Kullanıcı açılışta “Veriler güncelleniyor” ile güncelleme istediğini değerlendirmemizi istedi; ardından önce **ödüllü reklam** işini seçti. Bu belge karar notudur, OTA güncelleyici uygulanmadı ve yeni hizmet satın alınmadı.

## Şu an

`capacitor.config.js` içindeki `webDir: "dist"` oyun arayüzünün APK içinde yerel HTML/CSS/JavaScript olarak taşındığını gösterir. `server.url` yoktur. HTTPS backend ayrı çalışır. Dolayısıyla sunucu düzeltmeleri için APK gerekmez; mevcut paketin yerel arayüz dosyalarını sunucuda değiştirmek telefondaki kopyayı değiştirmez. r7'de uzaktan web paketini kuran bir güncelleyici bulunmaz.

| Değişiklik | Dağıtım yolu |
| --- | --- |
| Sunucu mantığı, mevcut API'nin sunduğu denge/hesap verisi | Uyumlu backend yayını; yeni APK gerekmez |
| Yerel arayüz/metin/görsel/JS düzeltmesi | Şimdi yeni APK; ileride uyumlu ve doğrulanmış web paketleri için kontrollü OTA değerlendirilebilir |
| Native SDK, izin, imza, Android sistem çubuğu davranışı | Yeni APK/AAB ve mağaza güncellemesi |

## Ertelenen tasarım

İlk kez eklenecek güncelleyici için bir yeni native paket gerekir. Uygulama başlangıcında kısa süreli HTTPS manifest kontrolü yapar; yeni sürüm yoksa veya ağ erişimi başarısızsa mevcut doğrulanmış paketle devam eder. Güncelleme varsa açık durum/ilerleme gösterilir. Tam indirilen paket imza, dosya özeti, boyut, sürüm ve native/API uyumluluğu doğrulamalarından sonra atomik olarak etkinleşir. Yarım indirme açılışı bozmamalı; başarısız açılışta önceki çalışan paket geri gelmelidir. Yerel profiller/Play Games/cihaz sırları güncelleme tarafından silinmez veya taşınmaz.

İmza doğrulama anahtarı ilk pakette sabitlenir; imzalama sırrı sunucuda/CI'ın dış secret alanında tutulur. Sadece dosya hash'i yayıncının kimliğini doğrulamaz. İzin verilen host/yol, arşiv path traversal sınırı, indirilen boyut, geri alma ve sürüm uyumluluğu ayrıca test edilir. APK'nın `server.url` alanını uzak siteye çevirmek bu güvenli kurulum/geri dönüş mekanizmasının yerine geçmez.

## Mağaza sınırları

Google Play, dış kaynaktan native çalıştırılabilir kodla kendini değiştirmeyi sınırlar; WebView'de yorumlanan JavaScript için belirtilen istisna tüm mağaza politikalarına uygunluk yükümlülüğünü kaldırmaz. Bu nedenle native değişiklikler Play güncellemesinde kalır, OTA sınırsız özellik yayını veya incelemeyi aşma yolu olarak sunulmaz. [Google Play politikası](https://support.google.com/googleplay/android-developer/answer/16559646?hl=en).

Apple 2.5.2, uygulamanın işlevlerini ekleyen/değiştiren indirilen kodu sınırlar. Android'deki web güncellemesi yaklaşımının iOS'ta aynen onaylanacağı varsayılamaz; iOS yayın stratejisi ayrıca değerlendirilir. [Apple inceleme kuralları](https://developer.apple.com/app-store/review/guidelines/#software-requirements).

Sonraki adım, ödüllü reklam/UMP/SSV kapıları tamamlandıktan sonra kapsam ve platform sınırlarını kullanıcıyla kesinleştirmektir. Şu an kullanıcıya “otomatik güncelleme hazır” denmez.
