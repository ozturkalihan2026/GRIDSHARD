# Gerçek 3B — Hedefleme Bilgisayarı pilotu

Sonraki kullanıcı talimatıyla ilk 10 cihazın saha 3B denemesi tamamlandı.
Güncel bağlama/soğutma/ses kontrol listesi: `ILK10_3B_SOGUTUCU_V19_20261018.md`.
Aşağıdaki yalnız Lazer kapsamı önceki turun kaydıdır.

## Güncel: çizime yaklaşım v2 ve canlı Lazer denemesi

Son kullanıcı talimatı eski “oyuna bağlanmaz” kararını **yalnız Lazer için**
değiştirdi. Diğer dokuz yeni cihaz henüz 3B üretilmedi / bağlanmadı.

- [x] Hedefleme Bilgisayarı: pahlanmış optik gövde, daha dolgun ayaklar,
  parçalı gümüş mercek çerçevesi ve cam yansıması. V2: 4.735 üçgen,
  514.016 bayt GLB. Onaylı çizimin birebir kopyası değil; sanat kabulü bekler.
- [x] V2 çıktısı `artifacts/visual-refresh-pack08b-20261018/model-pilot-v2/`:
  `targeting-computer-v2.glb`, `index.html`, `four-views.webp`.
  Önceki v1 korunur. Üretici artık v2 üretir; yeni açı atlası üretmez.
- [x] Lazer: kırmızı/gümüş silah, sabit kaide, ayrı hareketli üst mekanizma.
  Gerçek 2.484 üçgenli geometri kaynakta üretilir; WebP'yi döndürme değildir.
  Savaşta `client/src/battle/laser-3d-pilot.js` üzerinden bağlıdır.
- [x] Her taraf kendi karşı devresine bakan 180° içinde hedefler; arka
  yarım daireye kestirme dönüş yok. Ateş anında namlu hedefe hizalanır.
- [x] Namlu ucu ve kırmızı ışın aynı kamera/projeksiyonu kullanır.
  Boştayken hedef yönü korunur; lazerde ışını koparan geri tepme yok.
- [x] Kamera tepeden 30°. Kart/katalog çizimleri değişmedi.
- [x] Tüm lazerler tek canvas/context/mesh paylaşır. Mevcut savaş saati
  kullanılır; özel RAF/timer, efekt başına devre kurma veya açı dosyaları yok.
  WebGL yoksa veya düşük grafik seçiliyse eski resimli görünüm kullanılır.
- [x] GPU kaybı/gizlenme/silinme durumları ve 180°/namlu testleri geçti.
- [x] Genel statik denetim: 188/188 test; 0 CSS uyarısı, mevcut 20 JS uyarısı.
- [ ] Kullanıcının yerelde iki taraftan atış, ölüm, hedef değişimi,
  yakınlaşma/yeniden boyutlandırma ve düşük grafik geçişi görsel kontrolü.
- [ ] Gerçek GPU/FPS ölçümü ve yeni 3B sanat dilinin kabulü.

