# GRIDSHARD — uygulanabilir gelişim kontrol listesi

**Tarih: 3 Kasım 2026 · Proje: mağaza, ödül, içerik ve yaşayan oyun**

Bu dosya araştırmayı uygulanabilir işlere böler. Toplam **74 iş** vardır: **53 yapılacak**, **5 dalda hazır; canlıda yok**, **6 çalışılıyor**, **3 kanıtla tamamlandı**, **7 ölçüme bağlı ileri aşama**. Dalda hazır iş canlıda yayımlanmış sayılmaz. Yeni mağaza, seçim kasası ve modlar henüz uygulanmadı.

**Son ayrıntılandırma: 4 Kasım 2026.** Takvim → sürüm briefi → görev → dosya/kanıt bağlantıları kuruldu; 2.4.0 sarı geri/ileri kontrolleri ve saldırı/çekirdek sesleri zorunlu kapsamdadır.

## 1. Proje dosyaları ve kullanım

- [Önceki gelişim planı](GRIDSHARD_CANLI_OPERASYON_VE_GELISIM_PLANI_20261102.md): ürün yönü ve ilk araştırma.
- [Yeni rakip/ödül araştırması](GRIDSHARD_MAGAZA_ODUL_ARASTIRMASI_20261103.md): kaynaklar, tarih ve çıkarımlar.
- [Teknik tasarım](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md): mevcut/yeni altyapı, veri/API ve ekran sözleşmeleri.
- [Ortak sanat yönü](SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md): bütün paketler için referans aile ve yön değişikliği koşulları.
- [2.4.0 geliştirme kademeleri](RELEASE_2_4_0_GELISTIRME_PLANI_20261103.md): güncel kapsam, ilk stok uygulaması ve sonraki üretim işleri.
- [Ödül portföyü ve tarihli yayın takvimi](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md): ödül çeşitleri, haftalık iş, kapsam kapanışı, sürüm ve sezon tarihleri.
- [Makine tarafından okunabilir iş listesi](planning/gridshard_development_backlog_v1.json): görevlerin tek kaynağı.

- [Sürüm uygulama rehberi](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md): her sürümün alt paketleri, çalışma aralıkları, dosyaları ve kabulü.

Görevi güncellemek için JSON içindeki `status`, `evidence` ve gerekiyorsa kabul ölçütlerini düzenle. Sonra repo kökünde çalıştır:

```powershell
python tools/development_checklist.py --write
python tools/development_checklist.py --check
```

Bağlı brief ve takvim için ayrıca `python tools/release_calendar.py --write` ve `python tools/release_delivery_plan.py --write` çalıştır; ardından ikisinin `--check` komutunu kullan.

Araç yalnız planı okur/yazar; oyun, sunucu, veritabanı veya mağazayı başlatmaz. Bağımlılık döngüsü, geçersiz kimlik, eksik kaynak yolu, kapsam kaybı ve işaretlenen işin kanıt eksikliğini denetler. Oyun testlerinin yerine geçmez. Bu Markdown dosyası üretilir; kalıcı görev değişikliklerini JSON üzerinden yap.

Durumlar: `todo`, `in_progress`, `branch_ready`, `done`, `later`. `[x]` ile işaretlenen dal hazırlığının yanında canlıda olmadığı açıkça yazılır. Gelecek işe yalnız tanımı hazır diye `done` yazılmaz.

## 2. Ürün kararları

1. Yeni ürünün oyuncu faydası önce tanımlanır: hedefli ilerleme, seçim, koleksiyon veya ustalık.
2. Mevcut dört sandığın fiyat/olasılık/hediye hakları korunarak baz ölçüm yapılır; yeni miktarlar ekonomik rapordan sonra seçilir.
3. İlk mağaza pilotu garantili parça ve ayrı kozmetik stoğudur. Yeni gerçek para paketleri ayrı sonraki kapıdadır.
4. Sezon/etkinlik koleksiyon ödülü başka dönemde veya mağazada tekrar sunulmaz. Kaynak para/parçalar tekrar kullanılabilir.
5. Yeni modlar tek etkinlik penceresiyle başlar; her mod için sürekli PvP kuyruğu açılmaz.
6. Kozmetik savaş gücü vermez; mevcut premium ilerleme avantajları yokmuş gibi pazarlanmaz.
7. Yeni para birimi, ücretli yeniden çekiliş, oyuncular arası ticaret ve web ödeme mağazası ilk kapsamda değildir.

Bütün sürümlerde mevcut onaylı sanat yönü korunur. Yön değişecekse önce brief, yan yana örnekler, varlık/ekran envanteri ve geçiş işleri hazırlanır; tek ekranın farklı stile kayması tamamlanmış geçiş sayılmaz.

## 3. Hazır olan ile yapılacak olanın sınırı

| Durum | İçerik |
| --- | --- |
| Canlı sunucu 2.3.0 | Profil/takım düzeltmeleri, ortak yalnız-ok geri düğmeleri ve sürüm mesajları; mevcut mağaza/sandık/ödül sistemi korunur. |
| Canlıda kilitli | 15 kozmetik ve üç tema önizlemesi; tahsis/yayın sıfır, mevcut sahiplik korundu; `COS-01` tamam. |
| Bu turda hazırlanan | Kaynaklı araştırma, teknik tasarım, 74 görev, sürümlü yayın kademeleri ve yerel plan doğrulama aracı. |
| Uygulanacak | Yeni teklifler, seçim hakları, kapanış kurtarması, genel takvim kapısı, yeni ekranlar ve modlar. |

2.3.0 sunucu ve AAB yayını kullanıcı tarafından teyit edildi; RELEASE-00 tamam. Fiziksel cihaz testinin ayrıca raporlanmadığı kayıtta korunur. Aktif geliştirme 2.4.0 mevcut 24 modülle ilk sezon açılışıdır; geniş üretim sonraki paketlere bölündü.

## 4. Teslim dilimleri ve çıkış kapıları

| Dilim | Somut teslim | Kapı / sonraki adım |
| --- | --- | --- |
| R0 | Ekonomi baz çizgisi, ekran prototipi, ilk deneyim ve ölçüm tanımı | BASE-01/02/03, ECON-01, UI-01 |
| R1 | Önce 2.3.0 kilitli kozmetik; sonra 2.4.0 dönem ödülü/içerik açılışı | RELEASE-00 → RELEASE-01; 2.3.0 için yeni sezon/kart stoğu beklenmez |
| R2 — sonraki minor | Bir garantili parça teklifi, ayrı dört mağaza kozmetiği, seçim kasası ve kapanış hakları | RELEASE-02; mevcut ürün/ödeme hakları korunur |
| R3 | Günlük Devre Deneyi ve tek etkinlik vitrini; öğrenme/ustalık işleri ayrı tamamlanır | RELEASE-03; ölçüm ve koruyucu kalite kararı |
| R4 | PvE Seferi ve takım ortak hedefi; daha sonra draft/asenkron/BO3/boss/2v2 araştırmaları | Her mod ayrı kapsam/ölçüm/yayın kapısı alır |

R1/R2/R3 bir takvim günü veya kesin sürüm sözü değildir. Tek geliştirici için aynı anda bir büyük backend/motor işi ve bir küçük görsel paket önerilir. S≈1–2, M≈3–5, L≈6–10 geliştirici günü taslak efor bandıdır; sanat, cihaz QA ve beklemeler ayrıca tahmin edilir. XL işe başlamadan daha küçük alt işler ayrılır. Efor bantlarının toplamı teslim tarihi olarak kullanılmaz.

**RELEASE-00 / 2.3.0:** kullanıcı yayın teyidiyle tamam. **Sonraki paket RELEASE-01 / 2.4.0:** mevcut 24 modülle S1; BASE-01, SEASON-00 ve COMPAT-01 ile ödül/kapanış/uyum kapılarını tamamla. Yeni kart ve geniş sanat stoğu 2.5.0 ve sonrasına bölündü.

### 4.1. Sürümlere göre açık yayın planı

| Sürüm | Hedef yayın | Oyuncuya gelen kapsam | Kapalı kalan | Çıkış kapısı |
| --- | --- | --- | --- | --- |
| **2.3.0 — Kilitli kozmetik ve önizleme** | Yayımlandı | Kutup Işığı, Güneş Ocağı ve Derin Akım: 15 kilitli oyuncu/takım öğesi, adlar, önizleme ve açık kilit açıklaması. | Sezon/turnuva başlangıcı, yeni ödül tahsisi, yeni mağaza ürünü ve yeni modlar. | RELEASE-00: Kilit/kuşanma, eski sahiplik, TR/EN ve iki mobil boyut; sürüm mesajı, yeşil CI, veri koruyan sunucu ve yeni imzalı AAB. |
| **[2.4.0](planning/releases/2.4.0.md) — Mevcut içerikle ilk sezon** | 2026-11-23 | Mevcut 24 modülle ilk sezon; mevcut kozmetiklerin tekil tahsisi, kaynak ödüllü haftalar, güvenli kapanış ve sürüm geçişi. Bütün geri/ileri gezinme düğmelerinde ortak son sarı tasarım; saldırı VFX ve çekirdek seslerinde eksik bağlantı/cızırtı düzeltmesi. Sabit ödül kasalarında çekirdek teslimi ve Topla açılış animasyonu; mevcut XP eşiğini koruyan günlük/sezonluk Devre Emirleri. Sürüm öncesi iki dilli duyuru, ilk açılışta hesaba bağlı bir defalık pencere ve Sistem mesajı. | Yeni modül, 18 yeni kozmetik, seçim kasası, yeni mağaza ve yeni oyun modu. | RELEASE-01: İlk sezona özel başlangıç kuralı, açık resource-only ödül türü, sabit/tek teslim, kapanışta hak koruma, 2.3/2.2.1 istemci uyumu ve yeşil CI/Play cihaz testi. Sarı gezinme kontrolü envanteri, tam saldırı/çekirdek ses matrisi ve gerçek Android dinleme kabulü zorunludur. REWARD-06, UI-08 ve SEASON-01; tekil makbuz, güvenli açılış ve 1.800 sezonluk XP tavanı kabulü. COMM-01 kabulü ve ön duyuru standardı sürüm kapısındadır. |
| **[2.5.0](planning/releases/2.5.0.md) — Seçim kasası, mağaza ve ilk yeni modül** | 2026-12-21 | Mühendis seçim kasası ve tek garantili parça teklifi; Yankı Rölesi; ikinci sezon için 6 yeni oyuncu kozmetiği ve mağazaya ayrı 4 öğe. En az bir yeni menü ve bir özgün savaş bestesi; merak/umut ve kontrollü rekabet. | Yeni gerçek para ürünü, yeni para birimi, ücretli yeniden çekiliş ve PvP deneme gücü artışı. | RELEASE-02: Seçim hakkı/sabit seçenek/tek teslim, atomik limit/harcama, ücretsiz yeni modül edinimi, denge/karşı oyun ve kanal stok ayrımı. AUDIO-03 kabulü ve ön duyuru standardı sürüm kapısındadır. |
| **[2.6.0](planning/releases/2.6.0.md) — Günlük deney ve ikinci yeni modül** | 2027-01-18 | Günlük Devre Deneyi: önce 7 özgün problem, ilk başarı ödülü ve keşif günlüğü; Kor Fırlatıcı; üçüncü sezon için 6 yeni oyuncu kozmetiği. | Dereceli maçta kiralık güç, PvE seferi ve ayrı kalıcı PvP kuyruğu. | RELEASE-03: Sunucu doğrulaması, ilk/tekrar ödülü ayrımı, gün değişimi, kaynak bütçesi, yeni problem stoğu ve modül karşı oyunu. |
| **[2.7.0](planning/releases/2.7.0.md) — PvE Seferi** | 2027-02-15 | Üç duraklı PvE Seferi, ara kayıt ve bir bonus yan rota; dördüncü sezon için 6 yeni oyuncu kozmetiği; Darbe Muhafızı hedefi. En az bir yeni menü ve iki özgün sefer savaş bestesi; gizem, keşif gerilimi ve cesaret. | Takım boss'u ve gerçek zamanlı 2v2. | RELEASE-04: Koşu kurtarma, ilk/tekrar ödülü, yan rota tek teslimi; yeni modül için çalışma kodu/görsel/denge/ücretsiz edinim. CARD-03 taslak brief'i hazır modül sayılmaz. İlk üç takım seti tüketildiyse yeni takım seti de üretilir; oyuncu stoğu buna yetmiş sayılmaz. AUDIO-04 kabulü ve ön duyuru standardı sürüm kapısındadır. |
| **[2.8.0](planning/releases/2.8.0.md) — Takım ortak hedefi ve ustalık** | 2027-03-15 | Takım ortak hedefi ve kişisel ikmal hakkı; ilk küçük ustalık hattı; beşinci sezon için yeni ödül setleri ve Toparlanma Feneri hedefi. | Oyuncular arası ticaret, hediye zinciri ve parayla oy hakkı. | RELEASE-05: Üyelik/katkı tavanı/tek teslim, küçük takım erişimi, yeni sezon modülü ve özgün stok. |
| **[2.9.0](planning/releases/2.9.0.md) — Eşit seviyeli Draft Arenası — koşullu pilot** | 2027-04-12 | Yeterli gerçek rakip varsa eşit seviyeli Draft Arenası için sınırlı pilot; altıncı sezon ödül/modül hazırlığı. | Kalıcı draft kuyruğu, BO3 ve 2v2. | RELEASE-06: Aktif rakip ve bekleme verisi, adalet/bağlantı testi, altıncı sezon için yeni modül ve yeni stok. Modül brief'i 1 Mart kontrolüne kadar kesinleşir. |

