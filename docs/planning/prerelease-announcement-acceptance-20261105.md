# Ön duyuru ve müzik planı — yazılım kabulü

5 Kasım 2026. COMM-01 ve aynı kaynaktaki COMPAT-01 yazılım kabulü tamamlandı.
Uygulama kaynağı `0cbe34cc8113dccdd7e62f0022a870ad19eec3e6`; [bütün CI işleri başarılı](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/41919146605).
Kabul sonrası kayıt commit'i yalnız belgeleri günceller.

- Sürüm öncesi popup ve Sistem mesajı aynı TR/EN katalogdan gelir. Tamam
  onayı hesapta saklanır; offline onay cihazdaki outbox ile yeniden denenir.
- Sürüm çıktıktan sonra aynı kimlikle sezon öncesi metne geçilir; önceki
  onay yeniden açılmaz. Sonraki kampanya kendi kimliğiyle duyurulur.
- Patch/minor/major ön duyuru zorunluluğu, takvim/pencere ve paket izin listesi
  denetlenir. Eski API'de yeni alanın yokluğu başlangıcı bozmaz.
- Yerel: Python 2072 PASS / 48 dış servis SKIP; istemci 779 PASS; build 11 PASS.
  11 açılış/duyuru E2E ve son commit öncesi üç telefon tekrar kontrolü geçti.
  Gerçek PG onay rollback/cache kaybı; 10 HTTP ve üç gerçek UI başlangıcı geçti.
- 105 AAC kapsayıcısının yalnız MP4 markası düzeltildi; kodlanmış ses ve
  zamanlama aynı kaldı. 4 ek Android tarayıcı senaryosu ve AAC yedeği geçti.
- Son kaynak CI, gerçek PG/Redis ve üretim imajı açılış/restart/restore,
  Chromium/Android, macOS 15 Apple Silicon WebKit ve kaynak paketleme kapılarını geçti.
  Chromium/Android'de 74, Safari'de 33 işlevsel senaryo; ayrıca üç iki-istemcili
  savaş senaryosu ve üç platform kare bütçesi geçti. Safari p95 19,5 ms,
  jank %0,47 ve donma sıfırdır.
- Safari referansında Intel havuzunun boş sayfa kadansı da bütçeyi aştığı
  için aynı macOS 15/WebKit Apple Silicon havuzunda doğrulandı. İlk kademe/manuel ayar ve p95 34 ms,
  jank %3 bütçesi korunur; hiçbir savaş karesi ölçümden atılmaz.

Kanıt kökü `artifacts/prerelease-20261104/`; `FINAL_STATUS.json` ve
`http-proof-aac-final/proof.json` kaynak kimliğini taşır. Üç mobil senaryo ayrı
test E2E kataloğunu kullanır; gerçek yayın penceresi/sürüm/phase kuralları
sunucu testleriyle ayrıca doğrulanır. Bu, fiziksel Android/Play kanıtı değildir.

AUDIO-03 (2.5.0: bir menü + bir savaş), AUDIO-04 (2.7.0: bir menü + iki savaş)
plan/checklist/takvim ve sürüm kapılarına bağlandı; üretim görevleri todo'dur.
Müzik veya yeni sanat üretilmedi, global master/gain değiştirilmedi.
Canlı ortam, AAB ve sezon açılışı yapılmadı; etiketler 2.3.0/code14'tür.
