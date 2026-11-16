# UI-01 — Ortak ekran hiyerarşisi ve bileşen sözleşmesi

16 Kasım 2026 · 2.5.0 hazırlığı · `codex/develop-2.5.0`

Bu teslim, ekran sözleşmesi ile [etkileşimli yerel prototipi](prototypes/release-250/index.html)
birlikte içerir. Prototip örnek veri kullanır, API'ye bağlanmaz ve oyun
paketinin girdisi değildir. Gerçek istemcide çalışan Mühendis Kasası'nın
[ayrı kabulü](engineer-case-ui-250-acceptance.md) geçerlidir; bu prototip
onun veya diğer yüzeylerin entegrasyon/cihaz kabulü sayılmaz.

Temel akış [BASE-03](onboarding-return-flow.md), ölçüm kapıları
[BASE-02](measurement-baseline.md), sanat ailesi
[ortak sanat yönü](../SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md) ile aynıdır.

## 1. Ortak çerçeve ve görsel dil

- Mevcut üst kaynak alanı, alt beşli dock ve onaylı boyalı nesneler korunur.
  Sayfalar kendi ikinci dock'unu veya ayrı neon HUD ailesini üretmez.
- Sayfa başında44×44 yalnız ok geri düğmesi, okunur başlık ve gerekiyorsa
  mevcut bağlam bulunur. Erişilebilir Geri/Back adı vardır. Ziyaret edilen
  profilde geri, ziyaretin açıldığı bağlama döner; varsayılan ana ekran
  dönüşü yalnız kayıp bağlam için güvenli çıkıştır.
- Koyu lacivert zemin, pah hissi veren çerçeve/üst ışık, açık metin, turkuaz
  durum vurgusu ve altın ana eylem ortak kullanılır. Kasa petrol/fildişi/bakır
  alt ailesi aynı ışık/derinlik içinde kalır; bütün ödüller kasa rengine boyanmaz.
- Bir yüzeyde bir ana eylem vardır. Diğer eylemler ikincil fiziksel düğmedir;
  kilit/boş/yetersiz durum yalnız gri renk ile anlatılmaz. Koleksiyon önizlemesi
  sakin bakır/şampanya vurgusuyla ayırt edilir; gerçek sahiplik izlenimi vermez.
- Alt sekmeler seçili fiziksel yüzey + `aria-selected`/uygun durum işaretiyle
  ayrılır; yazının altına çizgi, bağlantı dekorasyonu veya yeni neon şerit yoktur.
- Tipografi mevcut Rowdies başlık / Rajdhani gövde ailesidir. Yeni font,
  dış CDN, başka müzik veya sanat üretimi bu çalışmanın parçası değildir.

Prototip bu aileyi mevcut oyun varlıklarıyla temsil eder. Üretim CSS'si
`shop-rewards-v6.css`, `social-profile-v5.css`, `visual-polish-v9.css` ve
`rewards/choice-view.css` referanstır. Prototipin yerel token'ları kaynak
CSS'ye eklenmedi; UI-02/03/04 entegrasyonunda mevcut token'larla eşlenecek.

## 2. Yedi ekranın bilgi sırası

