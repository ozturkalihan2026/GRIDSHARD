# Gelecek sezonlar — içerik üretim ve hazırlık sırası

11 Kasım 2026 kullanıcı yönlendirmesi. Durum: üretim planı ve tasarım brief'leri hazır; yeni sanat, modül, müzik veya ödül dağıtımı hazır sayılmaz.

Ana yayın tarihleri `release_calendar_v1.json` içindedir; bu dosya tarih değiştirmez. 2.4.0 son düzeltmeleri ve 19 Kasım kabulü önceliklidir. Erken hazırlık, 2.5.0 çalışma kodunun 2.4.0 paketine eklenmesi anlamına gelmez.

## Şimdi yapılacak somut işler

| Sıra | Hazırlık penceresi / kontrol | Teslim | Tamamlanma ölçütü |
| --- | --- | --- | --- |
| 1 | 11–13 Kasım | S2'nin altı öğesinin geometrisi, kaynak/ID listesi; Yankı Rölesi sözleşmesi; dört mağaza öğesi | Bu dosya ve bağlantılı brief'ler; henüz çizim/kod kabulü yok |
| 2 | 14–18 Kasım, 2.4 düzeltmeleri izin verdikçe | Manyetik Köprü çerçeve + zemin için oyun dışında ilk iki görsel örnek | Onaylı profil/dock/sandık referanslarıyla yan yana; yeni geometrinin küçük boyda okunması |
| 3 | 19–23 Kasım | Öncelik 2.4 kabulü; yalnız zaman kalırsa S2 örneklerinin düzeltmesi | Yeni çalışma kodu 2.4 kapsamına taşınmaz; eksik kabul varsa içerik hazırlığı bekler |
| 4 | 24–30 Kasım, mevcut 2.5 başlangıcı | Genel dönem ödül profili, renderer taslağı, ekonomi ve Yankı prototipi | S1'e özgü kaynak haftası istisnasını S2'ye kopyalamadan çalışan tasarım; 30 Kasım kapasite kontrolü |
| 5 | 1–7 Aralık | S2 kalan dört öğe, mağaza dört öğe; Yankı sanat/ses/karşı oyun; müzik A/B | Sanat incelemeleri ayrı 6 ve 4 öğelik gruplarda; S1 gözlem payı korunur |
| 6 | 8–14 Aralık | Ödül/sahiplik entegrasyonu, sabit kaynak haftaları ve denge | 14 Aralık kapsam kapanışı; kabul görmeyen öğe otomatik açılmaz |
| 7 | 17–21 Aralık | 2.5 cihaz kabulü ve hedef yayın | Oyun/sanat/ses/ödül kapılarının tümü; sezon ayrı tarihte açılır |

Pencereler teslim hedefidir; tamamlanmış çalışma veya eşzamanlı tam ekip kapasitesi iddiası değildir. İlk somut sanat işi **Manyetik Köprü'nün iki öğelik örneği**; ardından Bakır Örgü ve Kırık Halka gelir. İlk oyun mekaniği işi **Yankı Rölesi prototipi**dir. Çizim ve kod birbirinin onayı sayılmaz.

## Üç sezonluk içerik tablosu

| Sürüm / hedef yayın | Sezon / başlangıç (TR 03.00) | Yeni modül | Oyuncu ödül sanatı | Diğer ayrı içerik |
| --- | --- | --- | --- | --- |
| 2.5.0 / 21 Aralık 2026 | S2 / 28 Aralık | Yankı Rölesi | Manyetik Köprü, Bakır Örgü, Kırık Halka: 3 çerçeve + 3 zemin | 4 mağaza öğesi; seçim kasası; 1 menü + 1 savaş bestesi |
| 2.6.0 / 18 Ocak 2027 | S3 / 25 Ocak | Kor Fırlatıcı | Reaktör Kepengi, Prizma Yuvası, Türbin Dişlisi: 3 çerçeve + 3 zemin | Yedi özgün Devre Deneyi; Keşif Günlüğü; ilk başarı ödülü |
| 2.7.0 / 15 Şubat 2027 | S4 / 22 Şubat | Darbe Muhafızı | Seramik Siper, Kablo Kemeri, Kristal Kıskaç: 3 çerçeve + 3 zemin | PvE seferi; 1 menü + 2 savaş bestesi; aşağıdaki yeni takım seti |

Takım dönemleri sezonlardan bağımsızdır; 28 günlük 7 Aralık çapası korunur. Dönemin ödülü sezon sınırı geçince değişmez.

## Stok açığı nasıl kapanacak?

[Son denetim](season-1-stock-audit.md) iki farklı ihtiyacı ayırır:

- Her hafta kozmetik verilen tam profilde S1 sonrası iki çevrim için **24 yeni oyuncu öğesi** gerekir. Serbest takım öğeleri oyuncu çerçevesi/zemini yerine geçemez.
- Onaylı sürüm kapsamı S2 ve S3 için **altışar**, toplam **12 yeni oyuncu öğesi**dir. Bu kapsam, üç açık kaynak haftası + bir kozmetik haftası tasarımını gerektirir. Kaynak haftalarının S2/S3 bütçesi ve genel çalışma adaptörü henüz hazır değildir; S1 istisnası kendiliğinden genişlemez.
- İlk seçenek mevcut 6 öğe/sezon kapsamını korumaktır. Bütün haftalara kozmetik istenirse S2/S3'e toplam 12 ek öğe ve üretim eforu eklenir; takvim/kapsam ayrıca değerlendirilir. Eksik kozmetik sessizce kaynak ödülüne çevrilmez.

Aşağıdaki **önerilen tahsisler**, onaylı sanat ve incelenmiş dönem profiliyle kaydedilene kadar rezervasyon değildir:

