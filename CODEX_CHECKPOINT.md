# GRIDSHARD — güncel çalışma durumu

4 Kasım 2026. Başlangıç: [belge dizini](docs/README.md).

## Ev bilgisayarına devir — 4 Kasım 2026

- Kullanıcı iş bilgisayarındaki birikmiş 2.4.0 çalışmalarının commit/push edilmesini,
  sıradaki işin ev bilgisayarında yapılmasını istedi. Bu kaydı içeren commit;
  S1 planı/profili, sabit kasa açılışı, günlük/sezonluk emirler ve sarı gezinme/ses
  uygulamalarını birlikte taşır. Aşağıdaki eski "commit/push edilmedi" notları
  ilgili dilimin kayıt anını anlatır.
- Evde önce yerel değişiklikleri `git status` ile kontrol et; temiz `main` üzerinde
  `git pull --ff-only` ile bu kaydı al. Yerel değişiklikleri silme veya üzerine yazma.
- Sıradaki iş **COMPAT-01**: değiştirilmemiş 2.3 ve 2.2.1 istemcileriyle yeni
  sağlık/başlangıç/protokol, eski API, minimum/capability uyumu ve native
  yönlendirme/güvenli güncelleme kabulü. Kanıt dosyası:
  `docs/planning/release-240-client-compatibility.md`. Bu işe iş bilgisayarında başlanmadı.
- Fiziksel Android hoparlör/kulaklık dinlemesi kullanıcı isteğiyle ertelendi.
  Gerçek PG/Redis ve CI/cihaz yayın kabulleri açık; yerel testleri bunların yerine sayma.
  Canlı ortam, sezon açılışı, AAB ve 2.3.0 paket etiketi değiştirilmedi.

## Depo ve yayın

- İş bilgisayarı: `D:/Projects/GRIDSHARD`; mevcut dal `main`.
- Kullanıcı yerel/uzak eşitlemesini bildirdi; önce `git status` ile güncel durumu kontrol et.
- Son teyit edilen yayın 2.3.0/code14. Play yayını kullanıcı beyanıdır;
  ayrıca fiziksel cihaz kabulü bildirilmedi. [Teyit](docs/planning/release-230-user-confirmation-20261103.md).
- Aktif hedef 2.4.0; kasa teslimi/açılışı ve ek günlük/sezonluk emirler geliştirme kodunda. Canlı veri,
  AWS, sezon açılış ayarı ve AAB değiştirilmedi.

## Güncel karar ve çalışma sırası

- [Bağlı sürüm rehberi](docs/GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md),
  [2.4.0 briefi](docs/planning/releases/2.4.0.md),
  [checklist](docs/GRIDSHARD_GELISIM_CHECKLIST_20261103.md).
- 2.4.0: mevcut 24 modülle S1; 40 kademe/kaynak bütçesi, açık kaynak haftaları,
  tekil kozmetik tahsisi, kazanılmış hakların kapanış/restore koruması ve eski istemci uyumu.
- Zorunlu sunum işleri: UI-07 bütün geri/ileri gezinme kontrollerinde son sarı tasarım;
  AUDIO-01 saldırı VFX ses kapsamı/cızırtı; AUDIO-02 çekirdek aktivasyon/etki sesleri.
  Yerel uygulamaları ve ölçümleri tamamlandı; aşağıdaki kabul kaydı esas alınır.
- BASE-01 raporu tamamlandı: [ekonomi baz çizgisi](docs/planning/economy-baseline.md).
  SEASON-00 kalan yayın kabulleri, COMPAT-01 ve yayın doğrulaması sıradadır.
  Gelecek sezon sanatını ilk iş diye başlatma.
- Hedef yayın 23 Kasım, S1 30 Kasım 03.00 TR. Ek yük için 6 Kasım kapasite kontrolü;
  riskte tarih yeniden karara bağlanır, kalite işleri sessizce çıkarılmaz.
- S2+ yeni hazır modül gerektirir. Planlı kayıt hazır içerik değildir; eski koleksiyon
  başka dönem/mağazada tekrar sunulmaz. Takım açılışı kişisel sezondan bağımsızdır.

## Kaynaklar ve doğrulama

- [Backlog](docs/planning/gridshard_development_backlog_v1.json): görev durumu/bağımlılık/kabul/kanıt.
- [Takvim](docs/planning/release_calendar_v1.json): tarihler, alt paketler, çalışma aralıkları.
- `python tools/development_checklist.py --write`, `python tools/release_calendar.py --write`,
  `python tools/release_delivery_plan.py --write`; ardından her biri için `--check`.
