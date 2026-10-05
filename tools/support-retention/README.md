# GRIDSHARD destek saklama otomasyonu — güvenli kaynak / etkin özel kurulum

Yalnız **gridshardgame@gmail.com** için Google Apps Script kaynaklarıdır.
Yerel mock testleri gerçek Gmail erişimi, izin veya çalışır zamanlayıcı kanıtı
değildir. Bu kaynakları Cloudflare Pages'e yüklemeyin; public-site builder bunları
izin listesine almaz. Mevcut Play Games/Google Cloud projesine bağlamayın.

## Davranış ve sınırlar

- Varsayılan `dryRun: true`: e-postaları, etiketleri veya kayıtları değiştirmez;
  kalıcı silme ve zamanlayıcı etkin değildir. Ayrı `prepareSupportLabels`
  yalnız üç etiketi oluşturur; e-posta silmez.
- Bir talebi kapatırken Gmail'de ilgili konuşmaya `GRIDSHARD_SUPPORT_CLOSE`
  etiketi uygulanır. Etkin günlük iş bunu kapanış isteği olarak işler,
  kapanış zamanını ve o anki mesaj kimliklerini özel Script Properties'e kaydeder,
  `GRIDSHARD_SUPPORT_CLOSED` etiketi koyar. Süre kaydedilen kapanıştan başlar.
  Kapanışı tahmin etmek için e-posta içeriğini taramaz.
- Kayıtlı kapanıştan **90 gün dolduktan sonraki günlük çalışmada** yalnız bu
  mesajlar kalıcı silinir. Gmail Çöp Kutusu'ndaki ilgili mesajlar da kapsanır;
  bütün posta kutusu veya bütün Çöp Kutusu boşaltılmaz. Eski, etiketsiz mesajlar
  kendiliğinden kapsam içine alınmaz.
- Yeni mesaj varsa talep yeniden açılır; tekrar çözülüp kapatılana kadar silinmez.
  Son kontrolden sonra bir yanıt gelse bile yalnız eski kayıtlı mesaj kimlikleri
  silinir, yeni yanıt silinmez. Tüm konuşmayı topluca silme çağrısı yoktur.
- Kapanış tarihini keyfi yenilemez. API kısmi başarısızlığında kalan mesajlar
  aynı eski tarihle yeniden denenir; yanlış hesap veya kayıt/limit hatası silmeyi
  durdurur. Günlük tetikleyici arızaları ve limitler operatörce izlenmelidir.
- Kaynak günde en fazla50 kayıt/100 mesaj işler. Sürekli yüksek hacim veya
  daha büyük taleplerde bu limit ve takip düzeni yayıncıyla yeniden tasarlanır;
  süre garantisi verilip backlog gizlenmez. Dışa aktarılmış ek kopyaları silmez.

## İzin uyarısı — kurulumu yayıncı yapar

Google kalıcı mesaj silme için **`https://mail.google.com/` tam Gmail kapsamını**
zorunlu tutar. Bu, yalnız bir etikete teknik olarak sınırlandırılmış OAuth izni
değildir: kapsam geniştir; daraltma kaynak kodundaki hesap/etiket/kimlik
kontrolleriyle yapılır. Publisher bu riski açıkça kabul etmeden izin vermeyin.
Şifre, MFA kodu veya token sohbete/Git'e konmaz. Kaynak Google'daki yayıncının
özel projesinde kalır; web app olarak Deploy veya herkese açma yapılmaz.

## Adım adım kurulum — özel kurulum etkin, yerel şablon silmesizdir

