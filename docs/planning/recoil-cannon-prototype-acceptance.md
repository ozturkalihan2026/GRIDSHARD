# CARD-01 — Geri Tepme Topu prototip kabulü

17 Kasım 2026 · `codex/develop-2.5.0` · **in_progress**.
Bu kayıt prototip kabulüdür. Aktif25. kart, S2 açılışı veya yayın onayı değildir.
Yayımlanmış S1 dosyaları ve24 modüllük oyun kataloğu aynı kalır.

## Gerçekleştirilen davranış

`server/app/game/recoil_cannon.py` tek matematik ve yetenek kaynağıdır.
Seviye1:4 Akım,240 CAN,50 doğrudan hasar,3000 ms çevrim,16 kendi CAN bedeli.
Seviyeler1–15 için CAN/hasar/bedel aynı1.04 çarpanını bir kez kullanır.
Mevcut nadir eşikleri6/9/12/15 ve oyun içi Devre Kredisi/Akı maliyetleri
korunur. İmza dalı: hasar+%12 veya geri tepme−%25. Seviye15'in16 tam dal
kombinasyonunda CAN416–495, hasar86.58–105.88, bedel21 veya28, çevrim2880
veya3000 ms; Akım4 kalır. Bunlar son denge kararı değildir.

Sunucu atış intent'ini mevcut hedefleme ve hasar yoluna verir. Gerçek atışın
öncesinde kaynak/hedef hâlâ geçerliyse kendi CAN bedeli uygulanır. Kendi
kalkan/zırh/yansımasını çağırmaz; en az1 CAN kalır. Rakip normal yoldan öldürebilir.
Kendi aşınması ayrı `module_recoil` olayıdır; düşmana hasar, imha, V8 Akım,
yansıma veya ikinci saldırı doğurmaz. Geçerli atış Faz tarafından engellense
de bedel vardır. EMP, ölmüş kaynak veya boşa çıkmış hedefte atış/bedel yoktur.
Kaynak zaman damgası aynı adımda ikinci atışı engeller; tam süreç yeniden
başlatma/kalıcılık kabulü henüz tamamlanmış sayılmaz.

İzole tanı aracı geçici kayıt yapabilir; üretim bu aracı import etmez.
Normal API/katalog/deste aday kimliği reddeder. Testte gerçek rastgele yerleşim,
4 Akım bedeli ve hata olduğunda geçici katalog temizliği de doğrulandı.

[Ücretsiz edinim ve kalıcılık kabulü](recoil-cannon-free-acquisition-acceptance.md):
yayınlanmış kayıt + gerçek runtime + bütün kapılar olmadan yeni kart açılmaz.
Gelecekteki onaylı kayıt Arena3/600 zirvede ücretsiz seviye1 ve kalıcı hak
verir; mevcut koleksiyon/ödül/PvP/kalıcılık yolu testte doğrulandı. Üretimde
kayıt planned kalır; aktif24'lük katalog ve ödül havuzu değiştirilmedi.

## Görünüm ve ses

Tek geniş namlu, iri kızak, iki piston; mevcut boyalı kırmızı/çelik/lacivert/
kehribar sanat ailesinde ilk çizim, küçük ikon ve sekiz gerçek yön hazır.
[Sanat üretim kaydı](../../client/assets/ui/module-candidates-v1/README.md)
master, prompt, hash ve önceki başarısız deneme geçmişini içerir. Kullanıcının
ayrıca atlas üretme isteğiyle yerleşik araç sekiz yönü başarıyla üretti;
ayrı kenar temizliği yapıldı.1254×1254 kayıpsız atlas, sekiz512px kare ve
ölçülmüş taban pivotları depoda. Önizleme resim değiştirerek yön gösterir,
düz resmi döndürmez/aynalamaz. Kayıpsız master'dan tekrar üretim birebir aynı
manifesti verdi. Gerçek savaş ankraj/yoğun sahne/cihaz sanat kabulü açıktır.

