# BASE-03 — İlk deneyim ve geri dönen oyuncu akışı

16 Kasım 2026 · tasarım teslimi · hedef hazırlık 2.5.0

Bu belge ekran akışını ve uygulama sınırlarını tanımlar. Önerilen yeni kartlar,
durum kaydı ve ölçüm olayları henüz oyuna bağlanmadı. Gerçek sürüm 2.4.0,
yayımlanmış S1 katalogları ve hesap hakları değişmez.

Bağlı sözleşmeler: [ölçüm](measurement-baseline.md),
[2.5 üretim planı](release-250-design-and-production.md),
[ortak sanat yönü](../SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md).

## 1. Mevcut davranış ve tasarım kararı

| Alan | Kaynakta bugün | Bu planın kararı |
| --- | --- | --- |
| Menü turu | `app.js` içindeki tam tur kendiliğinden başlamaz; Ayarlar'daki `settings-tutorial-replay` ile açılır. | İsteğe bağlı kalır; savaşa girmek için mağaza/takım/etkinlik turu bitirmek gerekmez. |
| İlk savaş | `onboardingWantsDirectedBattle` ilk maç için yönlendirme ister; sunucu `game/tutorial.py` kısa ipuçları verir. | İlk strateji kararı gerçek savaşta alınır. Savaş okumak için durmaz; kart kullanımı ipucu sırasına kilitlenmez. |
| Atlamak | Sunucu `tutorial_ack` yönlendirmeyi kaldırır, maçı bitirmez. Mevcut savaş ipucundaki GEÇ bu komutu yollar. Tam menü turunda aynı atlama düğmesi yoktur. | Savaş ipucunu geçmek ile isteğe bağlı menü turunu başlatmak ayrı davranışlar olarak anlatılır. |
| Eğitim tekrarı | Ayarlar'dan yeniden başlatılan veteran eğitimi `tutorial_training`; Başlangıç Devresi kullanır, kupa/ödül vermez. | Normal ilk arena ile tekrar eğitimi karıştırılmaz; eğitim başlangıcında ödülsüz olduğu açıkça görünür. |
| Deste | Başlangıç: laser, pulse_cannon, shield, armor, repair, amplifier. Kaydetme geçerli 6/6 ve sunucu kabulü ister. | Başlangıç altılısıyla oynamak yeterlidir. Anlamlı başka seçenek yokken deste değişimi hedefi verilmez. |
| Hesap | Misafir veya yapılandırılmış sağlayıcıyla devam; hesap bağlantısı penceresi ve kayıtlı tercih vardır. | Hesap bağlamak öğrenme, analitik izni veya ödül alma koşulu yapılmaz. Hesap değişiminde önce yeni profil doğrulanır. |
| Duyuru | `release-announcement.js` hesap/notice bazlı yerel kayıt + sunucu onayı kullanır; TAMAM sonrası sistem mesajında kalır. | Tek seferlik mevcut duyuru korunur; ikinci bir sürüm özeti popup'ı eklenmez. |
| Günlük meta | `loadDailyMetaState` sunucunun `requires_roll` durumunda ayrı pencere açabilir. | Günlük meta, günlük giriş ödülü ve emirler ayrı kavramlardır. Meta çarkı ödül sandığı gibi sunulmaz. |
| Eğitim durumu | `gridshard.tutorial.v1` / `gridshard.onboarding.step.v1` cihazda; yeniden gösterme bunları temizler. | Cihazdaki eksik anahtar yeni hesap kanıtı değildir. Sürüm güncellemesi veya cihaz değişimi gerçek hesap ilerlemesini sıfırlamaz. |

Kaynak dayanakları: `client/src/app.js`, `client/src/tutorial/onboarding.js`,
`client/src/release-announcement.js`, `client/index.html`,
`server/app/game/tutorial.py`, `server/app/match_accounting.py`.
Eski açıklama yorumlarındaki zorunlu menü turu tanımı yerine çağrı akışı ve
güncel testler esas alınmıştır.

## 2. Girişte karar sırası

