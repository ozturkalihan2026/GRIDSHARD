# 2.4.0 — ilk sezon bot katılımı ve ödül planı

6 Kasım 2026 kullanıcı kararı. 240 bot bütün turnuva ve lider panolarına
katılır. Gerçek sıralama korunur; botlar ödül alamaz. Bütün ödül sıraları
botlara kalırsa bütün paket aynı içerikle ödül planının sonuna bir kez eklenir.

## Katılım ve oyun

- Bot kimlikleri değişmez. 240 benzersiz, tek kelimelik takma ad kullanılır;
  Uç ayrılmıştır. Oyuncu hesabı veya bot cüzdanı oluşturulmaz.
- Mevcut 24 aktif modülü kapsayan altılı desteler arena açılma koşullarına
  uyar. Gelecekteki modül manifesti oynanabilir kart olarak kullanılmaz.
- 12 takımda 20'şer bot bulunur; 30 kişilik takım sınırı aşılmaz. Haftalık
  bot etkinliği dönem/kimlik/gün üzerinden kararlı hesaplanır. Gerçek oyuncu
  sonuçları yerine yazılmaz; API okumak XP, kupa veya para üretmez.
- Arena botlarına karşı insanın kazandığı kupa, XP ve kredi normal sonuç
  muhasebesine girer; kayıtlıysa pozitif kupa haftalık turnuvaya da yazılır.
  Takım turnuvasında mevcut kupasız/XP'siz, galibiyet başına bir katkı puanı
  kuralı korunur. Ödül için gerçek üyeye en az dört katkı puanı gerekir.
- Yalnız yayımlanmış ve başlangıcı eşleşen S1 profili istisnayı açar. Owner
  sıralama dışında kalır. S2+ aynı bot katılımını kendiliğinden devralmaz.
- Takım turnuvasının ayrı operatör başlangıcı korunur; ilk hedef en erken
  **7 Aralık 03.00 TR**. S1 içinde başlayan ilk takım dönemi sezon devrinde
  silinmez, dört haftasını tamamlar. Başlangıç tarihi kesin yayın sözü değildir.
  Aday kataloğa 7 Aralık dönemi için mevcut Kutup Işığı takım setinin üç öğesi
  ayrıldı. Böylece aday yedi dönem, altı oyuncu + üç takım öğesi içerir.
  Canlı katalog hâlâ yayımlanmadı; canlı başlangıç ayarı değiştirilmedi.

## Sıra ve kalıcı erteleme

| Kapanış örneği | Sonuç |
| --- | --- |
| Bot 1., insan 2., bot 3. | İnsan yalnız 2.lik kasasını alır; 1.liğe yükseltilmez. Bütün paket ertelenmez. |
| Haftalık ilk üç bot | Üç kasa, miktarları ve varsa kozmetikleriyle birlikte kuyruğun sonuna eklenir. |
| Sezon ilk on bot | On kasalık paket kuyruğun sonuna eklenir. |
| Takım ilk üç yapay takım | Üç sıralama paketinin tanımı sona eklenir; bot üyelere kasa gönderilmez. |
| Eksik katılım / eksik ödül sırası | Tamamen bot kazanımı sayılmaz; sessiz ödül veya eksik paket üretilmez. |

Sıralama ve dönem ödülleri kapanışta hash ile sabitlenir. Sonraki kayıt,
isim değişikliği, hesap silinmesi veya yeniden başlatma kazananı değiştirmez.
İlk haftanın kapanışı sırasında tüm insan kazananlar birlikte kaydedilir.
Hiç insan kaydolmamış olsa da sonraki oturum kapanmış bot dönemlerini işler.

`team_document.tournaments._competition_rewards_v1` hem kapanışları hem
`deferred` listesini saklar. JSON geliştirme deposu ve PostgreSQL aynı sözleşmeyi
kullanır. Kaynak+dönem anahtarı idempotenttir; artan `sequence` kuyruğun sonunu
belirler. PostgreSQL'de bu kayıtlar ve oyuncu teslimleri aynı işlemde korunur.
Geçmiş ödül tanımı tekrar projekte edilmez; yayımlanmış orijinal paket korunur.

Planın sonuna eklenmiş paket `status=planned`,
`placement=after_reviewed_calendar`, `scheduled_period_id=null` olarak görünür.
Bu **kalıcı plan kaydıdır**, takvime gizlice eklenen canlı etkinlik değildir.
Sonraki içerik planlamasında mevcut paket kuyruğu sırasıyla, yayımlanmış
takvimin sonundan sonraki uygun döneme tahsis edilir. Yeni içerik gibi ikinci
kez rezerve edilmez; aynı kozmetik iki dönemde dağıtılamaz. İncelenmiş tarih
ve içerik olmadan otomatik sezon/turnuva açılmaz. API'deki
`deferred_reward_plan` bu hazır paketleri içerikleriyle gösterir.

## Arayüz ve kabul

Haftalık ve takım turnuvası içinde **ÖDÜLLER** sekmesi sıraların yetkili dönem
kasalarını gösterir; dokunmak mevcut sandık önizlemesini açar. Hak üretmez ve
Topla işlemi göndermez. Mevcut kasa sanatı, turkuaz yüzeyler ve sarı geri tuşu
korunur. Arkadaşlar'ın beş sekmesinde alt çizgi kaldırılır; seçim/odak korunur.

Kanıt: `server/tests/test_s1_bot_competition.py`,
`server/tests/test_s1_release_acceptance.py`,
`tools/tests/test_first_season_preparation.py`, `e2e/release221-social.spec.js`.
Yerel PostgreSQL'de 25 test geçti; kapanış/erteleme rollback + reload ve gerçek
S1 yedek/restore dâhil. Fiziksel Android paket kurulumu ve kullanıcı dokunma/
ses kabulü ayrı kaydedilir. Profil draft ve `android_acceptance=false` kalır.

Yayın öncesi: yeni adların gerçek hesap adlarıyla çakışma raporu, güncel
sunucu yedeği/restore, eski istemci, CI ve fiziksel cihaz kabulü tamamlanır.
Mevcut oyuncu adları veya ilerlemesi bot adlandırması için değiştirilmez.
