# Google Play mağaza incelemesi — 1 Kasım 2026

Kamuya açık [Türkçe mağaza sayfası](https://play.google.com/store/apps/details?id=com.gridshardgame.app&hl=tr&gl=TR)
ve [İngilizce görünüm](https://play.google.com/store/apps/details?id=com.gridshardgame.app&hl=en&gl=US)
tarayıcıda okundu; sekiz ekran görüntüsü tek tek açıldı. Sayfa güncellenme
tarihini **25 Ekim 2026** gösteriyor. Play Console alanları veya canlı mağaza
değiştirilmedi; üretimdeki Android ikili dosyası bu incelemede test edilmedi.

**Önemli yayın sırası:** eski açıklamalar yayımdaki eski paketle uyumlu olabilir.
24 modül/3 sınıf ve Akım V8 henüz üretim Android paketiyle yayımlanmadı.
Yeni metin/görseller o özellikleri içeren paketle birlikte kullanılmalı;
mağaza tek başına önden yeni sürüm varmış gibi değiştirilmemeli.

## Metinlerde bulgular

| Alan | Kamu sayfasındaki durum | Sonraki sürümde karar |
|---|---|---|
| Oyun adı | GRIDSHARD | Korunabilir |
| Kısa açıklama | Modül kartları ve gerçek zamanlı çekirdek savaşı | Temel vaat hâlâ doğru; karma Saldırı/Savunma vurgulu alternatif hazır |
| Modül sayısı/sınıf | 36 modül, 5 sınıf | 24 modül, Saldırı/Savunma/Taktik |
| Kartların işi | Destek, Sistem, Sabotaj ayrı yapıda anlatılıyor | Üç sınıfın kısa ve somut işlevi |
| Akım | Yalnız zamanla biriktiği anlatılıyor | 7 başlangıç, 12 depo, 3 sn pasif; 100 Saldırı hasarı ve Savunmanın 50 gerçek CAN kaybı birlikte ek +1 |
| Çekirdek gücü | Bütün devreyi etkileyen tek genel güç izlenimi | Türüne göre doğrudan ateş, imha, takviye ve otomatik hedefleme |
| Enderlik | Farklı mekanik vaadi | Temelde doğru; gerçek zincir/alan/kalkan/kontrol örnekleriyle somutlaştırıldı |
| Devre Yolu | 12 arena ve kart açılışları | Korundu; görsellerdeki başlangıç kartları yenilenmeli |
| Yenilikler | R8, Soğutucu, CAN/Isı, enerji hatları gibi eski sürüm ayrıntıları | Yeni sürüm için sadeleşen savaş, Akım, çekirdek, yetenek ve eğitim değişiklikleri |
| İngilizce | Açıklama İngilizce; Yenilikler Türkçe, görseller Türkçe | İngilizce release notları ve gerçek İngilizce arayüz çekimleri |

İngilizce görünümün sekiz ekran görseli, Türkçe görünümün sekiz görseliyle
aynı kamu varlık URL’lerini kullanıyor (**8/8 eşleşme**). Bunun otomatik
çeviri mi yoksa manuel çeviri yapılandırması mı olduğu, yalnız kamu sayfasından
kesinleştirilmedi; çeviri eksikliği doğrudan gözlendi.

## Sekiz yayındaki görsel

Aşağıdaki sıra **canlı galeride gözlenen sıradır**; yerel eski dosya adlarının
numaralarından çıkarılmadı. Kamu kopyaları
`artifacts/play-store-audit-20261101/published/` içindedir. Bunlar inceleme
kanıtıdır, yeni mağazaya yüklenecek dosyalar değildir.

| Sıra | Ekran | Bulgu | Öneri |
|---|---|---|---|
| 1 | Ana ekran | Eski Batarya/Soğutucu destesi | Yeniden çek; aksiyonlu savaş ilk sıraya |
| 2 | Modüller | Eski 5 sınıf sekmeleri, Batarya, Soğutucu ve kaldırılmış kartlar | Zorunlu yeni çekim: üç sekme ve güncel deste |
| 3 | Çekirdekler | Eski görünüm; yalnız 1/7 sahiplik ve tek çekirdek kartı öne çıkıyor | Güncel seçim/detay; gerçek savaş gücünü ayrı görüntüde göster |
| 4 | Devre Yolu | Eski başlangıç kartları içinde kaldırılanlar var | Yeni arena kart dağılımıyla tekrar çek |
| 5 | Sandık mağazası | Eski Ödül Listesi düğmesi ve eski arayüz | Kompakt yeni satırla tekrar çek |
| 6 | Etkinlikler | Eski günlük meta başlığı ve 19–25 Ekim tarihleri | Güncel gerçek etkinlik veya yetenek ekranıyla değiştir; ilk üçte kullanma |
| 7 | Takım oluşturma | Boş form ve Devre Kredisi yetersiz durumu | Kullanılan takım özelliğini gösteren daha açıklayıcı gerçek ekran tercih et |
| 8 | Savaş | Eski platform/üst arka plan ve Batarya/Soğutucu rafı | Yeni platform, karma deste ve Akım göstergesiyle yeniden çek; ilk sıraya taşı |

Özellikle karşılaştırılabilir kanıtlar:

- [Yayındaki eski modül ekranı](../artifacts/play-store-audit-20261101/published/02-modules.webp)
- [Yayındaki son sıradaki savaş](../artifacts/play-store-audit-20261101/published/08-battle.webp)
- [Güncel arayüzün gerçek yerel savaş kontrolü](../artifacts/current-v8-browser/battle-393.png)

Son bağlantı bir **QA görüntüsüdür**, nihai mağaza çözünürlüğünde yeni teslim
değildir. Eski Google CDN kopyaları 810×1440 WebP; bu, Play Console’a yüklenen
orijinallerin boyut/biçimini kanıtlamaz.

## İkon ve özellik grafiği

Mevcut mağaza ikonu boyalı mint çekirdektir; proje uygulama ikon kaynağıyla
görsel olarak uyumludur. İkonu sırf bu geçiş nedeniyle yeniden tasarlamak
gerekmiyor. Kaynak: `client/assets/branding/gridshard-app-icon-source.png`;
27 Ekim ortak kaynak aktarımı marka README’sinde kayıtlıdır. Yeni üretim
paketinin native ikon kaynaklarını taşıması paket kontrolünde doğrulanmalı.

**Özellik grafiği için kesinlik sınırı:** kamu sayfasında seçili 1024×500 afiş
gösterilmedi. Play Console’daki dosya bu incelemede okunmadı. Yerel son
teslim olan `artifacts/store-2.1.1-20261022/feature-graphic-1024x500.png`
açıldı: kaldırılmış Bataryalar ve tek taraflı kalkan/silah düzeni içeriyor.
Bu dosya yeni sürümün afişi olarak tekrar kullanılmamalı.

Yeni afiş brief’i: aynı boyalı cihaz dili, okunur GRIDSHARD başlığı, görünür
çekirdek ve iki tarafta Saldırı/Savunma içeren devreler. Batarya/Soğutucu
yerine mevcut modüller; UI taklidi, uydurulmuş ekran, promosyon rozeti veya
sahte rakam kullanılmamalı. Yeni afiş bu incelemede üretilmedi.

## Hazırlanan teslim

Güncel metin kaynağı [PLAY_STORE_LISTING.md](PLAY_STORE_LISTING.md).
Eski belge tarihsel arşive alındı. Hazır düz metinler
`artifacts/play-store-audit-20261101/proposed-text/` altında:

| Dil | Kısa açıklama | Tam açıklama | Yenilikler |
|---|---:|---:|---:|
| Türkçe | 71/80 | 2262/4000 | 342/500 |
| İngilizce | 72/80 | 2206/4000 | 387/500 |

İsim 9/30 karakterdir. Sınırlar resmî
[ürün ayrıntıları](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
ve [sürüm notları](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en)
sayfalarından kontrol edildi. Metin dosyalarında karakter sayımı yapıldı.

Yeni sekizli sıra ve çekim amaçları güncel mağaza belgesinde hazırdır.
Tercih edilen çıktı 1080×1920, gerçek çalışan oyundan dikey PNG/JPEG;
TR/EN arayüzünden ayrı çekimler. Önizleme ölçüleri ve gerçek oyun görüntüsü
ilkesi [Google önizleme kılavuzuyla](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
karşılaştırıldı. Ekran görüntüsü/afiş üretimi ve mağazaya yükleme bu salt
okunur inceleme kapsamında yapılmadı.

Kanıt manifesti: `artifacts/play-store-audit-20261101/audit-manifest.json`.
Üretim uygulaması, oyun kodu, satın alma, kullanıcı verisi ve mağaza alanları
bu çalışmada değiştirilmedi.
