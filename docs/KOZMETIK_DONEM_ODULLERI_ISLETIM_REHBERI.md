# Kozmetik ve dönem ödülleri işletim rehberi

Durum: sonraki minor sürüm hazırlığı, `codex/liveops-foundations`. Bu dal
2.2.1 AAB/sunucu paketine dahil değildir. İlk 15 öğe görünür katalog seçenekleri
olarak hazırlanır; yeni hesap veya takımda hiçbiri açılmaz. Mevcut haklar korunur.

Yayın hedefleri: **2.3.0 kilitli katalog ve önizleme**, **2.4.0 yeterli özgün
stokla dönem ödülü/başlangıç açılışı**, **2.5.0 ayrı kozmetik mağazası ve seçim
kasası**. 2.3.0 için aşağıdaki `reserve`/`publish` örnekleri çalıştırılmaz;
tahsis/yayın listesi boş ve başlangıç ayarları kapalı kalır. İki dönemlik yeni
kart/kozmetik hazırlığı 2.4.0'ın kapısıdır, önizleme paketini bekletmez.

## Kaynak ve üretilen dosyalar

`server/data/cosmetic_releases_v1.json` tek kaynaktır. Öğeler `items`, dönem
tahsisleri `releases`, yenilik zorunluluğunun başlangıcı `require_fresh_from`
alanlarındadır. Başlangıçta tahsisler ve zorunluluk sınırları boştur.

`python tools/prepare_liveops_rewards.py sync` arayüzdeki katalog, CSS motifleri
ve TR/EN adları aynı kaynaktan üretir. `validate` bu dosyaların eşleşmesini
denetler. Bu komutlar yerel kaynak dosyalarıyla çalışır; üretim veritabanına
bağlanmaz, sezon açmaz veya kimseye ödül göndermez.

Üç tema: Kutup Işığı, Güneş Ocağı ve Derin Akım. Her birinde oyuncu çerçevesi,
profil zemini, takım arması, takım çerçevesi ve takım isim rengi vardır.
Çerçeve/zeminler mevcut CSS ve vektör dilindedir. Yeni boyalı portre üretimi
bu ilk paket için gerekli değildir.

## Stok ve üretim ihtiyacı

```powershell
python tools/prepare_liveops_rewards.py coverage --cycles 2
```

Bir 28 günlük dönem için sezon yolu + sezon sıralaması + dört haftalık turnuva
altı oyuncu paketi; takım turnuvası bir takım paketi tüketir. İlk bütçe oyuncu
paketinde iki, takım paketinde üç kozmetiktir. Komut her kategori için hazır,
ihtiyaç ve yeni üretilip incelenecek miktarı verir. Yetersiz stok yeterliymiş
gibi gösterilmez. Kaynak para/kart ödülleri bu kozmetik stok hesabından ayrıdır.

Yeni sanat üretildikçe yeni kimlik, TR/EN ad ve yeni `design_id` ile katalog
genişletilir. Yeni bir çerçeve/zemin motifi üretiliyorsa çizim şeması ve CSS
üreticisi de genişletilir. Aynı görseli yeniden adlandırmak veya bir motifin
yalnız rengini değiştirmek yeni çerçeve/zemin sayılmaz. İsim rengi kategorisinde
ürün rengin kendisidir. Onaylanmamış tasarım ödül stoğuna ayrılamaz.

## Dönem taslağı ve yayın

Aşağıdakiler örnek komutlardır; repodaki katalogda bu örnek tahsisler oluşturulmuş
değildir. Gerçek dönem kimliği mevcut yarışma takvimiyle eşleştirilmelidir.

```powershell
python tools/prepare_liveops_rewards.py reserve --source season_road --period-id gridshard_2027_01_04 --release-id season-2027-01-road
python tools/prepare_liveops_rewards.py reserve --source season_leaderboard --period-id gridshard_2027_01_04 --release-id season-2027-01-ranking
python tools/prepare_liveops_rewards.py reserve --source weekly_tournament --period-id 2027-W01 --release-id weekly-2027-01
python tools/prepare_liveops_rewards.py reserve --source team_tournament --period-id 2027-01-04 --release-id team-2027-01
```

