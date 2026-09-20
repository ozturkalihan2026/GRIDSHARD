# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 20 Eylül 2026

Bu dosya güncel çalışma paketini ve korunması gereken önceki kararları içerir. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya, ardından `git status --short` okunmalıdır.

## Aktif paket — Beta.65 hesap açılışı, Devre Koleksiyonu ve mağaza ikonu

1. `[x]` Günlük meta çarkındaki başlıkları her durumda düz tut
   - Dilim başlıkları çarkın dönüşünü eş zamanlı ters yönde dengeliyor; çark dönerken ve seçilen metada durduğunda yazılar baş aşağı kalmıyor.
   - Sabit çentik dönme katmanının dışında kalmaya devam ediyor.
2. `[x]` Profilin ilk kartını bütünüyle başarı koleksiyonuna ayır
   - Kart içindeki tekrarlanan avatar, oyuncu adı, unvan, ilerleme ve mevcut kupa satırı kaldırıldı.
   - Başlık `DEVRE KOLEKSİYONU` olarak değiştirildi ve ortalandı; kartın tamamı kalıcı sıralama kupaları ile rozetlerin sergilendiği alan oldu.
3. `[x]` Hareketli emoji ve rekabet ödülü çeşitliliğini artır
   - Savaş emoji çizicisi gliflerin yanında GIF/görsel kaynağını da güvenli `<img>` öğesiyle destekliyor.
   - Çekirdek Patlaması, Glitch Dalgası ve Aşırı Yük hareketli emojileri eklendi; ilk 10 sezon kasalarında yeni avatar, çerçeve ve profil çubuğu ödülleri dağıtıldı.
   - Yeni profil arka planları ve avatar çerçeveleri seçim ekranı ile üst profil barında kendi görsel stillerine sahip.
4. `[x]` İlk açılış hesap kaydı ekranını göster
   - Anonim cihaz oturumu oluşturulduktan sonra kalıcı e-posta/OAuth kimliği olmayan oyuncuya Google, Apple, e-posta doğrulama ve misafir seçenekleri sunuluyor.
   - E-posta kod isteme/doğrulama mevcut hesap API'sine bağlı; geliştirme modunda kod güvenli biçimde varsayılan olarak açılıyor ve giriş alanına otomatik taşınıyor. Üretim modunda bu davranış varsayılan olarak kapalı.
   - Google/Apple yapılandırılmadığında düğmeler açıkça hazır olmadığını söylüyor ve sahte başarı üretmiyor. Üretimde sağlayıcı kimlik bilgileri, OAuth callback/kod değişimi ve gerçek e-posta teslim adaptörü hâlâ dağıtım altyapısında tamamlanmalıdır.
5. `[x]` GRIDSHARD mağaza ikonunu üret ve projeye bağla
   - Özgün kırık cam Çekirdek, altın Akım halkası ve devre geometrisinden oluşan metinsiz ikon üretildi.
   - Kaynak, `1024x1024` mağaza/Apple ve `512x512` Android/PWA sürümleri `client/assets/branding/` altına eklendi.
   - Web manifesti ve Apple dokunma ikonu bağlantısı etkinleştirildi; köşeler mağaza maskeleri için görsele işlenmedi.

Doğrulama: JavaScript ve Python sözdizimi temiz; tam istemci paketi `46/46` test dosyası ve Relay alt paketi `176/176` geçti. Beta.61/Beta.62/Beta.65 sunucu paketi `11/11` geçti. `git diff --check` yalnız mevcut Windows satır sonu uyarılarını verdi, içerik hatası yoktur.

## Aktif paket — Beta.64 ödül önizleme katmanı ve profil başarı vitrini

1. `[x]` Liderlik ödül önizlemesini diğer sandıkların üstünde tut
   - Sandık parıltısının oluşturduğu ayrı CSS katmanı kaldırıldı; aynı görünüm `box-shadow` ile korunuyor.
   - Üzerine gelinen veya klavye odağı alan liderlik satırı listenin en üst katmanına taşınıyor; alttaki sıraların sandıkları açık önizlemenin önüne geçmiyor.
2. `[x]` Profil kimlik kartına gerçek kupa ve rozet koleksiyonu ekle
   - Kimlik kartı içinde `Kupa ve Rozet Vitrini` oluşturuldu; sıralama kupaları ile rozetler ayrı koleksiyonlarda gösteriliyor.
   - Vitrin yalnız sunucuda kalıcı olarak açılmış `unlocked_rank_trophy_ids` ve `unlocked_badge_ids` öğelerini kullanıyor; ödül kasası açıldığında profil yenilenerek vitrin de anında güncelleniyor.
   - Henüz kazanım yoksa iki koleksiyon da anlaşılır boş durum metni gösteriyor; bilinmeyen gelecek ödül kimlikleri de güvenli bir genel görünümle sergileniyor.

Doğrulama: Beta.64 hedef istemci testi geçti; tam istemci paketi `33/33` test dosyası ve Relay alt paketi `176/176` geçti. JavaScript sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.63 liderlik ödül önizlemesi ve sade meta kartı

1. `[x]` Liderlik ödüllerini sandık önizlemesine taşı
   - Genel Kupa ilk 10 satırında sandık adı ve evrensel parça özeti artık oyuncu adının altında sürekli görünmüyor.
   - Sandık üzerine gelindiğinde veya klavyeyle/mobil dokunmayla odaklandığında Devre Kredisi, Akı, evrensel kart parçası ve o sıraya ait bütün kozmetikler tek önizleme kartında gösteriliyor.
   - Önizleme ilk üç sırada aşağı, diğer sıralarda yukarı açılarak görünür listenin kenarlarında daha az kırpılıyor.
2. `[x]` Etkinlik Merkezi meta kartını sadeleştir
   - Tekrarlanan `ETKİNLİK MERKEZİ`, `BUGÜNÜN METASI`, ayrı sayısal etki ve AI/etkinlik programı ayrıntıları kaldırıldı.
   - Kartta yalnız seçilen meta adı ile tek cümlelik anlaşılır meta açıklaması kalıyor; seçim yapılmadıysa kısa çark yönlendirmesi gösteriliyor.

Doğrulama: Beta.59/Beta.61/Beta.62 hedef istemci paketi `3/3`; tam istemci paketi `44/44` test dosyası ve Relay alt paketi `176/176` geçti. JavaScript sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.62 görünüm düzeltmeleri, nadirlik dengesi ve platform altyapısı

1. `[x]` Günlük meta çarkını sonuç durumunda da okunabilir tut
   - Sabit üst çentik çarkla dönmüyor; dilim yazıları dilim merkezlerine bağlı kalıyor.
   - Sonuç ekranında çark küçülürken yazı yarıçapı da birlikte küçülüyor; başlıklar çemberin dışına taşmıyor.
