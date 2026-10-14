# Stilize casual-strategy / RPG sandık pilotu — 14 Ekim 2026

Sonraki kullanıcı onayıyla bu kapalı çizimler uygulamaya bağlandı; eşleşen açık
durumlar ve efektler `client/assets/ui/chests-casual-v1/` içine eklendi.
Aşağıdaki "yalnız pilot" bilgileri ilk üretim anını anlatır; güncel entegrasyon
ve doğrulama notları bu yeni klasörün `PROMPTS.md` dosyasındadır.

Kullanıcı yeni boyanmış dock/sandık ailesini fazla gerçekçi ve metalsi buldu.
Bu alternatif üçüncü yolu dener: hacim korunur, çizim daha oyunsu olur.
Imagegen built-in aracıyla önce Altın hedefi yeniden stillendirildi; diğer
üçü hem kendi eski hedeflerini hem yeni Altın stil ankrajını kullanır.
Orijinal dosyalar korunur. Bu set henüz uygulamaya bağlanmamıştır.
Font, logo, dock, mağaza davranışı ve diğer ekranlar değiştirilmedi.

Dosyalar: `bronze/silver/gold/diamond.png` (1254×1254 RGBA, gerçek alpha).
Değiştirilmemiş PNG kaynaklardan `export-preview.cjs` ile dört 256×256
kayıpsız WebP teknik türevi çıkarıldı; toplam **272.228 bayt**. Stil değişikliği
Imagegen ile yapıldı, export yalnız boyut/format işlemidir. Bunlar pilot
dosyalardır; üretim izin listesinde veya mevcut uygulama referanslarında yoktur.
Önceki `client/assets/ui/chests-painted-v1/` ve dock görselleri silinmedi.
Görsel aile kabulü beklenir; logo ve tüm oyun için toplu yeniden tasarım yapılmadı.

## Görülen referanslar

- Magnific: https://www.magnific.com/search?format=search&last_filter=query&last_value=Game+treasure+chest&query=Game+treasure+chest
  Arama sayfası iç tarayıcıda incelendi. Casual/3D sandık ve ikon setlerinde
  büyük parçalar, sade yüzeyler, renk ayrımı ve yuvarlatılmış hacim örnekleri
  görüldü. Stok görsel indirilmedi, satın alınmadı veya üretime kopyalanmadı.
- Pinterest: https://tr.pinterest.com/miewmiew2/style_text/
  77 Pin panosunun girişsiz görünen kısmı incelendi; giriş penceresi ayrıntılı
  incelemeyi engelledi. Tam pano görülmüş gibi kabul edilmemelidir. Görünen
  örnekler renkli casual başlıklarla koyu RPG/sci-fi logoları karıştırır.
  Bu aşamada logo ve Rowdies değişmez; özgün logo yönü ayrıca kararlaştırılmalı.

## Aile kuralları

İri ve yuvarlatılmış parçalar; az sayıda geniş renk yüzeyi; yumuşak 3D hacim;
mat/saten çizim; küçük boyda belirgin tek taş kilit; sınırlı highlight.
Gerçekçi metal tanesi, çizik, krom yansıması, ince mekanik oluk ve yoğun perçin yok.
Bronz bakır/kehribar; Gümüş buz-mavi/çelik renk; Altın sarı/kırmızı/taç;
Elmas turkuaz/mor/bağlı kristaller. Kademe kimliği ve kapalı durum korunur.
Beğenilirse önce dört sandık ve beş dock aynı ailede tamamlanmalı; sonra
kaynak simgeleri ve modül/çekirdek amblemleri ayrı, kontrollü adımlarla uyarlanmalı.
Bu not tüm oyunu yeniden tasarlama veya yayın yetkisi değildir.

## Gold anchor: exact prompt

