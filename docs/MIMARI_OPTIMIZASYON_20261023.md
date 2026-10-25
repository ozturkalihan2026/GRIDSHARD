# Mimari optimizasyon — 23 Ekim 2026

Başlangıç: `e795bc8` (temiz çalışma ağacı). Bu tur veri yükleme sahipliği,
gövde zaman aşımı ve gizli profil çizimleri düzeltildi. Mevcut görsel dil,
oyun kuralları, Billing/iadeler ve ödül hesaplama değiştirilmedi.

## 1. Bellek ve takılma: bitmeyen yanıt gövdesi

Neden: `fetchWithDeadline` zamanlayıcısı `fetch()` yanıt başlıklarını getirince
temizleniyordu. Sonraki `response.text()/json()` okuması aynı sürenin dışında
kalıyordu. Başlık gönderip gövdeyi tamamlamayan bir bağlantı bekleyen Promise'i,
işlem kilidini ve callback referanslarını tutabiliyordu. Bu bir heap dump ile
kanıtlanmış kalıcı GC sızıntısı değil, sınırsız bekleme/retention kusurudur.

Çözüm: yardımcıya isteğe bağlı bir yanıt tüketicisi eklendi. Controller ve
timer gövde tüketilene kadar yaşar, timeout'ta abort edilir, `finally` ile
temizlenir. Tüketici AbortError'ı yutsa bile süresi dolmuş istek başarılı sayılmaz.
Ortak JSON yolu, koleksiyon, maç sonucu, sıralama ve yerel savaş JSON yolları
bu sınırın içine alındı. Yalnız başlığa ihtiyaç duyan DELETE davranışı korunur.

Mutasyon tekrarları değiştirilmedi: idempotency anahtarlı tekrar aynı gövdeyi
ve request_id'yi kullanır; anahtarsız POST tekrar edilmez. Yeni
`request-body-deadline.test.js` 6 deterministik zamanlayıcı senaryosunu doğrular.

## 2. UI redraw: ortak profil yenilemesinin gizli ayrıntıları kurması

Neden: `renderProfileSummary`, sayfa geçişlerinde ortak kaynak/profil barı için
çağrılırken gizli profil destesini, çekirdek sunumunu ve kupa/rozet listesini de
yeniden kuruyordu. Görünmeyen DOM da JS tahsisi, dinleyici kurma ve stil işi üretir.

Çözüm: `renderProfileHighlights` ve `renderProfileHonorShowcase` yalnız görünür
Profil ekranında çalışır. Menü, mağaza, kartlar, istatistik ve savaşta ayrıntı
verisi okunmaz, yeni kart kurulmaz. 500 tekrar + gizli sekme testi eklendi;
Profil'e dönüşte gerçek çizimin hâlâ yapıldığı da test edilir. Ortak bar,
bildirimler, ödül sahipliği ve önceki avatar/kozmetik önbellekleri korunur.

Önerilen kural: ortak durum güncellemesi bütün sayfaları render etmek değildir.
Paylaşılan sayaçları güncelle, yalnız aktif kirli paneli çiz; değişmeyen görselin
DOM kimliğini koru. Önceki görünür-panel/dirty-set düzeni bu kuralı uygular.

## 3. Hayalet arayüz: geç yanıt ve native top layer

Neden: bir paneli CSS ile saklamak tamamlanmamış callback'i durdurmaz; native
`dialog` top layer'da da kalabilir. Eski sıralama yanıtı kapalı pencerenin listesini
kurabiliyor; startup sonrasına ertelenen meta penceresi eski hesaba ait olabiliyordu.

Çözüm: sıralama verisi gerektiğinde önbelleğe gelebilir fakat DOM yalnız açık ve
görünür pencerede kurulur. Meta penceresinin ertelenmiş açılışı da hâlâ aynı veri
isteği ve hesaba ait olmak zorundadır. Mevcut HEAD'deki outgoing panel `inert`,
`dialog.close()` ve ortak `syncScreenLifecycle` korumaları incelendi/korundu;
bu tur yeniden yazılmış gibi sunulmamalı.

