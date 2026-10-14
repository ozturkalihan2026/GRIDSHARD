# GRIDSHARD 2.1 — Modül Çevrim Kanonu

Bu belge `server/app/game/catalog.py`, `module_cycles.py` ve `module_sheet.py` verisinden üretilir (13 Ekim 2026). Çelişki olursa kod geçerlidir.

Her modül kendi çevrimiyle çalışır ve çevrim seviyeyle kısalır (seviye başına %0,8; seviye 15'te yaklaşık %10,6). CAN seviye başına %3, hasar %5 artar; modüle özgü değerler etki çarpanıyla (seviye başına %3,5; sabotajda %3) büyür. Yüksek tabanlı oranlar (blok, yansıtma, kubbe, sabotaj direnci, dönüşüm) azalan hızla büyür ve kendi tavanında durur. Bilgi ekranı aynı sayıları `module_stats` üzerinden gösterir.

Çevrim türleri:

- **Eylem aralığı** (saldırı, onarım, sabotaj): modül çevrimi dolunca işini yapar; enerji yetmezse bekler.
- **Savunma yükü** (Kalkan, Prizma Kalkanı, Yansıtıcı, Koruyucu Kubbe, Bariyer): çevrim dolunca yük hazır olur, yükü harcayan olaydan (karşılanan saldırı, uygulanan sabotaj) sonra çevrim yeniden başlar. Yeni yerleşen modül yüklü başlar.
- **Destek darbesi** (Güçlendirici, Omega Güçlendirici, Hedefleme Bilgisayarı, Aşırı Hızlandırıcı): çevrimde bir saldırı modüllerini yükler; yük sıradaki atışta harcanır. Bir atış bütün yükleri harcar ve en güçlü tek desteği kullanır.
- **Darbe** (Soğutucu, Zırh, Hassas Matris): çevrimde bir kendi işini yapar; yapacak iş yoksa hazır bekler.
- **Dönemsel pencere** (Faz Zırhı, Kronos Rölesi): çevrimin belirli bir bölümünde etkindir.
- **Depo dolumu** (Batarya, Kapasitör): çevrim, boş deponun tam dolma süresidir.

| Modül | Sınıf | Çevrim | Sv 1 | Sv 15 | Modüle özgü değerler (Sv 1 → Sv 15) |
|---|---|---|---:|---:|---|
| Lazer | Saldırı | Saldırı aralığı | 1 sn | 0,89 sn | Saniye hasarı 12/sn → 26,58/sn |
| Kalkan | Savunma | Blok aralığı | 1,2 sn | 1,07 sn | Blok %60 → %80,1 |
| Batarya | Sistem | Depo dolumu | 4 sn | 3,58 sn | Depo 20 → 32,4 |
| Soğutucu | Destek | Soğutma aralığı | 1 sn | 0,89 sn | Soğutma 3×%4,5 → 3×%7,28 |
| EMP | Sabotaj | Sabotaj aralığı | 6 sn | 5,36 sn | Etki süresi 2,5 sn → 3,78 sn |
| Güçlendirici | Destek | Yükleme aralığı | 2 sn | 1,79 sn | Hasar desteği %18 → %29,1 |
| Onarım | Destek | Onarım aralığı | 2 sn | 1,79 sn | Onarım 15 → 24 |
| Zırh | Savunma | Onarım aralığı | 3 sn | 2,68 sn | Koruma %25 → %40,5; Plaka onarımı 5 → 8 |
| Darbe Topu | Saldırı | Saldırı aralığı | 2,5 sn | 2,23 sn | Saniye hasarı 12,8/sn → 28,36/sn |
| Füze Fırlatıcı | Saldırı | Saldırı aralığı | 3 sn | 2,68 sn | Saniye hasarı 9,33/sn → 20,68/sn; Kilit 0,7 sn |
| Hedefleme Bilgisayarı | Destek | Kilit aralığı | 2 sn | 1,79 sn | Hız desteği %18 → %29,1 |
| Bariyer | Savunma | Direnç aralığı | 4 sn | 3,58 sn | Koruma %20 → %32,4; Sabotaj direnci %35 → %46,7 |
| Ark Topu | Saldırı | Saldırı aralığı | 1,8 sn | 1,61 sn | Saniye hasarı 11,11/sn → 24,61/sn; Zincir %45 |
| Kapasitör | Sistem | Depo dolumu | 1 sn | 0,89 sn | Depo 10 → 16,2 |
| Dron Üssü | Saldırı | Saldırı aralığı | 0,9 sn | 0,8 sn | Saniye hasarı 8,89/sn → 19,7/sn; Sıçrama %25 |
| Sinyal Bozucu | Sabotaj | Sabotaj aralığı | 5 sn | 4,47 sn | Etki süresi 4 sn → 6,05 sn |
| Ray Topu | Saldırı | Saldırı aralığı | 3,2 sn | 2,86 sn | Saniye hasarı 12,5/sn → 27,69/sn; Delme %40 |
| Akım Dengeleyici | Sistem | Sürekli | — | — | Enerji tasarrufu %8 → %12,9 |
| Yansıtıcı | Savunma | Ayna aralığı | 1 sn | 0,89 sn | Yansıtma %30 → %40; Koruma %25 → %40,5 |
| Nano Sağlıkçı | Destek | Onarım aralığı | 2 sn | 1,79 sn | Onarım 2×9 → 2×15 |
| Virüs | Sabotaj | Sabotaj aralığı | 7 sn | 6,25 sn | Etki süresi 6 sn → 9,08 sn; Toplam hasar 54 → 130 |
| Aşırı Hızlandırıcı | Destek | Yükleme aralığı | 2,5 sn | 2,23 sn | Hasar desteği %20 → %32,4; Hız desteği %20 → %32,4; Yükleme ısısı %3,75 |
| Plazma Havanı | Saldırı | Saldırı aralığı | 3 sn | 2,68 sn | Saniye hasarı 10/sn → 22,16/sn; Kilit 1,2 sn; Alan %35 |
| Muhafız Kubbesi | Savunma | Kubbe aralığı | 1,5 sn | 1,34 sn | Kubbe %30 → %40; Koruma %32 → %51,8 |
| Kuantum Tekrarlayıcı | Saldırı | Saldırı aralığı | 1 sn | 0,89 sn | Saniye hasarı 24/sn → 53,15/sn; Yankı %65 |
| Krono Rölesi | Destek | Zaman çevrimi | 6,5 sn | 5,81 sn | Hızlanma %28 → %35; Hızlanma süresi 4 sn; Zaman borcu 2,5 sn → 1,81 sn |
| Faz Zırhı | Savunma | Faz çevrimi | 6 sn | 5,36 sn | Koruma %18 → %29,1; Faz süresi 1 sn |
| Sürü Fabrikatörü | Saldırı | Saldırı aralığı | 0,9 sn | 0,8 sn | Saniye hasarı 6,67/sn → 14,78/sn; Sürü 3×%25 |
| Hassasiyet Matrisi | Destek | Odak aralığı | 1,5 sn | 1,34 sn | Kademe hasarı 4×%4 → 4×%6,5; Kademe hızı 4×%3 → 4×%4,9 |
| İyon Mızrağı | Saldırı | Saldırı aralığı | 3,2 sn | 2,86 sn | Saniye hasarı 15/sn → 33,23/sn; Delme %60; Taşma %55 |
| Prizma Kalkanı | Savunma | Blok aralığı | 1,3 sn | 1,16 sn | Blok %55 → %73,4; Dönüşüm %25 → %33,4 |
| Kesici | Sabotaj | Sabotaj aralığı | 6,5 sn | 5,81 sn | Etki süresi 3,5 sn → 5,29 sn; Yankı süresi %50 |
| Anka Onarım | Destek | Onarım aralığı | 2 sn | 1,79 sn | Onarım 17 → 28; Diriliş canı %30; Diriltme 30 sn |
| Kuantum Topu | Saldırı | Saldırı aralığı | 2,5 sn | 2,23 sn | Saniye hasarı 23,2/sn → 51,41/sn; Yük bonusu %80 |
| Omega Güçlendirici | Destek | Yükleme aralığı | 2 sn | 1,79 sn | Sınıf başına pay %8 → %12,9; En çok destek %20 → %32,4 |
| Tekillik Projektörü | Sabotaj | Sabotaj aralığı | 6,5 sn | 5,81 sn | Etki süresi 4,5 sn → 6,81 sn; Yankı süresi %65 |

## Modüllerin kuralları

- **Lazer** — Düzenli hasar üretir.
- **Kalkan** — Başlangıç seviyesinde 1,2 saniyede bir, kendisine gelen bir saldırıyı karşılar ve hasarının %60'ını engeller. Seviye yükseldikçe blok aralığı kısalır, engellenen pay artar.
- **Batarya** — Başlangıç seviyesinde devreye saniyede 4,5 enerji verir; ayrıca 20 enerji depolayarak ani yükleri karşılar. Boş deposu 4 saniyede dolar; seviye yükseldikçe üretim ve depo artar, dolum kısalır.
- **Soğutucu** — Başlangıç seviyesinde 1 saniyede bir devredeki en sıcak üç modülü, önce susmuş olanları %4,5 soğutur; aşırı ısınıp susmuş modülü hızla toparlar. Seviye yükseldikçe soğutma artar, aralık kısalır.
- **EMP** — Enerji ve destek hatlarını geçici aksatır.
- **Güçlendirici** — Başlangıç seviyesinde 2 saniyede bir devredeki saldırı modüllerini yükler; yüklü modülün sıradaki atışı daha çok hasar verir. Toplam %36 pay saldırılar arasında bölünür, tek saldırıya en fazla %18. Seviye yükseldikçe yükleme aralığı kısalır.
- **Onarım** — En düşük CAN oranındaki tek modülü onarır.
- **Zırh** — Başlangıç seviyesinde kendisine gelen hasarı sürekli %25 azaltır; 3 saniyede bir zırh plakasını onarır ve 5 CAN geri kazanır. Seviye yükseldikçe azaltma ve onarım artar, aralık kısalır.
- **Darbe Topu** — Seyrek fakat güçlü darbeler üretir.
- **Füze Fırlatıcı** — Hazırlık süresi karşılığında yüksek baskı oluşturan ağır saldırı modülüdür.
- **Hedefleme Bilgisayarı** — Başlangıç seviyesinde 2 saniyede bir devredeki saldırı modüllerine kilit verir; kilitli modülün sıradaki atışından sonraki beklemesi kısalır. Toplam %36 pay saldırılar arasında bölünür, tek saldırıya en fazla %18. Seviye yükseldikçe kilit aralığı kısalır.
- **Bariyer** — Saldırıları üzerine çeker. Başlangıç seviyesinde hasarı %20 azaltır ve 4 saniyede bir, devreye uygulanan bir sabotajın süresini %35 kısaltır. Seviye yükseldikçe sabotaj direnci artar, aralık kısalır.
- **Ark Topu** — Yakın bağlantılı hedefler arasında sıçrayabilen enerji saldırıları üretir.
- **Kapasitör** — Enerji üretmez; başlangıç seviyesinde 10 enerjilik, 1 saniyede dolan bir rezervdir ve açıkta Bataryadan önce boşalır. Seviye yükseldikçe depo büyür, dolum kısalır.
- **Dron Üssü** — Çoklu küçük saldırılarla rakip savunmasını yıpratır.
- **Sinyal Bozucu** — Hedefleme ve destek modüllerini zayıflatır.
- **Ray Topu** — Zırhlı hedeflere karşı delici hasar üretir.
- **Akım Dengeleyici** — Aksiyon ve bakım enerjisi maliyetlerini %8 azaltır. Çoklu kopyalar en fazla %24 azaltım sağlar.
- **Yansıtıcı** — Başlangıç seviyesinde 1 saniyede bir, devreye gelen bir saldırıyı üzerine çeker ve hasarının %30'unu saldırana yansıtır; kendisine gelen hasarı ayrıca %25 azaltır. Seviye yükseldikçe yansıtma artar, aralık kısalır.
- **Nano Sağlıkçı** — En yaralı iki modülü aynı anda, her birini temel onarımın %62'si kadar onarır.
- **Virüs** — Rakip destek ve kontrol hatlarında zamanla etkisini artıran zayıflatma uygular.
- **Aşırı Hızlandırıcı** — Başlangıç seviyesinde 2,5 saniyede bir devredeki en ağır saldırı modülüne aşırı yük verir: sıradaki atışı %20 daha çok hasar verir ve beklemesi %20 kısalır; karşılığında o modül her yüklemede ısınır. Seviye yükseldikçe yükleme aralığı kısalır.
- **Plazma Havanı** — Hedefe 1,2 sn kilitlenip ateşler; sıradaki hedefe %35 alan hasarı sıçrar.
- **Muhafız Kubbesi** — Başlangıç seviyesinde kendisine gelen hasarı %32 azaltır ve 1,5 saniyede bir, devredeki başka bir modüle gelen bir saldırının hasarını %30 azaltır. Seviye yükseldikçe koruma artar, aralık kısalır.
- **Kuantum Tekrarlayıcı** — Aynı hedefe dördüncü ardışık vuruşta, son hasarın %65'i kadar kuantum yankısı üretir.
- **Krono Rölesi** — 4 sn boyunca tüm saldırıları hızlandırır; ardından başlangıç seviyesinde 2,5 sn süren zaman borcu saldırıları yavaşlatır. Seviye yükseldikçe zaman borcu kısalır.
- **Faz Zırhı** — Başlangıç seviyesinde her 6 saniyelik çevrimin ilk saniyesinde saldırıları tamamen boşa çıkarır; diğer anlarda hasarı %18 azaltır. Seviye yükseldikçe çevrim kısalır, faz daha sık gelir.
- **Sürü Fabrikatörü** — Her atışta bir dron biriktirir; dördüncü atışta üç hedefe sürü salar.
- **Hassasiyet Matrisi** — Başlangıç seviyesinde 1,5 saniyede bir, hedefini değiştirmemiş saldırı modüllerine bir odak kademesi verir; kademe başına hasar ve hız artar (en çok 4 kademe). Hedef değişince odak sıfırlanır. Seviye yükseldikçe odak daha hızlı birikir.
- **İyon Mızrağı** — Savunma azaltımının %60'ını yok sayar; arkadaki hedefe %55 hasar taşar.
- **Prizma Kalkanı** — Başlangıç seviyesinde 1,3 saniyede bir, kendisine gelen bir saldırıyı karşılar ve hasarının %55'ini engeller; engellediği hasarın dörtte birini Çekirdek rezervine enerji olarak ekler. Seviye yükseldikçe blok ve dönüşüm artar, aralık kısalır.
- **Kesici** — Rakibin seçili bağlantı hattını kısa süreli devre dışı bırakmaya odaklanır.
- **Anka Onarım** — 30 saniyede bir, sınıf sınırlarına uyarak yok edilmiş bir modülü %30 CAN ile geri getirir (10 enerji); her modül maçta yalnız bir kez dirilir. Diriltecek modül yoksa güçlü bir tek hedef onarımı yapar.
- **Kuantum Topu** — Devrenin boşa giden enerjisini yük olarak toplar; dolu yük sıradaki atışa %80'e kadar hasar ekler.
- **Omega Güçlendirici** — Başlangıç seviyesinde 2 saniyede bir devredeki saldırı modüllerini rezonansla yükler; devredeki her farklı sınıf, yüklü atışa paylaşılan hasar desteğini büyütür. Seviye yükseldikçe yükleme aralığı kısalır.
- **Tekillik Projektörü** — Hedef sistemi 4,5 sn keser; ikinci bir sisteme %65 süreli yankı uygular.
