# GRIDSHARD: sade kurallar, anlaşılır modüller, belirgin çekirdekler

29 Ekim 2026. **Mevcut GRIDSHARD için değişiklik önerisi; uygulanmadı.**
Bu çalışma oyun motorunu, savaş alanını veya oyunun türünü değiştirmeyi
önermiyor. Devre tahtası, altılı deste, kart koleksiyonu, arenalar ve
Devre Yolu devam eder. Daha önceki tasarım dosyaları bu planın zorunlu
kuralları değildir. Bu tur oyun kodu, telefon paketi ve oyuncu kayıtları
değiştirilmedi.

## 1. Sorun teşhisi

Oyuncu şu dört soruya savaş ekranından cevap verebilmeli:

1. Bu kartı neden şimdi koyayım?
2. Koyduğum kart hangi hedefe ne yapıyor?
3. Bir modül neden çalışmayı bıraktı?
4. Çekirdeğimin gücünü kullanınca ne değişti?

Bunlara cevap vermek için enerji üretimi, rezerv, dağıtım kaybı, bakım,
aksiyon tüketimi, ısı, aşırı ısınma, sınıf önceliği ve yetenek istisnalarını
birlikte hesaplamak gerekiyorsa, açıklama metni eklemek tek başına yeterli olmaz.

### Kodda doğrulanan mevcut durum

| Bulgu | Kaynak | Sonucu / yorum |
|---|---|---|
| 36 kart: 11 Saldırı, 7 Savunma, 3 Sistem, 10 Destek, 5 Sabotaj | `server/data/arena_progression_v1.json` | Kartların yarısı destek, sabotaj veya ekonomi işlevlerinde. Çok kart tek başına sorun değildir; açıklanması zor rol çakışmaları incelenmeli. |
| Batarya 4,5 enerji/sn üretir ve 20 enerji depolar; Kapasitör üretmez, 10 enerji depolar; Dengeleyici enerji giderini azaltır | `game/energy.py`, `game/catalog.py` | Üç kartın teknik işleri farklı. Üçünün de oyuncu için gerekli ve anlaşılır karar ürettiği bundan çıkmaz. |
| Çekirdek seviye 1'de 9 enerji/sn üretir; ayrıca başlangıç rezervi vardır | `game/energy.py` | Küçük devrede Batarya ihtiyacı hissedilmeyebilir. "Hiç işe yaramıyor" sonucu kullanım verisi olmadan kanıtlanmış değildir. |
| Bariyer hedef çeker, hasarı azaltır, sabotaj süresini kısaltır | `game/catalog.py` | Tek kart üç ayrı kural taşıyor. Sadeleştirme kartın içinden başlamalı. |
| Güçlendirici hasar yükü, Hedefleme bekleme azaltımı verir; toplam etki saldırılara bölünür | `game/catalog.py`, `game/support.py` | Sayısal olarak farklı fakat küçük ve dağıtılmış etkileri ekranda ayırt etmek güç olabilir. Bu, oyuncu geri bildirimiyle sınanacak tasarım yorumudur. |
| Normal hedef sırası Savunma → Sabotaj → Destek → Sistem → Saldırı; eşitlikler kimlikle çözülüyor | `game/combat.py` | Oyuncunun gördüğü yerleşim, hedef seçimini tek başına açıklamıyor. Hedef işareti ve sade seçim kuralı gerekiyor. |
| İki utility kopyası, sınıf başına üç aktif kart ve saldırı sayısına bağlı ek yerleştirme sınırı var | `game/composition.py` | Akımı yeterli görünen oyuncu yine de kart koyamayabiliyor. Engelin nedeni kartta görünmeli; son tasarımda kural sayısı ayrıca azaltılmalı. |
| İlk eğitim 24 sahne; Batarya/Soğutucu göstermek için enerji ve ısı sorunları hazırlanıyor | `game/tutorial.py` | Eğitim bütün alt sistemleri öğretmeye çalışıyor. Gerçek maçta aynı ihtiyaç görülmüyorsa öğrenilen öncelik anlamını kaybedebilir. |

## 2. Çekirdeklerin etkisi neden küçük hissedebilir?

Bu yalnız görsel bir sorun değil. Mevcut formüllerle yapılan salt aritmetik:

| Çekirdek seviyesi | Çekirdek CAN | Rezonansın çekirdeğe onarımı | Maksimum CAN'a oranı |
|---:|---:|---:|---:|
| 1 | 450 | 45 | %10,00 |
| 8 | 771 | 57 | %7,39 |
| 15 | 1.322 | 73 | %5,52 |

