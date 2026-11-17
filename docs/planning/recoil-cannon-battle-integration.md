# CARD-01 — gerçek savaş sunum bağlantısı

17 Kasım 2026 · `codex/develop-2.5.0` · dalda hazırlanmış bağlantı.
CARD-01 bütünü **in_progress**;25. kart ve S2 açılmadı.

## Oyuncuya görünen davranış

Geri Tepme Topu mevcut gerçek savaş renderer/motion/VFX/AudioDirector yoluna
bağlandı. Tek metal mermi, kısa mekanik kızak geri hareketi ve hedefte ayrı
isabet kullanır. Kaidenin alt parçası sabittir; üst gövde aynı resmin iki
örtüşen kırpma katmanıyla hareket eder. Yeni bir bitmap boyanmaz, resim
zemin düzlemine yatırılmaz veya ekranda döndürülmez.

Sekiz yönün her biri kendi namlu çıkışını kullanır. Önce taban pivotu ve
genişliği hizalanır; sonra yönlerin birleşik opak sınırı mevcut diğer
modüller gibi çekirdek referansının %85'ine eşlenir. Mevcut düzlem/billboard
projeksiyonu mermiyi seçili namludan çıkarır. Yön değişirken DOM düğümü
oluşturulmaz. Normal aim/motion, saldırı
hedefi ve mermi sahibi mevcut savaş akışıdır; yerleşim/hedef sırası değişmez.

Kendi aşınması kaynakta ayrı amber `−16 CAN` / `−16 HP` yazısıdır; kendi
kayıp rakip hasarı gibi kırmızı vuruş veya kendi isabet parlaması üretmez.
Sunucu HP'si değiştirilmez. EMP olaysız çevrimde atış/bedel/ses üretmez.
Faz hasarı sıfırladığında atış/kendi bedeli devam eder; hasarlı metal isabet
sesi çalmaz, mevcut savunma telegraph'ı korunur. Tekrar/eski/gizli/bitmiş
olaylar yeniden aşınma yazısı üretmez; sahne temizliği dedupe geçmişini
silmez, yeni maç kimliği doğal olarak sıfırlar.

## Yayın kapısı ve paket

Kanonik istemci kart verisi artwork ve audio profilinden önce yüklenir.
`recoil-cannon-art-data.js` ve ses profili, yalnız derlenmiş
`GRIDSHARD_CANON_MODULES` içinde gerçek kimlik varsa kayıt ekler. Bugünkü
derlenmiş24 kartlık liste bu kimliği içermez; normal istemcide art/cue/oynanır
kart eklenmez. Sunucunun yayın+runtime+ücretsiz edinim kapıları ayrıca korunur.

Build collector aynı derlenmiş listeyi kullanır.24'lü pakete sekiz aday
WebP, iki WAV veya dört OGG/AAC girmez. Onaylı25'li paket için sekiz resim ve
iki sesin iki codec ailesi birlikte dahil edilir; atlas/master/PNG paketlenmez.
İnaktif yolların da ad/uzantı güvenlik doğrulaması yapılır. Codec listesinde
107 kaynak vardır; eski105 hash değişmedi. Gerçek savaş sesleri mevcut üç
rutin ses sınırı, mute, uygulama yaşam döngüsü ve müzik miksini kullanır;
yeni ses kanalı veya daha yüksek ana ses seviyesi açılmadı.

Bu bağlantı yerel geliştirme paketinin içerik kimliğini değiştirir; önceki
`35d90ac33d14e255` artık son geliştirme derlemesi olarak gösterilmemelidir.
Yayımlanmış2.4.0/AAB ve dondurulmuş S1 kaynakları değiştirilmedi. Kaynak sürüm
etiketi2.4.0/code15 kalır; yeni AAB/dağıtım veya main merge yapılmadı.

## Gerçek akışla kabul

