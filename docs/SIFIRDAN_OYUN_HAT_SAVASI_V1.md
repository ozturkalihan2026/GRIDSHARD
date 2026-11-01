# GRIDSHARD için sıfırdan tasarım: Hat Savaşı

**29 Ekim 2026 — bağımsız tasarım önerisi, oyuna uygulanmadı.**

Bu çalışma, önceki tek Akım / üç sınıf önerisinin devamı veya mevcut
modüllerin yeniden adlandırılması değildir. Kullanıcının yeni isteğiyle,
oynanış sıfırdan düşünülmüştür. Korunan ürün fikri **Devre Yolu** ve
**her arenada yeni kartlarla genişleyen koleksiyon**dur. Mevcut oyun kodu,
kartlar, hesaplar ve telefon paketi bu çalışma nedeniyle değiştirilmez.

## 1. Oyuncuya vaat

**Kendi takımını kur, rakibin düzenini oku, cepheyi değiştir ve üç kritik
bölgenin kontrolü için savaş.**

İki bağımsız tahtaya sabit yapılar koymak yerine, iki oyuncunun birlikleri
ortak bir savaş alanında hareket eder. Ön hat ilerler, yaralı birlik geri
çekilir, uzun menzilli birlik siper arkasından ateş eder; bir kanatta
kalabalık toplayan oyuncu diğer kanadı açık bırakır. Rakibi tamamen yok
etmek tek amaç değildir. Savaşın amacı, birliklerin varlığıyla **alan
kontrolü** kurmaktır.

Tema, parçalanmış bir dünyanın bölgelerini keşfeden küçük bilimkurgu
takımları olabilir. Devre Yolu bu yolculuğun haritası olur. Teknolojik
görsel kimlik korunabilir; oynanışın bütün kararlarının elektrik terimleriyle
açıklanması gerekmez. Kartlar canlı karakterler, küçük araçlar ve uzman
birlikler olarak kişilik kazanır. Buradaki adlar çalışma adlarıdır.

## 2. Neden bu yön?

- Birliklerin ilerlemesi ve geri çekilmesi, savaşın sonucunu ekranda görünür kılar.
- Alan kontrolü, en yüksek hasarlı dört kartı seçmek dışında kazanma yolları açar.
- Hareket ve siper, düşük hasarlı bir kartın iyi konumla değer üretmesini sağlar.
- Birden fazla cephe, tek bir dayanıklı hedefin bütün maçı kilitlemesini önler.
- Yeniden mevzilenme, kötü ilk tahminin bütün maçı belirlemesini sınırlar.
- Savaşta harcanan bir para, mana, enerji veya üretim kartı bulunmaz.
  Sınırlı takım yeri ve sınırlı emir hakkı, seçimlerin bedelidir.

Bu tercih mevcut oyunun oyuncularına otomatik olarak daha iyi geleceği
iddiası değildir. Gerçek zamanlı kurulumdan, planlama ile canlı çatışmayı
birleştiren başka bir oyun türüne geçiştir. Özellikle aralıksız uzun savaş
seven oyuncuda, turlar arasındaki yeniden kurulumun etkisi test edilmelidir.

## 3. Kart sistemi: iki kart türü

### Birlik kartları

Oyuncunun destesinde **beş farklı birlik kartı** bulunur. Her çatışmada
bunlardan **dördünü** sahaya çıkarır. Beşinci birlik, rakibin düzenine göre
sonraki çatışmada kullanılabilecek yedektir. Aynı kartın ikinci kopyası
aynı takımda bulunmaz.

Bir birlik kartı tek bir yönetilebilir varlığı temsil eder. Görseli birkaç
kişilik takım olabilir; canı, hedefi ve hareket kararı ortaktır. Sayısız
bağımsız küçük varlık üretmek temel tasarım değildir.

Birlikleri sert sınıflara bölüp her sınıftan bir kart seçtirmem.
Koleksiyonda **hat tutma, hareket, baskı, destek** etiketleri kullanırım.
Bir kart birden fazla etikete sahip olabilir. Etiketler açıklayıcıdır;
gizli karşı sınıf hasar çarpanları taşımaz.

### Emir kartları

