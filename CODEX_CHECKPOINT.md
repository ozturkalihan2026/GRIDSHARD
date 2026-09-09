# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 10 Eylül 2026

Bu dosya, sohbet geçmişi kaybolduğunda veya kullanım kredisi bittiğinde GRIDSHARD geliştirmesine aynı noktadan devam etmek için kanonik çalışma kaydıdır. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya okunmalı, ardından `git status --short` çalıştırılmalı ve aşağıdaki açık işler yeni bir kullanıcı isteği yoksa belirtilen sırayla ele alınmalıdır.

## Kaynakların önceliği

Kararlar şu sırayla yorumlanır:

1. Kullanıcının en yeni açık mesajı.
2. `C:\Users\S-A\Desktop\Yapılacaklar.docx` içindeki 10 Eylül 2026 tarihli yapılacaklar listesi ve işaretli ekran görüntüleri.
3. `docs/YOL_HARITASI.md` dosyasındaki 1972. satırdan başlayan `28. Mobil Ürün Yönü — Beta.39 Çalışma Planı` ve sonraki bölümler.
4. Daha eski belgeler ve tarihsel testler.

`YOL_HARITASI.md` içindeki bölümler kendi aralarında da kronolojik yorumlanır. Beta.42 kanonik ürün geçişi, Beta.39-41 içindeki çelişen port, yön, özel hücre ve Jeneratör zorunluluğu kararlarının yerine geçer. Eski testlerin varlığı eski davranışı yeniden etkinleştirme gerekçesi değildir.

## İncelenen Yapılacaklar belgesi

- Kaynak: `C:\Users\S-A\Desktop\Yapılacaklar.docx`
- Son değiştirilme: 10 Eylül 2026 00:03:23
- SHA256: `B326C91D2E289FEF78D71601E04768D51631EF1846FAA1EA2798A7776F006E1C`
- İçerik: 40 paragraf, 20 anlamlı geliştirme maddesi, 5 işaretli ekran görüntüsü.
- Belge değiştirilmedi. Metin, paket yapısı ve gömülü beş görsel incelendi.
- Paketli ortamda LibreOffice bulunmadığı için DOCX sayfa render'ı üretilemedi. Bu, içerik analizini engellemedi; bütün metin python-docx ile okundu ve beş gömülü görsel özgün çözünürlükte ayrı ayrı incelendi.

## Depo durumu

- Dal: `main`
- Analiz başlangıcındaki HEAD: `ae1b9491b86fbf4e7899824d0d7d8a2530e7cae4`
- `ae1b949` yalnız önceki checkpoint'i silmiş ve yerel web test verilerini güncellemiştir.
- Son kapsamlı kod paketi: `4945b30 GRIDSHARD 2.1`
- Bu turda oyun kodu değiştirilmedi; yalnız bu checkpoint yeniden oluşturuldu.
- Kullanıcıya ait `server/data/web_test_*.json` çalışma zamanı verileri korunmalıdır. Toplu geri alma, `git reset --hard` veya profil/telemetri verilerini temizleme yapılmamalıdır.

## Korunacak tamamlanmış temel

Aşağıdaki davranışlar önceki turlarda uygulanmıştır ve yeni bir karar açıkça değiştirmedikçe geri alınmamalıdır:

- Eşleştirme iptali ve yeniden başlatma yerel arayüzü kilitlemez; AI eşleşme yedeği bulunur.
- Profil adı, ödül, sandık, modül ve çekirdek işlemlerinde sunucu makbuzu ve `request_id` tekrar koruması kullanılır.
- Ödüller profile sunucu onayıyla kalıcı işlenir; hediye sandığı talep ve açma tek tekrar-güvenli işlem olarak çalışır.
- EV ekranında çekirdek arkada, altı modül önde ve SAVAŞ düğmesi aşağıda bulunur.
- Profilde En Çok Kullanılan Deste aynı çekirdek/modül kompozisyonunu kullanır; görünen Klan metinleri Takım olarak değiştirilmiştir.
- Sezon yolu 40 kademedir ve yaklaşık bir aya yayılacak Deneyim eğrisi kullanır. Görünen SXP metinleri Deneyim olarak değiştirilmiştir.
- Maç sonu hasar ekranından ödül ekranına, oradan tek DEVAM düğmesiyle EV ekranına dönülür.
- Devre Yolu geri ve Lider Panosu düğmeleri alt çubukta görünür ve yol içeriği kayarken sabit kalır.
- Savaş tahtası 5x3'tür; Çekirdek merkezde sabittir. Port, yön, döndürme, özel hücre ve Jeneratör zorunluluğu aktif kanondan çıkarılmıştır.
- Raftaki modüllerde CAN çubuğu gizlidir ve Akım maliyeti görünür. Tahtaya yerleşen modüllerde canlı CAN çubuğu gösterilir.
- Modül hasar ve onarım olayları kısa süreli kırmızı/yeşil yükselen savaş metni üretir.
- Çekirdek gücü kullanıldığında ilgili tahtada `core-wave` geri bildirimi ve hedef üzerinde güç türüne uygun savaş metni görünür.
- Devre Yolu modül parçası durakları gerçek modül simgesini ve sınıf rengini kullanır.
- Avatar seçimi üst profil şeridine anında yansır.
- Günlük, sezon, arena ve mağaza ödüllerinden sonra gereksiz başarı cümleleri gösterilmez; hata mesajları korunur.

