# GRIDSHARD — canlı operasyon, yeni ödüller ve oyun modları planı

## 3 Kasım 2026 — uygulama projesine geçiş

Bu planın ürün yönü korunarak mağaza/sandık/ödül araştırması genişletildi.
Yeni uygulama başlangıç noktası:
**[Gelişim kontrol listesi](GRIDSHARD_GELISIM_CHECKLIST_20261103.md)**.
51 işin kararlı kimliği, bağımlılığı, rolü, mevcut kaynak bağı, önerilen yeni
teslimi ve kabul ölçütleri vardır. Bir temel dalda hazır, 43 iş yapılacak,
yedi iş ölçüme bağlı ileri aşamadır. Yeni mağaza ve modlar uygulanmış sayılmaz.

- [Mağaza ve ödül araştırması](GRIDSHARD_MAGAZA_ODUL_ARASTIRMASI_20261103.md): resmî kaynaklar, tarihsel örnekler ve GRIDSHARD kararları.
- [Teknik proje tasarımı](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md): veri/API, hak/işlem, içerik kapasitesi ve ekran sözleşmeleri.
- [İşlerin tek kaynağı](planning/gridshard_development_backlog_v1.json): güncellenebilir proje verisi.
- `python tools/development_checklist.py --check`: bağımlılık/kapsam/kaynak ve üretilmiş checklist tutarlılığı.

2.2.1 sunucu/AAB teslimi tamamlandı. 15 kozmetik ve dönem altyapısı hâlâ
sonraki minor dalındadır. İlk yeni minor adayı 2.3.0; bu belgeler canlı fiyat,
ödül miktarı, ürün veya etkinlik açılışı değiştirmez. Aşağıdaki 2 Kasım planı
ürün gerekçesi olarak korunur; güncel iş durumu yeni checklist'ten izlenir.

---

Araştırma tarihi: 2 Kasım 2026. Durum: geliştirme planı. Aşağıdaki yeni oyun
modları henüz uygulanmadı. Kozmetik ve dönem ödülü temeli bu planla birlikte
`codex/liveops-foundations` dalında hazırlanmıştır; 2.2.1 yayın paketi ayrı tutulur.

## 1. Önerilen yön

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

## 9. Sürümlere göre açık yayın planı — 3 Kasım 2026

**Bir sonraki hedef sürüm 2.3.0'dır: kilitli kozmetik ve önizleme paketi.**
Kozmetiklerin oyunda görünmesi ile sezon/etkinlikte kazanılmaya başlaması
ayrı yayın adımlarıdır. Önceki geniş ilk-minor paketi bu iki kapıya ayrıldı:
2.3.0 görünürlük/kilitli katalog; 2.4.0 yeterli yeni içerikle ödül ve dönem açılışı.
Hazır önizlemeyi, iki dönemlik yeni kart ve sanat üretimi bekletmeyecek.

| Sürüm | Oyuncuya gelecek içerik | Yayın için tamamlanacak kademe |
| --- | --- | --- |
| **2.2.1 — mevcut** | Profil/takım düzeltmeleri, yeni çark ve sıralı güncelleme mesajları. | Sunucu ve imzalı AAB teslimi tamamlandı; Play yayını kullanıcı tarafından yönetiliyor. |
| **2.3.0 — bir sonraki yayın** | Üç temada 15 kilitli oyuncu/takım kozmetiği; adlar, önizlemeler ve açık kilit açıklaması. | `COS-01` + `RELEASE-00`: sahiplik/kuşanma reddi, TR/EN, iki mobil boyut, native API, regresyon/CI, yeni sürüm mesajı, veri koruyan sunucu ve yeni imzalı AAB. |
| **2.4.0 — dönem ödülü ve içerik açılışı** | Tekil dönem ödülleri, tema vitrini, sürümlü ödül tanımları ve birleşik takvim/yayın kapısı. | `RELEASE-01`: ekonomi baz çizgisi, en az 18 yeni oyuncu kozmetiği, iki döneme birer hazır modül, doğru teslim/kayıt/restore ve operatör açılışı. |
| **2.5.0 — mağaza ve seçim kasası** | Garantili hedefli parça teklifi, dört ayrı mağaza kozmetiği, seçim kasası ve daha anlaşılır mağaza; kapanışta kazanılmış hakkın korunması. | `RELEASE-02`: fiyat/miktar/limit kararı, tek hak/tek teslim, atomik harcama, bağlantı kopması/yanlış seçim/iade ve mağaza politikası kontrolleri. |
| **2.6.0 — günlük Devre Deneyi** | Sunucuda doğrulanan günlük strateji problemi, ilk başarı ödülü, tekrar deneme ve tek etkinlik vitrini. | `RELEASE-03`: kural/tohum/dönem sabitliği, tek ödül, gün değişimi, yeni etkinlik için yeterli özgün stok ve baz ölçüm değerlendirmesi. |
| **2.7.0 — PvE Seferi** | Üç duraklı sefer, duraklar arasında kayıt ve farklı rakip dizileri. | `LIVE-04`: 2.6.0 teknik/ekonomi değerlendirmesi olumlu; koşu kurtarma, ilk/tekrar ödülü, yeni içerik ve ortak yayın kontrolleri. |
| **2.8.0 — takım ortak hedefi ve ustalık** | Farklı zamanlarda takım katkısı, kişisel hak/ödül ve kalıcı modül/çekirdek ustalık vitrini. | `LIVE-05/07`: üyelik/takım değiştirme, katkı tavanı, küçük takım erişimi, ustalık doğrulaması ve yeni takım ödülü. |
| **2.9.0 — koşullu draft pilotu** | Sınırlı etkinlik penceresinde eşit seviyeli kart seçimi. | `LIVE-06` + `ANALYT-02`: yeterli aktif rakip/bekleme ve adalet verisi, seçim/kopma testi ve ayrı ödül bütçesi; uygun değilse ertelenir. |

