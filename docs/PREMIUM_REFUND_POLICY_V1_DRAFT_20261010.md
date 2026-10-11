# Ücretli Sezon Geçişi iade politikası — yerel aday / Terms taslağı

11 Ekim 08:20 TR güncel: Yeni tarihli TR/EN Terms insan tarafından yayımlandı;
05:14:13 UTC 11/11 canlı doğrulama geçti. Yeni yedekli ikinci açılış aynı r15
imajında yalnız iki env değiştirdi. 05:20:07 UTC healthy ve UTC kapısı true;
05:25:30 UTC açılış exit0; 330 sn iç43/dış39 kontrol PASS. Yeni kural yalnız açık onaylı, mağazanın
doğruladığı yeni alımlara uygulanır; eski alımlar/ödüller korunur.
Terms tanığı 05:26:10 UTC exit0/16 başarılı 11-route kontrol (11 postcutover),
05:26:44 UTC son runtime healthy/timegate true.
Native Google Play yeni-politika testi henüz tamamlanmadı. Aşağıdaki önceki
operasyon kayıtları tarihçedir; güncel Terms tarihi madde 9'daki 08:20 TR'dir.

11 Ekim08:05TR en güncel: ilk00:30activation staleTermsproof nedeniyle
yürürlüktenönce00:29:21'de safe-r15legacy rollback yaptı; v1receipt/profile0.
Kullanıcı yeni **11 Ekim08:20TR /05:20UTC** yürürlüğünü onayladı. Aşağıdaki
TR/ENmadde9 tarihlerigüncel. Yeni21dosyaZIP hazır; manuelCloudflareProduction
yayın+liveproof önce, freshuniquebackup/sameimagepolicyenv-onlyretry sonra.
SunucuOFF, nativeQA henüzaçık. Alttaki00:30operasyon notları tarihçedir.

10 Ekim 2026. İlk onay kod, testler ve taslak içindi. Kullanıcı daha sonra commit/push'u tamamlayıp kalan işlemlerin sıralı ilerlemesini onayladı. **Yayımlanmadı; canlı sunucuda etkin değil.** Bu belge hukuk uygunluğu garantisi değildir. Mevcut yayımlanmış Terms değiştirilmedi; aşağıdaki metin yayın öncesi son değerlendirme içindir. Yürürlük zamanı cihaz/QA kapılarından sonra belirlenecek. Güncel ilerleme: [v7 yayın kaydı](ANDROID_V7_PREMIUM_RECOVERY_RELEASE_20261010.md).

## Kapsam ve davranış

11 Ekim güncel karar: kullanıcı mevcut v7'de global yeni kuralı açıp lisans-test
yapılmasını ve 11 Ekim2026 00:30TR /10 Ekim2026 21:30UTC yürürlüğünü onayladı.
Önceki emülatör önerisi artık geçerli sıra değildir; nativeQA henüz tamamlanmadı.
Aşağıdaki Terms madde9 tarihleri bu açık onayla dolduruldu. Yerel site adayı
16unit/30layout kontrolünden geçti; ZIP/canlıyayın doğrulaması tamamlanmadan
sunucuOFF korunur. Tarihe yetişmezse yeni yürürlük tekrar kararlaştırılır.
Alttaki zaman damgalı operasyon kayıtları tarihsel durumdur.

11 Ekim00:04TR ek not: v7 temel mağaza fiyat/bakiye/refunded hak pasifliği
kullanıcı teyitleri tamamlandı. Native yeni-policy QA için ayrı test APK,
privateDB ve emülatör yolu öneriliyor; production global flag açılmadı ve pilot
başlatılmadı. UTC/TR tarihi ve son site ZIP'i bu kapı sonrası tamamlanacak.

Güncel operasyon notu20:59UTC: final ccc5e99/CI38083415413 success5/5 ve v7
temiz paket hazır. USB package-manager v7/Playinstaller kurulumunu doğruladı;
Console review/kanal, mağaza/hak/bakiye/reopen ve yeni-policy native QA ayrı
açık kalır. R15 kod geçişi legacy ile tamamlandı; iç/dış330sn health/TLS/
exactHTML/Googlepoll geçti. **Yeni davranış etkin değil**.
İzole gerçekPG/Redis67PASS/0skip ve iki gerçekpolicy image/restart/empty restore
geçti, native Play testi sayılmaz. UTC/TR yürürlük kararı ve publicTerms/siteZIP
hâlâ açık; kodun canlıya gelmesi yayını veya politika aktivasyonunu tamamlamaz.

