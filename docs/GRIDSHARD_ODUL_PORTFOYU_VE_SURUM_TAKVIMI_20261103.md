# GRIDSHARD — ödül portföyü ve tarihli sürüm takvimi

**S1 ödül/XP açıklaması:** [Bağlı sözleşme](planning/season-1-rewards-and-xp.md)
haftalık/takım/ilk 10 sabit kasalarını, Topla açılışını ve 12.240 XP eşiğini
koruyan günlük/sezonluk emirleri tanımlar. UI-08/REWARD-06/SEASON-01 2.4.0
zorunlu işleridir; mevcut tarihler kapasite kontrolüne tabidir.

**4 Kasım güncellemesi:** [Sürüm uygulama rehberi](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md)
2.4–2.9 için ayrıntılı brief, haftalık iş sırası, uygulama yöntemi, dosya ve checklist
bağlantılarını içerir. Takvim satırındaki sürüm bağlantısı ilgili briefi açar.
2.4.0'a sarı geri/ileri kontrolleri ve saldırı/çekirdek ses kalitesi zorunlu işleri
eklendi; tarihler korunurken ek yükün 6 Kasım kontrolünde ölçülmesi kaydedildi.

Karar tarihi: **3 Kasım 2026**. Kullanıcı önceliği: **2.4.0'da mevcut
24 modülle ilk sezon açılsın; yeni modül ve geniş kozmetik üretimi sonraki
paketlere bölünsün.** Ortak sanat yönü sürer. Bu belge planlama kaydıdır;
canlı sezonu, ödül hakkını veya mağaza ürününü açmaz.

**15 Kasım güncel durum:** 2.4.0 yayımlandı. S1 ve iki turnuva **24 Kasım 2026
03.00 TR** otomatik başlar, **22 Aralık 2026 03.00 TR** kapanır. Otomatik
açılış/kapanış ve ödül teslimi canlıda hazırlanmıştır; 23 Kasım'da işlem gerekmez.
Sonrasında düzenleme/dinlenme arası vardır. **S2 ayrıca onaylanacak**; 28 Aralık
yalnız koşullu hedeftir. 2.5.0 paketinin 21 Aralık hedefi sezon açılışından ayrıdır.

## 1. Ödülün oyuncuya ne kazandırmasını istiyoruz?

Beş ödül amacı: **ilerleme, seçim, deneme/öğrenme, yeni oynanışa erişim ve
ortak başarı**. Kozmetik bunlara eklenen görünür hatıradır. Her düğüme yeni
çerçeve üretmek yerine sezon yolu, modül gelişimi ve oynanış hedefi birlikte
çalışır. Aşağıdaki yeni fikirler mevcut özellik diye sunulmaz.