2. `[x]` Lider Panosu kapsamını oyuncunun bulunduğu gruba sabitle ve sekmeleri kalıcı tut
   - `GRUP` görünümü arena/lig seçicisini kaldırdı; sunucunun oturum sahibi için döndürdüğü `viewer_trophy_group` otomatik kullanılıyor.
   - `KUPA`, `ÇEKİRDEK` ve `TAKIM` alt gezinmesi bütün sıralama türlerinde görünür kalan sabit alt satıra taşındı.
3. `[x]` Savaş Akım rotasını ve kart ayrıntısı gezinmesini düzelt
   - Akım önce çekirdek satırında beslenen bütün sütunlara ulaşıyor, ardından her sütunda yukarı/aşağı yerleşik modüllere ayrı dikey dal çiziyor.
   - Modül ve çekirdek önceki/sonraki okları kart ayrıntısının dikey orta çizgisine alındı.
4. `[x]` Takım yönetimini sayfa içine taşı; çıkarma ve ayrılmayı çalışır hale getir
   - Yönetim artık modal açmıyor; Takım ekranının normal içerik alanında geri dönüşlü ayrı panel olarak açılıyor.
   - Lider diğer üyeleri çıkarabiliyor; her oyuncu kendi satırında takımdan ayrılabiliyor. Lider ayrılırsa sıradaki üyeye yöneticilik aktarılıyor, son üye ayrılırsa takım dağılıyor.
5. `[x]` Modül ve çekirdek nadirlik eğrilerini savaş değerlerine uygula
   - Mevcut modül eğrisi CAN, saldırı, etki/onarım/sabotaj, bekleme ve Akım verimini Yaygın < Nadir < Epik < Efsanevi biçiminde koruyor.
   - Çekirdeklere de ayrı CAN, aktif etki, enerji üretimi ve güç dolumu çarpanları eklendi; laboratuvar gösterimi ile canlı savaş aynı enerji sözleşmesini kullanıyor.
6. `[x]` Hesap güvenliği ve veri hakları yüzeylerini kur
   - Süreli e-posta/telefon doğrulama kodu, deneme sınırı, hesap kurtarma, cihaz oturumu listeleme/iptal, belirteç iptali, veri dışa aktarma ve doğrulama metinli hesap silme uçtan uca bağlandı.
   - Google/Apple OAuth başlatma durum/nonce sözleşmesi ve Ayarlar düğmeleri eklendi; sağlayıcı yapılandırılmadığında sistem sahte başarı üretmiyor.
7. `[x]` Sosyal platform ve mobil köprüleri kur
   - Davet kodu, web bağlantısı ve QR içeriği; bağlantı açıldığında daveti kabul eden web/özel şema deep-link tüketimi; DM, engelleme, şikâyet ve profil paylaşımı eklendi.
   - Mobil `appUrlOpen` köprüsü ve PushNotifications eklentisi bulunduğunda izin/token kaydı eklendi; bildirimler hedef deep-link ile kalıcı kuyruğa yazılıyor.
8. `[x]` Savaş emojilerini gerçek zamanlı savaş kanalına bağla
   - Seçili ve kazanılmış emoji, üç saniyelik bekleme sınırıyla sunucu WebSocket komutu olarak doğrulanıyor.
   - Olay iki savaş istemcisine yayımlanıyor ve ilgili devrenin üzerinde süreli emoji balonu olarak gösteriliyor.

Üretim etkinleştirme notu: Google/Apple yetkilendirme kodu değişimi, e-posta/SMS teslimi ve FCM/APNs gönderimi için sağlayıcı kimlik bilgileri ile mobil eklenti imzalama yapılandırması hâlâ dağıtım ortamında girilmelidir. Kod bu değerler yokken başarı taklidi yapmaz.

Doğrulama: Beta.58–62 geniş sunucu paketi `38/38`; Beta.62 seçili paket `15/15`; istemci paketi `44/44` test dosyası ve Relay istemci alt paketi `176/176` geçti. JavaScript/Python sözdizimi ve `git diff --check` temizdir.

## Önceki aktif paket — Beta.61 sosyal maç kapanışı, rekabet ödülleri ve takım yönetimi

1. `[x]` Biten arkadaş ve takım antrenman savaşlarının girişini kalıcı olarak kapat
   - Savaşın oturum kimliği terminal callback'te doğru `battle_id` alanından okunuyor; iki taraftaki arkadaş davetleri ve takım antrenman kayıtları `completed` durumuna geçiriliyor.
   - Okuma anındaki terminal durum uzlaştırması eski kabul kayıtlarını da kapatıyor; tamamlanan savaşta `SAVAŞ ALANINA GİR` düğmesi yeniden görünmüyor.
2. `[x]` Günlük meta çarkının sabit işaretçisini ve dilim yazılarını düzelt
   - Üst çentik dönen çarkın dışına taşındı; yalnız çark ve dilimler dönüyor.
   - Yedi başlık eşit açılarla, kendi diliminin merkezine dönük ve okunabilir yönde yerleştirildi.
3. `[x]` Çekirdekten yukarı/aşağı Akım omurgasını görünür yap
   - Besleme rotası önce çekirdeğin merkez sütununda hedef satıra, ardından yatay kola ilerliyor; sağ/sol bağlantılara ek olarak üst ve alt satırlarda da hareketli Akım çizgisi oluşuyor.
4. `[x]` Kart ayrıntıları arasında oklarla gezinme ekle
   - Modül ve çekirdek bilgi pencerelerine önceki/sonraki okları eklendi; pencere kapanmadan koleksiyonun tamamı döngüsel gezilebiliyor.
5. `[x]` Lider Panosunu Genel/Grup sıralaması ve ilk 10 kasasıyla genişlet
   - Alt sekmeler `KUPA`, `ÇEKİRDEK`, `TAKIM` adlarını gösteriyor; Kupa sıralamasında `GENEL` ve arena bazlı `GRUP` kapsamları bulunuyor.
   - Genel ilk 10 için konuma göre azalan Devre Kredisi, Akı ve evrensel modül parçası; seçili sıralarda kupa, rozet, avatar, çerçeve, savaş emojisi ve profil çubuğu arka planı tanımlandı.
   - Sıra yanındaki sandıklar mevcut sandık görsel dilini kullanıyor ve sezon kasası kimliğini önizliyor.
