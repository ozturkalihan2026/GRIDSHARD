# 29 Ekim 2026 — telefon güncellemesi ve raf adları

Son paket bağlı telefondaki ayrı **GRIDSHARD TEST** uygulamasına kuruldu.
Paket kimliği `com.gridshard.localdebug`; üretim uygulaması veya Play yayını
bu çalışmada değiştirilmedi. Güncelleme `install -r` ile yapıldı.

## Son kurulu paket

- Mobil build: `ecdd1f3bedbf8345`.
- JavaScript: `gridshard-70ebb2d97dcdae3a.js`.
- APK: `.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk`.
- SHA256: `4DBB771DBB03C72DC97163B0067F1FDDCACBFF4736B90D1CE838649B518DD2E3`.
- JDK21/SDK36 ile çevrimdışı `assembleDebug` başarılı.
- 671 web dosyalı APK içerik, kimlik, API, ağ ve güvenli depo denetimi geçti.

Önceki savaş alanı değişiklikleri bu pakette mevcut: dört köşe kuleleri,
mavi tarafta üstte ince/altta kalın kuleler ve v7 tahta görselleri. Üçüncü
dakikadan sonra genel hasarı artırıp onarımı azaltan kuralın kaldırıldığı
motor, yalıtılmış yerel sunucuda çalışıyor. Bu tur yeni denge kuralı eklenmedi.

## Raf adları

Kullanıcı Güçlendirici gibi adların üç noktayla kesildiğini bildirdi.
İlk denenen iki satırlı düzen kullanıcı tarafından reddedildi; adın bölünmesi
ve görsel alanının daralması nedeniyle **geri alındı**. Son sürüm:

- Adlar tek satırda, 11 px yüksekliğindeki alt şeritte.
- Kart boyu 58 px; görsel iki kart satırını kapsayan önceki yerleşimde.
- Görselin üst kenarında kırpılmayı önlemek için bir piksel pay bırakıldı.
- Bu telefonda 5 px istenen yazının hesaplanan boyutu 8 px kaldı. Bu nedenle
  yalnız font küçültmeye güvenilmiyor: 8 px yükseklik korunuyor, gerektiğinde
  yazı ölçülerek yatayda kartın içine sığdırılıyor.
- Ölçüm tek canvas kullanır; raf kurulurken, yerleşim ve font yüklenmesi
  değiştiğinde çalışır. Sürekli animasyon veya ölçüm döngüsü eklenmedi.
- Raftaki mevcut kısa ad sözlüğü korundu; koleksiyon adları değiştirilmedi.

## Kontroller

- Son kaynaklarla 746 istemci testi geçti.
- 10 paketleme testi geçti. Sandbox'ın fixture rename/hard-link kısıtlarına
  takılan koşular normal izinlerle tekrarlandı; izinli koşular başarılı.
- Gerçek Capacitor WebView: 375×771 CSS px, DPR 3,25.
- Kurulu JS dosyası, yerel API ve test kancası bulunmaması doğrulandı.
- 36 kartın Akım maliyeti sunucu kanonuyla; birinci seviyedeki 35 kartın
  CAN/hasarı temel değerlerle eşleşti. Bir kart daha yüksek seviyede olduğu
  için birinci seviye temel değerle karşılaştırılmadı.
- Gerçek kısa AI savaşında raf düğmesiyle Lazer yerleştirildi.
- İki tahtada 15'er hücre, yatay taşma yok. Telefonun yüklediği tahta
  görsellerinin SHA256 değerleri kaynak v7 dosyalarıyla eşleşti.
- Altı gerçek raf adının tek satırlı görünümü ve kart görselleri incelendi.
  Görsel yüksekliği yaklaşık 48,15 px, ad şeridi 11 px, kart 58 px.
- Ayrıca 36 Türkçe raf adı için gerçek WebView/font üzerinde bir bileşen
  kontrolü yapıldı: üretimdeki sığdırma fonksiyonunun aynı kaynak kodu,
  normal kart alanı ve 32 px iç alan örneğinde çalıştırıldı. 72 örnekte
  taşma/kesilme yok. Bu, 36 kartın ayrı ayrı gerçek desteye alınarak
  oynandığı anlamına gelmez.
- JavaScript çalışma hatası yok. Kontrol maçı UI üzerinden bırakılıp sonuç
  akışından geçilerek uygulama ana ekrana döndürüldü. Bu kısa kontrolde
  doğal çekirdek yıkımı veya üçüncü dakikadan sonrası yeniden oynanmadı;
  önceki motor regresyonlarının yerine geçmez.

Kanıt: `artifacts/shelf-labels-single-line-20261029/result.json`,
`phone-battle.png`, `phone-result.png`, `phone-ready.png` ve `device-check.log`.
İki satırlı ve ara denemelerin çıktıları son sürümün kanıtı değildir.

## Kullanıcının denemesi

Uygulama ana ekranda bırakıldı. Test sunucusu bu bilgisayarda, yalnız
`127.0.0.1:8891` üzerinde; kalıcı test verileri
`.mobile-debug/runtime-no-overtime-20261028` içinde. USB reverse 8891 açık.
**Bu paketi denemek için USB bağlantısı ve bilgisayar açık kalmalı.**

Testte geçici kullanılan ekran açık kalma ayarı önceki `0` değerine
geri alındı; WebView denetim portu 9224 kapatıldı.
