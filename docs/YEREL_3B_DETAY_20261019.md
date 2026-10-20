# Yerel 3B ayrıntı çalışması — 19 Ekim 2026

Kısıt: kredili servis, dışarıya görsel yükleme veya ücretli model üretimi yok.
Onaylı raster çizimleri değiştirilmedi. Geometri JavaScript ile yerelde üretildi.

- [x] 36 modüle ayrı ayrıntı tarifi: device-reference-details.js.
- [x] Tarifler gerçek savaş modellerine ve başlangıç yükleme sırasına bağlandı.
- [x] Akım Dengeleyici: dairesel bağlantı yerine üçgen altın bağlantı.
- [x] Krono Rölesi: iki elmas yerine dar boğazlı kum saati.
- [x] Faz Zırhı / Prizma Kalkanı: düz sütun yerine kıvrımlı koruyucu paneller.
- [x] Virüs: üç çeneli enjektör; Ark Topu: kalın çift çene.
- [x] Karıştırıcı: boş halka yerine içbükey çanak yüzeyi.
- [x] Diğer modüller: ayrı lens, ızgara, panel, boru, bağlantı, kapak ayrıntıları.
- [x] Statik CPU önizlemeleri üretildi ve toplu görüntü incelendi.
- [x] Geometri testleri: sonlu koordinatlar, üçgen bütçesi, ortak bağlam,
  modele özel tek tampon, dönüş sınırları ve namlu başlangıcı doğrulandı.
- [ ] Gerçek oyunda kullanıcı görsel kabulü ve GPU/FPS ölçümü.
- [ ] Onaylı illüstrasyonlarla birebir yüzey/siluet eşleşmesi.

## Dürüst kalite sınırı

Bu sürüm yerel model ayrıntı iyileştirmesidir; birebir kopya değildir.
Toplu önizlemede ortak kaide/gövde etkisi, düz malzemeler ve bazı ince panel
oranları hâlâ referanslardan farklıdır. CPU önizlemesinin ışığı da oyun WebGL
gölgelendiricisiyle tamamen aynı değildir. Bunlar tamamlandı diye işaretlenmedi.

Model ayrıntıları yalnız önbellek oluşturulurken eklenir; yeni kare döngüsü,
efekt sırasında model/devre yeniden kurulumu eklenmedi. Hasar, hedef seçimi,
ses ve oyun dengesi bu ayrıntı çalışmasında değiştirilmedi.

Önizleme: artifacts/real3d-art-pass-20261019/devices-review.webp
Geometri sayımları: aynı klasörde report.json.
