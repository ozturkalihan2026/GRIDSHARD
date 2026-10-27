# GRIDSHARD — 36 modülün yeniden değerlendirilmesi

> Bu, 27 Ekim kaynaklarının tarihsel değerlendirmesidir. Kullanıcının daha
> sonraki talimatıyla yapılan ve test edilen uygulama için
> [28 Ekim uygulama kaydını](MODUL_DENGE_UYGULAMA_20261028.md) okuyun.

27 Ekim 2026. **Bu çalışma bir tasarım değerlendirmesi ve yerel deneydir;
oyuna uygulanmış veya yayına hazır bir denge güncellemesi değildir.**

## Önceki müdahalenin gerçek kapsamı

Önceki düzeltme 36 modülü tek tek dengelememişti. İyon Mızrağı ve Kuantum
Topu'nun kurulum Akımı 6→4, Kuantum Tekrarlayıcı'nınki 5→4 yapıldı; aksiyon
enerjisinin ısı katsayısı 2,2→0,9 indirildi. Çekirdek CAN'ının seviyeyi
izlememesi düzeltildi: 1. seviyede 300, 15. seviyede 881 CAN. Modüllerin
genel CAN/hasar eğrileri ve 36 kartın taban değerleri yeniden kurulmamıştı.
Bu yüzden o müdahaleye “bütün modüller dengelendi” denemez.

Bu değerlendirmede oyun kaynaklarındaki denge sayıları değiştirilmedi.
Deneyler savaş motorunun ayrı Python süreçlerindeki bellek kopyasında çalıştı.
Oyuncu verisi, canlı sunucu ve üretim paketi kullanılmadı.

## Baştan tasarlasaydım

1. **Her kartın bir ana işi, bir bedeli ve okunabilen bir karşı hamlesi olurdu.**
   Efsanevi kart farklı bir oyun kararı açardı. Aynı işi daha çok hasar,
   daha fazla hedef ve daha iyi delmeyle birlikte yaparken yalnız kurulum
   maliyetiyle cezalandırılmazdı. Altı efsaneviyi yan yana koymak da otomatik
   olarak iyi deste anlamına gelmezdi.
2. **Kurulum Akımı, işletim enerjisi ve ısı ayrı bütçeler olurdu.** Oyundaki
   kurulum Akımı kart basmaya, enerji kartı çalıştırmaya yarar. Ağır silaha
   üçünü birden aşırı yüklemek, nadirlik kazancını silebilir. Ancak her
   efsaneviyi aynı maliyete indirmek de çözüm değildir. Bir ağır silahın
   hedeflediği eşleşmedeki getirisi, aynı Akımla kurulan hafif paketle ölçülür.
3. **Eşit seviyelerde karşı hamle süresi korunurdu.** Bir silahın savunmasız
   eşdeğerine karşı tipik olarak 3–5 ağır darbe veya daha çok hafif atış
   istemesi ilk tasarım hedefim olurdu. Birkaç silahın aynı anda odaklanması
   daha hızlı öldürebilir; bu, tek kartın her şeyi iki atışta silmesiyle aynı
   denge sorusu değildir.
4. **Seviye artışı zamanla bütün oyunu patlama hasarına dönüştürmezdi.** CAN,
   hasar, çevrim, onarım ve kontrol süresi ayrı ayrı incelenirdi. Kontrol ve
   yüzde azaltmalar, düz hasarla aynı biçimde sınırsız büyümezdi.
5. **Soğutucu belirli bir deste tercihi olurdu.** Hızlandırılmış veya çok
   sayıda ağır silahlı devrede değerli kalırdı. Normal bir silahı kullanılabilir
   kılmak için gereken genel sigorta ve aynı zamanda güçlü bir sabotaj
   temizleyicisi olmazdı.
6. **Savunma zaman kazandırır, onarım bu zamanı değerlendirirdi.** Çoklu
   onarımın, yeniden doğuşun ve savunmanın birlikte ne kadar mücadele süresi
   kazandırdığı test edilirdi. Sadece bütün CAN'ları artırmak yeterli değildir.

Bunlar önerilen tasarım hedefleridir; mevcut oyunun garantileri değildir.

