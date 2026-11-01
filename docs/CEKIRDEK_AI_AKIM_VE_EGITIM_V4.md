# Çekirdek, AI, Akım ve savaş anlatımı — 30 Ekim 2026

Bu tur ana oyunun 3 sınıf/24 modül planını tamamlayan sistemler güncellendi. Kullanıcının ek vurgusu uygulandı: çekirdek gücü yalnız bir görsel efekt değil, maçın gidişine gerçek katkı sağlayan bir karar olmalı.

## Çekirdeklerin gerçek güçleri

Ortak ilk dolum **20 sn**, sonraki dolum **35 sn**. Yararlanacak modülleri çekirdek otomatik seçer. Seviye bazlı ortak çekirdek CAN hesabı değişmedi. Tek kaynak `server/app/game/core_balance.py` içindeki `CORE_TUNING`; uygulama `battle_actions_v2.py`.

| Çekirdek | Önceki etki | Güncel etki |
|---|---|---|
| Rezonans | %18 onarım | Çekirdeği ve en yaralı iki modülü azami CAN'larının **%25'i** kadar onarır. Eksik CAN kadar gerçek onarım yapılır; tam canlı devrede dolum harcanmaz. |
| Muhafız | %20 CAN kalkanı / 5 sn | Çekirdek ve iki dosta **%30 CAN kalkanı / 8 sn**. Ateş altındaki dost önceliklidir. Yalnız gerçekten emilen hasar katkıya yazılır. |
| Aşırı Yük | İki silah, üç atış, +%50 | İki uygun silahın sonraki **dört atışına +%60 hasar**. Dört atıştan sonra normal hasara döner. Fazladan öldürme hasarı katkı diye yazılmaz. |
| Kesinti | İki silah / 1,5 sn | Hasarı yüksek iki rakip silahı **2,5 sn durdurur**; sürmekte olan hazırlıkları da erteler. Kontrol sonrası toparlanma koruması vardır. Arındırma karşı oyundur. |
| Kapasitör | +3 Akım | Depodaki boşluğa göre **+5 Akım**; tavan 12. Depo doluysa güç korunur. Yeni bir enerji veya indirim sistemi eklenmedi. |
| Anka | %40 CAN ile geri kurulum | Yıkılmış uygun bir modülü boş hücreye **%70 CAN ile geri kurar**. Rastgele boş hücre kuralı korunur. |
| Kuantum | Rezonans'a benzer onarım/kalkan | Çekirdek ve iki dosta **6 sn içinde iki hasarlı isabeti tamamen engelleyen Kuantum Perdesi**. İki isabetten sonra tükenir; seri ateş karşı oyundur. |

56 aynı desteli/seviyeli/tohumlu AI savaşı, kendi çekirdeği açık/kapalı olarak 28 çift halinde karşılaştırıldı. **56/56 sonuçlandı, altı çiftte kazanan değişti.** Bu insan kazanma oranı ölçümü değildir. Çekirdek açık dört senaryonun toplam katkıları: Rezonans 2.954 gerçek CAN onardı; Muhafız 1.766, Kuantum 1.571 gerçek hasar engelledi; Aşırı Yük 1.845 gerçek ek CAN hasarı verdi; Anka 3.498 CAN ile modül geri getirdi; Kapasitör 60 Akım verdi. Kesinti rakip silahları toplam 58 silah-saniyesi çalışmaz tuttu; bu iki eşzamanlı hedefin sürelerini toplar.

Kullanım bildirimi gerçek onarım/kalkan miktarını, güçlenen atış sayısını, geri dönen CAN'ı veya durdurulan silahları gösterir. Sonraki vuruşlarda gerçek ek hasar ve emilen hasar izlenir. Maç sonu çekirdek kartında da katkı toplamı bulunur. Verilmeyen onarım, kullanılmayan atış yükü veya henüz tüketilmeyen kalkan gerçek sonuç diye gösterilmez. Akımın özel ekonomi bilgisi rakip olaylarında ve sonuç özetinde gizlenir.

## Hasara bağlı ek Akım ve savunma sorunu

