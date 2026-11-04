# 2.4.0 / UI-07 — sarı geri ve ileri gezinme

Tek görünüm kaynağı `client/src/navigation-back-v1.css`: 44×44 piksel, sarı yüzey,
kahverengi kenar, alt gölge ve yalnız ok. İleri aynı okun yatay çevrilmiş biçimidir.
Eski mavi `::before` yüzeyi ve bildirim `::after` noktası gezinme üzerinde kapatılır.
Basılı durumda 2 px hareket, klavye odağında sarı çerçeve, devre dışıyken %55
opaklık kullanılır. Eski bağımsız ikon kuralları odakta sarı yüzeyi silemez.

[2.4.0 briefi](releases/2.4.0.md) · [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#ui-07) ·
[Modül sesleri](release-240-module-audio-matrix.md) · [Çekirdek sesleri](release-240-core-audio-matrix.md)

| Ekran | Seçici | Yön ve mevcut hedef | Yerel akış kanıtı |
| --- | --- | --- | --- |
| Devre Yolu | `#arena-detail-close` | geri → savaş merkezi | `release221-social.spec.js` |
| Lider panosu | `#leaderboard-back` | geri → Devre Yolu | `release221-social.spec.js` |
| Oyuncu profili | `#public-profile-close` | geri → açan ekran/pano | `release221-social.spec.js` |
| Takım profili | `#team-profile-close` | geri → oyuncu profili | `release221-social.spec.js` |
| Takım yönetimi | `#team-management-back` | geri → takım profili sekmesi | `navigation-back.spec.js`, salt okuma sahip fixture’ı |
| Özel sohbet | `#direct-message-back` | geri → sohbet listesi | `navigation-back.spec.js`, boş sohbet fixture’ı; mesaj gönderilmez |
| Haftalık turnuva | `#weekly-event-screen .navigation-back` | geri → etkinlikler | `navigation-back.spec.js` |
| Takım turnuvası | `#team-event-screen .navigation-back` | geri → etkinlikler | `navigation-back.spec.js` |
| Günlük giriş ödülleri | `[data-screen-panel="daily-rewards"] .navigation-back` | geri → ödül bölümleri (`daily`) | `navigation-back.spec.js` |
| Günlük/sezonluk emirler | `[data-screen-panel="daily-missions"] .navigation-back` | geri → ödül bölümleri | `navigation-back.spec.js` |
| Sezon ödülleri | `[data-screen-panel="rewards"] .navigation-back` | geri → ödül bölümleri | `navigation-back.spec.js` |
| Etkileşimli rehber | `.guide-next.navigation-forward` | ileri → rehberin sonraki adımı | `navigation-back.spec.js`, gerçek GuideOverlay render/Enter/dönüş çağrısı |
| Eğitim | `[data-tutorial-next].navigation-forward` | ileri → eğitimin sonraki adımı | `frontend-components.test.js`, gerçek controller; tarayıcıdaki ortak yüzey rehberle ölçülür |

Başla/Tamam/Tamamla işlemleri yazılı eylem olarak kalır. Dekoratif oklar, satın al,
iptal, silmeyi geri al ve pencere kapatma işlemleri bu sınıfa dönüştürülmez.
Mevcut hedef dinleyicileri ve tarayıcı/native geri yöneticisi değiştirilmedi.

`e2e/navigation-back.spec.js` on bir statik geri düğmesinin boyut/renk/pseudo-element
eşitliğini ölçer. Ödül alt sayfaları ve ileri rehber; TR/EN, 320×568 ve 393×852
boyutlarında görüntülenir; basılı/klavye odağı/devre dışı durumlar ayrıca ölçülür.
Takım yönetimi ve sohbet aynı dört birleşimde gerçek düğmelerle açılıp kapanır.
Profil/pano zinciri `e2e/release221-social.spec.js` ile proje viewport’larında yürür;
her profil penceresinin dört dil/boyut birleşiminin ayrı görsel kabulü yapılmış sayılmaz.

İncelenen masaüstü görüntüleri `qa_reports/release-240-navigation/` içinde tutulur.
Tarayıcı koşusuna ait görüntüler `test-results/navigation-back-*/` ve
`test-results/release221-social-*/` içinde yeniden üretilir. Chromium masaüstü,
Android Chrome ve iPhone WebKit öykünmesi fiziksel cihaz kabulü değildir.
Kullanıcı bu turda yerel kontrolle devam edilmesini istedi; Android cihaz dinlemesi
ses matrislerinde ertelenmiş olarak kayıtlıdır. İş durumu `branch_ready` yayında
olduğu veya 2.4.0 yayın kapısının kapandığı anlamına gelmez.