- 71 görev, 28 alt paket, altı brief; yeni özellikler plan yazıldığı için tamamlanmaz.
- Geçerli oyun: [oyun kanonu](docs/OYUN_KANONU.md), Akım V8, modül V7 ve mevcut kaynak/testler.
  Sanat yönü: [ortak kabul](docs/SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md).
- Eski checkpoint, devir kayıtları, emekli test gövdeleri ve eski raporlar Git geçmişindedir.
  Geçmiş PASS sayılarını yeni commit'in kanıtı olarak kullanma.

## 4 Kasım temizlik doğrulaması

- Eski karar/test arşivleri ve tarihsel QA raporları kaldırıldı; geçerli regresyonlar korundu.
  Salt eski raporu okuyan test, yeni eksik/atlanmış kanıtın PASS olamadığı izole testlere çevrildi.
- Bu tur: sunucu/araç Python testleri **1994 geçti, 44 dış servis senaryosu atlandı**;
  istemci **765**, JS derleme/site/araç **38** geçti. Üretim web derlemesi,
  462 dosyalık import denetimi, üç plan kontrolü ve yerel belge bağlantıları geçti.
- Font TTF aslı `native-assets/fonts/Rowdies-Bold.ttf` altında korundu;
  eski önizleme testi kaldırıldı, aktif gömülü font testleri korundu.

## BASE-01 sonucu

- `python tools/report_economy_baseline.py --write` / `--check`: kaynaklardan
  40 kademe, 28 giriş günü, dört sandık, on ürün ve altı 1/28 gün senaryosu üretir.
- 40. kademe 12.240 XP; altı görev 135 XP/75 Akı günlük. Dört maç/gün ve tüm
  görev varsayımında ücretsiz oyuncu 28 kademeye, iki premium birlikte 33'e ulaşır.
  XP/fiyat değişmedi; erişilebilirlik kararı SEASON-00 kabulüne taşındı.
- Baz çizgisi S1 sabit bütçesini modeller. Sonraki API incelemesinde servis
  katmanına ek olarak eski API'nin rastgele kademe sandığı verdiği doğrulandı.
  Yayınlanacak S1 profili ek sandık sayısını sıfırlar; eski kazanılmış ek sandık
  hakları korunur. Rapor eski API'nin toplam geliri diye okunmamalıdır.
- S1 önerisi: mevcut 40 kademe kaynakları; ücretsiz 40'ta aurora çifti, sıralama
  1.'sine solar çifti, son hafta 1.'sine abyss çifti. İlk üç hafta laser/shield/
  pulse_cannon için ilk üçe 36/24/18 parça; toplam ek tavan 234 sıradan parça.
  Bunlar yalnız bütçe önerisi; runtime tahsis/yayın değişmedi. Takım ayrıca kapalı.
- BASE-01 doğrulaması: ekonomi/bütçe/plan ve mevcut sezon/ödül teslimi için
  56 odaklı test geçti; baz çizgisi --check, üç plan kontrolü ve 464 dosyalık
  import denetimi geçti. BASE-01 done; SEASON-00 ve sunum envanterleri açık.

## S1 kullanıcı açıklaması — kasa ve XP

- [S1 sözleşmesi](docs/planning/season-1-rewards-and-xp.md), kaynak
  [XP planı](docs/planning/season-1-engagement-v1.json); `tools/plan_season_xp.py --write/--check`.
- Kullanıcı XP açığını bilerek istiyor: 12.240 eşiğini düşürme. Mevcut altı
  günlük emir korunur; 4 ve 6 Arena savaşı için ayrı +15 XP, 12 sezonluk emir
  toplam 1.800 XP önerisi. Yeni emirler kaynak para/parça vermez.
- Ücretsiz, %50 zafer, tüm ilgili emirler varsayımı: 6 maç+1 reklam/gün 27. gün;
  8 maç/reklamsız 25. gün biter. 6 maç/reklamsız 39. kademede kalır.
  Giriş tek başına XP vermez; aktif gün için uygun bitmiş savaş gerekir.
- REWARD-06 sabit kasa çekirdek teslimi; UI-08 Topla → aynı kasa al/aç →
  animasyon/ses/makbuz sonucu. Bunlar 2.4 zorunlu işleri; UI-03 2.5 seçim kasasıdır.
- Haftalık/takım/ilk 10 kasaları mevcut ödül türlerini sabit içerikle taşır;
  her kasaya her tür veya her sıraya yeni kozmetik vaat edilmez. Mevcut giriş
  25 çekirdek parçası korunur; yarışmaya ek çekirdek miktarı bütçelenmeden açılmaz.
- REWARD-06/UI-08 ve SEASON-01 ilk dilimleri kodlandı. RELEASE-01 bağımlılıklarıdır. Ek yük 6 Kasım kontrolüne
  girer. Tarihler otomatik kaydırılmadı; eski kazanılmış haklar korunacak.

