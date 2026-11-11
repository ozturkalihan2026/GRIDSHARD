# GRIDSHARD — sürümlere göre bağlı uygulama rehberi

**4 Kasım 2026.** 3 Kasım takvimi ve ürün yönü korunur. İlk çalışma 2.4.0; sarı geri/ileri kontrolleri, saldırı/çekirdek sesleri, Topla kasa açılışı ve XP emirleri bu paketin zorunlu kapsamına eklendi. [S1 ödül ve XP sözleşmesi](planning/season-1-rewards-and-xp.md).

**2.4.0 geliştirme ve yayın kararı:** 6 Kasım 2026 kararı: 2.4.0 yayınlanana kadar açık geliştirme sürümüdür. Hata düzeltmeleri, UI iyileştirmeleri ve kabul edilen eklemeler aynı 2.4.0 adayında birikir; her düzeltmede 2.4.1 açılmaz. Test paketleri gerektiğinde yeniden üretilir; mağaza yüklemesi gerektirirse Android versionCode ilerler, görünen sürüm 2.4.0 kalır. Sunucu geçişi ve son kaynaktan üretilecek imzalı AAB dağıtımı planlanan yayın zamanında, kabul kapıları tamamlanınca yapılır. Hazır test APK’sı yayımlanmış sürüm veya dağıtıma hazır son AAB kabul edilmez. Genel sürüm ve sezon takvimi korunur; yeni fikirler uygun sürümün backlog, kapsam ve kabul maddelerine eklenebilir, tarih değişikliği ayrıca planlanır. 2.4.0 yayımlandıktan sonraki ayrı hata düzeltme yayını 2.4.1 olur; sonraki minor/major yayınlarda mevcut sürümleme kuralı sürer.

## Kullanım ve tek kaynak düzeni

1. Takvimden sürümü aç; aşağıdaki ayrıntılı brief içinden iş sırasını, uygulama adımlarını ve dosyaları takip et.
2. Görev durumu, önkoşullar, kabul ve kanıtlar [backlog](planning/gridshard_development_backlog_v1.json) içinde tutulur.
3. Tarihler, sürüme özel alt paketler ve çalışma aralıkları [takvim JSON](planning/release_calendar_v1.json) içinde tutulur.
4. Checklist, takvim tabloları ve bu brief’ler kaynaklardan yeniden üretilir; elle durum çoğaltılmaz.

```powershell
python tools/development_checklist.py --write
python tools/release_calendar.py --write
python tools/release_delivery_plan.py --write
python tools/development_checklist.py --check
python tools/release_calendar.py --check
python tools/release_delivery_plan.py --check
```

## Sürüm özeti ve ayrıntılı içerik bağlantıları

| Sürüm / brief | Somut içerik | Çalışma başlangıcı | Kapsam kapanışı | Kabul testleri | Yayın hedefi | Sezon |
| --- | --- | --- | --- | --- | --- | --- |
| [2.4.0](planning/releases/2.4.0.md) | Mevcut 24 modülle ilk sezon; mevcut kozmetiklerin tekil tahsisi, kaynak ödüllü haftalar, güvenli kapanış ve sürüm geçişi. Bütün geri/ileri gezinme düğmelerinde ortak son sarı tasarım; saldırı VFX ve çekirdek seslerinde eksik bağlantı/cızırtı düzeltmesi. Sabit ödül kasalarında çekirdek teslimi ve Topla açılış animasyonu; mevcut XP eşiğini koruyan günlük/sezonluk Devre Emirleri. AAB değiştirmeden 2.3.0 Sistem mesajında 23 Kasım 22.00–24 Kasım 00.00 TR bakım ön duyurusu; 2.4.0 sunucu/AAB sonrasında ayrı kimlikli turnuva penceresi. S1 ve ilk haftalık turnuva 30 Kasım 03.00 TR. Arkadaşlar sayfasındaki Gelen/Giden İstek yazılarının üstüne taşan çizgi düzeltilir. İlk sezonda 240 bot, 12 takım, gerçek sıra ve kalıcı ödül ertelemesi; turnuvalarda ÖDÜLLER sekmesi; bütün arkadaş sekmelerinde çizgisiz tasarım. | 2026-11-04 | 2026-11-16 | 2026-11-19 | 2026-11-23 (hedef) | S1: 2026-11-30, 03.00 TR |
| [2.5.0](planning/releases/2.5.0.md) | Mühendis seçim kasası ve tek garantili parça teklifi; Yankı Rölesi; ikinci sezon için 6 yeni oyuncu kozmetiği ve mağazaya ayrı 4 öğe. En az bir yeni menü ve bir özgün savaş bestesi; merak/umut ve kontrollü rekabet. | 2026-11-24 | 2026-12-14 | 2026-12-17 | 2026-12-21 (hedef) | S2: 2026-12-28, 03.00 TR |
| [2.6.0](planning/releases/2.6.0.md) | Günlük Devre Deneyi: önce 7 özgün problem, ilk başarı ödülü ve keşif günlüğü; Kor Fırlatıcı; üçüncü sezon için 6 yeni oyuncu kozmetiği. | 2026-12-22 | 2027-01-11 | 2027-01-14 | 2027-01-18 (tahmin) | S3: 2027-01-25, 03.00 TR |
| [2.7.0](planning/releases/2.7.0.md) | Üç duraklı PvE Seferi, ara kayıt ve bir bonus yan rota; dördüncü sezon için 6 yeni oyuncu kozmetiği; Darbe Muhafızı hedefi. En az bir yeni menü ve iki özgün sefer savaş bestesi; gizem, keşif gerilimi ve cesaret. | 2027-01-19 | 2027-02-08 | 2027-02-11 | 2027-02-15 (tahmin) | S4: 2027-02-22, 03.00 TR |
| [2.8.0](planning/releases/2.8.0.md) | Takım ortak hedefi ve kişisel ikmal hakkı; ilk küçük ustalık hattı; beşinci sezon için yeni ödül setleri ve Toparlanma Feneri hedefi. | 2027-02-16 | 2027-03-08 | 2027-03-11 | 2027-03-15 (tahmin) | S5: 2027-03-22, 03.00 TR |
| [2.9.0](planning/releases/2.9.0.md) | Yeterli gerçek rakip varsa eşit seviyeli Draft Arenası için sınırlı pilot; altıncı sezon ödül/modül hazırlığı. | 2027-03-16 | 2027-04-05 | 2027-04-08 | 2027-04-12 (koşullu) | S6: 2027-04-19, 03.00 TR |

