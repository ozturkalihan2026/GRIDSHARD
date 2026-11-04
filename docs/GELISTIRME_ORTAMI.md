# GRIDSHARD — geliştirme ve doğrulama

Güncel başlangıç [belge dizini](README.md), iş sırası [sürüm rehberidir](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md).

## Yerel çalışma

`BASLAT_WEB_TEST.bat` veya `BASLAT_WEB_TEST.sh` yerel sunucuyu başlatır.
Varsayılan adres `http://127.0.0.1:8000/`; scriptin yazdığı adresi esas al.
Eski `/web-test` yönetim ekranları ve laboratuvar test koşuları kaldırılmıştır.

## Kontroller

```powershell
python tools/check_imports.py
python -m pytest server/tests tools/tests
pnpm test:client
pnpm test:build
pnpm build:web
```

Python için sunucu test bağımlılıklarının kurulu olduğu `.venv` kullanılır;
testlerin import yolu `server/pytest.ini` ile sağlanır. PostgreSQL/Redis gibi gerçek
servis senaryoları ilgili test ortam değişkenleri ve CI servisleriyle çalışır.
Tam kapılar `.github/workflows/quality.yml` içindedir. Tarayıcı testleri
`pnpm test:e2e`; gerçek cihaz kabulü otomatik testten ayrıca kaydedilir.

Plan dosyaları için üç plan aracının `--write` ve `--check` adımları rehberdedir.
`qa_reports/`, `test-results/`, `playwright-report/`, `dist/` ve `build/` yerel üretilen
çıktılardır; yeni test kanıtı eski rapordan devralınmaz. Oyuncu verisi/sırlar bu
çıktılardan ayrıdır. Yayın için [mobil rehber](MOBILE_RELEASE_RUNBOOK.md) ve
[üretim sunucusu rehberi](SERVER_PRODUCTION_RUNBOOK.md) kullanılır.