- Yalnız `season_pass_premium` ve açıkça `season-rewards-v1` damgalanmış yeni alımlar. Akı/DK paketlerinin mevcut iade kuralı korunur. Savaş Premium bonuslarının geri alınması bu adayın kapsamında değildir; bu ürünün ayrı satın alma/iade testi hâlâ açıktır.
- Premium kademenin doğrudan verdiği Akı, DK, modül/çekirdek/evrensel parçalar ve premium sandıkların **gerçek** kaynak çıktıları sunucu tarafında kaydedilir. Ücretsiz hat, XP, kupa, maç sonucu, kozmetikler ve tamamlanmış geliştirmeler geri çevrilmez; enderlik ve sandık olasılıkları değişmez.
- Son geçerli yeni-politika makbuzu iade edildiğinde kaydedilen premium miktarlar bir kez geri alınır. Harcanan miktar yalnız aynı oyun kaynağında açık oluşturabilir. Oynayarak kazanılan aynı kaynak açığı azaltır. Para borcu, zorunlu satın alma, otomatik yasak veya ücretsiz maç engeli yoktur. Başka kaynakta açık, ihtiyaç duymadığı bir geliştirmeyi engellemez.
- Aynı sezonda yeniden alım/iadenin geri çevrilmesi, gerçekten geri alınmış miktarları geri yükler. Alınmış kademeler yeniden açılmaz; sandık yeniden zar atmaz. Yinelenen bildirim veya makbuz ikinci kesinti/ödül üretmez. Geçmiş sezondaki yeni-politika alımının iadesi, kayıtlı kaynaklarını etkiler fakat güncel sezon hakkını kapatmaz.
- Doğrulanmış yayıncı hatası istisnası yalnız özel sunucu operatörü incelemesiyle uygulanır. Mağaza neden kodu veya istemci alanı bu istisnayı açamaz. Hâlâ elde olan miktar geri alınabilir; bu iadeden doğan yeni açık yüklenmez. Sonradan inceleme, yalnız bu işlemin yarattığı açığı düzeltir; başka işlemin açığını silmez.
- Uç hesabının geçmiş ücretsiz lisans-test alımı ve kazanılmış 17 kademe **yeniden sınıflandırılmaz veya kesilmez**. Önceki alım aynı makbuzla tekrar geldiğinde politika damgası yükseltilmez.

## Terms madde 9 için Türkçe aday

İade taleplerinde ilgili mağazanın güncel kuralları ve bulunduğun yerdeki emredici tüketici hakları geçerlidir. Google Play işlemleri için Google Play iade bilgilerini inceleyebilir veya bize başvurabilirsin. Dijital içerik/hizmetlerde cayma kuralları işlem ve yürürlükteki hukuka göre değişebilir. Bu şartlar bütün satın almaları iade dışı bırakmaz, cayma hakkından genel feragat oluşturmaz ve ayıplı ya da teslim edilmemiş içerikle ilgili haklarını kaldırmaz.

Oyun içi para birimi paketinde mağazanın doğruladığı iade veya ödeme iptalinde yalnız o işlemle verilen miktar ilgili para biriminden geri alınır. Para birimi harcanmışsa bakiye eksiye düşebilir. Açığı aynı para birimini oyun içinde kazanarak kapatabilirsin; yeni satın alma yapmak zorunda değilsin. Yeterli bakiye oluşana kadar o para birimiyle harcama yapılamaz. Bu düzeltme gerçek para borcu veya ek tahsilat oluşturmaz; diğer para birimine kesinti yapılmaz.

11 Ekim 2026 saat 08:20 Türkiye saati (11 Ekim 2026 saat 05:20 UTC) tarihinden itibaren, satın alma öncesinde uygulamada `season-rewards-v1` iade koşuluyla sunulan Ücretli Sezon Geçişi alımlarında yalnız bu geçişten kazanılan premium oyun kaynakları ve premium sandıklardan gerçekten çıkan kaynaklar iade ile geri alınır. Harcanmış kaynak, aynı Akı, Devre Kredisi veya aynı parça türünde oynayarak kapatılabilen açık oluşturabilir. Mağazada kaynak türü ve açık gösterilir. Yeterli miktar oluşana kadar açık olan kaynak harcanamaz; başka kaynaklarla yapılabilen işlemler ve normal ücretsiz maçlar engellenmez. Ücretsiz ödül hattı, XP, kupalar, maç sonuçları, kozmetikler ve tamamlanmış kart/çekirdek geliştirmeleri geri çevrilmez. Enderlik değişmez. Aynı sezon geçişini yeniden almak veya iadenin geri çevrilmesi, yalnız daha önce geri alınmış miktarları geri yükler; alınmış kademeler veya sandık içerikleri ikinci kez üretilmez.

