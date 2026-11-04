# Isı çubuğu düzeltmesi ve çekirdeklerin lider sunumu — 31 Ekim 2026

Isı yönetimi kaldırıldığı halde fiziksel modül görsellerine boş ısı çubuğu
ekleniyordu. `module-card-state-view.js` çubuğu artık oluşturmaz; eski ısı
verisi gelse bile gösterge ve ısı rozeti üretilmez. Kendi ve rakip tahtasındaki
gerçek CAN göstergeleri korunur. İlgili v15 ısı çubuğu yerleşimi de kaldırıldı.

## Çekirdekler için ayrı sunum

Yeni `core-vfx-v6.js` / `core-vfx-v6.css`, normal modül efektlerinin çizimini veya
sesini kullanmaz. Hedef ve etki gerçek sunucu olayına bağlıdır. Yeni görsel
sunum yeni hasar, sahte vuruş ya da farklı hedef seçimi üretmez.

| Çekirdek | Görsel karşılık |
|---|---|
| Rezonans | Çekirdekte altın mühür; her vurulan hedefe ayrı geniş dalga yolu ve iç içe darbe halkaları |
| Muhafız | Kendi çekirdeğinde kale silueti; 6 saniyelik gerçek ateş süresince kale durumu ve hedefte çapraz darbe mührü |
| Aşırı Yük | Çekirdekte korona; her gerçek atışta hedefe çift ateş akışı ve darbe tacı |
| Kesinti | Hedefte süreli imha işareti; gerçekten imha olursa kapanan bıçak/altıgen mühür; Arındırıcı temizlerse imha efekti oynatılmaz |
| Takviye | Çekirdekten gerçek çağrılan modüle geçit bağı; hedef hücrede üçgen portal ve belirme sütunu |
| Anka | Kanat silueti ve çift ateş izi; gerçekten onarım gerçekleşmişse hedef yönünden çekirdeğe ayrı can dönüşü |
| Kuantum | Siyah merkezli yarık, iç içe ters yönlü elmaslar ve parçalanma çizgileri |

Rezonans'ın aynı anda vurduğu hedefler eski `sourceId` anahtarı nedeniyle
birbirinin çizimini siliyordu. Etki artık kaynak **ve hedef** anahtarıyla tutulur.
Ölen hedefin kartı kalkınca darbe yerinin kaybolması da düzeltildi: çekirdek
vuruşu olayında ölümden önceki hücre konumu taşınır; son çizilmiş hücre ve olay
konumu geri dönüş olarak kullanılabilir. Bu konum alanı yalnız çekirdek
vuruşlarına eklenir, normal silah trafiğine ek yük getirmez.

## Özgün sesler ve kaynak sınırları

Her çekirdeğe ayrı aktivasyon ve isabet sesi: **14 özgün WAV**, toplam 486.596
bayt kaynak; 22.050 Hz mono. Normal silah örnekleri kopyalanmadı. Deterministik
üretici `tools/generate-core-audio-v6.py`; OGG/AAC türevleri mevcut mobil ses
hattıyla üretildi. Ses seviyelerinde kırpılma payı ve mevcut genel ses bütçesi
korunur. Çekirdek sesleri önemli olay önceliği taşır; kullanıcı ses ayarı geçerlidir.

Sunum normal modüllerden ayrı, yüksek kalitede en çok 12 / düşükte 8 SVG kökü
tutar. Tekrar kaydı en çok 256 olaydır. Yeni bir saldırı döngüsü veya sürekli
JavaScript parçacık zamanlayıcısı yoktur; mevcut ortak efekt süpürücüsü kullanılır.
Sekme gizlenince, maç bitince veya sahne sıfırlanınca efektler bırakılır.
Düşük kalite/hareket azaltmada esas hedef bağlantısı korunur, süs hareketi kısılır.
Bu sınırlar genel cihaz performans garantisi değil, uygulanan kaynak bütçeleridir.

