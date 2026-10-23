# Kullanılmayan görsel çalışma kodu temizliği — 22 Ekim 2026

Kapsam: mevcut katmanlı/çizilmiş arayüzü korumak; yalnız referansları
doğrulanan eski çalışma yollarını ve mükerrer efekt sahiplerini kaldırmak.
Sunucu oyun kuralları, bakiye/ödül sahipliği, Billing, iade politikası ve
kurulu sürümlerin `/health` uyumluluğu değiştirilmedi.

## Kaldırılan eski 3B deneyi

`DEVICE_3D_ENABLED=false` idi; buna rağmen üç eski betik açılışta yüklenip
ayrıştırılıyor, uygulama her karede sahte/no-op çiziciye çağrı yapıyordu.
Artık tek çizici `module-device-art.js` + `module-layer-data.js`.

Silinen sekiz takipli dosya (Git geçmişinden geri alınabilir):

- `client/src/battle/laser-3d-pilot.js`
- `client/src/battle/device-models-extended.js`
- `client/src/battle/device-reference-details.js`
- `client/tests/laser-3d-pilot.test.js`
- `tools/preview-device-3d.cjs`
- `tools/preview-laser-3d.cjs`
- `tools/audit-module-device-art.cjs`
- `tools/audit-module-vfx-v14.cjs`

Son iki denetim tarihsel prototipin dosya sayılarını, eski stil sırasını ve
3B çizicinin yüklenmesini zorunlu tutuyordu; CI tarafından kullanılmıyordu.
Güncel doğrulama `client/tests`, üretim paketleme sözleşmeleri ve E2E'dir.
Eski çizici testindeki hâlâ geçerli boyut kontrolü aktif kare döngüsü
testlerine taşındı. Yeni `legacy-battle-runtime.test.js`, eski çizicinin
yüklenmediğini ve yeni resimli çizicinin bağlı kaldığını denetler.
Eski tarihli tasarım belgeleri geçmiş kaydıdır; bu belgelerdeki silinmiş
prototip komutları artık güncel çalıştırma talimatı değildir.

## Çalışma sırasında temizlenenler

- Savaş döngüsündeki `laser3DPilot` attach/detach/aim/render/invalidate/
  suspend çağrıları ve eski 3B anchor dalı kaldırıldı.
- Eski WebGL katmanı/hide-fallback CSS seçicileri kaldırıldı.
- Zaten geçersiz kılınan kaide salınımı ve bütün cihazı sıkan eski
  keyframe/delay kuralları kaynaktan silindi. Gerçek başlık nişanı/geri
  tepmesi ve kısa isabet ışığı korunur.
- Çekirdeğin çalışan taş etkinliği mevcut tek canvas sahibinde kalır;
  ikinci sonsuz CSS ışık saati ve boşta bobin titremesi kaldırıldı.
- Batarya/güçlendiricinin yeni VFX'i yanında aynı sunucu olayı için üretilen
  eski genel halka/bağ kaldırıldı. Diğer imza olayları korunur.
- Kapanmış açılışta `gs-boot-stripes` çizelgesi ölçümde hâlâ çalışıyordu.
  Artık kullanılmayan çizgili bar animasyonu kaynağında durduruldu; açılışın
  gerçek bekleme/solma süresi bittikten sonra alt animasyonları iptal edilir.
  Gizli ekranların CSS animasyon/geçişleri de açıkça durdurulur.
- Ses yöneticisinde hiç çağrılmayan iki ön yükleyici ve yalnız bu çağrılmayan
  yoldan dolabilen HTML ses havuzu kaldırıldı. HTML fallback sesleri zaten
  istek anında oluşturuluyordu; bu yol sadeleştirildi. Etkin Web Audio decode
  önbelleği, ses sınırları, katmanlar ve durdurma/arka plan temizliği korunur.

23 Ekim devamında referansı olmayan 11 uygulama işlevi de kaldırıldı:
`moduleUnlockRequirement`, `openGiftChest`, `createModuleEffectList`,
`createModuleIdentityPanel`, `createCompactIdentityPanel`,
`createModuleCounterGrid`, `appendCellDebris`, `deckDisplayName`,
`sabotageLabelForModule`, `heatStatusLabel`, `supportLabelForModule`.
Yalnız bunların ürettiği eski identity/counter/effect seçicileri silindi;
ortak kurallardaki etkin overview/stat seçicileri korundu. Çağrısız
`RelayPlayerDataSnapshotState` sınıfı/export'u ve boş uygulama örneği,
eski kullanılmayan çekirdek/görev simge tabloları da kaldırıldı.

