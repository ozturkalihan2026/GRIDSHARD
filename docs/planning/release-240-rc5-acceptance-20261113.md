# 2.4.0 rc.5 — turnuva başlangıcı düzeltmesi

Kaynak `825cbe27c10407a729aeb50393f4979fdba96152`, değişmez etiket
`v2.4.0-rc.5`. Sürüm 2.4.0 ve henüz Play'e yüklenmemiş versionCode 15 korunur.
Önceki rc.4 ve `v2.4.0` etiketleri taşınmaz; yeni teslim için rc.5 pini kullanılır.

Haftalık turnuva başlangıç öncesinde ilk oynanabilir haftayı (30 Kasım–6 Aralık)
gösterir; geçmiş kayıtlar bulunsa bile kapalı turnuvanın sıralaması boştur.
İki kartta açılış tarihi ve başlangıç bekleme durumu görünür. Aktif takım
kartında hafta ile dört haftalık dönem gösterilir; dönem sonu artık haftalık
yenilenme tarihi olarak sunulmaz. Sezon/ödül başlangıcı 30 Kasım 03.00 TR,
bitiş 28 Aralık 03.00 TR olarak kalır. Ücretli alanlar ve reklamlar kapalıdır.

## Kabul

- 784 istemci, 13 web build ve 33 ilgili sunucu testi geçti; ilk Windows hedefli
  grupta harici PostgreSQL için 2 test atlandı.
- Yeni kart/boş sıralama/aktif ikinci hafta regresyonu Chromium ve WebKit'te 2/2 geçti.
- Üretim imajı gerçek, izole PostgreSQL 17/Redis üzerinde hesap, restart,
  tam yedek/restore, reviewer iki cihaz ve kapalı reklam kontrollerini geçti.
- Windows tam Python testi ilerleme vermediği için durduruldu; tanılı tekrar
  yaklaşık %82'de yerel erişim ihlaliyle kesildi. Linux/Python3.12 tam testinde
  2100 test geçti; yalnız rapor yazan 3 test salt okunur `qa_reports` nedeniyle
  başarısız oldu. Rapor dizini ayrı yazılabilir bağlanarak tam tekrar çalıştırılır.
  Testler/eşikler gevşetilmedi. Son tam Linux/Python3.12 tekrarı gerçek
  PostgreSQL 17/Redis ile **2103 PASS, sıfır skip**; yayın araçları 103 PASS.
- İmzalı AAB/APK kimliği, mevcut upload sertifikası, 580 web dosyası/paket,
  gömülü fontlar, dokuz R8 native eklentisi, kapalı Firebase başlangıcı ve
  reklam kimliği izninin bulunmadığı doğrulandı.
- Fiziksel S1 TEST son AAB'nin web dosyalarıyla tekrar kuruldu:582 ortak dosyada
  yalnız yerel API adresi farklı. Aynı hesap/24 modül, iki başlangıç kartı,
  doğru dönemler ve iki boş sıralama geçti. Üretim Play uygulaması değiştirilmedi.

Teslim dizini `deliverables/release-2.4.0-v15-20261113-rc5/`.
AAB 42.713.464 byte; SHA256
`7a0ce973f6504555a3da2d3b90e6e378a22a9efbeff787b4e92478ff538403d1`.
Eski rc.4 AAB yeni düzeltmeleri içermez. Play yüklemesi bu işlem kapsamında yapılmaz.

## Canlı geçiş

Canlı geçiş 13 Kasım 2026 **23.28.50 TR**'de tamamlandı. Kaynak yukarıdaki rc.5,
imaj `sha256:4f9b62995f551770691adcb4f26926256618136cddf9759f6d19833c0fe32b52`.
Yeni yedek ayrı PostgreSQL'e restore edilip bütün tablolarla karşılaştırıldı;
**59 profil/28 tablo aynı içerikle korundu**. 19,28 saniyelik operasyonda yalnız
uygulama yeniden oluşturuldu; PG/Redis/Caddy, kalıcı bağlar ve ortam değişkenleri
korundu. Şema/göç değişikliği yoktur. Sağlık/runtime 2.4.0, protokol 2, eski
istemci uyumu ve restart sayısı 0 doğrulandı. HTTPS'in kabul edilen JS dosyasını
sunduğu hash ile denetlendi. Canlı okuma modeli iki turnuvayı beklemede,
sıralamaları boş ve ilk haftayı 30 Kasım–6 Aralık olarak gösteriyor.

Operasyon `/opt/gridshard/operations/release-240-20261113-825cbe27c104-r2`;
yeni yedek `/var/backups/gridshard-production/20261113-before-240-825cbe27c104-r2`.
Doğrulanmış geçici aktarım arşivi silindi; önceki imajlar/yedekler korundu.
Sezon bu işlemde aktive edilmedi; S1 içerik yayın kabulü 30 Kasım öncesinde ayrıca
tamamlanmalıdır. GitHub Actions yeni çalışma sonucu yoktur; yerel kabulü
hosted CI başarısı olarak gösterme. Önceki Windows WebKit performans sınırı
[önceki kabul kaydında](release-240-local-acceptance-20261113.md) korunur.