Destenin diğer **üç kartı emirdir**. Oyuncu her canlı çatışmada bu üç
karttan en fazla birini kullanır. Kullanılan emir bir sonraki çatışmada
dinlenir, ondan sonraki çatışmada geri gelir. Kullanılmayan emirler hazır
kalır. Oyuncu isterse emir kullanmadan çatışmayı bitirir.

Emirler doğrudan büyük hasar veya düşmanı anında silme aracı değildir.
Görüş, hareket, korunma ve konum değişikliği sağlar. Üç emir seçmek,
oyuncunun nasıl müdahale edeceğini belirler.

Toplam deste **sekiz karttır: beş birlik + üç emir**. Savaş ekranında sekiz
kartın hepsini sürekli sıkıştırmak gerekmez; hazırlıkta beş birlik,
çatışmada üç emir ve bir yön değiştirme hakkı gösterilir.

## 4. Bir maç nasıl işler?

### Ortak alan

Üç ele geçirme bölgesi bulunur: sol, orta ve sağ. Yan yollar bölgeler
arasında geçişe izin verir. Başlangıç alanları, mesafeler ve siperler iki
taraf için aynıdır. Bölgeye yakın konum almak, uzaktan hasar vermekten
farklı bir görevdir; menzili uzun kart bölgenin dışında bekleyerek puan
toplayamaz.

İlk prototipte bütün arenalar aynı temel harita kurallarını kullanır.
Arena görselleri ve taktik temaları değişebilir. Her yeni arenada bir de
yeni fizik kuralı getirerek öğrenme yükü büyütülmez. Daha sonra simetrik
alternatif haritalar ayrı karşılaştırılır.

### Beş çatışma

Bir maç **beş çatışmadan** oluşur. Her çatışmanın ilk adayı:

| Bölüm | Süre | Oyuncunun kararı |
|---|---:|---|
| Hazırlık | 10 sn | Beş birlikten dördünü seç, kendi yarındaki başlangıç noktalarını ve ilk bölge hedeflerini belirle. |
| Canlı çatışma | 30 sn | Birlikler hareket edip savaşır. Bir emir kullanabilir ve bir birliğin yürüyüş hedefini bir kez değiştirebilirsin. |
| Sonuç / yeniden mevzilenme | 3 sn | Bölge puanlarını ve kayıpları gör; sonraki hazırlığa geç. |

Toplam aktif maç akışı **215 saniye, yani 3 dakika 35 saniye** eder.
Eşleştirme ve sonuç ekranında geçirilen süre buna dahil değildir. Hazırlıkta
önceki düzen korunur; oyuncunun her seferinde dört kartı sıfırdan sürüklemesi
gerekmez. İlk öğrenme maçında planlama zamanı ayrıca uzatılabilir.

Rakibin beş birlik ve üç emirden oluşan destesi açıktır. Hazırlıkta yaptığı
dörtlü seçimi ve yerleşim değişiklikleri iki oyuncu hazır olduğunda aynı
anda açılır; ikinci hamle yapanın ilk oyuncuyu izleme avantajı yoktur.
Süre biterse son geçerli düzen kilitlenir. İlk çatışma için oyunun geçerli
bir varsayılan düzeni bulunur.

Her çatışma sonunda bütün birlikler yeniden kullanılabilir ve tam canla
başlar. Ölen birliği o çatışma içinde tekrar çıkaramazsın. Kazanan taraf
sonraki çatışmaya fazladan birlik, can veya emir hakkı taşımaz. **Toplam
maç puanı taşınır; savaş gücü sıfırlanır.** Böylece ilk çatışmayı kaybetmek
devamını maddi olarak daha zor hale getirmez. Son çatışma gizli biçimde iki
kat puanlı değildir. Kalan sürede matematiksel geri dönüş imkânsızsa maç
erken sonuçlandırılabilir; oyuncuyu sonucu belli çatışmaya zorlamaz.

### Bölge kontrolü ve galibiyet

- Bir bölgede yalnız senin yaşayan birliğin varsa, iki saniyelik ele
  geçirme hazırlığından sonra her tam saniyede bir puan kazanırsın.
- Düşman da girerse bölge çekişmelidir; iki taraf da puan kazanmaz.
- Birliklerin tamamı bölgeden çıkarsa puan akışı durur. Renkli bayrak
  yalnız görseldir; boş bırakılan bölge bedava puan üretmez.
