# Devre atmosferi ve profil/dock görsel paketi

14 Ekim 2026. Kullanıcının altı düzeltme, ortak dock yüzeyi + renkli amblemler
ve iki turnuva kartının kendi zeminlerini düzenleme onayıyla uygulandı.
Durum: yerel kaynak ve web paketi hazır; canlı yayın veya APK/AAB yapılmadı.

## Değişiklikler

1. Zikzak yerine %3 yoğunluklu ince teknik ızgara, mikro enerji noktaları,
   kenarlarda #061226 vinyet. Üst ambiyans yaklaşık %12: Ev turkuaz, Mağaza
   altın, Kartlar mavi, Takım mor, Etkinlik eflatun. Statik CSS katmanlarıdır;
   sürekli animasyon, tam ekran blur/filter veya yeni rAF döngüsü eklenmedi.
2. Etkinlikte fiziksel gövdeli SVG çark, kupa ve sancak. Başlık/tarih/etki ve
   giriş düğmeleri korunur. Haftalık kartın kendi zemininde sıcak altın ışık
   ve eleme şeması çizgileri; takım kartında mor ışık ve büyük sancak konturu.
   Arka plan çizgileri çok düşük yoğunlukludur, metnin yerine geçmez.
3. Devre Yolu: ince altın iç çizgi, koyu dış kontur ve kısa alt dudak.
   Yerleşim boyutları büyütülmedi.
4. Kendi/ziyaret edilen oyuncu ve takım profilinde ortak levha/yuva yüzey
   token'ları; dinamik başlıklarda ortak çizilmiş simgeler ve aralık. Seçili
   avatar/çerçeve/arka plan kimliği, sosyal eylemler ve hesap verileri korunur.
5. Takımın toplam/ortalama kupa alanları ve ziyaret edilen takımın aynı
   istatistikleri `renderTrophyValue` ile oyunun ortak kupa görselini kullanır.
   Sayı ile ikonun puntoları/hizası da eşleştirildi.
6. Devre Koleksiyonu artık yalnız sunucunun kazanılmış kimliklerini çizer.
   Hiç kazanım yoksa metin gösterilir, sönük kupa/rozet veya sahte kazanım
   çizilmez. Bilinmeyen yeni kazanım kimlikleri kaybolmaz; hak/veri silinmez.
7. Dock: bütün buton yüzeyleri aynı lacivert malzeme, SVG amblemler beş ayrı
   sekme renginde. Seçili sekmenin yükselmesi/genişlemesi, görünür adı, nötr
   açık konturu ve `aria-current` davranışı korunur. Bildirimler korunur.
8. Scrollbar gizleme global kuralı zaten vardı; tekrar eklenmedi. Gerçek DOM
   testi hem gizliliği hem kaydırma alanının scrollTop ilerlemesini doğrular.

## Doğrulama

- Tam istemci: **438 geçti, 2 JDK bağımlı native test atlandı, 0 başarısız**.
- Web derleme sözleşmeleri: **9/9 geçti**.
- Masaüstü menü + yeni görsel kontrol, Android ekran öykünmesinde savaş/dock
  ve yeni görsel kontrol: **6/6 geçti**.
- Son görsel kontrol iki projede tekrar **2/2 geçti**; 320 px dar ekran,
  beş dock yüzeyinin aynı computed background'ı, beş renkli SVG, iki farklı
  turnuva zemini, kendi/ziyaret edilen profil yüzey eşitliği, gerçek kaydırma,
  kazanım sonrası koleksiyon ve TR→EN→TR boş mesaj kontrolü dahil.
- PNG'ler gerçek yalıtılmış Chrome fixture'larından incelendi; görünen hesap,
  bakiye ve takım yerel test verisidir. Canlı oyuncu üzerinde işlem yapılmadı.
- `node --check client/src/app.js` ve `git diff --check` geçti.
- Yerel web build: `1d0e2986d2edd4f9`. `dist/` bu turun web çıktısıdır.

Yeni test `e2e/visual-atmosphere.spec.js`; desktop ve Android Chromium
projeleri ile CI browser adımına eklendi. Mevcut açık sekme/profil kullanılmadı;
test sunucusu teardown ile kapandı. Gerçek telefon/native PGS/Billing ve
teknik denetimde açık kalan yayın kapıları bu görsel testlerle kapanmaz.

## Önizlemeler

- [Etkinlik ve turnuva zeminleri](../qa_reports/visual-atmosphere-20261014/events-mobile.png)
- [Ev ve ortak dock](../qa_reports/visual-atmosphere-20261014/home-mobile.png)
- [Mağaza](../qa_reports/visual-atmosphere-20261014/shop-mobile.png)
- [Kartlar](../qa_reports/visual-atmosphere-20261014/cards-mobile.png)
- [Ziyaret edilen profil / boş koleksiyon](../qa_reports/visual-atmosphere-20261014/visited-profile-mobile.png)
- [Takım profili / kupa değerleri](../qa_reports/visual-atmosphere-20261014/team-profile-mobile.png)

