# 2.3.0 bakım ön duyurusu — canlı dağıtım kaydı

5 Kasım 2026, ev bilgisayarı. Son dış sağlık kontrolü **18.39 Türkiye saati**.
Mevcut 2.3.0 uygulamasının **Mesaj Kutusu → Sistem** bölümüne bakım ön haberi
dağıtıldı. Yeni AAB, otomatik pencere veya sezon açılışı yapılmadı.

## Dağıtılan kapsam

- `preview-2-4-0-season-one`, yalnız `system_mail` kanalında görünür.
- Metin: **23 Kasım 22.00 → 24 Kasım 00.00 TR**, yaklaşık iki saatlik 2.4.0
  sunucu geçişi hedefi; S1 ve ilk haftalık turnuva **30 Kasım 03.00 TR**.
- Ayrı `preview-2-4-0-tournament-launch` kampanyası henüz görünmez. Bu pencere
  2.4.0 sunucusu ve yeni istemciyle kendi tarih/sürüm kapısından sonra açılır.
- Çalışan 2.3.0 imajı taban alındı; bütün uygulama/istemci ağaçlarının hash
  karşılaştırmasında yalnız şu üç dosyanın değiştiği doğrulandı:
  `server/app/main.py`, `server/app/release_announcements.py`,
  `server/data/release_announcements_v1.json`.
- Tam 2.4.0/S1 geliştirme kodu, migration, istemci, sezon başlangıç ayarı ve
  kozmetik yayını bu imaja alınmadı. PostgreSQL/Redis/Caddy kapsayıcıları aynı kaldı.

## Gerçek canlı taban ve izlenebilirlik

İncelenmiş 2.3.0 tabanı `cef09390d01480d0152dabd22bbc60c53a14f9a2`.
Duyuru kaynağı `c720f22108b3b8e79ae74faed4ab1cc64d1f465c`;
[main CI bütün işleri başarılı](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/42026459650).
Bu yeni commit bütünüyle dağıtılmadı; yalnız üç dosyalık yama alındı.

Canlı `main.py` hash'i ilk hazırlıktaki LF kaynak hash'inden farklıydı.
Dosya içeriği karşılaştırıldığında **tek farkın CRLF satır sonları** olduğu
kanıtlandı. Canlı dosyanın satır sonları korunarak yalnız bir import ve Sistem
listesine bir ekleme yapıldı; eski sunucu/istemci ispatı bu gerçek tabanla tekrar geçti.

| Dosya | SHA-256 |
| --- | --- |
| Canlı eski `main.py` | `974564e7ac1326ce467e6a1508485d54ac375d4904f2e56644d400ee6e99bfaa` |
| Dağıtılan `main.py` | `21a436eeb21d8f4451812c2c9d29fdbe9e3ed1077d4616b2d4772bf1bcf47a99` |
| Duyuru modülü | `dd06e55c824c43d31552737c23cc6085efdcff6111d69f98027aabfe2414dd13` |
| Duyuru kataloğu | `65f1310ce2b0c975ed6cfabb51da6504af127d53b48d0dd88594804c3093b46e` |

Yeni imaj: `gridshard-production:2.3.0-mail-20261105`,
`sha256:060346eabfb7c05919a0ae6cbdbdb98fb785f7a0aff8fe6dec2b1c741f05ba39`.
Önceki imaj ayrıca geri dönüş etiketiyle korundu. Sürüm etiketi 2.3.0,
eski istemci sağlık alias'ı 2.2.1, PvP protokolü 2 olarak kaldı.

## Yedek, veri koruma ve sonuç

- Aktif savaş, WebSocket ve bekleyen sonuç bulunmadığı iki kez doğrulandı.
- Yalnız API durduruldu. Tutarlı veritabanı ve runtime yedeği alındı;
  boş ve izole PostgreSQL'e gerçek geri yükleme yapıldı. Bütün tablo içerikleri
  durdurulmuş canlı tabanla birebir eşleşti.
