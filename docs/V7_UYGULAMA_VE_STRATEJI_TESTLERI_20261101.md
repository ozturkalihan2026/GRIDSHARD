# GRIDSHARD V7.1 — Uygulama ve strateji testleri

1 Kasım 2026. Kullanıcının nihai hedefi: doğru karma devre, hem yalnız Saldırı hem yalnız Savunma yerleşimine karşı avantajlı olmalı. Rastgele yerleşim ve ana hedef önceliği aynı kalır.

## Uygulanan değişiklikler

Ana 24 kartta V7 enderlik/imza ve 192 yetenek seçeneği uygulandı. Plazma İzi, gecikmeli füze yükü, paylaşılan Kuantum yankısı, üç hedefli Ark, ek kalkan sökme, bütçeli emilim→onarım, gerçek CAN kaybından yansıma, Son Siper dost kalkanı, Virüsün onarım baskısı dalı ve Arındırıcı kontrol koruması canlı motor aksiyonlarıdır. İkincil etkiler birbirini tekrar tetiklemez; kalkan/overkill/onarım döngüleri ek Akım üretmez. Kesirli süreli hasar bütçesi korunur.

Yetenek fiyat/eşik/kimlikleri ve sahiplik korunur. Değişen kartlarda eski satın alınmış eşiklere bir defalık ücretsiz yeniden seçim geçişi uygulandı: bir ücretsiz sıfırlama ve yalnız o eski eşiklerin ücretsiz tekrar seçimi. Yeni eşikler ücretli, normal sonraki sıfırlama eşik başına 25 Akı. İstek tekrarı ve kayıt yeniden yükleme test edildi. Gerçek oyuncu dosyaları açılıp değiştirilmedi.

Koleksiyon açıklamaları, iki dilde yetenekler/değerler, durum rozetleri ve gerçek olaya bağlı küçük VFX/ses güncellendi. Kuantumun 13 ek hedefi düşük kalitede tek SVG içinde görünür; aynı kaynak anahtarı hedefleri silmez. Süreli isabetler yeni silah atışı veya namlu animasyonu oluşturmaz. Çekirdeklerin ayrı V6 lider sunumu ve V5 doğrudan rolleri korunur.

## CAN için testle alınan V7.1 kararı

| Savunma CAN adayı (ilk V7’ye göre) | Karma / yalnız Saldırı | Savunma / karma gözlem aşımı | Karar |
|---|---|---|---|
| ×1.25 | 21/54 | 0/54 | Seçilmedi |
| ×1.5 | 36/54 | 0/54 | Seçildi |
| ×1.75 | 36/54 | 13/54 | Seçilmedi |
| ×2 | 36/54 | 22/54 | Seçilmedi |

Bu aday matrisi eski sabit oranlı karma botuyla, aynı deste/tohum/çekirdeklerde çalıştı. ×1,75 ve ×2 ek kazanım vermeden kilitlenme üretti. ×1,50 sekiz Savunmanın **açık CAN istatistiğine** uygulandı; karma sınıf kurana gizli çarpan veya oyuncuya kota eklenmedi. Son Siper ilk V7’de 280 idi; bu kararla 420 oldu (V6’daki 320’ye göre +%31,25). Diğer yedi Savunmada V6’ya göre +%50. Saldırı/Taktik CAN’ı bu denemede artırılmadı.

## Ölçüm yöntemi ve düzeltmeler

İlk bot yalnız uygun fiyatlı kartlara baktığı için pahalı silaha para biriktirmeyip savunma basabiliyordu. Bu hatalı ilk oranlar nihai sonuç sayılmadı. Politika silah için bekleyecek şekilde düzeltildi. Karma devre, normal tehdide yaklaşık %50 saldırı/%30 savunma/%20 taktik tercih eder; saldırmayan veya tek silahla kamp yapan rakibe karşı saldırı tercihini artırır. Bunlar **test botu kararları**, savaş kuralları değil. Ana oyundaki AI da gereksiz savunma biriktirmek yerine saldırı kapasitesini büyütür.

