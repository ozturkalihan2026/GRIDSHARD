# Ödül, maliyet ve menü düzeltmeleri — 25 Ekim 2026

## Günlük giriş dengesi

Eski ortak3× parça çarpanı giriş takviminden kaldırıldı. Normal günlerin
yaygın kart tabanı3–7 parça; Pazar büyük ödülleri21,28,35,42 parça.
Enderliğe göre miktar azaltma ve açık modül seçme kuralı sürer. Sezon yolu
bu istekte değiştirilmedi; çarpanın adı artık `SEASON_MODULE_SHARD_SCALE`
olduğundan günlük girişte yeniden yanlışlıkla kullanılmaz.

Alınmış ödüller geri kesilmez. Eski126 parçalık makbuz, geçmişte alınan
değeri gösterir ve tekrar istendiğinde yeniden parça vermez. Yeni/alınmamış
giriş ödülleri yeni miktarı kullanır. Yerel kullanıcı veri dosyası düzenlenmedi.

## Seviye ve yetenek maliyet denetimi

12 Ekim onaylı seviye tabloları korunur (`OYUN_DUZENLEMELERI_PLANI.md`, D9).
Modüllerde enderlik tabanlı Devre Kredisi/parça, efsanevide ilerleyen seviyelerde
Akı; çekirdeklerde1→2 için50 Akı/1 parça,14→15 için700 Akı/22 parça.
Çekirdeğin15. seviyeye toplamı5250 Akı ve109 parçadır.

Yetenekler ayrı,23 Ekim istenen yüksek maliyet tablosundadır. Çekirdeklerin
üç yeteneği modül tablosunun2,3,4. eşiklerini kullanır. Epik son eşik
16.000 DK+400 Akı olarak korunur. Gösterilen bedel ile sunucunun düşürdüğü
bedel arasında fark bulunmadı; bu istek adına yeni bir seviye fiyatı uydurulmadı.

Yeni ekonomik regresyon her enderlikten modülün14 yükseltmesini ve yedi
çekirdeğin tüm14 yükseltmesini gerçekten satın alır; cüzdan/parça farkı,
istek tekrarı ve azami seviye kontrol edilir. Eski makbuz korunması ve
günlük takvim üst sınırları da doğrulanır.

## İstemci düzeltmeleri

- Çekirdek ve modül listelerinin çizim önbelleği, ilgili cüzdan bakiyelerini
  de içerir. Sadece Akı/DK değişince eski yeşil ok durumu tutulmaz.
- Kartlar ekranındaki Modüller/Çekirdek sekmeleri seviye veya yetenek
  yükseltmesi için aynı gerçek uygunluk kuralıyla ok gösterir. Sabit ok
  düğümü aynı durumda tekrar yaratılmaz. İade açığı olan özel parça ve
  negatif eski genel parça uygunluğu sunucu kurallarıyla eşleşir.
- Günlük giriş sayfası bugünün ödülünü, sezon sayfası ilk alınabilir ödülü
  (yoksa en son açılan kademeyi) görünür yapar. Profil yanıtı/çizimi beklenir;
  yalnız açılan sayfanın kaydırıcısı değiştirilir. Sonradan gelen her ödül
  veya render olayı sayfayı tekrar zıplatmaz; gecikmiş gezinme iptal edilir.
- Lider panosu her açılışta Kupa/Genel'e döner. Çekirdek sıralaması
  mevcut Rezonans fiziksel çekirdek resmiyle gösterilir.
- Mesaj kutusu kapatma tuşu bilgi kartıyla aynı ortak36px kırmızı stilini
  kullanır; eski ikon eylemi pseudo zeminleri görünmez.
- Savaş Çekirdeği ve Çekirdekler başlıklarının sol sarı çizgisi kaldırıldı.
- Arkadaşlar sayfasındaki0/100 başlık sayacı ve onu güncelleyen kod kaldırıldı;
  başlık ortalandı. Sunucudaki arkadaş limiti bu görünüm değişikliğinden bağımsızdır.

## Doğrulama

- İstemci:734/734 geçti.
- İlgili sunucu, iade, seviye, yetenek ve ödül testleri:236/236 geçti.
- Paketleme:10/10 geçti.
- Yeni ödül/menü akışı: Chromium, Android Chrome ve iPhone WebKit
  emülasyonunda3/3 geçti. İki cüzdan değişimiyle aynı çekirdek verisi altında
  seviye/yetenek okları, kaydırma, kapatma stillerinin eşitliği, başlıklar ve
  lider panosunun tekrar açılışı denetlendi. Bu fonksiyon testidir, FPS ölçümü değildir.

Günlük/sezon görselleri sadece test yanıtlarından türetilmiş26. gün ve18.
kademe senaryolarıdır; gerçek oyuncu kayıtlarına ödül yazılmaz.
Kanıt: `artifacts/progression-ui-20261025/`.
Sunucu dağıtımı, AAB, commit ve push bu turda yapılmadı.
