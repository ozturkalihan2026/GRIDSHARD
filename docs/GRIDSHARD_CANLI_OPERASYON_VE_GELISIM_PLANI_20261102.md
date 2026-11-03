# GRIDSHARD — canlı operasyon, yeni ödüller ve oyun modları planı

> 3 Kasım 2026 yayın durumu: 2.3.0 sunucuya geçirildi; 15 kozmetik kilitli
> önizlemeli, 11 geri düğmesi ortak yalnız-ok tasarımında. İmzalı AAB code14
> teslim edildi. 52 mevcut profil ve kozmetik sahipliği yedek/izole restore
> ile korundu; tüm CI işleri geçti. Kullanıcı AAB'nin kullanıcılara sunulduğunu
> teyit etti; fiziksel cihaz sonucu ayrıca bildirilmedi. 2.4.0 geliştirmesi başladı.
> Ayrıntı: [yayın kanıtı](RELEASE_2_3_0_ADAYI_20261103.md).


## 3 Kasım 2026 — güncel kapsam ve tarihli çalışma

2.3.0 sunucu/AAB yayını kullanıcı tarafından teyit edildi. Aktif geliştirme
2.4.0'dır. Kullanıcı mevcut 24 modülle ilk sezon açılışını seçti; yeni modül
ve geniş sanat üretimi sonraki paketlere bölündü.

- [Ödül portföyü ve tarihli sürüm takvimi](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md): kozmetik dışı ödüller, haftalık işler, hedef/tahmin ayrımı.
- [2.4.0 güncel kapsamı](RELEASE_2_4_0_GELISTIRME_PLANI_20261103.md): ilk sezona özel kural, kaynak haftaları, kapanış ve istemci uyumu.
- [Kontrol listesi](GRIDSHARD_GELISIM_CHECKLIST_20261103.md) ve [backlog](planning/gridshard_development_backlog_v1.json): güncel 54 iş, bağımlılık ve kabul ölçütleri.
- [Takvimin tarih kaynağı](planning/release_calendar_v1.json): 23 Kasım 2.4.0 yayını, 30 Kasım S1 başlangıcı çalışma hedefidir.

Bu plan canlı fiyatı, sahipliği veya başlangıç ayarını değiştirmez. Aşağıdaki
2 Kasım araştırması ürün gerekçesi olarak korunur; güncel kapsam ve tarih için
bu bölüm, §9 ve yeni takvim geçerlidir.

---

Araştırma tarihi: 2 Kasım 2026. Durum: geliştirme planı. Aşağıdaki yeni oyun
modları henüz uygulanmadı. Kozmetik ve dönem ödülü temeli bu planla birlikte
`codex/liveops-foundations` dalında hazırlanmıştır; 2.2.1 yayın paketi ayrı tutulur.

## 1. Önerilen yön

**Bütün sürümler için sanat kararı:** mevcut onaylı boyalı/hacimli aile,
belirgin siluet, koyu lacivert yüzey ve fiziksel altın/turkuaz bileşenler
korunur. 2.3.0 bu yönü değiştirmez. Yön değişecekse önce brief, yan yana
örnekler, varlık/ekran envanteri, performans ve aşamalı geçiş işleri hazırlanır.
Kabul koşulları [ortak sanat yönü belgesinde](SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md)
ve checklist'in ortak tamamlanma tanımındadır.

Oyuncunun tekrar gelmesi için üç somut neden sunalım: bugün çözeceği kısa bir
strateji problemi, hafta boyunca katkıda bulunacağı takım hedefi ve her dönemde
gerçekten yeni bir koleksiyon ödülü. Mevcut savaşın okunabilirliği, bağlantı
güvenilirliği ve adil karşılaşmalar bu yapının temelidir.

Güncel yayın sırası: kilitli kozmetik önizlemesi → ölçüm/üretim hazırlığıyla
benzersiz dönem ödülleri → mağaza ve seçim kasası → günlük Devre Deneyi →
kısa PvE Seferi → takım ortak hedefi/ustalık → koşullu eşit seviyeli Draft Arenası.
Bu sıra GRIDSHARD'ın mevcut sunucu, AI ve 24 modüllük katalog yapısına göre
yaptığımız teknik değerlendirmedir; dış kaynakların GRIDSHARD için ölçtüğü bir
başarı sonucu değildir.

