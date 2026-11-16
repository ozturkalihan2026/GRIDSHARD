# SHOP-03 — Oyun içi kredili kozmetik pilotu ve profil barı düzeltmesi

17 Kasım 2026 · `codex/develop-2.5.0`

Bir garantili modül teklifi ve iki ayrı kozmetik seti aynı incelenmiş katalog,
HTTP/sahiplik/ekonomik işlem katmanında hazırdır. Modül500 kredi/UTC haftasında2
olarak korundu. Tersane ve Atölye setleri ayrı ayrı1.500 Devre Kredisi,
Arena2/300 zirve kupa, hesap başına bir kezdir. Kaynakta üçü de draft.

## Gerçek parasız edinim

- Yeni adaptör yalnız `circuit_credits` kabul eder. TRY/döviz, para sağlayıcı,
  reklam, SDK köprüsü veya istemci fiyat/ödülü kabul edilmez. İki öğe tam
  garantidir; rastgele sonuç, güç veya kaynak iadesi yoktur. Sonuç yalnız
  seçilen setin çerçeve ve zemin ID'sini kalıcı sahipliğe ekler; otomatik kuşanmaz.
- Herhangi bir öğe zaten sahipse `already_owned` ile yeniden ücret reddedilir.
  Hesap limiti, kalıcı makbuz/limitkey ile revision ve UTC hafta devrinde
  sıfırlanmaz. İki set ve modül limiti birbirini tüketmez.
- Yeni istek güncel fiyat/arena/pencere/hash/sahiplik doğrular. Başarılı eski
  istek katalog/asset/sürüm/pencere kapalıyken bile ilk tam makbuzu döndürür;
  güncel cüzdan ve sahiplik okunur, ikinci ücret veya tekrar ödül yoktur.
- Var olan `persistent_operation` ve PostgreSQL economic UOW kullanılır.
  Kredi, iki sahiplik ID'si, hesap limiti tanığı ve SQL makbuzu birlikte
  commit/rollback olur. Yeni tablo/migration, ödeme işlemi veya sezon hakkı yoktur.
- `shop_collection` kodda manuel adaptör olarak kayıtlıdır; ayrı shop stoğu
  kullanır. Dönem rezervasyon CLI'siyle açılamaz. JSON günlük deneme gibi
  henüz uygulanmamış kanalları destekleniyor yapamaz. Stock-ready yayın onayı değildir.

## Görünüm ve istemci

Zemin SVG'sinin doğal oranı dar barı ortalayıp sağda boşluk bırakıyordu.
Zeminler barın tamamına esner; çerçevelerin portre oranı korunur. Normal
profilde yalnız `.profile-hero`, ziyarette kimlik satırı ve kupa alanı,
ana ekran profil barı ve koleksiyon önizlemesi aynı zemini kullanır.
Yükleme/eski sunucu yanıtında seçili görünüm default'a döner.

Kozmetik mağaza sekmesi iki gerçek kaynağı, isimleri, garantili içeriği,
oyun içi kredi fiyatını ve hesap limitini gösterir. İki kaynak da yüklenmeden
onay verilmez. İnceleme → açık onay → doğrulanmış makbuz → Kozmetik ekranında
mevcut gerçek seçim PUT'u kullanılır. Bekleyen işlem hesap kapsamında
saklanır; kayıp/bozuk yanıt yeni request yaratmadan kurtarılır. Çevrimdışı
kozmetik sekmesinde yeniden deneme vardır. TR/EN ve ortak fiziksel sanat sürer.

## Doğrulama

- Önceki modül katalog/HTTP/PostgreSQL akışları dahil Linux82 PASS.
- Son sağlam hata ve manuel kaynak kaydından sonra Linux55 PASS:
  yeni domain/HTTP, gerçek PostgreSQL yarış/rollback, stok ve sanat. SQL'de
  12 farklı istek tek ücret/tek sahiplik, aynı isteğin12 tekrarı aynı tek
  SQL makbuzu; durable save/economic completion kesintisinde tam rollback.
  İlk82 ve son55 örtüşür; tek137 test koşusu değildir. Skip yoktur.
- Chrome6 + Android6 + Safari6 =18 PASS: TR/EN320/393, gerçek kredili edinim,
  çift dokunma, sahip olunan/kısmi sahiplik, eksik kredi/arena, kuşanma ve
  gerçek ziyaret; kayıp yanıtı reload+kapalı listede aynı makbuzla kurtarma.
  Gerçek ödeme/reklam ağ isteği0. Fiziksel Android cihaz kabulü değildir.
- Dar barın iki kenar alfa değeri255/255 ölçüldü; kupa sınırları barın
  içindedir. Normal/ziyaret ekran görüntüleri incelendi.

- İstemci792 PASS (gerçek para para birimini reddeden set/makbuz testi dahil),
  build15 PASS, plan11 PASS; import533 dosya/0 sorun. Son gerçek web build
  `35d90ac33d14e255`. `GRIDSHARD_CLIENT_DIR=dist` ile registry ve üç teklifin
  gerçek kaynak/hash preflight'ı PASS. Üç plan check ve diff check PASS.

Test fixture yalnız opt-in loopback development sürecinde2.5/future clock,
yayımlanmış test katalog ve geçici hesapları kullanır. Kaynak/live tarih,
gerçek oyuncu kredi/sahipliği, S1 overlay ve2.4 sürümü değişmez.

İlk Windows HTTP koşusu beklediği için kesildi; HTTP/SQL kabulü tamamlanan
Linux koşularındandır. İlk Linux koşusunda proje kökü PYTHONPATH ve arena
test fixture'ı düzeltildi;82/55 son koşularında başarısız/skip yoktur.
Starlette test aracı deprecation uyarısı ürün hatası değildir. Uzak Actions
yeşili veya imzalı AAB/cihaz kabulü iddia edilmez.

## Yayın sınırı

İki kozmetik kaydı gerçek approved/shop sanatını gerektirir; eksik/eski15
öğeli registry pilotu açamaz. RELEASE-02 dağıtım adayında yayımlanmış S1
kayıtlarını/haklarını koruyarak yeni shop stoğunu birlikte doğrulamalıdır;
arşivlenmiş S1 dosyaları üzerine yazılmaz. Üç draft teklif yayınlanmadı,
S2 açılmadı, main/deploy/AAB işlemi yapılmadı. Gerçek geçiş S1 kapanış ve
ödül kabulünden sonra, en erken22 Aralık03.00 TR; kesin pencere ayrı karardır.
