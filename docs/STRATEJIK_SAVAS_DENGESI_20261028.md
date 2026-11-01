# Strateji kurmaya zaman veren CAN ve Akım — 28 Ekim 2026

Durum: **yerel test adayı uygulandı, gerçek telefona yüklendi ve oynandı.**
Bu, bütün destelerin eşit kazanma oranına ulaştığı veya canlıya yayınlandığı
anlamına gelmez. Önceki `CAN_AKIM_ASAMALI_DEGERLENDIRME_20261028.md` belgesinin
"değerleri koru" kararı, kullanıcının strateji kurma süresi hedefiyle değişti.

## Uygulanan değerler

- 36 modülün tamamında taban CAN güncellendi: saldırılar ×2,2; savunmalar
  ×1,6; destek, enerji ve sabotaj ×1,8. Tam sayıya yuvarlandı; tablo aşağıda.
- Çekirdek tabanı 300 → **450**. Seviye başına ×1,08 korunuyor:
  1/8/15. seviyede **450 / 771 / 1.322 CAN**. Günlük bonus ve yetenekler
  maçta bu değeri ayrıca değiştirebilir.
- Ray Topu taban hasarı 44 → **38**, İyon Mızrağı 40 → **32**. Uzayan savaşta
  savunma delme/arka hedef özellikleri korunurken düz hasar üstünlüğü azaltıldı.
- Prizma Kalkanı, Anka Onarım ve Tekillik Projektörü **4 → 3 Akım**.
  Koruma ve destek kurmak, yeni bir silahı finanse etmekle daha az yarışıyor.
- Akım başlangıcı **6**, depo **12**, dolum **2.200 ms / +1**. Eski 2.500 ms'ye
  göre üretim hızı %13,6 artıyor. Üç Akım biriktirmek 7,5 yerine 6,6 saniye.
- Diğer hasarlar, çevrimler, bakım/aksiyon enerjisi, onarım miktarları,
  sabotaj süreleri ve genel ısı kuralları bu tur korunuyor. CAN artışı
  onarım miktarını otomatik olarak aynı oranda büyütmüyor.

Sunucu kanonu, istemci kanonu, çekirdek başlangıç/yedek değerleri ve Türkçe/
İngilizce Akım açıklaması eşlendi. İstemcinin kart sırası ve adları korundu.

## Süreyi nasıl değerlendirdik?

240 saniye bir oyun süresi sınırı değildi; denetim aracının gözlem sonuydu.
Önceki iki "240 saniyede bitmedi" örneği, genişletilmiş deneyde **246,9 ve
258,1 saniyede** bitti. Bu örnekleri yalnız uzun sürdükleri için başarısız
saymak doğru değildi.

Yeni gözlem penceresi **600 saniye**. Bu değer ürüne süre sınırı olarak
eklenmedi. Ayrı regresyon testi motoru 600 saniyeyi de geçiriyor; sağlıklı
çekirdekler yalnız zaman geçtiği için hasar almıyor veya maçı bitirmiyor.

Mevcut oyunda 180. saniyeden sonra her 30 saniyede saldırı çarpanını artıran,
onarımı azaltan bir uzatma kuralı zaten var. Bu tur değiştirilmedi. Uzun
maç sonuçları bu kuralı içeriyor; "sınırsız normal faz" deneyi olarak
yorumlanmamalı. Bağlı olduğu halde kart basmayan oyuncunun hareketsizlik
kuralı da ayrı bir konu; toplam maç süresi sınırı değildir.

## Sıralı deneyler ve kararlar

Kanıt kökü: `artifacts/strategy-window-20261028/`.

