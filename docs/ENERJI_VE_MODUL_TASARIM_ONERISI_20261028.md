# Enerji ve modül tasarımını sadeleştirme önerisi

> Bu ilk çerçevenin ayrıntılı devamı: `AKIM_UC_SINIF_MODUL_CALISMASI_V1.md`.
> Dron/Hedefleme görev ayrımı, hedef/hat kuralı, sayısal adaylar ve36kartın
> kapsamı yeni çalışmada netleştirildi. İkisi de tasarım önerisidir.

28 Ekim 2026. **Bu belge tasarım önerisidir; enerji kaldırılmadı, kartlar
silinmedi ve oyuncu yatırımları değiştirilmedi.** Bu tur uygulanan işler
dört köşe görseli ve süreye bağlı hasar/onarım kuralının kaldırılmasıdır.

## Mevcut üç Sistem modülü ne yapıyor?

| Modül | Gerçek işlev | Tasarım değerlendirmesi |
|---|---|---|
| Batarya | Sürekli üretim ve küçük depo. Taban üretim4,5/sn; depo20. | Üçü içinde en açık görevi olan kart; kalabalık devrenin enerji açığını kapatır. Ama bir düzenin çalışabilmesi için zorunlu oluyorsa taktik tercih olmaktan çıkar. |
| Kapasitör | Enerji üretmez. Depo10; kısa sürede yüklenip yüksek ani harcamayı karşılar. | Batarya ile aynı değil; teknik olarak farklı. Oyuncunun bu farkı çoğu çatışmada okuyabilmesi zor. Üretim açığını çözmez. |
| Akım Dengeleyici | İsminin aksine kurulum Akımı üretmez; bakım ve aksiyon enerjisini tabanda%8 azaltır, çoklu kopya tavanı%24. | Adı iki kaynağı karıştırıyor. Çalışmayan silahın çözümünü oyuncuya ayrıca hesaplatıyor. |

Mevcut oyunda Akım, sürekli enerji, enerji rezervi, bakım, aksiyon tüketimi,
dağıtım verimi, ısı ve bekleme süresi aynı anda bulunuyor. Enerji gerçekte
iş yapıyor; "hiçbir etkisi yok" demek doğru değil. Sorun, ne kadar anlaşılır
ve ilginç karar ürettiği. Sonucun çoğu zaman "silahım çalışsın diye bir kart
yerleştirmeliyim" olması bu oyun için zayıf bir getiridir.

## Ben sıfırdan kursaydım

**Tek ekonomi olarak Akım'ı kullanırdım. Sürekli enerji üretimi, dağıtımı ve
depolarını başlangıç tasarımına koymazdım.** Her modül kurulduktan sonra
görünür bekleme süresiyle işini yapardı. Akım'ın başlangıç6/depo12/2,2sn
değerleri ilk prototip için kullanılabilir; bunlar yeni tasarımın kanıtlanmış
nihai sayıları değildir.

Isıyı da bütün kartların ortak ikinci işletme şartı yapmazdım. Ağır bir
silahın uzun hazırlık/yeniden doldurma süresi zaten bedel olabilir. İleride
bir aşırı yük kartı eklenirse, kısa güçlü dönem ve ardından açıkça görünen
toparlanma olarak tasarlanabilir. Böylece Soğutucu her destenin zorunlu
bakım kartı haline gelmez. Bu, mevcut ısı kodunu bu tur kapattığımız anlamına
gelmez; mevcut oyunda ısı ve enerji korunuyor.

Üç sınıf, ilk prototipte **16 farklı görev** yeterli olurdu. Aynı işi az
farklı oranlarla yapan kartlar yerine her kartın açık bir kullanım durumu,
bedeli ve karşı oyunu bulunmalı.

| Sınıf | Modül | İşlev / bedel / karşı oyun |
|---|---|---|
| Saldırı | Lazer | Düzenli tek hedef ateşi; yayılma yok. Birlikte kurulan savunmayı yavaş söker. |
| Saldırı | Darbe Topu | Seyrek güçlü atış; atış boşa çıkarılırsa büyük tempo kaybeder. |
| Saldırı | Ray Topu | Zırh azaltımının bir bölümünü deler; çıplak hedefte en iyi hasar/sn değildir. |
| Saldırı | Ark Topu | Bir ana ve bir zayıf ikincil hedef; tek hedefte uzman silahı geçmez. |
| Saldırı | Havan | Görünür hazırlıkla küçük alanı vurur; seyrek yerleşim ve kesinti karşı oyundur. |
| Saldırı | Dron Üssü | Koşullu arka hat baskısı; ön cepheye karşı düşük verim. Sınırsız görsel/nesne üretmez. |
| Savunma | Kalkan | Hazır yükle bir saldırının bir bölümünü karşılar; hızlı küçük vuruşlar yükü harcatır. |
| Savunma | Bariyer | Çok CAN, saldırı üretmez; kendi hattını korur. Saf dayanıklılık seçimi. |
| Savunma | Zırh | Daha az CAN, sürekli azaltım; delici silah belirgin karşılıktır. |
| Savunma | Yansıtıcı | Belirli vuruşlardan sınırlı hasar geri verir; hem tam blok hem büyük yansıtma sağlamaz. |
| Taktik | Onarım | Tek hedefi ölçülü onarır; iki silahın odak ateşini tek başına sonsuza kadar karşılayamaz. |
| Taktik | Nano Onarım | İki hedefte daha düşük miktar; yaygın hasara karşı verimli, odak ateşine karşı zayıf. |
| Taktik | Güçlendirici | Yakındaki iki saldırının belirli atışlarını güçlendirir; konum ve yeterli saldırı omurgası ister. |
| Taktik | Hedefleme | Yakındaki silaha koşullu hedef önceliği verir; yalnız başka isimli düz hasar artışı olmaz. |
| Taktik | EMP | Tek modülü kısa süre aksatır; toparlanma aralığı zincir kilidi önler. |
| Taktik | Bozucu | Onarım/destek çıktısını kısa süre azaltır; onarım hatlarına oyuncunun kurduğu karşı oyun. Küresel zaman cezası değildir. |

