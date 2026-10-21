# Performans ve kaynak ömrü denetimi — 21 Ekim 2026

## Kapsam ve sonuç

Savaşta ses devam ederken görüntünün donması bildirimi üzerine istemcinin
çizim döngüsü, efekt kuyrukları, Web Audio, WebSocket ve sunucunun oturum /
telemetri yaşam döngüsü incelendi. Aşağıdaki hatalar izole testlerde önce
yeniden üretildi, sonra düzeltildi. Bu rapor gerçek cihaz FPS/heap ölçümü
veya bütün uygulamada hiçbir hata kalmadığı iddiası değildir.

| Bulgu | Düzeltme ve regresyon kanıtı |
| --- | --- |
| Efektin çizim sırasında yeni kare istemesi ikinci bir çizim zinciri başlatıyordu. | Tek kare sahibi; 90 saniyelik sanal savaşta tek bekleyen kare. Geçici çizim hatası raporlanır ama saati kalıcı durdurmaz. |
| Parçacık dışındaki efekt ve gecikmiş callback kuyrukları sınırsızdı. | Orta/yüksek kalite bütçeleri; 600 yoğun patlamada bütün kuyruklar sınırlı. Uzun duraklama sonrası eski efektler tekrar oynatılmaz; yeni efektler korunur. |
| Geç gelen darbe animasyonu silinen modüle uygulanabiliyor, eski temizleyici yeni darbeyi kaldırabiliyordu. | Oturum/nesne sahipliği ve gecikme kontrolü; reset, gizlenme, modül ölümü, çakışan darbeler test edildi. |
| Durdurulan/başlatılamayan seslerin ara gain/pan düğümleri bağlı kalıyordu. | Başarı/hata/doğal bitiş/zorla durdurmada tam bağlantı temizliği; 100 müzik geçişi ve tekrarlanan efekt döngüleri. |
| Başarısız ses indirmesi oturum boyunca önbellekte kalıyordu. | Menü, savaş ve efektler ortak yeniden denenebilir tampon yükleyici kullanır; eşzamanlı başarılı yüklemeler paylaşılır. Başarısız kısa efektler sonradan topluca çalınmak üzere tutulmaz. |
| Yenilenen WebSocket eski bağlantıyı/dinleyicileri bırakabiliyordu. | Eski taşıyıcı kapatılır, dinleyiciler sökülür. Çevrimdışı kuyruk 64; açık çıkış/URL değişimi kuyruğu temizler; başarısız gönderim sıradaki mesajı düşürmez. |
| Süresi dolan/terk edilen savaşların tanılama kayıtları sunucuda birikiyordu. | Oturum temizliğinde istatistikler de bırakılır; 200 sona ermiş + 100 terk edilmiş oturum test edildi. |
| Telemetri yeniden başlatılırken RAM sınırı kayboluyor, depodan yüklenen liste kırpılmıyordu. | Üretim lifespan sınırı korur; RAM penceresi yüklemede uygulanır, kalıcı kayıtlar silinmez. |

## Doğrulama

- Müzik entegrasyonu ve üç tur derin inceleme dahil **636 istemci testi geçti**.
- Sunucu: **1657 geçti, 44 koşullu atlandı**. Gerçek PostgreSQL/Redis gibi
  dış servis koşullarına bağlı kontroller bu yerel sonuçla doğrulanmış sayılmaz.
- Paketleme sözleşmeleri: **10 geçti**; mevcut `dist/` korunarak ayrı dizinde
  gerçek web derlemesi: `834d7821769e7308`, 619 varlık (yeni müzikler dahil).
  Konum: `artifacts/ci-fix-20261020/web-YQDdCZ/dist/`. Üçüncü tur derlemesi
  ilk denemede geçti. İkinci turdaki Windows `EPERM` olayı tekrar etmedi.
- Yardımcı araçlar: **22 geçti**; Python import taraması **415 dosya / 0 sorun**.
- Yeni müziklerin 24 WAV/OGG/AAC dosyası çevrimdışı çözüldü, süre/katman
  eşzamanlılığı/seviye kontrolleri geçti. 47 sesin mobil manifesti güncel.
- Eğitim görünürlüğü E2E testi üç tarayıcı projesinde keşfedildi; tarayıcı
  başlatılmadı ve oyun sunucusu çalıştırılmadı. Gerçek E2E sonucu CI'de bekleniyor.