- Çekişme veya terk edilme sonrası iki saniyelik hazırlık yeniden gerekir.
- Her bölge aynı puanı verir. Beş çatışmanın toplamında yüksek puan kazanır.
- Eşitlikte beraberlik vardır. Gizli can üstünlüğü, rastgele kazanan veya
  süresiz uzatma kullanılmaz.

Zaman bu modun başlangıçtan bilinen puanlama penceresidir. Dakika ilerledikçe
hasar artmaz, onarım azalmaz, saha daralmaz ve birlikler kendiliğinden can
kaybetmez. Otuz saniyelik pencere bir prototip adayıdır; 20 ve 40 saniyeyle
karşılaştırılmalıdır. Süreyi uzatmak savaşın daha iyi olduğu varsayımıyla
yapılmaz; görünür mücadele ve anlamlı karar sayısı ölçülür.

### Hareket ve hedefleme

Birlik kendisine verilen bölgeye yürür; engellerin etrafından gider.
Menzile giren en yakın geçerli rakiple çatışır; hedef geçerliyken sırf
başka biri biraz yaklaştı diye sürekli hedef değiştirmez. Oyuncu bir kez
hedef bölgeyi değiştirebilir; bu ışınlanma değildir. Birlik yolculuk
sırasında ateş edemez. Yakın tehdide karşı menzil ve geçerli yol kuralları
aynı şekilde işler. Emir açıkça söylemedikçe düşman seçimi doğrudan elle
değiştirilemez.

Siper normal uzun menzilli atışın görüş çizgisini keser. Yakın dövüşçü
etrafından dolaşabilir. Hiçbir geçici siper bir bölgeyi veya doğma alanını
tamamen kapatacak yere konamaz. Bütün kurallar için net alan işaretleri ve
hareket yolları görünür olmalıdır; kart metninin gizlediği mesafe hesabı
oyuncuya bırakılmaz.

## 5. Can ve hasar nasıl kurulur?

Önce aynı göreve yatırılan takım yerinin değeri ve karşı hamle süresi
belirlenir. Bütün kartlara aynı can, hasar ve atış hızı verilmez.

İlk hedefler:

- Denk iki temel saldırı birliğinin düellosu kabaca **16–24 saniye** sürebilir.
  Bu, her eşleşmenin o aralıkta bitmesi gerektiği anlamına gelmez.
- Tek temel silah, denk hedefi genellikle **9–15 isabette** düşürür.
- Birkaç birliğin odak ateşi daha hızlı öldürür. Hedefin iki saldırı
  altında aynı süre dayanması beklenmez; oyuncu geri çekilme veya bölge
  değiştirme kararı verebilmelidir.
- Ağır saldırıların hazırlığı görünürdür. Büyük atış, denk birlikleri
  tek başına bir veya iki isabette silmez.
- Destek, hasarı tamamen yok eden sonsuz döngü kurmaz. Birlik başına
  sürekli onarım ilk adayda en fazla 6 can/sn'dir; kaynaklar toplanmaz.
- Yer değiştirme veya sert kesinti sonrası dört saniyelik yeni sert
  müdahale bağışıklığı vardır. Yavaşlatma etkileri üst üste katlanmaz;
  en güçlüsü işler. Ağır birliğin yer değiştirmeye direnci kartta yazılıdır.

Başlangıç beşlisinin örnek verileri — **oynanışla doğrulanmış denge değil**:

| Kart | Can | Temel saldırı | Ayırt edici davranış |
|---|---:|---|---|
| Nöbetçi | 460 | 16 / 2 sn, yakın | Önünden gelen atışları %20 azaltır; yavaş hareket eder. |
| Nişancı | 300 | 24 / 1,6 sn, orta menzil | Güvenilir tek hedef baskısı; hareket ederken ateş edemez. |
| Koşucu | 240 | 14 / 1,5 sn, yakın | Çok hızlı yer değiştirir; açık bölgeyi alır, yoğun ateşe dayanmaz. |
| Saçıcı | 280 | Ana hedefe 16; en fazla iki yakına 10'ar / 2,2 sn | Kalabalık yerleşimi cezalandırır; tek hedefe zayıftır. |
| Yamacı | 250 | 10 / 2 sn, kısa menzil | Dört saniyede bir, bir saniye saldırmayı bırakıp yakındaki yaralıya toplam 18 can verir. |

