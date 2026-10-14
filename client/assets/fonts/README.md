# Gömülü yazı tipleri

Oyun yazı tiplerini açılışta dış adresten istemez; dosyalar bu klasörden gelir
(`client/src/fonts.css`). Gerekçe: `docs/CHILD_AUDIENCE_AUDIT.md`.

Dosyalar Google Fonts'tan alındı: Orbitron ve Rajdhani 6 Ekim 2026'da, Oxanium
13 Ekim 2026'da. Bu üç ailenin WOFF2 dosyaları değiştirilmedi; Devanagari alt
kümesi alınmadı. Rowdies Bold 14 Ekim 2026'da resmî tam TTF kaynağından,
glifleri/isimleri değiştirilmeden WOFF2'ye dönüştürüldü. Oyun Türkçe ve İngilizcedir.

| Aile | Dosyalar | Sürüm | Telif bildirimi (dosyanın içinden) |
| --- | --- | --- | --- |
| Rowdies | `rowdies-700-full.woff2` (700, tam glif kümesi) | 1.000 | Copyright 2018 The Rowdies Project Authors (https://github.com/magictype/rowdy) |
| Oxanium | `oxanium-200-800-{latin,latin-ext}.woff2` (değişken, 200–800) | Google Fonts v21 | Copyright 2019 The Oxanium Project Authors (https://github.com/sevmeyer/oxanium) |
| Orbitron | `orbitron-600-900-latin.woff2` (değişken, 600–900) | 2.001 | Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron". |
| Rajdhani | `rajdhani-{400,500,600,700}-{latin,latin-ext}.woff2` | 1.201 | Copyright (c) 2014 Indian Type Foundry (info@indiantypefoundry.com) |

Dördü de **SIL Open Font License, Version 1.1** ile dağıtılır
(https://openfontlicense.org). Lisans, yazı tiplerinin başka yazılımla birlikte
dağıtılmasına izin verir; her kopyanın telif bildirimini ve lisans metnini
taşımasını ister.

Lisans metinleri `OFL-Rowdies.txt`, `OFL-Oxanium.txt`, `OFL-Orbitron.txt` ve `OFL-Rajdhani.txt`
dosyalarındadır (kaynak: `github.com/google/fonts`, `ofl/oxanium`, `ofl/orbitron`,
`ofl/rowdies` ve `ofl/rajdhani`;
değiştirilmedi). Derleme bu klasörden yalnız yazı tipi dosyalarını pakete
aldığı için aynı metinler oyunun içinde de bulunur: Ayarlar → Hesap ve Gizlilik
→ Açık kaynak lisansları (`client/index.html`). Dosya ile oyundaki metin
birbirinin aynısı olmalıdır; `client/tests/embedded-fonts.test.js` denetler.

Başlık ve düğme yazısı **Rowdies Bold**'dur (`--gs-font-display`); Türkçe
harflerin tamamı (`ÇĞİÖŞÜçğıöşü`) kendi tam dosyasında bulunur. 700 gerçek
ağırlığı kullanılır; daha kalın sentetik kontur üretilmez. Açıklamalar Rajdhani
olarak kalır. Oxanium yedek aile olarak korunur; `fonts.css` içinde
`size-adjust:109%` ile biraz büyük çizilir. Orbitron yalnız temel Latin
harflerini içerir ve yalnız GRIDSHARD marka yazısında kullanılır
(`--gs-font-brand`).

Rowdies kaynağı:
https://raw.githubusercontent.com/google/fonts/main/ofl/rowdies/Rowdies-Bold.ttf

TTF SHA-256: `e56ac3fe30e56243483083a6ba271387e332f77920e850ce7dc1baead4fbede2`.
Resmî dosya yeniden indirilip önizleme kaynağıyla birebir eşleştiği doğrulandı.
`tools/export-rowdies-font.py` (FontTools 4.60.1 + Brotli) tam fontu kayıpsız
dönüştürür; çıktı 31.744 bayttır. TTF ve WOFF2 Unicode cmap tabloları birebir
aynıdır; altküme yapılmaz. Lisans metni değiştirilmeden hem burada hem oyun
içindeki açık kaynak lisanslarında bulunur.

Yazı tiplerini yenilemek için: Google Fonts stil dosyasındaki `latin` ve
`latin-ext` dosyaları indirilir, adları yukarıdaki düzene göre verilir ve
`client/src/fonts.css` içindeki `unicode-range` değerleri stil dosyasından
alınır.
