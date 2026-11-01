# CAN ve Akım — sıralı değerlendirme, 28 Ekim 2026

> Tarihsel ilk değerlendirme. Kullanıcının strateji kurma süresi hedefi üzerine
> yeniden ele alındı; aşağıdaki "değerleri koru" kararı artık güncel değildir.
> Yeni deneyler: `artifacts/strategy-window-20261028/`; güncel durum
> `CODEX_CHECKPOINT.md` başında. 240sn bir oyun süresi sınırı değildi ve tek
> başına başarısızlık ölçütü olarak kullanılmamalıydı.

**Karar:** Önceki aşamada uygulanmış CAN/hasar eğrileri ve seçici modül
güçlendirmeleri korunuyor. Bu tur ek CAN/hasar değişikliği yapılmadı.
Akım başlangıcı6, depo12 ve dolum2.500ms/+1 olarak korunuyor. Daha hızlı
dolum ve büyük depolar yalnız ayrı süreçlerin belleğinde denendi;
ürüne, canlı sunucuya veya telefon APK'sına aktarılmadı.

Kullanıcının istediği sıra izlendi: silahlar → savunmalar → destek/enerji/
sabotaj → çekirdek → Akım hızı/deposu. Bir aşamadaki sonuç sonraki aşamanın
deneyini belirledi; her aşamada sayı değiştirmek bir başarı şartı sayılmadı.

## 1. Silahlar

25 deste/36 kart, 1–8–15 seviyeler, taraf değişimi ve bir tohumla1.800 maç.
Mevcut motorun modül yerleştirme/yıkım ve gerçek atış olayları izlenerek
her örneğin ömrü, aldığı vuruş, atış sayısı ve ilk atıştan önce yıkımı ölçüldü.
15.seviyede örneklenen silah medyanları:

| Silah | Yıkılan örnek | Ömür (sn) | Atış | İlk atışsız yıkım |
|---|---:|---:|---:|---:|
| Lazer | 1.119 | 4,2 | 5 | 6 |
| Darbe Topu | 838 | 5,0 | 3 | 3 |
| Füze | 544 | 4,45 | 2 | 6 |
| Ray | 419 | 4,9 | 2 | 2 |
| Ark | 222 | 5,25 | 4 | 4 |
| Dron | 507 | 4,6 | 6 | 5 |
| Plazma | 186 | 4,6 | 2 | 2 |
| Tekrarlayıcı | 269 | 4,4 | 5 | 4 |
| Sürü | 163 | 6,1 | 8 | 1 |
| İyon | 172 | 5,0 | 2 | 2 |
| Kuantum | 442 | 5,45 | 3 | 1 |

Toplam4.881 yıkılan silahın36'sı ilk atışını yapamadı: %0,74. Silah başına
oran yaklaşık%0,2–1,8. Bu değer bütün modüllerin ortalama ömrü değildir;
sağ kalanlar ömür medyanına alınmadı. İlk çevrimi tamamlayabilme ve rol
çevrimi bakımından yeni genel CAN artışını gerektiren bulgu çıkmadı.
Önceki seçici ağır silah CAN artışları zaten mevcut.

**Sonraki aşama:** Silahları topluca güçlendirmek yerine, savunmanın aynı
kurulum Akımına karşı kazandırdığı süreyi ayrı ölçmek.

## 2. Savunmalar

7savunma ×11silah ×3seviye ×2hedef =462deney. Bir hedef gerçek savunma;
diğeri aynı kurulum Akımındaki normal bir silahın CAN'ını taşıyan, saldırı
yapmayan nötr hedef.3Akım için Lazer100;4Akım için Kuantum135 taban CAN
referansı alındı. Tüm silah/seviyelerde hiçbir savunma nötr hedeften daha
kısa yaşamadı.15.seviye medyan dayanma oranları:

| Savunma | Nötr hedefe göre süre |
|---|---:|
| Kalkan | 3,45× |
| Sönümleyici | 3,73× |
| Bariyer | 2,47× |
| Yansıtıcı | 1,91× |
| Muhafız Kubbesi | 2,37× |
| Faz Zırhı | 1,83× |
| Prizma | 2,44× |

Saldıran silah bu laboratuvarda yansımayla erken ölmesin diye çok yüksek
mevcut CAN'la tutuldu; gerçek karşı saldırı kazanımı bu süre oranına dahil
değil. Savunma etkileri, enerji ve ısı motor tarafından işlendi.
**Karar:** Ek savunma CAN'ı yok; sonraki inceleme ilk katkısını bekleyen
destek/enerji/sabotaj kartları.

## 3. Destekler, enerji ve sabotaj

İlk katkı ölçerinde soğutmanın `heat_before/heat_after` alanları ve sabotajın
`attacker_module_id` alanları doğru okunacak şekilde ölçüm aracı düzeltildi.
Aynı1.800 maç tekrarlandı; bu tekrar bağımsız yeni oyuncu örneklemi değildir.
Onarım/Nano/Anka/Soğutucu/Batarya/Matris gibi örneklenen kartların doğal
maçlarda ilk katkıdan önce yok olmasında yaygın bir CAN sorunu görülmedi.