İlk karma üçüncü deste (Kuantum, Kırıcı, Faz, Son Siper, EMP, Virüs) alan hasarı karşısında sürekli kaybetti. Bu sonuç saklanmadı: üç sınıfı koymak tek başına doğru strateji değildir. Ayrı aday testinde üçüncü deste Kuantum/Dron/Zırh/Tampon/Onarım/Virüs olarak kuruldu. Aday seçiminde kullanılan 19/120 serisi tohumlar nihai doğrulamada kullanılmadı; son karşılaştırma 523/624 serisindedir.

Son kontrol: 3 strateji eşleşmesi × 3 deste çifti × 6 aynı çekirdek × 3 seviye (1/8/15) × 2 taraf × 2 tohum =648 maç. Her strateji diğer iki stratejiye karşı toplam432 maç oynadı. İki taraf aynı çekirdeği, seviyeyi ve ekonomiyi kullanır; günlük meta kapalı, yetenekler ana tabloda kapalı. Takviye Çekirdeği rastgele Saldırı çağırarak yalnız Savunma koşulunu bozabildiğinden bu politika karşılaştırmasında kullanılmadı; yedi çekirdeğin gerçek rolleri motor testlerinde kapsanır.

## Eşleştirilmiş önce / sonra — aynı desteler ve tohumlar

| Ölçüm | Önceki V6 motor | V7.1 motor |
|---|---:|---:|
| Karma → yalnız Saldırı | 29/216 | 202/216 |
| Karma → yalnız Savunma | 216/216 | 216/216 |
| Biten maç | 648/648 | 648/648 |
| Ortanca savaş (sn) | 68.30 | 95.35 |
| p90 savaş (sn) | 94.40 | 125.10 |
| En uzun savaş (sn) | 175.10 | 162.10 |
| İlk modül kaybı ortancası (sn) | 18.30 | 21.50 |

### Strateji başına gözlenen oran

| Oynama politikası | Galibiyet / maç | Gözlenen kazanma |
|---|---:|---:|
| Doğru karma | 418/432 | %96.76 |
| Yalnız Saldırı | 230/432 | %53.24 |
| Yalnız Savunma | 0/432 | %0.0 |

Doğrudan karma–Saldırı karşılaşmasında karma **202/216 =%93.52**, yalnız Saldırı 14/216. Karma–yalnız Savunma 216/216. Bu yüzdeler insan oyuncu olasılığı veya bütün deste uzayının kazanma oranı değildir; tanımlanan bot nüfusunun gözlenen sonuçlarıdır. Yalnız Saldırı genel oranının %50 üstünde kalması, yalnız Savunmayı yenmesinden kaynaklanır.

### Aynı altı karta sahip taraflarla kontrol

Ayrı 324 maçta taraflara aynı karma deste verildi; biri yalnız ilgili sınıfı, diğeri tümünü oynadı. Karma, yalnız Saldırıya 88/108, yalnız Savunmaya 108/108 kazandı; gözlem aşımı yok. Burada eski zayıf üçüncü karma deste de bilerek korundu. Bu, farklı kart havuzunun sonucu tek başına açıklamadığını kontrol eder.

### Tek silah + savunma/onarım kampı

54 ayrı stres maçında kamp botu aynı anda en fazla bir silah oynadı, kalan Akımı savunma/onarımda kullandı. Karma 54/54 kazandı, gözlem aşımı yok; ortanca 120.5 sn. İlk sabit %50 saldırı politikasında 32/54 gözlem aşımı vardı. Sayılarla hasar baskısı veya zorunlu bitiş eklemek yerine, karma AI’nin tek silahlı kampa karşı daha fazla Saldırı kurması sağlandı. Oyuncunun bir silah sınırı yok; bu yalnız test politikasıdır.

### Yetenekli savaşlar

SV15’te tüm sol ve tüm sağ dallar ayrı gerçek motor matrislerinde çalıştı. İlk sağ-dal grubundaki dört kamp gözlem aşımı, tehdit durumuna göre saldırı oranı seçimiyle giderildi; yeniden koşuda54/54 bitti. Eski fiyatlar, ücretsiz geçiş ve 384 tam ağaçtaki hesaplanan parametreler ayrıca test edildi. Bu 384 farklı desteyle insan maçı oynandığı anlamına gelmez.

