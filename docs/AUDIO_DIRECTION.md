# GRIDSHARD — güncel ses yönü ve kabul

4 Kasım 2026. Eski prototip tempo, gain ve ses sayısı tabloları kaldırıldı.
Çalışan miks/cue değerleri `client/src/gridshard-audio.js` ve `client/src/audio-mix.js`
içindedir; bu belge eski sayısal ayarları tekrar uygulama talimatı değildir.

- Ses, taktik olayları anlaşılır kılar; müzik ve tekrar eden saldırılar birbirini örtmez.
- Atış/isabet/özel etki ile çekirdek aktivasyonu ayırt edilebilir; sürekli cızırtı kabul edilmez.
- Ses tercihi, düşük seviye, mute, arka plan dönüşü, voice-limit ve tekrar event koruması korunur.
- Kaynak WAV, cue bağlantısı ve mobil türev ayrı doğrulanır; dosyanın varlığı sesi duyulmuş yapmaz.

2.4.0 zorunlu işleri AUDIO-01 ve AUDIO-02'dir. Event/VFX/cue/dosya/mobil/duyulma
matrisi, ham dosya ve miks karşılaştırması, clip/DC/click/decode incelemesi ve gerçek
Android hoparlör/kulaklık kabulü [2.4 briefindedir](planning/releases/2.4.0.md).

[Mobil ses hattı](MOBILE_AUDIO.md), `tools/audio_lufs_scan.py`,
`tools/encode_mobile_audio.py` ve aktif istemci ses regresyonları kullanılır.
