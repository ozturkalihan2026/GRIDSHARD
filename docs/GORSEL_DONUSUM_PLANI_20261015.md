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

16 Ekim ek onayı: kullanıcı mesaj kutusu ve sezon sandıklarının teslim akışını
da açıkça istedi. Miktar/fiyat/iade politikası değişmeden, sezon sandığı kapalı
stok teslimi ve satın alım mesajı ayrımı bu kapsamın istisnasıdır. Son uygulama:
`GORSEL_DUZELTMELER_20261016.md`. Kod tamamlandı; yerel görsel kabul bekleniyor.

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
| 2 | Buton ve hücre ailesi | 10 ortak parça: ana/ikincil/uyarı butonları, kart ve seçim hücreleri, sekmeler, giriş alanları, anahtarlar, ilerleme çubukları ve zeminsiz ikon eylemleri; etkileşim durumları dahil. | Kullanıcı onayladı; ortak CSS ile oyuna bağlandı; yerel/görsel kontrol kullanıcıda |
| 3 | Ana ekran ve marka | 8 ortak parça: logo sunumu, açılış/yükleme, profil/kaynak barları, Devre Yolu girişi, deste sahnesi ve ortak bölüm/sayfa başlıkları. Onaylı dock korunur. | Kullanıcı onayıyla oyuna bağlı; son SAVAŞ/arena rötuşları da uygulandı |
| 4 | Rekabet ve etkinlikler | Lig amblemleri, sıralama ödülleri, haftalık ve takımlar arası turnuva hücreleri, lider panosu. Günlük meta ayrı tutulur. Kazanılmamış kupalar kazanılmış gibi gösterilmez. | 4A ve eksik 4B kaynaklara bağlı. Turnuva çevreleri onaylı ortak bileşenlerle tamamlandı; günlük meta değişmedi. Görsel/oyun kontrolü kullanıcıda |
| 5 | Sandıklar + profil ve sosyal alanlar | Kullanıcı ek kapsamı: 5A sekiz ayrı lig sandığı; 5B ilk 10 sıranın on ayrı kasası. 5C kendi/başka oyuncu profili, takım, üyeler, başvurular, arkadaşlar, sohbet, mesaj kutusu ve kozmetik yüzeyleri. Her grup ≤10 parça. | 5A/5B kullanıcı onaylı 18 çizim, açık eşleriyle 36 dosya bağlı. Eksik 5C mevcut onaylı fiziksel amblem ve ortak bileşenlerle tamamlandı/bağlandı. Yeni portre koleksiyonu eklenmedi; görsel/oyun kontrolü kullanıcıda |
| 6 | Mağaza ve ödüller | Paket yüzeyleri, sandık önizlemeleri, günlük görevler, sezon geçişi ve ödül ekranları. Yeni sandık/para birimleri korunur; çevreleri tamamlanır. | 16 Ekim kullanıcı onayıyla on bileşen kaynaklara bağlı. 2.lik sandığı uzun önizleme/hover düzeltmesi dahil. Detay: GORSEL_DONUSUM_PAKET06_20261016.md |
| 7 | Savaş arayüzü ve kalan ekranlar | Savaş hücreleri, HUD, geri sayım, zafer/yenilgi; ayarlar, onay pencereleri, bildirimler, eğitim, boş/yükleniyor/hata ve bağlantı kurtarma durumları. Modül/çekirdek çizimleri hariç. Gerektikçe 10'lu alt paketler. | 16 Ekim kullanıcı onayıyla on ortak bileşen kaynaklara bağlı. Gerçek durum sınıfları/sonuçlar kullanılıyor; 5×3 yerleşim, kalıcı savaş DOM'u ve zamanlayıcı korundu. Detay: GORSEL_DONUSUM_PAKET07_20261016.md |
| 8 | En son modüller ve çekirdekler | Önce modüller yaklaşık 10'lu gruplarla, ardından çekirdekler. Sınıf/işlev ayrımı, küçük boyutta okunabilirlik ve savaşta efekt yoğunluğu gözetilir. | 8A: Sönümleyici onaylandı; ilk 10 fiziksel cihaz kaynaklara bağlı. Beş cihaz için dört yön, sabit kaide, Onarım çalışma pozları ve fan kareleri gerçek olaylarla çalışır; CAN/ısı sabit. 39 WebP yaklaşık 1 MB; hücre ölçü düzeltmesi korundu. Teknik 3D Lazer sanat dili nedeniyle reddedildi ve oyundan çıkarıldı; yeni saha görseli onaydan sonra bağlanacak. Kesintisiz 360°/yeni VFX yok. Yerel görsel deneme kullanıcıda. 8B/8C/8D kalan 26 modül, sonra çekirdekler. Detay: GORSEL_DONUSUM_PAKET08A_HAREKET_PLANI_20261016.md |

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

