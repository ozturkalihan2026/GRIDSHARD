# 2.4.0 / SEASON-00 — ilk sezon profili ve kazanılmış haklar

**6 Kasım güncellemesi:** [240 bot, gerçek sıra ve kalıcı ödül planı](release-240-bot-competition.md).
S1 adayında 240 tek kelimelik bot adı, 12×20 takım ve 30 Kasım takım dönemi
için üç mevcut Kutup Işığı takım öğesi eklendi. Aday artık yedi dönem,
altı oyuncu + üç takım öğesidir. Ayrı takım başlangıcı ve yayın kapıları korunur.
Telefondaki ayrı S1 TEST APK’sı kuruldu; gerçek açılış, 40 kademe, üç test kasası
ve 24 açık modül doğrulandı. Kullanıcının dokunma/ses kabulü henüz bekleniyor;
`android_acceptance=false` ve profil draft kalır.

**5 Kasım güncellemesi:** [S1 yazılım kabul matrisi](release-240-s1-acceptance.md).
80 hak, 22 yarışma kasası, gerçek PostgreSQL kapanış/rollback ve dump/restore,
üç tarayıcıda gerçek makbuz akışları geçti. Profilde bütçe/tekil tahsis/
kapanış-restore/eski istemci kontrolleri true; fiziksel Android kullanıcı
isteğiyle ertelendiği için profil draft ve cihaz kontrolü false kalır.
Aşağıdaki ilk dilim sayıları tarihsel kayıttır; yazılım kabulü dalda hazırdır.

