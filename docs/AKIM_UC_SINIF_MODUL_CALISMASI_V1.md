# GRIDSHARD — tek Akım, üç sınıf, 16 görev

**Sürüm 1 / tasarım çalışması. Oyun koduna uygulanmadı.** Bu belge,
`ENERJI_VE_MODUL_TASARIM_ONERISI_20261028.md` içindeki ilk fikri kuralları,
başlangıç sayıları, karşı oyunları ve geçiş kapsamıyla somutlaştırır.
Sayılar dengesi kanıtlanmış nihai değerler değil; ilk oynanabilir prototipin
ölçülebilir adaylarıdır. Aşağıdaki kâğıt üstü hesaplar tam maç simülasyonu
ve insan oynanış testi yerine geçmez.

## 1. Benim tercihim

**Saldırı + Savunma + Taktik. Tek harcanabilir savaş kaynağı Akım.**

| Sınıf | Ana sorusu | Yapmayacağı iş |
|---|---|---|
| Saldırı — 6 kart | Hangi hedefi, nasıl yıpratıyorum? | Her koşulda en iyi tek silah veya enerji yokluğunda sessiz duran silah olmayacak. |
| Savunma — 4 kart | Hangi hattı ve hangi komşuyu koruyorum? | Her savunma aynı anda yüksek CAN, azaltma, yansıtma ve kendini onarım vermeyecek. |
| Taktik — 6 kart | Kurduğum düzeni nasıl değerlendiriyor, rakibin düzenini nasıl bozuyorum? | Silahın çalışabilmesi için ödenmesi gereken zorunlu bakım sınıfı olmayacak. |

Taktik sınıfının içinde destek ve müdahale etiketleri bulunabilir; bunlar
ayrı ana sınıflar veya zorunlu deste kotaları değildir. Oyuncu aynı listede
onarımı, güçlendirmeyi ve kontrolü kolayca bulur.

Batarya, Kapasitör ve enerji tüketimini azaltan Dengeleyici temel kadroda
yer almaz. Akım üretimini artıran yeni zorunlu ekonomi kartlarıyla bunların
yerini doldurmam. Genel ısı sistemini de başlangıç prototipine koymam.
Ağır silahın bedeli pahalı kurulum, uzun görünen çevrim ve doğru karşı
hamle olabilir. Böylece Soğutucu silahların çalışma ruhsatı olmaz.

Bu seçim, enerjinin mevcut oyunda etkisiz olduğu iddiası değildir. Mevcut
enerji üretimi, depo, bakım, aksiyon maliyeti, ısı ve bekleme katmanlarının
yerine daha görünür **hedef, konum ve zamanlama kararları** koyma tercihidir.

## 2. Savaşın temel kuralları

### Akım, deste ve yerleştirme

- İlk prototip: başlangıç 6, depo 12, her 2,2 sn'de+1 Akım. Yeni tasarımda tekrar
  ölçülecek başlangıç değerleri; önceki oyunun testleri bu tasarımı doğrulamaz.
- Altı farklı kartlık deste, en az iki farklı Saldırı kartı. İlk prototipte
  tek silah kartına bağımlı ve karşılık veremeyen açılışları sınırlamak için
  bu koşulu kullanırım. 2 Saldırı/2 Savunma/2 Taktik bir öneridir; zorunlu dağılım
  değildir. Örneğin 3 Saldırı/1 Savunma/2 Taktik de geçerlidir.
- Her kartın aynı anda en fazla iki canlı kopyası. Başlangıçta çekirdek
  dışında en fazla 8 aktif modül; mevcut 5×3 alandaki bütün hücreleri doldurmak
  şart değildir. 8 sınırı da prototip parametresidir;10/14 ile karşılaştırılır.
- Oyuncu boş hücreyi seçer. Başarısız yerleşimde Akım harcanmaz. Kurulum
  0,8 sn; bu sırada modül hedef alınabilir, koruması/aura etkisi henüz çalışmaz.
  Silah hazır olduktan sonra ilk tam çevrimini tamamlayıp ateş eder.
- Bir modül, kurulduktan sonra sürekli kaynak istemez. Yerleşen modüller
  otomatik çalışır; oyuncu tekrar tekrar ateş düğmesine basmaz. Başlangıç
  prototipinde kurulduktan sonra ücretsiz yer değiştirme yoktur.

