# Geliştirme Ortamı — Beta.6

## Önerilen günlük akış

1. `TEST_ET.bat` ile tam QA zincirini çalıştır.
2. QA başarılıysa `BASLAT_WEB_TEST.bat` ile sunucuyu başlat.
3. `http://127.0.0.1:8000/` adresinden manuel oynanış testi yap.
4. Hata varsa `qa_reports/latest.json` ve tarayıcı geliştirici konsolunu birlikte incele.

## QA zinciri

`tools/qa.py` şu kontrolleri tek komutta çalıştırır:

- tüm Python/pytest sunucu testleri,
- `app.js` ve `relay-client.js` sözdizimi kontrolü,
- istemci birim/regresyon testleri,
- gerçek `app.js` başlangıç yürütmesi ve dört ana menünün click-handler bağlama testi,
- gerçek Uvicorn süreci üzerinden HTTP smoke testi.

Bu zincir Beta.5'te gözden kaçan `PORT_COUNT_BY_NAME` başlangıç sırası hatasını tekrar oluşmadan yakalamak için özellikle eklendi.

## Docker

Docker zorunlu değildir. Windows yerel geliştirme için `.venv` daha hızlıdır. Ortam farklarını azaltmak veya temiz bir kurulum doğrulamak için:

`docker compose up --build`

kullanılabilir.

## VS Code

`.vscode/tasks.json` içinde Tam QA, sunucu başlatma, pytest ve client test görevleri hazırdır.

## PostgreSQL şema migration akışı

`server/migrations/` altındaki numaralı ileri ve geri SQL dosyaları checksum ile `schema_migrations` tablosunda izlenir. Sunucu açılışta advisory lock alıp yalnız bekleyen ileri migration'ları sırasıyla uygular; daha önce uygulanmış bir dosya sonradan değiştirilmişse açılış güvenli biçimde durur.

Dağıtım öncesi durum kontrolü:

```powershell
python tools/schema_migrate.py status
python tools/schema_migrate.py check
```

Bekleyen migration'ı bakım penceresinde açıkça uygulamak için `up` kullanılır. Geri alma veri değiştiren bir işlem olduğu için yalnız operatör kararıyla `python tools/schema_migrate.py down --allow-destructive` biçiminde çalışır; uygulama sürümü de aynı anda uyumlu önceki sürüme döndürülmelidir.

## Tarayıcı E2E

Playwright gerçek tarayıcı E2E testi sonraki QA adımıdır. ChatGPT çalışma ortamındaki Chromium yerel adresleri yönetici politikasıyla engellediğinden burada zorunlu CI testi haline getirilmedi. Yerel makinede Playwright kurulursa Oyna/Profil/İstatistikler/Ayarlar gezinmesi ayrıca gerçek Chromium üzerinde otomatikleştirilebilir.


## Beta.7 Windows telemetri doğrulaması

`TEST_ET.bat` artık çalışan Uvicorn sunucusuna eşzamanlı operation/stability snapshot istekleri gönderir. Bu adım Windows'ta daha önce görülen `.tmp` / `.bak.tmp` dosya kilidi yarışını doğrudan yakalamak içindir.

QA raporunda `concurrent_audit_snapshots` satırı `ok: true` olmalıdır.
