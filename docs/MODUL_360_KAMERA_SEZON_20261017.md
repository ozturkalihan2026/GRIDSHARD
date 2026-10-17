# İlk 10 modül, 30° kamera ve sezon teslimi — 17 Ekim 2026

> Kamera/gövde sunumu ve VFX bölümleri artık `MODUL_KAMERA_VFX_20261017.md`
> ile güncellenmiştir. Aşağıdaki düz tahta/sığ katman yaklaşımı tarihsel v12'dir;
> güncel savaş renderer'ı değildir. Sezon teslim notları geçerliliğini korur.

## Bağlanan savaş görünüşü

İlk 10 cihaz aynı sürekli 360° yönelme renderer'ına bağlıdır: Lazer, Kalkan,
Batarya, Güçlendirici, EMP, Onarım, Sönümleyici (`armor` kimliği değişmedi),
Soğutucu, Darbe Topu ve Füze Fırlatıcı.

- Kamera isteği **tepeden 30° eğim** olarak yorumlandı. Yerden 30° bakış veya
  gerçek hacimli 3D model değildir; resimli, sığ katmanlı **2.5D** sunumdur.
- Dönen üst parça, sabit kaide ve üç sığ kenar katmanı vardır. Aynı doku
  paylaşılır; 360 kare, her modüle ayrı canvas/WebGL ya da yeni rAF eklenmedi.
- Kamera cihaz katmanında uygulanır. Çift eğim oluşmaması için hücre tahtası
  düz tutulur; CAN/ısı çubukları ve kablolar dönmez. Savaş Perspektifi kapalı
  veya grafik Düşük ise düz, katmansız/azaltılmış sunum korunur.
- Gerçek saldırı/sabotaj/destek/katkı olayları yönü belirler. Gerçek dış hedefi
  olmayan pasif cihaz dönmez. Kendine enerji/onarım olayı boş yön değişimi
  oluşturmaz. Aynı hedefe kilit eylemler arasında korunur.
- EMP `sabotage_applied` hedefini kullanır. Onarım/Soğutucu kendi tarafındaki
  gerçek alıcıya; uygun pasif katkılar gerçek alıcıya; savunma cihazı gerçek
  hasarın kaynağına bakabilir. Çoklu hedefte sahte ek çevrim kuyruğu yoktur.
- Lazer'in kabul edilen başlık/kaide çizimi tekrar kullanıldı. Darbe Topu ve
  Füze de mevcut atış sunumunda kendi kayıtlı namlu yönünden çıkar. Yeni VFX
  veya ses davranışı bu turda eklenmedi.
- Kart/koleksiyon/raf resimleri değiştirilmedi; değişiklik savaş alanındadır.

## Geometri ve performans sınırı

Dönen parçanın üst düzlemindeki dört nokta aynı hedef/namlu izdüşümünde
kullanılır. Köşe ölçümleri düzen dönemi ve hücre boyutu için önbelleklidir;
aynı düzende tekrar ölçülmez. Hücrenin ekran çevirisi mevcut kart ölçümünden
eklenir. Boyut/kamera değişiminde yeniden ölçülür; mevcut savaş saati kullanılır.

Bu, gerçek cihaz/FPS ölçümü değildir. 30 cihazda CSS katmanlarının gerçek
maliyeti yerel testte değerlendirilmelidir. Yeni sanatın gerçek oyun görsel
kabulü kullanıcıdadır; tarayıcı/sunucu başlatılmadı veya yeniden başlatılmadı.

## Üretim / dosyalar

- Built-in image_gen; her varlık ayrı çağrı. Kadraj/kamera için Batarya,
  Güçlendirici ve Darbe Topu ayrıca düzeltildi. CLI/API kullanılmadı.
- Tam promptlar, referanslar, üretim kökeni ve mil/namlu kayıtları:
  `docs/MODUL_YAW_V12_PROMPTLARI_20261017.json`.
- Runtime: `client/assets/ui/modules-yaw-v2/`: dokuz üst parça + ortak kaide,
  10 gerçek alpha WebP, 256px, toplam **141.910 bayt**. Büyük PNG'ler Git'e
  eklenmedi. Lazer'in mevcut `laser-yaw-v1/` dokuları korunur.
- Hazırlama: `tools/prepare-modules-yaw-v12.cjs`. Uniform küçültme, şeffaf
  dolgu ve mil kaydı; elle yeniden boyama yok. Kompozit/çıkarma sırası için
  kadraj hatası önizlemede yakalanıp düzeltildi. Dört kadranda doluluk ve tam
  dönüşte yuva dışına taşmama artık otomatik kontroldür.
- Görünüş: `client/src/modules-yaw-v12.css`; renderer
  `client/src/module-device-art.js`; hareket `client/src/battle/module-motion.js`.
- Önizleme: `artifacts/modules-yaw-v12-20261017/modules-30deg-preview.webp`.
  Bu bir varlık/kamera levhasıdır, oyun ekran görüntüsü değildir.
- Audit: `tools/audit-modules-yaw-v12.cjs`; sonuçlar
  `qa_reports/modules-yaw-v12-audit-20261017.json` ve
  `qa_reports/modules-yaw-v12-assets-20261017.json`.

## Sezon: bilinmeyen teslim yöntemi

Güncel kaynak `stock-v1` kabul ediyor; ücretsiz/premium ve iç sandıklı/sandıksız
kademeler yalıtılmış TestClient testlerinde başarılı. Bildirilen hata bu kaynakla
tekrarlanmadı. Önceki, yalnız `inbox-v1` kabul eden çalışan sunucu sürümü olasıdır;
çalışan sürecin sürümü bu turda doğrulanamadı. Kullanıcı **yerel Python sunucusunu
güncel kodla yeniden başlatıp istemciyi yenilemelidir**. Çalışan süreç kapatılmadı.

- İstemci artık bu reddi anlaşılır `season_delivery_unsupported` / sunucu
  yeniden başlatma açıklamasıyla gösterir. Ödülü açabilecek eski protokole
  otomatik geri düşmez; aynı deterministik istek kimliği korunur.
- `/health` yanıtı desteklenen `season_chest_delivery_protocols` listesini
  bildirir; güncel yanıtta `stock-v1` vardır.
- Bilinmeyen protokol reddinin ödül/claim/stoğu değiştirmediği ücretsiz ve
  premium uçlarda test edildi. Para/denge/satın alım kuralları değiştirilmedi.

## VFX dosyası

Kullanıcının `VFX.txt` dosyası okundu; olay, hedef, süre ve ses gereksinimleri
`docs/VFX_ILK10_SOZLESMESI_20261017.md` içine ayrıldı. Kubbe, soğuk hava, kol
eklemleri, renkli destek ışınları ve yeni sesler tamamlandı diye gösterilmez.
Lazer'in önerilen 1 sn görsel süresi sunucunun ateş aralığını değiştirmeyecek.

## Doğrulama

135 odaklı Node kontrolü ve 31 yalıtılmış Python sunucu testi başarılı.
38 betik / 17 stil hedef sözdizimi kontrolü başarılı; CSS uyarısı yok, mevcut
20 çeviri anahtarı uyarısı değişmedi. Alpha, boyut, kayıt, kadran doluluğu,
tam dönüş sınırları, web/native asset listesi ve köşe önbelleği kontrol edildi.
Dist/native/AAB, canlı hesap veya Git commit/push değiştirilmedi.