`tools/recoil_cannon_browser_fixture.py` yalnız açıkça seçilen, izole
loopback E2E sürecinde çalışır. Üretim import etmez. Runtime/arena/katalog
belleğe test için eklenir; tamamlanmış yayın belgesi bir kopyadır, kaynak
JSON'ları/aktif sezon değiştirilmez. İstemcide eşleşen kanonik liste yalnız
route yanıtında değiştirilir. Gerçek profil, matchmaking, websocket, setup,
deploy, motor, renderer ve ses çözücüsü kullanılır. Kontrollü rakip sabit
hedef sağlar; gerçek para, reklam, dış hesap veya canlı sunucu yoktur.

- Chrome/Android/Safari öykünmelerinde normal atış+iki gerçek ses ve EMP/
  reduced-motion **6 PASS**;3 profil×2 senaryo.320/393 px kullanıldı.
- Aynı üç profilde Faz+İngilizce kendi HP kaybı+hasarlı isabet sesi olmaması
  **3 PASS**. Toplam9 yeni gerçek savaş kabulü; önceki12 standalone önizleme
  testi ayrı kapsamdadır, aynı testler gibi toplanmaz.
- İstemci **801 PASS**: üç yeni entegrasyon testi24'lük kayıt kapısını,
  sekiz gerçek renderer yön/namlu/pivotunu ve web/native varlık/codec kapısını
  doğrular. Standart paketleme testleri **15 PASS**.
- Son odaklı motor+edinim/yayın/eski ana oyun+V7 **95 PASS**; önceki Linux
  S1/kalıcılık koşusu163 PASS/1 PG SKIP ayrıca kaydedilmiştir. Kaynak sesler
  ve107 mobil türev için `encode_mobile_audio.py --check` geçti.

```
# Yalnız yerel, atılabilir sunucu ve eşleşen hazırlanmış kart testi:
$env:GRIDSHARD_E2E_RECOIL_CANNON='1'
pnpm exec playwright test e2e/recoil-cannon-battle.spec.js
```

Yeni kart kapalı normal24'lü sunucu için bu değişken kaldırılır. Ayrı
`battle-platform` / `battle-audio` regresyonları mevcut savaş geometrisi,
dock/ses ayarları ve eski codec/voice-limit davranışını doğrular.

Normal24'lü Chrome koşusunda ses ayarları ve eski saldırı/çekirdek codec/
voice-limit testleri2 PASS; platform geometrisi ayrı son koşuda1 PASS.
Platform kabulü dört ekran boyutunu,24 modül×30 yuva=720 yerleşimi,30 CAN
göstergesinin yoğun sahnede okunurluğunu ve çerçeve/katman sırasını kapsar.

Bu kontrol eski testin eksik `previewCoreActivation` kancasını ortaya
çıkardı; yalnız geliştirmede aynı gerçek sunum handler'ına giden görsel
kanca geri eklendi, paket build'inde çıkarılır.36 modül/58 sayaç varsayımı
mevcut24 modül/30 CAN göstergesiyle eşlendi; gerçek tüm kadro kümesi de
karşılaştırılır. Sıkı yerleşim/örtüşme kontrolleri kaldırılmadı.

Ayrıca mevcut modüllerde emekli ısı göstergesi için ayrılan5px boşluk bulundu:
ilk320px ölçümünde CAN çubuğuna uzaklık5.61px idi. Isı göstergesi yok/gizliyse
resim alt boşluğu13 yerine8px olur; gerçek iki sayaçlı düzende13px korunur.
Son dört boyut ölçümünde taban–gösterge aralığı0.5–2px kabulünü sağlar.

## Açık kalan teslim

Yoğun savaşta sanat/efekt bütçesi, geniş çekirdek/yetenek/onarım denge matrisi,
insan karşı oyun ve fiziksel Android'de ses/okunurluk kabulü sürüyor. Gerçek
roster/ücretsiz dönem kaydı ancak bu kabullerle yükseltilecek. Son imzalı
paket, eski istemci ve yayın kontrolleri tamamlanmadan CARD-01 branch_ready
veya yayınlandı sayılmaz. S1 kapanış+ödül kabulü ve S2 ayrı onayı korunur.