Çekirdek CAN'ı seviye başına ×1,08 büyürken bu güç ×1,035 büyüyor. Dolayısıyla
eşit seviye ilerlemesinde onarımın göreli büyüklüğü azalıyor. Bu, diğer bütün
çekirdeklerin aynı sorunu yaşadığını kanıtlamaz; her gücün ölçeği ayrı incelenir.

Seviye 1 Aşırı Yük, 35 saniyelik temel doluma karşı üç saniye +%25 hasar
veriyor. Kesintisiz saldıran sabit bir düzenin uzun dönem yalın hesabı
%25 × 3/35 ≈ **%2,14 ek ortalama hasar**dır. Zincir uzaması, yetenekler,
hedef kaybı, güç bekletme ve maçın bitişi bu hesapta yoktur. Bu gerçek maç
kazanma etkisi değildir; kısa güç penceresinin neden zayıf hissedebileceğini
gösteren bir referanstır.

İki yön birlikte düzeltilmeli: **etki büyüklüğü ve oyuncunun bu etkiyi okuması**.
Yalnız daha büyük animasyon, etkisiz gücü güçlü yapmaz. Yalnız sayıyı
artırmak da anlaşılmayan gücü anlaşılır yapmaz.

## 3. Tek savaş ekonomisi: Akım

Önerim, sade prototipte sürekli enerjiyi, depolarını ve dağıtım hesabını
kaldırmak. Kurulan modül, kendi açık çevrimiyle çalışır. Oyuncunun verdiği
ekonomi kararı: **hangi karta şimdi Akım harcayacağım, ne için bekleyeceğim?**

- İlk karşılaştırmada mevcut başlangıç 6 / depo 12 / 2,2 sn'de +1 korunur.
- Batarya, Kapasitör ve Akım Dengeleyici sade prototip kadrosunda bulunmaz.
- Bu kartları yeniden Akım üreten zorunlu kartlara çevirmem. O yaklaşım,
  deste içinde tekrar zorunlu bir ekonomi yeri yaratabilir.
- Genel ısı sistemi de bu prototipte kaldırılır. Enerjiyi silip ısıyı
  zorunlu işletme koşulu olarak bırakmak, aynı karmaşıklığın bir bölümünü sürdürür.
- Soğutucu bu nedenle prototipte bulunmaz. Ağır silahın bedeli; Akım,
  yavaş görünen atış çevrimi ve karşılık verilebilir hazırlık olur.

Enerji ve ısı kaldırıldığında gerçek atış sıklığı artabilir. Mevcut
hasar/CAN tablosunun yeni düzende dengeli kaldığı varsayılmaz. Tek bir
ayarı kapatıp aynı paketi yayınlamak doğru uygulama sırası değildir.

## 4. Üç sınıf; kart başına tek ana görev

| Sınıf | Oyuncunun sorusu | İçeriği |
|---|---|---|
| **Saldırı** | Rakibin devresini nasıl yıpratacağım? | Tek hedef, ağır vuruş, zırh delme ve alan baskısı. |
| **Koruma** | Kendi devremi nasıl ayakta tutacağım? | Kalkan, saldırıyı üstlenme, zırh ve onarım. |
| **Taktik** | Doğru anda nasıl avantaj kuracağım? | Belirgin güçlendirme veya kısa kesinti; az sayıda farklı görev. |

Sistem bağımsız sınıf olmaktan çıkar. Sabotaj bağımsız ana sınıf olmaktan
çıkar; korunan az sayıdaki müdahale Taktik içine girer. Onarım, oyuncunun
beklentisine uygun biçimde Koruma altında bulunur.

Bu sınıf birleştirmesi tek başına yeterli değildir. Aynı gizli kuralları
üç sekme altında toplamak sadeleştirme sayılmaz. İlk deney **10 kartla**
yapılır; bu sayı yayın kataloğunun toplamı değildir.