| Ödül fikri | Oyuncuya somut faydası | Mevcut temel / gereken ekleme | Planlanan ilk kullanım |
| --- | --- | --- | --- |
| **Devre Projesi** | Uygun bir mevcut modülün gelişimini birkaç görev boyunca hedefleyen, ilerlemesi görünen parça paketi | Sabit `module_definition_id/module_shards` teslimi var; arena uygunluğu ve proje hedefi sabitlenmeli. İlk sürümde yeni harcanabilir para yerine görev kaydı kullanılır. | 2.4.0: sabit mevcut modül parçaları; yeni seçimli proje arayüzü 2.5.0 |
| **Mühendis Seçim Kasası** | Örneğin saldırı/savunma/taktik için sunulan üç uygun parça paketinden birini seçmek | Sabit içerik teslimi var; kalıcı seçim hakkı ve tek talep işlemi yeni. Hak doğduğunda seçenekler sabitlenir. | 2.5.0 ana kapsam |
| **Deste İkmal Paketi** | Sadece rastgele ilerlemek yerine seçilen bir mevcut modüle parça ve sınırlı evrensel parça almak | Evrensel modül parçası kazanımı/harcaması ve sabit kasa var; kaynak bütçesi ve uygun havuz doğrulanacak. | 2.4.0 mevcut paketlerle; seçim eklemesi 2.5.0 |
| **Çekirdek Bakım Paketi** | Kullanılan çekirdeğin gelişimine yönelik garantili parça | Çekirdek parçası profilde/giriş ödüllerinde var; sabit posta kasasının teslim kodu ayrıca genişletilmeli. Hazır kabul edilmez. | 2.5.0 sonrası ödül çeşitlendirme adayı |
| **Yeniden Kurulum Kuponu** | Bir modülün yeteneklerini bir kez Akı sıfırlama bedeli ödemeden yeniden kurmak | Ücretli sıfırlama işlemi mevcut. Kupon sahipliği/tüketimi yeni; mevcut ücretsiz geçiş hakkı varsa kupon tüketilmez. Yükseltme bedelleri geri ödenmez. | 2.8.0 isteğe bağlı ilk pilot |
| **Laboratuvar Lisansı** | Sahip olunmayan bir modülü eşit seviyeli AI denemesinde kullanıp deste fikrini sınamak | Geçici deneme yetkisi ve ayrı uygunluk denetimi yeni. Sahiplik vermez, dereceli savaşa taşınmaz; temel deneme alanı gereksiz yere kapatılmaz. | 2.6.0 isteğe bağlı pilot |
| **Keşif Günlüğü** | Farklı taktik problemlerini çözerek dünyanın hikâyesini, mühendis notunu veya sıradaki problemi açmak | Sunucuda doğrulanmış görev/ilerleme ve sürümlü küçük içerik sayfaları gerekir. Ödül yalnız metin değil, yeni problem erişimi ve ilk başarı paketiyle eşleşir. | 2.6.0 günlük deneyin küçük içerik hattı |
| **Sefer Yan Rotası** | Ana seferi bitirince farklı rakip/koşul içeren bonus bir durağı keşfetmek | PvE koşusu, ara kayıt, tek seferlik yan rota ödülü yeni. Ana oyun sürekli bilet beklemez. | 2.7.0: üç durak + bir bonus rota |
| **Takım İkmal Sandığı** | Ortak hedefte katkı veren oyuncuların kişisel kaynak hakkı kazanması | Takım/üyelik ve mevcut teslim temeli var; katkı eşiği, hak anındaki üyelik ve oyuncu başına tek teslim yeni. Büyük takımın her şeyi toplamasına göre tasarlanmaz. | 2.8.0 ana kapsam |
| **Ustalık Sözleşmesi** | Bir modülle farklı strateji hedeflerini tamamlayıp kaynak ve kalıcı başarı kaydı kazanmak | Yalnız çok maç kazanma sayacı yerine doğrulanmış üç farklı hedef; ödül yolu ve sayaçlar yeni. İlk hat küçük tutulur. | 2.8.0 ilk hat; geniş katalog sonraya |
| **Gelecek Deneyinde Söz Hakkı** | Bir sonraki PvE/deney temasına hesap başına bir oy vermek | Oylama yeni ve ikincil fikir; devredilemez, satın alınamaz, kupa/hasar vermez. Sonuç bağlayıcı denge kararı değildir. | İleri araştırma; tarihlenmiş paketlerin zorunlu kapsamı değil |

Ödül miktarları bu belgede uydurulmaz: önce mevcut kazanım/harcama bütçesi
çıkarılır. Kredi, Akı, modül/çekirdek parçaları tekrar kullanılabilen kaynaklardır.
Bir döneme özel koleksiyon tasarımı başka dönem veya mağazada yeniden verilmez.
Her kaynak ödülü yeni sanat gerektirmez; her sezonun hedefi, problem içeriği,
sunumu ve ana ödülü yenilenir. Sadece farklı tohum veya farklı ad yeni içerik
sayılmaz. Yeni pasif savaş hasarı çarpanı, ücretli ikinci çekiliş ve yeni para
birimi bu planın başlangıcına eklenmez.

## 2. Araştırmadan çıkan dersler

