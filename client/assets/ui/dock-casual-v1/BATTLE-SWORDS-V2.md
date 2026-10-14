# Savaş ikonu — çapraz enerji kılıçları v2, 15 Ekim 2026

Kullanıcı kalkan-lazer yerine önerilen çapraz enerji kılıçlarını denemeyi istedi.
Built-in Imagegen ile yeni şeffaf PNG üretildi; önceki battle.png/battle.webp
silinmedi. Yalnız Savaş düğmesi yeni battle-swords-v2.webp dosyasına bağlandı.
Diğer dört ikon, etiketler, düğme geometrisi, rozetler ve gezinme değişmedi.
İncelenen stil referansları: chests-casual-v1/gold.png ve dock-casual-v1/cards.png.
Kaynak PNG değişmez; export-casual-dock-icons.js alpha korunarak yalnız
256×256 kayıpsız WebP teknik türevi üretir. Oyunda 36/40 CSS piksel kullanılır.

Yeni türev 52.096 bayt; güncel beş ikon toplamı 315.914 bayt. Diğer dört
WebP'nin SHA-256 değerleri önce/sonra aynı. 449 istemci testi ve 2 masaüstü/
Android tarayıcı testi (320/393/768px, gezinme, TR/EN etiketler) geçti.
Geçici üretim derlemesi yalnız güncel beş WebP'yi içerir; eski battle.webp ve
PNG ustalar paket dışında, önizleme API'si çıkarılmıştır. Gerçek telefonda
denenmedi; AAB, canlı yayın ve commit/push yapılmadı.
Oyun içi örnekler: artifacts/battle-swords-20261015/screens/.

## Gerçek üretim promptu

```text
Use case: stylized-concept.
Asset type: one transparent WAR/BATTLE bottom-navigation icon for GRIDSHARD, replacing the shield-and-blaster icon. Must read clearly at 36–40 CSS pixels.
Input images: Image 1 (our gold chest) and Image 2 (our module cards) are STYLE REFERENCES ONLY. Do not draw a chest, cards, shield or lightning insignia.
Primary request: TWO SHORT CHUNKY ENERGY SWORDS CROSSED IN A BOLD BALANCED X. Broad turquoise/cyan solid energy blades point toward the two upper corners, thick warm-gold guards and short indigo grips point toward the two lower corners. Exactly two complete swords, each with its own visible blade, guard and grip. Both swords equally important, modest layering only at the central crossing. No central plate, shield, reactor, gem or emblem.
Style: match our casual-strategy/RPG 3D/2.5D chest/card family. Rounded substantial forms, simple broad saturated color faces, clear dark-indigo contours, few large bevels, soft illustrated upper-left highlights, toy-like satin finish rather than realistic metal. Blades have thick rounded/tapered tips and a pale cyan inner highlight; no thin glowing sticks. Gold guards are simple and rounded, no jewels or ornament.
Composition: nearly frontal upright emblem, slight volume/perspective but NOT tilted as a whole. Symmetric compact X silhouette with clear negative gaps between its four arms. Centered square canvas, all parts fully visible with about 8% clear margin, no clipping. Prioritize the small-size silhouette, not surface detail.
Background: genuinely transparent alpha. Only the two crossed swords; no scene, floor, cast ground shadow, button plate, border frame, external glow, sparks, text, letters, digits, logos or watermark.
Avoid: shield, gun, blaster, house, core, orb, ring, card, chest, tiny mechanical details, metal grain, scratches, chrome, gritty realism, realistic weapon photo.
```

