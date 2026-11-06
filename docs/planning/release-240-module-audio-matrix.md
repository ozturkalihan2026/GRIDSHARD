# 2.4.0 / AUDIO-01 — modül ses matrisi

Kaynak/bağlantı ve telefon bandı ölçümüdür; fiziksel Android dinleme kabulü değildir. 6 Kasım fiziksel testinde v19 efektleri müzik altında duyulmadı, müziksiz çok kısık duyuldu. v20 ile duyulabilirlik kullanıcı tarafından doğrulandı; müzik dengesi ve çekirdeğin karakteri yetersiz bulundu. v21 görev temalı yeni ses ailesidir; yeni fiziksel kabul henüz verilmedi.

[Ölçümler](release-240-audio-measurements.json) · [Gezinme kabulü](release-240-navigation-matrix.md) · [2.4.0 briefi](releases/2.4.0.md)

Üretim: `python tools/report_combat_audio.py --write`; CI tutarlılığı: `--check`. OGG/AAC kaynak ve türev hash’leri denetlenir. Mobil çözümlemede diğer paketlenmiş biçim WAV’dan önce denenir.

Aktif 24 modülün on saldırı ailesi `attack_performed` üzerinden gerçek `weaponCue` seçimiyle çözülür. Diğer on dört modülün savunma/onarım/arındırma/EMP/Akım olayları aynı mevcut VFX sahibinde kalır. Hasar veren echo/followup/dot olaylarının sesi module-vfx tarafından bir kez verilir; ikinci bir atış başlatılmaz.

| Modül | Sınıf | Cue | Kaynak WAV | Süre | Tepe | Cue sonrası RMS | Mobil |
| --- | --- | --- | --- | --- | --- | --- | --- |
| laser | saldırı | `laser_fire` | `./assets/audio/laser_pulse_v2.wav` | 0.24 s | 0.193024 | 0.064351 | OGG/AAC |
| shield | savunma | `module_shield` | `./assets/audio/modules/shield.wav` | 0.24 s | 0.158813 | 0.033918 | OGG/AAC |
| amplifier | taktik | `amplifier_charge` | `./assets/audio/modules/amplifier.wav` | 0.26 s | 0.116791 | 0.01819 | OGG/AAC |
| emp | taktik | `emp` | `./assets/audio/emp.wav` | 0.28 s | 0.168365 | 0.021051 | OGG/AAC |
| repair | taktik | `repair_beam` | `./assets/audio/repair_beam.wav` | 0.42 s | 0.110443 | 0.019482 | OGG/AAC |
| armor | savunma | `module_armor` | `./assets/audio/modules/armor.wav` | 0.19002 s | 0.20285 | 0.030553 | OGG/AAC |
| pulse_cannon | saldırı | `pulse_cannon_fire` | `./assets/audio/pulse_cannon_fire.wav` | 0.27002 s | 0.22052 | 0.05233 | OGG/AAC |
| missile_launcher | saldırı | `missile_fire` | `./assets/audio/rocket_launch.wav` | 0.34 s | 0.193787 | 0.051054 | OGG/AAC |
| barrier | savunma | `module_barrier` | `./assets/audio/modules/barrier.wav` | 0.22 s | 0.184601 | 0.032269 | OGG/AAC |
| arc_cannon | saldırı | `module_arc_cannon` | `./assets/audio/modules/arc_cannon.wav` | 0.24998 s | 0.210327 | 0.058889 | OGG/AAC |
| drone_bay | saldırı | `module_drone_bay` | `./assets/audio/modules/drone_bay.wav` | 0.36 s | 0.221802 | 0.049633 | OGG/AAC |
| railgun | saldırı | `module_railgun` | `./assets/audio/modules/railgun.wav` | 0.2 s | 0.2211 | 0.058101 | OGG/AAC |
| reflector | savunma | `module_reflector` | `./assets/audio/modules/reflector.wav` | 0.18 s | 0.154236 | 0.032023 | OGG/AAC |
| virus | taktik | `module_virus` | `./assets/audio/modules/virus.wav` | 0.3 s | 0.175537 | 0.025145 | OGG/AAC |
| plasma_mortar | saldırı | `module_plasma_mortar` | `./assets/audio/modules/plasma_mortar.wav` | 0.42 s | 0.212738 | 0.064987 | OGG/AAC |
| guardian_dome | savunma | `module_guardian_dome` | `./assets/audio/modules/guardian_dome.wav` | 0.26 s | 0.158234 | 0.033964 | OGG/AAC |
| quantum_repeater | saldırı | `module_quantum_repeater` | `./assets/audio/modules/quantum_repeater.wav` | 0.22 s | 0.208282 | 0.050606 | OGG/AAC |
| phase_armor | savunma | `module_phase_armor` | `./assets/audio/modules/phase_armor.wav` | 0.24998 s | 0.140015 | 0.030469 | OGG/AAC |
| burst_cannon | saldırı | `module_burst_cannon` | `./assets/audio/modules/burst_cannon.wav` | 0.15002 s | 0.218536 | 0.056435 | OGG/AAC |
| shield_breaker | saldırı | `module_shield_breaker` | `./assets/audio/modules/shield_breaker.wav` | 0.22 s | 0.216309 | 0.062627 | OGG/AAC |
| buffer_shield | savunma | `module_buffer_shield` | `./assets/audio/modules/buffer_shield.wav` | 0.24 s | 0.160553 | 0.030509 | OGG/AAC |
| last_bastion | savunma | `module_last_bastion` | `./assets/audio/modules/last_bastion.wav` | 0.22 s | 0.183502 | 0.033963 | OGG/AAC |
| cleanser | taktik | `module_cleanser` | `./assets/audio/modules/cleanser.wav` | 0.28 s | 0.112183 | 0.019441 | OGG/AAC |
| speed_relay | taktik | `module_speed_relay` | `./assets/audio/modules/speed_relay.wav` | 0.24 s | 0.12146 | 0.018158 | OGG/AAC |