18kart ×4tehdit ×2silah sayısı ×3seviye =432bağlamlı deney ayrıca yapıldı.
Destekler için yaralı/sıcak dost silahlar; dar sabotaj rolleri için uygun
rakip destek/enerji hedefleri vardı. Bu düzeneklerde bütün kartlar ilk
katkısını yapabildi. Bu, her gerçek yerleşimin mutlaka katkı yapacağı
anlamına gelmez; deney koşulları ilgili fırsatı özellikle sağlar.

Kapasitörün aksiyon sırasında boşalması genel `module_contribution` olayında
tam izlenmediğinden, bu olaydan “iş yapmadan öldü” sonucu çıkarılmadı.
Kapasitör dolu depo/boş çekirdek rezerviyle bir ani tüketim fırsatında ayrı
sınandı; gerçek `module_energy_discharged` sayacıyla katkısı doğrulandı.
Soğuk başlangıçtaki kullanılmamış depoya CAN eklemek doğru teşhis olmazdı.

**Karar:** İlgili fırsatı bulunca katkı veren kartları genel CAN artışıyla
güçlendirmemek. Şimdi ana hedefin korumasız/korumalı süresini ölçmek.

## 4. Çekirdek

11silah ×1/2kopya ×3seviye ×5koruma seçeneği =330deney.
Çekirdek gücü, yeniden kurulum ve AI yok; bakım/aksiyon enerjisi, ısı ve
savunma motoru açık. Başta hazır yerleşmiş, gerçek CAN'lı çekirdek ölçüldü.

| Seviye | CAN | Tek silaha karşı medyan | İki silaha karşı medyan |
|---|---:|---:|---:|
| 1 | 300 | 23,5sn | 10,9sn |
| 8 | 514 | 31,6sn | 14,5sn |
| 15 | 881 | 38,4sn | 18,5sn |

En hızlı iki silahlı korumasız yıkım1.seviyede7,1sn,15.seviyede10,9sn.
15.seviyede iki silaha karşı tek Kalkan medyanı28sn, Sönümleyici34,5sn;
korumasız18,5sn.330deneyin tamamında çekirdek deney sınırında yıkıldı.

**Karar:** Çekirdeğe ek CAN yok. Korumasız ve korunmuş çekirdek arasında
anlamlı süre var; genel artış onarım/savunmalı maçları gereksiz uzatabilir.
Son aşamada hayatta kalma sorununu Akım ile karıştırmamak için dolum ve
depo ayrı deney parametreleri yapıldı.

## 5. Akım: dolum hızı ve depo

Başlangıç6 sabit.25deste ×600eşleşme/seviye ×3seviye ×6ayar =10.800maç.

| Dolum | Depo | Sonuç |
|---|---:|---|
| 2,5sn | 12 | Mevcut referans; 1.800maçta bitmeyen0 |
| 2,5sn | 14 | Aktif oynayan AI'da referansla aynı savaş/harcama/yerleştirmeler |
| 2,5sn | 16 | Aktif oynayan AI'da referansla aynı savaş/harcama/yerleştirmeler |
| 2,2sn | 12 | Daha fazla yerleştirme; ilk atışsız yıkım ve deste sonuçları değişti |
| 2,2sn | 14 | Bu aktif AI matrisinde 2,2sn/12 ile aynı sonuç |
| 2,0sn | 12 | 1.seviyede Darbe/Onarım eşleşmesinin iki yönü240sn'de bitmedi |

15.seviyede2,2sn ile oyuncu başına zaman ortalamalı canlı modül sayısının
oyuncular arasındaki medyanı1,79→2,24; medyan Akım harcaması24→26 oldu.
Yıkılan silahlarda ilk atış yapamama oranı36/4.881(%0,74)→128/5.230(%2,45).
Lazer ömrü medyanı4,2sn kaldı; Kalkan14,7→11,5sn, Kuantum5,45→5,2sn oldu.
Dolayısıyla hızlı üretim daha çok kart getirirken sahadaki hasar baskısını
da artırıyor. Örnek Kuantum destesinin sonucu48eşleşmede%54→%73 değişti;
bu canlı meta oranı değil, tempo değişiminin bu AI matrisindeki hassasiyeti.

Depoların eşitliği yalnız yuvarlak medyandan çıkarılmadı:1.800referans
maçın her birinde14/16varyantlarının kazananı, süresi, modül ölçümleri,
harcaması ve yerleştirmeleri birebir aynı bulundu. AI, Akım dolmadan kart
bastığı için büyük depo kullanılamadı.

Bu sınırlamayı aşmak için8deste,1/15seviye, taraf değişimi,4ayar ve3politika
ile1.344ek maç: bir taraf3sn'de bir karar verir; bir taraf25sn bekler;
iki taraf da25sn biriktirerek başlar. Bir tarafın savunmasız beklemesi
çoğu maçta birikimden önce kaybetmesine yol açtı. İki taraf beklediğinde
14/16depo gerçekten daha fazla başlangıç birikimi ve farklı sonuç üretti.
Bu özel açılış, genel oyun üstünlüğü veya depo artışı gerekliliği sayılmadı.
Üretim hareketsizlik sistemi bu kontrollü bekleme deneyinde kapalıydı.

