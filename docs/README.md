# GRIDSHARD — güncel belge dizini

4 Kasım 2026. Çalışmaya bu dizinden başla. Aktif sürüm geliştirmesi **2.4.0**;
2.3.0/code14 yayını kullanıcı tarafından teyit edilmiştir. Planlanan özellikler,
gerçekten uygulanıp kanıtlanana kadar oyunda mevcut sayılmaz.

## Plan ve takip

- [Sürüm uygulama rehberi](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md):
  2.4–2.9 tarihleri, ayrıntılı içerik, dosyalar ve iş sırası.
- [2.4.0 uygulama briefi](planning/releases/2.4.0.md).
- [Checklist](GRIDSHARD_GELISIM_CHECKLIST_20261103.md) ve
  [görev kaynağı](planning/gridshard_development_backlog_v1.json).
- [Ödül portföyü ve takvim](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md),
  [takvim kaynağı](planning/release_calendar_v1.json).
- [Teknik tasarım](GRIDSHARD_GELISIM_PROJESI_TEKNIK_TASARIM_20261103.md).

## Geçerli oyun ve sunum

- [Oyun kuralları ve kaynak önceliği](OYUN_KANONU.md).
- [Akım V8](AKIM_V8_ANA_OYUN_VE_EGITIM_20261101.md).
- [Modül V7 tasarım kararı](NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md),
  [makine tarafından okunan sözleşme](NIHAI_MODUL_ENDERLIK_YETENEK_V7.json),
  [yetenekler](YETENEK_KANONU.md).
- [Ortak sanat yönü](SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md),
  [görsel üretim akışı](GORSEL_DONUSUM_PLANI_20261015.md),
  [ses yönü](AUDIO_DIRECTION.md), [mobil ses hattı](MOBILE_AUDIO.md).

## Geliştirme ve işletim

- [Geliştirme ve test](GELISTIRME_ORTAMI.md), [web/mobil derleme](CLIENT_BUILD.md).
- [Üretim sunucusu](SERVER_PRODUCTION_RUNBOOK.md),
  [oyuncu veri otoritesi](PLAYER_DATA_AUTHORITY.md),
  [şema geçişleri](JSON_SCHEMA_MIGRATIONS.md).
- [Mobil yayın](MOBILE_RELEASE_RUNBOOK.md), [Android kurulum](ANDROID_PRODUCTION_SETUP.md),
  [güncelleme stratejisi](MOBILE_UPDATE_STRATEGY.md).
- [Mağaza ve ödeme](STORE_PURCHASES.md), [Play incelemesi](PLAY_REVIEW_ACCESS.md),
  [çocuk kullanıcı denetimi](CHILD_AUDIENCE_AUDIT.md),
  [gizlilik/saklama işletimi](PRIVACY_RETENTION_OPERATIONS.md).

Eski kararlar ve emekli test gövdeleri çalışma ağacında tutulmaz; gerektiğinde
Git geçmişinden incelenir. Test dosyasının adındaki eski bir sürüm numarası,
testin geçersiz olduğunu göstermez. Güncel davranışı koruyan regresyonlar aktiftir.

`qa_reports/`, `test-results/` ve `playwright-report/` yeniden üretilen yerel
çıktılardır. Eski bir PASS raporu yeni kaynak sürümünün test sonucu sayılmaz.
