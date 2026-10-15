# GRIDSHARD casual dock icons — 14 October 2026

Source cleanup update (15 October): all large PNG masters and retired designs
are preserved at identical relative paths under the gitignored local directory
`artifacts/asset-archive-20261015/`. The exporter resolves that archive fallback.
Current five runtime WebPs are unchanged; older "retained" notes refer to the
archive, not files shipped in this checkout. Transfer the archive separately.

Latest selection, 15 October: Shop now uses `shop-chamfer-v2.png/.webp`, matching
the sharper chest family. No other dock artwork changed. Its exact prompt is
the final entry in `../chests-casual-v2/PROMPTS.md`; 69,640 bytes for this icon,
315,758 bytes for all five runtime dock WebPs. Prior shop.png/.webp are retained.

Current revision, 15 October: only Battle was replaced with crossed energy
swords. Current runtime: battle-swords-v2.webp, 52,096 bytes; five icons total
315,914 bytes. Original shield/blaster masters are preserved. See
`BATTLE-SWORDS-V2.md` for its exact prompt and verification; the notes/prompts
below document the initial five-icon generation.

Five original transparent icons generated with the built-in Imagegen tool.
Style references: our own chests-casual-v1/gold.png and diamond.png, inspected
before generation. These are style references, not edit targets or stock assets.
PNG masters are preserved unchanged. tools/export-casual-dock-icons.js only
resizes/encodes 256px lossless WebP with alpha; the game displays 36px/40px.
Prior dock-painted-v1 files are preserved for recovery, not referenced at runtime.
Labels/routes/badges/button layout/active motion stay intact, except Home→Battle:
TR SAVAŞ, EN BATTLE; the internal menu route remains unchanged. No purchase,
reward, server, font, logo, chest or gameplay logic changes.

Runtime export: five lossless 256×256 WebP images, 331,910 bytes total. Decorative
images keep empty alt text, aria-hidden and disabled dragging. PNG masters and
prior dock-painted-v1 images are excluded from the production runtime whitelist.
Verified: 449 client tests, 9 build tests, and 2 desktop/Android browser tests
covering all five routes at 320/393/768px, badge/layout retention and TR/EN labels.
Real-device validation, AAB, live publication and commit/push were not performed.
Actual in-game screenshots: artifacts/casual-dock-20261014/screens/.

## Exact per-icon generation prompts

### shop

```text
Use case: stylized-concept.
Asset type: transparent mobile game bottom-navigation icon for GRIDSHARD, readable at 36–40 CSS pixels.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: our approved casual gold and diamond chest illustrations. Do NOT draw a chest unless the subject explicitly asks for one.
Primary request: create ONE isolated original icon with the same playful premium casual-strategy / RPG 3D/2.5D visual language. Thick rounded chunky forms, broad saturated color shapes, clean dark-indigo contour, simplified bevels and soft illustrated highlights from upper left. Satin toy-like finish, not photoreal chrome. Match the references' substantial volume and restrained detail.
Composition: square transparent canvas, near-frontal mild three-quarter view, compact balanced silhouette centered, all parts fully visible, object occupies about 82% of width and height with clear margin. Strong silhouettes and no thin parts, microdetails, or texture noise.
Background: genuinely transparent alpha; no floor, cast ground shadow, UI button plate, backdrop, scene, text, letters, digits, logo, watermark, external glow, sparks or floating objects.
Avoid: realistic metal grain, scratches, mirror reflections, gothic filigree, gritty realism, detailed machinery, overly ornate insignia, house, reactor core, ring around a core.
Subject: SHOP icon: ONE compact closed treasure chest belonging to the same family as the gold reference. Rounded sunny-gold lid and chunky gold trims, rich indigo-blue body, one bold warm amber/red jewel latch. Simplify to a strong chest silhouette readable at 36px: no elaborate crown, no coins, no additional bags or floating rewards. Mild top/three-quarter view, centered chest.
```

### cards

```text
Use case: stylized-concept.
Asset type: transparent mobile game bottom-navigation icon for GRIDSHARD, readable at 36–40 CSS pixels.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: our approved casual gold and diamond chest illustrations. Do NOT draw a chest unless the subject explicitly asks for one.
Primary request: create ONE isolated original icon with the same playful premium casual-strategy / RPG 3D/2.5D visual language. Thick rounded chunky forms, broad saturated color shapes, clean dark-indigo contour, simplified bevels and soft illustrated highlights from upper left. Satin toy-like finish, not photoreal chrome. Match the references' substantial volume and restrained detail.
Composition: square transparent canvas, near-frontal mild three-quarter view, compact balanced silhouette centered, all parts fully visible, object occupies about 82% of width and height with clear margin. Strong silhouettes and no thin parts, microdetails, or texture noise.
Background: genuinely transparent alpha; no floor, cast ground shadow, UI button plate, backdrop, scene, text, letters, digits, logo, watermark, external glow, sparks or floating objects.
Avoid: realistic metal grain, scratches, mirror reflections, gothic filigree, gritty realism, detailed machinery, overly ornate insignia, house, reactor core, ring around a core.
Subject: CARDS icon: ONE compact fan of three thick rounded-corner collectible module cards, the largest front card royal blue and ice blue with a single big pale lightning relief; two backing cards indigo and lighter cyan. Thick gold edge rims and broad clean faces, no text, numbers, people, portraits or tiny stats. The fan is a tangible deck, not a square app icon, and all card corners are visible.
```

