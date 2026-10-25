# Ses, çekirdek enkazı ve CI düzeltmeleri — 23 Ekim 2026

## Ses: neden ve çözüm

Sorun yalnız ana ses ayarı değildi: aynı üretim WAV'ı farklı olaylarda farklı
kazançlarla kullanılıyordu. Eski batarya üretim sesi RMS olarak lazerden yaklaşık
16,85 dB; eski güçlendirici yaklaşık 1,96 dB yüksekti. Üretim sesi ayrıca daha
uzundu ve destek olayları birbirinin üzerine binebiliyordu.

Lazer değiştirilmedi. Batarya için ayrı `battery_charge` eşlemesi oluşturuldu;
güçlendirici, onarım, soğutma ve sonraki destek modüllerinin ortak sesleri
dengelendi. Son RMS farkları lazer referansına göre: güçlendirici −10,08 dB,
batarya −8,34 dB, onarım −6,61 dB, soğutma −8,68 dB. Sekiz destek sesinin hem
RMS hem en yüksek 50 ms RMS seviyesi lazerin yarısını aşmıyor. Modül kaybı sesi
de çekirdek patlamasının altında tutuldu. UI/ödül/core-ready sesleri aynı kaldı.

Savaşta destek sesleri ortak 420 ms yeniden tetikleme sınırını paylaşır; mevcut
üç rutin ses kapasitesinin tamamını dolduramaz. Öncelikli çekirdek olayları ve
mevcut genel ses sınırı korunur. Yeni ses döngüsü, timer veya kanal eklenmedi.

Bu değerler gerçek PCM dosyaları ve uygulamadaki gain üzerinden hesaplanmıştır;
hoparlörün fiziksel dB SPL ölçümü veya insan dinleme testi değildir.
Denetim: `tools/battle-sfx-audit.cjs`; ölçümler:
`artifacts/cleanup-20261023/battle-sfx-balanced.json`.

## Çekirdek patlaması sonrası görünüm

Imagegen becerisiyle mevcut yedi çekirdek ayrı ayrı düzenlenerek aynı çizim
dilinde kırılmış, enerjisi sönmüş enkazları üretildi. Canlı çekirdek dosyaları
korundu. Yeni dosyalar `client/assets/ui/cores-wrecked-v1/` altında yedi adet
384×384 saydam WebP; toplam 238486 bayt. Hazırlama aracı yalnız ölçülendirme,
tabana hizalama ve format dönüşümü yapar; çizimi yeniden boyamaz.

HP sıfıra indiğinde kartın görsel kimliği bir kez enkaza geçer; yeniden doğuşta
canlı görsele döner. Enkazda pulse/emitter/ready efekti yoktur. Eski soluk canlı
silueti yerine okunur kırık gövde gösterilir. Normal kalitede patlama altında
tek seferlik 0,9 saniyelik belirme vardır; düşük kalite/hareket azaltmada yoktur.
1000 aynı enkaz güncellemesinde yeniden mount/DOM yazımı oluşmadığı test edildi.

Üretim promptları ve kaynak yolları: `docs/CORE_WRECKS_PROMPTS_20261023.md`.
Offline hazırlama: `tools/prepare_core_wrecks.py`.

## Diğer arayüz düzeltmeleri

- “SAVAŞ SONA ERDİ” ara yazısı ve ona ait CSS/çeviri kaldırıldı. Patlama için
  mevcut 2500 ms sonuç beklemesi, iptal/tekrarlama korumaları ve sonuç ekranı kaldı.
- Kaynak barındaki eski yazı karakteriyle çizilmiş, gölgeli artılar kaldırıldı.
  Yerlerine dik, keskin, üç katmanlı kod-native SVG artı geldi. Ön yüz savaş
  düğmesinin sarısı `#ffcc45`; perspektif, blur ve text-shadow yok. Aynı düğme
  hedefi ve mağazaya yönlendirme korunur. Bu basit vektör için bitmap üretilmedi.

## CI: kanıt ve kalan engel

Son HEAD `e795bc8` koşusu kırmızı test değil, iptal edilmiş koşuydu:
[39962200347](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/39962200347).
Sunucu, istemci ve üretim imajı işleri geçti. Tarayıcı işi, pnpm kurulumu
tamamlandıktan sonra tarayıcı indirme/kurulum adımında yaklaşık 30 dakika
ilerlemedi ve job zaman aşımına uğradı; tarayıcı testleri başlamadı.

Kurulum ayrıldı: kilit dosyasına bağlı Playwright tarayıcı önbelleği, ayrı sistem
bağımlılığı adımı, süre sınırları ve en fazla üç süre sınırlı indirme denemesi
eklendi. Testler veya FPS eşikleri gevşetilmedi; hata yutma/continue-on-error yok.
Yeni görsel regresyon dosyası da üç tarayıcının test keşfine ve CI listesine eklendi.
Bu değişiklik henüz uzaktaki yeni bir commit üzerinde doğrulanmış değildir.

Önceki gerçekten başarısız koşuda
[39715140349](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/39715140349)
WebKit savaş render bütçesi başarısızdı. Bu FPS sorunu hâlâ açıktır. Son önceki
yerel normal ölçüm Windows WebKit 2,0 FPS / p95 551,5 ms; Chromium ölçümleri
geçiyordu. Bu tur yeni işlevsel testlerin geçmesi FPS onayı değildir. Yeni bir
FPS düzeltmesi veya uzaktaki yeşil CI sonucu iddia edilmiyor.

## Son doğrulama

- 709/709 istemci testi; 10/10 paketleme sözleşmesi; 22/22 araç testi geçti.
- Import denetimi: 418 dosya, sıfır sorun.
- Mevcut çekirdek/kalkan/ödül görsel matrisi 6/6; yeni artı ve görsel
  ölüm/yeniden doğuş matrisi 6/6 geçti (Chromium, emüle Android, WebKit).
- Yeni çekirdek tarayıcı testi yalnız geliştirme önizlemesiyle görsel geçişi
  kontrol eder; sunucuda gerçek HP/ödül verisini değiştirmez. Önizleme API'si
  üretim paketinde bulunmadığı ayrıca doğrulandı.
- DOM kart benchmark'ında ilk 14 mount sonrasındaki 20 güncellemede yeni/kaldırılan
  node yok. Bu script benchmark'ı FPS ölçümü değildir.
- Son izole üretim build'i: `fd36a55578bb272d`, 44 betik, 614 varlık, yedi enkaz;
  `artifacts/web-dynamic-audit-B8L48j/dist`. Ana dist/Android değiştirilmedi.

Kanıtlar `artifacts/cleanup-20261023/` altında `client-polish-audit.tap`,
`e2e-polish-existing-6-results.json` ve `e2e-battle-polish-6-results.json`.
Önceki commit edilmemiş çalışmalar korundu. Commit/push, sunucu yayını veya
yeni AAB yapılmadı. Dinleme ve fiziksel cihaz kontrolü kullanıcıda; WebKit
performans kapısı ve sonraki uzak CI doğrulaması tamamlanmadan yayın onayı yok.
