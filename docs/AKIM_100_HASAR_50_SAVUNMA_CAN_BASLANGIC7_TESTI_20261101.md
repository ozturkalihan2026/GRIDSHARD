# Akım: 100 verilen hasar + Savunma modüllerinin 50 CAN kaybı

1 Kasım 2026. **Opt-in simülasyon adayıdır; ana ekonomi, telefon APK’sı,
çalışan telefon sunucusu ve gerçek oyuncu verileri değiştirilmedi.**

## Kesin kural

- Başlangıç **7**, depo **12**, pasif **3000 ms’de +1**.
- Saldırı sınıfındaki modüllerin verdiği **100 yeni gerçek düşman CAN kaybı**
  VE Savunma sınıfındaki kendi modüllerimizin aldığı **50 yeni gerçek CAN
  kaybı**, birlikte **ek +1 Akım** verir. Bonus beklemesi **0**.
- **Alınan CAN ile emilen hasar farklıdır.** Zırh/Kalkan/Faz/Kubbe önlediği
  miktarla 50 koşulunu doldurmaz; koruma sonrası Savunma kartının gerçekten
  kaybettiği CAN sayılır. Savunma kartının başka bir Saldırı kartına verdiği
  kalkan, o Saldırı kartının CAN kaybını Savunmaya ait yapmaz.
- Saldırı/Taktik kartlarının ve çekirdeğin kendi CAN kaybı 50’ye dahil değildir.
  Düşman Saldırı kartı veya çekirdeğinden Savunmaya gelen gerçek hasar sayılır.
- Önceki adaylarda olduğu gibi, çekirdeğin verdiği hasar 100’lük Saldırı
  koşulunu doldurmaz. Yansıma, dost hasarı, overkill, kalkan üretimi/silinmesi
  ve onarılarak tekrar kaybedilen aynı CAN gelir doğurmaz. Uygulanmış gerçek
  düşman silah izi/fünye/yankı etkileri kaynaklarıyla sayılır.
- İki eşik birlikte tüketilir, artan miktar taşınır; bir anda birkaç çift
  tamamlanırsa birkaç Akım verilebilir. Pasif veya bonusla 12’ye ulaşınca
  iki sayaç da temizlenir; depo dışında gizli bankalama yoktur.
- Ayrı İmha Kazancı +1’i adayda kapalıdır. Asıl çekirdek/yetenek tanımı,
  24 kart, CAN/hasar/maliyet, rastgele yerleşim, hedef önceliği ve kopya/sınıf
  kotasızlığı korunur. Yeni kural sadece config ile açılır; UI’ye yüklenmedi.

## Eşleştirilmiş ana deney

Her ekonomi **648 maç**: 3 strateji çifti × 3 deste × 6 aynı çekirdek ×
SV1/8/15 × 2 taraf × 2 tohum (523/624 + deste indeksi). Önceki aynı adaptif
bot politikası korunur. Önceki üç ekonomi için kaydedilmiş doğrulanmış maçlar
yeniden kullanılır; yeni adayın her maçında deste/çekirdek/seviye/tohum/taraf
eşitliği rapor betiğinde doğrulanır.

Ana deneyde modül/çekirdek yetenekleri seçili değildir. Takviye, normal kart
oynamadan Saldırı çağırıp “yalnız Savunma” koşulunu bozabildiği için ana
matrise dahil değildir. Yalnız Savunma destesi yasal zorunlu Saldırı kartını
taşır fakat oynamaz. Çekirdek gücü bütün politikalarda aynı bot kuralıyla
kullanılır. Bunlar seçili bot/deste sonuçlarıdır; insan kazanma oranı veya
bütün kombinasyonlar için onay değildir.

Normal gözlem **900 saniye**. Süre dolunca zorunlu bitiş/galip/mağlup
üretilmez; sürmekte olan maçlar kazanç/kayıp sayılmaz. Süre ortancaları
yalnız biten maçlar içindir.

| Ölçüm | Mevcut 6 / 2,5 sn / 200 | 7 / 3 sn, bonus yok | 7 / 3 sn, herhangi kartta 50 CAN | 7 / 3 sn, yalnız Savunmada 50 CAN |
|---|---:|---:|---:|---:|
| Biten maç | 648 | 648 | 581 | 648 |
| 900 sn’de sürer | 0 | 0 | 67 | 0 |
| Bitenlerde ortanca süre (sn) | 95.35 | 109.3 | 81.6 | 88.3 |

| Karma stratejinin rakibi | Mevcut: karma galibiyet | Bonus yok: karma galibiyet | Herhangi CAN: karma galibiyet | Yalnız Savunma CAN: karma galibiyet |
|---|---:|---:|---:|---:|
| Yalnız Saldırı | 202/216 | 170/216 | 28/216 | 216/216 |
| Yalnız Savunma | 216/216 | 216/216 | 216/216 | 216/216 |

### Yeni adayın stratejileri

| Politika | Katılım | Kazanır | Kaybeder | Sürer | Bonus / oyun dakikası | Hiç bonus almayan |
|---|---:|---:|---:|---:|---:|---:|
| Saldırı | 432 | 216 | 216 | 0 | 0.0 | 432 |
| Savunma | 432 | 0 | 432 | 0 | 0.0 | 432 |
| Karma | 432 | 432 | 0 | 0 | 9.65 | 24 |

Bonus/dakika toplam savaş bonusu / toplam oyuncu süresidir; başlangıç ve pasif hariçtir. Katılımlar iki rakip sınıfına eşit dağılır; eşleşme tablosu genel kazanma yüzdesinden daha açıklayıcıdır.

