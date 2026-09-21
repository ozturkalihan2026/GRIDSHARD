
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
- Dağıtıcı yalnız eski port topolojisine hizmet ettiği için aktif hedef katalogdan çıkarılacaktır.
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

Çekirdek, savaş alanındaki tüm modüllerin temel enerji kaynağıdır. Her modül sahada kaldığı sürece enerji tüketir. Enerji üretimi ve tüketimi, **Akım** yerleştirme kaynağından tamamen ayrıdır.

Çekirdeğin temel enerji parametreleri:

- `energy_per_second`: saniyelik enerji üretimi.
- `energy_capacity`: kısa süreli dalgalanmaları karşılayan enerji deposu.
- `core_charge_rate`: Çekirdek aktif gücünün dolum hızı.
- Çekirdek seviyesi arttıkça `energy_per_second` ve kontrollü biçimde `energy_capacity` artar.

Başlangıç denge hedefi:

- Çekirdek Seviye 1: yaklaşık **10 enerji/sn**, **100 enerji kapasitesi**.
- Enerji üretimi seviye başına yaklaşık **%4 bileşik** artar.
- Enerji kapasitesi seviye başına yaklaşık **+3** artar.
- Kesin değerler Beta.42H denge simülasyonunda kalibre edilir.

Tamamen saldırı modüllerinden oluşan bir deste, yüksek hücre doluluğunda Çekirdeğin enerji üretimini aşabilmelidir. Böylece oyuncu yalnız ham saldırı gücü değil, enerji sürdürülebilirliği de planlamak zorunda kalır.

### Modül enerji tüketimi için V1 hedef bantları

| Modül rolü | Başlangıç enerji tüketimi hedefi |
|---|---:|
| Hafif saldırı | **2–3 enerji/sn** |
| Orta saldırı | **4–5 enerji/sn** |
| Ağır saldırı | **7–9 enerji/sn** |
| Savunma | **2–4 enerji/sn** |
| Destek / Onarım | **2–4 enerji/sn** |
| Sistem | **0–2 enerji/sn** |

Bu bantlar modül bazında kesin değer değildir; amaç, 14 modül hücresinin tamamını ağır saldırı modülleriyle dolduran bir oyuncunun Çekirdek üretimini açık biçimde aşması, dengeli veya Sistem destekli destelerin ise Enerji Baskısını daha iyi yönetebilmesidir.

### Enerji Baskısı / Aşırı Yük

Toplam anlık tüketim Çekirdeğin sürdürülebilir üretimini geçtiğinde modüller aniden kapanmaz. Bunun yerine kademeli verim cezası uygulanır:

| Enerji yükü | V1 hedef ceza |
|---:|---|
| %0–100 | Normal çalışma |
| %101–120 | Saldırı hızı -%10 |
| %121–140 | Saldırı hızı -%20, onarım/kalkan etkinliği -%10 |
| %141–160 | Saldırı hızı -%30, hasar -%10 |
| %160+ | **Aşırı Yük:** saldırı hızı -%40, destek/onarım etkinliği -%25 |

Bu eşikler ürünün ilk denge hedefidir; telemetri ve simülasyona göre değiştirilebilir. Savaş hiçbir enerji durumunda pause olmaz.

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
| **Kapasitör** | Maksimum enerji kapasitesi **+25** | **1 enerji/sn** | Ağır tüketim dalgalanmalarını yumuşatır; kalıcı üretim sağlamaz |
| **Akım Regülatörü** | Tüm dost modüllerin enerji tüketimi **-%8** | Düşük tüketim; çoklu kopyada azalan verim | Tam saldırı destelerine bedelsiz çözüm olmadan verim kazandırır |
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

Maçın tek normal galibiyet koşulu rakip Çekirdeğin yok edilmesidir. Toplam hasar, kalan modül sayısı veya kalan toplam CAN hiçbir zaman süre sonu hakemi olarak kazanan seçmez. İki Çekirdek aynı sunucu adımında yok edilirse maç berabere biter. Savaştan çekilme ayrı ve açık bir mağlubiyet koşuludur.

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

