# 2.4.0 erken yama — 13 Kasım ev bilgisayarı teslimi

Kullanıcı kararı: zorunlu yama için 23 Kasım geçiş hedefi **13 Kasım 2026
22.00 → 14 Kasım 00.00 Türkiye saati** olarak öne alındı. UTC karşılığı
13 Kasım 19.00–21.00; yaklaşık iki saat. Sunucu geçişi, imzalı AAB üretimi
ve mağaza işlemleri ev bilgisayarında yapılacak. Bu belge bunların yapıldığı
veya kabul kapılarının geçtiği anlamına gelmez.

## Evde kaynak birleştirmesi

Evde kullanıcı daha sonra **22.00'yi beklemeden hemen geçiş** yapılmasını
istedi. İlk paragraftaki 22.00–00.00 okul planı tarihsel kayıttır; fiilî
geçiş saati operasyon sonucuna yazılır. Sezon ve sonraki sürüm hedefleri
değişmez. 2.4.0 sonrası Sistem metni eski bakım saatini tekrar etmez;
turnuva rehberi 13 Kasım15.30UTC + 2.4.0 sunucu kapısıyla açılır.

Okul dalı 2.3.0 sunucu tabanından geldiği için doğrudan eski kaynaktan paket
üretilmez. `4249aa14` değişikliği, son rc.2 düzeltmelerini ve bağımsız yayın
araçlarını koruyan `codex/release-2.4.0-rc3` dalına alındı. Bu dalda sunucu,
istemci ve Android üretim ayarı 2.4.0/code15 olarak hizalı; sürüm notu tarihi
13 Kasım'dır. Yeni aday kendi kabulü tamamlandığında ayrı etiketle sabitlenir;
rc.1/rc.2 etiketleri taşınmaz. Aşağıdaki 2.3.0/code14 uyarıları okulun eski
tabanını anlatır; son kaynak için sürüm kontrolü tekrar çalıştırılır.

GitHub kotası nedeniyle yerel kontroller kullanılırsa her komut, kaynak commit'i,
sonuç ve platform kaydedilir. Windows WebKit işlevsel kanıtı macOS performans
kanıtı olarak, eski rc.2 CI başarısı yeni rc.3 CI başarısı olarak raporlanmaz.

## Oyuncuya gidecek mesaj

Başlık: **2.4.0 bakım tarihi öne alındı; sezon takvimi aynı**.

Mesaj, zorunlu yama nedeniyle bakımın önceye alındığını, yeni iki saatlik
pencereyi, bakımda bağlantı kesilebileceğini ve mağaza paketinin inceleme/
dağıtım sürecine bağlı olduğunu söyler. Özel gerekçe içermez. TR/EN tam metin
[duyuru kataloğundadır](../../server/data/release_announcements_v1.json).

- Ön haber: `preview-2-4-0-early-patch-20261113`, yalnız Sistem mesajı.
  Yayın penceresi 13 Kasım 00.00–19.00 UTC; bakım başladığında sona erer.
- Önceki `preview-2-4-0-season-one` haberi 5 Kasım’da canlıya gönderildi.
  Yeni kimlik sayesinde o haberi okumuş/silmiş/onaylamış hesaplar yeni haberi
  okunmamış görür; oyuncuların eski okunma kayıtları silinmez.
- Geçişten sonra `preview-2-4-0-tournament-launch`, 2.4.0 sunucu + yeni
  istemcide ayrı turnuva penceresi ve Sistem mesajıdır. İlk sezon sonuna
  kadar kalır; önceki haberlerin onayı bunu kapatmaz. Son bot/gerçek sıra ve
  ödül açıklamaları korunmuştur.

## Değişmeyen sezon ve turnuva takvimi

Başlangıç ve bitişler 03.00 TR / 00.00 UTC; bitiş anı sezona dahil değildir.
Bunlar mevcut hedeflerdir; sezon açılış kabulü ayrıca yapılır.

| Sezon | Başlangıç | Bitiş |
| --- | --- | --- |
| S1 | 30 Kasım 2026 | 28 Aralık 2026 |
| S2 | 28 Aralık 2026 | 25 Ocak 2027 |
| S3 | 25 Ocak 2027 | 22 Şubat 2027 |
| S4 | 22 Şubat 2027 | 22 Mart 2027 |
| S5 | 22 Mart 2027 | 19 Nisan 2027 |
| S6 | 19 Nisan 2027 | 17 Mayıs 2027 |

S1 haftalık dönemleri 30 Kasım, 7/14/21 Aralık 03.00 TR. Takım turnuvası
ayrı hazırlık/onayla **en erken 7 Aralık 03.00 TR**; kesin açılış değildir.
2.5.0 ve sonraki sürüm hedefleri değişmedi. Bu akşam sezon açılmaz.

## Evde uygulanacak sıra

1. Güncel dalı al; çalışma ağacını ve CI sonucunu kontrol et. Yeni kaynak
   için mevcut [sunucu](../SERVER_PRODUCTION_RUNBOOK.md) ve
   [mobil yayın](../MOBILE_RELEASE_RUNBOOK.md) prosedürlerini kullan.
2. Bakımdan **önce** çalışan 2.3.0’a yeni Sistem haberini gönder. Gerçek
   Compose/imaj, bağlanan dosyalar ve hash’leri keşfet; 5 Kasım’da duyuru
   modülü zaten kuruldu. Mevcut modül kaynakla aynıysa yalnız katalog
   güncellenir ve süreç kontrollü yenilenir. İlk kurulum için hazırlanmış
   `main.py` yamasını zaten yamalı canlı dosyanın üstüne uygulama.
   [Önceki dağıtım kaydı](release-230-prerelease-deployment-20261105.md)
   gerçek taban/hash ve geri dönüş sınırlarını içerir.
