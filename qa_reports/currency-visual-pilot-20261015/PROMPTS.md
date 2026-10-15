# Akı ve Devre Kredisi — görsel taslakları, 15 Ekim 2026

Durum: 15 Ekim'de kullanıcı iki görseli onayladı ve ortak kaynağa bağlandı.
Built-in Imagegen kullanıldı; son `battle-swords-v2.png` yalnız stil referansı.
PNG asılları değişmeden Git dışı `artifacts/asset-archive-20261015/` altında,
bu QA klasörünün aynı göreli yolunda korunur.

- `flux-v1.png`: mor dört uçlu fiziksel kristal.
- `credit-v1.png`: devre darbesi kabartmalı tek altın para.

`tools/export-currency-icons.js`: 128px kayıpsız alpha WebP; Akı 11.544 bayt,
Devre Kredisi 18.370 bayt. `canon.css` Currency artwork eşlemesi sabit/dinamik
üst bar, sandık önizleme, mağaza paketleri/başlıkları, Devre Yolu, maliyet
rozetleri ve ödüller için ortaktır. Yerel/görsel denemeler kullanıcıdadır;
tarayıcı/test sunucusu başlatılmadı. Ayrıntı: `client/assets/ui/README.md`.

## Akı — tam üretim promptu

```text
Use case: stylized-concept.
Asset type: ONE original transparent currency icon for GRIDSHARD: AKI / FLUX, readable at 16–32 CSS pixels in counters, rewards, chest previews and prices.
Input image: Image 1 is STYLE REFERENCE ONLY, our latest crossed energy swords. Match the broad saturated faces, crisp bevel planes, illustrated upper-left highlights and substantial premium casual-strategy 3D/2.5D volume. Do NOT draw swords or use their cyan blade color for this currency.
Subject: ONE solid luminous-looking PURPLE FOUR-POINT CRYSTAL, preserving our existing Flux identity. Symmetric upright compact four-point star/gem silhouette: long top and bottom tips, slightly shorter left and right tips, smoothly concave/chamfered valleys between four arms. It is a physical thick faceted crystal, NOT an outline star, coin, diamond playing-card suit or reactor. A few broad violet and rich amethyst faces, deep purple edge planes and a bright lavender-to-near-white central facet/highlight. Strong clear silhouette and a short subtle side thickness.
Style: highly saturated clean purple, warm magenta-violet transitions, deep purple contour, large controlled near-white/pale-lavender highlight facets. Friendly substantial polished game-object finish, geometric small chamfers like the sword reference, no pillowy blob, no photoreal gemstone refractions, no tiny facet noise.
Composition: one centered nearly frontal upright icon on square canvas. Entire crystal visible with 8–10% clear transparent margin. Broad substantial arms readable when tiny; no fragile thin spikes, extra crystals or decorative frame.
Background: genuinely transparent alpha. Only the single crystal; no UI plate, floor, cast ground shadow, scene, background, external glow, sparkles, particles, separate stars, coins, floating objects, text, letters, numbers, currency symbols, logos or watermark.
```

## Devre Kredisi — tam üretim promptu

```text
Use case: stylized-concept.
Asset type: ONE original transparent currency icon for GRIDSHARD: DEVRE KREDISI / CIRCUIT CREDIT, readable at 16–32 CSS pixels in counters, rewards, chest previews and prices.
Input image: Image 1 is STYLE REFERENCE ONLY, our approved crossed energy swords. Use the same saturated sunny-gold material as their guards, crisp broad bevel faces, thick clean contour and illustrated upper-left highlights. Do NOT draw swords or copy their cyan/indigo palette.
Subject: ONE substantial GOLD COIN / CIRCUIT-CREDIT TOKEN. A nearly frontal upright round thick gold disk with a bold raised gold outer rim and a slightly recessed clean gold face. Its center has exactly ONE large simple dark warm-amber circuit-pulse symbol: a single thick continuous horizontal line with one upward/downward heartbeat-like angular zigzag through the middle. The circuit-pulse mark is broad, legible and raised/inset as part of the coin, not lettering. Preserve our currency identity of a gold coin with a pulse mark. Small subtle lower/right side thickness is visible; no stack of coins.
Style: premium casual mobile strategy / RPG 3D/2.5D illustrated object matching the sword reference. Bright saturated gold/yellow main faces, warm amber side/shadow faces, controlled pale-gold highlights, deep golden-brown contour. A few crisp substantial chamfer planes, no pillowy blob. Friendly polished game-object finish, not photoreal metal, not chrome, not a realistic money photograph. No navy, blue or purple materials; exclusively warm gold/amber/brown.
Composition: centered square transparent canvas, almost frontal with a very slight perspective to show thickness, the circle remains compact and easy to recognize. Whole token visible with about 8–10% clean margin. Broad uncluttered center, easy silhouette when tiny.
Background: genuinely transparent alpha. Only the single coin; no UI plate, floor, cast ground shadow, scene, backdrop, external glow, sparkle, particle, floating object, text, letters, numbers, currency letters, logos or watermark.
Avoid: dollar/euro signs, C or G letters, gems, extra coins, laurel wreath, crown, shield, trophy, skull, ornate filigree, knurling/microengraving, machinery clutter, scratches, realistic metal grain and noisy facets.
```