| Kart | Sınıf | Tek cümlelik yeni görev |
|---|---|---|
| Lazer | Saldırı | Bir hedefe düzenli ateş eder. |
| Darbe Topu | Saldırı | Görünür hazırlıktan sonra ağır bir atış yapar. |
| Ray Topu | Saldırı | Hedefin zırh azaltımının bir bölümünü aşar. |
| Ark Topu | Saldırı | Ana hedeften ikinci bir hedefe sıçrar. |
| Kalkan | Koruma | Belirli aralıkla bir vuruşu azaltır. |
| Bariyer | Koruma | Saldırıların hedefi olur; kendi CAN'ıyla diğer modülleri korur. |
| Zırh / mevcut Sönümleyici | Koruma | Kendi aldığı hasarı sürekli azaltır. |
| Onarım | Koruma | En yaralı dost modülü onarır; çekirdeği onarmaz. |
| Güçlendirici | Taktik | Bir dost silahı güçlendirir; hangi silah olduğu görünür. |
| EMP | Taktik | Bir rakip silahı kısa süre duraklatır; hedefte sayaç görünür. |

Bariyerin sabotaj temizleme ve ek azaltma görevleri, Zırhın kendi kendini
onarımı gibi ek işler ilk deneyden çıkar. Güçlendiricinin payını bütün
silahlara küçük oranlarla bölmek yerine bir silaha görünür katkı vermesi
tercih edilir. Aynı etki aynı hedef üzerinde sınırsız yığılmaz.

Onarım için en düşük CAN oranı, eşitlikte en eski yerleştirme; Güçlendirici
için en eski yaşayan silah başlangıç seçim adaylarıdır. Bağlanan hedef
yıkılınca sonraki geçerli hedefe geçilir. İki bağlantı da ekranda işaretlenir.
Oyuncunun elle hedef seçmesi ayrı bir kontrol deneyi olabilir; bu plan
onu bütün kartlara yeni zorunlu işlem olarak eklemez.

EMP için kısa etki, toparlanma bağışıklığı ve aynı hedefe zincir kilidi
olmaması gerekir. Onarım yığılması için tek hedefte en güçlü bağ kuralı
denenir. Bunlar taktik kartları zorunlu hale getirmemek için gözlenecek
denge sınırlarıdır; sayıları bu belgede nihai ilan edilmez.

## 5. Hedef seçimi ve kurulum da açıklanmalı

Beş sınıflı gizli hedef sırasının yerine ilk aday:

1. Çalışan Bariyer varsa normal ateş onu hedefler.
2. Yoksa en eski yerleştirilen yaşayan modül hedef olur.
3. Modüller bitince çekirdek hedef olur.

Hedefin üzerinde iki tarafın da görebileceği tek işaret vardır. Bir sonraki
hedefe geçiş görünürdür. Özel saldırılar, kartın söylediği ek hedef kuralını
izler. Bu sıra **mevcut kodun davranışı değil**, test edilecek değişikliktir.
Özellikle Onarımın sürekli ilk kurulan Bariyeri yaşattığı döngü ve odak
ateşinin modülleri fazla hızlı indirmesi ölçülmelidir.

Otomatik yerleşim ilk deneyde korunabilir; kartı koymadan önce gideceği
boş hücre belli edilir. Elle hücre seçimini, yeni ön/arka hat kurallarını
ve enerji kaldırmayı aynı deneye yığmam. Konum stratejisi daha sonra ayrıca
incelenebilir; bu sadeleştirme planının ön şartı değildir.

Mevcut sınıf kotaları ve saldırı/utility farkı yeniden ele alınır. Kopya ve
slot sınırını tek bir açık kurala indirme deneyi yapılır. Akımı yeten kartın
konamaması durumunda gerekçe düğmenin üzerinde görünmelidir. Deste kotası
ve bütün sınıflardan kart bulundurma zorunluluğu yeni bir karmaşıklık olarak eklenmez.

## 6. Çekirdek, takımın karakteri olmalı

İlk tasarım ölçütü: **oyuncu çekirdek değiştirince nasıl oynayacağının
değiştiğini hissedebilmeli.** Her çekirdek için tek belirgin ana güç;
aynı güç içinde az sayıda hedef ve açık sonuç.

İlk testte Rezonans, Muhafız ve Aşırı Yük yeterli. Diğer dört çekirdek
aynı anda yeniden dengelenmez; aşağıdaki kimlik yönleri sırayla sınanır.