### Konum ve çekirdeğe erişim

Bu, önerinin enerji kadar önemli ikinci değişikliğidir. Mevcut oyunda
yerleşimi sunucu seçiyor; ayrıca diğer bütün modüller temizlenmeden çekirdeğe
gidilemiyor. Tek kaynak kullanıp bu davranışları aynen bırakmak, konum
stratejisini kendiliğinden yaratmaz.

Önerilen alan mevcut 5 sütun×3 sıradır. İki taraf için de rakibe bakan sıra
öndür; karşı tarafın görsel yönü aynalanır. Çekirdek ortadaki sabit hücrede
kalır. Komşuluk dört yönde bir hücredir; köşegen değildir.

1. Normal silah kendi yaklaşma sütununda önden arkaya ilk geçerli modülü
   hedefler. Aynı sıradaki eşitlikler görünür ve deterministik çözülür.
2. O hat açıksa çekirdeğe ateş edebilir; başka sütundaki bir Batarya, destek
   veya savunma bütün çekirdeğe küresel dokunulmazlık sağlamaz.
3. Bariyer kendi sütunu ve birer yan sütunda, arkasına geçen doğrudan
   saldırıyı üzerine çekebilir. Bu yüzden alanı doğru kapatmak önemlidir.
4. Hedefleme yetkisi önceliği değiştirir; Bariyer yönlendirmesi ve Kalkan
   bloğunu kaldırmaz. Havanın ikincil alan hasarı tek bir Bariyerde toplanmaz.
5. Boş hat açılışını anında galibiyete çevirmemek için prototip çekirdeği
   900 CAN'dır. Modül onarımları çekirdeğe çalışmaz. İlk prototipte tek ortak
   çekirdek kullanılır; yedi çekirdeğin farkları temel düzen testinden sonra
   ayrı bir aşamada eklenir.

İki Lazerin savunmasız 900 CAN çekirdeğe sürekli ateşi, yalnız ham hasar
hesabıyla yaklaşık 35 sn sürer. Bu maçın 35 sn süreceği tahmini değildir;
hedef değişimleri, savunma, kurulum, karşı saldırı ve alan kapanması yoktur.
Boş hat yarışının savunmadan daha iyi hale gelmesi özellikle test edilecek.

### Ortak etki kuralları

- Aynı isabet en fazla bir Bariyer tarafından yönlendirilir ve bir Kalkan
  yüküyle azaltılır. Sonra hedefin Zırhı ve gerçekleşen CAN kaybı değerlendirilir.
- Yansıtma yeni yansıtma veya saldırı yeteneği tetiklemez; geri besleme döngüsü
  kurulmaz. İkincil hedefler kendi savunmalarından geçer.
- Aynı silaha iki Güçlendirici etkisi toplanmaz. Zayıf Hat işaretleri de
  %20 hasar artışı/%50 onarım azalması sınırını aşmaz; süreler eklenmez.
- Modül kaynaklı onarım bağlarının yalnız en güçlüsü işler. Bir Onarım ve
  iki Nano, aynı hedefi üç kat hızla onaramaz. Kıyas ham onarım hızına göre
  yapılır; Bozucunun hedefteki etkisi bundan sonra bir kez uygulanır.
- EMP 1 sn duraklatır; hedef ardından 3 sn yeni tam kesintiye bağışıktır. Çevrim
  ilerlemesini sıfırlamaz. Sadece duraklatır; uzun hazırlık sürekli başa sarmaz.
- Kartın güçlü/zayıf olduğu durum doğal mekaniğinden gelir. Ray zaten Zırh
  azaltımını deliyorsa ayrıca gizli bir %25 karşı kart hasar çarpanı almaz.
- Maç saati saldırıyı büyütmez, onarımı azaltmaz veya çekirdeği aşındırmaz.
  Kısa yetenek süreleri ve çevrimler, küresel zaman cezasından farklıdır.

## 3. Başlangıç modül değerleri

Bütün sayılar 1. seviye içindir. Çevrim ilk atışa kadar bekleme dahil tam
çevrimdir; hazırlık süresi ayrıca eklenmez. Onarım bağlarının belirtilen
miktarı 3 sn'nin toplamıdır; her tikte o miktarı vermez.

### Saldırı

