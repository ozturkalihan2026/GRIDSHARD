# Oyun görselleri ve kaynak arşivi

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
