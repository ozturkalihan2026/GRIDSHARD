# COMPAT-01 — 2.4.0 istemci/API uyumluluğu

4 Kasım 2026. Yerel yazılım kabulü tamamlandı; CI sonucu son doğrulama
kaydına ayrıca yazılır. Bu belge 2.4.0 yayını veya fiziksel Android kabulü değildir.

## Uygulanan sözleşme

| Sağlık alanı | Anlamı |
| --- | --- |
| `version=2.1.0-beta.72` | Eski v8 istemcisinin tel uyumluluğu |
| `release_version=2.2.1` | Kurulu 2.2.1 istemcisinin değişmeyen karşılaştırması |
| `server_release_version=2.3.0` | Kurulu 2.3.0 istemcisinin değişmeyen karşılaştırması |
| `runtime_release_version` | Gerçek sunucu derlemesi; operatörün esas alacağı alan |
| `client_compatibility` | Şema/API nesli, minimum ve desteklenen istemci sürümleri/sürüm hatları, gerekli yetenekler |

Şema ve API sözleşmesi 1, minimum istemci 2.2.1; incelenmiş hatlar 2.2/2.3/2.4.
PATCH sürümleri aynı incelenmiş hatta kalabilir; minimumun altına inemez.
Sunucu kendi derlemesini de açık destek listesine ekler. Bilinmeyen yeni minor
istemci aynı sözleşmeye kendiliğinden kabul edilmez. `game.v1` ve `profile.v1`
temel yeteneklerdir; sezon stoğu, emir ve kasa açılışı ek API yetenekleridir.
API desteği, S1 profilinin veya sezon başlangıcının açıldığı anlamına gelmez.

Yeni istemci gerçek sürümü önceler. Yeni sözleşme eksik/geçersizse eski alanlara
düşerek açılmaz. Yeni alanı bulunmayan gerçek eski API yalnız incelenmiş
2.2.1/2.3.0 köprüsüyle açılır. PvP protokolü ve kalıcılık hazır olma koşulları
sürüm kabulünden bağımsızdır. Sağlık yanıtı önbelleğe alınmaz (`no-store`).

Eski kurulu istemciler yeni minimum alanını bilmez. Minimumu artırmak tek başına
onları zorunlu güncellemeye yönlendiren güvenlik kontrolü değildir; bu iki eski
API'nin desteğini kaldırma ayrı yayın kararıdır. 2.4.0'da destek sürmektedir.

## Değiştirilmemiş kaynakların kökeni

| Kurulu istemci | Yayın kaynağı | Özgün relay JS SHA-256 |
| --- | --- | --- |
| 2.2.1 | `4866e58a179d320b9b997d77798faabe4c4f99cf` | `328db71de7e0d65d9159076fe1de76c765249a5b3dd491354e40330cca6c65de` |
| 2.3.0 | `cef09390d01480d0152dabd22bbc60c53a14f9a2` | `4d44ef5d82fbbde2691450df08a85263fa5829aeeee48aed149181b916adde62` |

İki tam özgün yürütülebilir dosya aktif regresyon girdisi olarak
`client/tests/fixtures/installed/` altında tutulur; SHA-256 her çalışmada
doğrulanır. Değiştirilmiş bir boot taklidi kullanılmaz. Üretim web/native
derlemesi test dosyalarını paketlemez. Gerçek HTTP denemesi eski auth/secure-store
ve sunucu kodunu da aynı Git commit'inden çıkarır. Windows satır sonu dönüşümü
kapatılır; eski JS baytları kaynakla eşleşmek zorundadır.

## Gerçek HTTP kabul matrisi

Her satır hem web origin hem native-origin emülasyonunda çalıştı:

| İstemci | API | Sağlık → auth → bootstrap → tekrar yükleme → yetkili takım profili |
| --- | --- | --- |
| Özgün 2.2.1 | Yeni geliştirme API'si | Geçti |
| Özgün 2.3.0 | Yeni geliştirme API'si | Geçti |
| Yeni istemci kodu, beklenen sürüm 2.4.0 | Yeni geliştirme API'si | Geçti |
| Yeni istemci kodu, beklenen sürüm 2.4.0 | Gerçek 2.2.1 API kodu | Geçti |
| Yeni istemci kodu, beklenen sürüm 2.4.0 | Gerçek 2.3.0 API kodu | Geçti |

