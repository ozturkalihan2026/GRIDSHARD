# Teknik denetim — doğrulanmış uygulama planı

Tarih: 14 Ekim 2026. İncelenen kaynak sürümü: `7f82db77fcc7a974ba60508d7a3c9536335f95f1` (`main`).
Durum: **Yerel kod uygulaması ve otomatik doğrulama hazır; native/gerçek cihaz/canlı altyapı kapıları açık.** Kullanıcının sonraki uygulama ve yalıtılmış başsız test yetkisiyle aşağıdaki işler uygulandı. Ayrıntı ve ham ölçümler: [uygulama sonuçları](TEKNIK_DENETIM_UYGULAMA_SONUCLARI_20261014.md). Tam plan veya yayın kapıları bitmiş sayılmaz.

## 1. Kapsam, sorumluluk ve kanıt sınırı

Kullanıcı, dış teknik denetim raporunu değerlendirmemizi, kartları yerinde güncelleme işini kapsama almamızı ve teknik plan hazırlamamızı istedi. Rapordaki komutlar, önerilen öncelikler ve yayın takvimi kendi başlarına uygulama/yayın yetkisi değildir.

- Kaynak rapor: `C:/Users/SERVER/Downloads/gridshard_teknik_denetim_raporu.md` (568 satır, tamamı okundu).
- Kaynak SHA-256: `C08781D2096893C40A2D4ED91A771D9AE60E3A5E71B23D723B9F1DA363F917D3`.
- Depodaki önceki kanıtlar: `docs/DENETIM_20261014.md`, `docs/PERFORMANCE_BUDGET.md` ve mevcut testler.
- Dış rapor güncel commit kimliği ve yeniden çalıştırılabilir ham profil kanıtı vermiyor. Satır numaraları ve bazı kod örnekleri mevcut kaynakla uyuşmuyor. Rapor, doğrulanacak bulgu listesi olarak kullanılır; tüm sonuçları kabul edilmiş sayılmaz.
- Evdeki 174 saniyelik savaş ölçümleri önceki denetimden aktarılmış kanıttır. Ham `artifacts/denetim-20261013/` kaydı bu iş bilgisayarında yok; bu tur yeni FPS/CPU, Android WebView veya bellek ölçümü yapılmadı.
- Teknik takip bu belgede yürütülür: her iş için bulgu → yeniden üretim/test → dar düzeltme → regresyon → ölçüm → kapanış kanıtı. Test olmadan “çözüldü”, profil olmadan performans yüzdesi yazılmaz.
- Mevcut yeni görsel dil, kazanılmış haklar, satın alma/iade kayıtları, hesap kimlikleri, sunucu otoritesi ve oyun dengesi korunur. Faz 4 kozmetikleri bu denetim paketinin önkoşulu değildir.
- Kod uygulaması, bağımlılık indirme, commit/push, AAB üretimi, sunucu/site/Play yayını ve AWS/Cloud ayarı bu plan hazırlama turunda yapılmadı. Canlıya geçiş ayrı karar ve doğrulama gerektirir.

## 2. “Kartları yerinde güncellemek” raporda var mı? — başlangıç tespiti

Yeni rapor bu işi bağımsız, tamamlanmış bir çözüm olarak tarif etmiyor. Ancak üç ilgili bulgu içeriyor:

1. `JSON.stringify` tabanlı hücre/modül imzalarının maliyeti.
2. `createModuleCard()` içinde oluşturulup aktif karta hiç eklenmeyen istatistik/metin düğümleri.
3. Oyuncu ve rakip tahtasının iki ayrı çizim yolu olması.

Önceki depo denetimi ise açıkça **“Kart, CAN değişince baştan kuruluyor; yerinde güncelleme ayrı bir iştir”** diyor (`docs/DENETIM_20261014.md:142`). Güncel kod da bunu doğruluyor:

- `client/src/app.js:17034`: modül imzasında CAN, ısı, enerji, durum ve rozetler var.
- `client/src/battle/board-view.js:71`: imza değişince hücre temizleniyor; `:75` yeni kart oluşturuyor, `:82` eski içeriği siliyor.
- `client/src/app.js:17100`: rakip hücresinde aynı temizle/yeniden oluştur davranışı var.
- `client/src/app.js:19925`: oyuncu tahtası bu modül imzasını kullanıyor.

