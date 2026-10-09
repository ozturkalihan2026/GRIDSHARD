# Modül ve çekirdek incelemesi — 8 Ekim 2026

36 seçilebilir modülün runtime tanımı, enerji/ısı/sabotaj/destek/saldırı
mekaniği ve katalog açıklaması gözden geçirildi. Kaynaklar:
`server/app/arena_canon.py`, `server/data/arena_progression_v1.json`,
`server/app/game/{catalog,catalog_view,combat,support,sabotage,energy,heat,core_balance}.py`.
Değerler seviye 1, yeteneksiz, ısı/enerji kesintisi olmadan temel değerlerdir.
Canlı oyuncu desteleri veya maç kimlikleri bu rapora alınmadı.

## Karar

Enderlikler korunur: **6 Yaygın, 12 Nadir, 11 Destansı, 7 Efsanevi**.
Kartların CAN, hasar, enerji, süre, Akım maliyeti ve yetenekleri değiştirilmedi.
Enderlik tek başına gizli sayısal çarpan vermez; mevcut bütün rarity stat
profilleri 1,00'dır. Güç büyümesi seviye/yetenekten, kimlik imza mekaniğinden
gelir. Enderliği değiştirmek bu talebin ve mevcut dengeleme kanununun dışında.

Uygulanan değişiklik yalnız üç kısa destek etiketidir: her saldırının sabit
%15 aldığı izlenimi kaldırıldı; paylaşılan hasar/hız ve en ağır hedefe ısı
karşılığı destek açıklandı. İngilizce karşılıklar mevcut i18n sözlüğündedir.

Tek sayısal düzenleme adayı aşağıdaki **Tekillik / Kesici maliyet ayrımı**dır.
Bu öneri uygulandı diye sunulmamalı; metrikli dengeleme turu gerekir.

## Sistem (3)

Enerji, Akım'dan farklıdır: Akım kart yerleştirme bütçesi; enerji devrenin
aksiyon ve bakım kaynağıdır. Batarya/Kapasitör rezervi saldırı aralığı değildir.

| Kart / ID | Enderlik | Akım | CAN | Rol ve sınır |
| --- | --- | ---: | ---: | --- |
| Batarya / `battery` | Yaygın | 2 | 120 | 4,5 enerji/sn, 20 rezerv; enerji darboğazı çözümü |
| Kapasitör / `capacitor` | Nadir | 2 | 90 | Üretim 0, rezerv 10; daha hızlı dolum/boşalım, açıkta Batarya'dan önce boşalır |
| Akım Dengeleyici / `current_balancer` | Nadir | 3 | 100 | Aksiyon/bakım maliyetinde %8 azaltım; çoklu kopya %24 tavan; bakım 0,4 enerji/sn |

**Karar:** üretici, ani rezerv ve verimlilik rolleri ayrı; mevcut sayıları
koru. Kapasitörün tanımdaki 2.500 ms değeri bir silah atış periyodu değildir;
Batarya yerine enerji ürettiği varsayılmamalı.

## Saldırı (11)

Hasar ve aralık yalnız ana vuruştur; yankı/alan/deliş dahil basit DPS hesabı
tek başına dengeleme değildir. Enerji aksiyon başına ödenir, bakım 0'dır.

