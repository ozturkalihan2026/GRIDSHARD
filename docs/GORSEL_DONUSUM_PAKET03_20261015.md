# Görsel dönüşüm — Paket 3: ana ekran ve marka

Tarih: 15 Ekim 2026. Durum: **Kullanıcı onayıyla oyuna bağlandı (son rötuşlar dahil).**
Kullanıcı, Paket 2 bağlantısından sonra 3. adıma geçilmesini istedi.
Paket 2 ve Paket 3 ortak web/native kaynak hattına bağlıdır. Aşağıdaki önizleme
bölümleri karar tarihçesidir; en güncel uygulama notu bu ilk bölümdür.

## Oyun entegrasyonu — son kullanıcı kararı

Son küçük rötuş (15 Ekim): SAVAŞ 214px/68%'ten 202px/64%'e daraltıldı.
20px yazı 19,333px, 32px ikon 31,333px oldu (her biri -0,5pt ≈ -0,667px).
48px eylem yüksekliği ve kalın font korunur. Ana ekran üst boşluğu 4→12px,
kısa ekranlarda 0→8px: arena alanı 8px aşağı indi. Bu rötuşlar oyuna bağlıdır;
diğer ölçülere, sahneye ve arka plana dokunulmadı. Bellekte stil derlemesi ve
sözdizimi kontrolü geçti; oyun/birim testleri yine kullanıcıdadır.
Ardından Paket 4A'nın ayrı onay önizlemesine geçildi; Paket 4A belgesine bakın.

Kullanıcı kaynak satırındaki kaymaları düzeltip ana savaş merkezindeki marka
logo/yazısını kaldırmayı, arena alanını yukarı almayı ve profil rengini mint
yapmayı istedi; ardından bütünüyle oyuna bağlama onayı verdi.

- `client/src/home-interface-v3.css` ortak stil bloğunda Paket 2'den sonra.
  Kaynaklar 44px tek grid satırı; ikon/değer/artı açık sütun/satır atamalı.
  320–440px için değer alanı hesabı yapıldı; uzun sayılar alt satıra geçmez,
  gerektiğinde ellipsis kullanır. Artılar 34px, opak/zeminsiz/bulanıksız.
- Profil üstü kaynak sırası korunur, profil 56px'te başlar. Varsayılan kişi
  simgesi mevcut çizimden mint; 50px alanda 43px görsel. Varsayılan avatar ve
  çerçevesiz seçimde dış levha yok. Başka seçili avatarlar, çerçeveler ve profil
  kozmetik arka planları korunur; yeni ödül eklenmez. Zarf altın, menü buz mavisi.
- Ana ekrandaki marka pseudo-elementi kaldırıldı; boş grid satırı da kaldırıldı.
  Devre Yolu ilk satırda yukarıda, hücresiz hacimli amblem olarak yerleşir.
  Deste üçüncü, kompakt ikonlu SAVAŞ beşinci satırdadır. Çok kısa ekranlarda
  içerik kaydırılabilir; deste/çekirdek sıkıştırılarak kaybedilmez.
- Gerçek eşikler `GridshardHomeInterface.roadProgress` sunum yardımcısıyla
  sıralanıp tekilleştirilir ve her aralık kendi oranıyla dolar. Veri yoksa
  gösterge gizlenir; hayalî dört eşik yoktur. Son lig kendi son ödül kupasını
  kullanır. Ekonomi, kupa/ödül üretimi ve sunucu verileri değiştirilmedi.
- Açılışta yeni logo kullanılır; launcher/mağaza ikonları ve eski logo dosyası
  korunur. Açılış durum kimlikleri, gerçek yükleme, hata ve yeniden deneme aynı.
  Son Devre atmosferi, seçili çekirdek çizimi, hareketi, altıgen sahnesi ve
  dock yönlendirmesi/değişen seçili etiketi korunur.
