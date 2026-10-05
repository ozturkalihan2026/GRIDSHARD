# GRIDSHARD — Audio Direction

## 1. Ses kimliği

Ana müzik dili:

**Electro-industrial + tactical ambient + modern synth**

Kaçınılacak:
- jenerik 80'ler synthwave klişesi,
- stock EDM drop,
- orkestral savaş müziği taklidi,
- sürekli yüksek yoğunluk.

Amaç: oyuncunun zihinsel strateji kurmasına izin veren, savaş ilerledikçe katman ekleyen dinamik müzik.

---

## 2. Tempo haritası

| Durum | BPM | Karakter |
|---|---:|---|
| Ana Menü | `92–100` | karanlık, güçlü, elektrikli |
| Savaş Havuzu | `105–112` | analitik pulse |
| Eşleştirme | `115–120` | yükselen gerilim |
| Savaş Başlangıcı | `120–126` | aktivasyon |
| Savaş | `126–132` | ritmik, agresif fakat dikkat dağıtmayan |
| Kritik Çekirdek | mevcut BPM + yoğun katman | heartbeat / distortion |
| Zafer | `5–7 sn` sting | yükselen motif |
| Mağlubiyet | `5–7 sn` sting | çözülen motif |

---

## 3. Leitmotif

GRIDSHARD tüm müziklerinde aynı kısa motif ailesini kullanır.

Foundation motif tasarım kuralı:
- 4–6 nota,
- minör / modal karakter,
- tek başına hummable olacak kadar kısa,
- menüde pad,
- havuz ekranında pluck/pulse,
- savaşta bass/arpej,
- zaferde açık harmonik,
- mağlubiyette düşük oktav / kırılmış versiyon.

**Beta.15 durumu:** İlk özgün prosedürel prototip motif ve ses dosyaları artık `client/assets/audio/` altında bulunur. Final mix/master ve nihai beste revizyonları ileride yapılacaktır.

---

## 4. Dinamik katmanlar

`menu_base`
- düşük frekans drone
- yavaş pulse
- motif pad

`pool_focus`
- daha net tick/pulse
- düşük yoğunluk
- karar verme alanı

`matchmaking_rise`
- tempo hissi artar
- filtre yavaş açılır

`battle_base`
- kick/bass pulse
- kısa synth motif

`battle_pressure`
- düşman çekirdek / oyuncu çekirdek hasarına göre ek katman

`critical_core`
- heartbeat
- distortion
- kısa alarm harmonikleri

`victory_sting`
- motifin yukarı çözülen versiyonu

`defeat_sting`
- motifin aşağı çözülen / detune versiyonu

---

## 5. Ses efekt dili

### Enerji transferi
kısa dijital akım; sürekli uğultu yapılmaz.

### Lazer
kapasitör dolumu + sert elektrik boşalması.

### Kalkan
camsı/plazma darbesi.

### EMP
yüksek frekans kırılması + çok kısa sessizlik.

### Virüs
dijital glitch / bozulan paket sesi.

### Çekirdek hasarı
derin bass transient + elektrik çatlağı. GRIDSHARD'ın en tanınabilir seslerinden biri olmalıdır.

---

## 6. Teknik audio state mapping

UI / istemci şu state adlarını kullanabilir:

- `menu`
- `pool`
- `matchmaking`
- `battle_intro`
- `battle`
- `battle_pressure`
- `critical_core`
- `victory`
- `defeat`

Beta.15 itibarıyla özgün prosedürel prototipler `client/assets/audio/` altında eklenmiştir; final prodüksiyon sürümleri aynı state modelini koruyarak geliştirilecektir.


---

## 7. Beta.15 özgün prototip assetleri

Bu pakette ilk özgün prosedürel GRIDSHARD audio dosyaları üretildi. Bunlar stock/üçüncü taraf ses değildir.

### Müzik
- `menu_pulse.wav` — 96 BPM yönü
- `pool_pulse.wav` — 108 BPM yönü
- `matchmaking_rise.wav` — 118 BPM yönü
- `battle_pulse.wav` — 129 BPM yönü
- `victory_sting.wav`
- `defeat_sting.wav`

Motif ailesi: `D – F – A – C – B`.