Tarihlerin hedef/tahmin/koşullu ayrımı ödül portföyü ve sürüm takviminde tanımlıdır. Tarih gelmesi kendiliğinden yayın kararı değildir. Her pakette ortak tamamlanma kapısı uygulanır. Hazır olmayan özellik kapalı kalır; eski ödülü tekrar vererek takvim doldurulmaz.

Her yayın: geliştirme → yerel/cihaz kabulü → iç test → kapalı test → kontrollü üretim → gözlem. Sunucu yeni ve önceki desteklenen istemciyle uyumlu hazırlanır; oyuncu mağazadan güncelleyene kadar güvenli davranır. Hata düzeltmesi mevcut minor üstünde PATCH, yeni özellik sonraki MINOR; büyük dönüşüm için MAJOR ayrıca planlanır. Yeni bir 3.0.0 sözü verilmez.

## 5. İçerik kapasitesi ve karar kayıtları

- Güncel S1 planı: mevcut üç oyuncu seti sezon yolu, sıralama ve son haftaya; diğer haftalar açık kaynak ödülü türüne ayrılır. Yeni profil henüz uygulanmadı; kaynak yokluğu eski kozmetiğe düşmez.
- Eski her-hafta-kozmetik profili iki dönemde 18/20 ek oyuncu öğesi ister. Mevcut coverage hâlâ bu profili hesaplar; bu miktar yeni S1 açılışının sanat koşulu değildir.
- 18 öğelik oyuncu brief'i S2/S3/S4 için altışar öğeye bölündü. Mağazanın ayrı dört öğesi 2.5.0'dadır. İlk üç takım seti tüketilince yeni takım stoğu ayrıca gerekir.
- Yeni etkinlik ayrı koleksiyon ödülü verecekse ek stok ayrıca hesaplanır; mevcut iki dönem hesabı her yeni modu kapsamaz.
- Yalnız S1 için mevcut 24 modül istisnası kullanıcı tarafından seçildi; kodda uygulanacak. S2 ve sonrasında en az bir yeni hazır modül, ücretsiz edinim ve karşı oyun koşulu korunur.
- Yeni unvan, avatar, çekirdek görünümü, takım vitrini ve arena kozmetiği ayrı renderer/sahiplik maliyetiyle CARD-03 kapsamında sıralanır.

Yayın öncesinde karar dosyasına yazılacaklar: yeni teklif miktarı/fiyatı ve limit; seçim kasası kazanım yolu; katılım tavanları; toplanmamış hakların kapanış davranışı; ilk etkinlik penceresi; sanat/cihaz kabulü. Bunlar bu tur için kullanıcıdan yanıt bekleyen engeller değildir; uygulama/yayın görevlerinin ölçülebilir teslimleridir.

## 6. Ürün hedeflerinin kapsama haritası

| Ürün hedefi | Bu projedeki işler |
| --- | --- |
| Mevcut altyapı | BASE-01, DATA-01, teknik tasarım §1 |
| Kozmetik ve özgün dönem ödülü | COS-01/02/03/04/05/06/07/08/09, CARD-01/02/04/05/06, REWARD-01 |
| Geri dönüş döngüleri | BASE-03, REWARD-03/04, LIVE-02/03/05/07/12, RET-01 |
| Modlar ve ileri araştırma | LIVE-02/04/05/06/07/08/09/10/11/12; giriş LIVE-03 |
| Kalıcı gelişim ve sunum | BASE-03, UI-04/05/06/07, AUDIO-01/02, PLAY-01, BALANCE-01, QA-01 |
| Ölçüm | BASE-02, ANALYT-01/02, ECON-01 |
| Yayın aşamaları | OPS-01/02 ve RELEASE-00/01/02/03/04/05/06; sürüm planı |

## 7. İş kontrol listesi

### R0 — Baz çizgi ve tasarım

<a id="base-01"></a>

- [x] **BASE-01 — Mevcut ekonomi ve ürünlerin baz çizgisini çıkar**
  - Durum: Kanıtla tamamlandı. Öncelik: P0; rol: Oyun tasarımı / backend; efor: M.
  - Önkoşullar: yok.
  - Mevcut bağlar: `server/app/meta_progression.py`, `server/app/player_progression.py`, `server/app/store_catalog.py`, `server/app/season_competition.py`, `server/app/player_profile.py`, `server/app/reward_delivery.py`, `server/app/match_accounting.py`.
  - Yeni teslim önerisi: `docs/planning/economy-baseline.md`, `docs/planning/economy-baseline.json`, `tools/report_economy_baseline.py`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Dört sandığın garanti/olasılık, fiyat, limit ve hediye kaynağı tek tabloda doğrulanır.
  - Kabul 2: Ücretsiz/premium/AI-insan ayrımı ve kaynak giriş-çıkış varsayımları kaydedilir; mevcut fiyatlar değiştirilmez.
  - Geçmiş hazırlık kanıtı: `docs/planning/economy-baseline.md`, `docs/planning/economy-baseline.json`, `tools/report_economy_baseline.py`, `tools/tests/test_economy_baseline.py`, `tools/tests/test_economy_income_model.py`.

<a id="base-02"></a>

- [ ] **BASE-02 — Analitik ve ilk deneyim ölçüm planını hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / analiz; efor: S.
  - Önkoşullar: yok.
  - Mevcut bağlar: `server/app/product_analytics.py`, `tools/product_analytics_report.py`, `docs/LOCALIZATION_AND_PRODUCT_ANALYTICS.md`.
  - Yeni teslim önerisi: `docs/planning/measurement-baseline.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Onay/yaş/30 gün saklama/hesap silme ve düşük örneklem bastırması kaynakta doğrulanır.
  - Kabul 2: D1-D7-D28 için uygun kohort ve ilk maç/deste değişimi hunisi tanımlanır; onaysız oyuncu takip edilmez.

<a id="base-03"></a>

- [ ] **BASE-03 — İlk deneyim ve geri dönen oyuncu akışını tasarla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / istemci; efor: M.
  - Önkoşullar: BASE-02.
  - Mevcut bağlar: `client/src/app.js`, `client/index.html`, `e2e/onboarding-visibility.spec.js`.
  - Yeni teslim önerisi: `docs/planning/onboarding-return-flow.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: İlk strateji kararı, ilk deste değişimi ve bugünün hedefi için ekran akışı hazırlanır.
  - Kabul 2: Eski oyuncu sürüm özeti ve isteğe bağlı öğrenme akışı görür; ilerlemesi veya kazanılmış hakkı sıfırlanmaz.

<a id="econ-01"></a>

- [ ] **ECON-01 — Deterministik ekonomi simülasyonu kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / oyun tasarımı; efor: L.
  - Önkoşullar: BASE-01.
  - Mevcut bağlar: `server/app/meta_progression.py`, `server/app/player_progression.py`, `server/app/store_catalog.py`.
  - Yeni teslim önerisi: `tools/simulate_liveops_economy.py`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Yeni/ücretsiz/premium oyuncu senaryolarında 1 ve 28 günlük kaynak giriş-çıkışı mevcut tanımlardan hesaplanır.
  - Kabul 2: Yeni kartın ücretsiz edinimi, hedef deste gelişimi ve biriken para raporlanır; miktar/fiyat kararı rapora bağlanır.

<a id="ui-01"></a>

- [ ] **UI-01 — Ekran hiyerarşileri ve ortak bileşen prototipini hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Arayüz / ürün; efor: M.
  - Önkoşullar: BASE-03.
  - Mevcut bağlar: `client/index.html`, `client/src/app.js`, `client/src/shop-rewards-v6.css`, `client/src/visual-polish-v9.css`, `docs/GORSEL_DONUSUM_PLANI_20261015.md`.
  - Yeni teslim önerisi: `docs/planning/screen-and-component-spec.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Ana ekran, mağaza, ürün, seçim kasası, sezon, profil ve maç sonrası için hiyerarşi/durumlar hazırlanır.
  - Kabul 2: Mevcut onaylı boyalı dil/dock korunur; prototip ile oyuna bağlanmış ekran açıkça ayrılır.

### R1 — Kilitli kozmetik önizlemesi → dönem ödülü/içerik açılışı

<a id="cos-01"></a>

- [x] **COS-01 — 15 kilitli kozmetik temelini canlıda koru**
  - Durum: Kanıtla tamamlandı. Öncelik: P0; rol: Backend / istemci; efor: S.
  - Önkoşullar: yok.
  - Mevcut bağlar: `server/app/cosmetic_releases.py`, `server/data/cosmetic_releases_v1.json`, `tools/prepare_liveops_rewards.py`, `server/tests/test_cosmetic_releases.py`, `e2e/liveops-cosmetics.spec.js`.
  - Yeni teslim önerisi: mevcut temel korunur.
  - Kabul 1: 15 öğe kilitli, tahsis sayısı sıfır ve sahiplik sunucuda doğrulanır.
  - Kabul 2: 2.3.0 kendi minor sürümü ve sistem mesajıyla canlıdır; 2.2.1 kurulu istemci köprüsü korunur.
  - Geçmiş hazırlık kanıtı: `artifacts/liveops-foundations-20261102/server-tests.log`, `artifacts/liveops-foundations-20261102/browser-results.json`, `artifacts/release-230-v14-20261103/FINAL_STATUS.json`, `artifacts/release-230-v14-20261103/server/deployment-success.json`, `artifacts/release-230-v14-20261103/public-smoke.json`, `deliverables/GRIDSHARD_2.3.0_14/manifest.json`.

<a id="cos-02"></a>

- [ ] **COS-02 — Üç yayın grubunda 18 yeni oyuncu tasarımı üret**
  - Durum: Çalışılıyor. Öncelik: P0; rol: Sanat / istemci; efor: XL.
  - Önkoşullar: COS-01, COS-05, COS-06, COS-07.
  - Mevcut bağlar: `server/data/cosmetic_releases_v1.json`, `tools/prepare_liveops_rewards.py`, `client/src/liveops-cosmetics-v1.css`, `docs/GORSEL_DONUSUM_PLANI_20261015.md`.
  - Yeni teslim önerisi: `docs/planning/two-cycle-art-manifest.md`.
  - Kabul 1: Dokuz çerçeve ve dokuz zemin üç altışar grupta üretilir: 2.5/S2, 2.6/S3, 2.7/S4. Özgün geometri, TR/EN ve tasarım kimliği gerekir; ilk sezonu bekletmez.
  - Kabul 2: Her alt grubun görsel/320/393 px kabulü ayrı kaydedilir. Yeniden renklendirme yeni tasarım sayılmaz; tüm 18 tamamlanmadan üst görev done olmaz.
  - Geçmiş hazırlık kanıtı: `docs/planning/two-cycle-art-manifest.md`.

<a id="cos-04"></a>

- [ ] **COS-04 — Kaynak kayıtlarını ve stok denetimini genişlet**
  - Durum: Çalışılıyor. Öncelik: P0; rol: Backend / içerik araçları; efor: M.
  - Önkoşullar: COS-01.
  - Mevcut bağlar: `server/app/cosmetic_releases.py`, `tools/prepare_liveops_rewards.py`, `server/tests/test_cosmetic_releases.py`, `server/app/liveops_content.py`, `server/data/liveops_content_sources_v1.json`, `server/tests/test_liveops_content.py`.
  - Yeni teslim önerisi: `server/data/liveops_content_sources_v1.json`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: 2.4.0 mevcut dört kaynağın ilk sezon profilini doğrular; planlı mağaza/yeni etkinlik adaptörleri kapalı kalır. Mağaza adaptörü SHOP-01/2.5.0 işidir; yalnız JSON adı ekleyerek yayın yapılamaz.
  - Kabul 2: Coverage aktif kaynak/takvim/profilden ihtiyaç hesaplar; eski tam-koleksiyon profilindeki 30 dönem öğesi hesabı korunur, yeni kaynak haftası profiliyle karıştırılmaz. Mağaza stoğu ayrıdır; yetersiz gerçek stokta yayın durur.
  - Kabul 3: Yeni ilk-sezon profilinde fixed_resources/cosmetic_set türleri ayrı sayılır; kaynak haftası eksik kozmetik fallback'i değildir. Eski tam-koleksiyon coverage raporu ayrı profil olarak korunur.
  - Geçmiş hazırlık kanıtı: `artifacts/release-240-foundations-tests.log`, `artifacts/release-240-20261103/coverage-aligned.json`, `artifacts/release-240-20261103/coverage-midweek.json`.

<a id="reward-01"></a>

- [ ] **REWARD-01 — Sürüm sabitlemeli ödül tanımlarını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: BASE-01.
  - Mevcut bağlar: `server/app/reward_delivery.py`, `server/app/meta_progression.py`, `server/app/postgres_economic_operations.py`, `server/tests/test_reward_integrity.py`.
  - Yeni teslim önerisi: `server/app/reward_definitions.py`, `server/data/reward_definitions_v1.json`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Fixed/choice/random tanımları sürüm ve içerik hash taşır; mevcut rastgele sandık ile fixed_reward farkı belgelenir.
  - Kabul 2: Yeni hak eski tanıma bağlı kalır; eski sandık stoğu ve makbuzları sessizce yeni oranlara taşınmaz.

<a id="ui-04"></a>

- [ ] **UI-04 — Tema, sezon ve takım vitrini oluştur**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / sanat; efor: L.
  - Önkoşullar: UI-01, COS-01.
  - Mevcut bağlar: `client/src/social-profile-v5.css`, `client/src/liveops-cosmetics-v1.css`, `client/src/app.js`, `e2e/liveops-cosmetics.spec.js`.
  - Yeni teslim önerisi: `client/src/liveops/collection-view.js`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Gerçek oyuncu/takım üzerinde önizleme, kazanım kaynağı ve kilit nedeni görünür.
  - Kabul 2: Ücretsiz/premium/katkı/prestij ayrımı, dönem arşivi ve sahiplik kuşanma akışı tutarlı olur.

<a id="qa-01"></a>

- [ ] **QA-01 — Ortak mobil, dil ve erişilebilirlik kapısını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: QA / istemci; efor: M.
  - Önkoşullar: UI-01.
  - Mevcut bağlar: `client/src/i18n-catalog.js`, `playwright.config.js`, `e2e/presentation-refinements.spec.js`, `e2e/battle-render-budget.spec.js`, `docs/SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md`.
  - Yeni teslim önerisi: `docs/planning/ui-acceptance-matrix.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: 320x568 ve 393x852, TR/EN, uzun ad, hata/boş/yükleme/yeniden deneme ve en az 44px hedef doğrulanır.
  - Kabul 2: Azaltılmış hareket, ses tercihi ve odak sırası korunur; Chromium/WebKit performans eşikleri gevşetilmez.
  - Kabul 3: Mevcut boyalı/hacimli sanat ailesi korunur; yan yana mobil önizleme ve görsel kabul kaydı tamamlanır. Yön değişikliği ayrı brief ve geçiş planı gerektirir.

