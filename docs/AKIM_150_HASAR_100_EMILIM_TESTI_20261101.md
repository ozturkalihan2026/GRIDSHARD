# 150 verilen hasar + 100 emilen hasar → +1 Akım deneyi

1 Kasım 2026. **Yalnız opt-in motor/simülasyon adayıdır. Ana oyunun varsayılan
Akım ekonomisi, telefon APK’sı, çalışan telefon sunucusu ve oyuncu verileri
değiştirilmedi.**

## Denenen kural

- Başlangıç 6 / depo 12 korunur. Pasif üretim **0**, bekleme süresi **0**.
- Saldırı modüllerinden **150 yeni gerçek düşman CAN kaybı** VE Savunma
  modüllerinden **100 etkili emilim/engelleme** birlikte +1 Akım verir.
- Her ödemede 150 ve 100 tüketilir; artan miktar sonraki ödemeye taşınır.
  İki eşik birden birkaç kez dolarsa aynı anda birkaç Akım kazanılır.
  Depo 12’ye geldiğinde iki sayaç silinir; gizli depo oluşturulmaz.
- Zırh, Kalkan, Faz, Kubbe ve gerçek CAN kalkanı etkileri sayılır; bir vuruşun
  her koruma aşamasında gerçekte önlenen CAN kaybı hesaplanır. Aynı hasar iki
  kez sayılmaz. Ölümcül fazla hasar azaltılıp hedef yine ölüyorsa o azaltım
  gelir değildir. Kalkansız saldırı/normal CAN kaybı emilim değildir.
- Kalkan üretmek, süresi dolan kalkan, Kırıcı’nın kalkan silmesi, dost hasarı,
  yansıma, overkill ve iyileştirilmiş aynı CAN’ı tekrar vurmak saldırı geliri
  değildir. Saldırı kartlarının gerçek iz/fünye/yankı CAN kaybı sayılır.
- Çekirdek saldırısı 150’lik koşulu; çekirdeğin kendi koruması 100’lük koşulu
  doldurmaz. Savunma modülünün çekirdeği koruması ve düşman çekirdek saldırısını
  engellemesi sayılır. Eski İmha Kazancı yeteneğinin ayrı +1 Akımı da bu adayda
  kapalıdır: başka kazanç kapısı yoktur. Ana oyundaki yetenek değişmemiştir.
- Rastgele yerleşim, hedef önceliği, kart maliyetleri, CAN/hasar değerleri,
  yetenek fiyatları ve kopya/sınıf kotasızlığı aynıdır.

## Karşılaştırma

Her seri 648 gerçek motor savaşıdır: 3 strateji çifti × 3 deste × 6 aynı
çekirdek × SV1/8/15 × 2 taraf × 2 tohum. Eski/yeni ekonomi eşleri aynı
desteye, çekirdeğe, seviyeye, tohuma ve tarafa sahiptir; eşitlik betikte
doğrulanır. İlk seri önceki adaptif botu aynen korur. İkinci seride bot en ucuz
Saldırı ve Savunmayla başlangıç yapmaya çalışır; diğer politikalar da
alınabilir kart varken pasif dolum beklemez. **Bu bütçe politikası hem mevcut
ekonomiye hem adaya aynı uygulanır.** Bunlar insan kazanma oranları değildir.

Normal gözlem 900 saniyedir; süre bitince maçta mağlubiyet/beraberlik veya
zorunlu bitiş üretilmez. “Sürüyor” sütunu bu maçları gösterir. Bitmeyen maçlar
kazanılmış/kaybedilmiş sayılmaz. Ana tabloda modül/çekirdek yeteneği seçili
değildir. Takviye çekirdeği kart çağırarak “yalnız Savunma” koşulunu
bozabildiğinden ayrı 18 maçta incelenmiştir.

### Önceki adaptif bot

| Ölçüm | Mevcut 2,5 sn / 200 hasar | Yalnız 150 + 100 |
|---|---:|---:|
| Biten maç | 648 | 482 |
| 900 sn’de hâlâ süren maç | 0 | 166 |
| Biten maçların ortancası (sn) | 95.35 | 90.1 |

| Eşleşme | Mevcut: karma galibiyet | Aday: karma galibiyet | Aday: rakip galibiyet | Aday: sürüyor |
|---|---:|---:|---:|---:|
| Karma–Saldırı | 202/216 | 114/216 | 38/216 | 64/216 |
| Karma–Savunma | 216/216 | 170/216 | 0/216 | 46/216 |

| Strateji | Adayda hiç ek Akım kazanmayan | Ortalama ek Akım | Ortanca yerleştirme |
|---|---:|---:|---:|
| Saldırı | 432/432 | 0 | 1.0 |
| Savunma | 432/432 | 0 | 1.0 |
| Karma | 357/432 | 0.243 | 1.0 |

### Başlangıç bütçesini gözeten bot

| Ölçüm | Mevcut 2,5 sn / 200 hasar | Yalnız 150 + 100 |
|---|---:|---:|
| Biten maç | 516 | 489 |
| 900 sn’de hâlâ süren maç | 132 | 159 |
| Biten maçların ortancası (sn) | 96.55 | 92.6 |

| Eşleşme | Mevcut: karma galibiyet | Aday: karma galibiyet | Aday: rakip galibiyet | Aday: sürüyor |
|---|---:|---:|---:|---:|
| Karma–Saldırı | 72/216 | 139/216 | 12/216 | 65/216 |
| Karma–Savunma | 84/216 | 166/216 | 6/216 | 44/216 |

