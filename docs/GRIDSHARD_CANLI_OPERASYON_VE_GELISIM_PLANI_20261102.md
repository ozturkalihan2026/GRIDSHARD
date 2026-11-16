# GRIDSHARD — canlı operasyon ve ürün yönü

15 Kasım 2026 güncellemesi. 2.4.0/code15 yayımlandı; sıradaki paket 2.5.0'dır.
S1 ve iki turnuva 24 Kasım 03.00 TR otomatik açılır, 22 Aralık 03.00 TR kapanır.
Ardından düzenleme/dinlenme arası gelir; S2 ayrıca onaylanır ve kendiliğinden başlamaz.
Güncel kapsam, tarihler, uygulama ve dosya bağları [sürüm rehberindedir](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md).
Bu belge önceki araştırmanın yerine güncel ürün ilkelerini ve üretilen takvim özetini tutar.

## Ürün ilkeleri

- Oyuncuya ilerleme, seçim, öğrenme ve ortak başarı için somut hedef sun.
- Mevcut savaşın okunabilirliği, bağlantı güvenilirliği ve oyuncu haklarını koru.
- S1 mevcut 24 modülle açılır; kaynak haftaları ve üç ana kozmetik tahsisi açık türlerdir.
- S2+ her sezonda gerçek hazır yeni modül ve özgün stok gerektirir.
- Dönem koleksiyonunu başka dönemde/mağazada tekrar satma veya dağıtma.
- Yeni oyun modlarını tek etkinlik penceresinde, ekonomi/katılım ölçümüyle başlat.
- Yeni para birimi, ücretli yeniden çekiliş, ticaret ve kalıcı ek PvP kuyruğu ilk kapsam değildir.
- Ortak sanat yönünü koru; yeni özellikler hak koruyan kapatma ve eski istemci kabulü alır.

## Bağlı belgeler

- [Ayrıntılı uygulama planları](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md).
- [Checklist](GRIDSHARD_GELISIM_CHECKLIST_20261103.md) ve [backlog](planning/gridshard_development_backlog_v1.json).
- [Teknik sözleşmeler](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md).
- [Ödül araştırması](GRIDSHARD_MAGAZA_ODUL_ARASTIRMASI_20261103.md) ve [portföy](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md).

## Sürüm takvimi

Bu bölüm takvim JSON'undan üretilir; hedef tarihler otomatik yayın kararı değildir.

<!-- release-calendar:begin -->
**Güncel sezon ve ara kararı:** 2.4.0 yayımlandı. S1 24 Kasım 03.00 TR otomatik başlar, 22 Aralık 03.00 TR kapanır; ardından düzenleme/dinlenme arası vardır. S2 kendiliğinden açılmaz: 28 Aralık yalnız koşullu hedef, kesin tarih ayrıca onaylanacak. S3–S6 tarihleri S2 onayına bağlı tahmindir; S2 değişirse bağlı sezonlar yeniden planlanır. 2.5.0 paketinin 21 Aralık yayın hedefi sezon açılışından ayrıdır ve korunur.

**2.4.0 geliştirme ve yayın kararı:** 6 Kasım 2026 kararı: 2.4.0 yayınlanana kadar açık geliştirme sürümüdür. Hata düzeltmeleri, UI iyileştirmeleri ve kabul edilen eklemeler aynı 2.4.0 adayında birikir; her düzeltmede 2.4.1 açılmaz. Test paketleri gerektiğinde yeniden üretilir; mağaza yüklemesi gerektirirse Android versionCode ilerler, görünen sürüm 2.4.0 kalır. Sunucu geçişi ve son kaynaktan üretilecek imzalı AAB dağıtımı planlanan yayın zamanında, kabul kapıları tamamlanınca yapılır. Hazır test APK’sı yayımlanmış sürüm veya dağıtıma hazır son AAB kabul edilmez. Genel sürüm ve sezon takvimi korunur; yeni fikirler uygun sürümün backlog, kapsam ve kabul maddelerine eklenebilir, tarih değişikliği ayrıca planlanır. 2.4.0 yayımlandıktan sonraki ayrı hata düzeltme yayını 2.4.1 olur; sonraki minor/major yayınlarda mevcut sürümleme kuralı sürer. 13 Kasım 2026 ek kararı: zorunlu yama nedeniyle yalnız 2.4.0 geçiş hedefi 23 Kasım yerine 13 Kasım 22.00–14 Kasım 00.00 TR olarak öne alındı. Kapsam kapanışı ve son kabul aynı gün yapılır; açık cihaz/CI/yedek/restore kapıları geçmiş sayılmaz. Sunucu geçişi ve imzalı AAB hazırlığı ev bilgisayarında; mağaza inceleme/dağıtım sonucu ayrıca doğrulanır. S1–S6, haftalık ve koşullu takım turnuvası takvimi değişmedi. 13 Kasım evde son karar: geçiş şimdi yapılır. S1, haftalık ve takım turnuvaları 24 Kasım 03.00 TR aynı anda başlar; 22 Aralık 03.00 TR biter. Günlük giriş ve sezon ödülleri sezon kapısına bağlıdır; ücretli sezon sütunu mağaza gibi gizlidir. 15 Kasım kararı önceki 30 Kasım hedefini değiştirir: S1 ve iki turnuva 24 Kasım 03.00 TR otomatik açılır; dört tam hafta sonunda 22 Aralık 03.00 TR kapanır. Oyuncu girişi olmadan kalıcı kapanış/ödül teslimi çalışır. Sonrasında sezon arası vardır; S2 için ayrı operatör kararı gerekir.