## Kaynakta ve motor deneyinde bulunan sorunlar

### 1. Hasar büyümesi dayanıklılığı geride bırakıyor

Mevcut seviyelendirmede, yetenekler hariç:

- CAN: `taban × 1,03^(seviye−1)`.
- Hasar: `taban × 1,05^(seviye−1)`.
- Bekleme: `taban × max(0,88; 0,992^(seviye−1))`.

1→15 arasında CAN yaklaşık **%51**, teorik tek hedef hasar/sn **%122**
artıyor. Bu, aynı iki modül arasındaki karşı koyma süresini kısaltan yapısal
bir etken. Tek başına bütün maç sonuçlarını açıklamaz.

Deneyde CAN büyümesini %4,5, hasar büyümesini %4 yaptım. Bu durumda CAN
yaklaşık %85, teorik hasar/sn %94 artıyor; oranlar birbirine yaklaşıyor.
Bu bir başlangıç adayıdır. Savunmanın yüzde azaltımı ve onarımın büyümesi
ayrıca hesaba katılmadan kesin eğri kabul edilmemeli.

### 2. Bazı silahlar aynı Akıma çok farklı paketler sunuyor

Örneğin taban Lazer 3 Akım, 12 hasar/1 sn; Kuantum Tekrarlayıcı 4 Akım,
24 hasar/1 sn ve her dördüncü aynı hedef vuruşunda ek yankı veriyor.
Tekrarlayıcı daha çok enerji ve ısı ödüyor, daha az CAN taşıyor. Yine de
yalnız nadirliğe bakarak bu farkı doğru kabul edemeyiz.

İyon Mızrağı ve Kuantum Topu'nun ağır darbelerini düşürme; Füze, Ark,
Plazma ve Sürü'nün görevlerindeki verimlerini yükseltme yönünü denedim.
**Bu, bütün saldırı hasarlarını aynı oranda azaltma önerisi değildir.**
Sürü'nün eylem enerjisi de önemli: 0,9 sn'de 2,2 enerji istiyor; Dron'un
aynı aralıkta 1 enerji istemesine karşı kendi biriktirmeli salımının bu
bedeli gerçekten karşılaması gerekir. İlk adayda yalnız hasar/yayılım
artırmak Sürü destesini yeterince iyileştirmedi.

Şu an 4 Akımlık ağır silaha karşı 3 Akımlık hafif silah oranı 4/3'tür.
Eski 6 Akım sorunu azaltıldı; “bir efsanevi kurulana kadar 3–4 yaygın”
iddiasını güncel maliyetler için genel bir matematik kuralı olarak almıyorum.
Kurulum sırası, toplam deste maliyeti ve çalışan kart sayısı da ölçülmeli.

### 3. Dört sabotaj ailesi aynı tam susturma sonucuna bağlanıyor

`operations.py` EMP, destek bozma, Virüs ve hat kesintisini aynı şekilde
operasyon dışı sayıyor. Hedef saldırı, savunma, destek veya enerji işini
yapamıyor. Böyle bir modül normal saldırı hedefleri listesinden de çıkıyor;
bu, bazen canlı modüller varken Çekirdeğe erişimi kolaylaştırabilir.

90 saniyelik kontrollü deneyde, seviye 15 tek sabotajın karşısında tek,
dayanıklı Lazer ve karşı modül yokken:

| Sabotaj | En uzun uygulama | Hedefin sustuğu süre oranı |
|---|---:|---:|
| EMP | 3.781 sn | %67.0 |
| Sinyal Bozucu | 6.050 sn | %98.4 |
| Virüs | 9.076 sn | %99.0 |
| Kesici | 5.294 sn | %82.4 |
| Tekillik Projektörü | 6.807 sn | %98.7 |

Bu deney kalabalık bir maç değildir; “bu kart her maçta bu kadar susturur”
anlamına gelmez. Hedef dağılması, ısı, enerji ve karşı hamleler maçı değiştirir.
Ama **tek kaynağın neredeyse kesintisiz tam susturabilmesi gerçek bir
mekanik sorundur.** İlk adayın süre tavanı EMP/Bozucu/Kesici/Tekillik'i
azalttı; Virüsün mevcut tam susturmasını bilerek değiştirmedi ve bu sorun
devam etti. Dolayısıyla ilk aday tamamlanmış sayılamaz.

