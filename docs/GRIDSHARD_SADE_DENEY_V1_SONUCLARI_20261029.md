# Sade savaş deneyi V1 — 29 Ekim 2026

Çalışan yerel ekran: http://127.0.0.1:8893/ . Kullanıcı sadeleştirmeyi denemeyi,
görünürlük için gerekirse yalnız savaş çizimini değiştirmeyi istedi. Bu çalışma
ayrı bir oynanabilir deneydir; ana oyunun hesaplarını, kart yatırımlarını,
Devre Yolu'nu, ödüllerini veya kurulu telefon paketini dönüştürmez.

## Uygulanan kurallar

- Tek ekonomi Akım: başlangıç 6, depo 12, her 2,2 oyun saniyesinde +1.
- Altı farklı kartlık deste; aynı karttan en fazla iki yaşayan kopya.
- Enerji, genel ısı, nadirlik çarpanları ve yetenek ağacı bu deneyde yok.
- Hedef: çalışan Bariyer → en eski yaşayan modül → çekirdek. Hedef sahada işaretli.
- Otomatik ilk boş hücreye yerleşim; hücre seçme kuralı aynı deneye eklenmedi.
- İlk çekirdek gücü 20 sn, sonrakiler 35 sn; düğmeye basarak kullanılır.
- Zamanla hasar artışı, onarım azaltımı ve zorunlu savaş süresi yok.
- Seviye 1/8/15 seçilebilir. Modül CAN/hasarı aynı %4 büyüme adayını kullanır;
  çekirdek CAN'ı mevcut `core_max_hp` verisinden gelir. Bu eğriler kesin denge değildir.

| Kart | Sınıf | Akım | SV1 CAN | Ana işi |
|---|---|---:|---:|---|
| Lazer | Saldırı | 3 | 220 | Her 1 sn 12 hasar |
| Darbe Topu | Saldırı | 3 | 198 | Son 0,6 sn hazırlığı görünür; her 2,5 sn 30 hasar |
| Ray Topu | Saldırı | 4 | 275 | Her 3 sn 38 hasar; Zırh azaltımının %65'ini aşar |
| Ark Topu | Saldırı | 4 | 275 | Her 1,8 sn 22 hasar; tek komşuya %50 sıçrama |
| Kalkan | Koruma | 3 | 240 | İşaretli dostun tek isabetini %60 azaltır; 1,2 sn dolum |
| Bariyer | Koruma | 3 | 264 | Normal saldırının öncelikli hedefi olur |
| Zırh | Koruma | 3 | 288 | Kendi aldığı hasarı %25 azaltır |
| Onarım | Koruma | 3 | 180 | Her 2 sn en yaralı diğer modüle 15 CAN; kendisi/çekirdek hariç |
| Güçlendirici | Taktik | 3 | 162 | En eski yaşayan silaha %30 hasar; kopyalar üst üste eklenmez |
| EMP | Taktik | 3 | 144 | Her 6 sn en eski düşman silahını 1 sn duraklatır |

Onarım kopyaları aynı hedefte aynı onarım aralığına yığılamaz. EMP bekleyen atışa
1 sn ekler, atış süresini başa sardırmaz; hedefte kesinti sonrası 3 sn tekrar
kilitlenme koruması vardır. Bir isabete yalnız bir normal Kalkan uygulanır.

Rezonans çekirdeği ve en yaralı iki modülü azami CAN'ın %18'i kadar onarır.
Muhafız çekirdek ve iki modüle 5 sn, azami CAN'ın %20'si kadar kalkan verir;
ateş altındaki modül önceliklidir. Aşırı Yük en eski iki silahın sonraki üç atışını
%50 güçlendirir. Tam canlı Rezonans/boş devrede Aşırı Yük gücü boşa harcanmaz.

## Görünürlük ve oynama

