# İlk giriş eğitimi — 23 Ekim 2026

## Neden açılmıyordu?

`syncFirstMatchTutorial` otomatik eğitim kontrolü, savaşın `renderBattleFrame`
döngüsünden çağrılıyordu. Menüde gereksiz çizimi engellemek için savaş döngüsü
yalnız `play` ekranında çalışacak şekilde sınırlandırılmıştı. Bu doğru sınır
korunurken eğitimin ayrı menü yaşam döngüsü eksik kalmıştı. İlk girişte oyuncu
menüde olduğundan başlangıç kontrolü hiç uyanmıyordu.

## Çözüm

- Başarılı başlangıç yüklemesi bitince eğitim kontrolü ayrıca uyandırılır.
- Sunucudan başarılı bootstrap gelmeden, geçici sıfır maç istatistiğiyle
  otomatik eğitim başlatılmaz. Yükleme/hata ekranı korumaları sürer.
- Tıklama, pencere kapanışı ve görünürlüğe dönüş tek zamanlanmış kontrole
  birleştirilir. Birden fazla olay paralel eğitim döngüleri oluşturmaz.
- Yalnız etkin menü eğitimi 200 ms aralıkla bağlamını izler. Bu tam UI render
  değildir; ilgili rehber adımı kontrol edilir. Eğitim bitince timer kalmaz.
  Deneyimli oyuncularda ve otomatik rehberi istemeyen test oturumlarında
  polling başlatılmaz. Ayarlar'dan açıkça istenen tekrar eğitimi çalışır.
- Uygulama gizlenince timer iptal edilir; dönüşte tek kez uyanır. Savaş
  ekranında ayrı eğitim polling'i yoktur; mevcut savaş kontrolü kullanılır.
  Menüde savaş rAF/efekt döngüsü yeniden açılmamıştır.

## Doğrulama

712/712 istemci testi, 10/10 paketleme sözleşmesi geçti. Yeni üç yaşam döngüsü
testi; olay birleştirme, 200 ms sınırı, gizleme/dönüş, savaşta ikinci döngü
olmaması, tamamlanma/deneyimli oyuncu/otomasyon/manuel tekrar ve bootstrap
hazır olmama durumlarını kapsar. Özel inceleme hesabı davranışı da korunur.

Gerçek yeni misafir açılışı üç tarayıcıda 3/3 geçti: Chromium, emüle Android
Chrome ve emüle iPhone WebKit. Açılış/hizmet yüklemesi, hesap/günlük meta
pencerelerinden sonra eğitim menüde otomatik görünür; yeniden yüklemede de
görünür; BAŞLA → mağaza → hediye sandık adımları ilerler. Ayarlar üzerinden
zorla başlatma veya savaş ekranını açma kullanılmaz.

Ardından emüle Android'de mevcut tam eğitim ve görünürlük matrisi de 4/4
geçti (1,6 dakika): menü turu, ilk savaşın bütün yönetmenli sahneleri, zafer
ve ödül adımları, tamamlandıktan sonra yeniden açılmama; ayrıca eşleştirme
hatasında erişilebilir iptal ve yeniden denemeyle savaşa giriş doğrulandı.

Kanıt: `artifacts/cleanup-20261023/client-onboarding-audit.tap`,
`artifacts/cleanup-20261023/e2e-onboarding-start-3-results.json` ve
`artifacts/cleanup-20261023/e2e-onboarding-flow-android-4-results.json`.
Üretim derlemesi izole dizinde doğrulandı: `cfa205ff7f6f2353`, 44 betik,
614 varlık. Ana dist, Android ve kullanıcı verisi değiştirilmedi.

Bu düzeltme WebKit savaş FPS sorununu çözmez; yeni uzak CI/commit/push,
sunucu yayını veya AAB üretimi yapılmadı.