Dolayısıyla başlangıç çözümü **değişmeyen hücreyi koruyor**, fakat **değişen kartı yerinde güncellemiyordu**. Bu plan buna ayrıca `K1` işi açtı. K1 artık yerel kaynakta uygulandı ve gerçek DOM ile doğrulandı; Canvas'a geçilmedi.

## 3. Başlangıç bulgu kabulü ve öncelik düzeltmeleri

“Doğrulandı” kaynak kodu/yerel tanıyla doğrulandı demektir; gerçek cihazda etkisi ölçüldü demek değildir. Öncelikler: P0 güvenlik/yayın engeli, P1 doğruluk veya temel akıcılık, P2 ölçümle seçilecek iyileştirme, P3 uzun vadeli bakım/görsel içerik.

| Kimlik | Bulgu | Uygulama öncesi değerlendirme | Karar / kapanış ölçütü |
| --- | --- | --- | --- |
| G1 | Capacitor 8.5.0 güvenlik duyurusu (önceki denetimden) | Paket hâlâ 8.5.0; resmî duyuruda Android/iOS etkileniyor, 8.5.1 yamalı. | P0 yayın kapısı. Uyumlu yama, kilit dosyası/native eşleştirme ve gerçek PGS/Billing testi; yalnız web güncellemesiyle kapanmaz. |
| G2 | `showChestFailure` HTML enjeksiyonu | Rapordaki açık kod artık yok; `app.js:3796` hata metnini `textContent` ile oluşturuyor. | Bu sink için kaynakta düzeltilmiş. Regresyon testine alınır; tüm `innerHTML` kullanımları güvenlidir sonucu çıkarılmaz. |
| G3 | Diğer dinamik `innerHTML` kullanımları | Raporun satırları kaymış; her değer için güven sınırı/escape ayrı incelenmeli. | P1 veri akışı denetimi. Kullanıcı/ağ metnini HTML olarak yorumlamayan testler; sabit SVG şablonlarını körlemesine kaldırma yok. |
| G4 | Cloudflare istemci adresi/origin güveni | Önceki açık operasyonel kontrol; bu tur canlı AWS/origin kuralı okunmadı. | Yayın öncesi doğrulama. Başlığa güven yalnız doğrulanmış proxy erişim zinciriyle; güvenlik grubu otomatik değiştirilmez. |
| T1 | 14 kırık Python içe aktarımı | Yerel statik araç 404 dosyada 14 uyarı üretti. 12 eski modül/sembol referansı gerçek; `main.__name__` ve `matchmaking.__file__` iki yanlış pozitif. | P1 araç/legacy paketi. Denetleyici normal modül alanlarını tanır, gerçek kalanlar güncel kurala uyarlanır veya tarihsel araç olarak açıkça ayrılır; aktif kapsamda 0 gerçek hata. |
| T2 | Bu importların sunucu açılışını kesin çökertmesi | Ana API'de bu üç `balance_*` modülünü yükleyen bir referans bu taramada bulunmadı; paket içinde bulunması tek başına startup hatası kanıtı değil. | Üretim başlangıç smoke testiyle doğrula. Yönetim aracı kullanılıyorsa öncelik yükselir; P0 etiketi otomatik kabul edilmez. |
| T3 | Anka iç alev SVG'si sentaktik bozuk | Yanlış pozitif. `4.500` geçerli 4.5 sayısı; sonraki `c` bölümünde 18 sayı, yani üç tam Bézier grubu var. Tekrar eden komut harfi zorunlu değil. | Rapor önerisiyle şekil değiştirme yok. Görsel şekil beğenisi ayrı test/karar; SVG hatası diye P0 iş açılmaz. |
| L1 | Yerel AI kurulum hatasında sahipsiz oturum | `create_local_ai_session` catch bloğunda runner/oturum temizliği yok. | P1, ilk doğruluk paketi. `join/setup/progression/start` hata enjeksiyonundan sonra canlı oturum/task sayısı başlangıca dönmeli. |
| L2 | Yerel AI'dan çıkış/reset sonrası eski savaşın sürmesi | Reset oturum kimliğini sıfırlıyor; ancak mevcut teslim ol düğmesi zaten `forfeit_battle` gönderiyor. Tüm çıkışlar aynı değildir. | P1 çıkış matrisi. Normal teslim ol, maç sonu, tekrar başlatma, bağlantı kaybı ve uygulama arka planı ayrı ele alınır. Arka plana geçiş yanlışlıkla teslim olma sayılmaz. |
| L3 | Yerel AI snapshot'ında imha edilmiş modülün geri gelmesi | Çevrimiçi uygulama `destroyedAfterSnapshot` kullanıyor; yerel oyuncu uygulama yolunda aynı koruma yok. | P1 yeniden üretim ve ortak doğruluk sözleşmesi. Eski snapshot+imha olayı/Anka canlanması/reconnect senaryoları ayrılır; meşru canlanma engellenmez. |
| L4 | Zamanlayıcıların hesap değişiminde sızması | Zamanlayıcılar mevcut; bazıları tekil ve uygulama ömrüne ait, güncel hesap kurtarma akışı reload yapıyor. Sızıntı miktarı gösterilmemiş. | P2 yaşam döngüsü testi. Tekrarlı aç/kapat/hesap kurtarmada callback ve istek sayısı artıyorsa düzelt; her interval'i savaş sonunda kapatma yok. |
| K1 | CAN/ısı değişiminde kartın yeniden kurulması | Oyuncu ve rakip yolunda doğrulandı. | P1 ana performans paketi. Kalıcı kart/SVG/efekt düğümü kimliği ve güncel olay işleyicileri korunmalı. Tasarım aşağıda. |
| K2 | Aktif kart için kullanılmayan stats/meta üretimi | `createModuleCard` bu düğümleri oluşturuyor, aktif karta eklemiyor. | K1 ile kaldırılır/oluşturma ihtiyaca taşınır. Yedek kart ve erişilebilir açıklamalar korunur. |
| K3 | Çekirdek dolum/ hazır seçicisi | `getElementById("core-1")` mevcut; kart `data-module-id` kullanıyor. | P1, K1 kapsamı. Doğru kart seçicisi ve yeni kart oluşturulunca hazır/dolum durumunun yeniden uygulanması birlikte test edilir. |
| K4 | Rakip enkazında yeniden sorgu ve çeviri eksikliği | Mevcut çizim `appendCellDebris(enemyBoard,[debris])` ile hücreyi yeniden arıyor. | K1 ortak hücre yaşam döngüsüne alınır; mevcut hücrede sayaç yerinde güncellenir, TR/EN metinleri test edilir. |
| K5 | Enkaz bitiş zamanı / dolu hücre hesabı | Kod sunucunun `until_ms` alanını zaten fallback olarak okuyor; alan uyumsuzluğu tek başına hata değil. İki snapshot arası gösterim gecikmesi olası. | P2 senaryo testi. Sunucu süresiyle tutarlı gösterim; istemci sunucu izni olmadan yerleştirme/enkaz temizleme yapmaz. |
| I1 | Türkçe `MutationObserver` ve regex maliyeti | Yeni Türkçe düğüm `toTurkish` yoluna giriyor; efekt alt ağacı atlama listesinde değil. Yük miktarı bu tur ölçülmedi. | P1. Kaynak Türkçe metinler için kısa yol; EN→TR geri yükleme ve gerçek İngilizce girişlerin sınırda çevirisi korunmalı. |
| I2 | Çeviride sonsuz self-trigger döngüsü | Çeviri kodu aynı değeri tekrar yazmama ve source/rendered korumaları içeriyor. Ek callback olabilir; sonsuz döngü kanıtı yok. | “Sonsuz döngü” etiketi kabul edilmez. Observer callback/düğüm ziyaret sayısı kontrollü testle ölçülür. |
| P1 | Çift tahta/raf çizimi, ağır imza hesapları | İlgili render çağrıları ve JSON imzaları mevcut. Değişmeyen görünümde bazıları erken dönüyor. | K1 sonrasında tek sunum geçişi/dirty alanlar; imzada güncelleme kaçırmama testi. GC süresi/yüzdesi ölçülmeden vaat edilmez. |
| P2 | Eğitim tamamlanmışken context DOM sorguları | `syncFirstMatchTutorial` önce `onboardingContext` çağırıyor. | P1 dar düzeltme. Tamamlanmış normal oyuncuda sorgular atlanır; eğitim tekrar isteği ve yönetmenli eğitimde devam edilir. |
| P3 | Efekt başına rAF/ölç-yaz çakışması | Anchor cache görevlik, imza efektleri ayrı rAF açıyor; kare içi tekrar ölçüm ihtimali sürüyor. | P2 profil ve tek okuma→tek yazma deneyi. Çapa doğruluğu, perspektif/resize ve gecikmiş efekt temizliği korunmalı. |
| P4 | Sınırsız `commandLog` ve kopuk anchor hücreleri | Önceki düzeltmeler mevcut: günlük 200 ile sınırlı; reset anchor haritalarını temizliyor. | Kaynakta düzeltilmiş, yeniden yapılmaz. Uzun maç/tekrar maç regresyonunda korunur. Son 8 kaydı formatlama ayrıca ölçülebilir küçük iyileştirme. |
| P5 | Kablo dashoffset ve kritik çekirdek full-side filtresi | Son CSS/çizim katmanı transform akışı ve kenar hale kullanıyor. Rapor eski kural bloklarını da saymış. | Kaynakta büyük ölçüde ele alınmış. Çalışan computed style/profil ile kalan maliyet doğrulanır; aynı işi baştan yapma yok. |
| P6 | DOM efektleri / CSS büyüklüğü / çok rozet | Maliyet adayı; önceki replay yoğun sahne yükünü gösteriyor. Satır/`!important` sayısı tek başına çalışma süresi kanıtı değildir. | P2 profil, bütçe ve okunabilirlik. Büyük CSS yeniden yazımı veya yeni efekt zenginleştirmesi ilk paket değil. |
| P7 | %12 kare örneklemesi / geç grafik düşüşü | Pencere tasarımı mevcut; sürekli rAF maliyetini azaltmak için bilinçli. | P2 telemetri tasarımı. Kontrollü uzun görev + dinamik ölçüm denenir; ölçüm aracı üretimde yükü artırmamalı. |
| S1 | Sunucu event listesi ve deepcopy | Cursor dizi indeksine bağlı; sonuç/olay verisinde iç içe sözlükler var. Raporun koşulsuz sığ kopya önerisi güvenli varsayılamaz. | P2 yük testi. İç içe özel veriler ve kaynak olay değişmezliği korunur; budama ancak base-cursor/resync/maç sonucu kanıtlarıyla tasarlanır. |
| A1 | Ses varyasyonu ve 80–110 MB tampon iddiası | Görsel/işitsel öneri; cihazdaki gerçek decoded buffer tutulumu bu tur ölçülmedi. | P2 bellek ölçümü, P3 cue çeşitliliği. Kullanımdaki sesleri rastgele boşaltma ve ölçülmeden OOM teşhisi yok. |
| M1 | Ölü DOM/fonksiyonlar, monolitler, CSS bölme | Bakım borcu adayları; dinamik üretilen DOM ve callback kullanımları statik çağrı grafiğinde kaçabilir. | P3 aşamalı envanter. Referans/test/özellik doğrulaması olmadan silme yok; mevcut görsel ve script sıra sözleşmeleri korunur. |
| M2 | `sistem` / `enerji` kategori ikiliği | UI ve sunucu katalog girişleri şu an `sistem`→`enerji` normalize ediyor. Tutarlılık borcu var; mevcut canlı kuralın atlandığı bu tur gösterilmedi. | P1 sözleşme testleri. Aynı normalize yolu istemci/sunucu sınırlarında; toplu şema adı değiştirme ilk pakette yok. |
| M3 | Node 18 global crypto iddiası | CI Node 22, bu bilgisayar Node 24.19.0; ilgili test burada geçti. | P3 desteklenen sürümü açık tut. Node 18 uyumu yayın engeli değil; fixture `node:crypto.webcrypto` ile bağımsızlaştırılabilir. |

