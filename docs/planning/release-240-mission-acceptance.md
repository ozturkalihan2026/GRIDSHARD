# 2.4.0 / SEASON-01 — Devre Emirleri uygulaması

**5 Kasım güncellemesi:** SEASON-01 yazılım kabulü tamamlandı.
[S1 kabul matrisi](release-240-s1-acceptance.md) bütçe, gerçek PG rollback/reload,
kapanış ve 8/12 kartın üç tarayıcıdaki gerçek sunucu akışını bağlar. Aşağıdaki
ilk dilim kayıtları tarihsel kanıttır. Fiziksel Android güncellemesi ve hesap
dönüşü kullanıcı isteğiyle ertelenmiş RELEASE-01 kapısında kalır.

4 Kasım 2026. İlk kod dilimi hazır; görev **in_progress**. Canlı dağıtım ve
fiziksel cihaz kabulü yapılmadı. [S1 bütçesi/hesabı](season-1-rewards-and-xp.md),
[kaynak tanım](season-1-engagement-v1.json), [2.4.0 briefi](releases/2.4.0.md),
[checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#season-01).

## Uygulanan davranış

- Mevcut altı günlük emir 135 XP/75 Akı ile korunur. Dört uygun savaşa +15,
  altı uygun savaşa ayrıca +15 XP eklenir; yeni emirler para/parça vermez.
- 12 sezonluk emir toplam 1.800 XP: savaş 20/40/80/120, zafer 10/25/40,
  aktif savaş günü 7/14/21, kabul edilmiş çekirdek gücü kullanımı 20/50.
  Sayaçlar sonraki eşiğe sıfırlanmadan toplam ilerler.
- Arena AI ve dereceli PvP'nin bitmiş maç sonuçları sayılır. Arkadaş, eğitim,
  takım turnuvası, derecesiz AI ve hariç tutulan hesaplar yeni emirleri ilerletmez.
  Giriş veya çekirdek düğmesine basmak tek başına ilerleme vermez.
- 40. kademe 12.240 XP kalır. Yeni emir XP'si premium ile çarpılmaz; mevcut
  reklam ve premium maç muhasebesi değişmez. Emirle açılan kademenin çekirdek
  yetenek puanı bir kez verilir.
- Sekmeler **Günlük / Sezonluk**; günlük listede sekiz, sezonlukta 12 kart vardır.
  İlerleme, XP, alınmış/alınabilir durum ve sezon bitiş tarihi görünür. Eski
  sunucudan gelen altı emir ve eski istemci API'si çalışmaya devam eder.

## Dosya ve muhasebe sözleşmesi

- `server/app/season_missions.py`: revision 1 tanımları, bitmiş maç tekilliği,
  günlük/sezonluk sayaçlar, XP makbuzu ve kazanılmış emirlerin devri.
- `player_progression.py` motor özetindeki çekirdek sayısını, maç kimliğini ve
  maç türünü `player_profile.py` hizmetine taşır. Üretimde mevcut kalıcı maç
  defteri ve `settlement_time` bitiş dönemini sabitler; geç replay yeni güne yazılmaz.
- `player_data_store.py` özel `meta_progression_state.season_mission_state`
  alanını saklar. Eski kayıtta yoksa boş başlar; geçmiş maç uydurulmaz. Maç
  hash'leri profil API'sine gönderilmez. SQL şeması değişmez.
- Yeni `POST /profile/{player_id}/engagement/season-missions/{mission_id}/claim`
  gövdesi `request_id`, `season_id`, `day_key` içerir. Sezonluk emirde gün boştur.
  Eski gün/sezon düğmesi reddedilir; talep kimliğini değiştirmek yeni XP hakkı yaratmaz.
  Yanıt `season_mission_receipt` taşır; işlem üretim ekonomik defterine dahildir.
- UTC gün değişiminde tamamlanmış/alınmamış iki ek günlük emrin XP'si otomatik
  kapanır. Ulaşılmamış hedef XP vermez. Sezon kapanışında kazanılmış emir XP'si
  önce eski sezona yazılır, ayrıntılı makbuzlar özel sezon arşivinde korunur,
  sonra XP ve sayaçlar yeni sezon için sıfırlanır.
- `client/src/relay-client.js` eski ve ek günlük kartları birleştirir;
  `app.js`, `index.html`, `canon.css`, `i18n-catalog.js` sekmeleri, klavye gezintisini,
  dönemli talepleri ve TR/EN metinlerini sağlar.

## Doğrulama ve kalan kabul

- Son kaynakla tam Python sunucu/araç regresyonu: **2031 geçti / 46 dış servis senaryosu atlandı**.
  Odaklı emir/defter kontrolü: **16 geçti / 14 PG testi atlandı**.
- İstemci regresyonu: **770 geçti**. Yeni testler ek günlük kartların birleştirilmesini,
  sezon/gün gövdelerini, eski istek uyumunu ve hatada profilin korunmasını çalıştırır.
- Chrome'da **iki akış geçti**: gerçek sunucu ile sekiz günlük/12 sezonluk kart ve 40 kademe akışı;
  ayrıca makbuz fixture'ı ile iki ödül talebi, TR 393×852 / EN 320×568,
  klavye sekme geçişi ve taşma kontrolü geçti. Fixture gerçek XP teslim kanıtı değildir.
- `server/tests/test_season_missions.py`: bütçe eşliği, gerçek bitmiş maç bağlantısı,
  mükerrer maç/talep, eşzamanlı ödül, diskten geri yükleme, UTC gün/aktif gün,
  gün/sezon devri, geç bitiş muhasebesi, premium çarpansızlığı, yetenek puanı,
  uygun olmayan tür/hesap ve kapalı sezon.
- `server/tests/test_postgres_persistent_operations.py`: yeni ödül talebinde gerçek
  PG rollback ve yeniden yükleme/replay senaryosu eklendi; izole PG yokken çalıştırılamaz.

SEASON-00 içinde kazanılmış sezon yolu haklarının sabit kayıt/kapanış kodu
[ayrı uygulama diliminde eklendi](first-season-launch-profile.md); dış servis ve cihaz kabulü açık.
Gerçek PostgreSQL/Redis kabulü, hesap değişimiyle cihaz testi ve Android yükseltme
kabulü açık. S1 dönem profili/revision/hash, sarı gezinme ve saldırı/çekirdek sesleri
ayrı işlerde izlenir. Canlı env/tarih, sürüm numarası ve AAB değiştirilmedi.
