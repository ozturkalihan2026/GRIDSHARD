# Görsel dönüşüm 4 ve 5 — tamamlanan bağlantılar

16 Ekim 2026. Kullanıcı 5A/5B'nin iki grubunu onayladı; plandaki eksik 4/5
alanlarının da tamamlanıp bağlanmasını istedi. **Kaynak entegrasyonu tamam.**
Bu bir yayın/oyun testi onayı değildir; commit/push, sunucu geçişi ve AAB yok.

## 4 — rekabet ve etkinlikler

4A'nın sekiz lig amblemi, kazanılmış kupa sunumu ve lider panosu zaten bağlıydı.
Eksik 4B, onaylı ortak bileşenlerin mevcut ekranlara uygulanmasıyla kapatıldı:

1. Turnuva dizinindeki iki giriş: ortak yüzey ve onaylı fiziksel kupa.
2. Haftalık/takım turnuvası başlık, kurallar ve katılım yüzeyleri.
3. Gerçek dönem/puan/katılım özet hücreleri; dar ekranda tek sütun.
4. İki sıralama listesi: okunaklı sıra/oyuncu/puan/ödül, kendi satırı ayrımı.
5. Takım takvimi ve katkı satırları.
6. Eşleşme kartları ve mevcut eşleşme durumu; haftalık sekmeler iki sütun.

Günlük meta bu paketin dışında ve değişmedi. Kayıt şartları, ödüle uygunluk,
takvim, sıralama ve canlı veriler aynı. Kazanılmamış kupa üretilmez.
Haftalık ve takım turnuvasının mevcut altı `chest_visual_id` değeri, yeniden
çizilmek yerine aynı onaylı fiziksel sandık ailesine açık eşlemeyle bağlandı:

| Mevcut kimlik | Kullanılan onaylı çizim |
| --- | --- |
| weekly_circuit_crown | league_champions |
| weekly_prism | rank_prism |
| weekly_pulse | rank_frequency |
| team_reactor_crown | league_reactor |
| team_prism_relay | league_nexus |
| team_signal_cache | rank_relay |

Bu yalnız görsel paylaşımıdır; ayrı ödül adları, içerikleri ve hakları korunur.

## 5A / 5B — onaylı 18 sandık

Sekiz lig ve ilk 10 sıranın on farklı kapalı çizimi, onaylanan masterlardan
384px WebP'ye aktarıldı. Her birine built-in Imagegen ile aynı gövde/renk/kilit
korunarak açık hâl üretildi. 36 dosya, gerçek alpha, toplam 1.630.558 bayt.
Bütün kaynakların kenar taşma kontrolü temiz; açık hâller tek tek incelendi.

- Runtime: `client/assets/ui/reward-chests-v1/{leagues,ranks}/`.
- Ortak eşleme/sunum: `client/src/competition-chest-art.js`.
- Ortak stil: `client/src/reward-chest-art-v5.css`.
- Açılış: mevcut sandığın kendi rengindeki ışık/kapak/partikül ailesi. Yeni
  beyaz ekran patlaması veya sürekli ağır efekt eklenmedi. Az hareket/düşük
  grafik seçimi korunur. Sadece sunucu onayından sonra açık hâle geçilir.
- Devre Yolu, lider panosu, turnuva, mesaj kutusu ve açılış aynı eşlemeyi kullanır.
- Mağazadaki dört standart toplu stok kartı ve tek düğme sırası değişmedi.
  Özel kasanın kimliği tek açılışta ve tek tür toplu açılışta korunur; karışık
  toplu açılış tek bir sıra sandığıymış gibi gösterilmez.
- Bütün dosyalar inert HTML template'inde paket izin listesine dahildir;
  yardımcı betik app.js'ten önce ortak web/native bloğunda yüklenir.
- Eski SVG'ler yalnız bilinmeyen kimlik/eski yükleyici için güvenli fallback.
  Bilinen 18 kimlikte ikinci bir eski çizim ailesi aktif değildir.

Sunucuda tek sunum değişikliği `reward_delivery.public_chest`: sabit özel
kasadan yalnız `chest_visual_id` dışarı çıkarılır. `fixed_reward`,
`premium_origin`, `team_reward` yine gizlidir; hiçbir bakiye/ödül/iade kuralı
değişmedi. Yeni alan henüz gelmeyen eski sunucuda açılış öncesi genel kademe
görseli kullanılabilir; makbuzdaki kimlikle sonuçta doğru özel çizime geçilir.

## 5C — profil ve sosyal alanlar

Onaylı P2/P3/P4 bileşenleri ve fiziksel amblemler yeniden kullanıldı; yeni
bir portre/ikon ailesi veya alternatif tasarım üretilmedi. On uygulama grubu:

1. Kendi/başka oyuncu profil kimliği, mevcut ödül/koleksiyon sunumu.
2. Profil/takım istatistikleri ve sezon geçmişi yüzeyleri.
3. Takım profili ve üye/başvuru satırları; mevcut isim/çerçeve renkleri korunur.
4. Takım listesi/oluşturma ve yönetim yüzeyleri.
5. Modül isteği/katkı yüzeyleri; modül çizimleri aynen kalır.
6. Arkadaş, arama, gelen/giden istek, sohbet listesi ve savaş daveti hücreleri.
7. Takım/özel güvenli sohbet balonları ve hazır mesaj düğmeleri.
8. Dört sekmeli mesaj kutusu, okundu/zarf durumu, tarih ve güvenli silme araçları.
9. Avatar/çerçeve/emoji ve takım kozmetiği seçim hücreleri; seçili/kilitli metni.
10. Gerçek renkli profil arka planı/çerçeve örnekleri; placeholder metin simgesi yok.

