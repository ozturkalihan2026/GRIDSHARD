# CARD-01 — Geri Tepme Topu aday sanatı

17 Kasım 2026. Aktif modül kataloğuna veya istemci varlık manifestine eklenmedi.
Kırmızı mine / soğuk çelik / lacivert gölge / kehribar piston, üst-sol ışık ve
iri boyalı hacimler mevcut `modules-physical-v3/burst_cannon.webp` ailesini izler.

- `recoil_cannon-master.webp`: başarılı tek açılı üretimin kayıpsız WebP kopyası.
- `recoil_cannon.webp`: aynı çizimin 512 px, kalite92/alpha100 önizlemesi.
- İlk tek açılı çizimin dönüşümü yalnız format/boyut hazırlığıdır. Sonraki
  sekiz yön aşağıdaki ayrı üretimde çizildi. PNG kaynak genel UI PNG ignore kuralına tabidir;
  taşınabilir kayıpsız master depoda korunur.
- 48 ve64 px küçük ikon ile320/393 px çalışma sayfası görsel olarak incelendi.
  Bu kayıt yoğun savaş veya fiziksel Android kabulü değildir.

## Üretim kaydı

Yerleşik `image_gen.imagegen`, `transparent_background: true`, yeni üretim;
referans görsel parametresi yok. Özgün üretim PNG adı:
`exec-0b017cb9-456b-4f30-872b-e21052005e90.png`.

Tam üretim prompt'u:

> Use case: stylized-concept. Generate ONE production game sprite on a truly transparent background, no text. Asset: GRIDSHARD Recoil Cannon attack module. Match a polished casual mobile strategy painted 3D sprite: chunky beveled red enamel armor, cool silver steel edges, deep navy undersides, amber physical accents, black contour separation, broad upper-left highlights; clean volumes readable at 48 pixels. New silhouette: ONE very wide short heavy cannon barrel on a clearly visible horizontal recoil slide, two thick hydraulic pistons flanking the barrel, sturdy compact octagonal turntable plinth. Must not look like a triple barrel cannon, laser, missile launcher or long railgun. Cannon points diagonally toward upper right, seen from elevated three-quarter isometric camera; muzzle and piston mechanics clearly readable, complete base fully visible. Slightly exaggerated compact industrial toy proportions, broad facets, restrained panel detail, no thin neon circuitry or HUD, no fireball, muzzle flash, projectile, numbers or labels. Single isolated object centered, fills about 85 percent of a square canvas with comfortable transparent margins, crisp antialiased alpha edges, no cast ground plane or opaque backdrop.

## Sekiz yönlü atlas — üretildi

17 Kasım kullanıcı ayrıca yön atlasını üretmemizi istedi. Yerleşik görsel
aracı aynı özgün çizimi referans alarak3×3 atlası bu kez başarıyla üretti.
İkinci, yalnız kenar temizliği isteyen düzenleme renkli artıkların çoğunu
temizledi; çizimler ve yönler korundu. Başka araç veya CLI kullanılmadı.

- `recoil_cannon-atlas-master.webp`:1254×1254 kayıpsız taşınabilir master.
- `recoil_cannon-atlas.webp`:1024×1024 atlas önizlemesi.
- `recoil_cannon-{e,ne,n,nw,w,sw,s,se}.webp`:sekiz ayrı512×512 yön.
- `recoil_cannon-directions.json`: kaynak hücreleri, yön/açı, alfa sınırları,
  taban pivotu/genişliği ve SHA256. Üretim prompt'ları `atlas-generation.json`.

Satırlar E/NE/N, NW/W/SW, S/SE/boş. Kamera yüksekliği ve boyalı sanat ailesi
aynı; uzak yönlerde arka gövde, yakın yönlerde geniş namlu ağzı görünür.
Bütün görüntüyü ekranda çevirme veya aynalama yapılmadı. Tabanın konumu ve
genişliği önizlemede ölçülen pivotla hizalanır; yön resmi değiştirilir.

`tools/prepare-recoil-cannon-atlas.cjs` yalnız hücre ayırma, oranı koruyan
boyutlandırma ve WebP dönüşümü yapar. Alfa boyanmadı/eşiklenmedi; ölçüm
yapıldı. Boş hücrede görünür çizim yok,133 pikselde1/255 alfa kodlama artığı
korundu ve manifestte açıkça kaydedildi. Sekiz dolu hücre kenardan kesilmez,
aynı dosyanın dönmüş kopyaları değildir. Küçük boyut/320/393 önizlemesi
incelendi. Kayıpsız master'dan tekrar üretim manifesti birebir aynı kaldı.

```
# Mevcut Sharp kurulumu; gerekirse GRIDSHARD_SHARP_MODULE ile seçilir.
node tools/prepare-recoil-cannon-atlas.cjs
# PNG yoksa depodaki kayıpsız WebP master kullanılır.
```

Atlas dosyaları ve gerçek renderer kaydı hazırdır. Üretici script ayrıca
`client/src/battle/recoil-cannon-art-data.js` yazar: ölçülmüş taban genişliği,
her yönün namlu çıkışı ve sabit kaide/hareketli kızak sunumu. Derlenmiş kadroda
`recoil_cannon` yoksa bu ek kayıt etkinleşmez. Sekiz yönün projeksiyonu gerçek
renderer ile sınandı; mevcut24'lük art registry ve paket varlıkları korunur.
Yoğun sahne/fiziksel cihaz kabulü henüz yapılmadığından
`release_art_accepted:false` korunur. Bu dosyalar tek başına kartı yayımlamaz.

### Önceki başarısız deneme kaydı

Bu master referansıyla istenen sekiz zemin yönlü3×3 atlas üretimi sonuç
vermedi. Araç HTTP400 `moderation_blocked`, kategori `illicit` döndürdü;
request ID `7f509551-da1d-46b2-a665-c7e09d2853e5`. O denemede dosya oluşmadı.
Bu tarihsel kayıt sonraki başarılı atlas üretiminin yerine geçmez.

Tek açılı çizim yön atlası kabul edilmez. Mevcut sanat kuralı uyarınca bütün
sprite ekranda çevrilerek sahte yönler üretilmez; taban dik kalmalı, her yön
aynı namlu/piston/kaide geometrisini korumalıdır. Bu kural başarılı atlas
üretiminde de korundu; oyun içi sanat/yayın kabulü ayrıca tamamlanacaktır.

SHA256 (master /512 px):

```
e3395ecbb0383808ad42bddb978bb30dab39b041790ff68bdfcbb05b7d6c1ff1
5c67995314606e9c60f3d1ce55fbf3ebc810b0c94f2e683c5f8cc42bcd74fe6a
```