| Strateji | Adayda hiç ek Akım kazanmayan | Ortalama ek Akım | Ortanca yerleştirme |
|---|---:|---:|---:|
| Saldırı | 432/432 | 0 | 1.0 |
| Savunma | 432/432 | 0 | 1.5 |
| Karma | 255/432 | 0.535 | 2.0 |

## Kilitlenme incelemesi

Bütçe botuyla 900 saniyede sürmekte olan maçlardan çekirdek/seviye ve farklı
eşleşmelerle seçilen **14 maç 3600 saniyeye kadar yeniden gözlendi**.
**14/14 hâlâ bitmedi.** Bu seçilmiş sorun
örneklemidir; bütün maçların bir saat süreceği anlamına gelmez. Motorun 240
veya 900 saniyelik savaş bitirme kuralı yoktur.

Örnek: SV1 İmha–İmha Saldırı/Karma maçında iki tarafta yalnız çekirdek kalır.
Saldırı tarafı 378 yeni CAN hasarı vermiş, 0 engellemiş ve 0 Akım kazanmıştır.
Karma 264 hasar/132 engellemeyle 1 Akım kazanır; bakiye 1 olduğu için yeni
silah alamaz. İki çekirdek yalnız normal modülleri infaz edebildiğinden artık
birbirini bitiremez; pasif gelir de olmadığı için döngüden çıkış yoktur.
Gerçek bitiş durumları `extended-battles.json` içinde kaydedilir.

Diğer bir başlangıç sorunu: Ark/Plazma/Kubbe/Tampon/Arındırıcı/Hız destesinin
en ucuz Saldırısı 4, Savunması 3 Akımdır. Başlangıç 6 ile ikisi birlikte
alınamaz. İyi karar veren bot bile bu çift için eksik 1 Akımı üretemez.

3 Akımlık yeni bir kartı finanse etmek için **450 yeni CAN hasarı VE 300
etkili engelleme** gerekir. İlk silah/savunma bu eşiklerden önce ölürse
oyuncu gerekli sınıfı yeniden alamaz. Taktik kartlarının ekonomik teşvikle
zincire katılacağı varsayılamaz; önce bütçenin ayakta kalması gerekir.

Takviye için ayrı 18 maçın 18'i
bitti; desteden bedelsiz modül getirmesi, bu özel çekirdeği diğerlerinden
farklı bir ekonomi çıkışına dönüştürür. Bu sonuç ana üç strateji oranlarına
eklenmemiştir.

İkinci bot bir AI iyileştirmesi veya ana oyun AI değişikliği değildir; yalnız
ucuz başlangıcın sonucu değiştirip değiştirmediğini sınar. Bu politikanın
mevcut ekonomide de 132 uzayan maçı vardır; dolayısıyla bu ikinci serideki
bütün uzamayı yeni ekonomiye bağlamak doğru değildir. Önceki adaptif botta
aynı mevcut ekonomi 648/648 maçı bitirmiştir. İki bot politikası arasındaki
fark, insan davranışına ait tek bir kazanma oranı çıkarılamayacağını da gösterir.

## Karar ve uygulama sınırı

**150+100 birleşimi karma oyunu ödüllendirir; tek gelir kaynağı olarak bu
eşikler ve 6 başlangıç Akımıyla ana sürüme alınması önerilmez.** Sorun yalnız
6 saniye bekleme değildir; o zaten tamamen kaldırılmıştır. Eşik karşılanmadan
ilk kurulum bittiğinde oyuncunun yeniden savaş kurma imkânı kaybolur.

Bu tur kullanıcı isteğindeki aday aynen test edilmiştir; sorunu gizlemek için
pasif gelir, sınıf kotası, ücretsiz kurtarma kartı, süreyle artan hasar veya
zorunlu maç bitirme eklenmemiştir. Sonraki adayda başlangıç/yeniden kurulum
çıkışı tasarlanmadan sadece 150/100 sayılarını değiştirmek yeterli kabul
edilmemelidir. Üretim varsayılanı 6/12, 2,5 sn +1 ve 200 yeni CAN +1 / en az
6 sn ek kazanç olarak korunmuştur. Telefon güncellenmemiştir.

## Kanıt ve tekrar üretme

- `tools/probe_strategy_v7.py`: `--all-cores --seeds 2 --seed-base 523 --mixed-third buffer`.
  Adaya `--regen 0 --threshold 150 --joint-absorption 100` eklenir.
  İkinci seride her iki tarafa `--economy-aware` eklenir.
- `tools/probe_joint_current_v7.py`: 3600 sn örnekleri, ayrı Takviye ve ilk çift maliyetleri.
- `tools/report_joint_current_v7.py`: eşleşme eşitliği denetimi, bu belge ve
  `artifacts/joint-current-diagnostics/paired-results.json` üretimi.
- Ham tablolar: `artifacts/joint-current-*` ve `artifacts/joint-budgeted-*`.
- **300 odaklı sunucu testi PASS**: 15 aday kural kontrolü ve 285 mevcut
  modül/çekirdek/yetenek/AI/öğretici/Akım kontrolü. Tam tarihsel sunucu kümesi,
  istemci sunumu veya telefon doğrulaması iddiası yoktur.