Örneğin Nişancı, savunmasız 300 canlı hedefe 13 isabet ister. İlk atış da
bir tam çevrim beklerse bu 20,8 saniyedir. İki Nişancının aynı anda ve aynı
hedefe ateşi teorik olarak 11,2 saniyeye iner. Bu yalnız sabit hedef
hesabıdır; hareket, siper, menzil ve emirler dahil değildir.

Yamacının ham onarım hızı en fazla 4,5 can/sn'dir. Onarım için ateşe ara
vermesi ve dörtlü kadrodan bir yer alması fırsat maliyetidir. Ayrı bir
zorunlu karşı onarım kartı tasarlamak yerine, oyuncunun destek kaynağına
ulaşabilmesi ve başka bölgeden puan alabilmesi esas çözümdür.

## 6. Devre Yolu: her arenada yeni oyun fikri

On iki arena, ilk öneride yolculuğun omurgasıdır. Mevcut kupa eşikleri
bu yeni oyunun tasarım şartı değildir; ilk kullanıcı testinde ilerleme
hızına göre ayrıca ayarlanır. Yeni dünya için aşağıdaki arena adları da
değiştirilebilir çalışma adlarıdır.

Başlangıçta **beş birlik + üç emir = sekiz kart** vardır. Sonraki on bir
arenanın her biri **bir birlik + bir emir** getirir. İlk tam koleksiyon
**16 birlik + 14 emir = 30 kart** olur. Sürekli kart eklemek yerine her
eklenen kartın yeni bir karar üretmesi aranır.

| Arena | Yer / taktik fikri | Yeni birlik | Yeni emir |
|---:|---|---|---|
| 1 | Hurda Karakolu — temel görevler | Nöbetçi, Nişancı, Koşucu, Saçıcı, Yamacı | Sis Perdesi, Toparlan, Geri Çekil |
| 2 | Rüzgâr Geçidi — hareket | Çengelci | Hızlı İntikal |
| 3 | Cam Sırtı — menzil ve görüş | Gözcü | İşaret Fişeği |
| 4 | Döküm Avlusu — siper | Kuşatmacı | Siper Kur |
| 5 | Yankı İstasyonu — rota kurma | Tuzakçı | Sahte İz |
| 6 | Gölge Pazarı — sızma | Sızmacı | Sıkı Düzen |
| 7 | Demir Köprü — hattı itme | Koçbaşı | Sabitle |
| 8 | Sarmaşık Terasları — takım hareketi | Kılavuz | Aralık Aç |
| 9 | Kırık Saat — hazırlığı bozma | Kesici | Teması Kes |
| 10 | Fırtına Limanı — konumu koruma | Çapacı | Yeniden Düzenlen |
| 11 | Prizma Meydanı — yanıltma | Ayna Ustası | Sessiz Yürüyüş |
| 12 | Son Kavşak — esnek plan | Şekilci | Köprü Kur |

### Yeni birlikler gerçekten ne yapar?