- Her mesajın solunda zeminsiz zarf okuma düğmesi var. **Zarfa dokunmak**
  okundu yapar; toplama/silme/davet işlemi yapmaz. Satın alım/sistem için mevcut
  sunucu `notices/seen` API'si yalnız seçilen veya önceden yerelde okunmuş
  kimliklerle çağrılır; sekmeyi açmak yeni mesajların hepsini otomatik okutmaz.
  Davet/ödül okunma işaretleri hesap anahtarlı cihaz tercihlerinde saklanır;
  bunlar sunucuya senkronize değildir. Yeni sunucu API'si/dağıtımı yok.
  Okunmuş olsa da toplanmamış sandık ve bekleyen davet bildirimleri korunur.
  Sandık inceleme düğmesi mesaj metninin içine taşındı, TOPLA aynı işleyicidedir.

Kontroller: JS/test dosyası sözdizimi, chrome109/safari15 dönüşümü, bellekte
CSS paketleme (0 uyarı), resim yolları/hash'leri, stil/betik sırası ve diff check.
Mevcut çeviri kaynaklarında 20 duplicate-key uyarısı ve HTML'de önceden bulunan
7 istatistik ID tekrarı var; bu kapsamda değiştirilmedi, yeni tekrar eklenmedi.
Regresyon sözleşmesi `client/tests/home-interface-v3.test.js` hazırlandı,
Paket 2 stil sırası sözleşmesi güncellendi; **oyun/birim testleri çalıştırılmadı**.
Tarayıcı/sunucu açılmadı; görsel kontrol ve oyun denemeleri kullanıcıda.
Kayıt: `qa_reports/visual-refresh-pack03-integration-20261015.json`.
Native/dist üretimi, sunucu/site yayını veya commit/push yapılmadı.

Yeni oyun varlıkları `client/assets/ui/home-v3/` ve açılış logosu
`client/assets/branding/gridshard-emblem-v2.webp`; büyük kaynaklar artifacts'ta.
Önceki HTML önizlemeleri tarihçedir; son dört rötuş ve gerçek hesap verili
bağlantı artık oyun kaynaklarındadır. **Paket 4 bu istekle başlamadı.**

## Revizyon 3 — güncel kullanıcı isteği

Kullanıcı Rush Royale ekranını yalnız yerleşim referansı olarak verdi. Başka
oyunun amblemi veya grafiği kopyalanmadı. Son istekle aşağıdaki yerel
yerleşim değişiklikleri açıkça istendi; revizyon 2'nin ilgili kararlarını geçersiz kılar:

- Devre Yolu karttan çıkarıldı. Mevcut üç düğümlü yükselen yol simgesinden
  hacimli, zeminsiz altın ikon üretildi; ana sayfada ortada 96px. Arena/lig
  adı üstünde, gerçek tekil eşikler ve kupa/eşik ilerleme metni altında.
  Son Devre atmosferi ve hareketli çekirdek/deste sahnesi aynen korunur.
- Savaş düğmesi 214px/68% ve 48px yüksekliğe küçültüldü. Solunda onaylı
  savaş ikonu, yanında kalın 20px Rowdies SAVAŞ. Ek açıklama satırı kaldırıldı.
- Profilin örnek kişi simgesi varsayılan olarak büyük ve çerçevesiz (48px
  alan/43px çizim). Tweak içindeki “Profil sunumu” seçimi kozmetik çerçeve
  alanını karşılaştırır. Bu gerçek bir kozmetik ödül veya yeni avatar değildir.
  Oyuna bağlanırken seçili avatar/çerçeve envanteri korunacak.
- Profil lavanta, zarf sıcak altın, menü buz mavisi: farklı görevler birbirinden
  ayrılır. Profil/menü mevcut çizimlerin yerel renk filtresidir; yeniden çizilmedi.
  Artılar 34px, opak ve bulanıksız; zeminsiz kalır. Kaynaklar en üsttedir.
