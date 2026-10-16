# Oyun görselleri ve kaynak arşivi

## Ana ekran ve marka — Paket 3

`home-interface-v3.css`, ortak stil bloğunda Paket 2'den sonra gelir.
Hacimli Devre Yolu ve açık/kapalı altın zarflar `home-v3/` altında;
açılış logosu `assets/branding/gridshard-emblem-v2.webp`. Orijinaller korunur.
Varsayılan profil mevcut kişi çiziminin mint filtresidir; diğer seçili avatar,
çerçeve ve profil arka planı korunur. Yeni launcher/mağaza ikonu üretilmedi.
Detay: `home-v3/README.md`, `docs/GORSEL_DONUSUM_PAKET03_20261015.md`.

## Ortak yüzeyler — Paket 2

Onaylı buton/kart/hücre/sekme/giriş/anahtar/ilerleme ve zeminsiz ikon eylemleri
`client/src/ui-components-v2.css` ortak kaynağında. Stil derleme bloğunda Paket 3'ten
önce; web/native aynı kaynağı kullanır. Paket 2 için yeni raster görsel veya ikon kopyası
yok. Bağımsız ikon düğmelerine yeni kullanım eklerken merkezi eşlemeyi genişletin
veya `.gs-icon-action` kullanın; levha/gölge eklemeyin. `.gs-action-button`
metinli eylem, `data-tone="primary|success|danger"` anlam varyantı sağlar.
Bildirim rozetlerinin `::after` alanını kullanmaya devam edin; yüzey `::before`
ile çizilir. Doküman: `docs/GORSEL_DONUSUM_PAKET02_20261015.md`.

## Onaylı ortak ikonlar — Paket 1

10 ikon `common-icons-v1/` altında, 128px kayıpsız alpha WebP toplam 173.662
bayt. Tek dosya eşlemesi `canon.css` **Common UI artwork** bölümünde;
`UI_ART_ICONS` eski/yeni çağrı adlarını eşler. Yeni ikonlar başlık/menü ve
bağımsız mesaj/menü/ayar düğmelerinde aynı kaynaktan gelir. Profil barındaki
mesaj/menü düğmeleri kullanıcı isteğiyle zeminsizdir. Detay ve kapsam:
`common-icons-v1/README.md`. Paket planı `docs/GORSEL_DONUSUM_PLANI_20261015.md`.

## Kaynak arşivi

15 Ekim 2026 temizliği: oyun yalnız güncel hafif WebP dosyalarını taşır.
Kullanılmayan önceki tasarımlar, büyük PNG ustaları ve eski QA ekran çıktıları
SHA-256 doğrulamasıyla `artifacts/asset-archive-20261015/` altına alındı.
Bu klasör Git tarafından yok sayılır; orijinaller değiştirilmeden saklanır.
Tam dosya listesi: `qa_reports/asset-cleanup-20261015.json`.

## Tek merkezden para birimi görseli değiştirme

`client/src/canon.css` içindeki **Currency artwork** bölümünde iki dosya eşlemesi:

- Akı: `currency-v1/flux.webp`
- Devre Kredisi: `currency-v1/credit.webp`

Sabit üst bar/maç sonu ile `resourceTokenVisual`/`resourceSymbolMarkup` üzerinden
oluşan sandık önizleme, mağaza, Devre Yolu, görev/sezon ödülü ve maliyet rozetleri
aynı `.currency-art` kaynağını kullanır. Başka ekran için resim kopyalamayın.
Dosya yerinde değiştirilince bütün kullanımlar değişir; web/native derlemede CSS
asset loader dosyayı içerik hash'iyle paketler, eski önbellek yolu kullanılmaz.
Mağazadaki Akı Paketleri / Devre Kredisi Paketleri başlıkları da ayrı UI levhası
yerine `uiIconMarkup` üzerinden aynı para birimi görsellerine yönlenir.

128px kayıpsız WebP + alpha: Akı 11.544 bayt, Devre Kredisi 18.370 bayt.
Tasarım/kadraj/renk değişmedi; yalnız oyun çözünürlüğüne teknik küçültme yapıldı.

## Ustaları yeniden dışa aktarma / başka bilgisayara taşıma

`tools/export-currency-icons.js`, `export-rating-trophy.js`,
`export-casual-dock-icons.js` ve `export-casual-chests.js`, kaynak PNG orijinal
yolunda yoksa yerel arşivde aynı göreli yolu arar. Sharp kurulumu veya
`GRIDSHARD_SHARP_MODULE` gerekir. Güncel oyun dosyalarını tekrar üretmek için
yüksek çözünürlüklü kaynakları Git'e geri eklemek gerekmez.

**Arşiv yalnız bu bilgisayardadır.** Ev bilgisayarında tekrar üretim için
`artifacts/asset-archive-20261015/` klasörünü ayrıca taşıyın veya aynı alt yapıyı
içeren bir klasöre `GRIDSHARD_ART_MASTER_ROOT` ortam değişkenini ayarlayın.
Geri almak için manifestteki dosyayı arşivdeki aynı göreli yoldan asıl konumuna
kopyalayın. Dosyaları taşımadan bu bilgisayardaki arşivi silmeyin.

Fontlar/lisanslar, teknik ölçüm raporları ve testlerin kullandığı tipografi
kaynakları korunur. Eski görsel deneme çıktıları Git'te yeniden birikmemelidir;
yeni büyük kaynakları ve ekran çıktısını `artifacts/` altında tutun.
Git geçmişindeki eski büyük dosyalar ayrıca silinmez; geçmiş yeniden yazılmadı.

## Onaylı lig amblemleri — Paket 4A

`leagues-v1/` yedi 192px alpha WebP, Şampiyonlar mevcut rating-trophy-v1 kupası.
Ortak eşleme app.js, sunum competition-v4.css; web/native dinamik varlık izin
listesi HTML inert template'inde. Büyük master/promptlar 04A arşivindedir.
Paket 5A/5B kullanıcı onayıyla bağlıdır: `reward-chests-v1/` içinde 18 kapalı
ve 18 açık 384px alpha WebP vardır. Eşlemeler `competition-chest-art.js` içindedir;
36 dinamik dosya web/native HTML izin listesinde bulunur. Altı turnuva alias'ı
aynı onaylı sandıkları yeniden kullanır; ödül kimlikleri/içerikleri değişmez.

Mesaj kategorileri ve deste başlıkları ayrı çizim üretmez: `swords` mevcut dock
kılıçlarına, `card` dock kartlarına, `shop` dock mağaza sandığına, `chest` Altın
Sandık'a yönlenir. Okundu/okunmadı zarfları ayrı eylem olarak korunur.
