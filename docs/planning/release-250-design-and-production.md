# 2.5.0 — tasarım, üretim ve ücretsiz ilerleme planı

16 Kasım 2026 kullanıcı yönlendirmesi: gerçek para girişleri gizli, oyun
ücretsiz. Akı ve Devre Kredisi kazanımı bu sürümün zorunlu ekonomi işidir.
Bu belge uygulama planıdır. Aşağıdaki miktarlar ECON-02'nin yerel, sürüm ve
dönem kapılı uygulama adayına bağlandı; canlı ödül/fiyat veya oyuncuya verilmiş
kazanım sözü değildir. [Uygulama kabulü](free-economy-250-acceptance.md).

[Sürüm briefi](releases/2.5.0.md) · [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md)
· [Takvim](release_calendar_v1.json) · [Ekonomi karşılaştırması](free-economy-250-report.md)
· [Aday veri](free-economy-250-v1.json).

## 1. Oyuncuya gelecek paket

| İş | Tasarım | Üretilecek teslim / kabul |
| --- | --- | --- |
| Akı ve kredi dengesi | Mevcut günlük/sezonluk emir, giriş, ücretsiz sezon yolu ve maç sonucu miktarları birlikte artırılır | ECON-01 hesabı → ECON-02 beş kaynakta sürümlü ödül/makbuz; XP ve eski S1 değişmez |
| Mühendis seçim kasası | Saldırı/savunma/taktik için hak anında sabitlenen üç parça paketi | REWARD-01 → DATA-01 → REWARD-02/03; cihaz/istek değişince seçenek yenilenmez, yalnız biri teslim edilir |
| Ücretsiz mağaza | Mevcut oyun paralarıyla bir garantili modül-parçası teklifi; miktar, limit ve süre açık | SHOP-01/02/03; cüzdan+limit+envanter aynı işlemde; gerçek para veya yeni para birimi yok |
| Geri Tepme Topu | **Saldırı**: kendi güçlü doğrudan atışı karşılığında kendi CAN'ından geri tepme bedeli | CARD-01/BALANCE-01; motor, karşı oyun, arena 3, ücretsiz edinim, özgün kart/VFX/ses/TR-EN |
| S2 ödül sanatı | Manyetik Köprü, Bakır Örgü, Kırık Halka | COS-05: üç ayrı çerçeve + üç ayrı profil zemini; sezon yolu/sıralama/son haftaya tekil tahsis |
| Mağaza sanatı | Tersane Kilidi/Güvertesi, Atölye Rafı/Bölmesi | COS-03: dört ayrı öğe; sezonun altı öğesiyle stok veya tasarım kimliği paylaşmaz |
| Müzik | Menü: Devrenin Ufku. Savaş: Akımın Nabzı | AUDIO-03: önce iki kısa A/B eskizi, sonra özgün loop/katman, mobil codec ve yoğun savaş kabulü |
| Arayüz | Mağaza bölümleri, açık fiyat ve kaynak etiketi; seçim/onay/sonuç; görev ilerlemesi | UI-01/02/03/04, QA-01: 320/393 TR/EN, boş/hata/offline/limit/tekrar/odak ve 44 px hedef |
| Paket temizliği | Reklam/ödeme kaynakları ve eski haklar korunur; SDK/izinler 2.5 AAB’ye girmez | POLICY-01: altyapı kısmen hazır, son imzalı AAB ve gerçek cihaz kabulü henüz açık |

Tasarımlar mevcut boyalı/hacimli metal ailesini, geniş pahları, lacivert
yüzeyi, altın ana eylemi ve turkuaz vurguyu sürdürür. Yeni ekranlar ayrı bir
neon HUD ailesine dönüşmez. İkonların yalnız rengini değiştirmek yeni sanat
sayılmaz. Profil zeminleri çerçevenin büyütülmüş kopyası değildir.

