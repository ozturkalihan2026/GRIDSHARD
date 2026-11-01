# Güncel ek — 2.2.0 / Android 11 adayı

Önceki aşağıdaki engel sayıları temizlik öncesine aittir. Güncel kaynak:
1918 sunucu başarılı / 44 gerçek servis testi yerelde atlandı; 762 istemci,
30 araç, 10 build, 453 Python dosyasında 0 import sorunu. Yetmiş gerçek maçın
olay akışı değişmedi. Eğitim/katalog tarayıcı koşusu24, iki gerçek istemci3,
son sürüm/ödül odaklı sunucu125 başarılı. Build d55414e2c408d7ec.

Masaüstü/AndroidChromeperformansı127,2/126,1FPS ve sıfırdonma; WindowsWebKit
9,8FPS başarısız. MacOSWebKitCIüretimengeli çözülmeden dağıtım yok.
Eski ödüllerin yenihavuzdan çıkması ve geçmişhakların1:1 dönüşümü test edildi.
Ayrıntı: SADELESTIRME_VE_ODUL_DENETIMI_20261101.md.

AWS saltokunur SSH yine zaman aşımı; Edge EC2 giriş sekmesi1378269626 açık.
Henüz sunucu değişikliği/AAB/push yok; commit ve CI adımı sırada. CI ve erişim hazır olunca veri koruyan
geçiş yapılacak; eski sıfırlama aracı çalıştırılmayacak.

---

# 1 Kasım 2026 yayın ön kontrolü

Mağaza paketi ve açılış görseli tamamlandı. Mevcut AWS sunucusu güncellenecek;
OVH taşıması yapılmayacak. Üretim servisinde, hesaplarında veya Play Console'da
bu tur değişiklik yapılmadı. Yeni AAB henüz üretilmedi.

## Hazır teslim

`deliverables/GRIDSHARD_MAGAZA_2026-11-01.zip`: TR/EN açıklamalar, sürüm notları,
dil başına 8 gerçek telefon görseli, yeni afiş ve onaylı ikon. Mağaza görseli
gerçek menü kesitlerinden kolajdır. Ölçü ve metin sınırları manifestte doğrulandı.

Açılış sahnesindeki emekli Bataryalar ve boşta silahlar güncel taktik kartlarıyla
değiştirildi. Büyük çekirdeğin konumu ve CSS efekt hizası korundu. İngilizce
yetenek ağacının eksik yardım cümlesi sözlüğe eklendi. Web build:
`d304c308b1ff3323`.

## Geçen kontroller

- Tam istemci: 769/769.
- Build sözleşmeleri: 10/10.
- Kaynak paketinin veri/anahtar sınırı: 3/3.
- Açılış birim kontrolleri: 11/11.
- Açılış tarayıcı kontrolleri: 18/18; yeni görsel sonrasında 6/6 görünüm,
  animasyon hizası ve azaltılmış hareket kontrolü tekrar geçti.
- İki dilde gerçek mağaza çekimleri: JavaScript hatası, eksik görsel ve yatay
  taşma bulunmadı. Yeni oyun durumları veya sahiplik uydurulmadı.

## Yayına geçmeden kapatılacak konular

1. Kayıtlı sunucuya sabitlenmiş SSH bağlantısı zaman aşımına uğradı. Edge'de
   AWS giriş sayfası açıldı; kullanıcı oturum açtıktan sonra güncel instance/IP
   ve erişim kontrol edilecek. Anahtar bulundu, içeriği görüntülenmedi.
2. Tam sunucu denetimi yeşil değil. 350 hata sınırında durdurulan koşuda
   **577 geçti, 350 başarısız; kalan testler çalıştırılmadı**. Log:
   `artifacts/release-v8-20261101/server-full-audit.log`. Çok sayıda test 36
   modül, kaldırılan Enerji/Isı işlemleri ve eski çekirdek güçlerini bekliyor.
   Bunlar yeni kurallarla ve halen geçerli güvenlik/idempotency/hedefleme
   sözleşmeleriyle karşılaştırılmalı; yalnız eski oldukları varsayılarak
   testler kapatılmamalı. Bu koşu bütün hataların test verisi olduğunu kanıtlamaz.
3. Üç test verisi düzeltildi: başlangıç destesindeki Sönümleyici artık
   “deste dışı” kart diye kullanılmıyor; üyelik kontrolü Füze Fırlatıcıyla
   yapılıyor. Heartbeat/reconnect ve yanlış oturum paketleri güncel protokol
   sabitini kullanıyor. Eski protokolü reddetme testi korundu.
4. Yeni kaynak için tam CI, yedek/ayrı hedefe geri yükleme provası, veri
   koruyan AWS güncellemesi ve HTTPS/WSS doğrulaması tamamlanmalı.
5. Ardından sürüm numarası/kodu kesinleştirilip mevcut upload anahtarıyla AAB
   üretilmeli ve denetlenmeli. Mağaza paketi uyumlu Android sürümüyle birlikte
   yayımlanmalı. Eski 25 Ekim reset aracı bu güncellemenin parçası değildir.

Hiçbir oyuncu verisini sıfırlama, eski yedeği canlı veritabanının üzerine
yükleme veya yalnız testleri yeşile çevirmek için ürün kurallarını geri alma
işlemi yapılmadı.