### SFX
- `port_connect.wav`
- `energy_transfer.wav`
- `laser_fire.wav`
- `shield_hit.wav`
- `emp.wav`
- `virus_glitch.wav`
- `generator_move.wav`
- `core_hit.wav`

Bu dosyalar kimlik prototipidir; final mix/master aşamasında ses kalitesi, stereo alan, limiter ve platform loudness değerleri ayrıca düzenlenecektir.


---

## 8. Beta.16 Runtime Mix / Settings

GRIDSHARD audio prototipleri artık Ayarlar ekranındaki gerçek kullanıcı tercihlerine bağlıdır:

- `Ses` slider → SFX gain,
- `Müzik` slider → music gain,
- `Sesi Sessize Al` → SFX mute,
- `Müziği Sessize Al` → music mute.

Bu tercihler oyuncu ayar verisine kalıcı olarak yazılır ve eski kayıtlarda alan yoksa `false` varsayımıyla geriye dönük yüklenir.

Audio Director:
- aktif müzik track seviyesini canlı günceller,
- müzik mute olduğunda track'i durdurur,
- mute kaldırıldığında mevcut state müziğini yeniden başlatabilir,
- SFX mute durumunda gameplay olaylarını engellemeden cue çalmayı atlar.

Beta.16 hâlâ prototip mix kullanır. Final loudness, stereo imaging ve mastering daha sonraki prodüksiyon aşamasıdır.


---

## 9. Beta.17 Audio Mix V2

İlk prosedürel kimlik assetleri ikinci mix aşamasına taşındı.

### Seviye normalizasyonu
- Müzik assetleri hedef peak: `-6 dBFS`
- SFX assetleri hedef peak: `-3 dBFS`
- Runtime music base gain: `0.72`
- Runtime SFX base gain: `0.55` (Eylül 2026 / mix v11; v10 `0.72`, önceki `0.86`)
- Savaş müziği katmanları ek olarak `battleMusicGain: 1.5` ile çalar (v11; v10 `1.22`). Menü müziği değişmedi.
- v11 efekt yoğunluğu (`GRIDSHARD_SFX_VOICE_LIMIT`): iki tarafın her saldırısı ateş + isabet efekti çaldığı için efekt yığını müziği bastırıyordu. Aynı efekt 90 ms içinde tekrar çalmaz; rutin efektler (ateş, isabet, akım) 320 ms'lik pencerede en fazla 3 tanedir. Çekirdek isabeti, yok etme, modül kaybı, uyarı, çekirdek gücü, diriliş ve EMP sınıra takılmaz.
- v11 efekt kanalı Web Audio'da sıkıştırıcıdan geçer (eşik −20 dB, oran 4:1, atak 4 ms, bırakma 220 ms); tarayıcı desteklemezse doğrudan çıkışa bağlanır.
- v12 (28 Eylül 2026, kullanıcı kararı): savaşta katmanlı müzik baskın, efektler arka planda.
  - `battleMusicGain` `1.5` → `1.85`; savaş stem taban kazançları %15 yükseldi (ör. sub `.36` → `.41`).
  - Yeni `battleSfxGain: 0.5`: savaş durumlarında (giriş, savaş, baskı, kritik çekirdek) efekt kanalı ayrıca yarıya iner (yaklaşık −6 dB). Menü efektleri değişmedi.
  - Varsayılan ayarlarda (müzik %70) savaş müziği yaklaşık +3 dB, savaş efektleri −6 dB oynadı.
  - Web Audio'da müzik izleri sınırlayıcıdan geçer (eşik −3 dB, oran 20:1, atak 3 ms, bırakma 250 ms): katman toplamı kırpılmaz. Tarayıcı desteklemezse doğrudan çıkışa bağlanır.
