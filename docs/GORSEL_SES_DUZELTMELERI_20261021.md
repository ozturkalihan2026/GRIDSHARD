# 21 Ekim — yerel oyun testi sonrası görsel/ses düzeltmeleri

Bu tur kaynak düzeltmesidir. Commit/push, canlı sunucu geçişi, AAB veya Play
Console yayını yapılmadı. Kullanıcı yerelde tekrar oynayacak.

## Savaş ve çekirdek

- Rakip çekirdeğinin üstünü kesen dikdörtgen eski kart zeminiydi. Çekirdek
  de fiziksel kart yoluna alındı; eski zemin/ad şeridi kaldırıldı. Böylece
  perspektif zinciri sıradan kartta düzleştirilmez.
- Yedi çekirdeğin opak sınırları hazırlama aracında ölçülür ve üretilen katman
  verisinde tutulur. Çizim bir sokete sığacak şekilde kaydedilir; savaşta
  piksel taraması veya ek layout döngüsü yapılmaz. Çekirdek komşu modülü örtmez.
- Billboard zemin düzleminden hafif yukarıda kalır. Çekirdeğin gövdesindeki
  idle yer değiştirmesi kaldırıldı; renkli çalışma nabzı korunur. İsabette
  kartın filter animasyonu perspektifi düzleştirmez.
- Çalışan Kalkan için kalıcı, yarı saydam altıgenli kubbe geri eklendi.
  Düşük kalitede de statik görünür; devre dışı/yok olmuş modülde temizlenir.
  Efekt, namlu projeksiyonu yerine kalıcı hücre kaydından görseli bulur.
- Patlamalar düz çizgi roman yıldızı yerine kısa sıcak merkez, mahfaza
  plakaları, renkli kristal parçaları ve yatay şok dalgası kullanır. Parça
  bütçesi modülde 16→12, çekirdekte 30→20; yaşam süresi ve temizlik korunur.

## Ses ve sandık

- Savaş SFX ek çarpanı 0.16→0.42 (+8.4 dB). Kullanıcı ses ayarı, sıkıştırıcı,
  müzik sınırlayıcı ve eşzamanlı ses sınırları korunur.
- Menü v8 / savaş v9 enstrüman ailesiyle özgün sonuç müzikleri üretildi:
  `victory_v9_devre` (10 sn), `defeat_v9_devre` (6 sn). Baş/son sıfır, doğal
  son akor kuyruğu; loop dönüşü yok. Sonuç müziği çarpanı 0.55→0.80.
- Kaynak stereo WAV ve mobil OGG/M4A türevleri, manifest/format kaydı güncel.
  Eski kayıtlar silinmedi. Üretici: `tools/generate_result_playlist_audio.py`.
- Düşük kalite tüm sandık açılış ışığını kapatıyordu. Dört sandıkta kendi
  rengindeki ucuz opaklık efekti ve kapak geçişi korunur. Azaltılmış harekette
  statik renkli ışık vardır. Sunucu makbuzu gelmeden kapak/ödül açılmaz;
  hata, yeniden deneme ve ödül verme kuralları değişmedi.

## Koleksiyon, etkinlik, takım, başlıklar

- 36 modülün tümüne adla gelen koleksiyon/ödül yolları da yeni fiziksel resmi
  bulur. İlk on modülün v1 ve kalanların v2 varlık kökü ayrı tutulur. Bilinmeyen
  açık kimlik, benzer adlı farklı modülün görselini devralmaz.
- Günlük meta takvim yerine mevcut çarkıfelek amblemini kullanır. Üst/alt
  boşluk, satır aralığı ve mobil puntolar sıkılaştırıldı; açıklama kesilmez.
- Turnuva amblemi iki gerçek yazı satırını kaplar; boş üçüncü grid satırı yok.
  Başlık/tarih birlikte ikonun dikey merkezindedir. Haftalık için devre/podyum,
  takım için çift sancak/devre arka planı eklendi. Dar ekranda metin taşmaz.
- Takım oluşturma şartında native select değer sahibi kalır; erişilebilir
  özel açılır liste `100 [kupa görseli]` gibi seçenekler gösterir. Fare,
  dokunma, oklar, Enter, Escape ve dışarı tıklama testlidir. API değişmedi.
- Mağazanın iki başlığı ve Kartlar → Savaş Destesi başlığındaki sarı sol şerit
  kaldırıldı; diğer yüzeylerin düzeni korunur.

## Doğrulama

- Tam istemci: **643 geçti**.
- Tam sunucu: **1659 geçti, 44 koşullu atlandı**. PostgreSQL/Redis gibi gerçek
  servis CI kapıları bu yerel sonucu tamamlamalı; bu değişikliklerin uzak CI
  sonucu henüz doğrulanmadı.
- Paketleme: **10 geçti**; **417 Python dosyası / 0 import sorunu**.
- **49 ses** mobil manifest kontrolü geçti. Dört yeni OGG/M4A dosyası FFmpeg
  ile hatasız çözüldü; WAV seviye/süre/kuyruk testleri geçti.
- Savaş görsel E2E: masaüstü Chromium, Android Chromium ve iPhone WebKit'te
  yedişer çekirdek, iki taraf, hücre sınırları, isabet, zemin/ad şeridi yokluğu,
  gerçek Kalkan yerleştirme ve patlama temizliği geçti.
- Sandık E2E: masaüstü ve Android'de dört seviye, makbuz bekleme, hata ve
  azaltılmış hareket geçti. Düşük kalite dört seviye üç tarayıcıda geçti.
- Son mobil meta sıkıştırması sonrası üç tarayıcıdaki menü testleri ve
  masaüstü/Android atmosfer, TR/EN, 320px dar ekran testleri geçti. Toplam
  10 farklı hedefli tarayıcı senaryosu ayrı koşularla doğrulandı. Android'in
  kesirli satır yüksekliği için kompakt kart karşılaştırmasında 1px tolerans
  var; gerçek fark 0.3px idi. Oyun metni kesilerek test geçirilmedi.
- Son izole web build: **918787c92008ddfc**, 619 çalışma zamanı varlığı:
  `artifacts/ci-fix-20261020/web-mvKZs6/dist/`. İki yeni SVG CSS paketine ve
  dört yeni mobil ses dosyası varlık dizinine girdi. Geliştirme test API'si
  üretim JS çıktısında yoktur.

Tarayıcı testleri headless ve localhost 8891 üzerinde ayrı geçici hesap/veriyle
yapıldı. Kullanıcının tarayıcısı veya açık geliştirme sunucusu yönetilmedi.
Emülasyon, gerçek telefon FPS/işitme değerlendirmesinin yerine geçmez.
Kullanıcı Ctrl+F5 ile kaynakları yenileyip savaş, ses, sandık, koleksiyon ve
etkinlik ekranlarını yerelde tekrar deneyecek; ardından commit/push ve CI.
