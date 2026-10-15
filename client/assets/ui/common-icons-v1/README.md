# Ortak arayüz ikonları — Paket 1

15 Ekim 2026: Kullanıcı 10'lu önizlemeyi "bağla" diyerek onayladı.
128×128 kayıpsız alpha WebP, toplam **173.662 bayt**. Dosyalar onaylanan
`artifacts/visual-refresh-pack01-20261015/webp/` çıktılarıyla birebir aynıdır;
yeniden çizilmedi, renk/kadraj değiştirilmedi.

## Tek merkez

Dosya yolları yalnız `client/src/canon.css` sonundaki **Common UI artwork**
bölümündedir. Her `--ui-art-*` değişkeni tek WebP'ye gider. Dosyayı yerinde
değiştirmek bütün karşılıklarına uygulanır. Web/native CSS paketlemesi dosyayı
içerik hash'iyle dahil eder. CSS'le yeniden renklendirme veya eski levha yok.

`UI_ART_ICONS` eski/yeni çağrı adlarını aynı kaynağa bağlar:

| Dosya | Çağrı adları |
| --- | --- |
| settings | gear, settings |
| message | mail, message |
| friends | people, friends |
| profile | profile |
| gift | gift |
| calendar | calendar |
| statistics | bars, statistics |
| cosmetics | palette, cosmetics |
| info | info |
| menu | menu |

`uiIconMarkup`/`createUiIcon`, statik başlıklar ve dinamik başlık/menü
satırları aynı görselleri kullanır. Eski karşılıkların SVG çizimleri kaldırıldı.
Ana ekran mesaj ve menü, takım menüsü, savaş ayarı, takım profil sekmesi,
arkadaş boş durumu ve bilgi kutusundaki i işareti de aynı kaynağa bağlıdır.
Profil simgesi genel gezinme içindir; seçilmiş oyuncu avatarları/kozmetikleri
ve takım amblemleri değiştirilmedi. Modül/çekirdek çizimleri korunur.

Son ek kullanıcı isteği: **profil barındaki mesaj ve menü ikonlarının ayrı
düğme zeminleri yoktur**, doğrudan bara oturur. Tıklama alanı/grid konumu,
bildirim noktası/sayacı, menü açılma davranışı ve klavye odak çizgisi korunur.
Takım menüsü bu profil barı zemin değişikliğinin kapsamında değildir.

PNG asılları, 24/32/40px önizleme ve teknik export aracı Git dışı
`artifacts/visual-refresh-pack01-20261015/` klasöründedir; başka bilgisayara
ayrıca taşınır. Kalıcı prompt seti:
`docs/GORSEL_DONUSUM_PAKET01_PROMPTLARI_20261015.json`.
Paket sırası/onay kaydı: `docs/GORSEL_DONUSUM_PLANI_20261015.md`.

Yerel/görsel oyun testleri kullanıcıdadır. Yeni tarayıcı/test sunucusu veya
native/canlı dağıtım başlatılmadı; bu not bir oyun testi başarı iddiası değildir.
