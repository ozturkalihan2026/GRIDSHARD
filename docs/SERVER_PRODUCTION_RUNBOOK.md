# GRIDSHARD — temiz sunucu kurulum ve kurtarma rehberi

Durum: 1 Ekim 2026. Bu bir **operatör rehberidir, gerçekleşmiş uzak dağıtım raporu değildir**. Docker Desktop Linux motorunda PostgreSQL 17/gerçek Redis, ana/bakım image build, boş kurulum/yeniden başlatma ve image yedeğinin ayrı boş DB/runtime'a geri yüklemesi geçti. Caddy/Compose yapılandırması doğrulandı. Uzak CI, seçilecek Linux sunucuda gerçek alan adı/TLS/WSS ve native/sağlayıcı kapıları açık. Eski oyuncu, takım, kimlik, makbuz ve analitik verileri **aktarılmayacak**. Eski dosya/birimleri silmeyin veya yeni kuruluma bağlamayın.

## Yayın kapıları

Google/Apple native/web hesabının dış dosya ve isteğe bağlı Compose katmanları: [NATIVE_OAUTH.md](NATIVE_OAUTH.md). Sağlayıcı hazırken `docker-compose.oauth-google.yml` / `docker-compose.oauth-apple.yml` mevcut üretim+Cloudflare yapılandırmasına eklenir. Client secret/private key kaynak/image/APK'ya girmez; App Links public SHA-256 ayarları test/yayın için ayrıdır. Yerel kod eklemesi canlı provider kurulumu değildir.

- Tam sunucu/istemci testleri, build ve CI yeşil; tarihsel kırık testler sessizce atlanmış olmamalı.
- `migration` CI işi gerçek PostgreSQL 17 + Redis, Caddy doğrulaması, temiz image açılışı, profil/token korunarak yeniden başlatma ve bakım image'ıyla boş hedef geri yükleme provasını doğrulamalı. Bu kontroller yerelde geçti; uzak CI sonucu henüz alınmadı.
- Yeni native sürüm secure-storage, tam ekran, arka plan ses duruşu, HTTPS/WSS ve bağlantı geri gelmesini gerçek telefonda geçmeli. Tarayıcı emülasyonu bunun yerine geçmez.
- Google/Apple/OAuth, ödeme/iade, ödüllü reklam, e-posta ve push için operatörün gerçek sağlayıcı hesabı/yetkisi gerekir. Yapılandırılmayan sağlayıcı **hazır sayılmaz**; sahte ödül/doğrulama açılmamalı. Mevcut rehberler: `STORE_PURCHASES.md`, `PUSH_NOTIFICATIONS.md`, `MOBILE_RELEASE_RUNBOOK.md`.
- Bir yedek yeni, boş hedefe geri yüklenip doğrulanmış olmalı. SHA-256 bütünlük kontrolüdür, kaynak doğrulaması veya şifreleme değildir.

## 1. Linux sunucu ve dış dosyalar

