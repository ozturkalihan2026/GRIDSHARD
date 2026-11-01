# 28 Ekim — kalıcı çekirdek enkazı ve görünüm düzeltmesi

Önceki turdaki düz renk rakip kimlik katmanı, devrenin iki yanındaki
yükselen blokları da kapatıyordu. Katman yeniden saydam yapıldı; asıl
blokları taklit eden ek `::after` uçurum katmanı kapalı kaldı. Böylece
adın/kartların arasındaki doğal boş alan koyu arena rengini gösteriyor,
yan kuleler asıl resimleriyle görünür kalıyor.

Sonuç ve “Savaş Ödülleri” başlıkları 4 px aralıklı tek başlık grubuna alındı.
Eski blok düzeninden kalmış 12 px alt başlık marjı ve -10 px taşıma
kaldırıldı. Yazı boyutları büyütülmedi. Başlık grubu ile ödüller arası 12 px;
ödül/Premium/reklam bölmeleri arasındaki 12 px boşluk korundu.

Çekirdek enkazının kaybolmasının nedeni `board-view.js` içindeki yalnız
`active` modülleri gösteren hücre seçimi idi. Gerçek sunucu yıkımında durum
`destroyed`, konum da boş olabildiğinden çekirdek kartı hücreden çıkıyordu.
Çizici artık yalnız yıkılmış çekirdek için eski konumu veya sabit merkez
hücresini (2,1) kullanıyor. Otoriter durum/konum değiştirilmez; diğer yok
edilmiş modüller yine kaldırılır. Aynı kart/hücre korunur, yeniden doğum
sağlam resmi geri getirir. Hasar, maç sonucu, ekonomi ve sunucu kuralları
değişmedi.

## Testler

- İki regresyon testi önce enkazın kaybolduğunu göstererek başarısız oldu;
  düzeltmeden sonra geçti. Konumsuz yıkım, tekrar çizim, yeniden doğum,
  terminal görüntüden doğrudan kurulum ve yok olmuş silahın kaldırılması var.
- 746 istemci testi ve 10 web paketleme testi geçti.
- Android Chromium ve Windows WebKit'te yeni gerçek sunucu testi geçti:
  savunmasız çekirdeğin gerçekten yıkılması beklendi; sonuç panelinde ve
  ödül aşamasında enkaz hücrede kaldı, canlı ışık taşımadı. Başlık arası4px,
  ödül listesine mesafe12px doğrulandı. Bu test eski görsel HP önizlemesi
  testinden farklı olarak gerçek sunucu yıkımını kullanıyor.
- AssembleDebug ve 671 dosyalı APK içerik/kimlik/API/ağ denetimi geçti.
  Mobil build `7c6b64bdbf721cd7`; APK SHA256
  `A96CB971A154DCD3751737F493CD6222013521457CEC3D935AD8106E6B77780D`.
- Güncel APK `com.gridshard.localdebug` üzerine veri silmeden kuruldu.
- Kullanıcı kilidi açtıktan sonra **fiziksel Android WebView testi de geçti**:
  gerçek savunmasız çekirdek yıkımında enkaz merkez hücrede (2,1) kaldı,
  `cores-wrecked-v1/core_resonance.webp` gösterildi, canlı ışık yoktu.
  Enkazın ödül aşamasında da korunduğu doğrulandı. Başlık arası4px,
  ödüllere mesafe12px, teklif aralıkları12/12px; taşma ve JS hatası yok.
  Asıl yan kuleler görünüyor, tekrarlı arka bloklar ve örten renk katmanı yok.
  Üç doğrudan ADB ekran görüntüsü görsel olarak incelendi. Enkaz fotoğrafı
  için sonuç paneli geçici gizlenip hemen geri getirildi; ürün akışı değişmedi.
  Telefon ana ekranda bırakıldı, geçici USB ekran-açık ayarı eski0 değerine
  döndürüldü, CDP9224 kapatıldı; kullanıcı için USBreverse8891 korundu.

Kanıt: `artifacts/core-wreck-title-fixes-20261028/`; `client.log`,
`packaging.log`, `browser/`, `webkit/`, `native/result.json`,
`native/phone-battle-side-towers.png`, `native/phone-persistent-wreck.png`,
`native/phone-compact-rewards.png`. Native tekrar aracı
`tools/check_native_core_wreck.cjs`; yalnız ayrı test APK'sı ve yalıtılmış
yerel 8891 sunucusunu kullanır. Canlı/Play yayını değiştirilmedi.
