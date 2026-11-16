# Mühendis Kasası / Engineer Case — v1

16 Kasım 2026. Kullanıcı ortak sanat dili içinde farklı kasa rengi ve tipi,
açılış animasyonu için yaratıcı serbestlik istedi. Petrol emaye, fildişi
pahlar, bakır mekanizma; çanta sapı, üç kollu seçici ve iki yanal kapak.
Mevcut bronz/gümüş/altın/elmas veya lig sandığının yeniden renklendirmesi değildir.

`closed.webp` ve `open.webp`: 512×512, kayıpsız WebP, alpha korunur. Tek
görsel ailesi Ödüller sayfası, Mesaj Kutusu kartı ve seçim/açılış ekranında
kullanılır. Normal sandık sanat kayıtlarına veya ödül olasılıklarına eklenmez.

Yerleşik `image_gen.imagegen` kullanıldı; CLI/API anahtarı kullanılmadı.
PNG ustaları değiştirilmeden yerel `artifacts/asset-archive-20261015/client/assets/ui/engineer-case-v1/`
altına kopyalandı. Bu arşiv Git'e/pakete girmez; oyunun kullandığı iki WebP
bu klasördedir. Başka bilgisayarda tekrar dışa aktarmak için ustaları ayrıca
taşımak gerekir. Kaynak çizimler kesilmedi, parçalara ayrılmadı veya yeniden boyanmadı.

Teknik dışa aktarım (FFmpeg libwebp; her kaynak için):

```text
ffmpeg -v error -y -i <master.png> -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba" -c:v libwebp -lossless 1 -compression_level 6 <runtime.webp>
```

## Kapalı görselin son istemi

```text
Use case: stylized-concept. Create ONE production mobile game inventory asset, a unique ENGINEER CHOICE CASE on a fully transparent background, square canvas. No text, letters, numbers or UI. A hand-painted chunky dimensional sci-fi mechanical engineering case, three-quarter front view, upper-left lighting, simple broad beveled surfaces, crisp silhouette readable at 96px. Distinct silhouette from a conventional treasure chest: squat rounded hexagonal portable workshop case with TWO angular wing-like split top covers opening to opposite sides. Show CLOSED state, covers firmly closed with visible central split. Petrol green enamel body, warm ivory heavy corner armor, aged copper clamps and hinges, dark navy inset understructure. Center front has a large three-spoke mechanical selector lock with three small sockets, subtle warm mint glass, not neon. Thick copper carry handle above back. Small feet. Rich painted highlights, deep occlusion, tactile toy-like form, polished casual strategy game reward prop. Object centered fully visible, fills about80% canvas, transparent surrounding, no scene, no floor, no pedestal, no rectangular border. Avoid treasure-chest domed lid, crowns, gold treasure, gems, thin wire diagrams, photorealism, excessive grunge. Design belongs with navy/gold painted chunky beveled game props but has its own teal/ivory/copper identity.
```

## Açık görselin son istemi

Kapalı PNG tek düzenleme hedefidir; `transparent_background:true` korundu.

```text
Use case: precise-object-edit. This is a production game prop animation pair. Create the OPEN STATE of exactly this same engineer case. Preserve its petrol enamel, ivory broad armor, copper three-spoke front lock, feet, handle, painting style, camera perspective and upper-left lighting. SAME object identity. The two split top covers lift and spread out left and right like mechanical workshop wings. Copper clamps unlocked. Show a deep dark green padded workshop cavity containing THREE simple rectangular slots softly illuminated mint (no actual cards, no objects sticking out). Keep bottom body and front three-spoke selector intact. Transparent background, no floor, no scene, no extra objects, no particles, no lettering, no neon light beams. Center entire open case, no cropping of wings/handle, adequate clear margin. Match closed object's scale when possible, slightly more transparent margin is fine to include the spread covers. Only open mechanism changes. Keep painted chunky casual strategy game prop.
```

Animasyon CSS ile boyut/opacity/transform üzerinde; gerçek teslim gelene
kadar açık görsel ve sonuç görünmez. Mint aydınlanma, bakır parçacıklar ve
seçilen gerçek modül kartının yükselişi; hareket azaltma/düşük grafik ve
Atla ile anında durağan sonuç. Var olan `energy_transfer` sesi aynı efekt
ses seviyesi ve mute ayarına tabidir; yeni beste veya özgün ses üretimi değildir.

[Ekran ve kabul kaydı](../../../../docs/planning/engineer-case-ui-250-acceptance.md).