Lazer inceleme görseli:
`artifacts/visual-refresh-pack08b-20261018/laser-3d-pilot/laser-preview.webp`.
Kaynak: `tools/preview-laser-3d.cjs`; gerçek runtime geometrisini CPU ile
çizer, oyun ekran görüntüsü değildir (aydınlatma değerlendirmesi GPU'da gerekir).
Sunucu, tarayıcı, native derleme, commit/push çalıştırılmadı. Motor hasarı,
enerji tüketimi ve saldırı aralığı değişmedi. Aşağısı ilk pilotun tarihçesidir.

18 Ekim 2026. Kullanıcı mevcut çizimleri kullanarak gerçek 3B modelleme
istedi. İlk cihaz yerelde geometri olarak oluşturuldu; oyuna bağlanmadı.

## Yöntem ve sonuç

- Referans: Paket 8B `targeting_computer.webp`. Otomatik görselden-model
  dönüşümü değildir; çizimdeki temel şekiller referans alınarak modellenmiştir.
- Bağlı Magnific araçlarında image-to-3D vardır, fakat bu tarihte hesap Free
  ve kullanılabilir kredi 0. Harici üretim/yükleme/satın alma yapılmadı.
- Gerçek hacimli GLB: 4.581 üçgen, 13.743 düz yüzey normalli köşe,
  497.412 bayt. Ön, arka ve yan yüzler geometri içerir; resim düzlemi değildir.
- Sabit kaide ve ayrı optik başlık. `HeadYawPivot` y=1,12 noktasında;
  `OpticalEmitter` başlığa bağlıdır. GLB içinde 8 saniyelik tam tur animasyonu.
- Yeşil/gümüş ana yüzey, iki amber mercek, radar paneli, dört ayak;
  arka servis kapağı ve havalandırma referansta görünmediği için tasarlandı.
- Kaplama görseli yok; renkler vertex-color olarak yazılır. Boyanmış
  çizimin parlaklığı/konturu/ayrıntısı henüz birebir değildir. Daha sade ve
  köşeli bir model denemesidir, nihai sanat onayı verilmiş sayılmaz.
- Aynı gerçek modelden matematiksel olarak eşit 16 yön çıkarıldı. Bunlar
  generatif atlas denemesinden farklıdır; geometri her karede aynıdır.

## Dosyalar

`artifacts/visual-refresh-pack08b-20261018/model-pilot/`:

- `targeting-computer-v1.glb`: düzenlenebilir model ve başlık animasyonu.
- `index.html`: bağımsız çevrimdışı WebGL önizleme. Gövde sürükleme, başlık
  açısı, tepeden eğim ve isteğe bağlı dönüş oynatma kontrolleri.
- `four-views.webp`: aynı geometrinin CPU ile çizilmiş dört yönlü önizlemesi.
- `geometry-16-directions.webp`: aynı modelden 16×128px, 4×4 atlas.
- `mesh-data.json`, `report.json`: geometri ve üretim bilgileri.

Tekrar üretim: `tools/build-targeting-3d-pilot.cjs`, görünüm şablonu
`tools/targeting-3d-viewer.template.html`. Sharp modülü gerektiğinde
`GRIDSHARD_SHARP_MODULE` ile seçilir. Artifacts Git dışında; kaynaklar
saklandığından tekrar üretilebilir. Önceki çizimler/pilotlar korunur.

## Kontrol ve sınırlar

- [x] GLB başlık/uzunluk/buffer sınırları, iki mesh ve emitter düğümü doğrulandı.
- [x] Başlık dönüş kanalının yalnız doğru düğümü hedeflediği doğrulandı.
- [x] Model sayıları sonlu; üçgen köşe sayıları ve dosya yapısı kontrol edildi.
- [x] Üretici ve gömülü görüntüleyici JavaScript sözdizimi kontrol edildi.
- [x] Gerçek mesh üzerinden dört statik görünüş görsel olarak incelendi.
- [ ] Kullanıcının tarayıcıda etkileşimli görünüm kontrolü.
- [ ] Sanat dili için gelişmiş kaplama/aydınlatma ve görsel kabul.
- [ ] Ortak savaş katmanına bağlantı ve gerçek cihaz performans ölçümü.

Görüntüleyici otomatik başlamaz; kullanıcı oynatırsa tek RAF kullanır,
gizlenmede durur. Oyunun DOM'u, saat/VFX sistemi, kamerası ve kaynakları
değişmedi. Sunucu veya tarayıcı başlatılmadı. Runtime ölçümü yapılmadı.

## Sonraki karar

Bu deneme gerçek 360° hacmin uygulanabilirliğini gösterir. Çizime yakınlık
kabul edilmeden diğer dokuz cihazı bu yöntemle üretme veya oyuna bağlama.
Geliştirme yönü: daha dolgun/kavisli model silueti, boyalı yüzey kaplamaları,
kontur ve ortak ışık ayarı. Alternatif: kullanıcı kredili image-to-3D yolunu
seçerse kaynak çizimden kaplamalı model üretip hareketli parçaları ayırmak.
