# Üç yayın grubunda oyuncu kozmetiği — üretim brief'i

Güncel hedef: **9 yeni çerçeve + 9 yeni zemin**, altışar öğelik 2.5/S2, 2.6/S3 ve 2.7/S4 grupları. 2.4.0 ilk sezonu bu yeni öğeleri beklemez. Durum: taslak brief;
bu tabloda adının bulunması öğeyi çizilmiş, onaylanmış veya kazanılabilir yapmaz.
Yeni öğeler henüz `cosmetic_releases_v1.json`'a eklenmez.

Ortak yön: mevcut boyalı malzeme, geniş pahlar, üst-sol ışık ve lacivert yüzey.
Renk varyasyonu özgün motif sayılmaz. Her öğenin ayrı tasarım kimliği, TR/EN adı,
silüet/kompozisyonu ve 320/393 px kanıtı olacak. İlk inceleme en fazla altı
öğe; bütün paketler en fazla on özgün öğe sınırında kalır.

| Taslak çift | Çerçeve yapısı | Zemin kompozisyonu | İngilizce tema adı |
| --- | --- | --- | --- |
| Manyetik Köprü | İki kalın kemer ve üstte bağlayıcı metal kilit | Karşı kıyılara oturan tek geniş köprü, profil metni için açık orta alan | Magnetic Bridge |
| Bakır Örgü | Köşelerde birbirinin üstünden geçen yassı metal şeritler | İki kenarda yön değiştiren geniş örgü paneller | Copper Weave |
| Kırık Halka | Üç asimetrik halka parçası, tek belirgin açıklık | Merkezden uzak üç büyük kırık daire levhası | Broken Ring |
| Reaktör Kepengi | Dört kalın içe açılan kanat ve köşe menteşeleri | Altta birleşen üç geniş zırh kanadı | Reactor Shutter |
| Prizma Yuvası | Altıgen yuva ve altta tek iri kristal dayanak | Bir kenarda üç yüzlü büyük prizma ve mat gölge | Prism Cradle |
| Türbin Dişlisi | Sekiz geniş diş, ara boşlukları okunur dış silüet | Köşede kısmen görünen büyük türbin, geniş kanat yüzeyleri | Turbine Gear |
| Seramik Siper | Ayrık, yuvarlatılmış üç zırh bloğu ve metal bağlar | Üst ve alt kenarda farklı boyutta seramik plakalar | Ceramic Bastion |
| Kablo Kemeri | Üstte iki kalın kablo, altta bağlantı ayakları | İki köşeden geçen tek kablo demeti; metin alanına girmeyen rota | Cable Arch |
| Kristal Kıskaç | İki açılı çene, yanda kısa kristal uçlar | Köşeleri tutan iki iri kristal, ortada sakin malzeme | Crystal Clamp |

Her çift iki ayrı öğedir; aynı küçük motif kopyalanıp büyütülmez. Mevcut
Kutup Işığı yayları, Güneş Ocağı ışınları ve Derin Akım dalgaları yeni ID ile
tekrar sunulmaz. Renderer için yeni geometriler açıkça eklenip mevcut üç
desenin görünümü korunacak. Taslak TR/EN öğe adları üretim sırasında
çerçeve/zemin ayrımıyla kesinleştirilir.

## İnceleme sırası

1. Manyetik Köprü, Bakır Örgü, Kırık Halka: altı öğelik ilk örnek.
2. Reaktör Kepengi, Prizma Yuvası, Türbin Dişlisi: altı öğelik ikinci örnek.
3. Seramik Siper, Kablo Kemeri, Kristal Kıskaç: altı öğelik üçüncü örnek.

Önce profil başlığı, özelleştirme küçük seçeneği ve ziyaret profili üzerinde
yan yana karşılaştırma; ardından TR/EN ve kilit/seçili durumlar. Sanat kabulü
olmadan durum `approved` yapılmaz. Dönem/kaynak tahsisi stok ve kart kapısından
sonra yapılır; bu brief herhangi bir ödül sözü veya yayın başlangıcı değildir.

Her hafta kozmetik isteyen eski profil 18/20 ek öğe ister; güncel ilk-sezon kaynak haftası profili farklıdır. Gerçek dönem ihtiyacı yeni ödül türlerine göre hesaplanır. İki mağaza çifti 2.5.0'a aittir ve bu listedeki 18 öğeden seçilmez.

## 11 Kasım üretim bağlantısı

Güncel kaynak/dönem eşlemesi, erken hazırlık sırası ve takım/mağaza ayrımı
[üretim takviminde](two-cycle-production-calendar.md) tutulur. İlk iki örnek
Manyetik Köprü çiftidir; [S2 kabul listesi](art-2.5.0-acceptance.md) şu anda
brief durumundadır. Yeni geometri renderer desteği ve S2 sonrası açık kaynak
haftası profili üretilmeden yalnız öğe adlarını kataloğa eklemek yeterli değildir.