Özellikle Railgun, Ark Topu, Dron, Plazma Havan, Kuantum Tekrarlayıcı, Seri Top ve Kalkan Kırıcı örnekleri kısa, fazı sürekli ve eşit RMS hedefiyle üretildi. Darbe Topu kaynağı da aynı üreticiye bağlıdır. v21 bütün 24 modülü göreve göre yeniden yazar: silah boşalır, savunma emer/kilitlenir, destek onarır/yönlendirir. Kalkan ve Zırh aynı isabet sesi kullanmaz. Güçlendirici artık UI Akım sesini paylaşmaz. Lazer kısa tek atış olarak kalır.

v21: savaş efekt çarpanı 0,70, savaş müzik çarpanı 2,35; v20’ye göre müzik geri alınır ve rutin efektler biraz geriye çekilir. Müzik dosyaları, menü/sonuç müziği ve kullanıcı sliderları değişmez. Çekirdek aktivasyon/atış trimleri 0,78/0,58; modül trimleri göreve göre ayrıdır. Yeni bankada 24 modül, 14 çekirdek ve altı mevcut yönlendirme kaynağı olmak üzere 44 WAV vardır. JSON içindeki phone_band_rms_ratio üç kademeli 600 Hz yüksek geçiren filtreyle kalan RMS oranıdır; fiziksel SPL ölçümü değildir.

Üç rutin ses / 420 ms bütçesi, öncelikli çekirdek ve tekrar aralıkları korunur. `triggerCue.played` kabulü, `playback` gerçek başlatma sonucunu gösterir; `suppression` sessiz/etkin olmayan durumla voice-limit bastırmasını ayırır. Her eşzamanlı olayı ayrı sesle çalmak vaat edilmez.

Yerel doğrulama: kaynak/codec hash ve PCM sınır testleri, gerçek Chrome OGG/AAC decode ve WAV bulunmayan paket fallback’i, mute/düşük ses/arka plan ve re-render tekilliği. Dört saniyelik yoğun savaş/müzik çevriminin güncel tepe/kırpma kanıtı e2e/battle-audio.spec.js çıktısındaki decoded-mobile-cue-matrix ekinde tutulur; eski v19 tepe ölçümü yeni miksin kabulü değildir. Windows WebKit ikilisinde AudioContext bulunmadığından bu yerel ses senaryosu atlanır; macOS WebKit CI kapısı açıktır. Gerçek hoparlör/kulaklık dinlemesi yeni test paketinden sonra kullanıcıdan beklenir; duyulabilirlik ve cızırtısızlık kabulü verilmedi.