Benim nihai rol önerim:

| Modül | Ana etki | İlk tasarım hedefi / sınır |
|---|---|---|
| EMP | Tek modülde kısa tam susturma | Yaklaşık 1,5–2 sn; tek kaynak, korumasız hedefi sürekli kapatamaz. |
| Sinyal Bozucu | Destek verimini düşürme | Destek yükünü/onarım verimini geçici azaltır; saldırı ve enerji kartında tam susturma yapmaz. |
| Virüs | Tırmanan zamanla hasar | Hedef çalışmaya devam eder; Onarım temizler. Seviye, hasarı artırır; susturma süresi eklemez. |
| Kesici | Enerji hattına müdahale | Üretim/rezerv kullanımına kısa kesinti; evrensel ikinci EMP olmaz. |
| Tekillik | İki hedefte kısa kontrol | Kapsama karşılığı daha kısa süre ve açık hazırlık işareti; tüm bir devreyi sürekli kilitlemez. |

Önerilen davranışlar sayısal deneyde henüz uygulanmadı. Bunları mevcut
mekaniğin adıymış veya doğrulanmış yeni değerler gibi okumamak gerekir.

### 4. Soğutucunun ısı dışındaki değeri de yüksek

Soğutucu üç sıcak hedefi soğutmanın yanında, EMP ve hat kesintisinin kalan
süresinden her darbede taban **1.800 ms** kesiyor. Seviye artışı ve hızlanan
çevrim bunu daha değerli yapıyor. Sinyal Bozucu ve Virüsün doğrudan
temizlenmesi ise Onarım tarafındadır.

Ben Soğutucuyu termal role çekerdim. Genel sabotaj çözümü Bariyer/uygun
karşı modülde kalırdı. İlk adayda 1.800→500 ms denendi; sıfırlamak ve daralan
sabotaj rolleriyle tekrar ölçmek ayrı bir davranış çalışmasıdır.

İzole 90 sn ateş testinde seviye 15 Lazer ve Dron, Soğutucu olmadan hiç
aşırı ısınmadı. Güncel Kuantum Topu ilk kez 36,4 sn'de; daha düşük enerji
maliyeti ve daha uzun çevrimli aday 46,7 sn'de aşırı ısındı. Soğutucu iki
durumda da test boyunca aşırı ısınmayı önledi. Bu nedenle eski ısı
düzeltmesinden sonra bile bütün kartlara “Soğutucu gereksiz oldu” denemez.
Bu testte karşı taraf saldırmıyor ve Çekirdek güçleri kullanılmıyor.

### 5. Savunma ısısı hasar büyümesini ayrıca ödüyor

Engellenen mutlak hasarın her puanı %0,25 ısı üretiyor. Hasar seviyeyle
artarken bu ilişki sabit kalırsa, savunma daha çok CAN kazansa da daha hızlı
ısınabilir. İlk adayda bu ısıyı modülün taban/seviyeli CAN oranıyla
normalleştirdim. İleride her savunmanın görevine göre termal bütçe
belirlemek daha temiz olur.

Prizma Kalkanı'nın hasardan enerjiye dönüşümü de iki farklı birimi doğrudan
bağlıyor: taban %25, tavan %45. Hasar artışı enerji ekonomisini büyütmemeli.
İlk adayda %8/tavan %12 denendi. Bu oranlar da son denge kararı değildir;
darbe başına ve saniyede üst sınırla karşılaştırılmalıdır.

## 36 modülün tamamı: rol kararı ve denenen taban değerleri

Tablolardaki oklar **bugünkü kaynak → ilk deney adayı** anlamına gelir.
Hasar tek ana vuruştur; zincir, yankı, salım ve destek etkisi ayrıca vardır.
CAN ve hasar taban, yani 1. seviye ve yeteneksiz değerlerdir. Önerilen
seviye eğrisi bütün modüllerde ayrıca uygulanmıştır.