3. Yeni haberin gerçek 2.3.0 Sistem kutusunda, iki dilde doğru saatle
   göründüğünü doğrula. Eski haberin okunması yeni haberi kapatmamalı.
   Bakım başlamışsa süresi dolan ön haberi göstermek için tarihi uzatma;
   geçiş sonrası turnuva rehberini kendi sürüm kapısıyla kullan.
4. 22.00 bakımında aktif maçları boşalt; mevcut veri/yapılandırmayı yedekle,
   yedeği izole hedefe geri yükleyip karşılaştır. Gerçek oyuncu verisine
   dokunmadan imaj/kod geri dönüşünü hazır tut.
5. Sunucu sürümünü yayın adımında 2.4.0’a damgala; sürüm notlarını ve
   `tools/release_guard.py` beklentisini aynı değişiklikte güncelle,
   health alias’larını koru. Bu teslimde kaynak sunucu hâlâ 2.3.0’dır;
   2.4.0 canlıya geçmiş gibi raporlanmaz. Eski istemci uyumunu yeniden doğrula.
6. Sezon ayarını **`GRIDSHARD_SEASON_STARTS_AT=2026-11-30T00:00:00Z`**
   olarak denetle. Takım açılışını ayrı tut; bugüne çekme. S1 profili ve
   Android kabul alanlarını kanıt olmadan `published/true` yapma.
7. Yeni istemcide `MONETIZATION_ENABLED=false`: ücretli mağaza satırları,
   sezon/premium alım girişleri ve savaş sonu reklamı gizli; yeni işlem
   işleyicileri erken döner. Kod ve mevcut haklar durur. Eski kurulu AAB
   kendiliğinden değişmez. Canlıda `GRIDSHARD_ADMOB_ROLLOUT_MODE=disabled`,
   `GRIDSHARD_ADMOB_TEST_PLAYER_IDS` boş ve ödeme/reklam test bayrakları kapalı
   olmalı. Eski uygulamaların ödeme arayüzü bu istemci yamasıyla uzaktan
   gizlenmiş sayılmaz; eski alımların kurtarma/iade doğrulamasını koru.
8. Android üretim ayarını package.json ile aynı **2.4.0 / code15** adayına
   getir; Play Console’da code15 daha önce kullanılmışsa canonical kodu
   kullanılmamış daha yüksek değere birlikte yükselt. Mevcut yükleme anahtarı
   ve bu bilgisayardaki kayıtlı imzalama yöntemiyle son kaynaktan
   `tools/build-android-production.ps1` çalıştır. Yeni anahtar üretme.
   Önceki debug APK son imzalı AAB değildir. Paket/audit çıktısını kontrol et.
9. Fiziksel Android’de açılış, hesap, TR/EN mağaza, ücretli alanların
   gizlenmesi, savaş sonu Devam, ses ve kasa açılışını doğrula. Bekleyen cihaz
   ve dinleme kabulü yerel tarayıcı kanıtıyla kapatılmaz.
10. Sunucu sağlık/runtime sürümü, eski 2.3.0 istemci uyumu, veri/hak teslimi
    ve yeni turnuva rehberini kontrol et. AAB’yi mağaza sürecine gönderip
    durumunu kaydet; bütün oyunculara 00.00’da ulaşmış sayma. Bakım sonucu ve
    kalan adımları checkpoint’e yaz. Yeni veri yazıldıktan sonra eski veritabanı
    yedeğini canlı üstüne dökerek geri dönüş yapma.

## Yerel doğrulama ve tekrar üretim

Bağlı kaynaklar: [takvim](release_calendar_v1.json),
[backlog](gridshard_development_backlog_v1.json),
[2.4.0 briefi](releases/2.4.0.md), [checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md).
Yalnız açık `expedited_patch` kararı olan yayında aynı gün son kabul/yayın
planlanabilir; normal sürümlerin tarih sırası kuralı korunur.

```text
python tools/release_calendar.py --check
python tools/development_checklist.py --check
python tools/release_delivery_plan.py --check
python tools/report_economy_baseline.py --check
python tools/release_announcements.py --check --require 2.4.0
python tools/prepare_legacy_announcement.py --output qa_reports/early-patch-20261113-overlay
python tools/verify_legacy_announcement.py --browser --output qa_reports/early-patch-20261113-proof
```

Son iki komut, orijinal 2.3.0 üzerinde yerel uyum ispatı üretir; ilk kurulum
overlay’i canlıya doğrudan uygulanacak paket değildir. `qa_reports/` Git ile
taşınmaz; evde yeniden üretilebilir. 5 Kasım dağıtım kaydı tarihsel kanıttır;
13 Kasım canlı işlemi henüz yapılmadı.

13 Kasım yerel kabul: 40 ilgili Python testi ve bağlı plan/duyuru/ekonomi/
release_guard kontrolleri PASS. Üç tarayıcıda 12 duyuru akışı PASS; eski
değiştirilmemiş 2.3.0 API/istemci web+native-origin ve gerçek Ayarlar dil
seçicisiyle TR/EN × 320/393 dört görsel PASS. Kanıt
`qa_reports/early-patch-20261113-reviewed-proof/proof.json` ve
`.audit-runtime/early-patch-announcement-browser.log`; fiziksel cihaz değildir.