| Birlik | Özelliği | Açığı / doğal karşı oyun |
|---|---|---|
| Çengelci | Hazırlığını göstererek yakındaki bir rakibi geçerli yolda bir adım kendine çeker; yeniden kullanım bekler. | Menzile girmemek, siper ve yer değiştirme bağışıklığı. Tek başına yüksek hasarlı değildir. |
| Gözcü | Uzun menzilli, yavaş yerleşen atıcı. Ateşten önce durup nişan alır. | Yakın baskı ve siper; bölgeyi uzaktan tutamaz. |
| Kuşatmacı | Görünen uzun hazırlıkla ağır tek atış; geçici siperleri hızlı söker. | Hareketli hedefler ve hazırlığın kesilmesi. Alan hasarı da taşımaz. |
| Tuzakçı | Yaklaşma yoluna aynı anda en fazla bir, görünür yavaşlatma tuzağı bırakır. | Rotayı değiştirmek; tuzağı uzaktan temizlemek. Tuzağın patlayıcı hasarı yoktur. |
| Sızmacı | İlk yaklaşmada uzaktaki hedeflerden gizlenir; saldırınca veya bölgeye girince görünür olur. | Yakın koruma, Saçıcı ve görünür kılma. Işınlanmaz. |
| Koçbaşı | Yavaş, dayanıklı yakın dövüşçü; hazırlıklı bir hamleyle önündekini bir adım geri iter. | Kanatlardan baskı, aynı anda iki bölgeye yetişememesi. |
| Kılavuz | Yakınındaki dostların hareketini artırır; saldırı hızını veya canını artırmaz. | Takımın birlikte yürümesi alan ateşine açıklık yaratır. |
| Kesici | Yakın dövüşte, hazırsa bir düşmanın ağır saldırı hazırlığını kısa duraklatır. | Düzenli hafif ateş; önce ona ulaşması gerekir. Hazırlığı her vuruşta sıfırlamaz. |
| Çapacı | Yer değiştirmeye dirençli, çok yavaş bölge tutucu. | Başka bölgeye dönmek; uzun menzilli baskı. Puanı iki kat sayılmaz. |
| Ayna Ustası | Başta yakınına görünür bir yankı noktası koyar; canı yarıya düşünce bir kez o noktaya geçer. | Dönüş yerini önceden kuşatmak. Yankı savaşmaz ve bölge tutmaz. |
| Şekilci | Hazırlıkta hareketli mızrak veya dayanıklı muhafız biçimini seçer; çatışma sırasında biçim değiştiremez. | Her biçim, aynı işi yapan uzman karttan daha zayıftır. Avantajı esnekliktir. |

İleri kartların kesin can/hasar tablosu temel beşli oynanmadan doldurulmaz.
Özellikleri ve açıkları tasarım olarak tanımlıdır; güç bütçeleri sonraki
prototip sırasına aittir. Arena 12 kartı, Arena 1 kartını salt daha yüksek
sayıyla geçmez. Örneğin son arenadaki Şekilci Nöbetçiden daha iyi tank ve
Nişancıdan daha iyi saldırgan olmak zorunda değildir.

### Emirlerin açık kuralları

| Emir | Etki adayı | Bedel / sınır |
|---|---|---|
| Sis Perdesi | Küçük bir alanda dört saniye uzun menzilli görüşü keser. | İki tarafı da etkiler; yakın dövüş sürer. |
| Toparlan | En fazla iki dosta, saldırmayı bıraktıkları üç saniyede 36'şar can verir. | Hareket veya saldırı kanalı keser. Sürekli onarım tavanıyla toplanmaz. |
| Geri Çekil | İki birliği kendi başlangıç alanlarına hızla geri yürütür. | Işınlanma, can yenileme ve dokunulmazlık yoktur; bölge terk edilir. |
| Hızlı İntikal | İki birliğe üç saniye hareket hızı verir. | Yürürken ateş edemezler; kontrol etkisini kaldırmaz. |
| İşaret Fişeği | Küçük alandaki gizliliği açar; menzildeki en fazla iki dost işaretli düşmana kısa süre öncelik verir. | Menzil veya siper delinmez; hasar bonusu yoktur. |
| Siper Kur | İzin verilen bir noktaya kısa ömürlü, yıkılabilir siper bırakır. | İki tarafın da atışını keser; geçidi tamamen kapatamaz. |
| Sahte İz | Yasal noktaya kısa süreli bir yem bırakır; en yakın geçerli hedefse en fazla iki düşman atışını üzerine alabilir. | Her düşmanı zorla döndürmez; bölge puanı ve hasarı yoktur. |
| Sıkı Düzen | Yerinde duran iki dostun sonraki birer isabetini kısa pencere içinde azaltır. | Hareket etkisini bitirir; sürekli koruma değildir. |
| Sabitle | Bir dostu üç saniye yerinde tutar, aldığı hasarı azaltır. | Yanlış bölgede kullanırsan oradan çıkamaz; hasarını artırmaz. |
| Aralık Aç | Görünür hazırlıktan sonra küçük alandaki en fazla iki rakibi bir adım dışarı iter. | Hasar yoktur; ağır direnç ve müdahale bağışıklığı işler. |
| Teması Kes | Bir dost iki saniye uzun menzilli hedef seçiminden çıkar. | Bu sırada ateş edemez ve bölge tutamaz; yakın dövüşten korunmaz. |
| Yeniden Düzenlen | İki dosta yeni bölge hedefi atar; temel tek yön değiştirme hakkını harcamaz. | Yürümeleri gerekir; mevcut çatışma düzeni bozulur. |
| Sessiz Yürüyüş | Bir dostun yaklaşmasını kısa süre uzaktaki düşmandan gizler. | Saldırı veya bölgeye girişte biter; siper ve yakın tehdit kuralları sürer. |
| Köprü Kur | Haritadaki önceden işaretli iki nokta arasında kısa süreli yan geçit açar. | Rakip de kullanabilir; kapanırken üstünde kalan birlik güvenli uçtan çıkarılır. |