Rapordaki **%25–40 CPU azalması, %80 tahsisat azalması, 762→240 KB CSS ve <50 `!important`** değerleri bu projede doğrulanmış sonuç değildir. Planın teslim taahhüdü değil, doğrulanmamış tahminler olarak kalır.

## 4. Uygulama sırası ve küçük teslim paketleri

### Paket 0 — kanıt tabanı ve güvenlik kapısı

- [x] Başlangıç commit'i, yerel araç sürümleri ve aynı bileşen için 1×/2×/4× gerçek DOM karşılaştırması kaydedildi.
- [ ] Tam savaş ve gerçek Android cihaz baseline'ı; önceki 174 sn ham kayıt burada yok.
- [x] G1 Capacitor 8.5.1, kilit dosyası ve Android yolları; purchases/PGS kimliği korundu. Native test kontrol listesi sonuç belgesinde.
- [ ] G1 gerçek native derleme ve telefon PGS/Billing kapısı (bu makinede JDK 21 yok).
- [x] G2/G3 güvenli metin/simge regresyonları.
- [ ] G4 canlı origin/proxy erişim kanıtı.
- [x] T1 denetleyici/aktif-legacy ayrımı: 402 dosya / 0 sorun; 7 araç içerikleriyle arşivlendi; CI import kontrolü eklendi.