**Bu sayısal aday bütünüyle kabul edilmedi.** Özellikle Darbe Topu'nu
ucuzlatıp Füze'yi aynı anda güçlendirmek bazı desteleri fazla yükseltti.
Bu iki değişiklik birlikte taşınmamalı; aşağıdaki değerler ölçülmüş
deneyin kaydıdır, nihai uygulama listesi değildir.

### Saldırı — 11 modül

| Modül | Akım | CAN | Ana vuruş / çevrim (sn) | Tasarlayacağım görev ve sınır |
|---|---:|---:|---|---|
| Lazer | 3→3 | 100→140 | 12 / 1 → 12 / 1 | Kararlı tek hedef; düşük enerjiyle uzun ateş. Kalkan ve yansıtma karşı hamlesi. |
| Darbe Topu | 4→3 | 115→150 | 32 / 2.5 → 34 / 2.5 | Seyrek güçlü darbe; enerji/ısı bedeli yüksek. Sönümleme karşı hamlesi. |
| Füze Fırlatıcı | 3→3 | 105→145 | 28 / 3 → 36 / 3 | Önceden görülen kilitli darbe; düşük sürekli tempo. Sinyal kesme karşı hamlesi. |
| Ray Topu | 4→4 | 95→140 | 40 / 3.2 → 44 / 3 | Ağır savunmayı delen tek hedef silahı; kalabalık temizliği zayıf. |
| Ark Topu | 4→4 | 100→135 | 20 / 1.8 → 24 / 1.8 | İki modüle zincir hasarı; tek hedefe daha az bütçe. |
| Dron Üssü | 3→3 | 110→120 | 8 / 0.9 → 9 / 0.9 | Hızlı küçük darbeler ve hafif yayılım; ağır korumada verimsiz. |
| Plazma Havanı | 4→4 | 100→150 | 30 / 3 → 38 / 3 | Uyarılı ağır alan darbesi; zincirden daha yavaş ve daha kırılgan kilit. |
| Kuantum Tekrarlayıcı | 4→4 | 92→125 | 24 / 1 → 18 / 1 | Aynı hedefte dördüncü vuruş ödülü; hedef değişimi ve kontrol karşı hamlesi. |
| İyon Mızrağı | 4→4 | 100→140 | 48 / 3.2 → 40 / 3 | Savunma delme ve ikinci hedefe taşıma; tek hedefte evrensel en iyi silah değil. |
| Sürü Fabrikatörü | 3→3 | 105→130 | 6 / 0.9 → 9 / 0.9 | Dört atıştan sonra üç hedefe yayılım; kurulumunu tamamlamadan baskın yeme riski. |
| Kuantum Topu | 4→4 | 105→150 | 58 / 2.5 → 42 / 2.8 | Gerçek enerji fazlasını patlamaya çeviren silah; enerji açığında yük birikmez. |

### Savunma — 7 modül

| Modül | Akım | CAN | Ana vuruş / çevrim (sn) | Tasarlayacağım görev ve sınır |
|---|---:|---:|---|---|
| Kalkan | 3→3 | 150→175 | Özel etki; aşağıdaki rol sınırları | Aralıklı tek darbe koruması; seri atış bloklar arasından geçer. |
| Zırh | 3→3 | 180→220 | Özel etki; aşağıdaki rol sınırları | Düzenli hasarı sönümleyen tank; delici atış ve kontrol karşı hamlesi. |
| Bariyer | 3→3 | 165→190 | Özel etki; aşağıdaki rol sınırları | Daha düşük doğrudan koruma karşılığında sabotaj süresini azaltan ön hat. |
| Yansıtıcı | 3→3 | 110→150 | Özel etki; aşağıdaki rol sınırları | Darbeyi üzerine çekip saldırana geri veren karşı saldırı savunması. |
| Muhafız Kubbesi | 4→4 | 155→185 | Özel etki; aşağıdaki rol sınırları | Bir başka modülü koruyan destek tankı; kendi başına en dayanıklı tank değil. |
| Faz Zırhı | 4→4 | 150→190 | Özel etki; aşağıdaki rol sınırları | Kısa faz penceresinde patlamayı boşa çıkaran savunma; pencere dışında açık. |
| Prizma Kalkanı | 4→4 | 165→185 | Özel etki; aşağıdaki rol sınırları | Engellenen hasarın küçük payını enerjiye çevirir; sınırsız enerji kaynağı olmamalı. |

