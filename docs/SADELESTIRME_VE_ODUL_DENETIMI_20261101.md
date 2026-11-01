# GRIDSHARD 2.2.0 — savaş ve ödül temizliği

Onaylanan ana oyun: 24 modül, Saldırı/Savunma/Taktik. Rastgele yerleşim ve mevcut hedef önceliği korunur. Bu çalışma yeni bir denge modeli getirmez; kaldırılmış kararları gerçek çalışma yollarından çıkarır.

## Savaş motoru

- Enerji dağıtımı, Isı, eski modül çevrimleri, eski destek/sabotaj çözümleyicileri ve eski çekirdek imza işlemcileri kaldırıldı.
- Modüller CAN, EMP kesintisi ve `operational` alanıyla çalışır. Sunucu ve istemci anlık görüntüsü aynı alanı kullanır. Kablo çizimi etkin modüllerin görsel sunumudur.
- Tek Akım modeli: 7 başlangıç, 12 depo, 3 saniyede +1. Saldırı kartlarının verdiği 100 yeni gerçek CAN hasarı **ve** Savunma kartlarının kaybettiği 50 yeni gerçek CAN birlikte +1 getirir. Sayaç fazlaları korunur; depo doluyken ikisi temizlenir.
- Emilim, fazla vuruş, yansıma, dost hasarı veya iyileştirilmiş CAN'ın yeniden kaybı gelir üretmez. Çekirdek hasarı Saldırı sayacına yazılmaz. Ücretli İmha Kazancı yeteneğinin açık +1 istisnası korunur.
- Yapay zekânın dengeli başlangıç tercihi oyuncuya kota getirmez. Aynı kart/sınıf sınırları yoktur. Süreye bağlı hasar artışı/onarım cezası yoktur.
- Eski hedef kategori adları yalnız aynı hedef sırasını koruyan iç metadata olarak tutulur. Oyuncunun gördüğü sınıflar üçtür.

## Tüm ödül kaynakları

Yeni ödül seçimi aktif katalog ve oyuncunun ulaşmış olduğu arena üzerinden yapılır. Devre Yolu'nda Arena 2–12 hedef parçaları o arenada açılan yeni kartlara dağıtıldı. Durak kimlikleri, kupa eşikleri, miktarlar ve alınmış ödül kayıtları korunur.

Denetlenen yollar: bütün Devre Yolu ve lig durakları; giriş takvimi; ücretsiz/premium sezon sütunları; bütün rastgele sandık türleri; stok, hediye, etkinlik ve sezon teslimleri; mağazadaki her sandık; gerçek zafer → mesaj kutusu → toplama → açma; haftalık sıralama, sezon ilk 10 ve takım turnuvası sabit ödülleri. Günlük Devre Emirleri mevcut durumda deneyim ve Akı verir; gizli modül parçası havuzu yoktur.

Yeni modül parçaları ortak korumalı verme fonksiyonundan geçer. Eski bir sabit sandığın önceden kazanılmış hakkı açılışta 1:1 evrensel parçaya dönüşür ve yeni açılış makbuzu eski kartı göstermez. Alınmış makbuzlar tarihsel tanık olarak saklanır. Mevcut parçaların 1:1 aktarımı, eski seviyelerin arşivi ve premium iade borçları korunur. Tekrar talep parçayı ikinci kez vermez.

## Gerçek hata düzeltmeleri

- Arena kamu kataloğundaki önceki CAN/hasar ayarları aktif modül tablosuyla eşitlendi; tarayıcı önizlemesi gerçek değerleri gösterir.
- Yeni hesabın ilk kaydında roster işaretleri tamamlanır; ikinci girişte gereksiz migrasyon farkı oluşmaz.
- Eski sabit ödülün açılış sonucu dönüştürülen evrensel parçayı gösterir.
- Testlerde Windows alt süreçlerinin UTF-8 tanı metni doğru okunur.

## Doğrulama ve sınırlar

- Temizlik öncesi/sonrası 7 çekirdek, 5 deste ve 2 seviyede **70 gerçek deterministik savaş** aynı olay akışını verdi. Yalnız kaldırılan sıfır Enerji/Isı alanları ve adı değişen çalışma bayrağı karşılaştırmadan ayrılır; eski kaynak yalnız izole bellekte yüklenir.
- Tam sunucu koşusu: **1918 başarılı, 44 atlanan**. Atlanan gerçek PostgreSQL/Redis/üretim kontrolleri CI servis işiyle doğrulanmalıdır.
- Tam istemci: **762 başarılı**. Araç sözleşmeleri: **30 başarılı**. İçe aktarma taraması: **453 dosya, 0 sorun**. Web build sözleşmeleri: **10 başarılı**.
- Eğitim/katalog/onarılmış tarayıcı senaryoları: masaüstü ve Android görünümünde **24 başarılı**. Diğer savaş/açılış senaryolarının ilk koşusunda **33 başarılı**; kalan eski katalog/eğitim beklentileri düzeltilip bu koşuda doğrulandı.
- İki gerçek istemci / yeniden bağlantı / rematch: **3 başarılı**. Sürüm ve son katalog/ödül kontrolleri: **125 başarılı**. Chrome performans: masaüstü **127,2 FPS**, Android görünümü **126,1 FPS**, her ikisinde sıfır donma ve sıfır modül yerleşim okuması. Windows WebKit **9,8 FPS ile başarısız**; Safari için macOS CI zorunludur, eşik değiştirilmedi. Uzak CI yeşil olmadan üretim geçişi yapılmaz.
- 6 maçlık güncel araç duman testi geçti. Bu küçük örnek insan kazanma oranını veya yeniden denge ayarı gerekliliğini kanıtlamaz; önceki geniş denge raporları ayrı korunur.

Kaldırılan eski testlerin ve araçların içerikleri/hash'leri `docs/archive/current-only-contracts-20261101/` altında gerekçe ve pozitif karşılıklarla arşivlidir. Skip/xfail eklenmedi; mevcut FPS/donma eşikleri düşürülmedi. İlk silahın savunma/onarım kurulurken hayatta kalması ve ilk 12 saniyeye dayanması test edilmeye devam eder.

## Yayın sırası

2.2.0 / Android kod 11 hazırlanır. Son kaynak commit/push → uzak CI → mevcut AWS'de yedek ve geri yükleme kanıtı → veri korunarak güncelleme → aynı kaynakla imzalı APK/AAB. Eski hesap sıfırlama aracı bu geçiş için kullanılmaz. Bu rapor tek başına üretime dağıtım veya mağazaya yayın kanıtı değildir.
