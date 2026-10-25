# Onaylanan savaş kaidesi ve enerji yolları — 24 Ekim 2026

Kullanıcının seçtiği çizim doğrudan oyuncu varlığı oldu; oyuncu resmi yeniden üretilmedi.
Rakip varyant yerleşik imagegen ile aynı çizimden üretildi. CLI/API kullanılmadı.

- Kaynak oyuncu: C:/Users/S-A/AppData/Local/Temp/codex-clipboard-069ef928-14bc-442a-aaab-d44767950e9d.png
- Kaynak rakip: C:/Users/S-A/.codex/generated_images/01a0302f-786b-7613-9af9-d49cd1a9ee49/exec-8260a746-ff5f-4f27-acbd-3dda09cdea52.png
- Proje kaynak kopyaları: artifacts/battle-approved-20261024/source/island-{player,enemy}.png
- Aktif varlıklar: client/assets/ui/battle-approved-v5/island-{player,enemy}.webp
- 1024×1024 WebP, oyuncu 179622 bayt, rakip 147836 bayt; toplam 327458 bayt.
- Dışa aktarım: tools/prepare-battle-islands.py, yalnız ölçekleme ve WebP dönüşümü.
- Görseldeki kaide ve bağlı sütunlar sahne zeminidir; arka plan kırmızı/turkuaz ışıkla bütünleşir.
- Kaynak zemin kayıt bölgesi x255..1000, y249..574 / 1254. Arka plan taşları
  alt adanın arkasına geçerek derinlik verir; en alt uzantılar arena sınırında kırpılır.
- Eski V4 resimleri ve eski iki zemin üretim aracı aktif klasörden çıkarılıp
  artifacts/battle-approved-20261024/retired/ içine taşındı. Önceki V2/V3
  resimleri eski artifact arşivlerindedir; istemcide kullanılmaz.

## Enerji yolları

Zorunlu sağ-alt kavşak ve yatay-önce/dikey-sonra mantığı kaldırıldı.
24 Ekim son düzeltme: her hücre üst ve alt girişini kullanabilir. Üst sıra
çekirdeğin üst kanalından, alt sıra alt kanalından doğrudan sağa/sola dallanır.
Yalnız alttan girişin neden olduğu sıra dolaşımı kaldırıldı. Çok kaynaklı
Dijkstra toplam giriş/çıkış mesafesini de hesaba katar; önbellek ve 60 yol korunur.
Dijkstra, çizimdeki hücre arası kanallarda gerçek piksel uzunluğu en kısa
güzergâhı seçer. Eşit mesafede daha az dönüş tercih edilir; küçük kırık köşeler
devre çizim diliyle eşleşir. Dış hücreler daha geniş olduğu için çizimdeki
kanal merkezleri ayrı ölçülür. 5×3 yerleştirme hitbox'ları korunur.
Sadece güç alan, hayatta olan hedefler bağlanır. Boş hücreler güçlenmez.
15 hedef için 60 kalıcı SVG yolu (önceden 132 yol/temas nesnesi) kullanılır.
Yollar kaynak konumu ve layout için saklanır; değişmeyen snapshot DOM düğümü,
geometri okuması veya kablo attribute yazımı üretmez. Yeni timer/animasyon yok.

## Rakip üretim istemi

Doğrulama: 721/721 istemci testi; 6/6 kaide/çekirdek regresyonu ve son kanal
hizasında 3/3 tarayıcı profili geçti. Son paket kimliği 3a508112f2e2c4a8.
Bu kontroller gerçek Android/iPhone cihazında FPS ölçümü değildir.

Use case: precise-object-edit. Input image is the EXACT approved player battlefield sprite, edit target, not a loose style reference. Produce the enemy team variant. Preserve the exact square canvas, silhouette, composition, all 5 columns by 3 rows of dark neutral metal equipment sockets, their exact positions, all silver elbow corner blocks, golden couplers, every navy pedestal column, and the long raised foundation. Change ONLY luminous cyan/turquoise channels and cyan perimeter blocks to saturated enemy red with warm red-orange energy cores. Reflected light on nearby dark navy blocks may become subtle red. Keep the floor neutral dark blue-grey and corner metal SILVER, not red. No devices, text, logo, added objects or new geometry. Transparent alpha outside the whole island silhouette, no black background. Match the original pixel registration and cropping closely. Entire island with all pillar tips must be present.

