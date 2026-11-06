# S1 — yazılım kabulü ve kalan yayın matrisi

**6 Kasım yayın öncesi UI eki:** Ayrı test APK’sı 2.4.0/15 olarak
güncellendi; açılış/ayarlar/Android sürümü eşleştirme kapısı eklendi.
Alınabilir mağaza hediyesi Kartlar ile ortak yeşil ışığı kullanır;
sunucu onaylı alım sonrası ve yeniden açılışta söndüğü doğrulandı.
REVIEW / DEMO SIGN-IN başlangıç/kayıttan kaldırıldı, Ayarlar → Hesap ve
Gizlilik ve kurtarma erişimi korundu. Yayından önce Play Console App access
açıklaması [yeni giriş yoluna](../PLAY_REVIEW_ACCESS.md) göre güncellenmeli.
İmzalı AAB için üretim yapılandırması istemcinin 2.4.0/15 kimliğine birlikte
hazırlanmalı; mevcut canlı 2.3.0 bu test güncellemesiyle değiştirilmedi.
Ayrıntı ve native kanıt: [test kaydı](native-s1-test-20261106.md).

**6 Kasım eki:** [S1 bot katılımı ve ödül ertelemesi](release-240-bot-competition.md)
SEASON-02/UI-10 kapsamındadır. Yerel 2108 Python/araç testi geçti (52 dış
servis testi atlandı); gerçek PostgreSQL'de 25 odaklı test ayrıca geçti.
779 istemci ve 11 build testi geçti. Üç tarayıcıda yeni ödül sekmeleri ve
beş arkadaş sekmesi TR/EN 320/393 kabulünü geçti. Ayrı fiziksel S1 TEST APK’sı,
normal giriş, 40 kademe ve üç açılmamış kabul kasası doğrulandı. Kullanıcının
ses/dokunma testi için 24 modül aynı yerel hesaba açıldı; mağaza veya canlı
hesap değiştirilmedi. Dinleme kabulü kullanıcıdan bekleniyor.

5 Kasım 2026. Kullanıcı fiziksel cihaz yerine yerel kontrollerle ilerlenmesini
istedi. Bu kayıt yazılım kabulüdür; canlı sezon açılışı veya fiziksel cihaz kabulü
değildir. [S1 profili](first-season-launch-profile.md), [kasa kabulü](release-240-crate-opening-acceptance.md),
[emirler](release-240-mission-acceptance.md), [2.3.0 ön duyurusu](release-230-prerelease-system-mail.md).

## Sabit bütçe ve tekil tahsis

| Kaynak | Kredi | Akı | Modül parçası | Çekirdek parçası |
| --- | ---: | ---: | ---: | ---: |
| 40 ücretsiz kademe | 5.680 | 419 | 636 taban birim | 0 |
| 40 premium ek kademe | 11.360 | 838 | 1.272 taban birim | 0 |
| 28 günlük giriş takvimi | 2.678 | 134 | 244 taban birim | 25 |
| İlk üç haftanın bütün ilk üç kazananları | 7.140 | 525 | 234 sıradan parça | 0 ek |

Modül hedefi/enderliği seçildikten sonra gerçek miktar hak kaydında sabitlenir;
taban birimlerin tamamı her enderlikte aynı fiziksel parça sayısı değildir.
Giriş takvimi ayrı kaynaktır; yarışma kasalarına yeni çekirdek bütçesi eklenmedi.
Sabit sezon ödülünün sandık etiketi fazladan rastgele mağaza sandığı üretmez.
12.240 XP, günlük iki ek emrin toplam 30 XP’si ve 12 sezonluk emrin toplam
1.800 XP’si korunur. Reklam ve oyun ihtiyacı kaldırılmadı.

| Dönem / başarı | Ayrılan mevcut içerik |
| --- | --- |
| S1 ücretsiz yol, 40. kademe | Kutup Işığı çerçeve + profil çubuğu |
| S1 lider panosu, birincilik | Güneş Ocağı çerçeve + profil çubuğu |
| W49 / 30 Kasım–7 Aralık | Lazer 36/24/18; Kredi 1200/760/420, Akı 90/55/30 |
| W50 / 7–14 Aralık | Kalkan 36/24/18; aynı Kredi/Akı |
| W51 / 14–21 Aralık | Darbe Topu 36/24/18; aynı Kredi/Akı |
| W52 / 21–28 Aralık, birincilik | Derin Akım çerçeve + profil çubuğu; mevcut kaynaklar |

