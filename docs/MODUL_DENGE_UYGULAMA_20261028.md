# 36 modül — sıralı denge uygulaması

**Durum: Beş aşama uygulandı; sunucu, istemci, tarayıcı ve gerçek Android
kontrolleri tamamlandı. Yerel paket kapalı test için hazır; canlıya veya
Play Store'a gönderilmedi.**

Kullanıcı, önerilen beş aşamanın sırayla uygulanmasını; her aşamanın
testinden sonra bir sonraki aşamanın sonuçlara göre şekillendirilmesini
istedi. 28 Ekim 2026. Yerel çalışma; canlı dağıtım yok.

Eski, reddedilmiş sayısal aday uygulanmıyor. Tarihsel karşılaştırma:
`artifacts/module-balance-audit-20261027/`.

## 1 — Sabotaj görevleri ve fiziksel hedefler

Uygulandı:
- EMP taban1,8 sn/tavan2,4 sn; Tekillik iki hedefte taban1,5 sn/tavan2 sn.
- Bu tam kontrollerden sonra1,5 sn toparlanma: başka bir normal sabotaj
  aynı hedefi hemen yeniden kapatamaz.
- Sinyal Bozucu yalnız desteklerin çıktısını %35 azaltır; büyüme tavanı %50.
  Destek çalışmaya devam eder. Onarım, güçlendirme, soğutma ve Anka'nın
  geri getirdiği CAN bu kurala uyar.
- Virüs6 sn içinde6artan hasar darbesi verir; hedefin çalışmasını kesmez.
  Hasar seviyeyle büyür, süre sabittir; bilgi paneli aynı toplamı gösterir.
- Kesici yalnız enerji modülüne gider; ikinci hedef yankısı kaldırıldı.
- Tekillik ayrı durum kimliği kullanır; Kesici ile karışmaz.
- Susturulan/enerjisiz canlı modüller fiziksel saldırı hedefi olmaya devam
  eder; savunma etkileri çalışmaz ama Çekirdek önünden kaybolmazlar.
- TR/EN katalog, modül bilgi sayıları ve istemci durum metinleri uyarlandı.

Test: 201 hedefli ve617geniş savaş testi geçti. Eski Virüs süresi artışı
varsayımı yeni sabit süre/büyüyen hasar sözleşmesine uyarlandı.

1.088 maç/36 kart/17 deste/1-8-15 seviye ve84 izole mekanik deneyi:
`artifacts/balance-rollout-20261028/01-sabotage/`.
Maç süre medyanları63/54,6/45,9 sn; hiçbiri240 sn sınırında kalmadı.
90 sn/15.seviye/tek korumasız hedefte EMP susturma oranı %42,7,
Tekillik %31,1. Virüs susturması0. Bozucu ve Kesici artık Lazer'i hedeflemez.
Bu oranlar tek modüllü düzenek sonuçlarıdır, oyuncu kazanma oranı değildir.

Sonraki aşama kararı: Sabotaj artık evrensel tam susturma değil. Buna
karşın15.seviyede yok edilen modül ömrü medyanı hâlâ3,2 sn. Bu nedenle
taban CAN/hasar/maliyetleri şimdilik koruyup seviye eğrisini ayrı ölçmek
gerekiyor; önceki reddedilen adayın bütün taban güçlendirmeleri alınmayacak.

## 2 — Seviye eğrisi

Uygulandı: CAN büyümesi %3→%4,5; saldırı hasarı %5→%4. Taban kart HP,
hasar, Akım ve çevrimleri bu aşamada değiştirilmedi. Yetenek dallarının
kendi ek çarpanları korundu. 11 saldırının seviyeye bağlı dayanıklılık
oranı için regresyon eklendi. Virüs hasarı kendi etki büyümesini kullanıyor;
süre yine6 sn. Çekirdek ayrı CAN eğrisini koruyor.

1.088yeni eşleşme: `artifacts/balance-rollout-20261028/02-level-curve/`.
1/8/15.seviye maç medyanı63/64,6/57,7 sn; bitmeyen maç0. Ölen modül
ömrü medyanı4,4/4,3/4,4 sn: yüksek seviyedeki ani kırılganlık büyük ölçüde
giderildi. 15.seviyede tek vuruş hasarının tam CAN'a ulaştığı olay sayısı
81→28; sıfır garantisi değil. Düşük seviye sonuçları1.aşamayla birebir aynı.

