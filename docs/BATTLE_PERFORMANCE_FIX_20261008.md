# PvP sunumu ve savaş başlangıcı — 8 Ekim 2026

Durum: yerel kaynak değişikliği. Canlı r13, mevcut versionCode 4 APK/AAB ve
oyuncu hesapları değiştirilmedi; commit/push veya dağıtım yapılmadı.

## Bulgular ve sınırları

İstenen son arkadaş maçı canlı veritabanında yalnız salt-okunur SELECT ile
incelendi. Maç sonucu uygulanmış, bitiş nedeni çekirdek yok edilmesi ve sonuç
projeksiyonu bitişten yaklaşık 122 ms sonra tamamlanmıştı. Bu, sonuç yazımının
beklemede olmadığını gösterir; maç sırasında istemcinin donmadığını göstermez.
Uygulanmış maçın ayrıntılı motor olay dizisi silinmişti. Tutulan ekonomi
telemetrisi motor zamanını içerir, kare süresi/ağ gecikmesi ölçümü değildir.
Dolayısıyla o maçta donmanın tam saniyesi veya tek nedeni kanıtlanamadı.
Oyuncu adları, hesap kimlikleri ve maç kimliği bu belgeye alınmadı.

Kaynakta doğrulanan, belirtilen belirtilerle uyumlu sorunlar:

| Eski yol | Etki | Yerel düzeltme |
| --- | --- | --- |
| Her WebSocket mesajında savaş snapshot'ı uygulanıp genel `render()` çalışması | Heartbeat, ACK ve yalnız olay içeren mesajlarda da tahta/modül/ekonomi işi | Taşıyıcı durumu hemen, savaş sunumu en fazla bir animation frame'de; yalnız yeni snapshot uygulanır |
| Relay state ve app katmanının aynı kendi modüllerini uygulaması | Yinelenen durum işleme | Dinamik modül eşlemesi yalnız app katmanında |
| Reconnect yanıtından sonra bağlantının live-event imlecinin sıfır kalması | Sonraki live sayfada bütün geçmişin tekrar gönderilmesi | Başlangıç ve explicit reconnect tesliminden sonra imleç monoton ilerler |
| Client'ın olay ACK imlecini heartbeat'te göndermemesi | Yeniden bağlantı geçmişinin gereksiz büyümesi | Heartbeat'e `event_cursor`; sunucuda sınır/tür denetimi ve mevcut ACK mantığı |
| Gelen reconnect/live geçmişinin tekrar tüketilmesi, sınırsız client geçmişi | Eski saldırı efektlerinin yeniden oynatılması ve bellek büyümesi | Sayfa ve olay başına monoton cursor ile tekrar eleme; tanısal geçmiş son 256 olay |
| Ağ toparlanınca bütün eski efektlerin aynı anda sunulması | Efekt patlaması ve ek ana-thread yükü | Son snapshot'a göre 1.200 ms'den eski FX elenir, bekleyen FX en fazla 80; en güncel snapshot kazanır |

Olay cursor'u global olay dizisinin indeksidir. Görünürlük filtresi korunur;
özel olaylar açılmaz, görünür cursor'larda boşluk olabilir. Mevcut V1 protokolüne
alan eklenmiştir; eski istemciler alanı yok sayabilir. Bireysel cursor'u olmayan
eski sunucu sayfaları yalnız ilerleyen sayfa cursor'u ile tüketilir; eski sunucuda
kısmen örtüşen sayfaları olay başına tam ayırma garantisi yoktur. Tam düzeltme yeni
istemci ve sunucu birlikte kullanıldığında sağlanır.

FX kısma oyun sonucunu değiştirmez: komut/snapshot/terminal sonuç taşıyıcıda
işlenir. Yok edilme kayıtları efekt elemesinden **önce** saklanır; yok olmuş
modül eski snapshot ile geri gösterilmez. Uyarı, reddedilen komut, terk ve
uzatma bilgileri yaş elemesine sokulmaz. Gecikmiş reconnect snapshot'ı geri
almaz; aynı yanıttaki yeni olaylar yine tüketilir. Heartbeat ACK ve boş,
tekrarlanmış olay sayfaları savaş render'ı başlatmaz.

## 3–2–1 başlangıcı

- Sunucu `PvPSessionService(countdown_seconds=3.0)` ile tek başlangıç tarihi
  tutar. Hazır olma/start idempotenttir; reconnect tarihi uzatmaz.