Kapı: güvenlik/native/gerçek aktif başlangıç kapıları açıkken yeni paketi yayımlama. Import denetimi artık CI'de ayrı adımdır; yerel test, remote CI'nin koştuğunu kanıtlamaz.

### Paket 1 — savaş doğruluğu ve yaşam döngüsü

- [x] L1 kurulum hata/iptallerinde oturum/runner geri alma; L2 reset/mod değişimi/eski POST ve yalnız yerel oturum sahibinin idempotent cleanup yolu.
- [ ] L2 fiziksel telefonda arka plan/çıkış/bağlantı matrisi. Arka plan teslim olma değildir.
- [x] L3 gecikmiş snapshot/imha/daha sonraki otoriter canlanma/reconnect sözleşmesi.
- [x] M2 kategori/kopya/yardımcı denge sınırları istemci ve sunucuda aynı alias normalizasyonuyla testlidir.
- [x] P2 eğitim erken çıkışı; Android ekran öykünmesinde baştan sona eğitim geçti.

Kapı: gecikmiş mesaj, bağlantı kesilmesi ve başarısız kurulum oyun durumunu/oturum sayısını bozamaz. Görsel optimizasyon, yanlış savaş durumunu gizleyerek yapılmaz.

### Paket 2 — K1: kalıcı savaş kartları (ilk ana performans işi)