Sonraki karar: Taban CAN'ları topluca artırmaya gerek yok. Yeni eğriyle
devre daha uzun yaşıyor ve ısı daha görünür: azami seviyede aşırı ısınma
olayı50→210. Önce Soğutucunun sabotaj temizliğini kaldırmak ve savunmanın
seviye kaynaklı ısı cezasını normalize etmek; sonra silahları ayarlamak.

## 3 — Soğutucu ve ısı

Uygulandı: Soğutucu yalnız ısı değiştirir; EMP/hat kesintisi süresini
kısaltmaz. Savunma blok ısısı taban CAN/seviyeli CAN oranıyla normalize
edilir: aynı CAN payını engellemek seviyeden bağımsız aynı ısıyı verir.
630savaş testi ve1.088 maç geçti; bitmeyen maç0. Azami seviye maç medyanı
57,85 sn, modül ömrü4,4 sn. Sonuç eğri aşamasına çok yakın; görev ayrımı
ön hattın dayanıklılığını bozmamış. 84 izole termal/kontrol deneyi de
tamamlandı. Kanıt:`artifacts/balance-rollout-20261028/03-thermal/`.

Sonraki karar: Kuantum destesi azami seviye matriste hâlâ%100, Tekrarlayıcı
%87,5; zincir/sürü desteleri %0/%15,6. Bunlar tek kartın bağımsız gücü değil,
bu17 deste/AI politikasında ciddi uçlar. 4.aşamanın ilk denemesinde CAN'ları
topluca artırmadan ağır silahların darbesi, çoklu hedef silahlarının verimi
ve Prizma'nın enerji geri dönüşü ayarlanacak. Destekleri aynı anda genel
olarak güçlendirerek önceki hatalı adayın uzun onarım maçları tekrarlanmayacak.

## 4 — 36 modülün rol bazında ayarı

Uygulandı; tek bir toplu CAN/hasar çarpanı verilmedi. Son tablo aşağıdadır.

Testlerin yön verdiği denemeler:

- **4a:** Kuantum/Tekrarlayıcı/İyon tek darbesi düşürüldü; Füze/Ark/Plazma/
  Sürü rolleri güçlendirildi. Prizma blok hasarını önce seviyeden arındırır;
  dönüşüm %8/tavan %12 ve blok başına3 enerji sınırına alındı. Kuantum yük
  bonusu %80→%60. Ağır silahlar tarafsız185 CAN hedefi2yerine3atışta yıkıyor.
- **4b:** Genel CAN artışı yerine4 Akımlık ağır silahlara seçici CAN verildi.
  Ray125, Ark125, Plazma125, Tekrarlayıcı105, İyon130, Kuantum135.
  Başlangıçta iki3 Akımlık silaha karşı tek pahalı silahın kırılganlığı azaldı.
- **4c:** Maçlarda AI'nin saldırısız kalınca sürekli ucuz Batarya basıp silaha
  biriktirememesi bulundu. Regresyon önce hatayı gösterdi, sonra düzeltildi.
  Aynı AI ile hafif/ağır CAN varyantları2.176 maçta karşılaştırıldı.
  Ağır CAN artışı korundu. Bu politika değişimi kart kazanma oranıyla
  karıştırılmıyor; önceki AI matrisleri birebir canlı meta tahmini değildir.
- **4d/e:** Darbe Topu3 Akıma inerken CAN115→90, hasar32→30 yapıldı;
  ucuzlarken her koşulda daha iyi Lazer olması önlendi. Sinyal Bozucu ve
  Kesici dar rollerinde2 Akım; Virüs3, iki hedefli Tekillik4 Akım oldu.
  Sürü10hasar/1,2 aksiyon enerjisi; Matris110 CAN; Omega sınıf başına %10,
  tek saldırıda %22tavan aldı. Onarım ailesi topluca güçlendirilmedi.
- **4f:** AI, ucuz silaha sürekli dönüp daha iyi silahı hiç alamama döngüsünden
  çıkarıldı. Aynı iki silahı paylaşan farklı destelerde karşılıklı yok oluşun
  sonsuza uzayabildiği daha geniş testte bulundu: iki taraf da saldırısız
  ve defanssız kalıp en az iki silah kaybetmişse AI bir ön hat kurar, sonra
  yine silah için biriktirir. Böylece süre sınırı/Çekirdeğe yapay CAN kaybı
  eklenmedi. Üç ayrı regresyon eski hatayı önce başarısızlıkla doğruladı.

