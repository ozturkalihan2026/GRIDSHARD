# 2.4.0 / AUDIO-02 — çekirdek ses matrisi

Yerel kaynak/bağlantı ölçümüdür; fiziksel Android dinleme kabulü değildir. Kullanıcı bu turda yerel kontrollerle ilerlenmesini istedi.

[Ölçümler](release-240-audio-measurements.json) · [Gezinme kabulü](release-240-navigation-matrix.md) · [2.4.0 briefi](releases/2.4.0.md)

Üretim: `python tools/report_combat_audio.py --write`; CI tutarlılığı: `--check`. OGG/AAC kaynak ve türev hash’leri denetlenir. Mobil çözümlemede diğer paketlenmiş biçim WAV’dan önce denenir.

Yedi çekirdek aktivasyonu ve altı gerçek saldırı ailesi sunucu olaylarından duyulur. Takviye çekirdeğinin `shot` dosyası uyumluluk için vardır; takviye mekaniğine yapay atış eklenmedi. Görsel ankraj bulunamasa da gerçek olayın sesi çalışır; snapshot tekrarından ses üretilmez.

| Çekirdek / tür | Olay | Cue / WAV | Süre | Tepe | RMS | En büyük örnek adımı |
| --- | --- | --- | --- | --- | --- | --- |
| core_resonance / activate | core_power_used | `core_resonance_activate` | 0.6 s | 0.370483 | 0.129996 | 0.038849 |
| core_resonance / shot | attack_performed/core_attack | `core_resonance_shot` | 0.24998 s | 0.304779 | 0.104997 | 0.030121 |
| core_guardian / activate | core_power_used | `core_guardian_activate` | 0.48 s | 0.325439 | 0.129996 | 0.023468 |
| core_guardian / shot | attack_performed/core_attack | `core_guardian_shot` | 0.20998 s | 0.268738 | 0.104997 | 0.020416 |
| core_overdrive / activate | core_power_used | `core_overdrive_activate` | 0.54 s | 0.371796 | 0.129996 | 0.038269 |
| core_overdrive / shot | attack_performed/core_attack | `core_overdrive_shot` | 0.2 s | 0.288025 | 0.104997 | 0.03183 |
| core_disruptor / activate | core_power_used | `core_disruptor_activate` | 0.56 s | 0.316772 | 0.129996 | 0.035065 |
| core_disruptor / shot | attack_performed/core_attack | `core_disruptor_shot` | 0.23002 s | 0.262573 | 0.104997 | 0.030121 |
| core_capacitor / activate | core_power_used | `core_capacitor_activate` | 0.62 s | 0.327271 | 0.129996 | 0.055359 |
| core_capacitor / shot | not_used_by_current_reinforcement_mechanic | `core_capacitor_shot` | 0.24 s | 0.268219 | 0.104997 | 0.040527 |
| core_phoenix / activate | core_power_used | `core_phoenix_activate` | 0.64 s | 0.379974 | 0.127207 | 0.040283 |
| core_phoenix / shot | attack_performed/core_attack | `core_phoenix_shot` | 0.26 s | 0.319855 | 0.104997 | 0.032806 |
| core_quantum / activate | core_power_used | `core_quantum_activate` | 0.6 s | 0.338196 | 0.129996 | 0.039062 |
| core_quantum / shot | attack_performed/core_attack | `core_quantum_shot` | 0.27002 s | 0.277283 | 0.104997 | 0.033417 |

Kondansatör örneğinde nota sınırında `f*t` faz sıçraması kaldırıldı; faz her örnekte biriktirilir. En büyük komşu örnek farkı aktivasyonda 0,1431’den 0,05536’ya, kısa etkide 0,1868’den 0,04053’e indi. Aktivasyonlar 0,48–0,64 s, kısa etki örnekleri 0,20–0,27 s. Sürekli gürültü katmanı yoktur; yumuşak giriş/çıkış ve tek doğrusal normalizasyon kullanılır. Ham kaynaklarda sert kırpma yoktur.

Üç rutin ses / 420 ms bütçesi, öncelikli çekirdek ve tekrar aralıkları korunur. `triggerCue.played` kabulü, `playback` gerçek başlatma sonucunu gösterir; `suppression` sessiz/etkin olmayan durumla voice-limit bastırmasını ayırır. Her eşzamanlı olayı ayrı sesle çalmak vaat edilmez.

Yerel doğrulama: kaynak/codec hash ve PCM sınır testleri, gerçek Chrome OGG/AAC decode ve WAV bulunmayan paket fallback’i, mute/düşük ses/arka plan ve re-render tekilliği. Dört saniyelik yoğun savaş/müzik çevriminde yerel Chromium ve Android öykünmesi 0,782059 tepe ve sıfır kırpılan örnek verdi. Windows WebKit ikilisinde AudioContext bulunmadığından bu yerel ses senaryosu atlanır; macOS WebKit CI kapısı açıktır. Gerçek hoparlör/kulaklık dinlemesi kullanıcı tarafından sonraya bırakıldı; cızırtının fiziksel cihazda duyulmadığına dair kabul verilmedi.
