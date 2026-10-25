# Devre açılışı, yetenek ekonomisi ve tanıtım — 23 Ekim 2026

Son görsel revizyon: kullanıcı üstteki ayrı logoyu kaldırdı; başlık/slogan
mavi boşluğa taşındı ve sahnenin içindeki reaktör hafif CSS enerji nabzıyla
canlandırıldı. Aşağıdaki üretim kaydı önceki tasarımı da kapsar. Güncel
yerleşim, derleme ve önizlemeler: `CANLI_CEKIRDEK_ACILIS_20261023.md`.

## Uygulanan maliyetler

Tutarlar yeni bir yetenek dalını öğrenme bedelidir; mevcut seçimlerden geriye
dönük ödeme alınmaz. Seviye, parça, çekirdek yükseltme ve yetenek sıfırlama
bedelleri bu istek kapsamında değiştirilmedi.

| Enderlik | Modül 1 | Modül 2 / Çekirdek 1 | Modül 3 / Çekirdek 2 | Modül 4 / Çekirdek 3 |
| --- | --- | --- | --- | --- |
| Yaygın | 1.000 DK | 2.000 DK | 4.000 DK | 8.000 DK + 100 Akı |
| Nadir | 1.500 DK | 3.000 DK | 6.000 DK | 12.000 DK + 200 Akı |
| Epik | 2.000 DK | 4.000 DK | 8.000 DK | **16.000 DK + 400 Akı** |
| Efsanevi | 10.000 DK + 500 Akı | 20.000 DK + 1.000 Akı | 30.000 DK + 2.000 Akı | 40.000 DK + 4.000 Akı |

Epik son eşik, kullanıcının açık 16.000 DK onayıyla uygulandı. Her çekirdek
kendi enderlik satırını kullanır. Aynı eşikteki iki alternatif dal aynı bedeli
gösterir; yalnız seçilen dal için bir defa kesinti yapılır.

Tek yetkili tablo `server/app/game/talents.py:TALENT_COSTS`.
`circuit_credits_cost` ve `flux_cost` hem modül hem çekirdek düğümünde
yayımlanır. Gerçek DK cüzdanı `profile.circuit_credits`; emekli `coins`
cüzdanı kullanılmaz. İki bakiye kontrolü de kesintiden önce, mevcut profil
kilidi altında yapılır. Yetersizlik boş seçim/fiş bile yazmaz. Mevcut tekrar
isteği fişleri ikinci kesintiyi önler.

İstemci ortak uygunluk ve maliyet çizicisini kullanır. Sıfır Akı bedeli
çizilmez. İki para birimine yer açmak için gerçek bilgi penceresi stilinde
62px merkez rozet kullanılır; eski temel CSS üstüne yeni genel override
eklenmedi. 320/393px telefonlarda gerçek sunucu yanıtı ve taşma test edildi.

## Açılış

Yeni onaylı uygulama ikonundaki fiziksel turkuaz/gümüş/altın reaktör logosu
kullanıldı; eski düz kristal-halka logo değil. Özellikler grafiğindeki
fiziksel soketlere oturan modüller, mint devre yolları ve iki karşılıklı
platform portre sahneye uyarlandı. Logo, gerçek yazı ve gerçek API ilerleme
çubuğu resme gömülmedi; ayrı erişilebilir DOM elemanları olarak kaldı.

- Referanslar: `artifacts/store-2.1.1-20261022/feature-graphic-1024x500.png`, `app-icon-512.png`.
- Orijinaller: `artifacts/startup-circuit-20261023/source/` (korunur).
- Oyuna bağlananlar: `client/assets/branding/startup-circuit-v1/`.
- Sahne: 1024×1536 WebP, 268.908 bayt. Logo: 384×384 alfa WebP, 45.666 bayt.
- Teknik dışa aktarma: `python tools/prepare-startup-art.py`; yeniden boyutlandırma/format dönüşümü, yeniden çizim değil.
- Önizleme: `artifacts/startup-circuit-20261023/startup-preview.png`.
- Tek stil sahibi `startup-loading.css`. Gizli/bitmiş/hatalı açılışta ve
  azaltılmış harekette logo animasyonu durur. Yeni canvas/timer eklenmedi.

### Görsel üretim kaydı / tam istemler

İki görsel yerleşik `imagegen` aracıyla, aşağıdaki istemlerle üretildi.
Sahne tam opak, logo gerçek alfa arka planlıdır. Logo ve sahne sonra yalnız
teknik WebP dışa aktarımından geçti. Yeni ikon kimliği yeniden tasarlanmadı.

Sahne — referans: özellikler grafiği; `transparent_background:false`:

```text
Use case: stylized-concept. Asset type: portrait mobile game loading-screen key art, 1024x1536. Input image 1 is the STYLE AND GAME-WORLD REFERENCE, the approved GRIDSHARD feature graphic. Create a portrait adaptation of its beautiful modular circuit-board battlefield. Preserve its chunky angular blue circuit slabs, mint energy conduits connecting device sockets, painted casual/RPG shapes, cyan silver gold crystal reactor, red laser turrets, yellow battery and blue shield devices. Not realistic industrial metal. Composition: TOP 36% deep navy/cobalt quiet negative space for the real logo and title, no devices or bright lines crossing that logo area. LOWER 64% a richly framed three-quarter elevated view of two opposing raised circuit platforms, cyan home platform in foreground and red opposing platform behind/right, readable socket tiles and embedded energy channels, angular chamfered blocks, modest laser beam and shield glow. Hero mint reactor on foreground platform around lower center, devices actually seated on individual sockets. Devices stay coherent with reference, no people, no UI screenshot or fake interface. Fill bottom with platform circuitry, keep lower 12% fairly dark for real loading UI overlay. Full bleed opaque background. Absolutely NO text, NO logo lettering, NO watermark, NO loading bar, NO menus or currency. This is an illustration behind a separately rendered real logo and progress UI. Attractive stylized mobile strategy game, detailed enough to see the physical circuit system without noisy greebles.
```