4 Kasım 2026. **Kod dilimi hazır, yayın kapısı açık.** Kaynak profil `draft`;
canlı tarih/ayar, kozmetik kataloğunun yayınları, sürüm etiketi ve AAB değiştirilmedi.
[2.4.0 briefi](releases/2.4.0.md) · [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#season-00) ·
[Ekonomi baz çizgisi](economy-baseline.md) · [XP ve emirler](season-1-rewards-and-xp.md).

## S1 içeriği ve tekil tahsis

`server/data/first_season_launch_v1.json` yalnız ilk açılış sezonunu tanımlar.
Taslak hedefi 30 Kasım 2026 00.00 UTC / 03.00 TR, 28 gün; tarihin dosyada
yazması sezonu açmaz. Mevcut 24 modül korunur. S2+ için yeni, kodda mevcut,
yayın kontrolleri tamamlanmış modül ve yayınlanmış dönem ödülleri gerekir.

| Kaynak / dönem | İçerik |
| --- | --- |
| Ücretsiz sezon yolu, 40. kademe | Mevcut kaynak bütçesi + Kutup Işığı çerçeve/profil çubuğu |
| Sezon lider panosu, 1. sıra | Mevcut kaynak/prestij + Güneş Ocağı çerçeve/profil çubuğu |
| 30 Kasım–7 Aralık / W49 | İlk üçe Lazer parçası 36/24/18; mevcut Kredi/Akı |
| 7–14 Aralık / W50 | İlk üçe Kalkan parçası 36/24/18; mevcut Kredi/Akı |
| 14–21 Aralık / W51 | İlk üçe Darbe Topu parçası 36/24/18; mevcut Kredi/Akı |
| 21–28 Aralık / W52 | 1. sıraya Derin Akım çerçeve/profil çubuğu; mevcut Kredi/Akı |

İlk üç hafta `resource_only` türüdür; boş kozmetik veya sıfırlanmış adetle
eksik stok saklanmaz. Üç haftanın toplam ek modül bütçesi **234 sıradan parça**.
Kredi 1200/760/420, Akı 90/55/30 olarak korunur. Üç oyuncu seti birer kaynağa
ayrılır; başka hafta veya dönemde tekrar kullanılamaz. Dokuz takım öğesinden
üç Kutup Işığı öğesi 30 Kasım takım dönemine ayrıca ayrılır; kalan altı öğe
kilitli stokta kalır. Takım başlangıcı ayrı operatör ayarıdır.

`cosmetic_releases.py` açık kaynak ödülü türünü, pozitif miktarları, gerçek modül
kimliğini ve yayın sonrası içerik hash'ini doğrular. `liveops_content.py` kapasite
raporunda dört haftayı korur; üç kaynak haftası ile bir kozmetik haftasını ayrı
gösterir. Gerçek haftalık önizleme artık dönem kimliğiyle çözülür ve teslimle aynıdır.

## Sabit kademe hakkı ve kapanış

`season_entitlements.py`, erişilmiş her ücretsiz/premium kademenin gerçek
miktarını, modül/çekirdek hedefini, kozmetiğini, revision/hash'ini ve özel premium
kökenini kaydeder. Profilin sonraki arenaya çıkması veya şablon tutarının değişmesi
kazanılmış paketi yeniden seçmez. Önizleme ve talep bu sabit kaydı kullanır.

Sezon devrinde önce kazanılmış emir XP'si kapanır. Sonra erişilmiş/alınmamış
kademe hakları aynı içerikle mesaj kutusuna taşınır; yalnız bundan sonra eski
XP ve sezon sayaçları sıfırlanır. Alınmış kademeler tekrar gönderilmez. Yeni
sezondan XP, para veya satın alma hakkı türetilmez. Hata halinde kapanışın
bütün profil değişiklikleri geri alınır. Kalıcı özel arşiv `reward_state`,
gönderilen hak kimlikleri ve makbuzları korur; özel satın alma kökeni API'ye çıkmaz.

S1 profili yayımlandığında kademe sandığı mevcut sabit ödülün sunumudur;
ayrıca rastgele mağaza sandığı verilmez. **Önceki baz çizgisinin bir sınırı düzeltildi:**
eski servis katmanı doğrudan kaynak verse de eski API etiketli kademelere ek
rastgele sandık veriyordu. Eski dönemlerdeki bu haklar ayrı sayıyla korunur;
S1'in sabit bütçesine eklenmez. Eski isteği yeni sezonda tekrarlamak ilk makbuzun
dönemini kullanır; yeni sezon adına ikinci stok oluşturmaz.

Premium kapanış paketleri eski satın almanın kökenini taşır. İade edilmiş,
açılmamış paket gizlenir/açılamaz; doğrulanmış geri yükleme aynı paketi tekrar
erişilebilir yapar. Açılmış paketin gerçek kaynak farkı eski sezonun iade
defterine yazılır. Eski kozmetik sahipliği ve normal profil ekonomisi silinmez.

## Sonraki sezon hazır değilse

Yayınlanmış ilk sezon bittiğinde S2 içeriği yoksa durum `waiting_for_content`
olur. Eski sezon arşivlenir ve haklar mesaj kutusunda kalır. Yeni sezon XP'si,
premium sezon satışı ve turnuva kaydı açılmaz; eski paketler toplanıp açılabilir.
Takvim veya manifest satırı, oynanabilir yeni bir modülü tek başına oluşturamaz.

Haftalık ilk kapanış bütün katılımcıların sırasını özel kapanış tanığıyla
sabitler, ilk üçün paketlerini birlikte kuyruğa alır. Birincinin yeni haftaya
kaydolması veya kazanan hesapların silinmesi kalan oyuncuyu yeni birinciliğe
taşımaz. Önceden kısmen dağıtılmış eski haftalar otomatik yeniden sıralanmaz;
eksik tarihsel kanıt varsa ayrı inceleme gerekir.

## Çalıştırma ve kabul

`python tools/prepare_first_season.py --check` taslağı, yedi dönem rezervasyonunu,
altı tekil oyuncu + üç takım öğesini ve 234 parça bütçesini bellekte doğrular.
`--preview` incelemeye uygun aday kataloğu JSON olarak gösterir. Bu komutlar
dosya yazmaz, yayınlamaz veya sezon açmaz. Yayınlanmış profil de aynı komutla
doğrulanabilir. CI bu kontrolü çalıştırır; profil kaynak paketine dahildir.

Yerel kanıtlar `server/tests/test_season_entitlements.py`,
`server/tests/test_cosmetic_releases.py`, `server/tests/test_liveops_content.py`,
`tools/tests/test_first_season_preparation.py` içindedir: miktar/hedef sabitleme,
gerçek talep API'siyle ek rastgele ödül verilmemesi, eski sandık hakkı,
eşzamanlı dönüş, başarısız kapanışın geri alınması, kayıt yükleme,
premium iade/restore, sonraki sezonun kapalı kalması ve haftalık sıra tanığı.
Gerçek PostgreSQL read-model kapanış rollback/reload senaryosu da eklendi;
izole PostgreSQL olmadan atlanır.

Son kaynak doğrulaması: **2052 Python testi geçti / 47 dış servis testi atlandı**;
**770 istemci testi**, **3 Chrome akışı**, 474 dosyalık import denetimi ve web
derlemesi geçti. Tarayıcıdaki makbuz fixture'ları gerçek ekonomik teslim kanıtı değildir;
gerçek sunucu talep/kapanış muhasebesini Python entegrasyon testleri doğrular.

SEASON-00 **in_progress** kalır. Gerçek PostgreSQL/Redis kabulü, değiştirilmemiş
2.3/2.2.1 paketleriyle kabul ve Android güncelleme/Topla/ses testi açık.
Profildeki beş yayın kontrolü bu nedenle `false` durumundadır. Sarı gezinme
tuşları ve saldırı/çekirdek sesi ayrı açık görevlerdir.
