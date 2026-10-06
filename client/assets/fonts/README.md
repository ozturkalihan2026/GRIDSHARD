# Gömülü yazı tipleri

Oyun yazı tiplerini açılışta dış adresten istemez; dosyalar bu klasörden gelir
(`client/src/fonts.css`). Gerekçe: `docs/CHILD_AUDIENCE_AUDIT.md`.

Dosyalar 6 Ekim 2026'da Google Fonts'tan (`fonts.gstatic.com`) alındı ve
değiştirilmedi. Devanagari alt kümesi alınmadı; oyun Türkçe ve İngilizcedir.

| Aile | Dosyalar | Sürüm | Telif bildirimi (dosyanın içinden) |
| --- | --- | --- | --- |
| Orbitron | `orbitron-600-900-latin.woff2` (değişken, 600–900) | 2.001 | Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron". |
| Rajdhani | `rajdhani-{400,500,600,700}-{latin,latin-ext}.woff2` | 1.201 | Copyright (c) 2014 Indian Type Foundry (info@indiantypefoundry.com) |

İkisi de **SIL Open Font License, Version 1.1** ile dağıtılır
(https://openfontlicense.org). Lisans, yazı tiplerinin başka yazılımla birlikte
dağıtılmasına izin verir; her kopyanın telif bildirimini ve lisans metnini
taşımasını ister.

Lisans metinleri `OFL-Orbitron.txt` ve `OFL-Rajdhani.txt` dosyalarındadır
(kaynak: `github.com/google/fonts`, `ofl/orbitron` ve `ofl/rajdhani`;
değiştirilmedi). Derleme bu klasörden yalnız yazı tipi dosyalarını pakete
aldığı için aynı metinler oyunun içinde de bulunur: Ayarlar → Hesap ve Gizlilik
→ Açık kaynak lisansları (`client/index.html`). İkisi birbirinin aynısı
olmalıdır; `client/tests/embedded-fonts.test.js` denetler.

Orbitron yalnız temel Latin harflerini içerir: `ğ`, `ş`, `İ` gibi harfler
`--gs-font-display` sırasındaki yedek yazı tipiyle çizilir (gömmeden önce de
böyleydi).

Yazı tiplerini yenilemek için: Google Fonts stil dosyasındaki `latin` ve
`latin-ext` dosyaları indirilir, adları yukarıdaki düzene göre verilir ve
`client/src/fonts.css` içindeki `unicode-range` değerleri stil dosyasından
alınır.
