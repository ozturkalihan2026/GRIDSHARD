# Keskin köşeli casual sandık ailesi v2 — 15 Ekim 2026

Güncel kaynak konumu: büyük PNG ustaları ve önceki tasarımlar kullanıcı onayıyla
Git dışı `artifacts/asset-archive-20261015/` altına aynı göreli yollarla alındı.
Export aracı arşivden okur; aşağıdaki "silinmez/korunur" ifadeleri arşivdeki
orijinaller için geçerlidir. Runtime WebP dosyaları değişmedi.

Kullanıcı son sadeleştirme pilotunu reddederek köşeleri keskinleştiren çalışmaya
geri dönülmesini ve Mağaza menüsündeki sandığın da eşleştirilmesini istedi.
Imagegen becerisi/built-in edit aracıyla 4 kapalı ve 4 eşleşen açık çizim hazırlandı.
Altın'ın köşe/pah dili diğer kapalı hedeflere stil referansı oldu; açık hedeflerde
kendi yeni kapalı çizimi düzenlendi, önceki açık çizim yalnız poz/kamera referansıydı.

- Dekorasyon ve metal miktarı sadeleştirilmedi; renk/taş/taç/kristal kimlikleri
  korunur. Daha düz yüzeyler, belirgin küçük pahlar ve hafif basık/fasetli kapak.
- PNG kaynaklar değiştirilmez; export-casual-chests.js yalnız alpha korunarak
  256px kapalı ikon / 512px kapalı-açık reveal kayıpsız WebP türevlerini üretir.
- Mevcut renkli açılış efektleri, gerçek makbuz kapısı, ödül/satın alma kuralları
  ve düğme yerleşimi aynıdır. İki durum arasında geçiş, bağımsız kapak rig'i değil.
- Önceki chests-casual-v1 dosyaları silinmez. Sade pilot oyuna bağlanmaz.
- Mağaza dock ikonu ayrıca dock-casual-v1/shop-chamfer-v2.png/.webp dosyasındadır;
  aşağıdaki son prompt o ikonun üretimidir. Diğer dört menü ikonu değişmez.

## Gerçek üretim promptları

Doğrulama: 449 istemci, 9 derleme, 6 masaüstü/Android tarayıcı testi geçti
(4 sandık açılış/mağaza + 2 dock). Yeni 12 sandık WebP toplam **2.077.180 bayt**;
Mağaza ikonu 69.640 bayt, güncel 5 dock WebP toplam 315.758 bayt. Bütün PNG
ustalar 1254×1254 RGBA, alpha 0–255. Geçici üretim derlemesinde yeni 12 sandık
ve güncel 5 dock görseli byte-identical; PNG/eski sandıklar/önizleme API'si hariç.
Diğer dört dock WebP'sinin SHA-256'sı değişmedi. `git diff --check` temiz.
Gerçek telefon/AAB/canlı yayın/commit/push yapılmadı. İzole test makbuzlarıyla
önizleme videosu: `artifacts/chest-chamfer-20261015/chest-chamfer-demo.mp4`.

### gold

```text
Use case: precise-object-edit.
Asset type: transparent CLOSED gold chest icon for GRIDSHARD's existing casual mobile-game family.
Input image: Image 1 is the EDIT TARGET, our current approved closed gold chest.
Primary request: sharpen its overly pillowy geometry moderately, WITHOUT redesigning it. Replace the broad rounded outer body corners, feet and gold corner caps with crisp straight edges and small clean chamfered bevels. Make gold trim face planes flatter and the lid slightly lower/less bulbous, built from a few broad flat angled segments rather than an inflated semicircle. The change should be visible, but retain a friendly premium casual-strategy/RPG 3D silhouette, not a razor-edged low-poly box.
Preserve: same gold/indigo/red palette, red jewel latch, crown, number/layout of main trim bands, front/right three-quarter camera, upper-left highlights, substantial volume, optical size and closed state. Keep the same object identity and proportions; it remains a treasure chest, not a mechanical crate. Do not introduce new symbols, ornaments or screws.
Style invariants: broad clean saturated illustrated color faces, dark-indigo contour, controlled large highlights and satin game-object finish. No realistic metal grain, mirror chrome, scratches, gritty texture, noisy facets or small machinery.
Composition: one full closed chest centered on square genuinely transparent alpha canvas, with enough clear margin to avoid clipping any foot/crown/corner. No background, floor, cast ground shadow, emitted glow, light rays, particles, items, coins, text, letters, digits, logo or watermark. Only change geometric rounding into restrained straight edges and chamfers; keep everything else unchanged.
```