6. `[x]` Sezon/hafta/takım turnuvası ödüllerini mesaj kutusuna teslim et
   - Üst profil çubuğuna zarf düğmesi eklendi; alınmamış hediye varsa sarı yanıp sönüyor.
   - Kapanan sezon ilk 10, haftalık ilk 3 ve katkı şartını sağlayan takım turnuvası ilk 3 ödülleri tekil kimlikle kuyruğa alınır; `AL VE AÇ` işlemi kredi, Akı, evrensel parça ve kozmetiği kalıcı envantere işler.
   - Yeni dönem kaydı veya ilk yeni dönem maçı eski sayaçları sıfırlamadan önce ödül uzlaştırması çalışır; aynı ödül iki kez üretilemez veya alınamaz.
7. `[x]` Kozmetik ekranını emoji ve profil çubuğu arka planlarıyla tamamla
   - `AVATAR` alt sekmesi `KOZMETİK` oldu; avatar ve çerçevelerin altına savaş emojileri ile profil çubuğu arka planları eklendi.
   - Seçimler oyuncu profiline kalıcı yazılıyor; seçili profil arka planı üst profil çubuğunda ve profil kimliğinde uygulanıyor.
8. `[x]` Takım katılımını yönetici onaylı başvuruya ve takım profil barını yönetim alanına dönüştür
   - `KATIL` yerine `BAŞVUR` kullanılıyor; aday yönetici kabul edene kadar üye sayılmıyor ve aynı anda başka takıma başvuramıyor.
   - Takım başlığında avatar, çerçeve, isim çerçevesi ve profil çubuğu arka planını taşıyan kimlik kartı bulunuyor. Yönetici bu karttan başvuruları kabul/ret, üye çıkarma, yöneticilik devri ve takım kozmetiği seçimini yapabiliyor.
9. `[x]` Haftalık ve takım turnuvası ilk üç sandıklarını ayrı aileler olarak dengele
   - Haftalık 1. sandık Akı, Devre Kredisi, avatar, çerçeve ve savaş emojisi; 2. sandık emojisi çıkarılmış ve azaltılmış; 3. sandık emoji/çerçevesi çıkarılmış daha düşük pakettir.
   - Takım ilk üç sandığı normal sandıklardan farklı görsel kimlik kullanır; 1. takım avatarı, çerçevesi, isim çerçevesi ve takım barı arka planını birlikte verir, 2. ve 3. paketler kademeli azalır. En az `5` katkı puanı şartı korunur.

Doğrulama: Beta.58–61 seçili sunucu paketi `31/31`; Beta.61 sunucu paketi `4/4`; istemci paketi `43/43` test dosyası ve Relay istemci alt paketi `176/176` geçti. Python/JavaScript sözdizimi ve `git diff --check` temizdir. Takım başvurusu/onayı, bitiş callback kimliği, haftalık ödülün tekil teslimi ve kalıcı açılması, ilk 10/ilk 3 sandık sözleşmeleri, sabit çark işaretçisi, dikey Akım rotası ve yeni ekran yüzeyleri regresyon kapsamına alındı.

## Önceki aktif paket — Beta.60 maç türüne göre bağımsız hesaplama

1. `[x]` Normal PvP ilerlemesini arkadaş ve takım turnuvası maçlarından ayır
   - `ranked_pvp` ve dereceli `arena_ai` normal profil akışını kullanır; kupa, deneyim, Devre Yolu, Devre Kredisi, sandık, günlük emir ve kalıcı savaş istatistikleri yalnız bu normal ilerleme yolunda işlenir.
   - `friend_battle` ve `team_training` tamamen antrenman sayılır; profil, kupa, deneyim, Devre Yolu, kredi, sandık, günlük emir ve kalıcı istatistiklere hiçbir katkı yapmaz.
2. `[x]` Takım turnuvasını kendi puan defterine taşı
   - `team_tournament` normal profil ilerlemesine dokunmaz ve kupa hesaplamaz; yalnız turnuva maç/galibiyet sayacı ile galibiyet başına `1` takım katkı puanı işler.
   - Katkı puanı kalıcı oyuncu verisine eklendi; aylık takım sıralaması ve en az `5` puanlık ödül uygunluğu artık bu açık sayaçtan okunur.
3. `[x]` Haftalık Devre Turnuvasını yalnız kazanılmış PvP kupalarıyla sırala
   - Haftalık kayıt sonrasında sadece `ranked_pvp` ve dereceli `arena_ai` maçlarında kazanılan pozitif kupa ayrı haftalık toplamda birikir.
   - Arkadaş savaşı, takım antrenmanı ve takım turnuvası haftalık maç/galibiyet/kupa sayaçlarını değiştirmez.
4. `[x]` Maç sonu ekranında hesap türünü görünür kıl
   - Takım turnuvasında normal ödül kartları yerine takım katkı puanı gösterilir ve kupa/profil ilerlemesi olmadığı açıklanır.
   - Arkadaş ve takım antrenmanında ödül kartları gizlenir; maçın profil, kupa ve Devre Yolu bakımından nötr olduğu yazılır.

Doğrulama: Beta.60 sunucu paketi `7/7`; Beta.60/Beta.59/Beta.58 seçili sunucu paketi `23/23`; istemci paketi `42/42` test dosyası ve Relay istemci alt paketi `176/176` geçti. Arkadaş/antrenman nötrlüğü, takım turnuvasının yalnız kendi katkı puanını işlemesi, puanın kalıcılığı, haftalık sıralamanın yalnız normal dereceli PvP kupalarını toplaması ve ayrı maç sonu sunumları regresyon testleriyle kapsandı.

## Önceki aktif paket — Beta.59 etkinlikler, sosyal ağ ve kupasız savaş alanları

1. `[x]` Etkinlik merkezini günlük meta ve okunabilir ödül kartları etrafında yeniden düzenle
   - Ana ekrandaki büyük `Turnuvalar` başlığı kaldırıldı; günlük meta doğrudan etkinlik başlığına yerleştirildi.
   - İlk üç ödülü artık madalya, sandık görseli/adı, Devre Kredisi, Akı ve kozmetik içeriklerini ayrı etiketlerle gösteriyor.
   - Haftalık turnuvaya `100 Devre Kredisi` ile oyuncu katılımı, aylık takım turnuvasına yalnız liderin ücretsiz kayıt akışı eklendi.
2. `[x]` Haftalık sıralamayı kayıt sonrası kazanılan normal Arena kupalarına bağla
   - Kayıtsız gerçek oyuncular haftalık sıralamaya alınmıyor; kayıt anında haftalık sayaçlar sıfırlanıyor.
   - Kayıttan sonra yalnız `arena_ai` ve `ranked_pvp` maçlarında kazanılan pozitif kupa haftalık skora ekleniyor.
3. `[x]` AI zaferlerinde `+0 Kupa` üreten eşleştirme sapmasını kaldır
   - Normal AI eşleştirmesi artık sessizce takım turnuvası oturumuna çevrilmiyor; `arena_ai` dereceli ve kupa uygunluğu açık kuruluyor.
   - Arkadaş savaşı ve takım antrenmanı ise açıkça kupasız, ödülsüz ve normalleştirilmiş ayrı oturum türleri olarak kalıyor.
