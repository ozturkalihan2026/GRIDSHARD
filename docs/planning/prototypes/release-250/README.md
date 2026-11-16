# UI-01 / 2.5 ekran prototipi

Yedi ekranın ortak görsel hiyerarşisini ve örnek durumlarını incelemek için
`index.html` açılır. Sunucu/API/hesap/kalıcı depolama kullanmaz; gerçek alım,
ödül, savaş veya duyuru gönderimi yapmaz. Örnek cüzdan, fiyat, paket ve dönem
durumları gerçek oyuncu verisi değildir. Bu dosyalar client dizininin dışında
kalır ve runtime HTML/CSS/JS girdilerine eklenmemiştir.

Ortak sözleşme: [screen-and-component-spec.md](../../screen-and-component-spec.md).
Var olan onaylı çizimler ve fontlar `../../../../client/assets/` üzerinden
okunur; kopyalanmaz veya yeniden boyanmaz. Kaynak depo klasör yapısı gerekir.
Mühendis Kasası'nın mevcut gerçek uygulaması yerine geçmez.

Yerel HTTP ile açmak için depo kökünde:

```powershell
python -m http.server 8896 --bind 127.0.0.1
```

Sonra `http://127.0.0.1:8896/docs/planning/prototypes/release-250/` adresi açılır.
İnceleme bitince bu terminalde Ctrl+C ile sunucu kapatılır. Başka uygulamanın
kullandığı port kapatılmaz; gerekirse farklı boş port seçilir.

Üstteki kontroller ekran/durum/TR-EN seçer. Durum URL'de korunur; örnek:
`?screen=choice&state=review&lang=en`. Ekran düğmeleri yalnız prototip içinde
gezinir veya yerel açıklama gösterir. Maç, sandık, mağaza ve profil olmayan
ayrıntılar için üretim ekranı taklidi yapılmaz; açıklama verilir.

Kasa: seçenek → inceleme → açıkça etiketli örnek sonuç; Sonra Seç → ana ekran.
Teklif: hedef/miktar/fiyat/limit ve alım incelemesi; gerçek checkout yoktur.
Prototipteki üç20 parça paketi görsel örnektir; gerçek miktar hak snapshot'ı
ve enderlik kuralından gelir. S2 kozmetik sanatı bu çalışmada üretilmedi.
