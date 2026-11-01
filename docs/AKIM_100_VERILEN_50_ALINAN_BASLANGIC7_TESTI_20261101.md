# Akım: 100 verilen + 50 alınan CAN, 3 sn pasif, başlangıç 7

1 Kasım 2026. **Yalnız motor/simülasyon adayı. Ana oyun varsayılanı,
telefon APK’sı, çalışan telefon sunucusu ve oyuncu verileri değişmedi.**

## Test edilen tanım

- Başlangıç **7**, depo **12**, pasif **3000 ms’de +1**.
- Saldırı modüllerinin verdiği **100 yeni düşman CAN kaybı** VE kendi devrenin
  aldığı **50 yeni CAN kaybı** birlikte **ek +1 Akım**. Bekleme süresi **0**.
  Eşikler birlikte tüketilir; fazlalık taşınır, aynı anda çoklu ödeme olabilir.
- “Alınan” bu tur **gerçek CAN kaybıdır**, önceki adayın “emilen/engellenen”
  hasarı değildir. Zırh/Kalkan/Faz/Kubbe engellediği kısımla 50 sayacını
  doldurmaz. Savunma kartı bulundurmak koşul değildir; saldırı kartı veya
  çekirdek CAN kaybettiğinde de alınan hasar sayılır.
- Her iki yönde onarılan aynı CAN’ı tekrar kaybetmek kazanımı çoğaltmaz.
  Overkill, dost hasarı, kalkan oluşturma/silme ve yansıma kazanç değildir.
  Uygulanmış Plazma izi/Füze yükü gibi gerçek düşman silah hasarları sayılır.
- Önceki birleşik adayla aynı kaynak sınırı korunur: çekirdek saldırısı
  100’lük giden hasar koşulunu doldurmaz; düşman çekirdeğinin size verdiği
  gerçek CAN hasarı 50’lik alınan hasara dahildir. Ayrı İmha Kazancı +1’i
  bu adayda kapalıdır. Ana oyunun çekirdek/yetenek tanımı değişmemiştir.
- Depo 12’ye ister bonus ister pasif dolumla ulaşılsın, birleşik bonus
  sayaçları silinir. Depo dışında gizli Akım biriktirilmez.
- Aynı 24 kart, CAN/hasar/maliyet, 3 sınıf, yetenek fiyatları, hedef önceliği
  ve rastgele yerleşim kullanılır. Sınıf/kopya kotası veya karma deste buff’ı yoktur.

## Deney düzeni

Üç serinin **her birinde 648 maç**: 3 strateji çifti × 3 deste × 6 çekirdek ×
3 seviye (1/8/15) × 2 taraf × 2 tohum. Aynı adaptif yerleştirme politikası
her üç ekonomide kullanılır; eşleşmiş desteler/çekirdek/seviye/tohum/taraf
rapor betiğinde birebir doğrulanır. Normal modül ve çekirdek yetenek seçimi
yoktur. Takviye çekirdeği kendi modül çağırmasıyla “yalnız Savunma” koşulunu
bozabildiğinden bu matrise dahil değildir. Sonuçlar bu bot/deste örneklemine
aittir; insan kazanma oranı veya tüm desteler için denge onayı değildir.

Üç ekonomi:

1. Mevcut varsayılan: başlangıç 6 / 2,5 sn pasif / 200 yeni CAN +1 / bonus en az 6 sn.
2. Pasif kontrol: başlangıç 7 / 3 sn pasif / **savaş bonusu yok**.
3. Kullanıcı adayı: başlangıç 7 / 3 sn pasif / **100 verilen + 50 alınan** ek +1 / bekleme yok.

Gözlem 900 saniyede durur; motorda süreyle otomatik galip/mağlup veya zorunlu
bitiş yoktur. Süren maçlar tabloda galibiyet ya da mağlubiyet sayılmaz.
Uzayan savaşların yalnız biten altkümesindeki süre ortancası genel maç
süresiymiş gibi okunmamalıdır. Aday üç bağımsız deste grubunda çalıştırılıp
tek 648’lik diziye birleştirilmiştir; mükerrer maçlar sonuçlara eklenmez.

## Sonuçlar

| Ölçüm | Mevcut | 7 başlangıç / 3 sn, bonus yok | 7 başlangıç / 3 sn, 100+50 |
|---|---:|---:|---:|
| Biten maç | 648 | 648 | 581 |
| 900 sn’de süren maç | 0 | 0 | 67 |
| Bitenlerde ortanca süre (sn) | 95.35 | 109.3 | 81.6 |

| Eşleşme | Mevcut: karma kazanır | Pasif kontrol: karma kazanır | Aday: karma kazanır | Aday: rakip kazanır | Aday: sürer |
|---|---:|---:|---:|---:|---:|
| Karma–Saldırı | 202/216 | 170/216 | 28/216 | 121/216 | 67/216 |
| Karma–Savunma | 216/216 | 216/216 | 216/216 | 0/216 | 0/216 |