- v13 (28 Eylül 2026, kullanıcı isteği: "efektler hâlâ müziği bastırıyor"):
  - Kök neden 1: Web Audio `DynamicsCompressorNode` çıkışına tarayıcı otomatik bir makeup kazancı ekler (tam ölçek kaybının 0,6 kuvveti). v11 efekt sıkıştırıcısında (−20 dB, diz 12, 4:1) bu +6,4 dB'dir; v11/v12'deki efekt kısmaları bu yüzden duyulmadı. Savaş durumlarında sıkıştırıcı çıkışı `1 / makeup` ile ayarlanır (`gridshardCompressorMakeupGain`, Blink/WebKit statik eğrisiyle aynı hesap); sıkıştırıcı yalnız tepe seviyesini düşürür. Menü karışımı değişmedi.
  - Kök neden 2: savaş katman izlerinin sesi 0–1 aralığında kırpılıyordu; müzik ayarı yüksekken `battleMusicGain` artışı hiç uygulanmıyordu. Web Audio'da savaş katmanları ayrı bir kanalda toplanır (`_battleMusicBusNode` → müzik sınırlayıcısı); kanal kazancı `battleMusicGain` 1'i aşabilir, tepe seviyesi sınırlayıcıda tutulur. HTML ses yedeği eski kırpmalı yolu kullanır.
  - `battleMusicGain` `1.85` → `2.2` (varsayılan müzik %70'te yaklaşık +1,5 dB; müzik %100'de +4 dB, çünkü eski kırpma kalktı).
  - `battleSfxGain` `0.5` → `0.42` (rutin efektler bir kademe, yaklaşık −1,5 dB). Makeup düzeltmesiyle birlikte savaştaki rutin efektler v12'ye göre yaklaşık −8 dB.
  - Yeni `battlePriorityCueGain: 1.4`: savaşta öncelikli olaylar (çekirdek isabeti, yok etme, modül kaybı, uyarı, çekirdek gücü, diriliş, EMP) rutin efektlerin yaklaşık 3 dB üstünde çalar.
  - Savaş müziği evreleri artık bağlı (Beta.71 açık işi): ilk 20 sn `battle_intro`, sonra `battle`; Devre Gerilimi başlayınca ya da kendi çekirdeğin %60'ın, rakibinki %40'ın altına inince `battle_pressure`; kendi çekirdeğin %33'ün altındayken `critical_core`. Evre yalnız ileri gider; kritik durum iyileşmeyle kalkabilir. Yerel AI ve çevrimiçi savaşta aynı kural çalışır. Çekirdeklerin zayıflığından türeyen gerilim (0–1) katman karışımını sürekli besler; `setBattlePressure` durumun taban baskısını düşüremez (önceden kritik çekirdekte baskı 0,35'e iniyordu).
- v14 (29 Eylül 2026, kullanıcı isteği: "savaş müziğini bir tık daha açalım, efektler hâlâ baskın"):
  - `battleMusicGain` `2.2` → `2.6` (yaklaşık +1,5 dB). Katmanlar müzik sınırlayıcısına dayandığı için tepe seviyesi aynı kalır; artış daha dolgun, daha sürekli bir müzik olarak duyulur. Asıl denge efekt tarafında kuruldu.
  - `battleSfxGain` `0.42` → `0.32` (rutin savaş efektleri yaklaşık −2,4 dB).
  - Rutin efekt yoğunluğu: pencere 320 → 420 ms (en fazla 3 rutin efekt; saniyede ~9 yerine ~7).
  - Yeni `priorityRetriggerMs: 240`: öncelikli olaylar sınırdan muaf kalır ama aynı olay 240 ms'den sık çalmaz. Geç savaşta her saldırı çekirdeğe vurduğunda `core_hit` saniyede ~11 kez, ×1,4 kazançla çalıp müziği örtüyordu; artık en fazla ~4 kez.
  - Menü karışımı değişmedi. Cihazda denetlenmeli: kulaklık ve telefon hoparlöründe savaş müziği efektlerin önünde duyulmalı; çekirdek isabeti, yok etme ve uyarı yine seçilmeli.

Bu iki aşamalı yaklaşım asset dosyasındaki tepe seviyesini ve oyuncu volume slider'ından önceki runtime headroom'u ayrı tutar.

### Crossfade
Audio state değişimlerinde varsayılan `450 ms` crossfade kullanılır.

Amaç:
- Menü → Havuz
- Havuz → Matchmaking
- Matchmaking → Battle
- Battle → Critical Core

geçişlerinde ani track kesilmesini azaltmak.

### Kritik Çekirdek katmanı
`critical_core_layer.wav` eklendi.

Oyuncu Çekirdeği `%33` veya altına düştüğünde:
- normal battle pulse korunur,
- üstüne düşük seviyeli heartbeat / electrical pressure katmanı eklenir.