- API açıldıktan sonra 55 mevcut profil ve kimlik/satın alma/ekonomi/savaş/
  takım/arkadaşlık tabloları, geçiş öncesi hash ve sayılarıyla eşleşti.
  Ortam, secret bağları, kalıcı birimler ve güvenlik seçenekleri korundu.
- API durdurma, yedek/restore ve yeni imaj açılışı toplam **22,4 saniye** sürdü.
  Son kapsayıcı kontrolü healthy, restart sayısı sıfır; izole prova kapsayıcısı,
  ağı ve birimi kaldırıldı. Canlı veritabanına geri yükleme yapılmadı.
- Son HTTPS `/health` 200: 2.3.0, PostgreSQL ve Redis hazır, aktif savaş sıfır.

Yedek: `/var/backups/gridshard-production/20261105-before-legacy-mail-c720f22`.
Sunucu operasyon kaydı: `/opt/gridshard/operations/legacy-mail-20261105-c720f22`.
Yedekler kişisel veri içerir ve sunucuda korundu; depoya veya yerel pakete alınmadı.
Geri dönüş, aynı şemadaki önceki **kod/imaj** ile yapılır; güncel oyuncu verisinin
üzerine eski yedek yazılmaz. Yeni imajdan bir sonraki operasyonda önce mevcut
Compose dosyaları ve imaj etiketi tekrar keşfedilmelidir.

## Oyuncuya görünen kabul ve sınırlar

- Canlı HTTPS'te yalnız bir yeni, bu operasyona ait konuk test hesabı oluşturuldu.
  Normal auth/bootstrap, gerçek Sistem mesajı, Türkçe bakım saati, mesajı okuma
  ve yeniden açılışta okundu durumunun kalması geçti. Mevcut oyuncu hesabı kullanılmadı;
  satın alma, reklam, savaş veya elle ödül toplama başlatılmadı.
- Canlı görsellerde varsayılan Türkçe mesaj ve İngilizce mesaj gözlendi. Açık eski
  kartta doğrudan i18n API çağrısıyla dil değiştirilen bütün görseller kabul sayılmadı.
- Tam **TR/EN × 320/393** kontrolü, gerçek Ayarlar dil seçimi ve kutuyu yeniden
  açma akışıyla **yerelde** tekrarlandı. Aynı dağıtılan dosya hash'leri, değiştirilmemiş
  2.3.0 arayüzü ve gerçek eski API ile başlık/gövde dili, taşmama ve okunma geçti.
  Bu dört yerel birleşim canlı veya fiziksel Android testi olarak raporlanmaz.
- İkinci canlı hesap talebi otomatik onay denetimince ek üretim verisi oluşturduğu
  gerekçesiyle reddedildi; uygulanmadı. Daha düşük riskli yerel kabul kullanıldı.
- Dağıtım ve kapsayıcı son kontrolleri tamamlandıktan sonraki isteğe bağlı ek SSH
  kontrolü zaman aşımına uğradı. Son dış HTTPS kontrolü başarılıdır; sonraki sunucu
  işleminde SSH erişimi yeniden sınanmalıdır. Mevcut SSH anahtarı ve önceki üretim
  operasyonundan kayıtlı host anahtarı kullanıldı; host doğrulaması kapatılmadı.

Yerel kanıt kökü `qa_reports/` (Git ile taşınmaz):

- `legacy-230-home-live-base-payload-20261105/manifest.json`
- `legacy-230-home-live-base-proof-20261105/proof.json`
- `legacy-230-home-local-reviewed-proof-20261105/proof.json`
- `legacy-230-home-deployment-20261105.json`
- `legacy-230-home-final-health-20261105.json`
- `legacy-230-home-public-20261105/proof.json`
- `legacy-230-home-public-20261105/production-system-tr-320.png`
- `legacy-230-home-final-public-health-20261105.json`

2.4.0/S1 fiziksel cihaz, ses dinleme ve genel yayın kapıları açık kalır.
Bu operasyon gelecekteki sürüm geçişinin kendisini yapmış sayılmaz.
