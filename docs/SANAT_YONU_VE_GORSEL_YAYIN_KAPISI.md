# GRIDSHARD — ortak sanat yönü ve görsel yayın koşulları

3 Kasım 2026 kullanıcı kararı: bütün geliştirmelerde ortak sanat yönü
sürdürülür. Yön değişirse kapsam ve geçiş planı önceden hazırlanır.
2.3.0 mevcut onaylı aileyi sürdürür; sanat yönünü yeniden başlatmaz.

## Mevcut aile

- Boyalı/hacimli oyun nesneleri; belirgin siluet, geniş sade pahlar ve üst-sol ışık.
- Koyu lacivert yüzey, altın fiziksel ana eylem, turkuaz vurgu ve okunabilir açık metin.
- Onaylı dock, profil simgesi, sandıklar, kupa ve para birimleri referanstır;
  her yeni nesne aynı renge veya aynı kare levhaya çevrilmez.
- CSS/SVG çerçeve ve zeminler mevcut fiziksel yüzeylere uyarlanır. Yeni neon
  HUD, tel kafes veya ince teknik çizim dili ayrı bir aile gibi eklenmez.
- Tema renkleri değişebilir; ışık, malzeme derinliği, tipografi, yüzey/düğme
  davranışı ve küçük ekranda okunabilirlik ortak kalır.

Referanslar: `GORSEL_DONUSUM_PLANI_20261015.md`,
`client/assets/ui/dock-casual-v1/`, `client/assets/ui/chests-casual-v2/`,
`client/src/social-profile-v5.css` ve onaylı mevcut profil yüzeyleri.

## Her sürümde görsel kontrol

- [ ] Yeni öğe, aynı ekrandaki onaylı referanslarla birlikte incelendi.
- [ ] 320/393 px görünüm, TR/EN, uzun metin ve kilit/normal/seçili durumlar doğru.
- [ ] Kilitli öğe için ayrı önizleme gerçek renkleri gösteriyor; sahiplik vermiyor.
- [ ] Siluet ve motif özgün; yalnız yeniden renklendirme yeni tasarım sayılmıyor.
- [ ] Boyut, hareket azaltma, dokunma hedefi ve kare bütçesi korunuyor.
- [ ] Aday ekran görüntüleri ve cihaz/görsel kabulü kanıt dosyasına yazıldı.

Yeni çizim paketleri en fazla 10 benzersiz öğelik önizlemelerle incelenir.
Kaynakta hazır iş ile görsel kabulü tamamlanan ve canlıya yayımlanan iş ayrıdır.

## Yön değişikliği gerekirse

Önce problem ve yeni sanat brief'i, sonra eski/yeni yan yana örnekler ve
ekran/varlık envanteri hazırlanır. Ortak bileşenler, raster/CSS/SVG varlıkları,
savaş okunabilirliği, dosya/cihaz bütçesi ve mevcut kozmetik sahipliklerinin
korunması için geçiş işleri checklist'e eklenir. Tek ekranı farklı stile
çevirip gerisini bırakmak tamamlanmış geçiş sayılmaz. Seçilen yeni yön
ürün/görsel kabulünden sonra sürümlü, aşamalı paketlerle uygulanır.
