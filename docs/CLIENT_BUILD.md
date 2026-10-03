# Üretim istemci paketi

Web ve Capacitor aynı `tools/build-client.js` hattını kullanır (GRIDSHARD projesinden taşındı). Sabit `esbuild` sürümü ve mimariye özel ikili paketlerin bütünlük bilgileri `pnpm-lock.yaml` içinde tutulur. Node 22 ve depodaki pnpm sürümü kullanılmalıdır.

## Web

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:web
```

Çıktı yalnız proje kökündeki `dist/` dizinine yazılır. Paket önce geçici `.client-build-*` dizininde derlenir; derleme veya kopyalama başarısız olursa önceki `dist/` korunur. Başarılı derleme önceki `dist/` içeriğini değiştirir; bu dizine elle dosya konulmamalıdır.

- `client/index.html` içindeki `build:scripts` ve `build:styles` blokları tek giriş listesidir. JS dosyalarının yürütme sırası, global dışa aktarımları ve `styles.css → canon.css` sırası korunur. Yeni betik eklendiğinde yalnız bu liste güncellenir. Async/module betik veya media'lı stil etiketi sessizce dönüştürülmez; derleme açık hata verir. Google Fonts bağlantısı ve `runtime-config.js` blok dışında kalır.
- Birleştirilmiş ve küçültülmüş JS/CSS `bundles/gridshard-<SHA256-ilk-16>.*` adını alır. İçerik değişince HTML yeni adları kullanır. Kaynak haritası yayınlanmaz; fonksiyon/sınıf adları korunur.
- Hedef dönüşüm Chrome 109 / Safari 15'tir. Bu, gerçek cihaz uyumluluk onayı veya eksik Web API'leri için polyfill değildir.
- Çalışma zamanı API adresi ayrı `runtime-config.js` içindedir. Web için boş adres aynı origin demektir; istenirse `GRIDSHARD_API_BASE_URL` ile HTTPS API verilebilir. Bu dosyaya yalnız genel API adresi yazılır, sunucu sırları yazılmaz.
- Yalnız HTML/manifest ve çalışan ses kodunda referans verilen `assets/` dosyaları, `favicon.ico` ve `manifest.webmanifest` kopyalanır. Kullanılmayan görseller, dönüştürme manifesti, testler, anahtarlar, yerel önbellek ve geliştirme raporları dağıtılmaz. Geliştirme test kancası derlenmiş JS'den çıkarılır.
- Web çıktısındaki `client-build-manifest.json` girdi sırasını, araç sürümünü, çıktı boyutlarını, SHA-256 özetlerini ve pakete alınmayan WAV listesini (`audio.omitted_wav`) taşır. Mobil pakete bu geliştirme manifesti eklenmez. Aynı kaynak ve yapılandırma aynı çıktıyı üretir; duvar saati eklenmez.

### Sesler

Ses türevleri önce `python tools/encode_mobile_audio.py` ile üretilir (ffmpeg gerekir; ayrıntı `docs/AUDIO_DIRECTION.md` §19). Derleme:

- `client/src/gridshard-audio-formats.js` listesini `client/assets/audio/mobile/manifest.json` ile karşılaştırır. Listede olan her ses için WAV'ın SHA-256 değeri manifestle, OGG/M4A dosya boyutları kayıtla eşleşmelidir. WAV türevinden yeniyse veya türev eksik/bozuksa derleme durur.
- Türevi her biçimde doğrulanan WAV'ı pakete almaz; istemci türevi çalar. Türevi olmayan WAV'lar pakette kalır.
- `GRIDSHARD_MOBILE_KEEP_WAV=1` kanonik WAV'ları pakette tutar; doğrulama yine yapılır.
- Kaynağı silinmiş ve çalışma zamanı listesinde olmayan eski manifest kaydı paketi etkilemez; `python tools/encode_mobile_audio.py --check` bunu ayrıca bildirir.

## Sunucu ve önbellek

`GRIDSHARD_RUNTIME_MODE=production` varsayılan olarak `dist/` sunar. Başka konum için `GRIDSHARD_CLIENT_DIR` mutlak veya proje köküne göre bir dizin alabilir. Kaynak `client/` dizinine sessiz geri dönüş yoktur: web manifesti, JS/CSS özetleri veya gerekli başlangıç dosyaları eksik ya da uyumsuzsa sunucu açılmaz. Mobil manifestli (`platform: mobile`) paket web yayını için kabul edilmez.

| Dosya | Cache-Control |
| --- | --- |
| Manifestte doğrulanmış içerik özetli JS/CSS | `public, max-age=31536000, immutable` |
| `index.html`, `runtime-config.js`, derleme manifesti | `no-store` |
| Sabit adlı ses, ikon ve diğer varlıklar | `no-cache` (ETag ile yeniden doğrulama) |

Geliştirme modu `client/` kaynaklarını ve mevcut no-cache davranışını korur (`BASLAT_WEB_TEST.bat` değişmedi). Üretim dizini çalışırken yerinde düzenlenmemeli; sürümler ayrı hazırlanıp paket ve sunucu birlikte değiştirilmelidir. Birden fazla sunucu veya CDN varsa geçiş sırasında önceki içerik özetli dosyalar da erişilebilir kalmalı ve proxy bu başlıkları ezmemelidir.

## Mobil

`GRIDSHARD_API_BASE_URL` tanımlandıktan sonra `pnpm build:mobile:web` aynı küçültülmüş paketi üretir. HTTPS zorunludur; HTTP istisnası hem `GRIDSHARD_LOCAL_DEBUG=1` hem `GRIDSHARD_ALLOW_INSECURE_MOBILE_API=1` ve özel/loopback host gerektirir, mağaza adayında kullanılmaz. Ortak `tools/mobile-network-policy.js`, Capacitor/Android için de aynı kararı verir; uzak HTTPS debug paketi plaintext/karma içerik izni açmaz. Derleme fonksiyonu mobil platform bilgisini döndürür; mobil `dist/` içinde geliştirme manifesti bulunmaz. Web yayınına dönerken `pnpm build:web` yeniden çalıştırılmalıdır.

## Docker ve CI

Docker önce ayrı Node katmanında paketi derler, Python çalışma imajına yalnız `dist/` çıktısını kopyalar; Node bağımlılıkları son imaja girmez. `GRIDSHARD_CLIENT_DIR=/app/client` hazırdır; üretim kimlik ve güvenlik ortam ayarları ayrıca verilmelidir.

`.github/workflows/quality.yml` sunucu testlerini, istemci testlerini, `pnpm test:build` ve `pnpm build:web` adımlarını çalıştırır; paketi commit SHA'lı `gridshard-web-*` artifact'i olarak saklar. Proje şimdilik yerelde tutulduğu için `.github/` `.gitignore` ile dışarıda bırakılır; kendi deposuna taşınınca bu satırlar kaldırılmalıdır.

Derleme ve statik servis sözleşmeleri `tools/tests/client-build.test.js` ve `server/tests/test_client_build_static.py` içindedir. Bu turda kullanıcı kararı gereği test, derleme veya Docker çalıştırılmadı.

Araç davranışı için kaynak: [esbuild API — küçültme, hedef ve CSS paketleme](https://esbuild.github.io/api/).