### bronze

```text
Use case: precise-object-edit.
Asset type: transparent CLOSED chest icon for GRIDSHARD's casual mobile game.
Input images: Image 1 is the EDIT TARGET (the current chest of the requested tier). Image 2 is our revised gold chest, a GEOMETRY/BEVEL STYLE REFERENCE ONLY, not a donor for colors or ornaments.
Primary request: change ONLY Image 1's overly rounded/pillowy geometry into the same restrained angular chamfer language as Image 2. Body corner caps, feet and trim ends have straight faces and small crisp beveled corners. The lid remains a chest lid but is slightly lower and less bulbous, with a few broad flat angled segments. Keep substantial casual 3D volume and friendly proportions, not gritty realism or a razor-edged low-poly crate.
Preserve Image 1's exact tier palette, jewel latch, accessory count/identity, band/trim layout, front/right camera, upper-left lighting, closed state and optical size. Do NOT add the gold reference's crown or red jewel to another tier, do not remove original crystals. Keep the chest the same recognizable object.
Style invariants: broad clean saturated illustrated color faces, dark-indigo contour, large controlled highlights and satin game-object finish. No realistic metal grain, scratches, mirror chrome, gritty texture, noisy facets or small machinery.
Composition: one whole closed chest centered on square transparent alpha canvas. Enough clear margin for every corner/accessory; nothing clipped. No background, floor, cast ground shadow, emitted glow/rays, particles, items, coins, text, digits, logo or watermark.
Target tier: bronze.
```

### silver

```text
Use case: precise-object-edit.
Asset type: transparent CLOSED chest icon for GRIDSHARD's casual mobile game.
Input images: Image 1 is the EDIT TARGET (the current chest of the requested tier). Image 2 is our revised gold chest, a GEOMETRY/BEVEL STYLE REFERENCE ONLY, not a donor for colors or ornaments.
Primary request: change ONLY Image 1's overly rounded/pillowy geometry into the same restrained angular chamfer language as Image 2. Body corner caps, feet and trim ends have straight faces and small crisp beveled corners. The lid remains a chest lid but is slightly lower and less bulbous, with a few broad flat angled segments. Keep substantial casual 3D volume and friendly proportions, not gritty realism or a razor-edged low-poly crate.
Preserve Image 1's exact tier palette, jewel latch, accessory count/identity, band/trim layout, front/right camera, upper-left lighting, closed state and optical size. Do NOT add the gold reference's crown or red jewel to another tier, do not remove original crystals. Keep the chest the same recognizable object.
Style invariants: broad clean saturated illustrated color faces, dark-indigo contour, large controlled highlights and satin game-object finish. No realistic metal grain, scratches, mirror chrome, gritty texture, noisy facets or small machinery.
Composition: one whole closed chest centered on square transparent alpha canvas. Enough clear margin for every corner/accessory; nothing clipped. No background, floor, cast ground shadow, emitted glow/rays, particles, items, coins, text, digits, logo or watermark.
Target tier: silver.
```

### diamond

```text
Use case: precise-object-edit.
Asset type: transparent CLOSED chest icon for GRIDSHARD's casual mobile game.
Input images: Image 1 is the EDIT TARGET (the current chest of the requested tier). Image 2 is our revised gold chest, a GEOMETRY/BEVEL STYLE REFERENCE ONLY, not a donor for colors or ornaments.
Primary request: change ONLY Image 1's overly rounded/pillowy geometry into the same restrained angular chamfer language as Image 2. Body corner caps, feet and trim ends have straight faces and small crisp beveled corners. The lid remains a chest lid but is slightly lower and less bulbous, with a few broad flat angled segments. Keep substantial casual 3D volume and friendly proportions, not gritty realism or a razor-edged low-poly crate.
Preserve Image 1's exact tier palette, jewel latch, accessory count/identity, band/trim layout, front/right camera, upper-left lighting, closed state and optical size. Do NOT add the gold reference's crown or red jewel to another tier, do not remove original crystals. Keep the chest the same recognizable object.
Style invariants: broad clean saturated illustrated color faces, dark-indigo contour, large controlled highlights and satin game-object finish. No realistic metal grain, scratches, mirror chrome, gritty texture, noisy facets or small machinery.
Composition: one whole closed chest centered on square transparent alpha canvas. Enough clear margin for every corner/accessory; nothing clipped. No background, floor, cast ground shadow, emitted glow/rays, particles, items, coins, text, digits, logo or watermark.
Target tier: diamond.
```