| Kaynak | S2 | S3 | S4 |
| --- | --- | --- | --- |
| Sezon yolu / 40. kademe | Manyetik Köprü çifti | Reaktör Kepengi çifti | Seramik Siper çifti |
| Sezon sıralaması / 1. sıra | Bakır Örgü çifti | Prizma Yuvası çifti | Kablo Kemeri çifti |
| Son haftalık turnuva / 1. sıra | 2027-W03: Kırık Halka çifti | 2027-W07: Türbin Dişlisi çifti | 2027-W11: Kristal Kıskaç çifti |
| Açık kaynak ödüllü haftalar | 2026-W53, 2027-W01, W02 | 2027-W04, W05, W06 | 2027-W08, W09, W10 |
| Ayrı takım dönemi | 4 Ocak: ilk kez verilecek mevcut Güneş Ocağı takım seti | 1 Şubat: ilk kez verilecek mevcut Derin Akım takım seti | 1 Mart: yeni **Siper İttifakı** arması, çerçevesi, isim rengi |

Mevcut iki takım seti daha önce ayrılmamış/dağıtılmamış olma şartıyla adaydır; yayın öncesi gerçek katalogda yeniden doğrulanır. S4 için üç yeni takım öğesi, oyuncu gruplarının toplam 18 öğesine dahil değildir. Siper İttifakı üç geniş kenetli kalkan levhasıyla özgün arma ve köşeleri birbirine geçen mat zırh çerçevesi kullanır; yeniden renklendirme sayılmaz. Üretim/cihaz kabulü ayrı yapılır.

Mağazanın dört öğesi ayrı `shop` havuzundadır; sezon stoğuna veya turnuva ödülüne eklenmez. Botlara denk gelen dondurulmuş ödül paketleri planın sonuna ayrı kayıt olarak taşınır; bunlar yeni sanat stoğu veya yeni sezon ödülü diye sayılmaz.

## Altyapı işi ve dosya bağlantıları

- [ ] OPS-01: `server/data/season_reward_profiles_v1.json` ve `server/app/season_reward_profiles.py` tasarlanacak. Her sezon/kaynak/dönemde `cosmetic_set` veya `resource_only`, kesin kaynak miktarları, modül kimliği, tahsis, içerik hash'i ve yayın kabulü açık olmalı. Bunlar önerilen dosyalardır; henüz mevcut değildir.
- [ ] Bu genel profil, S1'in tarihsel sabit profilini değiştirmeden coverage, önizleme, dondurulmuş hak ve teslimle aynı içeriği kullanacak. S2 modülü ve sanat eksikse yeni sezon kapalı kalacak.
- [ ] COS-05/06/07: yeni çerçeve/zemin geometrileri mevcut üç desenin içine isim değişikliğiyle sıkıştırılmayacak. `cosmetic_releases.py`, üretici ve renderer sonlu, incelenen yeni şablonlarla genişletilecek; JSON'dan keyfi CSS/HTML çalıştırılmayacak.
- [ ] COS-03 / SHOP-01: mağaza havuzu, sahiplik/kuşanma ve satın alma adaptörü birlikte doğrulanacak; yalnız katalog satırı eklenmeyecek.
- [ ] CARD-01/02: aşağıdaki modül brief'leri motor, karşı oyun, katalog, ücretsiz edinim, VFX/ses ve dengeye dönüşecek.
- [ ] AUDIO-03/04: [mevcut müzik üretim brief'i](prerelease-announcements-and-music.md). Yeni eserler ayrı menü/savaş ayarlarına uyar; %5/%50 varsayılanları ve kayıtlı tercihler kendiliğinden değişmez.

## Kozmetiğin ötesindeki ödül teslimleri

| İçerik | Oyuncuya değeri | Üretim/kabul koşulu |
| --- | --- | --- |
| 2.5 Mühendis seçim kasası | Mevcut uygun seçeneklerden ihtiyacını seçme | Seçenekler açılışta sabit; tek teslim; ekonomi bütçesi |
| Yeni modülün ücretsiz kazanım yolu | Yeni deste denemesi ve oyun çeşitliliği | Sezon sonu kart silinmez; ücretli özel güç yok; edinim yolu önceden görünür |
| 2.6 Devre Deneyi + Keşif Günlüğü | Öğrenme, ustalık ve ilk çözüm kaydı | Yedi farklı problem; ilk/tekrar ödülü ayrımı; eski soruyu yeniden adlandırma yok |
| 2.7 sefer sonu paket | Yolculuğu bitirme ve seçim/bonus hedefi | Bölüm başarısı sunucuda doğrulanır; yeniden girişte kayıp/çift teslim yok |

Yeni para birimi, kayıtsız kalıcı güç veya bütçesiz hediye bu planla açılmaz. Ödül miktarları ECON-01 ve ilgili sürümün kabulündedir.

## Üretim dosyaları ve kapanış listesi

- [S2 sanat kabul listesi](art-2.5.0-acceptance.md)
- [Mağaza sanat manifesti](shop-art-manifest.md)
- [Yankı Rölesi mekanik brief'i](echo-relay-release.md)
- [Kor Fırlatıcı mekanik brief'i](ember-launcher-release.md)
- [Üç grubun ortak sanat manifesti](two-cycle-art-manifest.md)

Her öğe: brief → örnek → kaynak dosya → renderer/codec → oyun içi kilitli önizleme → TR/EN 320/393 → cihaz kabulü → havuz/dönem tahsisi → yayın. İsim listesi üretim değildir. İlk iki örnek kabul edilmeden kalan koleksiyonlar tamamlanmış sayılmaz.