Kapsam oyuncu ve rakip tahtaları, iki çekirdek ve enkaz göstergeleridir. Koleksiyon/mağaza kartları ve Canvas bu pakette yeniden yazılmaz. Rafın yeniden üretimi ayrı, ölçümle seçilecek takip işidir.

**Kart yaşam döngüsü**

1. Kart kimliği `(savaş/oturum, taraf, instanceId)` ile ayrılır; aynı hücredeki farklı instance yeni karttır. Şablon/definition kimliği tek başına yeterli değildir.
2. Yeni yerleşen kart bir kez oluşturulur; CAN, max CAN, ısı, enerji, debuff, imza sayacı, hazır/hedefleme durumları mevcut düğümler üzerinde güncellenir.
3. Yapısal alan (modül tanımı, çekirdek türü/amblem, gerçek skin yapısı) değişirse gerekli alt ağaç değiştirilir. Sıradan CAN güncellemesi SVG'yi yeniden monte etmez.
4. İmha, boş hücre, enkaz ve gerçek yeniden doğma açık geçişlerdir. Yeni savaşta eski kart ve referanslar bırakılır. Enkaz sayacı her saniye tüm hücreyi silmez.
5. Dil/graphics/perspektif değişimi gerekli text/class/ARIA güncellemesini yapar. `force` ve render cache yolları yeni kartı doğru durumda başlatır; stale cache yüzünden çekirdek dolumu kaçmaz.

**Güncelleme sınırı**