- Bilinen tek test uyarısı: Starlette/httpx test istemcisi kullanımdan kalkma
  uyarısı. Bu tur bağımlılık yükseltmesi yapılmadı.

## İkinci tur — derin inceleme ve sınırlı refaktör (21 Ekim)

Kullanıcının ek derin analiz isteği üzerine aşağıdaki beş alan düzeltildi.
Geniş, davranış değiştiren bir yeniden yazım yerine kaynak sahipliği ve sıcak
yollardaki tekrarlar ortak fonksiyonlara taşındı.

| Ek bulgu | Değişiklik | Kanıt |
| --- | --- | --- |
| Her maç yayını bütün WebSocket bağlantılarını tarıyordu. | Aktif bağlantılar oturum bazlı indekslenir. Bağlama, kopma, yeniden bağlanma, sonuç kapanışı ve eski kayıt temizliği aynı indeksi yönetir. Boş kovalar silinir. | 1000 maç / 2000 soket: bütün maçlara bir tur gönderimde 2.000.000 genel liste ziyareti yerine yalnız hedef maçların toplam 2000 alıcısı. Her iki sürümde aynı 2000 teslim. 2000 biten maçtan sonra indeks boş. |
| Çevrimiçi bilgisi her istekte tüm oyuncu listesini kopyalıyor ve her kayıt için saati yeniden okuyordu. | Tek saat okuması; en fazla 10 saniyede bir yerinde temizlik. Oyuncunun gerçekten çevrimiçi olup olmadığı hâlâ her okumada kesin TTL ile belirlenir. | Aynı 2000 oyunculu örnekte saat okuması 2.003.000 → 2000; sözlük kimliği sabit. Yenileme, tam son kullanma sınırı ve boşta kalma sonrası temizlik test edildi. |
| Savaş müziğinde bir katmanın indirme/başlama hatası bütün grubu tekrar denenemeyen veya yarım çalan durumda bırakabiliyordu. | Grup başlatma isteği paylaşılır. Hata tüm başlamış katmanları durdurur. Sonraki kullanıcı etkileşiminde grup ortak saatte tekrar başlar. Eski sahnenin geç hatası yeni sahneyi etkilemez. | Üç yeni test eski kodda başarısız oldu; düzeltme sonrası geçti. Hatalı dosya tek başına tekrar indirilir; yedi katman aynı anda başlar. İndirme sırasında çıkış testi de geçti. |
| GPU shader/link/upload/draw hatalarında program veya tamponlar bırakılabiliyor, çizim hatası yeniden denenebiliyordu. | Grafik kaynakları tek temizleyicide bırakılır. Başarısız çizim 2D yedeğe geçer; hata `lastError` içinde korunur. Kaybolan grafik bağlamı geri gelene kadar yeniden kurulmaz. | Eski kodda kaynak ve bağlam kaybı testleri başarısızdı. Altı hata yolunun her birinde elde tutulan shader/program/buffer sayısı sıfır. 100 karelik tekrar bağlam oluşturmaz; geri yükleme yeniden çalışır. |
| 5 saniyelik sosyal yenileme, 12 saniye sürebilen isteklerin üstüne yeni istek açıyor; sohbet yanıtlarını gelmeden geçersizleştirebiliyordu. | Tek tamamlanmamış arka plan yenileme grubu. Sohbet, mesaj kutusu ve arkadaş okumaları birbirine paralel kalır; grup tamamlanmadan yeni tur açılmaz. | 100 yeniden tetiklemede yalnız 3 başlangıç isteği. Bir isteğin hatası kilidi kalıcı bırakmaz. Gizli ekran, savaş ekranı, tek zamanlayıcı ve normal 20 saniyelik kutu sıklığı korundu. |

İş sayısı karşılaştırması `HEAD` ve çalışma kopyasının gerçek Python sınıflarıyla,
ağ/sunucu açılmadan yapıldı: `artifacts/ci-fix-20261020/measure-runtime-work.py`.
Bu rakamlar FPS veya gerçek eşzamanlı kullanıcı kapasitesi ölçümü değildir.
Grafik/ses kaynak sayımları kontrollü nesnelerle yapıldı; gerçek cihaz GPU/heap
profili ve gerçek servis yük testi ayrıca gereklidir.

Yeni testler: `test_connection_index.py`, `test_presence_retention.py`,
`social-poll-lifecycle.test.js`; ses ve 3D testlerine ek yaşam döngüsü senaryoları.
Bağlantı kaydını sıfırlayan dört test fixture'ı ortak `registry.clear()` kullanır.
Hiçbir test devre dışı bırakılmadı; ödeme, iade, ödül veya savaş hesabı değişmedi.