Çekirdek kritik durumdan çıkarsa katman fade-out olur. Maç bittiğinde victory/defeat state'i kritik katmanı kapatır.

### Ayarlar önizleme
Sistem Konsolu içinde:
- `Müziği Önizle`
- `SFX Önizle`

butonları bulunur.

Önizleme mevcut volume/mute tercihlerini kullanır; gameplay mantığını değiştirmez.


---

## 10. Beta.18 Audio Mix V3
- Critical Core katmanı artık yalnız eşik aç/kapa değildir; Yerel AI hit yoğunluğuna göre gain artırabilir.
- Pre-master tarama `AUDIO_LOUDNESS_REPORT.json` içinde peak/RMS olarak tutulur.
- Bu rapor LUFS mastering yerine geçmez; final mastering öncesi teknik kontrol katmanıdır.
- Browser lifecycle testi crossfade ve critical layer yaşam döngüsünü doğrular.


---

## 11. Beta.19 Mastering Hazırlığı

Beta.19 final mastering değildir. Bu paket mastering öncesi teknik kanıt ve kontrol katmanını güçlendirir.

### Yeni analiz
`docs/AUDIO_MASTERING_PREP.json` her WAV asset için:

- peak dBFS,
- RMS loudness proxy dBFS,
- crest factor,
- normalize DC offset,
- süre,
- sample rate,
- final LUFS ölçümü gereksinimi

bilgilerini içerir.

RMS değeri **LUFS değildir**. Final sürümde BS.1770 / EBU R128 uyumlu gerçek integrated loudness ölçümü ayrıca yapılacaktır.

### Critical Core yoğunluk katmanları
Kritik Çekirdek pressure artık üç seviyeye ayrılır:

- `low`
- `medium`
- `high`

Pressure yükseldikçe critical layer gain ve çok hafif playback-rate değişimi uygulanabilir. Amaç savaş baskısını artırmak; oynanış zamanlamasını değiştirmek değildir.


---

## 12. Beta.20 Opsiyonel BS.1770 / EBU R128 Tarama

`tools/audio_lufs_scan.py` ortamda `ffmpeg` ve `ebur128` filtresi varsa gerçek loudness ölçümü çalıştırır.

Üretilen rapor:

- `docs/AUDIO_BS1770_SCAN.json`

Rapor mümkünse şu metrikleri içerir:

- Integrated loudness (LUFS),
- Loudness Range (LU),
- True Peak (dBFS).

Kural:
- araç yoksa durum `SKIPPED`,
- LUFS değeri tahmin edilmez veya uydurulmaz,
- ölçüm yapılmış olması final mastering tamamlandığı anlamına gelmez,
- `final_mastering_complete=false` korunur.

Beta.20 geliştirme ortamında ffmpeg `ebur128` filtresi bulunduğu için gerçek ölçüm raporu üretilebildi. Bu sonuçlar mastering karar girdisidir; final master değildir.


---

## 13. Beta.21 Mastering Hedefi Ayrımı

Gerçek BS.1770 / EBU R128 ölçümleri artık final mastering hedefinden açıkça ayrılmıştır.

Yeni karar dosyası:

- `docs/AUDIO_MASTERING_TARGET_DECISION.json`

Beta.21 durumunda:

- `mastering_target_selected=false`
- Integrated LUFS hedefi seçilmedi.
- True Peak hedefi seçilmedi.
- Platform mastering profili seçilmedi.
- Otomatik gain/master değişikliği yok.
- `final_mastering_complete=false`.

`AUDIO_BS1770_SCAN.json` yalnız teknik referanstır. Ölçülen LUFS değerleri, hedef LUFS değerleri değildir.

Final mastering hedefi ancak ayrı insan kararıyla belirlenecektir.


---

## 14. Beta.23 Audio Mix V4

Kullanıcı testinde yaklaşık 10 saniyelik belirgin tekrar ve tek-enstrüman hissi raporlandı. Beta.23 bu geri bildirime göre yeni prototip set kullanır:

- `menu_pulse_v4.wav` — 32 sn stereo,
- `pool_pulse_v4.wav` — 32 sn stereo,
- `battle_pulse_v4.wav` — 32 sn stereo,
- `critical_core_layer_v4.wav` — 32 sn stereo.

