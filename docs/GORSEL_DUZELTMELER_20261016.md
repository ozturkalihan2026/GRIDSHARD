# 16 Ekim — saha, mesaj kutusu ve ödül görünümü düzeltmeleri

Kaynak: kullanıcının 18:58, 19:00 ve 19:06 ekranları ve aynı mesajdaki istekler.
Kod uygulandı; gerçek tarayıcı/telefon görünümü kullanıcı tarafından denenecek.
Yeni raster sanat üretilmedi, mevcut onaylı görseller ortak eşlemelerden kullanıldı.

## Savaş

- VS aralığı 32 → 52 px; alan hesabındaki rezerv 160 → 180 px. 5×3 korunur.
- Oyuncu Çekirdeği CAN çizgisindeki güç-halkası maskesi kaldırıldı. Alt raftaki
  güç düğmesinin halkası korunur. CAN ve ısı hâlâ hücrenin iç kenarlarındadır.
- Alt raf görsel, kısa ad ve Akım maliyeti için ayrı grid satırları kullanır;
  raftaki cihaz resmi hücreye sığar. Sahadaki fiziksel cihaz sunumu değişmedi.
- Yalnız Lazer gerçek hedefini atışlar arasında tutar. Atışın bitmesi başlangıç
  yönüne dönüş yaratmaz; hedef/source kaybı, bitiş ve oturum temizliği ele alınır.
  Diğer hareketli modüllere henüz yayılmadı. Yeni 360° çizim/model eklenmedi.

## Mesaj kutusu

- Savaş sandığı satırı: zarf + “Savaş Zaferi Sandığı” + aynı satırda Topla.
- Zarf veya başlık, tarih/sandık/içerik bölümünü açıp kapatır. Klavye Enter ve
  Boşluk çalışır, `aria-expanded` korunur. “Okundu/Okunmadı” alt metni kaldırıldı.
- Satın alım satırı yalnız “Satın alım tamamlandı”; ürün adı ve açıklama içeride.
- Sistem bildirimleri başlıkla açılır, tekil ve toplu Sil kontrolleri gösterilmez.
- Hepsini Topla, aktif savaş/ödül sekmesindeki sandıkları seri ve sabit tekil
  request ID'leriyle toplar. Sonraki sayfa ödülleri de ele alınır; bir çalıştırma
  en çok 200 mesaj işler, kalanlar sonraki toplamada kalır. Yarıda hata, tekrar,
  hesap değişimi ve eski polling yanıtları testlidir. Toplamak sandığı açmaz.
- Akı/Devre Kredisiyle alınan sandık yeni satın alım mesajı üretmez. Geçmişteki
  ilgili mesajlar silinmeden görünümden süzülür. Gerçek para alım kaydı korunur.
  Satın alım mesajlarının mevcut geri alınabilir silme akışı korunur.

## Ödül ve görsel dil

- 23:13 görseli sonrası: Seç/Çıkar'ın ortak düğmesi altın CTA kuralından
  çıkarıldı. Eski onaylı yeşil ekle/kırmızı çıkar yüzü ve okunur yazısı korunur;
  bu yüzün arkasından taşan sarı/başka renkli ikinci zemin yoktur.
- 23:11 görseli sonrası: alınmış Devre Yolu ödülleri soluk/devre dışı
  görünmez; tam renkli resim, belirgin metin, koyu yeşil yüzey ve yeşil çerçeve
  kullanır. Gerçek disabled durumu korunur, tekrar alınamaz. Lider Panosu
  düğmesindeki kupa ve metin eski footer kurallarından bağımsız tek satırdır.
- Devre Yolu alınabilir düğümleri daha parlak ve doğrudan tıklanır; ayrı AL
  rozeti kaldırıldı. Lig sandığı da alınabilirse kendi görselinden alınır.
- Bütün ortak modül-parçası görünümleri yapboz yerine modül resimli küçük kart
  kullanır. Evrensel kartta genel deste çizimi vardır; miktar ve kimlik yazıda.