## Üçüncü tur — çevrimdışı kuyruk ve sıcak savaş yolları (21 Ekim)

| Bulgu | Düzeltme | Kanıt |
| --- | --- | --- |
| İstemci tanılama kuyruğu çevrimdışıyken sınırsızdı; her yeni olay yeniden deneme gecikmesini atlayabiliyordu. | Varsayılan 256 bekleyen tanılama olayı sınırı, fazla olay için açık ret/düşürme sayacı; mevcut olay kimlikleri korunur. Yeni olay bekleme süresini atlamaz. | 1001 olaylık bağlantı kesintisi testinde 16'lık özel sınır aşılmaz, ilk bekleme süresinde yalnız 1 istek; sonraki hata 2 saniyelik geri çekilmeye geçer. |
| Gönderim sırasında gelen olaylar sıradaki kullanıcı eylemine kadar kuyrukta kalıyor; takılan HTTP isteği göndericiyi kilitleyebiliyordu. | Sonraki olaylar ayrı zamanlayıcı turunda boşaltılır. Varsayılan HTTP gönderimine 10 saniye iptal süresi; yanıt gövdesi de süreye dahildir. Başarı/hata sonunda süre temizlenir. | İlk dört regresyon eski kodda başarısızdı, yeni kodda geçti. Ek test başarı, kalıcı ret ve yanıt gövdesi hatasında süre temizliğini doğrular. |
| Savaş kimlik çizimi yalnız isim okumak için bütün profil/kozmetik/ödül listelerini kopyalıyordu; kare örneklemesi ayar modeli oluşturuyordu. | Profil adı ve analitik izni için güncel durumu doğrudan okuyan salt-okunur erişimler. Normal ekran modelleri korunur; değişebilir model önbelleği eklenmedi. | 10.000 kimlik çiziminde sıfır profil modeli kopyası; DOM yalnız isim değişince yazılır. Ayar izni hâlâ yalnız gerçek `true` ile açılır. |
| Sabotaj kontrolü yüz binlerce kez geçici generator oluşturuyordu. | Boş debuff sözlüğünde hızlı çıkış, diğerlerinde mevcut anahtarlarla `isdisjoint`; tick içi değişebilir durum önbelleğe alınmaz. | 32 anahtar alt kümesi ve ekle/sil mutasyonları referansla aynı. 16 deste eşleşmesinde en fazla 1800 tick için tam durum, olay günlüğü ve varsa bitiş sonucu eski kodla aynı. |

Son profil komutu: `python tools/battle_profile.py --ticks 600 --transport-ticks 20`.
16 sıralı eşleşme / 8208 tick örneğinde profil aracı dahil ortalama 0,388 ms,
p95 0,708 ms; 1648 snapshot + JSON örneğinde ortalama 0,135 ms gözlendi.
Ön profilde sabotaj kontrolü 461.064 kez çağrılmıştı; bu kontrol artık generator
oluşturmuyor. Tek koşunun süreleri gerçek cihaz FPS'i, canlı kapasite veya
garantili yüzde hızlanma olarak yorumlanmamalı; eşzamanlı sistem yükü etkileyebilir.

Yeni testler: `telemetry-retention.test.js` (5), `battle-hot-state.test.js` (2),
`test_operational_predicate_equivalence.py` (48). Kare döngüsü fixture'ı model
kopyası yapılırsa hata verecek şekilde güçlendirildi. Tanılama kuyruğu ödeme,
iade veya kalıcı ödül kuyruğu değildir; bu kayıtlar silinmez/değiştirilmez.

## Korunanlar ve yayın öncesi kalanlar

Onaylı sanat, savaş kuralları, ödeme/iade politikası ve oyuncu verileri
değiştirilmedi. Commit/push kullanıcıda; canlı sunucu, site veya Play Console
değiştirilmedi. Yeni AAB üretilmedi.

Kullanıcı denemesi: uzun savaşta akıcılık, en az 10 savaş/menü geçişi, uygulamayı
arka plana alıp geri dönme, ağ kesilip geri gelmesi, eğitim hedefinin görünmesi
ve seslerin çift başlamaması. Push sonrası gerçek servis/E2E CI sonuçları yeşil
olduktan sonra sürüm/AAB ve sunucu geçişi ele alınmalı.