Üç oyuncu çifti toplam altı benzersiz öğedir. 6 Kasım kararıyla dokuz takım
öğesinden üç Kutup Işığı öğesi 7 Aralık takım dönemine ayrıca ayrılır;
takım turnuvası ayrı operatör başlangıcına bağlıdır. S1 bot takımları katılım
eşiğine dahildir, gerçek sıralar korunur ve botlara ödül verilmez.
Hazırlık paketindeki yedi dönem **draft** rezervasyondur; yetkili katalog,
oyuncu sahipliği ve canlı stok bu komutla değiştirilmez:

```text
python tools/prepare_first_season.py --bundle qa_reports/s1-launch-candidate-20261105
```

Paket profil, aday katalog, kapsam raporu ve her dosyanın SHA-256 özetini içerir.
Mevcut çıktı ezilmez; tekrar için yeni klasör adı seçilir. Kaynak profil `draft`,
ilk dört kabul `true`, `android_acceptance=false` kalır. Bütün kapılar geçmeden
profili `published` yapmak doğrulamada reddedilir.

## Kabul matrisi

| Madde | Yerel sonuç | Kanıt / sınır |
| --- | --- | --- |
| 40 ücretsiz + 40 premium sabit bütçe | Geçti | Gerçek talep handler’ları, 80 talep + tekrar; cüzdan farkı sabit hak toplamına eşit, ek sandık yok |
| Üç kaynak haftası + son kozmetik haftası + ilk 10 | Geçti | 22 gerçek kasa; önizleme, açılış makbuzu, revision/hash ve kaynaklar eşit |
| Tekil kozmetik tahsisi | Geçti | Kutup Işığı yalnız yol; Güneş Ocağı yalnız liderlik; Derin Akım yalnız W52; altı benzersiz aday öğe |
| Kapanış/tekrar/geç dönüş | Geçti | 80 hak; hata sonrası PG rollback; cache silinip reload; eski sezona tek makbuz |
| Gerçek yedek/restore | Geçti | İki yeni yerel veritabanı, gerçek pg_dump/pg_restore; 80 hak ve profil blob’u birebir korunur |
| Premium iade/restore | Geçti | Eski sezon kökeni, açılmamış hak kilidi ve açılmış kaynakların iade defteri; mevcut regresyonlar |
| Günlük/sezonluk emirler | Geçti | Maç/gün/sezon tekilliği, geç toplama, 1.800 tavanı; PG rollback/reload ve 8/12 kart |
| Topla ve gerçek ödül sonucu | Geçti | Gerçek yerel API: haftalık modül, liderlik kozmetiği ve ayrıca sentetik çekirdek kabul kasası |
| TR/EN, 320×568 ve 393×852 | Geçti | Chromium, Android Chrome ve WebKit öykünmesinde 12 birleşim; EN320 azaltılmış hareket üç profilde de geçti |
| Önizleme varken alt gezinme | Düzeltildi/geçti | Kaydırılabilir önizleme korunur; panel alt dock’u kapatamaz; sabit panel görünür sandıkla kayar, sandık görünümden çıkınca kapanır |
| Gelen/Giden İstek sekmelerindeki çizgi | Düzeltildi/geçti | [UI-09](release-240-friend-request-tabs.md); iki gerçek sekme seçimi, TR/EN 320/393 ve üç tarayıcı |
| 2.3/2.2.1 yazılım uyumu | Geçti | COMPAT-01 ve değişmemiş 2.3.0 + eski API üzerinde Sistem mesajı; native origin emülasyonu fiziksel kanıt değildir |
| Gerçek Android kurulum/yükseltme/hesap dönüşü | Kullanıcı isteğiyle ertelendi | Yerel emülasyonla kapatılmaz; RELEASE-01 kapısında kalır |
| Hoparlör/kulaklık dinlemesi | Kullanıcı isteğiyle ertelendi | Sayısal ses/miks kabulü öznel cihaz dinlemesi değildir |
| 2.3.0 bakım ön duyurusu | Canlıda | [5 Kasım evden dağıtım](release-230-prerelease-deployment-20261105.md); yalnız üç dosya, 55 profil korunumu, yedek/restore ve gerçek Sistem mesajı geçti |
| 2.4.0 / S1 / yeni AAB | Yayınlanmadı | Bakım ön duyurusu bu paket veya sezonun açılışı değildir; fiziksel cihaz ve yayın kapıları sürer |