| Ekran | Üstten alta hiyerarşi | Ana eylem ve korunan sınır |
| --- | --- | --- |
| Ana ekran | Hesap/kaynaklar → mevcut çekirdek/deste → SAVAŞ → en fazla tek bağlamsal hedef → dock | SAVAŞ. BASE-03 önceliğiyle kazanılmış seçim/görev/ilk maç/günlük hedef. Başlangıç6 ile değişiklik zorunlu değil. |
| Mağaza | Kaynaklar → bölüm seçimi → uygun hediye → açık içerik/fiyatlı teklif → koleksiyon önizlemesi → normal sandıklar | Her ürün kendi İncele eylemiyle açılır. Oyun parası ve bedava kaynak açık; gerçek para satış/reklam yüzeyi gösterilmez. |
| Teklif detayı | Gerçek modül resmi/adı → garantili miktar/enderlik → fiyat ve para türü → süre/limit/uygunluk → inceleme/onay | SHOP-01 örneği500 kredi, haftada2; common12/rare6/epic3/legendary1. Sunucu hedef/revision sabitler; deck filtresi yeniden seçtirmez. |
| Mühendis Kasası | Hak/kazanım durumu → aynı özgün kasa → üç sabit rol/hedef/miktar → birini seç → incele → son onay → makbuz/sonuç | Yalnız bir paket. Sonra Seç hakkı korur. Gerçek sonuç matching server receipt sonrası; animasyon hak üretmez. |
| Sezon | Gerçek dönem/durum/tarihler → ücretsiz yol ilerlemesi → sonraki eşik → ücretsiz ödüller → kazanılmış haklara erişim | Ücretli geçiş gizli. Başlamadı/aktif/kapanış/ara ayrılır; yeni sezon tarihi onaylanmadan ilan edilmez. |
| Oyuncu/takım profili | Kimlik/başarılar → en çok kullanılan gerçek deste veya takım kazanımları → sahip olunanlar → kilitli koleksiyon vitrini → sezon geçmişi | Kendi profilinde sahiplik doğrulanınca kuşanma; ziyaret profilinde yalnız görünüm. Takım bağlantısı gerçek team_id ile açılır. |
| Maç sonrası | Kesinleşmiş sonuç → gerçek istatistik → teslim/ödül makbuzu → tek önerilen sonraki adım → tekrar savaş / ana ekran | Normal maç ile ödülsüz tekrar eğitim ayrılır. Gelişmiş neden özeti UI-06'ya bırakılır; sonuçtan ispatlanamayan açıklama yazılmaz. |

Mağaza sıralaması bir prototip yerleşim kararıdır; mevcut hediye sandık
kuralları, kaynak bütçesi veya normal sandık garanti/olasılık tablolarını
değiştirmez. Her gerçek sandık kendi içeriği ve limitiyle açılır; seçim kasası
normal rastgele sandık gibi sunulmaz. Kozmetik sanatı hazır olmayan ürün
yerine başka öğeyi yeni ürünmüş gibi göstermek kabul edilmez.

## 3. Ortak bileşenler ve veri sahipliği

| Bileşen | Gereken veri / durum | Uygulama bağlantısı ve kabul |
| --- | --- | --- |
| Sayfa başı / geri | Açan ekran/dialog bağlamı, erişilebilir başlık | Mevcut yönlendirme ve ortak geri düğmesi; odak açan öğeye döner. |
| Kaynak çubuğu | Doğrulanmış güncel hesap bakiyesi | Başarılı ekonomik makbuz/profil cevabı; yerel fiyat çıkarımı bakiye sayılmaz. |
| Bağlamsal hedef | Tek uygun görev/hak/maç/sezon durumu | BASE-03 önceliği; eski hesap yanıtı yeni hedefe uygulanmaz. |
| Ürün kartı / detayı | revision, hedef resim/adı, miktar, para, süre, limit ve kilit nedeni | SHOP-01/02/03; aynı ürünün kartı ve detayı aynı sabit veriyi gösterir. |
| Normal sandık kartı | Gerçek guarantee/odds ve claim/purchase durumu | Mevcut sandık API'si; hediye uygunluğu mağaza dock yeşil noktasını besler. |
| Seçim hakkı / seçenek | Hak snapshot/hash, rol/hedef/miktar ve teslim makbuzu | REWARD-02, DATA-01 ve mevcut choice-view; Hepsini Topla bu seçimi yapmaz. |
| İlerleme / dönem etiketi | Sayısal ilerleme/toplam, starts/ends ve sunucu durumu | UI-04; görsel çubuk metnin yerine geçmez, istemci saati dönem açmaz. |
| Koleksiyon önizleme | Gerçek sanat, kilit/kaynak/dönem, sahiplik/kuşanma | UI-04; stat bonusu veya ücretsiz sahiplik vaadi yok. |
| Durum alanı / tekrar dene | Yükleme, boş, hata, offline, eski cevap, pending | İlgili mevcut fetch/controller; hata başarıya çevrilmez, rol=status. |
| İnceleme/onay/sonuç | Sabit hak/teklif, seçilen option, mevcut request_id | Tek işlemi kilitle, aynı istekle yeniden dene; gerçek makbuzdan önce sonuç yok. |

