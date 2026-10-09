# Savaş kodu incelemesi ve refactoring — 8–9 Ekim 2026

Durum: yalnız yerel çalışma ağacı. Canlı sunucu, oyuncu verileri, mevcut v4
paketler değişmedi. Commit/push, APK/AAB üretimi veya dağıtım yapılmadı.
Başlangıç HEAD: `d9416ee18cc1fd2638ac9e62d311a1f60485a6b0`.

## Kapsam ve yöntem

- Backend: `server/app/game/` altındaki 30 dosya; motor/komut sırası,
  combat, energy, heat, sabotage, support, core balance, ekonomi, AI,
  tutorial, sonuç, snapshot, protocol, WebSocket ve tick runner.
- Gateway: `server/app/main.py` savaş/setup/ready/reconnect/sonuç,
  eşleşme ve bağlantı yaşam döngüsü; `server/app/matchmaking.py` bellek ve
  Redis kuyruk yolları. Yetki ve özel snapshot/event görünürlüğü korunur.
- Frontend: `client/src/battle/` sekiz modül; `relay-client.js`, `app.js`
  savaş/polling/komut/render/FX/sonuç akışları ve `gridshard-audio.js`.
- Debugging: bloke soket, cancel/drain, eski HTTP yanıtı, yeniden bağlanma,
  sonucun kalıcılaştırılması ve soğuk ses yüklemesi yeniden üretildi.
- Refactoring: ağ gönderimi motordan ayrıldı; tek yazar, oturuma bağlı
  istek ve ertelenmiş FX yaşam döngüleri ayrıştırıldı; kullanılmayan savaş
  sarmalayıcıları kaldırıldı. Mekanikleri yeniden yazan toplu dönüşüm yapılmadı.
- Kullanıcının istediği bağımsız ikinci ajan salt-okunur peer review yaptı.
  Bulgular düzeltildikten sonra tekrar değerlendirildi. Son bağımsız
  çalıştırmalar: client lifecycle 7/7, sonuç sesi+lifecycle+unlock 14/14,
  countdown/presentation receiver regresyonu 5/5.
  Tam sunucu ve tarayıcı koşuları ana ajan tarafından yürütüldü.

Önceki son arkadaş maçı kontrolü için
[BATTLE_PERFORMANCE_FIX_20261008.md](BATTLE_PERFORMANCE_FIX_20261008.md).
O maçın silinmiş ayrıntılı olay geçmişinden donmanın tam anı/tek nedeni
çıkarılamadı. Aşağıdaki sorunlar kaynak ve yalıtılmış yeniden üretimle
doğrulandı; o canlı maçın kesin kök nedeni olduğu iddia edilmez.

## Doğrulanmış sorunlar ve düzeltmeler