## Yapılacaklar belgesi durum analizi

Durum işaretleri:

- `[x]` Kodda mevcut; yalnız kullanıcı görsel/oyun kabulü gerekebilir.
- `[~]` Kısmen mevcut; eksik kapsam tamamlanmalı ve regresyon testi eklenmeli.
- `[ ]` Henüz uygulanmadı.
- `[!]` Diğer işler tamamlandıktan sonra yapılacak güvenlik hassasiyetli temizlik.

### A Arayüz ve savaş okunabilirliği

1. `[ ]` Sezon Ödülleri geri düğmesi
   - Yeni istek: `← ÖDÜL BÖLÜMLERİ` düğmesi sabit kalmamalı; sezon ödül listesinin gerçek sonunda bulunmalı ve kullanıcı sayfanın en altına kaydırınca görünmeli.
   - Mevcut uygulama önceki isteğe göre düğmeyi ödül panelinin altında sürekli görünür tutuyor. Bu madde yeni karar olarak ele alınmalı.
   - Profil alt sekmeleri yerinden oynamamalı; yalnız sezon içeriği kaymalıdır.

2. `[ ]` Modül bilgi penceresi simge konumu
   - Lazer örneğinde büyük simge modül adı ve nadirlik metninin üzerine geliyor.
   - Tüm modüllerde ortak hero bileşeni düzeltilmeli; simge biraz aşağı alınmalı, ad ve nadirlik üst merkezde okunur kalmalı.

3. `[~]` Sistem, Destek, Savunma ve Sabotaj katkı değerleri
   - Motor ve `server/app/game/catalog_view.py` birçok sayısal etki satırını zaten üretiyor.
   - `server/app/meta_progression.py::_module_view` bu `effect_lines` alanını koleksiyon yanıtına taşımıyor ve `client/src/app.js::renderModuleDetailTab` bilgi ekranında bu satırları göstermiyor.
   - Kalkan azaltımı, Onarım miktarı/sıklığı, Yansıtıcı azaltım ve yansıtma oranı, enerji üretim/depolama/tüketim katkıları ile sabotaj süre/çarpanları oyuncuya gerçek motor değerlerinden gösterilmeli. Sabit kopya değerler yazılmamalı.

4. `[x]` Tahta CAN çubukları ve uçan savaş değerleri
   - Rafta CAN çubukları gizli, tahtada görünür.
   - `module_damaged`, onarım ve diğer savaş olayları büyüklüğe göre kısa süreli renkli yükselen metin üretir.
   - Kullanıcı görsel testinde okunabilirlik ve aynı anda çok olay olduğunda üst üste binme kontrol edilmeli.

5. `[ ]` Çekirdek görsel renk tutarlılığı
   - Aşırı Yük Çekirdeği koleksiyonda kırmızı, bilgi penceresinde mavi görünüyor.
   - Koleksiyon kartı, aktif çekirdek, bilgi penceresi ve savaş düğmesi aynı çekirdek kimliği/renk token'ını kullanmalı.

6. `[x]` Çekirdek özel gücü görsel geri bildirimi
   - Kullanımda devre tahtasına `core-wave` sınıfı uygulanıyor ve hedefte güç türüne uygun geri bildirim çıkıyor.
   - Yedi çekirdek türü için görsel tonun ayırt edilebilirliği kullanıcı testinde doğrulanmalı.

### B Ödül bütünlüğü ve yönlendirme

7. `[~]` Arena 1 başlangıç modülleri ve Devre Yolu parça havuzu
   - Başlangıç destesi `unlock_trophies == 0` olan `STARTER_IDS` listesinden üretiliyor.
   - Genel arena parçası dağıtımı açılmış modülleri kullanıyor.
   - Hedefli `module_shard_target` düğümlerinin kendi arena eşiğinde gerçekten açılmış bir modüle işaret ettiği bütün veri dosyası boyunca denetlenmeli; Arena 1 Ray Topu örneği için sözleşme testi eklenmeli.

