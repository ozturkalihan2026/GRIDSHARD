# Savaş: merkez oturma, arkadaki enerji, Akım HUD ve yerleşme — 25 Ekim 2026

- Enerji kılıfı ve parlak akım izi aynı z0 zemin sırasındadır. Fiziksel cihaz
  z2, can/ısı göstergeleri z100 kalır. Hat geometrisi, rengi, kalınlığı ve
  en kısa hücre-arası yol hesabı değiştirilmedi.
- Cihazın temas gölgesi her hücrenin tam merkezine sabitlendi. Kare cihaz
  sahnesinin altı `50% - birim*.06`, gölge merkezi sahnenin %94 yüksekliğidir.
  Böylece çizimin öne doğru uzanan tabanı da doğal kalır. X/Y oturma kaydı,
  30 hücrenin gerçek ekran koordinatlarıyla denetlenir.
- Modül ve çekirdekler önceki duruma göre 1.10 büyüdü; ortak birim
  `baseSize*.92*1.15*1.10*1.10`. Tüm 36 modül her hücrede çekirdeğin .85'idir.
  Tahta/kaide boyutu, zemin kaydı ve hücre aralıkları değiştirilmedi.
- CAN 5px/alttan2, ısı 4px/alttan8; kalınlık, konum ve gerçek değerleri aynı.
- Oyuncu adı mevcut Akım barına taşındı. Eski alt kimlik alanının boş yerleşim
  payı korunur; devreyi yeniden kaydırmaz. Mevcut sunucu Akım bakiyesi /12
  oranında turkuaz dolgu, 550ms transform geçişiyle gösterilir. Dolgu yalnız
  bakiye değişirse yazılır; CSSOM'un kesir yuvarlaması tekrar yazım üretmez.
- Raftan kabul edilen istek en fazla 5 saniye bekler. Sunucu modülü gerçek
  hücreye yerleştirip kalıcı kartı oluşturduğunda 360ms raftan-varış görseli,
  kart görselinde 120ms gecikmeli 240ms görünme oynar. Kartın HUD'u ve savaş
  konumu hareket etmez. İlk çekirdek, sıradan HP/ısı güncellemesi, zorunlu
  yenileme ve tıklamasız anlık görüntü uçuş başlatmaz.
- Geçici resim ve animasyonlar varışta bırakılır; menüye çıkış/savaş sıfırlama
  ve belge gizlenmesinde hemen iptal edilir. Bekleyen istek sayısı en fazla15.
  Azaltılmış hareket tercihinde uçuş ve dolum geçişi oynatılmaz. Yeni sürekli
  animasyon döngüsü veya zamanlayıcı yoktur; Web Animations tek sefer çalışır.

Kod: `client/src/battle-platform-v17.css`, `client/src/app.js`,
`client/src/battle/board-view.js`, `client/index.html`.
Kanıt: `artifacts/battle-seat-hud-final-20261025/`.
Doğrulama: 734/734 istemci testi, 10/10 derleme testi, Chromium/Android/WebKit
profillerinde 6/6 görsel test. Toplam 3240 modül-hücre yerleşimi, 174 dolu
tahta göstergesi ve 18 çekirdek güç dalgası kontrolü; uçuşların 9 kez
tetiklenip temizlenmesi; dört ekran boyutunda hücre ortası temas gölgeleri,
arka kablo katmanı, HUD adı ve dolgu geometrisi doğrulandı.
Bu sonuçlar gerçek telefonda FPS ölçümü değildir.
Önceki denemeler `battle-seat-hud-20261025` ve `battle-seat-hud-verified-20261025`
klasörlerindedir; son onay kanıtı olarak kullanılmaz.
