# Geri Tepme Topu — aday sesleri

Özgün parametrik sentez: `python tools/generate_recoil_cannon_audio.py`.
Mevcut `combat_sfx_theme_v21` bitirme hattı,22050 Hz mono16 bit WAV.
Harici örnek, eski sesin yeni adla kopyası veya yeni ses yüksekliği ayarı yok.
Atış: ağır gövde + telefon hoparlörü için orta bant metal + iki kısa piston
dönüşü. İsabet: daha kısa metal/gövde darbesi. Ölçümler ve SHA256 yanındaki
`recoil_cannon-audit.json` dosyasında.

İki ses çalışma sayfasında açık düğmeyle çalar. Gerçek savaş AudioDirector
bağlantısı da hazırdır: derlenmiş kart listesinde aday bulunursa atış .58,
isabet .32 trim ile mevcut üç rutin ses sınırını kullanır. Ayrı OGG ve AAC
(MP4 brand) türevleri `mobile/candidates-v1` altındadır;107 kaynak türev kaydı
vardır. Eski105 master/codec hash'i, müzik ve kaydedilmiş tercihler değişmedi.
Bugünkü derlenmiş24'lü kadroda aday cue'ları kaydolmaz ve altı aday ses
dosyası web/native pakete alınmaz. Bu, kartın yayın veya edinim onayı değildir.
Tarayıcı oynatma kabulü fiziksel telefonda duyulabilirlik/tema kabulü değildir.
Yoğun savaşta tekrar yorgunluğu, müzik dengesi ve farklı hoparlörlerde dinleme
CARD-01 yayın kapısında ayrıca doğrulanır.
