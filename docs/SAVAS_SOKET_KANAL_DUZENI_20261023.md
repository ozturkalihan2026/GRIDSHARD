# Sekizgen oturma alanı ve hücre arası kanallar — 23 Ekim 2026

## Son kullanıcı düzeltmesi

Tasarım korunacak; rakibin kırmızı ve oyuncunun mavi metal ayrıntıları
değişmeyecek. Önceki soketten **yalnız sekizgen gömme oturma alanı** alınacak.
İlk hazırlanan nötr tam-soket imagegen varyantı bu nedenle **kullanılmadı**;
istemciye yeni bitmap eklenmedi, mevcut üç resim değiştirilmedi.

Korunan `client/assets/ui/battle-platform-v2/` varlıklarının SHA256 değerleri
`client/tests/battle-platform.test.js` ile sabitlendi:

- platform-player.webp: 8e66eb494a2b15e2fe59027379670c51f4002feadeb9537042f4e53c5b97a9c7
- platform-enemy.webp: efcd69a9b6f69e702dcddec810a56dcbf0964df904a20334ca026318ce05e533
- circuit-depth.webp: 801b7a7730f4ea5586661278580d2f5dbe5793698280fe4e137bc91582333aa5

## Uygulama

- V17 aynı kayıtlı tam platformu ve mavi/kırmızı dış çerçeveleri kullanır.
  Her hücrede iki durağan CSS zemin yüzüyle bevel + gömme sekizgen kuyu vardır.
  Clip-path sadece bu düz pseudo yüzlerdedir; hücre, kart, modül ve çekirdeğin
  preserve-3d/overflow zincirine uygulanmaz. Böylece aygıtlar kırpılmaz.
- Geniş aralıklarda en dar WebKit ekranındaki Rezonans çekirdeği eski belirginlik
  sınırının altına düşüyordu. Yalnız Rezonans'ın kare host iç payı 3px→2px
  yapılıp host 2px aşağı oturtuldu; diğer çekirdekler değişmedi. Kare kayıt
  korunur; object-fit harf kutulaması oluşmaz. Yedi çekirdeğin belirginlik ve
  kırpılma testi korunarak tekrar doğrulandı; eşikler gevşetilmedi.
- Düzen sahibi V8'de hücre boşluğu eski 8px yerine 12–16px olur. Tahta hâlâ
  5×3; boyut formülleri hem genişlik hem yükseklikte gerçek yeni boşluğu çıkarır.
  Eski bütün platform boyasının üstünde yalnız hücre aralıklarını koyulaştıran
  durağan bir zemin yüzü bulunur. Mavi/kırmızı kenarlar ve arka plan aynıdır.
- Kablo geometrisi artık merkezden merkeze düz çizgi değil; gerçek hücre
  ölçülerinden türetilmiş aralık birleşimlerini izleyen SVG path'lerdir.
  Ana yollar soketlerin içinden geçmez. Güç alan gerçek modüller alt kenardaki
  porta kısa bağlantı alır; boş transit hücreye port ucu veya güç ışığı verilmez.
- 22 mantıksal komşuluk kenarı ve mevcut 132 SVG düğümü/tahta korunur.
  Dört port-uç varyantı yalnız geometri değişince hazırlanır. Savaş karesinde
  yalnız değişen güç yönü/görünürlük/uç varyantı yazılır; aynı snapshot kablo
  düğümü üretmez, geometri okumaz veya kablo DOM'una tekrar yazmaz.
- Gerçek sunucu güç/komşuluk kuralları, ekonomi, cihazlar ve kontrol alanları
  değişmedi. Yeni hareket/rAF/timer/partikül/3D yüz/canvas yok. 60 sabit hücre
  pseudo yüzü bedelsiz çizim sayılmaz; Windows WebKit FPS sorununun çözüldüğü
  iddia edilmez. Önceki V2 ölçümü ~4 FPS idi; bu belge yeni FPS onayı değildir.
- İlk tarayıcı kontrolü, hücreler henüz kurulmadan gelen kablo güncellemesinde
  null geometri hatası yakaladı. Eksik kenarlar atlanıp boş SVG sonraki çizimde
  yeniden ölçülür; boş-tahta → gerçek hücreler yaşam döngüsü regresyonu eklendi.

## Doğrulama / teslim

Son kare Rezonans yerleşiminden sonra Chromium, emüle Android Chrome ve
WebKit zemin/çekirdek matrisi **6/6 geçti** (24 Ekim). Kare host, kırpılma,
belirginlik, yerleştirme ve kanal katmanları doğrulandı; bu FPS ölçümü değildir.

Son küçük Rezonans CSS düzeltmesinden ÖNCE 722/722 istemci testi ve 10/10
build regresyonu geçti. O aşamadaki yalıtılmış gerçek web
paketi `2336ca8eb0c57b26`: 44 betik, 614 izin-listesi varlığı, aynı üç CSS
WebP çıktısı. Ana dist/Android değiştirilmedi; sunucu/AAB/commit/push yok.

Son CSS sonrası tam istemci testi/paket yeniden çalıştırma isteği otomatik
onay incelemesinin kullanım sınırı hatası nedeniyle yürütülmedi. Bu güvenlik
reddi değildir; onay incelemesi tamamlanamadı. Önceki paket son CSS'yi içeriyor
diye sunulmamalı; yeni paket ve tam tekrar doğrulama hâlâ bekliyor.

Kanıtlar `artifacts/battle-gutters-20261023/` içinde. Yeni testler 28/64/84px
hücreler ve 12/14/16px boşluklarda bütün komşu kanal segmentlerinin soket
içinden geçmediğini, portların tam hücre kenarında olduğunu, boş transitlerin
uç almadığını ve resize sonrasında aynı kuralların korunduğunu doğrular.

Tanıtım videosuna dokunulmadı; yeni kayıt alınmadı. Önceki videonun SHA256'sı
65896a58fe0dd3030866556d689035cd4fb52afd2469d6373308b43e3fb418a8.