**2.5.0 geliştirme ve yayın kararı:** 16 Kasım 2026 güncel karar: 2.4.0 yayındadır; S1, 24 Kasım–22 Aralık 03.00 TR takviminde mevcut yayımlanmış katalogla sürer. 2.5.0 için 21 Aralık paket hazırlık hedefidir. Canlı sunucu geçişi S1 kapanışı ve ödül teslimi doğrulandıktan sonra yapılacak; 22 Aralık 03.00 TR öncesinde geçiş yoktur ve kesin bakım penceresi henüz belirlenmedi. S2, 28 Aralık koşullu hedefiyle ayrıca onaylanır; paket hazırlığı sezon açmaz. Reklam/satın alma kaynakları ve geçmiş işlem/iade hakları korunur; SDK, native mağaza köprüsü ve BILLING/reklam izinleri 2.5.0 paketine alınmaz. Son imzalı AAB, TR/EN cihaz kabulü ve Console beyanları yayın kapısıdır. Mevcut günlük/sezonluk emir, giriş, ücretsiz sezon yolu ve maç sonucunda Akı/kredi miktarları birlikte dengelenir; ayrı günlük/haftalık para desteği eklenmez. Yeni modül destek değil, saldırı adayı Geri Tepme Topudur; aktif katalog kapıları tamamlanmadan açılmaz. ECON-01 ortak cüzdan/parça modeli ve ECON-02 beş kanallı sürümlü para teslimi yerel dalda hazır; yeni miktarlar sürüm/yürürlük/onaylı dönem kapısındadır. REWARD-02 haftalık kazanım/sabit seçenek/tek teslim API katmanı ve UI-03 özgün petrol/fildişi/bakır Mühendis Kasası seçim/açılış ekranı yerel dalda hazır; Ödüller ve Mesaj Kutusu aynı kazanılmış hakka gider. Genel kapanış/aktarım REWARD-03 ve UI-02 gerçek mağaza arayüzü dalda hazırdır; COS-03 dört ayrı mağaza kozmetiği kilitli önizlemede hazırdır. SHOP-03 bir garantili modül teklifi ve iki ayrı kozmetik setinin yalnız oyun içi Devre Kredisiyle edinimi/pilot fiyatı dalda hazırdır. Gerçek para, reklam veya ödeme köprüsü yoktur; üç teklif draft kalır. Son denge, kalan sezon sanatı/müzik ve fiziksel cihaz/yayın kabulü açıktır. Ek efor 30 Kasım kapasite kontrolünde ölçülür.

