# 20 Ekim 2026 — CI sözleşmelerini güncel uygulamayla eşleştirme

İncelenen commit: `833b9f366df84345aa51853c8bbc2f51b210d22e`.
Başarısız koşu: [GRIDSHARD Quality #59](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/39428824383).

## Düzeltmeler

- Onaylı fiziksel WebP simgeleri, yeni amblem, SAVAŞ dock etiketi, ikonlu takım
  sekmeleri ve eklenen v8–v15 stilleri eski SVG/metin beklentilerinin yerine
  doğrulanıyor. Varlıkların dosyada bulunması ve güvenli işaretleme korunuyor.
- Kısa modül/çekirdek kartları; tam açıklamanın title alanı, İstatistik'teki
  imza ve sayısal değerler, dil geri dönüşleri ve yükseltme göstergeleriyle
  birlikte kontrol ediliyor. Eski uzun bilgi paneli geri getirilmedi.
- Devre yolunda alınabilir sandığa doğrudan dokunma; diğer sandıklarda
  fare/kalem/odak önizlemesi ve mesaj kutusundaki işlem kilitleri doğrulanıyor.
- Sunucu statik istemci kontrolleri v17 ses, shield_absorb ve mevcut SAVAŞ
  etiketine uyarlandı. Savaş/ödül/ödeme kuralları değiştirilmedi.
- PostgreSQL işlem testi, oyun içi parayla alınan sandığın doğrudan açılması ve
  satın alım bildirimi üretmemesi kararına uyarlandı. Hata enjeksiyonuyla geri
  alma, kalıcı bakiye/ödül/makbuz, kapalı stok bırakmama ve tekrar isteğinde
  aynı sonucu koruma kontrolleri duruyor.
- Tarayıcı atmosfer testi yeni resimlerin yüklenmesini, farklı dock varlıklarını,
  seçili etiketin görünmesini, ortak turnuva yüzeyini ve farklı amblemleri
  doğruluyor. Eski `.de-body` SVG düğümlerine erişmiyor.
- Savaş geri bildirim testi, geri sayımı bekleyip perspektifli tahtanın boş
  sınır köşesi yerine gerçek hücre merkezine normal tıklıyor. `force` veya
  yapay DOM tıklaması kullanılmadı; üretim yerleşimi değiştirilmedi.

## Yerel doğrulama

- İstemci: **597 geçti, 0 başarısız**.
- Sunucu: **1590 geçti, 44 atlandı**. Atlananlar koşullu dış servis/gerçek DB
  kontrolleridir; bu sonuç PostgreSQL/Redis doğrulaması yerine geçmez.
- Paketleme sözleşmeleri: **10 geçti**; Billing'in dört kontrolü de istemci
  toplamına dahil ve başarılı. Geçici dosya hard-link/rename işlemlerinin
  sandbox engeli, yalnız yalıtılmış testleri izinli çalıştırarak aşıldı;
  testler gevşetilmedi veya atlanmadı.
- Operatör/yayın araçları: **22 geçti**.
- Python import taraması: **408 dosya, 0 sorun**.
- İki değişen E2E dosyasının JavaScript sözdizimi kontrolü ve `git diff --check`
  başarılı. Kalıcı kart DOM'u ve çeviri gözlemcisi yalıtılmış kontrolleri başarılı.
- Güncel kaynaklardan gerçek web derlemesi başarılı: **611 varlık**,
  build ID `0e58271a56e0faa5`. Doğrulama çıktısı
  `artifacts/ci-fix-20261020/web-Evhl9d/dist/`; kullanıcının mevcut `dist/`
  çıktısına dokunulmadı.

Sunucu testleri mevcut, bağımlılıkları tamam olan
`artifacts/billing-activation-20261010/venv/Scripts/python.exe` ile çalıştırıldı.
Global Python ortamında `google-auth` eksik, kökteki `.venv` içinde pytest yok;
bu ortam eksiklikleri ürün kodu değiştirilerek gizlenmedi.

## Kalan doğrulama / sınır

Gerçek PostgreSQL/Redis servisleri ve Playwright oyun E2E takımı yerelde
çalıştırılmadı; kullanıcı commit/push yaptıktan sonra GitHub CI bunları yeniden
doğrulamalı. CI henüz yeşil diye raporlanamaz. Canlı sunucu, mağaza, ödeme,
AAB veya site yayını değiştirilmedi. Commit/push kullanıcıda.
