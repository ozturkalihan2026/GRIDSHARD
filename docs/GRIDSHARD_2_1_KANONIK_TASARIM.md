
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

- **Soğutucu:** yerleşimden bağımsız olarak önce aşırı ısınıp susmuş modülleri, sonra devredeki en sıcak modülleri seçer; darbeyle çalışır (13 Ekim 2026): **çevriminde bir (başlangıç seviyesinde 1 sn) en fazla üç modülü %4,5** soğutur (susmuş modülde iki kat; havalandırmayla birlikte ~2,5 sn'de toparlar). Saniyelik etki eski sürekli kuralla aynıdır; seviye soğutmayı büyütür ve aralığı kısaltır. Tek Soğutucu iki-üç orta saldırıyı %45'in altında tutar. Simülasyonda Soğutucusuz destelerin saldırı zamanının ~%69'u yavaş ya da susmuş geçerken Soğutuculu destelerde ~%30; Soğutuculu destelerin kazanma oranı %58, Soğutucusuzların %37. Kendisi ısınmaz. EMP ve hat kesintisi sürelerini de en fazla üç modülde kısaltır.
- **Aşırı Hızlandırıcı:** devredeki en ağır (aksiyon enerjisi en yüksek) saldırı modülünü seçer; çevriminde bir (başlangıç seviyesinde 2,5 sn) ona aşırı yük verir: sıradaki atışı hasar ×1,2 alır ve o atıştan sonraki bekleme ×0,8 olur; her yükleme hedefe %3,75 ısı ekler (saniyede %1,5). Birden fazla Aşırı Hızlandırıcı farklı hedefler seçer; aşırı ısınan hedef bırakılır ve sıradaki ağır saldırıya geçilir.
- **Arayüz:** kartın üst kenarındaki ısı barı yüzdedir; %40 ve %70 çentiklidir, %45'ten itibaren yavaşlama rengi ve açıklaması ("Atış aralığı +%20", sürekli sistemlerde "Etki −%17") gösterilir.
- **Yapay zekâ:** iki ve üzeri modülü ısınan AI desteyse Soğutucu basar; enerji yükü %100'ü aşınca Batarya'yı öne alır.
- **Bot desteleri (tur 12, denge simülasyonuyla):** ≥2 ağır saldırılı ya da Aşırı Hızlandırıcılı 40 bot destesine Soğutucu, aksiyonları zamanın ≥%20'sinde enerji bekleyen 17 desteye Batarya eklendi (51 deste; toplam Soğutuculu deste 34 → 74, Bataryalı 48 → 65). Çıkarılacak kart, botun arenasındaki kazanma oranını en az değiştiren seçenekti; Soğutucu, Batarya, Akım Dengeleyici ve Aşırı Hızlandırıcı çıkarılmadı, arketip kimliği (ör. Kontrol'ün sabotaj kartları) korundu. Yerel AI arketiplerinde Saldırgan ailesine Soğutucu (Güçlendirici yerine), Dengeli ve Savunmacı ailelerine Batarya (Kalkan / Zırh yerine) verildi (tur 14'te Savunmacı ailesinde Batarya yerine Darbe Topu). Oyuncu vekiliyle ölçüm: sistemleri kullanan oyuncuya karşı botların kazanma oranı %20 → %14, Soğutucu ve Batarya kullanmayan oyuncuya karşı %22 → %28 (arena 1–4'te %26 → %40).
- **AI arketipleri (tur 13):** hiç kazanamayan Sabotaj Odaklı ve Ekonomi Odaklı kaldırıldı; yerine sınıf eğilimi olmayan, Dengeli davranışla oynayıp destesinde sabotaj ve ekonomi kartı taşıyan **Dengeli Kontrol** (Lazer, Darbe Topu, Batarya, Soğutucu, EMP, Sinyal Bozucu) ve **Dengeli Ekonomi** (Lazer, Darbe Topu, Batarya, Akım Dengeleyici, Kalkan, Sinyal Bozucu) geldi. Tema yalnız "en az bir kopya" tabanıyla korunur; tema kartına verilen küçük bir öncelik bile AI'yi saldırı kurmadan kilitliyordu. Kontrol ve Akım Ekonomisi arena botları da bu davranışla oynar.
- **Savunmacı ailesi (tur 14):** enerji bollaşınca tek saldırı kartlı Savunmacı / Sürdürülebilirlik destesi (Lazer, Kalkan, Batarya, Bariyer, Onarım, Soğutucu) yalnız enerjisi tükenen rakibi yenebildiği ortaya çıktı (oyuncu vekillerine %50 → %1). Batarya yerine Darbe Topu geldi (Lazer, Darbe Topu, Kalkan, Bariyer, Onarım, Soğutucu; genişleme Bariyer, Onarım, Soğutucu); davranış ayarları aynı. Sonuç: Savunmacı %50, Sürdürülebilirlik %48.

### Enderlik ve imza mekanikleri (Beta.72)