| Aşama | Koşum | Sonuç / sonraki adım |
|---|---:|---|
| 00 — eski değerler, uzun gözlem | 528 | 240 saniyelik kesintilerin gerçek kilitlenme olmadığını gösterdi |
| 01 — orta CAN artışı | 792 | Kurulum süresi arttı; silahların süreleri hâlâ kısa kaldı |
| 02 — daha dayanıklı düzen | 792 | 2,2 sn Akımla daha kalabalık, daha uzun savaş; tam matrise geçildi |
| 03 — 25 deste / 36 kart | 2.400 | Strateji alanı büyüdü; delici deste üstünlüğü belirlendi |
| 04 — ilk depo karşılaştırması | 672 | 14/16 depo genel bir gereklilik göstermedi |
| 05 — eşit cephe, sabit silah karşılaşmaları | 440 kontrollü | Çıplak silah ve korumalı silah sıralaması farklı; Kuantum tek başına zayıf değil |
| 06 — önce savunma/onarım kuran politika | 224 | Aynı CAN'da kurulum stratejisi modül ömrünü çok değiştiriyor |
| 07 — delici silah rolü taraması | 112 | 38/32 hasar adayı tam matrise alındı |
| 08 — hasar adayının tam matrisi | 2.400 | Delici üstünlüğü azaldı; efsanevi desteklerin maliyeti incelendi |
| 09 — genel aksiyon ısısı 0,9 → 0,5 | 480 | Soğutucu eşleşme farkını yeterince çözmedi; uygulanmadı |
| 10 — üç efsanevi desteğin 3 Akım olması | 112 | Özellikle yüksek seviyedeki tek silahlı efsanevi deste toparlandı |
| 11 — tercih edilen kart bonusu olmayan bot | 112 | Deste farkı yalnız dengeli botun kart tercihinden kaynaklanmıyor |
| 12 — son adayın tam matrisi | 2.400 | Aşağıdaki son ölçümler; gözlem sonunda yarım maç yok |
| 13 — son kaynaklarla depo tekrar kontrolü | 672 | Depo12 kararı korundu |

Toplam **11.696 maç koşumu + 440 kontrollü karşılaşma**. Adaylar, tekrar
tohumlar ve taraf değişimleri dahil; bunlar bağımsız insan oyuncu örnekleri
değil. Deneyler gateway/hesap depolarını açmadan motor süreçlerinde çalıştı.
Politika denemeleri ürünün AI kodunu değiştirmedi. Önceki 27 Ekim reddedilmiş
aday uygulanmadı; yalnız mevcut deney altyapısı tekrar kullanıldı.

## Son adayın 2.400 maçlık sonucu

25 deste, 36 kart, 1/8/15. seviye; taraf değişimi; 15. seviyede iki tohum.
İki tarafta aynı çekirdek tipi, modül seviyesine uygun varsayılan AI yetenek
dalları ve aktif çekirdek güçleri kullanıldı. Seçilebilir çekirdek yetenek
dallarının bütün kombinasyonları taranmadı. Her saniye bir bot kararı.

| Seviye | Maç | Medyan süre | %90 süre | En uzun | 600 sn'de yarım |
|---|---:|---:|---:|---:|---:|
| 1 | 600 | 146,35 sn | 246,3 sn | 346,8 sn | 0 |
| 8 | 600 | 147,15 sn | 243,8 sn | 315,9 sn | 0 |
| 15 | 1.200 | 113 sn | 176,9 sn | 281,5 sn | 0 |

Oyuncu başına zaman ortalamalı canlı modül sayısının medyanı sırasıyla
**5,97 / 6,26 / 5,56**. Dört canlı modüle ulaşan oyuncu sayısı
**1.197/1.200, 1.193/1.200 ve 2.317/2.400**.

Yıkılan bütün silahların ömür medyanı **10 / 8,5 / 7,5 saniye**. Bu sayılar
geç kurulan, yoğun ateş altındaki takviye silahlarını da içerir; ilk kurulan
korumalı silahların ömrüyle karıştırılmamalı. Maç sonunda hâlâ yaşayan
silahları da "yıkılmış" saymıyoruz. Kısa ömürlü karşı örnekler sürüyor;
"her silah artık en az bir dakika yaşar" gibi bir sonuç çıkmıyor.