4. `[x]` Çekirdek patlamasından önce CAN göstergesini kesin olarak sıfırla
   - Terminal sonuç son savaş snapshot'ından önce gelse bile yok edilen çekirdek istemci modelinde ve görünen devrede `0 CAN / destroyed` durumuna sabitleniyor.
   - 2–3 saniyelik patlama sunumu boyunca kırmızı CAN artığı görünmüyor.
5. `[x]` Takım alt sekmelerinin dikey büyümesini durdur
   - Takım merkezi yalnız içerik ve sabit alt sekme satırından oluşan iki satırlı ızgaraya geçirildi; beş sekme 38 piksel yükseklikte sabitlendi.
6. `[x]` Profil altına Arkadaşlar alanı ve oyuncu profiline arkadaş eylemi ekle
   - Oyuncu arama, istek gönderme, kabul/ret, 100 arkadaş sınırı ve iki yönlü kalıcılık sunucu sözleşmesine bağlandı.
   - Herkese açık gerçek oyuncu profilinde ilişki durumuna göre `Arkadaş`, `İstek Gönderildi` veya `İsteği Kabul Et` eylemi gösteriliyor; AI profilleri sosyal istek almıyor.
7. `[x]` Arkadaş ve takım antrenman savaşlarını kupa hesabından ayır
   - Arkadaşlar sayfasından kupasız savaş daveti gönderme/kabul etme ve hazırlanmış savaş alanına iki tarafın yeniden girebilmesi eklendi.
   - Takım Savaş sekmesindeki antrenman daveti kabul edildiğinde de aynı ödülsüz özel PvP oturumu kuruluyor; kupa, deneyim, kredi ve sandık verilmez.
8. `[x]` Takım turnuvasına sistem saatli canlı eşleşme alanı kur
   - Takım liderinin aylık kaydı sonrası sistem cumartesi `18.00 UTC / 21.00 Türkiye` için yakın kupalı üye eşleşmeleri ve tekil savaş oturumları üretir.
   - Giriş penceresi maçtan 15 dakika önce açılır ve 30 dakika sonra kapanır; fikstürde oyuncunun rakibi, yerel saat ve canlı giriş düğmesi gösterilir.
   - İlk üç takım ödülünde üye uygunluğu en az `5` katkı puanına bağlıdır; takım avatarı ve takım çerçevesi ödül tanımlarına eklendi.
9. `[x]` Genel liderlik ilk beş kasa kararını görünür veri sözleşmesine geçir
   - İlk beş sıra için birbirinden farklı kasa adı/görsel kimliği, kredi, Akı, evrensel modül parçası ve kozmetik paketleri tanımlandı.
   - Lider panosunda kasa adı ile yapboz parçası simgeli evrensel parça önizlemesi gösteriliyor.

Doğrulama: Beta.59/Beta.58 seçili sunucu paketi `16/16`; istemci paketi `41/41` test dosyası ve Relay istemci alt paketi `176/176` geçti. Arkadaşlık kalıcılığı, kupasız savaş oturumu, normal AI savaşının dereceli kalması, haftalık kayıt filtresi, canlı takım fikstürü, zengin ödül sözleşmesi ve ilgili istemci yüzeyleri regresyon testleriyle kapsandı.

### Belge incelemesinden kalan altyapı kuyruğu

- `[x]` E-posta/telefon doğrulaması, hesap kurtarma, çoklu cihaz ve GDPR silme/veri dışa aktarma ürün akışları kuruldu; Google/Apple OAuth sağlayıcı etkinleştirmesi dağıtım kimlik bilgilerini bekliyor.
- `[x]` Davet linki/kod/QR içeriği, deep-link tüketimi, doğrudan mesaj, engelleme/şikâyet ve paylaşım tamamlandı; gerçek push teslimi FCM/APNs sağlayıcı anahtarlarını bekliyor.
- `[x]` Kazanılan savaş emojileri sunucu doğrulamalı WebSocket sosyal ifade paketiyle rakip istemciye iletiliyor.

## Önceki aktif paket — Beta.58 takım Profil sekmesi ve günlük meta çarkı

1. `[x]` Takım ekranını Profil sekmesiyle aç
   - Daha önce kaldırılan `Genel` konumu `Profil` adıyla geri getirildi ve Takım ekranının varsayılan ilk alt sekmesi yapıldı.
   - Herkese açık takım profilindeki takım kimliği; toplam/ortalama kupa, toplam maç, galibiyet oranı, turnuva sırası ve turnuva puanı aynı sunucu özetiyle bu sekmeye taşındı.
   - `Profil`, `Üyeler`, `İstek`, `Sohbet`, `Savaş` sıralı beş alt sekmeli düzen kuruldu.
2. `[x]` Sezonluk metayı oyuncu bazlı günlük metaya dönüştür
   - Hasar, Savunma, Destek, Sabotaj, Sistem, Çekirdek ve Akım Desteği olmak üzere yedi eşit olasılıklı meta tanımlandı.
   - Her oyuncunun seçimi UTC günü boyunca sunucuda saklanıyor; aynı gün yenileme veya yinelenen istek sonucu değiştirmiyor.
   - Günün ilk başarılı girişinde kapatılamayan çark ekranı açılıyor; `METAYI BELİRLE` sonucunda seçilen meta gösteriliyor ve ertesi güne kadar sabitleniyor.
   - Çark animasyonu artık sunucunun seçtiği dilimde duruyor; görsel sonuç ile kaydedilen günlük meta birbiriyle eşleşiyor.
   - Seçilen meta ilgili modül sınıfının savaş değerlerine uygulanıyor; etkileşimsiz AI oyuncular için gün ve oyuncu kimliğine bağlı kararlı günlük meta üretiliyor.
   - Eşleştirme AI'ları geçici maç slotu yerine kanonik bot kimliğiyle, yerel AI ise kanonik arşetip kimliğiyle tohumlanıyor; aynı UTC gününde yeni maç açmak metayı değiştirmiyor.
   - Etkinlik merkezindeki sezon metası kartı `Bugünün Metası` kartına dönüştürüldü.

Doğrulama: İstemci paketi `40/40` test (`176` Relay istemci kontrolü dâhil), Beta.58 takım/meta ve ilişkili oyun paketi `67/67` geçti. Yedi eşit seçenek, UTC yenilenmesi, aynı gün değişmezliği ve kalıcılık, yedi metanın gerçek savaş eksenlerine etkisi, sistem/akım metasının gerçek enerji üretimi, takım Profil özeti ile herkese açık takım özeti eşitliği ve istemci açılış/çark sözleşmeleri otomatik regresyon testleriyle kapsandı.

