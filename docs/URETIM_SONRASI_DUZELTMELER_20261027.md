# 27 Ekim — üretim onayı sonrası ikon, yerleşim ve savaş dengesi

Kullanıcı Google Play üretim başvurusunun kabul edildiğini bildirdi. Bu paket
27 Ekim telefon görüntülerindeki sorunlar içindir; canlı hesap kaydı değiştirmez.

## Görünüm

- Son deneme: kullanıcı arkadaki düz gri blok deseninin kaldırılmasını
  istedi. Arena zemini `circuit-walls.svg` yerine bu SVG'de blokların
  arasından görünen aynı#0a1933 koyu renktir. Düz gri arka bloklar ve bu
  arka katmanın dekoratif çizgileri çizilmez; kırmızı/mavi boyalı adalar,
  modüller ve oyun enerji hatları aynı kalır. Yeni efekt veya animasyon yok.
- 22 Ekim mağaza teslimindeki onaylı reaktör, uygulama ikonlarının kalıcı kaynağı
  olarak depoya alındı. Yeni çizim yok. Web/favicon/PWA, Android'in beş yoğunlukta
  launcher/round/adaptive/monochrome ikonları ve native açılış ikonu, iOS AppIcon
  aynı resimden çıkarılır. Android projesindeki 30 PNG kaynaklarıyla eşleşir.
  Mağaza için 512 px çıktı kaynakla aynı RGB piksellerindedir.
- Devre sığdırması yalnız hücreleri değil, 1254 px resmin tamamını 728 px
  zemin kaydıyla birlikte hesaba katar. Her yanda en az 8 CSS px pay bırakır;
  sonraki %10 büyüme önceden hesaba katılır. Modül/çekirdek boyut oranı, hücre
  kaydı, enerji hatları, göstergeler ve dokunma hedefleri aynı kamera düzleminde.
  Kullanıcının sonraki telefon önizlemesi düzeltmesi: bu yatay küçülmenin
  altında bıraktığı büyük boşluk, mavi resmin altının alt rafa8 px payla
  bağlanmasıyla kaldırıldı. Kaynakta resim altı/floor-top uzaklığı994/404;
  kısa ekranlarda güvenli asgari iki devre aralığı korunur. Gizli oyuncu
  vitals satırının eski18 px boş yüksekliği de kaldırıldı. VS iki gerçek
  metal kenarın ortasını izler; resim esnetilmedi veya yeni dekor eklenmedi.
- ÖDÜL LİSTESİ gerçek başlık satırına taşındı. Kullanıcının ek düzeltmesiyle
  başlığın sağ ucunda 22 px görünen düğme, 9 px yazı; iki sütunla tek satır
  korunur. Saydam dokunma payıyla 44 px yükseklikte erişilebilir. Eski genel
  mobil düğme ve başlık kuralları bu eylemi büyütemez.
- Kartlar > Çekirdek sekmesi mevcut `core_resonance.webp` fiziksel çekirdek
  resmini gösterir. Önceki bilgi kartı çekirdek simgesi bu sekmede kullanılmaz.

## Savaş

Kök neden: profil çekirdek seviyesi enerji üretimine uygulanırken savaş CAN'ı
seviye 15'te de 300 kalıyordu. Ortak dayanıklılık eğrisi `300 × 1,08^(seviye−1)`:
seviye 1'de 300, seviye 15'te 881 CAN. Çekirdek türleri aynı seviyede eşittir.
Koleksiyonun şimdiki/sonraki CAN değerleri motorla aynı işlevi kullanır.
AI seviyesi kurulumdan sonra eşlendiğinde hazır çekirdeğinin CAN'ı da maç
başlamadan bir kez yenilenir. Tekrar start çağrısı hasarı iyileştirmez.

Yerleştirme Akımı: Kuantum Topu 6→4, İyon Mızrağı 6→4, Kuantum Tekrarlayıcı
5→4. Sunucu kanonu, istemcinin gömülü verisi ve üretilen kanon belgesi aynı.
Diğer kartların maliyeti, Akımın 6/12 başlangıcı ve 2,5 sn yenilenmesi korunur.

