# Eşleştirme ve savaş müziği — 21 Ekim 2026

## Oyuna bağlananlar

**Akış / eşleştirme:** 120 BPM, 16 ölçü, 32 saniyelik döngü. Yeni menünün
süzülmüş bas dizisi, reaktör darbesi, elektronik davulu, cam arpeji ve ped
katmanı; ilk bölüm daha seyrek, ikinci bölüm daha hareketli. Beş müzikal
katman tek ses dosyasına karıştırıldı: eşleştirmede ek ses kanalı açılmaz.

**Devre Hücumu / savaş:** 128 BPM, 16 ölçü, 30 saniyelik döngü. Yedi ayrı,
eşzamanlı katman: bas, reaktör ritmi, davul, motor/cevaplı melodi, cam/çan,
armonili gerilim pedi, kritik çekirdek nabzı. Orta bölümde nefes alan boşluklar,
ikinci bölümde melodik cevaplar var. Ses araçları doğrudan mevcut menünün
`menu_playlist_synth.py` dosyasından kullanılıyor; menü master'ları değişmedi.

Mevcut durum geçişleri 3 → 5 → 6 → 7 katmanı açar. Düşük bellek cihazlarındaki
dört katman seçimi, miks kazançları, limiter ve efekt öncelikleri korundu.
Eski müzik dosyaları geri dönüş için tutulur; aktif savaş artık v9'u seçer.
Savaş döngüleri menüye ait 32 saniyelik ızgaraya zorlanmaz; kendi tamponunun
gerçek süresiyle döner. Yedi tampon 32 yerine 30 saniye: aynı çözümleme
örnekleme hızında savaş PCM belleği %6,25 daha az. Toplam uygulama belleği
için eşleştirme parçasının 3 saniyeden 32 saniyeye uzaması ayrıca hesaba
katılmalıdır; bunu tüm ses sistemi küçüldü diye yorumlamıyoruz.

## Kaynak, teslim ve kalite

- Üretim: `python tools/generate_combat_playlist_audio.py --preview-dir artifacts/music-v9-20261021`
- Mobil kodlama: `python tools/encode_mobile_audio.py`
- Çevrimdışı denetim: `python tools/verify_combat_playlist_audio.py --report artifacts/music-v9-20261021/codec-report.json`
- Yeni kaynaklar: `client/assets/audio/matchmaking_v9_akis.wav` ve yedi
  `battle_v9_*.wav`; her biri için OGG/AAC türevleri ve güncel manifest.
- Önceden yalnız WAV olan dokuz mevcut kısa efekt için de eksik OGG/AAC
  türevleri üretildi; bu efektlerin WAV içeriği değiştirilmedi. Regresyon
  testi artık türevin güncel master SHA-256 değerini doğrular.
- 24 yeni müzik dosyası WAV/OGG/AAC olarak başarıyla çözüldü. Her savaş
  dosyasında tam 661.500 kare; eşleştirmede 705.600 kare. Formatlar arasında
  katman süre farkı yok. PCM dikişleri süre kısaltmadan birleştirildi.
- Eşleştirme RMS −22,6 dBFS; ölçülen WAV loudness −21,6 LUFS. Savaşın
  bütün katmanları en yüksek kazançta toplandığında limiter öncesi örnek
  tepesi −3,72 dBFS; kırpılma yok. Tek telefon hoparlöründe kaybı önlemek
  için mono toplam enerjisi kontrol edildi.
- Yerel tam sonuç: **621 istemci, 1604 sunucu, 10 paketleme, 22 araç testi
  geçti**. Sunucuda 44 koşullu atlandı. Son web build `02b57680aac603a5`
  (619 varlık); mevcut kök `dist/` değiştirilmedi.

## Dinleme ve yayın sınırı

Ön izlemeler (yerel artifact, kaynak kontrolüne girmez):

- `artifacts/music-v9-20261021/Eslesme-Akis.wav`
- `artifacts/music-v9-20261021/Savas-Devre-Hucumu.wav`
- `artifacts/music-v9-20261021/Savas-Kritik-Katmanlar.wav`

Bunlar kodla sentezlenmiş özgün düzenlemelerdir; dış hizmet veya lisanslı
müzik örneği kullanılmadı. Teknik kontroller müzikal beğeni veya gerçek cihaz
dinleme kabulünün yerine geçmez. Kullanıcı; kulaklık/telefon hoparlörü,
eşleştirmeden savaşa geçiş, kritik baskı, menüye dönüş ve uzun döngü dinlemesini
yapmalı. Commit/push kullanıcıda; yeni AAB/canlı sunucu/site/Play yayını yok.