İlk görsel örnek **Manyetik Köprü çerçevesi + zemini**. Önce onaylı profil/
dock yanında okunurluk ve siluet incelenir; sonra Bakır Örgü/Kırık Halka,
ayrı grupta mağaza dört öğesi üretilir. Bu kozmetikler ve besteler henüz üretilmedi.
Mühendis Kasası için özgün kapalı/açık çanta görselleri ve UI-03 seçimi/açılışı
[yerel kabul kaydında](engineer-case-ui-250-acceptance.md) hazırdır.
Bağlı üretim briefleri: [altı sezon öğesi](art-2.5.0-acceptance.md),
[dört mağaza öğesi](shop-art-manifest.md), [saldırı modülü](recoil-cannon-release.md),
[müzik](prerelease-announcements-and-music.md), [üretim takvimi](two-cycle-production-calendar.md).

## 2. Ekonomi sorunu ve korunacak sınırlar

Mevcut altı günlük emir toplam **75 Akı**, doğrudan **0 kredi** verir.
Normal savaş doğrudan kredi verir; doğrudan Akı vermez. Sandık, giriş ve
sezon yolu kalan kaynaklardır. Günlük tüm emirleri bitirmek, yüksek seviye
yetenekler ve yükseltmelerle aynı bütçeyi paylaşır. Örneğin efsanevi bir
modülün dört yeteneği toplam **10.000 Akı + 100.000 kredi** ister; 14→15
yükseltmesi ayrıca **10.000 Akı + 80.000 kredi ve modül parçası** ister.

İlk hesap 9 profil × 1/7/28 gün = 27 mevcut/adaya eşlenik senaryo içerir.
Mevcut +4/+6 savaş ve sezonluk emir XP’si hesaba katılır; eski altı emirli
BASE-01 tablosuyla karıştırılmaz. Zafer/hediye sandığı parası beklenen
değerdir. Görevlerin gerçekten tamamlandığı ve hakların alındığı varsayılır;
bu rapor canlı oyuncu davranışı veya garanti bakiye değildir.

Korunacak kararlar:

- Bütün temel ilerleme yolları ücretsiz ve reklamsız değerlendirilecek.
  Sıralama ödülü, premium veya reklam, temel gelir açığının çözümü sayılmayacak.
- Giriş ödülü büyür; oyuncu yalnız giriş yaparak bu payı alabilir. Emir,
  maç ve sezon yolu gelirini almak için gerçek oyun gerekir. İlk altı maçın
  Akı payı sınırlıdır; eski ayrı günlük/haftalık destek bunun üstüne eklenmez.
- 12.240 sezon XP eşiği ve mevcut emir XP’leri değişmez. Bu ek destek XP
  vermez; sekiz savaş senaryosu sezonu bitirebilirken altı savaş senaryosu
  aynı varsayımlarla henüz 39. kademededir. XP otomatik tamamlanmaya çevrilmez.
- Kullanıcının mevcut yükseltme maliyet tabloları ilk analizde korunur.
  Gelir desteğine rağmen yüksek seviye yükü ayrıca ölçülür; son ayar kararı
  parçalar, altılı deste, çekirdek, yetenek ve mağaza harcaması birlikte ele alınır.
- Premium hakkı daha önce kazanılmış/satın alınmış oyuncunun hakları korunur.
  Yeni S2 bütçesi yeni premium alımı varsaymaz; eski premium hattı sessizce
  herkese dağıtılmaz veya mevcut sahibinden kaldırılmaz.

## 3. Güncellenmiş denge adayı — mevcut beş kaynak

Kullanıcının ek yönlendirmesiyle ayrı günlük/haftalık destek yerine mevcut
ekranların ödülleri büyütülür. Önceki destek bu adayla üst üste verilmez.
Rakamlar toplam bütçede incelenen **denge adayıdır**, nihai runtime tutarı değildir.