Use case: style-transfer.
Asset type: transparent mobile casual-strategy / RPG reward chest icon for GRIDSHARD.
Input images: Image 1 is the EDIT TARGET, our own previous golden chest. Its overly realistic brushed metal look was rejected. Keep the recognizable gold tier, red central diamond latch, closed chest, crown crest and mild three-quarter angle, but substantially REDESIGN the rendering and simplify the construction.
Primary request: turn this into a genuinely game-like premium stylized 3D / 2.5D casual-strategy chest, NOT the same realistic chest with different saturation. Produce ONE closed chest only.
Art direction: chunky rounded forms, an appealing slightly exaggerated squat silhouette, thick simplified raised bands and a BIG readable jewel latch. Reduce many mechanical grooves and small plates to a few broad clean surfaces. One simple sculpted gold crown crest integrated into the lid. Invent original GRIDSHARD craft, not another game's identifiable asset. Mature playful strategy-game polish, not childish.
Materials: velvety satin enamel and illustrated gold-colored surfaces; smooth, clean, intentionally stylized. Hand-painted broad color shapes with soft 3D volume, like a high-quality casual RPG inventory icon. Absolutely NO brushed steel, grain, scratches, photoreal PBR, chrome, mirror reflections, long white metallic reflection strips, automotive finish, machining, tiny rivets, or noisy texture.
Shading: one soft warm upper-left key, two or three broad color-value steps per surface, gentle deep indigo recesses, controlled soft highlights. Thin dark-blue edge definition only where silhouettes/materials meet, not thick black sticker outlines. Strong color separation and readable shape at 48–64 px.
Palette: dominant sunny golden-yellow/orange with a rich ruby/coral RED diamond latch and limited deep indigo inset. Gold should look like a stylized game rarity color, not realistic metal.
Composition: square, centered single object, all parts fully visible, subject about 78–82% of the canvas with real empty margins around every edge. Mild top view, front dominant, right side slightly visible. Closed lid.
Background: genuinely transparent alpha. Clean antialiased cutout, no background, floor, ground shadow, scenery, text, numbers, frame, UI plate, watermark, coins, particles, floating sparkles or extra objects.
Important: preserve transparency; change only the chest's art direction/design, not its tier meaning or closed state. The result must feel considerably simpler, rounder, less industrial and less reflective than the target.

## Other three: shared exact prompt

Use case: style-transfer.
Asset type: transparent mobile casual-strategy / RPG reward chest icon for GRIDSHARD.
Input images: Image 1 is the EDIT TARGET (our previous overly-realistic chest). Image 2 is the STYLE ANCHOR (our NEW casual golden chest): match its bold chunky rounded shapes, smooth painted shading, simplified construction, camera and polish. Keep the TARGET tier/color identity; do NOT make it gold or add a crown unless specified.
Primary request: substantially restyle the target into ONE genuinely game-like stylized 3D / 2.5D casual-strategy chest. Not merely the same industrial chest with adjusted saturation.
Style: chunky rounded exaggerated squat silhouette, thick simplified bands and BIG diamond latch; a few broad clean surfaces rather than many mechanical grooves and plates. Playful premium strategy/RPG craft, not a flat emoji, baby toy or photo.
Materials: smooth satin painted/enamel colors. Broad hand-painted value shapes with soft 3D volume. NO brushed metal, grain, scratches, PBR realism, mirror chrome, machining, long white reflection stripes, dense rivets or noisy microtexture. Match the smooth simple finish of Image 2.
Shading: soft warm upper-left key, two/three broad value steps, gentle deep indigo recesses, controlled rounded highlights and thin dark blue boundary definition. Keep large readable color regions, strong silhouette at 48–64 px.
Composition: square centered ONE closed chest, mild top/three-quarter view with front dominant and a small right side. All parts visible, clear empty margins on every side. Same optical size and camera as Image 2.
Background: genuinely transparent alpha with clean antialiased edges. No scene, floor, ground shadow, UI frame, plate, text, letters, numbers, watermark, coins, particles, detached sparkles or extra objects. Preserve transparency.
Invariants: preserve the target's tier, jewel color and closed state. Change its rendering/design to be much simpler, rounder, cleaner and more game-like. Original GRIDSHARD art; no other game's identifiable artwork.

### bronze.png

Target: BRONZE tier. Dominant warm copper-orange / reddish brown satin body, limited indigo recesses, simple thick bronze trim and one amber/yellow diamond latch. The most modest tier: NO crown or crystals, very few decorative parts, same readable rounded construction as the style anchor.

### silver.png

Target: SILVER tier. Dominant pale icy blue and cool silver-gray satin body, limited indigo recesses, thick pale silver-blue reinforcing bands and one vivid ice-blue diamond latch. Render silver as a stylized flat-ish rarity COLOR with soft volume, never chrome or real brushed steel. NO crown or crystals; only a few broad rounded corner guards, eliminate the target's rivets.

### diamond.png

Target: DIAMOND tier. Dominant vibrant cyan/turquoise satin body, pale icy-blue trim, limited indigo recesses, ONE violet/lilac diamond latch. Keep three chunky cyan crystal fins physically integrated into the top of the lid. Simplify these crystal shapes and all mechanical plates to broad readable forms. No crown, detached crystals, particles or sparkles.