Kesici Çekirdeğin mevcut tam destek kesintisi, Sinyal Bozucu'nun yeni
kısmi etkisiyle karışmaması için ayrı durum kimliğine taşındı; Onarım
tarafından temizlenebilirliği korundu. Bu, Çekirdek gücünü yanlışlıkla
kısmi etkiye dönüştürmeyi önler.

Tüm36 kartın azami seviyedeki16 yetenek dalı birleşimi (576 profil) için
geçerli istatistik/kontrol tavanı denetimi var. Geniş savaş paketi678 test.
Bu, bütün576 profilin bütün başka profillere karşı dengelendiği iddiası değildir.

### Son taban değerler ve 36 kartın kararı

Oklar27Ekim değerlendirmesi öncesindeki yerel kaynak→son uygulamadır.
CAN/hasar1.seviye, yeteneksiz değerlerdir; seviye eğrisi ayrıca uygulanır.
Maliyet, kurulum Akımıdır; aksiyon enerjisi ve bakım enerjisi ayrıdır.

| Modül | Akım | CAN | Ana hasar | Son çevrim | Rol / karar |
|---|---:|---:|---:|---:|---|
| Lazer | 3 | 100 | 12.0 | 1 sn | Kararlı tek hedef; düşük enerjiyle uzun ateş. Kalkan ve yansıtma karşı hamlesi. |
| Darbe Topu | 4→3 | 115→90 | 32.0→30.0 | 2.5 sn | Seyrek güçlü darbe; enerji/ısı bedeli yüksek. Sönümleme karşı hamlesi. |
| Füze Fırlatıcı | 3 | 105 | 28.0→32.0 | 3 sn | Önceden görülen kilitli darbe; düşük sürekli tempo. Sinyal kesme karşı hamlesi. |
| Ray Topu | 4 | 95→125 | 40.0→44.0 | 3 sn | Ağır savunmayı delen tek hedef silahı; kalabalık temizliği zayıf. |
| Ark Topu | 4 | 100→125 | 20.0→22.0 | 1.8 sn | İki modüle zincir hasarı; tek hedefe daha az bütçe. |
| Dron Üssü | 3 | 110 | 8.0 | 0.9 sn | Hızlı küçük darbeler ve hafif yayılım; ağır korumada verimsiz. |
| Plazma Havanı | 4 | 100→125 | 30.0→34.0 | 3 sn | Uyarılı ağır alan darbesi; zincirden daha yavaş ve daha kırılgan kilit. |
| Kuantum Tekrarlayıcı | 4 | 92→105 | 24.0→18.0 | 1 sn | Aynı hedefte dördüncü vuruş ödülü; hedef değişimi ve kontrol karşı hamlesi. |
| İyon Mızrağı | 4 | 100→130 | 48.0→40.0 | 3.2 sn | Savunma delme ve ikinci hedefe taşıma; tek hedefte evrensel en iyi silah değil. |
| Sürü Fabrikatörü | 3 | 105 | 6.0→10.0 | 0.9 sn | Dört atıştan sonra üç hedefe yayılım; kurulumunu tamamlamadan baskın yeme riski. |
| Kuantum Topu | 4 | 105→135 | 58.0→42.0 | 2.8 sn | Gerçek enerji fazlasını patlamaya çeviren silah; enerji açığında yük birikmez. |
| Kalkan | 3 | 150 | 0.0 | 1.2 sn | Aralıklı tek darbe koruması; seri atış bloklar arasından geçer. |
| Zırh | 3 | 180 | 0.0 | 3 sn | Düzenli hasarı sönümleyen tank; delici atış ve kontrol karşı hamlesi. |
| Bariyer | 3 | 165 | 0.0 | 4 sn | Daha düşük doğrudan koruma karşılığında sabotaj süresini azaltan ön hat. |
| Yansıtıcı | 3 | 110 | 0.0 | 1 sn | Darbeyi üzerine çekip saldırana geri veren karşı saldırı savunması. |
| Muhafız Kubbesi | 4 | 155 | 0.0 | 1.5 sn | Bir başka modülü koruyan destek tankı; kendi başına en dayanıklı tank değil. |
| Faz Zırhı | 4 | 150 | 0.0 | 6 sn | Kısa faz penceresinde patlamayı boşa çıkaran savunma; pencere dışında açık. |
| Prizma Kalkanı | 4 | 165 | 0.0 | 1.3 sn | Engellenen hasarın küçük payını enerjiye çevirir; sınırsız enerji kaynağı olmamalı. |
| Onarım | 3 | 100 | 0.0 | 2 sn | Tek hedefi ayakta tutar; birden fazla hedefe eşzamanlı baskıda yetersiz. |
| Nano Sağlıkçı | 3 | 95 | 0.0 | 2 sn | İki yaralıya paylaştırılmış onarım; odak hasarına karşı daha zayıf. |
| Anka Onarım | 4 | 100 | 0.0 | 2 sn | Bir kez geri getirme sigortası; erken baskı ve enerji kesintisi karşı hamlesi. |
| Soğutucu | 2 | 100 | 0.0 | 1 sn | Yalnız ısı kontrolü; EMP/hat süresini temizlemez. |
| Güçlendirici | 3 | 90 | 0.0 | 2 sn | Paylaşılan tek atış hasar yükü; kalabalık saldırı hattına sonsuz çarpan vermez. |
| Hedefleme Bilgisayarı | 3 | 85 | 0.0 | 2 sn | Paylaşılan ateş temposu; hızlı silahı bedelsiz enerjiyle çalıştırmaz. |
| Aşırı Hızlandırıcı | 3 | 80 | 0.0 | 2.5 sn | Isı borcu karşılığında seçili ağır saldırıyı hızlandırır; soğutucuyla anlamlı özel kurulum. |
| Krono Rölesi | 3 | 88 | 0.0 | 6.5 sn | Kısa takım temposu, ardından ölçülebilir zaman borcu; borç evresi korunmalı. |
| Hassasiyet Matrisi | 3 | 90→110 | 0.0 | 1.5 sn | Aynı hedefe odaklanmayı ödüllendirir; hedef değişiminde birikimi kaybeder. |
| Omega Güçlendirici | 3 | 95 | 0.0 | 2 sn | Farklı sınıflı devreyi ödüllendirir; sıradan güçlendiricinin her koşulda üst sürümü değil. |
| Batarya | 2 | 120 | 0.0 | 4 sn | Uzun vadeli üretim; erken saldırı Akımından ve bir hücreden vazgeçme bedeli. |
| Kapasitör | 2 | 90 | 0.0 | 1 sn | Kısa yüksek enerji isteğini rezervden karşılar; sürekli üretim yapmaz. |
| Akım Dengeleyici | 3 | 100 | 0.0 | 0 sn | Büyük devrede tüketimi azaltır; küçük devrede Bataryanın yerini otomatik almaz. |
| EMP | 3 | 80 | 0.0 | 6 sn | Tek hedefte kısa çalışma kesintisi; sürekli kilit yerine fırsat penceresi. |
| Sinyal Bozucu | 3→2 | 85 | 0.0 | 5 sn | Yalnız destek çıktısını %35 azaltır; en çok %50. Tam susturmaz. |
| Virüs | 4→3 | 70 | 0.0 | 7 sn | Altı sn tırmanan hasar; hedef çalışır, Onarım temizler. |
| Kesici | 3→2 | 80 | 0.0 | 6.5 sn | Yalnız enerji modülüne kesinti; yankı yok. |
| Tekillik Projektörü | 3→4 | 90 | 0.0 | 6.5 sn | İki hedefte kısa tam kontrol; süre tavanı ve toparlanma aralığı var. |

