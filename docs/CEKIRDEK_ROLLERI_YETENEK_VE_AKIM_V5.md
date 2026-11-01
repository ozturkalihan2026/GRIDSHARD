# Çekirdek rolleri, yetenekler ve Akım — 30 Ekim 2026

Kullanıcının son kararı: Çekirdekler doğrudan savaşta etkili olacak; 5/9/13.
seviyelerdeki iki dallı yetenek ağacı eski maliyetlerle geri gelecek. Yeni
yetenekler mevcut savaş rollerine uygun olacak. Bu belge V4 çekirdek ve Akım
sayılarını aşar. Ana oyun hâlâ 3 sınıf ve 24 modüldür.

## Doğrudan savaş rolleri

Aşağıdakiler yeteneksiz seviye 1 değerleridir. Sabit hasarlar çekirdek seviyesinde
%4 bileşik gelişir; zırh/kalkan sonrası gerçek CAN kaybı ayrıca hesaplanır.
İlk güç dolumu 20 sn, sonraki dolum 35 sn; Hızlı Dolum ile 18 / 31,5 sn.
Hedefi çekirdek seçer. Modüllerin eski hedef öncelikleri ve rastgele boş hücre
yerleşimi değiştirilmedi.

| Çekirdek gücü | Gerçek oyun etkisi | Sınır / karşılık |
|---|---|---|
| Rezonans Dalgası | Öncelik sırasındaki en fazla 3 hedefe 90 / 45 / 45 hasar | Her hedefin kendi savunması işler |
| Savaş Kalesi | Çekirdek 6 sn boyunca saniyede bir 20 hasarla ateş eder; kendi aldığı hasarı %60 azaltır | Koruma yalnız kendi çekirdeğinde; süre bitince kalkar |
| Alev Fırtınası | Çekirdek 6 sn boyunca yarım saniyede bir 18 hasarla ateş eder | 12 gerçek sunucu atışı; yanında silah gerekmez; ölünce durur |
| İmha İşareti | Akım bedeli en yüksek rakip modülü işaretler; 1,5 sn sonra yok eder | Arındırıcı işareti silebilir, açık Faz engeller, kaynak çekirdek ölürse iptal; rakip çekirdeğe uygulanmaz |
| Takviye Çağrısı | Kendi 6 kartlık destesinden rastgele bir kartı bedelsiz yerleştirir | Kartın kendi seviye/yetenekleri kullanılır; dolu/enkazlı tahtada dolum harcanmaz |
| Anka Alevi | 150 hasar verir; gerçek CAN hasarı kadar kendi çekirdeğini onarır | Kalkan/overkill onarım üretmez; azami CAN aşılmaz; yansımayla ölen çekirdek geri gelmez |
| Kuantum Yarığı | CAN'ı en yüksek rakip modülün mevcut CAN'ının %50'sini götürür | Zırh ve CAN kalkanını aşar; açık Faz engeller; rakip çekirdek hedeflenmez |

Takviye başarısız isteği farklı kart denemek için kullanılamaz. Kart seçiminin
tohumu maç/oyuncu/başarılı kullanım sayısıdır. Bedelsiz yerleşim de normal rastgele
hücre seçicisini ve enkaz kontrolünü kullanır. Durdurulan kanal atışları birikerek
hızlı telafi atışlarına dönüşmez.

## Yetenekler ve geçmiş satın alımlar

7 çekirdek × 3 eşik × 2 dal = **42 seçenek**. Her eşikte bir dal seçilir.
Eski `0_energy` / `0_charge` biçimindeki kayıt kimlikleri korunur; görünen isimler
ve etkiler yeni rollerdir. Bu kimlikler Enerji mekaniği getirmez.

- Seviye 5: doğrudan güç +%8 veya çekirdek CAN +%5. İmha'da güç dalı işaret
  beklemesini %8 kısaltır; Takviye'de çağrılan CAN'ı %8 artırır; Kuantum'da
  götürülen mevcut CAN oranını %8 artırır (%50 → %54).
- Seviye 9: aşağıdaki role özel tercihler.
- Seviye 13: ilk/sonraki güç dolumu −%10 veya çekirdek CAN +%12.

| Güç | Birinci uzmanlık | İkinci uzmanlık |
|---|---|---|
| Rezonans | Tüm dalga hasarı +%15 | Ek hedef oranı %50 → %70 |
| Kale | Kendi hasar azaltımı %60 → %70 | Kendi topunun hasarı +%25 |
| Alev | Atış hasarı +%15 | Etkin süre 6 → 7 sn; 14 atış |
| İmha | İşaret beklemesi −%25 | Başarılı imha +1 Akım; depo sınırı geçerli |
| Takviye | Bedeli en az 3 olan deste kartlarını seçer; yoksa tüm deste | Çağrılan modülün azami CAN'ı +%20 |
| Anka | Kendi hasarı +%15 | Gerçek hasarın %135'i kadar kendi CAN onarımı |
| Kuantum | Götürülen mevcut CAN oranına +10 yüzde puan | En yüksek CAN yerine en yüksek Akım bedelini hedefler |

Eski fiyatlar, her hücre **Devre Kredisi / Akı**:

| Enderlik | Seviye 5 | Seviye 9 | Seviye 13 |
|---|---:|---:|---:|
| Yaygın | 2.000 / 0 | 5.000 / 0 | 10.000 / 1.000 |
| Nadir | 4.000 / 0 | 10.000 / 0 | 20.000 / 2.000 |
| Destansı | 10.000 / 0 | 20.000 / 2.000 | 30.000 / 3.000 |
| Efsanevi | 20.000 / 2.000 | 30.000 / 3.000 | 40.000 / 4.000 |

