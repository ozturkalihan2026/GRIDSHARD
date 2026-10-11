# v8 — mağaza ve sandık mesaj kutusu

Durum (11 Ekim 23:03 TR): kullanıcının push ettiği exact
`12524b8a17941be991becf16fa965cfabb5196ee` commit'inin CI38169062735 beş job'ı
başarılı. R16 sunucu yedekli geçiş ve 330s sağlık/WIF-polling gözlemiyle
canlı; mevcut season-rewards-v1/08:20 TR kuralı ve oyuncu verileri korundu.
İmzalı, manifest/imza/varlık/DEX audit'li v8 AAB hazır:
`artifacts/android-production-20261011-v8/GRIDSHARD-2.1.0-beta.72-v8.aab`.
SHA256 `cc30f0821027ab4402432637183b8a02e1c8c121102c3cbc34ce7c5839cd4cc1`.
136 ek gerçek yalıtılmış PG17/Redis test ve image restart/empty restore
başarılı. Play Console upload/publish ve telefon testleri insanın sıradaki
adımıdır; henüz tamamlanmış sayılmaz. Bilgisayar kullanım/UI otomasyonu
kullanılmadı. Teslim adımları/notlar v8 klasöründeki YAYIN_VE_TEST.md ve
PLAY_RELEASE_NOTES.txt içinde. Bu durum belgesi SOURCE FREEZE sonrasında
güncellendi; paket exact CI commit'inden üretildi, sonradan değiştirilmedi.

## Yedi kararın uygulaması

1. Altın/Elmas kartlarının başlık, bilgi ve düğme satırları aynı grid düzenini
   kullanır. Kart altındaki olasılık özetleri kaldırıldı; Ödül Listesi korunur.
2. Onarım adı katalog ve kanonik istemci verisinde kısaltıldı.
3. Ortak module-card-view simge kaynağında Onarım `☾`; Güçlendirici `＋`.
   Eski sunucunun "Onarım Modülü" adı da aynı hilale eşlenir. Enderlik,
   modül istatistikleri, etkiler ve sandık dağılım olasılıkları değişmedi.
4. Savaş, lig yolu, sezon ve turnuva sandığı → mesaj kutusu → TOPLA → mağaza
   stoğu → açılış. Toplanan mesaj görünür listeden kaldırılır; özel dedup
   kaydı saklanır. Toplamak kaynak vermez; içerik açılışta verilir. Eski
   stoktaki sandıklar korunur. Turnuva kasalarının sabit içerikleri ve kişisel/
   takım kozmetikleri rastgele mağaza içeriğiyle değiştirilmez. Eski takım
   dağılmışsa kişisel içerik açılabilir; yeni takıma kozmetik aktarılmaz.
5. Doğrulanan ücretli ürün alımı ve oyun kaynağıyla mağaza sandığı alımı aynı
   kayıt işlemi içinde bir satın alım mesajı üretir. Ret/bekleyen ödeme grant
   üretmez. Makbuz tekrarlarında ikinci mesaj oluşmaz. Token/ödeme işlem
   kimliği bu mesajlara konmaz.
6. Mesaj kutusu Savaş / Satın Alım / Ödül sekmeleri. Oyun Bildirimleri en
   altta, sekmelerin dışında kalır. Satın alım mesajları ilgili sekme açılınca
   görüldü işaretlenir; klavye/ARIA sekme davranışı eklenmiştir.
7. Kartta tek düğme: hazır HEDİYE SANDIK AÇ → SANDIK AÇ (stok sayısı) → DK/Akı
   fiyatı. Günlük satın alma limiti ve düşük bakiye hediye/stok açmayı
   engellemez. Mağazadaki 8 saatlik Bronz hediye doğrudan açılır; bu, oyun
   içinde kazanılan sandıkların mesaj kutusu tesliminden ayrı mevcut akıştır.

## Güvenli geçiş ve iade

