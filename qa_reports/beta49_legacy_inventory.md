# Beta.49 — GRIDSHARD 2.1 legacy envanteri

Tarih: 12 Eylül 2026

Bu kayıt, 2.1 çalışma yolundaki aktif referans taramasının sonucudur. Temizlik
oyuncu kayıtlarına veya hâlâ eski kayıtları 2.1 biçimine dönüştüren geçiş
kodlarına uygulanmaz.

## Silinen kanıtlanmış eski parçalar

- Savaş alanındaki uçan savaş metnini sonradan zorla gizleyen eski CSS katmanı
  kaldırıldı. Yeni kırmızı hasar ve yeşil onarım geri bildirimi artık doğrudan
  etkin.
- Yalnız Alpha.9 ve Beta.13–20 arayüz/rapor sözleşmelerini doğrulayan, güncel
  test veya üretim kodu tarafından içe aktarılmayan 20 tarihsel test dosyası
  kaldırıldı.
- Önceki kontrollü temizlikte kaldırılmış port/yön ve Jeneratör kapısı testleri
  silinmiş durumda tutuldu:
  `test_energy_topology.py`, `test_beta34_port_control.py` ve
  `test_generator_gate_movement.py`.
- Güncel savaş testlerinde kalan dört satırlı tahta, özel hücre bonusu,
  fiziksel enerji kopması ve zorunlu Jeneratör beklentileri 5x3 gömülü enerji
  yolu davranışına taşındı.

## Korunan 2.1 çalışma parçaları

- `server/app/game/battle_pool.py` içindeki 18 karttan 6 karta geçiş ve
  `server/app/player_profile.py` / `server/app/meta_progression.py` içindeki
  cüzdan, makbuz ve parça dönüşümleri canlı oyuncu verisini kayıpsız açmak için
  gereklidir.
- Sunucu kataloğundaki tarihsel `generator` kimliği yalnız eski kayıt ve eski
  maç özeti okuma sınırında korunur; güncel savaş destesinin zorunlu bir parçası
  değildir ve 2.1 enerji üretimi Çekirdek tarafından sağlanır.
- `server/data` altındaki oyuncu, takım, telemetri, yedek ve geçici kayıtlar
  temizlik hedefi değildir.
- 2.0 geliştirme kararlarını açıklayan belgeler tarihsel dokümantasyondur;
  çalışma zamanı paketi olarak yüklenmezler ve bu veri güvenli temizlikte
  silinmezler.

## Güncel kanıt

- Enerji testi, Çekirdek seviyesi yükseldikçe üretimin arttığını; Batarya
  eklendiğinde sürekli beslemenin yükseldiğini ve ağır saldırı yığınının yine
  tümüyle aynı anda ateşleyemediğini doğrular.
- Gömülü topoloji testi, boş hücreler bulunsa bile aktif hücrelerin port/yön
  gerektirmeden beslenmesini doğrular.
- Sonuç testi, Çekirdeğin modül katkı satırlarından çıkarılıp ayrı kimlik kartı
  olarak sunulduğunu doğrular.
- Bildirim testi, Günlük Ödüller ve Günlük Devre Emirleri okunmamış durumlarının
  birbirinden bağımsız kapatıldığını doğrular.