Akım **6 başlangıç / 12 depo / 2,2 sn'de +1 temel dolum** olarak kaldı. Eklenen sınırlı ödül: birinci seviyeye göre normalize edilmiş **100 yeni rakip CAN hasarı → +1 Akım**, en sık **6 sn'de bir**. İlerleme en çok bir bonusluk tutulur; depo doluyken yeni hasardan ilerleme kazanılmaz. Ölçülen hasar savunma sonrası gerçek CAN kaybıdır. Kalkanın emdiği, yansıyan, dost hedefe verilen ve fazladan öldürme hasarı gelir sağlamaz. Aynı hedefin onarılmış CAN'ı tekrar gelir üretmez; yeniden doğuş bu izi sıfırlamaz. Temel dolum, silahı kalmayan oyuncunun oyuna geri dönmesini sağlar.

İnce turkuaz çizgi bonus ilerlemesini, gerçek ödül `+1 AKIM` geri bildirimi gösterir. Kod `pressure_current.py`; eşik/aralık `economy.py` içindedir. Fiyatlar veya hesap cüzdanındaki Devre Kredisi/Akı bu ekonomiyle karıştırılmaz.

İlk savunma senaryolarında yalnız ek Akımın yeterli olmadığı görüldü. Çok sayıda Onarım aynı hedefi anında doldurabiliyor, devre dolunca fazladan Akım kilidi açamıyordu. Onarım artık **15 CAN'ı üç kısa darbeyle 3 sn içinde veren, aynı hedefte birikmeyen yenilenme** uygular. Kendi 2 sn eylem dolumu ve yetenekleri korunur; başka Onarım farklı yaralı dosta gidebilir. Yeşil yenilenme rozeti ve gerçek +CAN darbeleri görünür. Küçük alınan onarım yeteneklerinin yuvarlanarak yok olmaması için kesir artığı taşınır.

Son kontrollü senaryolar: 30 sn savunma kurup aynı anda en çok bir silah tutan politika, 11 arketip × 3 tohum ile denendi. **Ek Akım açıkken 33/33 savaş bitti, tek silahlı taraf 0/33 kazandı**; ortanca 75,6 sn. Aynı son kurallarda bonus kapalıyken de 33/33 bitti ve 0/33 kazandı; ortanca 102,7 sn. Dolayısıyla tıkanmayı gideren başlıca değişiklik Onarım yığılmasının çözülmesidir; bonus Akım saldırı temposunu ayrıca ödüllendirir. Bu gözlem bütün insan stratejileri için matematiksel kazanma yasağı değildir; oyuncuya yeni bir saldırı/kopya/sınıf kotası konmadı.

Yeteneklerin tamamı sol/sağ ve yeteneksiz olarak ayrıca 84 ana motor savaşı çalıştı: **84/84 bitiş, 900 sn gözlem aşımı yok**. Seviye 15 ortancaları 113,25 / 86 / 126,85 sn; bütün senaryolar 54,2–308,9 sn. 900 sn yalnız test gözlem sınırıdır; oyunda süre sonu veya zamanla artan hasar kuralı yoktur.

## AI oyuncuları ve eğitim

- 11 arketip kataloğunun her birinin altı kartlık farklı destesi var. Alan Hasarı Ark/Plazma; Ağır Hasar Darbe/Ray/Füze; Karşı Meta Kalkan Kırıcı/Ray/EMP/Virüs; sürdürülebilirlik Onarım/Arındırıcı gibi açık görevlerle ayrışır.
- 120 kaynak botun desteleri arketiplerine ve o kupada açılmış kartlara göre yenilendi; 120 üretilen eşleri bunları devralır. **240 botun hepsi** altı farklı, o seviyede açılabilen kartla doğrulandı. Oyuncu isimleri, kupaları ve karar gecikmeleri korundu. Taktik Zinciri/Taktik Denge adları yeni sınıflarla uyumlu; eski adlar kayıt uyumluluğu için alias olarak durur.
- AI seçim eğilimleri üç görünen sınıfı kullanır. Rastgele yerleşim ve eski teknik hedef profilleri değişmedi. AI yeni çekirdek değerlerini, mevcut seviye eşlemesini ve yeteneklerini kullanır.
- İlk savaş betiği **sürüm 4**: karta dokunma, üç sınıfın otomatik işi, saldırıdan ek Akım, otomatik hedefli çekirdek gücü. Dört kısa ipucu toplam en çok **16 sn**; GEÇ her zaman serbest, motor okumayı beklemez, başka kartı oynamak engellenmez. İlk menü turu hâlâ isteğe bağlıdır. İstemci ve sunucu betik sürümleri eşleşir.