Logo — referans: yeni uygulama ikonu; `transparent_background:true`:

```text
Use case: background-extraction. Asset type: transparent logo emblem cutout for GRIDSHARD loading screen. Image 1 is the EDIT TARGET, our approved NEW app logo: chunky silver/cyan/gold reactor with mint lightning crystal. Remove ONLY the blue square backdrop and the radiating circuit traces OUTSIDE the reactor. Preserve the reactor itself exactly: same silhouette, face, materials, proportions, broad painted outlines, intact lower pedestal and every reactor component. Do not reinterpret or redesign it into the old flat crystal-in-gold-ring logo. Keep centered full reactor with small clean alpha safety margin; no square background, no added halo, no cast shadow outside the silhouette, no text, no frame. Genuine transparent background. This must read as precisely the same approved new reactor logo, not a new reactor design.
```

## Doğrulama

- Tam istemci: **715/715** geçti.
- Tam sunucu: **1753 geçti, 44 atlandı**. Sıfır Akı isteyen bir bedelde
  "eksik Akı" tanımlanamayacağı için uygulanamayan 19 parametre örneği
  çıkarıldı; ücretsiz Akı durumu gerçek başarılı alım testlerinde doğrulanır.
  İlk koşuda eksik `google-auth`
  bağımlılığı vardı; projenin mevcut requirements aralığındaki 2.62.0 kurularak
  tekrarlandı. Kaynakta sahte Google modülü veya doğrulama gevşetmesi yapılmadı.
- Emekli metin ikonunu geri isteyen eski sunucu kaynak testi güncellendi.
- Açılış 6 E2E: Chromium, Android Chrome, Windows WebKit; gerçek ilerleme,
  erişilebilirlik, 320×568 / 360×800 / 1280×720 yerleşim ve gizliyken animasyon durması.
- Fiyat 3 E2E: her modül/çekirdeğin gerçek sunucu maliyetleri, yaygın/efsanevi
  modül ve efsanevi çekirdek görünümleri, 320/393px, taşma yok, önizlemede satın alma yok.
- Kanıtlar: `artifacts/cleanup-20261023/{client-talent-startup-audit.tap,server-talent-startup-audit.txt,startup-circuit-playwright-results.json,talent-costs-playwright-results.json}`.
- Yalıtılmış web derlemesi: `artifacts/web-dynamic-audit-B8L48j/dist`,
  `48765f79b5753d40`, 44 script / 615 varlık. Ana `dist`/Android güncellenmedi.
- Derleme regresyonları: **10/10** geçti. Fiyat E2E normal üç CI projesine
  dâhil edildi; yalnız video yakalama elle çalıştırılır.

Bu sonuçlar Windows WebKit savaş FPS sorununu çözülmüş göstermez. Önceki
1,5–2,7 FPS bulgusu hâlâ açık; gerçek iOS testi veya uzaktaki CI yeşili
iddia edilmiyor. Canlı sunucuya geçiş, commit/push, AAB ve yayın yapılmadı.

## Video iş akışı

Kayıt: `node node_modules/@playwright/test/cli.js test --config tools/playwright-promo.config.js`.
Kurgu: `node tools/build-promo-video.cjs` (PATH üzerinde ffmpeg/ffprobe).

Headless Chrome, geçici yerel kimlik ve yalıtılmış sunucu; görünür masaüstü
kontrolü veya canlı hesap yok. Menü gezintisi gerçek düğmelerle, savaş
yerleşimleri gerçek istemci komutu ve sunucu maliyetleriyle yapılır. Sahte
modül, bakiye veya savaş görüntüsü üretilmez. Kaydın ilk gerçek hesap okuması
açılışı göstermek için kısa süre bekletilir; ilerleme çubuğu taklit edilmez.

Ham WebM sessiz 540×960 gerçek kayıttır. Kurgu 1080×1920 H.264/AAC MP4'e
ölçeklenir; görüntülerin arasındaki gerçek gezinme/bekleme kesilir, kısa
tanıtım yazıları ve yeni logolu kapanış eklenir. Orijinal GRIDSHARD menü
müziği ile pulse/percussion/ostinato savaş katmanları kurguda eklenir; bu
video gerçek zamanlı ses kaydı veya FPS performans kanıtı değildir.

Çıktı dizini `artifacts/promo-20261023/`; ham kayıt, kesim zamanları ve
ffprobe/kurgu raporu saklanır. Hiçbir servise yüklenmez veya yayımlanmaz.

Kayıt E2E geçti; sayfa hatası yok. Kurgu **40,7 saniye**, 1080×1920 / 30fps
H.264, stereo 48kHz AAC, 7.475.666 bayt. Ses tepe düzeyi -4,8dBFS;
kırpılma yok. Günlük meta kapandıktan sonra ana ekranın gerçek boyaması da
kayda alındı ve kurgu görsel olarak kontrol edildi. Dosya:
`artifacts/promo-20261023/GRIDSHARD-tanitim-1080x1920.mp4`.
`video-contact-sheet.png` sahnelerin görsel kontrolüdür; `edit-report.json`
ham kaynak zamanları, kurgudaki kesimler ve ffprobe sonuçlarını içerir.