Bu paket önceki teknik optimizasyondan sonra geldi. Önceki teknik denetim
JSON parmak izleri/ölçümleri o önceki kaynak anının kaydıdır; bu görsel
değişikliklerle tam savaş FPS'inin yeniden ölçüldüğü anlamına gelmez.

## Takip düzeltmesi — Günlük Meta ayrı bilgi alanı

Kullanıcı Çekirdek Metası'nın bir etkinlik gibi görünmemesini istedi.
Günlük Meta aynı sayfada, turnuva gezinme alanının dışında kompakt ve koyu
bir bilgi yuvasına ayrıldı. Küçük çark, Günlük Meta etiketi, seçilen meta,
açıklama ve etki korunur. İki büyük turnuva kartı ayrı Turnuvalar başlığı
altındadır. Meta seçimi ve sunucu savaş katsayıları değiştirilmedi.

- İstemci 438 geçti / 2 JDK atlaması; build sözleşmeleri 9/9.
- Masaüstü ve Android yalıtılmış görsel testleri 2/2 geçti. Çekirdek Metası
  gerçek katalog metinleriyle test fixture'ında gösterildi; 38 px çark,
  turnuvadan küçük bilgi alanı, ayrı erişilebilir gezinme başlığı ve
  TR→EN→TR çevirisi doğrulandı. 320 px ekran kontrolü de korunur.
- Yeni yerel web build: `fbbef26a06919e82`. Native/canlı yayın yapılmadı.
- [Ayrılmış meta önizlemesi](../qa_reports/visual-atmosphere-20261014/events-meta-separated-mobile.png).

## Rush Royale incelemesi — kanıt sınırı ve öneri

Resmî kaynak: https://rr.my.games/en/about
Resmî PvP görseli: https://rr.my.games/static/images/about-modes2-pvp.png
Resmî kart görseli: https://rr.my.games/static/images/about-card-1.png

Bağlantılar web aramasıyla bulundu. İş bilgisayarındaki tarayıcıda MEB oyun
sitesi erişim engeli görüldü; kısıt aşılmadı, geçici araştırma sekmesi kapatıldı.
Görsellerin piksel düzeyinde incelenmesi gerçekleşmedi. Rush Royale'a ait
kesin renk/kontrast ölçümü veya güncel menü karşılaştırması yapılmış sayılmaz.

GRIDSHARD'ın kullanıcı görüntüleri, güncel yerel PNG'leri ve CSS'i üzerinden
öneri: genel ekranı doygunlaştırmak yerine yalnız etkileşim/ödül amblemlerine
doygun ana renk; iri amblemlere keskin ışık-gölge düzlemleri ve koyu kontur;
küçük simgelere yalın dolu siluet. Bütün ikon ailelerinin kontur, ışık yönü
ve oranları ortak olmalı. İnce neon/glow ile hacim taklidi yerine çizilmiş
hacim tercih edilmeli. Dock'un ortak lacivert yüzeyi korunmalı. Savaşta
okunabilirlik için küçük ikonların sadeleştirilmesi geri alınmamalı.
Bu ikinci talep inceleme/öneri kapsamındadır; ek palet veya amblem revizyonu
henüz uygulanmadı. Doğrudan rakip tasarım kopyalama önerilmez.

## Dock amblemi pilotu — onay bekliyor

Kullanıcının paylaştığı üç Rush Royale ekranından sonra yalnız dock için
deneme uygulaması istendi. Başka görsel alana geçmek için onay beklenir.
Beş inline SVG, 64×64 çizim alanı içinde ortak koyu kontur/ışık-gölge
yüzeyleriyle yeniden çizildi. Mağaza altın sandık, Kartlar mavi kart destesi,
Ev turkuaz çekirdek, Takım mor sancak, Etkinlik pembe nişan kullanır.
Küçük amblemler 36 px, aktif amblem 40 px; yerleşim ve ortak buton yüzeyi
korundu. ARIA/etiket, bildirimler, indirim rozeti ve yönlendirme korunur.
Ek görsel indirme, SVG filtre veya yeni sürekli animasyon yoktur.

- İstemci: 439 geçti, 2 JDK bağımlı test atlandı. Eski dock çatlak çizgisine
  bağlı sözleşme yeni çekirdek amblem kimliğini doğrulayacak şekilde güncellendi.
- Build sözleşmeleri 9/9; menü/görsel desktop+Android E2E 4/4; son Android
  görüntü alma kontrolü 1/1. Koyu ortak kontur ve beş ayrı dolu ana renk
  gerçek computed style üzerinden doğrulandı.
- Web build `b3ce9e7850c70db1`. Native veya canlı dağıtım yapılmadı.
- [Dock yakın plan](../qa_reports/visual-atmosphere-20261014/dock-pilot-mobile.png)
- [Ev ekranında dock](../qa_reports/visual-atmosphere-20261014/home-dock-pilot-mobile.png)

Önceki önizlemeler saklandı. Diğer kart/amblem/sandık tasarımları bu pilotta
değişmedi. Görüntüler yalıtılmış test hesabına aittir, canlı hesap kullanılmadı.
