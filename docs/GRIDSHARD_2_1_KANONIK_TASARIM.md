
## 1. Yeni ürün omurgası

GRIDSHARD dikey telefonda oynanan, gerçek zamanlı ve sunucu otoriteli bir PvP oyunudur. Oyuncu savaş öncesinde **6 modüllük Savaş Destesi** ve **1 Çekirdek** seçer. Savaş başladıktan sonra simülasyon hiçbir seçim nedeniyle durmaz. Savaş alanı **5 sütun × 3 satırdan oluşan 15 hücrelik devre tahtasıdır**. **2. satır 3. hücre Çekirdek için sabit ve rezerve merkez hücredir**; bu nedenle oyuncunun modül yerleştirebildiği aktif hücre sayısı **14** olur. Bu merkez yerleşim değiştirilemez.

Savaş içinde oyuncu deste rafındaki bir modüle dokunur. Yeterli **Akım** varsa sunucu modülü oyuncunun devre kartındaki uygun boş hücrelerden birine deterministik-rastgele biçimde yerleştirir. Aynı karttan maç içinde birden fazla savaş örneği üretilebilir. Modül kartı tüketilmez.

### Sabit kararlar

- 6 modül kartı + 1 çekirdek.
- Modül rafı tek sıra ve başparmak erişimli.
- Savaş alanı **5 sütun × 3 satır = 15 toplam hücre** düzenindedir.(bu karar gözden geçirilebilir)
- **2. satır / 3. hücre merkez Çekirdek hücresidir ve modül yerleşimine kapalıdır; kalan 14 hücre modül yerleşimi içindir.**
- Devre kartı hücreleri oyun kuralı bakımından eşdeğerdir; **özel hücre, sınıf mührü, kapı yazısı ve hücre içi metin yoktur**.
- Hücreler arasındaki **kablo ağı ve hareketli Akım animasyonu GRIDSHARD görsel kimliğinin kalıcı parçasıdır**.
- Modül kartı görsellerinde **port noktaları bulunmaz**.
- Modüller devreye yerleştiği anda Çekirdekten gelen enerji ağına **otomatik bağlanır ve otomatik enerji alır**; port yönü, port sayısı ve bağlantı doğrulaması yoktur.
- Bir modül parçalandığında bulunduğu hücre **3 saniye boyunca Enkaz durumuna** geçer. Enkaz süresince hücre yeni modül yerleşimine kapalıdır; savaş ve diğer hücrelerdeki akım/enerji akışı kesintisiz devam eder. Süre sonunda enkaz otomatik temizlenir ve hücre yeniden uygun yerleşim havuzuna katılır.
- **Jeneratör zorunluluğu kaldırılmıştır.** Jeneratör artık Çekirdekten önce gereken temel enerji kaynağı değildir.
- Çekirdek savaşın ana enerji üreticisidir; **Çekirdek seviyesi yükseldikçe enerji üretimi artar**.
- Eski **Enerji sınıfı** adı ve bağlantı/dağıtım rolü kaldırılır; bu stratejik alan bundan sonra yalnız **Sistem sınıfı** olarak adlandırılır.
- Dağıtıcı yalnız eski port topolojisine hizmet ettiği için katalogdan çıkarılmıştır; Jeneratör ve Enerji Sömürücü de katalogda yoktur. Katalog 36 modül + Çekirdektir.
- Savaş kartına dokunma → uygun rastgele boş modül hücresine yerleşme.
- Saldırı kartları boş hücre ve Akım elverdiği sürece tekrar üretilebilir. Savunma, Destek, Sistem ve Sabotaj kartlarında aynı tanımdan en fazla **2**, aynı sınıftan en fazla **3** aktif kopya bulunabilir.
- Saldırı dışı aktif modül sayısı, aktif Saldırı modülü sayısını en fazla **2** aşabilir. Böylece dolu bir devre yalnız iyileştirme/savunma yığınına dönüşmez.
- Maç normal süre veya toplam hasar üstünlüğüyle bitmez; galibiyet için rakip **Çekirdeğin CAN değeri sıfıra düşmeli** ya da rakip savaştan çekilmelidir.
- Savaş ekonomisinin yerleştirme kaynağı **Akım**dır. Enerji ise sahadaki modüllerin sürdürülebilir çalışma kapasitesini belirleyen ayrı savaş sistemidir.
- Çekirdek, savaş sırasında zamanla dolan aktif güce sahiptir; dolum görseli merkez Çekirdeğin üzerinde/çevresinde görünür, hazır olduğunda Çekirdek parlar.
- Çekirdek gücü tetiklendiğinde etki, merkezden kablo ağı boyunca yayılan bir enerji dalgası/akım animasyonuyla tüm devreye uygulanır.
- Modül yükseltmeleri kalıcıdır ve yeni seviyede gerçek istatistik farkı üretir.
- Arena ve kupa ilerlemesi yeni modül ve çekirdek erişimini açar.

## 2. Kaynaklar

| Kaynak | Tür | Kullanım |
|---|---|---|
| **Akım** | Maç içi | Modül yerleştirme maliyeti |
| **Devre Kredisi** | Kalıcı soft currency | Modül yükseltme, günlük teklifler, temel ekonomi |
| **Akı** | Kalıcı gelişim kaynağı | Modül yetenekleri, çekirdek yükseltme/yetenekleri |
| **Modül Parçası** | Kart-bazlı | İlgili modülün seviye yükseltme şartı |
| **Çekirdek Parçası** | Çekirdek-bazlı | Çekirdek seviye yükseltme şartı |

**Eski `coins` alanı ürün arayüzünde kaldırılacak; kalıcı veri geçişinde yalnız uyumluluk amacıyla tutulabilir.**

## 2.1. Çekirdek enerji üretimi ve Enerji Baskısı

Çekirdek, savaş alanındaki tüm modüllerin temel enerji kaynağıdır. Enerji üretimi ve tüketimi, **Akım** yerleştirme kaynağından tamamen ayrıdır. Beta.72 ile enerji iki biçimde harcanır:

- **Aksiyon enerjisi:** Saldırı, onarım ve sabotaj modülleri enerjiyi işi yaptıkları anda öder. Enerji yetmezse yalnız o modül görünür biçimde bekler (`action_energy_waiting`, kartta ϟ rozeti); bekleme süresi boşa gitmez ve enerji biriktiği adımda eylem gerçekleşir.
- **Bakım enerjisi:** Kalkan, Zırh, Yansıtıcı, Bariyer, Soğutucu, Güçlendirici gibi sürekli sistemler saniyelik küçük bir bakım öder. Dağıtım bakımın yarısını bile karşılayamazsa bu sistemler kapanır.

Aksiyon enerjisi sırasıyla Çekirdek rezervinden, Kapasitörden (aksiyon başına en fazla 10) ve Bataryadan (aksiyon başına en fazla 4) karşılanır.

**Enerji sırası (Beta.72 tur 12):** enerjisi yetmeyen aksiyon sıraya girer. Sonradan gelen aksiyon ancak sırada önünde bekleyenlerin payı da kalıyorsa ödenir; böylece sık ve ucuz aksiyonlar (Lazer, Dron) ağır atışları (Ray Topu, Kuantum Topu) sonsuza kadar bekletemez, enerji darlığı bütün modülleri orantılı yavaşlatır. Yeniden denemeyi bırakan modül (hedefi kalmayan, susturulan, aşırı ısınan, yok edilen) sıradaki yerini bir sonraki adımda bırakır. Füze/Plazma kilidi enerji beklerken korunur.