Bu yeni kural önceki alımlara geriye dönük uygulanmaz. Sınıflandırmada mağazanın doğruladığı satın alma zamanı kullanılır; sunucuya geç ulaşma tek başına eski alımı yeni kurala taşımaz. Önceki sezon geçişi alımlarında ve Savaş Premium ürününde ilgili sezon hâlâ etkinse yalnız iade edilen sezon hakkı kapatılır; önceden kazanılmış ödüller korunur. Geçmiş sezonda yeni kuralla alınmış sezon geçişinin kayıtlı kaynak iadesi güncel sezon hakkını kapatmaz. Bizden kaynaklandığı doğrulanan teslimat veya sunucu hatası nedeniyle yapılan iadelerde bu işlemden doğan yeni kaynak açığı oyuncuya yüklenmez.

Hangi işlemin iade edildiği, geri alınan miktar ve varsa açık bildirilir. Hatalı kesintinin incelenmesini gridshardgame@gmail.com adresinden isteyebilirsin; şifre, kart bilgisi veya satın alma jetonu gönderme. Mağaza bildirimi ve doğrulama gecikmeleri nedeniyle düzeltme anlık olmayabilir. İade kaydı tek başına hesabını kapatmaz; her iade kötüye kullanım sayılmaz. Tekrarlanan kötüye kullanım ayrıca incelenir.

## English candidate for Terms clause 9

Refund requests are subject to the relevant store's current rules and mandatory consumer rights in your jurisdiction. For Google Play transactions, consult Google Play's refund information or contact us. Withdrawal rules for digital content and services depend on the transaction and applicable law. These terms do not make every purchase non-refundable, create a blanket waiver of withdrawal rights, or remove rights concerning defective or undelivered content.

For an in-game currency pack, when the store confirms a refund or payment reversal, only the amount granted by that transaction is reclaimed from the corresponding currency. If spent, the balance may become negative. You can clear the shortfall by earning the same currency through gameplay; another purchase is not required. That currency cannot be spent until sufficient balance is available. This adjustment creates no cash debt or additional charge; no deduction is made from another currency.

From 11 October 2026 at 05:20 UTC (11 October 2026 at 08:20 Türkiye time, UTC+03:00), Season Pass purchases offered in the app with the `season-rewards-v1` refund condition before checkout reclaim only the premium in-game resources gained from that pass and the actual resources obtained from its premium chests. Spent amounts may become deficits in the same Flux, Circuit Credits or piece type, clearable by playing. Resource types and deficits are shown in the Store. A resource with a deficit cannot be spent until sufficient quantities are available; operations using other sufficient resources and normal free matches remain available. Free-track rewards, XP, trophies, match results, cosmetics and completed card/core upgrades are not reversed. Rarity is unchanged. Repurchasing the same season's pass or reversing a refund restores only previously reclaimed quantities; claimed tiers and chest contents are not generated again.

This new rule does not apply retroactively. Classification uses the store-verified purchase time; late delivery to the server alone does not move an earlier purchase into the new rule. For earlier Season Pass purchases and Battle Premium, only the refunded season's entitlement is disabled if that season remains active; previously gained rewards remain. Reclaiming recorded resources from a previous season's new-policy pass does not disable the current season's entitlement. Refunds caused by a delivery or server error confirmed to be our responsibility do not impose a new resource deficit arising from that transaction.

You will be told which transaction was refunded, reclaimed quantities and any deficit. Request review of an incorrect deduction at gridshardgame@gmail.com; do not send passwords, card details or purchase tokens. Store notification and verification delays mean adjustments may not be immediate. A refund record alone does not close your account; not every refund is abuse. Repeated abuse is reviewed separately.

## Teknik yürürlük ve yayın kapıları

Kod varsayılanı `GRIDSHARD_SEASON_PASS_REFUND_POLICY=legacy`. 11 Ekim 2026
08:20 TR açılışında kaynak ve özgün `.env` değiştirilmeden, ayrı operasyon
Compose katmanıyla yalnız `season-rewards-v1` ve açık UTC
`GRIDSHARD_SEASON_PASS_REFUND_POLICY_FROM=2026-10-11T05:20:00Z` aktarıldı.
Eksik/yanlış tarih açılışı reddeder. 08:20 tarihli TR/EN Terms yürürlükten önce
yayımlanıp doğrulandı. Bundan sonraki aynı r15 operasyonlarında yedinci
`docker-compose.premium-refund-policy-0820.yml` katmanı korunmalıdır.
Hata hâlinde aynı defteri bilen r15 ile yeni checkout kapatılır; eski imaja
veya canlı DB yedeğine dönülmez. Native ücretsiz test kapısı hâlâ açıktır.

