# Modül VFX, ses ve 3B sanat geçişi — 19 Ekim 2026

## Tamamlanan

- [x] 36 kanonik modül için merkezi efekt/ses profili: client/src/battle/module-presentation-profiles.js.
- [x] 36 özgün, kısa mono WAV üretildi ve ses yöneticisine bağlandı.
  Toplam 441.264 bayt; 22.050 Hz; 0,15–0,50 saniye. Yeniden üretim:
  python tools/generate-module-audio.py.
- [x] Sesler rutin kanalın mevcut 3 ses / 420 ms sınırını kullanıyor.
  Modül başına gain 0,38–0,50; müzik miksinin seviyesi düşürülmedi.
  Silahlarda ikinci genel isabet sesi kaldırıldı; aynı eyleme fazladan metalik çınlama eklenmez.
- [x] Ark, ray, iyon, plazma, dron, sürü ve kuantum saldırıları ortak VFX sahibine taşındı.
- [x] Destek/savunma/sabotaj efektleri gerçek sunucu olaylarından üretilir.
  Örn. saat halkası, nişangâh, plakalar, petek, üçlü denge, paket aktarımı,
  kırılma, sarmal ve canlandırma işaretleri. Paylaşılan çizim yardımcıları vardır;
  her modülün renk, biçim, süre ve ses ayarı bağımsızdır.
- [x] Kalkan tüm devreyi değil, hedef cihaz boyutuna göre yerel bir hacmi örter.
- [x] Efekt sınırı 8/16/24 korunur. Yeni RAF, WebGL bağlamı veya devre kurulumu yok.
  Katkı efektlerinde 220 ms, modül seslerinde 320 ms tekrar süzgeci.
  Gizlenme, ölüm, oturum değişimi ve düşük grafik yolları korunur.
- [x] 3B modellerin renkli panel/gümüş kenar/koyu birleşim dili güçlendirildi.
  Ortak gövdelere panel ve havalandırma, namlulara yüzey ayrıntıları eklendi.
  Sürü Fabrikatörü üç altıgen yuvaya dönüştürüldü.
- [x] 201/201 otomatik test, normal/3B olmayan uygulama başlangıcı ve JS/CSS kontrolü geçti.
- [x] 36 sesin benzersizliği, sessiz başlangıç, kısa süre, düşük tepe seviyesi
  ve paket listesine dahil olması test edildi.
- [x] Statik model önizlemeleri üretildi: artifacts/real3d-art-pass-20261019/.

## Açık doğrulamalar / sınırlar

- [ ] Gerçek tarayıcıda görsel ve ses dinleme kabulü (kullanıcı yerelde test ediyor).
- [ ] Gerçek cihaz FPS/GPU/bellek ölçümü. Otomatik testler bunun yerine geçmez.
- [ ] Onaylı çizimlerle bütün modüllerin ince siluet ve malzeme ayrıntılarının birebir eşleşmesi.
  Bu tur sanat dili iyileştirmesidir; bitmiş birebir 3B kopya iddiası yoktur.

Savaş dengesi, hasar, hedef seçimi ve koruma kapsamının motor hesabı değişmedi.
Kalkanın yalnız görsel kapsamı küçüldü. WAV'lar bu proje için sentezlendi;
harici oyun sesi kullanılmadı. Sesler teknik olarak kontrol edildi, dinlenmiş
veya gerçek oyunda denenmiş olarak raporlanmaz.