| Kart | Akım | CAN | Ana hasar / çevrim | Özellik | Belirgin karşılık |
|---|---:|---:|---|---|---|
| Lazer | 3 | 260 | 18 / 1,4 sn | Tek hedef, kesintisiz temel ateş. | Zırh ve doğru konumlandırılmış savunma. |
| Darbe Topu | 4 | 290 | 52 / 3,6 sn | Çevrimin son 0,6 sn'si görünür ağır atış hazırlığı. | Kalkan yükü, Yansıtıcıyı zamanlamak, EMP. |
| Ray Topu | 4 | 280 | 40 / 3,2 sn | Zırh azaltımının %65'ini yok sayar. Kalkan/Bariyer kurallarını delmez. | Kalkan; başka hatta düşük maliyetli baskı. |
| Ark Topu | 4 | 245 | 20 / 1,8 sn | Bir komşu ikincil hedefe 14 hasar. İkinci hedef yoksa pay aktarılmaz. | Seyrek yerleşim, tek büyük engel. |
| Havan | 5 | 250 | 60 / 4,8 sn | Son 1,2 sn hazırlık; en fazla iki komşuya 20'şer ek hasar. | Seyrek yerleşim, EMP ve birden fazla hattan baskı. |
| Dron Üssü | 4 | 240 | 3×12 / 2,6 sn | Aynı hedefe 0,12 sn arayla üç isabet; ilk isabet blok yükünü harcatabilir. | Zırh ve kaynak modüle alan baskısı. |

Burada Dronun görevi ilk nottaki otomatik arka hat baskısından değişti.
Hedefleme ile aynı işi yapmasın diye **tek blok yüküne karşı üçlü isabet**
kimliği seçildi. Bağımsız canlı dronlar ve sınırsız görsel nesneler üretilmez.
Ölen hedefte kalan isabetler kendiliğinden başka hedefe veya çekirdeğe gitmez.

Ark ve Havanın ek hedefleri çekirdek erişim kuralını dolaşmaz. Alan oranları
"toplamı tek hedefe de vurur" olarak sunulmaz. Havanın azami toplamı 100 hasar,
tek hedefteki hasarı 60'tır; Arkın toplamı 34, tek hedefi 20'dir.

### Savunma

| Kart | Akım | CAN | Mekanik | Ödediği bedel |
|---|---:|---:|---|---|
| Kalkan | 3 | 320 | Kendisine veya bir ortogonal komşusuna gelen tek isabeti %60 azaltır; yük 3 sn'de dolar. | Yük bütün korunan hedefler arasında ortaktır. Her mermiyi karşılamaz. |
| Bariyer | 4 | 460 | Arkasında üç sütunluk bölgeye geçen doğrudan saldırıyı kendine çeker. | Tam hasarı kendi CAN'ından öder. Azaltma, onarım ve saldırı yoktur. |
| Zırh | 3 | 300 | Kendi aldığı hasarı sürekli %35 azaltır. | Yalnız kendi hücresini tutar; komşuları güçlendirmez ve kendini onarmaz. |
| Yansıtıcı | 3 | 280 | Hazır yük gerçekleşen CAN kaybının %60'ını, en çok 40 hasarı saldırana döndürür;4 sn yüklenir. | Aldığı hasarı ayrıca azaltmaz. Küçük atışla yükü harcatılabilir. |

Bu dört kart aynı tankın farklı renkleri değildir: Kalkan bir vuruşu
yumuşatır, Bariyer alan için CAN harcar, Zırh tek hücrede dayanır, Yansıtıcı
pahalı atışı cezalandırır. Oyuncu hangi korumayı neden seçtiğini görebilir.

### Taktik

| Kart | Akım | CAN | Çevrim / süre | Özellik ve sınır |
|---|---:|---:|---|---|
| Onarım | 3 | 190 | 3 sn | Bir komşuya 3 sn'de toplam 24 CAN; kendisi/çekirdek hariç. Aynı hedefte en güçlü onarım bağı işler. |
| Nano Onarım | 3 | 185 | 3 sn | İki komşuya ayrı ayrı 3 sn'de 14 CAN. Eksik hedefin payı diğerine aktarılmaz. |
| Güçlendirici | 2 | 150 | Sürekli | Aynı sırada hemen sol ve sağdaki silaha %35 hasar. En fazla iki silahı güçlendirir; tek komşuda da çalışır. Kopyalar aynı silaha yığılmaz. |
| Hedefleme Bilgisayarı | 3 | 180 | 8 sn / 4 sn yetki | Seçilen komşu silahın en fazla iki atışını işaretlenen çekirdek dışı hedefe yöneltir. Hasar/hız bonusu yoktur. |
| EMP | 3 | 170 | 7 sn / 1 sn etki | Tek saldırı veya savunmayı duraklatır. Ardından 3 sn tam kesinti bağışıklığı. Çekirdeği ve onarım modülünü kapatmaz. |
| Bozucu | 2 | 150 | 7 sn / 4 sn etki | Tek modülde Zayıf Hat: aldığı saldırı hasarı %20 artar, aldığı onarım %50 azalır. Çekirdeğe uygulanmaz. |