Çekirdeğin temel enerji parametreleri:

- `energy_per_second`: saniyelik enerji üretimi (dağıtım verimi %90).
- `energy_capacity`: Çekirdek rezervi; ani aksiyon maliyetlerini karşılar.
- `core_charge_rate`: Çekirdek aktif gücünün dolum hızı.

Beta.72 başlangıç değerleri:

- Çekirdek Seviye 1: **9 enerji/sn** (Beta.72 tur 12'ye kadar 12, tur 12–13'te 5,5), **24 enerji rezervi**; maç 16 enerjiyle başlar.
- Enerji üretimi seviye başına **%3 bileşik** artar; rezerv seviye başına **+1** artar.
- Batarya: saniyede **4,5** enerji üretir (tur 14'e kadar 3), **20** enerji depolar; devrede aynı anda en fazla **2** Batarya olur. Kapasitör: enerji üretmez, **10** enerjilik hızlı rezervdir. Akım Dengeleyici: aksiyon ve bakım maliyetlerini **%8** azaltır, çoklu kopyada en fazla **%24**.

Tur 12'de değer AI–AI denge simülasyonuyla 12 → 5,5'e indirildi: AI maçlarında tahtada aynı anda ~3–4 modül yaşıyor, 12'de üretilen enerjinin %62'si boşa gidiyordu. Tur 14'te oyuncu maçı bunun yetersiz bir ölçü olduğunu gösterdi: oyuncu Akım'ı hemen harcayıp kaybettiğini yeniden kurar, tahtası 7–14 modüle çıkar. Oyuncunun 192 sn'lik maç kaydında (Darbe Topu destesi) 60. saniyeden sonra her 15 saniyede 13–37 eylem enerji bekledi, 2 Batarya kurulduktan sonra da sürdü. Bu yüzden değerler oyuncu gibi yerleştiren, kaybını yeniden kuran tahta simülasyonuyla seçildi (Çekirdek ve Batarya için 5,5/3, 7/5, 8/4, 8/4,5, 8,5/4,5, 9/4, 9/4,5 denendi):

| Devre (Seviye 1) | 5,5 / Batarya 3 | **9 / Batarya 4,5** |
|---|---|---|
| 7 modül, Darbe Topu ağırlıklı, Bataryasız | eylemlerin ~%57'si bekler | **~%6** |
| 12–14 modül, 2 Batarya (6 Darbe Topu + Soğutucu, Onarım, Kalkan, EMP) | ~%37–43 | **~%0–6** |
| 12 modül, tek Batarya | ~%58 | **~%22** |
| 13 modül, Bataryasız | ~%79 | **~%56** |

Darlık tahta büyüdükçe başlar: küçük ve orta devre Çekirdekle döner, büyük devrenin çözümü iki Bataryadır. Maç başındaki 16 enerjilik rezerv ilk çatışmayı karşılar. Çekirdek seviyesi üretimi (%3), modül seviyesi Batarya üretimini (%3,5) artırdığı için yüksek seviyede açık azalır. AI maçlarında (tahtada ~3 modül) enerji artık neredeyse hiç beklemez, üretimin ~%57'si boşa gider; arena botlarının arketip kazanma oranları ±3 puan içinde kaldı, uzun kilitlenen maçlar kalktı (oyuncu vekiline karşı p90 süre 186 → 96 sn). Böylece Sistem kartları büyük devrenin kararı olur: oyuncu ham saldırı gücüyle birlikte enerji sürdürülebilirliğini planlar.

### Aksiyon enerjisi ve bakım değerleri

| Modül | Aksiyon enerjisi | Modül | Bakım (enerji/sn) |
|---|---:|---|---:|
| Lazer | 1,2 | Kalkan | 0,8 |
| Dron Üssü | 1,0 | Yansıtıcı | 0,6 |
| Kuantum Tekrarlayıcı | 2,8 | Bariyer, Zırh, Faz Zırhı | 0,5 |
| Ark Topu | 3,5 | Koruyucu Kubbe, Prizma Kalkanı | 1,0 |
| Füze Fırlatıcı | 4,5 | Soğutucu | 0,25 |
| Darbe Topu | 5,0 | Güçlendirici, Hedefleme Bilgisayarı, Akım Dengeleyici | 0,4 |
| Plazma Havanı | 5,5 | Aşırı Hızlandırıcı, Omega Güçlendirici | 0,8 |
| Ray Topu | 6,0 | Kronos Rölesi | 0,7 |
| İyon Mızrağı | 7,0 | Hassas Matris | 0,6 |
| Kuantum Topu | 8,0 | | |
| Onarım / Nano Medik / Anka Onarımı | 2,5 / 3,0 / 5,0 | | |
| EMP, Virüs | 6,0 | | |
| Sinyal Bozucu | 5,0 | | |
| Kesici, Tekillik Projektörü | 8,0 | | |

### Enerji darlığı

Eski devre çapındaki gizli hız/hasar cezası kaldırıldı. Enerji darlığı yalnız görünür biçimde ortaya çıkar: bekleyen aksiyonlar ve kapanan sürekli sistemler. Savaş hiçbir enerji durumunda pause olmaz.

### Isı (Beta.72 tur 12)

Isı yüzdedir (%0–100) ve **Çekirdek ile Soğutucu dışındaki bütün modüller** için geçerlidir. Tur 12 öncesinde yalnız saldırı modülleri ısınıyordu, eşikler 70/100 (en fazla 120) idi ve tek Soğutucu (iki modüle saniyede 8) ısıyı tamamen siliyordu; maç boyunca yavaşlama ya da susma görülmüyordu.

**Isının etkisi — kademeli yavaşlama:**
- Isı **%40'ın üzerinde her tam %5** arttığında modül %5 yavaşlar: saldırı, onarım ve sabotaj modüllerinin **eylem aralığı** uzar (%45'te ×1,05, %70'te ×1,30, %95'te ×1,55). Hasar düşmez; ceza yalnız tempodadır.
- Sürekli çalışan sistemlerin (savunma, destek, Batarya/Kapasitör, Akım Dengeleyici) **etkisi aynı oranda** düşer: etki ÷ aralık çarpanı (%70'te %23, %95'te %35 zayıf). Batarya üretimi ve depo boşaltması, Kalkan azaltımı, destek payları bu kurala uyar.
- **%100 (Aşırı Isınma):** modül 5 CAN hasar alır ve ısısı **%70'in altına inene kadar susar** (saldırmaz, onarmaz, sabote etmez, korumaz, destek vermez, enerji üretmez/boşaltmaz, bakım ödemez). Susarken üç kat hızlı soğur (~8 sn). Susmuş modül hedeflenebilir kalır.