1. Bağlantı, sürüm uyumluluğu ve gerçek hesap yüklenir. Yerel başlangıç
   istatistiğindeki sıfır maçtan yeni oyuncu sonucu çıkarılmaz. Yükleme hatası
   hesap açma/ilerleme sıfırlama önerisine çevrilmez; tekrar deneme sunulur.
2. Hesap doğrulandıktan sonra devam eden maç varsa mevcut yeniden bağlanma
   akışı önceliklidir. O sırada duyuru, günlük hedef veya menü turu açılmaz.
3. Gerekli hesap tercihi ve sunucunun zorunlu oyun önkoşulları mevcut
   sözleşmeleriyle çözülür. Yeni plan giriş/kayıt ekranını yeniden yazmaz.
4. Ana ekran kullanılabilir olduğunda sunucunun onaysız duyurusu tek
   pencerede gösterilebilir. Başka açık pencerenin üzerine yığılmaz.
5. Ana ekranda SAVAŞ ana eylemdir; altında en fazla bir bağlamsal hedef
   kartı olur. Ek ödül/mağaza/eğitim popup zinciri başlatılmaz.

Hedef davranışta günlük meta ve duyuru sunumu ortak uygunluk denetiminden
geçmelidir: aynı anda tek modal, savaşta/arka planda sunum yok. Kapatma sonrası
yeniden zorunlu olmayan popup açmak yerine kalan konu ana ekrandan erişilir.
Günlük meta savaş için gerçek bir sunucu önkoşuluysa atlanabilir gibi
gösterilmez; yalnız sunum ertelenerek kural aşılmaz. Bu ortak sıraya bağlama
UI-01 tasarımı ve sonraki uygulama kabulüdür, mevcutta hazır sayılmaz.

### Oyuncu durumları

| Durum | Gösterilecek içerik | Karar dayanağı |
| --- | --- | --- |
| Yeni olduğu doğrulanan hesap, henüz maç yok | Kısa savaş hedefi, altılı deste, isteğe bağlı yardım | Doğrulanmış hesap + yetkili başlangıç/ilerleme durumu. |
| Eski hesap, sıfır maç veya öğrenme yarım | Savaş ve isteğe bağlı kaldığı yardım | Sıfır maç veya eksik localStorage tek başına yeni hesap demek değildir. |
| Aktif maçı olan hesap | Maça dön / bağlantıyı yeniden dene | Sunucudaki maç durumu; istemci yeni savaş açmaz. |
| Önceden oynamış hesap | Korunan deste/ilerleme, varsa duyuru ve tek güncel hedef | Doğrulanmış hesap verisi; süreye dayalı yeni segment henüz mevcut değil. |
| Yeni cihaz veya kimlik bağlantısı sonrası | Hesabın kendi deste, hak ve dönem durumu | Cihaz geçmişi değil gerçek bağlı hesap. Belirsiz durumda genel ana ekran. |

Yeni/eski/geç izin kohortu yalnız ölçüm sözleşmesidir; ürün akışı analitik
iznine bağlı olamaz. Onay vermeyen oyuncu aynı yardım ve hedefleri görür.
Yeni akış durumu gerektiğinde mevcut hesap kalıcılığına sürümlü ve sınırlı
alanlarla eklenir; henüz yeni bir API/SQL hazırmış gibi varsayılmaz. Eski
kayıtta alan yoksa güvenli genel ana ekran kullanılır; hesap yeniden yaratılmaz.

## 3. Yeni oyuncu: ilk karar → ilk maç → sonraki hedef