- `create` ile `update` sorumluluklarını ayır; ortak alan güncelleyicisi iki taraf için aynı davranış sözleşmesini kullansın. Mevcut statik SVG amblem fabrikası görsel şablon olarak kalabilir.
- Kart ve kalıcı çocuklarına ait referansları kart ömrüne bağlı tut (`WeakMap` veya açık teardown). Güncel görünüm alanlarını kıyasla; değişmeyen `textContent`, style ve öznitelikleri tekrar yazma.
- CAN dolgusu, ısı çubuğu, enerji kopukluğu, rozetler, isim/title/ARIA, rol/tabIndex ve çekirdek dolumu bütün olarak kapsanır. Var olan `fx-*` geçici sınıfları veya animasyon düğümleri toplu className atamasıyla silinmez.
- Click/klavye dinleyicilerini bir kez bağla; handler eski `module` nesnesine kapanmamalı. `instanceId` ile güncel otoriter durumdan okumalı; snapshot nesnesi değişse de doğru çekirdek gücü/komut kullanılır.
- K2 kullanılmayan aktif kart stats/meta üretimini kaldır; K3 çekirdek seçicisini ve yeniden mount sonrası cache durumunu düzelt; K4 enkazı doğrudan mevcut hücrede güncelle.
- Ortak hücre yaşam döngüsüne geçerken oyuncu/rakip davranış farkları (etkileşim, gizli veri, çekirdek türü) açık seçenekler olarak korunur; iki tahtada aynı isim/instance çakışmaz.
- Hafif imza/dirty karşılaştırmasını yalnız bütün değişken alanların test kapsamasıyla sadeleştir. Snapshot, olay ve yerel etkileşim yollarının hepsi revizyonu güncellemeden revizyon sayacına geçme.

**K1 kabul testleri**

- [x] CAN/ısı/enerji/rozet değişiminde kart/SVG/ikon/FX overlay kimliği ve değişen alanlar testlidir.
- [x] Değişmeyen model için 0 kart/düğüm ve 0 gereksiz alan yazımı birim sözleşmesi; gerçek DOM steady-state testinde 0 childList ekleme/çıkarma.
- [x] Geçici FX sınıfları korunur; artwork CAN güncellemesinde yeniden monte edilmez.
- [x] Yerleşme/imha/enkaz/daha sonraki canlanma/farklı instance/yeni hücre geçişleri testlidir.
- [x] Ortak iki taraf/çekirdek yolu, dolum/hazır/hedefleme alanları; Click/Enter/Space güncel nesneyi okur. Android ekran öykünmesinde dokunarak yerleşme geçti.
- [x] Snapshot nesnesi değişse de dinleyici güncel `client.modules` kaydını okur.
- [x] Yerel TR↔EN, grafik karar sözleşmeleri, viewport/resize, PvP reconnect, sonuç ve tekrar maç regresyonları geçti.
- [x] Kullanıcının açık yetkisiyle yalıtılmış gerçek DOM kimlik/mutasyon karşılaştırması.
- [ ] Gerçek Android WebView grafik/perspektif/uzun maç/touch kanıtı; masaüstü öykünmesi yerine sayılmaz.

Kapı: bu davranış testleri geçmeden kart tasarımı değiştirilmiş veya Canvas'a taşınmış sayılmaz. Performans iddiası aşağıdaki ortak ölçümle verilir.

### Paket 3 — gereksiz istemci işi ve ölçüm

- [x] I1 TR kısa yolu ve açık dış mesaj API'si; gerçek DOM'da TR→EN→TR ve değiştirilmiş kaynak metin/title testleri.
- [x] Efekt alt ağacı atlama ve görünür etiketleri dil değişiminde yenileme; 300 FX taraması → 0.
- [x] P1 tek snapshot sunum geçişi; P3 aynı kare çapa okuma → tek toplu DOM yazma, stale nesil ve kuyruk temizliği testleri.
- [x] Ev/Kartlar/Çekirdek özdeş veri cache'i; gerçek DOM 20 tekrar, modül/çekirdek/deste/dil invalidasyonu. Gerçek telefon ilk dönüş süresi aşağıdaki cihaz kapısına bağlıdır.
- [ ] Ölçüm pencerelerinin dışında performansı görmek için sürekli rAF eklemek yerine düşük maliyetli olay/uzun görev kanıtını değerlendir; otomatik grafik düşüşü testleri.