Aksiyon enerjisinin ısı katsayısı 2,2→0,9. Isının %45'te yavaşlatması,
%100'de durdurması, %70 altında toparlanması ve pasif soğuma kuralları aynı.
Soğutucu uzun ateşte ve hız desteği altında değerini korur.

İzole sürekli ateş ölçümü (Sv15, varsayılan AI yetenekleri, soğutucusuz):

| Silah | İlk aşırı ısınma, önce | Sonra |
|---|---:|---:|
| Kuantum Topu | 15,1 sn | 41,6 sn |
| İyon Mızrağı | 18,4 sn | 50,6 sn |

Soğutuculu iki ağır silah da aynı 120 sn denemesinde aşırı ısınmadı. Ölçüm
aracı `tools/production_balance_probe.py`; kaynak rapor
`artifacts/production-fixes-20261027/balance-probe.json`. Araç ayrıca eski/yeni
değerlerle iki yönlü, Sv1/Sv15 toplam 16 sentetik AI maçı çalıştırır; bunlar
gerçek oyuncu galibiyet oranı veya tüm deste evreni için denge garantisi değildir.
Aktif çekirdek güçleri bu sentetik karşılaştırmada kullanılmaz.

## Doğrulama

- Sunucu: 1802 geçti; PostgreSQL/Redis gibi yerel gerçek servisler gerektiren
  44 test atlandı. Yeni altı savaş regresyonu: eşit seviye CAN, AI kurulum
  sonrası seviye eşleme, tekrar start ile iyileştirmeme, iki ağır açılış
  atışından sağ çıkma (Kuantum tam yüklü), soğutucusuz 30 sn çalışma.
- İstemci: 744/744. Paketleme: 10/10. Son kompakt başlık web build: `9a72673b0c29fd63`.
  Ek başlık kontrolü 320/393 px ve masaüstü/Android'de 2/2 geçti; 22 px yükseklik,
  en çok82 px genişlik, başlıkla aynı dik merkez ve sağ uç konumu denetlendi.
  Güncel görüntüler `artifacts/shop-heading-compact-20261027/` altında.
- Tarayıcı: masaüstü/Android/WebKit üç profilde 3 savaş geometri/görsel testi
  ve 3 çekirdek bilgisi/fiyat testi; masaüstü/Android'de 2 mağaza+çekirdek ikon
  testi geçti. Mağaza 320/393 px, savaş 320/393/1280/1920 px genişliklerde.
  Savaş testi tam ada genişliği, hücre kaydı, dokunma, 36 modül/7 çekirdek
  çizimleri, CAN/ısı örtüşmesi, enerji ve altı özel güç dalgasını da denetler.
- İlk denemelerde Windows sandbox atomik rename/hard-link işlemlerini
  engelledi; aynı izole testler normal izinlerle geçti. Ürün kodunda izin
  kısıtını aşan bir davranış eklenmedi. Mağaza testinin eski 63×54 beklentisi
  mevcut 96×96 resim yuvasına, yeni Kartlar gezinme seçicisi gerçek
  `data-shell-screen="modules"` değerine düzeltildi; geometri kontrolleri korundu.
- Son ekran görüntüleri: `artifacts/production-fixes-20261027/browser-menus/`
  ve `browser-final/` altındaki üç başarılı savaş profili.
- Dikey boşluk düzeltmesi: 744 istemci testi ve Android/masaüstü/WebKit savaş
  kontrolleri geçti. 320/393/1280/1920 px genişliklerde alt resim/raf payı
  en çok9 px; yan sınırlar, hücre kaydı, dokunma ve VS denetlendi.
  Güncel web build `7a8ec740e3f24860`; Android son görüntüleri
  `artifacts/battle-vertical-fill-20261027/android-final/` altında.

## Yayın sınırı

Bu çalışma yerel kaynak/paket doğrulamasıdır. Yeni imzalı AAB/APK veya canlı
sunucu dağıtımı yapılmadı. Kurulu uygulama ikonu yeni native paket gerektirir.
Sezon/turnuva başlangıçları ayrıca açık komut bekler. Önceki WebKit FPS yayın
kapısı ve fiziksel cihaz ölçümü bu görsel/fonksiyonel testlerle kapanmış sayılmaz.
