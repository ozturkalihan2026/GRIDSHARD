# 2.4.0 / AUDIO-01 — modül ses matrisi

Yerel kaynak/bağlantı ölçümüdür; fiziksel Android dinleme kabulü değildir. Kullanıcı bu turda yerel kontrollerle ilerlenmesini istedi.

[Ölçümler](release-240-audio-measurements.json) · [Gezinme kabulü](release-240-navigation-matrix.md) · [2.4.0 briefi](releases/2.4.0.md)

Üretim: `python tools/report_combat_audio.py --write`; CI tutarlılığı: `--check`. OGG/AAC kaynak ve türev hash’leri denetlenir. Mobil çözümlemede diğer paketlenmiş biçim WAV’dan önce denenir.

Aktif 24 modülün on saldırı ailesi `attack_performed` üzerinden gerçek `weaponCue` seçimiyle çözülür. Diğer on dört modülün savunma/onarım/arındırma/EMP/Akım olayları aynı mevcut VFX sahibinde kalır. Hasar veren echo/followup/dot olaylarının sesi module-vfx tarafından bir kez verilir; ikinci bir atış başlatılmaz.

| Modül | Sınıf | Cue | Kaynak WAV | Süre | Tepe | Cue sonrası RMS | Mobil |
| --- | --- | --- | --- | --- | --- | --- | --- |
| laser | saldırı | `laser_fire` | `./assets/audio/laser_pulse_v2.wav` | 0.24 s | 0.259979 | 0.066871 | OGG/AAC |
| shield | savunma | `shield_absorb` | `./assets/audio/shield_absorb.wav` | 0.3 s | 0.459991 | 0.032838 | OGG/AAC |
| amplifier | taktik | `amplifier_charge` | `./assets/audio/energy_transfer.wav` | 0.42 s | 0.707916 | 0.02095 | OGG/AAC |
| emp | taktik | `emp` | `./assets/audio/emp.wav` | 0.58 s | 0.707916 | 0.014617 | OGG/AAC |
| repair | taktik | `repair_beam` | `./assets/audio/repair_beam.wav` | 0.42 s | 0.244751 | 0.031234 | OGG/AAC |
| armor | savunma | `shield_absorb` | `./assets/audio/shield_absorb.wav` | 0.3 s | 0.459991 | 0.032838 | OGG/AAC |
| pulse_cannon | saldırı | `pulse_cannon_fire` | `./assets/audio/pulse_cannon_fire.wav` | 0.27002 s | 0.332977 | 0.052498 | OGG/AAC |
| missile_launcher | saldırı | `missile_fire` | `./assets/audio/rocket_launch.wav` | 0.34 s | 0.459991 | 0.063888 | OGG/AAC |
| barrier | savunma | `module_barrier` | `./assets/audio/modules/barrier.wav` | 0.22 s | 0.11087 | 0.019963 | OGG/AAC |
| arc_cannon | saldırı | `module_arc_cannon` | `./assets/audio/modules/arc_cannon.wav` | 0.24998 s | 0.259888 | 0.052498 | OGG/AAC |
| drone_bay | saldırı | `module_drone_bay` | `./assets/audio/modules/drone_bay.wav` | 0.36 s | 0.272125 | 0.052498 | OGG/AAC |
| railgun | saldırı | `module_railgun` | `./assets/audio/modules/railgun.wav` | 0.2 s | 0.253387 | 0.052498 | OGG/AAC |
| reflector | savunma | `module_reflector` | `./assets/audio/modules/reflector.wav` | 0.18 s | 0.114746 | 0.019367 | OGG/AAC |
| virus | taktik | `module_virus` | `./assets/audio/modules/virus.wav` | 0.3 s | 0.115967 | 0.012582 | OGG/AAC |
| plasma_mortar | saldırı | `module_plasma_mortar` | `./assets/audio/modules/plasma_mortar.wav` | 0.42 s | 0.281799 | 0.052498 | OGG/AAC |
| guardian_dome | savunma | `module_guardian_dome` | `./assets/audio/modules/guardian_dome.wav` | 0.26 s | 0.108368 | 0.019523 | OGG/AAC |
| quantum_repeater | saldırı | `module_quantum_repeater` | `./assets/audio/modules/quantum_repeater.wav` | 0.22 s | 0.341003 | 0.052498 | OGG/AAC |
| phase_armor | savunma | `module_phase_armor` | `./assets/audio/modules/phase_armor.wav` | 0.24998 s | 0.11441 | 0.019898 | OGG/AAC |
| burst_cannon | saldırı | `module_burst_cannon` | `./assets/audio/modules/burst_cannon.wav` | 0.15002 s | 0.27301 | 0.052498 | OGG/AAC |
| shield_breaker | saldırı | `module_shield_breaker` | `./assets/audio/modules/shield_breaker.wav` | 0.22 s | 0.280396 | 0.052498 | OGG/AAC |
| buffer_shield | savunma | `module_buffer_shield` | `./assets/audio/modules/buffer_shield.wav` | 0.24 s | 0.120605 | 0.01945 | OGG/AAC |
| last_bastion | savunma | `module_last_bastion` | `./assets/audio/modules/last_bastion.wav` | 0.22 s | 0.119873 | 0.019504 | OGG/AAC |
| cleanser | taktik | `module_cleanser` | `./assets/audio/modules/cleanser.wav` | 0.28 s | 0.11142 | 0.019731 | OGG/AAC |
| speed_relay | taktik | `module_speed_relay` | `./assets/audio/modules/speed_relay.wav` | 0.24 s | 0.112274 | 0.019699 | OGG/AAC |

Özellikle Railgun, Ark Topu, Dron, Plazma Havan, Kuantum Tekrarlayıcı, Seri Top ve Kalkan Kırıcı örnekleri kısa, fazı sürekli ve eşit RMS hedefiyle üretildi. Darbe Topu kaynağı da aynı üreticiye bağlıdır. Lazerin onaylı kısa darbesi korunur. Atış/isabet trimleri birbirini bastırmayacak şekilde ayrılır; genel müzik ve SFX kanalını yükseltme yapılmadı.

Üç rutin ses / 420 ms bütçesi, öncelikli çekirdek ve tekrar aralıkları korunur. `triggerCue.played` kabulü, `playback` gerçek başlatma sonucunu gösterir; `suppression` sessiz/etkin olmayan durumla voice-limit bastırmasını ayırır. Her eşzamanlı olayı ayrı sesle çalmak vaat edilmez.

Yerel doğrulama: kaynak/codec hash ve PCM sınır testleri, gerçek Chrome OGG/AAC decode ve WAV bulunmayan paket fallback’i, mute/düşük ses/arka plan ve re-render tekilliği. Dört saniyelik yoğun savaş/müzik çevriminde yerel Chromium ve Android öykünmesi 0,782059 tepe ve sıfır kırpılan örnek verdi. Windows WebKit ikilisinde AudioContext bulunmadığından bu yerel ses senaryosu atlanır; macOS WebKit CI kapısı açıktır. Gerçek hoparlör/kulaklık dinlemesi kullanıcı tarafından sonraya bırakıldı; cızırtının fiziksel cihazda duyulmadığına dair kabul verilmedi.