### gold-open

```text
Use case: precise-object-edit.
Asset type: matching transparent OPEN chest state for GRIDSHARD.
Input images: Image 1 is the EDIT TARGET, our revised closed chamfered chest. Image 2 is the old open state, a POSE/CAMERA REFERENCE ONLY; do not restore its rounded geometry.
Primary request: open Image 1 by lifting its SAME lid backward on its rear hinges about 65–75 degrees, as the pose in Image 2. Keep the base stable and the same tier-specific chest identity, colors, jewel latch, trim/band layout, crown or crystals when originally present. Match Image 1's sharper straight faces, small chamfers, flatter trim faces and restrained faceted lid, NOT the pillowy edges of Image 2. Camera remains the same mild front/right three-quarter view and upper-left illustrated lighting. Base and lid must still belong to the exact same revised chest.
The inner cavity is EMPTY: no coins, items, cards, gems, loot, glowing external light or predetermined reward. Keep its same tier-colored interior and only soft natural shading; the app will add animated light.
Style invariants: premium friendly casual-strategy/RPG 3D/2.5D, broad clean saturated faces, dark-indigo contour, simple bevels and satin finish. No realistic grain, scratches, mirror chrome, gritty noise or mechanical clutter.
Composition: one entire open chest on square genuinely transparent alpha canvas. Full lid, decorations, hinges and feet visible with clear margin. Match the closed state's optical size/camera as closely as fitting the raised lid permits. No floor, ground shadow, frame, background, text, numbers, logo, watermark, rays, particles, glowing aura or extra objects.
Target tier: gold.
```

### bronze-open

```text
Use case: precise-object-edit.
Asset type: matching transparent OPEN chest state for GRIDSHARD.
Input images: Image 1 is the EDIT TARGET, our revised closed chamfered chest. Image 2 is the old open state, a POSE/CAMERA REFERENCE ONLY; do not restore its rounded geometry.
Primary request: open Image 1 by lifting its SAME lid backward on its rear hinges about 65–75 degrees, as the pose in Image 2. Keep the base stable and the same tier-specific chest identity, colors, jewel latch, trim/band layout, crown or crystals when originally present. Match Image 1's sharper straight faces, small chamfers, flatter trim faces and restrained faceted lid, NOT the pillowy edges of Image 2. Camera remains the same mild front/right three-quarter view and upper-left illustrated lighting. Base and lid must still belong to the exact same revised chest.
The inner cavity is EMPTY: no coins, items, cards, gems, loot, glowing external light or predetermined reward. Keep its same tier-colored interior and only soft natural shading; the app will add animated light.
Style invariants: premium friendly casual-strategy/RPG 3D/2.5D, broad clean saturated faces, dark-indigo contour, simple bevels and satin finish. No realistic grain, scratches, mirror chrome, gritty noise or mechanical clutter.
Composition: one entire open chest on square genuinely transparent alpha canvas. Full lid, decorations, hinges and feet visible with clear margin. Match the closed state's optical size/camera as closely as fitting the raised lid permits. No floor, ground shadow, frame, background, text, numbers, logo, watermark, rays, particles, glowing aura or extra objects.
Target tier: bronze.
```

### silver-open