Prototipteki font/renk/çerçeve/button/sekme/kart/progress/dock bileşenleri
yalnız yerel CSS kullanır. Uygulamaya aktarılırken7 ayrı benzer global CSS
override'ı eklemek yerine mevcut ortak yüzey/denetimle bağlanmalıdır.

## 4. Durum ve etkileşim sözleşmesi

| Durum | Görünen davranış | Yanlış yorumlanmaması gereken |
| --- | --- | --- |
| Loading | İlgili içerikte yükleme, çıkış erişilebilir | Boş bakiye/hak yok/hiç sezon yok sonucu çıkarılmaz. |
| Empty | Gerçek başarılı boş sonuç, bir güvenli çıkış | Kapalı dönem veya API hatası empty diye gösterilmez. |
| Error / offline | Açık hata, tekrar dene, güvenli geri | Kazanılmış hak silinmez; yeni hak veya teslim uydurulmaz. |
| Locked | Arena/sahiplik/dönem/yürürlük nedeni ve kaynağı | Kilitli modül/kozmetik kullanılabilir gibi işaretlenmez. |
| Insufficient | Gerekli fiyat/para ve mevcut bakiye | Alım eylemi kapalı; gerçek para satın almaya yönlendirme yok. |
| Limit / expired | Kalan hak0 veya bitmiş pencere; sunucudan güncel durum | İstemci saati, cihaz/deck değiştirme limit/teklif sıfırlamaz. |
| Selected / review | Seçim metin+kenarlıkla belli; gerçek hedef/miktar/fiyat gözden geçirilir | Seçmek teslim değildir. Geri/sonra seç para veya hak harcamaz. |
| Pending / yanıt kaybı | Tek işlem sürüyor; ikinci onay kapalı; aynı request ve hak detayıyla uzlaştır | Ağ hatasında yeni ekonomik istek veya ikinci kasa seçimi yok. |
| Delivered / already claimed | İlk eşleşen makbuz ve güncel hesap | Tekrar sonuç görüntülemek ikinci teslim yapmaz. |
| Scheduled / closing / intermission | Gerçek dönem açıklaması, haklara ayrı erişim | S2 otomatik başlamış veya yeni ödüller açılmış sayılmaz. |

Prototipin durum seçicisinde yükleme/hata/offline/boş ortak panelleri ve
ürün kilit/bakiye/limit/süre, kasa seçim/inceleme/örnek sonuç, sezon açılış/ara,
profil ziyaret/takım/kilit, maç sonrası eğitim/yenilgi örnekleri vardır.
Pending/retry/claim uzlaştırması yalnız tasarım sözleşmesidir; gerçek API'li
Engineer Case kabulü ayrıca mevcut dosyasında, mağaza uygulaması ise açıktır.

### Modal, geri ve odak

Öncelik: gerçek hesap/uyumluluk → devam eden maça dönüş → zorunlu oyun
önkoşulu → uygun tek duyuru → modal olmayan günün hedefi. Açık dialog üzerine
otomatik başka dialog bindirilmez. Duyuru TAMAM ve sunucu onayıyla korunur;
Mesaj Kutusu'ndan tekrar okunur. Savaş/arka planda otomatik modal yoktur.

Üretimde ürün/inceleme geri ile açan sayfaya, ziyaret profili açan dialog'a
döner. Seçim kasasında geri/×/sonra seç hakkı korur; teslim anında kapatma ve
yeniden bağlanma mevcut pending kayıt sözleşmesine tabidir. Form taslağı varsa
onaysız değişiklik sessizce kaydedilmez. Odak gizli veya kaldırılmış düğmede
bırakılmaz; geri dönüş kaynağı yoksa sayfa başlığı/ana içerik güvenli hedeftir.
Prototip geri navigasyonu basitleştirilmiştir; gerçek dialog stack testi değildir.

## 5. Mobil, dil ve görsel kabul

- TR/EN×320/393 px, uzun ürün/takım adı,200% metin büyütme, dikey kaydırma.
  Yatay taşma, kesilen fiyat/ana eylem ve kaplanan dock kabul edilmez.
- Tıklanabilir alanlar en az44 px; seçili/disabled/normal/focus-visible
  durumları açık. Yalnız ikonlar erişilebilir ad taşır; dekoratif img boş alt.
