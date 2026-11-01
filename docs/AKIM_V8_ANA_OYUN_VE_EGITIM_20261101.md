# Akım V8 — ana oyun, eğitim ve Tampon karşılıkları

1 Kasım 2026. Kullanıcı karma devrenin yalnız Saldırı ve yalnız Savunmaya
üstünlüğünü hedef olarak korudu. Bu üstünlüğü sırf oran yüksek olduğu için
azaltmak bu çalışmanın hedefi değildir.

## Ana koda alınan kural

`DEFAULT_CIRCUIT_CREDIT_CONFIG`: başlangıç **7**, depo **12**, pasif
**3 saniyede +1**. Saldırı modüllerinin verdiği **100 yeni gerçek düşman
CAN kaybı** ve Savunma modüllerinin aldığı **50 yeni gerçek CAN kaybı**
birlikte **ek +1 Akım** verir. Bonus beklemesi yoktur. Sayaçlar birlikte
tüketilir; fazlalık taşınır, depo 12’ye ulaşınca temizlenir.

Önlenen/emilen hasar, kalkan üretimi/silinmesi, overkill, dost hasarı,
yansıma ve onarılarak yeniden kaybedilen aynı CAN gelir oluşturmaz.
Saldırı/Taktik kartlarının ve kendi çekirdeğinin CAN kaybı Savunma sayacına
eklenmez. Çekirdek hasarı 100’lük Saldırı sayacını doldurmaz.

**Yetenek uyumu düzeltildi:** deneylerde ayrı geliri ayırmak için kapatılan
İmha Kazancı ana oyunda açıklamasındaki başarılı imha başına **+1 Akımı**
vermeye devam eder. Satın alınmış yetenek işlevsiz bırakılmadı; fiyat/kimlik
aynıdır. Bu açık yetenek istisnası motor testindedir; önceki 648’lik strateji
karşılaştırmasında çekirdek yetenekleri seçilmemiştir.

Config sınıfının eski kurucu varsayılanları tarihsel açık test ayarlarını
korur; normal oturumlar yeni DEFAULT nesnesini kullanır. Rastgele yerleşim,
hedef önceliği, modül değerleri ve kopya/sınıf kotasızlığı değişmez.

## Eğitim, açıklama ve botlar

- İlk savaş betiği **V5**: kart yerleştir → otomatik savaş → Savunma ekle
  → 100+50 koşulu → çekirdek gücü. Beş kısa ipucu 24 saniyede serbest kalır.
  Savaş/üretim okumayı beklemez; başka kart oynanabilir, ipucu geçilebilir.
- Yönetmensiz ilk savaş ipucu ve yetersiz Akım metni de güncellendi.
  Eski 200 hasar/2,5 sn/6 sn bonus açıklaması canlı istemciden çıkarıldı.
- **Ayarlar → Hakkında → Nasıl oynanır?** kalıcı açıklaması başlangıç,
  pasif dolum, iki koşulun birlikte dolması, gerçek CAN ayrımı, depo
  sıfırlaması ve çekirdek yeteneği istisnasını anlatır. Kalabalık savunmaya
  zincir/alan saldırısı kullanma ipucu içerir.
- Akım göstergesinde iki ilerleme çizgisi ve erişilebilir `x/100 + y/50`
  etiketi vardır. Tek sayaç dolunca bonus hazır gösterilmez. İki sayaç
  yalnız sahibinin snapshot’ında bulunur; rakibe verilmez.
- AI, çalışan Saldırısı olup Savunması yoksa Savunmaya tercih puanı verir;
  bu oyuncu kotası değildir. Saldırgan yedek arketip dört silah yanında
  Zırh taşır. 240 arena botunun destesinde iki sınıfın da bulunması denetlendi;
  gerçek oyuncu koleksiyonları ve bot isim/rating verileri yeniden yazılmadı.
- TR/EN istemci ve yerel tanıtım sitesi metni güncellendi. Canlı siteye veya
  Play Store açıklamasına yayın yapılmadı; hukuki metinler değiştirilmedi.

## Tampon yığılması

Önceki 34 süren maç aynı düşman, altı çekirdek, SV1/8/15, tohum ve tarafla
yeniden üretildi. Her satır 36 maçtır. Modül ve ekonomi değerleri aynı;
yalnız karma destenin karşı kartları değişir.

| Karma saldırıları | Karma kazanır | 900 sn’de sürer |
|---|---:|---:|
| Gözlenen Kuantum + Dron | 2/36 | 34/36 |
| Kuantum + Kırıcı | 7/36 | 29/36 |
| Kuantum + Plazma | 27/36 | 9/36 |
| Kırıcı + Plazma | 36/36 | 0/36 |

**Kırıcı tek başına her durumu çözmez.** Plazma Arena 8, Kırıcı Arena 10,
Tampon Arena 7’de açıldığından erken erişim de ayrıca denendi. Arena 7 ve
öncesinde açılan yasal kartlarla, iki destede diğer kartlar aynı tutularak:

| Arena 7 saldırıları | Karma kazanır | 900 sn’de sürer |
|---|---:|---:|
| Lazer + Dron | 24/36 | 12/36 |
| Lazer yerine Ark + Dron | 36/36 | 0/36 |

Ark, Tampon ile aynı arenada açılır; açılmasının kartı her oyuncuya hemen
verdiği iddia edilmez. **Tampon’un CAN/koruma/onarımı düşürülmedi:** karşı
kart seçimi çalışıyor. Gizli hasar artışı, süreyle zorunlu bitiş, hedef
değişikliği ve kota eklenmedi. 216 maçın kanıtı
`artifacts/buffer-counters-v8/`; betik `tools/probe_buffer_counters_v8.py`.

## Doğrulama ve sınırlar

- **385** odaklı sunucu/PvP/yeniden bağlantı/öğretici testi PASS.
- **769** istemci, **10** web derleme ve **3** kaynak paket sınırı testi PASS.
- Tanıtım sitesi **17** test ve TR/EN masaüstü/393/320 genişliklerinde **30**
  yerel tarayıcı sayfa kontrolünden geçti; yayın yapılmadı.
- Gerçek ilk savaş ana ekran düğmesinden açıldı: TR320/TR393 ve EN393.
  Beş sahne, 7 başlangıç, özel sayaçlar, savaşı durdurmama ve sıfır taşma/JS
  hatası/eksik varlık doğrulandı. Hakkında açıklaması da açılıp görüntülendi.
  Ekran resimleri `artifacts/current-v8-browser/`; sürücü
  `tools/check_current_v8.cjs`. Tam tarihsel test kümesi onayı iddiası yoktur.
- Son web derlemesi **f4551a68a1c88371**. Telefon APK’sı üretilmedi/yüklenmedi;
  önceki V6 ve eski 8891 telefon sunucusuna dokunulmadı. Ayrı geçici QA8898
  sunucusu yeni kodla çalışır; kişisel veri içermez.

Kalan insan testi: oyuncu 100+50’nin **birlikte** gerektiğini ve Savunma CAN
kaybının engellenen hasardan farkını oyun sırasında anlayabiliyor mu?
Otomatik testler bu anlaşılırlığı kanıtlamaz. Bu, karma üstünlüğünü azaltma
kararı değil, öğreticinin anlaşılırlık kontrolüdür.