Clash Royale'in resmi Magic Items açıklaması, Wild Cards ile hedefli kart
ilerlemesi ve oyuncuya seçim alanı verir. GRIDSHARD için çıkarımımız; daha çok
rastgele kutunun yanında oyuncunun hangi deste parçasını geliştireceğini de
seçebilmesidir. Aynı oyunun miktarlarını veya envanter sınırlarını kopyalamıyoruz.
[Resmi Magic Items kaynağı](https://support.clashroyale.com/hc/en-us/articles/49484940179483-Magic-Items).

Brawl Stars'ın **1 Temmuz 2025** tasarım değerlendirmesi, anlaşılmayan ve
uzun tekrar isteyen ustalık akışlarının sorunlarını; daha erişilebilir sabit
ödüllerle rastgele ödüller arasında denge arayışını anlatır. Bu tarihsel tasarım
dersidir, 2026 oyununun bütün güncel sistemlerinin özeti değildir. Bizim
çıkarımımız kısa ve farklı hedefler, görünür ilerleme ve garanti ilk başarı
ödülüdür; GRIDSHARD'da oyuncu dönüşünü kesin artıracağı iddia edilmez.
[Resmi değerlendirme](https://supercell.com/en/games/brawlstars/blog/game-updates/about-the-update-records-changes/).

Yerel doğrulama: `reward_delivery.py` sabit modül/kredi/Akı/evrensel parça
teslimini; `meta_progression.py` evrensel parça harcamasını ve ücretli yetenek
sıfırlamasını; `player_profile.py` çekirdek parçasını destekliyor. Seçim hakkı,
kupon, lisans ve yan rota bu temelin üzerinde geliştirilecek yeni işlerdir.

## 3. Mevcut içerikle ilk sezon nasıl açılacak?

**S1 yalnız ilk açılışa özel olarak mevcut 24 modülle başlar.** Eski planın
“ilk yayından önce iki yeni kart ve 18 yeni kozmetik” koşulu kullanıcı kararıyla
sonraki paketlere bölündü. S2'den itibaren sezon başına en az bir yeni hazır
modül hedefi korunur. İlk sezon istisnası ve otomatik kapanış canlıda uygulanmıştır;
yayımlanmış içerik pini `config/season-releases/S1-20261124/` altındadır. Sonraki
sunucu geçişi bu katalogları taslakla değiştiremez veya kullanılan sanatı boş stok sayamaz.

| S1 ödül kaynağı | Kullanılacak içerik | Çalışma durumu / gerekli ekleme |
| --- | --- | --- |
| Sezon yolu, 40 kademe | Mevcut kaynak/sandık yolu; ana kozmetik Kutup Işığı oyuncu çerçevesi + zemini | Mevcut sunum/teslim temeli var; tekil tahsis, tam bütçe ve kapanış hakları doğrulanacak. |
| Sezon sıralaması | Mevcut kaynak ödülleri ve prestij; ana oyuncu seti Güneş Ocağı | İlk 10 için kaynak/başarı sunumu gerçek teslimle eşleşecek; aynı tasarım başka döneme ayrılmayacak. |
| 24 Kasım, 1 Aralık ve 8 Aralık haftaları | Sırasıyla Lazer, Kalkan, Darbe Topu parçaları; kredi/Akı | Yayımlanmış `resource_only` paketleri. Her dönem yedi tam gün; sınır 03.00 TR. |
| 15–22 Aralık son hafta | Kaynak paketi + Derin Akım oyuncu seti | Üçüncü oyuncu seti yalnız final haftasına ayrılmıştır. Sonraki haftaya dönmez. |
| Takım turnuvası, 24 Kasım–22 Aralık | Kutup Işığı takım setinin üç öğesi | S1 ile aynı anda otomatik açılır. İlk üç gün kayıt, 4. gün eşleşme, 5–7. gün maç; katılım kapıları ve S1 bot takımları geçerlidir. |

Mevcut 15 öğe **altı oyuncu + dokuz takım öğesidir**; üç oyuncu seti yalnız
üç ana kozmetik ödülünü karşılar. Dört haftanın hepsine yeni kozmetik vaat
etmiyoruz. Kaynak haftaları ve kozmetik haftaları hem önizlemede hem sunucu
kaydı/sabit içerikte açıkça ayrılmalıdır.

Yeni düzenle 18 öğelik oyuncu brief'i üç üretim grubuna bölünür: S2 için 6
öğe (2.5.0), S3 için 6 (2.6.0), S4 için 6 (2.7.0). Mağazanın dört öğesi ayrı
stoktur. İlk üç takım seti tüketildiğinde yeni takım seti ayrıca üretilir;
oyuncu stok hesabı takım kaynağına yetmiş sayılmaz.

**Bugünkü kod hâlâ bütün dönemler kozmetik seti alacak varsayımıyla 18/20
eksik öğe raporlar.** Bu rapor bozuk değildir; eski tam-koleksiyon profilini
hesaplar. Yeni ilk-sezon profili ve kaynak ödülü türü uygulanıp test edilene
kadar rapora “hazır” yazılmaz. Yetersiz stoğu gizlemek için gerekli adet sıfırlanmaz.

## 4. Tarihli sürüm ve sezon tablosu

Kaynak: `docs/planning/release_calendar_v1.json`. Aşağıdaki bölüm
`python tools/release_calendar.py --write` ile üretilir; kaynak tarihleri
backlog ile eşleşmek zorundadır.

<!-- release-calendar:begin -->
**Güncel sezon ve ara kararı:** 2.4.0 yayımlandı. S1 24 Kasım 03.00 TR otomatik başlar, 22 Aralık 03.00 TR kapanır; ardından düzenleme/dinlenme arası vardır. S2 kendiliğinden açılmaz: 28 Aralık yalnız koşullu hedef, kesin tarih ayrıca onaylanacak. S3–S6 tarihleri S2 onayına bağlı tahmindir; S2 değişirse bağlı sezonlar yeniden planlanır. 2.5.0 paketinin 21 Aralık yayın hedefi sezon açılışından ayrıdır ve korunur.

**2.4.0 geliştirme ve yayın kararı:** 6 Kasım 2026 kararı: 2.4.0 yayınlanana kadar açık geliştirme sürümüdür. Hata düzeltmeleri, UI iyileştirmeleri ve kabul edilen eklemeler aynı 2.4.0 adayında birikir; her düzeltmede 2.4.1 açılmaz. Test paketleri gerektiğinde yeniden üretilir; mağaza yüklemesi gerektirirse Android versionCode ilerler, görünen sürüm 2.4.0 kalır. Sunucu geçişi ve son kaynaktan üretilecek imzalı AAB dağıtımı planlanan yayın zamanında, kabul kapıları tamamlanınca yapılır. Hazır test APK’sı yayımlanmış sürüm veya dağıtıma hazır son AAB kabul edilmez. Genel sürüm ve sezon takvimi korunur; yeni fikirler uygun sürümün backlog, kapsam ve kabul maddelerine eklenebilir, tarih değişikliği ayrıca planlanır. 2.4.0 yayımlandıktan sonraki ayrı hata düzeltme yayını 2.4.1 olur; sonraki minor/major yayınlarda mevcut sürümleme kuralı sürer. 13 Kasım 2026 ek kararı: zorunlu yama nedeniyle yalnız 2.4.0 geçiş hedefi 23 Kasım yerine 13 Kasım 22.00–14 Kasım 00.00 TR olarak öne alındı. Kapsam kapanışı ve son kabul aynı gün yapılır; açık cihaz/CI/yedek/restore kapıları geçmiş sayılmaz. Sunucu geçişi ve imzalı AAB hazırlığı ev bilgisayarında; mağaza inceleme/dağıtım sonucu ayrıca doğrulanır. S1–S6, haftalık ve koşullu takım turnuvası takvimi değişmedi. 13 Kasım evde son karar: geçiş şimdi yapılır. S1, haftalık ve takım turnuvaları 24 Kasım 03.00 TR aynı anda başlar; 22 Aralık 03.00 TR biter. Günlük giriş ve sezon ödülleri sezon kapısına bağlıdır; ücretli sezon sütunu mağaza gibi gizlidir. 15 Kasım kararı önceki 30 Kasım hedefini değiştirir: S1 ve iki turnuva 24 Kasım 03.00 TR otomatik açılır; dört tam hafta sonunda 22 Aralık 03.00 TR kapanır. Oyuncu girişi olmadan kalıcı kapanış/ödül teslimi çalışır. Sonrasında sezon arası vardır; S2 için ayrı operatör kararı gerekir.

**2.5.0 geliştirme ve yayın kararı:** 15 Kasım 2026 güncel kararı: 2.4.0 yayımlandı; S1 otomatik takvimi 24 Kasım–22 Aralık 03.00 TR olarak canlıda hazır. 2.5.0 paketinin 21 Aralık yayın hedefi korunur. Reklam/satın alma kaynakları ve geçmiş işlem/iade hakları korunur; SDK’lar, native mağaza köprüsü ve BILLING/reklam izinleri pakete alınmaz; bu iş için ayrı 2.4.1 üretilmez. Sabit takım yardım metinleri başlangıca göre gün numaralarına çevrilir. Son AAB, TR/EN cihaz kabulü ve Console beyanları yayın kapısıdır. S1’in yayımlanmış kataloğu ve kullanılmış stoğu korunur. Kapanıştan sonra düzenleme/dinlenme arası vardır; 28 Aralık S2 yalnız koşullu hedeftir ve ayrıca operatör onayı gerekir. Paket yayını S2’yi açmaz. Ayrıntı: docs/planning/mobile-250-without-monetization.md.

| Sürüm | Çalışma dönemi | Kapsam kapanışı | Hedef yayın | Sezon başlangıcı | Oyuncuya gelen ana içerik | Kesinlik |
| --- | --- | --- | --- | --- | --- | --- |
| **[2.4.0](planning/releases/2.4.0.md)** | 04.11.2026–13.11.2026 | 13.11.2026 | **13.11.2026** | 24.11.2026, 03.00 TR (otomatik açılış) | Mevcut 24 modülle ilk sezon; mevcut kozmetiklerin tekil tahsisi, kaynak ödüllü haftalar, güvenli kapanış ve sürüm geçişi. Bütün geri/ileri gezinme düğmelerinde ortak son sarı tasarım; saldırı VFX ve çekirdek seslerinde eksik bağlantı/cızırtı düzeltmesi. Sabit ödül kasalarında çekirdek teslimi ve Topla açılış animasyonu; mevcut XP eşiğini koruyan günlük/sezonluk Devre Emirleri. AAB değiştirmeden 2.3.0 Sistem mesajında 13 Kasım 22.00–14 Kasım 00.00 TR bakım ön duyurusu; 2.4.0 sunucu/AAB sonrasında ayrı kimlikli turnuva penceresi. S1 ve ilk haftalık turnuva 24 Kasım 03.00 TR. Arkadaşlar sayfasındaki Gelen/Giden İstek yazılarının üstüne taşan çizgi düzeltilir. İlk sezonda 240 bot, 12 takım, gerçek sıra ve kalıcı ödül ertelemesi; turnuvalarda ÖDÜLLER sekmesi; bütün arkadaş sekmelerinde çizgisiz tasarım. Zorunlu yama için erken geçiş duyurusu ayrı kimlikle yeniden gönderilir. Gerçek para satın alma girişleri ve savaş sonu reklamı kod silinmeden istemcide gizlenir; mevcut haklar ve oyun içi para sandıkları korunur. | yayımlandı |
| **[2.5.0](planning/releases/2.5.0.md)** | 24.11.2026–14.12.2026 | 14.12.2026 | **21.12.2026** | 28.12.2026, 03.00 TR (koşullu hedef; ayrıca operatör onayı, otomatik açılmaz) | Mühendis seçim kasası ve tek garantili parça teklifi; Yankı Rölesi; ikinci sezon için 6 yeni oyuncu kozmetiği ve mağazaya ayrı 4 öğe. En az bir yeni menü ve bir özgün savaş bestesi; merak/umut ve kontrollü rekabet. | hedef |
| **[2.6.0](planning/releases/2.6.0.md)** | 22.12.2026–11.01.2027 | 11.01.2027 | **18.01.2027** | 25.01.2027, 03.00 TR (S2 onayına bağlı tahmin) | Günlük Devre Deneyi: önce 7 özgün problem, ilk başarı ödülü ve keşif günlüğü; Kor Fırlatıcı; üçüncü sezon için 6 yeni oyuncu kozmetiği. | tahmin |
| **[2.7.0](planning/releases/2.7.0.md)** | 19.01.2027–08.02.2027 | 08.02.2027 | **15.02.2027** | 22.02.2027, 03.00 TR (S2 onayına bağlı tahmin) | Üç duraklı PvE Seferi, ara kayıt ve bir bonus yan rota; dördüncü sezon için 6 yeni oyuncu kozmetiği; Darbe Muhafızı hedefi. En az bir yeni menü ve iki özgün sefer savaş bestesi; gizem, keşif gerilimi ve cesaret. | tahmin |
| **[2.8.0](planning/releases/2.8.0.md)** | 16.02.2027–08.03.2027 | 08.03.2027 | **15.03.2027** | 22.03.2027, 03.00 TR (S2 onayına bağlı tahmin) | Takım ortak hedefi ve kişisel ikmal hakkı; ilk küçük ustalık hattı; beşinci sezon için yeni ödül setleri ve Toparlanma Feneri hedefi. | tahmin |
| **[2.9.0](planning/releases/2.9.0.md)** | 16.03.2027–05.04.2027 | 05.04.2027 | **12.04.2027** | 19.04.2027, 03.00 TR (S2 onayına bağlı tahmin) | Yeterli gerçek rakip varsa eşit seviyeli Draft Arenası için sınırlı pilot; altıncı sezon ödül/modül hazırlığı. | koşullu |

| Sezon | Başlangıç — bitiş (bitiş hariç) | Modül planı |
| --- | --- | --- |
| S1 | 24.11.2026–22.12.2026, 03.00 TR (otomatik açılış) | Mevcut 24 modül; yalnız ilk sezon istisnası |
| S2 | 28.12.2026–25.01.2027, 03.00 TR (koşullu hedef; ayrıca operatör onayı, otomatik açılmaz) | Yankı Rölesi |
| S3 | 25.01.2027–22.02.2027, 03.00 TR (S2 onayına bağlı tahmin) | Kor Fırlatıcı |
| S4 | 22.02.2027–22.03.2027, 03.00 TR (S2 onayına bağlı tahmin) | Darbe Muhafızı — ayrıntılı üretim eforu 4 Ocak kontrolünde yeniden tahmin edilecek |
| S5 | 22.03.2027–19.04.2027, 03.00 TR (S2 onayına bağlı tahmin) | Toparlanma Feneri — ayrıntılı üretim eforu 4 Ocak kontrolünde yeniden tahmin edilecek |
| S6 | 19.04.2027–17.05.2027, 03.00 TR (S2 onayına bağlı tahmin) | Yeni modül konsepti 1 Mart tasarım kontrolünde belirlenecek; hazır olmadan sezon açılmaz |

**2.4.0 sunucu bakım penceresi:** 13.11.2026 22.00 → 14.11.2026 00.00, Türkiye saati; yaklaşık 2 saat. Sezon açılışı ayrı tarihtedir.

<!-- release-calendar:end -->

**Hedef / tahmin / koşullu ayrımı:** 2.4.0 yayımlandı; 2.5.0 sıradaki
hedef paket. S2 tarihi ayrıca onaylanacak; S3–S6 tarihleri S2 onayına bağlı
tahmindir. 2.6–2.8 tarihlerinin kesinliği daha düşüktür ve 4 Ocak 2027
kontrolünde efor tekrar değerlendirilir. 2.9 için aktif rakip verisi gerekir;
1 Mart 2027 kontrolünde pilot yapılacak mı kararı alınır. Her sıradaki sürümün
kapsamı kendi geliştirmesi başlamadan önce yeniden teyit edilir.

## 5. Güncel çalışma ve sezon takvimi

| Tarih | İşlem | Durum / somut sonuç |
| --- | --- | --- |
| **13–14 Kasım** | 2.4.0 sunucu ve Play yayını | Tamamlandı; yayımlanan code15 paketi korunur. |
| **15 Kasım** | S1 otomatik açılış/kapanış ve katalog geçişi | Canlıda tamamlandı; 60 profil/28 tablo korundu. |
| **16–23 Kasım** | Canlı gözlem ve 2.5.0 içerik hazırlığı | 23 Kasım'da sezon açma veya AAB dağıtma işlemi gerekmiyor. |
| **24 Kasım, 03.00 TR** | S1 ve iki turnuvanın otomatik açılışı | Dört tam hafta; günlük giriş/sezon ödülleri ve bot katılımı aynı kapıda. |
| **24 Kasım–14 Aralık** | 2.5.0 geliştirmesi | Seçim kasası/mağaza/modül/sanat/müzik; SDK hariç tutma ve takım yardım yazıları. |
| **17–21 Aralık** | 2.5.0 cihaz kabulü ve paket yayın hedefi | 21 Aralık paket hedefi korunur; S1'in canlı kataloğu ve hakları korunur, S2 açılmaz. |
| **22 Aralık, 03.00 TR** | S1 ve takım turnuvasının otomatik kapanışı | Kazanılmış haklar ve sıralama kasaları oyuncu girişi olmadan Mesaj Kutusu'na aktarılır. |
| **22 Aralık sonrası** | Düzenleme ve dinlenme arası | S2 ayrıca onaylanana kadar sezon kapalıdır. 28 Aralık yalnız koşullu hedeftir. |

İlk dönemlerin 24 Kasım, 1, 8 ve 15 Aralık başlangıçları yedi tam gün aralıklıdır.
S2 başlangıcı kesinleşince S3–S6 sezon tahminleri ve bağlı paket bağımlılıkları
birlikte yeniden değerlendirilir; tarihler otomatik olarak öne çekilmez.
Kapasite varsayımı tek ana akış, haftada beş gün, günde 4–6 saat ve yaklaşık
%20 hata/test/gözlem payıdır; bu süreler ölçülmüş geçmiş hız değildir.

## 6. Takvime göre çalışma kuralları

1. Her pazartesi haftanın işi, kalan risk ve bitiş kanıtı gözden geçirilir.
   Yeni özellik o anki pakete kendiliğinden eklenmez; sonraki paket listesine girer.
2. Kapsam kapanışından sonra paket yalnız test, hata düzeltmesi ve dağıtım
   hazırlığı alır. Bir sonraki özelliğin yarım hâli açılmaz.
3. Kritik giriş, veri kaybı, ödeme, ödül çoğaltma veya maç engeli öne alınır;
   mevcut sürüm için PATCH çıkarılır. Diğer hata işleri ayrılan paya veya
   planlı bakım paketine yazılır. Yeni iş yine MINOR, büyük uyumsuz değişim MAJOR.
4. Hedef yayın gününden önce test/Play/istemci kapısı geçilmezse paket yeniden
   planlanır. Canlı S1 takvimi 24 Kasım–22 Aralık olarak korunur; 2.5.0 paketi
   gecikirse sezon uzatılmaz. S2 dinlenme arası, yeni içerik kabulü ve ayrı
   operatör kararından sonra açılır; eski kaydırma seçenekleri geçerli değildir.
5. Başlamış sezon ortasında tarih veya kazanılmış hak değiştirilmez. Geç
   kalan sonraki paket yüzünden mevcut sezon uzatılmaz/sıfırlanmaz; yeni dönem
   eksikse açık “başlangıç bekleniyor” durumu kullanılır, eski ödül döndürülmez.
6. Takvim güncellemesinde tarih, gerekçe, kapsam etkisi ve bir sonraki sezon
   etkisi birlikte kaydedilir. Her şey sessizce bir hafta ileri itilmez.
7. Her dönem güncel kaynak/modül bütçesi tekrar doğrulanır. Yeni modül ve
   özgün stok olmadan S2 ve sonrası takvim doldu diye kendiliğinden başlamaz.
8. Bu dosyanın yazılması gelecekteki işi otomatik çalıştırmaz; aktif çalışma
   ve test/yayın adımları ilgili tarihlerde gerçekten yürütülür.

Gelecek paketlerde kapsam daraltılacaksa önce ikincil özellikler çıkarılır;
veri koruma, tek teslim, eski istemci uyumu ve ortak sanat yönü yayın koşulu kalır.
