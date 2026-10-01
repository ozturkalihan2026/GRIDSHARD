# GRIDSHARD — temiz sunucu kurulum ve kurtarma rehberi

Durum: 1 Ekim 2026. Bu bir **operatör rehberidir, gerçekleşmiş dağıtım raporu değildir**. Yerel PostgreSQL 16 testleri geçti; Docker/PostgreSQL 17/gerçek Redis/TLS kapıları CI veya seçilecek Linux sunucuda çalıştırılmalıdır. Eski oyuncu, takım, kimlik, makbuz ve analitik verileri **aktarılmayacak**. Eski dosya/birimleri silmeyin veya yeni kuruluma bağlamayın.

## Yayın kapıları

- Tam sunucu/istemci testleri, build ve CI yeşil; tarihsel kırık testler sessizce atlanmış olmamalı.
- `migration` CI işi gerçek PostgreSQL 17 + Redis, Caddy doğrulaması, temiz image açılışı ve profil/token korunarak yeniden başlatmayı doğrulamalı.
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

## 3. İzleme ve bakım

Bağımsız dış kontrolde HTTPS `/health` yanıtını, Compose container sağlık durumunu, disk/birim kullanımını, yedek yaşını ve yeniden başlatma sayılarını izleyin. Sağlıksız durumda oyuncu ekranı yeniden deneme sunar; işletim sistemi/sağlayıcı alarmı ayrıca kurulmalıdır. `docker compose logs --tail 100 relay-web caddy` içeriğini paylaşmadan önce kişisel veri/sır kontrolü yapın. Log rotasyonu Compose'da sınırlıdır; PostgreSQL/Redis disk doluluğu ayrıca izlenmelidir.

Redis yalnız geçici presence/routing/rate-limit/worker lease içindir; PostgreSQL ödül ve profil kaynağıdır. Redis veya worker sahipliği kaybedilirse API/WS fail-closed durur. Tek süreç yeniden başlatılmadan eski lease'i elle değiştirmeyin. Planlı bakımda oyuncuları önceden bilgilendirin ve aktif maçları bitirin; API duruşu RAM maçlarını keser.

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

Alan adı ve DNS, Linux sunucu/SSH erişimi, Docker motoru, gerçek sağlayıcı hesapları/anahtarları, mobil kalıcı application ID ve imzalama anahtarı. Bunlar edinilip gerçek kapılar geçilmeden hosting geçişi tamamlanmış değildir.