<a id="data-01"></a>

- [ ] **DATA-01 — Yeni hakların kalıcılık ve kurtarma tasarımını tamamla**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / QA; efor: L.
  - Önkoşullar: REWARD-01.
  - Mevcut bağlar: `server/app/json_schema_migrations.py`, `server/app/postgres_economic_operations.py`, `server/migrations`, `tools/server_backup.py`.
  - Yeni teslim önerisi: `docs/planning/reward-persistence-migration.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Yeni hak/teklif tabloları ve eşsiz indeksler uygulama şemasıyla kesinleştirilir; eski SQL dosyaları değiştirilmez.
  - Kabul 2: Yeni/legacy profil ve makbuzlarla restart, backup/boş hedef restore, eşzamanlı işlem ve rollback uyumluluğu doğrulanır.

<a id="analyt-01"></a>

- [ ] **ANALYT-01 — Mağaza/ödül/etkinlik olay şemasını genişlet**
  - Durum: Yapılacak. Öncelik: P0; rol: Analiz / backend / istemci; efor: M.
  - Önkoşullar: BASE-02, UI-01.
  - Mevcut bağlar: `server/app/product_analytics.py`, `tools/product_analytics_report.py`, `server/tests/test_product_analytics.py`, `server/tests/test_analytics_age_gate.py`.
  - Yeni teslim önerisi: `docs/planning/liveops-analytics-schema.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Offer/event/choice/equip olayları sınırlı enum alanlarıyla; istemci olayı ile sunucu teslimi ayrı tanımlanır.
  - Kabul 2: Yaş/onay/silme/retention korunur; olay kaybı oyunu veya ödül teslimini bozmaz, kimlik/serbest metin eklenmez.

<a id="live-01"></a>

- [ ] **LIVE-01 — Birleşik içerik ve etkinlik yayın kapısını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / içerik araçları; efor: L.
  - Önkoşullar: COS-04, REWARD-01.
  - Mevcut bağlar: `server/app/competition_control.py`, `server/app/competition_cycle.py`, `server/app/cosmetic_releases.py`, `server/app/season_module_releases.py`.
  - Yeni teslim önerisi: `server/app/liveops_calendar.py`, `server/data/liveops_calendar_v1.json`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Kaynak türü, dönem profili, modül hazırlığı, gerçek kozmetik ihtiyacı ve bütçe birlikte doğrulanır. Yalnız S1 için kodlanmış başlangıç istisnası vardır; eksikte sonraki dönem açılmaz.
  - Kabul 2: Taslak yayın operatör başlangıcını açmaz; UTC sınırı, başlamış maç ve kazanılmış haklar sürümünü korur.

<a id="balance-01"></a>

- [ ] **BALANCE-01 — Katalog büyümesi için denge ve karşı oyun raporu kur**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / QA; efor: L.
  - Önkoşullar: BASE-01, CARD-01.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`, `server/tests/test_catalog_migration_v2.py`.
  - Yeni teslim önerisi: `tools/report_module_balance.py`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Kart seçilme/kazanma yanında arena, seviye farkı ve AI/insan ayrımlı yorum yapılır.
  - Kabul 2: Yeni kartlar için karşı oyun senaryosu ve eski altılı destelerle regresyon seti oluşturulur; düşük örneklemde kesin güç iddiası kurulmaz.

<a id="ops-01"></a>

- [ ] **OPS-01 — Dönem bazlı içerik üretim takvimini işlet**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / sanat / backend; efor: M.
  - Önkoşullar: COS-02, COS-04, CARD-02, ECON-01.
  - Mevcut bağlar: `tools/prepare_liveops_rewards.py`, `server/app/competition_cycle.py`, `server/app/competition_control.py`.
  - Yeni teslim önerisi: `docs/planning/two-cycle-production-calendar.md`.
  - Kabul 1: S1 mevcut içerik; S2/S3/S4 altışar yeni oyuncu öğesi ve S2'den itibaren yeni modül; kaynak haftaları ve ayrı takım/mağaza stoğu dönem bazında kaydedilir.
  - Kabul 2: Haftalık/aylık yeni stok yetersizse tarih revize edilir; eski kozmetik geri dönmez, açılışlar operatör kontrolündedir.

<a id="ops-02"></a>

- [ ] **OPS-02 — Yayın durdurma ve hak koruyan rollback akışını kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / operasyon; efor: M.
  - Önkoşullar: LIVE-01, DATA-01.
  - Mevcut bağlar: `server/app/release_updates.py`, `tools/release_guard.py`, `tools/package_release.py`, `docs/SURUM_VE_GUNCELLEME_MESAJLARI.md`, `Dockerfile`, `.dockerignore`, `.gitignore`.
  - Yeni teslim önerisi: `docs/planning/liveops-release-and-rollback.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Yeni satış/etkinliği durdurma ile kazanılmış hakkı teslim alma ayrılır; içerik hash ve sürüm notu korunur.
  - Kabul 2: Uygulanmış SQL baytları sabit; veri sıfırlama/otomatik live restore yok, eski sürümün yeni hakkı okuyamadığı durum açıkça ele alınır.
  - Kabul 3: Yeni statik JSON kaynak/Docker paket izin listeleri ve eşlenik release-boundary kontrollerine eklenir; özel runtime veri pakete girmez.

<a id="release-01"></a>

- [ ] **RELEASE-01 — 2.4.0 mevcut içerikle ilk sezonu yayıma hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / QA / operasyon; efor: L.
  - Önkoşullar: SEASON-00, COMPAT-01, RELEASE-00, UI-07, AUDIO-01, AUDIO-02, COS-04, REWARD-06, UI-08, SEASON-01, COMM-01.
  - Mevcut bağlar: `.github/workflows/quality.yml`, `tools/release_guard.py`, `tools/package_release.py`, `server/data/game_updates.json`.
  - Yeni teslim önerisi: `docs/planning/release-r1-evidence.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Mevcut 24 modül ve 15 kozmetikle S1 profili, sabit kaynak haftaları, tekil teslim, kapanış hakları ve gerçek restore kanıtı tamamlanır.
  - Kabul 2: 23 Kasım hedefli sürüm notu/CI/AAB ve 30 Kasım hedefli başlangıç ayrı kapılardır; eski istemci, TR/EN mobil ve Play cihaz testi geçmeden açılmaz. Yeni kart veya 18 yeni kozmetik bu sürümün koşulu değildir.
  - Kabul 3: UI-07 sarı geri/ileri envanteri, AUDIO-01 saldırı ve AUDIO-02 çekirdek ses matrisleri ile Android dinleme kabulü kapanmadan 2.4.0 tamamlanmaz.
  - Kabul 4: Sabit kasa çekirdek teslimi, Topla açılış animasyonu ve 12.240 XP eşiğini koruyan günlük/sezonluk emirler kabul edilmeden S1 yayını tamamlanmaz.

<a id="release-00"></a>

- [x] **RELEASE-00 — 2.3.0 kilitli kozmetik ve önizleme paketini yayıma hazırla**
  - Durum: Kanıtla tamamlandı. Öncelik: P0; rol: İstemci / backend / QA / operasyon; efor: M.
  - Önkoşullar: COS-01.
  - Mevcut bağlar: `server/data/cosmetic_releases_v1.json`, `server/app/cosmetic_releases.py`, `client/src/liveops-cosmetic-catalog.js`, `e2e/liveops-cosmetics.spec.js`, `server/tests/test_cosmetic_releases.py`, `tools/release_guard.py`, `server/data/game_updates.json`.
  - Yeni teslim önerisi: `docs/planning/release-230-evidence.md`.
  - Kabul 1: Üç temadaki 15 kozmetik oyuncu/takım ekranında TR/EN önizlenir; kilit nedeni açık, henüz açılmadı bilgisi doğrudur; yeni sahiplik verilmez.
  - Kabul 2: Tahsis/yayın listeleri boş ve yarışma başlangıçları kapalı kalır; mevcut oyuncu/takım sahipliği, fiyatlar ve sandık oranları korunur.
  - Kabul 3: 320/393 px, native API erişimi, sahip olunmayanı kuşanma reddi, mevcut regresyon/performans ve gerçek ödül yolu uyumluluğu doğrulanır.
  - Kabul 4: 2.3.0 sürüm/notları, başarılı CI, veri koruyan sunucu geçişi ve yeni imzalı AAB tamamlanır; 2.2.1 AAB yeniden adlandırılarak kullanılmaz.
  - Kabul 5: Mevcut boyalı/hacimli sanat ailesi korunur; yan yana mobil önizleme ve görsel kabul kaydı tamamlanır. Yön değişikliği ayrı brief ve geçiş planı gerektirir.
  - Geçmiş hazırlık kanıtı: `artifacts/release-230-20261103/browser-results.json`, `artifacts/release-230-20261103/client-tests-final.log`, `artifacts/release-230-v14-20261103/FINAL_STATUS.json`, `artifacts/release-230-v14-20261103/server/deployment-success.json`, `artifacts/release-230-v14-20261103/public-smoke.json`, `deliverables/GRIDSHARD_2.3.0_14/manifest.json`, `docs/planning/release-230-user-confirmation-20261103.md`.

<a id="season-00"></a>

- [ ] **SEASON-00 — Mevcut içerikle ilk sezon ve kaynak ödülü profilini geliştir**
  - Durum: Çalışılıyor. Öncelik: P0; rol: Backend / QA / ürün; efor: L.
  - Önkoşullar: BASE-01, COS-01.
  - Mevcut bağlar: `server/app/season_module_releases.py`, `server/app/cosmetic_releases.py`, `server/app/liveops_content.py`, `server/app/competition_control.py`, `server/app/reward_delivery.py`, `server/tests/test_production_launch.py`, `server/app/season_entitlements.py`, `server/app/first_season_profile.py`, `server/data/first_season_launch_v1.json`, `server/tests/test_season_entitlements.py`.
  - Yeni teslim önerisi: mevcut temel korunur.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Yalnız ilk açılış sezonu mevcut 24 modülle başlayabilir; açık profil/tek sezon sınırı test edilir. S2 ve sonrasında yeni hazır modül koşulu korunur.
  - Kabul 2: Kaynak ödüllü dönem açık türdür; eksik kozmetiği saklamak veya eski kozmetiğe düşmek için adet sıfırlanmaz. Kaynak/kozmetik önizlemesi gerçek sabit teslimle eşleşir.
  - Kabul 3: Kutup Işığı sezon yolu, Güneş Ocağı sıralama ve Derin Akım son hafta önerisi tekil stok/tahsis ile doğrulanır; üç oyuncu seti başka döneme dönmez.
  - Kabul 4: Kazanılmış/toplanmamış ve premium kökenli haklar sezon kapanışı, geç dönüş, tekrar/eşzamanlı talep ve restart/restore sırasında korunur. Profil/ekonomi sıfırlanmaz.
  - Kabul 5: 40 kademe/haftalık bütçe, gerçek katılım eşiği, owner/AI hariçliği, TR/EN 320/393 px, bağımsız takım başlangıcı ve yayın durdurma kanıtı gerekir.
  - Kabul 6: BASE-01 raporundaki 40 kademe ve haftalık paket bütçesi teslimle eşleşir; chest_tier/chest_count etiketi fazladan rastgele sandık üretmez. Kullanıcı kararıyla 12.240 XP tamamlama yükü korunur; SEASON-01 emirleri ve 234 ek sıradan parça önerisi uygulama kabulünde değerlendirilir; miktar/XP değişirse rapor yenilenir.
  - Geçmiş hazırlık kanıtı: `docs/planning/first-season-launch-profile.md`, `server/app/season_entitlements.py`, `server/app/first_season_profile.py`, `server/data/first_season_launch_v1.json`, `server/tests/test_season_entitlements.py`, `tools/prepare_first_season.py`, `tools/tests/test_first_season_preparation.py`.

<a id="compat-01"></a>

- [x] **COMPAT-01 — 2.4 geçişinde kurulu 2.3 ve 2.2.1 başlangıcını koru**
  - Durum: Dalda hazır; canlıda yok. Öncelik: P0; rol: İstemci / backend / QA; efor: M.
  - Önkoşullar: RELEASE-00.
  - Mevcut bağlar: `client/src/relay-client.js`, `server/app/main.py`, `tools/release_guard.py`, `server/tests/test_release_221_profiles_updates.py`, `server/app/client_compatibility.py`, `client/tests/client-compatibility.test.js`, `client/tests/fixtures/installed/manifest.json`, `server/tests/test_client_compatibility.py`, `tools/verify_client_compatibility.py`, `tools/verify-client-compatibility.cjs`, `e2e/client-compatibility.spec.js`.
  - Yeni teslim önerisi: `docs/planning/release-240-client-compatibility.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Değiştirilmemiş 2.3 ve 2.2.1 istemci kaynaklarıyla yeni sağlık/başlangıç/protokol sözleşmesi doğrulanır; sadece sürüm metni artırılarak eski istemci engellenmez.
  - Kabul 2: Gerçek sürüm raporu, minimum/capability uyumu, geçişte eski API/istemci, native yönlendirme ve güvenli güncelleme açıklaması test edilir. Yeni modül açılışı sonraki sürümde eski render/match güvenliğiyle değerlendirilir.
  - Geçmiş hazırlık kanıtı: `docs/planning/release-240-client-compatibility.md`, `artifacts/compat-240-20261104/http-proof-r3/proof.json`, `artifacts/compat-240-20261104/mobile-results.json`, `artifacts/compat-240-20261104/client-tests-final.log`, `artifacts/compat-240-20261104/server-tests-final.log`.

