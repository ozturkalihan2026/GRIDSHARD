# GRIDSHARD — Nihai modül, enderlik ve yetenek kararları V7

**1 Kasım 2026 · V7 mekanikleri ana koda uygulandı; V7.1 denge ve Akım V8/eğitim güncellemesi.**
Bu belge mevcut 24 kart için yeni mekanik ve yetenek davranışlarının karar kaynağıdır.
V6 öneri listesinin yerine geçer. İmza mekanikleri ve yetenekler ana koda uygulandı.
V7.1’de savunma CAN’ları ilk V7 adayına göre %50 artırıldı; ayrıntılı ölçüm
`V7_UYGULAMA_VE_STRATEJI_TESTLERI_20261101.md` belgesindedir. Sayılar insan oyuncu
metasının nihai dengesi iddiası değildir. Mevcut telefondaki V6 paket ve onun
sunucusu bu çalışma sırasında yenilenmedi; gerçek oyuncu verisi açılıp değiştirilmedi.

Makine okunur kaynak: [NIHAI_MODUL_ENDERLIK_YETENEK_V7.json](NIHAI_MODUL_ENDERLIK_YETENEK_V7.json).
Bu belge `python -X utf8 tools/document_module_decisions_v7.py` ile o kaynaktan üretilir.

## Tasarımın sonucu

24 kart / 3 sınıf / mevcut arenalar ve sabit enderlikler korunur. Yeni bir zorunlu
Sistem sınıfı yoktur. Yaygın kartlar ana görevlerinde değerlidir; Efsanevi kart
aynı bedelle hem daha dayanıklı hem daha yüksek sürekli hasarlı otomatik üst sürüm
olmaz. Özellikle savunmaya yeni hasar motoru eklenmez: savunma zaman kazandırır,
Taktik fırsat yaratır, Saldırı karşı devreyi yıkar. Yansıtıcı tek başına güvenilir
bir saldırı ekonomisi kuramaz.

| Enderlik | Oyuncunun anlayacağı fark | Karmaşıklık bütçesi |
|---|---|---|
| Yaygın | Düzenli ateş / ağır darbe / blok / dayanıklılık / onarım | Bir temel görev; talimat okumadan ilk birkaç çevrimde anlaşılır |
| Nadir | Zırhı delme, geri yansıtma, iki hedef, kontrollü kesinti veya tek görevli destek | En fazla bir uzman koşul veya kısa takip etkisi |
| Destansı (Epik) | Zincir, iz, emilimi onarıma çevirme, kalkan sökme, tempo uzmanlığı | Bir bağlantılı imza; süre, hedef ve toplam bütçe sınırı |
| Efsanevi | Dördüncü isabet yankısı, Faz penceresi veya yıkım mirası | Görünür hazırlık/pencere/bir-kez tetiki; açık karşı hamle |

Enderlik **mekanik kimliktir**; ayrı gizli hasar/CAN/hız çarpanı değildir. Kart seviye
atlayınca enderliği değişmez. Temel imza yetenek satın almadan çalışır. Yetenekler
o imzayı odaklar; yeni oyuncunun kartını işlevli yapan zorunlu ücretli anahtar değildir.

## Benzer oyunlardan alınan fikirler

Yalnız yayıncıların resmî açıklamaları kullanıldı. Bunlar tarihli tasarım örnekleridir;
2026 güncel meta veya bugünkü kart sayılarının dengeli olduğu iddiası değildir.
Telifli görseller, adlar veya bire bir istatistikler aktarılmaz. Uyarlama sütunu
GRIDSHARD için bizim tasarım çıkarımımızdır.


