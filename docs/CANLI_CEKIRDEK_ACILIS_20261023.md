# Açılışta tek canlı çekirdek — 23 Ekim 2026

Kullanıcının kırmızı/yeşil işaretli ekranına göre:

- Üstteki ayrı reaktör logosu DOM'dan ve eski float stilleriyle birlikte kaldırıldı.
- GRIDSHARD başlığı ve slogan mavi üst boşluğa taşındı.
- Devrenin içindeki reaktör gövdesi ve platform sabit bırakıldı. Kristalin
  parlaklığı 3,2 saniyede hafifçe nefes alır; küçük bir enerji kıvılcımı yükselir.
- Üç küçük CSS yüzeyi, yalnız opacity ve transform animasyonu kullanır.
  Yeni bitmap/video, canvas, rAF, timer, blur, sürekli yeniden çizim betiği
  veya tüm sahneyi sallayan bir animasyon eklenmedi.

## Hizalama ve yaşam döngüsü

`boot-circuit-stage` ve arka plan resmi tek 1024×1536 / 2:3 koordinat düzlemidir.
Portrede cover, yatayda contain karşılığı ölçülen CSS boyutuyla uygulanır.
Kristal sol/üst konumu %37,5 / %55,8; boyutu %11,5 × %7,1. Bunlar viewport
değil resim yüzdesidir; kırpma/yeniden boyutlandırmada enerji başka yere kaymaz.

Hata, tamamlanma ve hidden durumlarında üç animasyonun da CSS sahibi kapatılır.
Mevcut boot tamamlanma temizliği kalan animasyon zaman çizelgelerini iptal eder.
Azaltılmış hareket ayarında döngü/transition yoktur. Gerçek API ilerlemesi,
kimlik doğrulama ve yeniden deneme davranışı değişmedi. Kullanıcının ekranındaki
bağlantı hatası bu görsel iş kapsamında giderilmiş sayılmaz.

## Doğrulama / paket

- Tüm istemci: **715/715** geçti.
- Açılış: **9/9** E2E; Chromium, Android Chrome, Windows WebKit.
- 320×568, 360×800 ve 1280×720; başlık mavi boşlukta, efekt aynı resim
  koordinatında, ilerleme ve hata/yeniden deneme ulaşılabilir.
- Hata/bitmiş/gizli ve reduced-motion durumlarında animasyonların kapalı
  olduğu gerçek computed style ile doğrulandı.
- Yalıtılmış web paketi `ca4739cc7f343201`, 44 betik, 614 varlık. Ayrı logo
  açılışta referanslanmadığından runtime paketine alınmıyor. Orijinal logo
  dosyası tanıtım kapanışına gerektiği için silinmedi.
- Sunucu/ekonomi/savaş dosyaları bu revizyonda değiştirilmedi. Önceki
  WebKit savaş FPS problemi çözülmüş sayılmaz. Ana dist, Android, canlı
  sunucu, commit/push veya yayın işlemi yapılmadı.

Önizlemeler ve E2E JSON: `artifacts/startup-reactor-live-20261023/`.
Tam istemci günlüğü: `artifacts/cleanup-20261023/client-living-reactor-audit.tap`.
Tanıtım videosu aynı yerel kayıt akışıyla yeni açılışa göre yenilendi; kayıt
E2E geçti, sayfa hatası yok. Güncel MP4 40,7sn /1080×1920 /6.616.622 bayt.
`artifacts/promo-20261023/` altındaki timeline ve edit-report son kanıttır;
kontrol kareleri de yenilendi. `artifacts/startup-reactor-live-20261023/animasyon.mp4`
3,1sn'lik sessiz, gerçek açılış ekranı kaydıdır; CSS hareketini doğrudan gösterir.
