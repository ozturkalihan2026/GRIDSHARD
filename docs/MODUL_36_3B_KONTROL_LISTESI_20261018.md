# 36 modül — onaylı çizimden gerçek 3B

18 Ekim 2026. Kullanıcı isteği: 36 modülün onaylı çizimle aynı görünüme
yaklaştırılması ve her birinin mekanik ihtiyacına göre dönmesi.

## Son durum — kullanıcı onayı sonrası bağlantı

- [x] Son 16 modül ve 7 çekirdeğin çizim onayı kullanıcıdan alındı.
- [x] Kalan 26 modül ve 7 çekirdek için ayrı gerçek geometriler oluşturuldu.
- [x] Toplam 36 modül + 7 çekirdek ortak WebGL çiziciye bağlandı.
- [x] Sabit taban / dönen başlık ayrımı ve 0° / 180° / 360° politikaları.
- [x] Aşırı Hızlandırıcı, Yansıtıcı ve Anka diriltme olaylarının gerçek hedefleri.
- [x] Alan hasarı katkıları ana silah hedefini değiştirmiyor.
- [x] 33 onaylı WebP paket listesine eklendi; 3B kullanılamazsa resim yedeği.
- [x] Kartlarda/menülerde yeni modül ve çekirdek çizimleri merkezi olarak kullanılıyor.
- [x] 197/197 otomatik test; normal ve 3B olmayan başlangıç kontrolleri geçti.
- [x] Aynı geometrilerden CPU önizlemesi üretildi ve incelendi.
- [ ] Onaylı çizimlerle ince siluet, malzeme ve detay eşleşmesinin son rötuşları.
- [ ] Nano Sağlıkçı'nın iki kolunun bağımsız hedef yönelimi (şimdilik ortak başlık ilk gerçek hedefe döner; oyun etkisi değişmedi).
- [ ] Kullanıcının gerçek tarayıcı/oyun ve performans testi.

Kod: client/src/battle/device-models-extended.js ve laser-3d-pilot.js.
Önizleme: artifacts/real3d-all43-20261018/devices-review.webp.
Savaş dengesi değiştirilmedi. Yeni RAF, hücre başına canvas veya efekt sırasında
devreyi yeniden kurma eklenmedi. Geometriler teknik olarak bağlıdır; görsel
eşleşmenin tamamlandığı iddia edilmez. Aşağıdaki bölüm önceki aşamanın kaydıdır;
model bulunabilirliği/onay notları yerine bu son durum esas alınmalıdır.

## Önceki aşama kaydı

- [x] Kanondaki 36 kimlik ve sunucudaki imza mekanikleri incelendi.
- [x] 36 kimlik için ortak dönüş politikası kaydedildi.
- [x] Mevcut ilk 10 model bu politikaya bağlandı. Lazer, Darbe Topu,
  Füze Fırlatıcı ve EMP karşı devreye bakan 180° aralık kullanır.
- [x] Politika ile model mevcudiyeti ayrıldı; eksik modele başka cihazın
  geometrisi atanmaz. Taban dönmez, boşta hedef taraması yapılmaz.
- [x] 3B testleri: 17/17 geçti.
- [x] Genel VFX/arayüz denetimi: 194/194 geçti; normal ve 3B yüklenmeyen
  başlangıç senaryoları geçti. Tarayıcı ve sunucu başlatılmadı.
- [ ] İlk 10 modelin siluet, parçalar ve malzemeleri onaylı çizimle eşleşti.
- [x] Sonraki 10 çizimin görsel onay durumu netleştirildi: kullanıcı onayladı.
- [x] Son 16 modülün yeni fiziksel çizimleri Paket 8C olarak üretildi.
- [x] 7 çekirdek için ayrı fiziksel reaktör çizimleri üretildi.
- [ ] Yeni 23 çizimin kullanıcı görsel kabulü.
- [ ] 7 çekirdeğin gerçek 3B geometrisi ve ortak renderer bağlantısı.
- [ ] Kalan 26 özgün model, hareketli parçaları ve gerçek VFX uçları tamamlandı.
- [ ] 36 model aynı kamera ve küçük hücre boyutunda görsel olarak doğrulandı.
- [ ] Kullanıcının yerel oyun testi ve performans kabulü tamamlandı.

**36 model tamamlanmış değildir.** İlk 10'un mevcut geometrileri prototiptir;
hareketin çalışması sanat eşleşmesi anlamına gelmez. Bu tur yeni model
üretilmedi. Son 26'nın dönüş politikaları hazırdır, modelleri oyuna bağlı değildir.

## Güncel referanslar

İlk 10: `client/assets/ui/modules-physical-v1/` içindeki çizimler.
Sonraki 10: `artifacts/visual-refresh-pack08b-20261018/` içinde mevcut;
Kullanıcı Paket 8B'nin 10 çizimini onayladı. Son 16 modül ve 7 çekirdek
`artifacts/visual-refresh-pack08c-20261018/` altında üretildi.
Promptlar ve üretim kaynakları `GORSEL_DONUSUM_PAKET08C_PROMPTLAR_20261018.json`
dosyasında. Aşağıdaki matristeki eski “eksik / 8B onayı” notları artık geçersiz;
derece ve hedef kuralları geçerlidir. Yeni çizim üretimi 3B dönüşüm değildir.

