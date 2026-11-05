# 2.3.0’da önceden Sistem mesajı — 2.4.0 geçişi ve S1

5 Kasım 2026 kullanıcı kararı: AAB değiştirmeden mevcut 2.3.0’da Sistem mesajı.
Bu ön kampanya `delivery=system_mail` kullanır. 2.4.0 kurulduğunda bakım haberi
ayrıca popup olarak açılmaz; **ayrı kimlikli turnuva penceresi** açılır. Gelecek sürümlerin popup + Sistem standardı ve
hesaba bağlı onay motoru korunur; yeni taslaklar bu standardı kullanır.

## Oyuncuya söylenen takvim

- **23 Kasım 2026 22.00 → 24 Kasım 2026 00.00 TR:** 2.4.0 sunucu geçişi;
  yaklaşık iki saatlik bakım planı. UTC karşılığı 23 Kasım 19.00–21.00.
  Bakım sırasında bağlantının kesilebileceği TR/EN metinde yazılıdır.
- **30 Kasım 2026, 03.00 TR / 00.00 UTC:** S1 ve ilk haftalık turnuva hedef başlangıcı.
- Takım turnuvası yeterli katılım ve ayrı hazırlık tamamlanınca açılır;
  kişisel sezonla aynı tarihte açılacağı vaat edilmez.

TR/EN içerik `server/data/release_announcements_v1.json` içindedir.
Sunucu geçişi tarihi hedef sürüm takvimiyle, ilk hafta başlangıcı sezonla
doğrulanır. Sürüm notuna yapılmış bir 2.4.0 güncellemesi eklenmez.

## Küçük 2.3.0 sunucu paketi

```text
python tools/prepare_legacy_announcement.py --output qa_reports/legacy-230-announcement-handoff
python tools/verify_legacy_announcement.py --browser --output qa_reports/legacy-230-handoff-proof
```

Komutlar canlı dağıtım yapmaz. İlk komut yalnız şu üç dosyayı hazırlayıp
orijinal ve yeni dosya hash’lerini kaydeder:

1. İncelenmiş 2.3.0 `server/app/main.py`: bir import ve mevcut Sistem listesine bir ekleme.
2. `server/app/release_announcements.py`: tarihli duyuru projeksiyonu.
3. `server/data/release_announcements_v1.json`: iki dilli mesaj.

Sürüm, veri şeması, başlangıç ayarı, AAB, mağaza ve diğer S1 kodları bu
pakette değiştirilmez. Eski sunucuya yeni popup endpoint’i veya yeni profil
alanı gerektirilmez. Tarihler yalnız metin/duyuru penceresidir; sezonu açmaz.

Taban `cef09390d01480d0152dabd22bbc60c53a14f9a2`; orijinal main SHA-256:
`a9661fb94981a10b6af2ce11202fb9cb21997c5dd23f06a30d3c5c8359bca6a1`.
Canlı dosya bu hash ile eşleşmiyorsa paket üzerine yazılmaz; gerçek canlı
taban üzerinden aynı küçük değişiklik yeniden hazırlanıp doğrulanır.

## 2.4.0 sunucu/AAB sonrasındaki turnuva penceresi

- Bakım haberi: `preview-2-4-0-season-one`, yalnız Sistem mesajı; bakım başlangıcında süresi dolar.
- Yeni pencere: `preview-2-4-0-tournament-launch`, popup + Sistem; en düşük
  sunucu sürümü 2.4.0. 23 Kasım 22.00’den önce veya hâlâ 2.3.0 sunucusunda
  seçilmez. Kurulu eski 2.3.0 AAB’de pencere motoru olmadığı için yeni istemci de gerekir.
- S1/ilk haftalık turnuvanın 30 Kasım 03.00 başlangıcı ve sezon sonu, haftalık
  kayıt/kupa sıralaması ve gerçek katılım koşulu, ilk haftanın 36/24/18 Lazer +
  Kredi/Akı ödülleri, sonraki kaynak haftaları, ilk 10 kasaları, üç mevcut oyuncu
  çiftinin kazanma yolları ve Topla açılışı anlatılır.
- Takım turnuvasının bu açılışla başlamayacağı ve ayrı tarih gerektirdiği belirtilir.
- Ayrı kimlik sayesinde eski haberi okumak/onaylamak yeni pencerenin onayını
  tüketmez. Tamam hesapta kalıcıdır; offline outbox ve Sistem’den tekrar okuma
  sürer. Bu rehber 2.4 hattında ilk sezon sonuna kadar geçerlidir; 2.5’te açılmaz.
- Üç tarayıcıda TR/EN 320/393 px görsel kabulü yapıldı. Bu görsel test fixture’dır;
  gerçek zaman/sürüm kapısı ve ayrı hesap onayı sunucu testinde doğrulanır.

## Doğrulanan ve açık kalan

Değişmemiş 2.3.0 relay/auth/secure-storage çalıştırılabilirleri ve eski 2.3.0
HTTP API’si birlikte çalıştı: web ve native-origin emülasyonunda mesaj alma,
yetkili bootstrap, okunma/yeniden yükleme geçti. Eski uygulamanın Git’ten
alınmış değiştirilmemiş HTML/JS/CSS arayüzünde Sistem mesajı dört TR/EN boyut
birleşiminde gösterildi; otomatik pencere yoktur. Ortak ikili sanat varlıkları
yerel sunucudan gelir. Bunlar kurulu APK üzerinde fiziksel test değildir.

Kanıt: `qa_reports/legacy-230-handoff-proof/proof.json`; paket manifesti:
`qa_reports/legacy-230-announcement-handoff/manifest.json`. Kanıt sunucusunun
saati yalnız test sürecinde 5 Kasım’a sabitlenir; canlı yayın penceresi atlanmaz.
CI aynı eski istemci/gerçek HTTP kanıtını yeniden üretir.

**Canlıya uygulanmadı.** Kullanıcı paketin ev bilgisayarından gönderilmesini istedi.
Paketin hazır olması oyuncuların mesajı aldığı anlamına gelmez. Evde dağıtımda
önce canlı kaynak hash’i, ardından yedek/geri dönüş ve salt bu üç dosyanın
dağıtımı doğrulanır; kullanıcıların veri ve hesapları korunur.
