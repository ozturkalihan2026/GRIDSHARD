# Dik savaş görselleri, hücre içi göstergeler — 24 Ekim 2026

Son istek: 22:42 güncel savaş görüntüsündeki düz/küçük yerleşimin yerine eski
19:19 görüntüsündeki hacimli, ayakları sokete oturan cihaz duruşu; hücre içinde
CAN/ısı, açık enerji kanalı, kaide dışındaki rakip destesi ve renkli yan birleşimler.

## Uygulama

- Kamera taraflar ve satırlar arasında aynı ortografik eğimi kullanır. Mevcut
  katmanlı çizimler, hareketli başlıklar ve WebKit uyumlu dik Y telafisi korunur.
  Ortak resim sahnesi hücre ölçüsünün %92'sidir; resimler tabandan 13px yukarı
  oturur ve üstte yükselir. Sabit temas gölgesi eklenir. Saydam tuvalin hücre
  genişliğiyle kısıtlanması kaldırılır; kayıt sahnesi kare ve tam merkezlidir.
- Her normal modül kanonik çekirdek ölçüsünün 0.85'i olmaya devam eder. Batarya,
  sıra veya taraf istisnası yoktur. Hücreler 5×3 eşit; rastgele yerleştirme aynı.
- CAN alttan 2px, ısı 7px: ikisi de kendi hücresinin içinde, resmin tabanından
  sonra durur. 3px öne alma ile dik resmin arkasında kalmaları önlenir. Önceki
  -7px/-1px konumları kaldırıldı; hücre arası enerji kanalı boş kalır.
- Başlık ve deste ana kırmızı metal kenarın en az 6px yukarısında biter.
  Yerleşim bu kenarı da ölçerek ekrana sığdırır. Mavi ön kenar ve oyuncu adı
  rafın üstünde, VS iki ana metal kenarın ortasında kalır.
- Var olan yan duvar SVG'sinin blok birleşimleri maskeyle renklendirilir:
  üst/rakip kırmızı, alt/oyuncu turkuaz. Bitmap veya animasyon üretilmez.

## Doğrulama

727 istemci testi geçti. Gerçek tarayıcı testi her projede dört ekran ölçüsü,
36 modül × 30 hücre yerleşimi, gerçek enerji çizgileri ve tam dolu tahtanın
58 CAN/ısı göstergesini denetler. Kalabalık tahta kontrolü yalnız kutu sınırını
değil, barın önünde kalan görsellerin opak piksellerini de inceler; saydam PNG
tuvalinin hit-test sonucunu gerçek örtüşme saymaz. Yedi çekirdeğin gerçek
opak sınırları, isabet sırasında ölçü sabitliği ve kalkan ayrıca denetlenir.

Sonuç: üç tarayıcıda 3240 modül yerleşimi ve 174 dolu-tahta gösterge kontrolü
geçti; çekirdek/kalkan kontrolü de üç tarayıcıda geçti. WebKit'teki iki olası
örtüşme şeffaf tuvale aitti, gerçek opak piksel örtüşmesi yoktu.
Kanıt klasörleri: `artifacts/battle-standing-final-20261024/` (Chrome tahta),
`artifacts/battle-standing-webkit-20261024/` (WebKit tahta + çekirdek),
`artifacts/battle-standing-core-20261024/` (Chrome çekirdek/kalkan).

Commit/push, sunucu geçişi, AAB veya tanıtım videosu işlemi bu isteğe dahil değil.