Google `purchaseTimeMillis`, Apple imzalı `purchaseDate` kullanılır; istemci tarihi kabul edilmez. Eksik doğrulanmış tarih yeni alımı kesinti kuralıyla işlemek yerine 503/retry bırakır; tüketme yok. Eski makbuz tekrarında ilk sınıflandırma korunur. Bunların kaynak sözleşmeleri: [Google ProductPurchase](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products), [Apple purchaseDate](https://developer.apple.com/documentation/appstoreserverapi/purchasedate). İade edilen içeriklerin geri alınması ve oyun içi açık yaklaşımı [Google Billing güvenlik rehberinde](https://developer.android.com/google/play/billing/security) de ele alınır; bu teknik kaynaklar hukuk uygunluğu teyidi değildir.

Yeni istemci yalnız sezon geçişinde TR/EN onayını ödeme penceresinden önce gösterir. Kabul edilmezse ödeme açılmaz. Eski sunucuya yeni onay alanı otomatik gönderilmez. Yeni kural yürürlükteyken eski istemciye yeni geçiş checkout'u sunulmaz; diğer dokuz ürün ve mevcut haklar korunur. Ödenmiş/yeni-politika alımı kurtarmada açık onay olmadan hak verilmez veya makbuz tüketilmez. Ağ/503 hâlinde makbuz saklanır. Eski istemcide önbellekteki checkout'tan ödeme gibi geçiş yarışları yayın öncesi lisans testiyle sınanmalı; oyuncunun onaylamadığı alıma sessizce yeni kural uygulanmamalı. Bu yol için destek/iade yönergesi de doğrulanmalıdır.

Ödül/hak/makbuz/private provenance aynı üretim işleminde yazılır. Tier doğrudan ödülü ve bütün sandıklar tamamlanmadan işlem commit edilmez. Sunucu defteri istemciye çıkarılmaz; yalnız açık miktarları gösterilir. Defter sezon geçişinde korunur; hesap silme saklama davranışı ve yedekten dönüş gerçek PostgreSQL testleriyle ayrıca doğrulanmalıdır.

Yayın kapıları (23:17 TR: ilk implementation commit CI5/5 geçti; version7 metadata/final kaynak sabitlemesi bekler):

1. Aday kod commit/push **kullanıcı tarafından**; aynı commit'in tüm CI işleri ve yeni PostgreSQL rollback/restart testleri yeşil olmalı. Yerel SQL/Redis atlamaları PASS sayılmaz.
2. Yeni istemci APK/AAB üretilip kapalı testte kurulmalı. Mevcut v6 AAB bu değişiklikleri içermez. Varsayılan legacy sunucuda geriye uyumluluk; izole yeni-policy ortamda checkout onayı/iptali, pending, kurtarma, iade, yeniden alım, kaynağı oynayarak kapatma ve eski alımlar sınanmalı. Canlı oyuncu bakiye manipülasyonu yok.
3. TR/EN Terms metni ve açık yürürlük zamanı birlikte son onay almalı; ayrı yayın onayıyla yayımlanıp canlı metin doğrulanmalı. Yeni uygulamadaki Terms bağlantısı etkin kuralı doğru açıklamadan özellik açılmamalı.
4. Yedek/geri dönüş/operatör inceleme akışı ve yarış testleri doğrulanınca ayrıca onaylı sunucu geçişi. Bayrağı legacy'ye almak **zaten damgalanmış makbuzların** iade sorumluluğunu kaldırmaz; eski, defteri bilmeyen sunucu sürümüne kör rollback yapılmaz.
5. Savaş Premium teslim/iade testi ve kalan genel üretim kapıları tamamlanmadan “üretime hazır” denmez.

## Yerel kontrol kaydı

Son kontrol 10 Ekim 23:03 TR: **1410 sunucu testi geçti /41 test atlandı; 293 istemci testi ve 24 build/site testi geçti.** Son odaklı paket 156 PASS. Gerçek istemci kaynakları 31 betik/yeni politika modülü dahil bellekte derlendi; mevcut dist veya APK/AAB çıktıları değiştirilmedi. Atlanan altyapı testleri geçilmiş sayılmadı.

Odaklı test kaydı `test-results/premium-recovery-focused-20261010.xml`; tam regresyon `test-results/premium-recovery-server-all-20261010.xml`. Yeni PostgreSQL testleri mevcut migration CI işinin çalıştırdığı `test_postgres_persistent_operations.py` içine eklendi; yerel veritabanı tanımlı olmadığından burada çalıştırılmadı. Canlı Google/Apple/AWS, telefon, Terms yayını, yeni ödeme/iade veya Uç hesabına write yapılmadı.

Yeni politika modülü, main/store/verifier/profil/platform entegrasyonu ve testleri Ruff 0.17.0 `E9,F` kontrolünden geçti; pytest'in import edilmiş fixture parametreleri için test dosyasında `F811` istisnası kullanıldı. `meta_progression.py` (3) ve `player_data_store.py` (1) üzerinde HEAD'de de bulunan dört eski unused import/variable bulgusu ayrıca doğrulandı; bu adayda yeni lint hatası oluşturulmadı. Python derleme ve JS syntax kontrolleri geçti. Bu kayıt tam depo lint'inin temiz olduğu iddiası değildir.