### Adaydaki strateji başına gelir ve yerleştirme

| Strateji | Katılım | Kazanır | Kaybeder | Sürer | Savaş bonusu / oyun dakikası | Ortanca yerleştirme |
|---|---:|---:|---:|---:|---:|---:|
| Saldırı | 432 | 337 | 28 | 67 | 54.83 | 13.0 |
| Savunma | 432 | 0 | 432 | 0 | 0.0 | 10.0 |
| Karma | 432 | 244 | 121 | 67 | 34.31 | 14.0 |

Bonus/dakika toplam savaş bonusunun toplam oyuncu oyun süresine bölünmesidir; pasif ve başlangıç hariçtir. Bir maç iki farklı strateji katılımı içerir.

### Seviyeye göre süren maç

| Seviye | Mevcut | Pasif kontrol | Aday |
|---|---:|---:|---:|
| 1 | 0/216 | 0/216 | 6/216 |
| 8 | 0/216 | 0/216 | 10/216 |
| 15 | 0/216 | 0/216 | 51/216 |

## Gelir akışı incelemesi

İlk süren örnek: core_resonance, SV1, seed 624, {'a': 'attack', 'b': 'mixed'}.

- attack: 900 sn’de 859 bonus Akım, 338 yerleştirme; son bakiye 9.
- mixed: 900 sn’de 557 bonus Akım, 267 yerleştirme; son bakiye 3.

Bu, önceki pasifsiz adayın 0 Akımla iki çekirdekte kalmasıyla aynı sorun değildir. Devreler savaşır, Akım kazanır ve silahlarını yeniler; gözlem içinde savaş sonuçlanmaz. 900 sn’de süren her maçın sonsuza kadar süreceği iddia edilmez.

## Değerlendirme ve uygulama sınırı

**Başlangıç 7**, testteki en ucuz 4+3 Saldırı/Savunma çiftini başlangıçta
alınabilir yapar. **3 sn pasif**, savaş hasarı olmadan da yeni kart için
bütçenin zamanla oluşmasını sağlar. Önceki pasifsiz adayın ekonomik çıkış
yokluğu böylece giderilir.

Ancak **gerçek CAN kaybını** ödüllendirmek Savunma sınıfını zorunlu kılmaz:
yalnız silah kuran oyuncu da vurup vurularak aynı bonusu kazanır. Koruma
hasarı önlediğinde 50’lik sayacın artışını da yavaşlatır. Bu nedenle yeni
bonus, karma devreyi ödüllendiren bir savunma koşulu olarak yorumlanmamalıdır.

100/50’nin 6 sn aralığı olmadan sürekli yeni kurulan modüllerden gelmesi,
yüksek tempoda yerleştirme/hasar/yeniden yerleştirme akışını büyütebilir.
Raporun mevcut ve pasif kontrol sütunları, bonusun etkisini başlangıç ve
pasif dolum değişikliğinden ayırmak içindir. Aday otomatik biçimde ana oyuna
alınmamıştır; bir sonraki ayar kararı bu ölçümler üzerinden verilmelidir.

Bu testte hedeflenen “doğru karma yalnız Saldırıdan üstün olsun” sonucu
sağlanmamıştır: 216 eşleşmede karma 28, yalnız Saldırı 121 galibiyet alır;
67 maç gözlem sonunda sürer. Aynı başlangıç/pasif dolumla bonus kapalıyken
karma 170/216 kazanmıştır ve bütün maçlar bitmiştir. Dolayısıyla başlangıç
7 ve pasif 3 sn ile **alınan CAN bonusunu** aynı karar gibi değerlendirmemek
gerekir. Sonraki aday önerisi: bu başlangıç/pasif değerlerini koruyup bonusun
ikinci koşulunu gerçek Savunma kaynaklı emilen/engellenen hasarla sınamak.
Bu sonraki kombinasyon henüz bu raporda test edilmiş veya onaylanmış değildir.

314 odaklı sunucu testi PASS (14 yeni alınan-hasar adayı, 15 önceki emilim
adayı ve 285 mevcut oyun kontrolü). Tam tarihsel sunucu kümesi/istemci
sunumu/telefon testi iddiası yoktur. Checkpoint ve bu rapor güncellenmiştir.

## Tekrar üretme

- `tools/probe_strategy_v7.py --all-cores --seeds 2 --seed-base 523 --mixed-third buffer --output NAME`.
- Pasif kontrol için `--starting 7 --regen 3000 --threshold 0`.
- Aday için `--starting 7 --regen 3000 --threshold 100 --joint-received 50`.
  İsteğe bağlı `--deck-index 0/1/2` grupları bağımsız çalıştırır.
- `tools/report_received_current_v7.py` eşitliği doğrular, ham aday maçlarını
  `artifacts/received-current-final/battles.json` içinde toplar ve raporu üretir.
- Kaynak seriler `artifacts/received-current-*`; test kaydı
  `artifacts/module-v7-rollout/received-current-regression-tests.log`.
