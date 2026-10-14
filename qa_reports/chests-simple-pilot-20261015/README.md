# Sade sandık pilotu — 15 Ekim 2026

**Kullanıcı bu yönü reddetti; devam edilmeyecek.** Son isteği köşeleri
keskinleştiren çalışmadan devam etmek ve Mağaza dock sandığını da eşleştirmek.
Bu dosyalar yalnız terk edilen denemenin kaydıdır, oyuna bağlanmadı.

Kullanıcı örnek sandık görseliyle sorunun yalnız yuvarlak köşeler değil,
metal ve ek parçaların fazlalığı olduğunu belirtti. Önceki yalnız keskinleştirme
yönü durduruldu. Built-in Imagegen aracıyla kendi mevcut Altın Sandık hedefi
ve kullanıcı örneği (sadece stil/karmaşıklık referansı) kullanılarak tek yeni
kapalı Altın pilotu üretildi. Referanstaki tasarımlar birebir kopyalanmadı.

- Geniş indigo gövde; iki sade altın bant; tek küçük kırmızı kilit.
- Büyük taç, çok katmanlı kilit çerçeveleri, köşe ayakları ve yan plakalar kaldırıldı.
- Az sayıda geniş yüzey, hafif pahlar, mevcut oyunsu 3D dil/renkler korunur.
- `gold.png` değişmemiş şeffaf Imagegen kaynağı; `gold.webp` 256px kayıpsız
  teknik türev, `export-preview.cjs` yeniden üretir. Alpha korunur.
- Bu bir **önizleme**: oyundaki referanslar hâlâ chests-casual-v1; açık durumlar,
  diğer üç sandık, fiyatlar, ödül/satın alma/açılış kuralları değiştirilmedi.
  AAB/canlı sunucu/site/Play/commit/push yapılmadı. Oyun testi sonucu iddia edilmez.
- Mevcut renkli açılış efektlerinin yeni aileye uygulanması, bu sade yön
  kullanıcı tarafından seçildikten sonra eşleşen açık çizimlerle yapılacak.

## Gerçek üretim promptu

```text
Use case: precise-object-edit.
Asset type: transparent simplified CLOSED gold chest PILOT for GRIDSHARD.
Input images: Image 1 is the EDIT TARGET, our current gold/indigo chest. Image 2 is the user's STYLE/COMPLEXITY REFERENCE showing three simple chests; use its restraint and body-to-metal balance, NOT its exact chest designs, wood color, background or details.
Primary request: simplify Image 1 substantially while keeping its friendly casual-strategy/RPG 3D family, rich indigo body, warm-gold tier identity and mild front/right three-quarter view. The main visible surface is now a broad clean indigo chest body and lid, roughly 65–75% of visible area. Gold metal is limited to TWO slim continuous structural straps arching over the lid and continuing down the body, one narrow simple upper rim and one discreet base edge, and ONE small centered latch with a tiny red inset. Straps are roughly 8–10% of total chest width each. No broad gold armor covering entire lid panels.
Remove stacked/overlapping frames around the jewel, giant corner pillars/feet, side plaques, big crest/crown, oversized gemstone, nested mechanical brackets and extra trim fragments. No extra jewels, buttons, rivets, screws, gears or decorations. Exactly one small practical latch, NOT a large ornate medallion. The chest rests on a simple understated base, not four huge corner boots.
Geometry: a compact chest with slightly flatter/lower arched lid, clean broad surfaces, restrained small bevel/chamfer at the corners instead of pillowy inflated corners. A few large illustrated light/shade planes only. Keep charm and volume, do not turn it into a gritty steel crate or harsh many-facet low-poly object.
Style: follow the simple readable chunky rendering of Image 2 and retain our saturated illustrated palette/soft upper-left highlights. Satin/toy-like painted finish; no chrome, metallic grain, scratches, photo realism, high-frequency texture or mechanical detail. Main silhouette and two bands must read at 63 CSS pixels.
Composition: ONE whole closed chest centered on square genuinely transparent alpha canvas, clean margins on all sides. No floor, cast shadow, frame, UI plate, scene, reference collage, background, text, letters, digits, logo, watermark, coins, loot, glow or floating particles. Do not copy any of the three reference chests exactly; this is our original simplified blue-and-gold chest.
```

