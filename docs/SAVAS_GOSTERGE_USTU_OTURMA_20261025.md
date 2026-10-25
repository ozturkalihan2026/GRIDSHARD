# Referanstaki hücre oturuşu — 25 Ekim 2026

Son referans, cihaz ayağının hücrenin dikey merkezinde kalmasını değil,
alt göstergelerden kalan alanı dik duran cihazın doldurmasını istiyor.
Önceki merkezde ayak kuralı bu istekle değiştirildi.

- Modülün kayıtlı opak tabanı alttan13px: 8px alt boşluk + 4px ısı barı +
  1px temas payı. CAN alttan2px/5px, ısı alttan8px/4px aynı konumdadır.
- Çekirdekte ısı barı yoktur. Onun tabanı alttan8px: CAN alanının üstünde
  1px pay. Böylece olmayan ısı barı için gereksiz boşluk bırakılmaz.
- Temas gölgesi tam çizim tabanına bağlanır, yalnız sahnenin %7'si kadar
  basık ve %64 genişliğinde. Eski hücre-ortası geniş gölge kaldırılır.
- Cihazın kare sahnesi ve sabit tabandan yükselen billboard'u korunur.
  Hacim mevcut çizimden gelir; ayak zeminden ayrılmaz. 36 modül ve 7 çekirdek
  aynı ortografik kamerayı kullanır. Ek döndürme/filtre/animasyon katmanı yok.
- Son %10 büyüklük artışı, modülün çekirdeğin .85'i olması, enerji kanalları,
  zeminin tek resmi, Akım barı ve raftan yerleşme animasyonu değiştirilmedi.

Tarayıcı kontrolleri yalnız görünürlük değil, bütün hücrelerde opak çizim
tabanı ile ilk gerçek gösterge arasında yaklaşık1px temas payı arar. CAN/ısı
göstergeleri hâlâ hücre içindedir. Son kullanıcı düzeltmesiyle katman sırası
kablo0 < gösterge1 < cihaz2 oldu: komşu cihaz bir göstergeyi örtebilir ama
gösterge komşu cihazın üzerine çizilemez. Kendi cihaz tabanı barın üstünde
bittiğinden kendi göstergesi açık kalır. Basık gölgenin
altı, çizimin kayıtlı ayağıyla aynı noktada olmalıdır.

Son kanıt dizini: `artifacts/battle-grounded-seat-final-20261025/`.
Doğrulama: 18/18 hedefli istemci testi; Chromium, Android Chrome ve WebKit
profillerinde 6/6 görsel test. 3240 modül-hücre yerleşimi, 174 dolu-tahta
göstergesi ve 7 çekirdeğin iki taraftaki opak sınırları kontrol edildi.

## Enerji darbe çerçevesi düzeltmesi

Yanıp sönen turkuaz enerji/destek çerçevesi `.module-fx-overlay` idi. Eski
z40 yerine yalnız savaş alanında z0 kullanır; can/ısı1 ve cihaz2 korunur.
Renk ve tek seferlik .7s darbe değişmedi. Düşük/orta/yüksek kalite aynı zemin
sırasını kullanır. Yeni test, dolu tahtada90 çerçevenin12 kenar noktasında
opak görüntünün çerçeveden önde olduğunu doğrular.
Kanıt: `artifacts/battle-energy-frame-ground-20261025/`.
