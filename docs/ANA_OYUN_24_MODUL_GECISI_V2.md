# GRIDSHARD ana oyun — 24 modül geçişi

30 Ekim 2026. Bu belge, önceki ayrı deney ve aday tasarım notlarının yerine ana oyun kaynağını açıklar.

## Uygulanan kurallar

Saldırı/Savunma/Taktik; tek savaş ekonomisi Akım. Başlangıç 6, depo 12, temel yenilenme 2,2 saniyede 1. Mevcut günlük Akım Desteği etkinliği korunur. Enerji ve Isı kullanılmaz. Aynı kart ve sınıf yerleştirme kotası yoktur; çekirdek dışında 14 boş hücre fiziksel sınırdır. Altı farklı kartlık destede en az bir saldırı kartı bulunur.

Mevcut rastgele boş hücre seçimi ve öncelikli hedef türleri/sırası korunur. Üç görünen sınıf, geriye dönük teknik hedef profilinden ayrıdır. Uzatma hasarı/onarım cezası ve zorunlu maç süresi yoktur. Testteki 900 saniye yalnız gözlem sınırıdır; oyun kuralı değildir. Mevcut boş hücresi ve dolu Akımı varken 30 saniye hiç kart oynamayan oyuncunun çekilmiş sayılması kuralı korunur.

## Aktif katalog

| Kart | Sınıf | Enderlik | Arena | Akım | CAN | Ana hasar | Çevrim | Görev |
|---|---|---|---:|---:|---:|---:|---|---|
| Lazer | Saldırı | Yaygın | 1 | 3 | 220 | 12 | 1 sn | Hedefe düzenli ateş eder. |
| Darbe Topu | Saldırı | Yaygın | 1 | 3 | 198 | 30 | 2.5 sn | Hazırlanıp tek ağır atış yapar. |
| Kalkan | Savunma | Yaygın | 1 | 3 | 240 | — | 1.2 sn | Kendisine gelen tek isabetin bir kısmını engeller. |
| Zırh | Savunma | Yaygın | 1 | 3 | 288 | — | 0 sn | Kendi aldığı hasarı sürekli azaltır. |
| Onarım | Taktik | Yaygın | 1 | 3 | 180 | — | 2 sn | En yaralı dost modülü onarır. |
| Güçlendirici | Taktik | Yaygın | 1 | 3 | 162 | — | 3 sn | Bir dost silahın sonraki atışını güçlendirir. |
| Bariyer | Savunma | Yaygın | 2 | 3 | 360 | — | 0 sn | Mevcut hedef kuralındaki önceliğiyle ateşi üzerine çeker. |
| EMP | Taktik | Nadir | 2 | 3 | 144 | — | 6 sn | Mevcut hedef tercihine göre bir düşman modülünü kısa duraklatır. |
| Ray Topu | Saldırı | Nadir | 3 | 4 | 275 | 38 | 3 sn | Zırh azaltımının bir kısmını delen atış yapar. |
| Arındırıcı | Taktik | Nadir | 3 | 3 | 200 | — | 4 sn | Bir dost üzerindeki bir olumsuz etkiyi kaldırır. |
| Seri Top | Saldırı | Yaygın | 4 | 3 | 240 | 8 | 2.1 sn | Aynı hedefe üç küçük mermilik seri atar. |
| Yansıtıcı | Savunma | Nadir | 4 | 3 | 240 | — | 1.5 sn | Kendi aldığı bir isabetin bir kısmını saldırana geri yollar. |
| Füze Fırlatıcı | Saldırı | Nadir | 5 | 4 | 231 | 34 | 3 sn | Hazırlığını göstererek ağır füze atar. |
| Hız Rölesi | Taktik | Nadir | 5 | 3 | 170 | — | 5 sn | Bir dost silahın sonraki atışından sonraki beklemesini kısaltır. |
| Dron Üssü | Saldırı | Nadir | 6 | 3 | 242 | 8 | 0.9 sn | İki hedefe paylaştırılmış küçük dron saldırısı yapar. |
| Muhafız Kubbe | Savunma | Nadir | 6 | 4 | 320 | — | 2 sn | Başka bir dosta gelen tek isabetin bir kısmını engeller. |
| Ark Topu | Saldırı | Epik | 7 | 4 | 275 | 22 | 1.8 sn | Elektriği öncelik sırasındaki ikinci hedefe sıçratır. |
| Tampon | Savunma | Epik | 7 | 3 | 250 | — | 6 sn | Ateş altındaki dosta geçici CAN kalkanı verir. |
| Plazma Havanı | Saldırı | Epik | 8 | 5 | 270 | 32 | 3.6 sn | Uzun hazırlık sonunda üç hedefe plazma saçar. |
| Faz Zırhı | Savunma | Efsanevi | 8 | 4 | 280 | — | 6 sn | Belirli aralıklarla kısa süre vurulmaz hale gelir. |
| Kuantum Tekrarlayıcı | Saldırı | Efsanevi | 9 | 4 | 250 | 10 | 1.4 sn | Aynı hedefe dördüncü isabetinde güçlü atış yapar. |
| Kalkan Kırıcı | Saldırı | Epik | 10 | 4 | 230 | 22 | 2.2 sn | Tek isabetlik periyodik blokları delen atış yapar. |
| Yavaşlatıcı Virüs | Taktik | Epik | 11 | 3 | 160 | — | 7 sn | Bir düşman modülünün eylem aralığını kısa süre uzatır. |
| Son Siper | Savunma | Efsanevi | 12 | 3 | 320 | — | 0 sn | Yıkıldığında çekirdeğin CAN kalkanını tamamlar. |