**Modül çevrimleri (13 Ekim 2026, kullanıcı isteği: "Güçlendiricide yaptığımız gibi tüm modüllerde düzenleme yapmalıyız").** Her modül kendi çevrimiyle çalışır; çevrim seviyeyle kısalır, modüle özgü değerler seviyeyle büyür. Saldırı, onarım ve sabotaj modüllerinde çevrim eylem aralığıdır. Eskiden sürekli çalışan savunma ve destek modülleri artık aralıkla çalışır: savunma modülü çevrimi dolunca bir **yük** hazırlar ve yük tek bir olayda (karşılanan saldırı, uygulanan sabotaj) harcanır; destek modülü çevriminde bir saldırı modüllerini yükler ve yük sıradaki atışta harcanır (bir atış bütün yükleri harcar, en güçlü tek destek uygulanır). Çevrimi olmayan tek modül Akım Dengeleyici'dir. Aşağıdaki tablodaki sayılar başlangıç seviyesine aittir; her modülün seviye 1 ve seviye 15 değerleri `docs/MODUL_CEVRIM_KANONU.md` içindedir (sunucu verisinden üretilir).

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
| Kalkan | 1,2 sn'de bir blok hazırlar; kendisine gelen sıradaki saldırının %60'ını engeller. Blok tek saldırıda harcanır; sürekli azaltımı yoktur |
| Zırh | Sürekli %25 azaltır; 3 sn'de bir zırh plakasını onarır (5 CAN) |
| Yansıtıcı | Sürekli %25 azaltır; 1 sn'de bir, devreye ateşlenen bir saldırıyı üzerine çeker ve gelen hasarın %30'unu saldırana yansıtır |
| Bariyer | Saldırıları üzerine çeker, sürekli %20 azaltır; 4 sn'de bir, devreye uygulanan bir sabotajın süresini %35 kısaltır |
| Koruyucu Kubbe | Kendisi %32 azaltır; 1,5 sn'de bir, başka bir modüle gelen bir saldırıyı %30 azaltır |
| Faz Zırhı | Her çevrimin (6 sn) ilk 1 sn'sinde saldırıları tamamen boşa çıkarır; diğer anlarda %18 azaltır. Çevrim seviyeyle kısalır |
| Prizma Kalkanı | 1,3 sn'de bir blok (%55); engellediği hasarın dörtte birini Çekirdek rezervine ekler |
| Nano Medik | En yaralı iki modülü temel onarımın %62'si kadar onarır |
| Anka Onarımı | 30 sn'de bir, 10 enerjiyle, sınıf/kopya/saha sınırlarından geçerek yok edilmiş bir modülü %30 CAN ile geri getirir; her modül maçta bir kez; aday yoksa ×1,15 tek hedef onarım |
| Güçlendirici | 2 saniyede bir tüm saldırı modüllerini yükler; yük sıradaki atışta hasara eklenir ve harcanır. Toplam %36 pay saldırı sayısına bölünür, tek saldırıya en fazla %18; yükleme aralığı seviyeyle kısalır |
| Hedefleme Bilgisayarı | 2 saniyede bir tüm saldırı modüllerine kilit verir; kilit sıradaki atışta harcanır ve o atıştan sonraki beklemeyi kısaltır. Toplam %36 pay saldırı sayısına bölünür, tek saldırıya en fazla %18 |
| Aşırı Hızlandırıcı | 2,5 saniyede bir en ağır saldırıya aşırı yük verir; bonus ve ısı yalnız hedefe gider |
| Kronos Rölesi | 4 sn tüm saldırılar hızlanır (bekleme ×0,72), ardından 2,5 sn borç (bekleme ×1,18, hasar ×0,95); borç başka destekle atlatılamaz. Çevrim (hızlanma + borç) seviyeyle kısalır; kısalan kısım borçtur |
| Hassas Matris | 1,5 saniyede bir, hedefini değiştirmemiş saldırıya bir odak kademesi verir (en çok 4): kademe başına +%4 hasar, -%3 bekleme. Hedef değişince odak sıfırlanır |
| Omega Güçlendirici | 2 saniyede bir saldırı modüllerini rezonansla yükler; devredeki her farklı sınıf paylaşılan hasar payına %8 ekler (en fazla 5 sınıf); tek saldırıya en fazla %20 |
| Virüs | 4 hasarla başlar, her tikte 2 artar (6 sn'de 54) |
| Kesici / Tekillik Projektörü | 3,5 / 4,5 sn kesinti; ikinci bir sisteme %50 / %65 süreli yankı. Sabotaj kartları saldırı döngüsüne girmez |

### İmza görünürlüğü: efekt, rozet, sarsıntı ve ses

Her imza sahada okunur olmalıdır; görsel yalnız motorun gerçekten ürettiği olaydan doğar, istemci kendi başına imza tetiklemez.

- **Kart rozetleri** (kartın sol altı, CAN çubuğunun üstü; en fazla 2): Kuantum Tekrar `↻n/4`, Sürü deposu `✥n/4`, Kuantum yükü `◎%`, Füze/Plazma kilidi `⌖`, Kronos `⧗+` / borç `⧗−`, Faz penceresi `FAZ`, Omega kategori sayısı `Ωn`, Hassas odak `⊕n`, Anka ile dirilmiş `✦`. Canlı durum rozetleri (ısı, enerji bekliyor, olumsuz etki) sağ üstte kalır. Sunucu rozeti yalnız görünür durumdan üretir ve milisaniye sayacı göndermez.
- **Efektler:** hale + halka + parçacık, gerekirse kaynaktan hedefe bağ ışını ve kısa etiket (YANKI, ÇÖKÜŞ, SÜRÜ, DİRİLİŞ, PRİZMA, TEKİLLİK, KRONOS, BORÇ, FAZ, KİLİT, İMHA). Kilit telgrafı gerçek hazırlık süresi kadar görünür; rakip bu sürede hedefin ne olduğunu okuyabilir. Aynı anda çok efekt varsa önceliği düşük olan (yankı, ikincil vuruş, borç) önce atlanır; Grafik ayarı Orta/Düşük bütçeyi küçültür.
- **Arena sarsıntısı:** hafif (imza vuruşu, rakip çekirdeğe ağır vuruş), orta (modül düştü, kendi çekirdeğine ağır vuruş), ağır (dolu Kuantum çöküşü), çekirdek (çekirdek yıkımı). Hareket azaltma tercihinde sarsıntı yerine kısa parlama kullanılır. Titreşim ayarı açıksa orta ve üstü sarsıntı cihazı titretir.
- **Okunabilirlik:** rozet ve efekt yazıları opak koyu zeminde (`#06111f`) açık renktir; en düşük kontrast 9,3:1. Renk tek başına anlam taşımaz, her rozetin simgesi ve açıklama başlığı vardır.
- **Ses:** imza ipuçlarının kendi adları vardır (`quantum_charge`, `repeat_echo`, `swarm_release`, `phoenix_revive`, `prism_shield`, `phase_evade`, `singularity_field`, `sabotage_echo`, `omega_link`, `chrono_shift`, `target_lock`, `nano_pulse`, `kill_confirm`, `module_lost`) ve imza saldırı kartları kendi atış ipucunu kullanır. Adlar mevcut ses dosyalarına bağlanır; yeni dosya eklenince yalnız eşleme değişir. Aynı ipucu 160 ms'den sık çalmaz.
- **Efekt kademesi (13 Ekim 2026, kullanıcı kararı):** efektlerde sürekli ve bol parlama kullanılmaz. Sıradan atış ve vuruş küçük ve kısadır (ince ışın ya da kesik izli yörünge, 24 piksellik vuruş yıldızı, dört kıvılcım; kart yalnız bir an süren kırpmayla tepki verir). Parlama yalnız vurucu sonuçta büyür: **ağır vuruş** (savunulmamış ve 40 ya da üstü hasar, ya da hedefin azami CAN'ının dörtte biri; 46 piksellik yıldız, halka, on kıvılcım), modülün yok olması (patlama yıldızı, şok halkası, kıymıklar, arena sarsıntısı), Çekirdek patlaması ve Çekirdek gücü. Güç alan hücre sürekli parlamaz; durumu sabit ince çerçeveyle görünür, kablodaki akım çizgisi yavaş akar. Efektlerin çizim dili oyunun yüzey diliyle aynıdır: dolu gövde, iki ton, koyu kontur; ışıma ve bulanık gölge yoktur. Kurallar `client/src/canon.css` sonundaki "Görsel tur 6" bloğunda, kademe `emitDuelImpactEffect` içindedir (`client/src/app.js`).

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

Onarım, her bekleme süresi tamamlandığında yalnız **bir** hasarlı ve yaşayan modülü iyileştirir. Aynı sunucu destek adımında aynı hedef birden fazla Onarım Modülünden onarım alamaz. Aynı hedef aynı adımda birden fazla Soğutucu veya Aşırı Hızlandırıcı etkisi de alamaz. Bir Saldırı modülü komşu Güçlendirici, Hedefleme Bilgisayarı ve Aşırı Hızlandırıcı arasından yalnız en güçlü tek saldırı desteğini kullanır. Onarım Çekirdeği iyileştirmez, yok edilmiş modülü diriltmez ve Enkaz süresini kaldırmaz.

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

`Modül Parçası + Devre Kredisi` (efsanevi modülde seviye 8'den sonra ayrıca Akı)

**Maliyet tablosu (12 Ekim 2026, kullanıcı kararı "enderliğe göre").** Enderlik arttıkça daha az parça ve daha çok Devre Kredisi gerekir. Hücre: Devre Kredisi / parça.

| Seviye | Sıradan | Ender | Destansı | Efsanevi |
|---|---|---|---|---|
| 1 → 2 | 100 / 2 | 150 / 2 | 200 / 2 | 300 / 1 |
| 2 → 3 | 200 / 4 | 300 / 4 | 400 / 2 | 600 / 2 |
| 3 → 4 | 400 / 8 | 600 / 6 | 800 / 4 | 1.200 / 3 |
| 4 → 5 | 600 / 14 | 900 / 10 | 1.200 / 8 | 1.800 / 4 |
| 5 → 6 | 1.000 / 22 | 1.500 / 16 | 2.000 / 12 | 3.000 / 6 |
| 6 → 7 | 1.500 / 32 | 2.250 / 24 | 3.000 / 16 | 4.500 / 10 |
| 7 → 8 | 2.200 / 44 | 3.300 / 34 | 4.400 / 22 | 6.600 / 14 + 20 Akı |
| 8 → 9 | 3.200 / 58 | 4.800 / 44 | 6.400 / 30 | 9.600 / 18 + 30 Akı |
| 9 → 10 | 4.800 / 74 | 7.200 / 56 | 9.600 / 38 | 14.400 / 22 + 40 Akı |
| 10 → 11 | 7.000 / 92 | 10.500 / 70 | 14.000 / 46 | 21.000 / 28 + 50 Akı |
| 11 → 12 | 10.000 / 112 | 15.000 / 84 | 20.000 / 56 | 30.000 / 34 + 60 Akı |
| 12 → 13 | 15.000 / 136 | 22.500 / 102 | 30.000 / 68 | 45.000 / 40 + 80 Akı |
| 13 → 14 | 22.000 / 164 | 33.000 / 124 | 44.000 / 82 | 66.000 / 50 + 100 Akı |
| 14 → 15 | 32.000 / 200 | 48.000 / 150 | 64.000 / 100 | 96.000 / 60 + 120 Akı |
| **Toplam** | 100.000 / 962 | 150.000 / 726 | 200.000 / 486 | 300.000 / 292 + 500 Akı |

Kaynak: `module_upgrade_cost` (`server/app/meta_progression.py`). Oyuncunun o güne kadarki kart seviyeleri değişmez; tablo sonraki yükseltmelerde geçerlidir. Akı ayrıca yetenek düğümleri ve çekirdek gelişiminde kullanılır.

### Yetenek eşikleri

- Yaygın: 5 / 8 / 11 / 14
- Nadir: 6 / 9 / 12 / 15
- Epik: 7 / 10 / 13 / 15
- Efsanevi: 8 / 11 / 14 / 15

Her eşikte iki daldan biri seçilir (12–13 Ekim 2026, Faz 3):

1. **Temel uzmanlık:** güç +%3 (hasar ya da sınıfın etkisi) ya da CAN +%5.
2. **İmza yeteneği:** modüle özel iki yetenekten biri. Düz bir artış değildir; savaşta ayrı bir kural olarak çalışır (ör. Lazer — Yayılım Işını: her 30 saniyede bir 5 saniye boyunca her atış, hedefin yanındaki modüllere hasarın %30 kadarını da verir).
3. **İnce ayar:** çevrim (bekleme) −%4 ya da enerji tüketimi −%12. Çevrimi olmayan tek modül olan Akım Dengeleyici'de sol dal etki +%4'tür.
4. **Ustalık:** seçilen imza yeteneğini bir buçuk kat güçlendirir ya da CAN +%8.

72 imza yeteneği 18 ortak kuraldan (kanca) kurulur; tam liste `docs/YETENEK_KANONU.md` içindedir. Çekirdeklerin üç eşiği (seviye 5, 9, 13) vardır ve her çekirdeğin altı yeteneği kendine özeldir (açılış dolumu, kaybedilen ya da yok edilen modülden dolum, güçten sonra dolum yankısı, acil kalkan, dikenli çekirdek …). Savaşta bir yetenek tetiklendiğinde modülün ya da Çekirdeğin üstünde adı belirir. AI rakip, eşlendiği seviyede açılan eşikleri kullanır.

Seviye yükseltmek tek bir değeri büyütmez: CAN ve hasar (ya da etki) artarken çevrim süresi seviye başına %0,8 kısalır (en çok %12) ve enerji tüketimi %0,4 azalır (en çok %8). Etki çarpanı modüle özgü değeri büyütür: blok, yansıtma, onarım, soğutma, sabotaj süresi, depo … (13 Ekim 2026). Bilgi ekranı soyut "etki çarpanı" yerine bu değerleri ve bir sonraki seviyedeki farkı gösterir.

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

Yeni hesap 0 kupada başlar. 12 arena toplam 0–5399 kupayı kapsar ve ileride genişler (Arena 1–2: 300, 3–4: 350, 5: 400, 6: 450, 7–9: 500, 10: 550, 11–12: 600 kupa). 5400 kupadan sonra Ligler başlar. 12 Ekim 2026 öncesinin kayıtları eski ölçektedir (arena başına 300 kupa); ilk girişte bir kez yeni ölçeğe taşınır: oyuncu aynı arenada ve arenanın aynı oranında kalır, sıralama değişmez.

**Modül açılışları (12 Ekim 2026, kullanıcı kararı).** Arena 1'de yalnız altı modül açıktır ve başlangıç destesini oluşturur: Lazer, Kalkan, Batarya, Soğutucu, EMP, Güçlendirici. Arena 2–11 ikişer, Arena 12 üç modül açar (efsanevi olmayan 23 modül). Yedi efsanevi modülün hepsi **ilk lige (Kıvılcım Ligi I) girişte** açılır: İyon Mızrağı, Prizma Kalkanı, Kesici, Anka Onarım, Kuantum Topu, Omega Güçlendirici, Tekillik Projektörü. Sonraki ligler modül açmaz. Toplam **36 modül**.

**Ligler.** Kıvılcım, Voltaj, Reaktör, Kuantum ve Nexus ligleri beşer kademelidir (I–V, kademe 80 kupa; 5400, 5800, 6200, 6600, 7000). Şampiyonlar Ligi I–V 7400'de (kademe 100), Efsanevi Lig I–V 7900'de (kademe 140) başlar; yolun sonu tek kademeli **GRIDSHARD Ligi**'dir (8600). Kademeler ara ödül verir (Devre Kredisi, modül parçası, Akı); lig sonunda **lig sandığı** alınır. Sezon değişiminde lig oyuncusu 5400 kupaya döner (en üst lig için bir sezonda 3200 kupa gerekir); alınmış ödüller, açılmış modüller ve unvan kalır. 8600'den sonra kupa artmaya devam eder; lider panosu kupaya göre sıralar.

**Lig sandıkları.** Her ligin kendi sandığı vardır: Kıvılcım, Voltaj, Reaktör, Kuantum, Nexus, Şampiyonlar ve Efsane Sandığı. Mağazadaki ve diğer ekranlardaki sandıklardan adı, içeriği, biçimi ve rengiyle ayrıdır; mağaza stoğuna girmez. İçeriği şansa ve belirli bir modüle bağlı değildir: her modülde harcanabilen evrensel parça, Devre Kredisi ve Akı (1.500 / 60 / 5 evrensel parça ile başlar; parça 5, 7, 9, 12, 15, 20, 25 diye artar; Efsane Sandığı 20.000 / 500 / 25). Yolun son durağı **GRIDSHARD Sandığı**'dır ve ligin içinde, **10000 kupada** durur: 25.000 Devre Kredisi, 1.000 Akı, 40 evrensel parça ve yalnız bu sandıkla açılan kozmetik seti (profil resmi, çerçeve, profil arka planı, emoji).

**Önceden açılmış modüller.** Dağıtım değişmeden önce bir hesabın açmış olduğu modül o hesapta açık kalır (`legacy_module_unlocks`); kupa düşse de sezon değişse de kapanmaz.

Arena detay sayfası ana ekrandaki Arena alanına dokununca açılır ve dikey kaydırılan bir **Devre Yolu** gösterir. Yol üzerinde kupa eşikleri, ara ödüller, modül açılışları ve (modüllerden ayrı bir satırda) çekirdek açılışları görülür. Yolun arka planı desenlidir ve aşamaların rengi yol boyunca değişir. Her ligin kendi amblemi ve rengi vardır; kademe amblemin altındaki beş çentikten okunur. Lig sandığı hücre içinde değil, yolun ucunda havada durur; üzerine gelince ya da dokununca içeriği diğer sandıklardaki önizleme paneliyle görünür, alınabilir olduğunda altında ayrı **AL** düğmesi çıkar. Bir arenaya ya da lige ilk kez giren oyuncuya, orada açılan modüller ana ekrana dönüşte bir pencereyle tanıtılır. Aşamaların dikdörtgeni şeffaftır: arena ve lig rengi başlık şeridinde durur, henüz ulaşılmamış aşama renksiz ve koyu görünür, oyuncu ilerledikçe canlanır. Arenalar ileride genişler (300 … 600 kupa) ve 5400 kupada biter; ligler 5400–8600 arasındadır; GRIDSHARD Ligi 8600'de başlar, GRIDSHARD Sandığı ve son unvan 10000 kupadadır. Güncel eşikler `docs/ARENA_MODUL_ODUL_KANONU.md`, yetenekler `docs/YETENEK_KANONU.md` içindedir (ikisi de sunucu verisinden üretilir).

**Operatör unvanları.** Unvan en yüksek kupaya ve toplam galibiyete göre verilir; ödülü alınmış unvan oyuncuda kalır. Kupa koşulu bir aşamanın başlangıcıdır (Arena 2, 4, 7, 11; Kıvılcım, Nexus, Şampiyonlar ve Efsanevi ligleri): Devre Çırağı (0 / 0), Devre Teknisyeni (300 kupa / 20 galibiyet), İletken Ustası (950 / 60), Çekirdek Muhafızı (2150 / 130), Arena Mimarı (4200 / 220), Lig Öncüsü (5400 / 280), Nexus Stratejisti (7000 / 450), Şampiyon Operatör (7400 / 550), Efsane Mühendisi (7900 / 750), GRIDSHARD Efsanesi (10000 / 1000; GRIDSHARD Ligi'nin zirvesi).

**Eğitim savaşı.** Yönetmenli ilk savaş yalnız Arena 1 modüllerini kullanır: Lazer, Soğutucu, Kalkan, Batarya, Güçlendirici dersleri ve Sabotaj sınıfının (EMP) tanıtımı. Sahne kimliklerinin sürümü vardır (`TUTORIAL_SCRIPT_VERSION`); sürümü bildirmeyen eski paket yönetilmeyen, yumuşatılmış ilk maçı oynar.

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

Oyuncular **aynı eşleştirme kuşağı** içinde aranır: arenalarda kuşak arenanın kendisidir; liglerde kuşak 200 kupadır ve 5600 üstü tek kuşaktır. Lig kademeleri 100 kupaya indiği için kuşak, görünen kademeden ayrıdır (`matchmaking_band`).

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

- arena dışı kart kullanamaz (Arena 1 botlarının hepsi aynı altı modülle oynar),
- lig maçında Arena 12 destesiyle oynar; oyuncunun liginde açılmış efsanevi modüller destesine girebilir,
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

Çekirdek seviyesi `Akı + Çekirdek Parçası` ile artar (12 Ekim 2026: Akı 50 × seviye, toplam 5.250; parça 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22, toplam 109. 13 Ekim 2026: çekirdek parçası bütün sandıklardan (Bronz %1, Gümüş %3, Altın %5, Elmas %10; şans çıkınca 1, 2, 3 ve 5 parça), giriş takviminin 14. ve 28. gününden (10 ve 15 parça) ve Devre Yolu'nda her arenanın son ödülü (3) ile lig sandıklarından (5, 5, 6, 6, 8, 8, 10; GRIDSHARD Sandığı 20) gelir; parça açık çekirdeklerden rastgele birine gider). Seviye artışı iki alanı birlikte geliştirir: **(1) pasif enerji üretimi/kapasitesi, (2) aktif Çekirdek gücü**. Örneğin Aşırı Yük Çekirdeği Seviye 1'de +%25 / 3 sn; her seviyede +1 yüzde puan hasar, her 3 seviyede +0.1 sn süre kazanır. Enerji üretimi ayrıca seviye başına yaklaşık %4 bileşik artış hedefiyle başlatılır ve denge simülasyonunda kalibre edilir.

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

Mağazada dört sandık satılır: Bronz 1000 ve Gümüş 2000 Devre Kredisi, Altın 500 ve Elmas 1000 Akı (7 Ekim 2026'da yükseltildi; önceki fiyatlar 300 / 1000 Devre Kredisi ve 250 / 1000 Akı). Her alım sandığı hemen açar. Her sandık türü bir UTC gününde sınırlı sayıda alınır: **Bronz 5, Gümüş 3, Altın 2, Elmas 1** (`STORE_CHEST_DAILY_LIMITS`, `server/app/meta_progression.py`). Haklar UTC gün dönümünde (Türkiye saatiyle 03.00) yenilenir. 8 saatte bir verilen hediye Bronz Sandık ve savaşta kazanılan sandıklar sınıra girmez. Ayda bir günlük %40 indirim sürer; o gün de aynı sınır geçerlidir. İndirim günü alt çubuktaki Mağaza düğmesinde indirim oranı ("-%40") görünür. Sayım mağaza makbuzlarından yapılır; oyuncu kaydına yeni alan eklenmedi.

### Sezon ve turnuva takvimi: dört haftalık döngü (Beta.72 tur 6)

Sezon ve Takımlar Arası Turnuva aynı takvimi kullanır. Her döngü Pazartesi 00:00 UTC'de başlar ve dört hafta (28 gün) sürer; 1. döngü 28 Eylül 2026'dır. Sezon değişince kupa arşivlenir ve yumuşak sıfırlama yapılır (sezon deneyimi ve alınan kademeler sıfırlanır, lig oyuncuları 3600 kupaya iner).

Turnuvada kayıt ilk haftanın Pazartesi–Çarşamba günleri açıktır ve yalnız takım lideri yapar. Eşleşme her Perşembe açıklanır. Eşleşen oyuncular Cuma–Pazar rövanşlı iki maç oynar: galibiyet 1, mağlubiyet 0 puan. Ödülü, 4. hafta bitince ilk üç takımın en az 4 puan katkı veren oyuncuları alır. Haftalık turnuva da Pazartesi başlar. Günlük giriş ödülü takvimi de aynı döngüyü izler: 28 gün, yalnız bugünün ödülü alınır; 7, 14, 21 ve 28. günler (Pazar) büyük ödüldür.

### Sezon ödül yolu: ücretsiz ve ücretli geçiş (Beta.72 arayüz turu)

Sezon ödülleri iki sütundur. Solda ücretsiz yol, sağda ücretli geçiş vardır. Her kademe sandık olarak görünür; sandığa dokununca içindeki ödüller gerçek görselleriyle önizlenir. Ücretli geçiş sütunu her kademede ücretsiz ödülün **iki katı** kaynak (Devre Kredisi, Akı, modül ve çekirdek parçası) ve iki sandık verir. Kozmetikler ücretsiz yolda kalır. Geçişin etkin olduğu sezon profilde tutulur ve sezon değişince sona erer; ücretli kademe talepleri de sıfırlanır. Geçişi açma düğmesi sağ sütunda, "ÜCRETLİ GEÇİŞ" başlığının hemen altında durur; üstünde ayrı bir bilgilendirme satırı yoktur (fiyat düğmenin üstünde yazar).

**Karar (25 Eylül 2026):** Ücretli geçiş gerçek parayla açılacak, ama şimdi değil; oyun içi para onu açmaz. Beta.68 sınırı geçerlidir: mağaza makbuz doğrulaması, idempotent teslim ve iade işleme tamamlanmadan fiyat açılmaz. Bu yüzden ücretli sütun kilitli görünür ve satın alma kapalıdır.

## 11.1. Sosyal katman ve mesaj kutusu

- **Mesaj kutusu** (üst bardaki ✉) tek bildirim merkezidir. Üç bölümü vardır:
  - Savaş davetleri: arkadaş savaşı ve takım antrenman maçı.
  - Etkinlik ve sıralama ödül sandıkları.
  - Oyun bildirimleri: oyun güncellemeleri ile takım turnuvası maç saati gibi oyuncuya özel bildirimler.
  - Okunmamış öğe varken kutuda kırmızı nokta yanar.
  - Kutunun boyu sabittir (en çok 600 piksel; içeriğe göre büyüyüp küçülmez); başlık ve sekmeler yerinde durur, liste kayar. Her alan (savaş davetleri, savaş sandıkları, ödül sandıkları, satın alım mesajları, oyun bildirimleri) en çok 20 kayıt gösterir (13 Ekim 2026). Sınırın dışına düşen satın alım mesajı ve bildirim kutudan kalkar. **Toplanmamış sandık silinmez:** en yeni 20'si görünür, toplandıkça sıradakiler kutuya girer (`MAILBOX_AREA_LIMIT`, `server/app/reward_delivery.py`).
- **Kupasız savaş daveti:** Arkadaşlar → Savaş sekmesinden gönderilir. Liste çevrimiçi arkadaşlardan başlar. Davet karşı tarafın mesaj kutusuna düşer ve **Kabul Et** onu doğrudan savaş alanına götürür. Daveti gönderen oyuncu da, aynı oturumda gönderdiyse kabul anında otomatik olarak savaş alanına geçer. Aynı arkadaşa bekleyen bir davet varken yenisi açılmaz; davet reddedilebilir. Takım üyeleriyle yapılan kupasız antrenman istekleri de aynı mesaj kutusuna düşer.
- **Üç çizgi menüsü** (üst barda mesaj kutusunun sağında): dokununca Kozmetik, Ödüller, Arkadaş ve Ayarlar alt alta listelenir; dokunulan sayfa açılır. Menünün dışına dokunmak yalnız menüyü kapatır. Profil, soldaki profil simgesinden doğrudan açılır; bu sayfaların altında sekme çubuğu yoktur ve ana ekrana alt çubuktaki Ev düğmesiyle dönülür.
- **Arkadaşlar ekranı:** beş alt sekme (Arkadaşlar, Mesajlar, Gelen İstekler, Gönderilen, Savaş), üstte davet kodu ve oyuncu arama.
  - Gelen istek, okunmamış mesaj ya da bekleyen savaş davetinde ilgili alt sekmede, menüdeki Arkadaş satırında ve üç çizgi düğmesinde kırmızı nokta yanar.
  - Gönderilen istek geri çekilebilir.
- **Herkese açık profil:** Devre Koleksiyonu (sıralama kupaları ve rozetler) ziyaretçilere de görünür. Arkadaş ekle, paylaş, şikâyet ve engelle eylemleri yan yana, etiketli düğmelerdir.
- **Takım sayfası:** takım durumu sunucudan gelene kadar yalnız "Yükleniyor…" görünür; takımı olan oyuncu "katıl / oluştur" ekranını görmez. Yükleme başarısız olursa hata ve yeniden deneme düğmesi çıkar. Profilde takım başlığı ve istatistikler ayrı kartlardır, onları saran ek çerçeve yoktur; üye sayısı istatistiklerin ilkidir, toplam kupa ikincidir. Profil, Üyeler, İstek, Sohbet ve Savaş alt sekme çubuğundadır.
- **Takım yönetimi** (takım başlığının sağındaki üç çizgi düğmesi; yalnız liderde görünür): dokununca Kozmetik ve Üye Yönetimi alt alta listelenir; dokunulan sayfa açılır, geri düğmesi profile döndürür. Bekleyen başvuru varken düğmede kırmızı nokta, Üye Yönetimi satırında başvuru sayısı görünür.
  - Kozmetik: Lider Görünümü. Amblem (10), çerçeve (6) ve isim rengi (6) herkese açık seçeneklerdir ve Kaydet ile uygulanır. Turnuvada kazanılan takım kozmetikleri ayrıca listelenir.
  - Üye Yönetimi: başvurular, üyeyi çıkarma ve liderliği devretme.
  - Başka bir takımın profilinde yönetim düğmesi görünmez.
- **Kartlar — yükseltme göstergeleri (12 Ekim 2026):** yükseltilebilir modül ve çekirdek kartının sağ üstünde, yukarı doğru hareket eden yalın yeşil ok durur (daire içinde değildir). "Yükseltilebilir", bilgi ekranındaki Yükselt düğmesinin açık olmasıdır: kart açık, azami seviyede değil, parça (modülde evrensel parça dahil) ve Devre Kredisi (çekirdekte Akı) yetiyor. Seçilebilir yetenek de aynı oku yakar ve bilgi ekranındaki Yetenekler sekmesinde ok görünür. Böyle bir kart varken alt çubuktaki Kartlar düğmesinde yeşil ışık yanar. Hareket azaltma tercihinde ve Düşük grafik ayarında ok durur.
- **Kart bilgi ekranı:** seviye ve parça satırının altındaki üç kutu modülde CAN, modülün kendi çevrimi (adı modüle özeldir: "BLOK ARALIĞI", "SALDIRI ARALIĞI" …; çevrimi olmayan modülde "SÜREKLİ") ve modülün asıl işidir (saldırı modülünde HASAR, diğerlerinde modüle özgü ilk değer: BLOK, YANSITMA, ONARIM …); çekirdekte ENERJİ, DEPO ve YETENEK. Kutularda ve İstatistik sekmesindeki karolarda değerin yanında eşleşen renkli simge durur. Bir sonraki seviyede değişen değerin yanında fark yeşil yazar (artışta "+değer", kısalan beklemede "-değer"); ayrı bir "sonraki seviye" kutusu yoktur. Akım maliyeti İstatistik sekmesindedir.
- **Görsel dil (13 Ekim 2026, kullanıcı isteği):** yazıların yanında eşleşen renkli simgeler durur (üç çizgi menüsünün satırları, bölüm başlıkları, bilgi penceresinin sekmeleri ve değer karoları). Simgeler tek takımdır (`UI_ICON_PATHS`, `client/src/app.js`): renkli zeminli küçük karo, içinde beyaz çizgi simge. Bedeller para biriminin adıyla değil simgesiyle yazılır (Yükselt düğmesi, yetenek bedeli, mağazadaki sandık fiyatı). Alt çubuk ayrık hücrelidir ve her düğmenin kendi rengi vardır; adı yalnız açık sayfanın düğmesi yazar, o düğme genişler ve yukarı doğru uzar, diğerleri yalnız simgedir (13 Ekim 2026, kullanıcının kararı). Ev ekranı ve sayfalar desenli düz zemin kullanır; renk üstteki nesnelerden gelir. Savaşta Çekirdek gücü düğmesi dolumu çevresindeki halkayla gösterir; hazır olunca halka döner, düğme nabız gibi atar ve etiketi "HAZIR" olur.
- **Görsel tur 4 (13 Ekim 2026):** yüzey dili bir kademe sakinleşti: kontur 1 piksel, alt dudak 2 piksel (çevresinde koyu halka yok), geçişler daha az parlak, köşeler daha az yuvarlak; aşağıdaki maddenin yapı taşları ve renk kuralı aynıdır. Başlık ve düğme yazısı **Oxanium**'dur (Türkçe harflerin hepsi kendi çiziminde; `size-adjust:%109`); Orbitron yalnız GRIDSHARD marka yazısındadır. **Çekirdek amblemi** (altıgen metal yuva, çekirdeğin renginde kristal, çekirdeğe özgü işaret, dönen iki yörünge) çekirdeğin göründüğü her yerde aynı çizim ve aynı harekettir: ev ekranı, Kartlar → Çekirdek, bilgi penceresi, savaş alanındaki iki çekirdek hücresi (hücrenin tam ortasında) ve Çekirdek gücü düğmesi, maç sonu, profil, Devre Yolu. Savaşta emoji düğmesi savaş alanının sağ alt köşesindedir. Alt çubukta beş düğmenin rengi ayrıdır (Mağaza altın, Kartlar mavi, Ev turkuaz, Takım mor, Etkinlik pembe). Profildeki Devre Koleksiyonu bütün kupa ve rozetleri yuva olarak gösterir; kazanılmayan soluktur.
- **Görsel tur 5 (13 Ekim 2026): modül amblemleri.** Her modül, sandıklar ve Çekirdek amblemiyle aynı dilde çizilmiş amblemiyle gösterilir (dolu gövde, aydınlık ve gölge yüz, koyu kontur; renk sınıftan: saldırı kırmızı, savunma mavi, destek yeşil, sistem turkuaz, sabotaj mor). Çizim `client/src/battle/module-card-view.js` içindedir (`emblemFor`); yeni modül eklenirken tabloya amblemi de eklenir (yoksa sınıf renginde genel yonga çizilir). Bilgi pencerelerinde (modül ve çekirdek) ad ve enderlik rozeti üstte ortada, amblem arkada aşağıda ortadadır ve rengini arkaya yayar. Yapboz parçasının üstündeki amblem beyazdır ve parçanın girintilerinin dışında kalan dolu alanın ortasında durur. Enderlik rozeti modülde ve çekirdekte aynıdır (karo ve pencere). Ev ekranında deste paneli her ekranda aynı boydadır; uzun ekranda artan yükseklik lig kartı ile panel arasına gider. Mağazada dört sandık kartı ilk ekrana sığar; hediye ve alım hakkı yenilenme notları Ödül Listesi penceresindedir.
- **Görsel tur 6 (13 Ekim 2026).** Bildirim noktaları dolu boncuktur (aydınlık üst yüz, gölgeli alt yüz, koyu kontur, altında dudak; kırmızı bekleyen bildirim, yeşil yükseltme hazır); yükseltme oku yalın oktur ama aynı dilde çizilir (aydınlık sol yüz, gölgeli sağ yüz, kontur). Kaydırma çubuğu hiçbir sayfada görünmez. Ev ekranında deste, çekirdeğin sahnesinde (altıgen ızgaralı zemin) koyu şerit olmadan durur; zeminin arkasındaki soluk çekirdek katmanı yoktur. Kart karosu 360 genişlikte yaklaşık 94 pikseldir; karta dokununca açılan kutuda Bilgi mavi, desteye ekleyen düğme yeşil, çıkaran kırmızıdır (26 piksel). Bilgi pencerelerinde ad, enderlik ve amblem birbirine yakındır (başlık alanı 88 piksel); **üç bilgi hücresi en çok iki satırdır** (üstte simge ve tek satır etiket, altta değer ve bir sonraki seviyenin farkı tek satır; sığmayan etikette hücrenin simgesi çizilmez). Çekirdek yetenekleri modül yetenek ağacıyla aynı tasarımdadır (her eşikte iki dal, ortada seviye rozeti ve Akı bedeli; açıklama dokununca üstteki satırda yazar). **Yazı ölçüsü** mesaj kutusudur: pencere başlığı 14,4, bölüm başlığı 9,6–11,5, satır başlığı 9,3–9,6, açıklama 8,8 piksel; 8 pikselin altına inilmez. Alt çubukta seçilen düğme yerine anında oturur, hareket yalnız konum ve opaklıkla yapılır; Devre Yolu yalnız penceresi açıkken çizilir. Giriş (yükleme) ekranı oyunun desenli mavi zeminindedir; marka amblemi ve mağaza simgesi aynı dilde yeniden çizildi (`tools/generate_brand_assets.py`). Modülün adı "Onarım"dır ("Onarım Modülü" değil).
- **Yüzey dili (13 Ekim 2026, görsel tur 3):** desenli zeminin üstündeki her şey dolu bir nesnedir. **Levha** yükseltilmiş paneldir (mavi geçişli gövde, açık üst kenar, koyu kontur `#0a1024`, altta dudak): kartlar, satırlar, pencereler. **Yuva** levhanın içine gömük hücredir: değer kutuları, giriş alanları, etkin olmayan sekme ve düğme. **Düğme** kalın gövdelidir, alt dudağı vardır, basınca iner; rengi işini söyler: altın ana eylem ve hazır ödül, yeşil satın alma ve ödül alma, mavi gezinme, turkuaz seçili sekme ve ikincil eylem, kırmızı kapatma ve silme. **Şerit** bölüm başlığıdır (renkli bant, solunda simge). Düz koyu bölüm kutusu kullanılmaz. Enderliğin rengi her yerde aynıdır: sıradan çelik, ender mavi, destansı mor, efsanevi altın. Sayılar birimiyle yazılır; bir sonraki seviyenin farkı da ("−0,01 sn", "+%2"). Kartın parçası ile evrensel parça ayrı gösterilir. Ev ekranının ortasında seçili Çekirdeğin çizilmiş amblemi durur (`coreEmblemSvg`, `client/src/app.js`). Stiller `client/src/canon.css` sonunda "Görsel tur 3" bloğundadır; `color-mix` kullanmaz.
- **Sandıklar ve kaynak simgeleri (13 Ekim 2026, kullanıcı isteği):** nesneler dolu çizilir: gövde, aydınlık ve gölge yüzey, koyu kontur. Mağaza sandıkları (Bronz, Gümüş, Altın, Elmas) lig sandıklarıyla aynı dildedir ama ayrı çizimdir: pahlı düz kapak, ortada tek kuşak, baklava kilit; kademe yükseldikçe süs artar (oluk, köşebent, taç, kristal). Aynı çizim mağazada, posta kutusunda, sezon yolunda, turnuva ödüllerinde ve sandık açılışında kullanılır (`shopChestSvg`). Akı mor kristal, Devre Kredisi devre darbeli altın paradır; Akım, deneyim, kupa, çekirdek parçası ve takım puanı aynı takımdandır (`RESOURCE_TOKEN_SVG`). Modül parçası sınıf renginde dolu bir yapboz parçasıdır; evrensel parça altın rengi ve yıldızlıdır.
- **Lig sandıkları (13 Ekim 2026, kullanıcı isteği: "şeffaf olmasın, fiziksel olarak orada olsunlar"):** dolu çizilir (gövde, metal köşebent, perçin, kapak, kilidinde ligin amblemi) ve her ligin kendi rengi vardır. Havada süzülmez, yolun üstünde durur; alınabilir sandık yerinde zıplar, alınmış sandık kapağı kalkmış ve boş görünür. Ulaşılmamış aşamadaki sandık rengini korur. AL'a dokununca sandık açılış penceresinde açılır: titrer, sunucu ödülü onaylayınca kapağı kalkar, ışık patlar ve ödüller sırayla belirir.
- **Kozmetikler:** kilitli seçeneğin altında yalnız "KİLİTLİ" yazar; nereden kazanıldığı yazmaz (ödüller dönemden döneme değişecektir). Oyuncu ve takım kozmetiklerinde aynıdır.
- **Günlük meta "Akım Desteği":** etki satırı "Akım üretimi +%15" yazar ve kural budur (D16, 12–13 Ekim 2026): savaştaki Akım %15 daha hızlı yenilenir (2,5 sn yerine yaklaşık 2,17 sn'de bir). Batarya, Kapasitör ve Akım Dengeleyici'nin etkisini artıran eski kural kalktı.
- **Bilgi ekranında enerji (D14):** "ENERJİ TÜKETİMİ" modülün saniyede gerçekten harcadığı enerjidir (sürekli bakım + aksiyon bedelinin bekleme süresine bölümü); Batarya "ENERJİ ÜRETİMİ" gösterir. Batarya dışında her modül enerji tüketir.
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