### Destek — 10 modül

| Modül | Akım | CAN | Ana vuruş / çevrim (sn) | Tasarlayacağım görev ve sınır |
|---|---:|---:|---|---|
| Onarım | 3→3 | 100→130 | Özel etki; aşağıdaki rol sınırları | Tek hedefi ayakta tutar; birden fazla hedefe eşzamanlı baskıda yetersiz. |
| Nano Sağlıkçı | 3→3 | 95→125 | Özel etki; aşağıdaki rol sınırları | İki yaralıya paylaştırılmış onarım; odak hasarına karşı daha zayıf. |
| Anka Onarım | 4→4 | 100→135 | Özel etki; aşağıdaki rol sınırları | Bir kez geri getirme sigortası; erken baskı ve enerji kesintisi karşı hamlesi. |
| Soğutucu | 2→2 | 100→115 | Özel etki; aşağıdaki rol sınırları | Uzun ateş ve hızlandırma destelerinin termal tercihi; evrensel sabotaj temizleyici değil. |
| Güçlendirici | 3→3 | 90→125 | Özel etki; aşağıdaki rol sınırları | Paylaşılan tek atış hasar yükü; kalabalık saldırı hattına sonsuz çarpan vermez. |
| Hedefleme Bilgisayarı | 3→3 | 85→120 | Özel etki; aşağıdaki rol sınırları | Paylaşılan ateş temposu; hızlı silahı bedelsiz enerjiyle çalıştırmaz. |
| Aşırı Hızlandırıcı | 3→3 | 80→115 | Özel etki; aşağıdaki rol sınırları | Isı borcu karşılığında seçili ağır saldırıyı hızlandırır; soğutucuyla anlamlı özel kurulum. |
| Krono Rölesi | 3→3 | 88→125 | Özel etki; aşağıdaki rol sınırları | Kısa takım temposu, ardından ölçülebilir zaman borcu; borç evresi korunmalı. |
| Hassasiyet Matrisi | 3→3 | 90→125 | Özel etki; aşağıdaki rol sınırları | Aynı hedefe odaklanmayı ödüllendirir; hedef değişiminde birikimi kaybeder. |
| Omega Güçlendirici | 3→3 | 95→135 | Özel etki; aşağıdaki rol sınırları | Farklı sınıflı devreyi ödüllendirir; sıradan güçlendiricinin her koşulda üst sürümü değil. |

### Sistem — 3 modül

| Modül | Akım | CAN | Ana vuruş / çevrim (sn) | Tasarlayacağım görev ve sınır |
|---|---:|---:|---|---|
| Batarya | 2→2 | 120→145 | Özel etki; aşağıdaki rol sınırları | Uzun vadeli üretim; erken saldırı Akımından ve bir hücreden vazgeçme bedeli. |
| Kapasitör | 2→2 | 90→120 | Özel etki; aşağıdaki rol sınırları | Kısa yüksek enerji isteğini rezervden karşılar; sürekli üretim yapmaz. |
| Akım Dengeleyici | 3→3 | 100→130 | Özel etki; aşağıdaki rol sınırları | Büyük devrede tüketimi azaltır; küçük devrede Bataryanın yerini otomatik almaz. |

### Sabotaj — 5 modül