| Adım | Ekran ve kısa içerik | Ana eylem / çıkış |
| --- | --- | --- |
| A | Ana ekran: mevcut Başlangıç Devresi, ilk savaş için tek cümle. Mağazaya gitme veya kart yükseltme zorunluluğu yok. | SAVAŞ; ikincil Yardım. Menü turu Ayarlar'dan erişilebilir. |
| B | Eşleştirme: mevcut bağlanma durumu, iptal ve anlaşılır hata. | İptal / Tekrar Dene; ipucu katmanı hata düğmesini kapatmaz. |
| C | Canlı arena: Lazer/savunma/Akım/çekirdek için kısa, engellemeyen ipuçları. | Oyuncu gerçek kartını kullanır; GEÇ yardımı kapatır, maçı sürdürür. |
| D | Savaş sonucu: gerçek kesinleşmiş sonuç ve ayrı teslim verisi. | DEVAM; bağlantı kaybında sonucu yeniden oku. Kutlama zafer kanıtı değildir. |
| E | Sonraki adım: uygun alternatif açıldıysa desteni incele; yoksa bir sonraki Devre Yolu kilidini gör. | Desteyi İncele veya Devre Yolunu Gör; her iki durumda doğrudan yeniden savaşmak mümkün. |
| F | Ana ekran: yalnız bugün yapılabilir tek hedef ve gerçek ilerleme. | İlgili mevcut sayfaya git; yeni bir ödül vaadi oluşturma. |

### İlk gerçek strateji kararı

İlk yerleştirmeden sonra oyuncunun elindeki kaynak ve açılmış kartlarla
**saldırıyı büyütme veya savunmayla alan tutma** tercihi yapabilmesi amaçlanır.
Yardım, mevcut Lazer ve Kalkan görselleriyle bu iki rolü açıklar; birini
zorunlu kılmaz. Sunucunun geçerli bulduğu kart/konum/kaynak komutu gerçek
karardır; öneri kartına dokunmak veya hayali bir tercih anketi değildir.

Yeni duraklatma, ücretsiz kaynak, garanti galibiyet veya eğitim kotası
eklenmez. Kaynak yetmiyorsa eylem kullanılabilir hale gelene kadar olağan
savaş sürer. Oyuncu başka geçerli kart kullanırsa hata sayılmaz. Yardım
görmeden veya GEÇ diyerek yapılan geçerli tercih de oynanabilirliği korur.
ANALYT-01 yalnız uygun onayla sınırlı rol/geçiş sinyali yazabilir; deste
listesi, hücre koordinatı veya onaysız savaş geçmişi kopyalanmaz.

### İlk deste değişimi

- Hedef yalnız oyuncunun kilidi açık, sahiplik/kullanım koşulu geçerli ve
  mevcut altılıya gerçekten alternatif bir modülü varsa sunulur. Mevcut
  başlangıç altılısının tümü destedeyken sahte değiştirme görevi yoktur.
- Kartlar → mevcut desteyi incele → isteğe bağlı tek değişiklik → geçerli
  6/6 kontrolü → sunucu kaydı → başarı sonrası Savaşa Dön.
- Aynı altılıyı yeniden kaydetmek, isim veya sıra değiştirmek anlamlı ilk
  deste değişimi sayılmaz. Sırf metriği tamamlamak için oyuncu yönlendirilmez.
- Kilitli kart için Devre Yolu/kazanım kaynağı gösterilir; önizleme sahiplik
  veya savaşta kullanım hakkı vermez. İlk6/diğer kilitler kuralı korunur.
- Kayıt hatası, çevrimdışı veya sürüm uyuşmazlığında son sunucu destesi
  geçerlidir. Yerel düzenleme başarı diye gösterilmez; iptal ile geri dönülür.
- Eğitim tekrarının geçici Başlangıç Devresi oyuncunun kayıtlı normal
  destesinin üstüne yazılmaz. Tekrar eğitim normal ilerleme üretmez.

## 4. Bugünün hedefi: tek kart, gerçek durum

Ana ekran kartının önerilen önceliği aşağıdadır. İlk uygun satır seçilir;
SAVAŞ düğmesinin yeri, alt dock ve normal ekran erişimi korunur.

