# Dört köşe ve uzatmasız savaş adayı

## Uygulananlar

Yeni gerçek oyun görselleri `client/assets/ui/battle-native-v7/` içinde.
CSS ve tarayıcı ön yüklemeleri bu sürüme bağlandı. Önceki görseller korundu.

Kullanıcının son düzeltmesi: **mavi tahtada üstte ince kule çifti, altta
kalın kule çifti**. Kalın kuleler silinmedi; iki çiftin yerleşimi değişti.
Kırmızı tahtanın dört köşesinde kırmızı/turuncu ışıklar, mavi tahtada yalnız
mavi/cyan ışıklar var. imagegen built-in düzenleme kullanıldı. Son istemler
ve kaynak kimlikleri `battle-native-v7/provenance.json` dosyasında.

Görseller çevrimdışı kayıt/format hattından geçirildi. Özgün oynanabilir5×3
zemin, bağlantılar ve çerçeve, kodun kullandığı1254birim kayıt sisteminde
korundu; rasterler1024×1024. Telefonda ek görsel katmanı/DOM/animasyon yok;
her devre hâlâ tek WebP. Mavi135.244bayt, kırmızı130.728bayt. Üst sınır
210KB/dosya ve360KB/toplam testleri geçti. `tools/build-corner-islands.cjs`
yalnız derleme aracıdır, oyun sırasında çalışmaz.

Üçüncü dakikada başlayan genel hasar artışı ve onarım azalması kaldırıldı.
Protokolde eski `overtime` alanı uyumluluk için etkisiz kalır:
active=false, çarpanlar1, başlangıçnull. Uzatma olayı, uyarısı ve saat rengi
artık tetiklenmez. Süre sağlıklı çekirdeği açığa çıkarmaz/aşındırmaz.

Uzatmaya bağlı üç çekirdek yeteneği boşta bırakılmadı: aynı kayıtlı seçimler
ve%20koruma korunarak **CAN%40 ve altı** koşuluna geçirildi. Açıklamalar ve
yetenek kanonu eşlendi. İç kanca adı kayıt uyumluluğu için tarihsel adını
korur; artık3dakika koşulu yok.

## Doğrulama

- 1.969 sunucu testi geçti;44koşullu dış ortam testi atlandı.
- 746istemci ve10paket testi geçti. Son görsellerle6zemin testi tekrar geçti.
- 179,9/180/600/900saniyede gerçek saldırı ve onarım miktarlarının sıfırıncı
  saniyeyle aynı olduğu davranış testleri var. Uzatma olayı çıkmıyor.
- AndroidChrome ve WebKit'te gerçek yerel sunuculu tahta/kamera/dokunma testi
  geçti;320/393px dahil ekran görüntüleri gözle incelendi.
- 25deste/36kart,1/8/15seviyede taraf değiştirilen1.800motor koşumu yapıldı.
  Gözlem15dk; bu değer oyun sonu sınırı değildir. Medyanlar146,35/147,15/
  112,75sn; p90=322,8/332,4/178,5sn. 1.787maç gözlem içinde bitti.
  Seviye1/8/15'te8/5/0maç900snsonunda sürüyordu. Bazıları çekirdek hasarı
  almaya devam ediyor; bazıları yıkım/yeniden kurulum döngüsünde. Sonsuzluk
  ispatı değil, uzun döngü riski. Saat cezası geri eklenmedi.

Kanıt: `artifacts/four-corners-no-overtime-20261028/`.
Uzayan onarım düzenleri için açık taktik karşılık ve ayrı prototip önerisi
`ENERJI_VE_MODUL_TASARIM_ONERISI_20261028.md` belgesinde. Enerji/ısı bu tur
kaldırılmadı, kartlar veya oyuncu yatırımları silinmedi.

## Paket ve telefon durumu

Yeni GRIDSHARD TEST paketi **hazır**, build `974dac4246b0b5af`, SHA256:
`06C47AEABFE8302B263EBC56DD4A010EFE69A0D56297CEFBEF9D67EB958BD1D3`.
AssembleDebug ve671dosyalı APK denetimi geçti. APK:
`.mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk`.

**Henüz telefona kurulduğu iddia edilmemeli:** kullanıcı telefonu bağladığını
söyledi ama son kontrollerde ADB ve Windows cihazı algılamadı. USB/dosya
aktarımı için kullanıcı yanıtı bekleniyor. Son fiziksel olarak doğrulanan
kurulu paket önceki `ddd44b832480e8ad`; yeni görsel/istemci henüz cihazda
doğrulanmadı. Bu tur USBstayon değişikliği yapılmadı; cihaz yoktu.

Yerel8891test sunucusu yeni motorla yeniden başlatıldı,PID13764. Önceki
yalıtılmış test profilleri silinmeden `.mobile-debug/runtime-no-overtime-20261028`
klasörüne kopyalanarak korundu. `tools/e2e_server.py --runtime-dir` yalnız
bu projenin `.mobile-debug` altını kabul eder; normal tarayıcı koşularının
varsayılanı hâlâ yeni geçici depodur. Canlı/Play/üretim uygulaması değişmedi.
