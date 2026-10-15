# GRIDSHARD — görsel dönüşüm planı

Tarih: 15 Ekim 2026. Kullanıcı planın ayrı kaydedilmesini ve ilk paketin
başlatılmasını istedi. Bu belge paketlerin sırasını ve onay durumunu izler.

## Hedef ve sabit görsel dil

Oyunun bütün görsel alanlarını son onaylı kılıçlar, keskin köşeli sandıklar,
altın kupa, Akı ve Devre Kredisi ailesine uydurmak. Canlı/doygun renkler,
belirgin siluet, dolu ve hacimli yüzeyler, geniş sade pahlar, üst-soldan
kontrollü ışık ve küçük ekranda netlik. Pastel/sisli görünüm, aşırı dış parlama,
ince mekanik ayrıntı ve gereksiz süs yok. Her simge kendi anlamını korur;
her nesne aynı renge veya aynı kare levhaya dönüştürülmez.

Onaylı dock, sandık, kupa ve para birimleri yeniden üretilmez. Marka kimliği
yeniden icat edilmez. Modül/çekirdek görselleri en sona bırakılır.
Oyun kuralları, ekonomi, ödül, satın alma, hesap ve ağ akışları bu işin dışında.

## Paket büyüklüğü ve onay kapısı

- Her paket en fazla 10 benzersiz görsel veya ortak bileşen. Kapsam büyükse
  alt paketlere bölünür; aynı parçanın farklı ekranlarda kullanımı yeni parça
  sayılmaz. Aşağıdaki sayılar envantere göre küçük ayarlamalara açıktır.
- Önce numaralı toplu önizleme ve büyük/küçük boyut karşılaştırması sunulur.
  Gerekli paketlerde ilgili ekranın taslak yerleşimi de gösterilir.
- Kullanıcı paketi topluca veya numara bazında onaylar. Yalnız itiraz edilen
  parçalar revize edilir; başlangıçta gereksiz çok sayıda alternatif üretilmez.
- **Önizleme onayı gelmeden oyuna bağlanmaz.** Onaydan sonra ortak kaynaktan
  bütün kullanımlara uygulanır; eski paralel görseller/referanslar taranır.
- Normal, seçili, basılı, pasif/kilitli durumlar aynı ailenin parçasıdır;
  yalnız renk farkına güvenilmez. Metinler raster görsellere gömülmez.
- Yerel/görsel oyun denemeleri kullanıcıdadır. Yeni tarayıcı veya test sunucusu
  başlatılmaz; kullanıcının sunucusuna/sekmelerine dokunulmaz. Sözdizimi ve
  dosya/derleme bağlantıları riskle orantılı kontrol edilir.

## Sıra

| No | Paket | Kapsam | Durum |
| --- | --- | --- | --- |
| 1 | Ortak ikonlar | 10 ana ikon: ayarlar, mesaj, arkadaş, profil, hediye, takvim, istatistik, kozmetik, bilgi, menü. Ortak ikon eşlemesiyle tüm karşılıklarına yayılır. | Kullanıcı onayladı; oyuna bağlandı; yerel/görsel kontrol kullanıcıda |
| 2 | Buton ve hücre ailesi | Yaklaşık 10 ortak parça: ana/ikincil/uyarı butonları, kart ve hücre yüzeyleri, sekmeler, giriş alanları, anahtarlar, ilerleme çubukları ve etkileşim durumları. | Bekliyor |
| 3 | Ana ekran ve marka | Logo sunumu, açılış/yükleme ekranı, ana ekran yüzeyleri, Devre Yolu giriş kartı ve ortak başlıklar. Onaylı dock korunur. | Bekliyor |
| 4 | Rekabet ve etkinlikler | Lig amblemleri, sıralama ödülleri, haftalık ve takımlar arası turnuva hücreleri, lider panosu. Günlük meta ayrı tutulur. Kazanılmamış kupalar kazanılmış gibi gösterilmez. | Bekliyor |
| 5 | Profil ve sosyal alanlar | Kendi/başka oyuncu profili, takım profili, üyeler, başvurular, arkadaşlar, sohbet ve mesaj kutusu; kozmetik çerçeveler ve seçim hücreleri. Büyük kozmetik koleksiyonları 10'lu alt paketlere ayrılır. | Bekliyor |
| 6 | Mağaza ve ödüller | Paket yüzeyleri, sandık önizlemeleri, günlük görevler, sezon geçişi ve ödül ekranları. Yeni sandık/para birimleri korunur; çevreleri tamamlanır. | Bekliyor |
| 7 | Savaş arayüzü ve kalan ekranlar | Savaş hücreleri, HUD, geri sayım, zafer/yenilgi; ayarlar, onay pencereleri, bildirimler, eğitim, boş/yükleniyor/hata ve bağlantı kurtarma durumları. Modül/çekirdek çizimleri hariç. Gerektikçe 10'lu alt paketler. | Bekliyor |
| 8 | En son modüller ve çekirdekler | Önce modüller yaklaşık 10'lu gruplarla, ardından çekirdekler. Sınıf/işlev ayrımı, küçük boyutta okunabilirlik ve savaşta efekt yoğunluğu gözetilir. | En son; bekliyor |

