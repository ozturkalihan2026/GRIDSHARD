# S1 — otomatik açılış, kapanış ve sezon arası

15 Kasım kullanıcı kararı, önceki 30 Kasım hedefinin yerine geçer. Oyuncuya
dağıtılmış 2.4.0 / code15 AAB değişmez; işlem sunucu tarafındadır.

| Aşama | Türkiye saati | Davranış |
| --- | --- | --- |
| Açılış | 24 Kasım 2026 03.00 | S1, günlük giriş ve sezon ödülleri, iki turnuva ve bot katılımı açılır. |
| 1. hafta | 24 Kasım–1 Aralık | Lazer kaynak ödülleri; yedi tam gün. |
| 2. hafta | 1–8 Aralık | Kalkan kaynak ödülleri. |
| 3. hafta | 8–15 Aralık | Darbe Topu kaynak ödülleri. |
| 4. hafta | 15–22 Aralık | Derin Akım çifti ayrılmış final haftası. |
| Kapanış | 22 Aralık 2026 03.00 | S1 ve takım turnuvası biter; kazanılmış yol hakları ve sıralama kasaları Mesaj Kutusu'na aktarılır. |
| Sezon arası | 22 Aralık sonrası | Yeni sezon/turnuva kaydı ve sezon ödülü kazanımı kapalıdır. Eski ödüller alınabilir. S2 için ayrı karar gerekir. |

Bütün hafta sınırları 03.00'tür. S2'nin plandaki 28 Aralık tarihi yalnız
koşullu hedeftir; otomatik açılış taahhüdü değildir. Ücretsiz Arena ve mevcut
kalıcı ilerleme sezon arasında kullanılabilir; yeni sezon içeriği verilmez.

## Otomasyon ve veri bütünlüğü

- Başlangıç sunucu saatinden hesaplanır; 23 Kasım'da komut, açık bilgisayar,
  AAB dağıtımı veya oyuncu girişi gerekmez.
- `GRIDSHARD_SEASON_AUTO_CYCLES=1` yalnız S1'i açar; 28 günün sonunda sezon
  arasına geçer. Operatör yeni S2 planını yayımlayana kadar kapalı kalır.
- Canlı worker bakım döngüsü en çok yaklaşık 60 saniyelik aralıkla kapanışı
  dener. Yeniden başlatma sonrası kaçırılmış dönemleri yakalar.
- Bekleyen savaş sonuçları önce işlenir. Oyuncular, kalıcı dönem kapanışları,
  ödül teslimleri ve bot paketlerinin ertelenmesi aynı PostgreSQL işlemiyle
  korunur; kesinti geri alınır ve tekrar denenir. İkinci deneme ödül çoğaltmaz.
- Botlar para/XP/ödül hesabı yaratmaz; insanın gerçek sırası korunur. Bütün
  ödül sıraları bot ise özgün paket planın sonuna bir kez eklenir.
- Kazanılmış ama alınmamış yol hakları kapanışta korunur. Kasa Mesaj Kutusu'na
  otomatik teslim edilir; açılış için oyuncunun Topla işlemi gerekir.

## Kabul ve dağıtım sınırı

- Linux/Python3.12 + izole PostgreSQL17/Redis: **2108 PASS, sıfır skip**.
- Gerçek imzalı 2.4.0 AAB web varlıkları: Chromium ve WebKit'te açılış öncesi,
  aktif 240 bot/12 takım, lider panosu, altı otomatik kapanış ve sezon arası PASS.
  Yalnız runtime API adresi loopback'e değişti. Native paket yeniden üretilmedi;
  önceki fiziksel rc.5 kabulü ve değişmeyen AAB SHA256'sı korunur.
- Yedi dönemlik kaynak/kozmetik tahsisi, altı oyuncu ve üç takım kozmetiği
  doğrulandı. Taslak kaynak JSON'ları yayımlanmış sayılmaz; kabulden üretilen
  ayrı, hash'li dosyalar dağıtım imajına alınır.
- Yeni takvim duyurusu eski iki bildirimi yeni kimlikle geçersiz kılar;
  daha önce Tamam'a basmış oyuncu yeni duyuruyu da görür.
- Dağıtım, değişmez rc.5 imajı üzerine yalnız ilgili sunucu dosyalarını ve
  kabul edilmiş S1 kataloglarını ekler. 2.5.0 içeriği/native paket değişmez.
- Canlı geçişte yeni yedek, izole restore ve tablo içerik eşitliği zorunludur;
  aktif savaş varken geçiş yapılmaz. Şema/PG/Redis/Caddy değiştirilmez.

Kanıtlar: `qa_reports/s1-autostart-20261115/`. Canlı geçiş sonucu ayrıca
bu dosyaya ve checkpoint'e işlenir; hazırlık kabulü canlı dağıtım kanıtı değildir.

## Canlı geçiş tamamlandı

15 Kasım 2026 **21.59.47 TR**'de uygulandı; kaynak
`3b3cdb51f52cddadd189d122c7b2a2860203b8f1`, imaj
`sha256:0095b5e2652fc8755eb5e59b57db5a305dedab9d0b2393eef9f5376f9e36cd68`.
Yalnız onaylı 12 sunucu dosyası değişti; istemci dosyaları aynı kaldı.

- Yeni yedek ayrı PostgreSQL'e restore edildi: **60 profil, 28 tablonun bütün
  içerikleri eşit**. Şema, PG/Redis/Caddy, bağlar ve diğer ortam ayarları korundu.
- Operasyon 20,14 saniye sürdü. Canlı HTTPS sağlıklı; runtime 2.4.0/protokol 2,
  yeniden başlatma sayacı 0. Yedi içerik dönemi yayımlandı.
- Canlı başlangıç/haftalık/takım takvimi 24 Kasım 00.00 UTC; bitiş 22 Aralık 00.00 UTC.
  Sezon şu anda **scheduled / active=false**. S2 kapısı ayrıca kapalı.
- Canlı imajın kendi ortamında veri değiştirmeyen hesaplarla açılıştan hemen
  önce/sonra, dört tam hafta ve kapanış/sonraki hafta sınırları doğrulandı.
- Son değişiklikten sonra bildirim/kalıcılık/plan araçlarının 62 testi de PASS.
  Hosted CI çalıştırılmadı; doğrulamalar yereldir.
- Yayımlanmış S1 katalogları bilgisayarlar arası devam için
  `config/season-releases/S1-20261124/` altında versiyonlandı. Sonraki sunucu
  geçişi bunları taslak katalogla değiştiremez veya kullanılan sanatı boş stok sayamaz.

Operasyon: `/opt/gridshard/operations/s1-automatic-20261115-3b3cdb51f52c`.
Yedek: `/var/backups/gridshard-production/20261115-before-s1-3b3cdb51f52c`.
23 Kasım'da komut veya uygulama dağıtımı gerekmiyor. Yeni AAB üretilmedi.

2.4.0'ın takım ekranında yerleşik bazı yardım metinleri hâlâ eski hafta günü
adlarını içerir. Sunucunun güncel kuralı ve takvim duyurusu başlangıca göre
ilk üç kayıt günü, 4. gün eşleşme ve 5–7. gün maç olarak doğru çalışır. Sabit
yardım metinlerinin genel gün numaralarına geçirilmesi 2.5.0 UI kabulüne eklenir.
