# GRIDSHARD marka ikonları

23 Ekim 2026 son revizyon: Açılışta yalnız devrenin içindeki reaktör kalır;
üstteki ayrı logo kaldırıldı. Başlık ve slogan üstteki mavi alana taşındı.
`startup-circuit-v1/circuit-scene.webp` üstündeki kristal/enerji nabzı üç küçük
CSS katmanıdır; gövde/zemin oynamaz. Görsel değiştirilmedi veya yeniden üretilmedi.
`reactor-logo.webp` yalnız önceki üretim kaydı ve tanıtım kapanışı için korunur;
açılış HTML'inde/paketinde kullanılmaz.
İki kaynak görsel yerleşik imagegen ile, onaylı grafik/ikon referansından üretildi;
`tools/prepare-startup-art.py` yalnız teknik WebP dışa aktarımı yapar.
İstemler: `docs/ACILIS_DEVRE_YETENEK_VIDEO_20261023.md`; son revizyon/testler:
`docs/CANLI_CEKIRDEK_ACILIS_20261023.md`.
Önceki SVG odası ve eski logo açılışta kullanılmaz; geçmiş varlıklar değişmedi.
Tek stil sahibi `client/src/startup-loading.css`; eski canon/home boot stilleri
kaldırıldı. İlerleme, hata/yeniden deneme ve sunucu doğrulaması değişmedi.
Önceki tasarım notları aşağıda tarihsel kayıt olarak korunur.

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

13 Ekim 2026 (görsel tur 6): amblem ve bütün ikonlar oyunun yeni görsel dilinde
yeniden çizildi (dolu gövde, aydınlık ve gölge yüz, koyu kontur, desenli düz zemin;
ışıma ve parçacık yok). Betik çalıştırıldı; `--preview <klasör>` ile depoya dokunmadan
denenebilir. Açılışın `.boot-*` bloğu yerinde durur, yeni görünüm `canon.css`
sonundaki "Görsel tur 6" bloğundadır. `gridshard-emblem.webp` özetini sabitleyen test
(`client/tests/startup-loading.test.js`) yeni dosyaya göre güncellendi.

İkonun köşeleri görsele işlenmemiştir; mağaza ve işletim sistemi maskeleri
güvenli merkez alanı üzerinden uygulanır.