## Önceki aktif paket — Beta.57 takım profilleri ve etkinlik alt sayfaları

1. `[x]` Takımları herkese açık profil olarak görüntülenebilir yap
   - Oyuncunun kendi profilindeki takım adı, Takım Merkezi başlığı, takım lider panosu ve takım turnuvası sıralamasındaki takım adları takım profiline bağlandı.
   - Gerçek oyuncu takımları ile altı AI takımı aynı profil sözleşmesini kullanıyor; toplam/ortalama kupa, takım maçları, galibiyet oranı, aylık turnuva sırası ve puanı gösteriliyor.
   - Takım üyeleri kupa sırasıyla listeleniyor; üye adına tıklanınca yalnız herkese açık oyuncu profili açılıyor.
2. `[x]` AI profil galibiyet oranını tek veri sözleşmesine geçir
   - AI profillerinin yüzde değerini oran gibi yeniden yüzdeye çeviren çift dönüşüm kaldırıldı; sunucu gerçek oyuncularla aynı `0..1` oranını gönderiyor.
   - İstemci eski veya bozuk veri gelse bile galibiyet oranını `%0..%100` aralığında sınırlıyor; `%6600` benzeri gösterimler artık üretilemiyor.
3. `[x]` Etkinlik merkezini ayrı etkinlik sayfalarına böl
   - Ana Etkinlik ekranı aktif etkinlik adlarını listeliyor; isme/karta tıklanınca haftalık bireysel turnuva veya aylık takım turnuvasının ayrı ekranı açılıyor.
   - Haftalık etkinlikte `Genel`, `Sıralama`, `Ödüller`; takım etkinliğinde `Genel`, `Sıralama`, `Eşleşmeler`, `Ödüller` alt sekmeleri bulunuyor.
   - Takım sıralaması ve fikstürdeki takım adları da doğrudan takım profiline bağlandı.

Doğrulama: Kullanıcının önceki açık tercihi doğrultusunda çalıştırmalı test veya tarayıcı denemesi yapılmadı; yalnız kod, rota, görünüm ve veri sözleşmesi incelemesi uygulandı.

## Önceki aktif paket — Beta.56 takım, etkinlik ve sezon rekabeti

1. `[x]` Takım ekranını doğrudan Üyeler görünümünde aç
   - `Genel` sekmesi ve tekrar eden özet paneli kaldırıldı; Takım ekranına her girişte `Üyeler` sekmesi seçiliyor.
   - İstek, Sohbet ve ödülsüz antrenman savaşı işlevleri korunarak alt sekme düzeni dört sütuna indirildi.
2. `[x]` Oyuncu adlarının ilk harf ucunun/gölgesinin kırpılmasını oyun genelinde çöz
   - Oyuncu adı bağlantıları ve profil/savaş/takım/liderlik kimlikleri taşma kutusu içinde güvenli yatay pay kullanıyor.
   - Uzun adlarda üç nokta davranışı korunurken Orbitron benzeri gliflerin sol ucu artık kesilmiyor.
3. `[x]` Profil çekirdek alışkanlığı başlığını sadeleştir
   - Kendi profilinde ve açık oyuncu profilinde çekirdek adının üzerindeki `AKTİF ÇEKİRDEK` metni kaldırıldı; çekirdek adı ve seviyesi kaldı.
4. `[x]` Mağaza özel tekliflerini haftalık döngüye geçir
   - Teklifler artık pazartesi UTC 00:00'da yenileniyor; mevcut teklif kimlikleri ve eski makbuzlar geriye dönük uyumluluk için korunuyor.
   - Arayüz `Haftalık Özel Teklifler` başlığını ve bir sonraki pazartesi sıfırlamasını gösteriyor.
5. `[x]` Her takvim sezonuna ayrı stratejik meta tanımla
   - On iki aylık döngü için ayrı meta adı, açıklama, öne çıkan oyun planı ve üç özellikli modül tanımlandı.
   - Etkinlik merkezi aktif sezon metasını ve öne çıkan modülleri gösteriyor.
6. `[x]` Haftalık bireysel turnuva ve ilk üç ödülünü kur
   - Galibiyet `3`, çekirdek yıkımı `+1` puan sözleşmesiyle pazartesi yenilenen sıralama eklendi.
   - İlk üç için Elmas/Altın/Gümüş sandık ile Devre Kredisi ve Akı ödül paketleri tanımlandı; gerçek oyuncuların haftalık savaş sayaçları sunucu profilinde tutuluyor.
7. `[x]` Aylık takımlar arası turnuvayı kur
   - Takımlar round-robin programla her hafta farklı rakiple eşleşiyor; üyeler en yakın kupa değerine göre eşleniyor ve kişi başı rövanşlı iki maç yapıyor.
   - Galibiyet `1`, mağlubiyet `0` takım katkı puanı; ilk üç takım ödülü için üye başına en az `5` katkı puanı şartı uygulanıyor.
   - Takım üyesinin haftadaki ilk iki uygun arena eşleşmesi otomatik olarak programdaki rakip AI takımın en yakın kupalı üyesine yönlendiriliyor ve takım turnuvası olarak kaydediliyor.
8. `[x]` Liderlik ve turnuva için 240 kişilik AI nüfusu oluştur
   - Önceki 120 AI oyuncunun `Nova`, `Volt` ve `Arc` takıları gerçek ad biçimine dönüştürüldü.
   - Arenaların tamamına dağıtılmış, farklı deste/arşetip kararları kullanan 120 yeni benzersiz AI oyuncu eklendi.
   - Yeni oyuncular 20'şer üyeli altı takıma dağıtıldı; AI oyuncular ve takımlar genel liderlik ile etkinlik sıralamalarına katılıyor ve AI açık profilleri görüntülenebiliyor.

Doğrulama: Kullanıcının açık isteği doğrultusunda bu paket için tarayıcı denetimi veya çalıştırmalı test yapılmadı; yalnız kod ve sözleşme incelemesi uygulandı.

## Önceki aktif paket — Beta.55 profil, koleksiyon ve savaş tutarlılığı

1. `[x]` Seçili avatar çerçevesini üst profil çubuğunda görünür kıl
   - Üst bardaki genel avatar gölgesinin seçili `neon_cyan` ve `season_gold` çerçevelerini ezmesi engellendi; halka ve parıltı üst barda da korunuyor.
2. `[x]` Lider tablosundaki ad kırpılmasını düzelt; ilk üç sırada altın, gümüş ve bronz madalya göster
   - İsim bağlantısına güvenli iç boşluk verildi; ilk üç sıra erişilebilir sıra etiketiyle `🥇`, `🥈`, `🥉` madalyalarını gösteriyor.