## 9. Bot havuzu

Her arena için 10 profil; toplam **120 AI oyuncu**. Her arena setinde 10 farklı arketip kullanılır: Dengeli, Hızlı Baskı, Ağır Hasar, Savunma, Sürdürülebilirlik, Kontrol, Destek Zinciri, Akım Ekonomisi, Alan Hasarı ve Karşı Meta.

Botlar:

- arena dışı kart kullanamaz,
- 6 kartlık farklı desteler kullanır,
- insan benzeri görünen adlara sahiptir,
- karar gecikmesi ve hata oranı taşır,
- mükemmel oynamaz,
- aynı arena içinde farklı güç ve tempo profillerine sahiptir.

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

- **Seviye 1 enerji üretimi:** yaklaşık **10 enerji/sn**.
- **Seviye 1 enerji kapasitesi:** yaklaşık **100 enerji**.
- **Enerji üretimi seviye başına:** yaklaşık **%4 bileşik artış**.
- **Enerji kapasitesi seviye başına:** yaklaşık **+3 enerji**.
- Çekirdek aktif gücü ayrı bir dolum göstergesiyle zaman içinde dolar; enerji stoğu ile aktif güç dolumu aynı sayaç değildir.
- Çekirdek hazır olduğunda merkez hücrede belirgin parlama/pulse görülür; kullanımda etki kablo ağı üzerinden tüm devreye yayılır.

İlk aktif güç denge örnekleri:

| Çekirdek tipi | V1 başlangıç aktif gücü | Seviye ölçekleme yönü |
|---|---|---|
| **Aşırı Yük** | Tüm dost modüllere **3 sn +%25 hasar** | Seviye başına +1 yüzde puan; her 3 seviyede +0.1 sn |
| **Muhafız** | Tüm dost modüllere yaklaşık **4 sn takım kalkanı** | Kalkan değeri artar; süre artışı sınırlı tutulur |
| **Kapasitör** | **Sonraki 2 modül yerleştirmesinde -1 Akım** | İleri seviyelerde dolum/etki verimi artar; yerleştirme indirimi sert tavana bağlıdır |
| **Anka / İyileştirme** | Tüm dost modüllere anlık yaklaşık **%20 CAN iyileştirmesi** | İyileştirme yüzdesi kontrollü artar; tam yenileme sağlayamaz |

Denge ilkesi: yüksek Çekirdek seviyesi anlamlı avantaj sağlamalı, fakat tek başına kupa/eşleştirme farkını ezmemelidir. Bu nedenle eşleştirme kalitesinde kupa ana kriter olarak korunurken **ortalama deste seviyesi ve Çekirdek seviyesi** ikincil denge sinyali olarak kullanılmalıdır.

## 11. Kasa ve günlük teklif ekonomisi

Savaşlardan 3 / 8 / 24 saatlik sandıklar kazanılır. Ödül havuzu Devre Kredisi, Akı, modül parçaları ve yüksek sandıklarda çekirdek parçalarından oluşur.

Günlük teklif sandıkları **Devre Kredisi** ile alınır. Akı mağaza harcaması olarak kullanılmaz; yetenek/çekirdek gelişimi için korunur.

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

Bu öğeler koddan kontrollü migrasyonla kaldırılır. Tarihsel testler gerekirse `legacy` etiketiyle korunabilir fakat yeni ürün davranışını zorlayamaz.

## Yeni Durumlar
- Görsel hedef tam 3D değildir: **2D taban + 2.5D derinlik illüzyonu + güçlü VFX**. Sprite, UI, shader ve particle efektleri önceliklidir.
- GRIDSHARD, Clash Royale / Rush Royale gibi mobil PvP oyunlarının canlı renk, okunabilir hiyerarşi ve güçlü geri bildirim ilkelerinden yararlanır; hiçbir görsel varlık veya ekran birebir kopyalanmaz.
- Devre kartı ve kablolarda hareketli Akım, Çekirdekte dolum/parlama ve savaş eylemlerinde belirgin impact feedback oyunun görsel imzasıdır.