| Alan | Sorun | Yerel çözüm / doğrulama |
| --- | --- | --- |
| P1 ağ/tick | Bir oyuncunun yavaş gönderimi iki oyuncunun motorunu bekletiyordu | Her bağlantıda tek, sınırlı background writer; yalnız son snapshot birleştirilir, yetkili event geçmişi korunur. 2 sn timeout yalnız yavaş bağlantıya aittir |
| P1/P2 oturum sınırı | Bir socket'ten başka, aynı oyuncuya ait oturum için komut/ACK/reconnect gelebiliyordu | Handler socket'in session ID'sini zorunlu karşılaştırır; mutasyondan önce reddeder |
| P2 sonuç sırası | Son finished snapshot, kalıcı sonuç yazılmadan ödül isteğini tetikleyebiliyordu | `result_delivery_pending` + `resultDeliveryReady`; terminal/reconnect sonucu yayımlanmadan ekonomik sync başlamaz |
| P2 terminal iptali | Disconnect'in writer'ı iptal etmesi sağlıklı oyuncunun sonuç/close akışını da iptal edebiliyordu | Writer iptali dış runner iptalinden ayrılır; terminal drain/close bounded ve oyuncu başına bağımsız |
| P2 pending sonuç/reconnect | Finished snapshot alıp sonuç kaydı sürerken kopan client yeniden bağlanmıyordu | Finished **ve yayımlanmış sonuç** birlikte olursa reconnect durur; aksi halde reconnect son final sonucu getirir |
| P2 HTTP sırası | AI/local polling üst üste çalışabiliyor, eski yanıt yeni maçı veya HP/cursor'u geri alabiliyordu | Single-flight, session generation, session ID ve monoton snapshot/event cursor |
| P2 HP sunumu | Kendi/AI/rakip çekirdeğin üst CAN'ı 300 veya eski template değeri kalabiliyordu | Sunucu maxHP kullanılır, render imzasına girer. Gerçek app VM yolu 450/450 → 450/600 ve eski snapshot reddini test eder |
| P2 FX yaşam döngüsü | Eski RAF/ticker/core-wave/onarım işi rematch'te yeni efekt sayaçlarını/sınıflarını değiştirebiliyordu | Generation-owned deferred queue; reset/cancel/flush sırasında yeni iş ve eski RAF sınırları |
| P2 komut teslimi | Başarısız deploy gönderimi phantom pending yerleşim bırakıyordu | Pending yalnız başarılı teslim sonrası artar; disconnected kart/güç komutları kapalı |
| P3 RTT | Sunucu monotonic saati client epoch değeriyle çıkarılıyordu | Sahte server RTT kaldırıldı; client kendi monotonic saatinden eşleşen heartbeat echo ile ölçer |
| Tarayıcı zamanlayıcısı | Countdown'ın native timer'ı instance property olarak çağrılınca `Illegal invocation` oluşuyordu | Window receiver'ı koruyan wrapper ve receiver regresyon testi; hata gerçek Chrome trace'inde doğrulandı |

Tick döngüsü sabit 100 ms süreye göre işi çıktıktan sonra kalan zamanı bekler.
Uzun bir duraksamadan sonra birikmiş tick'leri hızlandırılmış burst ile
çalıştırmaz; sonraki deadline sıfırlanır. Ağ writer'ına snapshot kuyruğu değil
en fazla iki dirty flag verilir (events/snapshot). Cursor ancak başarılı
event/reconnect gönderiminden sonra ilerler; görünmeyen özel olaylar açılmaz.

Sonuç marker'ı “yayın hazır” anlamındadır, “veritabanı her durumda başarılı”
garantisi değildir. Kalıcılaştırma hata/timeout'unda runner sonuç ekranını
engellemez; mevcut idempotent `/post-match` kurtarma yolu korunur. Yinelenen
terminal mesajları in-flight/cache ve ilk-sunum kontrolünden geçer.

## İnsan öncelikli eşleşme

- Normal PvP varsayılanı insan önceliğidir; beta sürüm olması bot-only yapmaz.
- Uygun kademe/rating penceresindeki oyuncu hemen eşleşir. 10 saniye dolunca
  status önce insan eşleşmesini tekrar dener, hâlâ yoksa aynı kademe AI seçer.
- Client status polling 1 sn olduğundan fallback ilk uygun poll'da gerçekleşir;
  ağ/provision süresi nedeniyle tam 10.000 ms garantisi değildir.
- Tutorial'ın yönetmenli AI savaşı ve açık operations/test AI-only override
  korunur. Yerel Windows/shell başlatıcıları artık kendiliğinden AI-only açmaz;
  operator açıkça belirlemişse değeri korunur. Canlı env okunmadı/değiştirilmedi.
- 9,999 sn bekleme, 10 sn AI fallback, sınırda insan önceliği, tekrar poll'da
  aynı session, cancel sonrası bot oluşturmama gateway testleri geçti.
  Redis'in mevcut atomik eşleşme/provision ve kademe adaleti korunur.

## Ses değişiklikleri

`shardglass-seamless-v15`:

| Kanal | Önce → sonra | Amaç |
| --- | --- | --- |
| Savaş müziği bus gain | 2,60 → 2,85 | Yaklaşık +0,8 dB, bir kademe daha açık |
| Combat VFX/SFX çarpanı | 0,32 → 0,28 | Yaklaşık −1,2 dB; önemli cue çarpanı 1,4 korunur |
| Sonuç müziği | Ortak müzik hedefi → hedef × 0,55 | Yaklaşık −5,2 dB trim ve 320 ms yumuşak başlangıç |

