# GRIDSHARD 30 günlük yedek saklama görevi

Yalnız `/var/backups/gridshard-production/` için Linux operatorüdür. CLI farklı
kök, gün sayısı, container veya keyfi shell komutu kabul etmez. Varsayılan
salt-okunur/dry-run; `--apply` ve tam kalıcı silme confirmation birlikte gerekir.
Süre/günlük kurulum kullanıcıca 5 Ekim 2026'da bu kapsamda açıkça onaylandı.
Kaynak hazır olması, sunucuda kurulmuş/etkin olduğuna kanıt değildir.

5Ekim2026 12:54TR gerçek kurulum doğrulandı: Linux sentetik22/22, üretim dry-run
9valid/0expired, ilk etkin iş success/exit0 ve0deleted, timer enabled/active/waiting;
sonraki6Ekim04:00TR. Oyun servisleri/bakup kökü izinleri değişmedi. Kişisel-verisiz
ignored receipt `artifacts/public-site-20261005-privacy/backup-retention-install-result.json`.
Üretimde henüz30günü dolan yedek yok; gerçek expired deletion gözlendi denmez.
Bu iş **yeni düzenli yedek veya otomatik hata bildirimi kurmaz**.

## Güvenlik kapıları

- Root ve ataları descriptor üzerinden açılır; symlink/writable ancestor ret.
  Üst klasörler root-owned; son0700 yedek kökü mevcut güvenilir backup writer
  UID10001 veya root olabilir. Mevcut kökün sahipliği/erişimi değiştirilmez.
- Her dizin yalnız `backup.json`/`database.dump` içerir; bilinen UID, izin,
  tek hardlink, aynı dosya sistemi, format1, timezone'lu oluşturma tarihi,
  aynı installation SHA256, archive SHA256/PGDMP ve `pg_restore --list` gerekir.
- En fazla100 yedek, manifest256KiB/archive10GiB, upstream30sn limitleri vardır.
  Bilinmeyen/yarım yedek veya limitte tüm silme durur; çıktılar kişisel veri içermez.
- Canlı kurulum kimliği salt-okunur transaction ile ayrıca eşleşir. Veritabanı
  restore/migration, servis duruşu, dump oluşturma veya oyun release yoktur.
- 30gün dolmayan sağlam yedek bulunmalıdır; hepsi yaşlandıysa **silme durur ve
  görev başarısız olur**. Bu araç yeni yedek üretmez. Eski son yedeği saklamak
  30gün hedefini aşabilir; güvenli güncel backup/bakım kararı ayrı gereklidir.
- Silmeden önce target ve kalan yedek yeniden doğrulanır. Atomik rename ile
  root0700 `.retention-staging` içine alınır; inode/metadata tekrar denetlenir.
  Yalnız iki onaylı dosya unlink/rmdir ile silinir, recursive delete/follow yoktur.
  Kesinti/yarış/partial purge staging'de kalır ve sonraki tüm işler operatör
  incelemesine kadar durur. Yarım işlem otomatik devam/sessiz silme sayılmaz.
- Ayrı runtime flock eşzamanlı iki işi engeller. Backup yazma aracı bu lock'ı
  almadığından işlem sırasında yeni/yarım backup görürse yeniden deneme gerekir.
  UID10001 backup writer'ı güvenilir operator işidir; sistem ihlali/malicious
  açık descriptor sahibi karşısında SHA bir imza veya veri-kurtarma garantisi değildir.

## Kurulum ve kanıt

1. Salt-okunur live audit ve pinned SSH host fingerprint ile güncel sunucuyu
   doğrula. Mevcut dosya/unit/config varsa kontrol et; sessizce overwrite etme.
2. `test_retention.py` Windows'ta politika testlerini, Linux root altında
   izole sentetik dosya testlerini de çalıştırır; gerçek yedekler test hedefi değildir.
3. Dosyaları root-owned `/usr/local/lib/gridshard-backup-retention/` altında
   Python0500, unit0644 olarak kur. `.conf` root0600 yalnız doğrulanmış
   `GRIDSHARD_BACKUP_INSTALLATION_SHA256` ve onaylı
   `GRIDSHARD_BACKUP_RETENTION_CONFIRMATION` içerir; DB/SSH sırları yazılmaz.
4. Önce üretim sabit kökünde dry-run: valid/expired sayısını incele. systemd
   unit/calendar doğrulaması → yalnız bu service'i çalıştır → success çıktısı
   → bu timer'ı enable et. Oyun/Caddy/PG/Redis yeniden başlatılmaz.
5. Timer Türkiye saatiyle04:00, yaklaşık1dk pencerede; Persistent kaçırılan
   çalışmayı yakalar. 30gün dolduktan **sonraki günlük iş** siler; tam saniye
   garantisi yok. Journal/systemctl failure ve backlog yayıncıca izlenmelidir.
6. Gerçek unit hash/iş çıktısı/next trigger ve eski-yedek0 sonucuyla deployment
   receipt/checkpoint güncellenir. Timer kurulumu Gmail desteğini doğrulamaz;
   site backupVerified tek başına final gizlilik onayı değildir.

Kaynaklar: [systemd timer v255](https://github.com/systemd/systemd/blob/v255/man/systemd.timer.xml),
[takvim ve timezone](https://github.com/systemd/systemd/blob/v255/man/systemd.time.xml),
[PostgreSQL17 arşiv listesi](https://www.postgresql.org/docs/17/app-pgrestore.html).