## Tekrar üretilebilir kanıt

Son yerel tam regresyon: **2089 Python PASS / 50 dış servis SKIP**, **779 istemci PASS**,
**11 paketleme PASS**. Gerçek yerel PG kabul koşusu ayrıca **68 PASS**, atlama yoktur.
Son arayüz düzeltmelerinden sonra 779 istemci ve 65 araç testi, 11 paketleme
kontrolü yeniden geçti. Üretim kodu referansı `619c90a7527146ebc0ee2652fa81cfc9ccdf2bfe`.
Yerel 12 birleşimde işlevler doğrulandı; Windows WebKit EN393 ilk koşuda
toplam 120 saniyelik test bütçesini aştı, tekrarda geçti. Test mevcut WebKit
projesinin 150 saniyelik bütçesine uyarlandı; aynı senaryo **tekrarsız PASS**.
Bu, savaş performansı eşiklerini veya tek eylemin görünürlük koşullarını değiştirmez.

Regresyon gerçek okunma yanıtını pin sonrasına bırakır: rozet sönerken ödül
düğmesi ve aynı panel korunur. Üst kapsayıcının gerçek kaydırması görünür
sandığın panelini yeniden konumlandırır; görünümden çıkışta kapatır. Masaüstünde
başka sandığa hover sabit paneli değiştirmez. Panel ve dock aynı tarayıcı
görevinde ölçülür; görünürlük, 44 px gezinme yüksekliği ve örtüşmeme koşulları
korunur. Açma/teslim istekleri gerçek sunucu handler’larına gider.

[CI 42019478488](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/42019478488),
PR başı `619c90a`, test edilen birleştirme `522c0482655c1750dc146d67543668626844227b`:
sunucu 2024 PASS / 50 SKIP, araçlar 61 PASS / 4 platform SKIP; gerçek PG/Redis
83 PASS ve imaj yeniden başlatma/restore PASS; istemci 779 ve build 11 PASS;
Safari performans 1, genel 35 ve S1 4 PASS; Chromium/Android performans 2,
genel 78 ve S1 8 PASS; iki gerçek istemcili PvP 3 PASS. **CI’ın bütün işleri
ve yeniden üretilebilir kaynak paketi PASS**, tekrar/flaky yoktur.
Kaynak artifact’i `13412945325`; ayrı S1 kanıtları Chromium/Android
`13411428273`, Safari `13411307516`. Metadata `qa_reports/s1-ci-42019478488.json`.
Sonraki kayıt commit’inde üretim kodu değişmez; belgeler ve yerelde sınanan
WebKit proje test bütçesi uyumu bulunur. Önceki başarısız koşular kabul değildir.

- `server/tests/test_s1_release_acceptance.py`: 80 kademe, 22 yarışma kasası,
  yayınlanmış S1 fixture’ıyla gerçek PG kapanışı ve dump/restore.
- `server/tests/test_season_entitlements.py`, `test_inbox_open_delivery.py`,
  `test_season_missions.py`, `test_postgres_persistent_operations.py`,
  `test_server_backup.py`: **68 odaklı test geçti**; bu koşuda PG senaryoları atlanmadı.
- `e2e/s1-acceptance.spec.js`: test sunucusunda bellekte yayınlı S1; normal
  authenticated talep/açılış handler’ları kullanılır. Yanıt fixture’ıyla ödül
  uydurulmaz. Çekirdek kasası ekonomik S1 ödülüne eklenmeyen ayrı kabul örneğidir.
- Yerel çıktılar: `qa_reports/s1-postgres-acceptance.xml`,
  `qa_reports/s1-browser-evidence-619c90a-initial/`,
  `qa_reports/s1-browser-evidence-619c90a-webkit-budget/`,
  `qa_reports/s1-launch-candidate-20261105/`.
  Bunlar yeniden üretilen kanıtlardır; kaynaktan bağımsız eski PASS geçerli sayılmaz.
- CI’ın migration işi S1 PG/restore testini; tarayıcı işi ayrıca izole S1
  senaryolarını çalıştırır. Test endpoint’i yalnız `tools/e2e_server.py` içindeki
  açık yerel fixture seçeneğinde kurulur; üretim API’sine eklenmez.

Paket yayın hedefi 23 Kasım, S1 ve ilk haftalık turnuva hedefi 30 Kasım 03.00 TR.
Fiziksel kabul ve 2.4.0/S1 canlı dağıtımı tamamlanmadan RELEASE-01 kapanmaz.