| Mevcut çekirdek | Yeni ana güç yönü | Savaşta okunacak sonuç |
|---|---|---|
| Rezonans | Çekirdeği ve en yaralı iki modülü anlamlı bir CAN oranıyla toparlar. | Üç hedefte belirgin CAN artışı ve gerçekleşen onarım sayısı. |
| Muhafız | Çekirdeğe ve iki korunan modüle kısa süreli, ölçülebilir kalkan verir. | Kalkan şeridi, süresi ve emilen gerçek hasar. |
| Aşırı Yük | İki silahın sonraki üç atışını güçlendirir. | Silahların üstünde üç yük; atışla yüklerin azalması ve ek hasar. |
| Kesinti | Seçilen tek düşman silahını kısa süre duraklatır. | Duran silah ve açık geri sayım; bütün devre bir anda kapanmaz. |
| Kapasitör | Kurulum için anlık Akım kazandırır; başlangıç adayı +3. | Akım çubuğunda gerçek artış ve yeni oynanabilir kart. |
| Anka | Bir yok olmuş silahı, bir kez, kısmi CAN ile geri getirir. | Görünür yeniden kurulum; çekirdeği veya başka Anka etkisini diriltmez. |
| Kuantum | Kullanırken onarım veya kalkan seçer; uzman çekirdeklerin iki gücünü birlikte vermez. | İki açık seçimden yalnız biri uygulanır; ileri arena esneklik seçeneği. |

Bu etkiler birlikte aktif değildir; her oyuncu seçtiği tek çekirdeğin
gücünü kullanır. Kuantumun iki seçimli arayüzü yalnız ileri aşamada denenir.
Ankanın diriltmesi oyuncu başına ortak bir kez sınırı taşır; kart kopyalama
ve diriltme döngüsü açılmaz. Kapasitör kullanımı tavanda boşa harcanmamalı;
Akım kazancı gerçekleşemiyorsa dolum korunur veya etki önceden açıkça gösterilir.

Onarım/kalkanın düz sayıdan ziyade seviye ile tutarlı pay kullanması
incelenir. Başlangıç denemesinde yaklaşık %15–20 düzeyi düşünülebilir;
hangi hedeflerin dahil olduğu ve toplam etkisiyle birlikte ölçülür. Bu
oranlar dengesi doğrulanmış değerler değildir. Aşırı Yük için de üç atış
işareti, oranı belirlenmiş bir son ürün anlamına gelmez.

İlk güç dolumunu yaklaşık 20 saniyede, sonraki kullanımları mevcut 35
saniye referansıyla denemek anlamlıdır. Dolumun tek ana nedeni zaman olur;
öldürme/ölüm/enerji taşmasıyla birkaç gizli dolum kuralı daha eklenmez.
Güç hazırken adı yazılır: **ONARIM HAZIR**, **KALKAN HAZIR** gibi.

İlk sade prototipte çekirdek ve modül yetenek ağaçları devre dışıdır. Böylece
temel kartın anlaşılması yetenek istisnalarından ayrı sınanır. Bu, canlı
hesaptaki yeteneklerin silinmesi veya harcanan kaynağın kaybedilmesi değildir.
Temel düzen başarılı olduktan sonra az sayıda, açık alternatif geri eklenebilir.

## 7. Geri bildirim: daha çok efekt değil, kaynak ve sonuç

| Olay | Oyuncunun görmesi gereken |
|---|---|
| Saldırı | Hedef işareti, çıkan atış, düşen CAN. |
| Onarım | Kaynaktan hedefe kısa bağlantı ve gerçek +CAN. |
| Güçlendirme | Hedef silahın işareti; güçlendirilmiş atışta ek katkı. |
| Kesinti | Hangi modülün durduğu ve kaç saniye kaldığı. |
| Koruma | Gelen atışın hangi korumada karşılandığı; kalkanın azalması. |
| Çekirdek gücü | Gücün adı, etkilenen az sayıda hedef ve sayısal sonuç. |
| Kart konamıyor | Akım, boş hücre veya açık kopya sınırından hangisi engelliyor? |

Bütün modüllerin üstünde aynı anda rozet yığını tutulmaz. Seçilen veya
o anda etkilenen hedefe bilgi verilir. Kart açıklaması önce tek ana cümle,
sonra isteyen oyuncuya sayısal ayrıntı sunar. Telefon rafındaki ad ve ikonlar
yeniden daraltılmaz; son onaylanan tek satırlı görünüm korunur.

## 8. Mevcut 36 kartın değerlendirme yönü

Bu tablo **kayıt dönüşümü talimatı değildir**. Kimlikler, yatırımlar ve
ödüller korunacak bir geçiş tasarımı hazırlanması için inceleme sınıflandırmasıdır.

