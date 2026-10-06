# GRIDSHARD — çocuk hedef kitle teknik denetimi ve devir notu

Tarih: 6 Ekim 2026, iş bilgisayarı. Başlangıç HEAD: `ae967ed`.
Durum: **09:34 TR sınırlı kaynak ön denetimi tamamlandı. Çocuk-kitle yayın uyumu açık.**
Bu rapor eksiklerin uygulama planıdır; tam cihaz/SDK/hukuk denetimi değildir.

> **Güncelleme (Claude, 6 Ekim):** Devam planının 1–3. maddeleri ve 4. maddenin bir bölümü kullanıcı kararlarıyla uygulandı: sohbet ve özel mesaj yalnız hazır mesaj, adlar süzgeçli, ebeveyn denetimi var, yazı tipleri gömülü, yeni e-posta/telefon alınmıyor, Firebase açılışta başlamıyor. Hiçbiri yayınlanmadı. Ayrıntı ve açık kalanlar en alttaki iki "6 Ekim" bölümünde. Çocuk-kitle yayın uyumu hâlâ açık.

## Karar ve kapsam

- Kullanıcı 9–12 yaş dahil karma çocuk/yetişkin kitle hedefliyor. Hedef kitleyi gerekliliklerden kaçınmak için değiştirmeyin.
- Play Console “Uygulama ayrıntıları” çocuklarla ilgili tüm geçerli yasa/yönetmeliklere uyum onay kutusu henüz işaretlenmedi. Teknik denetim tek başına COPPA/GDPR sertifikası değildir.
- Bu tur yetki: salt-okunur kaynak incelemesi ve kalıcı rapor/devir planı. Çocuk güvenliği davranışını değiştiren kod, canlı yayın, yeni AAB, gerçek reklam/ödeme açma, oyuncu sıfırlama veya yasal beyan verme yok.
- Başka AI performans/UI/tutorial dosyalarında çalışıyor. Önce `git status --short` ve ilgili farkları okuyun; onun değişikliklerini geri almayın veya topluca commit etmeyin.
- Son native kullanıcı teyidi: Uç → demo/premium/ücretsiz inceleme erişimi → önceki Uç profili başarılı. Bu akışı yeniden sıfırlamak gerekmez. Kurulu Play versionCode ve tüm SDK ağ davranışı bu teyitten çıkarılamaz.

## Bulgular ve kanıt

### 1. Serbest takım sohbeti / özel mesaj: öncelikli açık kapı

İzlenen zincirler:

- Takım: `client/src/app.js:6904` → `server/app/main.py:4664` → `server/app/team_service.py:870`. Üyelik, boş/uzun metin kontrolü var. Mesaj `visibility: visible`, `moderation_status: pending` kaydediliyor (`team_service.py:898`); `_team_view` yalnız görünürlüğü süzüyor (`main.py:4292`). **Pending etiketi gönderim öncesi moderasyon engeli değildir.**
- DM: `client/src/app.js:4403` → `main.py:1924` → strict PostgreSQL yolunda `main.py:3895` → `postgres_social_runtime.py:153` → `platform_services.py:1223`. Karşılıklı arkadaşlık ve engelleme denetimi var (`postgres_social_runtime.py:68`). Alternatif yerel yol da arkadaş/engel kontrol ediyor (`main.py:1934`). Serbest metin kayıt/okuma var.
- Kimlik ara katmanı (`main.py:545`) oturum, oyuncu sahipliği, iptal ve inceleme hesabı sınırlarını denetliyor; incelenen bölümde yaş/yetişkin sosyal yetkisi yok.
- İstemcide mesaj düğmesi/alanı ve DM “artık arkadaş değil” notu incelendi (`app.js:4341`, `client/index.html:512,860`). Bu gönderim akışlarında çocuk çevrimiçi güvenlik hatırlatması veya yetişkin yönetim kapısı görülmedi. Tüm repo için yalnız kelime aramasından kesin yokluk sonucu çıkarılmadı; bulgu bu çağrı zincirlerine dayanıyor.

Sonuç: mevcut arkadaşlık, şikâyet veya engelleme sistemi **çocuklara yönelik yetişkin kontrolünün yerine geçmez**. Çocuk/yaşı bilinmeyen için serbest sohbet ve DM'nin koşulsuz açık bırakıldığı bu akışlar, hedef kitle beyanını onaylamak için yeterli kanıt sağlamıyor. Geçmiş mesajları okuma/arama/bildirim yolları da yeni çocuk politikasıyla aynı sınırda korunmalı.

### 2. Yaş ve çocuk veri politikası: uygulama kararı gerekiyor

Kaynak taraması ve incelenen hesap/ayar girişlerinde gözden geçirilmiş tarafsız yaş akışı, çocuk durumunu taşıyan politika veya yetişkin izin kaydı doğrulanmadı. `docs/STORE_PURCHASES.md:125` da karma yaş akışını açık iş olarak kaydediyor. Play Games hesabından, reklam onayından veya analitik kutusundan “yetişkin” sonucu çıkarılmamalı. Yalnız yaş ekranı eklemek de tek başına hukuki izin değildir.

Yeni akış belirlenirken mevcut Uç hesabının ilerlemesini, güvenli oturum kurtarmasını ve demo → önceki profile dönüşü koruyun. Mevcut oyuncuların yaşı bilinmiyorsa otomatik yetişkin saymayın. Yaş kategorisi/bölgesel kural/veri minimizasyonu tasarımı için kullanıcı yönü ve gereken hukuki değerlendirme alın; gereksiz tam doğum tarihi veya ebeveyn kimlik belgesi toplamayı varsayılan çözüm yapmayın.

### 3. Reklam: kaynak koruması ve mock testleri olumlu; bütün uygulama onayı değil