Özgün atış/piston dönüşü0.44 sn, RMS0.10452/tepe0.23475; ayrı isabet0.19 sn,
RMS0.07964/tepe0.17072.22050 Hz mono16 bit; mevcut bitirme standardı kullanıldı.
[Ses kaydı](../../client/assets/audio/candidates-v1/README.md) ve yanındaki
audit, ölçümler ve SHA256'yı korur. Eski sesler ve müzik tercihleri değişmedi.

`recoil-cannon-presentation.js` önizleme ve gerçek savaşta paylaşılır. Sunucudaki
kendi CAN aşınması ile tek atış/isabet ayrı sunum komutlarıdır. Faz'da atış
görünür, hasarlı isabet gösterilmez;1 CAN tabanında sıfır aşınma için sahte
kayıp gösterilmez. Tekrar/eski/gizli/bitmiş olaylar efekt patlaması oluşturmaz.
Bu katman gerçek oyun ekranına/AudioDirector'a bağlandı; HP veya muhasebe
değiştirmez. Derlenmiş kadroda aday yoksa profil/atlas/cue etkinleşmez;
oynanır katalog24 kalır. [Gerçek savaş kabulü](recoil-cannon-battle-integration.md).

## Tekrarlanabilir denge tanısı

```
python tools/probe_recoil_cannon.py --seeds 1 --output qa_reports/card01-balance.json
```

Gerçek savaş motoru, altılı desteler, normal Akım/rastgele yerleşim/AI/çekirdek
güçleri kullanılır. Aday deste: Geri Tepme Topu, Lazer, Bariyer, Onarım, EMP,
Arındırıcı. Karşılarında başlangıç/delici/kontrol/kale desteleri ve aynı
beşli kabukta Darbe Topu referansı; seviye1/15 ve taraflar değiştirilir.
Her eşleşmede tek seed, toplam20 maç:20 tamamlandı, aday deste10 kazandı;
süre122.7–432.6 sn, medyan329.85 sn. Aday her maçta gerçekten yerleştirildi.
[Tam tanı verisi](recoil-cannon-prototype-balance-v1.json) depoda korunur.

Bu küçük sabit AI örneklemi insan kazanma oranı, tüm çekirdek/yetenek/arena
matrisi veya son denge kabulü değildir. Özellikle onarım/yansıma/yüksek hız
birleşimleri ve eşit parça bütçesiyle insan karşı oyunu açık kalır.

## Kabul kanıtı ve çalıştırma

- Motor: yeni aday + mevcut ana oyun ve V7 etkileşimleri, **72 PASS**.
  Kalkan/Zırh/Bariyer/Kubbe/Tampon/Faz aynı ham vuruşlu eski silahın savunma
  yoluyla karşılaştırılır. EMP,1 CAN, V8, kaynak/hedef ölümü, onarım/yansıma,
  tekrar,15 seviye ve16 yetenek birleşimi kapsanır.
- İstemci: **801 PASS**; aday sunum olay/lifecycle ve yön atlası dosya/pivot
  bütünlüğü kapsanır.
- Build araçları: **15 PASS**. Sunum adaptörleri artık uygulamanın script
  grafiğinde olduğundan geliştirme web kimliği değişir;35d90ac33d14e255 önceki
  kademeye aittir.24'lü pakete aday sanat/ses dosyaları girmez. AAB üretilmedi.
- Önizleme Chrome4 + Android Chrome öykünmesi4 + Safari öykünmesi4 =
  **12 PASS**.320/393 px taşma/görsel yükleme, sekiz yönün gerçek dosyaları,
  dönmeyen taban, motor CAN/karşı oyun verisi, açık düğmeyle ses
  oynatma/durdurma ve azaltılmış hareket doğrulandı.
 320/393 görselleri incelendi. Donanım/duyulabilirlik kabulü değildir.