Kurulumda kartlara dokunarak deste değişir ve kartın görevi/değerleri gösterilir.
Savaşta raftaki karta dokunarak yerleştirilir; hedef işareti, yönünü hedefe çeviren
silah, atış izi, onarım/güçlendirme/EMP bağları ve kesinti sayacı gerçek durumu
gösterir. Muhafız kalkanı ve Aşırı Yük'ün kalan atışları ayrıca görünür.
Modüle dokunmak görevini, CAN'ını ve kalan atış süresini açar. Olay paneli kaynak,
hedef ve gerçek hasar/onarımı söyler; çekirdek katkısı gerçekleşen değerle ölçülür.

Duraklat ve Yeni deneme düğmeleri vardır. Rakip deste/çekirdek, 1×/2×/4× hız ve
iki tarafı da botun oynatması kurulumdan seçilebilir. Bot, kararları 700 ms arayla
veren deterministik bir deney rakibidir; rekabetçi yapay zekâ değildir.

## Test sonucu ve sonuçtan yapılan düzeltme

45 otomatik test geçti: yeni kurallar/API ve mevcut stratejik savaş/modül
regresyonları. Akım sınırı, hedef sırası, kopya etkilerinin yığılmaması, EMP'nin
atışı başa sarmaması, çekirdek oranları/gerçek katkı, olay ve ölü modül kayıtlarının
sınırlandırılması, oturum sahipliği, tekrar komut güvenliği ve hesap alanlarını
reddetme kontrol edildi. Ayrı servis ana uygulamayı/hesap geçitlerini içe aktarmıyor.

Gerçek Chrome'da 1080×1000, 375×812 ve 320×740 ölçülerinde kurulum → yerleştirme →
duraklat/sürdür → çekirdek gücü → modül inceleme → yeni deneme akışı geçti.
Yatay taşma 0, JavaScript hatası 0; raf adları tek satır ve alan içinde, kart
görselleri en az 40 px yüksek ve yüklenmiş. Ekran görüntüleri gözle de incelendi.
Bu ölçüler tarayıcı testidir; fiziksel telefonda yeni paket denenmedi/yüklenmedi.

81 deterministik senaryo iki tur çalıştırıldı: 3 seviye × 3 kendi deste × 3 rakip
deste × 3 çekirdek eşleşmesi. Çekirdek eşleşmeleri Rezonans/Muhafız,
Muhafız/Aşırı Yük ve Aşırı Yük/Rezonans; dokuz olası çekirdek çiftinin tümü değildir.
Her senaryo en fazla 900 oyun saniyesi gözlendi. Bu gözlem sınırı oyunda süre kuralı
değildir; sınırdaki savaşlar bitirilmedi ve kazanan atanmadı.

İlk turda Muhafız'ın "en eski iki modülü koru" seçimi altı senaryoda sıfır gerçek
katkı üretti; Bariyer ateşi çekerken kalkanlar başka modüllere gidiyordu. Buna göre
Muhafız hedefi ateş altındaki modül ve en yaralı diğer modül olarak düzeltildi.
İkinci turda sıfır katkılı kendi çekirdek senaryosu 6'dan 0'a indi. Muhafız'ın gerçek
emilimi senaryoya göre 113,6–3481,039 oldu; bu toplamlar eşit süreli güç karşılaştırması
değildir. Zırh/normal Kalkan/çekirdek kalkanının emdiği hasar ve fazla vuruş hasarı
ayrıldı; fazla vuruş "engellenen hasar" sayılmıyor. Ark'ın yüklü ikinci isabetinin
gerçek bonusu da çekirdek katkısına ekleniyor.

İkinci tur bulguları:

- 45/81 savaş çekirdek yıkımıyla bitti: 163,5–448,4 sn; bitenlerin medyanı 215,8 sn.
- 36/81 savaş 900 sn'de hâlâ sürüyordu. Dengeli/Ark-koruma destelerinin kendi
  aralarındaki dört deste eşleşmesinde modül yenileme, kalkan ve onarım çekirdeğe
  ilerlemeyi kilitliyor. Bu sürüm **yayına hazır denge değildir**.
- İlk modül kaybı 10,7–38,6 sn. Her senaryoda yok edilen silahların yaşam süresi
  medyanı 10,7–133,4 sn arasında; yaşayan silahlar bu ölçüme dahil değil. Bunlar
  oyuncunun tepki süresi veya "her silah en az 10,7 sn yaşar" garantisi değildir.