| Modül | Akım | CAN | Ana vuruş / çevrim (sn) | Tasarlayacağım görev ve sınır |
|---|---:|---:|---|---|
| EMP | 3→3 | 80→115 | Özel etki; aşağıdaki rol sınırları | Tek hedefte kısa çalışma kesintisi; sürekli kilit yerine fırsat penceresi. |
| Sinyal Bozucu | 3→3 | 85→115 | Özel etki; aşağıdaki rol sınırları | Destek hattına baskı; nihai tasarımda tüm silahları tamamen susturmamalı. |
| Virüs | 4→3 | 70→110 | Özel etki; aşağıdaki rol sınırları | Zamanla artan hasar; temizleme ve hızlı odak hasarı karşı hamlesi. |
| Kesici | 3→3 | 80→120 | Özel etki; aşağıdaki rol sınırları | Enerji/sistem ekonomisine kesinti; nihai tasarımda evrensel EMP kopyası olmamalı. |
| Tekillik Projektörü | 3→4 | 90→125 | Özel etki; aşağıdaki rol sınırları | İki kritik modüle kısa kontrol; geniş kapsama karşılığında uzun tam kilit vermez. |


Rol tablosunun ek kararları:

- **Saldırı:** Lazer'in temel verim ölçütünü korurum. Darbe/Füze'ye
  kullanılabilir bir başlangıç alanı açarım; ancak aynı gün hem maliyet hem
  güçlü hasar artışı vermem. Ray–İyon ayrımında Ray tek hedef verimi,
  İyon delme ve ikinci hedef erişimi kazanır. Tekrarlayıcı ve Kuantum Topu'nun
  iki atışlık baskısını azaltırım. Sürü ve Dron'u enerji başına gerçek
  çoklu hedef getirisiyle ayırırım. Plazma'nın alanı mevcut motorda sıradaki
  hedefe ek vuruştur; hücre tabanlı gerçek alan hasarı gibi sunulmaz.
- **Savunma:** Kalkan'ın darbe yakalaması, Sönümleyici'nin sürekli koruması,
  Bariyer'in kontrol direnci, Yansıtıcı'nın geri hasarı, Kubbe'nin başka
  hedefi koruması, Faz'ın zamanlama penceresi ve Prizma'nın sınırlı enerji
  geri dönüşü korunur. Hepsini aynı CAN artışıyla eşitlemem; görevindeki
  etkin dayanıklılığı ve ısıyı ayrı ölçerim.
- **Onarım:** Onarım tek hedefte, Nano iki yaralıda, Anka kaybedilen pahalı
  kartı bir kez geri getirmede öne çıkar. Aynı hedefe onarım yığılmasını
  sınırlayan mevcut kurallar korunur. Tank/onarıcı grubunu topluca
  güçlendirmeden önce uzun maçlar ve Anka'nın bir kez geri getirdiği
  toplam CAN ölçülür.
- **Güç destekleri:** Güçlendirici vuruş, Hedefleme tempo, Aşırı Hızlandırıcı
  ısı karşılığı seçili ağır kart, Kronos yükseliş/borç, Hassas Matris aynı
  hedefe odaklanma, Omega farklı sınıflı devre içindir. Paylaşılan toplam
  destek bütçesi korunur. Omega'nın sıradan Güçlendiriciden pahalı/ender
  olduğu halde fiilen daha az iş yaptığı kurulumlar ayrıca ele alınır;
  her destek aynı koşulsuz çarpan olmaz.
- **Sistem:** Batarya uzun süreli üretimdir; Kapasitör enerji üretmeden
  ani yükü taşır; Akım Dengeleyici tüketimi kısar. Dengeleyici'nin adı
  kurulum Akımı iadesi yaptığı izlenimi vermemeli. Küçük devrede %8 tasarrufun
  bir Batarya kadar üretim sağlamaması normaldir; büyük devredeki getirisi
  kendi 3 Akım ve hücre bedelini karşılamalıdır.
- **Sabotaj:** Beş kartın nihai görevleri yukarıdaki davranış tablosuna
  göre ayrılır. İlk deneydeki HP/maliyet değişimi bunu tek başına yapmaz.

## Karşılaştırma sonuçları

Gerçek savaş motoruyla, toplam **3.264 AI maçı** çalıştırıldı. Bütün 36 kartı
kapsayan 17 adet altılı deste, her farklı deste çifti için taraf değiştirme,
1/8/15. seviyeler, azami seviyede iki eşleşme tohumu ve yedi Çekirdek türü
kullanıldı. Her eşleşmede iki taraf aynı Çekirdek türünü taşıdı.