Sayılar 1. seviye içindir. Sıfır çevrim pasif etki demektir. Modüllerde CAN/hasar ve mutlak onarım-kalkan değerleri ortak %4 seviye eğrisiyle büyür; yüzdeler ve süreler büyümez. Enderlik ayrı CAN, hasar, hız veya Akım çarpanı eklemez. 8 Yaygın / 8 Nadir / 5 Epik / 3 Efsanevi.

Parametrelerin tek kaynağı `server/data/module_roster_v2.json`; kart bilgi ekranı ve savaş aynı değerleri okur. Yeni kartlar Seri Top, Kalkan Kırıcı, Tampon, Son Siper, Arındırıcı ve Hız Rölesi. 12 arenanın mevcut adları ve kupa eşikleri korunur; her arenada en az bir yeni kart açılır.

## Çekirdekler

Yararlanacak modülleri çekirdek kendisi seçer. Oyuncu yalnız kullanma anını belirler. İlk dolum 20, sonraki dolumlar 35 saniye. Geçerli hedef yoksa dolum harcanmaz. Dolum ve yararlanıcılar enderliğe göre değişmez.

| Çekirdek | Güç |
|---|---|
| Rezonans | Çekirdeği ve en yaralı iki modülü azami CAN’larının %18’i kadar onarır. |
| Muhafız | Çekirdeğe ve iki modüle 5 sn boyunca azami CAN’larının %20’si kadar kalkan verir; ateş altındaki dost önceliklidir. |
| Aşırı Yük | Uygun iki silahın sonraki üç atışını %50 güçlendirir; hedefleri otomatik seçer. |
| Kesinti | Rakibin hasarı yüksek iki silahını 1,5 sn duraklatır. |
| Akım | Depodaki boşluğa göre 3 Akım kazandırır; depo doluysa dolum korunur. |
| Anka | Yıkılmış uygun bir modülü boş hücrede %40 CAN ile yeniden kurar. |
| Kuantum | Devre yaralıysa çekirdeği ve iki dostu onarır; tam canlıysa bu hedeflere kalkan verir. |

Rezonans ve Kuantum en yaralı iki dostu seçer; Muhafız ateş altındaki dostu önceler. Aşırı Yük mevcut yükü tamamlanmamış uygun silahları seçer. Anka saldırı kartlarını ve yüksek Akım bedelini önceler. Oyuncu elle yararlanıcı seçemez. Eski bileşik yetenek dalları uygulanmaz; seçimleri özel arşivde korunur. Çekirdeklerin mevcut CAN eğrisi 450 × 1,08^(seviye−1) olarak kalır.

## Günlük meta

Eski Sistem/Destek/Sabotaj günlük metaları Taktik kimliğine eşlendi. Beş yararlı seçenek: Saldırı hasarı +%10, Savunma CAN +%10, Taktik CAN +%10, Çekirdek CAN +%10 ve Akım üretimi +%15. Çark beş eşit dilim gösterir; kayıtlı eski seçimler kaybolmaz. Bu artışlar savaş motorunda uygulanır.

## Oyuncu verisi geçişi

Kullanıcı kararı: kaldırılan 18 modülün mevcut parça bakiyeleri 1:1 evrensel parçaya aktarılır. Eski seviyeler ve seçimler özel arşivde tutulur; korunan kartların seviyeleri korunur. Tekrar yükleme dönüşümü tekrarlamaz. İmzalı iade borçları da 1:1 taşınır; borç sıfırlanmaz. Eski kartlara ait sonradan gelen ödül/iade hareketleri de evrensel parçaya yönelir. İşlem fişleri değiştirilmez. Geçersiz eski desteler geçerli başlangıç kartlarıyla tamamlanır.

Bu çalışma gerçek oyuncu kayıtlarını açıp dönüştürmedi. Geçiş normal profil yükleme/kaydetme yoluna bağlandı ve izole verilerde test edildi. Üretime çıkış öncesi sunucu/veri yedeği ve güncel istemci birlikte hazırlanmalıdır.

