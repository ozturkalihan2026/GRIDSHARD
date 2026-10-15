# Kupa sayacı görseli — 15 Ekim 2026

Güncel durum: sonraki “oyuna bağla” isteğiyle 128px kayıpsız WebP türevi
oyuna bağlandı. Ayrıntılar `client/assets/ui/rating-trophy-v1/README.md`
dosyasında. Aşağıdaki üretim notları ilk önizleme anına aittir.

Built-in Imagegen becerisi/aracı kullanıldı. Kaynak stil referansı:
`client/assets/ui/dock-casual-v1/battle-swords-v2.png`.

Kapsam: oyuncu/takım kupa SAYISININ yanında kullanılan olağan kupa simgesi.
Takım/lider panosu başlık amblemleri ve 1./2./3.'lük ödül kupaları kapsam dışıdır.

İlk lacivert tabanlı sürüm kullanıcı tarafından renk açısından reddedildi.
Son düzeltme yalnız lacivert/mavi/mor taban ve konturları altın/amber/sıcak
kahverengiye çevirdi; kupanın biçimi, kulpları ve ışık yönü korundu.

Son kaynak: `gold-rating-trophy-v2.png`; şeffaf alpha korunur. Önceki dosya
`rating-trophy-v1-navy-rejected.png` yalnız geçmiş kaydıdır, seçilen tasarım değildir.
Üretim kaynağına bağlanmadı; mevcut emoji/kupa fonksiyonu, sayı/puan hesabı,
ödül kupaları ve diğer görseller değiştirilmedi. PNG'ler QA klasöründedir,
çalışan oyun paketine eklenmedi. Küçük boyut oyun içi doğrulaması henüz yapılmadı.

## İlk üretimin tam promptu

```text
Use case: stylized-concept.
Asset type: ONE original transparent trophy-count icon for GRIDSHARD, used inline next to player and team trophy totals, readable at only 16–24 CSS pixels. This is the ordinary rating/count symbol, NOT a tournament award or first/second/third place trophy.
Input image: Image 1 is STYLE REFERENCE ONLY: our latest crossed cyan energy swords. Do not draw, modify, insert or copy swords. Create a completely new trophy subject in precisely the reference's rendering language.
Primary request: a compact upright classic GOLD CUP TROPHY, with a broad deep sunny-gold cup bowl, thick readable rim, exactly TWO substantial curved side handles with open negative spaces, one short thick gold stem, and a low solid dark-indigo plinth with a simple gold foot. The trophy front is plain, no emblem. Strong immediately recognizable trophy silhouette, few substantial parts rather than decorative details.
Style: premium casual mobile strategy / RPG 3D/2.5D illustration matching the reference's saturated yellow-gold guards and deep indigo accents. Crisp clean dark-indigo contour, broad distinct color faces, simple chunky chamfered bevels with sharp controlled edges and large illustrated upper-left highlights; warm amber shadow planes, satin toy-object finish. Substantial volume, not flat line art, not pastel, not realistic chrome, not overinflated pillowy geometry. Match the swords' polished clarity while keeping the small-size subject simpler.
Composition: almost frontal, very slight top/front view to reveal the cup opening; no dramatic tilt. Balanced centered square canvas, squat/wide enough that handles survive 16px display. Whole trophy visible including handles and plinth, occupies about 84–88% canvas with clean transparent margin. No tiny engraving, no decorative center stone, no thin fragile stem.
Background: genuinely transparent alpha, only the single isolated trophy. No background color, scene, floor, cast ground shadow, UI plate, border, sticker frame, separate object, external glow, sparks, particles, floating highlights, text, letters, digits, rank numbers, logo or watermark.
Avoid: podium, medals, ribbons, laurels, crowns, stars, first/second/third-place variants, star emblem, gem emblem, reactor/core, sword, chest, complex machinery, metal grain, scratches, noisy textures, mirror reflection, photorealism.
```

## Kullanıcının “lacivert olmasın” düzeltmesinin tam promptu

```text
Use case: precise-object-edit.
Asset type: transparent small inline trophy-count icon for GRIDSHARD.
Input image: Image 1 is the EDIT TARGET, the gold trophy we just generated.
User correction: NO NAVY BLUE. Remove every navy/indigo/blue/purple region from the trophy, including the dark-blue base and blue outer contour. Recolor the plinth to rich sunny gold with warm amber side/shadow faces and broad pale-gold highlights, matching the rest of the cup. Replace all indigo outlines with clean deep warm-brown/golden-brown outlines. No cool blue or purple pixels/material accents anywhere on the object.
Change ONLY those colors/materials. Preserve the trophy's exact cup silhouette, two handles and their open gaps, stem, base geometry, scale, composition, near-frontal camera, strong 3D/2.5D volume, crisp simple bevel planes, saturated casual-game style, and upper-left highlight direction. The cup front stays plain. This is the ordinary trophy-count symbol, not a podium or ranked award.
Whole trophy remains readable at 16–24 CSS pixels. No additional ornament, no stars, rank numbers, gemstones, laurels, labels, text, logo, watermark or extra objects. No external glow, particles, background, floor or cast ground shadow. Preserve genuinely transparent alpha background and full clean margins. Final palette is exclusively gold, yellow, warm amber and warm brown.
```

