# 2.5.0 — Reklam ve ödeme SDK'larını paket dışında tutma

14 Kasım 2026 kullanıcı kararı: yayımlanan **2.4.0 / versionCode 15** değiştirilmez.
Bu düzenleme **2.5.0** kapsamındadır; ayrı 2.4.1 paketi hazırlanmaz.
Mevcut 21 Aralık yayın hedefi ve 28 Aralık S2 başlangıcı korunur.

## Kaynak ve paket ayrımı

- `client/src/native-store.js`, reklam/satın alma Java şablonları, npm bağımlılıkları
  ve lockfile korunur. Sunucudaki doğrulama/iade kodları ve geçmiş işlem kayıtları silinmez.
- `config/mobile-distribution.json`, 2.5.0 ve sonrasının dağıtım politikasını belirler.
  Ortam değişkeniyle üretimde yeniden açılmaz; gelecekte açılması ayrı bir kod/politika kararıdır.
- Capacitor yalnız Secure Storage, App, Browser ve Push Notifications eklentilerini alır.
  Play Games, giriş ve bildirim tercihiyle çalışan Firebase korunur.
- Native Purchases ve AdMob eklentileri native bağımlılık listesine alınmaz.
  Doğrudan `play-services-ads` eklemesi, üretilmiş Ad Safety sınıfı/kaynakları ve
  Activity kaydı kaldırılır. Kanonik kaynak şablonları değişmeden kalır.
- Web/mobil derlemesi native mağaza köprüsünü birleştirilmiş JavaScript'e almaz.
  Oyun parası, ücretsiz mağaza, sandıklar ve sunucuda kazanılmış haklar çalışmaya devam eder.
- Manifest birleştirmesinde BILLING ve reklam/AdServices izinleri engellenir;
  AdMob başlangıç metadata'sı kaldırılır. Firebase otomatik başlatması kapalı kalır.

## Yayın kapısı

- [x] Sürüm sınırı, gerçek Capacitor eklenti çözümlemesi ve kaynakların korunması için otomatik kontroller eklendi.
- [x] 2.5 web derlemesinin mağaza köprüsünü dışarıda bıraktığı test ediliyor.
- [x] Son AAB denetimi paket sürümünü kendi HTML varlığından okur; 2.5+ için
  eklenti listesi, DEX sınıfları, obfuscation öncesi R8 mapping adları ve bütün
  modüllerin manifestlerini tarar. Eski 2.4 denetim beklentileri korunur.
- [ ] Son 2.5.0 imzalı AAB üretilecek ve `tools/audit_android_r8.py` PASS verecek.
- [ ] Gerçek telefonda giriş, Play Games, bildirim tercihi, ücretsiz mağaza,
  sandık açma ve eski hakların korunması doğrulanacak. Bekleyen eski satın almaların
  SDK olmadan otomatik kurtarılmayacağı dikkate alınarak eski işlem/iade desteği kabul edilecek.
- [ ] Play Console'da bütün gerçek para ürünlerinin kapalı olduğu, reklam beyanı,
  veri güvenliği ve mağaza metinleri kullanıcı tarafından doğrulanacak.
- [ ] 2.5.0 yayımlandıktan sonra herkese açık mağaza rozetleri yeniden kontrol edilecek.
  SDK temizliği tek başına Google'ın etiketi hangi anda kaldıracağını garanti etmez.

Bu dosya sunucu dağıtımı veya AAB üretimi yapıldığı anlamına gelmez. 2.4.0
imzalı dosyaları, tag'leri ve canlı oyuncu verileri korunur.

## Yerel doğrulama — 14 Kasım 2026

- Dağıtım politikası ve web derlemesi: 18 test PASS.
- Mevcut native reklam/görünüm/yön/Billing regresyonu: 21 test PASS.
- AAB denetimi, bağlı sürüm planı ve veri sınırı: 38 Python testi PASS.
- Mevcut rc.5 / 2.4.0 AAB, güncellenen R8 denetiminde 9 runtime eklentisiyle
  PASS; eski sürüme yeni SDK hariç tutma şartı uygulanmıyor.
- `git diff --check` PASS. GitHub CI çalıştırılmadı; bu sonuçlar yerel kontrollerdir.