Sekiz özel avatarın metin glyph'i artık ortak onaylı fiziksel amblemdir:
Kaşif→Devre Yolu, Muhafız→Reaktör, Sezon Şampiyonu→Taç, Sezon Finalisti→Nexus,
Haftalık Şampiyon→Kupa, Haftalık Finalist→Kuantum, Kıvılcım Operatörü→Voltaj,
Zirve Pilotu→GRIDSHARD. Varsayılan mint kişi korunur. Yeni portre tasarlanmadı.
Aynı seçilmiş kimlik profil, sohbet, ödül önizlemesi ve seçim listesinde çizilir.
Yedi sembolik ödül emojisi de mevcut hareketleriyle aynı fiziksel aileye alındı;
gerçek emoji ve varsa medya/GIF desteği değişmedi. Mevcut on takım ambleminin
şekilleri kod-native çizim olarak korundu, dolu yüzey/kontur/pah katmanı eklendi.

Avatar/çerçeve/isim/emoji ID'leri, kilitler, sunucudan gelen kazanımlar,
izinler ve kaydetme/gönderme işleyicileri aynı. `[hidden]` sunum tarafından
açılmaz. Toplanmamış sandıkları/davetleri silme dışı tutan akış korunur.
Mesaj kutusu tarihleri gerçek kayıt tarihidir; eksik eski tarihe bugün yazılmaz.
Ana ekran yerleşimi, son Devre arka planı, çekirdek hareketi ve dock aynen kalır.

## Arşiv ve promptlar

- Kapalı masterlar ve önizlemeler:
  `artifacts/visual-refresh-pack05-20261015/{5a,5b}/`.
- Açık masterlar: aynı arşivin `open/masters/` dizini.
- Promptlar: `docs/GORSEL_DONUSUM_PAKET05_ACIK_SANDIK_PROMPTLAR_20261015.json`.
- Üretim eşlemesi: arşivde `generated-open-paths.json`; teknik aktarım
  `export-runtime.cjs`. Kapalı masterlar/önceki Taç kadrajı silinmedi.
- **Arşiv Git dışıdır; başka bilgisayara ayrıca taşı.** Hafif runtime dosyaları,
  kaynaklar, prompt ve QA belgeleri Git'e alınabilir.

## Son kullanıcı rötuşları — 16 Ekim heartbeat

- Lider panosu ve bütün ortak ödül sandığı düğmelerinden eski hücre zemini,
  kenarlık ve gölge kaldırıldı. Görselin altında ikinci bir levha kalmaz.
- 44px sandık ile 38px eski düğme/6px marj çakışması giderildi. Haftalık ve
  takım sıralamasında dar ekran dahil tam 44px ödül sütunu ve sıfır marj var.
  Uzun puanlar sarılabilir; oyuncu sütunu daralabilir. Odak ve kilit korunur.
- Fare hover'ına ek mouse fallback ve kalem hover'ı eklendi; klavye odağı,
  dokunarak sabitleme, dışarı tık/Escape/scroll kapatma aynen korunur.
  Önizleme satın alma veya ödül toplamaz.
- P2 metinli butonlarının koyu dikdörtgen tabanı şeffaf oldu. Fiziksel yüz ve
  derinlik zaten kırpılmış pseudo-element'te; köşede eski siyah dolgu yok.
- Mesaj kategorileri/başlıkları: savaş→onaylı dock kılıçları, sandık→Altın
  Sandık, satın alım→mağaza simgesi, sistem→bilgi. Kart içindeki küçük kategori
  simgesi ile ayrı kapalı/açık zarf okuma eylemi bir arada korunur.
- Profilde en çok kullanılan deste (ve aynı card anlamını paylaşan başlıklar)
  artık onaylı dock kartlarını kullanır; metin/yer tutucu çizim yok.
- Ana Devre Yolu sayacı, arena/lig başlığı altı, sonraki aşama ve yolun ödül
  eşikleri ortak gerçek kupa görselini kullanır. Sayı/eşik mantığı aynı.
- Takım Oluştur'da koşul etiketinde kupa vardır; native select seçeneklerinde
  yalnız "En az [sayı]" kalır. Option içine geçersiz resim yerleştirilmez;
  option value/başvuru uygunluğu değişmez. Türkçe/İngilizce karşılıkları hazır.

## Doğrulama ve teslim sınırı

`qa_reports/visual-refresh-pack04-05-integration-20261016.json`:
10 stil/34 betik bellekte paketlendi; chrome109/safari15 dönüşümü geçti.
36 resim/hash/alpha/kadraj/paket bağlantısı doğrulandı. Satın alma, mutation,
kozmetik seçimi, güvenli sohbet ve mesaj silme işleyicileri HEAD ile birebir.
Önceden var olan 20 çeviri duplicate-key uyarısı ve 7 istatistik DOM tekrarı
kapsam dışıdır; yeni tekrar eklenmedi. Python kaynak/test sözdizimi kontrolü var.
Yeni regresyon sözleşmeleri hazır; **oyun/birim testleri KOŞULMADI**.
Tarayıcı/test sunucusu açılmadı, kullanıcının sekmeleri/sunucuları değiştirilmedi.
dist/native/AAB, canlı dağıtım, commit/push yapılmadı. Görsel/oyun kontrolü kullanıcıda.

4 ve 5 kaynak düzeyinde tamamlandı. 6 önizlemesi hazır/onay bekliyor;
oyuna bağlanmadı (`GORSEL_DONUSUM_PAKET06_20261016.md`). 7/8 bekliyor. Yeni bağımsız karakter
portreleri veya ilave kozmetik koleksiyonu istenirse yeni bir ≤10 parçalık
önizleme/onay paketi açılır; bu tur böyle bir koleksiyon eklenmedi.