- Akım 12 / 2,2 sn adayı henüz onaylanmadı. Yalnız süreyi uzatmak veya modül CAN'ını
  artırmak savunma kilitlenmesini büyütebilir.

Sonraki deneyin odağı: savunmayı boşa çıkarmadan çekirdeğe ilerleme sağlayan,
oyuncuya tek cümlede anlatılabilen hedef/taarruz kuralı. Zamanla hasar artırma veya
onarımı otomatik azaltma geri getirilmedi. Bu mekanik çözülmeden daha fazla kart,
genel CAN artışı veya yeni motor göçü eklenmemeli. Ardından gerçek oyuncuyla
"kim kimi hedefliyor / neden / ne koymalıyım" soruları ve fiziksel telefon testi
gerekiyor. Otomatik testler anlaşılabilirlik veya eğlenceyi kanıtlamaz.

## Teknoloji durumu

İlk çizici Canvas2D ve mevcut onaylı v7 tahta/modül görsellerini kullanıyor. Bu
deneyde hedef, destek bağı, hazırlık, kesinti ve çekirdek etkisini göstermek için
Godot geçişi gerekmedi. Gerçek cihaz performansı ölçülmediği için motorlar arasında
performans üstünlüğü iddiası yok; Godot prototipi veya motor göçü yapılmadı.

Kurallar `server/app/game/simple_lab.py`, yerel servis `server/app/simple_lab_api.py`,
çizici `client/lab/lab.js`. Çizici yalnız `gridshard-simple-v1` durum/olay sözleşmesini
okur. Kaynak/hedef kimlikleri, hücre, CAN, dolum, kalkan, kesinti, yüklü atış ve
hasar/onarım olayları motorun kamu çıktısıdır. Böylece başka bir çizici denenirse
oyun kurallarını ona taşımak gerekmez. Bu sözleşme henüz üretim API'si değildir.

Ölü modüller motor kaydından bırakılır, ölü çekirdek enkazı korunur; olay tamponu
256, çizim etkileri 80, olay paneli 7, ad geçmişi 256 ile sınırlı. Çizim saati
duraklatmada/sekme gizlendiğinde durur; tekrar kurulum eski oturumu kapatır.

Yerel servis yalnız 127.0.0.1'e bağlanır. Oturumlar bellektedir, sunucu kapanınca
silinir. Kötü Host/Origin reddedilir, maç için rastgele geçici sahiplik anahtarı
vardır. Normal oyunun 8891 sunucusu ayrı kalır. Deney sayfası normal `client/index.html`
üzerinden yüklenmiyor; mobil derleme yalnız normal girişteki betik/stilleri toplar.

Başlatma:

```powershell
.venv/Scripts/python.exe -X utf8 tools/simple_lab_server.py --port 8893
```

Doğrulama:

```powershell
# server klasöründe; bu bilgisayardaki global Python pytest içeriyor.
python -X utf8 -m pytest tests/game/test_simple_lab.py tests/test_simple_lab_api.py tests/game/test_strategic_battle_window.py tests/game/test_module_ecosystem.py -q -p no:cacheprovider
# proje kökünde; kurulu Chrome kullanılır.
node tools/check_simple_lab.cjs
python -X utf8 tools/probe_simple_lab.py --output artifacts/simple-lab-20261029/simulation-iteration2.json
```

Kanıtlar `artifacts/simple-lab-20261029/`: `browser.json`, üç ölçünün kurulum/savaş
PNG'leri, ilk `simulation.json`, düzeltilmiş `simulation-iteration2.json`,
`rules-catalog.json`, kimlik doğrulama anahtarı içermeyen `renderer-contract-sample.json`.

Bu on kart bir yayın kataloğu değildir. Devre Yolu'nun her arenada kart açma
gerekliliği, eski 36 kart yatırımlarının geçişi ve diğer dört çekirdek bu prototipe
uygulanmadı; mevcut oyunda duruyor. Deney sonucundan sonra bunların geçiş planı
ayrıca tamamlanmalıdır.