**Isı kaynakları — çalışan her modül ısınır:**
- **Eylem:** her saldırı, onarım ve sabotaj eylemi `1,2 × temel bekleme süresi (sn) + 2,2 × aksiyon enerjisi` ısı üretir (Lazer %3,8, Darbe Topu %14, Ray Topu %17, Kuantum Topu %20,6, Onarım %7,9, EMP %20,4; Anka dirilişi 10 enerjiyle hesaplanır). Hızlandırılmış modül daha sık çalıştığı için daha hızlı ısınır.
- **Bakım:** sürekli sistemler aldıkları bakım enerjisinin 1,5 katı ısınır. Tek başına pasif soğumayı ancak aşar (Koruyucu Kubbe, Prizma Kalkanı yavaşça); asıl yük işten gelir.
- **Engellenen hasar:** savunma modülü engellediği her 10 hasar için %2,5 ısınır (yoğun ateş altındaki Kalkan ısınıp zayıflar).
- **Depo boşaltması:** Batarya ve Kapasitör depodan verdikleri her 10 enerji için %12 ısınır.
- **Aşırı Hızlandırıcı:** hedefine saniyede %1,5 ek ısı ekler.
- Pasif soğuma saniyede **%1,2**'dir (susmuşken %3,6).

Değerler AI–AI denge simülasyonuyla seçildi: saldırı modülünün ömrü medyan ~9 sn, ortalama ~22 sn olduğu için ısı bu sürede hissedilmelidir. **Soğutulmayan, sürekli ateş eden saldırı** (tam enerjiyle): %45 eşiği Kuantum Topu ~5 sn, İyon Mızrağı ~6 sn, Darbe Topu ~7,5 sn, Ray Topu ~10 sn, Füze ~12 sn, Lazer ~16 sn; susma Kuantum Topu ~14 sn, İyon Mızrağı ~21 sn, Darbe/Ray Topu ~25 sn, Füze ~34 sn, Lazer ~47 sn. Aşırı Hızlandırılmış Darbe Topu ~16 sn'de susar. Güncel bot desteleriyle simülasyonda saldırı zamanının ~%37'si yavaş, ~%11'i susmuş geçer; maç başına ~3,4 susma olur (Soğutucusuz eski destelerle ~6). Enerji darlığı atış sayısını azalttığı için ısınmayı da yavaşlatır; Batarya eklemek daha çok atış, dolayısıyla daha çok ısı demektir: güçlü deste ikisini birlikte kurar.

- **Soğutucu:** yerleşimden bağımsız olarak önce aşırı ısınıp susmuş modülleri, sonra devredeki en sıcak modülleri seçer; **en fazla üç modülü saniyede %4,5** soğutur (susmuş modülde iki kat; havalandırmayla birlikte ~2,5 sn'de toparlar). Tek Soğutucu iki-üç orta saldırıyı %45'in altında tutar. Simülasyonda Soğutucusuz destelerin saldırı zamanının ~%69'u yavaş ya da susmuş geçerken Soğutuculu destelerde ~%30; Soğutuculu destelerin kazanma oranı %58, Soğutucusuzların %37. Kendisi ısınmaz. EMP ve hat kesintisi sürelerini de en fazla üç modülde kısaltır.
- **Aşırı Hızlandırıcı:** devredeki en ağır (aksiyon enerjisi en yüksek) saldırı modülünü seçer; hasar ×1,2 ve bekleme ×0,8 verir, hedefe saniyede %1,5 ek ısı ekler. Birden fazla Aşırı Hızlandırıcı farklı hedefler seçer; aşırı ısınan hedef bırakılır ve sıradaki ağır saldırıya geçilir.
- **Arayüz:** kartın üst kenarındaki ısı barı yüzdedir; %40 ve %70 çentiklidir, %45'ten itibaren yavaşlama rengi ve açıklaması ("Atış aralığı +%20", sürekli sistemlerde "Etki −%17") gösterilir.
- **Yapay zekâ:** iki ve üzeri modülü ısınan AI desteyse Soğutucu basar; enerji yükü %100'ü aşınca Batarya'yı öne alır.
- **Bot desteleri (tur 12, denge simülasyonuyla):** ≥2 ağır saldırılı ya da Aşırı Hızlandırıcılı 40 bot destesine Soğutucu, aksiyonları zamanın ≥%20'sinde enerji bekleyen 17 desteye Batarya eklendi (51 deste; toplam Soğutuculu deste 34 → 74, Bataryalı 48 → 65). Çıkarılacak kart, botun arenasındaki kazanma oranını en az değiştiren seçenekti; Soğutucu, Batarya, Akım Dengeleyici ve Aşırı Hızlandırıcı çıkarılmadı, arketip kimliği (ör. Kontrol'ün sabotaj kartları) korundu. Yerel AI arketiplerinde Saldırgan ailesine Soğutucu (Güçlendirici yerine), Dengeli ve Savunmacı ailelerine Batarya (Kalkan / Zırh yerine) verildi (tur 14'te Savunmacı ailesinde Batarya yerine Darbe Topu). Oyuncu vekiliyle ölçüm: sistemleri kullanan oyuncuya karşı botların kazanma oranı %20 → %14, Soğutucu ve Batarya kullanmayan oyuncuya karşı %22 → %28 (arena 1–4'te %26 → %40).
- **AI arketipleri (tur 13):** hiç kazanamayan Sabotaj Odaklı ve Ekonomi Odaklı kaldırıldı; yerine sınıf eğilimi olmayan, Dengeli davranışla oynayıp destesinde sabotaj ve ekonomi kartı taşıyan **Dengeli Kontrol** (Lazer, Darbe Topu, Batarya, Soğutucu, EMP, Sinyal Bozucu) ve **Dengeli Ekonomi** (Lazer, Darbe Topu, Batarya, Akım Dengeleyici, Kalkan, Sinyal Bozucu) geldi. Tema yalnız "en az bir kopya" tabanıyla korunur; tema kartına verilen küçük bir öncelik bile AI'yi saldırı kurmadan kilitliyordu. Kontrol ve Akım Ekonomisi arena botları da bu davranışla oynar.
- **Savunmacı ailesi (tur 14):** enerji bollaşınca tek saldırı kartlı Savunmacı / Sürdürülebilirlik destesi (Lazer, Kalkan, Batarya, Bariyer, Onarım, Soğutucu) yalnız enerjisi tükenen rakibi yenebildiği ortaya çıktı (oyuncu vekillerine %50 → %1). Batarya yerine Darbe Topu geldi (Lazer, Darbe Topu, Kalkan, Bariyer, Onarım, Soğutucu; genişleme Bariyer, Onarım, Soğutucu); davranış ayarları aynı. Sonuç: Savunmacı %50, Sürdürülebilirlik %48.

### Enderlik ve imza mekanikleri (Beta.72)

