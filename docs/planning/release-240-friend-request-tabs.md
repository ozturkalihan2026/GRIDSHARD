# UI-09 — Gelen / Giden İstek çizgi düzeltmesi

**7 Kasım ortak düzeltme:** Mesaj kutusu, kart sayfaları/modül sınıfları,
takım, turnuva, ayarlar, kozmetik ve ortak lider panosu alt sekmelerindeki
seçili metin alt çizgisi ortak bileşen kuralından kaldırıldı. Turkuaz yüzey,
kenar, bildirim ve klavye odağı korunur. Oyuncu ve takım koleksiyonu önizleme
düğmeleri aynı pahlı `gs-action-button` yüzeyini, sakin altın `#d7b66b`
ve koyu `#302514` yazıyı kullanır; kilit/sahiplik değişmez.
`presentation-refinements.spec.js` bütün ana alt sekme akışlarını ve393/320
düğme görünümünü; `liveops-cosmetics.spec.js` takım sekmelerini ve her iki
önizlemenin sahiplik vermediğini doğrular. Chromium/Android dört test PASS;
yerel kanıt `qa_reports/release240-tabs-e2e.log`. Genel yayın takvimi korunur.

**6 Kasım genişletmesi:** Aynı çizgi düzeltmesi Arkadaş, Mesaj, Gelen İstek,
Giden İstek ve Savaş sekmelerinin tamamına uygulandı. Seçim/odak ve rozetler
korunur. Üç tarayıcıdaki TR/EN 320/393 gerçek gezinme kabulü beş sekmeyi kapsar.
Aşağıdaki iki sekmeli kapsam 5 Kasım tarihsel kaydıdır.

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

Üretim kaynağı `619c90a`; [CI 42019478488](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/42019478488)
bütün işleri geçti. Arkadaşlık sekmesi akışı Chromium/Android’in 78 ve
Safari’nin 35 genel senaryosuna dahildir; ayrı genel tarayıcı artifact’lerinde
TR/EN 320/393 ekran görüntüleri korunur.