- Lider Panosu kupası, geri okları, günlük emir/sezon/mağaza başlık simgeleri,
  Modüller/Çekirdek sekmeleri ve takım turnuvası mevcut sanat ailesine bağlandı.
- Ortak diyaloglar, sandık/ödül önizlemesi, Bilgi/Seç hızlı menüsü, etkinlik
  başlığı/geri düğmesi ve günlük meta yüzeyi `visual-polish-v9.css` ile ortak
  koyu mürekkep/çerçeve dilindedir. Gizleme, odak ve açma-kapama sahipleri korundu.
- Takım başvuru listesindeki adların kesilmesine yol açan düğme gölgesi/kırpma
  kaldırıldı; satır yüksekliği ve alt boşluk açıldı, iç kozmetik kimlik korundu.
- Toplu sandık açılışındaki gereksiz “tüm açılabilir sandıklar açıldı” notu yok.
  Kısmi başarısızlık uyarısı kaybolmaz.

## Sezon sandığı teslimi

Kullanıcının netleştirmesi: **her sezon kademesinin dış sunum sandığı açılır**.
Akı/kredi/modül/kozmetik içeriği hemen verilir ve açılış penceresinde gösterilir.
Yalnız bu içeriğe ayrıca eklenmiş Bronz/Gümüş/Altın/Elmas sandık kapalı stoktur;
dış sunum sandığı hiçbir kademede mağaza stoğu değildir. Normal 2., Gümüş içeren
5. ve büyük sandık içeren 10. kademeler serbest/ücretli hatlarda ayrı test edilir.

Kullanıcının açık isteğiyle bu turda sunucu teslim davranışı da kapsama alındı.
Ödül miktarı, rastgele sandık tablosu, fiyat ve iade politikası değiştirilmedi.

- İstemci `stock-v1` kullanır. Kademe ödülü sunucu tarafından onaylanınca
  sandık açılışına benzer sonuç penceresiyle gerçek makbuz içeriği gösterilir.
- Kademe içindeki gerçek sandık **açılmadan mağaza stoğuna** eklenir; pencerede
  bu teslim gösterilir. İçeriği ancak mağazada açıldığı anda hesaba işlenir.
- Stok teslimi mevcut kalıcı mesaj/toplama tanıklarını aynı işlemde kullanır;
  aradaki mesaj oyuncunun kutusunda görünmez. Tekrar istek sandığı çoğaltmaz,
  açılmış bir sandığı yeniden oluşturmaz. Premium köken ve iade takibi korunur.
- Eski `inbox-v1` ve eski anında açma protokolü uyumluluk için korunur.
- Bu yüzden yerel denemede **Python sunucusu yeniden başlatılmalı**, istemci
  Ctrl+F5 ile yenilenmelidir. Bu görev sunucuyu kendiliğinden yeniden başlatmadı.

## Doğrulama

- 103 istemci testi geçti (Relay dosyasındaki 176 iç kontrol de başarılı): hedef kilidi, yerinde DOM, mesaj
  akordeonu, toplu/tekil toplama, hata/tekrar/hesap değişimi, eski sözleşmeler.
- Sunucu: 124 test geçti. Serbest/premium `stock-v1` uçları, makbuz tekrarı,
  kapalı stok, satın alım ayrımı, kalıcılık, sandık limiti ve premium iade.
- Asset/kaynak audit'i: 39 WebP / 999.974 bayt, 36 betik, 14 stil. Önceden
  bulunan 20 i18n yinelenen anahtar uyarısı dışında yeni JS/CSS uyarısı yok.
- Windows kısıtlı test ortamının atomik dosya taşıma/TestClient engeli nedeniyle
  uç testleri onaylı çalıştırmada yalnız görev altındaki yalıtılmış geçici veriyle
  tekrarlandı. Gerçek hesap, açık sunucu ve tarayıcı sekmeleri kullanılmadı.
- Gerçek tarayıcı/telefon yerleşimi ve FPS ölçülmedi. Build, native paket,
  dağıtım, commit/push yapılmadı; görsel kabul kullanıcıda.
