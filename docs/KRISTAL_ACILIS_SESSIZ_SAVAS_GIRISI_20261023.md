# Kristal açılışı ve sessiz savaş girişi — 23 Ekim 2026

## Savaş alanı açılışındaki ses

Neden: `renderOnlinePlayStatus` içindeki ilk `battle` geçişi ile yerel savaş
başlatıcısı doğrudan `energy_transfer` efektini tetikliyordu. Üretim veya çekirdek
gücü olayı olmadığı halde alan açılır açılmaz bu ses çalıyordu. Her iki çağrı da
kaldırıldı. Eşleştirme/savaş müziği, gerçek üretim olayları, çekirdek gücü hazır
uyarısı ve ödül sesi korunur; genel ses düzeyi veya ses motoru değiştirilmedi.

Yeni kaynak testi hem çevrimiçi hem yerel girişte sahte efekt çağrısı olmadığını
ve iki anlamlı `energy_transfer` çağrısının kaldığını denetler. Gerçek eşleştirme
tarayıcı testi ses yöneticisine gelen çağrıları kaydederek savaş tahtası açılırken
bu efektin istenmediğini üç tarayıcıda doğrular. Bu bir hoparlör/dinleme ölçümü
değil, gerçek istemci olay yolunun kontrolüdür.

## Yeni açılış

Mevcut `gridshard-emblem-v2.webp` değiştirilmedi. Camgöbeği kristal ve altın halka
kimliği; koyu lacivert devre odası, simetrik statik SVG hatları, keskin HUD
çerçevesi ve camgöbeği/altın yörüngelerle tamamlandı. Marka yazısı sabit ve net;
logo 4px'lik hafif hareket, iki halka 14/24 saniyelik transform döngüsü kullanır.
Bitmap, canvas, parçacık motoru, yeni JavaScript timer/rAF veya ağ isteği eklenmedi.

Eski iki `.boot-*` CSS bloğu ve ana ekran dosyasındaki açılış override'ları
kaldırıldı; bütün açılış sunumu `client/src/startup-loading.css` dosyasında.
Eski kayan izler, çizgili bar animasyonu ve hareketli marka yazısı kaldırıldı.
Gizli/tamamlanmış/hata durumunda dekor hareketi durur; azaltılmış hareket
tercihinde animasyon/geçiş yoktur. Mevcut kapanışın animation cleanup'ı korunur.

Sunucu/profil/koleksiyon/hesap hazır olmadan kapanmaz; bar dört gerçek API adımı
ile ilerler. Sahte ilerleme veya ek zorunlu bekleme eklenmedi. Hata/yeniden
deneme, erişilebilir durum/progressbar, inceleme girişi ve tam hesap kimliğinin
yalnız Ayarlar'da gösterilmesi korunur. Önceki ilk giriş eğitimi düzeltmesi aynı.

## Kanıt

- Son 713/713 istemci testi, 10/10 paketleme sözleşmesi geçti.
- Üç tarayıcıda ses girişi, sunucu/profil hatası ve yeniden deneme, hazır olmadan
  kapanmama, logo yüklenmesi ve animasyonların bırakılması: 15/15 geçti.
- Son rötuş sonrası responsive/motion tekrarı 3/3 geçti. Her tarayıcı 320×568,
  360×800 ve 1280×720 boyutlarını kontrol eder; bar görünür ve görünüm içindedir,
  sürüm/review düğmesi çakışmaz, başlık/logo/yükleme alanı taşmaz.
- Önizlemeler gerçekten çalışan açılıştan alındı; hesap API'si testte bekletilir,
  kullanıcı verisi/satın alma değiştirilmez. Son portre/masaüstü görselleri görsel
  olarak incelendi. Yeniden boyutlandırma sonrası iki frame bekleme, eski
  compositor karesinin ekran görüntüsüne girmesini engeller.
- İzole üretim derlemesi `a91f680d83aabe52`, 44 betik, 614 varlık. Yeni CSS paketli;
  ana dist veya Android değiştirilmedi.

Raporlar: `artifacts/cleanup-20261023/client-crystal-startup-audit.tap`,
`e2e-crystal-startup-audio-15-results.json`, `e2e-crystal-startup-final-3-results.json`.
Önizlemeler: `artifacts/crystal-startup-20261023/portrait.png`, `desktop.png`.

Commit/push, yeni uzak CI, sunucu yayını veya AAB yok. WebKit savaş FPS sorunu
ayrı ve açık; buradaki işlevsel açılış matrisi FPS onayı değildir.