- Kapalı/açık sıcak altın zarf çifti üretildi. Yeni **Mesaj Kutusu** önizleme
  sekmesinde dört kategori vardır; okunmamış satıra dokununca açık zarfa/Okundu
  durumuna geçer, ayrıntısı açılır. Tekrar kapatmak okunmadı yapmaz. Tarihler
  sağ altta kalır. Yalnız yerel örnek durum saklanır; oyun hesabına yazılmaz.
  Okunma, ödül toplama/silme veya davet kabul etme anlamına gelmez.

Üç yeni görsel built-in **Imagegen** ile üretildi; gerçek alpha doğrulandı.
Git dışı `artifacts/visual-refresh-pack03-20261015/` içinde masterlar ve teknik
ölçeklenmiş kayıpsız WebP'ler: `route-rev3.webp` (192px/18.722 bayt),
`message-rev3.webp` ve `mail-open-rev3.webp` (128px/14.222 ve 14.346 bayt).
Promptlar/referanslar: `GORSEL_DONUSUM_PAKET03_REV3_PROMPTLAR_20261015.json`.
Mevcut kaynak dosyaları değiştirilmedi. Revizyon 2 önizleme arşivi korundu.

Önizleme 901.018 bayt, 24 resim tanımı, 4 gömülü font. Statik dönüşüm,
yalıtılmış kompozisyon/dock/eşik ve mesaj okuma/kategori/geri yükleme kontrolleri
geçti. Tarayıcıyla görsel kontrol veya oyun testi yapılmadı; kullanıcıda.
**Bu revizyon da henüz oyuna bağlı değildir; kullanıcı tekrar karar verecek.**

## Revizyon 2 — önceki kararlar / korunacak temel

Kullanıcı ilk taslakta mevcut tasarımın gereksiz değiştiğini belirtti. Bu paket
yeniden yerleşim işi değildir: mevcut görseli ikon setine/kontrasta uydurma işidir.

- Ana ekranda en üstte Akı/DK, altında profil. **Üretim HTML/CSS'sinde zaten
  kaynak satırı üsttedir** (`app-resource-bar` top 6px, profil top 50px);
  düzeltme önizlemedeki ters sıraya yapıldı. Entegrasyonda tekrar ters çevirme.
- Artı işareti ayrı bir buton levhası olmadan kalın/hacimli; tıklama davranışı
  aynı kaynak kartından gelir. Genel ikon eylemleri zeminsiz kalır.
- Devre Yolu, geçerli arena/lig kademesinin gerçek kupa eşiklerinden birer dolum
  bölümü üretir. Aynı kupadaki birden çok ödül tek eşiktir. Sabit 4 bölümlük
  yedek gösterim kullanılmaz; veri yoksa sahte eşik üretilmez. Örnekler doğrudan
  `server/app/arena_canon.py`: Arena 1=6, Arena 2=5, Kıvılcım I=2,
  Şampiyonlar I=4, GRIDSHARD=1. Tweak aşama/ilerleme örneklerini değiştirir.
- En son **Devre atmosferi (14 Ekim)** arka planı aynen temel alınır: 38px
  devre ızgarası/nokta/vinyet ve mevcut lacivert yüzey. Yeni düz/sade zeminle
  değiştirme. Önceki tarihî baklava desenine de dönme.
- Deste panelinin mevcut 150–161px ölçüsü, seçili çekirdeğin vurgusu ve altıgen
  sahnesi korunur. Mevcut 16sn yörünge ve 2,6sn parıltı katmanları önizlemeye
  geri eklendi. Azaltılmış hareket/düşük grafik seçeneğinde durur; üretimdeki
  hareketleri silme veya savaş döngüsüne yeni iş ekleme. Deste yerleşimi değişmez.
- SAVAŞ genişliği mevcut `min(260px,72vw)` ailesinde kompakt; mevcut yaklaşık
  54px düğme, 16px başlık/yardımcı metin korunur. Sayfa genişliğine büyütme.
  Ekran uzadığında Devre Yolu ile deste arasındaki boşluk davranışı korunur.
- Dock aynı onaylı resimler ve geometriyle kalır; yalnız seçilinin adı görünür,
  seçili hücre genişler/yükselir. Önizlemede tıklanan dock düğmesine bu durum
  aktarılır, gerçek yönlendirme/satın alma yapılmaz. Diğer parçalar yeniden çizilmedi.

