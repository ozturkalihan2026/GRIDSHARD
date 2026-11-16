# S2 mağazası — ayrı dört kozmetik için üretim manifesti

16 Kasım 2026. COS-03 / 2.5.0. Dört ayrı özgün SVG çizildi, kaynak/katalog/önizleme entegrasyonu hazır. Sanat geliştirme dalında incelendi; bütün öğeler kilitli ve atanmamış kalır. Satın alma kaynağı SHOP-03'te bağlanacak. Bu kayıt satışa veya S2 açılışına onay değildir.

| Kimlik | TR / EN | Özgün yapı | Havuz |
| --- | --- | --- | --- |
| dockyard_latch_frame | Tersane Kilidi Çerçevesi / Dockyard Latch Frame | İki dikey döküm kelepçe; altta tek geniş kilit. Köprü kemeri veya örgü şerit yok. | shop |
| dockyard_deck_background | Tersane Güvertesi / Dockyard Deck | Kenarda basamaklı iki metal güverte; ortada temiz lacivert profil alanı. Çerçevenin büyütülmüş kopyası değil. | shop |
| workshop_shelf_frame | Atölye Rafı Çerçevesi / Workshop Shelf Frame | Üç kısa kalın raf çıkıntısı ve yana kaymış bağlantılar; portreyi kapatmayan asimetrik silüet. | shop |
| workshop_bay_background | Atölye Bölmesi / Workshop Bay | Alt köşede tek geniş raf ve iki iri bobin; orta metin alanı açık. | shop |

Boyalı metal, geniş pahlar, üst-sol ışık; onaylı dock/sandık/profil ailesi korunur. İnce neon çizgiler ve renk değiştirerek kopyalama yok. İki çiftin palette/siluet karşılaştırması sezon öğeleriyle birlikte yapılır.

- [x] Ayrı design_id (`<kimlik>_v1`), TR/EN, gerçek SVG kaynak ve özgün render şablonu.
- [x] Dört öğe `inventory_pool=shop`; sezonun altı öğesi ve mevcut15 dönem öğesinden ayrı stok. Dönem rezervasyonu bunları seçemez.
- [x] Normal/kilitli/seçili, profil/ziyaret,48px seçenek ve 320/393 TR/EN tarayıcı kabulü.
- [x] Mevcut sunucu sahiplik/kuşanma koruması kullanılır; önizleme hak vermez. Gerçek profil ziyareti seçili zemini de taşır.
- [x] **SHOP-03:** oyun içi kredili edinim adaptörü, cüzdan/limit, sahip olunan ürünü reddetme, atomik/idempotent kredi ve sahiplik kaydı dalda hazır.
- [x] **SHOP-03:** iki set için1.500'er Devre Kredisi pilot fiyatı; örnek pencere draft kalır. Gerçek para yoktur.
- [ ] **BALANCE-01/RELEASE-02:** son ekonomi ve gerçek pilot yayın penceresi kabulü. Sanat dosyası canlı satış veya sezon açılışı sözü içermez.

Kaynaklar `client/assets/ui/cosmetics-shop-v1/` altındadır: sırasıyla
`dockyard_latch.svg`, `dockyard_deck.svg`, `workshop_shelf.svg`,
`workshop_bay.svg`. İki128×128 çerçeve gerçek şeffaf portre boşluğuna sahiptir;
iki640×240 zemin orta metin alanını açık bırakır. SVG kaynakları doğrudan
elle yazılmıştır; hazır dönem görseli, yeniden renklendirme veya raster
yer tutucu kullanılmadı. Geniş pah, kalın siluet, üst-sol ışık ve ortak
lacivert/metal ailesi korunur. Atölye portre boşluğu görsel incelemede
düzeltilip merkez alfa0 ölçümüyle doğrulandı.

17 Kasım düzeltmesi: profil zeminleri dar/geniş barı uçtan uca doldurur
(`preserveAspectRatio=none`); sağ kupa alanında boş şerit kalmaz. Kendi
profilinde zemin, rozetler kartının tamamına değil kimlik barına uygulanır.
Çerçeve portre oranı korunur; bu değişiklik yeni bir ödül tasarımı sayılmaz.

Katalog `look.asset` dosya/hash'i, sabit desen/alan ve shop havuzunu doğrular.
Eksik/değişmiş/tehlikeli SVG veya dönem havuzuna taşıma kapalı hata verir.
`prepare_liveops_rewards.py sync` CSS/istemci metaverisi/TR-EN üretir;
çerçeve normal ve seçili profilde aynı kaynak SVG'yi kullanır.

Kabul kaydı: [COS-03](shop-cosmetics-250-acceptance.md). Fiziksel cihaz ve
nihai imzalı paket kabulü QA-01/RELEASE-02 kapılarında sürer.

Sezon ödülü tasarımları bu dört öğenin yerine kullanılmaz. Tamamlanma COS-03 kanıtıyla izlenir.