Katmanlar bass + pad + pulse + accent bileşenlerinden oluşur. BPM değerleri 32 saniyelik loop sınırına tam bar/beat çevrimleri gelecek şekilde seçildi; loop sonu ile başlangıç arasındaki örnek farkı otomatik testte düşük tutulur.

Music state geçiş crossfade süresi `1200 ms` olmuştur. Amaç track değiştirme ve state geçişini daha az fark edilir yapmak; final mix/mastering değildir.

---

## 15. Beta.25 Shard Pulse / Mix V5

Beta.25, GRIDSHARD'a ait tekrar üretilebilir bir müzik imzasını çalışma zamanına bağlar:

- ortak `3+3+2` kapı ritmi,
- `D–A–C–F` Shard motifi,
- obsidyen/mint Shardglass görsel kimliğiyle eşleşen camsı transient + manyetik bass,
- menü, hazırlık, savaş ve kritik Çekirdek için ayrı 32 saniyelik stereo katman,
- tüm ana müzik dosyalarında yaklaşık `-6 dBFS` peak headroom,
- mevcut `1200 ms` crossfade korunur.

V5 dosyaları:

- `menu_shardglass_v5.wav`
- `pool_flux_v5.wav`
- `battle_fracture_v5.wav`
- `critical_shard_v5.wav`

Deterministik kaynak: `tools/generate_beta25_audio.py`.

Bu aşama özgün kompozisyon/miks kimliği sağlar; hedef LUFS ve platform mastering kararı değildir.

---

## 16. Beta.28 Menü Ensemble / Mix V6

Kullanıcı denemesinde galibiyet müziğinin çok katmanlı düzenlemesi olumlu, menü ve hazırlık parçalarının tek vuruşlu hissi yetersiz bulundu. Beta.28 bu iki durumu V6 ensemble düzenlemelerine taşır:

- `menu_ensemble_v6.wav` — 32 sn stereo,
- `pool_ensemble_v6.wav` — 32 sn stereo,
- chord pad, bass, reactor kick, clap, hi-hat, glass arpeggio ve synth lead katmanları,
- yaklaşık `-6 dBFS` peak headroom ve test edilen loop sınırı,
- savaş V5 katmanları, özgün ateş SFX'leri ve galibiyet/mağlubiyet parçaları korunur.

Deterministik kaynak: `tools/generate_beta28_menu_audio.py`. Bu düzenleme de final LUFS/platform master kararı iddiası taşımaz.

---

## 17. Beta.31 Yedi Katmanlı Savaş Gerilimi / Mix V7

Savaş müziği artık tek stereo düzenleme yerine aynı `128 BPM / 32 sn` zaman tabanını paylaşan yedi özgün stem olarak çalar:

- `battle_tension_v7_01_sub.wav` — düşük frekans omurgası,
- `battle_tension_v7_02_pulse.wav` — kapılı reaktör darbesi,
- `battle_tension_v7_03_percussion.wav` — kick, metal snare ve sayaç,
- `battle_tension_v7_04_ostinato.wav` — minör onaltılık motor,
- `battle_tension_v7_05_shards.wav` — camsı üst frekans karşı ritmi,
- `battle_tension_v7_06_dissonance.wav` — minör ikili/triton gerilim yatağı,
- `battle_tension_v7_07_pressure.wav` — kritik baskıda açılan siren ve kalp katmanı.

Stem'ler ayrı ayrı düşük headroom seviyesinde tutulur; çalışma zamanı miksi savaş baskısına göre kazançlarını değiştirir. Bu yaklaşım yedi dosyanın toplamında güvenli boşluk bırakır, ancak final LUFS/True Peak mastering kararı değildir.

Deterministik kaynak: `tools/generate_beta31_battle_audio.py`.

## 18. Beta.32 Kesintisiz Menü / Hazırlık Döngüsü

Ana Menü ile hazırlık ekranı artık aynı 32 saniyelik ve 52 BPM'lik zaman ızgarasını paylaşır. Ekran geçişi yeni parçayı eski parçanın fazından başlatır; böylece iki farklı ritim üst üste binip hızlanma veya takılma algısı üretmez. Çalışma zamanı aynı ses elemanı üzerindeki eski fade zamanlayıcısını yeni geçişten önce iptal eder.

