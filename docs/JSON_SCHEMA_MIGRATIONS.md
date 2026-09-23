# JSON dosya şeması ve migration günlüğü

JSON arka ucu kullanan yedi depo aynı sürüm düzenine bağlıdır: `identities`, `platform`, `players`, `telemetry`, `battle_pool_presets`, `balance_drafts`, `teams`. `DATABASE_URL` ile PostgreSQL kullanıldığında kimlik ve oyuncu dosyaları etkin değildir; diğer beş JSON deposu bu akışta kalır. Komut, sunucuyla aynı ortam değişkeni yollarını kullanır (`GRIDSHARD_*_PATH`, `RELAY_*_PATH`).

Sürüm 0, mevcut şemasız dosyadır. Sürüm 1 dosya içeriğini değiştirmeden mevcut nesne/liste kökünü doğrular ve aynı dizinde `<dosya>.schema.json` şema kaydı oluşturur. Bu kayıt sürümü ve SHA-256 zinciriyle doğrulanan ileri/geri migration günlüğünü tek atomik dosyada tutar. Var olan dosyanın baytları ayrıca `<dosya>.schema-v0-<özet>.bak` olarak korunur. Boş kurulumda veri dosyası oluşturulmaz; yalnız şema kaydı hazırlanır. Uygulama henüz sürüm 0'ı geliştirme ortamında okuyabilir, fakat üretim başlangıcında bekleyen JSON migration varsa açılış durur. Bilinmeyen/bozuk sürüm kaydı her ortamda okumayı ve yazmayı durdurur.

Bakım sırası:

1. Aynı JSON dosyalarını yazan bütün sunucu işlemlerini durdurun. JSON depo yazma yollarının tümü süreçler arası kilit kullanmadığı için canlı trafik sırasında migration yapmayın.
2. Veri dizininin bağımsız, erişimi kısıtlı bir kopyasını alın. Migration yedeği ayrıca oluşur; bu, düzenli işletim yedeğinin yerine geçmez.
3. Gerçek dağıtım ortam değişkenleriyle aşağıdaki komutları çalıştırın:

```powershell
python tools/json_schema_migrate.py status
python tools/json_schema_migrate.py up
python tools/json_schema_migrate.py check
```

`check`, bir depo bekliyorsa `1`, bozuk veri/şema varsa `2` koduyla çıkar; dağıtım öncesi `0` zorunludur. `up` önce seçilen bütün depoları salt okunur doğrular, sonra sırayla uygular. Yarım kalan çoklu-depo işleminde komut tekrar çalıştırılabilir; tamamlanan depolar yeniden değiştirilmez. İzole dosya dizini için `--data-dir <dizin>` verilebilir; özel ortam yolu tanımlıysa o yol önceliklidir. Tek depo için `--store platform` gibi seçim yapılabilir.

Sürüm 1'i geri almak için sunucu kapalıyken `python tools/json_schema_migrate.py down --store platform --allow-destructive` kullanın. Bu adım günlükte 1→0 kaydı oluşturur, ama veri dosyasını eski yedekle değiştirmez: geçiş yalnız şema kaydıydı ve arada kazanılmış oyuncu ilerlemesini geri yükleme uğruna silmek yanlış olur. Kaynak yedek korunur. Ardından eski uygulama sürümünün uyumu ayrıca değerlendirilmelidir. Oyuncu verisinin asıl geri yüklemesi ayrı, açık operatör kararıdır.

PostgreSQL tablolarının SQL geçişleri ayrı [PostgreSQL şema migration akışı](GELISTIRME_ORTAMI.md) ile yönetilir. Bu turda mevcut çalışma zamanı JSON dosyaları üzerinde `up/down` çalıştırılmadı; şema kaydı veya yedek oluşturulmadı. Kullanıcının isteği nedeniyle test ve sunucu denemesi de yapılmadı.
