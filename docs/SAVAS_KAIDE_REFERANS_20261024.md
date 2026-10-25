# Referans devre kaidesi — 24 Ekim 2026

Kullanıcı önceki ince gri çerçeve ve oyuk hücre görünümünü reddetti. Özellikler
grafiği ile açılış ekranındaki kalın mavi/turkuaz ve kırmızı blok kaideler
malzeme/çizim referansı alındı. Yerleşik imagegen kullanıldı; ilk 5×2 çıktı
elenip 5×3 olarak düzeltildi, ardından eş kayıtlı kırmızı varyant üretildi.

## Uygulama

- Kaynaklar: artifacts/battle-pedestal-20261024/source/platform-{player,enemy}.png.
- Oyundaki dört yeni WebP: client/assets/ui/battle-pedestal-v3/.
- Tek malzeme sahibi battle-platform-v17.css güncellendi. Gümüş köşeler,
  doygun takım rengi çevre blokları ve 42px boyalı ön kaide yüzü vardır.
- Ana resmin merkezindeki boyalı ızgara kullanılmaz: 9-slice `fill` içermez.
  Aynı resimden kesilmiş blok görseli gerçek 15 hücrenin her birine oturur.
  Böylece çizim ile modül yerleştirme alanı farklı ekranlarda ayrışmaz.
- Önceki oyuk sekizgen pseudo yüzleri kaldırıldı. Modüller katı blok üstündedir.
- Kanal tabanı takım renginde koyudur; canlı enerji mevcut gerçek güç rotasında
  turkuaz veya kırmızı görünür. Ek savaş döngüsü, timer veya SVG düğümü yoktur.
- Arka plandaki mevcut basamaklı devre uçurumu korunur. Oyun kuralları ve
  5×3 düzeni, kamera, çekirdek ve modül kayıtları değişmez.
- Ham kaynaklarda düşman çıktısı bir satır kısadır (971/972); dışa aktarım bunu
  eş boyuta normalize eder. Bunun dışında yalnız kırpma/ölçekleme/WebP dönüşümü.
- Tanıtım videosu değiştirilmez. FPS ölçümü bu görsel doğrulamanın konusu değildir.

## Doğrulama

- İstemci regresyonu: **721/721 geçti**. Önceki 722 sayısı eski byte-identical
  V2 sözleşmesinin yeni malzeme sözleşmeleriyle değiştirilmesi nedeniyle farklıdır.
- Chromium / emüle Android Chrome / WebKit: **6/6 geçti**. 320, 393, 1280,
  1920 genişliklerinde 5×3 topoloji, aynı hücre nesneleri, gerçek yerleştirme,
  dokunma hedefi, taşma ve katmanlar; yedi çekirdeğin kırpılma/belirginlik
  kontrolleri eşikleri değiştirilmeden doğrulandı.
- Yalıtılmış web paketi **72c42508c0fd4ecb**; 44 betik, 614 izin listesi varlığı;
  beş CSS görseli gerçekten derlenmiş CSS içinde referanslı. Toplam zemin
  görseli **292.242 bayt**, önceki üçlü 224.000 bayttı. Son iki katman yerine
  hücre başına tek durağan blok yüzü var; yeni rAF/timer/partikül döngüsü yok.
- Eski iki V2 platform WebP'si runtime klasöründen çıkarılıp
  artifacts/battle-pedestal-20261024/retired-v2/ içine kurtarılabilir taşındı.
  Mevcut devre uçurumu arka planı korunur. Eski oyuk CSS yüzleri silindi.
- Kanıtlar: artifacts/battle-pedestal-20261024/{client-tests.tap,
  browser-results.json,package-report.json,savas-telefon.png,savas-masaustu.png,
  savas-webkit.png}. Ana dist/Android, sunucu ve Git yayımlaması yapılmadı.
- Video SHA256 değişmedi:
  65896a58fe0dd3030866556d689035cd4fb52afd2469d6373308b43e3fb418a8.
- WebKit FPS için yeni ölçüm yapılmadı; işlevsel/görsel testlerin geçmesi
  önceki Windows WebKit performans açığının kapandığı anlamına gelmez.

## Üretim istemleri

