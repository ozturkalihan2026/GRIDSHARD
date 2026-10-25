# Bütünleşik savaş kaideleri — 24 Ekim 2026

Yerleşik imagegen kullanıldı; CLI/API kullanılmadı. Referanslar kullanıcının son paylaştığı Özellikler Grafiği ve açılış resmi (d30e31fe, 9c596094).

## Son kaynaklar ve uygulama

- Oyuncu: generated_images/01a0302f-786b-7613-9af9-d49cd1a9ee49/exec-f9630a48-96a7-44f7-a4ed-b74f5780125d.png
- Rakip: aynı klasör/exec-3e2af956-e443-44ae-973d-ffdfee320368.png
- Kaynak kopyaları: artifacts/battle-islands-20261024/source/island-{player,enemy}.png
- Runtime: client/assets/ui/battle-islands-v4/island-{player,enemy}.webp (1024×683, toplam 196432 bayt).
- tools/prepare-battle-islands.py yalnız ölçekleme/WebP dışa aktarımı yapar; boya veya alfa üretmez.
- Tek çizimde koyu metal döşeme, gümüş köşeler, takım rengi kenarlar ve fiziksel bağlı yükselen bloklar. Önceki 9-slice ve 30 hücre resmi yok; iki durağan sahne resmi var.
- 5×3 canlı hücre ve SVG enerji bağlantıları korunur. Terrain kardeş katmanları aynı kamera ekseninde, iki canlı tahtanın da altındadır. Hücrelere yeni event/timer eklenmedi.
- Kaynak zemin kayıt bölgesi x250..1290, y298..728. Savaş kamerası mevcut 30° eğimde kaldı; pazarlama resminin çapraz kompozisyonunun piksel kopyası değildir.
- Eski runtime görselleri geri alınabilir artifacts/battle-islands-20261024/retired/ arşivine taşınır.
- Tanıtım videosu, sunucu, oyun kuralları ve satın alımlar bu tur değiştirilmedi.

## Kontroller

721/721 istemci testi, 6/6 görsel regresyon geçti. Masaüstü Chromium, Android Chrome ve iPhone WebKit emülasyonlarında 5×3, dört viewport, dokunma hedefleri ve yedi çekirdek kontrol edildi. Paket kimliği `ea6d20166eeb2dc0`; 44 betik, 614 izin-listesi varlığı, iki yeni zemin resmi. Eski beş resim pakette yok. Kanıtlar artifacts/battle-islands-20261024/ altında tutulur. WebKit görsel testi gerçek cihaz FPS ölçümü değildir; önceki Windows WebKit FPS konusu ayrı açık kalır.

# Üretim istemleri

## v4PlayerPrompt

Use case: stylized-concept. Production game terrain for GRIDSHARD.
Images 1 and 2 are the ONLY art references. Faithfully extract/reconstruct their actual BLUE PLAYER circuit island material family, WITHOUT machines, weapons, cores, shields, logos or text.
Crucial art direction: the interior is a continuous DARK graphite / blue-black metallic pavement, much DARKER than perimeter silver blocks. It is NOT an array of bright blue buttons, not individual framed square plaques, not octagonal sockets or holes. Very subtle engraved seams indicate a 5-column by 3-row gameplay region; it is a floor supporting machines, not a UI board. Flat dark metal mounting floor, modest edge bevels only, some small masonry subdivisions. FOUR big pale silver/chamfered metal corner elbow BLOCKS. Thick cyan/turquoise enamel perimeter BLOCK segments alternating with dark blue masonry, exactly the left island in the references. A few tiny warm gold cable saddles, not large gold jewels.
The floor is on a MASSIVE elevated foundation: tall blue navy vertical block columns beneath it, broken/chamfered block corners, stepped lower tiers, turquoise energy fissures descending the side. Along the outside left/right corners, several taller surrounding background stone-metal towers RISE TO TOUCH and SUPPORT the platform corners, as though the island and rising block environment are ONE interconnected formation. Platform edges organically interlock with those towers. Strong hand-painted volume, bold shaded block facets, silver sunlit top bevels and near-black side shadows from the references, not a floating flat tray.
Energy grooves inside the dark floor have dark teal conduit beds, UNLIT (live mint light is rendered by game engine); exterior side fissures can glow cyan. No giant bright grid on the floor. Keep channels narrow and floor dark and calm.
Framing / registration: single complete island on true transparent background. Centered, front-aligned orthographic game view, looking downward, no sideways diamond rotation. The entire interior rectangular mounting floor is unskewed, all horizontal lines parallel and vertical lines parallel. Interior is exactly aspect FIVE wide to THREE deep; preserve ample empty floor. Full pedestal and attached supporting towers visible around/below floor, no cropping. No surrounding detached skyscraper wallpaper; the attached towers belong to this island. A generous square canvas, floor in upper-middle and deep pedestal below. Use the original references' metal/painted block design EXACTLY, not any earlier reinterpretation. True alpha background.

