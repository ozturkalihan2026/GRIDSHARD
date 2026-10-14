# Başlık ve düğme yazısı önizlemesi — 14 Ekim 2026

Kalıcı oyun fontu seçilmedi. Bu klasör oyun paketine girmez. Kullanıcı
onayı için mevcut Oxanium, Lilita One ve Rowdies Bold karşılaştırıldı.
Pilot yalnız açıkça seçilmiş Ev/Etkinlik başlıkları ve dock/düğme yazısında
uygulanır; logo Orbitron, açıklamalar Rajdhani olarak korunur.

Dosyalar Google Fonts'un resmî deposundaki **tam TTF** dosyalarıdır:

- https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/LilitaOne-Regular.ttf
- https://raw.githubusercontent.com/google/fonts/main/ofl/rowdies/Rowdies-Bold.ttf
- Aynı kaynak klasörlerdeki `OFL.txt` dosyaları `OFL-LilitaOne.txt` ve
  `OFL-Rowdies.txt` adlarıyla, değiştirilmeden birlikte tutulur.

İlk Google Fonts CSS yanıtı Latin altkümesi verdiğinden tam dosyalarla
yeniden kontrol edildi. Tam Lilita One dosyasında **Ğ, İ, Ş, ğ, ş** yoktur;
tarayıcı bu harflerde başka font kullanır. Önizlemede bu kısıt yazılıdır.
Rowdies Bold `ÇĞİÖŞÜçğıöşü` harflerinin tamamını içerir.

`e2e/typography-pilot.spec.js` TTF Unicode cmap tablosunu doğrudan okur;
yalnız `document.fonts.check` sonucuna dayanmaz. Gerçek oyun sayfasına
test esnasında yerel stil ekler; kalıcı kaynak font token'ını değiştirmez.
320/393 px ekran ve aktif dock yazısının taşmaması, gövde fontunun aynı
kalması, iki fontun yüklenmesi ve lisansların varlığı kontrol edilir.
Karşılaştırma sayfası stil örneğidir; ayrı Ev/Etkinlik PNG'leri gerçek
yalıtılmış oyun sayfasından alınmıştır. Görünen hesap yerel fixture'dır.

Çıktılar: `font-comparison.png`, `home-current.png`, `home-lilita.png`,
`home-rowdies.png`, `events-current.png`, `events-lilita.png`, `events-rowdies.png`.
Masaüstü ve Android Chrome öykünmesi son kontrolü **2/2 geçti**.
Önceki dock ve meta kararları değiştirilmedi. Native/canlı paket yapılmadı.

Yeniden üretim:

```powershell
$env:GRIDSHARD_PYTHON='D:\Projects\GRIDSHARD\.venv-technical-audit\Scripts\python.exe'
$env:GRIDSHARD_E2E_HUMAN_MATCHMAKING='0'
pnpm exec playwright test e2e/typography-pilot.spec.js --project=desktop-chromium --project=android-chrome-emulated
```

Kaynaklar QA klasöründe olduğundan açık font seçimi sonrası yalnız seçilen
fontun WOFF2 türevi ve lisansı gerçek oyun paketine taşınmalıdır. Türkçe
glif, font altkümesi, lisans gösterimi ve yerleşim kontrolleri o aşamada
yeniden çalıştırılmalıdır. Lilita mevcut dosyasıyla Türkçe için önerilmez.