| Öncelik | Koşul | Kart / hedef sayfa |
| --- | --- | --- |
| 1 | Kazanılmış, henüz seçilmemiş Mühendis Kasası hakkı | Seçimin Hazır → mevcut Ödüller seçim akışı; otomatik seçim yapılmaz. |
| 2 | Mevcut görevde teslim alınabilir hak | Ödülün Hazır → Devre Emirleri; sadece gerçek claim durumunda. |
| 3 | İlk maç henüz oynanmamış, oynama uygun | İlk Savaşın → SAVAŞ; eğitim tekrarı yeni ilk maç sayılmaz. |
| 4 | Açık ve yapılabilir günlük emir | Tek uygun emrin adı, ilerleme/toplam → Devre Emirleri. Önce en yakın tamamlanma, eşitlikte sabit görev sırası; sırf kazanca göre sıralama yok. |
| 5 | Mühendis Kasası kazanımı gerçekten yürürlükte | Haftanın Kasası → sunucunun mevcut ilerlemesi ve kuralı. |
| 6 | Aktif sezonda erişilebilir ücretsiz yol hedefi | Sezon Hedefin → ücretsiz sezon yolu; gerçek dönem ve eşik. |
| 7 | Diğer bütün durumlar | Genel desteyi inceleme veya savaş yardım bağlantısı; sahte günlük görev/geri sayım yok. |

Hak/ilerleme verisi yüklenmediyse geçici boş durum gösterilir; sıfır veya
hak kaybı varsayılmaz. Hesap değişiminde eski hedef hemen temizlenir;
gecikmiş eski hesap yanıtı yeni ekrana uygulanmaz. Hedefe gitmek ya da
okumak hakkı teslim etmez. Normal sandık ve mağaza bildirimleri var olan
sunucu uygunluğuyla çalışır; bu kart için yeni para/XP/hediye bütçesi açılmaz.

Mühendis Kasası ISO hafta başlangıcı Pazartesi UTC00.00/TR03.00'dır;
S1 turnuvalarının operatör başlangıcından sayılan haftalarıyla birleştirilmez.
Sezon kapalı veya sezon arasında günlük giriş/sezon yolu gibi kanalların
uygunluğu sunucudan gelir. İstemci takvimden kendi başına ödül açmaz.
2.5 ekonomi/kasa sürüm ve yürürlük kapıları bu planla erkene çekilmez.

## 5. Geri dönüş, duyuru ve isteğe bağlı öğrenme

Geri dönen oyuncu önce kendi adı, deste/çekirdek ve ilerlemesini görür.
Sunucunun yayımladığı yeni duyuru varsa mevcut TAMAM popup'ı kullanılır;
okunmuş duyuru tekrar otomatik açılmaz, Mesaj Kutusu → Sistem'de kalır.
Henüz yayımlanmamış paket veya kesinleşmemiş S2 tarihi olmuş gibi sunulmaz.

TAMAM çevrimdışıysa mevcut hesap/notice kapsamlı bekleyen onay yeniden
denenir. Diğer cihazda kalıcı davranış sunucu onayı tamamlandığında sağlanır;
yerel kaydı silmek veya uygulamayı yeniden kurmak hesap onayı yerine geçmez.
Hesap değişince önceki hesabın açık duyurusu ve bekleyen ekranı aktarılmaz.

Yeni ayrı hatırlatma popup'ı yerine ana ekrandaki hedef ve Ayarlar'daki
öğrenme bağlantısı kullanılır. İsteğe bağlı tekrar eğitim ödülsüz olduğu
belirtilerek başlatılır; normal maçta otomatik yeniden eğitim yoktur.
Yedi/otuz gün dönmedi diye borç, kayıp seri, sürpriz kaynak telafisi veya
bildirim izni mecburiyeti eklenmez. Gelişmiş dönüş özeti/bildirim tercihleri
RET-01; ödülsüz deste laboratuvarı PLAY-01 kapsamındadır.

## 6. Ortak görünüm ve erişilebilirlik

Koyu lacivert fiziksel yüzey, altın ana eylem, turkuaz vurgu ve boyalı gerçek
modül görselleri kullanılır. Yeni sanat yönü, neon panel veya farklı dock yok.
Hedef kartı kompakt ve aynı yüzey ailesindedir; kazanılmış hak ile kilitli
önizleme yalnız renkle ayrılmaz, metin/durum işareti de bulunur.

TR/EN metinler katalog anahtarıyla gelir; İngilizce uzama 320/393 px'de ana
eylemi örtmez. Etkileşim hedefi en az44 px; ortak yalnız ok geri düğmesi
erişilebilir ad taşır. Menü/sayfa odak geri dönüşü, Android geri/Esc, azaltılmış
hareket ve düşük grafik durumları UI-01'de tanımlanır. Savaş ipuçları savaş
görüşünü veya hata/iptal düğmesini kapatmaz; dokunma hedefi kayınca kilitlemez.