V6 WAV üretiminde başlangıç ve bitişi sessizliğe çeken pencere kaldırılmıştır. Frekanslar 32 saniyelik döngüye kuantalanır ve kısa dikiş bölgesi son örneği ilk örneğe taşır. Bu nedenle parçanın yeniden başlamasında dijital sessizlik boşluğu yoktur. Deterministik kaynak: `tools/generate_beta28_menu_audio.py`.

## 19. Beta.71 Mobil Ses Biçimleri ve Savaş Katmanları

Kanonik kaynak `client/assets/audio/*.wav` olarak kalır. `tools/encode_mobile_audio.py` (ffmpeg gerekir) her WAV için `client/assets/audio/mobile/` altında OGG Vorbis ve AAC (`.m4a`) türevi üretir, `mobile/manifest.json` içine kaynak SHA-256 değerini yazar ve çalışma zamanı listesini `client/src/gridshard-audio-formats.js` dosyasına işler. `--check` kaynak/türev uyumunu denetler.

- İstemci `canPlayType` ile önce OGG Vorbis (`probably`), sonra AAC dener. Yalnız manifestte listelenen türev kullanılır; türev yüklenemez veya çözülemezse aynı ses kanonik WAV ile yeniden denenir.
- Üretim paketleri (`pnpm build:web` ve `pnpm build:mobile:web`, bkz. `docs/CLIENT_BUILD.md`), iki türevi de doğrulanan WAV'ları pakete almaz. WAV türevinden yeniyse veya türev eksik/bozuksa paket üretimi durur. `GRIDSHARD_MOBILE_KEEP_WAV=1` WAV'ları korur; bu durumda türev çözülemezse WAV yedeği pakette kalır. Geliştirme sunucusu (`client/`) WAV'ları her zaman sunar.
- Savaş müziği (`GRIDSHARD_BATTLE_MUSIC_ENABLED`) açıldı. Web Audio varken yedi stem önce çözülür ve aynı bağlam zamanında başlatılır; HTML ses öğesi yedeğinde senkron garanti edilmez. iOS'ta HTML `volume` yok sayıldığı için katman miksi yalnız Web Audio yolunda duyulur.
- Durumlar aynı dosyayı paylaşmaz: `battle_intro` sub/pulse/percussion, `battle` +ostinato/shards, `battle_pressure` +dissonance, `critical_core` +pressure stem'lerini açar. Baskı değeri etkin küme içindeki kazançları değiştirir.
- `navigator.deviceMemory <= 2` bildiren cihazlarda çözülmüş PCM bütçesini düşürmek için yalnız sub/pulse/percussion/pressure stem'leri yüklenir.
- AAC kodlayıcı gecikmesini ffmpeg MP4 edit list ile işaretler; 32 sn döngü dikişinin iOS'ta duyulmadığı gerçek cihazda doğrulanmalıdır.

## 20. Menü Çalma Listesi (Ekim 2026)

Oyuncular menü müziğinin sürekli aynı melodiyi tekrar ettiğini bildirdi. Kök neden dosya uzunluğu değil içeriktir: V6 menü parçasında melodi sekiz notalık tek cümledir (4,9 sn) ve hiç susmaz; akor dizisi 9,8 saniyede döner; davul her ölçüde aynıdır. Beta.23'te döngü 10 saniyeden 32 saniyeye uzatılmış ama içindeki müzik aynı kısalıkta kalmıştı.

Çalışma zamanı (`client/src/gridshard-audio.js`):