- Her ekranda bir h1 ve sıralı alt başlıklar. Klavye/Android geri/Esc ve
  yardımcı teknoloji odağı gerçek entegrasyonda ayrıca kabul edilir.
- Mevcut hareket azaltma/düşük grafik/mute korunur. Yeni varlık veya ses
  yok; prototip animasyon/ses çalmaz. Gerçek kasa animasyonunu temsil etmez.
- Yeşil mağaza noktası yalnız hediye alınabilirliğini gösterir; prototipte
  fixture'dır, üretimde sunucu durumu gerekir. Gösterim analitik onayı istemez.
- Ölçüm BASE-02 ve ANALYT-01 kapısındadır. Bu prototip analitik olayı göndermez.

## 6. İşlere dağıtım ve yayın sınırı

| İş | Sonraki uygulama |
| --- | --- |
| UI-02 + SHOP-01/02/03 | Mağaza bölüm/kart/detay/onayını gerçek sürümlü teklife bağla; bakiye+limit+teslim atomicity kanıtı. |
| UI-03 + REWARD-03 | Mevcut kasa uygulamasını bu ortak hiyerarşiyle karşılaştır; genel ödül/closeout/aktarım kabulünü bitir. UI-01 bitti diye üst UI-03 otomatik tamamlanmaz. |
| UI-04 | Dönem/ücretsiz yol/koleksiyon ve kaynak etiketleri; gerçek kozmetik sanatı ve kilitler. |
| QA-01 | Matris, gerçek API tarayıcı ve sonraki fiziksel cihaz kabulü; eski duyuru fixture tarihleri güncel sürümlü veriye bağlanır. |
| ANALYT-01 | Görünür durum, gerçek kayıt/onay ve sunucu tesliminin ayrı enum/olayları. |
| UI-06 / RET-01 / PLAY-01 | Ayrı planlanan gelişmiş savaş sonrası öğrenme, kişiselleştirme ve laboratuvar;2.5'e kendiliğinden eklenmez. |

Bu doküman tasarım teslimi olarak UI-01'i branch_ready yapabilir; gerçek ekran
entegrasyonu, kaynakların tamamlanması veya canlı yayın kabulü anlamına gelmez.
2.5 yayın kapısı S1 kapanış/ödül kabulü sonrasıdır; en erken22 Aralık03.00TR,
kesin geçiş penceresi belirlenmedi. Prototip S1 tarihlerini değiştirmez ve
onaylanmamış S2 tarihi yayımlamaz. Runtime sürümü2.4.0 kalır.

## 7. Yerel kanıt

- Chrome headless, TR/EN×320/393:7 ekranın46 durumunun **184 birleşimi**
  kontrol edildi. Belge ve içerik taşması,44 px dokunma yüksekliği, tek h1,
  beş dock öğesi, buton adları ve görsel yüklemeleri geçti.
- Beş akış: kasa seç/incele/örnek sonuç; teklif incele/geri; oyuncu ziyareti
  → takım; sonra seç/odak dönüşü; offline → tekrar dene. Bunlar yerel
  simülasyondur; gerçek ekonomik işlem/ödül teslimi yapılmadı.
- Sekiz ekran görüntüsü üretildi. Ana ekran, mağaza ve320 px İngilizce
  kasa inceleme görünümü görsel olarak incelendi. Modüllerde sprite sheet'in
  bütünü yerine mevcut `modules-physical-v1` tekil çizimleri kullanılır.
- JavaScript/HTTP hata0; oyun API/analitik isteği0. Yerel geçici HTTP
  sunucusu ve Chrome kontrol sonunda kapatıldı.
- Yerel kanıtlar (Git dışında): `qa_reports/ui01-prototype-20261116.json`,
  aynı adlı `.cjs` doğrulama betiği ve `qa_reports/ui01-*.png`.
- `node --check docs/planning/prototypes/release-250/prototype.js` geçti.
  Bu kanıt gerçek oyun, tam erişilebilirlik,200% metin, AAB veya fiziksel
  cihaz kabulü sayılmaz; bunlar ilgili QA/entegrasyon işlerinde açık kalır.