## Logo için açık istisna

Kullanıcı yeni logo önerisine izin verdi. Tek built-in **Imagegen** düzenlemesi:
mevcut kırık turkuaz kristal, altın devre halkası ve yatay bağlantı kimliği
korunup keskin sandıkların hacimli stiline taşındı. Görselde yazı yok;
GRIDSHARD ayrı Orbitron metnidir. Mevcut oyun/native/mağaza logosu değiştirilmedi.

- Orijinal master: `artifacts/visual-refresh-pack03-20261015/logo-v2-master.png`.
- Önizleme: `logo-v2-preview.webp`, 256px kayıpsız gerçek alpha, 54.786 bayt.
- Prompt, referans ve araç kaydı: `GORSEL_DONUSUM_PAKET03_LOGO_PROMPTU_20261015.json`.
- Export yalnız teknik ölçekleme; kırpma/boyama/tasarım değişimi yok.
- Logo da önizleme onayına tabidir. Büyük kaynaklar Git dışıdır, ayrıca taşınır.

## Tasarım sınırı

Revizyon 3'te açıkça istenen Devre Yolu/zarf ve logo önerisi dışında yeni avatar, modül veya çekirdek çizimi üretilmez. Onaylı dock,
sandıklar, para birimleri, kupa ve Paket 1 ikonları korunur. Paket 2'nin dolu
mavi yüzeyleri, geniş sade pahları ve kontrollü üst ışığı çevre tasarımına
taşınır. Altın yalnız ana vurgu/Devre Yolu üst kenarı, turkuaz yükleme/etkileşim
detayı; sis, dış parlama, yoğun desen ve yeni sürekli animasyon yok. Mevcut
arka plan/çekirdek hareketleri korunur; sadeleştirme adı altında kaldırılmaz.

Orbitron yalnız GRIDSHARD marka yazısında; Rowdies başlıklarda, Rajdhani
gövde/sayılarda. Metinler resme gömülmez. İkon eylemleri zeminsiz kalır.
Onay sayıları, kompozisyon içinde tekrar kullanıldığında yeni parça sayılmaz.

## Onay numaraları

| No | Parça | Karar | Onay sonrası kaynak hedefi |
| --- | --- | --- | --- |
| 01 | Logo sunumu | Mevcut kimliğe sadık tek yeni hacimli amblem önerisi + ayrı marka yazısı; büyük/küçük | `.boot-brand`, `.boot-title`, ana ekran marka sunumu; ayrı logo onayı olmadan dosya değiştirilmez |
| 02 | Açılış / yükleme | Mevcut devre atmosferi, açık durum yazısı ve mevcut ilerlemenin okunaklı sunumu; kısa ekran örneği | `.boot-screen`, `.boot-screen-backdrop`, `.boot-progress`; gerçek başlangıç/başarı/hata işleyişi değişmez |
| 03 | Profil üst barı | Büyük çerçevesiz örnek profil; lavanta/altın/buz mavisi ayrımı; kozmetik çerçeve alanı alternatifi | `.app-progress-ribbon`, `.lobby-player-card`; seçili oyuncu avatarı/çerçevesi korunur |
| 04 | Kaynak barı | En üstte mevcut Akı/DK çizimleri, okunaklı değerler, hacimli zeminsiz artı; normal/kompakt | `.app-resource-bar`, `.app-resource-chip`; mevcut mağaza bağlantısı/hesap verileri değişmez |
| 05 | Devre Yolu girişi | Hücresiz ortalanmış hacimli amblem; üstte arena/lig adı, altta gerçek tekil eşik sayısı kadar dolum bölümü/kupa ilerlemesi | `#home-arena-card`, `#home-arena-segments`; arena/lig kademesi verisinden dinamik |
| 06 | Deste sahnesi | Mevcut hareketli çekirdek ve altıgen sahne, mevcut 6 modül/deste yuvaları; mevcut ölçüler | `.home-loadout-card`, `.home-loadout-front`; resim, ölçü, hareket, hit alanı ve davranış korunur |
| 07 | Bölüm başlıkları | Dolu mavi kısa şerit, tek altın kenar vurgusu; ikon ayrı zeminsiz | Ortak `.mobile-section-heading` / `.season-section-heading` sunumu; bölüm kompozisyonları sonraki paketlerde |
| 08 | Sayfa / pencere başlığı | İkon + başlık + yardımcı metin için sade üst yüzey; ek mesaj kutusu örneğinde kapalı/açık zarf | Ortak ekran/diyalog başlık ailesi ve mesaj okunma sunumu; yeni kapatma düğmesi eklenmez |