Değişmeyen taban değer “incelenmedi” anlamına gelmez. Savunma ve onarım
ailesinin çoğunda yeni seviye eğrisi/ısı/durum kuralları zaten davranışı
değiştiriyor; ek taban artışına test kanıtı bulunmadı. Destekler arasından
tek atışta en güçlü tek desteğin seçilmesi, onarımın aynı hedefe destek
adımında bir kez uygulanması ve kopya/sınıf sınırları korundu. Hedefleme
ile Matris gibi iki destek aynı atışta üst üste sonsuz çarpan oluşturmaz.

## 5 — Bütünleşik ve mobil kontrol

Son25 deste/36 kart matrisi: kullanıcının ekrandaki Kuantum–Omega–Prizma–Anka–
Tekillik–Soğutucu destesi, temalı dengeli desteler ve Soğutuculu/Soğutucusuz
seçenekler eklendi. 1/8/15 seviyeler, iki taraf değişimi, azami seviyede iki
tohum: **2.400 maç**. Hiçbiri240 sn test sınırına takılmadı. Üç komut reddi
geçici boş hücre bulunamamasıydı; kaynak veya protokol hatası değildi.

Maç medyanı50,1/52,65/49,3 sn; p90 sırasıyla67,1/79,1/72,7 sn.
Ölen modül ömrü medyanı5/5/4,8 sn. 15.seviyede ağır Soğutuculu ve
Soğutucusuz örnek desteler bu belirli matriste56/96 eşleşme kazandı.
Bu örnek Soğutucusuz oynanabilirliği gösterir; tek modülün bağımsız
gücünü veya canlı oyuncu metasını kanıtlamaz. Örnek desteler arasında
başka kart farkları da olduğundan temiz bir nedensel Soğutucu testi değildir.

