# GRIDSHARD — güncel çalışma durumu

4 Kasım 2026. Başlangıç: [belge dizini](docs/README.md).

## Depo ve yayın

- İş bilgisayarı: `D:/Projects/GRIDSHARD`; mevcut dal `main`.
- Kullanıcı yerel/uzak eşitlemesini bildirdi; önce `git status` ile güncel durumu kontrol et.
- Son teyit edilen yayın 2.3.0/code14. Play yayını kullanıcı beyanıdır;
  ayrıca fiziksel cihaz kabulü bildirilmedi. [Teyit](docs/planning/release-230-user-confirmation-20261103.md).
- Aktif hedef 2.4.0; bu turda oyun mekaniği, canlı veri, AWS veya AAB değiştirilmez.

## Güncel karar ve çalışma sırası

- [Bağlı sürüm rehberi](docs/GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md),
  [2.4.0 briefi](docs/planning/releases/2.4.0.md),
  [checklist](docs/GRIDSHARD_GELISIM_CHECKLIST_20261103.md).
- 2.4.0: mevcut 24 modülle S1; 40 kademe/kaynak bütçesi, açık kaynak haftaları,
  tekil kozmetik tahsisi, kazanılmış hakların kapanış/restore koruması ve eski istemci uyumu.
- Zorunlu sunum işleri: UI-07 bütün geri/ileri gezinme kontrollerinde son sarı tasarım;
  AUDIO-01 saldırı VFX ses kapsamı/cızırtı; AUDIO-02 çekirdek aktivasyon/etki sesleri.
  Kullanıcı bildirimi henüz doğrulanmış teknik teşhis değildir; bu işler uygulanmadı.
- Önce BASE-01, UI-07/AUDIO-01 envanteri; sonra S1 sözleşmesi/teslim ve AUDIO-02;
  sonrasında COMPAT-01 ve yayın kabulü. Gelecek sezon sanatını ilk iş diye başlatma.
- Hedef yayın 23 Kasım, S1 30 Kasım 03.00 TR. Ek yük için 6 Kasım kapasite kontrolü;
  riskte tarih yeniden karara bağlanır, kalite işleri sessizce çıkarılmaz.
- S2+ yeni hazır modül gerektirir. Planlı kayıt hazır içerik değildir; eski koleksiyon
  başka dönem/mağazada tekrar sunulmaz. Takım açılışı kişisel sezondan bağımsızdır.

## Kaynaklar ve doğrulama

- [Backlog](docs/planning/gridshard_development_backlog_v1.json): görev durumu/bağımlılık/kabul/kanıt.
- [Takvim](docs/planning/release_calendar_v1.json): tarihler, alt paketler, çalışma aralıkları.
- `python tools/development_checklist.py --write`, `python tools/release_calendar.py --write`,
  `python tools/release_delivery_plan.py --write`; ardından her biri için `--check`.
- 68 görev, 26 alt paket, altı brief; yeni özellikler plan yazıldığı için tamamlanmaz.
- Geçerli oyun: [oyun kanonu](docs/OYUN_KANONU.md), Akım V8, modül V7 ve mevcut kaynak/testler.
  Sanat yönü: [ortak kabul](docs/SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md).
- Eski checkpoint, devir kayıtları, emekli test gövdeleri ve eski raporlar Git geçmişindedir.
  Geçmiş PASS sayılarını yeni commit'in kanıtı olarak kullanma.

## 4 Kasım temizlik doğrulaması

- Eski karar/test arşivleri ve tarihsel QA raporları kaldırıldı; geçerli regresyonlar korundu.
  Salt eski raporu okuyan test, yeni eksik/atlanmış kanıtın PASS olamadığı izole testlere çevrildi.
- Bu tur: sunucu/araç Python testleri **1994 geçti, 44 dış servis senaryosu atlandı**;
  istemci **765**, JS derleme/site/araç **38** geçti. Üretim web derlemesi,
  462 dosyalık import denetimi, üç plan kontrolü ve yerel belge bağlantıları geçti.
- Font TTF aslı `native-assets/fonts/Rowdies-Bold.ttf` altında korundu;
  eski önizleme testi kaldırıldı, aktif gömülü font testleri korundu.