Yeni istemci sezon sandığı taleplerinde `?chest_delivery=inbox-v1` gönderir.
Sunucu önce güncelleneceği için bu parametreyi göndermeyen v7'ye eski açılış
makbuzu sözleşmesi korunur; v7'nin açılış animasyonu boş yanıtta takılmaz.
Eski economic-operation hash'lerine boş query parametresi eklenmez. Yeni
teslim makbuzları kalıcı economic-operation defterinde yeniden oynatılabilir.
Mevcut MetaOperationRequest şekli ve DB şeması değiştirilmedi.

Yeni kurala tabi premium sezon sandıkları özgün sezon/alım kaynağını özel
metadatada taşır. İadeden sonra mesaj/stok görünmez ve açılamaz; açılmamış
rasgele içerik için borç üretilmez. Açılışta gerçek verilen kaynaklar özgün
sezonun iade kaydına yazılır. Eski alımlar ve ücretsiz sandıklar muaf kalır.
Hakların geri verilmesi/yeniden alım mevcut sezon kurtarma kuralıyla uyumludur.
TOPLA, açılış ve iade aynı PostgreSQL kilit/transaction sınırını paylaşır.

## Doğrulama

- İstemci: 301 test geçti, 0 hata/atlama; native main-thread testleri dahil.
- Paketleme/site araçları: 36 test geçti, 0 hata/atlama.
- Tam yalıtılmış PostgreSQL 16 sunucu: 1465 geçti, 1 Redis testi atlandı,
  0 hata. Starlette/httpx için tek mevcut deprecation uyarısı var.
  Redis testi başarılı kabul edilmez; Redis kodu bu işte değiştirilmedi.
- Ruff (F/B/ASYNC/PERF), değişen backend kaynakları: hata yok. Mevcut public
  trophy_delta dışa aktarımı explicit alias ile korundu.
- ESLint: app/relay-client/module-card-view için 0 hata; app.js'te mevcut
  10 kullanılmayan değişken/fonksiyon uyarısı var, geniş kapsamlı temizlik yok.
- Mobil web derlemesi `91301c9a018205a6` başarılı; source/test/private-data izin-listesi
  kontrolleri ve diff-check geçerli. Bu, imzalı AAB veya cihaz testi değildir.
- DB fault-injection: toplama/açılış/satın alım mesajı yarıda kesilince
  bakiye, stok, makbuz ve mesaj birlikte rollback; restart/tekrar ödül vermez.
  Premium iadede mesaj/stok/açılmış içerik ve önceki sezon kaynağı test edilir.

## Native Billing sınırı

Önceden onaylanan native launch main-thread düzeltmesi bu değişikliklerle
birlikte commit'e dahil edilir. Ayrıntı:
`ANDROID_BILLING_MAIN_THREAD_FIX_20261011.md`. Yerel testler Google Play'deki
ITEM_UNAVAILABLE nedenini kanıtlamaz; v8 Play kurulumu üzerinde ücretsiz
lisans-test checkout/iptal ve güvenli thread/code4 doğrulaması açık kalır.
Ürün/offer/account-token/adet/fiyat/ack/consume/SDK sürümleri değiştirilmez.

## Yayın sırası

1. Kullanıcı değişiklikleri ve yeni reward_delivery/test/doküman dosyalarını
   commit/push eder. android-production.json ve Gradle versionCode birlikte 8.
2. Bu exact commit'in yeni CI sonucu yeşil olmadan canlı geçiş yapılmaz.
3. Yedekli sunucu geçişinde canlı season-rewards-v1 ve 11 Ekim 08:20 TR
   yürürlük tarihi, DB/ödemeler/oyuncular/sırlar korunur. Sıfırlama yapılmaz.
4. Aynı doğrulanan kaynaktan imzalı v8 AAB; gömülü AndroidManifest.xml,
   versionCode 8, paket kimliği, hash ve kaynak provenance kontrolü.
5. Kullanıcı mevcut kapalı test Alpha kanalında yükleme/yayın ve telefon
   testlerini yapar. Uygulama kaldırma/veri silme/gerçek ücretli alım yok.

Bu yedi değişiklik Terms politikasını veya siteyi değiştirmedi. Önceden
yayımlanmış 08:20 TR Terms ZIP'i korunur; ek bir site yayını gerekmiyor.
