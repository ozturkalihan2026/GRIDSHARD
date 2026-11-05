# Güncel devir — S1 kabulü ve iki aşamalı duyuru, 5 Kasım 2026

- Dal `codex/s1-release-acceptance`; taban `afad546` (PR #2 sonrası main).
  Kullanıcı bu turdaki hazırlığı iş bilgisayarında, canlı ön duyuru dağıtımını
  **ev bilgisayarında** yapmamızı istedi. Bu bilgisayarda canlı sunucuya bağlanılmadı.
- Son kullanıcı eki **UI-09**: Gelen/Giden İstek sekmelerindeki sarılan metnin
  üstüne taşan alt çizgi kaldırıldı. Seçili turkuaz yüzey/kenar, odak ve rozet
  korunur. Üç tarayıcıda TR/EN 320/393 geçti; 2.4.0 paketi/takvim/checklist bağlı.
- PR #3 / `56ebd24` CI’ında sunucu, istemci, 83 gerçek PG/Redis/imaj,
  Safari 35+4 ve Chromium/Android 78 genel senaryo geçti. İki Türkçe 320 px
  S1 senaryosu kaldı; yerelde geçen 12 birleşim uzak kabul sayılmaz.
  Çağrı izi gecikmiş `season-reward-panel` kaydırmasının tıklamayla sabitlenen
  paneli kapattığını doğruladı. Düzeltme: sandık görünürken sabit paneli yeniden
  konumlandır; sandık görünümden çıkınca kapat. Yeni akış, pin sonrasında gerçek
  üst kapsayıcı kaydırması üretip aynı paneli ve görünümden çıkışta kapanmasını
  doğrular. Güncel kaynak CI sonucu ayrıca kaydedilecek; önceki başarısız
  koşular kabul sayılmaz.
- Ek iz: yalnız `notifications` / `seen_notification_keys` değiştiğinde
  ödül düğmeleri gereksiz yeniden kuruluyordu. Bu iki rozet alanı liste
  imzasından çıkarıldı; rozetler yine güncellenir, gerçek ödül değişimi listeyi
  yeniler. Sabit panel hover/odakla başka sandığa geçirilmez; açık seçim için
  tıklama sürer. Gerçek okunma yanıtı pin sonrasına bırakılarak TR/EN 320 px
  Chromium/Android dört regresyonu ve 779 istemci testi geçti.
- [S1 matrisi](docs/planning/release-240-s1-acceptance.md): REWARD-06 ve
  SEASON-01 yazılım kabulü done; SEASON-00 ve UI-08 branch_ready. Gerçek yerel
  PostgreSQL ile 68 test geçti; 80 hak kapanış/rollback/reload ve gerçek
  pg_dump/pg_restore ile korundu. 22 haftalık/ilk 10 kasası sabit bütçeyle açıldı.
- `first_season_launch_v1.json`: reward_budget, unique_cosmetics,
  rollover_restore, old_clients true; android_acceptance false; status draft.
  Altı dönem/altı oyuncu öğesi/234 ek sıradan parça, hash’li aday pakette sabit.
  Yetkili kozmetik kataloğu ve canlı sezon yayımlanmadı; takım ayrıca kapalı.
- Yeni `e2e/s1-acceptance.spec.js`: gerçek yerel API makbuzları; üç tarayıcıda
  TR/EN 320/393 boyutlarının 12 birleşimi, ayrıca azaltılmış hareket geçti.
  Önizlemenin alt dock’u kapatması düzeltildi. Fiziksel Android ve hoparlör/
  kulaklık kullanıcı isteğiyle ertelendi; emülasyonla kapatılmayacak.
- [İki duyuru ve evden dağıtım](docs/planning/release-230-prerelease-system-mail.md):
  `preview-2-4-0-season-one` yalnız 2.3.0 Sistem mesajında bakım ön haberi.
  **23 Kasım 22.00 → 24 Kasım 00.00 TR**, yaklaşık 2 saat;
  UTC 23 Kasım 19.00–21.00. AAB değiştirmeyen üç dosyalık eski sunucu paketi hazır.
- `preview-2-4-0-tournament-launch` ayrı popup+Sistem kampanyasıdır. 2.4.0
  sunucusu ve yeni AAB sonrasında; min_server_version 2.4.0, yayın başlangıcı
  23 Kasım 19.00 UTC. S1/ilk haftalık turnuva **30 Kasım 03.00 TR**, haftalık
  katılım/kupa/ödüller, ilk 10, kozmetikler ve ayrı takım başlangıcı anlatılır.
  Eski haberin okunması/onayı yeni pencerenin onayını tüketmez. İkisi aynı kimlik değildir.
- Bakım penceresi takvim/backlog/katalogda bağlı ve doğrulanır. Genel sonraki
  sürüm popup standardı korunur; 2.4.0 turnuva penceresi tek başına önceki ön
  duyuru yayın kapısını karşılamaz. Tarih kayarsa iki dil ve kanonik takvim birlikte değişir.
- Yerel: 2089 Python PASS / 50 dış servis SKIP, 779 istemci PASS, build 11 PASS;
  yeni turnuva popup’ı üç tarayıcıda TR/EN 320/393; eski 2.3.0’ın değiştirilmemiş
  arayüzü ve gerçek eski API ile System mesajı/okunma kalıcılığı geçti.
  Yeni dalın uzak CI sonucu ayrıca kaydedilecek. Eski CI kayıtları aşağıda tarihseldir.
- Evde önce bu dalı güncelle. `tools/prepare_legacy_announcement.py` ile
  `qa_reports/legacy-230-announcement-handoff` üret; `tools/verify_legacy_announcement.py --browser`
  ile doğrula. `qa_reports` Git ile taşınmaz, komutlarla aynı paket yeniden üretilir.
  Canlı main SHA-256, manifestteki incelenmiş 2.3.0 tabanıyla eşleşmiyorsa
  üzerine yazma; gerçek tabandan aynı küçük yamayı yeniden hazırlayıp test et.
  Bütün 2.4/S1 geliştirme sunucusunu bakım duyurusu diye erkenden dağıtma.
- Paket etiketi 2.3.0/code14, canlı ortam/AAB/başlangıç ayarları değişmedi.
  RELEASE-01 ve fiziksel cihaz/yayın kapıları açıktır; yeni sanat veya ekonomi
  baz çizgisini baştan üretmek sıradaki iş değildir.

---

# Önceki kabul — 5 Kasım 2026

- COMM-01 ve COMPAT-01 yazılım kabulü done. Dal `codex/prerelease-announcements`.
  Uygulama kaynağı `0cbe34cc8113dccdd7e62f0022a870ad19eec3e6`; CI 41919146605 bütün işler PASS.
  Sonraki commit yalnız kabul/checklist/checkpoint belgeleridir.
- Duyuru ilk uygun ana ekranda bir kez; Tamam hesapta kalıcı, offline outbox
  ve Sistem mesajı ayrı. Sürüm sonrası aynı kimlikte sezon metni; eski onay
  yeniden açılmaz. Patch/minor/major sürüm kapısı ön duyuruyu zorunlu tutar.
- AUDIO-03 / 2.5.0 ve AUDIO-04 / 2.7.0 yalnız üretim planıdır; todo kalır.
  Hedefler 21 Aralık / 15 Şubat, sayılar 1 menü+1 savaş / 1 menü+2 savaş.
- Kabul: `docs/planning/prerelease-announcement-acceptance-20261105.md`. Yerel 2072 Python PASS / 48 dış servis SKIP,
  779 istemci; son kaynak CI gerçek PG/Redis/imaj/Chromium/Android/WebKit/kaynak
  paketini geçti. Oyun grafik uyumu 4 saniyelik pencerelerle korunur;
  Safari referansı Apple Silicon'dır; performans yayın eşikleri değişmedi.
- Canlı 2.3.0/code14, AAB, sezon açılışı ve fiziksel cihaz/ses dinlemesi
  yapılmadı. Sırada S1 kaynak/ödül/görsel/cihaz yayın matrisinin kalan kabulleri
  var; yeni sanat üretimi ya da BASE-01 tekrarı değildir.
- Aşağıdaki eski CI bekleme kayıtları tarihsel kayıttır; güncel kaynak üstteki
  kabul ve `artifacts/prerelease-20261104/FINAL_STATUS.json` ile doğrulanır.

---

# Ön duyuru standardı ve müzik planı — 4 Kasım 2026

- Yeni dal: `codex/prerelease-announcements`; önceki sürüm dalındaki takılı
  CI'ın concurrency grubundan bağımsızdır. Uygulama/Play etiketleri 2.3.0/code14.
- COMM-01 dalda hazır. `release_announcements_v1.json` tek TR/EN kaynaktır:
  2.4.0 öncesi sürüm duyurusu; aynı kimlikle sürüm sonrası S1 öncesi metin.
  Önceden Tamam diyen yeniden görmez. Sistem mesajı ayrıca okunabilir.
- Onay hesapta kalıcıdır; cihazdaki hesaba özel outbox ağ hatasında Tamam'ı
  kaydeder ve sonraki inbox yenilemesinde eşitler. Okuma/silme onaydan ayrıdır.
  Yükleme/savaş/başka modal sırasında açılmaz; eski API'de alan yoksa devam eder.
- 2.3.0 sonrası patch/minor/major sürümlerde release_guard incelenmiş ön
  duyuru ister. Taslak/denetim: `tools/release_announcements.py`; yayın penceresi,
  hedef takvim ve iki dil doğrulanır. Ön duyuru, gerçek güncelleme notu değildir.
- AUDIO-03 / 2.5.0: en az bir yeni menü + bir savaş bestesi; merak/umut ve
  kontrollü rekabet. AUDIO-04 / 2.7.0: bir menü + iki özgün savaş bestesi;
  gizem, keşif gerilimi ve cesaret. Bu iki iş planlandı, müzik üretilmedi.
  Ortak sanat/ses yönü, mevcut codec/miks/tercih hattı ve master kararı korunur.
- Ayrıntı: `docs/planning/prerelease-announcements-and-music.md`; checklist,
  takvim ve 2.4/2.5/2.7 briefleri bağlı olarak üretildi. Tarihler değişmedi.
- Yerel testler `artifacts/prerelease-20261104/`: tam Python ve istemci,
  build, 320/393 TR/EN + reload/offline, gerçek PG rollback/cache kaybı geçti.
  CI kaynak/sonuç dosyaları aynı klasördedir; yeni commit CI sonucu beklenecek.
  Fiziksel Android, canlı sunucu, AAB veya sezon açılışı yapılmadı.
- İlk yeni CI'da sunucu/istemci/PG-imaj geçti; Safari savaş bütçesi kaldı.
  Bağımsız boş sayfa rAF kanıtı Intel Mac havuzunun oyunsuz durumda bile
  34 ms sınırını aştığını gösterdi. Grafik uyumu denemesi geri alındı;
  oyun kodunun 4 saniyelik kademesi, manuel ayar ve yayın bütçesi korunur.
  macOS 15 Apple Silicon havuzunda aynı test tekrar çalışacak.
  Testte savaş kareleri atılmaz; bağımsız zamanlama kanıtı ayrıca kaydedilir.
- Bu istemci kodu kurulmadan eski native 2.3.0 popup gösteremez; sunucu
  dağıtılınca Sistem mesajını okuyabilir. 2.4.0 istemcisinde sezon öncesi
  metin, aynı onay kimliğiyle desteklenir. Kaynak hazırlığı canlı yayın sayılmaz.

---

# COMPAT-01 ara CI kaydı — 4 Kasım 2026, 20.29 Türkiye saati

- Uygulama kaynağı `0c90cc9037983ee21b9ff206cfe9051ceb05b61a`,
  `codex/release-2-4-0` dalına push edildi. Görev hâlâ `branch_ready`.
- CI: https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/41873986873
  Sunucu, istemci, gerçek PG/Redis/üretim imajı ve Chromium/Android PASS.
- Safari ARM Mac kapasitesinden dolayı önce hiç başlamadı; desteklenen
  `macos-15-intel` havuzuna taşındı. Bu son kaynakta Intel Mac işi
  `126728333059`, tarayıcı kurulumunda tanımlı 10 dakika sınırını aştı.
  Normal ve force-cancel istekleri kabul edildi; GitHub işi kapatmadığından
  tek işi yeniden çalıştırma isteğini `already running` ile reddediyor.
  GitHub bağlayıcısında Actions yazma izni yok; mevcut Git oturumu API'si
  dispatch/cancel işlemlerinde kullanıldı. Kimlik bilgisi dosyaya yazılmadı.
- Sıradaki adım: iş kapandığında aynı kaynaktaki Safari işini ve bağımlı
  kaynak paketleme kontrolünü yeniden çalıştır; bütün CI işleri geçince
  COMPAT-01'i done yap, checklist/sürüm belgelerini üret ve kayıt commit'ini push et.
- Yerel son kaynak kanıtı: `artifacts/compat-240-20261104/http-proof-mac-source/proof.json`.
  Temiz commit, 10 gerçek HTTP + üç UI açılışı PASS. Python 2057 PASS / 47
  dış servis SKIP; client 778, build 11, yerel PG 77 PASS / 1 Redis SKIP;
  6 mobil akış + 2 saklı kimlik kontrolü PASS. Son durum `FINAL_STATUS.json`.
- Canlı 2.3.0/code14, sezon başlangıcı, AWS/env, AAB ve 8891 değişmedi.
  Fiziksel Android/Play/ses dinlemesi yayın kapısında kalır.

---

# COMPAT-01 — 4 Kasım 2026 ev bilgisayarındaki uygulama

- Dal codex/release-2-4-0. Kurulu2.3/2.2.1 ve yeni istemci yazılım uyumu
  uygulandı. Kabul docs/planning/release-240-client-compatibility.md; en son
  durum artifacts/compat-240-20261104/FINAL_STATUS.json'dan okunur.
- Gerçek sağlık derlemesi **runtime_release_version**. server_release_version
  artık2.3.0 alias; release_version2.2.1, versionbeta72 sabit. Operatör gerçek
  sürümü yeni alandan okumalı. API/minimum/incelenmiş minor hatları/yetenekler
  ayrıca denetlenir. Yeni eksik sözleşme eski alana düşmez; proto/kalıcılık geçmez.
- client/tests/fixtures/installed altında iki TAM değiştirilmemiş eski relay
  executable ve Git/SHA-256 kökeni; bunlar aktif test girdisidir, eski PASS
  raporu değildir. .gitattributes baytları korur, üretim bundle'a girmezler.
- Gerçek loopback HTTP: eski2.2.1/2.3→yeniAPI ve yeni→yeni/iki eskiAPI;
  web+native-origin emülasyonuyla10senaryo PASS. Auth/bootstrap/yüklemede
  aynı kimlik/korunan takım rotası gerçekHTTP; SecureStorage bellekte emüle.
- Yeni UI üç API'de Chrome'da açıldı, JS/varlık hatası0. İki telefonda6E2E
  PASS: geleceksürüm/minimumTR-EN/protokol hazır olma/503retry. Fiziksel
  Android/Keystore/TLS/Play yükseltmesi kanıtı değildir; bu kabul kullanıcı
  isteğiyle ertelenmiş genel RELEASE-01 kapısında kalır.
- Gelecek2.4 karşılaştırması için yalnız izole sağlık kimliği ve test
  expectedVersion parametresi2.4 simüle edildi. Gerçek handler'lar çalıştı;
  paket etiketleri hâlâ2.3/code14. AWS/env/S1 başlangıcı/AAB/8891 değişmedi.
- Tam yerel Python/istemci son sayıları ve CI kaydı FINAL_STATUS.json'dadır.
  CI'a aynı gerçekHTTP kaynağı ve yeni browser testleri eklendi. Branch_ready
  yerel kabulü anlatır; yeni commit CI sonucu ayrıca kaydedilecektir.
- Sonraki iş: SEASON-00/REWARD-06/SEASON-01 gerçek PG/Redis rollback/reload,
  genel CI/yayın kabulleri ve ertelenen cihaz doğrulamaları. BASE-01 done;
  sıradaki iş tekrar ekonomi baz çizgisi veya yeni sanat üretimi değildir.

---

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
