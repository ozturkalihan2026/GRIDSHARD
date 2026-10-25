# Daha büyük devreler ve hücreye oturan modüller — 24 Ekim 2026

Kullanıcı download.jpg üzerindeki notlarda iki devrenin dört yönde büyütülmesini,
modüllerin daha okunaklı olmasını ve üstteki gereksiz şeridin daralmasını istedi.
Devam mesajında kırmızı tarafı biraz yukarı, üst köşeleri bloklarla dolu ve
modülleri hücrelerine tam oturan ölçüde istedi.

- Tahta genişlik payı 112px → 80px. Dikey yerleşim toplamı 3.55 → 3.05 tahta
  yüksekliği. Kare hücre boyutu gerçek arena genişliği/yüksekliğiyle hesaplanır.
- Tahtalar arası pay .85H → .7H; oyuncu kimliği önündeki pay .7H → .35H.
- Üst kimlik yerleşimi 32px başlangıç payıyla düzenlendi; rakip devresi son
  istek doğrultusunda 12px yukarı taşındı, VS ortası 6px yukarı geldi.
- İki tahta aynı kamera eksenini korur: aralarındaki ek 12px kamera hesabında.
- Üst arka plan genişliği %168.32 → %200; köşelerdeki düz renk alanları kapatır.
- Modüllerin fazladan 3px kare iç boşluğu kaldırıldı; kayıt tuvali hücre boyunda,
  2px aşağı oturur. Isı/CAN çubukları aynı sahipte kalır. Çekirdek tam kare
  tuval kullanır; oturma mesafesi hücre büyüklüğü ve yakın/uzak tarafa göre
  sınırlıdır. Namluların gerçek hedef projeksiyonu aynı köşe işaretlerini kullanır.
- Büyüyen 3D düzlemin sağ-alt hücre tıklamasını örttüğü Chromium vakası giderildi:
  tahta düzlemi dokunmayı yakalamaz, gerçek hücreler yakalar. Hücre olayları korunur.

Yeni görsel, çizim döngüsü veya zamanlayıcı eklenmedi. 5×3 düzen, hücrelerin
kalıcı DOM kimliği, güç yolları ve savaş kuralları korunur. Bazı dış dekoratif
sütun uçları arena kenarında kırpılır; oynanabilir hücreler içeride kalır.

Doğrulama kanıtları: artifacts/battle-arena-fit-20261024/.
İstemci 722/722 ve Chromium/Android/WebKit zemin/çekirdek matrisi 6/6 geçti.
Paket 9fff76c1a15aca05; son tarayıcı/paket raporu aynı klasördedir.
