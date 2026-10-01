# GRIDSHARD marka ikonları

- `gridshard-store-icon-1024.png`: mağaza yüklemeleri ve Apple dokunma ikonu.
- `gridshard-store-icon-512.png`: Android/PWA kataloğu.
- `gridshard-favicon-32.png` ve `gridshard-favicon-192.png`: web sekmesi ve PWA.
- `gridshard-store-icon-master.png`: önceki ImageGen kaynağı; yeni ikonların üretim girdisi değildir.
- `gridshard-emblem.webp`: açılış ekranının şeffaf amblemi. CSS halkaları bu görselin çevresinde döner.

Yeni ikonlar `tools/generate_brand_assets.py` betiğiyle Pillow kullanılarak çizilir.
1 Ekim görsel düzeltmesinde `D:\Projects\GRIDSHARD2.1` içindeki hazır web,
mağaza ve Android/iOS kaynakları byte düzeyinde aynen alındı; betik çalıştırılmadı.
Açılışın `.boot-*` stilleri/animasyonları da kaynaktan aynen alındı. Hedefin
sunucu/profil/koleksiyon/hesap doğrulaması korunur: ilerleme yalnız bu gerçek
adımlar tamamlandığında artar, başarıdan sonra kaynak kapanış animasyonu oynar.

`tools/configure-native-orientation.js` içindeki mevcut Capacitor sync kancası
`tools/configure-native-branding.js` üzerinden `native-assets/` görsellerini
uygular. Portre, güvenli depolama/yedek dışlaması, yerel debug/üretim ağ sınırı
ve tam ekran yaşam döngüsü değiştirilmez. Yeni native paket gerçek cihazda
ayrıca doğrulanmalıdır; web build veya görsel aktarımı APK üretildiği anlamına gelmez.

İkonun köşeleri görsele işlenmemiştir; mağaza ve işletim sistemi maskeleri
güvenli merkez alanı üzerinden uygulanır.