<a id="ui-07"></a>

- [x] **UI-07 — Bütün geri ve ileri gezinme kontrollerini son sarı tasarımda birleştir**
  - Durum: Dalda hazır; canlıda yok. Öncelik: P0; rol: Geliştirme / tasarım / QA; efor: S.
  - Önkoşullar: RELEASE-00.
  - Mevcut bağlar: `client/src/navigation-back-v1.css`, `client/src/canon.css`, `client/src/ui-components-v2.css`, `client/src/visual-polish-v9.css`, `client/src/app.js`, `client/index.html`, `e2e/navigation-back.spec.js`, `e2e/reward-navigation.spec.js`, `client/src/tutorial/onboarding.js`, `client/src/tutorial/tutorial-controller.js`.
  - Yeni teslim önerisi: `docs/planning/release-240-navigation-matrix.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Ödüllerdeki her alt sayfa dahil sistemdeki geri/ileri gezinme düğmelerinin ekran/selector/yön/hedef envanteri çıkarılır. Son navigation-back-v1.css sarı yüzey, kahverengi kenar, gölge ve 44×44 boyut tek referanstır; ileri yalnız ok yönüyle ayrılır.
  - Kabul 2: Normal/basılı/odaklı/devre dışı durumlarda eski mavi yüzey veya pseudo-element sızıntısı kalmaz. İptal/geri al/satın al gibi başka işlemler gezinme diye dönüştürülmez; hedef ve tarayıcı/native geri davranışı korunur.
  - Kabul 3: Günlük ödül/görev, sezon yolu, sıralama, haftalık/takım ödülü ve tüm diğer envanter satırları TR/EN 320×568 ve 393×852 üzerinde ekran görüntüsü ve gerçek gidiş/dönüşle doğrulanır; ileri kontrolleri ayrı kapsanır.
  - Geçmiş hazırlık kanıtı: `docs/planning/release-240-navigation-matrix.md`, `11 statik geri ve iki ileri kontrol sahibinin envanteri; tek sarı yüzey, eski mavi pseudo katmanlarının kaldırılması. Ödül/rehber TR/EN 320×568 ve 393×852 normal/basılı/odak/devre dışı kontrolü; Chromium, Android Chrome ve WebKit yerel gezinme akışları.`, `Takım yönetimi ve boş sohbet fixture’ı ile gerçek dönüş; mesaj gönderilmez. Fiziksel Android kabulü kullanıcı isteğiyle sonraya bırakıldı; her profil penceresinin dört dil/boyut birleşiminin ayrı görsel kabulü açık.`.

<a id="audio-01"></a>

- [x] **AUDIO-01 — Saldırı modüllerinin VFX ses kapsamını tamamla ve cızırtıyı gider**
  - Durum: Dalda hazır; canlıda yok. Öncelik: P0; rol: Geliştirme / tasarım / QA; efor: M.
  - Önkoşullar: RELEASE-00.
  - Mevcut bağlar: `client/src/gridshard-audio.js`, `client/src/gridshard-audio-formats.js`, `client/src/battle/module-vfx.js`, `client/src/battle/module-presentation-profiles.js`, `client/src/app.js`, `client/assets/audio`, `tools/generate-module-audio.py`, `tools/audio_lufs_scan.py`, `tools/encode_mobile_audio.py`, `client/tests/gridshard-audio.test.js`, `client/tests/gridshard-audio-voice-limit.test.js`, `client/tests/gridshard-audio-mobile-formats.test.js`, `tools/combat_sfx_synth.py`, `tools/report_combat_audio.py`, `tools/tests/test_combat_audio_generation.py`, `e2e/battle-audio.spec.js`, `client/tests/battle-audio-240.test.js`.
  - Yeni teslim önerisi: `docs/planning/release-240-module-audio-matrix.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Aktif 24 modüllük katalogdan bütün saldırı modülleri ve hasar veren özel olaylar listelenir: event, VFX, cue, WAV, mobil türev, tetikleme ve duyulma kanıtı. Eksik dosya, eksik event bağlantısı ve miks/voice-limit bastırması ayrı teşhis edilir.
  - Kabul 2: Atış/isabet/özel etki kimliği okunur; cızırtılı örnekler ham dosya ve miks içinde karşılaştırılır. Tepe/clip, DC, başlangıç-bitiş süreksizliği, decode ve ses yığılması ölçülür; nedenine göre yeniden düzenleme/üretim yapılır, yalnız toplam sesi yükseltmek çözüm sayılmaz.
  - Kabul 3: İzolasyonda her gerekli olayın sesi çalışır. Yoğun savaşta sınırlayıcının bilinçli bastırması kayıtlıdır; eksik bağlantı gibi gizlenmez. Müzik dengesi, mute/volume, pause/resume ve eski voice bütçesi korunur; gerçek Android hoparlör/kulaklık kaydıyla rahatsız edici cızırtı kalmadığı kabul edilir.
  - Geçmiş hazırlık kanıtı: `docs/planning/release-240-module-audio-matrix.md`, `docs/planning/release-240-audio-measurements.json`, `24 modül/10 saldırı envanteri; sekiz saldırı kaynağı sürekli faz/yumuşak uçlarla üretildi. Modül alt klasörü OGG/AAC üretimine ve içerik hash kontrolüne alındı; WAV olmayan pakette diğer codec fallback’i gerçek Chromium/Android öykünmesinde geçti.`, `24 cue izolasyonu ve 4 saniyelik yoğun miks: tepe 0.782059, kırpılan örnek 0; eski 3 rutin ses/420 ms bütçesi korundu. Fiziksel hoparlör/kulaklık dinlemesi kullanıcı isteğiyle ertelendi. Windows WebKit AudioContext sunmadığından yerel ses testi atlanır; macOS CI ses kapısı korunur.`.

<a id="audio-02"></a>

- [x] **AUDIO-02 — Çekirdeklerin aktivasyon ve etki seslerini tamamla ve miksle**
  - Durum: Dalda hazır; canlıda yok. Öncelik: P0; rol: Geliştirme / tasarım / QA; efor: S.
  - Önkoşullar: AUDIO-01.
  - Mevcut bağlar: `client/src/battle/core-vfx-v6.js`, `client/src/gridshard-audio.js`, `client/src/app.js`, `client/assets/audio`, `tools/generate-core-audio-v6.py`, `client/tests/core-vfx-v6.test.js`, `client/tests/gridshard-audio-resources.test.js`, `client/tests/gridshard-audio-browser-lifecycle.test.js`, `tools/combat_sfx_synth.py`, `tools/report_combat_audio.py`, `client/tests/battle-audio-240.test.js`, `e2e/battle-audio.spec.js`.
  - Yeni teslim önerisi: `docs/planning/release-240-core-audio-matrix.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Aktif bütün çekirdekler için aktivasyon ve varsa atış/isabet/iyileştirme/kalkan/yeniden doğuş olayı eşlenir; mevcut yedi core cue ailesi kontrol edilir. Olmayan bir mekanik için yapay atış üretilmez.
  - Kabul 2: Her çekirdek ayırt edilebilir kısa ses imzası alır; aktivasyon ile tekrarlanan etki seviyesi dengelenir. Re-render/tekrar snapshot çift ses üretmez; öncelikli sesler dahi miks taşmasına yol açmaz.
  - Kabul 3: Saldırı sesleriyle birlikte yoğun savaş, düşük ses, mute, arka plan dönüşü ve Android decode/fallback kabulü kanıtlanır; cızırtı dinleme kaydı AUDIO-01 ile aynı oturumda alınır.
  - Geçmiş hazırlık kanıtı: `docs/planning/release-240-core-audio-matrix.md`, `Yedi çekirdeğin 14 kaynak/türevi yenilendi; gerçek aktivasyon/atış sesleri görsel ankraj yokken de çalışır, yeniden snapshot çift ses üretmez. Takviye için yapay atış eklenmedi; shot kaynağı yalnız uyumluluktur.`, `Sürekli fazlı kısa imzalar, PCM/codec hash ölçümleri, gerçek tarayıcı decode/miks, mute/düşük ses/yaşam döngüsü ve olay tekilliği kontrol edildi. Fiziksel Android ses kabulü kullanıcı isteğiyle ertelendi; bu durum canlı yayın kabulü sayılmaz.`.

<a id="reward-06"></a>

- [ ] **REWARD-06 — Sabit ödül kasasında çekirdek parçası ve içerik sözleşmesini tamamla**
  - Durum: Çalışılıyor. Öncelik: P0; rol: Backend / istemci / QA; efor: M.
  - Önkoşullar: BASE-01.
  - Mevcut bağlar: `server/app/reward_delivery.py`, `server/app/meta_progression.py`, `server/app/player_profile.py`, `server/app/season_competition.py`, `server/tests/test_reward_delivery.py`.
  - Yeni teslim önerisi: `docs/planning/release-240-fixed-crate-contract.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Haftalık, takım ve lider panosu ilk 10 ödülleri sabit kaynak/dönem/sıra/revision/hash içeriğiyle postalanır; rastgele mağaza sandığı ek teslim edilmez.
  - Kabul 2: core_type_id/core_shards birlikte doğrulanıp tek işlemde teslim edilir; geçersiz/uygunsuz hedef ödülü sessizce düşürmez. Mevcut girişteki 25 çekirdek parçası korunur; yarışma kasasına ek tutar varsa ayrı baz bütçe toplamı yayın öncesi kaydedilir.
  - Kabul 3: Kredi/Akı, modül/evrensel parça, kişisel kozmetik ve takım görünümü sahiplikleri ayrıdır; takım hakkı üyelerle çoğaltılmaz. Tekrar/eşzamanlı talep, restore ve premium kökeni korunur.
  - Geçmiş hazırlık kanıtı: `docs/planning/release-240-fixed-crate-contract.md`, `server/tests/test_inbox_open_delivery.py`, `e2e/casual-chest-opening.spec.js`.