## v4ProportionPrompt

Edit target image 1. Keep its exact materials: dark quiet metal mounting floor, pale silver corner elbow blocks, cyan perimeter blocks, attached supporting blue columns and hand-painted reference style. Correct its PROPORTIONS only to make it a usable 5x3 battle terrain.
The top mounting area needs FIVE EQUAL columns and THREE EQUAL rows. Its rectangular inner floor must have aspect ratio 5:3 (square cells); make the middle columns as wide as the outer columns. View the floor straight from above, all rows equal depth, no trapezoid.
SHORTEN the very tall lower pillar formation drastically. Below the front floor edge, retain ONLY ONE ROW HEIGHT of visible pedestal masonry (about 1/3 of inner floor height). Remove the long downward skyscraper legs. Side background towers still touch the silver platform corner blocks and are only about half a row taller than deck. The whole result should be a wide landscape composition around 3:2, with broad dark floor occupying most of the image, short chunky pedestal below, cyan perimeter and silver corners surrounding it. Include entire silhouette on true transparent background. Keep floor DARK charcoal slate and flat with subtle seams, not bright button tiles or ornate octagonal wells. No text, objects or machines.

## v4SurfacePrompt

Edit target image 1. Keep the illustrated metal blocks/materials/color and connected corner supports. This is a GAME TERRAIN SPRITE, not a UI panel. Make three precise corrections:
1. Remove ALL background outside the stone-metal formation to real alpha transparency. No painted blue background, no fog.
2. Enlarge the dark mounting floor so it occupies from x=10% to x=90% of image width and y=15% to y=75% of image height. The silver corners, cyan rim blocks and supporting towers should fit in the remaining narrow margins around it. Keep their individual beveled block shapes, do not replace them with a simple thin frame. Short navy foundation under the deck between y=75% and y=95%.
3. The mounting floor is ONE continuous dark metallic paved surface, with subtle irregular dark plate seams. REMOVE the fifteen outlined rectangular pad/plaque shapes entirely. No buttons or holes. The game's logical 5x3 cells and energy conduits will be rendered on top by the engine, so this image must supply a broad calm dark floor, not a competing grid. Floor color much darker than silver corner blocks and cyan perimeter. No prominent luminous channels across the floor; only exterior vertical cyan fissures, like the reference. Keep original perimeter gold saddles small.
Composition: front-aligned parallel rectangle, no diamond rotation, preserve the same chunky hand-painted depth and touching support towers. Nothing clipped. True transparent background mandatory.

## v4AlphaPrompt

Background extraction only. Remove the painted navy/blue fog backdrop outside the complete metal-block platform and its attached stone support pillars. Return true RGBA alpha transparency around the silhouette. Keep ALL platform pixels, the dark metal inner floor, silver corner blocks, cyan edge pieces, gold brackets and short navy foundation unchanged. Do not redesign, crop, recolor or move anything. No checkerboard printed into image.

## v4EnemyPrompt

Edit Image 1 into the enemy-side color variant; Image 2 is the original reference for red team materials. Change ONLY team-colored pieces: turquoise perimeter enamel blocks to saturated crimson/red; turquoise energy fissures and conduit beds to red; navy support columns to deep blue-purple with restrained red reflected highlights. KEEP THE INTERIOR MOUNTING FLOOR DARK NEUTRAL GRAPHITE METAL, not bright red tiles. KEEP SILVER CORNER BLOCKS SILVER, gold saddles gold. Preserve the entire exact image geometry, calm continuous floor, irregular subtle metal seams, attached pillars, short foundation, registration, canvas dimensions and existing alpha transparency unchanged. No devices, text, new ornaments, grid plaques or octagonal holes. True transparent background.

