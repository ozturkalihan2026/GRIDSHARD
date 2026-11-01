# 24 modül ve enderlik incelemesi — 31 Ekim 2026

> **1 Kasım güncellemesi:** Bu aday incelemesinin yerine tüm 24 kart ve 192 yetenek
> seçeneğini kapsayan [nihai V7 tasarım kararı](NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md)
> hazırlanmıştır. V6 tarihsel araştırmadır; yeni V7 davranışları henüz çalışan motora uygulanmadı.

**Durum: araştırma ve somut tasarım önerisi.** Bu dosyadaki yeni modül mekanikleri
henüz ana savaş motoruna uygulanmadı. Bu turdaki çalışan değişiklikler ısı
çubuğunun kaldırılması ve yedi çekirdeğin özel görsel/sesli sunumlarıdır. Mevcut
24 kartın hasar, CAN, Akım bedeli, enderlik ve yetenek fiyatları değişmedi.

## Resmî örneklerden çıkarım

Supercell'in Haziran 2024 tanıtımı, aynı gün üç farklı enderlikte mekanik kimlik
örneği sunuyor: Nadir Goblin Demolisher düşük CAN davranışı ve ölüm patlamasına;
Destansı Goblin Curse alan etkisi ve ölümde dönüşüme; Efsanevi Goblin Machine
ise yakın dövüşü ile uzaktaki roketi birlikte kullanmaya dayanıyor. Bu, yalnız
hasarı artırmanın ötesinde farklı tetik ve kapsam tasarımları kullanılabildiğini
gösteriyor. [Resmî kart tanıtımları](https://supercell.com/en/games/clashroyale/blog/release-notes/game-update-june-17/)

Efsanevi Phoenix'in tanıtımında yeniden doğuş, rakibin yumurtayı kırarak
önleyebildiği ve bir yerleşimde bir kez oluşan bir koşula bağlı. Buradan aldığım
ilke: etkili bir imza için görünür karşı hamle ve tekrar sınırı tasarlamak.
Bu bir 2022 tasarım örneğidir; bugünkü kart sayılarını kopyalamıyorum.
[Resmî Phoenix ve Monk tanıtımı](https://supercell.com/en/games/clashroyale/blog/release-notes/new-update-october-2022/)

Blizzard'ın Ragnaros tanıtımında sabit duran liderin yapıyı koruması ve yeteneğin
belirli CAN eşiğinde süreli bir yardımcı çağırması gibi rollere yer veriliyor.
Bu, GRIDSHARD çekirdeğinin ayrı bir lider sunumuna sahip olması için anlamlı bir
referans; görsel veya kart istatistiği kopyalanmadı.
[Resmî Ragnaros tanıtımı](https://news.blizzard.com/en-gb/article/24091205/earn-powerful-rewards-in-molten-core)

Bunlar örnek oyunların tüm enderlik sistemi için evrensel kural iddiası değildir.
Aşağıdaki oranlar ve sınırlar GRIDSHARD için benim önerimdir.

## Önerdiğim enderlik dili

| Enderlik | Oyuncunun hissetmesi gereken fark | Tasarım sınırı |
|---|---|---|
| Yaygın | Anında anlaşılan ve güvenilir bir temel görev | Ucuz kartların stratejik değeri korunur; çok sayıda gizli pasif eklenmez |
| Nadir | Belirli bir soruna uzman cevap veya bir koşullu etki | Zırha karşı delme, tek kaynağa yansıma, kesinti/arındırma gibi açık karşılık |
| Destansı | Vuruşun ardından iz, zincir, emilimi başka etkiye dönüştürme | İkincil etkinin bütçesi, süresi ve birikme kuralı açık olur |
| Efsanevi | Hazırlanıp görülen, savaşın yönünü değiştiren bir imza anı | Sayaç, sınırlı pencere veya yıkım tetiki; sürekli sınırsız bağışıklık/hasar yok |

Enderlik kartın sabit kimliği olarak kalır. Seviye atlamak kartı farklı bir
enderliğe geçirmez. Oyuncu kart seçerek farklı mekanik alır. Üç sınıf ve 24 kart,
ana hedef öncelikleri ve rastgele yerleşim korunur. Özellikler kart başına
seçilir; her efsaneviye aynı anda alan hasarı + yakma + onarım yüklemem.

## Verdiğin örneklerin sayılarını nasıl sınırlarım?

**Bütün devreye %20 hasar:** 14 rakip savaş modülü varsa, bir hedefteki 100
hasarın diğer 13 modüle de %20 gitmesi toplam 360 hasar eder. Görünüşte küçük
oran, dolu tahtada 3,6 kat toplam hasara dönüşür. Kuantum Tekrarlayıcı için bunu
her atış yerine dördüncü isabette, hedef başına en çok %20 ve toplamda o gerçek
isabetin %60'ı kadar bir yankı havuzu olarak öneriyorum. Tahtadaki diğer canlı
modüllere paylaştırılır; çekirdek bu dalganın ek hedefi olmaz. Ana hedef sırası
aynıdır. Dolu tahtada 24'lük dördüncü darbenin ek havuzu en çok 14,4 CAN olur.
Bu bütçe, hasar önlenmişse veya hedefte yalnız 1 CAN kalmışsa ham hasardan
üretilmemeli; gerçekten eksilen CAN esas alınmalı.

**%5, 3 saniyelik iz:** Burada önerdiğim yorum saniyede %5, toplam %15.
Plazma Havanı'nda ana hedefte üç ayrı darbe olarak görünür; birikmez, güçlü iz
korunur ve Arındırıcı temizleyebilir. 32 ana hasar + iki %30 yayılımın üst sınırı
14,22 hasar/sn. Ana hasar 29 olursa, aynı yayılım ve %15 iz ile yaklaşık 14,10
hasar/sn olur. Böylece mekanik zenginleşirken toplam saldırı bütçesi neredeyse
aynı kalır. Kesirli küçük hasar darbeleri her defasında sıfıra yuvarlanmamalı;
toplam bütçe korunarak dağıtılmalı.

**%70 emilim ve yaralılara dağıtma:** Emilenin tamamı sınırsız onarım yapılırsa,
100 gelen hasarda 70 onarım ve yalnız 30 kayıp oluşur: tahta saldırıya uğradıkça
40 CAN kazanabilir. Tampon Kalkan için ilk adayım 60 CAN emilim havuzu, gelen
isabetin en çok %70'ini emme, emilenin %40'ını en yaralı iki dosta bölüştürme.
Böylece havuz başına ek onarım en çok 24 CAN'dır. Çekirdek bu onarım hedefleri
arasında değildir. Öneri dolumu 6'dan 8 saniyeye çıkarınca, tam verim 10'dan
10,5 koruma+onarım/sn'ye çıkar; sınırsız iyileşme oluşmaz. Bu bir matematiksel
üst sınır çalışmasıdır, henüz oynanmış denge testi değildir.

## 24 kartın tek tek değerlendirmesi

### Yaygın

| Modül | Karar / öneri | Sınır ve karşı hamle |
|---|---|---|
| Lazer | **Koru** — Düzenli tek hedef ışını; güvenilir temel kart. | Ek pasif gerekmez; tek hedefte verimli kalır. |
| Darbe Topu | **Koru** — Hazırlığı görünen ağır tek darbe. | Hazırlık kesilebilir; düşük atış hızı karşılığında güçlü tek vuruş. |
| Seri Top | **Koru** — Üç gerçek mermilik seri. | Seri tek hedefte kalır; hedef ölürse kalan mermiler yeni hedefe sıçramaz. |
| Kalkan | **Koru** — Dolunca bir isabetin bir bölümünü engeller. | Sık küçük darbeler bloğu tüketebilir. |
| Zırh | **Koru** — Sürekli kendi hasarını azaltır. | Ray Delici bunun uzman karşılığıdır. |
| Bariyer | **Koru** — Yüksek CAN ile ateşi üzerine alan sade tank. | Yeni otomatik iyileşme eklenmez; Onarım gibi desteğe ihtiyaç duyar. |
| Onarım | **Koru** — Tek yaralı dosta 3 saniyeye yayılan, birikmeyen onarım. | İki onarım aynı hedefte yenilenme yığmaz; kaynak susturulabilir. |
| Güçlendirici | **Koru** — Tek dost silahın sıradaki atışına görünür yük. | Yükler üst üste birikmez. |

### Nadir

| Modül | Karar / öneri | Sınır ve karşı hamle |
|---|---|---|
| Ray Topu | **Koru** — Zırh azaltımının bir kısmını aşan uzman atış. | CAN kalkanı ve Faz farklı karşılıklar olarak kalır. |
| Füze Fırlatıcı | **Yeniden tanımla** — Ana isabetten 0,6 sn sonra aynı hedefte %20 ikinci patlama adayı. | Ek patlama yeni hedef aramaz; hedefin ölmesi/fazı avantajı bozar. Ana hasar bütçesi buna göre düşürülür. |
| Dron Üssü | **Koru** — İki hedefe küçük paketler dağıtır. | Tek hedefe yüksek toplam hasar veren yaygın kartın yerine otomatik geçmez. |
| Yansıtıcı | **Netleştir** — Yalnız saldırının geldiği kaynağa, gerçek alınan CAN hasarından yansıma önerisi. | Yansıma yansımayı tetiklemez; kalkanın emdiği hayali hasar geri dönmez. |
| Muhafız Kubbe | **Koru** — Belirli aralıkla bir dosta gelen darbeye ortak olur. | Kendini korumaz; birden fazla kubbe tek isabeti sınırsız küçültmez. |
| EMP | **Koru** — Tek modülü kısa süre durdurur. | Görünür toparlanma koruması sonsuz kesinti zincirini önler. |
| Arındırıcı | **Koru** — Bir olumsuz etkiyi kaldırır; İmha İşaretini önce seçer. | Dolum aralığı nedeniyle doğru zamanda karşılık gerekir; onarım da yapan genel kart yapılmaz. |
| Hız Rölesi | **Koru** — Tek silahın bir sonraki bekleme aralığını kısaltır. | Hız yükü birikmez; etkisi bir sonraki gerçek atıştan sonra görülür. |

### Destansı

| Modül | Karar / öneri | Sınır ve karşı hamle |
|---|---|---|
| Ark Topu | **Genişlet** — Ana hedef + %45 ikinci + %20 üçüncü hedef zinciri adayı. | Toplam yayılım sınırlı; ana hedef ve ek hedef sırası mevcut seçiciyle korunur. |
| Plazma Havanı | **Yeniden tanımla** — İki ek hedefe mevcut alan vuruşu; ana hedefte 3 sn boyunca saniyede gerçek ana hasarın %5 izi. | Toplam iz %15; tek iz, birikmez, Arındırıcı kaldırır. Öneri temel hasar 32→29 ile toplam bütçe korunur. |
| Kalkan Kırıcı | **Genişlet** — Periyodik bloğu aşar; CAN kalkanından ölçülü ek bütçe koparan uzmanlık adayı. | Ek kalkan kırımı CAN hasarı sayılmaz; zırhı ve Fazı aynı anda aşmaz. |
| Tampon | **Yeniden tanımla** — 60 CAN havuzundan, gelen isabetin %70ini emer; emilenin %40ını en yaralı iki dosta paylaştırır. | Havuz başına en çok 24 onarım; çekirdek dahil değil. Öneri döngü 6→8 sn. Tam CAN/dolu kalkan serbest gelir üretmez. |
| Yavaşlatıcı Virüs | **Koru** — Bir hedefin çalışma aralığını sınırlı süre uzatan zaman baskısı. | Plazma iziyle aynı işi tekrarlamak yerine tempo uzmanlığı korunur; Arındırıcı kaldırabilir. |

### Efsanevi

| Modül | Karar / öneri | Sınır ve karşı hamle |
|---|---|---|
| Kuantum Tekrarlayıcı | **Genişlet** — Aynı hedefte her dördüncü isabette karşı tahtanın diğer modüllerine devre yankısı. | Hedef başına en çok %20; TOPLAM en çok dördüncü gerçek vuruşun %60ı. Çekirdeğe sıçramaz; her atışta değil. |
| Faz Zırhı | **Koru** — Her 6 saniyede 1 saniyelik görünür Faz penceresi. | Sürekli bağışıklık/onarım eklenmez; bekleme aralığında karşılık verilebilir. |
| Son Siper | **Genişlet** — Yıkımda çekirdek kalkanı yanında sınırlı bir son iletim paketi adayı. | Örnek ek toplam 40 CAN kalkan en çok 2 dosta bölünür; kendi CANı 320→280 ile toplam bütçe korunabilir. Bir kaynak bir kez tetikler, kalkanlar yığılmaz. |

## Uygulama ve test sırası

Önce **Plazma izi**, sonra **Tampon Kalkanın emilim/onarım dönüşümü**, ardından
**Kuantum devre yankısı**. Üçü de kullanıcının istediği farkı farklı sınıflarda
somutlaştırıyor. Birbirinin sonuçlarını maskelemeden, her adımda mevcut ana
motorun aynı deste ve tohumlarına karşı karşılaştırılmalı.

- Seviyeler 1 / 8 / 15; iki yetenek dalı, düşük ve dolu tahta.
- Tek hedef, zırh, Faz, CAN kalkanı, Arındırıcı ve yıkılan kaynak.
- Ana/ikincil/süreli hasar aynı etkiyi tekrar tetikleyerek zincir üretmemeli.
- Emilen/onanmış CAN ek Akım çift sayımına dönüşmemeli; yeni en düşük CAN kuralı korunmalı.
- Onarım ve kalkan alanında dolu CAN, birden fazla kaynak ve tek-silah savunma politikası.
- İlk modül kaybı, savaş süresi, gerçek hedef hasarı, engellenen/onanmış miktar ve
  kullanılan Akım birlikte ölçülmeli; yalnız kazanma sayısına bakılmamalı.
- Koleksiyon metni, iki yetenek dalı, AI kart değerlendirmesi, VFX ve ses aynı
  mekaniğe göre güncellenmeli; eski yetenek fiyatları/kimlikleri korunmalı.
- Efsanevi modül efektleri güçlü olabilir; çekirdeklerin ayrı lider sunumuna ait
  büyük mühür/dalga/geçit dili ve sesleri modüllere verilmemeli.

Tüm liste makine okunur `docs/MODUL_ENDERLIK_ADAYLARI_V6.json` dosyasında.
`tools/analyze_rarity_budgets_v6.py` 24 kartın kapsandığını ve yukarıdaki örnek
bütçeleri doğrular. Çıktı `artifacts/core-hero-v6/rarity-budgets.json`.
Bu araç gerçek savaş simülasyonu çalıştırmaz ve yeni önerilerin dengeli olduğunu
kanıtlamaz. Ana oyunun 24 kartı, oyuncu sahipliği ve ücretli yetenekleri bu
araştırma nedeniyle değiştirilmedi.
