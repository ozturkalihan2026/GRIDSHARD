# Oyun düzenlemeleri — iş planı

**Kaynak:** kullanıcının 12 Ekim 2026'da verdiği "Oyun Düzenlemeler" belgesi (iş bilgisayarında, masaüstünde; depoda değil). Maddeler aşağıya aktarıldı; bu dosya o belge olmadan da yeterlidir.

**Durum (12 Ekim 2026):** plan yazıldı, **hiçbir madde uygulanmadı.** Depo `aedce13`; canlıda sunucu r16, kapalı testte v8 paketi var ve gerçek test kullanıcıları oynuyor (Codex'in kaydı: `CODEX_CHECKPOINT.md`).

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

- [ ] **G7. Üst barda üç çizgi menüsü.** Profil simgesiyle açılan "profil ve ayarlar" bölümü, mesaj kutusunun sağına konacak üç çizgili düğmeye taşınır. Dokununca bugün alt sekme olan Kozmetik, Ödüller, Arkadaş, Ayarlar alt alta listelenir; dokunulan sayfa açılır.
- [ ] **G8. Profil simgesi doğrudan profili açar.** Profil artık sekme değil, tek başına sayfadır. (G7 ile birlikte yapılır; alt sekme çubuğu kalkar.)
- [ ] **G9. Takım sayfasındaki anlık yanlış ekran.** Takımı olan oyuncu sayfayı açınca bir saniyeden kısa süre "takıma katıl / oluştur" ekranını görüyor. Takım durumu gelene kadar o ekran gösterilmemeli.
- [ ] **G10. Takım sayfası düzeni.** (a) İç içe iki çerçeve var; fazla olan kaldırılır (kullanıcının görüntüsünde kırmızı çarpıyla işaretli iki dış çerçeve). (b) Takım profilindeki alt sekmeler (Profil, Üyeler, İstek, Sohbet, Savaş; yönetimde Kozmetik, Üye Yönetimi) sağdaki üç çizgi menüsüne taşınır, G7 ile aynı davranış. (c) Başlıktaki üye sayısı ("5 / 30 üye") aşağıdaki istatistiklerin başına gelir; kupa zaten ilk istatistiktir, başlıkta yinelenmez.
- [ ] **G11. Sezon ödülleri.** "Ücretli geçişi aç" düğmesi bütün genişliği kaplamak yerine sağ sütunda, "ÜCRETLİ GEÇİŞ" başlığının hemen altında durur. Düğmenin üstündeki bilgilendirme satırı kaldırılır.
- [ ] **G12. Yükseltme göstergeleri.** Yükseltilebilir modül ve çekirdek kartında yeşil yukarı ok (kartın sağ üstü). Böyle bir kart varken alt çubuktaki Kartlar sekmesinde yeşil bildirim ışığı. Açılabilir yetenek varsa aynı ışık ve kart bilgi ekranındaki Yetenekler sekmesinde yeşil ok.
- [ ] **G13. Bir sonraki seviye değerleri.** Kart bilgi ekranında can, akım, hasar gibi değerlerin yanında bir sonraki seviyenin farkı yeşil "+değer" olarak yazar; aşağıdaki ayrı kutu kalkar.
- [ ] **G14. İndirim göstergesi.** Mağazada indirim günü, alt çubuktaki Mağaza düğmesinde indirim oranı görünür.
- [ ] **G2b. Kozmetiklerin altındaki "nerede kazanılır" notları kaldırılır** (G2'nin arayüz yarısı; ödüllerin dönemlik değişmesi Faz 4).
- [ ] **D15. Günlük meta metni.** Etkinlikler sayfasında "Akım modül etkisi %15" yerine "Akım üretimi +%15" (böyle bir modül yok). Etkinin gerçekten Akım üretimini mi değiştirdiği sunucu kodundan doğrulanır; metin kurala uymalıdır.

## Faz 2 — Devre Yolu ve ilerleme

- [ ] **D1. Lig kademeleri.** Kıvılcım, Voltaj, Reaktör, Kuantum ve Nexus liglerinin her biri beş kademeye bölünür (Kıvılcım Ligi I–V …); ödüller buna göre dizilir.
- [ ] **D2. Üst ligler.** Şampiyonlar Ligi beş kademe olarak kalır; ardından beş kademeli Efsanevi Lig, en sonda tek kademeli **GRIDSHARD Ligi** gelir. Yolun devamı arayüzde görünür olmalıdır (bugün Efsanevi Lig'den sonrası görünmüyor).
- [ ] **D3. Kupa eşikleri** yeni lig sayısına göre yeniden kurulur; toplam kupa yükselebilir. Mevcut eşikler koddan okunup karar verilir. Öneri: arenalar bugünkü gibi (0–3599), lig kademeleri sabit aralıklı, üst liglerde aralık büyür.
- [ ] **D4. GRIDSHARD Ligi ödülü.** Devre Yolu'nun sonunda en büyük ödül sandığı; içindekiler yalnız bu sandıktan kazanılır (özel kozmetik seti ve unvan; içerik Faz 4 ile birlikte kesinleşir).
- [ ] **D5. Arena 1'de yalnız altı modül:** Lazer, Kalkan, Batarya, Soğutucu, EMP, Güçlendirici.
- [ ] **D6. Kalan modüller** Arena 2'den başlayarak her arena ve lig geçişinde en çok iki modül (bir de olabilir) açılacak şekilde dağıtılır. Aşağıdaki öneri 36 modülü tam yerleştirir.
- [ ] **D7. Yeni modüller.** Dağıtım yetmezse yeni saldırı ve savunma modülleri (enderlik ve özellikler Claude'da). Öneriyle gerek kalmıyor; istenirse lig geçişlerini ikişer modüle çıkarmak için eklenebilir (karar kullanıcının).
- [ ] **D8. Operatör unvanları.** Son unvan "GRIDSHARD Efsanesi" yalnız GRIDSHARD Ligi'ne çıkan oyuncuya verilir. Unvan sayısı artırılabilir. Kupa koşulları yerinde; **istenen galibiyet sayıları çok düşük, yükseltilecek.**
- [ ] **D9. Yükseltme maliyet tablosu.** Kullanıcının örnek tablosu (aşağıda) birebir alınmaz; Devre Kredisi, Akı ve parça kazanım hızlarımıza göre uyarlanır. Hedef: yükseltme zor ama imkânsız değil; maç yapmayı, çok kredi ve çok parça toplamayı gerektirir.

**D6 için modül dağıtımı önerisi** (bugünkü açılış arenası parantez içinde; enderlik sırası korunur, efsaneviler liglere kalır):

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
| Arena 12 | Faz Zırhı (9), Sürü Fabrikatörü (9) |
| Kıvılcım Ligi | Hassasiyet Matrisi (10) |
| Voltaj Ligi | İyon Mızrağı (9) |
| Reaktör Ligi | Prizma Kalkanı (11) |
| Kuantum Ligi | Kesici (10) |
| Nexus Ligi | Anka Onarım (11) |
| Şampiyonlar Ligi | Kuantum Topu (11) |
| Efsanevi Lig | Omega Güçlendirici (12) |
| GRIDSHARD Ligi | Tekillik Projektörü (12) |

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

## Faz 3 — savaş mekaniği

- [ ] **D13. Modül özelliklerinin gözden geçirilmesi.** Örnek: Güçlendirici'nin bekleme süresi yok; 2 saniyede bir destek verecek şekilde ayarlanır ve süre seviyeyle kısalır. Bütün modüller aynı gözle taranır.
- [ ] **D14. Enerji tüketimi.** Birçok modülün istatistiğinde enerji tüketimi 0 yazıyor. Her modül enerji tüketmeli; değerler çekirdeğin üretimi ve enerji ekonomisiyle birlikte ayarlanır.
- [ ] **D11. Seviye atlamanın etkisi.** Bugün seviye yalnız hasar/can ya da tek bir değeri artırıyor. Seviyeyle ikinci değerler de gelişmeli (örnek: Darbe Topu'nda can ve hasar artarken saldırı aralığı seviye başına 0,02 sn kısalır). Bütün modüller ve çekirdekler için.
- [ ] **D10. Yetenekler.** Bugünkü yetenekler düz artış. Her modüle sınıfına ve özelliğine uygun, savaşta farklı kullanım sunan sıra dışı yetenekler (örnek: Lazer — her 30 saniyede bir 5 saniye boyunca her atış hedefin yanındaki modüllere hasarın %30'u kadar hasar verir).
- [ ] **D12. Çekirdek yetenekleri** modüllerinkinden de ayrıksı olmalı; çekirdek oyunun merkezidir.

Yöntem: (1) enerji ve seviye gelişimi için sayısal model ve simülasyon (`server/app/game/simulation.py`, denge raporları); kart galibiyet oranı aralığı bugünkü %41–59 bandından kötüleşmemeli. (2) Yetenekler için motorda az sayıda ortak kanca (vuruşta sıçrama, dönemsel pencere, yok olunca etki, yerleşince etki, koşullu güçlenme, delme, zincir) kurulur; her yetenek bu kancalarla tanımlanır, böylece 36 modül + 7 çekirdek için ayrı ayrı özel kod yazılmaz. (3) Yapay zekâ yetenekleri bilerek kullanır. (4) Eğitim savaşının betiği belirli değerlere dayanır; her adımda yeniden doğrulanır. (5) Yetenek listesi uygulamadan önce bu belgeye tablo olarak yazılır.

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
2. Faz 1 tek başına yeni bir paket olarak mı çıksın, yoksa Faz 2 ile birlikte mi? (Yayın sırasında sorulur.)
3. D7: lig geçişlerinde ikişer modül açmak için yeni modül eklensin mi, yoksa önerilen dağıtım (yeni modül yok) yeterli mi?

## Kayıt

| Tarih | Ne yapıldı |
|---|---|
| 12 Ekim 2026 | Belge okundu, plan yazıldı (iş bilgisayarı). Kod değişmedi. |