1. Destek hesabıyla [Google Apps Script](https://script.google.com/) içinde
   yalnız bu iş için özel bir script oluşturun. Hesabın destek hesabı olduğunu
   doğrulayın; yanlış hesapta script çalışmayı reddeder.
2. `Code.gs` içeriğini ve Project Settings üzerinden gösterilen
   `appsscript.json` manifestini aktarın. Manifestin Gmail advanced service
   v1 kaydını ve Europe/Istanbul zaman dilimini kontrol edin.
3. İzin ekranında geniş Gmail erişimini inceleyin; yetkiyi yayıncı kendisi
   verir. Google'ın güvenlik uyarılarını agent otomatik geçmez.
4. `prepareSupportLabels` çalıştırın. Sonra `runSupportRetention` deneme
   modunda çalıştırılıp hata vermediğini ve henüz silme yapmadığını doğrulayın.
   Bir kişisel veri içermeyen test konuşmasına CLOSE etiketi verip kuru çalışma
   sonucunda `closureRequests: 1` görülmesini kontrol edin; bu aşamada kayıt
   veya mesaj değişmemelidir. Gerçek müşteri mesajlarında eski tarih uydurmayın.
5. Kalıcı silme geri alınamaz. Risk ve kapsam ayrıca onaylandıktan sonra yayıncı
   `dryRun: false` ve tam `requiredConfirmation` değerini `confirmation`
   alanına yazar. İlk etkin çalışmanın doğru destek hesabında, yalnız seçilen
   kapanış isteklerini kaydettiğini ve beklenmedik silme yapmadığını doğrular.
6. Yayıncı `installSupportRetentionTrigger` çalıştırır. Triggers sayfasında
   tek `runSupportRetention` günlük işi görülmelidir. Zamanlı işler yaklaşık
   bir saat aralığında çalışabilir; tam saniyede silme garantisi verilmez.
   Executions/hata bildirimleri ve backlog düzenli izlenir.
7. Gerçek kurulum/izin/deneme/tetikleyici kanıtı ve destek dışındaki kopyaların
   kapsamı doğrulanmadan site `supportVerified` true yapılmaz. Yedek30 gün
   düzeni ayrıca AWS'de doğrulanmalı; Gmail kurulumu onun yerine geçmez.

5Ekim ilk kurulum denemesi: dashboard ve Drive'da doğru destek hesabı seçili
olmasına rağmen normal Create yönlendirmesi dosya-açma hatası, Drive üzerinden
Create ise diğer hesapta oluşturma hatası verdi. Yeni proje/kod/izin/etiket/
mesaj/trigger kurulmadı; gerçek dry-run yok. Çoklu Google girişini agent
logout/credential işlemleriyle düzeltmez. Yayıncı yalnız destek hesabının
açık olduğu oturumda editörü açmalıdır. Bu ilk engel sonraki tek-hesap adımında aşıldı.

**5Ekim13:30TR gerçek kurulum durumu:** Kullanıcının “hazır” cevabından sonra
yalnız destek hesabıyla özel **GRIDSHARD Support Retention** projesi oluşturuldu.
`Code.gs` içeriği editörde `Kod.gs` olarak ve manifest `appsscript.json` olarak
kaydedildi. Sayfa yeniden yüklenip kaynak normalize metin ve manifest yapısı
okunarak doğrulandı: Gmail advanced v1, V8, Europe/Istanbul, açık kapsamlar.
Varsayılan ayrı Cloud projesi korundu, Play Games'e bağlama/Deploy/paylaşım yok.
`prepareSupportLabels`13:29:03 başarıyla bitti; ardından `runSupportRetention`
13:30:31 başarılı: `dryRun:true`, tüm sayaçlar0, `deletedMessages:0`.
Google izin formu/onay eylemi gözlenmedi; agent izin ekranına tıklamadı.
Başarılı Gmail çağrıları erişimin çalıştığını doğrular. Gerçek müşteri mesajı
etiketlenmedi; kapsamda kapalı talep yok. Dolu talep/90gün expiry/silme dalı
yalnız mock testlerle doğrulandı (**11/11**), canlıda denenmedi.
`dryRun:true` ve `confirmation:''` korunur; trigger işlevi çalıştırılmadı.
Tetikleyiciler ekranı/kişisel-verisiz receipt ignored operator artifacts'tadır;
özel proje bağlantısını public-site veya Git'e koymayın.

**5Ekim15:26TR etkinleştirme:** Kullanıcı geniş OAuth kapsamı/geri alınamaz
silme/dar etiket-kayıt sınırı açıklandıktan sonra **“Evet, bu kapsamda günlük
görevi etkinleştir”** dedi. Destek yazışmalarının yalnız Gmail'de tutulduğunu,
dış kopya olmadığını ayrıca teyit etti. Özel script'te yalnız dryRun false ve
tam confirmation yazılıp kaydedildi; yeniden yükleme sonrası normalize metin
eşleşti. **Bu depodaki Code.gs varsayılan dryRun true/confirmation boş güvenli
şablon olarak kalır.** Canlı çalışan işi yeniden kurulum sanmayın veya şablonu
haber vermeden canlıya tekrar yüklemeyin.

İlk etkin runSupportRetention15:23:56–15:24:00 başarılı: dryRun false,
bütün sayaçlar0, deletedMessages0. Installer15:26:01–15:26:02 başarılı;
UI'de tek günlük runSupportRetention / Ana / Zaman tabanlı tetikleyici.
Salt okunur edit ekranında04:00–05:00GMT+03 ve günlük hata bildirimi görüldü,
ayar değiştirmeden İptal ile kapatıldı. Script Europe/Istanbul'dadır.
Henüz ilk zamanlı çalışma veya gerçek90gün dolan talep/silme gözlenmedi;
bu dal mock11/11 ile doğrulanmıştır. Google izin formu/onay eylemi gözlenmedi,
agent izin ekranına tıklamadı; başarılı Gmail/ScriptApp çağrıları erişimi doğrular.

Yayıncı çözdüğü talebe GRIDSHARD_SUPPORT_CLOSE etiketi vermelidir. Worker
kapanışı günlük çalışmada kaydeder; etiketlenmemiş eski talepleri kapsamaz,
mesaj içeriğinden kapanış çıkarmaz. Google hata bildirimleri/Executions ve
limitler takip edilir. Dış kopya oluşursa aynı süreyle ayrıca yönetilir.
Özel proje/kanıt dosyaları ignored artifacts'tadır; web app Deploy/paylaşma,
Pages ZIP'e operator kodu veya özel metadata ekleme yapılmadı/yapılmaz.
`supportVerified` artık true: yalnız bu dar etkin kurulumun kanıtıdır, geçmiş
maillerin temizlendiği veya genel yayın uygunluğu iddiası değildir.

Kaynaklar: [Zamanlı tetikleyiciler](https://developers.google.com/apps-script/guides/triggers/installable),
[proje oluşturma ve çoklu Google hesapları](https://developers.google.com/apps-script/guides/projects#fix_issues_with_multiple_google_accounts),
[Advanced Gmail](https://developers.google.com/apps-script/advanced/gmail),
[kalıcı silme ve zorunlu kapsam](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/delete),
[Apps Script delete/remove isim dönüşümü](https://developers.google.com/apps-script/guides/services/advanced).
