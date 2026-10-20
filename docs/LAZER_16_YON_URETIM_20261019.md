# Lazer — 16 yönlü boyalı görünüş üretimi (19 Ekim 2026)

Kullanıcı kararı: v1 kalitesinde 16 yön çizilsin; böylece yönler arasında boşluk
hissedilmez. Önce Lazer'de denenecek. Çalışma kodu ve araçları hazır. Kareler
geldiğinde tek komutla bağlanır (aşağıda).

## Kurallar (bağlayıcı)

- **Kamera:** sabit. Zeminin 60° üstünden, yani tepeden 30°; güneyden kuzeye
  bakar (`MODUL_KAMERA_V13_PROMPTLARI_20261017.json` ile aynı). Bütün karelerde aynıdır.
- **Dönüş:** makine yalnız dünyanın dikey ekseni etrafında döner. Ekranda düz kopya
  döndürülmez; makine yatırılmaz, namlu göğe ya da yere bakmaz. Namlu her karede zemine paraleldir.
- **Kaide:** her karede aynı sekizgen kaide, aynı yerde, aynı boyda. Yalnız üst taret döner.
- **Çizim:** onaylı `client/assets/ui/modules-physical-v1/laser.webp` ile aynı tasarım,
  renk, malzeme ve kalınlıkta koyu kontur. Kopya değil, aynı makinenin başka açısı.
- **Sıra (okuma sırası, 4×4):** 0 = Doğu (namlu sağa), sonra saat yönünde 22,5° adım.
  4 = Güney (kameraya doğru), 8 = Batı, 12 = Kuzey (kameradan uzağa).
- Saydam arka plan; gölge, zemin, yazı, çerçeve yok. Her hücrede bol saydam pay.

## Üretim talimatı (Codex built-in image_gen; referans: v1 laser.webp)

```
Use case: game sprite turntable. Reference image: the approved red laser turret
(attached) — keep its exact design, red/silver/dark-navy panels, orange lens,
gold accents, thick dark outline and painted cel shading.
Output: ONE transparent 1536x1536 sheet, exact 4 columns x 4 rows of equal square
cells, one complete turret per cell, centered, generous transparent padding.
No text, labels, grid lines, ground, cast shadows or checkerboard.
CAMERA, identical in all 16 cells: fixed, 60 degrees above the horizontal ground
(30 degrees away from straight overhead), looking from south toward north.
The same octagonal pedestal sits at the same place and size in every cell and
never changes. Only the upper turret turns around the VERTICAL world axis; the
barrel always stays parallel to the ground. Never rotate a flat copy in screen
space, never tilt the barrel up to the sky or down to the floor.
Yaw order in reading order, clockwise seen from above, 22.5 degree steps:
1 E (barrel to the right), 2 E-SE, 3 SE, 4 S-SE, 5 S (barrel straight toward the
viewer, lens facing camera), 6 S-SW, 7 SW, 8 W-SW, 9 W (barrel to the left),
10 W-NW, 11 NW, 12 N-NW, 13 N (barrel straight away from viewer, rear of turret
visible), 14 N-NE, 15 NE, 16 E-NE. Each view shows the genuinely corresponding
front/side/rear surfaces; no two cells identical.
```

## Sonuç — Canva ile üretildi ve bağlandı (19 Ekim 2026)

- Kullanıcı onayıyla onaylı `laser.webp` Canva'ya yüklendi. Görsel `generate-image` ile,
  yukarıdaki kurallarla üretildi. 1264×1264 asıl dosya Canva'dan indirildi:
  `artifacts/lazer16-20261019/lazer-16-yon-1264.png`.
- Kesim: arka plan düz (5,23,40), kontur (5,7,13). Önce renk eşiğiyle silmek konturu da
  siliyordu. Bunun yerine hücre kenarından bağlı bölge doldurma kullanıldı (eşik 10,
  kenarda yumuşak geçiş).
- Namlu ucu: kameraya bakan yarıda (D…G…B) parlayan merceğin merkezi. Uzağa bakan
  yarıda namlunun ucu (orada gövdedeki sarı şerit mercek sanılıyordu).
- Gerçek savaşta doğrulandı: oyuncu Lazerleri KD / KKB, rakip Lazer GGB görünüşüne
  dönüyor ve ışın namludan ya da mercekten çıkıyor
  (`artifacts/savas-baglama-20261019/lazer-yakin.png`).
- **Kusur:** 14, 15 ve 16. kareler (KKD, KD, DKD) neredeyse aynı. Yeniden üretilecek.

## Bağlama (kareler gelince)

```bash
node tools/slice-yaw-atlas.cjs <sayfa.png> laser
node tools/prepare-module-layers.cjs
```

İlk komut 16 kareyi `laser-y00.webp … laser-y15.webp` olarak yazar. Opak arka plan
varsa köşe rengine göre ayıklar. İkinci komut kareleri kaide merkezinden ortak ölçekle
hizalar, namlu uçlarını ölçer ve `module-layer-data.js` dosyasına yazar. Oyun hedefin
zemin yönüne en yakın kareyi seçer (±11°'lik sapma kalır). Ekran düzleminde döndürme yoktur.

Yol, v3 atlası ile 16 kareye taklit edilerek uçtan uca denendi: hizalama, yön seçimi ve
namlu ucu tespiti doğru. Görsel: `artifacts/savas-baglama-20261019/yon16-lazer.png`.
