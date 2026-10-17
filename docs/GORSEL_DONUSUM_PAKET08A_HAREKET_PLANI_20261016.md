# Paket 8A — fiziksel cihaz, hücreye yerleşim ve hareket sözleşmesi

16 Ekim 2026. Kullanıcının ek yönlendirmesi: modüller kart resimleri gibi
tahtaya taşınmayacak; hücrede fiziksel cihaz olarak duracak. Lazer, Darbe Topu
ve Füze Fırlatıcı hedefe yönelecek. Onarım hedefe dönüp kollarını kaldıracak;
Soğutucu alttaki döner eklenti üzerinde yönelerek üfleyecek. VFX ayrı aşama.

## 17 Ekim güncel ek — ilk 10 cihaz / 30° katmanlı kamera

İlk 10 savaş cihazı ortak kesintisiz yönelme ve 30° eğimli katmanlı 2.5D
sunuma geçti. Kart/raf çizimleri korunur; pasif cihazlara sahte hedef/dönüş
uydurulmaz. VFX.txt okundu, ayrı efekt/ses sözleşmesi çıkarıldı. Güncel
uygulama ve sınırlar: `MODUL_360_KAMERA_SEZON_20261017.md`.
Aşağıdaki yalnız Lazer/dört görünüş notları önceki aşamaların tarihçesidir.

## Önceki ek — yalnız Lazer için kesintisiz 360°

23:21 geri bildirimi sonrası Lazer saha görünümü ayrı üstten çizilmiş başlık ve
sabit kaideye geçti. Tek başlık bütün ara açılarda döner; gerçek atışın kırmızı
ışını kayıtlı namlu ucundan çıkar. Hedef kilidi sürer. Eğimli kamera geometrisi,
hafif varlıklar ve kontroller: `LAZER_360_DENEYIM_20261016.md`.
Bu 2D dönüşlü sunumdur, reddedilmiş teknik 3D pilot değildir. Diğer dört
yönelen cihaz eski dört görünüşte; raf/kart çizimleri korunur. Aşağıdaki dört
yönlü Lazer ve önceki doğrulama sayıları tarihsel aşamayı anlatır.

## Önceki uygulama — büyük cihaz yuvaları ve sabit bağlantılı devre

18:30 saha görüntüsünde cihaz görünürlüğü kullanıcı tarafından teyit edildi.
Ardından hücre büyütme ve yeni sanat dilinde devre yüzeyi uygulaması istendi.

- `module-device-v8.css`: iki 5×3 tahta korunur. Hücreler gerçek arena
  genişliği/yüksekliğiyle (`cqw/cqh`) 84 px'e kadar büyür; 6 satır, 4 hücre
  aralığı ve kimlik/deste/VS için 160 px rezerv birlikte hesaba katılır.
  Eski WebView için viewport yedeği, çok kısa alanda en az 28 px yuva ve panel
  içi kaydırma vardır. Bunlar formül sınırlarıdır; gerçek telefon ölçümü değildir.
- Rakip deste önizlemesi 24–44 px'e sıkıştırıldı. Mat grafit/petrol devre
  levhası, kalın kenarlı koyu yuvalar, bakır temas noktaları; oyuncuda turkuaz,
  rakipte sıcak kehribar sabit bağlantı ışığı. Yeni raster dosyası eklenmedi.
- Isı barı hücrenin iç üst kenarında 3 px; mevcut tek CAN pseudo-bar'ı iç alt
  kenarda 4 px. Cihaz kutusu kare ve açık ölçülü; hareketli başlık/kaide grubu
  kendi kayıt ofsetleri korunarak yuva içinde normalize edilir. Raf değişmedi.
- `circuitCableRoutes`: sunucunun çalışan modüllerine Çekirdekten tek yatay+
  dikey güzergâh. Eski bütün kısa yolları aydınlatan dikdörtgen kaldırıldı.
  Boş hücreden geçebilen hat, levha içi görsel bus'tır; boş hücreye güç alan
  modül statüsü verilmez. Komşuluk, enerji, hasar ve hedef kuralları değişmedi.