## 4. Arka plan çakışması: istek ömrü ile veri sahibinin karışması

Neden: takım, sosyal liste, etkinlik, meta çarkı ve sıralama yükleyicileri yanıtı
doğrudan ortak değişkene atıyordu. İki istek ters sırada dönerse eski veri yeniyi
ezebilir; arada bir mutasyon veya hesap değişimi olmuşsa sorun daha önemlidir.

Çözüm: `createViewReadOwner` beş yükleyicide aynı küçük sahiplik sözleşmesini
uygular. Bilet; başlatan hesap, istek nesli ve başlangıçtaki durum referansını
taşır. Yalnız son istek, aynı hesap ve değişmemiş veri kaynağı commit edebilir.
Commit sonrası bilet yeni referansa geçirilir; sonraki ertelenmiş iş de sınanır.
Eski başarı/hata, başka hesabın yanıtı veya yeni mutasyonu ezen eski GET yok sayılır.
Geç yanıt yeni ekranın durum yazısını hata yapamaz. 17 davranış testi eklendi.

Her sayfa çıkışında bütün ağ/işlemler iptal edilmedi: inbox bildirimi, devam eden
idempotent ödül/satın alma ve güvenli önbellek yenilemesi meşru sahiplerdir.
Veri sahipliği, görünür render ve ağ timeout sahipliği ayrı tutulur. Yeni gate
istek geçmişi biriktiren bir Map değildir; yalnız sayaç ve getter tutar. Bu
refaktör her servis/mutasyonun baştan tasarlandığı iddiasını taşımaz.

## 5. Ölü kod ve eski mantık

Başlangıç HEAD'inde önceki WebGL/no-op çalışma yolu, 11 çağrısız yardımcı,
kullanılmayan snapshot sınıfı, boş ses havuzu ve görünmeyen kök ızgara zaten
temizlenmişti. Bunlar yeniden silinmedi. Ayrıntılar:
[önceki temizlik kaydı](ESKI_GORSEL_KOD_TEMIZLIGI_20261022.md).

Bu tur kaynak HTML'deki 45 betik başvurusu üzerinde muhafazakâr adlandırılmış
fonksiyon referans taraması yapıldı; yalnız tanımı bulunan yeni aday çıkmadı.
Bu metinsel tarama kesin AST/call-graph erişilebilirlik ispatı değildir. Dinamik
çağrılar, dışa açılmış API'ler ve aktif fallback'ler isimleri eski diye silinmedi.
Üretim derlemesi 44 betik/619 varlık içeriyor; yeni tanı/test kodu ürün paketi değildir.

## Doğrulama

- Son istemci paketi: 693/693 geçti. 24 yeni test (17 veri sahipliği, 6 gövde
  deadline'ı, 1 gizli profil) eklendi; eski endpoint metin sözleşmesi
  yakalanmış hesap kimliğine göre güncellendi, davranış kapsamı daraltılmadı.
- Paketleme 10/10; izole web build `01a79433f4fc40ca` / 44 betik / 619 varlık.
- 150 menü geçişinde GC sonrası DOM 20241/20241/20241, dinleyici 1081/1081/1081,
  document 7/7/7. Heap 9471932 -> 9723624 -> 9829720 bayt (+0.34 MiB).
  Bu yaklaşık iki dakikalık koşu uzun savaş/fiziksel cihaz sızıntı testi değildir.
- Açılış + arayüz + menü üç tarayıcı matrisi: 33/33 geçti (6.6 dakika).
  Kanıt: `artifacts/cleanup-20261023/e2e-architecture-33-results.json`.
  Bu işlevsel matris savaş FPS testini içermez; önceki başarısız FPS kapısı korunur.

Önceki WebKit savaş FPS başarısızlığı açık kalır: son bilinen ölçüm 2.7 FPS /
p95 389.5ms. Bu tur çizici veya FPS eşiği değiştirilmedi. İşlevsel E2E'nin
geçmesi bu performans kapısını kapatmaz. Yeni CI/push, sunucu yayını veya AAB
yapılmadı; bütün olası kusurların yok edildiği söylenemez.
