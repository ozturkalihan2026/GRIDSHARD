# 2.4.0 — ev bilgisayarında yerel yayın kabulü

GitHub Actions'ın yeni aday için sonucu yoktur. Son başarılı uzak çalışma
[rc.2 için 43078476162](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/43078476162)
olup yeni adayın CI başarısı olarak gösterilmez. rc.3 ara adaydır; son kullanıcı
kararlarını taşıyan kaynak rc.4 olarak ayrıca sabitlenir. Son kaynak kimliği
`config/release-candidates/2.4.0.json` ve teslim manifestinde bulunur.

## Son karar

S1, günlük giriş/sezon ödülleri ve haftalık/takım turnuvaları 30 Kasım 2026
03.00 TR başlangıcını paylaşır; 28 Aralık 03.00 TR'de dört tam hafta tamamlanır.
Haftalık dönemler 30 Kasım, 7/14/21 Aralık; üç kaynak haftası ve kozmetik finali
korunur. Ücretli mağaza, ücretli sezon başlığı/sütunu ve savaş sonu reklamı
gizlidir. Kod ve mevcut haklar silinmez. Sezon öncesi doğrudan ödül istekleri
sunucuda reddedilir; başlangıç sınır testi günlük ve sezon haklarını doğrular.

## Yerel kanıt

| Kontrol | Sonuç |
| --- | --- |
| Python3.12 tam sunucu | 2049 PASS, harici servis için 52 skip |
| İstemci / üretim build sözleşmesi | 784 / 13 PASS |
| Yayın araçları | 103 PASS |
| Üç tarayıcı ana UI | 118 PASS, mevcut koşullu 7 skip; retry/flaky yok |
| Duraklatılmış mağaza/sezon/reklam | 3 PASS; TR/EN ×320/393, reload, gerçek savaş, sıfır yeni işlem |
| Gerçek S1 teslim/emirleri | 12 PASS |
| S1 bot/turnuva UI | 6 PASS |
| İki tarayıcılı gerçek PvP/reconnect | 3 PASS |
| Eski 2.2.1/2.3.0 gerçek HTTP uyumu | 10 senaryo PASS |
| rc.4 üretim imajı/restart/izole restore | PASS; reviewer iki cihaz ve reklam kapalı akışları dahil |
| rc.4 Python3.12 + PostgreSQL17 + Redis | 129 PASS; gerçek dump/restore ve başlangıç sınırları dahil |
| S1 stok | 7 dönem, 9 tekil kozmetik; 7140 Kredi /525 Akı /234 modül parçası |

İlk gerçek PostgreSQL17/Redis grubunda kampanya kimliği değişikliğine bağımlı
test düzeltildi; 104 test PASS oldu. Son kaynak aynı kontrolleri Python3.12
test imajında 129 PASS ile doğrulandı. Makineye özgü ham kanıtlar `qa_reports/`
altındadır; bu klasör Git ile taşınmaz.

Chromium ve Android Chrome kare bütçesi PASS, p95 7,5ms. Windows WebKit
bütçesi FAIL: yeni aday 12,3 fps / p95 97,5ms; değiştirilmemiş, macOS CI'si yeşil
rc.2 de aynı Windows'ta 13 fps / p95 93,5ms ile FAIL. Bu ölçüm yeni macOS/iPhone
performans kabulü değildir. Test/eşik atlanmadı veya gevşetilmedi. WebKit'teki
işlevsel kabul başarılıdır; bu yayın Android AAB hedefidir.

Fiziksel S1 TEST'te aynı hesap/24 modül, 44 ses hash'i, iki2.4.0 etiketi,
gizli ücretli mağaza ve soğuk açılış geçti. Kayıtlı menü5/savaş55 korunur;
yeni hesap varsayılanı5/50'dir. Son ücretli sezon sütunu değişikliği son test
APK'sıyla doğrulandı: ücretli başlık/40 hücre gizli, ücretsiz yol geniş,
aynı hesap soğuk açılıştan sonra korunuyor. AAB ve telefondaki 582 ortak web
dosyasında yalnız beklenen yerel API `runtime-config.js` farkı var.
Dinleme beğenisi bu tur yeniden verilmiş sayılmaz.

Canlı geçiş 13 Kasım 21.39 TR'de d465dffda1cb kaynağından tamamlandı. 22,72 sn
operasyonda 59 profil/28 tablonun tüm içeriği, kalıcı bağlar ve diğer üç servis
korundu; yeni yedek ayrı PostgreSQL'e restore edilip birebir karşılaştırıldı.
İlk denemede wire alias'ı gerçek sürüm sanan operatör geri döndü; runtime alanı
düzeltilip ikinci yeni yedekle tamamlandı. SQL aynı baytlardır; JSON göçleri
uygulamanın mevcut CRLF→LF checksum kuralıyla aynı kaynaktır. DB geçmişi ve
canlı veri elle değiştirilmedi. Son dış HTTPS runtime2.4.0, protokol2 ve eski
istemci listesi doğrulandı. Bu Android yayını için yerel kabul kaydıdır;
GitHub Actions veya yeni macOS kabulü olarak gösterilmez.

Teslim: `deliverables/release-2.4.0-v15-20261113-rc4/`. AAB 42.713.476 byte,
SHA256 `dd406546b72f437ba2310a6cfa1e1f0eedcd7ebb37e96f6cbd14af965ee1b05b`.
Mevcut upload sertifikası, AAB/APK imzaları, 580 web dosyası/paket, dokuz R8
native eklentisi ve devre dışı Firebase başlangıcı doğrulandı. Play yüklemesi
ve mağaza onayı yapılmadı. S1 profili taslak; sezon/ödül kataloğu yayın kabulü
30 Kasım öncesinde ayrı tamamlanır, bu gece sezon aktive edilmedi.
