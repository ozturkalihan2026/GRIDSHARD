# Sürüm öncesi duyuru standardı ve iki müzik paketi

**5 Kasım güncel karar:** [2.3.0 bakım ön haberi ve 2.4.0 turnuva penceresi](release-230-prerelease-system-mail.md)
iki ayrı kimlik kullanır. İlk haber AAB değiştirmeden Sistem mesajıdır;
23 Kasım 22.00–24 Kasım 00.00 TR bakım planını anlatır. Yeni 2.4.0 sunucu/AAB
sonrasında ayrı, bir kez gösterilen turnuva rehberi açılır. Aşağıdaki ilk
tek-kimlikli 4 Kasım tasarımı bu kampanya için bu kararla değiştirilmiştir;
genel popup/onay motoru ve sonraki sürümlerin standardı korunur.

4 Kasım 2026 kullanıcı kararı. Uygulama etiketleri hâlâ 2.3.0/code14;
2.4.0 paket hedefi 23 Kasım, S1 hedefi 30 Kasım 03.00 Türkiye saatidir.
Hedef tarih, sezonu açan ayar veya kesin yayın taahhüdü değildir.

## Duyurunun oyuncu akışı

- Aynı TR/EN içerik hem ilk uygun ana ekran açılışında hem Mesaj Kutusu →
  Sistem içinde sunulur. Mevcut lacivert yüzey, turkuaz vurgu ve altın Tamam
  düğmesi korunur; 320/393 px ekranda metin kayar, düğme görünür kalır.
- Tamam tıklanana kadar gösterim onay sayılmaz. Tamam sonrasında onay,
  hesap + değişmeyen duyuru kimliğiyle sunucuda kalır; yeniden giriş ve başka
  cihaz aynı onayı kullanır. Mesajı okumak/silmek popup onayından bağımsızdır.
- Ağ hatasında pencere kapanır; hesaba özel yerel bekleyen onay saklanır,
  sonraki mesaj kutusu yenilemesinde sunucuya tekrar gönderilir. Aynı cihazda
  tekrar açılmaz. Diğer cihazın onayı görmesi için sunucu eşitlemesi gerekir.
- Savaş, açılış yüklemesi veya başka pencere üzerinde açılmaz. Eğitim akışı
  modal boyunca kendi mevcut modal bekleme kuralını kullanır. Açık duyuru
  sırasında dil değişirse başlık/metin/düğme birlikte güncellenir.
- Yayın zamanı gelmemiş, taslak, geri çekilmiş ve süresi dolmuş duyuru
  gösterilmez. Sürüm çıkınca ön duyuru biter; aynı kimlikte incelenmiş
  `released_title/body_tr/en` varsa aynı minor hattında sezon öncesi metne
  geçer. Onay sıfırlanmaz. Bir sonraki minor'da eski duyuru gösterilmez.
  Eski API'de alan yoksa akış devam eder.
- Bu kaynak hazırlığı canlı dağıtım değildir. Oyuncuya görünmesi sunucu
  dağıtımını, popup için bu istemci kodunun kurulmasını gerektirir. Eski
  desteklenen istemciler sunucu dağıtımından sonra Sistem mesajını okuyabilir.

## Her sürüm için aynı kontrol listesi

2.3.0 sonrası patch, minor ve major sürümlerde `release_guard` incelenmiş
ön duyuruyu arar. Acil patch için de kısa, doğru bir ön duyuru hazırlanır.

- [ ] `python tools/release_announcements.py --draft 2.5.0` ile taslağı çıkar;
  `server/data/release_announcements_v1.json` içine ekle. Komut yayın yapmaz.
- [ ] Ürün içeriği, iki dil, hedef tarih/plan niteliği, sezonun ayrı açılması,
  gerçekten teslim edilecek ödül koşulları ve ertelenen kapsam editoryal incelensin.
- [ ] Kimlik kalıcı olsun; yazım değişikliği onayı sıfırlamaz. Yeniden bildirilmesi
  gereken tarih/kapsam düzeltmesi ayrı kimlikle açıkça düzeltme olarak yayınlanır.
- [ ] İstemci ilk kez bu sürümde kuruluyorsa, sezon başlamadan önce gösterilecek
  güncel sezon metni iki dilde hazırlansın. 2.4.0 kaydı bu iki aşamayı tek
  onayla destekler; eski kullanıcıya ikinci kez pencere açılmaz.
- [ ] `publish_at`/`expires_at` zaman dilimli olsun. Takvim değişirse katalogdaki
  tarih ve iki dildeki metin birlikte değişsin; tarih denetimi CI'da çalışır.
- [ ] İncelenen kaydı `published` yap; `--check --require HEDEF_SURUM` çalıştır.
  Patch duyuruları aynı şemayı kullanır; takvimde olmayan patch'in kapsam/tarihi
  editoryal yazılır. Boş taslaklar runtime kataloğuna konmadan tamamlanır.
- [ ] Tek gösterim, ağ hatası/yeniden deneme, başka hesap/cihaz, TR/EN ve
  320/393 px kabulü geçsin. Yeni bir kozmetik veya ödül hakkı verilmediği doğrulansın.
- [ ] Ön duyuru ile gerçekleşen sürüm notları ayrı kalsın. Yayında
  `game_updates.json` gerçek değişiklikleri anlatır; gelecek planı olmuş gibi yazılmaz.

## Müzik paketi 1 — 2.5.0, hedef 21 Aralık 2026