<a id="ui-08"></a>

- [ ] **UI-08 — Mesaj kutusu Topla işleminde ödül kasasının açılışını ve sonucunu göster**
  - Durum: Çalışılıyor. Öncelik: P0; rol: Backend / istemci / QA; efor: M.
  - Önkoşullar: REWARD-06, SEASON-00.
  - Mevcut bağlar: `client/src/app.js`, `client/index.html`, `client/src/reward-chest-art-v5.css`, `server/app/reward_delivery.py`, `e2e/casual-chest-opening.spec.js`, `e2e/reward-navigation.spec.js`.
  - Yeni teslim önerisi: `docs/planning/release-240-crate-opening-acceptance.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: Topla → aynı kasa kimliğini teslim al/aç → kısa animasyon/ses → sunucu makbuzuyla ödül kartları akışı kurulur; oyuncu mağazada kasayı aramak zorunda kalmaz.
  - Kabul 2: Kopma/yanıt kaybında envanter veya açılmış makbuz kurtarılır; çift tıklama/animasyonu tekrar oynatma ikinci ödül vermez. Topla Tümü seri kimliklerle açılır veya tek gerçek sonuç özetiyle atlanır.
  - Kabul 3: Atla, azaltılmış hareket, mute, TR/EN 320/393 px ve Android kabulü; Kredi/Akı/modül/çekirdek/kozmetik sonucunun gerçek makbuzla eşliği doğrulanır. UI-03 seçim kasası 2.5 işidir; bu işi bekletmez.
  - Geçmiş hazırlık kanıtı: `docs/planning/release-240-fixed-crate-contract.md`, `server/tests/test_inbox_open_delivery.py`, `e2e/casual-chest-opening.spec.js`.

<a id="season-01"></a>

- [ ] **SEASON-01 — Günlük ve sezonluk Devre Emirleri ile kontrollü XP ilerlemesini geliştir**
  - Durum: Çalışılıyor. Öncelik: P0; rol: Backend / istemci / QA; efor: L.
  - Önkoşullar: BASE-01, SEASON-00.
  - Mevcut bağlar: `server/app/player_profile.py`, `server/app/player_progression.py`, `server/app/match_accounting.py`, `client/src/app.js`, `client/index.html`, `server/tests/test_beta33_engagement.py`, `docs/planning/season-1-engagement-v1.json`, `server/app/season_missions.py`, `server/app/player_data_store.py`, `client/src/relay-client.js`.
  - Yeni teslim önerisi: mevcut temel korunur.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: 40. kademe 12.240 XP olarak kalır. Mevcut altı günlük emrin 135 XP/75 Akı ödülü korunur; 4 ve 6 uygun savaş için ayrı 15 XP eklenir. Yeni emirler para/parça veya premium XP çarpanı vermez.
  - Kabul 2: Sezonluk 12 emir toplam 1.800 XP tavanlıdır; savaş/zafer/aktif savaş günü/doğrulanmış çekirdek kullanımı sayaçları sezon kimliğiyle birikir. Günlük/Sezonluk sekmeleri, koşul ve bitiş zamanı görünür.
  - Kabul 3: Mevcut maç sonrası doğrulanmış reklam bonusu korunur; maç başına bir hak. Altı maç/bir reklam senaryosu 27. gün; sekiz maç/reklamsız 25. gün bitirme beklentisidir, garanti oyuncu süresi değildir; düşük katılım otomatik tamamlamaz.
  - Kabul 4: Oyuncu+sezon+maç/olay ve oyuncu+sezon+[UTC gün]+görev tekilliği; hesap değişimi, tekrar/eşzamanlı talep, gün/sezon sınırı, geç toplama ve restore test edilir. Kazanılmış görev XP kapanan sezonu doğru sırayla sonuçlandırır; yeni sezona XP taşmaz.
  - Geçmiş hazırlık kanıtı: `docs/planning/release-240-mission-acceptance.md`, `server/app/season_missions.py`, `server/tests/test_season_missions.py`, `client/tests/season-missions.test.js`, `e2e/beta33-season.spec.js`.

<a id="comm-01"></a>

- [x] **COMM-01 — Sürüm ön duyurusunu tek gösterim ve Sistem mesajıyla standartlaştır**
  - Durum: Dalda hazır; canlıda yok. Öncelik: P0; rol: Geliştirme / ürün / QA; efor: M.
  - Önkoşullar: RELEASE-00.
  - Mevcut bağlar: `server/app/release_announcements.py`, `server/data/release_announcements_v1.json`, `client/src/release-announcement.js`, `client/src/release-announcement.css`, `tools/release_announcements.py`.
  - Yeni teslim önerisi: `docs/planning/prerelease-announcements-and-music.md`.
  - Sürüm briefleri: [2.4.0](planning/releases/2.4.0.md).
  - Kabul 1: TR/EN tek kaynak, hedef tarih takvim denetimi, yayın penceresi, eski API ve sürüm sonrası görünmezlik doğrulanır.
  - Kabul 2: Tamam onayı hesapta kalıcı ve idempotenttir; ağ hatası outbox, yeniden giriş/başka hesap ve mesaj kutusu bağımsızlığı; 320/393 px, modal/savaş sırası ve veri koruma kanıtlanır.
  - Kabul 3: 2.3.0 sonrası her sürümün incelenmiş ön duyurusu release_guard tarafından aranır; gerçek sürüm notları ayrı tutulur.
  - Geçmiş hazırlık kanıtı: `docs/planning/prerelease-announcements-and-music.md`, `server/tests/test_release_announcements.py`, `tools/tests/test_prerelease_communication_gate.py`, `e2e/release-announcement.spec.js`, `artifacts/prerelease-20261104/browser-final.log`, `artifacts/prerelease-20261104/pg-ack.log`.

### R2 — Mağaza ve seçim kasası — sonraki minor

<a id="cos-03"></a>

- [ ] **COS-03 — Mağazaya özel dört ayrı kozmetik hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Sanat / ürün; efor: L.
  - Önkoşullar: COS-01, ECON-01.
  - Mevcut bağlar: `server/data/cosmetic_releases_v1.json`, `client/src/liveops-cosmetic-catalog.js`.
  - Yeni teslim önerisi: `docs/planning/shop-art-manifest.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: İki mağaza çerçevesi ve iki zemin dönem ödül stoğundan farklı ID/tasarımla hazırlanır.
  - Kabul 2: Sahip olunan veya dönem ödülü olmuş öğe yeni mağaza ürünü gibi satılmaz; görünürlük ve kuşanma önizlemesi doğrulanır.

<a id="card-01"></a>

- [ ] **CARD-01 — Yankı Rölesi sezon modülünü uçtan uca geliştir**
  - Durum: Yapılacak. Öncelik: P0; rol: Oyun motoru / sanat / denge; efor: XL.
  - Önkoşullar: ECON-01.
  - Mevcut bağlar: `server/app/season_module_releases.py`, `server/data/season_module_releases_v2.json`, `server/app/module_roster.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `docs/planning/echo-relay-release.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Planlı echo_relay için mekanik, karşı oyun, çalışma görseli, aktif katalog ve arena kapısı tamamlanır.
  - Kabul 2: Ücretsiz kazanım yolu ve otomatik yerleşim/hedefleme sözleşmeleri test edilir; planlı kart hazır diye ödül havuzuna girmez.

<a id="reward-02"></a>

- [ ] **REWARD-02 — Kalıcı seçim hakkı ve tek teslim işlemini geliştir**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: REWARD-01, ECON-01, DATA-01.
  - Mevcut bağlar: `server/app/postgres_economic_operations.py`, `server/app/reward_delivery.py`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `server/app/reward_choices.py`, `server/tests/test_reward_choices.py`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Uygun üç seçenek hak doğarken sabitlenir; ödül miktarı istemciden kabul edilmez.
  - Kabul 2: Eşzamanlı/farklı request_id/tekrar bağlantı aynı hakkı ikinci kez vermez; başka hesap ve seçenek değiştirme reddedilir.

<a id="reward-03"></a>

- [ ] **REWARD-03 — Kapanışta kazanılmış ama alınmamış hakları koru**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend / ürün; efor: L.
  - Önkoşullar: REWARD-01, DATA-01.
  - Mevcut bağlar: `server/app/player_profile.py`, `server/app/reward_delivery.py`, `server/app/premium_reward_recovery.py`.
  - Yeni teslim önerisi: `server/app/period_reward_closeout.py`, `server/tests/test_period_reward_closeout.py`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Sezon kapanışı, geç dönen oyuncu ve dolu Mesaj Kutusu için kazanılmış hak kaybolmadan tekil aktarım tasarlanır.
  - Kabul 2: Premium iade, önceden alınmış ödül ve birden çok kapanış denemesi aynı teslimi tekrar üretmez.

<a id="shop-01"></a>

- [ ] **SHOP-01 — Sürümlü ve incelenebilir teklif kataloğu kur**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: REWARD-01, ECON-01, COS-04.
  - Mevcut bağlar: `server/app/store_catalog.py`, `server/app/meta_progression.py`, `server/app/cosmetic_releases.py`.
  - Yeni teslim önerisi: `server/app/shop_offers.py`, `server/data/shop_offers_v1.json`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: UTC başlangıç/bitiş, arena, fiyat türü, garanti içerik, limit, görsel ve TR/EN doğrulanır.
  - Kabul 2: Yayınlanan teklif değişmez; süre bitmiş/eski revision ve eksik ürün önizlemesi doğru hata verir.

<a id="shop-02"></a>

- [ ] **SHOP-02 — Limit ve cüzdan işlemlerini atomik bağla**
  - Durum: Yapılacak. Öncelik: P0; rol: Backend; efor: L.
  - Önkoşullar: SHOP-01, DATA-01.
  - Mevcut bağlar: `server/app/postgres_economic_operations.py`, `server/app/main.py`, `server/app/store_refund_policy.py`, `client/src/auth-session.js`.
  - Yeni teslim önerisi: `server/app/shop_transactions.py`, `server/tests/test_shop_offers.py`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Önizlemedeki teklif ID/sürümüyle alım yapılır; istemci ödül veya fiyat belirlemez.
  - Kabul 2: İki eşzamanlı alım limit aşamaz; yanıt kaybı tekrar ücret düşürmez; bakiyeler/eski makbuzlar korunur.
  - Kabul 3: Yeni API yolları Bearer kimliği/hesap sahipliği ve native API prefix yönlendirmesiyle doğrulanır.

<a id="shop-03"></a>

- [ ] **SHOP-03 — İlk garantili teklif ve kozmetik pilotunu hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / backend / istemci; efor: M.
  - Önkoşullar: SHOP-02, COS-03.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/cosmetic_releases.py`, `client/src/app.js`.
  - Yeni teslim önerisi: `docs/planning/first-shop-release.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Bir hedefli güncel modül-parçası teklifi ve iki ayrı kozmetik seti ekonomik bütçeyle tanımlanır.
  - Kabul 2: Arena uygunluğu, sahip olunan ürün reddi, açık fiyat/miktar ve satın alma limitleri gerçek API ile doğrulanır.

<a id="ui-02"></a>

- [ ] **UI-02 — Mağaza gezinmesini ve ürün detayını uygula**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci; efor: L.
  - Önkoşullar: UI-01, SHOP-01.
  - Mevcut bağlar: `client/index.html`, `client/src/app.js`, `client/src/shop-rewards-v6.css`, `e2e/painted-shop-chests.spec.js`.
  - Yeni teslim önerisi: `client/src/shop/offer-view.js`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Dört mağaza bölümü, mevcut Bronz hediye ve garanti/olasılık ayrımı görünür; yeni hediye kaynağı eklenmez.
  - Kabul 2: Yetersiz bakiye, limit dolu, sahip olunan, süresi bitmiş, fiyat yüklenmedi ve çevrimdışı durumları doğru çalışır.

<a id="ui-03"></a>

