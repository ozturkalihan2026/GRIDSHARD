# UI-09 — Gelen / Giden İstek çizgi düzeltmesi

5 Kasım 2026 kullanıcı isteği; 2.4.0 kapsamına eklendi.

Ortak etkin sekme stili metne 4 px ofsetli alt çizgi veriyordu. Arkadaşlar
ekranındaki iki kelimelik GELEN İSTEK / GİDEN İSTEK etiketleri dar ekranda
sarılınca ilk satırın çizgisi ikinci satırdaki İSTEK kelimesinin üzerine
geliyordu. Bu iki sekmenin metin dekorasyonu kaldırıldı. Seçili turkuaz yüzey,
kenar, klavye odağı, bildirim noktaları ve sekme hedefleri korunur.

Kaynak: `client/src/ui-components-v2.css`, yalnız
`#friends-screen button[data-friends-tab="incoming"/"outgoing"]` alanı.
Kozmetik/takım sekmeleri veya diğer ortak tab stilleri değiştirilmedi.

`e2e/release221-social.spec.js` içindeki yeni kullanıcı akışı her iki sekmeyi
seçer; gerçek seçili paneli ve aria-pressed durumunu, dekorasyonun none
olduğunu, turkuaz kenarı ve yatay taşma olmadığını doğrular. TR/EN,
320×568 ve 393×852; Chromium, Android Chrome ve Safari öykünmesinde geçti.
Çıktı `test-results/release221-social-friend-request-*/` altında yeniden üretilir.
Bu, fiziksel Android kabulünün yerine geçmez; kullanıcı yerel kontrol istedi.

Görev checklist, 2.4.0 S1-GEZINME paketi, çalışma aralıkları ve RELEASE-01
bağımlılığına bağlandı. Canlı sunucu ve AAB değiştirilmedi.
