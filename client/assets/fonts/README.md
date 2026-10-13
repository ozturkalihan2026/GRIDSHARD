# Gömülü yazı tipleri

Oyun yazı tiplerini açılışta dış adresten istemez; dosyalar bu klasörden gelir
(`client/src/fonts.css`). Gerekçe: `docs/CHILD_AUDIENCE_AUDIT.md`.

Dosyalar Google Fonts'tan (`fonts.gstatic.com`) alındı ve değiştirilmedi:
Orbitron ve Rajdhani 6 Ekim 2026'da, Oxanium 13 Ekim 2026'da. Devanagari alt kümesi alınmadı; oyun Türkçe ve İngilizcedir.

| Aile | Dosyalar | Sürüm | Telif bildirimi (dosyanın içinden) |
| --- | --- | --- | --- |
| Oxanium | `oxanium-200-800-{latin,latin-ext}.woff2` (değişken, 200–800) | Google Fonts v21 | Copyright 2019 The Oxanium Project Authors (https://github.com/sevmeyer/oxanium) |
| Orbitron | `orbitron-600-900-latin.woff2` (değişken, 600–900) | 2.001 | Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron". |
| Rajdhani | `rajdhani-{400,500,600,700}-{latin,latin-ext}.woff2` | 1.201 | Copyright (c) 2014 Indian Type Foundry (info@indiantypefoundry.com) |

Üçü de **SIL Open Font License, Version 1.1** ile dağıtılır
(https://openfontlicense.org). Lisans, yazı tiplerinin başka yazılımla birlikte
dağıtılmasına izin verir; her kopyanın telif bildirimini ve lisans metnini
taşımasını ister.

Lisans metinleri `OFL-Oxanium.txt`, `OFL-Orbitron.txt` ve `OFL-Rajdhani.txt`
dosyalarındadır (kaynak: `github.com/google/fonts`, `ofl/oxanium`, `ofl/orbitron`
ve `ofl/rajdhani`;
değiştirilmedi). Derleme bu klasörden yalnız yazı tipi dosyalarını pakete
aldığı için aynı metinler oyunun içinde de bulunur: Ayarlar → Hesap ve Gizlilik
→ Açık kaynak lisansları (`client/index.html`). Dosya ile oyundaki metin
birbirinin aynısı olmalıdır; `client/tests/embedded-fonts.test.js` denetler.

Başlık ve düğme yazısı Oxanium'dur (`--gs-font-display`); Türkçe harflerin hepsi
(`ğ`, `ş`, `İ`, `ı` dahil) genişletilmiş Latin dosyasındadır (13 Ekim 2026'da
Chrome'da ölçülerek doğrulandı). Oxanium dar bir yazı tipidir; `fonts.css`
içinde `size-adjust:109%` ile biraz büyük çizilir. Orbitron yalnız temel Latin
harflerini içerir ve yalnız GRIDSHARD marka yazısında kullanılır
(`--gs-font-brand`).

Yazı tiplerini yenilemek için: Google Fonts stil dosyasındaki `latin` ve
`latin-ext` dosyaları indirilir, adları yukarıdaki düzene göre verilir ve
`client/src/fonts.css` içindeki `unicode-range` değerleri stil dosyasından
alınır.
