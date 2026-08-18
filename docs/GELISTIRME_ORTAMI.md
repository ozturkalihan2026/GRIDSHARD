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

## Alembic neden eklenmedi?

Mevcut Beta sürümü ilişkisel veritabanı/Alembic migration altyapısı kullanmıyor; oyuncu ve telemetri kalıcılığı mevcut dosya tabanlı katman üzerinden ilerliyor. Alembic'i şimdi eklemek test hızını artırmaz, aksine kullanılmayan bir migration katmanı yaratır. Kalıcı ilişkisel veritabanına geçme kararı alındığında Alembic aynı paket içinde eklenmelidir.

## Tarayıcı E2E

Playwright gerçek tarayıcı E2E testi sonraki QA adımıdır. ChatGPT çalışma ortamındaki Chromium yerel adresleri yönetici politikasıyla engellediğinden burada zorunlu CI testi haline getirilmedi. Yerel makinede Playwright kurulursa Oyna/Profil/İstatistikler/Ayarlar gezinmesi ayrıca gerçek Chromium üzerinde otomatikleştirilebilir.