- [ ] **UI-03 — Seçim kasası ve sandık sonucunu geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / sanat; efor: L.
  - Önkoşullar: UI-01, REWARD-02.
  - Mevcut bağlar: `client/src/app.js`, `client/src/reward-chest-art-v5.css`, `e2e/casual-chest-opening.spec.js`.
  - Yeni teslim önerisi: `client/src/rewards/choice-view.js`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Üç seçenekli önizleme/seç/onay/teslim akışı; çıkışta ve bağlantı kopmasında hak korunur.
  - Kabul 2: Sandık sonucu makbuzla aynı; kaynak/garanti/olasılık etiketi, atla ve toplu açma özeti test edilir.

<a id="policy-01"></a>

- [ ] **POLICY-01 — Yeni ürünler için fiyat/olasılık ve yaş kapısını denetle**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / ödeme / QA; efor: M.
  - Önkoşullar: SHOP-01, REWARD-02.
  - Mevcut bağlar: `server/tests/test_chest_odds_disclosure.py`, `server/tests/test_analytics_age_gate.py`, `docs/CHILD_AUDIENCE_AUDIT.md`, `docs/STORE_PURCHASES.md`.
  - Yeni teslim önerisi: `docs/planning/new-products-store-review.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Satın alma öncesinde garanti, olasılık, uygun havuz ve yerel Billing fiyatı doğru görünür; sahte indirim etiketi yoktur.
  - Kabul 2: O gün geçerli Play/varsa iOS ve hedef bölge politikası kontrol edilir; reklam/IAP/analitik rolloutları kendiliğinden açılmaz.

<a id="release-02"></a>

- [ ] **RELEASE-02 — 2.5.0 mağaza ve seçim kasası pilotunu yayıma hazırla**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / QA / operasyon; efor: L.
  - Önkoşullar: RELEASE-01, SHOP-03, UI-02, UI-03, REWARD-03, POLICY-01, CARD-01, BALANCE-01, COS-03, DATA-01, OPS-02, QA-01, COS-05, ANALYT-01, UI-04, AUDIO-03.
  - Mevcut bağlar: `e2e/reward-navigation.spec.js`, `server/tests/test_reward_delivery.py`, `.github/workflows/quality.yml`.
  - Yeni teslim önerisi: `docs/planning/release-r2-evidence.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Gerçek API ile limit/ödeme/tekrar/çevrimdışı/yanlış seçenek/sahiplik ve eski stok senaryoları geçer.
  - Kabul 2: Kazanılmış haklar korunarak pilot kapatılabilir; fiyat/miktar kararı ve sonraki minor numarası kayıtlanır.
  - Kabul 3: S2 için COS-02 ilk altı öğelik kilometre taşı ve Yankı Rölesi hazırdır; üst 18 öğelik görevin tamamı veya Kor Fırlatıcı beklenmez.

<a id="cos-05"></a>

- [ ] **COS-05 — 2.5.0 için altı özgün oyuncu kozmetiğini teslim et**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: M.
  - Önkoşullar: COS-01.
  - Mevcut bağlar: `docs/planning/two-cycle-art-manifest.md`, `server/data/cosmetic_releases_v1.json`, `client/src/liveops-cosmetic-catalog.js`, `client/src/liveops-cosmetics-v1.css`, `e2e/liveops-cosmetics.spec.js`.
  - Yeni teslim önerisi: `docs/planning/art-2.5.0-acceptance.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: Manyetik Köprü, Bakır Örgü, Kırık Halka: üç çerçeve ve üç zemin; her biri ayrı tasarım kimliği, özgün geometri, TR/EN, kilit/sahiplik/kuşanma ve 320/393 px kabulü alır.
  - Kabul 2: Sezon yolu/sıralama/son hafta için üç çift tekil tahsis edilir; diğer haftaların kaynak profili ayrıca hesaplanır. Bu altı öğe mağaza veya takım stoğu sayılmaz; COS-02 üst işi yalnız bütün üç grup bitince kapanır.

<a id="audio-03"></a>

- [ ] **AUDIO-03 — 2.5.0 için keşif menüsü ve rekabet savaş müziği üret**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / ses tasarımı / QA; efor: M.
  - Önkoşullar: AUDIO-01, AUDIO-02.
  - Mevcut bağlar: `client/src/gridshard-audio.js`, `client/src/audio-mix.js`, `client/src/gridshard-audio-formats.js`, `tools/encode_mobile_audio.py`, `docs/AUDIO_DIRECTION.md`.
  - Yeni teslim önerisi: `docs/planning/prerelease-announcements-and-music.md`.
  - Sürüm briefleri: [2.5.0](planning/releases/2.5.0.md).
  - Kabul 1: En az bir yeni menü ve bir özgün savaş bestesi; Devrenin Ufku merak/umut, Akımın Nabzı kontrollü rekabet ve taktik odak duygusunu karşılaştırmalı dinlemeyle taşır.
  - Kabul 2: Loop/stem/crossfade, düşük-orta-kritik yoğunluk, tekrar engeli ve tercih/mute/arka plan/codec hattı; paket/bellek/kare bütçesi ile yoğun savaşta SFX okunabilirliği kanıtlanır.
  - Kabul 3: Kaynak/lisans/hash ve loudness/true peak/clip/DC/decode raporu; fiziksel Android hoparlör/kulaklık ve macOS WebKit kabulü bulunur. Global master/gain kendiliğinden değişmez.
  - Geçmiş hazırlık kanıtı: `docs/planning/prerelease-announcements-and-music.md`.

### R3 — Günlük deney ve öğrenme döngüsü

<a id="card-02"></a>

- [ ] **CARD-02 — Kor Fırlatıcı ile ikinci dönem kart stoğunu hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun motoru / sanat / denge; efor: XL.
  - Önkoşullar: CARD-01.
  - Mevcut bağlar: `server/data/season_module_releases_v2.json`, `server/app/season_module_releases.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `docs/planning/ember-launcher-release.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Planlı ember_launcher için yanma, arındırma/karşı oyun ve okunabilir süre/hasar göstergesi hazırlanır.
  - Kabul 2: S2 Yankı Rölesi, S3 Kor Fırlatıcı ile en az birer yeni hazır modül alır; yalnız S1 mevcut 24 modülle başlar. Planlı kart hazır sayılmaz.

<a id="reward-04"></a>

- [ ] **REWARD-04 — Katkı ve ustalık ödül bütçelerini tanımla**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / backend; efor: M.
  - Önkoşullar: ECON-01.
  - Mevcut bağlar: `server/app/season_competition.py`, `server/app/team_tournament.py`, `server/app/player_progression.py`.
  - Yeni teslim önerisi: `docs/planning/participation-reward-budget.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Sıralama prestiji ile sınırlı katkı kaynak ödülü ayrılır; yalnız ilk üç dışında erişilebilir hedef tanımlanır.
  - Kabul 2: AI, eğitim, teslim olma ve tekrar maç istismarı için uygunluk/tavan açıkça yazılır.

<a id="ui-05"></a>

- [ ] **UI-05 — Savaş bilgisinin okunabilirliğini iyileştir**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / oyun tasarımı; efor: M.
  - Önkoşullar: UI-01.
  - Mevcut bağlar: `client/src/battle`, `e2e/battle-render-budget.spec.js`, `e2e/battle-density.spec.js`.
  - Yeni teslim önerisi: `docs/planning/battle-readability-review.md`.
  - Sürüm briefleri: [2.8.0](planning/releases/2.8.0.md).
  - Kabul 1: Hasar, iyileştirme, koruma ve çekirdek yeteneği birbirinden ayırt edilir; hedef/yerleşim kuralı değişmez.
  - Kabul 2: Yeni süs efekti kapalıyken bilgi kaybolmaz; mevcut platform kare bütçesi eşikleri korunur.

<a id="ui-06"></a>

- [ ] **UI-06 — Maç sonrası öğrenme ve deste kaydetme akışını tasarla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / istemci / backend; efor: L.
  - Önkoşullar: BASE-03, UI-05.
  - Mevcut bağlar: `server/app/game/engine.py`, `client/src/app.js`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `docs/planning/post-battle-learning.md`.
  - Kabul 1: Kesinleşmiş maçtan doğrulanabilir kısa neden özeti ve tek sonraki eylem sunulur.
  - Kabul 2: Gizli rakip bilgisi ifşa edilmez; deste kaydetme/tekrar giriş gerçek hesap ve eski maç sürümleriyle ele alınır.

<a id="analyt-02"></a>

- [ ] **ANALYT-02 — Baz rapor ve deney karar dosyasını hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / analiz; efor: M.
  - Önkoşullar: ANALYT-01, RELEASE-01.
  - Mevcut bağlar: `tools/product_analytics_report.py`, `server/app/product_analytics.py`.
  - Yeni teslim önerisi: `docs/planning/liveops-experiment-decisions.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md), [2.9.0](planning/releases/2.9.0.md).
  - Kabul 1: İlk iki haftalık baz çizgi, kohort uygunluğu, onaylı örneklem yanlılığı ve ana/koruyucu metrikler yazılır.
  - Kabul 2: Beş kişilik rapor eşiği yeterli deney örneklemi sayılmaz; sonuçta devam/düzelt/durdur kararı kayıt altına alınır.

<a id="live-02"></a>

- [ ] **LIVE-02 — Günlük Devre Deneyi sunucu prototipini geliştir**
  - Durum: Yapılacak. Öncelik: P0; rol: Oyun motoru / backend; efor: L.
  - Önkoşullar: LIVE-01, REWARD-04, DATA-01.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/game/pvp_runner.py`, `server/app/reward_delivery.py`.
  - Yeni teslim önerisi: `server/app/challenge_rules.py`, `server/tests/test_daily_challenge.py`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Gün/tohum/altılı deste/kural/başarı sunucuya aittir; tekrar oynanabilir tek kısa görev hazırlanır.
  - Kabul 2: İlk başarı ödülü kalıcı tekildir; tarih değişimi, iptal, AI sonuç doğrulaması ve tekrar istismarı test edilir.

<a id="live-03"></a>

- [ ] **LIVE-03 — Etkinlik girişini ve Bugünün Deneyi akışını bağla**
  - Durum: Yapılacak. Öncelik: P1; rol: İstemci / içerik; efor: M.
  - Önkoşullar: LIVE-02, UI-04.
  - Mevcut bağlar: `client/index.html`, `client/src/app.js`, `client/assets/ui/events-v2`.
  - Yeni teslim önerisi: `client/src/liveops/event-view.js`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Başlamadan hedef, kural, süre ve ödül; tamamlandıktan sonra sonuç ve tekrar seçeneği görünür.
  - Kabul 2: Günlük meta ile deney ayrılır; aynı anda tek özel vitrin ve alternatif ana savaş erişimi korunur.

<a id="live-07"></a>

- [ ] **LIVE-07 — Modül/çekirdek ustalığı ve kalıcı hedefleri geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / backend; efor: L.
  - Önkoşullar: REWARD-04, UI-05.
  - Mevcut bağlar: `server/app/player_profile.py`, `server/app/player_progression.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `server/app/mastery_progress.py`, `server/tests/test_mastery_progress.py`.
  - Sürüm briefleri: [2.8.0](planning/releases/2.8.0.md).
  - Kabul 1: Sadece kullanım sayısı yerine doğrulanabilir başarı, öğrenme hedefi ve kalıcı vitrin tasarlanır.
  - Kabul 2: Eğitim/AI/tekrar maç uygunluğu ve sezon ödülünden ayrı kalıcı kimlikler test edilir.

<a id="live-12"></a>

- [ ] **LIVE-12 — Haftanın Kuralı için sınırlı etkinlik şablonu hazırla**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun tasarımı / backend; efor: M.
  - Önkoşullar: LIVE-02.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`.
  - Yeni teslim önerisi: `docs/planning/weekly-rule-template.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Tek anlaşılır kural farkı ve farklı deste problemi için en az dört içerik briefi hazırlanır.
  - Kabul 2: Normal arena etkilenmez; farklı tohum tek başına yeni içerik sayılmaz, ödül kaynağı için ek stok hesaplanır.

<a id="play-01"></a>

- [ ] **PLAY-01 — Ödülsüz deste deneme alanını geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun motoru / istemci; efor: L.
  - Önkoşullar: BASE-03.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/player_profile.py`, `client/src/app.js`.
  - Yeni teslim önerisi: `docs/planning/deck-lab-flow.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Dengeli AI ile hızlı tekrar, deste kaydetme ve sınırlı etkinlik kartı denemesi tasarlanır.
  - Kabul 2: Sahip olunmayan kart gerçek koleksiyona eklenmez; normal savaş/mağaza ödülü üretmez.

<a id="release-03"></a>

- [ ] **RELEASE-03 — 2.6.0 günlük deney pilotunu değerlendirmeye aç**
  - Durum: Yapılacak. Öncelik: P0; rol: Ürün / QA / operasyon; efor: L.
  - Önkoşullar: RELEASE-02, LIVE-03, ANALYT-02, REWARD-04, CARD-02, COS-06, LIVE-01, BASE-03, PLAY-01, LIVE-12.
  - Mevcut bağlar: `.github/workflows/quality.yml`, `e2e/battle-render-budget.spec.js`.
  - Yeni teslim önerisi: `docs/planning/release-r3-evidence.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Devre Deneyi, ilk başarı/tekrar, gün değişimi ve gerçek ödül makbuzu uçtan uca doğrulanır.
  - Kabul 2: Tek etkinlik vitrini, yeterli yeni ödül stoğu, koruyucu kalite ölçüleri ve devam/düzelt/durdur kararı tanımlanır.
  - Kabul 3: S3 için COS-02 ikinci altı öğelik kilometre taşı ve Kor Fırlatıcı hazırdır; lisans ikincil, Devre Deneyi ana kapsamdır.