3. `[x]` Çekirdek hızlı işlem kartını seçilen karta ortala; detay görselini nadirlik yazısından aşağı taşı
   - Hızlı işlem kutusunun kart genişliğine ulaşmasını engelleyen üst sınır kaldırıldı; detay görseli 14 piksel aşağı alındı.
4. `[x]` Sezon yolu deneyim şartını bir kademe büyüt ve kartın alt kenarına yaklaştır
   - Şart metni `.38rem` yerine `.44rem` ve daha alçak alt hizayla çiziliyor.
5. `[x]` Savaş modüllerindeki eski üst CAN çubuğunu kaldır; maç sonundaki anlık Akım sıçramasını engelle
   - Savaş kartlarında eski CAN çubuğu DOM'u artık üretilmiyor; yalnız alt kenardaki tek CAN katmanı kullanılıyor.
   - Çevrimdışı savaş Akımı sunucuyla aynı `6/12`, `2,5 sn +1` sözleşmesine geçti; eski `saniye × 10` hesabı kaldırıldı.
6. `[x]` Kalkan Akım maliyetini `2` yap ve bütün modül Akım maliyetlerini fayda/güç ölçeğine göre yeniden dengele
   - Yaygın kartlar `2`, nadir kartlar faydasına göre `2–4`, epikler `4`, efsaneviler `5` Akım bandında; Kalkan `2` oldu.
7. `[x]` Nadirlik artışının CAN, hasar, onarım, modül desteği ve devre katkısına savaş motorunda eksiksiz yansımasını doğrula ve tamamla
   - CAN, saldırı, bekleme süresi ve enerji verimine ek olarak onarım/destek, batarya-depolama, soğutma, savunma ve sabotaj dirençleri de nadirlik etki çarpanını kullanıyor.
8. `[x]` Sabotaj veya enerji kesintisi altındaki modülü hedef çekme dâhil bütün faaliyetlerden çıkar
   - Tek bir operasyonel-modül kuralı saldırı, hedefleme, savunma, destek, sabotaj ve enerji üretim/dağıtımına uygulandı; etki temizlenince faaliyet geri geliyor.

Doğrulama: `39/39` istemci paketi (`176` Relay istemci testi dâhil) ve seçili sunucu oyun/denge paketi `114/114` geçti.

## Son değerlendirme — Sandık.docx oranları

1. `[x]` Belge önerisini canlı sandık sözleşmesiyle karşılaştır
   - Savaşta sandık gelme dağılımı iki düzende de aynıdır: `%65 Bronz`, `%23 Gümüş`, `%9 Altın`, `%3 Elmas`.
   - Garanti Devre Kredisi ve Akı aralıkları da aynıdır; fark yalnız modül parçası olasılıklarındadır.
   - Belge önerisinin ağırlıklı sandık başına modül parçası beklentisi yaklaşık `0,576`, mevcut düzeninki yaklaşık `0,712` parçadır.
2. `[x]` Mevcut oranları koru
   - Belge Bronz/Gümüş modül düşüşünü `%30`, Altın düşüşünü `%35`, Elmas düşüşünü `%38` seviyesine indiriyor; mevcut değerler sırasıyla `%35`, `%35`, `%50`, `%53`.
   - Daha düşük belge oranları, yüksek seviye yükseltmelerdeki `74–200` parça gereksinimi ve parçaların uygun modüller arasında dağılması nedeniyle ilerlemeyi gereksiz yere yavaşlatıyor.
   - Belgenin Elmas sandık satırında Çekirdek Parçası yüzdesi boş bırakılmıştır; mevcut yalnız-Elmas `%6` bağımsız çekirdek parçası ihtimali korunmuştur.
   - Sonuç olarak `server/app/meta_progression.py` sandık değerlerinde değişiklik yapılmadı.

## Tamamlanan düzeltme — Savaş CAN görünürlüğü ve maç sonu yerleşimi

1. `[x]` Devre üzerindeki CAN çubuğunu bağımsız görünür katmana taşı
   - Oyuncu ve rakip tarafındaki yerleşik kartlar artık `battle-module-card` olarak işaretleniyor.
   - Alt kenardaki CAN katmanı eski genel çubuk yerleşiminden bağımsız çiziliyor; doluluk gerçek CAN yüzdesini, renk ise yeşil/sarı/kırmızı eşiklerini izliyor.
2. `[x]` Mağlubiyet ödüllerini sadeleştir
   - Ödül kartlarında kaynak adı zaten bulunduğu için değerlerden `Kupa`, `DK` ve `Deneyim` tekrarları kaldırıldı.
   - Kupa kartındaki taç simgesi gerçek kupa simgesiyle değiştirildi.
3. `[x]` Hasar istatistiği ile Devam düğmesini ayır
   - Maç sonu istatistik alanı ile `DEVAM` düğmesi arasına görünür boşluk eklendi; düğme artık kartın alt çizgisine binmiyor.

## Tamamlanan düzeltme — Savaş alanı modül CAN çubukları

1. `[x]` Yerleşik modüllerin CAN çubuğunu alt kenara geri getir
   - Oyuncu ve rakip tarafındaki her yerleşik modülün CAN çubuğu kartın tam alt kenarına taşındı.
   - Çubuk `%67–100` aralığında yeşil, `%34–66` aralığında sarı ve `%1–33` aralığında kırmızı gösteriliyor; doluluk gerçek CAN oranını izliyor.
   - Sağlık çubuğunun yerini alabilmesi için modül kartının alt kenar çizgisi kaldırıldı.
2. `[x]` Yerleşik hücrenin altındaki dikey kablo parçasını kaldır
   - Hücreler arasındaki kablo ağı ve akım animasyonu korunurken, yalnız modül yerleştirilmiş hücrenin altından çıkan kısa dikey bağlantı çizilmiyor.

## Tamamlanan düzeltme — Sezon kozmetik görünürlüğü ve kredi metni

1. `[x]` Kozmetik ödül önizlemesinin gizlenmesini engelle
   - Ödül adlarını gizleyen seçici avatar ve avatar çerçevesi önizlemelerini artık kapsamıyor; kozmetik görseli `×1` miktarının yanında görünür kalıyor.
2. `[x]` Görsel Devre Kredisi ödüllerinden `DK` tekrarını kaldır
   - Devre Kredisi simgesi bulunan ödül satırları yalnız `+miktar` gösteriyor; para birimi artık simgeyle ifade ediliyor.

## Tamamlanan düzeltme — Sezon yolu kozmetik önizlemeleri

1. `[x]` Avatar ve avatar çerçevesi ödüllerini gerçek görselleriyle göster
   - `Avatar` ve `Avatar Çerçevesi` metinleri kaldırıldı; ilgili kademede kazanılacak kozmetiğin gerçek profil önizlemesi ve `×1` miktarı gösteriliyor.
   - Avatar çerçevesi, standart avatar üzerinde kendi neon veya sezon çerçevesiyle sunuluyor.