| Kimlik | Kart | Bu plandaki ilk işlem |
|---|---|---|
| laser | Lazer | Temel 10; tek hedef saldırısı. |
| shield | Kalkan | Temel 10; tek blok görevi. |
| battery | Batarya | Enerjisiz prototip dışında; yatırım dönüşümü ayrıca. |
| cooler | Soğutucu | Isısız prototip dışında; zorunlu bakım rolü taşınmaz. |
| emp | EMP | Temel 10; tek silah kesintisine indirgenir. |
| amplifier | Güçlendirici | Temel 10; tek silaha görünür güçlendirme. |
| repair | Onarım | Temel 10; tek modül onarımı, Koruma sınıfı. |
| armor | Zırh / Sönümleyici | Temel 10; azaltma var, kendini onarma yok. |
| pulse_cannon | Darbe Topu | Temel 10; hazırlığı görünen ağır atış. |
| missile_launcher | Füze Fırlatıcı | İleri saldırı; küçük alan görevi Ark zincirinden ayırt edilmeli. |
| targeting_computer | Hedefleme Bilgisayarı | Görünmeyen hız desteği yerine açık hedef seçimi görevi kanıtlanmalı; aksi halde birleştirme adayı. |
| barrier | Bariyer | Temel 10; yalnız hedef üstlenme. |
| arc_cannon | Ark Topu | Temel 10; açık ikinci hedef. |
| capacitor | Kapasitör | Enerjisiz prototip dışında; yatırım dönüşümü ayrıca. |
| drone_bay | Dron Üssü | İleri saldırı; çoklu küçük isabetle blok karşılığı olabilir. |
| jammer | Sinyal Bozucu | Yalnız gerekirse açık onarım karşılığı; genel destek verimi hesabı kaldırılır. |
| railgun | Ray Topu | Temel 10; zırh delme. |
| current_balancer | Akım Dengeleyici | Enerjisiz prototip dışında; Akım üreten zorunlu karta çevrilmez. |
| reflector | Yansıtıcı | İleri Koruma; yansıtma korunur, ek azaltma/hedef çekme aynı karta yığılmaz. |
| nano_medic | Nano Sağlıkçı | İleri Koruma; iki hedefte düşük onarım, hedef başına yığılma yok. |
| virus | Virüs | İleri saldırı olarak açık süreli hasar adayı; genel sabotaj etiketiyle gizlenmez. |
| overclock_unit | Aşırı Hızlandırıcı | Krono ailesiyle rol çakışması; yalnız bir görünür tempo görevi seçilir. |
| plasma_mortar | Plazma Havanı | Füze ile aynı alan görevini yapıyorsa birleştirme adayı. |
| guardian_dome | Muhafız Kubbesi | İleri Koruma; görsel sınırı belli alan kalkanı. |
| quantum_repeater | Kuantum Tekrarlayıcı | Lazer/Dronun yalnız hızlı sürümü olmadan ayrı görev göstermeli. |
| chrono_relay | Krono Rölesi | Tek görünür tempo görevi adayı; hızlandırıcıyla birlikte gereksiz çoğaltılmaz. |
| phase_armor | Faz Zırhı | İleri Koruma; kısa, görünen koruma penceresi; üç savunma işini birleştirmez. |
| swarm_fabricator | Sürü Fabrikatörü | Dronla aynı görevi yapıyorsa birleştirme adayı. |
| precision_matrix | Hassasiyet Matrisi | Hedefleme/güçlendirmeden ayrı görev yoksa birleştirme adayı. |
| ion_spear | İyon Mızrağı | Raydan ayrı karar üretmiyorsa delici silah ailesinde birleştirme adayı. |
| prism_shield | Prizma Kalkanı | Enerji dönüşümü yeniden tanımlanmalı; ayrı Koruma rolü göstermeden eklenmez. |
| disruptor | Kesici | Enerji hedefleme işi kalkar; EMP ailesinde değerlendirilir. |
| phoenix_repair | Anka Onarım | İleri Koruma; tek açık onarım tetikleyicisi; çekirdeğin diriltmesiyle aynı işi yapmaz. |
| quantum_cannon | Kuantum Topu | Fazla enerji biriktirme yerine görünen atış sayacıyla ileri saldırı adayı. |
| omega_amplifier | Omega Güçlendirici | Güçlendiricinin yalnız sayısal üstün sürümü olmamalı; birleştirme adayı. |
| singularity_projector | Tekillik Projektörü | EMP'den farklı, okunur rol kanıtlamalı; genel susturma kartı sayısını büyütmemeli. |

