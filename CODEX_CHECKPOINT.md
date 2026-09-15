# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 15 Eylül 2026

Bu dosya güncel çalışma paketini ve korunması gereken önceki kararları içerir. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya, ardından `git status --short` okunmalıdır.

## Aktif paket — Beta.56 takım, etkinlik ve sezon rekabeti

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