## Görseller ve okunabilirlik

Altı yeni kart için şeffaf PNG master ve WebP çalışma dosyaları üretildi. İki silahın sekiz yönü kayıtlandı. Aktif görsel kaydı yalnız 24 kart ve yedi çekirdeği kapsar; 187 emekli görsel aktif kaynaklardan `artifacts/retired-v2/` arşivine taşındı. Üretim paketinde emekli kart görseli kullanılmaz. Yeni kartların ilk sürüm sesleri uygun mevcut kısa sesleri paylaşır; altı özgün ses henüz üretilmedi.

Kaynak: `client/assets/ui/modules-physical-v3/`; üretim istemleri `prompts.json` ve `yaw-prompts.json`. Yerleşik image_gen kullanıldı. Ana savaşta kalkan CAN’ı, yavaşlama, kesinti, atış/hız yükleri rozetlerle görünür. Tam öğretici Ayarlar’dan isteğe bağlıdır; ilk savaşta iki kısa, atlanabilir ipucu vardır, savaş okumayı beklemez. Gerçek tarayıcıda ipucu Lazeri gösterirken Kalkan oynanabildi; ipuçları kendiliğinden kapandı ve 20 saniyede dolan çekirdek otomatik yararlanıcılarıyla kullanıldı. Savaş rafı isimleri tek satır kalır.

## Sezon planı

Her sezon en az bir yeni modül. Katalog birikir: başlangıç 24, sonraki sezon en az 25; sezon sonunda kart kaldırılmaz. Yeni kartı sadece ücretli oyuncuya güç avantajı olarak kapatan erişim yoktur. Aşağıdakiler henüz oynanabilir kart değil, üretim sırasıdır.

| Sonraki sezon | Kart | Sınıf | Arena açılışı | Görev |
|---:|---|---|---:|---|
| +1 | Yankı Rölesi | taktik | 3 | Bir silahın sonraki atışını düşük güçlü ikinci bir vuruşla tekrarlar. |
| +2 | Kor Fırlatıcı | saldırı | 5 | Doğrudan vuruştan sonra kısa süreli yanma bırakır. |
| +3 | Darbe Muhafızı | savunma | 7 | Aldığı vuruşlarla dolan tek kullanımlık koruma üretir. |
| +4 | Toparlanma Feneri | taktik | 9 | Bir dost yok olduğunda tek bir yaralı dostu onarır. |

Her yeni kartın yayın kontrolü: çalışan mekanik, görsel, karşı oyun, denge testi, arena açılışı ve ücretsiz kazanım yolu. Bunlar tamamlanmadan `validate_season_release` yayını kabul etmez. Sezon tarihleri mevcut sezon takviminden gelir; burada takvim değiştirilmez.

## Test ve sınırlar

746 istemci testi ve 10 paketleme testi geçti. Ana motor/ödül/iade/veri geçişi/PvP/öğretici/günlük meta/simülasyon için seçilen 177 sunucu testi geçti. Tüm tarihsel sunucu test kümesi yeşil değildir: eski enerji/ısı aksiyonlarını doğrudan çağıran, kaldırılan kartları veya eski bot destelerini bekleyen testler hâlâ eski kurallara bağlıdır. Bunlar yeni oyun doğrulaması olarak sayılmadı; geniş denetim günlüğü `artifacts/main-v2-full-server-audit2.log`.

Ana motorla 56 bot eşleşmesinin 56 tanesi doğal bitti. 59.4–237.7 sn; ortanca 99.3 sn. Bütün 24 kart gözlendi; toplam 338 çekirdek kullanımı. 1. ve 15. seviyeler. Bunlar insan kazanma oranı veya bütün deste kombinasyonlarının dengeli olduğunun kanıtı değildir.

İlk 42 eşleşmede 3 adet 900 saniyelik gözlem aşımı vardı. Botun devre büyürken saldırı kapasitesini de artırması tercih puanıyla sağlandı; oyuncuya kota eklenmedi. Sonraki 56 eşleşmede gözlem aşımı kalmadı. Sayısal modül değerleri bu bot düzeltmesinde değiştirilmedi.

Ana tarayıcı: koleksiyon24, sınıf3, altı yeni görsel, canlı yerleştirme ve sonuç akışı; 320×740,393×852,1080×1000 ölçülerinde yatay taşma0,JS/eksik görsel hatası0. Kanıt `artifacts/main-roster-v2/`. Telefon/APK/Play Store ve üretim sunucusu bu tur güncellenmedi.

Sonraki yayın kapısı: tarihsel sunucu sözleşmelerini yeni kadroya taşıma, gerçek oyuncu strateji testi ve ardından yeni sunucuya bağlı telefon paketi. Ayrı deney sunucusu kapatıldı ve kaynakları arşivlendi.