Ham vuruşu hedefin azami CAN'ını geçen3olay ayrıca incelendi. O anda hedefler
31/148ve88/194 CAN'daydı; tam CAN'dan tek atışla yok oluş değildi. Büyük
yetenek/destek vuruşları tamamen kaldırılmadı. Kanıt:`rare-burst-samples.json`.

Kontrollü tarafsız tek hedef deneyleri veısı/kontrol düzenekleri ayrıca
kaydedildi. Yeni ağır darbe süreleri, kartlar ve yetenek dalları aynı
motor/kanonik kaynaklardan hesaplanıyor. İstemci kopyası aynı HP/hasar/Akım
değerlerini taşır; mevcut kart sırası ve Sönümleyici adı korundu.

**Fiziksel Android:** Kullanıcının USB üzerinden yetkilendirdiği telefon,
proje içine alınmış resmî ADB aracı ve yerel/yeni misafir hesabıyla test
edildi. Mağazadaki uygulama, hesap ve oyuncu verisi kullanılmadı. Chrome'da
36 sunucu değeri, değişen6 bilgi paneli, gerçek sunuculu savaşta Lazer–Batarya–
Kalkan yerleştirme, iki tarafta15 hücre, taşma ve JS hatası kontrol edildi.
İlk gerçek cihaz örneği375×668 CSSpx, DPR3,25; taşma0/hata0;5 sn rAF
örneğinde59,7 FPS/p95kare16,7ms. Bu kısa ve az modüllü savaş örneğidir;
tam tahta, uzun oturum veya native WebView performans garantisi değildir.
Son kaynaklarla fiziksel tekrar da geçti:59,9 FPS/p95kare16,7ms; yine
taşma0/hata0. Masaüstü Chrome, Android Chrome ve Windows WebKit savaş alanı
kontrolleri geçti. Yeni6 bilgi paneli320/393px'de doğrulandı. WebKit'in iki
ekranı tek180 sn teste sığmadığından ekranlar ayrı testlere bölündü; aynı
görünürlük/taşma/değer kontrolleriyle ikisi de geçti. Gerçek iPhone ölçümü yok.

**Paket kontrolleri:** 1.959 sunucu testi geçti,44ortama bağlı test atlandı.
744 istemci ve10web paketleme testi geçti. Son webbuild:`6fc0d37cebc44444`.
Kısa simülasyonun iki saldırı hattını aynı anda
kaybedip yeni kart basmadığı senaryo, eski “yalnız aynı düzen kilitlenir”
varsayımı yerine gerçekten iki tarafta yaşayan silah kalmadığı doğrulanarak
test ediliyor. Canlı oyuna bir zaman sınırı eklenmedi.

Bu uygulama boyunca11matris koşumunda toplam15.680 maç ölçüldü. Son kabul
sonucu yalnız`05-verified`koşumudur; önceki adayların bazıları hatayı
görmek için tutuldu. Bunların toplamı bağımsız canlı oyuncu örneklemi değildir.

**Kanıt:** `artifacts/balance-rollout-20261028/`. Son geniş matris
`05-verified/`, gerçek cihaz `physical-android/`, tarayıcı `browser-final/`
ve ekran başına geçen WebKit tekrarı`webkit-verified/`.
Sunucu JUnit:`server-release.xml`; istemci günlüğü:`client-verified.log`.
Canlı dağıtım, Play Store yüklemesi veya AAB üretimi yapılmadı.