Kapı: tek başına profiler/diagnostic açılmasının yarattığı yük, ürün regresyonu diye değerlendirilmez. Dil doğruluğu performans uğruna kaybedilmez.

### Paket 4 — yalnız gerekirse Canvas efekt deneyi

- [ ] K1 ve Paket 3 sonrası bütçe hâlâ aşılırsa tek bir deneysel efekt yolu aç: önce mermi/vuruş parçacıkları, kalıcı kartlar ve butonlar DOM'da kalır.
- [ ] Aynı authoritative olay akışı, seeded görsel rastgelelik ve kayıtla DOM/Canvas A/B. Her iki yol aynı grafik kalite ve efekt sayısıyla karşılaştırılır.
- [ ] DPR/çözünürlük, resize/perspektif koordinatları, önbellekli glow/sprite, görünürlükte durdurma, efekt bütçesi ve cleanup test edilir. Her kare ağır `shadowBlur`, gereksiz text rasterization veya tüm sahneyi yeniden boyama maliyeti ölçülür.
- [ ] Gerçek Android WebView'da kare, bellek, görsel kalite ve mümkünse güç/ısınma karşılaştırılır; masaüstü CPU throttle tek başına geçiş kanıtı değildir.
- [ ] Belirgin ve tekrarlanabilir iyileşme varsa etkinleştirme kararı; yoksa deney kapalı kalır ve mevcut yol korunur.

Karar: **Tüm savaş arayüzünü Canvas'a yeniden yazmak şu an plan değil.** Canvas, kart DOM kimliği/yanlış snapshot/oturum cleanup sorunlarını otomatik çözmez.

### Paket 5 — ölçümlü sunucu maliyeti, bakım ve görsel/işitsel içerik

- [x] S1 güvenli ilkel payload fast-path ve gizli olayı kopyalamadan eleme; iç içe/bilinmeyen payload hâlâ deepcopy. Bileşen ölçümü ve privacy/source değişmezliği testleri kaydedildi.
- [ ] S1 çok maç/uzun maç event belleği; cursor budama ancak ayrı resync tasarımıyla.
- [x] A1 mevcut streaming/fallback/cache/crossfade incelemesi; L4 ses ön/arka plan 20 döngü timer/sahip testi.
- [ ] L4 gerçek cihaz hesap/reload matrisi ve A1 native/decoded toplam bellek ölçümü.
- [x] M1 çağrısız 5 eski kart helper'ı kaldırıldı; ortak kalıcı kart view ayrı modülde. Tarihsel balance araçları arşivde.
- [ ] Büyük CSS/monolit refaktoru yalnız ayrı, gereksinimi doğrulanmış teslimdir.
- [ ] Görsel yoğunluk, perspektif halkaları, spawn/weapon VFX, ses çeşitliliği ve yeni kozmetik önerilerini kullanıcı görsel kararı ve performans bütçesiyle ele al. İlk performans paketine ek yük getiren yeni efekt koyma.

## 5. Ortak doğrulama ve yayın kabulü

1. Aynı commit/senaryo/dil/perspektif/graphics/cihaz ve aynı ölçüm yöntemiyle önce/sonra. Replay 174 saniye, önceki karşılaştırmanın 15–160 saniye aralığı korunabiliyorsa kullanılır; kayıt yoksa iki sürümün de oynatacağı yeni yalıtılmış kayıt oluşturulur. Eski ham kaydı yeniden ölçmüş gibi gösterme yok.
2. 1×/2×/4× masaüstü koşuları, birden fazla tekrar, gerçek orta/düşük seviye Android WebView; eğitim, AI, insan PvP ve reconnect senaryoları ayrı.
3. Kanıt: p50/p95/p99/max kare, 50/100/250/1000 ms üzeri kareler, ana thread/style/layout/paint/GC, kart oluşturma/alan yazımı, observer callback sayısı, DOM/listener/heap eğilimi. Sesin/native/GPU belleği JS heap değerinden çıkarılmaz.
4. Profil koşusu ile profiler kapalı ürün koşusunu ayır. `?e2e=1` tam rAF ölçümü ve normal %12 pencere ölçümü eşdeğer yük değildir. Karşılaştırılan iki sürüm aynı probe kipini kullanmalı.
5. Mevcut başlangıç bütçesi: p95 ≤34 ms, >50 ms kare oranı ≤%3, >1000 ms kare 0; minimum 15 saniye/300 kare. Uzun ve yoğun tam maç da test edilmeli. Eşikler gerçek cihazda doğrulanacak; bütçe geçirmek için değer düşürme/gizleme yok.
6. İstemci testleri, sunucu ilgili + tam regresyon, kaynak/import/derleme sözleşmeleri, iki gerçek tarayıcı istemcisi ve reconnect. Bunlar Android native PGS/Billing smoke testinin yerine geçmez.
7. Kullanıcının satın alma→iade→yeniden alım kabulü korunur; kaynak hakları sıfırlanmaz. Yeni paket varsa önce kapalı testte doğru hesapla native giriş ve lisans test satın alma akışı doğrulanır.
8. Uygulama paketleri ayrı diff/geri dönüş noktalarıyla teslim edilir; veritabanı/oyun kuralı migration'ı sessizce eklenmez. “Plan hazır”, “kod/test hazır”, “paket hazır”, “canlıda doğrulandı” ayrı durumlardır.