| Sürüm | Çalışma dönemi | Kapsam kapanışı | Hedef yayın | Sezon başlangıcı | Oyuncuya gelen ana içerik | Kesinlik |
| --- | --- | --- | --- | --- | --- | --- |
| **[2.4.0](planning/releases/2.4.0.md)** | 04.11.2026–13.11.2026 | 13.11.2026 | **13.11.2026** | 24.11.2026, 03.00 TR (otomatik açılış) | Mevcut 24 modülle ilk sezon; mevcut kozmetiklerin tekil tahsisi, kaynak ödüllü haftalar, güvenli kapanış ve sürüm geçişi. Bütün geri/ileri gezinme düğmelerinde ortak son sarı tasarım; saldırı VFX ve çekirdek seslerinde eksik bağlantı/cızırtı düzeltmesi. Sabit ödül kasalarında çekirdek teslimi ve Topla açılış animasyonu; mevcut XP eşiğini koruyan günlük/sezonluk Devre Emirleri. AAB değiştirmeden 2.3.0 Sistem mesajında 13 Kasım 22.00–14 Kasım 00.00 TR bakım ön duyurusu; 2.4.0 sunucu/AAB sonrasında ayrı kimlikli turnuva penceresi. S1 ve ilk haftalık turnuva 24 Kasım 03.00 TR. Arkadaşlar sayfasındaki Gelen/Giden İstek yazılarının üstüne taşan çizgi düzeltilir. İlk sezonda 240 bot, 12 takım, gerçek sıra ve kalıcı ödül ertelemesi; turnuvalarda ÖDÜLLER sekmesi; bütün arkadaş sekmelerinde çizgisiz tasarım. Zorunlu yama için erken geçiş duyurusu ayrı kimlikle yeniden gönderilir. Gerçek para satın alma girişleri ve savaş sonu reklamı kod silinmeden istemcide gizlenir; mevcut haklar ve oyun içi para sandıkları korunur. | yayımlandı |
| **[2.5.0](planning/releases/2.5.0.md)** | 24.11.2026–14.12.2026 | 14.12.2026 | **21.12.2026** paket hazırlığı; canlı S1 sonrası | 28.12.2026, 03.00 TR (koşullu hedef; ayrıca operatör onayı, otomatik açılmaz) | Mühendis seçim kasası ve tek garantili parça teklifi; Geri Tepme Topu; ikinci sezon için 6 yeni oyuncu kozmetiği ve mağazaya ayrı 4 öğe. En az bir yeni menü ve bir özgün savaş bestesi; merak/umut ve kontrollü rekabet. Tamamen ücretsiz/reklamsız ilerleme için Akı ve Devre Kredisi kaynak-harcama dengesi; mevcut günlük/sezonluk emir, giriş, ücretsiz sezon yolu ve maç sonucunun para dengesi ve sezon arası erişim. | hedef |
| **[2.6.0](planning/releases/2.6.0.md)** | 22.12.2026–11.01.2027 | 11.01.2027 | **18.01.2027** | 25.01.2027, 03.00 TR (S2 onayına bağlı tahmin) | Günlük Devre Deneyi: önce 7 özgün problem, ilk başarı ödülü ve keşif günlüğü; Kor Fırlatıcı; üçüncü sezon için 6 yeni oyuncu kozmetiği. | tahmin |
| **[2.7.0](planning/releases/2.7.0.md)** | 19.01.2027–08.02.2027 | 08.02.2027 | **15.02.2027** | 22.02.2027, 03.00 TR (S2 onayına bağlı tahmin) | Üç duraklı PvE Seferi, ara kayıt ve bir bonus yan rota; dördüncü sezon için 6 yeni oyuncu kozmetiği; Darbe Muhafızı hedefi. En az bir yeni menü ve iki özgün sefer savaş bestesi; gizem, keşif gerilimi ve cesaret. | tahmin |
| **[2.8.0](planning/releases/2.8.0.md)** | 16.02.2027–08.03.2027 | 08.03.2027 | **15.03.2027** | 22.03.2027, 03.00 TR (S2 onayına bağlı tahmin) | Takım ortak hedefi ve kişisel ikmal hakkı; ilk küçük ustalık hattı; beşinci sezon için yeni ödül setleri ve Toparlanma Feneri hedefi. | tahmin |
| **[2.9.0](planning/releases/2.9.0.md)** | 16.03.2027–05.04.2027 | 05.04.2027 | **12.04.2027** | 19.04.2027, 03.00 TR (S2 onayına bağlı tahmin) | Yeterli gerçek rakip varsa eşit seviyeli Draft Arenası için sınırlı pilot; altıncı sezon ödül/modül hazırlığı. | koşullu |

| Sezon | Başlangıç — bitiş (bitiş hariç) | Modül planı |
| --- | --- | --- |
| S1 | 24.11.2026–22.12.2026, 03.00 TR (otomatik açılış) | Mevcut 24 modül; yalnız ilk sezon istisnası |
| S2 | 28.12.2026–25.01.2027, 03.00 TR (koşullu hedef; ayrıca operatör onayı, otomatik açılmaz) | Geri Tepme Topu |
| S3 | 25.01.2027–22.02.2027, 03.00 TR (S2 onayına bağlı tahmin) | Kor Fırlatıcı |
| S4 | 22.02.2027–22.03.2027, 03.00 TR (S2 onayına bağlı tahmin) | Darbe Muhafızı — ayrıntılı üretim eforu 4 Ocak kontrolünde yeniden tahmin edilecek |
| S5 | 22.03.2027–19.04.2027, 03.00 TR (S2 onayına bağlı tahmin) | Toparlanma Feneri — ayrıntılı üretim eforu 4 Ocak kontrolünde yeniden tahmin edilecek |
| S6 | 19.04.2027–17.05.2027, 03.00 TR (S2 onayına bağlı tahmin) | Yeni modül konsepti 1 Mart tasarım kontrolünde belirlenecek; hazır olmadan sezon açılmaz |

**2.4.0 sunucu bakım penceresi:** 13.11.2026 22.00 → 14.11.2026 00.00, Türkiye saati; yaklaşık 2 saat. Sezon açılışı ayrı tarihtedir.

**Canlı sunucu geçişi:** S1 kapanışı ve ödül teslimi doğrulandıktan sonra; en erken 22.12.2026 03.00 TR. Kesin bakım penceresi henüz belirlenmedi. Paket hazırlık hedefi canlı geçiş tarihi değildir.

<!-- release-calendar:end -->