| Kaynak | Mevcut | Yeni aday |
| --- | --- | --- |
| Altı temel günlük emir | Toplam75 Akı,0 kredi | Toplam105 Akı+120 kredi; mevcut XP aynı |
| Mevcut4/6 savaş günlük emirleri | Her biri15 XP, para yok | Her birine5 Akı+30 kredi ek; sekiz emrin tamamında115 Akı+180 kredi/gün |
| On iki sezonluk emir | Toplam1800 XP, para yok | XP aynı; hepsi tamamlanırsa ayrıca600 Akı+3000 kredi |
| Günlük giriş takvimi | 28 gün toplam134 Akı+2678 kredi | Akı3, kredi2 katı:402 Akı+5356 kredi; kaçırılan gün sonradan verilmez |
| Ücretsiz sezon yolu | 40 kademede419 Akı+5680 kredi | Para2 katı:838 Akı+11360 kredi; XP, parça ve kozmetik aynı |
| Uygun maç sonucu | Temel kredi; doğrudan Akı yok | Temel kredi1,5 katı; ilk6 uygun maçta2 Akı/maç; XP/kupa/sandık olasılığı aynı |

Altı temel emrin tekil aday miktarları ve on iki sezonluk emrin dağılımı
[JSON kaynağında](free-economy-250-v1.json) açıktır. Her oyuncu yalnız
gerçekten tamamladığı emri veya kazandığı kademeyi alır. Kredi artışı
galibiyet ve mağlubiyete uygulanır; temel ilerleme zafer/sıralama şartına bağlanmaz.

- Maç artışı: sunucuda kesinleşmiş ranked_pvp/arena_ai ve gerçek oyuncu;
  pes etme, arkadaş/antrenman, derecesiz AI, operatör, bot ve tekrar battle_id
  yeni maç artışından dışlanır. Eski temel emir uygunluğu korunur.
- Örnek Arena1: kredi yuvarlamasıyla zafer35→52, mağlubiyet12→18. İlk6
  uygun maçın her birinde2 Akı; daha fazla maç normal kredi artışını alır,
  günlük doğrudan maç Akısı12'yi geçmez. Reklam adımı veya reklam XP'si yoktur.
- Giriş/sezon yolu/sezonluk emir artışı **yeni onaylı sezon revisionında**
  başlar. Yayımlanmış S1 kataloğu, eski para miktarı ve doğmuş haklar değiştirilmez.
  Günlük temel emir/maç artışı yeni ödül revisionından sonraki kazanımlara
  uygulanır; eski makbuzlar yeniden hesaplanmaz.
- Sezon arasında temel günlük emir ve uygun maç artışları sürer; kapalı
  sezonun giriş, yol veya sezonluk emrini verme. Sezon açılış/takvim kuralı değişmez.
- Günlük hak oyuncu+UTC gün+emir; sezonluk hak oyuncu+sezon+emir; giriş
  oyuncu+dönem+gün; yol oyuncu+sezon+kademe; maç oyuncu+battle_id ile tekildir.
  Miktar/revision/hash hak anında sabitlenir; istek tekrarı, paralel işlem,
  cihaz değiştirme, UTC devir, kapanış ve restore çift teslim üretmez.
- UI mevcut günlük/sezonluk emir, giriş, sezon yolu ve maç sonucu ekranında
  Akı/krediyi birlikte gösterir; sıfırlama/kapalı sezon/alındı durumu açık olur.
- Geriye dönük toplu telafi, kredi↔Akı dönüşümü ve Akı'dan Akı üreten alım
  döngüsü eklenmez. Yeni alım geliri bu tablolara yazılmaz.

İlk karşılaştırma (28 gün, Arena 1, günde iki hediye, altı emrin tamamı):

| Tempo | Mevcut Akı / kredi | Aday Akı / kredi |
| --- | ---: | ---: |
| 4 savaş, 2 zafer | 2.916 / 18.296 | 5.179 / 33.072 |
| 6 savaş, 3 zafer | 3.091 / 23.290 | 5.769 / 40.970 |