**Onarım:** Bağ hedef yaralı olduğu sürece miktarını 3 sn'ye yayar; kaynak
ölür veya komşuluk kaybolursa biter. Başka bir kaynak daha güçlü bağ
kurarsa eskisiyle toplanmaz. Bozucu varken daha çok Onarım basmak hedefteki
%50 alım cezasını dolaşmaz. Uygulamada kesirli CAN biriktirilmelidir;10 Hz'de
her tikte 0,8 CAN'ı 1'e yuvarlamak 24 yerine 30 CAN vererek dengeyi bozmamalı.

**Güçlendirici:** Bir silaha erken kurmak yerine önce iki silahlı omurga
kurma tercihi yaratır. Sağ/sol koşulu, oyuncuyu Havan ve Ark karşısında
yan yana durmanın bedeliyle yüzleştirir. Güçlendirici tek başına hasar vermez.

**Hedefleme:** Komşu silah yerleşimde seçilir; düşman hedefi işaretlenebilir.
İşaret yoksa tehlikeli onarım/güçlendirme kaynağı önerilir. Yetki süresi
ve kalan atış sayısı görünür. Hedef ölürse kalan yetki başka hedefe otomatik
taşınmaz. Kontrolü atış gücüne dönüştüren bir konum kartıdır.

**EMP:** Durdurulmuş modül tahtada kalır ve vurulabilir. Bağışık hedefte
başarısız tetik çevrimi harcamaz; uygun hedef aranır veya hazır beklenir.
İki EMP hiçbir modülü kalıcı kapatamaz. Oyuncu birden fazla saldırı kaynağı
kurarak da karşılık verebilir.

**Bozucu:** Sadece düşük oranlı bir onarım azaltması, yeni silah kurmaya
karşı çok zayıf kalabilir. Bu yüzden kâğıt adayında 2 Akım ve küçük bir
hedef kırılganlığı da var. Üçüncü bir saldırı kaynağına göre değeri özellikle
kalabalık/onarılmış hatta artmalı; her destede otomatik seçim olmamalı.
%20/%50 oranları ve 2 Akım, prototipte ayrıca sınanacak hassas parametrelerdir.

## 4. İlk hesapların gösterdikleri

Hesaplar `tasarim-akim-v1/incele.py` ile yeniden üretilebilir. Oyunun
motorunu veya hesap deposunu açmaz; yeni 16 kart verisini okur. Sadece sabit
hedefe isabet/çevrim hesabı yapar; modüllerin yerleşimi, kararlar, çekirdek
güçleri, seviye/yetenek farkı ve tam maç sonuçları yoktur.

| Silah | Tek hedef hasar/sn | 260 CAN çıplak hedef | 300 CAN/%35 Zırh | 320 CAN/Kalkan |
|---|---:|---:|---:|---:|
| Lazer | 12,86 | 21 sn | 36,4 sn | 32,2 sn |
| Darbe | 14,44 | 18 sn | 32,4 sn | 57,6 sn |
| Ray | 12,50 | 22,4 sn | 28,8 sn | 64 sn |
| Ark | 11,11 | 23,4 sn | 43,2 sn | 43,2 sn |
| Havan | 12,50 | 24 sn | 38,4 sn | 67,2 sn |
| Dron | 13,85 | 20,8 sn | 34,04 sn | 26,24 sn |

Tablo, modülün hazır olmasından sonra ilk tam çevrimi de bekleyen sabit
hedef hesabıdır;0,8 sn kurulum ayrıca eklenir. Kalkan başlangıçta yüklüdür,
tek isabetten sonra 3 sn'de dolar. Yansıtma, komşu koruması ve alan hasarı bu
tabloda yoktur. Sayılar kayan noktalı referans hesabıdır; son motorun CAN
yuvarlama politikası ayrıca eşlenmelidir.

