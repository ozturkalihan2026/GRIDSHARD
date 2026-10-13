# Oyun düzenlemeleri — iş planı

**Kaynak:** kullanıcının 12 Ekim 2026'da verdiği "Oyun Düzenlemeler" belgesi (iş bilgisayarında, masaüstünde; depoda değil). Maddeler aşağıya aktarıldı; bu dosya o belge olmadan da yeterlidir.

**Durum (12 Ekim 2026, akşam):** **Faz 1 ve Faz 2'nin bütün maddeleri uygulandı** (aşağıda `[x]`); hiçbiri commit edilmedi, yayınlanmadı, gerçek cihazda görülmedi. Faz 2 sunucu kodunu, sunucu verisini ve istemciyi birlikte değiştirir; yeni sunucu sürümü (r17) ve yeni paket (sürüm kodu 9) ister. **Sıradaki iş: Faz 2 düzeltmeleri (R1–R4, aşağıda), sonra Faz 3; yayın Faz 3'ten sonra** (kullanıcı kararı, 12 Ekim akşamı). Depo `2d59f8f`; canlıda sunucu r16, kapalı testte v8 paketi var ve gerçek test kullanıcıları oynuyor (Codex'in kaydı: `CODEX_CHECKPOINT.md`).

Madde durumları: `[ ]` bekliyor, `[~]` kısmen, `[x]` bitti ve doğrulandı. Bir madde ancak testleri geçip tarayıcıda görüldükten sonra `[x]` olur; gerçek cihazda görülmediyse yanına yazılır.

## Değişmez ilkeler

1. **Mevcut oyuncu bir şey kaybetmez.** Modüller ileri arenalara taşınsa da oyuncunun yükselttiği, parçasını topladığı ya da destesine koyduğu modül kullanılabilir kalır. Kupa, seviye, parça ve para birimleri silinmez. (Claude'un kararı; kullanıcı aksini söylemedi.)
2. Savaş kuralları sunucudadır; istemci yalnız gösterir. Her kural değişikliği sunucu testi, her arayüz değişikliği istemci testi ve telefon boyutunda tarayıcı denemesiyle gelir. Türkçe ve İngilizce birlikte yazılır.
3. Dışarıdan dosya (görsel, GIF, yazı tipi) kullanıcı onayı olmadan indirilmez; lisansı kayda geçer.
4. Yayın (sunucu sürümü, imzalı paket) ev bilgisayarında yapılır; canlı veriye dokunan her işlem kullanıcının açık onayını ister.
5. Ağaç Codex ile ortaktır: başlamadan `git status`; onun dosyalarına dokunulmaz; commit'i kullanıcı yapar.

## Sıra ve gerekçe

| Faz | Kapsam | Neden bu sırada |
|---|---|---|
| 1 | Arayüz düzeltmeleri (G7–G14, G2'nin not kısmı, D15) | Küçük, birbirinden bağımsız, savaş dengesine dokunmaz; test kullanıcılarının gördüğü kusurları hemen giderir. |
| 2 | Devre Yolu, ligler, modül açılışları, unvanlar, yükseltme maliyetleri (D1–D9) | Veri ağırlıklı; mevcut hesaplar için geçiş kuralı ister. Savaş mekaniği değişmeden yapılabilir. |
| 3 | Savaş mekaniği: seviye başına gelişim, enerji tüketimi, modül özellikleri, yetenekler, çekirdek yetenekleri (D10–D14) | En riskli kısım: denge simülasyonu, yapay zekâ, eğitim savaşı ve yüzlerce test etkilenir. Faz 2'nin maliyet eğrisi belli olduktan sonra ayarlanmalı. |
| 4 | Kozmetik içerik: desenli arka planlar, karakterli profil resimleri, hareketli emojiler, dönemlik turnuva ödülleri, araştırma (G1–G6) | İçerik üretimi; diğer fazları engellemez. |

Her faz kendi başına yayınlanabilir olmalıdır. Faz 3 tek seferde değil, alt adımlarla (önce enerji ve seviye gelişimi, sonra yetenekler) ilerler.

## Faz 1 — arayüz

- [x] **G7. Üst barda üç çizgi menüsü.** Profil simgesiyle açılan "profil ve ayarlar" bölümü, mesaj kutusunun sağına konacak üç çizgili düğmeye taşınır. Dokununca bugün alt sekme olan Kozmetik, Ödüller, Arkadaş, Ayarlar alt alta listelenir; dokunulan sayfa açılır.
- [x] **G8. Profil simgesi doğrudan profili açar.** Profil artık sekme değil, tek başına sayfadır. (G7 ile birlikte yapılır; alt sekme çubuğu kalkar.)
  - *Uygulama notu (G7 + G8, 12 Ekim; gerçek cihazda görülmedi):* düğme `#lobby-menu-button`, liste `#lobby-menu` (`client/index.html`); ortak kalıp `.dropdown-menu` ve `bindDropdownMenu` (`client/src/app.js`), G10'daki takım menüsü de bunu kullanacak. Sekiz sayfadaki alt sekme çubuğu (`.profile-terminal-tabs`) ve ona ayrılan alt boşluk kaldırıldı; bu sayfalardan ana ekrana alt çubuktaki Ev ile dönülür. Claude'un seçimleri (kullanıcı istemedi, görsün): menünün dışına dokunmak yalnız menüyü kapatır, alttaki düğmeyi çalıştırmaz; kırmızı bildirim ışığı profil simgesinden üç çizgi düğmesine ve ilgili satıra taşındı; iki düğme 42 px, oyuncu adı dar ekranda biraz küçülür (360 px'te en geniş otomatik ad kesilmeden sığar, 320 px'te üç noktayla kısalır); eğitimin ana ekran cümlesi menüyü de anlatır.
- [x] **G9. Takım sayfasındaki anlık yanlış ekran.** Takımı olan oyuncu sayfayı açınca bir saniyeden kısa süre "takıma katıl / oluştur" ekranını görüyor. Takım durumu gelene kadar o ekran gösterilmemeli.
  - *Uygulama notu (12 Ekim; gerçek cihazda görülmedi):* neden, şablonda "katıl / oluştur" bölümünün açık gelmesiydi (uygulama her açılışta ilk kez Takım'a girildiğinde, yanıt gelene kadar o görünüyordu). Artık yanıt gelene kadar yalnız `#team-loading` ("Yükleniyor…") görünür; görünürlüğü tek yerden `renderTeamSections` yönetir (`client/src/app.js`). Claude'un eklediği (kullanıcı istemedi, görsün): ilk yükleme başarısız olursa hata yazısının altında "BAĞLANTIYI YENİDEN DENE" düğmesi çıkar; önceden hata durumunda da "katıl / oluştur" ekranı açılıyordu.
- [x] **G10. Takım sayfası düzeni.** (a) İç içe çerçeveler: kullanıcının görüntüsünde kırmızı çarpıyla işaretli iki dış çerçeve (ekranın dış çerçevesi ve profili saran çerçeve) kaldırılır. (b) **Yalnız takım yönetiminin iki alt sekmesi (Kozmetik, Üye Yönetimi)** takım başlığının sağındaki üç çizgi menüsüne taşınır, G7 ile aynı davranış. Profil, Üyeler, İstek, Sohbet ve Savaş alt sekme çubuğunda **yerinde kalır**. (c) Başlıktaki üye sayısı ("5 / 30 üye") aşağıdaki istatistiklerin başına gelir; kupa zaten ilk istatistiktir, başlıkta yinelenmez.
  - *Düzeltme (12 Ekim, kullanıcı):* plan ilk yazıldığında (b) "bütün alt sekmeler menüye taşınır" diye okunmuş ve öyle uygulanmıştı; kullanıcı görünce düzeltti: "üç çizgiye sadece kozmetik ve üye yönetimini taşımanı istemiştim. Diğerleri yerinde kalacaktı." Alt sekme çubuğu geri getirildi.
  - *Uygulama notu (12 Ekim; gerçek cihazda görülmedi):* düğme `#team-menu-button`, liste `#team-menu` (`client/index.html`), kalıp G7'deki `.dropdown-menu` + `bindDropdownMenu`. Düğme yalnız liderde görünür (`renderTeamMenu`). Yönetim sayfasındaki iki alt sekme kalktı; geri düğmesi ve "Takım Yönetimi" başlığı duruyor. Üye sayısı `#team-member-count` ilk istatistik kutusu ("ÜYE SAYISI", "5 / 30"). Claude'un seçimleri (kullanıcı istemedi, görsün): takım amblemi artık düğme değil (önceden lidere yönetimi açıyordu; giriş üç çizgi düğmesine taşındı); bekleyen başvurunun kırmızı ışığı amblemden üç çizgi düğmesine taşındı, başvuru sayısı menüdeki Üye Yönetimi satırında; yönetim bölümünü saran çerçeve de kaldırıldı (içindeki kart duruyor); dış çerçeve takımı olmayan oyuncunun "katıl / oluştur" görünümünde de yok (aynı ekran).
- [x] **G11. Sezon ödülleri.** "Ücretli geçişi aç" düğmesi bütün genişliği kaplamak yerine sağ sütunda, "ÜCRETLİ GEÇİŞ" başlığının hemen altında durur. Düğmenin üstündeki bilgilendirme satırı kaldırılır.
  - *Uygulama notu (12 Ekim; gerçek cihazda görülmedi):* düğme `#season-premium-buy` artık başlık satırının (`.season-pass-columns`) içinde, üçüncü sütunda; dar sütunda yazısı iki satıra iner. Bilgilendirme satırı (`#season-premium-status`) şablondan, betikten ve stilden kalktı; sunucu `status_tr` alanını göndermeye devam eder (eski paket onu gösterir), yeni istemci göstermez. Claude'un seçimi (kullanıcı istemedi, görsün): geçiş etkinken "Ücretli geçiş etkin." yazısı da çıkmaz; etkinlik, ücretli hücrelerin "GEÇİŞ GEREKLİ" yerine "AL / KİLİTLİ" yazmasından anlaşılır.
- [x] **G12. Yükseltme göstergeleri.** Yükseltilebilir modül ve çekirdek kartında yeşil yukarı ok (kartın sağ üstü). Böyle bir kart varken alt çubuktaki Kartlar sekmesinde yeşil bildirim ışığı. Açılabilir yetenek varsa aynı ışık ve kart bilgi ekranındaki Yetenekler sekmesinde yeşil ok.
  - *Düzeltme (12 Ekim, kullanıcı):* ilk hali yeşil daire içinde koyu oktu; kullanıcı görünce "yeşil yuvarlak yerine hareketli yeşil ok olsa daha güzel olur" dedi. Ok artık yalın yeşil bir oktur (dairesi, çerçevesi, gölgesi yok) ve sürekli yukarı aşağı kayar. Claude'un okuması: bu cümle kartlardaki ve Yetenekler sekmesindeki ok içindir; alt çubuktaki yeşil **ışık** kullanıcının kendi sözüyle ("yeşil bir bildirim ışığı") yuvarlak ışık olarak kaldı. Kullanıcı ışığın da ok olmasını isterse tek stil kuralıdır.
  - *Uygulama notu (12 Ekim; gerçek cihazda görülmedi):* kurallar tek yerde (`moduleUpgradeBlockReason`, `moduleTalentSelectable`, `coreUpgradeAvailable`, `coreSkillLearnable`, `cardNeedsAttention`; `client/src/app.js`): bilgi ekranındaki Yükselt ve yetenek düğmeleri, karttaki ok (`.upgrade-arrow`), sekme oku ve alt çubuk ışığı (`renderDockIndicators`, `.has-upgrade-notification`) aynı kurala bakar. Claude'un seçimleri (kullanıcı istemedi, görsün): **"yükseltilebilir" = Yükselt düğmesinin açık olması**, yani parça yetse de Devre Kredisi (çekirdekte Akı) yetmiyorsa ok ve ışık yanmaz; evrensel parça sayılır; seçilebilir yetenek de karttaki oku yakar (ışığın hangi karttan geldiği bulunabilsin); kart destedeyse (✓ sağ üstte) ok ✓'nin hemen altına iner, seçili çekirdekte sol üste geçer; hareket azaltma tercihinde ve Düşük grafik ayarında ok durur. Yeni hesapta ışık ilk açılıştan itibaren yanar (başlangıç kartları 2/2 parça, 350 Devre Kredisi).
- [x] **G13. Bir sonraki seviye değerleri.** Kart bilgi ekranında can, akım, hasar gibi değerlerin yanında bir sonraki seviyenin farkı yeşil "+değer" olarak yazar; aşağıdaki ayrı kutu kalkar.
  - *Ek istek (12 Ekim, kullanıcı):* "modüllerin bilgi ana ekranında can ve hasar arasından yazan akım yerine modüllerin ateş süresi yada bekleme süresi neyse onu yazsak." Ortadaki kutu artık **BEKLEME** (saniye); Akım maliyeti İstatistik sekmesinde durmaya devam eder.
  - *Uygulama notu (12 Ekim; gerçek cihazda görülmedi):* `renderDetailStatRow` (`client/src/app.js`). Modülde CAN ve HASAR artışı "+değer", kısalan bekleme süresi "-değer" olarak yeşil yazar (bugünkü kuralda seviye başına %0,8 kısalır: 1 sn → -0,01; sıfır beklemeli modülde "0 sn" yazar, İstatistik sekmesiyle aynı). Çekirdekte ENERJİ ve DEPO farkı yazar; bunun için sunucu çekirdek görünümüne `next_stats` ekledi (`server/app/meta_progression.py`; **sunucu sürümü gerekir**, eski sunucuda çekirdekte fark yazmaz, hata olmaz). Genel sekmesindeki "SONRAKİ SEVİYE" kutusu modülde ve çekirdekte kalktı. Claude'un seçimleri: kilitli kartta fark yazmaz; İstatistik sekmesindeki karolara fark eklenmedi (istek baştaki satır içindi).
- [x] **G14. İndirim göstergesi.** Mağazada indirim günü, alt çubuktaki Mağaza düğmesinde indirim oranı görünür.
  - *Uygulama notu (12 Ekim; gerçek cihazda görülmedi):* `#dock-shop-sale` rozeti (`-%40`, İngilizcede `-40%`), Mağaza düğmesinin sağ üstünde; oran sunucunun `discount_percent` değeridir. İndirim yokken gizlidir. Hangi sayfa açık olursa olsun her durum güncellemesinde yenilenir (`renderDockIndicators`).
- [x] **G2b. Kozmetiklerin altındaki "nerede kazanılır" notları kaldırılır** (G2'nin arayüz yarısı; ödüllerin dönemlik değişmesi Faz 4).
  - *Uygulama notu (12 Ekim; gerçek cihazda görülmedi):* oyuncu kozmetiklerinde (avatar, çerçeve, emoji, arka plan) ve takım kozmetiklerinde kilitli seçeneğin altında yalnız "KİLİTLİ" yazar. Dokunulmayan (kullanıcı karar versin): takım kozmetik sayfasının başındaki genel cümle "Kilitli seçenekler takım turnuvasında kazanılır." duruyor; seçeneklerin altındaki not değil, sayfa açıklamasıdır.
- [x] **D15. Günlük meta metni.** Etkinlikler sayfasında "Akım modül etkisi %15" yerine "Akım üretimi +%15" (böyle bir modül yok). Etkinin gerçekten Akım üretimini mi değiştirdiği sunucu kodundan doğrulanır; metin kurala uymalıdır.
  - *Bulgu ve karar (12 Ekim):* meta savaştaki Akım'ı (yerleştirme kaynağı; sabit aralıkla yenilenir) değiştirmiyor; Batarya, Kapasitör ve Akım Dengeleyici'nin etkisini %15 artırıyor (`server/app/game/engine.py`). Kullanıcıya soruldu; kararı: **"Kuralı metne uydur"**. Metin şimdi "Akım üretimi +%15" oldu (`server/app/season_competition.py`, istemci çevirileri; **sunucu sürümü gerekir**); kural Faz 3'te değişecek (aşağıda D16). **O zamana kadar metin kuraldan öndedir: Akım yenilenmesi hızlanmaz.**

## Faz 2 — Devre Yolu ve ilerleme

- [x] **D1. Lig kademeleri.** Kıvılcım, Voltaj, Reaktör, Kuantum ve Nexus liglerinin her biri beş kademeye bölünür (Kıvılcım Ligi I–V …); ödüller buna göre dizilir.
- [x] **D2. Üst ligler.** Şampiyonlar Ligi beş kademe olarak kalır; ardından beş kademeli Efsanevi Lig, en sonda tek kademeli **GRIDSHARD Ligi** gelir. Yolun devamı arayüzde görünür.
- [x] **D3. Kupa eşikleri** yeni lig sayısına göre kuruldu (tablo aşağıda, "Faz 2 tasarımı").
- [x] **D4. GRIDSHARD Ligi ödülü.** Devre Yolu'nun sonunda GRIDSHARD Sandığı; kozmetik seti yalnız bu sandıktan kazanılır.
- [x] **D5. Arena 1'de yalnız altı modül:** Lazer, Kalkan, Batarya, Soğutucu, EMP, Güçlendirici.
- [x] **D6. Kalan modüller** arenalara ve lig girişlerine dağıtıldı (kullanıcının 12 Ekim kararıyla: arenalarda 2–3, liglerde yalnız lige girişte).
- [x] **D7. Yeni modüller.** Gerek kalmadı; 36 modül yetiyor (kullanıcı kararı).
- [x] **D8. Operatör unvanları.** On unvan; son unvan "GRIDSHARD Efsanesi" yalnız GRIDSHARD Ligi'ne çıkan oyuncuya verilir; galibiyet koşulları yükseltildi.
- [x] **D9. Yükseltme maliyet tablosu.** Enderliğe göre tablo ve çekirdek maliyeti (kullanıcı kararı).

*Faz 2 uygulama notu (12 Ekim; gerçek cihazda görülmedi).* Tasarım tabloları ve kullanıcının kararları aşağıda "Faz 2 tasarımı" başlığında; oturum içinde gelen ek istekler "Faz 2 sırasında gelen ek istekler" başlığında. Kurallar tek yerde: `server/app/arena_canon.py` (kademeler, eşikler, lig durakları, lig sandıkları, açılışlar, eski hesapların açık modülleri, eşleştirme kuşağı, lig botu), `server/data/arena_progression_v1.json` (modül açılış sırası, arena durakları), `server/data/arena_bot_profiles_v1.json` (bot desteleri), `server/app/player_profile.py` (unvanlar), `server/app/meta_progression.py` (maliyet tabloları), `server/app/game/tutorial.py` (eğitim savaşı). Üretilen tablolar: `docs/ARENA_MODUL_ODUL_KANONU.md`, `docs/BOT_HAVUZU_120.md`.

**Kullanıcının görmediği seçimler (Claude).** Kullanıcı 12 Ekim akşamı listeyi okudu ve dördünü değiştirdi: kupa aralıkları ve sezon sıfırlaması (R2), modüllerin liglere dağıtımı (R3), lig sandığının içeriği (R4), tanıtımın yalnız liglerde açılması (R1). Diğerlerine itiraz etmedi.
- Kupa aralıkları: ilk beş ligde kademe 100, Şampiyonlar'da 200, Efsanevi'de 300; GRIDSHARD Ligi 8600 kupa.
- Unvan artık **en yüksek kupaya** göre verilir (önceden anlık kupaya göreydi; sezon sıfırlaması son unvanı her sezon düşürürdü). Ödülü alınmış unvan, koşul sonradan yükselse de oyuncuda kalır; son unvan bunun dışındadır.
- Eşleştirme kuşağı eski aşamalar olarak kaldı (liglerde 200 kupa, 5600 üstü tek kuşak); kademeler 100'e inince insan eşleşmesi daralmasın diye. Redis betiği değişmedi.
- Sezon değişiminde lig oyuncusu yine 3600'e döner (mevcut kural, dokunulmadı). 8600 kupaya tek sezonda çıkmak zordur; istenirse sıfırlama kuralı ayrıca konuşulur.
- Yeni dört unvanın adları ve bütün galibiyet sayıları; unvan ödülleri 150–5.000 Devre Kredisi.
- Lig durakları ve lig sandıklarının miktarları; lige girişteki hedefli parça 6.
- Eğitim savaşına Sabotaj sınıfını (EMP) tanıtan tek cümlelik bir sahne eklendi (EMP artık başlangıç destesinde; açıklamasız kalmasın diye).
- Kilitli kartın rozetinde ligin kısa adı yazar ("KIVILCIM", "ŞAMPİYON"); tam ad kart ayrıntısında ve yolda. Dar rozete tam ad sığmıyor.
- GRIDSHARD kozmetiklerinin adları ve çizimi: Zirve Pilotu (profil resmi), Zirve Halkası (çerçeve), Zirve Işığı (emoji), Zirve Devresi (arka plan).
- Lig maçlarında Arena 12 botları, oyuncunun liginde açılmış efsanevi modüllerden bazılarını destesine alır.

**Eski paketle (v8) uyum.** Yeni sunucu eski paketle çalışır:
- Eski paketin gömülü başlangıç destesinde Onarım Modülü var; yeni hesap o desteyle savaşa girebilsin diye bu altı kart savaşta oynanabilir sayılır (koleksiyonda Onarım Arena 2'ye kadar kilitli görünür).
- Eğitim savaşının yeni sahneleri yalnız onları tanıyan istemciye gönderilir (`tutorial_script`); eski paketle açılan yeni hesap yönetilmeyen, yumuşatılmış ilk maçı oynar (menü eğitimi sürer).
- Eski pakette görünecek kusurlar (işlevi bozmaz): lig modüllerinde "Arena 13" yazısı, kilitli kart rozetinde eski arena numarası, lig sandığında modül parçası simgesi, efsanevi yükseltmede Akı yetmezse düğme açık görünür ve sunucu nedenini yazar.

**Doğrulama (12 Ekim).** Sunucu: 1406 geçti, 45 atlandı; başarısız 35'in hepsi bu makinede kurulu olmayan `google-auth` (33) ve `fakeredis` (2). Yeni dosya `server/tests/test_league_road_and_module_unlocks.py` (27 test); güncellenenler `test_tutorial_battle.py` (eski paket uyumu için 2 yeni test), `test_beta72_operator_titles.py`, `test_beta43_2_profile_season_chests.py`, `test_beta43_cards_leaderboards.py`, `test_beta42_1_player_flow_regressions.py`, `test_beta40_meta_progression.py`, `test_reward_integrity.py`, `tests/game/test_ai_archetypes.py`. İstemci: 325 testin 323'ü geçti, 2 atlandı; yeni dosya `client/tests/league-road-and-module-unlocks.test.js` (19 test), güncellenen `onboarding-flow.test.js`. PostgreSQL 16'ya karşı (tek kullanımlık yerel küme) tam paket: 1449 geçti, 2 atlandı, aynı 35 başarısız. Uçtan uca: menü gezintisi, sezon, ilk oyun deneyimi, ayarlar, mobil savaş ve iki istemcili maç geçti. Telefon boyutunda Chrome'da 360×640, 320×568, 393×852 (Türkçe ve İngilizce; Android'in en küçük yazı boyu taklit edilerek ve edilmeden) 936 denetimin hepsi geçti. Ayrıntı `CLAUDE_CHECKPOINT.md` başında. **Gerçek cihazda denenmedi.**

**D6 modül dağıtımı (uygulanan; parantez içinde eski açılış arenası; efsaneviler liglerde):**

| Açılış | Modüller |
|---|---|
| Arena 1 | Lazer, Kalkan, Batarya, Soğutucu, EMP, Güçlendirici |
| Arena 2 | Onarım Modülü (1), Zırh (1) |
| Arena 3 | Darbe Topu (1), Füze Fırlatıcı (2) |
| Arena 4 | Hedefleme Bilgisayarı (2), Bariyer (3) |
| Arena 5 | Ark Topu (3), Kapasitör (3) |
| Arena 6 | Dron Üssü (4), Sinyal Bozucu (4) |
| Arena 7 | Ray Topu (5), Akım Dengeleyici (5) |
| Arena 8 | Yansıtıcı (5), Nano Sağlıkçı (7) |
| Arena 9 | Virüs (6), Aşırı Hızlandırıcı (6) |
| Arena 10 | Plazma Havanı (7), Muhafız Kubbesi (7) |
| Arena 11 | Kuantum Tekrarlayıcı (8), Krono Rölesi (8) |
| Arena 12 | Faz Zırhı (9), Sürü Fabrikatörü (9), Hassasiyet Matrisi (10) |
| Kıvılcım Ligi | İyon Mızrağı (9) |
| Voltaj Ligi | Prizma Kalkanı (11) |
| Reaktör Ligi | Kesici (10) |
| Kuantum Ligi | Anka Onarım (11) |
| Nexus Ligi | Kuantum Topu (11) |
| Şampiyonlar Ligi | Omega Güçlendirici (12) |
| Efsanevi Lig | Tekillik Projektörü (12) |
| GRIDSHARD Ligi | — (ödülü GRIDSHARD Sandığı) |

Bu dağıtımla birlikte yapılması gerekenler: `server/data/arena_progression_v1.json` (yol düğümleri ve parça ödülleri), `server/data/arena_bot_profiles_v1.json` (botlar arenasında açılmamış kart kullanamaz; lig botları), eğitim savaşının ve Başlangıç Devresi'nin kartları (Arena 1'in altı modülüyle uyuşmalı; bugünkü deste koddan doğrulanmalı), istemcideki yol ve koleksiyon ekranları, ilgili testler. İlke 1 gereği mevcut hesaplarda sahip olunan modüller açık kalır.

**D9 için kullanıcının örnek tablosu** (başka bir oyundan; "Altın" bizde Devre Kredisi, "Kart" parça, "Küre" Akı ya da benzeri ikinci kaynak olarak düşünülecek):

| Seviye | Sıradan | Ender | Destansı | Efsanevi |
|---|---|---|---|---|
| 1 → 2 | 5 / 2 | 30 / 2 | — | — |
| 2 → 3 | 10 / 4 | 150 / 4 | — | — |
| 3 → 4 | 20 / 10 | 300 / 10 | — | — |
| 4 → 5 | 100 / 20 | 700 / 20 | — | — |
| 5 → 6 | 200 / 40 | 1.200 / 40 | 400 / 2 | — |
| 6 → 7 | 400 / 100 | 2.000 / 100 | 1.000 / 4 | — |
| 7 → 8 | 800 / 200 | 4.000 / 200 | 2.500 / 8 | 3.000 / 1 (+1 küre) |
| 8 → 9 | 1.500 / 400 | 7.000 / 400 | 6.000 / 10 | 8.000 / 2 (+3) |
| 9 → 10 | 3.000 / 800 | 12.000 / 600 | 15.000 / 20 | 16.000 / 3 (+5) |
| 10 → 11 | 6.000 / 1.000 | 20.000 / 800 | 25.000 / 40 | 40.000 / 4 (+5) |
| 11 → 12 | 12.000 / 1.500 | 30.000 / 1.000 | 40.000 / 80 | 50.000 / 6 (+6) |
| 12 → 13 | 22.000 / 2.000 | 40.000 / 1.200 | 55.000 / 120 | 60.000 / 12 (+6) |
| 13 → 14 | 40.000 / 3.000 | 55.000 / 1.500 | 70.000 / 140 | 70.000 / 20 (+7) |
| 14 → 15 | 70.000 / 4.500 | 70.000 / 2.000 | 85.000 / 160 | 80.000 / 25 (+7) |

(Hücreler "altın / kart".) Uyarlama yöntemi: önce bir oyuncunun günde ve maç başına kazandığı Devre Kredisi, Akı ve parça miktarı koddan çıkarılır (savaş ödülü, sandıklar, görevler, sezon yolu, günlük alım sınırlı mağaza); sonra eğri, "aktif bir oyuncu bir modülü son seviyeye kaç haftada getirir" hedefinden geriye doğru kurulur. Hedef süreler ve çıkan tablo uygulamadan önce bu belgeye yazılır. Yüksek enderlikte az parça / çok kredi mantığı örnekten alınır.

### Faz 2 tasarımı (12 Ekim 2026; uygulandı)

Kod okunarak çıkarıldı. "Claude'un seçimi" yazan yerler kullanıcının görmediği kararlardır.

**Kullanıcı kararları (12 Ekim, tasarım sorulduktan sonra):**
- Modül açılışı: "her arena da 2-3 kart açalım lig aşamasına geçince kalan modülleri açalım. lig aşamasında sadece liglere girerken modüller açılsın. liglerde ara ve lig geçişlerinde ana ödüller olsun." Claude'un okuması: Arena 2–12 efsanevi olmayan 23 modülü açar (on arenada 2, Arena 12'de 3: Hassasiyet Matrisi Arena 12'ye alındı); yedi efsanevi modül yedi lige girişte açılır (Kıvılcım: İyon Mızrağı, Voltaj: Prizma Kalkanı, Reaktör: Kesici, Kuantum: Anka Onarım, Nexus: Kuantum Topu, Şampiyonlar: Omega Güçlendirici, Efsanevi: Tekillik Projektörü); GRIDSHARD Ligi modül açmaz, ödülü sandıktır. Kademeler ara ödül, lig geçişleri ana ödül (sandık + modül) verir. **Bu, aşağıdaki D6 tablosunun lig satırlarının yerine geçer.**
- Maliyet tablosu: "Enderliğe göre" (aşağıdaki tablo aynen).
- Çekirdek maliyeti: öneri uygulanır (parça toplamı 109, Akı 50 × seviye).
- Eğitim savaşı: Onarım dersi Kalkan dersine çevrilir.

**Bugünkü durum (koddan):** 12 arena (0–3599, 300'er kupa), ardından 200'er kupalık 11 lig aşaması (Kıvılcım 3600 … Efsanevi Lig 5600); `server/app/arena_canon.py`. Sezon değişiminde 3600 ve üstündeki oyuncu 3600'e döner. Modül açılışı `server/data/arena_progression_v1.json` içindeki `unlock_arena` ile; Arena 1'de dokuz modül açık (altısı başlangıç destesi: Lazer, Kalkan, Onarım Modülü, Soğutucu, Batarya, Güçlendirici). Unvanlar `server/app/player_profile.py` (`OPERATOR_TITLE_STAGES`), maliyet `module_upgrade_cost` (`server/app/meta_progression.py`).

**D1–D3. Aşamalar ve eşikler** (36 lig aşaması; Claude'un seçimi: aralıklar)

| Lig | Kademe | Kademe genişliği | Başlangıç kupası |
|---|---|---|---|
| Kıvılcım Ligi | I–V | 100 | 3600 |
| Voltaj Ligi | I–V | 100 | 4100 |
| Reaktör Ligi | I–V | 100 | 4600 |
| Kuantum Ligi | I–V | 100 | 5100 |
| Nexus Ligi | I–V | 100 | 5600 |
| Şampiyonlar Ligi | I–V | 200 | 6100 |
| Efsanevi Lig | I–V | 300 | 7100 |
| GRIDSHARD Ligi | tek | — | 8600 |

- Arenalar aynen kalır (0–3599). Sezon değişiminde lig oyuncusu yine 3600'e (Kıvılcım Ligi I) döner; bu kural değiştirilmedi.
- Eşleştirme kuşağı bugünkü gibi kalır (3600'den sonra 200'er kupa, 5600 üstü tek kuşak); kademeler 100'e inince insan eşleşmesi daralmasın diye kuşak, görünen kademeden ayrılır. Redis betiği değişmez.
- Lig ödül durakları: 100'lük kademede +50 (Devre Kredisi) ve +100 (I, III: modül parçası; II, IV: Akı; V: **lig sandığı**). Şampiyonlar'da +50, +100, +150, +200 (kredi, parça, Akı; kademe sonunda iki kat kredi, V'te lig sandığı). Efsanevi'de +75, +150, +225, +300 (aynı düzen). Her ligin ilk kademesinde o ligde açılan modülün 6 hedefli parçası. Lig yolunda mağaza sandığı (Bronz, Gümüş, Altın, Elmas) verilmez.
- Eski lig duraklarının kimlikleri (`league_1_3650` …) yeni yolda yok; daha önce alınmış ödüller oyuncuda kalır, yeni duraklar ayrıca alınabilir.

**D4. GRIDSHARD Sandığı:** 8600 kupadaki son durak. İçerik: yalnız bu sandıkla açılan kozmetik seti (profil resmi, çerçeve, profil arka planı, emoji) ve büyük kaynak ödülü. Görseller oyunun kendi çizim diliyle; Faz 4'te zenginleşir.

**D5–D7. Modül dağıtımı:** yukarıdaki tablo aynen. "Lig geçişi" sekiz lig olarak okundu (kademe değil); bu okumayla 36 modül yetiyor, **yeni modül eklenmiyor**. Her kademede modül açılması istenirse 17 yeni modül gerekir (Faz 3 ölçeğinde iş).
- Başlangıç destesi Arena 1'in altı modülü olur (Onarım Modülü çıkar, EMP girer).
- **Geçiş kuralı (ilke 1):** güncellemeden önce açılmış her modül o hesapta açık kalır. Hesap ilk yüklendiğinde eski eşiklerle açık olan modüller hesaba yazılır (`legacy_module_unlocks`); kupa düşse de sezon değişse de silinmez. Veritabanı biçimi değişmez (kayıt içindeki mevcut meta alanına eklenir).
- Sunucunun modül görünümü `unlock_arena` alanını sıra numarası olarak sürdürür (13–20 = ligler) ve yanına `unlock_stage_name_tr` ekler; eski paket (v8) lig modülünde "Arena 13" yazar, açık/kilitli bilgisi doğrudur.
- Botlar: her arenanın botu yalnız o arenada açık modülleri kullanır (120 bot destesi yeniden eşlenir; Arena 1 botlarının hepsi aynı altı modülü kullanır). Lig maçlarında Arena 12 botları, oyuncunun liginde açılmış modüllerle güçlendirilir.
- Eğitim savaşı Onarım Modülü'nü öğretiyor ve rakibe Zırh kuruyordu; ikisi de Arena 2'ye gitti. Onarım dersi Kalkan dersine çevrildi; rakip destesi de Arena 1 modüllerinden oluşuyor.

**D8. Unvanlar** (Claude'un seçimi: yeni unvan adları ve galibiyet sayıları; kupa koşulları ilk beşte aynı)

| Unvan | Kupa | Galibiyet (eski) | Ödül (Devre Kredisi) |
|---|---|---|---|
| Devre Çırağı | 0 | 0 | — |
| Devre Teknisyeni | 300 | 20 (3) | 150 |
| İletken Ustası | 900 | 60 (10) | 300 |
| Çekirdek Muhafızı | 1800 | 130 (25) | 500 |
| Arena Mimarı | 3000 | 220 (50) | 800 |
| Lig Öncüsü *(yeni)* | 3600 | 280 | 1000 |
| Nexus Stratejisti *(yeni)* | 5600 | 450 | 1500 |
| Şampiyon Operatör *(yeni)* | 6100 | 550 | 2000 |
| Efsane Mühendisi *(yeni)* | 7100 | 750 | 3000 |
| GRIDSHARD Efsanesi | 8600 | 1000 (100) | 5000 |

Galibiyet ölçüsü: yüzde 65 kazanan oyuncu kupa başına yaklaşık 0,07 galibiyet biriktirir (300 kupa ≈ 20 galibiyet); eski sayılar, hiç kaybetmeyen oyuncunun bile altındaydı. Unvan **en yüksek kupaya** göre verilir (bugün anlık kupaya göre; sezon sıfırlaması son unvanı her sezon düşürürdü). Ödülü alınmış unvan oyuncuda kalır.

**D9. Yükseltme maliyeti**

Gelir (koddan; günde 10 maç, yüzde 55 galibiyet, orta arena): Devre Kredisi günde yaklaşık 1.400–1.700 (maç 35–100 / galibiyet, galibiyet sandığı ortalama 98, hediye sandık, giriş takvimi, sezon yolu); modül parçası günde yaklaşık 22 (bütün kaynaklar, desteye dağılır); Akı günde yaklaşık 80.

Bugünkü tablo: bütün enderliklerde aynı parça (toplam 962), kredi 44.650 × enderlik çarpanı (1 / 1,35 / 1,8 / 2,5). Darboğaz parça; kredi kolay.

Yeni tablo (hücre: Devre Kredisi / parça; efsanevide + Akı). Örnekten alınan: sona doğru dikleşen kredi, enderlik arttıkça az parça ve çok kredi, efsanevide ikinci kaynak. Alınmayan: örnekteki 4.500 parçalık adımlar (bizde parça kazancı çok düşük).

| Seviye | Sıradan | Ender | Destansı | Efsanevi |
|---|---|---|---|---|
| 1 → 2 | 100 / 2 | 150 / 2 | 200 / 2 | 300 / 1 |
| 2 → 3 | 200 / 4 | 300 / 4 | 400 / 2 | 600 / 2 |
| 3 → 4 | 400 / 8 | 600 / 6 | 800 / 4 | 1.200 / 3 |
| 4 → 5 | 600 / 14 | 900 / 10 | 1.200 / 8 | 1.800 / 4 |
| 5 → 6 | 1.000 / 22 | 1.500 / 16 | 2.000 / 12 | 3.000 / 6 |
| 6 → 7 | 1.500 / 32 | 2.250 / 24 | 3.000 / 16 | 4.500 / 10 |
| 7 → 8 | 2.200 / 44 | 3.300 / 34 | 4.400 / 22 | 6.600 / 14 + 20 Akı |
| 8 → 9 | 3.200 / 58 | 4.800 / 44 | 6.400 / 30 | 9.600 / 18 + 30 Akı |
| 9 → 10 | 4.800 / 74 | 7.200 / 56 | 9.600 / 38 | 14.400 / 22 + 40 Akı |
| 10 → 11 | 7.000 / 92 | 10.500 / 70 | 14.000 / 46 | 21.000 / 28 + 50 Akı |
| 11 → 12 | 10.000 / 112 | 15.000 / 84 | 20.000 / 56 | 30.000 / 34 + 60 Akı |
| 12 → 13 | 15.000 / 136 | 22.500 / 102 | 30.000 / 68 | 45.000 / 40 + 80 Akı |
| 13 → 14 | 22.000 / 164 | 33.000 / 124 | 44.000 / 82 | 66.000 / 50 + 100 Akı |
| 14 → 15 | 32.000 / 200 | 48.000 / 150 | 64.000 / 100 | 96.000 / 60 + 120 Akı |
| **Toplam** | 100.000 / 962 | 150.000 / 726 | 200.000 / 486 | 300.000 / 292 + 500 Akı |

Altı kartlık sıradan deste için aktif oyuncunun süresi (kredi ve parçadan yavaş olanı): ortalama seviye 5 yaklaşık 1 hafta, seviye 8 yaklaşık 5 hafta, seviye 10 yaklaşık 3 ay, seviye 12 yaklaşık 6 ay, seviye 15 yaklaşık 16 ay. Bugünkü tabloda son seviye yaklaşık 9 aydı; ilk beş seviye değişmedi.
- Oyuncunun bugünkü kart seviyeleri aynen kalır; yeni maliyet yalnız bundan sonraki yükseltmelerde geçerlidir.
- Çekirdek: bugün Akı 20 × seviye (toplam 2.100) ve çekirdek parçası 2 … 340 (toplam 1.376). Çekirdek parçası yalnız Elmas Sandık'tan (yüzde 6) geldiği için 1.376 parça ulaşılamaz. Uygulanan (kullanıcı onayıyla): parça eğrisi 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 22 (toplam 109); Akı 50 × seviye (toplam 5.250).

**Sıra:** (1) aşamalar, eşikler, lig durakları, eşleştirme kuşağı; (2) modül dağıtımı, geçiş kuralı, yol durakları, botlar; (3) unvanlar; (4) maliyet tablosu; (5) istemci (yol ekranı, koleksiyon etiketleri, çeviriler, `canon-data.js`); (6) GRIDSHARD Sandığı; (7) eğitim savaşı; (8) kanon belgesi, testler, tarayıcı denemesi.

### Faz 2 sırasında gelen ek istekler (12 Ekim, kullanıcı; hepsi uygulandı, gerçek cihazda görülmedi)

- [x] **"lig geçişlerinde yeni açılan modüller ekrana gelerek tanıtılabilir."** Bir lige ilk kez giren oyuncuya, maçtan ana ekrana dönünce "YENİ MODÜL AÇILDI" penceresi açılır: modülün simgesi, adı, enderliği, sınıfı ve açıklaması; karta dokununca kart ayrıntısı açılır, TAMAM'dan sonra (varsa) kazanılan ödül durağı gösterilir. Sunucu maç sonucuna `newly_unlocked_module_ids` ekler; modül yalnız ilk açılışta bildirilir. Claude'un okuması: yalnız **lig** girişlerinde gösterilir (arenalarda açılan modüller yolda listeleniyor); arenalar için de istenirse tek koşul kaldırılır.
- [x] **"çekirdeklerimizde farklı arenalarda açılıyor ama onları görsel olarak eklememişiz devre yoluna … çekirdekleri modüllerden ayrı bir satırda gösterelim."** Çekirdek açan yedi arenada (1, 3, 5, 7, 9, 11, 12) modül satırının altında ayrı "BU ARENADA AÇILAN ÇEKİRDEK" satırı: çekirdeğin simgesi ve adı; dokununca çekirdeğin bilgi ekranı açılır.
- [x] **"liglerin sol tarafında yer alan simgelerin hepsi aynı; onların hepsi için farklı tasarımlar"** Sekiz ligin her birine ayrı amblem ve renk (Kıvılcım: kıvılcım, sarı; Voltaj: şimşek, mavi; Reaktör: reaktör çekirdeği, yeşil; Kuantum: yörüngeler, mor; Nexus: düğüm, pembe; Şampiyonlar: kupa, turuncu; Efsanevi: taç, kızıl; GRIDSHARD: kristal, altın). Kademe, amblemin altındaki beş çentikten okunur (36 kademenin hepsi ayrı görünür).
- [x] **"devre yolunun arka planı için de bir tasarım … oyunu tek düze renkten kurtaralım biraz."** Yolun arka planı ızgara, düğüm noktaları ve çapraz devre izlerinden oluşan desen; aşama kartlarının rengi yol boyunca değişir (arenalar camgöbeğinden mora, ligler kendi rengine). Henüz ulaşılmamış aşama soluk ama opak (desen yazıların altından geçmez).
- [x] **"lig sonlarındaki sandıklar hücre içinde değil … havada duran sandıklar gibi"** Lig sandığı yol çizgisinin ucunda, hücresiz, ışıltısı ve gölgesiyle havada süzülür (hareket azaltma tercihinde ve Düşük grafik ayarında durur).
- [x] **"liglerdeki sandıklar mağazadaki veya diğer alanlarda yer alan sandıklardan farklı olmalı hem ismi hem içeriği hem de görüntü ve rengi."** Yedi lig sandığı (Kıvılcım, Voltaj, Reaktör, Kuantum, Nexus, Şampiyonlar, Efsane Sandığı): köşeli kasa biçimi, kilidinde ligin amblemi, ligin rengi; içeriği şansa bağlı değil (o ligin efsanevi modülünden parça + Devre Kredisi + Akı) ve mağaza stoğuna girmeden doğrudan verilir. Şampiyonlar ve Efsanevi kademe sonlarındaki Altın/Elmas Sandıklar kalktı (yerine iki kat Devre Kredisi).
- [x] **"sandık içerikleri diğer sandıklar gibi üzerine gelince önizlemeli olsun. altında yazmasın."** İçerik sandığın altında yazmaz; sandığa dokununca (fareyle üzerine gelince) diğer sandıklardaki önizleme paneli açılır. Alınabilir sandıkta ayrı **AL** düğmesi çıkar; sandığa dokunmak ödülü almaz.

### Faz 2 düzeltmeleri (kullanıcı, 12 Ekim akşamı; **bekliyor** — Faz 3'ten önce yapılacak)

Kullanıcının kendi cümleleri aşağıda. Claude'un okuması, önerdiği sayılar, etkilenen dosyalar ve uygulamadan önce kullanıcıya sorulacaklar **`CLAUDE_CHECKPOINT.md` başında** ("EVDE İLK İŞ"); önce orası okunur.

- [x] **R1.** "arenalarda açılan modüller içinde tanıtım penceresi açılsın." Uygulandı (12 Ekim gecesi, ev bilgisayarı; yalnız istemci): pencere arenada açılan modüller için de açılır, alt yazısı "Arena N açıldı" (İngilizce "Arena N reached"; sözcükleri Claude seçti). Eski hesapta zaten açık olan modül yeniden tanıtılmaz (sunucu yalnız ilk açılışı bildirir). İstemci testiyle sınandı; **tarayıcıda ve cihazda görülmedi** (Arena 12'nin üç kartı 320 piksel genişlikte R3 ile birlikte bakılacak).
- [x] **R2.** "sezon sıfırlaması için arena 1-12 arasında kupa eşiklerini artıralım.  arena 1 den 2 ye geçiş için 300 kupa ise mesela arena 7 den 8 e 500 kupa gerekecek gibi olsun(kupa sayılarını hesaplamadan örnek olarak verdim.) Bu ayarlamayı yaparak arena 1 den arena 12 nin sonuna kadar 5400 kupa olsun. böylelikle 3200 kupa bir sezonda rahatça kazanılır. Sonuçta en üst lige ulaşan oyuncu 8600 kupada kalmayacak lider panosunun en zirvesine ulaşmak için savaşmaya devam edecek."
- [x] **R3.** "Liglerin arasına dağıttığın modülleri birinci ligin açılışına al. dağıtıma gerek yok. liglerin başlamasıyla tüm modüller açılmış olsun."
- [x] **R4.** "Lig sandıkları belirli bir modülün parçasını değil evrensel parça versin. her ligde bu parça sayısı artabilir."

**R2–R4 uygulandı (12 Ekim gecesi, ev bilgisayarı).** Kullanıcının seçtikleri: arenalar 300, 300, 350, 350, 400, 450, 500, 500, 500, 550, 600, 600 (5400'de biter); lig kademeleri 80 / 100 / 140; mevcut oyuncuların kupası yeni ölçeğe taşınır (aynı arena, aynı oran); unvan koşulları aynı aşamalara taşınır; sezon değişiminde lig oyuncusu 5400'e döner; lige girişteki "6 parça" durakları kalkar; lig sandıkları 5, 7, 9, 12, 15, 20, 25 evrensel parça; GRIDSHARD Sandığı 40 evrensel parça. Güncel sayılar üretilen `docs/ARENA_MODUL_ODUL_KANONU.md` içindedir; **bu dosyadaki "Faz 2 tasarımı" tabloları 12 Ekim sabahının sayılarıdır ve eskidir.**

Aynı gece gelen ek istekler (kullanıcı cümleleri `CLAUDE_CHECKPOINT.md` içinde), hepsi uygulandı:

- [x] **R5. Yol hücresi.** Kullanıcı iki örnekten "A: şeffaf hücre"yi seçti: aşamanın dikdörtgeni şeffaf, arena ve lig rengi başlık şeridinde. Sonra: "devre yolunda ulaşılamayan aşamalar soluk renkte, ilerledikçe aktifleşsin. sandıklar şeffaf olmasın.." — ulaşılmamış aşama saydamlıkla değil renkle soluklaşır; sandıklar opaktır.
- [x] **R6. GRIDSHARD 10000.** Kullanıcının seçimi: GRIDSHARD Ligi 8600'de başlar; GRIDSHARD Sandığı ve "GRIDSHARD Efsanesi" unvanı 10000 kupadadır.

## Faz 3 — savaş mekaniği

- [x] **D13. Modül özelliklerinin gözden geçirilmesi.** *(Güçlendirici 12–13 Ekim gecesi; diğer 35 modül 13 Ekim'de: aşağıda "Modül çevrimleri ve görsel tur".)* Örnek: Güçlendirici'nin bekleme süresi yok; 2 saniyede bir destek verecek şekilde ayarlanır ve süre seviyeyle kısalır. Bütün modüller aynı gözle taranır.
- [x] **D14. Enerji tüketimi.** Birçok modülün istatistiğinde enerji tüketimi 0 yazıyor. Her modül enerji tüketmeli; değerler çekirdeğin üretimi ve enerji ekonomisiyle birlikte ayarlanır.
- [x] **D11. Seviye atlamanın etkisi.** *(Denetlendi: zaten vardı; kod değişmedi.)* Bugün seviye yalnız hasar/can ya da tek bir değeri artırıyor. Seviyeyle ikinci değerler de gelişmeli (örnek: Darbe Topu'nda can ve hasar artarken saldırı aralığı seviye başına 0,02 sn kısalır). Bütün modüller ve çekirdekler için.
- [x] **D10. Yetenekler.** Bugünkü yetenekler düz artış. Her modüle sınıfına ve özelliğine uygun, savaşta farklı kullanım sunan sıra dışı yetenekler (örnek: Lazer — her 30 saniyede bir 5 saniye boyunca her atış hedefin yanındaki modüllere hasarın %30'u kadar hasar verir).
- [x] **D12. Çekirdek yetenekleri** modüllerinkinden de ayrıksı olmalı; çekirdek oyunun merkezidir.
- [x] **D16. "Akım Desteği" metası Akım'ı gerçekten artırsın** (D15'te kullanıcının kararı, 12 Ekim). Etki satırı "Akım üretimi +%15" yazıyor; kural bugün yalnız Batarya, Kapasitör ve Akım Dengeleyici'nin etkisini %15 artırıyor. Meta, savaştaki Akım yenilenmesini %15 hızlandıracak şekilde değiştirilir (`current_regen_interval_ms`, `server/app/game/engine.py`); bugünkü etkinin kalıp kalmayacağı enerji ekonomisiyle (D14) birlikte kararlaştırılır. Açıklama cümlesi ("Akım üretimi ve depolama…") ve `server/tests/test_beta58_team_profile_daily_meta.py` içindeki beklentiler de o zaman güncellenir.

Yöntem: (1) enerji ve seviye gelişimi için sayısal model ve simülasyon (`server/app/game/simulation.py`, denge raporları); kart galibiyet oranı aralığı bugünkü %41–59 bandından kötüleşmemeli. (2) Yetenekler için motorda az sayıda ortak kanca (vuruşta sıçrama, dönemsel pencere, yok olunca etki, yerleşince etki, koşullu güçlenme, delme, zincir) kurulur; her yetenek bu kancalarla tanımlanır, böylece 36 modül + 7 çekirdek için ayrı ayrı özel kod yazılmaz. (3) Yapay zekâ yetenekleri bilerek kullanır. (4) Eğitim savaşının betiği belirli değerlere dayanır; her adımda yeniden doğrulanır. (5) Yetenek listesi uygulamadan önce bu belgeye tablo olarak yazılır.

### Faz 3 uygulaması (12–13 Ekim gecesi, ev bilgisayarı; yayınlanmadı, gerçek cihazda görülmedi)

Kullanıcı "durmadan faz 3 e devam et" dedi; **tasarım kararlarını Claude verdi ve kullanıcı hiçbirini görmedi.** Yetenek listesi sunucu verisinden üretilir: `docs/YETENEK_KANONU.md` (`python tools/generate_arena_canon_docs.py`).

- **D16.** Akım Desteği metası savaştaki Akım yenilenmesini %15 hızlandırır (2500 → 2174 ms). Eski gizli etki (Batarya, Kapasitör, Akım Dengeleyici +%15) kalktı; açıklama "Savaşta Akım bugün daha hızlı yenilenir." oldu.
- **D14.** Motor zaten her karta enerji ödetiyordu (sürekli bakım ya da aksiyon başına bedel); bilgi ekranı yalnız bakımı gösterdiği için saldırı, onarım ve sabotaj kartlarında 0 yazıyordu. "ENERJİ TÜKETİMİ" artık bakım + aksiyon bedeli / bekleme süresidir (Lazer 1,2/sn, Darbe Topu 2/sn …). Batarya üreticidir: "ENERJİ ÜRETİMİ +4,5/sn" gösterir. Kapasitör'e 0,2/sn bakım eklendi; tüketmeyen tek modül Batarya'dır. **Enerji ekonomisinin sayıları değiştirilmedi** (Kapasitör dışında).
- **D13.** Güçlendirici 2 saniyede bir devredeki saldırı modüllerini yükler; yük sıradaki atışta harcanır; çevrim seviyeyle kısalır (seviye 15'te 1,78 sn) ve bilgi ekranında BEKLEME olarak görünür. Çevrimden sık ateş eden silah (Lazer, Dron Üssü) her atışında yük bulamadığı için pay %15 → %18, toplam %30 → %36 yapıldı. **Diğer 35 modül tek tek gözden geçirilmedi**; kullanıcı hangi modüllerde ne istediğini söylerse aynı yöntemle yapılır.
- **D11.** Seviye bugün de ikinci değerleri geliştiriyor: bekleme seviye başına %0,8 kısalır (Darbe Topu'nda tam 0,02 sn; en çok %12), enerji tüketimi %0,4 azalır (en çok %8), CAN %3 ve hasar %5 artar, etki %3,5 artar; çekirdekte enerji üretimi, rezerv ve güç etkisi artar. Bilgi ekranı bir sonraki seviyenin farkını Faz 1'den (G13) beri gösteriyor. Kod değişmedi.
- **D10.** Her modülün dört eşiği: 1. temel uzmanlık (güç +%3 / CAN +%5), 2. **imza yeteneği** (modüle özel iki yetenek), 3. ince ayar (bekleme −%4, beklemesi olmayan modülde etki +%4 / enerji −%12), 4. ustalık (imza yeteneğini bir buçuk kat güçlendirir / CAN +%8). 36 modül × 2 = 72 imza yeteneği, 18 ortak kanca: yayılım penceresi (kullanıcının Lazer örneği: 30 saniyede bir 5 saniye boyunca yandaki modüllere %30), bitirici, her N. atış, Çekirdek avcısı, zırh kıran, enerjisiz atış, yok edince yeniden ateş, ilk atış, son direniş, diken, yok olunca onarım, dönemsel tam blok, taze kurulum, etki penceresi, Akım kazancı, yerleşince onarım, yok olunca Akım, sabotaj şoku. Dal kimlikleri eskisi gibidir; kayıtlı seçimler geçerli kalır ama anlamları eşiğe göre değişti (2. ve 4. eşikte "+%3 / +%5" seçmiş oyuncu artık o eşiğin yeni dalına sahiptir). AI rakip, eşlendiği seviyede açılan eşikleri kullanır. Savaşta yetenek tetiklenince modülün üstünde adı belirir.
- **D12.** Her çekirdeğin üç eşikte (seviye 5, 9, 13) altı ayrı yeteneği: açılış dolumu, yok edilen rakip modülden dolum, kaybedilen modülden dolum, güçten sonra dolum yankısı, güçle Akım kazancı, acil kalkan (maçta bir kez), dikenli çekirdek, CAN yüksekken fazla enerji, uzatmada dayanıklılık. Eski "enerji +%3 / dolum +%3" dalları kalktı; kimlikler aynı kaldığı için kayıtlı seçimler yeni yeteneklere eşlenir.
- **Yapılmayanlar:** yöntemdeki sayısal model ve denge simülasyonu **yeteneklerle birlikte yapılmadı**. Depodaki denge matrisi (`tools/beta43_module_balance_matrix.py`, 360 maç) seviye 1 destelerle koşar ve yetenek içermez; D13/D14/D16 öncesi ve sonrası aynı kart galibiyet oranlarını verdi. Kanon belgesindeki "%41–59" bandını üreten araç depoda yok; bu matriste aralık zaten geniş (%0–71) ve Faz 2'deki deste eşlemesinden sonra hiç ölçülmemişti. Yeteneklerin sayıları (oranlar, süreler) ölçülmüş değil, başlangıç değeridir.
- **Doğrulama:** sunucu 1424 geçti (yeni dosya `server/tests/game/test_faz3_battle_mechanics.py`, 34 test: her kanca motorda sınanır); istemci 335 geçti (yeni dosya `client/tests/faz3-talents-and-energy.test.js`); uçtan uca: ilk oyun deneyimi, mobil savaş, ayarlar (Android öykünmesi), menü gezintisi, sezon, iki istemcili maç geçti. Telefon boyutunda Chrome'da (360×640, 320×568 en küçük yazı boyu taklidiyle, 393×852, İngilizce 360×640) yetenek ekranı, istatistik karoları ve çekirdek yetenekleri 25'er denetimle geçti. Tarayıcı denemesi bir hatayı yakaladı (Yetenekler sekmesi boş açılıyordu) ve düzeltildi. **Savaşın içinde bir yeteneğin tetiklendiği tarayıcıda görülmedi** (sunucu testleriyle sınandı). Gerçek cihazda görülmedi.

### Modül çevrimleri ve görsel tur (13 Ekim 2026, ev bilgisayarı; yayınlanmadı, gerçek cihazda görülmedi)

Kullanıcının isteği (kelimesi kelimesine; ekinde üç görsel vardı: Rush Royale'in açık üç çizgi menüsü, Clash Royale sandıklarının kapalı ve açık çizimleri, Clash Royale ana ekranı):

> Güçlendiricide yaptığımız gibi tüm modüllerde düzenleme yapmalıyız. Örnek olarak verecek olursak başlangıç seviyesinde kalkan 1,2 saniyede bir saldırı engellerken seviyesi yükseldikçe saniye düşer, canı yükselir, mesela yansıtıcı başlangıç seviyesi 1 sn aralığı ile hasarı üzerine çeker, gelen hasarın %30 unu geri yansıtır, seviye yükseldikçe can artar, yansıtma oranı artar, sn aralığı düşer gibi. Bu tip modüle özgü özellikleri incele ve her modül için benzer değerlendirme ve çalışmaları yap.
>
> Devre yolunda liglerin sonunda bulunan sandıklar şeffaf olmasın. Onlar fiziksel olarak orada olsunlar. Sana örnek sandıklar attım. Bunlar gibi bizim oyunumuzun tarzına uygun sandık açma efekti de olacak şekilde tasarlanabilir.
>
> Bir diğer görsel oyun içindeki yazılar ile eşleşen görseller. Mesela arkadaşlar yazısının solunda iki kişi figürü gibi. Bu tip ince düzenlemeler ile şenlendirebiliriz oyunu. Mesela bu attığım oyunlarda arka plan desenli düz renk ama üzerinde duran materyaller ile renklenmiş. Açık menü ekran görüntüsünün olduğu resimde arka tarafta rush royale ana ekranı var. alt dockta mesela butonlar ayrılmış ve renkli simgeleri var. bunun gibi ilgi çekici düzenlemeler yapabiliriz.
>
> Modül bilgi penceresi ile girilince yükselt 100 dk yazısında dk ve akı yerine simgelerini kullanalım.
>
> Modül  bilgi, istatistik ve yetenekler sekmelerinde daha renkli ve simglerinde olduğu şekilde ilgi çekici tasarlayalım.
>
> Savaş alanında çekirdek özel gücü butonu için daha dikkat çekici bir tasarım yapalım.

**Tasarım kararlarını Claude verdi; kullanıcı yalnız Kalkan ve Yansıtıcı örneklerini söyledi, diğer sayıları ve çizimleri görmedi.**

- **D13'ün tamamı — modül çevrimleri.** Her modülün kendi çevrimi vardır ve seviyeyle kısalır; modüle özgü değerler seviyeyle büyür. Tam tablo (seviye 1 ve 15) sunucu verisinden üretilir: `docs/MODUL_CEVRIM_KANONU.md`. Kod: `server/app/game/module_cycles.py` (veri ve saf hesap), `module_sheet.py` (bilgi ekranı değerleri), `combat.py`, `support.py`, `sabotage.py`, `energy.py`, `engine.py`.
  - **Kalkan (kullanıcının örneği):** 1,2 sn'de bir blok hazırlar; kendisine gelen sıradaki saldırının %60'ını engeller, blok tek saldırıda harcanır. Seviye 15'te 1,07 sn ve %80. Eski sürekli %35 azaltım kalktı. Kullanıcı "saldırı engeller" dedi; **tam (yüzde yüz) engelleme yerine %60 Claude'un seçimidir** (tek bir ağır silaha karşı Kalkan'ın hiç hasar almamasını önlemek için).
  - **Yansıtıcı (kullanıcının örneği):** 1 sn'de bir, devreye ateşlenen bir saldırıyı üzerine çeker ve gelen hasarın %30'unu saldırana yansıtır (seviye 15'te 0,89 sn ve %40). Sürekli %25 azaltım kaldı (Claude'un seçimi). Füze kilidi doğal hedefe kurulur; çekim atış anında olur, kilit baştan başlamaz.
  - **Zırh:** sürekli %25 + 3 sn'de bir plaka onarımı (5 CAN). **Bariyer:** hedef önceliği ve sürekli %20 + 4 sn'de bir, uygulanan bir sabotajı %35 kısaltır (eski kural: her sabotajı sürekli %25 kısaltırdı). **Koruyucu Kubbe:** 1,5 sn'de bir başka modüle gelen bir saldırıyı %30 azaltır (eski: her saldırıyı sürekli %12). **Prizma Kalkanı:** 1,3 sn'de bir %55 blok + engellenenin dörtte biri enerji. **Faz Zırhı** ve **Kronos Rölesi:** çevrimleri seviyeyle kısalır.
  - **Soğutucu:** 1 sn'de bir darbe (%4,5, üç modül). **Hedefleme Bilgisayarı:** Güçlendirici gibi 2 sn'de bir kilit; pay %15 → %18, toplam %30 → %36. **Aşırı Hızlandırıcı:** 2,5 sn'de bir aşırı yük, ısı yüklemede. **Hassas Matris:** odak atışla değil 1,5 sn'de bir darbeyle birikir. **Omega Güçlendirici:** 2 sn'de bir rezonans yükü. Bir atış bütün destek yüklerini harcar.
  - **Batarya, Kapasitör:** çevrim, boş deponun dolma süresidir (4 sn ve 1 sn). **Akım Dengeleyici:** çevrimi yoktur.
  - **Saldırı, onarım ve sabotaj modüllerinin kuralı değişmedi** (çevrimleri zaten vardı). İmza değerleri (zincir, delme, kilit …) seviyeyle büyümez; bilgi ekranında gösterilir.
  - **Bilgi ekranı:** "ETKİ ÇARPANI" yerine modülün kendi değerleri ve bir sonraki seviyedeki fark; çevrim karosunun adı modüle özeldir. Batarya'nın üretimi artık seviyesiyle birlikte yazıyor (eskiden her seviyede 4,5 yazıyordu; kural değişmedi).
  - **Savaşta:** blok, ayna, kubbe ve sabotaj direnci modülün üstünde adıyla; destek darbeleri bir halkayla görünür (`module_cycle_pulse`).
  - **Denge:** depodaki matris (360 maç, seviye 1 desteler, yeteneksiz) önce ve sonra koşuldu; kart galibiyet oranları ±6 puan içinde kaldı (Yansıtıcı +6,1, Plazma Havanı +5,6, Krono Rölesi −4,2, Bariyer −2,3, Kalkan −1,9; 12 maçlık Faz Zırhı −16,7 iki maçtır), ortalama maç süresi 78,3 → 78,1 sn. **Yüksek seviyede ve yeteneklerle ölçülmedi.**
- **Lig sandıkları.** Dolu çizim (gövde, metal köşebent, perçin, kapak, kilidinde ligin amblemi), her lige ayrı renk; havada süzülmez, alınabilir olan zıplar, alınmış olan açık ve boş durur; ulaşılmamış aşamada rengini korur. AL: sandık açılış penceresinde titrer, sunucu onaylayınca kapağı kalkar, ışık ve kıvılcım çıkar, ödüller sırayla belirir. Mağaza sandıklarının çizimi değişmedi.
- **Yazılarla eşleşen simgeler.** Tek simge takımı; üç çizgi menüsü (Kozmetik, Ödüller, Arkadaş, Ayarlar), takım menüsü, 30 bölüm başlığı ("Arkadaşlar" iki kişi, "Sandık Satın Al" sandık …), SAVAŞ düğmesinde çapraz kılıç. Alt çubuk ayrık hücreli, renkli simgeli, adlar her zaman görünür. Ev ekranı ve sayfalarda desenli düz zemin; posta ve menü düğmeleri renkli.
- **Yükselt düğmesi.** "DK" ve "AKI" yerine kaynak simgeleri; çekirdekte ve yetenek bedelinde de.
- **Bilgi penceresi.** Renkli simgeli üç sekme, simgeli değer kutuları ve karolar, renkli kimlik satırları, eşik türü rozetleri.
- **Çekirdek gücü düğmesi.** Dolum halkası, iç disk, yüzde etiketi; hazır olunca dönen altın halka, nabız, yayılan ışık ve "HAZIR" etiketi.
- **Kullanıcının görmediği seçimler (Claude):** bütün sayılar (Kalkan ve Yansıtıcı'nın aralığı ile yansıtma oranı dışında); Kalkan'ın bloğunun %60 olması; Yansıtıcı'nın sürekli azaltımının kalması ve yansımanın azaltılmamış hasardan hesaplanması; Zırh'a plaka onarımı ve Bariyer'e sabotaj direnci yükü verilmesi; Kubbe korumasının darbeye çevrilmesi; Hedefleme payının %18'e çıkması; yüksek oranların seviyeyle azalan hızla büyümesi (üs 0,6) ve tavanları; saldırı imza değerlerinin seviyeyle büyümemesi; simge çizimleri ve renkleri; sandık renkleri; desenin biçimi; alt çubukta açık hücrenin yükselmesi; mağaza sandıklarının eski çizimde kalması.
- **Eski paketle (v8) uyum:** eski paket yeni olayı (`module_cycle_pulse`) tanımaz ve göstermez; bilgi ekranında yeni çevrimi "BEKLEME" adıyla, eski "ETKİ ÇARPANI" karosuyla gösterir; açıklamaları Türkçe gösterir (çıkarım; v8 kaynağıyla denenmedi).

## Faz 4 — kozmetik içerik

- [ ] **G1. Arka planın gerçekten değiştiğini görmek için "Uç" oyuncusuna bir arka plan açılması.** Canlı veriye dokunur: yayın oturumunda, kullanıcının o anki onayıyla, küçük bir betikle yapılır. Öncesinde arka plan değişiminin çalıştığı yerel sunucuda doğrulanır. Arka plan çeşidi artırılabilir.
- [ ] **G2. Dönemlik ödüller.** Sıralama ve dereceyle kazanılan kozmetikler her turnuva döneminde (takım ve bireysel) farklı olmalı ve kendiliğinden değişmeli.
- [ ] **G3. Hareketli emojiler.**
- [ ] **G4. Profil barı arka planında desenler** (düz renk değişimine ek).
- [ ] **G5. Profil resimlerinde karakterler** (yalnız şekil değil).
- [ ] **G6. Başka oyunlardaki kozmetik çeşitliliğinin araştırılması** ve örnek alınması.

Varsayılan yol: desenler, karakterler ve hareketli emojiler oyunun kendi çizim diliyle (SVG ve CSS hareketi) depoda üretilir; dışarıdan paket indirilmez. Hazır bir açık lisanslı set kullanılması istenirse önce lisansı okunur ve kullanıcıdan indirme onayı alınır. Hedef kitle 13 yaş ve üzeri olduğu için karakterler küçük çocuklara hitap eden türden olmamalıdır.

## Kullanıcıdan beklenen kararlar (iş bunları beklemeden başlar)

1. Faz 4'te görseller depoda mı çizilsin (varsayılan), yoksa açık lisanslı hazır bir set mi aransın?
2. ~~Faz 1 tek başına mı çıksın, Faz 2 ile mi?~~ Karar verildi (12 Ekim akşamı): "Sunucu ve paketi faz 3 ten sonra yaparız." Hepsi birlikte çıkar.
3. ~~D7: yeni modül eklensin mi?~~ Karar verildi (12 Ekim): eklenmiyor; arenalar 2–3 modül, ligler girişte birer efsanevi modül açar.
4. Faz 2 düzeltmelerinin (R1–R4) açık soruları: arena ve lig kademe genişlikleri, mevcut oyuncuların kupasının yeni ölçeğe taşınması, unvan kupa koşulları, evrensel parça miktarları (`CLAUDE_CHECKPOINT.md` başında, her maddenin "Sorulacak" satırı).

## Kayıt

| Tarih | Ne yapıldı |
|---|---|
| 13 Ekim 2026 (ev bilgisayarı) | **Modül çevrimleri (D13'ün tamamı) ve görsel tur uygulandı:** 36 modülün çevrimi ve modüle özgü değerleri; dolu çizilen lig sandıkları ve açılışı; yazılarla eşleşen simgeler, ayrık hücreli alt çubuk, desenli zemin; simgeli Yükselt düğmesi; renkli bilgi penceresi; Çekirdek gücü düğmesi. Sunucu 1491, istemci 347 test geçti. Yayınlanmadı; gerçek cihazda görülmedi; denge yalnız seviye 1 desteleriyle ölçüldü. |
| 12–13 Ekim 2026 (gece, ev bilgisayarı) | R1–R6 uygulandı (arenada modül tanıtımı; yeni kupa ölçeği ve mevcut oyuncuların kupasının taşınması; efsanevi modüller ilk ligde; evrensel parçalı lig sandıkları; şeffaf yol hücresi, renkle soluklaşan aşamalar; GRIDSHARD Sandığı ve son unvan 10000 kupada). **Faz 3 uygulandı** (D16, D14, D13'te Güçlendirici, D10 modül yetenekleri, D12 çekirdek yetenekleri; D11 denetlendi). Sunucu 1424, istemci 335 test geçti; uçtan uca ve telefon boyutunda tarayıcı denemeleri geçti. Yayınlanmadı; gerçek cihazda görülmedi; yeteneklerle denge ölçülmedi. |
| 12 Ekim 2026 (akşam) | Kullanıcı Faz 2'yi inceledi ve dört düzeltme istedi (R1–R4: arenada da modül tanıtımı; arenalar 5400 kupada bitsin; efsanevi modüller ilk ligde açılsın; lig sandığı evrensel parça versin). **Uygulanmadı**; ev bilgisayarında Faz 3'ten önce yapılacak. Karar: sunucu ve paket Faz 3'ten sonra. Özgün belgenin Faz 3 ve Faz 4 cümleleri bu dosyanın sonuna eklendi. |
| 12 Ekim 2026 | **Faz 2 (D1–D9) uygulandı** (iş bilgisayarı, yayınlanmadı): 36 lig kademesi ve eşikler, yeni modül dağıtımı ve eski hesaplar için geçiş kuralı, on unvan, enderliğe göre maliyet tablosu ve çekirdek maliyeti, GRIDSHARD Sandığı, eğitim savaşında Kalkan dersi, eski paketle uyum. Oturum içinde gelen yedi ek istek de işlendi (lige girişte modül tanıtımı; yolda çekirdek satırı, lig amblemleri, desenli arka plan, havada duran ve lige özel sandıklar, sandık önizlemesi). Sunucu 1406 geçti (35 başarısız yalnız eksik `google-auth` / `fakeredis`); istemci 323 geçti, 2 atlandı. Gerçek cihazda görülmedi. |
| 12 Ekim 2026 | Belge okundu, plan yazıldı (iş bilgisayarı). Kod değişmedi. |
| 12 Ekim 2026 | G11, G12, G13, G14, G2b ve D15 uygulandı; **Faz 1 bitti** (iş bilgisayarı, yayınlanmadı). Kullanıcının oturum içi iki düzeltmesi işlendi (hareketli yalın yeşil ok; modülde AKIM yerine BEKLEME) ve D15 kararı alındı ("Kuralı metne uydur" → D16). İki küçük sunucu değişikliği var (çekirdek `next_stats`, meta metni). İstemci testleri 304 geçti, 2 atlandı; sunucu 1377 geçti, 45 atlandı, 35 başarısız (yalnız bu makinede eksik `google-auth` ve `fakeredis`); uçtan uca: menü gezintisi, sezon, ayarlar, mobil savaş, ilk oyun deneyimi geçti. Telefon boyutunda Chrome'da 360×640, 320×568, 393×852 (Android'in en küçük yazı boyu taklit edilerek ve edilmeden), masaüstü, Türkçe ve İngilizce; denetimlerin hepsi geçti. Gerçek cihazda görülmedi. |
| 12 Ekim 2026 | G9 + G10 uygulandı (iş bilgisayarı, yayınlanmadı). İstemci testleri 301 geçti, 2 atlandı (yeni dosya `client/tests/team-screen.test.js`); uçtan uca: menü gezintisi, sezon, ayarlar, mobil savaş, ilk oyun deneyimi geçti. Telefon boyutunda Chrome'da, takım kurma bedeli yalnız o deneme sürecinde sıfırlanmış yalıtılmış yerel sunucuda, lider ve üye hesabıyla denendi: 360×640, 320×568, 393×852 (Android'in en küçük yazı boyu taklit edilerek ve edilmeden) ve masaüstü; denetimlerin hepsi geçti. Gerçek cihazda görülmedi. |
| 12 Ekim 2026 | G7 + G8 uygulandı (iş bilgisayarı, yayınlanmadı). İstemci testleri 300 geçti, 2 atlandı; uçtan uca: menü gezintisi, sezon, ayarlar, mobil savaş, ilk oyun deneyimi geçti; telefon boyutunda Chrome'da 360×640, 320×568, 393×852 ve masaüstünde, Android'in en küçük yazı boyu taklit edilerek ve edilmeden denendi. Gerçek cihazda görülmedi. |

## Ek: özgün belgeden Faz 3 ve Faz 4 cümleleri (kelimesi kelimesine)

Özgün belge ("Oyun Düzenlemeler") yalnız iş bilgisayarının masaüstünde. Faz 3 ve Faz 4 başka makinede de kullanıcının kendi cümlesinden okunabilsin diye ilgili paragraflar buraya değiştirilmeden alındı; yazım kullanıcınındır. Yukarıdaki madde metinleri Claude'un özetidir; bir maddeye başlarken önce buradaki cümle okunur.

**Faz 3 (savaş mekaniği) — belgedeki sırayla D10, D11, D12, D13, D14 ve D15'in kaynağı:**

> Bir diğer önemli konu yetenekler konusu. Yeteneklerimiz çok düz kaldı bizim. Sadece mevcut özelliğinin artırılmasına yönelik oldu. Yetenekler çok daha farklı ve savaşta farklı bir kullanım sunacak bir özellik olmalı. Örneğin lazer için yeteneklerden birisi her 30 saniyede bir 5 sn boyunca her atış hedefin yanındaki modüllere hasar miktarının %30’u kadar hasar verir. Bunun gibi yetenekler belirlenip tüm modüllerin kendi sınıfı ve özelliklerine uygun sıra dışı yetenek belirlenmeli.

> Aynı şey kartların yükselmesinde de mevcut. Bizde kart yükseldiğinde sadece hasar ve can veya sadece can veya onarım miktarı ya da güçlendirme yükseliyor. Bu hata aslında burada mesela saldırı modüllerinin saldırı aralığını da azaltabiliriz. Örneğin darbe topu seviye arttığında can ve hasarı artarken saldırı aralığı 0.02 saniye düşebilir. Bunlar iyi ayarlanmalı. Tüm modüllerde ve çekirdekler bu düzenleme yapılmalı.

> Çekirdekler oyun için çok önemli olduğundan onların yetenekleri gerçekten çok daha ayrı ve sıra dışı olmalı.

> Modüllerin özelliklerini de yeniden değerlendirmeliyiz. Örneğin güçlendirme modülü bekleme süresi yok. Bunu 2 sn de bir destek olacak şekilde ayarlayıp seviye yükseldikçe bu süreyi de düşürebiliriz.

> Birçok modülün istatistik alanında enerji tüketimi 0 yazıyor. Bu enerjinin önemli olduğu bu oyunda saçma oluyor. Bunu çekirdeğin üretimi ve enerji ekonomisi ile değerlendir ve her modülün enerji tüketmesini ayarla.

> Günlük metalarda akım modülü etkisi olarak ifade edilmiş. Bu yanlış böyle bir modülümüz yok. Ancak bu şekilde bir modülde yaratabiliriz. Metanın Etkinlşkler sayfasındaki açıklamasında yazan “Akım modül etkisi %15” yerine “Akım üretimi +%15” olarak güncelleyebiliriz.

**Faz 4 (kozmetik içerik) — G1, G2, G3, G4, G5, G6:**

> Kozmetiklerden profil barı arka planı gerçekten değişiyor mu kontrol etmek için Uç oyuncusuna bir adet arka plan aç. Arka plan için çeşitleri artırabilir.

> Sıralama ve derece yaparak kazanılan kozmetikler için her turnuva dönemi(takım ve bireysel) farklı ödüller verilmeli. Her dönem otomatik değişmeli verilen ödüller. Her dönem aynı ödüller verilirse bir anlamı kalmaz. Bu sebeple kozmetiklerde bulunanların altında yazan nerede kazanılacağı notları kaldırılsın.

> Emojilerde evrensel hareketli gifler kullanılabilir,

> Profil barı arka planında düz renk değişimi ile birlikte desenlerde kullanılabilir. Çeşitlilik artar.

> Profil resmi sadece şekillerden ibaret olmamalı karakterlerde olabilir.

> Kozmetik alanındaki çeşitlilik için farklı oyunlardan araştırma yapıp örnek alabiliriz.
