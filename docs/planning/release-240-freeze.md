# 2.4.0 — sabit kaynak ve yayın hazırlığı

11 Kasım 2026 kullanıcı kararı: yeni içerik çalışmaları sürerken 2.4.0 AAB ve sunucu kaynağı sabit tutulur. Bu hazırlık AAB üretimi, Play yüklemesi, canlı geçiş veya sezon açılışı değildir.

Önceki `v2.4.0-rc.1` etiketi korunur. Güncel aday `rc.2`, yalnız sürüm notları tarayıcı testini düzeltir; oyun kodu aynı kalır.

## Kaynak ayrımı

- İncelenen kaynak commit'i `v2.4.0-rc.2` etiketi ve `codex/release-2.4.0` dalıyla korunur.
- `config/release-candidates/2.4.0.json` tam 40 karakterli commit'i tutar. Komutlar güncel dalı, `main`in son halini veya taşınabilen bir dal adını derlemez.
- Kaynak ayrı `qa_reports/release-candidates/2.4.0-rc2/source` worktree'sindedir. Aynı bilgisayarda 2.5 çalışmaları ayrı `codex/develop-2.5.0` dalında devam eder.
- Gelecek sezon brief'leri plan dosyasıdır; yeni modül/kozmetik/müzik çalışma verisi henüz eklenmedi. Sonraki içerik commit'leri sabit adayın parçası olmaz.
- 2.4 hata düzeltmesi gerekirse yalnız incelenen düzeltme release dalına alınır; yeniden test edilir, yeni `rc` etiketi ve yeni manifest/path oluşturulur. Eski etiket taşınmaz; eski worktree otomatik silinmez/resetlenmez. Yeni özelliğin tamamı topluca release dalına birleştirilmez.
- `v2.4.0` final etiketi gerçek yayın kararındadır; `rc` etiketi yayımlanmış sürüm anlamına gelmez.

## Komutlar (depo kökünde)

Bu komutlar manifesti taşıyan `codex/develop-2.5.0` çalışma dalından çalıştırılır. Başlatıcı bu dalda bulunur; oyun/Android/sunucu kaynakları ise daima manifestteki etiketten gelir. Yeni bilgisayarda önce bu dal alınır. Windows native üreticisinin yalnız CRLF/LF yazım farkı gerçek kod değişikliği sayılmaz; karşılaştırma Git'in normalize edilmiş içeriğiyle yapılır. Migration/binary `-text` kuralları korunur.

```powershell
# Salt okunur: hangi commit ve komutlar kullanılacak?
python tools/release_candidate.py 2.4.0 plan

# Kaynak, sürüm kimlikleri ve temiz worktree kontrolü
python tools/release_candidate.py 2.4.0 check

# Başka bilgisayarda: etiketi/dalı alın, bağımsız kaynak ve bağımlılıkları hazırlayın
git fetch origin
git switch codex/develop-2.5.0
git fetch origin tag v2.4.0-rc.2
python tools/release_candidate.py 2.4.0 prepare

# Yalnız yayın zamanı: aynı sabit kaynaktan imzalı AAB/APK üretimi
python tools/release_candidate.py 2.4.0 aab

# Yalnız gerektiğinde: aynı sabit kaynaktan sunucu imajı veya kaynak paketi
python tools/release_candidate.py 2.4.0 server-image
python tools/release_candidate.py 2.4.0 server-source
```

`prepare` AAB üretmez. Kaynak ayrı worktree'ye alınır; lockfile ile bağımlılıklar kurulur. Android native hazırlığı ayrıca `build-android-production.ps1 -PrepareOnly` ile denenir; bu da imzalı paket üretmez. Varsayılan JAVA_HOME eski JDK17 olsa da kurulu Android Studio JDK21 seçilir; açıkça verilen geçersiz -JavaHome reddedilir. JDK/SDK ve mevcut DPAPI/keystore erişimi paket imzalamadan doğrulandı. AAB komutu mevcut yükleme anahtarını ana çalışma alanının `secrets/android-release` klasöründen kullanır; anahtar/DPAPI parolası adaya, Git'e veya sunucu imajına kopyalanmaz. Diğer bilgisayarda aynı mevcut anahtar ve o Windows hesabının erişebildiği kayıt gerekir.

Aday klasöründe kirli takip edilen dosya, beklenmeyen kaynak commit'i veya sürüm uyuşmazlığı varsa işlem durur. Otomatik olarak son dalı kullanma, klasörü silme veya kaynağı değiştirme yoktur. Bağımlılıklar farklı dala ait `node_modules` üzerinden paylaşılmaz.

İmaj etiketi `gridshard:2.4.0-<commit-ilk12>` ve OCI revision etiketi tam commit'i içerir. Kaynak arşivi de aynı worktree'den çıkar. İmaj/kaynak/AAB komutları dağıtım ve yükleme yapmaz.

## Canlı geçişte kalan işler

- Güncel adayın tam CI'si, gerçek Android kabulü ve Play App access metni tamamlanır. İmzalama ve canlı altyapı erişimi yayın anında yeniden doğrulanır.
- Mevcut canlı Compose/imaj/secret/volume bağları keşfedilir; güncel yedek alınır ve izole restore provası yapılır. Gerçek oyuncu sayıları o gün ölçülür.
- Sabit adaydan üretilen imajın digest'i incelenmiş operasyon kaydına yazılır; yalnız uygulama servisine uygulanır. DB/kimlik/satın alma/arkadaşlık kayıtları korunur.
- Sağlık, eski istemci uyumu, mevcut hesap, mesaj ve ödül kontrolleri yapılır. Geri dönüş önceki kod/imajadır; yeni oyuncu verisine eski yedek yazılmaz.
- Eski `tools/production_cutover.py` beta sıfırlama aracıdır; bu 2.4 geçişinin aracı değildir.
- S1 profili şu anda taslak, Android yayın kabulü kapalıdır. Sezon/takım başlangıcı AAB üretimiyle açılmaz. Kabul sonucunda kaynak güncellemesi gerekirse yeni `rc` sabitlenir.

Yayın ve sezon takvimi [mevcut takvimde](release_calendar_v1.json) kalır. Bu dosya yazılım kaynağını ayırır; tamamlanmamış yayın kabulünü geçmiş gibi işaretlemez.