8. `[~]` Günlük, sezon ve sandık ödüllerinde açılmamış modül yasağı
   - Sandık ve mağaza teklifleri mevcut arenaya göre aday filtreliyor.
   - Günlük ve sezon ödülleri tercih edilen desteden veya başlangıç destesinden modül seçiyor; bu çoğu normal profilde güvenli olsa da tek bir sunucu invariantı ile garanti edilmiyor.
   - Bütün ödül kaynakları `unlocked_module_ids(max(rating, highest_rating))` üzerinden ortak seçim yardımcısı kullanmalı. Bozuk/eski profil destesi ile açılmamış kart parçası verilemediğini gösteren test eklenmeli.

9. `[~]` Ödül parçasının gerçek adı ve görseli
   - Sandık açılışında modül adı gösteriliyor; Devre Yolunda hedefli modül simgesi gösteriliyor.
   - Sandık, günlük ve sezon ödüllerinde modül simgesi eksik; çekirdek parçası genel ad/simge kullanıyor ve tür adı görünmüyor.
   - Tüm ödül makbuzları `module_definition_id` ve `core_type_id` taşımalı. İstemci ortak bir ödül satırı bileşeniyle ilgili modül/çekirdek adı, rengi, simgesi ve miktarını göstermeli.

10. `[~]` Profil avatarından başlayan kırmızı bildirim yolu
    - Günlük ve sezon için üst şeritte iki bildirim noktası mevcut.
    - Avatar/çerçeve kazanımı, profil kök avatarı, Ödüller sekmesi, Günlük/Sezon giriş kartları ve ödülün bulunduğu son ekrana kadar hiyerarşik/persist edilen bildirim zinciri yok.
    - Nokta yalnız ilgili yeni öğe görülünce veya ödül alınınca temizlenmeli; sayfa yenilemesi bildirimi yanlışlıkla silmemeli.

11. `[ ]` Sandık türü adetleri ve Hepsini Aç
    - Mağaza sandık alanında her tür için `Bronz Sandık x 10` benzeri adet görünmeli.
    - Her türün altında `HEPSİNİ AÇ` eylemi eklenebilir.
    - Toplu açma, zaman kilidini atlamamalı; yalnız açılabilir sandıkları sırayla ve her biri için tekrar-güvenli makbuzla açmalı. Bir hata olduğunda kalan sandıkları ve tamamlanan makbuzları kaybetmemeli.

### C Modül rolü ve denge

12. `[ ]` Soğutucu ve düşük etkili modüllerin rol incelemesi
    - Soğutucu şu anda ısıyı ve bazı sabotaj sürelerini azaltıyor.
    - Kullanıcının `%5 daha hızlı ateş` önerisi karar örneğidir; doğrudan sabitlenmemeli. Önce kullanım oranı, kazanma oranı ve enerji etkisi ölçülmeli; gerekiyorsa etkisi değiştirilmelidir.

13. `[ ]` Saldırı modülü yığılmasına karşı karma deste dengesi
    - Saf saldırı dizilimlerinin Çekirdek üretimiyle aşırı kolay beslenip beslenmediği simülasyonla ölçülmeli.
    - Savunma CAN/azaltım değerleri, enerji kapasitesi, Akım yenilenmesi ve destek/sistem sinerjileri ayrı adaylar olarak denenmeli.
    - Amaç saf saldırıyı yasaklamak değil; saldırı, savunma, sistem ve destek karışımlarının rekabetçi alternatif olmasıdır.

14. `[~]` Yeni kanona göre tüm modüllerin denge testi
    - Mevcut simülasyon ve denge regresyon araçları bulunuyor.
    - 36 modülün hasar, CAN, onarım, savunma, sabotaj, enerji, Akım maliyeti, seviye ve nadirlik ölçekleri için yeni bir matris çalıştırılmalı.
    - Saf saldırı, dengeli, savunma, enerji/sistem, destek ve sabotaj arketipleri karşılaştırılmalı. Sonuçlar kodu otomatik değiştirmemeli; aday denge değişiklikleri insan incelemesine sunulmalıdır.

### D Takım sistemi

15. `[ ]` Takım oluşturma ve takıma katılma
    - Mevcut Takım ekranı yalnız `Takım merkezi hazırlanıyor` yer tutucusudur.
    - Takım oluştur ve Takıma katıl eylemleri, sunucu modeli, kalıcı üyelik ve hata/tekrar güvenliği oluşturulmalı.
    - Takım ana sayfasının üstünde takım adı, üye sayısı/üst sınır ve üyelerin toplam kupa sayısı görünmeli.

16. `[ ]` Üyeler sekmesi
    - Üyeler kupa sayısına göre sıralanmalı; her satırda oyuncu ve kupa değeri bulunmalı.

17. `[ ]` İstek sekmesi
    - Oyuncu yalnız açılmış modülleri arasından parça isteyebilmeli.
    - Nadirliğe göre haftalık istek sınırı sunucu tarafından uygulanmalı.
    - Kendi isteği ile diğer üyelerin istekleri aynı ekranda görünmeli; bağış/karşılama işlemleri tekrar-güvenli olmalı.

