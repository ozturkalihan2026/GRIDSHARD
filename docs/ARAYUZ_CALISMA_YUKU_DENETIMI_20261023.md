# Arayüz çalışma yükü denetimi — 23 Ekim 2026

Kapsam: onaylanmış resimli arayüzü ve oyun davranışını koruyarak çağrısız
eski kodu, görünmeyen DOM üretimini, gereksiz saatleri ve geç yanıt yarışlarını
azaltmak. Sunucu oyun kuralları, para/ödül sahipliği ve Billing değiştirilmedi.
Bu kayıt bütün bellek/FPS sorunlarının çözüldüğü anlamına gelmez.

## Uygulanan düzeltmeler

- Menü: beş kirli bölümün boşta arka planda yeniden kurulması kaldırıldı.
  Yalnız görünen bölüm, Kartlar'da yalnız seçili koleksiyon çizilir. Kirli
  küme beş anahtarla sınırlı; gizli sekme/PLAY sırasında kuyruğa iş eklenmez.
- Mesaj kutusu: kapalıyken ödül ve okunmamış sayaçları canlı kalır; beş alanın
  kartları kurulmaz. Açılırken güncel veri çizilir. Toplanmamış ödüller korunur.
- Profil/kozmetik: değişmeyen avatar aynı DOM düğümünü korur; WeakMap kullanılır.
  Dört seçenek alanı tek önbellekte tutulur. Dil, sahiplik, seçim, kaynak veya
  temizlenmiş DOM önbelleği geçersizleştirir; büyüyen geçmiş listesi yoktur.
- Mağaza: saniyelik çizim yalnız görünür mağazada çalışır. Hediye geri sayımı
  timer çağrı adedinden değil son tarihten hesaplanır; arka plan throttling'i
  süreyi uzatmaz. Süre bitince sunucu yenilemesi yapılır, istemci ödül vermez.
- Etkinlik/görev: 20 saniyelik fikstür ve 30 saniyelik görev çizimleri gizli
  sekmede çalışmaz. Maç/ödül sonucunu belirleyen sunucu yolu korunur.
- Oyuncu/takım ziyaret profili: istek sürümü, görüntüleyen hesap ve açık
  pencere kontrolü; geç veri/hata yeni ziyaretin üzerine yazamaz. İkinci sosyal
  istekten sonra da oyuncu profilinin geçerliliği yeniden denetlenir.
- Kullanılmayan WebGL deneyi, 11 çağrısız yardımcı, eski CSS/HTML/simge tabloları,
  çağrısız snapshot sınıfı ve boş ses havuzu kaldırıldı. Ayrıntılı liste:
  [Eski görsel kod temizliği](ESKI_GORSEL_KOD_TEMIZLIGI_20261022.md).

`client/tests/visible-ui-work.test.js`: 11 davranış testi; 100 tekrarlı yenileme,
gizli/geri açılan sekme, savaş sırasında kuyruk, kapalı kutuda sıfır kart üretimi,
avatar/kozmetik düğüm kimliği, geçen zaman ve asenkron profil yarışları.

## Sırayla gözden geçirilen alanlar

| Alan | Bulgular ve sınır |
| --- | --- |
| Giriş/eğitim | Gizli açılış çizgisi ve solma sonrası alt animasyonlar temizlendi; eğitim/maç geçiş korumaları mevcut. |
| Savaş/efekt | Eski no-op WebGL çağrıları ve batarya/güçlendirici mükerrer halkası kaldırıldı. Gerçek nişan/geri tepme, kalkan, çekirdek moteleri korunur. |
| Canvas/VFX | Parçacık, halka, mermi, zamanlayıcı, önbellek ve görülen olay kümelerinin sınır/reset yolları incelendi; sınırsız yeni döngü eklenmedi. Bu, uzun koşu bellek ölçümü değildir. |
| Müzik/ses | Çağrısız ön yükleyiciler kaldırıldı. Gerçek decode/voice sınırları ve kapanış temizliği korunur; menü saati durum değişiminde durur. |
| Mağaza/ödül/mesaj | Görünürlük ve saat düzeltmeleri uygulandı; ödül toplama/iade/satın alma protokolüne dokunulmadı. |
| Meta çarkıfelek/turnuva | Etkin olay yolları ve periyodik fikstür çizimi incelendi; etkin turnuva/ödül kodu ölü sayılıp silinmedi. Son devamda yalnız açık turnuva ve seçili alt panelin çizilmesi uygulandı. |
| Ayarlar/profil/kozmetik | Etkin yükleyiciler korunur; aynı kozmetik verisinin bütün seçenekleri yeniden kurması önlendi. |
| Ziyaret profili/sıralama | Açılış/veriyle çizim var; bağımsız sonsuz animasyon döngüsü bulunmadı. Ziyaret yanıt yarışları düzeltildi. |
| Takımlar/arkadaşlar | Sosyal yoklama gizli sekmede ve PLAY'de çıkıyor; in-flight kilidi istek birikmesini önlüyor. Son devamda kapalı arkadaş listesi ve seçilmemiş takım alt panel çizimleri kaldırıldı; davet/bildirim ve ebeveyn kilidi davranışları test edildi. |
| Dil/çeviri | Sınırlı metin önbellekleri ve WeakMap öznitelik kaydı mevcut; savaş efekt alanları mutasyon çevirisinden dışlanıyor. |

## İlk doğrulama (aşağıdaki son devamla güncellendi)

- 654/654 istemci, 10/10 üretim paketleme testi geçti. Paketleme negatif girdi
  testinde beklenen eksik CSS hata çıktısı var; test sonucu başarılıdır.
