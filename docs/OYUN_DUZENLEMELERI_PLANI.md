# Oyun düzenlemeleri — iş planı

**Kaynak:** kullanıcının 12 Ekim 2026'da verdiği "Oyun Düzenlemeler" belgesi (iş bilgisayarında, masaüstünde; depoda değil). Maddeler aşağıya aktarıldı; bu dosya o belge olmadan da yeterlidir.

**Durum (12 Ekim 2026, akşam):** **Faz 1 ve Faz 2'nin bütün maddeleri uygulandı** (aşağıda `[x]`); hiçbiri commit edilmedi, yayınlanmadı, gerçek cihazda görülmedi. Faz 2 sunucu kodunu, sunucu verisini ve istemciyi birlikte değiştirir; yeni sunucu sürümü (r17) ve yeni paket (sürüm kodu 9) ister. **Sıradaki iş: Faz 2 düzeltmeleri (R1–R4, aşağıda), sonra Faz 3; yayın Faz 3'ten sonra** (kullanıcı kararı, 12 Ekim akşamı). Depo `2d59f8f`; canlıda sunucu r16, kapalı testte v8 paketi var ve gerçek test kullanıcıları oynuyor (Codex'in kaydı: `CODEX_CHECKPOINT.md`).

**Güncelleme (13 Ekim 2026, ev bilgisayarı):** Faz 1–3 ve görsel tur 1–5 commit edildi (`83f6052`); **görsel tur 6 uygulandı, commit bekliyor** (aşağıda kendi başlığında). Faz 4 başlamadı. Hiçbiri yayınlanmadı, gerçek cihazda görülmedi.

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
- Çekirdek maliyeti: 12 Ekim önerisi uygulanmıştı (parça toplamı109, Akı50×seviye). **25 Ekim yeni kullanıcı kararıyla yerini modüllerle ortak enderlik seviye tablosuna bıraktı.** Güncel tablo: `CEKIRDEK_ENDERLIK_SEVIYE_MALIYETLERI_20261025.md`.
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

### Gelir hesabı, çekirdek parçası kaynakları ve enderliğe göre parça (13 Ekim 2026, iş bilgisayarı; yayınlanmadı, gerçek cihazda görülmedi)

Kullanıcı D9 tablosunun sonucunu sordu ve gelirin tamamıyla hesaplanmasını istedi. Kendi cümleleri (kelimesi kelimesine):

> "günlük devre emirleri, günlük giriş ödülleri ve maç sayısına göre göre kazanılan deneyimlerin toplamı ile elde edilecek akı, devre kredisi hesabı ve tüm bunların hepsinden elde edilecek deneyim ile alınabilecek sezon ödüllerinden elde edilecek tüm gelirleri hesaplayarak çekirdek ve enderlik türüne göre modül maliyetleri bu kadar kısa sürede yükseliyormu?"

Hesap gösterildikten sonra kararı:

> "Çekirdek için devre yolunda arena ve lig  son ödüllere rastgele, günlük giriş ödüllerinin 1-2 tanesine, bronz, gümüş, altın sandıklara % 1-3-5 oranında çekirdek parçası, elmas sandık oranını 10 a çekebiliriz.
> Efsanevini parçada da ekonomide de daha yavaş olmalı.
> Sıradan, nadir, epik, efsanevi yükseltmeler bu sırayla zorlaşmalı ve uzun sürmeli.
> Deste dışında bulunan kartlarında yükselmesi lazım.
> Kriter destede bulunması değil enderlik sırası ve modülün açılıp açılmadığı."

İlk sayıları (çekirdek başına son seviye yaklaşık 4,7 yıl) görünce ikinci kararı:

> "Senin seçtiklerinden rastgele çekirdek tanımında açık olan rastgele çekirdek olacak. Çekirdeğin yükselmesi yine çok uzun sürüyor. Çekirdek ödül oranını değil ama ödüldeki çekirdek parçası sayısını artıralım."

**Hesap (koddan, beklenen değer; simülasyon ya da oyuncu verisi değil).** Ücretsiz oyuncu, günde 10 maç, %55 galibiyet, orta arena, bütün devre emirleri, günde 3 hediye sandık: Devre Kredisi günde 1.487 (maç 411, galibiyet sandığı 542, hediye sandık 180, giriş takvimi 96, sezon yolu 258), Akı günde 128 (devre emirleri 75), sezon deneyimi günde 468 (28 günde 13.090; son kademe 12.240). Reklam bonusu, Savaş Premium, ücretli geçiş, turnuva ödülleri ve Devre Yolu'nun tek seferlik ödülleri (136.960 kredi, 4.270 Akı, 1.412 modül parçası, 133 evrensel parça) hesaba girmedi.

**Bulgular (değişiklikten önce).**
- Çekirdek parçasının tek kaynağı Elmas Sandık'taki %6'ydı: 83 günde bir parça, bir çekirdeğin son seviyesi yaklaşık 25 yıl. D9'da parça toplamını 1.376'dan 109'a indirmek bunu çözmemişti.
- Giriş takvimi ve sezon yolu parçaları (günde 16) enderliğe bakmadan destedeki altı karta gidiyordu: efsanevi kartın parçası 107 günde, sıradan kartınki 269 günde doluyordu.
- Deste dışındaki kart yalnız sandıklardan parça alıyordu (ender kart günde 0,045).

**Uygulanan.**
- **Çekirdek parçası.** Sandıklar: Bronz %1, Gümüş %3, Altın %5, Elmas %10 (kullanıcının sayıları; `CHEST_DEFINITIONS`, `server/app/meta_progression.py`). Şans çıkınca verilen parça sayısı kademeyle artar: 1, 2, 3, 5 (`core_drop_shards`; mağazanın ödül listesi bu sayıyı gösterir). Giriş takvimi: 14. gün 10, 28. gün 15 parça (`LOGIN_CORE_SHARDS_BY_DAY`, `server/app/player_profile.py`). Devre Yolu: her arenanın son ödülü 3 parça; lig sandıkları 5, 5, 6, 6, 8, 8, 10; GRIDSHARD Sandığı 20 (toplam 104, tek seferlik; `server/app/arena_canon.py`). Parça, oyuncunun açık çekirdeklerinden rastgele birine gider (kullanıcı onayladı). İlk uygulamadaki sayılar (sandıkta hep 1; takvimde 3 ve 5; yolda 1, 2–5 ve 10) kullanıcının ikinci kararıyla büyütüldü; şanslar değişmedi.
- **Parça ödüllerinde ölçüt deste değil, enderlik ve açık olmak.** Giriş takvimi ve sezon yolu parçaları açık modüllerden rastgele birine gider; kartın enderliğine göre miktar küçülür: sıradan %100, ender %75, destansı %35, efsanevi %15 (`REWARD_SHARD_PERCENT_BY_RARITY`). Takvimde ve sezon yolunda görünen sayı o kartın gerçekten alacağı sayıdır (sunucu görünümü hesaplar). Devre Yolu'nun hedefsiz parça duraklarında miktar yazıldığı gibi kalır; ender kartın seçilme ağırlığı aynı oranlarla düşer. Sandıklar zaten enderliğe göre çekiyordu; değişmedi.
- **Giriş takvimi ve sezon yolu parça miktarları üç katına çıktı** (`REWARD_MODULE_SHARD_SCALE`): parça artık altı karta değil açık bütün modüllere bölünüyor; üç kat olmadan sıradan bir kartın son seviyesi 13 aydan 2 yıla, efsanevininki 11 yıla çıkıyordu.
- Yükseltme maliyetleri (D9 tablosu) **değişmedi**; Devre Kredisi sırası zaten sıradan < ender < destansı < efsanevi.

**Sonuç (aynı oyuncu, parça bakımından bir kartın süresi; gün).** Devre Kredisi ayrıca sınırlar: tek kart için 67 / 101 / 134 / 202 gün, 36 modülün tamamı için yaklaşık 12 yıl.

| Açık modül | Enderlik | Seviye 5 | Seviye 8 | Seviye 10 | Seviye 12 | Seviye 15 |
|---|---|---:|---:|---:|---:|---:|
| 6 (Arena 1) | Sıradan | 3 | 13 | 27 | 49 | 102 |
| 6 (Arena 1) | Ender | 3 | 15 | 31 | 55 | 113 |
| 16 (Arena 6) | Sıradan | 7 | 32 | 66 | 118 | 245 |
| 16 (Arena 6) | Ender | 9 | 41 | 83 | 149 | 308 |
| 36 (ligler) | Sıradan | 13 | 57 | 116 | 208 | 433 |
| 36 (ligler) | Ender | 21 | 90 | 184 | 328 | 680 |
| 36 (ligler) | Destansı | 34 | 140 | 284 | 500 | 1.030 |
| 36 (ligler) | Efsanevi | 49 | 196 | 392 | 695 | 1.430 |

Çekirdek: günde 1,23 parça (sandıklar 0,34, giriş takvimi 0,89). Tek çekirdek açıkken seviye 5 için 5, seviye 15 için 88 gün; yedi çekirdek açıkken çekirdek başına seviye 5 için 34, seviye 8 için 102, seviye 10 için 182, seviye 12 için 306, seviye 15 için 618 gün (Devre Yolu'nun 104 parçası hariç). İlk uygulamada günde 0,44 parçaydı (seviye 15 için 1.719 gün).

**Kullanıcının görmediği seçimler (Claude).** Giriş takviminde hangi günler ve kaç parça (14. gün 10, 28. gün 15); sandıktan çıkan parça sayısı (1, 2, 3, 5); arena son ödülünde 3, lig sandıklarında 5–10, GRIDSHARD Sandığı'nda 20 çekirdek parçası ve bunların hedefi (çekirdek başına son seviye yaklaşık 20 ay, ender bir modüle yakın); enderlik oranları (%100 / 75 / 35 / 15); giriş ve sezon parçalarının üç katına çıkması ve bunun hedefi (ligde sıradan kart yaklaşık 14 ay, ender 22 ay, destansı 34 ay, efsanevi 47 ay); Devre Yolu'nun hedefsiz duraklarında miktar yerine seçilme ağırlığının kullanılması; sandıklardaki modül parçası oranlarına ve Devre Kredisi tarafına dokunulmaması.

**Sınırlar.**
- Sayılar beklenen değerdir. İlk arenalarda parça birkaç karta yoğunlaştığı için süreyi Devre Kredisi belirler; 36 modülün tamamı için darboğaz yine Devre Kredisidir (6,7 milyon).
- Ücretli geçiş sezon yolu parçalarını iki katına çıkarır; hesaba girmedi.
- Alınmamış giriş ve sezon ödüllerinde görünen kart değişir (deste yerine açık bütün modüller); alınmış ödüller makbuzdaki kartı ve miktarı gösterir.
- Eski paket (v8) yeni sunucuyla: sandık oranlarını sunucudan okur, çekirdek parçasını ödül satırı olarak gösterir (istemci koduna bakarak çıkarım; v8 kaynağıyla denenmedi). İstemci kodu değişmedi.
- Sandıktan çıkan çekirdek parçası iade edilince kayıt silinmez, sıfıra iner; iade testlerinin üç düzeneğinde kayıt baştan açıldı (iade kuralı değişmedi).
- Telefon boyutunda Chrome'da görüldü: giriş takviminde çekirdek satırı ve mağazanın ödül listesinde çekirdek şansı ile parça sayısı. Sandıktan çekirdek parçasının çıktığı ve Devre Yolu ödülünün alındığı tarayıcıda, hiçbir şey gerçek cihazda görülmedi.

## Görsel tur 2: mağaza sandıkları, kaynak simgeleri, ödül görselleri, alt çubuk (13 Ekim 2026, iş bilgisayarı)

Kullanıcının isteği (kelimesi kelimesine):

> Şimdi sırada mağaza içeriklerinin de yeni görsel simge setine uydurulması var. Mağazada bulunan sandıklar yenilensin. Ancak devre yolundaki sanıkların aynısı olmasın. Aynı görsel dil olsun ama birebir aynısı olmasın. Akı ve Devre Kredisi görselleri aynı şekilde güncellenmeli. Ödül ekranındaki görseller, sezon ödüllerinin sandıkları da aynı şekilde güncellensin. Alt dock ta tıklanan butonun ismi yazsın ve buton biraz büyüsün. Kart puzzle parça şekilleri de aynı şekilde güncellenmeli. Savaş alanında yine bir güncelleme olacaksa yeni görsel dil ve tasarıma göre düzenlensin.
> Bunlardan sonra faz4 e geç.

Alt çubuk cümlesi iki türlü okunuyordu: (a) adı yalnız açık sayfanın düğmesi yazar, diğerleri yalnız simgedir; (b) adlar hep kalır. Kullanıcıya soruldu; yanıtı: **"sorunun cevabı a"**.

### Yapılanlar

- **Mağaza sandıkları** (Bronz, Gümüş, Altın, Elmas): lig sandıklarının diliyle (dolu gövde, metal, koyu kontur) ama ayrı bir sandık olarak yeniden çizildi. Kapağı kubbe değil pahlı düz kapak; ortasında tek geniş kuşak ve baklava kilit var. Kademe yükseldikçe süs artar: Bronz'da tahta oluklar, Gümüş'te köşebent ve perçin, Altın'da kapakta taç, Elmas'ta kapaktan çıkan kristaller. Çizim tek yerde (`shopChestSvg`, `client/src/app.js`); mağaza, posta kutusu, sezon yolu, ödül önizlemesi, turnuva ödülleri ve sandık açılışı aynı çizimi kullanır. Haftalık ve takım turnuvası sandıkları kendi renklerini korur; kilit taşı haftalıkta yıldız, takımda altıgendir.
- **Sandık açılışı:** mağaza sandığı açılırken kapağı tıkırdar, sunucu onaylayınca kalkar, içi aydınlanır ve ışınlar çıkar (eskiden üç kutudan oluşan çizimin kapağı dönüyordu). Hareket azaltma ve düşük grafik ayarında animasyonsuzdur.
- **Kaynak simgeleri:** Akı mor kristal, Devre Kredisi üstünde devre darbesi olan altın para oldu; halka ve ince çizgi kalktı. Aynı takımda Akım (şimşek), deneyim (mavi yıldız), kupa, çekirdek parçası, takım puanı, sandık ve ücretli ürün simgesi de yeniden çizildi (`RESOURCE_TOKEN_SVG`). Üst bar, ödül satırları, Yükselt düğmesindeki bedel, mağaza paketleri, günlük emirler, Devre Yolu durakları ve maç sonu ödülleri aynı çizimi gösterir.
- **Mağaza fiyatları:** sandık satın alma düğmesinde "2000 DK" / "500 Akı" yazısı yerine kaynağın simgesi ve sayı var; adı ekran okuyucu etiketinde durur.
- **Ödül sayfaları:** Günlük Ödüller, Günlük Devre Emirleri ve Sezon Ödülleri yukarıdaki simgeleri ve sandıkları kullanır. Ödül bölümleri sayfasındaki üç satırın solunda kendi simgesi var (takvim, hedef, kupa).
- **Alt çubuk (a):** adı yalnız açık sayfanın düğmesi yazar; o düğme genişler, yukarı doğru uzar ve simgesi büyür. Diğer dört düğme yalnız simgedir; adları `aria-label` ve `title` ile durur. Devre Yolu ya da ödül sayfaları gibi alt çubukta karşılığı olmayan bir sayfa açıkken hiçbir düğme ad yazmaz.
- **Yapboz parçası:** modül ve evrensel parça dolu çizilir (sınıf renginde gövde, altta gölge, üstte ışık, koyu kontur, beyaz simge); eskiden koyu zeminde renkli çizgiydi.
- **Savaş alanı:** Akım göstergesinin simgesi ve maç sonu ödül ekranındaki dört simge (kupa, Devre Kredisi, deneyim, takım puanı) ile Savaş Premium rozeti yeni takıma çekildi. Savaş kuralına, yerleşime ve karttaki "ϟ" bedel işaretine dokunulmadı.

### Kullanıcının görmediği seçimler (Claude)

Sandığın biçimi ve her kademenin süsü; sandık, simge ve parça renkleri; Akı'nın kristal, Devre Kredisi'nin para olarak çizilmesi; açık düğmenin ne kadar büyüdüğü (genişlik 1,62 kat, yükseklik 50 → 60 piksel, simge 33 → 36 piksel); mağaza fiyatının simgeyle yazılması; ödül bölümleri satırlarına simge eklenmesi; maç sonundaki kupa emojisinin çizime çevrilmesi; karttaki "ϟ" işaretinin olduğu gibi bırakılması. Kullanıcı yalnız ilk ekran görüntüsünü (mağaza ve alt çubuk, 360×640) gördü.

### Doğrulama (13 Ekim, iş bilgisayarı)

- İstemci 354 geçti, 2 atlandı (yeni dosya `client/tests/visual-pass-2-tokens-chests.test.js`, 9 test; `visual-pass-icons-chests.test.js` içinde üç test yeni görünüme göre güncellendi). `tools/release_guard.py` geçti. Sunucu kodu bu turda değişmedi; sunucu testleri yeniden koşulmadı.
- Telefon boyutunda Chrome'da, yerel sunucuyla (`artifacts/gorsel-tur2-20261013/verify-tur2.js`, git'te izlenmez): 360×640, 320×568 (Android'in en küçük yazı boyu taklidiyle), 393×852, İngilizce 360×640 ve İngilizce 320×568 (en küçük yazı boyu); beşinde de 79 denetimin hepsi geçti (alt çubuğun beş sayfası, üst bar, dört sandık ve fiyat düğmeleri, hediye sandığın gerçekten açılması, yapboz parçaları, ödül bölümleri, 28 günlük takvim, emirler, sezon yolu ve önizlemesi, yatay taşma, konsol hatası).
- Ayrıca tarayıcıda bakıldı: Devre Yolu durakları, haftalık turnuva sıralamasındaki ödül sandıkları, savaş ekranındaki Akım göstergesi, maç sonu ödül ekranı (maç teslim olunarak bitirildi).
- **Gerçek cihazda hiçbir şey görülmedi.** Takım turnuvası sandıkları, posta kutusundaki sandık ve indirim günündeki üstü çizili fiyat tarayıcıda görülmedi (ilki yalnız stil ölçümüyle, diğerleri yalnız kod ve testle).

## Görsel tur 3: mağaza, sayfalar, pencereler, ilk oyun deneyimi, ev ekranı (13 Ekim 2026, iş bilgisayarı, beşinci oturum)

Kullanıcının isteği (kelimesi kelimesine; ekinde mağazanın 360×640 ekran görüntüsü vardı):

> Mağazada arka plan açık mavi ve desen, sandıkların yerleştiği düz koyu mavi alan var vs. aşağı doğru kaydırdıkça bu düz renkler devam ediyor. Mağaza tasarımını düzenlemek lazım gibi.
> İlk Oyun Deneyimi ekranlarında da yeni görsel dile göre güncellenecek bir şeyler varsa onu da yapalım.
> Mesaj kutusu yanında bulunan üç çizgi içerisindeki sekmelerde de yeni görsel dile göre güncelleme varsa kontrol et.
> Gerekirse yazı tipinde de güncelleme yapabilirsin.
> Oyunda bulunan geri butonlar ve diğer buna benzer buton, hücre alan vs. yeni görsel dille hazırlanmalı.
> Diğer yapay zeka aracının önerileri;
> Renklerin anlamını tutarlılaştıralım. Yansıtıcı'nın üstteki "EPİK" etiketi altın, aşağıdaki enderlik göstergesi mor. Epik mor, efsanevi altın olarak aynı dili kullansın. Devre Yolu'nda da "Lider Panosu" düğmesi biraz daha sakin olabilir; asıl vurgu ödülün AL düğmesinde kalsın.
> Ana ekrandaki orta boşluğu biraz kısaltalım. Lig kartı ile deste arasında geniş bir alan var. Merkezdeki Çekirdek görseli de büyük panelin içinde oldukça sade kalıyor; burada biraz daha karakterli bir simge iyi çalışır.
> Sayısal bilgileri daha kolay okutalım. "500 + 0 evrensel / 28" ilk bakışta zor çözülüyor. Parça ve evrensel stoklarını ayrı göstermek; stat değişimlerini de "−0,01 sn" gibi birimleriyle yazmak daha net olur.

### Yüzey dili (bu turda adı kondu)

Zemin desenlidir; üstünde duran her şey dolu bir nesnedir. Dört yapı taşı var (`client/src/canon.css` sonunda "Görsel tur 3" bloğu):

- **Levha:** yükseltilmiş panel (mavi geçişli gövde, açık üst kenar, koyu kontur, altta dudak). Kartlar, satırlar, pencereler.
- **Yuva:** levhanın içine gömük hücre (koyu, iç gölgeli). Değer kutuları, giriş alanları, etkin olmayan sekme ve düğme.
- **Düğme:** kalın gövde, alt dudak; basınca iner. Rengi işini söyler: **altın** ana eylem ve hazır ödül (BAŞLA, İLERİ, DEVAM, hediye sandık), **yeşil** satın alma ve ödül alma, **mavi** gezinme (geri, Lider Panosu), **turkuaz** seçili sekme ve ikincil eylem, **kırmızı** kapatma ve silme.
- **Şerit:** bölüm başlığı (renkli bant, solunda simge).

Düz koyu bölüm kutuları kalktı; renk nesnelerden geliyor.

### Yapılanlar

- **Mağaza:** iki bölümün düz koyu kutusu kalktı, başlıklar şerit oldu (sandıklar mavi, premium mor). Sandık kartı kademe renginde levha: üstte ad plakası, ortada büyüyen sandık çizimi (84×72), altında günlük hak rozeti ve düğme. Satın alma düğmesi yeşil, hediye altın; bakiye yetmeyince düğme gömük görünür. Paket kartlarında simge ortada ve büyük pakette daha büyük; bonus altın rozet; fiyat düğmesi yeşil. Sezon geçişi ve Savaş Premium mor gövdeli, altın çerçeveli geniş kart; fiyat düğmesi kartın altında tam genişlikte. Alt başlıklara (Akı Paketleri, Devre Kredisi Paketleri) simge eklendi. ÖDÜL LİSTESİ sekmesi şeridin sağ ucunda küçük düğme oldu. İndirim etiketi kartın köşesinde kırmızı rozet.
- **Üç çizgi menüsünün sayfaları:** Kozmetik (sekmeler, seçenek karoları; seçili altın çerçeveli), Ödüller (üç bölüm düğmesi; Günlük Giriş Ödülleri, Günlük Devre Emirleri ve Sezon Ödülleri sayfalarında şerit başlık, levha kartlar, yuva hücreler), Arkadaşlar (şerit başlık, sekmeler, arama alanı), Ayarlar (dört sekme, form levhaları, giriş alanları; Hesap ve Gizlilik bölümü dahil; silme düğmesi kırmızı). Profil sayfası ve içindeki istatistikler de aynı dile çekildi.
- **Geri düğmesi:** "← ÖDÜL BÖLÜMLERİ" mavi düğme oldu ve liste kayarken sayfanın sol altında sabit durur (eskiden 28 günlük takvimin en sonundaydı). Devre Yolu'ndaki geri düğmesi de aynı.
- **Günlük giriş takvimi:** ödül satırlarının yazısı büyüdü (yaklaşık 6 pikselden 10 piksele), satırlar yuva oldu.
- **Kartlar sayfası:** deste paneli levha; sınıf sekmeleri ve MODÜLLER / ÇEKİRDEK düğmeleri yeni sekme görünümünde; Bilgi mavi, Seç yeşil. Kart karolarına dokunulmadı.
- **Etkinlik sayfası:** günlük meta kartı ve iki turnuva düğmesi levha; ok işareti altın rozet.
- **Pencereler:** hesap (ilk açılış), günlük meta, mesaj kutusu, ödül listesi, sandık açılışı, unvanlar ve modül tanıtımı pencereleri levha gövdeli; düğmeleri yukarıdaki renk kuralıyla.
- **İlk oyun deneyimi:** rehber kartı altın çerçeveli levha, İLERİ / BAŞLA altın düğme, ilerleme çubuğu kalın ve yeşil, "GÖSTERİLEN YERE DOKUN" turkuaz rozet, ok ve hedef halkası koyu konturlu. Savaş sırasındaki eski ipucu kartı da aynı görünümde.
- **Yazı:** yazı tipi ailesi değişmedi. En küçük düğme yazıları 8 piksele çıkarıldı (sekmeler, emir ve sezon düğmeleri, hesap düğmeleri); Kartlar'daki altı sınıf sekmesi dar ekranda sığması için gövde yazı tipiyle (Rajdhani) yazılıyor.

### Diğer aracın önerileri

- **Enderlik rengi tek dil:** sıradan çelik, ender mavi, destansı mor, efsanevi altın. Bilgi penceresinde adın altındaki etiket rozet oldu ve enderliğin renginde (eskiden hep altındı); kimlik satırındaki simge de aynı renkte (eskiden hep altındı). Çekirdek penceresinde de aynı.
- **Devre Yolu:** Lider Panosu altından sakin maviye çekildi; geri düğmesi mavi.
- **Ev ekranı:** lig kartı ile deste arasındaki boş satır kalktı (360×640'ta 98 pikselden 12 piksele, 393×852'de 269 pikselden 12 piksele); artan yükseklik deste paneline gitti. Panelin ortasında artık çizilmiş bir Çekirdek amblemi var: altıgen metal yuva, içinde çekirdeğin renginde kristal ve çekirdeğe özgü işaret (yedi çekirdek için ayrı); arkasında dönen iki yörünge. Hareket azaltma ve düşük grafik ayarında durur. Seviye etiketi altın rozet.
- **Sayılar:** bilgi penceresinde kartın parçası "500 / 28" diye yalın yazılıyor, evrensel parça yanında ayrı rozette (simgesi ve sayısı). Bir sonraki seviyenin farkı değerin birimiyle yazılıyor: "−0,01 sn", "+%0,63", "+0,4/sn"; azalan değerde eksi işareti (−).
- Ayrıca düzeltildi (denetimde çıktı): 320 piksel genişlikte ev ekranındaki altıncı deste kartı panelden 5 piksel taşıyordu (bu turdan önce de öyleydi); sütunlar artık esniyor.

### Kullanıcının görmediği seçimler (Claude)

Bütün renkler ve biçimler; düğme renklerinin anlamı; şerit renkleri (sandık mavi, premium mor, günlük ödül turuncu, emirler kırmızı, arkadaş yeşil); premium kartların mor gövdesi ve düğmenin alta inmesi; "Temel paket" etiketinin yalın, bonusun rozet olması; geri düğmesinin sol altta sabit durması; Çekirdek ambleminin çizimi ve işaretleri; ev ekranında artan yüksekliğin deste paneline verilmesi; Lider Panosu'nun mavi olması; evrensel parçanın rozet olarak gösterilmesi ve ilerleme çubuğunun iki stoğun toplamını göstermeye devam etmesi; yazı tipi ailesinin değiştirilmemesi. **Kullanıcı bu turdan hiçbir ekran görüntüsü görmedi.**

### Yapılmayanlar ve açık noktalar

- **Yazı tipi ailesi:** başlık yazı tipi Orbitron'da ğ, ş ve İ yok; bu harfler yedek yazı tipiyle çiziliyor (`client/src/fonts.css` başındaki not). Türkçe harfleri olan bir başlık yazı tipine geçmek yeni dosya indirmeyi gerektirir (lisans okunur, kullanıcı onayı alınır) ve bütün ekranların yeniden ölçülmesini ister; bu turda yapılmadı.
- Savaş ekranına, kart karolarına, takım sayfasının içine (takımı olan hesap), haftalık ve takım turnuvası ayrıntı sayfalarına, lider panosu ve oyuncu profili pencerelerinin içine dokunulmadı. Devre Yolu duraklarındaki AL düğmesi değişmedi.

### Doğrulama (13 Ekim, iş bilgisayarı)

- İstemci 366 geçti, 2 atlandı (yeni dosya `client/tests/visual-pass-3-surfaces.test.js`, 12 test; `card-upgrade-indicators.test.js` ve `visual-pass-icons-chests.test.js` farkın birimiyle yazılmasına göre güncellendi). `tools/release_guard.py` geçti. Sunucu kodu bu turda değişmedi; sunucu testleri yeniden koşulmadı.
- Uçtan uca (yerel sunucu, kurulu Chrome): Android öykünmesi 9/9 (`onboarding`, `settings-layout`, `mobile-battle` 2/2, `startup-loading` 5/5); masaüstü 4/4 (`menu-navigation` 2/2, `beta33-season`, `battle-density`). `two-client-pvp` koşulmadı. Android koşusunun ilk testleri son iki küçük stil düzeltmesinden önce koştu (ev ekranı kuralının 600 pikselden geniş ekranlara da açılması; 340 pikselden dar ekranda deste sütunlarının esnemesi); ikisi de o testlerin ekran genişliğinde görünümü değiştirmez (Claude'un değerlendirmesi), Android koşusu yinelenmedi.
- Telefon boyutunda Chrome'da (`artifacts/gorsel-tur3-20261013/verify-tur3.js`, git'te izlenmez): 360×640, 320×568 (Android'in en küçük yazı boyu taklidiyle), 393×852, İngilizce 360×640 ve İngilizce 320×568 (en küçük yazı boyu); beşinde de 85 denetimin hepsi geçti. Kapsam: ev ekranının ölçüleri ve amblem; Devre Yolu düğmeleri; mağazanın kartları ve düğmeleri (bakiyesi yeten hesapla); bilgi penceresinde enderlik rozeti, parça ve evrensel parça, birimli fark (Lazer ve Yansıtıcı); on bir sayfada yatay taşma, düğme yazılarının kırpılmaması ve en az 8 piksel olması; takvimde alınabilir ödülün altın düğmesi; geri düğmesinin liste ortasında görünmesi; mesaj kutusu; hesap ve günlük meta pencereleri; rehberin ilk beş adımı; konsol hatası. Bakiye ve parça sayıları yalnız görüntüde değiştirildi (sunucunun yanıtı tarayıcıda düzenlendi; sunucu kaydı aynı kaldı).
- Denetimin yakaladığı ve düzeltilen kusurlar: 320 pikselde Kartlar'daki "Savunma" sekmesinin yazısı sığmıyordu; aynı genişlikte ev ekranında altıncı deste kartı panelden taşıyordu (bu turdan önce de); masaüstü genişliğinde amblem destenin üstüne biniyordu (ev ekranı kuralı yalnız dar ekrana yazılmıştı).
- Ayrıca bakıldı: masaüstü boyutunda (1280×800) beş sayfa, taşma yok; yedi Çekirdek amblemi yan yana (`sheet-emblems.png`).
- Tarayıcıda görülmeyenler: indirim günü rozeti ve üstü çizili fiyat; alınabilir emir ve alınabilir sezon ödülü düğmeleri; dolu mesaj kutusu kartı; takımı olan hesabın takım sayfası; modül tanıtımı ve unvanlar pencereleri; hesabı bağlı oyuncunun Ayarlar bölümleri; savaş sırasındaki eski ipucu kartı; ender ve efsanevi enderlik rozeti (sıradan ve destansı görüldü); ev ekranında Rezonans dışındaki altı amblem (yalnız yan yana çizimde görüldü). `dist/` derlemesi yeniden üretilmedi.
- **Gerçek cihazda hiçbir şey görülmedi.** Ekran görüntüleri: `artifacts/gorsel-tur3-20261013/shots/` (beş yapılandırma), özet sayfalar aynı klasörde `sheet-final.png`, `sheet-v1.png` (yalnız iş bilgisayarında).

## Görsel tur 4: tur 3'e kullanıcının yanıtı (13 Ekim 2026, iş bilgisayarı, altıncı oturum; uygulandı, yayınlanmadı, gerçek cihazda görülmedi)

Kullanıcı görsel tur 3'ün dört özet görüntüsünü gördü ve şunu yazdı (kelimesi kelimesine):

> Ev butonu ile takım butonu aynı renk olmuş onu düzeltelim.
> Ana ekran çekirdek tasarımı çok büyümüş, pixselini düşürelim bir kısmı modül kartlarının arkasına inebilir. devre yolu ile savaş destesi arasında bir kısım boşluk kalabilir. arka plan tasarımını güzelleştirebilirsin. Eğer yazı tipi indirmen gerekiyorsa lisansı olan ve kullanımında skkıntı olmayan bir yazı tipi indirebilirsin.
> Yapmadıklarım alanında saydıklarınıda yap. profilde yer alan devre koleksiyonu alanında da düzenleme gerekli gibi. Çokta çocuksu görüntüye düşmeyelim profesyonel dokunuşunu yap. Bunlardan sonra yeni bir sayfada faz 4 e geçeceğiz

"Yapmadıklarım alanında saydıkların" şu listedir (Claude'un tur 3 sonundaki yanıtından, kelimesi kelimesine): **Dokunmadığım yerler:** Savaş ekranı, kart karoları, takımı olan hesabın takım sayfası, turnuva ayrıntı sayfaları, Devre Yolu'ndaki AL düğmesi. **Tarayıcıda göremediklerim:** İndirim günü rozeti, alınabilir emir ve sezon ödülü düğmeleri, ender ve efsanevi rozet.

**Neden beşinci oturumda başlanmadı:** yanıt geldiğinde bağlam 462 bin belirteçti, haftalık hak %65 (tur 3, 75 bin belirteçlik bağlamdan başlayıp hakkın %5'ini kullandı). Bu tur tur 3'ten büyük (savaş ekranı ve yazı tipi değişimi bütün ekranların yeniden ölçülmesini ister) ve bu bağlamda her adım taze oturumdakinin katlarına mal olur. Hiçbir kod değişmedi; iş aşağıdaki planla yeni oturumda yapılır.

### Plan (Claude'un okuması; her maddede önce yukarıdaki cümleye bakılır)

1. **Alt çubuk:** Ev ve Takım düğmeleri bugün ikisi de yeşil-turkuaz. Biri ayrılır (öneri: Ev markanın turkuazında kalır, Takım başka bir renge geçer; ilk ekran görüntüsünde gösterilir). Yer: `client/src/canon.css`, "Alt çubuk: ayrık hücreler, renkli simgeler" bölümü.
2. **Ev ekranı:** amblem küçülür (bugün 360×640'ta 126, 393×852'de 210 piksel; kural "Görsel tur 3" bloğunda, `.home-core-hero-glyph.is-emblem` ve `.home-core-hero` dolgusu). Bir kısmı deste kartlarının arkasına inebilir. Lig kartı ile deste paneli arasına boşluk geri gelir (bugün ızgaranın üçüncü satırı `0`). Panelin arka planı güzelleştirilir (kullanıcı serbest bıraktı).
3. **Profil, Devre Koleksiyonu:** `.profile-honor-showcase` (Sıralama Kupaları ve Rozetler) yeniden düzenlenir; bugün iki küçük kutu ve çok küçük yazı var. Veri: `PROFILE_RANK_TROPHIES`, `PROFILE_BADGES` (`client/src/app.js`).
4. **Dokunulmayan yerler:**
   - Savaş ekranı. Okuma: yalnız yüzey (renk, kontur, gölge, düğme görünümü); yerleşim, ölçü ve savaş kuralı değişmez (`e2e/battle-density.spec.js` ve `e2e/mobile-battle.spec.js` ölçü sınar). Önce bir ekran görüntüsü gösterilir.
   - Kart karoları (`.collection-module-tile`, `unifiedModuleTile`).
   - Takımı olan hesabın takım sayfası (düzenek: `gridshard-team-probe-server`, kapı 8882; iskelet `artifacts/oyun-duzenlemeleri-20261012/tools/verify-g9-g10.js`, yalnız iş bilgisayarında).
   - Turnuva ayrıntı sayfaları (`#weekly-event-screen`, `#team-event-screen`), lider panosu ve oyuncu profili pencereleri.
   - Devre Yolu'ndaki AL düğmesi (`.arena-reward-node`, alınabilir durak).
5. **Görülmeyen durumlar tarayıcıda görülür:** indirim günü rozeti ve üstü çizili fiyat, alınabilir emir ve alınabilir sezon ödülü düğmeleri, ender ve efsanevi enderlik rozeti, dolu mesaj kutusu kartı (sunucu yanıtı tarayıcıda düzenlenerek; `verify-tur3.js` içindeki `context.route` örneği).
6. **Yazı tipi:** başlık yazı tipi Orbitron'da ğ, ş ve İ yok. Öneri: Oxanium (Google Fonts, SIL Open Font License 1.1; Latin ve genişletilmiş Latin). İndirmeden önce lisans metni okunur ve Türkçe harflerin gerçekten bulunduğu doğrulanır; dosya adı, kaynak ve boyut kullanıcıya söylenir. **İndirme izni bu oturumun sohbetinde verildi; yeni oturumda kullanıcı sohbette yinelemeden indirme yapılmaz** (yanıtta kullanıcıdan açılış cümlesine eklemesi istendi). Dokunulacak yerler: `client/assets/fonts/` (dosyalar ve `OFL-*.txt`), `client/src/fonts.css`, `--gs-font-display` (`client/src/styles.css`), Ayarlar → Hesap ve Gizlilik → Açık kaynak lisansları, yazı tipi dosyalarını sayan testler ve derleme listeleri (aranacak: `orbitron`). Değişimden sonra bütün ekranlar yeniden ölçülür (`verify-tur2.js`, `verify-tur3.js`, uçtan uca testler; savaş ekranı dahil).
7. **"Çokta çocuksu görüntüye düşmeyelim profesyonel dokunuşunu yap":** okuma: bu turun bütün işleri için ölçü, ayrıca tur 3'ün kalın konturu, alt dudağı ve parlak geçişleri bir kademe sakinleştirilir. Yaygınlaştırmadan önce tek ekranda (mağaza) önce-sonra görüntüsü kullanıcıya gösterilir. Faz 4 çizimleri için de geçerli sayılır (Claude'un yorumu).
8. Doğrulama, belgeler, devir notu. **Faz 4 bundan sonra, ayrı bir yeni oturumda** (kullanıcı: "Bunlardan sonra yeni bir sayfada faz 4 e geçeceğiz").

### Altıncı oturumda gelen ek istekler (kullanıcı, kelimesi kelimesine)

Oturumun açılış mesajı:

> checkpoint oku, yazı tipini indirebilirsin.
> Ana ekrandaki çekirdekler için yaptığın yeni tasarımlar kartlar/çekirdekler alanında da aynı olması. hatta savaş alanında da aynı görüntü ve efektleri kullanmalı. Ona göre profesyonel dokunuşu yapalım.

İş sürerken (önizleme penceresinden ara halleri görerek):

> kartlar/çekirdek alanında rezonans çekirdeği ile diğer çekirdeklerin kutuları farklı boyutlarda rezonans çekirdeği de aynı boyuta taşınsın.
> Savaş alanında ortadaki çekirdek hücresinde ortalanmamış görünüyor. bu tür hataları görüp teslim etmeden tamamlamalısın

> savaş alanındaki emoji yuvarlağını savaş alanı içine sağ alt köşeye taşısak daha mı güzel olur.

### Yapılanlar

- **Tek Çekirdek amblemi.** Ev ekranındaki çizim artık çekirdeğin göründüğü her yerde: Kartlar → Çekirdek (seçili çekirdek ve yedi karo), çekirdek bilgi penceresi (amblem solda, ad ve enderlik sağında), savaş alanı (iki tarafın çekirdek hücresi; rakibin çekirdeği kendi türünün amblemiyle, tür sunucunun zaten gönderdiği `core_type` alanından), Çekirdek gücü düğmesinin ortası, maç sonu kartı, profildeki deste kartı, Devre Yolu'nda "bu arenada açılan çekirdek", ödül satırlarındaki çekirdek parçası (yalnız gövde). Hareket de aynı: dönen iki yörünge ve yanıp sönen parıltı. Amblem üç katman oldu (yörünge, gövde, parıltı; `coreEmblemMarkup`, `mountCoreEmblem`): hareket ayrı katmanda döner, gövde yeniden çizilmez; hareket azaltma ve düşük grafik ayarında durur. Kilitli çekirdeğin ve yok edilmiş çekirdeğin amblemi dönmez. Eski tek harfli simgeler (◈ ⬡ ϟ …) çekirdek için kalmadı.
- **Savaşta çekirdek hücresi.** Amblem hücrenin tam ortasında (iki eksende, ölçülerek; ilk halinde 2 piksel sağdaydı, kullanıcı gördü). Neden: kart bir ızgara ve simge sütun 1'e bağlıydı; amblem ızgara yerleşiminden çıkarıldı ve dört kenardan %12 içeri çekildi.
- **Kartlar → Çekirdek karoları aynı boyda.** Tek çekirdekli enderlik grubunda karo yarım genişlikte ve ortadaydı (Rezonans); artık diğerleriyle aynı.
- **Emoji düğmesi** savaş alanının içine, sağ alt köşeye taşındı (`#duel-arena` içinde; 29 → 34 piksel). Akım satırının üstünden kalktı. Tepsi yine düğmenin üstünde açılır.
- **Profesyonel dokunuş.** Tur 3'ün yüzey dili bir kademe sakinleşti ve tur 3 stil bloğu bu ölçülerle yeniden yazıldı: kontur 1,5–2 → 1 piksel; alt dudak 3–6 → 2 piksel ve çevresindeki koyu halka kalktı; üst parlama ve iç gölge hafifledi; geçişlerde üst renk alta yaklaştı ve doygunluk biraz indi (parlak "şeker" görünümü gitti); köşe yarıçapları yaklaşık %80; renkli çerçeve 2 → 1,5 piksel; düğme basınca 2 yerine 1 piksel iner. Üst bar, alt çubuk, ev ekranındaki lig kartı ve SAVAŞ düğmesi de aynı ölçülere çekildi.
- **Yazı tipi: Oxanium.** Başlık ve düğme yazısı Orbitron'dan Oxanium'a geçti (SIL Open Font License 1.1; Google Fonts'tan iki dosya: `oxanium-200-800-latin.woff2` 14.044 bayt, `oxanium-200-800-latin-ext.woff2` 7.824 bayt; lisans metni `OFL-Oxanium.txt` 4.384 bayt, kaynak `github.com/google/fonts`). Türkçe harflerin hepsi (ğ, ş, İ, ı dahil) kendi çiziminde; indirmeden sonra Chrome'da ölçülerek doğrulandı. Oxanium dar olduğu için `size-adjust:%109` ile çizilir; böylece yüzlerce yazı boyu yeniden yazılmadı. Orbitron yalnız GRIDSHARD marka yazısında kaldı (açılış ekranı ve ev ekranının başlığı; `--gs-font-brand`). Lisans metni oyunun içinde de var (Ayarlar → Hesap ve Gizlilik → Açık kaynak lisansları).
- **Alt çubuk:** Takım düğmesi mor (Ev ile aynı yeşil-turkuazdaydı). Beş düğme: altın, mavi, turkuaz, mor, pembe.
- **Ev ekranı:** amblem küçüldü (360×640'ta 126 → 93 piksel; 393×852'de 210 → 124 piksel; en çok 132) ve alt kısmı deste tepsisinin arkasına iniyor; lig kartı ile panel arasında boşluk var (360×640'ta yaklaşık 50 piksel); ekran uzadıkça yükseklik boşluk ile panel arasında paylaşılır, panel 290 pikselde durur. Panelin zemini: çekirdeğin renginde ışık ve kenarlara doğru sönen ince altıgen ızgara. Uzun ekranda (700 piksel ve üstü) amblemin üstünde çekirdeğin adı yazar.
- **Profil, Devre Koleksiyonu:** iki küçük kutu ve "henüz kazanılmadı" satırı yerine yedi yuva: üç sıralama kupası ve dört rozet. Kazanılan kendi renginde (altın, gümüş, bronz, turkuaz) ve çerçeveli, kazanılmayan soluk. Simgeler çizim (emoji ve yıldız karakteri yerine). Başka oyuncunun profilinde de aynı.
- **Dokunulmayan yerler:**
  - Savaş ekranı (yalnız yüzey; yerleşim, ölçü, kural aynı): raf levha, Akım satırı yuva, raf kartları ve devredeki modüller levha karo, rakip destesi ve VS rozeti aynı dilde; maç sonu kartları ve ödül ekranı levha, DEVAM altın.
  - Kart karoları: levha gövde, üst kenarda sınıf renginde bant, simge neon parlamasız.
  - Takımı olan hesabın takım sayfası: desenli zemin, kimlik kartı ve bölümler levha, değerler iki sütunlu yuva ızgarası (eskiden her değer ayrı uzun satırdı), üye ve istek satırları yuva, sekmeler ve düğmeler renk kuralıyla (kur / başvur / iste yeşil, ayrıl / reddet kırmızı, kaydet / davet turkuaz). Takımsız hesabın liste ve kurma ekranları da.
  - Turnuva ayrıntı sayfaları: başlık şerit (haftalık mavi, takım mor), kurallar ve takvim levha, değer kutuları ve sıralama satırları yuva, ilk üç sıra altın / gümüş / bronz, katılma düğmesi altın, sekmeler eşit bölünür.
  - Devre Yolu: lig sandığının AL düğmesi yeşil; alınabilir durak altın çerçeveli levha ve üstünde yeşil AL rozeti.
- **Görülmeyen durumlar görüldü:** indirim günü (köşe rozeti, üstü çizili fiyat), alınabilir emir (gerçek: iki kısa savaşla "2 savaş tamamla" emri tamamlandı), alınabilir sezon ödülü (yalnız görüntüde taklit; aşağıda), ender ve efsanevi enderlik rozeti, alınabilir Devre Yolu durağı ve lig sandığı.

### Kullanıcının görmediği seçimler (Claude)

Sakinleştirmenin bütün ölçüleri (kontur, dudak, yarıçap, renk); Oxanium'un seçimi (beşinci oturumda önerildi, kullanıcı indirme izni verdi), %109 büyütme ve marka yazısının Orbitron'da kalması; Takım düğmesinin moru; ev ekranındaki ölçüler, panelin altıgen zemini ve çekirdek adının eklenmesi; amblemin maç sonu, profil, Devre Yolu ve ödül satırlarına da konması (kullanıcı Kartlar → Çekirdek ve savaş alanını saydı); Devre Koleksiyonu'nda kazanılmamış kupa ve rozetlerin de soluk gösterilmesi ve çizimleri; takım istatistiklerinin iki sütuna alınması; Devre Yolu durağına AL rozeti eklenmesi; emoji düğmesinin 34 piksel olması. Kullanıcı oturum ortasında iki ilk bakış görüntüsü gördü (ev, mağaza önce-sonra, çekirdekler, savaş) ve ayrıca önizleme penceresinden ara halleri izledi; takım, turnuva, profil ve Devre Yolu'nun son halini görmedi.

### Yapılmayanlar ve açık noktalar

- **Dolu mesaj kutusu kartı** yine görülmedi (yanıtın biçimi okunmadı).
- **Alınabilir sezon ödülü** gerçek veriyle görülmedi: emirler ve sezon canlı bağlantıdan geldiği için yanıt düzenlenerek taklit edilemedi; ilk kilitli hücre tarayıcıda "alınabilir" yapılıp düğmenin görünümü ölçüldü (sunucuya istek gitmedi).
- İndirim günü, alınabilir Devre Yolu durağı ve lig sandığı, kazanılmış kupa ve rozetler, bakiye ve parça sayıları yalnız görüntüde değiştirildi (sunucunun yanıtı tarayıcıda düzenlendi; sunucu kaydı aynı kaldı).
- Lider panosu ve oyuncu profili pencerelerinin içi ayrıca ele alınmadı (profil penceresindeki koleksiyon ve çekirdek amblemi ortak koddan geliyor; pencere tarayıcıda açılıp bakılmadı).
- Savaşta yedi çekirdekten yalnız Rezonans görüldü (yeni hesap); diğer altısının amblemi savaşta ve karolarda kilitli halde görüldü.
- `dist/` derlemesi yeniden üretilmedi. **Gerçek cihazda hiçbir şey görülmedi.**

### Doğrulama (13 Ekim, iş bilgisayarı)

- İstemci 379 geçti, 2 atlandı (yeni dosya `client/tests/visual-pass-4-emblem-surfaces.test.js`, 13 test; `visual-pass-3-surfaces.test.js` ve `embedded-fonts.test.js` yeni değerlere göre güncellendi). `tools/release_guard.py` geçti. Sunucu kodu bu turda değişmedi; sunucu testleri yeniden koşulmadı.
- Uçtan uca (yerel sunucu, kurulu Chrome): Android öykünmesi 9/9 (`onboarding`, `settings-layout`, `mobile-battle` 2/2, `startup-loading` 5/5); masaüstü 5/5 (`menu-navigation` 2/2, `beta33-season`, `battle-density`, `beta381-battle-events`). `two-client-pvp` koşulmadı. Masaüstü boyutunda (1280×800) savaş ekranına da bakıldı: iki çekirdek amblemi hücrenin ortasında, emoji düğmesi alanın sağ alt köşesinde.
- Telefon boyutunda Chrome'da (`artifacts/gorsel-tur4-20261013/run-all.sh`, git'te izlenmez): 360×640, 320×568 (Android'in en küçük yazı boyu taklidiyle), 393×852, İngilizce 360×640 ve İngilizce 320×568 (en küçük yazı boyu); her birinde 84 denetim (ev 14, çekirdek ve savaş 16, diğerleri 54), beşinde de hepsi geçti. Kapsam: ev ekranının ölçüleri (boşluk, amblemin boyu ve tepsinin arkasına inmesi, ad), alt çubuk renkleri, Oxanium'un yüklenmesi; çekirdek karolarının aynı boyda olması; savaşta iki çekirdek ambleminin hücrenin ortasında olması (0,75 piksel), güç düğmesindeki amblem, emoji düğmesinin yeri ve tepsisi; mağazada indirim günü; alınabilir emir ve sezon düğmesi; Devre Yolu'nda AL rozeti ve lig sandığı düğmesi; kart karoları; ender ve efsanevi rozet; profil koleksiyonu ve çekirdek; iki turnuva sayfası (bütün sekmeler); on dört sayfada yatay taşma, düğme yazılarının kırpılmaması ve en az 8 piksel olması; konsol hatası.
- Takımı olan hesap (yalnız takım kurma bedeli sıfır olan deneme sunucusu, 360×640): lider ve bir üyeyle takım sayfasının bütün bölümleri, yönetim sayfaları ve takım turnuvası; 9 denetim geçti (taşma ve kırpılma).
- Denetimin ve gözün yakaladığı, düzeltilen kusurlar: savaşta amblem ilk yazımda hiç görünmüyordu (yeni tarayıcılar hizalamayı mutlak konumlu kutuya da uyguluyor), sonra 2 piksel sağdaydı; ev ekranında uzun ekranda amblem tepsiye değil panelin ortasına oturuyordu; çekirdek bilgi penceresinde amblem adın üstüne biniyordu; takım ve turnuva sekmelerinin yazısı 6 pikseldi.

## Görsel tur 5: modül amblemleri, ev ekranında uzun ekran, mağaza ölçüleri (13 Ekim 2026, iş bilgisayarı, yedinci oturum; uygulandı, yayınlanmadı, gerçek cihazda görülmedi)

Kullanıcı görsel tur 4'ün özet görüntülerini gördü ve oturumu şöyle açtı (kelimesi kelimesine):

> Son olarak modüller kaldı yeni tasarım diline göre dokunmadığımız. Modülleride yeni tasarım dili ile güncelleyelim. Ev Uzun Ekran görüntüsünde savaş destesinin üst kenarı uzamış ona gerek yok aynı korunsun. Devre yolu ile savaş destesi arasındaki mesafe artsın uzun ekranda yeterli. Mağaza içeriklerinin boyutları fazla ve gereksiz büyütülmesini azaltarak tamamlayalım ve faz 4 e geçelim.

İş sürerken, önizleme penceresinden ara halleri görerek iki mesaj daha yazdı:

> Bilgi penceresinde amblemler eskisi gibi arka planda renklerini arkaya yayarak duracak şekilde ayarla. Gerekirse yazı boyutunu bir punto küçültürsün. Ama yerleşim eskisi gibi olsun.
> Yapboz parçaları içindeki amblemler ortalanmış değil.
> Çekirdeklerinde enderlik rozetlerini ayarla.

> çekirdeklerin bilgi ekranlarını da aynı şekilde isim üstte amblemler modüller gibi arka planda aşağıda.
> bronz sandık hediyesi bilgi yazısı ve sandık yenileme bilgi yazısı da ödül listesine alınsın. orada durmasın

### Yapılanlar

- **Modül amblemleri.** 36 modülün ve Çekirdek'in tek harfli yazı işareti (↯ ⬡ ❄ …) yerine çizilmiş amblemi var: sandıklar, kaynak simgeleri ve Çekirdek amblemiyle aynı dil (dolu gövde, aydınlık ve gölge yüz, koyu kontur), renk modülün sınıfından (saldırı kırmızı, savunma mavi, destek yeşil, sistem turkuaz, sabotaj mor). Çizimler `client/src/battle/module-card-view.js` içinde (`emblemFor`), bağlama `mountModuleEmblem` ile (`client/src/app.js`, 18 yer): ev ekranındaki deste, Kartlar (deste ve 36 karo), bilgi penceresi, yapboz parçası, Devre Yolu'nda açılan modüller, profil ve istatistik destesi, modül tanıtım penceresi, takım istek kartı, savaşta raf, devre ve rakip destesi, maç sonu hasar satırları. Tanınan işaretler korundu (Lazer şimşek, Kalkan kalkan, Soğutucu kar tanesi, EMP yasak işareti, Güçlendirici artı); keyfi olanlar nesneye döndü (Onarım hilal yerine anahtar, Füze roket, Krono kronometre, Batarya pil …). Kilitli modülün amblemi gri. Eski yazı işareti yalnız yedek yolda duruyor.
- **Bilgi penceresi (modül ve çekirdek).** Yerleşim eskisi gibi: ad ve enderlik rozeti üstte ortada, amblem arkada aşağıda ortada ve rengini arkaya yayıyor (ışık halesi; modülde ayrıca renkli gölge). Amblem artık karartma katmanının üstünde. Ad bir punto küçüldü (1,05 → 0,96 rem): 360 genişlikte rozet amblemin üstüne binmiyor, kısa ekranda en çok 8 piksel arkasında kalıyor. Çekirdek penceresi tur 4'te amblemi solda gösteriyordu; kullanıcının ikinci mesajıyla modüldeki yerleşime döndü. İlk yazımda modül penceresini de sola almıştım; kullanıcı düzeltti.
- **Yapboz parçasındaki amblem.** Parçanın solunda ve altında girinti var; amblem gövde karesinin ortasında durunca girintilere taşıyordu. Artık girintilerin dışında kalan dolu alanın ortasında (%46,6 / %53,2), girintilere taşmayacak boyda ve beyaz (parça zaten sınıf renginde).
- **Çekirdeklerde enderlik rozeti.** Kartlar → Çekirdek karolarındaki düz "Yaygın" yazısı, bilgi penceresindeki rozetle aynı oldu (büyük harf, enderlik renginde hap); çekirdek bilgi penceresindeki rozet de büyük harf (modüldekiyle aynı).
- **Ev ekranı, uzun ekran.** Deste paneli her ekranda aynı boyda (150–161 piksel; 360×640'takiyle aynı); üst kenarı uzamıyor. Ekran uzadıkça artan yükseklik lig kartı ile panel arasına gidiyor (393×852'de 107 → 258 piksel), panel ile SAVAŞ düğmesi arası en çok 48 piksel. 360×640 ve 320×568 ölçüleri değişmedi (boşluk 63,6 / 27,2; panel 160,4 / 150). Uzun ekranda panelde yazan çekirdek adı kalktı (tur 4'te Claude eklemişti; panel kısa ekrandakiyle aynı olsun diye).
- **Mağaza ölçüleri.** Sandık kartı 206 → 155 piksel (sandık çizimi 84×72 → 63×54, düğme 36 → 30), paket kartı 159–167 → yaklaşık 125, premium kart 117 → yaklaşık 95, bölüm şeridi 42 → 34 piksel, aralıklar ve yazılar bir kademe küçük (en küçük yazı 8 piksel). 360×640'ta mağazanın boyu 1805 → 1371 piksel (3,5 → 2,7 ekran); dört sandık kartı ilk ekranda.
- **Ödül Listesi.** "Bronz Sandık hediyesi 8 saatte bir yenilenir." ve "Alım hakları her gün yenilenir (saat …)." yazıları mağaza sayfasından kalktı, ÖDÜL LİSTESİ penceresinin başına (başlığın altına) alındı.

### Kullanıcının görmediği seçimler (Claude)

Bütün amblem çizimleri ve hangi modülün hangi nesneyle çizildiği; sınıf renklerinin tonları; yapboz parçasında amblemin beyaz çizilmesi; her yerdeki amblem boyutları; Kartlar → Çekirdek karolarına rozet konması (kullanıcı "çekirdeklerinde enderlik rozetlerini ayarla" dedi; karo ve pencere birlikte ele alındı); ev ekranında alt boşluğun 48 pikselde durması ve çekirdek adının kalkması; mağazadaki bütün yeni ölçüler; notların Ödül Listesi'nde listenin üstüne konması. Kullanıcı ara halleri önizleme penceresinden izledi; son hali özet görüntülerle gönderildi.

### Yapılmayanlar ve açık noktalar

- **Faz 4 başlamadı** (kullanıcı "tamamlayalım ve faz 4 e geçelim" dedi): bu tur bittiğinde 5 saatlik kullanım hakkı dolmak üzereydi ve bağlam 350 bin belirteci geçmişti; Faz 4 yeni oturumda başlar.
- Modül tanıtım penceresi (arena açılışı), takım istek kartı, sayaç yongaları ve masaüstü havuz ekranındaki amblemler tarayıcıda açılıp görülmedi (stil kuralı var, ölçülmedi).
- Eski stil dosyalarında artık kullanılmayan `.shop-gift-note` / `.shop-limit-note` kuralları duruyor (tur 3 bloğundakiler kaldırıldı).
- `dist/` derlemesi yeniden üretilmedi. **Gerçek cihazda hiçbir şey görülmedi.**

### Doğrulama (13 Ekim, iş bilgisayarı; `artifacts/gorsel-tur5-20261013/run-all.sh`, depoda izlenmez)

- Yeni test dosyası `client/tests/visual-pass-5-module-emblems.test.js` (9 test); güncellenenler: `visual-pass-2-tokens-chests`, `visual-pass-3-surfaces`, `visual-pass-4-emblem-surfaces`, `league-road-and-module-unlocks`, `shop-gift-on-bronze-card`, `store-chest-daily-limit`. Sunucu kodu bu turda değişmedi; sunucu testleri koşulmadı.
- Telefon boyutunda Chrome'da 360×640, 320×568 (en küçük yazı boyu taklidiyle), 393×852 ve İngilizce 360×640: ev ekranı ölçüleri, mağaza (kart boyu, dört sandığın ilk ekranda olması, düğme yazıları), amblemlerin her ekranda kare ve kabının ortasında olması, iki bilgi penceresinin yerleşimi, yapboz parçası, çekirdek rozetleri, Ödül Listesi notları, taşma ve konsol hatası. Ayrıca 412×915 ve 360×800'de ev ekranı; tur 4'ün çekirdek ve yüzey denetimleri 360×640'ta; uçtan uca testler (yerel sunucu, kurulu Chrome).
- Ham sonuç: istemci 390 test: 388 geçti, 2 atlandı, başarısız yok; `tools/release_guard.py` geçti; telefon boyutunda dört yapılandırmanın (360×640, 320×568 en küçük yazı boyu, 393×852, İngilizce 360×640) her birinde mağaza 6/6 ve amblem / pencere denetimleri 27/27 geçti; ev ekranı 360×640, 320×568 ve İngilizce 360×640'ta 7/7, uzun ekranlarda (360×640 + 412×915 + 360×800 birlikte) 23/23 geçti; 393×852 tek başına koşulduğunda "panel 360×640'takiyle aynı boyda" denetimi karşılaştıracak ölçü bulamadığı için düştü (denetimin kusuru), bu yüzden 360×640 ile birlikte yeniden koşuldu: 15/15 denetim geçti; tur 4 denetimleri 360×640'ta 16/16 ve 54/54 geçti; uçtan uca masaüstü 5/5 geçti (`menu-navigation`, `beta33-season`, `battle-density`, `beta381-battle-events`); Android öykünmesinde projenin tamamı koşuldu: 10 geçti, 2 düştü. Düşen ikisi `two-client-pvp` testleri; bu koşu yalnız yapay zeka eşleşmeli yerel sunucuya karşıydı ve o testler insan eşleşmesi isteyen kendi sunucusuyla koşulur (önceki oturumlarda da bu kipte koşulmadı). Nedenin bu olduğu Claude'un çıkarımıdır; `two-client-pvp` kendi sunucusuyla bu oturumda koşulmadı.
- Denetimin ve ölçümün yakaladığı, düzeltilen kusurlar: bilgi penceresinde amblem karartma katmanının altında kalıyordu; Devre Yolu'ndaki "açılan modül" düğmesinde amblem 9 piksel soldaydı; yapboz parçasında amblem girintilere taşıyordu; ev ekranında alt boşluk ilk yazımda 12 piksel fazlaydı (ızgara aralığı hesaba katılmamıştı).

## Görsel tur 6: mesaj kutusu, bilgi pencereleri, kartlar, yazı boyları, efektler, giriş ekranı, marka ve mağaza görselleri (13 Ekim 2026, ev bilgisayarı, sekizinci oturum; uygulandı, yayınlanmadı, gerçek cihazda görülmedi)

Kullanıcı oturumu şu listeyle açtı (kelimesi kelimesine):

> devre yolundaki sandıkların tanımları bronz, gümüş falan ama görseller mağazadakilerle uymuyor.
> mesaj kutusu değişken boyutlar alıyor sabit boyut olsun kaydırılarak görünsün. belirli bir sayıda mesaj tutsun her alan sonra silinsin.
> her sayfada kaydırma çubuğu sağ kenara gelmiş gerek yok kaydırma çubuğuna. Görünmesin.
> Modül ve çekirdek yükseltme oku yeni tasarım diline geçsin.
> yeşil ve kırmızı bildirim noktaları yeni görsel tasarım diline geçsin.
> ev ekranında savaş destesinde modüllerin koyu bir zeminde duruyor ona gerek yok arkadaki çekirdek zeminine yerleşsin havada duruyor gibi durabilir.
> Çekirdeklerin yetenek sayfası modüllerdeki gibi tasarlansın.
> modül ve çekirdeklerin bilgi ekranlarına girince yukarıdaki görsel ve ad bölümü yaklaşsın birbirine bilgi ekranlara daha fazla yer kalsın. Örneğin lazer yaygın yazısı ile lazer amblemi arasında çok boşluk var gerek yok orayı yaklaştırıp seviye göstergesinden itibaren biraz yukarı kaydırırsak bilgilerin yazdığı alan genişler. Can, saldırı aralığı ve hsaar bilgilerinin hücrelerinde yazıları ortala.
> Hemen hemen tüm ekranlarda yazı boyutları 2 punto küçülebilir gibi. şuanda çok büyük. Aslında her ekranda değil mesela mesaj kutusundaki yazılar ideal. ama ana ekranda 3 çizgiye basınca açılan menünün yazıları çok büyük.  Mesela çekirdeklerin istatistik ekranlarında savaş rolünün açıklamaları çok büyük.
> Modüllerin Ekle butonu yeşil Çıkar butonu kırmızı olsun. Bu butonlarda yazı boyutları güzel ama butonlar çok büyük. Modül kartlarında boş alan çok biraz küçültülebilir. Onunla birlikte tıklanınca gelen bilgi ve ekle/çıkar butonu küçültülebilir.
> Yeni tasarıma uygun vfx dönüşmü yapabilirsek yapalım.
> Tüm modüllerin ismi yazıyor ama Onarım da hala "Onarım Modülü" yazıyor. Bundan da "Modülü" ekini silelim.
> Alt menü tuşları arasında gezerken geçiş takılarak oluyormuş gibi görünüyor.
> Ana ekranda desenli arka planda fare hareketiyle hareket eden çekirdek görseli aynı zamanda nefes alıyormuş gibi onu kaldırabiliriz sanki görünmüyor çünkü.
> Giriş ekanını da yeni tasarım diline taşıyalım. Logoda hatta.
> Play konsola yüklediğimiz logo, özellikler görseli ve 8 adet tanıtım görseli vardı onları da güncellemek için yeniden tasarlayalım.

İş sürerken, çekirdek bilgi penceresinin ara halini görerek bir mesaj daha yazdı:

> mesela bu çekirdek bilgi kartında enerji depo yetenek çok fazla satır kullanmış. Tüm modül ve çekirdeklerde buradaki bu 3 bilgi hücrelerinin puntosunu azaltıp en fazla 2 satır kullanmalarını sağla.
> efektlerde sürekli ve çok fazla parlama kullanma. Vurucu sonuçlarda parlama artabilir. profosyonel oyunlarda nasıl olursa öyle yap.

### Yapılanlar

- **Devre Yolu sandıkları.** Arena duraklarından on ikisi mağaza sandığı verir (Bronz, Gümüş, Altın); durakta adı yazıyor ama kademesiz genel sandık simgesi çiziliyordu. Artık mağazadaki çizimle ve kendi kademesinde görünür (`rewardIcon`, `chestVisualMarkup`). Lig sonu sandıkları (Kıvılcım, Voltaj …) mağazada bulunmayan ayrı sandıklardır; çizimleri değişmedi.
- **Mesaj kutusu.** Kutunun boyu sabit (en çok 600 piksel, ekran kısaysa ekran − 32); başlık ve üç sekme yerinde durur, yalnız liste kayar (`.reward-inbox-body`). Her alan en çok 20 kayıt gösterir: sunucu görünümü bu sınırla gönderir (`MAILBOX_AREA_LIMIT`, `server/app/reward_delivery.py`; bildirimler ve davetler `server/app/main.py`), istemci de aynı sınırla çizer. Sınırın dışına düşen satın alım mesajı ve bildirim kutudan kalkar; satın alım kaydı, aynı mesajın yeniden üretilmesini önleyen tanık olarak veride durur. **Toplanmamış sandık silinmez** (aşağıda "Kullanıcının görmediği seçimler").
- **Kaydırma çubuğu** hiçbir sayfada ve pencerede görünmez; kaydırma dokunma ve tekerlekle sürer.
- **Yükseltme oku** yalın ok olarak kaldı, yeni dilde çizildi (aydınlık sol yüz, gölgeli sağ yüz, koyu kontur, altında gölge). **Bildirim noktaları** dolu boncuk oldu (aydınlık üst yüz, gölgeli alt yüz, koyu kontur, alt dudak; ışıma yok): alt çubuk, üç çizgi düğmesi, menü satırı, arkadaş sekmeleri, takım düğmesi, unvan satırı. Sayı taşıyan rozetler (mesaj kutusu, takım başvurusu) aynı dilde hap.
- **Ev ekranı.** Destenin altındaki koyu cam şerit kalktı; modüller çekirdeğin sahnesinde (altıgen ızgaralı zemin) durur, altlarında yumuşak gölge var. Desenli zeminin arkasındaki soluk çekirdek, yörüngeler ve eğik tahta (imleçle kayan, nefes alan katman) kaldırıldı; imleç dinleyicisi de koddan çıktı.
- **Çekirdek yetenekleri** modül yetenek ağacıyla aynı tasarımda: her eşikte (SV 5, 9, 13) iki dal, ortada seviye rozeti ve Akı bedeli, üstte "EŞİK 1–3" rozeti. Açıklama düğmede yazmaz; dokununca üstteki satıra yazılır, seçilebiliyorsa aynı dokunuşla seçilir (modüldeki davranış). Seçimden sonra Yetenekler sekmesinde kalınır (önce Genel'e dönüyordu).
- **Bilgi pencereleri (modül ve çekirdek).** Başlık alanı 108 → 88 piksel: ad, enderlik rozeti ve amblem birbirine yaklaştı (amblem 54 → 42 piksel, ad 15,4 → 13,4 piksel); seviye satırından sonrası yukarı çıktı. 360×640'ta sekme içeriği 157 → 198 piksel (çekirdekte yaklaşık 143 → 197). **Üç hücre en çok iki satır** (ikinci mesaj): üstte simge ve tek satır etiket, altta değer ve bir sonraki seviyenin farkı tek satır; yazılar ortalı, hücre 50–60 → 39 piksel. Etiket 8, değer 9,6, fark 8 piksel. Sığmayan uzun etikette (ör. İngilizce "SABOTAGE INTERVAL") ve 340 pikselden dar ekranda hücrenin simgesi çizilmez; çekirdekte enerji hücresi diğer ikisinden geniştir.
- **Yazı boyları.** Ölçü mesaj kutusu alındı. Küçülenler (360 genişlikte, piksel): üç çizgi menüsü 11,8 → 9,6 (satır 48 → 38, menü daraldı); çekirdek istatistiklerinde savaş rolü 12,5 kalın → 8,8 (satırı doldurur, cümle olarak yazılır) ve diğer karo değerleri 12,5 → 10,6; oyuncu adı 14,8 → 13,1, unvan satırı 12,5 → 9,9, kaynak sayıları 13,8 → 12,2, lig adı 11,5 → 10,2, SAVAŞ 16 → 14,7; bölüm başlıkları 13,1 → 11,5 (mağazada 11,8 → 10,9); sınıf sekmeleri 10,6 → 9,3; etkinlik başlığı 16,8 → 14,4, turnuva satırları 12,5 → 10,6; sezon başlığı ve kademe 16 → 12,8, altındaki notlar 13,3 → 9,6; profil adı 16,8 → 14,4; Devre Yolu başlığı 20 → 16,3, aşama adı 12,8 → 11,2; bilgi penceresinde ad 15,4 → 13,4, açıklama ve kimlik satırları 9,6–9,9 → 8,8, Yükselt 11,5 → 10,2; Ayarlar'da tarayıcının varsayılan boyunda (16) kalan etiket ve düğmeler 10,9 ve 10,6. Tur 6 bloğunda 8 pikselin altında yazı yok (test denetler). Giriş alanlarının yazısı (ad, dil) küçültülmedi: 16 pikselin altı iPhone'da odaklanınca sayfayı yakınlaştırır.
- **Kartlar.** Modül karosu 111 → 94 piksel (üst boşluk, simge ve satır aralıkları kısaldı; ad iki satıra kadar yazılır). Karta dokununca açılan kutuda düğmeler 38 → 26 piksel, yazı boyu aynı (9,6); Bilgi mavi, **desteye ekleyen düğme yeşil, çıkaran kırmızı** (`data-action`).
- **Savaş efektleri.** İki adımda yapıldı. (1) Çizim dili: ışıma, bulanık gölge ve yumuşak geçiş kalktı; atış (ışın, namlu, mermi), vuruş (sekiz uçlu yıldız, halka, kıvılcım), patlama (yıldız, şok halkası, kıymıklar), imza efektleri (halka, etiket, bağ ışını) ve hasar yazıları dolu gövdeli, iki tonlu ve koyu konturlu. (2) Kademe (ikinci mesaj): sıradan atış ve vuruş küçük ve kısa (24 piksellik yıldız, dört kıvılcım, 0,34 sn; kart yalnız bir an kırpar, atışta neredeyse tepki yok, destek bildiriminde ince renkli çerçeve); **ağır vuruşta** (savunulmamış ve 40 ya da üstü hasar, ya da hedefin azami CAN'ının dörtte biri) 46 piksellik yıldız, halka ve on kıvılcım; modülün yok olması, Çekirdek patlaması ve Çekirdek gücü eskisi gibi büyük. Güç alan hücrede her 1,15 saniyede tekrarlanan parlama darbesi kalktı (sabit ince çerçeve); kablodaki akım çizgisi yavaşladı (0,46 → 0,9 sn) ve soldu. Süreler, hareketler, efekt bütçesi ve grafik kademeleri aynı.
- **"Onarım".** Sunucu verisinde modülün adı "Onarım" oldu (`server/data/arena_progression_v1.json`; durak açıklamaları dahil). İstemci, eski sunucudan gelen "Onarım Modülü" adını da "Onarım" olarak yazar (paket sunucudan önce çıksa da ad doğru görünür).
- **Alt çubukta gezinme.** Ölçüm: ekran değişiminde kapalı duran Devre Yolu penceresi (yüzlerce durak) her seferinde baştan çiziliyor, üstüne aynı anda gelen profil ve koleksiyon tazelemeleri görünmeyen ekranları yeniden kuruyordu; alt çubuğun genişlik geçişi bu sırada kare atlıyordu. Yapılanlar: yol yalnız penceresi açıkken çizilir; ekran değişiminden sonraki 360 ms içinde gelen tazelemelerin yeniden çizimi ve görünmeyen ekranların sıradaki çizimi geçiş bitene kadar bekler; alt çubuk hareketi düzen hesabı istemeyen konum ve opaklık hareketine çevrildi (seçilen düğme yerine anında oturur, hafifçe yükselir). Sonuç aşağıda.
- **Giriş (yükleme) ekranı.** Oyunun desenli mavi zemini, amblemin arkasında iki kademeli düz ışık dairesi, konturlu ve dudaklı GRIDSHARD yazısı, yuva içinde dolu ilerleme çubuğu (yeşil; hazırda altın, hatada kırmızı), levha TEKRAR DENE düğmesi. Neon ışımalar, süpürülen çizgiler ve kenar karartması kalktı; dönen iki yay düz renkli. Eski stil bloğu yerinde durur (özeti testle sabit); yeni görünüm tur 6 bloğunda onun üstüne yazar.
- **Logo.** Motif aynı (altın halkada ortadan çatlamış kristal, yanlardan giren güç hattı); çizim dili yeni: dolu gövde, aydınlık ve gölge yüz, koyu kontur, altta dudak, çatlakta iki ucu sivri açık sarı şimşek; zemin desenli mavi, ışınlar ve iki düz ışık dairesi. `tools/generate_brand_assets.py` içindeki çizim yeniden yazıldı ve çalıştırıldı: mağaza simgesi (1024, 512), web simgeleri, `favicon.ico`, yükleme amblemi, Android başlatıcı ve açılış simgeleri (bütün yoğunluklar, tek renk tema simgesi dahil), iOS simgesi ve açılış görseli. Android projesindeki (`android/app/src/main/res`) 30 görsel, eşitleme kancasının kullandığı aynı işlevle (`configureNativeBranding`) kopyalandı. Betik `--preview <klasör>` ile depoya dokunmadan denenebilir; iki koşuda çıktı bayt bayt aynı.
- **Play mağaza görselleri** (`artifacts/play-store-listing-20261013/`, git'te izlenmez): simge, özellik grafiği (1024×500) ve sekiz telefon görüntüsü (1080×1920), Türkçe ve İngilizce. Ekran görüntüleri oyunun kendi ekranlarıdır, üstlerine yazı ya da çerçeve eklenmedi (7 Ekim'deki kural). Ayrıntı ve alternatif metinler `docs/PLAY_STORE_LISTING.md` içinde. **Konsola yüklenmedi.**

### Kullanıcının görmediği seçimler (Claude)

- **Toplanmamış sandık silinmiyor.** "belirli bir sayıda mesaj tutsun her alan sonra silinsin" cümlesi sandık alanlarına da uygulanırsa oyuncunun kazandığı (ücretli sezon geçişinde parasıyla aldığı) sandık toplanmadan silinir. Bu yüzden sınır mesajlarda silme, sandıklarda gösterim sınırıdır: kutuda en yeni 20 sandık görünür, toplandıkça sıradakiler girer. Sandıkların da silinmesi istenirse tek satırlık değişikliktir; **karar kullanıcıda.**
- Sınırın 20 olması; kutunun 600 piksel olması.
- Düğmenin yazısı "Seç" kaldı (kullanıcı "Ekle" dedi; yazı değiştirilmedi, yalnız renk ve boy).
- Yazı boylarının hepsi (yukarıdaki liste); hangi yazıların küçültülmediği (mesaj kutusu, kart karoları, takım sayfası, 10 pikselin altındaki yazıların çoğu).
- Bilgi penceresinde başlık alanının 88 piksel, amblemin 42 piksel olması; hücrelerde simgenin etiketle aynı satırda kalması ve sığmayınca kalkması.
- Çekirdek eşik rozetlerinin "EŞİK 1–3" yazması ve renkleri (yeşil, mavi, mor); seçimden sonra sekmede kalınması.
- Efektlerin bütün biçim ve ölçüleri; ağır vuruş eşiği (40 hasar ya da azami CAN'ın dörtte biri); güç alan hücredeki darbenin tümüyle kalkması; akım çizgisinin yavaşlaması. Hazır Çekirdek gücü düğmesinin nabzı bırakıldı (oyuncuyu eyleme çağıran durum).
- Alt çubukta genişlik geçişinin kalkıp yerine yükselme hareketinin gelmesi; 360 ms'lik bekleme.
- Logonun bütün çizim kararları (renkler, pah, şimşek, zemin); giriş ekranının renkleri; yerel açılış zemininin koyu lacivert (`#07142B`) kalması (web yükleme ekranı mavi; arada renk farkı var).
- Mağaza görsellerinde örnek hesap (Arena 7, 2380 kupa; adlar), sekiz ekranın 7 Ekim'deki sırayla aynı kalması, özellik grafiğinin düzeni. Kullanıcı ara halleri (bilgi penceresi, efektler) önizlemeden izledi; son hali özet görüntülerle gönderildi.

### Yapılmayanlar ve açık noktalar

- **Yeni mağaza görselleri konsola yüklenmedi.** Yeni arayüzü taşıyan paket yayınlanırken yüklenmeli (kapalı testteki v8 eski arayüzde).
- Yazı boyu taraması 10,5 piksel ve üstündeki yazılarla sınırlıydı; takım sayfası, turnuva ayrıntıları, lider panosu, oyuncu profili penceresi ve maç sonu tek tek ölçülmedi.
- Savaşta yalnız Lazer, Füze, Darbe Topu ve destek modüllerinin efektleri görüldü; ray topu, dron, ark, imza efektlerinin çoğu ve Çekirdek patlaması yeni çizimde ekranda görülmedi (kuralları var). Orta ve Düşük grafik kademesi yalnız kuraldan okundu.
- Geçişin ilk karesi yavaş cihaz taklidinde Kartlar ekranında hâlâ 150–220 ms sürüyor (ekranın kendi çizimi); azaltmak karo çizimini sadeleştirmeyi ister, bu turda yapılmadı.
- İş bilgisayarındaki `apply4.py` tur 3 işaretinden dosya sonuna kadar yazar: orada çalıştırılırsa **tur 6 bloğu silinir.** Tur 6 parçaları yalnız ev bilgisayarında (`artifacts/gorsel-tur6-20261013/t6-*.css`, `apply6.py`). İş bilgisayarında stil bloğu yeniden üretilecekse önce tur 6 bloğu `canon.css`'ten ayrı bir dosyaya alınmalı.
- Android projesindeki simgeler kopyalandı ama paket derlenmedi; tanıtım sitesi (`public-site/`) yeni amblemi bir sonraki derlemede alır. `dist/` yeniden üretilmedi. **Gerçek cihazda hiçbir şey görülmedi.**

### Doğrulama (13 Ekim, ev bilgisayarı; `artifacts/gorsel-tur6-20261013/`, depoda izlenmez)

- İstemci 402 test: 402 geçti (yeni `client/tests/visual-pass-6-polish.test.js`, 12 test; güncellenenler: `card-upgrade-indicators`, `faz3-talents-and-energy`, `league-road-and-module-unlocks`, `relay-client`, `startup-loading`). `tools/tests`: 36 + 18 geçti. `tools/release_guard.py` geçti.
- Sunucu (sistem Python'u): 1500 geçti, 44 atlandı, 33 düştü. Düşen 33'ün hepsi `tests/test_google_play_aws_wif.py` içinde ve bu makinede kurulu olmayan `google-auth` kitaplığını ister (`import google.auth` hata veriyor); bu turun değiştirdiği dosyalarla ilgisi yok. `test_reward_delivery.py` 10/10 (biri yeni, biri sınıra göre güncellendi: 75 toplanmamış sandığın hepsi veride durur, kutu 20 gösterir).
- Telefon boyutunda Chrome'da (`verify6.js`): 360×640, 320×568 (en küçük yazı boyu taklidiyle), 393×852, İngilizce 360×640, İngilizce 320×568 (en küçük yazı boyu); her birinde 26 denetimin 26'sı geçti. Denetlenenler: ev (şerit yok, katman yok, altı modül panelde), kaydırma çubuğu, menü, mesaj kutusu (üç sekmede aynı boy, kayan gövde, alan başına en çok 20), 36 karo (boy, kesilen ad, taşma, eski ad), ekle / çıkar düğmeleri, Devre Yolu'ndaki mağaza sandıkları (kademe adla eşleşiyor), **36 modülün ve 7 çekirdeğin üç hücresi (tek satır etiket, tek satır değer, kesilme yok)**, başlık alanı, çekirdek yetenek ağacı (7 çekirdek), savaş rolü satırı, nokta ve ok, konsol hatası. İlk koşuda İngilizce 320×568'de bir denetim (karta dokununca kutunun açılması) bir kez düştü, iki yeniden koşuda geçti.
- Uçtan uca (yerel sunucu, kurulu Chrome): masaüstü 10/10 (`menu-navigation`, `startup-loading`, `battle-density`, `beta33-season`, `beta381-battle-events`), Android öykünmesi 9/9 (`startup-loading`, `mobile-battle`, `settings-layout`, `onboarding`). `two-client-pvp` koşulmadı. `menu-navigation` içindeki nokta denetimi yeni boncuğa göre güncellendi; ilk koşuda aynı dosyadaki "unvan yazısı adın %80'inden küçük" denetimi düştü (10,56 / 13,12), unvan yazısı 9,9 piksele indirilip yeniden koşuldu.
- Alt çubuk ölçümü (`dockperf.js`, dokuz geçiş, 900 ms pencere). Dört kat yavaşlatılmış işlemcide en uzun kare: önce 188–625 ms, sonra 83–292 ms; pencerede çizilen kare: önce 5–63, sonra 47–111. Sonraki en uzun kare, geçiş bittikten sonra (365. ms) yapılan tazelemedir; geçişin içindeki tek uzun kare ilk karedir (Kartlar'da 150–220 ms, diğerlerinde 35–120 ms). Yavaşlatma olmadan: önce 28–132 ms, sonra 8–90 ms. Bunlar masaüstü Chrome ölçümüdür, telefon değil.
- Savaş efektleri (`vfx.js`): eski hali, ilk dönüşüm ve kademeli hali animasyon yavaşlatılarak yakalandı (atış, vuruş, patlama, imza, yazı); görüntüler `shots/vfx-*.png`.
- Denetimin ve ölçümün yakaladığı, düzeltilen kusurlar: üç çizgi düğmesindeki nokta hap biçimine girmişti; çekirdekte enerji hücresi etiketi sağa kayıyordu; "ENERJİ TASARRUFU" ve İngilizce "SABOTAGE INTERVAL" etiketleri kesiliyordu; 320 genişlikte enerji değeri kesiliyordu; marka betiği değişmeyen üç XML dosyasını satır sonu farkıyla yeniden yazıyordu.

## Faz 4 — kozmetik içerik

- [ ] **G1. Arka planın gerçekten değiştiğini görmek için "Uç" oyuncusuna bir arka plan açılması.** Canlı veriye dokunur: yayın oturumunda, kullanıcının o anki onayıyla, küçük bir betikle yapılır. Öncesinde arka plan değişiminin çalıştığı yerel sunucuda doğrulanır. Arka plan çeşidi artırılabilir.
- [ ] **G2. Dönemlik ödüller.** Sıralama ve dereceyle kazanılan kozmetikler her turnuva döneminde (takım ve bireysel) farklı olmalı ve kendiliğinden değişmeli.
- [ ] **G3. Hareketli emojiler.**
- [ ] **G4. Profil barı arka planında desenler** (düz renk değişimine ek).
- [ ] **G5. Profil resimlerinde karakterler** (yalnız şekil değil).
- [ ] **G6. Başka oyunlardaki kozmetik çeşitliliğinin araştırılması** ve örnek alınması.

**Görsel yön kararı — 14 Ekim 2026:** Kullanıcı: “Eski profil avatarları metin çizimi idi. Artık amblem ve fiziksel çizim kullanıyoruz.” Faz 4'ün avatarları, karakterleri, hareketli emojileri ve desenleri güncel amblem/sandık çizimleriyle aynı yeni görsel dile uyacak. Eski harf/Unicode sembolünü büyütmek, renklendirmek veya hareket ettirmek yeni çizim yerine geçmez. Çizilmiş amblem, belirgin fiziksel gövde/siluet, dolu yüzey, ışık/gölge, ince kontur ve kontrollü parlama kullanılacak; profesyonel ton korunacak. Bu, 3D/fotogerçekçi görsel zorunluluğu değildir. Mevcut kozmetik kimlikleri, kazanılmış haklar ve seçimler korunur.

Varsayılan yol: desenler, karakterler ve hareketli emojiler oyunun kendi çizim diliyle (SVG ve CSS hareketi) depoda üretilir; dışarıdan paket indirilmez. Hazır bir açık lisanslı set kullanılması istenirse önce lisansı okunur ve kullanıcıdan indirme onayı alınır. Hedef kitle 13 yaş ve üzeri olduğu için karakterler küçük çocuklara hitap eden türden olmamalıdır.

## Kullanıcıdan beklenen kararlar (iş bunları beklemeden başlar)

1. Faz 4'te görseller depoda mı çizilsin (varsayılan), yoksa açık lisanslı hazır bir set mi aransın?
2. ~~Faz 1 tek başına mı çıksın, Faz 2 ile mi?~~ Karar verildi (12 Ekim akşamı): "Sunucu ve paketi faz 3 ten sonra yaparız." Hepsi birlikte çıkar.
3. ~~D7: yeni modül eklensin mi?~~ Karar verildi (12 Ekim): eklenmiyor; arenalar 2–3 modül, ligler girişte birer efsanevi modül açar.
4. Faz 2 düzeltmelerinin (R1–R4) açık soruları: arena ve lig kademe genişlikleri, mevcut oyuncuların kupasının yeni ölçeğe taşınması, unvan kupa koşulları, evrensel parça miktarları (`CLAUDE_CHECKPOINT.md` başında, her maddenin "Sorulacak" satırı).

## Kayıt

| Tarih | Ne yapıldı |
|---|---|
| 13 Ekim 2026 (ev bilgisayarı, sekizinci oturum) | **Görsel tur 6 uygulandı:** Devre Yolu'nda mağaza sandıkları mağazadaki çizimle; sabit boylu, alan başına 20 kayıtlı mesaj kutusu (sunucu ve istemci; toplanmamış sandık silinmez); görünmeyen kaydırma çubuğu; yeni dilde yükseltme oku ve bildirim noktaları; ev ekranında şeritsiz deste, kalkan arka plan katmanı; modül ağacı tasarımında çekirdek yetenekleri; alçalan başlık alanı ve en çok iki satırlık üç hücre; küçülen yazılar (ölçü: mesaj kutusu); küçülen kart karoları, yeşil ekle / kırmızı çıkar; dolu ve kademeli savaş efektleri (sürekli parlama yok); "Onarım" adı (sunucu verisi ve istemci); alt çubuk geçişi (yol yalnız açıkken çizilir, tazeleme geçişten sonra); yeni giriş ekranı, yeniden çizilen logo ve bütün simgeler; iki dilde yeni Play mağaza görselleri (yüklenmedi). İstemci 402 / 402; sunucu 1500 geçti, 44 atlandı, 33 düştü (hepsi bu makinede kurulu olmayan `google-auth`); telefon boyutunda beş yapılandırmada 26 / 26; uçtan uca masaüstü 10 / 10, Android öykünmesi 9 / 9. Sunucu kodu ve verisi değişti (r17 ile çıkar). Gerçek cihazda görülmedi. |
| 13 Ekim 2026 (iş bilgisayarı, yedinci oturum) | **Görsel tur 5 uygulandı:** 36 modülün çizilmiş amblemi (oyunda modülün göründüğü her yerde); bilgi pencerelerinde eski yerleşim (ad üstte, amblem arkada aşağıda; çekirdek penceresi de); yapboz parçasında ortalanmış amblem; çekirdeklerde enderlik rozeti; ev ekranında uzun ekranda aynı boyda panel ve büyüyen üst boşluk; küçülen mağaza ölçüleri; yenilenme notları Ödül Listesi'nde. Ayrıntı yukarıda, "Görsel tur 5" başlığında. Sunucu değişmedi. Yayınlanmadı, gerçek cihazda görülmedi. Faz 4 başlamadı. |
| 13 Ekim 2026 (iş bilgisayarı, altıncı oturum) | **Görsel tur 4 uygulandı:** tek Çekirdek amblemi (ev, Kartlar → Çekirdek, bilgi penceresi, savaş alanı, güç düğmesi, maç sonu, profil, Devre Yolu); yüzey dilinin sakinleştirilmesi (ince kontur, alçak dudak, daha az parlak geçiş); başlık yazı tipi Oxanium; Takım düğmesi mor; ev ekranında küçülen ve destenin arkasına inen amblem; profilde Devre Koleksiyonu yuvaları; savaş ekranı, kart karoları, takım sayfası, turnuva ayrıntı sayfaları ve Devre Yolu AL düğmesi; emoji düğmesi savaş alanının sağ alt köşesinde. Ayrıntı yukarıda, "Görsel tur 4" başlığında. Yayınlanmadı, gerçek cihazda görülmedi. |
| 13 Ekim 2026 (iş bilgisayarı, beşinci oturum) | **Görsel tur 3 uygulandı:** mağazanın yeniden tasarımı (şerit başlıklar, kademe renginde sandık kartları, yeşil fiyat düğmeleri), üç çizgi menüsünün sayfaları, profil, kartlar ve etkinlik sayfaları, pencereler ve ilk oyun deneyimi katmanı yeni yüzey dilinde (levha, yuva, düğme, şerit); geri düğmesi sabit; ev ekranında orta boşluk kalktı ve çizilmiş Çekirdek amblemi geldi; enderlik rengi tek dil; parça ve evrensel parça ayrı; değer farkları birimiyle. İstemci 366 test geçti, 2 atlandı; uçtan uca Android öykünmesi 9/9, masaüstü 4/4; telefon boyutunda beş yapılandırmada 85 denetimin hepsi geçti. Yazı tipi ailesi değişmedi. Sunucu değişmedi. Yayınlanmadı; gerçek cihazda görülmedi; kullanıcı bu turdan ekran görüntüsü görmedi. |
| 13 Ekim 2026 (iş bilgisayarı, dördüncü oturum) | **Görsel tur 2 uygulandı:** yeni mağaza sandıkları (lig sandıklarının diliyle, ayrı çizim) ve açılışı; dolu çizilen Akı, Devre Kredisi ve diğer kaynak simgeleri; simgeli mağaza fiyatı; dolu yapboz parçası; ödül bölümleri simgeleri; alt çubukta yalnız açık sayfanın adı ve büyüyen düğme (kullanıcının yanıtı: "a"); savaşta Akım ve maç sonu simgeleri. İstemci 354 test geçti; telefon boyutunda beş kipte 79'ar denetim geçti. Sunucu değişmedi. Yayınlanmadı; gerçek cihazda görülmedi. Faz 4 başlamadı. |
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