Bir öğe taslağa ayrıldığı anda başka dönemde yeniden kullanılamaz. Aynı dönem
içinde birden fazla kazanana verilebilir. Araç oyuncu paketini sezon yolunda
40. kademeye, sıralama/turnuvalarda birinci sıraya koyan başlangıç taslağı üretir.
`placements` alanında sıra/kademe dağılımı editoryal olarak düzenlenebilir.
Örneğin zemini ikinci sıraya veya farklı bir sezon kademesine ayırmak mümkündür.

```powershell
python tools/prepare_liveops_rewards.py publish --release-id weekly-2027-01
python tools/prepare_liveops_rewards.py validate
```

Yalnız henüz başlamamış bir dönemin taslağı yayımlanabilir. Yayımlanan paket
öğe ve dağılım özetini saklar. Geçmiş dönemin ödülleri sonradan değiştirilmez.
Kaynak bazında ilk yayınlanan dönemden itibaren yeni içerik zorunluluğu açılır:
sonraki dönemin paketi eksikse işlem hata verir, eski kozmetiğe veya havuzun
başına dönmez. Bu yüzden önce en az iki dönemlik içerik planı hazırlanmalı;
yarışma açılışından önce `coverage` ve gerçek dönem eşleşmeleri doğrulanmalıdır.

Yerel `publish`, kaynağın düzenlenmesidir. İncelenmiş değişiklikler normal
minor sürüm, CI ve dağıtım akışından geçince sunucuda etkin olur. Mevcut
operatör sezon/turnuva başlangıç ayarları değişmez.

## Oyundaki gerçek bağlantılar

- Sezon yolu önizlemesi ve sezon kademe talebi aynı dönem çözümleyicisini kullanır.
- Sezon sıralaması, haftalık ve takım turnuvası önizlemeleri dönem ödülünü gösterir.
- Yarışma kapanışında mesaj kutusuna yazılan sandık ödülün sabit kopyasını taşır.
- Takım ödülü, üyeler ayrı toplasa da aynı kalıcı dönem hakkıyla bir kez uygulanır.
- Dönemli bir takım kozmetiği zaten açılmışsa rastgele başka kozmetik verilmez.
- Takım haklarının tekrar koruması 50 kayıt sonrası unutulmaz.
- Sezon kademe/istek makbuzları, sahiplik listeleri ve mevcut veri kaydı kullanılır; oyuncu bakiyeleri veya seviyeleri sıfırlanmaz.
- Kalıcı sıralama kupaları/başarım kimlikleri mevcut sözleşmelerinde kalır; yeni koleksiyon kozmetikleri eski tekrarlanan avatar/çerçeve/emoji ödüllerinin yerini alır.

## Doğrulama ve yayın kapısı

`server/tests/test_cosmetic_releases.py`: kilitli başlangıç, kuşanma reddi,
taslağın ödül vermemesi, dönemler arasında yeni tasarım, stok tükenmesi,
geçmiş dönemi değiştirme reddi, görsel kopya reddi, sabit ödül makbuzu,
sezon önizleme/teslim eşitliği ve takım tekrar koruması.

`e2e/liveops-cosmetics.spec.js`: telefon boyutlarında kilitli oyuncu/takım
önizlemeleri ve seçim reddi. Bu testteki takım görünümü izole sunum verisidir;
gerçek ödül hakkı sunucu testlerinde doğrulanır.

Yayın öncesi yeni bir minor sürüm seçilmeli, onun sistem mesajı eklenmeli ve
ilgili dönemlerin yeni içerikleri yeterli olmalıdır. 2.2.1 sürüm numarasıyla
bu özellikler ikinci bir yama paketi gibi yayımlanmaz.

Kaynak paketi ayrıca SQL migration dosyalarının Git index'iyle bayt eşitliğini
kontrol eder. Windows CRLF dönüşümü dahil fark varsa paketleme durur. Sunucu
geçişinde mevcut veritabanındaki migration özetleri yeni imajla API durdurulmadan
önce karşılaştırılmalıdır; uygulanmış SQL dosyaları veya geçmiş DB özetleri
uydurularak değiştirilmez.