- Akan şerit düğümleri artık oluşturulmaz. Bütün grafik kademelerinde kesik
  çizgi, kablo nabzı ve filtre yok; aktif kablo sabit parlar. 22 kenarın çizgi
  düğümleri yerinde kalır; aynı durumda yeni düğüm/ölçüm/kablo yazımı yok,
  güç/yıkım değişimi yalnız görünürlüğü değiştirir. Boyut değişimi yeniden ölçer.
- 57 odaklı Node kontrolü ve 11 eski regresyon kontrolü geçti (toplam 68);
  kaynak/asset audit'i de başarılı, 36 betik / 13 stil, yeni CSS uyarısı yok.
  Gerçek oyun görüntüsü, telefon yerleşimi ve FPS testi kullanıcıda.
  Tarayıcı/sunucu/dağıtım/native paket/commit çalıştırılmadı.

## Güncel sanat kararı — teknik 3D görünüm reddedildi, çizilmiş cihazlara dönüş

Kullanıcı son Lazer modelini görsel dönüşüm planına uygun bulmadı. Köşeli ve
sade parametrik mesh, canlı renkli, hacimli ve belirgin konturlu cihaz çizimleriyle
aynı sanat dilini taşımıyor. Teknik dönüş kolaylığı görsel onayın yerine geçmez.

- 3D pilotun HTML betik yüklemesi, savaş bağlantıları ve 2D resmi gizleyen CSS'i
  kaldırıldı. Deney kaynakları korunur, oyuna yüklenmez ve çalışmaz.
- İlk 10 cihaz mevcut çizilmiş WebP varlıklarıyla görünür. Beş yönelen cihaz
  şimdilik dört resimli yön kullanır; bu kesintisiz 360° değildir.
- Hücre görünmezliği için açık kutu ölçüleri, sabit kaideler, CAN/ısı çubukları,
  gerçek olaylara bağlı hareket ve tek saat/HUD aralık koruması tutuldu.
- Yeni 3D sanat ancak onaylanan çizimlerle aynı renk, siluet, kontur ve malzeme
  kalitesinde bir saha örneği görsel olarak kabul edilirse bağlanabilir.
- Gerçek oyun görünürlüğü ve hareket denemesi kullanıcıda; otomatik kontroller
  bu görsel onayın veya gerçek cihaz performans testinin yerine geçmez.

## Önceki teknik deneme — hibrit 3D Lazer pilotu (reddedildi, oyundan çıkarıldı)

Kullanıcı 360° için açıları tek tek üretmek yerine sahaya uygun yöntemi seçmemizi
istedi ve 18:02 ekranında hücre cihazlarının görünmediğini bildirdi. Mevcut SVG/DOM
hücreler, kablolar, CAN/ısı ve etkileşimler korunarak cihaz katmanı için **hafif
ortografik 3D + 2D güvenli alternatif** seçildi. İlk pilot yalnız Lazer'dir;
diğer modüllerin tamamının 3D'ye geçtiği iddia edilmez.

- Görünürlük düzeltmesi: eski ikon grid/inline-size/block-size kurallarıyla
  içerik ölçüsüne bağımlı auto kutu zinciri kaldırıldı. Cihaz kabı açık calc
  ölçüler, grid-area sıfırlama ve stretch; iç rig %100×%100 mutlak kutu kullanır.
  Gerçek tarayıcı sonucu kullanıcı tarafından teyit edilecek.
- `client/src/battle/laser-3d-pilot.js`: tek parametrik, parçalı gerçek 3D mesh;
  1.920 üçgen / 230.400 bayt GPU vertex verisi. Her yerleşimde model verisi
  paylaşılır; tek ortak WebGL canvas/context ve Lazer başına bir çizim çağrısı.
  Doku, gölge haritası, yeni kütüphane/CDN, kare-kare yeni çizim yok.
- Kaide shader'da sabittir; üst parça sunucunun gerçek hedefinden hesaplanan
  tam açıda yumuşak yaw ve kısa geri tepme yapar. Sayısal hedef açısı dört yönlü
  sprite pozuna yuvarlanmaz. Mesh teknik pilottur, nihai illüstrasyon eşleşmesi
  veya bütün modüllerin bitmiş 3D sanat paketi değildir.
