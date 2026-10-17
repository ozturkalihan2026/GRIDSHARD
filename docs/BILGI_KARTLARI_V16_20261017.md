# Modül / çekirdek bilgi pencereleri — 17 Ekim 2026

Kullanıcının Rush Royale ekranları yerleşim referansıdır; karakter, amblem veya
oyun kuralı kopyalanmadı. Mevcut GRIDSHARD görselleri ve kaynak simgeleri kullanılır.

## Üç ayrı görünüm

1. Genel: ad/enderlik, merkezde tam ve statik cihaz görseli, parça ilerlemesi,
   kısa açıklama, üç ana değer + yeşil seviye farkı, Seç/Yükselt. Bu üç hücrede
   ikon üstte ortalı, altında özellik adı ve onun altında rakamlar bulunur.
   Tekrarlanan yazılı "Sonraki seviye" satırı kullanıcı isteğiyle kaldırıldı.
2. İstatistik: küçük ad başlığı, tüm sayısal değerler ve katalogdaki imza mekaniği. Büyük görsel,
   ilerleme satırı ve yükseltme alanı yoktur. Sınıf, enderlik ve sayısal karoların
   tümünde ikon solda; sağda etiket ve altında değer bulunur. Core üretim/depo
   farkları da sunucunun `next_stats` verisinden gelir.
3. Yetenekler: açık renkli içerik yüzeyi, gerçek seçim/bedel/seviye durumlarını
   gösteren iki dallı kartlar. Kilitli karta dokunmak açıklamayı gösterir; yetkisiz
   seçim göndermez. Seçili dal ve sıfırlama korunur.

384px azami genişlik / 680px azami yükseklik, ekrana göre küçülen ortalı pencere.
Arkada oyun görünür; sağ üstte kırmızı × vardır. Eski güçlü ID seçicilerinin
görseli aşağı iten 52px padding'i, şeffaf yetenek düğmeleri ve sarı disabled
yükseltme yüzeyi tek ID-kapsamlı stil sahibiyle ezilir.

Otomatik ölçüm ve önceki/sonraki içerik sayfalaması kaldırıldı. Normal dikey
görünümde üç ana sekme vardır; çok kısa yatay ekran / uzun açıklamada erişilebilir
kaydırma güvenliği korunur, veri veya yetenek seçenekleri kırpılmaz.

## 17 Ekim akşamı revizyonu

Güncel kontrol listesi ve ayrıntılar: [Akşam düzeltmeleri](AKSAM_DUZELTMELERI_KONTROL_LISTESI_20261017.md).

Temsili animasyonlar, hedef, ışınlar, alt yazı ve platform kaldırıldı; yalnız
onaylı gerçek çizim merkezde gösterilir. İstatistiklere gerçek imza mekanikleri
ve teorik hasar/sn açıklaması eklendi; motor dengesi değişmedi. Merkezi CAN
ikonu artık küçük, saydam kırmızı kalptir. Yetenekler daha sıkı tek alan düzenine
alındı; kısa yatay ekran erişilebilirlik istisnası ve oyun içi onay durumu
kontrol listesinde açıkça kayıtlıdır. Yeni timer/rAF/renderer kurulmaz.

## İşlem güvenliği

İstatistik simgeleri ayrıldı: Hasar = mevcut çapraz kılıçlar; Teorik Hasar/sn =
önceki hasar amblemi; Akım Maliyeti = enerji şimşeği; Enerji = mevcut batarya
görseli. Ortak anlam eşlemesi kullanılır; CAN için hp-red.webp eklendi.

Pasif yükseltme gri/mavi görünür; native `disabled` ve `aria-disabled` kullanılır.
Modülün kendi/evrensel parçası, kredi, Akı, kilit, azami seviye ve veri erişimi;
çekirdeğin kendi/eski parçası ve Akı koşulları mevcut ortak kurallardan gelir.
Modül yükseltme işleyicisi eski bir aktif düğme durumuna güvenmeden koşulları
tekrar kontrol eder. Sunucudaki fiyat, oran, yetenek ve işlem uçları değişmedi.

## Kontrol

Güncel V17 test sonuçları akşam kontrol listesindedir; aşağıdaki sayılar önceki V16 kontrolünün kaydıdır.

- Önceki V16 kontrolü: 178 odaklı Node regresyon kontrolü, 12 pencere sözleşmesi/DOM
  yaşam döngüsü, gerçek render fonksiyonları, kaynak/kilit koşulları ve yetenek
  seçimleriyle ilgilidir. DOM testleri gerçek tarayıcı piksel ölçümü değildir.
- 40 betik / 18 stil hedef sözdizimi; CSS uyarısı yok, önceki 20 çeviri anahtarı
  uyarısı değişmedi. Gerçek CSS çözümlemesi 10 detay ikonunu pakete dahil ediyor.
- `tools/audit-module-vfx-v14.cjs`, `tools/audit-detail-cards.cjs`.
- Sunucu/tarayıcı açılmadı, gerçek cihaz görsel kabulü yapılmadı. Dist/native
  paketi üretilmedi; commit/push yok. Kullanıcının yerel oyun testi esastır.