## İlk uygulama dilimi — kasa teslimi/açılışı

- [Kod sözleşmesi ve kanıt](docs/planning/release-240-fixed-crate-contract.md).
  REWARD-06/UI-08 in_progress; tüm kabul koşulları bitmiş sayılmaz.
- Sabit kasa core_type_id/core_shards desteği ve tüm içerik mutasyondan önce
  doğrulama. Topla `?chest_delivery=open` ile aynı işlemi al/aç; eski query'siz
  toplama korunur. Yeni istek kimliği `inbox-open:{message_id}`; açılmış kasa
  makbuzu tekrar/restore halinde yeniden kullanılır, ikinci grant yoktur.
- UI açılış/ödül sesi/tekli ve toplu makbuz sonucu; kısmi hatada yalnız başarılar
  gösterilir. 2015 Python PASS/44 dış servis SKIP, 767 istemci PASS; 26 odaklı
  teslim testi. Yerel Chrome TR393/EN320 görsel fixture kontrolü PASS.
- Gerçek PG rollback testi eklendi, servis ortamı olmadan atlanır. Android kabulü
  bekliyor. Sıradaki ana iş S1 profile/tekil tahsis/kapanış ve sarı gezinme/ses envanteridir.

## SEASON-01 ilk uygulaması — günlük/sezonluk emirler

- [Kabul kaydı](docs/planning/release-240-mission-acceptance.md). Görev in_progress;
  yeni emirler artık kodda, tüm 2.4.0 kapıları kapanmış değildir.
- `server/app/season_missions.py` revision 1: 4/6 uygun savaşa ayrı +15 XP;
  12 sezonluk emir toplam 1.800 XP. Eski altı emir ve 12.240 XP eşiği korunur.
- Motorun bitmiş Arena AI/dereceli PvP sonuçları; sunucu tarafında maç tekilliği,
  aktif UTC günü ve kabul edilmiş çekirdek kullanımı. Yeni emir XP'si premiumla çarpılmaz.
- Özel meta JSON durumunda kayıt/restore; gün devrinde kazanılmış ek günlük XP,
  sezon devrinde kazanılmış bütün yeni emir XP'si önce kapanan sezona işlenir.
  Ayrıntılı eski emir defteri özel arşivde kalır. Tam sezon yolu teslimi SEASON-00'dadır.
- Yeni dönemli talep API'si `engagement/season-missions/{id}/claim`; eski talep
  gövdeleri korunur. Sekiz günlük/12 sezonluk kart, TR/EN, klavye sekme geçişi.
- Gerçek PG rollback/replay testi eklendi; yerel servis olmadan SKIP. Android
  güncelleme/hesap değiştirme ve bütün sezon yolu hakları kabulü açık.
- Son kaynak doğrulaması: **2031 Python PASS / 46 dış servis SKIP**, **770 istemci PASS**,
  **iki Chrome akışı PASS**. TR393/EN320 görüntülendi; 469 dosya/0 import sorunu,
  web derlemesi ve beş plan/bütçe kontrolü geçti.
- Değişiklikler henüz commit/push edilmedi. Canlı sunucu, env, AAB ve sürüm etiketi değişmedi.

## SEASON-00 ilk uygulaması — S1 profili ve kapanış

- [S1 profil/kapanış sözleşmesi](docs/planning/first-season-launch-profile.md).
  `server/data/first_season_launch_v1.json` draft; beş yayın kabulü false.
  Gerçek kozmetik kataloğu hâlâ 15 öğe / 0 rezervasyon / 0 yayın.
- Hazırlık komutu `python tools/prepare_first_season.py --check` / `--preview`;
  dosya yazmadan altı aday dönemi, altı tekil oyuncu öğesini ve 234 ek sıradan
  parçayı doğrular. Kaynak paketine profil dahil; CI kontrolü eklendi.
- Açık `resource_only` haftaları: W49 Lazer, W50 Kalkan, W51 Darbe Topu;
  ilk üçe 36/24/18, mevcut Kredi/Akı. W52 birinciye Derin Akım; sezon yolu
  40'a Kutup Işığı, liderlik birinciye Güneş Ocağı. Takım ayrı kapalı kalır.
- Kazanılmış kademe gerçek hedef/miktar/revision/hash ile özel kayda alınır.
  Kapanış önce emir XP'sini işler, sonra alınmamış sabit hakları mesaj kutusuna
  aktarır. Başarısız kapanış bütün profil üzerinde geri alınır. Premium kökeni
  eski sezonun iade/restore defterine bağlı kalır; tarihsel ek sandık hakkı korunur.