- **Mevcut:** Bu değerlendirmeden önceki yerel oyun; önceki Akım/ısı/Çekirdek
  düzeltmeleri dahil.
- **Yalnız eğri:** Taban kartlar aynı; CAN büyümesi %4,5, hasar büyümesi %4.
- **İlk tam aday:** 36 kartın taban tablosu, bu eğriler, kısa kontrol tavanı,
  normalize savunma ısısı, daha az Prizma dönüşümü ve daha az Soğutucu
  süre temizliği. Plazma ikincil vuruşu %35→60; Sürü salımı hedef başına
  %25→45. Süre tavanı Virüs hariç yaklaşık kendi çevriminin %55'idir.

| Varyant | Seviye | Maç | Maç süresi medyanı | Yok edilen modül ömrü medyanı | 240 sn sınırında bitmeyen |
|---|---:|---:|---:|---:|---:|
| Mevcut | 1 | 272 | 59.25 sn | 4.5 sn | 0 |
| Mevcut | 8 | 272 | 53.7 sn | 4 sn | 0 |
| Mevcut | 15 | 544 | 43 sn | 3.4 sn | 0 |
| Yalnız eğri | 1 | 272 | 59.25 sn | 4.5 sn | 0 |
| Yalnız eğri | 8 | 272 | 61.25 sn | 4.8 sn | 0 |
| Yalnız eğri | 15 | 544 | 55.55 sn | 4.6 sn | 0 |
| İlk tam aday | 1 | 272 | 78.1 sn | 6 sn | 0 |
| İlk tam aday | 8 | 272 | 76.75 sn | 6.4 sn | 2 |
| İlk tam aday | 15 | 544 | 62.95 sn | 5.4 sn | 0 |

Buradaki “yok edilen modül ömrü” yerleştirmeden yok oluşa kadar geçen
medyandır; bütün modülleri kapsar, yalnız tank veya ön hat ölçümü değildir.
240 sn sınırı motorun otomatik maç bitiş garantisi değil, bu testin sınırıdır.

Yeteneksiz, tarafsız tek hedef testinde 15. seviye Kuantum Topu için:

- Mevcut: 151 CAN hedef, **2 ana vuruş / 2,4 sn**.
- İlk aday: 259 CAN hedef, **4 ana vuruş / 7,9 sn**.

İyon aynı testte **2 vuruş / 3 sn → 4 vuruş / 8,2 sn** oldu.
Bu sonuç ağır vuruşa karşı karşılık süresi kazandırılabildiğini gösteriyor;
fakat adayın bütün deste dengesini kanıtlamıyor. Hedef CAN'ı da değiştiği
için sonucu yalnız silah hasarının düşmesine bağlamamak gerekir.

İlk tam adayın azami seviye matrisinde Onarım ağırlıklı deste %89,1,
Darbe/Füze ağırlıklı deste %87,5 kazandı; Hassas odak destesi %9,4 ve
Sürü destesi %21,9'da kaldı. Orta seviyedeki iki Darbe/Onarım eşleşmesi
240 sn sınırında bitmedi. **Bu nedenle ilk aday yayıma alınacak denge
paketi olarak reddedildi.** Yalnız CAN artırmanın başarı ölçütü olamayacağı
bu deneyde açıkça görüldü.

Bu oranlar belirli AI politikasının ve 17 hazırlanmış destenin sonuçlarıdır.
Tek bir kartın bağımsız kazanma oranı veya gerçek oyuncu metasının tahmini
değildir. Deste içindeki kartların birlikte görünmesini kartın tek başına
gücüyle karıştırmıyorum.

## Kararım ve uygulanacak sıranın tasarımı

**36 kartın bugünkü dengesi yeterli değil.** Önceki iki/ağır silah odaklı
müdahale de bunun tamamlandığı anlamına gelmiyordu. Ben bütün hasarları
körlemesine düşürmez, bütün CAN'ları tek seferde yükseltmezdim.

1. Önce sabotajın beş ayrı görevini ve hedeflenebilirlik kuralını düzeltirim.
   Susturulan modülün çalışmaması ile fiziksel olarak sahadan yok sayılması
   ayrı kararlar olmalı. Virüs CAN kaybettirirken hedef çalışabilmeli.
