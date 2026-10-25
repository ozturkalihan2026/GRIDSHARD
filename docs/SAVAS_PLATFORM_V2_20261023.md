# Birleşik metal savaş platformları — 23 Ekim 2026

## Kullanıcı isteği ve uygulama

Önceki V1 tek-hücre mavi çerçeve yaklaşımı kullanıcı tarafından uygun bulunmadı.
Bu sürüm onun üzerine yeni çerçeve eklemez; V17 malzeme sahibini değiştirir.
Referans: artifacts/store-2.1.1-20261022/feature-graphic-1024x500.png.

- Tahta başına tek bütün grafit metal platform; gümüş köşe dönüş blokları ve
  küçük oyuncu mavi / rakip kırmızı kenar parçaları. İçte tam 5×3 geniş pad.
- İki kayıtlı eş görsel CSS border-image (9-slice) ile mevcut tahta geometrisine
  oturur. Çerçeve dışa boyanır; hücre boyutu, 8px boşluk, hitbox, iki piksellik
  içerik border'ı, kamera, modül ve çekirdek sprite oranları değiştirilmez.
- Arka planda ayrı, tek durağan WebP: basamaklı bloklar, derin boşluk, üstte
  kırmızı / altta turkuaz enerji yarıkları. Eski eğik ızgara ve ayraç kaldırıldı.
- Kanallar artık hücre kenarında biten kısa uçlar değil, gerçek soket merkezinde
  birleşen kesintisiz hatlardır. Aynı kalıcı SVG düğümleri kullanılır. Dolu
  olmayan her hücreye ikinci bir kablo ızgarası çizilmez; fiziksel hat ve akım
  yalnız mevcut canlı güç rotasında görünür. Güç kesilmesi/yıkım ikisini kapatır.
  Boş transit hücre güç alan modül sayılmaz; ekonomi ve sunucu kuralları aynıdır.
- Yeni rAF/timer/partikül/canvas/3D yüz veya akış animasyonu yok. Görsel derinlik
  çizime işlenmiştir; aktif modüller, kubbeler ve VFX ayrı katmanlarda kalır.
- Her iki kablo SVG kökü hücre katmanının altındadır (z-index:0). Önceki
  z-index:2/3 sırası WebKit'te hattı çekirdeğin üzerinden geçiriyordu; düzeltildi.
- İlk V1 çalışma dosyası socket-block.webp istemci varlıklarından çıkarılarak
  artifacts/battle-platform-20261023/retired-socket-block.webp içine arşivlendi.
  V1 tarihi raporu eski sonuçları anlatır; güncel uygulama bu rapordur.

## Dosyalar ve bütçe

Görseller **yerleşik imagegen** ile üretildi; CLI/API ya da üçüncü taraf indirme
kullanılmadı. Kaynaklar artifacts/battle-platform-v2-20261023/source/ altında;
araç orijinalleri .codex/generated_images/…/ altında da korunur.

| Oyun varlığı (client/assets/ui/battle-platform-v2/) | Boyut | Bayt |
| --- | --- | --- |
| platform-player.webp | 1024×615 alfa | 84.370 |
| platform-enemy.webp | 1024×615 alfa | 80.790 |
| circuit-depth.webp | 640×960 RGB | 58.840 |

Toplam 224.000 bayt (~219 KiB). Ham görüntü pikselleri, tarayıcının gerçek
katman/texture RAM ölçümü değildir. tools/prepare-battle-platform-art.py
yalnız teknik küçültme/WebP dışa aktarımı yapar; resim boyamaz. Kaynaklar eş
1619×972 ve arka plan 1024×1536'dır. CSS dilimleri kaynak oranına kayıtlıdır.

## Doğrulama kaydı

718/718 istemci testi ve 10/10 derleme regresyonu geçti. Üretim denetimi ana
dist/Android çıktısını değiştirmeden ayrı artifact kökünde yapıldı: paket
bf4fe54c9d2c63e6, 44 betik, 614 çalışma zamanı izin-listesi varlığı. CSS
derleyicisinin üç WebP çıktısı da doğrulandı; eski socket-block pakette yok.
İzin-listesi sayısı CSS file-loader çıktılarından ayrıdır.

Tarayıcı/FPS nihai sonuçları artifacts/battle-platform-v2-20261023/ içinde
saklanır. Windows WebKit FPS sorunu daha önce açıktı; bu görsel dönüşüm kendi
başına çözüm veya oynanabilirlik garantisi değildir. Fiziksel cihaz testi değildir.

Son görsel matris **6/6** geçti: üç tarayıcının her birinde yeni platform testi
(320×568, 393×852, 1280×720, 1920×853) ve mevcut yedi çekirdek/kalkan/patlama
regresyonu. Hücre kimlikleri aynı kalır, taşma yok, alt-sağ hedef dokunulabilir,
kanal SVG'lerinin iki kökü de hücrelerin altındadır. Sayfa hatası yok.
Gerçek ekranlar: savas-masaustu.png, savas-telefon.png, savas-webkit.png.
Son rapor platform-visual-results.json; test sırasında video kaydı yoktur.

Son katman sırasıyla 18sn gerçek AI savaşı, manuel Yüksek, perspektif açık,
2sn ısınma ve kayıtsız bağımsız rAF örnekleri:

| Ortam | rAF FPS | p95 kare aralığı | Sahnedeki cihaz | İstemci FPS bütçesi |
| --- | --- | --- | --- | --- |
| Masaüstü Chromium | 128,23 | 8,4ms | 8 | geçti |
| Emüle Android Chrome | 128,11 | 8,4ms | 6 | geçti |
| Windows WebKit / iPhone emülasyonu | 4,03 | 278ms | 7 | **başarısız** |