Sınıf sayısı stratejiyi tek başına sağlamaz. Mevcut oyunda kart konumunu
sunucu seçiyor. Yeniden tasarımda oyuncunun hücreyi seçmesi, ön/arka hattın
ve komşuluğun hedef/koruma kurallarında gerçek etkisi olması daha değerli.
Mevcut5×3 görsel alan kalabilir; bu öneri yeni tahta çizimini zorunlu kılmaz.

### Başlangıç denge hedefleri

- Normal bir silah, aynı seviyedeki tek benzer silaha karşı yaklaşık15–25sn
  yaşayabilsin. Bu bir başlangıç hedefidir; odak ateşi veya ağır karşı kart
  daha hızlı indirebilir. Her durumda aynı ömrü garanti etmek hedef değil.
- İlk20–30sn içinde4–5 parçalı bir düzen kurulabilsin. Savaş kurulum,
  karşılık verme ve cephe kırma evrelerini görünür biçimde içersin.
- Tipik maç2–4dk hedeflenebilir; sırf bu süre doldu diye hasar büyütülmesin,
  onarım düşmesin veya çekirdek aşınmasın.
- Bir karşı kart avantaj sağlasın; tek başına otomatik galibiyet üretmesin.
  Efsanevi kartın değeri yeni bir işlev olsun; düşük maliyetli kartları her
  durumda gereksiz yapan saf sayısal üstünlük olmasın.
- Onarım hattı kırılabiliyor mu, destek yerine yeni silah ne zaman iyi,
  arka hat saldırısı ne zaman gerekli gibi somut kararlar ölçülsün.

## Mevcut oyundan geçiş basit bir silme işlemi değil

Enerjiye bağlı özellikler de yeniden kurulmalı. Örneğin Kuantum Topu'nun
fazla enerji yükü bir atış sayacıyla öngörülebilir özel atışa dönüşebilir;
Prizma Kalkanı'nın enerji dönüşümü ayrı bir kalkan karşılığına; Kesici'nin
enerji hedefi destek/onarım bozma görevine dönüşebilir. Bunlar öneri; aynı
özelliği iki karta kopyalamadan yeniden test edilmeli.

Yedi çekirdeğin güçleri, enerji odaklı yetenek dalları, Batarya/Kapasitör/
Dengeleyici kartları ve yükseltme yatırımları için tek tek geçiş tablosu
gerekir. Mevcut oyuncunun kartı/parçası/harcadığı kaynak sessizce yok edilmez.
Mevcut36 kartın bir bölümünün görselleri yeni farklı görevlerde kullanılabilir;
"36 kartın tamamı aynı anda mutlaka kalsın" şartı prototipin kalitesini
belirlememeli.

Önerilen ilerleme: önce ayrı oynanabilir prototipte tek kaynak/16 görev ve
oyuncunun yer seçmesi; sonra eski düzenle aynı açılış/karşılaşma testleri ve
telefon denemesi; ancak sonuç iyi olursa mevcut kartların dönüşümü.

## Uzatmayı kaldırınca görülen sonuç

Süreye bağlı hasar/onarım kuralı kaldırıldı. 25 deste,36 kart,1/8/15seviyede
taraf değiştirilen1.800maçta gözlem15dk'ya genişletildi. 1.787maç bu süre
içinde bitti;13'ü sürüyordu (8/5/0, seviyelere göre). Bunlar otomatik olarak
berabere sayılmadı veya oyuncu kaybına çevrilmedi. Bazılarında çekirdek CAN'ı
azalmaya devam ediyor; bazıları modül yıkımı/yeniden kurulum döngüsünde.
Bu gözlem kalıcı sonsuzluk ispatı değildir ama uzun onarım döngüsünü açığa
çıkarır. Çözüm olarak zaman cezası geri eklenmedi.

Bu bulgu, onarımın açık karşı oyununun ve destelerin cepheyi gerçekten
kırabilmesinin önemini gösteriyor. Enerjiyi kaldırmanın bu döngüleri kendiliğinden
çözeceği iddia edilemez; enerji kıtlığının kalkması saldırı kadar onarımı da
güçlendirebilir. Dolayısıyla tek kaynak önerisi anlaşılabilirlik ve karar
kalitesi içindir; etkisi ayrı prototipte ölçülmeli.