### 9.1. 2.3.0'a tam olarak ne giriyor?

- **Kutup Işığı, Güneş Ocağı, Derin Akım** temalarının her birinde oyuncu
  çerçevesi, profil zemini, takım arması, takım çerçevesi ve takım isim rengi:
  toplam 15 öğe. Mevcut dal hazırlığı bu paketin temelidir.
- Oyuncu ve takım ekranlarında doğru önizleme, TR/EN ad ve kilit nedeni.
  Henüz açılmayan ödül için gerçek kazanılmış sahiplik veya kesin tarih gösterilmez.
- Sunucu sahiplik kontrolü: öğe görünür olsa da kazanılmadan kuşanılamaz.
  Mevcut oyuncu/takım görünümü ve sahip oldukları öğeler korunur.
- Dönem ödülü kayıt/doğrulama kodu pakete girer; yeni tahsis/yayın listesi
  boş kalır. Sezon ve turnuva başlangıç ayarları değişmez.
- Güncelleme mesajı 2.3.0 olarak eklenir, mevcut mesajlar korunur. İstemci,
  sunucu ve yeni AAB aynı sürümü taşır; 2.2.1 AAB yeniden adlandırılıp kullanılmaz.

**2.3.0 kapsamında açılmayacaklar:** yeni sezon/turnuva, otomatik kozmetik
dağıtımı, yeni mağaza ürünü, seçim kasası, yeni kart ve yeni oyun modu.
Mevcut sandık fiyat/olasılıkları ve premium koşulları değişmez.
`COS-02`, `CARD-01/02`, iki dönemlik stok ve yeni ekonomi ayarı bu önizleme
yayınının önkoşulu değildir; 2.4.0 açılışının önkoşuludur.

### 9.2. Hangi geliştirme noktasında yayın çıkarıyoruz?

1. **Kapsam ve geliştirme:** ilgili sürümün görevleri/kabul ölçütleri tamamlanır;
   bir sonraki sürümün yarım özelliği açık biçimde pakete karışmaz.
2. **Yerel ve cihaz kabulü:** gerçek API, sahiplik/ödül tekrar koruması,
   eski hesaplar, TR/EN, 320×568/393×852 ve native dönüş/erişim kontrol edilir.
3. **İç test:** CI, imzalı yeni AAB, sürüm mesajı ve veri koruyan sunucu
   paketi hazırlanır. Yeni/önceki desteklenen istemci uyumluluğu doğrulanır.
4. **Kapalı test:** uygulama Play'den güncellenerek hesap/ödeme/ödül
   senaryoları cihazda doğrulanır. Kalıcı veriye reset uygulanmaz.
5. **Kontrollü üretim:** sunucu ve istemci uyumlu sırayla yayımlanır.
   Yeni etkinlik/ödül ancak ilgili içerik kapısı geçilmişse açılır.
6. **Yayın sonrası gözlem:** çökme/bağlantı, bekleyen teslimler, tekrar ödül,
   ekonomi ve oyuncu dönüşü incelenir. Sorunda yeni dağıtım/satış kapatılır;
   oyuncunun kazanılmış hakkı silinmez.

Her küçük düzeltme için bir sonraki büyük paketi beklemeyiz: örneğin 2.3.0
sonrası hata düzeltmeleri **2.3.1, 2.3.2**; yeni özellik paketi **2.4.0** olur.
Büyük kapsam/oyun veya protokol dönüşümünde MAJOR ayrıca değerlendirilir.
2v2, BO3, asenkron meydan okuma ve özel boss işleri için bugün 3.0.0 veya
kesin tarih sözü verilmez; prototip ve ölçüm sonucunda ayrı yayın planı yapılır.

Sürüm numaraları hedef sıra, tarihler ise hazır olma durumuna bağlıdır.
Özellikle 2.7.0 sonrası kapsamlar önceki pilot verisiyle yeniden değerlendirilir.
Sadece takvim dolsun diye aynı ödül tekrar verilmez veya hazır olmayan sezon açılmaz.
Kaynak görev/sürüm eşlemesi checklist'in tek JSON kaynağında da tutulur;
bu bölümün değişmesi ilgili yayın kaydına ve görev kapısına birlikte işlenir.