Köprü ve yankı gibi ileri mekanikler önce basit örnekle gösterilmelidir.
Köprü anlık ışınlanma değil yürünebilir kestirmedir; kapanış kuralı birlik
öldürme veya harita dışında bırakma tuzağı olamaz. Süreler, alanlar ve
sayısal azaltmalar nihai denge değerleri değildir.

Toparlan, sürekli birlik onarımının 6 can/sn tavanından ayrı, üç saniyelik
12 can/sn emir kanalıdır. Bu sırada hedefteki sürekli onarım yerine geçer;
onunla toplanmaz. Emir hakkını harcamak ve hedefin ateşi bırakması karşılığında
kısa bir toparlanma sağlar. Nöbetçinin ön koruması baktığı yöne göredir;
yanından veya arkasından gelen atışlara aynı azaltmayı vermez.

### Devre Yolu ödül akışı

1. Yeni arenaya girişte birlik **kesin** olarak verilir ve kısa bir deneme
   karşılaşması açılır. Sandıktan çıkmasını beklemek gerekmez.
2. Arenanın ilk üçte birlik yol eşiğinde yeni emir kesin olarak verilir.
   Oyuncu arenaya girerken bunu ve bir sonraki birliği önceden görebilir.
3. Ara eşiklerde görünüm, profil, zafer animasyonu ve koleksiyon ödülleri
   vardır. Öğrenme görevleri kupa kazanmanın ön şartı değildir.
4. Arena geçişinde yeni çevre, kısa hikâye parçası ve yeni taktik meydan
   okuması birlikte sunulur. Devre Yolu yalnız ödül kutuları dizisi olmaz.
5. Açılan kart kalıcıdır. Arenadan düşmek kartı geri almaz. Dereceli
   eşleştirme yakın ilerleme ve kart erişimini gözetmelidir; geç açılan
   kartın erken karttan güçlü olmaması da bunun yerine tek başına geçmez.

## 7. Kart gelişimi ve gelir modeli tercihi

Sıfırdan kurarken dereceli savaşta kart gücünü koleksiyon seviyesinden
ayırırdım. Açılan kart, o modun standart savaş değerleriyle kullanılabilir.
Ustalık; görünüm, unvan, animasyon, ses ve kart çerçevesi açar. Yeni arenaya
çıkmanın ödülü daha fazla strateji seçeneğidir.

Enderlik, daha büyük hasar çarpanı yerine farklı oynanış ve sunum olabilir.
Bir kartın kuralları yalnız ender olduğu için anlaşılmaz hale getirilmez.
Ücretli sezon, kozmetik tema ve kişiselleştirme üzerinden değer sunabilir.
Bu ürün yönünün gelir etkisi ayrıca değerlendirilir; satışın aynı kalacağı
iddiası yoktur. Bu tercih bir hesap dönüşümü veya mevcut satın alımları
değiştirme talimatı değildir.

## 8. Somut bir maç örneği

Oyuncunun beşlisi Nöbetçi, Nişancı, Koşucu, Saçıcı, Yamacıdır. Emirleri
Sis Perdesi, Toparlan ve Hızlı İntikal olabilir; bu deste Arena 2 erişimi ister.

İlk çatışmada Nöbetçi ile Nişancıyı ortaya, Koşucuyu sola, Yamacıyı sağa
koyar. Saçıcı yedektedir. Rakip ortaya üç birlik yığar. Oyuncu ortayı
kazanamayacağını görünce Sis ile uzak atışları keser, Nişancıya tek yön
değiştirme hakkıyla sağ bölgeyi hedefletir. Nöbetçi bir süre rakibi ortada
oyalarken sol ve sağ puan üretir. Sis kendi Nişancısının ateşini de
kesebileceği için zamanlama ve konum önemlidir. Bu plan kesin zafer değildir;
rakip de kanada geçebilir.

