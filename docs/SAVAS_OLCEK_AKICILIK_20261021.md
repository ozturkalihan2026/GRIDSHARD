# 21 Ekim 23:10 geri bildirimi — çekirdek ölçeği ve savaş akıcılığı

Önceki hücreye sığdırma düzeltmesi çekirdeği gereğinden fazla küçülttü.
Bu takip çalışması o ölçüyü değiştirir; önceki raporun çekirdek-boyut
açıklamasının yerine bu belge geçer. Sunucu savaş kuralları değişmedi.

## Ölçü

- Normal cihaz sahnesi 1.70→1.40: yaklaşık %18 daha küçük. Eski görsel,
  kaide ve hedefe dönme davranışı korunur.
- Çekirdek artık en fazla 1.50 sahne ölçeğinde, opak çizim genişliği 1.34 ve
  yüksekliği 1.50 ile sınırlı, tabanı 1.08'e kayıtlıdır. Eski 0.78 yükseklik
  sınırı yoktur. Amaç zemindeki küçük bir jeton değil, merkezi ana cihazdır.
- Soket/HP çubuğu ve dokunma hedefi büyütülmez. Eski kesen kart zemini geri
  gelmedi. Perspektif, mevcut tahta arka planı ve kamera konumu korunur.
- Yedi çekirdek türünde iki tarafın görünümü ölçülür. Resmin eksene paralel
  BCR'sinin yüzdesi yerine gerçek billboard düzlemine opak piksel köşeleri
  yansıtılır; WebKit perspektifinde önceki yaklaşık ölçüm yanlış sonuç veriyordu.

## Takılmaya katkı veren sıcak yollar

1. İsabet başına `offsetWidth` zorunlu layout okuması kaldırıldı. Üst üste
   isabetler aynı vurgu sınıfını korur, yalnız son kullanma süresini uzatır.
2. Nişan çiziminde sabit projeksiyon rig kimliği + layout dönemiyle WeakMap'te
   tutulur. Boyut/kamera değişince geçersizleşir; eksik geometri önbelleğe
   alınmaz. Yeni rig, eski rig'in projeksiyonunu devralmaz.
3. Canvas boyutları efekt/kare başına değil layout değişiminde okunur.
   DPR değişimi, yeni katman, resize, gizlenme/reset güvenli yolları korunur.
4. Duman/parlama radyal gradientleri her parçacık/karede yeniden üretilmez:
   24 adet 64×64 küçük tile sınırı vardır (~384 KiB ham RGBA). Reset temizler.
5. Yön değiştiren başlığın 70ms sıkışma/esneme timer'ı kaldırıldı. Onaylı
   resimler hedefe dönmeye ve gerçek ateş/iş olayına tepki vermeye devam eder.
   Sürekli bütün cihazı zıplatan idle animasyon yoktur; çekirdek ışık nabzı sürer.
6. Değişmeyen phase/frame/disabled veri öznitelikleri tekrar yazılmaz.
   Katmanlı resimde kullanılmayan atlas CSS değişkenleri de güncellenmez.
7. Çekirdek idle-emitter ölçümleri karede hareket yazmalarından önce yapılır.
8. Otomatik grafik, dört saniyelik çok yavaş bir pencereyi (<10 kare)
   yetersiz veri sayıp sonsuza kadar Yüksek'te tutuyordu. Tam pencere artık
   değerlendirilir; iki kötü pencere koşulu ve elle seçilen kalite korunur.

Yeni bağımsız rAF zinciri veya cihaz başına timer yoktur. Ses, hasar, atış
sıklığı, hedef kararı, ödüller ve ağ komutları değiştirilmedi.

## İlk kontrollü yerel karşılaştırma

Aynı 18 saniyelik UI-deploy senaryosu, ayrı test hesabı/AI maçı, masaüstü
headless Chromium, Yüksek/perspektif açık. Önce/sonra sekizer cihaz görüldü.
Maç ve AI yerleşimleri rastgele olduğundan bu tek çift koşu istatistiksel
benchmark veya gerçek bilgisayar/telefon FPS garantisi değildir.

| Ölçüm | Önce | Sonra |
|---|---:|---:|
| Cihaz isabetinde zorunlu genişlik okuma | 21 | 0 |
| DOM dikdörtgen okuma | 6508 | 1399 |
| Hareket tick toplamı / çağrı | 939.5ms / 2829 | 224.3ms / 3076 |
| Canvas tick toplamı / çağrı | 2304.5ms / 2829 | 447.3ms / 3076 |
| Kare süresi p95 | 13.5ms | 7.5ms |
| En uzun kare (başlangıç dahil) | 305.3ms | 319.4ms |
| 50ms üstü kare oranı | %0.07 | %0.03 |
| 1 saniye üstü donma | 0 | 0 |

En uzun tek kare azalmadı; tüm takılmalar giderildi iddiası yoktur. Windows
WebKit öykünmesinde boş kontrol sayfası ~62 FPS iken savaş ilk ölçümde ~2.4 FPS
verdi. Otomatik kalite pencere hatası bu kontrolde bulundu. WebKit işlevsel
testi veya donma sayısının sıfır olması, gerçek iPhone performans onayı sayılmaz.
Gerçek cihazdaki uzun savaş denemesi yayın öncesi hâlâ gereklidir.

## Doğrulama ve teslim

- Tam istemci: 650 geçti. Yeni regresyonlar; zorunlu layout yasağı, aynı
  hit sınıfının birleştirilmesi, glow cache sınırı/temizliği, canvas epoch,
  cihaz timer'ı olmaması, sabit öznitelik yazımları, yedi çekirdek kaydı,
  projeksiyon geçersizleştirme ve ağır otomatik kalite penceresidir.
- Paketleme: 10 geçti. Sunucu kodu bu takipte değişmedi; önceki tam sonuç
  1659 geçti / 44 koşullu atlandı olarak korunur, bu tur yeniden koşulmadı.
- Bu ilk takibin sonraki tam matrisi 8 geçti / 1 kaldı (Windows WebKit FPS).
  2.1.1, mesaj yönlendirme, final efekti, yeni test sayıları ve açık işler
  `docs/SURUM_2_1_1_YAYIN_NOTLARI.md` dosyasında kayıtlıdır.
- İzole web build: `02116cdd22c588c4`, 619 varlık;
  `artifacts/ci-fix-20261020/web-gUzgU0/dist/`.

Kullanıcı tarayıcısı/geliştirici sunucusu yönetilmedi. Testler ayrı localhost
8891, geçici hesap/veri ve headless tarayıcılar kullanır. Commit/push, canlı
geçiş veya AAB yapılmadı. Kullanıcı Ctrl+F5 ile yerel savaşı tekrar deneyecek.