- Battle → victory/defeat geçişinde SFX duck ve compressor makeup telafisi
  artık kaldırılmaz. Çekirdek patlamasının devam eden sesi terminal state'te
  birden yükselmez. HTML stem'lerde gain yalnız son per-track seviyede
  kırpılır; varsayılan ses düzeyinde müzik artışı kaybolmaz.
- HTML soft attack dosya yüklenirken değil gerçek play başarısında başlar;
  WebAudio attack zamanlaması kaynakta yapılır. Slider/master değişimi eski
  hedefi geri yüklemez, sonuç sesini baştan başlatmaz.
- “Reklam izle” kabul edilen ilk basışta sonuç müziğini senkron durdurur;
  render, foreground, unlock veya tercihler reklamdan sonra aynı sonuç sesini
  yeniden başlatamaz. Yeni battle/state için kilit açılır. Kullanıcı mute/volume
  ayarları ve reklam ödül/SSV güvenlik sözleşmesi değişmez.
- Decode/context-resume/play generation kontrolü, eski sonuç veya darbe
  sesinin background/foreground ya da yeni maç sonrasında başlamasını engeller.
  HTML fallback, geç play rejection ve preloaded track tekrar kullanımı kapsanır.
- Kaynak WAV ölçümü: victory 10,0 sn, peak −6,00 dBFS, RMS −24,78 dBFS;
  defeat 5,2 sn, peak −6,00 dBFS, RMS −11,91 dBFS. Bunlar dosya ölçümleridir,
  telefon hoparlöründeki algılanan ses değildir. Ses dosyaları yeniden üretilmedi.

## Ölçüm

Tekrarlanabilir offline araç: `tools/battle_profile.py --ticks 600 --transport-ticks 20`.
Hiçbir ağ, veritabanı veya oyuncu hesabı kullanmaz.

| Bellek içi fixture | Sonuç |
| --- | --- |
| Dört canonical, altışar modüllü layout'ın 16 sıralı eşleşmesi | 8.208 motor step; ortalama 0,349 ms, p95 0,667 ms, max 2,169 ms; cProfile ek yükü dahil |
| İki oyuncu için snapshot + JSON | 1.648 örnek; ortalama 0,110 ms, p95 0,159 ms, max 0,302 ms; max payload 7.014 byte |
| Sentetik 50 ms send, eski awaited yol, 20 tick | Tick admission ortalama 80,722 ms; toplam 1.614,480 ms |
| Aynı fixture, yeni background/latest yol | Ortalama 0,509 ms; toplam 10,208 ms; 19 snapshot birleşti, son durumda en fazla iki pending flag |

İkinci karşılaştırma motora kabul süresidir, paketin karşı tarafa ulaştığı
süre değildir. CPU profili energy/combat/sort/operational kontrollerini öne
çıkarır; bu küçük fixture'da hepsi 100 ms tick bütçesinin çok altındadır.
Yoğun, sürekli deploy'lu üretim kapasitesi bu ölçümden türetilemez.

Son 9 senaryolu Chrome koşusunda 15 sn UI örnekleri (geri sayım dahil), gerçek
app setup/ready/komut/drop/reconnect yolları kullanıldı. Snapshot, oyuncu saati
veya sonuç enjekte edilmedi. Arkadaş maçının iki istemcisinde de, masaüstü ve
Pixel7 viewport öykünmesinde, JavaScript page error listesi boştu.

| Son arkadaş maçı UI ölçümü | p95 kare | En uzun kare | En uzun task | Freeze |
| --- | --- | --- | --- | --- |
| Desktop, oyuncu A | 30,5 ms | 92,9 ms | 145 ms | 0 |
| Desktop, oyuncu B | 31,5 ms | 92,9 ms | 113 ms | 0 |
| Pixel7 viewport, oyuncu A | 25,5 ms | 339,3 ms | 165 ms | 0 |
| Pixel7 viewport, oyuncu B | 23,5 ms | 170,7 ms | 132 ms | 0 |