- Orta/yüksek grafikte desteklenen GPU kullanılır. Düşük grafik, destek/derleme
  hatası veya context kaybında 2D görünür kalır/geri gelir. 2D ancak başarılı
  çizimden sonra gizlenir. Gizli sayfa/maç bitişi durur; kopan hostlar temizlenir.
- Hareket kısa süreli olarak mevcut tek saat sahibini uyandırır; ikinci rAF
  döngüsü kurulmaz. HUD/tahta 250 ms denetimi hareket karelerinde delinmez.
- Eski 39 WebP (999.974 bayt) 2D alternatif/katalog için korunur. 37 betik,
  13 stil ve asset allowlist sözdizimi/audit başarılı; eski 20 i18n uyarısı sürer.
- **49 yalıtılmış test geçti:** geometri, 360 açı, kaide/üst ayrımı, mock WebGL
  yaşam döngüsü, geri dönüş, tek saat ve mevcut tahta/kart/sunum kontrolleri.
  GPU shader çalıştırması, tarayıcı görünümü ve cihaz FPS testi yapılmadı.
  Sunucu, kullanıcının sekmeleri, dağıtım ve native paketlere dokunulmadı.

Modelden derinlik tamponuyla alınan çevrimdışı teknik örnek:
`artifacts/visual-refresh-pack08a-20261016/laser-3d-pilot/laser-model-preview-depth.webp`.
Bu oyun/GPU ekran görüntüsü değildir. Kaynak mesh aynı model kodudur; raster
sanat yeniden çizilmedi. Kullanıcı yerelde önce cihaz görünürlüğü ve Lazer
yönelmesini değerlendirecek; kabul/performans sonrası diğer cihazlara genişletilir.