- İzole web paketi: `2f255d2103c78816`, 44 betik / 619 varlık.
  `artifacts/web-2.1.1-h5FJ1n/dist/`; eski üç WebGL betiği yok.
- 32 tarayıcı vakası: 30 geçti / 2 başarısız. Son hedefli tekrar: 3 geçti /
  2 başarısız. Kanıtlar `artifacts/cleanup-20261023/` altındaki
  `e2e-32-results.json` ve `e2e-targeted-results.json`.
- Chrome masaüstü son kısa savaş ölçümü: 121.5 FPS, p95 14.5 ms, 0 donma.
  Android Chrome öykünmesinde aynı tur önceki ölçüm: 119.7 FPS, p95 15.5 ms,
  0 donma. Bunlar fiziksel telefon veya uzun süreli bellek doğrulaması değildir.
- Windows iPhone/WebKit: savaş bütçesi hâlâ başarısız (~0.7 FPS, 15 donma).
  Ayrıca arena geri düğmesine gerçek tıklama kararlılık beklerken zaman aşımı
  var. Toplu DOM okuması bunu çözmedi; force-click ile gizlenmedi.
- Betiksiz sahne/tek görünür animasyon deneyleri de yavaştı; tek suçlu veya
  sürücü kusuru kanıtlanmadı. Görsel bozan/işe yaramayan deneyler geri alındı.
  FPS eşikleri değiştirilmedi, WebKit testi atlanmadı.

Gerekenler: WebKit kare/tıklama sorununu gerçek cihaz karşılaştırmasıyla ayırmak,
uzun savaş/menü gezinme bellek ölçümü, kalan sosyal/alt panel çizimlerini
bildirim davranışını bozmadan sınamak, ardından tüm CI yayın kapılarını geçirmek.
Bu tur commit/push, sunucu geçişi veya AAB yapılmadı. Sürüm 2.1.1 / Android 9
adayıdır; kurulu sürümün `/health.version` uyumluluk alias'ı korunur.

## Son devam sonuçları

- Kapalı arkadaş sayfası ve seçilmemiş arkadaş/takım alt panelleri artık kart
  kurmaz. Bildirim/davet sahipliği ve ebeveyn kilidi korunur. Yönetim editörü
  yalnız açık yönetim sekmesinde kurulur. 7 davranış testi visible-social-panels'te.
- Turnuva dizini iki gizli sıralamayı kurmaz; turnuva içinde yalnız açık alt
  panelin sıralama/takvim/fikstürü kurulur. Sekme değişimi güncel veriyi çizer.
- Mesaj açılım anahtarları mevcut hesap/mevcut mesajlarla sınırlanır; 1000 eski
  anahtar testi var. Bu sunucu mesajını/ödülü/kalıcı okundu kaydını silmez.
- Eski body::before ızgara/maske, güncel opak arka plan arkasında görünmüyordu.
  Minimal sahnede ve gerçek menünün dondurulmuş 1179x1977 çekiminde kaldırılması
  0 piksel fark üretti. Kural silindi; güncel arka plan değişmedi. Git'ten kurtarılabilir.
- Tek kırmızı nokta + bütün CSS ~10 FPS; yalnız pseudo kaldırılması ~19 FPS;
  tüm kök dekorların kaldırılması ~65 FPS. Son seçenek görüntüyü değiştirir ve
  uygulanmadı. Katman zorlama ve düzleştirme denemeleri faydasızdı; üretime girmedi.
- Son kaynak: 664/664 istemci + 10/10 paketleme testi geçti. İzole web paketi
  `1c7c305b4db6e2ba`, 44 betik / 619 varlık.
- Son 18 E2E: 17 geçti / 1 başarısız. Bağımsız mesaj/arena gerçek geri tıklamaları
  WebKit'te de geçiyor; eski birleşik testin toplam süre aşımı düğmeye özgü hata
  olarak kanıtlanmadı. Süre artırılmadı/force-click eklenmedi, assertion kapsamı aynı.
  E2E'den sonra gizli sekmede gelen takım yanıtının dönüşte çizim koruması
  tamamlandı; son kaynakta 664/664 istemci testi yeniden geçti.
- Savaş: masaüstü Chrome 131.9 FPS, Android Chrome öykünmesi 140.2 FPS, ikisinde
  p95 7.5ms / 0 donma. WebKit 2.7 FPS, p95 389.5ms / 0 donma; bütçe yine başarısız.
  Eşikler gevşetilmedi. İyileşme, oynanabilirlik veya fiziksel cihaz kanıtı değildir.
- 150 menü yönlendirmesi / 2 dakika bellek testi geçti: GC sonrası DOM düğümü
  20220, dinleyici 1081, document 7 sabit. Heap 9664640 -> 9856196 -> 9991916
  bayt (+0.31 MiB). Bu uzun savaş veya fiziksel cihaz sızıntı testi değildir.
- Sunucu görev sonlandırma, yayın birleştirme ve süre aşımı/oturum temizliği
  salt okunur incelendi; yeni sunucu kodu değiştirilmedi.

Kanıtlar `artifacts/cleanup-20261023/`: `e2e-final-18-results.json`,
`e2e-menu-memory-results.json`, `e2e-webkit-separated-results.json`,
`paint-probe-root-results.json`, `paint-probe-layers-results.json`,
`paint-probe-pixels-results.json`, `paint-probe-menu-pixel-results.json`.
Geçici tanı kodu da artifacts'tadır; ürün paketine/normal CI'ya girmez.

Kalan işler: WebKit repaint maliyeti, gerçek cihaz ve uzun savaş bellek
doğrulaması, ardından CI yayın kapıları. Yeni commit/push, sunucu yayını veya
AAB yapılmadı; tüm olası performans sorunları bitti denemez.
