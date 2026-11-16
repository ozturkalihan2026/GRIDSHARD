# SHOP-01 — Sürümlü teklif kataloğu ve sabit önizleme kabulü

16 Kasım 2026 · 2.5.0 geliştirme dalında hazır · satış/dağıtım kapalı

Sonraki SHOP-02 satın alma/atomiklik teslimi de
[ayrı kabul kaydıyla](shop-transactions-250-acceptance.md) dalda hazırdır.
Aşağıdaki SHOP-02 kapsam ayrımı SHOP-01'in teslim sınırını anlatır; güncel
durumda UI-02 entegrasyonu ve SHOP-03 pilotu açık, katalog hâlâ draft'tır.

## Teslim

- `server/app/shop_offers.py`: kapalı şemalı katalog, gerçek görsel kontrolü,
  değişmez yayın geçmişi ve oyuncu/UTC-hafta için sabit hedefli önizleme.
- `server/data/shop_offers_v1.json`: **tek taslak** modül-parçası teklifi;
  mevcut24 modülün TR/EN adı, enderliği ve onaylı tekil çiziminin SHA256 kaydı.
  Yeni sanat veya kozmetik sahipliği üretilmedi.
- `tools/prepare_shop_offers.py`: yalnız yerel `check` / yeni artifact'e
  `publish`; canlıya bağlanmaz, kaynak kataloğu veya baseline üzerine yazmaz.
- Profilin özel `shop_offer_state` alanı JSON/PG player snapshot içinde
  saklanır; eski profilde varsayılan boş kayıttır. Public profil görünümüne
  konmaz. Mevcut schema/SQL veya runtime sürüm numarası değiştirilmedi.
- Docker/source paket listelerine yalnız bu incelenebilir statik JSON eklendi;
  oyuncu teklif kayıt dosyası veya rastgele runtime JSON paketlenmez.
  Hero ve24 hedef görselinin mevcut client HTML build allowlist'inde olduğu
  da testlidir; gerçek yeni AAB üretimi/kabulü yapılmadı.

Bu ilk adaptör [ECON-01 kararı](first-shop-release.md) ile sınırlıdır:
**500 Devre Kredisi**, aynı oyuncu için **UTC haftasında en çok iki alım**,
sıradan12 / nadir6 / destansı3 / efsanevi1 garantili modül parçası. Fiyat,
garanti ve limit ilk adaptörün doğrulanmış bütçesidir. Yeni ürün/para türü
veya farklı bütçe yeni açık adaptör kararı gerektirir; JSON adı eklemek yetmez.

## Yayın ve zaman sözleşmesi

Teklif ID+revision, açık UTC `[starts_at, ends_at)`, arena şartı, fiyat,
garanti, limit kapsamı, TR/EN metinler ve gerçek önizlemeler hash ile
birlikte doğrulanır. Saat dilimsiz veya UTC olmayan katalog zamanı kabul
edilmez. S1 öncesine teklif penceresi yazılamaz; minimum server sürümü2.5.0'dır.

Yayınlama başladığı saatten önce yapılmalıdır. Yayınlanan kaydı değiştirmek
veya silmek, hash yeniden hesaplanmış olsa da önceki yayın baseline'ına
karşı denetimde reddedilir. Yeni revision ayrı kayıttır; aynı limit kapsamına
ait aktif pencereler çakışamaz. Süresi biten kayıt geçmişte korunur.
Uygulamada baseline karşılaştırması katalog değişimi/yayın araçlarının
zorunlu parçasıdır; teklif hash'i yetkilendirme veya istemci fiyatı değildir.

Checked-in taslaktaki **28 Aralık2026–4 Ocak2027** penceresi örnektir;
S2 başlangıcı veya2.5 canlı mağaza açılışı ilanı değildir. Gerçek bakım/ürün
penceresi onaylanınca taslakta belirlenir, ardından artifact incelenir.
Mevcut dosya draft kalır. Kullanım ayrıca minimum sürüm, mevcut
`GRIDSHARD_FREE_ECONOMY_FROM` kapısı ve geçerli pencere ister. Yeni HTTP
rota/otomatik yayın işi bu teslimde eklenmedi.

## Haftalık hedef ve önizleme

1. Sunucu hesap uygunluğunu ve kazanılmış en yüksek arena şartını doğrular.
   Bot/operatör/test gibi uygun olmayan hesap yeni hedef alamaz.
2. Yalnız gerçek, açık ana oyun modülleri kullanılır. Deste tercihi havuzu
   daraltmaz; planlı kart veya kilitli modül teklife sokulmaz.
3. İlk önizlemede sunucuya özel anahtar ile hedef seçilir ve hesap+
   `weekly_module_parts`+ISO hafta kaydına sabitlenir. Sonraki okumalar aynı
   hedefi kullanır; havuz büyümesi veya anahtar değişimi yeniden seçtirmez.
4. Aynı hafta başka geçerli revision'a geçiş hedefi/limit kapsamını sıfırlamaz.
   UTC Pazartesi sınırı yeni hafta kaydı açar. Bu ISO hafta, S1'in operatör
   başlangıcından sayılan turnuva haftasıyla karıştırılmaz.
