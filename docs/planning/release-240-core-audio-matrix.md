# 2.4.0 / AUDIO-02 — çekirdek ses matrisi

Kaynak/bağlantı ve telefon bandı ölçümüdür; fiziksel Android dinleme kabulü değildir. 6 Kasım fiziksel testinde v19 efektleri müzik altında duyulmadı, müziksiz çok kısık duyuldu. v20 ile duyulabilirlik kullanıcı tarafından doğrulandı; müzik dengesi ve çekirdeğin karakteri yetersiz bulundu. v21 görev temalı yeni ses ailesidir; yeni fiziksel kabul henüz verilmedi.

[Ölçümler](release-240-audio-measurements.json) · [Gezinme kabulü](release-240-navigation-matrix.md) · [2.4.0 briefi](releases/2.4.0.md)

Üretim: `python tools/report_combat_audio.py --write`; CI tutarlılığı: `--check`. OGG/AAC kaynak ve türev hash’leri denetlenir. Mobil çözümlemede diğer paketlenmiş biçim WAV’dan önce denenir.

Yedi çekirdek aktivasyonu ve altı gerçek saldırı ailesi sunucu olaylarından duyulur. Takviye çekirdeğinin `shot` dosyası uyumluluk için vardır; takviye mekaniğine yapay atış eklenmedi. Görsel ankraj bulunamasa da gerçek olayın sesi çalışır; snapshot tekrarından ses üretilmez.

| Çekirdek / tür | Olay | Cue / WAV | Süre | Tepe | RMS | En büyük örnek adımı |
| --- | --- | --- | --- | --- | --- | --- |
| core_resonance / activate | core_power_used | `core_resonance_activate` | 1.04998 s | 0.262939 | 0.128582 | 0.083832 |
| core_resonance / shot | attack_performed/core_attack | `core_resonance_shot` | 0.3 s | 0.199921 | 0.099539 | 0.0802 |
| core_guardian / activate | core_power_used | `core_guardian_activate` | 0.95002 s | 0.264282 | 0.128632 | 0.083862 |
| core_guardian / shot | attack_performed/core_attack | `core_guardian_shot` | 0.24 s | 0.208527 | 0.099491 | 0.080536 |
| core_overdrive / activate | core_power_used | `core_overdrive_activate` | 0.9 s | 0.260132 | 0.128216 | 0.083893 |
| core_overdrive / shot | attack_performed/core_attack | `core_overdrive_shot` | 0.23002 s | 0.203949 | 0.099228 | 0.082794 |
| core_disruptor / activate | core_power_used | `core_disruptor_activate` | 1.0 s | 0.261108 | 0.12773 | 0.083923 |
| core_disruptor / shot | attack_performed/core_attack | `core_disruptor_shot` | 0.28 s | 0.203857 | 0.099049 | 0.08252 |
| core_capacitor / activate | core_power_used | `core_capacitor_activate` | 1.04998 s | 0.242401 | 0.128979 | 0.083588 |
| core_capacitor / shot | not_used_by_current_reinforcement_mechanic | `core_capacitor_shot` | 0.27002 s | 0.189667 | 0.09964 | 0.075134 |
| core_phoenix / activate | core_power_used | `core_phoenix_activate` | 1.08 s | 0.259705 | 0.128809 | 0.083893 |
| core_phoenix / shot | attack_performed/core_attack | `core_phoenix_shot` | 0.32 s | 0.198883 | 0.099505 | 0.07962 |
| core_quantum / activate | core_power_used | `core_quantum_activate` | 1.0 s | 0.253296 | 0.128132 | 0.083832 |
| core_quantum / shot | attack_performed/core_attack | `core_quantum_shot` | 0.3 s | 0.195892 | 0.099163 | 0.080994 |

Katmanlar zamanla sürekli faz kullanır; nota sınırı veya sert kesme üretilmez. Güncel en büyük örnek farkları yukarıdaki tabloda ölçülür; kesintisiz faz ve yumuşak sınırlar korunur. v21 aktivasyonları 0,90–1,08 s; kısa etki örnekleri 0,23–0,32 s. D/A açık beşli enerji toplanması, fiziksel boşalma ve kısa kristal kuyruk ortak imzadır; yedi güç kendi dalga/kilit/alev/işaret/çağrı/onarım/yarık dokusunu taşır. Yumuşak crest/slew denetimi, sıfır sınır ve DC düzeltmesi kullanılır; sert kırpma yoktur.

v21: savaş efekt çarpanı 0,70, savaş müzik çarpanı 2,35; v20’ye göre müzik geri alınır ve rutin efektler biraz geriye çekilir. Müzik dosyaları, menü/sonuç müziği ve kullanıcı sliderları değişmez. Çekirdek aktivasyon/atış trimleri 0,78/0,58; modül trimleri göreve göre ayrıdır. Yeni bankada 24 modül, 14 çekirdek ve altı mevcut yönlendirme kaynağı olmak üzere 44 WAV vardır. JSON içindeki phone_band_rms_ratio üç kademeli 600 Hz yüksek geçiren filtreyle kalan RMS oranıdır; fiziksel SPL ölçümü değildir.

Üç rutin ses / 420 ms bütçesi, öncelikli çekirdek ve tekrar aralıkları korunur. `triggerCue.played` kabulü, `playback` gerçek başlatma sonucunu gösterir; `suppression` sessiz/etkin olmayan durumla voice-limit bastırmasını ayırır. Her eşzamanlı olayı ayrı sesle çalmak vaat edilmez.

Yerel doğrulama: kaynak/codec hash ve PCM sınır testleri, gerçek Chrome OGG/AAC decode ve WAV bulunmayan paket fallback’i, mute/düşük ses/arka plan ve re-render tekilliği. Dört saniyelik yoğun savaş/müzik çevriminin güncel tepe/kırpma kanıtı e2e/battle-audio.spec.js çıktısındaki decoded-mobile-cue-matrix ekinde tutulur; eski v19 tepe ölçümü yeni miksin kabulü değildir. Windows WebKit ikilisinde AudioContext bulunmadığından bu yerel ses senaryosu atlanır; macOS WebKit CI kapısı açıktır. Gerçek hoparlör/kulaklık dinlemesi yeni test paketinden sonra kullanıcıdan beklenir; duyulabilirlik ve cızırtısızlık kabulü verilmedi.