İkinci hazırlıkta rakibin kalabalık merkez düzenine karşı Yamacı yerine
Saçıcıyı alır. Rakip de önceki yan baskıyı gördüğü için dağılımını
değiştirebilir. Kullanılan Sis bu çatışmada dinlenir. Oyuncu Toparlan veya
Hızlı İntikal arasında seçim yapar. Önceki çatışmada kaybettiği birlikler
yeniden hazırdır; önceki puan farkı ise durur.

Bu hikâyedeki heyecan, biriktirip ilk büyük silahı çıkarma anından değil,
rakibin planına uyum sağlamaktan ve ekranda cephenin yer değiştirmesinden gelir.

## 9. En büyük riskler ve ilk test

Bu çalışma bir tasarım hipotezidir. Uygulanmış oyun veya dengesi doğrulanmış
kart kataloğu değildir. İlk prototip bütün otuz kartı içermez.

İlk prototip: başlangıçtaki beş birlik, üç emir, tek simetrik harita ve
beş çatışmalı maç. Önce şu sorular cevaplanır:

| Risk | Bakılacak şey | Olumsuz sonuçta seçenek |
|---|---|---|
| Yalnız iki bölgeye koşmak savaşı gereksiz kılıyor. | Düşük hasarlı hareket takımı düzenli üstün mü; çatışmasız puan süresi ne? | Yürüme mesafesi, bölge boyutu ve ele geçirme hazırlığını karşılaştır; hemen hasarı artırma. |
| Herkes orta noktada tank + şifacı yığıyor. | Aynı dörtlünün ve konumun baskınlığı, yan bölgelerin puanı. | Siper/rotalar, onarım menzili ve takım yeri maliyetini incele. |
| Otuz saniyede birlikler karşılaşamıyor veya anlamlı sonuç yok. | İlk temasa süre, gerçek ateş süresi, çatışmada düşen birlikler. | Önce yol mesafesini; sonra 20/30/40 saniyelik pencereleri test et. |
| Beş yeniden kurulum savaş hissini bölüyor. | Oyuncu kendini devam eden mücadelede mi, beş ayrı mini maçta mı hissediyor? | 3 uzun çatışma ile 5 kısa çatışmayı karşılaştır. |
| Az müdahale pasif izlemeye dönüşüyor. | Oyuncunun emir ve yön değiştirme kararlarının etkisi, boş bekleme hissi. | Bir ve iki emir hakkını ayrı dene; kart spamını varsayılan çözüm yapma. |
| Gizli hazırlık kör tahmine dönüşüyor. | Oyuncu rakibin açık destesi ve geçmiş turundan plan çıkarabiliyor mu? | Kısmi başlangıç niyetini önceden gösterme deneyi yap. |
| Son tur sonucu belli halde sürüyor. | Kalan azami puanla fark kapanabiliyor mu? | Açık matematiksel erken sonuç, son tura bedava puan çarpanı ekleme. |
| Yeni kartlar ilk kartları gereksiz kılıyor. | Aynı role yatırılan takım yeri ve karşılaşma bağlamındaki değer. | Sayı üstünlüğünü azalt; yeni kartın farklı kararını koru. |

İnsan testinde ilk sorular "kaçta kaç kazandı?" yanında şunlardır:
Oyuncu neden puan kaybettiğini anlayabildi mi? Sonraki çatışma için plan
kurabildi mi? Hangi anda heyecanlandı? Birliklerin savaşını izleyebildi mi?

## 10. Önerim

Bu tasarımın ayırt edici üç parçasını birlikte denemek gerekir:

1. Ortak alanda hareket ve üç bölge için mücadele.
2. Beş birlikten dördünü seçme ve çatışmalar arasında yeniden mevzilenme.
3. Devre Yolu boyunca yeni birlik + yeni emirle genişleyen, ham güç yerine
   seçenek üreten koleksiyon.

Yalnız isimleri ve kart resimlerini değiştirerek bu deneyim elde edilmez.
Önce küçük ayrı prototiple savaşın keyfi sınanır; otuz kartlık üretim ve
mevcut hesaptan geçiş ancak bu sorular cevaplandıktan sonra ele alınır.