Bu artış son seviyeyi hemen açmaz. İlk yetenek, daha düşük seviyeli altılı
deste ve pahalı sandık alımı arasında kalan gerçek tercih
[harcama karşılaştırmasında](free-economy-250-report.md) ayrıca görünür.
Fiyatları veya kazanımları kesinleştirmeden önce yeni modülün ücretsiz
edinim süresi ve parça darboğazı incelenir. Bu hesap artık
[birlikte harcama raporunda](free-economy-250-progression-report.md) yer alır:
gerçek sandık çözümleyicisi, hedefe bağlı parça/çekirdek stokları, aynı cüzdanla
altılı deste/çekirdek/ilk yetenekler ve ayrı teklif/seçim adayları karşılaştırılır.
ECON-01 model hazırlığı dalda hazırdır; gerçek kazanım/API ve son savaş dengesi
ECON-02/REWARD-02/SHOP-01/BALANCE-01 kabulünde tamamlanır.

## 4. Üretim sırası ve takvim

Paket hazırlık hedefi **21 Aralık**, kapsam kapanışı **14 Aralık**, cihaz kabulü
başlangıcı **17 Aralık**. S2 **28 Aralık koşullu hedeftir**, ayrı onay ister.
S1 **24 Kasım–22 Aralık 03.00 TR** otomasyonu ve yayımlanmış kataloglar korunur.

16 Kasım son kullanıcı kararı: **canlı sunucu geçişi S1 kapanışı ve ödül
teslimi doğrulandıktan sonra** yapılır. 22 Aralık 03.00 TR öncesinde geçiş
yoktur; kesin bakım saati henüz belirlenmedi. 21 Aralık paket hazırlığı canlı
geçiş tarihi değildir. S2 açılışı ayrıca onaylanır.

| Pencere | Üretim sırası | Çıkış |
| --- | --- | --- |
| 16–23 Kasım hazırlık | ECON-01 ilk hesap, ücretsiz ilerleme kararları; Manyetik Köprü ilk örneğinin hazırlığı | Bu analiz ve aday kaynaklar; canlı dağıtım veya tamamlanmış sanat sayılmaz |
| 24–30 Kasım | Ekonomi hedefleri + REWARD-01/DATA-01; BASE-02/03 ve UI-01; müzik eskiz hazırlığı | Kaynak/harcama kararı, sabit hak modeli, ekran durumları; 30 Kasım kapasite değerlendirmesi |
| 1–7 Aralık | ECON-02 beş kaynak artışı; seçim/mağaza atomik işlemleri; Geri Tepme Topu motor prototipi; ayrı6+4 sanat grubu | Gerçek yerel API ile tek teslim; saldırı modülü/karşı oyun; ayrı görsel kabul grupları ve müzik A/B |
| 8–14 Aralık | Mağaza/seçim ekranları, genel S2 kaynak haftaları, sanat/ses entegrasyonu ve denge | TR/EN kabulü, satın alma gerektirmeyen kazanım, kaynak/harcama revizyonu; kapsam kapanışı |
| 15–21 Aralık | Regresyon, restore/hak koruma, SDK’sız imzalı AAB, fiziksel cihaz | Kaynak/kasa teslimi, giriş/bildirim/Play Games ve yayın kabul kaydı |

Tek ana geliştirme akışı; bunlar eşzamanlı tam ekip taahhüdü değildir. Ek
ekonomi işinin kapasite etkisi 30 Kasım kontrolünde ölçülür. Yeni iş, eski
sanat/ses/cihaz kapılarını tamamlanmış saydırmaz veya tarihi kendiliğinden kaydırmaz.

## 5. Bu çalışma diliminin durumu

- [x] Mevcut kaynak ve maliyetler koddan okundu; ücretsiz/adayı karşılaştıran araç yazıldı.
- [x] Kazanmasız ilerleme, sınırlı tavan, kaçırılan gün, sezon arası ve aynı XP senaryoları hesaplandı.
- [x] Beş kaynak artışı ECON-02 ve saldırı modülü CARD-01 ile sürüm/checklist/iş sırasına bağlandı.
- [ ] Altılı gerçek deste + parça/çekirdek + yeni modül edinim süresi ve son miktar/fiyat kararı.
- [ ] ECON-02 çalışma API’si, kalıcılık/restore/çift talep ve arayüz kabulü.
- [ ] Sanat, modül, müzik ve final AAB/cihaz üretimi.

Bu belgede işaretli analiz maddeleri canlı özellik veya nihai denge kabulü değildir.
