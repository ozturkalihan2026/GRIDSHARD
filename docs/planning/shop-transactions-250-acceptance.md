# SHOP-02 — Atomik ücretsiz mağaza satın alma kabulü

16 Kasım 2026 · `codex/develop-2.5.0` · dalda hazır

## Sonuç

`server/app/shop_transactions.py`, incelenmiş teklifin fiyatını Devre
Kredisi cüzdanından düşürür, garantili hedef parçasını verir ve kalıcı
alım makbuzunu aynı hesap işlemi içinde kaydeder. PostgreSQL'de mevcut
`persistent_operation` hesap/worker/sonuç bariyeri ve
`PostgresEconomicOperations` kullanılır; bağımsız iç commit yoktur.

Fiyat500 kredi, oyuncu başına UTC ISO haftasında iki alım ve common12 /
rare6 / epic3 / legendary1 bütçesi SHOP-01'deki sabit katalogdan gelir.
İstemci yalnız teklif ID/revision, önizleme hash'i ve istek kimliği gönderir;
fiyat, miktar, modül hedefi veya başka hesap alanı kabul edilmez.

## API ve kimlik

| Yol | Davranış |
| --- | --- |
| `GET /profile/{player_id}/shop-offers` | Yalnız yayımlanmış ve zamanı/sürümü uygun teklifler. Draft görünmez; kapı kapalıyken boş/closed. Arena kilidi açık nedenle gösterilir. |
| `GET /profile/{player_id}/shop-offers/{offer_id}?revision=1` | Sabit önizleme, güncel bakiye, haftalık kullanılan/kalan alım ve alım uygunluğu. Yeni hedef, aynı hesap UOW içinde kaydedilmeden yanıtlanmaz. |
| `POST /profile/{player_id}/shop-offers/{offer_id}/purchase` | `request_id`, strict integer `revision`,64 hex `preview_hash`; extra alanlar reddedilir. Gerçek makbuz ve güncel profil/meta döner. |

Bu yollar mevcut `/profile/` Bearer/sahiplik kapısındadır. Üretimdeki
zorunlu kimlik doğrulama, iptal edilmiş oturum ve hesap sahipliği denetimleri
korunur. Native istemcinin mevcut API prefix yönlendirmesi bu yolları
uzak HTTPS API'ye ve doğru hesabın Bearer token'ına bağlar; ayrı açık rota yok.
Kişisel yanıtlar ve hatalar `Cache-Control: no-store` taşır.

Yeni hatalar sabit `code`, mevcut Türkçe `detail` ve İngilizce `message_en`
döndürür. Eski revision/önizleme, bitmiş teklif, limit ve aynı istekle farklı
alım409; yetersiz kredi422; yabancı hesap403; geçersiz katalog/makbuz503.
Modelde float/bool/string revision ve istemci fiyat/ödül alanları reddedilir.

## Kalıcılık ve tek ücret

- Özel `shop_purchase_receipts`, JSON/PG player snapshot içinde saklanır;
  eski profilde boş başlar, public profile gönderilmez. Yeni SQL gerekmez.
- Her makbuz hesap+istek hash'ine bağlıdır; sabit teklif/önizleme/ödül,
  ücret ve satın alma anı hash ile korunur. Haftalık kullanım kalıcı
  makbuzlardan türetilir; sıfırlanabilir ayrı istemci sayacı yoktur.
- Limit anahtarı teklif ID/revision değil `weekly_module_parts`+ISO haftadır.
  Aynı hafta yeni revision veya değişen hedef havuzu iki alım hakkını yenilemez.
  Sonraki UTC Pazartesi yeni haftanın hakkı vardır; eski makbuzlar silinmez.
- Aynı başarılı istek, teklif süresi/sezonu/yürürlük kapısı kapandıktan ve
  katalog değiştikten sonra ilk makbuzu döndürür. Güncel profil/cüzdan yeniden
  okunur; eski bakiye snapshot'ı tekrar uygulanmaz. Başka içerikle aynı istek
  reddedilir. Yeni istek mutlaka güncel teklif/önizleme ve limit denetiminden geçer.