- `GRIDSHARD_MENU_PLAYLIST` menü durumunda çalınacak parçaları sıralar. Tek parça varsa eski davranış aynen sürer: Web Audio ile kesintisiz döngü.
- Birden çok parça varsa ilk parça rastgele seçilir, sonra sıra döner; aynı parça art arda gelmez. Parça bitmeden `playlistCrossfadeMs` (2400 ms) kala sıradakine yumuşak geçilir. Eşleşme, savaş ya da sonuç ekranından menüye her dönüşte sıradaki parça baştan başlar.
- Uygulama arka plandan dönünce ya da Hazırlık ekranından menüye geçilince aynı parça kaldığı yerden sürer. Hazırlık ekranında parçanın sonu geçildiyse liste o arada ilerlemiş sayılır; faz yine korunur.
- Uzun parçalar belleğe açılmaz, HTML ses öğesiyle akıtılır: 128 saniyelik stereo bir parça Web Audio'da çözülünce yaklaşık 49 MB tutar. HTML ses seviyesi ayarlanamayan ortamda (iOS) Web Audio yolu kullanılır; orada çalmayan parçaların çözülmüş verisi bırakılır, savaşa girerken hepsi bırakılır.
- Parçalar menü ızgarasını paylaşmalıdır: 32 saniyede 52 vuruş (97,5 BPM) ve 32 saniyenin katı süre. Menü ↔ Hazırlık geçişi fazı bu ızgarayla korur.

Parçalar (`tools/generate_menu_playlist_audio.py`; ses yapı taşları `tools/menu_playlist_synth.py`; yalnız standart kitaplık, çıktı deterministik):

| Dosya | Ad | Karakter |
| --- | --- | --- |
| `menu_v8_01_durgun_devre.wav` | Durgun Devre | Ped, cam arpej, çan ve yumuşak lead; dingin |
| `menu_v8_02_akim_hatti.wav` | Akım Hattı | Süzgeçli testere bas dizisi, elektro davul, güç akoru vuruşları, kayan lead; Re–Do–Si♭–La döngüsü |
| `menu_v8_03_cekirdek_odasi.wav` | Çekirdek Odası | Yarı tempolu, karanlık; kapılı reaktör darbesi, onaltılık minör motor, sonar ve veri akışı, Re–Mi♭ gerilimi |

- Her parça 128 sn (52 ölçü, 208 vuruş), stereo, 22.050 Hz. Bölümler: giriş 0:00, birinci ana bölüm 0:20, ara 0:49, ikinci ana bölüm 1:09, çıkış 1:48. Melodi aralarda susar ve her gelişinde farklı bir cümle çalar; çıkış girişe kesintisiz bağlanır.
- Ortalama seviye üçünde de eski menü döngüsüyle aynıdır (RMS −22,6 dBFS; tepe −6 dBFS'nin altında): oyun bütün parçaları aynı kazançla çalar.
- Elektronik iki parça savaş müziğinin ses sözlüğünü (§17) menü temposuna taşır. Kullanıcı geri bildirimi (5 Ekim 2026): dingin parça "fazla dinlendirici" bulundu; oyunun dünyasına ait, daha elektrikli ve elektronik müzik isteniyor. Üç parça da listede kaldı; yeni parçalar bu yönde üretilmelidir.
- `menu_ensemble_v6.wav` listeden çıktı. Dosya ve üreticisi depoda durur ama pakete girmez. Hazırlık ekranı `pool_ensemble_v6.wav` ile çalmayı sürdürür (eski melodinin çeşitlemesi).
- Paket etkisi: üç parça OGG olarak 3,0 MB, AAC olarak 6,4 MB tutar; eski döngü çıkınca net artış 8,7 MB'tır (paketteki ses toplamı 4,3 MB OGG + 10,7 MB AAC). Android yalnız OGG çalar; AAC dosyaları iOS/Safari içindir. Kaynak WAV'lar depoya 32 MB ekler, pakete girmez.

Yeni parça eklemek: üreticiye düzenleme ve `TRACKS` kaydı eklenir; `python tools/generate_menu_playlist_audio.py <ad>` ile üretilir; dosya `GRIDSHARD_MENU_PLAYLIST` listesine yazılır; `python tools/encode_mobile_audio.py` türevleri üretir (ffmpeg gerekir). Listeyi, dosyaları ve türevleri `server/tests/test_menu_playlist_audio.py` ile `client/tests/gridshard-audio-menu-playlist.test.js` denetler.

Doğrulama (5 Ekim 2026): masaüstü Chrome'da telefon boyutunda, oyunun kendisiyle denendi: OGG türevinden akıtma, ekranlar arasında kesintisiz çalma, parça sonunda geçiş, arka plandan dönüş, savaştan dönüşte sıradaki parça. Android WebView'da gerçek cihazda henüz dinlenmedi; menü müziği orada ilk kez ses öğesiyle akıtılacak (önceden Web Audio döngüsüydü).
