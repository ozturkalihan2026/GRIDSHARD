# Üretim istemci paketi

Web ve Capacitor aynı `tools/build-client.js` hattını kullanır. Sabit `esbuild` sürümü ve mimariye özel ikili paketlerin bütünlük bilgileri `pnpm-lock.yaml` içinde tutulur. Node 22 ve depodaki pnpm sürümü kullanılmalıdır.

## Web

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:web
```

Çıktı yalnız proje kökündeki `dist/` dizinine yazılır. Önce geçici dizinde derlenir; derleme/kopyalama başarısız olursa önceki `dist/` korunur. Başarılı üretim önceki `dist/` içeriğini değiştirir; buraya kullanıcı dosyası konulmamalıdır.

- `index.html` içindeki açık `build:scripts` ve `build:styles` blokları tek giriş listesidir. JS dosyalarının yürütme sırası, global dışa aktarımları ve `styles.css → canon.css` sırası korunur. Yeni dosya eklendiğinde yalnız bu liste güncellenir. Async/module veya özel media etiketi sessizce dönüştürülmez; derleme açık hata verir.
- Birleştirilmiş ve küçültülmüş JS/CSS, `bundles/gridshard-<SHA256-ilk-16>.*` adlarını alır. İçerik değişince HTML otomatik yeni adları kullanır. Kaynak haritası yayınlanmaz; özellik adları değiştirilmez, fonksiyon/sınıf adları korunur.
- Hedef dönüşüm Chrome 109 / Safari 15'tir; bu bir gerçek cihaz uyumluluk onayı veya eksik Web API'leri için polyfill değildir.
- Çalışma zamanı API adresi ayrı `runtime-config.js` içindedir. Web için boş adres aynı origin demektir. İstenirse `GRIDSHARD_API_BASE_URL` ile HTTPS API verilebilir. Bu dosyaya yalnız genel API adresi yazılır, sunucu sırları yazılmaz.
- `assets/`, favicon ve web manifesti kopyalanır. Kaynak JS/CSS, testler, yerel önbellek ve geliştirme raporları dağıtılmaz. Sesler şu aşamada mevcut WAV biçimindedir; codec dönüşümü ayrı açık iştir.
- `client-build-manifest.json` girdi sırasını, araç sürümünü, çıktı boyutlarını ve SHA-256 özetlerini taşır. Aynı kaynak/yapılandırma sabit çıktı üretir; duvar saati eklenmez.

## Sunucu ve önbellek

`GRIDSHARD_RUNTIME_MODE=production` varsayılan olarak `dist/` sunar. Başka konum için `GRIDSHARD_CLIENT_DIR` mutlak veya proje köküne göre bir dizin alabilir. Kaynak `client/` dizinine sessiz geri dönüş yoktur: web manifesti, JS/CSS özetleri veya gerekli başlangıç dosyaları eksik/uyumsuzsa açılış durur.

Üretim kipi önceki kimlik, veri ve sağlayıcı güvenliği ayarlarını da gerektirmeye devam eder; bu komutlar tek başına tam sunucu dağıtım yapılandırması değildir.

| Dosya | Cache-Control |
| --- | --- |
| Manifestte doğrulanmış içerik özetli JS/CSS | `public, max-age=31536000, immutable` |
| `index.html`, `runtime-config.js`, derleme manifesti | `no-store` |
| Sabit isimli ses, ikon ve diğer varlıklar | `no-cache` (ETag ile yeniden doğrulama) |

Geliştirme modu varsayılan `client/` kaynaklarını ve mevcut no-cache davranışını korur. Üretim dizini çalışırken yerinde düzenlenmemeli; sürümler ayrı hazırlanıp bütün paket ve sunucu birlikte değiştirilmelidir. Birden fazla sunucu/CDN kullanılıyorsa geçiş sırasında önceki içerik özetli dosyalar da erişilebilir tutulmalı ve proxy bu başlıkları ezmemelidir. Bu araç tek başına çoklu sunucu/CDN dağıtımı yapmaz.

## Mobil

`GRIDSHARD_API_BASE_URL` tanımlandıktan sonra `pnpm build:mobile:web` aynı küçültülmüş paketi üretir. HTTPS zorunludur; `GRIDSHARD_ALLOW_INSECURE_MOBILE_API=1` yalnız yerel HTTP denemesi içindir, mağaza adayında kullanılmaz. Mobil manifest `platform: mobile` taşır ve sunucu web yayını için kabul edilmez. Web yayınına dönerken `pnpm build:web` yeniden çalıştırılmalıdır.

## Docker ve CI

Docker önce ayrı Node katmanında paketi derler, Python çalışma imajına yalnız `dist/` kopyalar; Node bağımlılıkları son imaja girmez. `GRIDSHARD_CLIENT_DIR=/app/client` hazırdır; üretim kimlik/güvenlik ortam ayarları ayrıca verilmelidir.

Quality iş akışında mevcut istemci testlerini `pnpm test:build` ve `pnpm build:web` izler. Üretilen paket commit SHA ile isimlendirilmiş `gridshard-web-*` artifact'i olarak saklanır. Yeni derleme ve statik servis sözleşmeleri yazılmıştır; bu geliştirme turunda kullanıcının talebi gereği test, derleme veya Docker çalıştırılmamıştır. Yayın öncesinde CI/cihaz sonucu ayrıca görülmelidir.

Araç davranışı için kaynak: [esbuild API — küçültme, hedef ve CSS paketleme](https://esbuild.github.io/api/).