Docker Engine + Compose v2 kurulu, güvenlik güncellemeleri uygulanmış bir Linux sunucu gerekir. Alan adının A/AAAA kayıtları bu sunucuya yönelmeli; yanlış IPv6 kaydı bırakılmamalı. Dışarıya yalnız SSH (tercihen yönetici IP'siyle sınırlı), TCP 80/443 ve isteğe bağlı UDP 443 açın. PostgreSQL 5432, Redis 6379 ve API 8000 internete yayınlanmaz.

Kaynağı doğrulanmış **tek sürüm** olarak `/opt/gridshard` gibi boş bir checkout'a koyun. `.env`, kimlikler, yedek, anahtar ve eski runtime dosyalarını kopyalamayın. Komutları bu checkout'tan çalıştırın. Aşağıdaki yollar örnektir; operatör kendi kesin hedeflerini seçmelidir.

```sh
sudo python3 tools/provision_server_secrets.py --directory /etc/gridshard-production-secrets
sudo install -d -o 10001 -g 10001 -m 700 /var/backups/gridshard-production
export GRIDSHARD_HOST=oyun.ornek.com
export GRIDSHARD_TLS_EMAIL=yonetici@ornek.com
export GRIDSHARD_SECRETS_DIR=/etc/gridshard-production-secrets
export GRIDSHARD_BACKUPS_DIR=/var/backups/gridshard-production
```

Örnek alan adı/e-postayı gerçek değerlerle değiştirin. Sır aracı yalnız Linux/root çalışır; hedef önceden varsa reddeder. Üç yeni rastgele sır üretir, konsola içerik basmaz. Dizin root/0700; PostgreSQL parola dosyası root/0600, API ve bakımın okuyacağı iki dosya UID/GID 10001/0600 olur. Compose bireysel dosyaları salt okunur bağlar. Parolaları komut satırına veya Git'e yazmayın. Bu araç OAuth/Play Console/Apple kimlik bilgisi üretmez.

## 2. İlk açılış

**Yalnız** standalone üretim dosyasını kullanın; geliştirme dosyasıyla `-f` birleştirmeyin. Aksi hâlde geliştirme portları/ortam değerleri birleşebilir.

```sh
docker compose -f docker-compose.production.yml config --quiet
docker compose -f docker-compose.production.yml build relay-web maintenance
docker compose -f docker-compose.production.yml up -d postgres redis relay-web caddy
docker compose -f docker-compose.production.yml ps
curl --fail --silent --show-error "https://${GRIDSHARD_HOST}/health"
```

Compose yeni `*-production-clean` birimleri kullanır. API ilk açılışta şemayı 014'e kadar uygular, boş veritabanını sahiplenir ve runtime'a aynı kurulum UUID'sini yazar. Dolu/sahipsiz DB veya yanlış runtime kimliği hata verir; bunu eski dosya kopyalayarak/işareti silerek geçmeyin. Sonraki açılış aynı birimler ve imza anahtarıyla sürer.

`health` yalnız 200 + kalıcılık/koordinasyon hazır durumunda kabul edilir. İlk telefon hesabı oluşturma, tekrar açılışta profil/bakiye korunması, iki istemci WSS, token süresi/iptali ve yeniden bağlanma ayrıca denenir. API erişim logları kapalıdır; WebSocket URL token'larını proxy/access loguna eklemeyin. Tek worker çalışır; **aktif RAM savaşları süreçler arasında taşınmaz**, ikinci worker açmak HA sağlamaz. Tamamlanmış/pending sonuçlar PostgreSQL defterinden tekrar işlenir.

TLS/CORS değişikliğinden sonra native paketin kalıcı uygulama kimliği, HTTPS API ve WSS adresini `MOBILE_RELEASE_RUNBOOK.md` ile güncelleyin. Debug cleartext/Wi-Fi paketi mağaza sürümü değildir. Test ödeme/reklam modlarını üretimde açmayın.

### Cloudflare proxy + Origin CA seçeneği

Origin IP'sini DNS yanıtında göstermemek isteyen kurulumlarda `docker-compose.production.yml` ardından **yalnız** `docker-compose.cloudflare.yml` kullanılır. Compose **2.24.4 veya üzeri** gerekir: `!override` origin port listesini yalnız TCP 443 ile değiştirir; 80/UDP 443 eklenmez. Veritabanı/API yine yayınlanmaz. Bu alternatif, varsayılan public-ACME dosyasını değiştirmez.

1. Özel anahtar Linux sunucuda yeni root/0700 dizinine üretilir; key root/0600 kalır. CSR yalnız seçilen oyun hostname'ini kapsar. Özel anahtarı indirmeyin, sohbete/Git'e koymayın. Cloudflare **SSL/TLS → Origin Server → Create Certificate → Use my private key and CSR** alanına yalnız public CSR yapıştırılır. İmzalı **public** sertifika PEM biçiminde alınır; sunucuda yeni `origin_cert.pem` dosyasına, kaynak ağacı dışında kurulur. Anahtar eşleşmesi, SAN, issuer/zincir ve geçerlilik kontrol edilmeden Caddy açılmaz. Bu dosyaların dökümü loglanmaz.
2. `GRIDSHARD_ORIGIN_TLS_DIR` dış dizini göstermeli; `origin_cert.pem` ve `origin_key.pem` salt okunur Compose secrets olarak bağlanır. Yapılandırma `tls` dosyalarını kullanır, otomatik HTTP yönlendirmesi/ACME yoktur. Cloudflare tarafında HTTPS zorlaması yapılır.
3. Güvenlik grubunda iki yönetici SSH `/32` kaynağı korunur; TCP 443 **yalnız [Cloudflare'ın güncel origin IP aralıklarına](https://www.cloudflare.com/ips/)** açılır. 80/UDP 443/5432/6379/8000 veya `0.0.0.0/0` gerekmez. Docker yayınları UFW'yi atlayabilir; host UFW tek başına origin sınırı kabul edilmez. IPv6 kullanılmıyorsa AAAA eklemeyin. Cloudflare IP sınırı zone'a özel istemci kimlik doğrulaması değildir; Authenticated Origin Pulls ayrı sertleştirme kapısıdır.
4. Yalnız oyun alt alan adına sunucunun A kaydı eklenir, **Proxied / turuncu bulut** açık kalır. Root/`www` Pages destek sitesi ve e-posta kayıtları korunur. Sertifika kurulduktan sonra SSL modu **Full (strict)** olmalı; Flexible kullanılmaz. Origin CA doğrudan tarayıcı/telefon için public-CA değildir; proxy kapatılmaz. TLS sona erme zamanı operatör tarafından izlenir, otomatik ACME yenilemesi yoktur.

```sh
export GRIDSHARD_ORIGIN_TLS_DIR=/etc/gridshard-origin-tls
docker compose -f docker-compose.production.yml -f docker-compose.cloudflare.yml config --quiet
docker compose -f docker-compose.production.yml -f docker-compose.cloudflare.yml up -d postgres redis relay-web caddy
```

Yukarıdaki dosya çifti bu kurulumun **stop/run/backup/restore/ps** komutlarında da korunur. Gerçek DNS/proxy/Full-strict, edge HTTPS `/health`, WSS ve iki cihaz testi geçmeden yayın tamamlandı sayılmaz. Kaynaklar: [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/), [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/), [Compose override semantiği](https://docs.docker.com/reference/compose-file/merge/).

## 3. İzleme ve bakım

Bağımsız dış kontrolde HTTPS `/health` yanıtını, Compose container sağlık durumunu, disk/birim kullanımını, yedek yaşını ve yeniden başlatma sayılarını izleyin. Sağlıksız durumda oyuncu ekranı yeniden deneme sunar; işletim sistemi/sağlayıcı alarmı ayrıca kurulmalıdır. `docker compose logs --tail 100 relay-web caddy` içeriğini paylaşmadan önce kişisel veri/sır kontrolü yapın. Log rotasyonu Compose'da sınırlıdır; PostgreSQL/Redis disk doluluğu ayrıca izlenmelidir.

Redis yalnız geçici presence/routing/rate-limit/worker lease içindir; PostgreSQL ödül ve profil kaynağıdır. Redis veya worker sahipliği kaybedilirse API/WS fail-closed durur. Tek süreç yeniden başlatılmadan eski lease'i elle değiştirmeyin. Planlı bakımda oyuncuları önceden bilgilendirin ve aktif maçları bitirin; API duruşu RAM maçlarını keser.

3 Ekim r7 onarımı: worker lease yenilemesi temizlik/ödül kurtarma işlerinden bağımsız bir task'tadır; PostgreSQL advisory sahiplik kontrolü süre sınırlıdır. Bakım geçişindeki hata kaydedilip tekrar denenir. TTL ile kaldırılmış oturumun gecikmiş disconnect kaydı güvenle silinir; bitmiş maçın socket kapanışı yeni grace kaydı oluşturmaz. Yavaş/kopuk bir socket diğer oyuncunun sonucunu engellemez; yayın/kapama 2 saniye, async sonuç projeksiyonu 5 saniye ile sınırlıdır. Bu sınırlar ödülü istemciye devretmez: kalıcı ledger ve idempotent kurtarma korunur. Gerçek sahiplik kaybında API yine fail-closed durur; korumayı kaldırarak iyileştirmeyin.

Yeni image'ı üretim birimlerine bağlamadan ayrı PostgreSQL/Redis fixture'larıyla `tools/production_container_smoke.py --soak-seconds 330` çalıştırın; bu test profil/tek-ad-değişim hakkı, worker lease, restart ve boş hedefe backup/restore kapılarını denetler. Canlı geçişte önce aktif maç/socket olmadığını doğrulayın; aynı kurulum, sırlar ve Compose katmanlarıyla API/Caddy'yi durdurup yeni tarihli özel yedek alın. Kurulum kimliği, profil/kimlik/ledger sayıları ve dump SHA-256 eşleşmeden image'ı değiştirmeyin. Sonrasında iç/HTTPS health ve en az 330 saniye worker lease kontrolü yapın. Başarısız rollout'ta eski image/config'e dönmek veritabanını eski dump'a geri yüklemek anlamına gelmez; canlı profilleri silmeyin.

## 4. Bakımda yedek

API/Caddy durmuş olmalıdır. Araç PostgreSQL worker advisory lock'unu alamazsa yedeği reddeder. Şema/kayıt sayısı/kurulum kimliği ve dump SHA-256 bir başarı manifestinde tutulur. Yeni alt dizin kullanır, üzerine yazmaz.

```sh
docker compose -f docker-compose.production.yml stop caddy relay-web
docker compose -f docker-compose.production.yml --profile maintenance run --rm maintenance backup --directory /backups/2026-10-01-before-release
docker compose -f docker-compose.production.yml up -d relay-web caddy
```

Tarihli örneği her yedekte yeni bir ada değiştirin. Başarı yalnız çıkış kodu 0 ve `backup.json` ile kabul edilir. Başarısız/kısmi yedeği kullanmayın. Bakım image'ı PostgreSQL 17 client araçlarını içerir; DB'yi hosta port açmadan backend ağından kullanır. Yedek kişisel veri içerir: ayrı sunucuya şifrelenmiş kopya, erişim sınırı, saklama/silme politikası ve periyodik geri yükleme provası gerekir. Bu araç sürekli WAL/PITR veya sıfır veri kaybı taahhüdü sağlamaz. İmza anahtarını ve gerçek sağlayıcı sırlarını dump'tan ayrı şifreli kasada saklayın.

## 5. Boş hedefe geri yükleme ve sürüm geri dönüşü

Mevcut kurulumu silmeyin; hedefi ayrı Compose proje adıyla oluşturun. Aynı uygulama commit'i/migration dosyaları ve yedek döneminin imza anahtarı gerekir. `GRIDSHARD_BACKUPS_DIR` güvenilir yedeğin üst dizinine işaret eder. Aşağıdaki yeni proje adı yalnız örnektir ve daha önce kullanılmamış olmalıdır.

```sh
docker compose -p gridshard-restore-20261001 -f docker-compose.production.yml up -d postgres
docker compose -p gridshard-restore-20261001 -f docker-compose.production.yml --profile maintenance run --rm maintenance restore --directory /backups/2026-10-01-before-release --runtime-dir /var/lib/gridshard --confirm-installation-id YEDEKTEKI-UUID
```

`YEDEKTEKI-UUID` değerini `backup.json` içindeki kurulum kimliğiyle açıkça değiştirin. Araç boş olmayan veritabanına/runtime'a yazmayı reddeder; dump tek transaction'da yüklenir, şema checksum ve kayıt sayısı doğrulanır. Başarılı olmadan API açılmaz. Yeni projede Redis boş başlar. Eski Caddy/API durduktan sonra yeni projenin `redis relay-web caddy` servisleri açılabilir; aynı 80/443 portunda iki Caddy çalıştırmayın. Health, profil, cihaz token'ı, pending maç sonuçları ve ödül tekliği yeniden doğrulanır.

Şema güncellemesinde önce yedek, sonra tek sürüm rollout yapın. Eski binary yeni şemayla uyumsuzsa `down.sql`, `down -v`, volume silme veya Git reset ile çözmeyin; açık veri kaybı kararı gerektiren ayrı operasyon olarak **yeni boş hedefte** yedek+sürüm geri dönüşü planlayın. Eski birimler kurtarma/denetim için korunur.

## Operatörden hâlâ gerekli olanlar

Alan adı ve DNS, Linux sunucu/SSH erişimi, gerçek sağlayıcı hesapları/anahtarları, mobil kalıcı application ID ve imzalama anahtarı. Yerel Docker motoru ve kapsayıcı doğrulaması tamamlandı; hedef Linux sunucusunda Docker/Compose kurulumu ayrıca gerekir. Bu bilgiler edinilip gerçek kapılar geçilmeden hosting geçişi tamamlanmış değildir.