<a id="ret-01"></a>

- [ ] **RET-01 — Geri dönüş ve bildirim tercihlerini uygula**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / istemci; efor: M.
  - Önkoşullar: BASE-03, RELEASE-01.
  - Mevcut bağlar: `server/app/release_updates.py`, `client/src/app.js`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `docs/planning/returning-player-summary.md`.
  - Kabul 1: Dönen oyuncu kısa sürüm özeti, korunmuş ilerleme ve tek uygun hedef görür.
  - Kabul 2: Bildirim açık tercih/sessiz saat kuralına bağlıdır; bu iş e-posta/push/mesaj gönderimini kendiliğinden açmaz.

<a id="reward-05"></a>

- [ ] **REWARD-05 — Deneme ve yeniden kurulum haklarını tasarla ve pilotla**
  - Durum: Yapılacak. Öncelik: P1; rol: Ürün / backend / istemci; efor: L.
  - Önkoşullar: REWARD-02, ECON-01.
  - Mevcut bağlar: `server/app/meta_progression.py`, `server/app/player_profile.py`, `server/app/postgres_economic_operations.py`.
  - Yeni teslim önerisi: `docs/planning/utility-reward-entitlements.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md), [2.8.0](planning/releases/2.8.0.md).
  - Kabul 1: Laboratuvar lisansı yalnız eşit seviyeli AI denemesinde işler; sahiplik veya dereceli güç vermez. Süre/oturum hakkı sunucuda tekil tüketilir; 2.6 pilotuna yetişmesi ana sürümün önkoşulu değildir.
  - Kabul 2: Yeniden kurulum kuponu mevcut yetenek sıfırlama bedelini tek kez kaldırır; mevcut ücretsiz hak varsa tüketilmez. Para/upgrade iadesi veya premium kökeni iki kez üretilmez. 2.8 için ikincil kapsamdır.

<a id="cos-06"></a>

- [ ] **COS-06 — 2.6.0 için altı özgün oyuncu kozmetiğini teslim et**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: M.
  - Önkoşullar: COS-01.
  - Mevcut bağlar: `docs/planning/two-cycle-art-manifest.md`, `server/data/cosmetic_releases_v1.json`, `client/src/liveops-cosmetic-catalog.js`, `client/src/liveops-cosmetics-v1.css`, `e2e/liveops-cosmetics.spec.js`.
  - Yeni teslim önerisi: `docs/planning/art-2.6.0-acceptance.md`.
  - Sürüm briefleri: [2.6.0](planning/releases/2.6.0.md).
  - Kabul 1: Reaktör Kepengi, Prizma Yuvası, Türbin Dişlisi: üç çerçeve ve üç zemin; her biri ayrı tasarım kimliği, özgün geometri, TR/EN, kilit/sahiplik/kuşanma ve 320/393 px kabulü alır.
  - Kabul 2: Sezon yolu/sıralama/son hafta için üç çift tekil tahsis edilir; diğer haftaların kaynak profili ayrıca hesaplanır. Bu altı öğe mağaza veya takım stoğu sayılmaz; COS-02 üst işi yalnız bütün üç grup bitince kapanır.

<a id="audio-04"></a>

- [ ] **AUDIO-04 — 2.7.0 için gizemli menü ve iki sefer savaş müziği üret**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / ses tasarımı / QA; efor: M.
  - Önkoşullar: AUDIO-03.
  - Mevcut bağlar: `client/src/gridshard-audio.js`, `client/src/audio-mix.js`, `client/src/gridshard-audio-formats.js`, `tools/encode_mobile_audio.py`, `docs/AUDIO_DIRECTION.md`.
  - Yeni teslim önerisi: `docs/planning/prerelease-announcements-and-music.md`.
  - Sürüm briefleri: [2.7.0](planning/releases/2.7.0.md).
  - Kabul 1: En az bir menü ve iki özgün savaş bestesi: Derin Devre dinginlik/gizem; Bilinmeyen Hat keşif gerilimi; Son Bağlantı baskı/cesaret/çözülme. Yeniden renklendirilmiş aynı melodi yeni eser sayılmaz.
  - Kabul 2: Sefer/arena bağlamı, yoğunluk geçişi ve ardışık tekrar koruması mevcut çalıcıda; önceki repertuvar ve kullanıcı tercihleri korunur.
  - Kabul 3: AUDIO-03 ile aynı loop/lisans/mastering/codec/performans ve fiziksel cihaz kabulü; önceki sürümden duygusal ayrım A/B oyun içi dinlemeyle kanıtlanır.
  - Geçmiş hazırlık kanıtı: `docs/planning/prerelease-announcements-and-music.md`.

### R4 — Ölçüme bağlı büyüme

<a id="card-03"></a>

- [ ] **CARD-03 — Yeni içerik kategorileri ve ileri kart stoğunu tasarla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun tasarımı / sanat; efor: M.
  - Önkoşullar: CARD-02.
  - Mevcut bağlar: `server/data/season_module_releases_v2.json`, `server/app/game/core_balance.py`.
  - Yeni teslim önerisi: `docs/planning/content-expansion-catalog.md`.
  - Kabul 1: Darbe Muhafızı/Toparlanma Feneri için ayrı mekanik brief; çekirdek görünümü, unvan ve takım vitrini için fizibilite çıkarılır.
  - Kabul 2: Yeni kozmetik tipleri sahiplik/renderer/perf maliyetiyle sıralanır; yeni savaş gücü ve para birimi otomatik açılmaz.

<a id="shop-04"></a>

- [ ] **SHOP-04 — Yeni gerçek para paketlerini ayrı kapıdan geçir**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Ödeme / ürün; efor: L.
  - Önkoşullar: SHOP-02, RELEASE-02.
  - Mevcut bağlar: `server/app/store_catalog.py`, `server/app/store_verification.py`, `server/app/premium_reward_recovery.py`, `docs/STORE_PURCHASES.md`, `client/tests/native-store-prices.test.js`.
  - Yeni teslim önerisi: `docs/planning/new-iap-product-release.md`.
  - Kabul 1: Gerekli olursa product_id, yerel Billing fiyatı, hesap bağı ve iade kökeni uçtan uca tasarlanır.
  - Kabul 2: Makbuz doğrulanmadan hak verilmez; mevcut ürünler/abonelikler değişmez, web ödeme mağazası kendiliğinden açılmaz.

<a id="live-04"></a>

- [ ] **LIVE-04 — Üç duraklı PvE Seferi geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Oyun motoru / backend / istemci; efor: XL.
  - Önkoşullar: RELEASE-03.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/reward_delivery.py`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `server/app/pve_expedition.py`, `server/tests/test_pve_expedition.py`.
  - Sürüm briefleri: [2.7.0](planning/releases/2.7.0.md).
  - Kabul 1: Üç farklı rakip dizisi ve durak arası kayıt; koşu/kural/ödül sürümü sabitlenir.
  - Kabul 2: İlk tamamlama ve tekrar ödülü ayrılır; cihaz değişimi/çökme/aynı durak tekrarı kaynak çoğaltmaz.

<a id="live-05"></a>

- [ ] **LIVE-05 — Asenkron takım ortak hedefi geliştir**
  - Durum: Yapılacak. Öncelik: P1; rol: Backend / oyun tasarımı; efor: XL.
  - Önkoşullar: RELEASE-03, REWARD-04.
  - Mevcut bağlar: `server/app/team_service.py`, `server/app/team_tournament.py`, `server/app/reward_delivery.py`.
  - Yeni teslim önerisi: `server/app/team_shared_goal.py`, `server/tests/test_team_shared_goal.py`.
  - Sürüm briefleri: [2.8.0](planning/releases/2.8.0.md).
  - Kabul 1: Üyeler farklı zamanlarda doğrulanmış PvE katkısı yapar; küçük takımlar için erişilebilir hedef belirlenir.
  - Kabul 2: Katkı tavanı, üyelik anı, takım değiştirme ve ödülü kimin alacağı sabit hak olarak test edilir.

<a id="live-06"></a>

- [ ] **LIVE-06 — Eşit seviyeli Draft Arenası pilotu hazırla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun motoru / ürün; efor: XL.
  - Önkoşullar: RELEASE-03, ANALYT-02.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`, `server/app/matchmaking.py`.
  - Yeni teslim önerisi: `docs/planning/draft-arena-pilot.md`.
  - Sürüm briefleri: [2.9.0](planning/releases/2.9.0.md).
  - Kabul 1: Güncel katalogdan seçme sırası, havuz ve seviye eşitleme kuralları prototiplenir.
  - Kabul 2: Aktif rakip/kuvvet farkı/bekleme ölçülmeden yeni kalıcı kuyruk açılmaz; ödül budget kapısından geçer.

<a id="live-08"></a>

- [ ] **LIVE-08 — Asenkron arkadaş meydan okumasını tasarla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Backend / ürün; efor: L.
  - Önkoşullar: LIVE-04.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/player_profile.py`.
  - Yeni teslim önerisi: `docs/planning/async-challenge-design.md`.
  - Kabul 1: Paylaşılabilir tohum/kurulum sürümü ve sunucuda doğrulanan hedef belirlenir.
  - Kabul 2: Canlı rakip gerekmez; paylaşım kişisel veri/erişim belirteci taşımaz; süresi ve ödül tavanı tanımlanır.

<a id="live-09"></a>

- [ ] **LIVE-09 — BO3 ve deste yasağı fizibilitesini hazırla**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun tasarımı / backend; efor: L.
  - Önkoşullar: LIVE-06, ANALYT-02.
  - Mevcut bağlar: `server/app/game/pvp_runner.py`, `server/app/team_tournament.py`.
  - Yeni teslim önerisi: `docs/planning/bo3-ban-design.md`.
  - Kabul 1: Seri durumu, yasak/seçim, kopma/yeniden bağlanma ve süre aşımı sözleşmesi çıkarılır.
  - Kabul 2: Yeterli eşleşme hacmi ve turnuva ihtiyacı ölçülmeden üretim kuyruğu açılmaz.

<a id="live-10"></a>

