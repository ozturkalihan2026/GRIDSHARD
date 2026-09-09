# GRIDSHARD geliştirme kontrol noktası

Tarih: 9 Eylül 2026

Bu dosya, sohbet geçmişi kaybolsa bile çalışmaya aynı noktadan devam etmek için tutulur.

## Son kullanıcı isteklerinin durumu

Son 10 maddelik paket kod tarafında uygulandı:

1. Maç sonu fazladan kayıt/sandık bildirimleri kaldırıldı. Ödül ekranında Kupa, Devre Kredisi ve Deneyim bulunuyor; görünen `SXP` metinleri `Deneyim` olarak değiştirildi ve Deneyim için ayrı simge eklendi.
2. Aktif çekirdek alanı büyütülüp kendi bölümünü kaplayacak hale getirildi; yönlendirme cümlesi kaldırıldı; Bilgi/Seç hızlı menüsü karta ortalanıyor.
3. Çekirdek bilgi penceresinde adın altındaki rol/açıklama satırı kaldırıldı.
4. Avatar seçimi üst profil şeridine de anında uygulanıyor.
5. Günlük, sezon, arena ve mağaza ödüllerinden sonra görünen gereksiz başarı mesajları kaldırıldı; hata mesajları korunuyor.
6. Profildeki en çok kullanılan deste alanı, arkada çekirdek ve önde modüller olacak şekilde düzenlendi; alttaki yinelenen deste bölümü kaldırıldı.
7. Sezon ekranında içerik kendi alanında kayıyor; geri tuşu ve ana alt menü sabit kalıyor. Sezon yolu 40 kademe ve toplam 12.240 Deneyim olacak şekilde yaklaşık bir aya yayıldı.
8. Sandık ödüllerindeki modül parçası miktarları düşürüldü. Modül yükseltme parça ve Devre Kredisi maliyetleri seviyeye ve nadirliğe göre artıyor. Hediye sandığı talep/açma işlemi tek, kalıcı ve tekrar güvenli sunucu işlemi haline getirildi.
9. Devre Yolu modül parçası ödülleri, parçanın ait olduğu gerçek modül simgesini ve sınıf rengini kullanıyor.
10. Savaşta iki tarafın tahtası ortalandı. Rafta can çubuğu kaldırıldı ve yalnız Akım maliyeti gösteriliyor; tahtaya yerleşen modüllerde canlı can değeri korunuyor. Port/yön/döndürme etkileşimi istemci, ağ sözleşmesi, AI ve aktif savaş mantığından çıkarıldı.

Checkpoint devamında bu son madde tamamlandı: port sayısı, yön ve döndürülebilirlik alanları sunucu veri modelinden ve katalogdan da silindi. Eski 21 hücreli/kapılı tahta tanımı kaldırıldı; simülasyonlar, adaptif AI, web smoke kurulumu ve denge regresyonları tek Çekirdekli 5×3 tahtaya taşındı. İstemcide kullanılmayan port CSS kuralları da temizlendi.

Önceki turlarda ayrıca eşleştirme iptali/yeniden başlatma, profil adı ve ödül işlemlerinde istek kimliğiyle tekrar güvenliği, yerel başlatıcı ve telemetri dayanıklılığı üzerinde değişiklikler yapıldı. Bu değişiklikler korunmalı.

## Doğrulama durumu

- İstemci JavaScript sözdizimi denetimleri geçti.
- Sunucu Python derleme denetimi geçti.
- İstemci test paketi 33/33 dosyada geçti; `relay-client.test.js` içinde 176 sözleşme testi geçti.
- Güncel sunucu profil, sezon, sandık, arena, telemetri, tek oyunculu eşleştirme ve web smoke grubunda 43 test geçti.
- Güncel simülasyon, adaptif AI ve gömülü ağ/defans/modül etkileşimi denge kontrolleri doğrudan çalıştırıldı ve geçti.
- `git diff --check` temiz.

Tam `server/tests` dizininde ayrıca 5×4/21 hücreli tahta, dört jeneratör kapısı, port yönleri, 10 aktif modül ve 10 saniyelik eski eşleştirme sözleşmesini doğrulayan tarihsel testler bulunuyor. Bunlar güncel ürün kararıyla bilerek uyumsuz; güncel beta akış testleri geçiyor. Beta eşleştirmesi bekleme ekranında takılmaması için doğrudan sunucu kontrollü AI rakibe bağlanıyor.

## Sabah devam noktası

Kullanıcı görsel ve gerçek oyun denemesini kendisi yapacak. Yeni ekran görüntüsü veya konsol/ağ hatası gelirse mevcut değişiklikleri geri almadan yalnız ilgili akış düzeltilecek. Özellikle şu akışlar gerçek tarayıcıda doğrulanmalı:

- çekirdek kartı ve çekirdek bilgi penceresi,
- sezon ödüllerinde sabit geri/alt menü,
- mağaza sandığı anlık açma ve profil bakiyesi,
- Devre Yolu modül parçası görselleri,
- iki aşamalı maç sonu ekranı,
- savaş rafı Akım maliyeti, tahta canları ve port/döndürme öğelerinin yokluğu.

Çalışma ağacında kullanıcıya ait çalışma zamanı verileri ve önceki değişiklikler de bulunuyor. Toplu geri alma, `reset --hard` veya veri dosyalarını temizleme yapılmamalı.

## 9 Eylül öğlen arayüz paketi

- Profilde görünen Klan ifadeleri Takım olarak değiştirildi. En Çok Kullanılan Deste alanı EV ekranındaki gibi arkada büyük çekirdek, önde modüller düzenine alındı.
- Ödül merkezi girişleri yalnız Günlük Ödüller ve Sezon Ödülleri olarak sadeleştirildi. Sezon sayfasına Günlük Ödüllerdeki gibi sabit profil sekmeleri ile sol altta ÖDÜL BÖLÜMLERİ dönüşü uygulandı.
- Maç sonu ödül ekranının başlığı yukarı taşındı. Sonuç akışı tek DEVAM düğmesini kullanıyor: hasar aşamasından ödüllere, ödüllerden doğrudan EV ekranına dönüyor.
- Devre Yolu altındaki geri ve LİDER PANOSU düğmeleri geri getirildi ve yalnız yol içeriği kayarken alt çubuk ekranın altında sabit kalacak şekilde son CSS katmanında korumaya alındı.
- Bu paket sonrasında istemci JavaScript sözdizimi ve 33/33 istemci test dosyası geçti; `relay-client.test.js` içindeki 176 sözleşme testi de geçti. `git diff --check` temiz.
