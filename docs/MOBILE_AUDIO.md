# Mobil ses paketi

Oyun içindeki 28 ayrı ses kimliği için OGG Vorbis (`.ogg`) ve AAC-LC (`.m4a`) dosyaları `client/assets/audio/mobile/` altında hazır tutulur. WAV dosyaları düzenleme asıllarıdır; web ve mobil üretim paketine kopyalanmaz. `manifest.json` her sesin boyutunu ve SHA-256 özetini taşır. Derleme, kullanılan bütün ses kimliklerini ve iki biçimin dosya bütünlüğünü denetler; eksik veya değiştirilmiş dosyayla paket üretmez.

| Kaynak asılları ve dört savaş miksi | OGG toplamı | AAC toplamı |
| ---: | ---: | ---: |
| 39.462.044 bayt | 2.332.148 bayt | 6.058.878 bayt |

Desteklenen tarayıcıda OGG, diğerinde AAC önce denenir; bir biçim yüklenemez/çözülemezse öbürüne geçilir. Bu iki biçim de başarısızsa ses çalmaz ve hata kaydedilir; WAV'a gizli geri dönüş yoktur. Savaşta Web Audio varsa yedi gövde katmanı aynı ses saati üzerinde başlar. Giriş, normal savaş, baskı ve kritik Çekirdek için farklı miks oranları kullanılır. Web Audio yoksa bu dört durumun ayrı önceden mikslenmiş parçaları çalınır. Savaş müziği üretimde açıktır.

## Asıllardan yeniden üretme

FFmpeg kurulu ve `ffmpeg` PATH üzerinde olmalıdır. Alternatif olarak yürütülebilir dosyanın tam yolu `GRIDSHARD_FFMPEG` ile verilebilir:

```powershell
$env:GRIDSHARD_FFMPEG="C:\path\to\ffmpeg.exe"
pnpm assets:audio
```

Araç yedi 32 saniyelik savaş gövdesinden dört yedek miks üretir, ardından bütün kullanılan WAV kimliklerini iki biçime dönüştürür ve manifesti yeniden yazar. Kaynak WAV'ları silmez. Dönüşümden sonra `client/assets/audio/mobile/` içindeki dosyalar birlikte sürüm kontrolüne alınmalıdır. Normal web/mobil derlemesinde FFmpeg gerekmez; hazır sıkıştırılmış dosyalar manifestleriyle doğrulanır.

## Yayın öncesi cihaz kontrolü

Bu turda kullanıcının isteği üzerine otomatik test, tarayıcı, cihaz ve savaş denemesi çalıştırılmadı. Android Chrome ve iPhone Safari üzerinde müzik açma izni, iki ses biçiminden uygun olanın çalması, dört savaş durumunun geçişi, sonuç sesi, susturma/yeniden açma ve arka plana gidip dönme ayrıca dinlenmelidir. Manifest/bütünlük denetimi codec'in gerçek cihazda sorunsuz çalacağını kanıtlamaz.