Yeni davranış regresyonu, her iki taraf açılışta iki Lazer kurduktan sonra
gerçek Akım yenilenmesiyle Kalkan ve Onarım finanse edilirken başlangıç
silahlarının hayatta kalabildiğini 1/8/15. seviyede doğruluyor. Başarı ölçütü
yalnız ilk atışı yapabilmek değil, bir cephe kurabilmek.

### Depo neden 12 kaldı?

Son kaynaklarla 672 ek maç: 2,2 sn dolum, depo12/14/16, hızlı ve üç saniyede
karar veren politikalar, iki seviye, sekiz deste. Her büyük depo için 224
eşleştirilmiş karşılaştırmada **kazanan değişimi 0**; 15 maçta süre değişti.
Medyan süreler ve ortanca tavanda bekleme oranı aynıydı (tavanda bekleme 0).
Dolayısıyla daha büyük depo için şu an güçlü bir gerekçe yok. Bu, biriktiren
her insan stratejisinde depoların aynı olduğu anlamına gelmez.

## Gerçek Android doğrulaması

Paket **GRIDSHARD TEST / com.gridshard.localdebug**; üretim uygulaması ayrı.
Build **ddd44b832480e8ad**. APK SHA256:
`FC06F22750B1E79BA9B4F3D283282D04E885806A620219D5449E57D06637E496`.

- Derleme ve 671 dosyalı APK denetimi geçti. Yeni paket veri silmeden kuruldu.
- Paket içindeki 36 kartın CAN/maliyet/hasarı ve gerçek yerel API verileri
  son kaynaklarla aynı. Native Android doğrulandı; test hook yok.
- Gerçek arayüz komutlarıyla oynanan maç **171,1 saniyede çekirdek yıkımıyla**
  bitti. Oyuncu kaybetti; zafer sonucu üretilmedi veya maç zorla bitirilmedi.
- Oyuncu aynı anda **6 canlı modüle** ulaştı; 28 yerleştirme komutu verildi.
  Silah, Kalkan, Batarya, Güçlendirici ve Soğutucu birlikte kurulabildi.
- Günlük bonus maç çekirdeğini **495 CAN** yaptı. İlk sabit450 test beklentisi
  bu nedenle hatalıydı; sunucunun verdiği gerçek maç maksimumuyla eşlendi.
- Akım gözlemleri 0–12 aralığında; JavaScript hata sayısı **0**.
- Fotoğraflar gerçek ADB ekran görüntüsü; bu WebView'da alt sabit katmanları
  bozan CDP ekran görüntüsü kullanılmadı. Görseller gözle incelendi.

Kanıt: `native/result.json`, `native/runtime.json`, `native/phone-formation.png`,
`native/phone-result.png`. Araç `tools/check_native_strategy_window.cjs`.
Telefon ana ekranda bırakıldı; geçici USB uyanık kalma ayarı eski0'a döndü,
CDP9224 kaldırıldı. USBreverse8891 ve yalıtılmış sunucu22752 kullanıcı denemesi
için açık. Sunucu yalnız localhost'ta; kayıtları geçici. Canlı/Play/push yok.

## Regresyonlar ve kalan ince ayar

- **1.965 sunucu testi geçti, 44 koşullu dış ortam testi atlandı.**
- **746 istemci, 10 paket testi geçti.**
- AndroidChrome ve WebKit'te 320/393px dört kart/değer/taşma testi geçti;
  son maliyetler için gerçek güncel API üzerinde Android320px tekrar geçti.
- Sandbox'ın atomik dosya yeniden adlandırma/hardlink engelleri nedeniyle
  ilk test koşuları ortam hatası verdi; normal Windows izinleriyle yeniden
  çalıştırıldı. Eski CAN/maliyet bekleyen iki sözleşme kasıtlı yeni değerlere
  güncellendi; davranış kontrolleri kaldırılmadı.