| Kart / ID | Enderlik | Akım / CAN | Hasar / aralık(sn) | Enerji/atış | Kimlik ve bedel |
| --- | --- | --- | --- | ---: | --- |
| Lazer / `laser` | Yaygın | 3 / 100 | 12 / 1 | 1,2 | Ucuz sürekli hedef; Kalkan/Yansıtıcı karşılar |
| Darbe Topu / `pulse_cannon` | Nadir | 4 / 115 | 32 / 2,5 | 5 | Ani hasar; Zırh/Sinyal Bozucu karşılar |
| Dron Üssü / `drone_bay` | Nadir | 3 / 110 | 8 / 0,9 | 1 | Düşük enerjiyle sürekli baskı; Zırh azaltır |
| Füze Fırlatıcı / `missile_launcher` | Nadir | 3 / 105 | 28 / 3 | 4,5 | Hedef kilidi ve alan; hedef değişimi kilidi sıfırlar |
| Ark Topu / `arc_cannon` | Nadir | 4 / 100 | 20 / 1,8 | 3,5 | Zincirleme hasar da savunmadan geçer; Bariyer/EMP karşılar |
| Ray Topu / `railgun` | Destansı | 4 / 95 | 40 / 3,2 | 6 | Delici saldırı; yüksek enerji/ısı, düşük CAN |
| Plazma Havanı / `plasma_mortar` | Destansı | 4 / 100 | 30 / 3 | 5,5 | 1,2 sn kilit, %35 ikinci hedef; kilit saldırı aralığına dahildir |
| Kuantum Tekrarlayıcı / `quantum_repeater` | Destansı | 5 / 92 | 24 / 1 | 2,8 | Aynı hedefe dördüncü vuruşta %65 yankı; hedef değişirse sayaç sıfır |
| Sürü Fabrikatörü / `swarm_fabricator` | Destansı | 3 / 105 | 6 / 0,9 | 2,2 | Dördüncü atışta üç hedefe sürü; birikim/susturma ve düşük ana hasar bedeli |
| İyon Mızrağı / `ion_spear` | Efsanevi | 6 / 100 | 48 / 3,2 | 7 | Savunma azaltımının %60'ını yok sayar, %55 arka hedef; yüksek enerji/ısı |
| Kuantum Topu / `quantum_cannon` | Efsanevi | 6 / 105 | 58 / 2,5 | 8 | Boşa giden enerjiden yük, sonraki atışa en fazla %80; fazla enerji gerektirir |

**Karar:** üst kartlarda enerji, Akım, CAN veya hedef/birikim/ısı bedeli
mevcut. Tekrarlayıcı Lazer'in aynı maliyetli kopyası değildir (5 vs 3 Akım,
2,8 vs 1,2 enerji, 92 vs 100 CAN). Sürü Dron'dan daha yüksek aksiyon enerjisi
öder ve daha düşük tek hedef hasarı üretir. Sayıları koru; yüksek seviyede
çekirdek/ısı/enerji kombinasyonlarının maç verisi ayrıca gereklidir.

## Savunma (7)

| Kart / ID | Enderlik | Akım / CAN | Bakım enerji/sn | Etki ve karşı oyun |
| --- | --- | --- | ---: | --- |
| Kalkan / `shield` | Yaygın | 3 / 150 | 0,8 | Enerjiliyken kendine %35 azaltım; Darbe/EMP karşılar |
| Zırh / `armor` | Yaygın | 3 / 180 | 0,5 | Kendine %25 azaltım; pasif ama bakım bedelli; Ray/Lazer karşılar |
| Bariyer / `barrier` | Nadir | 3 / 165 | 0,5 | Kendine %20, saldırıyı üstlenme; enerjiliyken sabotaj sürelerini %25 kısaltma |
| Yansıtıcı / `reflector` | Destansı | 3 / 110 | 0,6 | Kendine %25, aldığı son hasarın %20'sini geri yansıtma; Ray/EMP karşılar |
| Muhafız Kubbesi / `guardian_dome` | Destansı | 4 / 155 | 1 | Kendine %32, diğer modüllere %12; kubbeyi yok etmek korumayı bitirir |
| Faz Zırhı / `phase_armor` | Destansı | 4 / 150 | 0,5 | Her 6 sn'nin ilk 1 sn'sinde bağışıklık; kalan 5 sn %18 azaltım |
| Prizma Kalkanı / `prism_shield` | Efsanevi | 4 / 165 | 1 | Kendine %30; engellenenin dörtte biri çekirdek rezervine; susturulunca dönüşüm yok |

**Karar:** pasif dayanıklılık, süreli pencere, devre koruması ve enerji
dönüşümü ayrı. Efsanevi Prizma'nın düz azaltımı Yaygın Kalkan'dan yüksek
değildir; imzası enerji dönüşümüdür. Yansıtıcı'nın 1.800 ms katalog değeri
normal saldırı DPS'si değildir. Sabotaj/ısı/enerji durumu etkinliği etkiler.