## 7. Uygulama sınırı ve kabul

| İş | Bu plandan alacağı teslim |
| --- | --- |
| BASE-03 | Kaynak denetimi, ilk karar/ilk deste/günün hedefi ve dönüş akışı. Tasarım dalda hazırdır; entegrasyon kabulü değildir. |
| UI-01 | Yukarıdaki akışların ortak ekran hiyerarşisi ve durum prototipi; popup önceliği, ana hedef kartı, yardım ve geri dönüş yerleşimi. |
| UI-02/03/04 | Kendi mağaza/ödül/sezon yüzeylerinin gerçek durumlarını ortak tasarıma bağlama. Yeni oyuncu kuralları ve dönem kapıları korunur. |
| ANALYT-01 | BASE-02 ile uyumlu onaylı/sınırlı/sıralı ölçüm; görünür yardım, gerçek strateji komutu ve gerçek deste kaydı ayrılır. |
| QA-01 | Yeni/eski/kimliği belirsiz hesap, hak ve dönem kapıları, TR/EN ve küçük ekran durumları için ortak kabul matrisi. |
| UI-06 / RET-01 / PLAY-01 | Gelişmiş maç nedeni özeti, dönüş kişiselleştirmesi ve deste laboratuvarı. Bu belgeyle 2.5 kapsamına otomatik taşınmaz. |

Uygulama kabulünde en az şu senaryolar kanıtlanmalıdır:

- [ ] Yeni hesap ilk maçına mağaza/eğitim turu/analitik izni zorunlu olmadan girer; strateji kararı gerçek sunucu komutudur.
- [ ] İlk6 dışında kart yokken deste değişimi istenmez; kilitli kart savaşa eklenmez.
- [ ] Alternatif açıkken iptal, aynı deste ve başarısız kayıt ilerleme sayılmaz; başarılı sunucu kaydı sonrasında tekrar savaşa dönülür.
- [ ] İlk normal arena sonucu ile ödülsüz tekrar eğitim ayrılır; tekrar eğitim eski deste/kupa/XP/hakları değiştirmez.
- [ ] Eski sıfır maçlı hesap/yeni cihaz/eksik localStorage yeni hesap gibi sıfırlanmaz.
- [ ] Aktif maça yeniden bağlanma, eşleştirme hatası/iptal ve arka plana alma popup altında kilitlenmez.
- [ ] Birden fazla duyuru/meta/hedef gelince tek modal ve doğru öncelik; TAMAM/tekrar deneme aynı hesapta tutarlı.
- [ ] Hesap değişimi ve geç yanıt yanlış deste/hedef/hak göstermiyor; offline hak yokmuş gibi davranılmıyor.
- [ ] Sezon öncesi/aktif/kapanış/ara ve kasa yürürlük kapıları gerçek sunucu durumuyla uyumlu; var olmayan ödül/tarih sözü yok.
- [ ] TR/EN×320/393, uzun metin, odak/geri,44 px, hareket azaltma ve düşük grafik kabulü ayrı kanıtlanmış.

## 8. Bu tasarım tesliminin doğrulaması

- `node --test client/tests/onboarding-flow.test.js client/tests/onboarding-lifecycle.test.js`: **20 PASS**.
- `python -m pytest server/tests/test_tutorial_battle.py server/tests/test_starter_pool_tutorial_markup.py -q -p no:cacheprovider`: **10 PASS**.
- `e2e/onboarding-visibility.spec.js` kaynakta incelendi; bu tur tarayıcı veya
  fiziksel cihaz çalıştırılmadı. Yukarıdaki açık kutular entegrasyon kanıtı değildir.
- Eski `e2e/release-announcement.spec.js` bazı senaryolarda13/30 Kasım sabit
  metinleri taşır; yeni takvim kabulünde güncel sürümlü fixture/veri kullanılmalı.
  Bu tarihli eski beklentiler güncel canlı S1 takvimine kanıt sayılmaz.