- `native-store.js:26` UMP TFUA ayrı çağrıda; `:27` SDK TFCD/G; `:355` beklenmeyen REQUIRED veya izin yoksa kapalı; `:383` initialize öncesi yapılandırma; `:395` yükleme isteğinde `npa:true`.
- Yüklü AdMob 8.1.0 Java köprüsünde `setRequestConfiguration` ardından `MobileAds.initialize` çağrısı var (`node_modules/@capacitor-community/admob/android/src/main/java/com/getcapacitor/community/admob/AdMob.java:92`). Node mock sonucu gerçek SDK veri trafiğini ispatlamaz.
- `package.json` / `pnpm-lock.yaml`: AdMob köprüsü 8.1.0. `android/variables.gradle` ve `android/app/build.gradle:60`: Google Mobile Ads **25.4.0** sabit. UMP eklenti varsayılanı 4.0.0. Bu tur Gradle çözülmüş bağımlılık listesi yeniden üretilmedi.
- Android kaynak manifesti `AD_ID` ve AdServices izinlerini kaldırıyor; `DELAY_APP_MEASUREMENT_INIT` var (`android/app/src/main/AndroidManifest.xml:3`). Kaynak manifest, son birleşmiş AAB manifestinin yerine geçmez.
- 6 Ekim resmî Families SDK listesinde Google `play-services-ads` **19.0.0 ve sonrası** yer alıyor; 25.4.0 bu aralıkta. Bu liste ne eklentinin tamamını ne oyunu hukuken sertifikalandırır. Mediation/ek SDK varsa ayrıca kontrol gerekir.
- Önceki checkpoint'e göre canlı gerçek reklam/ödeme kapalı; bu tur canlı ayar okunmadı/değiştirilmedi. Çocuk koruması denemesi için yayıncının gerçek reklamını veya gerçek ödemeyi açmayın.

### 4. Play Games, analitik, push: olumlu önlemler var; çocuk akışı doğrulanmadı

- `client/index.html:296` misafir devam seçeneği var; `play-games.js:44` giriş başarısızsa misafir devam mesajı veriyor. Ancak `GridshardApplication.java:8` SDK'yı uygulama açılışında başlatıyor. Bunun çocuk hesabı/yaşı bilinmeyen cihazdaki otomatik oturum ve ağ davranışı incelenmedi. “Misafir düğmesi var, SDK veri toplamıyor” sonucu çıkarılamaz.
- `player_settings.py:26` analitik varsayılan false. `main.py:845` ürün analitiği kayıt yetkisi ayardaki true koşuluna bağlı. UI bu tercihi açabiliyor (`client/index.html:973`, `app.js:16025`); çocuk için ayrı yetki/yasal dayanak denetimi doğrulanmadı. Çocuğun kutuyu işaretlemesi yetişkin izni sayılmamalı.
- `native-push.js:39` tercih başlangıçta kapalı; `:120` açılış ve `:131` kullanıcıyla açma/OS izin akışı var. Bu OS izni çocuk verisi için otomatik hukuki izin değildir. FCM/SDK otomatik bileşenleri, token/cihaz kaydı ve çocuk bildirim içeriği son pakette ayrıca incelenmeli.
- `public-site/content.js:50` hesap/cihaz ve sosyal veri açıklamaları var. Çocuk akışı uygulandıktan sonra TR/EN gizlilik metni ve Play Veri güvenliği gerçek davranışla eşleştirilmeli. Genel site yayını veya 90/30 günlük saklama görevleri bütün çocuk veri uyumunu kanıtlamaz.

## Bu tur doğrulama

Çalıştırıldı: `node --test client/tests/native-ad-consent.test.js` → **16 geçti, 0 başarısız**, 6 Ekim 09:33 TR. Testler kapalı sağlayıcı, çocuk/unknown TFUA/TFCD/G/NPA, beklenmeyen REQUIRED, hata/tekrar, kapatma ve dinleyici temizliğini mock ile doğruluyor.

Çalıştırılmadı: tam test paketi, Gradle build/dependency raporu, yeni APK/AAB kurulumu, çocuk/ebeveyn cihaz senaryosu, gerçek SDK ağ ölçümü, gerçek reklam/ödeme, hukuk değerlendirmesi. Bu tur AWS/Cloudflare/Gmail/Play Console değişikliği yapılmadı. Yalnız bu rapor ve `CODEX_CHECKPOINT.md` güncellendi; diğer dirty dosyalar bu turun işi değildir.

## Kullanım hakkı ve devam güvenliği

Bu tur hesap aracı haftalık %97 kullanılmış (%3 kalmış), 5 saatlik pencerede %7 kullanılmış gösterdi. Haftalık sıfırlanma: **10 Ekim 2026 00:14:06 Türkiye saati**. Yüzdeler anlık hesap durumu; kalan iş sayısı veya denetimin tümüne yeteceği garantisi değildir. Satın alınmış/reset kredisi görünmüyor. Gizli hesap kimliği rapora alınmadı.

Resmî kullanım belgesine göre limit aktif turda dolarsa ajan adil kullanım sınırlarına tabi olarak o turda çalışmayı sürdürebilir; kesintisiz tamamlanma garantisi değildir. Yeni tur erişimi biterse kaydedilmiş repo dosyaları diğer araca bağlam sağlar; otomatik devam/başka modelin limiti aşması varsayılmaz. Yeni güvenlik kodu başlatılmadığından bu turdan yarım uygulanmış çocuk güvenliği değişikliği kalmaz. Raporu ve `CODEX_CHECKPOINT.md` dosyasını diğer değişikliklerden ayırarak kendi commit/pull sürecinize dahil edin. Yerel ignored ekran görüntüleri, anahtarlar ve kanıt dosyaları Git ile taşınmayabilir; rapor bunlara zorunlu bağımlı olmamalı.

## Devam planı: küçük, tamamlanabilir işler