Teknik dayanaklar: [ortografik kamera](https://threejs.org/docs/pages/OrthographicCamera.html),
[WebGL uygulama ilkeleri](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

## Önceki bağlama aşaması — 16 Ekim, Sönümleyici onayı sonrası

İlk 10 cihaz **istemci kaynaklarına bağlandı**; Sönümleyici adı istemci, katalog,
çeviri ve savunma etiketi kaynaklarında güncellendi. Dağıtım yapılmadı.
`armor` ID'si, temel 180 CAN / %25 azaltma / 3 sn'de 5 kendi onarımı ve
hesaplar değişmedi. Faz Zırhı ayrı kaldı; eski Zırh ad-alias'ı görsel için desteklenir.

- Lazer, Darbe Topu, Füze Fırlatıcı, Onarım ve Soğutucu için dörder çizilmiş
  yön; üç ayrı sabit kaide/şasi, Onarım için dört kol-kaldırma çalışma pozu,
  Soğutucu'nun önden görünen rotoru için iki ek çalışma karesi. Dönüşler dört
  yönlü sprite seçimi; kesintisiz 360° / 3D kemik animasyonu değildir.
- `client/src/module-device-art.js` ortak eşleme; diğer 26 modül ve çekirdek
  çizimleri eski sistemde kalır. Koleksiyon/deste/raf kart sunumunu korur;
  ilk 10'un sahadaki görünümü cihaz + sabit CAN/ısı çubuklarıdır.
- `client/src/battle/module-motion.js` gerçek sunucu kaynak/hedef kimliklerine
  bağlanır. Ekran koordinatları mevcut toplu geometri önbelleğinden alınır.
  Bekleme → yönelme → çalışma → toparlanma; silah üst-parçasında kısa tepme.
  Onarım kol pozu değişir; fan yalnız soğutma çalışması boyunca kare değiştirir.
- Aynı çevrimde çok hedefli destekte ilk gerçek hedef gösterilir; ek oyun
  eylemi üretilmez. Kendi onarımı komşu hedef uydurmaz. Eski/tekrarlanan olay,
  yıkım (görüntüden önce gelse de), güç kaybı, aşırı ısı, maç bitişi, gizleme ve
  oturum değişimi ele alınır. Düşük grafik/azaltılmış harekette yön pozu statiktir.
- Kalıcı DOM, aynı kaide/üst-resim düğümleri ve mevcut ana kare döngüsü korunur.
  Hücre başına interval, yeni rAF sahibi ve kare başına kart üretimi yoktur.
- Yeni ışın, füze uçuşu, soğuk hava, parçacık VFX'i eklenmedi. Mevcut efektler
  korunur. Sönümleyici'nin piston animi gibi ek cihaz pozları sonraki görsel iştir.

**Varlıklar:** `client/assets/ui/modules-physical-v1/`: 39 gerçek alpha WebP,
toplam **999.974 bayt**. 10 katalog resmi 384 px; 29 parça/poz resmi 256 px.
HTML inert allowlist bütün dosyaları web/native derlemeye dahil eder.
Masterlar ve teknik poz karşılaştırması Git dışı
`artifacts/visual-refresh-pack08a-20261016/rev4-runtime/` altındadır.
`rig-registration-preview.webp` oyun ekranı değil, parça birleştirme kontrolüdür.

**Doğrulama:** 25 yalıtılmış Node kontrolü geçti (hareket, kalıcı kart ve tahta).
`tools/audit-module-device-art.cjs`: 39 dosya, alpha/boyut/yön farklılıkları,
web/native allowlist, 36 betik / 13 stil sırası ve JS/CSS hedef sözdizimi geçti.
Katalog mekanik AST'si değişmedi; combat AST farkı yalnız görünür isimdir.
Önceden var olan 20 i18n duplicate-key uyarısı kaldı; yeni CSS uyarısı yok.
Kayıt: `qa_reports/visual-refresh-pack08a-runtime-20261016.json`.
Tarayıcı, sunucu, üretim derlemesi, native paket, dağıtım veya commit çalıştırılmadı.
Yerel oyun/görsel değerlendirme kullanıcıdadır; bu doğrulama FPS ölçümü değildir.

Yerleşik imagegen ile üretilen pozların prompt kayıtları:
`GORSEL_DONUSUM_PAKET08A_RUNTIME_POZ_PROMPTLARI_20261016.json`,
`GORSEL_DONUSUM_PAKET08A_POZ_DUZELTMELERI_20261016.json`,
`GORSEL_DONUSUM_PAKET08A_FAN_POZLARI_20261016.json`,
`GORSEL_DONUSUM_PAKET08A_FUZE_SOL_ALT_DUZELTME_20261016.json`.

**Sonraki kapı:** Kullanıcının yerel 8A değerlendirmesi; ardından 8B/8C/8D
kalan 26 modül, çekirdekler en son. Aşağıdaki pilot kayıtları tarihçedir.

## Onay ve kapsam

- Kullanıcı Sönümleyici'yi onayladı ve diğer hareketli modüllerin pozlarının
  hazırlanıp gerçek hareket kurallarına bağlanmasını istedi. Kaynak bağlantısı
  yukarıdaki kapsamda yapıldı; çalışan sunucuya/dağıtıma dokunulmadı.
- Kullanıcı bütün sınıflarda gerekirse görsel renk değişikliğine izin verdi.
  İlk v2 mevcut beş renk kimliğini korur; malzeme/işlev vurguları ekler.
- Başlık/isim ve mekanik kimliği ayrıdır. Yeni isim taslağı onaylandıktan sonra
  katalog/çeviri/ad-alias karşılıkları birlikte güncellenir; kayıt ID'leri değişmez.
- VFX (ışın, soğuk hava, mermi, parçacık, isabet) sonraki ayrı paket. Bu aşama
  model, poz, pivot, hedefe yönelme ve hücre sunumudur; hazır VFX iddiası yok.

## Zırh yerine Sönümleyici — onaylandı

`armor` ID'si ve savunma sınıfı korunur. Giysi/insan göğüslüğü yerine kendi
şasisini koruyan mavi mekanik darbe sönümleme ünitesi. Onaylı isim
**Sönümleyici / Dampener**. Bu değişim Kalkan/Yansıtıcı/Faz Zırhı mekanikleriyle
karıştırılmayacak: yeni dome, yansıtma veya komşu koruması verilmez.

Katalogdan doğrulanan mevcut başlangıç davranışı: kendisine gelen hasarı %25
azaltma; 3 saniyede bir 5 CAN kendi onarımı; 180 temel CAN. Seviye/ısı/enerji
ve diğer mevcut çarpanlar aynı kalır. İsim değişikliği bu değerleri değiştirmez.
Kaynaklar: server/app/game/catalog.py, catalog_view.py ve _process_armor_regen.

## Tahta ve koleksiyon birbirinden ayrılır

- Koleksiyon/deste/raf: mevcut kart ile isim, seviye ve maliyet okunabilir.
- Hücreye yerleşince: kart çerçevesi ve kart üzeri metin kalkar; sadece cihaz,
  hücre zemini/bağlantıları, can/ısı göstergeleri ve gerekli durum işaretleri.
- Can ve ısı çubukları hücre/oyuncu okuma yönünde sabit kalır, cihazla dönmez.
  Isı seviyesi ve aşırı ısınma durumu şekil/etiketle de anlaşılır.
- Seçim, sürükleme, bırakma, tap-drop-target, debris-cell, 5×3 hücre geometrisi,
  kablo/bağlantı noktaları, sunucu yerleşim doğrulaması ve hedefleme korunur.
- Rakibin cihazı oyuncuya bakabilir; UI metni/barlar ayna çevrilmez. CSS ile
  bütün kartı/rakip alanını döndürme çözümü uygulanmaz.

## Hareket matrisi

| Modül | Sabit bölüm | Hareketli bölüm / eylem |
| --- | --- | --- |
| Lazer | Ayak ve taban | Hedefe dönen silah başlığı; hazır → ateşleme pozu → kısa geri dönüş |
| Darbe Topu | Ağır şasi | Hedefe dönen geniş namlu; kısa geriye tepme → toparlanma |
| Füze Fırlatıcı | Kaide | Hedefe dönen dolu füze rafı; fırlatma pozu; mühimmat görüntüsü sunumdur |
| Onarım | Hücrede duran palet/ayak | Üst gövde hedefe yönelir; iki kol kalkar → bakım pozu → iner |
| Soğutucu | Yeni alt kaide | Üst fan gövdesi hedefe yönelir; ayrı fan rotoru çalışır; hava VFX sonra |
| Kalkan | Jeneratör tabanı | Hazır/aktif/sönük durum; alan VFX sonradan ayrı katman |
| Batarya | Enerji şasisi | Gerektiğinde küçük güç çevrimi; bütün cihaz boş yere sallanmaz |
| Güçlendirici | Şasi | Bobin/iletim parçasında kısa çalışma pozu; ışık VFX sonra |
| EMP | Kaide | Verici/kapasitör kısa etkinleşme; darbe halkası VFX sonra |
| Sönümleyici | Savunma şasisi | Darbe pistonları basılır/toparlanır; kendi onarım pozu |

## Gerekli gerçek varlıklar

Tek 3/4 PNG'nin tamamını döndürmek nihai çözüm değildir: taban döner, perspektif
bozulur ve bakım kolları hareket etmez. Döner cihazlarda base/head, fanlı cihazda
body/rotor; Onarım'da idle/raised çalışma pozu ve gerekirse ayrı eklemler gerekir.
Hepsi aynı tuval, kamera, ölçek ve pivot koordinatlarını kullanmalı.

Üç çeyrek perspektifte gerçek yatay dönüş, ekranda basit rotate() ile aynı
değildir. Önce tek döner modülde sabit kaide + yön varyantları pilotu hazırlanır;
onay sonrası gerekli açı sayısı okunabilirlik/atlas maliyetiyle belirlenir.
Ardından aynı sözleşme diğer dört yönelen cihaza uygulanır. Katalog için tek
güzel render ile savaşta kullanılan yön/poz atlası ayrı ihtiyaçlardır.

Manifest alanları: moduleId, version, canvas, pivot, base, directionalHead veya
poses, muzzleSocket/toolSocket/airSocket, actionDuration, frameBounds. Bu alanlar
henüz üretilmemiş dosyalara sahte yol vermeyecek; hazır varlıklar ayrıca listelenir.

## Olay ve performans sözleşmesi

- Dönüş/aksiyon gerçek saldırı, module_repaired ve module_cooled olaylarının
  source_module_id/target_module_id ve o anki hücre konumlarına bağlanır.
  Isı/CAN da sunucu durumundan gelir; animasyon hasar/onarım üretmez.
- Sunucuda sonuç bekletilmez; yalnız sunum kısa aim/action/recover evreleriyle
  oynar. Birikmiş eski olaylar animasyon kuyruğu olarak tekrar gösterilmez.
- Kaynak/ hedef yoksa veya modül yıkıldıysa güvenli bekleme pozuna geçilir.
  Kendi kendine onarımda başka hücreye ışın/yönelim uydurulmaz.
- Kalıcı savaş DOM'u korunur. Hücre başına yeni interval ve her karede kart
  yeniden üretimi yok. Geometri okumaları toplu; etkin cihazlara sınırlı
  presentation güncellemesi. Gizli sekmede durdurma, düşük grafik ve azaltılmış
  hareket için statik/az pozlu yol bulunur. Savaş VFX bütçesi ayrıca korunur.

## Uygulama sırası / güncel durum

1. Fiziksel v2 katalog çizimleri: **10 hazır, onay bekliyor**.
2. Zırh alternatifi, Onarım çalışma pozu, Soğutucu döner kaidesi: **rev3 adayları hazır**.
3. **İlk poz/yerleşim pilotu hazır:** Lazer dört ayrı yön çizimi; Onarım idle/active;
   5×3 örnek hücre alanında cihazı yerleştir/kaldır, sabit can/ısı çubukları.
   Bunlar nihai parça/pivot rig'i değildir. Yönler arası kaide/pivot/ölçek farkları
   hâlâ hizalanmalı, ara yönler/yumuşak hareket ve gerçek olay adaptörü hazırlanmalı.
4. Aynı yapı dört diğer yönelen cihaza; tüm modüllerin bekleme/çalışma durumları.
5. Kullanıcı onayı sonrası ortak modül eşlemesi ve kalıcı savaş renderer bağlantısı.
6. VFX ayrı onay paketi. Çekirdekler modüllerden sonra.

Bu belge hareket animasyonlarının tamamlandığı iddiası değildir. Rev2 tek
pozlu cihaz çizimidir; gerçek parça/yön atlasları henüz tamamlanmadı. Yeni
tarayıcı, test sunucusu veya üretim oyunu üzerinde deneme başlatılmaz.

## Dosyalar ve doğrulama kaydı

- v2 cihazlar: `artifacts/visual-refresh-pack08a-20261016/rev2-physical/`;
  on 384px WebP toplam 443.434 bayt. Asıl PNG'ler değişmeden saklandı.
- v3 pozlar: `artifacts/visual-refresh-pack08a-20261016/rev3-motion-concepts/`;
  altı yeni 384px WebP toplam 244.872 bayt, gerçek alpha. Bunlar 3 cihaz/poz
  revizyonu + 3 ek Lazer yönüdür; ilk Lazer sağ üst pozu v2'den gelir.
- `gridshard-module-motion.html`: yalıtılmış 270.620 baytlık poz/yerleşim örneği;
  aynı kaynak thread görselleştirme dizinine kopyalandı. Oyun verisi/bağlantısı yok.
- `motion-concepts-v3.webp` ve `pack08a-physical-v2.webp`: büyük karşılaştırmalar.
- Tam built-in imagegen prompt setleri:
  `GORSEL_DONUSUM_PAKET08A_FIZIKSEL_REV2_20261016.json`,
  `GORSEL_DONUSUM_PAKET08A_HAREKET_REV3_PROMPTLAR_20261016.json`,
  `GORSEL_DONUSUM_PAKET08A_LAZER_YON_PILOTU_20261016.json`.
- QA: `qa_reports/visual-refresh-pack08a-physical-v2-20261016.json`,
  `visual-refresh-pack08a-motion-v3-20261016.json`,
  `visual-refresh-pack08a-motion-preview-20261016.json`.

Yalıtılmış örnek mantığında 4 farklı Lazer resmi, 2 Onarım pozu, yerleştirme/
kaldırma, bar görünürlüğü, kayıt/geri yükleme ve 15 hücre doğrulandı. Önceki
10 masterın hashleri değişmedi. 1MB sınırı/yerel data resimleri kontrol edildi.
Tarayıcı çizimi, oyun/birim testleri ve üretim entegrasyonu yapılmadı. Büyük
PNG'ler/önizleme Git dışı `artifacts` altındadır; başka bilgisayara ayrıca taşınır.