## Dönüş matrisi

Derece, hareketli başlığın yatay dönüşüdür; bütün resmi ekran düzleminde
çevirmek değildir. 180° kendi/rakip devresi için aynalı karşı yarım düzlemdir.
360° destek başlığı yalnız gerçek hedefe döner. Sabit cihazlar işini VFX ve
yerel parça hareketiyle gösterir; gövde dönmez. Bu kararlar savaş dengesini değiştirmez.

| Modül | Başlık | Davranış / referans |
|---|---:|---|
| Lazer | 180° | Ana hedef kilidi; ilk 10 çizimi |
| Kalkan | 0° | Yönsüz blok kubbesi; ilk 10 |
| Soğutucu | 360° | Gerçek en fazla 3 hedefe sırayla; ilk 10 |
| Batarya | 0° | Devre enerjisi; ilk 10 |
| Güçlendirici | 0° | Tüm saldırılara dağıtılan destek; ilk 10 |
| EMP | 180° | Rakip sistem hedefi; ilk 10 |
| Onarım | 360° | Yaralı dost hedef; ilk 10 |
| Sönümleyici | 0° | Kendi savunması; ilk 10 |
| Darbe Topu | 180° | Ana hedef; ilk 10 |
| Füze Fırlatıcı | 180° | Kilitlenen ana hedef; ilk 10 |
| Hedefleme Bilgisayarı | 0° | Devre çapında hız desteği; 8B onayı netleşmeli |
| Bariyer | 0° | Savunma alanı; 8B |
| Ark Topu | 180° | Ana hedef; zincir sıçraması başlığı oynatmaz; 8B |
| Kapasitör | 0° | Enerji rezervi; 8B |
| Dron Üssü | 180° | Çıkış başlığı ana hedef; dron uçuşu bağımsız; 8B |
| Sinyal Bozucu | 180° | Rakip sistem hedefi; 8B |
| Ray Topu | 180° | Ana hedef; 8B |
| Akım Dengeleyici | 0° | Devre maliyet azaltımı; 8B |
| Yansıtıcı | 180° | Gelen saldırının yönüne karşılık veren başlık; 8B |
| Nano Sağlıkçı | 360° | İki eşzamanlı onarım için bağımsız çıkışlar; 8B |
| Virüs | 180° | Rakip hedefe uygulama; fiziksel referans eksik |
| Aşırı Hızlandırıcı | 360° | Seçili dost saldırıcı; referans eksik |
| Plazma Havanı | 180° | Ana hedef kilidi; alan hasarında yeniden dönmez; eksik |
| Muhafız Kubbesi | 0° | Devre koruma alanı; eksik |
| Kuantum Tekrarlayıcı | 180° | Aynı hedef kilidi; yankı dönüş yaratmaz; eksik |
| Krono Rölesi | 0° | Devre çapında hız penceresi; eksik |
| Faz Zırhı | 0° | Yerel faz savunması; eksik |
| Sürü Fabrikatörü | 180° | Ana çıkış; bağımsız dronlar çoklu hedefe gider; eksik |
| Hassasiyet Matrisi | 0° | Saldırıcıların odak desteği; eksik |
| İyon Mızrağı | 180° | Ana hedef; arka hedefe taşma başlığı döndürmez; eksik |
| Prizma Kalkanı | 0° | Blok ve enerji dönüşümü; eksik |
| Kesici | 180° | Ana rakip sistem; yankı ayrı VFX; eksik |
| Anka Onarım | 360° | Onarım / diriltme hedefi; eksik |
| Kuantum Topu | 180° | Ana hedef ve enerji yükü; eksik |
| Omega Güçlendirici | 0° | Devre çapında rezonans; eksik |
| Tekillik Projektörü | 180° | Ana sistem hedefi; yankı ayrı VFX; eksik |

## Kod ve devam noktası

- `client/src/battle/laser-3d-pilot.js`: `ROTATION_RULES` 36 kimlik;
  `SPECS` yalnız gerçekten mevcut ilk 10 model. Dosyanın tarihî adı korunuyor.
- `client/tests/laser-3d-pilot.test.js`: kanon kapsamı, derece sınırları,
  bilinmeyen geometrinin reddi, tek bağlam/buffer önbelleği ve mevcut testler.
- Motor kaynakları: `server/app/game/catalog.py`, `support.py`, `engine.py`.
- Sonraki model bağlanırken sunucu olayları, çoklu çıkışlar, diriltme ve
  yansıtma hedefleri ayrıca bağlanıp test edilmeli; yalnız bu tablo yeterli değildir.
- Tek ortak canvas/saat, tür başına önbellek, olay temelli hedef kilidi korunacak.
  Efekt sırasında devre/DOM kurulmayacak. Yeni model başına RAF eklenmeyecek.

Kontrol komutu: `node --test client/tests/laser-3d-pilot.test.js`.
