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

### Port bağlantısı
`mekanik klik → elektrik kilidi → kısa enerji pulse`

### Enerji transferi
kısa dijital akım; sürekli uğultu yapılmaz.

### Jeneratör kapı değişimi
manyetik kilit açılması + yön değiştiren elektrik sesi.

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
- Runtime SFX base gain: `0.86`

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