Bu dağılımda amaç her silahın aynı saniyede öldürmesi değildir. Ray Zırhta
iyileşirken Kalkan karşısında belirgin kötüleşir; Darbe ağır vuruşunu
Kalkana kaptırır; Dron küçük isabetle yük harcatır. Havan ve Arkın değeri
ikinci/üçüncü hedef olduğunda artar. Ekstra gizli karşı kart çarpanı yoktur.

Onarım 8 CAN/sn, Nano hedef başına 4,67 CAN/sn'dir. Onarım çıplak tek silahın
hasarını bütünüyle silemez. Fakat şu kritik örnek var:

- Tek Lazerin %35 Zırha gerçek hasarı 8,36/sn; Onarım 8/sn'yi geri verir.
  Net yalnız 0,36/sn kalır. Hedefe başka yoldan erişim yoksa savaş çok uzar.
- İki Lazer aynı hedefte 16,71/sn vurur; Onarım sonrası net 8,71/sn kalır.
- Ray, Hedefleme ile kaynağa erişim, Bozucu veya açık başka hat gibi farklı
  karşılıklar da bulunmalı. Oyuncuya yalnız "bir Ray koy" çözümü dayatılmamalı.

**Dolayısıyla bu sayılarla bütün kilitlenmelerin çözüldüğünü söylemiyorum.**
Bu örnek, neden hedef/hat kuralını ve onarımın karşı oyununu birlikte
çalıştığımı gösteriyor. Global onarım cezası veya süre arttıkça çekirdek
erimesi bu tasarımın çözümü değil.

Güçlendirme hesabı da koşulu gösteriyor: tek Lazer+Güçlendirici 17,36 hasar/sn,
iki Lazer 25,71, iki Lazer+Güçlendirici 34,71. İlk iki seçenek aynı maliyette
değil (5 ve 6 Akım); erken tek silahlı desteklemenin zayıf kalması bilinçli.
İki silah kurulduğunda 2 Akımlık destek anlam kazanmaya başlıyor. Bu hesap
güçlendiricinin bütün destelerde dengeli olduğunu kanıtlamaz.

## 5. Örnek desteler ve oynanışları

| Deste | Altı kart | Kuracağı strateji | Açığı |
|---|---|---|---|
| Dengeli hat | Lazer, Darbe, Kalkan, Bariyer, Onarım, Güçlendirici | İki silahı yaşatıp araya Güçlendirici yerleştirmek; saldırı gelen hattı kapatmak. | Ark/Havan ile komşuluk cezalandırılır; arka hat erişimi sınırlı. |
| Zırh ve kümelenme karşılığı | Ray, Havan, Zırh, Bariyer, Hedefleme, EMP | Ray ön engeli sökerken Havan kümeyi dağıtır; EMP/Hedefleme ile destek kaynağına açıklık aranır. | Pahalı açılış, seyrek hızlı baskı ve Kalkan. |
| Dağıtılmış baskı | Dron, Ark, Kalkan, Yansıtıcı, Nano, Bozucu | Blok yükünü harcatmak, iki hedefi yıpratmak, karşı onarımı işaretlemek. | Tek büyük ve seyrek konumlanmış Zırh; yoğun tek hedef ateşi. |
| Onarım hattını kırma | Darbe, Ray, Bariyer, Kalkan, Hedefleme, Bozucu | Hazır işaret/hedefleme anında bir noktayı kırmak. | Kendi onarımı yok; kaçırılan darbe ve yaygın hasar pahalıdır. |

İlk destenin yalnız Akım biriktirme hesabıyla örnek açılışı:

| En erken finanse edilen an | Yeni kart | Toplam kurulan farklı parça |
|---|---|---:|
| Başlangıç | Lazer + Kalkan | 2 |
| 8,8 sn | Darbe | 3 |
| 15,4 sn | Onarım | 4 |
| 19,8 sn | Güçlendirici | 5 |
| 28,6 sn | Bariyer | 6 |