- S2 yeni hazır modül ve yayınlı dönem ödülü yokken waiting_for_content;
  yeni sezon XP/premium/turnuva açılmaz. Eski mesajlar açılabilir. Eski istek
  tekrarı ilk makbuzun dönemini kullanır; yeni sezon stoğu üretmez.
- Haftalık ilk kapanış tüm katılımcılara özel sıra tanığı yazar ve ilk üçün
  paketlerini birlikte sabitler. Yeniden kayıt ve kazanan hesapların silinmesi
  sonraki oyuncuyu yeni kazanan yapmaz. Eski kısmi dağıtımlar otomatik yeniden hesaplanmaz.
- Son doğrulama: **2052 Python PASS / 47 dış servis SKIP**, **770 istemci PASS**,
  **3 Chrome akışı PASS**, 474 dosya / 0 import sorunu; web derlemesi ve kaynak
  sürüm kontrolü geçti. Yeni gerçek PG kapanış rollback/reload testi servis yokken SKIP.
- SEASON-00 in_progress. Gerçek PG/Redis, değiştirilmemiş eski istemci ve Android
  kabulü açık. Bu dilimi izleyen sunum işi aşağıdaki sarı gezinme ve ses uygulamasıdır.
  Bu değişiklikler commit/push edilmedi; canlı env/tarih ve AAB değiştirilmedi.

## UI-07 / AUDIO-01 / AUDIO-02 — yerel uygulama

- Kullanıcı bağlı Android cihaz yerine **yerel kontrollerle ilerlenmesini** istedi.
  Fiziksel hoparlör/kulaklık dinlemesini tamamlanmış sayma; yayın kapısı ayrı kalır.
- [Gezinme matrisi](docs/planning/release-240-navigation-matrix.md): 11 statik geri,
  iki ileri kontrol sahibi; 44×44 sarı yüzey, eski mavi pseudo yüzey/dot kaldırıldı.
  Basılı/klavye odağı/devre dışı durumlar; ödül/rehber TR/EN 320×568 ve 393×852.
  Profil/pano, etkinlik, takım yönetimi ve boş sohbet gerçek dönüşleri yerelde
  test edilir. Mesaj gönderilmez. Her profil penceresinin dört dil/boyut birleşimi
  için ayrı görsel yayın kabulü açık; native geri yöneticisi değiştirilmedi.
- [Modül matrisi](docs/planning/release-240-module-audio-matrix.md),
  [çekirdek matrisi](docs/planning/release-240-core-audio-matrix.md),
  [PCM/hash ölçümleri](docs/planning/release-240-audio-measurements.json).
  Sekiz saldırı WAV’ı ve yedi çekirdeğin 14 WAV’ı sürekli faz/yumuşak uçlarla
  üretildi; genel SFX/müzik kazançları ve rutin 3 ses/420 ms bütçesi korundu.
  Gerçek çekirdek sesi görsel ankraja bağlı kalmaz; tekrar snapshot çift ses vermez.
  Takviye için olmayan atış mekaniği üretilmez.
- `modules/` OGG/AAC alt klasörü ve içerik hash kontrolü; WebAudio diğer codec’i
  WAV’dan önce dener. Üretim web paketi 105 kaynak WAV’ı çıkarır. Gerçek Chromium
  ve Android öykünmesinde 24 cue başlatıldı; OGG hatasında AAC ile çalıştı.
  Dört saniyelik yoğun müzik/savaş render’ı: tepe **0,782059**, kırpılan örnek **0**.
  Windows yerel WebKit AudioContext sunmaz; ses senaryosu burada SKIP, macOS CI
  kapısı etkin. Bu fiziksel iPhone/Android ses kabulü değildir.
- Yerel doğrulama: **774 istemci testi**, **11 paketleme testi**, **2052 Python
  PASS / 47 dış servis SKIP**; son eklenen üretici tekrar üretilebilirlik testi ve
  odaklı eski ses sözleşmesi **4 PASS**. Python taraması **477 dosya / 0 sorun**.
  Son kaynakla tamamlanan tarayıcı senaryoları **14 PASS / 1 yerel WebKit ses SKIP**
  (üç profil; son takım/sohbet kontrolleri ayrı odaklı koşuda doğrulandı).
  Darbe Topu üretici isim çakışması giderildi; master aynı hash ile yeniden üretildi.
  Web derlemesi ve kaynak sürüm koruması geçti; paket etiketi hâlâ **2.3.0**.
- Checklist’te üç sunum işi `branch_ready`: dalda hazır, canlıda yok. Gerçek cihaz,
  dış servis/CI, eski istemci ve S1 yayın kabulü ayrıca tamamlanacak. COMPAT-01
  aktif sürümde sıradaki başlanabilir iş; commit/push, canlı env/tarih ve AAB yok.