1. **Kullanıcı kararı / uygulama yetkisi:** Çocuk/unknown kullanıcıda serbest sohbet ve DM başlangıçta kapalı mı kalacak; yoksa incelenmiş yetişkin yönetimiyle mi açılacak? Bu özellikleri çocuklara kapatma, diğer oyunculara göre ayrım veya yeni ebeveyn süreci ürün kararıdır; bu rapor karar yerine geçmez. Yalnız UI saklamak yeterli değil. Yaş ayırımı yerine herkes için çocuk güvenli kapsam seçilirse SDK/veri/sosyal kısıtlarının hepsi buna göre uygulanmalı; otomatik uyum sayılmamalı.
2. **P0 sunucu politikası:** Karar sonrası tek merkezi politika/yaş durumu; unknown güvenli varsayılan; serbest sosyal gönderim/okuma/arama/bildirim API'lerinde yetki; yerel ve strict PostgreSQL yolunda eşdeğer sonuç. İzin reddi mutasyondan önce, istemcinin `adult:true` beyanı yetki olamaz. Yetişkin yönetimi sunucuda saklanmalı, kapatma hemen uygulanmalı. Testlerle tek tamamlanabilir değişiklik halinde teslim; canlıya çıkarmayın.
3. **P0 istemci ve sosyal UX:** Çevrimiçi güvenlik hatırlatması, yetişkin yönetimi veya kapalı sosyal seçenek; veri toplamaya başlamadan geçerli akış; normal oyun/ilerleme misafir/çocuk için çalışmalı. Diğer AI'nın `app.js`, `index.html`, onboarding değişiklikleri bitmeden bu dosyalarda çakışmalı geniş düzenlemeye başlamayın.
4. **P0 veri/SDK:** PGS/FCM/analitik/hesap cihaz kaydı veri envanteri, bölgesel izin dayanağı ve minimizasyon kararı. Seçilmemiş/unknown yaşta yasak tanımlayıcıların gitmediğini uygulama soğuk açılışından itibaren doğrulayın. SDK yalnız buton anında değil otomatik başlatma bileşenlerinde de incelenmeli.
5. **P1 paket ve monetizasyon:** Diğer çalışma tamamlanınca tek sabit kaynak sürümünden çözülmüş Gradle SDK listesi + birleşmiş manifest + AAB kanıtı. Güvenli test paketinde SDK trafiği ve reklam içerik/erken kapama şartları; gerçek mağaza ödeme veya canlı reklam etkinleştirmeden. Önceki v2 kanıtları kendi snapshot'ına aittir, yeni kodu otomatik kapsamaz.
6. **P1 beyan eşleştirme:** Gizlilik TR/EN, Veri güvenliği, IARC sosyal özellikleri ve hedef yaş gerçeğe uygun olsun. Tüm açık kapılar ve gerekli hukuki değerlendirme bitmeden yasal uyum kutusunu işaretlemeyin; Google kabulünü test sonucu gibi yazmayın.

## Kabul testleri — sonraki araç için açık bitiş ölçütleri

- Yeni/legacy/yaşı bilinmeyen oyuncu güvenli varsayılan; normal oyun/ilerleme ve mevcut Uç profil kurtarma çalışıyor. İlk açılış ve ağ kesintisi çocuk akışını atlatmıyor.
- Çocuk/unknown için izinsiz DM ve takım serbest mesaj API çağrısı reddediliyor; DB mesajı/notification/outbox yok. Aynı test local ve strict PostgreSQL'de geçiyor; eski sohbet okuma da karara uygun korunuyor.
- İstemci sahte yaş/izin alanı gönderince engel kalkmıyor. Yetişkin yönetimi seçildiyse onay/iptal, yeniden açılış, ikinci cihaz ve oturum değişimi sunucudaki kararı izliyor; çocuğun basit checkbox'ı yetişkin doğrulaması değil.
- Güvenlik uyarısı serbest paylaşım öncesi görülebiliyor; çocuk kendiliğinden yetişkin alanına teşvik edilmiyor. Rapor/engel yetkisi ve gerçek kullanıcı kimlik gizliliği korunuyor.
- Çocuk/unknown analitik ve push akışı seçilen veri politikasına uyuyor; OS/UMP onayı ebeveyn izni yerine sayılmıyor. PGS zorunlu değil ve çocuk için izin verilmeyen SDK veri aktarımı soğuk açılışta da yok.
- Mevcut 16 reklam testi yeşil; gerçek son paket manifest/SDK çözümü ve güvenli cihaz trafik kanıtı ayrı. Kapanış/başarısız reklam normal oyunu kilitlemiyor. Mediation varsa tüm zincir çocuk korumasını taşıyor.
- Demo premium/ödeme yapmadan erişim ve Uç'a geri dönüş bozulmuyor; gerçek oyuncunun premium/cüzdanı demo tarafından değişmiyor.
- Yayın öncesi rapor her kapıda test adı/sonuç/kanıt/kalan bilinmeyeni kaydediyor. Hukuki değerlendirme teknik testlerden ayrı tutuluyor.

## Birincil kaynaklar