Bu, bu modüllerin mutlaka hayatta kalacağı veya bu sıranın her rakibe en
iyi cevap olacağı iddiası değildir. Ölüm, tepki, harcanan başka Akım ve 0,8 sn
kurulum yoktur. Yalnız "5 parçalı stratejiyi finanse etmek baştan imkânsız mı?"
sorusunun ilk kontrolüdür. Boş hattan saldırı gelirse sırayı değiştirmek gerekir.

## 6. Seviye, enderlik ve ilk çekirdek

- Önerilen seviye 1–15; CAN/hasar/onarım her seviyede×1,03. Eşit seviyeli
  karşılaşmalarda yaşam süresi gereksiz yere hızlanmasın veya uzamasın.
- Çevrimler, menzil, blok oranı ve kontrol süresi sırf seviye arttı diye
  sürekli büyümez. Bunların etkileşimi ayrı incelenir. Yuvarlama sınırları test edilir.
- Enderlik gizli daha fazla CAN+hasar+hız paketi değildir. İleri kartın
  değeri farklı bir karar veya kural olmalı; koşulu oluştuğunda belirgin
  fayda vermeli. Yaygın kartlar anlamlı temel seçenekler olarak kalmalı.
- İlk prototipte tek ortak 900 CAN çekirdek.35 sn'lik aktif gücü, en yaralı
  iki çekirdek dışı modüle bir kez 40'ar CAN onarım olabilir. Dolu CAN'da
  kullanılmaz; dolumu korunur. Modüller ve bu başlangıç gücü çekirdeği onarmaz.
  Bu sayılar da adaydır; yedi çekirdeği aynı anda dengelemeye başlanmaz.
- Çok dallı yetenek ağaçları ilk karşılaştırmanın dışında kalır. Temel
  roller doğrulandıktan sonra, bedeli olan alternatif davranışlar eklenir.

Eşleştirme, ödül ve yükseltme ekonomisi bu belgenin ayrı inceleme gerektiren
komşu konularıdır. Eşit seviye savaş dengesi, yeni oyuncuyla azami seviye
oyuncunun aynı anda eşleştirilmesini haklı çıkarmaz.

## 7. Mevcut 36 kart unutulmadı

Canlı oyundan hiçbir kart silinmedi. İlk prototipte 16 kimlik seçmek,
diğer 20 kartın oyuncudan alınması değildir. Bütün eski kimlikler makine
okunur dosyada tek tek sınıflandırıldı;36/36 kapsama kontrolü geçti.

| Grup | Mevcut kartlar | Önerilen değerlendirme |
|---|---|---|
| Temel karşılığı bulunanlar | Lazer, Darbe, Ray, Ark, Dron, Kalkan, Bariyer, Zırh, Yansıtıcı, Onarım, Nano, Güçlendirici, Hedefleme, EMP | Yeni kurallarıyla ilk prototipte. Aynı ad davranışın tamamen aynı kaldığı anlamına gelmez. |
| Birleştirme / görev dönüşümü adayları | Füze+Plazma→Havan; İyon→Ray ailesi; Omega→güçlendirme ailesi; Sinyal Bozucu/Kesici→Bozucu | Alternatif mekanikleri testten sonra seçilir. Bu bir otomatik hesap dönüşümü talimatı değildir. |
| Sürekli enerji/ısı kapsamı dışında | Batarya, Kapasitör, Akım Dengeleyici, Soğutucu | İlk prototipte bulunmaz; sırf eski görseli kullanmak için zorunlu başka işletme kaynağı icat edilmez. |
| İkinci aşama mekanik havuzu | Virüs, Aşırı Hızlandırıcı, Muhafız Kubbesi, Kuantum Tekrarlayıcı, Krono, Faz Zırhı, Sürü, Hassasiyet Matrisi, Prizma, Anka, Kuantum, Tekillik | Temel 16 rol öğrenilip doğrulandıktan sonra ayrı, tekrarsız görev kanıtlayanlar eklenir. |

Özellikle enerjiye bağlı ileri kartlar için örnek yönler:

- **Kuantum Topu:** fazla enerji toplamak yerine görünür atış sayacı.
  Örneğin iki normal atıştan sonra bir güçlü atış. Kalkan yükünü saklama,
  EMP zamanlaması ve hedefin değişmesi karşı oyun yaratır. Ham sayıları
  henüz ilk 16 kart tablosuna eklenmedi; ikinci aşama adayıdır.