Dört client'ta performans bütçesi geçti. Freeze eşiği 1.000 ms; bu “hiç jank
olmadı” demek değildir. Öykünme masaüstü CPU/GPU'sunu kullanır; fiziksel
telefon FPS veya uzun insan-insan maç garantisi değildir. Density senaryosu
20 kartlı düzeni kontrol eder, sürekli deploy motor yükünü ölçmez.
Ignored yerel kanıt: `artifacts/battle-audit-20261009/nine-scenarios-final.json`,
SHA256 `2c3e97d7f6af3109814d78c650dac97d1053fa90ada5bce1f746744abd8604d8`.

## Testler ve statik analiz

| Kontrol | Son doğrulanmış sonuç |
| --- | --- |
| Tam client Node | 272 başarılı, 0 hata |
| Tam server pytest | 1.313 başarılı, 39 skip, 1 mevcut Starlette/httpx deprecation uyarısı |
| Build koruma testleri | 9/9; beklenen negatif fixture build hataları test başarısıdır; APK/AAB değildir |
| Tarayıcı E2E | 9/9, 2,3 dk; Desktop Chrome + Pixel7 viewport: arkadaş/PvP, reconnect/rematch, yoğun düzen ve mobil kontroller |
| Ruff 0.14.0: game/main/matchmaking/profile | F, B, ASYNC, PERF kurallarında 0 hata |
| ESLint 9.39.1: battle/app/relay/audio | Doğruluk kurallarında 0 hata, app'ın diğer/legacy alanlarında 10 kullanılmayan değişken uyarısı |
| `git diff --check` | Başarılı; Windows CRLF dönüşüm uyarıları whitespace hatası değil |

Lint konfigürasyonları `tools/battle-ruff.toml` ve
`tools/battle-eslint.config.cjs`. Ruff'taki tek PERF203 istisnası bir bozuk
socket'in diğer oyuncuların receive/close işlemini durdurmaması içindir.
ESLint yalnız açıkça global'e yayınlanan API adlarını tanır; bütün lexical
adları global sayıp typo'ları gizlemez. Araç bağımlılıkları ignored audit
dizinindedir; uygulama bağımlılığı/lockfile değişmedi.

Tüm repository için `tools/check_imports.py` yeşil değildir: 384 dosyada 13
eski bulgu vardır. Arşiv beta23/24/32/37 rapor araçları ve kullanılmayan
`balance_simulation`/`balance_regression`/`balance_change_drafts` eski
topology/Direction/enerji sabiti/schema adı bekler; `main.__name__` ise
implicit Python adı için statik checker false-positive'idir. Eksik export'lar
ve topology dosyasının yokluğu başlangıç HEAD'de de doğrulandı; canlı savaş
modüllerinden yeni bir import kaldırma hatası oluşmadı. Bunları “tüm depo
lint temiz” diye sunma; eski offline araç modernizasyonu ayrı iş olarak kalır.

## Bilinçli olarak uygulanmayanlar / yayın kapısı

- Destroyed modüllerin geçmişini silme veya active-module indeksini körlemesine
  ekleme yapılmadı: Phoenix dirilmesi, ID üretimi ve hasar atfı bu geçmişe
  bağlıdır. Önce sürekli deploy'lu gerçek yoğunluk profili gerekir.
- Her HP değişiminde kartın yalnız alt DOM düğümlerini patch eden büyük render
  dönüşümü ertelendi; mevcut hücre imzaları değişmeyen kartları koruyor.
- Hızlı çoklu deploy için client-side kredi rezervasyonu ayrı davranış kararıdır;
  şu an sunucu bütçe otoritesi ve yerleşim limiti korunur.
- [MODULE_REVIEW_20261008.md](MODULE_REVIEW_20261008.md): 36 modül ve 7
  çekirdek incelendi, enderlik/numeric stat'lar korunur. Tekillik/Kesici maliyet
  ayrımı yalnız gerekçeli öneridir; winrate/enerji/ısı verisi olmadan uygulanmaz.
- Fiziksel cihazda uzun ve yoğun insan-insan maç, kontrollü ağ gecikmesi,
  background/foreground, rematch ve reklam sırasındaki ses dinlemesi henüz
  yapılmadı. Sonradan yayın için ayrı talep, kaynak/CI kapısı ve mevcut oyuncu
  profilini silmeden cihaz güncelleme doğrulaması gerekir.