## 6. Plan hazırlama aşamasındaki tarihsel tanılar

- `python -B tools/check_imports.py`: **404 dosya / 14 uyarı**, exit 1. Yukarıda 12 gerçek legacy/modül referansı + 2 denetleyici yanlış pozitifi ayrıldı. Kod çalıştıran import denemesi değil, AST taraması.
- Node `v24.19.0` üzerinde `frontend-components`, `i18n`, `i18n-dynamic-text`, `beta78-i18n-bridge`, `battle-lifecycle`, `battle-presentation`: **29 geçti, 0 başarısız, 0 atlandı**. Bu testlerde değişen CAN'da DOM kimliğinin korunmasına ilişkin K1 sözleşmesi henüz yok.
- Anka iç SVG yolunun sayı grupları yerel salt okunur token kontrolüyle incelendi: son `c` bölümünde 18 parametre. W3C grammar tekrarlanan altı parametreli eğrilere ve negatif sayının ayırıcı olmasına izin veriyor. Şeklin cihazda estetik/görsel onayı bu tur yapılmadı.
- Tam istemci/sunucu test paketi, yeni build/AAB, yeni CPU/bellek profili, native telefon testi ve canlı erişim denetimi bu tur yapılmadı. Önceki CI/denetim sonuçları yeni uygulama kanıtı sayılmaz.

## 7. Dış teknik kaynaklar

- [W3C SVG path kuralları](https://www.w3.org/TR/SVG2/paths.html#PathDataCubicBezierCommands): tekrarlanan Bézier komutları ve parametre grupları. Sayı ayırma: aynı belgenin `PathDataBNF` bölümü.
- [Capacitor güvenlik duyurusu GHSA-rvm3-566m-v7fv](https://github.com/advisories/GHSA-rvm3-566m-v7fv): etkilenmiş sürümler ve yamalı 8.5.1; yeniden derleme/dağıtım gerekliliği.
- [Canvas optimizasyon rehberi](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas): katmanlama, önbellek, batch çizim ve pahalı blur/text işlemlerinden kaçınma. Buradan projeye özgü kazanç yüzdesi türetilmez.

## 8. Güncel uygulama kapısı

Yerel sonuç: istemci **438 geçti / 2 JDK atlaması**, sunucu+araç **1.596 geçti / 44 PostgreSQL-Redis atlaması**, build sözleşmesi **9/9**, import **402/0**. İki gerçek yerel tarayıcı istemcisi **3/3**, Android ekran öykünmesi **9/9**; gerçek DOM ölçümleri ve kaynaklar sonuç belgesinde.

**Sıradaki adım:** JDK 21 + SDK bulunan makinede mevcut native kimlik ve anahtarla derleme; ardından gerçek telefon PGS/Billing, uzun maç profili, kalıcı altyapı CI ve canlı origin/proxy doğrulaması. Canvas ve yeni kozmetik/efekt işleri koşulludur; sırf rapor önerdi diye açılmaz. Bu açık kapılar tamamlanmadan plan tamamen bitmiş veya yayın onaylı sayılmaz.