18. `[ ]` Sohbet sekmesi
    - Takım üyelerinin kalıcı ve moderasyona hazır serbest sohbet alanı olmalı.

19. `[ ]` Savaş sekmesi
    - Çevrimiçi takım üyelerine antrenman savaşı isteği gönderilmeli.
    - Bu maçlar dereceli kupa/ödül ekonomisini etkilememeli ve normal savaş protokolünden açıkça ayrılmalıdır.

### E Son temizlik

20. `[!]` Legacy kod ve dosya temizliği
    - Yalnız 1-19 tamamlandıktan ve güncel testler onların davranışını güvenceye aldıktan sonra yapılacak.
    - Hedef adayları: port, yön/döndürme, sürükle-bırak, Jeneratör zorunluluğu, güçlendirici, eski devre görünümü ve artık kullanılmayan `docs`, `qa_reports`, `tests` içerikleri.
    - Bir ad veya dosyada eski terim geçmesi tek başına silme nedeni değildir. Önce aktif import, rota, veri göçü, test ve dokümantasyon referansları `rg` ile envanterlenmeli.
    - Silmeden önce tam hedef listesi kesin yollarıyla doğrulanmalı; çalışma zamanı verileri ve güncel test kanıtları silinmemeli.
    - Temizlik küçük geri alınabilir gruplar halinde yapılmalı; her gruptan sonra istemci, sunucu ve duman testleri çalıştırılmalıdır.

## Önerilen uygulama sırası

1. Görsel hızlı düzeltmeler: madde 1, 2 ve 5.
2. Ödül bütünlüğü: madde 7, 8 ve 9.
3. Bildirim ve sandık envanteri: madde 10 ve 11.
4. Modül açıklamaları ve denge: madde 3, 12, 13 ve 14.
5. Tamamlanmış savaş geri bildirimlerinin kullanıcı kabulü: madde 4 ve 6.
6. Takım sistemi: madde 15-19.
7. En son legacy temizlik: madde 20.

## En yakın devam noktası

Kullanıcının yeni bir öncelik vermemesi halinde ilk çalışma paketi şunlardır:

1. Sezon Ödülleri sayfasında ödül listesini, geri düğmesini ve profil sekmelerini tek sayfa kaydırma sözleşmesine göre yeniden düzenle.
2. Ortak modül hero CSS'inde simgeyi başlık/nadirlik metninden aşağı ayır.
3. Çekirdek renklerini tek veri kaynağına bağlayıp Aşırı Yük Çekirdeği regresyon testi ekle.
4. İstemci testlerini çalıştır; kullanıcı görsel testi için yalnız bu üç ekranı teslim et.

Bu ilk paket başlamadı. Sonraki ajan var olan uygulamayı incelemeli ve yukarıdaki yeni kararları eski sabit sezon düğmesi davranışının üzerine uygulamalıdır.

## Son doğrulama

10 Eylül 2026 tarihinde bu checkpoint hazırlanırken:

- İstemci JavaScript sözdizimi denetimi geçti.
- İstemci test paketi 33/33 dosyada geçti.
- `client/tests/relay-client.test.js` içindeki 176 sözleşme testi geçti.
- Seçili sunucu profil, sezon, sandık, kart/lider panosu ve telemetri grubu: 27 test geçti.
- Proje `.venv` ortamında `pytest` kurulu değildi; sunucu testleri Codex paketli Python çalışma ortamıyla çalıştırıldı.

Tekrar komutları:

```powershell
Set-Location D:\Projects\GRIDSHARD\client
node --check src/app.js
node --check src/i18n.js
node --test tests/*.test.js

Set-Location D:\Projects\GRIDSHARD
& 'C:\Users\S-A\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest -q server/tests/test_beta43_2_profile_season_chests.py server/tests/test_beta43_cards_leaderboards.py server/tests/test_telemetry.py
```

## Checkpoint güncelleme kuralı

Her anlamlı geliştirme paketi tamamlandığında, kullanıcıya son yanıt verilmeden önce bu dosya güncellenmelidir:

1. İlgili madde `[x]`, `[~]`, `[ ]` veya `[!]` olarak güncellenir.
2. Değişen ana dosyalar ve önemli veri sözleşmeleri not edilir.
3. Çalıştırılan testler ve sonuçları yazılır; çalıştırılmayan testler geçmiş gibi gösterilmez.
4. Yeni açık hata, konsol mesajı veya görsel kabul notu eklenir.
5. `En yakın devam noktası` tek ve uygulanabilir bir sonraki paketi göstermelidir.
6. Kullanıcı açıkça istemedikçe bu dosya silinmez. Yeni checkpoint dosyaları oluşturulup bilgi bölünmez; tek kaynak bu dosyadır.