## 2. Araştırmadan çıkan bulgular

| Kaynakta gözlenen yaklaşım | GRIDSHARD için çıkarım |
| --- | --- |
| Clash Royale her sezon tema, meydan okuma ve yeni ilerleme ödülleri sunuyor; denge değerlendirmesinde kullanım ve kazanma verilerini birlikte ele alıyor. | Sadece takvimi sıfırlamak yerine her 28 günlük döneme yeni tema, kozmetik ve bir oyun deneyimi bağlayalım. [Resmî sezon açıklaması](https://support.clashroyale.com/hc/en-us/articles/49484919911451-Seasons). |
| Brawl Stars geliştiricileri 2026 değerlendirmelerinde çok sayıda kozmetik ve biriken kozmetik parasının her zaman daha fazla heyecan yaratmadığını belirtiyor; kendi yorum ve deney hipotezlerini açıkça ayırıyorlar. | Koleksiyonu rastgele şişirmek yerine ayırt edilebilir setler, oyuncunun seçebildiği hedefler ve görünür kazanım yolu tasarlayalım. Benzer bir mağaza değişikliğinin burada işe yarayacağını varsaymayalım. [Geliştirici değerlendirmesi](https://supercell.com/en/games/brawlstars/blog/news/changes-to-bling-shop-and-cosmetics/). |
| Roblox'un LiveOps rehberi hedef belirleme, önceden duyurma, ekonomi takibi ve etkinlik öncesi/sonrası karşılaştırmayı birlikte öneriyor. | Her etkinliğin tek ana amacı, ödül bütçesi, duyurusu ve kapanış raporu olsun. [LiveOps planning](https://create.roblox.com/docs/production/game-design/liveops-planning). |
| Unity'nin LiveOps mimarisi sunucu kodu, ekonomi, içerik dağıtımı, yapılandırma, takvim tetikleri ve analiz bileşenlerini ayrı hizmetler olarak ele alıyor. | Bizdeki Python/PostgreSQL/Redis temelinde aynı sorumlulukları ayıralım; yeni bir oyun motoruna veya ücretli hizmete geçmek gerekmez. [Unity LiveOps](https://docs.unity.com/en-us/liveops). |
| Clash Royale meydan okumalarında seviye sınırı uygulanıyor ve Mega Draft ayrı bir seçenek. | Eşitlenmiş seviyelerle kart seçme etkinliği, mevcut kartların öğrenilmesini ve farklı destelerin denenmesini destekleyebilir. [Classic Challenges](https://support.clashroyale.com/hc/en-us/articles/49484955959067-Classic-Challenges). |
| TFT'nin Tocker's Trials denemesi tek oyunculu PvE, planlama için serbest zaman ve aşamalı karşılaşmaları birlikte kullanıyor. | Aynı anda başka bir oyuncu bekletmeyen, kısa ve duraklar arasında sürdürülebilen bir PvE seferi deneyebiliriz. [Resmî mod tanıtımı](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/new-tft-workshop-mode-tockers-trials/). |
| Brawl Stars'ın kulüp etkinliklerinde üyeler ortak hedefi doldurarak takım ödülüne katkı veriyor. | Mevcut takım sisteminin üzerine kişisel katkı eşiği olan ortak PvE hedefi kurulabilir. [Mega Pig](https://support.supercell.com/brawl-stars/en/articles/mega-pig-2.html). |
| 2017 tarihli, tek bir çevrimiçi oyundaki gözlemsel araştırmada erken aşama başarı göstergeleri ve ileri aşama sosyal göstergelerin oyuncu devamlılığıyla ilişkileri farklılaşıyor. | Yeni oyuncuya öğrenme/ustalık hedefi, deneyimli oyuncuya takım ve prestij hedefi sunmayı hipotez olarak deneyelim. Bu sonuç nedensellik veya GRIDSHARD için garanti değildir. [Araştırma](https://arxiv.org/abs/1702.08005). |

## 3. Mevcut yapıyla bağlantı

- Savaş: `server/app/game/engine.py`, 24 aktif modül, üç sınıf ve mevcut Akım kuralları.
- Dönemler: `competition_cycle.py`, `competition_control.py`, `season_competition.py`, `team_tournament.py`.
- Oyuncu ve ödül teslimi: `player_profile.py`, `meta_progression.py`, `reward_delivery.py`.
- Kalıcılık: PostgreSQL işlem sınırları, ekonomik işlem makbuzları, sabit içerikli sandıklar.
- Arayüz: profil/takım kozmetik ekranları, Etkinlikler, Mesaj Kutusu ve mevcut bildirim altyapısı.

Sezon ve takım turnuvası başlangıçları operatörün mevcut açık başlangıç
kararlarına bağlı kalır. İçerik üretimi veya taslak oluşturma yarışmaları açmaz.
Yeni modlar mevcut normal savaş kurallarını değiştiren küresel ayarlar yerine
kendi sürümlü kural paketlerini kullanmalıdır. Otomatik yerleşim ve hedef
öncelikleri, bir mod açıkça farklı bir kural sunmadıkça korunur.

## 4. Yeni kozmetikler ve tekrar etmeyen ödül sistemi

Bu turdaki ilk stok üç temada toplam 15 öğedir:

| Tema | Oyuncu | Takım |
| --- | --- | --- |
| Kutup Işığı | Çift halkalı avatar çerçevesi, yay desenli profil zemini | Özgün arma, çift kenarlı takım çerçevesi, isim rengi |
| Güneş Ocağı | Kabartmalı çerçeve, ışın desenli profil zemini | Özgün arma, kabartmalı takım çerçevesi, isim rengi |
| Derin Akım | Kesikli çerçeve, dalga desenli profil zemini | Özgün arma, kesikli takım çerçevesi, isim rengi |

Hepsi başlangıçta kilitlidir. Sahiplik veya savaş gücü otomatik verilmez.
Oyuncu ve takım varsayılanları korunur. Bu ilk stok, sürekli üretimin yerine
geçmez; yayın takvimi için aşağıdaki üretim hattının işletilmesi gerekir.

### Dönem başına özgünlük kuralı

Her kozmetiğin kalıcı kimliği, tasarım kimliği ve görsel tanımı vardır. Bir
sezon/etkinliğe ayrılan öğe, başka bir döneme yeniden ayrılamaz. Yeni isim
verilmiş aynı görsel ve aynı motifin yalnız yeniden renklendirilmiş kopyası yeni
tasarım sayılmaz; isim rengi kategorisinde renk bizzat ürünün görsel niteliğidir.
Taslak da stok ayırır. Yayımlanmış/bitmiş dönemlerin kayıtları kalıcı tutulur.

Ödül para birimleri ve kart parçaları tekrar kullanılabilen ekonomi kaynaklarıdır.
Yenilik şartı dönemin koleksiyon/kozmetik ödüllerine uygulanır. Her basamakta
yeni bir kozmetik üretmek yerine her dönemin ayırt edilebilir ana ödülü bulunur.

### Üretim ve yayın hattı

1. En az iki 28 günlük dönem önceden içerik takvimi çıkar.
2. Dört kaynak için ayrı paket ayır: sezon yolu, sezon sıralaması, haftalık turnuva, takım turnuvası. Yeni modlara aynı kaynak sözleşmesi genişletilerek eklenir.
3. Yeni tema/tasarım brief'i üret; önceki tasarım kimliklerini ve siluetleri brief'e koyarak kopyayı engelle.
4. Mevcut vektör/CSS dilinde çerçeve ve zeminleri hazırla. Boyalı avatar veya büyük sanat gerekiyorsa görsel üretimi ve insan incelemesi ayrı adımdır.
5. 320px ve 393px önizleme, TR/EN adlar, kontrast, küçük boyutta tanınabilirlik ve dosya boyutu kontrolünden geçir.
6. Onaylanan öğeyi kataloğa ekle, arayüz katalog dosyalarını üret ve yeni dönem taslağına ayır.
7. Tarih, kaynak, sıra/kademe ve ödül eşleşmesini doğrula. Taslağı yayımlarken içerik özeti sabitlenir.
8. Dönem açılmadan önce yeterli yeni stok bulunduğunu denetle. Stok biterse yeni içerik üret; eski havuza geri dönme.
9. Kazanılan ödülün kimliği ve özeti makbuza/sabit sandık içeriğine girer. Daha sonraki takvim değişikliği kazanılmış hakkı değiştirmez.
10. Kapanışta kullanım, kazanım, teslim hatası ve sonraki dönemin stok açığını raporla.

28 günde dört haftalık turnuva, bir sezon yolu, bir sezon sıralaması ve bir takım
turnuvası için **yedi ayrı dönem paketi** düşünülmelidir. Önerilen ilk bütçe:
oyuncu paketinde bir çerçeve ve bir profil zemini, takım paketinde bir arma,
çerçeve ve isim rengi. İki dönemlik stok bu yaklaşımla 24 oyuncu ve 6 takım
öğesi, toplam 30 özgün öğe gerektirir. İlk 15 öğenin 6'sı oyuncu, 9'u takım
olduğundan iki dönem için en az 18 yeni oyuncu öğesi daha gerekir. Bu kapasite
hesabı bir üretim hedefidir; ilk stok hazır diye takvim otomatik açılmaz.

Teknik kullanım ve kilit/ödül testleri için
[kozmetik ve dönem ödülü işletim rehberine](KOZMETIK_DONEM_ODULLERI_ISLETIM_REHBERI.md) bak.

## 5. Oyuncunun geri gelme nedenleri

| Ölçek | Önerilen deneyim | Ödül ve oyuncu yükü |
| --- | --- | --- |
| Oturum | Oyuncunun seçtiği tek hedef: yeni deste dene, deneyi çöz veya takımına katkı ver. | 3–8 dakikada tamamlanabilen anlamlı ilerleme. |
| Gün | Herkes için aynı sunucu tohumuyla bir Devre Deneyi; farklı çözüm yaklaşımları. | İlk başarı sınırlı kaynak; tekrarlar skor/öğrenme. Bir gün kaçırmak kalıcı ceza doğurmaz. |
| Hafta | Bir dönüşümlü etkinlik ve takımın ortak hedefi. | Ayrı bir yeni kozmetik hedefi, görünür kişisel katkı. |
| 28 gün | Yeni tema, dönem yolu, yeni koleksiyon ödülü ve bir kural deneyi. | Kaynak bütçesi ve yeterli ücretsiz kazanım yolu önceden görünür. |
| Uzun vade | Modül/çekirdek ustalığı, farklı stratejilerle başarı ve takım vitrini. | Koleksiyon ve prestij; kozmetik savaş üstünlüğü sağlamaz. |
| Geri dönen oyuncu | Kısa “neler değişti” özeti ve birkaç maça yayılan öğrenme hedefleri. | Geçmiş ilerleme korunur; temel oyun sistemini tekrar öğretme seçeneği. |

Günlük meta, yeni deneyle aynı şey olmamalı: meta mevcut savaş planını etkiler;
deney ise çözülebilir bir hedef sunar. Başlangıçta aynı anda bir özel etkinlik
göstererek seçenekleri anlaşılır tutalım. Her mod için ayrı sürekli eşleştirme
kuyruğu açmadan önce aktif oyuncu sayısını ve bekleme sürelerini ölçelim.

Bildirimler oyuncunun açık tercihiyle, anlamlı olaylarda ve mevcut sessiz saat
kurallarına uyarak gönderilmeli. İlk sürümde oyun içi etkinlik kartı ve sürümlü
Sistem mesajları yeterli olabilir. Dış kanallara otomatik mesaj gönderimi bu
çalışmanın parçası değildir.

## 6. Yeni modların karşılaştırılması

| Mod | Temel oynanış | Mevcut sistemle uyum | Maliyet / ilk aşama |
| --- | --- | --- | --- |
| **Devre Deneyi** | Sabit AI, sunucu tohumu ve sınırlı deste ile kısa bir hedefi tamamla. | Mevcut motor ve AI tekrar kullanılabilir. Hücreyi oyuncu seçtirmek gerekmez. | Düşük–orta; ilk prototip. |
| **PvE Seferi** | Üç kısa karşılaşma, durak arası seçim ve son aşamada özel rakip. | AI arketipleri, mevcut çekirdekler ve ödül makbuzları temel olur. | Orta; ikinci prototip. |
| **Eşitlenmiş Draft Arenası** | Maçtan önce kontrollü kart seçimleriyle altılı deste kur; seviyeler eşit. | 24 kartı öğrenme ve yeni kombinasyon deneme fırsatı. | Orta; etkinlik penceresiyle dene. |
| **Takım Ortak Hedefi** | Üyeler farklı zamanlarda PvE karşılaşmalarından ortak ilerleme toplar. | Takım kimliği, katkı ve ödül teslimi kullanılabilir. | Orta; eşzamanlı dört oyuncu gerektirmez. |
| **Haftanın Kuralı** | Normal motorda tek, açık bir kural değişikliği; örneğin belli sınıfların sınırlı seçimi. | Yeni kart eklemeden strateji çeşitliliği. | Düşük–orta; normal sıralamadan ayrı değerlendirme. |
| **Ustalık Görevleri** | Aynı modülle farklı gerçek hedefler başar; sadece kullanım sayma. | Mevcut savaş muhasebesi ve başarım yolu genişletilir. | Orta; kalıcı ilerleme katmanı. |
| **Asenkron Meydan Okuma** | Arkadaşın paylaştığı kurulum veya tohuma karşı AI destekli deneme. | Canlı eşleşme gerektirmez; kayıt ve doğrulama gerekir. | Orta; sefer/deney altyapısından sonra. |
| **BO3 ve Deste Yasağı** | İki galibiyete ulaş; desteler arası kısa seçim/yasak aşaması. | Rekabetçi takım/turnuva hedeflerine uygun. | Orta–yüksek; yeterli aktif rakip oluşunca. |
| **2v2** | İki takım arkadaşıyla gerçek zamanlı koordinasyon. | Yeni savaş durumu, sahiplik, protokol ve mobil performans çalışması ister. | Yüksek; ileri aşama. |
| **Özel Arena/Boss Davranışları** | Rakibin aşamaları, değişen hedefler ve harita koşulları. | Motorun yeni kuralları sürümlendirmesi gerekir. | Orta–yüksek; PvE ölçümleri olumluysa. |

### İlk prototip: Devre Deneyi

- Giriş: Etkinlikler → Bugünün Deneyi; hedef ve ödül başlamadan görünür.
- Maç: sürümlü kural kimliği, sabit tohum, en fazla altı güncel kart; normal rastgele yerleşim ve hedefleme sözleşmeleri korunur.
- Başarı: yalnız sunucu savaş sonucundan hesaplanır; istemci “başardım” diyerek ödül alamaz.
- Tekrar: oyuncu yeniden deneyebilir; kaynak ödülü `(oyuncu, deney dönemi, ödül)` anahtarıyla bir kez verilir.
- Ekonomi: sınırlı ilk başarı kaynağı; sınırsız tekrar kaynak üretmez.
- Karşılaştırma: önce kişisel en iyi sonuç; küçük kitlede rekabet tablosu isteğe bağlı.
- Kayıt: gün değiştiğinde açık maç kendi tohum/kural/ödül anlık görüntüsüyle tamamlanır.

### İkinci prototip: PvE Seferi

İlk sürüm üç durakla sınırlandırılır. Oyuncu duraklar arasında ara verebilir.
Seçimler mevcut aktif kartlardan yapılır; ödül bütçesi sefer başında sabitlenir.
Tamamlama ve tekrar ödülü birbirinden ayrılır. İlk içerik paketinde üç farklı
rakip dizisi üretip aynı diziyi her hafta yeniden sunmak yerine yeni tohum,
deste problemi ve ana ödülle yeni sefer tanımlarız. Tohum değişikliği tek başına
anlamlı bir içerik yeniliği olarak kabul edilmemelidir.

## 7. Kalıcı gelişim işleri

1. **İlk deneyim:** ilk maçın anlaşılması, ilk anlamlı kart seçimi ve sonraki hedefin görünmesi. Mevcut zorunlu/isteğe bağlı eğitim kararlarını ölçümle değerlendir.
2. **Savaş sonrası öğrenme:** kısa bir neden özeti, kullanılan desteyi kaydetme ve tekrar oynama. Kayıt gizliliği ve eski kural sürümlerinin oynatılması ayrıca tasarlanır.
3. **Deste deneme alanı:** dengeli AI'ya karşı ödülsüz, hızlı deneme; sahip olunmayan kartlar için kısıtlı etkinlik denemeleri.
4. **Takım işbirliği:** katkı hedefi, takım vitrini, kozmetik kazanım geçmişi ve anlamlı roller. Mevcut güvenli sohbet modeli korunur.
5. **İçerik görünürlüğü:** sıradaki etkinliğin başlangıcı, ödül önizlemesi ve kazanılmış koleksiyon geçmişi.
6. **Denge araçları:** kart seçilme/kazanma oranı yanında seviye farkı, arena ve AI/insan ayrımıyla değerlendirme.
7. **Kalite:** küçük ekran, düşük güçlü cihaz, yeniden bağlanma ve uzun oturum bellek kontrolleri her yayın kapısında devam eder.

## 8. Ölçüm ve karar kuralları

İlk iki hafta mevcut oyunun baz çizgisi çıkarılmalı. Kayıtlı hesap sayısı aktif
oyuncu sayısı değildir; mevcut az sayıdaki hesap üzerinden kesin istatistik
iddiası kurulmaz. D1/D7/D28 devamlılık, yeni/geri dönen oyuncu ve platform
ayrımıyla raporlanır. Tamamlama, terk ve ödül toplama oranları ayrı tutulur.

| Soru | Ölçülecek veri | Karar |
| --- | --- | --- |
| Oyuncu ilk strateji kararına ulaşıyor mu? | İlk maç ve ilk deste değişimi hunisi, adım başına terk. | Öğrenme düğümlerini sadeleştir veya yeniden sırala. |
| Yeni mod geri dönüşü destekliyor mu? | Modu deneyenler/denemeyenler; dönem öncesi ve sonrası geri dönüş, segmentler. | Küçük örneklemde gözlemsel sinyal; yeterli örneklemde önceden tanımlı deney. |
| Ödül gerçekten isteniyor mu? | Önizleme, kazanım, kuşanma ve 7 gün sonra kullanım. | Düşük kullanımda sadece miktarı artırmadan tasarımı ve hedefi incele. |
| Takım etkinliği erişilebilir mi? | Takım büyüklüğüne göre katkı/tamamlama; tek kişinin katkı payı. | Küçük takımları baştan dışlamayan eşikler dene. |
| Ekonomi kontrol altında mı? | Günlük kaynak giriş/harcama, hak sahibi sayısı, çift teslim ve bekleyen haklar. | Beklenmeyen kaynak artışında etkinlik ödülünü durdur; kazanılmış hakları koru. |
| Teknik kalite korunuyor mu? | Hata/çökme, bağlantı kopması, maç terkleri, eşleşme beklemesi ve kare süresi. | Mevcut kalite eşikleri bozulursa yayılımı durdur. |

Yeni olaylar mümkün olduğunca mevcut analiz altyapısına eklenmeli: `event_view`,
`event_start`, `event_complete`, `reward_claim`, `cosmetic_equip`, `return_summary_view`.
Ödül muhasebesi ve tamamlanmış maçların gerçek kaynağı sunucudur. Olaylar şema
sürümü ve kural/dönem kimliği taşır; oyuncu metinleri, erişim belirteçleri ve
gereksiz kişisel bilgiler olay alanlarına girmez.

## 9. Tarihli yayın ve çalışma planı — güncel karar

**2.3.0 yayımlandı. 2.4.0 hedefi 23 Kasım 2026, ilk sezon hedefi 30 Kasım
2026 03.00 TR.** Kullanıcı mevcut içerikle sezonu önceliklendirdi.

Eski “2.4.0'dan önce iki yeni kart + 18 kozmetik” kapısı yerine, yalnız ilk
sezon için mevcut 24 modül kullanılacak. Mevcut oyuncu setleri üç ana ödüle;
diğer haftalar açık kaynak ödülü türüne ayrılacak. Bu profil henüz kodlanmadı.
Stok yokluğu eski koleksiyona dönüş veya sessiz fallback değildir. S2'den
itibaren her sezon yeni hazır modül ve özgün ana ödül koşulu sürer.

<!-- release-calendar:begin -->
| Sürüm | Çalışma dönemi | Kapsam kapanışı | Hedef yayın | Sezon başlangıcı | Oyuncuya gelen ana içerik | Kesinlik |
| --- | --- | --- | --- | --- | --- | --- |
| **2.4.0** | 04.11.2026–16.11.2026 | 16.11.2026 | **23.11.2026** | 30.11.2026, 03.00 TR | Mevcut 24 modülle ilk sezon; mevcut kozmetiklerin tekil tahsisi, kaynak ödüllü haftalar, güvenli kapanış ve sürüm geçişi. | hedef |
| **2.5.0** | 24.11.2026–14.12.2026 | 14.12.2026 | **21.12.2026** | 28.12.2026, 03.00 TR | Mühendis seçim kasası ve tek garantili parça teklifi; Yankı Rölesi; ikinci sezon için 6 yeni oyuncu kozmetiği ve mağazaya ayrı 4 öğe. | hedef |
| **2.6.0** | 22.12.2026–11.01.2027 | 11.01.2027 | **18.01.2027** | 25.01.2027, 03.00 TR | Günlük Devre Deneyi: önce 7 özgün problem, ilk başarı ödülü ve keşif günlüğü; Kor Fırlatıcı; üçüncü sezon için 6 yeni oyuncu kozmetiği. | tahmin |
| **2.7.0** | 19.01.2027–08.02.2027 | 08.02.2027 | **15.02.2027** | 22.02.2027, 03.00 TR | Üç duraklı PvE Seferi, ara kayıt ve bir bonus yan rota; dördüncü sezon için 6 yeni oyuncu kozmetiği; Darbe Muhafızı hedefi. | tahmin |
| **2.8.0** | 16.02.2027–08.03.2027 | 08.03.2027 | **15.03.2027** | 22.03.2027, 03.00 TR | Takım ortak hedefi ve kişisel ikmal hakkı; ilk küçük ustalık hattı; beşinci sezon için yeni ödül setleri ve Toparlanma Feneri hedefi. | tahmin |
| **2.9.0** | 16.03.2027–05.04.2027 | 05.04.2027 | **12.04.2027** | 19.04.2027, 03.00 TR | Yeterli gerçek rakip varsa eşit seviyeli Draft Arenası için sınırlı pilot; altıncı sezon ödül/modül hazırlığı. | koşullu |

| Sezon | Başlangıç — bitiş (bitiş hariç) | Modül planı |
| --- | --- | --- |
| S1 | 30.11.2026–28.12.2026, 03.00 TR | Mevcut 24 modül; yalnız ilk sezon istisnası |
| S2 | 28.12.2026–25.01.2027, 03.00 TR | Yankı Rölesi |
| S3 | 25.01.2027–22.02.2027, 03.00 TR | Kor Fırlatıcı |
| S4 | 22.02.2027–22.03.2027, 03.00 TR | Darbe Muhafızı — ayrıntılı üretim eforu 4 Ocak kontrolünde yeniden tahmin edilecek |
| S5 | 22.03.2027–19.04.2027, 03.00 TR | Toparlanma Feneri — ayrıntılı üretim eforu 4 Ocak kontrolünde yeniden tahmin edilecek |
| S6 | 19.04.2027–17.05.2027, 03.00 TR | Yeni modül konsepti 1 Mart tasarım kontrolünde belirlenecek; hazır olmadan sezon açılmaz |

<!-- release-calendar:end -->

Tarihlerin tek kaynağı `planning/release_calendar_v1.json`'dur. Buradaki özet
ile checklist tarihleri doğrulama aracında eşlenir. Ayrıntılı haftalık işler,
sezon tarihleri, kritik hata payı, kapsam kapanışı ve kaydırma kuralları
[ödül portföyü ve sürüm takviminde](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md).

18 yeni oyuncu öğesi artık S2/S3/S4 için altışar üretim grubudur; ilk sezonu
bekletmez. Mevcut tam-koleksiyon stok aracı eski profil için 18/20 ihtiyacı
hesaplamaya devam eder; yeni profil gerçek tür ve miktarlarla uygulanacaktır.

Her yayında CI, mobil/Play cihaz testi, veri koruyan yedek/restore, tek teslim,
kazanılmış haklar, eski istemci uyumu ve ortak sanat yönü korunur. İlk sezon
başlamadıysa gecikme başlangıç planıyla birlikte revize edilir; başlamış
sezon/ödül geçmişi değişmez. Tarih gelmesi kendiliğinden açılış değildir.
Hata düzeltmesi PATCH; yeni özellik MINOR; büyük uyumsuz dönüşüm MAJOR'dür.