2. `[x]` Kademe deneyim şartını eylem alanına taşı
   - `... Deneyim ile açılır` bilgisi kartın sol altından kaldırıldı.
   - Deneyim şartı sağ tarafta `Kilitli`, `Al` veya `Alındı` eyleminin hemen altında gösteriliyor.

## Tamamlanan düzeltme — Sezon yolu ödül ızgarası

1. `[x]` Kademe ödüllerini görsel ve iki sütunlu düzene geçir
   - Kademe numarası solda, ödüller sağda iki sütunlu simge + miktar ızgarasında gösteriliyor.
   - Sandık aynı ızgaraya `×1` miktarıyla katıldı; Akı, Devre Kredisi ve parça ödülleriyle aynı görsel ağırlığa getirildi.
   - `Modül Parçası ve Akı` gibi toplu metin başlıkları kaldırıldı; ödül adları erişilebilir etiket ve bilgi balonu olarak korunuyor.
   - Modül kartı parçası simgesi, modül kimliğini koruyan puzzle parçası görünümüne dönüştürüldü.

## Tamamlanan düzeltme — Sezon yolu sandık ölçüsü

1. `[x]` Sandık ödülünü diğer sezon ödülleriyle aynı görsel ölçüye getir
   - Sezon sandığına ayrılan tam genişlikte vitrin kutusu kaldırıldı.
   - Sandık simgesi diğer ödül simgeleriyle uyumlu kompakt ölçüye indirildi.
   - Büyük ödül kademesinin altın çerçevesi ile sandık nadirlik rengi korundu.

## Tamamlanan düzeltme — Çekirdek ölümüne bağlı maç sonu

1. `[x]` Süre/hasar hakemliğini kaldır
   - `03:00` sonunda çalışan `time_limit_tiebreak` ve `time_limit_draw` üretimi kaldırıldı.
   - Maç artık yalnız bir Çekirdek yok edildiğinde veya oyuncu savaştan çekildiğinde galibiyet/mağlubiyet üretir; iki Çekirdek aynı adımda yok edilirse berabere biter.
2. `[x]` Sonsuz savunma çıkmazını Aşırı Yük ile çöz
   - `03:00` Aşırı Yük başlangıcıdır: saldırı hasarı artar, onarım verimi düşer ve bu fark her 30 saniyede büyür.
   - `03:30` sonrasında saldırılar yaşayan diğer modülleri beklemeden Çekirdeği hedefleyebilir.
   - `04:00` sonrasında iki Çekirdeğe de giderek artan kararsızlık hasarı uygulanır; sonuç yine yalnız gerçek Çekirdek yıkımıyla oluşur.
3. `[x]` Çoklu Onarım Modülü yığılmasını sınırla
   - Bir Onarım Modülü artık her aktivasyonda bütün hasarlı modülleri değil yalnız en düşük CAN oranındaki tek modülü iyileştirir.
   - Aynı destek adımında aynı hedef yalnız bir kez onarılabilir; çok sayıda Onarım Modülü odak hasarı üst üste silmez.
   - İstemci Aşırı Yük, Çekirdek açılması ve Çekirdek kararsızlığı aşamalarını canlı savaş bildirimiyle gösterir; savaş saati Aşırı Yükte renk değiştirir.

## Tamamlanan düzeltme — Açık profil Bearer oturumu

1. `[x]` Açık profil isteğine görüntüleyen oyuncunun Bearer belirtecini ekle
   - Kök neden, sunucudaki `/public-profiles/{player_id}` rotasının oturum doğrulaması istemesine rağmen istemci oturum katmanının `/public-profiles/` önekini korumalı API rotası olarak tanımamasıydı.
   - `/public-profiles/` istemcinin korumalı rota listesine eklendi; istekler artık mevcut oyuncunun kayıtlı oturumuyla imzalanıyor ve özel API adresi yapılandırılmışsa doğru sunucu köküne yönlendiriliyor.
   - URL içindeki oyuncu kimliği hedef profildir; oturum açan oyuncu olarak yorumlanmaz. Böylece görüntüleyen oyuncunun mevcut kimliği korunur ve başka kayıtlı oyuncuların salt okunur profili açılabilir.
2. `[x]` Açık profil sınırlarını koru
   - Sunucudaki endpoint anonim erişime açılmadı; kimliği doğrulanmış oyuncu oturumu gerektirmeye devam ediyor.
   - Başka oyuncu görünümünde yalnız Profil ana sayfasındaki deste alışkanlığı, takım, sezon ve istatistikler gösterilir; Avatar, Ödüller ve Ayarlar sekmeleri üretilmez.
3. `[x]` Açık profil üst bilgisini sadeleştir
   - Başlığın altındaki `Yalnız profil sayfası görüntülenir.` açıklaması kaldırıldı.
   - Yükleme tamamlandıktan sonra gösterilen `Salt okunur profil · Avatar, Ödüller ve Ayarlar gizlidir.` ayrıntısı kaldırıldı; boş durum satırı artık yer kaplamıyor, gerçek yükleme ve hata mesajları gösterilmeye devam ediyor.

## Tamamlanan paket — Sandık ekonomisi ve toplu açılış

1. `[x]` Sandık ödül sözleşmesini yeniden dengele
   - Savaş zaferi sandık dağılımı toplam `%100` olacak şekilde korundu: `%65 Bronz`, `%23 Gümüş`, `%9 Altın`, `%3 Elmas`.
   - Devre Kredisi ve Akı bütün sandıklarda garanti ödül olarak kalır; modül ve çekirdek parçaları bunlardan bağımsız olasılıklardır.
   - Bronz: `45–75 DK`, `2–4 Akı`; `%35 Yaygın`, `1–2` parça.
   - Gümüş: `90–145 DK`, `3–6 Akı`; `%25 Yaygın (2–3)` veya `%10 Nadir (1–2)` parça.
   - Altın: `175–280 DK`, `5–9 Akı`; `%30 Yaygın (3–4)`, `%15 Nadir (2–3)` veya `%5 Epik (1–2)` parça.
   - Elmas: `320–480 DK`, `10–15 Akı`; `%25 Yaygın (4–5)`, `%15 Nadir (3–4)`, `%10 Epik (2–3)` veya `%3 Efsanevi (1)` parça. Bunlardan bağımsız `%6` çekirdek parçası şansı vardır.
   - Nadirlik yüzdeleri API içinde mutlak olasılık olarak ayrıca yayımlanıyor; açma işleminin kullandığı koşullu nadirlik dağılımı bu mutlak tablodan normalize edildi.