## Önizleme kapsamı ve güvenlik

- Tek tasarım ailesi; **8 parça / Ana ekran / Açılış / Mesaj Kutusu** görünümleri.
  Parça levhasında büyük/küçük örnekler vardır. Tweak yalnız amblem boyutu ve
  yüzey derinliği, örnek arena/lig/ilerleme ve mevcut hareketin gösterimini
  ve profil sunumunu değiştirir. Uygulamaya ayar göndermez. Ana ekran görünümü varsayılandır.
- Profildeki genel kişi ikonu sadece örnek bağlamdır; seçili avatarı onunla
  değiştirme veya yeni avatar ailesi oluşturma onayı değildir.
- Ana ekran için mevcut kod-native modül/çekirdek SVG geometrileri ve stilleri
  yeniden kullanıldı. Üretim kodu değişmez, 8. paketteki çizim işine geçilmez.
- Devre Yolu işareti mevcut HTML geometrisine referansla hacimlendirildi. Kupa örneği,
  kazanılmamış lig kupası/ödülü kazanılmış gibi sunulmaz. Gerçek hesaba bağlı değil.
- Dock resimleri birebir mevcut onaylı dosyalardır. Taslakta yalnız yerleşim
  bağlamıdır; dock yüzeyini veya ikonlarını yeniden tasarlama kapsamı yok.
- Bakiyeler 0 Akı / 200 DK, seviye 1 ve %64 yükleme **örnek değerlerdir**.
  Gerçek yükleme yüzdesi üretimde yalnız mevcut başlangıç adımlarından gelecek;
  sahte süre/ilerleme veya hazır olmadan giriş eklenmez. Hata/yeniden deneme,
  inceleme girişi ve hesap kurtarma erişimi korunacak.
- Yeni oyun/tarayıcı/test sunucusu yok; mevcut kullanıcı sekmelerine/sunucusuna
  dokunulmadı. Ekonomi, satın alma, hesap, ağ, ödül ve savaş işleyişi kapsam dışı.

## Dosyalar ve kontroller

Git dışı klasör: `artifacts/visual-refresh-pack03-20261015/`.
Taşınabilir önizleme: `gridshard-pack03.html`.
Mevcut kaynakları salt okunur biçimde hazırlayan araç: `prepare-assets.cjs`.
Statik/yalıtılmış önizleme kontrolü: `check-preview.cjs`.
Kaynak ve önizlemeler başka bilgisayara ayrıca taşınır; arşiv silinmez.
Sohbet kopyası thread'e ait visualizations dizinindedir.

8 parça, benzersiz DOM kimlikleri, sekme/panel eşlemeleri, tüm resim/font
bağlantıları, 1 MB sınırı ve JS/CSS chrome109/safari15 dönüşümü kontrol edildi.
Yalıtılmış kompozisyon/eylem/durum geri yükleme kontrolü geçti. Bu bir tarayıcı
çizimi veya oyun testi değildir. CSS/font/resimler önizlemeye gömülüdür, dış ağ
çağrısı yok. Gerçek tarayıcı görsel kontrolü yapılmadı; oyun denemeleri kullanıcıda.

**Kullanıcı topluca veya numara bazında onayladıktan sonra oyuna bağlanır.**
Yalnız itiraz edilen parça değiştirilir. Paket 4 henüz başlamadı.