## En son: Akım ekonomisi karşılaştırması

Her satır aynı üç deste/politika, üç çekirdek, üç seviye ve taraf değişimiyle 162 maçtır. Depo12, başlangıç6, bonus arası6 sn ve tek bonus bankası bütün satırlarda aynı. Hasar eşiği yeni gerçek CAN kaybını ölçer; tekrar onarılan CAN gelir sağlamaz.

| Pasif +1 Akım | Yeni CAN hasarı / +1 | Karma → Saldırı | Ortanca savaş (sn) | Aşım |
|---|---:|---:|---:|---:|
| 2.5 sn | 200 | 54/54 | 94.10 | 0 |
| 2.5 sn | 100 | 54/54 | 93.40 | 0 |
| 3 sn | 200 | 54/54 | 90.10 | 0 |
| 3 sn | 100 | 54/54 | 90.40 | 0 |

**Karar:** 2,5 sn / 200 yeni CAN hasarı korunuyor. 3 sn /100 hasar adayında strateji ayrımı artmadı ve bu grupta savaş ortancası uzamadı. Daha yüksek hasar gelirini karma kurmanın tek teşviki yapmak gerekmiyor; ilk etken kartların birlikte katkısı ve uygun karşı hamleydi. Bu bir “3/100 her koşulda kötüdür” iddiası değildir.

## Doğrulama, paket ve sınırlar

- 439 odaklı sunucu testi: motor, 24 kart/192 seçenek, eski ücretler, kayıt geçişi/yeniden yükleme, yedi çekirdek ve protokol/WebSocket. Tam tarihsel sunucu kümesi için yeşil iddiası yok.
- 765 istemci testi ve 10 derleme testi; kaynak paketine yalnız beş açık statik sunucu JSON’unun girmesini doğrulayan3 paket sınırı testi.
- 320/393 CSS piksel gerçek ilk savaş: 24 kart verisi, V7 parametreleri/dal adları, protokol2, ısı çubuğu0, yatay taşma0, JS/eksik varlık0. Süreli VFX ekranı **sunum fixture’ıdır**; gerçek yeni hasar kanıtı motor aksiyon testleri ve savaş matrislerindedir.
- Tamponda kalkan silmenin onarım üretmemesi, onarım cezasının geri dönüştürülerek telafi edilememesi, küçük bütçe yuvarlama, ölen kaynağın izi, arındırma, Faz, yansıma, tekrar olay ve zayıf Tamponun büyük eski havuza daha yüksek dönüşüm yapıştıramaması test edildi.
- PvP protokol2: eski istemci yeni mekaniklere sessizce bağlanmaz. İstemci+sunucu birlikte güncellenmeli. ZIP/Docker statik veri listesi ana kadro, yetenek ve sezon manifestini içerir; kişisel JSON’lar dışarıda kalır.
- Üretim/Play yayını ve telefon kurulumu yapılmadı. Telefonda önceki V6 ve onun eski8891 süreci duruyor; bu çalışma onu yeniden başlatmadı. Yeni koda göre sunucu başlatılacaksa V7 istemci paketi de gerekir.
- Yeni sezon adayları ana oyuna eklenmedi; sezon kartları ayrı üretim kapısında bekler.

Kanıt: `artifacts/module-v7-rollout/final-results.json`, `server-final-tests.log`, `client-tests.log`, `build-tests.log`, `browser-320.json`, `browser-393.json`; her matrisin `artifacts/strategy-v7-*/battles.json` ve `summary.json` dosyaları. Çoğaltma: `tools/probe_strategy_v7.py`, `tools/probe_camp_v7.py`, `tools/check_module_v7.cjs`, `tools/report_module_v7_rollout.py`.

Ana karar: `NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md`. Sonraki doğrulama, V7 istemci+sunucu ile gerçek telefon ve insan strateji seansıdır. Bot sonuçları tek başına kalıcı rekabet metasını doğrulamaz.