2. `[x]` Günlük özel teklif sandıklarını aynı kurala bağla
   - Bronz, Gümüş ve Altın günlük teklifler artık ayrı ve zamanla sapabilecek bir ödül tablosu taşımıyor.
   - Her teklif kendi sandık tanımından kredi, Akı, modül parçası miktarı ve nadirlik olasılığını doğrudan türetiyor.
   - Satın alma bedelleri korunmuştur: `120 / 400 / 900 DK`.
3. `[x]` Sandık biriktirme ve toplu açılışı ölçekle
   - Dört yuva sınırı savaş ve hediye sandığı kazanımından kaldırıldı; oyuncu onlarca veya yüzlerce sandık biriktirebilir.
   - `Hepsini Aç` işlemi sunucuda her sandığı idempotent makbuzla işler ve ayrıca tek bir `reward_totals` özeti üretir.
   - Toplu sonuç ekranı sandıkları tek tek uzayan listede göstermek yerine toplam DK, Akı ve modül/çekirdek türü başına birleştirilmiş parçaları tek görünümde gösterir.
4. `[x]` Hediye sandığına eylem önceliği ver
   - Aynı türden birikmiş sandıklar olsa bile `HEDİYE SANDIK AÇ` eylemi kartta ilk sırada kalır.
   - Hediye bekleme süresindeyse sayaçlı ve devre dışıdır; altında açılabilir envanter için `HEPSİNİ AÇ` ayrı eylem olarak görünür.

## Önceki tamamlanan paket — Herkese açık profil ve koleksiyon ekonomisi

1. `[x]` Diğer oyuncular için salt okunur profil
   - Lider panosu, takım üye listesi, modül istekleri, takım sohbeti, antrenman davetleri, canlı savaş rakip adı ve maç sonucu adları profil bağlantısına dönüştürüldü.
   - `/public-profiles/{player_id}` yalnız Profil ilk sayfasına gereken kimlik, seçili kozmetik, deste/çekirdek, takım, sezon ve savaş istatistiği alanlarını döndürüyor.
   - Başka oyuncu görünümünde Avatar, Ödüller ve Ayarlar sekmeleri üretilmiyor; özel hesap ilerlemesi ve ayarlar API yanıtına dahil edilmiyor.
   - Herkese açık profil çağrısı oturum doğrulaması gerektiriyor fakat oturum sahibinin başka bir kayıtlı oyuncuyu okumasına izin veriyor.
2. `[x]` Yeni hesaplarda tüm modül parçalarını sıfırla
   - Yeni Arena 1 profili açık ve kilitli bütün modüller için `0` kart parçası ile başlıyor.
   - Eski kayıtlardaki kazanılmış miktarlar korunuyor; eski kayıtta hiç bulunmayan modül anahtarları `0` ile tamamlanıyor.
   - Arena erişimi kartı koleksiyonda açmaya devam ediyor; seviye yükseltmek için parçanın oyun/ödül yollarından kazanılması gerekiyor.
3. `[x]` Modül yeteneklerini Akı ile sıfırla
   - Seçilmiş her yetenek için `25 Akı` sıfırlama bedeli tanımlandı.
   - Modül Yetenekler sekmesi seçili yetenek sayısını, toplam bedeli ve `YETENEKLERİ SIFIRLA` eylemini gösteriyor.
   - Sunucu işlemi idempotent makbuzla Akıyı düşürüyor ve o modülün bütün dal seçimlerini temizliyor.
4. `[x]` Devre Yolu kupa metnini mutlak eşiğe çevir
   - Görsel metin artık arena içi farkı değil `mevcut toplam kupa / sonraki aşamanın toplam kupa eşiği` biçimini kullanıyor.
   - Örnek: Arena 2 içinde 375 kupalı oyuncu `375 / 600 Kupa` görür.
5. `[x]` Çekirdekleri nadirlik gruplarına ayır
   - Rezonans: Yaygın.
   - Muhafız ve Aşırı Yük: Nadir.
   - Kesinti ve Kapasitör: Epik.
   - Anka ve Kuantum: Efsanevi.
   - Kartlar > Çekirdek sayfası bu dört nadirlik başlığı altında ayrı koleksiyon grupları gösteriyor; detay ekranına da nadirlik etiketi eklendi.

## Önceki paketten korunan tamamlanmış işler

- Sezon yolundaki sandık ödülleri metin yerine gerçek sandık görseliyle gösteriliyor.
- Enerji açığı bağlı modüllere oransal dağıtılıyor; sıranın sonundaki saldırı modülü keyfi biçimde enerjisiz kalmıyor. Yalnız EMP/Sinyal Bozucu gibi açık devre dışı bırakma etkileri modülü kapatabiliyor.

## Doğrulama

- Kullanıcı test ve denemeleri kendisinin yapacağını belirtti; bu pakette otomatik test, sözdizimi kontrol komutu veya tarayıcı denetimi çalıştırılmadı.
- Açık profil 401 düzeltmesi de istek akışı ve kod farkı üzerinden incelendi; kullanıcı talebi uyarınca çalıştırmalı test yapılmadı.
- Çekirdek ölümüne bağlı maç sonu ve Aşırı Yük paketi kod akışı üzerinden incelendi; kullanıcı talebi uyarınca çalıştırmalı savaş/test yapılmadı.
- `Sandık.docx` içindeki tek sayfalık önerinin metin ve tablo içeriği okundu. Paketlenmiş çalışma ortamında LibreOffice bulunmadığı için kaynak DOCX PNG olarak render edilemedi; belge içeriği `python-docx` ve OOXML sayfa bilgisi üzerinden incelendi.
- Değişiklikler kod farkları ve hedef dosya kesitleri üzerinden gözden geçirildi.

## Devam notu

- Çalışma dizini: `D:\Projects\GRIDSHARD`
- Kullanıcı çalışma zamanı verileri korunmalıdır; `server/data/web_test_*.json` ve `.bak` dosyaları geri alınmamalı veya düzenlenmemelidir.
- Bu paketle değişen dosyalar: `client/index.html`, `client/src/app.js`, `client/src/auth-session.js`, `client/src/canon.css`, `client/src/styles.css`, `server/app/balance_simulation.py`, `server/app/game/catalog.py`, `server/app/game/catalog_view.py`, `server/app/game/combat.py`, `server/app/game/engine.py`, `server/app/game/energy.py`, `server/app/game/pvp_session.py`, `server/app/main.py`, `server/app/meta_progression.py`, `server/app/player_data_store.py`, `server/app/player_profile.py`, `server/app/web_test.py`, `docs/GRIDSHARD_2_1_KANONIK_TASARIM.md` ve bu checkpoint.
- Önceki paketten çalışma ağacında kalan dosya: `server/app/game/energy.py`.