## Doğrulama

- **762 istemci testi**, **353 odaklı sunucu testi**, **10 paket testi** geçti.
- Üç Rezonans hedefinin birbirini silmeden aynı anda görünmesi, öldürülen hedef
  konumu, imha işaretinin temizlenmesi, canlı kanal kaynağının ölmesi, gerçek
  onarıma bağlı can dönüşü ve 400 olay sonrasında sınırlı efekt/cache test edildi.
- 320 ve 393 CSS pikselde gerçek sunuculu Rezonans savaşı: görünen darbe hedefleri
  sunucunun hedefleriyle bire bir eşleşti. Son 393 koşusunda üç gerçek hedefin
  tamamı aynı anda görünür. Isı çubuğu sayısı sıfır, taşma/JS/eksik varlık sıfır.
- Yedi çekirdeğin geometrileri ayrıca **açıkça sunum fixture'ı** olarak gerçek
  tahta üzerinde görüntülendi. Bu görüntüler yedi ayrı gerçek çekirdek maçı
  oynandığı iddiası değildir. Normal oyun değerleri sunucu testlerinde doğrulandı.
- 14 ses isteği başarılı; WAV'lar birbirinden ve tüm modül WAV'larından farklı
  hash taşıyor. Maç sonrasında çekirdek efektlerinin tamamı temizlendi.

Kanıt: `artifacts/core-hero-v6/browser-320.json`, `browser-393.json`,
`real-resonance-*.png`, `fixture-core_*-*.png`, `audio-masters.json`.
Araç: `tools/check_core_hero_v6.cjs`. Tarayıcı testi ayrı 8896 QA hesabıyla yapıldı.

## Android paketi ve telefon durumu

- `GRIDSHARD TEST` / `com.gridshard.localdebug` APK hazır.
- Mobil build `567425426a9db700`; JS `gridshard-212e55279034e5fa.js`.
- APK SHA256 `000E654A3951F49238B22B505897C8EFAB33A18F31EA75F5EA9C597F95BF61A9`.
- JDK21/SDK36 ile çevrimdışı `assembleDebug` geçti; 539 web dosyası APK ile
  eşleşti; native API/ağ/güvenli depo denetimi ve v2 imza kontrolü geçti.
- **1 Kasım 2026:** V6 paket telefona `adb install -r` ile başarıyla kuruldu;
  mevcut test hesabı ve uygulama verileri korundu. Native WebView doğru yeni
  `gridshard-212e55279034e5fa.js` paketini çalıştırıyor. Gerçek sunucu bağlantısı,
  24 modül / 7 çekirdek / 42 yetenek seçeneği, taşma/JS/eksik varlık sıfır
  doğrulandı. Telefon ana ekranda denemeye hazır bırakıldı. Bu kontrol maç
  başlatmadı; yedi çekirdeğin telefonda ayrı savaş testi yapıldığı anlamına gelmez.
  Kanıt: `artifacts/core-hero-v6/phone-20261101/result.json` ve `phone-*.png`.
- Telefonun mevcut izole sunucusu açık bağlantı yokken güncel hedef konumu
  desteğiyle yeniden başlatıldı. API8891 ve eski kalıcı test verisi korunur.
  Üretim uygulaması/sunucusu veya oyuncu para/sahiplik kayıtlarına işlem yapılmadı.

1 Kasım bağlantısında kapalı yerel API yeniden açıldı; kalıcı test dizini aynı.
Sunucu başlatıcı PID21388 / gerçek PID11936, port8891. USB reverse8891 açık,
inceleme forward9224 kapalı. Test sırasında USB ve bilgisayar açık kalmalı.

Modül enderlikleri için ayrı araştırma ve 24 kartlık öneri:
`docs/OYUN_KANONU.md`. Bu öneri sayıları bu sunum
güncellemesinde ana savaş motoruna uygulanmadı.