## Modül enderliği, efekt ve ses

Enderlik farkı kartların gerçek mekanik kimliğindedir: Yaygın doğrudan görev; Nadir delme/yansıtma/tek hedef uzmanlığı; Epik zincir/alan/blok aşma/süreli kalkan; Efsanevi güçlü dördüncü isabet/faz/yıkımda çekirdek koruması. Bu tur bunların üzerine genel bir enderlik CAN/hasar çarpanı veya ek pasif katmanı eklenmedi; tek görevli 24 kart yapısı ve yetenek fiyatları korunur. İstatistik başlığı teknik çarpan açıklaması yerine kartın enderlik imzasını anlatır.

Tampon, Arındırıcı ve Hız Rölesinin gerçek sunucu olayları görsellere bağlandı. Son Siper'in kaynak modülü yıkıldığı için efektinin atlanması düzeltildi. Alan/zincir saldırılarında aynı kaynağın farklı hedefleri artık birbirinin çizimini silmez. Fazın gerçek penceresi ve Kuantum'un kalan isabetleri rozetlerde görünür. Çekirdekten yararlananlara sınırlı bağlantılar çizilir; gizleme, sonuç, tekrar olay ve boyut değişiminde eski geometri bırakılmaz.

Altı yeni modülün özgün kısa WAV dosyaları üretildi. Aktif 24 modülün ses dosyası hash'leri birbirinden farklı. Altı yeni dosya toplam yaklaşık 60 KB, 22.050 Hz mono; 6,6–12,4 KB/dosya. Sesler mevcut rutin/destek ses bütçesine uyar; çekirdeklerin ayrı etkinleşme cue'ları öncelikli bütçededir. Ek bir sürekli parçacık döngüsü veya ses motoru kurulmadı.

## Son doğrulama ve paket

- **352 odaklı sunucu**, **752 istemci**, **10 derleme testi** geçti. Tüm tarihsel enerji/ısı sunucu sözleşmelerinin geçtiği iddia edilmez.
- Chrome'da bağımsız **320×740 ve 393×852** ilk hesap savaşları geçti: dört engellemeyen eğitim adımı, gerçek çekirdek onarımı, bonus Akım durumu, altı sesin HTTP 200 ile yüklenmesi, maç sonu katkı metni, menüye dönünce bildirim temizliği. JS hatası, eksik varlık ve yatay taşma yok. Gerçek bildirim ve maç sonu toplamı aynı onarımı raporladı.
- Kanıtlar `artifacts/combat-readability-v4/` ve `artifacts/combat-readability-v4-talents/` içinde. `browser-320.json`, `browser-393.json`, `core-real-impact-*.png`, `core-summary.json`, `core-battles.json`, `final.json`, `final-no-pressure.json`, `server-tests.log`, `client-tests.log`.
- Web paket özeti **d351d19a46c734ce**. Yerel izole ana test sunucusu **8894**, son gerçek PID **19564**, başlatıcı **12736** (stderr üzerinden doğrula). Üretim verisi/yayın ve telefon APK kurulumu yapılmadı.

Araçlar: `tools/sync_ai_decks_v4.py`, `tools/probe_combat_readability_v4.py`, `tools/probe_core_powers_v4.py`, `tools/check_combat_readability_v4.cjs`; modül seslerini yalnız yeni altılı için üretmek üzere `tools/generate-module-audio.py --only ...`. Bir sonraki değerlendirme gerçek oyuncu strateji/çekirdek seçimi testi olmalı; otomatik gözlemler nihai rekabet dengesi yerine geçmez.