- Üç saniyede motor, yapay zekâ, enerji yenilenmesi ve savaş saati ilerlemez.
  Sunucu erken oyun komutunu reddeder; terk etme hâlâ mümkündür.
- Snapshot/lobi `countdown_remaining_ms` alanı yayınlar. İstemci büyük,
  merkezde, oyunun `--gs-corelight-gold` renginde 3, 2, 1 gösterir.
- Kart yerleştirme ve çekirdek gücü geri sayım sırasında kapalıdır. Ortadan
  reconnect olan maçta geri sayım tekrar açılmaz. Efekt animasyonu eklenmedi.
- Gösterim snapshot'ın ulaşma anından hesaplanır; ağ gecikmesi varsa ekranlar
  tam milisaniye eşzamanlı kabul edilmez. Yetkili başlangıç sunucudadır.
- Servisin varsayılanı 0 saniyedir; bağımsız motor testleri mevcut sözleşmeyi
  korur, uygulama giriş noktası 3 saniyeyi açıkça etkinleştirir.

## Doğrulama

| Koşu | Sonuç | Kapsam / sınır |
| --- | --- | --- |
| Tam istemci Node testleri | 252 başarılı | Reconnect/live 5.000 olay örtüşmesi, sınırlandırılmış render/FX, eski snapshot, geri sayım ve mevcut istemci davranışları |
| Tam sunucu pytest | 1.294 başarılı, 39 atlandı | Geri sayım, cursor/ACK, mevcut savaş, güvenlik, ilerleme, tutorial ve sonuç testleri; ortam gerektiren skip'ler başarılı sayılmadı |
| İstemci build testleri | 9 başarılı | Kaynak paketleme ve production build korumaları; APK/AAB üretimi değildir |
| İki istemcili Playwright | 6 başarılı | Desktop Chrome + Pixel 7 Chrome öykünmesinde üç senaryo: gerçek arkadaş arayüzü, normal PvP sonucu, reconnect ve yeni rematch |
| Görsel kontrol | Desktop ve Android öykünmesi | Büyük altın geri sayım görüntüleri incelendi |

Gerçek arkadaş arayüzü testinde normal kimlik doğrulama/setup/ready yolu,
iki bağımsız istemci, 3/2/1 görünürlüğü, sıfır motor zamanı, komut kilidi,
gerçek socket kesilmesi, imleç tekilliği, <=256 geçmiş, yeniden başlayan
geri sayım olmaması ve iki sonuç paneli doğrulandı. Üretimde kaldırılan test
API'si mevcut akışı çağırır; snapshot/oyuncu/saat enjekte etmez. Diğer iki test
taşıyıcı seviyesindedir, arayüz doğrulaması diye sayılmadı.

Test fixture kimlikleri gerçek misafir kimliği biçimine (`wt-`) düzeltildi;
önceki fixture, uygulamanın farklı hesap üretmesine ve yapay bir WS403'e neden
oluyordu. Üretim kimlik doğrulaması gevşetilmedi. Mevcut reconnect testi artık
başlangıç enerji miktarını değil **geri sayım bitişi + çalışan motoru** bekler.

## Henüz kanıtlanmayanlar / sonraki kontrol

- Telefon üzerinde uzun, yoğun bir insan-insan maçı henüz ölçülmedi.
  Öykünme ve kısa işlev testi gerçek Android cihazı/FPS garantisi değildir.
- İlk 8 Ekim koşusunda broadcast gönderimi hâlâ bekleniyordu. 9 Ekim devam
  incelemesinde motoru ağ gönderiminden ayıran, bağlantı başına tek ve sınırlı
  writer eklendi; 2 saniyelik timeout yalnız o bağlantıyı kapatır. O canlı
  maçta bu gecikmenin yaşandığına dair kayıt yoktur. Güncel ölçüm/testler:
  [BATTLE_CODE_AUDIT_20261008.md](BATTLE_CODE_AUDIT_20261008.md).
- Snapshot üretimi/JSON, ağ gecikmesi, cihaz GPU/ana thread ve uzun maçın
  efekt yoğunluğu ayrıca ölçülmelidir. Eski olayları atmak mevcut cihazda
  bütün donma kaynaklarının çözüldüğü anlamına gelmez.
- Yeni paket/dağıtım için kullanıcıdan ayrı talep, temiz kaynak/CI kapısı ve
  mevcut oyuncu verisini silmeden gerçek cihaz tekrar testi gerekir.

Modül incelemesi: [MODULE_REVIEW_20261008.md](MODULE_REVIEW_20261008.md).