Fiyatlar mevcut 25 Ekim maliyet kaynağından alınır; testler bağımsız eski dosyayla
karşılaştırır. İki cüzdan atomik kontrol edilir, tekrar istek yeniden ödeme almaz.
Arşivdeki geçerli ücretli seçimler tek sefer ücretsiz geri yüklenir, güncel dal
tercihi korunur, eski makbuzlar değiştirilmez. Gerçek oyuncu verisi üzerinde
migrasyon çalıştırılmadı; kayıt/yükleme senaryosu izole verilerle test edildi.
Koleksiyon açıklaması, CAN ve dolum değerleri savaşla aynı etkin ayardan üretilir.
AI aynı çekirdek seviyesini ve oyuncunun satın aldığı eşikleri kullanır; yeni
çekirdek rolüne göre dal seçer. Seviye tek başına ek ücretli eşik kazandırmaz.

## Akım kararı ve karşılaştırma

**Başlangıç 6 / depo 12 / her 2,5 sn +1 Akım.** Rakibin 200 yeni CAN kaybında
ek +1; bu bonus en erken 6 sn'de bir gelir. Ek ilerleme en fazla tek bonus kadar
saklanır. Depo doluyken ek bank kurulmaz. Silah ve doğrudan çekirdek hasarı
sayılır; kalkan, fazla öldürme, yansıma, dost hasarı ve onarılan CAN'ın yeniden
vurulması sayılmaz. Seviye normalizasyonu kaldırıldı: görünen 200 CAN her seviyede
200 CAN'dır. Pasif dolum saldırısı kalmayan oyuncuda da sürer.

96 savaşlık karşılaştırmada her ekonomiye 16 karma deste savaşı ve 8 tek-silah
savunma politikası savaşı verildi. Seviye 1/15, aynı deste/tohumlar ve seviye 15'te
çekirdek yetenekleri kullanıldı. Ortanca süre ve bonus payı yalnız karma 16 savaşa
aittir. Kamp politikası 30 sn savunma biriktirir, sonra bir aktif saldırı bulundurur.

| Ekonomi | Biten / toplam | Ortanca süre | Ortanca hasar bonusu payı | Kamp galibiyeti |
|---|---:|---:|---:|---:|
| Eski 2,2 sn / normalize 100 CAN / 6 sn bonus sınırı | 24 / 24 | 95,1 sn | %22,2 | 0 / 8 |
| 2,5 sn / normalize 200 CAN / 6 sn sınır | 24 / 24 | 85,9 sn | %18,9 | 0 / 8 |
| **2,5 sn / görünen 200 CAN / 6 sn sınır** | **24 / 24** | **86,3 sn** | **%21,2** | **0 / 8** |
| 2,5 sn / görünen 200 CAN / 2,5 sn sınır | 24 / 24 | 82,8 sn | %28,5 | 0 / 8 |

200 CAN sayacı daha açıklanabilir; 6 sn bonus aralığı saldırı gelirinin aşırı
hızlanmasını sınırlıyor. Daha yavaş pasif dolumun savaşları mutlaka uzatmadığı
görüldü: daha az savunma yerleşimi ve yeni doğrudan çekirdek güçleri sonucu etkiliyor.
Depo bu aşamada 12 kaldı. Enerji/Isı, sınıf/kopya kotası ve zamanla artan hasar yok.

## Doğrulama ve sınırlar

- **352 odaklı sunucu testi**, **754 istemci testi**, **10 paket testi** geçti.
  Tüm tarihsel sunucu testlerinin geçtiği iddiası yok.
- Gerçek tarayıcı: 320 ve 393 pikselde ilk maç, 4 engellemeyen ipucu, gerçek
  Rezonans hasarı, Akım 200 sayacı, sonuç katkı metni ve efekt temizliği.
  Yetenek fiyat/yerleşim akışı ve mevcut modül sıfırlama akışı ayrıca test edildi.
- Çekirdek açık/kapalı **56 savaş: 56 bitiş**. 28 karşılaştırmanın 8'inde kazanan
  değişti. Aktif tarafta toplam 9 başarılı imha, 14 ücretsiz takviye; tüm doğrudan
  hasar veren çekirdeklerde gerçek CAN katkısı kaydedildi.
- Çekirdeklerin her iki dalını ve tam modül yeteneklerini kullanan **42 savaş:
  42 bitiş**, 67,7–274,3 sn; ortanca 96,5 sn.
- 24 modülün yükseltilmiş yetenekleriyle **84 savaş: 84 bitiş**, 61,3–277,6 sn.
  İlk modül kaybı ortancası dal grubuna göre 16,55–20,55 sn.
- Araçların 900 sn gözlem sınırı tanı amaçlıdır; oyun süre sınırı değildir.
  240 sn'de bitirme veya 3. dakikadan sonra hasar artırma/onarım azaltma yoktur.

AI sonuçları insan metasını veya her savunma destesinin kazanamayacağını kanıtlamaz.
Sıradaki denge kanıtı gerçek oyuncuların çekirdek zamanlaması ve karşı hamleleri
anlayarak oynadığı maçlardır. Telefon kurulumu/yayın yapılmadı.

Kod: `core_actions_v5.py`, `core_talents_v5.py`, `pressure_current.py`.
Kanıt: `artifacts/core-roles-v5/`, `artifacts/core-roles-v5-module-talents/`.
Araçlar: `probe_current_v5.py`, `probe_core_roles_v5.py`,
`probe_core_talents_v5.py`, `check_core_roles_v5.cjs`.
