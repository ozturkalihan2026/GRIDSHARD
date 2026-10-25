# Yakın kamera, gerçek soket hizası ve çekirdek CAN — 24 Ekim 2026

Kullanıcı yan boşlukların kapanmasını, modüllerin/çekirdeklerin hücreyi
doldurmasını, çekirdek CAN barının görünmesini ve sağ/sol kaymanın giderilmesini
istedi. Onaylı iki kaide resmi, 5×3 oyun düzeni ve savaş kuralları korunur.

## Neden ve çözüm

- Çizimde dış sütunlar daha geniş; eski canlı ızgara beş eşit kareydi. Sadece
  resimleri büyütmek merkezleri eşitlemiyordu. Canlı sütun oranları artık
  `23.4 / 17.2 / 18.8 / 17.2 / 23.4`, satırlar `34.5 / 36.5 / 29`.
  Hücre sınırları resimdeki kanal merkezleriyle aynı; dokunma alanları ve
  enerji portları aynı gerçek hücre geometrisini kullanır.
- Dikdörtgen hücre içinde resim kaydı kare kalır; kısa kenar eksi 4px
  boyutunda, yatay ortalı ve altta oturur. Eski daha seçici çekirdek oturma
  CSS'i kaldırıldı; modül/çekirdek kaydının tek sahibi son platform stilidir.
- 36 modülün gerçek opak tabanı çevrimdışı ölçüldü. Şeffaf resim tuvalinin
  ortası yerine taban merkezi esas alınır; boyut ve taban konumu `socketFit`
  olarak üretilir. Çalışma anında resim ölçümü, canvas veya yeni timer yok.
  Namlu/destek efektleri de aynı kayıt çerçevesini kullanır.
  Son kullanıcı değerlendirmesiyle modüller bu kayda göre ayrıca %14 küçük;
  çekirdeğin ölçüsü değişmez. Küçültme de taban merkezi/sabit oturma noktasından
  hesaplandığı için yatay hizayı veya namlu konumunu bozmaz.
- Ortak zemin/tahta kamera ölçeği `.98 → 1.08`. Genişlik sınırı `%78` ile
  perspektifte yakın köşelerin oynanabilir alan dışına çıkması önlenir.
- Eski çekirdek pseudo-CAN katmanı resmin altında kalıyordu. Artık her
  çekirdekte bir kalıcı ön katman CAN ölçeri var; gerçek CAN/maksimum CAN
  ile güncellenir, yalnız çekirdek yıkılınca gizlenir. Tekrarlanan aynı durum
  yeni düğüm veya alan yazımı oluşturmaz.

## Önceki yerleşim korunuyor

Rakip tarafı -12px; yalnız mavi taraf +32px. VS yeni boşlukta +10px.
Oyuncu adı arena tabanından 16px yukarı, rafın üstünde. Adın eski satırını
çıkarınca kırmızı tarafın yeniden akmaması için aynı yerleşim yüksekliği
korunur. Üst kırmızı sütunlar özgün aşağı yönünde, iki aktif kaide resmiyle
aynı malzemede. Ayrı eski canopy veya eski zemin resmi eklenmedi.

## Kontroller

- Tarayıcıda iki tahta × 15 hücre: çizim sınırına en çok 1px kayıt farkı;
  resim kayıtları kare ve yatay ortalı; hücreler hâlâ tıklanabilir.
- 320×568, 393×852, 1280×720, 1920×853 boyutlarında taşma, isim/raf aralığı,
  ortak zemin kamerası, gerçek CAN ölçerleri ve kalıcı hücre kimlikleri.
- Yedi çekirdeğin iki tarafta gerçek opak sınırları, görünür boyutu ve
  isabette kırpılmaması; kalkan ve fiziksel patlama davranışı.
- Tüm kaynak/hedef enerji yolları hem eski eşit hem yeni çizim oranlı
  geometrilerde: en kısa kanal yolu, hücre içinden geçmeme, DOM/ölçüm önbelleği.
- `python tools/audit-module-footprints.py --check-fit` üretilmiş 36 kaydı
  özgün resimlerden yeniden doğrular. Python/Pillow sadece üretim denetiminde.

Kanıt ve son test raporları: `artifacts/battle-camera-fit-20261024/`.
Son modül küçültmesi sonrasında 724/724 istemci testi ve üç tarayıcıdaki
6/6 zemin/çekirdek testi geçti. İzole web paketi `3ae4ff635739ceb6`:
44 betik, 614 varlık; aynı iki kaide resmi toplam 327458 bayt.
Bu tur sunucu, AAB, commit/push veya tanıtım videosu işlemi yapılmadı.

## Devam rötuşu — VS ve batarya

VS'nin sabit +10px kaydırması kaldırıldı. Ana metal çerçevenin kaynak y145
ve y730 sınırları zemine bağlı iki görünmez noktayla kaydedilir; VS bunların
ekrandaki orta noktasına yerleşir. Hesap yalnız mevcut layout invalidation
akışında yapılır; iki tahtayı taşımaz, sürekli ölçüm veya döngü oluşturmaz.
Tarayıcı testi dört ekran boyutunda merkez farkının 1px altında olmasını
ve VS'nin iki metal kenar arasında bulunmasını doğrular.

Tüm 36 modülün küçültme kaydı kontrol edildi. 35 modül %86 ölçekli; batarya
ayrıca %10 küçültülerek %77.4 oldu (ilk dolu-boyut kaydına göre). Resmin
taban merkezi ve zemine oturma noktası yeniden hesaplanır; çekirdek değişmez.
`python tools/audit-module-footprints.py --check-fit --json` her modülün
ölçeğini, boyutunu ve merkez farkını özgün resimlerden raporlar.
Son devam kanıtları `artifacts/battle-vs-size-20261024/` içindedir.
Bu devamda 725/725 istemci, 10/10 paket birim testi ve Chromium/Android/WebKit
yerleşim testleri 3/3 geçti. `module-size-audit.json` 36/36 küçültme kaydını
ve en büyük normalize taban merkezi farkının 0.000005 olduğunu gösterir.