## Teknik standart

- Esneyen buton/hücre/yüzeyler mümkün olduğunca CSS/SVG; fiziksel resim
  gerektiren nesneler şeffaf, doğru çözünürlükte hafif WebP.
- Ortak görsel eşlemesi kullanılır; ekran başına kopya dosya veya ayrı para
  birimi/başlık simgesi üretilmez. Web/native pakete dahil oluşu doğrulanır.
- Büyük PNG ustaları ve önizlemeler `artifacts/` altında, Git dışında saklanır.
  Promptlar, onay durumu ve dosya eşlemesi metin olarak korunur. Mevcut arşiv
  silinmez; başka bilgisayara ayrıca taşınması gerektiği unutulmaz.
- Gereksiz büyük blur/filter ve sürekli animasyon yok. Savaş arayüzünde
  performans iyileştirmeleri korunur; kartları tekrar oluşturma geri gelmez.
- Yeni bir alan fark edilirse uygun pakete eklenir; bütün plan tekrar
  yazılmaz. Her paketin kapanışında eski ikon/emoji/tasarım kaçakları taranır.

## Paket 1 — onay numaraları

| No | Anahtar | Görsel anlamı |
| --- | --- | --- |
| 01 | settings | Belirgin dişli; gümüş/mavi gövde, turkuaz merkez |
| 02 | message | Kapalı zarf; elektrik mavisi gövde, açık kapak çizgisi |
| 03 | friends | İki soyut kişi; canlı yeşil ve turkuaz |
| 04 | profile | Tek soyut kişi; turkuaz ve açık mavi |
| 05 | gift | Hediye kutusu; altın gövde, mor kurdele |
| 06 | calendar | Takvim; pembe üst bölüm, açık sayfa ve tek büyük gün işareti |
| 07 | statistics | Üç yükselen çubuk; sıcak altın/amber |
| 08 | cosmetics | Boya paleti ve tek kısa fırça; pembe/mor, kontrollü renk benekleri |
| 09 | info | Kalın bilgi işareti; elektrik mavisi, açık kabartma |
| 10 | menu | Üç hacimli yatay çizgi; turkuaz |

Bunlar genel işlev ikonlarıdır; oyuncu avatarı/kozmetik portresi veya modül
çizimi değildir. Harici buton zemini/çerçeve görsellere gömülmez.

Üretim: built-in imagegen, her ikon için ayrı çağrı. Ortak prompt ve ikon
konuları `GORSEL_DONUSUM_PAKET01_PROMPTLARI_20261015.json` içindedir.
Çıktılar: `artifacts/visual-refresh-pack01-20261015/`.

### İlerleme kaydı

- 15 Ekim: plan kaydedildi; 1. paketin üretimi başlatıldı. Oyun kaynakları
  bu paket için değiştirilmedi; kullanıcı onayı beklenmeden entegrasyon yok.
- 15 Ekim: 10 ayrı built-in imagegen üretimi tamamlandı. PNG asılları
  `artifacts/visual-refresh-pack01-20261015/masters/`, hafif türevler `webp/`
  altında. 10 dosyanın tamamı 128px kayıpsız WebP ve gerçek alpha; toplam
  173.662 bayt (PNG asılları 11.787.418 bayt). Tasarım/kadraj değiştirilmedi.
  `pack01-contact-sheet-v1.webp` levhası büyük çizimler ve 24/32/40px örnekleriyle
  incelendi; numara/etiketler ve 10 farklı siluet mevcut. Özellikle arkadaş
  iki kişi, profil tek kişi; bilgi işareti ve menü küçük ölçekte seçilebilir.
  Onay henüz yok; runtime'a bağlantı ve yeni oyun/tarayıcı testi yapılmadı.
- 15 Ekim: Kullanıcı "bağla" diyerek 10 ikonu onayladı. Ortak CSS dosya
  eşlemesi ve `UI_ART_ICONS` çağrı adlarıyla `common-icons-v1/` altından
  bağlandı. Bağımsız çizilmiş mesaj, iki menü, savaş ayarı, takım profil
  sekmesi, arkadaş boş durumu ve bilgi kutusu da ortak kaynağa alındı.
  Seçilen avatarlar/takım amblemleri/modül ve çekirdek çizimleri korunur.
  Ek kullanıcı isteğiyle profil barındaki mesaj ve üç çizgi düğmelerinin
  zemin/kenarlık/gölgeleri kaldırıldı; tıklama alanları ve bildirimler korunur.
  Yeni paket üretimine geçilmedi; yerel/görsel kontrol kullanıcıda.
- Bağlantı sonrası statik kontrol: 10 WebP onaylı türevlerle birebir,
  128px/alpha doğrulandı; bellekte CSS paketlemesi 10 dosyayı içeriyor.
  JS hedef dönüşümü/sözdizimi ve diff kontrolü geçti. Oyun/birim/tarayıcı
  testleri veya yeni sunucu başlatılmadı; kullanıcı yerelde kontrol edecek.