Bu adayın güçlü tarafı artık daha uzun, daha kalabalık bir savaş kurabilmek.
Nihai oyuncu metasının dengeli olduğu iddia edilmiyor. Son bot matrisinde
15. seviyede kullanıcının tek silah kartlı efsanevi destesi %50'ye, diğer
efsanevi deste %67'ye ulaştı; buna karşın delici deste %92 ve dengeli zincir
destesi %88 ile hâlâ güçlü. Düşük seviyedeki tek silahlı efsanevi deste zayıf.

Soğutuculu/sız eşleşmelerde de belirgin fark sürüyor. Bir sonraki ince ayar
**delici/zincir karşı stratejileri ve Soğutucusuz ağır düzenlerin gerçek
oyuncu denemeleri** olmalı. Genel ısıyı körlemesine azaltmak seçilmedi;
kart işlevi, koruma sırası, yetenek dalı ve enerji düzenini ayrı ölçmek gerekir.
İnsan tarafında doğru kurulumla da karşı oyun oluşmuyorsa yalnız ilgili
modül/etki değiştirilip aynı matris tekrar çalıştırılmalı. Depo büyütmek
bu sorunların çözümü olarak görülmemeli.

## 36 kartın taban değerleri

| Kart | CAN (once -> simdi) | Akim | Taban hasar |
|---|---:|---:|---:|
| Lazer | 100 -> 220 | 3 | 12 |
| Kalkan | 150 -> 240 | 3 | 0 |
| Soğutucu | 100 -> 180 | 2 | 0 |
| Batarya | 120 -> 216 | 2 | 0 |
| Güçlendirici | 90 -> 162 | 3 | 0 |
| EMP | 80 -> 144 | 3 | 0 |
| Onarım | 100 -> 180 | 3 | 0 |
| Sönümleyici | 180 -> 288 | 3 | 0 |
| Darbe Topu | 90 -> 198 | 3 | 30 |
| Füze Fırlatıcı | 105 -> 231 | 3 | 32 |
| Hedefleme Bilgisayarı | 85 -> 153 | 3 | 0 |
| Bariyer | 165 -> 264 | 3 | 0 |
| Ark Topu | 125 -> 275 | 4 | 22 |
| Kapasitör | 90 -> 162 | 2 | 0 |
| Dron Üssü | 110 -> 242 | 3 | 8 |
| Sinyal Bozucu | 85 -> 153 | 2 | 0 |
| Ray Topu | 125 -> 275 | 4 | 44 -> 38 |
| Akım Dengeleyici | 100 -> 180 | 3 | 0 |
| Yansıtıcı | 110 -> 176 | 3 | 0 |
| Nano Sağlıkçı | 95 -> 171 | 3 | 0 |
| Virüs | 70 -> 126 | 3 | 0 |
| Aşırı Hızlandırıcı | 80 -> 144 | 3 | 0 |
| Plazma Havanı | 125 -> 275 | 4 | 34 |
| Muhafız Kubbesi | 155 -> 248 | 4 | 0 |
| Kuantum Tekrarlayıcı | 105 -> 231 | 4 | 18 |
| Krono Rölesi | 88 -> 158 | 3 | 0 |
| Faz Zırhı | 150 -> 240 | 4 | 0 |
| Sürü Fabrikatörü | 105 -> 231 | 3 | 10 |
| Hassasiyet Matrisi | 110 -> 198 | 3 | 0 |
| İyon Mızrağı | 130 -> 286 | 4 | 40 -> 32 |
| Prizma Kalkanı | 165 -> 264 | 4 -> 3 | 0 |
| Kesici | 80 -> 144 | 2 | 0 |
| Anka Onarım | 100 -> 180 | 4 -> 3 | 0 |
| Kuantum Topu | 135 -> 297 | 4 | 42 |
| Omega Güçlendirici | 95 -> 171 | 3 | 0 |
| Tekillik Projektörü | 90 -> 162 | 4 -> 3 | 0 |
