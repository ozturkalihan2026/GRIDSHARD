# S1 — yazılım kabulü ve kalan yayın matrisi

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

Üç oyuncu çifti toplam altı benzersiz öğedir. Dokuz takım öğesi bu tahsise
katılmaz; takım turnuvası ayrı başlangıç ve katılım koşuluna bağlıdır.
Hazırlık paketindeki altı dönem **draft** rezervasyondur; yetkili katalog,
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
| Canlı duyuru / sezon / AAB | Yayınlanmadı | Ön duyuru için ayrı küçük 2.3.0 sunucu paketi; S1 ve AAB bu çalışmada açılmaz |

## Tekrar üretilebilir kanıt

Son yerel tam regresyon: **2089 Python PASS / 50 dış servis SKIP**, **779 istemci PASS**,
**11 paketleme PASS**. Gerçek yerel PG kabul koşusu ayrıca **68 PASS**, atlama yoktur.
Son UI-09 eki sonrasında 779 istemci ve 65 araç testi, 11 paketleme kontrolü
yeniden geçti. `56ebd24` üzerinde güncel S1 tarayıcı matrisinin 12 birleşimi
tek koşuda geçti (`qa_reports/s1-browser-evidence-56ebd24/`). Ancak aynı
kaynağın CI’ında iki TR320 senaryosu gecikmiş kaydırmada panel kapandığı için
kaldı; bu yerel PASS tek başına uzak kabul değildir. Kaydırma işleyicisi
görünür sandığın sabit panelini yeniden konumlandırır; yeni regresyon gerçek
üst kapsayıcı kaydırmasıyla panel kimliğini, sonra görünümden çıkışta kapanmayı
doğrular. Panel/dock
ölçümüne ek olarak gerçek okunma yanıtı pin sonrasına bırakılır: yalnız rozet
alanlarının değişimi kartları yeniden kuramaz; rozet sönerken aynı panel
korunur. Sabit panel başka sandığa hover/odakla aktarılmaz, açık seçim tıklaması
çalışır. Bu birleşik regresyonun TR/EN 320 px Chromium/Android dört koşusu geçti.
Panel/dock
ölçümünde güncel DOM öğeleri aynı tarayıcı görevi içinde okunur; görünürlük,
44 px gezinme yüksekliği ve örtüşmeme koşulları beklenir, eylem zorlanmaz.
Yeni dalın uzak CI sonucu ayrıca kaydedilir; eski kaynak CI’ı bu değişikliklerin
kabulü diye sunulmaz.

- `server/tests/test_s1_release_acceptance.py`: 80 kademe, 22 yarışma kasası,
  yayınlanmış S1 fixture’ıyla gerçek PG kapanışı ve dump/restore.
- `server/tests/test_season_entitlements.py`, `test_inbox_open_delivery.py`,
  `test_season_missions.py`, `test_postgres_persistent_operations.py`,
  `test_server_backup.py`: **68 odaklı test geçti**; bu koşuda PG senaryoları atlanmadı.
- `e2e/s1-acceptance.spec.js`: test sunucusunda bellekte yayınlı S1; normal
  authenticated talep/açılış handler’ları kullanılır. Yanıt fixture’ıyla ödül
  uydurulmaz. Çekirdek kasası ekonomik S1 ödülüne eklenmeyen ayrı kabul örneğidir.
- Yerel çıktılar: `qa_reports/s1-postgres-acceptance.xml`,
  `qa_reports/s1-browser-evidence/`, `qa_reports/s1-launch-candidate-20261105/`.
  Bunlar yeniden üretilen kanıtlardır; kaynaktan bağımsız eski PASS geçerli sayılmaz.
- CI’ın migration işi S1 PG/restore testini; tarayıcı işi ayrıca izole S1
  senaryolarını çalıştırır. Test endpoint’i yalnız `tools/e2e_server.py` içindeki
  açık yerel fixture seçeneğinde kurulur; üretim API’sine eklenmez.

Paket yayın hedefi 23 Kasım, S1 ve ilk haftalık turnuva hedefi 30 Kasım 03.00 TR.
Fiziksel kabul ve canlı dağıtım tamamlanmadan RELEASE-01 kapanmaz.