5. Yanıt gerçek hedef, adlar/görsel, enderlik, garantili miktar, fiyat,
   limit politikası, arena/sürüm ve daraltılmış hafta/pencere bilgisi içerir.
   Sabit ödül `reward_definitions` snapshot'ına bağlanır; `preview_hash`
   teklif revision ve içerikle birlikte SHOP-02 için inceleme bağlamıdır.

Önizleme domain çağrısı pin kaydını hazırlar. Gelecek HTTP adaptörü, hesap
kilidi ve aynı kalıcı UOW içinde yükle→önizle→kaydet→commit yapmadan sonucu
oyuncuya kesinleşmiş ürün olarak döndürmemelidir. Bu sözleşme gerçek PG
kayıt/rollback ve eşzamanlı testlerle doğrulandı. Pin bozuksa veya eski hedef
artık uygun değilse yeni hedef seçilmez; açık hata verilir ve kayıt korunur.

## SHOP-02 / SHOP-03'e kalan açık işler

- **SHOP-02:** Bearer/sahiplik/native yönlendirme; satın alma uçları; bakiye,
  haftalık iki alım sayacı, ödül teslimi ve makbuzun tek ekonomik UOW'ya
  bağlanması. Eski yanıt/expired revision kontrolü, aynı isteğin ikinci kez
  ücret düşürmemesi ve yanıt kaybı uzlaştırması gerçek API'de kanıtlanacak.
- Önizleme **satın alma uygunluğu veya kalan alım sayısı değildir**. Fiyat
  incelemesi bakiye düşürmez; bu teslim teslim makbuzu üretmez. Sınırlı
  iki alım burada doğrulanmış politikadır, alım sayacı SHOP-02'de uygulanacak.
- **SHOP-03 / COS-03:** gerçek ayrı mağaza kozmetik stoğu ve garantili teklif
  pilotu. `shop_collection` stok kaynağı planned kalır; rekabet/sezon stoğu
  mağazaya tahsis edilmedi ve kozmetik adaptörü varmış gibi açılmadı.
- **UI-02:** bu veriyi ortak tasarımın gerçek mağaza/kart/detay/onayına bağlar.
  Mevcut onaylı boyalı sanat/dock korunur; yeni tasarım ailesi yoktur.

## Yerel kabul

| Koşu | Sonuç |
| --- | --- |
| Windows tam `server/tests` |2177 PASS /86 SKIP |
| Son odaklı teklif/katalog aracı/paket sınırı/sürüm planı |64 PASS |
| Linux Python3.12, gerçek PostgreSQL17 ve eşleşen backup araçları |26 PASS /0 SKIP |

Tam sunucu koşusundan sonra pin hedefinin yanlış türle bozulması için bir
ek denetim/test kondu; son64 test ve final PG koşusu bu kaynakla çalıştı.
Bu sayılar birbirine eklenerek benzersiz test toplamı veya CI yeşili sayılmaz.

Son odaklı koşu:

```text
python -m pytest server/tests/test_shop_offers.py tools/tests/test_shop_catalog_review.py tools/tests/test_release_data_boundary.py tools/tests/test_release_delivery_plan.py -q -p no:cacheprovider
```

PG koşusu dosyaları:

```text
tests/test_postgres_shop_offers.py
tests/test_postgres_period_reward_closeout.py
tests/test_postgres_reward_choices.py
tests/test_postgres_reward_entitlements.py
tests/test_server_backup.py
```

Üç yeni gerçek PG testi: kayıttan sonra hata→rollback→yeniden yükleme;
havuz genişlerken8 paralel önizlemede tek hedef; gerçek dump/restore sonrası
aynı fiyat/hedef/önizleme hash'i ve özel pin. Önceki kapanış/seçim hakları
regresyonları da aynı izole ortamda geçti. Test kaynakları salt okunur
bağlandı; gerçek oyuncu verisi kullanılmadı. Tek uyarı mevcut Starlette/httpx
deprecation kaydıdır. Fiziksel cihaz veya satın alma API kabulü yapılmadı.
Göreve ait geçici PG konteyneri kimlik/etiket denetiminden sonra kapatıldı;
son envanterde kaldırıldığı doğrulandı. Başka konteynere işlem yapılmadı.

Kontrol komutu `python tools/prepare_shop_offers.py check` tek draft ve24
önizlemeyi doğrular. Araçta `publish --id weekly.module-parts --revision 1
--at <açık-UTC> --output <yeni-artifact>` yalnız inceleme artifact'i üretir;
`--against <korunmuş-yayın-kataloğu>` yayın geçmişini korur. Canlıya dağıtmaz.

Gerçek sürüm2.4.0, yayımlanmış S1 katalogları ve SQL dosyaları korunur.
Yeni alım, canlı sunucu geçişi, AAB, Console veya otomatik sezon açılışı yoktur.
2.5 geçiş kapısı hâlâ S1 kapanış/ödül kabulü sonrası, en erken22 Aralık
03.00TR; kesin geçiş penceresi belirlenmedi.