İlk sezon açılışını büyütmemek için 2.4.0'a yeni beste eklenmez. 2.5.0'da
en az iki yeni, birbirinden özgün beste: bir menü, bir savaş parçası.

- Menü **Devrenin Ufku**: merak, umut, ustalaşma ve geri dönme isteği.
  Sıcak sentez pedleri, seyrek işlenmiş metal/pluck motifleri, nefesli alanlar;
  kısa bir şarkının sürekli tekrarı hissi yerine 90–150 saniyelik A/B gelişim.
- Savaş **Akımın Nabzı**: odaklanma, kontrollü rekabet ve kazanma kararlılığı.
  Katmanlı ritim/özgün motif; düşük, orta ve kritik yoğunluk düzenlemeleri.
  100–135 BPM araştırma aralığıdır, kabul edilmiş sabit tempo değildir.
- Önce kısa A/B müzikal eskizleri ve mevcut oyunla karşılaştırmalı dinleme;
  sonra loop/stem ve mobil paket. Kaynak/mağaza sesleriyle maskelenme kabul edilmez.

## Müzik paketi 2 — 2.7.0, hedef 15 Şubat 2027

PvE Seferi ile duygusal çeşitlilik: en az bir yeni menü ve iki yeni savaş
bestesi; önceki melodinin yalnız yeniden enstrümantasyonu yeni parça sayılmaz.

- Menü **Derin Devre**: keşif, dinginlik, hafif gizem ve yolculuk beklentisi.
  Organik rezonanslar ile aynı elektronik/metal GRIDSHARD ailesi birleşir.
- Savaş **Bilinmeyen Hat**: keşif gerilimi ve taktik dikkat; boşluk/cevaplaşan
  motifler, kontrollü tırmanış. **Son Bağlantı**: cesaret, baskı ve çözülme;
  önemli karşılaşmanın bir sonraki aşamasını hissettiren özgün yoğunluk katmanları.
- Sefer/arena bağlamı ve sahne değişimi mevcut müzik yöneticisine bağlanır;
  her ekran için ikinci bir bağımsız çalar oluşturulmaz.

## İki paket için ortak altyapı ve yayın kabulü

- [ ] `gridshard-audio.js`, `audio-mix.js`, `gridshard-audio-formats.js` ve
  mobil manifest üzerinden mevcut state/codec/fallback hattına bağla.
- [ ] Özgün motif ve A/B gelişimi, dikişsiz loop, crossfade ve yoğunluk
  geçişlerini hem tek başına hem yoğun gerçek savaşta karşılaştır.
- [ ] Kaynak WAV/stem/proje, besteci/lisans ve sürüm/hash kökeni kaydedilsin;
  üretim istemcisine doğru OGG/AAC türevleri girsin. Bütün arşiv yüklenmesin.
- [ ] Loudness/true peak/clip/DC/loop click/codec decode raporları ve önce/sonra
  dinleme kanıtı bulunsun. Kalite artışı yalnız ses yükseltmek sayılmaz.
  Ortak LUFS/true-peak hedefi hâlâ seçilmedi; mevcut master/gain otomatik değişmez.
- [ ] Müzik/SFX tercihleri, düşük seviye/mute, arka plana geçiş/dönüş,
  autoplay/ilk dokunuş ve çevrimdışı codec fallback bozulmasın.
- [ ] Eski+yeni parçalar için seçim/çeşitlilik kuralı tanımlansın; aynı parça
  art arda seçilmesin, müzik zamanlayıcısı her menü geçişinde başa sarmasın.
- [ ] Soğuk/sıcak decode, bellek ve paket boyutu mevcut ölçümle karşılaştırılsın;
  savaş kare bütçesi ve SFX anlaşılabilirliği korunsun. Fiziksel Android
  hoparlör ve kulaklık, macOS WebKit ve Android Chrome kabulü kaydedilsin.

Bu çalışma müzik üretimi/lisans alımı yapmaz. Bestelerin üretimi ve öznel
karşılaştırma kabulü AUDIO-03/AUDIO-04 görevlerinin kendi sürüm kapısıdır.

## Mevcut seslerin tarayıcı kabulü — 5 Kasım 2026

Safari CI izinde OGG yedeği kasıtlı olarak kesildiğinde AAC dosyası HTTP 200
ve doğru hash ile geldiği halde decode reddedildi. Dosyalar `M4A /isom/iso2`
markaları taşıyordu; bu, [WebKit'in MP4 tanıma regresyonuyla](https://github.com/WebKit/WebKit/commit/c3244cf76da410fe534f880686d375e1390bbbfd)
eşleşir. 105 AAC kapsayıcısının yalnız dört baytlık ana markası `mp42` olarak
düzeltildi; kodlanmış ses, zamanlama kutuları, süreler, dosya boyutu ve miks
aynı kaldı. Gelecek üretimlerde encoder `-brand mp42` kullanır. Bütün sevk
edilen AAC dosyaları için marka kabulü ve kaynak hash denetimi çalışır.

Bu bir yeni beste veya fiziksel dinleme kabulü değildir. Gerçek AAC yedeği,
ses sınırları ve sayısal miks kontrolü tarayıcı testinde doğrulanır. Savaş
kare bütçesi başarısız olsa da işlevsel testler kanıt toplamak için çalışır;
kare testi işi başarısız bırakır ve kaynak paketini engeller. Eşikler düşmez.
