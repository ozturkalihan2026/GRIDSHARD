# Modül yeteneklerinin geri dönüşü — 30 Ekim 2026

Kullanıcı kararı: “modüllerin yetenek özelliğini aynı maliyetlerle fakat mevcut özelliklerine göre yeniden getirelim.” Uygulama ana oyunun 24 kartı içindir.

## Uygulanan davranış

- Dört eşik ve her eşikte iki dal geri geldi. Eski seviye eşikleri, enderlik bazlı Devre Kredisi/Akı tutarları ve seçilmiş eşik başına 25 Akı sıfırlama bedeli aynen korundu. Fiyatlar eski bağımsız `level_costs_seviye_20261025.json` belgesine karşı denetlendi.
- 24 kartın her biri için mevcut işine bağlı iki imza uzmanlığı tanımlandı. Temel: iş gücü +%3 / CAN +%5. İnce ayar: çevrim −%4 veya pasif iş gücü +%4 / CAN +%5. Ustalık: iş gücü +%6 / CAN +%8. Ayrıntı ve 48 imza dalı `YETENEK_KANONU.md` dosyasında.
- Enerji verimi gibi boşa çıkan dalların yerine işlevli seçimler kondu. Yeni saldırı, hedef sırası veya yerleşim kuralı eklenmedi; tek savaş ekonomisi Akım olmaya devam ediyor. Çekirdek dalları açılmadı.
- Koleksiyon önizlemesi ve gerçek savaş aynı hesaplanmış değerleri kullanıyor. Yalnız arayüz sayısı değişmiyor: blok, onarım, hasar, kalkan, faz, kesinti, yavaşlık ve dolum gerçek aksiyonlarda uygulanıyor. Güçlendirme yüzdesi ve faz göstergesi gerçek yetenek değerini kullanıyor.
- 100 ms motor adımında 960 ms çevrimin sürekli 1000 ms'ye yuvarlanarak yeteneği etkisiz bırakması düzeltildi. Artan zaman farkı sonraki çevrime taşınır; hazırlıklı silahlar da kapsanır. Seri Top üç mermi atmaya devam eder; 150 ms seri aralığı motorda 0/200/300 ms isabet verir, temel dal 0/200/400 ms'dir.
- Geçerli eski ücretli seçimler, halen aktif kartların özel arşivinden bir kez ve ücretsiz geri bağlanır. Yeni seçimlerin üzerine yazılmaz. Sıfırlama sonrası ve kayıt yeniden yüklendiğinde tekrar bağlanmaz. Emekli 18 kartın kayıtları arşivde, parçalarının önceki 1:1 evrensel dönüşümü geçerli; eski işlem fişleri değişmez.
- Modül ayrıntısına YETENEKLER sekmesi geri geldi. Kilitli/yetersiz bütçeli dal açıklama önizlemesi para harcamaz. Bilgi açıldığında arkadaki hızlı işlem kutusu kapanır; sonraki karta dokunmayı engellemez. Mevcut font lisans gösterimi dosyalardaki metinle boşluk açısından eşitlendi.

## Doğrulama

- **323 odaklı sunucu testi geçti.** Bunun 118'i yeni yetenek testidir: 24 ağaç, 48 imza dalının canlı değerleri, bütün enderlik/eşik fiyatları, her gerekli para biriminde eksik bakiye, kilit, yinelenen satın alma/sıfırlama, kalıcı kayıt ve gerçek hasar/onarım/kesinti/seri atış/kuantum isabeti.
- **746 istemci testi ve 10 derleme testi geçti.** Eski tarihsel sunucu kümesinin tamamı bu koşuya dahil değildir; eski enerji/ısı sözleşmelerinin taşınması ayrı kalan iştir.
- **İki Chrome tarayıcı testi geçti.** Gerçek izole sunucuda 320×568 ve 393×852 ekranlarda dört enderlik, dört eşik, sekiz dal, eski maliyetler, kilitli önizlemede sıfır POST ve çekirdekte yetenek sekmesinin kapalı olması doğrulandı. Dört seçili dal/100 Akı sıfırlama görünümü ayrı bir UI verisiyle kontrol edildi; bu ekran gerçek satın alma olarak sayılmadı. Gerçek ücretlendirme ve kalıcı kayıt sunucu testlerindedir.
- **84 karşılaştırmalı AI savaşı tamamlandı; 900 saniyelik gözlem aşımı yok.** Aynı 28 deste eşleşmesi, seviye 15, yeteneksiz / her iki taraf tüm sol dallar / her iki taraf tüm sağ dallar ile çalıştı. Bu insan oyuncu kazanma oranı veya nihai rekabet dengesi kanıtı değildir.

| Seçimler | Biten savaş | En kısa / ortanca / en uzun | İlk modül kaybı ortancası |
|---|---:|---|---:|
| Yeteneksiz | 28/28 | 67,2 / 101,15 / 174,3 sn | 23,5 sn |
| Sol dallar | 28/28 | 57,6 / 85,6 / 171,1 sn | 13,65 sn |
| Sağ dallar | 28/28 | 77 / 130,3 / 241,6 sn | 25,3 sn |

Kanıtlar: `artifacts/module-talents-v3/balance.json`, `balance-summary.json`, üç ekran görüntüsü; `artifacts/talents-v3-server-tests.log` ve `talents-v3-client-tests.log`. Tekrar: `python tools/probe_module_talents_v3.py`, `python tools/document_module_talents_v3.py`; tarayıcı testi `e2e/talent-costs.spec.js`.

## Paket ve kapsam

Web paketi `dist`, özet **f7d269f404135f04**. Yerel ana QA sunucusu 8894 güncellendi; gerçek sunucu PID 27292, başlatıcı 18896 (stderr üzerinden doğrula). İzole test verileri kullanır. Üretim verisi, mağaza yayını ve telefon APK kurulumu yapılmadı. Telefon testi için istemci ve sunucuyu birlikte güncellemek gerekir.