## Destek (10)

| Kart / ID | Enderlik | Akım / CAN | Enerji | Kimlik ve bedel |
| --- | --- | --- | --- | --- |
| Onarım Modülü / `repair` | Yaygın | 3 / 100 | 2,5/eylem | 15 CAN / 2 sn; yaşayan en düşük CAN oranlı tek hedef, virüs/bozma temizliği |
| Soğutucu / `cooler` | Yaygın | 2 / 100 | 0,25/sn | En sıcak 3, susmuş öncelikli; temel %4,5 ısı/sn, aşırı ısınmışta 2 kat; EMP/hat süresini 2 sn/sn kısaltır |
| Güçlendirici / `amplifier` | Nadir | 3 / 90 | 0,4/sn | Toplam %30 hasar payı tüm saldırılara; hedef başına en fazla %15 |
| Hedefleme Bilgisayarı / `targeting_computer` | Nadir | 3 / 85 | 0,4/sn | Toplam %30 bekleme azaltım payı; hedef başına en fazla %15 |
| Nano Sağlıkçı / `nano_medic` | Nadir | 3 / 95 | 3/eylem | En yaralı 2 hedefe temel onarımın %62'si / 2 sn; yoğun tek hedef ateşini daha zor karşılar |
| Aşırı Hızlandırıcı / `overclock_unit` | Destansı | 3 / 80 | 0,8/sn | En ağır saldırıda hasar ×1,2, bekleme ×0,8, ek %1,5 ısı/sn; susarsa başka ağır hedef |
| Krono Rölesi / `chrono_relay` | Destansı | 3 / 88 | 0,7/sn | 4 sn bekleme ×0,72, ardından 2,5 sn zaman borcu (bekleme ×1,18, hasar ×0,95) |
| Hassasiyet Matrisi / `precision_matrix` | Destansı | 3 / 90 | 0,6/sn | Aynı hedefte 4 kademe; kademe başına %4 hasar / %3 hız; hedef değişimi sıfırlar |
| Anka Onarım / `phoenix_repair` | Efsanevi | 4 / 100 | 5/onarım, 10/diriltme | 30 sn'de bir %30 CAN diriltme; modül başına bir kez ve sınıf sınırı; yoksa güçlü tek hedef onarım |
| Omega Güçlendirici / `omega_amplifier` | Efsanevi | 3 / 95 | 0,8/sn | Farklı sınıf başına %8 toplam hasar bütçesi, en fazla 5 sınıf; paylaşılan, hedef başına %20 tavan |

**Karar:** temel paylar 1–2 saldırıda %15, 3 saldırıda %10, 4 saldırıda
%7,5, 6 saldırıda %5 olur; seviye/ısı etkiyi ayrıca değiştirir. Saldırı
desteklerinin yüzdeleri sınırsız üst üste eklenmez: hasar/hız katkısı ile
sıralanan uygun en güçlü tek destek etkisi seçilir. Krono zaman borcu ayrıca
uygulanır. Soğutucu güçlüdür fakat 3 hedef tavanı vardır.
Anka erken ekonomide düz Onarım'dan pahalıdır, diriltme sınırsız değildir.
Bu turda açıklamaları düzelt, sayıları koru.

## Sabotaj (5)

Sabotajın runtime normal saldırı hasarı 0'dır; aynı kartın ayrıca silah
döngüsüne girmesi önlenmiştir. Süreler direnç/ısı/seviye öncesi temeldir.