### battle

```text
Use case: stylized-concept.
Asset type: transparent mobile game bottom-navigation icon for GRIDSHARD, readable at 36–40 CSS pixels.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: our approved casual gold and diamond chest illustrations. Do NOT draw a chest unless the subject explicitly asks for one.
Primary request: create ONE isolated original icon with the same playful premium casual-strategy / RPG 3D/2.5D visual language. Thick rounded chunky forms, broad saturated color shapes, clean dark-indigo contour, simplified bevels and soft illustrated highlights from upper left. Satin toy-like finish, not photoreal chrome. Match the references' substantial volume and restrained detail.
Composition: square transparent canvas, near-frontal mild three-quarter view, compact balanced silhouette centered, all parts fully visible, object occupies about 82% of width and height with clear margin. Strong silhouettes and no thin parts, microdetails, or texture noise.
Background: genuinely transparent alpha; no floor, cast ground shadow, UI button plate, backdrop, scene, text, letters, digits, logo, watermark, external glow, sparks or floating objects.
Avoid: realistic metal grain, scratches, mirror reflections, gothic filigree, gritty realism, detailed machinery, overly ornate insignia, house, reactor core, ring around a core.
Subject: WAR/BATTLE icon replacing the former Home/reactor icon. One thick teal shield in front, with one chunky futuristic laser blaster diagonally behind it pointing upward. Shield face has a single broad pale lightning relief, not a gem/core. Dark indigo side walls, light silver rim, a small warm-gold blaster barrel collar and teal laser emitter. Large readable shield and visibly recognizable thick blaster barrel, no sword, no shooting beam, no battle scene. This combined shield-and-laser is one compact emblem.
```

### team

```text
Use case: stylized-concept.
Asset type: transparent mobile game bottom-navigation icon for GRIDSHARD, readable at 36–40 CSS pixels.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: our approved casual gold and diamond chest illustrations. Do NOT draw a chest unless the subject explicitly asks for one.
Primary request: create ONE isolated original icon with the same playful premium casual-strategy / RPG 3D/2.5D visual language. Thick rounded chunky forms, broad saturated color shapes, clean dark-indigo contour, simplified bevels and soft illustrated highlights from upper left. Satin toy-like finish, not photoreal chrome. Match the references' substantial volume and restrained detail.
Composition: square transparent canvas, near-frontal mild three-quarter view, compact balanced silhouette centered, all parts fully visible, object occupies about 82% of width and height with clear margin. Strong silhouettes and no thin parts, microdetails, or texture noise.
Background: genuinely transparent alpha; no floor, cast ground shadow, UI button plate, backdrop, scene, text, letters, digits, logo, watermark, external glow, sparks or floating objects.
Avoid: realistic metal grain, scratches, mirror reflections, gothic filigree, gritty realism, detailed machinery, overly ornate insignia, house, reactor core, ring around a core.
Subject: TEAM icon: ONE chunky purple guild pennant with a short warm-gold top bar and a simple joined pair of pale silver/lavender player busts as raised relief. Two round abstract heads and two broad shoulders clearly convey a team, no facial details or realistic people. Rich violet face, indigo side wall, warm-gold edge, short rounded V-tip at bottom. It should feel like a physical team badge in our casual chest family, not a heraldic medieval coat of arms. No text, no sword, no gem/core.
```

### events

```text
Use case: stylized-concept.
Asset type: transparent mobile game bottom-navigation icon for GRIDSHARD, readable at 36–40 CSS pixels.
Input images: Image 1 and Image 2 are STYLE REFERENCES ONLY: our approved casual gold and diamond chest illustrations. Do NOT draw a chest unless the subject explicitly asks for one.
Primary request: create ONE isolated original icon with the same playful premium casual-strategy / RPG 3D/2.5D visual language. Thick rounded chunky forms, broad saturated color shapes, clean dark-indigo contour, simplified bevels and soft illustrated highlights from upper left. Satin toy-like finish, not photoreal chrome. Match the references' substantial volume and restrained detail.
Composition: square transparent canvas, near-frontal mild three-quarter view, compact balanced silhouette centered, all parts fully visible, object occupies about 82% of width and height with clear margin. Strong silhouettes and no thin parts, microdetails, or texture noise.
Background: genuinely transparent alpha; no floor, cast ground shadow, UI button plate, backdrop, scene, text, letters, digits, logo, watermark, external glow, sparks or floating objects.
Avoid: realistic metal grain, scratches, mirror reflections, gothic filigree, gritty realism, detailed machinery, overly ornate insignia, house, reactor core, ring around a core.
Subject: EVENTS icon: ONE rounded chunky hot-pink/magenta calendar token with two thick warm-gold binding loops on top and a single large gold five-point star relief on its front. Rich indigo side thickness, broad clean pink face, no grid, no dates, no text, no numbers. Clearly a festive star calendar, not a reactor or trophy. Entire loops and star fit with margin.
```


