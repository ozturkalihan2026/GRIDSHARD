# Gerçek Web Testi — Yerel Çalıştırma

Bu paket tek sunucu modeliyle hazırlanmıştır. FastAPI hem API/WebSocket uçlarını hem de `client/` Web arayüzünü aynı origin altında servis eder.

## Windows

Proje klasöründe:

`BASLAT_WEB_TEST.bat`

İlk çalıştırmada `.venv` oluşturulur ve `server/requirements.txt` kurulur. Sonraki çalıştırmalarda mevcut sanal ortam kullanılır.

Tarayıcı adresi:

`http://127.0.0.1:8000/`

## Test koşusunun başlaması

Tarayıcı ilk teknik kontrolleri tamamlar. Preflight ve launch-readiness hazır olduğunda aktif `test_run_id` için `/web-test/test-run/start` idempotent olarak çağrılır. Aynı koşu ikinci kez başlatılırsa yeni run-start kaydı üretilmez.

Teknik durum alanında en az şu göstergeler izlenebilir:

- Sunucu / Oyna hazırlığı
- Preflight
- Gerçek Test: Başlatıldı
- Operasyon Durumu
- Stabilite
- İzleme: operasyon + stabilite + audit tamamlanma oranı

## Kapsam

İlk gerçek Web testi kapsamındaki ana menü:

- Oyna
- Profil
- İstatistikler
- Ayarlar

Eğitim alanı bilinçli olarak bu test kapsamının dışındadır.