**2.4.0 sunucu bakım penceresi:** 23.11.2026 22.00 → 24.11.2026 00.00, Türkiye saati; yaklaşık 2 saat. Sezon açılışı ayrı tarihtedir.

## Kapasite ve karar sınırları

- Tek ana akış, haftada 5 gün/günde 4–6 saat ve yaklaşık %20 hata/test/gözlem payı önceki varsayımdır. Önceki buton/ses kapsamı için 2.4.0 ön tahmini 14–17 aktif gündü; kasa açılışı, çekirdek teslimi ve XP emirleri bu tahmine ek iştir ve efor yeniden ölçülmelidir. 6 Kasım kontrolünde eski 12–15 gün bandına ek yük ölçülür. 16 Kasım kapanışına sığmıyorsa takvim yeniden karara bağlanır; zorunlu kalite işi sessizce çıkarılmaz.
- 2.5.0 kapsamı yoğun: seçim/mağaza, 1 modül ve 10 oyuncu öğesi. 30 Kasım kontrolünde darboğaz ölçülür; ikincil teklifler önce çıkarılır, ana teslimler yetişmiyorsa tarih yeniden planlanır.
- 2.6–2.8 eforları 4 Ocak 2027’de; Draft ve S6 modül brief’i 1 Mart 2027’de değerlendirilir. 1 Mart, 2.9.0 geliştirmesinden önce karar kontrolüdür; ayrı üretim başlangıcı değildir.
- Kaynak miktarı, fiyat, hasar/süre, katkı eşiği ve draft katılım eşikleri ilgili rapor/prototipten sonra sayısal karar dosyasına yazılır. Bu değerler kesinleşmeden ilgili özellik yayınlanamaz; plan sayıları uydurmaz.
- COS-02 üst üretim işi 18 öğenin toplamıdır; sürüm kapıları COS-05/06/07 alt gruplarını izler. CARD-03 fizibilite işidir; CARD-04/05/06 gerçek modül teslim kapılarıdır. Lisans/kupon REWARD-05 ortak araştırması ana sürümü kilitlemez.

## Tarihsiz kalan destek ve araştırma işleri

Aşağıdaki işler kaybolmadı; ana paketlerin zorunlu kapsamına kendiliğinden eklenmez. Bir sürüme alınırsa takvim paketi, bağımlılık ve çıkış kapısı birlikte güncellenir.

- [COS-02](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#cos-02) — Üç yayın grubunda 18 yeni oyuncu tasarımı üret (in_progress).
- [CARD-03](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#card-03) — Yeni içerik kategorileri ve ileri kart stoğunu tasarla (later).
- [SHOP-04](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#shop-04) — Yeni gerçek para paketlerini ayrı kapıdan geçir (later).
- [UI-06](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#ui-06) — Maç sonrası öğrenme ve deste kaydetme akışını tasarla (todo).
- [LIVE-08](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#live-08) — Asenkron arkadaş meydan okumasını tasarla (later).
- [LIVE-09](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#live-09) — BO3 ve deste yasağı fizibilitesini hazırla (later).
- [LIVE-10](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#live-10) — 2v2 için protokol ve performans araştırması yap (later).
- [LIVE-11](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#live-11) — Boss ve özel arena davranışı prototiple (later).
- [OPS-01](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#ops-01) — Dönem bazlı içerik üretim takvimini işlet (in_progress).
- [RET-01](GRIDSHARD_GELISIM_CHECKLIST_20261103.md#ret-01) — Geri dönüş ve bildirim tercihlerini uygula (todo).

Ortak sanat yönü: [docs/SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md](SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md). Teknik sözleşmeler: [docs/GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md).