## Paket 3 — onaylandı / oyuna bağlandı

Son rötuş: SAVAŞ 202px/64%; yazı 19,333px ve ikon 31,333px (-0,5pt).
Arena üst boşluğu bütün boylarda +8px. Dokunma yüksekliği 48px ve sahne korunur.

Son onay: kaynak satırı kaymaları düzeltildi; ana savaş ekranından marka/boş
satır kaldırıldı, arena yukarı alındı, profil mint. `home-interface-v3.css`
ortak web/native stil bloğunda Paket 2'den sonra; `home-interface-view.js`
app.js'ten önce. Devre Yolu gerçek tekil eşiklerle, kapalı/açık zarf okuma
eylemiyle, küçük ikonlu SAVAŞ ve seçili dock etiketiyle bağlı. Açılış yeni
logoyu kullanır; son arka plan/hareketli çekirdek sahnesi korunur. Oyun testi
kullanıcıda; dağıtım/native üretim/commit/push yapılmadı. Güncel uygulama ve
okunma senkronizasyon sınırı Paket 3 belgesinin başında; altı önizleme tarihçesi.

Revizyon 3 (son kullanıcı isteği): Devre Yolu karttan çıkarılıp ortada hacimli
zeminsiz simge/üstte arena/altta eşik ilerlemesi oldu. Savaş düğmesi daha küçük,
solda mevcut ikon ve kalın başlık. Büyük çerçevesiz profil + karşılaştırılabilir
kozmetik çerçeve alanı; lavanta profil/altın zarf/buz mavisi menü; belirgin artı.
Yeni açık/kapalı zarf ve dört kategorili mesaj okuma örneği eklendi. Son arka
plan ve hareketli çekirdek sahnesi korunur. Yalnız önizleme; oyuna bağlı değil.
Güncel kayıt Paket 3 belgesinin başında, Imagegen promptları ayrı Rev3 JSON'da.

Revizyon 2: Kullanıcı asıl yerleşim/hareket/arka planın değiştirilmemesini istedi.
Kaynak satırı en üste alındı (oyun kaynaklarında zaten üsttedir); hacimli artı,
gerçek tekil eşik sayısına bağlı Devre Yolu, mevcut devre atmosferi ve hareketli
çekirdeğin altıgen sahnesi, kompakt SAVAŞ ve yalnız seçilide etiketli dock geri
getirildi. Yeni logo için açık kullanıcı izniyle tek Imagegen önerisi üretildi;
mevcut oyun/mağaza/native logosu değiştirilmedi. Diğer parçalar korunur.
Güncel detaylar Paket 3 belgesinin başındadır; eski taslak kararları geçersizdir.

15 Ekim: Kullanıcı Paket 2 bağlantısından sonra 3. adıma geçilmesini istedi.
8 ortak parça için büyük/küçük örnekler ve ana ekran/açılış kompozisyonu hazır.
Kapsam/onay numaraları `GORSEL_DONUSUM_PAKET03_20261015.md`.
Mevcut amblem/dock/ikonlar ve kod-native modül/çekirdek çizimleri yalnız bağlamda
kullanıldı; yeniden üretilmedi. Önizleme `artifacts/visual-refresh-pack03-20261015/`
altında Git dışıdır, ayrıca taşınır. Sekme/varlık/sözdizimi ve yalıtılmış
önizleme etkileşimleri kontrol edildi; gerçek tarayıcı çizimi kontrol edilmedi.
Paket 3 için oyun kaynakları, işleyiş, derleme/dağıtım veya commit/push yok.
**Bu önizleme onay kapısı tarihçedir; Paket 3 artık bağlıdır.**

## Paket 4 / 5 — en güncel bağlantı durumu

16 Ekim 2026: Kullanıcı iki sandık grubunu onayladı ve eksik 4/5 alanlarının
tamamlanıp bağlanmasını istedi. 4A+4B ve 5A+5B+5C kaynak düzeyinde tamamlandı.
6 turnuva yüzeyi ve 10 profil/sosyal yüzey grubu onaylı ortak dilin uygulamasıdır;
yeni tasarım ailesi veya portre koleksiyonu oluşturulmadı. Kapanış envanteri,
görsel alias/kimlikler, QA ve dağıtım sınırı:
`GORSEL_DONUSUM_PAKET04B_05C_BAGLANTI_20261016.md`.
Oyun/birim testi, tarayıcı/sunucu, dağıtım/native/commit/push yok.