- İlk Safari koşusunda kayıtlı tarayıcı yolu, ardından file URI medya ve
  sandbox loopback engeli görüldü. Son kabul, yalnız izinli önizleme dosyalarını
  sunan geçici yerel HTTP fixture'ı ve mevcut WebKit yolu ile yapıldı;
  servisler test sonunda kapanır. Gerçek oyun API'si veya dış bağlantı yoktur.
  Art arda iki ses denemesinde görülen Safari beklemesi için önizleme tek
  audio elemanı/nesil koruması ve standart HTTP byte-range desteğine geçirildi;
  son üç tarayıcı koşusu12 PASS. Ana oyunun ses sistemi değiştirilmedi.
- Edinim/yayın/arena/migration/aday motor Windows **94 PASS**. Linux bunlara
  eski ana oyun/V7/S1 açılış-kapanış ve ödül hakları eklenerek **163 PASS /1
  SKIP**; izole PostgreSQL URL'si olmadığından scheduled-closeout rollback
  testi atlandı. Bu sayı72 motor testini de içerir, ayrı toplam değildir.
- Gerçek yeni kart savaş akışı: Chrome/Android/Safari normal+EMP6 PASS,
  Faz+EN3 PASS. Sunucu, websocket, gerçek renderer ve ses çözücüsü kullanıldı.
  Son odaklı motor/edinim/yayın/ana oyun/V7 koşusu95 PASS; önceki sayıların
  üstüne eklenen bağımsız toplam değildir.107 mobil kaynak türevi güncel.
- Odaklı motor koşusu tamamlandı. Tüm `server/tests/game` dizini için ayrı
  koşu sonuç vermeden durduruldu; tam sunucu/uzak CI yeşil iddiası yoktur.

```
python -m pytest server/tests/game/test_recoil_cannon.py server/tests/game/test_main_current_only_v2.py server/tests/game/test_module_effects_v7.py -q
python tools/recoil_cannon_demo.py
pnpm test:client
pnpm test:build
# PowerShell; tam backend başlatmadan yalnız yerel önizleme fixture'ı:
$env:GRIDSHARD_E2E_EXTERNAL_SERVER='1'
pnpm exec playwright test e2e/recoil-cannon.spec.js
```

Görsel ve ses incelemesi:
[Yerel çalışma sayfası](prototypes/recoil-cannon/index.html).
HTML doğrudan açılır; Safari medya kısıtında proje kökünden
`python -m http.server 8878 --bind 127.0.0.1` ile sunulup
`http://127.0.0.1:8878/docs/planning/prototypes/recoil-cannon/` açılabilir.
Bu komut deploy değildir; inceleme bitince Ctrl+C ile kapatılır.

## Sıradaki teslim ve açık yayın kapıları

1. Atlas/namlu/renderer bağlantısı hazır; ortak sanat, yoğun savaş ve fiziksel
   cihaz okunurluk kabulü sürüyor.
2. Gerçek savaş mermi/VFX/AudioDirector, EMP/reduced-motion ve TR/EN kendi CAN
   etiketi hazır; yoğun savaş ve tam kart/yetenek/kilit ekran kabulü sürüyor.
3. Talant/çekirdek/onarım ve ücretsiz parça bütçesiyle geniş denge; fiziksel
   Android'de müzik üstünde duyulabilirlik ve insan karşı oyun kabulü.
4. Arena3/600 zirve kalıcı ücretsiz edinim altyapısı test edildi; yayın
   kapılarının ardından gerçek katalog/TR/EN ekran ve dönem edinim kabulü.
   Henüz aktive edilmedi.
5. Katalog/atlas/ücretsiz edinim/restart ve Android/CI birlikte kabul edilince
   planlı kayıt yükseltilecek. Aday kendi kendine25. kart veya S2 ödülü olmaz.

2.5.0 kaydında CARD-01 tamamlanmadı;11 açık madde sayısı değişmez.
Kaynak/paket sürümü2.4.0 kalır; main, canlı sunucu ve AAB değişmedi.
