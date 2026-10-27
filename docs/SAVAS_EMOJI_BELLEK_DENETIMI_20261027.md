# Savaş emoji düğmesi — bellek ve kaynak ömrü denetimi

27 Ekim 2026. Kullanıcı savaş alanındaki emoji düğmesinin bellek sorunu
oluşturup oluşturmadığını sordu.

## Sonuç

Masaüstü Chromium ve Android Chrome emülasyonunda 1050 aç/kapa döngüsü,
zorlanmış çöp toplama ve DOM/olay dinleyicisi sayaçlarıyla ölçüldü. Önceki
kodda da aç/kapa sayısıyla sürekli büyüyen bir düğüm/dinleyici birikimi
görülmedi. Tepsi her açılışta eski seçenekleri değiştiriyordu; eski
düğümlerin kendi click dinleyicileri çöp toplanmasına engel değildi.

Üç gereksiz yük vardı:

- Emoji kontrolünün her HUD okuması `profileState.viewModel()` çağırıp
  bütün ilerleme/ödül/kozmetik dizilerinin görünüm kopyasını çıkarıyordu.
  10.000 yenilemede 10.000 tam profil kopyası doğrulandı.
- Emoji balonlarının bağımsız 1,9 saniyelik timeout'u ve gönderim beklemesinin
  3 saniyelik timeout'u ortak savaş temizliğine bağlı değildi. Çıkıştan hemen
  sonra iki balon ve bekleme callback'i kalıyordu; balonlar süre dolunca
  kendiliğinden siliniyordu. Bu, kalıcı birikim değil, eksik çıkış temizliğiydi.
- Kapalı tepsi son altı seçenek/dinleyiciyi saklıyordu. Bekleme durumu
  değiştiğinde aynı emoji resmi de yeniden oluşturuluyordu.

## Değişiklik

Sıcak HUD okuması artık yalnız mevcut `profileState.profile.cosmetics`
alanını okur; profilin tamamını kopyalamaz. Mevcut resim kimliği değişmeden
düğmenin çocuk düğümü yeniden kurulmaz; bekleme başlangıcı/bitişi animasyonu
yeniden başlatmaz. Açık/kapalı durum zaten aynıysa tekrar DOM yazımı yapılmaz.

Tepsi kapanırken seçenekler bırakılır. Her tahta için en fazla bir emoji
balonu tutulur; toplam sınır ikidir. Balonun doğal 1,9 saniyelik silinmesi
mevcut savaş süpürme kuyruğundadır; her balona ayrı timeout kurulmaz. Yeni
bir balon eskisinin kapanmasını iptal ederken eski closure referansı da bırakılır.

Savaştan çıkış, maç bitişi ve arka plana geçiş tepsiyi, balonları ve emoji
bekleme zamanlayıcısını hemen temizler. Arka planda gelen görsel olay
oynatılmaz. Aynı maçta arka plan/geri dönüş 3 saniyelik bekleme son tarihini
korur; yeni maçta istemci beklemesi sıfırlanır. Sunucu emoji sahipliği ve
3 saniyelik gönderim sınırı değişmedi.

## Ölçüm

Her iki tarayıcı profilinde de aynı sonuç elde edildi:

| Kontrol | Önce | Sonra |
|---|---:|---:|
| 10.000 kontrol yenilemesinde tam profil kopyası | 10.000 | 0 |
| Tepsi kapalıyken saklanan seçenek | 6 | 0 |
| Çıkıştan hemen sonra kalan balon | 2 | 0 |
| Çıkıştan hemen sonra bekleyen emoji timeout'u | 1 | 0 |
| Gönderim beklemesine girerken aynı düğme görseli korunuyor | Hayır | Evet |

Önceki 1050 döngünün altı GC örneğinde toplam DOM 7443, toplam JS dinleyicisi
1020 olarak sabitti. Son Android ölçümünde altı örneğin hepsinde DOM 7423,
dinleyici 1013 oldu. Bu toplamlar sayfanın tamamını içerir; aradaki farkın
tamamı emojiye atfedilmez. Emoji alt ağacının büyümediği ayrıca denetlenir.
Genel HUD efektlerinin geçici DOM artışı son GC örneğinde geri düşer.

JS heap değerleri de JSON raporlara kaydedildi. Bu kısa tarayıcı ölçümünden
fiziksel telefonun toplam RAM/GPU belleği veya tüm oyunun takılma nedeni için
sonuç çıkarılmadı. Önceki genel WebKit FPS yayın kapısı bu denetimle kapanmaz.

## Doğrulama ve kanıt

- İstemci 744/744, paketleme 10/10, sunucu emoji sözleşmeleri 2/2 geçti.
- Masaüstü/Android'de 4 tarayıcı testi geçti: 1050 aç/kapa ve 10.000 yenileme,
  400 art arda görsel olayda iki balon sınırı, doğal temizlenme, arka plan,
  beklemenin korunması, yeni maç ve bitiş temizliği; ayrıca gerçek sunucuda
  iki emoji gönderimi, 1,9 saniyelik balon, 3 saniye bekleme ve maçtan çekilme.
- Gerçek gönderim testinde görünür emoji düğmesi ve seçenekler tıklanır.
  Tema eski üst bilgi barını gizlediği için çekilme, mevcut gizli düğmenin
  kendi click işleyicisiyle tetiklenir; sunucunun finished durumuna geçtiği
  doğrulanır. Bu denetimde çekilme arayüzü değiştirilmedi.
- İzole bellek deneyi mevcut işleyicileri testte enjekte edilen bir kancayla
  çağırır. Bu kanca ürün kaynaklarına veya pakete eklenmez. İzole deneyde
  gönderim yalnız komut biçimini yakalar; gerçek ağ gönderimi ayrı testtedir.
- Test: `e2e/battle-emoji-memory.spec.js`.
- Önce/sonra JSON ve günlükler: `artifacts/battle-emoji-memory-20261027/`.
- Web build: `f340504218263075`. Paketleme denetimi üretim test API'sinin
  pakete girmediğini de doğrular. Yeni AAB/APK veya canlı dağıtım yok.