| Resmî örnek | Belgelenen davranış | GRIDSHARD çıkarımı |
|---|---|---|
| [Clash Royale — Game Update June 17 (2024)](https://supercell.com/en/games/clashroyale/blog/release-notes/game-update-june-17/) | Nadir Demolisher ölüm/düşük CAN koşulu, Destansı Curse dönüşüm, Efsanevi Machine iki saldırı davranışı. | Kart başına açık mekanik kimlik; bütün enderlikler için evrensel kural iddiası yok. |
| [Clash Royale — New Update (26 October 2022)](https://supercell.com/en/games/clashroyale/blog/release-notes/new-update-october-2022/) | Phoenix karşı tarafın kırabildiği yumurtayla yerleşim başına tek dönüş; Monk koruma/yansıtma penceresi. | Son Siper bir kez yıkım tetiki, Faz sınırlı pencere; tekrar sınırı ve karşı hamle. |
| [Warcraft Rumble — Chaos Reigns in Season 2](https://news.blizzard.com/en-us/article/24033784/warcraft-rumble-chaos-reigns-in-season-2) | Chimaera yetenekleri zehir miktarı, yıldırımda Frost veya dayanıklılık yönleri sunuyor. | Plazma iz/yayılım ve Virüs tempo/onarım baskısı arasında farklı uzmanlık; sayılar kopyalanmadı. |
| [Warcraft Rumble — Turn the Tides of Battle with Earth and Moon](https://news.blizzard.com/en-us/article/24091203/turn-the-tides-of-battle-with-earth-and-moon) | Yetenekler süre uzatma, dosta direnç ekleme ve ikinci kullanım arasında farklı sonuçlar verir. | Yetenek yalnız düz hasar olmak zorunda değil; kapsam/süre/koruma değişebilir. Oyunumuza ikinci kullanım ekonomisi taşınmadı. |
| [Hearthstone — Arise, Knights of the Frozen Throne!](https://hearthstone.blizzard.com/en-us/news/20944003/arise-knights-of-the-frozen-throne-8-10-2017) | Lifesteal verilen hasarı kahraman onarımına bağlayan tek adlandırılmış mekanik. | Dönüşüm anlaşılır tek sonuç üretmeli; Tamponda oranlı ve havuzla sınırlı uygulanır, çekirdeğe ücretsiz sürekli onarım verilmez. |

## Korunan savaş ve ekonomi kuralları

- Saldırı 10 / Savunma 8 / Taktik 6; altı farklı kartlık destede en az bir Saldırı.
- Rastgele uygun boş hücre, mevcut ana hedef türü önceliği ve eşitlik sırası aynı.
  Yakınlık, komşuluk veya oyuncunun seçtiği hücre şartı yoktur. Zincir/yayılım
  mevcut ek hedef sırasını kullanır; asla ana hedefi değiştirmez.
- Aynı kart/sınıf kotası yok; merkez çekirdek dışında 14 hücre ve 3 sn enkaz aynı.
- Tek savaş ekonomisi Akım V8: başlangıç 7, depo 12, pasif 3 sn’de +1.
  Saldırı modüllerinin 100 yeni rakip CAN kaybı VE Savunma modüllerinin 50 yeni
  kendi CAN kaybı birlikte ek +1 kazandırır. Bonus beklemesi yok; artan ilerleme
  taşınır, depo dolduğunda sayaçlar sıfırlanır. Engellenen hasar sayılmaz.
- Süreli/ikincil saldırı CAN kaybı aynı kaynak oyuncunun 100 hasar sayacına **bir kez**
  girer; ayrı gelir kaynağı açılmaz. Onarılmış aynı CAN, yansıma, kalkan kırımı,
  emilim, dost hasarı, fazla hasar ve iyileştirme gelir oluşturmaz.
- Enerji/Isı, sınıf/kopya kotası, üçüncü dakikada hasar/onarım baskısı ve zorunlu
  maç bitişi geri gelmez. 900 sn test gözlem sınırıdır, oyun süresi sınırı değildir.
- Modül mutlak CAN/hasar/onarım/kalkan bütçeleri mevcut `1,04^(seviye−1)` ile
  **bir kez** büyür. Oranlar, hedef sayısı, süreler ve Akım bedeli seviyeyle büyümez.
- Çekirdeğin V5 doğrudan rolleri, eski yetenek bedelleri ve V6 lider sunumu korunur.
  Güçlendirici/Röle modül atışlarını etkiler; çekirdeğin aktif gücünü veya dolumunu etkilemez.

## Etki sözleşmesi: belirsiz bırakılmayacak noktalar

**Temel sıra.** Faz/uygunluk → gerekiyorsa Kırıcı ek kalkan silme → mevcut
zırh/periyodik blok/Kubbe → CAN kalkanları → gerçek CAN kaybı → onarım/yansıma/
iz/yankı türetme. Fazdayken kalkan silinmez. Önceden uygulanmış iz/yük kaynak ölse de
kendi sonuna kadar kalır; hedef ölünce veya savaş bitince iptal olur. Aynı motor
adımındaki mevcut saldırı niyeti sırası korunur. Ölen hedefe yeni ek hedef aranmaz.

**Türeyen hasar.** Füze takip patlaması, Plazma İzi ve Kuantum yankısı ilk doğrudan
vuruşun kalkan/azaltım/overkill sonrası gerçek CAN kaybından hesaplanır. İlk
vuruşun tümü kalkan tarafından emildiyse bu üçü sıfır üretir. Ark/Dron/Plazma
anlık yayılımı ise atışın ham ana hasarı × ilgili oran üzerinden kendi savunma
kontrolüne girer. Her tür hasar Faz ve gerçek CAN kalkanından geçer. Süreli iz/yük
zırhtan etkilenir ama periyodik blok/Kubbe yükü tüketmez; Kuantum yankısı normal
ikincil isabet gibi blok/Kubbeden geçer. Sırf yüzde olduğu için gerçek/saf hasar sayılmaz.

**Özyineleme yok.** Ana/seri mermisi `direct`, yayılım/zincir `secondary`, iz `dot`,
füze takibi `followup`, yankı `echo`, dönüş `reflection` olarak kaynaklanır.
İkincil, iz, takip, yankı ve yansıma yeni iz/yankı/yansıma/atış bonusu doğurmaz.
Yalnız uygun doğrudan isabet Yansıtıcıyı tetikler. Süreli hasarda Tampon emilim
yapabilir; aynı emilim yalnız bir onarım olayı üretir. Canı sıfıra inen kaynak
geri onarımla dirilemez. Kesirli bütçeler biriktirilip deterministik dağıtılır;
1 CAN’ın altındaki her darbeyi sıfıra yuvarlayıp etkiyi yok etmek veya her hedefi
yukarı yuvarlayıp toplamı aşmak yasaktır. Kesir kaydı kaynak/etkiyle sınırlıdır.

**Yığılma.** Bir hedefte bir Plazma İzi, bir Virüs, bir füze takip yükü ve aynı aileden
bir atış/hız yükü bulunur. Yeni tam bütçesi kalan eski bütçeden büyük olan iz/yük
eskinin yerini alabilir; taşan bütçe eklenmez. Eşit/zayıf uygulama süreyi yenilemez.
Virüste daha güçlü oran seçilir; eşit oran süreyi yenilemez. Güçlü Virüs kalan
süresiyle yaşar, sonra yenisi seçilebilir. Temizleme bittiğinde aynı kalan etki
tekrar doğmaz; sonraki gerçek atış yeni etki uygulayabilir. Aynı aile CAN kalkanı
toplanmaz; kalanla yeni bütçenin büyüğü tutulur. Tampon yenilense bile tek havuz;
yenileme başlı başına onarım yaratmaz. Farklı aile kalkanları mevcut kuralla yaşar.

**Tampon ayrıntısı.** Önce sona erecek kalkanın tüketilmesi dahil mevcut kalkan
sırası korunur. Tampon sırası geldiğinde kalan uygun hasarın en çok %70’ini emer;
kalıntı diğer kalkanlardan/CAN’dan geçer. Aynı isabette bir Tampon dönüşümü olur.
İki yaralı alıcı eksik CAN oranı ve mevcut örnek kimliği sırasıyla seçilir; toplam
onarım eşit pay edilir, birinin alamadığı pay aynı iki alıcının diğerine verilebilir.
Yeni üçüncü alıcı aranmaz. Alıcı yoksa paket kaybolur. Tamponu doğrudan hedeflemek
bu kuralı atlatmaz. Yıkılan Tampon kaynağının önceden verdiği havuz süre bitimine
kadar kalır. Kalkan kırımı emilmiş darbe değildir ve dönüşüm üretmez.

**Kuantum ayrıntısı.** Aynı hedefe gerçek doğrudan temaslar sayılır; Fazla tamamen
boşa çıkan atış sayılmaz. Tam CAN kalkanının emdiği gerçek temas sayılır. Dördüncü
atışta CAN kaybı yoksa yankı yoktur. Diğer canlı rakip modüller mevcut sıra ile
alınır; kişi başı en çok %20, toplam temel %60 / yetenekle en çok %80. Havuz
uygun hedeflere eşit bölünür, kişi başı sınır nedeniyle artan pay kaybolur.
Ana hedef çekirdek olabilir ama ek yankı hedefi çekirdek olamaz. Bir kaynak kendi
1–4 sayacını tutar; başka Kuantumların isabetleriyle dolmaz.

**Son Siper ayrıntısı.** Çekirdek kalkanı harcanana kadar kalır, iki dostun kalkanı
5 sn sürer; ikisi ayrı aile bütçeleridir. Dost seçimi canlı, çekirdek olmayan,
kaynak olmayan modüllerde eksik CAN oranı/örnek kimliği sırasıdır. Tek alıcı varsa
40 toplamı o alır; iki alıcı varsa 20/20. Kalkanlar yığılmaz. Gelecekte diriltme
eklenirse aynı savaş örneğinin yıkım tetiki tekrar açılamaz.

**Arındırıcı ayrıntısı.** Dost hedef seçicisi mevcut İmha önceliğini korur. Değişen
şey, seçilmiş dostta kaldırılacak etki için açık sıra tanımlanmasıdır. Temiz Koruma
yalnız sonraki EMP/Virüs **süresini** %30 kısaltır, şiddetini/toparlanmayı değiştirmez.
Süreli koruma yığılmaz, tazelenince kalanla yeni sürenin büyüğü tutulur. Bir kullanım
sonra biter. İmha, Plazma ve füze yükünü engellemez.

## Yetenek sistemi ve eski emek

Dört eşik, her eşikte iki seçenek ve aynı fiyatlar korunur. Kimlikler `0/1/2/3`
ve `power/resilience` aynı kalır; dal adı artık her kartta o etkiye göre gösterilir.
Her kartın aşağıdaki dört satırı **sekiz açık seçenek**, toplam 192 seçenektir.

- Temel: görev gücü +%3 veya CAN +%5.
- İmza: karta özel iki uzmanlık. Yaygınlarda sade sayı/zaman seçimi yeterlidir;
  Destansı/Efsanevilerde etki dağılımını değiştiren seçimler kullanılır.
- İnce ayar: çevrim −%4 (çevrimsiz kartta görev gücü +%4) veya CAN +%5.
- Ustalık: temel görevin gücü +%6 veya CAN +%8; önceki imza dalını seçmek şart değil.

Hesap sırası: yeni temel → imza değişimi → görev çarpanları → diğer çarpanlar →
seviye eğrisi → güvenlik tavanları → bütçeyi koruyan yuvarlama. +%3, +3 yüzde
puan değildir. Örneğin %60 blok ×1,03 = %61,8. Dördüncü Kuantum hasarı ana hasarla
birlikte bir kez artar; ondan türeyen yankı oranı ikinci kez büyütülmez. Tamponda
görev gücü yalnız havuzu büyütür; dönüşüm yüzdesi ayrıca büyümez. Son Siperde iki
kalkan bütçesi birer kez artar. Onarımda 15 toplamdır, üç kere 15 değildir.

**Kayıt geçişi kararı:** Geçerli satın alınmış eşikler aynı yuvada ve ek ücret
almadan yeni karşılıklarına taşınır; seviyeler, parça bakiyeleri, fişler ve önceki
arşivler korunur. Davranışı değişen kartların seçili dalları için geçiş sürümünde
**bir defalık ücretsiz yeniden seçim** hakkı verilir; eski ücretli bedeller iade
edilmez. Hak kart başına/sürüm başına kaydedilir, yeniden girişte çoğalmaz. Geçiş
sonrası normal sıfırlama seçilmiş eşik başına 25 Akı olarak kalır. Bu geçiş kodda
uygulandı ve izole kayıt testlerinden geçti; gerçek oyuncu dosyaları değiştirilmedi.

Koleksiyon açıklaması kısa temel görev + bir imza cümlesi olmalı. İmza dalları
karşılaştırmasında hangi payın arttığı **ve hangisinin azaldığı** birlikte görünür.
Çekirdek yetenek ağacı bu modül kararının kapsamı dışında, V5 olarak korunur.


### Korunan seviye ve fiyat tablosu

Her fiyat Devre Kredisi / Akı; her eşikte yalnız seçilen dal ücretlenir.

| Enderlik | Seviyeler | Temel | İmza | İnce ayar | Ustalık |
|---|---|---|---|---|---|
| Yaygın | 5 / 8 / 11 / 14 | 1000 / 0 | 2000 / 0 | 4000 / 0 | 8000 / 1000 |
| Nadir | 6 / 9 / 12 / 15 | 2000 / 0 | 4000 / 0 | 10000 / 1000 | 20000 / 2000 |
| Destansı (Epik) | 7 / 10 / 13 / 15 | 10000 / 0 | 20000 / 1000 | 30000 / 2000 | 40000 / 3000 |
| Efsanevi | 8 / 11 / 14 / 15 | 10000 / 1000 | 20000 / 2000 | 30000 / 3000 | 40000 / 4000 |

## 24 kartın nihai görev ve yetenek kartları

Sayılar 1. seviye/yeteneksiz tabandır. Yetenek açıklamasındaki sabit değiştirmeler
imza aşamasında uygulanır; temel/ustalık çarpanları bundan sonra gelir.


### Saldırı — 10 kart


#### Lazer — Yaygın · Arena 1

**Akım 3 · CAN 220 · Ana hasar 12 · Çevrim 1000 ms.**

Her 1 saniyede mevcut öncelikli hedefe 12 hasar. Başka pasif yok.

**Karşı hamle ve sınır:** Kalkan, Zırh ve ateşi üzerine alan Bariyer; tek hedefe karşı güvenilir.

**Oyuncunun göreceği:** İnce kırmızı ışın ve tek isabet; yük/süre rozeti gerekmiyor.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Yoğun Işın** — Ana hasar +%8. | **Seri Işın** — Atış çevrimi −%8. |
| İnce ayar / SV 11 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Darbe Topu — Yaygın · Arena 1

**Akım 3 · CAN 198 · Ana hasar 30 · Çevrim 2500 ms.**

0,6 sn görünen hazırlığın ardından 30 hasar; toplam çevrim 2,5 sn.

**Karşı hamle ve sınır:** EMP hazırlığı geciktirir; hedef değişince mevcut hazırlık kuralı korunur.

**Oyuncunun göreceği:** Namlu hazırlığı, tek ağır darbe ve ayrı kısa bas sesi.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Ağır Darbe** — Ana hasar +%10. | **Hazır Namlu** — Hazırlık 0,6 → 0,4 sn; toplam çevrim aynı. |
| İnce ayar / SV 11 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Ray Topu — Nadir · Arena 3

**Akım 4 · CAN 275 · Ana hasar 38 · Çevrim 3000 ms.**

3 sn çevrimde 38 hasar. Hedefin zırh azaltımının %40’ını yok sayar; gerçek CAN kalkanını veya Fazı delmez.

**Karşı hamle ve sınır:** Zırhlıya uzman cevap; düşük zırhlı hedefte maliyet avantajı yok.

**Oyuncunun göreceği:** İnce beyaz delici iz; hedefte yalnız aşılan zırh katkısı gösterilir.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **Derin Delme** — Zırh azaltımını yok sayma %40 → %55. | **Hızlı Ray** — Atış çevrimi −%8; delme aynı. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Füze Fırlatıcı — Nadir · Arena 5

**Akım 4 · CAN 231 · Ana hasar 34 → 29 · Çevrim 3000 ms.**

0,7 sn hazırlık; 3 sn çevrimde 29 ana hasar. 0,6 sn sonra aynı hedefe ana vuruşun gerçek CAN kaybının %20’si kadar ikinci patlama. Yeni hedef seçmez.

**Karşı hamle ve sınır:** İlk vuruşu kalkanla emmek ikinci patlamayı da küçültür. Hedef ölürse, Fazdaysa ya da arada arındırılırsa takip patlaması boşa gider.

**Oyuncunun göreceği:** Füze izi, hedefte küçük geri sayımlı yük ve tek gecikmiş halka.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **Ağır Başlık** — Takip patlaması oranı %20 → %35; ana hasar ve gecikme aynı. | **Hızlı Kilit** — Hazırlık 0,7 → 0,45 sn; takip patlaması 0,6 → 0,3 sn. Toplam çevrim değişmez. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Dron Üssü — Nadir · Arena 6

**Akım 3 · CAN 242 · Ana hasar 8 · Çevrim 900 ms.**

0,9 sn çevrimde ana hedefe 8, mevcut sıradaki ikinci modüle bunun %25’i kadar hasar. İkinci hedef yoksa ek paket kaybolur.

**Karşı hamle ve sınır:** Tek hedef DPS’si Lazerden düşük; iki bağımsız isabetin karşılığı Zırh ve Kubbe.

**Oyuncunun göreceği:** İki ayrı küçük dron yolu; ikincil paketin daha küçük olduğu görülür.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **İkinci Kol** — İkinci hedef oranı %25 → %40; ana hasar aynı. | **Yoğun Sürü** — Ana hasar +%10; ikinci hedef oranı %25 → %10. Tek hedefte uzmanlaşır. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Ark Topu — Destansı (Epik) · Arena 7

**Akım 4 · CAN 275 · Ana hasar 22 → 20 · Çevrim 1800 ms.**

1,8 sn çevrimde 20 ana hasar; mevcut ek hedef sırasındaki iki farklı modüle ana atışın %45 ve %20’si. Ek zincir çekirdeği seçmez.

**Karşı hamle ve sınır:** Tek hedefte düşük verim. Her hedef kendi zırh/blok/Faz/kalkanından ayrı geçer. Zincir yeniden zincir doğurmaz.

**Oyuncunun göreceği:** Ana ark ardından en fazla iki ince sıçrama; üç hedef bağı ayrı kalır.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 7 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 10 | **Geniş Zincir** — İkinci/üçüncü oran %45/%20 → %55/%25. | **Yoğun Ark** — Ana hasar +%10; üçüncü sıçrama kalkar, ikinci %45 kalır. |
| İnce ayar / SV 13 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Plazma Havanı — Destansı (Epik) · Arena 8

**Akım 5 · CAN 270 · Ana hasar 32 → 29 · Çevrim 3600 ms.**

1,2 sn hazırlık, 3,6 sn çevrim: 29 ana hasar ve iki ek modüle %30/%30 yayılım. Ana hedefte gerçek ilk CAN kaybının saniyede %5’i, 3 saniye; toplam %15 Plazma İzi.

**Karşı hamle ve sınır:** Tek hedefte tek Plazma İzi; güçlü iz tamamlanır, eşit/zayıf uygulama süreyi yenilemez. Arındırıcı kalan izi siler. Kaynak ölümü uygulanmış izi silmez.

**Oyuncunun göreceği:** Mor plazma küresi; ana hedefte 3 küçük iz çentiği ve zamanlı isabetler. Isı barı kullanılmaz.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 7 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 10 | **Kalıcı İz** — İz saniyede %5 → %8; iki yayılım %30/%30 → %20/%20. Toplam iz %24. | **Geniş Yayılım** — Yayılım %30/%30 → %40/%40; iz saniyede %5 → %3. Toplam iz %9. |
| İnce ayar / SV 13 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Kuantum Tekrarlayıcı — Efsanevi · Arena 9

**Akım 4 · CAN 250 · Ana hasar 10 · Çevrim 1400 ms.**

1,4 sn çevrimde 10 hasar. Aynı hedefte 4. doğrudan isabet 24 hasar. Bu dördüncü vuruşun gerçek CAN kaybından, diğer rakip modüllere hedef başına en çok %20 / toplam en çok %60 yankı havuzu.

**Karşı hamle ve sınır:** Yankı çekirdeğe gitmez, yankı doğurmaz. Fazla tamamen boşa çıkan isabet sayılmaz; CAN kalkanına gerçek temas sayılır. Hedef değişince sayaç sıfırlanır. Diğer hedefler mevcut sıra ile seçilir.

**Oyuncunun göreceği:** 1–4 görünür sayaç; dördüncüde küçük çoklu mor yankı. Çekirdek yarığı ve lider sesi kullanılmaz.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 8 | **İş gücü +%3** — Normal ve dördüncü ana hasar birlikte; yankı oranı ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 11 | **Yoğun Dördüncü** — Dördüncü temel hasar 24 → 30; toplam yankı %60 → %40. Hedef başına %20 aynı. | **Yaygın Yankı** — Dördüncü temel hasar 24 → 22; toplam yankı %60 → %80. Hedef başına %20 aynı. |
| İnce ayar / SV 14 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Normal ve dördüncü ana hasar birlikte; yankı oranı ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Seri Top — Yaygın · Arena 4

**Akım 3 · CAN 240 · Ana hasar 8 · Çevrim 2100 ms.**

Aynı hedefe 0 / 0,2 / 0,4 sn zamanlarında 3×8 hasar; çevrim 2,1 sn. Hedef ölürse kalan seri iptal.

**Karşı hamle ve sınır:** Blok yükünü küçük ilk mermiyle harcar; kalın Zırha karşı her mermi ayrı azaltılır.

**Oyuncunun göreceği:** Üç ayrı mermi ve üç kısa isabet; tek büyük hasar sayısı kullanılmaz.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Her seri mermisinin hasarı; mermi sayısı ve aralığı aynı. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Sıkı Seri** — Mermiler arası süre 0,2 → 0,15 sn; üç mermi ve çevrim aynı. | **Ağır Mermi** — Her merminin hasarı +%10. |
| İnce ayar / SV 11 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Her seri mermisinin hasarı; mermi sayısı ve aralığı aynı. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Kalkan Kırıcı — Destansı (Epik) · Arena 10

**Akım 4 · CAN 230 · Ana hasar 22 → 20 · Çevrim 2200 ms.**

2,2 sn çevrimde 20 hasar; periyodik tek-isabet bloğunu aşar. Vuruştan hemen önce hedefteki gerçek CAN kalkanından ana ham hasarın %50’sine kadar ek kalkan siler; fazladan kısım CAN’a taşmaz.

**Karşı hamle ve sınır:** Fazı ve zırhı delmez; kalkan yokken ek hasar yok. Tampon havuzu da CAN kalkanı sayılır. Ek kalkan silme onarım veya Akım üretmez.

**Oyuncunun göreceği:** Turuncu çatlak işareti ve yalnız gerçekten silinen kalkanın parçaları.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 7 | **İş gücü +%3** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 10 | **Derin Kırıcı** — Ek kalkan silme bütçesi %50 → %75; CAN hasarı aynı. | **Ağır Kırıcı** — Ana hasar +%10; ek kalkan oranı %50 kalır. |
| İnce ayar / SV 13 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Ana atış hasarı; ikincil etki oranları ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

### Savunma — 8 kart


#### Kalkan — Yaygın · Arena 1

**Akım 3 · CAN 240 → 360 · Ana hasar 0 · Çevrim 1200 ms.**

1,2 sn dolumla, kendisine gelen sıradaki uygun isabetin %60’ını engeller; bir yük saklar.

**Karşı hamle ve sınır:** Seri küçük darbeler yükü tüketir. Sürekli %60 azaltım değildir.

**Oyuncunun göreceği:** Tek kalkan yükü hazırken parıltı; harcanınca tek çatlama.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Blok yüzdesi (yüzde puan değil çarpan). İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Güçlü Blok** — Blok oranı %60 → %68. | **Hızlı Blok** — Blok dolum çevrimi −%15. |
| İnce ayar / SV 11 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Blok yüzdesi (yüzde puan değil çarpan). İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Zırh — Yaygın · Arena 1

**Akım 3 · CAN 288 → 432 · Ana hasar 0 · Çevrim 0 ms.**

Kendi aldığı uygun saldırı hasarını sürekli %25 azaltır. Otomatik onarım yok.

**Karşı hamle ve sınır:** Ray Topu azaltımın bir kısmını deler. Arkadaşları korumaz.

**Oyuncunun göreceği:** Sabit zırh plakası ve engellenen gerçek miktarda metal kıvılcım.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Kendi zırh azaltımı (yüzde puan değil çarpan). İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Kalın Plaka** — Azaltım %25 → %30. | **Sağlam Gövde** — Azami CAN +%12. |
| İnce ayar / SV 11 | **İş gücü +%4** — Kendi zırh azaltımı (yüzde puan değil çarpan). İlgili mevcut değer ×1.04. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Kendi zırh azaltımı (yüzde puan değil çarpan). İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Bariyer — Yaygın · Arena 2

**Akım 3 · CAN 360 → 540 · Ana hasar 0 · Çevrim 0 ms.**

540 CAN. Mevcut sınıf hedef sırası içindeki Bariyer önceliğiyle ateşi karşılar. Yeni taunt/hedef değiştirme kuralı yok.

**Karşı hamle ve sınır:** Saldırmaz, kendi kendini onarmaz. En güçlü silahın tek başına arkasında saklanmasını otomatik zafer yapan aura yok.

**Oyuncunun göreceği:** Büyük siper gövdesi; can kaybı ve onarım açık görünür.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Bariyerin aldığı onarım çarpanı; taban 1. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Derin Siper** — Azami CAN +%12. | **Takviyeli Siper** — Kendi gelen saldırı hasarını %6 azaltır; hedef sırası aynı. |
| İnce ayar / SV 11 | **İş gücü +%4** — Bariyerin aldığı onarım çarpanı; taban 1. İlgili mevcut değer ×1.04. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Bariyerin aldığı onarım çarpanı; taban 1. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Yansıtıcı — Nadir · Arena 4

**Akım 3 · CAN 240 → 360 · Ana hasar 0 · Çevrim 1500 ms.**

1,5 sn dolumda kendisine gelen uygun doğrudan saldırının gerçek CAN kaybının %30’unu aynı kaynağa geri yollar. Ölümcül son isabet de bir kez yansıyabilir.

**Karşı hamle ve sınır:** Emilen kalkan/overkill yansıtılmaz. Yansıma kendini/başka yansımayı veya Akım bonusunu tetiklemez. Alan/süreli/ikincil hasar yeni yansıma açmaz.

**Oyuncunun göreceği:** Gelen kaynakla kısa geri dönüş çizgisi; yalnız gerçek karşı hasar gösterilir.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **İş gücü +%3** — Gerçek CAN kaybından yansıyan oran. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **Güçlü Yansıma** — Gerçek CAN kaybından dönüş %30 → %40. | **Hızlı Ayna** — Yansıma dolum çevrimi −%15. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Gerçek CAN kaybından yansıyan oran. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Muhafız Kubbe — Nadir · Arena 6

**Akım 4 · CAN 320 → 480 · Ana hasar 0 · Çevrim 2000 ms.**

2 sn dolumla başka dosta gelen bir uygun isabetin %35’ini engeller. İlk uygun hazır Kubbe mevcut deterministik sırayla seçilir; kendine işlemez.

**Karşı hamle ve sınır:** Aynı isabette en çok bir Kubbe. Bu paylaşılmış CAN aktarımı değil doğrudan önlemedir; yansıma ve onarım türetmez.

**Oyuncunun göreceği:** Kaynak Kubbeden gerçekten korunan hedefe mavi bağlantı ve tek darbe yayı.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **İş gücü +%3** — Başka dosta bir isabette sağlanan engelleme oranı. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **Güçlü Kubbe** — Engelleme %35 → %42. | **Hızlı Kubbe** — Koruma dolum çevrimi −%15. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Başka dosta bir isabette sağlanan engelleme oranı. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Faz Zırhı — Efsanevi · Arena 8

**Akım 4 · CAN 280 → 420 · Ana hasar 0 · Çevrim 6000 ms.**

Mevcut 6 sn Faz çevriminin 1 sn penceresinde gelen saldırı boşa çıkar. Pencere dışında ek azaltım/onarım yok; kendisini korur.

**Karşı hamle ve sınır:** Pencere açık görünür. EMP altında Faz çalışmaz; hazır konumdaki diğer Fazlar tüm devreyi korumaz. Yeni yerleşimle devreye genel bağışıklık verilmez.

**Oyuncunun göreceği:** Yalnız kendi gövdesinde yarı saydam titreşim; Faz açık/kapalı keskin anlaşılır.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 8 | **İş gücü +%3** — Faz penceresi süresi. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 11 | **Uzun Faz** — Faz penceresi 1 → 1,2 sn. | **Sık Faz** — Faz çevrimi 6 → 5,4 sn. |
| İnce ayar / SV 14 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Faz penceresi süresi. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Tampon — Destansı (Epik) · Arena 7

**Akım 3 · CAN 250 → 375 · Ana hasar 0 · Çevrim 6000 → 8000 ms.**

8 sn çevrimde mevcut dost seçim kuralıyla bir hedefe 5 sn yaşayan 60 CAN emilim havuzu. Her uygun isabetin en çok %70’i havuzdan emilir. Gerçek emilenin %40’ı en yaralı iki diğer dost modüle onarım olarak pay edilir; çekirdek ve havuz sahibi hariç.

**Karşı hamle ve sınır:** Havuz başına temel en çok 24 onarım. Kalkan Kırıcı ile silinen havuz onarım üretmez. Aynı hedefte tek Tampon, aynı isabette tek dönüşüm; boşa giden onarım bankalanmaz.

**Oyuncunun göreceği:** Hedefte havuz değeri olan mavi kalkan rozeti; her gerçek emilimden yaralılara ince yeşil paketler.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 7 | **İş gücü +%3** — Tampon havuzu; emilim ve dönüşüm yüzdeleri ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 10 | **Yoğun Tampon** — Havuz 60 → 75; dönüşüm %40 → %30. Havuz başına en çok 22,5 onarım. | **Onaran Tampon** — Havuz 60 → 50; dönüşüm %40 → %60. Havuz başına en çok 30 onarım. |
| İnce ayar / SV 13 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Tampon havuzu; emilim ve dönüşüm yüzdeleri ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Son Siper — Efsanevi · Arena 12

**Akım 3 · CAN 320 → 420 · Ana hasar 0 · Çevrim 0 ms.**

420 CAN. Her savaş örneği yıkılırken bir kez kendi canlı çekirdeğine 75 kalıcı CAN kalkanı ve en yaralı iki dost modüle toplam 40 CAN / 5 sn kalkan bırakır.

**Karşı hamle ve sınır:** Aynı aile kalkanları toplanmaz; kalanla yeni değerlerden büyük olanı tutulur. Çekirdeği diriltmez; devrede canlı modül yoksa ek 40 kaybolur. Hücre enkazı aynı kalır.

**Oyuncunun göreceği:** Yıkımda çekirdeğe kalın olmayan altın bağ ve en çok iki mavi koruma paketi; kaynak başına bir defa.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 8 | **İş gücü +%3** — Son Siperin çekirdek ve dost kalkan bütçeleri birlikte; yalnız bir defa. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 11 | **Çekirdek Mirası** — Çekirdek kalkanı 75 → 90; dost toplamı 40 → 25. Toplam 115 aynı. | **Devre Mirası** — Çekirdek kalkanı 75 → 60; dost toplamı 40 → 60. Toplam 120. |
| İnce ayar / SV 14 | **İş gücü +%4** — Son Siperin çekirdek ve dost kalkan bütçeleri birlikte; yalnız bir defa. İlgili mevcut değer ×1.04. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Son Siperin çekirdek ve dost kalkan bütçeleri birlikte; yalnız bir defa. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

### Taktik — 6 kart


#### Onarım — Yaygın · Arena 1

**Akım 3 · CAN 180 · Ana hasar 0 · Çevrim 2000 ms.**

Mevcut en yaralı uygun dost modüle toplam 15 CAN’ı 3 darbeye yayar. İlk darbe uygulamada, diğerleri +1/+2 sn; etki kilidi 3 sn. 2 sn çevrim hazır olsa bile aynı hedefteki yenilenme üst üste binmez. Çekirdeği ve kendini onarmaz.

**Karşı hamle ve sınır:** Tam CAN’a aşan miktar kaybolur; başka Onarım aynı etkili hedefe yük bindirmez. Kaynak ölse de verilmiş süreli paket tamamlanır.

**Oyuncunun göreceği:** Kaynak-hedef yeşil bağ, her gerçek onarım darbesinde küçük sayı; toplamı tekrar ekleyen sahte sayı yok.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Onarımın toplam miktarı; her darbe ayrı çarpılmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Yoğun Onarım** — Toplam onarım +%20; süre ve darbe sayısı aynı. | **İlk Yardım** — Aynı toplamın ilk darbeye düşen payı 1/3 → %50; sonraki iki darbe %25/%25. Toplam/süre/çevrim aynı. |
| İnce ayar / SV 11 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Onarımın toplam miktarı; her darbe ayrı çarpılmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Güçlendirici — Yaygın · Arena 1

**Akım 3 · CAN 162 · Ana hasar 0 · Çevrim 3000 ms.**

3 sn çevrimde mevcut dost silah seçicisiyle bir silahın sonraki gerçek atışına +%25 yük. Aynı aileden yalnız en güçlü tek yük.

**Karşı hamle ve sınır:** Yük birikmez; çekirdek gücü hedef olmaz. Seri Topta yalnız tek mermi; ikincil hedef oranları aynı atışın bonuslu ana bütçesinden hesaplanır.

**Oyuncunun göreceği:** Güçlendiriciden seçilen silaha tek yeşil yük; atışla tüketilen simge.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 5 | **İş gücü +%3** — Bir sonraki atış bonusu yüzdesi. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 8 | **Güçlü Yük** — Sonraki atış bonusu %25 → %30. | **Sık Yükleme** — Yükleme çevrimi −%12. |
| İnce ayar / SV 11 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 14 | **İş gücü +%6** — Bir sonraki atış bonusu yüzdesi. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### EMP — Nadir · Arena 2

**Akım 3 · CAN 144 · Ana hasar 0 · Çevrim 6000 ms.**

6 sn çevrimde mevcut sabotaj seçicisinin bir hedefini 1 sn durdurur; bitişinden sonra 3 sn yeniden EMP hedefi olamama koruması.

**Karşı hamle ve sınır:** İki EMP süresiz kilit kuramaz. Kesinti büyümesi 3 sn toparlanmayı küçültmez. Çekirdeğin aktif gücü bu kartın hedefi değildir.

**Oyuncunun göreceği:** Tek elektrik halkası, hedefte kesinti süresi ve ayrı toparlanma işareti.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **İş gücü +%3** — EMP kesinti süresi; toparlanma korunur. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **Uzun Kesinti** — Kesinti 1 → 1,2 sn; toparlanma 3 sn kalır. | **Hızlı Darbe** — EMP çevrimi −%10; kesinti ve toparlanma aynı. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — EMP kesinti süresi; toparlanma korunur. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Yavaşlatıcı Virüs — Destansı (Epik) · Arena 11

**Akım 3 · CAN 160 · Ana hasar 0 · Çevrim 7000 ms.**

7 sn çevrimde mevcut sabotaj seçicisinin bir hedefinin eylem aralığını 4 sn boyunca %25 uzatır. Yeni bir hasar veya Akım sistemi değildir.

**Karşı hamle ve sınır:** Tek hedefte tek Virüs; güçlü mevcut etki tamamlanır, aynı/zayıf süre yenilemez. Arındırıcı temizler. Çekirdeğin dolumunu ve aktif gücünü etkilemez.

**Oyuncunun göreceği:** Hedefte mor çalışma yayı yavaşlar; takvim bitince normal tempoya döner.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 7 | **İş gücü +%3** — Virüs aralık uzatma yüzdesi; yan onarım cezası ayrıca artmaz. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 10 | **Yoğun Yavaşlık** — Aralık uzatma %25 → %30; süre aynı. | **Onarım Bozucu** — Aralık uzatma %25 → %15; aynı 4 sn boyunca hedefin aldığı onarım −%25. Kalkanı azaltmaz. |
| İnce ayar / SV 13 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Virüs aralık uzatma yüzdesi; yan onarım cezası ayrıca artmaz. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |

#### Arındırıcı — Nadir · Arena 3

**Akım 3 · CAN 200 · Ana hasar 0 · Çevrim 4000 ms.**

4 sn çevrimde tek dosttan tek olumsuz etki siler. Mevcut İmha İşareti hedef önceliği korunur; seçilmiş hedefte silme sırası İmha → Plazma İzi → Takip Füze Yükü → EMP → Virüs.

**Karşı hamle ve sınır:** Silerken bedava onarım yapmaz. Geçerli olumsuz etki yoksa dolum harcanmaz. Kalkan, enkaz ve dördüncü isabet sayacı olumsuz etki değildir.

**Oyuncunun göreceği:** Arındırıcıdan gerçek hedefe beyaz-yeşil çizgi; silinen tek rozet görünür biçimde söner.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **Arındırma −%3** — Arındırma çevrimi −%3; silinen etki sayısı aynı. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **Sık Arındırma** — Arındırma çevrimi −%15; bir etki siler. | **Temiz Koruma** — Başarılı arındırmadan sonra aynı hedefte 2 sn tek kontrol koruması: sonraki EMP/Virüsün süresi −%30. İmha/hasar yüklerini engellemez; birikmez. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **Arındırma −%6** — Arındırma çevrimi −%6; silinen etki sayısı aynı. | **CAN +%8** — Azami CAN ×1.08. |

#### Hız Rölesi — Nadir · Arena 5

**Akım 3 · CAN 170 · Ana hasar 0 · Çevrim 5000 ms.**

5 sn çevrimde mevcut uygun dost silah seçicisiyle tek hız yükü verir. Sonraki atıştan sonraki bekleme %20 kısalır; mevcut hazırlığı/seri içi mermileri atlatmaz.

**Karşı hamle ve sınır:** Yükler birikmez; çekirdeğin ateşine veya dolumuna uygulanmaz. Birikmiş anlık atış zinciri üretmez.

**Oyuncunun göreceği:** Hedef silaha turkuaz ok ve sonraki beklemede kısalan yay.

| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |
|---|---|---|
| Temel / SV 6 | **İş gücü +%3** — Sonraki bekleme kısaltma yüzdesi. İlgili mevcut değer ×1.03. | **CAN +%5** — Azami CAN ×1.05. |
| İmza / SV 9 | **Güçlü Hız Yükü** — Bekleme kısaltması %20 → %25. | **Sık Röle** — Yükleme çevrimi −%12. |
| İnce ayar / SV 12 | **Çevrim −%4** — Atış/eylem çevrimi −%4; hazırlık, seri içi aralık ve etki süresi aynı. | **CAN +%5** — Azami CAN ×1.05. |
| Ustalık / SV 15 | **İş gücü +%6** — Sonraki bekleme kısaltma yüzdesi. İlgili mevcut değer ×1.06. | **CAN +%8** — Azami CAN ×1.08. |
## Sayısal kararların gerekçesi

Yeni imza eklerken her silahın toplamını da büyütmüyoruz. Seviye 1, yeteneksiz,
tüm hedefler uygun ve savunmasızken; aşağıdakiler analitik üst sınırlardır:

| Kart | Önce | Yeni başlangıç bütçesi | Sonuç |
|---|---:|---:|---|
| Füze | 34 / 3 sn | 29 ×1,20 = en çok 34,8 / 3 sn | Hasarın bir kısmı gecikmeli ve temizlenebilir |
| Ark | 22 ×1,45 =31,9 / 1,8 sn | 20 ×1,65 =33 / 1,8 sn | Üçüncü hedefe erişim; toplamda yaklaşık +%3,4 |
| Plazma | 32 ×1,60 =51,2 / 3,6 sn | 29 ×1,75 =50,75 / 3,6 sn | Süreli iz eklenirken toplam korunur |
| Kuantum | 3×10+24 =54 / 5,6 sn | en çok 3×10+24×1,60 =68,4 / 5,6 sn | Dolu tahtada +%26,7; tek hedefte eski toplam, testte özellikle izlenir |
| Tampon | en çok 60 / 6 sn koruma | en çok (60+24) / 8 sn =10,5 CAN/sn | Eski 10’a yakın; korumanın bir bölümü onarıma dönüşür |
| Son Siper | 320 CAN +75 çekirdek kalkanı | 420 CAN +75 çekirdek +40 dost kalkanı | İlk V7 adayı 280 CAN idi; V7.1 savunma dayanıklılık kararıyla 420 oldu |

Bu toplamlar farklı hedeflere yayılır; tek hedef öldürme süresi veya gerçek
onarım verimiyle aynı değildir. Plazma/füze/yankının gerçek CAN kaybından türemesi
savunmaya karşı bu üst sınırı daha da düşürür. Kuantumun en yüksek dolu tahta
kazancı riskli bir ilk test değeridir: aşırı baskın çıkarsa önce toplam yankı
%60 → %40 denenir; ek çekirdek hedefi veya bedel artışıyla sorun gizlenmez.
V7 mekaniklerinin ilk testinde yalnız Saldırı baskın kaldı. Savunma CAN’ında
×1,25 / ×1,50 / ×1,75 / ×2 karşılaştırıldı. ×1,50 karma stratejiyi avantajlı
duruma taşırken ×1,75 ve ×2 ek kazanım vermeden gözlem aşımı üretti. Bu nedenle
sekiz Savunmanın CAN’ı **ilk V7 adayına göre ×1,50** seçildi. Bu açık kart
istatistiğidir; devreye karma sınıf koyana gizli bonus veya kota verilmedi.

Güvenlik tavanları seviyeden bağımsızdır: sıradan zırh %40, tek blok %80,
Kubbe %55, yansıma %50, Faz en çok 1,5 sn ve çevrimin %25’i, EMP en çok 1,5 sn
ve ardından en az 3 sn koruma; Virüs aralık uzatması %35, onarım cezası %25;
Güçlendirici %40, Röle %30; Tampon emilim %70/dönüşüm %60; yankı hedef başına
%20/toplam %80; Plazma toplam iz %24. Normal seçimler tavanı sessizce aşmamalı;
denge incelemesi bunu belge denetiminde de kontrol eder. Çekirdek lider güçleri
ayrı sözleşmedir; bu modül tavanlarına kırpılmaz.

## Arena ve sezon kararı

Mevcut Devre Yolu adları/eşikleri, kartların arena açılışları ve ücretsiz kazanımı
korunur. Her arenada en az bir yeni kart: aşağıdaki dağılım ana veriden doğrulanır.
İlk arenada karmaşık iz/yankı yok; önce ateş, korunma ve destek anlaşılır.

| Arena | Yeni kartlar |
|---|---|
| 1 — Başlangıç Devresi | Lazer, Darbe Topu, Kalkan, Zırh, Onarım, Güçlendirici |
| 2 — Röle Sokakları | Bariyer, EMP |
| 3 — Akım Kavşağı | Ray Topu, Arındırıcı |
| 4 — İletken Dökümhane | Seri Top, Yansıtıcı |
| 5 — Neon Omurga | Füze Fırlatıcı, Hız Rölesi |
| 6 — Plazma Kanalları | Dron Üssü, Muhafız Kubbe |
| 7 — Darbe Surları | Ark Topu, Tampon |
| 8 — Kuantum Hattı | Plazma Havanı, Faz Zırhı |
| 9 — İyon Kalesi | Kuantum Tekrarlayıcı |
| 10 — Çekirdek Sınırı | Kalkan Kırıcı |
| 11 — Shard Nexus | Yavaşlatıcı Virüs |
| 12 — Apex Devre | Son Siper |

Her sezon en az bir yeni kart ve biriken katalog ilkesi korunur. Bu çalışma
başlangıçtaki 24 karta odaklıdır; sonraki sezonda 25+ olabilir. Her sezon Efsanevi
eklemek gerekmez. Yeni kart temel görev çakışmasını azaltmalı, ücretsiz erişim,
görsel, ses, gerçek mekanik ve karşı hamle testinden geçmeli. Önceki sezon
fikirlerinin durumu bu kararla güncellenmiştir:

| Önceki sezon fikri | Yeni karar | Gerekçe |
|---|---|---|
| Yankı Rölesi | ertelendi | Kuantum yankısıyla ve Güçlendiriciyle görev çakışıyor; ücretsiz ek saldırı zinciri riski. |
| Kor Fırlatıcı | yeniden_tasarlanacak | Plazma iziyle aynı sürekli hasar görevini tekrar etmemeli. |
| Darbe Muhafızı | aday | Tampondan ayrışan, gerçek alınan hasarla bir kez dolan kendine kalkan; ayrıntısı sezon öncesi test edilecek. |
| Toparlanma Feneri | ertelendi | Son Siper ve Onarımla görev çakışması; ölüm→onarım döngüsü ölçülmeden eklenmez. |

Henüz hazır olmayan sezon kartını isim doldurmak için yayınlamayacağız. Burada
sezon takvimi, yeni kart fiyatı veya arenaya hazır olmayan kart kaydı değiştirilmedi.

## Görsel, ses ve öğretici sözleşmesi

Her kartın aşağıdaki görsel kanıtı gerçek kaynak ve hedefe bağlanır. Mevcut
en fazla üç küçük durum rozeti sınırı korunur; yeni bar/ek ekonomi yok.
İzlerde kalan darbeler, Kuantumda 1–4 sayaç, Tamponda kalan havuz, Fazda açık
pencere, Son Siperde gerçek varış hedefleri görünür. İşlem gerçekleşmezse sahte
hasar/onarım efekti oynatılmaz. Renk tek başına bilgi taşımaz; biçim/ses de ayrıdır.
Yetenekler aynı görsel aileyi değiştirir, her dal yeni büyük ekran efekti açmaz.

Çekirdeğin büyük mühürleri, kanadı, kale/portal/yarık dili ve 14 lider sesi
modüllere verilmez. Modül sesleri küçük isabetlerdir; ikincil/çoklu isabet aynı
olayda ses yığını üretmez. Geçmiş V6 kaynak bütçeleri korunur; zayıf telefonda da
esas hedef bağlantısı ve imza sayacı kalır, süs azaltılır. Gizlenme/maç sonu/reset
VFX ve ses sahipliğini bırakır. Yeni ısı barı veya tam ekran sürekli titreşim yok.

İlk öğretici akışı kısa: “Kartına dokun, boş hücreye kurulsun” → gerçek saldırı
ve CAN kaybı → “Akım doldukça devreni büyüt” → hazır çekirdek. Zincir/iz/emilim
ilk edinildiğinde tek satır kart bilgisiyle anlatılır. Oyuncu metni okumadan
oynamaya devam edebilir; okunabilir etki hedefte görülür.

## Aşamalı uygulama ve her adımın test kapısı

| Sıra | İş | Geçiş koşulu |
|---|---|---|
| 1 | effect_provenance, non_recursive_damage, budget_rounding, contribution_telemetry, snapshot_version | Kaynak/hedef/efekt bütçesi tekrar güvenli; canlı değerler değişmez. |
| 2 | plasma_mortar, missile_launcher, cleanser | Süreli iz/yük, ölüm/Faz/temizleme ve kayıt yeniden oynatma testleri. |
| 3 | buffer_shield, shield_breaker, reflector | Emilim/onarım bütçesi, kalkan silme ve yansıma Akım döngüsü üretmez. |
| 4 | arc_cannon, quantum_repeater, last_bastion | Dolu tahtada paylaşılan sınırlar; yıkım bir kez; ana hedef sırası aynı. |
| 5 | all_24_talents, virus, cleanser_control_guard, AI, collection, tutorial, VFX, sound | 192 seçenek/384 dört-dal kombinasyonu ve tüm seviyeler; eski bedeller/kayıtlar; okunabilir etkiler. |
| 6 | paired_engine_battles, phone, human_strategy_sessions | İlk kayıp, çekirdek katkısı, kamp ve süre dağılımı raporlanır; test gözlem aşımı kazanma sayılmaz. |

Her adım sonunda sonuç yazılır, sonraki adımın sayıları ona göre güncellenir.
Yeni mekanik eski hatayla dengelenmez. Gerekirse sıradaki kart bekler; biten
adımın gerçek motor/arayüz tutarlılığı önce çözülür. Ayrı kalıcı deney oyunu
açılmaz; ana oyunun aynı motoru ve izole test verileri kullanılır. Kullanıcı
telefonda oynarken sunucu veya paket bu belge yazımı nedeniyle yenilenmez.

**Motor kontrolü:** kalkan/Faz/ölüm/arınma; iki taraflı aynı adım; ölen kaynak;
overkill; 1 CAN; kesirli bütçe; kayıt/yeniden bağlanma/tekrarlanan olay; aynı
karta çoklu kopya; çekirdek V5’in yedi rolü; eski fiyatların bağımsız sözleşmesi.
24 kart × 16 tam ağaç =384 son-seviye ağaç kombinasyonu parametre doğrulaması,
ayrıca seviye 1/8/15’te yalnız açılmış dallarla gerçek savaş matrisi gerekir.
Bütün 384×384 deste eşleşmesi test edildiği iddia edilmeyecek.

**Karşılaştırmalı savaş matrisi:** aynı başlangıç durumu, seviye, tohum ve AI
politikası; taraflar değiştirilerek eski/yeni çiftleri. Her kart için yer aldığı
en az iki altılı deste: rolünü kullanan ve zayıf kaldığı rakibe karşı. Tek silah+
beş savunma/taktik, çok saldırı, karma, kesinti ve arındırma desteleri; düşük,
orta ve 14 modüllü tahta; yeteneksiz/tüm sol/tüm sağ ve karışık dallar. Günlük
meta kapalı taban ölçümünün ardından beş metayla etkileşim. Hazır tahta hasar
testi ile sıfırdan gelişen gerçek ekonomi savaşı ayrı raporlanır.

**Ölçümler:** ilk kurulumdan ilk modül kaybına süre; silahın katkı vermeden
yıkılma oranı; ilk 3 çevrimde öldürme; gerçekten eksilen ve yeni sayılan CAN;
emilim/onarım/boşa onarım; Akım bonus payı; çekirdek kullanım/katkısı; medyan/p90
savaş süresi; sonsuz onarım veya kontrol kilidi; AI tercihleri; iki dalın işe
yaradığı karşılaşmalar. İyi silahı ilk kuran her eşleşmede otomatik kazanmamalı.
Tek-Saldırı deste tercih edilen karşılarını yenebilir; karma Saldırıya karşı
evrensel üstünlüğü olmamalı. Yalnız simülasyon kazanma yüzdesinden insan metası
çıkarılmaz; süre uzaması tek başına kalite değildir.

**İlk inceleme eşikleri (otomatik güçlendirme/nerf değil):** eşit seviyede temel
tek silah tek dolu CAN’lı silahı 3 veya daha az normal çevrimde yok ediyorsa;
ilgili eski/yeni eşleşme medyanı %20’den fazla kısalıyorsa; tek-Saldırı kamp
desteleri karşı matrisin %55’inden fazlasını kazanıyorsa; 900 sn gözlem aşımları
%1’i geçiyorsa inceleme durur. 900 sn’ye ulaşan sonuç beraberlik/kazanma diye
sayılmaz. Sonraki karar için gerçek maç kaydı ve oyuncu gözlemi gerekir.

**Telefon/yayın:** 320/375/393 CSS piksel, düşük görsel kalite ve hareket azaltma,
14 modül+çoklu imza, tekrar maç/arka plana alıp geri dönme kontrol edilir.
Kaynak/hedef/sayaç gözle anlaşılır olmalı. Sunucu+istemci kural sürümü aynı
paketle çıkar; eski istemci yeni etkiyi sessizce yanlış çizmez. Açık maç eski
kural sürümünde tamamlanır veya güvenli sürüm kapısıyla korunur. Geri dönüş
oyuncu satın alma/yeniden seçim kaydını silmez. Mağaza/üretim yayını ayrı işlemdir.

## Bu çalışmada doğrulanan ve bekleyen

24/24 kart, 10/8/6 sınıf dağılımı, 8/8/5/3 enderlik dağılımı, 12/12 arena açılışı,
192/192 seçenek, 384 tam ağaç ve üç seviyede 1.152 aritmetik stres yapılandırması
doğrulandı. Seviye kilitlerine uygun, boş seçime de izin veren 2088
kısmi/tam yapılandırma sayıldı. Fiyat ve eşikler mevcut kodla bire bir; Akım
bedelleri aynı. Sayı güvenlik tavanları geçildi. Kanıt:
`artifacts/module-decisions-v7/design-audit.json`. Bu **tasarım/aritmetik denetimidir**.

Buradaki doğrulama tasarım dosyası/aritmetik denetimidir. Gerçek motor, kayıt,
istemci ve karşılaştırmalı savaş testleri ayrı uygulama raporunda listelenir.
Mevcut V6 telefondadır; V7’nin telefona kurulduğu anlamına gelmez.