- [Google Play Families politikası](https://support.google.com/googleplay/android-developer/answer/9893335?hl=tr)
- [Hedef kitle ve içerik](https://support.google.com/googleplay/android-developer/answer/9867159?hl=tr)
- [Families SDK sürüm listesi](https://support.google.com/googleplay/android-developer/answer/12955712)
- [Codex kullanım bilgisi](https://learn.chatgpt.com/docs/pricing)

## Başka AI aracına verilecek talimat

> Önce CODEX_CHECKPOINT.md ve docs/CHILD_AUDIENCE_AUDIT.md oku. Kullanıcı 9–12 dahil karma kitleyi gerçekten hedefliyor; Play yasal uyum kutusunu henüz işaretlemiyoruz. Kaynak ön denetimi tamamlandı; en önce raporun Devam planı 1. maddesindeki çocuk/unknown serbest sohbet–DM ve yetişkin yönetimi kararını kullanıcıyla netleştir. Denetim yetkisini yeni ebeveyn UX/kod veya canlı yayın yetkisi sayma. Sonra yeni kullanıcı talebinin kapsamında P0 sunucu politikasını kabul testleriyle küçük, tamamlanmış iş halinde ele al. Performans/UI çalışması başka AI tarafından sürüyor; mevcut dirty değişiklikleri koru. Uç hesabını sıfırlama; demo inceleme erişimi ve normal profile dönüş kullanıcı tarafından doğrulandı. Gerçek reklam/ödeme, yeni Play sürümü, Gmail/yedek silme görevleri veya gizli anahtarlar üzerinde işlem yapma. Testleri yerel/izole yap, yapılmayan cihaz/hukuk kontrollerini tamamlandı yazma. Bu raporda uygulama kodu başlanmış değildir; iki doküman harici dirty dosyalar başka çalışmaya aittir.

## 6 Ekim öğleden sonra — uygulama turu (Claude): devam planı 1–3

Bu bölümü Claude ekledi; yukarıdaki Codex metni değiştirilmedi. Yukarıda "uygulama kodu başlanmış değildir" yazan yerler bu turdan öncesini anlatır. Değişiklikler **commit edilmedi, yayınlanmadı**; commit'i kullanıcı yapacak.

### Kullanıcı kararı (devam planı 1)

- Sohbet ve özel mesaj: **"şimdilik herkese hazır mesaj olarak yapalım. ileride düzenleme yaparız."** Serbest yazı hiçbir oyuncuya açık değil. Yaş sorulmuyor; herkes aynı kuralla oynuyor. Yetişkin yönetimi ya da ebeveyn süreci kurulmadı.
- Herkese görünen diğer yazılar: **"Ad süzgeçli, açıklama hazır."** Oyuncu adı ve takım adı serbest kalır ama sunucuda süzülür; takım açıklaması hazır seçeneklerden seçilir.
- Serbest yazı ileride yeniden açılacaksa yaş durumu ve yetişkin yönetimi kararı o zaman yeniden gerekir; bu tur o kararı vermedi.

### Yapılanlar (devam planı 2 ve 3)

Sunucu:

- `server/app/safe_chat.py`: 33 hazır mesaj (5 grup: selam, cevap, savaş, takım, tepki) ve 8 hazır takım açıklaması. Sunucu yalnız mesajın kimliğini kabul eder.
- Takım sohbeti (`team_service.post_message`) ve özel mesaj (`platform_services.send_message`) yalnız `preset_id` alır. Eski istemcinin serbest yazı alanları (`message`, `text`, `description`) istek modelinde durur ama içerikleri hiçbir yere yazılmaz: geçerli hazır mesaj kimliği olmayan mesaj isteği ve serbest metinli takım açıklaması 422 ile reddedilir; ret, kayıttan ve bildirimden önce olur.
- Okuma: takım görünümü, yazışma ve sohbet listesi yalnız hazır mesajı gösterir; metin kayıttan değil listeden alınır. Karardan önce yazılmış serbest metinler **silinmedi, hiçbir görünümde gösterilmiyor**.
- Katı PostgreSQL yolu (`postgres_social_runtime.send_message`) aynı denetimden geçer.
- Takım açıklaması `description_id` olarak saklanır; eski serbest açıklama gösterilmez.
- `server/app/text_safety.py`: oyuncu adı ve takım adı süzgeci (4'ten çok rakam, e-posta/adres, sosyal ağ adı, kaba söz). Reddedilen oyuncu adı tek ad değiştirme hakkını harcamaz.
- Özel mesaj bildirimi mesajın metnini taşımıyordu; öyle kaldı.

İstemci:

- `client/src/social/safe-chat.js`: sunucudaki listenin aynısı. `client/tests/safe-chat.test.js` iki listenin eşit olduğunu denetler; biri değişip diğeri unutulursa test kırılır.
- Takım sohbetinde ve özel mesajda yazı kutusu yok; yerinde hazır mesaj seçici var (grup sekmesi, dokununca gönderir, ardından 1 saniye kilit). Mesajlar oyuncunun dilinde görünür (Türkçe/İngilizce). Hazır mesaj kimliği olmayan kayıt istemcide de çizilmez.
- Takım oluşturmada açıklama bir seçim listesi. Oyuncu adı ve takım adı alanlarının altında "gerçek adını, okulunu ya da telefon numaranı yazma" hatırlatması, sohbetlerde "Güvenli sohbet: yalnız hazır mesajlar gönderilir." satırı var.
- Kısa ekranda (700 px altı yükseklik) mesajlar tek satırda yana kayar; sohbet listesine yer kalır.

### Doğrulama (6 Ekim, iş bilgisayarı)

- Sunucu: `server/tests/test_safe_chat.py` 43/43. Tam paket sonucu `CLAUDE_CHECKPOINT.md` içinde.
- İstemci 232/232, araçlar 30/30.
- İki misafir hesapla tarayıcıda (geçici betik, depoda değil; yalıtılmış geçici sunucu): takım adı ve oyuncu adı reddi, hazır açıklama, takım sohbeti, başvuru ve onaydan sonra ikinci üyenin sohbeti görmesi, özel mesaj ve gelen kutusu önizlemesi, İngilizce görünüm ve Türkçeye dönüş, serbest yazı gönderen eski istemci isteğinin 422 ile reddi. Ekran boyutları 360×780, 360×640, 320×568.
- Uçtan uca: Android öykünmesi 9/9. `e2e/settings-layout.spec.js` içindeki ad 13 rakam içeriyordu ve yeni süzgece takıldı; test kurala uygun ada geçirildi ve telefonlu adın reddini de denetliyor.
- **Yapılmadı:** katı PostgreSQL testleri (bu makinede veritabanı yok, testler atlanıyor), gerçek cihaz, hukuki değerlendirme.

### Kabul testleriyle eşleşme

- "İzinsiz DM ve takım serbest mesaj API çağrısı reddediliyor; DB mesajı/bildirim yok": yerel yolda herkes için geçerli (`test_gateway_rejects_free_text_team_message_from_an_old_client`, `test_gateway_rejects_free_text_direct_message_before_any_write`). Katı PostgreSQL yolunda **çalıştırılmadı**.
- "Eski sohbet okuma da karara uygun korunuyor": `test_team_view_hides_stored_free_text_and_never_trusts_stored_wording`, `test_direct_message_stores_only_presets_and_hides_stored_free_text`.
- "İstemci sahte yaş/izin alanı gönderince engel kalkmıyor": yaş ya da izin alanı yok; istemcinin gönderebileceği hiçbir alan serbest yazıyı açmıyor.
- "Güvenlik uyarısı serbest paylaşım öncesi görülebiliyor": tek serbest alan olan adların yanında hatırlatma var; sohbette serbest paylaşım yok.
- Analitik, bildirim, Play Games, reklam ve demo erişimi maddelerine bu turda dokunulmadı.

### Yayın sırası

Sunucu ve istemci birlikte çıkmalı; önce sunucu.

- Yeni sunucu + eski istemci (yayındaki paket dahil): sohbette yazıp gönderen oyuncu "Serbest yazı kapalı: hazır mesajlardan birini seç." hatasını görür; okuma tarafında yalnız hazır mesajlar görünür. Güvenli yön budur.
- Eski sunucu + yeni istemci: gönderim çalışmaz (eski sunucu serbest metin alanını zorunlu tutar) ve eski serbest mesajlar çizilmez.

### Açık kalanlar

1. **Yetişkin yönetimi.** Families politikası sosyal özelliği olan uygulamalardan yetişkinlerin bu özellikleri yönetebilmesini ister. Yalnız hazır mesaj, süzülmüş ad ve arkadaş listesi bulunan bir oyunun bu tanıma girip girmediği bir politika/hukuk yorumudur; bu tur o yorumu yapmadı ve yönetim ekranı kurmadı. Gerekirse sunucuda saklanan bir "sohbeti, özel mesajı ve arkadaşlık isteklerini kapat" ayarı eklenebilir.
2. **Adlar.** Süzgeç ilk savunma hattıdır, dar tutuldu (masum kelimeyi reddetmemek için) ve her kötüye kullanımı yakalamaz. Eski adlar geriye dönük taranmadı. Şikâyet ve engelleme yolu yerinde duruyor.
3. **Saklanan eski serbest metinler** gösterilmiyor ama duruyor. Silme ya da saklama süresi bir veri kararıdır; canlı veriye dokunulmadı.
4. **Hız sınırı.** Hazır mesaj için sunucuda ayrı bir hız sınırı yok; yalnız istemcide 1 saniyelik kilit var.
5. **Devam planı 4 (veri/SDK) için bu turda görülenler** (düzeltilmedi; ölçüm aşağıdaki "Devam planı 4 için ilk kanıt" bölümünde):
   - `client/index.html:13–15` yazı tiplerini açılışta `fonts.googleapis.com` adresinden yükler; her açılışta oyuncunun IP adresi Google'a gider.
   - Hesap bağlama ve kurtarma alanları (`#account-onboarding-email`, `#account-contact-destination`, `#account-recovery-identifier`) yaşı bilinmeyen oyuncudan e-posta ya da telefon alabilir.
   - Play Games'in açılışta başlaması, analitik kutusu ve bildirim izni Codex'in 4. bulgusundaki gibi duruyor.
6. **Devam planı 5 ve 6'ya başlanmadı.** Gizlilik metni (`public-site/content.js`) artık "sohbet yalnız hazır mesajla, adlar süzülür" durumuna göre güncellenmeli. IARC anketinde oyuncular hâlâ birbiriyle etkileşiyor (hazır mesaj, ad, arkadaş listesi); soru buna göre dürüstçe yanıtlanmalı. Yasal uyum kutusu işaretlenmedi.

### Sonraki araç için

> Sohbet/özel mesaj kararı uygulandı ve yerelde test edildi; yayınlanmadı. Önce `git status --short` ile ağaca bak; `server/app/safe_chat.py`, `server/app/text_safety.py`, `client/src/social/safe-chat.js` ve testleri bu kararın parçasıdır. Hazır mesaj listesini değiştirirsen sunucu ve istemci dosyasını birlikte değiştir (`client/tests/safe-chat.test.js` denetler) ve İngilizcesini `client/src/i18n-catalog.js` içine ekle. Sıradaki iş devam planının 4. maddesidir; "Açık kalanlar" 1. maddedeki yetişkin yönetimi sorusu kullanıcıya sorulmadan kapatılmış sayılmamalı. Katı PostgreSQL testleri yayından önce veritabanı olan ortamda koşulmalı.

### Devam planı 4 için ilk kanıt (Claude, 6 Ekim)

Yalnız ölçüm ve kaynak okuması; hiçbir şey değiştirilmedi, karar verilmedi.

**Web istemcisi, soğuk açılış** (yeni tarayıcı profili, yerel deneme sunucusu, telefon boyutunda Chrome; geçici betik, depoda değil). Oyuncu hiçbir şeye dokunmadan önce:

- Dış adres: yalnız Google yazı tipleri. `fonts.googleapis.com` (1 istek) ve `fonts.gstatic.com` (7 yazı tipi dosyası). Başka üçüncü taraf isteği görülmedi.
- Kendi sunucu: `POST /auth/session` ve `POST /participants/{oyuncu}/bootstrap` ile misafir hesap ve cihaz kimliği, "misafir devam" seçilmeden **önce** oluşuyor; ardından profil, mağaza, sosyal görünüm ve mesaj kutusu okunuyor. Tarayıcıda `gridshard.auth.device-id` ve `gridshard.auth.device-secret` saklanıyor.
- Açılışta telemetri ya da analitik isteği görülmedi; analitik kutusu kapalı geliyor.
- "Misafir devam" sonrası 8 saniyede yeni dış adres yok.

Bu ölçüm web istemcisi içindir; Android paketindeki SDK trafiğini göstermez.

**Android, yalnız kaynak** (`android/app/src/main/AndroidManifest.xml`, `GridshardApplication.java`, `android/app/build.gradle`, `android/app/capacitor.build.gradle`):

- Pakete giren SDK'lar: Play Games v2 22.1.0, Google Mobile Ads 25.4.0 (AdMob köprüsü), bildirim eklentisi (`@capacitor/push-notifications`, Firebase Messaging), satın alma eklentisi, güvenli saklama.
- Play Games her açılışta başlatılıyor (`PlayGamesSdk.initialize`); `SUPPRESS_GAME_PROFILE_CREATION` açık.
- Reklam kimliği ve AdServices izinleri kaldırılmış, reklam ölçümü geciktirilmiş (Codex'in 3. bulgusuyla aynı).
- Manifestte Firebase için otomatik başlatmayı kapatan bir ayar yok (`firebase_messaging_auto_init_enabled`, `firebase_analytics_collection_enabled`). `google-services.json` depoda değil; yayın paketinde varsa Firebase Messaging, oyuncu bildirimi açmadan da açılışta kayıt jetonu üretebilir. **Pakette doğrulanmadı.**

**Kullanıcı kararı bekleyenler:**

1. Yazı tipleri pakete gömülsün mü? (Orbitron ve Rajdhani açık lisanslıdır.) Gömülürse açılışta Google'a istek gitmez; dosyaların indirilmesi gerekir.
2. Yaşı bilinmeyen oyuncudan hesap bağlama/kurtarma için e-posta ya da telefon alınmaya devam edilecek mi?
3. Firebase otomatik başlatması manifestte kapatılsın mı? (Yeni paket gerektirir; paket işi Codex'in notlarında.)
4. Play Games'in her açılışta başlatılması çocuk kitle için kalacak mı?

## 6 Ekim akşamüstü — dört karar ve uygulaması (Claude)

Bu bölümü Claude ekledi. Değişiklikler **commit edilmedi, yayınlanmadı**; yeni paket hazırlanmadı. Yasal uyum kutusu işaretlenmedi.

### Kullanıcı kararları

Yukarıdaki "Kullanıcı kararı bekleyenler" ve "Açık kalanlar" 1. madde için dört soru soruldu; kullanıcı dördünde de önerilen seçeneği seçti:

1. Yetişkinlerin sosyal özellikleri kapatabileceği ayar: **"Evet, ekle."**
2. Yazı tipleri oyuna gömülsün mü: **"Evet, göm."**
3. Hesap bağlamada e-posta/telefon: **"Yeni bağlamayı kapat."**
4. Android paketinde bildirim altyapısının otomatik başlaması: **"Evet, kapat."**

### Ebeveyn denetimi

- **Ne yapar:** Ayarlar → Hesap ve Gizlilik → "Ebeveyn Denetimi". Yetişkin 4 haneli bir şifre belirleyip sosyal özellikleri kapatır; yeniden açmak aynı şifreyi ister. Karar sunucuda, hesapta saklanır.
- **Kapalıyken çalışmayanlar:** takım sohbeti (gönderme ve görme), özel mesaj (gönderme, alma, görme), arkadaşlık isteği (gönderme, alma, kabul), davet kodu (üretme, kullanma; kapatınca önceki kodlar silinir). Başka oyuncu kapalı hesaba yazmak ya da istek göndermek isterse "Bu oyuncu mesaj ve arkadaşlık isteği almıyor." yanıtını alır.
- **Kapalıyken çalışmaya devam edenler:** arkadaş listesi, arkadaş savaşı daveti, takım üyeliği, modül parçası isteği ve bağışı, antrenman savaşı. Bunlar yazışma değil oyun özelliği sayıldı; istenirse ayrıca kapatılabilir.
- **Sunucu:** `platform_services.py` (şifre PBKDF2 ile, hesaba özel tuzla saklanır; hiçbir görünümde ve veri dışa aktarımında dönmez; 5 yanlış deneme açmayı 15 dakika kilitler). `main.py`: `/accounts/{oyuncu}/parental-controls/close-social` ve `open-social`; `_require_social_open` denetimi katı PostgreSQL dalından önce çalışır.
- **İstemci:** panel, kapalı durum notları (takım sohbeti, arkadaşlar, mesaj kutusu). Şifre cihazda saklanmaz.
- **Sınırlar (bilinerek bırakıldı):**
  - Ayar hesaba bağlıdır. Oyun verisini silip yeni misafir hesap açan çocuk için sosyal özellikler yeniden açıktır.
  - Şifreyi kimin belirlediği doğrulanmaz; "yetişkin" olduğunu gösteren tek şey şifreyi bilmesidir. Çocuk kendi şifresini belirleyebilir; bu yalnız kapatır.
  - Şifre sıfırlama yolu yok. Unutulursa sosyal özellikler o hesapta kapalı kalır; elle destek gerekir.

### Yazı tipleri

- Orbitron ve Rajdhani oyuna gömüldü: 9 dosya, 121 KB, kaynak `fonts.gstatic.com` (`client/assets/fonts/`, `client/src/fonts.css`). Sayfadaki Google bağlantıları kaldırıldı.
- Ölçüm (web istemcisi, soğuk açılış): dış adrese giden istek **0**; yazı tipleri kendi sunucudan yükleniyor. Android paketinde ölçülmedi.
- **Lisans:** iki aile de SIL Open Font License 1.1 ile dağıtılır; lisans her kopyanın telif bildirimini ve lisans metnini taşımasını ister. Kullanıcı izniyle resmî lisans dosyaları indirildi (`client/assets/fonts/OFL-Orbitron.txt`, `OFL-Rajdhani.txt`; kaynak `github.com/google/fonts`). Aynı metinler oyunun içinde de var: Ayarlar → Hesap ve Gizlilik → "Açık kaynak lisansları". Test, oyundaki metnin dosyalarla aynı olduğunu denetler.

### E-posta ve telefon

- Yeni e-posta ya da telefon alınmıyor: `/accounts/{oyuncu}/verification/request` ve `confirm` her isteği kayıttan ve kod gönderiminden önce reddediyor (karardan önce istenmiş kod da bağlama oluşturamaz). İlk açılıştaki "E-posta ile kayıt" ve Ayarlar'daki doğrulama alanları kaldırıldı.
- Daha önce doğrulanmış iletişim bilgisiyle hesap kurtarma çalışıyor.
- **Google ve Apple ile giriş (kullanıcı kararı "A"):** giriş kalır, e-posta istenmez ve saklanmaz. Google'dan yalnız `openid` kapsamı istenir, Apple'dan kapsam istenmez; oyuncu sağlayıcının verdiği değişmeyen kimlikle tanınır (Play Games bağlantısı zaten böyleydi). Sağlayıcı yanıtta e-posta gönderse de okunmaz (`platform_services.complete_oauth`). Karardan önce bağlanmış hesapların saklı e-postasına dokunulmadı; onlarla kurtarma çalışır. Testler: `server/tests/test_oauth_no_email.py`. **Gerçek Google/Apple'a karşı denenmedi** (taklit yanıtlarla test edildi); yayından sonra bir kez gerçek cihazda giriş denenmeli.

### Android manifesti

- `firebase_messaging_auto_init_enabled=false` ve `firebase_analytics_collection_enabled=false` eklendi. Manifest elle değil, onu üreten araçtan değişti (`tools/configure-native-ad-safety.js`); `tools/audit-mobile-debug.ps1` birleşmiş manifestte bu iki ayarı da denetliyor.
- Oyuncu bildirimi açınca eklentinin `register()` çağrısı otomatik başlatmayı açar; kapatınca `unregister()` kapatır (eklenti sürümü değişirse `client/tests/native-ad-config.test.js` uyarır).
- Yalnız yeni pakette geçerli olur. **Gerçek cihazda denenmedi**: yeni paketle bildirimi açan oyuncuya bildirimin ulaştığı ayrıca denenmeli. Play Games'e dokunulmadı.

### Doğrulama (6 Ekim, iş bilgisayarı)

- Sunucu: 1166 geçti, 39 atlandı, 2 başarısız (yalnız `fakeredis` eksikliği). Yeni testler: `test_parental_controls.py` (14), `test_contact_binding_closed.py` (5).
- İstemci 234/234; araçlar 30/30 (Node) ve 5/5 (Python).
- Uçtan uca: Android öykünmesi 9/9.
- Tarayıcıda iki misafir hesapla (geçici betik, depoda değil): ilk açılışta e-posta alanı yok; kısa ve uyuşmayan şifre reddi; kapatma; kapalıyken takım sohbeti, arkadaş ekranı ve mesaj kutusu; başkasının kapalı hesaba yazamaması; yanlış şifre; İngilizce görünüm; doğru şifreyle açma ve mesajların geri gelmesi.
- **Son doğrulama (Google/Apple e-postasız giriş, sandık olasılıkları ve lisans metinleri eklendikten sonra):** sunucu 1178 geçti, 39 atlandı, 2 başarısız (yalnız `fakeredis` eksikliği); istemci 235/235; araçlar 30/30; Android öykünmesi uçtan uca 9/9. Mağaza olasılıkları ve lisans bölümü tarayıcıda Türkçe, İngilizce ve 320 px genişlikte denendi.
- **PostgreSQL (sonradan yapıldı):** tam sunucu paketi tek kullanımlık, yalnız 127.0.0.1 dinleyen bir PostgreSQL 16 kümesine karşı koşuldu: 1215 geçti, 2 atlandı (Redis gerektirenler), 2 başarısız (yalnız `fakeredis` eksikliği). Daha önce atlanan 37 PostgreSQL testi geçti. Canlı sunucu PostgreSQL 17 kullanır; o sürümle koşu push sonrası GitHub'daki kalite denetimindedir. **Yapılmadı:** gerçek cihaz, yeni paket, hukuki değerlendirme.

### Kabul testleriyle eşleşme (ek)

- "Yetişkin yönetimi … sunucudaki kararı izliyor; çocuğun basit checkbox'ı yetişkin doğrulaması değil": karar sunucuda; açmak şifre ister; şifresiz ya da sahte alanla açılamaz (`test_parental_endpoints_close_and_reopen_with_the_pin`). İkinci cihazda ayrıca denenmedi; durum hesaba bağlı olduğu için hesapla birlikte gelir.
- "İzinsiz çağrı reddediliyor; DB mesajı/bildirim yok": `test_closed_account_cannot_chat_message_or_befriend`, `test_others_cannot_reach_a_closed_account`.
- "Soğuk açılışta izin verilmeyen veri aktarımı yok": web istemcisinde dış istek 0. Android paketi ölçülmedi.

### Açık kalanlar (güncel)

1. Karardan önce saklanmış e-postalar (doğrulanmış adresler ve eski Google/Apple bağlantıları) duruyor; silinmeleri ayrı bir veri kararıdır.
2. Google/Apple girişinin gerçek sağlayıcıya karşı denenmesi (yalnız kimlik kapsamıyla).
3. Analitik izni kutusunu yaşı bilinmeyen oyuncu da işaretleyebiliyor (Codex'in 4. bulgusu); karar verilmedi. Play Games'in her açılışta başlaması da olduğu gibi duruyor.
4. Ebeveyn denetiminin yukarıdaki sınırları.
5. Gerçek cihaz denemeleri (bildirim, yazı tipleri, ebeveyn denetimi, olasılık penceresi, Google/Apple girişi). PostgreSQL testleri yerelde koşuldu (aşağıda "Yayın hazırlığı").
6. Devam planı 5 ve 6: paket kanıtı ve Play veri güvenliği formu duruyor. Gizlilik metni güncellendi ama yayınlanmadı (aşağıda "Gizlilik metni").
7. Önceki bölümdeki maddeler geçerli: saklanan eski serbest metinler, ad süzgecinin sınırları, hazır mesaj için sunucu hız sınırı.

### İçerik derecelendirme anketi için notlar (Claude, 6 Ekim)

Kullanıcı Play Console'daki anketin ekran görüntülerini paylaştı. Aşağıdakiler oyunun bugünkü kodundaki davranışa göre önerilen cevaplardır; derecelendirmeyi IARC hesaplar, bu liste onun yerine geçmez.

- **Şiddet:** önerilen **Evet** (ankette Hayır işaretliydi). Oyun, silah modülleriyle (lazer, füze, plazma) rakip devreyi ve çekirdeği yok etme üzerine kurulu; insan, hayvan ve kan yok. Alt sorularda gerçekçi olmayan, nesnelere/makinelere yönelik en hafif seçenekler uygun. Sorunun yanındaki "Daha fazla bilgi" metni cansız nesnelerin yok edilmesini şiddet saymıyorsa Hayır da savunulabilir; karar kullanıcının.
- **Korku, cinsellik, kumar, dil, kontrole tabi madde, kaba mizah:** Hayır. Günlük meta çarkı ücretsizdir ve bahis içermez.
- **Dijital satın alma:** Evet; yalnız "Dijital ürün satın alma işlemleri".
- **Rastgele öğe (ganimet kutusu):** Evet. Mağazada sandıklar Devre Kredisi ve Akı ile satılıyor (`meta_progression.STORE_CHEST_PRICES`); iki para birimi de gerçek parayla alınabiliyor (`store_catalog.py`); sandık içeriği olasılığa bağlı (`reward_odds`).
- **Öğe takası:** önerilen **Hayır** (ankette Evet işaretliydi). Oyunda müzayede ya da takas yok; takımda modül parçası bağışı karşılıksızdır ve para birimi kullanılmaz.
- **Kullanıcı etkileşimi:** Evet (hazır mesaj, oyuncu ve takım adı, arkadaşlık). Bildirme özelliği: Evet. Sohbet denetimi: Evet (serbest yazı yok, mesajlar hazır listeden). Yalnız davetli arkadaşlarla sınırlama: Hayır (takım sohbeti takım üyeleriyledir; ebeveyn ayarı tümünü kapatır ama "yalnız arkadaşlar" seçeneği değildir). Konum paylaşımı: Hayır. Engelleme özelliği: Evet.
- **Nazi sembolleri, Kore ulusal kimliği, terör, suç teknikleri:** Hayır.

**Sandık olasılıkları (bulundu ve kullanıcı kararıyla eklendi):** mağazadaki sandık kartı yalnız adı ve fiyatı gösteriyordu. Google Play, satın alınan rastgele öğelerde olasılıkların satın almadan önce açıkça gösterilmesini ister (ödeme politikası). Artık her kartta özet ("Modül parçası %35") ve satın alma düğmesinin altında "OLASILIKLAR" düğmesi var; düğme tam tabloyu açar: kesin ödüllerin aralığı, modül parçası olasılığı, enderliğe göre olasılık ve parça sayısı, çekirdek parçası olasılığı ve "o enderlikte açılmış modül yoksa" notu. Tablo sunucudan gelir (`_chest_store_view`). `server/tests/test_chest_odds_disclosure.py`, gösterilen tablonun gerçek satın alma ve açılış koduyla uyuştuğunu sandık başına 6000 alımla denetler.

Not: oyuncu şikâyetinde neden serbest yazı olarak girilir (`window.prompt`) ve sunucuda inceleme kuyruğuna gider; diğer oyunculara gösterilmez.

**Şiddet alt soruları (kullanıcının ekran görüntüsüne göre, 6 Ekim):** yalnız "İnsanlar dışındaki her şeye karşı şiddet" işaretli; ortam Fantastik; pikselleştirilmiş ya da çocuksu tarz Hayır; tepkiler Gerçekçi olmayan; sunum "Genellikle uzak bir açıdan"; kan Hiçbiri. "Korkunç sesler, ürkütücü karakterler ya da kasvetli ikincil sesler" sorusu için önerilen Hayır; tek tartışılabilir öğe, çekirdek kritik duruma düşünce açılan gerilim katmanıdır (uyumsuz gerilim yatağı, siren ve kalp atışı; `docs/AUDIO_DIRECTION.md` §17). Sesi Claude dinleyemedi; karar kullanıcının.

### Gizlilik metni (Claude, 6 Ekim)

Kullanıcı isteğiyle `public-site/content.js` içindeki gizlilik politikası (Türkçe ve İngilizce) bugünkü kararlara göre güncellendi. **Site yeniden derlenmedi ve yayınlanmadı**; `build/public-site` klasörüne dokunulmadı.

- **Oyunda işlenen bilgiler:** giriş sağlayıcılarından (Google, Apple, Play Games) yalnız hesap kimliğinin saklandığı, e-posta/ad/profil istenmediği; yeni e-posta veya telefon alınmadığı; daha önce bağlanmış iletişim bilgisinin kurtarma için durduğu. Sosyal kayıtlar "hazır mesaj listesinden seçilen" mesajlar olarak tanımlandı; şikâyete yazılan kısa açıklama ve engellemeler eklendi. Ebeveyn denetimi kaydı (kapalı/açık durumu ve şifrenin geri döndürülemeyen özeti) eklendi.
- **Kullanım ve görünürlük:** serbest yazının olmadığı, eski serbest metinlerin gösterilmediği, adların süzüldüğü ama süzgecin her şeyi yakalamadığı ve ebeveyn denetiminin ne kapattığı.
- **Hizmet sağlayıcıları:** Play Games eklendi; yazı tiplerinin oyunun kendi paketinden yüklendiği. Reklam cümlesi koda göre düzeltildi: eski metin "reklam tanımlayıcıları işleyebilir" diyordu; Android uygulaması reklam kimliği iznini istemiyor ve reklam istekleri herkes için çocuklara yönelik, genel izleyiciye uygun ve kişiselleştirilmemiş olarak işaretleniyor (`client/src/native-store.js`, manifest). Bu düzeltme kullanıcının saydığı konuların dışındaydı; ayrıca haber verildi.
- **Yeni bölüm "Genç oyuncular ve ebeveynler":** oyunun yaş sormadığı ve sınırların herkes için aynı olduğu; ebeveynin veri kopyası ya da silme için nasıl yazacağı. Bölüm teknik uygulamayı anlatır, uyum iddiası içermez.
- Son güncelleme tarihi 6 Ekim 2026 oldu.

`tools/tests/public-site.test.js` iki yeni testle genişledi: biri metindeki ifadeleri iki dilde sabitler, diğeri bu ifadelerin anlattığı kodun yerinde olduğunu denetler (ör. giriş kapsamı yeniden e-posta isterse test kırılır). Araç testleri 32/32. Sayfa yerelde, depoya çıktı yazmadan iki dilde ve 393/320 px genişlikte açıldı; taşma ve dış istek yok.

**Yayın sırası:** bu metin yeni davranışı anlatır. Oyunun yeni sunucusu ve paketi yayınlanmadan siteye konursa yanlış olur (canlıdaki sürümde serbest yazı ve e-posta bağlama hâlâ var); site, oyun güncellemesiyle birlikte yayınlanmalı. Play Console'daki veri güvenliği formu için cevap listesi hazırlanmadı.

### Yayın hazırlığı (Claude, 6 Ekim)

Kullanıcı sitenin güncellenmesini istedi ve Codex'in yaptığı gibi paket hazırlayıp sunucuyu güncelleyip güncelleyemeyeceğimi sordu.

- **PostgreSQL:** tam sunucu paketi tek kullanımlık, yalnız 127.0.0.1 dinleyen bir PostgreSQL 16 kümesine karşı koşuldu: 1215 geçti, 2 atlandı (Redis gerektirenler), 2 başarısız (yalnız `fakeredis` eksikliği). Daha önce atlanan 37 PostgreSQL testi geçti. Canlı sunucu PostgreSQL 17 kullanır; o sürümle koşu push sonrası GitHub'daki kalite denetimindedir. Yöntem `tools/test-review-postgres.ps1` ile aynı; küme geçici klasörde kuruldu, koşudan sonra durdurulup silindi.
- **Site paketi:** `build/public-site` depodaki kaynaktan yeniden derlendi; `tools/check-public-site.js` 24 sayfa/yerleşim denetimini geçti (masaüstü, 393 ve 320 px, iki dil; dış istek yok). Yeni paket `D:\Projects\GRIDSHARD-public-20261006-privacy.zip` (249.796 bayt, 19 dosya, kökte `index.html`; SHA-256 `1699d5a2bbe2b6c6e41d41172439809afab2c94e51cc62b0f9e2c7ea8ed56ea3`). Önceki pakete (`GRIDSHARD-public-20261005-no-transform.zip`) göre yalnız iki gizlilik sayfasının içeriği ve destek/hesap silme sayfalarındaki tarih değişti; önceki paket yerinde duruyor. **Yüklenmedi**; oyun güncellemesiyle birlikte yüklenmeli.
- **Paket ve sunucu:** bu bilgisayarda yapılamıyor. `secrets\android-release` (yükleme anahtarı ve DPAPI kimlik kaydı) ve sunucunun SSH anahtarı bu makinede yok; Docker motoru kapalı. Anahtarların bulunduğu bilgisayarda aynı adımlar izlenebilir (`tools/build-android-production.ps1`, `docs/SERVER_PRODUCTION_RUNBOOK.md`, Codex'in r11 kayıtları).
- **Önerilen sıra:** kullanıcı commit ve push → kalite denetimi yeşil → sunucu (taze yedek, yalıtılmış doğrulama, geçiş, önceki imaj geri dönüş için saklı) → `config/android-production.json` içinde versionCode 3 ve aynı anahtarla imzalı paket → Play dahili test → site paketi → içerik derecelendirme ve veri güvenliği formları. Canlıya çıkış kullanıcının açık onayını ister.