- **Prizma:** enerji dönüşümü yerine engellenen hasardan sınırlı, kısa
  süreli komşu kalkanı. Kalkan ile aynı görevi sadece daha büyük sayıyla
  yaparsa eklenmez; verilen kalkanlar yığılmaz.
- **Anka:** normal onarımın da üstün sürümü olmadan, maçta tek yeniden
  kurulum. Çekirdek hariç, düşük CAN, görünür hazırlık ve oyuncu başına
  ortak diriltme sınırı. İki Anka sonsuz diriliş yapamaz.
- **Krono/Aşırı Yük:** kısa hız penceresi ve açık toparlanma bedeli;
  sürekli ısı ekonomisi geri getirilmeden ele alınabilir.

Mevcut yedi çekirdeğin enerji odaklı güçleri ve yetenek dalları da tek tek
eşlenmelidir. Kapasitör çekirdeğinin rezerv boşaltması, örneğin hazırlanan
iki atışa destek şeklinde başka bir karara dönüşebilir. Rezonans, Muhafız,
Aşırı Yük, Kesinti, Anka ve Kuantumun enerjiye bağımlı olmayan kısımları
korunabilir; yeni hedef/alan kurallarıyla yine test gerekir.

Oyuncunun seviyesi, kart parçaları, yatırdığı kaynaklar ve açtığı yetenekler
için onaylanmış geçiş tablosu olmadan birleştirme/silme yapılmaz. Birden
çok eski kartın tek aileye aday olması, kayıplı otomatik birleştirme değildir.

## 8. Önce neyi test ederdim?

1. **Altı silahın kimliği:** çıplak hedef, Zırh, Kalkan, tek/iki/üç hedef.
   Ray her hedefte, Havan tek hedefte en iyi çıkmamalı. Sabit hedef hesapları
   burada yalnız başlangıç kontrolüdür.
2. **Dört savunmanın farkı:** aynı Akım/alan yatırımı; hangi saldırıda ne
   kazandırıyor? Yönlendirme/blok/yansıtma zinciri ve döngü açıkları var mı?
3. **Onarım ve kontrol:** bir/iki onarım kopyası, Nano+Onarım, Bozucu ve
   iki EMP. Aynı hedefte onarım yığılmaması,3 sn toparlanma ve hedef kaybı.
4. **Konum karşılaştırması:** aynı kartlar/sayılarla küresel çekirdek koruması
   ve açık hat kuralı ayrı iki prototipte karşılaştırılır. Boş hat silah
   yarışının savunmayı anlamsızlaştırmadığı özellikle ölçülür.
5. **Gerçek açılışlar:** hızlı baskı, ağır kurulum, geç tepki, Akım biriktirme,
   yanlış hücre ve boş hat. En iyi hamle her seferinde aynı ilk üç kart mı?
6. **Çeşitli desteler:** yalnız tek bot davranışına göre kazanma oranı çıkarılmaz.
   Taraf değişimi, farklı karar politikaları, yetenekler kapalı eşit seviye
   tabanı ve sonra 1/8/15 seviyeler. Uzun maçlarda çekirdek/cephe ilerlemesi
   ayrıca kaydedilir; süre doldu diye gizli hasar eklenmez.
7. **Telefon:** elde 6 kart, hücre seçimi ve hedef işareti anlaşılabiliyor mu?
   Modül neden durdu/vurdu/korudu, oyuncu görebiliyor mu? Bellek/çizim bütçesi
   yanında bu okunabilirlik de kabul ölçütüdür.

Her destenin %50 kazanması hedef değil. Bir kartın her koşulda alternatifini
dışlamaması; ağır silahın çalışmak için zorunlu başka bir karta muhtaç
olmaması; onarımın tek çözümünün küresel saat cezası olmaması hedefleniyor.

Bu çalışma canlı oyunu yeniden yazma onayı olarak uygulanmadı. Bir sonraki
somut adım, mevcut sürümü koruyan **ayrı oynanabilir prototip** olur.

## Dosyalar

- `tasarim-akim-v1/moduller.json`: 16 kartın sayıları, görev/karşılıkları,
  36 eski kimliğin karşılığı ve 4 örnek deste.
- `tasarim-akim-v1/incele.py`: tutarlılık ve sabit hedef aritmetiği.
- `tasarim-akim-v1/aritmetik.json`: bu sürümün yeniden üretilmiş sayısal çıktısı.