## Ek kontroller

### Aynı altı kart havuzu

Yeni tohum 847, aynı kart havuzu her iki tarafta, altı çekirdek/üç seviye/iki taraf: 324 maç. Alınan kartların gücü farklılığını azaltıp oynama politikasını karşılaştırır. Aynı eşler 7 başlangıç/3 sn pasif, bonus kapalı olarak da çalıştırılır.

| Eşleşme | Bonus yok: karma kazanır | Bonus yok: sürer | Yeni aday: karma kazanır | Yeni aday: sürer |
|---|---:|---:|---:|---:|
| Karma–Saldırı | 60/108 | 0/108 | 108/108 | 0/108 |
| Karma–Savunma | 76/108 | 32/108 | 74/108 | 34/108 |

Adayda süren 34 maçın tamamı Kuantum/Dron/Zırh/Tampon/Onarım/Virüs havuzundadır. Savunma politikası Tampon ve Zırhı tekrarlar; karma devre bu havuzda Kırıcı veya alan hasarı seçemez. Bonus kapalı aynı-havuz kontrolünde de 32/324 maç sürmektedir; bu nedenle bütün 34 uzamayı yeni bonusa bağlamak doğru değildir. Bu, bütün karma destelerin her savunma yığılmasını çözebildiği anlamına gelmediğini gösterir. Sonuç zorunlu bitiş veya gizli hasar artışıyla düzeltilmemiştir.

### Tek canlı silah + savunma yığma

- 7/3 sn, bonus yok: karma 54/54 kazanır, 0 kaybeder, 0 maç sürer.
- Yeni aday: karma 54/54 kazanır, 0 kaybeder, 0 maç sürer.

Aynı üç kamp destesi × üç çekirdek × SV1/8/15 × iki taraf =54 eş. Kart sayısına veya silah adedine yeni oyuncu kotası getirilmez; tek silah sınırı yalnız bu bot politikasıdır.

### Modül yetenekleri

- Güç dalı, SV15/üç çekirdek: 54/54 biter; karma Saldırıya 18/18, Savunmaya 18/18 kazanır.
- Dayanıklılık dalı, SV15/üç çekirdek: 54/54 biter; karma Saldırıya 18/18, Savunmaya 18/18 kazanır.

Bunlar tüm modüllerde aynı dalın seçildiği iki stres örneğidir; tüm karışık yetenek ağacı kombinasyonlarının simülasyonu değildir. Çekirdek yeteneği seçilmemiştir.

### Onarım/güçlendirme içermeyen alternatif karma

- Bonus kapalı: karma 0/18 kazanır, 18 kaybeder, 0 maç sürer.
- Yeni aday: karma 18/18 kazanır, 0 kaybeder, 0 maç sürer.

Bu deste Kuantum/Kırıcı/Faz/Son Siper/EMP/Virüs içerir; üç çekirdek, üç
seviye, iki taraf =18 eş. “Kötü deste” olduğu matematiksel bir gerçek değildir;
yalnız bonus olmayan kontrolde zayıf kalan başka bir bileşimdir. Sonuç,
bonusta sınıf bileşiminin büyük ekonomik etkisini gösterir; küçük karar ve
karşı-kart farklarını bastırıp bastırmadığı insan testinde de incelenmelidir.

## Karar

**Bu aday, denenen iki uç stratejiye karşı karma devreyi destekleme hedefini
ana örneklemde sağlıyor.** Başlangıç 7 ve 3 sn pasif, yeniden kurulum çıkışını
korur; yalnız silah kurmak 50 Savunma CAN koşulunu, yalnız savunma kurmak
100 Saldırı CAN koşulunu dolduramaz. Taktik sınıfı için yapay gelir koşulu yoktur.

**Buna bütün oyunun nihai dengesi denmez.** Ana örneklemde 100% karma
başarısı güçlü bir sınıf avantajına işaret eder; aynı havuzdaki Tampon yığılması
34 maçı sonuçsuz bırakır ve alternatif karma da bonusla çok güçlenir.
Savunma yığılmasına karşı kart erişimi ve bonusun avantaj büyüklüğü sonraki
denge kararında ayrıca değerlendirilmelidir. Modül/AI/yerleşim kuralı sonucu
istenen yöne taşımak için değiştirilmemiştir. Yeni sayılar ana oyuna otomatik
yazılmamış, APK üretilmemiş/yüklenmemiştir.

325 odaklı sunucu testi PASS: 11 Savunma-CAN adayı kontrolü + önceki 314
kontrol. Tam tarihsel sunucu/istemci/telefon onayı iddiası yoktur.

## Kanıt ve tekrar üretme

- `tools/probe_strategy_v7.py --all-cores --seeds 2 --seed-base 523 --mixed-third buffer --starting 7 --regen 3000 --threshold 100 --joint-received 50 --received-defense-only --deck-index 0/1/2 --output NAME`.
- Aynı havuz: `--shared-deck --seeds 1 --seed-base 847`; bonus olmayan kontrol `--threshold 0` ve joint bayrakları olmadan.
- `tools/probe_defense_received_camp_v7.py`: 54 eş kamp/karma, iki ekonomi.
- Modül yetenekleri: `--talent power/resilience --seed-base 1189`, üç çekirdek.
- `tools/report_defense_received_current_v7.py`: eşleşme doğrulaması, bu belge,
  `artifacts/defense-received-final/battles.json` ve `summary.json`.
- Kaynaklar `artifacts/defense-received-*`; test kaydı
  `artifacts/module-v7-rollout/defense-received-regression-tests.log`.