Enderlik gizli güç vermez; aynı seviyedeki kartlar aynı çarpanı alır. Enderlik kartın mekanik kimliğini belirler: Yaygın tek iş, Nadir bir koşul, Destansı zamanla biriken durum ya da risk–ödül, Efsanevi savaşın bir kuralını değiştiren imza. İmza kartları ailesinin davranışını ve karşılıklarını korur (Prizma Kalkanı hâlâ bir Kalkan'dır); imza bunun üstüne eklenir. Destekler yerleşimden bağımsız olarak tüm devrede çalışır ve bir saldırı yalnız en güçlü tek desteği kullanır.

| Kart | İmza mekaniği |
|---|---|
| Ray Topu / İyon Mızrağı | Savunma azaltımının %40 / %60'ını deler; İyon Mızrağı arka hedefe %55 taşar |
| Füze Fırlatıcı / Plazma Havanı | Ateşlemeden önce 0,7 / 1,2 sn kilit; kilit saldırı aralığının içindedir, hedef değişirse baştan başlar; Plazma %35 sıçrar |
| Dron Üssü / Ark Topu | Sıradaki hedefe %25 / %45 ikincil vuruş |
| İkincil vuruşların tamamı | Hedefin savunması, Kubbe ve karşılık kurallarından geçer |
| Kuantum Tekrarlayıcı | Aynı hedefe 4. ardışık vuruşta son hasarın %65'i kadar yankı |
| Sürü Fabrikası | Her atışta dron biriktirir; 4. atışta üç hedefe (her birine %25) sürü |
| Kuantum Topu | Devrenin boşa giden enerjisini (rezerv ve depolar doluyken) 30'a kadar yük olarak toplar; yük sıradaki atışa %80'e kadar hasar ekler |
| Koruyucu Kubbe | Kendisi %32 azaltır; yaşadığı sürece diğer modüllere gelen hasar %12 azalır |
| Faz Zırhı | Her 6 sn'nin ilk 1 sn'sinde saldırıları tamamen boşa çıkarır; diğer anlarda %18 azaltır |
| Prizma Kalkanı | %30 azaltır; engellediği hasarın dörtte birini Çekirdek rezervine ekler |
| Nano Medik | En yaralı iki modülü temel onarımın %62'si kadar onarır |
| Anka Onarımı | 30 sn'de bir, 10 enerjiyle, sınıf/kopya/saha sınırlarından geçerek yok edilmiş bir modülü %30 CAN ile geri getirir; her modül maçta bir kez; aday yoksa ×1,15 tek hedef onarım |
| Güçlendirici / Hedefleme Bilgisayarı | Tüm saldırılara hasar / bekleme desteği: toplam %30 pay saldırı sayısına bölünür, tek saldırıya en fazla %15 |
| Aşırı Hızlandırıcı | En ağır saldırıyı seçer; bonus ve ısı yalnız hedefe gider |
| Kronos Rölesi | 4 sn tüm saldırılar hızlanır (bekleme ×0,72), ardından 2,5 sn borç (bekleme ×1,18, hasar ×0,95); borç başka destekle atlatılamaz |
| Hassas Matris | Aynı hedefe art arda vuran saldırı 4 kademeye kadar kademe başına +%4 hasar, -%3 bekleme |
| Omega Güçlendirici | Devredeki her farklı sınıf paylaşılan hasar payına %8 ekler (en fazla 5 sınıf); tek saldırıya en fazla %20 |
| Virüs | 4 hasarla başlar, her tikte 2 artar (6 sn'de 54) |
| Kesici / Tekillik Projektörü | 3,5 / 4,5 sn kesinti; ikinci bir sisteme %50 / %65 süreli yankı. Sabotaj kartları saldırı döngüsüne girmez |

### İmza görünürlüğü: efekt, rozet, sarsıntı ve ses

Her imza sahada okunur olmalıdır; görsel yalnız motorun gerçekten ürettiği olaydan doğar, istemci kendi başına imza tetiklemez.

- **Kart rozetleri** (kartın sol altı, CAN çubuğunun üstü; en fazla 2): Kuantum Tekrar `↻n/4`, Sürü deposu `✥n/4`, Kuantum yükü `◎%`, Füze/Plazma kilidi `⌖`, Kronos `⧗+` / borç `⧗−`, Faz penceresi `FAZ`, Omega kategori sayısı `Ωn`, Hassas odak `⊕n`, Anka ile dirilmiş `✦`. Canlı durum rozetleri (ısı, enerji bekliyor, olumsuz etki) sağ üstte kalır. Sunucu rozeti yalnız görünür durumdan üretir ve milisaniye sayacı göndermez.
- **Efektler:** hale + halka + parçacık, gerekirse kaynaktan hedefe bağ ışını ve kısa etiket (YANKI, ÇÖKÜŞ, SÜRÜ, DİRİLİŞ, PRİZMA, TEKİLLİK, KRONOS, BORÇ, FAZ, KİLİT, İMHA). Kilit telgrafı gerçek hazırlık süresi kadar görünür; rakip bu sürede hedefin ne olduğunu okuyabilir. Aynı anda çok efekt varsa önceliği düşük olan (yankı, ikincil vuruş, borç) önce atlanır; Grafik ayarı Orta/Düşük bütçeyi küçültür.
- **Arena sarsıntısı:** hafif (imza vuruşu, rakip çekirdeğe ağır vuruş), orta (modül düştü, kendi çekirdeğine ağır vuruş), ağır (dolu Kuantum çöküşü), çekirdek (çekirdek yıkımı). Hareket azaltma tercihinde sarsıntı yerine kısa parlama kullanılır. Titreşim ayarı açıksa orta ve üstü sarsıntı cihazı titretir.
- **Okunabilirlik:** rozet ve efekt yazıları opak koyu zeminde (`#06111f`) açık renktir; en düşük kontrast 9,3:1. Renk tek başına anlam taşımaz, her rozetin simgesi ve açıklama başlığı vardır.
- **Ses:** imza ipuçlarının kendi adları vardır (`quantum_charge`, `repeat_echo`, `swarm_release`, `phoenix_revive`, `prism_shield`, `phase_evade`, `singularity_field`, `sabotage_echo`, `omega_link`, `chrono_shift`, `target_lock`, `nano_pulse`, `kill_confirm`, `module_lost`) ve imza saldırı kartları kendi atış ipucunu kullanır. Adlar mevcut ses dosyalarına bağlanır; yeni dosya eklenince yalnız eşleme değişir. Aynı ipucu 160 ms'den sık çalmaz.

### Sistem sınıfının yeni rolü

Eski Enerji sınıfı kaldırılır; bu rol port/dağıtım mantığından ayrılarak Çekirdek ekonomisini yöneten **Sistem sınıfı** adıyla yeniden tanımlanır. Örnek roller:

- **Kapasitör:** maksimum enerji kapasitesini artırır.
- **Akım Regülatörü:** sahadaki modüllerin enerji tüketimini yüzdesel azaltır.
- **Süperkapasitör:** belirli aralıklarla enerji darbesi/rezervi sağlar.
- **Enerji Geri Kazanım Modülü:** düşman modülü yok edildiğinde enerji geri kazandırır.
- **Acil Rezerv:** enerji düşük eşiğe indiğinde kısa süreli Çekirdek üretim artışı sağlar.

Bu sınıfın amacı tam saldırı destelerini yasaklamak değil, enerji ekonomisini önemseyen dengeli destelere sürdürülebilirlik avantajı vermektir.

### Sistem sınıfı V1 dengeleme hedefleri

Aşağıdaki değerler **kanonik başlangıç denge hedefidir**; Beta.42H simülasyonu ve telemetri sonucunda kalibre edilebilir:

| Sistem modülü | V1 temel etki | Enerji tüketimi / sınır | Denge amacı |
|---|---|---|---|
| **Kapasitör** | **10** enerjilik hızlı rezerv; açıkta Bataryadan önce boşalır | Bakım yok; üretim yapmaz | Ağır aksiyon dalgalanmalarını yumuşatır; kalıcı üretim sağlamaz |
| **Akım Dengeleyici** | Aksiyon ve bakım maliyetleri **-%8** | **0,4** bakım; çoklu kopyada en fazla **-%24** | Tam saldırı destelerine bedelsiz çözüm olmadan verim kazandırır |
| **Süperkapasitör** | Her **12 sn** bir **+30 enerji** rezerv darbesi | Pasif üretim yerine aralıklı destek | Kısa saldırı pencereleri ve toparlanma sağlar |
| **Enerji Geri Kazanım Modülü** | Düşman modülü yok edildiğinde **+15 enerji** | Tetik başına; zincirleme kazanım için iç cooldown uygulanabilir | Agresif fakat başarılı oyunu enerjiyle ödüllendirir |
| **Verimlilik Çipi** | Sahadaki en yüksek tüketimli **3 modülün tüketimini -%12** azaltır | Etki hedef sayısıyla sınırlı | Ağır modülleri destekler ama bütün devreyi bedelsiz ucuzlatmaz |
| **Acil Rezerv** | Enerji stoğu **%20 altına** indiğinde Çekirdek üretimi **5 sn +%50** | **20 sn cooldown** | Kriz anında toparlanma; sürekli üretim motoruna dönüşmez |

Sistem modüllerinin ortak denge ilkeleri:

- Sistem kartları doğrudan yüksek hasar üretmek yerine **enerji sürdürülebilirliği, rezerv, tüketim azaltma veya kriz toparlanması** sağlar.
- Aynı Sistem modülünün çoklu kopyaları izinlidir ancak yüzdesel global etkilerde **azalan verim / etki tavanı** uygulanır.
- Sistem kartı kullanmak bir deste yuvasından feragat anlamına geldiği için sağladığı ekonomi avantajı hissedilir olmalı; ancak tam saldırı destesinin enerji bedelini tamamen ortadan kaldırmamalıdır.
- Nihai hedef, 6 saldırı kartlı bir destenin yüksek saha doluluğunda Enerji Baskısına girebilmesi; en az bir Sistem kartı kullanan dengeli destenin ise daha uzun süre verimli çalışabilmesidir.

## 2.2. Enkaz hücresi kuralı

Bir modülün CAN değeri sıfıra düşüp modül parçalandığında hücre anında boş kabul edilmez. Hücre **3.0 saniyelik Enkaz** durumuna girer.

- Enkaz bulunan hücreye yeni modül yerleştirilemez.
- Enkaz, modül kartı değildir ve enerji tüketmez.
- Enkaz süresi savaş saatine bağlıdır; savaş hiçbir zaman durmaz.
- Süre dolduğunda enkaz otomatik temizlenir ve hücre tekrar rastgele yerleşim havuzuna eklenir.
- Enkaz sırasında kablo/akım görseli sahadan silinmez; yalnız hücre üzerinde parçalanma/enkaz geri bildirimi gösterilir.
- Aynı anda birden fazla hücre bağımsız Enkaz süresi taşıyabilir.

Bu 3 saniyelik pencere, parçalanan modülün yerine anında yeni kart basılmasını engelleyerek saldırı temposuna kısa fakat okunabilir bir karşılık penceresi üretir.

## 2.3. Maç bitişi, Devre Gerilimi ve destek yığılması

Maçın tek normal galibiyet koşulu rakip Çekirdeğin yok edilmesidir. Savaştan çekilme Akım cezası içermez; bedeli yalnız mağlubiyettir. **Hareketsizlik:** Süre sınırı olmadığı için bağlı ama kart basmayan oyuncu maçı sonsuza uzatamaz. Akım tavandayken (12) ve yerleşecek boş hücre varken 15 sn kart basmayan oyuncu uyarılır, 30 sn'de savaştan çekilmiş sayılır (`player_inactive`). İki taraf aynı tikte sınıra ulaşırsa maç berabere biter (`mutual_inactivity`). Tahtası dolu oyuncu hareketsiz sayılmaz. Toplam hasar, kalan modül sayısı veya kalan toplam CAN hiçbir zaman süre sonu hakemi olarak kazanan seçmez. İki Çekirdek aynı sunucu adımında yok edilirse maç berabere biter. Savaştan çekilme ayrı ve açık bir mağlubiyet koşuludur.

Savunma/onarım ağırlıklı devrelerin maçı sonsuza uzatmaması için `03:00` bir bitiş sınırı değil **Devre Gerilimi başlangıcıdır**:

- `03:00`: saldırı hasarı `×1.25` olur ve her 30 saniyede `+0.25` daha artar. Onarım verimi `×0.50` ile başlar, her 30 saniyede `0.10` azalır ve `×0.10` altına düşmez.
- Geçen süre Çekirdeği hiçbir zaman doğrudan hedefe açmaz ve Çekirdeğe otomatik hasar vermez. Saldırılar önce yaşayan savaş modüllerini, ardından varsa sistem hattını ve son olarak Çekirdeği hedefler.

Onarım Modülü, her bekleme süresi tamamlandığında yalnız **bir** hasarlı ve yaşayan modülü iyileştirir. Aynı sunucu destek adımında aynı hedef birden fazla Onarım Modülünden onarım alamaz. Aynı hedef aynı adımda birden fazla Soğutucu veya Aşırı Hızlandırıcı etkisi de alamaz. Bir Saldırı modülü komşu Güçlendirici, Hedefleme Bilgisayarı ve Aşırı Hızlandırıcı arasından yalnız en güçlü tek saldırı desteğini kullanır. Onarım Çekirdeği iyileştirmez, yok edilmiş modülü diriltmez ve Enkaz süresini kaldırmaz.

Can, enerji tüketimi veya bütün yardımcı kartların Akım maliyeti topluca ağırlaştırılmaz. Denge; sınıf/kopya sınırı, saldırı–yardımcı oranı ve aynı etkinin yığılmamasıyla kurulur. Verilen hasardan Akım üretimi kartopu etkisi yaratacağı için temel savaş ekonomisine eklenmez.

## 3. Modül yükseltme modeli

Tüm modüller **Seviye 1** başlar ve ilk ürün diliminde **Seviye 15** üst sınırına sahiptir.

Temel ölçekleme:

- Saldırı hasarı: `Temel Hasar × 1.05^(Seviye-1)`
- CAN: `Temel CAN × 1.03^(Seviye-1)`
- Destek ana etkisi: `Temel Etki × 1.035^(Seviye-1)`
- Kontrol ana etkisi: `Temel Etki × 1.03^(Seviye-1)`
- Bekleme süresi: her seviyede `×0.992`, fakat toplam düşüş %12'den fazla olamaz.

Bu sayede hasar odaklı bir modül Seviye 15'te taban hasarının yaklaşık **1.98 katına**, CAN ise yaklaşık **1.51 katına** çıkar. Artış hissedilir ancak tek başına iki katı aşan sınırsız snowball oluşturmaz.

Yükseltme şartı:

`Modül Parçası + Devre Kredisi`

Akı modül seviyesinde harcanmaz. Akı yalnız yetenek düğümleri ve çekirdek gelişiminde kullanılır.

### Yetenek eşikleri

- Yaygın: 5 / 8 / 11 / 14
- Nadir: 6 / 9 / 12 / 15
- Epik: 7 / 10 / 13 / 15
- Efsanevi: 8 / 11 / 14 / 15

Her düğüm tek bir açık avantaj yerine iki yönlü seçim sunacak şekilde tasarlanmalıdır. Böylece seviye yükseltmek yalnız sayısal büyüme değil, oyun tarzı seçimi de üretir.

## 4. Kart görünümü ve bilgi UX'i

Koleksiyon ve deste kart yüzünde modül adı/istatistik metni bulunmaz; modül görseli ve rarity çerçevesi ana kimliktir. Oyuncu karta dokunduğunda `Bilgi` ve `Seç` eylemleri açılır.

`Bilgi` görünümü:

- Modül adı
- Yaygınlık
- Rol
- Mevcut seviye / sonraki seviye
- CAN, hasar, bekleme süresi veya ana etki
- Savaş içi Akım maliyeti
- Savaş içi enerji tüketimi / saniye
- Açıldığı Arena
- Yetenek ağacı
- Eski hazırlık ekranındaki stratejik rol/açıklama

Savaş rafında oynanabilirlik için küçük **Akım simgesi + maliyet** rozeti gösterilebilir; koleksiyon kart yüzündeki sade görsel kuralı bozulmaz.

## 5. Deste düzenleme

Oyuncu tüm kayıtlı desteleri değiştirebilir.

- Boş yuva varsa `Seç` doğrudan ilk boş yuvayı doldurur.
- Deste doluysa `Seç` sonrasında: **“Deste dolu. Değiştirmek istediğin kartı seç.”** durumu açılır.
- Oyuncu destedeki kartı seçince atomik değişim yapılır.
- Desteden kart çıkarma, yeni seçim bekleyen boş yuva üretebilir.
- Aktif deste daima 6 farklı kart tanımından oluşur; maç içinde aynı karttan birden fazla örnek üretilebilir.
- Destede **en az bir saldırı kartı** bulunur. Sabotaj Çekirdeği hedefleyemediği için saldırısız iki deste maçı hiç bitiremezdi; kayıtlı saldırısız desteler ilk varsayılan saldırı kartını alır.

### Akım maliyetleri (Beta.72 R2)

Maliyet enderliği değil, simülasyonda ölçülen güç ve tempo değerini izler (2–6 Akım). R2 değişiklikleri: Lazer, Kalkan, Zırh, Onarım 2→3; Darbe Topu 3→4; Kuantum Tekrarlayıcı 4→5; İyon Mızrağı ve Kuantum Topu 5→6; Prizma Kalkanı ve Anka Onarım 5→4; Yansıtıcı, Sürü Fabrikatörü, Krono Rölesi, Aşırı Hızlandırıcı, Hassasiyet Matrisi 4→3; Omega Güçlendirici, Kesici, Tekillik Projektörü 5→3. Simülasyonda kart galibiyet oranı aralığı %37–62'den %41–59'a daraldı.

## 6. Arena ve kupa yolu

Yeni hesap 0 kupada başlar. 12 arena toplam 0–3599 kupayı kapsar. 3600 kupadan sonra Ligler başlar.

Her arenada **2 veya 3 yeni modül** açılır. Başlangıç eğitiminde 6 temel modül verilir; arena yolu bunun üzerine 30 modül daha açarak ilk hedef kataloğu **36 modüle** çıkarır.

Arena detay sayfası ana ekrandaki Arena alanına dokununca açılır ve dikey kaydırılan bir **Devre Yolu** gösterir. Yol üzerinde kupa eşikleri, ara ödüller, modül açılışları, çekirdek açılışları ve arena bitiş ödülleri görülür.

Tam tablo: `docs/ARENA_MODUL_ODUL_KANONU.md` ve `server/data/arena_progression_v1.json`.

## 7. Kupa hesabı

Önerilen V1:

- Galibiyet tabanı: +25
- Mağlubiyet tabanı: -20
- Her 100 kupa rakip farkı için 2 kupa düzeltme
- Düzeltme üst sınırı: ±8
- Galibiyet: +17…+33
- Mağlubiyet: -12…-28
- Beraberlik: 0
- Girilmiş arena tabanının altına düşülmez.

Örnek: 1000 kupalı oyuncu 1400 kupalı oyuncuyu yenerse yaklaşık +33; 1400 kupalı oyuncu 1000 kupalı oyuncuyu yenerse yaklaşık +17 alır.

## 8. Eşleştirme

Oyuncular **aynı Arena/Lig kademesi** içinde aranır.

| Bekleme | Kupa penceresi |
|---:|---:|
| 0–7 sn | ±100 |
| 8–15 sn | ±150 |
| 16–23 sn | ±200 |
| 24–31 sn | ±250 |
| 32 sn+ | Aynı kademeden AI fallback |

AI fallback gerçek oyuncu aramasını sonlandırır; bot aynı kademeye, kupa bandına ve erişilebilir modül havuzuna göre seçilir.

AI destesinin tamamını oynar: maç içinde daha önce basılan kartlar (ölmüş olsalar da) hafif ceza alır, aynı kart art arda basılmaz; sahada saldırı varken daha iyi kart birkaç saniye içinde alınabilecekse Akım biriktirir.

## 9. Bot havuzu

Her arena için 10 profil; toplam **120 AI oyuncu**. Her arena setinde 10 farklı arketip kullanılır: Dengeli, Hızlı Baskı, Ağır Hasar, Savunma, Sürdürülebilirlik, Kontrol, Destek Zinciri, Akım Ekonomisi, Alan Hasarı ve Karşı Meta.

Botlar:

- arena dışı kart kullanamaz,
- 6 kartlık farklı desteler kullanır,
- insan benzeri görünen adlara sahiptir,
- karar gecikmesi ve hata oranı taşır,
- mükemmel oynamaz,
- aynı arena içinde farklı güç ve tempo profillerine sahiptir.

Eşleştirme botunun modül yükseltme seviyesi, savaş başlatılırken oyuncunun **o maçta gönderdiği altılı destenin** ortalamasına (en yakın tam sayı, 0–14 yükseltme) eşlenir; eski kayıtlı hazır deste referans alınmaz. Çekirdek seviyesi oyuncunun maça bağlı Çekirdek seviyesiyle eşlenir. Modül CAN/hasar, Akım, enerji ve kompozisyon kuralları insanla ortaktır; AI'ye ayrı güç çarpanı verilmez. Aynı tick'te hazır saldırı ve sabotajlar iki taraf için etkiler uygulanmadan önce planlanır; oyuncu kimliğinin sıralaması ilk hamle avantajı sağlamaz.

Makine-okunur plan: `server/data/arena_bot_profiles_v1.json`.

## 10. Çekirdek sistemi

Savaş rafındaki `Ç` harfi kaldırılarak seçili çekirdeğin gerçek görseli kullanılır. Çekirdek savaş tahtasında **2. satırın 3. hücresinde sabit merkez unsurudur**. Görsel çevresindeki dolum halkası savaş boyunca zamanla dolar; hazır olduğunda Çekirdek belirgin biçimde parlar/pulse yapar. Oyuncu Çekirdeğe dokunduğunda aktif güç merkezden başlayarak kablo ağı ve Akım animasyonu üzerinden tüm devreye yayılır. Çekirdek aynı zamanda sahadaki modüllerin temel enerji üreticisidir; seviyesi yükseldikçe enerji üretimi artar.

İlk hedef çekirdekler:

| Çekirdek | Arena | Temel aktif güç |
|---|---:|---|
| Rezonans | 1 | Çekirdeği/tahtayı kurtarmaya yönelik onarım darbesi |
| Muhafız | 3 | Takım kalkanı |
| Aşırı Yük | 5 | Tüm dost hasarı +%25, 3 sn |
| Kesinti | 7 | Rakip destek/aktif etkilerini kısa kesme |
| Kapasitör | 9 | Kısa süreli Akım tempo avantajı |
| Anka | 11 | Kurtarma/iyileştirme |
| Kuantum | 12 | Üst düzey taktik esneklik |

Çekirdek seviyesi `Akı + Çekirdek Parçası` ile artar. Seviye artışı iki alanı birlikte geliştirir: **(1) pasif enerji üretimi/kapasitesi, (2) aktif Çekirdek gücü**. Örneğin Aşırı Yük Çekirdeği Seviye 1'de +%25 / 3 sn; her seviyede +1 yüzde puan hasar, her 3 seviyede +0.1 sn süre kazanır. Enerji üretimi ayrıca seviye başına yaklaşık %4 bileşik artış hedefiyle başlatılır ve denge simülasyonunda kalibre edilir.

### Çekirdek V1 dengeleme hedefleri

Çekirdek gelişiminin hem enerji ekonomisini hem de aktif gücü etkilediği kabul edilir. Başlangıç hedefleri:

- **Seviye 1 enerji üretimi:** **9 enerji/sn** (Beta.72 tur 14, oyuncu tahtası simülasyonuyla; tur 12–13'te 5,5, önceki hedef 12).
- **Seviye 1 enerji rezervi:** **24 enerji**.
- **Enerji üretimi seviye başına:** **%3 bileşik artış**.
- **Enerji rezervi seviye başına:** **+1 enerji**.
- Çekirdek aktif gücü ayrı bir dolum göstergesiyle zaman içinde dolar; enerji stoğu ile aktif güç dolumu aynı sayaç değildir.
- Çekirdek hazır olduğunda merkez hücrede belirgin parlama/pulse görülür; kullanımda etki kablo ağı üzerinden tüm devreye yayılır.

İlk aktif güç denge örnekleri:

| Çekirdek tipi | V1 başlangıç aktif gücü | Seviye ölçekleme yönü |
|---|---|---|
| **Aşırı Yük** | Tüm dost modüllere **3 sn +%25 hasar** | Seviye başına +1 yüzde puan; her 3 seviyede +0.1 sn |
| **Muhafız** | Tüm dost modüllere yaklaşık **4 sn takım kalkanı** | Kalkan değeri artar; süre artışı sınırlı tutulur |
| **Kapasitör** | **Sonraki 2 modül yerleştirmesinde -1 Akım** | İleri seviyelerde dolum/etki verimi artar; yerleştirme indirimi sert tavana bağlıdır |
| **Anka / İyileştirme** | Tüm dost modüllere anlık yaklaşık **%20 CAN iyileştirmesi** | İyileştirme yüzdesi kontrollü artar; tam yenileme sağlayamaz |

### Çekirdek enderliği ve imza mekanikleri (Beta.72)

Çekirdeklerde de enderlik güç vermez. Beta.62'deki enderlik eğrisi (Efsanevi için +%30 CAN, +%40 güç etkisi, +%12 enerji, +%10 dolum) kaldırıldı; aynı seviyedeki bütün çekirdekler 300 CAN, aynı enerji üretimi, aynı dolum süresi (35 sn) ve aynı temel güç değerleriyle savaşa girer. Sayısal büyüme yalnız Çekirdek seviyesi ve yeteneklerden gelir. Enderlik, modüllerdeki kuralla aynı biçimde imzayı belirler:

| Çekirdek | Enderlik | İmza | Kural |
|---|---|---|---|
| Rezonans | Yaygın | Tek Darbe | Tek iş: Çekirdeğe 45, modüllere 15 CAN onarım. Devre tam canlıyken kullanılamaz, dolum korunur |
| Muhafız | Nadir | Son Hat (koşul) | Çekirdek CAN'ı yarının altındayken kalkan modül başına 20 → 30, Çekirdeğe 60 |
| Aşırı Yük | Nadir | Zincir (koşul) | Güç sürerken yok edilen her rakip modül süreyi 1 sn uzatır (en fazla +2 sn) |
| Kesinti | Destansı | Statik Birikim (birikim) | Güç dolduktan sonra bekletilen her 4 sn kesintiye +0,5 sn (en fazla +2 sn) |
| Kapasitör | Destansı | Deşarj (risk–ödül) | Güç Çekirdek rezervinin tamamını boşaltır; rezerv en az yarı doluysa 2 yerine 3 yerleştirme 1 Akım indirimli |
| Anka | Efsanevi | Küllerden Doğuş (kural) | Dolum tamken Çekirdek yok olacak vuruşu alırsa %25 CAN ile ayakta kalır, dolum sıfırlanır; maçta bir kez |
| Kuantum | Efsanevi | Yarım Faz (kural) | Güç %50 dolumda da kullanılabilir: yarım dolumda yalnız 4 sn kalkan, tam dolumda onarım + kalkan |

Telgraf ve karşı oyun: Anka doğuşu hazır (✹), Statik yük (⚡n/4), Son Hat koşulu (◆) ve Zincir uzaması (⛓) Çekirdek kartında iki tarafa da görünür; rakibin dolum yüzdesi ise görünmez. Deşarjdan sonra boş rezerv ağır saldırıları geciktirir; Yarım Faz kalkanı kısadır ve onarım içermez. AI imzaya göre kullanır: Anka Çekirdek zayıfken dolumu doğuş için saklar, Muhafız Son Hat koşulunu, Kesinti en az iki Statik yükü, Kapasitör yarı dolu rezervi bekler (en geç 10 sn).

Denge ilkesi: yüksek Çekirdek seviyesi anlamlı avantaj sağlamalı, fakat tek başına kupa/eşleştirme farkını ezmemelidir. Bu nedenle eşleştirme kalitesinde kupa ana kriter olarak korunurken **ortalama deste seviyesi ve Çekirdek seviyesi** ikincil denge sinyali olarak kullanılmalıdır.

## 11. Kasa ve günlük teklif ekonomisi

Savaşlardan 3 / 8 / 24 saatlik sandıklar kazanılır. Ödül havuzu Devre Kredisi, Akı, modül parçaları ve yüksek sandıklarda çekirdek parçalarından oluşur.

Günlük teklif sandıkları **Devre Kredisi** ile alınır. Akı mağaza harcaması olarak kullanılmaz; yetenek/çekirdek gelişimi için korunur.

### Sandık mağazası ve günlük alım sınırı (7 Ekim 2026)

Mağazada dört sandık satılır: Bronz 1000 ve Gümüş 2000 Devre Kredisi, Altın 500 ve Elmas 1000 Akı (7 Ekim 2026'da yükseltildi; önceki fiyatlar 300 / 1000 Devre Kredisi ve 250 / 1000 Akı). Her alım sandığı hemen açar. Her sandık türü bir UTC gününde sınırlı sayıda alınır: **Bronz 5, Gümüş 3, Altın 2, Elmas 1** (`STORE_CHEST_DAILY_LIMITS`, `server/app/meta_progression.py`). Haklar UTC gün dönümünde (Türkiye saatiyle 03.00) yenilenir. 8 saatte bir verilen hediye Bronz Sandık ve savaşta kazanılan sandıklar sınıra girmez. Ayda bir günlük %40 indirim sürer; o gün de aynı sınır geçerlidir. Sayım mağaza makbuzlarından yapılır; oyuncu kaydına yeni alan eklenmedi.

### Sezon ve turnuva takvimi: dört haftalık döngü (Beta.72 tur 6)

Sezon ve Takımlar Arası Turnuva aynı takvimi kullanır. Her döngü Pazartesi 00:00 UTC'de başlar ve dört hafta (28 gün) sürer; 1. döngü 28 Eylül 2026'dır. Sezon değişince kupa arşivlenir ve yumuşak sıfırlama yapılır (sezon deneyimi ve alınan kademeler sıfırlanır, lig oyuncuları 3600 kupaya iner).

Turnuvada kayıt ilk haftanın Pazartesi–Çarşamba günleri açıktır ve yalnız takım lideri yapar. Eşleşme her Perşembe açıklanır. Eşleşen oyuncular Cuma–Pazar rövanşlı iki maç oynar: galibiyet 1, mağlubiyet 0 puan. Ödülü, 4. hafta bitince ilk üç takımın en az 4 puan katkı veren oyuncuları alır. Haftalık turnuva da Pazartesi başlar. Günlük giriş ödülü takvimi de aynı döngüyü izler: 28 gün, yalnız bugünün ödülü alınır; 7, 14, 21 ve 28. günler (Pazar) büyük ödüldür.

### Sezon ödül yolu: ücretsiz ve ücretli geçiş (Beta.72 arayüz turu)

Sezon ödülleri iki sütundur. Solda ücretsiz yol, sağda ücretli geçiş vardır. Her kademe sandık olarak görünür; sandığa dokununca içindeki ödüller gerçek görselleriyle önizlenir. Ücretli geçiş sütunu her kademede ücretsiz ödülün **iki katı** kaynak (Devre Kredisi, Akı, modül ve çekirdek parçası) ve iki sandık verir. Kozmetikler ücretsiz yolda kalır. Geçişin etkin olduğu sezon profilde tutulur ve sezon değişince sona erer; ücretli kademe talepleri de sıfırlanır.

**Karar (25 Eylül 2026):** Ücretli geçiş gerçek parayla açılacak, ama şimdi değil; oyun içi para onu açmaz. Beta.68 sınırı geçerlidir: mağaza makbuz doğrulaması, idempotent teslim ve iade işleme tamamlanmadan fiyat açılmaz. Bu yüzden ücretli sütun kilitli görünür ve satın alma kapalıdır.

## 11.1. Sosyal katman ve mesaj kutusu

- **Mesaj kutusu** (üst bardaki ✉) tek bildirim merkezidir. Üç bölümü vardır:
  - Savaş davetleri: arkadaş savaşı ve takım antrenman maçı.
  - Etkinlik ve sıralama ödül sandıkları.
  - Oyun bildirimleri: oyun güncellemeleri ile takım turnuvası maç saati gibi oyuncuya özel bildirimler.
  - Okunmamış öğe varken kutuda kırmızı nokta yanar.
- **Kupasız savaş daveti:** Arkadaşlar → Savaş sekmesinden gönderilir. Liste çevrimiçi arkadaşlardan başlar. Davet karşı tarafın mesaj kutusuna düşer ve **Kabul Et** onu doğrudan savaş alanına götürür. Daveti gönderen oyuncu da, aynı oturumda gönderdiyse kabul anında otomatik olarak savaş alanına geçer. Aynı arkadaşa bekleyen bir davet varken yenisi açılmaz; davet reddedilebilir. Takım üyeleriyle yapılan kupasız antrenman istekleri de aynı mesaj kutusuna düşer.
- **Arkadaşlar ekranı:** beş alt sekme (Arkadaşlar, Mesajlar, Gelen İstekler, Gönderilen, Savaş), üstte davet kodu ve oyuncu arama.
  - Gelen istek, okunmamış mesaj ya da bekleyen savaş davetinde ilgili alt sekmede, profildeki Arkadaş sekmesinde ve avatarda kırmızı nokta yanar.
  - Gönderilen istek geri çekilebilir.
- **Herkese açık profil:** Devre Koleksiyonu (sıralama kupaları ve rozetler) ziyaretçilere de görünür. Arkadaş ekle, paylaş, şikâyet ve engelle eylemleri yan yana, etiketli düğmelerdir.
- **Takım yönetimi** (takım simgesi): iki alt sekmesi vardır.
  - Kozmetik: Lider Görünümü. Amblem (10), çerçeve (6) ve isim rengi (6) herkese açık seçeneklerdir ve Kaydet ile uygulanır. Turnuvada kazanılan takım kozmetikleri ayrıca listelenir.
  - Üye Yönetimi: başvurular, üyeyi çıkarma ve liderliği devretme.
  - Başka bir takımın profilinde yönetim düğmesi görünmez.
- **Etkinlikler:** ayrı ödül sayfası yoktur. Sıralamada ilk üç satırın yanında ödül sandığı ve içerik önizlemesi bulunur. Takım eşleşmeleri sayfası yalnız oyuncunun kendi takımının eşleşmesini gösterir. Her üye satırında maç saati yazar; kendi satırında maç saati gelince "Savaş Alanına Gir" düğmesi açılır.

## 12. İstatistik ekranı

Genel: Toplam maç, galibiyet, mağlubiyet, galibiyet oranı, mevcut kupa, en yüksek kupa, mevcut arena/lig, en uzun galibiyet serisi.

Savaş: Ortalama maç süresi, maç başına yerleştirilen modül, toplam/ortalama Akım harcaması, çekirdek gücü kullanım sayısı, en yüksek hasar, en çok kullanılan modül.

Koleksiyon: Açılan modül sayısı / 36, yükseltilen modül sayısı, en yüksek modül seviyesi, açılan çekirdek sayısı, açılan sandık sayısı.

Deste: En çok kullanılan 8 modül, en çok kullanılan 3 deste, çekirdek kullanım oranı.

## 13. Legacy kararların durumu

Beta.39 öncesindeki aşağıdaki tasarım kararları yeni kanonu yönetmez:

- Port sayısı ve port yönü
- Jeneratör kapıları ve Jeneratörün zorunlu temel enerji kaynağı olması
- Özel sınıf hücreleri/mühürler
- Hücre içinde Soğutma/Onarım/Kapı gibi yazılar
- Dağıtıcının bağlantı topolojisi rolü
- Savaş içi yerleştirme için Devre Kredisi kullanımı

Bu öğeler Beta.72 legacy temizliğinde koddan kaldırılmıştır. Aynı pakette şunlar da kaldırıldı: güçlendiriciler (booster), modül taşıma/değiştirme/sürükle-bırak komutları, süre sınırı ve süre sonu hakemliği, 15 sn modül müdahale kilidi, 18 kartlık raf seçimi, istemci içi çevrimdışı savaş simülasyonu ve web-test QA alt sistemi. Kayıtlı veride kalan kaldırılmış kart kimlikleri deste normalizasyonu ve istatistik görünümünde yok sayılır. Hücreler arası kablo ağı ve Akım animasyonu görsel kimlik olarak korunur (§1). Modül ve Çekirdek enderlik güç eğrileri (Beta.62) de kaldırıldı; enderlik yalnız imza mekaniğini belirler (§2.1, §10).

## Yeni Durumlar
- Görsel hedef tam 3D değildir: **2D taban + 2.5D derinlik illüzyonu + güçlü VFX**. Sprite, UI, shader ve particle efektleri önceliklidir.
- GRIDSHARD, Clash Royale / Rush Royale gibi mobil PvP oyunlarının canlı renk, okunabilir hiyerarşi ve güçlü geri bildirim ilkelerinden yararlanır; hiçbir görsel varlık veya ekran birebir kopyalanmaz.
- Devre kartı ve kablolarda hareketli Akım, Çekirdekte dolum/parlama ve savaş eylemlerinde belirgin impact feedback oyunun görsel imzasıdır.
