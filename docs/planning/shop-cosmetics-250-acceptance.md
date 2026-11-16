# COS-03 — Dört ayrı mağaza kozmetiği

16 Kasım 2026 · `codex/develop-2.5.0` · dalda hazır

## Teslim

| Set | Çerçeve | Profil zemini |
| --- | --- | --- |
| Tersane / Dockyard | Tersane Kilidi: iki döküm kelepçe ve geniş alt kilit | Kenarlarda basamaklı güverte; açık orta alan |
| Atölye / Workshop | Asimetrik raf çıkıntıları ve bakır kenarlık | Alçak köşe tezgâhı ve iki iri bobin; açık orta alan |

Dört kaynak `client/assets/ui/cosmetics-shop-v1/` içinde ayrı SVG'dir.
Toplam7072 bayt; çerçeveler128×128, zeminler640×240. El yazımı native
SVG/CSS mevcut profil ailesini sürdürür: kalın siluet/pah, üst-sol ışık,
lacivert yüzey, sakin metal/bakır/altın. Yeni raster, renk değiştirilmiş
sezon kopyası, ince neon HUD veya animasyon yoktur.

Her öğenin ayrı ID/design_id, TR/EN adı, özgün pattern ve gerçek kaynak
SHA256 kaydı vardır. `inventory_pool=shop`, `status=approved` yalnız dalda
sanat incelemesidir. Katalog hâlâ0 dönem rezervasyonu/0 yayın taşır; bütün
öğeler yeni hesapta kilitlidir. Fiyat, yayın penceresi veya edinim yoktur.

## Entegrasyon ve korumalar

- Registry yeni pattern'i doğru alan, sabit dosya yolu, shop havuzu ve gerçek
  hash ile doğrular. Eksik/değişmiş dosya, dönem havuzuna taşıma ve yeniden
  adlandırılmış/renklendirilmiş motif reddedilir. SVG aktif/external içerik
  içeremez; script ve dış image doğru hash ile bile reddedilir.
- Sync aracı frontend metaverisi, gerçek SVG'yi kullanan CSS ve TR/EN üretir.
  Portre/swatch/koleksiyon/normal profil/ziyaret aynı kaynakları kullanır.
- Yalnız oyuncu öğesi olan yeni temalarda takım önizlemesi gizlenir. Eski
  temaya dönünce takım önizlemesi geri gelir; sahte takım kozmetiği üretilmez.
- Public profile yalnız **seçili** zemin kimliğini avatar görünümünde taşır.
  Envanter veya ayarlar açılmaz; yükleme/eski sunucu yanıtında default'a döner.
- Önizleme hiçbir mutasyon göndermez. Kilitli öğe mevcut sunucu kapısından
  kuşanılamaz. Yalnız testte sahipliği verilen öğe gerçek PUT ile seçilir;
  reload ve gerçek arama/profil ziyaretinde aynı görünüm korunur.
- İlk görsel kontrolde Atölye gölgesinin portreyi örtmesi düzeltildi.
  Her iki çerçevenin merkez alfa değeri0 olarak tarayıcı canvas'ında ölçülür.

## Kabul

- Sunucu odaklı52 PASS: yeni sanat/sahiplik/kanal/hash/güvenli SVG, mevcut
  kozmetikler, stok planı, public profile ve eski kilitler.
- İstemci791 PASS; build girişleri15 PASS. Son gerçek web build `282a4976092c3fa4`;
  imzalı AAB veya fiziksel cihaz kabulü değildir.
- Chrome6 + Android Chrome6 + iPhone Safari6 =18 PASS: kilitli TR/EN320/393,
  gerçek kaynak çizimi/şeffaf merkez, oyuncu-only temalar, eski tema dönüşü,
  önizlemede0 mutasyon, mevcut sahiplik kapısından seçim/reload/gerçek ziyaret.
  Bunlar fiziksel cihaz değil Playwright tarayıcı öykünmesidir.
- İlk15 dönem öğesi, releases ve freshness policy HEAD ile nesne olarak
  aynıdır. SHOP stoğu dönem açığını kapatmaz veya rezervasyona seçilmez.
  Yayımlanmış S1 overlay dosyası değiştirilmedi.

- Safari odaklı2 tekrar PASS: her iki sahip olunan set için normal profil
  ve gerçek ziyaret ayrıca320/393 ×TR/EN, kalıcı seçim ve yatay taşma kontrolü.
- Eski oyuncu/takım koleksiyonu Chrome regresyonu1 PASS. Eski üç desenin
  karşılaştırması yalnız o üç tasarıma daraltıldı; yeni ayrı siluetler aynı
  üç border stili varsayımına zorlanmaz.
- Üç plan check PASS, plan11 PASS, Python import529 dosya/0 sorun.
- Dağıtım köküyle (`GRIDSHARD_CLIENT_DIR=dist`) gerçek registry validate PASS:
  CSS'in hash'li media kopyalarına ek olarak dört özgün SVG yolu/byte'ı da
  web/mobile pakete alınır. Kaynak değişirse/eksilirse build durur, son iyi
  çıktı korunur; yeni build testi bunu iki platformda doğrular.

E2E fixture yalnız açık
`GRIDSHARD_E2E_SHOP_COSMETICS=1`, development ve loopback runner'da yüklenir;
özel başlıkla yalnız geçici test hesaplarını hazırlar. Üretim fixture'ı
import etmez. Üretim saati/sürümü/sezonu veya gerçek oyuncu sahipliği değişmez.

## Sonraki sınır

SHOP-03 iki setin bütçesi/fiyatı, arena/yayın uygunluğu, sahip olunan ürünün
reddi, atomik/idempotent kredi ve sahiplik teslimini bağlayacak. O madde
COS-03 tamamlandı diye hazır sayılmaz. COS-05 altı ayrı sezon kozmetiği,
QA-01/fiziksel cihaz, POLICY-01 ve RELEASE-02 kabulü açıktır.

Bu güncellemeden sonra2.5.0 için25 görevden13'ü branch_ready,2'si in_progress,
10'u todo; **12 açık madde** vardır. Kalanlar CARD-01, SHOP-03, UI-03, UI-04,
QA-01, ANALYT-01, BALANCE-01, POLICY-01, OPS-02, RELEASE-02, COS-05, AUDIO-03.
Takvim veya canlı yayın kararı değişmedi.

İlk görsel gölge düzeltmesi, paket kaynak yolu eksikliği ve test fixture'ının
mobil API URL'si düzeltildi. Yukarıdaki kabul tamamlanan son koşulardır;
18+2+1 sonuç tek kesintisiz21 koşu değildir. Uzak Actions yeşili iddiası yok.