Ölçüm toplama 3/3 tamamlandı; bu FPS kalite kapısının 3/3 geçtiği anlamına
gelmez. Windows WebKit oynanabilirlik sorunu **açık**. Bu koşular eski/yeni
aynı seed'li bir A/B değildir; önceki turlardaki sayılara göre yüzde kazanım
veya kayıp çıkarılmaz. Gerçek AI/deploy sayıları değişir. Chromium performans
sonuçları physical Android/iPhone onayı değildir. Bellek için tek heap anı
sızıntı profili yerine kullanılamaz. Ön katman sırası WebKit kaydı ayrıca
before-layer-fix-webkit-performance.json olarak korunur.

İlk görsel koşularında hızlı masaüstü, ilk yetkili snapshot geri sayımı
açılmadan önce hazır görünen rafı yakaladı ve kurulum komutu görselde oluşmadı.
Zemin testinin kurulum koşulu artık gerçek sunucu savaş zamanının >0 olmasını
da bekler; ardından üç modülün gerçekten görünür olmasını zorunlu tutar.
Ürün yerleştirme mantığı değiştirilmedi, görünürlük/hittest şartı gevşetilmedi.
İlk başarısız koşular ayrı JSON'larda korunur.

Kullanıcının açık isteği gereği **tanıtım videosu yenilenmedi ve yeni video
çekilmedi**. Canlı sunucu, commit/push, AAB/yayın yapılmadı.

## Tam üretim istemleri

### Oyuncu platformu — referans: özellikler grafiği; gerçek alfa

```text
Use case: stylized-concept. Asset type: production terrain asset for GRIDSHARD, one EMPTY connected metal battle platform, genuine transparent background, landscape 5:3 proportions. Image 1 is STYLE REFERENCE ONLY: match its chunky angular painted casual sci-fi platform slabs, not its composition or devices.
Create ONE unified rectangular foundation supporting a STRICT REGULAR GRID OF EXACTLY FIVE COLUMNS AND THREE ROWS of broad understated graphite/slate blue metal top slabs. Top face viewed orthographically STRAIGHT DOWN, parallel horizontal/vertical axes, NO diamond or perspective taper; game code applies camera tilt. Crisp chamfered corners. All fifteen top slabs form one connected solid platform, not fifteen separate button frames. Very fine dark seams between slabs, no bright per-cell rims, no nested octagonal wells. Wide uninterrupted flat equipment pads. Minimal recessed UNLIT cable grooves between slabs, four-way metal conduit junctions; do not paint energy glow. Broad grey/silver corner-turn elbow blocks around outer border, occasional cobalt/cyan-blue insets on perimeter only (less than 15 percent area), dark cobalt graphite weight-bearing front edge, modest 3D thickness painted ONLY along bottom and right perimeter. No protruding tall pillars, no separate cubes at every corner.
Composition: artwork fills full landscape image, only 2 percent transparent safety margin outside single platform silhouette. Large rectangular top face occupies 91 percent total height, remaining lower edge shows thick bevel, enough internal room for 5x3 devices. Light upper left. Low-key slate pads read behind colorful modules. Main material dark graphite grey, corners grey-blue metal, localized player BLUE accent slabs. Restrained small brass fittings at outer cable entries. Match reference illustration's confident broad facets, deliberate dark contour and hand-painted 3D depth; avoid photorealism.
Absolutely NO devices, reactors, weapons, shield domes, text, logo, UI, background scenery, extra platforms or loose floating objects. No all-blue ornate ring sockets. This is a single whole platform texture, not a mockup.
```

### Rakip varyantı — düzenleme hedefi: oyuncu platformu; gerçek alfa

```text
Use case: precise-object-edit. Image 1 is the edit target, the accepted EMPTY 5-column by 3-row metal platform source. Produce enemy-side color variant. Change ONLY the small cyan/cobalt BLUE perimeter accent slabs to crimson-red and red-orange. Slight warm muted plum cast on the graphite plates, silver corner elbows remain SILVER/grey not red. Preserve EXACTLY the dimensions, orthographic perspective, alpha silhouette, all fifteen pad positions, seams, bevels, bottom thickness, brass fittings, lighting, drawing style, all geometry. Do NOT add anything and do not paint luminous power lines. No text or UI. Genuine transparency outside same silhouette. This is paired with original for opposing boards; registration must be pixel identical.
```

### Çevre — referans: özellikler grafiği; opak arka plan

```text
Use case: stylized-concept. Asset type: static portrait mobile game battlefield ENVIRONMENT background, not a mockup. Image 1 is STYLE REFERENCE ONLY (GRIDSHARD feature graphic). Create the DEEP ARCHITECTURAL SURROUNDINGS under two separate raised battle platforms that game code places in the upper and lower half. NO playable platforms, NO grid of sockets baked into this background.
Portrait composition 2:3. Dim central navy chasm occupies central 70 percent width, so foreground battlefield silhouettes will be readable. Along left and right edges, staggered chunky angular dark cobalt/graphite three-dimensional cubic blocks descend in terraces into a deep void. Visible beveled tops and heavy vertical faces, like the feature graphic. Narrow recessed cyan energy fissures travel between blocks and down their sides, sparse crimson red accents near upper edges, turquoise near lower edges. Depth toward centre, controlled cool blue ambient illumination, clear hand-painted broad facets, bold intentional contours, stylized casual sci-fi game illustration, not photorealism. Upper half cool muted crimson architecture accents, lower half blue/turquoise. Low contrast middle reserved for modules; peripheral detail strongest at edges and bottom. No bloom fog wash, no blur, no excessive glow.
NO text, logo, UI, characters, devices, weapons, reactors, shields, icons, individual module cells or buttons. No competing objects in centre. This is one baked lightweight environment for the existing stacked two-board combat scene; never side-by-side playable boards.
```