## 9. Devre Yolu ve oyuncu yatırımları

On kart, test etmek için seçilen küçük kadrodur. Mevcut on iki arenanın
yayın koleksiyonu on karta indirgenirse her arenada yeni kart hedefi
karşılanamaz. İlk arenada altı kart ve sonraki her arenada en az bir yeni
kart için **en az 17 kart** gerekir: 6 + 11. Lig açılımları bunun üzerindedir.

Yayın kadrosu şu iki koşulla seçilir: kartın farklı bir işi olmalı ve
arena boyunca yeni seçenek açmalı. İlk arenada bütün alt sistemleri
öğretmek yerine iki saldırı, açık koruma ve bir basit taktikle başlanabilir.
Hangi kartın hangi eşiğe taşındığı, değişen sandık ve ödüllerle birlikte
tek tabloda hazırlanır. Boş arena veya geçersiz kayıtlı deste bırakılmaz.

Birleşen/yeniden tanımlanan kartın seviyesi, parçaları, harcanan kredisi,
Akısı ve seçilmiş yetenekleri tek tek karşılanmalıdır. Önerilen rol
sınıflandırması otomatik silme veya kayıplı birleştirme onayı değildir.
Mevcut yedi çekirdeğin yatırımı da aynı kapsamda korunur.

## 10. Uygulama ve test sırası

1. **Sade kural sözleşmesi:** Akım, çalışma çevrimi, hedef seçimi, koruma,
   onarım ve kesinti için tek sayfalık davranış tanımı. Bu belge ilk adaydır.
2. **Enerji/ısı deney modu:** mevcut kod içinde ayrı, sürümlü test kuralları;
   bütün enerjiye bağlı kart, yetenek ve çekirdek kancaları hesaplanarak
   dönüştürülür. Akım başlangıcı/deposu/dolumu ilk karşılaştırmada aynı.
3. **On kart ve görünür hedef:** büyük yetenek ağaçları olmadan kartın ana
   işi, kaynak/hedef işaretleri ve kısa başlangıç eğitimi denenir.
4. **Üç belirgin çekirdek:** önce Rezonans/Muhafız/Aşırı Yük; diğer dördü
   temel etkiler ölçüldükten sonra. Dolum, miktar ve hedef sayısı ayrı deneyler.
5. **Denge ve gerçek oyuncu:** 1/8/15 seviyelerde taraf değiştirilen
   eşleşmeler, farklı karar politikaları, uzun onarım düzenleri, modül
   yaşam süresi ve çekirdek gücünün gerçek katkısı. Gözlem süresi oyun
   kuralına dönüştürülmez. Akım ayarı bu veriden sonra ele alınır.
6. **Tam içerik/geçiş tablosu:** 36 eski kimlik, 7 çekirdek, yeni arena
   kartları, geçerli desteler, ödül/mağaza ve yatırım eşlemesi. Sonra
   telefon ve eski kayıt üzerinden güncelleme deneyi.

Enerji kaldırma, yeni hedef düzeni ve çekirdek güçleri ayrı karşılaştırma
adımlarıyla ölçülür; tek seferde bütün sayıları değiştirip neyin işe
yaradığını belirsizleştirmem.

### Oyuncu testi kabul hedefleri

Yeni oyuncuya ön açıklama yapmadan iki kısa maç verilir. Ardından oyuncu:
Akımın ne için olduğunu, seçtiği iki kartın kimi etkilediğini, bir saldırının
neden durduğunu ve çekirdek gücünü ne zaman kullanacağını anlatabilmeli.
İlk küçük test grubunda tekrar eden yanlış anlamalar, kazanma oranından
önce düzeltilir. Bu çalışmada yeni oyuncu testi veya yeni denge simülasyonu
yapılmış değildir.

İlk eğitim üç görünür işi öğretir: silah koyup hedefi vurmak, korumayla
bir silahı yaşatmak, çekirdeğin gücüyle belirgin bir karşılık vermek.
Destek etkileşimleri ve ileri karşılıklar sonraki maçlarda açılır.

**Öneri:** GRIDSHARD'ın görsel kimliğini ve Devre Yolu'nu koruyarak,
tek ekonomi, üç rol, az sayıda ana mekanik ve belirgin çekirdek güçleriyle
mevcut oyunu sadeleştirmek. Sadeleştirmenin başarısı, oyuncunun daha kısa
metin görmesi kadar savaşta ne olduğunu anlayabilmesiyle ölçülür.