16 Ekim heartbeat rötuşları da bağlı: sıralama sandıklarında zeminsiz 44px
alan/dar ekran taşma düzeltmesi ve hover önizlemesi; P2 buton köşelerinde koyu
eski tabanın kaldırılması; mesaj kategorileri ve en çok kullanılan deste için
ortak fiziksel ikonlar; ana Devre Yolu/arena/lig/eşik ve takım başvuru şartında
kupa görseli. Okunma zarfları, sayılar, kilitler ve iş kuralları korunur.
Paket 6 on parçalık örnek etkileşimlerle hazırlandı; yalnız önizlemedir.

### Paket 4A önizleme tarihçesi — aşağıdaki onay bekleme notu eskidir

Kullanıcı 3. paketin son rötuşundan sonra 4. adıma geçilmesini istedi.
10 parça: 01 Kıvılcım, 02 Voltaj, 03 Reaktör, 04 Kuantum, 05 Nexus,
06 Şampiyonlar, 07 Efsanevi, 08 GRIDSHARD lig amblemleri; 09 sıralama ödülü
sunumu (tek kupa ailesi/üç metal); 10 lider panosu satırı/seçim durumu.
Yedi built-in Imagegen üretimi, mevcut simge anlamı/lig rengi korunarak.
Şampiyonlar ve kupa örnekleri onaylı mevcut kupayı kullanır; yeni kupa yok.
Önizleme + Devre Yolu/Lider Panosu bağlamları; örnek oyuncular gerçek hesaba
bağlı değildir. Kazanılmamış kupalar açıkça işaretlidir. Runtime'a bağlanmadı.
Detay: `GORSEL_DONUSUM_PAKET04A_20261015.md`. Kaynaklar Git dışı
`artifacts/visual-refresh-pack04a-20261015/`; ayrıca taşınmalıdır.
4B'de lig sandıkları ve haftalık/takım etkinliği çevreleri ele alınacak;
envanter 10 parçayı aşarsa yeniden alt gruplara bölünür. Günlük meta ve
oyun kuralları kapsam dışı. **4A onayı gelmeden bağlama.**

## Paket 2 — onaylandı ve bağlandı

Güncel durum: Kullanıcı "bağla" dedi. `client/src/ui-components-v2.css` ortak
kaynağı `index.html` stil derleme bloğunun sonuna bağlandı; web/native ortak
hattı bu kaynağı içeriyor. Buton/kart/hücre/sekme/giriş/anahtar/ilerleme ve
zeminsiz ikon eylemleri mevcut DOM ve durum adlarını kullanır. Oyun işleyicileri,
değerler ve onaylı çizimler değişmedi. Bildirim `::after` alanı, kozmetik renk
örnekleri ve enderlik kenarları korunur. Bellekte stil paketlemesi/JS hedef
dönüşümü/sözdizimi/diff kontrolü geçti. Görsel oyun denemeleri kullanıcıda;
yeni tarayıcı/sunucu, oyun testi, dağıtım veya commit/push yok. Paket 3 başlamadı.

### Önizleme tarihçesi

15 Ekim: Kullanıcı iş bilgisayarındaki dönüşümden sonra ikinci pakete geçilmesini
istedi. Onaylı çizimler ve fontlar korunarak 10 ortak CSS yüzeyi için tek numaralı
önizleme hazırlandı. Büyük/küçük kullanımlar, basılı/pasif/seçili/kilitli durumlar
gösterilir. Kapsam ve numara eşlemeleri:
`GORSEL_DONUSUM_PAKET02_20261015.md`.
Dosyalar `artifacts/visual-refresh-pack02-20261015/` altında, Git dışında;
bilgisayarlar arasında ayrıca taşınmalı. Oyun kaynakları değiştirilmedi.
JS/CSS sözdizimi ve yalıtılmış önizleme etkileşimleri kontrol edildi; gerçek
tarayıcı/oyun kontrolü yapılmadı, yeni tarayıcı veya sunucu başlatılmadı.
Bu aşama artık tarihçedir; güncel onay/bağlantı durumu yukarıdadır.

Kullanıcı revizyonu: Paket 2 / 10. parça ve aynı tipteki **tüm bağımsız ikon
eylemleri zeminsiz**. Ayrı levha/kenarlık/gölge yok; tıklama alanı, odak,
bildirim rozeti ve pasif durum ayrımı korunur. Önizleme güncellendi; metinli
buton/sekme/kartlar ve onaylı dock bu değişikliğin dışında. Oyuna bağlanmadı.

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