2. Seviye eğrilerini yakınlaştırırım; korumasız hedefe ağır silahla yaklaşık
   3–5 vuruşluk alanı, düşük/yüksek seviye ve yetenek dallarında doğrularım.
3. Soğutucuyu termal role, Bariyer'i kontrol karşı hamlesine oturturum.
   Ağır silah normal kullanımda ilk birkaç atışında Soğutucu istememeli;
   uzun ateş ve hızlandırma kurulumunda Soğutucu değerli kalmalı.
4. Saldırıları rol bazında ayarlarım. Darbe ve Füze'nin aynı anda aşırı
   ucuzlamasını/güçlenmesini geri çeker; Sürü'nün enerji/ısı verimini,
   Ray–İyon ayrımını ve Tekrarlayıcı'nın yankı bütçesini tekrar ölçerim.
5. Savunma/onarımın birlikte aldığı süreyi ve enerji geri dönüşünü ölçerim.
   Tank CAN'ı artırırken onarıcıları ve Anka'yı aynı anda koşulsuz
   güçlendirmem. İlk adayda oluşan uzun eşleşmeleri çözmeden sayıları
   dondurmam.

Bu sıra mekaniklerin birbirine bağımlılığından çıkıyor. Rol davranışları
değişmeden sayısal tabloyu “son denge” diye
oyuna yazmak, ölçülen sorunları başka kartlara taşır. Bu turda teslim edilen
sonuç tam modül denetimi ve somut tasarım kararıdır; uygulama/dağıtım değildir.

## Kanıt, yöntem ve sınırlar

- Araç: `tools/audit_module_balance.py`.
- Sayısal deney: `docs/MODUL_DENGE_ADAYI_20261027.json`.
- Kanıt: `artifacts/module-balance-audit-20261027/` altında `inventory.json`,
  `single-target-lab.json`, `mechanics-lab.json`, `matches.json`, `summary.json`.
- 324 envanter satırı: 36 kart × 3 seviye × 3 varyant.
- 66 tek hedef deneyi: 11 saldırı × 2 seviye × 3 varyant.
- 168 adet 90 sn mekanik deneyi: 88 termal, 80 kontrol karşılaştırması.
- Maçlarda modül yetenekleri mevcut deterministik AI seçimiyle açık;
  Çekirdek güçleri mevcut AI koşullarıyla kullanılıyor. Çekirdek yetenek
  dalları seçilmedi. Bütün yetenek kombinasyonları ve çapraz seviye
  eşleşmeleri taranmadı.
- İzole kontrol deneylerinde HP çok yüksek tutuldu; termal deneyde karşı
  silahın hasarı kapatıldı. Bu düzenekler maç kazanma değil, ilgili
  mekanizmayı ölçer. Karşı modül eklemek temizlemenin yanında hedef
  dağılımını da değiştirir; karşılaştırma saf temizleme katsayısı değildir.
- Maçların 49 komut reddi ayrıca incelendi: 43'ü geçici boş/uygun hücre
  bulunamaması, 6'sı bütün devre tam CAN iken Onarım gücünün korunması.
  Bunlar eksik/geçersiz test komutu şeması değildir. Ölümlerden sonra 3 sn
  hücre enkazı ve aynı adımda onarım planlaması sonucu etkileyebilir.
- Gerçek oyuncu davranışı, bütün yerleşimler, tüm yetenekler, mobil
  performans veya canlı kazanma oranları için doğrulama iddiası yoktur.

Çalıştırma:

```powershell
python tools/audit_module_balance.py --quick
python tools/audit_module_balance.py --workers 4
python tools/audit_module_balance.py --mechanics --variants baseline roles
```

Kaynak incelemesi: `arena_canon.py` (seviye eğrileri),
`game/catalog.py` (fiili tanımlar), `game/operations.py` (tam susturma),
`game/combat.py` (hedef seçimi), `game/sabotage.py` (süreler),
`game/support.py` (onarım/soğutma), `game/module_cycles.py` (blok/dönüşüm),
`game/energy.py` ve `game/heat.py` (işletim bütçeleri).
