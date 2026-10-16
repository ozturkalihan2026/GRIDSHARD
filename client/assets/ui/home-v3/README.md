# Paket 3 — onaylı ana ekran görselleri

15 Ekim 2026. Imagegen ile üretilen, kullanıcı onaylı gerçek alpha/kayıpsız WebP:

- `route.webp`: 192px, 18.722 bayt; mevcut üç düğümlü yolun hacimli hali.
- `message.webp`: 128px, 14.222 bayt; okunmamış/kapalı altın zarf.
- `message-open.webp`: 128px, 14.346 bayt; okunmuş/açık altın zarf.

Logo açılışta `assets/branding/gridshard-emblem-v2.webp` (256px, 54.786 bayt).
Mağaza/native launcher ikonları ve eski amblem değiştirilmedi.
Mevcut profil çizimi mint renk filtresiyle kullanılır; seçili diğer avatarlar ve
çerçeveler korunur. Menü buz mavisi, zarflar sıcak altın.

Promptlar `docs/GORSEL_DONUSUM_PAKET03_REV3_PROMPTLAR_20261015.json` ve logo
prompt belgesinde. Büyük masterlar Git dışı
`artifacts/visual-refresh-pack03-20261015/` içinde; ayrıca taşınmalıdır.
CSS eşlemesi `client/src/home-interface-v3.css`, ortak stil bloğunda son sırada.