- [ ] **LIVE-10 — 2v2 için protokol ve performans araştırması yap**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Ağ / oyun motoru; efor: XL.
  - Önkoşullar: LIVE-05, ANALYT-02.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/game/pvp_runner.py`.
  - Yeni teslim önerisi: `docs/planning/2v2-protocol-spike.md`.
  - Kabul 1: Dört katılımcı sahipliği, komut sırası, eşleşme, kopma ve hile modeli tasarlanır.
  - Kabul 2: Düşük cihaz yükü ve ağ prototipi olumlu olmadan tam 2v2 uygulama taahhüdü verilmez.

<a id="live-11"></a>

- [ ] **LIVE-11 — Boss ve özel arena davranışı prototiple**
  - Durum: Ölçüme bağlı ileri aşama. Öncelik: P2; rol: Oyun motoru / sanat; efor: XL.
  - Önkoşullar: LIVE-04.
  - Mevcut bağlar: `server/app/game/engine.py`, `server/app/game/core_balance.py`.
  - Yeni teslim önerisi: `docs/planning/boss-arena-prototype.md`.
  - Kabul 1: Bir boss için aşama/telegraph/karşı oyun ve sürümlü kural paketi tasarlanır.
  - Kabul 2: Ödül bütçesi ve düşük cihaz okunabilirliğiyle dene; normal arenanın ortak kuralları değişmez.

<a id="cos-07"></a>

- [ ] **COS-07 — 2.7.0 için altı özgün oyuncu kozmetiğini teslim et**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: M.
  - Önkoşullar: COS-01.
  - Mevcut bağlar: `docs/planning/two-cycle-art-manifest.md`, `server/data/cosmetic_releases_v1.json`, `client/src/liveops-cosmetic-catalog.js`, `client/src/liveops-cosmetics-v1.css`, `e2e/liveops-cosmetics.spec.js`.
  - Yeni teslim önerisi: `docs/planning/art-2.7.0-acceptance.md`.
  - Sürüm briefleri: [2.7.0](planning/releases/2.7.0.md).
  - Kabul 1: Seramik Siper, Kablo Kemeri, Kristal Kıskaç: üç çerçeve ve üç zemin; her biri ayrı tasarım kimliği, özgün geometri, TR/EN, kilit/sahiplik/kuşanma ve 320/393 px kabulü alır.
  - Kabul 2: Sezon yolu/sıralama/son hafta için üç çift tekil tahsis edilir; diğer haftaların kaynak profili ayrıca hesaplanır. Bu altı öğe mağaza veya takım stoğu sayılmaz; COS-02 üst işi yalnız bütün üç grup bitince kapanır.
  - Kabul 3: S4 aktif takım takvimi ilk üç mevcut seti tüketiyorsa her yeni takım dönemine ayrı üç özgün takım öğesi üretilir; tarihli coverage ve sanat kabulü olmadan RELEASE-04 kapanmaz.

<a id="cos-08"></a>

- [ ] **COS-08 — S5 için altı oyuncu öğesi ve gerekli takım stoğunu üret**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: L.
  - Önkoşullar: COS-07.
  - Mevcut bağlar: `server/data/cosmetic_releases_v1.json`, `server/app/liveops_content.py`, `tools/prepare_liveops_rewards.py`, `client/src/liveops-cosmetic-catalog.js`.
  - Yeni teslim önerisi: `docs/planning/season-5-art-manifest.md`.
  - Sürüm briefleri: [2.8.0](planning/releases/2.8.0.md).
  - Kabul 1: S5 için altı yeni oyuncu öğesi (üç çerçeve/zemin çifti) ve tüketilmiş takım setlerinin yerine yeni takım dönemi başına üç özgün takım öğesi hazırlanır.
  - Kabul 2: S5 manifesti TR/EN, renderer, sahiplik, küçük ekran ve gerçek tarihli coverage kanıtı alır; aynı tasarım mağaza veya S6 stok sayılmaz.

<a id="card-04"></a>

- [ ] **CARD-04 — Darbe Muhafızı için çalışma kodu ve sezon teslimini tamamla**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: L.
  - Önkoşullar: CARD-02.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`, `server/data/season_module_releases_v2.json`, `server/app/season_module_releases.py`, `client/src/battle/module-vfx.js`, `client/src/gridshard-audio.js`.
  - Yeni teslim önerisi: `docs/planning/card-04-release.md`.
  - Sürüm briefleri: [2.7.0](planning/releases/2.7.0.md).
  - Kabul 1: Darbe Muhafızı: tetik, hedef, tavan, süre, karşı oyun ve sayısal denge raporu hazırlanır; mekanik runtime testleri, 16 yön/görsel/VFX/ses, aktif katalog, arena ve ücretsiz edinim tamamlanır.
  - Kabul 2: S6 konsepti 1 Mart kontrolünde seçilir; S4/S5 manifestteki mevcut mekanik briefini kullanır. CARD-03 araştırma notu veya planned JSON kaydı gerçek teslim değildir; sezon açılışı hazır modülü doğrular.

<a id="card-05"></a>

- [ ] **CARD-05 — Toparlanma Feneri için çalışma kodu ve sezon teslimini tamamla**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: L.
  - Önkoşullar: CARD-04.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`, `server/data/season_module_releases_v2.json`, `server/app/season_module_releases.py`, `client/src/battle/module-vfx.js`, `client/src/gridshard-audio.js`.
  - Yeni teslim önerisi: `docs/planning/card-05-release.md`.
  - Sürüm briefleri: [2.8.0](planning/releases/2.8.0.md).
  - Kabul 1: Toparlanma Feneri: tetik, hedef, tavan, süre, karşı oyun ve sayısal denge raporu hazırlanır; mekanik runtime testleri, 16 yön/görsel/VFX/ses, aktif katalog, arena ve ücretsiz edinim tamamlanır.
  - Kabul 2: S6 konsepti 1 Mart kontrolünde seçilir; S4/S5 manifestteki mevcut mekanik briefini kullanır. CARD-03 araştırma notu veya planned JSON kaydı gerçek teslim değildir; sezon açılışı hazır modülü doğrular.

<a id="card-06"></a>

- [ ] **CARD-06 — S6 yeni modülü için çalışma kodu ve sezon teslimini tamamla**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: L.
  - Önkoşullar: CARD-05.
  - Mevcut bağlar: `server/app/module_roster.py`, `server/app/game/engine.py`, `server/data/season_module_releases_v2.json`, `server/app/season_module_releases.py`, `client/src/battle/module-vfx.js`, `client/src/gridshard-audio.js`.
  - Yeni teslim önerisi: `docs/planning/card-06-release.md`.
  - Sürüm briefleri: [2.9.0](planning/releases/2.9.0.md).
  - Kabul 1: S6 yeni modülü: tetik, hedef, tavan, süre, karşı oyun ve sayısal denge raporu hazırlanır; mekanik runtime testleri, 16 yön/görsel/VFX/ses, aktif katalog, arena ve ücretsiz edinim tamamlanır.
  - Kabul 2: S6 konsepti 1 Mart kontrolünde seçilir; S4/S5 manifestteki mevcut mekanik briefini kullanır. CARD-03 araştırma notu veya planned JSON kaydı gerçek teslim değildir; sezon açılışı hazır modülü doğrular.

<a id="release-04"></a>

- [ ] **RELEASE-04 — 2.7.0 paket ve sezon kapısını doğrula**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: M.
  - Önkoşullar: RELEASE-03, LIVE-04, CARD-04, COS-07, AUDIO-04.
  - Mevcut bağlar: `.github/workflows/quality.yml`, `tools/release_guard.py`, `tools/package_release.py`, `server/data/game_updates.json`, `docs/MOBILE_RELEASE_RUNBOOK.md`.
  - Yeni teslim önerisi: `docs/planning/release-2.7.0-evidence.md`.
  - Sürüm briefleri: [2.7.0](planning/releases/2.7.0.md).
  - Kabul 1: Sürüme bağlı bütün zorunlu alt paketler, modül, özgün oyuncu/takım stoğu ve ekonomi kararı ayrı kanıt alır; opsiyonel özellik zorunlu kapı sayılmaz.
  - Kabul 2: CI, TR/EN mobil, gerçek cihaz, eski istemci, yedek/restore, hak koruyan kapatma ve imzalı AAB kabulü sonrası paket yayımlanır; bir hafta gözlem sonrası sezon ayrı açılır. Koşullu draft kararı başarısızsa sürüm kapsamı/tarihi yeniden karara bağlanır.

<a id="release-05"></a>

- [ ] **RELEASE-05 — 2.8.0 paket ve sezon kapısını doğrula**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: M.
  - Önkoşullar: RELEASE-04, LIVE-05, LIVE-07, CARD-05, COS-08.
  - Mevcut bağlar: `.github/workflows/quality.yml`, `tools/release_guard.py`, `tools/package_release.py`, `server/data/game_updates.json`, `docs/MOBILE_RELEASE_RUNBOOK.md`.
  - Yeni teslim önerisi: `docs/planning/release-2.8.0-evidence.md`.
  - Sürüm briefleri: [2.8.0](planning/releases/2.8.0.md).
  - Kabul 1: Sürüme bağlı bütün zorunlu alt paketler, modül, özgün oyuncu/takım stoğu ve ekonomi kararı ayrı kanıt alır; opsiyonel özellik zorunlu kapı sayılmaz.
  - Kabul 2: CI, TR/EN mobil, gerçek cihaz, eski istemci, yedek/restore, hak koruyan kapatma ve imzalı AAB kabulü sonrası paket yayımlanır; bir hafta gözlem sonrası sezon ayrı açılır. Koşullu draft kararı başarısızsa sürüm kapsamı/tarihi yeniden karara bağlanır.

<a id="release-06"></a>

- [ ] **RELEASE-06 — 2.9.0 paket ve sezon kapısını doğrula**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: M.
  - Önkoşullar: RELEASE-05, LIVE-06, ANALYT-02, CARD-06, COS-09.
  - Mevcut bağlar: `.github/workflows/quality.yml`, `tools/release_guard.py`, `tools/package_release.py`, `server/data/game_updates.json`, `docs/MOBILE_RELEASE_RUNBOOK.md`.
  - Yeni teslim önerisi: `docs/planning/release-2.9.0-evidence.md`.
  - Sürüm briefleri: [2.9.0](planning/releases/2.9.0.md).
  - Kabul 1: Sürüme bağlı bütün zorunlu alt paketler, modül, özgün oyuncu/takım stoğu ve ekonomi kararı ayrı kanıt alır; opsiyonel özellik zorunlu kapı sayılmaz.
  - Kabul 2: CI, TR/EN mobil, gerçek cihaz, eski istemci, yedek/restore, hak koruyan kapatma ve imzalı AAB kabulü sonrası paket yayımlanır; bir hafta gözlem sonrası sezon ayrı açılır. Koşullu draft kararı başarısızsa sürüm kapsamı/tarihi yeniden karara bağlanır.

<a id="cos-09"></a>

- [ ] **COS-09 — S6 için altı oyuncu öğesi ve gerekli takım stoğunu üret**
  - Durum: Yapılacak. Öncelik: P1; rol: Geliştirme / tasarım / QA; efor: L.
  - Önkoşullar: COS-08.
  - Mevcut bağlar: `server/data/cosmetic_releases_v1.json`, `server/app/liveops_content.py`, `tools/prepare_liveops_rewards.py`, `client/src/liveops-cosmetic-catalog.js`.
  - Yeni teslim önerisi: `docs/planning/season-6-art-manifest.md`.
  - Sürüm briefleri: [2.9.0](planning/releases/2.9.0.md).
  - Kabul 1: S6 için ayrı altı oyuncu öğesi ve aktif takım dönemleri gerektiriyorsa üç özgün takım öğesi hazırlanır; stok gerçek takvimle ölçülür.
  - Kabul 2: S5 öğeleri tekrar edilmez; her öğenin tasarım kimliği, TR/EN, renderer/sahiplik ve mobil kabul kanıtı vardır.

## 8. Ortak tamamlanma tanımı

- [ ] Görevin tüm kabul ölçütleri kanıtlandı; sahte/sunum fixture kanıtı gerçek ödeme/ödül teslimi diye gösterilmedi.
- [ ] Hesap sahipliği, tekrar talep, eşzamanlı talep, yanlış revision, süre sınırı ve çevrimdışı dönüş senaryoları ilgili işte doğrulandı.
- [ ] Eski oyuncu/maç/sandık/makbuz, premium iade ve varsa eski istemci uyumluluğu korundu.
- [ ] UI değişiminde TR/EN, iki dar ekran, kilit/boş/hata/yükleme ve performans kanıtı var.
- [ ] Ortak sanat yönüyle yan yana karşılaştırma var; yön değişiyorsa ayrı brief ve aşamalı geçiş kabul edildi.
- [ ] Yeni kaynak JSON/uç/varlık varsa paketleme ve native API prefix bağları güncellendi.
- [ ] İçerik/ödül artışının ekonomi raporu, sanat kabulü ve kaynak stoğu yeterli.
- [ ] Yeni minor sürüm notu, gerekli CI/AAB ve veri koruyan yayın/geri dönüş planı hazır.
- [ ] Kazanılmış haklar kapatma/rollback ile silinmiyor; kullanıcıya görünen açıklama gerçek sunucu kuralıyla aynı.

## 9. Bağımlılığa göre geçerli çalışma sırası

Bu sıra tek olası plan değildir; önkoşulları önceleyen doğrulanmış bir sıralamadır. `later` işlerin burada bulunması başlayacakları anlamına gelmez.

BASE-01 → BASE-02 → BASE-03 → ECON-01 → COS-01 → COS-05 → COS-06 → COS-07 → COS-02 → COS-03 → COS-04 → CARD-01 → CARD-02 → CARD-03 → REWARD-01 → DATA-01 → REWARD-02 → REWARD-03 → REWARD-04 → SHOP-01 → SHOP-02 → SHOP-03 → SEASON-00 → RELEASE-00 → COMPAT-01 → UI-07 → AUDIO-01 → AUDIO-02 → REWARD-06 → UI-08 → SEASON-01 → COMM-01 → RELEASE-01 → UI-01 → UI-02 → UI-03 → POLICY-01 → BALANCE-01 → LIVE-01 → OPS-02 → QA-01 → ANALYT-01 → UI-04 → AUDIO-03 → RELEASE-02 → SHOP-04 → UI-05 → UI-06 → ANALYT-02 → LIVE-02 → LIVE-03 → PLAY-01 → LIVE-12 → RELEASE-03 → LIVE-04 → LIVE-05 → LIVE-06 → LIVE-07 → LIVE-08 → LIVE-09 → LIVE-10 → LIVE-11 → OPS-01 → RET-01 → REWARD-05 → COS-08 → CARD-04 → CARD-05 → CARD-06 → AUDIO-04 → RELEASE-04 → RELEASE-05 → COS-09 → RELEASE-06