```text
Use case: precise-object-edit.
Asset type: matching transparent OPEN chest state for GRIDSHARD.
Input images: Image 1 is the EDIT TARGET, our revised closed chamfered chest. Image 2 is the old open state, a POSE/CAMERA REFERENCE ONLY; do not restore its rounded geometry.
Primary request: open Image 1 by lifting its SAME lid backward on its rear hinges about 65–75 degrees, as the pose in Image 2. Keep the base stable and the same tier-specific chest identity, colors, jewel latch, trim/band layout, crown or crystals when originally present. Match Image 1's sharper straight faces, small chamfers, flatter trim faces and restrained faceted lid, NOT the pillowy edges of Image 2. Camera remains the same mild front/right three-quarter view and upper-left illustrated lighting. Base and lid must still belong to the exact same revised chest.
The inner cavity is EMPTY: no coins, items, cards, gems, loot, glowing external light or predetermined reward. Keep its same tier-colored interior and only soft natural shading; the app will add animated light.
Style invariants: premium friendly casual-strategy/RPG 3D/2.5D, broad clean saturated faces, dark-indigo contour, simple bevels and satin finish. No realistic grain, scratches, mirror chrome, gritty noise or mechanical clutter.
Composition: one entire open chest on square genuinely transparent alpha canvas. Full lid, decorations, hinges and feet visible with clear margin. Match the closed state's optical size/camera as closely as fitting the raised lid permits. No floor, ground shadow, frame, background, text, numbers, logo, watermark, rays, particles, glowing aura or extra objects.
Target tier: silver.
```

### diamond-open

```text
Use case: precise-object-edit.
Asset type: matching transparent OPEN chest state for GRIDSHARD.
Input images: Image 1 is the EDIT TARGET, our revised closed chamfered chest. Image 2 is the old open state, a POSE/CAMERA REFERENCE ONLY; do not restore its rounded geometry.
Primary request: open Image 1 by lifting its SAME lid backward on its rear hinges about 65–75 degrees, as the pose in Image 2. Keep the base stable and the same tier-specific chest identity, colors, jewel latch, trim/band layout, crown or crystals when originally present. Match Image 1's sharper straight faces, small chamfers, flatter trim faces and restrained faceted lid, NOT the pillowy edges of Image 2. Camera remains the same mild front/right three-quarter view and upper-left illustrated lighting. Base and lid must still belong to the exact same revised chest.
The inner cavity is EMPTY: no coins, items, cards, gems, loot, glowing external light or predetermined reward. Keep its same tier-colored interior and only soft natural shading; the app will add animated light.
Style invariants: premium friendly casual-strategy/RPG 3D/2.5D, broad clean saturated faces, dark-indigo contour, simple bevels and satin finish. No realistic grain, scratches, mirror chrome, gritty noise or mechanical clutter.
Composition: one entire open chest on square genuinely transparent alpha canvas. Full lid, decorations, hinges and feet visible with clear margin. Match the closed state's optical size/camera as closely as fitting the raised lid permits. No floor, ground shadow, frame, background, text, numbers, logo, watermark, rays, particles, glowing aura or extra objects.
Target tier: diamond.
```

### shop-icon

```text
Use case: precise-object-edit.
Asset type: transparent SHOP bottom-navigation chest icon for GRIDSHARD, readable at 36–40 CSS pixels.
Input images: Image 1 is the EDIT TARGET, our current compact gold/indigo navigation chest. Image 2 is our newly chamfered gold store chest, a GEOMETRY/BEVEL STYLE REFERENCE ONLY.
Primary request: apply the same cleaner straight edges, crisp small chamfered corners, flatter trim faces and moderately faceted/lower lid of Image 2 to Image 1. Preserve Image 1's compact silhouette, gold/indigo/red palette, existing large jewel latch, original band/trim layout, camera, upper-left lighting and optical size. Keep all existing decorations, do NOT add the store chest's crown. Do NOT simplify or remove metal/parts. Only replace overly pillowy rounding with restrained sharper bevels.
Style invariants: same friendly casual-strategy/RPG 3D/2.5D rendering with substantial volume, broad clean saturated faces, dark-indigo contour, soft illustrated highlights and satin finish. Not razor-sharp/gritty low-poly, chrome, metallic grain, scratches, tiny parts or photorealism.
Composition: ONE entire closed icon centered on square genuinely transparent alpha canvas with clear margin; no clipping. No floor, ground shadow, UI plate, backdrop, text, letters, digits, logo, watermark, external glow, particles, coins or extra objects.
```


