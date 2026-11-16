# UI-02 — Mağaza gezinmesi ve gerçek teklif akışı

16 Kasım 2026 · `codex/develop-2.5.0`

## Kapsam

Mağaza dört bölümdür: Öne Çıkanlar, Sandıklar, Modül Parçaları,
Kozmetikler. Aynı sandık bölümü taşınır; yeni Bronz hediye, sayaç veya
talep dinleyicisi oluşturulmaz. Mevcut olasılık tablosu sandıklarda kalır.
Modül teklifinde gerçek hedef, garantili parça miktarı, oyun içi para
birimi/fiyat, bakiye, kalan hafta limiti ve UTC bitişi sunucudan gösterilir.

Kozmetik bölümü yalnız mevcut koleksiyon önizlemesine gider. Sahiplik
vermez; kilitli içerik kuşanılamaz. Gerçek kozmetik satış kataloğu/ürün
sanatı COS-03 ve SHOP-03 kapsamındadır. `already_owned` hatası bu ekranın
ortak hata akışında desteklenir; henüz var olmayan ürün satışı üretilmez.

`offer-view.js` GET liste/detay → inceleme → açık onay → POST → doğrulanmış
makbuz akışını yönetir. Fiyat veya ödül istemcide hesaplanmaz. İstek yalnız
request_id/revision/preview_hash taşır. İkinci dokunma yeni işlem yaratmaz.
Profil/meta yalnız hesap/istek/teklif/ücret/ödül hash'leri doğrulanmış yanıt
ile güncellenir; yerel ödül verme yoktur. Eski sunucuda404 mağaza kapalıdır.

## Kesinti ve hata davranışı

- İlk POST öncesi hesap kapsamlı bekleyen işlem localStorage'a yazılıp geri
  okunur. Yazma başarısızsa ücretli oyun parası işlemi başlamaz.
- Sonucu bilinmeyen ağ/servis/kimlik yanıtı veya bozuk makbuz bekleyen işlemi
  korur. Yeniden açılışta aynı istek kimliğiyle kontrol edilir; yeni alım
  engellenir. Liste boşalsa veya teklif dönemi kapansa da kurtarma erişilir.
- Yalnız tanınan kesin iş kuralı reddi bekleyeni temizler. Genel403/404 veya
  request conflict başarı varsayılmaz; kaybolmuş makbuz bırakılmaz.
- Hesap ve yükleme kuşağı değişince eski yanıt uygulanmaz. Her hesabın
  bekleyen işlemi ayrı anahtardadır. Bozuk yerel kayıt sessizce silinmez.
- Bakiye yetersiz/limit dolu/arena kilitli satın alamaz. Süresi dolan/eski
  revision, bulunamayan fiyat/görsel ve çevrimdışı durumları açıklanır.
  Doğrulanmamış fiyat sıfırmış gibi gösterilmez.

## Sanat ve erişilebilirlik

Mevcut boyalı modül görselleri, lacivert kabartmalı yüzeyler, altın fiziksel
onay düğmesi ve ortak yalnız ok geri tuşu kullanılır. Yeni görsel veya ses
üretilmedi. Sekmelerde alt çizgi yoktur; koleksiyon önizlemesi yumuşak
şampanya rengindedir. TR/EN metinler i18n kataloğundadır. Sekme ok/Home/End
gezinmesi, aria-selected, modal Escape/geri ve odağı geri verme desteklenir.
İşlem sürerken modal kapanmaz. Hareket azaltma tercihinde animasyon yoktur.

## Doğrulama

- İstemci791 PASS; hash/hesap/istek/ücret/ödül ve bozuk fiyat/yol testleri dahil.
- Build girişleri14 PASS; son gerçek web build `5274a360e95acf49`. AAB üretilmedi.
- Chrome gerçek API10 PASS: TR/EN ×320/393; çift dokunma tek POST, iki alım
  sonrası limit, Escape/odak,44px hedef/çizgisiz sekme, olasılık tablosu,
  koleksiyon önizlemesi, bakiye/arena, eksik fiyat, bitmiş teklif, çevrimdışı
  yeniden deneme, bozuk makbuz ve kaybolan yanıtı yeniden açılışta kurtarma.
  Kurtarma sırasında genel403 ve kapalı liste de eski işlemi korur; başarılı
  makbuz/istek aynıdır ve bakiye1500 kalır. İki eski Bronz hediye/sandık
  regresyonu bu10 koşuya dahildir. reduced-motion ekranı ayrıca incelendi.
- Android Chrome4 + iPhone Safari4 PASS: TR/EN ×320/393 gerçek iki satın alım,
  limit, geri/odak, koleksiyon ve olasılık akışı. Bunlar fiziksel cihaz değil,
  Playwright tarayıcı öykünmesidir. Görseller de incelendi.
- Son odak/yanıt sırası değişikliklerinden sonra Chrome odaklı2 PASS:
  TR320 tam alım/limit/yenilenen düğmeye odak (öncekinin tekrarı) ve yeni
  gecikmiş detay/bozuk localStorage testi.10+8+2 koşu20 sonuç,19 farklı
  proje/test durumu içerir; tek kesintisiz20 test koşusu değildir.
- Plan üreticileri üçü de check PASS; plan regresyonu11 PASS; Python import
  taraması527 dosya/0 sorun. Kaynak teklif check'i tek draft/arena1/24 hedef.

Tarayıcı fixture'ı yalnız `GRIDSHARD_E2E_SHOP_OFFERS=1` ile izole loopback runner'da yüklenir.
2.5 sürümü, gelecek saat ve yayımlanan test katalog **yalnız bu sürecin
belleğinde** vardır. Arena kilidini sınamak için fixture minimum arena2
kullanır; kaynak katalog arena1/draft olarak korunur. Üretim fixture'ı
import etmez. Test hesapları ve makbuzlar geçicidir.

Canlıya geçiş, AAB, main birleşmesi, S1 veya kaynak sürüm değişimi yoktur.
Kaynak katalog örnek28 Aralık–4 Ocak penceresinde tek draft olarak kalır;
bu tarih onaylanmış S2/yayın tarihi değildir.

İlk koşulardaki sandbox localhost erişimi ve eski test seçici/cüzdan/dock
alanları düzeltildi; kabul sayıları tamamlanan son koşulardır. Uzak Actions
yeşili veya fiziksel Android cihaz kabulü iddia edilmez.

Safari kontrolünde dokunulan düğmenin otomatik odak almaması bulundu.
Açan düğme açıkça saklanır; liste yenilenince aynı teklifin yeni düğmesi
bulunur. Arka plandaki liste yenilenmesi de mevcut düğme odağını korur.
İptal edilen eski detay isteğinin yanıtı, ayrı detay kuşağıyla yok sayılır;
yeni inceleme/onay ekranını değiştiremez.