Eski `lobby-backdrop` zaten kalıcı display:none idi ve JS tüketicisi yoktu.
20 eski ızgara hücresi, iki yörünge, çizgi çekirdek HTML'i ve bunların
CSS/keyframe/paralaks kuralları kaldırıldı. Güncel ana arka plan, fiziksel
çekirdek resmi ve deste düzeni değişmedi. Bu silmeler de Git farkından
incelenebilir/geri alınabilir. Etkin 44 betikte tek metinsel referanslı adlandırılmış
işlev ve üst düzey sabit taraması kalan bariz aday vermedi; bu muhafazakâr
tarama bütün program için kesin erişilebilirlik ispatı değildir.

Gizli menü/mesaj kutusu yeniden çizimleri, kozmetik önbelleği, mağaza saati ve
ziyaret profili yarışları için ek düzeltmeler ve kanıtlar:
`ARAYUZ_CALISMA_YUKU_DENETIMI_20261023.md`.

Son devamda eski `body::before` tam ekran 80px ızgara/maske kuralı da silindi.
Güncel opak zemin arkasında görünmüyordu; gerçek menü ve minimal sahne piksel
karşılaştırmasında kaldırılması 0 piksel fark verdi. WebKit tek noktalı
kontrolde ~10 -> ~19 FPS oldu. Güncel zemin kendisi korunur; görünümü değiştiren
tüm kök dekorları kapatma/katman zorlama deneyleri ürün koduna alınmadı.

Eski isimli her görsel silinmedi: dosya adının `v1/v3/Beta` olması onun
ölü olduğu anlamına gelmez. Güncel resimler, kayıtlı namlu/çıkış geometrisi,
gerekli okunabilir temel sunum ve etkin arayüzün kullandığı durum kuralları
korunur. Yerel üretim paketinde eski üç 3B betiği yoktur.

## CI / performans sonucu

İncelenen kırmızı çalışma: `023a1e8`, Actions koşusu `39715140349`.
Sunucu, istemci ve PostgreSQL/Redis/üretim imajı işleri başarılıydı.
Tarayıcı adımında 41 geçti / 1 başarısız: iPhone/WebKit savaş FPS bütçesi.
İlk denemede donma, tekrarında kare bütçesi ihlali vardı.

Windows WebKit'te aynı sahnenin betiksiz kopyasında da ~2–3 FPS ölçüldü;
animasyonlar duraklatılınca ~52 FPS oldu. Bu tanı, gerçek oynanış testi
yerine geçmez. Eski kod temizliği tek başına kalan FPS ihlalini çözmedi.
Aktif kayan savaş sayıları/tek-atımlı VFX kullanılmayan kod sayılıp körlemesine
silinemez; kalan maliyetin tek kaynağının bunlar olduğu gösterilmedi.
Sonraki tek görünür animasyon deneyi de yavaştı. Eski dekor kaldırma
deneyinde test noktasının da saydamlaşması sonucu etkiledi; o sonuç tek bir
dekor kuralının neden olduğuna kanıt olarak kullanılamaz.

Başarısız kırpma/paint-containment denemesi geri alındı. Geçici teşhis testi
son yamadan çıkarıldı. FPS/donma eşikleri gevşetilmedi, WebKit testi atlanmadı.
CI artık AI tarayıcı adımının JSON/ekran/rapor kanıtını yeniden bağlantı
testi dosyaları değiştirmeden önce, başarısızlıkta da saklar. Ölçüm günlüğü
yalnız performans sayaçlarını/animasyon adlarını içerir, satın alma jetonu
ve hesap erişim verisi içermez.

Son doğrulama ayrıntıları `CODEX_CHECKPOINT.md` içindeki bu temizliğin
başlığına yazılır. Temizlik tamamlanması CI'nın yeşil olduğu veya AAB /
sunucu yayınının yapıldığı anlamına gelmez.
