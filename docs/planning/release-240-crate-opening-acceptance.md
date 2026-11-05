# UI-08 / REWARD-06 — gerçek makbuzla kasa açılışı kabulü

5 Kasım 2026. [S1 bütçe/yayın matrisi](release-240-s1-acceptance.md) ·
[teslim sözleşmesi](release-240-fixed-crate-contract.md).

Topla → aynı kasa kimliğiyle teslim/açılış → sunucu makbuzundan kaynak ve
kozmetik sonucu akışı gerçek localhost API’siyle doğrulandı. Mağazaya gitmek
gerekmez. Haftalık Lazer 36 parça, sezon liderliği Güneş Ocağı ve ayrı bir
çekirdek teslimi kabul kasası kullanıldı; sonuncusu S1’e yeni ödül eklemez.

- 22 haftalık/ilk 10 kasasının sabit içeriği ve 80 yol kademesi sunucu testinde
  bütçeyle eşleşir; ek rastgele sandık yoktur. Mevcut 25 giriş çekirdek parçası korunur.
- Geçersiz içerik hiçbir bakiyeyi değiştirmez. PG hatası, cache kaybı, tekrar,
  eski toplama → stoktan açma ve premium kökeni mevcut entegrasyonlarda korunur.
- Normal hareket ve azaltılmış hareket, TR/EN 320/393 px ile yerelde çalıştı.
  Ses tercihi mevcut ödül cue’sunun mute/volume/lifecycle hattını kullanır;
  fiziksel dinleme yapılmış sayılmaz.
- Makbuz gelene kadar Devam kapalıdır. Onaylı makbuz geldiğinde etkinleşir;
  oyuncu kozmetik animasyonun bitmesini beklemeden Devam ile geçebilir.
- Yeniden yüklemede alınan kasalar tekrar Topla listesine dönmez. Topla Tümü,
  hata ve kısmi başarı sözleşmesi mevcut istemci regresyonlarıyla korunur.
- Dar ekranda ödül önizlemesi alt dock’u kapatıyordu. Önizlemenin kullanılabilir
  alt sınırı dock’un üstünde tutuldu; panelin içerik kaydırması korunur.

`e2e/s1-acceptance.spec.js` sunucu makbuzlarını test ekine yazar. Görsel ekran
görüntüsü tek başına ekonomik teslim kanıtı sayılmaz; cüzdan/tekrar/restore
kanıtı `server/tests/test_s1_release_acceptance.py` ve PG testleridir.

REWARD-06 yazılım kabulü tamamlandı. UI-08 yerelde/dalda hazırdır;
fiziksel Android güncellemesi ve cihaz sesi kullanıcı isteğiyle ertelendi,
RELEASE-01 içinde açık kalır. Canlı ödül veya AAB yayınlanmadı.