- Hazırlık profil kopyasında yapılır. Parça verme veya kayıt hatasında bellek
  geri alınır; PG dış UOW profil, limit tanığı ve SQL ekonomik makbuzu birlikte
  rollback eder. Tekrar deneme tek ücret/tek parça teslimi üretir.
- İade nedeniyle negatif bakiye yetersiz sayılır; borç sıfırlanmaz. Eski
  premium alım/iade kayıtları, sezon hakları ve Mühendis Kasası değiştirilmez.

## Yerel kabul

| Koşu | Sonuç ve kapsam |
| --- | --- |
| Yeni domain/gerçek HTTP testleri |14 PASS; Bearer/yabancı hesap, schema, no-store, doğru miktar/fiyat, limit, kayıp yanıt/yeniden yükleme ve kapı sonrası replay. Linux'ta da geçti. |
| Gerçek PostgreSQL17 odaklı kabul |32 PASS /0 SKIP;6 yeni satın alma vakası ile önceki pin/kapanış/seçim/hak/backup regresyonları. |
| Linux tam sunucu taraması |2280 PASS; dört çevre kurulumu hatası ayrı düzeltildi ve4 PASS. Atlanan vaka yok. Bu2284 vaka iki koşuda doğrulandı; tek koşu2284 PASS iddiası değildir. |
| Bütün istemci testleri |787 PASS; yeni native API yönlendirme/token testi dahil. |
| Build sözleşmeleri / gerçek web build |14 PASS; `node tools/build-client.js` başarılı, build ID `b7cc6e9ddb373e98`. AAB değildir. |
| Bütün araç testleri |169 PASS; kısa, yeni workspace QA geçici dizini kullanıldı. |
| Python import taraması |526 dosya /0 sorun. |

PG vakaları12 paralel farklı istekte yalnız iki alım;12 paralel aynı istekte
yalnız bir ücret; SQL profil kaydından ve ekonomik makbuz tamamlamasından sonra
hata/rollback; restart ve kapanmış katalog sonrası eski makbuz/güncel cüzdan;
gerçek pg_dump/pg_restore sonrası cüzdan, kalan hak ve iki kalıcı makbuz.

İlk Linux tam koşuda üç eski browser-evidence testi, salt okunur kaynak
bağındaki `qa_reports` dizinine yazamadı. Bu dizin için geçici tmpfs ile
tekrarlandılar. Redis testi, zorunlu tuttuğu izole DB15 yerine verilen DB0'ı
reddetti; DB15 ile tekrarlandı. Kaynak/test güvenlik kuralı değiştirilmedi.
Windows araç testlerinin uzun sandbox geçici yolunda Git `$GIT_DIR too big`
hatası verdiği beş vaka, kısa workspace test dizininde bütün araç setiyle geçti.
Bir Windows HTTP koşusu beklemede kesildi; kabul Linux'taki tamamlanan
HTTP ve tam sunucu koşularına dayanır. Mevcut Starlette/httpx uyarısı sürer.
Geçici PG/Redis konteynerleri görev etiketi ve tam kimlikleri doğrulanarak
kapatıldı; son envanterde kaldırıldıkları görüldü. Başka servis değişmedi.

## Yayın sınırı ve sıradaki iş

Katalog hâlâ tek **draft** içerir; satış ve UI kendiliğinden açılmaz.
SHOP-03 için gerçek kozmetik stoğu (COS-03), pilot yayın kararı ve UI-02
mağaza entegrasyonu açıktır. Kaynakta2.4.0 sürümü, yayımlanmış S1 katalogları
ve eski SQL korunur; yeni gerçek para/reklam ürünü yoktur. Sunucu/AAB/Console
dağıtımı yapılmadı.2.5 geçiş kapısı S1 kapanış/ödül kabulü sonrası, en erken
22 Aralık03.00TR; kesin pencere henüz belirlenmedi.

Kullanıcı bu adımla birlikte birikmiş kaynak/plan çalışmalarının commit ve
push edilmesini istedi. Kaynak dalı `codex/develop-2.5.0`; main'e birleşme ve
canlı yayın bu isteğin kapsamında değildir. Quality workflow bu dala push'ta
otomatik çalışmaz (push tetikleyicisi main); yukarıdakiler yerel kabulüdür.
