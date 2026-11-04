# GRIDSHARD — mobil ses hattı

Kaynak WAV asılları `client/assets/audio/`; OGG/AAC türevleri aynı dizinin
`mobile/` altındadır; `modules/` alt klasörü iki biçimde de korunur. `tools/encode_mobile_audio.py` türevleri ve istemci biçim
listesini üretir. `tools/build-client.js` üretim derlemesinde kullanılan
kimlikleri ve kaynak/türev özetlerini doğrular; türevi doğrulanan kaynak WAV'lar üretim web/mobil paketine taşınmaz.

Güncel ses sayısı ve boyut için manifest esas alınır; eski 28 seslik tablo geçerli değildir.
`client/src/gridshard-audio-formats.js` desteklenen biçimleri,
`client/src/gridshard-audio.js` decode ve fallback davranışını belirler.
Kaynak geliştirme yolundaki WAV fallback'i paket içinde WAV bulunduğu anlamına gelmez;
web/mobil üretim kabulü dağıtılan OGG/AAC dosyalarıyla yapılır. Web Audio çözümlemesinde
seçilen biçim başarısızsa paketlenmiş diğer biçim, ardından geliştirme WAV'ı denenir.

Savaş miksleri `client/src/audio-mix.js`, yaşam döngüsü ve ses tercihleri ses
yöneticisindedir. Mevcut ses kaynak/biçim/voice-limit/lifecycle testleri korunur.
2.4.0 cızırtı, saldırı ve çekirdek ses kabulü
[sürüm briefine](planning/releases/2.4.0.md) bağlıdır.
