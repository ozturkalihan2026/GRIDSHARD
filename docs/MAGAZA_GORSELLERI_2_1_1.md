# GRIDSHARD 2.1.1 mağaza görselleri

## Teslim

Yerel çıktı: `artifacts/store-2.1.1-20261022/`.

- `app-icon-512.png`: 512 × 512, RGBA PNG, 630757 bayt.
- `feature-graphic-1024x500.png`: 1024 × 500, RGB PNG, alfa yok.
- `screenshots/`: 8 adet gerçek 1080 × 1920 oyun görüntüsü. Kaynak, ayrı geçici hesap/veri kullanan localhost E2E sunucusudur; canlı oyuncu/ödeme verisi yoktur.
- Görseller yeni sürümün yayımlandığını veya performansın onaylandığını göstermez. Sunucu/AAB yayın kapıları ayrı doğrulanır.

Google Play ölçüleri ve gerçek oyun görüntüsü şartları:
https://support.google.com/googleplay/android-developer/answer/9866151?hl=en

İkon ve özellik görseli **yerleşik image_gen** ile ayrı ayrı üretildi; API/CLI fallback kullanılmadı. Onaylı mevcut çekirdek/lazer görselleri referans alındı. Sharp yalnız ölçü/renk kanalı dışa aktarımı yaptı. Sekiz ekran görüntüsüne yapay UI, ödül, sahte sıralama veya pazarlama katmanı eklenmedi.

Bu teslim mağaza yüklemesi içindir. Mevcut launcher/adaptive icon ve açılış amblemi otomatik ezilmedi; yeni mağaza ikonu ayrı dosyadır.

## İkon son üretim promptu

Use case: stylized-concept. Asset type: Google Play application icon, single square image. Input images: image 1 is previous GRIDSHARD brand emblem reference; image 2 is the approved in-game reactor reference, preserve its identity and painted casual/RPG style. Primary request: create a new polished GRIDSHARD app icon, replacing the flat old emblem with a close-up of the angular mint crystal reactor from image 2. Centered chunky octagonal cyan-and-silver reactor housing, gold small connectors, brilliant mint crystal with a single subtle lightning fracture, confident readable silhouette. Background full-bleed deep navy to cobalt circuit glow, extremely simple, high contrast. Composition: one heroic reactor occupying 78% square with 10% safety padding, large crystal readable at 48px, painted broad bevels, restrained outline, stylized 3D mobile strategy game, NOT photorealistic shiny metal. No letters, no text, no badges, no rounded-square outer mask, no watermarks. Deliver one square opaque icon.

Referanslar: `client/assets/branding/gridshard-store-icon-512.png`, `client/assets/ui/cores-physical-v1/core_resonance.webp`.

## Özellik görseli son üretim promptu

Use case: stylized-concept. Asset type: Google Play feature graphic for GRIDSHARD mobile strategy game, one wide panoramic illustration, aspect ratio 2.048:1 (1024x500 layout). Input images: image1 approved mint crystal reactor, image2 approved red laser turret. Match these devices exactly in identity, chunky shapes and hand-painted casual/RPG game style; do not redesign into realistic metal. Scene: two small opposing blue circuit-board arenas with an intelligent modular arrangement of red laser turrets, blue shield domes and yellow battery units, mint energy conduits linking sockets, one clearly visible mint crystal reactor protected behind the devices. One bright red laser shot crosses between the boards, a soft shield catches energy, no gore or human characters. Slight three-quarter elevated game-world view, harmonious navy/cobalt environment, mint and warm gold accents, big clean shapes and angular bevels. Composition: balanced wide illustration, protected central 80% safe zone, no UI menus, no phone mockup, no screenshot imitation. Include only the title 'GRIDSHARD' in compact bold cream angular game lettering near upper center; exact spelling G R I D S H A R D, no other text. Title not more than 20% of height. This is promotional illustration showing actual game devices and circuit-board battles, not a giant repeat of the app icon. Avoid tiny detail, photorealistic reflections, realistic industrial grit, currency numbers, prices, badges, claims, watermark. Opaque full bleed landscape.

Referanslar: `client/assets/ui/cores-physical-v1/core_resonance.webp`, `client/assets/ui/modules-physical-v1/laser.webp`.

## Tekrar çekim

`tools/playwright-store.config.js` ve `e2e/store-gallery.spec.js` gerçek uygulamayı çalıştırır. Geçici sunucu dışında bir hedef verilmemelidir. Çıktıda sahte hesap ilerlemesi veya üretim hesabı kullanılmaz. İkon/özellik grafiği üretimini tekrar etmek, görsel aracında yukarıdaki iki promptu ayrı ayrı çalıştırmayı gerektirir.