| Kart / ID | Enderlik | Akım / CAN | Süre / bekleme(sn) | Enerji/eylem | Rol |
| --- | --- | --- | --- | ---: | --- |
| EMP / `emp` | Nadir | 3 / 80 | 2,5 / 6 | 6 | Hedef sistemi susturma |
| Sinyal Bozucu / `jammer` | Nadir | 3 / 85 | 4 / 5 | 5 | Destek/kontrol bozma |
| Virüs / `virus` | Destansı | 4 / 70 | 6 / 7 | 6 | Her sn 4 hasardan başlayıp +2 artan enfeksiyon; direnç/temizleme yoksa teorik 54 |
| Kesici / `disruptor` | Efsanevi | 3 / 80 | 3,5 / 6,5 | 8 | Ana hat + ikinci sisteme %50 süreli yankı |
| Tekillik Projektörü / `singularity_projector` | Efsanevi | 3 / 90 | 4,5 / 6,5 | 8 | Ana hat + ikinci sisteme %65 süreli yankı |

**Düzenleme adayı — henüz uygulanmadı:** Tekillik ile Kesici aynı mekanik
aile, Akım 3, enerji 8 ve bekleme 6,5 sn kullanıyor; Tekillik +10 CAN,
ana süre +%28,6 ve yankı 2,925 sn yerine Kesici'nin 1,75 sn'sine göre daha
uzun kesinti sağlıyor. Karşı kartlar da aynı aileden. Mevcut tabanda bu
avantajı dengeleyen ek maliyet görünmüyor; yalnız daha yüksek enderlik
gerekçesi de yok, ikisi zaten Efsanevi.

Önerilen ilk deney: **Tekillik Akım 3 → 4**, CAN ve imzası/enderliği
korunsun. Bu, uzun/çift kesintiyi koruyup ilk kurulum ve tekrar yerleştirmede
fırsat maliyeti yaratır; bütün değerlerini Kesici'ye indirmek kimliğini siler.
Ancak sayı değişikliği öncesi eşit seviye/yetenekli zamanlı yerleştirme testleri
gerekir: tarafları ters çevirerek enerji kısıtlı/bol, Bariyer/Soğutucu var/yok,
çok hedefli ve farklı destekli devreler; yerleştirme zamanlaması, çalışabilir
süre, enerji beklemesi ve sonuç dağılımı ölçülmeli. Canlı tek maç bu nerf için
yeterli kanıt değildir. Ölçümlü dengeleme kanıtı olmadığı için bu turda
sayısal nerf uygulanmadı.

## Çekirdekler (7)

Aynı seviye sayısal taban ve enderlik profili korunur. İmza incelemesi:

| Çekirdek | Ayrışan koşul / imza |
| --- | --- |
| Rezonans | Tek onarım darbesi: çekirdeğe 45, modüllere 15 CAN; tam CAN'da kullanılmaz ve dolum korunur |
| Muhafız | Çekirdek yarı CAN'ın altındayken modül kalkanı 20→30, çekirdeğe 60 |
| Aşırı Yük | Güç sırasında yok edilen rakip modül başına +1 sn, toplam en fazla +2 sn |
| Kesinti | Tam dolumdan sonra her 4 sn bekleme +0,5 sn kesinti, toplam en fazla +2 sn |
| Kapasitör | Rezervi tamamen harcar; en az yarı dolu rezervde 2 yerine 3 indirimli yerleştirme |
| Anka | Tam dolumla ölümcül çekirdek vuruşundan maçta bir kez %25 CAN ile doğuş; dolum sıfır |
| Kuantum | %50'de yalnız 4 sn kalkan; tam dolumda kalkan + onarım |

Koşul/risk–ödül ve karşı oyun mevcut; bu turda değişiklik önerilmedi.

## Kanıtın kapsamı

Tam sunucu koşusu 1.294 başarılı / 39 skip; mekanik, enerji, destek,
sabotaj, çekirdek imzaları, ortak sayısal taban ve görünür katalog testlerini
de içerir. Bunlar işlev ve sözleşme doğrulamasıdır, bütün 36 kart için güncel
ekonomiyle dengeli kazanma oranı kanıtı değildir. Eski round-robin simülasyonu
yalnız önceden yerleştirilmiş sınırlı devreler kullanır; güncel rastgele hücre,
Akım ve zamanlı oyuncu yerleştirmesinin yerine geçmez. Yeni sayısal değişiklik
gerekirse bu sınırlılık açıkça korunmalıdır.