İki kullanıcı görseli çizim referansıdır; oyuna logo, silah veya kalkanı zemine
baskılı biçimde yerleştirmemek için temiz zemin üretildi. İlk taslak çalışma
kaydıdır, oyun varlığı değildir. Yerleşik araç kullanıldı; API/CLI kullanılmadı.

## İstem 1

Use case: stylized-concept. Asset type: transparent production game terrain sprite for GRIDSHARD.
Image 1 and Image 2 are EXACT MATERIAL AND DRAWING REFERENCES, not targets. Reconstruct the BLUE PLAYER circuit platform from these references, with the SAME chunky blue masonry pedestal, cyan blue enamel blocks, thick beveled silver corner blocks, dark navy vertical faces, small warm gold wire brackets and mint-cyan inset luminous conduits. Do NOT reinterpret into a thin grey board, metal tray, octagonal holes or sci-fi UI.
Subject: ONE standalone empty raised circuit island, precisely FIVE columns by THREE rows of large empty square mounting BLOCK TOPS, rectangular orthographic front-aligned grid. No modules, weapons, batteries, crystals, shields, logos, text or background scene. Each mounting block is a solid raised slab like the reference, with subtly chamfered corners, wide flat blue slate top, sapphire side mass. Between all 15 blocks are visible continuous mint-turquoise energy channels in recessed grooves with simple gold brackets. Saturated cyan blocks at perimeter alternating with silver corner masonry blocks. The island sits on a deep substantial plinth of multiple massive dark blue stone-metal blocks, vertical faces visibly descending below the top deck, like EXACTLY the reference floating islands.
Composition for engine registration: wide landscape transparent image. Top deck is an axis-aligned rectangle, viewed almost straight down with NO left/right rotation, NO diamond isometric orientation, NO trapezoid narrowing. Five equal columns and three equal rows of equal size square tops. Top deck width to height 5:3. All vertical grid lines parallel, all horizontal grid lines parallel. Thick front vertical fascia extends down about HALF A CELL HEIGHT below the front edge, with blue engraved block joints and turquoise vertical energy seams. Front side centered, balanced symmetrical left/right view. Drawing volume is prepainted. Clear transparent margin all sides, don't crop pedestal. Polished hand-painted chunky casual strategy-game art, bold dark edge outlines, hard broad specular highlights, strong cobalt/cyan color, visually IDENTICAL material family to supplied reference. Genuinely transparent background.

## İstem 2

Edit target image 1: generated circuit platform. Correct ONE structural mistake: it has only TWO rows. Rebuild the top deck to have EXACTLY THREE complete rows, each with FIVE identical empty blue mounting slabs, for FIFTEEN mounting positions. Keep all material art identical: cyan rim blocks, pale silver bevelled corner masonry, navy thick pedestal descending below, warm gold brackets, turquoise channels, transparent background. Count three distinct horizontal bands of five large mounting slabs, with TWO interior horizontal turquoise channel lanes between the three rows. There must be five columns (four interior vertical channel lanes). Increase the height of the image and top deck to fit the third row; do not compress or omit a row. Top-deck viewing angle almost top-down, rectangle shape with parallel sides, no diagonal rotation. Existing block drawing, color, lighting and substantial vertical front pedestal remain unchanged. No devices or text. True transparent background.

## İstem 3

Use case: precise-object-edit. Edit target Image 1 is the final BLUE circuit terrain sprite. Image 2 is the reference for enemy-side RED materials.
Create the matching enemy variant. Preserve EVERY geometric position, silhouette, fifteen pads (exactly 5 columns x 3 rows), channels, gold junction brackets, silver corner blocks, pedestal thickness, transparent margins, framing and dimensions from Image 1. Only recolor the BLUE TEAM material family: cyan perimeter blocks become saturated vermilion/crimson red; large blue slate pad tops become dark burgundy/red-violet slate as in the enemy platform of reference Image 2; navy pedestal becomes deep dark plum/burgundy with red reflected light; turquoise energized grooves become vivid red-orange with pale hot red cores. Keep pale silver bevels and warm gold brackets, no random extra details or redesign. Exactly same grid registration and camera as Image 1. No text, weapons, modules or environment. Genuine transparent background.

