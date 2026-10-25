# Savaş sahnesi — altı sabit kural, 24 Ekim 2026

Bu not, önceki eşit olmayan hücre oranı, satıra göre ölçü ve bataryaya özel
küçültme kararlarının yerine geçer. Son kullanıcı isteği tek otoritedir.
22:42 ekran görüntüsündeki daha yeni yerleşim isteği için
`SAVAS_DIK_YERLESIM_BARLAR_20261024.md` geçerlidir: barlar hücre içinde,
dik resmin üst silueti hücre üzerine yükselebilir; yatay ayak izi hücrede kalır.

## Altı kuralın karşılığı

1. Her tahtada 5×3 eşit hücre vardır. Sütun ve satırlar aynı ortak hücre
   ölçüsünü kullanır. Eski resmin eşit olmayan iç çizgileri kapatılır;
   eşit, metalik ve köşeleri kırık soketler kodla çizilir. Onaylı metal
   köşeler, renkli dış çerçeve ve sütun resimleri değiştirilmez.
2. Yanlarda açıkta kalan alan durağan metal blok duvarı ile kaplıdır.
   `circuit-walls.svg` 1451 bayt; CSS background olarak bir kez çizilir.
   Yeni efekt döngüsü, bitmap üretimi, filtre veya animasyon eklenmez.
3. Çekirdek kanonik görünür ölçüsü 1; bütün 36 modülün ölçüsü 0.85.
   Batarya istisnası yoktur. Resimlerin şeffaf tuvali değil, opak çizim
   sınırları çevrimdışı ölçülür. Kanonik ölçü uzun kenarı tanımlar;
   farklı şekillerin doğal en/boy oranı bozulmaz. Aynı modülün yönleri
   ortak kayıt çerçevesini korur; dönerken yeniden boyutlandırılmaz.
4. Modüllerde CAN ve ısı, çekirdeklerde CAN barı ayrı kalıcı düğümlerdir.
   Resmin tabanı ile barlar arasında boşluk vardır; son isteğe göre barlar
   hücre içinde durur ve enerji kanalına taşmaz. Aynı durum tekrarında
   düğüm/alan yazımı yoktur.
5. Yerleşim gerçek arena genişliği/yüksekliği, rakip başlığı ve oyuncu adını
   hesaba katar. Mavi devrenin ön metal kenarı oyuncu adından en az 8px önce
   biter; oyuncu adı arena içinde, raftan önce kalır. Dekor sütunları arena
   kenarında kırpılabilir; oynanabilir alan ve ana metal kenar kırpılmaz.
6. Kamera ortografiktir: eğim ve çizilmiş hacim korunur, derinliğe bağlı
   büyütme kaldırılır. Üç eksende aynı scale3d kullanılır; eski sprite Z
   kaldırması temizlenir. Böylece orta/alt/üst sıra ve iki taraf aynı
   modül ölçüsünü kullanır. Çekirdek oyun verisinde merkez (2,1) konumunu
   korur. Normal modüllerin sunucu otoriteli rastgele boş hücreye yerleşme
   kuralı (`engine.py:_cmd_deploy_module`) değiştirilmez.

WebKit'in iç içe 3D döndürmede görüntüyü yassılaştırdığı gerçek çekirdek
vakası ayrıca giderildi: sprite, ortografik zeminin Y ölçeğiyle ters
orantılı 2D telafi kullanır. Geometrik kayıt ve namlu noktaları gerçek
görüntü düzleminden ölçülmeye devam eder; cihaz özelinde boyut istisnası yok.

VS, iki ana metal kenarın ekrandaki orta noktasına bağlı kalır. Enerji
kanalları artık resimdeki eski kesirlere değil, gerçek eşit hücre aralarının
merkezlerine bağlanır. Kısa yol ve güç durumu davranışı korunur.

## Doğrulama

- Birim testleri tüm 36 modülde 0.85 ve yedi çekirdekte 1.0 ölçüsünü kontrol
  eder. Taban merkezleri, gerçek CAN/ısı güncellemesi ve düğüm tekrar kullanımı.
- Tarayıcı testi dört ekran boyutunda 30 hücrenin ekrandaki genişlik ve
  yüksekliğinin eşitliğini, hücre tıklamasını, VS merkezini, iki çekirdeğin
  merkezde olmasını ve mavi metal kenar/isim/raf aralığını ölçer.
- Gerçek kalıcı kart renderer'ı ile 36 modül × 30 hücre = 1080 yerleşim
  denenir: ortak ekran ölçüsü, çekirdeğe 0.85 oranı, bütün yönlerin opak
  sınır zarfının hücreye sığması ve her iki barın resim tabanının önünde
  açıkta olması. Test probları kaldırılır; gerçek savaş verisi değiştirilmez.
- Yedi gerçek çekirdek resminin iki tarafta opak piksel sınırları, isabette
  sabit boyutu; kalkanın iki grafik kademesinde korunması ve fiziksel patlama.

Kanıt: `artifacts/battle-six-contracts-20261024/`.
Son kodda 727/727 istemci ve 10/10 derleme birim testi; Chromium, Android
Chrome ve WebKit'te 6/6 tarayıcı testi geçti. Toplam 3240 modül yerleşim
ölçümü ve 12 ekran-boyutu ölçümü doğrulandı. En büyük VS merkez farkı
0.019px; bütün modül sınırları hücreye sığıyor ve bütün barlar açıkta.
Makinece üretilmiş özet: `verification-summary.json`.
İzole web paketi: `e90836111c129b7b`, 44 betik, 614 izin-listesi varlığı;
iki kaide WebP'si ve yeni durağan duvar SVG'si pakete bağlıdır.
Sunucu, AAB, commit/push veya tanıtım videosu işlemi yapılmadı.