Toplam **10** senaryo. Sunucular yalnız `127.0.0.1` üzerinde ve ayrı geçici
JSON/kimlik depolarıyla çalıştı. Normal konuk auth ve Bearer kontrollü
bootstrap/takım isteği gerçek HTTP'dir; API yanıtları fixture ile değiştirilmedi.
Native dalında `https://localhost` origin ve API adresine yönlendirme denendi;
SecureStorage eklentisi bellekte emüle edildi. Bu gerçek Android TLS/CORS,
Keystore veya mağazadan yükseltme kanıtı değildir.

**Sürüm etiketi ayrımı:** paket etiketleri henüz 2.3.0/code14'tür. Gelecek
2.4.0 karşılaştırmasını test etmek için izole yeni API'nin yalnız sağlık derleme
kimliği 2.4.0 olarak simüle edildi; gerçek güncel handler'lar çalıştı. Yeni
istemcinin beklediği 2.4.0 değeri de ayrı test parametresidir. Hazır 2.4.0 AAB
varmış gibi gösterilmez. Gerçek eski API kimlikleri değiştirilmedi.

## Tarayıcı ve hata kabulü

- Yeni arayüz gerçek 2.2.1, 2.3.0 ve geliştirme API'sinde Chrome'da normal
  konuk/ana ekran açılışını tamamladı: üç akış, sıfır JS/eksik varlık hatası.
- 320×568 ve 393×852: gelecek gerçek sürüm alanıyla açılış; minimum sürüm
  engeli; TR/EN güncelleme açıklaması ve mevcut storage işaretinin korunması;
  503 sonrasında yeniden deneme: **altı tarayıcı testi geçti**.
- Yanlış protokol/degraded yanıt eski ve yeni istemcilerde reddedildi.
  Eksik sözleşme, desteklenmeyen API nesli/istemci ve eksik yetenek açılışı geçemez.
- Minimum sürüm açıklaması Google Play güncellemesini ister; ilerlemeyi silmez.
  OTA kurucu veya uygulamayı kaldırma akışı eklenmedi.
- Yeni kasa protokolünü reddeden eski API'de `stock-v1` isteği anında/rastgele
  açılışa düşmez. Oyuncuya yerel Python/sunucu yeniden başlatma talimatı verilmez;
  geçici sunucu güncellemesi açıklaması gösterilir.

## Tekrar üretim ve sonuç kaydı

```powershell
node --test client/tests/client-compatibility.test.js
python -m pytest server/tests/test_client_compatibility.py
python tools/verify_client_compatibility.py --output qa_reports/client-compatibility
```

`--browser` yerel Chrome ile üç gerçek UI açılışı da ekler. Çıktı klasörü yeni
olmalıdır; eski sonucu üzerine yazmaz. Git geçmişi sığsa `--fetch-missing`
yalnız sabitlenmiş iki commit'i origin'den getirir. CI bu komutu otomatik
çalıştırır; yalnız özet proof JSON'u saklar, profil/sır veya özel log yüklemez.

Yerel kanıt kökü: `artifacts/compat-240-20261104/`; gerçek HTTP/UI kanıtı
`http-proof-r3/proof.json`; commit sonrası son HTTP kanıtı ayrıca son doğrulama
kaydında belirtilir. İlk altı mobil senaryo `mobile.log`, ek saklı kimlik
kontrolünün iki telefon sonucu `update-ui-final.log` / `mobile-results.json`.
HTTP kaydı HEAD ile birlikte çalışma alanı değişiklik işaretini ve çalıştırılan
güncel dosya hash'lerini taşır; kirli çalışma alanı yalnız HEAD'in kanıtı sayılmaz.
Tam Python/istemci/derleme sayıları ve CI sonucu son doğrulama kaydındadır;
önceki checkpoint'in PASS sayısı yeni kaynak kanıtı sayılmaz.

## 2.4.0 yayınına kalan ayrı kabuller

Gerçek PostgreSQL/Redis ve macOS WebKit CI sonuçları; imzalı 2.4.0 AAB ile
Play'den fiziksel cihaz güncellemesi, hesap/ödeme/ödül ve hoparlör/kulaklık
kabulü RELEASE-01'de izlenir. Yeni modülün eski istemcide render/match
güvenliği 2.5.0 kart açılışı öncesinde ayrıca kanıtlanır. COMPAT-01 sezona
başlangıç tarihi veya canlı ortam değişikliği yapmaz.