**Son karar:**2,0sn reddedildi.2,2sn yalnız deney adayı; bu tur kabul edilmedi.
Daha çok yerleştirme tek başına ilk dört aşamada korunan dayanıklılığı
iyileştirmiyor. Dolum2,5sn, depo12 ve başlangıç6 korunuyor.12Akım zaten
üç adet4Akımlık kurulum bütçesi taşıyor; depo artışı üretim hızını artırmaz.

## Kanıt ve kapsam

Bu tur15.744motor koşumu; bunun ilk iki1.800'ü aynı tohumların ölçüm aracı
tekrarı. Ek1.224kontrollü rol deneyi. Sayılar bağımsız canlı oyuncu sayısı
değildir; AI karar politikası, örnek desteler ve seçilen yetenek profilleri
sonuçları etkiler. Bütün yetenek dalları/gerçek oyuncu metasının dengelendiği
iddiası yok. Yeni telefon performansı veya APK testi yapılmadı; sayısal
oyun kaynakları değiştirilmediği için önceki test APK'sı aynı.

179mevcut savaş/CAN/Akım regresyonu geçti. Pytest önbelleğine yazı izni
uyarısı test sonucunu etkilemedi. Kaynakların ve kararın özeti
`artifacts/durability-current-20261028/decision.json` içinde.

Araçlar:`tools/audit_durability_current.py`, `tools/probe_durability_roles.py`.
Kanıt kökü:`artifacts/durability-current-20261028/`; aşamalar ayrı klasörde,
ham maçlar/özetler/deneyler saklandı. Canlı hesap/DB/site/Play değişikliği yok.

## 36 kartın referans matristeki CAN/katkı özeti

Taban CAN1.seviyedir; ömür15.seviyedeki örneklenen yıkımlardır. Silahlarda
“ilk katkısız” ilk atışsız demektir; diğerlerinde pozitif katkı olayları
aranmıştır. Kapasitörün izleme kısıtı3.aşamada açıklanmıştır. Örnek sayısı0
olan kartlarda bu matrise bakarak rol üstünlüğü çıkarılamaz.

| Modül | Taban CAN | 15. seviye örneklenen yıkım | Medyan ömür (sn) | İlk katkısız yıkım |
|---|---:|---:|---:|---:|
| Lazer | 100 | 1119 | 4.2 | 6 |
| Kalkan | 150 | 130 | 14.7 | 0 |
| Batarya | 120 | 59 | 5.8 | 0 |
| Soğutucu | 100 | 66 | 5.7 | 0 |
| EMP | 80 | 50 | 7.1 | 0 |
| Güçlendirici | 90 | 0 | None | 0 |
| Onarım | 100 | 142 | 6.2 | 0 |
| Zırh | 180 | 26 | 19.6 | 0 |
| Darbe Topu | 90 | 838 | 5.0 | 3 |
| Füze Fırlatıcı | 105 | 544 | 4.45 | 6 |
| Hedefleme Bilgisayarı | 85 | 14 | 3.4 | 0 |
| Bariyer | 165 | 20 | 16.75 | 0 |
| Ark Topu | 125 | 222 | 5.25 | 4 |
| Kapasitör | 90 | 38 | 3.5 | Olay günlüğü tek başına yeterli değil |
| Dron Üssü | 110 | 507 | 4.6 | 5 |
| Sinyal Bozucu | 85 | 1 | 5.0 | 0 |
| Ray Topu | 125 | 419 | 4.9 | 2 |
| Akım Dengeleyici | 100 | 3 | 5.6 | 0 |
| Yansıtıcı | 110 | 4 | 8.15 | 0 |
| Nano Sağlıkçı | 95 | 15 | 9.5 | 0 |
| Virüs | 70 | 17 | 7.6 | 0 |
| Aşırı Hızlandırıcı | 80 | 11 | 5.6 | 0 |
| Plazma Havanı | 125 | 186 | 4.6 | 2 |
| Muhafız Kubbesi | 155 | 19 | 19.0 | 0 |
| Kuantum Tekrarlayıcı | 105 | 269 | 4.4 | 4 |
| Krono Rölesi | 88 | 27 | 7.7 | 0 |
| Faz Zırhı | 150 | 2 | 25.25 | 0 |
| Sürü Fabrikatörü | 105 | 163 | 6.1 | 1 |
| Hassasiyet Matrisi | 110 | 3 | 13.4 | 0 |
| İyon Mızrağı | 130 | 172 | 5.0 | 2 |
| Prizma Kalkanı | 165 | 30 | 10.45 | 0 |
| Kesici | 80 | 1 | 3.9 | 0 |
| Anka Onarım | 100 | 2 | 22.55 | 0 |
| Kuantum Topu | 135 | 442 | 5.45 | 1 |
| Omega Güçlendirici | 95 | 14 | 9.7 | 0 |
| Tekillik Projektörü | 90 | 4 | 9.75 | 0 |
